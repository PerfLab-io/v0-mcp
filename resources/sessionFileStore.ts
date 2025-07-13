import { randomUUID } from "crypto";

export interface V0File {
  lang: string;
  meta: Record<string, any>;
  source: string;
}

export interface SessionFile {
  id: string;
  sessionId: string;
  chatId: string;
  messageId?: string;
  file: V0File;
  createdAt: Date;
  uri: string; // MCP resource URI
}

class SessionFileStore {
  private static instance: SessionFileStore;
  private sessionFiles = new Map<string, SessionFile[]>(); // sessionId -> files
  private fileIndex = new Map<string, SessionFile>(); // uri -> file

  static getInstance(): SessionFileStore {
    if (!SessionFileStore.instance) {
      SessionFileStore.instance = new SessionFileStore();
    }
    return SessionFileStore.instance;
  }

  addFilesFromChat(sessionId: string, chatId: string, files: V0File[], messageId?: string): SessionFile[] {
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
    return addedFiles;
  }

  getSessionFiles(sessionId: string): SessionFile[] {
    return this.sessionFiles.get(sessionId) || [];
  }

  getFileByUri(uri: string): SessionFile | undefined {
    return this.fileIndex.get(uri);
  }

  getChatFiles(sessionId: string, chatId: string): SessionFile[] {
    const sessionFiles = this.sessionFiles.get(sessionId) || [];
    return sessionFiles.filter(file => file.chatId === chatId);
  }

  clearSession(sessionId: string): void {
    const sessionFiles = this.sessionFiles.get(sessionId) || [];
    
    // Remove from file index
    for (const file of sessionFiles) {
      this.fileIndex.delete(file.uri);
    }
    
    // Remove session files
    this.sessionFiles.delete(sessionId);
  }

  getFileStats(sessionId: string): { totalFiles: number; byLanguage: Record<string, number>; byChatId: Record<string, number> } {
    const files = this.getSessionFiles(sessionId);
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