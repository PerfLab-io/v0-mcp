import {
  createChat,
  getUserInfo,
  createProject,
  createMessage,
  findChats,
  favoriteChat,
  getChatById,
  initChat,
} from "@/v0/index";
import { sessionFileStore } from "@/resources/sessionFileStore";
import { getMimeType } from "@/lib/utils";
import { v0Prompts, getPromptContent } from "@/prompts/index";
import {
  trackToolUsage,
  trackPromptUsage,
  trackResourceUsage,
  trackError,
} from "@/lib/analytics.server";
import { mcpLogger } from "@/lib/mcp-logging";
import { LogLevel, isValidLogLevel } from "@/types/mcp-logging";
import {
  MCPError,
  MCPErrors,
  withErrorHandling,
  validateRequired,
  validateType,
} from "@/lib/mcp-errors";

export interface MCPSuccess {
  jsonrpc: "2.0";
  id: number;
  result: any;
}

export interface MCPErrorResponse {
  jsonrpc: "2.0";
  id: number;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

export type MCPResponse = MCPSuccess | MCPErrorResponse;

export interface MCPHandlerContext {
  token: string;
  tokenData: any;
  params: any;
  id: number;
}

export interface MCPHandler {
  (context: MCPHandlerContext): Promise<MCPResponse>;
}

// Helper function to extract language from filename
function getLanguageFromFileName(fileName: string): string {
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
  };
  return extMap[ext || ""] || ext || "text";
}

function createSuccessResponse(id: number, result: any): MCPSuccess {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function createErrorResponse(id: number, error: MCPError): MCPErrorResponse {
  return error.toMCPResponse(id) as MCPErrorResponse;
}

export const handleInitialize: MCPHandler = async (context) => {
  return createSuccessResponse(context.id, {
    protocolVersion: "2025-06-18",
    capabilities: {
      resources: {
        subscribe: false,
        listChanged: false,
      },
      tools: {
        listChanged: false,
      },
      prompts: {
        listChanged: false,
      },
      logging: {
        streamable: true,
      },
    },
    serverInfo: {
      name: "v0-mcp",
      version: "1.1.0",
    },
  });
};

export const handleNotificationsInitialized: MCPHandler = async (context) => {
  return createSuccessResponse(context.id, {});
};

export const handleLoggingSetLevel: MCPHandler = async (context) => {
  return withErrorHandling(
    async () => {
      const { level } = context.params as { level: string };
      validateRequired(level, "level");
      if (!isValidLogLevel(level)) {
        const validLevels = [
          "emergency",
          "alert",
          "critical",
          "error",
          "warning",
          "notice",
          "info",
          "debug",
        ];
        throw MCPErrors.invalidLogLevel(level, validLevels);
      }
      const sessionId = context.token;
      await mcpLogger.setLogLevel(sessionId, level as LogLevel);
      await mcpLogger.info(sessionId, "mcp-server", {
        message: "Log level changed",
        newLevel: level,
        timestamp: new Date().toISOString(),
      });

      return createSuccessResponse(context.id, {});
    },
    {
      operationName: "logging/setLevel",
      sessionId: context.token,
      onError: () => trackError("logging_setlevel_failed", context.token),
    },
  );
};

export const handleToolsList: MCPHandler = async (context) => {
  return createSuccessResponse(context.id, {
    tools: [
      {
        name: "create_chat",
        description: "Create a new v0 chat session with AI",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to send to v0",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "get_user_info",
        description: "Retrieve user information from v0",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_project",
        description: "Create a new project in v0",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the project",
            },
            description: {
              type: "string",
              description: "The description of the project",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "create_message",
        description: "Add a new message to an existing v0 chat",
        inputSchema: {
          type: "object",
          properties: {
            chatId: {
              type: "string",
              description: "The ID of the chat to add a message to",
            },
            message: {
              type: "string",
              description: "The message content to send",
            },
          },
          required: ["chatId", "message"],
        },
      },
      {
        name: "find_chats",
        description: "Search and list v0 chats with optional filtering",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "string",
              description: "Maximum number of chats to return",
            },
            offset: {
              type: "string",
              description: "Number of chats to skip for pagination",
            },
            isFavorite: {
              type: "string",
              description: "Filter by favorite status (true/false)",
            },
          },
        },
      },
      {
        name: "favorite_chat",
        description: "Mark a v0 chat as favorite or remove from favorites",
        inputSchema: {
          type: "object",
          properties: {
            chatId: {
              type: "string",
              description: "The ID of the chat to favorite/unfavorite",
            },
            isFavorite: {
              type: "boolean",
              description:
                "Whether to favorite (true) or unfavorite (false) the chat",
            },
          },
          required: ["chatId", "isFavorite"],
        },
      },
      {
        name: "list_files",
        description:
          "List files from a specific v0 chat. Automatically fetches files from v0 if not already cached locally. Returns code files, components, and other generated content from the chat.",
        inputSchema: {
          type: "object",
          properties: {
            chatId: {
              type: "string",
              description:
                "The chat ID to list files from (required). Use find_chats to discover available chat IDs.",
            },
            language: {
              type: "string",
              description:
                "Optional filter by programming language (e.g., 'typescript', 'python', 'jsx', 'css')",
            },
            includeStats: {
              type: "boolean",
              description:
                "Include file statistics and metadata in the response (optional, default: false)",
            },
          },
          required: ["chatId"],
        },
      },
      {
        name: "get_chat_by_id",
        description:
          "Retrieve a specific v0 chat by ID and populate sessionfilestore with its files",
        inputSchema: {
          type: "object",
          properties: {
            chatId: {
              type: "string",
              description: "The ID of the chat to retrieve",
            },
          },
          required: ["chatId"],
        },
      },
      {
        name: "init_chat",
        description:
          "Initialize a new v0 chat from existing files. If not provided by the user, ask what directory or list of files you should get the contents of to send over.",
        inputSchema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              description: "Array of files to initialize the chat with",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "The name of the file",
                  },
                  content: {
                    type: "string",
                    description:
                      "The content of the file (use this OR url, not both)",
                  },
                  url: {
                    type: "string",
                    description:
                      "The URL of the file (use this OR content, not both)",
                  },
                },
                required: ["name"],
              },
            },
            chatPrivacy: {
              type: "string",
              enum: ["public", "private", "team-edit", "team", "unlisted"],
              description: "Chat privacy setting",
            },
            projectId: {
              type: "string",
              description: "Project ID to associate with the chat",
            },
          },
          required: ["files"],
        },
      },
    ],
  });
};

export const handleToolsCall: MCPHandler = async (context) => {
  return withErrorHandling(
    async () => {
      const toolName = validateRequired(context.params?.name, "name");
      const args = context.params?.arguments || {};
      await trackToolUsage(toolName, context.token);
      await mcpLogger.debug(context.token, "tool-execution", {
        message: "Tool execution started",
        toolName,
        args: Object.keys(args),
        timestamp: new Date().toISOString(),
      });

      let result;

      switch (toolName) {
        case "create_chat":
          result = await createChat(args);
          break;
        case "get_user_info":
          result = await getUserInfo();
          break;
        case "create_project":
          result = await createProject(args);
          break;
        case "create_message":
          result = await createMessage(args);
          break;
        case "find_chats":
          result = await findChats(args);
          console.log("findChats result", result);
          break;
        case "favorite_chat":
          result = await favoriteChat(args);
          break;
        case "list_files":
          const chatId = validateRequired(args.chatId, "chatId");
          validateType(chatId, "string", "chatId");

          const sessionId = context.token;
          let sessionFiles = await sessionFileStore.getSessionFiles(sessionId);
          let chatFiles = sessionFiles.filter(
            (file) => file.chatId === args.chatId,
          );
          if (chatFiles.length === 0) {
            await mcpLogger.debug(context.token, "tool-execution", {
              message: "No files found for chatId, auto-fetching from v0",
              chatId: args.chatId,
              timestamp: new Date().toISOString(),
            });

            try {
              await getChatById({ chatId: args.chatId });
              sessionFiles = await sessionFileStore.getSessionFiles(sessionId);
              chatFiles = sessionFiles.filter(
                (file) => file.chatId === args.chatId,
              );

              await mcpLogger.info(context.token, "tool-execution", {
                message:
                  "Successfully auto-fetched and populated files from v0",
                chatId: args.chatId,
                filesFound: chatFiles.length,
                timestamp: new Date().toISOString(),
              });
            } catch (fetchError: any) {
              await mcpLogger.error(context.token, "tool-execution", {
                message: "Failed to auto-fetch files from v0",
                chatId: args.chatId,
                error: fetchError.message,
                timestamp: new Date().toISOString(),
              });

              // Return empty result with error info instead of throwing
              result = {
                success: false,
                error: `Failed to fetch files for chat ${args.chatId}: ${fetchError.message}`,
                result: { files: [], chatId: args.chatId },
                rawResponse: { error: fetchError.message },
              };
              console.log("listFiles result (error)", result);
              break;
            }
          }

          if (args.language) {
            chatFiles = chatFiles.filter((file) => {
              const fileLang =
                file.file.language || getLanguageFromFileName(file.file.name);
              return fileLang.toLowerCase() === args.language.toLowerCase();
            });
          }

          const files = chatFiles.map((file) => {
            // All files are now normalized to the same structure
            return {
              id: file.id,
              filename: file.file.name,
              language:
                file.file.language || getLanguageFromFileName(file.file.name),
              source: file.file.content,
              chatId: file.chatId,
              uri: file.uri,
              createdAt: file.createdAt,
              messageId: file.messageId,
              locked: file.file.locked,
              isFromLatestVersion: file.isLatestVersion || false,
            };
          });
          const responseData: any = {
            files,
            chatId: args.chatId,
            totalFiles: files.length,
          };
          if (args.language) {
            responseData.filteredByLanguage = args.language;
          }
          if (args.includeStats) {
            const stats = await sessionFileStore.getFileStats(sessionId);
            responseData.stats = stats;
          }

          result = {
            success: true,
            result: responseData,
            rawResponse: responseData,
          };
          console.log("listFiles result", result);
          break;
        case "get_chat_by_id":
          result = await getChatById(args);
          break;
        case "init_chat":
          result = await initChat(args);
          break;
        default:
          throw MCPErrors.resourceNotFound("tool", toolName);
      }

      await mcpLogger.info(context.token, "tool-execution", {
        message: "Tool execution completed successfully",
        toolName,
        timestamp: new Date().toISOString(),
      });

      return createSuccessResponse(context.id, {
        content: [
          { type: "text", text: JSON.stringify(result.result, null, 2) },
        ],
      });
    },
    {
      operationName: `tools/call:${context.params?.name || "unknown"}`,
      sessionId: context.token,
      onError: (error) => {
        trackError("tool_execution_failed", context.params?.name || "unknown");
        mcpLogger.error(context.token, "tool-execution", {
          message: "Tool execution failed",
          toolName: context.params?.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        });
      },
    },
  );
};

export const handlePromptsList: MCPHandler = async (context) => {
  return createSuccessResponse(context.id, {
    prompts: v0Prompts.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments || [],
    })),
  });
};

export const handlePromptsGet: MCPHandler = async (context) => {
  try {
    const promptName = context.params?.name;
    const promptArgs = context.params?.arguments || {};

    if (!promptName) {
      return createErrorResponse(
        context.id,
        MCPErrors.invalidParams("Missing prompt name"),
      );
    }
    await trackPromptUsage(promptName, context.token);

    const promptContent = await getPromptContent(promptName, promptArgs);

    return createSuccessResponse(context.id, {
      description: `Generated prompt for ${promptName}`,
      messages: [promptContent],
    });
  } catch (error: any) {
    await trackError(
      "prompt_generation_failed",
      context.params?.name || "unknown",
    );
    return createErrorResponse(
      context.id,
      MCPErrors.internalError(error.message || "Failed to generate prompt"),
    );
  }
};

export const handleResourcesList: MCPHandler = async (context) => {
  try {
    await trackResourceUsage("list", context.token);

    const sessionFiles = await sessionFileStore.getSessionFiles(context.token);
    const lastChatId = await sessionFileStore.getLastChatId(context.token);

    const resources = [
      {
        uri: "v0://user/config",
        name: "v0 User Configuration",
        description: "User configuration and settings from v0",
        mimeType: "application/json",
      },
      {
        uri: "v0://session/stats",
        name: "Session File Statistics",
        description: "Statistics about files generated in this session",
        mimeType: "application/json",
      },
    ];

    if (lastChatId) {
      resources.push({
        uri: `v0://chats/${lastChatId}`,
        name: `Chat ${lastChatId} Files`,
        description: `Files from the last interacted chat (${lastChatId})`,
        mimeType: "application/json",
      });
    }
    for (const sessionFile of sessionFiles) {
      // All files are now normalized to the same structure
      const language =
        sessionFile.file.language ||
        getLanguageFromFileName(sessionFile.file.name);
      const lockStatus = sessionFile.file.locked ? " (locked)" : "";
      resources.push({
        uri: sessionFile.uri,
        name: sessionFile.file.name,
        description: `${language} file from chat ${sessionFile.chatId}${lockStatus}`,
        mimeType: getMimeType(language),
      });
    }

    return createSuccessResponse(context.id, { resources });
  } catch (error) {
    await trackError("resource_list_failed", "list");
    return createErrorResponse(
      context.id,
      MCPErrors.internalError(
        "Failed to list resources",
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }
};

export const handleResourcesRead: MCPHandler = async (context) => {
  try {
    const uri = context.params?.uri;
    await trackResourceUsage("read", context.token);

    if (uri === "v0://user/config") {
      const userInfo = await getUserInfo();
      return createSuccessResponse(context.id, {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(userInfo.rawResponse, null, 2),
          },
        ],
      });
    }

    if (uri === "v0://session/stats") {
      const stats = await sessionFileStore.getFileStats(context.token);
      return createSuccessResponse(context.id, {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      });
    }

    if (uri?.startsWith("v0://chats/")) {
      const chatId = uri.split("/").pop();
      if (chatId) {
        const chatFiles = await sessionFileStore.getChatFiles(
          context.token,
          chatId,
        );
        const fileList = chatFiles.map((file) => {
          // All files are now normalized to the same structure
          return {
            id: file.id,
            filename: file.file.name,
            language:
              file.file.language || getLanguageFromFileName(file.file.name),
            uri: file.uri,
            createdAt: file.createdAt,
            messageId: file.messageId,
            locked: file.file.locked,
          };
        });

        return createSuccessResponse(context.id, {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify({ chatId, files: fileList }, null, 2),
            },
          ],
        });
      }
    }

    const sessionFile = sessionFileStore.getFileByUri(uri);
    if (sessionFile) {
      // All files are now normalized to the same structure
      const language =
        sessionFile.file.language ||
        getLanguageFromFileName(sessionFile.file.name);

      // Create file content with metadata header
      const contentWithMetadata = `/* File Metadata:
 * Name: ${sessionFile.file.name}
 * Language: ${language}
 * Locked: ${sessionFile.file.locked ? "Yes" : "No"}
 * Chat ID: ${sessionFile.chatId}
 * Created: ${sessionFile.createdAt.toISOString()}
 * URI: ${sessionFile.uri}
 */

${sessionFile.file.content}`;

      return createSuccessResponse(context.id, {
        contents: [
          {
            uri,
            mimeType: getMimeType(language),
            text: sessionFile.file.content,
          },
        ],
      });
    }

    return createErrorResponse(
      context.id,
      MCPErrors.resourceNotFound("resource", uri),
    );
  } catch (error) {
    await trackError("resource_read_failed", "read");
    return createErrorResponse(
      context.id,
      MCPErrors.internalError(
        "Failed to read resource",
        error instanceof Error ? error.message : "Unknown error",
      ),
    );
  }
};

export const MCP_HANDLERS: Record<string, MCPHandler> = {
  initialize: handleInitialize,
  "notifications/initialized": handleNotificationsInitialized,
  "logging/setLevel": handleLoggingSetLevel,
  "tools/list": handleToolsList,
  "tools/call": handleToolsCall,
  "prompts/list": handlePromptsList,
  "prompts/get": handlePromptsGet,
  "resources/list": handleResourcesList,
  "resources/read": handleResourcesRead,
};

export async function executeMCPMethod(
  method: string,
  context: MCPHandlerContext,
): Promise<MCPResponse> {
  return withErrorHandling(
    async () => {
      const handler = MCP_HANDLERS[method];

      if (!handler) {
        throw MCPErrors.methodNotFound(method);
      }

      return await handler(context);
    },
    {
      operationName: `MCP:${method}`,
      sessionId: context.token,
      onError: (error) => {
        console.error(`MCP Method Error (${method}):`, error);
      },
    },
  );
}
