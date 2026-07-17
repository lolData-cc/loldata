// src/components/summonerbootoverlay.tsx
//
// Mobile-only boot sequence for the summoner page, in the 404 page's motion
// language: a chronosphere of three tilted elliptical orbits (circles rotated
// into 3D with rotateX, spinning at different speeds/directions, carrying
// small ◈/◆ markers) around the breathing brand glyph, over floating ◈
// particles + scanlines + vignette. Once data lands it plays a two-beat exit:
// LOCK (orbits and glyph flare jade, "SUMMONER FOUND") → WIPE (the overlay
// collapses into the glyph via clip-path, revealing the loaded page).
//
// Driven purely by the `active` prop (= data not yet available). A minimum
// on-screen time keeps fast responses from producing a one-frame blink.

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

const LINES = [
  "Connecting to Rift",
  "Resolving Riot ID",
  "Pulling ranked data",
  "Decoding matches",
]
const MIN_SHOW_MS = 900
const LOCK_MS = 420
const WIPE_MS = 540

// ── Chronosphere rings — the 404 atom-orbit recipe, scaled for mobile ──
// Each ring bakes its tilt into its own keyframes (see BOOT_CSS):
//   rotateZ(tilt) rotateX(70deg) rotateZ(spin)
const RINGS = [
  {
    size: 150, anim: "sboOrbit1", speed: 8, borderStyle: "dashed" as const,
    border: "rgba(0,217,146,0.24)", borderLocked: "rgba(0,217,146,0.6)",
    items: [
      { angle: 0,   char: "◈", size: 12, color: "rgba(0,217,146,0.85)", glow: true },
      { angle: 180, char: "◆", size: 9,  color: "rgba(0,217,146,0.4)",  glow: false },
    ],
  },
  {
    size: 196, anim: "sboOrbit2", speed: 11, borderStyle: "dashed" as const,
    border: "rgba(0,217,146,0.14)", borderLocked: "rgba(0,217,146,0.45)",
    items: [
      { angle: 0,   char: "◈", size: 10, color: "rgba(0,217,146,0.6)",  glow: true },
      { angle: 120, char: "◈", size: 8,  color: "rgba(255,98,134,0.4)", glow: false },
      { angle: 240, char: "◆", size: 8,  color: "rgba(0,217,146,0.3)",  glow: false },
    ],
  },
  {
    size: 240, anim: "sboOrbit3", speed: 15, borderStyle: "dotted" as const,
    border: "rgba(215,216,217,0.10)", borderLocked: "rgba(0,217,146,0.3)",
    items: [
      { angle: 0,   char: "◆", size: 8, color: "rgba(215,216,217,0.4)", glow: false },
      { angle: 90,  char: "◈", size: 7, color: "rgba(0,217,146,0.3)",   glow: false },
      { angle: 180, char: "◆", size: 7, color: "rgba(255,182,21,0.3)",  glow: false },
      { angle: 270, char: "◈", size: 6, color: "rgba(0,217,146,0.2)",   glow: false },
    ],
  },
]

// ── Floating ◈ particles — fixed configs (stable across re-renders) ──
const PARTICLES: { x: number; size: number; dur: number; delay: number; op: number; char: string }[] = [
  { x: 6,  size: 9,  dur: 8.5,  delay: 0.0, op: 0.06, char: "◈" },
  { x: 15, size: 13, dur: 11.0, delay: 2.2, op: 0.05, char: "◆" },
  { x: 24, size: 7,  dur: 7.5,  delay: 4.4, op: 0.09, char: "◈" },
  { x: 33, size: 11, dur: 12.5, delay: 1.1, op: 0.04, char: "◈" },
  { x: 42, size: 8,  dur: 9.0,  delay: 5.6, op: 0.07, char: "◆" },
  { x: 51, size: 14, dur: 13.0, delay: 0.6, op: 0.04, char: "◈" },
  { x: 60, size: 7,  dur: 8.0,  delay: 3.3, op: 0.08, char: "◆" },
  { x: 68, size: 10, dur: 10.5, delay: 1.8, op: 0.06, char: "◈" },
  { x: 76, size: 8,  dur: 7.8,  delay: 5.0, op: 0.09, char: "◈" },
  { x: 84, size: 12, dur: 11.5, delay: 2.7, op: 0.05, char: "◆" },
  { x: 92, size: 9,  dur: 9.5,  delay: 0.9, op: 0.07, char: "◈" },
  { x: 47, size: 6,  dur: 6.8,  delay: 6.2, op: 0.10, char: "◈" },
  { x: 29, size: 6,  dur: 7.2,  delay: 7.0, op: 0.08, char: "◆" },
  { x: 71, size: 6,  dur: 6.5,  delay: 7.6, op: 0.09, char: "◈" },
]

const BOOT_CSS = `
@keyframes sboFloat {
  0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-92vh) rotate(180deg); opacity: 0; }
}
/* the 404 atom-orbit formula, namespaced */
@keyframes sboOrbit1 {
  from { transform: rotateX(70deg) rotateZ(0deg); }
  to   { transform: rotateX(70deg) rotateZ(360deg); }
}
@keyframes sboOrbit2 {
  from { transform: rotateZ(30deg) rotateX(70deg) rotateZ(0deg); }
  to   { transform: rotateZ(30deg) rotateX(70deg) rotateZ(-360deg); }
}
@keyframes sboOrbit3 {
  from { transform: rotateZ(-30deg) rotateX(70deg) rotateZ(0deg); }
  to   { transform: rotateZ(-30deg) rotateX(70deg) rotateZ(360deg); }
}
.sbo-glyph { animation: sboGlow 2.4s ease-in-out infinite; }
@keyframes sboGlow {
  0%, 100% { text-shadow: 0 0 26px rgba(0,217,146,0.25), 0 0 70px rgba(0,217,146,0.08); }
  50%      { text-shadow: 0 0 36px rgba(0,217,146,0.55), 0 0 90px rgba(0,217,146,0.16); }
}
.sbo-glyph-locked { animation: sboGlyphLock ${LOCK_MS}ms cubic-bezier(0.22,1,0.36,1) both; text-shadow: 0 0 42px rgba(0,217,146,0.9), 0 0 110px rgba(0,217,146,0.25); }
@keyframes sboGlyphLock { 0% { transform: scale(1); } 55% { transform: scale(1.22); } 100% { transform: scale(1.12); } }
.sbo-ring { border-radius: 9999px; filter: blur(1.5px); box-shadow: 0 0 22px rgba(0,217,146,0.5), inset 0 0 14px rgba(0,217,146,0.35); animation: sboPing 620ms cubic-bezier(0.22,1,0.36,1) both; }
@keyframes sboPing { from { transform: scale(0.45); opacity: 0.9; } to { transform: scale(1.7); opacity: 0; } }
.sbo-line { animation: sboLineIn 280ms cubic-bezier(0.22,1,0.36,1) both; }
@keyframes sboLineIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
.sbo-dot { animation: sboBlink 1.4s ease-in-out infinite; }
@keyframes sboBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.sbo-sweep { animation: sboSweep 1.15s cubic-bezier(0.4,0,0.2,1) infinite; }
@keyframes sboSweep { from { transform: translateX(-110%); } to { transform: translateX(330%); } }
@media (prefers-reduced-motion: reduce) {
  .sbo-anim, .sbo-glyph, .sbo-dot, .sbo-sweep { animation: none !important; }
}
`

export function SummonerBootOverlay({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(active)
  const [phase, setPhase] = useState<"scan" | "lock" | "wipe">("scan")
  const [lineIdx, setLineIdx] = useState(0)
  const bornAt = useRef(Date.now())

  // (re)arm whenever a new load starts (slug change / UPDATE both null the data)
  useEffect(() => {
    if (active) {
      bornAt.current = Date.now()
      setPhase("scan")
      setLineIdx(0)
      setVisible(true)
    }
  }, [active])

  // cycle the status lines while scanning
  useEffect(() => {
    if (!visible || phase !== "scan") return
    const id = setInterval(() => setLineIdx((i) => (i + 1) % LINES.length), 1400)
    return () => clearInterval(id)
  }, [visible, phase])

  // exit choreography once data lands (respecting the minimum on-screen time)
  useEffect(() => {
    if (!visible || active) return
    const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - bornAt.current))
    const t1 = setTimeout(() => setPhase("lock"), wait)
    const t2 = setTimeout(() => setPhase("wipe"), wait + LOCK_MS)
    const t3 = setTimeout(() => setVisible(false), wait + LOCK_MS + WIPE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [active, visible])

  if (!visible) return null
  const locked = phase !== "scan"

  return (
    <div
      className="lg:hidden fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-liquirice"
      style={{
        clipPath: phase === "wipe" ? "circle(0% at 50% 44%)" : "circle(142% at 50% 44%)",
        transition: `clip-path ${WIPE_MS}ms cubic-bezier(0.22,1,0.36,1)`,
      }}
      aria-hidden
    >
      <style>{BOOT_CSS}</style>

      {/* floating ◈ particles (404 layer 1) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="sbo-anim absolute bottom-[-20px] text-jade select-none"
            style={{
              left: `${p.x}%`,
              fontSize: p.size,
              opacity: p.op,
              animation: `sboFloat ${p.dur}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          >
            {p.char}
          </span>
        ))}
      </div>

      {/* scanlines (404 layer 2) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)" }}
      />
      {/* vignette + jade center glow (404 layers 3-4) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(4,10,12,0.85)_70%,rgba(4,10,12,1)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_420px_at_50%_44%,rgba(0,217,146,0.05)_0%,transparent_70%)]" />

      {/* ── chronosphere: three tilted orbits around the brand glyph ── */}
      <div
        className="relative -mt-14 flex h-[260px] w-[260px] items-center justify-center"
        style={{ perspective: "700px" }}
      >
        {RINGS.map((ring, ri) => (
          <div
            key={ri}
            className="sbo-anim absolute"
            style={{
              width: ring.size,
              height: ring.size,
              animation: `${ring.anim} ${ring.speed}s linear infinite`,
            }}
          >
            <div
              className="absolute inset-0 rounded-full transition-colors duration-300"
              style={{
                borderWidth: 1,
                borderStyle: ring.borderStyle,
                borderColor: locked ? ring.borderLocked : ring.border,
              }}
            />
            {ring.items.map((item, ii) => {
              const rad = (item.angle * Math.PI) / 180
              const x = 50 + 50 * Math.cos(rad)
              const y = 50 + 50 * Math.sin(rad)
              return (
                <span
                  key={ii}
                  className="absolute select-none"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: item.size,
                    color: locked ? "rgba(0,217,146,0.9)" : item.color,
                    filter: item.glow || locked ? "drop-shadow(0 0 6px rgba(0,217,146,0.5))" : undefined,
                    transition: "color 250ms",
                  }}
                >
                  {item.char}
                </span>
              )
            })}
          </div>
        ))}

        {/* brand glyph at the core */}
        <span
          className={cn(
            "relative z-10 select-none font-chakrapetch text-[44px] leading-none text-jade",
            locked ? "sbo-glyph-locked" : "sbo-glyph"
          )}
        >
          ◈
        </span>

        {/* expanding light ring on lock */}
        {locked && <span className="sbo-ring absolute inset-12" />}
      </div>

      {/* status line */}
      <div className="mt-5 flex h-4 items-center gap-2.5">
        <span className={cn(
          "h-[5px] w-[5px] rotate-45",
          locked ? "bg-jade shadow-[0_0_8px_rgba(0,217,146,0.9)]" : "sbo-dot bg-jade/70"
        )} />
        <span
          key={locked ? "locked" : lineIdx}
          className={cn(
            "sbo-line font-jetbrains text-[10px] uppercase tracking-[0.3em]",
            locked ? "text-jade" : "text-flash/50"
          )}
        >
          {locked ? "Summoner found" : LINES[lineIdx]}
        </span>
      </div>

      {/* progress shimmer → fills solid on lock */}
      <div className="mt-4 h-[2px] w-[180px] overflow-hidden rounded-full bg-flash/[0.07]">
        <div className={cn(
          "h-full rounded-full",
          locked ? "w-full bg-jade transition-all duration-300" : "sbo-sweep w-1/3 bg-jade/70"
        )} />
      </div>

      {/* wordmark ghost */}
      <span className="absolute bottom-10 select-none font-chakrapetch text-[11px] uppercase tracking-[0.4em] text-flash/15">
        lol<span className="text-jade/30">◈</span>data
      </span>
    </div>
  )
}
