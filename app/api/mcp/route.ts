import { NextRequest, NextResponse } from "next/server";
import { API_KV } from "@/lib/kv-storage";
import { decryptApiKey } from "@/lib/crypto";
import { sessionApiKeyStore } from "@/v0/client";
import {
  trackSessionStart,
  trackTransportUsage,
  trackStreamingCapabilities,
  getClientInfoFromRequest,
} from "@/lib/analytics.server";
import { sseManager } from "@/lib/sse-manager";
import { executeMCPMethod, type MCPHandlerContext } from "@/lib/mcp-handlers";

async function createStreamingResponse(
  body: any,
  token: string,
  tokenData: any,
): Promise<Response> {
  const { method, params, id } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      let isClosed = false;

      const writer = {
        write: async (data: Uint8Array) => {
          if (!isClosed) {
            controller.enqueue(data);
          }
        },
        close: async () => {
          if (!isClosed) {
            controller.close();
            isClosed = true;
          }
        },
      };

      try {
        sseManager.addConnection(token, writer);

        const context: MCPHandlerContext = {
          token,
          tokenData,
          params,
          id,
        };

        const result = await executeMCPMethod(method, context);

        const responseData = `data: ${JSON.stringify(result)}\n\n`;
        await writer.write(encoder.encode(responseData));

        await writer.close();
      } catch (error) {
        console.error("Streaming error:", error);
        try {
          const errorData = `data: ${JSON.stringify({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32603,
              message: "Streaming error",
              data: error instanceof Error ? error.message : String(error),
            },
          })}\n\n`;
          await writer.write(encoder.encode(errorData));
          await writer.close();
        } catch (closeError) {
          console.error("Error closing stream:", closeError);
        }
      } finally {
        await sseManager.removeConnection(token);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}/api/mcp`;

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
            "WWW-Authenticate": `Bearer error="invalid_token", error_description="No authorization provided", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
          },
        },
      );
    }

    const token = authHeader.substring(7);

    const tokenData = await API_KV.get(`access_token:${token}`);
    if (!tokenData) {
      return NextResponse.json(
        {
          error: "invalid_token",
          error_description: "Invalid access token",
        },
        { status: 401 },
      );
    }

    if (new Date(tokenData.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          error: "invalid_token",
          error_description: "Access token expired",
        },
        { status: 401 },
      );
    }

    const decryptedApiKey = decryptApiKey(
      tokenData.encryptedApiKey,
      tokenData.clientId,
    );
    sessionApiKeyStore.setSessionApiKey(token, decryptedApiKey);
    sessionApiKeyStore.setCurrentSession(token);

    await trackSessionStart(tokenData.clientId, token);

    const body = await request.json();
    const { method, params, id } = body as {
      method: string;
      params?: any;
      id?: number;
    };

    const clientInfo = getClientInfoFromRequest(request);

    const acceptHeader = request.headers.get("Accept") || "";
    const supportsStreaming = acceptHeader.includes("text/event-stream");

    const streamableMethods = ["logging/setLevel", "tools/call"];
    const shouldStream =
      supportsStreaming && streamableMethods.includes(method);

    await trackStreamingCapabilities(
      token,
      supportsStreaming,
      acceptHeader,
      clientInfo,
    );

    console.log("MCP Request:", {
      method,
      params,
      id,
      supportsStreaming,
      shouldStream,
      client: clientInfo,
    });

    if (shouldStream) {
      await trackTransportUsage(
        token,
        method,
        "streaming",
        clientInfo,
        supportsStreaming,
      );
      return createStreamingResponse(body, token, tokenData);
    }

    await trackTransportUsage(
      token,
      method,
      "regular",
      clientInfo,
      supportsStreaming,
    );

    const context: MCPHandlerContext = {
      token,
      tokenData,
      params,
      id: id || 0,
    };

    const result = await executeMCPMethod(method, context);
    return NextResponse.json(result);
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
      { status: 500 },
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
