"use client";

// HeroLive — the new homepage hero. The platform's value lives in one fact: it
// has decoded millions of real games, and the pile grows every minute. So the
// hero IS that fact — a live, ticking match counter as proof, a search-any-
// summoner action as the door in, and the Yasuo splash demoted to ambience.

import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Search, ArrowDown, Activity } from "lucide-react";
import { FlickeringGrid } from "../ui/flickering-grid";
import { cn } from "@/lib/utils";
import { useDbStats, useCountUp, type DbStatus } from "@/hooks/useDbStats";

const EASE_BRAND = [0.22, 1, 0.36, 1] as const;
const fmt = (n: number) => n.toLocaleString("en-US");
const compact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n);

function openSearch() {
  window.dispatchEvent(new Event("open-search-dialog"));
}

export function HeroLive({ onExplore }: { onExplore?: () => void }) {
  const reduce = useReducedMotion();
  const { matches, ratePerMin, players, overview, status } = useDbStats();
  const shownMatches = useCountUp(matches);

  // subtle splash parallax (opposite the cursor, spring-smoothed)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 18 });
  const sy = useSpring(my, { stiffness: 55, damping: 18 });
  const splashX = useTransform(sx, [-1, 1], [16, -16]);
  const splashY = useTransform(sy, [-1, 1], [10, -10]);
  useEffect(() => {
    if (reduce) return;
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my, reduce]);

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE_BRAND },
  });

  return (
    <div className="relative w-full">
      <section className="relative w-screen left-1/2 -translate-x-1/2 h-[calc(100vh-60px)] md:h-[80vh] lg:h-[88vh] min-h-[560px] overflow-hidden bg-liquirice flex items-center">
        {/* Layer 0 — flickering grid, edge-masked */}
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          <FlickeringGrid
            className="absolute inset-0 [mask-image:radial-gradient(1100px_circle_at_70%_45%,white,transparent)]"
            squareSize={4}
            gridGap={6}
            color="#00d992"
            maxOpacity={0.42}
            flickerChance={0.09}
          />
        </motion.div>

        {/* Layer 1 — Yasuo splash, right-anchored ambience */}
        <motion.img
          src="/img/Yasuo.png"
          alt=""
          aria-hidden
          draggable={false}
          className="absolute right-0 top-0 h-full w-[68%] object-cover object-top z-[1] pointer-events-none select-none will-change-transform"
          style={reduce ? undefined : { x: splashX, y: splashY }}
          initial={{ opacity: 0, scale: 1.07 }}
          animate={{ opacity: 0.55, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE_BRAND }}
        />

        {/* Layer 2 — legibility scrim: dark left → image right → dark edges */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, #040A0C 26%, rgba(4,10,12,0.72) 48%, rgba(4,10,12,0.30) 72%, rgba(4,10,12,0.80) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-44 z-[2] pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent, #040A0C)" }}
        />
        {/* jade breathing tint */}
        <motion.div
          className="absolute inset-0 z-[2] pointer-events-none bg-jade"
          animate={{ opacity: reduce ? 0.02 : [0.015, 0.04, 0.015] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Layer 3 — one-shot CRT boot scan */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="absolute left-0 right-0 z-[3] pointer-events-none h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(0,217,146,0.4) 20%, rgba(255,255,255,0.9) 50%, rgba(0,217,146,0.4) 80%, transparent 100%)",
              boxShadow: "0 0 32px rgba(0,217,146,0.7), 0 0 64px rgba(0,217,146,0.3)",
            }}
            initial={{ top: "-3%", opacity: 0 }}
            animate={{ top: ["-3%", "103%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.3, times: [0, 0.12, 0.85, 1], ease: "easeInOut", delay: 0.4 }}
          />
        )}

        {/* ── Content ── */}
        <div className="relative z-10 w-full max-w-[1240px] mx-auto px-6 md:px-10">
          <div className="max-w-[640px]">
            {/* eyebrow */}
            <motion.div {...reveal(0.05)} className="flex items-center gap-2.5 mb-5">
              <StatusDot status={status} />
              <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.34em] text-jade/80">
                The Rift, quantified
              </span>
            </motion.div>

            {/* headline */}
            <motion.h1
              {...reveal(0.12)}
              className="font-chakrapetch font-bold text-flash leading-[0.98] tracking-tight text-[clamp(38px,6.4vw,74px)]"
            >
              Every match on the Rift,{" "}
              <span className="text-jade" style={{ textShadow: "0 0 42px rgba(0,217,146,0.4)" }}>
                decoded
              </span>
              .
            </motion.h1>

            {/* live counter — the proof */}
            <motion.div {...reveal(0.22)} className="mt-7 flex items-end gap-4 flex-wrap">
              <div>
                <div
                  className="font-chakrapetch font-bold tabular-nums text-flash leading-none text-[clamp(30px,4.6vw,52px)]"
                  style={{ textShadow: "0 0 32px rgba(0,217,146,0.22)" }}
                >
                  {fmt(shownMatches)}
                </div>
                <div className="mt-1.5 text-[10.5px] font-chakrapetch font-bold uppercase tracking-[0.22em] text-flash/40">
                  matches decoded
                </div>
              </div>
              <div
                className={cn(
                  "mb-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border tabular-nums text-[12px] font-chakrapetch font-bold",
                  ratePerMin > 0
                    ? "border-jade/30 bg-jade/[0.08] text-jade"
                    : "border-white/10 bg-black/30 text-flash/40"
                )}
              >
                <Activity size={13} className={ratePerMin > 0 ? "animate-pulse" : ""} />
                {ratePerMin > 0 ? `+${fmt(ratePerMin)}/min` : "live"}
              </div>
            </motion.div>

            {/* subline */}
            <motion.p {...reveal(0.3)} className="mt-5 max-w-[480px] text-[15px] md:text-[16px] leading-relaxed text-flash/55">
              Builds, matchups and ranks distilled from millions of real games — refreshed every
              minute. Look up any summoner, or explore the data yourself.
            </motion.p>

            {/* primary action: search */}
            <motion.div {...reveal(0.4)} className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={openSearch}
                className="group relative flex items-center gap-3 w-full sm:w-[400px] h-[52px] pl-4 pr-3 rounded-[12px] border border-jade/25 bg-[rgba(6,12,14,0.66)] backdrop-blur-md cursor-clicker transition-all duration-200 hover:border-jade/45 hover:bg-[rgba(6,12,14,0.82)]"
              >
                <Search size={18} className="text-jade/80 shrink-0" />
                <span className="flex-1 text-left font-chakrapetch text-[14px] text-flash/55 group-hover:text-flash/75 transition-colors">
                  Search any summoner…
                </span>
                <kbd className="shrink-0 grid place-items-center w-6 h-6 rounded-[5px] border border-white/12 bg-black/40 text-[11px] font-chakrapetch text-flash/45">
                  /
                </kbd>
              </button>
              <button
                onClick={() => onExplore?.()}
                className="group inline-flex items-center justify-center gap-2 h-[52px] px-5 rounded-[12px] border border-white/10 text-flash/65 font-chakrapetch text-[13px] font-bold uppercase tracking-[0.12em] cursor-clicker transition-all duration-200 hover:text-flash hover:border-white/25 hover:bg-white/[0.03]"
              >
                Explore the data
                <ArrowDown size={15} className="transition-transform duration-200 group-hover:translate-y-0.5" />
              </button>
            </motion.div>

            {/* real stat strip */}
            <motion.div
              {...reveal(0.5)}
              className="mt-9 flex items-center gap-4 flex-wrap font-chakrapetch text-[12px] text-flash/45"
            >
              <Stat value={players ? compact(players) : "—"} label="players tracked" />
              <Dot />
              <Stat value={overview?.dbSizePretty ?? "—"} label="analyzed" />
              <Dot />
              <Stat value="every patch" label="kept current" />
            </motion.div>
          </div>
        </div>

        {/* scanlines */}
        <div
          className="absolute inset-0 z-[4] pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, #00d992 0, #00d992 1px, transparent 1px, transparent 3px)",
          }}
        />
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: DbStatus }) {
  const color = status === "live" ? "#00d992" : status === "connecting" ? "#FFB615" : "#ff6286";
  return (
    <span className="relative grid place-items-center w-2.5 h-2.5">
      {status === "live" && (
        <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.5 }} />
      )}
      <span className="relative w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-bold tabular-nums text-flash/80">{value}</span>
      <span className="text-flash/35 uppercase tracking-[0.12em] text-[10.5px]">{label}</span>
    </span>
  );
}

function Dot() {
  return <span className="w-1 h-1 rounded-full bg-flash/20" />;
}
