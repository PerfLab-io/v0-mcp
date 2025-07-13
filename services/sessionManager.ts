import { randomUUID } from "crypto";
import { eq, and, gte } from "drizzle-orm";
import { db } from "../drizzle/index.js";
import { sessions, accessTokens } from "../drizzle/schema.js";
import { createApiKeyHash, verifyApiKey } from "../utils/crypto.js";

export interface SessionData {
  id: string;
  clientId?: string;
  clientName?: string;
  clientVersion?: string;
  clientType: "mcpserver" | "generic";
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
  hasApiKey: boolean;
}

export interface ClientInfo {
  name: string;
  version: string;
}

export class DatabaseSessionManager {
  /**
   * Create a new session or retrieve existing one
   */
  async createOrGetSession(
    sessionId?: string,
    clientInfo?: ClientInfo
  ): Promise<SessionData> {
    console.log("createOrGetSession called with:", sessionId, "clientInfo:", clientInfo);

    // If sessionId provided, try to find existing session
    if (sessionId) {
      const existingSession = await this.getSession(sessionId);
      if (existingSession) {
        console.log("Found existing session:", existingSession.id, "clientType:", existingSession.clientType);
        // Update last activity
        await this.updateLastActivity(sessionId);
        return existingSession;
      }
    }

    // Create new session
    const newSessionId = sessionId || randomUUID();
    console.log("Creating new session with ID:", newSessionId);

    const clientType: "mcpserver" | "generic" = 
      clientInfo?.name === "v0-mcp" ? "mcpserver" : "generic";

    const sessionData = {
      id: newSessionId,
      clientId: null,
      clientName: clientInfo?.name || null,
      clientVersion: clientInfo?.version || null,
      clientType,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true,
    };

    await db.insert(sessions).values(sessionData);

    console.log("Session created and stored. Client type:", clientType);
    
    return {
      id: sessionData.id,
      clientId: sessionData.clientId || undefined,
      clientName: sessionData.clientName || undefined,
      clientVersion: sessionData.clientVersion || undefined,
      clientType: sessionData.clientType,
      createdAt: sessionData.createdAt,
      lastActivity: sessionData.lastActivity,
      isActive: sessionData.isActive,
      hasApiKey: false,
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const result = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)))
      .limit(1);

    if (result.length === 0) return null;

    const session = result[0];
    return {
      id: session.id,
      clientId: session.clientId || undefined,
      clientName: session.clientName || undefined,
      clientVersion: session.clientVersion || undefined,
      clientType: session.clientType as "mcpserver" | "generic",
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isActive: session.isActive,
      hasApiKey: Boolean(session.apiKeyHash),
    };
  }

  /**
   * Store API key for a session (hashed using bcrypt)
   */
  async setSessionApiKey(sessionId: string, apiKey: string): Promise<void> {
    const hash = await createApiKeyHash(apiKey);
    
    await db
      .update(sessions)
      .set({
        apiKeyHash: hash,
        lastActivity: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    console.log(`API key stored for session: ${sessionId}`);
  }

  /**
   * Get API key for a session (if stored and valid)
   */
  async getSessionApiKey(sessionId: string, providedApiKey?: string): Promise<string | null> {
    const result = await db
      .select({
        apiKeyHash: sessions.apiKeyHash,
      })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)))
      .limit(1);

    if (result.length === 0 || !result[0].apiKeyHash) {
      return null;
    }

    // If no API key provided to verify, we can't return the actual key
    // This is by design for security - we only store hashed versions
    if (!providedApiKey) {
      return null;
    }

    const isValid = await verifyApiKey(providedApiKey, result[0].apiKeyHash);

    return isValid ? providedApiKey : null;
  }

  /**
   * Update last activity timestamp for a session
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ lastActivity: new Date() })
      .where(eq(sessions.id, sessionId));
  }

  /**
   * Clear/deactivate a session
   */
  async clearSession(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ 
        isActive: false,
        apiKeyHash: null,
      })
      .where(eq(sessions.id, sessionId));

    // Also clean up any associated access tokens
    await db
      .delete(accessTokens)
      .where(eq(accessTokens.sessionId, sessionId));

    console.log(`Session ${sessionId} cleared and deactivated`);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(maxAgeHours: number = 24): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    const result = await db
      .update(sessions)
      .set({ isActive: false })
      .where(and(
        eq(sessions.isActive, true),
        gte(sessions.lastActivity, cutoffTime)
      ));

    console.log(`Cleaned up expired sessions older than ${maxAgeHours} hours`);
    return 0; // Drizzle doesn't return rowCount in the same way
  }

  /**
   * Get session count for monitoring
   */
  async getActiveSessionCount(): Promise<number> {
    const result = await db
      .select({ count: sessions.id })
      .from(sessions)
      .where(eq(sessions.isActive, true));

    return result.length;
  }
}

export const sessionManager = new DatabaseSessionManager();