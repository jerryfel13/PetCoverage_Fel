import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 connects through a driver adapter. We pass the (pooled) Postgres
// connection string to the pg adapter.
//
// Reuse a single PrismaClient across hot reloads (dev) and warm serverless
// invocations to avoid exhausting Postgres connections. Use a *pooled*
// connection string for DATABASE_URL in production (PgBouncer / Neon pooler).
//
// Connection string requirements:
// - Pooled (runtime):  ...?pgbouncer=true&sslmode=require
// - Direct (migrations): ...?sslmode=require  (no pgbouncer param)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Ensure the pooled connection string has the pgbouncer flag when it
  // points at a pooler host. Pooler hosts contain "pooler" (e.g.
  // aws-0-*.pooler.supabase.com or *-pooler.*.neon.tech). If the user
  // pasted a direct URL into DATABASE_URL, we still connect (it works,
  // just without pooling) — but we warn in dev.
  const isPoolerHost = /pooler/i.test(connectionString);
  const needsPgbouncerFlag = isPoolerHost && !connectionString.includes("pgbouncer=true");

  const finalConnectionString = needsPgbouncerFlag
    ? `${connectionString}${connectionString.includes("?") ? "&" : "?"}pgbouncer=true`
    : connectionString;

  if (process.env.NODE_ENV === "development" && needsPgbouncerFlag) {
    console.warn(
      "[prisma] DATABASE_URL points at a pooler host but is missing ?pgbouncer=true — added it automatically.",
    );
  }

  const adapter = new PrismaPg({ connectionString: finalConnectionString });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
