// Lightweight in-memory rate limiter for API routes.
// On Vercel serverless this is best-effort per instance (not global).
// Good enough to blunt casual abuse; production should use Redis/Upstash.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  existing.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

export function clientKey(request: Request, suffix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${ip}:${suffix}`;
}
