CREATE TYPE "public"."depth_state" AS ENUM('entity_only', 'split', 'dossier_only');--> statement-breakpoint
CREATE TABLE "workspace_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"active_entity_type" text,
	"active_entity_id" uuid,
	"depth_state" "depth_state" DEFAULT 'entity_only' NOT NULL,
	"binder_open" boolean DEFAULT true NOT NULL,
	"warm_contexts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_state" ADD CONSTRAINT "workspace_state_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_state" ADD CONSTRAINT "workspace_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;