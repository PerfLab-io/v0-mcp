import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "v0 MCP Server",
  description:
    "Model Context Protocol (MCP) server that exposes v0.dev APIs through the Streamable HTTP pattern. Built with Hono framework and deployed on Vercel.",
  generator: "v0.dev",
  keywords: [
    "v0",
    "MCP",
    "Model Context Protocol",
    "AI",
    "development tools",
    "serverless",
    "Vercel",
    "Hono",
  ],
  authors: [{ name: "v0.dev" }],
  creator: "v0.dev",
  publisher: "v0.dev",
  metadataBase: new URL("https://v0-mcp.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "v0 MCP Server",
    description:
      "Model Context Protocol (MCP) server that exposes v0.dev APIs through the Streamable HTTP pattern. Built with Hono framework and deployed on Vercel.",
    url: "https://v0-mcp.vercel.app",
    siteName: "v0 MCP Server",
    images: [
      {
        url: "/v0-mcp.jpg",
        width: 1200,
        height: 630,
        alt: "v0 MCP Server - Model Context Protocol server for v0.dev APIs",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "v0 MCP Server",
    description:
      "Model Context Protocol (MCP) server that exposes v0.dev APIs through the Streamable HTTP pattern.",
    images: ["/v0-mcp.jpg"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
