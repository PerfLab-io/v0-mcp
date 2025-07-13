#!/usr/bin/env node
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomUUID } from "crypto";
import {
  createChat,
  createChatSchema,
  getUserInfo,
  getUserInfoSchema,
  createProject,
  createProjectSchema,
  createMessage,
  createMessageSchema,
  findChats,
  findChatsSchema,
  favoriteChat,
  favoriteChatSchema,
  listFiles,
  listFilesSchema,
} from "../v0/index.js";
import { sessionApiKeyStore } from "../v0/client.js";
import { oauthProvider, oauthRouter } from "./oauth-provider.js";
import { v0Prompts, getPromptContent } from "../prompts/index.js";
import { sessionFileStore } from "../resources/sessionFileStore.js";
import { sessionManager } from "../services/sessionManager.js";
interface Session {
  id: string;
  server: McpServer;
  createdAt: Date;
  lastActivity: Date;
  sseController?: ReadableStreamDefaultController<Uint8Array>;
  clientType: "mcpserver" | "generic";
  clientInfo?: {
    name: string;
    version: string;
  };
}

const sseControllers = new Map<string, ReadableStreamDefaultController<Uint8Array>>();

// Helper function to get MIME type from language
function getMimeType(language: string): string {
  const mimeTypes: Record<string, string> = {
    javascript: "text/javascript",
    typescript: "text/typescript",
    jsx: "text/jsx",
    tsx: "text/tsx",
    html: "text/html",
    css: "text/css",
    json: "application/json",
    python: "text/x-python",
    java: "text/x-java-source",
    cpp: "text/x-c++src",
    c: "text/x-csrc",
    rust: "text/x-rust",
    go: "text/x-go",
    php: "text/x-php",
    ruby: "text/x-ruby",
    shell: "text/x-shellscript",
    bash: "text/x-shellscript",
    sql: "text/x-sql",
    xml: "text/xml",
    yaml: "text/yaml",
    yml: "text/yaml",
    markdown: "text/markdown",
    md: "text/markdown",
  };

  return mimeTypes[language.toLowerCase()] || "text/plain";
}

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "v0-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "create_chat",
    {
      title: "Create v0 Chat",
      description: "Create a new v0 chat session with AI",
      inputSchema: createChatSchema.shape,
    },
    async (args) => {
      const response = await createChat(args);
      return response.result;
    }
  );

  server.registerTool(
    "get_user_info",
    {
      title: "Get v0 User Info",
      description: "Retrieve user information from v0",
      inputSchema: getUserInfoSchema.shape,
    },
    async (args) => {
      const response = await getUserInfo();
      return response.result;
    }
  );

  server.registerTool(
    "create_project",
    {
      title: "Create v0 Project",
      description: "Create a new project in v0",
      inputSchema: createProjectSchema.shape,
    },
    async (args) => {
      const response = await createProject(args);
      return response.result;
    }
  );

  server.registerTool(
    "create_message",
    {
      title: "Create v0 Chat Message",
      description: "Add a new message to an existing v0 chat",
      inputSchema: createMessageSchema.shape,
    },
    async (args) => {
      const response = await createMessage(args);
      return response.result;
    }
  );

  server.registerTool(
    "find_chats",
    {
      title: "Find v0 Chats",
      description: "Search and list v0 chats with optional filtering",
      inputSchema: findChatsSchema.shape,
    },
    async (args) => {
      const response = await findChats(args);
      return response.result;
    }
  );

  server.registerTool(
    "favorite_chat",
    {
      title: "Favorite/Unfavorite v0 Chat",
      description: "Mark a v0 chat as favorite or remove from favorites",
      inputSchema: favoriteChatSchema.shape,
    },
    async (args) => {
      const response = await favoriteChat(args);
      return response.result;
    }
  );

  server.registerTool(
    "list_files",
    {
      title: "List Session Files",
      description:
        "List all files generated in the current session from V0 chats and messages",
      inputSchema: listFilesSchema.shape,
    },
    async (args) => {
      const response = await listFiles(args);
      return response.result;
    }
  );

  server.registerResource(
    "v0-user-config",
    "v0://user/config",
    {
      title: "v0 User Configuration",
      description: "User configuration and settings from v0",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(
            {
              userId: "example-user",
              settings: {
                theme: "dark",
                language: "en",
              },
            },
            null,
            2
          ),
        },
      ],
    })
  );

  server.registerResource(
    "v0-project-info",
    new ResourceTemplate("v0://projects/{projectId}", { list: undefined }),
    {
      title: "v0 Project Information",
      description: "Detailed information about a v0 project",
      mimeType: "application/json",
    },
    async (uri, { projectId }) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(
            {
              projectId,
              name: `Project ${projectId}`,
              status: "active",
              created: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    })
  );

  return server;
}

async function getSession(
  sessionId?: string,
  clientInfo?: { name: string; version: string }
): Promise<Session> {
  console.log("getSession called with:", sessionId, "clientInfo:", clientInfo);

  // Get or create session using database session manager
  const sessionData = await sessionManager.createOrGetSession(sessionId, clientInfo);
  
  console.log(
    "Using session:",
    sessionData.id,
    "clientType:",
    sessionData.clientType
  );

  // Create the in-memory MCP server instance
  const session: Session = {
    id: sessionData.id,
    server: createMcpServer(),
    createdAt: sessionData.createdAt,
    lastActivity: sessionData.lastActivity,
    clientType: sessionData.clientType,
    clientInfo,
    sseController: sseControllers.get(sessionData.id),
  };

  return session;
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "mcp-session-id"],
    exposeHeaders: ["mcp-session-id", "www-authenticate"],
  })
);

app.use("/*", logger());

app.route("/oauth", oauthRouter);

app.get("/.well-known/oauth-authorization-server", (c) => {
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;
  return c.json(
    oauthProvider.getAuthorizationServerMetadata(`${baseUrl}/oauth`)
  );
});

app.use("/mcp", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = c.req.header("mcp-session-id");
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  // Check if authorization is required and present
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    // Validate token using OAuth provider
    const accessToken = await oauthProvider.validateToken(token);
    if (!accessToken) {
      // Invalid token - return 401 with proper WWW-Authenticate header
      const authServerUrl = `${baseUrl}/oauth`;
      const resourceMetadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

      c.header(
        "WWW-Authenticate",
        `Bearer realm="${baseUrl}", authorization_uri="${authServerUrl}/authorize", resource_metadata_url="${resourceMetadataUrl}"`
      );
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Invalid access token",
            data: {
              type: "auth_error",
              authorization_uri: `${authServerUrl}/authorize`,
              resource_metadata_url: resourceMetadataUrl,
            },
          },
          id: null,
        },
        401
      );
    }

    // Valid token - retrieve API key from sessionApiKeyStore using the token
    if (sessionId) {
      const v0ApiKey = sessionApiKeyStore.getSessionApiKey(accessToken.token);
      if (v0ApiKey) {
        await sessionManager.setSessionApiKey(sessionId, v0ApiKey);
        sessionApiKeyStore.setSessionApiKey(sessionId, v0ApiKey);
        console.log(
          `Valid OAuth token - API key stored for session: ${sessionId}`
        );
      }
    }
  } else {
    // No authorization header - ALWAYS require OAuth per MCP spec (Step 2 in sequence diagram)
    const authServerUrl = `${baseUrl}/oauth`;
    const resourceMetadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

    c.header(
      "WWW-Authenticate",
      `Bearer realm="${baseUrl}", authorization_uri="${authServerUrl}/authorize", resource_metadata_url="${resourceMetadataUrl}"`
    );
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Authorization required",
          data: {
            type: "auth_error",
            authorization_uri: `${authServerUrl}/authorize`,
            resource_metadata_url: resourceMetadataUrl,
          },
        },
        id: null,
      },
      401
    );
  }

  await next();
});

// Health check endpoint
app.get("/ping", async (c) => {
  const sessionCount = await sessionManager.getActiveSessionCount();
  return c.json({
    message: "v0 MCP Server",
    version: "1.0.0",
    sessions: sessionCount,
    timestamp: new Date().toISOString(),
  });
});

// OAuth Protected Resource Metadata endpoint (Step 4 in sequence diagram)
app.get("/.well-known/oauth-protected-resource", (c) => {
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}`;
  const authServerUrl = `${baseUrl}/oauth`;
  return c.json(
    oauthProvider.getProtectedResourceMetadata(baseUrl, authServerUrl)
  );
});

// Handle MCP POST requests
app.post("/mcp", async (c) => {
  try {
    const sessionId = c.req.header("mcp-session-id");
    console.log("Received request with session ID:", sessionId);

    const requestData = await c.req.json();
    console.log("Request method:", requestData.method);

    // Extract client info from initialize request
    let clientInfo: { name: string; version: string } | undefined;
    if (requestData.method === "initialize" && requestData.params?.clientInfo) {
      clientInfo = requestData.params.clientInfo;
    }

    const session = await getSession(sessionId, clientInfo);
    console.log(
      "Using session:",
      session.id,
      "clientType:",
      session.clientType
    );

    // Set current session in the API key store
    sessionApiKeyStore.setCurrentSession(session.id);

    // Ensure we have an API key available for this session
    const currentApiKey = sessionApiKeyStore.getCurrentSessionApiKey();
    if (!currentApiKey) {
      console.log(`Warning: No API key available for session ${session.id}`);
    }

    // Always set the session ID header in the response
    c.header("mcp-session-id", session.id);
    console.log("Set response header mcp-session-id to:", session.id);

    // Handle initialization
    if (requestData.method === "initialize") {
      const response = {
        jsonrpc: "2.0" as const,
        id: requestData.id,
        result: {
          protocolVersion: "2025-03-26",
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
          },
          serverInfo: {
            name: "v0-mcp",
            version: "1.0.0",
          },
        },
      };

      console.log(`Session initialized: ${session.id}`);
      return c.json(response);
    }

    // Handle other MCP requests manually
    let response;

    switch (requestData.method) {
      case "resources/list":
        response = {
          jsonrpc: "2.0" as const,
          id: requestData.id,
          result: {
            resources: [
              {
                uri: "v0://user/config",
                name: "v0 User Configuration",
                description: "User configuration and settings from v0",
                mimeType: "application/json",
              },
              {
                uri: "v0://projects/{projectId}",
                name: "v0 Project Information",
                description: "Detailed information about a v0 project",
                mimeType: "application/json",
              },
            ],
          },
        };
        break;


      case "tools/list":
        response = {
          jsonrpc: "2.0" as const,
          id: requestData.id,
          result: {
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
                description:
                  "Mark a v0 chat as favorite or remove from favorites",
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
                  "List all files generated in the current session from V0 chats and messages",
                inputSchema: {
                  type: "object",
                  properties: {
                    chatId: {
                      type: "string",
                      description: "Filter files by specific chat ID",
                    },
                    language: {
                      type: "string",
                      description: "Filter files by programming language",
                    },
                    includeStats: {
                      type: "boolean",
                      description: "Include file statistics in response",
                    },
                  },
                },
              },
            ],
          },
        };
        break;

      case "tools/call": {
        const toolName = requestData.params?.name;
        const args = requestData.params?.arguments || {};

        try {
          let result;

          let toolResponse;

          if (toolName === "create_chat") {
            toolResponse = await createChat(args);
            // Store files from chat creation if any were generated
            if (
              toolResponse.rawResponse?.files &&
              toolResponse.rawResponse.files.length > 0
            ) {
              const addedFiles = sessionFileStore.addFilesFromChat(
                session.id,
                toolResponse.rawResponse.id,
                toolResponse.rawResponse.files
              );
              console.log(
                `Stored ${addedFiles.length} files from chat creation in session ${session.id}`
              );
            }
          } else if (toolName === "get_user_info") {
            toolResponse = await getUserInfo();
          } else if (toolName === "create_project") {
            toolResponse = await createProject(args);
          } else if (toolName === "create_message") {
            toolResponse = await createMessage(args);
            // Store files from message creation if any were generated
            if (
              toolResponse.rawResponse?.files &&
              toolResponse.rawResponse.files.length > 0
            ) {
              const addedFiles = sessionFileStore.addFilesFromChat(
                session.id,
                toolResponse.rawResponse.chatId,
                toolResponse.rawResponse.files,
                toolResponse.rawResponse.id
              );
              console.log(
                `Stored ${addedFiles.length} files from message creation in session ${session.id}`
              );
            }
          } else if (toolName === "find_chats") {
            toolResponse = await findChats(args);
          } else if (toolName === "favorite_chat") {
            toolResponse = await favoriteChat(args);
          } else if (toolName === "list_files") {
            toolResponse = await listFiles(args);
          } else {
            throw new Error(`Unknown tool: ${toolName}`);
          }

          result = toolResponse.result;

          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            result,
          };
        } catch (error: any) {
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            error: {
              code: -32603,
              message: error.message || "Tool execution failed",
              data: error.stack,
            },
          };
        }
        break;
      }

      case "prompts/list": {
        const offset = parseInt(requestData.params?.cursor || "0");
        const limit = Math.min(
          parseInt(requestData.params?.limit || "10"),
          100
        );

        const allPrompts = v0Prompts;
        const paginatedPrompts = allPrompts.slice(offset, offset + limit);
        const hasMore = offset + limit < allPrompts.length;

        response = {
          jsonrpc: "2.0" as const,
          id: requestData.id,
          result: {
            prompts: paginatedPrompts,
            nextCursor: hasMore ? (offset + limit).toString() : undefined,
          },
        };
        break;
      }

      case "prompts/get": {
        const promptName = requestData.params?.name;
        const args = requestData.params?.arguments || {};

        if (!promptName) {
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            error: {
              code: -32602,
              message: "Missing required parameter: name",
            },
          };
          break;
        }

        try {
          const promptContent = await getPromptContent(promptName, args);

          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            result: {
              messages: [promptContent],
            },
          };
        } catch (error: any) {
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            error: {
              code: -32602,
              message: error.message || "Unknown prompt",
            },
          };
        }
        break;
      }

      case "resources/list": {
        const sessionFiles = sessionFileStore.getSessionFiles(session.id);

        const resources = sessionFiles.map((file) => {
          const fileName =
            file.file.meta?.filename ||
            `${file.file.lang}_file_${file.id.slice(-8)}`;
          return {
            uri: file.uri,
            name: fileName,
            description: `${file.file.lang} file from chat ${file.chatId}${
              file.messageId ? ` (message ${file.messageId})` : ""
            }`,
            mimeType: getMimeType(file.file.lang),
          };
        });

        response = {
          jsonrpc: "2.0" as const,
          id: requestData.id,
          result: {
            resources,
          },
        };
        break;
      }

      case "resources/read": {
        const uri = requestData.params?.uri;

        if (!uri) {
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            error: {
              code: -32602,
              message: "Missing required parameter: uri",
            },
          };
          break;
        }

        // Handle static resources
        if (uri === "v0://user/config") {
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(
                    {
                      userId: "example-user",
                      settings: {
                        theme: "dark",
                        language: "en",
                      },
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
          break;
        }

        if (uri?.startsWith("v0://projects/")) {
          const projectId = uri.split("/").pop();
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(
                    {
                      projectId,
                      name: `Project ${projectId}`,
                      status: "active",
                      created: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
          break;
        }

        // Handle session files
        const file = sessionFileStore.getFileByUri(uri);

        if (!file) {
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            error: {
              code: -32602,
              message: `Resource not found: ${uri}`,
            },
          };
          break;
        }

        response = {
          jsonrpc: "2.0" as const,
          id: requestData.id,
          result: {
            contents: [
              {
                uri: file.uri,
                mimeType: getMimeType(file.file.lang),
                text: file.file.source,
              },
            ],
          },
        };
        break;
      }

      default:
        response = {
          jsonrpc: "2.0" as const,
          id: requestData.id,
          error: {
            code: -32601,
            message: `Unknown method: ${requestData.method}`,
          },
        };
    }

    return c.json(response);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error instanceof Error ? error.message : String(error),
        },
        id: null,
      },
      500
    );
  }
});

// Handle GET requests for SSE (Server-Sent Events)
app.get("/mcp", async (c) => {
  console.log("GET / request received");

  // Get session ID from query parameter for SSE connections
  const sessionId = c.req.query("sessionId") || c.req.header("mcp-session-id");
  console.log("Looking for session ID:", sessionId);
  console.log("Looking up session in database");

  // Check if session exists in database
  const sessionData = await sessionManager.getSession(sessionId!);
  if (!sessionId || !sessionData) {
    console.log("Invalid session ID, returning 400");
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Invalid session ID",
        },
        id: null,
      },
      400
    );
  }

  console.log("Setting up manual SSE stream for session:", sessionId);

  // Set SSE headers manually
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Headers", "Cache-Control");

  console.log("SSE headers set, creating readable stream");

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log(`SSE connection established for session: ${sessionId}`);

      // Store the controller for sending notifications
      sseControllers.set(sessionId, controller);

      // Send initial connection confirmation
      const connectMessage = `event: connected\ndata: ${JSON.stringify({
        type: "connected",
        sessionId,
        timestamp: Date.now(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMessage));
      console.log("Sent connection confirmation");

      // Keep connection alive with ping
      const pingInterval = setInterval(() => {
        try {
          const pingMessage = `event: ping\ndata: ${JSON.stringify({
            type: "ping",
            timestamp: Date.now(),
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(pingMessage));
          console.log("Sent ping");
        } catch (error) {
          console.error("Error sending ping:", error);
          clearInterval(pingInterval);
          controller.close();
        }
      }, 30000);

      // Store cleanup function
      const cleanup = () => {
        console.log(`SSE connection closed for session: ${sessionId}`);
        clearInterval(pingInterval);

        // Remove the controller reference
        sseControllers.delete(sessionId);
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      };

      // Handle client disconnect
      c.req.raw.signal?.addEventListener("abort", cleanup);

      // Store cleanup for later use if needed
      (
        controller as ReadableStreamDefaultController & { cleanup?: () => void }
      ).cleanup = cleanup;
    },

    cancel() {
      console.log(`SSE stream cancelled for session: ${sessionId}`);
      // Cleanup will be handled by the abort event
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
});

// Handle session termination
app.delete("/mcp", async (c) => {
  const sessionId = c.req.header("mcp-session-id");

  if (sessionId) {
    // Clean up session from all stores
    await sessionManager.clearSession(sessionId);
    sessionApiKeyStore.clearSession(sessionId);
    sessionFileStore.clearSession(sessionId);
    sseControllers.delete(sessionId);
    console.log(`Session ${sessionId} terminated and cleaned up`);
    return c.text("", 200);
  }

  return c.text("", 404);
});

// Cleanup on shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  for (const [sessionId, controller] of sseControllers) {
    try {
      controller.close();
    } catch {
      // Controller might already be closed
    }
    sseControllers.delete(sessionId);
  }
  process.exit(0);
});

// Start the server
async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  console.log(`🚀 v0 MCP Server running on http://localhost:${port}/mcp`);
  console.log("📡 Streamable HTTP transport ready");
  console.log("🔗 MCP Endpoint: POST/GET http://localhost:3000/mcp");
  console.log("🔐 OAuth Authorization: http://localhost:3000/oauth/authorize");
  console.log(
    "🔍 OAuth Metadata: http://localhost:3000/.well-known/oauth-authorization-server"
  );
  console.log(
    "🛡️  Resource Metadata: http://localhost:3000/.well-known/oauth-protected-resource"
  );
  console.log("💓 Health check: GET http://localhost:3000/ping");

  serve({
    fetch: app.fetch,
    port,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
