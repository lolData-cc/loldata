"use client"

import * as React from "react"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
} from "framer-motion"
import { FlickeringGrid } from "./ui/flickering-grid"
import { Separator } from "./ui/separator"
import { ShortcutSlots } from "./home-shortcuts/ShortcutSlots"

type Props = { onDiscover?: () => void }

// ─── Brand timing tokens ─────────────────────────────────────────────
// Centralised so the choreography stays editable from one place.
const TITLE = "The future of Improvement"
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&+*-=<>/"
const DECRYPT_DURATION_MS = 1200
const SUBTITLE_DELAY_MS = 300
const BUTTON_DELAY_MS = 450
// Cubic-bezier signature shared with the rest of the site (search
// dialog, scout filter bar, AnimatedOutline). Soft-snappy ease-out.
const EASE_BRAND = [0.22, 1, 0.36, 1] as const

// ─── Floating particles ──────────────────────────────────────────────
const PARTICLE_COUNT = 18

type Particle = {
  id: number
  x: number // % from left
  startY: number // starting Y offset (vh)
  size: number // px
  duration: number // seconds
  delay: number // seconds
  opacity: number
  char: string // ◈ or ◆
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    startY: Math.random() * 30,
    size: 6 + Math.random() * 10,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 6,
    opacity: 0.03 + Math.random() * 0.08,
    char: Math.random() > 0.5 ? "◈" : "◆",
  }))
}

// ─── HUD corner brackets ─────────────────────────────────────────────
// Tiny corner ticks like a fighter-jet heads-up display — they fade
// in after the call-to-action lands so the eye is already settled on
// centre when they appear in peripheral vision. Pure SVG, no
// continuous motion: they're a frame, not a focal point.
const HUD_CORNERS = [
  { className: "top-5 left-5", rotate: 0 },
  { className: "top-5 right-5", rotate: 90 },
  { className: "bottom-5 right-5", rotate: 180 },
  { className: "bottom-5 left-5", rotate: 270 },
] as const

function HudBrackets({ visible }: { visible: boolean }) {
  return (
    <>
      {HUD_CORNERS.map((c, i) => (
        <motion.svg
          key={i}
          aria-hidden
          viewBox="0 0 16 16"
          className={`absolute ${c.className} z-[16] w-5 h-5 text-jade/60 pointer-events-none`}
          style={{ rotate: c.rotate }}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
          transition={{
            duration: 0.55,
            delay: 0.35 + i * 0.07,
            ease: EASE_BRAND,
          }}
        >
          <path
            d="M2 6 L2 2 L6 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="2" cy="2" r="1" fill="currentColor" />
        </motion.svg>
      ))}
    </>
  )
}

// ─── Component ───────────────────────────────────────────────────────
export const HomeYasuo: React.FC<Props> = ({ onDiscover }) => {
  const reduceMotion = useReducedMotion()

  const [titleText, setTitleText] = useState(TITLE)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [showButton, setShowButton] = useState(false)
  // True while the Discover dive overlay is running. Gates double
  // triggers and drives the portal-mounted CyberDiveOverlay.
  const [diving, setDiving] = useState(false)

  const heroRef = useRef<HTMLDivElement>(null)
  const particles = useMemo(generateParticles, [])

  // ─── Mouse parallax ────────────────────────────────────────────────
  // Track the cursor in normalised [-0.5..+0.5] space, then map it to
  // two independent layers:
  //   • Yasuo splash translates *counter* to the cursor (parallax
  //     depth illusion, bounded ±16px / ±10px).
  //   • The spotlight tracks the cursor 1:1 as a percentage.
  // useSpring smooths the raw mouse input so fast flicks don't make
  // the splash twitch — the motion arrives with a slight follow-through
  // that reads as physical mass.
  const mouseNX = useMotionValue(0)
  const mouseNY = useMotionValue(0)
  const smoothNX = useSpring(mouseNX, {
    stiffness: 70,
    damping: 22,
    mass: 0.6,
  })
  const smoothNY = useSpring(mouseNY, {
    stiffness: 70,
    damping: 22,
    mass: 0.6,
  })

  // Counter-mouse parallax for the splash (negative coefficient).
  const yasuoX = useTransform(smoothNX, (v) => v * -32)
  const yasuoY = useTransform(smoothNY, (v) => v * -20)

  // Spotlight tracks cursor as a percentage of hero area.
  const spotX = useTransform(smoothNX, (v) => `${50 + v * 100}%`)
  const spotY = useTransform(smoothNY, (v) => `${50 + v * 100}%`)
  const spotlightBg = useMotionTemplate`radial-gradient(circle 420px at ${spotX} ${spotY}, rgba(0,217,146,0.10) 0%, transparent 70%), radial-gradient(circle 160px at ${spotX} ${spotY}, rgba(0,217,146,0.18) 0%, transparent 55%)`

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = heroRef.current?.getBoundingClientRect()
      if (!rect) return
      const nx = (e.clientX - rect.left) / rect.width - 0.5
      const ny = (e.clientY - rect.top) / rect.height - 0.5
      mouseNX.set(nx)
      mouseNY.set(ny)
    },
    [mouseNX, mouseNY]
  )

  // ─── Decrypt title effect (unchanged — already the cinematic moment) ─
  useEffect(() => {
    let raf: number
    let start: number | null = null

    const tick = (timestamp: number) => {
      if (start === null) start = timestamp
      const elapsed = timestamp - start
      const rawT = Math.min(elapsed / DECRYPT_DURATION_MS, 1)
      const t = Math.pow(rawT, 0.8)
      const revealed = Math.floor(TITLE.length * t)
      let next = ""
      for (let i = 0; i < TITLE.length; i++) {
        next +=
          i < revealed
            ? TITLE[i]
            : CHARSET[Math.floor(Math.random() * CHARSET.length)]
      }
      setTitleText(next)
      if (rawT < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setTitleText(TITLE)
        setTimeout(() => setShowSubtitle(true), SUBTITLE_DELAY_MS)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Stage 2: button + shortcut row appear after the subtitle settles.
  useEffect(() => {
    if (!showSubtitle) return
    const t = setTimeout(() => setShowButton(true), BUTTON_DELAY_MS)
    return () => clearTimeout(t)
  }, [showSubtitle])

  // ─── Discover → "cyber dive" cinematic transition ──────────────────
  // The Discover button triggers a layered 1.1s overlay sequence:
  //   • 0-300ms: jade radial flare + 3 concentric radar rings
  //               expand from screen centre (HUD bootup feel).
  //   • 50-700ms: 3 staggered horizontal scan lines race top→bottom.
  //   • 150-900ms: jade-tinted square grid descends like a curtain.
  //   • 50-1000ms: HUD telemetry text fades in at top-left and
  //               top-right corners ("NAV.SYS ENGAGED ▼ ...").
  //   • 150-1000ms: centred "▸ DIVE ◂" title with subtitle of the
  //               destination section, with jade neon glow.
  //   • 350-800ms: black-flash overlay (peaks 0.92 opacity) masks
  //               the actual scroll-to-target so the page seems
  //               to *materialise* at the destination.
  //   • 450-1100ms: 4 corner reticle brackets snap inward from
  //               each corner, hold briefly, then fade.
  //   • 200-1100ms: full-screen vignette dims the periphery.
  // The body itself jitters subtly via an injected @keyframes during
  // the scan-line phase for tactile feel — but the overlay does the
  // heavy lifting, body jitter is just seasoning.
  // Respects prefers-reduced-motion: falls back to a plain
  // scrollIntoView({behavior: "smooth"}) without any overlay.
  const handleCyberDive = () => {
    if (diving) return // guard against double-trigger

    // Reduced motion → no theatrics, just scroll.
    if (reduceMotion) {
      const target = document.getElementById("learn")
      if (target) target.scrollIntoView({ behavior: "smooth" })
      if (onDiscover) onDiscover()
      return
    }

    setDiving(true)

    // Body micro-shake — keyframes injected once-per-click then
    // removed in cleanup so we never leak styles into <head>.
    const style = document.createElement("style")
    style.textContent = `
      @keyframes heroDiveGlitch {
        0%,100% { transform: translate(0); }
        15%     { transform: translate(-3px, 2px); }
        35%     { transform: translate(3px, -2px); }
        55%     { transform: translate(-2px, -3px); }
        75%     { transform: translate(2px, 3px); }
      }
    `
    document.head.appendChild(style)
    document.body.style.animation = "heroDiveGlitch 0.5s ease-in-out"

    // Scroll happens mid-dive (around the black-flash peak) so the
    // user never sees the page mid-flight — they see overlay, then
    // black, then the destination.
    const SCROLL_DELAY_MS = 380
    const SCROLL_DURATION_MS = 700

    const easeInOutCubic = (t: number): number =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const scrollTimer = window.setTimeout(() => {
      const target = document.getElementById("learn")
      if (!target) return
      const startY = window.pageYOffset
      const targetY =
        target.getBoundingClientRect().top + window.pageYOffset
      const distance = targetY - startY
      let scrollStart: number | null = null

      const tick = (currentTime: number) => {
        if (scrollStart === null) scrollStart = currentTime
        const elapsed = currentTime - scrollStart
        const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1)
        const jitter = (Math.random() * 2 - 1) * 1.5
        window.scrollTo(
          0,
          startY + distance * easeInOutCubic(progress) + jitter
        )
        if (elapsed < SCROLL_DURATION_MS) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, SCROLL_DELAY_MS)

    if (onDiscover) onDiscover()

    // Cleanup — fires after the longest animation in the overlay
    // (1100ms) plus a small buffer. Always resets body inline style
    // and removes the injected keyframes, regardless of the scroll
    // outcome.
    const cleanupTimer = window.setTimeout(() => {
      setDiving(false)
      document.body.style.animation = ""
      if (style.isConnected) style.remove()
    }, 1300)

    // Defensive: if the component unmounts mid-dive (route change
    // mid-animation), cancel both pending timers. Stored on a ref
    // so the effect below can read them.
    diveTimersRef.current = { scrollTimer, cleanupTimer, style }
  }

  // Holds references to the live dive timers + injected style tag
  // so we can cancel/clean up if the component unmounts mid-flight.
  const diveTimersRef = useRef<{
    scrollTimer: number
    cleanupTimer: number
    style: HTMLStyleElement
  } | null>(null)

  useEffect(() => {
    return () => {
      const r = diveTimersRef.current
      if (!r) return
      clearTimeout(r.scrollTimer)
      clearTimeout(r.cleanupTimer)
      if (r.style.isConnected) r.style.remove()
      document.body.style.animation = ""
    }
  }, [])

  // ─── Title word splitting (cleaner highlight handling) ─────────────
  // The decrypted titleText changes every frame; the last word keeps
  // jade glow regardless of whether it currently reads "Improvement"
  // or a noised intermediate state.
  const words = titleText.split(" ")
  const lastIdx = words.length - 1

  return (
    <div className="relative w-full">
      {/* ── Full-bleed escape ──
          The page wrapper constrains content to ~65% width (App.tsx),
          but the hero needs to span the entire viewport — otherwise
          the FlickeringGrid, Yasuo splash, vignette and scanlines
          show a visible "card edge" against the page background.
          The classic `w-screen` + `left-1/2 -translate-x-1/2` trick
          escapes the wrapper without disturbing the document flow
          above or below. No `rounded-lg`, no `max-w-screen-2xl` —
          this is a section, not a card. */}
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative w-screen left-1/2 -translate-x-1/2 h-[calc(100vh-60px)] md:h-[80vh] lg:h-[93vh] overflow-hidden"
      >
        {/* ── Layer 0: Flickering grid — gentle opacity ramp on mount ── */}
        <motion.div
          className="absolute inset-0 z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          {/* No `width`/`height` props — the FlickeringGrid then
              auto-detects its container size via ResizeObserver
              and re-tiles to whatever the hero ends up being. At
              full-bleed (1920px+ on big screens) the grid covers
              the whole viewport instead of leaving dead bands. */}
          <FlickeringGrid
            className="absolute inset-0 [mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
            squareSize={4}
            gridGap={6}
            color="#00d992"
            maxOpacity={0.5}
            flickerChance={0.1}
          />
        </motion.div>

        {/* ── Layer 1: Yasuo splash ──
            • Subtle Ken-Burns zoom-in (scale 1.06 → 1) over 1.8s on
              mount, fades from 0 → 80% opacity at the same time.
            • Mouse parallax via spring-smoothed MotionValues; the
              splash translates *opposite* to the cursor, ±16/±10px.
            • will-change-transform promotes the layer so the
              parallax stays butter-smooth even at 60fps. */}
        <motion.img
          src="/img/Yasuo.png"
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-top z-10 pointer-events-none select-none will-change-transform"
          style={reduceMotion ? undefined : { x: yasuoX, y: yasuoY }}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 0.8, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE_BRAND }}
        />

        {/* ── Layer 1.5: One-shot CRT boot scan line ──
            Races top → bottom across the full hero on mount. Sets the
            cinematic frame for the decrypt that follows: the screen is
            "turning on" while the title comes into focus. */}
        {!reduceMotion && (
          <motion.div
            aria-hidden
            className="absolute left-0 right-0 z-[10.5] pointer-events-none h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(0,217,146,0.45) 18%, rgba(255,255,255,0.95) 50%, rgba(0,217,146,0.45) 82%, transparent 100%)",
              boxShadow:
                "0 0 32px rgba(0,217,146,0.75), 0 0 64px rgba(0,217,146,0.35)",
            }}
            initial={{ top: "-3%", opacity: 0 }}
            animate={{
              top: ["-3%", "103%"],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              // 0.35s delay lets Yasuo establish past ~60% opacity
              // before the scan races across — the scan now reads as
              // lighting up an image, not slicing a black void.
              duration: 1.3,
              times: [0, 0.12, 0.85, 1],
              ease: "easeInOut",
              delay: 0.35,
            }}
          />
        )}

        {/* ── Layer 2: Dual mouse spotlight ──
            Two stacked radial gradients (wide soft + tight bright)
            both follow the spring-smoothed cursor position. Together
            they add visible depth: the wide one says "where the eye
            is" while the tight one feels like a fingertip on glass. */}
        <motion.div
          className="absolute inset-0 z-[11] pointer-events-none"
          style={
            reduceMotion
              ? {
                  background:
                    "radial-gradient(circle 420px at 50% 50%, rgba(0,217,146,0.08) 0%, transparent 70%)",
                }
              : { background: spotlightBg }
          }
        />

        {/* ── Layer 3: Jade tint, breathing ──
            Range and tempo tuned down (0.020→0.035 over 8s, was
            0.025→0.05 over 6.5s) so the page breathes restfully
            without competing with the title for the eye. */}
        <motion.div
          className="absolute inset-0 z-[12] mix-blend-color pointer-events-none bg-jade"
          animate={
            reduceMotion ? { opacity: 0.03 } : { opacity: [0.02, 0.035, 0.02] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 8, ease: "easeInOut", repeat: Infinity }
          }
        />

        {/* ── Layer 4: Scanlines, drifting downward ── */}
        <motion.div
          className="absolute inset-0 z-[13] pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
          }}
          animate={
            reduceMotion ? undefined : { backgroundPositionY: ["0px", "40px"] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 22, ease: "linear", repeat: Infinity }
          }
        />

        {/* ── Layer 5: Vignette, breathing ── */}
        <motion.div
          className="absolute inset-0 z-[14] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(4,10,12,0.85)_70%,rgba(4,10,12,1)_100%)]"
          animate={reduceMotion ? undefined : { opacity: [0.93, 1, 0.93] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 9, ease: "easeInOut", repeat: Infinity }
          }
        />

        {/* ── Layer 6: Floating ◈ particles (unchanged) ── */}
        <div className="absolute inset-0 z-[15] pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute text-jade animate-[heroFloat_linear_infinite]"
              style={{
                left: `${p.x}%`,
                bottom: `-${p.startY}px`,
                fontSize: `${p.size}px`,
                opacity: p.opacity,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            >
              {p.char}
            </span>
          ))}
        </div>

        {/* ── Layer 7: HUD corner brackets ── */}
        <HudBrackets visible={showButton} />

        {/* ── Layer 8: Content ── */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-4 select-none">
          {/* Top label — the ◈ glyphs slowly counter-rotate as ambient
              motion, signalling the system is "live" without
              distracting from the title. */}
          <motion.div
            className="flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-jade/70"
            initial={{ opacity: 0, y: -8 }}
            animate={
              showSubtitle ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }
            }
            transition={{ duration: 0.6, ease: EASE_BRAND }}
          >
            <motion.span
              className="text-jade/40 inline-block"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 22, ease: "linear", repeat: Infinity }
              }
            >
              ◈
            </motion.span>
            <span>League Analytics Platform</span>
            <motion.span
              className="text-jade/40 inline-block"
              animate={reduceMotion ? undefined : { rotate: -360 }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 22, ease: "linear", repeat: Infinity }
              }
            >
              ◈
            </motion.span>
          </motion.div>

          {/* Main title — decryption animation continues to drive the
              text content; jade glow stays on the last word as it
              passes through the noise. */}
          <div
            className="font-jetbrains font-bold text-flash/95 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-center px-4 [text-shadow:0_0_60px_rgba(0,217,146,0.25),0_0_120px_rgba(0,217,146,0.1)]"
            aria-label={TITLE}
          >
            {words.map((w, i) => (
              <React.Fragment key={i}>
                {i > 0 && " "}
                {i === lastIdx ? (
                  <span className="text-jade [text-shadow:0_0_40px_rgba(0,217,146,0.5),0_4px_32px_rgba(0,217,146,0.3)]">
                    {w}
                  </span>
                ) : (
                  w
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Accent line + travelling jade spark ──
              The line draws from centre outward (existing) and then a
              small bright dot races across once, leaving a glow trail.
              Sets the visual rhythm before the subtitle text arrives. */}
          <div className="relative w-24 h-[1px]">
            <motion.div
              className="absolute inset-0 origin-center"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(0,217,146,0.55), transparent)",
              }}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={
                showSubtitle
                  ? { opacity: 1, scaleX: 1 }
                  : { opacity: 0, scaleX: 0 }
              }
              transition={{ duration: 0.7, delay: 0.1, ease: EASE_BRAND }}
            />
            {!reduceMotion && (
              <motion.span
                aria-hidden
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-jade"
                style={{
                  boxShadow:
                    "0 0 8px rgba(0,217,146,1), 0 0 16px rgba(0,217,146,0.6)",
                }}
                initial={{ left: "0%", opacity: 0 }}
                animate={
                  showSubtitle
                    ? { left: ["0%", "100%"], opacity: [0, 1, 1, 0] }
                    : { left: "0%", opacity: 0 }
                }
                transition={{
                  duration: 0.9,
                  delay: 0.85,
                  times: [0, 0.12, 0.88, 1],
                  ease: "easeOut",
                }}
              />
            )}
          </div>

          {/* Subtitle — fades up after the accent line lands. */}
          <motion.p
            className="font-mono text-flash/70 text-xs sm:text-sm md:text-base text-center leading-relaxed px-4 tracking-wide"
            initial={{ opacity: 0, y: 12 }}
            animate={
              showSubtitle ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
            }
            transition={{ duration: 0.6, delay: 0.18, ease: EASE_BRAND }}
          >
            The new frontier of League of Legends improvement
            <br />
            featuring your personal{" "}
            <span className="text-jade drop-shadow-[0_0_8px_rgba(0,217,146,0.3)]">
              AI assistant
            </span>
          </motion.p>

          {/* Discover button ──
              • Radar-pulse halo: two concentric diamond rings ride a
                staggered scale+fade loop, drawing the eye without
                being noisy.
              • Hover: rhombus springs to 1.06×, glow strengthens,
                chevron drifts 3px down — orchestrated via variants on
                the parent motion.button so children stay in sync.
              • The custom cyber scroll-to-learn handler is preserved. */}
          <motion.button
            type="button"
            onClick={handleCyberDive}
            className="group relative mt-4 cursor-clicker"
            initial={{ opacity: 0, y: 16 }}
            animate={
              showButton ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
            }
            transition={{ duration: 0.6, ease: EASE_BRAND }}
            whileHover="hover"
          >
            {/* Radar pulse rings — two concentric, staggered loops.
                Index-keyed so the React reconciler can't accidentally
                treat the two ring instances as one if delays change.
                Centring assumes the button is sized by its inner
                rhombus (block w-12 h-12); `m-auto` then snaps the
                rings to the same 48×48 box. */}
            {!reduceMotion &&
              showButton &&
              [0, 1.2].map((delay, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="absolute inset-0 m-auto w-12 h-12 rotate-45 rounded-[4px] border border-jade pointer-events-none"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: [0.6, 1.9], opacity: [0.45, 0] }}
                  transition={{
                    duration: 2.4,
                    delay,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              ))}

            {/* Rotated diamond background. */}
            <motion.span
              className="block w-12 h-12 rotate-45 rounded-[4px] border border-jade/30 bg-jade/[0.06] shadow-[0_0_12px_rgba(0,217,146,0.1)] relative"
              variants={{
                hover: {
                  scale: 1.06,
                  borderColor: "rgba(0,217,146,0.75)",
                  backgroundColor: "rgba(0,217,146,0.15)",
                  boxShadow:
                    "0 0 32px rgba(0,217,146,0.35),inset 0 0 12px rgba(0,217,146,0.12)",
                  transition: { duration: 0.28, ease: EASE_BRAND },
                },
              }}
            >
              {/* Scanlines inside the rhombus. */}
              <span
                className="absolute inset-0 rounded-[3px] opacity-25 group-hover:opacity-50 transition-opacity"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.4) 3px, rgba(0,217,146,0.4) 4px)",
                }}
              />
            </motion.span>

            {/* Counter-rotated chevron. */}
            <span className="absolute inset-0 flex items-center justify-center">
              <motion.svg
                viewBox="0 0 10 8"
                className="w-4 h-4 text-jade"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                variants={{
                  hover: {
                    y: 3,
                    transition: { duration: 0.25, ease: EASE_BRAND },
                  },
                }}
              >
                <polyline points="1,2 5,6 9,2" />
              </motion.svg>
            </span>

            {/* Label below. */}
            <motion.span
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[8px] sm:text-[10px] tracking-[0.3em] text-jade/30 uppercase whitespace-nowrap"
              variants={{
                hover: {
                  color: "rgba(0,217,146,0.85)",
                  transition: { duration: 0.25 },
                },
              }}
            >
              Discover
            </motion.span>
          </motion.button>

          {/* Customizable shortcut row ──
              Three rhombi the user can configure to point at any
              champion / summoner / scout lobby / learn / loldle /
              leaderboard target. The row plays its own staggered
              entrance once we tell it `revealed`, so each rhombus
              lands with a left-to-right cascade instead of the whole
              cluster sliding in as one block. */}
          <div className="mt-14">
            <ShortcutSlots revealed={showButton} />
          </div>
        </div>

        {/* ── Inline keyframes (heroFloat is the particle loop) ── */}
        <style>{`
          @keyframes heroFloat {
            0% { transform: translateY(0) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-93vh) rotate(180deg); opacity: 0; }
          }
        `}</style>
      </div>

      <Separator className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" />

      {/* ── Cyber dive overlay ──
          Mounted via a small wrapper that portals an AnimatePresence
          into <body>. Portalling the AnimatePresence itself (not the
          motion element returned by it) avoids the "portal-as-child"
          problem where AnimatePresence can't see the motion node
          inside and skips its mount/exit animations entirely.
          Body is the portal target so the overlay's `fixed` layers
          aren't constrained by the hero card's `transform` (which
          would otherwise turn `position: fixed` into containing-block
          relative). */}
      <DivePortal diving={diving} />
    </div>
  )
}

// ─── Dive portal wrapper ────────────────────────────────────────────
// Always mounts an empty AnimatePresence at body root; the conditional
// render lives inside so the motion node has AnimatePresence as its
// DIRECT parent (otherwise mount/exit animations don't fire).
function DivePortal({ diving }: { diving: boolean }) {
  if (typeof document === "undefined") return null
  return createPortal(
    <AnimatePresence>
      {diving && <CyberDiveOverlay key="cyber-dive" />}
    </AnimatePresence>,
    document.body
  )
}

// ─── Cyber dive overlay ──────────────────────────────────────────────
// One-shot, full-viewport cinematic transition that runs while the
// page scrolls from the hero to the #learn section. All children are
// `pointer-events-none` and the overlay carries the highest z-index
// in the app (9999) so it sits above sticky navbar, toasts, dialogs.
//
// Each child carries its own timing so the layered effects feel like
// a coordinated burst rather than a wash. Timings reference the
// dive's t=0 (the click moment); overlay total ≈ 1100ms.
function CyberDiveOverlay() {
  // 4 corners for the reticle bracket array; matches the homepage's
  // HUD vocabulary so the brackets read as "the same system".
  const reticleCorners = [
    { className: "top-12 left-12", rotate: 0 },
    { className: "top-12 right-12", rotate: 90 },
    { className: "bottom-12 right-12", rotate: 180 },
    { className: "bottom-12 left-12", rotate: 270 },
  ] as const

  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden font-jetbrains"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* ── Vignette dim ── peripheral darken across the whole dive */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0.55, 0] }}
        transition={{
          duration: 1.1,
          times: [0, 0.2, 0.8, 1],
          ease: "easeOut",
        }}
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 18%, rgba(4,10,12,0.85) 80%)",
        }}
      />

      {/* ── Central radial burst (0-300ms) ──
          A jade flare that explodes from the screen centre to fill
          the viewport. Sets the "this just initiated" beat. */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,217,146,0.75) 0%, rgba(0,217,146,0.25) 28%, transparent 70%)",
          x: "-50%",
          y: "-50%",
        }}
        initial={{ width: 24, height: 24, opacity: 0 }}
        animate={{
          width: ["24px", "140vmax"],
          height: ["24px", "140vmax"],
          opacity: [0, 1, 0],
        }}
        transition={{ duration: 0.6, times: [0, 0.18, 1], ease: "easeOut" }}
      />

      {/* ── Radar rings ── 3 concentric jade rings expand from centre.
          Staggered 80ms apart so they read as a sequenced sweep, not
          a single thick ring. */}
      {[0, 0.08, 0.16].map((delay, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full border-2 border-jade"
          style={{
            x: "-50%",
            y: "-50%",
            boxShadow: "0 0 24px rgba(0,217,146,0.75)",
          }}
          initial={{ width: 48, height: 48, opacity: 0.9 }}
          animate={{
            width: ["48px", "130vmax"],
            height: ["48px", "130vmax"],
            opacity: [0.9, 0],
          }}
          transition={{ duration: 0.85, delay, ease: "easeOut" }}
        />
      ))}

      {/* ── Descending jade grid (150-900ms) ──
          A jade-tinted square grid (42px cells) drops down across the
          viewport like a curtain, then exits below. The grid carries
          the "we're moving through space" beat. */}
      <motion.div
        className="absolute inset-0"
        initial={{ y: "-100%", opacity: 0 }}
        animate={{
          y: ["-100%", "0%", "100%"],
          opacity: [0, 0.6, 0.6, 0],
        }}
        transition={{
          duration: 0.9,
          times: [0, 0.3, 0.95, 1],
          delay: 0.15,
          ease: "easeOut",
        }}
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,217,146,0.20) 1px, transparent 1px), linear-gradient(180deg, rgba(0,217,146,0.20) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      {/* ── Multi-scan lines (50-700ms staggered) ──
          3 horizontal scan lines race top→bottom in sequence, each
          slightly dimmer than the last so the eye reads them as
          falling waves rather than a single thick line. The brightest
          one (the first) anchors the moment of dive. */}
      {[
        { delay: 0.05, alpha: 0.95, glow: 26 },
        { delay: 0.15, alpha: 0.7, glow: 32 },
        { delay: 0.25, alpha: 0.5, glow: 38 },
      ].map((scan, i) => (
        <motion.span
          key={i}
          className="absolute left-0 right-0 h-[2px]"
          initial={{ top: "-2%", opacity: 0 }}
          animate={{
            top: ["-2%", "102%"],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 0.65,
            delay: scan.delay,
            times: [0, 0.1, 0.9, 1],
            ease: "easeInOut",
          }}
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(0,217,146,${scan.alpha * 0.55}) 25%, rgba(255,255,255,${scan.alpha}) 50%, rgba(0,217,146,${scan.alpha * 0.55}) 75%, transparent 100%)`,
            boxShadow: `0 0 ${scan.glow}px rgba(0,217,146,${scan.alpha * 0.8}), 0 0 ${scan.glow * 2}px rgba(0,217,146,${scan.alpha * 0.35})`,
          }}
        />
      ))}

      {/* ── HUD telemetry (top-left) ──
          Mono-jade text block that mimics a flight-computer feed.
          The arrows + spacing read as a system-status line, not a
          UI label. */}
      <motion.div
        className="absolute top-6 left-6 text-jade/85 text-[10px] leading-[1.6] tracking-[0.15em] uppercase"
        style={{ textShadow: "0 0 6px rgba(0,217,146,0.8)" }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: [0, 1, 1, 0], x: 0 }}
        transition={{
          duration: 1.0,
          times: [0, 0.2, 0.8, 1],
          delay: 0.05,
        }}
      >
        <div>{">"} NAV.SYS &nbsp;&nbsp; ▼ ENGAGED</div>
        <div>{">"} TARGET &nbsp;&nbsp;&nbsp; SECTION/LEARN</div>
        <div>{">"} TRANSIT &nbsp;&nbsp; 0.7 SEC</div>
      </motion.div>

      {/* ── HUD telemetry (top-right) ──
          A counterweight block — gives the screen visual balance and
          plays into the "this is an operating system" framing. */}
      <motion.div
        className="absolute top-6 right-6 text-jade/70 text-[10px] leading-[1.6] tracking-[0.15em] uppercase text-right"
        style={{ textShadow: "0 0 6px rgba(0,217,146,0.7)" }}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: [0, 1, 1, 0], x: 0 }}
        transition={{
          duration: 1.0,
          times: [0, 0.25, 0.8, 1],
          delay: 0.08,
        }}
      >
        <div>SYS // 01</div>
        <div className="opacity-60">LOLDATA.CC</div>
      </motion.div>

      {/* ── Centre title "▸ DIVE ◂" ──
          Wide tracking + jade neon glow + slight overshoot scale on
          the way out so it feels like the title "departs". */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-jade text-base sm:text-xl tracking-[0.45em] uppercase font-bold"
        style={{
          textShadow:
            "0 0 14px rgba(0,217,146,1), 0 0 30px rgba(0,217,146,0.5)",
        }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.92, 1, 1, 1.06],
        }}
        transition={{
          duration: 1.0,
          times: [0, 0.2, 0.75, 1],
          delay: 0.15,
        }}
      >
        ▸ DIVE ◂
      </motion.div>

      {/* ── Centre subtitle — destination tag. */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 mt-10 text-jade/60 text-[10px] sm:text-xs tracking-[0.3em] uppercase"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: [0, 1, 1, 0], y: 0 }}
        transition={{
          duration: 0.9,
          times: [0, 0.25, 0.8, 1],
          delay: 0.22,
        }}
      >
        SECTION/LEARN ▸ LOADED
      </motion.div>

      {/* ── Black-flash (350-800ms) ──
          Opaque liquirice overlay peaks at 92% during the scroll
          itself, masking the page-mid-flight visually. The user
          perceives the destination as having "appeared" rather than
          scrolled. */}
      <motion.div
        className="absolute inset-0 bg-liquirice"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.92, 0] }}
        transition={{ duration: 0.45, times: [0, 0.5, 1], delay: 0.35 }}
      />

      {/* ── Corner reticle brackets (450-1100ms) ──
          Snap inward from each corner, hold for ~200ms, then fade —
          the "lock-on" beat at the end of the dive. Mirrors the
          static HUD brackets that live on the hero so the user
          recognises the visual rhyme. */}
      {reticleCorners.map((c, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 20 20"
          className={`absolute ${c.className} w-7 h-7 text-jade`}
          style={{
            rotate: c.rotate,
            filter: "drop-shadow(0 0 10px rgba(0,217,146,0.9))",
          }}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{
            opacity: [0, 0, 1, 1, 0],
            scale: [1.5, 1.5, 1, 1, 1],
          }}
          transition={{
            duration: 0.85,
            times: [0, 0.45, 0.6, 0.75, 1],
            delay: 0.45,
          }}
        >
          <path
            d="M2 8 L2 2 L8 2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="2" cy="2" r="1.4" fill="currentColor" />
        </motion.svg>
      ))}
    </motion.div>
  )
}
