"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes";
import { getRuneIcon, getRuneTree } from "@/constants/runeData";
import { normalizeBuildPage, CAMP_POSITIONS } from "./types";
import { THREAT_LEVELS, SYNERGY_LEVELS } from "./types";
import { MatchupDisplay } from "./matchup-display";
import { Link } from "react-router-dom";
function SectionCard({ title, children, className }) {
    return (_jsxs("div", { className: cn("relative", className), children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("div", { className: "w-1 h-5 bg-jade/30 rounded-full" }), _jsx("h3", { className: "text-[13px] font-orbitron text-flash/70 uppercase tracking-[0.2em]", children: title }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/[0.06] to-transparent" })] }), children] }));
}
// ── Introduction ──
function IntroView({ content }) {
    return (_jsx("div", { className: "text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap", children: content }));
}
// ── Matchups ──
function MatchupView({ threats, synergies }) {
    const levelColors = {};
    for (const t of THREAT_LEVELS)
        levelColors[t.key] = t.color;
    for (const s of SYNERGY_LEVELS)
        levelColors[s.key] = s.color;
    const renderGroup = (entries, label, isThreats) => {
        if (entries.length === 0)
            return null;
        // Group by level
        const groups = new Map();
        for (const e of entries) {
            if (!groups.has(e.level))
                groups.set(e.level, []);
            groups.get(e.level).push(e);
        }
        return (_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: cn("text-[10px] font-mono uppercase tracking-[0.2em] mb-3", isThreats ? "text-red-400/50" : "text-jade/50"), children: label }), Array.from(groups.entries()).map(([level, champs]) => (_jsxs("div", { className: "mb-3", children: [_jsxs("span", { className: cn("inline-block text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded-sm mb-1.5", levelColors[level] ?? "bg-flash/10 text-flash/40"), children: [level, " (", champs.length, ")"] }), _jsx("div", { className: "flex flex-wrap gap-2", children: champs.map(c => (_jsxs("div", { className: "flex items-center gap-2 px-2 py-1.5 rounded-sm bg-flash/[0.03] border border-flash/[0.05]", title: c.note, children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.championId}.png`, alt: c.championId, className: "w-7 h-7 rounded-[2px]" }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] font-mono text-flash/60", children: c.championId }), c.note && _jsx("div", { className: "text-[9px] font-mono text-flash/30 max-w-[120px] truncate", children: c.note })] })] }, c.championId))) })] }, level)))] }));
    };
    return (_jsxs("div", { className: "flex gap-6", children: [renderGroup(threats, "Threats", true), renderGroup(synergies, "Synergies", false)] }));
}
// ── Build ──
function BuildItemRow({ items }) {
    return (_jsx("div", { className: "flex gap-2 flex-wrap", children: items.map((itemId, idx) => (_jsx(Link, { to: `/items/${itemId}`, className: "flex flex-col items-center gap-1 p-2 rounded-sm bg-flash/[0.02] border border-flash/[0.04] hover:border-jade/15 transition-colors min-w-[70px]", children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: "", className: "w-10 h-10 rounded-[2px] border border-flash/[0.08]" }) }, idx))) }));
}
function BuildView({ items }) {
    return _jsx(BuildItemRow, { items: items });
}
function RecommendedItemsView({ section }) {
    const richItems = section.richItems ??
        (section.items ?? []).map((id) => ({ itemId: id }));
    const [selectedIdx, setSelectedIdx] = useState(richItems.length > 0 ? 0 : null);
    if (richItems.length === 0)
        return null;
    const ITEM_W = 56; // item card width approx
    const GAP = 8;
    const totalW = richItems.length * ITEM_W + (richItems.length - 1) * GAP;
    return (_jsxs("div", { className: "flex flex-col items-center gap-0", children: [_jsx("div", { className: "flex gap-2 justify-center flex-wrap", children: richItems.map((item, idx) => (_jsx("button", { type: "button", onClick: () => setSelectedIdx(selectedIdx === idx ? null : idx), className: cn("flex flex-col items-center gap-1 p-2 rounded-sm border transition-all cursor-pointer", selectedIdx === idx
                        ? "border-jade/40 bg-jade/[0.05] shadow-[0_0_12px_rgba(0,217,146,0.15)]"
                        : "border-flash/[0.04] bg-flash/[0.02] hover:border-flash/[0.1]"), children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${item.itemId}.png`, alt: "", className: cn("w-10 h-10 rounded-[2px] border transition-all", selectedIdx === idx ? "border-jade/30" : "border-flash/[0.08]") }) }, idx))) }), selectedIdx !== null && richItems[selectedIdx]?.description && (_jsxs("div", { className: "flex flex-col items-center w-full", children: [_jsx("div", { className: "w-[1px] h-4 bg-jade/20" }), _jsx("div", { className: "w-2 h-2 rotate-45 border border-jade/25 bg-jade/[0.08] -mt-[1px]" }), _jsx("p", { className: "mt-2 w-full text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap", children: richItems[selectedIdx].description })] }))] }));
}
const ITEM_SIZE = 44; // w-11 = 44px
const ITEM_GAP = 6; // gap-1.5 = 6px
const CONN_W = 44; // horizontal connector width
function stepHeight(step) {
    return step.items.length * ITEM_SIZE + (step.items.length - 1) * ITEM_GAP;
}
function BuildFlowConnector({ from, to, index }) {
    const fromH = stepHeight(from);
    const toH = stepHeight(to);
    const h = Math.max(fromH, toH);
    const fromYs = from.items.map((_, i) => {
        const stepTop = (h - fromH) / 2;
        return stepTop + i * (ITEM_SIZE + ITEM_GAP) + ITEM_SIZE / 2;
    });
    const toYs = to.items.map((_, i) => {
        const stepTop = (h - toH) / 2;
        return stepTop + i * (ITEM_SIZE + ITEM_GAP) + ITEM_SIZE / 2;
    });
    const lines = [];
    for (const fy of fromYs) {
        for (const ty of toYs) {
            lines.push({ x1: 0, y1: fy, x2: CONN_W, y2: ty });
        }
    }
    const uid = `pulse-${index}-${Math.random().toString(36).slice(2, 6)}`;
    const delay = 0.3 + index * 0.15;
    return (_jsxs("svg", { width: CONN_W, height: h, className: "shrink-0", style: { minHeight: h }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: uid, x1: "0%", y1: "0%", x2: "100%", y2: "0%", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { offset: "0%", stopColor: "rgba(0,217,146,0.15)", children: _jsx("animate", { attributeName: "stop-color", values: "rgba(0,217,146,0.15);rgba(0,217,146,0.15)", dur: "0.01s", begin: `${delay}s`, fill: "freeze" }) }), _jsx("stop", { offset: "50%", stopColor: "rgba(0,217,146,0.15)", children: _jsx("animate", { attributeName: "stop-color", values: "rgba(0,217,146,0.15);rgba(0,217,146,0.9);rgba(0,217,146,0.15)", dur: "0.5s", begin: `${delay}s`, fill: "freeze" }) }), _jsx("stop", { offset: "100%", stopColor: "rgba(0,217,146,0.15)", children: _jsx("animate", { attributeName: "stop-color", values: "rgba(0,217,146,0.15);rgba(0,217,146,0.15)", dur: "0.01s", begin: `${delay + 0.5}s`, fill: "freeze" }) })] }) }), lines.map((l, i) => (_jsx("line", { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, stroke: "rgba(0,217,146,0.25)", strokeWidth: 1 }, `b${i}`))), lines.map((l, i) => (_jsxs("line", { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2, stroke: "rgba(0,217,146,0)", strokeWidth: 2, children: [_jsx("animate", { attributeName: "stroke", values: "rgba(0,217,146,0);rgba(0,217,146,0.9);rgba(0,217,146,0)", dur: "0.4s", begin: `${delay}s`, fill: "freeze" }), _jsx("animate", { attributeName: "stroke-width", values: "2;3;1", dur: "0.4s", begin: `${delay}s`, fill: "freeze" })] }, `p${i}`)))] }));
}
function BuildFlowView({ steps, highlightedItemId }) {
    if (steps.length === 0)
        return null;
    const maxH = Math.max(...steps.map(s => stepHeight(s)));
    return (_jsx("div", { className: "flex items-center overflow-x-auto pb-1 pl-1 pt-1", children: steps.map((step, stepIdx) => (_jsxs("div", { className: "flex items-center shrink-0", children: [_jsx("div", { className: "flex flex-col items-center gap-1.5", style: { justifyContent: "center", minHeight: maxH }, children: step.items.map((itemId, i) => {
                        const isHighlighted = highlightedItemId === itemId;
                        return (_jsx(Link, { to: `/items/${itemId}`, className: cn("block rounded-[3px] border transition-all duration-300", isHighlighted
                                ? "border-jade/60 ring-2 ring-jade/40 shadow-[0_0_14px_rgba(0,217,146,0.4)] scale-110"
                                : "border-flash/[0.06] hover:border-jade/15"), children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: "", className: "w-11 h-11 rounded-[2px]" }) }, i));
                    }) }), stepIdx < steps.length - 1 && (_jsx(BuildFlowConnector, { from: step, to: steps[stepIdx + 1], index: stepIdx }))] }, stepIdx))) }));
}
/** Parse [text](itemId) markup into segments */
function parseItemLinks(text) {
    const parts = [];
    const regex = /\[([^\]]+)\]\((\d+)\)/g;
    let lastIdx = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIdx)
            parts.push({ type: "text", value: text.slice(lastIdx, match.index) });
        parts.push({ type: "link", text: match[1], itemId: Number(match[2]) });
        lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length)
        parts.push({ type: "text", value: text.slice(lastIdx) });
    return parts;
}
function LinkedDescription({ text, onHover }) {
    const parts = parseItemLinks(text);
    return (_jsx("p", { className: "text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap", children: parts.map((part, i) => part.type === "text" ? (_jsx("span", { children: part.value }, i)) : (_jsx("span", { onMouseEnter: () => onHover(part.itemId), onMouseLeave: () => onHover(null), className: "text-jade/70 underline decoration-jade/25 underline-offset-2 cursor-help hover:text-jade hover:decoration-jade/50 transition-colors", children: part.text }, i))) }));
}
function MultiBuildView({ section }) {
    const rawPages = section.pages ?? (section.items ? [{ name: "Default", items: section.items }] : []);
    const pages = rawPages.map((p) => normalizeBuildPage(p));
    const [activeIdx, setActiveIdx] = useState(0);
    const [highlightedItemId, setHighlightedItemId] = useState(null);
    if (pages.length === 0)
        return null;
    const activePage = pages[activeIdx] ?? pages[0];
    return (_jsxs("div", { children: [pages.length > 1 && (_jsx("div", { className: "flex items-center gap-0 mb-4 border-b border-flash/[0.06]", children: pages.map((p, idx) => {
                    const isActive = activeIdx === idx;
                    return (_jsxs("button", { type: "button", onClick: () => { setActiveIdx(idx); setHighlightedItemId(null); }, className: cn("relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors cursor-pointer", isActive ? "text-jade" : "text-flash/25 hover:text-flash/50"), children: [p.name || `Build ${idx + 1}`, (p.againstClasses ?? []).map((cls) => (_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: cn("w-4 h-4 object-contain transition-opacity", isActive ? "opacity-70" : "opacity-30") }, cls))), (p.againstChampions ?? []).map((c) => (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: cn("w-4 h-4 rounded-[1px] border border-flash/[0.06] transition-opacity", isActive ? "opacity-70" : "opacity-30") }, c))), isActive && (_jsx(motion.span, { layoutId: "build-tab-underline", className: "absolute bottom-0 left-2 right-2 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)]", transition: { type: "spring", stiffness: 400, damping: 30 } }))] }, idx));
                }) })), pages.length === 1 && (activePage.againstChampions?.length || activePage.againstClasses?.length) && (_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("div", { className: "text-[11px] font-orbitron text-flash/40", children: activePage.name }), (activePage.againstClasses ?? []).map((cls) => (_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: "w-5 h-5 object-contain opacity-50", title: cls }, cls))), (activePage.againstChampions ?? []).map((c) => (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-5 h-5 rounded-[2px] border border-flash/[0.06] opacity-60", title: c }, c)))] })), _jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: "easeOut" }, children: [activePage.description && (_jsx("div", { className: "mb-3", children: _jsx(LinkedDescription, { text: activePage.description, onHover: setHighlightedItemId }) })), _jsxs("div", { className: "flex items-start gap-10 justify-center", children: [_jsx(BuildFlowView, { steps: activePage.steps, highlightedItemId: highlightedItemId ?? undefined }), activePage.showBoots && (activePage.boots?.length ?? 0) > 0 && (_jsx("div", { className: "shrink-0 flex flex-col gap-2.5 pt-1", children: activePage.boots.map((boot, bi) => {
                                        const hasContext = (boot.againstClasses?.length ?? 0) > 0 || (boot.againstChampions?.length ?? 0) > 0;
                                        return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "relative shrink-0", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${boot.itemId}.png`, alt: "", className: "w-10 h-10 rounded-[3px] border border-flash/[0.08]" }), !hasContext && (_jsx("span", { className: "absolute -top-1.5 -right-1 text-[5px] font-orbitron font-bold text-jade/60 bg-jade/10 border border-jade/20 px-1 py-px rounded-[2px] uppercase tracking-wider leading-none", children: "DEFAULT" }))] }), hasContext && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-[9px] font-mono text-flash/25 shrink-0", children: "VS" }), _jsxs("div", { className: "flex gap-1.5", children: [(boot.againstClasses ?? []).map((cls) => (_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: "w-5 h-5 object-contain opacity-60" }, cls))), (boot.againstChampions ?? []).map((c) => (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-5 h-5 rounded-[2px] border border-flash/[0.06] opacity-60" }, c)))] })] }))] }, bi));
                                    }) }))] })] }, activeIdx) })] }));
}
// ── Runes ──
function RuneView({ primary, secondary }) {
    const keystoneIcon = getKeystoneIcon(primary.keystone);
    const keystoneName = getKeystoneName(primary.keystone) ?? "";
    const primaryTreeIcon = getStyleIcon(primary.tree);
    const secondaryTreeIcon = getStyleIcon(secondary.tree);
    const secondaryName = getStyleName(secondary.tree) ?? "";
    const primaryTreeData = getRuneTree(primary.tree);
    const secondaryTreeData = getRuneTree(secondary.tree);
    return (_jsxs("div", { className: "flex gap-8", children: [_jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [primaryTreeIcon && _jsx("img", { src: primaryTreeIcon, alt: "", className: "w-6 h-6 rounded-full" }), _jsx("span", { className: "text-[11px] font-mono text-flash/40 uppercase tracking-wider", children: getStyleName(primary.tree) })] }), _jsx("div", { className: "flex gap-2 justify-center", children: keystoneIcon && (_jsx("img", { src: keystoneIcon, alt: keystoneName ?? "", className: "w-12 h-12 rounded-full border-2 border-jade/40 shadow-[0_0_10px_rgba(0,217,146,0.25)]" })) }), primaryTreeData?.rows.map((row, rowIdx) => (_jsx("div", { className: "flex gap-2 justify-center", children: row.map(rune => {
                            const selected = primary.runes.includes(rune.id);
                            const icon = getRuneIcon(rune.id);
                            return icon ? (_jsx("img", { src: icon, alt: rune.name, className: cn("w-8 h-8 rounded-full transition-opacity", selected ? "opacity-100 ring-1 ring-jade/30" : "opacity-20"), title: rune.name }, rune.id)) : null;
                        }) }, rowIdx)))] }), _jsx("div", { className: "w-[1px] bg-gradient-to-b from-transparent via-flash/[0.08] to-transparent" }), _jsxs("div", { className: "flex flex-col items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [secondaryTreeIcon && _jsx("img", { src: secondaryTreeIcon, alt: "", className: "w-5 h-5 rounded-full opacity-50" }), _jsx("span", { className: "text-[10px] font-mono text-flash/30 uppercase tracking-wider", children: secondaryName })] }), secondaryTreeData?.rows.map((row, rowIdx) => (_jsx("div", { className: "flex gap-2 justify-center", children: row.map(rune => {
                            const selected = secondary.runes.includes(rune.id);
                            const icon = getRuneIcon(rune.id);
                            return icon ? (_jsx("img", { src: icon, alt: rune.name, className: cn("w-7 h-7 rounded-full transition-opacity", selected ? "opacity-100 ring-1 ring-jade/30" : "opacity-15"), title: rune.name }, rune.id)) : null;
                        }) }, rowIdx)))] })] }));
}
// ── Multi-Rune View ──
function MultiRunePageView({ section }) {
    const pages = section.pages ?? (section.primary ? [{ name: "Default", primary: section.primary, secondary: section.secondary }] : []);
    const [activeIdx, setActiveIdx] = useState(0);
    if (pages.length === 0)
        return null;
    const activePage = pages[activeIdx] ?? pages[0];
    return (_jsxs("div", { children: [pages.length > 1 && (_jsx("div", { className: "flex items-center gap-0 mb-4 border-b border-flash/[0.06]", children: pages.map((p, idx) => {
                    const isActive = activeIdx === idx;
                    return (_jsxs("button", { type: "button", onClick: () => setActiveIdx(idx), className: cn("relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors cursor-pointer", isActive ? "text-jade" : "text-flash/25 hover:text-flash/50"), children: [p.name || `Page ${idx + 1}`, (p.againstClasses ?? []).map((cls) => (_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: cn("w-4 h-4 object-contain transition-opacity", isActive ? "opacity-70" : "opacity-30") }, cls))), (p.againstChampions ?? []).map((c) => (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: cn("w-4 h-4 rounded-[1px] border border-flash/[0.06] transition-opacity", isActive ? "opacity-70" : "opacity-30") }, c))), isActive && (_jsx(motion.span, { layoutId: "rune-tab-underline", className: "absolute bottom-0 left-2 right-2 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)]", transition: { type: "spring", stiffness: 400, damping: 30 } }))] }, idx));
                }) })), _jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: "easeOut" }, className: "flex gap-6", children: [_jsxs("div", { className: "flex-1 flex flex-col gap-3 min-w-0", children: [((activePage.againstChampions ?? []).length > 0 || (activePage.againstClasses ?? []).length > 0) && (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[9px] font-mono text-flash/25 uppercase tracking-wider", children: "vs" }), (activePage.againstClasses ?? []).map((cls) => (_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: "w-6 h-6 object-contain opacity-60", title: cls }, cls))), (activePage.againstChampions ?? []).map((c) => (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-6 h-6 rounded-[2px] border border-flash/[0.08] opacity-60", title: c }, c)))] })), activePage.description && (_jsx("p", { className: "text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap", children: activePage.description })), activePage.primary && (() => {
                                    const icon = getKeystoneIcon(activePage.primary.keystone);
                                    const name = getKeystoneName(activePage.primary.keystone);
                                    const primaryName = getStyleName(activePage.primary.tree);
                                    const secondaryName = getStyleName(activePage.secondary?.tree);
                                    return (_jsxs("div", { className: "flex items-center gap-2 mt-2", children: [icon && _jsx("img", { src: icon, alt: "", className: "w-8 h-8 rounded-full border border-jade/30" }), _jsxs("div", { children: [_jsx("div", { className: "text-[13px] font-orbitron text-flash/60", children: name }), _jsxs("div", { className: "text-[10px] font-mono text-flash/25", children: [primaryName, " / ", secondaryName] })] })] }));
                                })()] }), _jsx("div", { className: "w-[1px] bg-gradient-to-b from-transparent via-flash/[0.06] to-transparent shrink-0" }), _jsx("div", { className: "shrink-0", children: _jsx(RuneView, { primary: activePage.primary, secondary: activePage.secondary }) })] }, activeIdx) })] }));
}
// ── Back Timings ──
function BackTimingView({ timings }) {
    return (_jsx("div", { className: "space-y-2", children: timings.map((t, idx) => (_jsxs("div", { className: cn("relative grid grid-cols-[60px_1px_120px_1px_1fr] items-center gap-3 px-4 py-2.5 rounded-sm", t.ideal ? "border border-jade/30 bg-jade/[0.03] shadow-[0_0_8px_rgba(0,217,146,0.08)]" : "border border-flash/[0.04] bg-flash/[0.02]"), children: [t.ideal && _jsx("span", { className: "absolute -top-2 left-3 z-10 text-[8px] font-orbitron font-bold text-jade/70 bg-[#0a1214] border border-jade/25 px-1.5 py-0.5 rounded-[2px] uppercase tracking-[0.15em] leading-none", children: "IDEAL" }), _jsxs("span", { className: "text-[15px] font-orbitron font-bold text-jade/60 tabular-nums", children: [t.gold, "g"] }), _jsx("div", { className: "w-[1px] h-full bg-flash/[0.06]" }), _jsx("div", { className: "flex gap-1.5", children: t.items.map((itemId, i) => (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: "", className: "w-7 h-7 rounded-[2px]" }, i))) }), _jsx("div", { className: "w-[1px] h-full bg-flash/[0.06]" }), _jsx("span", { className: "text-[13px] font-mono text-flash/45", children: t.note })] }, idx))) }));
}
// ── Jungle Pathing ──
const MINIMAP_URL = "https://ddragon.leagueoflegends.com/cdn/14.10.1/img/map/map11.png";
function JungleMapView({ path }) {
    const camps = path.camps;
    const side = path.side;
    return (_jsxs("div", { className: "relative w-[280px] h-[280px] shrink-0 rounded-sm overflow-hidden border border-flash/[0.06]", style: { perspective: "800px" }, children: [_jsxs("div", { className: "absolute inset-0", style: { transform: "rotateX(8deg) scale(1.05)", transformOrigin: "center center" }, children: [_jsx("img", { src: MINIMAP_URL, alt: "Summoner's Rift", className: "w-full h-full object-cover opacity-60", draggable: false }), _jsx("div", { className: "absolute inset-0 bg-liquirice/30" })] }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-10", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.04) 3px, rgba(0,217,146,0.04) 4px)" } }), _jsx("svg", { className: "absolute inset-0 w-full h-full z-10 pointer-events-none", children: camps.map((camp, i) => {
                    if (i === 0)
                        return null;
                    const prev = CAMP_POSITIONS[camps[i - 1]];
                    const curr = CAMP_POSITIONS[camp];
                    const p = prev[side], c = curr[side];
                    const delay = 0.3 + i * 0.12;
                    return (_jsx("line", { x1: `${p.x}%`, y1: `${p.y}%`, x2: `${c.x}%`, y2: `${c.y}%`, stroke: "rgba(0,217,146,0.15)", strokeWidth: 1.5, strokeDasharray: "4 3", children: _jsx("animate", { attributeName: "stroke", values: "rgba(0,217,146,0.15);rgba(0,217,146,0.7);rgba(0,217,146,0.25)", dur: "0.4s", begin: `${delay}s`, fill: "freeze" }) }, i));
                }) }), camps.map((camp, i) => {
                const pos = CAMP_POSITIONS[camp][side];
                const delay = 0.2 + i * 0.1;
                return (_jsx("div", { className: "absolute z-20 flex items-center justify-center", style: {
                        left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)",
                        animation: `campPop 0.3s ease-out ${delay}s both`,
                    }, children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-7 h-7 rounded-full bg-black/70 border border-jade/40 flex items-center justify-center shadow-[0_0_10px_rgba(0,217,146,0.3)]", children: _jsx("span", { className: "text-[11px] font-orbitron font-bold text-jade", children: i + 1 }) }), _jsx("div", { className: "absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap", children: _jsx("span", { className: "text-[7px] font-mono text-flash/30", children: CAMP_POSITIONS[camp].label }) })] }) }, i));
            }), _jsxs("div", { className: cn("absolute top-2 right-2 z-20 px-2 py-0.5 rounded-sm text-[7px] font-orbitron uppercase tracking-[0.15em] border", side === "blue" ? "text-blue-300/70 border-blue-400/20 bg-blue-500/10" : "text-red-300/70 border-red-400/20 bg-red-500/10"), children: [side, " side"] }), _jsx("style", { children: `
        @keyframes campPop {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      ` })] }));
}
function JunglePathView({ paths }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const [highlightedItemId, setHighlightedItemId] = useState(null);
    if (!paths || paths.length === 0)
        return null;
    const activePath = paths[activeIdx] ?? paths[0];
    return (_jsxs("div", { children: [paths.length > 1 && (_jsx("div", { className: "flex items-center gap-0 mb-4 border-b border-flash/[0.06]", children: paths.map((p, idx) => {
                    const isActive = activeIdx === idx;
                    return (_jsxs("button", { type: "button", onClick: () => setActiveIdx(idx), className: cn("relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors cursor-pointer", isActive ? "text-jade" : "text-flash/25 hover:text-flash/50"), children: [p.name || `Path ${idx + 1}`, (p.againstChampions ?? []).map(c => (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: cn("w-4 h-4 rounded-[1px] border border-flash/[0.06] transition-opacity", isActive ? "opacity-70" : "opacity-30") }, c))), isActive && (_jsx(motion.span, { layoutId: "path-tab-underline", className: "absolute bottom-0 left-2 right-2 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)]", transition: { type: "spring", stiffness: 400, damping: 30 } }))] }, idx));
                }) })), _jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.2, ease: "easeOut" }, className: "flex gap-6", children: [_jsx(JungleMapView, { path: activePath }), _jsxs("div", { className: "flex-1 flex flex-col gap-3 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h4", { className: "text-[14px] font-orbitron text-flash/60", children: activePath.name }), (activePath.againstChampions ?? []).length > 0 && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-[8px] font-mono text-flash/20 uppercase", children: "vs" }), (activePath.againstChampions ?? []).map(c => (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-6 h-6 rounded-[2px] border border-flash/[0.08]" }, c)))] }))] }), _jsx("div", { className: "flex items-center gap-1 flex-wrap", children: activePath.camps.map((camp, i) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsxs("div", { className: "flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-flash/[0.03] border border-flash/[0.06]", children: [_jsx("span", { className: "text-[10px] font-orbitron text-jade/60", children: i + 1 }), _jsx("span", { className: "text-[10px] font-mono text-flash/40", children: CAMP_POSITIONS[camp].label })] }), i < activePath.camps.length - 1 && (_jsx("span", { className: "text-flash/15 text-[8px]", children: "\u2192" }))] }, i))) }), activePath.description && (_jsx(LinkedDescription, { text: activePath.description, onHover: setHighlightedItemId }))] })] }, activeIdx) })] }));
}
function isSectionEmpty(s) {
    if (s.type === "introduction")
        return !s.content?.trim();
    if (s.type === "matchups")
        return s.threats.length === 0 && s.synergies.length === 0;
    if (s.type === "build") {
        const pages = s.pages ?? (s.items ? [{ items: s.items }] : []);
        return pages.every((p) => {
            const steps = p.steps ?? (p.items ? p.items.map((id) => ({ items: [id] })) : []);
            return steps.length === 0;
        });
    }
    if (s.type === "runes") {
        const pages = s.pages ?? (s.primary ? [s] : []);
        return pages.length === 0 || pages.every((p) => !p.primary?.keystone && (!p.primary?.runes || p.primary.runes.length === 0));
    }
    if (s.type === "recommended_items")
        return !s.items || s.items.length === 0;
    if (s.type === "back_timings")
        return s.timings.length === 0;
    if (s.type === "jungle_pathing") {
        const paths = s.paths ?? [];
        return paths.length === 0 || paths.every((p) => p.camps.length === 0);
    }
    return false;
}
// ── Main Viewer ──
export function GuideViewer({ guide }) {
    return (_jsx("div", { className: "space-y-8", children: guide.sections.filter(s => s.visible && !isSectionEmpty(s)).map((section, idx) => (_jsxs(SectionCard, { title: section.title, children: [section.type === "introduction" && _jsx(IntroView, { content: section.content }), section.type === "matchups" && _jsx(MatchupDisplay, { threats: section.threats, synergies: section.synergies, championId: guide.champion_id }), section.type === "build" && _jsx(MultiBuildView, { section: section }), section.type === "runes" && _jsx(MultiRunePageView, { section: section }), section.type === "recommended_items" && _jsx(RecommendedItemsView, { section: section }), section.type === "back_timings" && _jsx(BackTimingView, { timings: section.timings }), section.type === "jungle_pathing" && _jsx(JunglePathView, { paths: section.paths })] }, idx))) }));
}
