import { NextRequest, NextResponse } from "next/server";
import { V0OAuthProvider } from "@/lib/oauth-provider";

const oauthProvider = new V0OAuthProvider();

export async function POST(request: NextRequest) {
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
