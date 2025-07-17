import { NextRequest, NextResponse } from "next/server";
import { V0OAuthProvider } from "@/lib/oauth-provider";

const oauthProvider = new V0OAuthProvider();

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const grantType = formData.get("grant_type") as string;

  console.log("Token request:", {
    grantType,
    code: formData.get("code")?.toString().substring(0, 10) + "...",
    clientId: formData.get("client_id"),
    redirectUri: formData.get("redirect_uri"),
    codeVerifier:
      formData.get("code_verifier")?.toString().substring(0, 10) + "...",
  });

  if (grantType === "authorization_code") {
    const code = formData.get("code") as string;
    const clientId = formData.get("client_id") as string;
    const redirectUri = formData.get("redirect_uri") as string;
    const codeVerifier = formData.get("code_verifier") as string;

    const accessToken = await oauthProvider.exchangeCodeForToken(
      code,
      clientId,
      redirectUri,
      codeVerifier,
    );

    if (!accessToken) {
      console.log("Token exchange failed - invalid_grant");
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    return NextResponse.json({
      access_token: accessToken.token,
      token_type: "Bearer",
      expires_in: Math.floor(
        (accessToken.expiresAt.getTime() - Date.now()) / 1000,
      ),
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
      expires_in: Math.floor(
        (accessToken.expiresAt.getTime() - Date.now()) / 1000,
      ),
      refresh_token: accessToken.refreshToken,
      scope: accessToken.scope,
    });
  }

  return NextResponse.json(
    { error: "unsupported_grant_type" },
    { status: 400 },
  );
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
