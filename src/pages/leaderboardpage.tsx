"use client"

import { useEffect, useState } from "react"
import { API_BASE_URL, cdnBaseUrl } from "@/config"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { getRankImage } from "@/utils/rankIcons"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { DiamondButton } from "@/components/ui/diamond-button"

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
  topChampions?: { championId: number; games: number; wins: number }[] | null
}

const REGIONS = ["EUW", "NA", "KR"] as const
const QUEUES = [
  { key: "RANKED_SOLO_5x5", label: "SOLO/DUO" },
  { key: "RANKED_FLEX_SR", label: "FLEX" },
] as const

const TIER_ACCENTS: Record<string, { text: string; glow: string; border: string; bg: string; gradient: string }> = {
  CHALLENGER: {
    text: "text-amber-300",
    glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]",
    border: "border-amber-400/15",
    bg: "bg-amber-400/[0.03]",
    gradient: "from-amber-400/10 via-transparent to-transparent",
  },
  GRANDMASTER: {
    text: "text-red-300",
    glow: "shadow-[0_0_20px_rgba(248,113,113,0.12)]",
    border: "border-red-400/12",
    bg: "bg-red-400/[0.02]",
    gradient: "from-red-400/8 via-transparent to-transparent",
  },
  MASTER: {
    text: "text-purple-300",
    glow: "shadow-[0_0_15px_rgba(192,132,252,0.1)]",
    border: "border-purple-400/10",
    bg: "bg-purple-400/[0.02]",
    gradient: "from-purple-400/6 via-transparent to-transparent",
  },
}

const PAGE_SIZE = 25

function WinrateBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses
  const wr = total > 0 ? (wins / total) * 100 : 50
  return (
    <div className="w-full h-[3px] rounded-full bg-flash/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${wr}%`,
          background: wr >= 60 ? "rgba(0,217,146,0.5)" : wr >= 52 ? "rgba(0,217,146,0.3)" : wr >= 48 ? "rgba(215,216,217,0.2)" : "rgba(239,68,68,0.3)",
        }}
      />
    </div>
  )
}

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
  const [keyToName, setKeyToName] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {}
        for (const c of Object.values<any>(data?.data ?? {})) map[c.key] = c.id
        setKeyToName(map)
      })
      .catch(() => {})
  }, [])

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
      {/* ── Hero ── */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 -mt-20 h-[420px] overflow-hidden mb-6">
        <img src="/img/Leaderboards.jpg" alt="" className="absolute inset-0 w-full h-full object-cover select-none" style={{ objectPosition: "center 10%" }} draggable={false} />
        <div className="absolute inset-0 bg-liquirice/65" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-[2]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.12) 2px, rgba(255,255,255,0.12) 4px)" }} />
        <div className="absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.9)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" />

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[65%] min-[2560px]:w-[55%] flex items-end justify-between z-10">
          <div>
            <p className="text-[9px] font-mono text-jade/40 tracking-[0.4em] uppercase mb-2">Ranked Ladder</p>
            <h1 className="text-5xl font-orbitron font-bold tracking-wider text-flash/90">RANKINGS</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Queue toggle */}
            <div className="relative flex rounded-[3px] border border-flash/[0.08] bg-black/50 backdrop-blur-md p-0.5">
              {QUEUES.map((q) => (
                <button key={q.key} onClick={() => setQueue(q.key as typeof queue)}
                  className={cn(
                    "relative z-10 px-4 py-2 text-[9px] font-mono tracking-[0.15em] uppercase transition-colors duration-200 rounded-[2px] cursor-clicker",
                    queue === q.key ? "text-jade" : "text-flash/30 hover:text-flash/55"
                  )}>
                  {queue === q.key && (
                    <motion.div layoutId="queue-pill" className="absolute inset-0 rounded-[2px] bg-jade/10 border border-jade/20"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10">{q.label}</span>
                </button>
              ))}
            </div>

            {/* Region toggle */}
            <div className="relative flex rounded-[3px] border border-flash/[0.08] bg-black/50 backdrop-blur-md p-0.5">
              {REGIONS.map((r) => (
                <button key={r} onClick={() => setRegion(r)}
                  className={cn(
                    "relative z-10 px-4 py-2 text-[9px] font-mono tracking-[0.15em] uppercase transition-colors duration-200 rounded-[2px] cursor-clicker",
                    region === r ? "text-jade" : "text-flash/30 hover:text-flash/55"
                  )}>
                  {region === r && (
                    <motion.div layoutId="region-pill" className="absolute inset-0 rounded-[2px] bg-jade/10 border border-jade/20"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <span className="relative z-10">{r}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table header ── */}
      <div className="grid grid-cols-[48px_48px_1fr_120px_160px_60px_100px] items-center px-5 py-2.5 text-[8px] font-mono text-flash/20 tracking-[0.2em] uppercase border-b border-flash/[0.05]">
        <span className="text-center">#</span>
        <span />
        <span>Player</span>
        <span className="text-center">Rank</span>
        <span className="text-center">Record</span>
        <span className="text-right">WR</span>
        <span className="text-center">Top Champs</span>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-sm px-4 py-3 text-red-400 text-sm font-mono my-3">{error}</div>
      )}

      {/* ── Rows ── */}
      <div>
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="grid grid-cols-[48px_48px_1fr_120px_160px_60px_100px] items-center px-5 py-3 border-b border-flash/[0.03]">
                <Skeleton className="w-6 h-4 bg-flash/5 mx-auto" />
                <Skeleton className="w-9 h-9 rounded-[4px] bg-flash/5" />
                <Skeleton className="h-4 w-36 bg-flash/5" />
                <Skeleton className="w-20 h-4 bg-flash/5 mx-auto" />
                <Skeleton className="w-28 h-4 bg-flash/5 mx-auto" />
                <Skeleton className="w-10 h-4 bg-flash/5 ml-auto" />
                <div className="flex gap-1 justify-center"><Skeleton className="w-6 h-6 rounded-full bg-flash/5" /><Skeleton className="w-6 h-6 rounded-full bg-flash/5" /><Skeleton className="w-6 h-6 rounded-full bg-flash/5" /></div>
              </div>
            ))
          : rows.map((r, i) => {
              const accent = TIER_ACCENTS[r.tier] ?? TIER_ACCENTS.MASTER
              const isTop3 = r.rank <= 3
              const total = r.wins + r.losses

              return (
                <motion.div
                  key={`${r.puuid ?? r.summonerId}-${r.rank}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.015, ease: "easeOut" }}
                  onClick={() => handlePlayerClick(r)}
                  className={cn(
                    "group relative grid grid-cols-[48px_48px_1fr_120px_160px_60px_100px] items-center px-5 py-3 cursor-clicker transition-all duration-300",
                    "border-b border-flash/[0.03]",
                    "hover:bg-jade/[0.02] hover:border-flash/[0.06]",
                  )}
                >

                  {/* Rank */}
                  <span className={cn(
                    "text-center font-orbitron font-bold tabular-nums relative z-10 text-[13px]",
                    r.rank === 1 ? "text-amber-300"
                      : r.rank === 2 ? "text-gray-300"
                      : r.rank === 3 ? "text-orange-400"
                      : "text-flash/20"
                  )}>
                    {r.rank}
                  </span>

                  {/* Profile icon */}
                  <div className="relative w-9 h-9 rounded-[4px] overflow-hidden shrink-0 z-10 transition-transform duration-300 group-hover:scale-105">
                    <img
                      src={`${cdnBaseUrl()}/img/profileicon/${r.profileIconId ?? 29}.png`}
                      alt="" className="w-full h-full object-cover" draggable={false}
                    />
                  </div>

                  {/* Name */}
                  <div className="min-w-0 relative z-10">
                    <span className="text-[13px] text-flash/75 font-mono truncate block group-hover:text-flash transition-colors duration-200">
                      {(() => {
                        const nt = r.nametag ?? r.summonerName ?? "Unknown"
                        const [name, tag] = nt.includes("#") ? nt.split("#") : [nt, ""]
                        return <>{name}<span className="text-flash/15 ml-0.5">#{tag}</span></>
                      })()}
                    </span>
                  </div>

                  {/* Tier + LP merged */}
                  <div className="flex items-center gap-2 justify-center relative z-10">
                    <img src={getRankImage(r.tier)} alt={r.tier}
                      className="w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-110" />
                    <div>
                      <span className="font-orbitron font-bold tabular-nums text-[12px] text-flash/70">
                        {r.leaguePoints.toLocaleString()}
                      </span>
                      <span className="text-[8px] text-flash/20 ml-0.5">LP</span>
                    </div>
                  </div>

                  {/* W/L ratio bar */}
                  <div className="relative z-10 px-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-jade/50 tabular-nums">{r.wins}W</span>
                      <div className="flex-1 h-[4px] rounded-full bg-red-400/15 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${total > 0 ? (r.wins / total) * 100 : 50}%`,
                            background: r.winrate >= 60 ? "rgba(0,217,146,0.6)" : r.winrate >= 52 ? "rgba(0,217,146,0.35)" : "rgba(215,216,217,0.25)",
                          }} />
                      </div>
                      <span className="text-[10px] font-mono text-red-400/35 tabular-nums">{r.losses}L</span>
                    </div>
                  </div>

                  {/* WR */}
                  <span className={cn(
                    "text-right text-[12px] font-mono font-semibold tabular-nums relative z-10",
                    r.winrate >= 70 ? "text-orange-400" : r.winrate >= 60 ? "text-jade" : r.winrate >= 52 ? "text-flash/50" : "text-red-400/50"
                  )}
                  style={r.winrate >= 70 ? {
                    textShadow: "0 0 8px rgba(251,146,60,0.6)",
                  } : undefined}>
                    {r.winrate}%
                  </span>

                  {/* Top Champions */}
                  <div className="flex gap-1 justify-center relative z-10">
                    {(r.topChampions ?? []).slice(0, 3).map((c, ci) => {
                      const champName = keyToName[String(c.championId)] ?? String(c.championId)
                      const champIcon = `${cdnBaseUrl()}/img/champion/${champName}.png`
                      return (
                        <div key={ci} className="relative group/champ">
                          <img src={champIcon} alt=""
                            className="w-7 h-7 rounded-full border border-flash/[0.08] transition-transform duration-200 group-hover/champ:scale-110"
                            onError={(e) => { e.currentTarget.style.display = "none" }} />
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              )
            })}
      </div>

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="mt-10 mb-6 flex justify-center items-center gap-1.5">
          <button disabled={page <= 1} onClick={() => load(page - 1)}
            className="px-4 py-2.5 text-[9px] font-mono tracking-[0.12em] uppercase rounded-[3px] border border-flash/[0.08] bg-flash/[0.015] text-flash/35 hover:text-jade hover:border-jade/20 disabled:opacity-15 transition-all cursor-clicker">
            PREV
          </button>

          {Array.from({ length: Math.min(7, totalPages) }).map((_, idx) => {
            const startPage = Math.max(1, Math.min(page - 3, totalPages - 6))
            const p = startPage + idx
            if (p > totalPages) return null
            return (
              <button key={p} onClick={() => load(p)}
                className={cn(
                  "w-9 h-9 text-[11px] font-mono rounded-[3px] border transition-all duration-200 cursor-clicker",
                  p === page
                    ? "border-jade/30 bg-jade/10 text-jade shadow-[0_0_12px_rgba(0,217,146,0.15)]"
                    : "border-flash/[0.05] text-flash/25 hover:text-flash/50 hover:border-flash/[0.1]"
                )}>
                {p}
              </button>
            )
          })}

          <button disabled={page >= totalPages} onClick={() => load(page + 1)}
            className="px-4 py-2.5 text-[9px] font-mono tracking-[0.12em] uppercase rounded-[3px] border border-flash/[0.08] bg-flash/[0.015] text-flash/35 hover:text-jade hover:border-jade/20 disabled:opacity-15 transition-all cursor-clicker">
            NEXT
          </button>
        </div>
      )}

      {/* ── Back to top ── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-10 z-50">
            <DiamondButton icon="top" label="TOP" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
