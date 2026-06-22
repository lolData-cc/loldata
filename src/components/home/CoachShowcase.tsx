"use client";

// CoachShowcase — the live AI coach + 24/7 chatbot. Copy on the right; a
// glass "Daily Report" device on the left with metric rows that fill on view
// and a short chat exchange that types itself in.

import { motion } from "framer-motion";
import {
  Sparkles,
  CalendarCheck,
  Swords,
  MessagesSquare,
  TrendingUp,
  TrendingDown,
  Bot,
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
  stagger,
  up,
  upSm,
} from "./showcase-kit";

type Metric = { label: string; value: string; delta: string; pct: number; good: boolean };

const METRICS: Metric[] = [
  { label: "CS @10", value: "82", delta: "+0.9/min", pct: 82, good: true },
  { label: "Vision score", value: "28", delta: "+7", pct: 64, good: true },
  { label: "Deaths to ganks", value: "3", delta: "focus", pct: 38, good: false },
];

export function CoachShowcase({ id }: { id?: string }) {
  return (
    <Showcase id={id} flip mock={<CoachMock />}>
      <Eyebrow>AI coach · always on</Eyebrow>
      <Headline>
        A coach that <Hot>never sleeps</Hot>.
      </Headline>
      <Lead>
        It watches every game, finds the patterns you'd miss, and hands you a
        daily report with the exact things to fix. Stuck mid-match? Ask the{" "}
        <span className="text-flash/80">24/7 chatbot</span> — matchups, item
        swaps, wave states — and get a straight answer.
      </Lead>
      <Bullets
        items={[
          { icon: CalendarCheck, label: "Daily reports" },
          { icon: Swords, label: "Matchup AI" },
          { icon: Sparkles, label: "Itemization" },
          { icon: MessagesSquare, label: "24/7 chat" },
        ]}
      />
      <motion.div variants={up} className="pt-1">
        <GhostLink href="/learn">See how it works</GhostLink>
      </motion.div>
    </Showcase>
  );
}

function CoachMock() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <GlassPanel className="p-5 md:p-6">
        {/* header */}
        <motion.div variants={stagger} className="flex items-center gap-3">
          <motion.span
            variants={upSm}
            className="grid place-items-center w-10 h-10 rounded-[11px] shrink-0"
            style={{
              background: "radial-gradient(circle at 35% 30%, rgba(0,217,146,0.4), rgba(4,10,12,0.9))",
              border: "1px solid rgba(0,217,146,0.4)",
              boxShadow: "0 0 18px rgba(0,217,146,0.3)",
            }}
          >
            <Bot size={19} className="text-jade" />
          </motion.span>
          <motion.div variants={upSm} className="flex-1">
            <div className="font-chakrapetch font-bold text-flash text-[15px] leading-none">
              Daily Report
            </div>
            <div className="font-jetbrains text-[11px] text-flash/40 mt-1.5">Patch 14.x · today</div>
          </motion.div>
          <motion.span
            variants={upSm}
            className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full border border-jade/25 bg-jade/[0.06]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />
            <span className="font-jetbrains text-[10px] uppercase tracking-wider text-jade/85">24/7</span>
          </motion.span>
        </motion.div>

        {/* metric rows */}
        <motion.ul variants={stagger} className="mt-5 space-y-3">
          {METRICS.map((m) => (
            <motion.li key={m.label} variants={upSm}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-jetbrains text-[12px] text-flash/60">{m.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-chakrapetch font-bold text-flash text-[13px] tabular-nums">
                    {m.value}
                  </span>
                  <span
                    className={
                      "inline-flex items-center gap-0.5 font-jetbrains text-[10px] uppercase tracking-wide " +
                      (m.good ? "text-jade" : "text-citrine")
                    }
                  >
                    {m.good ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {m.delta}
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: m.good ? "#00d992" : "#FFB615",
                    boxShadow: m.good
                      ? "0 0 10px rgba(0,217,146,0.5)"
                      : "0 0 10px rgba(255,182,21,0.45)",
                  }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${m.pct}%` }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                />
              </div>
            </motion.li>
          ))}
        </motion.ul>

        {/* chat exchange */}
        <motion.div variants={up} className="mt-5 pt-4 border-t border-white/8 space-y-2.5">
          <div className="flex justify-end">
            <span className="max-w-[78%] rounded-2xl rounded-br-sm px-3.5 py-2 bg-white/[0.05] font-geist text-[12.5px] text-flash/75">
              Rush Zhonya vs Zed?
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="grid place-items-center w-6 h-6 rounded-full shrink-0 bg-jade/15 border border-jade/30">
              <Bot size={12} className="text-jade" />
            </span>
            <span
              className="max-w-[80%] rounded-2xl rounded-bl-sm px-3.5 py-2 font-geist text-[12.5px] text-flash/90"
              style={{ background: "rgba(0,217,146,0.10)", border: "1px solid rgba(0,217,146,0.20)" }}
            >
              Yes — Zed's all-in spikes at 6. Zhonya flips the kill onto him.
            </span>
          </div>
        </motion.div>
      </GlassPanel>
    </div>
  );
}
