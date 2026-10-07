"use client";

import { useEffect, useRef, useState } from "react";
import { intentMeta } from "@/lib/intents";

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
}

export default function ChatPanel({
  messages,
  connected,
  peerIntent,
  videoBusy,
  onSend,
  onStartVideo,
  onShield,
  onEnd,
}: {
  messages: ChatMessage[];
  connected: boolean;
  peerIntent?: string;
  videoBusy: boolean;
  onSend: (text: string) => void;
  onStartVideo: () => void;
  onShield: () => void;
  onEnd: () => void;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const vibe = peerIntent ? intentMeta(peerIntent) : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl animate-slide-in-right">
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 backdrop-blur px-4 py-4 shadow-lg">
        <div>
          <p className="font-semibold text-lg">Stranger</p>
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            {connected ? (
              <>
                <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Connected
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Connecting…
              </>
            )}
            {vibe && (
              <span className="ml-1 inline-flex items-center gap-1 text-zinc-400">
                ·
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: vibe.color }}
                />
                {vibe.label}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm transition-all hover:border-zinc-500 hover:bg-zinc-800 active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
          >
            Video
          </button>
          <button
            onClick={onShield}
            title="End and hide this stranger for this session"
            className="rounded-full border border-amber-500/40 px-3 py-1.5 text-sm text-amber-200 transition-all hover:border-amber-400 hover:bg-amber-500/10 active:scale-95"
          >
            Shield
          </button>
          <button
            onClick={onEnd}
            className="rounded-full bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-all hover:bg-red-400 hover:scale-105 active:scale-95"
          >
            End
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500 animate-fade-in">
            Say hello. Messages are peer-to-peer and never stored.
            Use Shield if you want them gone for this session.
          </p>
        )}
        {messages.map((m, idx) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"} animate-slide-in-bottom`}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <span
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-md ${
                m.mine
                  ? "bg-emerald-400 text-zinc-950"
                  : "bg-zinc-800 text-zinc-100 border border-zinc-700"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur p-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 rounded-full bg-zinc-900 px-4 py-2.5 text-base outline-none placeholder:text-zinc-600 transition-all focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 border border-zinc-800"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
        >
          Send
        </button>
      </form>
    </div>
  );
}
