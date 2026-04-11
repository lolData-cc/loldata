'use client';

// src/pages/champion-detail-page.tsx
import React, { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { cdnBaseUrl, cdnSplashUrl, getCdnVersion } from "@/config"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_BASE_URL, normalizeChampSplash } from "@/config"
import splashPositionMap from "@/converters/splashPositionMap"
import { ChampionStats } from "@/components/champion-stats-tab"
import { ChampionItemsTab } from "@/components/championitemstab";
import { ChampionOtpRanking } from "@/components/champion-otp-ranking";
import { ChampionMatchupsTab } from "@/components/champion-matchups-tab";
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

const validTabs = ["overview", "statistics", "items", "matchups", "guides", "pros"] as const

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
    `https://cdn2.loldata.cc/16.1.1/img/champion/${opponentIdFromKey(k)}.png`

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
    return cdnSplashUrl(normalizeChampSplash(champId))
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
                    className="h-16 w-16 rounded-md object-cover ring-1 ring-white/10"
                  />
                  <div>
                    <h1 className="text-2xl font-semibold text-white transition-all duration-500 ease-out" key={activeGuide ? "guide" : "champ"}>
                      <span style={{ display: "inline-block", animation: activeGuide ? "morphIn 0.4s ease-out" : undefined }}>
                        {activeGuide ? activeGuide.title : champ.name}
                      </span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm transition-all duration-500 ease-out" key={activeGuide ? "guide-author" : "champ-title"}>
                      <span style={{ display: "inline-block", animation: activeGuide ? "morphIn 0.4s ease-out 0.05s both" : undefined }}
                        className={activeGuide ? "text-jade/60" : "text-white/70"}>
                        {activeGuide ? `by ${activeGuide.author}` : champ.title}
                      </span>
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
                      <div className="mt-2 flex flex-wrap gap-2">
                        {champ.tags?.map(t => (
                          <span key={t} className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80">
                            {t}
                          </span>
                        ))}
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
                    <div className="flex flex-col items-center gap-1 w-[60px] py-1.5 rounded-sm border border-flash/[0.08] bg-black/30">
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
              { value: "statistics", label: "Statistics" },
              { value: "matchups", label: "Matchups" },
              { value: "guides", label: "Guides" },
              { value: "pros", label: "OTPs" },
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
              <ChampionStats champ={champ} patch={patch} keyToId={keyToId} onVsChange={setVsOpponent} initialVs={vsParam} />
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
                    ? `${cdnBaseUrl()}/img/passive/${ab.image}`
                    : `${cdnBaseUrl()}/img/spell/${ab.image}`
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
