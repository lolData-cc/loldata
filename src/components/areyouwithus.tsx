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

// Heights — the membership band, then the taller pricing view. The wrapper
// animates between the two so the page below resettles on swap.
const JAX_HEIGHT_MD = 400
const PRICING_HEIGHT = 720

export const Jax = () => {
  const reduceMotion = useReducedMotion()

  const ref = React.useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  // Swap state — when true the pricing panel is in view, the Jax
  // CTA is off-screen to the left. The two are mounted concurrently
  // during the slide so the user reads it as a horizontal shift,
  // not a wait-then-mount.
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

  return (
    <motion.div
      ref={ref}
      // Transparent panel — page bg shows directly through. The
      // wrapper's height animates between the two panel heights so
      // the page below resettles into the new layout.
      className="relative bg-transparent w-screen left-1/2 -translate-x-1/2 overflow-hidden"
      initial={{ opacity: 0, height: JAX_HEIGHT_MD }}
      animate={
        inView
          ? { opacity: 1, height: showPricing ? PRICING_HEIGHT : JAX_HEIGHT_MD }
          : { opacity: 0, height: JAX_HEIGHT_MD }
      }
      transition={{ duration: 0.45, ease: EASE_BRAND }}
    >
      <AnimatePresence initial={false}>
        {!showPricing && (
          <motion.div
            key="jax"
            className="absolute inset-0 w-full"
            initial={{ x: 0 }}
            animate={{ x: 0 }}
            // Slide left and out of the viewport — `vw` keeps the
            // distance correct on any screen width.
            exit={{ x: "-100vw" }}
            transition={{ duration: 0.45, ease: EASE_BRAND }}
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
            initial={{ x: "100vw" }}
            animate={{ x: 0 }}
            exit={{ x: "100vw" }}
            transition={{ duration: 0.45, ease: EASE_BRAND }}
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
      {/* breathing jade glow behind Jax */}
      <motion.div
        aria-hidden
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 42% 62% at 22% 62%, rgba(0,217,146,0.18) 0%, transparent 70%)",
        }}
        animate={reduceMotion ? { opacity: 0.9 } : { opacity: [0.6, 1, 0.6] }}
        transition={
          reduceMotion ? undefined : { duration: 8, ease: "easeInOut", repeat: Infinity }
        }
      />

      {/* Character silhouette — anchored bottom-left, slightly over-scaled so
          it crops dramatically. */}
      <motion.img
        className="hidden md:block absolute left-[19%] bottom-0 -translate-x-1/2 h-full w-[36%] object-contain object-bottom z-[1] pointer-events-none select-none"
        alt=""
        aria-hidden
        src="/img/areuwithus_2.png"
        draggable={false}
        initial={{ opacity: 0, x: -24, scale: 1.04 }}
        animate={inView ? { opacity: 0.92, x: 0, scale: 1 } : { opacity: 0, x: -24, scale: 1.04 }}
        transition={{ duration: 0.9, ease: EASE_BRAND, delay: 0.1 }}
        style={{
          filter: "brightness(1.1) saturate(1.08) drop-shadow(0 0 28px rgba(0,217,146,0.3))",
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
              <span className="text-jade" style={{ textShadow: "0 0 38px rgba(0,217,146,0.4)" }}>
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
// Re-applies the page's standard width constraint (xl:w-[65%]) which
// the full-bleed Jax wrapper escapes from. PricingPlans renders its
// cards at w-[25%] of its parent — in the rest of the site that
// parent is the 65% page container, so cards are ~16% of viewport.
// Inside the full-bleed Jax wrapper without this re-constraint, the
// cards balloon to 25% of full viewport width. The scoped <style>
// also shrinks the giant `PRICING` title (164px hard-coded inside
// PricingPlans) so it doesn't dwarf the now-smaller cards.
//
// No back/close affordance — the parent ESC handler still works for
// keyboard users, but per design the inline pricing is treated as a
// committed view: the only way back to the Jax CTA is via the URL.
function PricingPanel() {
  return (
    <div className="relative w-full h-full overflow-y-auto">
      <div className="pricing-inline mx-auto w-full xl:w-[65%] min-[2560px]:w-[55%] xl:px-0 px-4">
        {/* Scoped overrides for the inline (homepage) layout only —
            the standalone /pricing route is untouched. */}
        <style>{`
          .pricing-inline span.font-gtmono {
            font-size: 96px !important;
            line-height: 1 !important;
            height: 5rem !important;
          }
          .pricing-inline .relative.bottom-8 { bottom: 1rem !important; }
        `}</style>
        <PricingPlans />
      </div>
    </div>
  )
}
