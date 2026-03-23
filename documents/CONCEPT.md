# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/universe/[id]`.
- Revised Drizzle schema: 18 tables. Flexible publication hierarchy via `hierarchy_levels` + `containers` (replaces hardcoded series/issues). Dossier foundation: `dossier_attachments`, `dossier_canvas_state`. Supporting: `drafts`, `files`, `events`, `workspace_state`. Removed 9 tables (series, issues, panels, storyboard_pages, bible_entry_images, bible_entry_series_overlays, note_folders, asset_timeline_tags, pinned_items).
- Real auth: `POST /api/auth/register` and `POST /api/auth/login` with scrypt + JWT.
- Container routes at `/api/containers`, `/api/hierarchy`, `/api/drafts`, `/api/pages`. All auth-gated, universe-membership-checked.
- Workspace state routes: `GET /api/workspace-state`, `PUT /api/workspace-state` — per-user per-universe nav persistence.
- Bible API: `GET/POST /api/universes/:id/bible`, `GET/PATCH /api/bible/:id`, `PATCH /api/bible/:id/content`, `DELETE /api/bible/:id`. Backed by `bible_entries` + `dossier_attachments` (type='text'). All auth-gated.
- `UniverseContext.tsx`: fetches entity list + workspace state in parallel on mount. Entity CRUD: createEntity, deleteEntity, updateEntityName. pagesByContainer/loadPages shims kept for ScriptEditor typecheck compatibility.
- `universe/[id].tsx`: binder shows flat entity list only (no hierarchy). Binder header: universe name + Sort + + + collapse. Sort picker (A-Z / Type / Recent). Type picker (Character / Location / Note) on + tap. Entity rows: border-bottom demarcation, left accent bar + bg tint on active row, type color dot. Manual sort mode (DraggableFlatList) with position stored on bible_entries. Delete removed from binder rows — now lives in entity editors only.
- `EntityEditor.tsx`, `CharacterEditor.tsx`, `GroupEditor.tsx`: delete button + confirmation at bottom of editor. Two-step confirm: tap Delete → "Delete? Yes / No" inline.
- Script editor: `ScriptEditor.tsx` still present. Final Draft-style visual design. Not currently routed to from the new binder (hierarchy removed), but component is intact.
- Block CRUD API: `GET/POST /api/pages/:pageId/blocks`, `PATCH/DELETE /api/pages/:pageId/blocks/:blockId`.
- All migrations applied to Neon including 0004 (bible_entries.position real column).
- CharacterEditor: holistic text model — TextBlocks have no delete button (select+backspace to delete). Deleting a field/note between two text blocks auto-merges them. Trailing InsertZone appends at true end. New character creation auto-focuses name input. Toolbar: + Field, Fields, + Note, → Note/→ Text (convert), ⚄, sort (Document/Type/A–Z).
- Groups: bible entries with type='group'. Membership stored in dossier_attachments. Binder shows expandable group rows. GroupEditor: name, color, body, members list + add/remove. NOTE: groups are scaffolding — the binder will be redesigned per the four-mode model before groups are built out further.
- `GestureHandlerRootView` moved to `_layout.tsx` (app root). `import 'react-native-gesture-handler'` side-effect import added. `activationDistance={0}` on DraggableFlatList. DnD trigger uses `TouchableOpacity` from gesture handler. Web DnD fix applied — browser testing still needed to confirm.
- DESIGN.md: major update. "Lenses, Not Containers" section added and foregrounded. Four binder modes fully designed: Everything (canonical base reality), File (structured lens with auto-generated type folders + user-created curated folders), Publishing (production hierarchy lens), Board (drag-to-build named panels, replaces "Workspace" mode name). Staging area, perspectives, folder deletion behavior all specified.
- CLAUDE.md: "Lenses, Not Containers" read directive added to session start checklist.

## Next Step
Deploy the API to Railway so the app can be tested on iPad with real persistence.

---

## Deferred
- `packages/types` shared package — wait until schema is written, then extract shared interfaces
- `apps/api/.env` is gitignored — Neon DATABASE_URL must be re-entered if repo is cloned fresh
- Rename "Universe" → "World" in codebase — spec uses "Universe" now confirmed; codebase matches
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
| Next | Deploy to Railway + EAS build → iPad |
| After | Global chrome (top bar), Universe Home screen |
| After | Bible entity types (structured fields for characters, locations) |
| After | Binder full feature set (search, sections, tear-off) |
| Later | Storyboard canvas (Skia), Timeline tool, Collaboration, Export |
