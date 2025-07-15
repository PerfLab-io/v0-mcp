import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(process.env.DATABASE_URL!, { 
  prepare: false,
  connect_timeout: 10, // 10 seconds
  idle_timeout: 20, // 20 seconds
  max_lifetime: 60 * 30, // 30 minutes
  max: 10, // maximum number of connections
});
export const db = drizzle({ client, schema });
