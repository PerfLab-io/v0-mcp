import { NextRequest, NextResponse } from "next/server";
import { V0OAuthProvider } from "@/lib/oauth-provider";

const oauthProvider = new V0OAuthProvider();

export async function POST(request: NextRequest) {
  try {
    const registration = await request.json() as {
      client_name?: string;
      client_uri?: string;
      redirect_uris?: string[];
    };
    const { randomUUID } = await import("crypto");

    // Generate client credentials
    const clientId = `mcp-client-${randomUUID()}`;
    const clientSecret = randomUUID();

    // Validate redirect URIs
    const redirectUris = registration.redirect_uris || [];
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
      client_name: registration.client_name || "MCP Client",
      client_uri: registration.client_uri,
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}