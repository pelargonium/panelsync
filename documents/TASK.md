# Task: Workspace Shell — Persistent Universe Screen + Shared State

**Status:** ready for Codex
**Assigned to:** Codex
**Reference:** `documents/DESIGN.md` (read in full before starting)

---

## Objective

Transform the universe screen from a self-contained component with local state into a persistent workspace shell. Three parts:

1. **Schema** — add `workspace_state` table, run migration
2. **API** — add workspace state endpoints
3. **Mobile** — build `UniverseContext`, refactor `universe/[id].tsx` to use it, replace modals with inline creation

---

## Files to Change

1. `apps/api/src/db/schema.ts` — add `workspaceState` table
2. `apps/api/src/routes/containers.ts` — add workspace state routes
3. `apps/mobile/context/UniverseContext.tsx` — create new file
4. `apps/mobile/app/universe/[id].tsx` — refactor to use context, inline creation

---

## Files NOT to Touch

- `apps/api/src/routes/auth.ts`
- `apps/api/src/plugins/auth.ts`
- `apps/api/src/db/client.ts`
- `apps/api/drizzle.config.ts`
- `apps/api/.env`
- `apps/api/src/index.ts`
- `apps/mobile/app/auth.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/lib/api.ts`
- `apps/mobile/theme.ts`
- `apps/mobile/entities/` (any file in this folder)
- `apps/mobile/components/`
- `apps/mobile/types.ts`
- `documents/DESIGN.md`
- `documents/CONCEPT.md`
- `documents/OPEN_QUESTIONS.md`
- `CLAUDE.md`
- Anything in `apps/mobile/app/mockups/`

---

## Constraints

- All new API routes auth-protected via `server.addHook` or per-route hook
- All data operations verify universe membership before executing
- Use Drizzle ORM only — no raw SQL except in generated migration files
- Do not add features, error boundaries, analytics, or anything not described in this brief
- Do not refactor entity components (CharactersEntity, etc.) — they are used as-is
- NativeWind `className` for any new layout in the mobile app — not new StyleSheet blocks
- Existing StyleSheet styles in `universe/[id].tsx` may be kept or replaced — do not import them into new files

---

## Part 1 — Schema: `workspace_state` Table

Add to `apps/api/src/db/schema.ts`:

```ts
export const depthStateEnum = pgEnum('depth_state', [
  'entity_only',
  'split',
  'dossier_only',
]);

export const workspaceState = pgTable('workspace_state', {
  id:               uuid('id').primaryKey().defaultRandom(),
  universeId:       uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId:           uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  activeEntityType: text('active_entity_type'),
  activeEntityId:   uuid('active_entity_id'),
  depthState:       depthStateEnum('depth_state').notNull().default('entity_only'),
  binderOpen:       boolean('binder_open').notNull().default(true),
  warmContexts:     jsonb('warm_contexts').notNull().default([]),
  updatedAt:        timestamp('updated_at').notNull().defaultNow(),
});
```

After updating schema, from `apps/api/` run:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

## Part 2 — API: Workspace State Routes

Add to `apps/api/src/routes/containers.ts`.

### GET /api/workspace-state

Query param: `universeId` (required).

Returns the workspace state row for the current user + universe. If no row exists, return a default state object (do not insert on GET).

Response:
```json
{
  "data": {
    "activeEntityType": null,
    "activeEntityId": null,
    "depthState": "entity_only",
    "binderOpen": true,
    "warmContexts": []
  }
}
```

### PUT /api/workspace-state

Body:
```ts
{
  universeId: string;
  activeEntityType?: string | null;
  activeEntityId?: string | null;
  depthState?: 'entity_only' | 'split' | 'dossier_only';
  binderOpen?: boolean;
  warmContexts?: Array<{ entityType: string; entityId: string; depthState: string }>;
}
```

Upserts — insert if no row exists for this user+universe, update if it does. Returns the updated row as `{ data: { ...state } }`.

Add both routes inside the existing `containersRoutes` function. Both require auth.

---

## Part 3 — Mobile: `UniverseContext`

Create `apps/mobile/context/UniverseContext.tsx`.

### Context shape

```ts
interface WarmContext {
  entityType: string;
  entityId: string;
  depthState: 'entity_only' | 'split' | 'dossier_only';
}

interface UniverseContextValue {
  // Universe identity
  universeId: string;
  universeName: string;

  // Hierarchy
  hierarchyLevels: ApiHierarchyLevel[];

  // Containers — flat list of all containers in the universe
  containers: ApiContainer[];
  loadingContainers: boolean;
  refreshContainers: () => Promise<void>;

  // Pages per container — loaded lazily on first expand
  pagesByContainer: Record<string, ApiPage[]>;
  loadPages: (containerId: string) => Promise<void>;
  addPage: (containerId: string, page: ApiPage) => void;

  // Workspace navigation state
  binderOpen: boolean;
  setBinderOpen: (open: boolean) => void;
  activeEntityType: string | null;
  activeEntityId: string | null;
  depthState: 'entity_only' | 'split' | 'dossier_only';
  activateEntity: (type: string, id: string) => void;
  cycleDepthState: () => void;
  warmContexts: WarmContext[];

  // Creation
  createContainer: (levelId: string, parentId: string | null, name: string) => Promise<ApiContainer>;
  createPage: (containerId: string) => Promise<ApiPage>;
}
```

### Behavior

**On mount:**
1. Fetch hierarchy levels: `GET /api/hierarchy?universeId=`
2. Fetch all containers: `GET /api/containers?universeId=`
3. Fetch workspace state: `GET /api/workspace-state?universeId=`
4. Restore `binderOpen`, `activeEntityType`, `activeEntityId`, `depthState`, `warmContexts` from the fetched state

**`loadPages(containerId)`:**
- If `pagesByContainer[containerId]` already exists, return immediately (no re-fetch)
- Otherwise fetch `GET /api/containers/:containerId/pages` and store result

**`addPage(containerId, page)`:**
- Appends page to `pagesByContainer[containerId]` in memory without re-fetching

**`activateEntity(type, id)`:**
- Sets `activeEntityType` and `activeEntityId`
- Sets `depthState` to `'entity_only'` if this is a new entity (not the currently active one)
- If re-activating the same entity, preserve current `depthState`
- Updates `warmContexts`: prepend `{ entityType: type, entityId: id, depthState: current }`, deduplicate by entityId, cap at 10 entries
- Persists to API: `PUT /api/workspace-state` — debounced 800ms

**`cycleDepthState()`:**
- Cycles: `entity_only` → `split` → `dossier_only` → `entity_only`
- Updates `depthState` in state and persists to API (debounced 800ms)

**`setBinderOpen(open)`:**
- Updates `binderOpen` and persists to API (debounced 800ms)

**`createContainer(levelId, parentId, name)`:**
- Calls `api.containers.create({ universeId, levelId, parentId, name })`
- Appends result to `containers` array
- Returns the new container

**`createPage(containerId)`:**
- Calls `api.containers.createPage(containerId)`
- Calls `addPage(containerId, result)`
- Returns the new page

Export a `UniverseProvider` component and a `useUniverse` hook.

```ts
export function useUniverse() {
  const ctx = useContext(UniverseContext);
  if (!ctx) throw new Error('useUniverse must be used within UniverseProvider');
  return ctx;
}
```

---

## Part 4 — Mobile: Refactor `universe/[id].tsx`

### What changes

1. **Wrap in UniverseProvider** — the screen provides context to all child components
2. **Remove all local state that moves to context** — `seriesList`, `loadingSeries`, `binderOpen`
3. **Replace modals with inline creation** — `NewSeriesModal` and `NewIssueModal` are removed; creation happens inline in the binder tree
4. **Content area renders from context** — based on `activeEntityType`/`activeEntityId`
5. **Page script icon** — taps `activateEntity('page', page.id)` instead of `router.push`

### Inline creation pattern

For series (top-level containers) and issues (child containers):

When the user taps `+` next to a section header or series row, an inline `TextInput` appears at the bottom of that section's list, auto-focused. The user types a name and hits return (or taps a small `✓` button) to create. Tapping away or pressing Escape cancels without creating.

Implementation: a boolean state flag `isAddingChild` per row / per section. When true, render a `TextInput` row in place of the `+` button area. On submit, call `context.createContainer(...)`. On blur without submit, cancel.

For pages, no name is needed — the existing `+` button behavior is fine (tap = create immediately).

### Content area

Replace `MainContent` with a component that reads from context:

```tsx
function ContentArea() {
  const { activeEntityType, activeEntityId, depthState, universeName } = useUniverse();

  if (!activeEntityType || !activeEntityId) {
    return <EmptyContent universeName={universeName} />;
  }

  // For now: entity sections (characters, locations, timeline, notes)
  // Page activation will open the script editor (future task)
  if (activeEntityType === 'section') {
    return <SectionContent sectionKey={activeEntityId} />;
  }

  return <EmptyContent universeName={universeName} />;
}
```

`SectionContent` renders the existing entity components (CharactersEntity, LocationsEntity, TimelineEntity, NotesEntity) based on `sectionKey`. Keep the same `Universe` object construction as before.

Section activation: tapping CHARACTERS in the binder calls `activateEntity('section', 'characters')`. Same for locations, timeline, notes.

### Double-tap for depth cycling

Binder items support double-tap to cycle depth state:
- Use a tap timestamp ref to detect double-tap (two taps within 300ms)
- Single tap: `activateEntity(type, id)`
- Double tap: `cycleDepthState()`

Apply this to series rows and issue rows. Page rows only have single tap (activates the page).

### Split view (depth_state = 'split')

When `depthState === 'split'`, the content area renders two panels side by side:
- Left panel (flex: 1): primary content (entity or script placeholder)
- Right panel (flex: 1): dossier placeholder — `<View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.faint, fontSize: 13 }}>Dossier</Text></View>`

When `depthState === 'dossier_only'`, render only the dossier placeholder full-width.

This is a stub — the real dossier UI ships in a later sprint. The infrastructure (depth state cycling, split layout) ships now.

### SeriesRow and IssueRow

Update to use context instead of local API calls:

- `SeriesRow`: get issues from `containers` filtered by `parentId === series.id` — no lazy fetch needed since all containers are loaded upfront
- `IssueRow`: get pages from `context.pagesByContainer[issue.id]` — call `context.loadPages(issue.id)` on first expand
- Both rows: add double-tap detection for `cycleDepthState`
- `IssueRow`: page script icon tap calls `context.activateEntity('page', page.id)` instead of `router.push`

---

## Migration Steps

After updating schema:
```bash
cd apps/api
npx drizzle-kit generate
npx drizzle-kit migrate
npx tsx src/index.ts   # verify server starts
```

---

## Acceptance Criteria

- [ ] `workspace_state` table exists in schema and Neon
- [ ] `GET /api/workspace-state?universeId=` returns state or default (auth required)
- [ ] `PUT /api/workspace-state` upserts state (auth required)
- [ ] `UniverseContext.tsx` exists and exports `UniverseProvider` and `useUniverse`
- [ ] Universe screen loads containers and hierarchy levels from API on mount
- [ ] Universe screen restores binder open/closed state and active entity from API on mount
- [ ] Navigation state persists to API on change (debounced)
- [ ] Series list renders from context containers (no local series state)
- [ ] Issues render from context containers filtered by parentId (no local issues state)
- [ ] Pages load lazily on first expand via `context.loadPages`
- [ ] Inline creation works for series and issues — no modals
- [ ] Tapping a binder section (Characters, Locations, etc.) opens it in the content area
- [ ] Double-tap on a series or issue row cycles depth state
- [ ] `depthState === 'split'` shows two-panel content area with dossier placeholder
- [ ] `depthState === 'dossier_only'` shows dossier placeholder full-width
- [ ] App compiles without TypeScript errors
- [ ] No regressions on auth, universe dashboard, or universe creation

---

## Completion Note (Codex fills in before handing back)

**Status:** ___
**Files changed:** ___
**Migration file:** ___
**Verification run:** ___
**Open risks / assumptions:** ___
