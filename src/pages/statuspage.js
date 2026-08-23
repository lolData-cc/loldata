"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// /status — public system status. Data comes from the box:
//   GET /api/status          → live checks (DB+ingest, CDN, auth, Riot per region)
//   GET /api/status/history  → 24h uptime buckets (60s sweep on the box)
// The page auto-refreshes every 30s and measures the API round-trip from the
// visitor's browser as a bonus "your latency" chip.
import { useEffect, useRef, useState } from "react";
import { BOX_API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
const REFRESH_MS = 30_000;
const HISTORY_REFRESH_MS = 5 * 60_000;
const STRIP_BUCKETS = 48; // 24h at 30min
const glass = "relative overflow-hidden rounded-md bg-filmlight/[0.04] backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(var(--c-shadow),0.45),inset_0_0_0_1px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.07)]";
const STATE_META = {
    2: { label: "Operational", dot: "bg-jade shadow-[0_0_10px_rgba(0,217,146,0.8)]", text: "text-jade" },
    1: { label: "Degraded", dot: "bg-[#FFB615] shadow-[0_0_10px_rgba(255,182,21,0.7)]", text: "text-[#FFB615]" },
    0: { label: "Down", dot: "bg-[#ff6286] shadow-[0_0_10px_rgba(255,98,134,0.7)]", text: "text-[#ff6286]" },
};
const OVERALL_COPY = {
    2: "All systems operational",
    1: "Degraded performance",
    0: "Service disruption",
};
function stateOfBucket(worst) {
    if (worst === undefined)
        return "bg-flash/10"; // no data
    if (worst === 2)
        return "bg-jade/70";
    if (worst === 1)
        return "bg-[#FFB615]/80";
    return "bg-[#ff6286]/80";
}
// 48 half-hour slots ending at the current half-hour, matched against the
// server's date_bin'd buckets (both truncated to :00/:30 boundaries).
function buildStrip(buckets) {
    const byIso = new Map();
    for (const b of buckets ?? [])
        byIso.set(new Date(b.bucket).getTime(), b.worst);
    const slotMs = 30 * 60_000;
    const nowSlot = Math.floor(Date.now() / slotMs) * slotMs;
    return Array.from({ length: STRIP_BUCKETS }, (_, i) => {
        const t = nowSlot - (STRIP_BUCKETS - 1 - i) * slotMs;
        return { t, worst: byIso.get(t) };
    });
}
function timeAgo(iso) {
    if (!iso)
        return "—";
    const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60)
        return `${s}s ago`;
    return `${Math.floor(s / 60)}m ago`;
}
export default function StatusPage() {
    const [status, setStatus] = useState(null);
    const [history, setHistory] = useState(null);
    const [clientLatency, setClientLatency] = useState(null);
    const [error, setError] = useState(false);
    const [, forceTick] = useState(0);
    const mounted = useRef(true);
    useEffect(() => {
        document.title = "System Status - lolData";
        return () => { document.title = "lolData"; };
    }, []);
    useEffect(() => {
        mounted.current = true;
        const loadStatus = async () => {
            const t0 = performance.now();
            try {
                const res = await fetch(`${BOX_API_BASE_URL}/api/status`, { cache: "no-store" });
                if (!res.ok)
                    throw new Error(String(res.status));
                const json = (await res.json());
                if (!mounted.current)
                    return;
                setClientLatency(Math.round(performance.now() - t0));
                setStatus(json);
                setError(false);
            }
            catch {
                if (!mounted.current)
                    return;
                setError(true);
            }
        };
        const loadHistory = async () => {
            try {
                const res = await fetch(`${BOX_API_BASE_URL}/api/status/history`, { cache: "no-store" });
                if (res.ok && mounted.current)
                    setHistory((await res.json()));
            }
            catch { /* strip stays gray */ }
        };
        loadStatus();
        loadHistory();
        const a = setInterval(loadStatus, REFRESH_MS);
        const b = setInterval(loadHistory, HISTORY_REFRESH_MS);
        const c = setInterval(() => forceTick((x) => x + 1), 5_000); // keeps "Xs ago" fresh
        return () => { mounted.current = false; clearInterval(a); clearInterval(b); clearInterval(c); };
    }, []);
    const core = (status?.services ?? []).filter((s) => !s.thirdParty);
    const riot = (status?.services ?? []).filter((s) => s.thirdParty);
    const overall = error ? 0 : status?.overall ?? 2;
    return (_jsxs("div", { className: "min-h-[70vh] w-full pb-20 pt-10", children: [_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4 mb-8", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-[10px] font-mono text-jade/55 tracking-[0.45em] uppercase mb-2.5 flex items-center gap-2", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" }), "SYSTEM STATUS"] }), _jsxs("h1", { className: "font-chakrapetch font-bold uppercase leading-none text-flash/95 text-[36px] md:text-[44px] tracking-[0.04em]", children: ["Sta", _jsx("span", { className: "text-jade", children: "tus" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [clientLatency != null && (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-[3px] bg-filmdark/45 px-2 py-1 font-mono text-[10px] text-flash/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]", children: ["your latency", _jsxs("span", { className: "font-chakrapetch font-bold text-flash/85 tabular-nums", children: [clientLatency, "ms"] })] })), _jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-[3px] bg-filmdark/45 px-2 py-1 font-mono text-[10px] tracking-[0.14em] uppercase text-jade/70 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.20)]", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade animate-pulse" }), "auto-refresh 30s"] })] })] }), _jsx(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }, className: cn(glass, "px-6 py-5 mb-6 border", overall === 2 ? "border-jade/25" : overall === 1 ? "border-[#FFB615]/30" : "border-[#ff6286]/30"), children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-3.5", children: [_jsxs("span", { className: cn("relative flex w-3.5 h-3.5"), children: [_jsx("span", { className: cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", STATE_META[overall].dot) }), _jsx("span", { className: cn("relative inline-flex rounded-full w-3.5 h-3.5", STATE_META[overall].dot) })] }), _jsx("span", { className: "font-chakrapetch font-bold uppercase tracking-[0.06em] text-[20px] md:text-[24px] text-flash/95", children: error ? "Status API unreachable" : OVERALL_COPY[overall] })] }), _jsxs("span", { className: "font-mono text-[11px] text-flash/35", children: ["checked ", timeAgo(status?.checkedAt ?? null)] })] }) }), _jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-3", children: ":: CORE SERVICES ::" }), _jsxs("div", { className: cn(glass, "mb-8"), children: [core.length === 0 && (_jsx("div", { className: "px-5 py-6 font-mono text-[12px] text-flash/40", children: error ? "Cannot reach the status API — the box may be unreachable from your network." : "Loading checks…" })), core.map((s, i) => {
                        const strip = buildStrip(history?.services?.[s.id]);
                        const pct = history?.uptimePct?.[s.id];
                        return (_jsxs("div", { className: cn("px-5 py-4", i > 0 && "border-t border-flash/[0.05]"), children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 mb-2.5", children: [_jsxs("div", { className: "flex items-center gap-2.5 min-w-0", children: [_jsx("span", { className: cn("w-2 h-2 rounded-full shrink-0", STATE_META[s.state].dot) }), _jsx("span", { className: "font-chakrapetch font-semibold text-[14px] text-flash/90", children: s.label }), _jsx("span", { className: cn("font-mono text-[9px] tracking-[0.18em] uppercase px-1.5 py-[2px] rounded-[3px] bg-filmdark/40", STATE_META[s.state].text), children: STATE_META[s.state].label })] }), _jsxs("div", { className: "flex items-center gap-3 font-mono text-[10px] text-flash/35", children: [s.detail && _jsx("span", { className: "truncate max-w-[300px]", children: s.detail }), s.latencyMs != null && s.id !== "api" && (_jsxs("span", { className: "tabular-nums text-flash/55", children: [s.latencyMs, "ms"] }))] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex flex-1 gap-[2px]", children: strip.map((b) => (_jsx("div", { title: `${new Date(b.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} — ${b.worst === undefined ? "no data" : STATE_META[b.worst ?? 2]?.label ?? "?"}`, className: cn("h-6 flex-1 rounded-[1px] transition-colors", stateOfBucket(b.worst)) }, b.t))) }), _jsxs("span", { className: "font-mono text-[10px] text-flash/40 tabular-nums shrink-0", children: ["24h \u00B7 ", pct != null ? `${pct}%` : "—"] })] })] }, s.id));
                    })] }), _jsxs("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-3", children: [":: THIRD PARTY ", _jsx("span", { className: "text-flash/30", children: "\u00B7 NOT COUNTED IN OVERALL" }), " ::"] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4", children: [riot.map((s) => (_jsxs("div", { className: cn(glass, "px-4 py-3.5"), children: [_jsxs("div", { className: "flex items-center justify-between gap-2 mb-1", children: [_jsx("span", { className: "font-chakrapetch font-semibold text-[13px] text-flash/90", children: s.label }), _jsx("span", { className: cn("w-2 h-2 rounded-full", STATE_META[s.state].dot) })] }), _jsxs("div", { className: "flex items-center justify-between font-mono text-[10px] text-flash/40", children: [_jsx("span", { className: "truncate", children: s.detail ?? "—" }), s.latencyMs != null && _jsxs("span", { className: "tabular-nums shrink-0 ml-2", children: [s.latencyMs, "ms"] })] })] }, s.id))), riot.length === 0 && !error && (_jsx("div", { className: cn(glass, "px-4 py-3.5 font-mono text-[11px] text-flash/40 sm:col-span-3"), children: "Loading\u2026" }))] }), _jsxs("p", { className: "mt-8 font-mono text-[10px] text-flash/25 tracking-[0.06em]", children: ["Checks run every 60 seconds from loldata infrastructure. History retention: 92 days. If this page is unreachable, reach us at ", _jsx("a", { href: "https://discord.gg/loldata", className: "text-jade/60 hover:text-jade cursor-clicker", children: "discord.gg/loldata" }), "."] })] }));
}
