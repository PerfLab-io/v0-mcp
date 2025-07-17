"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-3">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Authorization Successful!
          </CardTitle>
          <CardDescription className="text-center">
            Your V0 API key has been authorized successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Status:</strong> Authorized
                </p>
                <p>
                  <strong>Client:</strong>{" "}
                  {redirectUri.split("/")[2] || "Unknown"}
                </p>
                {autoRedirected && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Redirecting to client...
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Authorization Code:</p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm break-all">
                {code}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Copied to clipboard!
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleManualRedirect}
              className="w-full"
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Client
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Click above to manually redirect to your client, or copy the
              authorization code.
            </p>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <p>
              You can now close this window and return to your client
              application.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <div className="text-center">Loading...</div>
        </div>
      }
    >
      <AuthSuccessContent />
    </Suspense>
  );
}
