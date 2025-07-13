import { pgTable, text, timestamp, varchar, boolean, serial } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  clientId: text("client_id"), // MCP client ID (optional)
  clientName: text("client_name"), // Client name from clientInfo
  clientVersion: text("client_version"), // Client version from clientInfo
  clientType: varchar("client_type", { length: 20 }).notNull().default("generic"), // "mcpserver" or "generic"
  apiKeyHash: text("api_key_hash"), // bcrypt hash of V0 API key
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
  apiKey: text("api_key").notNull(), // Temporarily store the actual API key for OAuth flow
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const accessTokens = pgTable("access_tokens", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull(),
  scope: text("scope").notNull(),
  sessionId: varchar("session_id", { length: 36 }), // Link to session
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});