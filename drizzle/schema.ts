import { pgTable, text, timestamp, varchar, boolean, serial } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  clientId: text("client_id"), // MCP client ID (optional)
  clientName: text("client_name"), // Client name from clientInfo
  clientVersion: text("client_version"), // Client version from clientInfo
  clientType: varchar("client_type", { length: 20 }).notNull().default("generic"), // "mcpserver" or "generic"
  encryptedApiKey: text("encrypted_api_key"), // AES-256-GCM encrypted V0 API key using client_id as key
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
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
  sessionId: varchar("session_id", { length: 36 }), // Link to session
  refreshToken: text("refresh_token"), // Refresh token for token renewal
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at"),
});