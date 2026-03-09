# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/world/[id]`.
- Backend skeleton: Fastify + Drizzle, stub routes for `/api/worlds` and `/api/characters`. No schema yet.
- Auth middleware: `@fastify/jwt` plugin + `server.authenticate` decorator. Login/register stubs return 501.
- Mobile API client: `apps/mobile/lib/api.ts` — typed fetch wrapper for auth, worlds, characters.
- npm workspaces enabled. `apps/api` and `apps/mobile` are workspace members.
- UX concepting in progress. §3–7 fully specced: binder tap behavior table, Series/Issue Map definitions, Script Editor (document model, block selector bar, block types, keyboard flow, distraction-free mode). No coding until UX is complete.

## Next Step
Continue UX concepting: spec the Storyboard Canvas (§8) — drawing toolbar, script reference panel, page navigation model, panel grid origin, and relationship to the script editor's standard-mode storyboard preview.

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
