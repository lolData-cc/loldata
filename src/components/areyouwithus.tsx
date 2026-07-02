// src/components/areyouwithus.tsx
//
// "Are you with us?" — the membership CTA banner sitting between the
// feature sections and the streamers carousel.
//
// Interaction: clicking "BECOME A MEMBER" no longer navigates to
// /pricing. Instead the Jax CTA slides off-screen to the left while
// the PricingPlans component slides in from the right, in parallel.
// A close button in the pricing panel slides them back.
//
// Image-as-silhouette: areuwithus_2.png already ships with a true
// alpha channel, so the character drops onto the page bg with no
// mask / blend-mode workarounds.

import * as React from "react"
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { PricingPlans } from "./pricingplans"

const EASE_BRAND = [0.22, 1, 0.36, 1] as const

// The CTA band (400px) and the taller pricing view (640px) have different
// natural heights, so the panel animates its height on swap — anchored at the
// TOP, growing downward. The two views CROSS-FADE rather than sliding sideways:
// a horizontal slide combined with the height change read as an ugly diagonal
// drop. 640px holds the pricing cards (~622px) without scrolling on desktop.
const JAX_HEIGHT = 400
const PRICING_HEIGHT = 640

export const Jax = () => {
  const reduceMotion = useReducedMotion()

  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  // Swap state — when true the pricing view is shown in place of the CTA.
  const [showPricing, setShowPricing] = React.useState(false)

  // ESC key returns to the Jax CTA — small but expected affordance
  // since the swap doesn't change the URL.
  React.useEffect(() => {
    if (!showPricing) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowPricing(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [showPricing])

  // When the pricing opens, the (taller) panel grows downward — left alone it
  // would sit low in the viewport. Gently re-center it once it has expanded so
  // it always reads as a focused swap, never as content dropping below the CTA.
  React.useEffect(() => {
    if (!showPricing) return
    const id = setTimeout(
      () => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      260
    )
    return () => clearTimeout(id)
  }, [showPricing])

  return (
    <motion.div
      ref={ref}
      // Transparent panel — page bg shows directly through. Height animates
      // between the two views (anchored at the top → grows downward).
      className="relative bg-transparent w-screen left-1/2 -translate-x-1/2 overflow-hidden"
      initial={{ opacity: 0, height: JAX_HEIGHT }}
      animate={
        inView
          ? { opacity: 1, height: showPricing ? PRICING_HEIGHT : JAX_HEIGHT }
          : { opacity: 0, height: JAX_HEIGHT }
      }
      transition={{ duration: 0.5, ease: EASE_BRAND }}
    >
      <AnimatePresence initial={false}>
        {!showPricing && (
          <motion.div
            key="jax"
            // Pinned to the top 400px so it fades out IN PLACE — it never drifts
            // down as the panel grows.
            className="absolute inset-x-0 top-0 h-[400px] w-full"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_BRAND }}
          >
            <JaxCta
              inView={inView}
              reduceMotion={reduceMotion}
              onBecomeMember={() => setShowPricing(true)}
            />
          </motion.div>
        )}

        {showPricing && (
          <motion.div
            key="pricing"
            className="absolute inset-0 w-full"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.45, ease: EASE_BRAND, delay: 0.1 }}
          >
            <PricingPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Jax CTA inner content ──────────────────────────────────────────
// Extracted as a sub-component purely for readability — the swap
// orchestration above is busy enough without 100 lines of inline JSX.
function JaxCta({
  inView,
  reduceMotion,
  onBecomeMember,
}: {
  inView: boolean
  reduceMotion: boolean | null
  onBecomeMember: () => void
}) {
  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: { duration: 0.6, ease: EASE_BRAND, delay },
  })

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* faint jade dot-grid, concentrated under the silhouette */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] [background-image:radial-gradient(rgba(0,217,146,0.7)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_24%_60%,black_5%,transparent_68%)] [-webkit-mask-image:radial-gradient(ellipse_at_24%_60%,black_5%,transparent_68%)]"
      />
      {/* breathing jade glow behind Jax — soft, low-intensity wash */}
      <motion.div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 38% 55% at 22% 64%, rgba(0,217,146,0.10) 0%, transparent 72%)",
        }}
        animate={reduceMotion ? { opacity: 0.55 } : { opacity: [0.4, 0.62, 0.4] }}
        transition={
          reduceMotion ? undefined : { duration: 8, ease: "easeInOut", repeat: Infinity }
        }
      />

      {/* Character — fully CONTAINED (no crop) and bottom-anchored, with a soft
          fade where he meets the section floor so there's no hard "cut" line. */}
      <motion.img
        className="hidden md:block absolute left-[20%] bottom-0 -translate-x-1/2 h-full w-[40%] object-contain object-bottom z-[1] pointer-events-none select-none [mask-image:linear-gradient(to_bottom,#000_85%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,#000_85%,transparent)]"
        alt=""
        aria-hidden
        src="/img/areuwithus_2.png"
        draggable={false}
        initial={{ opacity: 0, x: -20 }}
        animate={inView ? { opacity: 0.96, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ duration: 0.9, ease: EASE_BRAND, delay: 0.1 }}
        style={{
          filter: "brightness(1.03) saturate(1.02) drop-shadow(0 0 20px rgba(0,217,146,0.14))",
        }}
      />
      {/* legibility scrim — clears the right side where the copy lives */}
      <div
        aria-hidden
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(4,10,12,0.55) 0%, rgba(4,10,12,0.12) 30%, transparent 48%)",
        }}
      />

      {/* Content — right-aligned on desktop so it sits clear of Jax. */}
      <div className="relative z-10 h-full">
        <div className="mx-auto h-full max-w-[1240px] px-6 md:px-10 flex items-center justify-end">
          <div className="flex w-full flex-col items-start text-left md:max-w-[540px] md:items-end md:text-right">
            <motion.div {...reveal(0.1)} className="mb-4 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-jade" style={{ boxShadow: "0 0 8px #00d992" }} />
              <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.34em] text-jade/80">
                Membership
              </span>
            </motion.div>

            <motion.h2
              {...reveal(0.18)}
              className="font-chakrapetch font-bold text-flash leading-[0.98] tracking-tight text-[clamp(34px,5vw,58px)]"
            >
              Are you{" "}
              <span className="text-jade" style={{ textShadow: "0 0 28px rgba(0,217,146,0.28)" }}>
                with us
              </span>
              ?
            </motion.h2>

            <motion.p {...reveal(0.28)} className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-flash/55">
              One membership unlocks the AI coach, unlimited scouting and every
              analytic the Rift can give you — no limits.
            </motion.p>

            <motion.div {...reveal(0.38)} className="mt-7 flex items-center gap-5">
              <button
                onClick={onBecomeMember}
                className="group inline-flex items-center gap-2 h-[50px] px-6 rounded-xl bg-jade text-liquirice font-chakrapetch text-[13px] font-bold uppercase tracking-[0.1em] cursor-clicker transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_30px_-6px_rgba(0,217,146,0.6)]"
              >
                Become a member
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <Link
                to="/contact"
                className="font-chakrapetch text-[12px] font-bold uppercase tracking-[0.12em] text-flash/55 cursor-clicker transition-colors duration-200 hover:text-flash/90"
              >
                Contact us
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pricing panel wrapper ──────────────────────────────────────────
// PricingPlans is now self-constraining (responsive grid + a clamp-sized
// title), so this is just the scroll container for the inline swap — no
// width re-constraint or scoped font overrides needed anymore. The parent
// ESC handler returns to the Jax CTA for keyboard users.
function PricingPanel() {
  return (
    // flex-col + m-auto vertically centers the cards when they fit (desktop) and
    // falls back to a natural top-aligned scroll when they don't (phones).
    // no-scrollbar hides the native (white) scrollbar that would otherwise flash
    // mid-swap while the panel is briefly shorter than the cards.
    <div className="flex h-full w-full flex-col overflow-y-auto no-scrollbar">
      <div className="m-auto w-full">
        <PricingPlans />
      </div>
    </div>
  )
}
