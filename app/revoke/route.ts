import { NextRequest, NextResponse } from "next/server";
import { V0OAuthProvider } from "@/lib/oauth-provider";

const oauthProvider = new V0OAuthProvider();

export async function POST(request: NextRequest) {
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