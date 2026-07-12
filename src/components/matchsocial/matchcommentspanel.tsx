// src/components/matchsocial/matchcommentspanel.tsx
//
// Reddit-style threaded comments on a single MatchCard.
//
//   • Each comment is rendered with a jade "tree" gutter on its left:
//     a vertical line spanning its full height + a small horizontal
//     L-stub pointing into the header. Replies indent further right
//     and grow their own vertical lines.
//   • Each comment exposes a Reply button. Click → an inline composer
//     opens under that comment for a child reply.
//   • The top-level composer (showComposer prop) replies to the match
//     itself; parent_comment_id is null in that case.
//
// Typography
//   • Name → chakrapetch bold 13.5px, coloured by player accent
//   • Body → chakrapetch light 12.5px, text-flash/80, LEFT aligned
//   • Header layout: <Name>  ◆  <timeAgo>

import * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { timeAgo } from "@/utils/timeAgo";

type Comment = {
  id: string;
  profileId: string;
  lobbyPlayerId: string | null;
  displayName: string;
  color: string | null;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
};

type TreeNode = { comment: Comment; children: TreeNode[] };

const MAX_LEN = 600;

/** Build a forest of trees from a flat list of comments. Top-level
 *  comments (parentCommentId === null) are the roots; everything else
 *  attaches under its parent. Children are sorted by creation time. */
function buildTree(comments: Comment[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const c of comments) byId.set(c.id, { comment: c, children: [] });
  const roots: TreeNode[] = [];
  for (const c of comments) {
    const node = byId.get(c.id)!;
    if (c.parentCommentId && byId.has(c.parentCommentId)) {
      byId.get(c.parentCommentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function MatchCommentsPanel({
  lobbySlug,
  matchId,
  canComment,
  showComposer,
  onCommentPosted,
}: {
  lobbySlug: string;
  matchId: string;
  canComment: boolean;
  /** When true, the top-level composer renders under the thread. */
  showComposer: boolean;
  onCommentPosted?: () => void;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/scout/lobby/${lobbySlug}/match/${matchId}/comments?limit=200`
      );
      if (!res.ok) return;
      const data = await res.json();
      setComments(data.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, [lobbySlug, matchId]);

  useEffect(() => {
    load();
  }, [load]);

  const tree = useMemo(() => buildTree(comments ?? []), [comments]);
  const hasComments = (comments?.length ?? 0) > 0;

  const handlePosted = (c: Comment) => {
    setComments((prev) => [...(prev ?? []), c]);
    onCommentPosted?.();
  };

  if (!loading && !hasComments && !showComposer) return null;

  return (
    <div
      // The parent match-card wrapper (.match-card-collapsed) sets a
      // clicker cursor, and a global `* { cursor: inherit }` rule
      // propagates it into every descendant — including this comments
      // area, which is NOT part of the tap-to-expand surface. We reset
      // it to the site's base cursor via inline style (highest
      // specificity, beats the inherited class which has no
      // !important). Children inherit this value via the same global
      // rule; the Reply / send buttons re-assert clicker with their
      // own `!important` .cursor-clicker rule.
      className="relative px-4 pt-7 pb-1 flex flex-col gap-2"
      style={{ cursor: "url('/cursors/base.svg') 8 8, auto" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Panel-level connector — fills the visual gap between the
          match card's bottom edge and the first top-level comment's
          L-shape stub. Sits at the same x (and same 2px thickness)
          as the comment vertical line so they line up perfectly. */}
      {(loading || tree.length > 0) && (
        <span
          aria-hidden
          className="absolute top-0 h-5 w-[2px] bg-jade/55"
          style={{ left: "21px" }}
        />
      )}
      {loading && !hasComments ? (
        <div className="self-start py-1">
          <Loader2 className="w-3 h-3 text-jade animate-spin" />
        </div>
      ) : (
        tree.map((node, i) => (
          <CommentNode
            key={node.comment.id}
            node={node}
            isLast={i === tree.length - 1}
            lobbySlug={lobbySlug}
            matchId={matchId}
            canComment={canComment}
            onPosted={handlePosted}
          />
        ))
      )}

      {/* Top-level composer — replies to the match itself, no parent. */}
      {showComposer && (
        <div className="mt-1">
          <Composer
            lobbySlug={lobbySlug}
            matchId={matchId}
            parentCommentId={null}
            canComment={canComment}
            onPosted={handlePosted}
            autoFocus
            placeholder="Write a comment…"
          />
        </div>
      )}
    </div>
  );
}

// ─── Comment node (recursive) ───────────────────────────────────────

function CommentNode({
  node,
  isLast,
  lobbySlug,
  matchId,
  canComment,
  onPosted,
}: {
  node: TreeNode;
  /** True when this is the last among its sibling group. Controls
   *  whether the vertical spine continues below the elbow. */
  isLast: boolean;
  lobbySlug: string;
  matchId: string;
  canComment: boolean;
  onPosted: (c: Comment) => void;
}) {
  const [replying, setReplying] = useState(false);
  const { comment } = node;
  const accent = comment.color || "#d7d8d9";
  // The vertical spine continues below this comment's elbow when:
  //   • it has children / an open reply composer (descendants below), OR
  //   • it's NOT the last sibling (more comments follow at this level).
  // Only a leaf that's also the last sibling stops the line at the
  // elbow — everything else keeps the spine flowing downward.
  const hasBranchBelow = node.children.length > 0 || replying;
  const continueDown = hasBranchBelow || !isLast;

  return (
    <div className="relative pl-5">
      {/* Tree gutter, drawn as TWO overlapping pieces so the straight
          spine and the rounded branch never fight each other:
            1. A straight 2px vertical spine at x=5. Runs from 8px
               above (covering the gap to the previous sibling / panel
               connector) down to either the branch corner (terminal
               leaf) or all the way to the bottom (when a child / reply
               / following sibling needs the line to keep flowing).
            2. A rounded branch whose own border-left sits at the exact
               same x as the spine (same colour → invisible overlap),
               contributing only the curve + horizontal stub that
               peels off toward the comment. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-[5px] -top-2 w-[2px] bg-jade/55",
          continueDown ? "bottom-0" : "h-[12px]"
        )}
      />
      <span
        aria-hidden
        className="absolute left-[5px] top-[4px] w-[12px] h-[9px] border-l-2 border-b-2 border-jade/55 rounded-bl-[7px]"
      />

      {/* Header: name ◆ timeAgo — all left-aligned. */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span
          className="font-chakrapetch font-bold text-[14.5px] leading-tight"
          style={{ color: accent }}
        >
          {comment.displayName}
        </span>
        <span className="text-jade/50 text-[8px] leading-none">◆</span>
        <span className="font-jetbrains text-[9px] tracking-[0.18em] uppercase text-flash/35">
          {timeAgo(new Date(comment.createdAt).getTime())}
        </span>
      </div>

      {/* Body */}
      <div
        className="font-chakrapetch text-[13.5px] text-flash/85 leading-snug mt-0.5 whitespace-pre-wrap break-words"
        style={{ fontWeight: 300 }}
      >
        {comment.content}
      </div>

      {/* Action row: Reply (canComment) */}
      {canComment && (
        <button
          type="button"
          onClick={() => setReplying((p) => !p)}
          className={cn(
            "text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium mt-1 cursor-clicker transition-colors",
            replying ? "text-jade" : "text-flash/40 hover:text-jade"
          )}
        >
          {replying ? "Cancel" : "Reply"}
        </button>
      )}

      {/* Inline reply composer + children — both indented further right */}
      {(replying || node.children.length > 0) && (
        <div className="mt-2 flex flex-col gap-2">
          {replying && (
            <Composer
              lobbySlug={lobbySlug}
              matchId={matchId}
              parentCommentId={comment.id}
              canComment={canComment}
              onPosted={(c) => {
                onPosted(c);
                setReplying(false);
              }}
              autoFocus
              placeholder={`Reply to ${comment.displayName}…`}
              compact
            />
          )}
          {node.children.map((child, i) => (
            <CommentNode
              key={child.comment.id}
              node={child}
              isLast={i === node.children.length - 1}
              lobbySlug={lobbySlug}
              matchId={matchId}
              canComment={canComment}
              onPosted={onPosted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Composer ───────────────────────────────────────────────────────

function Composer({
  lobbySlug,
  matchId,
  parentCommentId,
  canComment,
  onPosted,
  autoFocus,
  placeholder,
  compact,
}: {
  lobbySlug: string;
  matchId: string;
  parentCommentId: string | null;
  canComment: boolean;
  onPosted: (c: Comment) => void;
  autoFocus?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const post = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showCyberToast({ title: "Sign in to comment", variant: "error" });
        return;
      }
      const res = await fetch(
        `${API_BASE_URL}/api/scout/lobby/${lobbySlug}/match/${matchId}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content, parentCommentId }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showCyberToast({
          title: "Comment failed",
          description: body?.error,
          variant: "error",
        });
        return;
      }
      const { comment } = await res.json();
      onPosted(comment);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  if (!canComment) {
    return (
      <div className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/35 py-1">
        Claim an identity in this lobby to comment
      </div>
    );
  }

  return (
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
        placeholder={placeholder ?? "Write a comment…"}
        rows={1}
        autoFocus={autoFocus}
        className={cn(
          "flex-1 resize-none bg-filmdark/30 border border-flash/15 rounded-[3px] outline-none focus:border-jade/45 font-chakrapetch leading-snug",
          compact
            ? "px-2 py-1 text-[11px] text-flash placeholder:text-flash/30"
            : "px-2.5 py-1.5 text-[11px] text-flash placeholder:text-flash/30"
        )}
        style={{ fontWeight: 300 }}
      />
      <button
        type="button"
        onClick={post}
        disabled={!draft.trim() || sending}
        className={cn(
          "shrink-0 rounded-[3px] border border-jade/40 bg-jade/[0.12] hover:bg-jade/[0.22] text-jade flex items-center justify-center cursor-clicker transition-all disabled:opacity-40 disabled:cursor-not-allowed",
          compact ? "w-6 h-6" : "w-7 h-7"
        )}
        aria-label="Send"
      >
        {sending ? (
          <Loader2 className={compact ? "w-2.5 h-2.5 animate-spin" : "w-3 h-3 animate-spin"} />
        ) : (
          <Send className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
        )}
      </button>
    </div>
  );
}
