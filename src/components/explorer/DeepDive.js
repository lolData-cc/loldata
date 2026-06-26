import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// DeepDive.tsx — the expanded, in-depth analysis a query opens into.
//
// Fills the canvas with a glowy loldata-style read of the result: a winrate ring,
// KDA / CS / gold, and the centrepiece — the PATCH VARIATION explained: a glowing
// area chart of the chosen metric across recent patches, a plain-language trend
// verdict, and per-patch deltas. For ranking outputs it shows the full ranked
// board. The expansion itself is animated (deepDiveExpand) for a fluid feel.
import { useEffect, useMemo, useState } from "react";
import { X, TrendingUp, TrendingDown, Minus as MinusIcon, ChevronRight, BookmarkPlus, Check } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, } from "recharts";
import { cn } from "@/lib/utils";
import { runPatchVariation } from "./graph";
import { champIcon, itemIcon, itemName, categoryIcon, categoryHasIcon, CATEGORY_LABEL } from "./catalog";
import { BuildPathViz } from "./BuildPathViz";
import { ItemStrengthPanel } from "./ItemStrengthPanel";
import { SituationalGuide } from "./SituationalGuide";
import { CyberTip } from "./CyberTip";
const METRICS = [
    { key: "winrate", label: "Winrate", get: (r) => Number(r.winrate ?? 0), fmt: (v) => `${v.toFixed(1)}%`, pad: 1.5, eps: 0.05, suffix: "pt" },
    { key: "kda", label: "KDA", get: (r) => { const d = Number(r.avg_deaths ?? 0), ka = Number(r.avg_kills ?? 0) + Number(r.avg_assists ?? 0); return d > 0 ? ka / d : ka; }, fmt: (v) => v.toFixed(2), pad: 0.15, eps: 0.02, suffix: "" },
    { key: "cs", label: "CS", get: (r) => Number(r.avg_cs ?? 0), fmt: (v) => v.toFixed(0), pad: 6, eps: 0.5, suffix: "" },
    { key: "gold", label: "Gold", get: (r) => Number(r.avg_gold ?? 0), fmt: (v) => `${(v / 1000).toFixed(2)}k`, pad: 200, eps: 50, suffix: "g" },
];
export function DeepDive({ data, graph, onClose, onSave, canSave, saved }) {
    const isRank = data.columns.includes("dimension");
    const isItemDim = isRank && graph.output.kind === "rank" && graph.output.dimension === "item";
    const stat = data.rows[0];
    const [strengthItem, setStrengthItem] = useState(null);
    // top build items (for the situational guide) + the champ's baseline WR (so "lift" reads clearly)
    const topItems = useMemo(() => (isItemDim ? data.rows.slice(0, 5).map((r) => Number(r.dimension)).filter(Boolean) : []), [data, isItemDim]);
    const baseline = isItemDim && data.rows[0]?.baseline != null ? Number(data.rows[0].baseline) : null;
    const rank = useMemo(() => {
        const t = graph.filters?.tiers;
        if (!t?.length)
            return null;
        const s = new Set(t);
        if (s.has("MASTER"))
            return "Master+";
        if (s.has("GRANDMASTER"))
            return "GM+";
        if (s.has("CHALLENGER"))
            return "Challenger";
        return t[0];
    }, [graph]);
    // esc to collapse
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    const wr = Number(stat?.winrate ?? 0);
    const k = Number(stat?.avg_kills ?? 0), d = Number(stat?.avg_deaths ?? 0), a = Number(stat?.avg_assists ?? 0);
    const kda = d > 0 ? (k + a) / d : k + a;
    return (_jsxs("div", { className: "absolute inset-0 z-[20]", style: { animation: "deepDiveExpand 0.5s cubic-bezier(0.16,1,0.3,1)" }, children: [_jsx("div", { className: "absolute inset-0 bg-[rgba(3,7,9,0.985)] backdrop-blur-2xl" }), _jsx("div", { className: "pointer-events-none absolute -top-40 left-1/4 w-[640px] h-[640px] rounded-full", style: { background: "radial-gradient(circle, rgba(0,217,146,0.08), transparent 60%)" } }), _jsx("div", { className: "pointer-events-none absolute inset-0", style: { backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)" } }), _jsx("div", { className: "absolute inset-0 overflow-y-auto cyber-scrollbar", children: _jsxs("div", { className: "relative max-w-[1080px] mx-auto px-3 sm:px-6 md:px-10 py-7", children: [_jsxs("div", { className: "deep-section flex items-center justify-end gap-2 mb-2.5", children: [onSave && canSave && (_jsxs("button", { onClick: () => !saved && onSave(), disabled: saved, title: saved ? "Already saved — find it in Snapshots" : "Save this exact query; re-open it any day for fresh numbers", className: cn("flex items-center gap-1.5 h-8 px-3 rounded-[6px] border text-[10px] font-chakrapetch font-bold uppercase tracking-[0.12em] transition-colors", saved
                                        ? "border-jade/45 bg-jade/15 text-jade cursor-default"
                                        : "border-jade/30 bg-jade/[0.06] text-jade/85 hover:bg-jade/[0.13] hover:border-jade/55 hover:text-jade cursor-clicker"), children: [saved ? _jsx(Check, { size: 13 }) : _jsx(BookmarkPlus, { size: 13 }), saved ? "Saved" : "Save snapshot"] })), _jsx("button", { onClick: onClose, title: "Collapse (Esc)", className: "grid place-items-center w-8 h-8 rounded-[6px] text-flash/45 hover:text-flash hover:bg-white/[0.06] transition-colors cursor-clicker", children: _jsx(X, { size: 17 }) })] }), _jsxs("div", { className: "deep-section flex items-start gap-3.5 pb-5 mb-6 border-b border-white/[0.07]", style: { animationDelay: "40ms" }, children: [graph.subject.champion && (_jsx("img", { src: champIcon(graph.subject.champion), className: "w-14 h-14 rounded-[7px] border border-jade/40 shrink-0", style: { boxShadow: "0 0 18px rgba(0,217,146,0.25)" }, alt: "" })), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-[9px] font-chakrapetch font-bold tracking-[0.28em] uppercase text-jade/70", children: "Deep dive" }), _jsx("span", { className: "text-[9px] font-chakrapetch text-flash/30", children: "::" }), _jsx("span", { className: "text-[9px] font-chakrapetch text-flash/35 truncate", children: summarise(graph) })] }), _jsxs("h2", { className: "font-chakrapetch font-bold text-[26px] leading-none text-flash truncate", children: [graph.subject.champion || "Result", graph.subject.role && _jsx("span", { className: "text-flash/35 text-[16px] ml-2", children: graph.subject.role })] }), _jsx(QueryRecapInline, { graph: graph, data: data, rank: rank, baseline: baseline })] })] }), isItemDim && _jsx(BuildPathViz, { graph: graph, onSelectItem: setStrengthItem, selectedItem: strengthItem }), isItemDim && topItems.length > 0 && (_jsx("div", { className: "mt-5", children: _jsx(SituationalGuide, { graph: graph, items: topItems }) })), !isRank && stat && Number(stat.games) > 0 && (_jsxs("div", { className: "deep-section grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 mb-6", style: { animationDelay: "60ms" }, children: [_jsx("div", { className: "flex items-center justify-center rounded-[10px] border border-jade/15 bg-jade/[0.03] py-4", children: _jsx(Ring, { value: wr }) }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3", children: [_jsx(BigStat, { label: "KDA", value: kda.toFixed(2), accent: kda >= 3 ? "#00d992" : kda >= 2 ? "#d7d8d9" : "#ff6286", sub: `${k.toFixed(1)} / ${d.toFixed(1)} / ${a.toFixed(1)}` }), _jsx(BigStat, { label: "Avg CS", value: Number(stat.avg_cs ?? 0).toFixed(0), accent: "#d7d8d9" }), _jsx(BigStat, { label: "Avg Gold", value: `${(Number(stat.avg_gold ?? 0) / 1000).toFixed(1)}k`, accent: "#FFB615" }), _jsx(BigStat, { label: "Games", value: Number(stat.games).toLocaleString(), accent: "#36d3ff" })] })] })), isRank && data.rows.length > 0 && (_jsxs("div", { className: "deep-section mt-6", style: { animationDelay: "120ms" }, children: [_jsx(SectionTitle, { children: isItemDim ? "Item value · ranked by weighted lift" : `Ranking · top ${data.rows.length} by winrate` }), isItemDim && (_jsxs("p", { className: "text-[10px] font-chakrapetch text-flash/35 mt-1.5 mb-1", children: ["Ranked by how much each item raises ", graph.subject.champion, "'s winrate above baseline, weighted by sample size \u2014 not raw winrate. Click any item for its matchup analysis."] })), _jsxs("div", { className: "flex flex-col gap-2 mt-2.5", children: [isItemDim && (_jsxs("div", { className: "flex items-center gap-3 px-3 pb-0.5 text-[8px] font-chakrapetch font-bold uppercase tracking-[0.12em] text-flash/30", children: [_jsx("span", { className: "w-6 shrink-0" }), _jsx("span", { className: "w-9 shrink-0" }), _jsx("span", { className: "flex-1", children: "Item \u00B7 pick \u00B7 games" }), _jsx(CyberTip, { tip: _jsxs(_Fragment, { children: [_jsx("b", { className: "text-flash", children: "Lift" }), " = winrate above ", graph.subject.champion, "'s ", baseline ?? "~", "% baseline. Positive = the item helps more than an average game; the ranking weights this by sample size so a proven build beats a high-variance niche pick."] }), children: _jsx("span", { className: "w-12 text-right cursor-help text-flash/45 hover:text-jade transition-colors", children: "Lift" }) }), _jsx("span", { className: "w-[26%] max-w-[300px] shrink-0" }), _jsx("span", { className: "w-14 text-right", children: "Winrate" }), _jsx("span", { className: "w-[15px] shrink-0" })] })), data.rows.map((r, i) => {
                                            const raw = r.dimension;
                                            const icon = isItemDim ? itemIcon(Number(raw)) : champIcon(String(raw));
                                            const label = isItemDim ? itemName(Number(raw)) : String(raw);
                                            const w = Number(r.winrate);
                                            const lift = r.lift != null ? Number(r.lift) : null;
                                            const pick = r.pickrate != null ? Number(r.pickrate) : null;
                                            const games = Number(r.games);
                                            const lowSample = isItemDim && games < 100;
                                            return (_jsxs("div", { onClick: isItemDim ? () => setStrengthItem(Number(raw)) : undefined, title: isItemDim ? "Matchup analysis" : undefined, className: cn("group flex items-center gap-3 px-3 py-2.5 rounded-[8px] border", i < 3 ? "border-jade/20 bg-jade/[0.04]" : "border-white/[0.06] bg-black/30", isItemDim && "cursor-clicker hover:border-jade/40 transition-colors"), children: [_jsx("span", { className: cn("w-6 text-center text-[13px] font-chakrapetch font-bold tabular-nums", i === 0 ? "text-citrine" : i < 3 ? "text-jade" : "text-flash/30"), children: i + 1 }), _jsx("img", { src: icon, onError: (e) => (e.target.style.visibility = "hidden"), className: "w-9 h-9 rounded-[5px] border border-white/10 shrink-0", alt: "" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("span", { className: "block text-[14px] font-chakrapetch font-bold text-flash truncate", children: label }), isItemDim && (_jsxs("span", { className: "block text-[9px] font-chakrapetch text-flash/35 tabular-nums", children: [pick != null && _jsxs(_Fragment, { children: [pick, "% pick \u00B7 "] }), games.toLocaleString(), " games", lowSample && _jsx("span", { className: "text-citrine/65", children: " \u00B7 low sample" })] }))] }), isItemDim && lift != null && (_jsxs("div", { className: "shrink-0 w-12 text-right", children: [_jsxs("span", { className: cn("text-[14px] font-chakrapetch font-bold tabular-nums", lift > 0.05 ? "text-jade" : lift < -0.05 ? "text-error" : "text-flash/50"), children: [lift > 0 ? "+" : "", lift.toFixed(1)] }), _jsx("span", { className: "block text-[7px] font-chakrapetch uppercase tracking-[0.1em] text-flash/30 -mt-0.5", children: "lift pp" })] })), _jsx("div", { className: "w-[26%] max-w-[300px] h-2.5 rounded-full bg-white/[0.06] overflow-hidden shrink-0", children: _jsx("div", { className: "h-full rounded-full transition-all duration-500", style: { width: `${Math.min(100, w)}%`, background: w >= 50 ? "linear-gradient(90deg,#00a070,#00d992)" : "linear-gradient(90deg,#b53b54,#ff6286)", boxShadow: w >= 50 ? "0 0 10px rgba(0,217,146,0.5)" : "0 0 10px rgba(255,98,134,0.4)" } }) }), _jsxs("span", { className: cn("w-14 text-right text-[15px] font-chakrapetch font-bold tabular-nums", w >= 50 ? "text-jade" : "text-error"), children: [w, "%"] }), !isItemDim && _jsxs("span", { className: "w-14 text-right text-[10px] font-chakrapetch text-flash/35 tabular-nums", children: [Number(r.games).toLocaleString(), "g"] }), isItemDim && _jsx(ChevronRight, { size: 15, className: "shrink-0 text-flash/25 group-hover:text-jade/70 transition-colors" })] }, String(raw)));
                                        })] })] })), _jsx("div", { className: "mt-6", children: _jsx(PatchTrend, { graph: graph }) }), _jsx("p", { className: "deep-section mt-8 text-[10px] font-chakrapetch text-flash/25 leading-relaxed", style: { animationDelay: "180ms" }, children: isItemDim
                                ? "Item value weights each item's winrate lift over baseline by sample size, so a proven core build outranks a high-variance niche pick. Build path, “adapt your build” and matchup analysis use timeline build-order data."
                                : "Patch trend is the champion at this role/rank across recent patches (instant). Save this combo as a snapshot to recheck it any day with fresh data." })] }) }), strengthItem != null && (_jsx(ItemStrengthPanel, { graph: graph, itemId: strengthItem, onClose: () => setStrengthItem(null) }))] }));
}
// ── patch trend (the explained chart) ──
function PatchTrend({ graph }) {
    const [rows, setRows] = useState(null);
    const [phase, setPhase] = useState("loading");
    const [metric, setMetric] = useState("winrate");
    useEffect(() => {
        let cancelled = false;
        setPhase("loading");
        setRows(null);
        runPatchVariation(graph, false)
            .then((r) => { if (cancelled)
            return; setRows(r.rows); setPhase(r.rows.length >= 2 ? "ready" : "empty"); })
            .catch(() => { if (!cancelled)
            setPhase("empty"); });
        return () => { cancelled = true; };
    }, [graph]);
    const m = METRICS.find((x) => x.key === metric);
    const { chartData, domain, verdict } = useMemo(() => {
        if (!rows || rows.length < 2)
            return { chartData: [], domain: [0, 1], verdict: null };
        const cd = rows.map((r) => ({ patch: r.patch, value: m.get(r), games: r.games }));
        const vals = cd.map((d) => d.value);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const dom = [lo - m.pad, hi + m.pad];
        const first = vals[0], last = vals[vals.length - 1], delta = last - first;
        const dir = Math.abs(delta) < m.eps ? "stable" : delta > 0 ? "up" : "down";
        return { chartData: cd, domain: dom, verdict: { first, last, delta, dir, from: cd[0].patch, to: cd[cd.length - 1].patch } };
    }, [rows, m]);
    return (_jsxs("div", { className: "deep-section rounded-[12px] border border-white/[0.08] bg-[rgba(6,12,14,0.55)] p-4 md:p-5", style: { animationDelay: "90ms" }, children: [_jsxs("div", { className: "flex items-center justify-between gap-3 mb-3", children: [_jsx(SectionTitle, { children: "Patch variation" }), _jsx("div", { className: "flex gap-1", children: METRICS.map((x) => (_jsx("button", { onClick: () => setMetric(x.key), className: cn("px-2.5 py-1 rounded-[5px] text-[10px] font-chakrapetch font-bold uppercase tracking-[0.08em] transition-colors cursor-clicker", metric === x.key ? "bg-jade/15 text-jade border border-jade/35" : "text-flash/40 border border-white/[0.07] hover:text-flash/70"), children: x.label }, x.key))) })] }), phase === "loading" && _jsx("div", { className: "h-[240px] grid place-items-center text-[11px] font-chakrapetch text-flash/35", children: "loading patch trend\u2026" }), phase === "empty" && _jsx("div", { className: "h-[120px] grid place-items-center text-[11px] font-chakrapetch text-flash/35", children: "Not enough patches to chart a trend." }), phase === "ready" && verdict && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-3", children: [_jsx("span", { className: cn("grid place-items-center w-7 h-7 rounded-[6px] border", verdict.dir === "up" ? "text-jade border-jade/30 bg-jade/10" : verdict.dir === "down" ? "text-error border-error/30 bg-error/10" : "text-flash/50 border-white/10 bg-white/[0.04]"), children: verdict.dir === "up" ? _jsx(TrendingUp, { size: 15 }) : verdict.dir === "down" ? _jsx(TrendingDown, { size: 15 }) : _jsx(MinusIcon, { size: 15 }) }), _jsxs("p", { className: "text-[12.5px] font-chakrapetch text-flash/80 leading-snug", children: [m.label, " ", _jsx("span", { className: cn("font-bold", verdict.dir === "up" ? "text-jade" : verdict.dir === "down" ? "text-error" : "text-flash"), children: verdict.dir === "up" ? "trending up" : verdict.dir === "down" ? "trending down" : "holding steady" }), " ", "\u2014 ", m.fmt(verdict.first), " \u2192 ", m.fmt(verdict.last), " ", _jsxs("span", { className: cn("font-bold", verdict.dir === "up" ? "text-jade" : verdict.dir === "down" ? "text-error" : "text-flash/50"), children: ["(", verdict.delta >= 0 ? "+" : "", deltaFmt(verdict.delta, m), ")"] }), " ", "across ", verdict.from, " \u2192 ", verdict.to, "."] })] }), _jsx("div", { className: "w-full h-[240px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: chartData, margin: { top: 8, right: 14, left: 0, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "pvFill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#00d992", stopOpacity: 0.42 }), _jsx("stop", { offset: "100%", stopColor: "#00d992", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)", vertical: false }), _jsx(XAxis, { dataKey: "patch", tick: { fill: "#d7d8d9", fontSize: 11 }, axisLine: false, tickLine: false, dy: 4 }), _jsx(YAxis, { domain: domain, tick: { fill: "#8a9096", fontSize: 10 }, axisLine: false, tickLine: false, width: 44, tickFormatter: (v) => m.fmt(v) }), metric === "winrate" && _jsx(ReferenceLine, { y: 50, stroke: "rgba(215,216,217,0.25)", strokeDasharray: "4 4" }), _jsx(Tooltip, { cursor: { stroke: "rgba(0,217,146,0.3)", strokeWidth: 1 }, contentStyle: { background: "rgba(6,12,14,0.96)", border: "1px solid rgba(0,217,146,0.25)", borderRadius: 7, fontFamily: "chakrapetch", fontSize: 12 }, labelStyle: { color: "#d7d8d9" }, formatter: (v, _n, p) => [`${m.fmt(Number(v))}  ·  ${Number(p?.payload?.games ?? 0).toLocaleString()} games`, m.label] }), _jsx(Area, { type: "monotone", dataKey: "value", stroke: "#00d992", strokeWidth: 2.5, fill: "url(#pvFill)", dot: { r: 4, fill: "#00d992", stroke: "#03110c", strokeWidth: 2 }, activeDot: { r: 6, fill: "#00d992", stroke: "#03110c", strokeWidth: 2 }, isAnimationActive: true, style: { filter: "drop-shadow(0 0 6px rgba(0,217,146,0.55))" } })] }) }) }), _jsx("div", { className: "flex flex-wrap gap-2 mt-3", children: chartData.map((c, i) => {
                            const prev = i > 0 ? chartData[i - 1].value : null;
                            const dl = prev == null ? null : c.value - prev;
                            return (_jsxs("div", { className: "flex items-center gap-1.5 px-2 py-1 rounded-[5px] border border-white/[0.07] bg-black/30", children: [_jsx("span", { className: "text-[10px] font-chakrapetch tabular-nums text-flash/55", children: c.patch }), _jsx("span", { className: "text-[11px] font-chakrapetch font-bold tabular-nums text-flash", children: m.fmt(c.value) }), dl != null && Math.abs(dl) >= m.eps && (_jsxs("span", { className: cn("text-[9px] font-chakrapetch tabular-nums", dl > 0 ? "text-jade/80" : "text-error/80"), children: [dl > 0 ? "▲" : "▼", deltaFmt(Math.abs(dl), m)] }))] }, c.patch));
                        }) })] }))] }));
}
function deltaFmt(v, m) {
    if (m.key === "winrate")
        return v.toFixed(1);
    if (m.key === "kda")
        return v.toFixed(2);
    if (m.key === "gold")
        return Math.round(v).toString();
    return v.toFixed(0);
}
function Ring({ value }) {
    const r = 48, c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, value));
    const color = pct >= 50 ? "#00d992" : "#ff6286";
    return (_jsxs("svg", { width: "132", height: "132", viewBox: "0 0 132 132", children: [_jsx("circle", { cx: "66", cy: "66", r: r, fill: "none", stroke: "rgba(255,255,255,0.07)", strokeWidth: "9" }), _jsx("circle", { cx: "66", cy: "66", r: r, fill: "none", stroke: color, strokeWidth: "9", strokeLinecap: "round", strokeDasharray: c, strokeDashoffset: c * (1 - pct / 100), transform: "rotate(-90 66 66)", style: { filter: `drop-shadow(0 0 7px ${color})`, transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)" } }), _jsx("text", { x: "66", y: "64", textAnchor: "middle", className: "font-chakrapetch font-bold", fill: color, fontSize: "30", children: value.toFixed(1) }), _jsx("text", { x: "66", y: "84", textAnchor: "middle", fill: "#8a9096", fontSize: "9", letterSpacing: "2", children: "WINRATE %" })] }));
}
function BigStat({ label, value, accent, sub }) {
    return (_jsxs("div", { className: "flex flex-col justify-center rounded-[9px] border border-white/[0.07] bg-black/30 px-3 py-3", children: [_jsx("span", { className: "text-[8px] font-chakrapetch tracking-[0.16em] uppercase text-flash/35", children: label }), _jsx("span", { className: "text-[24px] leading-none font-chakrapetch font-bold tabular-nums mt-1.5", style: { color: accent }, children: value }), sub && _jsx("span", { className: "text-[9px] font-chakrapetch text-flash/40 tabular-nums mt-1", children: sub })] }));
}
function SectionTitle({ children }) {
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-1 h-3.5 bg-jade rounded-full" }), _jsx("span", { className: "text-[11px] font-chakrapetch font-bold tracking-[0.2em] uppercase text-flash/55", children: children })] }));
}
// ── query recap (the plain-words "what did I ask?" card) ──
const QUEUE_LABEL = {
    400: "Normal Draft", 420: "Ranked Solo/Duo", 430: "Normal Blind", 440: "Ranked Flex",
    450: "ARAM", 480: "Swiftplay", 490: "Quickplay", 700: "Clash", 720: "ARAM Clash",
    900: "ARURF", 1700: "Arena", 1900: "URF",
};
function QueryRecapInline({ graph, data, rank, baseline }) {
    const subj = graph.subject;
    const allies = graph.constraints.filter((c) => c.type === "ally");
    const enemies = graph.constraints.filter((c) => c.type === "enemy");
    const cats = graph.categories ?? [];
    const items = subj.items ?? [];
    const exItems = subj.excludeItems ?? [];
    const scope = data.meta.mode === "all" ? "All patches" : data.meta.patch ? `Patch ${data.meta.patch}` : "Current patch";
    const queues = graph.filters?.queues ?? [];
    const queueLabel = queues.length === 0 ? "All queues" : queues.map((q) => QUEUE_LABEL[q] ?? `Queue ${q}`).join(", ");
    const regions = graph.filters?.platforms ?? [];
    const regionLabel = regions.length === 0 ? "All regions" : regions.map((r) => r.toUpperCase().replace(/\d+$/, "")).join(", ");
    const output = graph.output.kind === "rank"
        ? `Ranking ${graph.output.dimension === "item" ? "items" : graph.output.dimension === "ally" ? "allies" : "enemies"} by weighted lift`
        : "Champion stats";
    const outLimits = graph.output.kind === "rank"
        ? `top ${graph.output.limit ?? 25}${graph.output.minGames ? ` · ≥${graph.output.minGames}g` : ""}`
        : null;
    const hasConstraints = allies.length > 0 || enemies.length > 0 || cats.length > 0 || items.length > 0 || exItems.length > 0;
    return (_jsxs("div", { className: "mt-2 flex flex-col gap-1.5", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-chakrapetch text-flash/55 leading-tight", children: [_jsxs("span", { children: [_jsx("b", { className: "text-flash tabular-nums", children: data.meta.games.toLocaleString() }), " games"] }), _jsx(Sep, {}), _jsx("span", { children: scope }), _jsx(Sep, {}), _jsx("span", { children: rank ?? "All ranks" }), _jsx(Sep, {}), _jsx("span", { children: queueLabel }), _jsx(Sep, {}), _jsx("span", { children: regionLabel }), _jsx(Sep, {}), _jsxs("span", { className: "text-jade/75", children: [output, outLimits ? _jsxs("span", { className: "text-jade/45", children: [" \u00B7 ", outLimits] }) : null] }), baseline != null && (_jsxs(_Fragment, { children: [_jsx(Sep, {}), _jsx(CyberTip, { side: "bottom", tip: _jsxs(_Fragment, { children: [_jsx("b", { className: "text-flash", children: "Baseline winrate" }), " \u2014 ", graph.subject.champion, "'s overall winrate in this filter. The ", _jsx("b", { className: "text-jade", children: "lift" }), " on every item is measured against this."] }), children: _jsxs("span", { className: "cursor-help text-flash/70 underline decoration-dotted decoration-flash/25 underline-offset-2", children: ["base ", baseline, "%"] }) })] }))] }), hasConstraints && (_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [items.map((id) => _jsx(ChipMini, { icon: itemIcon(id), label: itemName(id) }, `i${id}`)), exItems.map((id) => _jsx(ChipMini, { icon: itemIcon(id), label: itemName(id), tone: "bad", prefix: "no" }, `x${id}`)), allies.map((c, i) => _jsx(ChipMini, { icon: c.champion ? champIcon(c.champion) : undefined, label: c.champion ?? "any", tone: c.negate ? "bad" : "ally", prefix: c.negate ? "no ally" : "ally" }, `a${i}`)), enemies.map((c, i) => _jsx(ChipMini, { icon: c.champion ? champIcon(c.champion) : undefined, label: c.champion ?? "any", tone: c.negate ? "bad" : "enemy", prefix: c.negate ? "no vs" : "vs" }, `e${i}`)), cats.map((cc, i) => _jsx(ChipMini, { icon: categoryHasIcon(cc.cls) ? categoryIcon(cc.cls) : undefined, label: CATEGORY_LABEL[cc.cls] ?? cc.cls, tone: "cat", prefix: `${cc.side === "ally" ? "ally" : "enemy"} ≥${cc.min}`, contain: true }, `c${i}`))] }))] }));
}
function Sep() {
    return _jsx("span", { className: "text-flash/25", children: "\u00B7" });
}
function ChipMini({ icon, label, tone = "neutral", prefix, contain }) {
    const toneCls = tone === "bad" ? "border-error/25 bg-error/[0.05]"
        : tone === "enemy" ? "border-error/15 bg-error/[0.03]"
            : tone === "ally" ? "border-jade/20 bg-jade/[0.04]"
                : tone === "cat" ? "border-citrine/25 bg-citrine/[0.05]"
                    : "border-white/10 bg-white/[0.03]";
    const prefixCls = tone === "cat" ? "text-citrine/90" : tone === "bad" ? "text-error/75" : "text-flash/35";
    return (_jsxs("span", { className: cn("flex items-center gap-1 pl-1 pr-1.5 py-[1px] rounded-[5px] border", toneCls), title: label, children: [prefix && _jsx("span", { className: cn("text-[8px] font-chakrapetch font-bold uppercase tracking-[0.06em]", prefixCls), children: prefix }), icon && _jsx("img", { src: icon, onError: (e) => (e.target.style.visibility = "hidden"), className: cn("w-4 h-4", contain ? "object-contain" : "rounded-[3px] border border-white/10"), alt: "" }), _jsx("span", { className: "text-[9.5px] font-chakrapetch text-flash/75", children: label })] }));
}
function summarise(g) {
    const bits = [];
    const allies = g.constraints.filter((c) => c.type === "ally").length;
    const enemies = g.constraints.filter((c) => c.type === "enemy").length;
    if (allies)
        bits.push(`${allies} ally${allies > 1 ? "s" : ""}`);
    if (enemies)
        bits.push(`${enemies} enemy${enemies > 1 ? "ies" : ""}`);
    const items = (g.subject.items?.length ?? 0) + g.constraints.reduce((s, c) => s + (c.items?.length ?? 0), 0);
    if (items)
        bits.push(`${items} item${items > 1 ? "s" : ""}`);
    if (g.output.kind === "rank")
        bits.push(`ranking ${g.output.dimension}`);
    return bits.length ? bits.join(" · ") : "subject only";
}
