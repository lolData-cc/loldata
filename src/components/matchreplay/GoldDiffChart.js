import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
import { goldDiffSeries, fmtClock, fmtShortNum } from "./derive";
export function GoldDiffChart({ timeline, durationMs, timeMs, onSeek }) {
    const series = useMemo(() => goldDiffSeries(timeline), [timeline]);
    const maxAbs = useMemo(() => Math.max(1000, ...series.map((g) => Math.abs(g.diff))), [series]);
    const [hover, setHover] = useState(null);
    const svgRef = useRef(null);
    // Viewbox 0..1000 × 0..200. Mid axis at y=100, ±100 amplitude.
    const W = 1000, H = 200, MID = 100, AMP = 90;
    const xOf = (t) => (t / Math.max(1, durationMs)) * W;
    const yOf = (d) => MID - (d / maxAbs) * AMP;
    const path = useMemo(() => {
        if (!series.length)
            return "";
        let d = "";
        series.forEach((g, i) => {
            d += `${i === 0 ? "M" : "L"}${xOf(g.t).toFixed(1)},${yOf(g.diff).toFixed(1)} `;
        });
        return d;
    }, [series, durationMs, maxAbs]);
    const areaPath = useMemo(() => path && `${path} L${W},${MID} L0,${MID} Z`, [path]);
    const playheadX = xOf(timeMs);
    const onMove = (e) => {
        const el = svgRef.current;
        if (!el)
            return;
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, px / rect.width));
        const t = pct * durationMs;
        // find nearest sample
        let nearest = series[0];
        let nearDist = Infinity;
        for (const s of series) {
            const dd = Math.abs(s.t - t);
            if (dd < nearDist) {
                nearDist = dd;
                nearest = s;
            }
        }
        setHover({ x: pct * W, t: nearest.t, diff: nearest.diff });
    };
    const onClick = () => { if (hover)
        onSeek(hover.t); };
    // Minute gridlines.
    const gridX = [];
    for (let t = 0; t <= durationMs; t += 300_000)
        gridX.push(t); // every 5 min
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("div", { className: "text-[10px] font-mono uppercase tracking-[0.2em] text-flash/50", children: "Gold Difference" }), _jsxs("div", { className: "text-[10px] font-mono tabular-nums text-flash/50", children: ["peak \u00B1", fmtShortNum(maxAbs)] })] }), _jsxs("svg", { ref: svgRef, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", className: "w-full h-48 cursor-crosshair", onPointerMove: onMove, onPointerLeave: () => setHover(null), onClick: onClick, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "gdBigBlue", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#5BA8E6", stopOpacity: "0.5" }), _jsx("stop", { offset: "100%", stopColor: "#5BA8E6", stopOpacity: "0" })] }), _jsxs("linearGradient", { id: "gdBigRed", x1: "0", y1: "1", x2: "0", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "#d63336", stopOpacity: "0.5" }), _jsx("stop", { offset: "100%", stopColor: "#d63336", stopOpacity: "0" })] }), _jsx("clipPath", { id: "gdBigAbove", children: _jsx("rect", { x: "0", y: "0", width: W, height: MID }) }), _jsx("clipPath", { id: "gdBigBelow", children: _jsx("rect", { x: "0", y: MID, width: W, height: H - MID }) })] }), gridX.map((t, i) => (_jsx("line", { x1: xOf(t), x2: xOf(t), y1: 0, y2: H, stroke: "rgba(255,255,255,0.04)", strokeWidth: "0.5" }, i))), _jsx("line", { x1: 0, x2: W, y1: MID, y2: MID, stroke: "rgba(255,255,255,0.18)", strokeWidth: "0.8", strokeDasharray: "2 3" }), areaPath && (_jsxs(_Fragment, { children: [_jsx("path", { d: areaPath, fill: "url(#gdBigBlue)", clipPath: "url(#gdBigAbove)" }), _jsx("path", { d: areaPath, fill: "url(#gdBigRed)", clipPath: "url(#gdBigBelow)" })] })), _jsx("path", { d: path, fill: "none", stroke: "rgba(0,217,146,0.9)", strokeWidth: "1.2", vectorEffect: "non-scaling-stroke" }), _jsx("line", { x1: playheadX, x2: playheadX, y1: 0, y2: H, stroke: "rgba(0,217,146,0.9)", strokeWidth: "1.2", vectorEffect: "non-scaling-stroke" }), hover && (_jsxs(_Fragment, { children: [_jsx("line", { x1: hover.x, x2: hover.x, y1: 0, y2: H, stroke: "rgba(255,255,255,0.35)", strokeWidth: "0.6", strokeDasharray: "2 2", vectorEffect: "non-scaling-stroke" }), _jsx("circle", { cx: hover.x, cy: yOf(hover.diff), r: "3", fill: "#00d992" })] })), _jsx("text", { x: "6", y: "14", fontSize: "10", fill: "#5BA8E6", opacity: "0.8", fontFamily: "ui-monospace", children: "Blue ahead" }), _jsx("text", { x: "6", y: H - 6, fontSize: "10", fill: "#d63336", opacity: "0.8", fontFamily: "ui-monospace", children: "Red ahead" })] }), hover && (_jsxs("div", { className: "font-mono text-[10px] text-flash/70 tabular-nums", children: [_jsx("span", { className: "text-jade", children: fmtClock(hover.t) }), " — ", _jsxs("span", { className: hover.diff >= 0 ? "text-[#5BA8E6]" : "text-[#d63336]", children: [hover.diff >= 0 ? "Blue" : "Red", " +", fmtShortNum(Math.abs(hover.diff)), " gold"] })] }))] }));
}
