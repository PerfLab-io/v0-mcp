import { API_KV } from "@/lib/kv-storage";
import { V0File, SessionFile, SessionData, FileStats } from "@/v0/types";

class SessionFileStore {
  private static instance: SessionFileStore;
  private sessionFiles = new Map<string, SessionFile[]>(); // sessionId -> files
  private fileIndex = new Map<string, SessionFile>(); // uri -> file
  private lastChatIds = new Map<string, string>(); // sessionId -> lastChatId

  static getInstance(): SessionFileStore {
    if (!SessionFileStore.instance) {
      SessionFileStore.instance = new SessionFileStore();
    }
    return SessionFileStore.instance;
  }

  async addFilesFromChat(sessionId: string, chatId: string, files: V0File[], messageId?: string): Promise<SessionFile[]> {
    // Update last chat ID
    await this.setLastChatId(sessionId, chatId);
    const sessionFileList = this.sessionFiles.get(sessionId) || [];
    const addedFiles: SessionFile[] = [];

    for (const file of files) {
      // Create unique file identifier based on content hash to avoid duplicates
      const contentHash = this.hashContent(file.source);
      const fileId = `${chatId}_${contentHash}`;
      const uri = `v0://session/${sessionId}/files/${fileId}`;

      // Check if file already exists in session
      const existingFile = sessionFileList.find(sf => 
        sf.file.source === file.source && 
        sf.file.lang === file.lang
      );

      if (!existingFile) {
        const sessionFile: SessionFile = {
          id: fileId,
          sessionId,
          chatId,
          messageId,
          file,
          createdAt: new Date(),
          uri,
        };

        sessionFileList.push(sessionFile);
        this.fileIndex.set(uri, sessionFile);
        addedFiles.push(sessionFile);
      }
    }

    this.sessionFiles.set(sessionId, sessionFileList);
    
    // Cache to KV
    await this.cacheSessionData(sessionId);
    
    return addedFiles;
  }

  async getSessionFiles(sessionId: string): Promise<SessionFile[]> {
    // Try memory first
    let files = this.sessionFiles.get(sessionId);
    
    if (!files) {
      // Load from KV cache
      await this.loadSessionData(sessionId);
      files = this.sessionFiles.get(sessionId) || [];
    }
    
    return files;
  }

  getFileByUri(uri: string): SessionFile | undefined {
    return this.fileIndex.get(uri);
  }

  async getChatFiles(sessionId: string, chatId: string): Promise<SessionFile[]> {
    const sessionFiles = await this.getSessionFiles(sessionId);
    return sessionFiles.filter(file => file.chatId === chatId);
  }

  async clearSession(sessionId: string): Promise<void> {
    const sessionFiles = this.sessionFiles.get(sessionId) || [];
    
    // Remove from file index
    for (const file of sessionFiles) {
      this.fileIndex.delete(file.uri);
    }
    
    // Remove session files
    this.sessionFiles.delete(sessionId);
    this.lastChatIds.delete(sessionId);
    
    // Clear KV cache
    await API_KV.delete(`session:${sessionId}:data`);
  }

  async getFileStats(sessionId: string): Promise<FileStats> {
    const files = await this.getSessionFiles(sessionId);
    const byLanguage: Record<string, number> = {};
    const byChatId: Record<string, number> = {};

    for (const file of files) {
      byLanguage[file.file.lang] = (byLanguage[file.file.lang] || 0) + 1;
      byChatId[file.chatId] = (byChatId[file.chatId] || 0) + 1;
    }

    return {
      totalFiles: files.length,
      byLanguage,
      byChatId,
    };
  }

  async getLastChatId(sessionId: string): Promise<string | undefined> {
    let lastChatId = this.lastChatIds.get(sessionId);
    
    if (!lastChatId) {
      await this.loadSessionData(sessionId);
      lastChatId = this.lastChatIds.get(sessionId);
    }
    
    return lastChatId;
  }

  async setLastChatId(sessionId: string, chatId: string): Promise<void> {
    this.lastChatIds.set(sessionId, chatId);
    await this.cacheSessionData(sessionId);
  }

  private async cacheSessionData(sessionId: string): Promise<void> {
    try {
      const files = this.sessionFiles.get(sessionId) || [];
      const lastChatId = this.lastChatIds.get(sessionId);
      const stats = await this.getFileStats(sessionId);
      
      const sessionData: SessionData = {
        lastChatId,
        files,
        stats,
        updatedAt: new Date(),
      };
      
      await API_KV.put(`session:${sessionId}:data`, sessionData, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days TTL
      });
    } catch (error) {
      console.error('Failed to cache session data:', error);
    }
  }

  private async loadSessionData(sessionId: string): Promise<void> {
    try {
      const sessionData = await API_KV.get(`session:${sessionId}:data`) as SessionData | null;
      
      if (sessionData) {
        this.sessionFiles.set(sessionId, sessionData.files);
        
        if (sessionData.lastChatId) {
          this.lastChatIds.set(sessionId, sessionData.lastChatId);
        }
        
        // Rebuild file index
        for (const file of sessionData.files) {
          this.fileIndex.set(file.uri, file);
        }
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  }

  private hashContent(content: string): string {
    // Simple hash function for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export const sessionFileStore = SessionFileStore.getInstance();