"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getRankImage } from "@/utils/rankIcons";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DiamondButton } from "@/components/ui/diamond-button";
const REGIONS = ["EUW", "NA", "KR"];
const QUEUES = [
    { key: "RANKED_SOLO_5x5", label: "SOLO/DUO" },
    { key: "RANKED_FLEX_SR", label: "FLEX" },
];
const TIER_ACCENTS = {
    CHALLENGER: {
        text: "text-amber-300",
        glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]",
        border: "border-amber-400/15",
        bg: "bg-amber-400/[0.03]",
        gradient: "from-amber-400/10 via-transparent to-transparent",
    },
    GRANDMASTER: {
        text: "text-red-300",
        glow: "shadow-[0_0_20px_rgba(248,113,113,0.12)]",
        border: "border-red-400/12",
        bg: "bg-red-400/[0.02]",
        gradient: "from-red-400/8 via-transparent to-transparent",
    },
    MASTER: {
        text: "text-purple-300",
        glow: "shadow-[0_0_15px_rgba(192,132,252,0.1)]",
        border: "border-purple-400/10",
        bg: "bg-purple-400/[0.02]",
        gradient: "from-purple-400/6 via-transparent to-transparent",
    },
};
const PAGE_SIZE = 25;
function WinrateBar({ wins, losses }) {
    const total = wins + losses;
    const wr = total > 0 ? (wins / total) * 100 : 50;
    return (_jsx("div", { className: "w-full h-[3px] rounded-full bg-flash/[0.06] overflow-hidden", children: _jsx("div", { className: "h-full rounded-full transition-all duration-500", style: {
                width: `${wr}%`,
                background: wr >= 60 ? "rgba(0,217,146,0.5)" : wr >= 52 ? "rgba(0,217,146,0.3)" : wr >= 48 ? "rgba(215,216,217,0.2)" : "rgba(239,68,68,0.3)",
            } }) }));
}
export default function LeaderboardPage() {
    const [region, setRegion] = useState("EUW");
    const [queue, setQueue] = useState("RANKED_SOLO_5x5");
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [keyToName, setKeyToName] = useState({});
    const [cutoffs, setCutoffs] = useState(null);
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then(r => r.json())
            .then(data => {
            const map = {};
            for (const c of Object.values(data?.data ?? {}))
                map[c.key] = c.id;
            setKeyToName(map);
        })
            .catch(() => { });
    }, []);
    useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 400);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    async function load(p = page) {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/leaderboard`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ region, queue, page: p, pageSize: PAGE_SIZE, enrich: true }),
            });
            if (res.status === 429) {
                setError("Rate limited — try again shortly");
                setRows([]);
                return;
            }
            if (!res.ok) {
                setError("Failed to load rankings");
                setRows([]);
                return;
            }
            const data = await res.json();
            setRows(data.entries || []);
            setTotalPages(data.totalPages || 1);
            setPage(data.page || p);
            if (data.cutoffs)
                setCutoffs(data.cutoffs);
        }
        catch {
            setError("Network error");
            setRows([]);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(1); }, [region, queue]);
    useEffect(() => {
        document.title = `${region} Rankings - lolData`;
        return () => { document.title = "lolData"; };
    }, [region]);
    const handlePlayerClick = (r) => {
        const nametag = r.nametag ?? r.summonerName;
        if (!nametag)
            return;
        const [name, tag] = nametag.includes("#") ? nametag.split("#") : [nametag, region];
        navigate(`/summoners/${region.toLowerCase()}/${encodeURIComponent(name)}-${encodeURIComponent(tag || region)}`);
    };
    return (_jsxs("div", { className: "min-h-[70vh]", children: [_jsxs("div", { className: "relative w-screen left-1/2 -translate-x-1/2 -mt-20 h-[420px] overflow-hidden mb-6", children: [_jsx("img", { src: "/img/Leaderboards.jpg", alt: "", className: "absolute inset-0 w-full h-full object-cover select-none", style: { objectPosition: "center 10%" }, draggable: false }), _jsx("div", { className: "absolute inset-0 bg-liquirice/65" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-[0.03] z-[2]", style: { backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.12) 2px, rgba(255,255,255,0.12) 4px)" } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.9)_100%)]" }), _jsx("div", { className: "absolute top-0 left-0 right-0 h-16 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" }), _jsxs("div", { className: "absolute bottom-10 left-1/2 -translate-x-1/2 w-[65%] min-[2560px]:w-[55%] flex items-end justify-between z-10", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[9px] font-mono text-jade/40 tracking-[0.4em] uppercase mb-2", children: "Ranked Ladder" }), _jsx("h1", { className: "text-5xl font-orbitron font-bold tracking-wider text-flash/90", children: "RANKINGS" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "relative flex rounded-[3px] border border-flash/[0.08] bg-black/50 backdrop-blur-md p-0.5", children: QUEUES.map((q) => (_jsxs("button", { onClick: () => setQueue(q.key), className: cn("relative z-10 px-4 py-2 text-[9px] font-mono tracking-[0.15em] uppercase transition-colors duration-200 rounded-[2px] cursor-clicker", queue === q.key ? "text-jade" : "text-flash/30 hover:text-flash/55"), children: [queue === q.key && (_jsx(motion.div, { layoutId: "queue-pill", className: "absolute inset-0 rounded-[2px] bg-jade/10 border border-jade/20", transition: { type: "spring", stiffness: 400, damping: 30 } })), _jsx("span", { className: "relative z-10", children: q.label })] }, q.key))) }), _jsx("div", { className: "relative flex rounded-[3px] border border-flash/[0.08] bg-black/50 backdrop-blur-md p-0.5", children: REGIONS.map((r) => (_jsxs("button", { onClick: () => setRegion(r), className: cn("relative z-10 px-4 py-2 text-[9px] font-mono tracking-[0.15em] uppercase transition-colors duration-200 rounded-[2px] cursor-clicker", region === r ? "text-jade" : "text-flash/30 hover:text-flash/55"), children: [region === r && (_jsx(motion.div, { layoutId: "region-pill", className: "absolute inset-0 rounded-[2px] bg-jade/10 border border-jade/20", transition: { type: "spring", stiffness: 400, damping: 30 } })), _jsx("span", { className: "relative z-10", children: r })] }, r))) })] })] })] }), false && cutoffs && (_jsxs("div", { className: "flex items-center justify-center gap-8 py-3 mb-2 border-b border-flash/[0.04]", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: getRankImage("CHALLENGER"), alt: "", className: "w-5 h-5 object-contain" }), _jsx("span", { className: "text-[10px] font-mono text-flash/30 uppercase tracking-wider", children: "Challenger" }), _jsxs("span", { className: "text-[12px] font-orbitron font-bold text-amber-300/70 tabular-nums", children: [cutoffs?.challenger?.toLocaleString() ?? "—", " LP"] }), _jsxs("span", { className: "text-[9px] font-mono text-flash/15", children: ["(", cutoffs?.challengerCount, " players)"] })] }), _jsx("div", { className: "w-[1px] h-4 bg-flash/[0.06]" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: getRankImage("GRANDMASTER"), alt: "", className: "w-5 h-5 object-contain" }), _jsx("span", { className: "text-[10px] font-mono text-flash/30 uppercase tracking-wider", children: "Grandmaster" }), _jsxs("span", { className: "text-[12px] font-orbitron font-bold text-red-300/70 tabular-nums", children: [cutoffs?.grandmaster?.toLocaleString() ?? "—", " LP"] }), _jsxs("span", { className: "text-[9px] font-mono text-flash/15", children: ["(", cutoffs?.grandmasterCount, " players)"] })] })] })), _jsxs("div", { className: "grid grid-cols-[48px_48px_36px_1fr_120px_120px_24px_100px_56px] items-center px-5 py-2.5 text-[8px] font-mono text-flash/20 tracking-[0.2em] uppercase border-b border-flash/[0.05]", children: [_jsx("span", { className: "text-center", children: "#" }), _jsx("span", {}), _jsx("span", {}), _jsx("span", { children: "Player" }), _jsx("span", { className: "text-center", children: "Rank" }), _jsx("span", { className: "text-center", children: "Record" }), _jsx("span", {}), _jsx("span", { className: "text-center", children: "Top Champs" }), _jsx("span", { className: "text-right", children: "WR" })] }), error && (_jsx("div", { className: "border border-red-500/20 bg-red-500/5 rounded-sm px-4 py-3 text-red-400 text-sm font-mono my-3", children: error })), _jsx("div", { children: loading
                    ? Array.from({ length: PAGE_SIZE }).map((_, i) => (_jsxs("div", { className: "grid grid-cols-[48px_48px_36px_1fr_120px_120px_24px_100px_56px] items-center px-5 py-3 border-b border-flash/[0.03]", children: [_jsx(Skeleton, { className: "w-6 h-4 bg-flash/5 mx-auto" }), _jsx(Skeleton, { className: "w-9 h-9 rounded-[4px] bg-flash/5" }), _jsx("span", {}), _jsx(Skeleton, { className: "h-4 w-36 bg-flash/5" }), _jsx(Skeleton, { className: "w-20 h-4 bg-flash/5 mx-auto" }), _jsx(Skeleton, { className: "w-20 h-4 bg-flash/5 mx-auto" }), _jsx("span", {}), _jsxs("div", { className: "flex gap-1 justify-center", children: [_jsx(Skeleton, { className: "w-6 h-6 rounded-full bg-flash/5" }), _jsx(Skeleton, { className: "w-6 h-6 rounded-full bg-flash/5" }), _jsx(Skeleton, { className: "w-6 h-6 rounded-full bg-flash/5" })] }), _jsx(Skeleton, { className: "w-10 h-4 bg-flash/5 ml-auto" })] }, i)))
                    : rows.map((r, i) => {
                        const accent = TIER_ACCENTS[r.tier] ?? TIER_ACCENTS.MASTER;
                        const isTop3 = r.rank <= 3;
                        const total = r.wins + r.losses;
                        return (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay: i * 0.015, ease: "easeOut" }, onClick: () => handlePlayerClick(r), className: cn("group relative grid grid-cols-[48px_48px_36px_1fr_120px_120px_24px_100px_56px] items-center px-5 py-3 cursor-clicker transition-all duration-300", "border-b border-flash/[0.03]", "hover:bg-jade/[0.02] hover:border-flash/[0.06]"), children: [_jsx("span", { className: cn("text-center font-orbitron font-bold tabular-nums relative z-10 text-[13px]", r.rank === 1 ? "text-amber-300"
                                        : r.rank === 2 ? "text-gray-300"
                                            : r.rank === 3 ? "text-orange-400"
                                                : "text-flash/20"), children: r.rank }), _jsx("div", { className: "relative w-9 h-9 rounded-[4px] overflow-hidden shrink-0 z-10 transition-transform duration-300 group-hover:scale-105", children: _jsx("img", { src: `${cdnBaseUrl()}/img/profileicon/${r.profileIconId ?? 29}.png`, alt: "", className: "w-full h-full object-cover", draggable: false }) }), _jsxs("div", { className: "flex items-center justify-center relative z-10", children: [r.isPro && (_jsx("span", { className: "text-[6px] font-orbitron font-bold w-7 text-center py-0.5 rounded-[2px] uppercase tracking-wider", style: { background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }, children: "PRO" })), r.isStreamer && !r.isPro && (_jsx("span", { className: "text-[6px] font-orbitron font-bold w-7 text-center py-0.5 rounded-[2px] uppercase tracking-wider text-purple-300 bg-purple-500/15 border border-purple-400/20", children: "STR" }))] }), _jsx("div", { className: "min-w-0 relative z-10", children: _jsx("span", { className: "text-[13px] text-flash/75 font-mono truncate block group-hover:text-flash transition-colors duration-200", children: (() => {
                                            const nt = r.nametag ?? r.summonerName ?? "Unknown";
                                            const [name, tag] = nt.includes("#") ? nt.split("#") : [nt, ""];
                                            return _jsxs(_Fragment, { children: [name, _jsxs("span", { className: "text-flash/15 ml-0.5", children: ["#", tag] })] });
                                        })() }) }), _jsxs("div", { className: "flex items-center gap-2 justify-center relative z-10", children: [_jsx("img", { src: getRankImage(r.tier), alt: r.tier, className: "w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-110" }), _jsxs("div", { children: [_jsx("span", { className: "font-geist font-bold tabular-nums text-[14px] text-flash/70", children: r.leaguePoints.toLocaleString() }), _jsx("span", { className: "text-[9px] text-flash/25 ml-0.5", children: "LP" })] })] }), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("span", { className: "text-[10px] font-mono text-jade/70 tabular-nums", children: [r.wins, "W"] }), _jsxs("span", { className: "text-[10px] font-mono text-red-400/50 tabular-nums", children: [r.losses, "L"] })] }), _jsx("div", { className: "relative h-[3px] rounded-[1px] overflow-hidden", style: { background: "rgba(239,68,68,0.08)" }, children: _jsx("div", { className: "absolute inset-y-0 left-0 rounded-[1px] transition-all duration-700 ease-out", style: {
                                                    width: `${total > 0 ? (r.wins / total) * 100 : 50}%`,
                                                    background: r.winrate >= 60
                                                        ? "linear-gradient(90deg, rgba(0,217,146,0.3), rgba(0,217,146,0.6))"
                                                        : r.winrate >= 52
                                                            ? "linear-gradient(90deg, rgba(0,217,146,0.2), rgba(0,217,146,0.45))"
                                                            : "linear-gradient(90deg, rgba(215,216,217,0.1), rgba(215,216,217,0.25))",
                                                    boxShadow: r.winrate >= 55 ? "0 0 6px rgba(0,217,146,0.2)" : "none",
                                                } }) })] }), _jsx("span", {}), _jsx("div", { className: "flex gap-1 justify-center relative z-10", children: (r.topChampions ?? []).slice(0, 3).map((c, ci) => {
                                        const champName = keyToName[String(c.championId)] ?? String(c.championId);
                                        const champIcon = `${cdnBaseUrl()}/img/champion/${champName}.png`;
                                        return (_jsx("div", { className: "relative group/champ", children: _jsx("img", { src: champIcon, alt: "", className: "w-7 h-7 rounded-full border border-flash/[0.08] transition-transform duration-200 group-hover/champ:scale-110", onError: (e) => { e.currentTarget.style.display = "none"; } }) }, ci));
                                    }) }), _jsxs("span", { className: cn("text-right text-[12px] font-mono font-semibold tabular-nums relative z-10", r.winrate >= 70 ? "text-orange-400" : r.winrate >= 60 ? "text-jade" : r.winrate >= 52 ? "text-flash/50" : "text-red-400/50"), style: r.winrate >= 70 ? {
                                        textShadow: "0 0 8px rgba(251,146,60,0.6)",
                                    } : undefined, children: [r.winrate, "%"] })] }, `${r.puuid ?? r.summonerId}-${r.rank}`));
                    }) }), !loading && totalPages > 1 && (_jsxs("div", { className: "mt-10 mb-6 flex justify-center items-center gap-1.5", children: [_jsx("button", { disabled: page <= 1, onClick: () => load(page - 1), className: "px-4 py-2.5 text-[9px] font-mono tracking-[0.12em] uppercase rounded-[3px] border border-flash/[0.08] bg-flash/[0.015] text-flash/35 hover:text-jade hover:border-jade/20 disabled:opacity-15 transition-all cursor-clicker", children: "PREV" }), Array.from({ length: Math.min(7, totalPages) }).map((_, idx) => {
                        const startPage = Math.max(1, Math.min(page - 3, totalPages - 6));
                        const p = startPage + idx;
                        if (p > totalPages)
                            return null;
                        return (_jsx("button", { onClick: () => load(p), className: cn("w-9 h-9 text-[11px] font-mono rounded-[3px] border transition-all duration-200 cursor-clicker", p === page
                                ? "border-jade/30 bg-jade/10 text-jade shadow-[0_0_12px_rgba(0,217,146,0.15)]"
                                : "border-flash/[0.05] text-flash/25 hover:text-flash/50 hover:border-flash/[0.1]"), children: p }, p));
                    }), _jsx("button", { disabled: page >= totalPages, onClick: () => load(page + 1), className: "px-4 py-2.5 text-[9px] font-mono tracking-[0.12em] uppercase rounded-[3px] border border-flash/[0.08] bg-flash/[0.015] text-flash/35 hover:text-jade hover:border-jade/20 disabled:opacity-15 transition-all cursor-clicker", children: "NEXT" })] })), _jsx(AnimatePresence, { children: showBackToTop && (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 }, className: "fixed bottom-10 right-10 z-50", children: _jsx(DiamondButton, { icon: "top", label: "TOP", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }) })) })] }));
}
