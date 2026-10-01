CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"participant_id" uuid NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participants" ADD COLUMN "recovery_hash" text;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_recovery_hash_key" UNIQUE("recovery_hash");--> statement-breakpoint
CREATE INDEX "devices_participant_idx" ON "devices" ("participant_id");--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_participant_id_participants_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE;