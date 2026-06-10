// src/pages/billingsuccess.tsx
//
// Landing page after a successful Stripe Checkout redirect. Stripe
// sends the user here with `?session_id=cs_...`. Plan-update happens
// asynchronously in the backend webhook handler, so this page polls
// `refreshProfile()` until `plan` flips from "free"/null to the new
// paid plan, then shows the celebration state.

import * as React from "react"
import { Link, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Check, ArrowRight } from "lucide-react"
import { useAuth } from "@/context/authcontext"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { BorderBeam } from "@/components/ui/border-beam"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const EASE_BRAND = [0.22, 1, 0.36, 1] as const

// Glass recipe shared with the rest of the site.
const glassDark = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/35 backdrop-blur-lg saturate-150",
  "shadow-[0_20px_60px_rgba(0,0,0,0.65),inset_0_0_0_0.5px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]"
)

// Poll cadence + cap. Webhook delivery from Stripe is normally a few
// hundred ms but we leave a generous ceiling for slow networks.
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 30_000

export default function BillingSuccessPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { plan, refreshProfile } = useAuth()

  // Phase state: poll → ready → timeout-fallback. Each maps to a
  // distinct visual treatment so the user always knows what's going
  // on. `timeoutFallback` is the "everything's probably fine but the
  // webhook hasn't landed yet" state — no error, just patience.
  const [phase, setPhase] = React.useState<"polling" | "ready" | "timeout">(
    "polling"
  )

  // Active plan AT MOUNT — used as the baseline. If `plan` flips to
  // anything ELSE during polling, we know the webhook landed.
  const initialPlanRef = React.useRef<string | null | undefined>(plan)

  React.useEffect(() => {
    // Already on a paid plan (e.g., page refresh after success) →
    // skip polling entirely.
    if (plan && plan !== "free") {
      setPhase("ready")
      return
    }

    let cancelled = false
    const startedAt = Date.now()

    const tick = async () => {
      if (cancelled) return
      await refreshProfile()
    }

    // Kick off an immediate refresh + a recurring poll.
    tick()
    const interval = window.setInterval(tick, POLL_INTERVAL_MS)
    const timeout = window.setTimeout(() => {
      if (cancelled) return
      window.clearInterval(interval)
      // If we reach the cap without seeing the plan flip, fall back
      // to the "we'll catch up shortly" message.
      setPhase((prev) => (prev === "ready" ? prev : "timeout"))
    }, POLL_TIMEOUT_MS)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.clearTimeout(timeout)
      void startedAt // suppress unused
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Watch for plan flip → transition to ready.
  React.useEffect(() => {
    if (plan && plan !== "free" && plan !== initialPlanRef.current) {
      setPhase("ready")
    }
  }, [plan])

  const isReady = phase === "ready"
  const isTimeout = phase === "timeout"
  const displayPlan =
    plan && plan !== "free" ? plan.toUpperCase() : "PREMIUM"

  return (
    <div className="relative min-h-[80vh] py-12 px-4">
      {/* Ambient jade backdrop, same vocabulary as the hero. */}
      <FlickeringGrid
        className="absolute inset-0 -z-10 opacity-40 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]"
        squareSize={4}
        gridGap={6}
        color="#00d992"
        maxOpacity={0.5}
        flickerChance={0.08}
      />

      <div className="mx-auto max-w-2xl">
        <motion.div
          className={cn(glassDark, "p-8 md:p-12 text-center")}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_BRAND }}
        >
          <BorderBeam duration={9} size={180} />

          {/* Status tag at the top. */}
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-sm bg-jade/10 border border-jade/30 text-jade font-mono text-[10px] tracking-[0.25em] uppercase mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <span
              className={cn(
                "inline-block w-1.5 h-1.5 rounded-full bg-jade",
                !isReady && "animate-pulse"
              )}
            />
            {isReady
              ? "CONFIRMED"
              : isTimeout
                ? "SYNCING…"
                : "AWAITING WEBHOOK…"}
          </motion.div>

          {/* Big jade check mark on ready, otherwise a quiet spinner-ish glyph. */}
          <motion.div
            className="mx-auto mb-6 relative w-20 h-20 flex items-center justify-center"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: EASE_BRAND }}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 rounded-full",
                isReady ? "bg-jade/20" : "bg-flash/[0.04]"
              )}
              style={
                isReady
                  ? {
                      boxShadow:
                        "0 0 40px rgba(0,217,146,0.6), 0 0 100px rgba(0,217,146,0.25)",
                    }
                  : undefined
              }
            />
            {isReady ? (
              <Check className="relative w-10 h-10 text-jade" strokeWidth={2.5} />
            ) : (
              <span className="relative font-mono text-jade/70 text-2xl tracking-widest">
                ◇
              </span>
            )}
          </motion.div>

          <motion.h1
            className="font-jetbrains font-bold text-3xl md:text-4xl text-flash/95 mb-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: EASE_BRAND }}
          >
            {isReady
              ? "Welcome to "
              : isTimeout
                ? "Almost there"
                : "Securing your spot"}
            {isReady ? (
              <span className="text-jade">{displayPlan}</span>
            ) : null}
          </motion.h1>

          <motion.p
            className="text-sm md:text-base text-flash/65 leading-relaxed max-w-md mx-auto mb-8"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5, ease: EASE_BRAND }}
          >
            {isReady
              ? "Payment confirmed and your account is now upgraded. All the perks of the plan are unlocked — start exploring."
              : isTimeout
                ? "Payment received but your plan is still syncing on our side (Stripe webhook can take up to a minute). You can keep using the site; your plan will update on the next page load."
                : "Payment received. We're confirming the upgrade with our servers right now — this usually takes a couple of seconds."}
          </motion.p>

          {/* Buttons: CTA primary + plan-link secondary. */}
          <motion.div
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5, ease: EASE_BRAND }}
          >
            <Button variant="solid" asChild>
              <Link to="/dashboard" className="inline-flex items-center gap-2">
                GO TO DASHBOARD
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button variant="purchase" asChild>
              <Link to="/" className="text-flash/55">
                EXPLORE THE SITE
              </Link>
            </Button>
          </motion.div>

          {/* Session id footnote — useful for support tickets. */}
          {sessionId ? (
            <motion.p
              className="mt-8 text-[10px] font-mono uppercase tracking-[0.2em] text-flash/25"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              ref · {sessionId.slice(0, 16)}…
            </motion.p>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}
