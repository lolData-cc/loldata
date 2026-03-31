"use client"

import { useEffect, useState, useRef } from "react"
import { API_BASE_URL } from "@/config"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getRankImage } from "@/utils/rankIcons"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

type Entry = {
  rank: number
  summonerId: string | null
  summonerName: string | null
  nametag: string | null
  profileIconId: number | null
  puuid: string | null
  leaguePoints: number
  wins: number
  losses: number
  winrate: number
  tier: "CHALLENGER" | "GRANDMASTER" | "MASTER"
}

const REGIONS = ["EUW", "NA", "KR"] as const
const QUEUES = [
  { key: "RANKED_SOLO_5x5", label: "SOLO/DUO" },
  { key: "RANKED_FLEX_SR", label: "FLEX" },
] as const

const TIER_STYLES: Record<string, { color: string; glow: string; bg: string }> = {
  CHALLENGER: {
    color: "text-amber-400/60",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.3)]",
    bg: "bg-amber-400/5 border-amber-400/10",
  },
  GRANDMASTER: {
    color: "text-red-400/60",
    glow: "shadow-[0_0_12px_rgba(248,113,113,0.3)]",
    bg: "bg-red-400/5 border-red-400/10",
  },
  MASTER: {
    color: "text-purple-400/60",
    glow: "shadow-[0_0_12px_rgba(192,132,252,0.2)]",
    bg: "bg-purple-400/5 border-purple-400/10",
  },
}

const PAGE_SIZE = 25

export default function LeaderboardPage() {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("EUW")
  const [queue, setQueue] = useState<(typeof QUEUES)[number]["key"]>("RANKED_SOLO_5x5")
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Entry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const navigate = useNavigate()
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  async function load(p = page) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, queue, page: p, pageSize: PAGE_SIZE, enrich: true }),
      })
      if (res.status === 429) { setError("Rate limited — try again shortly"); setRows([]); return }
      if (!res.ok) { setError("Failed to load rankings"); setRows([]); return }
      const data = await res.json()
      setRows(data.entries || [])
      setTotalPages(data.totalPages || 1)
      setPage(data.page || p)
    } catch {
      setError("Network error")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [region, queue])

  useEffect(() => {
    document.title = `${region} Rankings - lolData`
    return () => { document.title = "lolData" }
  }, [region])

  const handlePlayerClick = (r: Entry) => {
    const nametag = r.nametag ?? r.summonerName
    if (!nametag) return
    const [name, tag] = nametag.includes("#") ? nametag.split("#") : [nametag, region]
    navigate(`/summoners/${region.toLowerCase()}/${encodeURIComponent(name)}-${encodeURIComponent(tag || region)}`)
  }

  return (
    <div className="min-h-[70vh]">
      {/* ── Hero banner ── */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 -mt-20 h-[480px] overflow-hidden mb-2">
        <img
          src="/img/Leaderboards.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{ objectPosition: "center 10%" }}
          draggable={false}
        />
        {/* Overlays — matching tierlist/champion pages */}
        <div className="absolute inset-0 bg-liquirice/60" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[2]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)" }} />
        <div className="absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.85)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[65%] flex items-end justify-between z-10">
          <div>
            <p className="text-[10px] font-mono text-jade/50 tracking-[0.3em] uppercase mb-1">
              Solo Queue
            </p>
            <h1 className="text-4xl font-orbitron font-bold tracking-wider text-flash/90">
              RANKINGS
            </h1>
          </div>

          {/* Region + Queue filters */}
          <div className="flex items-center gap-3">
            {/* Queue toggle */}
            <div className="relative flex rounded-sm border border-flash/10 bg-black/40 backdrop-blur-sm p-0.5">
              {QUEUES.map((q) => (
                <button
                  key={q.key}
                  onClick={() => setQueue(q.key as typeof queue)}
                  className={cn(
                    "relative z-10 px-3 py-1.5 text-[10px] font-mono tracking-[0.12em] uppercase transition-colors duration-200 rounded-sm cursor-clicker",
                    queue === q.key ? "text-jade" : "text-flash/35 hover:text-flash/55"
                  )}
                >
                  {queue === q.key && (
                    <motion.div
                      layoutId="queue-indicator"
                      className="absolute inset-0 rounded-sm bg-jade/15 border border-jade/25"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{q.label}</span>
                </button>
              ))}
            </div>

            {/* Region pills */}
            <div className="relative flex rounded-sm border border-flash/10 bg-black/40 backdrop-blur-sm p-0.5">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={cn(
                    "relative z-10 px-3 py-1.5 text-[10px] font-mono tracking-[0.12em] uppercase transition-colors duration-200 rounded-sm cursor-clicker",
                    region === r ? "text-jade" : "text-flash/35 hover:text-flash/55"
                  )}
                >
                  {region === r && (
                    <motion.div
                      layoutId="region-indicator"
                      className="absolute inset-0 rounded-sm bg-jade/15 border border-jade/25"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{r}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table header ── */}
      <div className="flex items-center px-4 py-2 text-[9px] font-mono text-flash/20 tracking-[0.15em] uppercase border-b border-flash/[0.06]">
        <span className="w-12 text-center">#</span>
        <span className="w-10" />
        <span className="flex-1">SUMMONER</span>
        <span className="w-16 text-center">TIER</span>
        <span className="w-20 text-right">LP</span>
        <span className="w-24 text-center">W / L</span>
        <span className="w-16 text-right">WR</span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-sm px-4 py-3 text-red-400 text-sm font-mono mb-2">
          {error}
        </div>
      )}

      {/* ── Rows ── */}
      <div className="space-y-0.5">
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border border-flash/[0.03] rounded-sm bg-flash/[0.01]">
                <Skeleton className="w-8 h-4 bg-flash/5" />
                <Skeleton className="w-8 h-8 rounded-sm bg-flash/5" />
                <Skeleton className="h-4 w-40 bg-flash/5" />
                <div className="flex-1" />
                <Skeleton className="w-16 h-4 bg-flash/5" />
                <Skeleton className="w-12 h-4 bg-flash/5" />
              </div>
            ))
          : rows.map((r) => {
              const style = TIER_STYLES[r.tier] ?? TIER_STYLES.MASTER
              const isTop3 = r.rank <= 3

              return (
                <div
                  key={`${r.puuid ?? r.summonerId}-${r.rank}`}
                  onClick={() => handlePlayerClick(r)}
                  className={cn(
                    "group flex items-center px-4 py-2.5 rounded-sm transition-all duration-200 cursor-clicker",
                    "border border-flash/[0.04] hover:border-jade/15",
                    "bg-flash/[0.01] hover:bg-jade/[0.025]",
                    isTop3 && style.bg
                  )}
                >
                  {/* Rank */}
                  <span className={cn(
                    "w-12 text-center font-orbitron text-[14px] font-bold tabular-nums",
                    r.rank === 1 ? "text-amber-300" : r.rank === 2 ? "text-gray-300" : r.rank === 3 ? "text-orange-400" : "text-flash/20"
                  )}>
                    {r.rank}
                  </span>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-sm overflow-hidden shrink-0 mr-3">
                    <img
                      src={`https://cdn2.loldata.cc/16.1.1/img/profileicon/${r.profileIconId ?? 29}.png`}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-flash/80 font-mono truncate block group-hover:text-flash/95 transition-colors">
                      {(() => {
                        const nt = r.nametag ?? r.summonerName ?? "Unknown"
                        const [name, tag] = nt.includes("#") ? nt.split("#") : [nt, ""]
                        return <>{name}<span className="text-flash/20">#{tag}</span></>
                      })()}
                    </span>
                  </div>

                  {/* Tier icon */}
                  <div className="w-16 flex items-center justify-center">
                    <img
                      src={getRankImage(r.tier)}
                      alt={r.tier}
                      className="w-7 h-7 object-contain"
                    />
                  </div>

                  {/* LP */}
                  <span className={cn(
                    "w-20 text-right font-orbitron text-[13px] font-bold tabular-nums",
                    style.color
                  )}>
                    {r.leaguePoints}
                  </span>

                  {/* W/L */}
                  <div className="w-24 text-center text-[11px] font-mono tabular-nums">
                    <span className="text-jade/70">{r.wins}</span>
                    <span className="text-flash/15 mx-0.5">/</span>
                    <span className="text-red-400/50">{r.losses}</span>
                  </div>

                  {/* WR */}
                  <span className={cn(
                    "w-16 text-right text-[12px] font-mono font-semibold tabular-nums",
                    r.winrate >= 70
                      ? "text-orange-400 animate-[pulse_3s_ease-in-out_infinite]"
                      : r.winrate >= 60
                        ? "text-jade"
                        : r.winrate >= 52
                          ? "text-flash/55"
                          : "text-red-400/60"
                  )}
                  style={r.winrate >= 70 ? {
                    textShadow: "0 0 8px rgba(251,146,60,0.8), 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(251,146,60,0.3)",
                    background: "linear-gradient(to top, #ef4444, #f97316, #fbbf24)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  } : undefined}>
                    {r.winrate}%
                  </span>
                </div>
              )
            })}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="px-4 py-2 text-[10px] font-mono tracking-[0.1em] uppercase rounded-sm border border-flash/10 bg-flash/[0.02] text-flash/40 hover:text-jade hover:border-jade/20 disabled:opacity-20 disabled:hover:text-flash/40 transition-all cursor-clicker"
          >
            PREV
          </button>

          {Array.from({ length: Math.min(7, totalPages) }).map((_, idx) => {
            const startPage = Math.max(1, Math.min(page - 3, totalPages - 6))
            const p = startPage + idx
            if (p > totalPages) return null
            return (
              <button
                key={p}
                onClick={() => load(p)}
                className={cn(
                  "w-9 h-9 text-[11px] font-mono rounded-sm border transition-all duration-200 cursor-clicker",
                  p === page
                    ? "border-jade/40 bg-jade/10 text-jade shadow-[0_0_10px_rgba(0,217,146,0.2)]"
                    : "border-flash/[0.06] text-flash/30 hover:text-flash/60 hover:border-flash/15"
                )}
              >
                {p}
              </button>
            )
          })}

          <button
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="px-4 py-2 text-[10px] font-mono tracking-[0.1em] uppercase rounded-sm border border-flash/10 bg-flash/[0.02] text-flash/40 hover:text-jade hover:border-jade/20 disabled:opacity-20 disabled:hover:text-flash/40 transition-all cursor-clicker"
          >
            NEXT
          </button>
        </div>
      )}

      {/* ── Back to top ── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-10 z-50"
          >
            <button
              aria-label="Scroll to top"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="group relative w-11 h-11 cursor-clicker"
            >
              <div className="absolute inset-0 rotate-45 rounded-[3px] border border-jade/30 bg-black/60 backdrop-blur-sm transition-all duration-300 group-hover:border-jade/60 group-hover:shadow-[0_0_14px_rgba(0,217,146,0.25)]" />
              <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-5 h-5 z-10 text-jade/60 group-hover:text-jade transition-colors" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 15l-6-6-6 6" />
              </svg>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[7px] font-mono text-jade/40 tracking-[0.2em] uppercase group-hover:text-jade/70 transition-colors">TOP</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
