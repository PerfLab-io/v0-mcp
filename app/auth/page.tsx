"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import AnimatedAscii from "@/components/animated-ascii";

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
    <div className="min-h-screen bg-black text-white overflow-hidden flex items-center justify-center p-4">
      {/* Floating particles - copied from landing page */}
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
              "#374151",
            )}'/%3E%3Crect width='1' height='1' x='2' y='1' fill='${encodeURIComponent(
              "#374151",
            )}'/%3E%3Crect width='1' height='1' x='4' y='2' fill='${encodeURIComponent(
              "#374151",
            )}'/%3E%3Crect width='1' height='1' x='6' y='3' fill='${encodeURIComponent(
              "#374151",
            )}'/%3E%3Crect width='1' height='1' x='1' y='4' fill='${encodeURIComponent(
              "#374151",
            )}'/%3E%3Crect width='1' height='1' x='3' y='5' fill='${encodeURIComponent(
              "#374151",
            )}'/%3E%3Crect width='1' height='1' x='5' y='6' fill='${encodeURIComponent(
              "#374151",
            )}'/%3E%3Crect width='1' height='1' x='7' y='7' fill='${encodeURIComponent("#374151")}'/%3E%3C/svg%3E")`,
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
          {/* Header with ASCII art */}
          <div className="space-y-1 mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="rounded-full bg-blue-900 p-3">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
            </div>

            {/* Add ASCII art */}
            <div className="mb-6">
              <AnimatedAscii />
            </div>

            <h1 className="text-2xl font-bold text-center font-mono text-white">
              V0 MCP Authorization
            </h1>
            <p className="text-center text-gray-400">
              Authorize access to your V0 account
            </p>
          </div>

          <div className="space-y-4">
            <Alert className="bg-gray-800 border-gray-700">
              <Key className="h-4 w-4 text-blue-400" />
              <AlertDescription>
                <div className="space-y-2 text-gray-300">
                  <p>
                    <strong className="text-white">Application:</strong>{" "}
                    {clientId}
                  </p>
                  <p>
                    <strong className="text-white">Requested Scopes:</strong>{" "}
                    {scope}
                  </p>
                  <p className="text-sm text-gray-400">
                    This application is requesting access to your V0 account.
                    Please provide your V0 API key to authorize access.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="rounded-lg bg-blue-950 border border-blue-800 p-4">
              <div className="flex items-center space-x-2">
                <ExternalLink className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-100 font-mono">
                  Get your API key from:
                </span>
              </div>
              <a
                href="https://v0.dev/chat/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                https://v0.dev/chat/settings/keys
              </a>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="bg-red-950 border-red-800"
              >
                <AlertDescription className="text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="v0_api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-mono">
                        V0 API Key
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="off"
                          placeholder="Enter your V0 API key"
                          className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400">
                        Your API key will be encrypted and stored securely.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-mono"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Authorizing..." : "Authorize Access"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-mono"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>

            <div className="text-xs text-gray-400 text-center space-y-1 font-mono">
              <p>
                By authorizing, you agree to allow this application to access
                your V0 account.
              </p>
              <p>
                You can revoke this access at any time from your V0 settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
          <div className="text-center font-mono">Loading...</div>
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
