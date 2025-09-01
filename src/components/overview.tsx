// src/components/overview.tsx
import { useEffect, useMemo, useState } from "react"
import type { MatchWithWin, SummonerInfo } from "@/assets/types/riot"
import { API_BASE_URL } from "@/config"
import dayjs from "dayjs"
import { Separator } from "@/components/ui/separator"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

type Props = {
  nametag: string | null
  region: string | null
  puuid?: string | null
}

/* ------------------------- time helpers ------------------------- */
function getMatchTimestamp(info: MatchWithWin["match"]["info"]) {
  return info.gameEndTimestamp ?? info.gameStartTimestamp ?? info.gameCreation
}
function dayKeyFromTs(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/* -------- shared finder: robust match of the current participant -------- */
function findMyParticipant(
  match: MatchWithWin,
  opts: { puuid?: string | null; summoner?: SummonerInfo | null; nametag?: string | null }
) {
  const [authName, authTag] = (opts.nametag ?? "").split("#").map(s => s?.toLowerCase())
  const parts = match.match.info.participants

  return parts.find(pp => {
    if (opts.puuid && pp.puuid === opts.puuid) return true
    if (!opts.puuid && opts.summoner?.puuid && pp.puuid === opts.summoner.puuid) return true

    const riotOk =
      pp.riotIdGameName && pp.riotIdTagline &&
      authName && authTag &&
      pp.riotIdGameName.toLowerCase() === authName &&
      pp.riotIdTagline.toLowerCase() === authTag
    if (riotOk) return true

    const snOk =
      opts.summoner?.name &&
      pp.summonerName &&
      pp.summonerName.toLowerCase() === opts.summoner.name.toLowerCase()
    return snOk
  })
}

export default function Overview({ nametag, region, puuid }: Props) {
  const [summoner, setSummoner] = useState<SummonerInfo | null>(null)
  const [matches, setMatches] = useState<MatchWithWin[]>([])
  const [loading, setLoading] = useState(true)

  /* ----------------------------- fetch ----------------------------- */
  useEffect(() => {
    const run = async () => {
      if (!nametag || !region) return
      const [name, tag] = nametag.split("#")
      if (!name || !tag) return
      setLoading(true)
      try {
        const sRes = await fetch(`${API_BASE_URL}/api/summoner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tag, region })
        })
        const sData = await sRes.json()
        setSummoner(sData.summoner ?? null)

        const mRes = await fetch(`${API_BASE_URL}/api/matches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tag, region })
        })
        const mData = await mRes.json()
        setMatches(mData.matches || [])
      } catch (e) {
        console.error("Overview fetch error:", e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [nametag, region])

  /* -------------------------- today filtering -------------------------- */
  const todayKey = dayjs().format("YYYY-MM-DD")
  const todaysMatches = useMemo(() => {
    if (!matches.length) return []
    return matches.filter(m => dayKeyFromTs(getMatchTimestamp(m.match.info)) === todayKey)
  }, [matches, todayKey])

  /* --------------------------- KDA aggregate --------------------------- */
  const { kdaLabel, kdaDisplay } = useMemo(() => {
    if (!todaysMatches.length) return { kdaLabel: "—", kdaDisplay: "—" }

    let K = 0, D = 0, A = 0
    let foundAnyParticipant = false

    for (const m of todaysMatches) {
      const p = findMyParticipant(m, { puuid, summoner, nametag })
      if (!p) continue
      foundAnyParticipant = true
      K += p.kills ?? 0
      D += p.deaths ?? 0
      A += p.assists ?? 0
    }

    if (!foundAnyParticipant) return { kdaLabel: "—", kdaDisplay: "—" }
    if (D === 0 && (K + A) > 0) return { kdaLabel: "Perfect", kdaDisplay: `${K}/${D}/${A}` }

    const kda = D > 0 ? (K + A) / D : 0
    return { kdaLabel: `${kda.toFixed(2)} KDA`, kdaDisplay: `${K}/${D}/${A}` }
  }, [todaysMatches, puuid, summoner, nametag])

  const totalGamesToday = todaysMatches.length

  /* --------------------------- chart datapoints -------------------------- */
  const kdaData = useMemo(() => {
    if (!todaysMatches.length) return []
    return todaysMatches.map((m, idx) => {
      const p = findMyParticipant(m, { puuid, summoner, nametag })
      if (!p) return { name: `G${idx + 1}`, kda: 0 }
      const { kills, deaths, assists } = p
      const kda = deaths === 0 ? (kills + assists) : (kills + assists) / Math.max(1, deaths)
      return { name: `G${idx + 1}`, kda: parseFloat(kda.toFixed(2)) }
    })
  }, [todaysMatches, puuid, summoner, nametag])

  /* -------------------------- rank / progress -------------------------- */
  const rank = summoner?.rank ?? "Unranked"
  const lp = typeof summoner?.lp === "number" ? summoner!.lp : 0
  const lpToNext = Math.max(0, 100 - lp)

  /* ================================ UI ================================ */
  return (
    <div className="flex w-full h-64">
      {/* LEFT: today’s KDA + total games */}
      <div className="w-[25%] h-full rounded-[4px] flex flex-col p-2 gap-3">
        <div className="h-32 bg-jade/10 border border-flash/10 rounded-sm flex flex-col justify-between p-4">
          <span className="text-sm text-flash/70">TODAY’S KDA</span>
          <div className="flex items-baseline gap-2">
            <span className="font-proto text-3xl">
              {loading ? "…" : (kdaLabel === "Perfect" ? "Perfect" : kdaLabel.split(" ")[0])}
            </span>
            <span className="text-flash/60 text-xs">
              {loading ? "" : kdaLabel === "—" ? "" : kdaLabel.includes("KDA") ? "KDA" : ""}
            </span>
          </div>
          <span className="text-flash/60 text-xs">{loading ? "" : kdaDisplay}</span>
        </div>

        <div className="h-32 bg-cement border border-flash/10 rounded-sm flex flex-col justify-between p-4">
          <span className="text-sm text-flash/70">TOTAL GAMES</span>
          <span className="font-proto text-3xl">{loading ? "…" : totalGamesToday}</span>
        </div>
      </div>

      {/* MIDDLE: bar chart KDA di oggi */}
      <div className="w-[50%] h-full flex flex-col py-2 px-0.5 gap-1">
        <div className="bg-cement border border-flash/10 rounded-sm h-full p-2">
          {loading ? (
            <div className="text-flash/50 text-sm h-full flex items-center justify-center">Caricamento…</div>
          ) : kdaData.length === 0 ? (
            <div className="text-flash/60 text-sm h-full flex items-center justify-center">
              Nessuna partita giocata oggi.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kdaData} margin={{ top: 12, right: 16, left: 8, bottom: 12 }} barSize={24}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8a8f8e", fontSize: 11 }}
                  axisLine={{ stroke: "#8a8f8e" }}
                  tickLine={{ stroke: "#8a8f8e" }}
                />
                <YAxis
                  domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax + 0.2))]}
                  tick={{ fill: "#8a8f8e", fontSize: 11 }}
                  axisLine={{ stroke: "#8a8f8e" }}
                  tickLine={{ stroke: "#8a8f8e" }}
                  allowDecimals
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "#111", border: "1px solid #2B2A2B" }}
                  labelStyle={{ color: "#BFC5C6" }}
                  itemStyle={{ color: "#BFC5C6" }}
                  formatter={(v: number) => [v.toFixed(2), "KDA"]}
                />
                <Bar dataKey="kda" radius={[4, 4, 0, 0]} maxBarSize={28}>
                  {(() => {
                    const values = kdaData.map(d => d.kda)
                    const max = Math.max(...values)
                    const highlight = max > 0 ? max : -1
                    return kdaData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.kda === highlight ? "#00d992" : "#BFC5C6"} />
                    ))
                  })()}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

          {/* RIGHT: current rank */}
          <div className="w-[25%] h-full flex flex-col p-2 gap-1">
              <div className="h-full bg-cement border border-flash/10 rounded-sm flex flex-col justify-between p-4">
                  <div className="flex flex-col">
                      <span className="text-sm text-flash/70">CURRENT RANK</span>
                      <span className="text-xl text-flash">{loading ? "…" : rank}</span>
                      <span className="font-proto"> BWIPO </span>
                  </div>

                  <div className="space-y-2">
                      <div className="font-proto">
                          {rank.toLowerCase() !== "unranked" && (
                              <div className="flex justify-between items-end text-flash/70 text-sm ">
                                  <span className="text-3xl">{lp}</span>
                                  <div>
                                      <span>/</span>
                                      <span>100</span>
                                  </div>
                              </div>
                          )}
                      </div>

            <Separator className="w-full bg-flash/10" />

            {rank.toLowerCase() !== "unranked" ? (
              <>
                <div className="flex justify-between text-xs text-flash/60">
                  <span>LP to next division</span>
                  <span>{loading ? "…" : lpToNext}</span>
                </div>
                <div className="h-2 w-full bg-flash/10 rounded-sm overflow-hidden">
                  <div className="h-full bg-jade" style={{ width: `${loading ? 0 : Math.min(100, lp)}%` }} />
                </div>
              </>
            ) : (
              <div className="text-xs text-flash/50">Gioca partite ranked per ottenere un rank.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
