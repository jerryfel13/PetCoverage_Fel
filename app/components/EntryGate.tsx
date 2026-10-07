"use client";

import { useState } from "react";

export default function EntryGate({
  onReady,
}: {
  onReady: (lat: number, lng: number) => void;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState<string>("");

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => onReady(pos.coords.latitude, pos.coords.longitude),
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
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-12 bg-zinc-950 p-6 text-zinc-100 animate-fade-in">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold tracking-tighter bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Pulse
        </h1>
        <p className="mt-3 max-w-md text-lg text-zinc-400 leading-relaxed">
          A living globe of anonymous strangers. Drop onto the map and connect.
        </p>
      </div>

      <button
        onClick={enter}
        disabled={status === "locating"}
        className="group relative rounded-full bg-emerald-400 px-10 py-3.5 font-semibold text-zinc-950 transition-all duration-200 hover:bg-emerald-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-none"
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
        <p className="max-w-sm text-center text-sm text-red-400 animate-slide-in-top">
          {error}
        </p>
      )}

      <p className="max-w-md text-center text-sm text-zinc-500 leading-relaxed">
        No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
        Nothing is stored — closing the tab ends everything.
      </p>
    </div>
  );
}
