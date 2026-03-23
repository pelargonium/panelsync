ALTER TABLE "bible_entries" RENAME TO "entities";

ALTER TABLE "workspace_state" ADD COLUMN "staging_area" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "workspace_state" ADD COLUMN "everything_depth" text NOT NULL DEFAULT 'page';

CREATE TABLE "tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "universe_id" uuid NOT NULL REFERENCES "universes"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "color" text,
  "created_by" uuid REFERENCES "users"("id"),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "entity_tags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "tagged_by" uuid REFERENCES "users"("id"),
  "tagged_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "entity_memberships" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "parent_entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "child_entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "position" real NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "boards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "universe_id" uuid NOT NULL REFERENCES "universes"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "board_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "board_id" uuid NOT NULL REFERENCES "boards"("id") ON DELETE CASCADE,
  "entity_id" uuid NOT NULL REFERENCES "entities"("id") ON DELETE CASCADE,
  "position" real NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "perspectives" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "universe_id" uuid NOT NULL REFERENCES "universes"("id") ON DELETE CASCADE,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "filter_descriptor" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
