'use client';

// src/pages/champion-detail-page.tsx
import React, { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { cdnBaseUrl, cdnSplashUrl, getCdnVersion } from "@/config"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Champion stats are read from the match-data box (api2) — see config BOX_API_BASE_URL.
import { BOX_API_BASE_URL as API_BASE_URL, normalizeChampSplash } from "@/config"
import splashPositionMap from "@/converters/splashPositionMap"
import { ChampionOtpRanking } from "@/components/champion-otp-ranking";
import { ChampionMatchupsTab } from "@/components/champion-matchups-tab"
import ChampionDuosTab from "@/components/champion-duos-tab"
import ChampionBuildTab from "@/components/champion-build-tab"
import { useSeo } from "@/hooks/useSeo";
import { GuidesTab } from "@/components/guide/guides-tab";
import { useAuth } from "@/context/authcontext";
import { DiamondButton } from "@/components/ui/diamond-button";
import { supabase } from "@/lib/supabaseClient";

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

const fmtCompact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n)

function HeroStat({ label, value, tone = "flash" }: { label: string; value: string; tone?: "jade" | "red" | "flash" }) {
  const color = tone === "jade" ? "text-jade" : tone === "red" ? "text-[#ff6286]" : "text-flash"
  return (
    <div className="flex flex-col">
      <span
        className={cn("font-chakrapetch text-[20px] sm:text-[24px] font-bold leading-none tabular-nums", color)}
        style={tone === "jade" ? { textShadow: "0 0 24px rgba(0,217,146,0.35)" } : undefined}
      >
        {value}
      </span>
      <span className="mt-1 font-jetbrains text-[9px] uppercase tracking-[0.18em] text-flash/40">{label}</span>
    </div>
  )
}

// Meta-tier colours (current-patch tier list)
function tierColor(tier?: string | null): string {
  switch ((tier ?? "").toUpperCase()) {
    case "S": return "#FFB615" // citrine
    case "A": return "#00d992" // jade
    case "B": return "#36c5f0" // cyan
    case "C": return "#d7d8d9" // flash
    case "D": return "#ff6286" // red
    default: return "#d7d8d9"
  }
}
const ROLE_SHORT: Record<string, string> = { TOP: "TOP", JUNGLE: "JGL", MIDDLE: "MID", BOTTOM: "ADC", UTILITY: "SUP" }
function HeroTier({ tier, role }: { tier?: string | null; role?: string | null }) {
  const c = tierColor(tier)
  return (
    <div className="flex flex-col" title={role ? `Current meta tier in ${role}` : "Current meta tier"}>
      <span
        className="font-chakrapetch text-[20px] sm:text-[24px] font-bold leading-none"
        style={{ color: c, textShadow: tier ? `0 0 24px ${c}59` : undefined }}
      >
        {tier ? `${tier}` : "—"}
      </span>
      <span className="mt-1 font-jetbrains text-[9px] uppercase tracking-[0.18em] text-flash/40">
        {role && ROLE_SHORT[role] ? `Tier · ${ROLE_SHORT[role]}` : "Tier"}
      </span>
    </div>
  )
}

const validTabs = ["overview", "build", "duos", "counters", "guides", "pros"] as const

export default function ChampionDetailPage() {
  const { champId, tab, guideId } = useParams<{ champId: string; tab?: string; guideId?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const vsParam = searchParams.get("vs")
  const activeTab = guideId ? "guides" : (validTabs.includes(tab as any) ? tab! : "overview")
  const [patch, setPatch] = useState("15.13.1")
  const [champ, setChamp] = useState<ChampInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [heroStats, setHeroStats] = useState<{ winrate: number; pickrate: number; games: number; kda?: { kills: number; deaths: number; assists: number }; tier?: string | null; tierRole?: string | null; tierRank?: number | null } | null>(null)

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const [vsOpponent, setVsOpponentState] = useState<{ championId: number; name: string; role?: string } | null>(null)
  const { session } = useAuth()
  const [activeGuide, setActiveGuide] = useState<{ title: string; author: string; authorId: string; guideId: string; views: number; upvotes: number; discord?: string | null; twitter?: string | null; reddit?: string | null } | null>(null)
  const guideEditRef = React.useRef<(() => void) | null>(null)
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0)
  const currentGuideId = activeGuide?.guideId ?? null

  // Load user's existing vote when guide ID changes
  useEffect(() => {
    if (!currentGuideId || !session?.user?.id) { setUserVote(0); return }
    // Supabase's query builder returns a PromiseLike (not a real Promise) so
    // we can't chain .catch. Errors come back in `data`/`error` instead.
    supabase.from("guide_votes").select("vote").eq("guide_id", currentGuideId).eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => setUserVote(data?.vote ?? 0))
  }, [currentGuideId, session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = async (dir: 1 | -1) => {
    if (!session?.user) { navigate("/login"); return }
    if (!activeGuide) return
    const newVote = userVote === dir ? 0 : dir
    const prevVote = userVote
    setUserVote(newVote)
    // Optimistic update on displayed count
    setActiveGuide(prev => prev ? { ...prev, upvotes: prev.upvotes + newVote - prevVote } : prev)
    // Upsert vote
    if (newVote === 0) {
      await supabase.from("guide_votes").delete().eq("guide_id", activeGuide.guideId).eq("user_id", session.user.id)
    } else {
      await supabase.from("guide_votes").upsert({ guide_id: activeGuide.guideId, user_id: session.user.id, vote: newVote }, { onConflict: "guide_id,user_id" })
    }
    // Update guide upvotes count
    await supabase.rpc("recalc_guide_upvotes", { gid: activeGuide.guideId })
  }
  const setVsOpponent = (opp: { championId: number; name: string; role?: string } | null) => {
    setVsOpponentState(opp)
    if (opp) {
      searchParams.set("vs", opp.name)
      setSearchParams(searchParams, { replace: true })
    } else {
      searchParams.delete("vs")
      setSearchParams(searchParams, { replace: true })
    }
  }
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [matchupsLoading, setMatchupsLoading] = useState(false)
  const [matchupsError, setMatchupsError] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)

  const [keyToId, setKeyToId] = useState<Record<string, string>>({})
  const [champDataMap, setChampDataMap] = useState<Record<string, { title: string; tags: string[] }>>({})

  const keyToIdSafe = (k: number | string) => keyToId[String(k)] || String(k)

  // helpers immagini ora accettano key e risolvono id
  const opponentIdFromKey = (k: number) => keyToIdSafe(k)
  const opponentIcon = (k: number) =>
    `${cdnBaseUrl()}/img/champion/${opponentIdFromKey(k)}.png`

  //retrieve matchup
  useEffect(() => {
    let cancelled = false
    // elenco completo champion per costruire le mappe
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then(r => r.json())
      .then((all) => {
        if (cancelled) return
        const k2i: Record<string, string> = {}
        const cdm: Record<string, { title: string; tags: string[] }> = {}
        Object.values(all.data || {}).forEach((ch: any) => {
          k2i[ch.key] = ch.id
          cdm[ch.id] = { title: ch.title ?? "", tags: ch.tags ?? [] }
        })
        setKeyToId(k2i)
        setChampDataMap(cdm)
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
    setPatch(getCdnVersion())
  }, [])

  // per-tab SEO — unique title / meta / canonical per /champions/:id/:tab URL
  const seoName = champ?.name ?? champId ?? "Champion"
  const isSup = champ?.tags?.includes("Support")
  const isAdc = champ?.tags?.includes("Marksman")
  const duoLabel = isSup ? "ADC Duos" : isAdc ? "Supports" : "Duos"
  const seoMeta =
    activeTab === "duos"
      ? { t: `Best ${duoLabel} for ${seoName} — Patch ${patch} | lolData`, d: `The best ${isSup ? "ADC carries" : isAdc ? "supports" : "duo partners"} to pair with ${seoName} in Patch ${patch}, ranked by confidence-weighted win rate from millions of ranked games.` }
      : activeTab === "build"
      ? { t: `${seoName} Build — Best Items & Runes — Patch ${patch} | lolData`, d: `The best build, items and runes for ${seoName} in Patch ${patch}, from millions of ranked games.` }
      : activeTab === "counters"
      ? { t: `${seoName} Counters & Best Matchups — Patch ${patch} | lolData`, d: `${seoName} counters and best / worst lane matchups in Patch ${patch}.` }
      : { t: `${seoName} Build, Runes, Duos & Counters — Patch ${patch} | lolData`, d: `${seoName} guide: best build, runes, items, duos and counters from ranked games — Patch ${patch}.` }
  useSeo({
    title: seoMeta.t,
    description: seoMeta.d,
    canonical: activeTab === "overview" ? `/champions/${champId}` : `/champions/${champId}/${activeTab}`,
  })

  // fetch champion data (case-insensitive URL support)
  useEffect(() => {
    if (!champId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    // Try direct fetch first (fast path for correct casing)
    fetch(`${cdnBaseUrl()}/data/en_US/champion/${champId}.json`)
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
          const listRes = await fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
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
            const res = await fetch(`${cdnBaseUrl()}/data/en_US/champion/${match}.json`)
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

  // Hero key stats — real champion winrate / pickrate / games (aggregate).
  useEffect(() => {
    if (!champ?.key) return
    let cancelled = false
    setHeroStats(null)
    fetch(`${API_BASE_URL}/api/champion/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ championId: Number(champ.key) }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (cancelled || !d?.core) return
        setHeroStats({
          // live aggregate across ALL roles (winrate/games/KDA = all the champion's
          // box games; pickrate = current patch). Falls back to the per-role
          // snapshot sample if the backend hasn't been updated yet.
          winrate: Number(d.totalWinrate ?? d.core.winrate) || 0,
          pickrate: Number(d.totalPickrate ?? d.core.pickrate) || 0,
          games: Number(d.totalGames ?? d.core.gamesAnalyzed) || 0,
          kda: d.totalKda ?? d.core.avgKDA,
          tier: d.metaTier ?? null,
          tierRole: d.metaTierRole ?? null,
          tierRank: d.metaTierRank ?? null,
        })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [champ?.key])

  const splashUrl = useMemo(() => {
    if (!champId) return ""
    // splash
    return cdnSplashUrl(normalizeChampSplash(champId))
  }, [champId])

  const iconUrl = useMemo(() => {
    if (!champ) return ""
    return `${cdnBaseUrl()}/img/champion/${champ.image.full}`
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
      <style>{`
        @keyframes morphIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.95); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes morphOut {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-6px); }
        }
      `}</style>
      {/* Hero — cinematic splash in the homepage's #040A0C language. Sits flush
          at the top (mt-0) so it slides up under the floating, transparent
          navbar — see RootLayout's isChampDetail treatment. */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 h-[420px] overflow-hidden mb-6 bg-[#040A0C]">
        {/* splash, anchored right so the copy reads on solid bg at the left */}
        <img
          src={splashUrl || "/placeholder.svg"}
          alt={`${champ.name} splash`}
          className="absolute inset-y-0 right-0 h-full w-full md:w-[74%] object-cover"
          style={{ objectPosition: `center ${splashPositionMap[champId ?? ""] || "15%"}` }}
          loading="eager"
          decoding="async"
          draggable={false}
        />
        {/* horizontal scrim: solid #040A0C on the left, clearing toward the splash */}
        <div className="absolute inset-0 z-[2] pointer-events-none"
          style={{ background: "linear-gradient(90deg, #040A0C 30%, rgba(4,10,12,0.86) 48%, rgba(4,10,12,0.30) 72%, rgba(4,10,12,0) 100%)" }} />
        {/* faint jade dot-grid, masked under the copy (echoes the homepage) */}
        <div aria-hidden className="absolute inset-0 z-[2] pointer-events-none opacity-[0.06] [background-image:radial-gradient(rgba(0,217,146,0.7)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_28%_62%,black_5%,transparent_60%)] [-webkit-mask-image:radial-gradient(ellipse_at_28%_62%,black_5%,transparent_60%)]" />
        {/* breathing jade glow behind the copy */}
        <div aria-hidden className="absolute inset-0 z-[1] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 40% 62% at 16% 62%, rgba(0,217,146,0.10) 0%, transparent 70%)" }} />
        {/* top/bottom fades into the page */}
        <div className="absolute top-0 inset-x-0 h-20 pointer-events-none z-[3] bg-gradient-to-b from-[#040A0C] to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none z-[3] bg-gradient-to-t from-[#040A0C] to-transparent" />

        {/* Content — aligned to the center container width */}
        <div className="absolute bottom-4 inset-x-0 z-10 flex justify-center">
          <div className="w-full xl:w-[65%] min-[2560px]:w-[55%]">
            {vsOpponent ? (
              /* VS Layout */
              <div className="flex items-center justify-between">
                {/* Left — our champion */}
                <div className="flex items-center gap-4">
                  <img
                    src={iconUrl || "/placeholder.svg"}
                    alt={champ.name}
                    className="h-14 w-14 rounded-md object-cover ring-1 ring-jade/30"
                  />
                  <div>
                    {vsOpponent?.role && (
                      <p className="text-[10px] text-jade/40 font-mono uppercase tracking-[0.2em] mb-0.5">{vsOpponent.role}</p>
                    )}
                    <h1 className="text-xl font-semibold text-white">{champ.name}</h1>
                    <p className="text-xs text-white/50">{champ.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {champ.tags?.map(t => (
                        <span key={t} className="rounded bg-jade/10 px-1.5 py-0.5 text-[10px] text-jade/60 font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center — VS */}
                <div className="flex flex-col items-center px-6">
                  <span
                    className="text-[32px] font-bold tracking-[0.2em] text-jade/50"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      textShadow: "0 0 30px rgba(0,217,146,0.3), 0 0 60px rgba(0,217,146,0.1)",
                    }}
                  >
                    VS
                  </span>
                </div>

                {/* Right — opponent (mirrored) */}
                {(() => {
                  const oppData = champDataMap[vsOpponent.name]
                  return (
                    <div className="flex items-center gap-4 flex-row-reverse">
                      <img
                        src={`${cdnBaseUrl()}/img/champion/${vsOpponent.name}.png`}
                        alt={vsOpponent.name}
                        className="h-14 w-14 rounded-md object-cover ring-1 ring-red-400/30"
                      />
                      <div className="text-right">
                        {vsOpponent.role && (
                          <p className="text-[10px] text-red-400/40 font-mono uppercase tracking-[0.2em] mb-0.5">{vsOpponent.role}</p>
                        )}
                        <h2 className="text-xl font-semibold text-white">{vsOpponent.name}</h2>
                        {oppData?.title && (
                          <p className="text-xs text-white/50">{oppData.title}</p>
                        )}
                        {oppData?.tags && oppData.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5 justify-end">
                            {oppData.tags.map(t => (
                              <span key={t} className="rounded bg-red-400/10 px-1.5 py-0.5 text-[10px] text-red-400/50 font-mono">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              /* Normal Layout — morphs when viewing a guide */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img
                    src={iconUrl || "/placeholder.svg"}
                    alt={`${champ.name} icon`}
                    className="h-16 w-16 rounded-lg object-cover ring-1 ring-jade/25 shadow-[0_0_34px_-10px_rgba(0,217,146,0.55)]"
                  />
                  <div>
                    <h1 className={cn("font-chakrapetch font-bold text-flash leading-[0.98] tracking-tight transition-all duration-500 ease-out", activeGuide ? "text-2xl" : "text-[clamp(30px,4vw,46px)]")} key={activeGuide ? "guide" : "champ"}>
                      <span style={{ display: "inline-block", animation: activeGuide ? "morphIn 0.4s ease-out" : undefined }}>
                        {activeGuide ? activeGuide.title : champ.name}
                      </span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm transition-all duration-500 ease-out" key={activeGuide ? "guide-author" : "champ-title"}>
                      <span style={{ display: "inline-block", animation: activeGuide ? "morphIn 0.4s ease-out 0.05s both" : undefined }}
                        className={activeGuide ? "text-jade/60" : "text-white/70"}>
                        {activeGuide ? `by ${activeGuide.author}` : champ.title}
                      </span>
                      {!activeGuide && (champ.tags?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-2">
                          <span className="text-jade/40">·</span>
                          <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.28em] text-jade/75">
                            {champ.tags!.join(" · ")}
                          </span>
                        </span>
                      )}
                      {activeGuide && (activeGuide.discord || activeGuide.twitter || activeGuide.reddit) && (
                        <span className="flex items-center gap-2.5 ml-2" style={{ animation: "morphIn 0.4s ease-out 0.15s both" }}>
                          {activeGuide.discord && (
                            <span className="text-flash/30 hover:text-[#5865F2] transition-colors cursor-pointer" title={activeGuide.discord}>
                              <svg viewBox="0 0 127.14 96.36" className="w-[18px] h-[14px]" fill="currentColor">
                                <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53.05s5-12.68 11.45-12.68S54 46.05 53.89 53.05 48.84 65.69 42.45 65.69zm42.24 0C78.41 65.69 73.25 60 73.25 53.05s5-12.68 11.44-12.68S96.23 46.05 96.12 53.05 91.08 65.69 84.69 65.69z"/>
                              </svg>
                            </span>
                          )}
                          {activeGuide.twitter && (
                            <a href={`https://x.com/${activeGuide.twitter.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer"
                              className="text-flash/30 hover:text-white transition-colors">
                              <svg viewBox="0 0 24 24" className="w-[14px] h-[14px]" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                            </a>
                          )}
                          {activeGuide.reddit && (
                            <a href={`https://reddit.com/user/${activeGuide.reddit.replace(/^u\//, "")}`} target="_blank" rel="noopener noreferrer"
                              className="text-flash/30 hover:text-[#FF4500] transition-colors">
                              <svg viewBox="0 0 20 20" className="w-[18px] h-[18px]" fill="currentColor">
                                <path d="M15.8 4.8c.7 0 1.2.6 1.2 1.2s-.6 1.2-1.2 1.2c-.4 0-.7-.2-.9-.5l-2.1-.4-.7 3.4c1.7.1 3.2.6 4.3 1.4.3-.3.7-.5 1.1-.5.9 0 1.6.7 1.6 1.6 0 .6-.3 1.1-.8 1.4v.4c0 2.5-2.9 4.5-6.4 4.5s-6.4-2-6.4-4.5v-.4c-.5-.3-.8-.8-.8-1.4 0-.9.7-1.6 1.6-1.6.4 0 .8.2 1.1.5 1.1-.8 2.6-1.3 4.2-1.4l.8-3.8c0-.1.1-.2.1-.2h.2l2.4.5c.2-.4.6-.7 1.1-.7zM7 11.4c-.6 0-1.1.5-1.1 1.1s.5 1.1 1.1 1.1 1.1-.5 1.1-1.1-.5-1.1-1.1-1.1zm5 3.3c-.5.5-1.4.7-2 .7s-1.5-.2-2-.7c-.1-.1-.1-.3 0-.4.1-.1.3-.1.4 0 .4.4 1 .6 1.6.6s1.2-.2 1.6-.6c.1-.1.3-.1.4 0 .1.1.1.3 0 .4zm-.1-2.2c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1 1.1.5 1.1 1.1-.5 1.1-1.1 1.1z"/>
                              </svg>
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                    {!activeGuide && (
                      <div className="mt-3 flex items-center gap-5">
                        <HeroStat label="Win Rate" value={heroStats ? `${heroStats.winrate.toFixed(1)}%` : "—"} tone={heroStats ? (heroStats.winrate >= 51 ? "jade" : heroStats.winrate < 49 ? "red" : "flash") : "flash"} />
                        <span className="h-7 w-px bg-flash/10" />
                        <HeroStat label="Pick Rate" value={heroStats ? `${heroStats.pickrate.toFixed(1)}%` : "—"} />
                        <span className="h-7 w-px bg-flash/10" />
                        <HeroStat label="Games" value={heroStats ? fmtCompact(heroStats.games) : "—"} />
                        {heroStats?.kda && (
                          <>
                            <span className="h-7 w-px bg-flash/10" />
                            <HeroStat label="KDA" value={`${((heroStats.kda.kills + heroStats.kda.assists) / Math.max(1, heroStats.kda.deaths)).toFixed(2)}`} />
                          </>
                        )}
                        <span className="h-7 w-px bg-flash/10" />
                        <HeroTier tier={heroStats?.tier} role={heroStats?.tierRole} />
                      </div>
                    )}
                  </div>
                </div>
                {/* Guide stats — upvotes & views */}
                {activeGuide && (
                  <div className="flex items-center gap-3" style={{ animation: "morphIn 0.4s ease-out 0.1s both" }}>
                    <div className="flex flex-col items-center gap-1 w-[60px] py-1.5 rounded-sm border border-jade/[0.15] bg-jade/[0.03]">
                      <span className="text-[16px] font-orbitron font-bold text-jade/70 tabular-nums">{activeGuide.upvotes}</span>
                      <span className="text-[7px] font-mono text-jade/30 uppercase tracking-[0.2em]">UPVOTES</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 w-[60px] py-1.5 rounded-sm border border-flash/[0.08] bg-filmdark/30">
                      <span className="text-[16px] font-orbitron font-bold text-flash/70 tabular-nums">{activeGuide.views}</span>
                      <span className="text-[7px] font-mono text-flash/25 uppercase tracking-[0.2em]">VIEWS</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveGuide(null); navigate(`/champions/${champId}/${v}`, { replace: true }) }}>
        {/* Cyber tab bar */}
        <div className="relative mb-6 overflow-x-auto overflow-y-hidden scrollbar-none">
          <TabsList className="bg-transparent p-0 gap-0 flex justify-start border-b border-flash/[0.06] min-w-0 w-max sm:w-full">
            {[
              { value: "overview", label: "Overview" },
              { value: "build", label: "Build" },
              { value: "duos", label: "Duos" },
              { value: "counters", label: "Matchups" },
              { value: "pros", label: "OTPs" },
              { value: "guides", label: "Guides" },
            ].map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="
                  relative px-3 sm:px-5 py-3 rounded-none whitespace-nowrap
                  font-chakrapetch text-[11px] font-bold tracking-[0.2em] uppercase
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
<TabsContent value="counters">
            {Object.keys(keyToId).length === 0 ? (
              <div className="text-neutral-400">LOADING CHAMPIONS…</div>
            ) : (
              <ChampionMatchupsTab champ={champ} patch={patch} keyToId={keyToId} />
            )}
          </TabsContent>
          <TabsContent value="build">
            <ChampionBuildTab champ={champ} patch={patch} />
          </TabsContent>
          <TabsContent value="duos">
            <ChampionDuosTab champ={champ} patch={patch} />
          </TabsContent>
          <TabsContent value="guides">
            {champ && <GuidesTab championId={champ.id} initialGuideId={guideId} editRef={guideEditRef} onGuideView={(g) => setActiveGuide(g ? { title: g.title, author: g.author_name ?? "Anonymous", authorId: g.author_id, guideId: g.id, views: g.views ?? 0, upvotes: g.upvotes ?? 0, discord: g.author_discord, twitter: g.author_twitter, reddit: g.author_reddit } : null)} />}
          </TabsContent>
          <TabsContent value="pros">
            {champ && (
              <ChampionOtpRanking championName={champ.id} latestPatch={patch} />
            )}
          </TabsContent>


        </div>
      </Tabs>

      {/* Floating bottom-right buttons */}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col items-center gap-3">
        {/* Upvote */}
        {activeGuide && (
          <div className={cn(
            "transition-all duration-300 ease-in-out",
            showScrollTop ? "translate-y-0" : "translate-y-[calc(100%+16px)]"
          )}>
            <DiamondButton
              color={userVote === 1 ? "jade" : undefined}
              icon="upvote"
              label={String(activeGuide.upvotes)}
              onClick={() => handleVote(1)}
            />
          </div>
        )}

        {/* Edit guide button */}
        {activeGuide && session?.user?.id === activeGuide.authorId && (
          <div className={cn(
            "transition-all duration-300 ease-in-out",
            showScrollTop ? "translate-y-0" : "translate-y-[calc(100%+16px)]"
          )}>
            <DiamondButton color="citrine" icon="edit" label="EDIT" onClick={() => guideEditRef.current?.()} />
          </div>
        )}

        {/* Scroll to top */}
        <div className={cn(
          "transition-all duration-300 ease-in-out",
          showScrollTop ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-3"
        )}>
          <DiamondButton icon="top" label="TOP" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        </div>
      </div>

    </main>
  )
}

// ── Champion Overview Component ──

const ABILITY_KEYS = ["P", "Q", "W", "E", "R"] as const

// base stat → per-level pairing for the compact stat grid
const STAT_PAIRS: { key: string; per?: string; label: string }[] = [
  { key: "hp", per: "hpperlevel", label: "Health" },
  { key: "mp", per: "mpperlevel", label: "Mana" },
  { key: "armor", per: "armorperlevel", label: "Armor" },
  { key: "spellblock", per: "spellblockperlevel", label: "Magic Resist" },
  { key: "attackdamage", per: "attackdamageperlevel", label: "Attack Dmg" },
  { key: "attackspeed", per: "attackspeedperlevel", label: "Attack Speed" },
  { key: "hpregen", per: "hpregenperlevel", label: "HP Regen" },
  { key: "mpregen", per: "mpregenperlevel", label: "MP Regen" },
  { key: "movespeed", label: "Move Speed" },
  { key: "attackrange", label: "Range" },
]

// glass panel — the site's main-box surface (no white outline, inset hairline)
function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel",
        "shadow-[0_10px_30px_rgba(var(--c-shadow),0.45),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

function StatChip({ label, value, tone = "jade" }: { label: string; value: string; tone?: "jade" | "sky" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[4px] bg-filmdark/40 px-2 py-1 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.08)]">
      <span className="font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/40">{label}</span>
      <span className={cn("font-jetbrains text-[11px] font-semibold tabular-nums", tone === "sky" ? "text-sky-300/85" : "text-jade/90")}>{value}</span>
    </span>
  )
}

function TipsPanel({ title, tips, tone }: { title: string; tips: string[]; tone: "ally" | "enemy" }) {
  return (
    <Panel className="p-5">
      <SectionTitle tone={tone === "enemy" ? "red" : "jade"}>{title}</SectionTitle>
      <ul className="mt-3.5 space-y-2.5">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-2.5 font-chakrapetch text-[13px] leading-relaxed text-flash/70">
            <span className={cn("mt-px shrink-0 font-bold", tone === "ally" ? "text-jade" : "text-[#ff6286]")}>▸</span>
            {tip}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function ChampOverview({ champ }: { champ: ChampInfo }) {
  const [selectedAbility, setSelectedAbility] = useState(0) // 0=P, 1=Q, 2=W, 3=E, 4=R
  const [loreOpen, setLoreOpen] = useState(false)

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
  const cleanDesc = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  const dedupe = (arr: number[] | null) => (arr ? [...new Set(arr)].join(" / ") : "")
  const iconUrl = (key: string, image: string) =>
    key === "P" ? `${cdnBaseUrl()}/img/passive/${image}` : `${cdnBaseUrl()}/img/spell/${image}`

  return (
    // Two INDEPENDENT column stacks (7/5) — panel heights never couple across
    // columns, so no cell ever stretches to match a taller sibling (no voids).
    <div className="grid items-start gap-4 lg:grid-cols-12">
      {/* ── LEFT stack: abilities + tips ── */}
      <div className="flex flex-col gap-4 lg:col-span-7">
        {abilities.length > 0 && (
          <Panel className="p-5">
            <SectionTitle>Abilities</SectionTitle>
            {/* horizontal icon rail — full panel width */}
            <div className="mt-4 flex items-center gap-2">
              {abilities.map((ab, idx) => {
                const on = idx === selectedAbility
                return (
                  <button key={ab.key} type="button" onClick={() => setSelectedAbility(idx)} className="group relative cursor-clicker" aria-label={ab.name}>
                    <img
                      src={iconUrl(ab.key, ab.image)}
                      alt=""
                      className={cn(
                        "h-12 w-12 rounded-md object-cover transition-all",
                        on ? "ring-2 ring-jade shadow-[0_0_16px_rgba(0,217,146,0.4)]" : "opacity-60 ring-1 ring-hairline/10 group-hover:opacity-100 group-hover:ring-jade/40",
                      )}
                    />
                    <span className={cn("absolute -bottom-1 -right-1 rounded-[2px] px-1 text-[8px] font-black leading-[1.5]", on ? "bg-jade text-black" : "bg-black/80 text-flash/55")}>{ab.key}</span>
                  </button>
                )
              })}
              {/* cooldown / cost chips live on the rail line — no dead corner */}
              <div className="ml-auto hidden flex-wrap justify-end gap-2 sm:flex">
                {active.cooldown && active.cooldown.some((v) => v > 0) && <StatChip label="CD" value={`${dedupe(active.cooldown)}s`} />}
                {active.cost && active.cost.some((v) => v > 0) && <StatChip label="Cost" value={dedupe(active.cost)} tone="sky" />}
              </div>
            </div>
            {/* featured detail — full width under the rail */}
            <motion.div key={active.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="mt-4 min-h-[112px] border-t border-hairline/[0.06] pt-3.5">
              <div className="flex items-center gap-2.5">
                <span className="rounded-[3px] bg-jade px-1.5 py-0.5 font-jetbrains text-[10px] font-black text-black">{active.key}</span>
                <h4 className="font-chakrapetch text-[15px] font-bold uppercase tracking-[0.02em] text-flash">{active.name}</h4>
              </div>
              <p className="mt-2.5 font-chakrapetch text-[13px] leading-[1.65] text-flash/75">{cleanDesc(active.description)}</p>
            </motion.div>
          </Panel>
        )}

        {champ.allytips && champ.allytips.length > 0 && <TipsPanel title={`Playing as ${champ.name}`} tips={champ.allytips} tone="ally" />}
        {champ.enemytips && champ.enemytips.length > 0 && <TipsPanel title={`Playing against ${champ.name}`} tips={champ.enemytips} tone="enemy" />}
      </div>

      {/* ── RIGHT stack: combat profile (meters + base stats) + lore ── */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        {(champ.info || champ.stats) && (
          <Panel className="p-5">
            <SectionTitle>Combat Profile</SectionTitle>

            {/* playstyle meters — compact rows instead of 2×2 tiles */}
            {champ.info && (
              <div className="mt-4 space-y-2.5">
                {(["attack", "defense", "magic", "difficulty"] as const).map((stat) => {
                  const val = champ.info![stat]
                  const citrine = stat === "difficulty"
                  return (
                    <div key={stat} className="flex items-center gap-3">
                      <span className="w-[84px] shrink-0 font-jetbrains text-[9.5px] uppercase tracking-[0.18em] text-flash/40">{stat}</span>
                      <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-filmlight/[0.06]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val * 10}%` }}
                          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                          className={cn("h-full rounded-full bg-gradient-to-r", citrine ? "from-citrine to-citrine/40" : "from-jade to-jade/40")}
                        />
                      </div>
                      <span className={cn("w-5 shrink-0 text-right font-chakrapetch text-[13px] font-bold tabular-nums", citrine ? "text-citrine" : "text-jade")}>{val}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* base stats */}
            {champ.stats && (
              <>
                <div className="mb-3.5 mt-5 flex items-center gap-2.5">
                  <span className="font-jetbrains text-[9px] uppercase tracking-[0.24em] text-flash/35">Base stats</span>
                  <div className="h-px flex-1 bg-hairline/[0.06]" />
                  {champ.partype && <span className="font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/45">{champ.partype}</span>}
                </div>
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {STAT_PAIRS.filter((p) =>
                    champ.stats![p.key] !== undefined &&
                    // manaless champs: hide the dead "Mana 0" / "MP Regen 0" rows
                    !((p.key === "mp" || p.key === "mpregen") && !champ.stats![p.key])
                  ).map((p) => (
                    <div key={p.key} className="flex items-baseline justify-between gap-2 border-b border-hairline/[0.05] py-[6px]">
                      <span className="font-jetbrains text-[10.5px] uppercase tracking-[0.08em] text-flash/40">{p.label}</span>
                      <span className="font-jetbrains tabular-nums">
                        <span className="text-[12.5px] font-semibold text-flash/85">{champ.stats![p.key]}</span>
                        {p.per && champ.stats![p.per] ? <span className="ml-1 text-[10px] text-jade/55">+{champ.stats![p.per]}</span> : null}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        )}

        {champ.lore && (
          <Panel className="p-5">
            <SectionTitle>Lore</SectionTitle>
            <div className="relative mt-3 pl-6">
              <span className="absolute -top-3 left-0 select-none font-chakrapetch text-[44px] leading-none text-jade/20">{"“"}</span>
              <p
                className="overflow-hidden font-chakrapetch text-[13px] leading-[1.75] text-flash/70"
                style={!loreOpen && champ.lore.length > 420 ? { display: "-webkit-box", WebkitLineClamp: 7, WebkitBoxOrient: "vertical" } : undefined}
              >
                {champ.lore}
              </p>
              {champ.lore.length > 420 && (
                <button
                  type="button"
                  onClick={() => setLoreOpen((v) => !v)}
                  className="mt-2.5 font-jetbrains text-[9px] uppercase tracking-[0.2em] text-jade/60 transition-colors hover:text-jade cursor-clicker"
                >
                  {loreOpen ? "▴ Show less" : "▾ Read more"}
                </button>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children, tone = "jade" }: { children: React.ReactNode; tone?: "jade" | "red" }) {
  const red = tone === "red"
  const dot = red ? "#ff6286" : "#00d992"
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
      <span className={cn("font-chakrapetch text-[11px] font-bold tracking-[0.28em] uppercase", red ? "text-[#ff6286]/85" : "text-jade/80")}>{children}</span>
      <div className={cn("h-px flex-1 bg-gradient-to-r to-transparent", red ? "from-[#ff6286]/20" : "from-jade/20")} />
    </div>
  )
}
