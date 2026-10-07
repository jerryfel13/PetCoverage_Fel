import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Prisma 7 reads migration/introspection connection details from here (the
// schema no longer holds a `url`). The Prisma CLI does not auto-load .env,
// so load it manually (Node 20.12+ ships process.loadEnvFile).
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // .env is optional (e.g. on Vercel where vars are injected directly).
}

// IMPORTANT: Migrations (prisma db push / migrate) require a DIRECT,
// non-transaction-pooled Postgres connection. Transaction-mode poolers
// (port 6543, ?pgbouncer=true) cannot run DDL/introspection.
//
// Supabase convention:
//   DATABASE_URL  -> transaction-mode pooler (port 6543, runtime)
//   DIRECT_URL    -> session-mode pooler (port 5432, migrations)
//
// We also honor DIRECT_DATABASE_URL as an alternative name, and fall
// back to DATABASE_URL if neither is set.
const migrationUrl =
  process.env.DIRECT_URL ??
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: migrationUrl,
  },
});
