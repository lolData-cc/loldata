import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { damageRankedAt, fmtShortNum, staticParticipantByPid, teamOf } from "./derive";
export function DamageBars({ timeline, staticMatch, timeMs, focusedPid, onFocusPid, windowStart }) {
    // Baseline = cumulative damage at the window's leading edge. Captured
    // once per (timeline, windowStart) change so it's cheap to subtract
    // every frame as the playhead advances.
    const baseline = useMemo(() => {
        if (windowStart == null)
            return null;
        const arr = damageRankedAt(timeline, windowStart);
        const map = new Map();
        for (const r of arr)
            map.set(r.pid, r.dmg);
        return map;
    }, [timeline, windowStart]);
    const ranked = useMemo(() => {
        const current = damageRankedAt(timeline, timeMs);
        if (!baseline)
            return current;
        // Subtract per-pid baseline, clamp to 0 (the playhead can briefly
        // sit before windowStart between the seek and the next frame —
        // we don't want negative bars in that one-frame gap).
        return current
            .map((r) => ({ pid: r.pid, dmg: Math.max(0, r.dmg - (baseline.get(r.pid) ?? 0)) }))
            .sort((a, b) => b.dmg - a.dmg);
    }, [timeline, timeMs, baseline]);
    const maxDmg = ranked[0]?.dmg ?? 1;
    const totalDmg = ranked.reduce((s, r) => s + r.dmg, 0) || 1;
    return (_jsx("div", { className: "space-y-1.5", children: ranked.map(({ pid, dmg }) => {
            const sp = staticParticipantByPid(staticMatch, pid);
            if (!sp)
                return null;
            const pct = (dmg / maxDmg) * 100;
            const sharePct = Math.round((dmg / totalDmg) * 100);
            const teamTint = teamOf(pid) === 100 ? "#5BA8E6" : "#d63336";
            const isFocused = focusedPid === pid;
            return (_jsxs("button", { type: "button", onClick: () => onFocusPid?.(focusedPid === pid ? null : pid), className: cn("w-full flex items-center gap-2 px-1 py-0.5 rounded-sm hover:bg-flash/[0.05] transition-all cursor-clicker", isFocused && "bg-jade/[0.08] ring-1 ring-jade/30"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(sp.championName)}.png`, alt: sp.championName, className: "w-5 h-5 rounded-full ring-1", style: { boxShadow: `0 0 0 1px ${teamTint}aa` } }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2", children: [_jsx("span", { className: "text-[10px] font-chakrapetch font-medium tabular-nums text-flash/90", children: fmtShortNum(dmg) }), _jsxs("span", { className: "text-[8px] font-mono text-flash/30 tabular-nums", children: [sharePct, "%"] })] }), _jsx("div", { className: "h-1 mt-0.5 bg-flash/5 rounded-full overflow-hidden", children: _jsx("div", { className: "h-full rounded-full transition-all duration-200", style: { width: `${pct}%`, background: teamTint } }) })] })] }, pid));
        }) }));
}
