"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
const DEFAULT_API_URL = import.meta.env.MODE === "development"
    ? "http://localhost:3002/chat/ask"
    : "https://ai.loldata.cc/chat/ask";
/* ── Cyber typing animation — character by character with cursor ── */
function useTypewriter(text, speed = 12) {
    const [displayed, setDisplayed] = useState("");
    const [done, setDone] = useState(false);
    useEffect(() => {
        if (!text)
            return;
        setDisplayed("");
        setDone(false);
        let i = 0;
        const iv = setInterval(() => {
            i++;
            setDisplayed(text.slice(0, i));
            if (i >= text.length) {
                clearInterval(iv);
                setDone(true);
            }
        }, speed);
        return () => clearInterval(iv);
    }, [text, speed]);
    return { displayed, done };
}
/* ── Thinking animation — scanning line effect ── */
function ThinkingIndicator() {
    return (_jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("div", { className: "relative w-7 h-7 shrink-0 mt-0.5", children: [_jsx("div", { className: "absolute inset-0 rotate-45 border border-jade/40 bg-jade/[0.06]" }), _jsx("div", { className: "absolute inset-[3px] rotate-45 border border-jade/20 animate-[spin_3s_linear_infinite]" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("span", { className: "text-jade text-[9px] font-mono font-bold", children: "AI" }) })] }), _jsx("div", { className: "flex-1 max-w-[85%]", children: _jsxs("div", { className: "relative rounded-sm border border-jade/10 bg-jade/[0.02] overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/30" }), _jsx("div", { className: "absolute inset-0 overflow-hidden pointer-events-none", children: _jsx("div", { className: "absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-jade/40 to-transparent", style: { animation: "scanDown 1.5s ease-in-out infinite" } }) }), _jsx("div", { className: "relative z-10 px-4 py-3 pl-5", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex gap-[3px]", children: [0, 1, 2, 3, 4].map(i => (_jsx("div", { className: "w-[3px] h-3 bg-jade/30 rounded-[1px]", style: {
                                                animation: `pulse 1s ease-in-out infinite`,
                                                animationDelay: `${i * 120}ms`,
                                            } }, i))) }), _jsx("span", { className: "text-[10px] font-mono text-jade/40 tracking-[0.2em] uppercase", children: "Analyzing" })] }) })] }) })] }));
}
/* ── Single assistant message with typewriter ── */
function AssistantBubble({ text }) {
    const { displayed, done } = useTypewriter(text, 8);
    return (_jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("div", { className: "relative w-7 h-7 shrink-0 mt-0.5", children: [_jsx("div", { className: "absolute inset-0 rotate-45 border border-jade/30 bg-jade/[0.06]" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("span", { className: "text-jade text-[9px] font-mono font-bold", children: "AI" }) })] }), _jsx("div", { className: "flex-1 max-w-[85%]", children: _jsxs("div", { className: "relative rounded-sm border border-flash/[0.06] bg-flash/[0.015] overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/25" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-30", style: {
                                background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.02) 3px, rgba(0,217,146,0.02) 4px)",
                            } }), _jsx("div", { className: "relative z-10 px-4 py-3 pl-5", children: _jsxs("div", { className: "text-[13px] text-flash/70 leading-relaxed font-mono whitespace-pre-wrap", children: [displayed, !done && (_jsx("span", { className: "inline-block w-[2px] h-[14px] bg-jade/60 ml-[1px] align-middle animate-[blink_0.8s_step-end_infinite]" }))] }) })] }) })] }));
}
/* ── User message bubble ── */
function UserBubble({ text }) {
    return (_jsx("div", { className: "flex items-start gap-3 justify-end", children: _jsx("div", { className: "max-w-[80%]", children: _jsxs("div", { className: "relative rounded-sm border border-flash/[0.08] bg-flash/[0.03] overflow-hidden", children: [_jsx("div", { className: "absolute right-0 top-0 bottom-0 w-[2px] bg-flash/15" }), _jsx("div", { className: "relative z-10 px-4 py-2.5 pr-5", children: _jsx("div", { className: "text-[13px] text-flash/60 font-mono whitespace-pre-wrap", children: text }) })] }) }) }));
}
/* ── Error message ── */
function ErrorBubble({ text }) {
    return (_jsxs("div", { className: "flex items-start gap-3", children: [_jsxs("div", { className: "relative w-7 h-7 shrink-0 mt-0.5", children: [_jsx("div", { className: "absolute inset-0 rotate-45 border border-red-400/30 bg-red-400/[0.06]" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("span", { className: "text-red-400 text-[9px] font-mono font-bold", children: "!" }) })] }), _jsx("div", { className: "max-w-[85%]", children: _jsxs("div", { className: "relative rounded-sm border border-red-400/10 bg-red-400/[0.03] overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-red-400/25" }), _jsx("div", { className: "relative z-10 px-4 py-2.5 pl-5", children: _jsx("div", { className: "text-[13px] text-red-300/60 font-mono whitespace-pre-wrap", children: text }) })] }) })] }));
}
/* ── Main component ── */
export default function LoldataAIChat({ contextHint, placeholder, className, apiUrl = DEFAULT_API_URL, }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [abortCtrl, setAbortCtrl] = useState(null);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const effectivePlaceholder = useMemo(() => placeholder || "Ask lolData AI anything...", [placeholder]);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [messages, loading]);
    function pushMessage(msg) {
        setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), createdAt: Date.now(), ...msg },
        ]);
    }
    async function sendPrompt(prompt) {
        const controller = new AbortController();
        setAbortCtrl(controller);
        setLoading(true);
        try {
            const finalPrompt = contextHint ? `${contextHint}\n\n${prompt}` : prompt;
            const res = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: finalPrompt }),
                signal: controller.signal,
            });
            const contentType = res.headers.get("content-type") || "";
            let raw = null;
            let answerText = "";
            if (contentType.includes("application/json")) {
                raw = await res.json();
                answerText =
                    raw?.answer ??
                        raw?.message ??
                        raw?.output ??
                        (typeof raw === "string" ? raw : JSON.stringify(raw, null, 2));
            }
            else {
                const txt = await res.text();
                try {
                    raw = JSON.parse(txt);
                    answerText =
                        raw?.answer ??
                            raw?.message ??
                            raw?.output ??
                            (typeof raw === "string" ? raw : JSON.stringify(raw, null, 2));
                }
                catch {
                    raw = null;
                    answerText = txt;
                }
            }
            if (!res.ok) {
                pushMessage({ role: "error", content: `HTTP ${res.status}\n${answerText}` });
                return;
            }
            pushMessage({ role: "assistant", content: answerText });
        }
        catch (err) {
            if (err?.name !== "AbortError") {
                pushMessage({
                    role: "error",
                    content: err?.message || "Connection failed",
                });
            }
        }
        finally {
            setLoading(false);
            setAbortCtrl(null);
        }
    }
    async function handleSend() {
        const trimmed = input.trim();
        if (!trimmed || loading)
            return;
        pushMessage({ role: "user", content: trimmed });
        setInput("");
        await sendPrompt(trimmed);
    }
    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }
    function handleSuggestion(q) {
        if (loading)
            return;
        setInput("");
        pushMessage({ role: "user", content: q });
        sendPrompt(q);
    }
    return (_jsxs("div", { className: cn("flex h-full w-full flex-col", className), children: [_jsx("style", { children: `
        @keyframes scanDown {
          0%, 100% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      ` }), _jsxs("div", { ref: scrollRef, className: "mt-4 flex-1 overflow-y-auto pr-2 scrollbar-hide", children: [messages.length === 0 && (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 gap-6", children: [_jsxs("div", { className: "relative w-16 h-16", children: [_jsx("div", { className: "absolute inset-0 rotate-45 border border-jade/15 bg-jade/[0.02]" }), _jsx("div", { className: "absolute inset-2 rotate-45 border border-jade/8" }), _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("span", { className: "text-jade/40 text-lg font-mono font-bold tracking-tight", children: "AI" }) })] }), _jsxs("div", { className: "text-center space-y-1.5", children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/30", children: "lolData Intelligence" }), _jsx("p", { className: "text-[11px] font-mono text-flash/20 max-w-sm leading-relaxed", children: "Diamond+ match data, champion analytics, build paths, matchup analysis" })] }), _jsx("div", { className: "flex flex-wrap justify-center gap-2 max-w-md", children: [
                                    "What do I build on Volibear?",
                                    "Lillia jungle winrate?",
                                    "Yasuo vs Yone mid?",
                                ].map((q) => (_jsx("button", { type: "button", onClick: () => handleSuggestion(q), className: cn("px-3 py-1.5 rounded-sm text-[10px] font-mono tracking-wide cursor-pointer", "border border-jade/10 bg-transparent text-flash/30", "hover:border-jade/25 hover:text-jade/50 hover:bg-jade/[0.03]", "transition-all duration-300"), children: q }, q))) })] })), _jsxs("div", { className: "flex flex-col gap-4", children: [messages.map((m) => m.role === "user" ? (_jsx(UserBubble, { text: m.content }, m.id)) : m.role === "error" ? (_jsx(ErrorBubble, { text: m.content }, m.id)) : (_jsx(AssistantBubble, { text: m.content }, m.id))), loading && _jsx(ThinkingIndicator, {})] })] }), _jsxs("div", { className: "mt-4 flex items-center gap-3", children: [_jsx("div", { className: cn("relative flex-1 flex items-center rounded-sm h-10", "bg-flash/[0.02]", "border border-flash/[0.06]", "transition-all duration-300", "focus-within:border-jade/20 focus-within:bg-jade/[0.02]"), children: _jsx("textarea", { ref: inputRef, value: input, onChange: (e) => setInput(e.target.value), onKeyDown: handleKeyDown, placeholder: effectivePlaceholder, rows: 1, className: cn("flex-1 resize-none bg-transparent border-0 outline-none", "text-[12px] font-mono text-flash/50 placeholder:text-flash/15", "h-[22px] py-0 px-3", "caret-jade/60") }) }), !loading ? (_jsxs("button", { type: "button", onClick: handleSend, disabled: !input.trim(), className: cn("relative w-10 h-10 shrink-0 cursor-pointer transition-all duration-300", input.trim()
                            ? "opacity-100"
                            : "opacity-15 pointer-events-none"), children: [_jsx("div", { className: cn("absolute inset-0 rotate-45 rounded-[3px] border transition-all duration-300", "bg-jade/[0.04] border-jade/25", "hover:border-jade/50 hover:bg-jade/[0.08]", "hover:shadow-[0_0_12px_rgba(0,217,146,0.2)]") }), _jsx("span", { className: "absolute inset-0 flex items-center justify-center text-jade/50 hover:text-jade/80 transition-colors duration-300", children: _jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M22 2L11 13" }), _jsx("path", { d: "M22 2L15 22L11 13L2 9L22 2Z" })] }) })] })) : (_jsxs("button", { type: "button", onClick: () => abortCtrl?.abort(), className: "relative w-10 h-10 shrink-0 cursor-pointer", children: [_jsx("div", { className: "absolute inset-0 rotate-45 rounded-[3px] border border-red-400/25 bg-red-400/[0.04] animate-pulse" }), _jsx("span", { className: "absolute inset-0 flex items-center justify-center", children: _jsx("div", { className: "w-3 h-3 bg-red-400/40 rounded-[1px]" }) })] }))] })] }));
}
