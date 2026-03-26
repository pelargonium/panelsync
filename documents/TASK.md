# Task: Fix Vertical Board Connectors

**Status:** ready for implementation

---

## Objective

The vertical layout mode in `BoardView.tsx` has a connector rendering bug. When the tree forks (parent at one row, children at different rows), the horizontal trunk connecting fork positions is interrupted by empty card areas. The trunk line `───` renders inside a 7-char connector area but cannot bridge across the 22-char card area of intermediate empty cells, leaving visible gaps.

The current approach uses a single `renderCell` function with a rotation flag that swaps connector directions. This does not work because the connector system was designed for horizontal layout — vertical pipes (`│`) stack across rows (outer loop iterations) to form continuous lines, but horizontal dashes (`───`) within a single row's connector areas are separated by card-width gaps.

**Fix:** Replace the rotation approach with a dedicated vertical grid-building path inside `gridLines`. The horizontal path stays as-is. The vertical path builds the grid differently so that fork connections render correctly.

---

## Files to Change

| File | Action |
|------|--------|
| `apps/mobile/components/BoardView.tsx` | Modify — replace vertical grid rendering |

## Files NOT to Touch

- `apps/mobile/app/universe/[id].tsx` — already updated, do not modify
- `documents/CONCEPT.md` — Claude updates after review
- Everything else

---

## Relevant Context

### Current grid structure (horizontal mode — works correctly)

- **Outer loop:** `rows` (vertical axis — fork positions)
- **Inner loop:** `cols` (horizontal axis — tree depth)
- Each cell = `CONNECTOR_WIDTH` (7) chars + card area (`INNER_WIDTH + 2` = 22 chars)
- Connector area sits LEFT of each card
- Vertical trunk (`│`) in connector area stacks across outer loop iterations (different rows) at the same character column → continuous vertical line
- Horizontal branches (`───`) on center line connect junction to card

### What vertical mode needs

- **Outer loop:** `cols` (vertical axis — tree depth flows top to bottom)
- **Inner loop:** `rows` (horizontal axis — forks spread left to right)
- Fork connections must span horizontally across multiple inner positions
- The trunk connecting fork positions must be a continuous horizontal line

### The core problem

In horizontal mode, the outer loop handles the fork dimension. Each connector's vertical pipe at the same `col` position in successive rows creates a continuous vertical line because they share the same character column.

In vertical mode, the fork dimension is the inner loop. Adjacent cells in the inner loop are side by side with card areas between them. A connector's horizontal dash in cell N can't reach cell N+1 because the card area of cell N (22 chars of space) sits between them.

---

## Approach: Vertical connector spans through card areas

In vertical mode, connectors between fork positions need to pass through the card areas of intermediate empty cells. When a cell has no beat but is part of a fork span, its card area should show the horizontal trunk line (`─` characters at the center line position) instead of blank space.

### Implementation

Inside the `gridLines` useMemo, keep the existing `renderCell` function for horizontal mode but remove the rotation logic. Add a separate vertical rendering path:

1. **Compute a vertical connector map.** Before building text lines, scan all beats to determine which (col, row) positions need horizontal pass-through lines. For each col that has fork connections (children at different rows from their parent):
   - Identify the row span (min fork row to max fork row)
   - Every (col, row) position in that span that has NO beat card should render a horizontal pass-through line at the center line position

2. **Build vertical grid lines.** Outer loop = `cols`, inner loop = `rows`. For each cell:
   - **Connector area (7 chars):** In vertical mode, the connector sits LEFT of the card just like horizontal mode. But now it shows connections between the current depth and the previous depth:
     - `hasUp`: this cell's beat has a parent at col-1 (previous depth, above)
     - `hasDown`: not used in the connector area for vertical (depth connections go up, not down in the connector)
     - For vertical mode, the connector area should show a vertical pipe going up if the beat has a parent at a different row, and horizontal dashes if it's part of the fork span at the parent's depth
   - **Card area (22 chars):** If the cell has a beat, render the card normally. If the cell has no beat but is in a fork span, render horizontal `─` pass-through at the center line

3. **Vertical connector between depth levels.** Between each depth level (between outer loop iterations), render connector rows. These rows show vertical pipes (`│`) dropping from parent cards down to child cards. For each row position:
   - If a beat at (col+1, row) has a parent at (col, parentRow), show a vertical pipe at this row position

### Simpler alternative: connector rows between depth bands

Instead of trying to embed connectors in the card area, add explicit connector rows between depth bands:

- For each depth transition (col N to col N+1), insert `CONNECTOR_HEIGHT` text lines between the card bands
- These connector lines use the full width of the inner axis
- Each position in the connector line either shows `│` (vertical pipe dropping from parent to child), `─` (horizontal trunk spanning fork positions), or a junction character
- This avoids modifying card rendering at all — cards are always `[connector][card]` horizontally, and connector rows handle depth-to-depth connections vertically

**Use this simpler approach.** It separates concerns cleanly: horizontal cell layout handles fork-position arrangement, vertical connector rows handle depth connections.

### Detailed structure for the simpler approach

For vertical mode, the grid alternates between **card bands** and **connector bands**:

```
[card band for col 0]        ← inner loop across rows, each cell = [empty connector area][card or empty]
[connector band col 0→1]     ← CONNECTOR_HEIGHT lines showing vertical pipes and horizontal fork trunks
[card band for col 1]        ← inner loop across rows
[connector band col 1→2]     ← ...
[card band for col 2]
...
```

**Card band** (same as current, no rotation): For each `lineIdx` in `0..cardLines+GAP_LINES`, loop across `rows`. Each cell renders with a blank 7-char connector area (no directional info needed since connections are in the connector bands) and the card box if a beat exists.

**Connector band** (new, `CONNECTOR_HEIGHT` lines, suggest 3): For each line in the band, loop across `rows`. At each row position:
- Check if any beat at (nextCol, row) has a parent at (prevCol, parentRow) — meaning a vertical connection drops here
- Check if this row is within the horizontal fork span for this col transition
- Render: `│` for vertical drops, `─` for horizontal trunk, junction chars at intersections, spaces elsewhere
- The connector band width per inner position should match `CELL_WIDTH` (connector area + card area = 29 chars) so everything aligns

The connector band doesn't use `connectorInfo` or `junctionChar` from the horizontal path. Write a new function `verticalConnectorChar(prevCol, row, lineIdx)` that computes what to draw.

---

## Constraints

- Do not change the horizontal rendering path. It works correctly.
- Do not change the `BeatNode` data model or any mutation functions.
- Do not change key handlers, mode switching, or scroll logic — those already work for both directions.
- The `focusedOverlay` and `focusedHighlight` calculations need to account for the inserted connector bands in vertical mode (they add extra lines between depth levels, shifting card positions down).
- `connectorInfo` and `junctionChar` remain available for horizontal mode. Write separate logic for vertical connector bands.
- Keep `renderCell` as a shared helper for card rendering (borders, text wrapping, labels). Only the connector part differs.
- `direction` state, `scrollToFocused`, and arrow key remapping already work — do not modify them.

## Acceptance Criteria

1. Horizontal mode renders identically to before (no regression)
2. Vertical mode: tree depth flows top to bottom, forks spread left to right
3. Vertical mode: fork connections show continuous horizontal trunk lines with no gaps
4. Vertical mode: vertical pipes connect parent cards to child cards across depth levels
5. Vertical mode: junction characters are correct at intersections
6. Focused beat highlight and TextInput overlay position correctly in vertical mode
7. App compiles without errors (`npx tsc --noEmit -p apps/mobile/tsconfig.json`)
