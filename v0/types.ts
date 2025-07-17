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

// Extract file types from the responses
export type V0File = NonNullable<ChatCreateResponse["files"]>[number];

// Session storage types
export interface SessionFile {
  id: string;
  sessionId: string;
  chatId: string;
  messageId?: string;
  file: V0File;
  createdAt: Date;
  uri: string; // MCP resource URI
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
