# Task: Schema Revision — Flexible Hierarchy + Dossier Foundation

**Status:** ready for Codex
**Assigned to:** Codex
**Reference:** `documents/DESIGN.md` (read this in full before starting)

---

## Objective

Rewrite the Drizzle schema to match the architecture established in DESIGN.md. Run the migration against Neon. Update the API routes to work with the new schema.

This is a significant structural change. The hardcoded `series` and `issues` tables are replaced by a flexible `hierarchy_levels` + `containers` system. Nine tables are removed. Seven new tables are added. Several existing tables are revised.

**This is a dev database with no production data. The migration can be destructive — drop old tables, create new ones.**

---

## Files to Change

1. `apps/api/src/db/schema.ts` — full rewrite
2. `apps/api/src/routes/series.ts` — rewrite as `containers.ts` (rename file too)
3. `apps/api/src/routes/universes.ts` — update universe creation to seed `hierarchy_levels`
4. `apps/api/src/index.ts` — update route registration (series → containers)
5. `apps/mobile/lib/api.ts` — update API client types and endpoints to match new routes

---

## Files NOT to Touch

- `apps/api/src/routes/auth.ts`
- `apps/api/src/plugins/auth.ts`
- `apps/api/src/db/client.ts`
- `apps/api/drizzle.config.ts`
- `apps/api/.env`
- `apps/mobile/app/auth.tsx`
- `documents/DESIGN.md`
- `documents/CONCEPT.md`
- `documents/OPEN_QUESTIONS.md`
- `CLAUDE.md`
- Anything in `apps/mobile/app/mockups/`

---

## Constraints

- Use Drizzle ORM only — no raw SQL except in generated migration files
- All timestamps use `timestamp('...').notNull().defaultNow()`
- All IDs use `uuid('id').primaryKey().defaultRandom()`
- Float positions use `real('position')` from drizzle-orm/pg-core
- Array columns use `.array()` notation in Drizzle
- JSONB columns use `jsonb('...')`
- Never use `serial` or `integer` for IDs
- All new routes must be auth-protected via `server.addHook('onRequest', server.authenticate)`
- Access checks must verify universe membership before any data operation
- Do not add optimistic locking, caching, or features not described in this brief

---

## New Schema — Complete Specification

### Enums (keep these, remove the rest)

Keep: `pageSizeEnum`, `accessScopeEnum`, `scriptBlockTypeEnum`, `pageStatusEnum`, `timelineIntentEnum`

Update:
- `collaboratorRoleEnum` — add 'contributor': `['owner', 'editor', 'contributor', 'viewer']`
- `bibleEntryTypeEnum` — remove 'timeline': `['character', 'location', 'note']`

Add:
- `dossierLayoutEnum` — `['vertical', 'horizontal']`
- `dossierAttachmentTypeEnum` — `['text', 'image', 'drawing', 'sketch', 'entity_link', 'timeline_pin', 'script_ref', 'waypoint']`
- `dossierEntityTypeEnum` — `['universe', 'container', 'page', 'script_block', 'bible_entry', 'timeline', 'timeline_event', 'timeline_range', 'draft']`
- `draftStatusEnum` — `['working', 'filed', 'published']`
- `eventActionEnum` — `['created', 'updated', 'deleted', 'moved', 'assigned', 'locked', 'unlocked']`

Remove:
- `timelineEventTagTypeEnum`

---

### Tables — Keep Unchanged

- `users`
- `universeMembers`

---

### Tables — Keep, Revised

**`universes`**
- Remove: `seriesLabel`, `issueLabel` (move to `hierarchy_levels`)
- Add: `updatedBy uuid nullable references users.id`

**`memberSeriesAccess`**
- Rename column: `seriesId` → `containerId` (uuid, references `containers.id`)

**`pages`**
- Remove: `issueId`, `scriptContent`
- Add: `containerId uuid nullable references containers.id`
- Add: `draftId uuid nullable references drafts.id`
- Keep: `id`, `number`, `status`, `updatedBy`, `isPrivate`, `ownerId`, `createdAt`, `updatedAt`
- NOTE: a page belongs to either a container or a draft — not both simultaneously

**`scriptBlocks`**
- Remove: `order` (integer), `panelNumber`, `panelSizeTag`
- Make nullable: `pageId` (null = clipboard/draft state)
- Change: `content` from `text` to `jsonb` (ProseMirror document fragment)
- Add: `draftId uuid nullable references drafts.id`
- Add: `position real notNull default 0`
- Add: `sizeTag text nullable` (replaces panelSizeTag — panel blocks only)
- Add: `createdBy uuid nullable references users.id`
- Add: `updatedBy uuid nullable references users.id`

**`bibleEntries`**
- Remove ALL columns except: `id`, `universeId`, `name`, `color`, `createdAt`, `updatedAt`
- Rename: `typeTag` → `type` (keep `bibleEntryTypeEnum`)
- Add: `createdBy uuid nullable references users.id`
- Add: `updatedBy uuid nullable references users.id`

**`timelines`**
- Add: `timeSystem text notNull default 'sequence'`
- Add: `customUnit text nullable`
- Add: `createdBy uuid nullable references users.id`
- Add: `updatedBy uuid nullable references users.id`

**`timelineEvents`**
- Remove: `tagType`, `rangeStartLabel`, `rangeEndLabel`, `characterIds`, `locationId`
- Add: `position real notNull default 0`
- Add: `timeValue text nullable`
- Add: `createdBy uuid nullable references users.id`
- Add: `updatedBy uuid nullable references users.id`

**`timelineRanges`**
- Make nullable: `startEventId`, `endEventId`
- Add: `color text nullable`
- Add: `createdAt timestamp notNull defaultNow`
- Add: `updatedAt timestamp notNull defaultNow`
- Add: `createdBy uuid nullable references users.id`

**`comments`**
- Add: `universeId uuid notNull references universes.id`
- Add: `parentId uuid nullable references comments.id`
- Add: `resolvedBy uuid nullable references users.id`
- Add: `resolvedAt timestamp nullable`
- Rename: `userId` → `createdBy`
- Rename: `targetType` → `entityType`
- Rename: `targetId` → `entityId`

---

### Tables — New

**`hierarchyLevels`**
```
id          uuid primaryKey defaultRandom
universeId  uuid notNull references universes.id onDelete cascade
name        text notNull
position    integer notNull
createdAt   timestamp notNull defaultNow
```

**`containers`**
```
id          uuid primaryKey defaultRandom
universeId  uuid notNull references universes.id onDelete cascade
levelId     uuid notNull references hierarchyLevels.id
parentId    uuid nullable references containers.id
name        text notNull
number      integer nullable
status      pageStatusEnum nullable
createdBy   uuid nullable references users.id
createdAt   timestamp notNull defaultNow
updatedAt   timestamp notNull defaultNow
updatedBy   uuid nullable references users.id
```

**`drafts`**
```
id          uuid primaryKey defaultRandom
universeId  uuid notNull references universes.id onDelete cascade
name        text notNull
status      draftStatusEnum notNull default 'working'
containerId uuid nullable references containers.id
createdBy   uuid nullable references users.id
createdAt   timestamp notNull defaultNow
updatedAt   timestamp notNull defaultNow
updatedBy   uuid nullable references users.id
```

**`files`**
```
id          uuid primaryKey defaultRandom
universeId  uuid notNull references universes.id onDelete cascade
storageKey  text notNull
url         text notNull
mimeType    text notNull
sizeBytes   integer nullable
width       integer nullable
height      integer nullable
uploadedBy  uuid nullable references users.id
uploadedAt  timestamp notNull defaultNow
```

**`dossierAttachments`**
```
id          uuid primaryKey defaultRandom
universeId  uuid notNull references universes.id onDelete cascade
entityType  dossierEntityTypeEnum notNull
entityId    uuid notNull
type        dossierAttachmentTypeEnum notNull
payload     jsonb notNull default '{}'
context     jsonb notNull default '{}'
searchText  text nullable
entityRefs  uuid[] notNull default '{}'
tags        text[] notNull default '{}'
state       text notNull default 'draft'
position    real notNull default 0
createdBy   uuid nullable references users.id
createdAt   timestamp notNull defaultNow
updatedAt   timestamp notNull defaultNow
updatedBy   uuid nullable references users.id
```

**`dossierCanvasState`**
```
id          uuid primaryKey defaultRandom
entityType  dossierEntityTypeEnum notNull
entityId    uuid notNull
layout      dossierLayoutEnum notNull default 'vertical'
updatedAt   timestamp notNull defaultNow
```

**`events`** (append-only — never update rows in this table)
```
id          uuid primaryKey defaultRandom
universeId  uuid notNull references universes.id onDelete cascade
actorId     uuid nullable references users.id
action      eventActionEnum notNull
entityType  text notNull
entityId    uuid notNull
payload     jsonb notNull default '{}'
createdAt   timestamp notNull defaultNow
```

---

### Tables — Remove Entirely

- `series`
- `issues`
- `panels`
- `storyboardPages`
- `bibleEntryImages`
- `bibleEntrySeriesOverlays`
- `noteFolders`
- `assetTimelineTags`
- `pinnedItems`

---

## API Routes — New Structure

### Remove
Delete `apps/api/src/routes/series.ts`. Create `apps/api/src/routes/containers.ts` in its place.

### New: `apps/api/src/routes/containers.ts`

All routes auth-protected. All routes verify universe membership via the same `assertUniverseAccess` helper pattern from the old series.ts.

```
GET    /api/containers?universeId=&levelId=&parentId=   list containers (all filters optional except universeId)
POST   /api/containers                                   create container { universeId, levelId, parentId?, name, number? }
PATCH  /api/containers/:id                              update { name?, number? }
DELETE /api/containers/:id                              delete

GET    /api/containers/:containerId/children            list direct child containers
GET    /api/containers/:containerId/pages               list pages ordered by number
POST   /api/containers/:containerId/pages               create page { number? } — auto-numbers if omitted

GET    /api/hierarchy?universeId=                       list hierarchy levels ordered by position
POST   /api/hierarchy                                   create level { universeId, name, position }
PATCH  /api/hierarchy/:id                               update { name?, position? }
DELETE /api/hierarchy/:id                               delete level

GET    /api/drafts?universeId=                          list drafts
POST   /api/drafts                                      create draft { universeId, name }
PATCH  /api/drafts/:id                                  update { name?, status?, containerId? }
DELETE /api/drafts/:id                                  delete

GET    /api/drafts/:draftId/pages                       list pages in draft ordered by number
POST   /api/drafts/:draftId/pages                       create page in draft { number? }

PATCH  /api/pages/:pageId                               update page { status? } — enforce locked check
```

Register all these routes in a single exported function `containersRoutes(server)`. Use a single plugin registration without a fixed prefix (routes declare their own full paths).

### Update: `apps/api/src/routes/universes.ts`

In `POST /api/universes`, after inserting the universe row and the owner membership row, also insert two rows into `hierarchyLevels`:
```ts
await db.insert(hierarchyLevels).values([
  { universeId: newUniverse.id, name: 'Series', position: 1 },
  { universeId: newUniverse.id, name: 'Issue',  position: 2 },
]);
```

### Update: `apps/api/src/index.ts`

Replace the series route import and registration with containers:
```ts
import { containersRoutes } from './routes/containers.js';
server.register(containersRoutes);
```

---

## Mobile API Client — `apps/mobile/lib/api.ts`

Update to match new routes:

Remove: `ApiSeries`, `ApiIssue` interfaces and `api.series`, `api.issues` objects.

Add interfaces:
```ts
ApiHierarchyLevel { id, universeId, name, position, createdAt }
ApiContainer      { id, universeId, levelId, parentId, name, number, status, createdAt, updatedAt }
ApiDraft          { id, universeId, name, status, containerId, createdAt, updatedAt }
```

Add API objects:
```ts
api.hierarchy  — list(universeId), create({ universeId, name, position })
api.containers — list(universeId, levelId?, parentId?), create({...}), children(containerId), pages(containerId), createPage(containerId)
api.drafts     — list(universeId), create({ universeId, name }), pages(draftId), createPage(draftId)
```

Update `api.pages`:
- `list` endpoint: update path to `/api/containers/:containerId/pages`
- `create` endpoint: update path to `/api/containers/:containerId/pages`
- Keep `update` endpoint path: `/api/pages/:pageId`

Keep: `ApiUser`, `ApiPage`, `api.auth`, `api.universes` — unchanged.

---

## Migration Steps

After rewriting the schema, from `apps/api/` run:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Verify the API starts without errors:
```bash
npx tsx src/index.ts
```

---

## Acceptance Criteria

- [ ] `schema.ts` contains exactly 18 tables: users, universes, universeMembers, memberSeriesAccess, hierarchyLevels, containers, drafts, pages, scriptBlocks, files, bibleEntries, timelines, timelineEvents, timelineRanges, dossierAttachments, dossierCanvasState, comments, events
- [ ] All 9 removed tables are absent from schema.ts
- [ ] Migration runs cleanly against Neon with no errors
- [ ] API server starts without TypeScript errors
- [ ] `POST /api/universes` seeds two hierarchyLevels rows
- [ ] `GET /api/containers?universeId=` returns 200 with data array (auth required)
- [ ] `POST /api/containers` creates a container (auth required)
- [ ] `GET /api/hierarchy?universeId=` returns two default levels for a new universe
- [ ] `POST /api/drafts` creates a draft (auth required)
- [ ] `apps/mobile/lib/api.ts` compiles without TypeScript errors

---

## Completion Note (Codex fills in before handing back)

**Status:** ___
**Files changed:** ___
**Migration file:** ___
**Verification run:** ___
**Open risks / assumptions:** ___
