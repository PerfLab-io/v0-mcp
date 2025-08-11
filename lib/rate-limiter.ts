// Redis-based rate limiting for MCP logging
import { Redis } from "@upstash/redis";
import { serverEnv } from "./env.server";
import { RateLimitState } from "@/types/mcp-logging";

// Reuse the existing Redis connection from kv-storage
const redis = new Redis({
  url: serverEnv.KV_REST_API_URL,
  token: serverEnv.KV_REST_API_TOKEN,
});

export class RateLimiter {
  private prefix = "ratelimit:logging:";

  /**
   * Check if a session can log a message based on rate limiting
   * Uses sliding window algorithm with Redis
   */
  async checkRateLimit(
    sessionId: string,
    maxMessages: number = 100,
    windowMs: number = 60000
  ): Promise<boolean> {
    const key = `${this.prefix}${sessionId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline();
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current entries in the window
      pipeline.zcard(key);
      
      // Add current timestamp
      pipeline.zadd(key, { score: now, member: now.toString() });
      
      // Set expiration to window size + buffer
      pipeline.expire(key, Math.ceil((windowMs + 10000) / 1000));
      
      const results = await pipeline.exec();
      
      if (!results) {
        // If pipeline fails, allow the request (fail open)
        return true;
      }

      // Get the count after cleanup but before adding new entry
      const currentCount = results[1] as number;
      
      // Allow if under limit
      return currentCount < maxMessages;
      
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the request if rate limiting fails
      return true;
    }
  }

  /**
   * Get current rate limit status for a session
   */
  async getRateLimitStatus(
    sessionId: string,
    windowMs: number = 60000
  ): Promise<RateLimitState> {
    const key = `${this.prefix}${sessionId}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Clean up old entries and count current
      await redis.zremrangebyscore(key, 0, windowStart);
      const count = await redis.zcard(key) || 0;
      
      return {
        count,
        resetTime: now + windowMs
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        count: 0,
        resetTime: now + windowMs
      };
    }
  }

  /**
   * Reset rate limit for a session (admin function)
   */
  async resetRateLimit(sessionId: string): Promise<void> {
    const key = `${this.prefix}${sessionId}`;
    
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Get rate limit info for multiple sessions (admin function)
   */
  async getRateLimitInfo(sessionIds: string[], windowMs: number = 60000): Promise<Record<string, RateLimitState>> {
    const results: Record<string, RateLimitState> = {};
    
    try {
      const pipeline = redis.pipeline();
      const now = Date.now();
      const windowStart = now - windowMs;

      // Queue up operations for all sessions
      sessionIds.forEach(sessionId => {
        const key = `${this.prefix}${sessionId}`;
        pipeline.zremrangebyscore(key, 0, windowStart);
        pipeline.zcard(key);
      });

      const pipelineResults = await pipeline.exec();

      if (pipelineResults) {
        // Process results (every 2 results belong to one session)
        sessionIds.forEach((sessionId, index) => {
          const countIndex = (index * 2) + 1; // Skip cleanup result, get count
          const count = pipelineResults[countIndex] as number || 0;
          
          results[sessionId] = {
            count,
            resetTime: now + windowMs
          };
        });
      }
    } catch (error) {
      console.error('Failed to get rate limit info for multiple sessions:', error);
      
      // Return empty results for all sessions
      sessionIds.forEach(sessionId => {
        results[sessionId] = {
          count: 0,
          resetTime: Date.now() + windowMs
        };
      });
    }

    return results;
  }

  /**
   * Cleanup old rate limit data (maintenance function)
   * Should be called periodically to prevent memory bloat
   */
  async cleanup(olderThanMs: number = 3600000): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    let cleanedCount = 0;

    try {
      // Get all rate limit keys
      const keys = await redis.keys(`${this.prefix}*`);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = redis.pipeline();

      // Remove old entries from each key
      keys.forEach(key => {
        pipeline.zremrangebyscore(key, 0, cutoff);
      });

      const results = await pipeline.exec();
      
      if (results) {
        cleanedCount = results.reduce((total: number, result) => total + ((result as number) || 0), 0);
      }

      // Remove completely empty keys
      const emptyCheckPipeline = redis.pipeline();
      keys.forEach(key => {
        emptyCheckPipeline.zcard(key);
      });

      const cardResults = await emptyCheckPipeline.exec();
      
      if (cardResults) {
        const deletePipeline = redis.pipeline();
        keys.forEach((key, index) => {
          const count = cardResults[index] as number;
          if (count === 0) {
            deletePipeline.del(key);
          }
        });
        
        const pipelineLength = (deletePipeline as any).length;
        if (pipelineLength > 0) {
          await deletePipeline.exec();
        }
      }

    } catch (error) {
      console.error('Rate limit cleanup failed:', error);
    }

    return cleanedCount;
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();