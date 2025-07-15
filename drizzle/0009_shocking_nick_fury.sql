CREATE TABLE "registered_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"client_secret" varchar(255),
	"client_name" text,
	"client_uri" text,
	"redirect_uris" text[],
	"grant_types" text[] DEFAULT '{"authorization_code"}' NOT NULL,
	"response_types" text[] DEFAULT '{"code"}' NOT NULL,
	"scope" text DEFAULT 'mcp:tools mcp:resources' NOT NULL,
	"token_endpoint_auth_method" varchar(20) DEFAULT 'none' NOT NULL,
	"registration_access_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "registered_clients_client_id_unique" UNIQUE("client_id")
);
