import { randomUUID } from "crypto";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/index";
import { authorizationCodes, accessTokens, sessions } from "@/drizzle/schema";
import { sessionApiKeyStore } from "@/v0/client";
import {
  encryptApiKey,
  decryptApiKey,
  generateAccessToken,
} from "@/lib/crypto";

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
}

class V0OAuthProvider {
  async generateAuthorizationCode(
    clientId: string,
    redirectUri: string,
    codeChallenge: string,
    codeChallengeMethod: string,
    scope: string,
    v0ApiKey: string
  ): Promise<string> {
    const code = randomUUID();

    // Encrypt the API key using the client_id
    const encryptedApiKey = encryptApiKey(v0ApiKey, clientId);

    const authCode = {
      code,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scope,
      encryptedApiKey, // Store encrypted API key
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + CODE_EXPIRES_IN * 1000),
    };

    await db.insert(authorizationCodes).values(authCode);
    return code;
  }

  async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<AccessToken | null> {
    // Get authorization code from database
    const result = await db
      .select()
      .from(authorizationCodes)
      .where(eq(authorizationCodes.code, code))
      .limit(1);

    if (result.length === 0) return null;

    const authCode = result[0];

    // Validate authorization code
    if (
      authCode.clientId !== clientId ||
      authCode.redirectUri !== redirectUri ||
      authCode.expiresAt < new Date()
    ) {
      // Delete expired/invalid code
      await db
        .delete(authorizationCodes)
        .where(eq(authorizationCodes.code, code));
      return null;
    }

    // Validate PKCE
    if (
      !this.validatePKCE(
        codeVerifier,
        authCode.codeChallenge,
        authCode.codeChallengeMethod
      )
    ) {
      await db
        .delete(authorizationCodes)
        .where(eq(authorizationCodes.code, code));
      return null;
    }

    // Decrypt the API key from the authorization code
    const decryptedApiKey = decryptApiKey(authCode.encryptedApiKey, clientId);

    // Use the encrypted API key as the access token
    const token = authCode.encryptedApiKey; // The access token IS the encrypted API key
    const refreshToken = generateAccessToken(); // Generate a separate refresh token

    const accessToken = {
      token, // Store the encrypted API key as the token
      clientId,
      scope: authCode.scope,
      refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + TOKEN_EXPIRES_IN * 1000),
      refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000),
    };

    await db.insert(accessTokens).values(accessToken);

    // Store decrypted API key in sessionApiKeyStore for backward compatibility
    sessionApiKeyStore.setSessionApiKey(token, decryptedApiKey);

    await db
      .delete(authorizationCodes)
      .where(eq(authorizationCodes.code, code));

    return {
      token,
      clientId,
      scope: authCode.scope,
      createdAt: accessToken.createdAt,
      expiresAt: accessToken.expiresAt,
      refreshToken: refreshToken,
    };
  }

  async validateToken(token: string): Promise<AccessToken | null> {
    // Look up the token in the database
    const result = await db
      .select()
      .from(accessTokens)
      .where(eq(accessTokens.token, token))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const dbToken = result[0];

    // Check if token is expired
    if (dbToken.expiresAt < new Date()) {
      return null;
    }

    return {
      token: dbToken.token,
      clientId: dbToken.clientId,
      scope: dbToken.scope,
      createdAt: dbToken.createdAt,
      expiresAt: dbToken.expiresAt,
      refreshToken: dbToken.refreshToken || undefined,
    };
  }

  private validatePKCE(
    verifier: string,
    challenge: string,
    method: string
  ): boolean {
    if (method === "plain") {
      return verifier === challenge;
    }
    if (method === "S256") {
      const crypto = require("crypto");
      const hash = crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64url");
      return hash === challenge;
    }
    return false;
  }

  getAuthorizationServerMetadata(baseUrl: string) {
    return {
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      introspection_endpoint: `${baseUrl}/introspect`,
      scopes_supported: ["mcp:tools", "mcp:resources"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256", "plain"],
      token_endpoint_auth_methods_supported: ["none"], // Public client
      authorization_response_iss_parameter_supported: true,
      require_pushed_authorization_requests: false,
      pushed_authorization_request_endpoint: null,
      revocation_endpoint: `${baseUrl}/revoke`,
      revocation_endpoint_auth_methods_supported: ["none"],
      introspection_endpoint_auth_methods_supported: ["none"],
      registration_endpoint: `${baseUrl}/register`,
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

export const oauthProvider = new V0OAuthProvider();

export const oauthRouter = new Hono();

oauthRouter.get("/authorize", (c) => {
  const query = c.req.query();
  console.log("OAuth authorize request query parameters:", query);
  console.log("Raw URL:", c.req.url);

  const {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    scope,
    state,
    resource, // Required by MCP spec
  } = query;

  console.log("Extracted parameters:", {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    scope,
    state,
    resource,
  });

  if (!client_id || !redirect_uri || !code_challenge) {
    console.log(
      "Missing parameters - client_id:",
      !!client_id,
      "redirect_uri:",
      !!redirect_uri,
      "code_challenge:",
      !!code_challenge,
      "resource:",
      !!resource
    );
    return c.text(
      "Missing required parameters (client_id, redirect_uri, code_challenge)",
      400
    );
  }

  // Set default resource if not provided (MCP spec recommends it but some clients might not send it)
  const resourceParam = resource || "http://localhost:3000/mcp";

  // Return HTML form for API key input
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>V0 MCP Authorization</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .form-group { margin: 15px 0; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            input[type="text"], input[type="password"] { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #005a8a; }
            .info { background: #f0f8ff; padding: 15px; border-left: 4px solid #007cba; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>V0 MCP Server Authorization</h1>
        <div class="info">
            <p><strong>Application:</strong> ${client_id}</p>
            <p><strong>Requested Scopes:</strong> ${
              scope || "mcp:tools mcp:resources"
            }</p>
            <p>This application is requesting access to your V0 account. Please provide your V0 API key to authorize access.</p>
            <p>You can obtain your API key from: <a href="https://v0.dev/chat/settings/keys" target="_blank">https://v0.dev/chat/settings/keys</a></p>
        </div>
        
        <form method="POST" action="/oauth/authorize">
            <input type="hidden" name="client_id" value="${client_id}">
            <input type="hidden" name="redirect_uri" value="${redirect_uri}">
            <input type="hidden" name="code_challenge" value="${code_challenge}">
            <input type="hidden" name="code_challenge_method" value="${
              code_challenge_method || "S256"
            }">
            <input type="hidden" name="scope" value="${
              scope || "mcp:tools mcp:resources"
            }">
            <input type="hidden" name="state" value="${state || ""}">
            <input type="hidden" name="resource" value="${resourceParam}">
            
            <div class="form-group">
                <label for="v0_api_key">V0 API Key:</label>
                <input type="password" id="v0_api_key" name="v0_api_key" required placeholder="Enter your V0 API key">
            </div>
            
            <button type="submit">Authorize Access</button>
            <a href="${redirect_uri}?error=access_denied&state=${
    state || ""
  }" style="margin-left: 15px;">Cancel</a>
        </form>
    </body>
    </html>
  `;

  return c.html(html);
});

oauthRouter.post("/authorize", async (c) => {
  const formData = await c.req.formData();
  const clientId = formData.get("client_id") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const codeChallenge = formData.get("code_challenge") as string;
  const codeChallengeMethod =
    (formData.get("code_challenge_method") as string) || "S256";
  const scope = (formData.get("scope") as string) || "mcp:tools mcp:resources";
  const state = (formData.get("state") as string) || "";
  const resource = formData.get("resource") as string; // Required by MCP spec
  const v0ApiKey = formData.get("v0_api_key") as string;

  if (!v0ApiKey) {
    return c.text("V0 API key is required", 400);
  }

  if (!resource) {
    return c.text("Resource parameter is required per MCP specification", 400);
  }

  // TODO: Validate the V0 API key by making a test request to V0
  // For now, we'll accept any non-empty key

  const code = await oauthProvider.generateAuthorizationCode(
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
    v0ApiKey
  );

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);
  // Add iss parameter as recommended by OAuth 2.1
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || "localhost:3000";
  redirectUrl.searchParams.set("iss", `${protocol}://${host}/oauth`);

  return c.redirect(redirectUrl.toString());
});

oauthRouter.post("/token", async (c) => {
  const formData = await c.req.formData();
  const grantType = formData.get("grant_type") as string;
  const code = formData.get("code") as string;
  const clientId = formData.get("client_id") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const codeVerifier = formData.get("code_verifier") as string;

  if (grantType !== "authorization_code") {
    return c.json({ error: "unsupported_grant_type" }, 400);
  }

  const accessToken = await oauthProvider.exchangeCodeForToken(
    code,
    clientId,
    redirectUri,
    codeVerifier
  );

  if (!accessToken) {
    return c.json({ error: "invalid_grant" }, 400);
  }

  return c.json({
    access_token: accessToken.token,
    token_type: "Bearer",
    expires_in: TOKEN_EXPIRES_IN,
    refresh_token: accessToken.refreshToken,
    scope: accessToken.scope,
  });
});

oauthRouter.post("/introspect", async (c) => {
  const formData = await c.req.formData();
  const token = formData.get("token") as string;

  if (!token) {
    return c.json({ active: false });
  }

  const accessToken = await oauthProvider.validateToken(token);
  if (!accessToken) {
    return c.json({ active: false });
  }

  return c.json({
    active: true,
    client_id: accessToken.clientId,
    scope: accessToken.scope,
    exp: Math.floor(accessToken.expiresAt.getTime() / 1000),
    iat: Math.floor(accessToken.createdAt.getTime() / 1000),
  });
});

oauthRouter.post("/register", async (c) => {
  try {
    const registration = await c.req.json();

    // Generate client credentials
    const clientId = `mcp-client-${randomUUID()}`;
    const clientSecret = randomUUID(); // Optional for public clients

    // Validate redirect URIs
    const redirectUris = registration.redirect_uris || [];
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      return c.json(
        {
          error: "invalid_redirect_uri",
          error_description: "At least one redirect_uri is required",
        },
        400
      );
    }

    // Create client registration response
    const protocol = c.req.header("x-forwarded-proto") || "http";
    const host = c.req.header("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}/oauth`;

    const response = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0, // Never expires
      redirect_uris: redirectUris,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      client_name: registration.client_name || "MCP Client",
      client_uri: registration.client_uri,
      token_endpoint_auth_method: "none", // Public client
      scope: "mcp:tools mcp:resources",
      registration_client_uri: `${baseUrl}/clients/${clientId}`,
      registration_access_token: randomUUID(),
    };

    console.log(`Registered new client: ${clientId}`);
    return c.json(response, 201);
  } catch (error) {
    console.error("Client registration error:", error);
    return c.json(
      {
        error: "invalid_request",
        error_description: "Invalid client registration request",
      },
      400
    );
  }
});

oauthRouter.post("/revoke", async (c) => {
  try {
    const formData = await c.req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return c.json(
        { error: "invalid_request", error_description: "Token is required" },
        400
      );
    }

    // Remove the access token from the database
    await db.delete(accessTokens).where(eq(accessTokens.token, token));

    console.log(
      `Access token revoked and removed: ${token.substring(0, 10)}...`
    );

    // RFC 7009 specifies that revocation endpoint should return 200 even for invalid tokens
    return c.text("", 200);
  } catch (error) {
    console.error("Token revocation error:", error);
    return c.json({ error: "server_error" }, 500);
  }
});

// Note: Authorization server metadata endpoint is now mounted at root level in main app
