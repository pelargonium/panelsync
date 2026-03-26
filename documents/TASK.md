# Task: Fix Board Branch Intersections

**Status:** ready for implementation

---

## Objective

When multiple forks/outcomes are created in the board, branches that should be visually separate end up overlapping — beats from different branches land on the same row, causing connector lines to cross and cards to collide.

The root cause is that `pickRowNear` (line ~306) only checks occupied rows **at the target column** when choosing a row for a new beat. It doesn't account for rows used by other branches at other columns. Two independent branches originating from different parents can be assigned the same row, and their connectors visually intersect.

**Fix:** Make row assignment aware of the full subtree layout so branches don't collide.

---

## Files to Change

| File | Action |
|------|--------|
| `apps/mobile/components/BoardView.tsx` | Modify — fix row assignment logic |

## Files NOT to Touch

- `apps/mobile/app/universe/[id].tsx` — do not modify
- `apps/mobile/components/Editor.tsx` — do not modify
- `documents/CONCEPT.md` — Claude updates after review
- Everything else

---

## Relevant Context

### Data model

```typescript
interface BeatNode {
  id: string;
  text: string;
  col: number;    // depth in tree (0 = root)
  row: number;    // fork position (vertical spread)
  parentId: string | null;
  relation: 'sequence' | 'fork' | 'outcome';
  children: string[];
}
```

- `col` = tree depth. Root is col 0, its children are col 1, etc.
- `row` = fork position. Sequence children share their parent's row. Forks/outcomes get a different row.
- The grid renders beats at (col, row) positions. Each position is one cell.

### Current row assignment (the bug)

```typescript
function occupiedRowsAtCol(current: BeatNode[], col: number): Set<number> {
  return new Set(current.filter((beat) => beat.col === col).map((beat) => beat.row));
}

function pickRowNear(current: BeatNode[], col: number, baseRow: number, direction: -1 | 1): number {
  const occupied = occupiedRowsAtCol(current, col);
  let step = 1;
  while (step < 5000) {
    const candidate = baseRow + (direction * step);
    if (!occupied.has(candidate)) return candidate;
    step += 1;
  }
  return baseRow + direction;
}
```

`pickRowNear` is called when creating forks (`forkThread`, line ~408), outcomes (`createOutcome`, line ~466), and centered fork splits (line ~400). It only checks the target column for collisions. Two branches at different depths can pick row 1, and their connector lines will overlap.

### What correct behavior looks like

Each branch should occupy its own horizontal band of rows. When a new fork or outcome is created, its row should not conflict with any existing beat at **any** column — not just the target column. This ensures branches never visually cross.

### Approach

Replace `occupiedRowsAtCol` with a function that returns **all occupied rows across all columns** (or at minimum, all rows used by beats that are NOT in the current beat's own subtree). Then `pickRowNear` picks a row that is globally unoccupied.

Simplest fix:

```typescript
function allOccupiedRows(current: BeatNode[]): Set<number> {
  return new Set(current.map((beat) => beat.row));
}
```

Then change `pickRowNear` to use `allOccupiedRows` instead of `occupiedRowsAtCol`:

```typescript
function pickRowNear(current: BeatNode[], col: number, baseRow: number, direction: -1 | 1): number {
  const occupied = allOccupiedRows(current);
  let step = 1;
  while (step < 5000) {
    const candidate = baseRow + (direction * step);
    if (!occupied.has(candidate)) return candidate;
    step += 1;
  }
  return baseRow + direction;
}
```

The `col` parameter can remain for API compatibility but is no longer used. Alternatively, remove it and update all call sites.

Also check the centered fork logic (line ~390-404) — when the existing sequence child's subtree is shifted up by 1 row, verify the collision check uses all occupied rows, not just the target column. The existing `collides` check (line ~392) already checks all beats, so that part may be fine.

### Where pickRowNear is called

1. **`forkThread`** (line ~408): `pickRowNear(current, currentBeat.col + 1, currentBeat.row, 1)`
2. **Centered fork** (line ~400): `pickRowNear(next, currentBeat.col + 1, currentBeat.row, 1)`
3. **`createOutcome`** (line ~466): `pickRowNear(current, currentBeat.col + 1, currentBeat.row, direction)`

All three should use the global occupied set.

---

## Constraints

- Do not change the horizontal or vertical rendering paths in `gridLines`. The rendering is correct — only the row assignment during mutation is wrong.
- Do not change the `BeatNode` data model.
- Do not change key handlers, mode switching, scroll logic, or overlay positioning.
- Do not change the connector rendering logic.
- Sequence children must still share their parent's row (that's correct behavior, don't break it).
- The root beat stays at row 0.

## Acceptance Criteria

1. Creating multiple forks from the same parent places each on a unique row with no overlaps
2. Creating forks from different parents at different depths does not cause row collisions
3. Connector lines between branches do not cross or overlap
4. Sequence chains (Enter to advance) still share the parent's row
5. Centered fork split still works (first fork positions one above, one below)
6. Existing boards with correct layouts are not broken (row assignment only affects new mutations)
7. App compiles without errors (`npx tsc --noEmit -p apps/mobile/tsconfig.json`)
