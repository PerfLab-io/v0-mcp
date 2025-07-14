import { defineConfig } from "vite";
import devServer from "@hono/vite-dev-server";
import build from "@hono/vite-build/vercel";

export default defineConfig({
  define: {
    "process.env.DATABASE_URL": JSON.stringify(process.env.DATABASE_URL),
  },
  plugins: [
    devServer({
      entry: "src/index.ts",
    }),
    build({
      entry: "./src/index.ts",
      minify: false,
    }),
  ],
});
