"use client";

// SummonerShowcase — pays off the hero's "look up any summoner" promise.
// Copy on the left; a glass profile-card "device" on the right with a small
// Scout-lobby chip floating over its corner for depth. Pure CSS/SVG mock —
// no data fetch, no fragile champion art — so it always renders clean.

import { motion } from "framer-motion";
import {
  Swords,
  Crosshair,
  Radio,
  Users,
  Crown,
  Flame,
  Wind,
  Sparkles,
} from "lucide-react";
import {
  Showcase,
  Eyebrow,
  Headline,
  Hot,
  Lead,
  Bullets,
  GhostLink,
  GlassPanel,
  WLPill,
  ChampTile,
  stagger,
  up,
  upSm,
} from "./showcase-kit";

function openSearch() {
  window.dispatchEvent(new Event("open-search-dialog"));
}

const MATCHES = [
  { icon: Crown, name: "Katarina", kda: "12 / 3 / 8", win: true },
  { icon: Flame, name: "Akali", kda: "9 / 5 / 6", win: true },
  { icon: Wind, name: "Yasuo", kda: "4 / 7 / 9", win: false },
  { icon: Sparkles, name: "Ahri", kda: "8 / 2 / 11", win: true },
];

const SCOUT = [
  { rank: 1, name: "Zeus", lp: "+128", up: true },
  { rank: 2, name: "Mira", lp: "+74", up: true },
  { rank: 3, name: "Kano", lp: "−21", up: false },
];

export function SummonerShowcase({ id }: { id?: string }) {
  return (
    <Showcase id={id} mock={<ProfileMock />}>
      <Eyebrow>Summoner intelligence</Eyebrow>
      <Headline>
        Look up anyone.
        <br />
        See <Hot>everything</Hot>.
      </Headline>
      <Lead>
        Search any Riot ID for the whole picture — rank, recent form, champion
        pools and the duos they really climb with. Then spin up a{" "}
        <span className="text-flash/80">Scout lobby</span> to track a full squad,
        live, every game.
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

function ProfileMock() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <GlassPanel className="p-5 md:p-6">
        {/* header: avatar + name + rank */}
        <motion.div variants={stagger} className="flex items-center gap-3.5">
          <motion.div variants={upSm}>
            <span
              className="relative grid place-items-center w-14 h-14 rounded-full shrink-0"
              style={{
                background: "radial-gradient(circle at 35% 30%, rgba(0,217,146,0.35), rgba(4,10,12,0.9))",
                border: "1px solid rgba(0,217,146,0.4)",
                boxShadow: "0 0 22px rgba(0,217,146,0.3)",
              }}
            >
              <Crown size={22} className="text-jade" />
            </span>
          </motion.div>
          <motion.div variants={upSm} className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-chakrapetch font-bold text-flash text-[17px] truncate">Faker</span>
              <span className="font-jetbrains text-[12px] text-flash/35">#KR1</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="font-chakrapetch text-[12px] font-bold uppercase tracking-wider text-jade">
                Challenger
              </span>
              <span className="font-jetbrains text-[11px] text-flash/45">1,482 LP</span>
            </div>
          </motion.div>
          <motion.div variants={upSm} className="text-right shrink-0">
            <div className="font-chakrapetch font-bold text-flash text-[19px] leading-none">68%</div>
            <div className="font-jetbrains text-[10px] uppercase tracking-wider text-flash/40 mt-1">
              win rate
            </div>
          </motion.div>
        </motion.div>

        {/* winrate bar */}
        <motion.div variants={up} className="mt-4 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-jade"
            style={{ boxShadow: "0 0 12px rgba(0,217,146,0.6)" }}
            initial={{ width: 0 }}
            whileInView={{ width: "68%" }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          />
        </motion.div>

        {/* recent matches */}
        <motion.div variants={upSm} className="mt-5 mb-2 flex items-center justify-between">
          <span className="font-jetbrains text-[10px] uppercase tracking-[0.2em] text-flash/35">
            Recent
          </span>
          <span className="font-jetbrains text-[10px] text-jade/70">3W · 1L</span>
        </motion.div>
        <motion.ul variants={stagger} className="space-y-1.5">
          {MATCHES.map((m) => (
            <motion.li
              key={m.name}
              variants={upSm}
              className="flex items-center gap-3 rounded-[10px] px-2.5 py-2"
              style={{
                background: m.win ? "rgba(0,217,146,0.05)" : "rgba(255,98,134,0.05)",
                borderLeft: `2px solid ${m.win ? "rgba(0,217,146,0.5)" : "rgba(255,98,134,0.5)"}`,
              }}
            >
              <ChampTile icon={m.icon} size={30} win={m.win} />
              <span className="font-chakrapetch text-[13px] text-flash/85 flex-1 truncate">{m.name}</span>
              <span className="font-jetbrains text-[12px] text-flash/55 tabular-nums">{m.kda}</span>
              <WLPill win={m.win} />
            </motion.li>
          ))}
        </motion.ul>
      </GlassPanel>

      {/* floating Scout-lobby chip */}
      <motion.div
        variants={up}
        className="absolute -bottom-6 -right-3 sm:-right-6 w-[208px] hidden sm:block"
      >
        <GlassPanel className="p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <Users size={13} className="text-jade" />
            <span className="font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/45">
              Scout · The Squad
            </span>
          </div>
          <ul className="space-y-1.5">
            {SCOUT.map((s) => (
              <li key={s.rank} className="flex items-center gap-2.5">
                <span className="font-chakrapetch text-[12px] font-bold text-flash/30 w-3">{s.rank}</span>
                <span className="font-chakrapetch text-[13px] text-flash/80 flex-1 truncate">{s.name}</span>
                <span
                  className={
                    "font-jetbrains text-[11px] tabular-nums " +
                    (s.up ? "text-jade" : "text-[#ff6286]")
                  }
                >
                  {s.lp}
                </span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </motion.div>
    </div>
  );
}
