# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/universe/[id]`.
- API deployed to Railway at `https://panelsyncapi-production.up.railway.app`. Neon DATABASE_URL and JWT_SECRET set as Railway env vars. Railway runs `npm run build && npm run start` via `railway.json` (fixes stale dist/ problem).
- Schema: 24 tables. `bible_entries` renamed to `entities`, `bibleEntryTypeEnum` → `entityTypeEnum` (added 'bible' and 'folder' values), `dossier_attachments.entity_type` value `'bible_entry'` → `'entity'`. New tables: `tags`, `entity_tags`, `entity_memberships`, `boards`, `board_members`, `perspectives`. `workspace_state` has `stagingArea jsonb` and `everythingDepth text` fields. Migrations 0005–0007 applied to Neon.
- Entity routes: `/api/universes/:id/entities`, `/api/entities/:id`, `/api/entities/:id/content`. All auth-gated.
- Real auth: `POST /api/auth/register` and `POST /api/auth/login` with scrypt + JWT.
- Workspace state routes: `GET /api/workspace-state`, `PUT /api/workspace-state` — per-user per-universe nav persistence.
- Block CRUD API: `GET/POST /api/pages/:pageId/blocks`, `PATCH/DELETE /api/pages/:pageId/blocks/:blockId`.
- EAS configured: `eas.json` has preview profile with `EXPO_PUBLIC_API_URL` baked in. iPad UDID registered, provisioning profile covers device. App installs and runs on iPad.
- `UniverseContext.tsx`: fetches entity list + workspace state in parallel on mount. Entity CRUD: createEntity, deleteEntity, updateEntityName.
- **Minimal UI strip (step 1 complete):** ThemeContext with light/dark toggle, monospace font, minimal palette (bg, text, muted, border, selection, error). ErrorBoundary wraps editor panel. Dashboard, workspace, EntityEditor, GroupEditor all stripped to functional minimalism. No silent `.catch(() => {})` — save failures surface as 'error' state. DraggableFlatList and PanGestureHandler removed from workspace. Binder shows flat entity list with type labels (C/L/N/G).
- **Unified editor (step 5 complete):** `Editor.tsx` replaces CharacterEditor, EntityEditor, and GroupEditor. One editor for all entity types — block model (text/field/note) available on every entity. Entity type is a display label, not a behavior gate. bodyText-to-block auto-migration: entities with bodyText but no blocks get a text block created on first open. Members section shown for groups. All CharacterEditor features (sort, field suggestions, autocomplete, convert, random field) available to all entity types. Old editors deleted.
- **Editor keyboard flow (step 6 complete):** Tab/Shift+Tab navigates between blocks (wraps to name input at boundaries). Cmd+Enter creates new text block below focused block, Cmd+Shift+Enter above. Cmd+Backspace triggers inline "delete block? y/n" confirmation with keyboard response. Escape deselects block and blurs input. Focus indicator: 2px left border on active block (error-red during delete confirmation). All via `document.addEventListener('keydown')` with `useRef` handler pattern (web only).
- **File mode binder (step 3 complete):** `Binder.tsx` component replaces inline flat entity list. Auto type sections (Characters, Locations, Notes, Groups) — collapsible, default open. Curated folders at top level via `buildFolderTree()` using entity_memberships. Recursive `FolderContents` for arbitrary nesting depth. Folder/group expand/collapse with v/> indicators. Create picker includes folder type. `[id].tsx` workspace simplified from 295 to 185 lines — all binder logic moved to Binder component.
- **Binder keyboard nav (step 4 complete):** Full keyboard navigation on web. Flat `navItems` list computed from binder tree for consistent Up/Down traversal. Arrow keys move focus (left border indicator), Enter opens entity, Right/Left expand/collapse sections and folders (Left also jumps to parent). Type-to-filter: any printable key opens filter input, live-filters entities by name. Cmd+N opens create picker (arrow-navigable), Cmd+Shift+N creates folder. F2 renames inline. Delete/Cmd+Backspace triggers inline "y/n" delete confirm. Escape context-chains: clear filter → deselect. App-level: Cmd+B toggles binder, Cmd+D toggles dark/light. All via stable `useRef` handler pattern to avoid stale closures.
- DESIGN.md: fully updated. "Lenses, Not Containers" foregrounded. Four binder modes designed: Everything, File, Publishing, Board. Bible as entity type specified. Staging area, perspectives, folder deletion dialog, depth control, Publishing mode all specified. Content model section added: entity pages as nested documents, block types (text, field, note, script) as universal atoms, promotion-from-selection pattern, starter fields as prompts. Dossier clarified as freeform spatial canvas (v1 = linear scroll; target = infinite canvas with coordinates on every item). Block types valid in any entity page including script blocks.

## Next Step
Add @-mention linking: autocomplete in text blocks triggered by @, creates entity_link dossier attachment.

---

## Direction: Keyboard-First Minimal Prototype

**Goal:** Get the app to a place where it feels good to brainstorm — create entities, organize them, connect them, generate content rapidly. Not scripts yet. World-building.

**Approach:**
- Strip all visual decoration. Monospace font, no icons, no color except state (selected, active, saved/unsaved). Dark mode from the start (light/dark toggle).
- File mode binder as the primary navigation surface, keyboard-navigable.
- Keyboard shortcuts are core UX, designed alongside every feature.
- Build the creation environment first (File mode). Generate real content. Then build the discovery environment (Everything mode) and test it against real data.

**Minimum visible UI:**
- Top: universe name (left), save state (right)
- Left panel: binder — filter field, collapsible type sections, curated folders with nesting, selection highlight
- Right panel: editor — entity name, blocks with type labels, focus indicator on active block
- Bottom: "Cmd+/ for shortcuts" hint
- Rows ~44pt for tap fallback. No toolbar, no icons, no chrome beyond this.

### Keyboard Map

**Focus**
- Escape — context-dependent retreat (dismiss autocomplete → deselect block → focus binder → clear filter → collapse folder)
- Cmd+B — toggle binder
- Cmd+K — quick switcher (fuzzy search, Enter to jump)

**Binder (when focused)**
- Up/Down — move selection
- Enter — open selected entity in editor
- Right — expand folder/section
- Left — collapse folder/section, or select parent
- Start typing — live filter
- Escape — clear filter, or deselect
- Cmd+N — new entity (inline type picker, name field, Enter to create)
- Cmd+Shift+N — new folder
- Delete/Cmd+Backspace — delete selected (inline y/n confirm)
- F2 — rename selected inline

**Editor (when focused)**
- Tab/Shift+Tab — next/previous block
- Cmd+Enter — new block below
- Cmd+Shift+Enter — new block above
- Cmd+Backspace — delete block (inline confirm)
- @ — entity mention autocomplete
- / — block type picker (at start of empty block)
- Cmd+Shift+T — cycle block type
- Escape — deselect block, focus binder

**App-level**
- Cmd+D — toggle dark/light
- Cmd+S — force save
- Cmd+/ — shortcut reference

### Build Sequence

1. ~~**Strip + dark mode**~~ ✅ — ThemeContext, minimal palette, monospace, ErrorBoundary, no silent failures
2. ~~**Strip CharacterEditor**~~ ✅ — migrated to minimal theme, same block model
3. ~~**File mode binder**~~ ✅ — auto type sections (Characters, Locations, Notes, Groups), curated folders via entity_memberships, recursive nesting, depth indentation, Binder component extracted
4. ~~**Binder keyboard nav**~~ ✅ — arrow keys, Enter, expand/collapse, type-to-filter, Cmd+N, F2 rename, Delete confirm, Cmd+B/D app shortcuts
5. ~~**Unified editor**~~ ✅ — Editor.tsx replaces all three editors. Block model on all entity types. bodyText auto-migration. Members section for groups.
6. ~~**Editor keyboard flow**~~ ✅ — Tab/Shift+Tab, Cmd+Enter/Cmd+Shift+Enter, Cmd+Backspace with confirm, Escape deselect, focus indicator
7. **@-mention linking** — autocomplete in text blocks, creates entity_link dossier attachment
8. **Generate real content** — use the app to brainstorm a world
9. **Everything mode** — flat view, strip folder context, see what the unstructured pile looks like

---

## Deferred
- `packages/types` shared package — wait until schema is written, then extract shared interfaces
- `apps/api/.env` is gitignored — Neon DATABASE_URL must be re-entered if repo is cloned fresh
- Rename "Universe" → "World" in codebase — spec uses "Universe" now confirmed; codebase matches
- iPad visual polish (tap targets, button styling, color swatches, toolbar layout) — revisit after keyboard-first prototype validates the interaction model
- Gesture navigation (two-finger swipe for binder toggle) — deferred, keyboard handles this
- Storyboard canvas, Timeline tool, Collaboration, Export — later phases
- API route splitting (containers.ts) — do when touching those routes next
- API input validation (Typebox) — apply as routes are modified
- Test infrastructure (Vitest + supertest) — set up with first route refactor

---

## Active Decisions
- ORM: Drizzle (schema is TypeScript, easy to change)
- Hosting: Railway (API + Postgres), Cloudflare Pages (web), Cloudflare R2 (files)
- Monorepo: npm workspaces — Metro already configured with watchFolders
- Auth: JWT (email + password). OAuth deferred to v2.
- Sync: REST polling, last-write-wins. Yjs CRDT deferred to v2.
- UI: functional minimalism, monospace, dark/light mode, keyboard-first
- Editor: one unified editor for all entity types. Block types (text, field, note) available on any entity. Entity type is a starting label, not a capability gate.
- Members: any entity can have a members section. Memberships carry a freeform `role` label (leader, father, ally, etc.) — members section groups by role. Hierarchy is semantic, not structural. (`role` column on `entity_memberships` deferred — current members section is flat list, groups only.)
- Script editor: deferred until world-building loop feels good
- Drawing canvas: React Native Skia, deferred

---

## Sprint Position
Pivoted from feature sprints to interaction-first prototyping. Build the keyboard-first brainstorming loop, validate with real content, then layer visual design and additional features.

| Phase | Deliverable |
|-------|-------------|
| ✅ Foundation | Expo monorepo, NativeWind, Expo Router, auth, Drizzle schema, workspace shell |
| ✅ Script editor | Block-based editor, Final Draft visual style, block CRUD API |
| ✅ Entity list + editor | Flat entity list in binder, freeform text editor, persists to DB |
| ✅ Railway + iPad | API on Railway, EAS build, app running on iPad |
| Next | Minimal UI strip + dark mode + File mode binder + keyboard navigation |
| After | @-mention linking, quick switcher, editor keyboard flow |
| After | Generate real content, evaluate, build Everything mode |
| Later | Visual design pass, Publishing mode, script editor integration |
| Later | Storyboard canvas (Skia), Timeline tool, Collaboration, Export |
