import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authcontext";
import { BOX_API_BASE_URL, cdnBaseUrl, summonerSpellUrl, PERK_CDN } from "@/config";
import { getKeystoneIcon, getStyleIcon, getKeystoneName } from "@/constants/runes";
import { useRuneTrees } from "@/constants/runeData";
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons";
import { ChampionDialog } from "@/components/champion-dialog";
import { Swords, ChevronDown, Lock, ArrowRight, HelpCircle } from "lucide-react";
import { ExplorerTutorial } from "@/components/explorer-tutorial";
import { motion, AnimatePresence } from "framer-motion";
import { CyberTip } from "@/components/explorer/CyberTip";
import { PatchTag } from "@/components/patch-tag";
import { cn } from "@/lib/utils";
import RuneImportButton from "@/components/rune-import-button";
const FILTER_REGIONS = [
    { key: "euw1", label: "EUW" }, { key: "na1", label: "NA" }, { key: "kr", label: "KR" },
    { key: "jp1", label: "JP" }, { key: "br1", label: "BR" }, { key: "oc1", label: "OCE" }, { key: "tr1", label: "TR" }, { key: "ru", label: "RU" },
];
// compact cyber dropdown for the patch / region filters
function FilterDropdown({ value, options, onChange, allLabel }) {
    const [open, setOpen] = useState(false);
    const cur = value ? options.find((o) => o.value === value)?.label ?? value : allLabel;
    return (_jsxs("div", { className: "relative", children: [_jsxs("button", { type: "button", onClick: () => setOpen((o) => !o), className: cn("flex items-center gap-1 pl-2.5 pr-2 py-1.5 rounded-sm text-[11px] font-chakrapetch font-bold uppercase tracking-[0.12em] border cursor-pointer transition-colors", value ? "text-jade border-jade/40 bg-jade/10" : "text-flash/55 border-flash/10 hover:text-flash/80 hover:border-flash/20"), children: [cur, _jsx(ChevronDown, { className: "w-3 h-3 opacity-60" })] }), open && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-20", onClick: () => setOpen(false) }), _jsxs("div", { className: "absolute left-0 top-full mt-1 z-30 min-w-[130px] max-h-[280px] overflow-y-auto rounded-md border border-flash/15 bg-[#0a1416] shadow-xl py-1 cyber-scrollbar", children: [_jsx("button", { type: "button", onClick: () => { onChange(null); setOpen(false); }, className: cn("w-full text-left px-3 py-1.5 text-[11px] font-chakrapetch hover:bg-jade/10", !value ? "text-jade" : "text-flash/55"), children: allLabel }), options.map((o) => (_jsx("button", { type: "button", onClick: () => { onChange(o.value); setOpen(false); }, className: cn("w-full text-left px-3 py-1.5 text-[11px] font-chakrapetch hover:bg-jade/10", value === o.value ? "text-jade" : "text-flash/55"), children: o.label }, o.value)))] })] }))] }));
}
const ROLE_ICON = {
    TOP: RoleTopIcon, JUNGLE: RoleJungleIcon, MIDDLE: RoleMidIcon, BOTTOM: RoleAdcIcon, UTILITY: RoleSupportIcon,
};
// Below this a component is a one-off somebody happened to buy, not the reason
// the clear was cut short.
const BACK_ITEM_MIN_PCT = 10;
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));
function wrClass(wr) {
    if (wr >= 53)
        return "text-jade";
    if (wr >= 50.5)
        return "text-[#7bd9b0]";
    if (wr >= 49)
        return "text-flash/70";
    return "text-[#ff6286]";
}
const ROLE_LABEL = { TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "Bot", UTILITY: "Support" };
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"];
const ORD_WORD = ["", "FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH", "SIXTH"];
// Stat shards (not in runesReforged) — standard 3 rows, served from StatMods.
// NB: Riot's icon FILES are misnamed — "HealthScalingIcon" is the PLAIN heart (flat
// +Health), "HealthPlusIcon" is the heart-with-up-arrow (scales with level). So by
// ARTWORK: flat Health (5011) → HealthScaling file, Health Scaling (5001) → HealthPlus file.
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
function SectionTitle({ children, hint, action }) {
    return (_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("h3", { className: "text-[11px] font-chakrapetch font-bold uppercase tracking-[0.22em] text-jade/70 whitespace-nowrap", children: children }), hint && _jsx("span", { className: "text-[11px] font-chakrapetch font-medium tracking-wide text-flash/55 whitespace-nowrap truncate", children: hint }), _jsx("span", { className: "h-px flex-1 bg-gradient-to-r from-jade/15 to-transparent" }), action] }));
}
function ItemIcon({ id, size = 44, names }) {
    return (_jsx(CyberTip, { tip: names[id] ?? String(id), children: _jsxs("span", { className: "relative inline-block", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: names[id] ?? String(id), width: size, height: size, loading: "lazy", className: "rounded-md ring-1 ring-flash/10 bg-filmdark/30", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsx(PatchTag, { kind: "item", id: id })] }) }));
}
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
function RunePageTree({ page, trees, perkWr }) {
    const primaryTree = trees.find((t) => t.id === page.primaryStyle);
    const subTree = trees.find((t) => t.id === page.subStyle);
    if (!primaryTree || !subTree)
        return null;
    return (_jsx("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-5", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-6", children: [_jsx(TreeColumn, { tree: primaryTree, page: page, perkWr: perkWr, primary: true }), _jsx("div", { className: "hidden sm:block w-px bg-flash/[0.06]" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx(TreeColumn, { tree: subTree, page: page, perkWr: perkWr, primary: false }), _jsx("div", { className: "h-px bg-flash/[0.06] my-3" }), _jsx("div", { className: "space-y-2", children: SHARD_ROWS.map((row, ri) => (_jsx("div", { className: "flex items-center justify-center gap-3", children: row.map((s) => {
                                    const active = page.shards[ri] === s.id;
                                    return (_jsx(CyberTip, { tip: s.name, children: _jsx("div", { className: cn("grid place-items-center rounded-full transition-all", active ? "ring-2 ring-jade/70 bg-jade/10" : ""), style: { width: 26, height: 26 }, children: _jsx("img", { src: `${PERK_CDN}/StatMods/${s.icon}`, alt: s.name, className: cn("w-5 h-5 transition-all", active ? "opacity-100" : "opacity-25 grayscale"), onError: (e) => { e.currentTarget.style.opacity = "0.15"; } }) }) }, `${ri}-${s.id}`));
                                }) }, ri))) })] })] }) }));
}
function BuildPathStrip({ path, boots, bootsSlot, names }) {
    // Dedup legendaries into a coherent sequence: each slot takes its most-common
    // item not already used (you can't build the same item twice).
    const used = new Set();
    const steps = [];
    let ord = 0;
    for (const s of path) {
        const top = s.items.find((it) => !used.has(it.item));
        if (!top)
            continue;
        used.add(top.item);
        ord++;
        const alts = s.items.filter((a) => a.item !== top.item).slice(0, 2).filter((a) => a.games >= Math.max(15, top.games * 0.06));
        steps.push({ item: top.item, winrate: top.winrate, games: top.games, ord, alts });
    }
    // Interleave boots at their typical build position (1 = boots first). Only when
    // we have the boots_slot data (fills in over time as new matches are ingested).
    if (boots && bootsSlot && bootsSlot >= 1) {
        const idx = Math.min(bootsSlot - 1, steps.length);
        steps.splice(idx, 0, { item: boots.item_id, winrate: boots.winrate, games: boots.games ?? 0, isBoots: true, alts: [] });
    }
    return (_jsx("div", { className: "flex items-start gap-0 overflow-x-auto pb-2", children: steps.map((s, i) => (_jsxs("div", { className: "flex items-start shrink-0", children: [_jsxs("div", { className: "flex flex-col items-center gap-1.5 min-w-[70px]", children: [_jsx("span", { className: cn("text-[9px] font-chakrapetch font-bold uppercase tracking-[0.22em]", s.isBoots ? "text-citrine/80" : "text-jade/80"), style: { textShadow: s.isBoots ? "0 0 10px rgba(255,182,21,0.4)" : "0 0 10px rgba(0,217,146,0.4)" }, children: s.isBoots ? "BOOTS" : (ORD_WORD[s.ord ?? 0] ?? `${s.ord}TH`) }), _jsxs("div", { className: "relative", children: [_jsx("div", { className: cn("absolute -inset-[3px] rounded-lg ring-1 pointer-events-none", s.isBoots ? "ring-citrine/40 shadow-[0_0_14px_rgba(255,182,21,0.3)]" : "ring-jade/40 shadow-[0_0_14px_rgba(0,217,146,0.32)]") }), _jsx(ItemIcon, { id: s.item, size: 52, names: names })] }), _jsxs("span", { className: cn("text-[12px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(s.winrate)), children: [s.winrate.toFixed(1), "%"] }), s.games > 0 && _jsxs("span", { className: "text-[8px] text-flash/35 tabular-nums leading-none", children: [fmt(s.games), " games"] }), s.alts.length > 0 && (_jsx("div", { className: "flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-flash/[0.06]", children: s.alts.map((a) => (_jsxs("div", { className: "flex flex-col items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity", children: [_jsx(ItemIcon, { id: a.item, size: 26, names: names }), _jsxs("span", { className: cn("text-[8px] font-chakrapetch tabular-nums leading-none", wrClass(a.winrate)), children: [a.winrate.toFixed(0), "%"] })] }, a.item))) }))] }), i < steps.length - 1 && (_jsx("div", { className: "self-start mt-[34px] mx-1 w-8 h-[3px] rounded-full relative overflow-hidden bg-gradient-to-r from-jade/60 via-jade/25 to-jade/60 shadow-[0_0_10px_rgba(0,217,146,0.6)]", children: _jsx("div", { className: "absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent", style: { animation: "flow 1.8s linear infinite" } }) }))] }, `${s.item}-${i}`))) }));
}
const kfmt = (n) => (n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString());
// One performance metric: big value + a bar whose fill is this champ and whose
// tick marks the role average, plus a Δ% badge (jade when better than average).
function StatBar({ label, value, display, baseline, higherBetter = true, unit = "" }) {
    const hasCmp = value != null && baseline != null && baseline > 0;
    const domain = hasCmp ? Math.max(value, baseline) * 1.5 : ((value ?? 0) * 1.2 || 1);
    const fill = value != null ? Math.min(100, (value / domain) * 100) : 0;
    const mark = hasCmp ? Math.min(100, (baseline / domain) * 100) : null;
    const delta = hasCmp ? ((value - baseline) / baseline) * 100 : null;
    const good = delta == null ? null : higherBetter ? delta >= 0 : delta <= 0;
    return (_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-baseline justify-between gap-2", children: [_jsx("span", { className: "text-[9px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-flash/35 truncate", children: label }), delta != null && (_jsxs("span", { className: cn("text-[9px] font-jetbrains tabular-nums shrink-0", good ? "text-jade/80" : "text-flash/30"), children: [delta >= 0 ? "+" : "", delta.toFixed(0), "%"] }))] }), _jsxs("div", { className: "mt-0.5 flex items-baseline gap-1", children: [_jsx("span", { className: "text-[16px] font-chakrapetch font-bold tabular-nums text-flash/90 leading-none", children: display }), unit && _jsx("span", { className: "text-[9px] text-flash/30", children: unit })] }), _jsxs("div", { className: "mt-1.5 relative h-1 rounded-full bg-flash/[0.06]", children: [_jsx("div", { className: cn("absolute inset-y-0 left-0 rounded-full", good === false ? "bg-flash/25" : "bg-jade/60"), style: { width: `${fill}%` } }), mark != null && _jsx("div", { className: "absolute -top-[3px] h-[7px] w-px bg-flash/45", style: { left: `${mark}%` }, title: "role average" })] })] }));
}
function PerformanceSection({ s }) {
    const st = s.stats, bl = s.baseline;
    if (!st || !st.games)
        return null;
    const kda = st.deaths && st.deaths > 0 ? ((st.kills ?? 0) + (st.assists ?? 0)) / st.deaths : null;
    return (_jsxs("div", { children: [_jsx(SectionTitle, { hint: "per game \u00B7 tick = role average", children: "Performance" }), _jsxs("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 sm:p-5", children: [_jsxs("div", { className: "flex items-end gap-4 mb-4 pb-4 border-b border-flash/[0.06]", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[9px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-flash/35 mb-1", children: "KDA" }), _jsxs("div", { className: "font-chakrapetch font-bold tabular-nums text-flash/90", children: [_jsx("span", { className: "text-[22px]", children: st.kills?.toFixed(1) }), _jsx("span", { className: "text-flash/25 text-[15px]", children: " / " }), _jsx("span", { className: "text-[22px] text-[#ff6286]/90", children: st.deaths?.toFixed(1) }), _jsx("span", { className: "text-flash/25 text-[15px]", children: " / " }), _jsx("span", { className: "text-[22px]", children: st.assists?.toFixed(1) })] })] }), kda != null && (_jsxs("div", { className: "ml-auto text-right", children: [_jsx("div", { className: cn("text-[22px] font-chakrapetch font-bold tabular-nums leading-none", kda >= 3 ? "text-jade" : kda >= 2 ? "text-[#7bd9b0]" : "text-flash/70"), children: kda.toFixed(2) }), _jsx("div", { className: "text-[9px] font-jetbrains text-flash/30 uppercase tracking-[0.15em] mt-0.5", children: "KDA" })] }))] }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4", children: [_jsx(StatBar, { label: "Kill Part.", value: st.killParticipation, display: st.killParticipation != null ? `${st.killParticipation.toFixed(0)}%` : "—", baseline: bl?.killParticipation }), _jsx(StatBar, { label: "Dmg Share", value: st.damageShare, display: st.damageShare != null ? `${st.damageShare.toFixed(0)}%` : "—", baseline: bl?.damageShare }), _jsx(StatBar, { label: "Dmg/Champs", value: st.damageToChamps, display: kfmt(st.damageToChamps), baseline: bl?.damageToChamps }), _jsx(StatBar, { label: "Gold", value: st.gold, display: kfmt(st.gold), baseline: bl?.gold }), _jsx(StatBar, { label: "CS", value: st.cs, display: st.cs != null ? st.cs.toFixed(0) : "—", baseline: bl?.cs, unit: st.csPerMin != null ? `${st.csPerMin.toFixed(1)}/m` : "" }), _jsx(StatBar, { label: "Vision", value: st.vision, display: st.vision != null ? st.vision.toFixed(0) : "—", baseline: bl?.vision }), _jsx(StatBar, { label: "Solo Kills", value: st.soloKills, display: st.soloKills != null ? st.soloKills.toFixed(1) : "—", baseline: bl?.soloKills }), _jsx(StatBar, { label: "Avg Level", value: st.champLevel, display: st.champLevel != null ? st.champLevel.toFixed(1) : "—", baseline: bl?.champLevel })] })] })] }));
}
function Stat10({ label, val, d = 0 }) {
    return (_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-[9px] font-chakrapetch font-bold uppercase tracking-[0.14em] text-flash/35 truncate", children: label }), _jsx("div", { className: "text-[15px] font-chakrapetch font-bold tabular-nums text-flash/85 leading-tight", children: val == null ? "—" : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(d) })] }));
}
function LaningSection({ s, vsName }) {
    const l = s.laning, v = s.laningVs;
    if (!l || !l.games)
        return null;
    const Diff = ({ label, val }) => {
        if (val == null)
            return null;
        const pos = val >= 0;
        return (_jsxs("div", { className: "flex flex-col items-center justify-center px-2 py-2 rounded-md bg-filmdark/25", children: [_jsx("span", { className: "text-[9px] font-chakrapetch font-bold uppercase tracking-[0.14em] text-flash/35", children: label }), _jsxs("span", { className: cn("text-[18px] font-chakrapetch font-bold tabular-nums leading-tight", pos ? "text-jade" : "text-[#ff6286]"), children: [pos ? "+" : "", Math.round(val)] })] }));
    };
    return (_jsxs("div", { children: [_jsx(SectionTitle, { hint: v ? `${fmt(v.games)} games vs ${vsName}` : `@10 min · ${fmt(l.games)} games`, children: "Laning @ 10 min" }), _jsxs("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 sm:p-5", children: [v && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "text-[9px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-jade/60 mb-2", children: ["Lead vs ", vsName ?? "opponent", " @ 10"] }), _jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: [_jsx(Diff, { label: "Gold", val: v.goldDiff }), _jsx(Diff, { label: "CS", val: v.csDiff }), _jsx(Diff, { label: "XP", val: v.xpDiff }), _jsx(Diff, { label: "Damage", val: v.damageDiff })] }), _jsx("div", { className: "h-px bg-flash/[0.06] my-3.5" })] })), _jsxs("div", { className: "grid grid-cols-3 gap-x-4 gap-y-3", children: [_jsx(Stat10, { label: "Gold", val: l.gold }), _jsx(Stat10, { label: "CS", val: l.cs }), _jsx(Stat10, { label: "XP", val: l.xp }), _jsx(Stat10, { label: "Kills", val: l.kills, d: 1 }), _jsx(Stat10, { label: "Deaths", val: l.deaths, d: 1 }), _jsx(Stat10, { label: "Damage", val: l.damage })] })] })] }));
}
/** Monotone cubic interpolation (Fritsch-Carlson). A plain polyline made the
 *  trend look like a series of decisions; a Catmull-Rom spline would smooth it
 *  but overshoot, inventing peaks and dips the data never had. Monotone is the
 *  one that curves without ever leaving the range of its own points. */
function smoothPath(pts) {
    const n = pts.length;
    if (n < 2)
        return "";
    if (n === 2)
        return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    const dx = [], dy = [], slope = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1].x - pts[i].x;
        dy[i] = pts[i + 1].y - pts[i].y;
        slope[i] = dy[i] / dx[i];
    }
    const m = [slope[0]];
    for (let i = 1; i < n - 1; i++) {
        if (slope[i - 1] * slope[i] <= 0)
            m[i] = 0;
        else {
            const w1 = 2 * dx[i] + dx[i - 1];
            const w2 = dx[i] + 2 * dx[i - 1];
            m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
        }
    }
    m[n - 1] = slope[n - 2];
    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < n - 1; i++) {
        const c1x = pts[i].x + dx[i] / 3;
        const c1y = pts[i].y + (m[i] * dx[i]) / 3;
        const c2x = pts[i + 1].x - dx[i] / 3;
        const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
        d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`;
    }
    return d;
}
/** Win rate against game length.
 *
 *  Built around the 50% line rather than around the numbers: that line is the
 *  whole question, so it is the spine of the chart and everything else reads as
 *  a departure from it. The band between the curve and the spine is filled jade
 *  where the champion is winning and red where it is losing, with one clip per
 *  side of the line, so the fill changes colour exactly where the curve crosses
 *  even rather than at the nearest bucket boundary.
 *
 *  The strip along the bottom is how many games sit behind each bucket. It used
 *  to be reachable only by hovering a 3px dot, which hid the one thing that says
 *  whether the tail of the curve can be trusted at all. */
function GameLengthChart({ data }) {
    const [hover, setHover] = useState(null);
    const present = data.map((d, i) => ({ ...d, i })).filter((d) => d.winrate != null && d.games > 0);
    if (present.length < 2)
        return null;
    const W = 520, H = 208;
    const padL = 42, padR = 18, padT = 24;
    const stripH = 14, labelH = 16, gap = 10;
    const padB = stripH + labelH + gap;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    // Always keep 50 inside the range, and pad it out so a flat champion does not
    // get its noise magnified into a mountain range.
    const wrs = present.map((d) => d.winrate);
    const rawLo = Math.min(...wrs, 50);
    const rawHi = Math.max(...wrs, 50);
    const span = Math.max(rawHi - rawLo, 4);
    const mid = (rawHi + rawLo) / 2;
    const lo = mid - span * 0.72;
    const hi = mid + span * 0.72;
    const n = data.length;
    const mapX = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const mapY = (wr) => padT + (1 - (wr - lo) / (hi - lo)) * plotH;
    const y50 = mapY(50);
    const plotBottom = padT + plotH;
    const pts = present.map((d) => ({ x: mapX(d.i), y: mapY(d.winrate) }));
    const curve = smoothPath(pts);
    const band = `${curve} L ${pts[pts.length - 1].x.toFixed(2)} ${y50.toFixed(2)} L ${pts[0].x.toFixed(2)} ${y50.toFixed(2)} Z`;
    const maxGames = Math.max(...data.map((d) => d.games));
    const first = present[0];
    const last = present[present.length - 1];
    const swing = last.winrate - first.winrate;
    const colBand = plotW / Math.max(1, n - 1);
    return (_jsxs("div", { children: [_jsx(SectionTitle, { hint: "win rate by game duration", children: "Win Rate by Game Length" }), _jsxs("div", { className: "rounded-[4px] bg-[rgba(6,12,14,0.55)] ring-1 ring-jade/15 p-3 sm:p-4", children: [_jsxs("div", { className: "mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1", children: [_jsxs("span", { className: "font-chakrapetch text-[19px] font-bold tabular-nums text-flash/90", children: [first.winrate.toFixed(1), "%"] }), _jsx("span", { className: "font-jetbrains text-[10px] text-flash/25", children: first.label }), _jsx("span", { className: "text-flash/20", children: "\u2192" }), _jsxs("span", { className: cn("font-chakrapetch text-[19px] font-bold tabular-nums", last.winrate >= 50 ? "text-jade" : "text-[#ff6286]"), children: [last.winrate.toFixed(1), "%"] }), _jsx("span", { className: "font-jetbrains text-[10px] text-flash/25", children: last.label }), _jsxs("span", { className: cn("ml-auto rounded-[3px] px-2 py-[3px] font-jetbrains text-[10px] uppercase tracking-[0.14em]", swing >= 0 ? "bg-jade/[0.10] text-jade/85" : "bg-[#ff6286]/[0.10] text-[#ff6286]/85"), children: [swing >= 0 ? "+" : "", swing.toFixed(1), " over the game"] })] }), _jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: "w-full h-auto", role: "img", "aria-label": `Win rate by game length, from ${first.winrate.toFixed(1)} percent at ${first.label} minutes to ${last.winrate.toFixed(1)} percent at ${last.label}`, children: [_jsxs("defs", { children: [_jsxs("linearGradient", { id: "wrlUp", x1: "0", y1: "1", x2: "0", y2: "0", children: [_jsx("stop", { offset: "0%", stopColor: "rgba(0,217,146,0.04)" }), _jsx("stop", { offset: "100%", stopColor: "rgba(0,217,146,0.34)" })] }), _jsxs("linearGradient", { id: "wrlDown", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "rgba(255,98,134,0.04)" }), _jsx("stop", { offset: "100%", stopColor: "rgba(255,98,134,0.30)" })] }), _jsx("clipPath", { id: "wrlAbove", children: _jsx("rect", { x: "0", y: "0", width: W, height: y50 }) }), _jsx("clipPath", { id: "wrlBelow", children: _jsx("rect", { x: "0", y: y50, width: W, height: H - y50 }) }), _jsxs("filter", { id: "wrlGlow", x: "-20%", y: "-40%", width: "140%", height: "180%", children: [_jsx("feGaussianBlur", { stdDeviation: "3", result: "b" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "b" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx("line", { x1: padL, y1: y50, x2: W - padR, y2: y50, stroke: "rgba(0,217,146,0.30)", strokeWidth: "1" }), _jsx("text", { x: padL - 8, y: y50 + 3.5, textAnchor: "end", fill: "rgba(0,217,146,0.55)", style: { fontSize: 9, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }, children: "EVEN" }), _jsxs("text", { x: padL - 8, y: padT + 4, textAnchor: "end", fill: "rgba(215,216,217,0.22)", style: { fontSize: 9, fontFamily: "JetBrains Mono, monospace" }, children: [hi.toFixed(0), "%"] }), _jsxs("text", { x: padL - 8, y: plotBottom + 3, textAnchor: "end", fill: "rgba(215,216,217,0.22)", style: { fontSize: 9, fontFamily: "JetBrains Mono, monospace" }, children: [lo.toFixed(0), "%"] }), _jsx("path", { d: band, fill: "url(#wrlUp)", clipPath: "url(#wrlAbove)" }), _jsx("path", { d: band, fill: "url(#wrlDown)", clipPath: "url(#wrlBelow)" }), _jsx("path", { d: curve, fill: "none", stroke: "#00d992", strokeWidth: "2.25", strokeLinejoin: "round", strokeLinecap: "round", filter: "url(#wrlGlow)", opacity: "0.95" }), present.map((d) => {
                                const x = mapX(d.i);
                                const y = mapY(d.winrate);
                                const good = d.winrate >= 50;
                                const on = hover === d.i;
                                return (_jsxs("g", { children: [on && (_jsx("line", { x1: x, y1: padT - 6, x2: x, y2: plotBottom, stroke: "rgba(215,216,217,0.16)", strokeWidth: "1" })), _jsx("circle", { cx: x, cy: y, r: on ? 5 : 3.4, fill: good ? "#00d992" : "#ff6286", stroke: "#040A0C", strokeWidth: "1.6", style: { transition: "r 160ms ease" } }), _jsx("text", { x: x, y: good ? y - 11 : y + 17, textAnchor: "middle", fill: good ? "rgba(0,217,146,0.95)" : "rgba(255,98,134,0.95)", style: { fontSize: 11, fontFamily: "Chakra Petch, sans-serif", fontWeight: 700 }, children: d.winrate.toFixed(1) })] }, d.label));
                            }), data.map((d, i) => {
                                const bw = Math.max(10, (plotW / n) * 0.5);
                                const h = maxGames > 0 ? Math.max(1.5, (d.games / maxGames) * stripH) : 0;
                                const yTop = plotBottom + gap + (stripH - h);
                                return (_jsx("rect", { x: mapX(i) - bw / 2, y: yTop, width: bw, height: h, rx: "1", fill: hover === i ? "rgba(0,217,146,0.55)" : "rgba(0,217,146,0.20)", style: { transition: "fill 160ms ease" } }, `s-${d.label}`));
                            }), data.map((d, i) => (_jsx("text", { x: mapX(i), y: H - 3, textAnchor: "middle", fill: hover === i ? "rgba(215,216,217,0.75)" : "rgba(215,216,217,0.38)", style: { fontSize: 9.5, fontFamily: "JetBrains Mono, monospace", transition: "fill 160ms ease" }, children: d.label }, `l-${d.label}`))), data.map((d, i) => (_jsx("rect", { x: mapX(i) - colBand / 2, y: 0, width: colBand, height: H, fill: "transparent", onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null), children: _jsx("title", { children: `${d.label} min - ${d.winrate == null ? "no data" : `${d.winrate.toFixed(1)}% WR`} - ${d.games.toLocaleString()} games` }) }, `h-${d.label}`)))] }), _jsx("p", { className: "mt-2 font-chakrapetch text-[9px] leading-snug text-flash/25", children: "Bars under the axis are games per bucket \u2014 the tail of the curve is only as trustworthy as the bar beneath it." })] })] }));
}
// Skill order — Q/W/E/R × levels 1-18 grid (most common ability leveled each
// level). Data accrues from the ingest over time, so it shows a "collecting"
// state until there's a meaningful sample.
const SKILL_ABILITIES = [
    { slot: 1, key: "Q" },
    { slot: 2, key: "W" },
    { slot: 3, key: "E" },
    { slot: 4, key: "R" },
];
function skillPriorityHint(priority) {
    const k = { 1: "Q", 2: "W", 3: "E" };
    return priority.length >= 2 ? `max ${priority.map((s) => k[s]).join(" › ")}` : undefined;
}
// Compact, monochrome (jade/gray) skill grid sized for the sidebar column.
/* --- Jungle pathing -------------------------------------------------------
   Drawn on the real Summoner's Rift minimap.

   Routes arrive normalised to the player's own half (1-6 own, 7-12 enemy), so
   the map is always shown from the blue side: "own" camps sit bottom-left,
   "enemy" top-right. That is a deliberate re-projection, not the literal side
   played - it is what makes a red-team clear and its blue-team mirror read as
   the same route.

   The route comes from per-minute positions, NOT camp kill events: Riot
   publishes none for normal camps and frames are 60s apart. So a drawn route
   is "the camps this jungler was seen at, in order" and can be shorter than
   the clear really was. The caption says so rather than implying precision the
   data does not have. */
// Game-space camp coordinates: own half first, then the enemy mirror.
const CAMP_POS = [
    [3821, 8106], [2178, 8410], [3906, 6438], [7420, 5399], [7815, 4052], [8283, 2599],
    [11071, 6969], [12736, 6663], [10983, 8508], [7442, 9663], [7080, 10998], [6489, 12442],
];
const CAMP_NAMES = ["Blue", "Gromp", "Wolves", "Raptors", "Red", "Krugs"];
// The real in-game monster portraits (Community Dragon character HUD art),
// mirrored into our own /public so the page never depends on a third-party
// host at runtime. Order matches CAMP_NAMES.
const CAMP_ICONS = [
    "/img/jungle/blue.png",
    "/img/jungle/gromp.png",
    "/img/jungle/wolves.png",
    "/img/jungle/raptors.png",
    "/img/jungle/red.png",
    "/img/jungle/krugs.png",
];
const campIcon = (code) => CAMP_ICONS[(code - 1) % 6];
// The Rift spans ~14870 x 14980 game units. Game Y grows upward and SVG Y grows
// downward, hence the flip.
const MAP_W = 14870;
const MAP_H = 14980;
/** Routes are stored own/enemy, not blue/red — so which half of the map "own"
 *  lands on is a pure display choice. Viewing as RED simply swaps the two
 *  halves (codes 1-6 <-> 7-12); the data is identical, it is the same clear
 *  seen from the other side of the map. */
const forSide = (code, side) => side === "blue" ? code : code <= 6 ? code + 6 : code - 6;
const toSvg = (code, side) => {
    const [gx, gy] = CAMP_POS[forSide(code, side) - 1];
    return { x: (gx / MAP_W) * 1000, y: (1 - gy / MAP_H) * 1000 };
};
const campName = (code) => CAMP_NAMES[(code - 1) % 6];
const isEnemyCamp = (code) => code > 6;
// Radius in viewBox units (the map is a 1000x1000 viewBox). 26 rendered ~19px
// across and was unreadable; 58 rendered ~49px and swallowed the map. 40 lands
// at ~34px on the 420px map — the monster is recognisable and the jungle around
// it still is too.
const R_NODE = 40;
/** Blue / red side, as a pill straddling the top edge of the map - the same
 *  half-in-half-out anchoring the champion level badge uses on a match card.
 *
 *  A sliding thumb rather than two buttons swapping colour: the switch then
 *  reads as one control moving, and the eye can follow which side is selected
 *  instead of re-reading both labels.
 *
 *  Fixed height so the map can offset it by exactly half. grid-cols-2 makes the
 *  two cells equal despite "blue" and "red" being different lengths, which is
 *  what lets the thumb be a plain 50% and land dead on the second cell.
 */
function SideSwitch({ side, onChange, }) {
    return (_jsxs("div", { className: "relative grid grid-cols-2 h-[22px] rounded-full p-[3px] bg-liquirice ring-1 ring-flash/[0.07] shadow-[0_3px_12px_rgba(0,0,0,0.7)]", children: [_jsx("span", { "aria-hidden": true, className: cn("absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full", "transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", side === "red"
                    ? "translate-x-full bg-[#e0503f]/30"
                    : "translate-x-0 bg-[#5BA8E6]/30") }), ["blue", "red"].map((sd) => (_jsx("button", { type: "button", onClick: () => onChange(sd), "aria-pressed": side === sd, className: cn("relative z-10 flex items-center justify-center rounded-full cursor-clicker select-none", "font-jetbrains text-[9px] leading-none uppercase tracking-[0.16em]", 
                // All-caps has no descender, so flex centring - which works off the
                // full line metrics - parks the glyphs 1px high (measured: 3.5px of
                // ink above, 5.5px below, in a 16px box). Against items-center a 2px
                // top pad shrinks the content box and moves it down by exactly 1px.
                // The trailing letter-space that tracking adds after the last glyph
                // pulls the word left by half a space; pl compensates by the same.
                "pt-[2px] pl-[calc(0.75rem+0.08em)] pr-3", "transition-colors duration-300", side === sd
                    ? sd === "blue" ? "text-[#bcdcf8]" : "text-[#ffc0b6]"
                    : "text-flash/35 hover:text-flash/60"), children: sd }, sd)))] }));
}
function JunglePathPanel({ data }) {
    const [sel, setSel] = useState(0);
    const [side, setSide] = useState("blue");
    const route = data.routes[sel]?.route ?? [];
    const pts = route.filter((c) => c >= 1 && c <= 12).map((c) => toSvg(c, side));
    return (_jsxs("div", { className: "mt-8", children: [_jsx(SectionTitle, { children: "Jungle Pathing" }), _jsx("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4", children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-5", children: [_jsxs("div", { className: "relative w-full max-w-[420px] mx-auto lg:mx-0 shrink-0", children: [_jsxs("div", { className: "relative aspect-square rounded-[4px] overflow-hidden ring-1 ring-jade/15", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/map/map11.png`, alt: "Summoner's Rift", className: "absolute inset-0 w-full h-full object-cover opacity-55", loading: "lazy" }), _jsx("div", { className: "absolute inset-0 bg-liquirice/35" }), _jsxs("svg", { viewBox: "0 0 1000 1000", className: "absolute inset-0 w-full h-full", children: [CAMP_POS.map((_, i) => {
                                                    const p = toSvg(i + 1, side);
                                                    return (_jsx("circle", { cx: p.x, cy: p.y, r: 13, fill: "none", stroke: isEnemyCamp(i + 1) ? "rgba(224,80,63,0.32)" : "rgba(0,217,146,0.32)", strokeWidth: 3 }, i));
                                                }), pts.length > 1 && (_jsx("polyline", { points: pts.map((p) => `${p.x},${p.y}`).join(" "), fill: "none", stroke: "rgb(0,217,146)", strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round", strokeDasharray: "13 10", opacity: 0.9 })), _jsx("defs", { children: pts.map((p, i) => (_jsx("clipPath", { id: `jp-clip-${i}`, children: _jsx("circle", { cx: p.x, cy: p.y, r: R_NODE - 2 }) }, i))) }), pts.map((p, i) => (_jsxs("g", { children: [_jsx("circle", { cx: p.x, cy: p.y, r: R_NODE, fill: "rgba(4,10,12,0.92)" }), _jsx("image", { href: campIcon(route[i]), x: p.x - (R_NODE - 2), y: p.y - (R_NODE - 2), width: (R_NODE - 2) * 2, height: (R_NODE - 2) * 2, clipPath: `url(#jp-clip-${i})`, preserveAspectRatio: "xMidYMid slice" }), _jsx("circle", { cx: p.x, cy: p.y, r: R_NODE, fill: "none", stroke: "rgb(0,217,146)", strokeWidth: 4 }), _jsx("circle", { cx: p.x + R_NODE * 0.78, cy: p.y - R_NODE * 0.78, r: R_NODE * 0.34, fill: "rgb(0,217,146)" }), _jsx("text", { x: p.x + R_NODE * 0.78, y: p.y - R_NODE * 0.78 + R_NODE * 0.12, textAnchor: "middle", fontSize: R_NODE * 0.46, fontWeight: "700", fill: "#040A0C", fontFamily: "chakrapetch, sans-serif", children: i + 1 })] }, i)))] })] }), _jsx("div", { className: "absolute inset-x-0 -top-[11px] z-20 flex justify-center pointer-events-none", children: _jsx("div", { className: "pointer-events-auto", children: _jsx(SideSwitch, { side: side, onChange: setSide }) }) })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "flex items-center justify-between gap-3 mb-2.5", children: _jsxs("span", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch", children: ["Most played clears - ", fmt(data.totalGames), " games"] }) }), _jsx("div", { className: "space-y-1.5", children: data.routes.map((r, i) => (_jsxs("button", { type: "button", onClick: () => setSel(i), className: cn("w-full flex items-center gap-3 rounded-[4px] px-2.5 py-2 text-left transition-colors cursor-clicker", i === sel ? "bg-jade/[0.10]" : "bg-flash/[0.02] hover:bg-flash/[0.05]"), children: [_jsxs("div", { className: "min-w-0 flex-1 flex flex-col gap-1.5", children: [_jsx("div", { className: "flex items-center gap-1.5 flex-wrap min-w-0", children: r.route.map((code, j) => (_jsxs("span", { className: "flex items-center gap-1.5", children: [j > 0 && _jsx("span", { className: "text-flash/20 text-[10px]", children: "->" }), _jsxs("span", { className: cn("flex items-center gap-1 pl-1 pr-1.5 py-[2px] rounded-[3px] text-[10px] font-chakrapetch font-semibold whitespace-nowrap", isEnemyCamp(code) ? "bg-[#e0503f]/[0.13] text-[#ff9c8f]" : "bg-jade/[0.10] text-jade/90"), title: isEnemyCamp(code) ? "Enemy jungle" : "Own jungle", children: [_jsx("img", { src: campIcon(code), alt: "", className: "w-4 h-4 rounded-full", loading: "lazy" }), campName(code)] })] }, j))) }), (() => {
                                                        // Some clears are deliberately cut short to reset and buy a
                                                        // component - the point of the route, and invisible in the
                                                        // final build because the component is gone by then. Citrine
                                                        // rather than jade so it reads as a different kind of thing
                                                        // from the camps above it.
                                                        const items = (r.back?.items ?? []).filter((it) => it.pct >= BACK_ITEM_MIN_PCT);
                                                        if (!r.back || items.length === 0)
                                                            return null;
                                                        return (_jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", title: `${r.back.sample} games with a recorded reset`, children: [_jsxs("span", { className: "text-[9px] font-jetbrains uppercase tracking-[0.14em] text-citrine/55", children: ["reset ", mmss(r.back.atSeconds)] }), items.map((it) => (_jsxs("span", { className: "flex items-center gap-1 rounded-[3px] bg-citrine/[0.09] pl-[2px] pr-1.5 py-[1px]", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${it.id}.png`, alt: "", className: "w-4 h-4 rounded-[2px]", loading: "lazy" }), _jsxs("span", { className: "text-[9.5px] font-chakrapetch font-semibold tabular-nums text-citrine/85", children: [Math.round(it.pct), "%"] })] }, it.id)))] }));
                                                    })()] }), _jsx("span", { className: "text-[10px] font-jetbrains text-flash/35 tabular-nums shrink-0", children: fmt(r.games) }), _jsxs("span", { className: cn("text-[11px] font-chakrapetch font-bold tabular-nums shrink-0 w-[46px] text-right", wrClass(r.winrate)), children: [r.winrate.toFixed(1), "%"] })] }, i))) }), _jsx("div", { className: "text-[9px] font-chakrapetch text-flash/25 mt-3 leading-snug max-w-[70ch]", children: "Reconstructed from minute-by-minute positions - Riot publishes no event for normal camps, so a route lists the camps the jungler was seen at, not every camp cleared. Green chips are the jungler's own half, red the enemy's; the side switch mirrors the same route onto the other half of the map. A reset line marks clears that end at the shop - the median time it happens and what gets bought there - which is why a short clear can be the plan rather than an interrupted one." })] })] }) })] }));
}
function SkillOrderChart({ data }) {
    const ready = !!data && data.sample >= 30;
    return (_jsxs("div", { children: [_jsx(SectionTitle, { hint: ready ? skillPriorityHint(data.priority) : undefined, children: "Skill Order" }), _jsx("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-3", children: !ready ? (_jsxs("div", { className: "py-5 text-center", children: [_jsx("div", { className: "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.18em] text-flash/40", children: "Collecting data\u2026" }), _jsxs("div", { className: "text-[9px] text-flash/25 mt-1 leading-relaxed", children: ["Builds up from new games", data && data.sample > 0 ? ` · ${data.sample}` : "", "."] })] })) : (_jsx("div", { className: "space-y-[3px]", children: SKILL_ABILITIES.map((ab) => (_jsxs("div", { className: "flex items-center gap-[2px]", children: [_jsx("div", { className: "w-[14px] shrink-0 text-center font-chakrapetch font-bold text-[10px] text-flash/45", children: ab.key }), Array.from({ length: 18 }, (_, i) => {
                                const lit = data.perLevel[i] === ab.slot;
                                return (_jsx("div", { className: "flex-1 aspect-square rounded-[2px]", style: lit ? { background: "#00d992" } : { background: "rgba(215,216,217,0.05)" }, title: lit ? `${ab.key} · level ${i + 1}` : undefined }, i));
                            })] }, ab.key))) })) })] }));
}
const VARIANT_LABEL = ["Most Popular", "2nd Most Popular", "Alternative", "Off-Meta", "Niche"];
export default function ChampionBuildTab({ champ }) {
    const [data, setData] = useState(null);
    const [names, setNames] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [role, setRole] = useState(null);
    const [pageIdx, setPageIdx] = useState(0);
    const [vs, setVs] = useState(null);
    const [patch, setPatch] = useState(null);
    const [region, setRegion] = useState(null);
    const [patches, setPatches] = useState([]);
    const trees = useRuneTrees();
    const { session } = useAuth();
    const navigate = useNavigate();
    const [showTutorial, setShowTutorial] = useState(false);
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
            if (!j?.data)
                return;
            const m = {};
            for (const [id, it] of Object.entries(j.data))
                m[Number(id)] = it.name;
            setNames(m);
        })
            .catch(() => { });
    }, []);
    useEffect(() => { setRole(null); setVs(null); setPatch(null); setRegion(null); }, [champ?.key]);
    useEffect(() => { setPageIdx(0); }, [champ?.key, role]);
    useEffect(() => {
        fetch(`${BOX_API_BASE_URL}/api/champion/patches`).then((r) => (r.ok ? r.json() : null)).then((j) => j?.patches?.length && setPatches(j.patches)).catch(() => { });
    }, []);
    useEffect(() => {
        if (!champ?.key)
            return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`${BOX_API_BASE_URL}/api/champion/build`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ champKey: Number(champ.key), champion: champ.id, role: role ?? undefined, vs: vs?.slug ?? undefined, patch: patch ?? undefined, region: region ?? undefined }),
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load build"))))
            .then((d) => !cancelled && setData(d))
            .catch((e) => !cancelled && setError(e?.message ?? "Error"))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [champ?.key, champ?.id, role, vs, patch, region]);
    // Deep stats (Performance + Laning) — separate endpoint, same cohort.
    const [statsData, setStatsData] = useState(null);
    useEffect(() => {
        if (!champ?.key)
            return;
        let cancelled = false;
        setStatsData(null);
        fetch(`${BOX_API_BASE_URL}/api/champion/build-stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ champKey: Number(champ.key), champion: champ.id, role: role ?? undefined, vs: vs?.slug ?? undefined, patch: patch ?? undefined, region: region ?? undefined }),
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !cancelled && setStatsData(d))
            .catch(() => { });
        return () => { cancelled = true; };
    }, [champ?.key, champ?.id, role, vs, patch, region]);
    const name = champ.name;
    const bestSpells = data?.spells?.[0];
    const linkRegion = useMemo(() => "euw", []);
    const buildRoles = (data?.availableRoles ?? []).filter((r) => ROLE_LABEL[r.role]);
    const path = data?.buildPath ?? [];
    const pr = data?.preciseRunes ?? null;
    const pages = pr?.pages ?? [];
    const hasPrecise = !!pr && pr.sample >= 40 && pages.length > 0;
    const page = pages[Math.min(pageIdx, pages.length - 1)];
    // perk → best winrate (for the rune hover tooltips, "is this sub-rune better?")
    const perkWr = useMemo(() => {
        const m = new Map();
        for (const s of pr?.slots ?? [])
            for (const o of s.options) {
                const cur = m.get(o.perk);
                if (!cur || o.games > cur.games)
                    m.set(o.perk, { games: o.games, winrate: o.winrate });
            }
        return m;
    }, [pr]);
    if (loading && !data)
        return _jsx("div", { className: "space-y-4", children: Array.from({ length: 3 }).map((_, i) => _jsx("div", { className: "h-40 rounded-lg bg-flash/[0.015] animate-pulse" }, i)) });
    if (error || !data)
        return _jsx("div", { className: "px-4 py-12 text-center text-[#ff6286]/80 text-sm", children: error ?? "No build data" });
    return (_jsxs("div", { className: "font-jetbrains text-flash", children: [_jsx("style", { children: `@keyframes bIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}@keyframes flow{0%{transform:translateX(0)}100%{transform:translateX(400%)}}` }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5 mb-5", children: [buildRoles.length > 1 && (_jsxs(_Fragment, { children: [buildRoles.map((r, idx) => {
                                const Icon = ROLE_ICON[r.role];
                                const active = r.role === data.role;
                                const popular = idx === 0; // availableRoles is sorted by games desc
                                return (_jsxs("button", { type: "button", onClick: () => setRole(r.role), className: cn("relative flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-sm text-[11px] font-chakrapetch font-bold uppercase tracking-[0.15em] border transition-colors cursor-pointer", active ? "text-jade border-jade/40 bg-jade/10" : "text-flash/45 border-flash/10 hover:text-flash/70 hover:border-flash/20"), children: [Icon && _jsx(Icon, { className: cn("w-4 h-4", active ? "text-jade" : "text-flash/45") }), ROLE_LABEL[r.role] ?? r.role, popular && _jsx("span", { className: "ml-0.5 h-1.5 w-1.5 rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.8)]", title: "Most popular role" })] }, r.role));
                            }), _jsx("span", { className: "h-5 w-px bg-flash/10 mx-1" })] })), _jsx(ChampionDialog, { onSelect: (c) => setVs(c), onClear: vs ? () => setVs(null) : undefined, trigger: _jsxs("button", { type: "button", className: cn("flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-sm text-[11px] font-chakrapetch font-bold uppercase tracking-[0.12em] border cursor-pointer transition-colors", vs ? "text-jade border-jade/40 bg-jade/10" : "text-flash/55 border-flash/10 hover:text-flash/80 hover:border-flash/20"), children: [vs ? _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${vs.slug}.png`, alt: "", className: "w-4 h-4 rounded-full", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }) : _jsx(Swords, { className: "w-3.5 h-3.5" }), vs ? vs.name : "VS"] }) }), _jsx(FilterDropdown, { value: patch, options: patches.map((p) => ({ value: p, label: p })), onChange: setPatch, allLabel: "All patches" }), _jsx(FilterDropdown, { value: region, options: FILTER_REGIONS.map((r) => ({ value: r.key, label: r.label })), onChange: setRegion, allLabel: "All regions" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[210px_1fr_260px] gap-5", children: [_jsxs("aside", { className: "flex flex-col gap-6 order-2 lg:order-1", children: [hasPrecise && pages.length > 1 && (_jsxs("div", { children: [_jsx(SectionTitle, { children: "Recommended" }), _jsx("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] overflow-hidden", children: pages.map((p, i) => {
                                            const ks = getKeystoneIcon(p.keystone);
                                            const ss = getStyleIcon(p.subStyle);
                                            return (_jsxs("button", { type: "button", onClick: () => setPageIdx(i), className: cn("w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-flash/[0.04] last:border-0 transition-colors text-left cursor-pointer", i === pageIdx ? "bg-jade/[0.07]" : "hover:bg-flash/[0.03]"), children: [_jsxs("div", { className: "relative shrink-0", children: [ks && _jsx("img", { src: ks, alt: "", className: "w-8 h-8 rounded-full bg-filmdark/40", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), ss && _jsx("img", { src: ss, alt: "", className: "absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0a1416] p-px" })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: cn("text-[11px] font-chakrapetch font-bold truncate", i === pageIdx ? "text-flash/90" : "text-flash/55"), children: VARIANT_LABEL[i] ?? `Build ${i + 1}` }), _jsxs("div", { className: "text-[9px] text-flash/30 tabular-nums", children: [fmt(p.games), " games"] })] }), _jsxs("span", { className: cn("text-[12px] font-chakrapetch font-bold tabular-nums shrink-0", wrClass(p.winrate)), children: [p.winrate.toFixed(1), "%"] })] }, i));
                                        }) })] })), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx(SectionTitle, { children: "Top Players" }), _jsxs("div", { className: "flex-1 flex flex-col justify-center rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] overflow-hidden", children: [data.topPlayers.length === 0 && _jsx("div", { className: "px-4 py-8 text-center text-[11px] text-flash/35", children: "Not enough games yet" }), data.topPlayers.slice(0, 6).map((p, i) => (_jsxs(Link, { to: `/summoners/${linkRegion}/${encodeURIComponent(p.name.replace(/\s+/g, "+"))}-${p.tag}`, className: "flex items-center gap-2 px-3 py-2 border-b border-flash/[0.04] last:border-0 hover:bg-jade/[0.04] transition-colors group", children: [_jsx("span", { className: cn("w-4 text-center text-[11px] font-chakrapetch font-bold tabular-nums", i === 0 ? "text-jade" : "text-flash/35"), children: i + 1 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[11px] text-flash/85 group-hover:text-flash leading-tight", children: p.name }), _jsxs("div", { className: "truncate text-[9px] text-flash/30 leading-tight", children: ["#", p.tag] })] }), _jsxs("span", { className: cn("text-[11px] font-chakrapetch font-bold tabular-nums shrink-0", wrClass(p.winrate)), children: [p.winrate.toFixed(0), "%"] })] }, `${p.name}-${p.tag}-${i}`)))] })] })] }), _jsxs("section", { className: "order-1 lg:order-2 flex flex-col", children: [_jsx(SectionTitle, { hint: hasPrecise && page ? `${fmt(page.games)} games · ${page.winrate.toFixed(1)}% WR` : undefined, action: hasPrecise ? (
                                // The page currently on screen, not the most played one — the
                                // sidebar lets you pick a variant.
                                _jsx(RuneImportButton, { champion: champ.name, patch: patch ?? patches[0] ?? null, page: page })) : undefined, children: "Runes" }), hasPrecise && page ? (_jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0, y: 10, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -10, filter: "blur(4px)" }, transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] }, children: _jsx(RunePageTree, { page: page, trees: trees, perkWr: perkWr }) }, pageIdx) })) : (
                            /* fallback: keystone-level (precise sample still building up) */
                            _jsxs("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4", children: [data.runes.slice(0, 2).map((r, i) => {
                                        const ks = getKeystoneIcon(r.keystone);
                                        const prim = getStyleIcon(r.primary);
                                        const sec = getStyleIcon(r.sub);
                                        return (_jsxs("div", { className: cn("flex items-center gap-3", i > 0 && "mt-3 pt-3 border-t border-flash/[0.05]"), children: [ks && _jsx("img", { src: ks, alt: "", className: cn("rounded-full bg-filmdark/40", i === 0 ? "w-12 h-12" : "w-9 h-9"), onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: cn("font-chakrapetch font-bold truncate", i === 0 ? "text-[14px] text-flash/90" : "text-[12px] text-flash/60"), children: getKeystoneName(r.keystone) ?? `Keystone ${r.keystone}` }), _jsxs("div", { className: "flex items-center gap-1.5 mt-1", children: [prim && _jsx("img", { src: prim, alt: "", className: "w-4 h-4" }), _jsx("span", { className: "text-flash/20 text-[10px]", children: "+" }), sec && _jsx("img", { src: sec, alt: "", className: "w-4 h-4 opacity-80" })] })] }), _jsxs("div", { className: cn("font-chakrapetch font-bold tabular-nums shrink-0", i === 0 ? "text-[15px]" : "text-[12px]", wrClass(r.winrate)), children: [r.winrate.toFixed(1), "%"] })] }, i));
                                    }), pr && pr.sample < 40 && _jsx("div", { className: "mt-3 pt-3 border-t border-flash/[0.05] text-[9px] text-flash/30 leading-snug", children: "Precise rune tree is still building up for this pick \u2014 it appears once we have enough fully-recorded pages." })] })), (path.length > 0 || data.items.core.length > 0) && (_jsxs("div", { className: "mt-6 flex-1 flex flex-col", children: [_jsx(SectionTitle, { hint: path.length > 0 ? "step by step" : "by priority", children: "Build Path" }), _jsx("div", { className: "flex-1 flex flex-col justify-center rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4", children: path.length > 0 ? (_jsx(BuildPathStrip, { path: path, boots: data.items.boots[0], bootsSlot: data.bootsSlot, names: names })) : (_jsx("div", { className: "flex items-center gap-1.5 flex-wrap", children: data.items.core.map((it, i) => (_jsxs("div", { className: "flex items-center", children: [_jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx(ItemIcon, { id: it.item_id, size: 48, names: names }), _jsxs("span", { className: cn("text-[10px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate)), children: [it.winrate.toFixed(1), "%"] })] }), i < data.items.core.length - 1 && _jsx("span", { className: "text-flash/20 mx-1 text-[14px]", children: "\u203A" })] }, it.item_id))) })) })] }))] }), _jsxs("aside", { className: "flex flex-col gap-6 order-3", children: [_jsxs("div", { children: [_jsx(SectionTitle, { children: "Spells" }), _jsxs("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-3 space-y-2", children: [data.spells.length === 0 && _jsx("div", { className: "text-center text-[11px] text-flash/35 py-2", children: "\u2014" }), data.spells.slice(0, 2).map((sp, i) => (_jsxs("div", { className: cn("flex items-center gap-2.5", i > 0 && "pt-2 border-t border-flash/[0.05]"), children: [_jsx("img", { src: summonerSpellUrl(sp.spell1), alt: "", className: cn("rounded-md ring-1 ring-flash/10", i === 0 ? "w-10 h-10" : "w-8 h-8"), onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsx("img", { src: summonerSpellUrl(sp.spell2), alt: "", className: cn("rounded-md ring-1 ring-flash/10", i === 0 ? "w-10 h-10" : "w-8 h-8"), onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsx("div", { className: "flex-1" }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: cn("font-chakrapetch font-bold tabular-nums", i === 0 ? "text-[15px]" : "text-[12px]", wrClass(sp.winrate)), children: [sp.winrate.toFixed(1), "%"] }), sp.pickrate != null && _jsxs("div", { className: "text-[9px] text-flash/35 tabular-nums", children: [sp.pickrate.toFixed(0), "% pick"] })] })] }, i)))] })] }), _jsx(SkillOrderChart, { data: statsData?.skillOrder ?? null }), _jsxs("div", { className: "flex-1 flex flex-col", children: [_jsx(SectionTitle, { children: "Items" }), _jsxs("div", { className: "flex-1 rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 space-y-4", children: [(data.items.support?.length ?? 0) > 0 && (_jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2", children: "Support Item" }), _jsx("div", { className: "flex items-start gap-2.5 flex-wrap", children: data.items.support.map((s) => (_jsxs("div", { className: "flex flex-col items-center gap-1 w-[40px]", children: [_jsx(ItemIcon, { id: s.item_id, size: 34, names: names }), _jsxs("span", { className: cn("text-[10px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(s.winrate)), children: [s.winrate.toFixed(1), "%"] }), s.pickrate != null && _jsxs("span", { className: "text-[8px] text-flash/35 tabular-nums leading-none", children: [s.pickrate.toFixed(0), "% pick"] })] }, s.item_id))) })] })), (data.items.jungle?.length ?? 0) > 0 && (_jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2", children: "Jungle Item" }), _jsx("div", { className: "flex items-start gap-2.5 flex-wrap", children: data.items.jungle.map((j) => (_jsxs("div", { className: "flex flex-col items-center gap-1 w-[40px]", children: [_jsx(ItemIcon, { id: j.item_id, size: 34, names: names }), _jsxs("span", { className: cn("text-[10px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(j.winrate)), children: [j.winrate.toFixed(1), "%"] }), j.pickrate != null && _jsxs("span", { className: "text-[8px] text-flash/35 tabular-nums leading-none", children: [j.pickrate.toFixed(0), "% pick"] })] }, j.item_id))) })] })), data.items.boots.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2", children: "Boots" }), _jsx("div", { className: "flex items-start gap-2.5 flex-wrap", children: data.items.boots.map((b) => (_jsxs("div", { className: "flex flex-col items-center gap-1 w-[40px]", children: [_jsx(ItemIcon, { id: b.item_id, size: 34, names: names }), _jsxs("span", { className: cn("text-[10px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(b.winrate)), children: [b.winrate.toFixed(1), "%"] }), b.pickrate != null && _jsxs("span", { className: "text-[8px] text-flash/35 tabular-nums leading-none", children: [b.pickrate.toFixed(0), "% pick"] })] }, b.item_id))) })] })), data.items.situational.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2", children: "Situational" }), _jsx("div", { className: "flex items-start gap-1.5 flex-wrap", children: data.items.situational.map((it) => (_jsxs("div", { className: "flex flex-col items-center gap-0.5 w-[42px]", children: [_jsx(ItemIcon, { id: it.item_id, size: 32, names: names }), _jsxs("span", { className: cn("text-[9px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate)), children: [it.winrate.toFixed(0), "%"] })] }, it.item_id))) })] }))] })] })] })] }), _jsxs("div", { className: "relative w-screen left-1/2 -translate-x-1/2 mt-8 h-[150px] sm:h-[170px] overflow-hidden", children: [_jsx("div", { "aria-hidden": "true", className: "absolute inset-0 select-none pointer-events-none bg-no-repeat", style: {
                            backgroundImage: "url('https://cdn2.loldata.cc/img/champion/splash/Katarina_1.jpg')",
                            backgroundSize: "120% auto",
                            backgroundPosition: "100% 14%",
                        } }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-[#040A0C] via-[#040A0C]/85 to-[#040A0C]/15" }), _jsx("div", { className: "absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#040A0C] to-transparent" }), _jsx("div", { className: "absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#040A0C] to-transparent" }), _jsx("div", { className: "relative h-full mx-auto w-full xl:w-[65%] min-[2560px]:w-[55%] px-4 xl:px-0", children: _jsxs("div", { className: "flex h-full items-center justify-between gap-5", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-1.5", children: [_jsx("span", { className: "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.3em] text-jade/80", children: "The Explorer" }), _jsx("span", { className: "inline-flex items-center rounded-full border border-jade/50 bg-jade/15 px-2.5 py-0.5 text-[10px] font-chakrapetch font-bold uppercase tracking-[0.2em] text-jade shadow-[0_0_18px_rgba(0,217,146,0.35)]", children: "100% Free" })] }), _jsx("h3", { className: "font-chakrapetch font-bold uppercase tracking-[0.04em] leading-[0.95] text-xl sm:text-[28px] text-flash drop-shadow-[0_2px_14px_rgba(var(--c-shadow),0.85)]", children: "Go deeper in the Explorer" }), _jsxs("p", { className: "mt-1.5 hidden sm:block max-w-[46ch] text-[12px] sm:text-[13px] leading-relaxed text-flash/65 drop-shadow-[0_1px_10px_rgba(var(--c-shadow),0.9)]", children: ["Build custom ", name, " queries \u2014 ally & enemy synergies, item win-rates and matchup splits.", _jsx("span", { className: "text-jade/85 font-semibold", children: " Completely free." })] })] }), _jsxs("div", { className: "flex shrink-0 items-stretch gap-2", children: [_jsxs("button", { type: "button", onClick: () => setShowTutorial(true), className: "group inline-flex items-center justify-center gap-1.5 min-w-[176px] rounded-md bg-filmdark/40 px-4 py-2 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.16em] text-flash/70 backdrop-blur-sm shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)] transition-[color,box-shadow] hover:text-flash hover:shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.22)] cursor-pointer", children: [_jsx(HelpCircle, { className: "h-3.5 w-3.5" }), " What's that?"] }), _jsx("button", { type: "button", onClick: () => navigate(session ? "/learn/explorer" : "/login?redirect=/learn/explorer"), className: cn("group inline-flex items-center justify-center gap-2 min-w-[176px] shrink-0 rounded-md px-4 py-2 font-chakrapetch font-bold text-[11px] uppercase tracking-[0.16em] transition-colors cursor-pointer backdrop-blur-sm", session
                                                ? "bg-jade/20 text-jade border border-jade/40 hover:bg-jade/30 shadow-[0_0_24px_rgba(0,217,146,0.25)]"
                                                : "bg-filmdark/40 text-flash/80 border border-flash/25 hover:text-flash hover:border-flash/40"), children: session ? (_jsxs(_Fragment, { children: ["Open Explorer ", _jsx(ArrowRight, { className: "h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" })] })) : (_jsxs(_Fragment, { children: [_jsx(Lock, { className: "h-3.5 w-3.5" }), " Login to access"] })) })] })] }) })] }), _jsx(ExplorerTutorial, { open: showTutorial, champion: name, onClose: () => setShowTutorial(false), onDive: () => navigate(session ? "/learn/explorer" : "/login?redirect=/learn/explorer") }), statsData?.stats && statsData.stats.games > 0 && (_jsxs("div", { className: "mt-8 space-y-4", children: [_jsx(PerformanceSection, { s: statsData }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start", children: [_jsx(LaningSection, { s: statsData, vsName: vs?.name ?? statsData.vs }), statsData.gameLength && _jsx(GameLengthChart, { data: statsData.gameLength })] })] })), data.junglePath && _jsx(JunglePathPanel, { data: data.junglePath })] }));
}
