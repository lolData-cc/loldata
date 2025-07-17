import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LiveViewer } from "@/components/liveviewer";
import { ChevronDown, Star } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { getRankImage } from "@/utils/rankIcons";
import { getWinrateClass } from '@/utils/winratecolor';
import { ChampionPicker } from "@/components/championpicker";
import { getKdaClass } from '@/utils/kdaColor';
import { formatStat } from "@/utils/formatStat";
import { timeAgo } from '@/utils/timeAgo';
import { champPath } from "@/config";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { UpdateButton } from "@/components/update";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ShowMoreMatches } from "@/components/showmorematches";
const COOLDOWN_MS = 300_000;
const STORAGE_KEY = "loldata:updateTimestamp";
export default function SummonerPage() {
    const { slug } = useParams();
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [onCooldown, setOnCooldown] = useState(false);
    const [selectedQueue, setSelectedQueue] = useState("RANKED SOLO / DUO");
    const [name, tag] = slug?.split("-") ?? [];
    const [latestPatch, setLatestPatch] = useState("15.13.1");
    const [topChampions, setTopChampions] = useState([]);
    const [summonerInfo, setSummonerInfo] = useState(null);
    const [selectedChampion, setSelectedChampion] = useState(null);
    const [allChampions, setAllChampions] = useState([]);
    const queueTypeMap = {
        400: "Normal Draft",
        420: "Ranked Solo/Duo",
        430: "Normal Blind",
        440: "Ranked Flex",
        450: "ARAM",
        700: "Clash",
        900: "URF",
        1020: "One for All",
        1700: "Arena",
    };
    useEffect(() => {
        fetch("http://cdn.loldata.cc/15.13.1/data/en_US/champion.json")
            .then(res => res.json())
            .then(data => {
            const champs = Object.values(data.data).map((champ) => ({
                id: champ.id,
                name: champ.name,
            }));
            setAllChampions(champs);
        });
    }, []);
    useEffect(() => {
        fetch("https://ddragon.leagueoflegends.com/api/versions.json")
            .then(res => res.json())
            .then((versions) => setLatestPatch(versions[0]));
    }, []);
    useEffect(() => {
        const last = localStorage.getItem(STORAGE_KEY);
        if (last) {
            const diff = Date.now() - Number(last);
            if (diff < COOLDOWN_MS) {
                setOnCooldown(true);
                setTimeout(() => setOnCooldown(false), COOLDOWN_MS - diff);
            }
        }
    }, []);
    useEffect(() => {
        if (!name || !tag)
            return;
        refreshData();
    }, [name, tag]);
    async function refreshData() {
        if (!name || !tag)
            return;
        setLoading(true);
        setSummonerInfo(null);
        setMatches([]);
        const [summoner, matchData] = await Promise.all([
            fetchSummonerInfo(name, tag),
            fetchMatches(name, tag),
        ]);
        await fetch("http://localhost:3001/api/profile/view", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, tag }),
        }).catch(console.error);
        await fetch("http://localhost:3001/api/profile/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, tag }),
        })
            .then(res => res.json())
            //.then(data => setViews(data.views))
            .catch(console.error);
        setLoading(false);
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        setOnCooldown(true);
        setTimeout(() => setOnCooldown(false), COOLDOWN_MS);
    }
    async function fetchSummonerInfo(name, tag) {
        const res = await fetch("http://localhost:3001/api/summoner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, tag }),
        });
        const data = await res.json();
        setSummonerInfo(data.summoner);
    }
    async function fetchMatches(name, tag) {
        const res = await fetch("http://localhost:3001/api/matches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, tag }),
        });
        const data = await res.json();
        setMatches(data.matches || []);
        setTopChampions(data.topChampions || []);
    }
    const filteredMatches = selectedChampion
        ? matches.filter((m) => m.championName === selectedChampion)
        : matches;
    return (_jsx("div", { className: "", children: _jsxs("div", { className: "flex min-h-screen -mt-4", children: [_jsx("div", { className: "w-[30%] min-w-[30%] flex justify-center", children: _jsx("div", { className: "w-[90%] bg-[#1f1f1f] h-[420px] text-sm font-thin rounded-md mt-5 border border-[#2B2A2B] shadow-md", children: _jsxs("nav", { className: "flex flex-col min-h-[400px]", children: [_jsxs("div", { className: "flex justify-between px-10 py-3", children: [_jsx("div", { className: "z-0 text-[14px]", children: "SOLO/DUO" }), _jsx("div", { className: "z-0", children: "FLEX" }), _jsx("div", { className: "z-0", children: "SEASON" })] }), _jsx(Separator, { className: "bg-[#48504E] w-[85%] mx-auto" }), _jsx("div", { className: "flex flex-col gap-3 mx-2 mt-3 ", children: topChampions.length === 0 ? (Array.from({ length: 5 }).map((_, idx) => (_jsx("div", { className: "grid  items-center px-4 py-1 animate-pulse", children: _jsxs("div", { className: "flex items-center gap-3 w-full", children: [_jsx(Skeleton, { className: "w-10 h-10 rounded-full" }), _jsxs("div", { className: "flex flex-col gap-0.5 w-[300px]", children: [_jsx(Skeleton, { className: "w-[30%] h-2.5" }), _jsx(Skeleton, { className: "w-[60%] h-2.5" })] })] }) }, idx)))) : (topChampions.slice(0, 5).map((champ) => (_jsxs("div", { className: "grid grid-cols-3 items-center px-3 gap-4 w-full", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: `${champPath}/${champ.champion}.png`, alt: champ.champion, className: "w-12 h-12 rounded-full" }), _jsxs("div", { className: "flex flex-col text-xs text-white gap-1 justify-start text-[11px] min-w-[100px]", children: [_jsx("div", { className: "text-[#979D9B] font-thin uppercase truncate w-[90px]", children: champ.champion }), _jsxs("div", { className: "text-white font-thin text-[11px]", children: [(() => {
                                                                        const num = Number(champ.csPerMin);
                                                                        const rounded = Math.round(num * 10) / 10;
                                                                        return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
                                                                    })(), "CS/(", champ.avgGold, ")"] })] })] }), _jsxs("div", { className: "flex flex-col items-center text-xs text-white gap-1 w-[90px] whitespace-nowrap pl-20 text-[11px]", children: [_jsxs("div", { className: getKdaClass(champ.avgKda), children: [champ.avgKda, " KDA"] }), _jsxs("div", { children: [formatStat(champ.kills / champ.games), "/", formatStat(champ.deaths / champ.games), "/", formatStat(champ.assists / champ.games)] })] }), _jsxs("div", { className: "flex flex-col items-end text-xs text-white gap-1 text-[11px] min-w-[80px]", children: [_jsxs("div", { className: getWinrateClass(champ.winrate), children: [champ.winrate, "%"] }), _jsxs("div", { className: "text-[11px]", children: [champ.games, " MATCHES"] })] })] }, champ.champion)))) }), _jsx("div", { className: "flex justify-center mt-auto pb-4 pt-4", children: _jsx(ShowMoreMatches, {}) })] }) }) }), _jsxs("div", { className: "w-4/5", children: [_jsxs("div", { className: "flex justify-between items-start mt-4 px-4 w-full min-w-full max-w-full", children: [_jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx("span", { children: "CURRENT RANK" }), _jsxs("div", { className: "relative w-32 h-32 flex items-center justify-center", children: [_jsx("div", { className: "absolute w-24 h-24 bg-[#1f1f1f] rounded-full z-0 border border-[#2B2A2B] shadow-md" }), _jsx("img", { src: getRankImage(summonerInfo?.rank), alt: "Rank Icon", className: "w-32 h-32 z-10 relative" })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsxs("span", { className: "text-[#BFC5C6]", children: [" ", summonerInfo?.rank, " "] }), _jsxs("span", { className: "text-[#5B5555]", children: [summonerInfo?.lp, " LP"] })] })] }), _jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx("span", { className: "text-[#E3E3E3]", children: "HIGHEST RANK" }), _jsxs("div", { className: "relative w-32 h-32 flex items-center justify-center", children: [_jsx("div", { className: "absolute w-24 h-24 bg-[#1f1f1f] rounded-full z-0 border border-[#2B2A2B] shadow-md" }), _jsx("img", { src: "/public/master.png", className: "w-32 h-32 z-10 relative" })] }), _jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "text-[#BFC5C6]", children: "MASTER" }), _jsx("span", { className: "text-[#5B5555]", children: "461 LP" })] })] }), _jsx("div", {}), _jsxs("div", { className: "flex items-start", children: [_jsxs("div", { className: "mr-4 mt-4", children: [_jsxs("div", { className: "uppercase text-2xl cursor-pointer select-none", onClick: () => {
                                                        if (summonerInfo) {
                                                            navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`);
                                                        }
                                                    }, title: "Clicca per copiare", children: [_jsx("div", { className: "flex justify-end", children: _jsx(Toggle, { className: "data-[state=on]:bg-[#11382E] hover:bg-[#11382E]", children: _jsx(Star, { className: "text-[#01D18D]" }) }) }), _jsxs("p", { className: "text-[#5B5555] text-sm justify-end text-right font-thin", children: ["LEVEL ", summonerInfo?.level, " | RANK 23.329"] }), _jsxs("div", { className: "flex justify-end", children: [_jsx("span", { className: "text-[#D7D8D9]", children: summonerInfo?.name }), _jsxs("span", { className: "text-[#BCC9C6]", children: ["#", summonerInfo?.tag] })] })] }), _jsx("div", { className: "mt-2 flex justify-end", children: _jsx(UpdateButton, { onClick: refreshData, loading: loading, cooldown: onCooldown }) })] }), _jsxs("div", { className: "relative w-40 h-40 mr-4", children: [_jsx("img", { src: `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${summonerInfo?.profileIconId}.png`, className: cn("w-full h-full rounded-xl select-none pointer-events-none border-2", summonerInfo?.live ? "border-[#00D992]" : "border-transparent"), draggable: false }), summonerInfo?.live && summonerInfo?.puuid && (_jsx(LiveViewer, { puuid: summonerInfo.puuid, riotId: `${summonerInfo.name}#${summonerInfo.tag}` }))] })] })] }), _jsxs("div", { className: "p-6 max-w-4xl mx-auto", children: [_jsx("nav", { className: "w-full bg-[#1f1f1f] px-8 h-10 rounded-md border border-[#2B2A2B] shadow-md", children: _jsxs("div", { className: "flex items-center h-full justify-between", children: [_jsx(DropdownMenu, { children: _jsxs(DropdownMenuTrigger, { className: "flex items-center space-x-2 hover:text-gray-300 transition-colors", children: [_jsx("span", { className: "text-sm font-medium tracking-wide", children: "RANKED SOLO / DUO" }), _jsx(ChevronDown, { className: "h-4 w-4" })] }) }), _jsx(Separator, { orientation: "vertical", className: "h-4 bg-[#48504E] " }), _jsxs("div", { className: "space-x-2 flex items-center", children: [_jsx(ChampionPicker, { champions: allChampions, onSelect: (champId) => setSelectedChampion(champId) }), _jsx(ChevronDown, { className: "h-4 w-4" })] }), _jsx(Separator, { orientation: "vertical", className: "h-4 bg-[#48504E] " }), _jsx(DropdownMenu, { children: _jsxs(DropdownMenuTrigger, { className: "flex items-center space-x-2 hover:text-gray-300 transition-colors", children: [_jsx("span", { className: "text-sm font-medium tracking-wide", children: "LOREM IPSUM" }), _jsx(ChevronDown, { className: "h-4 w-4" })] }) }), _jsx(Separator, { orientation: "vertical", className: "h-4 bg-[#48504E] " }), _jsx(DropdownMenu, { children: _jsxs(DropdownMenuTrigger, { className: "flex items-center space-x-2 hover:text-gray-300 transition-colors", children: [_jsx("span", { className: "text-sm font-medium tracking-wide", children: "LOREM IPSUM" }), _jsx(ChevronDown, { className: "h-4 w-4" })] }) })] }) }), loading ? (_jsx("ul", { className: "space-y-3 mt-4", children: Array.from({ length: 5 }).map((_, idx) => (_jsxs("li", { className: "flex items-center gap-4 p-3 rounded-md h-28 bg-[#1f1f1f]", children: [_jsx(Skeleton, { className: "w-12 h-12 rounded-md" }), _jsxs("div", { className: "flex flex-col gap-2 w-full", children: [_jsx(Skeleton, { className: "h-4 w-1/2" }), _jsx(Skeleton, { className: "h-4 w-1/3" })] })] }, idx))) })) : matches.length === 0 ? (_jsx("p", { className: "text-muted-foreground mt-4", children: "Nessuna partita trovata." })) : (_jsx("ul", { className: "space-y-3 mt-4", children: filteredMatches.map(({ match, win, championName, }) => {
                                        const queueId = match.info.queueId;
                                        const queueLabel = queueTypeMap[queueId] || "Unknown Queue";
                                        return (_jsxs("li", { className: `gap-4 text-flash p-2 rounded-md h-28 transition-colors duration-300 ${win
                                                ? "bg-gradient-to-r from-[#11382E] to-[#00D992]"
                                                : "bg-gradient-to-r from-[#420909] to-[#c93232]"}`, children: [_jsxs("div", { className: "flex justify-between text-[11px] uppercase text-flash/70", children: [_jsx("span", { children: queueLabel }), _jsx("span", { children: timeAgo(match.info.gameStartTimestamp) })] }), _jsxs("div", { children: [_jsx("img", { src: `${champPath}/${championName}.png`, alt: championName, className: "w-12 h-12 rounded-md" }), _jsx("div", { className: "flex flex-col", children: _jsxs("span", { className: "text-sm font-gtthin font-normal", children: ["MATCH ID: ", match.metadata.matchId] }) })] })] }, match.metadata.matchId));
                                    }) }))] })] })] }) }));
}
