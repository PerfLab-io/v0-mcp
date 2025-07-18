"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";
import AnimatedAscii from "@/components/animated-ascii";

function AuthSuccessContent() {
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [autoRedirected, setAutoRedirected] = useState(false);

  const redirectUri = searchParams.get("redirect_uri") || "";
  const code = searchParams.get("code") || "";
  const state = searchParams.get("state") || "";
  const iss = searchParams.get("iss") || "";

  // Build the complete callback URL
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", code);
  if (state) callbackUrl.searchParams.set("state", state);
  if (iss) callbackUrl.searchParams.set("iss", iss);

  useEffect(() => {
    // Try to automatically redirect to the custom protocol
    const timer = setTimeout(() => {
      try {
        console.log("Auto-redirecting to:", callbackUrl.toString());
        window.location.href = callbackUrl.toString();
        setAutoRedirected(true);
      } catch (error) {
        console.log("Auto redirect failed:", error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [callbackUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleManualRedirect = () => {
    window.location.href = callbackUrl.toString();
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex items-center justify-center p-4">
      {/* Floating particles - copied from other pages */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-400 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-cyan-400 animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-pink-400 animate-pulse"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-green-400 animate-bounce"></div>
        <div className="absolute bottom-60 right-1/3 w-2 h-2 bg-purple-400 animate-pulse"></div>
      </div>

      {/* Main card with retro dotted border */}
      <div className="relative w-full max-w-md">
        {/* Outer dotted border */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            border: "8px solid transparent",
            borderRadius: "8px",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' x='0' y='0' fill='${encodeURIComponent(
              "#16a34a",
            )}'/%3E%3Crect width='1' height='1' x='2' y='1' fill='${encodeURIComponent(
              "#16a34a",
            )}'/%3E%3Crect width='1' height='1' x='4' y='2' fill='${encodeURIComponent(
              "#16a34a",
            )}'/%3E%3Crect width='1' height='1' x='6' y='3' fill='${encodeURIComponent(
              "#16a34a",
            )}'/%3E%3Crect width='1' height='1' x='1' y='4' fill='${encodeURIComponent(
              "#16a34a",
            )}'/%3E%3Crect width='1' height='1' x='3' y='5' fill='${encodeURIComponent(
              "#16a34a",
            )}'/%3E%3Crect width='1' height='1' x='5' y='6' fill='${encodeURIComponent(
              "#16a34a",
            )}'/%3E%3Crect width='1' height='1' x='7' y='7' fill='${encodeURIComponent("#16a34a")}'/%3E%3C/svg%3E")`,
            backgroundClip: "border-box",
            WebkitMask:
              "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
          }}
        ></div>

        {/* Inner card content */}
        <div className="relative bg-gray-900 m-2 rounded-sm p-8">
          {/* Header with success icon */}
          <div className="space-y-1 mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="rounded-full bg-green-900 p-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
            </div>

            {/* Add ASCII art */}
            <div className="mb-6">
              <AnimatedAscii />
            </div>

            <h1 className="text-2xl font-bold text-center font-mono text-white">
              Authorization Successful!
            </h1>
            <p className="text-center text-gray-400 font-mono">
              Your V0 API key has been authorized successfully.
            </p>
          </div>

          <div className="space-y-4">
            <Alert className="bg-green-950 border-green-800">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription>
                <div className="space-y-2 text-green-200">
                  <p className="font-mono">
                    <strong className="text-green-100">Status:</strong>{" "}
                    Authorized
                  </p>
                  <p className="font-mono">
                    <strong className="text-green-100">Client:</strong>{" "}
                    {redirectUri.split("/")[2] || "Unknown"}
                  </p>
                  {autoRedirected && (
                    <p className="text-sm text-green-400 font-mono">
                      Redirecting to client...
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm font-medium text-white font-mono">
                Authorization Code:
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded text-sm break-all text-gray-300 font-mono">
                  {code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0 bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-mono"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-green-400 font-mono">
                  Copied to clipboard!
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleManualRedirect}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-mono"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Client
              </Button>
              <p className="text-xs text-gray-400 text-center font-mono">
                Click above to manually redirect to your client, or copy the
                authorization code.
              </p>
            </div>

            <div className="text-xs text-gray-400 text-center space-y-1 font-mono">
              <p>
                You can now close this window and return to your client
                application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center font-mono">Loading...</div>
        </div>
      }
    >
      <AuthSuccessContent />
    </Suspense>
  );
}
