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
- `universe/[id].tsx`: binder shows flat entity list. Type picker (Character / Location / Note) on + tap. Entity rows with accent bar + bg tint. Manual sort via DraggableFlatList.
- `CharacterEditor.tsx`: holistic text model, FieldBlocks with autocomplete suggestions (keyboard arrow-key navigation), random generator (⚄), toolbar actions (+ Field, Fields, + Note, convert, sort). **Known iPad issues — see Deferred.**
- `EntityEditor.tsx`, `GroupEditor.tsx`: delete + two-step inline confirmation.
- DESIGN.md: fully updated. "Lenses, Not Containers" foregrounded. Four binder modes designed: Everything, File, Publishing, Board. Bible as entity type specified. Staging area, perspectives, folder deletion dialog, depth control, Publishing mode all specified. Content model section added: entity pages as nested documents, block types (text, field, note, script) as universal atoms, promotion-from-selection pattern, starter fields as prompts. Dossier clarified as freeform spatial canvas (v1 = linear scroll; target = infinite canvas with coordinates on every item). Block types valid in any entity page including script blocks.

## Next Step
iPad polish pass — work through the full list in Deferred below.

---

## Deferred
- `packages/types` shared package — wait until schema is written, then extract shared interfaces
- `apps/api/.env` is gitignored — Neon DATABASE_URL must be re-entered if repo is cloned fresh
- Rename "Universe" → "World" in codebase — spec uses "Universe" now confirmed; codebase matches

### iPad Polish (full list)

**CharacterEditor toolbar**
- Delete is `colors.faint` text — not a recognizable button; make it a proper bold button with visual weight
- + Field, + Note, Fields, → Note/→ Text too small and text-link styled — make them proper button components with clear demarcation
- ⚄ random field too small — needs a larger tap target
- All toolbar items crowded in a single `minHeight: 44` row — needs more breathing room

**CharacterEditor blocks**
- Field and note block × delete button too small (fontSize 16, pl-3 only) — increase tap target
- `Delete? Yes / No` inline confirm is `text-xs` — nearly unreadable
- Autocomplete blur timer (150ms) may dismiss suggestions before tap registers on iPad — increase or restructure

**CharacterEditor header**
- Color swatches are 22×22px — marginal touch target

**Binder**
- Collapsed binder strip is 22px wide — nearly untappable; widen or replace with a gesture
- Two-finger swipe right on content area → open binder; two-finger swipe left on binder → close binder
- "Sort" in binder header has no button affordance

**Top bar**
- Replace "← Universes" with universe name as the prominent element; use a small `‹` or "All" for the back action
- Remove hardcoded `● Saved` from top bar; move CharacterEditor's live save state indicator into the top bar so there is exactly one save indicator in one consistent location

**Safe area**
- Bottom of app is clipped above home bar — use `edges={['top']}` on SafeAreaView so background fills to true screen edge

**Navigation**
- Back-to-universes animation slides right (back feel) — should slide left (forward feel); configure stack animation

**Keyboard navigation (hardware keyboard)**
- Tab does nothing useful in the character editor — intercept Tab in `onKeyPress` to move focus to next block, Shift+Tab for previous block

**Gesture legend**
- No gesture/shortcut reference anywhere — add a `?` button in the chrome that shows a popover listing available gestures and keyboard shortcuts

**Universe dashboard**
- No way to delete a universe — add `DELETE /api/universes/:id` server route (client already has `api.universes.delete`), plus long-press → confirm affordance on universe cards

**Error handling**
- `handleCreate` in `universe/[id].tsx` silently swallows entity creation errors — add visible error state
- Block saves fail silently (`.catch(() => {})`) — save state dot returns to Saved even on failure
---

## Active Decisions
- ORM: Drizzle (schema is TypeScript, easy to change)
- Hosting: Railway (API + Postgres), Cloudflare Pages (web), Cloudflare R2 (files)
- Monorepo: npm workspaces — Metro already configured with watchFolders
- Mockups: Expo screens in `apps/mobile/app/mockups/` (not HTML), so they're directly portable
- Auth: JWT (email + password). OAuth deferred to v2.
- Sync: REST polling, last-write-wins. Yjs CRDT deferred to v2.
- Script editor: custom rich text engine, ProseMirror adapter. Single component, iPad + web.
- Drawing canvas: React Native Skia, iPad only in v1.

---

## Sprint Position
Pivoted from sprint-by-feature model. Focus: make the universe workspace feel real and usable before deepening individual features.

| Phase | Deliverable |
|-------|-------------|
| ✅ Foundation | Expo monorepo, NativeWind, Expo Router, auth, Drizzle schema, workspace shell |
| ✅ Script editor | Block-based editor, Final Draft visual style, block CRUD API |
| ✅ Entity list + editor | Flat entity list in binder, freeform text editor, persists to DB |
| ✅ Railway + iPad | API on Railway, EAS build, app running on iPad |
| Next | CharacterEditor iPad polish (tappable autocomplete, button sizing) |
| After | Global chrome (top bar), Universe Home screen |
| After | Bible entity types (structured fields for characters, locations) |
| After | Binder full feature set (search, sections, tear-off) |
| Later | Storyboard canvas (Skia), Timeline tool, Collaboration, Export |
