import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset, isValidLatLng } from "@/lib/geo";
import { isValidIntent } from "@/lib/intents";
import { isValidSessionId } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/join — body { id, lat, lng, intent } (raw coords).
// Applies a 1–3 km privacy offset and upserts the presence row. Raw
// coordinates are never stored.
export async function POST(request: NextRequest) {
  const limited = rateLimit(clientKey(request, "join"), 20, 60_000);
  if (!limited.ok) {
    return Response.json(
      { error: "rate limited" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { id, lat, lng, intent } = (body ?? {}) as Record<string, unknown>;

  if (!isValidSessionId(id)) {
    return Response.json({ error: "invalid id format" }, { status: 400 });
  }
  if (!isValidLatLng(lat, lng)) {
    return Response.json({ error: "invalid coordinates" }, { status: 400 });
  }
  if (!isValidIntent(intent)) {
    return Response.json({ error: "invalid intent" }, { status: 400 });
  }

  const offset = applyPrivacyOffset(lat as number, lng as number);

  await prisma.presence.upsert({
    where: { id },
    create: {
      id,
      lat: offset.lat,
      lng: offset.lng,
      busy: false,
      intent,
      lastSeen: new Date(),
    },
    update: {
      lat: offset.lat,
      lng: offset.lng,
      intent,
      lastSeen: new Date(),
    },
  });

  return Response.json({ ok: true });
}
