import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/overview.tsx — Personal Performance Command Center.
// Homepage language: clean glass panels (bright inset hairline on #040A0C),
// chakrapetch numbers, mono eyebrows, jade/red/citrine states, bento layout.
// Data: /api/learn/overview (period day|week) — aggregates + LP track +
// timeline insights (laning diffs, death clock, objectives) + spotlight.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLearnOverview } from "@/hooks/useLearnOverview";
import { StrengthsWeaknesses } from "@/components/learn/strengths-weaknesses";
import { OverviewSkeleton } from "@/components/learn/overview-skeleton";
import { OrbitEmpty } from "@/components/learn/orbit-empty";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { normalizeChampName, cdnBaseUrl, cdnSplashUrl } from "@/config";
import { getRankImage } from "@/utils/rankIcons";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip as RTooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar, } from "recharts";
const EASE = [0.22, 1, 0.36, 1];
const CITRINE = "#FFB615";
const roleLabel = (r) => ({ TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support" }[r] ?? (r || "—"));
/* ═══════════════════════════ building blocks ═══════════════════════════ */
// THE panel — dark cyber glass. The card separates from the flat #040A0C bg on
// three cues: a lit gradient fill (faint jade sheen top-left → near-black teal),
// a crisp jade outer ring, and a tight jade outer glow. Stays dark, reads clearly.
const glass = "relative overflow-hidden rounded-md backdrop-blur-xl saturate-150 glass-panel " +
    "bg-[linear-gradient(158deg,rgba(0,217,146,0.06)_0%,rgba(6,14,16,0.55)_34%,rgba(2,6,8,0.62)_100%)] " +
    "shadow-[0_16px_40px_-8px_rgba(var(--c-shadow),0.7),0_0_0_1px_rgba(0,217,146,0.30),0_0_22px_-10px_rgba(0,217,146,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]";
function Panel({ title, hint, children, className, delay = 0 }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.45, ease: EASE }, className: cn(glass, "flex flex-col", className), children: [_jsx("span", { className: "pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-jade/40 to-transparent" }), _jsxs("div", { className: "relative z-[1] flex flex-1 flex-col px-4 py-3.5 min-h-0", children: [(title || hint) && (_jsxs("div", { className: "mb-3 flex items-center justify-between gap-3 shrink-0", children: [title && _jsx("p", { className: "font-chakrapetch font-bold text-[12.5px] uppercase tracking-[0.14em] text-flash/90", children: title }), hint && _jsx("span", { className: "shrink-0 font-mono text-[10.5px] tracking-[0.04em] text-flash/45", children: hint })] })), _jsx("div", { className: "flex-1 min-h-0", children: children })] })] }));
}
function Delta({ now, base, invert = false, suffix = "" }) {
    if (base == null || base === 0 || !isFinite(now / base))
        return null;
    const pct = Math.round(((now - base) / Math.abs(base)) * 100);
    if (pct === 0)
        return _jsx("span", { className: "font-mono text-[9px] text-flash/25", children: "= avg" });
    const good = invert ? pct < 0 : pct > 0;
    return (_jsxs("span", { className: cn("font-mono text-[9px] tabular-nums", good ? "text-jade/80" : "text-red-400/70"), children: [pct > 0 ? "▲" : "▼", " ", Math.abs(pct), "%", suffix] }));
}
/* mini sparkline with baseline delta */
function TrendCard({ title, data, dataKey, now, base, delay, format = (v) => String(v) }) {
    const chrono = useMemo(() => [...(data ?? [])].reverse(), [data]);
    return (_jsx(Panel, { delay: delay, className: "min-h-[126px]", children: _jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-mono text-[10px] uppercase tracking-[0.18em] text-flash/45", children: title }), _jsxs("div", { className: "flex items-baseline gap-2 mt-1", children: [_jsx("span", { className: "font-chakrapetch font-bold text-[24px] leading-none text-flash/90 tabular-nums", children: format(now) }), _jsx(Delta, { now: now, base: base })] }), base != null && _jsxs("p", { className: "font-mono text-[9.5px] text-flash/35 mt-0.5", children: ["avg ", format(base)] })] }), _jsx("div", { className: "w-[45%] h-[46px] mt-1", children: chrono.length > 1 && (_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: chrono, margin: { top: 2, right: 0, bottom: 0, left: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: `tf-${title}`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#00d992", stopOpacity: 0.3 }), _jsx("stop", { offset: "100%", stopColor: "#00d992", stopOpacity: 0 })] }) }), _jsx(YAxis, { hide: true, domain: ["dataMin", "dataMax"] }), _jsx(Area, { type: "monotone", dataKey: dataKey, stroke: "#00d992", strokeWidth: 1.5, fill: `url(#tf-${title})`, dot: false, isAnimationActive: false })] }) })) })] }) }));
}
/* ═══════════════════════════ hero ═══════════════════════════ */
function PeriodToggle({ period, onChange }) {
    return (_jsx("div", { className: "relative flex rounded-[4px] bg-black/50 backdrop-blur-md p-0.5 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.10)]", children: ["day", "week"].map((p) => (_jsxs("button", { onClick: () => onChange(p), className: cn("relative z-10 px-4 py-1.5 text-[9px] font-mono tracking-[0.18em] uppercase transition-colors duration-200 rounded-[3px] cursor-clicker", period === p ? "text-jade" : "text-flash/30 hover:text-flash/55"), children: [period === p && _jsx(motion.div, { layoutId: "learn-period-pill", className: "absolute inset-0 rounded-[3px] bg-jade/10 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.35),0_0_14px_rgba(0,217,146,0.12)]", transition: { type: "spring", stiffness: 400, damping: 30 } }), _jsx("span", { className: "relative z-10", children: p === "day" ? "Today" : "This Week" })] }, p))) }));
}
function HeroNumber({ label, value, sub, color, delay }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.45, ease: EASE }, className: "min-w-0", children: [_jsx("p", { className: "font-mono text-[10px] uppercase tracking-[0.28em] text-flash/40 mb-1.5", children: label }), _jsx("div", { className: cn("font-chakrapetch font-bold text-[34px] md:text-[40px] leading-none tabular-nums", color ?? "text-flash/90"), children: value }), sub && _jsx("div", { className: "font-mono text-[10px] text-flash/30 mt-1.5", children: sub })] }));
}
function ImpactRadial({ value, delay }) {
    const stroke = value >= 70 ? "#00d992" : value >= 50 ? CITRINE : "#f87171";
    const size = 92, r = size / 2 - 7, circ = 2 * Math.PI * r;
    return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { delay, duration: 0.5, ease: EASE }, className: "relative shrink-0 flex items-center justify-center", style: { width: size, height: size }, children: [_jsxs("svg", { width: size, height: size, className: "absolute inset-0 -rotate-90", children: [_jsx("circle", { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: "rgba(255,255,255,0.05)", strokeWidth: "3.5" }), _jsx(motion.circle, { cx: size / 2, cy: size / 2, r: r, fill: "none", stroke: stroke, strokeWidth: "3.5", strokeLinecap: "round", initial: { strokeDasharray: `0 ${circ}` }, animate: { strokeDasharray: `${(value / 100) * circ} ${circ}` }, transition: { duration: 1.1, ease: "easeOut", delay: delay + 0.2 }, style: { filter: `drop-shadow(0 0 8px ${stroke}50)` } })] }), _jsxs("div", { className: "flex flex-col items-center leading-none", children: [_jsx("span", { className: "font-chakrapetch font-bold text-[26px] tabular-nums", style: { color: stroke }, children: value }), _jsx("span", { className: "font-mono text-[9px] tracking-[0.2em] uppercase text-flash/40 mt-1", children: "impact" })] })] }));
}
/* ── rank progress: period START elo → arrow → CURRENT elo ──────────────
   The backend anchors the LP curve to the player's real current rank and
   reconstructs the period's movement, so points[0].lp is the START cumulative
   score. We invert it (same TIER_BASE/DIV_OFFSET tables as the backend) to a
   tier/division and render it like the summoner-page rank block. */
const INV_TIERS = [
    ["IRON", 0], ["BRONZE", 400], ["SILVER", 800], ["GOLD", 1200],
    ["PLATINUM", 1600], ["EMERALD", 2000], ["DIAMOND", 2400], ["MASTER", 2800],
];
const INV_DIVS = ["IV", "III", "II", "I"];
function scoreToRank(score, apexTier = "MASTER") {
    const s = Math.max(0, Math.round(score));
    if (s >= 2800)
        return { tier: apexTier, division: null, lp: s - 2800 }; // apex = continuous LP
    let tier = "IRON", base = 0;
    for (const [t, b] of INV_TIERS)
        if (s >= b) {
            tier = t;
            base = b;
        }
    const off = s - base;
    return { tier, division: INV_DIVS[Math.min(3, Math.floor(off / 100))], lp: off % 100 };
}
const titleCase = (t) => t.charAt(0) + t.slice(1).toLowerCase();
function Emblem({ tier, dim }) {
    return (_jsxs("div", { className: cn("relative w-[74px] h-[74px] mx-auto flex items-center justify-center", dim && "opacity-70"), children: [_jsx("div", { className: "absolute w-[52px] h-[52px] bg-filmdark/40 rounded-full border border-flash/[0.08] shadow-[inset_0_0_12px_rgba(var(--c-shadow),0.5)]" }), _jsx("img", { src: getRankImage(tier), alt: "", className: "w-[74px] h-[74px] relative z-10", draggable: false, onError: (e) => { e.currentTarget.src = "/img/unranked.png"; } })] }));
}
function RankText({ tier, division, lp, dim }) {
    return (_jsxs("div", { className: cn("text-center leading-tight", dim && "opacity-70"), children: [_jsxs("div", { className: "font-mono text-[11px] text-flash/65 tracking-wide", children: [titleCase(tier), division ? ` ${division}` : ""] }), _jsxs("div", { className: "font-chakrapetch font-bold text-[16px] text-flash/90 tabular-nums leading-none mt-0.5", children: [lp, _jsx("span", { className: "text-[10px] text-flash/45 ml-0.5", children: "LP" })] })] }));
}
// cyber connector: diamond origin node → segmented energy line with a
// traveling pulse → double-chevron glowing arrowhead
function CyberArrow({ color }) {
    return (_jsxs("svg", { width: "84", height: "20", viewBox: "0 0 84 20", className: "overflow-visible mx-auto", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "ca-line", x1: "0", x2: "1", children: [_jsx("stop", { offset: "0", stopColor: color, stopOpacity: "0.08" }), _jsx("stop", { offset: "1", stopColor: color, stopOpacity: "0.85" })] }) }), _jsx("rect", { x: "1.5", y: "7.5", width: "5", height: "5", fill: color, fillOpacity: "0.75", transform: "rotate(45 4 10)", style: { filter: `drop-shadow(0 0 3px ${color}88)` } }), _jsx("line", { x1: "10", y1: "10", x2: "62", y2: "10", stroke: "url(#ca-line)", strokeWidth: "1.6", strokeDasharray: "2 3" }), _jsx(motion.circle, { cy: "10", r: "2.6", fill: color, style: { filter: `drop-shadow(0 0 6px ${color})` }, initial: { cx: 10, opacity: 0 }, animate: { cx: [10, 62], opacity: [0, 1, 1, 0] }, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 } }), _jsx("path", { d: "M60 3.5 L69 10 L60 16.5", fill: "none", stroke: color, strokeWidth: "2.4", strokeLinecap: "round", strokeLinejoin: "round", style: { filter: `drop-shadow(0 0 4px ${color}99)` } }), _jsx("path", { d: "M67.5 4.5 L75 10 L67.5 15.5", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", strokeOpacity: "0.55" })] }));
}
function RankProgress({ lp }) {
    if (!lp?.current || !lp.points?.length)
        return null; // needs a real rank anchor
    const start = scoreToRank(lp.points[0].lp, lp.current.tier);
    const end = { tier: lp.current.tier, division: (lp.current.division ?? null), lp: lp.current.lp };
    const net = lp.netLp ?? 0;
    const up = net >= 0;
    const color = up ? "#00d992" : "#f87171";
    const eyebrow = "font-mono text-[9px] tracking-[0.28em] uppercase text-flash/30 text-center";
    return (_jsxs(motion.div, { initial: { opacity: 0, x: 12 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.16, duration: 0.45, ease: EASE }, className: "grid grid-cols-[auto_92px_auto] items-center gap-x-1.5", children: [_jsx("span", { className: eyebrow, children: "Start" }), _jsx("span", {}), _jsx("span", { className: eyebrow, children: "Now" }), _jsx(Emblem, { tier: start.tier, dim: true }), _jsx("div", { className: "flex items-center justify-center", children: _jsxs("div", { className: "relative", children: [_jsxs("span", { className: "absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap font-chakrapetch font-bold text-[16px] tabular-nums leading-none", style: { color, textShadow: `0 0 12px ${color}66` }, children: [up ? "+" : "", net] }), _jsx(CyberArrow, { color: color })] }) }), _jsx(Emblem, { tier: end.tier }), _jsx(RankText, { ...start, dim: true }), _jsx("span", { className: "text-center font-mono text-[9px] tracking-[0.15em] uppercase text-flash/25", children: "net \u00B7 est" }), _jsx(RankText, { ...end })] }));
}
/* ═══════════════════════════ session ribbon ═══════════════════════════ */
function SessionRibbon({ games, selectableIds, selectedId, onSelect }) {
    // hide remakes (early-surrender games < 5 min) from the ribbon
    const chrono = useMemo(() => [...(games ?? [])].reverse().filter((g) => (g.durationMin ?? 99) >= 5), [games]);
    const scrollRef = useRef(null);
    const drag = useRef({ down: false, moved: false, startX: 0, startLeft: 0 });
    // mouse wheel → horizontal scroll, and click-and-drag to pan the row
    useEffect(() => {
        const el = scrollRef.current;
        if (!el)
            return;
        const onWheel = (e) => {
            if (el.scrollWidth <= el.clientWidth)
                return;
            if (Math.abs(e.deltaY) <= Math.abs(e.deltaX))
                return;
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        const onDown = (e) => {
            if (e.pointerType !== "mouse")
                return; // touch/pen use native scroll
            drag.current = { down: true, moved: false, startX: e.clientX, startLeft: el.scrollLeft };
        };
        const onMove = (e) => {
            if (!drag.current.down)
                return;
            const dx = e.clientX - drag.current.startX;
            if (Math.abs(dx) > 4) {
                drag.current.moved = true;
                el.style.cursor = "grabbing";
                el.scrollLeft = drag.current.startLeft - dx;
            }
        };
        const onUp = () => {
            if (!drag.current.down)
                return;
            drag.current.down = false;
            el.style.cursor = "";
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("pointerdown", onDown);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return () => {
            el.removeEventListener("wheel", onWheel);
            el.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
    }, [chrono.length]);
    if (!chrono.length)
        return null;
    const kf = (n) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(n ?? 0)));
    return (_jsx("div", { ref: scrollRef, className: "flex items-stretch gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 cursor-grab select-none", children: chrono.map((g, i) => {
            const canPick = !!g.matchId && selectableIds.has(g.matchId);
            const isSel = canPick && g.matchId === selectedId;
            const perfect = g.deaths === 0;
            const kda = perfect ? g.kills + g.assists : (g.kills + g.assists) / g.deaths;
            const tone = g.impact >= 70 ? "jade" : g.impact >= 50 ? "citrine" : "red";
            const toneText = tone === "jade" ? "text-jade" : tone === "citrine" ? "text-[#FFB615]" : "text-red-400";
            const toneBar = tone === "jade" ? "bg-jade" : tone === "citrine" ? "bg-[#FFB615]" : "bg-red-400/80";
            // result pill — MVP (best on winning team) / ACE (best on losing team) outrank plain WIN/LOSS
            const badge = g.mvp
                ? { txt: "MVP", cls: "bg-[#FFB615]/20 text-[#FFB615] shadow-[inset_0_0_0_1px_rgba(255,182,21,0.55),0_0_10px_-3px_rgba(255,182,21,0.7)]" }
                : g.ace
                    ? { txt: "ACE", cls: "bg-flash/15 text-flash/90 shadow-[inset_0_0_0_1px_rgba(215,216,217,0.40)]" }
                    : g.win
                        ? { txt: "WIN", cls: "bg-jade/15 text-jade shadow-[inset_0_0_0_1px_rgba(0,217,146,0.45)]" }
                        : { txt: "LOSS", cls: "bg-red-400/15 text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.45)]" };
            return (_jsxs(motion.button, { type: "button", onClick: canPick ? () => { if (drag.current.moved)
                    return; onSelect(g.matchId); } : undefined, initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 + i * 0.03, duration: 0.4, ease: EASE }, className: cn("group relative shrink-0 w-[128px] rounded-[11px] overflow-hidden flex flex-col text-center transition-all duration-200", "bg-gradient-to-b from-filmlight/[0.05] via-filmdark/25 to-filmdark/45 backdrop-blur-sm", isSel
                    ? "shadow-[inset_0_0_0_1.5px_rgba(0,217,146,0.7),0_10px_26px_-8px_rgba(0,217,146,0.4)] -translate-y-0.5"
                    : g.win
                        ? "shadow-[inset_0_0_0_1px_rgba(0,217,146,0.18),0_5px_16px_-10px_rgba(0,0,0,0.7)]"
                        : "shadow-[inset_0_0_0_1px_rgba(248,113,113,0.16),0_5px_16px_-10px_rgba(0,0,0,0.7)]", canPick ? "cursor-clicker hover:-translate-y-0.5" : "cursor-default opacity-60", canPick && !isSel && (g.win
                    ? "hover:shadow-[inset_0_0_0_1px_rgba(0,217,146,0.42),0_12px_26px_-10px_rgba(0,217,146,0.3)]"
                    : "hover:shadow-[inset_0_0_0_1px_rgba(248,113,113,0.36),0_12px_26px_-10px_rgba(0,0,0,0.6)]")), title: `${g.mvp ? "MVP · " : g.ace ? "ACE · " : ""}${g.champion} · ${g.kills}/${g.deaths}/${g.assists} · IMPACT ${g.impact} · ${g.durationMin}m${canPick ? " · click to break down" : ""}`, children: [_jsx("div", { className: cn("h-[3px] w-full shrink-0", g.win
                            ? "bg-gradient-to-r from-transparent via-jade/70 to-transparent"
                            : "bg-gradient-to-r from-transparent via-red-400/60 to-transparent") }), _jsxs("div", { className: "px-2.5 pt-2 pb-2 flex flex-col items-center gap-1.5", children: [_jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsxs("span", { className: "font-mono text-[8px] tracking-[0.16em] text-flash/30", children: ["G", chrono.length - i] }), _jsx("span", { className: cn("px-1.5 rounded-full font-mono text-[8px] font-bold tracking-[0.12em] leading-[14px]", badge.cls), children: badge.txt })] }), _jsxs("div", { className: "relative mt-0.5", children: [_jsx("div", { className: cn("absolute -inset-1 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity", g.win ? "bg-jade/40" : "bg-red-400/30") }), _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(g.champion)}.png`, alt: "", draggable: false, className: cn("relative w-[52px] h-[52px] rounded-full object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] ring-2", g.win ? "ring-jade/55" : "ring-red-400/45"), onError: (e) => { e.currentTarget.style.display = "none"; } })] }), _jsxs("div", { className: "flex flex-col items-center gap-0.5 leading-none", children: [_jsx("span", { className: "font-chakrapetch font-bold text-[11.5px] text-flash/90 truncate max-w-[108px]", children: g.champion }), g.role && _jsx("span", { className: "font-mono text-[7.5px] tracking-[0.2em] uppercase text-flash/30", children: roleLabel(g.role) })] }), _jsxs("div", { className: "flex flex-col items-center leading-none mt-0.5", children: [_jsx("span", { className: cn("font-chakrapetch font-bold text-[27px] tabular-nums", toneText), children: g.impact }), _jsx("span", { className: "font-mono text-[7px] tracking-[0.24em] uppercase text-flash/30 mt-0.5", children: "Impact" })] }), _jsxs("div", { className: "flex flex-col items-center gap-0.5 leading-none mt-0.5", children: [_jsxs("span", { className: "font-chakrapetch text-[12.5px] tabular-nums text-flash/85", children: [g.kills, _jsx("span", { className: "text-flash/25", children: "/" }), _jsx("span", { className: "text-red-400/80", children: g.deaths }), _jsx("span", { className: "text-flash/25", children: "/" }), g.assists] }), _jsx("span", { className: cn("font-mono text-[8px] tabular-nums", perfect ? "text-jade" : kda >= 3 ? "text-flash/50" : "text-flash/35"), children: perfect ? "Perfect" : `${kda.toFixed(1)} KDA` })] }), _jsx("div", { className: "grid grid-cols-2 w-full mt-1 pt-1.5 border-t border-flash/[0.06] divide-x divide-flash/[0.06]", children: [{ l: "CS/M", v: g.cspm ?? 0 }, { l: "DMG", v: kf(g.damage ?? 0) }].map((s) => (_jsxs("div", { className: "flex flex-col items-center gap-0.5 leading-none", children: [_jsx("span", { className: "font-chakrapetch font-semibold text-[11px] tabular-nums text-flash/75", children: s.v }), _jsx("span", { className: "font-mono text-[6.5px] tracking-[0.16em] uppercase text-flash/30", children: s.l })] }, s.l))) })] }), _jsx("div", { className: "mt-auto h-[3px] w-full bg-filmdark/50 overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${g.impact}%` }, transition: { delay: 0.3 + i * 0.03, duration: 0.5, ease: EASE }, className: cn("h-full", toneBar) }) })] }, i));
        }) }));
}
/* ═══════════════════════════ LP track ═══════════════════════════ */
function LpTrackChart({ lp }) {
    const data = useMemo(() => (lp?.points ?? []).map((p) => ({ i: p.i, lp: p.lp, win: p.win, champion: p.champion })), [lp]);
    if (data.length < 2)
        return _jsx("p", { className: "font-mono text-[10px] text-flash/25", children: "Not enough games for a trajectory." });
    const up = (lp.netLp ?? 0) >= 0;
    const color = up ? "#00d992" : "#f87171";
    return (_jsxs("div", { className: "h-full flex flex-col", children: [_jsxs("div", { className: "flex items-start justify-between mb-1", children: [_jsx("div", { children: lp.current
                            ? _jsx("span", { className: "font-chakrapetch font-bold text-[15px] text-flash/90", children: lp.current.label })
                            : _jsx("span", { className: "font-mono text-[10px] text-flash/30", children: "unranked / placement" }) }), _jsxs("div", { className: "text-right leading-none", children: [_jsxs("span", { className: cn("font-chakrapetch font-bold text-[26px] tabular-nums", up ? "text-jade" : "text-red-400"), children: [up ? "+" : "", lp.netLp] }), _jsx("span", { className: "font-mono text-[9px] text-flash/30 ml-1", children: "LP" }), _jsx("p", { className: "font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/35 mt-1", children: "net \u00B7 estimated" })] })] }), _jsx("div", { className: "flex-1 min-h-[120px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: data, margin: { top: 8, right: 6, bottom: 0, left: 6 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "lpFill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: color, stopOpacity: 0.30 }), _jsx("stop", { offset: "100%", stopColor: color, stopOpacity: 0.02 })] }) }), _jsx(XAxis, { dataKey: "i", hide: true }), _jsx(YAxis, { hide: true, domain: ["dataMin - 12", "dataMax + 12"] }), _jsx(RTooltip, { cursor: { stroke: "rgba(255,255,255,0.1)" }, contentStyle: { background: "rgba(4,10,12,0.96)", border: "1px solid rgba(0,217,146,0.18)", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }, labelStyle: { display: "none" }, formatter: (v, _n, entry) => [`${v} LP${entry?.payload?.champion ? " · " + entry.payload.champion : ""}`, ""] }), _jsx(Area, { type: "monotone", dataKey: "lp", stroke: color, strokeWidth: 2, fill: "url(#lpFill)", dot: (props) => {
                                    const p = data[props.index];
                                    if (props.index === 0)
                                        return _jsx("g", {}, props.index);
                                    return _jsx("circle", { cx: props.cx, cy: props.cy, r: 3, fill: p?.win ? "#00d992" : "#f87171", stroke: "#040A0C", strokeWidth: 1.5 }, props.index);
                                } })] }) }) })] }));
}
/* ═══════════════════════════ radar vs baseline ═══════════════════════════ */
function FormRadar({ t, b }) {
    const data = useMemo(() => {
        if (!b)
            return [];
        const pct = (now, base) => (base > 0 ? Math.max(20, Math.min(180, (now / base) * 100)) : 100);
        return [
            { k: "KDA", v: pct(t.avgKDA, b.avgKDA) },
            { k: "CS/M", v: pct(t.avgCSPM, b.avgCSPM) },
            { k: "VISION", v: pct(t.avgVision, b.avgVision) },
            { k: "KP", v: pct(t.avgKP ?? t.killParticipation, b.avgKP) },
            { k: "DMG", v: pct(t.avgDmgShare ?? t.avgDamageShare, b.avgDmgShare) },
        ];
    }, [t, b]);
    if (!data.length)
        return _jsx("p", { className: "font-mono text-[10px] text-flash/25", children: "Play more games to unlock the form radar." });
    return (_jsxs("div", { className: "h-full min-h-[200px] relative", children: [_jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(RadarChart, { data: data, margin: { top: 22, right: 40, bottom: 24, left: 40 }, children: [_jsx(PolarGrid, { stroke: "rgba(255,255,255,0.07)" }), _jsx(PolarAngleAxis, { dataKey: "k", tick: { fill: "rgba(215,216,217,0.5)", fontSize: 10, fontFamily: "monospace" } }), _jsx(Radar, { dataKey: () => 100, stroke: "rgba(215,216,217,0.22)", fill: "none", strokeDasharray: "3 3", isAnimationActive: false }), _jsx(Radar, { dataKey: "v", stroke: "#00d992", fill: "#00d992", fillOpacity: 0.18, strokeWidth: 1.5 })] }) }), _jsx("span", { className: "absolute bottom-0.5 right-1 font-mono text-[9.5px] text-flash/35", children: "dashed = your average" })] }));
}
/* ═══════════════════════════ spotlight ═══════════════════════════ */
function gradientOffset(data) {
    const max = Math.max(...data.map((d) => d.diff), 0);
    const min = Math.min(...data.map((d) => d.diff), 0);
    if (max <= 0)
        return 0;
    if (min >= 0)
        return 1;
    return max / (max - min);
}
function SpotlightPanel({ s, delay }) {
    if (!s)
        return (_jsx(Panel, { title: "Game of the period", delay: delay, className: "min-h-[220px]", children: _jsx("p", { className: "font-mono text-[10px] text-flash/25", children: "No timeline data yet for this period." }) }));
    const off = gradientOffset(s.goldCurve);
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.45, ease: EASE }, className: cn(glass, "flex flex-col"), children: [_jsxs("div", { className: "relative h-[96px] overflow-hidden shrink-0", children: [_jsx("img", { src: cdnSplashUrl(normalizeChampName(s.champion)), alt: "", className: "absolute inset-0 w-full h-full object-cover object-[center_20%] opacity-45", onError: (e) => { e.currentTarget.style.display = "none"; } }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-[#040A0C] via-[#040A0C]/55 to-transparent" }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-[#040A0C] to-transparent" }), _jsxs("div", { className: "relative z-10 flex items-center gap-3 h-full px-4", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(s.champion)}.png`, alt: "", className: "w-11 h-11 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]", onError: (e) => { e.currentTarget.style.display = "none"; } }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: cn("font-mono text-[9px] font-bold tracking-[0.16em] px-1.5 py-[2px] rounded-[3px]", s.win ? "bg-jade/15 text-jade" : "bg-red-400/15 text-red-400"), children: s.tag }), _jsx("span", { className: "font-mono text-[10px] text-flash/40 uppercase tracking-wider", children: roleLabel(s.role) })] }), _jsx("div", { className: "font-chakrapetch font-bold text-[17px] text-flash/95 leading-tight mt-0.5", children: s.champion })] }), _jsxs("div", { className: "ml-auto text-right shrink-0", children: [_jsxs("div", { className: "font-chakrapetch font-bold text-[17px] tabular-nums text-flash/90", children: [s.kills, _jsx("span", { className: "text-flash/25", children: "/" }), _jsx("span", { className: "text-red-400/70", children: s.deaths }), _jsx("span", { className: "text-flash/25", children: "/" }), s.assists] }), _jsxs("div", { className: "font-mono text-[9.5px] text-flash/40 tracking-[0.14em] uppercase mt-0.5", children: ["impact ", s.impact] })] })] })] }), _jsxs("div", { className: "relative z-[1] px-4 pt-2.5 pb-4 flex-1 flex flex-col", children: [_jsx("p", { className: cn("font-mono text-[11px] leading-relaxed mb-2.5", s.win ? "text-jade/75" : "text-red-400/75"), children: s.verdict }), _jsx("div", { className: "h-[108px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: s.goldCurve, margin: { top: 6, right: 8, bottom: 2, left: 8 }, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "goldSplit", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: off, stopColor: "#00d992", stopOpacity: 0.9 }), _jsx("stop", { offset: off, stopColor: "#f87171", stopOpacity: 0.9 })] }), _jsxs("linearGradient", { id: "goldFill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: 0, stopColor: "#00d992", stopOpacity: 0.25 }), _jsx("stop", { offset: off, stopColor: "#00d992", stopOpacity: 0.02 }), _jsx("stop", { offset: off, stopColor: "#f87171", stopOpacity: 0.02 }), _jsx("stop", { offset: 1, stopColor: "#f87171", stopOpacity: 0.25 })] })] }), _jsx(XAxis, { dataKey: "min", tick: { fill: "rgba(255,255,255,0.32)", fontSize: 10, fontFamily: "monospace" }, tickLine: false, axisLine: false, tickFormatter: (v) => `${v}'`, interval: 4 }), _jsx(YAxis, { hide: true }), _jsx(ReferenceLine, { y: 0, stroke: "rgba(255,255,255,0.12)", strokeDasharray: "2 2" }), _jsx(RTooltip, { cursor: { stroke: "rgba(255,255,255,0.1)" }, contentStyle: { background: "rgba(4,10,12,0.96)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }, formatter: (v) => [`${v > 0 ? "+" : ""}${Number(v).toLocaleString()}g`, "vs lane"], labelFormatter: (l) => `min ${l}` }), _jsx(Area, { type: "monotone", dataKey: "diff", stroke: "url(#goldSplit)", strokeWidth: 2, fill: "url(#goldFill)" })] }) }) }), _jsxs("div", { className: "flex items-center justify-between font-mono text-[10px] text-flash/35 mb-3 gap-2", children: [_jsx("span", { className: "tracking-[0.12em] uppercase shrink-0", children: "gold vs lane" }), _jsxs("span", { className: "truncate", children: ["peak ", _jsx("span", { className: "text-jade/75 tabular-nums", children: s.peak ? `+${s.peak.diff.toLocaleString()}` : "—" }), "@", s.peak?.min, "\u2032", _jsx("span", { className: "mx-1 text-flash/15", children: "\u00B7" }), "low ", _jsx("span", { className: "text-red-400/75 tabular-nums", children: s.trough ? s.trough.diff.toLocaleString() : "—" }), "@", s.trough?.min, "\u2032"] })] }), s.moments?.length > 0 && (_jsx("div", { className: "space-y-1.5 mt-auto", children: s.moments.slice(0, 5).map((m, i) => (_jsxs(motion.div, { initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0 }, transition: { delay: delay + 0.3 + i * 0.06 }, className: "flex items-center gap-2 font-mono text-[11px]", children: [_jsx("span", { className: cn("w-1.5 h-1.5 rotate-45 shrink-0", m.type === "death" ? "bg-red-400/70" : m.type === "objective" ? "bg-[#FFB615]/80" : "bg-jade/70") }), _jsxs("span", { className: "text-flash/30 tabular-nums w-8 shrink-0", children: [m.min, "\u2032"] }), _jsx("span", { className: cn("truncate", m.type === "death" ? "text-red-400/65" : m.type === "objective" ? "text-[#FFB615]/75" : "text-flash/60"), children: m.text.replace(/ at \d+m$/, "") })] }, i))) }))] })] }));
}
/* ═══════════════════════════ timeline insights ═══════════════════════════ */
function DiffStat({ label, value }) {
    const good = (value ?? 0) >= 0;
    return (_jsxs("div", { className: "flex flex-col items-center flex-1 py-1", children: [_jsx("span", { className: cn("font-chakrapetch font-bold text-[18px] tabular-nums leading-none", value == null ? "text-flash/20" : good ? "text-jade" : "text-red-400/80"), children: value == null ? "—" : `${good ? "+" : ""}${value.toLocaleString()}` }), _jsx("span", { className: "font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 mt-1.5", children: label })] }));
}
function DeathClock({ clock }) {
    const max = Math.max(1, ...clock.map((b) => b.deaths));
    const worst = clock.reduce((mx, b) => (b.deaths > mx.deaths ? b : mx), clock[0]);
    const total = clock.reduce((s, b) => s + b.deaths, 0);
    return (_jsxs("div", { className: "h-full flex flex-col", children: [_jsx("div", { className: "flex items-end gap-1.5 flex-1 min-h-[64px]", children: clock.map((b, i) => (_jsxs("div", { className: "flex-1 flex flex-col items-center justify-end gap-1 h-full", children: [_jsx(motion.div, { initial: { height: 0 }, animate: { height: `${Math.max(3, (b.deaths / max) * 100)}%` }, transition: { delay: 0.25 + i * 0.05, duration: 0.5, ease: EASE }, className: cn("w-full rounded-[2px]", b.deaths > 0 && b === worst ? "bg-red-400/70" : b.deaths > 0 ? "bg-red-400/30" : "bg-filmlight/[0.05]"), style: b.deaths > 0 && b === worst ? { boxShadow: "0 0 10px rgba(248,113,113,0.3)" } : undefined }), _jsx("span", { className: "font-mono text-[9px] text-flash/40", children: b.bucket })] }, b.bucket))) }), _jsx("p", { className: "font-mono text-[9px] text-flash/30 mt-2.5 leading-relaxed", children: total > 0
                    ? _jsxs(_Fragment, { children: ["Danger window: ", _jsxs("span", { className: "text-red-400/70", children: [worst.bucket, " min"] }), " \u2014 ", worst.deaths, " of ", total, " deaths land there."] })
                    : "Clean — you're barely dying." })] }));
}
/* ═══════════════════════════ records wall ═══════════════════════════ */
function RecordChip({ label, value, champ, tone = "flash", delay }) {
    const color = tone === "jade" ? "text-jade" : tone === "citrine" ? "text-[#FFB615]" : tone === "red" ? "text-red-400/85" : "text-flash/85";
    return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { delay, duration: 0.35, ease: EASE }, className: "rounded-[4px] bg-filmdark/30 px-3 py-2.5 flex items-center gap-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]", children: [champ && _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(champ)}.png`, alt: "", className: "w-7 h-7 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]", onError: (e) => { e.currentTarget.style.display = "none"; } }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: cn("font-chakrapetch font-bold text-[14px] leading-none tabular-nums truncate", color), children: value }), _jsx("div", { className: "font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 mt-1 truncate", children: label })] })] }));
}
/* ═══════════════════════════ main ═══════════════════════════ */
export default function Overview({ puuid, region, nametag }) {
    const [period, setPeriod] = useState("day");
    const [selectedId, setSelectedId] = useState(null);
    useEffect(() => setSelectedId(null), [period]); // reset the picked game when the period changes
    const { data, loading, error } = useLearnOverview(puuid, region, nametag, period);
    // toggle-only bar for the loading / error / empty states (no hero to host it)
    const toggleBar = (_jsx("div", { className: "flex justify-end mb-5", children: _jsx(PeriodToggle, { period: period, onChange: setPeriod }) }));
    if (loading)
        return _jsxs(_Fragment, { children: [toggleBar, _jsx(OverviewSkeleton, {})] });
    if (error)
        return _jsxs(_Fragment, { children: [toggleBar, _jsx("div", { className: "flex items-center justify-center h-48", children: _jsx("span", { className: "text-flash/40 font-mono text-sm", children: "Failed to load overview data" }) })] });
    if (!data?.today || data.today.totalGames === 0) {
        return (_jsxs(_Fragment, { children: [toggleBar, _jsxs("div", { className: "space-y-2", children: [_jsx(OrbitEmpty, { label: period === "week" ? "No ranked games this week" : "No ranked games today" }), data?.baseline && (_jsxs("div", { className: "text-center pt-2", children: [_jsx("span", { className: "font-mono text-[9px] tracking-[0.2em] uppercase text-flash/20", children: "RECENT AVERAGES" }), _jsx("div", { className: "flex justify-center gap-6 mt-2", children: [["KDA", data.baseline.avgKDA], ["CS/M", data.baseline.avgCSPM], ["KP", data.baseline.avgKP + "%"]].map(([l, v]) => (_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "font-chakrapetch text-[14px] text-flash/60 tabular-nums", children: v }), _jsx("span", { className: "font-mono text-[8px] text-flash/20 tracking-[0.15em] mt-0.5", children: l })] }, l))) })] }))] })] }));
    }
    const t = data.today;
    const b = data.baseline;
    const games = t.perGameKDA ?? [];
    // per-game timeline breakdown — the user picks the game straight from the session flow ribbon
    const deepGames = data.deepGames ?? [];
    const selectableIds = new Set(deepGames.map((g) => g.matchId).filter(Boolean));
    const selected = deepGames.find((g) => g.matchId === selectedId)
        ?? deepGames.find((g) => g.matchId === data.spotlightMatchId)
        ?? deepGames[0] ?? null;
    // client-side records from the per-game array
    const byImpact = [...games].sort((a, c) => c.impact - a.impact);
    const best = byImpact[0];
    const peakDmg = games.reduce((mx, g) => (g.damage > (mx?.damage ?? -1) ? g : mx), null);
    const maxKills = games.reduce((mx, g) => (g.kills > (mx?.kills ?? -1) ? g : mx), null);
    const bestCs = games.reduce((mx, g) => (g.cspm > (mx?.cspm ?? -1) ? g : mx), null);
    const longest = games.reduce((mx, g) => (g.durationMin > (mx?.durationMin ?? -1) ? g : mx), null);
    const totalPentas = (t.pentaKills ?? 0) + (t.quadraKills ?? 0);
    const wrColor = t.winrate >= 50 ? "text-jade" : "text-red-400";
    const kdaColor = t.aggregateKDA.ratio >= 4 ? "text-jade" : t.aggregateKDA.ratio >= 2.5 ? "text-flash/90" : "text-red-400";
    return (_jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 }, className: "pb-14", children: [_jsx("div", { className: "pb-4 mb-4 border-b border-flash/[0.05]", children: _jsxs("div", { className: "flex flex-wrap items-stretch justify-between gap-x-8 gap-y-4", children: [_jsxs("div", { className: "flex flex-col items-start gap-3.5", children: [_jsxs("div", { className: "flex flex-wrap items-start gap-x-8 gap-y-4", children: [_jsx(HeroNumber, { delay: 0.02, label: period === "week" ? "Week winrate" : "Session winrate", value: _jsxs("span", { className: wrColor, children: [t.winrate, "%"] }), sub: _jsxs(_Fragment, { children: [t.wins, "W ", _jsxs("span", { className: "text-red-400/50", children: [t.losses, "L"] }), " \u00B7 ", t.totalGames, " games", t.winStreak >= 2 && _jsxs("span", { className: "text-jade/70", children: [" \u00B7 ", t.winStreak, " streak"] })] }) }), _jsx(HeroNumber, { delay: 0.06, label: "KDA", value: _jsx("span", { className: kdaColor, children: t.aggregateKDA.ratio }), sub: _jsxs(_Fragment, { children: [t.aggregateKDA.kills, " / ", _jsx("span", { className: "text-red-400/50", children: t.aggregateKDA.deaths }), " / ", t.aggregateKDA.assists] }) }), _jsx(HeroNumber, { delay: 0.1, label: "Kill participation", value: `${t.killParticipation}%`, sub: b ? _jsxs(_Fragment, { children: ["avg ", b.avgKP, "%"] }) : undefined })] }), _jsx(PeriodToggle, { period: period, onChange: setPeriod })] }), _jsxs("div", { className: "ml-auto flex items-center gap-5", children: [_jsx(ImpactRadial, { value: t.impact, delay: 0.1 }), _jsx(RankProgress, { lp: data.lpTrack })] })] }) }), _jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1, duration: 0.4, ease: EASE }, className: "mb-4", children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-3", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.28em] uppercase text-jade/55", children: "Session flow" })] }), _jsx(SessionRibbon, { games: games, selectableIds: selectableIds, selectedId: selected?.matchId ?? null, onSelect: setSelectedId })] }), deepGames.length > 0 && selected && (_jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-3 flex-wrap", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.25em] uppercase text-jade/55", children: "Timeline breakdown" }), _jsx("span", { className: "font-mono text-[10px] text-flash/25", children: "\u00B7" }), _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(selected.champion)}.png`, alt: "", className: "w-4 h-4 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]", onError: (e) => { e.currentTarget.style.display = "none"; } }), _jsx("span", { className: "font-chakrapetch text-[12px] text-flash/85", children: selected.champion }), _jsx("span", { className: cn("font-mono text-[8.5px] font-bold tracking-[0.12em] px-1.5 py-0.5 rounded-[3px]", selected.win ? "text-jade bg-jade/10" : "text-red-400 bg-red-400/10"), children: selected.tag }), _jsx("span", { className: "font-mono text-[9.5px] text-flash/25 ml-auto hidden sm:inline", children: "\u2191 pick a game in the session flow" })] }), _jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3, ease: EASE }, className: "grid grid-cols-1 lg:grid-cols-12 gap-4", children: [_jsxs("div", { className: "lg:col-span-7 grid grid-cols-1 gap-4", children: [_jsx(Panel, { title: "Laning \u00B7 10 min", hint: "vs lane opponent", delay: 0.02, children: _jsxs("div", { className: "flex divide-x divide-flash/[0.06]", children: [_jsx(DiffStat, { label: "Gold diff", value: selected.laning.goldDiff10 }), _jsx(DiffStat, { label: "CS diff", value: selected.laning.csDiff10 }), _jsx(DiffStat, { label: "XP diff", value: selected.laning.xpDiff10 }), _jsxs("div", { className: "flex flex-col items-center flex-1 py-1", children: [_jsx("span", { className: "font-chakrapetch font-bold text-[18px] tabular-nums leading-none text-flash/85", children: selected.laning.cs10 ?? "—" }), _jsx("span", { className: "font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 mt-1.5", children: "CS @ 10" })] })] }) }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4", children: [_jsx(Panel, { title: "Death clock", hint: "minute of your deaths", delay: 0.06, children: _jsx(DeathClock, { clock: selected.deathClock }) }), _jsx(Panel, { title: "Objectives", delay: 0.1, className: "sm:w-[150px]", children: _jsxs("div", { className: "flex sm:flex-col items-center justify-center gap-2 h-full py-1", children: [_jsx("span", { className: cn("font-chakrapetch font-bold text-[30px] tabular-nums leading-none", (selected.objectiveParticipation ?? 0) >= 60 ? "text-[#FFB615]" : "text-flash/80"), children: selected.objectiveParticipation != null ? `${selected.objectiveParticipation}%` : "—" }), _jsxs("span", { className: "font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 text-center", children: ["team objectives", _jsx("br", {}), "you helped take"] })] }) })] })] }), _jsx("div", { className: "lg:col-span-5", children: _jsx(SpotlightPanel, { s: selected, delay: 0.06 }) })] }, selected.matchId)] })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6", children: [_jsx(Panel, { title: "LP trajectory", hint: "anchored to live rank", delay: 0.14, className: "lg:col-span-7", children: _jsx(LpTrackChart, { lp: data.lpTrack }) }), _jsx(Panel, { title: "Form radar", hint: "vs your recent average", delay: 0.18, className: "lg:col-span-5 min-h-[248px]", children: _jsx(FormRadar, { t: t, b: b }) })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4", children: [_jsx(TrendCard, { delay: 0.3, title: "CS / min", data: t.csPerMinTrend, dataKey: "cspm", now: t.avgCSPM, base: b?.avgCSPM }), _jsx(TrendCard, { delay: 0.34, title: "Gold / min", data: t.goldPerMinTrend, dataKey: "gpm", now: t.avgGoldPerMin ?? 0, base: b?.avgGoldPerMin }), _jsx(TrendCard, { delay: 0.38, title: "Dmg share", data: t.damageShareTrend, dataKey: "dmgShare", now: t.avgDamageShare, base: b?.avgDmgShare, format: (v) => `${v}%` }), _jsx(TrendCard, { delay: 0.42, title: "Vision", data: t.visionScoreTrend, dataKey: "vs", now: t.avgVision, base: b?.avgVision })] }), _jsx(Panel, { title: "Session records", delay: 0.42, className: "mb-4", children: _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5", children: [best && _jsx(RecordChip, { delay: 0.46, label: "Best game", value: `IMPACT ${best.impact}`, champ: best.champion, tone: "jade" }), peakDmg && _jsx(RecordChip, { delay: 0.5, label: "Peak damage", value: Number(peakDmg.damage).toLocaleString(), champ: peakDmg.champion, tone: "citrine" }), maxKills && _jsx(RecordChip, { delay: 0.54, label: "Most kills", value: `${maxKills.kills} kills`, champ: maxKills.champion }), bestCs && _jsx(RecordChip, { delay: 0.58, label: "Best farming", value: `${bestCs.cspm} cs/m`, champ: bestCs.champion }), _jsx(RecordChip, { delay: 0.62, label: "Solo kills", value: String(t.soloKills ?? 0), tone: t.soloKills > 0 ? "jade" : "flash" }), _jsx(RecordChip, { delay: 0.66, label: "First bloods", value: String(t.firstBloods ?? 0), tone: t.firstBloods > 0 ? "jade" : "flash" }), _jsx(RecordChip, { delay: 0.7, label: "Multikills", value: `${t.doubleKills ?? 0}×2 ${t.tripleKills ?? 0}×3${totalPentas ? ` ${totalPentas}×4+` : ""}` }), _jsx(RecordChip, { delay: 0.74, label: "Wards placed", value: String(t.avgWardsPlaced ?? 0) + "/g" }), _jsx(RecordChip, { delay: 0.78, label: "Wards killed", value: String(t.avgWardsKilled ?? 0) + "/g" }), _jsx(RecordChip, { delay: 0.82, label: "CC time", value: `${t.avgCCTime ?? 0}s/g` }), _jsx(RecordChip, { delay: 0.86, label: "Turret dmg", value: Number(t.avgTurretDmg ?? 0).toLocaleString() }), longest && _jsx(RecordChip, { delay: 0.9, label: "Longest game", value: `${Math.round(longest.durationMin)}m`, champ: longest.champion })] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4", children: [_jsx(Panel, { title: "Combat profile", delay: 0.46, className: "lg:col-span-7", children: [
                                { l: "Damage dealt / game", v: Number(t.avgDmgPerGame).toLocaleString(), w: Math.min(100, (t.avgDmgPerGame / Math.max(1, t.avgDmgPerGame + t.avgDmgTakenPerGame)) * 200) },
                                { l: "Damage taken / game", v: Number(t.avgDmgTakenPerGame).toLocaleString(), w: Math.min(100, (t.avgDmgTakenPerGame / Math.max(1, t.avgDmgPerGame + t.avgDmgTakenPerGame)) * 200) },
                                { l: "Gold / game", v: Number(t.avgGoldPerGame).toLocaleString(), w: 70 },
                                { l: "Avg game length", v: `${t.avgGameDuration}m`, w: Math.min(100, (t.avgGameDuration / 40) * 100) },
                            ].map((row, i) => (_jsxs("div", { className: "py-2 border-b border-flash/[0.04] last:border-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("span", { className: "font-mono text-[10px] text-flash/40", children: row.l }), _jsx("span", { className: "font-chakrapetch font-semibold text-[13px] text-flash/85 tabular-nums", children: row.v })] }), _jsx("div", { className: "h-[3px] rounded-full bg-filmlight/[0.04] overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${row.w}%` }, transition: { delay: 0.5 + i * 0.08, duration: 0.6, ease: EASE }, className: "h-full rounded-full bg-gradient-to-r from-jade/20 to-jade/60" }) })] }, row.l))) }), _jsx(Panel, { title: "Roles played", delay: 0.5, className: "lg:col-span-5", children: (t.roleDistribution ?? []).sort((a, c) => c.games - a.games).map((r, i) => {
                                const max = Math.max(...t.roleDistribution.map((x) => x.games));
                                return (_jsxs("div", { className: "py-1.5", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "font-mono text-[10px] text-flash/45 uppercase tracking-wider", children: roleLabel(r.role) }), _jsxs("span", { className: "font-chakrapetch text-[12px] text-flash/70 tabular-nums", children: [r.games, "g"] })] }), _jsx("div", { className: "h-[3px] rounded-full bg-filmlight/[0.04] overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${(r.games / max) * 100}%` }, transition: { delay: 0.55 + i * 0.07, duration: 0.5, ease: EASE }, className: "h-full rounded-full bg-jade/50" }) })] }, r.role));
                            }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4", children: [t.allChampions?.length > 0 && (_jsx(Panel, { title: "Champion pool", hint: `${t.allChampions.length} played`, delay: 0.54, className: "lg:col-span-7", children: _jsx("div", { className: "-mx-4 -mb-3.5", children: t.allChampions.map((c, i) => (_jsxs("div", { className: cn("flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-jade/[0.03]", i > 0 && "border-t border-flash/[0.04]"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(c.name)}.png`, alt: "", className: "w-8 h-8 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]", onError: (e) => { e.currentTarget.style.display = "none"; } }), _jsx("span", { className: "font-chakrapetch text-[12px] text-flash/80 w-28 truncate", children: c.name }), _jsxs("div", { className: "flex-1 flex items-center gap-3 sm:gap-5 justify-end font-mono tabular-nums", children: [_jsxs("span", { className: cn("text-[12px] font-semibold", c.winrate >= 50 ? "text-jade" : "text-red-400/80"), children: [c.winrate, "%"] }), _jsxs("span", { className: "text-[10px] text-flash/30 w-7 text-right", children: [c.games, "g"] }), _jsxs("span", { className: "text-[10px] text-flash/45 w-14 text-right", children: [c.avgKDA, " kda"] }), _jsxs("span", { className: "text-[10px] text-flash/25 w-12 text-right hidden sm:block", children: [c.avgCSPM, " cs/m"] })] })] }, c.name))) }) })), (t.bestMatchups?.length > 0 || t.worstMatchups?.length > 0) && (_jsxs("div", { className: "lg:col-span-5 grid grid-cols-1 gap-4", children: [t.bestMatchups?.length > 0 && (_jsx(Panel, { title: "You beat", delay: 0.58, children: t.bestMatchups.map((m) => (_jsxs("div", { className: "flex items-center gap-2.5 py-1.5", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(m.enemy)}.png`, alt: "", className: "w-6 h-6 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(0,217,146,0.2)]", onError: (e) => { e.currentTarget.style.display = "none"; } }), _jsx("span", { className: "font-chakrapetch text-[11px] text-flash/70 flex-1 truncate", children: m.enemy }), _jsxs("span", { className: "font-mono text-[11px] text-jade tabular-nums font-semibold", children: [m.winrate, "%"] }), _jsxs("span", { className: "font-mono text-[9px] text-flash/25", children: [m.wins, "W ", m.games - m.wins, "L"] })] }, m.enemy))) })), t.worstMatchups?.length > 0 && (_jsx(Panel, { title: "They beat you", delay: 0.62, children: t.worstMatchups.map((m) => (_jsxs("div", { className: "flex items-center gap-2.5 py-1.5", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(m.enemy)}.png`, alt: "", className: "w-6 h-6 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(248,113,113,0.2)]", onError: (e) => { e.currentTarget.style.display = "none"; } }), _jsx("span", { className: "font-chakrapetch text-[11px] text-flash/70 flex-1 truncate", children: m.enemy }), _jsxs("span", { className: "font-mono text-[11px] text-red-400/85 tabular-nums font-semibold", children: [m.winrate, "%"] }), _jsxs("span", { className: "font-mono text-[9px] text-flash/25", children: [m.wins, "W ", m.games - m.wins, "L"] })] }, m.enemy))) }))] }))] }), t.winSplitStats && t.lossSplitStats && (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4", children: [{ s: t.winSplitStats, label: "In wins", good: true }, { s: t.lossSplitStats, label: "In losses", good: false }].map(({ s, label, good }, pi) => (_jsx(Panel, { title: `${label} · ${s.games}g`, delay: 0.66 + pi * 0.04, children: [
                            ["KDA", s.avgKDA, good ? "text-jade" : "text-red-400/85"],
                            ["K / D / A", `${s.avgKills} / ${s.avgDeaths} / ${s.avgAssists}`, "text-flash/80"],
                            ["CS / min", s.avgCSPM, "text-flash/80"],
                            ["Damage", Number(s.avgDmg).toLocaleString(), "text-flash/80"],
                            ["Vision", s.avgVision, "text-flash/80"],
                        ].map(([l, v, c]) => (_jsxs("div", { className: "flex items-center justify-between py-1.5 border-b border-flash/[0.04] last:border-0", children: [_jsx("span", { className: "font-mono text-[10px] text-flash/40", children: l }), _jsx("span", { className: cn("font-chakrapetch font-semibold text-[13px] tabular-nums", c), children: v })] }, l))) }, label))) })), _jsx(Panel, { title: "Coach notes", delay: 0.74, children: _jsx(StrengthsWeaknesses, { strengths: data.strengths, weaknesses: data.weaknesses, delay: 0 }) })] }, period) }));
}
