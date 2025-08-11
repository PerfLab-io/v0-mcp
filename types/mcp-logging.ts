// MCP Logging Types and Interfaces
// RFC 5424 Log Levels as defined by MCP specification

export enum LogLevel {
  EMERGENCY = "emergency",
  ALERT = "alert",
  CRITICAL = "critical",
  ERROR = "error", 
  WARNING = "warning",
  NOTICE = "notice",
  INFO = "info",
  DEBUG = "debug",
}

// Log level priority ordering (for comparison purposes)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.EMERGENCY]: 0,
  [LogLevel.ALERT]: 1,
  [LogLevel.CRITICAL]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.WARNING]: 4,
  [LogLevel.NOTICE]: 5,
  [LogLevel.INFO]: 6,
  [LogLevel.DEBUG]: 7,
};

// MCP protocol log message structure
export interface MCPLogMessage {
  level: LogLevel;
  logger?: string;
  data: any; // JSON-serializable object
}

// Session-based logging configuration
export interface LoggingConfig {
  sessionId: string;
  minLevel: LogLevel;
  rateLimit: {
    maxMessages: number;
    windowMs: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Rate limiting tracking
export interface RateLimitState {
  count: number;
  resetTime: number;
}

// MCP notification message format for logging
export interface LogNotification {
  jsonrpc: "2.0";
  method: "notifications/message";
  params: {
    level: LogLevel;
    logger?: string;
    data: any;
  };
}

// Type guards and utilities
export function isValidLogLevel(level: string): level is LogLevel {
  return Object.values(LogLevel).includes(level as LogLevel);
}

export function shouldLogAtLevel(messageLevel: LogLevel, sessionMinLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[messageLevel] <= LOG_LEVEL_PRIORITY[sessionMinLevel];
}

// Default logging configuration
export const DEFAULT_LOGGING_CONFIG: Omit<LoggingConfig, "sessionId" | "createdAt" | "updatedAt"> = {
  minLevel: LogLevel.INFO,
  rateLimit: {
    maxMessages: 100,
    windowMs: 60000, // 1 minute
  },
};