import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Read-only renderer for a full standard LoL rune page (keystone + primary tree
// + secondary tree + stat shards). Extracted so both the champion Build tab and
// the LOLDATA AI chat (rune_page embed) render runes identically.
//
// `page` matches the backend's precise-rune shape:
//   { keystone, primaryStyle, subStyle, primary[], secondary[], shards[] }
// `trees` comes from useRuneTrees(); `perkWr` is an optional per-perk winrate
// map for tooltips (pass an empty Map when you don't have it).
import { PERK_CDN } from "@/config";
import { CyberTip } from "@/components/explorer/CyberTip";
import { cn } from "@/lib/utils";
const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
// NB: Riot's StatMods icon FILES are misleadingly named — "HealthScalingIcon" is
// the PLAIN heart (flat +Health), while "HealthPlusIcon" is the heart-with-up-arrow
// (scales with level). So by ARTWORK: flat Health (5011) → HealthScaling file,
// Health Scaling (5001) → HealthPlus file. Looks swapped by filename, correct on screen.
const SHARD_ROWS = [
    [
        { id: 5008, icon: "StatModsAdaptiveForceIcon.png", name: "Adaptive Force" },
        { id: 5005, icon: "StatModsAttackSpeedIcon.png", name: "Attack Speed" },
        { id: 5007, icon: "StatModsCDRScalingIcon.png", name: "Ability Haste" },
    ],
    [
        { id: 5008, icon: "StatModsAdaptiveForceIcon.png", name: "Adaptive Force" },
        { id: 5010, icon: "StatModsMovementSpeedIcon.png", name: "Move Speed" },
        { id: 5001, icon: "StatModsHealthPlusIcon.png", name: "Health Scaling" },
    ],
    [
        { id: 5011, icon: "StatModsHealthScalingIcon.png", name: "Health" },
        { id: 5013, icon: "StatModsTenacityIcon.png", name: "Tenacity" },
        { id: 5001, icon: "StatModsHealthPlusIcon.png", name: "Health Scaling" },
    ],
];
// ── one rune node in the tree — lit when selected, dimmed otherwise. ──
function RuneNode({ rune, active, size, wr }) {
    return (_jsx(CyberTip, { tip: _jsxs(_Fragment, { children: [_jsx("div", { className: "font-bold text-flash/90", children: rune.name }), wr && _jsxs("div", { className: "mt-0.5 text-flash/55", children: [wr.winrate.toFixed(1), "% WR \u00B7 ", fmt(wr.games), " games"] })] }), children: _jsx("div", { className: cn("relative grid place-items-center rounded-full transition-all", active ? "ring-2 ring-jade/70 bg-jade/10" : ""), style: { width: size + 6, height: size + 6 }, children: _jsx("img", { src: `${PERK_CDN}/${rune.icon}`, alt: rune.name, width: size, height: size, loading: "lazy", className: cn("rounded-full transition-all", active ? "opacity-100" : "opacity-25 grayscale"), onError: (e) => { e.currentTarget.style.opacity = "0.15"; } }) }) }));
}
// ── a primary or secondary tree column (LoL-standard layout). ──
function TreeColumn({ tree, page, perkWr, primary }) {
    const sel = new Set(primary ? page.primary : page.secondary);
    return (_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3 justify-center", children: [_jsx("img", { src: `${PERK_CDN}/${tree.icon}`, alt: "", className: "w-5 h-5", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsx("span", { className: "text-[11px] font-chakrapetch font-bold uppercase tracking-[0.18em] text-flash/70", children: tree.name })] }), primary && (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex items-center justify-center gap-2 mb-3", children: tree.keystones.map((k) => (_jsx(RuneNode, { rune: k, active: k.id === page.keystone, size: 42, wr: perkWr.get(k.id) }, k.id))) }), _jsx("div", { className: "h-px bg-flash/[0.06] mb-3" })] })), _jsx("div", { className: "space-y-2.5", children: tree.rows.map((row, ri) => (_jsx("div", { className: "flex items-center justify-center gap-3", children: row.map((r) => _jsx(RuneNode, { rune: r, active: sel.has(r.id), size: primary ? 30 : 28, wr: perkWr.get(r.id) }, r.id)) }, ri))) })] }));
}
// ── the full rune page: two trees + shards, exactly the in-client structure. ──
export function RunePageTree({ page, trees, perkWr }) {
    const wr = perkWr ?? new Map();
    const primaryTree = trees.find((t) => t.id === page.primaryStyle);
    const subTree = trees.find((t) => t.id === page.subStyle);
    if (!primaryTree || !subTree)
        return null;
    return (_jsx("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-5", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-6", children: [_jsx(TreeColumn, { tree: primaryTree, page: page, perkWr: wr, primary: true }), _jsx("div", { className: "hidden sm:block w-px bg-flash/[0.06]" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx(TreeColumn, { tree: subTree, page: page, perkWr: wr, primary: false }), _jsx("div", { className: "h-px bg-flash/[0.06] my-3" }), _jsx("div", { className: "space-y-2", children: SHARD_ROWS.map((row, ri) => (_jsx("div", { className: "flex items-center justify-center gap-3", children: row.map((s) => {
                                    const active = page.shards[ri] === s.id;
                                    return (_jsx(CyberTip, { tip: s.name, children: _jsx("div", { className: cn("grid place-items-center rounded-full transition-all", active ? "ring-2 ring-jade/70 bg-jade/10" : ""), style: { width: 26, height: 26 }, children: _jsx("img", { src: `${PERK_CDN}/StatMods/${s.icon}`, alt: s.name, className: cn("w-5 h-5 transition-all", active ? "opacity-100" : "opacity-25 grayscale"), onError: (e) => { e.currentTarget.style.opacity = "0.15"; } }) }) }, `${ri}-${s.id}`));
                                }) }, ri))) })] })] }) }));
}
