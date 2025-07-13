CREATE TABLE "access_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"scope" text NOT NULL,
	"session_id" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_codes" (
	"code" varchar(36) PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"code_challenge_method" varchar(10) NOT NULL,
	"scope" text NOT NULL,
	"api_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"client_id" text,
	"client_name" text,
	"client_version" text,
	"client_type" varchar(20) DEFAULT 'generic' NOT NULL,
	"api_key_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
