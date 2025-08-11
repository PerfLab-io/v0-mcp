import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClientInfoFromRequest } from "@/lib/analytics.server";

// Mock the track function from Vercel analytics
vi.mock("@vercel/analytics/server", () => ({
  track: vi.fn(),
}));

describe("Analytics Client Info Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getClientInfoFromRequest", () => {
    it("should return the raw User-Agent string as client string", () => {
      const ua = "Claude Desktop/1.2.3 (Windows NT 10.0; Win64; x64)";
      const mockRequest = new Request("http://example.com", {
        headers: { "User-Agent": ua },
      });

      const result = getClientInfoFromRequest(mockRequest);
      expect(result).toBe(ua.substring(0, 128));
    });

    it("should handle missing User-Agent header", () => {
      const mockRequest = new Request("http://example.com");
      const result = getClientInfoFromRequest(mockRequest);
      expect(result).toBe("unknown");
    });

    it("should truncate very long User-Agent strings", () => {
      const veryLongUA = "A".repeat(200);
      const mockRequest = new Request("http://example.com", {
        headers: { "User-Agent": veryLongUA },
      });

      const result = getClientInfoFromRequest(mockRequest);
      expect(result.length).toBeLessThanOrEqual(128);
      expect(result).toBe(veryLongUA.substring(0, 128));
    });

    it("should work with common clients without parsing", () => {
      const uas = [
        "Cline/2.1.0 VS Code Extension",
        "Visual Studio Code/1.85.0",
        "Node.js/18.17.0 MCP Client",
        "Python/3.11.0 requests/2.31.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "curl/8.4.0",
        "SomeUnknownClient/1.0",
        "MCPClient/1.0.0 (custom implementation)",
      ];

      for (const ua of uas) {
        const mockRequest = new Request("http://example.com", {
          headers: { "User-Agent": ua },
        });
        const result = getClientInfoFromRequest(mockRequest);
        expect(result).toBe(ua.substring(0, 128));
      }
    });
  });
});
