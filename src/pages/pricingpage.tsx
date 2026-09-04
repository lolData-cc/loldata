// src/pages/pricingpage.tsx
//
// /pricing as a SPEC SHEET, in the language of the download page and the
// reference posters: hairline frames, crop marks at the corners, monospace
// readouts, a leader line from a label to the thing it names. Three plan
// modules, read like three detected objects on a scan.
//
// ⚠️ ALL THREE MODULES SIT INSIDE THE FIRST SCREEN. The section is the
// viewport's height on desktop and the modules are sized to it — nothing of
// a plan is below the fold. The footer still arrives only after a scroll,
// because the questions section sits under the fold; a pricing page whose
// footer is on screen from the first frame reads as finished before it has
// made its case.
//
// Data and checkout come from pricingplans.tsx (`PLANS`, `useCheckout`) —
// one source for prices, perks and the Stripe call.

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { PLANS, useCheckout, type Plan } from "@/components/pricingplans"
import { useAuth } from "@/context/authcontext"
import { cn } from "@/lib/utils"

const EASE = [0.22, 1, 0.36, 1] as const

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: "What is an AI credit?",
    a: "One question to the AI — the coach, a matchup, a build — costs one credit. Free refills three a day; Premium and Elite refill their monthly pool on the day you subscribed.",
  },
  {
    q: "Can I cancel any time?",
    a: "Yes. Upgrade, downgrade or cancel from your dashboard whenever you like. A cancelled plan stays active until the end of the month you paid for.",
  },
  {
    q: "How do I pay?",
    a: "Checkout and billing are handled by Stripe. We never see or store your card details.",
  },
]

/** A corner mark: two hairlines meeting at a right angle. */
function Corner({ at, tone = "jade" }: { at: "tl" | "tr" | "bl" | "br"; tone?: "jade" | "dim" }) {
  const c = tone === "jade" ? "border-jade/60" : "border-flash/20"
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute h-3 w-3 border-0",
        c,
        at === "tl" && "left-0 top-0 border-l border-t",
        at === "tr" && "right-0 top-0 border-r border-t",
        at === "bl" && "bottom-0 left-0 border-b border-l",
        at === "br" && "bottom-0 right-0 border-b border-r"
      )}
    />
  )
}

/** A monospace readout: LABEL on the left, value on the right. */
function Readout({ label, value, tone }: { label: string; value: string; tone?: "jade" }) {
  return (
    <span className="flex items-baseline gap-2 font-jetbrains text-[10px] tracking-[0.14em]">
      <span className="text-flash/30">{label}</span>
      <span className={tone === "jade" ? "text-jade" : "text-flash/60"}>{value}</span>
    </span>
  )
}

const monthly = (c: Plan["credits"]) => (c.per === "day" ? c.n * 30 : c.n)
const MAX_MONTHLY = Math.max(...PLANS.map((p) => monthly(p.credits)))

function PlanModule({ p, index, active, loading, onCheckout }: {
  p: Plan
  index: number
  active: boolean
  loading: boolean
  onCheckout: () => void
}) {
  const still = useReducedMotion()
  return (
    <motion.article
      initial={still ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay: 0.1 + index * 0.09 }}
      className={cn(
        "relative flex min-h-0 flex-col p-[clamp(18px,2.2vh,28px)]",
        // ⚠️ Hairline frames, never a white outline: jade for the featured
        // module, a dark jade for the others. Lit from the inside.
        p.featured
          ? "border border-jade/45 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(0,217,146,0.10),rgba(5,13,16,0.6))] shadow-[0_0_70px_-24px_rgba(0,217,146,0.55)]"
          : "border border-jade/[0.14] bg-[#050d10]/70"
      )}
    >
      <Corner at="tl" tone={p.featured ? "jade" : "dim"} />
      <Corner at="tr" tone={p.featured ? "jade" : "dim"} />
      <Corner at="bl" tone={p.featured ? "jade" : "dim"} />
      <Corner at="br" tone={p.featured ? "jade" : "dim"} />

      {/* tag strip */}
      <div className="flex items-center justify-between">
        <span className="font-jetbrains text-[10px] tracking-[0.22em] text-flash/40">
          <span className={p.featured ? "text-jade" : "text-flash/55"}>0{index + 1}</span>
          <span className="mx-1.5 text-flash/20">//</span>
          <span className={cn("font-chakrapetch text-[12px] font-bold uppercase tracking-[0.26em]", p.featured ? "text-jade" : "text-flash/75")}>{p.name}</span>
        </span>
        {active ? (
          <span className="border border-jade/50 px-2 py-0.5 font-jetbrains text-[9px] uppercase tracking-[0.2em] text-jade">current</span>
        ) : p.featured ? (
          <span className="bg-jade px-2 py-0.5 font-jetbrains text-[9px] uppercase tracking-[0.2em] text-liquirice">recommended</span>
        ) : null}
      </div>

      {/* price */}
      <div className="mt-[clamp(14px,2.4vh,26px)] flex items-end gap-2">
        <span className="font-chakrapetch text-[clamp(38px,4.6vh,50px)] font-bold leading-none text-flash">{p.price}</span>
        <span className="mb-1 whitespace-nowrap font-jetbrains text-[11px] lowercase tracking-[0.06em] text-flash/40">{p.period}</span>
      </div>
      <p className="mt-2 font-jetbrains text-[12px] leading-snug text-flash/45">{p.tagline}</p>

      {/* credits readout, to scale */}
      <div className="mt-[clamp(12px,2vh,20px)]">
        <div className="flex items-baseline justify-between">
          <span className="font-jetbrains text-[9.5px] uppercase tracking-[0.2em] text-flash/35">AI credits</span>
          <span className="font-jetbrains text-[11px] text-flash/40">
            <span className={cn("font-chakrapetch text-[15px] font-bold", p.featured ? "text-jade" : "text-flash/90")}>{p.credits.n}</span>
            {" "}/ {p.credits.per}
          </span>
        </div>
        <div className="mt-1.5 flex h-[3px] w-full gap-px">
          {/* segmented, like a level meter: 20 cells, lit to scale */}
          {Array.from({ length: 20 }, (_, i) => {
            const lit = i < Math.max(1, Math.round((monthly(p.credits) / MAX_MONTHLY) * 20))
            return <span key={i} className={cn("flex-1", lit ? (p.featured ? "bg-jade" : "bg-jade/60") : "bg-flash/[0.07]")} />
          })}
        </div>
      </div>

      <div className="my-[clamp(12px,2vh,20px)] h-px w-full bg-gradient-to-r from-jade/25 via-jade/10 to-transparent" />

      {/* features */}
      <ul className="flex min-h-0 flex-col gap-[clamp(6px,1.1vh,11px)]">
        {p.featuresFull.map((f) => (
          <li key={f} className="flex items-start gap-2.5 font-jetbrains text-[12px] leading-snug text-flash/70">
            <span className={cn("mt-[3px] grid h-[14px] w-[14px] shrink-0 place-items-center border", p.featured ? "border-jade/50" : "border-flash/15")}>
              <Check className={cn("h-2 w-2", p.featured ? "text-jade" : "text-flash/60")} strokeWidth={3.5} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA, pinned to the bottom so the three align */}
      <div className="mt-auto pt-[clamp(14px,2.4vh,26px)]">
        {active ? (
          <div className="flex h-11 items-center justify-center gap-2 border border-jade/40 bg-jade/10 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.16em] text-jade">
            <Check className="h-3.5 w-3.5" strokeWidth={3} /> Current plan
          </div>
        ) : p.id === "free" ? (
          <div className="flex h-11 items-center justify-center border border-flash/10 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.16em] text-flash/35">
            Free forever
          </div>
        ) : (
          <button
            type="button"
            onClick={onCheckout}
            disabled={loading}
            aria-label={`Subscribe to ${p.name}`}
            className={cn(
              "group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden font-chakrapetch text-[12px] font-bold uppercase tracking-[0.18em] transition-all duration-200 cursor-clicker disabled:cursor-not-allowed disabled:opacity-70",
              p.featured
                ? "bg-jade text-liquirice hover:shadow-[0_14px_36px_-12px_rgba(0,217,146,0.9)]"
                : "border border-jade/45 text-jade hover:border-jade hover:bg-jade/10"
            )}
          >
            <span className="relative z-10">{loading ? "Redirecting…" : `Get ${p.name}`}</span>
            {loading ? (
              <Loader2 className="relative z-10 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            )}
          </button>
        )}
      </div>
    </motion.article>
  )
}

export default function PricingPage() {
  const { plan } = useAuth()
  const { loadingPlan, goCheckout } = useCheckout()

  return (
    <div className="w-full">
      {/* ── The sheet: the viewport's height on desktop ─────────────────────
          64px is the navbar. min-h keeps very short windows from crushing
          the modules; under md the page is a normal stacked column — with
          76px of top padding, because there the navbar is fixed and overlays
          the page (the eyebrow vanished under it). */}
      <section className="relative mx-auto flex w-full max-w-[1200px] flex-col px-4 pb-6 pt-[76px] md:h-[calc(100svh-64px)] md:pt-5 md:min-h-[680px] md:justify-between md:px-6">
        {/* the dither ground: a dot grid, barely there */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{ backgroundImage: "radial-gradient(rgba(0,217,146,0.13) 0.6px, transparent 0.8px)", backgroundSize: "14px 14px" }}
        />
        {/* crop marks at the sheet's corners */}
        <Corner at="tl" /><Corner at="tr" /><Corner at="bl" /><Corner at="br" />

        {/* header row: title left, readouts right */}
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 font-jetbrains text-[10px] uppercase tracking-[0.3em] text-jade/70">
              <span className="h-1.5 w-1.5 rotate-45 bg-jade" />
              Membership <span className="text-flash/25">//</span> plan select
            </div>
            <h1 className="font-chakrapetch text-[clamp(26px,3.6vh,40px)] font-bold leading-none tracking-tight text-flash">
              Choose your <span className="text-jade" style={{ textShadow: "0 0 30px rgba(0,217,146,0.35)" }}>plan</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 md:justify-end">
            <Readout label="PLANS" value="03" />
            <Readout label="CURRENCY" value="EUR" />
            <Readout label="BILLING" value="MONTHLY" />
            <Readout label="CANCEL" value="ANYTIME" tone="jade" />
          </div>
        </div>

        {/* the leader line: from the label to the recommended module */}
        <div className="relative mt-[clamp(14px,2.6vh,28px)] hidden h-7 md:block">
          <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
            <span className="whitespace-nowrap font-jetbrains text-[9.5px] uppercase tracking-[0.24em] text-jade/80">
              ▸ recommended for most players
            </span>
            <span className="mt-1 h-3 w-px bg-jade/50" />
          </div>
        </div>

        {/* the three modules */}
        {/* ⚠️ Capped: on a 1080px screen uncapped modules stretched to the
            viewport and left a void between the last perk and the button.
            With the cap the section distributes the spare height around
            the grid instead of inside it. */}
        <div className="relative mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 md:mt-0 md:max-h-[740px] md:grid-cols-3">
          {PLANS.map((p, i) => (
            <PlanModule
              key={p.id}
              p={p}
              index={i}
              active={plan === p.id}
              loading={loadingPlan === p.id}
              onCheckout={() => goCheckout(p.id as "premium" | "elite")}
            />
          ))}
        </div>

        {/* HUD strip */}
        <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-jade/[0.12] pt-2.5 font-jetbrains text-[9.5px] uppercase tracking-[0.2em] text-flash/30">
          <span>sys.pricing <span className="text-flash/15">·</span> prices in eur <span className="text-flash/15">·</span> secured by stripe</span>
          <span>upgrade <span className="text-flash/15">·</span> downgrade <span className="text-flash/15">·</span> cancel <span className="text-jade/70">anytime</span></span>
        </div>
      </section>

      {/* ── Under the fold: the questions, then the footer ────────────────── */}
      <section className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-14 md:px-6">
        <div className="mb-7 flex items-center gap-2 font-jetbrains text-[10px] uppercase tracking-[0.3em] text-jade/70">
          <span className="h-1.5 w-1.5 rotate-45 bg-jade" />
          Before you decide
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {QUESTIONS.map((item, i) => (
            <div key={item.q} className="relative border-l border-jade/20 pl-4">
              <span className="absolute -left-px top-0 h-4 w-px bg-jade" />
              <div className="font-jetbrains text-[9.5px] tracking-[0.24em] text-flash/30">Q.0{i + 1}</div>
              <h3 className="mt-1 font-chakrapetch text-[15px] font-bold text-flash/90">{item.q}</h3>
              <p className="mt-2.5 font-jetbrains text-[12.5px] leading-relaxed text-flash/50">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
