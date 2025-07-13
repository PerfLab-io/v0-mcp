ALTER TABLE "access_tokens" ADD COLUMN "token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_token_unique" UNIQUE("token");