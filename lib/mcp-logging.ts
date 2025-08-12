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
import { sseManager } from "@/lib/sse-manager";

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

    let config = await this.loggingKV.getConfig(sessionId);

    if (!config) {
      config = this.createDefaultConfig(sessionId);
    }

    config.minLevel = level;
    config.updatedAt = new Date().toISOString();

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
      const config = await this.getSessionConfig(sessionId);

      if (!shouldLogAtLevel(level, config.minLevel)) {
        return false;
      }

      const rateLimitOk = await this.rateLimiter.checkRateLimit(
        sessionId,
        config.rateLimit.maxMessages,
        config.rateLimit.windowMs,
      );

      if (!rateLimitOk) {
        if (shouldLogAtLevel(LogLevel.WARNING, config.minLevel)) {
          const warningNotification = this.createLogNotification(
            LogLevel.WARNING,
            "mcp-logger",
            { message: "Rate limit exceeded for logging", sessionId },
          );
          this.sendNotification(warningNotification, sessionId);
        }
        return false;
      }

      const safeData = redactSensitiveData(data);

      const notification = this.createLogNotification(level, logger, safeData);
      await this.sendNotification(notification, sessionId);

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

  private async sendNotification(
    notification: LogNotification,
    sessionId?: string,
  ): Promise<void> {
    try {
      if (!sessionId && notification.params?.data?.sessionId) {
        sessionId = notification.params.data.sessionId;
      }

      if (!sessionId) {
        console.warn("Cannot send MCP notification: no session ID available");
        return;
      }

      const sentViaSSE = await sseManager.sendNotification(
        sessionId,
        notification,
      );

      if (sentViaSSE) {
        console.log("MCP Log Notification sent via SSE to session:", sessionId);
      } else {
        console.log(
          "MCP Log Notification (no active SSE):",
          JSON.stringify(notification, null, 2),
        );
      }
    } catch (error) {
      console.error("Failed to send MCP notification:", error);
      console.log(
        "MCP Log Notification (fallback):",
        JSON.stringify(notification, null, 2),
      );
    }
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

export const mcpLogger = new MCPLogger();
