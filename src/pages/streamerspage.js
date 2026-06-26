import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Check, Copy, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiamondButton } from "@/components/ui/diamond-button";
import { Label } from "@/components/ui/label";
import { showCyberToast } from "@/lib/toast-utils";
import { useAuth } from "@/context/authcontext";
import { supabase } from "@/lib/supabaseClient";
/* ── Typing animation ──────────────────────────────────────────────── */
function TypingOnInView({ text, speed = 50, className = "" }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.55 });
    const [typed, setTyped] = useState("");
    const runId = useRef(0);
    const timerRef = useRef(null);
    useEffect(() => {
        if (!isInView)
            return;
        const id = ++runId.current;
        let i = 0;
        setTyped("");
        const step = () => {
            if (runId.current !== id)
                return;
            const ch = text.charAt(i);
            if (!ch) {
                timerRef.current = null;
                return;
            }
            setTyped((prev) => prev + ch);
            i += 1;
            timerRef.current = window.setTimeout(step, speed);
        };
        timerRef.current = window.setTimeout(step, speed);
        return () => { runId.current++; if (timerRef.current)
            clearTimeout(timerRef.current); };
    }, [isInView, text, speed]);
    const done = typed.length === text.length;
    return (_jsxs("h1", { ref: ref, className: className, "aria-label": text, children: [_jsx("span", { children: typed }), _jsx("span", { className: `ml-1 inline-block w-[1ch] select-none ${done ? "opacity-0" : "opacity-100 animate-pulse"}`, children: "|" })] }));
}
/* ── Copy box ──────────────────────────────────────────────────────── */
function CopyBox({ text, note }) {
    const [copied, setCopied] = useState(false);
    function handleCopy() {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "relative flex items-center gap-3 bg-[#0a0f14] border border-flash/15 rounded-md px-4 py-3 group", children: [_jsx("code", { className: "flex-1 text-[13px] font-mono text-flash/70 break-all leading-relaxed select-all", children: text }), _jsx("button", { type: "button", onClick: handleCopy, className: "shrink-0 p-1.5 rounded-sm border border-flash/10 hover:border-jade/30 hover:bg-jade/5 transition-all cursor-clicker", "aria-label": "Copy", children: copied ? (_jsx(Check, { className: "w-3.5 h-3.5 text-jade" })) : (_jsx(Copy, { className: "w-3.5 h-3.5 text-flash/40 group-hover:text-flash/70 transition-colors" })) })] }), note && _jsx("p", { className: "mt-1.5 text-[10px] font-mono text-flash/30 tracking-wide", children: note })] }));
}
/* ── Glass card ────────────────────────────────────────────────────── */
const glassDark = cn("relative overflow-hidden rounded-md", "bg-black/25 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]");
/* ── Fade in animation wrapper ─────────────────────────────────────── */
function FadeIn({ children, className = "", delay = 0 }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.2 });
    return (_jsx(motion.div, { ref: ref, initial: { opacity: 0, y: 24, filter: "blur(4px)" }, animate: isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}, transition: { duration: 0.6, delay, ease: "easeOut" }, className: className, children: children }));
}
/* ── Shared styles ─────────────────────────────────────────────────── */
const inputCls = "w-full rounded-sm border border-flash/15 bg-black/40 px-3 py-2 text-[12px] text-flash font-mono outline-none focus:border-jade/30 transition-colors";
const selectCls = "w-full rounded-sm border border-flash/15 bg-black/40 px-3 py-2 text-[12px] text-flash font-mono outline-none focus:border-jade/30 cursor-clicker";
/* ── Main page ─────────────────────────────────────────────────────── */
export default function StreamersPage() {
    const { nametag, region: authRegion } = useAuth();
    const overlayPath = (() => {
        if (nametag && authRegion) {
            const [name, tag] = nametag.split("#");
            if (name && tag)
                return `/overlay/${authRegion.toLowerCase()}/${name.replace(/\s+/g, "+")}-${tag}`;
        }
        return "/overlay/euw/LR+NEMESIS-LRAT";
    })();
    const [applyOpen, setApplyOpen] = useState(false);
    const [applyForm, setApplyForm] = useState({ twitch: "", lol_account: "", region: "EUW", avg_viewers: "" });
    const [applyBusy, setApplyBusy] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    function closeApply() {
        setApplyOpen(false);
        setSendSuccess(false);
        setApplyForm({ twitch: "", lol_account: "", region: "EUW", avg_viewers: "" });
    }
    async function handleApply() {
        if (!applyForm.twitch.trim() || !applyForm.lol_account.trim()) {
            showCyberToast({ title: "Please fill in all required fields", variant: "error" });
            return;
        }
        setApplyBusy(true);
        const { error } = await supabase.from("streamer_applications").insert({
            twitch_username: applyForm.twitch.trim(),
            lol_account: applyForm.lol_account.trim(),
            region: applyForm.region,
            avg_viewers: applyForm.avg_viewers ? parseInt(applyForm.avg_viewers) : null,
        });
        if (error) {
            setApplyBusy(false);
            showCyberToast({ title: "Failed to submit application", variant: "error" });
            return;
        }
        setApplyBusy(false);
        setSendSuccess(true);
        // Auto-close after showing success animation
        setTimeout(() => {
            closeApply();
            showCyberToast({ title: "Application sent!", description: "We'll review and reach out on Twitch within 48h.", tag: "PARTNER" });
        }, 1800);
    }
    return (_jsxs("div", { className: "w-full", children: [_jsxs("section", { className: "relative flex flex-col items-center justify-center text-center pt-20 pb-10", children: [_jsx("div", { className: "fixed inset-0 pointer-events-none z-0", style: { background: "radial-gradient(ellipse 40% 35% at 50% 15%, rgba(0,217,146,0.09), transparent)" } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[1] -mx-[50vw] left-1/2 right-1/2 w-screen", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)" } }), _jsxs("div", { className: "relative z-10 flex flex-col items-center gap-5 max-w-2xl px-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] uppercase text-jade/50", children: [_jsx("span", { className: "text-jade/30", children: "\u25C8" }), " Streaming Partners Program ", _jsx("span", { className: "text-jade/30", children: "\u25C8" })] }), _jsx(TypingOnInView, { text: "Stream with loldata", speed: 60, className: "text-4xl md:text-5xl font-bold font-orbitron text-flash tracking-wider uppercase whitespace-nowrap" }), _jsx("p", { className: "text-flash/50 text-sm md:text-base font-mono leading-relaxed max-w-lg", children: "Get featured on the homepage, unlock your custom overlay, earn with your personal promo code, and stand out with the exclusive streamer badge." }), _jsxs("button", { type: "button", onClick: () => setApplyOpen(true), className: "mt-4 group flex items-center gap-2 px-6 py-2.5 rounded-sm border border-jade/40 text-jade hover:bg-jade/10 font-mono text-[12px] tracking-[0.15em] uppercase cursor-clicker transition-all hover:shadow-[0_0_20px_rgba(0,217,146,0.15)]", children: ["Become a Partner", _jsx(ChevronRight, { className: "w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" })] })] })] }), _jsxs("section", { className: "pt-6 pb-16", children: [_jsxs(FadeIn, { className: "text-center mb-10", children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2", children: ":: WHY PARTNER ::" }), _jsx("h2", { className: "text-2xl font-bold font-mono text-flash", children: "What you get" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-5", children: [
                            {
                                inner: _jsx("span", { className: "text-[11px]", children: "\u25C8" }),
                                title: "Get Featured",
                                desc: "Your stream appears on the loldata homepage carousel while you're live. Thousands of players will discover your channel every day.",
                            },
                            {
                                inner: _jsx("span", { className: "text-[8px] font-orbitron font-black tracking-wider", children: "STR" }),
                                title: "Streamer Badge",
                                desc: "The exclusive STR badge appears next to your name on every match page and summoner profile across the entire platform.",
                            },
                            {
                                inner: _jsx("span", { className: "text-[11px]", children: "\u25C7" }),
                                title: "Earn with Promo Codes",
                                desc: "Each partner gets a personal code (e.g. COZZOCC26). Your viewers get a discount, and you earn a percentage of every subscription.",
                            },
                        ].map((perk, i) => (_jsx(FadeIn, { delay: i * 0.15, children: _jsx("div", { className: cn(glassDark, "h-full"), children: _jsxs("div", { className: "relative z-10 p-6", children: [_jsxs("div", { className: "relative w-9 h-9 mb-4", children: [_jsx("span", { className: "absolute inset-0 rotate-45 rounded-[4px] border border-jade/40 bg-jade/10 shadow-[0_0_8px_rgba(0,217,146,0.15)]" }), _jsx("span", { className: "absolute inset-0 flex items-center justify-center text-jade", children: perk.inner })] }), _jsx("h3", { className: "text-[13px] font-mono font-bold text-flash tracking-wide uppercase mb-2", children: perk.title }), _jsx("p", { className: "text-[12px] font-mono text-flash/45 leading-relaxed", children: perk.desc })] }) }) }, perk.title))) })] }), _jsxs("section", { className: "py-16", children: [_jsxs(FadeIn, { children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2", children: ":: SET UP IN 30 SECONDS ::" }), _jsx("h2", { className: "text-2xl font-bold font-mono text-flash mb-3", children: "The !loldata command" }), _jsx("p", { className: "text-[12px] font-mono text-flash/45 leading-relaxed max-w-xl mb-6", children: "Add this command to your Twitch chat so your viewers can discover loldata and use your personal promo code." })] }), _jsx(FadeIn, { delay: 0.2, children: _jsx(CopyBox, { text: '!addcom !loldata Discover the best League analytics platform \u2014 loldata.cc \u2014 Use code YOURCODE for a discount!', note: "Works with Nightbot, StreamElements, and Fossabot. Replace YOURCODE with your personal promo code." }) })] }), _jsxs("section", { className: "py-16", children: [_jsxs(FadeIn, { children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2", children: ":: THE STREAMING OVERLAY ::" }), _jsx("h2", { className: "text-2xl font-bold font-mono text-flash mb-8", children: "Live stats on your stream" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 items-center", children: [_jsx(FadeIn, { delay: 0.1, children: _jsx("div", { className: "space-y-4", children: [
                                        { sym: "LP", title: "Auto-updating rank & LP", desc: "Your current rank, LP, and rank icon update in real-time as you play." },
                                        { sym: "10", title: "Session stats & last 10 games", desc: "Shows your session W/L, winrate, LP delta, and your last 10 games as champion icons with win/loss indicators." },
                                        { sym: "◆", title: "Transparent & plug-and-play", desc: "Fully transparent background — just add as a Browser Source in OBS. Auto-rotates between 3 panels every 6 seconds." },
                                    ].map((f) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-7 h-7 rounded-md bg-jade/10 border border-jade/20 flex items-center justify-center shrink-0 mt-0.5", children: _jsx("span", { className: "text-jade font-orbitron text-[9px] font-bold", children: f.sym }) }), _jsxs("div", { children: [_jsx("h4", { className: "text-[12px] font-mono font-bold text-flash uppercase mb-1", children: f.title }), _jsx("p", { className: "text-[11px] font-mono text-flash/40 leading-relaxed", children: f.desc })] })] }, f.title))) }) }), _jsx(FadeIn, { delay: 0.25, children: _jsx("div", { className: "flex items-center justify-center", style: { height: 200 }, children: _jsx("iframe", { src: overlayPath, width: "460", height: "200", className: "border-0 pointer-events-none", style: { background: "transparent" }, title: "Overlay preview" }) }) })] }), _jsxs(FadeIn, { delay: 0.3, className: "mt-6", children: [_jsx("p", { className: "text-[11px] font-mono text-flash/40 mb-2", children: "Add this URL as a Browser Source in OBS (width: 460px):" }), _jsx(CopyBox, { text: "https://loldata.cc/overlay/{region}/{name}-{tag}", note: "Replace {region}, {name}, and {tag} with your info. Example: /overlay/euw/Faker-KR1" })] })] }), _jsxs("section", { className: "py-16", children: [_jsxs(FadeIn, { children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2", children: ":: REQUIREMENTS ::" }), _jsx("h2", { className: "text-2xl font-bold font-mono text-flash mb-6", children: "What we ask" })] }), _jsx(FadeIn, { delay: 0.15, children: _jsx("div", { className: cn(glassDark), children: _jsx("div", { className: "relative z-10 p-6 space-y-4", children: [
                                    "Average 10+ concurrent viewers on your streams",
                                    "An active League of Legends account",
                                    "The !loldata command added to your Twitch chat",
                                ].map((req, i) => (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-5 h-5 rounded-full bg-jade/15 border border-jade/25 flex items-center justify-center shrink-0", children: _jsx(Check, { className: "w-3 h-3 text-jade" }) }), _jsx("span", { className: "text-[12px] font-mono text-flash/60", children: req })] }, i))) }) }) })] }), _jsx("section", { className: "py-20 flex flex-col items-center text-center", children: _jsxs(FadeIn, { className: "flex flex-col items-center gap-5", children: [_jsx("h2", { className: "text-3xl font-bold font-mono text-flash", children: "Ready to partner?" }), _jsx("p", { className: "text-[12px] font-mono text-flash/40 max-w-md", children: "Fill out a quick application and we'll get back to you within 48 hours on Twitch." }), _jsx("button", { type: "button", onClick: () => setApplyOpen(true), className: "mt-2 px-8 py-3 rounded-sm font-mono text-[13px] tracking-[0.15em] uppercase cursor-clicker transition-all border border-jade/50 text-jade hover:bg-jade/10 hover:shadow-[0_0_25px_rgba(0,217,146,0.2)]", children: "Apply Now" })] }) }), _jsx(AnimatePresence, { children: applyOpen && (_jsxs(_Fragment, { children: [_jsx(motion.div, { className: "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3 }, onClick: () => !applyBusy && !sendSuccess && closeApply() }), _jsx("div", { className: "fixed inset-0 z-[101] flex items-center justify-center pointer-events-none", children: _jsx(motion.div, { className: "pointer-events-auto w-full max-w-md mx-4", initial: { scaleY: 0, opacity: 0 }, animate: { scaleY: 1, opacity: 1 }, exit: { scaleY: 0, opacity: 0 }, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }, style: { originY: 0.5 }, children: _jsxs("div", { className: "relative bg-liquirice/95 border border-jade/20 rounded-[2px] backdrop-blur-xl overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.015) 3px, rgba(0,217,146,0.015) 4px)" } }), _jsx(motion.div, { className: "absolute top-0 left-0 right-0 h-[1px]", initial: { scaleX: 0 }, animate: { scaleX: 1 }, transition: { duration: 0.5, delay: 0.2 }, style: { background: "linear-gradient(90deg, transparent, #00d992, transparent)" } }), _jsx(motion.div, { className: "absolute bottom-0 left-0 right-0 h-[1px]", initial: { scaleX: 0 }, animate: { scaleX: 1 }, transition: { duration: 0.5, delay: 0.25 }, style: { background: "linear-gradient(90deg, transparent, #00d992, transparent)" } }), _jsx(motion.div, { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/50", initial: { scaleY: 0 }, animate: { scaleY: 1 }, transition: { duration: 0.4, delay: 0.15 } }), _jsxs("div", { className: "absolute top-0 left-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/40" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/40" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/40" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/40" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/40" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/40" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/40" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/40" })] }), _jsx("div", { className: "relative z-10 px-6 py-5", children: _jsx(AnimatePresence, { mode: "wait", children: sendSuccess ? (
                                                /* ── Success state ── */
                                                _jsxs(motion.div, { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 }, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }, className: "flex flex-col items-center justify-center py-10 gap-4", children: [_jsx(motion.div, { initial: { scale: 0, rotate: -180 }, animate: { scale: 1, rotate: 0 }, transition: { duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }, className: "w-14 h-14 rounded-full border-2 border-jade/60 flex items-center justify-center", style: { boxShadow: "0 0 20px rgba(0,217,146,0.3), 0 0 40px rgba(0,217,146,0.1)" }, children: _jsx(Check, { className: "w-7 h-7 text-jade" }) }), _jsx(motion.p, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.3 }, className: "text-[13px] font-mono text-jade tracking-[0.15em] uppercase", children: "Application Sent" }), _jsx(motion.p, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.5 }, className: "text-[11px] font-mono text-flash/40 text-center", children: "We'll review and reach out on Twitch within 48h." })] }, "success")) : (
                                                /* ── Form state ── */
                                                _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0, y: -20 }, transition: { duration: 0.3 }, children: [_jsxs("div", { className: "flex items-center gap-3 mb-5", children: [_jsx("span", { className: "text-jade/40 font-orbitron text-[10px]", children: "\u25C8" }), _jsx("h2", { className: "text-flash text-[14px] font-mono tracking-[0.2em] uppercase", children: "Become a Partner" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-jade/20 to-transparent" }), _jsx("button", { type: "button", onClick: closeApply, className: "text-flash/30 hover:text-flash/60 transition-colors cursor-clicker text-lg leading-none", children: "\u00D7" })] }), _jsxs(motion.div, { className: "space-y-4", initial: "hidden", animate: "show", variants: { show: { transition: { staggerChildren: 0.06 } } }, children: [[
                                                                    { label: "Twitch Username *", field: "twitch", placeholder: "your_twitch", type: "text" },
                                                                    { label: "LoL Account *", field: "lol_account", placeholder: "Name#TAG", type: "text" },
                                                                ].map((f) => (_jsxs(motion.div, { variants: { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }, children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: f.label }), _jsx("input", { type: f.type, placeholder: f.placeholder, value: applyForm[f.field], onChange: (e) => setApplyForm((prev) => ({ ...prev, [f.field]: e.target.value })), className: inputCls })] }, f.field))), _jsxs(motion.div, { variants: { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }, className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Region" }), _jsxs("select", { value: applyForm.region, onChange: (e) => setApplyForm((f) => ({ ...f, region: e.target.value })), className: selectCls, children: [_jsx("option", { value: "EUW", children: "EUW" }), _jsx("option", { value: "NA", children: "NA" }), _jsx("option", { value: "KR", children: "KR" }), _jsx("option", { value: "BR", children: "BR" }), _jsx("option", { value: "TR", children: "TR" }), _jsx("option", { value: "JP", children: "JP" }), _jsx("option", { value: "OC", children: "OCE" })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Avg. Viewers" }), _jsx("input", { type: "number", placeholder: "e.g. 50", value: applyForm.avg_viewers, onChange: (e) => setApplyForm((f) => ({ ...f, avg_viewers: e.target.value })), className: inputCls })] })] })] }), _jsx("div", { className: "mt-5 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsxs("div", { className: "mt-4 flex justify-between items-center", children: [_jsx("button", { type: "button", onClick: closeApply, className: "px-3 py-1.5 rounded-sm cursor-clicker border border-flash/15 text-flash/50 hover:bg-flash/5 text-[11px] font-mono tracking-[0.1em] uppercase", children: "Cancel" }), _jsxs("button", { type: "button", onClick: handleApply, disabled: applyBusy, className: "group relative px-5 py-1.5 rounded-sm cursor-clicker border border-jade/40 text-jade text-[11px] font-mono tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none overflow-hidden transition-all hover:shadow-[0_0_15px_rgba(0,217,146,0.2)]", children: [_jsx("span", { className: "relative z-10", children: applyBusy ? "Transmitting..." : "Send Application" }), _jsx("span", { className: "absolute inset-0 bg-jade/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" })] })] })] }, "form")) }) })] }) }) })] })) }), _jsx("div", { className: cn("fixed bottom-10 right-10 z-50 transition-all duration-300 ease-in-out", showScrollTop ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-3"), children: _jsx(DiamondButton, { icon: "top", label: "TOP", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }) })] }));
}
