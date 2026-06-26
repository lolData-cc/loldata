import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";
const ROLE_COLORS = {
    TOP: "#00d992",
    JUNGLE: "#f59e0b",
    MIDDLE: "#8b5cf6",
    BOTTOM: "#ef4444",
    UTILITY: "#3b82f6",
    UNKNOWN: "rgba(191,197,198,0.3)",
};
const ROLE_LABELS = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "ADC",
    UTILITY: "Support",
    UNKNOWN: "Other",
};
export function RoleDistribution({ data, delay = 0 }) {
    if (!data.length)
        return null;
    const total = data.reduce((s, d) => s + d.games, 0);
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay }, className: "relative bg-black/30 border border-flash/[0.06] rounded-sm p-3 overflow-hidden", children: [_jsx("span", { className: "text-[9px] font-mono tracking-[0.2em] uppercase text-flash/30 mb-1 block", children: "ROLES PLAYED" }), _jsxs("div", { className: "flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3", children: [_jsx("div", { className: "w-16 h-16 sm:w-20 sm:h-20 shrink-0", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(PieChart, { children: [_jsx(Pie, { data: data, dataKey: "games", nameKey: "role", cx: "50%", cy: "50%", innerRadius: 22, outerRadius: 36, strokeWidth: 0, children: data.map((d, i) => (_jsx(Cell, { fill: ROLE_COLORS[d.role] ?? ROLE_COLORS.UNKNOWN }, i))) }), _jsx(Tooltip, { contentStyle: {
                                            background: "#0a0a0a",
                                            border: "1px solid rgba(191,197,198,0.1)",
                                            borderRadius: 2,
                                            fontSize: 10,
                                            fontFamily: "JetBrains Mono",
                                        }, formatter: (value, name) => [`${value} games`, ROLE_LABELS[name] ?? name] })] }) }) }), _jsx("div", { className: "flex flex-col gap-1", children: data.sort((a, b) => b.games - a.games).map((d) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 rounded-full", style: { background: ROLE_COLORS[d.role] ?? ROLE_COLORS.UNKNOWN } }), _jsxs("span", { className: "text-[10px] font-mono text-flash/50", children: [ROLE_LABELS[d.role] ?? d.role, " ", _jsxs("span", { className: "text-flash/25", children: [d.games, "g"] })] })] }, d.role))) })] })] }));
}
