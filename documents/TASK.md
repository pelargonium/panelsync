# Task: 2-Up Side-by-Side Editor

## Status
`ready for implementation`

## Objective
Add a split editor view: two editors side by side, each showing a different entity. The secondary (right) editor opens via Shift+Enter in the binder and closes via Shift+Enter when the secondary editor is focused. Cmd+; cycles focus through binder → left editor → right editor → binder.

## Interaction Model

### Opening the split
- **Enter** in binder: opens entity in the primary (left) editor (existing behavior, unchanged)
- **Shift+Enter** in binder: opens entity in the secondary (right) editor. If no split exists yet, this creates it.
- If the secondary editor already has an entity, Shift+Enter replaces it with the newly selected entity.

### Closing the split
- **Shift+Enter** when `focusedPanel === 'editor-right'`: closes the secondary editor, collapses back to single editor view. Sets `focusedPanel` to `'editor-left'`.

### Focus cycling
- **Cmd+;** cycles: `'binder'` → `'editor-left'` → `'editor-right'` → `'binder'`
- If there is no secondary editor open, skip `'editor-right'` in the cycle: `'binder'` → `'editor-left'` → `'binder'`
- The 2px top border indicator shows on whichever panel is focused (all three panels get the same treatment).

### Creating entities
- When a new entity is created (Cmd+Shift+A), it opens in the primary editor and focuses `'editor-left'` (existing behavior, unchanged).

## Files to Change

### 1. `apps/mobile/context/UniverseContext.tsx`
Add secondary entity tracking to context:

**New state:**
```typescript
const [secondaryEntityType, setSecondaryEntityType] = useState<string | null>(null);
const [secondaryEntityId, setSecondaryEntityId] = useState<string | null>(null);
```

**New function:**
```typescript
function activateSecondaryEntity(type: string, id: string) {
  setSecondaryEntityType(type);
  setSecondaryEntityId(id);
}

function closeSecondaryEditor() {
  setSecondaryEntityType(null);
  setSecondaryEntityId(null);
}
```

**Add to context interface and provider value:**
- `secondaryEntityType: string | null`
- `secondaryEntityId: string | null`
- `activateSecondaryEntity: (type: string, id: string) => void`
- `closeSecondaryEditor: () => void`

**Workspace state persistence:** Add `secondaryEntityType` and `secondaryEntityId` to the `PUT /api/workspace-state` body and read them back on hydration. The API stores these in the existing `workspace_state` jsonb-like row — but the table does NOT have columns for these yet. For now, stash them inside the `stagingArea` jsonb field as a temporary hack: `{ splitEditor: { entityType, entityId } }`. Do NOT modify the Drizzle schema or create migrations. This keeps persistence working without a schema change. When reading back, parse `stagingArea` and extract `splitEditor` if present.

**Delete cascade:** When `deleteEntity` is called, if the deleted entity's ID matches `secondaryEntityId`, clear the secondary editor (same pattern as the existing `activeEntityId` cleanup).

### 2. `apps/mobile/app/universe/[id].tsx`
This is where the layout and focus state live.

**Focus state:** Change the type from `'binder' | 'editor'` to `'binder' | 'editor-left' | 'editor-right'`.

**Cmd+; handler (line 109–113):** Change the cycle logic:
```typescript
setFocusedPanel((p) => {
  if (p === 'binder') return 'editor-left';
  if (p === 'editor-left') return secondaryEntityId ? 'editor-right' : 'binder';
  return 'binder'; // editor-right → binder
});
```

**Shift+Enter handler:** Add to the app-level keyboard handler:
```typescript
if (e.key === 'Enter' && e.shiftKey && focusedPanel === 'editor-right') {
  e.preventDefault();
  closeSecondaryEditor();
  setFocusedPanel('editor-left');
  return;
}
```

**Click-to-focus (line 134–157):** Add a third ref (`secondaryEditorWrapperRef`) and a mousedown listener that sets `focusedPanel` to `'editor-right'`. Update the blur logic: clicking any panel blurs inputs in the other two.

**Layout (line 216–268):** Split the editor area into two when `secondaryEntityId` is not null:

```
<View style={{ flex: 1, flexDirection: 'row' }}>
  {/* Binder (unchanged) */}

  {/* Primary editor */}
  <View ref={editorWrapperRef} style={{ flex: 1, borderTopWidth: 2, borderTopColor: focusedPanel === 'editor-left' ? colors.text : 'transparent' }}>
    <ErrorBoundary colors={colors} mono={mono}>
      <PrimaryContent ... isFocused={focusedPanel === 'editor-left'} />
    </ErrorBoundary>
  </View>

  {/* Secondary editor (only if secondaryEntityId is set) */}
  {secondaryEntityId && (
    <>
      <View style={{ width: 1, backgroundColor: colors.border }} />
      <View ref={secondaryEditorWrapperRef} style={{ flex: 1, borderTopWidth: 2, borderTopColor: focusedPanel === 'editor-right' ? colors.text : 'transparent' }}>
        <ErrorBoundary colors={colors} mono={mono}>
          <Editor
            entityId={secondaryEntityId}
            isFocused={focusedPanel === 'editor-right'}
            onSaveStateChange={setSecondarySaveState}
          />
        </ErrorBoundary>
      </View>
    </>
  )}
</View>
```

**Save state display (top bar):** Show the save state of the focused editor. Track `secondarySaveState` separately. Display whichever editor is focused, or default to primary.

**Shortcut reference panel:** Add new entries:
- Under BINDER: `['Shift+Enter', 'open in split']`
- Under EDITOR: `['Shift+Enter', 'close split (right editor)']`
- Update APP: `['Cmd+;', 'cycle panels']`

### 3. `apps/mobile/components/Binder.tsx`
Add Shift+Enter handling for opening in secondary editor.

**Props:** Add `onActivateSecondary: (type: string, id: string) => void` prop.

**Keyboard handler:** At line 980 where Enter is handled (`else if (e.key === 'Enter')`), add a Shift check:
```typescript
else if (e.key === 'Enter') {
  e.preventDefault();
  setSelectionAnchorIndex(null);
  if (e.shiftKey) {
    // Open in secondary editor
    const item = navItems[focusedIndex];
    if (item && item.kind !== 'section') {
      onActivateSecondary('entity', item.id);
    }
  } else {
    activateFocused();
  }
}
```

Apply the same Shift+Enter logic to the other Enter handlers (filter input at line 902, but skip the move picker and create picker — those should not trigger split).

**In `[id].tsx`:** Pass the new prop from UniverseWorkspace:
```typescript
<Binder
  ...
  onActivateSecondary={(type, id) => {
    activateSecondaryEntity(type, id);
    setFocusedPanel('editor-right');
  }}
/>
```

## Files NOT to Touch
- `apps/mobile/components/Editor.tsx` — it already takes `entityId` and `isFocused` as props. No changes needed.
- `apps/mobile/components/TimelineView.tsx` — works as-is inside Editor.
- `apps/api/src/db/schema.ts` — no schema changes.
- `apps/api/src/routes/` — no API route changes.
- `documents/CONCEPT.md` — Claude will update after review.

## Constraints
- No new npm dependencies.
- No Drizzle schema changes or migrations. Use `stagingArea` jsonb for secondary editor persistence.
- The Editor component must not be modified. It already has the right prop interface.
- All keyboard handlers must be gated on platform (`Platform.OS === 'web'`) where the existing handlers are.
- Use `fontFamily: mono` and `colors.*` from `useTheme()` for all visual elements (the 1px divider between editors, border indicators).
- Do not break existing single-editor behavior: when no secondary entity is set, everything must work exactly as before.
- Do not break existing binder keyboard nav, selection, move picker, create picker, rename, delete, or filter.

## Acceptance Criteria
- [ ] Enter in binder opens entity in primary (left) editor (unchanged)
- [ ] Shift+Enter in binder opens entity in secondary (right) editor
- [ ] Secondary editor appears to the right of primary, separated by a 1px border divider
- [ ] Both editors are `flex: 1` (equal width split)
- [ ] Cmd+; cycles through binder → editor-left → editor-right → binder
- [ ] Cmd+; skips editor-right when no split is open
- [ ] 2px top border indicator shows on the focused panel (all three panels)
- [ ] Shift+Enter when editor-right is focused closes the secondary editor
- [ ] Closing secondary editor moves focus to editor-left
- [ ] Click in either editor panel sets it as focused
- [ ] Keyboard handlers only fire in the focused editor (isFocused prop)
- [ ] Creating a new entity (Cmd+Shift+A) still opens in primary editor
- [ ] Deleting the entity shown in secondary editor closes the secondary editor
- [ ] Secondary editor entity ID persists in workspace state (via stagingArea jsonb)
- [ ] Shortcut reference panel updated with Shift+Enter entries
- [ ] Top bar save state reflects the focused editor
- [ ] No regressions in single-editor mode

## Relevant Context

### Editor props (no changes needed)
```typescript
interface EditorProps {
  entityId: string;
  isFocused: boolean;
  autoFocusName?: boolean;
  onAutoFocusDone?: () => void;
  onSaveStateChange?: (state: 'saved' | 'saving') => void;
}
```

### Current focus panel type
```typescript
// [id].tsx line 97
const [focusedPanel, setFocusedPanel] = useState<'binder' | 'editor'>('binder');
```

### Workspace state schema (do not modify)
```typescript
// workspace_state table has stagingArea jsonb — use this for secondary editor persistence
stagingArea: jsonb('staging_area').notNull().default([]),
```

### Binder props interface (add onActivateSecondary)
Check the Binder component's prop types at the top of Binder.tsx and add the new prop there.

## After Implementation
- Set TASK.md status to `needs Claude review`
- Add a short completion note: files changed, any assumptions or open risks
- Do NOT update CONCEPT.md — Claude will do that after review
