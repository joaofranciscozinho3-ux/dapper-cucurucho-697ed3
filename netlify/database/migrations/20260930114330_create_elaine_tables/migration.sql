CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"post_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"token_hash" text NOT NULL UNIQUE,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"participant_id" uuid NOT NULL,
	"nickname" text NOT NULL,
	"image_key" text,
	"text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" ("created_at");--> statement-breakpoint
CREATE INDEX "posts_participant_idx" ON "posts" ("participant_id");--> statement-breakpoint
CREATE INDEX "rate_events_key_idx" ON "rate_events" ("key","created_at");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_participant_id_participants_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_participant_id_participants_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE;