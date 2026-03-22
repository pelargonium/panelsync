# PanelSync — Session Guide

## Current Build State
- Expo Router + NativeWind wired up. App runs on web and iPad. Navigation: `/` (Universes Dashboard) → `/universe/[id]` (renamed from `/world/[id]`). All API routes renamed `/api/worlds` → `/api/universes`.
- Full Drizzle schema written: users, universes, universe_members, member_series_access, series, issues, pages, script_blocks, panels, storyboard_pages, bible_entries, bible_entry_images, bible_entry_series_overlays, note_folders, timelines, timeline_events, timeline_ranges, asset_timeline_tags, comments, pinned_items. Matches SPEC.md §2 data model.
- Real auth: `POST /api/auth/register` and `POST /api/auth/login` implemented with scrypt password hashing (Node crypto, no deps). JWT issued on both.
- Universe routes (`/api/universes`) wired to real DB. Auth-protected. Owner membership row auto-created on universe creation.
- Universe screen (`/universe/[id]`) wired to real API: loads series from `GET /api/series?universeId=`, expand series to load issues, create new series via modal.
- Series/Issue/Page CRUD routes added at `/api/series`. Access-gated by universe membership.
- Mobile API client: `apps/mobile/lib/api.ts` — typed wrapper with SecureStore token persistence, full typed response interfaces (ApiUniverse, ApiSeries, ApiIssue, ApiPage), and endpoints for auth/universes/series/issues/pages.
- Auth screen: `apps/mobile/app/auth.tsx` — login/register UI, writes JWT to SecureStore on success.
- Dashboard (`apps/mobile/app/index.tsx`) wired to real API: auth gate, live universe list, create universe, sign out, pull-to-refresh.
- Drizzle migration run against Neon Postgres. All 20 tables created cleanly. Smoke-tested: register, login, create universe, list universes, create series — all working end-to-end.
- npm workspaces enabled. `apps/api` and `apps/mobile` are workspace members.
- UX concepting complete. §3–12 fully specced. §12 Export & Sharing: export modal (whole issue or single page), script PDF (PanelSync or Final Draft style), plain text, storyboard PDF (one full page per PDF page at 300dpi, 1:1, imports into drawing software). Share Center deferred to v2.
- §4 Create Universe Modal: Page Setup tab added (default page size + issue length). Page size options: US Comic, US Full Bleed, Manga Tankōbon, European BD, Letter, A4, Custom. Webtoon deferred to v2.
- §11 Notes System removed — Notes are Bible entries with Note type tag (§9).
- Binder/sidebar mockup complete: `apps/mobile/app/mockups/binder.tsx`. Interactive accordion (Series/Issue/Page), binder collapse, global chrome top bar, script stub. Reviewed and approved.
- `universe/[id].tsx` visual design aligned with binder mockup: chrome bar (48px), 264px collapsible binder with universe name header, search bar, section tree (SERIES/ISSUE/PAGE accordion + entity section headers), footer type-tag pills.
- `theme.ts` accent updated from red `#C41E1E` to gold `#c8a768` to match approved mockup.
- Security fixes: page PATCH route now access-gated via universe membership check; JWT plugin fails fast on missing `JWT_SECRET`; characters stub route unregistered from the server.
- `dotenv/config` added to API entry point so `.env` loads automatically.
- Issue creation: `NewIssueModal` added to each series row, wired to `POST /api/series/:seriesId/issues`.
- Page creation: `IssueRow` component with lazy page loading and inline `+` page creation wired to `POST /api/series/issues/:issueId/pages`.
- Stub script editor screen at `/universe/[id]/issue/[iid]/page/[pid]` — route is live, navigates from Script icon on each page row.
- Design session complete: foundational principles, entity model, dossier system, workspace interaction model all documented in `documents/DESIGN.md`.

## Next Step
Build the persistent workspace shell: refactor the universe screen into a persistent workspace with a always-present binder, shared UniverseContext holding containers/pages state, and entity panels opening in the content area without pushing new screens.

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
