import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogTrigger, } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { formatChampName } from "@/utils/formatchampname";
import { formatRank } from '@/utils/rankConverter';
import WinrateBar from "@/components/winratebar";
export function LiveViewer({ puuid, riotId }) {
    const [championMap, setChampionMap] = useState({});
    const [game, setGame] = useState(null);
    const [open, setOpen] = useState(false);
    const [aiHelp, setAiHelp] = useState(null);
    const [ranks, setRanks] = useState({});
    const [loadingHelp, setLoadingHelp] = useState(false);
    const [selectedTab, setSelectedTab] = useState("statistics");
    const [matchupAdvice, setMatchupAdvice] = useState(null);
    const [orderedTeams, setOrderedTeams] = useState({ 100: {}, 200: {} });
    const generateAiHelp = async () => {
        if (!redTeam.length)
            return;
        setLoadingHelp(true);
        const response = await fetch("http://localhost:3001/api/aihelp/howtowin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enemyChampionIds: redTeam.map(p => p.championId) }),
        });
        const data = await response.json();
        setAiHelp(data?.advice || "Nessun consiglio trovato.");
        setLoadingHelp(false);
    };
    useEffect(() => {
        if (!open)
            return;
        const fetchGameAndChamps = async () => {
            try {
                const gameRes = await fetch("http://localhost:3001/api/livegame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ puuid }),
                });
                const gameData = await (gameRes.status === 204 ? null : gameRes.json());
                if (gameData?.game) {
                    setGame(gameData.game);
                    const riotIds = gameData.game.participants.map((p) => p.riotId);
                    const rankRes = await fetch("http://localhost:3001/api/multirank", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ riotIds }),
                    });
                    const rankData = await rankRes.json();
                    const rankMap = {};
                    rankData.ranks.forEach((r) => {
                        rankMap[r.riotId] = {
                            rank: r.rank,
                            wins: r.wins,
                            losses: r.losses,
                            lp: r.lp
                        };
                    });
                    setRanks(rankMap);
                    const rolesRes = await fetch("http://localhost:3001/api/assignroles", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ participants: gameData.game.participants }),
                    });
                    const rolesData = await rolesRes.json();
                    setOrderedTeams({
                        100: rolesData.roles[100],
                        200: rolesData.roles[200],
                    });
                }
                const champRes = await fetch("https://cdn.loldata.cc/15.13.1/data/en_US/champion.json");
                const champData = await champRes.json();
                const idToName = {};
                Object.values(champData.data).forEach((champ) => {
                    idToName[parseInt(champ.key)] = champ.name;
                });
                setChampionMap(idToName);
            }
            catch (err) {
                console.error(err);
            }
        };
        fetchGameAndChamps();
    }, [open, puuid]);
    const blueTeam = game?.participants.filter(p => p.teamId === 100) || [];
    const redTeam = game?.participants.filter(p => p.teamId === 200) || [];
    return (_jsxs(Dialog, { onOpenChange: setOpen, children: [_jsx(DialogTrigger, { className: "absolute bottom-[-10px] left-28 -translate-x-1/2 bg-[#00D992] text-[#11382E] text-xs px-2 py-1 rounded-md shadow-md whitespace-nowrap", children: "LIVE NOW" }), _jsxs(DialogContent, { className: "w-[70%] max-w-none bg-transparent border-none px-6 text-white top-[5%] translate-y-0 [&>button:last-child]:hidden", children: [_jsxs("div", { className: "flex justify-between gap-8", children: [_jsxs("div", { className: "text-[11px] bg-liquirice/90 w-[45%] h-[300px] p-4 overflow-y-auto rounded-md border border-white/10 ", children: [_jsx("h3", { className: "text-center text-lg mb-2 font-jetbrains", children: "BLUE TEAM" }), _jsx("div", { className: "flex flex-col space-y-3 ", children: ["top", "jungle", "mid", "bot", "support"].map(role => {
                                            const p = orderedTeams[100][role];
                                            return p ? (_jsxs("div", { className: `flex justify-between items-center ${p.riotId === riotId ? "bg-jade/25 rounded-sm" : ""}`, children: [_jsxs("div", { className: "flex items-center gap-2 w-[50%]", children: [_jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/champion/${formatChampName(championMap[p.championId])}.png`, className: "w-9 h-9 rounded-lg" }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell1Id}.png`, className: "w-4 h-4 rounded-sm" }), _jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell2Id}.png`, className: "w-4 h-4 rounded-sm" })] }), _jsx("span", { className: "ml-2 uppercase font-jetbrains", children: p.riotId })] }), _jsxs("div", { className: "flex gap-1 space-x-1 text-white/80 font-jetbrains text-left w-[35%]", children: [_jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/miniranks/${formatRank(ranks[p.riotId]?.rank)}.png`, className: "w-4 h-4 rounded-sm" }), _jsxs("span", { children: [ranks[p.riotId]?.rank || "...", " ", ranks[p.riotId]?.lp] })] }), _jsx("div", { className: "w-[25%] pr-2", children: _jsx(WinrateBar, { wins: ranks[p.riotId]?.wins || 0, losses: ranks[p.riotId]?.losses || 0 }) })] }, p.summonerName)) : null;
                                        }) })] }), _jsxs("div", { className: "text-center text-white font-bold text-xl flex flex-col items-center justify-center", children: [_jsx("div", { children: "VS" }), _jsx("span", { className: "uppercase font-jetbrains text-[11px]", children: game?.gameType })] }), _jsxs("div", { className: "text-[11px] bg-liquirice/90 w-[45%] h-[300px] p-4 overflow-y-auto rounded-md border border-white/10", children: [_jsx("h3", { className: "text-center text-lg mb-2 font-jetbrains", children: "RED TEAM" }), _jsx("div", { className: "flex flex-col space-y-3", children: ["top", "jungle", "mid", "bot", "support"].map(role => {
                                            const p = orderedTeams[200][role];
                                            return p ? (_jsxs("div", { className: `flex items-center justify-between rounded ${p.riotId === riotId ? "bg-jade/10" : ""}`, children: [_jsxs("div", { className: "flex items-center gap-1 w-[50%]", children: [_jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/champion/${formatChampName(championMap[p.championId])}.png`, className: "w-9 h-9 rounded-lg" }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell1Id}.png`, className: "w-4 h-4 rounded-sm" }), _jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell2Id}.png`, className: "w-4 h-4 rounded-sm" })] }), _jsx("div", { className: "flex flex-col gap-1 font-jetbrains ml-2", children: _jsx("span", { className: "uppercase font-jetbrains", children: p.riotId }) })] }), _jsxs("div", { className: "flex gap-1 space-x-1 text-white/80 font-jetbrains text-left w-[35%]", children: [_jsx("img", { src: `https://cdn.loldata.cc/15.13.1/img/miniranks/${formatRank(ranks[p.riotId]?.rank)}.png`, className: "w-4 h-4 rounded-sm" }), _jsxs("span", { children: [ranks[p.riotId]?.rank || "...", " ", ranks[p.riotId]?.lp] })] }), _jsx("div", { className: "w-[25%] pr-2", children: _jsx(WinrateBar, { wins: ranks[p.riotId]?.wins || 0, losses: ranks[p.riotId]?.losses || 0 }) })] }, p.summonerName)) : null;
                                        }) })] })] }), _jsx("div", { className: "mt-6 flex flex-col items-end gap-4", children: _jsx("div", { className: "w-full bg-liquirice text-white p-4 rounded text-sm shadow-lg border border-white/10 max-h-[300px] flex flex-col", children: _jsxs(Tabs, { defaultValue: "statistics", value: selectedTab, onValueChange: (value) => {
                                    setSelectedTab(value);
                                    if (value === "howtowin" && !aiHelp) {
                                        generateAiHelp();
                                    }
                                    // if (value === "matchups" && !matchupAdvice) {
                                    //   generateMatchupAdvice()
                                    // }
                                }, className: "bg-none flex flex-col h-full", children: [_jsxs(TabsList, { className: "bg-liquirice space-x-4 font-jetbrains justify-start", children: [_jsx(TabsTrigger, { value: "statistics", className: "group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]\r\n                data-[state=active]:bg-[#11382E] data-[state=active]:text-white ", children: _jsx("div", { children: "STATISTICS" }) }), _jsxs(TabsTrigger, { value: "howtowin", className: "group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]\r\n                data-[state=active]:bg-[#11382E] data-[state=active]:text-white", children: [_jsx("div", { children: "HOW TO WIN" }), _jsx("div", { className: "px-1 text-jade rounded-sm bg-[#11382E] group-data-[state=active]:bg-[#00D992] group-data-[state=active]:text-[#11382E]", children: "AI" })] }), _jsxs(TabsTrigger, { value: "matchups", className: "group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]\r\n                data-[state=active]:bg-[#11382E] data-[state=active]:text-white", children: [_jsx("div", { children: "MATCHUP" }), _jsx("div", { className: "px-1 py-0 text-jade rounded-sm bg-[#11382E] group-data-[state=active]:bg-jade group-data-[state=active]:text-[#11382E]", children: "AI" })] }), _jsxs(TabsTrigger, { value: "whattobuild", className: "group flex items-center space-x-2 px-2 py-1 rounded-sm text-white bg-liquirice hover:bg-[#2a2a2a]\r\n                data-[state=active]:bg-[#11382E] data-[state=active]:text-white", children: [_jsx("div", { children: "WHAT TO BUILD" }), _jsx("div", { className: "px-1 py-0 text-[#00D992] rounded-sm bg-[#11382E] group-data-[state=active]:bg-[#00D992] group-data-[state=active]:text-[#11382E]", children: "AI" })] })] }), _jsxs("div", { className: "mt-4 px-2 overflow-y-auto max-h-[230px] scrollbar-hide", children: [_jsx(TabsContent, { value: "statistics", className: "font-geist text-[12px] leading-6" }), _jsx(TabsContent, { value: "howtowin", className: "font-geist text-[12px] leading-6 whitespace-pre-wrap", children: loadingHelp ? (_jsx("div", { className: "animate-pulse text-white/60", children: "AI is thinking..." })) : (aiHelp || "No advice generated.") }), _jsx(TabsContent, { value: "matchups", className: "font-geist text-[12px] leading-6 whitespace-pre-wrap", children: matchupAdvice || "Nessun consiglio matchup trovato." })] })] }) }) })] })] }));
}
