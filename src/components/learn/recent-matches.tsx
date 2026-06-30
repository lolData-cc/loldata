// src/components/learn/recent-matches.tsx
//
// "YOUR GAMES" tab body — the logged-in account's real match history, rendered
// with the standalone <MatchCard> so it looks exactly like the summoner page.
// Fetches /api/matches (the same endpoint the summoner page uses), paginates
// with an IntersectionObserver sentinel, day-groups the rows, and maps each
// raw match-v5 row → MatchCardData.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import dayjs from "dayjs"
import { Loader2, Swords, Hammer, Users, Sparkles, ArrowRight, Paperclip } from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/config"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
  MatchCard,
  type MatchCardData,
  type ScoreboardParticipant,
} from "@/components/matchcard"
import type { MatchWithWin } from "@/assets/types/riot"

// Same queue map the summoner page uses.
const queueTypeMap: Record<number, string> = {
  400: "Normal Draft",
  420: "Ranked Solo/Duo",
  430: "Normal Blind",
  440: "Ranked Flex",
  450: "ARAM",
  700: "Clash",
  900: "URF",
  1020: "One for All",
  1700: "Arena",
}

// ── helpers ─────────────────────────────────────────────────────────
function matchTs(info: MatchWithWin["match"]["info"]): number {
  return (
    info.gameEndTimestamp ??
    info.gameStartTimestamp ??
    (info as { gameCreation?: number }).gameCreation ??
    0
  )
}

function dayKeyFromTs(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`
}

function dayLabel(ts: number): string {
  const d = dayjs(ts)
  if (d.isSame(dayjs(), "day")) return "Today"
  if (d.isSame(dayjs().subtract(1, "day"), "day")) return "Yesterday"
  return d.format("MMM D, YYYY")
}

function formatPlayed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m played`
  return `${m}m played`
}

// raw match-v5 row → the card's data shape (mirrors the summoner page's inline
// extraction: same participant lookup, runes, items, cs/kp source fields).
function toCardData(
  row: MatchWithWin,
  mePuuid: string,
  region: string | null
): MatchCardData {
  const info = row.match.info
  const participants = info.participants ?? []
  const me = participants.find((p) => p.puuid === mePuuid)

  const duration = info.gameDuration ?? 0
  // The card derives timeAgo from gameCreationMs + duration, so feed it the
  // start so that sum ≈ the real game-end the summoner page shows.
  const start =
    info.gameStartTimestamp ??
    (info.gameEndTimestamp ? info.gameEndTimestamp - duration * 1000 : matchTs(info))

  const platform = (info as { platformId?: string }).platformId ?? null

  const allParticipants: ScoreboardParticipant[] = participants.map((p) => ({
    puuid: p.puuid,
    summonerName: p.riotIdGameName ?? p.summonerName ?? null,
    riotTagline: p.riotIdTagline ?? null,
    championName: p.championName ?? null,
    teamId: p.teamId ?? null,
    platform,
    win: p.win,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
  }))

  return {
    matchId: row.match.metadata.matchId,
    queueLabel: queueTypeMap[info.queueId] || "Unknown Queue",
    win: row.win,
    isRemake: duration < 300,
    gameDurationSeconds: duration,
    gameCreationMs: start,
    championName: row.championName,
    championLevel: me?.champLevel ?? null,
    keystoneId: me?.perks?.styles?.[0]?.selections?.[0]?.perk ?? null,
    secondaryStyleId: me?.perks?.styles?.[1]?.style ?? null,
    kills: me?.kills ?? 0,
    deaths: me?.deaths ?? 0,
    assists: me?.assists ?? 0,
    cs:
      me != null
        ? (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0)
        : null,
    role: me?.teamPosition || me?.individualPosition || null,
    gold: me?.goldEarned ?? null,
    items: me
      ? [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6]
      : [],
    allParticipants,
    highlightPuuid: mePuuid,
    lpDelta: row.lpDelta ?? null,
    region,
    // Same Aegis-of-Valor watermark the summoner page paints on a 0-LP loss.
    hasDoubleLp: !row.win && row.lpDelta === 0,
  }
}

type ApiMatchesResponse = {
  matches?: MatchWithWin[]
  hasMore?: boolean
  nextOffset?: number
  ingesting?: boolean
}

// AI Coach actions — each analyzes the SELECTED game (the one the user clicked)
// by attaching it to the LOLDATA AI chat with the prompt below.
const COACH_ACTIONS = [
  {
    key: "laning",
    label: "Laning phase",
    desc: "CS@10, gold, early KDA",
    icon: Swords,
    prompt:
      "Analyze the laning phase of this specific game — my CS and gold at 10 minutes, my early KDA, and my deaths. What did I do well or badly in lane, and the one thing to fix?",
  },
  {
    key: "items",
    label: "Itemization",
    desc: "Build for this game",
    icon: Hammer,
    prompt:
      "Review my itemization in this specific game — were my item choices and build order good for this game and matchup? What should I have built differently?",
  },
  {
    key: "team",
    label: "Team performance",
    desc: "KP, damage share",
    icon: Users,
    prompt:
      "Analyze my teamfight impact in this specific game — my kill participation and damage share. Did I impact fights enough, and how could I have done more?",
  },
  {
    key: "review",
    label: "Game review",
    desc: "What to learn",
    icon: Sparkles,
    prompt:
      "Give me an honest review of this specific game — what went well, what went wrong, and the single biggest thing I should take away from it.",
  },
  {
    // Empty prompt = "attach only": the game is pinned to the chat input so the
    // user can type their OWN question about it (handled in LoldataAIChat).
    key: "attach",
    label: "Attach to chat",
    desc: "Ask your own question",
    icon: Paperclip,
    prompt: "",
  },
] as const

type CoachAction = (typeof COACH_ACTIONS)[number]

// The right-hand "AI Coach" rail — you click a game in the list to select it,
// then a button here attaches THAT game to the chat for a focused analysis.
function CoachRail({ onAction }: { onAction: (a: CoachAction) => void }) {
  return (
    <div className="sticky top-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative inline-grid h-4 w-4 place-items-center">
          <span className="absolute inset-0 rotate-45 rounded-[2px] border border-jade/45 bg-jade/[0.08]" />
          <span className="absolute h-1 w-1 rounded-full bg-jade animate-pulse" />
        </span>
        <span className="font-chakrapetch text-[10px] font-bold uppercase tracking-[0.28em] text-jade/70">
          AI Coach
        </span>
      </div>
      <p className="mb-3 font-jetbrains text-[10.5px] leading-relaxed text-flash/35">
        Click a game on the left to select it, then pick an analysis — lolData AI breaks down that match.
      </p>

      <div className="flex flex-col gap-2">
        {COACH_ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => onAction(a)}
            className="group relative flex items-center gap-2.5 overflow-hidden rounded-lg bg-flash/[0.03] px-2.5 py-2.5 text-left transition-all duration-200 hover:bg-jade/[0.07] cursor-clicker"
          >
            <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-transparent transition-all duration-200 group-hover:bg-jade group-hover:shadow-[0_0_8px_#00d992]" />
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-flash/[0.05] text-flash/40 transition-colors duration-200 group-hover:bg-jade/15 group-hover:text-jade">
              <a.icon size={15} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-chakrapetch text-[12px] font-medium uppercase tracking-[0.08em] text-flash/75 transition-colors duration-200 group-hover:text-jade">
                {a.label}
              </span>
              <span className="mt-0.5 block truncate font-jetbrains text-[9.5px] tracking-wide text-flash/30">
                {a.desc}
              </span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-flash/20 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-jade/70" />
          </button>
        ))}
      </div>

      <p className="mt-3 font-jetbrains text-[9px] tracking-wide text-flash/25">
        1 credit each · powered by lolData AI
      </p>
    </div>
  )
}

export function RecentMatches({
  nametag,
  region,
  puuid,
  onAnalyze,
}: {
  nametag: string | null
  region: string | null
  puuid: string | null
  onAnalyze?: (prompt: string, attach?: { matchId: string; card: MatchCardData }) => void
}) {
  const [name, tag] = (nametag ?? "").split("#")
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)

  const [matches, setMatches] = useState<MatchWithWin[]>([])
  const [loading, setLoading] = useState(true)
  const [ingesting, setIngesting] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errored, setErrored] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      if (!name || !tag || !region) return
      try {
        const res = await fetch(`${API_BASE_URL}/api/matches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tag, region, offset, limit: 10 }),
        })
        if (!res.ok) throw new Error(String(res.status))
        const data: ApiMatchesResponse = await res.json()

        setIngesting(Boolean(data.ingesting))
        setHasMore(Boolean(data.hasMore))
        setNextOffset(
          Number(data.nextOffset ?? offset + (data.matches?.length ?? 0))
        )

        if (data.matches && data.matches.length > 0) {
          setMatches((prev) =>
            append ? [...prev, ...data.matches!] : data.matches!
          )
        } else if (!append) {
          setMatches([])
        }
        setErrored(false)
      } catch {
        if (!append) setErrored(true)
      }
    },
    [name, tag, region]
  )

  // Initial load (and reload when the account changes).
  useEffect(() => {
    setLoading(true)
    setMatches([])
    fetchPage(0, false).finally(() => setLoading(false))
  }, [fetchPage])

  // Keep polling the first page while the backend is still ingesting.
  useEffect(() => {
    if (!ingesting) return
    const id = setInterval(() => fetchPage(0, false), 3000)
    return () => clearInterval(id)
  }, [ingesting, fetchPage])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      await fetchPage(nextOffset, true)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, nextOffset, fetchPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: "600px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore])

  // Day-group, most-recent first.
  const groups = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) => matchTs(b.match.info) - matchTs(a.match.info)
    )
    const map = new Map<string, MatchWithWin[]>()
    for (const row of sorted) {
      const key = dayKeyFromTs(matchTs(row.match.info))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    return [...map.entries()]
  }, [matches])

  // AI Coach: a button analyzes the SELECTED game. No selection → nudge the user.
  const handleAction = (a: CoachAction) => {
    if (!selectedMatchId || !puuid) {
      toast.error("Select a match first")
      return
    }
    const row = matches.find((m) => m.match.metadata.matchId === selectedMatchId)
    if (!row) {
      toast.error("Select a match first")
      return
    }
    onAnalyze?.(a.prompt, { matchId: selectedMatchId, card: toCardData(row, puuid, region) })
  }

  // ── states ────────────────────────────────────────────────────────
  if (!nametag || !region || !puuid) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50">
          // RECENT GAMES
        </span>
        <span className="text-flash/40 font-mono text-sm">
          Link a Riot account to see your games
        </span>
      </div>
    )
  }

  return (
    <div>
      {/* Mobile: analysis actions as a horizontal chip row above the matches. */}
      {onAnalyze && (
        <div className="min-[1450px]:hidden mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
          {COACH_ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => handleAction(a)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-flash/[0.04] px-3 py-1.5 font-chakrapetch text-[11px] font-medium text-flash/70 transition-colors hover:bg-jade/[0.10] hover:text-jade cursor-clicker"
            >
              <a.icon size={12} strokeWidth={1.75} />
              {a.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col min-[1450px]:flex-row gap-5">
        <div className="w-full min-[1450px]:flex-1 min-[1450px]:min-w-0">
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[104px] rounded-md bg-black/20 backdrop-blur-lg animate-pulse"
            />
          ))}
        </div>
      ) : errored ? (
        <p className="text-flash/30 font-mono text-sm">
          Couldn't load your games right now.
        </p>
      ) : groups.length === 0 ? (
        <p className="text-flash/30 font-mono text-sm">
          {ingesting ? "Loading your match history…" : "No games found yet"}
        </p>
      ) : (
        <div className="space-y-1">
          {groups.map(([dayKey, rows]) => {
            const wins = rows.filter((r) => r.win).length
            const losses = rows.length - wins
            const wr =
              rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0
            const totalSeconds = rows.reduce(
              (acc, r) => acc + (r.match.info.gameDuration || 0),
              0
            )

            return (
              <section key={dayKey} className="space-y-1">
                {/* Day header — same readout as the summoner page. */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-md mt-3 text-xs">
                  <div className="uppercase text-flash/70 tracking-[0.12em] font-mono font-medium text-[12px]">
                    {dayLabel(matchTs(rows[0].match.info))}
                  </div>
                  <div className="flex items-center gap-3 font-semibold">
                    {wins > 0 && <span className="text-jade">{wins}W</span>}
                    {losses > 0 && (
                      <span className="text-[#b11315]">{losses}L</span>
                    )}
                    {wins > 0 && losses > 0 && (
                      <span
                        className={cn(
                          wr >= 50 ? "text-jade" : "text-[#d63336]"
                        )}
                      >
                        {wr}% WR
                      </span>
                    )}
                    <Separator
                      orientation="vertical"
                      className="hidden lg:block h-4 bg-[#48504E]"
                    />
                    <span className="hidden lg:inline text-flash/70 uppercase">
                      {formatPlayed(totalSeconds)}
                    </span>
                  </div>
                </div>

                {/* Match cards for the day. */}
                <div className="flex flex-col gap-1">
                  {rows.map((row) => {
                    const mid = row.match.metadata.matchId
                    return (
                      <MatchCard
                        key={mid}
                        data={toCardData(row, puuid, region)}
                        selectable={!!onAnalyze}
                        selected={selectedMatchId === mid}
                        onSelect={() => setSelectedMatchId((cur) => (cur === mid ? null : mid))}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}

          {/* Infinite-scroll sentinel + spinner. */}
          <div ref={sentinelRef} className="h-10" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-jade/60" />
            </div>
          )}
        </div>
      )}
        </div>

        {/* Desktop: sticky AI Coach rail filling the space to the right. */}
        {onAnalyze && (
          <aside className="hidden min-[1450px]:block w-[290px] shrink-0">
            <CoachRail onAction={handleAction} />
          </aside>
        )}
      </div>
    </div>
  )
}
