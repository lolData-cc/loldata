import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { motion } from "framer-motion";
export function KDASparkline({ data, delay = 0 }) {
    if (!data.length)
        return null;
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay }, className: "relative bg-black/30 border border-flash/[0.06] rounded-sm p-3 overflow-hidden", children: [_jsx("span", { className: "text-[9px] font-mono tracking-[0.2em] uppercase text-flash/30 mb-2 block", children: "KDA PER GAME" }), _jsx("div", { className: "h-32", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(AreaChart, { data: data, margin: { top: 4, right: 4, left: -20, bottom: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "kdaGrad", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#00d992", stopOpacity: 0.3 }), _jsx("stop", { offset: "100%", stopColor: "#00d992", stopOpacity: 0 })] }) }), _jsx(XAxis, { dataKey: "game", tick: { fill: "rgba(191,197,198,0.3)", fontSize: 9, fontFamily: "JetBrains Mono" }, axisLine: { stroke: "rgba(191,197,198,0.06)" }, tickLine: false, tickFormatter: (v) => `G${v}` }), _jsx(YAxis, { tick: { fill: "rgba(191,197,198,0.3)", fontSize: 9, fontFamily: "JetBrains Mono" }, axisLine: false, tickLine: false, domain: [0, "auto"] }), _jsx(ReferenceLine, { y: 3, stroke: "rgba(0,217,146,0.15)", strokeDasharray: "3 3" }), _jsx(Tooltip, { contentStyle: {
                                    background: "#0a0a0a",
                                    border: "1px solid rgba(191,197,198,0.1)",
                                    borderRadius: 2,
                                    fontSize: 11,
                                    fontFamily: "JetBrains Mono",
                                }, labelStyle: { color: "rgba(191,197,198,0.5)" }, formatter: (value, _, entry) => {
                                    const p = entry.payload;
                                    return [`${Number(value).toFixed(2)} KDA — ${p.champion} (${p.win ? "W" : "L"})`, ""];
                                }, labelFormatter: (v) => `Game ${v}` }), _jsx(Area, { type: "monotone", dataKey: "kda", stroke: "#00d992", strokeWidth: 1.5, fill: "url(#kdaGrad)", dot: { r: 3, fill: "#00d992", stroke: "none" }, activeDot: { r: 5, fill: "#00d992", stroke: "#0a0a0a", strokeWidth: 2 } })] }) }) })] }));
}
