# Database Connection Troubleshooting

## The Problem

```
Pooler TCP is open, but Prisma still can't connect — trying session mode
and a direct Node connection to get a clearer error.
```

This happens because **Prisma migrations need a DIRECT connection**, but the
connection string points at a **pooler** (PgBouncer / Neon pooler).

## The Fix

You need **two** connection strings:

| Variable | Used for | Format |
|----------|----------|--------|
| `DATABASE_URL` | Runtime (the app) | Pooled connection with `?pgbouncer=true` |
| `DIRECT_DATABASE_URL` | Migrations (`prisma db push`) | Direct connection, no pooler |

### Neon

From the Neon dashboard → **Connect**:

1. **Pooled connection** (for `DATABASE_URL`):
   ```
   postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?pgbouncer=true&sslmode=require
   ```

2. **Direct connection** (for `DIRECT_DATABASE_URL`):
   ```
   postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

### Vercel Postgres

From Vercel dashboard → Storage → your database → **Connection String**:

1. **Pooled** (for `DATABASE_URL`): the string with `?pgbouncer=true`
2. **Direct** (for `DIRECT_DATABASE_URL`): the string without `?pgbouncer=true`

## Setup Steps

### 1. Local `.env`

```bash
DATABASE_URL="postgresql://user:pass@host-pooler.region.aws.neon.tech/db?pgbouncer=true&sslmode=require"
DIRECT_DATABASE_URL="postgresql://user:pass@host.region.aws.neon.tech/db?sslmode=require"
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your_token"
```

### 2. Run migrations with the DIRECT connection

```bash
npx prisma db push
```

The `prisma.config.ts` automatically uses `DIRECT_DATABASE_URL` for migrations.

### 3. Vercel environment variables

In Vercel dashboard → your project → Settings → Environment Variables:

- `DATABASE_URL` = pooled connection string
- `DIRECT_DATABASE_URL` = direct connection string
- `NEXT_PUBLIC_MAPBOX_TOKEN` = your Mapbox token

### 4. Run migrations on Vercel (one-time)

```bash
# Pull env vars from Vercel
npx vercel env pull .env.local

# Run migration with direct connection
npx prisma db push

# Deploy
npx vercel --prod
```

## Why This Happens

- **PgBouncer** (the pooler) speaks a limited protocol — it can't handle
  the `COPY`, `ALTER`, or introspection commands Prisma uses for `db push`.
- **Prisma runtime** (the app) only does normal queries, which work fine
  through the pooler.
- So: **migrations = direct**, **runtime = pooled**.

## Quick Check

```bash
# Test direct connection
psql "postgresql://user:pass@host.region.aws.neon.tech/db?sslmode=require" -c "SELECT 1;"

# Test pooled connection
psql "postgresql://user:pass@host-pooler.region.aws.neon.tech/db?pgbouncer=true&sslmode=require" -c "SELECT 1;"
```

If the direct works but pooled fails for `db push`, that's expected — use direct for migrations.
