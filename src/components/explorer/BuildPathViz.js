import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// BuildPathViz.tsx — the cyber "core build path".
//
// Renders the cohort's most-common completed-item sequence as a row of slots
// (1st → 2nd → 3rd …), the top item of each slot wired to the next by a glowing
// jade connector, with situational alternatives stacked under each slot. Each item
// is clickable → opens its conditional strength panel in the parent.
//
// Data: GET-style POST to /api/explorer/buildpath (runBuildPath). Item winrate is
// per-slot (survivorship-correct); lift is vs the cohort baseline.
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { runBuildPath } from "./graph";
import { itemIcon, itemName } from "./catalog";
import { CyberTip } from "./CyberTip";
const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];
export function BuildPathViz({ graph, onSelectItem, selectedItem, bare, }) {
    const [res, setRes] = useState(null);
    const [phase, setPhase] = useState("loading");
    useEffect(() => {
        let cancelled = false;
        setPhase("loading");
        setRes(null);
        runBuildPath(graph)
            .then((r) => {
            if (cancelled)
                return;
            const has = r.slots.some((s) => s.length > 0);
            setRes(r);
            setPhase(has ? "ready" : "empty");
        })
            .catch(() => !cancelled && setPhase("error"));
        return () => {
            cancelled = true;
        };
    }, [graph]);
    if (phase === "loading")
        return (_jsx(Shell, { bare: bare, children: _jsx("div", { className: "h-[150px] grid place-items-center text-[11px] font-chakrapetch text-flash/35", children: "tracing the build path\u2026" }) }));
    if (phase === "error")
        return (_jsx(Shell, { bare: bare, children: _jsx("div", { className: "h-[110px] grid place-items-center text-[11px] font-chakrapetch text-flash/35", children: "Build path unavailable for this query." }) }));
    if (phase === "empty" || !res)
        return (_jsx(Shell, { bare: bare, children: _jsx("div", { className: "h-[110px] grid place-items-center text-center text-[11px] font-chakrapetch text-flash/35 px-6", children: "No item-order data for this cohort yet \u2014 build paths need timeline-covered games." }) }));
    return (_jsx(Shell, { bare: bare, coverage: res.coverage, covered: res.coveredGames, children: _jsx("div", { className: "overflow-x-auto cyber-scrollbar pb-2 -mx-1 px-1", children: _jsx("div", { className: "flex items-start gap-7 min-w-min pt-1", children: res.slots.map((slot, i) => {
                    const main = slot[0];
                    const alts = slot.slice(1, 4); // top 3 situational alternatives — keep it scannable
                    const last = i === res.slots.length - 1;
                    if (!main)
                        return null;
                    return (_jsxs("div", { className: "relative shrink-0 w-[116px]", children: [!last && res.slots[i + 1]?.[0] && (_jsxs("div", { className: "pointer-events-none absolute right-[-28px] top-[34px] w-[28px] flex items-center", children: [_jsx("span", { className: "block h-[2px] flex-1 rounded-full", style: {
                                            background: "linear-gradient(90deg, rgba(0,217,146,0.15), rgba(0,217,146,0.85))",
                                            boxShadow: "0 0 8px rgba(0,217,146,0.55)",
                                        } }), _jsx(ChevronRight, { size: 14, className: "text-jade -ml-1 shrink-0", style: { filter: "drop-shadow(0 0 4px rgba(0,217,146,0.7))" } })] })), _jsx("div", { className: "text-center text-[9px] font-chakrapetch font-bold uppercase tracking-[0.18em] text-jade/60 mb-1.5", children: ORD[i] ?? `${i + 1}th` }), _jsx(ItemNode, { item: main, big: true, selected: selectedItem === main.item, onClick: () => onSelectItem?.(main.item) }), alts.length > 0 && (_jsxs("div", { className: "mt-2.5 flex flex-col gap-1.5", children: [_jsx("div", { className: "text-center text-[8px] font-chakrapetch uppercase tracking-[0.16em] text-flash/25", children: "alt" }), alts.map((alt) => (_jsx(ItemNode, { item: alt, selected: selectedItem === alt.item, onClick: () => onSelectItem?.(alt.item) }, alt.item)))] }))] }, i));
                }) }) }) }));
}
function ItemNode({ item, big, selected, onClick, }) {
    const wr = item.winrate;
    const good = wr >= 50;
    const size = big ? "w-14 h-14" : "w-9 h-9";
    return (_jsx(CyberTip, { className: "w-full align-top", tip: _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("b", { className: "text-flash text-[11px]", children: itemName(item.item) }), _jsxs("span", { children: [_jsxs("b", { className: good ? "text-jade" : "text-error", children: [wr, "% winrate"] }), " at this slot"] }), _jsxs("span", { children: [_jsxs("b", { className: item.lift >= 0 ? "text-jade" : "text-error", children: [item.lift >= 0 ? "+" : "", item.lift.toFixed(1), " lift"] }), " vs champ average"] }), _jsxs("span", { className: "text-flash/55", children: [item.pickrate, "% bought it here \u00B7 ", item.games.toLocaleString(), " games"] }), _jsx("span", { className: "text-jade/70 mt-0.5", children: "\u25B8 click for matchup analysis" })] }), children: _jsxs("button", { onClick: onClick, className: cn("group w-full flex flex-col items-center rounded-[9px] border px-1.5 py-2 transition-all cursor-clicker", selected
                ? "border-citrine/60 bg-citrine/[0.06]"
                : big
                    ? "border-jade/25 bg-jade/[0.04] hover:border-jade/45"
                    : "border-white/[0.07] bg-black/30 hover:border-white/20"), children: [_jsx("div", { className: "relative", children: _jsx("img", { src: itemIcon(item.item), onError: (e) => (e.target.style.visibility = "hidden"), className: cn("rounded-[6px] border", size, good ? "border-jade/40" : "border-error/40"), style: { boxShadow: big ? `0 0 12px ${good ? "rgba(0,217,146,0.3)" : "rgba(255,98,134,0.25)"}` : undefined }, alt: "" }) }), big && (_jsx("span", { className: "mt-1 text-[10px] leading-tight font-chakrapetch font-bold text-flash/80 text-center line-clamp-2 h-[26px]", children: itemName(item.item) })), _jsxs("div", { className: "mt-1 flex items-baseline gap-1", children: [_jsxs("span", { className: cn("font-chakrapetch font-bold tabular-nums", big ? "text-[14px]" : "text-[11px]", good ? "text-jade" : "text-error"), children: [wr, "%"] }), _jsx(LiftBadge, { lift: item.lift, small: !big })] }), _jsxs("span", { className: cn("font-chakrapetch tabular-nums text-flash/35", big ? "text-[9px]" : "text-[8px]"), children: [item.pickrate, "% \u00B7 ", compact(item.games)] })] }) }));
}
function LiftBadge({ lift, small }) {
    if (Math.abs(lift) < 0.05)
        return null;
    const up = lift > 0;
    return (_jsxs("span", { className: cn("font-chakrapetch font-bold tabular-nums", small ? "text-[8px]" : "text-[9px]", up ? "text-jade/70" : "text-error/70"), children: [up ? "+" : "", lift.toFixed(1)] }));
}
function Shell({ children, coverage, covered, bare, }) {
    return (_jsxs("div", { className: cn("deep-section", !bare && "rounded-[12px] border border-white/[0.08] bg-[rgba(6,12,14,0.55)] p-4 md:p-5"), style: { animationDelay: "150ms" }, children: [(!bare || coverage != null) && (_jsxs("div", { className: "flex items-center justify-between gap-3 mb-3.5", children: [bare ? _jsx("span", {}) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-1 h-3.5 bg-jade rounded-full" }), _jsx("span", { className: "text-[11px] font-chakrapetch font-bold tracking-[0.2em] uppercase text-flash/55", children: "Core build path" })] })), coverage != null && (_jsx(CyberTip, { side: "bottom", tip: _jsxs(_Fragment, { children: ["Build order is only known for games that have ", _jsx("b", { className: "text-flash", children: "match-timeline" }), " data \u2014 ", _jsxs("b", { className: "text-jade", children: [coverage, "%"] }), " of this cohort. The path is computed from those ", _jsx("b", { className: "text-flash", children: compact(covered ?? 0) }), " games."] }), children: _jsxs("span", { className: "flex items-center gap-1.5 text-[10px] font-chakrapetch text-flash/55 tabular-nums cursor-help whitespace-nowrap", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade/50 shrink-0" }), _jsx("b", { className: "text-flash/80", children: compact(covered ?? 0) }), " games \u00B7 ", coverage, "% with build data"] }) }))] })), _jsxs("div", { className: "flex flex-wrap items-center gap-x-4 gap-y-1 mb-3.5 text-[9px] font-chakrapetch text-flash/40", children: [_jsxs("span", { children: [_jsx("b", { className: "text-jade", children: "52%" }), " winrate at this slot"] }), _jsxs("span", { children: [_jsx("b", { className: "text-jade", children: "+0.3" }), " lift vs champ average"] }), _jsxs("span", { children: [_jsx("b", { className: "text-flash/55", children: "59% \u00B7 2.9k" }), " bought here \u00B7 games"] }), _jsx("span", { className: "text-flash/25", children: "\u2014 click an item for its matchup analysis" })] }), children] }));
}
function compact(n) {
    if (n >= 1000)
        return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
}
