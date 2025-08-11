import { track } from "@vercel/analytics/server";

// Helper function to safely truncate strings
const truncate = (str: string, length: number = 32): string =>
  str.substring(0, length);

// Auth flow tracking
export async function trackAuthStarted(clientId: string, scope: string) {
  try {
    await track("mcp_auth_started", {
      clientId: truncate(clientId),
      scope: truncate(scope),
    });
  } catch (error) {
    console.error("Failed to track auth started:", error);
  }
}

export async function trackAuthSuccess(clientId: string, scope: string) {
  try {
    await track("mcp_auth_success", {
      clientId: truncate(clientId),
      scope: truncate(scope),
    });
  } catch (error) {
    console.error("Failed to track auth success:", error);
  }
}

export async function trackAuthFailure(clientId: string, errorType: string) {
  try {
    await track("mcp_auth_failure", {
      clientId: truncate(clientId),
      errorType: truncate(errorType),
    });
  } catch (error) {
    console.error("Failed to track auth failure:", error);
  }
}

// MCP tool usage tracking
export async function trackToolUsage(toolName: string, sessionId: string) {
  try {
    await track("mcp_tool_usage", {
      toolName: truncate(toolName),
      sessionId: truncate(sessionId),
    });
  } catch (error) {
    console.error("Failed to track tool usage:", error);
  }
}

// MCP prompt usage tracking
export async function trackPromptUsage(promptName: string, sessionId: string) {
  try {
    await track("mcp_prompt_usage", {
      promptName: truncate(promptName),
      sessionId: truncate(sessionId),
    });
  } catch (error) {
    console.error("Failed to track prompt usage:", error);
  }
}

// MCP resource usage tracking
export async function trackResourceUsage(
  resourceType: string,
  sessionId: string,
) {
  try {
    await track("mcp_resource_usage", {
      resourceType: truncate(resourceType),
      sessionId: truncate(sessionId),
    });
  } catch (error) {
    console.error("Failed to track resource usage:", error);
  }
}

// Session tracking
export async function trackSessionStart(clientId: string, sessionId: string) {
  try {
    await track("mcp_session_start", {
      clientId: truncate(clientId),
      sessionId: truncate(sessionId),
    });
  } catch (error) {
    console.error("Failed to track session start:", error);
  }
}

// Error tracking
export async function trackError(errorType: string, context: string) {
  try {
    await track("mcp_error", {
      errorType: truncate(errorType),
      context: truncate(context),
    });
  } catch (error) {
    console.error("Failed to track error:", error);
  }
}

// Client information extraction (generic)
// Instead of parsing the User-Agent, we simply pass through the client string
// provided by the connecting client. We still truncate to keep payload sizes small.
function extractClientString(userAgent: string): string {
  if (!userAgent) return "unknown";
  return truncate(userAgent, 128);
}

// Transport telemetry tracking
export async function trackTransportUsage(
  sessionId: string,
  method: string,
  transportType: "streaming" | "regular",
  clientString: string,
  supportsStreaming: boolean,
) {
  try {
    await track("mcp_transport_usage", {
      sessionId: truncate(sessionId),
      method: truncate(method),
      transportType,
      clientString: truncate(clientString, 128),
      supportsStreaming,
    });
  } catch (error) {
    console.error("Failed to track transport usage:", error);
  }
}

// Streaming capabilities tracking
export async function trackStreamingCapabilities(
  sessionId: string,
  supportsStreaming: boolean,
  acceptHeader: string,
  clientString: string,
) {
  try {
    await track("mcp_streaming_capabilities", {
      sessionId: truncate(sessionId),
      supportsStreaming,
      acceptHeader: truncate(acceptHeader, 64),
      clientString: truncate(clientString, 128),
    });
  } catch (error) {
    console.error("Failed to track streaming capabilities:", error);
  }
}

// Helper function to extract client info from request headers
export function getClientInfoFromRequest(request: Request): string {
  const userAgent = request.headers.get("User-Agent") || "";
  return extractClientString(userAgent);
}
