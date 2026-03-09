# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/world/[id]`.
- Backend skeleton: Fastify + Drizzle, stub routes for `/api/worlds` and `/api/characters`. No schema yet.
- Auth middleware: `@fastify/jwt` plugin + `server.authenticate` decorator. Login/register stubs return 501.
- Mobile API client: `apps/mobile/lib/api.ts` — typed fetch wrapper for auth, worlds, characters.
- npm workspaces enabled. `apps/api` and `apps/mobile` are workspace members.
- UX concepting in progress. §3–12 fully specced. §12 Export & Sharing: export modal (whole issue or single page), script PDF (PanelSync or Final Draft style), plain text, storyboard PDF (one full page per PDF page at 300dpi, 1:1, imports into drawing software). Share Center deferred to v2. No coding until UX is complete.
- §4 Create Universe Modal: Page Setup tab added (default page size + issue length). Page size options: US Comic, US Full Bleed, Manga Tankōbon, European BD, Letter, A4, Custom. Webtoon deferred to v2.
- §11 Notes System removed — Notes are Bible entries with Note type tag (§9).

## Next Step
UX concepting is complete through §12. Review §13 MVP Feature Status and §14 Deferred for accuracy, then decide whether to begin Sprints 3–4 (Drizzle schema, Series/Issue/Page CRUD, sidebar navigation) or continue with any remaining open UX questions.

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
