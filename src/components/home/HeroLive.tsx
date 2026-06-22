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
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
