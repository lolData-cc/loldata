import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/matchreplay/EventLog.tsx
//
// The narrative event log. Every line reads like a play-by-play caption
// rather than a wall of icons, because this is the piece the user said
// is the most important — they want to scan it and understand what
// happened at a glance.
//
// Row anatomy:
//   ┌────────────────────────────────────────────────────────────────┐
//   │ 12:34  [KILL]  ⓒViego killed ⓒPantheon · +Lee Sin · +400g shut │
//   └────────────────────────────────────────────────────────────────┘
//
// The leftmost time chip is fixed-width so columns align across rows.
// The type tag chip is color-coded per category (kill / objective /
// building / item / ward / lifecycle). The narrative sentence has
// inline champion icons next to player names and shows a small jade
// chip when the row is *new* (most recent 3 seconds of playback).
import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { eventsUpTo, fmtClock, staticParticipantByPid, teamOf } from "./derive";
import { dragonColor } from "./eventIcons";
const DEFAULT_FILTERS = {
    kills: true, objs: true, buildings: true, items: false, wards: false,
};
export function EventLog({ timeline, staticMatch, timeMs, onSeek, onFocusPid }) {
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const listRef = useRef(null);
    const lastFollowedTsRef = useRef(0);
    const [autoFollow, setAutoFollow] = useState(true);
    const events = useMemo(() => {
        const all = eventsUpTo(timeline, timeMs);
        return all.filter((e) => {
            if (!filters.kills && (e.type === "CHAMPION_KILL" || e.type === "CHAMPION_SPECIAL_KILL"))
                return false;
            if (!filters.objs && e.type === "ELITE_MONSTER_KILL")
                return false;
            if (!filters.buildings && (e.type === "BUILDING_KILL" || e.type === "TURRET_PLATE_DESTROYED"))
                return false;
            if (!filters.items && (e.type === "ITEM_PURCHASED" || e.type === "ITEM_SOLD"))
                return false;
            if (!filters.wards && (e.type === "WARD_PLACED" || e.type === "WARD_KILL"))
                return false;
            // Always hide noise:
            if (e.type === "SKILL_LEVEL_UP" || e.type === "LEVEL_UP" ||
                e.type === "ITEM_DESTROYED" || e.type === "ITEM_UNDO" ||
                e.type === "PAUSE_END" || e.type === "PAUSE_START" ||
                e.type === "OBJECTIVE_BOUNTY_START" || e.type === "OBJECTIVE_BOUNTY_END" ||
                e.type === "OBJECTIVE_BOUNTY_FINISH")
                return false;
            return true;
        });
    }, [timeline, timeMs, filters]);
    // Auto-scroll to the bottom on new events.
    useEffect(() => {
        if (!autoFollow)
            return;
        const last = events[events.length - 1];
        if (!last)
            return;
        if (last.timestamp === lastFollowedTsRef.current)
            return;
        lastFollowedTsRef.current = last.timestamp;
        const el = listRef.current;
        if (el)
            el.scrollTop = el.scrollHeight;
    }, [events, autoFollow]);
    return (_jsxs("div", { className: "flex flex-col h-full min-h-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2.5 flex-wrap shrink-0", children: [_jsx("span", { className: "text-[10px] font-mono uppercase tracking-[0.22em] text-flash/60", children: "Event Log" }), _jsx("span", { className: "text-[10px] font-mono tabular-nums text-flash/35", children: events.length }), _jsx("div", { className: "flex items-center gap-1 ml-2", children: ["kills", "objs", "buildings", "items", "wards"].map((f) => (_jsx("button", { type: "button", onClick: () => setFilters((p) => ({ ...p, [f]: !p[f] })), className: cn("px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-all cursor-clicker rounded-sm", filters[f]
                                ? "text-jade bg-jade/10 ring-1 ring-jade/30"
                                : "text-flash/40 ring-1 ring-flash/10 hover:text-flash/65"), children: f }, f))) }), _jsx("button", { type: "button", onClick: () => setAutoFollow((p) => !p), className: cn("ml-auto px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-all cursor-clicker rounded-sm", autoFollow
                            ? "text-jade bg-jade/10 ring-1 ring-jade/30"
                            : "text-flash/40 ring-1 ring-flash/10 hover:text-flash/65"), children: autoFollow ? "● follow" : "○ follow" })] }), _jsxs("div", { ref: listRef, className: "flex-1 min-h-0 overflow-y-auto cyber-scrollbar pr-1 space-y-1", children: [events.length === 0 && (_jsx("div", { className: "text-flash/30 text-[12px] font-geist italic mt-4 text-center", children: "No events yet \u2014 let the replay play" })), events.map((e, i) => (_jsx(EventRow, { e: e, now: timeMs, onSeek: onSeek, onFocusPid: onFocusPid, staticMatch: staticMatch }, `${e._frame}-${e.timestamp}-${i}`)))] })] }));
}
// ─── Single row ─────────────────────────────────────────────────────
const RECENT_MS = 3500;
function EventRow({ e, now, onSeek, onFocusPid, staticMatch, }) {
    const sp = (pid) => pid && pid >= 1 && pid <= 10 ? staticParticipantByPid(staticMatch, pid) : null;
    const champName = (pid) => sp(pid)?.championName ?? null;
    const playerName = (pid) => sp(pid)?.riotIdGameName ?? sp(pid)?.summonerName ?? "—";
    // Builders
    const champ = (pid) => pid ? (_jsx(ChampInline, { pid: pid, name: champName(pid) ?? undefined, onClick: () => onFocusPid?.(pid) })) : null;
    const teamWord = (teamId, capitalize = true) => teamId === 100 ? (capitalize ? "Blue" : "blue") : (capitalize ? "Red" : "red");
    const teamTint = (teamId) => (teamId === 100 ? "#5BA8E6" : "#d63336");
    let tag = null;
    let body = null;
    if (e.type === "CHAMPION_KILL") {
        const killer = e.killerId && e.killerId > 0 ? e.killerId : null;
        const victim = e.victimId;
        const assistIds = (e.assistingParticipantIds ?? []).filter((x) => x > 0);
        tag = killer
            ? { label: "kill", tint: teamTint(teamOf(killer)), bg: teamOf(killer) === 100 ? "bg-[#5BA8E6]/12" : "bg-[#d63336]/12" }
            : { label: "exec", tint: "rgba(255,255,255,0.45)", bg: "bg-flash/[0.04]" };
        body = (_jsxs(_Fragment, { children: [killer ? (_jsxs(_Fragment, { children: [champ(killer), " ", _jsx("span", { className: "text-flash/85", children: "killed" }), " ", champ(victim)] })) : (_jsxs(_Fragment, { children: [champ(victim), " ", _jsx("span", { className: "text-flash/55", children: "was executed" })] })), assistIds.length > 0 && (_jsxs("span", { className: "text-flash/45 ml-1", children: ["\u00B7 assist ", assistIds.slice(0, 3).map((aid, i) => (_jsxs(React.Fragment, { children: [i > 0 && _jsx("span", { className: "text-flash/30", children: ", " }), _jsx("span", { className: "inline-flex items-center align-middle gap-0.5", children: champ(aid) })] }, aid))), assistIds.length > 3 && _jsxs("span", { children: [" +", assistIds.length - 3] })] })), !!e.shutdownBounty && (_jsxs("span", { className: "ml-2 text-citrine font-mono tabular-nums text-[10px]", children: ["+", e.shutdownBounty, "g shutdown"] })), !e.shutdownBounty && !!e.bounty && (_jsxs("span", { className: "ml-2 text-citrine/70 font-mono tabular-nums text-[10px]", children: ["+", e.bounty, "g"] }))] }));
    }
    else if (e.type === "CHAMPION_SPECIAL_KILL") {
        tag = { label: "epic", tint: "#FFB615", bg: "bg-citrine/15" };
        const headline = e.killType === "KILL_FIRST_BLOOD" ? "First Blood!" :
            e.killType === "KILL_ACE" ? "ACE — team wiped!" :
                e.killType === "KILL_MULTI" ? `${e.multiKillLength ?? 2}× Multi-Kill` : "Special kill";
        body = (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-citrine font-bold tracking-wide", children: headline }), e.killerId && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-flash/55 ml-1", children: "drawn by" }), " ", champ(e.killerId)] }))] }));
    }
    else if (e.type === "ELITE_MONSTER_KILL") {
        const team = e.killerTeamId === 100 || e.killerTeamId === 200 ? e.killerTeamId : null;
        const tint = e.monsterType === "DRAGON" ? dragonColor(e.monsterSubType) :
            e.monsterType === "BARON_NASHOR" ? "#9b59b6" :
                e.monsterType === "RIFTHERALD" ? "#a07242" :
                    e.monsterType === "HORDE" ? "#7f8c8d" :
                        e.monsterType === "ATAKHAN" ? "#f1c40f" :
                            "#ffffff";
        const objLabel = e.monsterType === "DRAGON"
            ? `${e.monsterSubType?.replace("_DRAGON", "")?.toLowerCase() ?? "Drake"} Drake`
            : e.monsterType === "BARON_NASHOR" ? "Baron Nashor"
                : e.monsterType === "RIFTHERALD" ? "Rift Herald"
                    : e.monsterType === "HORDE" ? "Voidgrub"
                        : e.monsterType === "ATAKHAN" ? "Atakhan"
                            : "Objective";
        tag = { label: "obj", tint, bg: "bg-flash/[0.04]" };
        body = (_jsxs(_Fragment, { children: [team ? (_jsx("span", { style: { color: teamTint(team) }, className: "font-semibold", children: teamWord(team) })) : (_jsx("span", { className: "text-flash/55", children: "Someone" })), " ", _jsx("span", { className: "text-flash/70", children: "secured" }), " ", _jsx("span", { style: { color: tint }, className: "font-semibold capitalize", children: objLabel }), e.killerId && (_jsxs("span", { className: "text-flash/45 ml-1", children: ["\u00B7 last hit ", champ(e.killerId)] }))] }));
    }
    else if (e.type === "BUILDING_KILL") {
        const winner = e.teamId === 100 ? 200 : e.teamId === 200 ? 100 : 0;
        const tint = winner ? teamTint(winner) : "rgba(255,255,255,0.45)";
        const isInhib = e.buildingType === "INHIBITOR_BUILDING";
        const towerLabel = e.towerType?.replace("_TURRET", "")?.toLowerCase() ?? "";
        const lane = e.laneType?.replace("_LANE", "")?.toLowerCase() ?? "";
        tag = isInhib
            ? { label: "inhib", tint, bg: "bg-jade/[0.06]" }
            : { label: "tower", tint, bg: "bg-flash/[0.04]" };
        body = (_jsxs(_Fragment, { children: [winner ? (_jsx("span", { style: { color: tint }, className: "font-semibold", children: teamWord(winner) })) : (_jsx("span", { className: "text-flash/55", children: "Someone" })), " ", _jsx("span", { className: "text-flash/70", children: "destroyed the" }), " ", _jsx("span", { style: { color: tint }, className: "font-semibold", children: isInhib ? `${lane} inhibitor` : `${towerLabel} ${lane} tower`.trim() }), e.killerId && e.killerId > 0 && (_jsxs("span", { className: "text-flash/45 ml-1", children: ["\u00B7 ", champ(e.killerId)] }))] }));
    }
    else if (e.type === "TURRET_PLATE_DESTROYED") {
        const winner = e.teamId === 100 ? 200 : e.teamId === 200 ? 100 : 0;
        const tint = winner ? teamTint(winner) : "rgba(255,255,255,0.45)";
        const lane = e.laneType?.replace("_LANE", "")?.toLowerCase() ?? "";
        tag = { label: "plate", tint: "#FFB615", bg: "bg-citrine/[0.06]" };
        body = (_jsxs(_Fragment, { children: [winner && (_jsx("span", { style: { color: tint }, className: "font-semibold", children: teamWord(winner) })), " ", _jsx("span", { className: "text-flash/70", children: "cracked a turret plate" }), " ", _jsxs("span", { className: "text-flash/50", children: ["(", lane, ")"] })] }));
    }
    else if (e.type === "ITEM_PURCHASED") {
        tag = { label: "item", tint: "#FFB615", bg: "bg-citrine/[0.04]" };
        body = (_jsxs(_Fragment, { children: [champ(e.participantId), " ", _jsx("span", { className: "text-flash/65", children: "picked up" }), e.itemId ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${e.itemId}.png`, alt: "", className: "inline-block w-4 h-4 mx-1 align-middle rounded-sm ring-1 ring-flash/10" })) : null, _jsxs("span", { className: "text-flash/45 text-[10px]", children: ["\u2014 ", playerName(e.participantId)] })] }));
    }
    else if (e.type === "ITEM_SOLD") {
        tag = { label: "sold", tint: "rgba(255,255,255,0.45)", bg: "bg-flash/[0.03]" };
        body = (_jsxs(_Fragment, { children: [champ(e.participantId), " ", _jsx("span", { className: "text-flash/65", children: "sold" }), e.itemId ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${e.itemId}.png`, alt: "", className: "inline-block w-4 h-4 mx-1 align-middle rounded-sm ring-1 ring-flash/10 opacity-60 grayscale" })) : null] }));
    }
    else if (e.type === "WARD_PLACED") {
        tag = { label: "ward", tint: "#00d992", bg: "bg-jade/[0.06]" };
        const wardName = (e.wardType ?? "ward")
            .replace("_TRINKET", " trinket")
            .replace("_WARD", " ward")
            .replace("TEEMO_MUSHROOM", "Teemo shroom")
            .toLowerCase();
        body = (_jsxs(_Fragment, { children: [champ(e.creatorId), " ", _jsx("span", { className: "text-flash/65", children: "placed a" }), " ", _jsx("span", { className: "text-jade/85 lowercase", children: wardName })] }));
    }
    else if (e.type === "WARD_KILL") {
        tag = { label: "vision", tint: "rgba(255,255,255,0.55)", bg: "bg-flash/[0.04]" };
        body = (_jsxs(_Fragment, { children: [champ(e.killerId), " ", _jsx("span", { className: "text-flash/65", children: "killed an enemy ward" })] }));
    }
    else if (e.type === "GAME_END") {
        const win = e.winningTeam ?? 0;
        const tint = win === 100 ? "#5BA8E6" : "#d63336";
        tag = { label: "end", tint: "#00d992", bg: "bg-jade/12" };
        body = (_jsxs("span", { className: "font-semibold", children: [_jsxs("span", { style: { color: tint }, children: ["Team ", win === 100 ? "Blue" : "Red"] }), " ", _jsx("span", { className: "text-flash/80", children: "wins the game" })] }));
    }
    else {
        return null;
    }
    const isRecent = now - e.timestamp <= RECENT_MS;
    return (_jsxs("button", { type: "button", onClick: () => onSeek(e.timestamp), className: cn("w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm transition-all cursor-clicker", "hover:bg-jade/[0.06] hover:translate-x-[1px]", isRecent ? "bg-jade/[0.05] ring-1 ring-jade/15" : ""), children: [_jsx("span", { className: "shrink-0 w-11 text-right text-[12px] font-mono tabular-nums text-flash/55 tracking-[0.05em]", children: fmtClock(e.timestamp) }), tag && (_jsx("span", { className: cn("shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] rounded-sm min-w-[44px] text-center", tag.bg), style: { color: tag.tint, boxShadow: `inset 0 0 0 1px ${tag.tint}40` }, children: tag.label })), _jsx("div", { className: "flex-1 min-w-0 text-[13px] font-geist leading-snug truncate text-flash/90", children: body }), isRecent && (_jsx("span", { className: "shrink-0 w-1.5 h-1.5 rounded-full bg-jade animate-pulse" }))] }));
}
// ─── Champion inline chip (icon + name) ──────────────────────────────
function ChampInline({ pid, name, onClick, }) {
    if (!name)
        return null;
    const tint = teamOf(pid) === 100 ? "#5BA8E6" : "#d63336";
    return (_jsxs("span", { onClick: (e) => { e.stopPropagation(); onClick?.(); }, className: "inline-flex items-center gap-1 align-middle cursor-clicker hover:underline", style: { color: tint }, children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(name)}.png`, alt: name, className: "w-4 h-4 rounded-full ring-1", style: { boxShadow: `0 0 0 1px ${tint}88` } }), _jsx("span", { className: "font-chakrapetch font-medium", children: name })] }));
}
