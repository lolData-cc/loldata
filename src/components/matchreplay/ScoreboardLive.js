import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { kdaAt, metricsAt, staticParticipantByPid, fmtShortNum, inventoryAt, BLUE_IDS, RED_IDS, } from "./derive";
import { cn } from "@/lib/utils";
export function ScoreboardLive({ timeline, staticMatch, timeMs }) {
    const kda = useMemo(() => kdaAt(timeline, timeMs), [timeline, timeMs]);
    return (_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(TeamColumn, { side: "blue", ids: BLUE_IDS, timeline: timeline, staticMatch: staticMatch, timeMs: timeMs, kda: kda }), _jsx(TeamColumn, { side: "red", ids: RED_IDS, timeline: timeline, staticMatch: staticMatch, timeMs: timeMs, kda: kda })] }));
}
function TeamColumn({ side, ids, timeline, staticMatch, timeMs, kda, }) {
    const tint = side === "blue" ? "#5BA8E6" : "#d63336";
    const totalK = ids.reduce((s, p) => s + (kda.get(p)?.k ?? 0), 0);
    const totalGold = ids.reduce((s, p) => {
        const m = metricsAt(timeline, p, timeMs);
        return s + (m?.totalGold ?? 0);
    }, 0);
    return (_jsxs("div", { className: "rounded-sm bg-flash/[0.015] ring-1 ring-flash/[0.06] p-3", children: [_jsxs("div", { className: "flex items-baseline justify-between mb-3", children: [_jsxs("div", { className: "flex items-baseline gap-2", children: [_jsx("div", { className: "w-2 h-2 rounded-sm self-center", style: { background: tint } }), _jsx("span", { className: "text-[10px] font-mono uppercase tracking-[0.2em]", style: { color: tint }, children: side === "blue" ? "Blue Side" : "Red Side" })] }), _jsxs("div", { className: "flex items-center gap-3 font-mono text-[10px] tabular-nums text-flash/60", children: [_jsxs("span", { children: [_jsx("span", { className: "text-flash/40", children: "K" }), " ", totalK] }), _jsxs("span", { children: [_jsx("span", { className: "text-flash/40", children: "G" }), " ", fmtShortNum(totalGold)] })] })] }), _jsx("div", { className: "space-y-1", children: ids.map((pid) => {
                    const sp = staticParticipantByPid(staticMatch, pid);
                    if (!sp)
                        return null;
                    const k = kda.get(pid) ?? { k: 0, d: 0, a: 0 };
                    const m = metricsAt(timeline, pid, timeMs);
                    const inv = inventoryAt(timeline, pid, timeMs);
                    const cs = Math.round((m?.cs ?? 0) + (m?.jungleCs ?? 0));
                    const gold = Math.round(m?.totalGold ?? 0);
                    const lv = m?.level ?? 1;
                    const dmg = Math.round(m?.damageStats.totalDamageDoneToChampions ?? 0);
                    return (_jsxs("div", { className: "flex items-center gap-2 px-1.5 py-1 rounded-sm hover:bg-flash/[0.04] transition-colors", children: [_jsxs("div", { className: "relative shrink-0", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(sp.championName)}.png`, alt: sp.championName, className: "w-8 h-8 rounded-sm", style: { boxShadow: `0 0 0 1px ${tint}aa` } }), _jsx("div", { className: "absolute -bottom-0.5 -right-0.5 text-[8px] font-mono font-bold tabular-nums px-0.5 rounded-sm", style: { background: "#040A0C", color: tint, boxShadow: `0 0 0 1px ${tint}60` }, children: lv })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[11px] font-chakrapetch font-medium text-flash/90 truncate leading-none", children: sp.championName }), _jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [_jsxs("span", { className: "text-[13px] font-chakrapetch font-bold tabular-nums tracking-wide leading-none", children: [_jsx("span", { className: "text-flash/90", children: k.k }), _jsx("span", { className: "mx-[2px] text-flash/25", children: "/" }), _jsx("span", { className: "text-red-400/85", children: k.d }), _jsx("span", { className: "mx-[2px] text-flash/25", children: "/" }), _jsx("span", { className: "text-flash/90", children: k.a })] }), _jsx("span", { className: "text-[8px] font-mono text-flash/30", children: "\u00B7" }), _jsxs("span", { className: "text-[8px] font-mono text-flash/45 tabular-nums", children: [cs, " CS"] }), _jsx("span", { className: "text-[8px] font-mono text-flash/30", children: "\u00B7" }), _jsxs("span", { className: "text-[8px] font-mono text-citrine/70 tabular-nums", children: [fmtShortNum(gold), "g"] }), _jsx("span", { className: "text-[8px] font-mono text-flash/30", children: "\u00B7" }), _jsxs("span", { className: "text-[8px] font-mono text-jade/70 tabular-nums", children: [fmtShortNum(dmg), " dmg"] })] })] }), _jsxs("div", { className: "flex gap-0.5 shrink-0", children: [Array.from({ length: 6 }).map((_, idx) => {
                                        const id = inv.items[idx];
                                        return (_jsx("div", { className: cn("w-4 h-4 rounded-[2px] bg-[#0f0f0f] ring-1 ring-flash/[0.05]"), children: id ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: "", className: "w-full h-full rounded-[2px]" })) : null }, idx));
                                    }), inv.trinketId ? (_jsx("div", { className: "w-4 h-4 rounded-full bg-[#0f0f0f] ring-1 ring-flash/[0.05] ml-0.5", children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${inv.trinketId}.png`, alt: "", className: "w-full h-full rounded-full" }) })) : null] })] }, pid));
                }) })] }));
}
