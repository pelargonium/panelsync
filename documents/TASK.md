# Task: Panel Map Preview + Inline Panel Sizing

**Status:** needs Claude review
**Plan reference:** `.claude/plans/precious-churning-puppy.md`

---

## Objective

Add two connected features to the script editor:

1. **Inline panel sizing** — writers type a size keyword on a panel element (e.g., "sp" → SPLASH), confirmed with Enter. The size is stored on the element and displayed as a tag.
2. **Panel map preview** — a right-side overlay that renders proportional ASCII page grids showing how panels fill each page. Updates live as the script is edited.

---

## Files to Change

| File | Action |
|------|--------|
| `apps/mobile/components/ScriptView.tsx` | Modify — extend ScriptElement, add size input UX |
| `apps/mobile/components/PanelMapPreview.tsx` | **Create** — ASCII proportional page grid renderer |
| `apps/mobile/components/Editor.tsx` | Modify — add `onScriptElements` callback prop |
| `apps/mobile/app/universe/[id].tsx` | Modify — add preview toggle, overlay, shortcut, top-bar button |

## Files NOT to Touch

- `apps/api/` — no backend changes
- `apps/mobile/context/UniverseContext.tsx` — no context changes needed
- `apps/mobile/components/TimelineView.tsx`
- `apps/mobile/components/Binder.tsx`
- Drizzle schema — no migration
- `documents/CONCEPT.md` — Claude updates this after review

---

## Detailed Spec

### 1. ScriptView.tsx — Panel Sizing

#### Data model

Add to the existing exports:

```typescript
export type PanelSize = 'splash' | 'half' | 'wide' | 'small';
```

Extend `ScriptElement`:

```typescript
export interface ScriptElement {
  id: string;
  type: ScriptElementType;
  text: string;
  size?: PanelSize;  // only meaningful when type === 'panel'
}
```

This is backward compatible. Existing saved scripts have no `size` field — `undefined` means "standard" (equal distribution). No migration needed. `JSON.parse` of old data just produces objects without the field.

#### Size keyword matching

```typescript
const SIZE_KEYWORDS: { prefix: string; size: PanelSize }[] = [
  { prefix: 'splash', size: 'splash' },
  { prefix: 'half', size: 'half' },
  { prefix: 'wide', size: 'wide' },
  { prefix: 'small', size: 'small' },
];

function matchSizeKeyword(input: string): PanelSize | null {
  const lower = input.trim().toLowerCase();
  if (lower.length < 1) return null;
  // Single character: only allow unambiguous matches (h, w)
  // 's' is ambiguous (splash/small), require 2+ chars
  if (lower === 's') return null;
  const matches = SIZE_KEYWORDS.filter(k => k.prefix.startsWith(lower));
  return matches.length === 1 ? matches[0].size : null;
}
```

#### Enter handler modification

In the existing Enter handler (`handleKeyRef.current`), modify the `panel` case for non-empty text. **Before** the existing `addElement(focusedIndex, 'scene')` line, check for a size keyword match:

```typescript
// Existing code path: currentText !== '' && currentElement.type === 'panel'
} else if (currentElement.type === 'panel') {
  // NEW: check if text matches a size keyword
  const sizeMatch = matchSizeKeyword(currentText);
  if (sizeMatch) {
    updateElement(focusedIndex, { size: sizeMatch, text: '' });
    addElement(focusedIndex, 'scene');
  } else {
    addElement(focusedIndex, 'scene');
  }
```

Also handle the empty-text Enter path for panels with a size already set. Currently, empty panel + Enter → replaces with page. If a panel has a `size` set and text is empty, Enter should still advance to scene (the size is the meaningful content):

```typescript
// In the empty-text Enter branch:
} else if (currentElement.type === 'panel') {
  if (currentElement.size) {
    // Panel has a size — treat as non-empty, advance to scene
    addElement(focusedIndex, 'scene');
  } else {
    replaceElement(focusedIndex, 'page');  // existing behavior
  }
```

#### Backspace handler modification

Currently: Backspace on empty element → delete element. New: if the panel has a `size` set and text is empty, clear the size first instead of deleting:

```typescript
// Backspace on empty element
if (info.key === 'Backspace' && currentElement.text.trim() === '' && elements.length > 1) {
  info.prevent();
  // NEW: if panel has size, clear size first
  if (currentElement.type === 'panel' && currentElement.size) {
    updateElement(focusedIndex, { size: undefined });
    return;
  }
  deleteElement(focusedIndex);
  return;
}
```

#### Render changes — size tag and suggestion

On panel rows, between the prefix `<Text>` ("Panel N") and the `<TextInput>`, add:

1. **Size tag** when `el.size` is set:
```tsx
{el.type === 'panel' && el.size && (
  <Text style={{ fontFamily: mono, fontSize: 10, color: colors.muted, marginRight: 6 }}>
    [{el.size.toUpperCase()}]
  </Text>
)}
```

2. **Trailing suggestion** after the `<TextInput>`, when the current text is a prefix of a size keyword:
```tsx
{el.type === 'panel' && !el.size && focusedIndex === i && (() => {
  const match = matchSizeKeyword(el.text);
  return match ? (
    <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, opacity: 0.5 }}>
      {match.toUpperCase()}
    </Text>
  ) : null;
})()}
```

Note: only show the suggestion on the focused panel row that doesn't already have a size. The suggestion is just a label — no interaction, purely visual hint.

#### Overflow indicator

Compute page overflow alongside the existing `computeNumbering` function. Add a new function:

```typescript
const SIZE_BUDGET: Record<PanelSize, number> = {
  splash: 1.0, half: 0.5, wide: 0.33, small: 0.15,
};

function computePageOverflows(elements: ScriptElement[]): Set<number> {
  // Returns a set of page numbers (1-based) that overflow
  const overflows = new Set<number>();
  let pageNum = 0;
  let panels: ScriptElement[] = [];

  function checkPage() {
    if (panels.length === 0) return;
    const explicit = panels.filter(p => p.size);
    const implicit = panels.filter(p => !p.size);
    const explicitTotal = explicit.reduce((sum, p) => sum + SIZE_BUDGET[p.size!], 0);
    const implicitEach = implicit.length > 0
      ? (explicit.length === 0 ? 1.0 / panels.length : Math.max(0, (1.0 - explicitTotal) / implicit.length))
      : 0;
    const total = explicitTotal + implicit.length * implicitEach;
    if (total > 1.05) overflows.add(pageNum);
  }

  for (const el of elements) {
    if (el.type === 'page') {
      checkPage();
      pageNum++;
      panels = [];
    } else if (el.type === 'panel') {
      panels.push(el);
    }
  }
  checkPage();
  return overflows;
}
```

Call this with `useMemo` alongside `computeNumbering`. On panel rows belonging to overflowing pages, show a `[!]` indicator:

```tsx
{el.type === 'panel' && overflows.has(numbering.get(i)?.pageNum ?? 0) && (
  <Text style={{ fontFamily: mono, fontSize: 10, color: colors.error, marginLeft: 4 }}>[!]</Text>
)}
```

### 2. PanelMapPreview.tsx — New Component

Create `apps/mobile/components/PanelMapPreview.tsx`.

#### Props

```typescript
import { type ScriptElement, type PanelSize } from './ScriptView';

interface PanelMapPreviewProps {
  elements: ScriptElement[];
}
```

#### Page extraction

Walk the elements array. Each `type === 'page'` starts a new page. Subsequent `type === 'panel'` elements belong to that page. Non-page/panel elements are ignored.

```typescript
interface PageData {
  pageNum: number;
  panels: { panelNum: number; size?: PanelSize; text: string }[];
}

function extractPages(elements: ScriptElement[]): PageData[] { ... }
```

#### Budget computation and row height allocation

Constants:
```typescript
const PAGE_ROWS = 24;
const INNER_W = 28;
const MIN_ROWS = 2;

const SIZE_BUDGET: Record<PanelSize, number> = {
  splash: 1.0, half: 0.5, wide: 0.33, small: 0.15,
};
```

For each page:
1. Panels with explicit sizes claim their budget fraction
2. Panels without sizes split the remaining space equally
3. If all panels have no size, each gets `1.0 / panelCount`
4. Convert fractions to row counts: `Math.max(MIN_ROWS, Math.round(fraction * PAGE_ROWS))`
5. Adjust rounding error by adding/subtracting from the tallest panel
6. Flag overflow if total budget > 1.05 (5% tolerance for rounding)

#### ASCII grid rendering

Build a string for each page using box-drawing characters. The grid must be **proportional** — panel heights reflect their budget fraction. This is the core of the feature.

```
Page 1
┌────────────────────────────┐
│                            │
│        Panel 1             │  (height proportional to budget)
│        [HALF]              │
│                            │
│                            │
│                            │
├────────────────────────────┤
│        Panel 2             │
│                            │
├────────────────────────────┤
│        Panel 3             │
│                            │
└────────────────────────────┘
```

Rendering rules:
- First panel top: `┌` + `─` * INNER_W + `┐`
- Panel separator: `├` + `─` * INNER_W + `┤`
- Last panel bottom: `└` + `─` * INNER_W + `┘`
- Interior rows: `│` + ` ` * INNER_W + `│`
- Label row (centered in the panel's height): `│` + centered "Panel N [SIZE]" + `│`
- For single-panel splash pages, the label is centered in the full 24-row box

#### Component rendering

```tsx
export default function PanelMapPreview({ elements }: PanelMapPreviewProps) {
  const { colors, mono } = useTheme();
  const pages = useMemo(() => extractPages(elements), [elements]);

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
      {pages.map((page, i) => {
        const { lines, overflow } = renderPageGrid(page);
        return (
          <View key={i} style={{ marginBottom: 16 }}>
            <Text style={{
              fontFamily: mono,
              fontSize: 10,
              color: overflow ? colors.error : colors.muted,
              marginBottom: 4,
            }}>
              Page {page.pageNum}{overflow ? '  OVER' : ''}
            </Text>
            <Text style={{
              fontFamily: mono,
              fontSize: 10,
              lineHeight: 12,
              color: overflow ? colors.error : colors.text,
            }}>
              {lines}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
```

Use `useTheme()` from `../context/ThemeContext`. NativeWind `className` where possible, inline styles for the monospace Text art.

### 3. Editor.tsx — Callback Prop

Add to `EditorProps`:

```typescript
interface EditorProps {
  entityId: string;
  isFocused: boolean;
  autoFocusName?: boolean;
  onAutoFocusDone?: () => void;
  onSaveStateChange?: (state: 'saved' | 'saving') => void;
  onScriptElements?: (elements: ScriptElement[]) => void;  // NEW
}
```

Add a ref to keep the callback current (same pattern as `onSaveStateChangeRef`):

```typescript
const onScriptElementsRef = useRef(onScriptElements);
onScriptElementsRef.current = onScriptElements;
```

Add a useEffect that fires the callback when scriptElements changes:

```typescript
useEffect(() => {
  if (entityType === 'script') {
    onScriptElementsRef.current?.(scriptElements);
  } else {
    onScriptElementsRef.current?.([]);
  }
}, [entityType, scriptElements]);
```

### 4. [id].tsx — Preview Toggle and Integration

#### State

```typescript
const [panelMapOpen, setPanelMapOpen] = useState(false);
const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
```

Import `PanelMapPreview` from `../../components/PanelMapPreview` and `ScriptElement` from `../../components/ScriptView`.

#### PrimaryContent changes

Add `onScriptElements` prop to `PrimaryContent` and forward to `Editor`:

```typescript
function PrimaryContent({
  justCreatedId,
  onAutoFocusDone,
  onSaveStateChange,
  isFocused,
  onScriptElements,  // NEW
}: {
  ...existing props...
  onScriptElements?: (elements: ScriptElement[]) => void;  // NEW
}) {
  ...
  return (
    <Editor
      entityId={activeEntityId}
      ...existing props...
      onScriptElements={onScriptElements}  // NEW
    />
  );
}
```

Pass from `UniverseWorkspace`:

```tsx
<PrimaryContent
  justCreatedId={justCreatedId}
  onAutoFocusDone={() => setJustCreatedId(null)}
  onSaveStateChange={setEditorSaveState}
  isFocused={focusedPanel === 'editor-left'}
  onScriptElements={setScriptElements}
/>
```

#### Keyboard shortcut

In `appKeyRef.current`, add before the existing Escape handler:

```typescript
// Cmd+Shift+P — toggle panel map
if (info.meta && info.shift && info.key === 'p') {
  info.prevent();
  setPanelMapOpen(v => !v);
  setShortcutsOpen(false);  // mutually exclusive
  return;
}
```

Modify the existing `Cmd+/` handler to close panel map:

```typescript
if (info.key === '/' && info.meta) {
  info.prevent();
  setShortcutsOpen(v => !v);
  setPanelMapOpen(false);  // mutually exclusive
  return;
}
```

Add Escape handling for panel map (alongside existing shortcuts Escape):

```typescript
if (info.key === 'Escape' && panelMapOpen) {
  info.prevent();
  setPanelMapOpen(false);
  return;
}
```

#### Overlay rendering

Add the panel map overlay **after** the existing shortcuts overlay (both absolute positioned, same z-index pattern). Same visual pattern as the shortcuts overlay:

```tsx
{panelMapOpen && scriptElements.length > 0 && (
  <View style={{
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.bg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    zIndex: 20,
  }}>
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      height: 36,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontFamily: mono, fontSize: 12, color: colors.text, flex: 1 }}>panel map</Text>
      <TouchableOpacity onPress={() => setPanelMapOpen(false)}>
        <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted }}>x</Text>
      </TouchableOpacity>
    </View>
    <PanelMapPreview elements={scriptElements} />
  </View>
)}
```

#### Top bar button

In the top bar area (near the `?` shortcuts button, around line 237-240 in [id].tsx), add a "map" toggle that only shows when scriptElements are present:

```tsx
{scriptElements.length > 0 && (
  <TouchableOpacity onPress={() => { setPanelMapOpen(v => !v); setShortcutsOpen(false); }}>
    <Text style={{ fontFamily: mono, fontSize: 11, color: panelMapOpen ? colors.text : colors.muted, marginRight: 12 }}>map</Text>
  </TouchableOpacity>
)}
```

#### Shortcut reference update

Add to the SCRIPT section:

```typescript
['type size on panel', 'set panel size (splash/half/wide/small)'],
```

Add to the APP section:

```typescript
['Cmd+Shift+P', 'toggle panel map'],
```

---

## Constraints

- NativeWind `className` for new component layout where possible
- Monospace font from `useTheme()` (`mono` and `colors`)
- No Skia, no canvas, no SVG — pure `<Text>` with box-drawing characters
- The preview must be a **graphic** proportional representation, not a text summary. Panel heights must visually reflect their size fraction.
- No new dependencies
- Do not modify the Drizzle schema or API
- Do not create new context providers

## Acceptance Criteria

1. Panel elements accept size keywords typed inline. "sp" + Enter sets size to SPLASH and advances to scene.
2. Size tag `[SPLASH]` visible on panel row after size is set.
3. Trailing suggestion text appears while typing a size prefix on a panel row.
4. Backspace on empty panel with size clears the size before deleting the element.
5. `Cmd+Shift+P` toggles a right-side overlay showing ASCII page grids.
6. Page grids are proportional — a HALF panel visually takes ~half the page box height.
7. Default (no sizes): panels divide page equally.
8. Overflow pages flagged in preview (error color) and inline (`[!]` on panel rows).
9. Preview updates live as script is edited.
10. Mutually exclusive with shortcuts overlay.
11. Shortcut reference updated with new entries.
12. App compiles without errors (`npx expo start --clear` from `apps/mobile/`).

---

## Completion Note (Codex)

- Files changed:
  - `apps/mobile/components/ScriptView.tsx`
  - `apps/mobile/components/PanelMapPreview.tsx` (new)
  - `apps/mobile/components/Editor.tsx`
  - `apps/mobile/app/universe/[id].tsx`
  - `documents/TASK.md`
- Verification:
  - `npx tsc --noEmit -p apps/mobile/tsconfig.json` passed.
- Assumptions / open risks:
  - The panel map receives script elements from the primary editor path; split-view secondary editor changes are intentionally not piped into the panel map state.
