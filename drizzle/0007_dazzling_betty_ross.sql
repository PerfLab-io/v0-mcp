ALTER TABLE "access_tokens" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "encrypted_api_key";