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
} from "../v0/index.js";
import { sessionApiKeyStore } from "../v0/client.js";

// Session management interface
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

const sessions = new Map<string, Session>();

// Create MCP server with v0 capabilities
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
    createChat
  );

  server.registerTool(
    "get_user_info",
    {
      title: "Get v0 User Info",
      description: "Retrieve user information from v0",
      inputSchema: getUserInfoSchema.shape,
    },
    getUserInfo
  );

  server.registerTool(
    "create_project",
    {
      title: "Create v0 Project",
      description: "Create a new project in v0",
      inputSchema: createProjectSchema.shape,
    },
    createProject
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

// Helper to get or create session
function getSession(
  sessionId?: string,
  clientInfo?: { name: string; version: string }
): Session {
  console.log("getSession called with:", sessionId, "clientInfo:", clientInfo);

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId);
    if (session) {
      console.log(
        "Found existing session:",
        session.id,
        "clientType:",
        session.clientType
      );
      session.lastActivity = new Date();
      return session;
    }
  }

  // Create new session
  const newSessionId = randomUUID();
  console.log("Creating new session with ID:", newSessionId);

  // Determine client type based on client info
  const clientType: "mcpserver" | "generic" =
    clientInfo?.name === "v0-mcp" ? "mcpserver" : "generic";

  const session: Session = {
    id: newSessionId,
    server: createMcpServer(),
    createdAt: new Date(),
    lastActivity: new Date(),
    clientType,
    clientInfo,
  };

  sessions.set(newSessionId, session);
  console.log(
    "Session created and stored. Total sessions:",
    sessions.size,
    "Client type:",
    clientType
  );
  return session;
}

const app = new Hono();

// CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "mcp-session-id"],
    exposeHeaders: ["mcp-session-id"],
  })
);

app.use("/*", logger());

// OAuth middleware for API key extraction
app.use("/mcp", async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const sessionId = c.req.header("mcp-session-id");
  
  // Extract API key from Bearer token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const apiKey = authHeader.substring(7);
    
    // Store API key in session store if sessionId is available
    if (sessionId) {
      sessionApiKeyStore.setSessionApiKey(sessionId, apiKey);
      console.log(`API key stored for session: ${sessionId}`);
    }
  }
  
  await next();
});

// Health check endpoint
app.get("/ping", (c) => {
  return c.json({
    message: "v0 MCP Server",
    version: "1.0.0",
    sessions: sessions.size,
    timestamp: new Date().toISOString(),
  });
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

    const session = getSession(sessionId, clientInfo);
    console.log(
      "Using session:",
      session.id,
      "clientType:",
      session.clientType
    );

    // Set current session in the API key store
    sessionApiKeyStore.setCurrentSession(session.id);

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

      case "resources/read": {
        const uri = requestData.params?.uri;
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
        } else if (uri?.startsWith("v0://projects/")) {
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
        } else {
          response = {
            jsonrpc: "2.0" as const,
            id: requestData.id,
            error: {
              code: -32602,
              message: `Unknown resource: ${uri}`,
            },
          };
        }
        break;
      }

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
            ],
          },
        };
        break;

      case "tools/call": {
        const toolName = requestData.params?.name;
        const args = requestData.params?.arguments || {};

        try {
          let result;

          if (toolName === "create_chat") {
            result = await createChat(args);
          } else if (toolName === "get_user_info") {
            result = await getUserInfo();
          } else if (toolName === "create_project") {
            result = await createProject(args);
          } else {
            throw new Error(`Unknown tool: ${toolName}`);
          }

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
app.get("/mcp", (c) => {
  console.log("GET / request received");

  // Get session ID from query parameter for SSE connections
  const sessionId = c.req.query("sessionId") || c.req.header("mcp-session-id");
  console.log("Looking for session ID:", sessionId);
  console.log("Available sessions:", Array.from(sessions.keys()));

  if (!sessionId || !sessions.has(sessionId)) {
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

      // Store the controller in the session for sending notifications
      const session = sessions.get(sessionId);
      if (session) {
        session.sseController = controller;
      }

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

        // Remove the controller reference from the session
        const session = sessions.get(sessionId);
        if (session) {
          session.sseController = undefined;
        }
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
app.delete("/mcp", (c) => {
  const sessionId = c.req.header("mcp-session-id");

  if (sessionId && sessions.has(sessionId)) {
    // Clean up session from both stores
    sessions.delete(sessionId);
    sessionApiKeyStore.clearSession(sessionId);
    console.log(`Session ${sessionId} terminated and cleaned up`);
    return c.text("", 200);
  }

  return c.text("", 404);
});

// Cleanup on shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  for (const [sessionId, session] of sessions) {
    if (session.sseController) {
      try {
        session.sseController.close();
      } catch {
        // Controller might already be closed
      }
    }
    sessions.delete(sessionId);
  }
  process.exit(0);
});

// Start the server
async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  console.log(`🚀 v0 MCP Server running on http://localhost:${port}/mcp`);
  console.log("📡 Streamable HTTP transport ready");
  console.log("🔗 Endpoint: POST/GET http://localhost:3000/mcp");
  console.log("💓 Health check: GET http://localhost:3000/mcp/ping");

  serve({
    fetch: app.fetch,
    port,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
