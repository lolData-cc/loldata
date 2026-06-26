import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
// ── Constants ────────────────────────────────────────────────────────
const MAP_MAX = 14870;
const MAP_SIZE = 300;
const getMinimapUrl = () => `${cdnBaseUrl()}/img/map/map11.png`;
const EVENTS_PER_PAGE = 7;
// ── Helpers ──────────────────────────────────────────────────────────
function formatGameTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
function getMonsterDisplayName(monsterType, monsterSubType) {
    if (monsterType === "BARON_NASHOR")
        return "Baron Nashor";
    if (monsterType === "RIFTHERALD")
        return "Rift Herald";
    if (monsterType === "HORDE")
        return "Voidgrubs";
    if (monsterType === "DRAGON") {
        const subTypeMap = {
            FIRE_DRAGON: "Infernal Drake",
            WATER_DRAGON: "Ocean Drake",
            EARTH_DRAGON: "Mountain Drake",
            AIR_DRAGON: "Cloud Drake",
            HEXTECH_DRAGON: "Hextech Drake",
            CHEMTECH_DRAGON: "Chemtech Drake",
            ELDER_DRAGON: "Elder Dragon",
        };
        return subTypeMap[monsterSubType ?? ""] ?? "Dragon";
    }
    return monsterType;
}
function getMonsterColor(monsterType) {
    if (monsterType === "BARON_NASHOR")
        return "text-fuchsia-300";
    if (monsterType === "RIFTHERALD")
        return "text-violet-300";
    if (monsterType === "HORDE")
        return "text-violet-300";
    return "text-amber-300";
}
function getTowerDisplayName(event) {
    const laneMap = {
        TOP_LANE: "Top",
        MID_LANE: "Mid",
        BOT_LANE: "Bot",
    };
    const towerMap = {
        OUTER_TURRET: "Outer Turret",
        INNER_TURRET: "Inner Turret",
        BASE_TURRET: "Base Turret",
        NEXUS_TURRET: "Nexus Turret",
    };
    const lane = laneMap[event.laneType] ?? event.laneType;
    if (event.buildingType === "INHIBITOR_BUILDING") {
        return `${lane} Inhibitor`;
    }
    const tower = towerMap[event.towerType ?? ""] ?? "Turret";
    return `${lane} ${tower}`;
}
function toPercent(gameX, gameY) {
    return {
        left: `${(gameX / MAP_MAX) * 100}%`,
        top: `${((MAP_MAX - gameY) / MAP_MAX) * 100}%`,
    };
}
// ── Build Timeline (inline) ──────────────────────────────────────────
function BuildPanel({ participantId, timeline, scrollRef }) {
    const itemEvents = timeline?.info?.frames
        ?.flatMap((frame) => frame.events)
        .filter((e) => ["ITEM_PURCHASED", "ITEM_UNDO", "ITEM_SOLD"].includes(e.type) &&
        e.participantId === participantId) || [];
    const groupedEvents = [];
    for (const event of itemEvents) {
        const lastGroup = groupedEvents[groupedEvents.length - 1];
        const isNewGroup = !lastGroup || Math.abs(event.timestamp - lastGroup.timestamp) > 3000;
        if (isNewGroup) {
            groupedEvents.push({ timestamp: event.timestamp, bought: [], sold: [] });
        }
        const currentGroup = groupedEvents[groupedEvents.length - 1];
        if (event.type === "ITEM_PURCHASED") {
            currentGroup.bought.push(event.itemId);
        }
        else if (event.type === "ITEM_UNDO") {
            currentGroup.bought = currentGroup.bought.filter((id) => id !== event.itemBefore);
        }
        else if (event.type === "ITEM_SOLD") {
            currentGroup.sold.push(event.itemId);
        }
    }
    const getItemCounts = (items) => {
        const counts = {};
        for (const id of items)
            counts[id] = (counts[id] || 0) + 1;
        return counts;
    };
    return (_jsxs("div", { className: "flex-1 flex flex-col min-h-0", children: [_jsx("div", { className: "border border-cyan-500/[0.07] rounded-md bg-[#08080a] shadow-[inset_0_0_20px_rgba(0,0,0,0.4)] flex-1 flex items-center", children: _jsx("div", { ref: scrollRef, className: "flex gap-4 overflow-x-auto scrollbar-hide px-6 py-3 w-full items-center", children: groupedEvents.map((group, idx) => {
                        const boughtCounts = getItemCounts(group.bought);
                        return (_jsxs(_Fragment, { children: [idx > 0 && (_jsx("span", { className: "flex items-center shrink-0 text-[8px] text-cyan-500/15 select-none", children: "\u25C8" })), _jsxs("div", { className: "flex flex-col items-center min-w-[48px] shrink-0", children: [_jsxs("div", { className: "flex gap-1.5 mb-1 justify-center", children: [Object.entries(boughtCounts).map(([id, count]) => (_jsxs("div", { className: "relative w-7 h-7", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, className: "w-7 h-7 rounded ring-1 ring-white/10" }), count > 1 && (_jsxs("span", { className: "absolute -bottom-0.5 -right-0.5 text-[8px] bg-black/90 text-flash/60 rounded px-0.5 leading-none font-mono", children: ["x", count] }))] }, `buy-${id}`))), group.sold.map((id, i) => (_jsxs("div", { className: "relative w-7 h-7 opacity-40", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, className: "w-7 h-7 rounded grayscale ring-1 ring-white/5" }), _jsx("span", { className: "absolute -bottom-0.5 -right-0.5 text-[7px] bg-rose-900/80 text-rose-300 rounded px-0.5 leading-none font-mono", children: "X" })] }, `sold-${id}-${i}`)))] }), _jsx("span", { className: "text-[9px] text-flash/20 font-mono tracking-[0.15em]", children: formatGameTime(group.timestamp) })] }, idx)] }));
                    }) }) }), _jsxs("div", { className: "flex gap-2 mt-1.5", children: [_jsx("button", { onClick: () => scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" }), className: "px-2.5 py-0.5 rounded-sm border border-cyan-500/10 bg-[#09090b] text-flash/30 hover:text-cyan-300 hover:border-cyan-500/25 hover:shadow-[0_0_8px_rgba(34,211,238,0.1)] transition-all cursor-clicker font-mono text-[10px] tracking-[0.15em]", children: "\u2190" }), _jsx("button", { onClick: () => scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" }), className: "px-2.5 py-0.5 rounded-sm border border-cyan-500/10 bg-[#09090b] text-flash/30 hover:text-cyan-300 hover:border-cyan-500/25 hover:shadow-[0_0_8px_rgba(34,211,238,0.1)] transition-all cursor-clicker font-mono text-[10px] tracking-[0.15em]", children: "\u2192" })] })] }));
}
// ── Main Component ───────────────────────────────────────────────────
export function KillMap({ timeline, participants, focusedPlayerPuuid }) {
    const [activeTab, setActiveTab] = useState("kills");
    const [currentPage, setCurrentPage] = useState(1);
    const [hoveredEventIndex, setHoveredEventIndex] = useState(null);
    const [selectedBuildPlayer, setSelectedBuildPlayer] = useState(0); // index into participants
    const buildScrollRef = useRef(null);
    const participantMap = useMemo(() => {
        const map = new Map();
        participants.forEach((p, i) => map.set(i + 1, p));
        return map;
    }, [participants]);
    const allEvents = useMemo(() => {
        if (!timeline?.info?.frames)
            return [];
        const events = [];
        for (const frame of timeline.info.frames) {
            for (const event of frame.events || []) {
                if (event.type === "CHAMPION_KILL" && event.position) {
                    events.push(event);
                }
                else if (event.type === "ELITE_MONSTER_KILL" && event.position) {
                    events.push(event);
                }
                else if (event.type === "BUILDING_KILL" && event.position) {
                    events.push(event);
                }
            }
        }
        return events;
    }, [timeline]);
    const killCount = useMemo(() => allEvents.filter(e => e.type === "CHAMPION_KILL").length, [allEvents]);
    const objectiveCount = useMemo(() => allEvents.filter(e => e.type === "ELITE_MONSTER_KILL").length, [allEvents]);
    const towerCount = useMemo(() => allEvents.filter(e => e.type === "BUILDING_KILL").length, [allEvents]);
    // For event tabs: filter events. For builds tab: show all kills on map
    const filteredEvents = useMemo(() => {
        switch (activeTab) {
            case "kills": return allEvents.filter(e => e.type === "CHAMPION_KILL");
            case "objectives": return allEvents.filter(e => e.type === "ELITE_MONSTER_KILL");
            case "towers": return allEvents.filter(e => e.type === "BUILDING_KILL");
            case "builds": return allEvents.filter(e => e.type === "CHAMPION_KILL");
        }
    }, [allEvents, activeTab]);
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
    const paginatedEvents = filteredEvents.slice((currentPage - 1) * EVENTS_PER_PAGE, currentPage * EVENTS_PER_PAGE);
    if (!timeline?.info?.frames || allEvents.length === 0)
        return null;
    function handleTabChange(tab) {
        setActiveTab(tab);
        setCurrentPage(1);
        setHoveredEventIndex(null);
    }
    // ── Map dot ────────────────────────────────────────────────────────
    function renderDot(event, globalIndex) {
        const pos = toPercent(event.position.x, event.position.y);
        const isHovered = hoveredEventIndex === globalIndex;
        const isBuildTab = activeTab === "builds";
        let colorClass;
        let shapeClass = "rounded-full";
        let dotSize = 6;
        if (event.type === "CHAMPION_KILL") {
            const killer = participantMap.get(event.killerId);
            const isBlue = killer?.teamId === 100;
            colorClass = isBlue
                ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]";
        }
        else if (event.type === "ELITE_MONSTER_KILL") {
            const isBlue = event.killerTeamId === 100;
            colorClass = isBlue
                ? "bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]"
                : "bg-rose-300 shadow-[0_0_10px_rgba(253,164,175,0.8)]";
            dotSize = 8;
        }
        else {
            const destroyerIsBlue = event.teamId === 200;
            colorClass = destroyerIsBlue
                ? "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)]"
                : "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]";
            shapeClass = "rounded-[2px]";
        }
        return (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: cn("absolute cursor-pointer transition-all duration-150", shapeClass, colorClass, isBuildTab ? "opacity-30" : "", isHovered ? "z-20 opacity-100" : "z-10"), style: {
                            left: pos.left,
                            top: pos.top,
                            width: dotSize,
                            height: dotSize,
                            transform: `translate(-50%, -50%)${isHovered ? " scale(2.2)" : ""}`,
                        }, onMouseEnter: () => setHoveredEventIndex(globalIndex), onMouseLeave: () => setHoveredEventIndex(null) }) }), _jsxs(TooltipContent, { side: "top", className: "font-mono text-[11px] tracking-wider bg-[#08080a] border border-cyan-500/20 px-3 py-2 shadow-[0_0_12px_rgba(34,211,238,0.1)]", children: [renderTooltipContent(event), _jsx("div", { className: "text-flash/30 text-[10px] mt-1 text-center font-mono tracking-[0.2em]", children: formatGameTime(event.timestamp) })] })] }, `${event.type}-${globalIndex}`));
    }
    // ── Tooltip content ────────────────────────────────────────────────
    function renderTooltipContent(event) {
        if (event.type === "CHAMPION_KILL") {
            const killer = participantMap.get(event.killerId);
            const victim = participantMap.get(event.victimId);
            const isBlueKill = killer?.teamId === 100;
            return (_jsxs("div", { className: "flex items-center gap-2", children: [killer && _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${killer.championName}.png`, className: "w-5 h-5 rounded-sm ring-1 ring-white/10" }), _jsx("span", { className: isBlueKill ? "text-cyan-300" : "text-rose-300", children: killer?.riotIdGameName ?? "Unknown" }), _jsx("span", { className: "text-flash/20", children: "///" }), _jsx("span", { className: !isBlueKill ? "text-cyan-300" : "text-rose-300", children: victim?.riotIdGameName ?? "Unknown" }), victim && _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${victim.championName}.png`, className: "w-5 h-5 rounded-sm ring-1 ring-white/10" })] }));
        }
        if (event.type === "ELITE_MONSTER_KILL") {
            const killer = participantMap.get(event.killerId);
            const isBlue = event.killerTeamId === 100;
            const monsterName = getMonsterDisplayName(event.monsterType, event.monsterSubType);
            return (_jsxs("div", { className: "flex items-center gap-2", children: [killer && _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${killer.championName}.png`, className: "w-5 h-5 rounded-sm ring-1 ring-white/10" }), _jsx("span", { className: isBlue ? "text-cyan-300" : "text-rose-300", children: killer?.riotIdGameName ?? (isBlue ? "Blue" : "Red") }), _jsx("span", { className: "text-flash/20", children: "///" }), _jsx("span", { className: getMonsterColor(event.monsterType), children: monsterName })] }));
        }
        const destroyerIsBlue = event.teamId === 200;
        const towerName = getTowerDisplayName(event);
        return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: destroyerIsBlue ? "text-cyan-300" : "text-rose-300", children: destroyerIsBlue ? "Blue" : "Red" }), _jsx("span", { className: "text-flash/20", children: "///" }), _jsx("span", { className: "text-yellow-300/80", children: towerName })] }));
    }
    // ── Event list row ────────────────────────────────────────────────
    function renderEventRow(event, globalIndex) {
        const isHovered = hoveredEventIndex === globalIndex;
        return (_jsxs("div", { className: cn("flex items-center gap-3 px-3 py-2 text-xs font-mono transition-all duration-100 cursor-default border-l-2 border-transparent", isHovered
                ? "bg-cyan-500/[0.06] border-l-cyan-400/40"
                : "hover:bg-flash/[0.03]"), onMouseEnter: () => setHoveredEventIndex(globalIndex), onMouseLeave: () => setHoveredEventIndex(null), children: [_jsx("span", { className: "text-flash/20 text-[10px] w-10 shrink-0 text-right tracking-[0.15em]", children: formatGameTime(event.timestamp) }), _jsx("span", { className: "text-flash/[0.06] shrink-0", children: "|" }), event.type === "CHAMPION_KILL" && renderKillRow(event), event.type === "ELITE_MONSTER_KILL" && renderObjectiveRow(event), event.type === "BUILDING_KILL" && renderTowerRow(event)] }, `${event.type}-${globalIndex}`));
    }
    function renderKillRow(event) {
        const killer = participantMap.get(event.killerId);
        const victim = participantMap.get(event.victimId);
        const isBlueKill = killer?.teamId === 100;
        const assists = event.assistingParticipantIds?.length ?? 0;
        return (_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [killer && _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${killer.championName}.png`, className: "w-4 h-4 rounded-[3px] shrink-0 ring-1 ring-white/10" }), _jsx("span", { className: cn("truncate text-[11px]", isBlueKill ? "text-cyan-300/90" : "text-rose-300/90"), children: killer?.riotIdGameName ?? "Unknown" }), _jsx("span", { className: "text-flash/15 text-[10px] shrink-0 tracking-widest", children: ">" }), _jsx("span", { className: cn("truncate text-[11px]", !isBlueKill ? "text-cyan-300/90" : "text-rose-300/90"), children: victim?.riotIdGameName ?? "Unknown" }), victim && _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${victim.championName}.png`, className: "w-4 h-4 rounded-[3px] shrink-0 ring-1 ring-white/10" }), assists > 0 && _jsxs("span", { className: "text-flash/15 text-[9px] shrink-0 tracking-wider", children: ["+", assists] })] }));
    }
    function renderObjectiveRow(event) {
        const killer = participantMap.get(event.killerId);
        const isBlue = event.killerTeamId === 100;
        const monsterName = getMonsterDisplayName(event.monsterType, event.monsterSubType);
        return (_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [killer && _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${killer.championName}.png`, className: "w-4 h-4 rounded-[3px] shrink-0 ring-1 ring-white/10" }), _jsx("span", { className: cn("truncate text-[11px]", isBlue ? "text-cyan-300/90" : "text-rose-300/90"), children: killer?.riotIdGameName ?? (isBlue ? "Blue" : "Red") }), _jsx("span", { className: "text-flash/15 text-[10px] shrink-0 tracking-widest", children: ">" }), _jsx("span", { className: cn("shrink-0 text-[11px]", getMonsterColor(event.monsterType)), children: monsterName })] }));
    }
    function renderTowerRow(event) {
        const destroyerIsBlue = event.teamId === 200;
        const towerName = getTowerDisplayName(event);
        return (_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("div", { className: cn("w-2 h-2 rounded-[2px] shrink-0", destroyerIsBlue
                        ? "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.5)]"
                        : "bg-rose-400 shadow-[0_0_4px_rgba(251,113,133,0.5)]") }), _jsx("span", { className: cn("shrink-0 text-[11px]", destroyerIsBlue ? "text-cyan-300/90" : "text-rose-300/90"), children: destroyerIsBlue ? "Blue" : "Red" }), _jsx("span", { className: "text-flash/15 text-[10px] shrink-0 tracking-widest", children: ">" }), _jsx("span", { className: "text-yellow-300/60 text-[11px]", children: towerName })] }));
    }
    // ── Builds tab: player selector ───────────────────────────────────
    function renderBuildsPanel() {
        return (_jsxs("div", { className: "flex-1 flex flex-col min-w-0 min-h-0", children: [_jsxs("div", { className: "flex items-center gap-1 mb-2", children: [participants.map((p, i) => (_jsx("button", { onClick: () => setSelectedBuildPlayer(i), className: cn("rounded-[3px] transition-all cursor-clicker ring-1", selectedBuildPlayer === i
                                ? "ring-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.2)] scale-110"
                                : "ring-white/5 opacity-50 hover:opacity-80"), children: _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${p.championName}.png`, className: "w-6 h-6 rounded-[3px]" }) }, p.puuid))), _jsx("span", { className: "ml-2 font-mono text-[10px] tracking-[0.15em] text-flash/30", children: participants[selectedBuildPlayer]?.riotIdGameName ?? "Unknown" })] }), _jsx(BuildPanel, { participantId: selectedBuildPlayer + 1, timeline: timeline, scrollRef: buildScrollRef })] }));
    }
    // ── Main render ───────────────────────────────────────────────────
    const isEventTab = activeTab !== "builds";
    return (_jsxs("div", { className: "mt-10", children: [_jsxs("h1", { className: "text-xl font-bold pb-2 mb-3 font-jetbrains uppercase text-flash/40 flex items-center gap-3", children: [_jsx("span", { className: "text-cyan-500/40 text-sm", children: "\u25C6" }), "Match Events"] }), _jsxs("div", { className: "flex gap-4", style: { height: MAP_SIZE }, children: [_jsxs("div", { className: "relative rounded-md overflow-hidden border border-cyan-500/10 shrink-0 shadow-[0_0_20px_rgba(34,211,238,0.04)]", style: { width: MAP_SIZE, height: MAP_SIZE }, children: [_jsx("img", { src: getMinimapUrl(), alt: "Summoner's Rift", className: "w-full h-full object-cover brightness-[0.55] contrast-[1.1]", draggable: false }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-[0.03]", style: {
                                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
                                } }), _jsx(TooltipProvider, { delayDuration: 0, children: filteredEvents.map((event, i) => renderDot(event, i)) })] }), _jsxs("div", { className: "flex-1 flex flex-col min-w-0 min-h-0", children: [_jsx(Tabs, { value: activeTab, onValueChange: handleTabChange, children: _jsxs(TabsList, { className: "bg-[#09090b] border border-cyan-500/10 w-fit shadow-[0_0_10px_rgba(34,211,238,0.03)]", children: [_jsxs(TabsTrigger, { value: "kills", className: "font-mono text-[10px] tracking-[0.15em] uppercase cursor-clicker data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_6px_rgba(34,211,238,0.15)]", children: ["Kills (", killCount, ")"] }), _jsxs(TabsTrigger, { value: "objectives", className: "font-mono text-[10px] tracking-[0.15em] uppercase cursor-clicker data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_6px_rgba(34,211,238,0.15)]", children: ["Obj (", objectiveCount, ")"] }), _jsxs(TabsTrigger, { value: "towers", className: "font-mono text-[10px] tracking-[0.15em] uppercase cursor-clicker data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_6px_rgba(34,211,238,0.15)]", children: ["Towers (", towerCount, ")"] }), _jsx(TabsTrigger, { value: "builds", className: "font-mono text-[10px] tracking-[0.15em] uppercase cursor-clicker data-[state=active]:text-cyan-300 data-[state=active]:shadow-[0_0_6px_rgba(34,211,238,0.15)]", children: "Builds" })] }) }), isEventTab ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex-1 mt-2 border border-cyan-500/[0.07] rounded-md bg-[#08080a] shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]", children: filteredEvents.length === 0 ? (_jsx("div", { className: "flex items-center justify-center h-full", children: _jsx("span", { className: "text-flash/15 font-mono text-[10px] tracking-[0.2em] uppercase", children: "No events" }) })) : (_jsx("div", { className: "divide-y divide-flash/[0.04]", children: paginatedEvents.map((event, j) => {
                                                const globalIndex = (currentPage - 1) * EVENTS_PER_PAGE + j;
                                                return renderEventRow(event, globalIndex);
                                            }) })) }), totalPages > 1 && (_jsxs("div", { className: "flex items-center justify-between mt-1.5 text-[10px] font-mono", children: [_jsx("button", { disabled: currentPage <= 1, onClick: () => { setCurrentPage(p => p - 1); setHoveredEventIndex(null); }, className: "px-2.5 py-0.5 rounded-sm border border-cyan-500/10 bg-[#09090b] text-flash/30 hover:text-cyan-300 hover:border-cyan-500/25 hover:shadow-[0_0_8px_rgba(34,211,238,0.1)] disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-clicker tracking-[0.15em]", children: "PREV" }), _jsxs("span", { className: "text-flash/20 tracking-[0.2em]", children: [currentPage, " / ", totalPages] }), _jsx("button", { disabled: currentPage >= totalPages, onClick: () => { setCurrentPage(p => p + 1); setHoveredEventIndex(null); }, className: "px-2.5 py-0.5 rounded-sm border border-cyan-500/10 bg-[#09090b] text-flash/30 hover:text-cyan-300 hover:border-cyan-500/25 hover:shadow-[0_0_8px_rgba(34,211,238,0.1)] disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-clicker tracking-[0.15em]", children: "NEXT" })] }))] })) : (
                            /* Builds panel */
                            _jsx("div", { className: "mt-2 flex-1 flex flex-col min-h-0", children: renderBuildsPanel() }))] })] })] }));
}
