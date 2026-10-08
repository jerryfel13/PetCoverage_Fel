"use client";

import { useEffect, useRef } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localRef.current && localRef.current.srcObject !== localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteRef.current.srcObject !== remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black" style={{ touchAction: "none" }}>
      <div className="relative flex-1 min-h-0">
        {/* Remote (full screen) */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full bg-zinc-900 object-contain"
        />
        {/* Subtle vignette for a cinema feel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(0,0,0,0.55))]"
        />
        {!remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
            <span className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
            </span>
            <p className="text-sm">Waiting for stranger&rsquo;s video…</p>
          </div>
        )}
        {/* Local (picture-in-picture) */}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-5 right-5 h-44 w-32 rounded-2xl border border-white/10 bg-zinc-800 object-cover shadow-2xl"
        />
      </div>
      <div className="flex justify-center bg-zinc-950/90 p-4 backdrop-blur">
        <button
          onClick={onEnd}
          className="rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-8 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] active:scale-95"
        >
          End video
        </button>
      </div>
    </div>
  );
}
