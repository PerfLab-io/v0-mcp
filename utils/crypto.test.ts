import { describe, it, expect } from "vitest";
import { encryptApiKey, decryptApiKey, generateAccessToken } from "./crypto";

describe("crypto utilities", () => {
  describe("encryptApiKey and decryptApiKey", () => {
    it("should encrypt and decrypt API keys correctly", () => {
      const apiKey = "test-api-key-12345";
      const clientId = "mcp-client-test-123";

      const encrypted = encryptApiKey(apiKey, clientId);
      const decrypted = decryptApiKey(encrypted, clientId);

      expect(decrypted).toBe(apiKey);
    });

    it("should produce different encrypted values for the same input", () => {
      const apiKey = "test-api-key-12345";
      const clientId = "mcp-client-test-123";

      const encrypted1 = encryptApiKey(apiKey, clientId);
      const encrypted2 = encryptApiKey(apiKey, clientId);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decryptApiKey(encrypted1, clientId)).toBe(apiKey);
      expect(decryptApiKey(encrypted2, clientId)).toBe(apiKey);
    });

    it("should fail to decrypt with wrong client_id", () => {
      const apiKey = "test-api-key-12345";
      const clientId = "mcp-client-test-123";
      const wrongClientId = "mcp-client-wrong-456";

      const encrypted = encryptApiKey(apiKey, clientId);

      expect(() => {
        decryptApiKey(encrypted, wrongClientId);
      }).toThrow();
    });

    it("should handle empty strings", () => {
      const apiKey = "";
      const clientId = "mcp-client-test-123";

      const encrypted = encryptApiKey(apiKey, clientId);
      const decrypted = decryptApiKey(encrypted, clientId);

      expect(decrypted).toBe(apiKey);
    });

    it("should handle special characters in API key", () => {
      const apiKey = "test-key-with-special-chars!@#$%^&*()_+-=[]{}|;:,.<>?";
      const clientId = "mcp-client-test-123";

      const encrypted = encryptApiKey(apiKey, clientId);
      const decrypted = decryptApiKey(encrypted, clientId);

      expect(decrypted).toBe(apiKey);
    });
  });

  describe("generateAccessToken", () => {
    it("should generate unique tokens", () => {
      const token1 = generateAccessToken();
      const token2 = generateAccessToken();

      expect(token1).not.toBe(token2);
      expect(typeof token1).toBe("string");
      expect(typeof token2).toBe("string");
      expect(token1.length).toBeGreaterThan(0);
      expect(token2.length).toBeGreaterThan(0);
    });

    it("should generate base64url encoded tokens", () => {
      const token = generateAccessToken();

      // Base64url should not contain + / = characters
      expect(token).not.toMatch(/[+/=]/);

      // Should only contain valid base64url characters
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should generate tokens of consistent length", () => {
      const tokens = Array.from({ length: 10 }, () => generateAccessToken());
      const lengths = tokens.map((t) => t.length);

      // All tokens should have the same length
      expect(new Set(lengths).size).toBe(1);
    });
  });
});
