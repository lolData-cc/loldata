import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle, } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { useAuth } from "@/context/authcontext";
// ── Constants ────────────────────────────────────────────────────────
const AC = "#00d992";
const AC_GLOW = "rgba(0,217,146,0.4)";
const AC_DIM = "rgba(0,217,146,0.08)";
const AC_MID = "rgba(0,217,146,0.15)";
const ERROR_COLOR = "#ff6286";
const CITRINE = "#FFB615";
// ── HUD Decorations ─────────────────────────────────────────────────
function HudCorners({ color = AC }) {
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "absolute top-0 left-0 w-4 h-4 z-[3] pointer-events-none", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[2px]", style: { background: color } }), _jsx("div", { className: "absolute top-0 left-0 w-[2px] h-full", style: { background: color } })] }), _jsxs("div", { className: "absolute top-0 right-0 w-4 h-4 z-[3] pointer-events-none", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[2px]", style: { background: color } }), _jsx("div", { className: "absolute top-0 right-0 w-[2px] h-full", style: { background: color } })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-4 h-4 z-[3] pointer-events-none", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[2px]", style: { background: color } }), _jsx("div", { className: "absolute bottom-0 left-0 w-[2px] h-full", style: { background: color } })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-4 h-4 z-[3] pointer-events-none", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[2px]", style: { background: color } }), _jsx("div", { className: "absolute bottom-0 right-0 w-[2px] h-full", style: { background: color } })] })] }));
}
function Scanlines() {
    return (_jsx("div", { className: "absolute inset-0 pointer-events-none z-[1]", style: {
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.02) 2px, rgba(255,255,255,0.02) 4px)",
        } }));
}
function ScanBeam() {
    return (_jsx("div", { className: "absolute inset-0 pointer-events-none z-[2]", style: {
            background: `linear-gradient(to bottom, transparent 0%, ${AC_MID} 50%, transparent 100%)`,
            backgroundSize: "100% 30px",
            animation: "ct-scan 4s linear infinite",
        } }));
}
// ── Section Card Wrapper ─────────────────────────────────────────────
function SectionCard({ title, tag, children, delay: d = 0, accentColor = AC, }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: d, ease: "easeOut" }, className: "relative overflow-hidden rounded-sm", style: {
            background: "#040A0C",
            border: `1px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
        }, children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px]", style: { background: accentColor, boxShadow: `0 0 8px ${accentColor}40` } }), _jsxs("div", { className: "relative z-[5] px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-[9px] tracking-[0.25em] uppercase mb-3", style: { color: `color-mix(in srgb, ${accentColor} 50%, transparent)` }, children: [_jsx("span", { style: { color: accentColor, fontSize: "7px" }, children: "\u25C8" }), _jsx("span", { children: "::" }), _jsx("span", { className: "px-1.5 py-[1px]", style: {
                                    color: accentColor,
                                    background: `${accentColor}15`,
                                    border: `1px solid color-mix(in srgb, ${accentColor} 30%, transparent)`,
                                    borderRadius: "1px",
                                    letterSpacing: "0.2em",
                                }, children: tag }), _jsx("span", { children: "::" }), _jsx("span", { className: "flex-1 h-[1px]", style: {
                                    background: `linear-gradient(90deg, color-mix(in srgb, ${accentColor} 25%, transparent), transparent)`,
                                } })] }), _jsx("h3", { className: "font-jetbrains text-[13px] font-medium tracking-[0.04em] text-flash/90 mb-3", children: title }), children] })] }));
}
// ── Stat Pill ────────────────────────────────────────────────────────
function StatPill({ label, value, sub }) {
    return (_jsxs("div", { className: "flex flex-col items-center gap-0.5 px-3 py-2 rounded-sm bg-white/[0.03] border border-white/[0.06]", children: [_jsx("span", { className: "text-[9px] tracking-[0.15em] uppercase text-flash/30 font-jetbrains", children: label }), _jsx("span", { className: "text-[15px] font-jetbrains font-medium text-flash/90", children: value }), sub && (_jsx("span", { className: "text-[9px] text-flash/25 font-jetbrains", children: sub }))] }));
}
// ── Bar ──────────────────────────────────────────────────────────────
function PctBar({ pct, color = AC, label, sub }) {
    return (_jsxs("div", { className: "flex items-center gap-3 py-1", children: [_jsx("span", { className: "w-[70px] text-right text-[10px] font-jetbrains text-flash/50 uppercase tracking-wider shrink-0", children: label }), _jsx("div", { className: "flex-1 h-[6px] bg-white/[0.06] rounded-sm overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${Math.min(pct, 100)}%` }, transition: { duration: 0.6, ease: "easeOut" }, className: "h-full rounded-sm", style: { background: color } }) }), _jsxs("span", { className: "w-[42px] text-[10px] font-jetbrains text-flash/60", children: [pct, "%"] }), sub && (_jsx("span", { className: "text-[9px] font-jetbrains text-flash/30 w-[40px]", children: sub }))] }));
}
// ── Results Sections ─────────────────────────────────────────────────
function RoleSection({ data }) {
    const roleColors = {
        TOP: "#3b82f6",
        JUNGLE: "#22c55e",
        MIDDLE: "#f59e0b",
        BOTTOM: "#ef4444",
        UTILITY: "#a855f7",
    };
    return (_jsx(SectionCard, { title: "Role Distribution", tag: "ROLES", delay: 0.1, children: _jsx("div", { className: "space-y-1", children: data.roleDistribution.map((r) => (_jsx(PctBar, { label: r.role, pct: r.pct, color: roleColors[r.role] ?? AC, sub: `${r.games}g` }, r.role))) }) }));
}
export function ChampionPoolSection({ data }) {
    const top5 = data.championPool.slice(0, 5);
    return (_jsx(SectionCard, { title: "Champion Pool", tag: "CHAMPS", delay: 0.2, children: _jsx("div", { className: "space-y-2", children: top5.map((c) => (_jsxs("div", { className: "flex items-center gap-3 py-1", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.championName}.png`, alt: c.championName, className: "w-7 h-7 rounded-sm border border-white/10" }), _jsx("span", { className: "w-[80px] text-[11px] font-jetbrains text-flash/80 truncate", children: c.championName }), _jsxs("span", { className: "text-[10px] font-jetbrains text-flash/40 w-[30px]", children: [c.games, "g"] }), _jsx("div", { className: "flex-1 h-[6px] bg-white/[0.06] rounded-sm overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${c.winrate}%` }, transition: { duration: 0.6, ease: "easeOut" }, className: "h-full rounded-sm", style: { background: c.winrate >= 50 ? AC : ERROR_COLOR } }) }), _jsxs("span", { className: "w-[38px] text-[10px] font-jetbrains font-medium", style: { color: c.winrate >= 50 ? AC : ERROR_COLOR }, children: [c.winrate, "%"] }), _jsxs("span", { className: "text-[10px] font-jetbrains text-flash/40 w-[50px] text-right", children: [c.avgKda, " KDA"] })] }, c.championName))) }) }));
}
export function OverallStatsSection({ data }) {
    const s = data.overallStats;
    return (_jsx(SectionCard, { title: "Performance Overview", tag: "STATS", delay: 0.3, children: _jsxs("div", { className: "grid grid-cols-4 gap-2", children: [_jsx(StatPill, { label: "KDA", value: s.avgKda, sub: `${s.avgKills}/${s.avgDeaths}/${s.avgAssists}` }), _jsx(StatPill, { label: "CS/min", value: s.avgCsPerMin }), _jsx(StatPill, { label: "Gold/min", value: s.avgGoldPerMin }), _jsx(StatPill, { label: "KP %", value: `${s.avgKillParticipation}%` }), _jsx(StatPill, { label: "DMG %", value: `${s.avgDamageShare}%` }), _jsx(StatPill, { label: "Vision/min", value: s.avgVisionPerMin }), _jsx(StatPill, { label: "Solo Kills", value: s.avgSoloKills }), _jsx(StatPill, { label: "Winrate", value: `${s.winrate}%`, sub: `${s.wins}W ${s.games - s.wins}L` })] }) }));
}
function WinLossSection({ data }) {
    return (_jsx(SectionCard, { title: "Win vs Loss Performance", tag: "DELTA", delay: 0.4, children: _jsx("div", { className: "space-y-2", children: data.winLossComparison.map((m) => (_jsxs("div", { className: "flex items-center gap-3 py-0.5", children: [_jsx("span", { className: "w-[100px] text-[10px] font-jetbrains text-flash/50 uppercase tracking-wider text-right shrink-0", children: m.metric }), _jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsx("span", { className: "text-[11px] font-jetbrains text-jade w-[50px] text-right", children: m.onWin }), _jsxs("div", { className: "flex-1 flex items-center gap-0.5", children: [_jsx("div", { className: "flex-1 h-[4px] bg-white/[0.06] rounded-sm overflow-hidden flex justify-end", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${Math.min(Math.max((m.onWin / (m.onWin + m.onLoss || 1)) * 100, 5), 95)}%` }, transition: { duration: 0.6, ease: "easeOut" }, className: "h-full rounded-sm bg-jade/60" }) }), _jsx("div", { className: "w-px h-3 bg-flash/20" }), _jsx("div", { className: "flex-1 h-[4px] bg-white/[0.06] rounded-sm overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${Math.min(Math.max((m.onLoss / (m.onWin + m.onLoss || 1)) * 100, 5), 95)}%` }, transition: { duration: 0.6, ease: "easeOut" }, className: "h-full rounded-sm bg-error/60" }) })] }), _jsx("span", { className: "text-[11px] font-jetbrains text-error w-[50px]", children: m.onLoss })] }), _jsxs("span", { className: "text-[10px] font-jetbrains font-medium w-[50px] text-right", style: { color: m.delta >= 0 ? AC : ERROR_COLOR }, children: [m.delta >= 0 ? "+" : "", m.delta] })] }, m.metric))) }) }));
}
function JungleSection({ data }) {
    const ja = data.jungleAnalysis;
    if (!ja)
        return null;
    const campColors = {
        blue: "#3b82f6",
        red: "#ef4444",
        raptors: "#f59e0b",
        wolves: "#6366f1",
        gromp: "#22c55e",
        krugs: "#a855f7",
    };
    const tagReadable = {
        played_for_topside: "TOPSIDE",
        played_for_botside: "BOTSIDE",
        played_for_both: "BOTH SIDES",
    };
    return (_jsx(SectionCard, { title: "Jungle Patterns", tag: "JUNGLE", delay: 0.5, accentColor: "#22c55e", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-[9px] font-jetbrains text-flash/30 uppercase tracking-[0.2em] mb-2", children: ["Starting Camp Distribution (", ja.gamesAsJungler, " games)"] }), _jsx("div", { className: "space-y-1", children: ja.startingCamps.map((c) => (_jsx(PctBar, { label: c.camp.replace("enemy_", "E."), pct: c.pct, color: campColors[c.camp.replace("enemy_", "")] ?? AC, sub: `${c.count}g` }, c.camp))) })] }), _jsxs("div", { className: "flex gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-[9px] font-jetbrains text-flash/30 uppercase tracking-[0.2em] mb-2", children: "Playstyle Tendency" }), _jsx("div", { className: "space-y-1", children: ja.playstyleTags.map((t) => (_jsx(PctBar, { label: tagReadable[t.tag] ?? t.tag, pct: t.pct, color: "#6366f1", sub: `${t.count}g` }, t.tag))) })] }), _jsxs("div", { className: "w-[120px] flex flex-col items-center justify-center bg-white/[0.02] rounded-sm border border-white/[0.06] p-3", children: [_jsx("span", { className: "text-[9px] font-jetbrains text-flash/30 uppercase tracking-[0.2em] mb-1", children: "Invade Rate" }), _jsxs("span", { className: "text-[22px] font-jetbrains font-bold", style: { color: ja.invadeRate > 20 ? ERROR_COLOR : AC }, children: [ja.invadeRate, "%"] })] })] })] }) }));
}
function WardDistributionSection({ data }) {
    const wd = data.wardDistribution;
    if (!wd || wd.totalWards === 0)
        return null;
    const tPct = wd.topsidePct;
    const bPct = wd.botsidePct;
    const nPct = +(100 - tPct - bPct).toFixed(1);
    return (_jsx(SectionCard, { title: "Ward Placement Map", tag: "VISION", delay: 0.55, accentColor: "#f59e0b", children: _jsxs("div", { className: "flex items-center gap-5", children: [_jsx("div", { className: "relative w-[110px] h-[110px] shrink-0", children: _jsxs("div", { className: "absolute inset-0 rounded-sm overflow-hidden", style: {
                            background: "linear-gradient(135deg, #1a3a2e 0%, #0a1a14 50%, #1a2a3e 100%)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }, children: [_jsx("div", { className: "absolute inset-0", style: {
                                    background: "linear-gradient(135deg, transparent 48%, rgba(255,255,255,0.08) 49%, rgba(255,255,255,0.08) 51%, transparent 52%)",
                                } }), _jsx("div", { className: "absolute top-0 left-0 w-full h-1/2", style: {
                                    background: `linear-gradient(135deg, rgba(59,130,246,${Math.min(tPct / 100, 0.4)}) 0%, transparent 80%)`,
                                } }), _jsx("div", { className: "absolute bottom-0 right-0 w-full h-1/2", style: {
                                    background: `linear-gradient(315deg, rgba(239,68,68,${Math.min(bPct / 100, 0.4)}) 0%, transparent 80%)`,
                                } }), _jsxs("div", { className: "absolute top-2 left-2 text-[9px] font-jetbrains font-bold text-blue-400/80", children: [tPct, "%"] }), _jsxs("div", { className: "absolute bottom-2 right-2 text-[9px] font-jetbrains font-bold text-red-400/80", children: [bPct, "%"] }), _jsx("div", { className: "absolute top-1 right-2 text-[7px] font-jetbrains text-flash/20 uppercase", children: "top" }), _jsx("div", { className: "absolute bottom-1 left-2 text-[7px] font-jetbrains text-flash/20 uppercase", children: "bot" })] }) }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(PctBar, { label: "TOPSIDE", pct: tPct, color: "#3b82f6", sub: `${wd.topside}w` }), _jsx(PctBar, { label: "BOTSIDE", pct: bPct, color: "#ef4444", sub: `${wd.botside}w` }), _jsx(PctBar, { label: "NEUTRAL", pct: nPct, color: "#6b7280", sub: `${wd.neutral}w` }), _jsx("div", { className: "pt-1 border-t border-white/[0.06]", children: _jsxs("span", { className: "text-[9px] font-jetbrains text-flash/25", children: ["Total wards placed: ", wd.totalWards, " across ", data.meta.matchesAnalyzed, " games"] }) })] })] }) }));
}
const BOOTS_ITEM_IDS = {
    "Berserker's Greaves": 3006,
    "Boots of Swiftness": 3009,
    "Sorcerer's Shoes": 3020,
    "Plated Steelcaps": 3047,
    "Mercury's Treads": 3111,
    "Mobility Boots": 3117,
    "Ionian Boots": 3158,
};
const BOOTS_COLORS = {
    "Berserker's Greaves": "#ef4444",
    "Sorcerer's Shoes": "#8b5cf6",
    "Plated Steelcaps": "#a3a3a3",
    "Mercury's Treads": "#6366f1",
    "Ionian Boots": "#3b82f6",
    "Boots of Swiftness": "#22c55e",
    "Mobility Boots": "#f59e0b",
};
function BootsDistributionSection({ data }) {
    const boots = data.bootsDistribution;
    if (!boots || boots.length === 0)
        return null;
    // Filter out "No Boots"
    const filtered = boots.filter((b) => b.boots !== "No Boots");
    if (filtered.length === 0)
        return null;
    return (_jsx(SectionCard, { title: "Boots Buy Distribution", tag: "ITEMS", delay: 0.6, accentColor: "#8b5cf6", children: _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-3 pb-1", children: [_jsx("div", { className: "w-7 shrink-0" }), _jsx("div", { className: "w-[110px] shrink-0" }), _jsx("div", { className: "flex-1" }), _jsx("span", { className: "w-[38px] text-[9px] font-jetbrains text-flash/30 text-right uppercase", children: "Pick" }), _jsx("span", { className: "w-[38px] text-[9px] font-jetbrains text-flash/30 text-right uppercase", children: "WR" }), _jsx("div", { className: "w-[24px]" })] }), filtered.map((b) => {
                    const itemId = BOOTS_ITEM_IDS[b.boots];
                    const color = BOOTS_COLORS[b.boots] ?? AC;
                    return (_jsxs("div", { className: "flex items-center gap-3 py-1", children: [itemId ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: b.boots, className: "w-7 h-7 rounded-sm border border-white/10 shrink-0" })) : (_jsx("div", { className: "w-7 h-7 rounded-sm bg-white/5 border border-white/10 shrink-0" })), _jsx("span", { className: "w-[110px] text-[10px] font-jetbrains text-flash/60 truncate shrink-0", children: b.boots }), _jsx("div", { className: "flex-1 h-[6px] bg-white/[0.06] rounded-sm overflow-hidden", children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${Math.min(b.pct, 100)}%` }, transition: { duration: 0.6, ease: "easeOut" }, className: "h-full rounded-sm", style: { background: color } }) }), _jsxs("span", { className: "w-[38px] text-[10px] font-jetbrains font-medium text-flash/70 text-right", children: [b.pct, "%"] }), _jsxs("span", { className: "w-[38px] text-[10px] font-jetbrains font-medium text-right", style: { color: b.winRate >= 50 ? "#4ade80" : "#f87171" }, children: [b.winRate, "%"] }), _jsxs("span", { className: "w-[24px] text-[9px] font-jetbrains text-flash/30 text-right", children: [b.count, "g"] })] }, b.boots));
                })] }) }));
}
function EarlyGameSection({ data }) {
    const eg = data.earlyGameAnalysis;
    if (!eg || eg.gamesWithTimeline === 0)
        return null;
    const bars = [
        {
            label: "AHEAD",
            games: eg.aheadAtTen.games,
            wins: eg.aheadAtTen.wins,
            winrate: eg.aheadAtTen.winrate,
            color: AC,
            desc: "More kills or 500g+ lead at 10 min",
        },
        {
            label: "EVEN",
            games: eg.evenAtTen.games,
            wins: eg.evenAtTen.wins,
            winrate: eg.evenAtTen.winrate,
            color: "#6366f1",
            desc: "Comparable kills & gold at 10 min",
        },
        {
            label: "BEHIND",
            games: eg.behindAtTen.games,
            wins: eg.behindAtTen.wins,
            winrate: eg.behindAtTen.winrate,
            color: ERROR_COLOR,
            desc: "Fewer kills or 500g+ deficit at 10 min",
        },
    ];
    const maxGames = Math.max(...bars.map((b) => b.games), 1);
    return (_jsx(SectionCard, { title: "Early Game Impact (Pre-10 min)", tag: "EARLY", delay: 0.65, accentColor: "#3b82f6", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "space-y-3", children: bars.map((b) => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[10px] font-jetbrains font-medium tracking-[0.1em]", style: { color: b.color }, children: b.label }), _jsx("span", { className: "text-[9px] font-jetbrains text-flash/25", children: b.desc })] }), _jsxs("span", { className: "text-[10px] font-jetbrains text-flash/40", children: [b.games, "g \u2014 ", b.wins, "W ", b.games - b.wins, "L"] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex-1 h-[8px] bg-white/[0.04] rounded-sm overflow-hidden", children: b.games > 0 && (_jsx(motion.div, { initial: { width: 0 }, animate: { width: `${(b.games / maxGames) * 100}%` }, transition: { duration: 0.6, ease: "easeOut" }, className: "h-full rounded-sm relative overflow-hidden", style: { background: `color-mix(in srgb, ${b.color} 30%, transparent)` }, children: _jsx(motion.div, { initial: { width: 0 }, animate: { width: `${b.winrate}%` }, transition: { duration: 0.8, ease: "easeOut", delay: 0.3 }, className: "h-full rounded-sm", style: { background: b.color } }) })) }), _jsx("span", { className: "w-[42px] text-[11px] font-jetbrains font-medium text-right", style: { color: b.games > 0 ? (b.winrate >= 50 ? AC : ERROR_COLOR) : "rgba(215,216,217,0.2)" }, children: b.games > 0 ? `${b.winrate}%` : "—" })] })] }, b.label))) }), _jsxs("div", { className: "grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.06]", children: [_jsxs("div", { className: "flex flex-col items-center gap-0.5 px-2 py-2 rounded-sm bg-white/[0.03] border border-white/[0.06]", children: [_jsx("span", { className: "text-[8px] tracking-[0.15em] uppercase text-flash/30 font-jetbrains", children: "AVG KILL DIFF" }), _jsxs("span", { className: "text-[14px] font-jetbrains font-medium", style: { color: eg.avgKillDiffAtTen >= 0 ? AC : ERROR_COLOR }, children: [eg.avgKillDiffAtTen >= 0 ? "+" : "", eg.avgKillDiffAtTen] })] }), _jsxs("div", { className: "flex flex-col items-center gap-0.5 px-2 py-2 rounded-sm bg-white/[0.03] border border-white/[0.06]", children: [_jsx("span", { className: "text-[8px] tracking-[0.15em] uppercase text-flash/30 font-jetbrains", children: "AVG GOLD DIFF" }), _jsxs("span", { className: "text-[14px] font-jetbrains font-medium", style: { color: eg.avgGoldDiffAtTen >= 0 ? AC : ERROR_COLOR }, children: [eg.avgGoldDiffAtTen >= 0 ? "+" : "", eg.avgGoldDiffAtTen] })] }), _jsxs("div", { className: "flex flex-col items-center gap-0.5 px-2 py-2 rounded-sm bg-white/[0.03] border border-white/[0.06]", children: [_jsx("span", { className: "text-[8px] tracking-[0.15em] uppercase text-flash/30 font-jetbrains", children: "AVG CS DIFF" }), _jsxs("span", { className: "text-[14px] font-jetbrains font-medium", style: { color: eg.avgCsDiffAtTen >= 0 ? AC : ERROR_COLOR }, children: [eg.avgCsDiffAtTen >= 0 ? "+" : "", eg.avgCsDiffAtTen] })] }), _jsxs("div", { className: "flex flex-col items-center gap-0.5 px-2 py-2 rounded-sm bg-white/[0.03] border border-white/[0.06]", children: [_jsx("span", { className: "text-[8px] tracking-[0.15em] uppercase text-flash/30 font-jetbrains", children: "FIRST BLOOD" }), _jsxs("span", { className: "text-[14px] font-jetbrains font-medium text-flash/80", children: [eg.firstBloodRate, "%"] }), eg.firstBloodRate > 0 && (_jsxs("span", { className: "text-[8px] font-jetbrains", style: { color: eg.firstBloodWinrate >= 50 ? AC : ERROR_COLOR }, children: [eg.firstBloodWinrate, "% WR"] }))] })] })] }) }));
}
function WeaknessesSection({ data }) {
    if (data.weaknesses.length === 0)
        return null;
    const severityStyles = {
        critical: { color: ERROR_COLOR, bg: "rgba(255,98,134,0.08)", border: "rgba(255,98,134,0.3)" },
        major: { color: CITRINE, bg: "rgba(255,182,21,0.06)", border: "rgba(255,182,21,0.25)" },
        minor: { color: "#94a3b8", bg: "rgba(148,163,184,0.05)", border: "rgba(148,163,184,0.2)" },
    };
    return (_jsx(SectionCard, { title: "Identified Weaknesses", tag: "VULN", delay: 0.7, accentColor: ERROR_COLOR, children: _jsx("div", { className: "space-y-2", children: data.weaknesses.map((w) => {
                const style = severityStyles[w.severity] ?? severityStyles.minor;
                return (_jsxs("div", { className: "flex items-start gap-3 p-2.5 rounded-sm", style: { background: style.bg, border: `1px solid ${style.border}` }, children: [_jsx("span", { className: "shrink-0 px-1.5 py-[1px] text-[8px] font-jetbrains uppercase tracking-[0.15em] rounded-sm mt-0.5", style: { color: style.color, border: `1px solid ${style.border}`, background: style.bg }, children: w.severity }), _jsxs("div", { children: [_jsx("p", { className: "text-[11px] font-jetbrains font-medium text-flash/85", children: w.title }), _jsx("p", { className: "text-[10px] font-jetbrains text-flash/40 mt-0.5", children: w.description })] })] }, w.id));
            }) }) }));
}
function CounterTipsSection({ data }) {
    const catColors = {
        early_game: "#3b82f6",
        mid_game: "#8b5cf6",
        late_game: "#ec4899",
        vision: "#f59e0b",
        jungle: "#22c55e",
        champion_pool: "#ef4444",
        mental: "#f97316",
    };
    return (_jsx(SectionCard, { title: "Counter-Strategy Playbook", tag: "COUNTER", delay: 0.8, accentColor: CITRINE, children: _jsx("div", { className: "space-y-3", children: data.counterTips.map((tip, i) => {
                const catColor = catColors[tip.category] ?? AC;
                return (_jsxs("div", { className: "relative pl-4 py-2", style: {
                        borderLeft: `2px solid ${catColor}`,
                    }, children: [_jsx("span", { className: "text-[8px] font-jetbrains uppercase tracking-[0.2em] mb-1 block", style: { color: `color-mix(in srgb, ${catColor} 70%, white)` }, children: tip.category.replace(/_/g, " ") }), _jsx("p", { className: "text-[11px] font-jetbrains font-medium text-flash/85 leading-relaxed", children: tip.tip }), _jsx("p", { className: "text-[10px] font-jetbrains text-flash/35 mt-1 leading-relaxed", children: tip.reasoning })] }, i));
            }) }) }));
}
// ── Main Component ───────────────────────────────────────────────────
export function PlayerAnalysisDialog({ puuid, region, summonerName, externalOpen, onExternalOpenChange, }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = externalOpen ?? internalOpen;
    const setOpen = (v) => {
        setInternalOpen(v);
        onExternalOpenChange?.(v);
    };
    const [phase, setPhase] = useState("idle");
    const [lines, setLines] = useState([]);
    const [result, setResult] = useState(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const terminalRef = useRef(null);
    const abortRef = useRef(null);
    const [showPaywall, setShowPaywall] = useState(false);
    const [paywallReason, setPaywallReason] = useState("login");
    const [trialUsed, setTrialUsed] = useState(false);
    const [usageChecked, setUsageChecked] = useState(false);
    const { session, plan } = useAuth();
    const navigate = useNavigate();
    const isPremium = !!plan && plan.toLowerCase() !== "free";
    const isFreeUser = !plan || plan.toLowerCase() === "free";
    const isLocked = isFreeUser && trialUsed;
    // Check usage status on mount / session change
    useEffect(() => {
        if (!session?.access_token || isPremium) {
            setUsageChecked(true);
            return;
        }
        fetch(`${API_BASE_URL}/api/player/analyze/status`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${session.access_token}` },
        })
            .then((r) => r.json())
            .then((d) => {
            if (d.uses >= 1)
                setTrialUsed(true);
        })
            .catch(() => { })
            .finally(() => setUsageChecked(true));
    }, [session?.access_token, isPremium]);
    const addLine = useCallback((type, text) => {
        setLines((prev) => [...prev, { type, text }]);
    }, []);
    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [lines]);
    const [currentStep, setCurrentStep] = useState("");
    const startAnalysis = useCallback(async () => {
        // Auth gate: must be logged in
        if (!session?.access_token) {
            setPaywallReason("login");
            setShowPaywall(true);
            return;
        }
        setPhase("connecting");
        setLines([]);
        setResult(null);
        setProgress({ current: 0, total: 0 });
        setCurrentStep("CONNECTING");
        const abortController = new AbortController();
        abortRef.current = abortController;
        try {
            const response = await fetch(`${API_BASE_URL}/api/player/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ puuid, region }),
                signal: abortController.signal,
            });
            // Handle paywall responses
            if (response.status === 403) {
                try {
                    const errData = await response.json();
                    if (errData.error === "login_required") {
                        setPaywallReason("login");
                    }
                    else {
                        setPaywallReason("limit");
                        setTrialUsed(true);
                    }
                }
                catch {
                    setPaywallReason("limit");
                    setTrialUsed(true);
                }
                setPhase("idle");
                setLines([]);
                setShowPaywall(true);
                return;
            }
            if (!response.ok || !response.body) {
                setPhase("error");
                addLine("error", `CONNECTION FAILED (${response.status})`);
                return;
            }
            setPhase("analyzing");
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split("\n\n");
                buffer = chunks.pop() || "";
                for (const chunk of chunks) {
                    if (!chunk.startsWith("data: "))
                        continue;
                    try {
                        const event = JSON.parse(chunk.slice(6));
                        if (event.type === "progress") {
                            if (event.current != null && event.total != null) {
                                setProgress({ current: event.current, total: event.total });
                            }
                            setCurrentStep(event.step ?? "");
                            addLine("progress", event.message);
                        }
                        else if (event.type === "result") {
                            setResult(event.data);
                            setPhase("complete");
                            if (isFreeUser)
                                setTrialUsed(true);
                        }
                        else if (event.type === "error") {
                            setPhase("error");
                            addLine("error", event.message);
                        }
                    }
                    catch {
                        // malformed SSE chunk, skip
                    }
                }
            }
        }
        catch (err) {
            if (err.name !== "AbortError") {
                setPhase("error");
                addLine("error", "CONNECTION LOST. Analysis terminated.");
            }
        }
    }, [puuid, region, summonerName, addLine]);
    // When opened externally, trigger analysis
    useEffect(() => {
        if (externalOpen && phase === "idle") {
            startAnalysis();
        }
    }, [externalOpen]);
    function handleOpenChange(open) {
        if (open) {
            setOpen(true);
            startAnalysis();
        }
        else {
            abortRef.current?.abort();
            setOpen(false);
            setTimeout(() => {
                setPhase("idle");
                setLines([]);
                setResult(null);
                setProgress({ current: 0, total: 0 });
            }, 300);
        }
    }
    const lineColor = (type) => {
        switch (type) {
            case "system": return "rgba(0,217,146,0.3)";
            case "progress": return "rgba(0,217,146,0.6)";
            case "success": return AC;
            case "error": return ERROR_COLOR;
            case "data": return "rgba(215,216,217,0.5)";
        }
    };
    const linePrefix = (type) => {
        switch (type) {
            case "system": return "::";
            case "progress": return ">";
            case "success": return ">>";
            case "error": return "!!";
            case "data": return " ";
        }
    };
    const showTerminal = phase !== "idle" && phase !== "complete";
    const showResults = phase === "complete" && result;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative inline-flex flex-col items-center", children: [_jsxs("button", { onClick: () => {
                            if (isLocked) {
                                setPaywallReason("limit");
                                setShowPaywall(true);
                            }
                            else if (!session?.access_token) {
                                setPaywallReason("login");
                                setShowPaywall(true);
                            }
                            else {
                                handleOpenChange(true);
                            }
                        }, disabled: !puuid, className: cn("group relative inline-flex items-center gap-1.5 h-8 px-4 overflow-hidden", "font-jetbrains text-[10px] tracking-[0.15em] uppercase", "border rounded-[3px]", "transition-all duration-300", "cursor-clicker select-none", "disabled:opacity-60 disabled:pointer-events-none", isLocked
                            ? "border-flash/10 bg-flash/5 text-flash/25"
                            : "border-jade/30 bg-jade/10 text-jade hover:border-jade/50 hover:shadow-[0_0_16px_rgba(0,217,146,0.2)]"), children: [!isLocked && (_jsxs(_Fragment, { children: [_jsx("span", { className: "absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.06) 3px, rgba(0,217,146,0.06) 4px)" } }), _jsx("span", { className: "absolute inset-0 bg-jade/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" })] })), _jsx("span", { className: "relative text-[8px] group-hover:scale-110 transition-transform duration-300", children: "\u25C8" }), _jsx("span", { className: "relative", children: "ANALYZE" })] }), isFreeUser && usageChecked && !trialUsed && (_jsx("span", { className: "absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-mono tracking-[0.15em] text-citrine/60", children: "1 FREE TRIAL" }))] }), _jsx(Dialog, { open: showPaywall, onOpenChange: setShowPaywall, children: _jsxs(DialogContent, { className: "max-w-sm p-0 border-0 shadow-none bg-transparent overflow-hidden [&>button]:hidden", children: [_jsx(DialogTitle, { className: "sr-only", children: "Premium Feature" }), _jsxs("div", { className: "relative overflow-hidden rounded-sm", style: {
                                background: "#040A0C",
                                border: `1px solid color-mix(in srgb, ${AC} 20%, transparent)`,
                                boxShadow: `0 0 40px ${AC_DIM}, 0 8px 32px rgba(0,0,0,0.7)`,
                            }, children: [_jsx(HudCorners, {}), _jsx(Scanlines, {}), _jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] z-[4]", style: { background: CITRINE, boxShadow: `0 0 8px rgba(255,182,21,0.4)` } }), _jsxs("div", { className: "relative z-[5]", children: [_jsxs("div", { className: "px-5 pt-5 pb-3 border-b border-white/[0.06]", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-1", style: { color: "rgba(255,182,21,0.5)" }, children: [_jsx("span", { style: { color: CITRINE, fontSize: "8px" }, children: "\u25C8" }), _jsx("span", { children: "::" }), _jsx("span", { children: "ACCESS RESTRICTED" })] }), _jsx("div", { className: "text-flash text-sm font-medium", children: paywallReason === "login"
                                                        ? "Authentication Required"
                                                        : "Analysis Limit Reached" })] }), _jsxs("div", { className: "px-5 py-4", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-0.5 w-1 h-1 rounded-full flex-shrink-0", style: { background: CITRINE } }), _jsx("p", { className: "text-flash/50 text-xs leading-relaxed font-mono", children: paywallReason === "login"
                                                                        ? "Sign in to access AI-powered analysis. Free accounts include one trial analysis."
                                                                        : "Free trial consumed. Premium members receive unlimited deep analysis scans." })] }), paywallReason === "limit" && (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "mt-0.5 w-1 h-1 rounded-full flex-shrink-0", style: { background: AC } }), _jsx("p", { className: "text-flash/50 text-xs leading-relaxed font-mono", children: "Upgrade includes: unlimited analyses, priority processing, and advanced insights." })] }))] }), _jsx("div", { className: "mt-4 py-2 px-3 rounded-[2px] border border-citrine/10 bg-citrine/5", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1.5 h-1.5 rounded-full animate-pulse", style: { background: CITRINE } }), _jsx("span", { className: "text-[9px] font-mono tracking-[0.2em] uppercase", style: { color: "rgba(255,182,21,0.7)" }, children: paywallReason === "login" ? "NO SESSION DETECTED" : "TRIAL QUOTA: 1/1 USED" })] }) })] }), _jsxs("div", { className: "px-5 pb-4 flex gap-2", children: [_jsx("button", { onClick: () => {
                                                        setShowPaywall(false);
                                                        navigate(paywallReason === "login" ? "/login" : "/pricing");
                                                    }, className: cn("flex-1 h-9 rounded-sm font-jetbrains text-[10px] tracking-[0.15em] uppercase", "border transition-all duration-200 cursor-clicker"), style: {
                                                        background: "rgba(255,182,21,0.1)",
                                                        borderColor: "rgba(255,182,21,0.3)",
                                                        color: CITRINE,
                                                    }, onMouseEnter: (e) => {
                                                        e.currentTarget.style.background = "rgba(255,182,21,0.2)";
                                                        e.currentTarget.style.borderColor = "rgba(255,182,21,0.5)";
                                                    }, onMouseLeave: (e) => {
                                                        e.currentTarget.style.background = "rgba(255,182,21,0.1)";
                                                        e.currentTarget.style.borderColor = "rgba(255,182,21,0.3)";
                                                    }, children: paywallReason === "login" ? "◈ LOG IN" : "◈ VIEW PLANS" }), _jsx("button", { onClick: () => setShowPaywall(false), className: cn("h-9 px-4 rounded-sm font-jetbrains text-[10px] tracking-[0.15em] uppercase", "text-flash/30 border border-flash/8", "hover:text-flash/50 hover:border-flash/15", "transition-all duration-200 cursor-clicker"), children: "CLOSE" })] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-citrine/20 via-flash/5 to-transparent" }), _jsx("div", { className: "px-5 py-2", children: _jsxs("div", { className: "text-[8px] font-mono text-flash/20 tracking-[0.1em]", children: ["\u25C8 LOLDATA DEEP ANALYSIS :: ", paywallReason === "login" ? "AUTH GATE" : "PAYWALL", " :: v2.0"] }) })] })] })] }) }), _jsx(Dialog, { open: open, onOpenChange: handleOpenChange, children: _jsxs(DialogContent, { className: cn("max-w-3xl w-[95vw] max-h-[85vh] p-0 border-0 shadow-none overflow-hidden", "bg-transparent"), children: [_jsx(DialogTitle, { className: "sr-only", children: "Player Analysis" }), _jsxs("div", { className: "relative overflow-hidden rounded-sm", style: {
                                background: "#040A0C",
                                border: `1px solid color-mix(in srgb, ${AC} 20%, transparent)`,
                                boxShadow: `0 0 60px ${AC_DIM}, 0 8px 32px rgba(0,0,0,0.7)`,
                            }, children: [_jsx(HudCorners, {}), _jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] z-[4]", style: { background: AC, boxShadow: `0 0 8px ${AC_GLOW}` } }), _jsxs("div", { className: "relative z-[5]", children: [_jsxs("div", { className: "px-6 pt-5 pb-3 border-b border-white/[0.06]", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-1", style: { color: `color-mix(in srgb, ${AC} 50%, transparent)` }, children: [_jsx("span", { style: { color: AC, fontSize: "8px" }, children: "\u25C8" }), _jsx("span", { children: "::" }), _jsx("span", { className: "px-1.5 py-[1px]", style: {
                                                                color: AC,
                                                                background: AC_DIM,
                                                                border: `1px solid color-mix(in srgb, ${AC} 30%, transparent)`,
                                                                borderRadius: "1px",
                                                                letterSpacing: "0.2em",
                                                            }, children: "ANALYSIS" }), _jsx("span", { children: "::" }), _jsx("span", { className: "flex-1 h-[1px]", style: { background: `linear-gradient(90deg, color-mix(in srgb, ${AC} 25%, transparent), transparent)` } }), _jsx("button", { onClick: () => handleOpenChange(false), className: "text-flash/30 hover:text-flash/60 transition-colors cursor-clicker text-[10px] tracking-[0.15em]", children: "[CLOSE]" })] }), _jsx("h2", { className: "font-jetbrains text-[15px] text-flash/90 font-medium tracking-wide", children: "DEEP PLAYER ANALYSIS" }), _jsxs("p", { className: "font-jetbrains text-[10px] text-flash/30 mt-0.5", children: [summonerName, " // ", region.toUpperCase(), " // ", result ? `${result.meta.matchesAnalyzed} games analyzed` : "initializing..."] })] }), _jsx(AnimatePresence, { children: showTerminal && (_jsx(motion.div, { initial: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.3, ease: "easeInOut" }, className: "overflow-hidden", children: _jsxs("div", { className: "px-6 py-8 flex flex-col items-center gap-6", children: [_jsxs("div", { className: "relative w-28 h-28", children: [_jsx("div", { className: "absolute inset-0 rounded-full", style: {
                                                                        border: `2px solid ${AC_DIM}`,
                                                                    } }), _jsx("div", { className: "absolute inset-0 rounded-full", style: {
                                                                        border: `2px solid transparent`,
                                                                        borderTopColor: AC,
                                                                        borderRightColor: AC,
                                                                        animation: "spin 1.5s linear infinite",
                                                                    } }), _jsx("div", { className: "absolute inset-3 rounded-full", style: {
                                                                        border: `1px solid ${AC_DIM}`,
                                                                    } }), _jsx("div", { className: "absolute inset-3 rounded-full", style: {
                                                                        border: `1px solid transparent`,
                                                                        borderBottomColor: CITRINE,
                                                                        borderLeftColor: CITRINE,
                                                                        animation: "spin 2s linear infinite reverse",
                                                                    } }), _jsx("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: progress.total > 0 ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-[20px] font-jetbrains font-bold", style: { color: AC }, children: progress.current }), _jsxs("span", { className: "text-[9px] font-jetbrains text-flash/30", children: ["/", progress.total] })] })) : (_jsx("span", { className: "text-[8px] font-jetbrains tracking-[0.2em] text-flash/40 animate-pulse", children: "INIT" })) }), _jsx("div", { className: "absolute inset-0 rounded-full pointer-events-none", style: { boxShadow: `0 0 30px ${AC_DIM}, inset 0 0 20px ${AC_DIM}` } })] }), progress.total > 0 && (_jsxs("div", { className: "w-full max-w-xs", children: [_jsxs("div", { className: "relative h-[3px] bg-white/[0.06] rounded-full overflow-hidden", children: [_jsx(motion.div, { className: "h-full rounded-full", style: { background: `linear-gradient(90deg, ${AC}, ${CITRINE})` }, initial: { width: 0 }, animate: { width: `${(progress.current / progress.total) * 100}%` }, transition: { duration: 0.4, ease: "easeOut" } }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                                                                                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                                                                                backgroundSize: "200% 100%",
                                                                                animation: "shimmer-sweep 1.5s ease-in-out infinite",
                                                                            } })] }), _jsxs("div", { className: "flex justify-between mt-1.5", children: [_jsxs("span", { className: "text-[8px] font-mono text-flash/25 tracking-[0.15em]", children: [Math.round((progress.current / progress.total) * 100), "% COMPLETE"] }), _jsxs("span", { className: "text-[8px] font-mono tracking-[0.15em]", style: { color: `color-mix(in srgb, ${AC} 50%, transparent)` }, children: [progress.current, "/", progress.total, " MATCHES"] })] })] })), _jsxs("div", { className: "text-center space-y-2", children: [_jsxs(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 }, className: "text-[10px] font-jetbrains tracking-[0.2em] uppercase", style: { color: `color-mix(in srgb, ${AC} 70%, transparent)` }, children: [currentStep === "FETCH_MATCH_IDS" && "◈ QUERYING RIOT DATABASE", currentStep === "MATCH_IDS_FOUND" && "◈ MATCHES LOCATED", currentStep === "FETCH_MATCH" && "◈ DOWNLOADING MATCH DATA", currentStep === "RATE_LIMITED" && "◈ RATE LIMITED — WAITING", currentStep === "FETCH_COMPLETE" && "◈ DATA ACQUIRED", currentStep === "ANALYZE_ROLES" && "◈ SCANNING ROLES", currentStep === "ANALYZE_CHAMPIONS" && "◈ MAPPING CHAMPION POOL", currentStep === "ANALYZE_STATS" && "◈ COMPUTING VECTORS", currentStep === "ANALYZE_JUNGLE" && "◈ DECODING JUNGLE PATHS", currentStep === "ANALYZE_WINLOSS" && "◈ ANALYZING WIN DELTAS", currentStep === "ANALYZE_EARLY_GAME" && "◈ EVALUATING EARLY GAME", currentStep === "ANALYZE_WARDS" && "◈ MAPPING WARD PLACEMENT", currentStep === "ANALYZE_BOOTS" && "◈ SCANNING ITEM BUILDS", currentStep === "IDENTIFY_WEAKNESSES" && "◈ RUNNING VULN SCANNER", currentStep === "GENERATE_TIPS" && "◈ COMPILING PLAYBOOK", currentStep === "CONNECTING" && "◈ ESTABLISHING CONNECTION"] }, currentStep), lines.length > 0 && (_jsx(motion.p, { initial: { opacity: 0 }, animate: { opacity: 1 }, className: "text-[9px] font-mono text-flash/25 max-w-xs truncate", children: lines[lines.length - 1]?.text }, lines.length))] }), _jsx("div", { className: "flex gap-1.5 opacity-30", children: Array.from({ length: 8 }).map((_, i) => (_jsx("div", { className: "w-1.5 h-1.5 rounded-[1px]", style: {
                                                                    background: progress.total > 0 && i < Math.ceil((progress.current / progress.total) * 8)
                                                                        ? AC : "rgba(255,255,255,0.1)",
                                                                    transition: "background 0.3s ease",
                                                                } }, i))) })] }) })) }), _jsx(AnimatePresence, { children: showResults && result && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 }, className: "px-5 py-4 max-h-[65vh] overflow-y-auto cyber-scrollbar space-y-3", children: [_jsx(RoleSection, { data: result }), _jsx(ChampionPoolSection, { data: result }), _jsx(OverallStatsSection, { data: result }), _jsx(WinLossSection, { data: result }), result.isJungler && _jsx(JungleSection, { data: result }), _jsx(WardDistributionSection, { data: result }), _jsx(BootsDistributionSection, { data: result }), _jsx(EarlyGameSection, { data: result }), _jsx(WeaknessesSection, { data: result }), _jsx(CounterTipsSection, { data: result })] })) }), phase === "error" && (_jsx("div", { className: "px-6 py-4 border-t border-error/20", children: _jsx("button", { onClick: () => startAnalysis(), className: cn("inline-flex items-center gap-2 h-8 px-4", "font-jetbrains text-[10px] tracking-[0.15em] uppercase", "border border-error/30 rounded-sm", "bg-error/5 text-error/80", "hover:bg-error/15 hover:border-error/50", "transition-all duration-200 cursor-clicker"), children: "RETRY ANALYSIS" }) }))] })] })] }) })] }));
}
