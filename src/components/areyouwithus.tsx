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
import { Button } from "./ui/button"
import { FlipText } from "@/components/ui/flip-text"
import { ArrowRight } from "lucide-react"
import { PricingPlans } from "./pricingplans"

const EASE_BRAND = [0.22, 1, 0.36, 1] as const

// Heights — Jax stays at its hero strip height; pricing needs the
// extra room for the 400px-tall plan cards plus the big "PRICING"
// title above them. Wrapping container animates between the two so
// the page below settles into place when the swap happens.
const JAX_HEIGHT_MD = 308
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
      initial={{ opacity: 0 }}
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
  return (
    <div className="relative w-full h-full">
      {/* Compact centred jade glow. */}
      <motion.div
        aria-hidden
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 40% 40% at 50% 50%, rgba(0,217,146,0.22) 0%, transparent 100%)",
        }}
        animate={reduceMotion ? { opacity: 0.9 } : { opacity: [0.7, 1, 0.7] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 7, ease: "easeInOut", repeat: Infinity }
        }
      />

      {/* Character silhouette. */}
      <motion.img
        className="hidden md:block w-[38%] absolute left-[26%] -translate-x-1/2 h-full object-contain object-bottom z-30 pointer-events-none select-none"
        alt="Jax silhouette"
        src="/img/areuwithus_2.png"
        draggable={false}
        initial={{ opacity: 0, x: -24, scale: 1.04 }}
        animate={
          inView
            ? { opacity: 0.95, x: 0, scale: 1 }
            : { opacity: 0, x: -24, scale: 1.04 }
        }
        transition={{ duration: 0.9, ease: EASE_BRAND, delay: 0.15 }}
        style={{
          filter:
            "brightness(1.15) saturate(1.1) drop-shadow(0 0 24px rgba(0,217,146,0.35))",
        }}
      />

      {/* Content block. */}
      <div className="absolute inset-0 z-[999] flex flex-col items-center justify-center md:items-end md:justify-center md:pr-[32%] text-white space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.25 }}
          className="flex flex-col items-center md:items-end gap-1.5"
        >
          <FlipText className="text-2xl md:text-4xl">Are you with us?</FlipText>

          <motion.div
            aria-hidden
            className="h-[1px] w-32 md:w-44 origin-right"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(0,217,146,0.6) 60%, rgba(0,217,146,0.95) 100%)",
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={
              inView ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }
            }
            transition={{ duration: 0.7, ease: EASE_BRAND, delay: 0.5 }}
          />
        </motion.div>

        {/* Buttons. */}
        <motion.div
          className="flex items-center gap-3 md:gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.55 }}
        >
          {/* Primary CTA — onClick triggers the inline slide swap
              instead of routing to /pricing. */}
          <motion.div whileHover={reduceMotion ? undefined : "hover"}>
            <Button
              variant="solid"
              className="text-xs md:text-sm group"
              onClick={onBecomeMember}
            >
              <span className="flex items-center gap-2">
                BECOME A MEMBER
                <motion.span
                  aria-hidden
                  className="inline-flex"
                  variants={{
                    hover: {
                      x: 4,
                      transition: { duration: 0.22, ease: EASE_BRAND },
                    },
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </motion.span>
              </span>
            </Button>
          </motion.div>

          <motion.div
            whileHover={
              reduceMotion ? undefined : { y: -1, transition: { duration: 0.2 } }
            }
          >
            <Button
              className="border-flash/10 border text-flash/40 text-xs md:text-sm hover:text-flash/80 hover:border-flash/30 transition-colors duration-200"
              variant="purchase"
            >
              CONTACT US
            </Button>
          </motion.div>
        </motion.div>
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
