import { Redis } from "@upstash/redis";
import { serverEnv } from "./env.server";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const byteSize = (str: string) => new Blob([str]).size;

// Metadata wrapper for gzipped data
interface KVDataWrapper {
  data: string;
  isGzip: boolean;
}

const redis = new Redis({
  url: serverEnv.KV_REST_API_URL,
  token: serverEnv.KV_REST_API_TOKEN,
});

// KV Storage interface matching the v0-mcp-cfw patterns
export interface KVStorage {
  get<T = any>(key: string): Promise<T | null>;
  put(
    key: string,
    value: any,
    options?: { expirationTtl?: number; isGzip?: boolean },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string }): Promise<string[]>;
}

// OAuth KV - stores OAuth provider state and client approvals
export class OAuthKV implements KVStorage {
  private prefix = "oauth:";

  async get<T = any>(key: string): Promise<T | null> {
    const result = await redis.get(`${this.prefix}${key}`);
    return result as T | null;
  }

  async put(
    key: string,
    value: any,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    if (options?.expirationTtl) {
      await redis.setex(fullKey, options.expirationTtl, JSON.stringify(value));
    } else {
      await redis.set(fullKey, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(`${this.prefix}${key}`);
  }

  async list(options?: { prefix?: string }): Promise<string[]> {
    const searchPrefix = `${this.prefix}${options?.prefix || ""}`;
    const keys = await redis.keys(`${searchPrefix}*`);
    return keys.map((key) => key.replace(this.prefix, ""));
  }
}

// API KV - stores encrypted API keys with user metadata
export class ApiKV implements KVStorage {
  private prefix = "api:";

  async get<T = any>(key: string): Promise<T | null> {
    const result = await redis.get(`${this.prefix}${key}`);
    if (!result) return null;

    // Check if result is a wrapped object with gzip metadata
    if (
      typeof result === "object" &&
      result !== null &&
      "data" in result &&
      "isGzip" in result
    ) {
      const wrapped = result as KVDataWrapper;
      if (wrapped.isGzip) {
        // Decompress the data
        const compressedBuffer = Buffer.from(wrapped.data, "base64");
        const decompressed = await gunzipAsync(compressedBuffer);
        return JSON.parse(decompressed.toString()) as T;
      } else {
        // Data is not compressed, parse directly
        return JSON.parse(wrapped.data) as T;
      }
    } else {
      // Legacy format - return as-is
      return result as T;
    }
  }

  async put(
    key: string,
    value: any,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    let dataToStore: KVDataWrapper;
    const jsonString = JSON.stringify(value);

    const shouldCompress = byteSize(jsonString) > 500; // Compress if larger than 500 bytes

    if (shouldCompress) {
      // Compress the data
      const compressed = await gzipAsync(Buffer.from(jsonString));
      dataToStore = {
        data: compressed.toString("base64"),
        isGzip: true,
      };
    } else {
      // Store without compression
      dataToStore = {
        data: jsonString,
        isGzip: false,
      };
    }

    if (options?.expirationTtl) {
      await redis.setex(fullKey, options.expirationTtl, dataToStore);
    } else {
      await redis.set(fullKey, dataToStore);
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(`${this.prefix}${key}`);
  }

  async list(options?: { prefix?: string }): Promise<string[]> {
    const searchPrefix = `${this.prefix}${options?.prefix || ""}`;
    const keys = await redis.keys(`${searchPrefix}*`);
    return keys.map((key) => key.replace(this.prefix, ""));
  }
}

// Session KV - stores session data
export class SessionKV implements KVStorage {
  private prefix = "session:";

  async get<T = any>(key: string): Promise<T | null> {
    const result = await redis.get(`${this.prefix}${key}`);
    return result as T | null;
  }

  async put(
    key: string,
    value: any,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    if (options?.expirationTtl) {
      await redis.setex(fullKey, options.expirationTtl, JSON.stringify(value));
    } else {
      await redis.set(fullKey, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(`${this.prefix}${key}`);
  }

  async list(options?: { prefix?: string }): Promise<string[]> {
    const searchPrefix = `${this.prefix}${options?.prefix || ""}`;
    const keys = await redis.keys(`${searchPrefix}*`);
    return keys.map((key) => key.replace(this.prefix, ""));
  }
}

// Logging KV - stores session-specific logging configurations
export class LoggingKV implements KVStorage {
  private prefix = "logging:";

  async get<T = any>(key: string): Promise<T | null> {
    const result = await redis.get(`${this.prefix}${key}`);
    return result as T | null;
  }

  async put(
    key: string,
    value: any,
    options?: { expirationTtl?: number },
  ): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    if (options?.expirationTtl) {
      await redis.setex(fullKey, options.expirationTtl, JSON.stringify(value));
    } else {
      await redis.set(fullKey, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(`${this.prefix}${key}`);
  }

  async list(options?: { prefix?: string }): Promise<string[]> {
    const searchPrefix = `${this.prefix}${options?.prefix || ""}`;
    const keys = await redis.keys(`${searchPrefix}*`);
    return keys.map((key) => key.replace(this.prefix, ""));
  }

  // Logging-specific methods
  async getConfig(sessionId: string): Promise<any | null> {
    return this.get(`config:${sessionId}`);
  }

  async setConfig(
    sessionId: string,
    config: any,
    ttlSeconds?: number,
  ): Promise<void> {
    return this.put(`config:${sessionId}`, config, {
      expirationTtl: ttlSeconds,
    });
  }

  async updateLevel(sessionId: string, level: string): Promise<void> {
    const config = await this.getConfig(sessionId);
    if (config) {
      config.minLevel = level;
      config.updatedAt = new Date().toISOString();
      await this.setConfig(sessionId, config);
    }
  }

  async cleanup(olderThanMs: number = 86400000): Promise<number> {
    const configs = await this.list({ prefix: "config:" });
    let cleanedCount = 0;
    const cutoff = new Date(Date.now() - olderThanMs);

    for (const configKey of configs) {
      const config = await this.get(configKey);
      if (config && config.updatedAt && new Date(config.updatedAt) < cutoff) {
        await this.delete(configKey);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }
}

// Export singleton instances
export const OAUTH_KV = new OAuthKV();
export const API_KV = new ApiKV();
export const SESSION_KV = new SessionKV();
export const LOGGING_KV = new LoggingKV();

// Utility types for KV data structures
export interface ApiKeyData {
  userId: string;
  encryptedApiKey: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export interface SessionData {
  id: string;
  clientId: string;
  clientName?: string;
  clientVersion?: string;
  clientType: string;
  createdAt: string;
  lastActivity: string;
}

export interface OAuthState {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  state?: string;
  resource?: string;
  createdAt: string;
  expiresAt: string;
}
