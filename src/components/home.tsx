"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { FlickeringGrid } from "./ui/flickering-grid"
import { Separator } from "./ui/separator"

type Props = { onDiscover?: () => void }

const TITLE = "The future of Improvement"
const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&+*-=<>/"

const DECRYPT_DURATION = 1200
const SUBTITLE_DELAY_AFTER_DECRYPT = 300
const BUTTON_DELAY_AFTER_SUBTITLE = 450

// ── Floating particles ──────────────────────────────────────────────
const PARTICLE_COUNT = 18

type Particle = {
  id: number
  x: number      // % from left
  startY: number // starting Y offset (vh)
  size: number   // px
  duration: number // seconds
  delay: number  // seconds
  opacity: number
  char: string   // ◈ or ◆
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

// ── Component ───────────────────────────────────────────────────────
export const HomeYasuo: React.FC<Props> = ({ onDiscover }) => {
  const [titleText, setTitleText] = useState(TITLE)
  const [showSubtitle, setShowSubtitle] = useState(false)
  const [showButton, setShowButton] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const heroRef = useRef<HTMLDivElement>(null)
  const particles = useMemo(generateParticles, [])

  // Mouse tracking for spotlight
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePos({ x, y })
  }, [])

  // Decrypt title effect
  useEffect(() => {
    let animationFrame: number
    let start: number | null = null

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp
      const elapsed = timestamp - start
      const rawT = Math.min(elapsed / DECRYPT_DURATION, 1)
      const t = Math.pow(rawT, 0.8)
      const revealedChars = Math.floor(TITLE.length * t)
      let next = ""

      for (let i = 0; i < TITLE.length; i++) {
        if (i < revealedChars) {
          next += TITLE[i]
        } else {
          next += CHARSET[Math.floor(Math.random() * CHARSET.length)]
        }
      }

      setTitleText(next)

      if (rawT < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        setTitleText(TITLE)
        setTimeout(() => setShowSubtitle(true), SUBTITLE_DELAY_AFTER_DECRYPT)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [])

  // Show button after subtitle
  useEffect(() => {
    if (showSubtitle) {
      const timeout = setTimeout(() => setShowButton(true), BUTTON_DELAY_AFTER_SUBTITLE)
      return () => clearTimeout(timeout)
    }
  }, [showSubtitle])

  const handleCyberpunkScroll = () => {
    const glitchOverlay = document.createElement("div")
    glitchOverlay.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 9999;
      background: linear-gradient(0deg, transparent 0%, rgba(0, 217, 146, 0.1) 50%, transparent 100%);
      animation: heroScanline 0.6s ease-out;
    `
    const style = document.createElement("style")
    style.textContent = `
      @keyframes heroScanline { 0% { transform: translateY(-100%); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(100%); opacity: 0; } }
      @keyframes heroGlitch { 0%,100%{transform:translate(0)}20%{transform:translate(-2px,2px)}40%{transform:translate(-2px,-2px)}60%{transform:translate(2px,2px)}80%{transform:translate(2px,-2px)} }
    `
    document.head.appendChild(style)
    document.body.appendChild(glitchOverlay)
    document.body.style.animation = "heroGlitch 0.3s ease-in-out"

    const targetElement = document.getElementById("learn")
    if (targetElement) {
      const startPosition = window.pageYOffset
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset
      const distance = targetPosition - startPosition
      const duration = 800
      let start: number | null = null

      const easeInOutCubic = (t: number): number =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

      const animation = (currentTime: number) => {
        if (start === null) start = currentTime
        const timeElapsed = currentTime - start
        const progress = Math.min(timeElapsed / duration, 1)
        const jitter = Math.random() * 2 - 1
        window.scrollTo(0, startPosition + distance * easeInOutCubic(progress) + jitter)
        if (timeElapsed < duration) {
          requestAnimationFrame(animation)
        } else {
          setTimeout(() => { glitchOverlay.remove(); document.body.style.animation = "" }, 100)
        }
      }
      requestAnimationFrame(animation)
    }

    setTimeout(() => { glitchOverlay.remove(); style.remove() }, 1000)
    if (onDiscover) onDiscover()
  }

  return (
    <div className="relative w-full">
      <div
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative w-full mx-auto max-w-screen-2xl h-[70vh] md:h-[80vh] lg:h-[93vh] overflow-hidden rounded-lg"
      >
        {/* ── Layer 0: Flickering grid ── */}
        <FlickeringGrid
          className="absolute inset-0 z-0 [mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
          squareSize={4}
          gridGap={6}
          color="#00d992"
          maxOpacity={0.5}
          flickerChance={0.1}
          width={1388}
          height={800}
        />

        {/* ── Layer 1: Yasuo ── */}
        <img
          src="/img/Yasuo.png"
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-top z-10 pointer-events-none select-none opacity-80"
        />

        {/* ── Layer 2: Mouse-tracking spotlight ── */}
        <div
          className="absolute inset-0 z-[11] pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 400px at ${mousePos.x}% ${mousePos.y}%, rgba(0,217,146,0.08) 0%, transparent 70%)`,
          }}
        />

        {/* ── Layer 3: Jade tint ── */}
        <div className="absolute inset-0 z-[12] bg-jade/[0.03] mix-blend-color pointer-events-none" />

        {/* ── Layer 4: Scanlines ── */}
        <div
          className="absolute inset-0 z-[13] pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
          }}
        />

        {/* ── Layer 5: Radial vignette ── */}
        <div className="absolute inset-0 z-[14] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(4,10,12,0.85)_70%,rgba(4,10,12,1)_100%)]" />

        {/* ── Layer 6: Floating ◈ particles ── */}
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


        {/* ── Layer 8: Content ── */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-4 select-none">

          {/* Small top label */}
          <div
            className={`
              flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-jade/70
              transition-all duration-700
              ${showSubtitle ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
            `}
          >
            <span className="text-jade/40">◈</span>
            <span>League Analytics Platform</span>
            <span className="text-jade/40">◈</span>
          </div>

          {/* Main title — big and bold */}
          <div
            className="
              font-jetbrains font-bold text-flash/95
              text-4xl sm:text-5xl md:text-6xl lg:text-7xl
              leading-[1.1] text-center px-4
              [text-shadow:0_0_60px_rgba(0,217,146,0.25),0_0_120px_rgba(0,217,146,0.1)]
            "
            aria-label={TITLE}
          >
            {titleText.split(" ").map((word, i) => (
              <span key={i}>
                {i > 0 && " "}
                {word === "Improvement" || word === TITLE.split(" ").at(-1) ? (
                  <span className="text-jade [text-shadow:0_0_40px_rgba(0,217,146,0.5),0_4px_32px_rgba(0,217,146,0.3)]">
                    {titleText.split(" ").at(-1)}
                  </span>
                ) : (
                  word
                )}
              </span>
            ))}
          </div>

          {/* Horizontal accent line */}
          <div
            className={`
              w-24 h-[1px] transition-all duration-700 delay-100
              ${showSubtitle ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
            `}
            style={{ background: "linear-gradient(90deg, transparent, rgba(0,217,146,0.5), transparent)" }}
          />

          {/* Subtitle */}
          <p
            className={`
              font-mono text-flash/70 text-xs sm:text-sm md:text-base
              text-center leading-relaxed px-4 tracking-wide
              transition-all duration-600
              ${showSubtitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}
            `}
          >
            The new frontier of League of Legends improvement
            <br />
            featuring your personal <span className="text-jade drop-shadow-[0_0_8px_rgba(0,217,146,0.3)]">AI assistant</span>
          </p>

          {/* Rhomboid discover button */}
          <button
            onClick={handleCyberpunkScroll}
            className={`
              group relative mt-4 cursor-clicker
              transition-all duration-600
              ${showButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            {/* Rotated diamond bg */}
            <span className="
              block w-12 h-12 rotate-45 rounded-[4px] border border-jade/30
              bg-jade/[0.06] transition-all duration-300
              group-hover:border-jade/70 group-hover:bg-jade/15
              group-hover:shadow-[0_0_30px_rgba(0,217,146,0.3),inset_0_0_12px_rgba(0,217,146,0.1)]
              shadow-[0_0_12px_rgba(0,217,146,0.1)]
            ">
              {/* Scanlines inside */}
              <span
                className="absolute inset-0 rounded-[3px] opacity-20 group-hover:opacity-40 transition-opacity"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.4) 3px, rgba(0,217,146,0.4) 4px)"
                }}
              />
            </span>
            {/* Counter-rotated chevron */}
            <span className="absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 10 8"
                className="w-4 h-4 text-jade transition-transform duration-300 group-hover:translate-y-[2px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1,2 5,6 9,2" />
              </svg>
            </span>
            {/* Label below */}
            <span className="
              absolute -bottom-6 left-1/2 -translate-x-1/2
              font-mono text-[8px] tracking-[0.3em] text-jade/30 uppercase whitespace-nowrap
              group-hover:text-jade/60 transition-colors
            ">
              Discover
            </span>
          </button>
        </div>

        {/* ── Inline keyframes ── */}
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
    </div>
  )
}
