// src/components/scoutchat/chattab.tsx
//
// Group chat for a scout lobby. Polls every 8s for new messages.
//
// Posting rules (server-enforced; UI mirrors them):
//   • verify_mode === "disabled"   → anyone signed in can post
//   • verify_mode in (claim, full) → only claimed lobby members
// Reading is open to everyone with access to the lobby URL.

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, Send } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { showCyberToast } from "@/lib/toast-utils";
import { timeAgo } from "@/utils/timeAgo";
import { VerifyBadge } from "@/components/verifybadge";

type ChatMessage = {
  id: string;
  profileId: string;
  lobbyPlayerId: string | null;
  displayName: string;
  color: string | null;
  content: string;
  createdAt: string;
};

type LobbyForChat = {
  slug: string;
  verifyMode?: "disabled" | "claim_only" | "full";
  players: Array<{
    id: string;
    displayName: string;
    color: string | null;
    claimedByProfileId?: string | null;
    showVerifyBadge?: boolean;
    verifyGrade?: 0 | 1 | 2;
  }>;
};

const POLL_INTERVAL_MS = 8000;
const MAX_LEN = 800;

export function ChatTab({
  slug,
  lobby,
}: {
  slug: string;
  lobby: LobbyForChat;
}) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const me = userId
    ? lobby.players.find((p) => p.claimedByProfileId === userId) ?? null
    : null;
  // Posting requires a claimed (certified) identity in this lobby —
  // always. No anonymous messages, regardless of verify_mode. The
  // backend enforces the same rule.
  const canPost = !!me;

  // Build a lookup from profile_id → current player data (for badge).
  const playerByProfileId = new Map<
    string,
    { showBadge: boolean; grade: 0 | 1 | 2 }
  >();
  for (const p of lobby.players) {
    if (p.claimedByProfileId) {
      playerByProfileId.set(p.claimedByProfileId, {
        showBadge: !!p.showVerifyBadge,
        grade: p.verifyGrade ?? 0,
      });
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/scout/lobby/${slug}/chat?limit=100`
      );
      if (!res.ok) return;
      const data = await res.json();
      // Backend returns newest-first; reverse to render oldest-first.
      setMessages((data.messages ?? []).slice().reverse());
    } finally {
      setLoading(false);
    }
  }, [slug]);

  // Initial + polling.
  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const post = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showCyberToast({ title: "Sign in to post", variant: "error" });
        return;
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
        return;
      }
      const { message } = await res.json();
      setMessages((prev) => [...prev, message]);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-md bg-black/20 border border-flash/[0.06] overflow-hidden flex flex-col h-[640px]">
      {/* Messages scroll area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto cyber-scrollbar px-5 py-4 flex flex-col gap-3"
      >
        {loading ? (
          <div className="m-auto">
            <Loader2 className="w-5 h-5 text-jade animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="m-auto text-center">
            <div className="text-[11px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mb-1">
              No messages yet
            </div>
            <div className="text-[10px] font-geist text-flash/30">
              Be the first to write something.
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = !!userId && m.profileId === userId;
            const badge = playerByProfileId.get(m.profileId);
            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isMe ? "self-end items-end" : "self-start items-start"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span
                    className="text-[11px] font-chakrapetch font-bold truncate"
                    style={{ color: m.color || "#d7d8d9" }}
                  >
                    {m.displayName}
                  </span>
                  {badge?.showBadge && badge.grade >= 1 && (
                    <VerifyBadge
                      grade={badge.grade === 2 ? 2 : 1}
                      size={10}
                    />
                  )}
                  <span className="text-[8px] font-jetbrains tracking-[0.15em] uppercase text-flash/30">
                    {timeAgo(new Date(m.createdAt).getTime())}
                  </span>
                </div>
                <div
                  className={cn(
                    "rounded-[6px] px-3 py-2 text-[12px] font-geist leading-snug whitespace-pre-wrap break-words",
                    isMe
                      ? "bg-jade/[0.14] text-flash border border-jade/30"
                      : "bg-black/35 text-flash/85 border border-flash/[0.08]"
                  )}
                >
                  {m.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-flash/[0.06] p-3 bg-black/30">
        {canPost ? (
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  post();
                }
              }}
              placeholder={
                me
                  ? `Message as ${me.displayName}…`
                  : "Message the lobby…"
              }
              rows={1}
              className="flex-1 resize-none bg-black/30 border border-flash/15 rounded-[4px] px-3 py-2 text-[12px] text-flash placeholder:text-flash/30 outline-none focus:border-jade/45 font-geist leading-snug"
            />
            <button
              type="button"
              onClick={post}
              disabled={!draft.trim() || sending}
              className="w-10 h-10 shrink-0 rounded-[4px] border border-jade/40 bg-jade/[0.12] hover:bg-jade/[0.22] text-jade flex items-center justify-center cursor-clicker transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <div className="text-center text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 py-2">
            {!userId
              ? "Sign in to post"
              : "Claim an identity in this lobby to post"}
          </div>
        )}
      </div>
    </div>
  );
}
