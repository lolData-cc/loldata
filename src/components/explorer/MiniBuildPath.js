import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// MiniBuildPath.tsx — a one-line "core build" strip for the result sidebar.
// Shows the most-picked item at each slot (1st → 2nd → 3rd …) compactly; the full
// path + alternatives + matchups live in the Deep dive.
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { runBuildPath } from "./graph";
import { itemIcon, itemName } from "./catalog";
import { CyberTip } from "./CyberTip";
export function MiniBuildPath({ graph }) {
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
            setRes(r);
            setPhase(r.slots.some((s) => s.length > 0) ? "ready" : "empty");
        })
            .catch(() => !cancelled && setPhase("empty"));
        return () => {
            cancelled = true;
        };
    }, [graph]);
    if (phase === "loading")
        return _jsx("div", { className: "h-[52px] grid place-items-center text-[10px] font-chakrapetch text-flash/30", children: "tracing build\u2026" });
    if (phase === "empty" || !res)
        return null;
    const path = res.slots.map((s) => s[0]).filter(Boolean).slice(0, 5);
    if (path.length === 0)
        return null;
    return (_jsxs("div", { className: "mb-3 pb-3 border-b border-white/[0.06]", children: [_jsx("div", { className: "text-[8px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-flash/40 mb-1.5", children: "Core build" }), _jsx("div", { className: "flex items-center gap-1", children: path.map((it, i) => (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(CyberTip, { tip: _jsxs(_Fragment, { children: [_jsx("b", { className: "text-flash", children: itemName(it.item) }), _jsx("br", {}), it.winrate, "% winrate \u00B7 ", it.pickrate, "% bought here \u00B7 ", it.games.toLocaleString(), " games"] }), children: _jsxs("div", { className: "flex flex-col items-center cursor-help", children: [_jsx("img", { src: itemIcon(it.item), onError: (e) => (e.target.style.visibility = "hidden"), className: cn("w-8 h-8 rounded-[5px] border", it.winrate >= 50 ? "border-jade/40" : "border-error/40"), alt: "" }), _jsxs("span", { className: cn("text-[8px] font-chakrapetch font-bold tabular-nums mt-0.5", it.winrate >= 50 ? "text-jade" : "text-error"), children: [it.winrate, "%"] })] }) }), i < path.length - 1 && _jsx(ChevronRight, { size: 11, className: "text-jade/45 shrink-0" })] }, it.item))) })] }));
}
