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

- Security headers + CSP tuned for Mapbox (`proxy.ts` — Next.js 16 renamed Middleware to Proxy).
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

Next with more time: server-side shield TTL, connection-quality meter, TURN for strict NATs.

## Infrastructure fixes

- **Database connection** — Supabase's direct host is IPv6-only, but this machine and Vercel reach it over IPv4 via the shared pooler. `DATABASE_URL` points at the transaction pooler (port 6543, `?pgbouncer=true`) and `DIRECT_URL` at the session pooler (port 5432). `prisma.config.ts` reads `DIRECT_URL` for migrations; `lib/prisma.ts` auto-appends `pgbouncer=true` for pooler hosts so the app uses the transaction pooler at runtime.

## Recent enhancements

- **Mobile zoom fix** — locked the viewport (`maximum-scale=1, user-scalable=no`), raised the chat input to `text-base` (≥16px stops iOS auto-zoom), added `touch-action: manipulation` + `overscroll-behavior: none` on the body, `touch-action: none` on video, and `object-contain` so video isn't cropped.
- **Emoji markers everywhere** — map dots are 30px circles with a colored border, dark fill, and the intent emoji centered. The same emoji replaces plain colored dots in the entry picker, connection prompt, chat header, map legend, and onboarding hint, so every intent indicator reads the same.
- **Connection ripple** — when a chat connects, an expanding ring fires at both your dot and the stranger's dot.
- **Kindred glow** — strangers who picked the same intent as you get a colored glow, so shared moods stand out on the map.
- **Icebreaker prompts** — chat shows a tappable suggested opener (with a ↻ to cycle) when you connect and haven't said anything yet; three prompts per intent.
- **Typing pulse** — while the stranger types, their map dot bounces and chat shows a "typing…" bubble. Typing travels over the data channel (debounced, 1.5s idle timeout), so nothing touches the server.
- **UI/UX polish** — fixed a font bug (body rendered in Arial, overriding Geist), added a Space Grotesk display font, redesigned the entry gate (aurora + concentric rings, gradient wordmark, intent cards that glow in their own color, gradient enter button), polished video (vignette, rounded PiP, gradient end button, bouncing waiting state) and chat (gradient own-bubbles, richer empty state, focus glow), and added an ambient aurora, slim theme-matched scrollbars, and a custom selection color.
- **Plain-language copy** — replaced jargon ("peer-to-peer", "stored", "session") with everyday words ("only you two can read these", "nothing is saved", "your visit").
- **Onboarding hint + confirmations** — a first-run card explains the map and intents (auto-hides on first connection); ending a chat/video and Shield each ask for confirmation.
- **`middleware.ts` → `proxy.ts`** — Next.js 16 renamed Middleware to Proxy; the file and its default export are now `proxy`.

## Trade-offs

- In-memory rate limiting is instance-local on Vercel — blunt abuse, not a global DoS shield.
- Intents are soft signals, not matching filters (kept the product simple).
- Shield is session-local by design (stateless product).

## Delivery checklist

- [x] Incremental commits with clear messages
- [x] `NOTES.md`
- [x] `.env` with real `DATABASE_URL` + `NEXT_PUBLIC_MAPBOX_TOKEN` (gitignored — set the same vars on Vercel)
- [x] `npx prisma db push` (schema applied)
- [x] `npm run build` passes
- [x] GitHub repo: `github.com/jerryfel13/PetCoverage_Fel` (remote `origin`, branch `main`)
- [ ] Push commits to GitHub (held pending local testing)
- [ ] Vercel deploy with `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_MAPBOX_TOKEN`
