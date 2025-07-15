import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte encryption key from the client_id
 */
function deriveKey(clientId: string): Buffer {
  return createHash("sha256").update(clientId).digest();
}

/**
 * Encrypts a V0 API key using the client_id as the encryption key
 */
export function encryptApiKey(apiKey: string, clientId: string): string {
  const key = deriveKey(clientId);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Combine iv + encrypted + tag and encode as base64
  const combined = Buffer.concat([iv, Buffer.from(encrypted, "hex"), tag]);
  return combined.toString("base64");
}

/**
 * Decrypts a V0 API key using the client_id as the decryption key
 */
export function decryptApiKey(encryptedData: string, clientId: string): string {
  const key = deriveKey(clientId);
  const combined = Buffer.from(encryptedData, "base64");

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(-TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, -TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generates a secure access token (to replace the plain API key)
 */
export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}
