"use client";

import { useState } from "react";
import { INTENTS, type IntentId } from "@/lib/intents";

export default function EntryGate({
  onReady,
}: {
  onReady: (
    lat: number,
    lng: number,
    intent: IntentId,
  ) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [intent, setIntent] = useState<IntentId>("curious");

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await onReady(pos.coords.latitude, pos.coords.longitude, intent);
        } catch (err) {
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Couldn't join Pulse. Please try again.",
          );
        }
      },
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      // High accuracy + maximumAge:0 forces a fresh fix (Wi-Fi/GPS scan)
      // instead of reusing the browser's cached IP-based location.
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center gap-10 overflow-hidden bg-zinc-950 p-6 text-zinc-100 animate-fade-in">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.16),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(139,92,246,0.12),_transparent_50%)]"
      />
      {/* Faint concentric rings for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]"
      />

      <div className="relative z-10 text-center space-y-5">
        <h1 className="font-display text-7xl font-bold tracking-tighter bg-gradient-to-br from-emerald-300 via-sky-300 to-violet-400 bg-clip-text text-transparent">
          Pulse
        </h1>
        <p className="mx-auto max-w-md text-lg text-zinc-400 leading-relaxed">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-3">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Your intent
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {INTENTS.map((option) => {
            const selected = intent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setIntent(option.id)}
                className={`rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.98] ${
                  selected
                    ? "border-transparent bg-zinc-900"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40"
                }`}
                style={
                  selected
                    ? {
                        boxShadow: `0 0 0 1.5px ${option.color}, 0 10px 34px -10px ${option.color}66`,
                      }
                    : undefined
                }
              >
                <span className="text-2xl leading-none">{option.emoji}</span>
                <span className="mt-2.5 block text-sm font-semibold text-zinc-100">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {option.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={enter}
        disabled={status === "locating"}
        className="relative z-10 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 px-10 py-3.5 font-semibold text-zinc-950 transition-all duration-200 hover:scale-105 hover:shadow-[0_0_44px_rgba(52,211,153,0.45)] active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
      >
        {status === "locating" ? (
          <span className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            Locating…
          </span>
        ) : (
          "Enter Pulse"
        )}
      </button>

      {status === "error" && (
        <p className="relative z-10 max-w-sm text-center text-sm text-red-400 animate-slide-in-top">
          {error}
        </p>
      )}

      <p className="relative z-10 max-w-md text-center text-sm text-zinc-500 leading-relaxed">
        No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
        Nothing is stored — closing the tab ends everything.
      </p>
    </div>
  );
}
