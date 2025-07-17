// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    KV_URL: z.string().min(1),
    KV_REST_API_URL: z.string().min(1),
    KV_REST_API_TOKEN: z.string().min(1),
    KV_REST_API_READ_ONLY_TOKEN: z.string().min(1),
    REDIS_URL: z.string().min(1),
    // V0 API Key
    V0_API_KEY: z.string().min(1),
    // Supabase
    DATABASE_URL: z.string().min(1),
  },
  experimental__runtimeEnv: process.env,
});
