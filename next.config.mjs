/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    authInterrupts: true,
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server/api/mcp",
        destination: "/api/mcp/.well-known/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/mcp/.well-known/oauth-authorization-server",
      },
      {
        source: "/.well-known/oauth-protected-resource/api/mcp",
        destination: "/api/mcp/.well-known/oauth-protected-resource",
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/mcp/.well-known/oauth-protected-resource",
      },
      {
        source: "/mcp",
        destination: "/api/mcp",
      },
    ];
  },
};

export default nextConfig;
