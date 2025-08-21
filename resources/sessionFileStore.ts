import { API_KV } from "@/lib/kv-storage";
import {
  V0File,
  V0LatestVersionFile,
  SessionFile,
  SessionData,
  FileStats,
} from "@/v0/types";

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

  async addFilesFromChat(
    sessionId: string,
    chatId: string,
    files: (V0File | V0LatestVersionFile)[],
    messageId?: string,
    isLatestVersion: boolean = false,
  ): Promise<SessionFile[]> {
    // Update last chat ID
    await this.setLastChatId(sessionId, chatId);
    const sessionFileList = this.sessionFiles.get(sessionId) || [];
    const addedFiles: SessionFile[] = [];

    for (const file of files) {
      // Handle both old V0File format and new V0LatestVersionFile format
      const fileContent = "content" in file ? file.content : file.source;
      const fileLang =
        "name" in file ? this.getLanguageFromFileName(file.name) : file.lang;

      // Create unique file identifier based on content hash to avoid duplicates
      const contentHash = this.hashContent(fileContent);
      const fileId = `${chatId}_${contentHash}`;
      const uri = `v0://session/${sessionId}/files/${fileId}`;

      // Check if file already exists in session
      const existingFile = sessionFileList.find((sf) => {
        const sfContent =
          "content" in sf.file ? sf.file.content : sf.file.source;
        const sfLang =
          "name" in sf.file
            ? this.getLanguageFromFileName(sf.file.name)
            : sf.file.lang;
        return sfContent === fileContent && sfLang === fileLang;
      });

      if (!existingFile) {
        const sessionFile: SessionFile = {
          id: fileId,
          sessionId,
          chatId,
          messageId,
          file,
          createdAt: new Date(),
          uri,
          isLatestVersion,
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

  async getChatFiles(
    sessionId: string,
    chatId: string,
  ): Promise<SessionFile[]> {
    const sessionFiles = await this.getSessionFiles(sessionId);
    return sessionFiles.filter((file) => file.chatId === chatId);
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
      const lang =
        "name" in file.file
          ? this.getLanguageFromFileName(file.file.name)
          : file.file.lang;
      byLanguage[lang] = (byLanguage[lang] || 0) + 1;
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
      console.error("Failed to cache session data:", error);
    }
  }

  private async loadSessionData(sessionId: string): Promise<void> {
    try {
      const sessionData = (await API_KV.get(
        `session:${sessionId}:data`,
      )) as SessionData | null;

      if (sessionData) {
        // Convert date strings back to Date objects for files
        const filesWithDates = sessionData.files.map((file) => ({
          ...file,
          createdAt: new Date(file.createdAt), // Convert string back to Date
        }));

        this.sessionFiles.set(sessionId, filesWithDates);

        if (sessionData.lastChatId) {
          this.lastChatIds.set(sessionId, sessionData.lastChatId);
        }

        // Rebuild file index with converted files
        for (const file of filesWithDates) {
          this.fileIndex.set(file.uri, file);
        }
      }
    } catch (error) {
      console.error("Failed to load session data:", error);
    }
  }

  private hashContent(content: string): string {
    // Simple hash function for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getLanguageFromFileName(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const extMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      rb: "ruby",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      swift: "swift",
      kt: "kotlin",
      rs: "rust",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
      md: "markdown",
      sh: "bash",
      bash: "bash",
      zsh: "bash",
      fish: "bash",
      ps1: "powershell",
      sql: "sql",
      vue: "vue",
      svelte: "svelte",
      txt: "text",
      svg: "svg",
      mdx: "markdown",
    };
    return extMap[ext || ""] || ext || "text";
  }
}

export const sessionFileStore = SessionFileStore.getInstance();
