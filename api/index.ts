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
import { z } from "zod";

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
    inputSchema: {
      message: z.string().describe("The message to send to v0"),
      system: z.string().optional().describe("System prompt for the chat"),
    },
  },
  async (inputs) => ({
    content: [
      {
        type: "text",
        text: `Would create v0 chat with message: ${inputs.message}${
          inputs.system ? ` (system: ${inputs.system})` : ""
        }`,
      },
    ],
  })
);

server.registerTool(
  "get_user_info",
  {
    title: "Get v0 User Info",
    description: "Retrieve user information from v0",
    inputSchema: {},
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "Would retrieve v0 user information",
      },
    ],
  })
);

server.registerTool(
  "create_project",
  {
    title: "Create v0 Project",
    description: "Create a new project in v0",
    inputSchema: {
      name: z.string().describe("The project name"),
      description: z.string().optional().describe("Project description"),
    },
  },
  async (inputs) => ({
    content: [
      {
        type: "text",
        text: `Would create v0 project: ${inputs.name}${
          inputs.description ? ` - ${inputs.description}` : ""
        }`,
      },
    ],
  })
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

    const mockRequest = {
      body: JSON.stringify(await c.req.json()),
      headers: Object.fromEntries(c.req.header()),
    };

    const mockResponse = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: "",
      setHeader: (name: string, value: string) => {
        mockResponse.headers[name] = value;
      },
      writeHead: (status: number) => {
        mockResponse.statusCode = status;
      },
      end: (data: string) => {
        mockResponse.body = data;
      },
    };

    await transport.handleRequest(mockRequest as any, mockResponse as any);

    const responseData = mockResponse.body ? JSON.parse(mockResponse.body) : {};
    const responseHeaders: Record<string, string> = {};

    if (mockResponse.headers["x-mcp-session-id"]) {
      responseHeaders["x-mcp-session-id"] =
        mockResponse.headers["x-mcp-session-id"];
    }

    return c.json(responseData, mockResponse.statusCode, responseHeaders);
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

    const mockRequest = {
      url: `/stream/${sessionId}`,
      method: "GET",
      headers: Object.fromEntries(c.req.header()),
    };

    const mockResponse = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: "",
      setHeader: (name: string, value: string) => {
        mockResponse.headers[name] = value;
      },
      writeHead: (status: number, headers?: Record<string, string>) => {
        mockResponse.statusCode = status;
        if (headers) {
          Object.assign(mockResponse.headers, headers);
        }
      },
      write: (chunk: string) => {
        mockResponse.body += chunk;
      },
      end: (data?: string) => {
        if (data) mockResponse.body += data;
      },
    };

    await transport.handleRequest(mockRequest as any, mockResponse as any);

    return new Response(mockResponse.body, {
      status: mockResponse.statusCode,
      headers: mockResponse.headers,
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

    const mockRequest = {
      url: `/${sessionId}`,
      method: "DELETE",
      headers: Object.fromEntries(c.req.header()),
    };

    const mockResponse = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      body: "",
      setHeader: (name: string, value: string) => {
        mockResponse.headers[name] = value;
      },
      writeHead: (status: number) => {
        mockResponse.statusCode = status;
      },
      end: (data: string) => {
        mockResponse.body = data;
      },
    };

    await transport.handleRequest(mockRequest as any, mockResponse as any);

    transports.delete(sessionId);

    const responseData = mockResponse.body
      ? JSON.parse(mockResponse.body)
      : { message: "Session terminated" };
    return c.json(responseData, mockResponse.statusCode);
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
