import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useStatsBarPrefs } from "@/hooks/useStatsBarPrefs";
import { CyberToggle } from "@/components/cybertoggle";
import { STATS_BAR_STAT_KEYS } from "@/lib/uiPrefs";
import { cn } from "@/lib/utils";
import { SettingsCard } from "@/components/ui/settings-card";
const STAT_LABELS = {
    kda: "KDA",
    kp: "KP",
    csm: "CS/M",
    dmg: "DMG",
    vis: "VIS",
};
export function StatsBarPreference() {
    const { hidden, setHidden, visibleStats, toggleStat } = useStatsBarPrefs();
    return (_jsx(SettingsCard, { title: "Stats Summary Bar", children: _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Show the stats bar with win rate and averages below the filter bar." }) }), _jsx(CyberToggle, { checked: !hidden, onChange: (v) => setHidden(!v) })] }), !hidden && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsxs("div", { className: "pt-3 pb-1", children: [_jsx("p", { className: "text-[9px] font-mono tracking-[0.15em] uppercase text-flash/25 mb-2", children: "Visible stats" }), _jsx("div", { className: "flex flex-wrap gap-2", children: STATS_BAR_STAT_KEYS.map((key) => (_jsx("button", { type: "button", onClick: () => toggleStat(key), className: cn("px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-[0.1em] uppercase cursor-clicker", "border transition-all duration-200", visibleStats[key]
                                            ? "border-jade/30 bg-jade/10 text-jade shadow-[0_0_6px_rgba(0,217,146,0.15)]"
                                            : "border-flash/10 bg-flash/[0.02] text-flash/25 hover:text-flash/40"), children: STAT_LABELS[key] }, key))) })] })] }))] }) }));
}
