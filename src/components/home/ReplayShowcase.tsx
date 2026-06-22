"use client";

// ReplayShowcase — every match opens into a scrubable timeline on an
// interactive Rift. Instead of a mockup we render the REAL <RiftMap> (the same
// minimap the replay viewer uses) fed a representative static timeline frame:
// genuine champion sprites, a recent dragon-kill marker and a teamfight flash.
// Wrapped pointer-events-none so it's display-only (no scroll-hijack from the
// map's wheel-zoom) — the live, interactive version opens from any match card.

import { motion } from "framer-motion";
import { Clock, Gem, LineChart, ScrollText } from "lucide-react";
import {
  Showcase,
  Eyebrow,
  Headline,
  Hot,
  Lead,
  Bullets,
  GhostLink,
  up,
} from "./showcase-kit";
import { RiftMap } from "@/components/matchreplay/RiftMap";
import type {
  MatchTimeline,
  StaticMatch,
  StaticParticipant,
  ParticipantFrame,
} from "@/components/matchreplay/types";

function openSearch() {
  window.dispatchEvent(new Event("open-search-dialog"));
}

const NOW_MS = 900_000; // freeze the frame at 15:00

// champion roster (matches the Summoner showcase card for continuity) +
// a believable mid-game position in Riot's 0..15000 space.
const ROSTER: Array<{ pid: number; champ: string; team: 100 | 200; x: number; y: number }> = [
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

const EMPTY_HIDDEN: Set<number> = new Set();

function buildFrames(): MatchTimeline["info"]["frames"] {
  const participantFrames: Record<string, ParticipantFrame> = {};
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

const TIMELINE: MatchTimeline = {
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

function sp(r: (typeof ROSTER)[number]): StaticParticipant {
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

const STATIC_MATCH: StaticMatch = {
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

export function ReplayShowcase({ id }: { id?: string }) {
  return (
    <Showcase id={id} mock={<ReplayMock />}>
      <Eyebrow>Match replay</Eyebrow>
      <Headline>
        Replay every game.
        <br />
        <Hot>Frame by frame</Hot>.
      </Headline>
      <Lead>
        Every match opens onto the real Rift — champion positions, objectives,
        gold swings and teamfights — that you can scrub second by second. See{" "}
        <span className="text-flash/80">exactly</span> where games were won and
        lost.
      </Lead>
      <Bullets
        items={[
          { icon: Clock, label: "Timeline scrubber" },
          { icon: Gem, label: "Objectives" },
          { icon: LineChart, label: "Gold graph" },
          { icon: ScrollText, label: "Teamfight log" },
        ]}
      />
      <motion.div variants={up} className="pt-1">
        <GhostLink onClick={openSearch}>Find a match to replay</GhostLink>
      </motion.div>
    </Showcase>
  );
}

function ReplayMock() {
  return (
    <div className="relative mx-auto w-full max-w-[440px]">
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,217,146,0.10), transparent 75%)",
        }}
      />
      {/* the genuine replay minimap — display-only (pointer-events-none) so its
          wheel-zoom never steals the page scroll */}
      <div
        className="relative rounded-2xl overflow-hidden border border-jade/15 pointer-events-none select-none"
        style={{ boxShadow: "0 40px 90px -50px rgba(0,217,146,0.30)" }}
      >
        <RiftMap
          timeline={TIMELINE}
          staticMatch={STATIC_MATCH}
          timeMs={NOW_MS}
          focusedPid={null}
          hiddenPids={EMPTY_HIDDEN}
        />
      </div>
    </div>
  );
}
