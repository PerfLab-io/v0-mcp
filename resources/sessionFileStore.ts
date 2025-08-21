import { API_KV } from "@/lib/kv-storage";
import {
  V0File,
  V0LatestVersionFile,
  NormalizedFile,
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
      // Normalize the file to our standard structure
      const normalizedFile = this.normalizeFile(file);

      // Create unique file identifier based on content hash to avoid duplicates
      const contentHash = this.hashContent(normalizedFile.content);
      const fileId = `${chatId}_${contentHash}`;
      const uri = `v0://session/${sessionId}/files/${fileId}`;

      // Check if file already exists in session
      const existingFile = sessionFileList.find((sf) => {
        return (
          sf.file.content === normalizedFile.content &&
          sf.file.language === normalizedFile.language
        );
      });

      if (!existingFile) {
        const sessionFile: SessionFile = {
          id: fileId,
          sessionId,
          chatId,
          messageId,
          file: normalizedFile,
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
        file.file.language || this.getLanguageFromFileName(file.file.name);
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

  private normalizeFile(file: V0File | V0LatestVersionFile): NormalizedFile {
    if (this.isLatestVersionFile(file)) {
      // Already in the new format, just ensure language is set
      return {
        object: "file",
        name: file.name,
        content: file.content,
        locked: file.locked,
        language: this.getLanguageFromFileName(file.name),
      };
    } else {
      // Legacy format - normalize it
      const oldFile = file as V0File;
      const fileName = this.inferFileName(oldFile);

      return {
        object: "file",
        name: fileName,
        content: oldFile.source,
        locked: false, // Legacy files default to unlocked
        language: oldFile.lang,
      };
    }
  }

  private isLatestVersionFile(file: any): file is V0LatestVersionFile {
    return (
      file &&
      typeof file === "object" &&
      "object" in file &&
      file.object === "file"
    );
  }

  private inferFileName(file: V0File): string {
    // Try to get filename from meta
    if (file.meta?.filename) {
      return file.meta.filename;
    }

    // Generate a reasonable filename based on language
    const langToExt: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      ruby: "rb",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      csharp: "cs",
      php: "php",
      swift: "swift",
      kotlin: "kt",
      rust: "rs",
      html: "html",
      css: "css",
      scss: "scss",
      sass: "sass",
      less: "less",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      markdown: "md",
      bash: "sh",
      powershell: "ps1",
      sql: "sql",
      vue: "vue",
      svelte: "svelte",
      text: "txt",
    };

    const ext = langToExt[file.lang] || file.lang;
    // Generate a simple filename with timestamp to ensure uniqueness
    return `file_${Date.now()}.${ext}`;
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
