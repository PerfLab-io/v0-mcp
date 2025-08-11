// Core MCP Logging Implementation
import {
  LogLevel,
  LoggingConfig,
  MCPLogMessage,
  LogNotification,
  DEFAULT_LOGGING_CONFIG,
  isValidLogLevel,
  shouldLogAtLevel,
} from "@/types/mcp-logging";
import { LOGGING_KV } from "@/lib/kv-storage";
import { rateLimiter, RateLimiter } from "@/lib/rate-limiter";
import { redactSensitiveData } from "@/lib/log-filters";

export class MCPLogger {
  constructor(
    private loggingKV = LOGGING_KV,
    private rateLimiterInstance?: RateLimiter,
  ) {}

  private get rateLimiter(): RateLimiter {
    return this.rateLimiterInstance || rateLimiter;
  }

  /**
   * Set the minimum log level for a session
   */
  async setLogLevel(sessionId: string, level: LogLevel): Promise<void> {
    if (!isValidLogLevel(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }

    // Get existing config or create default
    let config = await this.loggingKV.getConfig(sessionId);

    if (!config) {
      config = this.createDefaultConfig(sessionId);
    }

    // Update level and timestamp
    config.minLevel = level;
    config.updatedAt = new Date().toISOString();

    // Save with session TTL (24 hours default)
    await this.loggingKV.setConfig(sessionId, config, 86400);
  }

  /**
   * Log a message if it meets the session's minimum level and rate limits
   */
  async log(
    sessionId: string,
    level: LogLevel,
    logger: string = "mcp-server",
    data: any,
  ): Promise<boolean> {
    try {
      // Get session config
      const config = await this.getSessionConfig(sessionId);

      // Check if message should be logged based on level
      if (!shouldLogAtLevel(level, config.minLevel)) {
        return false;
      }

      // Check rate limit
      const rateLimitOk = await this.rateLimiter.checkRateLimit(
        sessionId,
        config.rateLimit.maxMessages,
        config.rateLimit.windowMs,
      );

      if (!rateLimitOk) {
        // Log a rate limit warning if we're at INFO level or below
        if (shouldLogAtLevel(LogLevel.WARNING, config.minLevel)) {
          const warningNotification = this.createLogNotification(
            LogLevel.WARNING,
            "mcp-logger",
            { message: "Rate limit exceeded for logging", sessionId },
          );
          this.sendNotification(warningNotification);
        }
        return false;
      }

      // Filter sensitive data
      const safeData = redactSensitiveData(data);

      // Create and send log notification
      const notification = this.createLogNotification(level, logger, safeData);
      await this.sendNotification(notification);

      return true;
    } catch (error) {
      console.error("MCPLogger.log failed:", error);
      return false;
    }
  }

  /**
   * Check if a message at the given level should be logged for this session
   */
  async shouldLog(sessionId: string, level: LogLevel): Promise<boolean> {
    try {
      const config = await this.getSessionConfig(sessionId);
      return shouldLogAtLevel(level, config.minLevel);
    } catch (error) {
      console.error("MCPLogger.shouldLog failed:", error);
      // Default to INFO level when error occurs
      return shouldLogAtLevel(level, LogLevel.INFO);
    }
  }

  /**
   * Get the current logging configuration for a session
   */
  async getLoggingConfig(sessionId: string): Promise<LoggingConfig> {
    return this.getSessionConfig(sessionId);
  }

  /**
   * Update rate limiting configuration for a session
   */
  async updateRateLimit(
    sessionId: string,
    maxMessages: number,
    windowMs: number,
  ): Promise<void> {
    const config = await this.getSessionConfig(sessionId);

    config.rateLimit = { maxMessages, windowMs };
    config.updatedAt = new Date().toISOString();

    await this.loggingKV.setConfig(sessionId, config, 86400);
  }

  /**
   * Convenience methods for different log levels
   */
  async debug(sessionId: string, logger: string, data: any): Promise<boolean> {
    return this.log(sessionId, LogLevel.DEBUG, logger, data);
  }

  async info(sessionId: string, logger: string, data: any): Promise<boolean> {
    return this.log(sessionId, LogLevel.INFO, logger, data);
  }

  async notice(sessionId: string, logger: string, data: any): Promise<boolean> {
    return this.log(sessionId, LogLevel.NOTICE, logger, data);
  }

  async warning(
    sessionId: string,
    logger: string,
    data: any,
  ): Promise<boolean> {
    return this.log(sessionId, LogLevel.WARNING, logger, data);
  }

  async error(sessionId: string, logger: string, data: any): Promise<boolean> {
    return this.log(sessionId, LogLevel.ERROR, logger, data);
  }

  async critical(
    sessionId: string,
    logger: string,
    data: any,
  ): Promise<boolean> {
    return this.log(sessionId, LogLevel.CRITICAL, logger, data);
  }

  async alert(sessionId: string, logger: string, data: any): Promise<boolean> {
    return this.log(sessionId, LogLevel.ALERT, logger, data);
  }

  async emergency(
    sessionId: string,
    logger: string,
    data: any,
  ): Promise<boolean> {
    return this.log(sessionId, LogLevel.EMERGENCY, logger, data);
  }

  /**
   * Private helper methods
   */
  private async getSessionConfig(sessionId: string): Promise<LoggingConfig> {
    let config = await this.loggingKV.getConfig(sessionId);

    if (!config) {
      config = this.createDefaultConfig(sessionId);
      // Save default config with TTL
      await this.loggingKV.setConfig(sessionId, config, 86400);
    }

    return config;
  }

  private createDefaultConfig(sessionId: string): LoggingConfig {
    const now = new Date().toISOString();

    return {
      sessionId,
      ...DEFAULT_LOGGING_CONFIG,
      createdAt: now,
      updatedAt: now,
    };
  }

  private createLogNotification(
    level: LogLevel,
    logger: string,
    data: any,
  ): LogNotification {
    return {
      jsonrpc: "2.0",
      method: "notifications/message",
      params: {
        level,
        logger,
        data,
      },
    };
  }

  private async sendNotification(notification: LogNotification): Promise<void> {
    // In the actual MCP server implementation, this would send the notification
    // to the client via the established transport (HTTP, WebSocket, etc.)
    // For now, we'll just log to console for debugging
    console.log("MCP Log Notification:", JSON.stringify(notification, null, 2));

    // TODO: Integrate with actual MCP transport layer
    // This will be handled in the route.ts integration
  }

  /**
   * Admin/maintenance methods
   */
  async getSessionStats(sessionId: string): Promise<any> {
    const config = await this.getSessionConfig(sessionId);
    const rateLimitStatus = await this.rateLimiter.getRateLimitStatus(
      sessionId,
      config.rateLimit.windowMs,
    );

    return {
      config,
      rateLimitStatus,
      timestamp: new Date().toISOString(),
    };
  }

  async cleanup(olderThanMs: number = 86400000): Promise<{
    configsCleaned: number;
    rateLimitsCleaned: number;
  }> {
    const [configsCleaned, rateLimitsCleaned] = await Promise.all([
      this.loggingKV.cleanup(olderThanMs),
      this.rateLimiter.cleanup(olderThanMs),
    ]);

    return { configsCleaned, rateLimitsCleaned };
  }
}

// Export singleton instance for use across the application
export const mcpLogger = new MCPLogger();
