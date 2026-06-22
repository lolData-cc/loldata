"use client";

// SummonerShowcase — pays off the hero's "look up any summoner" promise with
// the REAL product UI: an actual <MatchCard> (the same component the summoner
// and scout-lobby feeds render) fed a representative static match. Champion,
// rune, item and trinket art all stream from the live CDN, so this is the
// genuine card, not a mockup.

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
import { MatchCard, type MatchCardData } from "@/components/matchcard";

function openSearch() {
  window.dispatchEvent(new Event("open-search-dialog"));
}

// A representative ranked game — real champion names + item/rune IDs so the
// card pulls genuine art off the CDN exactly like it does in production.
const SAMPLE_MATCH: MatchCardData = {
  matchId: "HOMEPAGE_DEMO",
  queueLabel: "Ranked Solo",
  win: true,
  isRemake: false,
  gameDurationSeconds: 1742,
  gameCreationMs: Date.now() - 47 * 60 * 1000,
  championName: "Ahri",
  championLevel: 16,
  keystoneId: 8112, // Electrocute
  secondaryStyleId: 8200, // Sorcery
  kills: 11,
  deaths: 3,
  assists: 9,
  cs: 241,
  role: "MIDDLE",
  gold: 13980,
  items: [6655, 3020, 4645, 3089, 3157, 3135, 3363], // Luden's, Sorc boots, Shadowflame, Rabadon, Zhonya, Void, Farsight
  lpDelta: 22,
  highlightPuuid: "demo-me",
  allParticipants: [
    { puuid: "demo-me", summonerName: "you", riotTagline: "EUW", championName: "Ahri", teamId: 100, platform: "EUW1", win: true, kills: 11, deaths: 3, assists: 9 },
    { puuid: "b2", summonerName: "Renoodle", riotTagline: "EUW", championName: "LeeSin", teamId: 100, platform: "EUW1", win: true, kills: 6, deaths: 4, assists: 12 },
    { puuid: "b3", summonerName: "TopDiff", riotTagline: "EUW", championName: "Aatrox", teamId: 100, platform: "EUW1", win: true, kills: 8, deaths: 5, assists: 5 },
    { puuid: "b4", summonerName: "Critwitch", riotTagline: "EUW", championName: "Jinx", teamId: 100, platform: "EUW1", win: true, kills: 13, deaths: 2, assists: 7 },
    { puuid: "b5", summonerName: "Hookline", riotTagline: "EUW", championName: "Thresh", teamId: 100, platform: "EUW1", win: true, kills: 1, deaths: 4, assists: 21 },
    { puuid: "r1", summonerName: "ShadowStep", riotTagline: "EUW", championName: "Zed", teamId: 200, platform: "EUW1", win: false, kills: 7, deaths: 6, assists: 4 },
    { puuid: "r2", summonerName: "Vibecheck", riotTagline: "EUW", championName: "Vi", teamId: 200, platform: "EUW1", win: false, kills: 3, deaths: 8, assists: 8 },
    { puuid: "r3", summonerName: "Stonewall", riotTagline: "EUW", championName: "KSante", teamId: 200, platform: "EUW1", win: false, kills: 2, deaths: 5, assists: 6 },
    { puuid: "r4", summonerName: "Headshotz", riotTagline: "EUW", championName: "Caitlyn", teamId: 200, platform: "EUW1", win: false, kills: 9, deaths: 7, assists: 3 },
    { puuid: "r5", summonerName: "Pixiewish", riotTagline: "EUW", championName: "Lulu", teamId: 200, platform: "EUW1", win: false, kills: 0, deaths: 6, assists: 12 },
  ],
};

export function SummonerShowcase({ id }: { id?: string }) {
  return (
    <Showcase id={id} mock={<MatchCardMock />}>
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
          { icon: Swords, label: "Match history" },
          { icon: Crosshair, label: "Champion pools" },
          { icon: Radio, label: "Live games" },
          { icon: Users, label: "Scout lobbies" },
        ]}
      />
      <motion.div variants={up} className="pt-1">
        <GhostLink onClick={openSearch}>Search a summoner</GhostLink>
      </motion.div>
    </Showcase>
  );
}

function MatchCardMock() {
  return (
    <div
      className="relative mx-auto w-full max-w-[560px]"
      style={{ perspective: "850px" }}
    >
      {/* soft jade lift behind the real card */}
      <div
        aria-hidden
        className="absolute -inset-6 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 45%, rgba(0,217,146,0.10), transparent 75%)",
        }}
      />
      {/* Product-shot tilt: turn the genuine card a little on its Y axis so the
          LEFT edge sits DEEPER than the right (negative rotateY). Pivot a touch
          right of centre so the left side sinks back more. Settles into the
          angle on view. */}
      <motion.div
        className="relative will-change-transform"
        style={{ transformStyle: "preserve-3d", transformOrigin: "64% 50%" }}
        initial={{ rotateY: -30, rotateX: 6, opacity: 0 }}
        whileInView={{ rotateY: -16, rotateX: 3, opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.95, ease: EASE_BRAND }}
      >
        {/* depth shadow cast to the lower-left (the receding side) */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-lg"
          style={{
            transform: "translateZ(-60px)",
            boxShadow: "-46px 54px 96px -34px rgba(0,0,0,0.72)",
          }}
        />
        <ul className="list-none m-0 p-0 pointer-events-none select-none">
          <MatchCard data={SAMPLE_MATCH} />
        </ul>
        {/* glossy sheen — light raking from the upper-left, like a render */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-md mix-blend-screen"
          style={{
            background:
              "linear-gradient(110deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 22%, transparent 46%)",
          }}
        />
      </motion.div>
    </div>
  );
}
