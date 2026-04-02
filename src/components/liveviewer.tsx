import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { formatChampName } from "@/utils/formatchampname"
import { formatRank } from "@/utils/rankConverter"
import { API_BASE_URL } from "@/config"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import queueMap from "@/converters/queueMap"

type Participant = {
  teamId: number
  summonerName: string
  championId: number
  riotId: string
  spell1Id: number
  spell2Id: number
  perks: any
}

type LiveGame = {
  participants: Participant[]
  gameType: string
  gameQueueConfigId: number
  gameStartTime: number
}

type LiveViewerProps = {
  puuid: string
  riotId: string
  region: string
  controlledOpen?: boolean
  onControlledOpenChange?: (open: boolean) => void
}

// ── Glass card reusable classes ─────────────────────────────────────
const glassCard = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/25 backdrop-blur-lg saturate-150",
  "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
)

const ROLES = ["top", "jungle", "mid", "bot", "support"] as const

export function LiveViewer({ puuid, riotId, region, controlledOpen, onControlledOpenChange }: LiveViewerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = typeof controlledOpen === "boolean"
  const open = isControlled ? controlledOpen! : internalOpen
  const setOpen = isControlled ? (onControlledOpenChange as (o: boolean) => void) : setInternalOpen

  const [championMap, setChampionMap] = useState<Record<number, string>>({})
  const [game, setGame] = useState<LiveGame | null>(null)
  const [aiHelp, setAiHelp] = useState<string | null>(null)
  const [ranks, setRanks] = useState<Record<string, { rank: string; wins: number; losses: number; lp: number }>>({})
  const [loadingHelp, setLoadingHelp] = useState(false)
  const [selectedTab, setSelectedTab] = useState<string>("statistics")
  const navigate = useNavigate()
  const [orderedTeams, setOrderedTeams] = useState<{
    100: Partial<Record<"top" | "jungle" | "mid" | "bot" | "support", Participant>>
    200: Partial<Record<"top" | "jungle" | "mid" | "bot" | "support", Participant>>
  }>({ 100: {}, 200: {} })

  const redTeam = game?.participants.filter(p => p.teamId === 200) || []

  // Live game timer
  const [elapsed, setElapsed] = useState("")
  useEffect(() => {
    if (!game?.gameStartTime) { setElapsed(""); return; }
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - game.gameStartTime) / 1000));
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      setElapsed(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game?.gameStartTime]);

  const generateAiHelp = async () => {
    if (!redTeam.length) return
    setLoadingHelp(true)
    const response = await fetch(`${API_BASE_URL}/api/aihelp/howtowin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enemyChampionIds: redTeam.map(p => p.championId) }),
    })
    const data = await response.json()
    setAiHelp(data?.advice || "No advice found.")
    setLoadingHelp(false)
  }

  useEffect(() => {
    if (!open) return
    const fetchGameAndChamps = async () => {
      try {
        const gameRes = await fetch(`${API_BASE_URL}/api/livegame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puuid, region }),
        })

        const gameData = await (gameRes.status === 204 ? null : gameRes.json())
        if (gameData?.game) {
          setGame(gameData.game)

          const riotIds = gameData.game.participants.map((p: Participant) => p.riotId)
          const rankRes = await fetch(`${API_BASE_URL}/api/multirank`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ riotIds, region }),
          })

          const rankData = await rankRes.json()
          type RankInfo = { riotId: string; rank: string; wins: number; losses: number; lp: number }
          const rankMap: Record<string, { rank: string; wins: number; losses: number; lp: number }> = {}
          rankData.ranks.forEach((r: RankInfo) => {
            rankMap[r.riotId] = { rank: r.rank, wins: r.wins, losses: r.losses, lp: r.lp }
          })
          setRanks(rankMap)

          const rolesRes = await fetch(`${API_BASE_URL}/api/assignroles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participants: gameData.game.participants }),
          })
          const rolesData = await rolesRes.json()
          setOrderedTeams({ 100: rolesData.roles[100], 200: rolesData.roles[200] })
        }

        const champRes = await fetch("https://cdn.loldata.cc/15.13.1/data/en_US/champion.json")
        const champData = await champRes.json()
        const idToName: Record<number, string> = {}
        Object.values(champData.data).forEach((champ: any) => {
          idToName[parseInt(champ.key)] = champ.name
        })
        setChampionMap(idToName)
      } catch (err) {
        console.error(err)
      }
    }

    fetchGameAndChamps()
  }, [open, puuid])

  // ── Player row ──────────────────────────────────────────────────────
  function PlayerRow({ p, side }: { p: Participant; side: "blue" | "red" }) {
    const isFocused = p.riotId === riotId
    const rank = ranks[p.riotId]
    const isStreamerMode = !rank?.rank || rank.rank.toLowerCase() === "error"
    const teamColor = side === "blue" ? "text-cyan-300/90" : "text-rose-300/90"
    const total = (rank?.wins ?? 0) + (rank?.losses ?? 0)
    const wr = total > 0 ? Math.round((rank?.wins / total) * 100) : 0
    const wrColor = wr >= 60 ? "text-jade" : wr < 45 && total > 0 ? "text-rose-400" : "text-flash/40"

    return (
      <div className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 transition-all rounded-[4px]",
        "hover:bg-white/[0.03]",
        isFocused && "bg-jade/[0.06] shadow-[inset_0_0_12px_rgba(0,217,146,0.06)]"
      )}>
        {/* Champion + spells */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative w-8 h-8">
            <img
              src={`https://cdn.loldata.cc/15.13.1/img/champion/${formatChampName(championMap[p.championId])}.png`}
              className="w-8 h-8 rounded-[4px] ring-1 ring-white/10"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <img src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell1Id}.png`} className="w-3.5 h-3.5 rounded-[2px]" />
            <img src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${p.spell2Id}.png`} className="w-3.5 h-3.5 rounded-[2px]" />
          </div>
        </div>

        {/* Name */}
        {(() => {
          const raw = (p.riotId || p.summonerName || "").trim();
          const parts = raw.split("#");
          const displayName = parts[0]?.trim();
          const displayTag = parts[1]?.trim();
          const isHidden = !displayName
            || !raw
            || displayName.toLowerCase() === "error"
            || displayTag?.toLowerCase() === "error"
            || raw.toLowerCase().includes("error");
          if (isHidden) {
            return (
              <div className="w-[120px] shrink-0 flex items-center gap-1.5">
                <span className="text-[10px] font-mono tracking-[0.1em] text-flash/20 italic">hidden</span>
                <span
                  className="text-[7px] font-orbitron font-bold px-1 py-[1px] rounded-[2px] tracking-wider border border-flash/15 text-flash/25"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.06))" }}
                >
                  STREAMER MODE
                </span>
              </div>
            );
          }
          return (
            <span
              className={cn(
                "truncate text-[11px] font-mono tracking-wide cursor-clicker hover:underline w-[120px] shrink-0",
                isFocused ? "text-jade font-bold" : teamColor
              )}
              onClick={() => {
                if (p.riotId) {
                  setOpen(false)
                  const [riotName, riotTag] = p.riotId.split("#")
                  navigate(`/summoners/${region}/${riotName.replace(/\s+/g, "+")}-${riotTag}`)
                }
              }}
            >
              {displayName}
            </span>
          );
        })()}

        {/* Rank */}
        {(() => {
          const rankStr = rank?.rank;
          return (
            <div className="flex items-center gap-1.5 flex-1 min-w-0 shrink-0">
              {!isStreamerMode && (
                <img
                  src={`https://cdn.loldata.cc/15.13.1/img/miniranks/${formatRank(rankStr!)}.png`}
                  className="w-5 h-5 shrink-0 object-contain"
                />
              )}
              {isStreamerMode ? (
                <span
                  className="font-orbitron text-[7px] font-bold tracking-[0.15em] uppercase px-1.5 py-[2px] rounded-[2px] border border-flash/15 whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, rgba(155,89,182,0.15), rgba(168,85,199,0.08))",
                    color: "rgba(168,85,199,0.7)",
                    boxShadow: "0 0 6px rgba(155,89,182,0.15)",
                  }}
                >
                  Streamer Mode
                </span>
              ) : (
                <span className="font-mono text-[11px] tracking-wide text-flash/50 whitespace-nowrap">
                  {rankStr} {rank?.lp != null ? <span className="text-flash/70">{rank.lp} LP</span> : ""}
                </span>
              )}
            </div>
          );
        })()}

        {/* Winrate */}
        <div className="shrink-0 text-right w-[50px]">
          {isStreamerMode ? null : total > 0 ? (
            <div className="flex flex-col items-end">
              <span className={cn("font-mono text-[11px] tabular-nums font-medium", wrColor)}>
                {wr}%
              </span>
              <span className="font-mono text-[9px] text-flash/25 tabular-nums whitespace-nowrap">
                {total} games
              </span>
            </div>
          ) : (
            <span className="font-mono text-[10px] text-flash/25">—</span>
          )}
        </div>
      </div>
    )
  }

  const queueName = game?.gameQueueConfigId ? (queueMap[game.gameQueueConfigId] || game.gameType) : game?.gameType

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger — only if not controlled */}
      {!isControlled && (
        <DialogTrigger className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 cursor-clicker group">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-sm font-mono text-[10px] font-bold tracking-[0.2em] uppercase transition-all group-hover:brightness-125 bg-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.6),0_0_4px_rgba(239,68,68,0.8)]">
            <span className="w-[6px] h-[6px] rounded-full bg-white animate-pulse" />
            Live
          </div>
        </DialogTrigger>
      )}

      <DialogContent
        className="w-[65%] max-w-none bg-transparent border-none p-0 text-flash top-[15%] translate-y-0 [&>button:last-child]:hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-red-400/80">Live Game</span>
          </div>
          {elapsed && (
            <>
              <span className="text-red-400/20 text-[10px]">◈</span>
              <span className="font-orbitron text-[14px] tracking-wider text-flash/70 tabular-nums">{elapsed}</span>
            </>
          )}
          {queueName && (
            <>
              <span className="text-red-400/20 text-[10px]">◈</span>
              <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-flash/25">{queueName}</span>
            </>
          )}
        </div>

        {/* ── Two floating team cards ── */}
        <div className="flex gap-4 items-start">

          {/* Blue team */}
          <div className={cn(glassCard, "flex-1")}>
            {/* Blue accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 z-10 bg-gradient-to-b from-cyan-400/80 to-cyan-400/10 rounded-l-md" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
                <span className="text-cyan-400/50 text-[10px]">◈</span>
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-cyan-300/80">
                  Blue Side
                </span>
              </div>

              {/* Players */}
              <div className="p-1.5 space-y-0.5">
                {ROLES.map(role => {
                  const p = orderedTeams[100][role]
                  return p ? <PlayerRow key={p.summonerName} p={p} side="blue" /> : null
                })}
              </div>
            </div>
          </div>

          {/* VS separator */}
          <div className="flex flex-col items-center justify-center pt-16 shrink-0 gap-1">
            <span className="font-mono text-flash/10 text-xl">VS</span>
          </div>

          {/* Red team */}
          <div className={cn(glassCard, "flex-1")}>
            {/* Red accent bar */}
            <div className="absolute right-0 top-0 bottom-0 w-1 z-10 bg-gradient-to-b from-rose-400/80 to-rose-400/10 rounded-r-md" />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
                <span className="text-rose-400/50 text-[10px]">◈</span>
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-rose-300/80">
                  Red Side
                </span>
              </div>

              {/* Players */}
              <div className="p-1.5 space-y-0.5">
                {ROLES.map(role => {
                  const p = orderedTeams[200][role]
                  return p ? <PlayerRow key={p.summonerName} p={p} side="red" /> : null
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Tabs section ── */}
        <div className={cn(glassCard, "mt-4")}>
          <div className="relative z-10">
            <Tabs
              defaultValue="statistics"
              value={selectedTab}
              onValueChange={(value) => {
                setSelectedTab(value)
                if (value === "howtowin" && !aiHelp) generateAiHelp()
              }}
              className="flex flex-col"
            >
              <TabsList className="flex gap-1 px-3 pt-3 pb-0 bg-transparent justify-start">
                <TabsTrigger
                  value="statistics"
                  className={cn(
                    "font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 rounded-sm transition-all cursor-clicker",
                    "text-flash/30 hover:text-flash/50",
                    "data-[state=active]:text-jade data-[state=active]:bg-jade/[0.08] data-[state=active]:shadow-[0_0_10px_rgba(0,217,146,0.08),inset_0_0_10px_rgba(0,217,146,0.04)]",
                    "border border-transparent data-[state=active]:border-jade/20"
                  )}
                >
                  Statistics
                </TabsTrigger>
                <TabsTrigger
                  value="howtowin"
                  className={cn(
                    "font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 rounded-sm transition-all cursor-clicker flex items-center gap-1.5",
                    "text-flash/30 hover:text-flash/50",
                    "data-[state=active]:text-jade data-[state=active]:bg-jade/[0.08] data-[state=active]:shadow-[0_0_10px_rgba(0,217,146,0.08),inset_0_0_10px_rgba(0,217,146,0.04)]",
                    "border border-transparent data-[state=active]:border-jade/20"
                  )}
                >
                  How to Win
                  <span className="text-[8px] px-1 rounded-sm bg-jade/10 text-jade/60 data-[state=active]:bg-jade/20">AI</span>
                </TabsTrigger>
                <TabsTrigger
                  value="matchups"
                  className={cn(
                    "font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 rounded-sm transition-all cursor-clicker flex items-center gap-1.5",
                    "text-flash/30 hover:text-flash/50",
                    "data-[state=active]:text-jade data-[state=active]:bg-jade/[0.08] data-[state=active]:shadow-[0_0_10px_rgba(0,217,146,0.08),inset_0_0_10px_rgba(0,217,146,0.04)]",
                    "border border-transparent data-[state=active]:border-jade/20"
                  )}
                >
                  Matchups
                  <span className="text-[8px] px-1 rounded-sm bg-jade/10 text-jade/60">AI</span>
                </TabsTrigger>
                <TabsTrigger
                  value="whattobuild"
                  className={cn(
                    "font-mono text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 rounded-sm transition-all cursor-clicker flex items-center gap-1.5",
                    "text-flash/30 hover:text-flash/50",
                    "data-[state=active]:text-jade data-[state=active]:bg-jade/[0.08] data-[state=active]:shadow-[0_0_10px_rgba(0,217,146,0.08),inset_0_0_10px_rgba(0,217,146,0.04)]",
                    "border border-transparent data-[state=active]:border-jade/20"
                  )}
                >
                  What to Build
                  <span className="text-[8px] px-1 rounded-sm bg-jade/10 text-jade/60">AI</span>
                </TabsTrigger>
              </TabsList>

              <div className="px-4 py-3 max-h-[250px] overflow-y-auto scrollbar-hide">
                <TabsContent value="statistics" className="mt-0">
                  <div className="font-mono text-[10px] text-flash/25 tracking-wider uppercase">
                    Statistics will appear here during the game.
                  </div>
                </TabsContent>
                <TabsContent value="howtowin" className="mt-0 font-mono text-[11px] leading-6 text-flash/70 whitespace-pre-wrap">
                  {loadingHelp ? (
                    <div className="flex items-center gap-2 text-jade/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-jade/50 animate-pulse" />
                      AI is thinking...
                    </div>
                  ) : (
                    aiHelp || "No advice generated."
                  )}
                </TabsContent>
                <TabsContent value="matchups" className="mt-0 font-mono text-[11px] leading-6 text-flash/70 whitespace-pre-wrap">
                  Coming soon.
                </TabsContent>
                <TabsContent value="whattobuild" className="mt-0 font-mono text-[11px] leading-6 text-flash/70 whitespace-pre-wrap">
                  Coming soon.
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
