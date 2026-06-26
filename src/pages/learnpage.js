import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { Navbar } from "@/components/navbar";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ChevronsUp, ChevronsDown } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import LoldataAIChat from "@/components/loldataaichat";
import Overview from "@/components/overview";
import { motion, AnimatePresence } from "framer-motion";
dayjs.extend(relativeTime);
const aiUrl = import.meta.env.MODE === "development"
    ? "http://localhost:3002/chat/ask"
    : "https://ai.loldata.cc/chat/ask";
// ── Rank utilities ──
const tierOrder = [
    "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
    "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"
];
const divisionOrder = ["I", "II", "III", "IV"];
function getRankTierValue(rank) {
    if (!rank)
        return 0;
    const parts = rank.trim().split(" ");
    if (parts.length < 2)
        return 0;
    const tier = parts[0]?.toUpperCase();
    let division = parts[1]?.toUpperCase();
    if (!isNaN(Number(division))) {
        const map = { "1": "I", "2": "II", "3": "III", "4": "IV" };
        division = map[division] || "I";
    }
    const tierIndex = tierOrder.indexOf(tier);
    const divisionIndex = divisionOrder.indexOf(division);
    if (tierIndex === -1 || divisionIndex === -1)
        return 0;
    return tierIndex * 4 + (3 - divisionIndex);
}
function getRankChange(prev, curr) {
    if (!prev || !curr)
        return null;
    const prevVal = getRankTierValue(prev.rank);
    const currVal = getRankTierValue(curr.rank);
    if (currVal > prevVal)
        return "up";
    if (currVal < prevVal)
        return "down";
    return null;
}
function getAbsoluteLp(rank, lp) {
    if (!rank || lp === undefined || lp === null)
        return 0;
    const parts = rank.trim().split(" ");
    if (parts.length < 2)
        return 0;
    const tierRaw = parts[0]?.toUpperCase();
    let divisionRaw = parts[1]?.toUpperCase();
    if (!isNaN(Number(divisionRaw))) {
        const map = { "1": "I", "2": "II", "3": "III", "4": "IV" };
        divisionRaw = map[divisionRaw] || "I";
    }
    const numericLp = Number(lp);
    const tierIndex = tierOrder.indexOf(tierRaw);
    const divisionIndex = divisionOrder.indexOf(divisionRaw);
    if (tierIndex === -1 || divisionIndex === -1 || isNaN(numericLp))
        return 0;
    return tierIndex * 400 + (3 - divisionIndex) * 100 + numericLp;
}
function getLpDelta(prev, curr) {
    if (!prev || !curr)
        return 0;
    if (prev.rank === curr.rank)
        return Number(curr.lp) - Number(prev.lp);
    return getAbsoluteLp(curr.rank, curr.lp) - getAbsoluteLp(prev.rank, prev.lp);
}
// ── Tab definitions ──
const TABS = [
    { id: "overview", label: "OVERVIEW", desc: "Daily report" },
    { id: "games", label: "YOUR GAMES", desc: "Tracked history" },
    { id: "explorer", label: "EXPLORER", desc: "Node query builder" },
    { id: "itemization", label: "ITEMIZATION", desc: "Build intelligence" },
    { id: "loldata-ai", label: "LOLDATA AI", desc: "Ask anything" },
];
export default function LearnPage() {
    const { nametag, puuid, region } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get("t") || "overview");
    const setActiveTab = (id) => setSearchParams((p) => { p.set("t", id); return p; }, { replace: true });
    const [gamesList, setGamesList] = useState([]);
    const [loadingGames, setLoadingGames] = useState(true);
    useEffect(() => {
        const fetchGames = async () => {
            if (!nametag)
                return;
            const { data, error } = await supabase
                .from("tracked_games")
                .select("*")
                .eq("nametag", nametag)
                .order("created_at", { ascending: true });
            if (error || !data) {
                setLoadingGames(false);
                return;
            }
            setGamesList(data.map((game) => ({ ...game, day: dayjs(game.created_at).format("YYYY-MM-DD") })));
            setLoadingGames(false);
        };
        fetchGames();
    }, [nametag]);
    const gamesByDay = gamesList.reduce((acc, game) => {
        if (!acc[game.day])
            acc[game.day] = [];
        acc[game.day].push(game);
        return acc;
    }, {});
    const sortedDays = Object.keys(gamesByDay).sort().reverse();
    return (_jsxs("div", { className: "font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen flex flex-col overflow-hidden", children: [_jsx("div", { className: "w-full flex justify-center", children: _jsx("div", { className: "w-full lg:w-[65%]", children: _jsx(Navbar, {}) }) }), _jsx(Separator, { className: "bg-flash/[0.08] w-full shrink-0" }), _jsx("div", { className: "flex-1 min-h-0 scrollbar-hide relative overflow-y-auto pt-16 md:pt-0", children: _jsxs("div", { className: "w-full px-3 lg:w-[65%] lg:px-0 mx-auto py-4 lg:py-6 relative z-10", children: [_jsx("div", { className: "hidden lg:block absolute left-0 top-6 w-[160px] pointer-events-auto", children: _jsxs("div", { className: "relative", children: [_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1.5 h-1.5 bg-jade rounded-full animate-pulse" }), _jsx("span", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/70", children: "AI LEARN" })] }), nametag && (_jsx("span", { className: "text-[10px] font-mono text-flash/25 mt-1.5 block truncate", children: nametag }))] }), _jsx("div", { className: "h-px bg-flash/[0.06] mb-4" }), _jsx("nav", { children: _jsx("div", { className: "flex flex-col gap-0.5", children: TABS.map((tab) => (_jsxs("button", { onClick: () => tab.id === "explorer" ? navigate("/learn/explorer") : setActiveTab(tab.id), className: cn("relative w-full text-left px-4 py-2.5 rounded-sm cursor-clicker transition-colors duration-200 border-l-2", activeTab === tab.id
                                                    ? "text-jade border-jade"
                                                    : "text-flash/35 hover:text-flash/55 border-transparent"), children: [_jsx("span", { className: "text-[10px] font-mono tracking-[0.18em] uppercase block leading-none", children: tab.label }), _jsx("span", { className: cn("text-[8px] font-mono tracking-[0.1em] mt-0.5 block transition-colors duration-200", activeTab === tab.id ? "text-jade/40" : "text-flash/15"), children: tab.desc })] }, tab.id))) }) })] }) }), _jsx("div", { className: "ml-0 max-w-full lg:ml-[180px] lg:max-w-[calc(100%-180px)]", children: _jsxs(AnimatePresence, { mode: "wait", children: [activeTab === "overview" && (_jsx(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.2 }, children: _jsx(Overview, { puuid: puuid ?? null, region: region ?? null, nametag: nametag ?? null }) }, "overview")), activeTab === "games" && (_jsxs(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.2 }, children: [_jsx("div", { className: "mb-6", children: _jsx("span", { className: "text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50", children: "// TRACKED GAMES" }) }), loadingGames ? (_jsx("p", { className: "text-flash/30 font-mono text-sm", children: "Loading..." })) : sortedDays.length === 0 ? (_jsx("p", { className: "text-flash/30 font-mono text-sm", children: "No tracked games yet" })) : (sortedDays.map((day, index) => {
                                                const todayGames = gamesByDay[day];
                                                if (!todayGames?.length)
                                                    return null;
                                                const firstGame = todayGames[0];
                                                const lastGame = todayGames[todayGames.length - 1];
                                                const todayDate = dayjs(day);
                                                const previousGame = [...gamesList].reverse().find(g => dayjs(g.created_at).isBefore(todayDate, "day"));
                                                const startAbs = previousGame ? getAbsoluteLp(previousGame.rank, previousGame.lp) : getAbsoluteLp(firstGame.rank, firstGame.lp);
                                                const endAbs = getAbsoluteLp(lastGame.rank, lastGame.lp);
                                                const totalLp = endAbs - startAbs;
                                                const relative = dayjs(day).isSame(dayjs(), "day") ? "Today" : dayjs(day).fromNow();
                                                return (_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex items-baseline gap-2 mb-3", children: [_jsx("span", { className: "text-[11px] font-mono text-flash/60", children: relative }), _jsxs("span", { className: cn("text-[11px] font-mono tabular-nums", totalLp >= 0 ? "text-jade/60" : "text-red-400/60"), children: [totalLp >= 0 ? "+" : "", totalLp, " LP"] })] }), _jsxs(Table, { className: "w-full uppercase", children: [_jsx(TableHeader, { children: _jsxs(TableRow, { className: "border-flash/[0.06]", children: [_jsx(TableHead, { className: "text-[9px] tracking-[0.15em] text-flash/25 w-[18%]", children: "CHAMPION" }), _jsx(TableHead, { className: "text-[9px] tracking-[0.15em] text-flash/25 w-[12%]", children: "LANE" }), _jsx(TableHead, { className: "text-[9px] tracking-[0.15em] text-flash/25 w-[18%]", children: "MATCHUP" }), _jsx(TableHead, { className: "text-[9px] tracking-[0.15em] text-flash/25 w-[15%]", children: "QUEUE" }), _jsx(TableHead, { className: "text-[9px] tracking-[0.15em] text-flash/25 w-[12%] text-center", children: "LP" })] }) }), _jsx(TableBody, { children: [...todayGames].reverse().map((g) => {
                                                                        const i = gamesList.findIndex(x => x.id === g.id);
                                                                        const prev = gamesList[i - 1];
                                                                        const diff = prev ? getLpDelta(prev, g) : 0;
                                                                        const rankChange = getRankChange(prev, g);
                                                                        const rankParts = g.rank?.split(" ") || [];
                                                                        const tierInitial = rankParts[0]?.[0]?.toUpperCase() || "";
                                                                        const division = rankParts[1] || "";
                                                                        const shortRank = `${tierInitial}${division}`;
                                                                        return (_jsxs(TableRow, { className: "border-flash/[0.04] text-[11px] font-mono", children: [_jsx(TableCell, { className: "text-flash/60", children: g.champion_name }), _jsx(TableCell, { className: "text-flash/40", children: g.lane }), _jsx(TableCell, { className: "text-flash/40", children: g.matchup }), _jsx(TableCell, { className: "text-flash/30", children: g.queue_type }), _jsx(TableCell, { className: "text-center", children: _jsxs("span", { className: cn("inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-sm text-[10px] tabular-nums", diff > 0 ? "bg-jade/10 text-jade" : diff < 0 ? "bg-red-400/10 text-red-400" : "text-flash/30"), children: [rankChange === "up" && _jsxs(_Fragment, { children: [_jsx(ChevronsUp, { className: "w-3 h-3" }), shortRank] }), rankChange === "down" && _jsxs(_Fragment, { children: [_jsx(ChevronsDown, { className: "w-3 h-3" }), shortRank] }), !rankChange && `${diff >= 0 ? "+" : ""}${diff}`] }) })] }, g.id));
                                                                    }) })] }), index !== sortedDays.length - 1 && (_jsx("div", { className: "flex justify-center my-4", children: _jsx("div", { className: "w-px h-8 bg-gradient-to-b from-flash/10 to-transparent" }) }))] }, day));
                                            }))] }, "games")), activeTab === "itemization" && (_jsxs(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.2 }, className: "flex flex-col items-center justify-center h-48 gap-2", children: [_jsx("span", { className: "text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50", children: "// ITEMIZATION" }), _jsx("span", { className: "text-flash/40 font-mono text-sm", children: "Build intelligence coming soon" }), _jsx("span", { className: "text-flash/20 font-mono text-[10px]", children: "Compare your builds with Diamond+ optimal paths" })] }, "itemization")), activeTab === "loldata-ai" && (_jsxs(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.2 }, className: "h-[calc(100vh-140px)]", children: [_jsx("div", { className: "mb-4", children: _jsx("span", { className: "text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50", children: "// LOLDATA AI" }) }), _jsx("div", { className: "h-[calc(100%-32px)]", children: _jsx(LoldataAIChat, { apiUrl: aiUrl, contextHint: nametag ? `User: ${nametag}` : undefined }) })] }, "loldata-ai"))] }) })] }) })] }));
}
