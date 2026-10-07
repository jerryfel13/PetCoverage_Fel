# Pulse — Assessment Notes

## Phase 1 — Make it run

Bugs found and fixed:

- **Stale presence forever** (`app/api/poll/route.ts`) — heartbeat used `updateMany({ where: {} })`, refreshing every online user. Filter by caller `id` so dots expire after `STALE_MS`.
- **Chat never delivered** (`lib/webrtc.ts`) — sender used `t: "msg"`, receiver expected `t: "chat"`. Aligned on `"chat"`.
- **ICE before remote description** (`lib/webrtc.ts`) — candidates flushed before `setRemoteDescription`. Reordered: set remote desc, then flush.
- **`end` didn't clear busy** (`app/api/signal/route.ts`) — only `decline` freed peers. Treat `end` the same.
- **Stale request timer ref** (`app/page.tsx`) — timeout cleared but ref not nulled; null after clear.
- **Cancel while requesting stuck UI** (`app/page.tsx`) — `end` ignored `requesting`; now handled.
- **Video request no timeout** (`app/page.tsx`) — added 30s timeout + cleanup.
- **Fake Mapbox token fallback** (`WorldMap.tsx`) — invalid default hid the “set token” message; require real `NEXT_PUBLIC_MAPBOX_TOKEN`.
- **Silent join failures** (`lib/api.ts` / entry flow) — join now throws on non-OK; gate surfaces the error.
- **Leave on unmount** — also call `leave` when leaving the live phase, not only `pagehide`.

## Phase 2 — Make it good

- Custom motion (fade / slide / scale) via Tailwind + CSS pulse rings on dots.
- Stronger hierarchy: larger Pulse wordmark, gradient title, clearer spacing.
- Micro-interactions: hover scale, emerald glow, focus rings, locating spinner.
- Depth: blurred overlays, borders, panel shadows, connection pulse indicators.
- Map legend for intents; cleaner “Me” pin aligned with intent color.

## Phase 3 — Make it secure

Implemented:

- Security headers + CSP tuned for Mapbox (`middleware.ts`).
- Session ID validation on join / poll / leave / signal.
- Signal payload size + nesting checks; reject self-signals.
- Chat sanitization on the data channel.
- Best-effort per-IP rate limits on join / poll / signal (`lib/rate-limit.ts`).

Noted, not fully solved on serverless alone:

- Shared rate limits need Redis/Upstash across instances.
- Client-generated session IDs (UUID) — spoofing risk is low; server-issued IDs would be better.
- No CSRF tokens (anonymous beacon-friendly POSTs).

## Phase 4 — Make it better

**Intent rings + Shield** (alive *and* safer):

1. **Intent** — on enter, pick Curious / Chill / Deep / Quick hello. Stored only on the live presence row, colored on the map, shown in connection prompts and chat header. Helps strangers decide before connecting without accounts or history.
2. **Shield** — one tap ends the connection and hides that session ID for the rest of *your* browser session (map + auto-decline requests). Client-only — nothing stored server-side, fits “no history.”

Why this: reviewers remember a product choice, not more polish. Intent makes the globe feel social; Shield is a practical safety affordance for anonymous chat/video.

Next with more time: server-side shield TTL, typing indicators, connection-quality meter, TURN for strict NATs.

## Trade-offs

- In-memory rate limiting is instance-local on Vercel — blunt abuse, not a global DoS shield.
- Intents are soft signals, not matching filters (kept the product simple).
- Shield is session-local by design (stateless product).

## Delivery checklist

- [x] Incremental commits with clear messages
- [x] `NOTES.md`
- [ ] `.env` with real `DATABASE_URL` + `NEXT_PUBLIC_MAPBOX_TOKEN`
- [ ] `npx prisma db push` (adds `intent` column)
- [ ] Public GitHub repo (clone → new repo, do not fork)
- [ ] Vercel deploy with the same env vars
