'use client';

// src/pages/champion-detail-page.tsx
import React, { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { CDN_BASE_URL } from "@/config"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL, normalizeChampSplash } from "@/config"
import splashPositionMap from "@/converters/splashPositionMap"
import { ChampionStats } from "@/components/champion-stats-tab"
import { ChampionItemsTab } from "@/components/championitemstab";
import { ChampionOtpRanking } from "@/components/champion-otp-ranking";
import { ChampionMatchupsTab } from "@/components/champion-matchups-tab";

type SpellInfo = {
  id: string
  name: string
  description: string
  tooltip?: string
  cooldown?: number[]
  cost?: number[]
  costType?: string
  maxrank?: number
  image: { full: string }
}

type PassiveInfo = {
  name: string
  description: string
  image: { full: string }
}

type ChampInfo = {
  id: string
  key: string
  name: string
  title: string
  tags: string[]
  lore?: string
  blurb?: string
  allytips?: string[]
  enemytips?: string[]
  info?: { attack: number; defense: number; magic: number; difficulty: number }
  image: { full: string }
  stats?: Record<string, number>
  spells?: SpellInfo[]
  passive?: PassiveInfo
  skins?: { id: string; num: number; name: string }[]
  partype?: string
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

const validTabs = ["overview", "statistics", "items", "matchups", "pros"] as const

export default function ChampionDetailPage() {
  const { champId, tab } = useParams<{ champId: string; tab?: string }>()
  const navigate = useNavigate()
  const activeTab = validTabs.includes(tab as any) ? tab! : "overview"
  const [patch, setPatch] = useState("15.13.1")
  const [champ, setChamp] = useState<ChampInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [matchupsLoading, setMatchupsLoading] = useState(false)
  const [matchupsError, setMatchupsError] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)

  const [keyToId, setKeyToId] = useState<Record<string, string>>({})

  const keyToIdSafe = (k: number | string) => keyToId[String(k)] || String(k)

  // helpers immagini ora accettano key e risolvono id
  const opponentIdFromKey = (k: number) => keyToIdSafe(k)
  const opponentIcon = (k: number) =>
    `https://cdn2.loldata.cc/16.1.1/img/champion/${opponentIdFromKey(k)}.png`

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

  //set title
  useEffect(() => {
    const defaultTitle = "lolData";

    if (champ?.name) {
      document.title = `${champ.name} - lolData`;
    } else {
      document.title = defaultTitle;
    }

    return () => {
      document.title = defaultTitle;
    };
  }, [champ?.name]);

  // fetch champion data (case-insensitive URL support)
  useEffect(() => {
    if (!champId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    // Try direct fetch first (fast path for correct casing)
    fetch(`https://cdn2.loldata.cc/16.1.1/data/en_US/champion/${champId}.json`)
      .then(r => {
        if (!r.ok) throw new Error("not_found")
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const key = Object.keys(data?.data ?? {})[0]
        const c = key ? data.data[key] as ChampInfo : null
        setChamp(c)
        setLoading(false)
      })
      .catch(async () => {
        if (cancelled) return
        // Case mismatch — fetch full list to find correct ID
        try {
          const listRes = await fetch(`https://cdn2.loldata.cc/16.1.1/data/en_US/champion.json`)
          if (!listRes.ok) throw new Error("Failed to load champion list")
          const listData = await listRes.json()
          const champKeys = Object.keys(listData?.data ?? {})
          const match = champKeys.find(k => k.toLowerCase() === champId.toLowerCase())
          if (match && match !== champId) {
            // Redirect to correct casing
            navigate(`/champions/${match}`, { replace: true })
            return
          }
          if (match) {
            // Fetch with correct ID
            const res = await fetch(`https://cdn2.loldata.cc/16.1.1/data/en_US/champion/${match}.json`)
            if (!res.ok) throw new Error("Failed to load champion")
            const data = await res.json()
            if (cancelled) return
            const key = Object.keys(data?.data ?? {})[0]
            setChamp(key ? data.data[key] as ChampInfo : null)
          } else {
            setError("Champion not found")
          }
        } catch (e: any) {
          if (!cancelled) setError(e?.message ?? "Error")
        }
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champId, patch])

  const splashUrl = useMemo(() => {
    if (!champId) return ""
    // splash
    return `https://cdn.loldata.cc/15.13.1/img/champion/${normalizeChampSplash(champId)}_0.jpg`
  }, [champId])

  const iconUrl = useMemo(() => {
    if (!champ) return ""
    return `https://cdn2.loldata.cc/16.1.1/img/champion/${champ.image.full}`
  }, [champ])

  if (!champId) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-neutral-300">Champion non specificato.</p>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-dvh w-full" />
  }

  if (error || !champ) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-red-400">Errore: {error ?? "Champion non trovato."}</p>
      </div>
    )
  }

  return (
    <main className="min-h-dvh w-full">
      {/* Hero — full-width splash */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 h-[360px] overflow-hidden -mt-6 mb-4">
        <img
          src={splashUrl || "/placeholder.svg"}
          alt={`${champ.name} splash`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: `center ${splashPositionMap[champId ?? ""] || "15%"}` }}
          loading="eager"
          decoding="async"
          draggable={false}
        />
        {/* Overlays */}
        <div className="absolute inset-0 bg-liquirice/60" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[2]"
          style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)" }} />
        <div className="absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.85)_100%)]" />
        <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" />

        {/* Content — aligned to the center container width */}
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center">
          <div className="w-full xl:w-[65%] min-[2560px]:w-[55%]">
            <div className="flex items-center gap-4">
              <img
                src={iconUrl || "/placeholder.svg"}
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
        </div>
      </div>

      {/* Body */}
      <Tabs value={activeTab} onValueChange={(v) => navigate(`/champions/${champId}/${v}`, { replace: true })}>
        {/* Cyber tab bar */}
        <div className="relative mb-6 overflow-x-auto overflow-y-hidden scrollbar-none">
          <TabsList className="bg-transparent p-0 gap-0 flex justify-start border-b border-flash/[0.06] min-w-0 w-max sm:w-full">
            {[
              { value: "overview", label: "Overview" },
              { value: "statistics", label: "Statistics" },
              { value: "items", label: "Items" },
              { value: "matchups", label: "Matchups" },
              { value: "pros", label: "Pros" },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="
                  relative px-3 sm:px-5 py-3 rounded-none whitespace-nowrap
                  font-mono text-[11px] tracking-[0.15em] uppercase
                  text-flash/30 hover:text-flash/60
                  transition-colors duration-200
                  data-[state=active]:text-jade
                  data-[state=active]:bg-transparent
                  data-[state=active]:shadow-none
                  cursor-pointer
                "
              >
                {label}
                {/* Sliding underline — shared layoutId animates between tabs */}
                {activeTab === value && (
                  <motion.div
                    layoutId="champ-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="space-y-4">
          <TabsContent value="overview">
            <ChampOverview champ={champ} />
          </TabsContent>
          <TabsContent value="statistics">
            {Object.keys(keyToId).length === 0 ? (
              <div className="text-neutral-400">LOADING CHAMPIONS…</div>
            ) : (
              <ChampionStats champ={champ} patch={patch} keyToId={keyToId} />
            )}
          </TabsContent>
<TabsContent value="matchups">
            {Object.keys(keyToId).length === 0 ? (
              <div className="text-neutral-400">LOADING CHAMPIONS…</div>
            ) : (
              <ChampionMatchupsTab champ={champ} patch={patch} keyToId={keyToId} />
            )}
          </TabsContent>
          <TabsContent value="items">
            <div className="">
              <ChampionItemsTab champ={champ} patch={patch} />
            </div>
          </TabsContent>
          <TabsContent value="pros">
            {champ && (
              <ChampionOtpRanking championName={champ.id} latestPatch={patch} />
            )}
          </TabsContent>


        </div>
      </Tabs>

      {/* Cyber scroll-to-top */}
      <div
        className={cn(
          "fixed bottom-10 right-10 z-50 flex flex-col items-center gap-2",
          "transition-all duration-300 ease-in-out",
          showScrollTop ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-3"
        )}
      >
        <button
          aria-label="Scroll to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group relative w-11 h-11 cursor-pointer"
        >
          <span className={cn(
            "absolute inset-0 rotate-45 rounded-[4px] border transition-all duration-300",
            "bg-black/60 border-jade/40",
            "group-hover:border-jade/80 group-hover:bg-jade/10",
            "group-hover:shadow-[0_0_18px_rgba(0,217,146,0.35),inset_0_0_8px_rgba(0,217,146,0.08)]",
            "shadow-[0_0_8px_rgba(0,217,146,0.15)]"
          )}>
            <span
              className="absolute inset-0 rounded-[3px] opacity-20 group-hover:opacity-30 transition-opacity duration-300"
              style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.5) 3px, rgba(0,217,146,0.5) 4px)" }}
            />
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 10 6" className="w-3 h-3 text-jade transition-transform duration-300 group-hover:-translate-y-[2px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1,5 5,1 9,5" />
            </svg>
          </span>
        </button>
        <span className="font-mono text-[8px] tracking-[0.2em] text-jade/50 uppercase select-none">TOP</span>
      </div>

    </main>
  )
}

// ── Champion Overview Component ──

const ABILITY_KEYS = ["P", "Q", "W", "E", "R"] as const
const STAT_LABELS: Record<string, string> = {
  hp: "Health", hpperlevel: "HP / Lvl", mp: "Mana", mpperlevel: "MP / Lvl",
  armor: "Armor", armorperlevel: "Armor / Lvl", spellblock: "Magic Resist", spellblockperlevel: "MR / Lvl",
  attackdamage: "Attack Damage", attackdamageperlevel: "AD / Lvl",
  attackspeed: "Attack Speed", attackspeedperlevel: "AS / Lvl",
  movespeed: "Move Speed", attackrange: "Attack Range",
  hpregen: "HP Regen", hpregenperlevel: "HP Regen / Lvl",
  mpregen: "MP Regen", mpregenperlevel: "MP Regen / Lvl",
  crit: "Crit", critperlevel: "Crit / Lvl",
}
const STAT_ORDER = ["hp", "hpperlevel", "mp", "mpperlevel", "armor", "armorperlevel", "spellblock", "spellblockperlevel", "attackdamage", "attackdamageperlevel", "attackspeed", "attackspeedperlevel", "movespeed", "attackrange", "hpregen", "hpregenperlevel", "mpregen", "mpregenperlevel"]

function ChampOverview({ champ }: { champ: ChampInfo }) {
  const [selectedAbility, setSelectedAbility] = useState(0) // 0=P, 1=Q, 2=W, 3=E, 4=R

  const abilities = [
    champ.passive ? { key: "P", name: champ.passive.name, description: champ.passive.description, image: champ.passive.image.full, cooldown: null, cost: null } : null,
    ...(champ.spells ?? []).map((s, i) => ({
      key: ABILITY_KEYS[i + 1],
      name: s.name,
      description: s.description,
      image: s.image.full,
      cooldown: s.cooldown,
      cost: s.cost,
    })),
  ].filter(Boolean) as { key: string; name: string; description: string; image: string; cooldown: number[] | null; cost: number[] | null }[]

  const active = abilities[selectedAbility] ?? abilities[0]

  // Strip HTML tags from description
  const cleanDesc = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

  return (
    <div className="space-y-5">
      {/* ── Lore ── */}
      <div>
        <SectionTitle>Lore</SectionTitle>
        <p className="text-[13px] text-flash/65 leading-[1.75] mt-2">
          {champ.lore || "No lore available."}
        </p>
      </div>

      {/* ── Abilities — all displayed as stacked cards ── */}
      <div>
        <SectionTitle>Abilities</SectionTitle>
        <div className="mt-2 space-y-1.5">
          {abilities.map((ab, idx) => (
            <motion.div
              key={ab.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.25 }}
              className={cn(
                "group relative flex items-start gap-3 py-2 px-3 rounded-sm cursor-custom transition-all duration-200",
                "bg-white/[0.02] hover:bg-white/[0.05]",
                "ring-1 ring-white/[0.04] hover:ring-jade/20",
              )}
              onClick={() => setSelectedAbility(idx)}
            >
              {/* Left accent */}
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm transition-colors duration-200",
                selectedAbility === idx ? "bg-jade" : "bg-white/[0.06] group-hover:bg-jade/30"
              )} />

              {/* Icon */}
              <div className="relative shrink-0 ml-2">
                <img
                  src={ab.key === "P"
                    ? `${CDN_BASE_URL}/img/passive/${ab.image}`
                    : `${CDN_BASE_URL}/img/spell/${ab.image}`
                  }
                  alt={ab.name}
                  className={cn(
                    "w-9 h-9 rounded-sm object-cover transition-all duration-200",
                    selectedAbility === idx
                      ? "ring-2 ring-jade/40 shadow-[0_0_12px_rgba(0,217,146,0.15)]"
                      : "ring-1 ring-white/10 group-hover:ring-white/20"
                  )}
                />
                <span className={cn(
                  "absolute -top-1.5 -left-1.5 text-[9px] font-mono font-black px-1.5 py-0.5 rounded-[2px] leading-none",
                  selectedAbility === idx
                    ? "bg-jade text-black"
                    : "bg-flash/15 text-flash/50"
                )}>
                  {ab.key}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "text-[13px] font-mono font-semibold transition-colors duration-200",
                  selectedAbility === idx ? "text-jade" : "text-flash/80 group-hover:text-flash"
                )}>
                  {ab.name}
                </h4>

                {/* Cooldown + Cost badges */}
                {(ab.cooldown || ab.cost) && (
                  <div className="flex items-center gap-3 mt-1">
                    {ab.cooldown && ab.cooldown.some(v => v > 0) && (
                      <span className="text-[11px] font-mono text-flash/35">
                        CD: <span className="text-flash/60">{[...new Set(ab.cooldown)].join(" / ")}s</span>
                      </span>
                    )}
                    {ab.cost && ab.cost.some(v => v > 0) && (
                      <span className="text-[11px] font-mono text-flash/35">
                        Cost: <span className="text-sky-400/60">{[...new Set(ab.cost)].join(" / ")}</span>
                      </span>
                    )}
                  </div>
                )}

                <p className="text-[12px] text-flash/50 leading-[1.6] mt-1.5">
                  {cleanDesc(ab.description)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Base Stats ── */}
      {champ.stats && (
        <div>
          <SectionTitle>Base Stats</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-0">
            {STAT_ORDER.filter(k => champ.stats![k] !== undefined && !k.includes("perlevel")).map(k => (
              <div key={k} className="flex justify-between items-center py-1.5 border-b border-white/[0.04]">
                <span className="text-[12px] font-mono text-flash/35">{STAT_LABELS[k] ?? k}</span>
                <span className="text-[13px] font-mono text-flash/75 font-semibold tabular-nums">{champ.stats![k]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Playstyle bars ── */}
      {champ.info && (
        <div>
          <SectionTitle>Playstyle</SectionTitle>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {(["attack", "defense", "magic", "difficulty"] as const).map(stat => {
              const val = champ.info![stat]
              return (
                <div key={stat} className="rounded-sm bg-white/[0.03] ring-1 ring-white/[0.05] p-4 text-center">
                  <div className="text-[22px] font-mono font-bold text-jade tabular-nums">{val}</div>
                  <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/35 mt-1 capitalize">{stat}</div>
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${val * 10}%` }}
                      transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-jade to-jade/40"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tips ── */}
      {((champ.allytips?.length ?? 0) > 0 || (champ.enemytips?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {champ.allytips && champ.allytips.length > 0 && (
            <div>
              <SectionTitle>Playing as {champ.name}</SectionTitle>
              <ul className="mt-3 space-y-2">
                {champ.allytips.map((tip, i) => (
                  <li key={i} className="text-[13px] text-flash/55 leading-relaxed flex gap-2">
                    <span className="text-jade shrink-0 mt-0.5">{">"}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {champ.enemytips && champ.enemytips.length > 0 && (
            <div>
              <SectionTitle>Playing against {champ.name}</SectionTitle>
              <ul className="mt-3 space-y-2">
                {champ.enemytips.map((tip, i) => (
                  <li key={i} className="text-[13px] text-red-400/60 leading-relaxed flex gap-2">
                    <span className="text-red-400/70 shrink-0 mt-0.5">{">"}</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Resource ── */}
      {champ.partype && (
        <div className="text-[11px] font-mono text-flash/30 tracking-[0.15em] uppercase">
          Resource: <span className="text-flash/40">{champ.partype}</span>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/50">{children}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-jade/15 to-transparent" />
    </div>
  )
}
