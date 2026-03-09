CREATE TYPE "public"."access_scope" AS ENUM('universe', 'series', 'bible_only');--> statement-breakpoint
CREATE TYPE "public"."bible_entry_type" AS ENUM('character', 'location', 'note', 'timeline');--> statement-breakpoint
CREATE TYPE "public"."collaborator_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."page_size" AS ENUM('us_comic', 'us_full_bleed', 'manga_tankobon', 'european_bd', 'letter', 'a4', 'custom');--> statement-breakpoint
CREATE TYPE "public"."page_status" AS ENUM('draft', 'in_review', 'locked', 'complete');--> statement-breakpoint
CREATE TYPE "public"."script_block_type" AS ENUM('panel', 'scene', 'description', 'dialogue', 'caption', 'sfx');--> statement-breakpoint
CREATE TYPE "public"."timeline_event_tag_type" AS ENUM('point', 'range');--> statement-breakpoint
CREATE TYPE "public"."timeline_intent" AS ENUM('story', 'reference', 'character_arc', 'production');--> statement-breakpoint
CREATE TABLE "asset_timeline_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_type" text NOT NULL,
	"asset_id" uuid NOT NULL,
	"timeline_event_id" uuid NOT NULL,
	"tag_type" timeline_event_tag_type DEFAULT 'point' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" uuid NOT NULL,
	"type_tag" "bible_entry_type" NOT NULL,
	"extra_type_tags" jsonb DEFAULT '[]'::jsonb,
	"name" text NOT NULL,
	"color" text,
	"role" text,
	"birthday" text,
	"gender" text,
	"sex" text,
	"species" text,
	"sexual_orientation" text,
	"birthplace" text,
	"blood_type" text,
	"height" text,
	"appearance" text,
	"backstory" text,
	"knowledge_gaps" jsonb DEFAULT '{}'::jsonb,
	"description" text,
	"time_period" text,
	"rich_text_content" jsonb DEFAULT '{}'::jsonb,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"is_private" boolean DEFAULT false NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_entry_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"image_url" text,
	"sketch_data" jsonb,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_entry_series_overlays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"series_id" uuid NOT NULL,
	"notes" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_series_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"series_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"parent_folder_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"status" "page_status" DEFAULT 'draft' NOT NULL,
	"script_content" jsonb DEFAULT '[]'::jsonb,
	"updated_by" uuid,
	"is_private" boolean DEFAULT false NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "panels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"panel_number" integer NOT NULL,
	"size_tag" text,
	"keywords" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "pinned_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"item_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "script_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"type" "script_block_type" NOT NULL,
	"order" integer NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"panel_number" integer,
	"speaker" text,
	"panel_size_tag" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"arc_notes" text DEFAULT '' NOT NULL,
	"cover_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storyboard_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"sketch_data" jsonb DEFAULT '{}'::jsonb,
	"reference_image_url" text,
	"reference_opacity" real DEFAULT 0.5,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "storyboard_pages_page_id_unique" UNIQUE("page_id")
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"date_label" text,
	"tag_type" timeline_event_tag_type DEFAULT 'point' NOT NULL,
	"range_start_label" text,
	"range_end_label" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"character_ids" jsonb DEFAULT '[]'::jsonb,
	"location_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_ranges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timeline_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_event_id" uuid NOT NULL,
	"end_event_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" uuid NOT NULL,
	"name" text NOT NULL,
	"intent" timeline_intent DEFAULT 'story' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universe_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "collaborator_role" DEFAULT 'editor' NOT NULL,
	"access_scope" "access_scope" DEFAULT 'universe' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"cover_image_url" text,
	"page_size" "page_size" DEFAULT 'us_comic' NOT NULL,
	"custom_page_width" integer,
	"custom_page_height" integer,
	"default_issue_length" integer DEFAULT 22 NOT NULL,
	"series_label" text DEFAULT 'Series' NOT NULL,
	"issue_label" text DEFAULT 'Issue' NOT NULL,
	"timeline_timescale" text DEFAULT 'pure_sequence' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "asset_timeline_tags" ADD CONSTRAINT "asset_timeline_tags_timeline_event_id_timeline_events_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."timeline_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_entries" ADD CONSTRAINT "bible_entries_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_entries" ADD CONSTRAINT "bible_entries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_entry_images" ADD CONSTRAINT "bible_entry_images_entry_id_bible_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bible_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_entry_series_overlays" ADD CONSTRAINT "bible_entry_series_overlays_entry_id_bible_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."bible_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_entry_series_overlays" ADD CONSTRAINT "bible_entry_series_overlays_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_series_access" ADD CONSTRAINT "member_series_access_member_id_universe_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."universe_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_series_access" ADD CONSTRAINT "member_series_access_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_folders" ADD CONSTRAINT "note_folders_parent_folder_id_note_folders_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."note_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panels" ADD CONSTRAINT "panels_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_items" ADD CONSTRAINT "pinned_items_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pinned_items" ADD CONSTRAINT "pinned_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "script_blocks" ADD CONSTRAINT "script_blocks_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_pages" ADD CONSTRAINT "storyboard_pages_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storyboard_pages" ADD CONSTRAINT "storyboard_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_location_id_bible_entries_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."bible_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_ranges" ADD CONSTRAINT "timeline_ranges_timeline_id_timelines_id_fk" FOREIGN KEY ("timeline_id") REFERENCES "public"."timelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_ranges" ADD CONSTRAINT "timeline_ranges_start_event_id_timeline_events_id_fk" FOREIGN KEY ("start_event_id") REFERENCES "public"."timeline_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_ranges" ADD CONSTRAINT "timeline_ranges_end_event_id_timeline_events_id_fk" FOREIGN KEY ("end_event_id") REFERENCES "public"."timeline_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timelines" ADD CONSTRAINT "timelines_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universe_members" ADD CONSTRAINT "universe_members_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universe_members" ADD CONSTRAINT "universe_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universes" ADD CONSTRAINT "universes_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;