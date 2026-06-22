"use client";

// HeroLive — the homepage hero. The visual IS the statement: a champion
// re-materialised as a slowly-rotating cloud of glowing points (GPU/WebGL,
// degrades to a flat splash without it). Solid #040A0C throughout — no tint.
// The copy stays minimal and bold; search is the door in.

import { motion } from "framer-motion";
import { Search, ArrowDown } from "lucide-react";
import { PointCloudStatue } from "./PointCloudStatue";

const EASE_BRAND = [0.22, 1, 0.36, 1] as const;

function openSearch() {
  window.dispatchEvent(new Event("open-search-dialog"));
}

export function HeroLive({ onExplore }: { onExplore?: () => void }) {
  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE_BRAND },
  });

  return (
    <div className="relative w-full">
      {/* Full-viewport hero. min-h-[100dvh] (not 100vh-navbar): the navbar is
          sticky+in-flow above us, so a full 100dvh hero always reaches past the
          fold no matter the navbar height — the next section is never visible
          until you scroll, on any resolution. dvh tracks mobile browser chrome. */}
      <section className="relative w-screen left-1/2 -translate-x-1/2 min-h-[100dvh] overflow-hidden bg-[#040A0C]">
        {/* 3D champion topology — right-anchored but pulled left so it tucks
            partly behind the copy (z-0, under the text + scrim) */}
        <div className="absolute inset-y-0 right-0 w-full md:w-[80%] lg:w-[78%] z-0">
          <PointCloudStatue
            src="/models/mercenary_katarina.glb"
            fallbackImg="/img/Yasuo.png"
            className="h-full w-full"
          />
        </div>

        {/* legibility scrim — pure #040A0C on the left, clearing toward the cloud */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, #040A0C 30%, rgba(4,10,12,0.86) 46%, rgba(4,10,12,0.30) 66%, rgba(4,10,12,0) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40 z-[1] pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent, #040A0C)" }}
        />

        {/* content — centred in the VISIBLE viewport, not in the 100dvh hero box.
            The hero sits below the 64px sticky navbar, so a plain items-center
            would drop the copy ~64px low; we pull it up by the navbar height so
            it lands at true screen centre (where it was before). */}
        <div className="relative z-10 min-h-[100dvh] -mt-[64px] flex items-center">
          <div className="w-full max-w-[1240px] mx-auto px-6 md:px-10">
            <div className="max-w-[600px]">
              <motion.div {...reveal(0.05)} className="flex items-center gap-2.5 mb-5">
                <span className="w-2 h-2 rounded-full bg-jade" style={{ boxShadow: "0 0 8px #00d992" }} />
                <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.34em] text-jade/80">
                  The Rift, quantified
                </span>
              </motion.div>

              <motion.h1
                {...reveal(0.12)}
                className="font-chakrapetch font-bold text-flash leading-[0.98] tracking-tight text-[clamp(40px,6.6vw,78px)]"
              >
                Every match on the Rift,{" "}
                <span className="text-jade" style={{ textShadow: "0 0 42px rgba(0,217,146,0.4)" }}>
                  decoded
                </span>
                .
              </motion.h1>

              <motion.p {...reveal(0.26)} className="mt-6 max-w-[460px] text-[15px] md:text-[16px] leading-relaxed text-flash/55">
                Builds, matchups and ranks distilled from millions of real games. Look up any
                summoner, or explore the data yourself.
              </motion.p>

              <motion.div
                {...reveal(0.38)}
                className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                {/* Primary — cyber command bar: glass, corner ticks, a hover
                    scan-sweep + jade glow, and a blinking terminal cursor. */}
                <button
                  onClick={openSearch}
                  className="group relative flex items-center gap-3 w-full sm:w-[348px] h-[52px] pl-4 pr-3 rounded-[10px] border border-jade/30 bg-[rgba(6,12,14,0.7)] backdrop-blur-md cursor-clicker overflow-hidden transition-colors duration-200 hover:border-jade/60"
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)" }}
                >
                  {/* corner ticks */}
                  <span aria-hidden className="pointer-events-none absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-jade/50" />
                  <span aria-hidden className="pointer-events-none absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-jade/50" />
                  <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-jade/50" />
                  <span aria-hidden className="pointer-events-none absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-jade/50" />
                  {/* hover scan-sweep */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 w-14 left-[-20%] -skew-x-12 bg-gradient-to-r from-transparent via-jade/20 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[120%] group-hover:opacity-100"
                  />
                  {/* hover glow */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[10px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ boxShadow: "0 0 26px -6px rgba(0,217,146,0.45), inset 0 0 14px -8px rgba(0,217,146,0.5)" }}
                  />

                  <Search size={17} className="relative shrink-0 text-jade" style={{ filter: "drop-shadow(0 0 6px rgba(0,217,146,0.5))" }} />
                  <span className="relative flex-1 text-left font-jetbrains text-[13px] tracking-wide text-flash/55 transition-colors group-hover:text-flash/85">
                    search any summoner
                    <span aria-hidden className="ml-[3px] inline-block h-[14px] w-[7px] translate-y-[2px] bg-jade/80 animate-pulse" />
                  </span>
                  <kbd className="relative shrink-0 grid place-items-center w-6 h-6 rounded-[5px] border border-jade/30 bg-jade/[0.08] text-[12px] font-jetbrains text-jade/85">
                    /
                  </kbd>
                </button>

                {/* Secondary — cyber ghost framed by jade targeting brackets
                    that expand + brighten on hover (no more white outline). */}
                <button
                  onClick={() => onExplore?.()}
                  className="group relative inline-flex shrink-0 items-center justify-center gap-2 h-[52px] px-5 cursor-clicker"
                >
                  <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2 border-jade/40 transition-all duration-300 group-hover:h-4 group-hover:w-4 group-hover:border-jade" />
                  <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-jade/40 transition-all duration-300 group-hover:h-4 group-hover:w-4 group-hover:border-jade" />
                  <span className="font-jetbrains text-[12px] font-bold uppercase tracking-[0.16em] whitespace-nowrap text-jade/70 transition-colors group-hover:text-jade">
                    explore the data
                  </span>
                  <ArrowDown size={14} className="text-jade/70 transition-all duration-200 group-hover:translate-y-0.5 group-hover:text-jade" />
                </button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
