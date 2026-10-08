"use client";

import { useEffect, useRef, useState } from "react";
import EntryGate from "./components/EntryGate";
import WorldMap, { type MapRipple } from "./components/WorldMap";
import ConnectionPrompt from "./components/ConnectionPrompt";
import ChatPanel, { type ChatMessage } from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";
import { join, leave, poll, sendSignal } from "@/lib/api";
import { PeerSession, type DescType, type PeerControl } from "@/lib/webrtc";
import { POLL_INTERVAL_MS } from "@/lib/presence";
import { type PeerDot, type SignalMsg } from "@/lib/types";
import { INTENTS, type IntentId } from "@/lib/intents";

type Conn =
  | { kind: "idle" }
  | { kind: "requesting"; peerId: string }
  | { kind: "incoming"; peerId: string }
  | { kind: "connecting"; peerId: string }
  | { kind: "connected"; peerId: string };

type VideoState = "none" | "requesting" | "incoming" | "active";

const REQUEST_TIMEOUT_MS = 30_000;

export default function Home() {
  const [phase, setPhase] = useState<"gate" | "live">("gate");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [myIntent, setMyIntent] = useState<IntentId>("curious");
  const [peers, setPeers] = useState<PeerDot[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // First-run hint on the map — dismissed manually or on first connection.
  const [showHint, setShowHint] = useState(true);
  // Connection ripples — expanding rings fired when a chat connects.
  const [ripples, setRipples] = useState<MapRipple[]>([]);
  const rippleId = useRef(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  // Session-local shield list — never stored server-side. Hides a stranger
  // for the rest of this browser session after you tap Shield.
  const [shielded, setShielded] = useState<Set<string>>(() => new Set());
  const shieldedRef = useRef(shielded);
  useEffect(() => {
    shieldedRef.current = shielded;
  }, [shielded]);

  const [conn, _setConn] = useState<Conn>({ kind: "idle" });
  const connRef = useRef<Conn>(conn);
  const setConn = (c: Conn) => {
    connRef.current = c;
    _setConn(c);
  };

  // Hide the onboarding hint as soon as a connection starts.
  useEffect(() => {
    if (conn.kind !== "idle") setShowHint(false);
  }, [conn.kind]);

  // Fire a ripple at both dots the moment a connection is established.
  const connPeerId = conn.kind === "idle" ? null : conn.peerId;
  const prevConnKind = useRef<Conn["kind"]>(conn.kind);
  useEffect(() => {
    const prev = prevConnKind.current;
    prevConnKind.current = conn.kind;
    if (
      prev !== "connected" &&
      conn.kind === "connected" &&
      myLocation &&
      connPeerId
    ) {
      const peer = peers.find((p) => p.id === connPeerId);
      const mineId = rippleId.current++;
      const peerRippleId = peer ? rippleId.current++ : null;
      const added: MapRipple[] = [
        { id: mineId, lng: myLocation.lng, lat: myLocation.lat },
      ];
      if (peer && peerRippleId !== null) {
        added.push({ id: peerRippleId, lng: peer.lng, lat: peer.lat });
      }
      setRipples((cur) => [...cur, ...added]);
      const ids = added.map((r) => r.id);
      window.setTimeout(() => {
        setRipples((cur) => cur.filter((r) => !ids.includes(r.id)));
      }, 1700);
    }
  }, [conn.kind, connPeerId, myLocation, peers]);

  const [video, _setVideo] = useState<VideoState>("none");
  const videoRef = useRef<VideoState>(video);
  const setVideo = (v: VideoState) => {
    videoRef.current = v;
    _setVideo(v);
  };

  // Confirmation before ending a connection or video call.
  const [confirmEnd, setConfirmEnd] = useState<null | "chat" | "video">(null);
  // Confirmation before shielding a stranger.
  const [confirmShield, setConfirmShield] = useState(false);

  const peerRef = useRef<PeerSession | null>(null);
  const msgId = useRef(0);
  const requestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showNotice(text: string) {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 3500);
  }

  function addMessage(mine: boolean, text: string) {
    setMessages((prev) => [...prev, { id: msgId.current++, mine, text }]);
  }

  function teardown(message?: string) {
    if (requestTimer.current) clearTimeout(requestTimer.current);
    requestTimer.current = null;
    if (videoTimer.current) clearTimeout(videoTimer.current);
    videoTimer.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
    setMessages([]);
    setConn({ kind: "idle" });
    if (message) showNotice(message);
  }

  function startPeer(peerId: string, initiator: boolean) {
    const ps = new PeerSession(initiator, {
      onSignal: (type: DescType, payload: string) => {
        void sendSignal(sessionId, peerId, type, payload);
      },
      onChat: (text) => addMessage(false, text),
      onControl: (ctrl) => handleControl(ctrl),
      onRemoteStream: (stream) => setRemoteStream(stream),
      onConnectionState: (state) => {
        if (state === "failed") {
          teardown("Connection failed (network).");
        }
      },
      onChannelOpen: () => {
        setConn({ kind: "connected", peerId });
      },
    });
    peerRef.current = ps;
  }

  function handleControl(ctrl: PeerControl) {
    const ps = peerRef.current;
    switch (ctrl) {
      case "video-request":
        if (videoRef.current === "none") setVideo("incoming");
        break;
      case "video-accept":
        if (videoTimer.current) clearTimeout(videoTimer.current);
        videoTimer.current = null;
        if (videoRef.current === "requesting" && ps) {
          ps.startVideo()
            .then((stream) => {
              setLocalStream(stream);
              setVideo("active");
            })
            .catch(() => {
              setVideo("none");
              ps.sendControl("video-end");
              showNotice("Camera unavailable.");
            });
        }
        break;
      case "video-decline":
        if (videoTimer.current) clearTimeout(videoTimer.current);
        videoTimer.current = null;
        if (videoRef.current === "requesting") {
          setVideo("none");
          showNotice("Video declined.");
        }
        break;
      case "video-end":
        ps?.stopVideo();
        setLocalStream(null);
        setRemoteStream(null);
        setVideo("none");
        break;
    }
  }

  function requestConnection(peerId: string) {
    if (connRef.current.kind !== "idle") return;
    if (shieldedRef.current.has(peerId)) {
      showNotice("Shielded for this session.");
      return;
    }
    setConn({ kind: "requesting", peerId });
    void sendSignal(sessionId, peerId, "request");
    requestTimer.current = setTimeout(() => {
      if (
        connRef.current.kind === "requesting" &&
        connRef.current.peerId === peerId
      ) {
        void sendSignal(sessionId, peerId, "end");
        teardown("No answer.");
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function cancelRequest() {
    if (connRef.current.kind === "requesting") {
      void sendSignal(sessionId, connRef.current.peerId, "end");
    }
    teardown();
  }

  function acceptIncoming() {
    if (connRef.current.kind !== "incoming") return;
    const peerId = connRef.current.peerId;
    startPeer(peerId, false);
    void sendSignal(sessionId, peerId, "accept");
    setConn({ kind: "connecting", peerId });
  }

  function declineIncoming() {
    if (connRef.current.kind !== "incoming") return;
    void sendSignal(sessionId, connRef.current.peerId, "decline");
    setConn({ kind: "idle" });
  }

  function endConnection() {
    const c = connRef.current;
    if (c.kind === "connecting" || c.kind === "connected") {
      void sendSignal(sessionId, c.peerId, "end");
    }
    teardown();
  }

  function shieldPeer() {
    const c = connRef.current;
    if (
      c.kind !== "requesting" &&
      c.kind !== "incoming" &&
      c.kind !== "connecting" &&
      c.kind !== "connected"
    ) {
      return;
    }
    const peerId = c.peerId;
    setShielded((prev) => new Set(prev).add(peerId));
    if (c.kind === "connecting" || c.kind === "connected" || c.kind === "requesting") {
      void sendSignal(sessionId, peerId, "end");
    } else if (c.kind === "incoming") {
      void sendSignal(sessionId, peerId, "decline");
    }
    teardown("Shielded. They won't reach you this session.");
  }

  function startVideoRequest() {
    if (videoRef.current !== "none" || !peerRef.current) return;
    setVideo("requesting");
    peerRef.current.sendControl("video-request");
    videoTimer.current = setTimeout(() => {
      if (videoRef.current === "requesting") {
        setVideo("none");
        showNotice("Video request timed out.");
      }
    }, REQUEST_TIMEOUT_MS);
  }

  function acceptVideo() {
    const ps = peerRef.current;
    if (!ps) return;
    ps.startVideo()
      .then((stream) => {
        setLocalStream(stream);
        ps.sendControl("video-accept");
        setVideo("active");
      })
      .catch(() => {
        ps.sendControl("video-decline");
        setVideo("none");
        showNotice("Camera unavailable.");
      });
  }

  function declineVideo() {
    peerRef.current?.sendControl("video-decline");
    setVideo("none");
  }

  function endVideo() {
    const ps = peerRef.current;
    ps?.stopVideo();
    ps?.sendControl("video-end");
    setLocalStream(null);
    setRemoteStream(null);
    setVideo("none");
  }

  function processSignal(sig: SignalMsg) {
    if (shieldedRef.current.has(sig.fromId)) {
      if (sig.type === "request") {
        void sendSignal(sessionId, sig.fromId, "decline");
      }
      return;
    }

    switch (sig.type) {
      case "request": {
        if (connRef.current.kind === "idle") {
          setConn({ kind: "incoming", peerId: sig.fromId });
        } else {
          void sendSignal(sessionId, sig.fromId, "decline");
        }
        break;
      }
      case "accept": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          requestTimer.current = null;
          startPeer(sig.fromId, true);
          setConn({ kind: "connecting", peerId: sig.fromId });
        }
        break;
      }
      case "decline": {
        const c = connRef.current;
        if (c.kind === "requesting" && c.peerId === sig.fromId) {
          if (requestTimer.current) clearTimeout(requestTimer.current);
          requestTimer.current = null;
          teardown("Request declined.");
        }
        break;
      }
      case "offer":
      case "answer":
      case "ice": {
        const c = connRef.current;
        const peerId =
          c.kind === "connecting" || c.kind === "connected" ? c.peerId : null;
        if (peerRef.current && peerId === sig.fromId) {
          void peerRef.current.handleSignal(
            sig.type as DescType,
            sig.payload ?? "",
          );
        }
        break;
      }
      case "end": {
        const c = connRef.current;
        if (
          (c.kind === "requesting" ||
            c.kind === "incoming" ||
            c.kind === "connecting" ||
            c.kind === "connected") &&
          c.peerId === sig.fromId
        ) {
          if (c.kind === "incoming") setConn({ kind: "idle" });
          else teardown("Stranger disconnected.");
        }
        break;
      }
    }
  }

  const processSignalRef = useRef(processSignal);
  useEffect(() => {
    processSignalRef.current = processSignal;
  });

  useEffect(() => {
    if (phase !== "live" || !sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      try {
        const data = await poll(sessionId);
        if (!active) return;
        setPeers(
          data.peers.filter((p) => !shieldedRef.current.has(p.id)),
        );
        for (const s of data.signals) processSignalRef.current(s);
      } catch {}
      if (active) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [phase, sessionId]);

  useEffect(() => {
    if (!sessionId || phase !== "live") return;
    const onLeave = () => leave(sessionId);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
      leave(sessionId);
    };
  }, [sessionId, phase]);

  async function handleReady(lat: number, lng: number, intent: IntentId) {
    setMyLocation({ lat, lng });
    setMyIntent(intent);
    try {
      await join(sessionId, lat, lng, intent);
    } catch {
      throw new Error(
        "Couldn't reach Pulse. Check DATABASE_URL / network and try again.",
      );
    }
    setPhase("live");
  }

  if (phase === "gate") {
    return <EntryGate onReady={handleReady} />;
  }

  const inChat = conn.kind === "connecting" || conn.kind === "connected";
  const activePeerId =
    conn.kind === "idle" ? null : conn.peerId;
  const activePeerIntent = activePeerId
    ? peers.find((p) => p.id === activePeerId)?.intent
    : undefined;

  return (
    <main className="fixed inset-0 overflow-hidden">
      <WorldMap
        peers={peers}
        me={myLocation}
        myIntent={myIntent}
        onPeerClick={requestConnection}
        canConnect={conn.kind === "idle"}
        ripples={ripples}
      />

      {/* First-run hint: how to find someone */}
      {phase === "live" && conn.kind === "idle" && showHint && (
        <div className="absolute left-1/2 top-4 z-20 w-full max-w-sm -translate-x-1/2 animate-slide-in-top px-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 text-center shadow-2xl backdrop-blur">
            <h2 className="text-base font-semibold text-zinc-100">
              You&rsquo;re on the map
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Tap a dot to connect with someone. Chat and video are
              private — nothing is saved.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {INTENTS.map((intent) => (
                <span
                  key={intent.id}
                  className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: intent.color }}
                  />
                  {intent.label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {peers.length === 0
                ? "No one nearby yet. Keep this tab open — people show up as they join."
                : `${peers.length} stranger${peers.length === 1 ? "" : "s"} nearby`}
            </p>
            <button
              onClick={() => setShowHint(false)}
              className="mt-3 rounded-full bg-emerald-400 px-5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-emerald-300 hover:scale-105 active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {notice && (
        <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          {notice}
        </div>
      )}

      {conn.kind === "requesting" && (
        <div className="absolute left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          <span>Requesting connection…</span>
          <button
            onClick={cancelRequest}
            className="rounded-full bg-zinc-700 px-3 py-1 text-xs hover:bg-zinc-600"
          >
            Cancel
          </button>
        </div>
      )}

      {conn.kind === "incoming" && (
        <ConnectionPrompt
          title="A stranger wants to connect"
          intent={activePeerIntent}
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />
      )}

      {inChat && (
        <ChatPanel
          messages={messages}
          connected={conn.kind === "connected"}
          peerIntent={activePeerIntent}
          videoBusy={video !== "none"}
          onSend={(text) => {
            peerRef.current?.sendChat(text);
            addMessage(true, text);
          }}
          onStartVideo={startVideoRequest}
          onShield={() => setConfirmShield(true)}
          onEnd={() => setConfirmEnd("chat")}
        />
      )}

      {video === "requesting" && (
        <div className="absolute bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm text-zinc-100 shadow-lg backdrop-blur">
          Waiting for stranger to accept video…
        </div>
      )}

      {video === "incoming" && (
        <ConnectionPrompt
          title="Start video call?"
          subtitle="The stranger wants to turn on video."
          acceptLabel="Accept"
          declineLabel="Decline"
          onAccept={acceptVideo}
          onDecline={declineVideo}
        />
      )}

      {video === "active" && (
        <VideoPanel
          localStream={localStream}
          remoteStream={remoteStream}
          onEnd={() => setConfirmEnd("video")}
        />
      )}

      {/* Confirmation before ending a connection or video call */}
      {confirmEnd && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center shadow-2xl animate-scale-in">
            <h3 className="text-lg font-semibold text-zinc-100">
              {confirmEnd === "video" ? "End video call?" : "End connection?"}
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              {confirmEnd === "video"
                ? "Your video will turn off and you'll return to chat."
                : "You'll need to tap a dot to connect again."}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmEnd(null)}
                className="flex-1 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-800 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmEnd === "video") endVideo();
                  else endConnection();
                  setConfirmEnd(null);
                }}
                className="flex-1 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-400 hover:scale-105 active:scale-95"
              >
                 End
               </button>
             </div>
           </div>
         </div>
       )}

      {/* Confirmation before shielding a stranger */}
      {confirmShield && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs rounded-2xl border border-amber-500/30 bg-zinc-900 p-6 text-center shadow-2xl animate-scale-in">
            <h3 className="text-lg font-semibold text-zinc-100">
              Shield this stranger?
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              This ends the connection and hides them for the rest of this
              session.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmShield(false)}
                className="flex-1 rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:bg-zinc-800 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  shieldPeer();
                  setConfirmShield(false);
                }}
                className="flex-1 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-all hover:bg-amber-400 hover:scale-105 active:scale-95"
              >
                Shield
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
