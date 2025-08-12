# MCP Error Handling Guide

This document provides comprehensive documentation of the error handling implementation in the v0-mcp server, ensuring full compliance with the Model Context Protocol (MCP) specification.

## Overview

The v0-mcp server implements a robust, MCP-compliant error handling system through a dedicated abstraction layer (`lib/mcp-errors.ts`). This system ensures consistent error responses, rich debugging context, and full compliance with the JSON-RPC 2.0 specification that underlies MCP.

## MCP Specification Compliance

### JSON-RPC 2.0 Error Format

All errors follow the standard JSON-RPC 2.0 error response format as required by the MCP specification:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: Missing required parameter: chatId",
    "data": {
      "params": { "chatId": null },
      "paramName": "chatId"
    }
  }
}
```

### Key Compliance Features

1. **Standard Error Structure**: Every error response includes `jsonrpc`, `id`, and `error` fields
2. **Error Codes**: Numeric codes following JSON-RPC reserved ranges
3. **Descriptive Messages**: Human-readable error descriptions
4. **Optional Data Field**: Additional context for debugging
5. **Graceful Degradation**: Proper handling of protocol mismatches and capability negotiation failures

## Error Code System

### JSON-RPC Standard Codes (-32768 to -32000)

| Code | Name | Description | Usage |
|------|------|-------------|-------|
| -32700 | Parse Error | Invalid JSON received | Malformed request body |
| -32600 | Invalid Request | Invalid request object | Missing required fields |
| -32601 | Method Not Found | Method does not exist | Unknown MCP method |
| -32602 | Invalid Params | Invalid method parameters | Missing/wrong type params |
| -32603 | Internal Error | Internal server error | Unexpected failures |

### MCP Custom Error Codes

#### Authentication & Authorization (-1000 to -1099)
| Code | Name | Description |
|------|------|-------------|
| -1000 | Unauthorized | Missing or invalid authentication |
| -1001 | Forbidden | Insufficient permissions |
| -1002 | Token Expired | Authentication token has expired |
| -1003 | Invalid API Key | V0 API key is invalid or missing |

#### Resource Errors (-1100 to -1199)
| Code | Name | Description |
|------|------|-------------|
| -1100 | Resource Not Found | Requested resource doesn't exist |
| -1101 | Resource Access Denied | No permission to access resource |
| -1102 | Resource Unavailable | Resource temporarily unavailable |
| -1103 | Resource Conflict | Resource state conflict |

#### Tool Execution (-1200 to -1299)
| Code | Name | Description |
|------|------|-------------|
| -1200 | Tool Not Found | Requested tool doesn't exist |
| -1201 | Tool Execution Failed | Tool execution error |
| -1202 | Tool Timeout | Tool execution timed out |
| -1203 | Tool Invalid Args | Invalid tool arguments |

#### V0 API Errors (-1300 to -1399)
| Code | Name | Description |
|------|------|-------------|
| -1300 | V0 API Error | General V0 API error |
| -1301 | V0 Chat Not Found | Chat ID doesn't exist |
| -1302 | V0 Rate Limited | V0 API rate limit exceeded |
| -1303 | V0 Service Unavailable | V0 service is down |

#### Streaming Errors (-1400 to -1499)
| Code | Name | Description |
|------|------|-------------|
| -1400 | Streaming Not Supported | Method doesn't support streaming |
| -1401 | Stream Closed | Stream has been closed |
| -1402 | Stream Error | Error during streaming |

#### Logging Errors (-1500 to -1599)
| Code | Name | Description |
|------|------|-------------|
| -1500 | Invalid Log Level | Invalid log level specified |
| -1501 | Logging Disabled | Logging is currently disabled |

## Implementation Architecture

### Core Components

#### MCPError Class

The `MCPError` class extends the standard JavaScript `Error` class with MCP-specific properties:

```typescript
export class MCPError extends Error {
  public readonly code: number;           // JSON-RPC error code
  public readonly data?: any;            // Additional error context
  public readonly severity: ErrorSeverity; // Error severity level
  public readonly recoverable: boolean;   // Whether retry is possible
  
  toJSONRPC(id?: number | string | null): object
  toMCPResponse(id: number): object
}
```

#### Error Severity Levels

```typescript
export enum ErrorSeverity {
  LOW = "low",        // Minor issues, operation continues
  MEDIUM = "medium",  // Standard errors, operation fails
  HIGH = "high",      // Serious errors, may affect other operations
  CRITICAL = "critical" // System-level failures
}
```

### Error Factory Functions

Pre-defined error creators ensure consistency:

```typescript
export const MCPErrors = {
  methodNotFound: (method: string) => MCPError,
  invalidParams: (message: string, params?: any) => MCPError,
  resourceNotFound: (resource: string, id?: string) => MCPError,
  // ... 20+ more factory functions
}
```

### Error Handling Wrapper

The `withErrorHandling` wrapper provides consistent error processing:

```typescript
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: {
    operationName: string;
    fallbackError?: MCPError;
    onError?: (error: any) => void;
    sessionId?: string;
  }
): Promise<T>
```

Features:
- Automatic error conversion to MCPError
- Telemetry tracking for both success and failure
- Intelligent error pattern matching
- Consistent logging and debugging

### Validation Helpers

Type-safe parameter validation with clear error messages:

```typescript
validateRequired<T>(value: T | undefined | null, paramName: string): T
validateType<T>(value: any, expectedType: string, paramName: string): T
validateEnum<T>(value: string, validValues: T[], paramName: string): T
```

## Usage Patterns

### Basic Error Handling

```typescript
export const handleSomeMethod: MCPHandler = async (context) => {
  try {
    const { param } = context.params as { param: string };
    validateRequired(param, 'param');
    
    // Method implementation
    const result = await someOperation();
    
    return createSuccessResponse(context.id, result);
  } catch (error) {
    if (error instanceof MCPError) {
      return error.toMCPResponse(context.id);
    }
    return MCPErrors.internalError(error.message).toMCPResponse(context.id);
  }
};
```

### Using withErrorHandling Wrapper

```typescript
export const handleToolCall: MCPHandler = async (context) => {
  return withErrorHandling(
    async () => {
      const { name, arguments: args } = context.params;
      
      validateRequired(name, 'name');
      validateType(args, 'object', 'arguments');
      
      const result = await executeTool(name, args);
      return createSuccessResponse(context.id, result);
    },
    {
      operationName: "tools/call",
      sessionId: context.token,
      onError: (error) => console.error("Tool execution failed:", error)
    }
  );
};
```

### Parameter Validation

```typescript
// Validate required parameters
const chatId = validateRequired(params.chatId, 'chatId');

// Validate parameter types
const limit = validateType<number>(params.limit, 'number', 'limit');

// Validate enum values
const level = validateEnum(params.level, ['debug', 'info', 'warn', 'error'], 'level');
```

## Error Recovery and Retry Logic

### Recoverable vs Non-Recoverable Errors

The `recoverable` flag indicates whether clients should retry:

- **Recoverable** (`true`): Transient failures, rate limits, timeouts
- **Non-Recoverable** (`false`): Invalid requests, authentication failures, internal errors

### Client Retry Strategy

Clients should implement exponential backoff for recoverable errors:

```typescript
if (error.recoverable) {
  // Implement retry with exponential backoff
  await retry(operation, {
    maxAttempts: 3,
    backoff: 'exponential'
  });
}
```

## Telemetry and Monitoring

### Error Tracking

All errors are automatically tracked with rich context:

```typescript
trackError(`${operationName}_error`, sessionId, {
  errorCode: error.code,
  errorMessage: error.message,
  errorSeverity: error.severity,
  recoverable: error.recoverable,
  duration: Date.now() - startTime
});
```

### Success Tracking

Successful operations are also tracked for comparison:

```typescript
trackError(`${operationName}_success`, sessionId, {
  duration: Date.now() - startTime
});
```

## Testing Error Handling

### Test Coverage Requirements

- All error paths must have explicit test coverage
- Error response format compliance validation
- Parameter validation edge cases
- Error code consistency checks

### Example Test Cases

```typescript
describe("Error Handling", () => {
  it("should return MCP-compliant error for invalid params", async () => {
    const result = await handler({ params: {} });
    
    expect(result).toMatchObject({
      jsonrpc: "2.0",
      id: expect.any(Number),
      error: {
        code: -32602,
        message: expect.stringContaining("Invalid params"),
        data: expect.any(Object)
      }
    });
  });
  
  it("should handle tool execution failures gracefully", async () => {
    mockToolExecution.mockRejectedValue(new Error("Tool failed"));
    const result = await handleToolCall(context);
    
    expect(result.error.code).toBe(-1201); // TOOL_EXECUTION_FAILED
    expect(result.error.data).toHaveProperty('toolName');
  });
});
```

## Best Practices

### 1. Always Use the Error Abstraction

Never create raw error responses. Always use MCPError:

```typescript
// ❌ Bad
return { jsonrpc: "2.0", id, error: { code: -32602, message: "Error" } };

// ✅ Good
return MCPErrors.invalidParams("Missing parameter").toMCPResponse(id);
```

### 2. Provide Rich Error Context

Include relevant data for debugging:

```typescript
throw MCPErrors.resourceNotFound("chat", chatId);
// Includes both resource type and ID in error data
```

### 3. Validate Early

Perform parameter validation before any operations:

```typescript
// Validate all params first
const param1 = validateRequired(params.param1, 'param1');
const param2 = validateType(params.param2, 'string', 'param2');

// Then perform operations
const result = await operation(param1, param2);
```

### 4. Use Appropriate Error Severity

Choose severity based on impact:
- **LOW**: Minor issues, user can continue
- **MEDIUM**: Operation failed but system stable
- **HIGH**: Serious error affecting functionality
- **CRITICAL**: System-level failure

### 5. Log All Errors

Ensure all errors are logged for debugging:

```typescript
console.error(`Error in ${operationName}:`, error);
```

## Migration Guide

### Converting Legacy Error Handling

From:
```typescript
return createErrorResponse(id, -32603, "Failed", error.message);
```

To:
```typescript
return MCPErrors.internalError("Failed", error.message).toMCPResponse(id);
```

### Adding Error Handling to New Methods

1. Wrap operation in `withErrorHandling`
2. Add parameter validation
3. Use appropriate MCPError factories
4. Include telemetry context

## Troubleshooting

### Common Issues

1. **Error Code Conflicts**: Ensure custom codes don't overlap with JSON-RPC reserved ranges
2. **Missing Error Data**: Always include relevant context in error data field
3. **Inconsistent Format**: Use MCPError.toMCPResponse() for all error responses
4. **Telemetry Gaps**: Ensure sessionId is passed for proper tracking

### Debugging Tips

1. Check error logs for full stack traces
2. Examine error data field for context
3. Use error codes to identify error categories
4. Monitor telemetry for error patterns

## Future Enhancements

### Planned Improvements

1. **Error Rate Monitoring**: Automatic alerts for error rate spikes
2. **Self-Healing**: Automatic recovery for certain error types
3. **Client-Specific Errors**: Tailored error messages based on client capabilities
4. **Error Analytics Dashboard**: Visual error tracking and analysis

### Extension Points

The error system is designed for extensibility:

1. Add new error codes in designated ranges
2. Extend MCPError class for specialized error types
3. Implement custom error handlers in withErrorHandling
4. Add new validation helpers as needed

## References

- [MCP Specification - Error Handling](https://modelcontextprotocol.io/specification/2025-06-18/basic/lifecycle#error-handling)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [Implementation Source](./lib/mcp-errors.ts)
- [Test Suite](./__tests__/mcp-handlers.test.ts)