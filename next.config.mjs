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
        source: "/.well-known/oauth-protected-resource/api/mcp",
        destination: "/api/mcp/.well-known/oauth-protected-resource",
      },
    ];
  },
};

export default nextConfig;
