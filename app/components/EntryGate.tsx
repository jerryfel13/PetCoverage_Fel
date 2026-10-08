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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(56,189,248,0.08),_transparent_50%)]"
      />

      <div className="relative z-10 text-center space-y-4">
        <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Pulse
        </h1>
        <p className="mt-3 max-w-md text-lg text-zinc-400 leading-relaxed">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-3">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Your intent
        </p>
        <div className="grid grid-cols-2 gap-2">
          {INTENTS.map((option) => {
            const selected = intent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setIntent(option.id)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] ${
                  selected
                    ? "border-emerald-400/60 bg-zinc-900 shadow-[0_0_24px_rgba(52,211,153,0.15)]"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-600"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {option.emoji}
                  {option.label}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
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
        className="relative z-10 group rounded-full bg-emerald-400 px-10 py-3.5 font-semibold text-zinc-950 transition-all duration-200 hover:bg-emerald-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
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
