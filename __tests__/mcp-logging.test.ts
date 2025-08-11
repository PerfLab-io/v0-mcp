// Unit tests for MCP Logging system
import {
  LogLevel,
  isValidLogLevel,
  shouldLogAtLevel,
  DEFAULT_LOGGING_CONFIG,
} from "@/types/mcp-logging";
import { redactSensitiveData, createSafeLogData } from "@/lib/log-filters";
import { MCPLogger } from "@/lib/mcp-logging";
import { RateLimiter } from "@/lib/rate-limiter";
import { LoggingKV } from "@/lib/kv-storage";
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/kv-storage", () => ({
  LoggingKV: vi.fn(),
  LOGGING_KV: {
    getConfig: vi.fn(),
    setConfig: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    updateLevel: vi.fn(),
    cleanup: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limiter", () => ({
  RateLimiter: vi.fn(),
  rateLimiter: {
    checkRateLimit: vi.fn(),
    getRateLimitStatus: vi.fn(),
    resetRateLimit: vi.fn(),
    cleanup: vi.fn(),
  },
}));

describe("MCP Logging Types", () => {
  test("validates log levels correctly", () => {
    expect(isValidLogLevel("debug")).toBe(true);
    expect(isValidLogLevel("info")).toBe(true);
    expect(isValidLogLevel("warning")).toBe(true);
    expect(isValidLogLevel("error")).toBe(true);
    expect(isValidLogLevel("critical")).toBe(true);
    expect(isValidLogLevel("emergency")).toBe(true);

    expect(isValidLogLevel("invalid")).toBe(false);
    expect(isValidLogLevel("")).toBe(false);
    // @ts-ignore - testing invalid input
    expect(isValidLogLevel(null)).toBe(false);
  });

  test("determines if message should be logged based on level", () => {
    // ERROR level session should log ERROR and higher priority levels
    expect(shouldLogAtLevel(LogLevel.EMERGENCY, LogLevel.ERROR)).toBe(true); // higher priority
    expect(shouldLogAtLevel(LogLevel.ALERT, LogLevel.ERROR)).toBe(true); // higher priority
    expect(shouldLogAtLevel(LogLevel.CRITICAL, LogLevel.ERROR)).toBe(true); // higher priority
    expect(shouldLogAtLevel(LogLevel.ERROR, LogLevel.ERROR)).toBe(true); // same level
    expect(shouldLogAtLevel(LogLevel.WARNING, LogLevel.ERROR)).toBe(false); // lower priority
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.ERROR)).toBe(false); // lower priority
    expect(shouldLogAtLevel(LogLevel.DEBUG, LogLevel.ERROR)).toBe(false); // lower priority

    // INFO level session should log INFO and higher priority levels
    expect(shouldLogAtLevel(LogLevel.ERROR, LogLevel.INFO)).toBe(true); // higher priority
    expect(shouldLogAtLevel(LogLevel.WARNING, LogLevel.INFO)).toBe(true); // higher priority
    expect(shouldLogAtLevel(LogLevel.NOTICE, LogLevel.INFO)).toBe(true); // higher priority
    expect(shouldLogAtLevel(LogLevel.INFO, LogLevel.INFO)).toBe(true); // same level
    expect(shouldLogAtLevel(LogLevel.DEBUG, LogLevel.INFO)).toBe(false); // lower priority
  });
});

describe("Log Security Filtering", () => {
  test("redacts API keys and tokens", () => {
    const input = {
      apiKey: "secret123",
      token: "bearer-token-456",
      authHeader: "Bearer secret-token",
      normal: "safe-data",
    };

    const filtered = redactSensitiveData(input);

    expect(filtered.apiKey).toBe("[REDACTED]");
    expect(filtered.token).toBe("[REDACTED]");
    expect(filtered.authHeader).toBe("[REDACTED]");
    expect(filtered.normal).toBe("safe-data");
  });

  test("redacts sensitive information in strings", () => {
    const input = "My apikey=abc123 and password:secret456";
    const filtered = redactSensitiveData(input);
    expect(filtered).toContain("[REDACTED]");
    expect(filtered).not.toContain("abc123");
    expect(filtered).not.toContain("secret456");
  });

  test("redacts email addresses", () => {
    const input = { email: "user@example.com", name: "John" };
    const filtered = redactSensitiveData(input);
    expect(filtered.email).toBe("[REDACTED]");
    expect(filtered.name).toBe("John");
  });

  test("handles nested objects recursively", () => {
    const input = {
      user: {
        credentials: {
          apiKey: "secret",
          publicInfo: "safe",
        },
        profile: {
          email: "test@example.com",
          name: "Test User",
        },
      },
    };

    const filtered = redactSensitiveData(input);
    expect(filtered.user.credentials.apiKey).toBe("[REDACTED]");
    expect(filtered.user.credentials.publicInfo).toBe("safe");
    expect(filtered.user.profile.email).toBe("[REDACTED]");
    expect(filtered.user.profile.name).toBe("Test User");
  });

  test("handles arrays correctly", () => {
    const input = [
      { token: "secret1", data: "safe1" },
      { token: "secret2", data: "safe2" },
    ];

    const filtered = redactSensitiveData(input);
    expect(filtered[0].token).toBe("[REDACTED]");
    expect(filtered[0].data).toBe("safe1");
    expect(filtered[1].token).toBe("[REDACTED]");
    expect(filtered[1].data).toBe("safe2");
  });

  test("createSafeLogData handles errors gracefully", () => {
    // Mock an error by passing a circular reference
    const circular: any = { prop: "value" };
    circular.self = circular;

    const result = createSafeLogData(circular);
    // Should not throw and should return safe error info
    expect(result).toHaveProperty("error");
  });
});

describe("MCPLogger", () => {
  let mockLoggingKV: any;
  let mockRateLimiter: any;
  let logger: MCPLogger;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLoggingKV = {
      getConfig: vi.fn(),
      setConfig: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      updateLevel: vi.fn(),
      cleanup: vi.fn(),
    };

    mockRateLimiter = {
      checkRateLimit: vi.fn(),
      getRateLimitStatus: vi.fn(),
      resetRateLimit: vi.fn(),
      cleanup: vi.fn(),
    };

    logger = new MCPLogger(mockLoggingKV, mockRateLimiter);
  });

  test("setLogLevel creates and stores configuration", async () => {
    mockLoggingKV.getConfig.mockResolvedValue(null);

    await logger.setLogLevel("session1", LogLevel.WARNING);

    expect(mockLoggingKV.setConfig).toHaveBeenCalledWith(
      "session1",
      expect.objectContaining({
        sessionId: "session1",
        minLevel: LogLevel.WARNING,
        rateLimit: DEFAULT_LOGGING_CONFIG.rateLimit,
      }),
      86400,
    );
  });

  test("setLogLevel updates existing configuration", async () => {
    const existingConfig = {
      sessionId: "session1",
      minLevel: LogLevel.INFO,
      rateLimit: { maxMessages: 50, windowMs: 30000 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    mockLoggingKV.getConfig.mockResolvedValue(existingConfig);

    await logger.setLogLevel("session1", LogLevel.ERROR);

    expect(mockLoggingKV.setConfig).toHaveBeenCalledWith(
      "session1",
      expect.objectContaining({
        sessionId: "session1",
        minLevel: LogLevel.ERROR,
        rateLimit: { maxMessages: 50, windowMs: 30000 },
      }),
      86400,
    );
  });

  test("log respects session minimum level", async () => {
    const config = {
      sessionId: "session1",
      minLevel: LogLevel.WARNING,
      rateLimit: { maxMessages: 100, windowMs: 60000 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    mockLoggingKV.getConfig.mockResolvedValue(config);
    mockRateLimiter.checkRateLimit.mockResolvedValue(true);

    // DEBUG message should not be logged (lower priority than WARNING)
    const debugResult = await logger.log("session1", LogLevel.DEBUG, "test", {
      msg: "debug",
    });
    expect(debugResult).toBe(false);

    // ERROR message should be logged (higher priority than WARNING)
    const errorResult = await logger.log("session1", LogLevel.ERROR, "test", {
      msg: "error",
    });
    expect(errorResult).toBe(true);
  });

  test("log respects rate limiting", async () => {
    const config = {
      sessionId: "session1",
      minLevel: LogLevel.DEBUG,
      rateLimit: { maxMessages: 100, windowMs: 60000 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    mockLoggingKV.getConfig.mockResolvedValue(config);
    mockRateLimiter.checkRateLimit.mockResolvedValue(false); // Rate limit exceeded

    const result = await logger.log("session1", LogLevel.INFO, "test", {
      msg: "info",
    });
    expect(result).toBe(false);

    expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith(
      "session1",
      100,
      60000,
    );
  });

  test("log filters sensitive data", async () => {
    const config = {
      sessionId: "session1",
      minLevel: LogLevel.DEBUG,
      rateLimit: { maxMessages: 100, windowMs: 60000 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    mockLoggingKV.getConfig.mockResolvedValue(config);
    mockRateLimiter.checkRateLimit.mockResolvedValue(true);

    const sensitiveData = {
      message: "User login",
      apiKey: "secret123",
      email: "user@example.com",
      publicData: "safe",
    };

    // Mock console.log to capture the notification
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await logger.log("session1", LogLevel.INFO, "auth", sensitiveData);

    expect(consoleSpy).toHaveBeenCalledWith(
      "MCP Log Notification:",
      expect.stringContaining("[REDACTED]"),
    );

    // Verify the logged data is properly filtered
    const loggedData = JSON.parse(consoleSpy.mock.calls[0][1]);
    expect(loggedData.params.data.apiKey).toBe("[REDACTED]");
    expect(loggedData.params.data.email).toBe("[REDACTED]");
    expect(loggedData.params.data.publicData).toBe("safe");

    consoleSpy.mockRestore();
  });

  test("shouldLog returns correct boolean based on session config", async () => {
    const config = {
      sessionId: "session1",
      minLevel: LogLevel.WARNING,
      rateLimit: { maxMessages: 100, windowMs: 60000 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    mockLoggingKV.getConfig.mockResolvedValue(config);

    expect(await logger.shouldLog("session1", LogLevel.ERROR)).toBe(true); // higher priority
    expect(await logger.shouldLog("session1", LogLevel.WARNING)).toBe(true); // same level
    expect(await logger.shouldLog("session1", LogLevel.NOTICE)).toBe(false); // lower priority
    expect(await logger.shouldLog("session1", LogLevel.DEBUG)).toBe(false); // lower priority
  });

  test("convenience methods work correctly", async () => {
    const config = {
      sessionId: "session1",
      minLevel: LogLevel.DEBUG,
      rateLimit: { maxMessages: 100, windowMs: 60000 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    };

    mockLoggingKV.getConfig.mockResolvedValue(config);
    mockRateLimiter.checkRateLimit.mockResolvedValue(true);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await logger.debug("session1", "test", { msg: "debug" });
    await logger.info("session1", "test", { msg: "info" });
    await logger.warning("session1", "test", { msg: "warning" });
    await logger.error("session1", "test", { msg: "error" });

    // All should have been logged since session is at DEBUG level
    expect(consoleSpy).toHaveBeenCalledTimes(4);

    const calls = consoleSpy.mock.calls;
    expect(calls[0][1]).toContain('"level": "debug"');
    expect(calls[1][1]).toContain('"level": "info"');
    expect(calls[2][1]).toContain('"level": "warning"');
    expect(calls[3][1]).toContain('"level": "error"');

    consoleSpy.mockRestore();
  });

  test("handles errors gracefully", async () => {
    mockLoggingKV.getConfig.mockRejectedValue(new Error("KV error"));

    // Should not throw and should return false
    const result = await logger.log("session1", LogLevel.INFO, "test", {
      msg: "test",
    });
    expect(result).toBe(false);
  });
});

describe("Integration", () => {
  test("complete logging flow works end-to-end", async () => {
    const mockLoggingKV = {
      getConfig: vi.fn(),
      setConfig: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      updateLevel: vi.fn(),
      cleanup: vi.fn(),
    } as any;

    const mockRateLimiter = {
      checkRateLimit: vi.fn().mockResolvedValue(true),
      getRateLimitStatus: vi.fn(),
      resetRateLimit: vi.fn(),
      cleanup: vi.fn(),
    } as any;

    const logger = new MCPLogger(mockLoggingKV, mockRateLimiter);

    // Mock no existing config
    mockLoggingKV.getConfig.mockResolvedValue(null);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Set log level to INFO
    await logger.setLogLevel("session1", LogLevel.INFO);

    // Mock the config that would be created
    const expectedConfig = expect.objectContaining({
      sessionId: "session1",
      minLevel: LogLevel.INFO,
    });

    mockLoggingKV.getConfig.mockResolvedValue({
      sessionId: "session1",
      minLevel: LogLevel.INFO,
      rateLimit: { maxMessages: 100, windowMs: 60000 },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-01T00:00:00.000Z",
    });

    // Try to log at different levels
    const debugResult = await logger.log("session1", LogLevel.DEBUG, "test", {
      msg: "debug",
    });
    const infoResult = await logger.log("session1", LogLevel.INFO, "test", {
      msg: "info",
    });
    const errorResult = await logger.log("session1", LogLevel.ERROR, "test", {
      msg: "error",
    });

    expect(debugResult).toBe(false); // DEBUG > INFO, should not log
    expect(infoResult).toBe(true); // INFO == INFO, should log
    expect(errorResult).toBe(true); // ERROR < INFO, should log

    expect(consoleSpy).toHaveBeenCalledTimes(2); // Only info and error logged

    consoleSpy.mockRestore();
  });
});
