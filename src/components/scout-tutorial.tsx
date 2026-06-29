// A cinematic "what's that?" tutorial for Scout — the twin of ExplorerTutorial.
// Dim backdrop + jade core glow, an Orbitron SCOUT title, then 3 squared glass
// dialogs (summoner main-box shell — no outline, inset hairline) revealed one at a
// time. The mockups reuse the REAL scout vocabulary: a lobby roster of profile
// avatars, live signals (LIVE pulse, LP swings, duo detection, auto-refresh) and a
// ranked leaderboard with animated win/loss bars. A "DIVE INTO IT" button follows.

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, Users, Radio, Trophy, TrendingUp, TrendingDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { cdnBaseUrl } from "@/config"

const EASE = [0.22, 1, 0.36, 1] as const
const JADE = "#00d992"
const RED = "#ff6286"
const GOLD = "#FFB615"

// the summoner page's main-box glass — squared, NO outline, inset hairline.
const glassBox = cn(
  "relative overflow-hidden rounded-md",
  "bg-[#0a0f12]/95 saturate-150",
  "shadow-[0_14px_40px_rgba(0,0,0,0.6),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]",
)

const container = { hidden: {}, show: { transition: { staggerChildren: 0.7, delayChildren: 0.4 } } }
const cardV = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE } },
}

// ── shared atoms ─────────────────────────────────────────────────────────────
function Avatar({ id, size = 22, ring = "jade" }: { id: number; size?: number; ring?: "jade" | "red" | "dim" }) {
  const ringColor = ring === "red" ? `${RED}88` : ring === "dim" ? "rgba(215,216,217,0.18)" : `${JADE}88`
  return (
    <img
      src={`${cdnBaseUrl()}/img/profileicon/${id}.png`}
      alt=""
      style={{ width: size, height: size, boxShadow: `0 0 0 1px ${ringColor}` }}
      className="shrink-0 rounded-full bg-black/40 object-cover"
      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
    />
  )
}

// a faithful mini scout panel — jade accent header + glyph, dark body.
function ScoutCard({ label, glyph: Glyph, glow = false, right, className, children }: {
  label: string
  glyph: React.ComponentType<{ className?: string }>
  glow?: boolean
  right?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn("rounded-[6px] border border-jade/25 bg-[rgba(8,14,16,0.97)]", className)}
      style={{ boxShadow: glow ? `0 0 0 1px ${JADE}, 0 8px 26px rgba(0,0,0,.5), 0 0 20px ${JADE}33` : "0 6px 18px rgba(0,0,0,.45)" }}
    >
      <div
        className="flex items-center gap-1.5 rounded-t-[6px] px-2 py-1"
        style={{ background: `linear-gradient(90deg, ${JADE}26, transparent)`, borderBottom: `1px solid ${JADE}33` }}
      >
        <Glyph className="h-3 w-3 text-jade" />
        <span className="font-chakrapetch text-[9px] font-bold tracking-[0.16em] text-jade">{label}</span>
        {right && <span className="ml-auto">{right}</span>}
      </div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-[4px] bg-black/30 px-1.5 py-1">{children}</div>
}

// ── step shell (identical cadence to the Explorer tutorial) ──────────────────
function StepCard({ index, title, desc, children }: { index: number; title: string; desc: string; children: React.ReactNode }) {
  return (
    <motion.div variants={cardV} className={cn(glassBox, "flex w-full flex-col p-5 sm:w-[330px]")}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-[4px] bg-jade font-chakrapetch text-[14px] font-black text-black shadow-[0_0_16px_rgba(0,217,146,0.5)]">
          {index}
        </span>
        <span className="font-chakrapetch text-[13px] font-bold uppercase tracking-[0.16em] text-flash/95">{title}</span>
      </div>
      <div className="mb-4 grid h-[150px] place-items-center overflow-hidden rounded-[4px] bg-[#05090b]">
        {children}
      </div>
      <p className="font-chakrapetch text-[13px] leading-relaxed text-flash/65">{desc}</p>
    </motion.div>
  )
}

// ── mockups ──────────────────────────────────────────────────────────────────
function RosterMock() {
  const rows = [
    { id: 588, name: "Faker", region: "KR" },
    { id: 685, name: "Caps", region: "EUW" },
    { id: 4568, name: "Chovy", region: "KR" },
  ]
  return (
    <ScoutCard label="LOBBY" glyph={Users} className="w-[198px]">
      <div className="flex flex-col gap-1.5 px-2 py-2">
        {rows.map((r) => (
          <Row key={r.id}>
            <Avatar id={r.id} size={22} />
            <span className="font-chakrapetch text-[10px] font-bold text-flash/90">{r.name}</span>
            <span className="ml-auto font-chakrapetch text-[8px] font-bold uppercase tracking-wider text-flash/40">{r.region}</span>
          </Row>
        ))}
        <div className="flex items-center justify-center gap-1 rounded-[4px] border border-dashed border-jade/30 px-1.5 py-1 font-chakrapetch text-[9px] font-bold uppercase tracking-wider text-jade/70">
          <Plus className="h-3 w-3" /> add account
        </div>
      </div>
    </ScoutCard>
  )
}

function LiveMock() {
  const Countdown = (
    <span className="inline-flex items-center gap-1 font-chakrapetch text-[8px] font-bold tabular-nums text-jade/70">
      <span className="h-2.5 w-2.5 rounded-full border border-jade/40 border-t-jade scout-spin" /> 4:58
    </span>
  )
  return (
    <ScoutCard label="LIVE" glyph={Radio} glow right={Countdown} className="w-[206px]">
      <div className="flex flex-col gap-1.5 px-2 py-2">
        {/* in a game right now */}
        <Row>
          <Avatar id={588} size={20} ring="red" />
          <span className="font-chakrapetch text-[10px] font-bold text-flash/90">Faker</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-[3px] bg-[#ff6286]/15 px-1.5 py-[1px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff6286] scout-pulse" />
            <span className="font-chakrapetch text-[8px] font-bold uppercase tracking-wider text-[#ff6286]">Live</span>
          </span>
        </Row>
        {/* duo: two accounts queued together, climbing */}
        <Row>
          <div className="flex shrink-0">
            <Avatar id={685} size={20} />
            <span className="-ml-2 rounded-full ring-2 ring-[#0a0f12]"><Avatar id={4568} size={20} /></span>
          </div>
          <span className="font-chakrapetch text-[10px] font-bold text-flash/90">Caps</span>
          <span className="rounded-[3px] bg-jade/15 px-1 py-[1px] font-chakrapetch text-[7px] font-bold uppercase tracking-wider text-jade">Duo</span>
          <span className="ml-auto inline-flex items-center gap-0.5 font-chakrapetch text-[9px] font-bold text-jade"><TrendingUp className="h-3 w-3" />+24</span>
        </Row>
        {/* a loss */}
        <Row>
          <Avatar id={5212} size={20} ring="dim" />
          <span className="font-chakrapetch text-[10px] font-bold text-flash/90">Keria</span>
          <span className="ml-auto inline-flex items-center gap-0.5 font-chakrapetch text-[9px] font-bold text-[#ff6286]"><TrendingDown className="h-3 w-3" />−16</span>
        </Row>
      </div>
    </ScoutCard>
  )
}

function BoardMock() {
  const rows = [
    { rank: 1, id: 588, name: "Faker", win: 0.68, lp: "+312", c: GOLD },
    { rank: 2, id: 685, name: "Caps", win: 0.61, lp: "+204", c: "rgba(215,216,217,0.85)" },
    { rank: 3, id: 4568, name: "Chovy", win: 0.55, lp: "+158", c: "#c08457" },
  ]
  return (
    <ScoutCard label="LEADERBOARD" glyph={Trophy} glow className="w-[214px]">
      <div className="flex flex-col gap-1.5 px-2 py-2">
        {rows.map((r, i) => (
          <Row key={r.id}>
            <span className="w-3 shrink-0 text-center font-chakrapetch text-[10px] font-black tabular-nums" style={{ color: r.c }}>{r.rank}</span>
            <Avatar id={r.id} size={18} />
            <span className="w-[44px] shrink-0 truncate font-chakrapetch text-[9px] font-bold text-flash/85">{r.name}</span>
            <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-[#ff6286]/30">
              <motion.div
                className="h-full bg-gradient-to-r from-jade/60 to-jade"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(r.win * 100)}%` }}
                transition={{ duration: 0.9, ease: EASE, delay: 2.1 + i * 0.18 }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-chakrapetch text-[9px] font-bold tabular-nums text-jade/85">{r.lp}</span>
          </Row>
        ))}
      </div>
    </ScoutCard>
  )
}

export function ScoutTutorial({ open, onClose, onDive }: {
  open: boolean
  onClose: () => void
  onDive: () => void
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto px-4 py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          {/* cinematic backdrop: deep dim + a jade core glow */}
          <div className="absolute inset-0" style={{ background: "rgba(2,7,6,0.86)", backdropFilter: "blur(10px)" }} />
          <div className="pointer-events-none absolute left-1/2 top-[22%] h-[320px] w-[620px] -translate-x-1/2 rounded-full bg-jade/15 blur-[90px]" />

          <style>{`
            @keyframes scoutPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(.6); } }
            .scout-pulse { animation: scoutPulse 1.1s ease-in-out infinite; }
            @keyframes scoutSpin { to { transform: rotate(360deg); } }
            .scout-spin { animation: scoutSpin 2.4s linear infinite; }
          `}</style>

          <motion.div
            className="relative w-full max-w-5xl"
            initial={{ scale: 0.97, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 16 }}
            transition={{ duration: 0.45, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* close — borderless text affordance tucked into the corner */}
            <button
              type="button"
              onClick={onClose}
              className="group/close absolute right-0 top-0 z-10 inline-flex items-center gap-1.5 font-chakrapetch text-[10px] font-bold uppercase tracking-[0.22em] text-flash/40 transition-colors hover:text-jade cursor-clicker"
              aria-label="Close tutorial"
            >
              Close
              <X className="h-3.5 w-3.5 transition-transform group-hover/close:rotate-90" />
            </button>

            {/* cinematic title */}
            <motion.div className="text-center" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <div className="mb-2 font-jetbrains text-[11px] uppercase tracking-[0.5em] text-jade/70">How it works</div>
              <h2
                className="font-orbitron text-5xl font-black uppercase tracking-[0.18em] text-flash sm:text-6xl"
                style={{ textShadow: "0 0 32px rgba(0,217,146,0.45), 0 0 4px rgba(0,217,146,0.6)" }}
              >
                Scout
              </h2>
              <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-jade/60 to-transparent" />
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="mt-10 flex flex-col items-stretch justify-center gap-5 sm:flex-row"
            >
              <StepCard
                index={1}
                title="Build your roster"
                desc="Drop in any number of Riot accounts — duos, smurfs, a whole team. Scout pulls them all into one shared lobby you control."
              >
                <RosterMock />
              </StepCard>
              <StepCard
                index={2}
                title="Tracked live"
                desc="Scout auto-refreshes every few minutes: every new game, each LP swing, who's in a game right now, and which accounts queued together."
              >
                <LiveMock />
              </StepCard>
              <StepCard
                index={3}
                title="One shared board"
                desc="A unified match feed and a live leaderboard rank the whole roster by climb — games, win-rate and LP gained, session by session."
              >
                <BoardMock />
              </StepCard>
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="mt-9 flex justify-center">
              <motion.button
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { delay: 2.7, duration: 0.55, ease: EASE } } }}
                type="button"
                onClick={onDive}
                className="group inline-flex items-center gap-2.5 rounded-md border border-jade/45 bg-jade/20 px-7 py-3 font-chakrapetch text-[14px] font-bold uppercase tracking-[0.2em] text-jade shadow-[0_0_36px_rgba(0,217,146,0.32)] transition-colors hover:bg-jade/30 cursor-clicker"
              >
                Create a lobby
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
