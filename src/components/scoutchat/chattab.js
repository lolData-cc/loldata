import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, SendHorizontal, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/utils/timeAgo";
import { VerifyBadge } from "@/components/verifybadge";
import { BountyEventBanner } from "@/components/scoutchat/bountyeventbanner";
const MAX_LEN = 800;
export function ChatTab({ lobby, userId, messages, loading, sending, onSend, }) {
    const [draft, setDraft] = useState("");
    // True when the scroll position is below the very top — i.e. there are
    // older messages hidden above the viewport. Drives the cyber "earlier"
    // decoration so we never need a side scrollbar.
    const [hasAbove, setHasAbove] = useState(false);
    const scrollRef = useRef(null);
    // Animate only messages that arrive AFTER first paint — the initial
    // history load shouldn't all fly in at once.
    const mountedRef = useRef(false);
    useEffect(() => {
        mountedRef.current = true;
    }, []);
    const handleScroll = () => {
        const el = scrollRef.current;
        if (el)
            setHasAbove(el.scrollTop > 8);
    };
    const me = userId
        ? lobby.players.find((p) => p.claimedByProfileId === userId) ?? null
        : null;
    // Posting always requires a claimed identity (server-enforced too).
    const canPost = !!me;
    // profile_id → verify badge state, for the inline name badge.
    const playerByProfileId = new Map();
    for (const p of lobby.players) {
        if (p.claimedByProfileId) {
            playerByProfileId.set(p.claimedByProfileId, {
                showBadge: !!p.showVerifyBadge,
                grade: p.verifyGrade ?? 0,
            });
        }
    }
    // Stick to the bottom as new messages land, then recompute whether
    // there's now content hidden above (so the top decoration shows).
    useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        el.scrollTop = el.scrollHeight;
        setHasAbove(el.scrollTop > 8);
    }, [messages.length]);
    const submit = async () => {
        const content = draft.trim();
        if (!content || sending)
            return;
        const ok = await onSend(content);
        if (ok)
            setDraft("");
    };
    return (
    // No card chrome — the chat is "suspended" on the page background.
    _jsxs("div", { className: "flex flex-col h-[600px]", children: [_jsxs("div", { className: "relative flex-1 min-h-0", children: [_jsx("div", { ref: scrollRef, onScroll: handleScroll, 
                        // overscroll-contain stops the wheel from "chaining" to the
                        // page once the chat hits its top/bottom — scrolling inside the
                        // chat stays inside the chat.
                        className: "h-full overflow-y-auto overscroll-contain no-scrollbar flex flex-col gap-[22px] pb-5 pt-1", children: loading ? (_jsx("div", { className: "m-auto", children: _jsx(Loader2, { className: "w-5 h-5 text-jade animate-spin" }) })) : messages.length === 0 ? (_jsxs("div", { className: "m-auto text-center", children: [_jsx("div", { className: "text-[12px] font-chakrapetch font-bold tracking-[0.06em] uppercase text-flash/45 mb-1", children: "No messages yet" }), _jsx("div", { className: "text-[11px] font-chakrapetch text-flash/30", children: "Be the first to write something." })] })) : (messages.map((m) => {
                            // Bounty claim/surpass events render as their own banner.
                            if (m.kind === "bounty" && m.bounty) {
                                return _jsx(BountyEventBanner, { data: m.bounty }, m.id);
                            }
                            const isMe = !!userId && m.profileId === userId;
                            const badge = playerByProfileId.get(m.profileId);
                            return (_jsxs(motion.div, { initial: mountedRef.current ? { opacity: 0, y: 8 } : false, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, ease: "easeOut" }, className: "flex flex-col gap-0.5", children: [_jsxs("div", { className: "flex items-baseline gap-2", children: [_jsxs("span", { className: "font-chakrapetch font-bold text-[13.5px] leading-none", style: { color: m.color || "#d7d8d9" }, children: [m.displayName, isMe && (_jsx("span", { className: "ml-1 text-jade/45 font-normal text-[10px] tracking-[0.12em] uppercase", children: "you" }))] }), badge?.showBadge && badge.grade >= 1 && (_jsx(VerifyBadge, { grade: badge.grade === 2 ? 2 : 1, size: 11 })), _jsx("span", { className: "text-[10px] font-chakrapetch text-flash/25 tabular-nums", children: timeAgo(new Date(m.createdAt).getTime()) })] }), _jsx("p", { className: "font-chakrapetch font-light text-[14px] text-flash/55 leading-snug whitespace-pre-wrap break-words", children: m.content })] }, m.id));
                        })) }), _jsxs("div", { className: cn("pointer-events-none absolute inset-x-0 top-0 z-10 transition-opacity duration-500", hasAbove ? "opacity-100" : "opacity-0"), children: [_jsx("div", { className: "h-16 bg-gradient-to-b from-[#040A0C] via-[#040A0C]/80 to-transparent" }), _jsxs("div", { className: "absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1", children: [_jsx(ChevronUp, { className: "w-4 h-4 text-jade/55 drop-shadow-[0_0_6px_rgba(0,217,146,0.55)] animate-pulse" }), _jsx("span", { className: "block h-px w-10 bg-gradient-to-r from-transparent via-jade/55 to-transparent shadow-[0_0_8px_rgba(0,217,146,0.4)]" })] })] })] }), canPost ? (_jsxs("div", { className: cn("flex items-center gap-3 border-b transition-colors duration-300", "border-flash/15 focus-within:border-jade/50"), children: [_jsx("input", { value: draft, onChange: (e) => setDraft(e.target.value.slice(0, MAX_LEN)), onKeyDown: (e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                submit();
                            }
                        }, placeholder: me ? `Message as ${me.displayName}…` : "Message the lobby…", className: "flex-1 bg-transparent border-0 outline-none py-2.5 text-[14px] font-chakrapetch text-flash placeholder:text-flash/25 tracking-wide" }), _jsx("button", { type: "button", onClick: submit, disabled: !draft.trim() || sending, className: "shrink-0 flex items-center gap-1.5 pb-1 text-jade/80 hover:text-jade disabled:text-flash/20 transition-colors cursor-clicker font-jetbrains text-[10px] tracking-[0.2em] uppercase", "aria-label": "Send", children: sending ? (_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" })) : (_jsxs(_Fragment, { children: ["Send", _jsx(SendHorizontal, { className: "w-3.5 h-3.5" })] })) })] })) : (_jsx("div", { className: "border-t border-flash/[0.06] text-center text-[11px] font-chakrapetch tracking-[0.04em] uppercase text-flash/40 py-3", children: !userId ? (_jsx(Link, { to: "/login", className: "text-jade/75 hover:text-jade underline-offset-2 hover:underline transition-colors cursor-clicker", children: "Sign in to post" })) : ("Claim an identity in this lobby to post") }))] }));
}
