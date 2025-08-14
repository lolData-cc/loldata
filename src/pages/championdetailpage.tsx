// src/pages/champion-detail-page.tsx
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL } from "@/config"

type ChampInfo = {
  id: string
  key: string
  name: string
  title: string
  tags: string[]
  lore?: string
  image: { full: string }
  stats?: Record<string, number>
}

type Matchup = {
  opponent_key: number
  games: number
  winrate: number
  tips?: string | null
}

type Badge =
  | "EASY"
  | "GOOD"
  | "EVEN"
  | "HARD"
  | "VERY HARD"
  | "IMPOSSIBLE"
  | "OK" // fallback per range non specificati

function badgeFromWR(wr: number): Badge {
  if (wr > 54) return "EASY"
  if (wr > 52) return "GOOD"
  // NB: mi hai chiesto 50.01–50.09; è un range molto stretto: ok così
  if (wr >= 50 && wr <= 50.09) return "EVEN"
  if (wr < 50 && wr > 48) return "HARD"
  if (wr < 48 && wr > 46) return "VERY HARD"
  if (wr < 46) return "IMPOSSIBLE"
  return "OK"
}

function badgeClass(label: Badge): string {
  switch (label) {
    case "EASY": return "bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30"
    case "GOOD": return "bg-green-600/20 text-green-300 ring-1 ring-green-500/30"
    case "EVEN": return "bg-zinc-600/20 text-zinc-300 ring-1 ring-zinc-500/30"
    case "HARD": return "bg-orange-600/20 text-orange-300 ring-1 ring-orange-500/30"
    case "VERY HARD": return "bg-red-600/20 text-red-300 ring-1 ring-red-500/30"
    case "IMPOSSIBLE": return "bg-red-800/30 text-red-300 ring-1 ring-red-700/40"
    default: return "bg-neutral-600/20 text-neutral-300 ring-1 ring-neutral-500/30"
  }
}

const fmtPct = (x: number) => `${x.toFixed(2)}%`

export default function ChampionDetailPage() {
  const { champId } = useParams<{ champId: string }>()
  const [patch, setPatch] = useState("15.13.1")
  const [champ, setChamp] = useState<ChampInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [matchupsLoading, setMatchupsLoading] = useState(false)
  const [matchupsError, setMatchupsError] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)

  const [keyToId, setKeyToId] = useState<Record<string, string>>({})

  const keyToIdSafe = (k: number | string) => keyToId[String(k)] || String(k)

  // helpers immagini ora accettano key e risolvono id
  const opponentIdFromKey = (k: number) => keyToIdSafe(k)
  const opponentIcon = (k: number) =>
    `https://cdn.loldata.cc/15.13.1/img/champion/${opponentIdFromKey(k)}.png`
  const opponentSplash = (k: number) =>
    `https://cdn.loldata.cc/15.13.1/img/champion/${opponentIdFromKey(k)}_0.jpg`

  //retrieve matchup
  useEffect(() => {
    let cancelled = false
    // elenco completo champion per costruire le mappe
    fetch(`https://cdn.loldata.cc/${patch}/data/en_US/champion.json`)
      .then(r => r.json())
      .then((all) => {
        if (cancelled) return
        const k2i: Record<string, string> = {}
        Object.values(all.data || {}).forEach((ch: any) => {
          // ch.key è "122", ch.id è "Darius"
          k2i[ch.key] = ch.id
        })
        setKeyToId(k2i)
      })
      .catch(() => { })
    return () => { cancelled = true }
  }, [patch])

  useEffect(() => {
    if (!champId || !champ) return
    let cancelled = false
    setMatchupsLoading(true)
    setMatchupsError(null)

    const champKeyNum = Number(champ.key)   // <- usa la key del champ corrente

    fetch(`${API_BASE_URL}/api/champion/matchups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champKey: champKeyNum }),
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load matchups")
        return r.json()
      })
      .then((data: { matchups: Matchup[] }) => {
        if (cancelled) return
        setMatchups(data.matchups || [])
        setSelectedOpponent(
          data.matchups?.[0] ? String(data.matchups[0].opponent_key) : null
        )
      })
      .catch((e: any) => setMatchupsError(e?.message ?? "Errore caricamento matchups"))
      .finally(() => !cancelled && setMatchupsLoading(false))

    return () => { cancelled = true }
  }, [champId, champ])

  // latest patch
  useEffect(() => {
    let cancelled = false
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then(r => r.json())
      .then((versions: string[]) => {
        if (!cancelled && Array.isArray(versions) && versions.length) {
          setPatch(versions[0])
        }
      })
      .catch(() => { })
    return () => { cancelled = true }
  }, [])

  // fetch champion data
  useEffect(() => {
    if (!champId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`https://cdn.loldata.cc/15.13.1/data/en_US/champion/${champId}.json`)
      .then(r => {
        if (!r.ok) throw new Error("Failed to load champion")
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        // DDragon single-champion schema: { data: { [id]: ChampInfo } }
        const key = Object.keys(data?.data ?? {})[0]
        const c = key ? data.data[key] as ChampInfo : null
        setChamp(c)
      })
      .catch((e: any) => setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false))

    return () => { cancelled = true }
  }, [champId, patch])

  const splashUrl = useMemo(() => {
    if (!champId) return ""
    // splash
    return `https://cdn.loldata.cc/15.13.1/img/champion/${champId}_0.jpg`
  }, [champId])

  const iconUrl = useMemo(() => {
    if (!champ) return ""
    return `https://cdn.loldata.cc/15.13.1/img/champion/${champ.image.full}`
  }, [champ])

  if (!champId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-neutral-300">Champion non specificato.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-neutral-300">Loading {champId}…</p>
      </div>
    )
  }

  if (error || !champ) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-red-400">Errore: {error ?? "Champion non trovato."}</p>
      </div>
    )
  }

  return (
    <main className="min-h-dvh">
      {/* Hero */}
      <div className="relative h-[340px] w-full overflow-hidden rounded-xl -mt-6">
        <img
          src={splashUrl}
          alt={`${champ.name} splash`}
          className="h-full w-full object-cover object-[center_-40px]"
          loading="eager"
          decoding="async"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-4">
          <img
            src={iconUrl}
            alt={`${champ.name} icon`}
            className="h-16 w-16 rounded-md object-cover ring-1 ring-white/10"
          />
          <div>
            <h1 className="text-2xl font-semibold text-white">{champ.name}</h1>
            <p className="text-sm text-white/70">{champ.title}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {champ.tags?.map(t => (
                <span key={t} className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <Tabs defaultValue="overview">
        <div className="mx-auto max-w-6xl py-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4 w-[90%]">
            <TabsList className="xl:-ml-12">
              <TabsTrigger value="overview">
                <h2 className="text-lg font-semibold">OVERVIEW</h2>
              </TabsTrigger>
              <TabsTrigger value="statistics">
                <h2 className="text-lg font-semibold">STATISTICS</h2>
              </TabsTrigger>
              <TabsTrigger value="items">
                <h2 className="text-lg font-semibold">ITEMS</h2>
              </TabsTrigger>
              <TabsTrigger value="matchups">
                <h2 className="text-lg font-semibold">MATCHUPS</h2>
              </TabsTrigger>
              <TabsTrigger value="pros">
                <h2 className="text-lg font-semibold">PROS</h2>
              </TabsTrigger>
            </TabsList>


          </div>


        </div>
        <div className="space-y-4">
          <TabsContent value="overview">
            <div className="flex space-x-12">
              <div className="w-[80%]">
                <h3 className="text-base font-semibold">Introduction</h3>
                <p className="text-sm text-neutral-300 leading-relaxed pt-2">
                  {champ.lore || "No lore available."}
                </p>
              </div>
              <div className="w-[50%]">
                <h3 className="text-base font-semibold">Base Stats</h3>
                <div className="rounded-lg border border-white/10 bg-neutral-900/50 p-4 text-sm text-neutral-200 mt-2">
                  {champ.stats ? (
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {Object.entries(champ.stats).map(([k, v]) => (
                        <li key={k} className="flex justify-between uppercase">
                          <span className="text-neutral-400">{k}</span>
                          <span className="font-medium text-white">{v}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-neutral-400">N/A</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="statistics">
            STATS
          </TabsContent>
          <TabsContent value="matchups">
            {Object.keys(keyToId).length === 0 ? (
              <div className="text-neutral-400">LOADING CHAMPIONS…</div>
            ) : matchupsLoading ? (
              <div className="text-neutral-300">LOADING MATCHUPS…</div>
            ) : matchupsError ? (
              <div className="text-red-400">Error: {matchupsError}</div>
            ) : matchups.length === 0 ? (
              <div className="text-neutral-400">NO AVAILABLE MATCHUP INFO.</div>
            ) : (
              <div className="flex gap-8">
                <div className="w-[70%]">
                  {(() => {
                    const sel = matchups.find(m => String(m.opponent_key) === selectedOpponent) || matchups[0]
                    if (!sel) return null

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
                        <div className="lg:col-span-1 rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                          <h3 className="text-base font-semibold">Tips</h3>
                          {sel.tips ? (
                            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-neutral-200">
                              {sel.tips.split("\n").map((line, i) => <li key={i}>{line}</li>)}
                            </ul>
                          ) : (
                            <div className="mt-2 text-sm text-neutral-400">Nessun tip disponibile.</div>
                          )}
                        </div>

                        
                      </div>
                    )
                  })()}
                </div>
                <div className="w-[30%]">
                  <div className="flex flex-col gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                    {matchups.map(m => {
                      const oppKeyStr = String(m.opponent_key)
                      const oppId = opponentIdFromKey(m.opponent_key)
                      const label = badgeFromWR(m.winrate)
                      return (
                        <button
                          key={oppKeyStr}
                          onClick={() => setSelectedOpponent(oppKeyStr)}
                          className={[
                            "flex items-center gap-3 rounded-md border px-3 py-2 shrink-0",
                            selectedOpponent === oppKeyStr
                              ? "bg-white/10 border-white/20"
                              : "bg-neutral-900/50 border-white/10 hover:bg-white/5"
                          ].join(" ")}
                          title={oppId}
                        >
                          <img
                            src={opponentIcon(m.opponent_key)}
                            alt={`${oppId} icon`}
                            className="h-8 w-8 rounded object-cover ring-1 ring-white/10"
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                          />
                          <div className="w-full">
                            <div className="flex justify-between">
                              <div className="text-sm font-medium text-white">{oppId}</div>
                              <span className="text-sm font-semibold text-white">{fmtPct(m.winrate)}</span>
                            </div>
                            <div className="flex justify-between">
                              <div className="text-[11px] text-neutral-400">{m.games} games</div>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${badgeClass(label)}`}>
                                {label}
                              </span>
                            </div>
                          </div>
                          <div className="ml-auto flex items-center gap-2">


                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {/* Lista orizzontale di “tab” per ogni opponent */}




              </div>
            )}
          </TabsContent>


        </div>
      </Tabs>

    </main>
  )
}
