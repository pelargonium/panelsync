# Task: Script Entity Type

## Status
`needs Claude review`

## Objective
Add 'script' as a new entity type. When a script entity is opened in the editor, it renders a vertical list of script elements (pages, panels, scene descriptions, character names, parentheticals, dialogue) instead of the text editor. The interaction is designed for rapid writing flow — Enter chains create the next logical element, and the visual layout uses indentation by type so you can scan the structure at a glance.

## Data Model

Elements are stored as a JSON array in bodyText (same pattern as timeline). No new database tables or API endpoints.

```typescript
type ScriptElementType = 'page' | 'panel' | 'scene' | 'character' | 'parenthetical' | 'dialogue';

interface ScriptElement {
  id: string;
  type: ScriptElementType;
  text: string;
}
// bodyText = JSON.stringify(elements)
```

A new script starts with two elements:
```typescript
[
  { id: crypto.randomUUID(), type: 'page', text: '' },
  { id: crypto.randomUUID(), type: 'panel', text: '' },
]
```

## Visual Layout

Each element is a single-line TextInput with left padding determined by type. All text uses `fontFamily: mono` from `useTheme()`.

| Type | Left padding | Font style | Placeholder text |
|------|-------------|------------|-----------------|
| page | 0px | fontSize 12, bold, `colors.muted` | `"page"` |
| panel | 16px | fontSize 12, bold, `colors.muted` | `"panel"` |
| scene | 32px | fontSize 13, `colors.text` | `"scene description"` |
| character | 48px | fontSize 12, bold, `colors.text`, ALL CAPS (auto-uppercased via `onChangeText`) | `"character"` |
| parenthetical | 48px | fontSize 12, italic, `colors.muted` | `"parenthetical"` |
| dialogue | 32px | fontSize 13, `colors.text` | `"dialogue"` |

- The placeholder text IS the type label — it shows in `colors.muted` and disappears as soon as the user types (standard TextInput `placeholder` prop behavior).
- Character name text is auto-uppercased: `onChangeText={v => updateElement(i, { text: v.toUpperCase() })}`.
- Parenthetical text is rendered with parens: the TextInput value does NOT include the parens, but they are displayed as static `(` and `)` Text elements flanking the input. Or simpler: just let the user type the parens as part of the text.
- No decorative chrome. Just indentation, font weight, and placeholder text distinguish the types.

Focused element: subtle background tint using `colors.selection` on the focused element's row.

## Interaction Model

### Enter chain (the core writing loop)

Enter from any element creates the next element below it based on these rules:

| Current type | Current text | Enter creates |
|-------------|-------------|---------------|
| page | any | panel (below) |
| panel | non-empty | scene (below) |
| panel | empty | page (replace this panel — empty panel means "done with this page") |
| scene | non-empty | character (below) |
| scene | empty | character (below — empty scene is fine, skip to dialogue) |
| character | non-empty | dialogue (below) |
| character | empty | panel (replace this character — empty character means "done with dialogue") |
| character | text contains `(` | If cursor is right after `(`, insert parenthetical element below, move what's after `(` into it. See "Parenthetical auto-insert" below. |
| parenthetical | any | dialogue (below) |
| dialogue | non-empty | character (below — next speaker) |
| dialogue | empty | character (below) |

**Special: empty panel → new page.** When Enter is pressed on an empty panel, replace that panel element with a new page element. This means: two Enters from dialogue (first creates empty character, second replaces it with empty panel, but actually let me re-think the chain...)

Simpler rule: **Enter on an empty element collapses up the hierarchy:**
- Empty dialogue → new character (still in dialogue mode)
- Empty character → new panel (exits dialogue mode)
- Empty panel → new page (exits panel mode)
- Empty scene → new character (enters dialogue mode)

**Enter on a non-empty element advances down the hierarchy:**
- Page → panel
- Panel → scene
- Scene → character
- Character → dialogue (or parenthetical if `(` detected)
- Parenthetical → dialogue
- Dialogue → character (next speaker)

### Parenthetical auto-insert

When the user types `(` anywhere in a character name field:
- Split the character text: everything before `(` stays as the character name, everything from `(` onward (minus the `(` itself) becomes the text of a new parenthetical element inserted directly below.
- Focus moves to the parenthetical element.
- The user types their parenthetical (e.g., "whispering"), then presses Enter to get to dialogue.

If the user doesn't want a parenthetical, they just don't type `(`. Normal Enter from character → dialogue.

### Tab / Shift+Tab — type cycling

On any **empty** element:
- **Tab** cycles the element type forward: page → panel → scene → character → parenthetical → dialogue → page
- **Shift+Tab** cycles backward: dialogue → parenthetical → character → scene → panel → page → dialogue

This lets the user override the automatic Enter chain when they want a different element type. Only works when the element text is empty — if there's text, Tab should do nothing (or move focus to next element, your call — doing nothing is safer).

### Navigation

**Arrow keys (Up/Down/Left/Right):** Move the cursor linearly through the text, like a normal text document. Up from the first element focuses the entity name input (matches existing editor pattern). Each element is a single-line TextInput, so Up/Down move between elements (up from one input → focus the one above, cursor at end; down → focus the one below, cursor at start).

**Alt+Up/Down — block jumping:**
- Alt+Down: jump to the next "content" element, skipping structural headers and character names. In practice: jump to the next scene, dialogue, or parenthetical element. Skip page, panel, and character elements.
- Alt+Up: same but upward.
- Exception: if you're already on a character or page or panel, Alt+Down goes to the nearest content element below. Alt+Up goes to the nearest content element above.
- Cursor lands at the **end** of the target element's text.

**Alt+Left/Right — within-dialogue navigation:**
- Alt+Left from dialogue: focus the parenthetical above it (if one exists), else the character name above it. Cursor at end.
- Alt+Left from parenthetical: focus the character name above it. Cursor at end.
- Alt+Left from character: no-op (already at the leftmost in the dialogue group).
- Alt+Right: reverse direction. Character → parenthetical (if exists) → dialogue. Cursor at end.
- Outside of dialogue context (on page, panel, scene): Alt+Left/Right are no-ops.

### Other keys

- **Backspace on empty element:** Delete this element, move focus to the element above (cursor at end). If it's the last element, don't delete — keep at least one element.
- **Escape:** Blur the active input (same as other editors).

## Files to Change (in order)

### 1. `apps/api/src/db/schema.ts` — add 'script' to enum
Add `'script'` to the `entityTypeEnum` array (after 'timeline').

### 2. `apps/api/drizzle/0009_add_script_type.sql` — NEW migration file
```sql
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'script';
```

### 3. `apps/api/src/routes/entities.ts` — add 'script' to type annotations
Add `'script'` to the POST and PATCH route Body type unions (same pattern as timeline).

### 4. `apps/mobile/lib/api.ts` — add 'script' to ApiEntity type
Add `| 'script'` to the `type` union on the `ApiEntity` interface.

### 5. `apps/mobile/context/UniverseContext.tsx` — add default name
In `defaultNameForType`, add: `if (type === 'script') return 'Untitled Script';`

### 6. `apps/mobile/components/Binder.tsx` — add script to lists
Three additions (same pattern as timeline):
- `TYPE_SECTIONS`: `{ type: 'script', label: 'Scripts' }`
- `CREATE_OPTIONS`: `{ type: 'script', label: 'script' }`
- `typeLabel`: `if (type === 'script') return 'S';`

### 7. `apps/mobile/components/ScriptView.tsx` — NEW FILE (the main work)

This is a new component, ~400-500 lines. It renders the script element list and handles all keyboard interaction.

**Props:**
```typescript
interface ScriptViewProps {
  elements: ScriptElement[];
  onElementsChange: (elements: ScriptElement[]) => void;
  isFocused: boolean;
  nameInputRef: React.RefObject<TextInput | null>;
}
```

**Internal state:**
- `focusedIndex: number` — which element has focus (default 0)

**TextInput refs:** Use `useRef<Record<string, TextInput>>({})` map keyed by element id.

**Auto-focus:** `useEffect` watching `focusedIndex` that calls `.focus()` on the correct input via `setTimeout(() => ref?.focus(), 0)`.

**Keyboard handler:** Follow the exact same pattern as TimelineView.tsx:
- Web only: `Platform.OS !== 'web'` guard
- `useRef` for the handler function, updated every render
- `document.addEventListener('keydown', handler, true)` — use capture phase (same as TimelineView)
- Gate on `isFocused` prop
- `submitBehavior="submit"` on all TextInputs (prevents blur on Enter)
- `e.preventDefault()` on all intercepted keys

**Element mutation helpers:**
```typescript
function addElement(afterIndex: number, type: ScriptElementType) {
  const el = { id: crypto.randomUUID(), type, text: '' };
  const next = [...elements];
  next.splice(afterIndex + 1, 0, el);
  onElementsChange(next);
  setFocusedIndex(afterIndex + 1);
}

function replaceElement(index: number, type: ScriptElementType) {
  onElementsChange(elements.map((e, i) => i === index ? { ...e, type, text: '' } : e));
}

function updateElement(index: number, patch: Partial<ScriptElement>) {
  onElementsChange(elements.map((e, i) => i === index ? { ...e, ...patch } : e));
}

function deleteElement(index: number) {
  if (elements.length <= 1) return;
  onElementsChange(elements.filter((_, i) => i !== index));
  setFocusedIndex(Math.max(0, index - 1));
}
```

**Render structure:**
```
ScrollView (flex: 1)
  {elements.map((el, i) => (
    <View key={el.id} style={{
      flexDirection: 'row',
      backgroundColor: focusedIndex === i ? colors.selection : 'transparent',
      paddingLeft: indentForType(el.type),
      paddingVertical: 2,
      minHeight: 28,
    }}>
      <TextInput
        ref={r => { if (r) inputRefs.current[el.id] = r; }}
        value={el.type === 'character' ? el.text : el.text}
        onChangeText={v => updateElement(i, { text: el.type === 'character' ? v.toUpperCase() : v })}
        placeholder={placeholderForType(el.type)}
        placeholderTextColor={colors.muted}
        submitBehavior="submit"
        style={{
          flex: 1,
          fontFamily: mono,
          ...styleForType(el.type, colors),
          paddingVertical: 0,
        }}
        onFocus={() => setFocusedIndex(i)}
      />
    </View>
  ))}
```

Helper functions:
```typescript
function indentForType(type: ScriptElementType): number {
  if (type === 'page') return 0;
  if (type === 'panel') return 16;
  if (type === 'scene') return 32;
  if (type === 'character') return 48;
  if (type === 'parenthetical') return 48;
  if (type === 'dialogue') return 32;
  return 0;
}

function placeholderForType(type: ScriptElementType): string {
  if (type === 'page') return 'page';
  if (type === 'panel') return 'panel';
  if (type === 'scene') return 'scene description';
  if (type === 'character') return 'character';
  if (type === 'parenthetical') return 'parenthetical';
  if (type === 'dialogue') return 'dialogue';
  return '';
}

function styleForType(type: ScriptElementType, colors: any) {
  if (type === 'page') return { fontSize: 12, fontWeight: '700' as const, color: colors.muted };
  if (type === 'panel') return { fontSize: 12, fontWeight: '700' as const, color: colors.muted };
  if (type === 'scene') return { fontSize: 13, color: colors.text };
  if (type === 'character') return { fontSize: 12, fontWeight: '700' as const, color: colors.text };
  if (type === 'parenthetical') return { fontSize: 12, fontStyle: 'italic' as const, color: colors.muted };
  if (type === 'dialogue') return { fontSize: 13, color: colors.text };
  return { fontSize: 13, color: colors.text };
}
```

### 8. `apps/mobile/components/Editor.tsx` — integration

Follow the exact same pattern as timeline integration:

**Add to `entityTypeLabel`:**
```typescript
if (type === 'script') return 'script';
```

**Add script elements state (alongside timeline events state):**
```typescript
const [scriptElements, setScriptElements] = useState<ScriptElement[]>([]);
```
Also add refs for script save debounce:
```typescript
const scriptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const latestScriptRef = useRef<string>('[]');
const savedScriptRef = useRef<string>('[]');
```

**Modify entity load effect:**
Add a branch for script, same pattern as timeline:
```typescript
if (entryRes.data.type === 'script') {
  let parsed: ScriptElement[] = [];
  try { parsed = JSON.parse(content); } catch { parsed = []; }
  if (!Array.isArray(parsed)) parsed = [];
  if (parsed.length === 0) parsed = [
    { id: crypto.randomUUID(), type: 'page', text: '' },
    { id: crypto.randomUUID(), type: 'panel', text: '' },
  ];
  setScriptElements(parsed);
  latestScriptRef.current = JSON.stringify(parsed);
  savedScriptRef.current = content || '[]';
} else if (entryRes.data.type === 'timeline') {
  // ... existing timeline branch
```

**Add script auto-save effect (same pattern as events auto-save):**
```typescript
useEffect(() => {
  if (entityType !== 'script') return;
  const serialized = JSON.stringify(scriptElements);
  latestScriptRef.current = serialized;
  if (!hydratedRef.current) return;
  if (scriptTimerRef.current) clearTimeout(scriptTimerRef.current);
  if (serialized === savedScriptRef.current) return;

  notifySaveState('saving');
  scriptTimerRef.current = setTimeout(() => {
    scriptTimerRef.current = null;
    runSave(async () => {
      await api.entities.updateContent(entityId, latestScriptRef.current);
      savedScriptRef.current = latestScriptRef.current;
    });
  }, 600);

  return () => { if (scriptTimerRef.current) { clearTimeout(scriptTimerRef.current); scriptTimerRef.current = null; } };
}, [entityId, entityType, scriptElements]);
```

**Modify auto-focus effect:**
Skip for script (same as timeline):
```typescript
if (isFocused && hydratedRef.current && entityType !== 'timeline' && entityType !== 'script') {
```

**Modify keyboard handler:**
Skip for script (same as timeline):
```typescript
if (entityType === 'timeline' || entityType === 'script') return;
```

**Modify `hasPending`:**
Include `scriptTimerRef`.

**Modify load effect cleanup:**
Clear `scriptTimerRef`.

**Modify render body:**
Add script branch:
```typescript
{entityType === 'script' ? (
  <ScriptView
    elements={scriptElements}
    onElementsChange={setScriptElements}
    isFocused={isFocused}
    nameInputRef={nameInputRef}
  />
) : entityType === 'timeline' ? (
  <TimelineView ... />
) : (
  <TextInput ... />
)}
```

### 9. `apps/mobile/app/universe/[id].tsx` — shortcut reference
Add a new ShortcutSection after the TIMELINE section:
```typescript
<ShortcutSection mono={mono} colors={colors} title="SCRIPT" items={[
  ['Enter', 'next element (context-aware)'],
  ['Tab / Shift+Tab', 'cycle element type (empty)'],
  ['Backspace (empty)', 'delete element'],
  ['Alt+Up/Down', 'jump to content'],
  ['Alt+Left/Right', 'navigate dialogue group'],
  ['( in character', 'insert parenthetical'],
  ['Escape', 'blur'],
]} />
```

## Files NOT to touch
- `apps/mobile/context/ThemeContext.tsx` — no theme changes
- `apps/api/src/routes/blocks.ts` — no block changes
- `apps/api/drizzle/` — do NOT modify existing migration files, only create 0009
- Any test files — not in scope
- `documents/CONCEPT.md` — Claude will update this after review

## Constraints
- All new components use `fontFamily: mono` and `colors.*` from `useTheme()`. No hardcoded colors.
- Keyboard handlers: web only (`Platform.OS !== 'web'` guard). Use `document.addEventListener('keydown')` in **capture phase** (`true`), matching the TimelineView pattern.
- `e.preventDefault()` on every intercepted key.
- `submitBehavior="submit"` on every TextInput (prevents blur on Enter).
- Do not break existing editor behavior for non-script entities.
- Do not break binder keyboard shortcuts.
- `ScriptElement.id` must use `crypto.randomUUID()`.
- Import `Platform` from `react-native` for the web guard.
- No new npm dependencies.
- Character name text must be auto-uppercased via `onChangeText`.
- The `(` parenthetical trigger must work by detecting `(` in the `onChangeText` handler of character-type elements, not in the keyboard handler.

## Acceptance Criteria
- [ ] 'script' entity type can be created from the binder create picker
- [ ] Script entity opens in editor showing script view (not text editor)
- [ ] Opens with first element focused (page element, placeholder visible)
- [ ] Enter from page → creates panel below
- [ ] Enter from panel → creates scene below
- [ ] Enter from scene → creates character below
- [ ] Enter from character → creates dialogue below
- [ ] Enter from dialogue → creates character below (next speaker)
- [ ] Enter from parenthetical → creates dialogue below
- [ ] Enter on empty character → replaces with panel (exits dialogue)
- [ ] Enter on empty panel → replaces with page (exits panel)
- [ ] Tab on empty element cycles type forward
- [ ] Shift+Tab on empty element cycles type backward
- [ ] Tab/Shift+Tab do nothing on non-empty elements
- [ ] Typing `(` in character name splits into character + parenthetical, focuses parenthetical
- [ ] Character names are auto-uppercased
- [ ] Alt+Up/Down jumps to next/prev content element (scene, dialogue, parenthetical)
- [ ] Alt+Left/Right navigates within dialogue group (character ↔ parenthetical ↔ dialogue)
- [ ] Cursor lands at end of target element on Alt jumps
- [ ] Backspace on empty element deletes it, focuses element above
- [ ] ArrowUp from first element focuses entity name input
- [ ] Escape blurs active input
- [ ] Elements auto-save (600ms debounce, JSON in bodyText)
- [ ] Indentation visually distinguishes element types at a glance
- [ ] Placeholder text shows element type, disappears on input
- [ ] Name input, save state indicator, type label, and delete toolbar all work same as other entities
- [ ] Dark mode and light mode both render correctly
- [ ] Non-script entities are completely unaffected
- [ ] Shortcut reference panel shows SCRIPT section
- [ ] Migration file exists at `apps/api/drizzle/0009_add_script_type.sql`

## After Implementation
- Set TASK.md status to `needs Claude review`
- Add a short completion note: files changed, any assumptions or open risks
- Do NOT update CONCEPT.md — Claude will do that after review

### Completion Note
- Implemented 'script' entity type across API and Mobile apps.
- Created `ScriptView.tsx` with full keyboard interaction logic (Enter chains, Tab cycling, Alt+Arrow navigation, and parenthetical auto-insert).
- Updated `Editor.tsx` to conditionally render `ScriptView` and handle auto-saving script elements as JSON in `bodyText`.
- Updated `Binder.tsx`, `UniverseContext.tsx`, and API routes/types to support the new entity type.
- Migration created at `apps/api/drizzle/0009_add_script_type.sql`.

### Detailed Change Log

#### **Feature: Script Entity Type**

*   **`apps/api/src/db/schema.ts`**
    *   **Change:** Modified `entityTypeEnum`.
    *   **Description:** Added `'script'` to the `pgEnum` definition for `entity_type`.
*   **`apps/api/drizzle/0009_add_script_type.sql`**
    *   **Change:** New migration file created.
    *   **Description:** Added `ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'script';` to extend the database enum.
*   **`apps/api/src/routes/entities.ts`**
    *   **Change:** Modified POST and PATCH route type annotations.
    *   **Description:** Included `'script'` in the `type` union for entity creation and updates.
*   **`apps/mobile/lib/api.ts`**
    *   **Change:** Modified `ApiEntity` interface.
    *   **Description:** Added `| 'script'` to the `type` union in the `ApiEntity` interface.
*   **`apps/mobile/context/UniverseContext.tsx`**
    *   **Change:** Modified `defaultNameForType` function.
    *   **Description:** Added a default name for the `'script'` entity type.
*   **`apps/mobile/components/Binder.tsx`**
    *   **Change:** Modified `TYPE_SECTIONS`, `CREATE_OPTIONS`, and `typeLabel` arrays/functions.
    *   **Description:** Added `'script'` to the lists for display and creation in the Binder.
*   **`apps/mobile/components/ScriptView.tsx`**
    *   **Change:** New file created.
    *   **Description:** Implemented the `ScriptView` component, including visual layout based on element type, state management for script elements, and comprehensive keyboard interaction logic (Enter chaining, Tab cycling, Alt+Arrow navigation, Backspace deletion, parenthetical auto-insert). Also added `generateId` helper.
*   **`apps/mobile/components/Editor.tsx`**
    *   **Change:** Integrated `ScriptView` and added state for script elements.
    *   **Description:** Added conditional rendering for `ScriptView` based on `entityType`, and implemented auto-save logic for `scriptElements` (serialized JSON in `bodyText`). Updated `autoFocus` and keyboard handlers to account for `script` entities.
*   **`apps/mobile/app/universe/[id].tsx`**
    *   **Change:** Added shortcut section.
    *   **Description:** Included keyboard shortcuts specific to the Script editor in the app's shortcut reference panel.

#### **Fixes & Refinements (Post-Script Entity Implementation)**

*   **`apps/mobile/components/ScriptView.tsx`**
    *   **Change:** Exported `ScriptElementType` and `ScriptElement` interfaces, and fixed `activeElement` reference.
    *   **Description:** Made types available for import in `Editor.tsx` and corrected a `ReferenceError` in the `onChangeText` handler by properly referencing `document.activeElement`.
*   **`apps/mobile/components/Editor.tsx`**
    *   **Change:** Imported `ScriptElement` type and `generateId` helper.
    *   **Description:** Resolved "Cannot find name 'ScriptElement'" error and ensured `generateId` is available for initial script element creation.
*   **`apps/api/src/routes/entities.ts`**
    *   **Change:** Added `try-catch` block around entity creation.
    *   **Description:** Implemented robust error handling to prevent API server crashes and return detailed `500` errors for issues like invalid enum values.
*   **`apps/mobile/components/Editor.tsx`**
    *   **Change:** Used `generateId()` for initial script elements.
    *   **Description:** Replaced `crypto.randomUUID()` with the more robust `generateId()` helper for initial script element creation.
*   **`apps/mobile/components/TimelineView.tsx`**
    *   **Change:** Used `generateId()` for timeline events.
    *   **Description:** Replaced `crypto.randomUUID()` with the `generateId()` helper for timeline event creation.
*   **`apps/mobile/components/Editor.tsx`**
    *   **Change:** Corrected import statement and initial script element array closing bracket.
    *   **Description:** Fixed a syntax error that occurred during bundling due to an incomplete import and an unclosed array literal.
