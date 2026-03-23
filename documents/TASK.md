# Task: Schema Migration — bible_entries → entities + new tables

## Status
`in progress`

## Objective
Rename `bible_entries` → `entities` throughout the entire codebase (schema, API, mobile), update related enums, add 6 new tables, and add 2 fields to `workspace_state`. This is a mechanical rename + additive migration — no logic changes.

## Context
The "Bible" as a named app section has been dissolved. Entities (characters, locations, notes) just exist in a flat pool. The `bible_entries` table name is now a misnomer. Additionally, the binder redesign requires new tables for tagging, folder/Bible membership, boards, and perspectives.

---

## Part 1 — Drizzle schema.ts changes

File: `apps/api/src/db/schema.ts`

### 1a. Rename `bibleEntryTypeEnum` → `entityTypeEnum`
```ts
// BEFORE
export const bibleEntryTypeEnum = pgEnum('bible_entry_type', [
  'character', 'location', 'note', 'group',
]);

// AFTER
export const entityTypeEnum = pgEnum('entity_type', [
  'character', 'location', 'note', 'group', 'bible', 'folder',
]);
```

### 1b. Update `dossierEntityTypeEnum` — replace `'bible_entry'` with `'entity'`
```ts
// BEFORE: 'bible_entry' in the list
// AFTER: 'entity' in the list (same position)
```

### 1c. Rename `bibleEntries` table export → `entities`, table name → `'entities'`
```ts
// BEFORE
export const bibleEntries = pgTable('bible_entries', {
  ...
  type: bibleEntryTypeEnum('type').notNull(),
  ...
});

// AFTER
export const entities = pgTable('entities', {
  ...
  type: entityTypeEnum('type').notNull(),
  ...
});
```

### 1d. Add `stagingArea` and `everythingDepth` to `workspaceState`
```ts
stagingArea: jsonb('staging_area').notNull().default([]),
everythingDepth: text('everything_depth').notNull().default('page'),
```
Add these two fields before `updatedAt`.

### 1e. Add 6 new tables — append after `workspaceState`

```ts
export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const entityTags = pgTable('entity_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityId: uuid('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  taggedBy: uuid('tagged_by').references(() => users.id),
  taggedAt: timestamp('tagged_at').notNull().defaultNow(),
});

export const entityMemberships = pgTable('entity_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentEntityId: uuid('parent_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  childEntityId: uuid('child_entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  position: real('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const boards = pgTable('boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const boardMembers = pgTable('board_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  position: real('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const perspectives = pgTable('perspectives', {
  id: uuid('id').primaryKey().defaultRandom(),
  universeId: uuid('universe_id').notNull().references(() => universes.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  filterDescriptor: jsonb('filter_descriptor').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

---

## Part 2 — Write migration SQL manually

**Do NOT use `npx drizzle-kit generate` interactively** — it will prompt for enum rename choices that are hard to automate. Instead, use `npx drizzle-kit generate --custom` to create an empty migration file, then write the SQL yourself.

Run:
```
cd apps/api && npx drizzle-kit generate --custom
```

This creates an empty `.sql` file in `apps/api/drizzle/`. Write the following SQL into it:

```sql
-- Rename bible_entry_type enum → entity_type, add new values
ALTER TYPE "bible_entry_type" RENAME TO "entity_type";
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'bible';
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'folder';

-- Update dossier_entity_type enum: add 'entity' value, migrate data, remove old value
ALTER TYPE "dossier_entity_type" ADD VALUE IF NOT EXISTS 'entity';
UPDATE "dossier_attachments" SET "entity_type" = 'entity' WHERE "entity_type" = 'bible_entry';

-- Rename bible_entries table → entities
ALTER TABLE "bible_entries" RENAME TO "entities";

-- Add new workspace_state columns
ALTER TABLE "workspace_state" ADD COLUMN "staging_area" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "workspace_state" ADD COLUMN "everything_depth" text NOT NULL DEFAULT 'page';

-- Create tags table
CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "universe_id" uuid NOT NULL REFERENCES "universes"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "color" text,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create entity_tags table
CREATE TABLE "entity_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "tagged_by" uuid REFERENCES "users"("id"),
  "tagged_at" timestamp NOT NULL DEFAULT now()
);

-- Create entity_memberships table
CREATE TABLE "entity_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parent_entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "child_entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "position" real NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create boards table
CREATE TABLE "boards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "universe_id" uuid NOT NULL REFERENCES "universes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create board_members table
CREATE TABLE "board_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "board_id" uuid NOT NULL REFERENCES "boards"("id") ON DELETE CASCADE,
  "entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "position" real NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Create perspectives table
CREATE TABLE "perspectives" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "universe_id" uuid NOT NULL REFERENCES "universes"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "filter_descriptor" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
```

After writing the SQL, apply it to Neon:
```
cd apps/api && npx drizzle-kit migrate
```

---

## Part 3 — Rename bible.ts → entities.ts

1. Rename `apps/api/src/routes/bible.ts` → `apps/api/src/routes/entities.ts`
2. In the new file, make these changes:
   - Import `entities` instead of `bibleEntries` from schema
   - Import `entityTypeEnum` instead of `bibleEntryTypeEnum` (if referenced)
   - Replace all `bibleEntries` references with `entities`
   - Replace all `'bible_entry'` string literals (used as `entityType` values) with `'entity'`
   - Replace all route paths: `/universes/:universeId/bible` → `/universes/:universeId/entities`, `/bible/:id` → `/entities/:id`
   - Rename exported function `bibleRoutes` → `entityRoutes`
   - The group membership routes (`/bible/:groupId/members`) → `/entities/:groupId/members`
3. Update `apps/api/src/index.ts`:
   - Change import from `'./routes/bible.js'` → `'./routes/entities.js'`
   - Change `bibleRoutes` → `entityRoutes`

---

## Part 4 — Update mobile code

### `apps/mobile/lib/api.ts`
- Rename `ApiBibleEntry` interface → `ApiEntity`
- Update all route URLs: `/bible/` → `/entities/`, `/universes/${id}/bible` → `/universes/${id}/entities`
- Update all references to `ApiBibleEntry` type within the file

### `apps/mobile/context/UniverseContext.tsx`
- Update import of `ApiBibleEntry` → `ApiEntity`
- Update all type references

### `apps/mobile/app/universe/[id].tsx`
- Update import of `ApiBibleEntry` → `ApiEntity`
- Update all type references

### `apps/mobile/components/CharacterEditor.tsx`, `EntityEditor.tsx`, `GroupEditor.tsx`
- Update import of `ApiBibleEntry` → `ApiEntity` if present
- Update all type references

---

## Files to change
- `apps/api/src/db/schema.ts`
- `apps/api/drizzle/[new migration file]` — create via `--custom`
- `apps/api/src/routes/bible.ts` → rename to `entities.ts`
- `apps/api/src/index.ts`
- `apps/mobile/lib/api.ts`
- `apps/mobile/context/UniverseContext.tsx`
- `apps/mobile/app/universe/[id].tsx`
- `apps/mobile/components/CharacterEditor.tsx`
- `apps/mobile/components/EntityEditor.tsx`
- `apps/mobile/components/GroupEditor.tsx`

## Files NOT to touch
- `apps/api/src/routes/containers.ts`
- `apps/api/src/routes/universes.ts`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/routes/characters.ts`
- `documents/` — no doc changes needed
- `CLAUDE.md`

---

## Acceptance criteria
1. `npx tsc --noEmit -p apps/api/tsconfig.json` passes
2. `npx tsc --noEmit -p apps/mobile/tsconfig.json` passes
3. Migration applied to Neon without errors
4. No remaining references to `bibleEntries`, `bible_entries`, `ApiBibleEntry`, or `bibleRoutes` anywhere in `apps/`
5. All `/api/bible/` routes now respond at `/api/entities/` (the old paths no longer exist)

---

## Completion Note (Codex fills in)

_Status: `needs Claude review`_
_Files changed:_
_Verification:_
_Open risks/assumptions:_
