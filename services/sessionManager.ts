import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../drizzle/index";
import { sessions } from "../drizzle/schema";

export interface SessionData {
  id: string;
  clientId?: string;
  clientName?: string;
  clientVersion?: string;
  clientType: "mcpserver" | "generic";
  createdAt: Date;
  lastActivity: Date;
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
    clientInfo?: ClientInfo,
    oauthClientId?: string
  ): Promise<SessionData> {
    console.log(
      "createOrGetSession called with:",
      sessionId,
      "clientInfo:",
      clientInfo
    );

    // If sessionId provided, try to find existing session
    if (sessionId) {
      const existingSession = await this.getSession(sessionId);
      if (existingSession) {
        console.log(
          "Found existing session:",
          existingSession.id,
          "clientType:",
          existingSession.clientType
        );
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
      clientId: oauthClientId || null,
      clientName: clientInfo?.name || null,
      clientVersion: clientInfo?.version || null,
      clientType,
      createdAt: new Date(),
      lastActivity: new Date(),
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
    };
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
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
    };
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
   * Clear/delete a session
   */
  async clearSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));

    console.log(`Session ${sessionId} deleted`);
  }

  /**
   * Get session count for monitoring
   */
  async getActiveSessionCount(): Promise<number> {
    const result = await db.select({ count: sessions.id }).from(sessions);

    return result.length;
  }
}

export const sessionManager = new DatabaseSessionManager();
