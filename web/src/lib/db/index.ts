import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Postgres connection + Drizzle ORM client.
 *
 * Uses the `postgres` driver (by Porsager) — modern, ESM, lightweight.
 * Connection string comes from DATABASE_URL env var.
 *
 * PLAYBOOK §2: Managed Postgres (Supabase/RDS) requires TLS. The postgres.js
 * driver does NOT enable SSL by default. Enable it for non-local hosts.
 */
const connectionString = process.env.DATABASE_URL!;

const isLocalDb = /@(localhost|127\.0\.0\.1|db|postgres)[:/]/.test(connectionString);

const client = postgres(
  connectionString,
  isLocalDb ? {} : { ssl: { rejectUnauthorized: false } }
);

export const db = drizzle(client, { schema });
