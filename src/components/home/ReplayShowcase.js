"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ReplayShowcase — every match opens into a scrubable timeline on an
// interactive Rift. Instead of a mockup we render the REAL <RiftMap> (the same
// minimap the replay viewer uses) fed a representative static timeline frame:
// genuine champion sprites, a recent dragon-kill marker and a teamfight flash.
// Wrapped pointer-events-none so it's display-only (no scroll-hijack from the
// map's wheel-zoom) — the live, interactive version opens from any match card.
import { motion } from "framer-motion";
import { Clock, Gem, LineChart, ScrollText } from "lucide-react";
import { Showcase, Eyebrow, Headline, Hot, Lead, Bullets, GhostLink, up, } from "./showcase-kit";
import { RiftMap } from "@/components/matchreplay/RiftMap";
function openSearch() {
    window.dispatchEvent(new Event("open-search-dialog"));
}
const NOW_MS = 900_000; // freeze the frame at 15:00
// champion roster (matches the Summoner showcase card for continuity) +
// a believable mid-game position in Riot's 0..15000 space.
const ROSTER = [
    { pid: 1, champ: "Ahri", team: 100, x: 8600, y: 6400 },
    { pid: 2, champ: "LeeSin", team: 100, x: 9600, y: 5200 },
    { pid: 3, champ: "Aatrox", team: 100, x: 3200, y: 11200 },
    { pid: 4, champ: "Jinx", team: 100, x: 11200, y: 3600 },
    { pid: 5, champ: "Thresh", team: 100, x: 10400, y: 4200 },
    { pid: 6, champ: "Zed", team: 200, x: 9000, y: 6000 },
    { pid: 7, champ: "Vi", team: 200, x: 9900, y: 5600 },
    { pid: 8, champ: "KSante", team: 200, x: 4400, y: 11800 },
    { pid: 9, champ: "Caitlyn", team: 200, x: 12200, y: 4100 },
    { pid: 10, champ: "Lulu", team: 200, x: 11400, y: 4700 },
];
const EMPTY_HIDDEN = new Set();
function buildFrames() {
    const participantFrames = {};
    for (const r of ROSTER) {
        participantFrames[String(r.pid)] = {
            participantId: r.pid,
            position: { x: r.x, y: r.y },
            level: 13,
            xp: 11800,
            currentGold: 720,
            totalGold: 9100,
            minionsKilled: 132,
            jungleMinionsKilled: 6,
            championStats: {},
            damageStats: {},
        };
    }
    return [
        {
            timestamp: NOW_MS,
            participantFrames,
            // events kept off the recent-flash window so the frame reads as a calm,
            // static snapshot on the homepage (no perpetual pulsing) — the live
            // viewer animates them as you scrub.
            events: [
                { type: "CHAMPION_KILL", timestamp: NOW_MS - 180_000, killerId: 2, victimId: 6, position: { x: 9300, y: 5600 } },
                { type: "ELITE_MONSTER_KILL", timestamp: NOW_MS - 180_000, killerId: 2, killerTeamId: 100, monsterType: "DRAGON", monsterSubType: "FIRE_DRAGON", position: { x: 9866, y: 4414 } },
            ],
        },
    ];
}
const TIMELINE = {
    metadata: {
        dataVersion: "2",
        matchId: "HOMEPAGE_DEMO",
        participants: ROSTER.map((r) => `puuid-${r.pid}`),
    },
    info: {
        frameInterval: 60_000,
        participants: ROSTER.map((r) => ({ participantId: r.pid, puuid: `puuid-${r.pid}` })),
        frames: buildFrames(),
    },
};
function sp(r) {
    return {
        puuid: `puuid-${r.pid}`,
        participantId: r.pid,
        teamId: r.team,
        championId: 0,
        championName: r.champ,
        summoner1Id: 4,
        summoner2Id: 14,
        champLevel: 13,
        kills: 5,
        deaths: 3,
        assists: 7,
        totalDamageDealtToChampions: 14000,
        goldEarned: 9100,
        totalMinionsKilled: 132,
        neutralMinionsKilled: 6,
        item0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 0,
        win: r.team === 100,
    };
}
const STATIC_MATCH = {
    metadata: { matchId: "HOMEPAGE_DEMO" },
    info: {
        gameDuration: 1742,
        queueId: 420,
        participants: ROSTER.map(sp),
        teams: [
            { teamId: 100, win: true, bans: [] },
            { teamId: 200, win: false, bans: [] },
        ],
    },
};
export function ReplayShowcase({ id }) {
    return (_jsxs(Showcase, { id: id, mock: _jsx(ReplayMock, {}), children: [_jsx(Eyebrow, { children: "Match replay" }), _jsxs(Headline, { children: ["Replay every game.", _jsx("br", {}), _jsx(Hot, { children: "Frame by frame" }), "."] }), _jsxs(Lead, { children: ["Every match opens onto the real Rift \u2014 champion positions, objectives, gold swings and teamfights \u2014 that you can scrub second by second. See", " ", _jsx("span", { className: "text-flash/80", children: "exactly" }), " where games were won and lost."] }), _jsx(Bullets, { items: [
                    { icon: Clock, label: "Timeline" },
                    { icon: Gem, label: "Drakes" },
                    { icon: LineChart, label: "Gold" },
                    { icon: ScrollText, label: "Fights" },
                ] }), _jsx(motion.div, { variants: up, className: "pt-1", children: _jsx(GhostLink, { onClick: openSearch, children: "Find a match to replay" }) })] }));
}
function ReplayMock() {
    return (_jsxs("div", { className: "relative mx-auto w-full max-w-[440px]", children: [_jsx("div", { "aria-hidden": true, className: "absolute -inset-6 -z-10 opacity-60", style: {
                    background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,217,146,0.10), transparent 75%)",
                } }), _jsx("div", { className: "relative rounded-2xl overflow-hidden border border-jade/15 pointer-events-none select-none", style: { boxShadow: "0 40px 90px -50px rgba(0,217,146,0.30)" }, children: _jsx(RiftMap, { timeline: TIMELINE, staticMatch: STATIC_MATCH, timeMs: NOW_MS, focusedPid: null, hiddenPids: EMPTY_HIDDEN }) })] }));
}
