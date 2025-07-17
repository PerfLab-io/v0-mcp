import { NextRequest, NextResponse } from "next/server";
import { API_KV, SESSION_KV } from "@/lib/kv-storage";
import { decryptApiKey } from "@/lib/crypto";
import { sessionApiKeyStore } from "@/v0/client";
import {
  createChat,
  getUserInfo,
  createProject,
  createMessage,
  findChats,
  favoriteChat,
  listFiles,
} from "@/v0/index";
import { sessionFileStore } from "@/resources/sessionFileStore";
import { v0Prompts, getPromptContent } from "@/prompts/index";
import { getMimeType } from "@/lib/utils";
import { randomUUID } from "crypto";

// Simple MCP server implementation
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "invalid_token",
          error_description: "No authorization provided",
        },
        {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Bearer error="invalid_token", error_description="No authorization provided", resource_metadata="http://localhost:3000/api/mcp/.well-known/oauth-protected-resource"',
          },
        }
      );
    }

    const token = authHeader.substring(7);
    
    // Validate token
    const tokenData = await API_KV.get(`access_token:${token}`);
    if (!tokenData) {
      return NextResponse.json(
        {
          error: "invalid_token",
          error_description: "Invalid access token",
        },
        { status: 401 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: "invalid_token",
          error_description: "Access token expired",
        },
        { status: 401 }
      );
    }

    // Decrypt API key
    const decryptedApiKey = decryptApiKey(tokenData.encryptedApiKey, tokenData.clientId);
    sessionApiKeyStore.setSessionApiKey(token, decryptedApiKey);
    sessionApiKeyStore.setCurrentSession(token);

    // Parse MCP request
    const body = await request.json();
    const { method, params, id } = body as { method: string; params?: any; id?: number };

    console.log("MCP Request:", { method, params, id });

    // Handle MCP methods
    switch (method) {
      case "initialize":
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
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
        });

      case "notifications/initialized":
        // This is a notification, no response needed
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {},
        });

      case "tools/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
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
                      description: "Whether to favorite (true) or unfavorite (false) the chat",
                    },
                  },
                  required: ["chatId", "isFavorite"],
                },
              },
              {
                name: "list_files",
                description: "List all files generated in the current session from V0 chats and messages",
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
        });

      case "tools/call":
        const toolName = params?.name;
        const args = params?.arguments || {};

        try {
          let result;
          const sessionId = randomUUID(); // Generate session ID for compatibility

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
              break;
            case "favorite_chat":
              result = await favoriteChat(args);
              break;
            case "list_files":
              result = await listFiles(args);
              break;
            default:
              throw new Error(`Unknown tool: ${toolName}`);
          }

          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }],
            },
          });
        } catch (error: any) {
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32603,
              message: error.message || "Tool execution failed",
              data: error.stack,
            },
          });
        }

      case "prompts/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            prompts: [
              {
                name: "v0_prompt",
                description: "Get a pre-configured prompt for v0 development",
                arguments: [
                  {
                    name: "type",
                    description: "Type of prompt to get",
                    required: false,
                  },
                ],
              },
            ],
          },
        });

      case "resources/list":
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
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
        });

      case "resources/read":
        const uri = params?.uri;
        if (uri === "v0://user/config") {
          return NextResponse.json({
            jsonrpc: "2.0",
            id,
            result: {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    userId: "example-user",
                    settings: {
                      theme: "dark",
                      language: "en",
                    },
                  }, null, 2),
                },
              ],
            },
          });
        }
        
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Resource not found: ${uri}`,
          },
        });

      default:
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: `Unknown method: ${method}`,
          },
        });
    }
  } catch (error: any) {
    console.error("MCP Server Error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
          data: error.message,
        },
        id: null,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}