import type { v0 } from "v0-sdk";

// Extract types from v0-sdk
export type ChatCreateResponse = Awaited<ReturnType<typeof v0.chats.create>>;
export type ChatSendMessageResponse = Awaited<
  ReturnType<typeof v0.chats.sendMessage>
>;
export type ChatFindResponse = Awaited<ReturnType<typeof v0.chats.find>>;
export type ChatFavoriteResponse = Awaited<
  ReturnType<typeof v0.chats.favorite>
>;
export type ChatInitResponse = Awaited<ReturnType<typeof v0.chats.init>>;
export type ChatGetByIdResponse = Awaited<ReturnType<typeof v0.chats.getById>>;

// Extract file types from the responses
export type V0File = NonNullable<ChatCreateResponse["files"]>[number];
export type V0ChatFile = V0File;

// New file structure from latestVersion
export type V0LatestVersionFile = NonNullable<
  ChatCreateResponse["latestVersion"]
>["files"][number];

// Generic result type for v0 operations
export interface V0Result<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  rawResponse?: any;
}

// Session storage types
export interface SessionFile {
  id: string;
  sessionId: string;
  chatId: string;
  messageId?: string;
  file: V0File | V0LatestVersionFile; // Support both old and new file formats
  createdAt: Date;
  uri: string; // MCP resource URI
  isLatestVersion?: boolean; // Flag to indicate if from latestVersion
}

export interface FileStats {
  totalFiles: number;
  byLanguage: Record<string, number>;
  byChatId: Record<string, number>;
}

export interface SessionData {
  lastChatId?: string;
  files: SessionFile[];
  stats: FileStats;
  updatedAt: Date;
}
