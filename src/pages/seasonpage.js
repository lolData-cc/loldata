import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { API_BASE_URL, cdnBaseUrl, cdnSplashUrl } from "@/config";
import { getWinrateClass } from "@/utils/winratecolor";
import { getKdaClass } from "@/utils/kdaColor";
import { formatStat } from "@/utils/formatStat";
import splashPositionMap from "@/converters/splashPositionMap";
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs";
import { DiamondButton } from "@/components/ui/diamond-button";
const tabTriggerClass = "font-jetbrains text-[11px] tracking-[0.15em] uppercase px-1 py-2.5 rounded-none bg-transparent text-flash/35 transition-all border-b-2 border-transparent data-[state=active]:text-jade data-[state=active]:border-jade data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-flash/55";
export default function SeasonPage() {
    const navigate = useNavigate();
    const { region, slug } = useParams();
    const _dashIdx = slug?.lastIndexOf("-") ?? -1;
    const name = _dashIdx > 0 ? slug.slice(0, _dashIdx).replace(/\+/g, " ") : slug ?? "";
    const tag = _dashIdx > 0 ? slug.slice(_dashIdx + 1) : "";
    const [summoner, setSummoner] = useState(null);
    useEffect(() => {
        if (name && tag) {
            document.title = `${name}#${tag} - lolData`;
        }
        return () => { document.title = "lolData"; };
    }, [name, tag]);
    const [season, setSeason] = useState({ champs: [], matchups: {} });
    const [solo, setSolo] = useState({ champs: [], matchups: {} });
    const [flex, setFlex] = useState({ champs: [], matchups: {} });
    const [activeTab, setActiveTab] = useState("season");
    const [loading, setLoading] = useState(true);
    // resolve summoner
    useEffect(() => {
        if (!name || !tag || !region)
            return;
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/summoner`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, tag, region }),
                });
                if (!res.ok)
                    return;
                const data = await res.json();
                if (data.summoner)
                    setSummoner(data.summoner);
            }
            catch { /* ignore */ }
        })();
    }, [name, tag, region]);
    // fetch all 3 queue groups once puuid is available
    useEffect(() => {
        if (!summoner?.puuid || !region)
            return;
        let cancelled = false;
        async function fetchStats(queueGroup) {
            const res = await fetch(`${API_BASE_URL}/api/season_stats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ puuid: summoner.puuid, region, queueGroup }),
            });
            if (res.status === 200) {
                const data = await res.json();
                return {
                    champs: data.topChampions || [],
                    matchups: data.matchups || {},
                };
            }
            return { champs: [], matchups: {} };
        }
        ;
        (async () => {
            const [all, soloData, flexData] = await Promise.all([
                fetchStats("ranked_all"),
                fetchStats("ranked_solo"),
                fetchStats("ranked_flex"),
            ]);
            if (cancelled)
                return;
            setSeason(all);
            setSolo(soloData);
            setFlex(flexData);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [summoner?.puuid, region]);
    const active = activeTab === "solo" ? solo :
        activeTab === "flex" ? flex :
            season;
    const topChamp = season.champs[0]?.champion;
    const displayName = summoner?.name ?? (slug ? (() => {
        const idx = slug.lastIndexOf("-");
        return idx > 0 ? slug.slice(0, idx) : slug;
    })() : name);
    return (_jsxs("div", { className: "text-flash -mt-10", children: [_jsx(DiamondButton, { icon: "back", label: "BACK", onClick: () => navigate(-1), className: "fixed top-1/2 left-4 -translate-y-1/2 z-50" }), _jsxs("div", { className: "relative w-screen left-1/2 -translate-x-1/2 h-[350px] overflow-hidden", children: [topChamp && (_jsx("img", { src: cdnSplashUrl(topChamp), alt: topChamp, className: "absolute inset-0 w-full h-full object-cover", style: { objectPosition: `center ${splashPositionMap[topChamp] || "15%"}` }, draggable: false })), _jsx("div", { className: "absolute inset-0 bg-liquirice/70" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-[0.04] z-[2]", style: {
                            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
                        } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.8)_100%)]" }), _jsx("div", { className: "absolute top-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center z-10 gap-2", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.25em] uppercase text-flash/25", children: "Season 2025" }), _jsx("h1", { className: "text-3xl font-bold tracking-wide text-flash", children: displayName }), summoner && (_jsxs("div", { className: "flex items-center gap-4 mt-1 font-jetbrains text-[12px] tracking-wider uppercase", children: [_jsxs("span", { className: "text-jade", children: [summoner.wins, "W"] }), _jsxs("span", { className: "text-error", children: [summoner.losses, "L"] }), (() => {
                                        const total = summoner.wins + summoner.losses;
                                        const wr = total > 0 ? Math.round((summoner.wins / total) * 100) : 0;
                                        return _jsxs("span", { className: getWinrateClass(wr, total), children: [wr, "% WR"] });
                                    })()] }))] })] }), _jsx("div", { className: "relative overflow-hidden rounded-md bg-black/20 mt-4 mb-16", children: _jsx("div", { className: "relative z-10", children: _jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, children: [_jsx("div", { className: "px-4 pt-4", children: _jsxs(TabsList, { className: "flex justify-center bg-transparent h-auto p-0 gap-6 border-b border-white/[0.04]", children: [_jsx(TabsTrigger, { value: "season", className: tabTriggerClass, children: "Season" }), _jsx(TabsTrigger, { value: "solo", className: tabTriggerClass, children: "Solo/Duo" }), _jsx(TabsTrigger, { value: "flex", className: tabTriggerClass, children: "Flex" })] }) }), _jsx("div", { className: "px-4 pt-3 pb-4", children: _jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.15 }, children: _jsx(ChampionTable, { champs: active.champs, matchups: active.matchups, loading: loading }) }, activeTab) }) })] }) }) })] }));
}
/* ──────────────────────────────────────────────
   CHAMPION TABLE
   ────────────────────────────────────────────── */
function ChampionTable({ champs, matchups, loading, }) {
    const [expanded, setExpanded] = useState(null);
    if (loading) {
        return (_jsx("div", { className: "space-y-3 py-4", children: Array.from({ length: 8 }).map((_, i) => (_jsx("div", { className: "h-10 rounded bg-white/5 animate-pulse" }, i))) }));
    }
    if (champs.length === 0) {
        return (_jsx("div", { className: "py-16 text-center text-flash/25 font-jetbrains text-sm tracking-wider uppercase", children: "No champion data" }));
    }
    const colCount = 8;
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-[12px] font-jetbrains", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-flash/20 text-[10px] tracking-[0.18em] uppercase border-b border-white/[0.04]", children: [_jsx("th", { className: "py-2.5 pl-3 pr-2 text-left w-8", children: "#" }), _jsx("th", { className: "py-2.5 px-2 text-left", children: "Champion" }), _jsx("th", { className: "py-2.5 px-2 text-center", children: "Games" }), _jsx("th", { className: "py-2.5 px-2 text-center", children: "Win%" }), _jsx("th", { className: "py-2.5 px-2 text-center", children: "KDA" }), _jsx("th", { className: "py-2.5 px-2 text-center hidden lg:table-cell", children: "K / D / A" }), _jsx("th", { className: "py-2.5 px-2 text-center hidden md:table-cell", children: "CS/min" }), _jsx("th", { className: "py-2.5 pr-3 pl-2 text-right hidden md:table-cell", children: "Gold" })] }) }), _jsx("tbody", { children: champs.map((c, i) => {
                        const perGameK = formatStat(c.kills / c.games);
                        const perGameD = formatStat(c.deaths / c.games);
                        const perGameA = formatStat(c.assists / c.games);
                        const wr = c.winrate;
                        const isExpanded = expanded === c.champion;
                        const champMatchups = matchups[c.champion] ?? [];
                        return (_jsxs(_Fragment, { children: [_jsxs("tr", { onClick: () => setExpanded(isExpanded ? null : c.champion), className: cn("border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-clicker select-none", isExpanded ? "bg-white/[0.025]" : "even:bg-white/[0.01]"), children: [_jsx("td", { className: "py-2.5 pl-3 pr-2 text-flash/20", children: i + 1 }), _jsx("td", { className: "py-2.5 px-2", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.champion}.png`, alt: c.champion, className: "w-8 h-8 rounded-full" }), _jsx("span", { className: "text-flash/80 truncate max-w-[120px]", children: c.champion }), _jsx("svg", { viewBox: "0 0 10 10", className: cn("w-2.5 h-2.5 text-flash/15 transition-transform duration-200 flex-shrink-0", isExpanded && "rotate-180"), fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "2,3 5,7 8,3" }) })] }) }), _jsx("td", { className: "py-2.5 px-2 text-center text-flash/50", children: c.games }), _jsxs("td", { className: cn("py-2.5 px-2 text-center", getWinrateClass(wr, c.games)), children: [wr, "%"] }), _jsx("td", { className: cn("py-2.5 px-2 text-center", getKdaClass(c.avgKda)), children: c.avgKda }), _jsxs("td", { className: "py-2.5 px-2 text-center text-flash/40 hidden lg:table-cell", children: [perGameK, " / ", perGameD, " / ", perGameA] }), _jsx("td", { className: "py-2.5 px-2 text-center text-flash/50 hidden md:table-cell", children: (() => {
                                                const num = Number(c.csPerMin);
                                                const rounded = Math.round(num * 10) / 10;
                                                return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
                                            })() }), _jsx("td", { className: "py-2.5 pr-3 pl-2 text-right text-flash/40 hidden md:table-cell", children: c.avgGold.toLocaleString() })] }, c.champion), isExpanded && (_jsx("tr", { children: _jsx("td", { colSpan: colCount, className: "p-0", children: _jsx(AnimatePresence, { children: _jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.2 }, className: "overflow-hidden", children: _jsx(MatchupPanel, { champion: c.champion, matchups: champMatchups }) }) }) }) }, `${c.champion}-matchups`))] }));
                    }) })] }) }));
}
/* ──────────────────────────────────────────────
   MATCHUP PANEL (expanded row content)
   ────────────────────────────────────────────── */
function MatchupPanel({ champion, matchups }) {
    if (matchups.length === 0) {
        return (_jsxs("div", { className: "bg-white/[0.015] border-t border-white/[0.03] px-6 py-4", children: [_jsxs("div", { className: "text-[10px] tracking-[0.15em] uppercase text-flash/20 mb-2", children: ["Most faced opponents as ", champion] }), _jsx("div", { className: "text-[11px] text-flash/15 font-jetbrains tracking-wider uppercase py-2", children: "No matchup data yet" })] }));
    }
    return (_jsxs("div", { className: "bg-white/[0.015] border-t border-white/[0.03] px-6 py-4", children: [_jsxs("div", { className: "text-[10px] tracking-[0.15em] uppercase text-flash/20 mb-3", children: ["Most faced opponents as ", champion] }), _jsx("div", { className: "flex flex-col gap-2", children: matchups.map((m) => {
                    const perGameK = formatStat(m.kills / m.games);
                    const perGameD = formatStat(m.deaths / m.games);
                    const perGameA = formatStat(m.assists / m.games);
                    return (_jsxs("div", { className: "flex items-center gap-4 py-1.5 px-2 rounded bg-white/[0.02]", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-[130px]", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${m.opponent}.png`, alt: m.opponent, className: "w-6 h-6 rounded-full" }), _jsx("span", { className: "text-[11px] text-flash/60 truncate", children: m.opponent })] }), _jsxs("span", { className: "text-[11px] text-flash/35 min-w-[50px] text-center", children: [m.games, "G"] }), _jsxs("span", { className: cn("text-[11px] min-w-[40px] text-center", getWinrateClass(m.winrate, m.games)), children: [m.winrate, "%"] }), _jsx("span", { className: cn("text-[11px] min-w-[45px] text-center", getKdaClass(m.kda)), children: m.kda }), _jsxs("span", { className: "text-[11px] text-flash/30 hidden sm:inline", children: [perGameK, " / ", perGameD, " / ", perGameA] })] }, m.opponent));
                }) })] }));
}
