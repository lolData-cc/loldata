"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// CoachShowcase — the live AI coach. Instead of a mockup we render the REAL
// analysis result cards (the same OverallStatsSection + ChampionPoolSection the
// PlayerAnalysisDialog shows after it crunches your games) fed a representative
// static PlayerAnalysisResult. Champion art streams from the live CDN.
import { motion } from "framer-motion";
import { CalendarCheck, Swords, Sparkles, MessagesSquare } from "lucide-react";
import { Showcase, Eyebrow, Headline, Hot, Lead, Bullets, GhostLink, up, } from "./showcase-kit";
import { OverallStatsSection, ChampionPoolSection, } from "@/components/PlayerAnalysisDialog";
// A representative analysis payload — only the fields the two cards read need
// to be realistic; the rest satisfy the type with neutral values.
const SAMPLE_ANALYSIS = {
    meta: { puuid: "demo", region: "EUW", matchesAnalyzed: 40 },
    roleDistribution: [
        { role: "MIDDLE", games: 29, pct: 72 },
        { role: "TOP", games: 7, pct: 18 },
        { role: "JUNGLE", games: 4, pct: 10 },
    ],
    primaryRole: "MIDDLE",
    isJungler: false,
    championPool: [
        { championName: "Ahri", games: 18, wins: 11, winrate: 61, avgKills: 7.4, avgDeaths: 3.9, avgAssists: 6.8, avgKda: 3.6, avgCsPerMin: 8.1 },
        { championName: "Syndra", games: 9, wins: 5, winrate: 56, avgKills: 6.2, avgDeaths: 4.1, avgAssists: 5.0, avgKda: 2.7, avgCsPerMin: 8.4 },
        { championName: "Orianna", games: 7, wins: 3, winrate: 43, avgKills: 4.8, avgDeaths: 4.6, avgAssists: 7.2, avgKda: 2.6, avgCsPerMin: 7.9 },
        { championName: "Viktor", games: 4, wins: 3, winrate: 75, avgKills: 6.0, avgDeaths: 3.0, avgAssists: 6.5, avgKda: 4.2, avgCsPerMin: 8.6 },
        { championName: "Zoe", games: 2, wins: 2, winrate: 100, avgKills: 8.0, avgDeaths: 2.5, avgAssists: 4.0, avgKda: 4.8, avgCsPerMin: 7.2 },
    ],
    overallStats: {
        games: 40, wins: 24, winrate: 60,
        avgKills: 7.2, avgDeaths: 4.1, avgAssists: 6.8, avgKda: 3.4,
        avgCsPerMin: 8.0, avgGoldPerMin: 412, avgKillParticipation: 58,
        avgDamageShare: 28, avgVisionPerMin: 0.9, avgSoloKills: 1.2,
    },
    winLossComparison: [
        { metric: "CS @14", onWin: 118, onLoss: 99, delta: 19 },
        { metric: "Vision", onWin: 24, onLoss: 17, delta: 7 },
        { metric: "Deaths", onWin: 3.1, onLoss: 5.4, delta: -2.3 },
    ],
    wardDistribution: { topside: 0, botside: 0, neutral: 0, totalWards: 0, topsidePct: 0, botsidePct: 0 },
    bootsDistribution: [],
    earlyGameAnalysis: {
        gamesWithTimeline: 0,
        aheadAtTen: { games: 0, wins: 0, winrate: 0 },
        behindAtTen: { games: 0, wins: 0, winrate: 0 },
        evenAtTen: { games: 0, wins: 0, winrate: 0 },
        avgKillDiffAtTen: 0, avgGoldDiffAtTen: 0, avgCsDiffAtTen: 0,
        firstBloodRate: 0, firstBloodWinrate: 0,
    },
    weaknesses: [],
    counterTips: [],
};
export function CoachShowcase({ id }) {
    return (_jsxs(Showcase, { id: id, flip: true, mock: _jsx(CoachMock, {}), children: [_jsx(Eyebrow, { children: "AI coach \u00B7 always on" }), _jsxs(Headline, { children: ["A coach that ", _jsx(Hot, { children: "never sleeps" }), "."] }), _jsxs(Lead, { children: ["It crunches every game, surfaces the patterns you'd miss, and lays your play bare \u2014 role split, champion pool, win-vs-loss deltas. Stuck mid-match? Ask the ", _jsx("span", { className: "text-flash/80", children: "24/7 chatbot" }), " ", "and get a straight answer."] }), _jsx(Bullets, { items: [
                    { icon: CalendarCheck, label: "Reports" },
                    { icon: Swords, label: "Matchups" },
                    { icon: Sparkles, label: "Items" },
                    { icon: MessagesSquare, label: "Chat" },
                ] }), _jsx(motion.div, { variants: up, className: "pt-1", children: _jsx(GhostLink, { href: "/learn", children: "See how it works" }) })] }));
}
function CoachMock() {
    return (_jsxs("div", { className: "relative mx-auto w-full max-w-[480px] space-y-3", children: [_jsx("div", { "aria-hidden": true, className: "absolute -inset-6 -z-10 opacity-60", style: {
                    background: "radial-gradient(ellipse 60% 55% at 50% 40%, rgba(0,217,146,0.10), transparent 75%)",
                } }), _jsx(OverallStatsSection, { data: SAMPLE_ANALYSIS }), _jsx(ChampionPoolSection, { data: SAMPLE_ANALYSIS })] }));
}
