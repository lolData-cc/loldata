// src/pages/billingsuccess.tsx
//
// Subscription reward / celebration page. Minimal, restrained,
// premium-onboarding aesthetic (Linear / Vercel / Stripe tier) —
// long-form vertical layout where each perk gets its own quiet
// section explained in depth. No cards, no glass boxes, no full-bleed
// content blocks: everything sits inside the App.tsx 65% column on a
// single continuous liquirice background. The only thing that
// escapes the width lock is a single subtle ambient layer (a soft
// jade radial at the top + a very faint dot grid) that lives on
// `position: fixed` so it never creates a seam against the page bg.
//
// Animation strategy
//   • Hero fades up on mount, plan name decrypts in once.
//   • Counter ramps from 00/NN to the perk total.
//   • Each perk section scroll-reveals via whileInView (single fade-up
//     for the section, then a small inner stagger for icon → title →
//     copy → bullets).
//   • CTA section reveals when it enters the viewport.
// Reduced-motion users get a fully revealed static page.

import * as React from "react"
import { Link, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion"
import {
  Sparkles,
  Brain,
  Sword,
  Rocket,
  Users,
  Crown,
  Star,
  Hash,
  Zap,
  Infinity as InfinityIcon,
  ArrowRight,
  ArrowUp,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "@/context/authcontext"
import { LoldataCard3D } from "@/components/ui/loldata-card-3d"

const EASE_BRAND = [0.22, 1, 0.36, 1] as const
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 30_000

// ─── Perks catalogue ────────────────────────────────────────────────
type Perk = {
  tag: string
  icon: React.ComponentType<{ className?: string }>
  name: string
  tagline: string
  description: string
  bullets: string[]
  location?: string
}

const PREMIUM_PERKS: Perk[] = [
  {
    tag: "01",
    icon: Sparkles,
    name: "AI Coach",
    tagline: "Your personal performance analyst, always on duty",
    description:
      "Our AI coach studies every match you play, picking up on patterns you'd never notice yourself. It compares your decisions to those of higher-ranked players on the same champion, calls out subtle inefficiencies in laning, jungle pathing and mid-game macro, then surfaces three concrete things to focus on for your next session. It learns over time and never repeats itself — as soon as one area improves, it shifts focus to the next bottleneck.",
    bullets: [
      "Daily personalised performance synthesis delivered to your dashboard",
      "Champion-specific recommendations drawn from rank-cohort data",
      "Macro and micro insights, separated and prioritised by impact",
      "Trend tracking — watch your weak spots dissolve week by week",
    ],
    location: "Dashboard → AI Coach",
  },
  {
    tag: "02",
    icon: Brain,
    name: "Matchup Engine",
    tagline: "Know every lane before champion select closes",
    description:
      "Every champion you face gets an AI-generated breakdown: power spikes, key item timings, what to do at level 2 / 6 / 11, what they'll try to do to you and the counterplay that actually works. Built on top of millions of analysed matches, refined every patch. Walk into every lane already knowing how it will play out — even matchups you've never seen before.",
    bullets: [
      "Pre-game strategy briefing tailored to your champion vs theirs",
      "Critical timings for trades, all-ins and roams",
      "Item paths that beat them, not just the popular build",
      "Counterplay specific to their playstyle and rank cohort",
    ],
    location: "Champion page → Matchups tab",
  },
  {
    tag: "03",
    icon: Sword,
    name: "Itemization Engine",
    tagline: "Build by build, optimised against real outcomes",
    description:
      "Stop copying the most-played build and start using the one that actually wins. The itemization engine looks at every completed item path on your champion, scored by win rate within your exact rank cohort against your specific matchup. Mythic choices, second-item pivots, situational fifth slots — all surfaced with the data behind them, so you can adapt during the game, not just before it.",
    bullets: [
      "Win-rate ranked builds within your rank cohort",
      "Situational pivots — when to swap items mid-game",
      "Counter-build recommendations against specific enemies",
      "Lethal vs sustained-damage breakdowns per champion archetype",
    ],
    location: "Champion page → Items tab",
  },
  {
    tag: "04",
    icon: Rocket,
    name: "Daily Reports",
    tagline: "A personalised scorecard, every morning",
    description:
      "Wake up to a complete summary of yesterday's session: KDA trends, CS-per-minute deltas, ward score, damage breakdown, champion progression, and a focused list of three habits to work on tonight. Reports compound — over a week, you can see exactly where you've improved and where you're stuck. Delivered to your dashboard at midnight, in your timezone.",
    bullets: [
      "Yesterday's session metrics distilled into one card",
      "Three concrete habits to drill next session",
      "Champion mastery progression and pool diversity",
      "Weekly retrospective every Sunday with deeper analysis",
    ],
    location: "Dashboard → Reports",
  },
  {
    tag: "05",
    icon: Users,
    name: "Scout Lobbies ×2",
    tagline: "Track up to two lobbies in real time",
    description:
      "Spin up Scout lobbies for your friend groups, your team, your duo, or a rival you're keeping tabs on. Each lobby aggregates live games, recent match history, win rates, LP timelines and champion habits across every account in the group. LIVE indicators show you who's in game right now. Two concurrent lobbies let you track your own stack and a rival group side by side — double the single free slot.",
    bullets: [
      "Up to 2 lobbies open concurrently, switchable instantly",
      "LIVE indicator on each member currently in a game",
      "Aggregated stats: KDA, KP, CS/min, LP delta over any window",
      "Champion habits and time-of-day patterns per group",
    ],
    location: "Scout section in the navbar",
  },
  {
    tag: "06",
    icon: InfinityIcon,
    name: "Unlimited Analysis",
    tagline: "No daily caps. Ever.",
    description:
      "Free tier ships with one daily player analysis as a trial. Premium removes the limit entirely. Run AI analyses on any summoner — friends, opponents, pros — as many times as you want. Compare yesterday's game to last week's. Spot streaks. Run sanity checks. The token bucket never empties. Combined with the AI Coach this becomes a research lab you can poke at whenever curiosity strikes.",
    bullets: [
      "Run player deep-dives without ever hitting a quota",
      "Re-analyse the same player to compare across patches",
      "Champion mastery analyses unlocked for every champion",
      "No throttling on the AI Coach prompts",
    ],
    location: "Search any summoner → Analyze",
  },
]

const ELITE_PERKS: Perk[] = [
  ...PREMIUM_PERKS.filter((p) => p.tag !== "05"),
  {
    tag: "05",
    icon: Users,
    name: "Scout Lobbies ×3",
    tagline: "The most tracking capacity",
    description:
      "Premium gives you two — Elite gives you three. Run three concurrent Scout lobbies for everyone you care about: your duo, your flex stack, your team, the team you're scouting next, the streamers you follow, the rivals you're chasing on the ladder. Three slots is enough to never have to close one to open another.",
    bullets: [
      "Up to 3 lobbies open concurrently",
      "All Premium lobby features included — LIVE, LP, habits, stats",
      "Combine professional scouting with casual group tracking in parallel",
      "Higher quota also raises the auto-refresh rate on each lobby",
    ],
    location: "Scout section in the navbar",
  },
  {
    tag: "07",
    icon: Zap,
    name: "AI Token Boost",
    tagline: "10× the daily compute budget for the AI coach",
    description:
      "Every AI coach prompt costs tokens. Premium gives you enough headroom for a heavy daily user; Elite gives you ten times that. Run aggressive analysis sessions, ask the coach long open-ended questions, deep-dive into matchups for an entire tier list — without ever worrying about the budget. The AI coach also picks up on context faster when you can throw more conversational turns at it.",
    bullets: [
      "10× the standard token bucket",
      "Heavier context windows for longer multi-turn analyses",
      "Priority routing on the AI inference queue",
      "Early access to upgraded models when we roll them out",
    ],
    location: "Anywhere the AI coach appears",
  },
  {
    tag: "08",
    icon: Star,
    name: "Early Access",
    tagline: "First in line on every new feature",
    description:
      "Elite members get every new feature 1–2 weeks before public release. New tab on the champion page? You see it first. New scout lobby analytics? You test it first. Backend has been quietly building a draft-pick assistant? Elite tests it. You also have a direct line to give feedback that actually shapes the final release.",
    bullets: [
      "Preview every new feature 1–2 weeks early",
      "Direct feedback channel that changes what ships",
      "Beta flag toggles in your dashboard",
      "Bug reports get priority triage",
    ],
    location: "Dashboard → Beta features",
  },
  {
    tag: "09",
    icon: Hash,
    name: "Private Discord",
    tagline: "Direct channel with the loldata team",
    description:
      "A dedicated Discord channel where the loldata team hangs out: developers, designers, the AI team. Ask anything, suggest anything, report anything. We share roadmaps before they go public, post sneak peeks of new features and chat about whatever League meta drama is happening that week. Real humans, fast responses, no support tickets.",
    bullets: [
      "Members-only channel with the entire loldata team",
      "Roadmap previews and feature voting",
      "Direct technical support from the engineers who built it",
      "Sneak peeks of features in design phase",
    ],
    location: "Invite sent via email after subscription",
  },
  {
    tag: "10",
    icon: Crown,
    name: "Priority Support",
    tagline: "White-glove response time on every ticket",
    description:
      "Whatever you ask, we answer fast. Billing issue? Sorted within the hour. Account recovery? Same day. Bug report? Triaged before it hits the public issue tracker. Premium members get standard support; Elite members get top-of-queue treatment with a guaranteed response window and the engineer who can actually fix it on the thread, not a script reader.",
    bullets: [
      "Top-of-queue ticket triage with same-day response SLA",
      "Direct engineer involvement on technical issues",
      "Account recovery shortcuts for Riot RSO and Stripe edge cases",
      "Refund and credit policy applied generously",
    ],
    location: "Email support@loldata.cc — flagged as Elite automatically",
  },
]

function perksFor(plan: string | null): Perk[] {
  if (plan === "elite") return ELITE_PERKS
  return PREMIUM_PERKS
}

// Reads the tier slot — Premium is Tier 02, Elite is Tier 03 (Free
// would be Tier 01 but we never land on this page from free).
function tierLabelFor(planLabel: string): string {
  if (planLabel.toLowerCase().includes("elite")) return "Tier 03"
  return "Tier 02"
}

// Floating back-to-top. RootLayout scrolls an overflow-y-scroll container
// (not the window), so we walk up from an anchor to find that scrollable
// ancestor and drive it. Appears once the user is a screenful down.
function BackToTop() {
  const [visible, setVisible] = React.useState(false)
  const scrollerRef = React.useRef<HTMLElement | null>(null)
  const anchorRef = React.useRef<HTMLSpanElement | null>(null)

  React.useEffect(() => {
    let el = anchorRef.current?.parentElement ?? null
    while (el) {
      const oy = getComputedStyle(el).overflowY
      if (oy === "auto" || oy === "scroll") break
      el = el.parentElement
    }
    const scroller = el
    scrollerRef.current = scroller
    const onScroll = () => setVisible((scroller ? scroller.scrollTop : window.scrollY) > 500)
    if (scroller) scroller.addEventListener("scroll", onScroll, { passive: true })
    else window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      if (scroller) scroller.removeEventListener("scroll", onScroll)
      else window.removeEventListener("scroll", onScroll)
    }
  }, [])

  const toTop = () => {
    const s = scrollerRef.current
    if (s) s.scrollTo({ top: 0, behavior: "smooth" })
    else window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <>
      <span ref={anchorRef} aria-hidden className="hidden" />
      <AnimatePresence>
        {visible && (
          <motion.button
            type="button"
            onClick={toTop}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25, ease: EASE_BRAND }}
            aria-label="Back to top"
            className="fixed bottom-6 right-6 z-50 grid place-items-center w-11 h-11 rounded-full border border-jade/30 bg-[rgba(6,12,14,0.82)] backdrop-blur-md text-jade hover:bg-jade/15 hover:border-jade/55 transition-colors cursor-clicker shadow-[0_0_20px_rgba(0,217,146,0.12)]"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Page ───────────────────────────────────────────────────────────
export default function BillingSuccessPage() {
  const reduceMotion = useReducedMotion()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { plan, refreshProfile } = useAuth()

  // Poll the profile until the webhook flips the plan to the paid
  // tier. Until then we render Premium perks as the optimistic
  // preview.
  React.useEffect(() => {
    if (plan && plan !== "free") return
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      await refreshProfile()
    }
    tick()
    const interval = window.setInterval(tick, POLL_INTERVAL_MS)
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval)
    }, POLL_TIMEOUT_MS)
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isElite = plan === "elite"
  const planLabel = isElite ? "Premium" : "Premium" // intentional — Elite shows "Premium" as the visible plan word for branding parity, the unlock count tells the user it's the big tier
  const planFullLabel = isElite ? "Elite" : "Premium"
  const perks = perksFor(plan)

  return (
    <>
      {/* Ambient layer — fixed full-viewport so it never produces a
          seam against the page bg, and it scrolls in place giving a
          calm parallax feel as the user moves down. No animation
          beyond the initial fade. */}
      <AmbientLayer />
      <BackToTop />

      {/* Content — naturally sits in the App.tsx 65% column.
          Everything here uses the same liquirice page bg as its
          backdrop, so there are no visible "card edges". */}
      <div className="relative">
        <HeroSection
          planLabel={planFullLabel}
          reduceMotion={!!reduceMotion}
        />

        <PerksTimeline perks={perks} reduceMotion={!!reduceMotion} />

        <CtaSection planLabel={planFullLabel} />

        <FooterStrip sessionId={sessionId} />
      </div>
    </>
  )
}

// ─── Ambient backdrop ──────────────────────────────────────────────
// Two layers, both fixed to the viewport:
//   1. A soft jade radial at the top that fades out by ~60vh down
//   2. A very faint dot grid covering the whole page
// Both sit at z-[-10] so all real content stacks above them. Because
// they're fixed they don't scroll with the document, which kills any
// chance of a horizontal seam.
function AmbientLayer() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none bg-liquirice"
    >
      {/* Jade halo at top of viewport, fades to transparent by the
          bottom of the hero. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(0,217,146,0.16) 0%, rgba(0,217,146,0.05) 35%, transparent 70%)",
        }}
      />
      {/* Faint persistent dot grid — about 4% opacity, masked top and
          bottom so it never reads as a hard plane. */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,217,146,0.6) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "linear-gradient(180deg, transparent 0%, black 10%, black 90%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent 0%, black 10%, black 90%, transparent 100%)",
        }}
      />
    </div>
  )
}

// ─── Hero section ───────────────────────────────────────────────────
function HeroSection({
  planLabel,
  reduceMotion,
}: {
  planLabel: string
  reduceMotion: boolean
}) {
  const [started, setStarted] = React.useState(reduceMotion)
  React.useEffect(() => {
    if (reduceMotion) return
    const t = window.setTimeout(() => setStarted(true), 60)
    return () => window.clearTimeout(t)
  }, [reduceMotion])

  return (
    // Strict viewport-height section — everything fits in the
    // initial visible viewport without scrolling. The middle row
    // (the card) absorbs flex-1 so it stays optically centred;
    // the bottom padding (pb-20 md:pb-24) pulls the Tier · sub ·
    // Continue block up off the very bottom edge of the viewport
    // so it sits comfortably below the card rather than glued to
    // the navbar-less floor.
    <section
      className="relative flex flex-col items-center px-4 pt-6 pb-20 md:pt-8 md:pb-24"
      style={{
        height: "calc(100vh - 60px)",
        minHeight: "640px",
      }}
    >
      {/* ── ABOVE the card. */}
      <div className="w-full max-w-4xl mx-auto text-center shrink-0">
        {/* "Membership" label with thin hairlines on each side. */}
        <motion.div
          className="inline-flex items-center gap-4 mb-3"
          initial={{ opacity: 0, y: 6 }}
          animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.7, ease: EASE_BRAND }}
        >
          <span
            aria-hidden
            className="block h-px w-10 md:w-14 bg-gradient-to-r from-transparent to-jade/55"
          />
          <span className="font-jetbrains text-[10px] tracking-[0.45em] uppercase text-jade/85">
            Membership
          </span>
          <span
            aria-hidden
            className="block h-px w-10 md:w-14 bg-gradient-to-l from-transparent to-jade/55"
          />
        </motion.div>

        {/* "Welcome to" — sentence case preamble. */}
        <motion.div
          className="font-geist text-flash/55 text-sm md:text-base mb-1"
          initial={{ opacity: 0, y: 6 }}
          animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.55, delay: 0.1, ease: EASE_BRAND }}
        >
          Welcome to
        </motion.div>

        {/* Plan name — large jade, soft halo. */}
        <motion.div
          className="relative inline-block"
          initial={{ opacity: 0, y: 10 }}
          animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.9, delay: 0.18, ease: EASE_BRAND }}
        >
          <span
            aria-hidden
            className="absolute inset-0 -inset-x-12 -inset-y-6 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(0,217,146,0.32) 0%, transparent 70%)",
            }}
          />
          <h1
            className="relative font-jetbrains font-black text-jade tracking-[0.02em] leading-[0.92] text-[44px] sm:text-[60px] md:text-[76px]"
            style={{
              textShadow:
                "0 0 22px rgba(0,217,146,0.6), 0 0 56px rgba(0,217,146,0.26), 0 0 120px rgba(0,217,146,0.1)",
            }}
          >
            {planLabel}.
          </h1>
        </motion.div>

        {/* Hairline rule — draws in from centre. */}
        <motion.div
          className="mx-auto mt-3 h-px w-28 md:w-36 origin-center"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(0,217,146,0.55) 40%, rgba(0,217,146,0.85) 50%, rgba(0,217,146,0.55) 60%, transparent)",
            boxShadow: "0 0 12px rgba(0,217,146,0.4)",
          }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={
            started ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }
          }
          transition={{ duration: 0.7, delay: 0.5, ease: EASE_BRAND }}
        />
      </div>

      {/* ── 3D card — middle row absorbs available vertical space so
            the card stays optically centred between the two text
            blocks regardless of viewport height. */}
      <motion.div
        className="relative w-full max-w-xl flex-1 flex items-center justify-center min-h-0 py-3"
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={
          started
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 14, scale: 0.97 }
        }
        transition={{ duration: 1.0, ease: EASE_BRAND, delay: 0.35 }}
      >
        {/* Full-bleed glow band behind the card. */}
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-screen h-[560px] -z-10 pointer-events-none"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(0,217,146,0.28) 0%, rgba(0,217,146,0.08) 35%, transparent 70%)",
            }}
          />
        </div>

        <LoldataCard3D height="100%" />
      </motion.div>

      {/* ── BELOW the card. */}
      <div className="w-full max-w-4xl mx-auto text-center shrink-0">
        {/* Tier · activation detail row — luxury watch spec line. */}
        <motion.div
          className="inline-flex items-center gap-4 font-jetbrains text-[10px] tracking-[0.3em] uppercase text-flash/45 mb-3"
          initial={{ opacity: 0 }}
          animate={started ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.85, ease: EASE_BRAND }}
        >
          <span>{tierLabelFor(planLabel)}</span>
          <span aria-hidden className="block w-px h-3 bg-flash/20" />
          <span className="text-jade/75">Active</span>
          <span aria-hidden className="block w-px h-3 bg-flash/20" />
          <span>Today</span>
        </motion.div>

        {/* Sub-headline. */}
        <motion.p
          className="max-w-xl mx-auto text-flash/65 text-[13px] md:text-[14px] leading-[1.6] font-geist mb-4"
          initial={{ opacity: 0, y: 8 }}
          animate={started ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.65, delay: 1.0, ease: EASE_BRAND }}
        >
          Your membership begins today. Every tool below is already active on
          your account.
        </motion.p>

        {/* Refined scroll cue — pulls into the same below-card block
            so all three blocks (above / card / below+cue) distribute
            cleanly within the viewport without overflow. */}
        <motion.a
          href="#perks"
          className="inline-flex flex-col items-center gap-1.5 group cursor-clicker"
          initial={{ opacity: 0 }}
          animate={started ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.7, delay: 1.25, ease: EASE_BRAND }}
        >
          <span className="font-jetbrains text-[9px] tracking-[0.35em] uppercase text-flash/35 group-hover:text-jade transition-colors">
            Continue
          </span>
          <motion.div
            animate={
              reduceMotion
                ? undefined
                : { y: [0, 4, 0], opacity: [0.35, 0.75, 0.35] }
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-3.5 h-3.5 text-jade/55 group-hover:text-jade transition-colors" />
          </motion.div>
        </motion.a>
      </div>
    </section>
  )
}

// ─── Perks timeline ─────────────────────────────────────────────────
function PerksTimeline({
  perks,
  reduceMotion,
}: {
  perks: Perk[]
  reduceMotion: boolean
}) {
  return (
    <div id="perks" className="flex flex-col gap-28 md:gap-36 py-16 md:py-20">
      {perks.map((perk, i) => (
        <PerkSection
          key={perk.tag}
          perk={perk}
          index={i}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  )
}

// One perk section. No card, no glass box — just text on the page bg,
// with generous spacing and a quiet stagger reveal as it scrolls into
// view. The number + horizontal rule + label header doubles as a
// visual cue ("this is item N of the catalogue").
function PerkSection({
  perk,
  index,
  reduceMotion,
}: {
  perk: Perk
  index: number
  reduceMotion: boolean
}) {
  const ref = React.useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const Icon = perk.icon
  const active = reduceMotion ? true : inView

  return (
    <section ref={ref} className="relative scroll-mt-24">
      {/* Section header: number — gradient line — small label. */}
      <motion.div
        className="flex items-center gap-4 mb-10"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, ease: EASE_BRAND }}
      >
        <span className="font-jetbrains text-[11px] tabular-nums tracking-[0.2em] text-jade">
          {perk.tag}
        </span>
        <div
          className="h-px flex-1"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,217,146,0.45) 0%, rgba(0,217,146,0.08) 60%, transparent 100%)",
          }}
        />
        <span className="font-jetbrains text-[10px] tracking-[0.28em] uppercase text-flash/40">
          {perk.name}
        </span>
      </motion.div>

      {/* Icon block — small, calm, no shadow drama. */}
      <motion.div
        className="inline-flex items-center justify-center w-14 h-14 rounded-md border border-jade/30 bg-jade/[0.04] mb-7"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={
          active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }
        }
        transition={{ duration: 0.5, ease: EASE_BRAND, delay: 0.08 }}
      >
        <Icon className="w-6 h-6 text-jade" />
      </motion.div>

      {/* Title. */}
      <motion.h2
        className="font-jetbrains font-bold text-flash/95 text-3xl md:text-[40px] leading-[1.1] tracking-[0.02em] mb-3"
        initial={{ opacity: 0, y: 8 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.12 }}
      >
        {perk.name}
      </motion.h2>

      {/* Tagline — jade tinted, italic-feel. */}
      <motion.p
        className="text-jade/85 text-base md:text-lg font-geist mb-7"
        initial={{ opacity: 0, y: 6 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.5, ease: EASE_BRAND, delay: 0.18 }}
      >
        {perk.tagline}
      </motion.p>

      {/* Description — generous line height, comfortable to read. */}
      <motion.p
        className="text-flash/70 text-[15px] md:text-base leading-[1.85] font-geist max-w-3xl mb-10"
        initial={{ opacity: 0, y: 6 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.6, ease: EASE_BRAND, delay: 0.25 }}
      >
        {perk.description}
      </motion.p>

      {/* What you unlock — small caps header + bullet list. */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, ease: EASE_BRAND, delay: 0.32 }}
      >
        <div className="font-jetbrains text-[10px] tracking-[0.28em] uppercase text-flash/40 mb-4">
          What you unlock
        </div>
        <ul className="space-y-3 max-w-3xl">
          {perk.bullets.map((b, i) => (
            <motion.li
              key={i}
              className="flex items-start gap-3 text-flash/75 text-[14px] md:text-[15px] leading-relaxed font-geist"
              initial={{ opacity: 0, x: -6 }}
              animate={
                active ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }
              }
              transition={{
                duration: 0.4,
                ease: EASE_BRAND,
                delay: 0.38 + i * 0.06,
              }}
            >
              <span
                aria-hidden
                className="mt-2.5 inline-block w-1 h-1 rounded-full bg-jade shrink-0"
              />
              <span>{b}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* "Find it at" footnote. */}
      {perk.location ? (
        <motion.div
          className="inline-flex items-center gap-2 text-[11px] font-jetbrains tracking-[0.2em] uppercase"
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.45, ease: EASE_BRAND, delay: 0.55 }}
        >
          <span className="text-jade/55">Find it at</span>
          <span className="text-flash/65">{perk.location}</span>
        </motion.div>
      ) : null}
    </section>
  )
}

// ─── CTA section ────────────────────────────────────────────────────
function CtaSection({ planLabel }: { planLabel: string }) {
  const ref = React.useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <section ref={ref} className="relative text-center py-24 md:py-32">
      <motion.div
        className="font-jetbrains text-[10px] tracking-[0.42em] uppercase text-jade/65 mb-5"
        initial={{ opacity: 0, y: -4 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: 0.5, ease: EASE_BRAND }}
      >
        Ready
      </motion.div>
      <motion.h2
        className="font-jetbrains font-bold text-flash/95 text-3xl md:text-[40px] tracking-[0.02em] leading-[1.1] mb-4"
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.1 }}
      >
        Time to put {planLabel} to work
      </motion.h2>
      <motion.p
        className="text-flash/55 text-base md:text-lg max-w-md mx-auto leading-relaxed mb-10 font-geist"
        initial={{ opacity: 0, y: 6 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.18 }}
      >
        Everything you just unlocked is already active on your account. Head
        to the dashboard or jump straight into a player profile.
      </motion.p>
      <motion.div
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.26 }}
      >
        <Link
          to="/dashboard"
          className="
            group inline-flex items-center justify-center gap-3
            px-7 py-3 rounded-sm font-jetbrains text-[12px] tracking-[0.22em] uppercase
            text-liquirice bg-jade hover:bg-jade/90
            shadow-[0_18px_36px_rgba(0,217,146,0.32),0_0_18px_rgba(0,217,146,0.25)]
            transition-all duration-200 cursor-clicker
          "
        >
          Go to dashboard
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
        <Link
          to="/"
          className="
            inline-flex items-center justify-center
            px-6 py-3 rounded-sm font-jetbrains text-[12px] tracking-[0.22em] uppercase
            text-flash/60 border border-flash/15
            hover:text-flash hover:border-jade/35
            transition-colors duration-200 cursor-clicker
          "
        >
          Explore the platform
        </Link>
      </motion.div>
    </section>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────
function FooterStrip({ sessionId }: { sessionId: string | null }) {
  return (
    <div className="mt-4 mb-16 flex items-center justify-center font-jetbrains text-[10px] tracking-[0.22em] uppercase text-flash/25">
      {sessionId ? (
        <span className="tabular-nums">ref · {sessionId.slice(0, 18)}…</span>
      ) : (
        <span>ref · awaiting session</span>
      )}
    </div>
  )
}

