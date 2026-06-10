"use client"

import {
  ChartNoAxesCombined,
  ChevronRight,
  Rocket,
  Sword,
  type LucideIcon,
} from "lucide-react"
import { Separator } from "./ui/separator"
import { motion, useInView, type Variants } from "framer-motion"
import { useEffect, useRef, useState } from "react"

// Brand easing — shared with the hero / search dialog so the Learn
// section's reveals feel native to the rest of the site rhythm.
const EASE_BRAND = [0.22, 1, 0.36, 1] as const

// ─── Typing headline on view ─────────────────────────────────────────
// Unchanged from the previous implementation — the typing rhythm is
// already part of the brand vocabulary.
function TypingOnInView({
  text,
  speed = 50,
  className = "",
}: {
  text: string
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement | null>(null)
  const isInView = useInView(ref, { once: true, amount: 0.55 })
  const [typed, setTyped] = useState("")
  const runId = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isInView) return
    const id = ++runId.current
    let i = 0
    setTyped("")

    const step = () => {
      if (runId.current !== id) return
      const ch = text.charAt(i)
      if (!ch) {
        timerRef.current = null
        return
      }
      setTyped((prev) => prev + ch)
      i += 1
      timerRef.current = window.setTimeout(step, speed)
    }

    timerRef.current = window.setTimeout(step, speed)

    return () => {
      runId.current++
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isInView, text, speed])

  const done = typed.length === text.length

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      <span>{typed}</span>
      <span
        className={`ml-1 inline-block w-[1ch] select-none ${
          done ? "opacity-0" : "opacity-100 animate-pulse"
        }`}
      >
        |
      </span>
    </h1>
  )
}

// ─── Feature data model ──────────────────────────────────────────────
type BulletNode =
  | { kind: "icon"; icon: LucideIcon }
  | { kind: "img"; src: string; alt: string }

type Feature = {
  icon: LucideIcon
  title: string
  body: string
  bullets: { label: string; node: BulletNode }[]
}

// Shared icon style for bullet-row glyphs.
const BULLET_ICON_CLS =
  "w-4 h-4 mx-2 flex-shrink-0 text-[#008C5A] fill-[#008C5A]"

const FEATURES: Feature[] = [
  {
    icon: ChartNoAxesCombined,
    title: "Let the AI Coach help you",
    body: "Train smarter with our AI coach. It tracks your games, identifies weaknesses, and delivers daily reports with clear steps to improve.",
    bullets: [
      { label: "Daily performance-based reports", node: { kind: "icon", icon: Rocket } },
      {
        label: "Custom gold optimization",
        node: { kind: "img", src: "img/icons/coins.svg", alt: "Coins icon" },
      },
      { label: "ITEMIZATION ANALYSIS", node: { kind: "icon", icon: Sword } },
    ],
  },
  {
    icon: ChartNoAxesCombined,
    title: "The AI chatbot is always ready",
    body: "Ask anything, anytime—matchups, objective timing, wave states, or item swaps. Our 24/7 AI turns your questions into clear, actionable calls.",
    bullets: [
      { label: "Daily performance-based reports", node: { kind: "icon", icon: Rocket } },
      {
        label: "Custom gold optimization",
        node: { kind: "img", src: "img/icons/coins.svg", alt: "Coins icon" },
      },
      { label: "ITEMIZATION ANALYSIS", node: { kind: "icon", icon: Sword } },
    ],
  },
]

// ─── Animation variants ──────────────────────────────────────────────
const VIEWPORT = { once: true, amount: 0.45 } as const

// Parent variant: hosts the staggered timing for its children.
const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
}

// Header row (icon + title + chevron) — rides the slide-in.
const headerVariants: Variants = {
  hidden: { opacity: 0, x: -24, filter: "blur(4px)" },
  show: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: EASE_BRAND },
  },
}

// Body paragraph — fades up after the header settles.
const bodyVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_BRAND },
  },
}

// Individual bullet — used inside the bullet container's own stagger.
const bulletVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: EASE_BRAND },
  },
}

// Nested container for the bullet rows — stagger inside the larger
// stagger so the bullets cascade independently of body text.
const bulletListVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

// ─── Render helpers ──────────────────────────────────────────────────
function BulletGlyph({ node }: { node: BulletNode }) {
  if (node.kind === "img") {
    return (
      <img
        src={node.src}
        alt={node.alt}
        className="w-4 h-4 mx-2 flex-shrink-0"
      />
    )
  }
  const Icon = node.icon
  return <Icon className={BULLET_ICON_CLS} />
}

/**
 * A single feature row (icon box + title + body + bullets), animated
 * with the shared variants. Used for both feature columns in the
 * desktop layout AND for the mobile stack — keeps the choreography
 * consistent across breakpoints.
 */
function FeatureBlock({
  feature,
  className,
  mobile = false,
}: {
  feature: Feature
  className?: string
  mobile?: boolean
}) {
  const Icon = feature.icon

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {/* Header row: icon box + title + chevron affordance. */}
      <motion.div variants={headerVariants}>
        <div className="group flex gap-4 items-center cursor-clicker">
          {/* Icon box — softens on hover with a jade glow and a
              gentle scale-up. transition-all so the change is
              smooth, not snap. */}
          <div
            className="
              z-10 bg-jade/20 w-6 h-6 flex-shrink-0
              flex items-center justify-center rounded-[3px]
              transition-all duration-300
              group-hover:bg-jade/35
              group-hover:scale-110
              group-hover:shadow-[0_0_16px_rgba(0,217,146,0.45)]
            "
          >
            <Icon
              aria-hidden
              className="text-jade size-5 pointer-events-none transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="flex items-center text-flash/90 gap-1.5 transition-colors duration-300 group-hover:text-flash">
            <span className={mobile ? "text-lg" : "text-lg lg:text-xl"}>
              {feature.title}
            </span>
            <ChevronRight
              className="
                w-4 h-4 transform transition-transform duration-300
                group-hover:translate-x-1.5 group-hover:text-jade
              "
            />
          </div>
        </div>
      </motion.div>

      {/* Body paragraph. */}
      <motion.div
        variants={bodyVariants}
        className={
          mobile
            ? "ml-9 text-flash/75 font-geist font-extralight text-[14px]"
            : "w-full lg:w-[45%] ml-10 text-flash/75 font-geist font-extralight text-[14px]"
        }
      >
        {feature.body}
      </motion.div>

      {/* Bullets — staggered cascade. */}
      <motion.div
        variants={bulletListVariants}
        className={
          mobile
            ? "ml-9 pt-3"
            : "w-full lg:w-[45%] ml-10 text-[14px] pt-4"
        }
      >
        <div className="space-y-2 text-sm text-flash/30 uppercase font-jetbrains">
          {feature.bullets.map((b, idx) => (
            <motion.div key={idx} variants={bulletVariants}>
              <Separator className="w-full bg-flash/10" />
              <div className="flex items-center pt-2">
                <BulletGlyph node={b.node} />
                {b.label}
              </div>
            </motion.div>
          ))}
          {/* Trailing rule for visual closure. */}
          <motion.div variants={bulletVariants}>
            <Separator className="w-full bg-flash/10" />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Decorative "@" rail ─────────────────────────────────────────────
// The previous version had 40 static glyphs with a vertical fade.
// Same shape, now with a whileInView opacity ramp so the column
// reads as drawn in rather than always-there.
function DecorativeAtRail({ length = 40 }: { length?: number }) {
  return (
    <motion.div
      className="hidden lg:flex flex-col items-center h-[600px]"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.2, ease: EASE_BRAND, delay: 0.2 }}
    >
      {Array.from({ length }).map((_, i) => {
        const opacity = 1 - i / length
        return (
          <span
            key={i}
            style={{ opacity }}
            className="text-flash/30 select-none"
          >
            @
          </span>
        )
      })}
    </motion.div>
  )
}

// ─── Main component ──────────────────────────────────────────────────
export function LearnPageFeature() {
  return (
    <div className="relative">
      {/* Ambient backdrop — faint jade dot-grid behind everything. It
          sits below the actual content (-z-10) so it never catches
          a click, and the radial mask keeps it concentrated under
          the section title. */}
      <div
        aria-hidden
        className="
          absolute inset-x-0 top-0 h-[1100px] -z-10
          pointer-events-none opacity-[0.07]
          [background-image:radial-gradient(rgba(0,217,146,0.6)_1px,transparent_1px)]
          [background-size:22px_22px]
          [mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)]
          [-webkit-mask-image:radial-gradient(ellipse_at_center,black_15%,transparent_70%)]
        "
      />

      <TypingOnInView
        text="Explore lolData features"
        speed={50}
        className="text-xl sm:text-2xl md:text-3xl text-jade py-6 font-scifi"
      />

      {/* Section divider with the same full-bleed trick the hero uses. */}
      <Separator className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" />

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex justify-between px-6 lg:px-24">
        <div className="relative w-full h-[1000px]">
          {/* Vertical fade-line separator running down the column. */}
          <Separator
            className="
              w-[50%]
              h-[1000px]
              border-x border-transparent
              [border-image-slice:1]
              [border-image-source:linear-gradient(to_bottom,currentColor,transparent)]
              text-flash/20
            "
          />

          {/* Two feature blocks, absolute-positioned at fixed Y so the
              vertical fade-line acts as a connective spine between
              them. Both share the same animation choreography. */}
          <FeatureBlock
            feature={FEATURES[0]}
            className="absolute top-24 right-full -left-3 z-10 w-full space-y-3"
          />
          <FeatureBlock
            feature={FEATURES[1]}
            className="absolute top-[550px] right-full -left-3 z-10 w-full space-y-3"
          />
        </div>
        <DecorativeAtRail />
      </div>

      {/* ── Mobile layout ──
          Now also animates on view (was static in the previous
          version). Each feature block uses the same FeatureBlock
          component, so the choreography matches desktop. */}
      <div className="md:hidden px-4 py-8 space-y-10">
        <FeatureBlock feature={FEATURES[0]} mobile className="space-y-3" />
        <FeatureBlock feature={FEATURES[1]} mobile className="space-y-3" />
      </div>
    </div>
  )
}
