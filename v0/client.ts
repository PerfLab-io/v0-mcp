import { createClient } from "v0-sdk";

class SessionApiKeyStore {
  private static instance: SessionApiKeyStore;
  private sessionKeys = new Map<string, string>();
  private currentSessionId: string | null = null;

  static getInstance(): SessionApiKeyStore {
    if (!SessionApiKeyStore.instance) {
      SessionApiKeyStore.instance = new SessionApiKeyStore();
    }
    return SessionApiKeyStore.instance;
  }

  setSessionApiKey(sessionId: string, apiKey: string): void {
    this.sessionKeys.set(sessionId, apiKey);
  }

  getSessionApiKey(sessionId: string): string | undefined {
    return this.sessionKeys.get(sessionId);
  }

  setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  getCurrentSessionApiKey(): string | undefined {
    if (!this.currentSessionId) return undefined;
    return this.sessionKeys.get(this.currentSessionId);
  }

  getCurrentSessionId(): string | undefined {
    return this.currentSessionId || undefined;
  }

  clearSession(sessionId: string): void {
    this.sessionKeys.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }
}

export const sessionApiKeyStore = SessionApiKeyStore.getInstance();
class V0ClientManager {
  private static instance: V0ClientManager;
  private client: ReturnType<typeof createClient> | null = null;

  static getInstance(): V0ClientManager {
    if (!V0ClientManager.instance) {
      V0ClientManager.instance = new V0ClientManager();
    }
    return V0ClientManager.instance;
  }

  getClient(): ReturnType<typeof createClient> {
    if (!this.client) {
      this.client = this.createV0Client();
    }
    return this.client;
  }

  private createV0Client(): ReturnType<typeof createClient> {
    const sessionApiKey = sessionApiKeyStore.getCurrentSessionApiKey();
    const apiKey = sessionApiKey || process.env.V0_API_KEY_FOR_MY_ORG;

    return createClient({
      apiKey: apiKey,
    });
  }

  // Method to refresh the client when session changes
  refreshClient(): void {
    this.client = this.createV0Client();
  }
}

export const v0ClientManager = V0ClientManager.getInstance();
