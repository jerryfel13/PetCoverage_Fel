"use client";

import { useEffect, useRef, useState } from "react";
import { intentMeta } from "@/lib/intents";
import type { MessageStatus } from "@/lib/types";

export interface ChatMessage {
  id: string;
  mine: boolean;
  text: string;
  status?: MessageStatus;
}

export default function ChatPanel({
  messages,
  connected,
  peerIntent,
  videoBusy,
  peerTyping,
  onSend,
  onStartVideo,
  onShield,
  onEnd,
  onTyping,
}: {
  messages: ChatMessage[];
  connected: boolean;
  peerIntent?: string;
  videoBusy: boolean;
  peerTyping: boolean;
  onSend: (text: string) => void;
  onStartVideo: () => void;
  onShield: () => void;
  onEnd: () => void;
  onTyping: (active: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [iceIdx, setIceIdx] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRef = useRef(false);
  const vibe = peerIntent ? intentMeta(peerIntent) : null;
  const icebreakers = vibe?.icebreakers ?? [];
  const icebreaker =
    icebreakers.length > 0
      ? icebreakers[iceIdx % icebreakers.length]
      : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, peerTyping]);

  // Stop the typing indicator when the panel unmounts.
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  function handleDraftChange(value: string) {
    setDraft(value);
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping(true);
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      typingRef.current = false;
      onTyping(false);
    }, 1500);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (typingRef.current) {
      typingRef.current = false;
      onTyping(false);
    }
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
                {vibe.emoji}
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
        {messages.length === 0 && !peerTyping && (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-2xl">💬</p>
            <p className="mt-2 text-sm text-zinc-500">
              Say hello. Only you two can read these — nothing is saved.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              Tap Shield to hide this person for the rest of your visit.
            </p>
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.mine ? "items-end" : "items-start"} animate-slide-in-bottom`}
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <span
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-md ${
                m.mine
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-500 text-zinc-950"
                  : "bg-zinc-800 text-zinc-100 border border-zinc-700"
              }`}
            >
              {m.text}
            </span>
            {m.mine && m.status && (
              <span
                className={`mt-0.5 mr-1 text-[10px] ${
                  m.status === "seen" ? "text-emerald-400" : "text-zinc-500"
                }`}
              >
                {m.status === "seen"
                  ? "Seen"
                  : m.status === "delivered"
                    ? "Delivered"
                    : "Sent"}
              </span>
            )}
          </div>
        ))}
        {peerTyping && (
          <div className="flex items-center gap-1.5 animate-fade-in">
            <span className="flex gap-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {connected && icebreaker && messages.length === 0 && (
        <div className="flex items-center gap-2 border-t border-zinc-800 bg-zinc-900/30 px-4 py-2">
          <button
            onClick={() => setDraft(icebreaker)}
            className="flex-1 truncate rounded-lg bg-zinc-800/60 px-3 py-1.5 text-left text-xs text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200"
            title="Tap to use this opener"
          >
            💡 {icebreaker}
          </button>
          <button
            onClick={() => setIceIdx((i) => i + 1)}
            className="shrink-0 rounded-full p-1.5 text-zinc-500 transition-all hover:bg-zinc-800 hover:text-zinc-300"
            title="Another suggestion"
          >
            ↻
          </button>
        </div>
      )}

      <form onSubmit={submit} className="flex gap-2 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur p-4">
        <input
          value={draft}
          onChange={(e) => handleDraftChange(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          className="flex-1 rounded-full bg-zinc-900 px-4 py-2.5 text-base outline-none placeholder:text-zinc-600 transition-all focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/40 disabled:opacity-50 border border-zinc-800"
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
