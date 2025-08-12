import type { LogNotification } from "@/types/mcp-logging";

interface SSEWriter {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

interface SSEConnection {
  sessionId: string;
  writer: SSEWriter;
  connectedAt: Date;
}

class SSEManager {
  private connections = new Map<string, SSEConnection>();
  private encoder = new TextEncoder();

  /**
   * Add a new SSE connection for a session
   */
  addConnection(sessionId: string, writer: SSEWriter): void {
    this.removeConnection(sessionId);

    this.connections.set(sessionId, {
      sessionId,
      writer,
      connectedAt: new Date(),
    });

    console.log(`SSE connection added for session: ${sessionId}`);
  }

  /**
   * Remove SSE connection for a session
   */
  async removeConnection(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (connection) {
      try {
        await connection.writer.close();
      } catch (error) {
        console.warn(
          `Error closing SSE connection for session ${sessionId}:`,
          error,
        );
      }
      this.connections.delete(sessionId);
      console.log(`SSE connection removed for session: ${sessionId}`);
    }
  }

  /**
   * Send a notification to a specific session's SSE stream
   */
  async sendNotification(
    sessionId: string,
    notification: LogNotification,
  ): Promise<boolean> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      return false;
    }

    try {
      const eventData = `data: ${JSON.stringify(notification)}\n\n`;
      await connection.writer.write(this.encoder.encode(eventData));
      return true;
    } catch (error) {
      console.error(
        `Failed to send SSE notification to session ${sessionId}:`,
        error,
      );
      await this.removeConnection(sessionId);
      return false;
    }
  }

  /**
   * Check if a session has an active SSE connection
   */
  hasConnection(sessionId: string): boolean {
    return this.connections.has(sessionId);
  }

  /**
   * Get connection stats
   */
  getStats(): {
    totalConnections: number;
    connectionsBySession: Record<string, string>;
  } {
    const connectionsBySession: Record<string, string> = {};

    for (const [sessionId, connection] of this.connections.entries()) {
      connectionsBySession[sessionId] = connection.connectedAt.toISOString();
    }

    return {
      totalConnections: this.connections.size,
      connectionsBySession,
    };
  }

  /**
   * Clean up stale connections (older than 1 hour)
   */
  async cleanup(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [sessionId, connection] of this.connections.entries()) {
      if (connection.connectedAt < oneHourAgo) {
        await this.removeConnection(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

export const sseManager = new SSEManager();
