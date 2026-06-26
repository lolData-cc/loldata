import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { calculateLolDataScores } from "@/utils/calculatePlayerRating";
import splashPositionMap from "@/converters/splashPositionMap";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import queueMap from "@/converters/queueMap";
import { formatDate } from "@/converters/dateMap";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Recharts removed — damage bars now use custom CSS
import { KillMap } from "@/components/killmap";
import { API_BASE_URL, cdnBaseUrl, cdnSplashUrl, summonerSpellUrl } from "@/config";
import { getRankImage } from "@/utils/rankIcons";
import { DiamondButton } from "@/components/ui/diamond-button";
import { supabase } from "@/lib/supabaseClient";
import { getKeystoneIcon, getStyleIcon, getKeystoneName, getStyleName } from "@/constants/runes";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, } from "@/components/ui/tooltip";
// ── Platform ID → backend region key ────────────────────────────────
const PLATFORM_TO_REGION = {
    EUW1: "euw", EUW: "euw",
    NA1: "na", NA: "na",
    KR: "kr",
    JP1: "jp",
    BR1: "br",
    LA1: "la1", LA2: "la2",
    OC1: "oc",
    TR1: "tr", RU: "ru",
    PH2: "ph", SG2: "sg", TH2: "th", TW2: "tw", VN2: "vn",
};
function extractRegionFromMatchId(matchId) {
    const platform = matchId.split("_")[0]?.toUpperCase();
    return platform ? PLATFORM_TO_REGION[platform] : undefined;
}
// ── Glass card reusable classes ─────────────────────────────────────
const glassCard = cn("relative overflow-hidden rounded-md", "bg-black/25 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]");
// ── Section Header ──────────────────────────────────────────────────
function SectionHeader({ children }) {
    return (_jsxs("h2", { className: "flex items-center gap-3 text-lg font-bold font-jetbrains uppercase text-flash/40 mb-4 mt-10", children: [_jsx("span", { className: "text-jade/40 text-sm", children: "\u25C8" }), children] }));
}
export default function MatchPage() {
    const { matchId } = useParams();
    const location = useLocation();
    const region = location.state?.region || (matchId ? extractRegionFromMatchId(matchId) : undefined);
    const focusedPlayerPuuid = location.state?.focusedPlayerPuuid;
    const [match, setMatch] = useState(null);
    const [timeline, setTimeline] = useState(null);
    const [error, setError] = useState(null);
    const [playerRanks, setPlayerRanks] = useState({});
    const [proUsernames, setProUsernames] = useState(new Set());
    const [streamerUsernames, setStreamerUsernames] = useState(new Set());
    const navigate = useNavigate();
    const getAverage = (key, participants) => {
        const total = participants.reduce((sum, p) => sum + (p[key] || 0), 0);
        return Math.round(total / participants.length);
    };
    const getMax = (key, participants) => {
        return Math.max(...participants.map((p) => p[key] || 0), 1);
    };
    /** Animated stat bar — grows from 0 on mount with staggered delay */
    function StatBar({ pct, avgPct, isAboveAvg, delay }) {
        const [w, setW] = useState(0);
        const [avgW, setAvgW] = useState(0);
        useEffect(() => {
            const t1 = setTimeout(() => setW(pct), delay);
            const t2 = setTimeout(() => setAvgW(avgPct), delay + 80);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }, [pct, avgPct, delay]);
        return (_jsxs("div", { className: "relative h-[22px] w-full rounded-[3px] bg-white/[0.04] border border-white/[0.04] overflow-hidden", children: [_jsx("div", { className: "absolute inset-y-0 left-0 rounded-[2px]", style: {
                        width: `${w}%`,
                        transition: `width 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
                        background: isAboveAvg
                            ? "linear-gradient(90deg, rgba(0,217,146,0.08) 0%, rgba(0,217,146,0.35) 100%)"
                            : "linear-gradient(90deg, rgba(215,216,217,0.04) 0%, rgba(215,216,217,0.15) 100%)",
                        boxShadow: isAboveAvg
                            ? "inset 0 0 12px rgba(0,217,146,0.1), 2px 0 8px rgba(0,217,146,0.2)"
                            : "none",
                    } }), w > 2 && (_jsx("div", { className: "absolute top-0 bottom-0 w-[2px]", style: {
                        left: `${w}%`,
                        transition: `left 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 300ms ease ${delay + 200}ms`,
                        opacity: w > 0 ? 1 : 0,
                        background: isAboveAvg ? "#00d992" : "rgba(215,216,217,0.3)",
                        boxShadow: isAboveAvg
                            ? "0 0 6px rgba(0,217,146,0.6), 0 0 12px rgba(0,217,146,0.3)"
                            : "none",
                    } })), _jsx("div", { className: "absolute top-0 bottom-0 w-[1px]", style: {
                        left: `${avgW}%`,
                        transition: `left 500ms cubic-bezier(0.16, 1, 0.3, 1) ${delay + 100}ms, opacity 300ms ease ${delay + 100}ms`,
                        opacity: avgW > 0 ? 1 : 0,
                        background: "rgba(255,182,21,0.5)",
                    }, children: _jsx("div", { className: "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full", style: {
                            background: "#FFB615",
                            boxShadow: "0 0 4px rgba(255,182,21,0.6)",
                        } }) }), pct >= 15 && (_jsxs("span", { className: "absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-wider tabular-nums", style: {
                        color: isAboveAvg ? "rgba(0,217,146,0.5)" : "rgba(215,216,217,0.2)",
                        transition: `opacity 300ms ease ${delay + 400}ms`,
                        opacity: w > 0 ? 1 : 0,
                    }, children: [pct, "%"] }))] }));
    }
    useEffect(() => {
        Promise.all([
            supabase.from("pro_players").select("username"),
            supabase.from("pro_player_accounts").select("username"),
        ]).then(([{ data: proData }, { data: accData }]) => {
            const names = new Set();
            for (const r of proData ?? [])
                if (r.username)
                    names.add(r.username.toLowerCase());
            for (const r of accData ?? [])
                if (r.username)
                    names.add(r.username.toLowerCase());
            setProUsernames(names);
        });
        supabase.from("streamers").select("lol_nametag").then(({ data }) => {
            if (data)
                setStreamerUsernames(new Set(data.filter((r) => r.lol_nametag).map((r) => r.lol_nametag.toLowerCase())));
        });
    }, []);
    useEffect(() => {
        async function fetchMatch() {
            try {
                const [res, resTimeline] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/matchinfo`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ matchId, region }),
                    }),
                    fetch(`${API_BASE_URL}/api/matchtimeline`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ matchId, region }),
                    }),
                ]);
                const timelineData = await resTimeline.json();
                setTimeline(timelineData.timeline);
                const rawText = await res.text();
                let data;
                try {
                    data = JSON.parse(rawText);
                }
                catch {
                    setError("Risposta API non valida");
                    return;
                }
                if (!data || typeof data !== "object" || !data.match || !data.match.info || !Array.isArray(data.match.info.participants)) {
                    setError("Dati API incompleti");
                    return;
                }
                setMatch(data.match);
            }
            catch {
                setError("Match non trovato o errore di rete.");
            }
        }
        if (matchId && region) {
            fetchMatch();
        }
        else {
            setError("Dati URL mancanti");
        }
    }, [matchId, region]);
    // Fetch player ranks after match loads
    useEffect(() => {
        if (!match)
            return;
        const puuids = match.info.participants.map((p) => p.puuid).filter(Boolean);
        if (puuids.length === 0)
            return;
        fetch(`${API_BASE_URL}/api/player-ranks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puuids, region: region?.toUpperCase() }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
            if (data?.ranks)
                setPlayerRanks(data.ranks);
        })
            .catch(() => { });
    }, [match]);
    if (error)
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen", children: _jsx("span", { className: "font-mono text-[11px] tracking-[0.2em] text-error/70 uppercase", children: error }) }));
    if (!match)
        return null;
    const participants = match.info?.participants ?? [];
    const { mvpWin, mvpLose } = calculateLolDataScores(participants);
    const mvpPlayer = participants.find(p => p.puuid === mvpWin);
    const totalKillsBlue = participants
        .filter((p) => p.teamId === 100)
        .reduce((sum, p) => sum + p.kills, 0);
    const totalKillsRed = participants
        .filter((p) => p.teamId === 200)
        .reduce((sum, p) => sum + p.kills, 0);
    const blueWon = participants.some((p) => p.teamId === 100 && p.win);
    const redWon = participants.some((p) => p.teamId === 200 && p.win);
    const blueTeam = participants.filter((p) => p.teamId === 100);
    const redTeam = participants.filter((p) => p.teamId === 200);
    const gameDuration = match.info?.gameDuration ?? 0;
    const durationStr = `${Math.floor(gameDuration / 60)}:${(gameDuration % 60).toString().padStart(2, "0")}`;
    const getKP = (p, team) => {
        const teamKills = team.reduce((sum, curr) => sum + curr.kills, 0);
        return teamKills === 0 ? "0%" : `${Math.round(((p.kills + p.assists) / teamKills) * 100)}%`;
    };
    const renderItems = (p) => (_jsx("div", { className: "flex gap-0.5", children: Array.from({ length: 7 }, (_, i) => {
            const id = p[`item${i}`];
            return id > 0 ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, className: "w-5 h-5 rounded-[3px] ring-1 ring-white/10" }, i)) : (_jsx("div", { className: "w-5 h-5 rounded-[3px] bg-white/[0.03] ring-1 ring-white/[0.06]" }, i));
        }) }));
    // ── Player row for scoreboard ─────────────────────────────────────
    function PlayerRow({ p, team, side }) {
        const isMvp = p.puuid === mvpWin;
        const isAce = p.puuid === mvpLose;
        const isFocused = p.puuid === focusedPlayerPuuid;
        const teamColor = side === "blue" ? "text-cyan-300/90" : "text-rose-300/90";
        const deaths = p.deaths;
        const kda = deaths === 0 ? "Perfect" : ((p.kills + p.assists) / deaths).toFixed(1);
        return (_jsxs("div", { className: cn("flex items-center gap-3 px-3 py-2 transition-all", "border-b border-white/[0.04] last:border-b-0", "hover:bg-white/[0.02]", isFocused && "bg-jade/[0.04]"), children: [_jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [_jsxs("div", { className: "relative w-8 h-8", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${p.championName}.png`, className: "w-8 h-8 rounded-[4px] ring-1 ring-white/10" }), (isMvp || isAce) && (_jsx("span", { className: cn("absolute -top-1 -right-1 text-[7px] px-0.5 rounded-sm z-10 font-mono font-bold", isMvp && "bg-pine text-jade", isAce && "bg-[#3A2C45] text-[#C693F1]"), style: { lineHeight: '1' }, children: isMvp ? "MVP" : "ACE" })), p.champLevel && (_jsx("span", { className: "absolute -bottom-0.5 -right-0.5 text-[8px] bg-black/90 text-flash/50 rounded px-0.5 leading-none font-mono", children: p.champLevel }))] }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("img", { src: summonerSpellUrl(p.summoner1Id), className: "w-4 h-4 rounded-[2px]" }), _jsx("img", { src: summonerSpellUrl(p.summoner2Id), className: "w-4 h-4 rounded-[2px]" })] }), p.perks?.styles && p.perks.styles.length >= 2 && (_jsxs("div", { className: "flex flex-col gap-0.5", children: [(() => {
                                    const keystoneId = p.perks.styles[0]?.selections?.[0]?.perk;
                                    const keystoneSrc = keystoneId ? getKeystoneIcon(keystoneId) : null;
                                    const keystoneName = keystoneId ? getKeystoneName(keystoneId) : null;
                                    return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "w-4 h-4 rounded-full bg-black/60 flex items-center justify-center", children: keystoneSrc && _jsx("img", { src: keystoneSrc, alt: keystoneName ?? "Keystone", className: "w-3.5 h-3.5 rounded-full" }) }) }), keystoneName && (_jsx(TooltipContent, { side: "top", className: "text-xs", children: keystoneName }))] }) }));
                                })(), (() => {
                                    const subStyleId = p.perks.styles[1]?.style;
                                    const subStyleSrc = subStyleId ? getStyleIcon(subStyleId) : null;
                                    const subStyleName = subStyleId ? getStyleName(subStyleId) : null;
                                    return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "w-4 h-4 rounded-full bg-black/60 flex items-center justify-center", children: subStyleSrc && _jsx("img", { src: subStyleSrc, alt: subStyleName ?? "Secondary", className: "w-3.5 h-3.5 rounded-full opacity-70" }) }) }), subStyleName && (_jsx(TooltipContent, { side: "top", className: "text-xs", children: subStyleName }))] }) }));
                                })()] }))] }), _jsxs("div", { className: "w-[110px] min-w-0 shrink-0", children: [(() => {
                            const nameKey = p.riotIdGameName && p.riotIdTagline ? `${p.riotIdGameName}#${p.riotIdTagline}`.toLowerCase() : "";
                            const isPro = nameKey && proUsernames.has(nameKey);
                            const isStr = nameKey && !isPro && streamerUsernames.has(nameKey);
                            return (_jsxs("div", { className: "flex items-center gap-1", children: [p.riotIdGameName && p.riotIdTagline ? (_jsx(Link, { to: `/summoners/${region}/${(p.riotIdGameName || "").replace(/\s+/g, "+")}-${p.riotIdTagline}`, className: cn("truncate text-[11px] font-mono tracking-wide hover:underline cursor-clicker", isFocused ? "text-jade font-bold" : teamColor), onClick: (e) => {
                                            sessionStorage.setItem("summonerScrollY", window.scrollY.toString());
                                            e.stopPropagation();
                                        }, children: p.riotIdGameName })) : (_jsx("span", { className: "truncate text-[11px] font-mono text-flash/40", children: p.riotIdGameName ?? "Unknown" })), (isPro || isStr) && (_jsx("span", { className: "shrink-0 text-[7px] font-black leading-none px-[3px] py-[1px] rounded-[3px] tracking-wide", style: {
                                            background: isPro
                                                ? "linear-gradient(135deg, #00d992, #00b8ff)"
                                                : "linear-gradient(135deg, #7b42a1, #a855c7)",
                                            color: isPro ? "#040A0C" : "#e0d0f0",
                                            boxShadow: isPro
                                                ? "0 0 6px rgba(0,217,146,0.5), 0 0 12px rgba(0,184,255,0.25)"
                                                : "0 0 6px rgba(123,66,161,0.4), 0 0 10px rgba(168,85,199,0.2)",
                                        }, children: isPro ? "PRO" : "STR" }))] }));
                        })(), (() => {
                            const r = playerRanks[p.puuid];
                            if (!r || !r.rank || r.rank === "Unranked")
                                return null;
                            return (_jsxs("div", { className: "flex items-center gap-1 mt-0.5", children: [_jsx("img", { src: getRankImage(r.rank), alt: "", className: "w-4 h-4 object-contain" }), _jsxs("span", { className: "text-[10px] font-mono text-flash/40 truncate", children: [r.rank, " ", r.lp ? `${r.lp}LP` : ""] })] }));
                        })()] }), _jsxs("div", { className: "w-[70px] shrink-0 text-center", children: [_jsxs("span", { className: "text-[11px] font-mono text-flash/70", children: [p.kills, "/", p.deaths, "/", p.assists] }), _jsxs("div", { className: "text-[9px] font-mono text-flash/25 tracking-wider", children: [kda, " KDA"] })] }), _jsx("div", { className: "flex-1 min-w-0", children: renderItems(p) }), _jsx("div", { className: "w-[55px] shrink-0 text-right", children: _jsxs("span", { className: "text-[10px] font-mono text-citrine/60", children: [(p.goldEarned / 1000).toFixed(1), "k"] }) }), _jsx("div", { className: "w-[40px] shrink-0 text-right", children: _jsx("span", { className: "text-[10px] font-mono text-flash/35", children: getKP(p, team) }) }), _jsx("div", { className: "w-[45px] shrink-0 text-right", children: _jsxs("span", { className: "text-[10px] font-mono text-flash/35", children: [(p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0), " cs"] }) })] }));
    }
    return (_jsxs("div", { className: "text-flash", children: [_jsxs("div", { className: "relative w-full h-[380px] overflow-hidden", children: [mvpPlayer && (_jsx("img", { src: cdnSplashUrl(mvpPlayer.championName), alt: mvpPlayer.championName, className: "absolute inset-0 w-full h-full object-cover", style: { objectPosition: `center ${splashPositionMap[mvpPlayer.championName] || "15%"}` }, draggable: false })), _jsx("div", { className: "absolute inset-0 bg-liquirice/70" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-[0.04] z-[2]", style: {
                            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
                        } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.8)_100%)]" }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" }), _jsx("div", { className: "relative z-10 w-full", children: _jsx("div", { className: "w-[65%] mx-auto", children: _jsx(Navbar, {}) }) }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center z-10 mt-12 gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-flash/25", children: [_jsx("span", { children: queueMap[match.info?.queueId] || "Unknown Queue" }), _jsx("span", { className: "text-jade/20", children: "\u25C8" }), _jsx("span", { children: formatDate(match.info?.gameEndTimestamp) }), _jsx("span", { className: "text-jade/20", children: "\u25C8" }), _jsx("span", { children: durationStr })] }), _jsxs("div", { className: "flex items-center gap-8", children: [_jsx("span", { className: cn("font-mono text-sm tracking-[0.15em] uppercase", blueWon ? "text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "text-cyan-300/30"), children: "Blue Side" }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: cn("text-5xl font-mono tabular-nums", blueWon ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]" : "text-cyan-300/40"), children: totalKillsBlue }), _jsx("span", { className: "text-flash/10 font-mono text-2xl", children: "/" }), _jsx("span", { className: cn("text-5xl font-mono tabular-nums", redWon ? "text-rose-300 drop-shadow-[0_0_12px_rgba(251,113,133,0.3)]" : "text-rose-300/40"), children: totalKillsRed })] }), _jsx("span", { className: cn("font-mono text-sm tracking-[0.15em] uppercase", redWon ? "text-rose-300 drop-shadow-[0_0_10px_rgba(251,113,133,0.4)]" : "text-rose-300/30"), children: "Red Side" })] }), _jsx("span", { className: "font-mono text-[9px] tracking-[0.15em] text-flash/10 uppercase mt-1", children: matchId })] })] }), _jsx(DiamondButton, { icon: "back", label: "BACK", onClick: () => navigate(-1), className: "fixed top-1/2 left-4 -translate-y-1/2 z-50" }), _jsxs("div", { className: "w-[65%] mx-auto -mt-6 relative z-20", children: [_jsx(SectionHeader, { children: "Scoreboard" }), _jsx("div", { className: glassCard, children: _jsxs("div", { className: "relative z-10 flex", children: [_jsxs("div", { className: "flex-1 border-r border-white/[0.04]", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-1 z-10 bg-gradient-to-b from-cyan-400/80 to-cyan-400/10 rounded-l-md" }), _jsxs("div", { className: "flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]", children: [_jsx("span", { className: "text-cyan-400/50 text-[10px]", children: "\u25C8" }), _jsx("span", { className: cn("font-mono text-[10px] tracking-[0.15em] uppercase", blueWon ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]" : "text-cyan-300/50"), children: "Blue Side" }), blueWon && (_jsx("span", { className: "font-mono text-[8px] tracking-[0.2em] text-jade/50 uppercase ml-1", children: "Win" }))] }), blueTeam.map((p) => (_jsx(PlayerRow, { p: p, team: blueTeam, side: "blue" }, p.puuid)))] }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "absolute right-0 top-0 bottom-0 w-1 z-10 bg-gradient-to-b from-rose-400/80 to-rose-400/10 rounded-r-md" }), _jsxs("div", { className: "flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]", children: [_jsx("span", { className: "text-rose-400/50 text-[10px]", children: "\u25C8" }), _jsx("span", { className: cn("font-mono text-[10px] tracking-[0.15em] uppercase", redWon ? "text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]" : "text-rose-300/50"), children: "Red Side" }), redWon && (_jsx("span", { className: "font-mono text-[8px] tracking-[0.2em] text-jade/50 uppercase ml-1", children: "Win" }))] }), redTeam.map((p) => (_jsx(PlayerRow, { p: p, team: redTeam, side: "red" }, p.puuid)))] })] }) }), _jsx(SectionHeader, { children: "Statistics" }), _jsx(Tabs, { defaultValue: focusedPlayerPuuid || participants[0]?.puuid, className: "w-full", children: _jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: cn(glassCard, "w-[22%] shrink-0"), children: _jsx("div", { className: "relative z-10 p-1.5 h-full", children: _jsx(TabsList, { className: "flex flex-col justify-between w-full h-full bg-transparent", children: participants.map((p) => {
                                                const isBlue = p.teamId === 100;
                                                return (_jsxs(TabsTrigger, { value: p.puuid, className: cn("flex items-center gap-2 text-left px-2 py-1.5 rounded-[4px] w-full justify-start transition-all cursor-clicker", "font-mono text-[10px] tracking-wide", "text-flash/35 hover:text-flash/60 hover:bg-white/[0.03]", "data-[state=active]:bg-white/[0.06] data-[state=active]:text-flash/90", "data-[state=active]:shadow-[inset_0_0_12px_rgba(0,217,146,0.04)]"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${p.championName}.png`, className: "w-6 h-6 rounded-[3px] ring-1 ring-white/10 shrink-0" }), _jsx("span", { className: cn("truncate", p.puuid === focusedPlayerPuuid && "text-jade font-bold"), children: p.riotIdGameName ?? "Unknown" }), (() => {
                                                            const nk = p.riotIdGameName && p.riotIdTagline ? `${p.riotIdGameName}#${p.riotIdTagline}`.toLowerCase() : "";
                                                            const isPro = nk && proUsernames.has(nk);
                                                            const isStr = nk && !isPro && streamerUsernames.has(nk);
                                                            if (!isPro && !isStr)
                                                                return null;
                                                            return (_jsx("span", { className: "shrink-0 text-[7px] font-black leading-none px-[2px] py-[1px] rounded-[2px] tracking-wide", style: {
                                                                    background: isPro
                                                                        ? "linear-gradient(135deg, #00d992, #00b8ff)"
                                                                        : "linear-gradient(135deg, #7b42a1, #a855c7)",
                                                                    color: isPro ? "#040A0C" : "#e0d0f0",
                                                                }, children: isPro ? "PRO" : "STR" }));
                                                        })(), _jsx("span", { className: cn("ml-auto text-[8px] opacity-40 shrink-0", isBlue ? "text-cyan-300" : "text-rose-300"), children: "\u25C8" })] }, p.puuid));
                                            }) }) }) }), _jsx("div", { className: cn(glassCard, "flex-1"), children: _jsx("div", { className: "relative z-10 p-3", children: participants.map((p) => (_jsxs(TabsContent, { value: p.puuid, className: "mt-0", children: [_jsx("div", { className: "space-y-2", children: [
                                                        { label: "Damage Dealt", key: "totalDamageDealtToChampions" },
                                                        { label: "Damage Taken", key: "totalDamageTaken" },
                                                        { label: "Heal", key: "totalHeal" },
                                                        { label: "Damage to Objectives", key: "damageDealtToObjectives" },
                                                        { label: "Vision Score", key: "visionScore" },
                                                        { label: "Wards Placed", key: "wardsPlaced" },
                                                        { label: "Wards Killed", key: "wardsKilled" },
                                                    ].map(({ label, key }, idx) => {
                                                        const playerValue = p[key] ?? 0;
                                                        const avgValue = getAverage(key, participants);
                                                        const maxValue = getMax(key, participants);
                                                        const pct = Math.round((playerValue / maxValue) * 100);
                                                        const avgPct = Math.round((avgValue / maxValue) * 100);
                                                        const isAboveAvg = playerValue >= avgValue;
                                                        return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-baseline justify-between mb-1", children: [_jsx("span", { className: "font-mono text-[10px] tracking-[0.12em] uppercase text-flash/30", children: label }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("span", { className: "font-mono text-[10px] text-citrine/40 tabular-nums", children: [avgValue.toLocaleString(), " avg"] }), _jsx("span", { className: cn("font-mono text-[11px] tabular-nums font-medium", isAboveAvg ? "text-jade" : "text-flash/50"), children: playerValue.toLocaleString() })] })] }), _jsx(StatBar, { pct: pct, avgPct: avgPct, isAboveAvg: isAboveAvg, delay: idx * 60 })] }, key));
                                                    }) }), _jsxs("div", { className: "flex items-center gap-5 mt-3 pt-2.5 border-t border-white/[0.06]", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "w-5 h-[3px] rounded-full", style: { background: "linear-gradient(90deg, rgba(0,217,146,0.1), rgba(0,217,146,0.5))" } }), _jsx("span", { className: "font-mono text-[9px] tracking-[0.15em] text-flash/25 uppercase", children: "Player" })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "relative w-[1px] h-3", style: { background: "rgba(255,182,21,0.5)" }, children: _jsx("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[4px] h-[4px] rounded-full", style: { background: "#FFB615" } }) }), _jsx("span", { className: "font-mono text-[9px] tracking-[0.15em] text-flash/25 uppercase", children: "Avg" })] })] })] }, p.puuid))) }) })] }) }), timeline && _jsx(KillMap, { timeline: timeline, participants: participants }), _jsx(Footer, { className: "mt-24" })] })] }));
}
