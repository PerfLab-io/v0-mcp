import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import { randomUUID } from "crypto";
import {
  createChat,
  createChatSchema,
  getUserInfo,
  getUserInfoSchema,
  createProject,
  createProjectSchema,
} from "../v0/index.js";

export const config = {
  runtime: "edge",
};

const transports = new Map<string, StreamableHTTPServerTransport>();
const eventStore = new InMemoryEventStore();

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

const app = new Hono().basePath("/api");

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/*", logger());

app.get("/", (c) => {
  return c.json({
    message: "v0 MCP Server",
    version: "1.0.0",
    activeSessions: transports.size,
  });
});

app.post("/", async (c) => {
  try {
    const sessionId = c.req.header("x-mcp-session-id");
    let transport: StreamableHTTPServerTransport;

    if (sessionId) {
      const existingTransport = transports.get(sessionId);
      if (!existingTransport) {
        return c.json(
          {
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: "Invalid session ID",
            },
          },
          400
        );
      }
      transport = existingTransport;
    } else {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sessionId: string) => {
          transports.set(sessionId, transport);
          console.error(`Session initialized: ${sessionId}`);
        },
      });

      await server.connect(transport);
    }

    await transport.handleRequest(c.req as any, c.res as any);

    const responseData = await c.res.json();
    const responseHeaders: Record<string, string> = {};

    if (c.res.headers.get("x-mcp-session-id")) {
      responseHeaders["x-mcp-session-id"] =
        c.res.headers.get("x-mcp-session-id") || "";
    }

    return c.json(responseData, c.res.status as any, responseHeaders);
  } catch (error) {
    console.error("Error handling POST request:", error);
    return c.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
          data: error instanceof Error ? error.message : "Unknown error",
        },
      },
      500
    );
  }
});

app.get("/stream/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const transport = transports.get(sessionId);

    if (!transport) {
      return c.json(
        {
          error: "Session not found",
        },
        404
      );
    }

    await transport.handleRequest(c.req as any, c.res as any);

    return new Response(c.res.body, {
      status: c.res.status as any,
      headers: c.res.headers,
    });
  } catch (error) {
    console.error("Error handling GET request:", error);
    return c.json(
      {
        error: "Internal server error",
      },
      500
    );
  }
});

app.delete("/:sessionId", async (c) => {
  try {
    const sessionId = c.req.param("sessionId");
    const transport = transports.get(sessionId);

    if (!transport) {
      return c.json({ error: "Session not found" }, 404);
    }

    await transport.handleRequest(c.req as any, c.res as any);

    transports.delete(sessionId);

    const responseData = await c.res.json();
    return c.json(responseData, c.res.status as any);
  } catch (error) {
    console.error("Error handling DELETE request:", error);
    return c.json(
      {
        error: "Internal server error",
      },
      500
    );
  }
});

process.on("SIGINT", () => {
  console.error("Shutting down server...");
  for (const [sessionId, transport] of transports) {
    transport.close();
    transports.delete(sessionId);
  }
  process.exit(0);
});

export default handle(app);
