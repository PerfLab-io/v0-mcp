"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ExternalLink, Shield, Key } from "lucide-react";

const formSchema = z.object({
  v0_api_key: z.string().min(1, "V0 API key is required"),
});

function AuthContent() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = searchParams.get("client_id") || "";
  const redirectUri = searchParams.get("redirect_uri") || "";
  const codeChallenge = searchParams.get("code_challenge") || "";
  const codeChallengeMethod =
    searchParams.get("code_challenge_method") || "S256";
  const scope = searchParams.get("scope") || "mcp:tools mcp:resources";
  const state = searchParams.get("state") || "";
  const resource = searchParams.get("resource") || "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      v0_api_key: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("redirect_uri", redirectUri);
      formData.append("code_challenge", codeChallenge);
      formData.append("code_challenge_method", codeChallengeMethod);
      formData.append("scope", scope);
      formData.append("state", state);
      formData.append("resource", resource);
      formData.append("v0_api_key", values.v0_api_key);

      // Check if this is a custom protocol redirect
      const isCustomProtocol =
        !redirectUri.startsWith("http://") &&
        !redirectUri.startsWith("https://");

      if (isCustomProtocol) {
        // For custom protocols, use fetch to handle the redirect to success page
        const response = await fetch("/authorize", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          // Server should redirect to /auth/success for custom protocols
          if (response.redirected) {
            window.location.href = response.url;
          } else {
            window.location.href = response.url;
          }
        } else {
          const errorData = (await response.json()) as { error?: string };
          setError(errorData.error || "Authorization failed");
          setIsSubmitting(false);
        }
      } else {
        // For HTTP redirects, use native form submission to let browser handle redirect
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "/authorize";
        form.style.display = "none";

        // Add all form data as hidden inputs
        for (const [key, value] of formData.entries()) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
      }
    } catch (err) {
      setError("An error occurred during authorization");
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    const cancelUrl = new URL(redirectUri);
    cancelUrl.searchParams.set("error", "access_denied");
    if (state) cancelUrl.searchParams.set("state", state);
    window.location.href = cancelUrl.toString();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            V0 MCP Authorization
          </CardTitle>
          <CardDescription className="text-center">
            Authorize access to your V0 account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>
                  <strong>Application:</strong> {clientId}
                </p>
                <p>
                  <strong>Requested Scopes:</strong> {scope}
                </p>
                <p className="text-sm text-muted-foreground">
                  This application is requesting access to your V0 account.
                  Please provide your V0 API key to authorize access.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Get your API key from:
              </span>
            </div>
            <a
              href="https://v0.dev/chat/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              https://v0.dev/chat/settings/keys
            </a>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="v0_api_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>V0 API Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="off"
                        placeholder="Enter your V0 API key"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your API key will be encrypted and stored securely.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Authorizing..." : "Authorize Access"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>
              By authorizing, you agree to allow this application to access your
              V0 account.
            </p>
            <p>You can revoke this access at any time from your V0 settings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
          <div className="text-center">Loading...</div>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
