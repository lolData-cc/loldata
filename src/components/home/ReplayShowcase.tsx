"use client";

// ReplayShowcase — every match opens into a scrubable timeline on an
// interactive Rift. Copy on the left; a glass "replay" device on the right:
// a stylised SR with pulsing champion blips, a playback scrubber with event
// markers, and a one-line event log.

import { motion } from "framer-motion";
import { Play, Clock, Gem, Swords, LineChart, ScrollText } from "lucide-react";
import {
  Showcase,
  Eyebrow,
  Headline,
  Hot,
  Lead,
  Bullets,
  GhostLink,
  GlassPanel,
  stagger,
  up,
  upSm,
} from "./showcase-kit";

function openSearch() {
  window.dispatchEvent(new Event("open-search-dialog"));
}

// champion blips on the mini-map (viewBox 0..100), jade = blue side, red = red side
const BLIPS = [
  { x: 20, y: 62, red: false },
  { x: 22, y: 40, red: false },
  { x: 44, y: 56, red: false },
  { x: 56, y: 78, red: false },
  { x: 47, y: 49, red: false },
  { x: 80, y: 40, red: true },
  { x: 78, y: 60, red: true },
  { x: 58, y: 44, red: true },
  { x: 44, y: 22, red: true },
  { x: 53, y: 53, red: true },
];

// event markers along the scrubber (percent of game length)
const MARKERS = [12, 28, 41, 60, 74];

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
        Every match opens into a full timeline — positions, objectives, gold
        swings and teamfights — on an interactive Rift you can scrub second by
        second. See <span className="text-flash/80">exactly</span> where games
        were won and lost.
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
    <div className="relative mx-auto w-full max-w-[460px]">
      <GlassPanel className="p-5 md:p-6">
        {/* top bar: live-ish label + clock */}
        <motion.div variants={upSm} className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-2 font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/45">
            <Swords size={12} className="text-jade" />
            Ranked Solo · 24:48
          </span>
          <span className="font-jetbrains text-[11px] text-jade/80 tabular-nums">14:32</span>
        </motion.div>

        {/* mini Summoner's Rift */}
        <motion.div variants={up} className="relative rounded-xl overflow-hidden">
          <svg viewBox="0 0 100 100" className="w-full block" style={{ background: "rgba(2,6,7,0.6)" }}>
            {/* map bounds */}
            <rect x="6" y="6" width="88" height="88" rx="10" fill="none" stroke="rgba(0,217,146,0.18)" />
            {/* lanes */}
            <g stroke="rgba(215,216,217,0.10)" strokeWidth="3.5" fill="none" strokeLinecap="round">
              <path d="M18 82 L18 18 L82 18" />
              <path d="M18 82 L82 82 L82 18" />
              <path d="M18 82 L82 18" />
            </g>
            {/* river band (perpendicular to mid) */}
            <path d="M16 30 L70 84" stroke="rgba(0,150,255,0.07)" strokeWidth="9" strokeLinecap="round" />
            {/* bases */}
            <circle cx="18" cy="82" r="5.5" fill="rgba(0,217,146,0.20)" stroke="rgba(0,217,146,0.6)" strokeWidth="1" />
            <circle cx="82" cy="18" r="5.5" fill="rgba(255,98,134,0.18)" stroke="rgba(255,98,134,0.6)" strokeWidth="1" />

            {/* objective — Dragon (pulsing citrine) */}
            <motion.circle
              cx="66" cy="64" r="3"
              fill="#FFB615"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: [0.4, 1, 0.4], r: [3, 3.6, 3] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* champion blips */}
            {BLIPS.map((b, i) => {
              const color = b.red ? "#ff6286" : "#00d992";
              return (
                <g key={i}>
                  <circle cx={b.x} cy={b.y} r="4.4" fill={color} opacity="0.16" />
                  <motion.circle
                    cx={b.x}
                    cy={b.y}
                    r="2"
                    fill={color}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </g>
              );
            })}
          </svg>
          {/* teamfight ping near mid */}
          <motion.span
            aria-hidden
            className="absolute"
            style={{ left: "50%", top: "51%" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
          >
            <motion.span
              className="block w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border border-citrine/70"
              animate={{ scale: [1, 2.4], opacity: [0.8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.span>
        </motion.div>

        {/* playback scrubber */}
        <motion.div variants={up} className="mt-4">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-8 h-8 rounded-[9px] bg-jade/15 border border-jade/30 shrink-0">
              <Play size={14} className="text-jade fill-jade ml-0.5" />
            </span>
            <div className="relative flex-1 h-2 rounded-full bg-white/[0.06]">
              {/* event markers */}
              {MARKERS.map((p) => (
                <span
                  key={p}
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-flash/30"
                  style={{ left: `${p}%` }}
                />
              ))}
              {/* fill */}
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-jade"
                style={{ boxShadow: "0 0 12px rgba(0,217,146,0.6)" }}
                initial={{ width: 0 }}
                whileInView={{ width: "60%" }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              />
              {/* thumb */}
              <motion.div
                className="absolute top-1/2 w-3.5 h-3.5 -mt-[7px] -ml-[7px] rounded-full bg-flash border-2 border-jade"
                initial={{ left: 0, opacity: 0 }}
                whileInView={{ left: "60%", opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
              />
            </div>
          </div>
        </motion.div>

        {/* event log line */}
        <motion.div
          variants={upSm}
          className="mt-3.5 flex items-center gap-2.5 rounded-[9px] px-3 py-2 bg-white/[0.025] border border-white/6"
        >
          <Gem size={13} className="text-citrine shrink-0" />
          <span className="font-jetbrains text-[11px] text-flash/55">
            <span className="text-flash/80">14:02</span> · Infernal Drake secured — blue +1.4k gold
          </span>
        </motion.div>
      </GlassPanel>
    </div>
  );
}
