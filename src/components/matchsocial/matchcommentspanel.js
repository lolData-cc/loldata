import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { timeAgo } from "@/utils/timeAgo";
const MAX_LEN = 600;
/** Build a forest of trees from a flat list of comments. Top-level
 *  comments (parentCommentId === null) are the roots; everything else
 *  attaches under its parent. Children are sorted by creation time. */
function buildTree(comments) {
    const byId = new Map();
    for (const c of comments)
        byId.set(c.id, { comment: c, children: [] });
    const roots = [];
    for (const c of comments) {
        const node = byId.get(c.id);
        if (c.parentCommentId && byId.has(c.parentCommentId)) {
            byId.get(c.parentCommentId).children.push(node);
        }
        else {
            roots.push(node);
        }
    }
    return roots;
}
export function MatchCommentsPanel({ lobbySlug, matchId, canComment, showComposer, onCommentPosted, }) {
    const [comments, setComments] = useState(null);
    const [loading, setLoading] = useState(true);
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobbySlug}/match/${matchId}/comments?limit=200`);
            if (!res.ok)
                return;
            const data = await res.json();
            setComments(data.comments ?? []);
        }
        finally {
            setLoading(false);
        }
    }, [lobbySlug, matchId]);
    useEffect(() => {
        load();
    }, [load]);
    const tree = useMemo(() => buildTree(comments ?? []), [comments]);
    const hasComments = (comments?.length ?? 0) > 0;
    const handlePosted = (c) => {
        setComments((prev) => [...(prev ?? []), c]);
        onCommentPosted?.();
    };
    if (!loading && !hasComments && !showComposer)
        return null;
    return (_jsxs("div", { 
        // The parent match-card wrapper (.match-card-collapsed) sets a
        // clicker cursor, and a global `* { cursor: inherit }` rule
        // propagates it into every descendant — including this comments
        // area, which is NOT part of the tap-to-expand surface. We reset
        // it to the site's base cursor via inline style (highest
        // specificity, beats the inherited class which has no
        // !important). Children inherit this value via the same global
        // rule; the Reply / send buttons re-assert clicker with their
        // own `!important` .cursor-clicker rule.
        className: "relative px-4 pt-7 pb-1 flex flex-col gap-2", style: { cursor: "url('/cursors/base.svg') 8 8, auto" }, onClick: (e) => e.stopPropagation(), children: [(loading || tree.length > 0) && (_jsx("span", { "aria-hidden": true, className: "absolute top-0 h-5 w-[2px] bg-jade/55", style: { left: "21px" } })), loading && !hasComments ? (_jsx("div", { className: "self-start py-1", children: _jsx(Loader2, { className: "w-3 h-3 text-jade animate-spin" }) })) : (tree.map((node, i) => (_jsx(CommentNode, { node: node, isLast: i === tree.length - 1, lobbySlug: lobbySlug, matchId: matchId, canComment: canComment, onPosted: handlePosted }, node.comment.id)))), showComposer && (_jsx("div", { className: "mt-1", children: _jsx(Composer, { lobbySlug: lobbySlug, matchId: matchId, parentCommentId: null, canComment: canComment, onPosted: handlePosted, autoFocus: true, placeholder: "Write a comment\u2026" }) }))] }));
}
// ─── Comment node (recursive) ───────────────────────────────────────
function CommentNode({ node, isLast, lobbySlug, matchId, canComment, onPosted, }) {
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
    return (_jsxs("div", { className: "relative pl-5", children: [_jsx("span", { "aria-hidden": true, className: cn("absolute left-[5px] -top-2 w-[2px] bg-jade/55", continueDown ? "bottom-0" : "h-[12px]") }), _jsx("span", { "aria-hidden": true, className: "absolute left-[5px] top-[4px] w-[12px] h-[9px] border-l-2 border-b-2 border-jade/55 rounded-bl-[7px]" }), _jsxs("div", { className: "flex items-baseline gap-1.5 flex-wrap", children: [_jsx("span", { className: "font-chakrapetch font-bold text-[14.5px] leading-tight", style: { color: accent }, children: comment.displayName }), _jsx("span", { className: "text-jade/50 text-[8px] leading-none", children: "\u25C6" }), _jsx("span", { className: "font-jetbrains text-[9px] tracking-[0.18em] uppercase text-flash/35", children: timeAgo(new Date(comment.createdAt).getTime()) })] }), _jsx("div", { className: "font-chakrapetch text-[13.5px] text-flash/85 leading-snug mt-0.5 whitespace-pre-wrap break-words", style: { fontWeight: 300 }, children: comment.content }), canComment && (_jsx("button", { type: "button", onClick: () => setReplying((p) => !p), className: cn("text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium mt-1 cursor-clicker transition-colors", replying ? "text-jade" : "text-flash/40 hover:text-jade"), children: replying ? "Cancel" : "Reply" })), (replying || node.children.length > 0) && (_jsxs("div", { className: "mt-2 flex flex-col gap-2", children: [replying && (_jsx(Composer, { lobbySlug: lobbySlug, matchId: matchId, parentCommentId: comment.id, canComment: canComment, onPosted: (c) => {
                            onPosted(c);
                            setReplying(false);
                        }, autoFocus: true, placeholder: `Reply to ${comment.displayName}…`, compact: true })), node.children.map((child, i) => (_jsx(CommentNode, { node: child, isLast: i === node.children.length - 1, lobbySlug: lobbySlug, matchId: matchId, canComment: canComment, onPosted: onPosted }, child.comment.id)))] }))] }));
}
// ─── Composer ───────────────────────────────────────────────────────
function Composer({ lobbySlug, matchId, parentCommentId, canComment, onPosted, autoFocus, placeholder, compact, }) {
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const post = async () => {
        const content = draft.trim();
        if (!content || sending)
            return;
        setSending(true);
        try {
            const { data: { session }, } = await supabase.auth.getSession();
            if (!session?.access_token) {
                showCyberToast({ title: "Sign in to comment", variant: "error" });
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobbySlug}/match/${matchId}/comments`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content, parentCommentId }),
            });
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
        }
        finally {
            setSending(false);
        }
    };
    if (!canComment) {
        return (_jsx("div", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/35 py-1", children: "Claim an identity in this lobby to comment" }));
    }
    return (_jsxs("div", { className: "flex items-end gap-2", children: [_jsx("textarea", { value: draft, onChange: (e) => setDraft(e.target.value.slice(0, MAX_LEN)), onKeyDown: (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        post();
                    }
                }, placeholder: placeholder ?? "Write a comment…", rows: 1, autoFocus: autoFocus, className: cn("flex-1 resize-none bg-black/30 border border-flash/15 rounded-[3px] outline-none focus:border-jade/45 font-chakrapetch leading-snug", compact
                    ? "px-2 py-1 text-[11px] text-flash placeholder:text-flash/30"
                    : "px-2.5 py-1.5 text-[11px] text-flash placeholder:text-flash/30"), style: { fontWeight: 300 } }), _jsx("button", { type: "button", onClick: post, disabled: !draft.trim() || sending, className: cn("shrink-0 rounded-[3px] border border-jade/40 bg-jade/[0.12] hover:bg-jade/[0.22] text-jade flex items-center justify-center cursor-clicker transition-all disabled:opacity-40 disabled:cursor-not-allowed", compact ? "w-6 h-6" : "w-7 h-7"), "aria-label": "Send", children: sending ? (_jsx(Loader2, { className: compact ? "w-2.5 h-2.5 animate-spin" : "w-3 h-3 animate-spin" })) : (_jsx(Send, { className: compact ? "w-2.5 h-2.5" : "w-3 h-3" })) })] }));
}
