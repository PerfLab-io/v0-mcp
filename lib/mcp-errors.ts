// MCP-compliant error handling abstraction. Implements JSON-RPC 2.0 error specification with MCP-specific extensions.

import { trackError } from "@/lib/analytics.server";

/**
 * Standard JSON-RPC error codes
 */
export const JSON_RPC_ERROR_CODES = {
  // JSON-RPC 2.0 pre-defined errors (-32768 to -32000)
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // Server error range (-32099 to -32000) - Implementation defined
  SERVER_ERROR_RANGE_START: -32099,
  SERVER_ERROR_RANGE_END: -32000,
} as const;

/**
 * MCP-specific error codes (outside reserved JSON-RPC range)
 */
export const MCP_ERROR_CODES = {
  // Authentication & Authorization (1000-1099)
  UNAUTHORIZED: -1000,
  FORBIDDEN: -1001,
  TOKEN_EXPIRED: -1002,
  INVALID_API_KEY: -1003,

  // Resource errors (1100-1199)
  RESOURCE_NOT_FOUND: -1100,
  RESOURCE_ACCESS_DENIED: -1101,
  RESOURCE_UNAVAILABLE: -1102,
  RESOURCE_CONFLICT: -1103,

  // Tool execution errors (1200-1299)
  TOOL_NOT_FOUND: -1200,
  TOOL_EXECUTION_FAILED: -1201,
  TOOL_TIMEOUT: -1202,
  TOOL_INVALID_ARGS: -1203,

  // V0 API errors (1300-1399)
  V0_API_ERROR: -1300,
  V0_CHAT_NOT_FOUND: -1301,
  V0_RATE_LIMITED: -1302,
  V0_SERVICE_UNAVAILABLE: -1303,

  // Streaming errors (1400-1499)
  STREAMING_NOT_SUPPORTED: -1400,
  STREAM_CLOSED: -1401,
  STREAM_ERROR: -1402,

  // Logging errors (1500-1599)
  INVALID_LOG_LEVEL: -1500,
  LOGGING_DISABLED: -1501,
} as const;

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * MCP Error class with JSON-RPC compliance
 */
export class MCPError extends Error {
  public readonly code: number;
  public readonly data?: any;
  public readonly severity: ErrorSeverity;
  public readonly recoverable: boolean;

  constructor(
    code: number,
    message: string,
    data?: any,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = "MCPError";
    this.code = code;
    this.data = data;
    this.severity = severity;
    this.recoverable = recoverable;
  }

  /**
   * Convert to JSON-RPC error response format
   */
  toJSONRPC(id?: number | string | null): object {
    return {
      jsonrpc: "2.0",
      id: id || null,
      error: {
        code: this.code,
        message: this.message,
        ...(this.data && { data: this.data }),
      },
    };
  }

  /**
   * Convert to MCP handler response format
   */
  toMCPResponse(id: number): object {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: this.code,
        message: this.message,
        ...(this.data && { data: this.data }),
      },
    };
  }
}

/**
 * Pre-defined error factory functions
 */
export const MCPErrors = {
  // JSON-RPC standard errors
  parseError: (data?: any) =>
    new MCPError(
      JSON_RPC_ERROR_CODES.PARSE_ERROR,
      "Parse error",
      data,
      ErrorSeverity.HIGH,
      false
    ),

  invalidRequest: (data?: any) =>
    new MCPError(
      JSON_RPC_ERROR_CODES.INVALID_REQUEST,
      "Invalid Request",
      data,
      ErrorSeverity.MEDIUM,
      true
    ),

  methodNotFound: (method: string) =>
    new MCPError(
      JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND,
      `Method not found: ${method}`,
      { method },
      ErrorSeverity.MEDIUM,
      true
    ),

  invalidParams: (message: string, params?: any) =>
    new MCPError(
      JSON_RPC_ERROR_CODES.INVALID_PARAMS,
      `Invalid params: ${message}`,
      { params },
      ErrorSeverity.MEDIUM,
      true
    ),

  internalError: (message: string, data?: any) =>
    new MCPError(
      JSON_RPC_ERROR_CODES.INTERNAL_ERROR,
      `Internal error: ${message}`,
      data,
      ErrorSeverity.CRITICAL,
      false
    ),

  // MCP-specific errors
  unauthorized: (message: string = "Unauthorized") =>
    new MCPError(
      MCP_ERROR_CODES.UNAUTHORIZED,
      message,
      undefined,
      ErrorSeverity.HIGH,
      true
    ),

  tokenExpired: () =>
    new MCPError(
      MCP_ERROR_CODES.TOKEN_EXPIRED,
      "Access token has expired",
      undefined,
      ErrorSeverity.HIGH,
      true
    ),

  resourceNotFound: (resource: string, id?: string) =>
    new MCPError(
      MCP_ERROR_CODES.RESOURCE_NOT_FOUND,
      `Resource not found: ${resource}`,
      { resource, id },
      ErrorSeverity.MEDIUM,
      true
    ),

  toolExecutionFailed: (toolName: string, error: string) =>
    new MCPError(
      MCP_ERROR_CODES.TOOL_EXECUTION_FAILED,
      `Tool execution failed: ${toolName}`,
      { toolName, error },
      ErrorSeverity.MEDIUM,
      true
    ),

  v0ApiError: (message: string, statusCode?: number) =>
    new MCPError(
      MCP_ERROR_CODES.V0_API_ERROR,
      `V0 API error: ${message}`,
      { statusCode },
      ErrorSeverity.HIGH,
      true
    ),

  v0ChatNotFound: (chatId: string) =>
    new MCPError(
      MCP_ERROR_CODES.V0_CHAT_NOT_FOUND,
      `Chat not found: ${chatId}`,
      { chatId },
      ErrorSeverity.MEDIUM,
      true
    ),

  streamingNotSupported: (method: string) =>
    new MCPError(
      MCP_ERROR_CODES.STREAMING_NOT_SUPPORTED,
      `Streaming not supported for method: ${method}`,
      { method },
      ErrorSeverity.LOW,
      true
    ),

  invalidLogLevel: (level: string, validLevels: string[]) =>
    new MCPError(
      MCP_ERROR_CODES.INVALID_LOG_LEVEL,
      `Invalid log level: ${level}`,
      { level, validLevels },
      ErrorSeverity.MEDIUM,
      true
    ),
};

/**
 * Error handling wrapper for async operations
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string;
    fallbackError?: MCPError;
    onError?: (error: any) => void;
    sessionId?: string;
  }
): Promise<T> {
  try {
    const result = await operation();

    if (context.sessionId) {
      await trackError(`${context.operationName}_success`, context.sessionId);
    }

    return result;
  } catch (error) {
    let mcpError: MCPError;

    console.error(`Error in ${context.operationName}:`, error);

    if (context.onError) {
      context.onError(error);
    }

    if (error instanceof MCPError) {
      mcpError = error;
    } else if (error instanceof Error) {
      if (error.message.includes("not found")) {
        mcpError = MCPErrors.resourceNotFound(
          context.operationName,
          error.message
        );
      } else if (
        error.message.includes("unauthorized") ||
        error.message.includes("forbidden")
      ) {
        mcpError = MCPErrors.unauthorized(error.message);
      } else if (
        error.message.includes("invalid") ||
        error.message.includes("malformed")
      ) {
        mcpError = MCPErrors.invalidParams(error.message);
      } else {
        mcpError = MCPErrors.internalError(error.message, {
          stack: error.stack,
          originalError: error.name,
        });
      }
    } else {
      mcpError =
        context.fallbackError ||
        MCPErrors.internalError(`Unknown error in ${context.operationName}`, {
          error: String(error),
        });
    }

    if (context.sessionId) {
      await trackError(`${context.operationName}_error`, context.sessionId);
    }

    throw mcpError;
  }
}

/**
 * Validation helper for required parameters
 */
export function validateRequired<T>(
  value: T | undefined | null,
  paramName: string
): T {
  if (value === undefined || value === null) {
    throw MCPErrors.invalidParams(`Missing required parameter: ${paramName}`);
  }
  return value;
}

/**
 * Validation helper for parameter types
 */
export function validateType<T>(
  value: any,
  expectedType: string,
  paramName: string
): T {
  const actualType = typeof value;
  if (actualType !== expectedType) {
    throw MCPErrors.invalidParams(
      `Parameter ${paramName} must be ${expectedType}, got ${actualType}`,
      { expected: expectedType, actual: actualType, value }
    );
  }
  return value as T;
}

/**
 * Validation helper for enum values
 */
export function validateEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  paramName: string
): T {
  if (!validValues.includes(value as T)) {
    throw MCPErrors.invalidParams(
      `Parameter ${paramName} must be one of: ${validValues.join(", ")}`,
      { validValues, received: value }
    );
  }
  return value as T;
}
