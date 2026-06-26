"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Champion Matchups — a real "matchup planner".
//
// The champion's real lane matchups (the most-played opponents, from the box's
// mv_lane_matchups via /api/champion/stats `commonMatchups`) form a 3D
// constellation you orbit and click; a flat grid stands in when WebGL is
// unavailable. Picking an opponent lays out, in one clean column:
//   1. the VERDICT — real win rate / games / difficulty badge + curated lane notes
//   2. the GAME PLAN vs that opponent — the best runes (/api/champion/runes with
//      an opponentId) and the optimal build path (/api/explorer/buildpath with an
//      enemy constraint). Same engines the Explorer uses, scoped to the matchup.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
// Matchups + runes read from the match-data box (api2); the build path uses the
// Explorer engine (EXPLORER_API_BASE_URL = api2) via runBuildPath inside BuildPathViz.
import { BOX_API_BASE_URL as API_BASE_URL, cdnBaseUrl } from "@/config";
import { MatchupOrbit, supportsWebGL } from "./matchup-orbit";
import { BuildPathViz } from "./explorer/BuildPathViz";
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes";
function badgeFromWR(wr) {
    if (wr >= 54)
        return "FAVOURED";
    if (wr >= 51.5)
        return "GOOD";
    if (wr > 48.5)
        return "EVEN";
    if (wr > 46)
        return "TRICKY";
    if (wr > 43)
        return "HARD";
    return "NIGHTMARE";
}
function badgeClass(b) {
    switch (b) {
        case "FAVOURED": return "bg-jade/15 text-jade ring-1 ring-inset ring-jade/30";
        case "GOOD": return "bg-jade/10 text-jade/85 ring-1 ring-inset ring-jade/20";
        case "EVEN": return "bg-flash/10 text-flash/70 ring-1 ring-inset ring-flash/15";
        case "TRICKY": return "bg-[#FFB615]/12 text-[#FFB615] ring-1 ring-inset ring-[#FFB615]/25";
        case "HARD": return "bg-[#ff6286]/12 text-[#ff6286] ring-1 ring-inset ring-[#ff6286]/25";
        case "NIGHTMARE": return "bg-[#ff6286]/20 text-[#ff6286] ring-1 ring-inset ring-[#ff6286]/40";
    }
}
const wrText = (wr) => (wr >= 51 ? "text-jade" : wr < 49 ? "text-[#ff6286]" : "text-flash/75");
const champIcon = (id) => `${cdnBaseUrl()}/img/champion/${id}.png`;
// ── section header (homepage eyebrow) ───────────────────────────────
function Eyebrow({ children }) {
    return (_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade shrink-0", style: { boxShadow: "0 0 8px #00d992" } }), _jsx("span", { className: "font-chakrapetch text-[11px] font-bold tracking-[0.28em] uppercase text-jade/80", children: children })] }));
}
const GLASS = {
    boxShadow: "0 40px 90px -50px rgba(0,217,146,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
};
// shared panel chrome (matches the Explorer's BuildPathViz shell, so the runes +
// build-path cards in the game-plan row read as one coherent set)
const PANEL = "rounded-[14px] border border-white/[0.08] bg-[rgba(6,12,14,0.55)]";
// Flat grid — used when WebGL is unavailable AND as the orbit's error-boundary
// fallback (a thrown WebGL texture error must never take down the whole tab).
function Grid2D({ nodes, selectedKey, onSelect }) {
    return (_jsx("div", { className: "relative p-4 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[440px] overflow-y-auto cyber-scrollbar", children: nodes.map(n => {
            const sel = n.key === selectedKey;
            const c = n.winrate >= 51 ? "#00d992" : n.winrate < 49 ? "#ff6286" : "#7c8b92";
            return (_jsxs("button", { onClick: () => onSelect(n.key), className: cn("group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors", sel ? "bg-jade/[0.06] ring-1 ring-jade/40" : "hover:bg-flash/[0.04] ring-1 ring-inset ring-transparent"), children: [_jsx("img", { src: n.iconUrl, alt: n.name, className: "w-12 h-12 rounded-md object-cover", style: { boxShadow: `0 0 0 2px ${c}66` } }), _jsx("span", { className: "font-jetbrains text-[9px] text-flash/55 truncate max-w-full", children: n.name }), _jsxs("span", { className: "font-chakrapetch text-[12px] font-bold tabular-nums", style: { color: c }, children: [n.winrate.toFixed(1), "%"] })] }, n.key));
        }) }));
}
class OrbitBoundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(err) { console.warn("[matchup-orbit] fell back to 2D:", err?.message ?? err); }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function ChampionMatchupsTab({ champ, keyToId }) {
    const navigate = useNavigate();
    const [nodes, setNodes] = useState([]);
    const [tips, setTips] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedKey, setSelectedKey] = useState(null);
    const webgl = useMemo(() => supportsWebGL(), []);
    const subjectIcon = champIcon(champ.id);
    useEffect(() => {
        if (!champ?.key)
            return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSelectedKey(null);
        setNodes([]);
        const cdnB = cdnBaseUrl();
        const key = Number(champ.key);
        Promise.all([
            fetch(`${API_BASE_URL}/api/champion/stats`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ championId: key }),
            }).then(r => (r.ok ? r.json() : null)).catch(() => null),
            fetch(`${API_BASE_URL}/api/champion/matchups`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ champKey: key }),
            }).then(r => (r.ok ? r.json() : null)).catch(() => null),
            fetch(`${cdnB}/data/en_US/champion.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
        ]).then(([stats, mu, champJson]) => {
            if (cancelled)
                return;
            const keyToName = {};
            if (champJson?.data)
                for (const ch of Object.values(champJson.data))
                    keyToName[String(ch.key)] = ch.name;
            const tipMap = {};
            for (const m of (mu?.matchups ?? []))
                if (m?.tips)
                    tipMap[String(m.opponent_key)] = m.tips;
            setTips(tipMap);
            const seen = new Set();
            const list = [];
            const push = (rawKey, winrate, games) => {
                const k = String(rawKey ?? "");
                if (!k || k === "undefined" || k === "null" || seen.has(k))
                    return;
                seen.add(k);
                const id = keyToId[k] || k;
                list.push({ key: k, id, name: keyToName[k] || id, winrate: Number(winrate) || 0, games: Number(games) || 0, iconUrl: `${cdnB}/img/champion/${id}.png` });
            };
            // REAL aggregated lane matchups — prefer the most-played set so the picker shows
            // EVERY champ you regularly face, not just the win-rate extremes (which hid common
            // mid-win-rate matchups like Rengar). Fall back to best+worst for older snapshots,
            // then to the curated list only if the box returned nothing.
            for (const m of (stats?.commonMatchups ?? []))
                push(m.championKey ?? m.opponent_key, m.winrate, m.games);
            if (list.length === 0) {
                for (const m of (stats?.bestMatchups ?? []))
                    push(m.championKey ?? m.opponent_key, m.winrate, m.games);
                for (const m of (stats?.worstMatchups ?? []))
                    push(m.championKey ?? m.opponent_key, m.winrate, m.games);
            }
            if (list.length === 0)
                for (const m of (mu?.matchups ?? []))
                    push(m.opponent_key, m.winrate, m.games);
            list.sort((a, b) => b.winrate - a.winrate);
            setNodes(list);
            setSelectedKey(list[0]?.key ?? null);
            setLoading(false);
            if (list.length === 0)
                setError("No matchup data for this champion yet.");
        }).catch(() => { if (!cancelled) {
            setError("Failed to load matchups.");
            setLoading(false);
        } });
        return () => { cancelled = true; };
    }, [champ?.key, keyToId]);
    const selected = nodes.find(n => n.key === selectedKey) || null;
    const best = nodes.slice(0, 3);
    const worst = [...nodes].slice(-3).reverse();
    // The matchup the build-path engine should solve: this champ, with the picked
    // opponent on the enemy team. Roles omitted on purpose — the enemy-champion
    // constraint already pins the lane matchup (verified ~identical cohort with/without
    // role), and this tab doesn't carry the subject's role. Memoised so BuildPathViz
    // only re-queries when the pick actually changes.
    const matchupGraph = useMemo(() => {
        if (!selected)
            return null;
        return {
            subject: { champion: champ.id },
            constraints: [{ type: "enemy", champion: selected.id }],
            filters: { scope: "current_patch", queues: [420, 440] },
            output: { kind: "stats" },
        };
    }, [champ.id, selected?.id]);
    if (loading) {
        return (_jsx("div", { className: "grid place-items-center h-[440px] rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.55)]", style: GLASS, children: _jsx("span", { className: "font-jetbrains text-[11px] uppercase tracking-[0.2em] text-flash/40 animate-pulse", children: "Mapping matchups\u2026" }) }));
    }
    if (error) {
        return (_jsx("div", { className: "grid place-items-center h-[260px] rounded-2xl border border-flash/[0.06] bg-[rgba(6,12,14,0.55)]", children: _jsx("span", { className: "font-jetbrains text-[12px] text-flash/40", children: error }) }));
    }
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "grid lg:grid-cols-[1.5fr_1fr] gap-4 items-start", children: [_jsxs("div", { className: "relative min-h-[440px]", children: [webgl ? (_jsx(OrbitBoundary, { fallback: _jsx(Grid2D, { nodes: nodes, selectedKey: selectedKey, onSelect: setSelectedKey }), children: _jsx(MatchupOrbit, { subjectIconUrl: subjectIcon, nodes: nodes, selectedKey: selectedKey, onSelect: setSelectedKey, className: "absolute inset-0" }) })) : (_jsx(Grid2D, { nodes: nodes, selectedKey: selectedKey, onSelect: setSelectedKey })), _jsxs("div", { className: "absolute inset-x-0 bottom-0 z-[2] flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-t from-[#040A0C] via-[#040A0C]/85 to-transparent pointer-events-none", children: [_jsxs("div", { className: "flex items-center gap-1.5 pointer-events-auto", children: [_jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.16em] text-jade/60 mr-1", children: "Best" }), best.map(n => (_jsx("button", { onClick: () => setSelectedKey(n.key), title: `${n.name} · ${n.winrate.toFixed(1)}%`, children: _jsx("img", { src: n.iconUrl, alt: n.name, className: cn("w-7 h-7 rounded-md object-cover ring-1 transition-all hover:scale-110", n.key === selectedKey ? "ring-jade" : "ring-jade/30") }) }, n.key)))] }), _jsxs("div", { className: "flex items-center gap-1.5 pointer-events-auto", children: [worst.map(n => (_jsx("button", { onClick: () => setSelectedKey(n.key), title: `${n.name} · ${n.winrate.toFixed(1)}%`, children: _jsx("img", { src: n.iconUrl, alt: n.name, className: cn("w-7 h-7 rounded-md object-cover ring-1 transition-all hover:scale-110", n.key === selectedKey ? "ring-[#ff6286]" : "ring-[#ff6286]/30") }) }, n.key))), _jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.16em] text-[#ff6286]/60 ml-1", children: "Worst" })] })] })] }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(MatchupSearch, { nodes: nodes, onPick: setSelectedKey }), selected ? (_jsxs(_Fragment, { children: [_jsx("div", { className: cn(PANEL, "p-4 backdrop-blur-md"), style: GLASS, children: _jsx(MatchupVerdict, { champ: champ, node: selected, badge: badgeFromWR(selected.winrate), tips: tips[selected.key], onFull: () => navigate(`/champions/${champ.id}/statistics?vs=${selected.id}`) }) }), _jsx(RunesCard, { championKey: Number(champ.key), opponentKey: Number(selected.key), opponentName: selected.name }, `${champ.id}:${selected.id}`)] })) : (_jsx("div", { className: cn(PANEL, "p-5 grid place-items-center min-h-[200px] text-flash/40 font-jetbrains text-[12px]"), children: "Pick a matchup" }))] })] }), selected && matchupGraph && (_jsxs("section", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs(Eyebrow, { children: ["Recommended build vs ", selected.name] }), _jsx("span", { className: "font-jetbrains text-[10px] uppercase tracking-[0.16em] text-flash/35", children: "current patch \u00B7 ranked" })] }), _jsx(BuildPathViz, { graph: matchupGraph, bare: true })] }))] }));
}
// ── search: jump straight to any of this champion's matchups ───────
function MatchupSearch({ nodes, onPick }) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const results = useMemo(() => {
        const t = q.trim().toLowerCase();
        const pool = t ? nodes.filter(n => n.name.toLowerCase().includes(t)) : nodes;
        return pool.slice(0, 24);
    }, [q, nodes]);
    return (_jsxs("div", { className: "relative", children: [_jsxs("svg", { viewBox: "0 0 24 24", className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-flash/35", fill: "none", stroke: "currentColor", strokeWidth: 2, children: [_jsx("circle", { cx: "11", cy: "11", r: "7" }), _jsx("path", { d: "m20 20-3.2-3.2", strokeLinecap: "round" })] }), _jsx("input", { value: q, onChange: e => { setQ(e.target.value); setOpen(true); }, onFocus: () => setOpen(true), onBlur: () => window.setTimeout(() => setOpen(false), 150), placeholder: "Search a matchup\u2026", className: "w-full h-11 rounded-xl bg-black/30 ring-1 ring-inset ring-white/10 focus:ring-jade/40 pl-9 pr-3 font-jetbrains text-[12px] text-flash/85 placeholder:text-flash/30 outline-none transition-shadow" }), open && results.length > 0 && (_jsx("div", { className: "absolute z-30 mt-1.5 w-full rounded-xl border border-jade/15 bg-[rgba(6,12,14,0.97)] backdrop-blur-md p-1 max-h-[280px] overflow-y-auto cyber-scrollbar", style: { boxShadow: "0 30px 60px -25px rgba(0,0,0,0.8)" }, children: results.map(n => {
                    const c = n.winrate >= 51 ? "text-jade" : n.winrate < 49 ? "text-[#ff6286]" : "text-flash/60";
                    return (_jsxs("button", { onMouseDown: () => { onPick(n.key); setQ(""); setOpen(false); }, className: "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-jade/[0.08] transition-colors cursor-clicker", children: [_jsx("img", { src: n.iconUrl, alt: "", className: "w-7 h-7 rounded-md object-cover shrink-0" }), _jsx("span", { className: "flex-1 font-chakrapetch text-[13px] font-semibold text-flash/80 truncate", children: n.name }), _jsxs("span", { className: cn("font-chakrapetch text-[12px] font-bold tabular-nums shrink-0", c), children: [n.winrate.toFixed(1), "%"] })] }, n.key));
                }) }))] }));
}
// ── compact verdict ────────────────────────────────────────────────
function MatchupVerdict({ champ, node, badge, tips, onFull, }) {
    const wr = node.winrate;
    return (_jsxs("div", { className: "space-y-3.5", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("img", { src: champIcon(champ.id), alt: champ.name, className: "w-9 h-9 rounded-lg object-cover ring-1 ring-jade/25 shrink-0" }), _jsx("span", { className: "font-chakrapetch text-[10px] font-bold uppercase tracking-[0.1em] text-flash/35 shrink-0", children: "vs" }), _jsx("img", { src: node.iconUrl, alt: node.name, className: "w-9 h-9 rounded-lg object-cover ring-1 ring-[#ff6286]/25 shrink-0" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "font-chakrapetch text-[15px] font-bold leading-tight text-flash/90 truncate", children: node.name }), _jsxs("div", { className: "font-jetbrains text-[10px] text-flash/40 tabular-nums", children: [node.games.toLocaleString(), " games"] })] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsxs("div", { className: cn("font-chakrapetch text-[26px] font-bold leading-none tabular-nums", wrText(wr)), style: wr >= 51 ? { textShadow: "0 0 22px rgba(0,217,146,0.3)" } : undefined, children: [wr.toFixed(1), "%"] }), _jsx("span", { className: cn("inline-block mt-1 rounded px-1.5 py-0.5 font-chakrapetch text-[9px] font-bold uppercase tracking-[0.1em]", badgeClass(badge)), children: badge })] })] }), _jsx("div", { className: "h-1.5 rounded-full overflow-hidden bg-[#ff6286]/20", children: _jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-jade/70 to-jade", style: { width: `${Math.max(4, Math.min(96, wr))}%` } }) }), tips && _jsx("p", { className: "text-[12px] leading-relaxed text-flash/55 line-clamp-3", children: tips }), _jsxs("button", { onClick: onFull, className: "group inline-flex items-center gap-1.5 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.12em] text-jade/80 hover:text-jade cursor-clicker transition-colors", children: ["Full VS breakdown", _jsx("span", { className: "transition-transform group-hover:translate-x-0.5", children: "\u2192" })] })] }));
}
function RunesCard({ championKey, opponentKey, opponentName }) {
    const [top, setTop] = useState(null);
    const [phase, setPhase] = useState("loading");
    useEffect(() => {
        let cancelled = false;
        setPhase("loading");
        setTop(null);
        fetch(`${API_BASE_URL}/api/champion/runes`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ championId: championKey, opponentId: opponentKey, limit: 12 }),
        })
            .then(r => (r.ok ? r.json() : null))
            .then(d => {
            if (cancelled)
                return;
            const all = d?.runes ?? [];
            if (!all.length) {
                setTop(null);
                setPhase("empty");
                return;
            }
            // Don't just show the most-PICKED page — that's the champ's default and comes
            // out identical for every matchup. Rank by win rate, but shrink each page toward
            // the matchup's OWN pooled win rate (not 50%) and weight by sample: a page wins
            // by genuinely beating the matchup baseline with enough games, so a tiny high-WR
            // fluke can't out-rank a well-sampled page in a losing lane.
            const topGames = Math.max(...all.map(r => r.games));
            const totalGames = all.reduce((s, r) => s + r.games, 0);
            const baseline = all.reduce((s, r) => s + r.games * r.winrate, 0) / Math.max(1, totalGames); // pooled WR %
            const floor = Math.max(40, Math.round(topGames * 0.08));
            const K = 100;
            const score = (r) => (r.games * r.winrate + K * baseline) / (r.games + K);
            const pool = all.filter(r => r.games >= floor);
            const best = (pool.length ? pool : all).slice().sort((a, b) => score(b) - score(a))[0];
            setTop(best ?? null);
            setPhase(best ? "ready" : "empty");
        })
            .catch(() => { if (!cancelled)
            setPhase("error"); });
        return () => { cancelled = true; };
    }, [championKey, opponentKey]);
    return (_jsxs("div", { className: cn(PANEL, "p-4 md:p-5"), children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("span", { className: "w-1 h-3.5 bg-jade rounded-full" }), _jsx("span", { className: "text-[11px] font-chakrapetch font-bold tracking-[0.2em] uppercase text-flash/55", children: "Best runes" })] }), phase === "loading" && (_jsx("div", { className: "h-[150px] grid place-items-center text-[11px] font-chakrapetch text-flash/35 animate-pulse", children: "reading the runes\u2026" })), phase === "error" && (_jsx("div", { className: "h-[120px] grid place-items-center text-[11px] font-chakrapetch text-flash/35", children: "Runes unavailable." })), (phase === "empty" || (phase === "ready" && !top)) && (_jsxs("div", { className: "h-[120px] grid place-items-center text-center px-4 text-[11px] font-chakrapetch text-flash/35", children: ["No rune data vs ", opponentName, " yet."] })), phase === "ready" && top && (_jsxs("div", { className: "flex flex-col items-center text-center", children: [getKeystoneIcon(top.perk_keystone) ? (_jsx("img", { src: getKeystoneIcon(top.perk_keystone), alt: "", className: "w-16 h-16 rounded-full ring-1 ring-jade/30 bg-black/40 p-1.5", style: { boxShadow: "0 0 22px rgba(0,217,146,0.25)" } })) : (_jsx("div", { className: "w-16 h-16 rounded-full ring-1 ring-jade/30 bg-black/40" })), _jsx("div", { className: "mt-2.5 font-chakrapetch text-[15px] font-bold text-flash/90", children: getKeystoneName(top.perk_keystone) ?? "Keystone" }), _jsxs("div", { className: "mt-3 flex items-center gap-2", children: [_jsx(TreePill, { styleId: top.perk_primary_style }), _jsx("span", { className: "text-flash/25 text-[11px]", children: "+" }), _jsx(TreePill, { styleId: top.perk_sub_style })] }), _jsxs("div", { className: "mt-4 grid grid-cols-3 gap-1.5 w-full", children: [_jsx(Stat, { label: "win rate", value: `${top.winrate.toFixed(1)}%`, good: top.winrate >= 50 }), _jsx(Stat, { label: "pick", value: `${Math.round(top.pick_rate)}%` }), _jsx(Stat, { label: "games", value: compact(top.games) })] })] }))] }));
}
function TreePill({ styleId }) {
    const icon = getStyleIcon(styleId);
    const name = getStyleName(styleId);
    return (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/10 pl-1 pr-2.5 py-1", children: [icon ? _jsx("img", { src: icon, alt: "", className: "w-5 h-5" }) : _jsx("span", { className: "w-5 h-5 rounded-full bg-white/10" }), _jsx("span", { className: "font-chakrapetch text-[11px] font-semibold text-flash/70", children: name ?? "—" })] }));
}
function Stat({ label, value, good }) {
    return (_jsxs("div", { className: "rounded-lg bg-black/25 ring-1 ring-inset ring-white/[0.06] py-2", children: [_jsx("div", { className: cn("font-chakrapetch text-[15px] font-bold tabular-nums", good == null ? "text-flash/85" : good ? "text-jade" : "text-[#ff6286]"), children: value }), _jsx("div", { className: "font-jetbrains text-[8px] uppercase tracking-[0.16em] text-flash/35 mt-0.5", children: label })] }));
}
function compact(n) {
    if (n >= 1000)
        return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(n);
}
export default ChampionMatchupsTab;
