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

  async rewrites() {
    return {
      beforeFiles: [
        // Test rewrite - simple case
        {
          source: "/test",
          destination: "/api/ping",
        },
        // OAuth routes
        {
          source: "/oauth/:path*",
          destination: "/api/oauth/:path*",
        },
        // OAuth register route (special case)
        {
          source: "/register",
          destination: "/api/oauth/register",
        },
        // Well-known OAuth endpoints
        {
          source: "/.well-known/oauth-authorization-server",
          destination: "/api/.well-known/oauth-authorization-server",
        },
        {
          source: "/.well-known/oauth-authorization-server/:path*",
          destination: "/api/.well-known/oauth-authorization-server/:path*",
        },
        {
          source: "/.well-known/oauth-protected-resource",
          destination: "/api/.well-known/oauth-protected-resource",
        },
      ],
    };
  },
};

export default nextConfig;
