import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";
import build from "@hono/vite-build/vercel";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      "process.env.DATABASE_URL": JSON.stringify(env.DATABASE_URL),
      "process.env.VERCEL_URL": JSON.stringify(env.VERCEL_URL),
    },
    plugins: [
      devServer({
        entry: "src/index.ts",
      }),
      build({
        entry: "./src/index.ts",
        minify: false,
        vercel: {
          config: {
            routes: [
              {
                src: "/oauth/(.*)",
                dest: "/",
              },
              {
                src: "/mcp",
                dest: "/",
              },
              {
                src: "/.well-known/(.*)",
                dest: "/",
              },
              {
                src: "/ping",
                dest: "/",
              },
              {
                src: "/health",
                dest: "/",
              },
              {
                src: "/test",
                dest: "/",
              },
              {
                src: "/(.*)",
                dest: "/",
              },
            ],
          },
        },
      }),
    ],
  };
});
