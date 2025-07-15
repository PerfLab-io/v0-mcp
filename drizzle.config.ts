import { defineConfig } from "drizzle-kit";
import { env } from "./utils/env";

export default defineConfig({
  out: "./drizzle",
  schema: "./drizzle/schema.ts", // TODO: create schema
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
