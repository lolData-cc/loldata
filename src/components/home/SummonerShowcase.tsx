"use client";

// SummonerShowcase — pays off the hero's "look up any summoner" promise with
// the REAL product UI: a short stack of actual <MatchCard>s (the same component
// the summoner / scout feeds render) fed representative static matches. Champion,
// rune, item and trinket art all stream from the live CDN. The stack is tilted
// like an advertising product shot (left edge deeper than the right) and the
// cards slide up into place one at a time on scroll.

import { motion } from "framer-motion";
import { Swords, Crosshair, Radio, Users } from "lucide-react";
import {
  Showcase,
  Eyebrow,
  Headline,
  Hot,
  Lead,
  Bullets,
  GhostLink,
  up,
  EASE_BRAND,
} from "./showcase-kit";
import {
  MatchCard,
  type MatchCardData,
  type ScoreboardParticipant,
} from "@/components/matchcard";

function openSearch() {
  window.dispatchEvent(new Event("open-search-dialog"));
}

// A believable 10-player scoreboard for a given game: the searched player sits
// on blue (team 100) in slot 0; allies share their result, enemies the inverse.
function mkRoster(
  mainChamp: string,
  k: number,
  d: number,
  a: number,
  win: boolean
): ScoreboardParticipant[] {
  const W = win;
  const L = !win;
  const p = (
    puuid: string,
    summonerName: string,
    championName: string,
    teamId: 100 | 200,
    w: boolean,
    kills: number,
    deaths: number,
    assists: number
  ): ScoreboardParticipant => ({
    puuid,
    summonerName,
    riotTagline: "EUW",
    championName,
    teamId,
    platform: "EUW1",
    win: w,
    kills,
    deaths,
    assists,
  });
  return [
    p("me", "you", mainChamp, 100, W, k, d, a),
    p("a1", "Renoodle", "Graves", 100, W, 6, 4, 12),
    p("a2", "TopDiff", "Aatrox", 100, W, 8, 5, 5),
    p("a3", "Critwitch", "Jinx", 100, W, 11, 3, 7),
    p("a4", "Hookline", "Thresh", 100, W, 1, 5, 18),
    p("e1", "ShadowStep", "Zed", 200, L, 7, 6, 4),
    p("e2", "Vibecheck", "Vi", 200, L, 3, 8, 8),
    p("e3", "Stonewall", "KSante", 200, L, 2, 5, 6),
    p("e4", "Headshotz", "Caitlyn", 200, L, 9, 7, 3),
    p("e5", "Pixiewish", "Lulu", 200, L, 0, 6, 12),
  ];
}

// Three representative ranked games — real champion + item/rune IDs so the cards
// pull genuine art off the CDN exactly like in production.
const MATCHES: MatchCardData[] = [
  {
    matchId: "DEMO1", queueLabel: "Ranked Solo", win: true, isRemake: false,
    gameDurationSeconds: 1742, gameCreationMs: Date.now() - 47 * 60_000,
    championName: "Ahri", championLevel: 16, keystoneId: 8112, secondaryStyleId: 8200,
    kills: 11, deaths: 3, assists: 9, cs: 241, role: "MIDDLE", gold: 13980,
    items: [6655, 3020, 4645, 3089, 3157, 3135, 3363], lpDelta: 22,
    highlightPuuid: "me", allParticipants: mkRoster("Ahri", 11, 3, 9, true),
  },
  {
    matchId: "DEMO2", queueLabel: "Ranked Solo", win: false, isRemake: false,
    gameDurationSeconds: 1980, gameCreationMs: Date.now() - 122 * 60_000,
    championName: "Yasuo", championLevel: 15, keystoneId: 8010, secondaryStyleId: 8100,
    kills: 8, deaths: 9, assists: 6, cs: 233, role: "TOP", gold: 12100,
    items: [6672, 3006, 3031, 3046, 3072, 3026, 3363], lpDelta: -17,
    highlightPuuid: "me", allParticipants: mkRoster("Yasuo", 8, 9, 6, false),
  },
  {
    matchId: "DEMO3", queueLabel: "Ranked Solo", win: true, isRemake: false,
    gameDurationSeconds: 1655, gameCreationMs: Date.now() - 185 * 60_000,
    championName: "LeeSin", championLevel: 14, keystoneId: 8010, secondaryStyleId: 8400,
    kills: 9, deaths: 4, assists: 13, cs: 176, role: "JUNGLE", gold: 12400,
    items: [3071, 3047, 6333, 3074, 3053, 3026, 3364], lpDelta: 25,
    highlightPuuid: "me", allParticipants: mkRoster("LeeSin", 9, 4, 13, true),
  },
];

export function SummonerShowcase({ id }: { id?: string }) {
  return (
    <Showcase id={id} mock={<MatchCardStack />}>
      <Eyebrow>Summoner intelligence</Eyebrow>
      <Headline>
        Look up anyone.
        <br />
        See <Hot>everything</Hot>.
      </Headline>
      <Lead>
        Search any Riot ID for the whole picture — every game broken down to
        runes, items, KDA and the full scoreboard. Then spin up a{" "}
        <span className="text-flash/80">Scout lobby</span> to track a whole squad,
        live, every match.
      </Lead>
      <Bullets
        items={[
          { icon: Swords, label: "Matches" },
          { icon: Crosshair, label: "Champions" },
          { icon: Radio, label: "Live" },
          { icon: Users, label: "Scout" },
        ]}
      />
      <motion.div variants={up} className="pt-1">
        <GhostLink onClick={openSearch}>Search a summoner</GhostLink>
      </motion.div>
    </Showcase>
  );
}

function MatchCardStack() {
  return (
    // Reveal is triggered from THIS untransformed wrapper (reliable
    // IntersectionObserver) and staggered down into the tilted deck. Unique
    // "off"/"on" labels so it never clashes with the section's hidden/show.
    <motion.div
      className="relative mx-auto w-full max-w-[600px]"
      style={{ perspective: "1000px" }}
      initial="off"
      whileInView="on"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ off: {}, on: {} }}
    >
      {/* soft jade lift behind the deck */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 55% 45%, rgba(0,217,146,0.10), transparent 75%)",
        }}
      />
      {/* Stack the cards FLAT (2D), then tilt the WHOLE DECK as one rigid box —
          a SINGLE rotateY here. Every card lives on the exact same tilted plane,
          so they cannot possibly differ in angle (one transform, on the box,
          not on the cards). This div also staggers the cards' slide-up. */}
      <motion.div
        className="relative space-y-4 md:[transform:rotateY(-15deg)] md:[transform-origin:62%_50%]"
        variants={{ off: {}, on: { transition: { staggerChildren: 0.13 } } }}
      >
        {MATCHES.map((m, i) => (
          // Flat cards (no per-card tilt) — each just slides itself up on
          // reveal, one after another.
          <motion.div
            key={i}
            className="will-change-transform"
            variants={{
              off: { opacity: 0, y: 40 },
              on: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_BRAND } },
            }}
          >
            <div className="relative">
              <ul className="list-none m-0 p-0 pointer-events-none select-none">
                <MatchCard data={m} />
              </ul>
              {/* glossy sheen — light raking from the upper-left, like a render */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none rounded-md mix-blend-screen"
                style={{
                  background:
                    "linear-gradient(110deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 22%, transparent 46%)",
                }}
              />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
