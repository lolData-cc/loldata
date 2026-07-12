// src/components/overview.tsx — Personal Performance Command Center.
// Homepage language: clean glass panels (bright inset hairline on #040A0C),
// chakrapetch numbers, mono eyebrows, jade/red/citrine states, bento layout.
// Data: /api/learn/overview (period day|week) — aggregates + LP track +
// timeline insights (laning diffs, death clock, objectives) + spotlight.
import { useEffect, useMemo, useRef, useState } from "react"
import { useLearnOverview, type Period } from "@/hooks/useLearnOverview"
import { StrengthsWeaknesses } from "@/components/learn/strengths-weaknesses"
import { OverviewSkeleton } from "@/components/learn/overview-skeleton"
import { OrbitEmpty } from "@/components/learn/orbit-empty"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { normalizeChampName, cdnBaseUrl, cdnSplashUrl } from "@/config"
import { getRankImage } from "@/utils/rankIcons"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip as RTooltip,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts"

type Props = { puuid: string | null; region: string | null; nametag: string | null }

const EASE = [0.22, 1, 0.36, 1] as const
const CITRINE = "#FFB615"
const roleLabel = (r: string) => ({ TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "ADC", UTILITY: "Support" }[r] ?? (r || "—"))

/* ═══════════════════════════ building blocks ═══════════════════════════ */

// THE panel — dark cyber glass. The card separates from the flat #040A0C bg on
// three cues: a lit gradient fill (faint jade sheen top-left → near-black teal),
// a crisp jade outer ring, and a tight jade outer glow. Stays dark, reads clearly.
const glass =
  "relative overflow-hidden rounded-md backdrop-blur-xl saturate-150 glass-panel " +
  "bg-[linear-gradient(158deg,rgba(0,217,146,0.06)_0%,rgba(6,14,16,0.55)_34%,rgba(2,6,8,0.62)_100%)] " +
  "shadow-[0_16px_40px_-8px_rgba(var(--c-shadow),0.7),0_0_0_1px_rgba(0,217,146,0.30),0_0_22px_-10px_rgba(0,217,146,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]"

function Panel({ title, hint, children, className, delay = 0 }: {
  title?: string; hint?: React.ReactNode; children: React.ReactNode; className?: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45, ease: EASE }}
      className={cn(glass, "flex flex-col", className)}
    >
      {/* cyber top accent */}
      <span className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-jade/40 to-transparent" />
      <div className="relative z-[1] flex flex-1 flex-col px-4 py-3.5 min-h-0">
        {(title || hint) && (
          <div className="mb-3 flex items-center justify-between gap-3 shrink-0">
            {title && <p className="font-chakrapetch font-bold text-[12.5px] uppercase tracking-[0.14em] text-flash/90">{title}</p>}
            {hint && <span className="shrink-0 font-mono text-[10.5px] tracking-[0.04em] text-flash/45">{hint}</span>}
          </div>
        )}
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </motion.div>
  )
}

function Delta({ now, base, invert = false, suffix = "" }: { now: number; base?: number | null; invert?: boolean; suffix?: string }) {
  if (base == null || base === 0 || !isFinite(now / base)) return null
  const pct = Math.round(((now - base) / Math.abs(base)) * 100)
  if (pct === 0) return <span className="font-mono text-[9px] text-flash/25">= avg</span>
  const good = invert ? pct < 0 : pct > 0
  return (
    <span className={cn("font-mono text-[9px] tabular-nums", good ? "text-jade/80" : "text-red-400/70")}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%{suffix}
    </span>
  )
}

/* mini sparkline with baseline delta */
function TrendCard({ title, data, dataKey, now, base, delay, format = (v: number) => String(v) }: {
  title: string; data: any[]; dataKey: string; now: number; base?: number | null; delay: number; format?: (v: number) => string
}) {
  const chrono = useMemo(() => [...(data ?? [])].reverse(), [data])
  return (
    <Panel delay={delay} className="min-h-[126px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-flash/45">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-chakrapetch font-bold text-[24px] leading-none text-flash/90 tabular-nums">{format(now)}</span>
            <Delta now={now} base={base} />
          </div>
          {base != null && <p className="font-mono text-[9.5px] text-flash/35 mt-0.5">avg {format(base)}</p>}
        </div>
        <div className="w-[45%] h-[46px] mt-1">
          {chrono.length > 1 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chrono} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`tf-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d992" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00d992" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Area type="monotone" dataKey={dataKey} stroke="#00d992" strokeWidth={1.5} fill={`url(#tf-${title})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Panel>
  )
}

/* ═══════════════════════════ hero ═══════════════════════════ */

function PeriodToggle({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  return (
    <div className="relative flex rounded-[4px] bg-black/50 backdrop-blur-md p-0.5 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.10)]">
      {(["day", "week"] as Period[]).map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={cn("relative z-10 px-4 py-1.5 text-[9px] font-mono tracking-[0.18em] uppercase transition-colors duration-200 rounded-[3px] cursor-clicker",
            period === p ? "text-jade" : "text-flash/30 hover:text-flash/55")}>
          {period === p && <motion.div layoutId="learn-period-pill" className="absolute inset-0 rounded-[3px] bg-jade/10 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.35),0_0_14px_rgba(0,217,146,0.12)]" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
          <span className="relative z-10">{p === "day" ? "Today" : "This Week"}</span>
        </button>
      ))}
    </div>
  )
}

function HeroNumber({ label, value, sub, color, delay }: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45, ease: EASE }} className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-flash/40 mb-1.5">{label}</p>
      <div className={cn("font-chakrapetch font-bold text-[34px] md:text-[40px] leading-none tabular-nums", color ?? "text-flash/90")}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-flash/30 mt-1.5">{sub}</div>}
    </motion.div>
  )
}

function ImpactRadial({ value, delay }: { value: number; delay: number }) {
  const stroke = value >= 70 ? "#00d992" : value >= 50 ? CITRINE : "#f87171"
  const size = 92, r = size / 2 - 7, circ = 2 * Math.PI * r
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, duration: 0.5, ease: EASE }}
      className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="3.5" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }} animate={{ strokeDasharray: `${(value / 100) * circ} ${circ}` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: delay + 0.2 }} style={{ filter: `drop-shadow(0 0 8px ${stroke}50)` }} />
      </svg>
      <div className="flex flex-col items-center leading-none">
        <span className="font-chakrapetch font-bold text-[26px] tabular-nums" style={{ color: stroke }}>{value}</span>
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-flash/40 mt-1">impact</span>
      </div>
    </motion.div>
  )
}

/* ── rank progress: period START elo → arrow → CURRENT elo ──────────────
   The backend anchors the LP curve to the player's real current rank and
   reconstructs the period's movement, so points[0].lp is the START cumulative
   score. We invert it (same TIER_BASE/DIV_OFFSET tables as the backend) to a
   tier/division and render it like the summoner-page rank block. */
const INV_TIERS: [string, number][] = [
  ["IRON", 0], ["BRONZE", 400], ["SILVER", 800], ["GOLD", 1200],
  ["PLATINUM", 1600], ["EMERALD", 2000], ["DIAMOND", 2400], ["MASTER", 2800],
]
const INV_DIVS = ["IV", "III", "II", "I"]
function scoreToRank(score: number, apexTier = "MASTER"): { tier: string; division: string | null; lp: number } {
  const s = Math.max(0, Math.round(score))
  if (s >= 2800) return { tier: apexTier, division: null, lp: s - 2800 } // apex = continuous LP
  let tier = "IRON", base = 0
  for (const [t, b] of INV_TIERS) if (s >= b) { tier = t; base = b }
  const off = s - base
  return { tier, division: INV_DIVS[Math.min(3, Math.floor(off / 100))], lp: off % 100 }
}
const titleCase = (t: string) => t.charAt(0) + t.slice(1).toLowerCase()

function Emblem({ tier, dim }: { tier: string; dim?: boolean }) {
  return (
    <div className={cn("relative w-[74px] h-[74px] mx-auto flex items-center justify-center", dim && "opacity-70")}>
      <div className="absolute w-[52px] h-[52px] bg-filmdark/40 rounded-full border border-flash/[0.08] shadow-[inset_0_0_12px_rgba(var(--c-shadow),0.5)]" />
      <img src={getRankImage(tier)} alt="" className="w-[74px] h-[74px] relative z-10" draggable={false}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/img/unranked.png" }} />
    </div>
  )
}

function RankText({ tier, division, lp, dim }: { tier: string; division: string | null; lp: number; dim?: boolean }) {
  return (
    <div className={cn("text-center leading-tight", dim && "opacity-70")}>
      <div className="font-mono text-[11px] text-flash/65 tracking-wide">{titleCase(tier)}{division ? ` ${division}` : ""}</div>
      <div className="font-chakrapetch font-bold text-[16px] text-flash/90 tabular-nums leading-none mt-0.5">
        {lp}<span className="text-[10px] text-flash/45 ml-0.5">LP</span>
      </div>
    </div>
  )
}

// cyber connector: diamond origin node → segmented energy line with a
// traveling pulse → double-chevron glowing arrowhead
function CyberArrow({ color }: { color: string }) {
  return (
    <svg width="84" height="20" viewBox="0 0 84 20" className="overflow-visible mx-auto">
      <defs>
        <linearGradient id="ca-line" x1="0" x2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.08" />
          <stop offset="1" stopColor={color} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {/* origin diamond */}
      <rect x="1.5" y="7.5" width="5" height="5" fill={color} fillOpacity="0.75" transform="rotate(45 4 10)" style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
      {/* segmented base line */}
      <line x1="10" y1="10" x2="62" y2="10" stroke="url(#ca-line)" strokeWidth="1.6" strokeDasharray="2 3" />
      {/* traveling energy pulse */}
      <motion.circle cy="10" r="2.6" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        initial={{ cx: 10, opacity: 0 }} animate={{ cx: [10, 62], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }} />
      {/* double chevron arrowhead */}
      <path d="M60 3.5 L69 10 L60 16.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}99)` }} />
      <path d="M67.5 4.5 L75 10 L67.5 15.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.55" />
    </svg>
  )
}

function RankProgress({ lp }: { lp: any }) {
  if (!lp?.current || !lp.points?.length) return null // needs a real rank anchor
  const start = scoreToRank(lp.points[0].lp, lp.current.tier)
  const end = { tier: lp.current.tier as string, division: (lp.current.division ?? null) as string | null, lp: lp.current.lp as number }
  const net = lp.netLp ?? 0
  const up = net >= 0
  const color = up ? "#00d992" : "#f87171"
  const eyebrow = "font-mono text-[9px] tracking-[0.28em] uppercase text-flash/30 text-center"
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.16, duration: 0.45, ease: EASE }}
      className="grid grid-cols-[auto_92px_auto] items-center gap-x-1.5">
      {/* row 1 — eyebrows only */}
      <span className={eyebrow}>Start</span>
      <span />
      <span className={eyebrow}>Now</span>
      {/* row 2 — emblems + centered cyber arrow (net LP glued right above the arrow) */}
      <Emblem tier={start.tier} dim />
      <div className="flex items-center justify-center">
        <div className="relative">
          <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap font-chakrapetch font-bold text-[16px] tabular-nums leading-none" style={{ color, textShadow: `0 0 12px ${color}66` }}>
            {up ? "+" : ""}{net}
          </span>
          <CyberArrow color={color} />
        </div>
      </div>
      <Emblem tier={end.tier} />
      {/* row 3 — rank labels + estimate marker */}
      <RankText {...start} dim />
      <span className="text-center font-mono text-[9px] tracking-[0.15em] uppercase text-flash/25">net · est</span>
      <RankText {...end} />
    </motion.div>
  )
}

/* ═══════════════════════════ session ribbon ═══════════════════════════ */

function SessionRibbon({ games, selectableIds, selectedId, onSelect }: {
  games: any[]
  selectableIds: Set<string>
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  // hide remakes (early-surrender games < 5 min) from the ribbon
  const chrono = useMemo(() => [...(games ?? [])].reverse().filter((g) => (g.durationMin ?? 99) >= 5), [games])
  const scrollRef = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, moved: false, startX: 0, startLeft: 0 })
  // mouse wheel → horizontal scroll, and click-and-drag to pan the row
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return // touch/pen use native scroll
      drag.current = { down: true, moved: false, startX: e.clientX, startLeft: el.scrollLeft }
    }
    const onMove = (e: PointerEvent) => {
      if (!drag.current.down) return
      const dx = e.clientX - drag.current.startX
      if (Math.abs(dx) > 4) {
        drag.current.moved = true
        el.style.cursor = "grabbing"
        el.scrollLeft = drag.current.startLeft - dx
      }
    }
    const onUp = () => {
      if (!drag.current.down) return
      drag.current.down = false
      el.style.cursor = ""
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("pointerdown", onDown)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [chrono.length])
  if (!chrono.length) return null
  const kf = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(Math.round(n ?? 0)))
  return (
    <div ref={scrollRef} className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 cursor-grab select-none">
      {chrono.map((g, i) => {
        const canPick = !!g.matchId && selectableIds.has(g.matchId)
        const isSel = canPick && g.matchId === selectedId
        const perfect = g.deaths === 0
        const kda = perfect ? g.kills + g.assists : (g.kills + g.assists) / g.deaths
        const tone = g.impact >= 70 ? "jade" : g.impact >= 50 ? "citrine" : "red"
        const toneText = tone === "jade" ? "text-jade" : tone === "citrine" ? "text-[#FFB615]" : "text-red-400"
        const toneBar = tone === "jade" ? "bg-jade" : tone === "citrine" ? "bg-[#FFB615]" : "bg-red-400/80"
        // result pill — MVP (best on winning team) / ACE (best on losing team) outrank plain WIN/LOSS
        const badge = g.mvp
          ? { txt: "MVP", cls: "bg-[#FFB615]/20 text-[#FFB615] shadow-[inset_0_0_0_1px_rgba(255,182,21,0.55),0_0_10px_-3px_rgba(255,182,21,0.7)]" }
          : g.ace
          ? { txt: "ACE", cls: "bg-flash/15 text-flash/90 shadow-[inset_0_0_0_1px_rgba(215,216,217,0.40)]" }
          : g.win
          ? { txt: "WIN", cls: "bg-jade/15 text-jade shadow-[inset_0_0_0_1px_rgba(0,217,146,0.45)]" }
          : { txt: "LOSS", cls: "bg-red-400/15 text-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.45)]" }
        return (
          <motion.button key={i} type="button"
            onClick={canPick ? () => { if (drag.current.moved) return; onSelect(g.matchId) } : undefined}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.03, duration: 0.4, ease: EASE }}
            className={cn(
              "group relative shrink-0 w-[128px] rounded-[11px] overflow-hidden flex flex-col text-center transition-all duration-200",
              "bg-gradient-to-b from-filmlight/[0.05] via-filmdark/25 to-filmdark/45 backdrop-blur-sm",
              isSel
                ? "shadow-[inset_0_0_0_1.5px_rgba(0,217,146,0.7),0_10px_26px_-8px_rgba(0,217,146,0.4)] -translate-y-0.5"
                : g.win
                ? "shadow-[inset_0_0_0_1px_rgba(0,217,146,0.18),0_5px_16px_-10px_rgba(0,0,0,0.7)]"
                : "shadow-[inset_0_0_0_1px_rgba(248,113,113,0.16),0_5px_16px_-10px_rgba(0,0,0,0.7)]",
              canPick ? "cursor-clicker hover:-translate-y-0.5" : "cursor-default opacity-60",
              canPick && !isSel && (g.win
                ? "hover:shadow-[inset_0_0_0_1px_rgba(0,217,146,0.42),0_12px_26px_-10px_rgba(0,217,146,0.3)]"
                : "hover:shadow-[inset_0_0_0_1px_rgba(248,113,113,0.36),0_12px_26px_-10px_rgba(0,0,0,0.6)]"),
            )}
            title={`${g.mvp ? "MVP · " : g.ace ? "ACE · " : ""}${g.champion} · ${g.kills}/${g.deaths}/${g.assists} · IMPACT ${g.impact} · ${g.durationMin}m${canPick ? " · click to break down" : ""}`}
          >
            {/* result-tinted top accent */}
            <div className={cn("h-[3px] w-full shrink-0", g.win
              ? "bg-gradient-to-r from-transparent via-jade/70 to-transparent"
              : "bg-gradient-to-r from-transparent via-red-400/60 to-transparent")} />

            <div className="px-2.5 pt-2 pb-2 flex flex-col items-center gap-1.5">
              {/* header — game index + accolade */}
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-[8px] tracking-[0.16em] text-flash/30">G{chrono.length - i}</span>
                <span className={cn("px-1.5 rounded-full font-mono text-[8px] font-bold tracking-[0.12em] leading-[14px]", badge.cls)}>{badge.txt}</span>
              </div>

              {/* champion portrait with result glow ring */}
              <div className="relative mt-0.5">
                <div className={cn("absolute -inset-1 rounded-full blur-md opacity-40 group-hover:opacity-70 transition-opacity", g.win ? "bg-jade/40" : "bg-red-400/30")} />
                <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(g.champion)}.png`} alt="" draggable={false}
                  className={cn("relative w-[52px] h-[52px] rounded-full object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] ring-2", g.win ? "ring-jade/55" : "ring-red-400/45")}
                  onError={(e) => { e.currentTarget.style.display = "none" }} />
              </div>

              {/* champ name + role */}
              <div className="flex flex-col items-center gap-0.5 leading-none">
                <span className="font-chakrapetch font-bold text-[11.5px] text-flash/90 truncate max-w-[108px]">{g.champion}</span>
                {g.role && <span className="font-mono text-[7.5px] tracking-[0.2em] uppercase text-flash/30">{roleLabel(g.role)}</span>}
              </div>

              {/* IMPACT hero number */}
              <div className="flex flex-col items-center leading-none mt-0.5">
                <span className={cn("font-chakrapetch font-bold text-[27px] tabular-nums", toneText)}>{g.impact}</span>
                <span className="font-mono text-[7px] tracking-[0.24em] uppercase text-flash/30 mt-0.5">Impact</span>
              </div>

              {/* KDA + ratio */}
              <div className="flex flex-col items-center gap-0.5 leading-none mt-0.5">
                <span className="font-chakrapetch text-[12.5px] tabular-nums text-flash/85">
                  {g.kills}<span className="text-flash/25">/</span><span className="text-red-400/80">{g.deaths}</span><span className="text-flash/25">/</span>{g.assists}
                </span>
                <span className={cn("font-mono text-[8px] tabular-nums", perfect ? "text-jade" : kda >= 3 ? "text-flash/50" : "text-flash/35")}>
                  {perfect ? "Perfect" : `${kda.toFixed(1)} KDA`}
                </span>
              </div>

              {/* mini stats */}
              <div className="grid grid-cols-2 w-full mt-1 pt-1.5 border-t border-flash/[0.06] divide-x divide-flash/[0.06]">
                {[{ l: "CS/M", v: g.cspm ?? 0 }, { l: "DMG", v: kf(g.damage ?? 0) }].map((s) => (
                  <div key={s.l} className="flex flex-col items-center gap-0.5 leading-none">
                    <span className="font-chakrapetch font-semibold text-[11px] tabular-nums text-flash/75">{s.v}</span>
                    <span className="font-mono text-[6.5px] tracking-[0.16em] uppercase text-flash/30">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* impact footer bar — the row reads as your form across the session */}
            <div className="mt-auto h-[3px] w-full bg-filmdark/50 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${g.impact}%` }} transition={{ delay: 0.3 + i * 0.03, duration: 0.5, ease: EASE }}
                className={cn("h-full", toneBar)} />
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ═══════════════════════════ LP track ═══════════════════════════ */

function LpTrackChart({ lp }: { lp: any }) {
  const data = useMemo(() => (lp?.points ?? []).map((p: any) => ({ i: p.i, lp: p.lp, win: p.win, champion: p.champion })), [lp])
  if (data.length < 2) return <p className="font-mono text-[10px] text-flash/25">Not enough games for a trajectory.</p>
  const up = (lp.netLp ?? 0) >= 0
  const color = up ? "#00d992" : "#f87171"
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <div>
          {lp.current
            ? <span className="font-chakrapetch font-bold text-[15px] text-flash/90">{lp.current.label}</span>
            : <span className="font-mono text-[10px] text-flash/30">unranked / placement</span>}
        </div>
        <div className="text-right leading-none">
          <span className={cn("font-chakrapetch font-bold text-[26px] tabular-nums", up ? "text-jade" : "text-red-400")}>{up ? "+" : ""}{lp.netLp}</span>
          <span className="font-mono text-[9px] text-flash/30 ml-1">LP</span>
          <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/35 mt-1">net · estimated</p>
        </div>
      </div>
      <div className="flex-1 min-h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 6 }}>
            <defs>
              <linearGradient id="lpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.30} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["dataMin - 12", "dataMax + 12"]} />
            <RTooltip cursor={{ stroke: "rgba(255,255,255,0.1)" }}
              contentStyle={{ background: "rgba(4,10,12,0.96)", border: "1px solid rgba(0,217,146,0.18)", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}
              labelStyle={{ display: "none" }}
              formatter={(v: any, _n: any, entry: any) => [`${v} LP${entry?.payload?.champion ? " · " + entry.payload.champion : ""}`, ""]} />
            <Area type="monotone" dataKey="lp" stroke={color} strokeWidth={2} fill="url(#lpFill)"
              dot={(props: any) => {
                const p = data[props.index]
                if (props.index === 0) return <g key={props.index} />
                return <circle key={props.index} cx={props.cx} cy={props.cy} r={3} fill={p?.win ? "#00d992" : "#f87171"} stroke="#040A0C" strokeWidth={1.5} />
              }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ═══════════════════════════ radar vs baseline ═══════════════════════════ */

function FormRadar({ t, b }: { t: any; b: any }) {
  const data = useMemo(() => {
    if (!b) return []
    const pct = (now: number, base: number) => (base > 0 ? Math.max(20, Math.min(180, (now / base) * 100)) : 100)
    return [
      { k: "KDA", v: pct(t.avgKDA, b.avgKDA) },
      { k: "CS/M", v: pct(t.avgCSPM, b.avgCSPM) },
      { k: "VISION", v: pct(t.avgVision, b.avgVision) },
      { k: "KP", v: pct(t.avgKP ?? t.killParticipation, b.avgKP) },
      { k: "DMG", v: pct(t.avgDmgShare ?? t.avgDamageShare, b.avgDmgShare) },
    ]
  }, [t, b])
  if (!data.length) return <p className="font-mono text-[10px] text-flash/25">Play more games to unlock the form radar.</p>
  return (
    <div className="h-full min-h-[200px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 22, right: 40, bottom: 24, left: 40 }}>
          <PolarGrid stroke="rgba(255,255,255,0.07)" />
          <PolarAngleAxis dataKey="k" tick={{ fill: "rgba(215,216,217,0.5)", fontSize: 10, fontFamily: "monospace" }} />
          {/* baseline ring = 100 */}
          <Radar dataKey={() => 100} stroke="rgba(215,216,217,0.22)" fill="none" strokeDasharray="3 3" isAnimationActive={false} />
          <Radar dataKey="v" stroke="#00d992" fill="#00d992" fillOpacity={0.18} strokeWidth={1.5} />
        </RadarChart>
      </ResponsiveContainer>
      <span className="absolute bottom-0.5 right-1 font-mono text-[9.5px] text-flash/35">dashed = your average</span>
    </div>
  )
}

/* ═══════════════════════════ spotlight ═══════════════════════════ */

function gradientOffset(data: { diff: number }[]) {
  const max = Math.max(...data.map((d) => d.diff), 0)
  const min = Math.min(...data.map((d) => d.diff), 0)
  if (max <= 0) return 0
  if (min >= 0) return 1
  return max / (max - min)
}

function SpotlightPanel({ s, delay }: { s: any; delay: number }) {
  if (!s) return (
    <Panel title="Game of the period" delay={delay} className="min-h-[220px]">
      <p className="font-mono text-[10px] text-flash/25">No timeline data yet for this period.</p>
    </Panel>
  )
  const off = gradientOffset(s.goldCurve)
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45, ease: EASE }}
      className={cn(glass, "flex flex-col")}>
      {/* splash header */}
      <div className="relative h-[96px] overflow-hidden shrink-0">
        <img src={cdnSplashUrl(normalizeChampName(s.champion))} alt="" className="absolute inset-0 w-full h-full object-cover object-[center_20%] opacity-45" onError={(e) => { e.currentTarget.style.display = "none" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A0C] via-[#040A0C]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#040A0C] to-transparent" />
        <div className="relative z-10 flex items-center gap-3 h-full px-4">
          <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(s.champion)}.png`} alt="" className="w-11 h-11 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]" onError={(e) => { e.currentTarget.style.display = "none" }} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn("font-mono text-[9px] font-bold tracking-[0.16em] px-1.5 py-[2px] rounded-[3px]", s.win ? "bg-jade/15 text-jade" : "bg-red-400/15 text-red-400")}>{s.tag}</span>
              <span className="font-mono text-[10px] text-flash/40 uppercase tracking-wider">{roleLabel(s.role)}</span>
            </div>
            <div className="font-chakrapetch font-bold text-[17px] text-flash/95 leading-tight mt-0.5">{s.champion}</div>
          </div>
          <div className="ml-auto text-right shrink-0">
            <div className="font-chakrapetch font-bold text-[17px] tabular-nums text-flash/90">
              {s.kills}<span className="text-flash/25">/</span><span className="text-red-400/70">{s.deaths}</span><span className="text-flash/25">/</span>{s.assists}
            </div>
            <div className="font-mono text-[9.5px] text-flash/40 tracking-[0.14em] uppercase mt-0.5">impact {s.impact}</div>
          </div>
        </div>
      </div>

      <div className="relative z-[1] px-4 pt-2.5 pb-4 flex-1 flex flex-col">
        <p className={cn("font-mono text-[11px] leading-relaxed mb-2.5", s.win ? "text-jade/75" : "text-red-400/75")}>{s.verdict}</p>

        <div className="h-[108px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={s.goldCurve} margin={{ top: 6, right: 8, bottom: 2, left: 8 }}>
              <defs>
                <linearGradient id="goldSplit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={off} stopColor="#00d992" stopOpacity={0.9} />
                  <stop offset={off} stopColor="#f87171" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor="#00d992" stopOpacity={0.25} />
                  <stop offset={off} stopColor="#00d992" stopOpacity={0.02} />
                  <stop offset={off} stopColor="#f87171" stopOpacity={0.02} />
                  <stop offset={1} stopColor="#f87171" stopOpacity={0.25} />
                </linearGradient>
              </defs>
              <XAxis dataKey="min" tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 10, fontFamily: "monospace" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}'`} interval={4} />
              <YAxis hide />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
              <RTooltip cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                contentStyle={{ background: "rgba(4,10,12,0.96)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, fontSize: 11, fontFamily: "monospace" }}
                formatter={(v: any) => [`${v > 0 ? "+" : ""}${Number(v).toLocaleString()}g`, "vs lane"]} labelFormatter={(l) => `min ${l}`} />
              <Area type="monotone" dataKey="diff" stroke="url(#goldSplit)" strokeWidth={2} fill="url(#goldFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-flash/35 mb-3 gap-2">
          <span className="tracking-[0.12em] uppercase shrink-0">gold vs lane</span>
          <span className="truncate">
            peak <span className="text-jade/75 tabular-nums">{s.peak ? `+${s.peak.diff.toLocaleString()}` : "—"}</span>@{s.peak?.min}′
            <span className="mx-1 text-flash/15">·</span>
            low <span className="text-red-400/75 tabular-nums">{s.trough ? s.trough.diff.toLocaleString() : "—"}</span>@{s.trough?.min}′
          </span>
        </div>

        {s.moments?.length > 0 && (
          <div className="space-y-1.5 mt-auto">
            {s.moments.slice(0, 5).map((m: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay + 0.3 + i * 0.06 }}
                className="flex items-center gap-2 font-mono text-[11px]">
                <span className={cn("w-1.5 h-1.5 rotate-45 shrink-0", m.type === "death" ? "bg-red-400/70" : m.type === "objective" ? "bg-[#FFB615]/80" : "bg-jade/70")} />
                <span className="text-flash/30 tabular-nums w-8 shrink-0">{m.min}′</span>
                <span className={cn("truncate", m.type === "death" ? "text-red-400/65" : m.type === "objective" ? "text-[#FFB615]/75" : "text-flash/60")}>{m.text.replace(/ at \d+m$/, "")}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════ timeline insights ═══════════════════════════ */

function DiffStat({ label, value }: { label: string; value: number | null }) {
  const good = (value ?? 0) >= 0
  return (
    <div className="flex flex-col items-center flex-1 py-1">
      <span className={cn("font-chakrapetch font-bold text-[18px] tabular-nums leading-none", value == null ? "text-flash/20" : good ? "text-jade" : "text-red-400/80")}>
        {value == null ? "—" : `${good ? "+" : ""}${value.toLocaleString()}`}
      </span>
      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 mt-1.5">{label}</span>
    </div>
  )
}

function DeathClock({ clock }: { clock: { bucket: string; deaths: number }[] }) {
  const max = Math.max(1, ...clock.map((b) => b.deaths))
  const worst = clock.reduce((mx, b) => (b.deaths > mx.deaths ? b : mx), clock[0])
  const total = clock.reduce((s, b) => s + b.deaths, 0)
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-end gap-1.5 flex-1 min-h-[64px]">
        {clock.map((b, i) => (
          <div key={b.bucket} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <motion.div
              initial={{ height: 0 }} animate={{ height: `${Math.max(3, (b.deaths / max) * 100)}%` }} transition={{ delay: 0.25 + i * 0.05, duration: 0.5, ease: EASE }}
              className={cn("w-full rounded-[2px]", b.deaths > 0 && b === worst ? "bg-red-400/70" : b.deaths > 0 ? "bg-red-400/30" : "bg-filmlight/[0.05]")}
              style={b.deaths > 0 && b === worst ? { boxShadow: "0 0 10px rgba(248,113,113,0.3)" } : undefined} />
            <span className="font-mono text-[9px] text-flash/40">{b.bucket}</span>
          </div>
        ))}
      </div>
      <p className="font-mono text-[9px] text-flash/30 mt-2.5 leading-relaxed">
        {total > 0
          ? <>Danger window: <span className="text-red-400/70">{worst.bucket} min</span> — {worst.deaths} of {total} deaths land there.</>
          : "Clean — you're barely dying."}
      </p>
    </div>
  )
}

/* ═══════════════════════════ records wall ═══════════════════════════ */

function RecordChip({ label, value, champ, tone = "flash", delay }: { label: string; value: string; champ?: string; tone?: "jade" | "citrine" | "red" | "flash"; delay: number }) {
  const color = tone === "jade" ? "text-jade" : tone === "citrine" ? "text-[#FFB615]" : tone === "red" ? "text-red-400/85" : "text-flash/85"
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay, duration: 0.35, ease: EASE }}
      className="rounded-[4px] bg-filmdark/30 px-3 py-2.5 flex items-center gap-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      {champ && <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(champ)}.png`} alt="" className="w-7 h-7 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]" onError={(e) => { e.currentTarget.style.display = "none" }} />}
      <div className="min-w-0">
        <div className={cn("font-chakrapetch font-bold text-[14px] leading-none tabular-nums truncate", color)}>{value}</div>
        <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 mt-1 truncate">{label}</div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════ main ═══════════════════════════ */

export default function Overview({ puuid, region, nametag }: Props) {
  const [period, setPeriod] = useState<Period>("day")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => setSelectedId(null), [period]) // reset the picked game when the period changes
  const { data, loading, error } = useLearnOverview(puuid, region, nametag, period)

  // toggle-only bar for the loading / error / empty states (no hero to host it)
  const toggleBar = (
    <div className="flex justify-end mb-5">
      <PeriodToggle period={period} onChange={setPeriod} />
    </div>
  )

  if (loading) return <>{toggleBar}<OverviewSkeleton /></>
  if (error) return <>{toggleBar}<div className="flex items-center justify-center h-48"><span className="text-flash/40 font-mono text-sm">Failed to load overview data</span></div></>

  if (!data?.today || data.today.totalGames === 0) {
    return (
      <>
        {toggleBar}
        <div className="space-y-2">
          <OrbitEmpty label={period === "week" ? "No ranked games this week" : "No ranked games today"} />
          {data?.baseline && (
            <div className="text-center pt-2">
              <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-flash/20">RECENT AVERAGES</span>
              <div className="flex justify-center gap-6 mt-2">
                {[["KDA", data.baseline.avgKDA], ["CS/M", data.baseline.avgCSPM], ["KP", data.baseline.avgKP + "%"]].map(([l, v]) => (
                  <div key={l as string} className="flex flex-col items-center">
                    <span className="font-chakrapetch text-[14px] text-flash/60 tabular-nums">{v}</span>
                    <span className="font-mono text-[8px] text-flash/20 tracking-[0.15em] mt-0.5">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  const t = data.today
  const b = data.baseline
  const games: any[] = t.perGameKDA ?? []
  // per-game timeline breakdown — the user picks the game straight from the session flow ribbon
  const deepGames: any[] = data.deepGames ?? []
  const selectableIds = new Set<string>(deepGames.map((g) => g.matchId).filter(Boolean))
  const selected = deepGames.find((g) => g.matchId === selectedId)
    ?? deepGames.find((g) => g.matchId === data.spotlightMatchId)
    ?? deepGames[0] ?? null

  // client-side records from the per-game array
  const byImpact = [...games].sort((a, c) => c.impact - a.impact)
  const best = byImpact[0]
  const peakDmg = games.reduce((mx, g) => (g.damage > (mx?.damage ?? -1) ? g : mx), null as any)
  const maxKills = games.reduce((mx, g) => (g.kills > (mx?.kills ?? -1) ? g : mx), null as any)
  const bestCs = games.reduce((mx, g) => (g.cspm > (mx?.cspm ?? -1) ? g : mx), null as any)
  const longest = games.reduce((mx, g) => (g.durationMin > (mx?.durationMin ?? -1) ? g : mx), null as any)
  const totalPentas = (t.pentaKills ?? 0) + (t.quadraKills ?? 0)

  const wrColor = t.winrate >= 50 ? "text-jade" : "text-red-400"
  const kdaColor = t.aggregateKDA.ratio >= 4 ? "text-jade" : t.aggregateKDA.ratio >= 2.5 ? "text-flash/90" : "text-red-400"

  return (
    <AnimatePresence mode="wait">
      <motion.div key={period} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="pb-14">
        {/* ═══ HERO — stats up top with the period filter glued right under them ═══ */}
        <div className="pb-4 mb-4 border-b border-flash/[0.05]">
          <div className="flex flex-wrap items-stretch justify-between gap-x-8 gap-y-4">
            <div className="flex flex-col items-start gap-3.5">
              <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
                <HeroNumber delay={0.02} label={period === "week" ? "Week winrate" : "Session winrate"} value={<span className={wrColor}>{t.winrate}%</span>} sub={<>{t.wins}W <span className="text-red-400/50">{t.losses}L</span> · {t.totalGames} games{t.winStreak >= 2 && <span className="text-jade/70"> · {t.winStreak} streak</span>}</>} />
                <HeroNumber delay={0.06} label="KDA" value={<span className={kdaColor}>{t.aggregateKDA.ratio}</span>} sub={<>{t.aggregateKDA.kills} / <span className="text-red-400/50">{t.aggregateKDA.deaths}</span> / {t.aggregateKDA.assists}</>} />
                <HeroNumber delay={0.1} label="Kill participation" value={`${t.killParticipation}%`} sub={b ? <>avg {b.avgKP}%</> : undefined} />
              </div>
              {/* period filter — glued right under Session winrate */}
              <PeriodToggle period={period} onChange={setPeriod} />
            </div>
            <div className="ml-auto flex items-center gap-5">
              <ImpactRadial value={t.impact} delay={0.1} />
              <RankProgress lp={data.lpTrack} />
            </div>
          </div>
        </div>

        {/* ═══ SESSION FLOW (also the game selector) — bare, full-width, scrollable ═══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4, ease: EASE }} className="mb-4">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" />
            <span className="font-mono text-[10px] tracking-[0.28em] uppercase text-jade/55">Session flow</span>
          </div>
          <SessionRibbon games={games} selectableIds={selectableIds} selectedId={selected?.matchId ?? null} onSelect={setSelectedId} />
        </motion.div>

        {/* ═══ TIMELINE BREAKDOWN (driven by the ribbon selection above) ═══ */}
        {deepGames.length > 0 && selected && (
          <div className="mb-6">
            {/* which game the boxes below describe — pick it from the ribbon */}
            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
              <span className="inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" />
              <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-jade/55">Timeline breakdown</span>
              <span className="font-mono text-[10px] text-flash/25">·</span>
              <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(selected.champion)}.png`} alt=""
                className="w-4 h-4 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                onError={(e) => { e.currentTarget.style.display = "none" }} />
              <span className="font-chakrapetch text-[12px] text-flash/85">{selected.champion}</span>
              <span className={cn("font-mono text-[8.5px] font-bold tracking-[0.12em] px-1.5 py-0.5 rounded-[3px]", selected.win ? "text-jade bg-jade/10" : "text-red-400 bg-red-400/10")}>{selected.tag}</span>
              <span className="font-mono text-[9.5px] text-flash/25 ml-auto hidden sm:inline">↑ pick a game in the session flow</span>
            </div>

            {/* the picked game's timeline boxes */}
            <motion.div key={selected.matchId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 grid grid-cols-1 gap-4">
                <Panel title="Laning · 10 min" hint="vs lane opponent" delay={0.02}>
                  <div className="flex divide-x divide-flash/[0.06]">
                    <DiffStat label="Gold diff" value={selected.laning.goldDiff10} />
                    <DiffStat label="CS diff" value={selected.laning.csDiff10} />
                    <DiffStat label="XP diff" value={selected.laning.xpDiff10} />
                    <div className="flex flex-col items-center flex-1 py-1">
                      <span className="font-chakrapetch font-bold text-[18px] tabular-nums leading-none text-flash/85">{selected.laning.cs10 ?? "—"}</span>
                      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 mt-1.5">CS @ 10</span>
                    </div>
                  </div>
                </Panel>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
                  <Panel title="Death clock" hint="minute of your deaths" delay={0.06}>
                    <DeathClock clock={selected.deathClock} />
                  </Panel>
                  <Panel title="Objectives" delay={0.1} className="sm:w-[150px]">
                    <div className="flex sm:flex-col items-center justify-center gap-2 h-full py-1">
                      <span className={cn("font-chakrapetch font-bold text-[30px] tabular-nums leading-none", (selected.objectiveParticipation ?? 0) >= 60 ? "text-[#FFB615]" : "text-flash/80")}>
                        {selected.objectiveParticipation != null ? `${selected.objectiveParticipation}%` : "—"}
                      </span>
                      <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/40 text-center">team objectives<br />you helped take</span>
                    </div>
                  </Panel>
                </div>
              </div>
              <div className="lg:col-span-5">
                <SpotlightPanel s={selected} delay={0.06} />
              </div>
            </motion.div>
          </div>
        )}

        {/* ═══ LP + FORM RADAR ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
          <Panel title="LP trajectory" hint="anchored to live rank" delay={0.14} className="lg:col-span-7">
            <LpTrackChart lp={data.lpTrack} />
          </Panel>
          <Panel title="Form radar" hint="vs your recent average" delay={0.18} className="lg:col-span-5 min-h-[248px]">
            <FormRadar t={t} b={b} />
          </Panel>
        </div>

        {/* ═══ TRENDS ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <TrendCard delay={0.3} title="CS / min" data={t.csPerMinTrend} dataKey="cspm" now={t.avgCSPM} base={b?.avgCSPM} />
          <TrendCard delay={0.34} title="Gold / min" data={t.goldPerMinTrend} dataKey="gpm" now={t.avgGoldPerMin ?? 0} base={b?.avgGoldPerMin} />
          <TrendCard delay={0.38} title="Dmg share" data={t.damageShareTrend} dataKey="dmgShare" now={t.avgDamageShare} base={b?.avgDmgShare} format={(v) => `${v}%`} />
          <TrendCard delay={0.42} title="Vision" data={t.visionScoreTrend} dataKey="vs" now={t.avgVision} base={b?.avgVision} />
        </div>

        {/* ═══ RECORDS ═══ */}
        <Panel title="Session records" delay={0.42} className="mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {best && <RecordChip delay={0.46} label="Best game" value={`IMPACT ${best.impact}`} champ={best.champion} tone="jade" />}
            {peakDmg && <RecordChip delay={0.5} label="Peak damage" value={Number(peakDmg.damage).toLocaleString()} champ={peakDmg.champion} tone="citrine" />}
            {maxKills && <RecordChip delay={0.54} label="Most kills" value={`${maxKills.kills} kills`} champ={maxKills.champion} />}
            {bestCs && <RecordChip delay={0.58} label="Best farming" value={`${bestCs.cspm} cs/m`} champ={bestCs.champion} />}
            <RecordChip delay={0.62} label="Solo kills" value={String(t.soloKills ?? 0)} tone={t.soloKills > 0 ? "jade" : "flash"} />
            <RecordChip delay={0.66} label="First bloods" value={String(t.firstBloods ?? 0)} tone={t.firstBloods > 0 ? "jade" : "flash"} />
            <RecordChip delay={0.7} label="Multikills" value={`${t.doubleKills ?? 0}×2 ${t.tripleKills ?? 0}×3${totalPentas ? ` ${totalPentas}×4+` : ""}`} />
            <RecordChip delay={0.74} label="Wards placed" value={String(t.avgWardsPlaced ?? 0) + "/g"} />
            <RecordChip delay={0.78} label="Wards killed" value={String(t.avgWardsKilled ?? 0) + "/g"} />
            <RecordChip delay={0.82} label="CC time" value={`${t.avgCCTime ?? 0}s/g`} />
            <RecordChip delay={0.86} label="Turret dmg" value={Number(t.avgTurretDmg ?? 0).toLocaleString()} />
            {longest && <RecordChip delay={0.9} label="Longest game" value={`${Math.round(longest.durationMin)}m`} champ={longest.champion} />}
          </div>
        </Panel>

        {/* ═══ COMBAT PROFILE + ROLES ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          <Panel title="Combat profile" delay={0.46} className="lg:col-span-7">
            {[
              { l: "Damage dealt / game", v: Number(t.avgDmgPerGame).toLocaleString(), w: Math.min(100, (t.avgDmgPerGame / Math.max(1, t.avgDmgPerGame + t.avgDmgTakenPerGame)) * 200) },
              { l: "Damage taken / game", v: Number(t.avgDmgTakenPerGame).toLocaleString(), w: Math.min(100, (t.avgDmgTakenPerGame / Math.max(1, t.avgDmgPerGame + t.avgDmgTakenPerGame)) * 200) },
              { l: "Gold / game", v: Number(t.avgGoldPerGame).toLocaleString(), w: 70 },
              { l: "Avg game length", v: `${t.avgGameDuration}m`, w: Math.min(100, (t.avgGameDuration / 40) * 100) },
            ].map((row, i) => (
              <div key={row.l} className="py-2 border-b border-flash/[0.04] last:border-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[10px] text-flash/40">{row.l}</span>
                  <span className="font-chakrapetch font-semibold text-[13px] text-flash/85 tabular-nums">{row.v}</span>
                </div>
                <div className="h-[3px] rounded-full bg-filmlight/[0.04] overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${row.w}%` }} transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: EASE }}
                    className="h-full rounded-full bg-gradient-to-r from-jade/20 to-jade/60" />
                </div>
              </div>
            ))}
          </Panel>
          <Panel title="Roles played" delay={0.5} className="lg:col-span-5">
            {(t.roleDistribution ?? []).sort((a: any, c: any) => c.games - a.games).map((r: any, i: number) => {
              const max = Math.max(...t.roleDistribution.map((x: any) => x.games))
              return (
                <div key={r.role} className="py-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-flash/45 uppercase tracking-wider">{roleLabel(r.role)}</span>
                    <span className="font-chakrapetch text-[12px] text-flash/70 tabular-nums">{r.games}g</span>
                  </div>
                  <div className="h-[3px] rounded-full bg-filmlight/[0.04] overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(r.games / max) * 100}%` }} transition={{ delay: 0.55 + i * 0.07, duration: 0.5, ease: EASE }}
                      className="h-full rounded-full bg-jade/50" />
                  </div>
                </div>
              )
            })}
          </Panel>
        </div>

        {/* ═══ CHAMPIONS + MATCHUPS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
          {t.allChampions?.length > 0 && (
            <Panel title="Champion pool" hint={`${t.allChampions.length} played`} delay={0.54} className="lg:col-span-7">
              <div className="-mx-4 -mb-3.5">
              {t.allChampions.map((c: any, i: number) => (
                <div key={c.name} className={cn("flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-jade/[0.03]", i > 0 && "border-t border-flash/[0.04]")}>
                  <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(c.name)}.png`} alt="" className="w-8 h-8 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" onError={(e) => { e.currentTarget.style.display = "none" }} />
                  <span className="font-chakrapetch text-[12px] text-flash/80 w-28 truncate">{c.name}</span>
                  <div className="flex-1 flex items-center gap-3 sm:gap-5 justify-end font-mono tabular-nums">
                    <span className={cn("text-[12px] font-semibold", c.winrate >= 50 ? "text-jade" : "text-red-400/80")}>{c.winrate}%</span>
                    <span className="text-[10px] text-flash/30 w-7 text-right">{c.games}g</span>
                    <span className="text-[10px] text-flash/45 w-14 text-right">{c.avgKDA} kda</span>
                    <span className="text-[10px] text-flash/25 w-12 text-right hidden sm:block">{c.avgCSPM} cs/m</span>
                  </div>
                </div>
              ))}
              </div>
            </Panel>
          )}
          {(t.bestMatchups?.length > 0 || t.worstMatchups?.length > 0) && (
            <div className="lg:col-span-5 grid grid-cols-1 gap-4">
              {t.bestMatchups?.length > 0 && (
                <Panel title="You beat" delay={0.58}>
                  {t.bestMatchups.map((m: any) => (
                    <div key={m.enemy} className="flex items-center gap-2.5 py-1.5">
                      <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(m.enemy)}.png`} alt="" className="w-6 h-6 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(0,217,146,0.2)]" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      <span className="font-chakrapetch text-[11px] text-flash/70 flex-1 truncate">{m.enemy}</span>
                      <span className="font-mono text-[11px] text-jade tabular-nums font-semibold">{m.winrate}%</span>
                      <span className="font-mono text-[9px] text-flash/25">{m.wins}W {m.games - m.wins}L</span>
                    </div>
                  ))}
                </Panel>
              )}
              {t.worstMatchups?.length > 0 && (
                <Panel title="They beat you" delay={0.62}>
                  {t.worstMatchups.map((m: any) => (
                    <div key={m.enemy} className="flex items-center gap-2.5 py-1.5">
                      <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(m.enemy)}.png`} alt="" className="w-6 h-6 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(248,113,113,0.2)]" onError={(e) => { e.currentTarget.style.display = "none" }} />
                      <span className="font-chakrapetch text-[11px] text-flash/70 flex-1 truncate">{m.enemy}</span>
                      <span className="font-mono text-[11px] text-red-400/85 tabular-nums font-semibold">{m.winrate}%</span>
                      <span className="font-mono text-[9px] text-flash/25">{m.wins}W {m.games - m.wins}L</span>
                    </div>
                  ))}
                </Panel>
              )}
            </div>
          )}
        </div>

        {/* ═══ WIN vs LOSS ═══ */}
        {t.winSplitStats && t.lossSplitStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {[{ s: t.winSplitStats, label: "In wins", good: true }, { s: t.lossSplitStats, label: "In losses", good: false }].map(({ s, label, good }, pi) => (
              <Panel key={label} title={`${label} · ${s.games}g`} delay={0.66 + pi * 0.04}>
                {[
                  ["KDA", s.avgKDA, good ? "text-jade" : "text-red-400/85"],
                  ["K / D / A", `${s.avgKills} / ${s.avgDeaths} / ${s.avgAssists}`, "text-flash/80"],
                  ["CS / min", s.avgCSPM, "text-flash/80"],
                  ["Damage", Number(s.avgDmg).toLocaleString(), "text-flash/80"],
                  ["Vision", s.avgVision, "text-flash/80"],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="flex items-center justify-between py-1.5 border-b border-flash/[0.04] last:border-0">
                    <span className="font-mono text-[10px] text-flash/40">{l}</span>
                    <span className={cn("font-chakrapetch font-semibold text-[13px] tabular-nums", c as string)}>{v}</span>
                  </div>
                ))}
              </Panel>
            ))}
          </div>
        )}

        {/* ═══ INSIGHTS ═══ */}
        <Panel title="Coach notes" delay={0.74}>
          <StrengthsWeaknesses strengths={data.strengths} weaknesses={data.weaknesses} delay={0} />
        </Panel>
      </motion.div>
    </AnimatePresence>
  )
}
