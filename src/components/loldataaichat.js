"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUp, ArrowUpRight, Square, Paperclip, X, SquarePen } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOX_API_BASE_URL } from "@/config";
import { RichGameText } from "@/components/richgametext";
import { MatchCard } from "@/components/matchcard";
import { RunePageTree } from "@/components/rune-page-tree";
import { useRuneTrees } from "@/constants/runeData";
// The AI agent is deployed on the box backend (api2) — used directly in both dev
// and prod, so no local backend is needed to test the chat.
const DEFAULT_API_URL = `${BOX_API_BASE_URL}/api/ai/chat`;
const EASE = [0.22, 1, 0.36, 1];
const SUGGESTIONS = [
    "Best item for Quinn vs assassins?",
    "How am I performing lately?",
    "Best support for Aphelios?",
    "Is Darius good into Garen?",
];
// "in 3h" / "in 5d" until the next credit refill — for the out-of-credits notice.
function fmtUntil(iso) {
    if (!iso)
        return "soon";
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0)
        return "soon";
    const h = Math.floor(ms / 3_600_000);
    if (h < 1)
        return `in ${Math.max(1, Math.floor(ms / 60_000))}m`;
    if (h < 24)
        return `in ${h}h`;
    return `in ${Math.floor(h / 24)}d`;
}
/* ── smooth character reveal for assistant answers ── */
function useReveal(text, skip = false) {
    const [n, setN] = useState(skip ? text.length : 0);
    useEffect(() => {
        if (skip) {
            setN(text.length);
            return;
        }
        setN(0);
        if (!text)
            return;
        let i = 0;
        const id = setInterval(() => {
            i++;
            setN(i);
            if (i >= text.length)
                clearInterval(id);
        }, 9);
        return () => clearInterval(id);
    }, [text, skip]);
    return { shown: text.slice(0, n), done: n >= text.length };
}
const enter = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: EASE },
};
function ActionButton({ a }) {
    return (_jsxs(Link, { to: a.href, className: "group/cta inline-flex items-center gap-1.5 rounded-full border border-jade/25 bg-jade/[0.06] px-3.5 py-1.5 font-chakrapetch text-[12px] font-light tracking-wide text-jade/90 transition-all duration-200 hover:border-jade/50 hover:bg-jade/[0.12] hover:text-jade cursor-clicker", children: [a.label, _jsx(ArrowUpRight, { size: 13, className: "transition-transform duration-200 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" })] }));
}
// Renders a rich AI embed (a rune page or a best-game match card) inline.
function EmbedRenderer({ embed }) {
    const trees = useRuneTrees();
    if (embed.type === "match_card") {
        return (_jsx("div", { className: "max-w-full overflow-x-auto scrollbar-hide", children: _jsx(MatchCard, { data: embed.data }) }));
    }
    if (embed.type === "rune_page") {
        return _jsx(RunePageTree, { page: embed.data, trees: trees });
    }
    return null;
}
function AssistantMsg({ text, actions, embeds, instant }) {
    const { shown, done } = useReveal(text, !!instant);
    return (_jsxs(motion.div, { ...enter, className: "pr-6", children: [_jsxs("div", { className: "flex gap-3", children: [_jsx("span", { className: "mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-jade", style: { boxShadow: "0 0 8px #00d992" } }), _jsxs("p", { className: "flex-1 font-chakrapetch text-[15px] font-light leading-[1.75] text-flash/95 whitespace-pre-wrap", children: [done ? _jsx(RichGameText, { text: text }) : shown, !done && (_jsx("span", { className: "ml-0.5 inline-block h-[15px] w-px translate-y-[2px] bg-jade/70 animate-[aiBlink_1s_step-end_infinite]" }))] })] }), done && embeds && embeds.length > 0 && (_jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: EASE }, className: "ml-[18px] mt-4 space-y-3", children: embeds.map((e, i) => (_jsx(EmbedRenderer, { embed: e }, i))) })), done && actions && actions.length > 0 && (_jsx(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: EASE }, className: "ml-[18px] mt-3 flex flex-wrap gap-2", children: actions.map((a) => (_jsx(ActionButton, { a: a }, a.href))) }))] }));
}
function UserMsg({ text, embeds }) {
    return (_jsxs(motion.div, { ...enter, className: "flex flex-col items-end gap-2.5", children: [_jsx("p", { className: "max-w-[80%] whitespace-pre-wrap rounded-[18px] rounded-br-md bg-flash/[0.06] px-4 py-2.5 font-chakrapetch text-[14.5px] font-light leading-relaxed text-flash/80", children: _jsx(RichGameText, { text: text }) }), embeds?.map((e, i) => (_jsx("div", { className: "w-full", children: _jsx(EmbedRenderer, { embed: e }) }, i)))] }));
}
function ErrorMsg({ text }) {
    return (_jsxs(motion.div, { ...enter, className: "flex gap-3 pr-6", children: [_jsx("span", { className: "mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6286]" }), _jsx("p", { className: "font-chakrapetch text-[14px] font-light leading-relaxed text-[#ff6286]/80 whitespace-pre-wrap", children: text })] }));
}
function Thinking() {
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "flex items-center gap-3", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-jade", style: { boxShadow: "0 0 8px #00d992" } }), _jsx("div", { className: "flex gap-1.5", children: [0, 1, 2].map((i) => (_jsx(motion.span, { className: "h-1.5 w-1.5 rounded-full bg-jade/50", animate: { opacity: [0.2, 1, 0.2], y: [0, -3, 0] }, transition: { duration: 1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" } }, i))) })] }));
}
export default function LoldataAIChat({ contextHint, placeholder, className, apiUrl = DEFAULT_API_URL, userContext, authToken, initialPrompt, onInitialPromptConsumed, initialMatchId, initialMatchCard, }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [hydrated, setHydrated] = useState(false);
    const [abortCtrl, setAbortCtrl] = useState(null);
    // AI credit balance for the signed-in user (null = unknown / not signed in).
    const [credits, setCredits] = useState(null);
    const [creditReset, setCreditReset] = useState(null);
    const [creditPlan, setCreditPlan] = useState("free");
    // A game pinned to the input ("Attach to chat") so the next message asks about it.
    const [attachedMatch, setAttachedMatch] = useState(null);
    const scrollRef = useRef(null);
    const contentRef = useRef(null);
    const stickRef = useRef(true);
    const taRef = useRef(null);
    const ph = useMemo(() => placeholder || "Ask lolData AI anything…", [placeholder]);
    const historyUrl = useMemo(() => apiUrl.replace(/\/chat$/, "/history"), [apiUrl]);
    const creditsUrl = useMemo(() => apiUrl.replace(/\/chat$/, "/credits"), [apiUrl]);
    // Stick to the bottom. Track whether the user is near the bottom; snap down
    // whenever the content grows (new message, typewriter reveal, icons loading) —
    // but never yank them back down if they've scrolled up to read.
    useEffect(() => {
        const el = scrollRef.current;
        const content = contentRef.current;
        if (!el || !content)
            return;
        const onScroll = () => {
            stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90;
        };
        el.addEventListener("scroll", onScroll, { passive: true });
        const snap = () => {
            if (stickRef.current)
                el.scrollTop = el.scrollHeight;
        };
        const ro = new ResizeObserver(snap);
        ro.observe(content);
        snap(); // land at the bottom on open
        return () => {
            el.removeEventListener("scroll", onScroll);
            ro.disconnect();
        };
    }, []);
    // auto-grow the input as you type
    useEffect(() => {
        const ta = taRef.current;
        if (!ta)
            return;
        ta.style.height = "0px";
        ta.style.height = Math.min(ta.scrollHeight, 168) + "px";
    }, [input]);
    // Load this account's persisted conversation once (survives refresh / new device).
    useEffect(() => {
        if (!authToken) {
            setHydrated(true);
            return;
        }
        let alive = true;
        fetch(historyUrl, { headers: { Authorization: `Bearer ${authToken}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
            if (!alive)
                return;
            const rows = Array.isArray(d?.messages) ? d.messages : [];
            if (rows.length) {
                setMessages(rows.map((m) => ({
                    id: crypto.randomUUID(),
                    createdAt: Date.now(),
                    role: m?.role === "assistant" ? "assistant" : "user",
                    content: String(m?.content ?? ""),
                    actions: Array.isArray(m?.actions) ? m.actions : undefined,
                    embeds: Array.isArray(m?.embeds) ? m.embeds : undefined,
                    instant: true,
                })));
            }
        })
            .catch(() => { })
            .finally(() => alive && setHydrated(true));
        return () => {
            alive = false;
        };
    }, [authToken, historyUrl]);
    // Load the AI credit balance for this account (refreshed after every send).
    useEffect(() => {
        if (!authToken) {
            setCredits(null);
            return;
        }
        let alive = true;
        fetch(creditsUrl, { headers: { Authorization: `Bearer ${authToken}` } })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
            if (!alive || !d)
                return;
            if (typeof d.credits === "number")
                setCredits(d.credits);
            if (d.resetAt)
                setCreditReset(d.resetAt);
            if (d.plan)
                setCreditPlan(d.plan);
        })
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, [authToken, creditsUrl]);
    function push(m) {
        setMessages((p) => [...p, { id: crypto.randomUUID(), createdAt: Date.now(), ...m }]);
    }
    async function send(prompt, opts) {
        const controller = new AbortController();
        setAbortCtrl(controller);
        setLoading(true);
        try {
            const finalPrompt = contextHint ? `${contextHint}\n\n${prompt}` : prompt;
            // history is this closure's state — BEFORE the new user turn was pushed — so
            // appending the new prompt rebuilds the full thread.
            const history = messages
                .filter((m) => m.role === "user" || m.role === "assistant")
                .slice(-10)
                .map((m) => ({ role: m.role, content: m.content }));
            history.push({ role: "user", content: finalPrompt });
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: JSON.stringify({
                    messages: history,
                    userContext: opts?.matchId ? { ...userContext, matchId: opts.matchId } : userContext,
                }),
                signal: controller.signal,
            });
            let raw = null;
            let answer = "";
            try {
                raw = await res.json();
                answer = raw?.answer ?? raw?.message ?? raw?.output ?? (typeof raw === "string" ? raw : JSON.stringify(raw));
            }
            catch {
                answer = await res.text().catch(() => "");
            }
            // Out of credits — show a friendly notice (with refill time / upgrade nudge)
            // instead of the raw error, and sync the balance to 0.
            if (res.status === 402) {
                setCredits(0);
                if (raw?.resetAt)
                    setCreditReset(raw.resetAt);
                if (raw?.plan)
                    setCreditPlan(raw.plan);
                const isFree = (raw?.plan ?? creditPlan) === "free";
                push({
                    role: "error",
                    content: isFree
                        ? `You're out of AI credits — they refill ${fmtUntil(raw?.resetAt)}. Upgrade for a bigger monthly pool.`
                        : `You've used all your AI credits this cycle — they refill ${fmtUntil(raw?.resetAt)}.`,
                });
                return;
            }
            if (!res.ok) {
                push({ role: "error", content: answer || `Error ${res.status}` });
                return;
            }
            // The reply carries the balance left AFTER this request — update the chip.
            if (typeof raw?.credits === "number")
                setCredits(raw.credits);
            push({
                role: "assistant",
                content: answer,
                actions: Array.isArray(raw?.actions) ? raw.actions : undefined,
                embeds: Array.isArray(raw?.embeds) ? raw.embeds : undefined,
            });
        }
        catch (err) {
            if (err?.name !== "AbortError")
                push({ role: "error", content: err?.message || "Connection failed" });
        }
        finally {
            setLoading(false);
            setAbortCtrl(null);
        }
    }
    function submit() {
        const t = input.trim();
        if (!t || loading || credits === 0)
            return;
        push({ role: "user", content: t });
        setInput("");
        // The pinned game (if any) rides on every message so the AI always analyzes
        // THIS game. The pin is STICKY — it stays until the user clears it (×) or
        // attaches another game — so follow-up questions keep working and the chip
        // above the input always shows which game is attached. (No silent reuse of an
        // old game from history: if a game is pinned, its matchId is always sent.)
        send(t, attachedMatch ? { matchId: attachedMatch.matchId } : undefined);
    }
    function pick(q) {
        if (loading || credits === 0)
            return;
        push({ role: "user", content: q });
        send(q);
    }
    function onKey(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    }
    // Consume a seeded game/prompt from the Learn "AI Coach" buttons after history
    // hydrates. Keyed by matchId+prompt (NOT a one-shot boolean) so attaching a
    // DIFFERENT game later is always picked up — even if the chat doesn't remount.
    // The pinned game is sticky (see submit): it stays attached until the user
    // clears or replaces it, so the matchId rides on every message about it.
    const lastSeedRef = useRef(null);
    useEffect(() => {
        if (!hydrated)
            return;
        if (!initialPrompt && !initialMatchId && !initialMatchCard)
            return;
        const seedKey = `${initialMatchId ?? ""}|${initialPrompt ?? ""}`;
        if (lastSeedRef.current === seedKey)
            return;
        lastSeedRef.current = seedKey;
        // Pin the game so it stays attached for follow-ups and the chip shows it.
        if (initialMatchCard)
            setAttachedMatch({ matchId: initialMatchId ?? null, card: initialMatchCard });
        if (initialPrompt) {
            // Analysis button: auto-send the prompt with the game's card attached.
            push({
                role: "user",
                content: initialPrompt,
                embeds: initialMatchCard ? [{ type: "match_card", data: initialMatchCard }] : undefined,
            });
            send(initialPrompt, { matchId: initialMatchId });
        }
        onInitialPromptConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated, initialPrompt, initialMatchId, initialMatchCard]);
    // Clear the conversation: wipe the on-screen thread, unpin any attached game,
    // and delete this account's persisted history server-side so it doesn't rehydrate.
    function newChat() {
        if (loading)
            return;
        setMessages([]);
        setAttachedMatch(null);
        setInput("");
        lastSeedRef.current = null;
        if (authToken) {
            fetch(historyUrl, { method: "DELETE", headers: { Authorization: `Bearer ${authToken}` } }).catch(() => { });
        }
    }
    const empty = messages.length === 0;
    return (_jsxs("div", { className: cn("flex flex-col", className), children: [_jsx("style", { children: `@keyframes aiBlink{0%,100%{opacity:1}50%{opacity:0}}` }), _jsx("div", { ref: scrollRef, className: "flex-1 overflow-y-auto scrollbar-hide", children: _jsx("div", { ref: contentRef, className: "mx-auto w-full max-w-2xl", children: _jsx(AnimatePresence, { mode: "wait", children: !hydrated ? (_jsx("div", { className: "min-h-[42vh]" }, "hydrating")) : empty ? (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.55, ease: EASE }, className: "flex min-h-[42vh] flex-col items-center justify-center gap-7 text-center", children: [_jsxs("div", { className: "space-y-2.5", children: [_jsx("h3", { className: "font-chakrapetch text-[26px] font-bold tracking-tight text-flash/90", children: "Ask anything." }), _jsx("p", { className: "font-chakrapetch text-[13px] font-light text-flash/35", children: "Real answers, live from ranked data." })] }), _jsx("div", { className: "flex flex-col items-center gap-3", children: SUGGESTIONS.map((q, i) => (_jsx(motion.button, { type: "button", onClick: () => pick(q), initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.12 + i * 0.07, ease: EASE }, className: "font-chakrapetch text-[13.5px] font-light text-flash/45 transition-colors duration-200 hover:text-jade cursor-clicker", children: q }, q))) })] }, "empty")) : (_jsxs("div", { className: "flex flex-col gap-7 py-6", children: [messages.map((m) => m.role === "user" ? (_jsx(UserMsg, { text: m.content, embeds: m.embeds }, m.id)) : m.role === "error" ? (_jsx(ErrorMsg, { text: m.content }, m.id)) : (_jsx(AssistantMsg, { text: m.content, actions: m.actions, embeds: m.embeds, instant: m.instant }, m.id))), loading && _jsx(Thinking, {})] }, "thread")) }) }) }), _jsxs("div", { className: "mx-auto w-full max-w-2xl shrink-0 pt-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2 px-1 font-chakrapetch text-[11px] font-light tracking-wide", children: [!empty ? (_jsxs("button", { type: "button", onClick: newChat, disabled: loading, className: "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-flash/35 transition-colors duration-200 hover:text-jade disabled:opacity-40 cursor-clicker", children: [_jsx(SquarePen, { size: 12, strokeWidth: 1.75 }), "New chat"] })) : (_jsx("span", {})), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-flash/25", children: "1 credit / question" }), credits !== null && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-flash/15", children: "\u00B7" }), _jsxs("span", { className: credits === 0 ? "text-[#ff6286]/80" : "text-flash/45", children: [_jsx("span", { className: credits === 0 ? "text-[#ff6286]/80" : "text-jade/70", children: "\u25C7" }), " ", credits, " left"] }), credits === 0 && (_jsx(Link, { to: "/pricing", className: "font-semibold text-jade/85 underline decoration-jade/30 underline-offset-2 transition-colors hover:text-jade cursor-clicker", children: "Get more" }))] }))] })] }), attachedMatch && (_jsxs("div", { className: "mb-2 flex items-center gap-2 rounded-[12px] border border-jade/25 bg-jade/[0.06] px-3 py-1.5 font-chakrapetch text-[12px] text-flash/70", children: [_jsx(Paperclip, { size: 13, className: "text-jade/70" }), _jsxs("span", { children: ["Attached: ", _jsx("span", { className: "font-semibold text-flash/90", children: attachedMatch.card.championName }), " ", _jsx("span", { className: attachedMatch.card.win ? "text-jade/80" : "text-[#ff6286]/80", children: attachedMatch.card.win ? "win" : "loss" }), " ", "\u2014 ask anything about it"] }), _jsx("button", { type: "button", onClick: () => setAttachedMatch(null), className: "ml-auto grid h-5 w-5 place-items-center rounded-full text-flash/40 transition-colors hover:bg-flash/10 hover:text-flash/80 cursor-clicker", "aria-label": "Remove attached game", children: _jsx(X, { size: 13 }) })] })), _jsxs("div", { className: cn("flex items-end gap-2 rounded-[20px] border px-3 py-2 transition-all duration-300", "border-flash/10 bg-[rgba(255,255,255,0.025)]", "focus-within:border-jade/35 focus-within:bg-[rgba(0,217,146,0.025)]", "focus-within:shadow-[0_0_34px_-12px_rgba(0,217,146,0.55)]"), children: [_jsx("textarea", { ref: taRef, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: onKey, rows: 1, placeholder: attachedMatch ? "Ask anything about this attached game…" : ph, className: "max-h-[168px] flex-1 resize-none border-0 bg-transparent py-1.5 font-chakrapetch text-[14.5px] font-light leading-relaxed text-flash/90 outline-none scrollbar-hide placeholder:text-flash/25 caret-jade" }), loading ? (_jsx("button", { type: "button", onClick: () => abortCtrl?.abort(), "aria-label": "Stop", className: "grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-flash/10 text-flash/60 transition-all duration-200 hover:bg-flash/[0.16] cursor-clicker", children: _jsx(Square, { size: 12, className: "fill-current" }) })) : (_jsx("button", { type: "button", onClick: submit, disabled: !input.trim() || credits === 0, "aria-label": "Send", className: cn("grid h-9 w-9 shrink-0 place-items-center rounded-[14px] transition-all duration-300 cursor-clicker", input.trim() && credits !== 0
                                    ? "bg-jade text-[#04110c] hover:scale-[1.06] shadow-[0_0_22px_-5px_rgba(0,217,146,0.7)]"
                                    : "bg-flash/[0.07] text-flash/25"), children: _jsx(ArrowUp, { size: 18, strokeWidth: 2.5 }) }))] }), _jsx("p", { className: "mt-2 text-center font-chakrapetch text-[10px] font-light text-flash/15", children: "lolData AI can make mistakes \u2014 verify important calls." })] })] }));
}
