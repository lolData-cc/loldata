"use client"

// /leaderboards — the apex ladder (Master+) per region/queue, rebuilt in the
// current loldata language: structured hero (mono eyebrow + chakrapetch title
// + jade aura + apex cutoff chips), a TOP-3 podium in glass, and the table
// inside the site's bright glass container. Data flow unchanged:
// POST /api/leaderboard {region, queue, page} → entries + cutoffs.

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
  isPro?: boolean
  isStreamer?: boolean
}

const REGIONS = ["EUW", "NA", "KR"] as const
const QUEUES = [
  { key: "RANKED_SOLO_5x5", label: "SOLO/DUO" },
  { key: "RANKED_FLEX_SR", label: "FLEX" },
] as const

const PAGE_SIZE = 25

// glass surface — same recipe as the dashboard cards (bright hairline on the
// near-black page, no visible white border)
const glass =
  "relative overflow-hidden rounded-md bg-filmlight/[0.04] backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(var(--c-shadow),0.45),inset_0_0_0_1px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.07)]"

// podium metals
const MEDALS = [
  { ring: "ring-[#FFB615]/60", text: "text-[#FFB615]", glow: "shadow-[0_0_30px_rgba(255,182,21,0.10)]", label: "text-[#FFB615]" },
  { ring: "ring-slate-300/50", text: "text-slate-300", glow: "shadow-[0_0_24px_rgba(203,213,225,0.07)]", label: "text-slate-300" },
  { ring: "ring-orange-400/50", text: "text-orange-400", glow: "shadow-[0_0_24px_rgba(251,146,60,0.08)]", label: "text-orange-400" },
] as const

const wrColor = (wr: number) =>
  wr >= 70 ? "text-orange-400" : wr >= 60 ? "text-jade" : wr >= 52 ? "text-flash/55" : "text-red-400/60"

function splitNametag(r: Entry): [string, string] {
  const nt = r.nametag ?? r.summonerName ?? "Unknown"
  return nt.includes("#") ? (nt.split("#") as [string, string]) : [nt, ""]
}

function TalentChip({ r }: { r: Entry }) {
  if (r.isPro)
    return (
      <span className="text-[7px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wider uppercase shrink-0"
        style={{ background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }}>
        PRO
      </span>
    )
  if (r.isStreamer)
    return (
      <span className="text-[7px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wider uppercase shrink-0"
        style={{ background: "linear-gradient(135deg, #7b42a1, #a855c7)", color: "#e0d0f0" }}>
        STRM
      </span>
    )
  return null
}

function RecordBar({ wins, losses, winrate }: { wins: number; losses: number; winrate: number }) {
  const total = wins + losses
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-jade/70 tabular-nums">{wins}W</span>
        <span className="text-[10px] font-mono text-red-400/50 tabular-nums">{losses}L</span>
      </div>
      <div className="relative h-[3px] rounded-[1px] overflow-hidden" style={{ background: "rgba(239,68,68,0.10)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-[1px] transition-all duration-700 ease-out"
          style={{
            width: `${total > 0 ? (wins / total) * 100 : 50}%`,
            background:
              winrate >= 60
                ? "linear-gradient(90deg, rgba(0,217,146,0.35), rgba(0,217,146,0.65))"
                : winrate >= 52
                  ? "linear-gradient(90deg, rgba(0,217,146,0.2), rgba(0,217,146,0.45))"
                  : "linear-gradient(90deg, rgba(215,216,217,0.12), rgba(215,216,217,0.28))",
            boxShadow: winrate >= 55 ? "0 0 6px rgba(0,217,146,0.25)" : "none",
          }}
        />
      </div>
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
  const [cutoffs, setCutoffs] = useState<{ challenger: number | null; grandmaster: number | null; challengerCount: number; grandmasterCount: number } | null>(null)

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
      if (data.cutoffs) setCutoffs(data.cutoffs)
    } catch {
      setError("Network error")
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1) }, [region, queue])

  useEffect(() => {
    document.title = `${region} Leaderboards - lolData`
    return () => { document.title = "lolData" }
  }, [region])

  const handlePlayerClick = (r: Entry) => {
    const nametag = r.nametag ?? r.summonerName
    if (!nametag) return
    const [name, tag] = nametag.includes("#") ? nametag.split("#") : [nametag, region]
    navigate(`/summoners/${region.toLowerCase()}/${encodeURIComponent(name)}-${encodeURIComponent(tag || region)}`)
  }

  const champIcon = (championId: number) => {
    const champName = keyToName[String(championId)] ?? String(championId)
    return `${cdnBaseUrl()}/img/champion/${champName}.png`
  }

  const podium = page === 1 && !loading && !error ? rows.slice(0, 3) : []
  const tableRows = page === 1 ? rows.slice(podium.length ? 3 : 0) : rows

  // shared row grid — rank | icon | player | rank+LP | record | champs | WR.
  // The table body scrolls horizontally under ~860px so the player name never
  // collapses (fixed columns would otherwise eat the whole 1fr).
  const rowGrid = "grid grid-cols-[40px_40px_minmax(180px,1fr)_116px_120px_96px_52px] items-center gap-x-2.5"

  return (
    <div className="min-h-[70vh]">
      {/* ═══ HERO ═══ */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 -mt-20 h-[340px] overflow-hidden">
        <img
          src="/img/Leaderboards.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover select-none"
          style={{ objectPosition: "center 12%" }}
          draggable={false}
        />
        {/* washes: darken, jade aura, grid, scanlines, vignette — homepage vocabulary */}
        <div className="absolute inset-0 bg-liquirice/75" />
        <div
          className="absolute -top-1/3 right-[-6%] w-[55%] h-[160%] pointer-events-none"
          style={{ background: "radial-gradient(closest-side, rgba(0,217,146,0.13), rgba(0,217,146,0.04) 55%, transparent 75%)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,217,146,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,146,0.05) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(120% 130% at 60% 40%, #000 20%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(120% 130% at 60% 40%, #000 20%, transparent 78%)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.14) 2px, rgba(255,255,255,0.14) 4px)" }} />
        <div className="absolute top-0 inset-x-0 h-16 pointer-events-none bg-gradient-to-b from-liquirice to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none bg-gradient-to-t from-liquirice to-transparent" />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[65%] min-[2560px]:w-[55%] z-10">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            {/* identity */}
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-jade/55 tracking-[0.45em] uppercase mb-2.5 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" />
                RANKED LADDER · MASTER+
              </p>
              <h1 className="font-chakrapetch font-bold uppercase leading-none text-flash/95 text-[32px] sm:text-[44px] md:text-[52px] tracking-[0.04em]">
                Leader<span className="text-jade">boards</span>
              </h1>

              {/* apex cutoff chips — real LP to reach each tier (LP of the
                  player at the tier's positional slot; computed server-side) */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-filmdark/45 backdrop-blur-sm px-2 py-1 shadow-[inset_0_0_0_1px_rgba(255,182,21,0.22)]">
                  <img src={getRankImage("CHALLENGER")} alt="" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[9px] font-mono tracking-[0.14em] text-flash/45 uppercase">Chall. cutoff</span>
                  <span className="text-[11px] font-chakrapetch font-bold text-[#FFB615]/90 tabular-nums">
                    {cutoffs?.challenger != null ? `${cutoffs.challenger.toLocaleString()} LP` : "—"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-filmdark/45 backdrop-blur-sm px-2 py-1 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.20)]">
                  <img src={getRankImage("GRANDMASTER")} alt="" className="w-3.5 h-3.5 object-contain" />
                  <span className="text-[9px] font-mono tracking-[0.14em] text-flash/45 uppercase">GM cutoff</span>
                  <span className="text-[11px] font-chakrapetch font-bold text-red-300/85 tabular-nums">
                    {cutoffs?.grandmaster != null ? `${cutoffs.grandmaster.toLocaleString()} LP` : "—"}
                  </span>
                </span>
              </div>
            </div>

            {/* controls */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex rounded-[4px] bg-black/50 backdrop-blur-md p-0.5 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.10)]">
                {QUEUES.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => setQueue(q.key as typeof queue)}
                    className={cn(
                      "relative z-10 px-4 py-2 text-[9px] font-mono tracking-[0.15em] uppercase transition-colors duration-200 rounded-[3px] cursor-clicker",
                      queue === q.key ? "text-jade" : "text-flash/30 hover:text-flash/55"
                    )}
                  >
                    {queue === q.key && (
                      <motion.div
                        layoutId="queue-pill"
                        className="absolute inset-0 rounded-[3px] bg-jade/10 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.35),0_0_14px_rgba(0,217,146,0.12)]"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{q.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative flex rounded-[4px] bg-black/50 backdrop-blur-md p-0.5 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.10)]">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    className={cn(
                      "relative z-10 px-4 py-2 text-[9px] font-mono tracking-[0.15em] uppercase transition-colors duration-200 rounded-[3px] cursor-clicker",
                      region === r ? "text-jade" : "text-flash/30 hover:text-flash/55"
                    )}
                  >
                    {region === r && (
                      <motion.div
                        layoutId="region-pill"
                        className="absolute inset-0 rounded-[3px] bg-jade/10 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.35),0_0_14px_rgba(0,217,146,0.12)]"
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
      </div>

      {/* ═══ CONTENT COLUMN ═══
          The app layout already locks page content to the site width (65%),
          so this just fills it. The hero above breaks out to full-bleed and
          re-applies that same 65% internally, so the two align exactly. */}
      <div className="w-full pb-16">
        {/* ── Error ── */}
        {error && (
          <div className="mt-6 rounded-md bg-red-500/[0.06] px-4 py-3 text-red-300/90 text-[12px] font-mono shadow-[inset_0_0_0_1px_rgba(239,68,68,0.25)]">
            {error}
          </div>
        )}

        {/* ── TOP 3 PODIUM (page 1) ── */}
        {loading && page === 1 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(glass, "h-[152px] animate-pulse")} />
            ))}
          </div>
        )}
        {podium.length === 3 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {podium.map((r, i) => {
              const medal = MEDALS[i]
              const [name, tag] = splitNametag(r)
              return (
                <motion.button
                  key={r.puuid ?? r.rank}
                  type="button"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => handlePlayerClick(r)}
                  className={cn(
                    glass, medal.glow,
                    "group text-left px-5 py-4 cursor-clicker transition-transform duration-300 hover:-translate-y-1",
                    "border border-jade/20 hover:border-jade/35",
                  )}
                >
                  {/* oversized rank numeral — vertically centred so overflow-hidden
                      never clips it top or bottom */}
                  <span className={cn("absolute top-1/2 -translate-y-1/2 right-3 font-chakrapetch font-bold text-[68px] leading-none opacity-[0.09] select-none pointer-events-none", medal.text)}>
                    {r.rank}
                  </span>

                  <div className="relative z-10 flex items-center gap-3.5">
                    <div className={cn("relative w-14 h-14 rounded-[6px] overflow-hidden shrink-0 ring-1", medal.ring)}>
                      <img src={`${cdnBaseUrl()}/img/profileicon/${r.profileIconId ?? 29}.png`} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={cn("font-chakrapetch font-bold text-[12px] tabular-nums", medal.label)}>#{r.rank}</span>
                        <TalentChip r={r} />
                      </div>
                      <p className="font-chakrapetch font-semibold text-[15px] text-flash/90 truncate group-hover:text-jade transition-colors">
                        {name}
                        <span className="text-flash/25 font-normal text-[11px] ml-1">#{tag}</span>
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <img src={getRankImage(r.tier)} alt={r.tier} className="w-4 h-4 object-contain" />
                        <span className="font-chakrapetch font-bold text-[15px] text-flash/85 tabular-nums">{r.leaguePoints.toLocaleString()}</span>
                        <span className="text-[9px] font-mono text-flash/30">LP</span>
                        <span className={cn("ml-auto text-[11px] font-mono font-semibold tabular-nums", wrColor(r.winrate))}>{r.winrate}%</span>
                      </div>
                    </div>
                  </div>

                  {/* footer: record bar + top champs */}
                  <div className="relative z-10 mt-3.5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <RecordBar wins={r.wins} losses={r.losses} winrate={r.winrate} />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(r.topChampions ?? []).slice(0, 3).map((c, ci) => (
                        <img
                          key={ci}
                          src={champIcon(c.championId)}
                          alt=""
                          className="w-6 h-6 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* ── TABLE ── */}
        <div className={cn(glass, "mt-4")}>
          <div className="overflow-x-auto no-scrollbar">
          <div className="min-w-[820px]">
          {/* header */}
          <div className={cn(rowGrid, "px-5 py-2.5 text-[8px] font-mono text-flash/30 tracking-[0.22em] uppercase border-b border-flash/[0.06]")}>
            <span className="text-center">#</span>
            <span />
            <span>Player</span>
            <span className="text-center">Rank</span>
            <span className="text-center">Record</span>
            <span className="text-center">Top Champs</span>
            <span className="text-right">WR</span>
          </div>

          {/* rows */}
          {loading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className={cn(rowGrid, "px-5 py-3 border-b border-flash/[0.04]")}>
                  <Skeleton className="w-6 h-4 bg-flash/5 mx-auto" />
                  <Skeleton className="w-9 h-9 rounded-[4px] bg-flash/5" />
                  <Skeleton className="h-4 w-40 bg-flash/5" />
                  <Skeleton className="w-20 h-4 bg-flash/5 mx-auto" />
                  <Skeleton className="w-20 h-4 bg-flash/5 mx-auto" />
                  <div className="flex gap-1 justify-center">
                    <Skeleton className="w-6 h-6 rounded-full bg-flash/5" />
                    <Skeleton className="w-6 h-6 rounded-full bg-flash/5" />
                    <Skeleton className="w-6 h-6 rounded-full bg-flash/5" />
                  </div>
                  <Skeleton className="w-10 h-4 bg-flash/5 ml-auto" />
                </div>
              ))
            : tableRows.map((r, i) => {
                const [name, tag] = splitNametag(r)
                return (
                  <motion.div
                    key={`${r.puuid ?? r.summonerId}-${r.rank}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i, 20) * 0.015, ease: "easeOut" }}
                    onClick={() => handlePlayerClick(r)}
                    className={cn(
                      rowGrid,
                      "group relative px-5 py-3 cursor-clicker transition-colors duration-200",
                      "border-b border-flash/[0.04] last:border-b-0",
                      "hover:bg-jade/[0.03]",
                    )}
                  >
                    {/* hover accent */}
                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    {/* rank */}
                    <span className="text-center font-chakrapetch font-bold tabular-nums text-[13px] text-flash/30 group-hover:text-flash/55 transition-colors">
                      {r.rank}
                    </span>

                    {/* icon */}
                    <div className="relative w-9 h-9 rounded-[4px] overflow-hidden shrink-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] transition-transform duration-300 group-hover:scale-105">
                      <img src={`${cdnBaseUrl()}/img/profileicon/${r.profileIconId ?? 29}.png`} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>

                    {/* player — talent chip FIRST so it sits at a fixed x for
                        every row (after the name its position drifts per name) */}
                    <div className="min-w-0 flex items-center gap-2">
                      <TalentChip r={r} />
                      <span className="text-[13px] font-chakrapetch text-flash/80 truncate group-hover:text-flash transition-colors duration-200">
                        {name}
                        <span className="text-flash/20 text-[11px] ml-1">#{tag}</span>
                      </span>
                    </div>

                    {/* tier + LP */}
                    <div className="flex items-center gap-2 justify-center">
                      <img src={getRankImage(r.tier)} alt={r.tier} className="w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-110" />
                      <div>
                        <span className="font-chakrapetch font-bold tabular-nums text-[14px] text-flash/80">
                          {r.leaguePoints.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-mono text-flash/25 ml-0.5">LP</span>
                      </div>
                    </div>

                    {/* record */}
                    <RecordBar wins={r.wins} losses={r.losses} winrate={r.winrate} />

                    {/* champs */}
                    <div className="flex gap-1 justify-center">
                      {(r.topChampions ?? []).slice(0, 3).map((c, ci) => (
                        <img
                          key={ci}
                          src={champIcon(c.championId)}
                          alt=""
                          className="w-7 h-7 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-transform duration-200 hover:scale-110"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                      ))}
                    </div>

                    {/* WR */}
                    <span
                      className={cn("text-right text-[12px] font-mono font-semibold tabular-nums", wrColor(r.winrate))}
                      style={r.winrate >= 70 ? { textShadow: "0 0 8px rgba(251,146,60,0.6)" } : undefined}
                    >
                      {r.winrate}%
                    </span>
                  </motion.div>
                )
              })}
          </div>
          </div>
        </div>

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              className="px-4 py-2.5 text-[9px] font-mono tracking-[0.12em] uppercase rounded-[3px] bg-filmlight/[0.03] text-flash/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:text-jade hover:shadow-[inset_0_0_0_1px_rgba(0,217,146,0.30)] disabled:opacity-15 transition-all cursor-clicker"
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
                    "w-9 h-9 text-[11px] font-chakrapetch rounded-[3px] transition-all duration-200 cursor-clicker",
                    p === page
                      ? "bg-jade/10 text-jade shadow-[inset_0_0_0_1px_rgba(0,217,146,0.35),0_0_12px_rgba(0,217,146,0.15)]"
                      : "text-flash/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] hover:text-flash/60 hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
                  )}
                >
                  {p}
                </button>
              )
            })}

            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              className="px-4 py-2.5 text-[9px] font-mono tracking-[0.12em] uppercase rounded-[3px] bg-filmlight/[0.03] text-flash/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] hover:text-jade hover:shadow-[inset_0_0_0_1px_rgba(0,217,146,0.30)] disabled:opacity-15 transition-all cursor-clicker"
            >
              NEXT
            </button>
          </div>
        )}
      </div>

      {/* ── Back to top ── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 right-10 z-50"
          >
            <DiamondButton icon="top" label="TOP" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
