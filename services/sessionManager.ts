import { randomUUID } from "crypto";
import { eq, and, gte } from "drizzle-orm";
import { db } from "../drizzle/index.js";
import { sessions, accessTokens } from "../drizzle/schema.js";
import { encryptApiKey, decryptApiKey } from "../utils/crypto.js";

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
      hasApiKey: Boolean(session.encryptedApiKey),
    };
  }

  /**
   * Store API key for a session (encrypted using client_id)
   */
  async setSessionApiKey(sessionId: string, apiKey: string): Promise<void> {
    // Get the session to retrieve clientId for encryption
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Use clientId or sessionId as encryption key if clientId is not available
    const encryptionKey = session.clientId || sessionId;
    const encryptedApiKey = encryptApiKey(apiKey, encryptionKey);
    
    await db
      .update(sessions)
      .set({
        encryptedApiKey: encryptedApiKey,
        lastActivity: new Date(),
      })
      .where(eq(sessions.id, sessionId));

    console.log(`API key stored for session: ${sessionId}`);
  }

  /**
   * Get API key for a session (if stored and valid)
   */
  async getSessionApiKey(sessionId: string): Promise<string | null> {
    const result = await db
      .select({
        encryptedApiKey: sessions.encryptedApiKey,
        clientId: sessions.clientId,
      })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.isActive, true)))
      .limit(1);

    if (result.length === 0 || !result[0].encryptedApiKey) {
      return null;
    }

    try {
      // Use clientId or sessionId as decryption key
      const decryptionKey = result[0].clientId || sessionId;
      const apiKey = decryptApiKey(result[0].encryptedApiKey, decryptionKey);
      return apiKey;
    } catch (error) {
      console.error(`Failed to decrypt API key for session ${sessionId}:`, error);
      return null;
    }
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
        encryptedApiKey: null,
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