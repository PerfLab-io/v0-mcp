import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/**
 * Hash an API key using bcrypt
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Verify an API key against a bcrypt hash
 */
export async function verifyApiKey(
  apiKey: string,
  hash: string
): Promise<boolean> {
  try {
    return bcrypt.compare(apiKey, hash);
  } catch {
    return false;
  }
}

/**
 * Create a bcrypt hash of an API key (convenience function)
 */
export async function createApiKeyHash(apiKey: string): Promise<string> {
  return hashApiKey(apiKey);
}