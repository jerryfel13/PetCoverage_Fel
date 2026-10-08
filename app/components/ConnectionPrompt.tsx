"use client";

import { intentMeta } from "@/lib/intents";

// Reusable centered prompt for "someone wants to connect" and
// "someone wants to start video".
export default function ConnectionPrompt({
  title,
  subtitle,
  intent,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  intent?: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const vibe = intent ? intentMeta(intent) : null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6 animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-8 text-center text-zinc-100 shadow-2xl border border-zinc-800 animate-scale-in">
        <h2 className="text-xl font-semibold">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>}
        {vibe && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1.5 text-xs text-zinc-300">
            {vibe.emoji}
            Feeling {vibe.label.toLowerCase()} — {vibe.blurb}
          </div>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 rounded-full border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-800 active:scale-95"
          >
            {declineLabel}
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-95"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
