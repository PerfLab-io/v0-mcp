import { NextRequest, NextResponse } from "next/server";
import { V0OAuthProvider } from "@/lib/oauth-provider";

const oauthProvider = new V0OAuthProvider();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
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
      { status: 400 },
    );
  }

  // Redirect to auth page with parameters
  const authUrl = new URL("/auth", request.url);
  authUrl.searchParams.set("client_id", client_id);
  authUrl.searchParams.set("redirect_uri", redirect_uri);
  authUrl.searchParams.set("code_challenge", code_challenge);
  authUrl.searchParams.set(
    "code_challenge_method",
    code_challenge_method || "S256",
  );
  authUrl.searchParams.set("scope", scope || "mcp:tools mcp:resources");
  if (state) authUrl.searchParams.set("state", state);
  if (resource) authUrl.searchParams.set("resource", resource);

  return NextResponse.redirect(authUrl);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const clientId = formData.get("client_id") as string;
  const redirectUri = formData.get("redirect_uri") as string;
  const codeChallenge = formData.get("code_challenge") as string;
  const codeChallengeMethod =
    (formData.get("code_challenge_method") as string) || "S256";
  const scope = (formData.get("scope") as string) || "mcp:tools mcp:resources";
  const state = (formData.get("state") as string) || "";
  const resource = formData.get("resource") as string;
  const v0ApiKey = formData.get("v0_api_key") as string;

  console.log("Authorize POST request:", { clientId, redirectUri, state });

  if (!v0ApiKey) {
    return NextResponse.json(
      { error: "V0 API key is required" },
      { status: 400 },
    );
  }

  const code = await oauthProvider.generateAuthorizationCode(
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
    v0ApiKey,
  );

  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state);

  // Add iss parameter as recommended by OAuth 2.1
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "localhost:3000";
  redirectUrl.searchParams.set("iss", `${protocol}://${host}`);

  console.log("Redirecting to:", redirectUrl.toString());

  // Check if this is a custom protocol (like cursor://)
  const isCustomProtocol =
    !redirectUri.startsWith("http://") && !redirectUri.startsWith("https://");

  if (isCustomProtocol) {
    // For custom protocols, redirect to a success page that handles the callback
    const successUrl = new URL("/auth/success", request.url);
    successUrl.searchParams.set("redirect_uri", redirectUri);
    successUrl.searchParams.set("code", code);
    if (state) successUrl.searchParams.set("state", state);
    successUrl.searchParams.set("iss", `${protocol}://${host}`);

    return NextResponse.redirect(successUrl.toString());
  }

  return NextResponse.redirect(redirectUrl.toString());
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
