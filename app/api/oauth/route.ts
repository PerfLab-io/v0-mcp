import { NextRequest, NextResponse } from "next/server";
import { V0OAuthProvider } from "@/lib/oauth-provider";

const oauthProvider = new V0OAuthProvider();

export async function GET(request: NextRequest) {
  const { searchParams, pathname } = new URL(request.url);
  
  console.log("OAuth GET request pathname:", pathname);
  
  // Handle authorization endpoint
  if (pathname.endsWith("/authorize")) {
    return handleAuthorize(request, searchParams);
  }
  
  return NextResponse.json({ error: "Not found", pathname }, { status: 404 });
}

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);
  
  console.log("OAuth POST request pathname:", pathname);
  
  if (pathname.endsWith("/authorize")) {
    return handleAuthorizePost(request);
  }
  
  if (pathname.endsWith("/token")) {
    return handleToken(request);
  }
  
  if (pathname.endsWith("/introspect")) {
    return handleIntrospect(request);
  }
  
  if (pathname.endsWith("/register")) {
    return handleRegister(request);
  }
  
  if (pathname.endsWith("/revoke")) {
    return handleRevoke(request);
  }
  
  return NextResponse.json({ error: "Not found", pathname }, { status: 404 });
}

export async function OPTIONS(request: NextRequest) {
  const { pathname } = new URL(request.url);
  console.log("OAuth OPTIONS request pathname:", pathname);
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

async function handleAuthorize(request: NextRequest, searchParams: URLSearchParams) {
  const {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    scope,
    state,
    resource,
  } = Object.fromEntries(searchParams.entries());

  console.log("OAuth authorize request:", {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    scope,
    state,
    resource,
  });

  if (!client_id || !redirect_uri || !code_challenge) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  // Redirect to auth page with parameters
  const authUrl = new URL("/auth", request.url);
  authUrl.searchParams.set("client_id", client_id);
  authUrl.searchParams.set("redirect_uri", redirect_uri);
  authUrl.searchParams.set("code_challenge", code_challenge);
  authUrl.searchParams.set("code_challenge_method", code_challenge_method || "S256");
  authUrl.searchParams.set("scope", scope || "mcp:tools mcp:resources");
  if (state) authUrl.searchParams.set("state", state);
  if (resource) authUrl.searchParams.set("resource", resource);

  return NextResponse.redirect(authUrl);
}

async function handleAuthorizePost(request: NextRequest) {
  const formData = await request.formData();
  const clientId = formData.get("client_id") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const codeChallenge = formData.get("code_challenge") as string;
  const codeChallengeMethod = (formData.get("code_challenge_method") as string) || "S256";
  const scope = (formData.get("scope") as string) || "mcp:tools mcp:resources";
  const state = (formData.get("state") as string) || "";
  const resource = formData.get("resource") as string;
  const v0ApiKey = formData.get("v0_api_key") as string;

  if (!v0ApiKey) {
    return NextResponse.json(
      { error: "V0 API key is required" },
      { status: 400 }
    );
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
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "localhost:3000";
  redirectUrl.searchParams.set("iss", `${protocol}://${host}/api/oauth`);

  return NextResponse.redirect(redirectUrl.toString());
}

async function handleToken(request: NextRequest) {
  const formData = await request.formData();
  const grantType = formData.get("grant_type") as string;
  
  if (grantType === "authorization_code") {
    const code = formData.get("code") as string;
    const clientId = formData.get("client_id") as string;
    const redirectUri = formData.get("redirect_uri") as string;
    const codeVerifier = formData.get("code_verifier") as string;

    const accessToken = await oauthProvider.exchangeCodeForToken(
      code,
      clientId,
      redirectUri,
      codeVerifier
    );

    if (!accessToken) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    return NextResponse.json({
      access_token: accessToken.token,
      token_type: "Bearer",
      expires_in: Math.floor((accessToken.expiresAt.getTime() - Date.now()) / 1000),
      refresh_token: accessToken.refreshToken,
      scope: accessToken.scope,
    });
  }
  
  if (grantType === "refresh_token") {
    const refreshToken = formData.get("refresh_token") as string;
    
    const accessToken = await oauthProvider.refreshToken(refreshToken);
    
    if (!accessToken) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    return NextResponse.json({
      access_token: accessToken.token,
      token_type: "Bearer",
      expires_in: Math.floor((accessToken.expiresAt.getTime() - Date.now()) / 1000),
      refresh_token: accessToken.refreshToken,
      scope: accessToken.scope,
    });
  }

  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}

async function handleIntrospect(request: NextRequest) {
  const formData = await request.formData();
  const token = formData.get("token") as string;

  if (!token) {
    return NextResponse.json({ active: false });
  }

  const accessToken = await oauthProvider.validateToken(token);
  if (!accessToken) {
    return NextResponse.json({ active: false });
  }

  return NextResponse.json({
    active: true,
    client_id: accessToken.clientId,
    scope: accessToken.scope,
    exp: Math.floor(accessToken.expiresAt.getTime() / 1000),
    iat: Math.floor(accessToken.createdAt.getTime() / 1000),
  });
}

async function handleRegister(request: NextRequest) {
  try {
    const registration = await request.json();
    const { randomUUID } = await import("crypto");

    // Generate client credentials
    const clientId = `mcp-client-${randomUUID()}`;
    const clientSecret = randomUUID();

    // Validate redirect URIs
    const registrationData = registration as { redirect_uris?: string[]; client_name?: string; client_uri?: string };
    const redirectUris = registrationData.redirect_uris || [];
    if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
      return NextResponse.json(
        {
          error: "invalid_redirect_uri",
          error_description: "At least one redirect_uri is required",
        },
        { status: 400 }
      );
    }

    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}/api/oauth`;

    const response = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_secret_expires_at: 0,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: registrationData.client_name || "MCP Client",
      client_uri: registrationData.client_uri,
      token_endpoint_auth_method: "none",
      scope: "mcp:tools mcp:resources",
      registration_client_uri: `${baseUrl}/clients/${clientId}`,
      registration_access_token: randomUUID(),
    };

    console.log(`Registered new client: ${clientId}`);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Client registration error:", error);
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Invalid client registration request",
      },
      { status: 400 }
    );
  }
}

async function handleRevoke(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "Token is required" },
        { status: 400 }
      );
    }

    await oauthProvider.revokeToken(token);
    console.log(`Access token revoked: ${token.substring(0, 10)}...`);

    return new NextResponse("", { status: 200 });
  } catch (error) {
    console.error("Token revocation error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

