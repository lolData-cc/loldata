import { useEffect, useState, useMemo, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { API_BASE_URL, champPath } from "@/config"
import { Skeleton } from "@/components/ui/skeleton"
import splashPositionMap from "@/converters/splashPositionMap"
import {
  RoleTopIcon,
  RoleJungleIcon,
  RoleMidIcon,
  RoleAdcIcon,
  RoleSupportIcon,
} from "@/components/ui/roleicons"

// ── Types ──

type TierChamp = {
  champion_id: number
  champion_name: string
  games: number
  wins: number
  winrate: number
  pickrate: number
  tier_score: number
  tier: string
  tier_rank: number
}

type TierResponse = {
  snapshot_date: string | null
  patch: string | null
  champions: TierChamp[]
}

// ── Constants ──

const ROLES = [
  { key: "TOP", label: "Top", Icon: RoleTopIcon },
  { key: "JUNGLE", label: "Jungle", Icon: RoleJungleIcon },
  { key: "MIDDLE", label: "Mid", Icon: RoleMidIcon },
  { key: "BOTTOM", label: "Bot", Icon: RoleAdcIcon },
  { key: "UTILITY", label: "Support", Icon: RoleSupportIcon },
] as const

const TIER_COLORS: Record<string, { text: string; bg: string; badge: string; barColor: string }> = {
  S: { text: "text-amber-400", bg: "bg-amber-400/[0.04]", badge: "bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]", barColor: "from-amber-500 to-amber-400" },
  A: { text: "text-jade", bg: "bg-jade/[0.03]", badge: "bg-jade text-black shadow-[0_0_8px_rgba(0,217,146,0.25)]", barColor: "from-jade to-emerald-400" },
  B: { text: "text-sky-400", bg: "", badge: "bg-sky-500/80 text-white", barColor: "from-sky-500 to-sky-400" },
  C: { text: "text-flash/40", bg: "", badge: "bg-flash/25 text-flash/70", barColor: "from-flash/30 to-flash/20" },
  D: { text: "text-red-400/60", bg: "", badge: "bg-red-500/40 text-flash/70", barColor: "from-red-500/50 to-red-400/30" },
}

const REGIONS = ["Global", "EUW", "NA", "KR"] as const

// ── Page ──

const VALID_ROLES = new Set(["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"])
const ROLE_ALIASES: Record<string, string> = {
  top: "TOP", jungle: "JUNGLE", mid: "MIDDLE", middle: "MIDDLE",
  bot: "BOTTOM", bottom: "BOTTOM", adc: "BOTTOM",
  support: "UTILITY", sup: "UTILITY", utility: "UTILITY",
}

export default function TierlistPage() {
  const { role: roleParam } = useParams<{ role?: string }>()
  const navigate = useNavigate()

  const initialRole = roleParam
    ? (ROLE_ALIASES[roleParam.toLowerCase()] ?? (VALID_ROLES.has(roleParam.toUpperCase()) ? roleParam.toUpperCase() : "JUNGLE"))
    : "JUNGLE"

  const [role, setRoleState] = useState(initialRole)
  const [region, setRegion] = useState<string>("Global")
  const [data, setData] = useState<TierResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"tier_rank" | "winrate" | "pickrate" | "games">("tier_rank")
  const tableRef = useRef<HTMLDivElement>(null)

  const apiRegion = region === "Global" ? "ALL" : region.toUpperCase()

  // Sync URL param → state
  useEffect(() => {
    if (roleParam) {
      const mapped = ROLE_ALIASES[roleParam.toLowerCase()] ?? (VALID_ROLES.has(roleParam.toUpperCase()) ? roleParam.toUpperCase() : null)
      if (mapped && mapped !== role) setRoleState(mapped)
    }
  }, [roleParam])

  const setRole = (r: string) => {
    setRoleState(r)
    const slug = r.toLowerCase() === "utility" ? "support" : r.toLowerCase()
    navigate(`/tierlist/${slug}`, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`${API_BASE_URL}/api/tierlist?role=${role}&region=${apiRegion}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [role, apiRegion])

  const sorted = useMemo(() => {
    if (!data?.champions) return []
    let arr = [...data.champions]
    if (search.length >= 2) {
      const q = search.toLowerCase()
      arr = arr.filter(c => c.champion_name.toLowerCase().includes(q))
    }
    if (sortBy === "winrate") arr.sort((a, b) => b.winrate - a.winrate)
    else if (sortBy === "pickrate") arr.sort((a, b) => b.pickrate - a.pickrate)
    else if (sortBy === "games") arr.sort((a, b) => b.games - a.games)
    else arr.sort((a, b) => a.tier_rank - b.tier_rank)
    return arr
  }, [data, sortBy, search])

  const topChamp = data?.champions?.[0]?.champion_name ?? null
  const totalGames = data?.champions?.reduce((s, c) => s + c.games, 0) ?? 0
  const roleLabel = ROLES.find(r => r.key === role)?.label ?? role

  return (
    <div className="w-full">
      {/* ── Hero splash banner ── */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 h-[320px] overflow-hidden mb-6">
        {topChamp && (
          <motion.img
            key={`${topChamp}-${role}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            src={`https://cdn.loldata.cc/15.13.1/img/champion/${topChamp}_0.jpg`}
            alt={topChamp}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${splashPositionMap[topChamp] || "15%"}` }}
            draggable={false}
          />
        )}
        {/* Overlays */}
        <div className="absolute inset-0 bg-liquirice/65" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[2]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)" }} />
        <div className="absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.85)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" />

        {/* Hero content */}
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-jade/40" />
              <span className="text-[9px] font-mono tracking-[0.35em] text-jade/50 uppercase">
                Diamond+ Solo Queue
              </span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-jade/40" />
            </div>
            <h1 className="text-4xl font-mono font-black tracking-[0.12em] uppercase text-flash drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
              TIER LIST
            </h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              {data?.patch && (
                <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-0.5 rounded-sm bg-jade/15 text-jade ring-1 ring-jade/25 backdrop-blur-sm">
                  Patch {data.patch}
                </span>
              )}
              <span className="text-[10px] font-mono text-flash/30">{totalGames.toLocaleString()} games</span>
              <span className="text-[10px] font-mono text-jade/40">{roleLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Controls bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Role tabs */}
        {ROLES.map(({ key, label, Icon }) => {
          const active = role === key
          return (
            <button
              key={key}
              onClick={() => { setRole(key); setSearch("") }}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-sm cursor-pointer",
                "font-mono text-[10px] tracking-[0.1em] uppercase transition-all duration-200",
                active
                  ? "bg-jade/15 text-jade ring-1 ring-jade/30 shadow-[0_0_10px_rgba(0,217,146,0.1)]"
                  : "text-flash/30 hover:text-flash/50 hover:bg-white/[0.03]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}

        <div className="h-6 w-px bg-flash/8 mx-1" />

        {/* Region */}
        <FilterPill label="Region" options={[...REGIONS]} value={region} onChange={setRegion} />

        {/* Elo label */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-sm font-mono text-[10px] tracking-[0.1em] uppercase bg-white/[0.02] ring-1 ring-white/[0.05]">
          <span className="text-flash/20">Elo:</span>
          <span className="text-jade">Diamond+</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search champion..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={cn(
              "w-48 px-3 py-2 rounded-sm font-mono text-[11px] text-flash/70 placeholder:text-flash/20",
              "bg-white/[0.03] ring-1 ring-white/[0.06] focus:ring-jade/30 focus:outline-none",
              "transition-all duration-200"
            )}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-flash/30 hover:text-flash/60 text-xs cursor-pointer"
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* ── Tier bands ── */}
      <div ref={tableRef}>
        {loading ? (
          <div className="space-y-3">
            {["S","A","B","C","D"].map(t => (
              <div key={t} className="h-24 rounded-md bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${apiRegion}-${search}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="space-y-2"
            >
              {sorted.length === 0 ? (
                <div className="py-12 text-center text-flash/20 text-sm font-mono">
                  No champions found
                </div>
              ) : (
                ["S","A","B","C","D"].map((tier, tIdx) => {
                  const champs = sorted.filter(c => c.tier === tier)
                  if (champs.length === 0) return null
                  const tc = TIER_COLORS[tier]
                  return (
                    <motion.div
                      key={tier}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: tIdx * 0.06, duration: 0.3 }}
                      className="flex rounded-[3px] overflow-hidden ring-1 ring-white/[0.04]"
                    >
                      {/* Tier label column */}
                      <div className={cn(
                        "relative flex flex-col items-center justify-center w-16 shrink-0 py-3",
                        "bg-gradient-to-b",
                        tier === "S" ? "from-amber-400/15 via-amber-400/5 to-amber-400/10" :
                        tier === "A" ? "from-jade/10 via-jade/3 to-jade/8" :
                        tier === "B" ? "from-sky-400/8 via-sky-400/2 to-sky-400/5" :
                        tier === "C" ? "from-flash/5 via-flash/1 to-flash/3" :
                        "from-red-400/6 via-red-400/1 to-red-400/4"
                      )}>
                        {/* Left stripe */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-[3px]",
                          tier === "S" ? "bg-amber-400/60" : tier === "A" ? "bg-jade/50" : tier === "B" ? "bg-sky-400/30" : tier === "C" ? "bg-flash/15" : "bg-red-400/25"
                        )} />
                        <span className={cn(
                          "text-3xl font-mono font-black leading-none",
                          tc.text,
                          tier === "S" && "drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]",
                          tier === "A" && "drop-shadow-[0_0_8px_rgba(0,217,146,0.5)]",
                        )}>
                          {tier}
                        </span>
                        <span className="text-[7px] font-mono text-flash/15 mt-1 tracking-[0.2em] uppercase">
                          {champs.length} champs
                        </span>
                      </div>

                      {/* Champions flow */}
                      <div className="flex-1 flex flex-wrap items-center gap-1.5 p-2 bg-black/20">
                        {champs.map((c, cIdx) => (
                          <ChampCard key={c.champion_id} champ={c} idx={tIdx * 10 + cIdx} />
                        ))}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="mb-16" />
    </div>
  )
}

// ── Champion Card (compact, for inside tier bands) ──

function ChampCard({ champ, idx }: { champ: TierChamp; idx: number }) {
  const navigate = useNavigate()
  const tc = TIER_COLORS[champ.tier] ?? TIER_COLORS.C
  const wrColor = champ.winrate >= 54 ? "text-jade" : champ.winrate >= 52 ? "text-amber-400" : champ.winrate >= 50 ? "text-flash/50" : "text-red-400/70"
  const isElite = champ.tier === "S" || champ.tier === "A"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(idx * 0.02, 0.5), duration: 0.2 }}
      onClick={() => navigate(`/champions/${champ.champion_name}`)}
      className={cn(
        "group relative flex flex-col items-center w-[68px] py-1.5 px-1 rounded-[3px] cursor-pointer",
        "bg-white/[0.03] transition-all duration-200",
        "hover:bg-white/[0.08]",
        isElite
          ? champ.tier === "S"
            ? "hover:shadow-[0_0_14px_rgba(251,191,36,0.15)] hover:ring-1 hover:ring-amber-400/30"
            : "hover:shadow-[0_0_10px_rgba(0,217,146,0.1)] hover:ring-1 hover:ring-jade/25"
          : "hover:ring-1 hover:ring-white/[0.08]"
      )}
    >
      {/* Icon */}
      <div className="relative mb-1">
        <img
          src={`${champPath}/${champ.champion_name}.png`}
          alt={champ.champion_name}
          className={cn(
            "w-10 h-10 rounded-[2px] object-cover transition-transform duration-200 group-hover:scale-110",
            champ.tier === "S" && "ring-1 ring-amber-400/30",
            champ.tier === "A" && "ring-1 ring-jade/20",
          )}
          loading="lazy"
        />
        {/* Rank badge */}
        <span className={cn(
          "absolute -top-1 -right-1 text-[6px] font-mono font-black leading-none px-[3px] py-[1px] rounded-[2px]",
          champ.tier === "S" ? "bg-amber-400 text-black" : champ.tier === "A" ? "bg-jade text-black" : "bg-flash/15 text-flash/40"
        )}>
          {champ.tier_rank}
        </span>
      </div>

      {/* Name */}
      <span className={cn(
        "text-[8px] font-mono leading-tight truncate w-full text-center",
        isElite ? "text-flash/70" : "text-flash/35"
      )}>
        {champ.champion_name}
      </span>

      {/* WR */}
      <span className={cn("text-[10px] font-mono font-bold tabular-nums leading-none mt-0.5", wrColor)}>
        {champ.winrate.toFixed(1)}%
      </span>

      {/* PR */}
      <span className="text-[7px] font-mono text-flash/15 tabular-nums leading-none mt-0.5">
        {champ.pickrate.toFixed(1)}% PR
      </span>

      {/* Hover tooltip */}
      <div className={cn(
        "absolute -bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-100",
        "bg-cement ring-1 ring-white/10 rounded-sm px-2 py-1 shadow-xl whitespace-nowrap"
      )}>
        <span className="text-[8px] font-mono text-flash/40">{champ.games.toLocaleString()} games</span>
      </div>
    </motion.div>
  )
}

// ── Sort button ──

function SortBtn({ label, col, sortBy, setSortBy }: {
  label: string; col: string; sortBy: string; setSortBy: (v: any) => void
}) {
  const active = sortBy === col
  return (
    <button
      onClick={() => setSortBy(active ? "tier_rank" : col)}
      className={cn(
        "text-center cursor-pointer transition-colors",
        active ? "text-jade" : "hover:text-flash/40"
      )}
    >
      {label}{active && " ▾"}
    </button>
  )
}

// ── Filter pill dropdown ──

function FilterPill({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-sm cursor-pointer",
          "font-mono text-[10px] tracking-[0.1em] uppercase transition-all duration-200",
          "bg-white/[0.02] ring-1 ring-white/[0.05] hover:ring-white/[0.1] hover:bg-white/[0.04]"
        )}
      >
        <span className="text-flash/20">{label}:</span>
        <span className="text-jade">{value}</span>
        <span className="text-flash/15 text-[7px] ml-0.5">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1 z-50 min-w-[110px] rounded-sm bg-cement ring-1 ring-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => { onChange(opt); setOpen(false) }}
                className={cn(
                  "w-full text-left px-3 py-2 text-[10px] font-mono tracking-[0.1em] uppercase cursor-pointer transition-colors",
                  opt === value ? "text-jade bg-jade/10" : "text-flash/35 hover:text-flash/70 hover:bg-white/[0.04]"
                )}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
