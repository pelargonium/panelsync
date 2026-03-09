# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/world/[id]`.
- Backend skeleton: Fastify + Drizzle, stub routes for `/api/worlds` and `/api/characters`. No schema yet.
- Auth middleware: `@fastify/jwt` plugin + `server.authenticate` decorator. Login/register stubs return 501.
- Mobile API client: `apps/mobile/lib/api.ts` — typed fetch wrapper for auth, worlds, characters.
- npm workspaces enabled. `apps/api` and `apps/mobile` are workspace members.
- UX concepting in progress. §3–9 fully specced: Script Editor, Storyboard Canvas, Universe Bible (unified content database, type tags, scrapbook overview, custom fields with universe registry, images & sketches, series overlays). No coding until UX is complete.
- §11 Notes System still has old standalone spec — needs to be updated to reflect Notes are now Bible entries (type tag = Note).

## Next Step
Spec §12 Collaboration — resolve open questions first: comment UI pattern (inline indicator vs sidebar panel), page status lock semantics, collaboration panel contents, Editor role permissions, and read-only share link scope (whole universe vs individual issue/page).

## §12 Collaboration — Open Questions (answer at session start)
- **Comments UI**: inline block indicator + tap to expand thread, OR Google Docs-style sidebar panel, OR both?
- **Page lock**: does "locked" block all editors, or only the owner can edit a locked page?
- **Status changes**: can any Editor change page status, or only the Owner?
- **Collaboration panel** (tap avatars in top bar): beyond role management and activity feed, anything else?
- **Editor permissions**: can Editors invite new collaborators? Can they delete content?
- **Share link scope**: link to whole universe, or can you scope it to a single series/issue/page?

---

## Deferred
- `packages/types` shared package — wait until schema is written, then extract shared interfaces
- Drizzle `drizzle.config.ts` migration tooling — set up when schema is ready
- Real auth implementation (login/register hitting DB) — after schema + users table exists
- Rename "Universe" → "World" in codebase — spec uses "Universe" now confirmed; codebase matches
- `theme.ts` uses red accent (`#C41E1E`); spec uses gold (`#c8a768`) — reconcile when UI work begins
- Mockup screens in `apps/mobile/app/mockups/` — after hierarchy nav is built

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
Currently completing **Sprints 1–2** (Foundation). Next: **Sprints 3–4** (Hierarchy).

| Sprints | Deliverable |
|---------|------------|
| 1–2 ✅ | Expo monorepo, NativeWind, Expo Router, backend skeleton, auth skeleton |
| **3–4** | Drizzle schema, Series/Issue/Page CRUD, sidebar navigation |
| 5–6 | Script editor — all six block types, auto-save, keyboard flow |
| 7–8 | Universe Bible — Characters, Locations, autocomplete |
| 9–10 | iPad drawing — Skia canvas, Apple Pencil |
| 11–12 | Timeline tool |
| 13 | Notes system |
| 14 | Collaboration — invite, roles, comments |
| 15 | Script PDF export, breakdown grid, share links |
| 16 | Polish, onboarding, perf |
