import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { API_BASE_URL, champPath } from "@/config"
import { getWinrateClass } from "@/utils/winratecolor"
import { getKdaClass } from "@/utils/kdaColor"
import { formatStat } from "@/utils/formatStat"
import splashPositionMap from "@/converters/splashPositionMap"
import { Tabs, TabsTrigger, TabsList } from "@/components/ui/tabs"
import type { ChampionStats, SummonerInfo } from "@/assets/types/riot"

const tabTriggerClass =
  "font-jetbrains text-[11px] tracking-[0.15em] uppercase px-1 py-2.5 rounded-none bg-transparent text-flash/35 transition-all border-b-2 border-transparent data-[state=active]:text-jade data-[state=active]:border-jade data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-flash/55"

type QueueGroup = "ranked_all" | "ranked_solo" | "ranked_flex"

type MatchupEntry = {
  opponent: string
  games: number
  wins: number
  winrate: number
  kills: number
  deaths: number
  assists: number
  kda: string
}

type MatchupMap = Record<string, MatchupEntry[]>

type SeasonData = {
  champs: ChampionStats[]
  matchups: MatchupMap
}

export default function SeasonPage() {
  const navigate = useNavigate()
  const { region, slug } = useParams()
  const [name, tag] = slug?.split("-") ?? []

  const [summoner, setSummoner] = useState<SummonerInfo | null>(null)

  useEffect(() => {
    if (name && tag) {
      document.title = `${name}#${tag} - lolData`;
    }
    return () => { document.title = "lolData"; };
  }, [name, tag])
  const [season, setSeason] = useState<SeasonData>({ champs: [], matchups: {} })
  const [solo, setSolo] = useState<SeasonData>({ champs: [], matchups: {} })
  const [flex, setFlex] = useState<SeasonData>({ champs: [], matchups: {} })
  const [activeTab, setActiveTab] = useState("season")
  const [loading, setLoading] = useState(true)

  // resolve summoner
  useEffect(() => {
    if (!name || !tag || !region) return
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/summoner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tag, region }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.summoner) setSummoner(data.summoner)
      } catch { /* ignore */ }
    })()
  }, [name, tag, region])

  // fetch all 3 queue groups once puuid is available
  useEffect(() => {
    if (!summoner?.puuid || !region) return
    let cancelled = false

    async function fetchStats(queueGroup: QueueGroup): Promise<SeasonData> {
      const res = await fetch(`${API_BASE_URL}/api/season_stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid: summoner!.puuid, region, queueGroup }),
      })
      if (res.status === 200) {
        const data = await res.json()
        return {
          champs: data.topChampions || [],
          matchups: data.matchups || {},
        }
      }
      return { champs: [], matchups: {} }
    }

    ;(async () => {
      const [all, soloData, flexData] = await Promise.all([
        fetchStats("ranked_all"),
        fetchStats("ranked_solo"),
        fetchStats("ranked_flex"),
      ])
      if (cancelled) return
      setSeason(all)
      setSolo(soloData)
      setFlex(flexData)
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [summoner?.puuid, region])

  const active =
    activeTab === "solo" ? solo :
    activeTab === "flex" ? flex :
    season

  const topChamp = season.champs[0]?.champion

  const displayName =
    summoner?.name ?? (slug ? (() => {
      const idx = slug.lastIndexOf("-")
      return idx > 0 ? slug.slice(0, idx) : slug
    })() : name)

  return (
    <div className="text-flash -mt-10">
      {/* ═══════════════════════════════════════════════
          STICKY BACK BUTTON (diamond, like match page)
          ═══════════════════════════════════════════════ */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-1/2 left-4 -translate-y-1/2 z-50 group w-9 h-9 cursor-clicker"
      >
        <span className={cn(
          "absolute inset-0 rotate-45 rounded-[3px] border transition-all duration-300",
          "bg-black/60 border-jade/30",
          "group-hover:border-jade/70 group-hover:bg-jade/10",
          "group-hover:shadow-[0_0_14px_rgba(0,217,146,0.25)]",
          "shadow-[0_0_6px_rgba(0,217,146,0.1)]"
        )} />
        <span className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 10 10" className="w-3.5 h-3.5 text-jade transition-transform duration-300 group-hover:-translate-x-[2px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7,1 3,5 7,9" />
          </svg>
        </span>
      </button>

      {/* ═══════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════ */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 h-[280px] overflow-hidden">
        {topChamp && (
          <img
            src={`https://cdn.loldata.cc/15.13.1/img/champion/${topChamp}_0.jpg`}
            alt={topChamp}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${splashPositionMap[topChamp] || "15%"}` }}
            draggable={false}
          />
        )}
        <div className="absolute inset-0 bg-liquirice/70" />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] z-[2]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.8)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" />

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-flash/25">
            Season 2025
          </span>
          <h1 className="text-3xl font-bold tracking-wide text-flash">
            {displayName}
          </h1>
          {summoner && (
            <div className="flex items-center gap-4 mt-1 font-jetbrains text-[12px] tracking-wider uppercase">
              <span className="text-jade">{summoner.wins}W</span>
              <span className="text-error">{summoner.losses}L</span>
              {(() => {
                const total = summoner.wins + summoner.losses
                const wr = total > 0 ? Math.round((summoner.wins / total) * 100) : 0
                return <span className={getWinrateClass(wr, total)}>{wr}% WR</span>
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          STATS TABLE CARD
          ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-md bg-black/20 mt-4 mb-16">
        <div className="relative z-10">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-4 pt-4">
              <TabsList className="flex justify-center bg-transparent h-auto p-0 gap-6 border-b border-white/[0.04]">
                <TabsTrigger value="season" className={tabTriggerClass}>Season</TabsTrigger>
                <TabsTrigger value="solo" className={tabTriggerClass}>Solo/Duo</TabsTrigger>
                <TabsTrigger value="flex" className={tabTriggerClass}>Flex</TabsTrigger>
              </TabsList>
            </div>

            <div className="px-4 pt-3 pb-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChampionTable
                    champs={active.champs}
                    matchups={active.matchups}
                    loading={loading}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────
   CHAMPION TABLE
   ────────────────────────────────────────────── */
function ChampionTable({
  champs,
  matchups,
  loading,
}: {
  champs: ChampionStats[]
  matchups: MatchupMap
  loading: boolean
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  if (champs.length === 0) {
    return (
      <div className="py-16 text-center text-flash/25 font-jetbrains text-sm tracking-wider uppercase">
        No champion data
      </div>
    )
  }

  const colCount = 8

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] font-jetbrains">
        <thead>
          <tr className="text-flash/20 text-[10px] tracking-[0.18em] uppercase border-b border-white/[0.04]">
            <th className="py-2.5 pl-3 pr-2 text-left w-8">#</th>
            <th className="py-2.5 px-2 text-left">Champion</th>
            <th className="py-2.5 px-2 text-center">Games</th>
            <th className="py-2.5 px-2 text-center">Win%</th>
            <th className="py-2.5 px-2 text-center">KDA</th>
            <th className="py-2.5 px-2 text-center hidden lg:table-cell">K / D / A</th>
            <th className="py-2.5 px-2 text-center hidden md:table-cell">CS/min</th>
            <th className="py-2.5 pr-3 pl-2 text-right hidden md:table-cell">Gold</th>
          </tr>
        </thead>

        <tbody>
          {champs.map((c, i) => {
            const perGameK = formatStat(c.kills / c.games)
            const perGameD = formatStat(c.deaths / c.games)
            const perGameA = formatStat(c.assists / c.games)
            const wr = c.winrate
            const isExpanded = expanded === c.champion
            const champMatchups = matchups[c.champion] ?? []

            return (
              <>
                {/* Main row */}
                <tr
                  key={c.champion}
                  onClick={() => setExpanded(isExpanded ? null : c.champion)}
                  className={cn(
                    "border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors cursor-clicker select-none",
                    isExpanded ? "bg-white/[0.025]" : "even:bg-white/[0.01]"
                  )}
                >
                  <td className="py-2.5 pl-3 pr-2 text-flash/20">{i + 1}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`${champPath}/${c.champion}.png`}
                        alt={c.champion}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-flash/80 truncate max-w-[120px]">{c.champion}</span>
                      <svg
                        viewBox="0 0 10 10"
                        className={cn(
                          "w-2.5 h-2.5 text-flash/15 transition-transform duration-200 flex-shrink-0",
                          isExpanded && "rotate-180"
                        )}
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      >
                        <polyline points="2,3 5,7 8,3" />
                      </svg>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center text-flash/50">{c.games}</td>
                  <td className={cn("py-2.5 px-2 text-center", getWinrateClass(wr, c.games))}>{wr}%</td>
                  <td className={cn("py-2.5 px-2 text-center", getKdaClass(c.avgKda))}>{c.avgKda}</td>
                  <td className="py-2.5 px-2 text-center text-flash/40 hidden lg:table-cell">
                    {perGameK} / {perGameD} / {perGameA}
                  </td>
                  <td className="py-2.5 px-2 text-center text-flash/50 hidden md:table-cell">
                    {(() => {
                      const num = Number(c.csPerMin)
                      const rounded = Math.round(num * 10) / 10
                      return Number.isInteger(rounded) ? rounded : rounded.toFixed(1)
                    })()}
                  </td>
                  <td className="py-2.5 pr-3 pl-2 text-right text-flash/40 hidden md:table-cell">
                    {c.avgGold.toLocaleString()}
                  </td>
                </tr>

                {/* Expanded matchup rows */}
                {isExpanded && (
                  <tr key={`${c.champion}-matchups`}>
                    <td colSpan={colCount} className="p-0">
                      <AnimatePresence>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <MatchupPanel champion={c.champion} matchups={champMatchups} />
                        </motion.div>
                      </AnimatePresence>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ──────────────────────────────────────────────
   MATCHUP PANEL (expanded row content)
   ────────────────────────────────────────────── */
function MatchupPanel({ champion, matchups }: { champion: string; matchups: MatchupEntry[] }) {
  if (matchups.length === 0) {
    return (
      <div className="bg-white/[0.015] border-t border-white/[0.03] px-6 py-4">
        <div className="text-[10px] tracking-[0.15em] uppercase text-flash/20 mb-2">
          Most faced opponents as {champion}
        </div>
        <div className="text-[11px] text-flash/15 font-jetbrains tracking-wider uppercase py-2">
          No matchup data yet
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/[0.015] border-t border-white/[0.03] px-6 py-4">
      <div className="text-[10px] tracking-[0.15em] uppercase text-flash/20 mb-3">
        Most faced opponents as {champion}
      </div>

      <div className="flex flex-col gap-2">
        {matchups.map((m) => {
          const perGameK = formatStat(m.kills / m.games)
          const perGameD = formatStat(m.deaths / m.games)
          const perGameA = formatStat(m.assists / m.games)

          return (
            <div
              key={m.opponent}
              className="flex items-center gap-4 py-1.5 px-2 rounded bg-white/[0.02]"
            >
              {/* Opponent icon + name */}
              <div className="flex items-center gap-2 min-w-[130px]">
                <img
                  src={`${champPath}/${m.opponent}.png`}
                  alt={m.opponent}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-[11px] text-flash/60 truncate">{m.opponent}</span>
              </div>

              {/* Games */}
              <span className="text-[11px] text-flash/35 min-w-[50px] text-center">
                {m.games}G
              </span>

              {/* Winrate */}
              <span className={cn("text-[11px] min-w-[40px] text-center", getWinrateClass(m.winrate, m.games))}>
                {m.winrate}%
              </span>

              {/* KDA */}
              <span className={cn("text-[11px] min-w-[45px] text-center", getKdaClass(m.kda))}>
                {m.kda}
              </span>

              {/* K/D/A breakdown */}
              <span className="text-[11px] text-flash/30 hidden sm:inline">
                {perGameK} / {perGameD} / {perGameA}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
