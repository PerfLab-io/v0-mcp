ALTER TABLE "access_tokens" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD COLUMN "refresh_expires_at" timestamp;