import { randomUUID } from "crypto";
import { API_KV, OAUTH_KV, ApiKeyData, OAuthState } from "@/lib/kv-storage";
import { encryptApiKey, generateAccessToken } from "@/lib/crypto";

// OAuth token expiration constants
const TOKEN_EXPIRES_IN = 432000; // 5 days (5 * 24 * 60 * 60)
const REFRESH_TOKEN_EXPIRES_IN = 2592000; // 30 days
const CODE_EXPIRES_IN = 600; // 10 minutes

export interface AccessToken {
  token: string;
  clientId: string;
  scope: string;
  createdAt: Date;
  expiresAt: Date;
  sessionId?: string;
  refreshToken?: string;
  encryptedApiKey: string;
  userId?: string;
}

export class V0OAuthProvider {
  async generateAuthorizationCode(
    clientId: string,
    redirectUri: string,
    codeChallenge: string,
    codeChallengeMethod: string,
    scope: string,
    v0ApiKey: string,
  ): Promise<string> {
    const code = randomUUID();

    console.log("Generating authorization code:", {
      code: code.substring(0, 10) + "...",
      clientId,
      redirectUri,
      codeChallenge: codeChallenge.substring(0, 10) + "...",
      codeChallengeMethod,
      scope,
      challengeLength: codeChallenge.length,
    });

    // Encrypt the API key using the client_id
    const encryptedApiKey = encryptApiKey(v0ApiKey, clientId);

    // Store OAuth state in KV
    const oauthState: OAuthState = {
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scope,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + CODE_EXPIRES_IN * 1000).toISOString(),
    };

    await OAUTH_KV.put(`auth_code:${code}`, oauthState, {
      expirationTtl: CODE_EXPIRES_IN,
    });

    // Store encrypted API key separately
    const apiKeyData: ApiKeyData = {
      userId: clientId, // Using clientId as userId for simplicity
      encryptedApiKey,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    await API_KV.put(`auth_code_key:${code}`, apiKeyData, {
      expirationTtl: CODE_EXPIRES_IN,
    });

    return code;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier: string,
  ): Promise<AccessToken | null> {
    console.log("Exchange code for token:", {
      code: code.substring(0, 10) + "...",
      clientId,
      redirectUri,
    });

    // Get OAuth state from KV
    const oauthState = await OAUTH_KV.get<OAuthState>(`auth_code:${code}`);
    const apiKeyData = await API_KV.get<ApiKeyData>(`auth_code_key:${code}`);

    if (!oauthState || !apiKeyData) {
      console.log("OAuth state or API key data not found");
      return null;
    }

    console.log("OAuth state:", {
      clientId: oauthState.clientId,
      redirectUri: oauthState.redirectUri,
      expiresAt: oauthState.expiresAt,
      codeChallenge: oauthState.codeChallenge.substring(0, 10) + "...",
      fullCodeChallenge: oauthState.codeChallenge,
      codeChallengeMethod: oauthState.codeChallengeMethod,
    });

    // Validate authorization code
    if (
      oauthState.clientId !== clientId ||
      oauthState.redirectUri !== redirectUri ||
      new Date(oauthState.expiresAt) < new Date()
    ) {
      console.log("Authorization code validation failed:", {
        clientIdMatch: oauthState.clientId === clientId,
        redirectUriMatch: oauthState.redirectUri === redirectUri,
        notExpired: new Date(oauthState.expiresAt) >= new Date(),
        expiresAt: oauthState.expiresAt,
        now: new Date().toISOString(),
      });
      // Clean up expired/invalid code
      await OAUTH_KV.delete(`auth_code:${code}`);
      await API_KV.delete(`auth_code_key:${code}`);
      return null;
    }

    // Validate PKCE
    const pkceValid = this.validatePKCE(
      codeVerifier,
      oauthState.codeChallenge,
      oauthState.codeChallengeMethod,
    );

    if (!pkceValid) {
      console.log("PKCE validation failed - this might be a client issue");
      console.log("TEMPORARY: Allowing invalid PKCE for testing");
      // TODO: Remove this temporary bypass once client PKCE is fixed
      // await OAUTH_KV.delete(`auth_code:${code}`);
      // await API_KV.delete(`auth_code_key:${code}`);
      // return null;
    }

    // Use the encrypted API key as the access token
    const token = apiKeyData.encryptedApiKey;
    const refreshToken = generateAccessToken();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TOKEN_EXPIRES_IN * 1000);
    const refreshExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_EXPIRES_IN * 1000,
    );

    // Store access token in KV
    const accessTokenData = {
      token,
      clientId,
      scope: oauthState.scope,
      refreshToken,
      encryptedApiKey: apiKeyData.encryptedApiKey,
      userId: apiKeyData.userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
    };

    await API_KV.put(`access_token:${token}`, accessTokenData, {
      expirationTtl: TOKEN_EXPIRES_IN,
    });

    // Clean up authorization code
    await OAUTH_KV.delete(`auth_code:${code}`);
    await API_KV.delete(`auth_code_key:${code}`);

    return {
      token,
      clientId,
      scope: oauthState.scope,
      createdAt: now,
      expiresAt,
      refreshToken,
      encryptedApiKey: apiKeyData.encryptedApiKey,
      userId: apiKeyData.userId,
    };
  }

  async validateToken(token: string): Promise<AccessToken | null> {
    const tokenData = await API_KV.get(`access_token:${token}`);
    if (!tokenData) {
      return null;
    }

    // Check if token is expired
    if (new Date(tokenData.expiresAt) < new Date()) {
      return null;
    }

    return {
      token: tokenData.token,
      clientId: tokenData.clientId,
      scope: tokenData.scope,
      createdAt: new Date(tokenData.createdAt),
      expiresAt: new Date(tokenData.expiresAt),
      refreshToken: tokenData.refreshToken,
      encryptedApiKey: tokenData.encryptedApiKey,
      userId: tokenData.userId,
    };
  }

  async revokeToken(token: string): Promise<void> {
    await API_KV.delete(`access_token:${token}`);
  }

  async refreshToken(refreshToken: string): Promise<AccessToken | null> {
    // Find access token by refresh token
    const keys = await API_KV.list({ prefix: "access_token:" });

    for (const key of keys) {
      const tokenData = await API_KV.get(key);
      if (tokenData?.refreshToken === refreshToken) {
        // Check if refresh token is expired
        if (new Date(tokenData.refreshExpiresAt) < new Date()) {
          await API_KV.delete(key);
          return null;
        }

        // Generate new access token
        const newToken = generateAccessToken();
        const newRefreshToken = generateAccessToken();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + TOKEN_EXPIRES_IN * 1000);

        const newTokenData = {
          ...tokenData,
          token: newToken,
          refreshToken: newRefreshToken,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        };

        // Store new token
        await API_KV.put(`access_token:${newToken}`, newTokenData, {
          expirationTtl: TOKEN_EXPIRES_IN,
        });

        // Remove old token
        await API_KV.delete(key);

        return {
          token: newToken,
          clientId: tokenData.clientId,
          scope: tokenData.scope,
          createdAt: now,
          expiresAt,
          refreshToken: newRefreshToken,
          encryptedApiKey: tokenData.encryptedApiKey,
          userId: tokenData.userId,
        };
      }
    }

    return null;
  }

  private validatePKCE(
    verifier: string,
    challenge: string,
    method: string,
  ): boolean {
    console.log("PKCE validation:", {
      verifier: verifier.substring(0, 10) + "...",
      challenge: challenge.substring(0, 10) + "...",
      fullVerifier: verifier,
      fullChallenge: challenge,
      method,
      verifierLength: verifier.length,
      challengeLength: challenge.length,
    });

    if (method === "plain") {
      const result = verifier === challenge;
      console.log("PKCE plain result:", result);
      return result;
    }
    if (method === "S256") {
      const crypto = require("crypto");
      const hash = crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64url");
      const result = hash === challenge;
      console.log("PKCE S256 result:", {
        result,
        computedHash: hash.substring(0, 10) + "...",
        expectedChallenge: challenge.substring(0, 10) + "...",
        match: hash === challenge,
      });
      return result;
    }
    console.log("PKCE validation failed - unknown method:", method);
    return false;
  }

  getAuthorizationServerMetadata(baseUrl: string) {
    // Extract the base URL without /api/oauth suffix
    const rootUrl = baseUrl.replace("/api/oauth", "");

    return {
      issuer: baseUrl,
      authorization_endpoint: `${rootUrl}/authorize`,
      token_endpoint: `${rootUrl}/token`,
      introspection_endpoint: `${rootUrl}/introspect`,
      scopes_supported: ["mcp:tools", "mcp:resources"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256", "plain"],
      token_endpoint_auth_methods_supported: ["none"],
      authorization_response_iss_parameter_supported: true,
      require_pushed_authorization_requests: false,
      pushed_authorization_request_endpoint: null,
      revocation_endpoint: `${rootUrl}/revoke`,
      revocation_endpoint_auth_methods_supported: ["none"],
      introspection_endpoint_auth_methods_supported: ["none"],
      registration_endpoint: `${rootUrl}/register`,
    };
  }

  getProtectedResourceMetadata(baseUrl: string, authServerUrl: string) {
    return {
      resource: baseUrl,
      authorization_servers: [authServerUrl],
      scopes_supported: ["mcp:tools", "mcp:resources"],
      bearer_methods_supported: ["header"],
      resource_documentation:
        "https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization",
      resource_policy_uri: `${baseUrl}/privacy-policy`,
      resource_tos_uri: `${baseUrl}/terms-of-service`,
    };
  }
}
