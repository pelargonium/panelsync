# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/universe/[id]`.
- Revised Drizzle schema: 18 tables. Flexible publication hierarchy via `hierarchy_levels` + `containers` (replaces hardcoded series/issues). Dossier foundation: `dossier_attachments`, `dossier_canvas_state`. Supporting: `drafts`, `files`, `events`, `workspace_state`. Removed 9 tables (series, issues, panels, storyboard_pages, bible_entry_images, bible_entry_series_overlays, note_folders, asset_timeline_tags, pinned_items).
- Real auth: `POST /api/auth/register` and `POST /api/auth/login` with scrypt + JWT.
- Container routes at `/api/containers`, `/api/hierarchy`, `/api/drafts`, `/api/pages`. All auth-gated, universe-membership-checked.
- Workspace state routes: `GET /api/workspace-state`, `PUT /api/workspace-state` — per-user per-universe nav persistence.
- `UniverseContext.tsx`: shared React context. On mount fetches hierarchy levels, containers, and workspace state in parallel. Restores full nav state. Saves state debounced 800ms on every nav change. Lazy page loading cached by containerId. Inline container/page creation methods.
- `universe/[id].tsx`: persistent workspace shell. Wraps in UniverseProvider. No local series/issues state. Inline creation (no modals). Double-tap depth cycling. ContentArea renders entity_only / split / dossier_only layouts.
- Script editor: `ScriptEditor.tsx` component. Issue-scoped continuous scroll across all pages. Final Draft-style visual design: panel blocks as dividers, Courier New monospace throughout, dialogue indented, caption with left border, SFX large. Enter advances with smart defaults (panel→scene→desc→dlg), Tab cycles type, type toolbar on focus. Auto-save 500ms per block, block CRUD, scroll-to-page on binder tap.
- Block CRUD API: `GET/POST /api/pages/:pageId/blocks`, `PATCH/DELETE /api/pages/:pageId/blocks/:blockId`.
- Mobile API client updated: `ApiHierarchyLevel`, `ApiContainer`, `ApiDraft` types. `api.hierarchy`, `api.containers`, `api.drafts` objects. Backward-compat shims for `api.series` and `api.issues`.
- All three migrations applied to Neon: schema revision, workspace_state shell, active_entity_id text change.
- Design session complete: foundational principles, entity model, dossier system, workspace interaction model all documented in `documents/DESIGN.md`. All 11 open questions resolved.

## Next Step
Workshop the script editor with real usage and surface any UX issues for the next polish pass.

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
Sprints 1–5 complete. Next: **Sprints 6–7** (Script editor).

| Sprints | Deliverable |
|---------|------------|
| 1–2 ✅ | Expo monorepo, NativeWind, Expo Router, backend skeleton, auth skeleton |
| 3 ✅ | Mockup — binder/sidebar (the persistent nav shell, on every screen) |
| 4–5 ✅ | Drizzle schema (full) + real auth + Series/Issue/Page CRUD |
| 6–7 | Script editor — all block types, panel size tags, keyboard flow, distraction-free |
| 8–9 | Skia drawing engine — storyboard canvas + Bible images/sketches (shared) |
| 10–11 | Universe Bible — unified database, type tags, custom fields, series overlays |
| 12–13 | Timeline tool |
| 14–15 | Collaboration — roles, access scope, private workspace, comments, share links |
| 16 | Export — script PDF (both styles), plain text, storyboard PDF |
| 17 | Polish, onboarding, perf |
