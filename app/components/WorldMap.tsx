"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import type { PeerDot } from "@/lib/types";
import { intentMeta } from "@/lib/intents";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export interface MapRipple {
  lng: number;
  lat: number;
  id: number;
}

export default function WorldMap({
  peers,
  me,
  myIntent,
  onPeerClick,
  canConnect,
  ripples,
  typingPeerId,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  myIntent?: string;
  onPeerClick: (id: string) => void;
  canConnect: boolean;
  ripples: MapRipple[];
  typingPeerId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const meMarkerRef = useRef<Marker | null>(null);
  const [ready, setReady] = useState(false);

  // Marker click handlers are bound once, so read the live click handler +
  // connectability through refs (synced in an effect, never during render).
  const onPeerClickRef = useRef(onPeerClick);
  const canConnectRef = useRef(canConnect);
  useEffect(() => {
    onPeerClickRef.current = onPeerClick;
    canConnectRef.current = canConnect;
  });

  // Initialise the map once.
  useEffect(() => {
    if (!TOKEN || !containerRef.current) return;
    let cancelled = false;
    const markers = markersRef.current;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        // Open centered on the user if we know where they are, else world view.
        center: me ? [me.lng, me.lat] : [0, 20],
        zoom: me ? 4 : 1.4,
        attributionControl: true,
      });
      map.on("load", () => {
        if (!cancelled) setReady(true);
      });
      mapRef.current = map;
    })();

    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      meMarkerRef.current?.remove();
      meMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // `me` is only read for the initial center; we don't want to re-init on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show / move the user's own "you are here" pin.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !me) return;
    let cancelled = false;
    const vibe = intentMeta(myIntent);

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      if (!meMarkerRef.current) {
        const el = document.createElement("div");
        el.className = "pulse-me";
        el.title = `You · ${vibe.label}`;
        el.innerHTML = `<span class="pulse-me-label">Me</span><span class="pulse-me-dot" style="border-color:${vibe.color}">${vibe.emoji}</span>`;
        meMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([me.lng, me.lat])
          .addTo(map);
      } else {
        meMarkerRef.current.setLngLat([me.lng, me.lat]);
        const label = meMarkerRef.current.getElement().querySelector(".pulse-me-dot") as HTMLElement | null;
        if (label) {
          label.style.borderColor = vibe.color;
          label.textContent = vibe.emoji;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me, myIntent, ready]);

  // Reconcile markers whenever the peer list changes (or the map becomes ready).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const markers = markersRef.current;
      const seen = new Set<string>();

      for (const peer of peers) {
        seen.add(peer.id);
        const vibe = intentMeta(peer.intent);
        const isKindred = peer.intent === myIntent;
        let marker = markers.get(peer.id);
        if (!marker) {
          const el = document.createElement("button");
          el.className = "pulse-dot";
          el.style.borderColor = vibe.color;
          el.textContent = vibe.emoji;
          if (isKindred) {
            el.style.filter = `drop-shadow(0 0 8px ${vibe.color})`;
          }
          el.title = `${vibe.label} — tap to connect`;
          if (peer.id === typingPeerId) el.classList.add("typing");
          el.setAttribute("aria-label", `Connect with ${vibe.label} stranger`);
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (canConnectRef.current) onPeerClickRef.current(peer.id);
          });
          marker = new mapboxgl.Marker({ element: el })
            .setLngLat([peer.lng, peer.lat])
            .addTo(map);
          markers.set(peer.id, marker);
        } else {
          const el = marker.getElement();
          el.style.borderColor = vibe.color;
          el.textContent = vibe.emoji;
          el.title = `${vibe.label} — tap to connect`;
          el.style.filter = isKindred
            ? `drop-shadow(0 0 8px ${vibe.color})`
            : "";
          el.classList.toggle("typing", peer.id === typingPeerId);
        }
        marker.getElement().style.opacity = peer.busy ? "0.35" : "1";
        marker.getElement().style.pointerEvents = peer.busy ? "none" : "auto";
      }

      // Drop markers for peers that went offline / got filtered out.
      for (const [id, marker] of markers) {
        if (!seen.has(id)) {
          marker.remove();
          markers.delete(id);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [peers, ready, typingPeerId]);

  // Render connection ripples — one-shot expanding rings at each dot.
  const seenRipplesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || ripples.length === 0) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      for (const r of ripples) {
        if (seenRipplesRef.current.has(r.id)) continue;
        seenRipplesRef.current.add(r.id);
        const el = document.createElement("div");
        el.className = "pulse-ripple";
        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([r.lng, r.lat])
          .addTo(map);
        setTimeout(() => marker.remove(), 1700);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ripples, ready]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full bg-zinc-900" />

      {!TOKEN && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-md rounded-lg bg-zinc-800 p-4 text-sm text-zinc-200">
            Set{" "}
            <code className="text-emerald-400">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
            <code>.env</code> to load the map.
          </p>
        </div>
      )}

      {/* Online count + intent legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <div className="rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur">
          {peers.length} online
        </div>
        <div className="hidden sm:flex items-center gap-3 rounded-2xl bg-zinc-900/80 px-3 py-2 text-[10px] uppercase tracking-wide text-zinc-400 backdrop-blur">
          {["curious", "chill", "deep", "quick"].map((id) => {
            const vibe = intentMeta(id);
            return (
              <span key={id} className="inline-flex items-center gap-1.5">
                {vibe.emoji}
                {vibe.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
