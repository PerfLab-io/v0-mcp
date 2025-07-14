#!/usr/bin/env node
import "dotenv/config";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  createChat,
  getUserInfo,
  createProject,
  createMessage,
  findChats,
  favoriteChat,
  listFiles,
} from "@/v0/index";
import { sessionApiKeyStore } from "@/v0/client";
import {
  oauthProvider,
  oauthRouter,
  AccessToken,
} from "@/app/api/[[...route]]/oauth-provider";
import { v0Prompts, getPromptContent } from "@/prompts/index";
import { sessionFileStore } from "@/resources/sessionFileStore";
import { sessionManager } from "@/services/sessionManager";
import { getMimeType } from "@/lib/utils";

export const runtime = "nodejs";

type Env = {
  Variables: {
    accessToken: AccessToken;
  };
};

const sseControllers = new Map<
  string,
  ReadableStreamDefaultController<Uint8Array>
>();

const app = new Hono<Env>().basePath("/api");

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
  const baseUrl = `${protocol}://${host}/api`;
  return c.json(
    oauthProvider.getAuthorizationServerMetadata(`${baseUrl}/oauth`)
  );
});

app.get("/.well-known/oauth-authorization-server/oauth", (c) => {
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}/api`;
  return c.json(
    oauthProvider.getAuthorizationServerMetadata(`${baseUrl}/oauth`)
  );
});

app.use("/mcp", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}/api`;

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

    // Check token expiry
    if (accessToken.expiresAt < new Date()) {
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
            message: "Access token expired",
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

    // Store valid token for use in request handlers
    c.set("accessToken", accessToken);
    console.log(
      `Valid OAuth token - expires: ${accessToken.expiresAt.toISOString()}`
    );
  } else {
    // No authorization header - ALWAYS require OAuth per MCP spec
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

app.get("/ping", async (c) => {
  const sessionCount = await sessionManager.getActiveSessionCount();
  return c.json({
    message: "v0 MCP Server",
    version: "1.0.0",
    sessions: sessionCount,
    timestamp: new Date().toISOString(),
  });
});

app.get("/.well-known/oauth-protected-resource", (c) => {
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  const baseUrl = `${protocol}://${host}/api`;
  const authServerUrl = `${baseUrl}/oauth`;
  return c.json(
    oauthProvider.getProtectedResourceMetadata(baseUrl, authServerUrl)
  );
});

app.post("/mcp", async (c) => {
  try {
    const sessionId = c.req.header("mcp-session-id");
    console.log("Received request with session ID:", sessionId);

    const requestData = await c.req.json();
    console.log("Request method:", requestData.method);

    // Extract client info from initialize requests
    let clientInfo: { name: string; version: string } | undefined;
    if (requestData.method === "initialize" && requestData.params?.clientInfo) {
      clientInfo = {
        name: requestData.params.clientInfo.name,
        version: requestData.params.clientInfo.version,
      };
      console.log("Client info from initialize:", clientInfo);
    }

    // Simplified session management: always create session if no ID provided
    let session: any;

    if (sessionId) {
      // Session ID provided - try to get existing session
      session = await sessionManager.getSession(sessionId);
      if (session) {
        // Update last activity for existing session
        await sessionManager.updateLastActivity(sessionId);
        console.log("Using existing session:", session.id);
      } else {
        // Session ID provided but not found - create new session with that ID
        const accessToken = c.get("accessToken");
        session = await sessionManager.createOrGetSession(
          sessionId,
          clientInfo,
          accessToken?.clientId
        );
        console.log("Created new session with provided ID:", session.id);
      }
    } else {
      // No session ID provided - create new session
      const accessToken = c.get("accessToken");
      session = await sessionManager.createOrGetSession(
        undefined,
        clientInfo,
        accessToken?.clientId
      );
      console.log("Created new session (no ID provided):", session.id);
    }

    console.log(
      "Using session:",
      session.id,
      "clientType:",
      session.clientType
    );

    // Get the validated access token from authorization middleware
    const accessToken = c.get("accessToken");
    if (!accessToken) {
      return c.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "No valid access token found",
          },
          id: requestData.id,
        },
        401
      );
    }

    // Get API key by decrypting the access token
    let currentApiKey: string | null = null;
    try {
      // The access token is the encrypted API key, decrypt it using the client_id
      const { decryptApiKey } = await import("@/lib/crypto");
      currentApiKey = decryptApiKey(accessToken.token, accessToken.clientId);

      // Set current session in the API key store for backward compatibility
      sessionApiKeyStore.setCurrentSession(session.id);
      sessionApiKeyStore.setSessionApiKey(session.id, currentApiKey);
      sessionApiKeyStore.setSessionApiKey(accessToken.token, currentApiKey);
    } catch (error) {
      console.error(`Failed to decrypt API key from token: ${error}`);
    }

    if (!currentApiKey) {
      console.log(
        `Warning: No API key available for token ${accessToken.token.substring(
          0,
          10
        )}...`
      );
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

app.delete("/mcp", async (c) => {
  const sessionId = c.req.header("mcp-session-id");

  if (sessionId) {
    // Clean up session from all stores
    // TODO: we are not deleting the session from the database to keep statistics
    // Analyze if this impacts the protocol usage
    // await sessionManager.clearSession(sessionId);
    sessionApiKeyStore.clearSession(sessionId);
    sessionFileStore.clearSession(sessionId);
    sseControllers.delete(sessionId);
    console.log(`Session ${sessionId} terminated and cleaned up`);
    return c.text("", 200);
  }

  return c.text("", 404);
});

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const OPTIONS = handler;
