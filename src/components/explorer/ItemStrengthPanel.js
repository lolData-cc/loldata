import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ItemStrengthPanel.tsx — "when is this item good?"
//
// A focused overlay that, for one item on the subject champion, shows the
// CONDITIONAL strengths: how the item's winrate shifts depending on the enemy
// composition (≥N of each class, ≥3 AD / AP champions). Each verdict is gated by
// a two-proportion z-test on the backend, so only statistically real shifts are
// flagged "strong"/"weak"; the rest are shown muted as "no clear effect".
import { useEffect, useState } from "react";
import { X, ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { runItemStrength } from "./graph";
import { itemIcon, itemName, categoryIcon, categoryHasIcon } from "./catalog";
// Only the 6 roster classes have icons; AD/AP/Melee/Ranged fall through to a text badge.
const isClass = categoryHasIcon;
export function ItemStrengthPanel({ graph, itemId, onClose, }) {
    const [res, setRes] = useState(null);
    const [phase, setPhase] = useState("loading");
    useEffect(() => {
        let cancelled = false;
        setPhase("loading");
        setRes(null);
        runItemStrength(graph, itemId)
            .then((r) => {
            if (cancelled)
                return;
            setRes(r);
            setPhase("ready");
        })
            .catch(() => !cancelled && setPhase("error"));
        return () => {
            cancelled = true;
        };
    }, [graph, itemId]);
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    const significant = res?.verdicts.filter((v) => v.significant) ?? [];
    const rest = res?.verdicts.filter((v) => !v.significant) ?? [];
    return (_jsxs("div", { className: "absolute inset-0 z-[30] grid place-items-center p-4", style: { animation: "deepDiveExpand 0.28s cubic-bezier(0.16,1,0.3,1)" }, children: [_jsx("div", { className: "absolute inset-0 bg-black/55 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "relative w-[calc(100vw-1.5rem)] sm:w-full sm:max-w-[560px] max-h-[86vh] overflow-y-auto cyber-scrollbar rounded-[14px] border border-jade/20 bg-[rgba(6,12,14,0.97)] p-5 shadow-[0_0_40px_rgba(0,0,0,0.6)]", children: [_jsxs("div", { className: "flex items-start gap-3 pb-4 mb-4 border-b border-white/[0.07]", children: [_jsx("img", { src: itemIcon(itemId), onError: (e) => (e.target.style.visibility = "hidden"), className: "w-12 h-12 rounded-[7px] border border-jade/40 shrink-0", style: { boxShadow: "0 0 14px rgba(0,217,146,0.22)" }, alt: "" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-[8px] font-chakrapetch font-bold tracking-[0.24em] uppercase text-jade/60", children: "Item analysis" }), _jsx("h3", { className: "font-chakrapetch font-bold text-[18px] leading-tight text-flash truncate", children: itemName(itemId) }), res && res.builderGames > 0 && (_jsxs("div", { className: "mt-1 flex items-center gap-2 text-[11px] font-chakrapetch text-flash/55", children: [_jsxs("span", { className: "font-bold tabular-nums text-flash", children: [res.builderWinrate, "%"] }), _jsx("span", { className: "text-flash/30", children: "base WR \u00B7" }), _jsx("span", { className: "tabular-nums", children: res.builderGames.toLocaleString() }), _jsxs("span", { className: "text-flash/30", children: ["games on ", graph.subject.champion] })] }))] }), _jsx("button", { onClick: onClose, title: "Close (Esc)", className: "shrink-0 grid place-items-center w-8 h-8 rounded-[6px] border border-white/10 text-flash/45 hover:text-flash hover:border-white/25 transition-colors cursor-clicker", children: _jsx(X, { size: 16 }) })] }), phase === "loading" && _jsx("div", { className: "h-[160px] grid place-items-center text-[11px] font-chakrapetch text-flash/35", children: "analysing matchups\u2026" }), phase === "error" && _jsx("div", { className: "h-[120px] grid place-items-center text-[11px] font-chakrapetch text-flash/35", children: "Analysis unavailable." }), phase === "ready" && res && !res.ready && (_jsx("div", { className: "h-[100px] grid place-items-center text-center text-[11px] font-chakrapetch text-flash/35 px-4", children: "Champion class data still loading \u2014 try again in a moment." })), phase === "ready" && res && res.ready && res.builderGames < 50 && (_jsxs("div", { className: "h-[100px] grid place-items-center text-center text-[11px] font-chakrapetch text-flash/35 px-4", children: ["Not enough games on ", itemName(itemId), " to judge matchups (", res.builderGames, " games)."] })), phase === "ready" && res && res.ready && res.builderGames >= 50 && (_jsxs("div", { className: "flex flex-col gap-2.5", children: [significant.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-flash/45", children: "Situational verdicts" }), significant.map((v) => (_jsx(VerdictRow, { v: v }, v.category)))] })) : (_jsx("div", { className: "rounded-[9px] border border-white/[0.07] bg-black/30 px-4 py-3 text-[11.5px] font-chakrapetch text-flash/55 leading-relaxed", children: "No enemy-composition produced a statistically significant winrate shift for this item \u2014 it performs about the same regardless of who you face (or the per-matchup samples are still too small to call)." })), rest.length > 0 && (_jsxs("details", { className: "mt-1 group", children: [_jsxs("summary", { className: "cursor-clicker text-[10px] font-chakrapetch font-bold uppercase tracking-[0.14em] text-flash/35 hover:text-flash/60 transition-colors list-none", children: ["+ show all ", res.verdicts.length, " matchup splits"] }), _jsx("div", { className: "mt-2 flex flex-col gap-1.5", children: rest.map((v) => (_jsx(VerdictRow, { v: v, muted: true }, v.category))) })] })), _jsx("p", { className: "mt-1 text-[9.5px] font-chakrapetch text-flash/25 leading-relaxed", children: "\"Strong/weak\" requires a significant two-proportion test (95%) with \u2265100 games each side \u2014 small or noisy splits are shown muted, not flagged." })] }))] })] }));
}
function VerdictRow({ v, muted }) {
    const strong = v.direction === "strong";
    const weak = v.direction === "weak";
    const accent = strong ? "#00d992" : weak ? "#ff6286" : "#8a9096";
    return (_jsxs("div", { className: cn("flex items-center gap-3 rounded-[9px] border px-3 py-2.5", muted ? "border-white/[0.05] bg-black/20 opacity-70" : strong ? "border-jade/25 bg-jade/[0.05]" : weak ? "border-error/25 bg-error/[0.05]" : "border-white/[0.07] bg-black/30"), children: [_jsx("div", { className: "shrink-0 w-8 grid place-items-center", children: isClass(v.category) ? (_jsx("img", { src: categoryIcon(v.category), onError: (e) => (e.target.style.display = "none"), className: "w-7 h-7 object-contain", alt: v.category })) : (_jsx("span", { className: "px-1.5 py-0.5 rounded-[4px] border border-white/15 text-[9px] font-chakrapetch font-bold text-flash/70", children: v.category })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[12.5px] font-chakrapetch font-bold text-flash truncate", children: v.label }), !muted && (strong || weak) && (_jsxs("span", { className: cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[8px] font-chakrapetch font-bold uppercase tracking-[0.1em]", strong ? "bg-jade/15 text-jade" : "bg-error/15 text-error"), children: [strong ? _jsx(ShieldCheck, { size: 10 }) : _jsx(ShieldAlert, { size: 10 }), strong ? "strong" : "weak"] }))] }), _jsxs("div", { className: "mt-0.5 text-[10px] font-chakrapetch text-flash/45 tabular-nums", children: [v.winrateIn, "% with \u00B7 ", v.winrateOut, "% without \u00B7 n=", compact(v.gamesIn), "/", compact(v.gamesOut)] })] }), _jsxs("div", { className: "shrink-0 text-right", children: [_jsxs("div", { className: "text-[15px] font-chakrapetch font-bold tabular-nums", style: { color: accent }, children: [v.delta >= 0 ? "+" : "", v.delta.toFixed(1)] }), _jsx("div", { className: "text-[8px] font-chakrapetch uppercase tracking-[0.1em] text-flash/30", children: "pp shift" })] })] }));
}
function compact(n) {
    if (n >= 1000)
        return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
}
