// src/components/scoutchat/usescoutchat.ts
//
// Live group-chat state for a scout lobby. Mounted ONCE at the page
// level (not inside the Chat tab) so the WebSocket keeps running while
// the user is on any tab — that's what lets the Chat tab flash an
// unread dot when a message lands while you're looking elsewhere.
//
//   • history  — initial REST load of the last ~100 messages
//   • live     — WebSocket to /api/scout/lobby/:slug/ws, auto-reconnect
//   • unread   — bumped by socket messages that arrive while activeTab
//                isn't "chat"; cleared via markRead()
//   • send()   — POST a message; the WS echo dedupes by id
//
// Reading is open to anyone; posting is gated server-side (claimed
// lobby member only). The socket is receive-only — clients POST via
// REST and the server fans the insert back out to every subscriber.

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";

// A bounty claim/surpass event — ephemeral, arrives only over the
// socket (never in REST history) and renders as an animated banner.
export type BountyEventData = {
  title: string;
  icon: string;
  rarity: "common" | "rare" | "legendary" | string;
  metric: string;
  playerName: string;
  color: string | null;
  valueLabel: string;
  overtake: boolean;
};

export type ChatMessage = {
  id: string;
  // "message" (default) renders normally; "bounty" renders the event
  // banner using the `bounty` payload below.
  kind?: "message" | "bounty";
  profileId: string;
  lobbyPlayerId: string | null;
  displayName: string;
  color: string | null;
  content: string;
  createdAt: string;
  bounty?: BountyEventData;
};

const MAX_LEN = 800;

// Derive the ws:// URL from API_BASE_URL.
//   dev  → API_BASE_URL === ""           → same-origin, Vite proxies it
//   prod → "https://api.loldata.cc"      → wss://api.loldata.cc
function chatSocketUrl(slug: string): string {
  const base = API_BASE_URL;
  let origin: string;
  if (base) {
    origin = base.replace(/^http/i, "ws"); // http→ws, https→wss
  } else {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    origin = `${proto}//${window.location.host}`;
  }
  return `${origin}/api/scout/lobby/${encodeURIComponent(slug)}/ws`;
}

export function useScoutChat({
  slug,
  activeTab,
}: {
  slug: string;
  activeTab: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);

  // activeTab in a ref so the long-lived socket closure reads the
  // latest value without tearing down / re-subscribing on tab change.
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const sendingRef = useRef(false);
  const seenRef = useRef<Set<string>>(new Set());

  const appendMessage = useCallback(
    (m: ChatMessage, fromSocket: boolean) => {
      if (!m?.id || seenRef.current.has(m.id)) return;
      seenRef.current.add(m.id);
      setMessages((prev) => [...prev, m]);
      // Socket-delivered messages bump the unread badge, but only while
      // the user isn't already reading the Chat tab.
      if (fromSocket && activeTabRef.current !== "chat") {
        setUnread((n) => n + 1);
      }
    },
    []
  );

  // ── Initial history (REST) ────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/scout/lobby/${slug}/chat?limit=100`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        // Backend returns newest-first; reverse to oldest-first.
        const list: ChatMessage[] = (data.messages ?? []).slice().reverse();
        seenRef.current = new Set(list.map((m) => m.id));
        setMessages(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ── Live socket (page-wide, auto-reconnect) ───────────────────────
  useEffect(() => {
    if (!slug) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;
    let reconnectTimer: number | undefined;
    let pingTimer: number | undefined;

    const scheduleReconnect = () => {
      if (closed) return;
      retry = Math.min(retry + 1, 6);
      const delay = Math.min(1000 * 2 ** retry, 15000);
      reconnectTimer = window.setTimeout(connect, delay);
    };

    function connect() {
      if (closed) return;
      try {
        ws = new WebSocket(chatSocketUrl(slug));
      } catch {
        scheduleReconnect();
        return;
      }
      ws.onopen = () => {
        retry = 0;
        setConnected(true);
        pingTimer = window.setInterval(() => {
          try {
            ws?.send("ping");
          } catch {
            /* socket gone */
          }
        }, 30000);
      };
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload?.type === "chat" && payload.message) {
            appendMessage(payload.message as ChatMessage, true);
          } else if (payload?.type === "bounty" && payload.event) {
            // Wrap the bounty event as a special chat item so it slots
            // into the same chronological flow as messages.
            const e = payload.event;
            appendMessage(
              {
                id: e.id,
                kind: "bounty",
                profileId: "",
                lobbyPlayerId: null,
                displayName: e.playerName ?? "A player",
                color: e.color ?? null,
                content: "",
                createdAt: e.createdAt ?? new Date().toISOString(),
                bounty: {
                  title: e.title,
                  icon: e.icon,
                  rarity: e.rarity,
                  metric: e.metric,
                  playerName: e.playerName ?? "A player",
                  color: e.color ?? null,
                  valueLabel: e.valueLabel,
                  overtake: !!e.overtake,
                },
              },
              true
            );
          }
        } catch {
          /* non-JSON keepalive ("pong") — ignore */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (pingTimer) window.clearInterval(pingTimer);
        scheduleReconnect();
      };
      ws.onerror = () => {
        try {
          ws?.close();
        } catch {
          /* noop */
        }
      };
    }

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pingTimer) window.clearInterval(pingTimer);
      try {
        ws?.close();
      } catch {
        /* noop */
      }
    };
  }, [slug, appendMessage]);

  const markRead = useCallback(() => setUnread(0), []);

  const send = useCallback(
    async (raw: string): Promise<boolean> => {
      const content = raw.trim().slice(0, MAX_LEN);
      if (!content || sendingRef.current) return false;
      sendingRef.current = true;
      setSending(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          showCyberToast({ title: "Sign in to post", variant: "error" });
          return false;
        }
        const res = await fetch(
          `${API_BASE_URL}/api/scout/lobby/${slug}/chat`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          showCyberToast({
            title: "Post failed",
            description: body?.error,
            variant: "error",
          });
          return false;
        }
        const { message } = await res.json();
        // Render immediately; the WS echo for the same id is deduped.
        if (message) appendMessage(message as ChatMessage, false);
        return true;
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [slug, appendMessage]
  );

  return { messages, loading, sending, unread, connected, markRead, send };
}
