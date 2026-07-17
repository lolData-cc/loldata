import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { formatChampName } from "@/utils/formatchampname"
import { getRankImage } from "@/utils/rankIcons"
import { API_BASE_URL, cdnBaseUrl } from "@/config"
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons"
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

type PStats = {
  championGames: number
  championWins: number
  championWinrate: number | null
  championKda?: number | null
  championAvgKills?: number | null
  championAvgDeaths?: number | null
  championAvgAssists?: number | null
  championCsMin?: number | null
  seasonGames?: number
  seasonWinrate?: number | null
  seasonKda?: number | null
  mainRoles: string[]
  isFilled: boolean
  roleGames: Record<string, number>
}

type RankEntry = { rank: string; wins: number; losses: number; lp: number }

const ROLES = ["top", "jungle", "mid", "bot", "support"] as const
type RoleKey = (typeof ROLES)[number]

const ROLE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  top: RoleTopIcon,
  jungle: RoleJungleIcon,
  mid: RoleMidIcon,
  bot: RoleAdcIcon,
  support: RoleSupportIcon,
}

// pointy-top hexagon — Valorant HP-hex silhouette
const HEX = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)"

// ── HUD choreography: helmet sway + visor depth ─────────────────────
// The 3D is SELF-CONTAINED per element (transform: perspective(...) rotateY)
// — a `perspective` property on an ancestor only reaches direct children, and
// the flex wrapper in between was silently flattening the whole HUD. Columns
// curve toward the centre, and every plate leans a little further on its own,
// like cards resting on a helmet visor. Type ≥10px (rank 15px bold) keeps the
// composited tilt readable.
const HUD_CSS = `
.lvh-sway { animation: lvhSway 7s ease-in-out infinite; }
@keyframes lvhSway { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.lvh-col-l { transform: perspective(1100px) rotateY(11deg); transform-origin: 100% 50%; }
.lvh-col-r { transform: perspective(1100px) rotateY(-11deg); transform-origin: 0% 50%; }
.lvh-in { animation: lvhIn 480ms cubic-bezier(0.22,1,0.36,1) both; }
@keyframes lvhIn { from { opacity: 0; transform: translateX(var(--lvh-from, -18px)); } to { opacity: 1; transform: translateX(0); } }
.lvh-head { animation: lvhHead 500ms cubic-bezier(0.22,1,0.36,1) both; }
@keyframes lvhHead { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
@media (max-width: 1023px) {
  .lvh-col-l, .lvh-col-r, .lvh-tilt { transform: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  .lvh-sway, .lvh-in, .lvh-head { animation: none !important; }
}
`

// Self-contained 1s clock — isolated so the tick never re-renders the HUD.
function ElapsedClock({ startTime }: { startTime?: number }) {
  const [elapsed, setElapsed] = useState("")
  useEffect(() => {
    if (!startTime) { setElapsed(""); return }
    const tick = () => {
      const secs = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
      const m = Math.floor(secs / 60)
      const s = secs % 60
      setElapsed(`${m}:${s.toString().padStart(2, "0")}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTime])
  if (!elapsed) return null
  return (
    <>
      <span className="text-red-400/20 text-[10px]">◈</span>
      <span className="font-orbitron text-[16px] tracking-wider text-flash/85 tabular-nums" style={{ textShadow: "0 0 14px rgba(215,216,217,0.15)" }}>{elapsed}</span>
    </>
  )
}

// ── Hex portrait: layered clip-path (glow ring → dark rim → art) ────
function HexPortrait({ champ, side, focused, role, otp, filled }: {
  champ?: string
  side: "blue" | "red"
  focused: boolean
  role?: string
  otp?: boolean
  filled?: boolean
}) {
  const ring = focused
    ? "rgba(0,217,146,0.95)"
    : side === "blue" ? "rgba(91,168,230,0.8)" : "rgba(224,80,63,0.8)"
  const glow = focused
    ? "drop-shadow(0 0 14px rgba(0,217,146,0.6))"
    : side === "blue" ? "drop-shadow(0 0 10px rgba(91,168,230,0.35))" : "drop-shadow(0 0 10px rgba(224,80,63,0.35))"
  const RoleIcon = role ? ROLE_ICON[role] : null
  return (
    <div className="relative h-[74px] w-[74px] shrink-0">
      {/* the glow filter lives on THIS inner wrapper only — a `filter`
          rasterizes its whole subtree, so badges/text must stay outside it
          or they render soft */}
      <span aria-hidden className="absolute inset-0 block" style={{ filter: glow }}>
        <span aria-hidden className="absolute inset-0" style={{ clipPath: HEX, background: ring }} />
        <span aria-hidden className="absolute inset-[2px]" style={{ clipPath: HEX, background: "#050C0E" }} />
        <span aria-hidden className="absolute inset-[4px] overflow-hidden" style={{ clipPath: HEX }}>
          {champ ? (
            <img
              src={`${cdnBaseUrl()}/img/champion/${formatChampName(champ)}.png`}
              alt=""
              className="h-full w-full scale-[1.12] object-cover"
              draggable={false}
            />
          ) : (
            <span className="block h-full w-full bg-filmdark" />
          )}
        </span>
      </span>
      {RoleIcon && (
        <span className="absolute -bottom-1 left-1/2 z-10 grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full bg-liquirice/95 shadow-[0_0_0_1px_rgba(215,216,217,0.18)]">
          <RoleIcon className="h-[11px] w-[11px]" />
        </span>
      )}
      {/* status pills — sit ON the upper slope of the hex (outside the glow
          filter so the text stays crisp); absolute, never push the layout */}
      {(otp || filled) && (
        <span className="absolute top-[1px] left-1/2 z-10 flex -translate-x-1/2 gap-1">
          {otp && (
            <span className="font-jetbrains font-semibold text-[9px] tracking-[0.1em] px-1.5 py-[2px] rounded-[2px] leading-none whitespace-nowrap bg-liquirice text-jade shadow-[0_0_0_1px_rgba(0,217,146,0.6),0_0_10px_rgba(0,217,146,0.35)]">
              OTP
            </span>
          )}
          {filled && (
            <span className="font-jetbrains font-semibold text-[9px] tracking-[0.1em] px-1.5 py-[2px] rounded-[2px] leading-none whitespace-nowrap bg-liquirice text-citrine shadow-[0_0_0_1px_rgba(255,182,21,0.55)]">
              FILLED
            </span>
          )}
        </span>
      )}
    </div>
  )
}

// ── One floating player plate — hex + game-ui info wing ─────────────
function PlayerPlate({ p, side, idx, focusedRiotId, rank, pStats, championMap, onGoToPlayer }: {
  p: Participant
  side: "blue" | "red"
  idx: number
  focusedRiotId: string
  rank?: RankEntry
  pStats?: PStats
  championMap: Record<number, string>
  onGoToPlayer: (riotId: string) => void
}) {
  const isFocused = p.riotId === focusedRiotId
  const isStreamerMode = !rank?.rank || rank.rank.toLowerCase() === "error"
  const mirror = side === "red"

  const raw = (p.riotId || p.summonerName || "").trim()
  const displayName = raw.split("#")[0]?.trim()
  const hidden = !displayName || raw.toLowerCase().includes("error")

  const champGames = pStats?.championGames ?? 0
  const champWr = pStats?.championWinrate ?? null
  const hasChampData = champWr != null && champGames > 0
  const champKda = pStats?.championKda ?? null
  const isFilled = (pStats?.isFilled ?? false) && !isStreamerMode

  const wrColor = !hasChampData ? "rgba(215,216,217,0.25)"
    : (champWr! >= 60 ? "#00d992" : champWr! < 45 ? "#fb7185" : "rgba(215,216,217,0.75)")

  // OTP read: ≥70% of their season games are on THIS champion (min sample so
  // a 2-games account doesn't read as one-trick)
  const seasonG = pStats?.seasonGames ?? 0
  const isOtp = !isStreamerMode && seasonG >= 10 && champGames / seasonG >= 0.7

  // total ranked winrate — the focus of the stat line
  const totalGames = (rank?.wins ?? 0) + (rank?.losses ?? 0)
  const totalWr = !isStreamerMode && totalGames > 0 ? Math.round(((rank?.wins ?? 0) / totalGames) * 100) : null
  const totalWrColor = totalWr == null ? "rgba(215,216,217,0.4)"
    : totalWr >= 60 ? "#00d992" : totalWr < 45 ? "#fb7185" : "rgba(215,216,217,0.92)"

  const rankStr = rank?.rank ?? ""

  return (
    // outer keeps the STATIC arc offset + per-plate lean, with its own
    // perspective() so the tilt is guaranteed to render in real 3D; the
    // entrance animation lives on the inner .lvh-in wrapper so its
    // fill-mode never clobbers this transform.
    <div
      className="lvh-tilt"
      style={{ transform: `translateX(${(mirror ? -1 : 1) * [0, 8, 13, 8, 0][idx]}px) perspective(750px) rotateY(${mirror ? -8 : 8}deg)` }}
    >
      <div
        className={cn("lvh-in flex items-center", mirror && "flex-row-reverse")}
        style={{
          ["--lvh-from" as any]: mirror ? "18px" : "-18px",
          animationDelay: `${120 + idx * 70}ms`,
        }}
      >
        <HexPortrait
          champ={championMap[p.championId]}
          side={side}
          focused={isFocused}
          role={(ROLES as readonly string[])[idx]}
          otp={isOtp}
          filled={isFilled}
        />

        {/* open info block — pure float, no container shape */}
        <div className={cn("flex min-w-0 flex-col gap-[3px]", mirror ? "mr-3.5 items-end text-right" : "ml-3.5")}>
            {/* name — quiet eyebrow (rank owns the plate) */}
            <div className={cn("flex items-center gap-2", mirror && "flex-row-reverse")}>
              {hidden || isStreamerMode ? (
                <span
                  className="font-orbitron text-[8px] font-bold uppercase tracking-[0.18em] px-1.5 py-[2px] rounded-[2px] border border-flash/15 whitespace-nowrap"
                  style={{
                    background: "linear-gradient(135deg, rgba(155,89,182,0.15), rgba(168,85,199,0.08))",
                    color: "rgba(168,85,199,0.8)",
                  }}
                >
                  Streamer mode
                </span>
              ) : (
                <span
                  onClick={() => p.riotId && onGoToPlayer(p.riotId)}
                  className={cn(
                    "cursor-clicker truncate font-chakrapetch text-[13px] font-semibold tracking-wide transition-colors hover:underline max-w-[190px]",
                    isFocused ? "text-jade" : "text-flash/80 hover:text-flash/100"
                  )}
                  style={{ textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
                >
                  {hidden ? "hidden" : displayName}
                </span>
              )}
            </div>

            {/* RANK — crystal clear */}
            {!isStreamerMode ? (
              <div className={cn("flex items-center gap-2", mirror && "flex-row-reverse")}>
                <img src={getRankImage(rankStr)} alt="" className="h-[24px] w-[24px] object-contain" draggable={false} />
                <span
                  className="whitespace-nowrap font-chakrapetch text-[15px] font-bold uppercase tracking-wide text-flash/95"
                  style={{ textShadow: "0 1px 10px rgba(0,0,0,0.85)" }}
                >
                  {rankStr}
                </span>
                {rank?.lp != null && (
                  <span className="whitespace-nowrap font-chakrapetch text-[13px] font-bold tabular-nums text-jade" style={{ textShadow: "0 0 12px rgba(0,217,146,0.45)" }}>
                    {rank.lp} LP
                  </span>
                )}
              </div>
            ) : (
              <div className="flex h-[24px] items-center">
                <span className="font-chakrapetch text-[12px] font-bold tracking-wide text-flash/25">— DATA HIDDEN —</span>
              </div>
            )}

            {/* stat line: TOTAL WR (the focus) → champ WR → KDA. No separators —
                each stat is a label+value pair, spacing does the dividing. */}
            {!isStreamerMode && (
              <div className={cn("flex items-baseline gap-3.5", mirror && "flex-row-reverse")}>
                {totalWr != null && (
                  <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="font-jetbrains text-[8px] uppercase tracking-[0.18em] text-flash/40">WR</span>
                    <span className="font-chakrapetch text-[14px] font-bold tabular-nums" style={{ color: totalWrColor, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}>
                      {totalWr}%
                    </span>
                  </span>
                )}
                {hasChampData && (
                  <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="font-jetbrains text-[8px] uppercase tracking-[0.18em] text-flash/40">Champ</span>
                    <span className="font-chakrapetch text-[11.5px] font-semibold tabular-nums" style={{ color: wrColor }}>
                      {champWr}%
                    </span>
                  </span>
                )}
                {champKda != null && (
                  <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="font-jetbrains text-[8px] uppercase tracking-[0.18em] text-flash/40">KDA</span>
                    <span className="font-chakrapetch text-[11.5px] font-semibold tabular-nums text-flash/75">
                      {champKda.toFixed(1)}
                    </span>
                  </span>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export function LiveViewer({ puuid, riotId, region, controlledOpen, onControlledOpenChange }: LiveViewerProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = typeof controlledOpen === "boolean"
  const open = isControlled ? controlledOpen! : internalOpen
  const setOpen = isControlled ? (onControlledOpenChange as (o: boolean) => void) : setInternalOpen

  const [championMap, setChampionMap] = useState<Record<number, string>>({})
  const [game, setGame] = useState<LiveGame | null>(null)
  const [ranks, setRanks] = useState<Record<string, RankEntry>>({})
  const navigate = useNavigate()
  const [orderedTeams, setOrderedTeams] = useState<{
    100: Partial<Record<RoleKey, Participant>>
    200: Partial<Record<RoleKey, Participant>>
  }>({ 100: {}, 200: {} })

  const [liveStats, setLiveStats] = useState<Record<string, PStats>>({})

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
        // Assigned role per riotId — needed by the stats endpoint for a correct
        // FILL detection (an empty role used to make everyone look autofilled).
        const roleByRiotId: Record<string, string> = {}
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
          const rankMap: Record<string, RankEntry> = {}
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
          for (const teamId of [100, 200] as const) {
            for (const [role, pl] of Object.entries(rolesData.roles[teamId] ?? {})) {
              const rid = (pl as Participant)?.riotId
              if (rid) roleByRiotId[rid] = role
            }
          }
        }

        const champRes = await fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
        const champData = await champRes.json()
        const idToName: Record<number, string> = {}
        Object.values(champData.data).forEach((champ: any) => {
          idToName[parseInt(champ.key)] = champ.name
        })
        setChampionMap(idToName)

        // Champion winrate/KDA + filled detection from our DB
        if (gameData?.game) {
          try {
            const statsParticipants: { riotId: string; championName: string; role: string }[] = []
            for (const p of gameData.game.participants) {
              if (p.riotId) {
                statsParticipants.push({
                  riotId: p.riotId,
                  championName: idToName[p.championId] ?? "",
                  role: roleByRiotId[p.riotId] ?? "",
                })
              }
            }
            if (statsParticipants.length > 0) {
              const statsRes = await fetch(`${API_BASE_URL}/api/livegame/stats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ participants: statsParticipants, region }),
              })
              if (statsRes.ok) {
                const statsData = await statsRes.json()
                if (statsData?.stats) setLiveStats(statsData.stats)
              }
            }
          } catch (e) {
            console.error("Failed to fetch livegame stats:", e)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    fetchGameAndChamps()
  }, [open, puuid])

  const goToPlayer = (rid: string) => {
    setOpen(false)
    const [riotName, riotTag] = rid.split("#")
    navigate(`/summoners/${region}/${riotName.replace(/\s+/g, "+")}-${riotTag}`)
  }

  const teamPlayers = (teamId: 100 | 200) =>
    ROLES.map(role => orderedTeams[teamId][role]).filter(Boolean) as Participant[]

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

      {/* No panel, no box — a properly DARK dim + floating visor elements. */}
      <DialogContent
        overlayClassName="bg-[#020608]/85 backdrop-blur-md"
        className="w-auto max-w-[1380px] bg-transparent border-none p-0 text-flash top-[10%] translate-y-0 [&>button:last-child]:hidden shadow-none"
      >
        <style>{HUD_CSS}</style>

        <div className="lvh-sway" style={{ perspective: "1000px" }}>
          {/* ── floating header readout ── */}
          <div className="lvh-head mb-9 flex items-center justify-center gap-4" style={{ transform: "rotateX(9deg)" }}>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="font-jetbrains text-[10px] uppercase tracking-[0.24em] text-red-400/80">Live Game</span>
            </div>
            <ElapsedClock startTime={game?.gameStartTime} />
            {queueName && (
              <>
                <span className="text-red-400/20 text-[10px]">◈</span>
                <span className="font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/35">{queueName}</span>
              </>
            )}
          </div>

          {/* ── two floating columns, close together, tilted toward you ── */}
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-32">
            <div className="lvh-col-l flex flex-col gap-4">
              <span className="lvh-in font-jetbrains text-[9px] uppercase tracking-[0.26em] text-[#5BA8E6]/70" style={{ ["--lvh-from" as any]: "-18px" }}>
                ◈ Blue side
              </span>
              {teamPlayers(100).map((p, idx) => (
                <PlayerPlate
                  key={p.summonerName || p.riotId || idx}
                  p={p} side="blue" idx={idx}
                  focusedRiotId={riotId}
                  rank={ranks[p.riotId]}
                  pStats={liveStats[p.riotId]}
                  championMap={championMap}
                  onGoToPlayer={goToPlayer}
                />
              ))}
            </div>

            <div className="lvh-col-r flex flex-col items-end gap-4">
              <span className="lvh-in font-jetbrains text-[9px] uppercase tracking-[0.26em] text-[#e0503f]/75" style={{ ["--lvh-from" as any]: "18px" }}>
                Red side ◈
              </span>
              {teamPlayers(200).map((p, idx) => (
                <PlayerPlate
                  key={p.summonerName || p.riotId || idx}
                  p={p} side="red" idx={idx}
                  focusedRiotId={riotId}
                  rank={ranks[p.riotId]}
                  pStats={liveStats[p.riotId]}
                  championMap={championMap}
                  onGoToPlayer={goToPlayer}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
