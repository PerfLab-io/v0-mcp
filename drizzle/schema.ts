import { pgTable, text, timestamp, varchar, serial } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  clientId: text("client_id"), // OAuth client ID from access token
  clientName: text("client_name"), // Client name from clientInfo
  clientVersion: text("client_version"), // Client version from clientInfo
  clientType: varchar("client_type", { length: 20 }).notNull().default("generic"), // "mcpserver" or "generic"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
});

export const authorizationCodes = pgTable("authorization_codes", {
  code: varchar("code", { length: 36 }).primaryKey(), // UUID
  clientId: text("client_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  codeChallengeMethod: varchar("code_challenge_method", { length: 10 }).notNull(),
  scope: text("scope").notNull(),
  encryptedApiKey: text("encrypted_api_key").notNull(), // AES-256-GCM encrypted V0 API key using client_id as key
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const accessTokens = pgTable("access_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(), // The access token (encrypted API key)
  clientId: text("client_id").notNull(),
  scope: text("scope").notNull(),
  refreshToken: text("refresh_token"), // Refresh token for token renewal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at"),
});

export const registeredClients = pgTable("registered_clients", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id", { length: 255 }).notNull().unique(),
  clientSecret: varchar("client_secret", { length: 255 }),
  clientName: text("client_name"),
  clientUri: text("client_uri"),
  redirectUris: text("redirect_uris").array(), // Array of redirect URIs
  grantTypes: text("grant_types").array().notNull().default(["authorization_code"]),
  responseTypes: text("response_types").array().notNull().default(["code"]),
  scope: text("scope").notNull().default("mcp:tools mcp:resources"),
  tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", { length: 20 }).notNull().default("none"),
  registrationAccessToken: text("registration_access_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // null = never expires
});