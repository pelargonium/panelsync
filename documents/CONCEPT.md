# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/world/[id]`.
- Backend skeleton: Fastify + Drizzle, stub routes for `/api/worlds` and `/api/characters`. No schema yet.
- Auth middleware: `@fastify/jwt` plugin + `server.authenticate` decorator. Login/register stubs return 501.
- Mobile API client: `apps/mobile/lib/api.ts` — typed fetch wrapper for auth, worlds, characters.
- npm workspaces enabled. `apps/api` and `apps/mobile` are workspace members.
- UX concepting complete. §3–12 fully specced. §12 Export & Sharing: export modal (whole issue or single page), script PDF (PanelSync or Final Draft style), plain text, storyboard PDF (one full page per PDF page at 300dpi, 1:1, imports into drawing software). Share Center deferred to v2.
- §4 Create Universe Modal: Page Setup tab added (default page size + issue length). Page size options: US Comic, US Full Bleed, Manga Tankōbon, European BD, Letter, A4, Custom. Webtoon deferred to v2.
- §11 Notes System removed — Notes are Bible entries with Note type tag (§9).
- Binder/sidebar mockup complete: `apps/mobile/app/mockups/binder.tsx`. Interactive accordion (Series/Issue/Page), binder collapse, global chrome top bar, script stub. Reviewed and approved.

## Next Step
Begin Sprint 4–5: write the full Drizzle schema (worlds, series, issues, pages, characters, locations, timeline events, bible entries, users) and wire up real auth (login/register endpoints hitting the DB).

---

## Deferred
- `packages/types` shared package — wait until schema is written, then extract shared interfaces
- Drizzle `drizzle.config.ts` migration tooling — set up when schema is ready
- Real auth implementation (login/register hitting DB) — after schema + users table exists
- Rename "Universe" → "World" in codebase — spec uses "Universe" now confirmed; codebase matches
- `theme.ts` uses red accent (`#C41E1E`); spec uses gold (`#c8a768`) — reconcile when UI work begins
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
Sprints 1–3 complete. Next: **Sprints 4–5** (Schema + Auth).

| Sprints | Deliverable |
|---------|------------|
| 1–2 ✅ | Expo monorepo, NativeWind, Expo Router, backend skeleton, auth skeleton |
| 3 ✅ | Mockup — binder/sidebar (the persistent nav shell, on every screen) |
| 4–5 | Drizzle schema (full) + real auth + Series/Issue/Page CRUD |
| 6–7 | Script editor — all block types, panel size tags, keyboard flow, distraction-free |
| 8–9 | Skia drawing engine — storyboard canvas + Bible images/sketches (shared) |
| 10–11 | Universe Bible — unified database, type tags, custom fields, series overlays |
| 12–13 | Timeline tool |
| 14–15 | Collaboration — roles, access scope, private workspace, comments, share links |
| 16 | Export — script PDF (both styles), plain text, storyboard PDF |
| 17 | Polish, onboarding, perf |
