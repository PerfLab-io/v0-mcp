import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  handleInitialize,
  handleNotificationsInitialized,
  handleLoggingSetLevel,
  handleToolsList,
  handleToolsCall,
  handlePromptsList,
  handlePromptsGet,
  handleResourcesList,
  handleResourcesRead,
  executeMCPMethod,
  MCPHandlerContext,
} from "../lib/mcp-handlers";
import { MCPErrors } from "../lib/mcp-errors";

// Mock dependencies
vi.mock("../lib/analytics.server", () => ({
  trackToolUsage: vi.fn(),
  trackPromptUsage: vi.fn(),
  trackResourceUsage: vi.fn(),
  trackError: vi.fn(),
}));

vi.mock("../lib/mcp-logging", () => ({
  mcpLogger: {
    setLogLevel: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../v0/index", () => ({
  createChat: vi.fn(),
  getUserInfo: vi.fn(),
  createProject: vi.fn(),
  createMessage: vi.fn(),
  findChats: vi.fn(),
  favoriteChat: vi.fn(),
  listFiles: vi.fn(),
  getChatById: vi.fn(),
  initChat: vi.fn(),
}));

vi.mock("../resources/sessionFileStore", () => ({
  sessionFileStore: {
    getSessionFiles: vi.fn(),
    getFileStats: vi.fn(),
    getChatFiles: vi.fn(),
    getFileByUri: vi.fn(),
  },
}));

vi.mock("../prompts/index", () => ({
  v0Prompts: [
    {
      name: "test-prompt",
      description: "Test prompt",
      arguments: [],
    },
  ],
  getPromptContent: vi.fn(),
}));

describe("MCP Handlers", () => {
  let context: MCPHandlerContext;

  beforeEach(() => {
    context = {
      token: "test-token",
      tokenData: { userId: "test-user" },
      params: {},
      id: 1,
    };
    vi.clearAllMocks();
  });

  describe("handleInitialize", () => {
    it("should return initialization response with capabilities", async () => {
      const result = await handleInitialize(context);

      expect(result).toEqual({
        jsonrpc: "2.0",
        id: 1,
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
            logging: {
              streamable: true,
            },
          },
          serverInfo: {
            name: "v0-mcp",
            version: "1.0.0",
          },
        },
      });
    });
  });

  describe("handleNotificationsInitialized", () => {
    it("should return empty success response", async () => {
      const result = await handleNotificationsInitialized(context);

      expect(result).toEqual({
        jsonrpc: "2.0",
        id: 1,
        result: {},
      });
    });
  });

  describe("handleLoggingSetLevel", () => {
    it("should set log level successfully", async () => {
      context.params = { level: "info" };

      const result = await handleLoggingSetLevel(context);

      expect(result).toEqual({
        jsonrpc: "2.0",
        id: 1,
        result: {},
      });
    });

    it("should handle invalid log level", async () => {
      context.params = { level: "invalid" };

      const result = await handleLoggingSetLevel(context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-1500); // INVALID_LOG_LEVEL
    });

    it("should handle missing level parameter", async () => {
      context.params = {};

      const result = await handleLoggingSetLevel(context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-32602); // INVALID_PARAMS
    });
  });

  describe("handleToolsList", () => {
    it("should return list of available tools", async () => {
      const result = await handleToolsList(context);

      expect(result.result.tools).toBeInstanceOf(Array);
      expect(result.result.tools.length).toBeGreaterThan(0);

      const createChatTool = result.result.tools.find(
        (tool: any) => tool.name === "create_chat",
      );
      expect(createChatTool).toBeDefined();
      expect(createChatTool.description).toContain("Create a new v0 chat");
    });
  });

  describe("handleToolsCall", () => {
    it("should execute create_chat tool successfully", async () => {
      const mockResult = {
        success: true,
        result: { chatId: "test-chat-id" },
      };

      const { createChat } = await import("../v0/index");
      vi.mocked(createChat).mockResolvedValue(mockResult);

      context.params = {
        name: "create_chat",
        arguments: { message: "Hello world" },
      };

      const result = await handleToolsCall(context);

      expect(result).toHaveProperty("result");
      expect(result.result.content).toBeInstanceOf(Array);
    });

    it("should handle unknown tool", async () => {
      context.params = {
        name: "unknown_tool",
        arguments: {},
      };

      const result = await handleToolsCall(context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-1100); // RESOURCE_NOT_FOUND
    });

    it("should handle missing tool name", async () => {
      context.params = {
        arguments: {},
      };

      const result = await handleToolsCall(context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-32602); // INVALID_PARAMS
    });

    it("should handle list_files with required chatId", async () => {
      const { sessionFileStore } = await import(
        "../resources/sessionFileStore"
      );
      vi.mocked(sessionFileStore.getSessionFiles).mockResolvedValue([]);

      context.params = {
        name: "list_files",
        arguments: { chatId: "test-chat-id" },
      };

      const result = await handleToolsCall(context);

      expect(result).toHaveProperty("result");
      expect(result.result.content).toBeInstanceOf(Array);
    });

    it("should handle list_files missing chatId", async () => {
      context.params = {
        name: "list_files",
        arguments: {},
      };

      const result = await handleToolsCall(context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-32602); // INVALID_PARAMS
    });
  });

  describe("handlePromptsList", () => {
    it("should return list of available prompts", async () => {
      const result = await handlePromptsList(context);

      expect(result.result.prompts).toBeInstanceOf(Array);
      expect(result.result.prompts.length).toBeGreaterThan(0);

      const testPrompt = result.result.prompts.find(
        (prompt: any) => prompt.name === "test-prompt",
      );
      expect(testPrompt).toBeDefined();
    });
  });

  describe("handlePromptsGet", () => {
    it("should get prompt content successfully", async () => {
      const mockContent = {
        role: "user",
        content: { type: "text", text: "Test prompt content" },
      };

      const { getPromptContent } = await import("../prompts/index");
      vi.mocked(getPromptContent).mockResolvedValue(mockContent);

      context.params = {
        name: "test-prompt",
        arguments: {},
      };

      const result = await handlePromptsGet(context);

      expect(result).toHaveProperty("result");
      expect(result.result.messages).toBeInstanceOf(Array);
    });

    it("should handle missing prompt name", async () => {
      context.params = {};

      const result = await handlePromptsGet(context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-32602); // INVALID_PARAMS
    });
  });

  describe("handleResourcesList", () => {
    it("should return list of available resources", async () => {
      const { sessionFileStore } = await import(
        "../resources/sessionFileStore"
      );
      vi.mocked(sessionFileStore.getSessionFiles).mockResolvedValue([]);
      vi.mocked(sessionFileStore.getLastChatId).mockResolvedValue(null);

      const result = await handleResourcesList(context);

      expect(result.result.resources).toBeInstanceOf(Array);
      expect(result.result.resources.length).toBeGreaterThan(0);

      const userConfigResource = result.result.resources.find(
        (resource: any) => resource.uri === "v0://user/config",
      );
      expect(userConfigResource).toBeDefined();
    });
  });

  describe("handleResourcesRead", () => {
    it("should read user config resource", async () => {
      const mockUserInfo = {
        rawResponse: { userId: "test-user", email: "test@example.com" },
      };

      const { getUserInfo } = await import("../v0/index");
      vi.mocked(getUserInfo).mockResolvedValue(mockUserInfo);

      context.params = { uri: "v0://user/config" };

      const result = await handleResourcesRead(context);

      expect(result).toHaveProperty("result");
      expect(result.result.contents).toBeInstanceOf(Array);
      expect(result.result.contents[0].mimeType).toBe("application/json");
    });

    it("should handle resource not found", async () => {
      context.params = { uri: "v0://nonexistent" };

      const result = await handleResourcesRead(context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-1100); // RESOURCE_NOT_FOUND
    });
  });

  describe("executeMCPMethod", () => {
    it("should execute known method successfully", async () => {
      const result = await executeMCPMethod("initialize", context);

      expect(result).toHaveProperty("result");
      expect(result.result.protocolVersion).toBe("2025-03-26");
    });

    it("should handle unknown method", async () => {
      const result = await executeMCPMethod("unknown_method", context);

      expect(result).toHaveProperty("error");
      expect(result.error.code).toBe(-32601); // METHOD_NOT_FOUND
    });
  });

  describe("Error Handling", () => {
    it("should use MCP-compliant error codes", () => {
      const error = MCPErrors.methodNotFound("test_method");
      expect(error.code).toBe(-32601);
      expect(error.message).toContain("test_method");
    });

    it("should provide proper error response format", () => {
      const error = MCPErrors.invalidParams("Missing parameter", {
        param: "test",
      });
      const response = error.toMCPResponse(1);

      expect(response).toEqual({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32602,
          message: expect.stringContaining("Invalid params"),
          data: { params: { param: "test" } },
        },
      });
    });
  });
});
