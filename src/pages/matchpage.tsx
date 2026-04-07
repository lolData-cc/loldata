import { useEffect, useState, useRef } from "react"
import { calculateLolDataScores } from "@/utils/calculatePlayerRating";
import splashPositionMap from "@/converters/splashPositionMap"
import { useParams, useNavigate, useLocation, Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import queueMap from "@/converters/queueMap"
import { formatDate } from "@/converters/dateMap"
import type { Participant } from "@/assets/types/riot"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs"
// Recharts removed — damage bars now use custom CSS
import { KillMap } from "@/components/killmap";
import { API_BASE_URL, cdnBaseUrl, cdnSplashUrl, summonerSpellUrl } from "@/config";
import { getRankImage } from "@/utils/rankIcons";
import { supabase } from "@/lib/supabaseClient";
import { getKeystoneIcon, getStyleIcon, getKeystoneName, getStyleName } from "@/constants/runes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

// ── Platform ID → backend region key ────────────────────────────────
const PLATFORM_TO_REGION: Record<string, string> = {
  EUW1: "euw", EUW: "euw",
  NA1: "na",   NA: "na",
  KR: "kr",
  JP1: "jp",
  BR1: "br",
  LA1: "la1",  LA2: "la2",
  OC1: "oc",
  TR1: "tr",   RU: "ru",
  PH2: "ph",   SG2: "sg",   TH2: "th",   TW2: "tw",   VN2: "vn",
};

function extractRegionFromMatchId(matchId: string): string | undefined {
  const platform = matchId.split("_")[0]?.toUpperCase();
  return platform ? PLATFORM_TO_REGION[platform] : undefined;
}

// ── Glass card reusable classes ─────────────────────────────────────
const glassCard = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/25 backdrop-blur-lg saturate-150",
  "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
);


// ── Section Header ──────────────────────────────────────────────────
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-bold font-jetbrains uppercase text-flash/40 mb-4 mt-10">
      <span className="text-jade/40 text-sm">◈</span>
      {children}
    </h2>
  );
}

export default function MatchPage() {
  const { matchId } = useParams()
  const location = useLocation()
  const region = location.state?.region || (matchId ? extractRegionFromMatchId(matchId) : undefined);
  const focusedPlayerPuuid = location.state?.focusedPlayerPuuid as string | undefined
  const [match, setMatch] = useState<{ info: { participants: Participant[];[key: string]: any } } | null>(null)
  const [timeline, setTimeline] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [playerRanks, setPlayerRanks] = useState<Record<string, { rank: string; lp: number }>>({})
  const [proUsernames, setProUsernames] = useState<Set<string>>(new Set());
  const [streamerUsernames, setStreamerUsernames] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const getAverage = (key: string, participants: Participant[]) => {
    const total = participants.reduce((sum: number, p: Participant) => sum + (p[key as keyof Participant] as number || 0), 0)
    return Math.round(total / participants.length)
  }

  const getMax = (key: string, participants: Participant[]) => {
    return Math.max(...participants.map((p: Participant) => (p[key as keyof Participant] as number) || 0), 1)
  }

  /** Animated stat bar — grows from 0 on mount with staggered delay */
  function StatBar({ pct, avgPct, isAboveAvg, delay }: { pct: number; avgPct: number; isAboveAvg: boolean; delay: number }) {
    const [w, setW] = useState(0)
    const [avgW, setAvgW] = useState(0)
    useEffect(() => {
      const t1 = setTimeout(() => setW(pct), delay)
      const t2 = setTimeout(() => setAvgW(avgPct), delay + 80)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [pct, avgPct, delay])

    return (
      <div className="relative h-[22px] w-full rounded-[3px] bg-white/[0.04] border border-white/[0.04] overflow-hidden">
        {/* Player fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-[2px]"
          style={{
            width: `${w}%`,
            transition: `width 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            background: isAboveAvg
              ? "linear-gradient(90deg, rgba(0,217,146,0.08) 0%, rgba(0,217,146,0.35) 100%)"
              : "linear-gradient(90deg, rgba(215,216,217,0.04) 0%, rgba(215,216,217,0.15) 100%)",
            boxShadow: isAboveAvg
              ? "inset 0 0 12px rgba(0,217,146,0.1), 2px 0 8px rgba(0,217,146,0.2)"
              : "none",
          }}
        />

        {/* Glowing edge */}
        {w > 2 && (
          <div
            className="absolute top-0 bottom-0 w-[2px]"
            style={{
              left: `${w}%`,
              transition: `left 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, opacity 300ms ease ${delay + 200}ms`,
              opacity: w > 0 ? 1 : 0,
              background: isAboveAvg ? "#00d992" : "rgba(215,216,217,0.3)",
              boxShadow: isAboveAvg
                ? "0 0 6px rgba(0,217,146,0.6), 0 0 12px rgba(0,217,146,0.3)"
                : "none",
            }}
          />
        )}

        {/* Average marker */}
        <div
          className="absolute top-0 bottom-0 w-[1px]"
          style={{
            left: `${avgW}%`,
            transition: `left 500ms cubic-bezier(0.16, 1, 0.3, 1) ${delay + 100}ms, opacity 300ms ease ${delay + 100}ms`,
            opacity: avgW > 0 ? 1 : 0,
            background: "rgba(255,182,21,0.5)",
          }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[5px] h-[5px] rounded-full"
            style={{
              background: "#FFB615",
              boxShadow: "0 0 4px rgba(255,182,21,0.6)",
            }}
          />
        </div>

        {/* Percentage label */}
        {pct >= 15 && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px] tracking-wider tabular-nums"
            style={{
              color: isAboveAvg ? "rgba(0,217,146,0.5)" : "rgba(215,216,217,0.2)",
              transition: `opacity 300ms ease ${delay + 400}ms`,
              opacity: w > 0 ? 1 : 0,
            }}
          >
            {pct}%
          </span>
        )}
      </div>
    )
  }

  useEffect(() => {
    Promise.all([
      supabase.from("pro_players").select("username"),
      supabase.from("pro_player_accounts").select("username"),
    ]).then(([{ data: proData }, { data: accData }]) => {
      const names = new Set<string>();
      for (const r of proData ?? []) if (r.username) names.add(r.username.toLowerCase());
      for (const r of accData ?? []) if (r.username) names.add(r.username.toLowerCase());
      setProUsernames(names);
    });
    supabase.from("streamers").select("lol_nametag").then(({ data }) => {
      if (data) setStreamerUsernames(new Set(data.filter((r) => r.lol_nametag).map((r) => r.lol_nametag.toLowerCase())));
    });
  }, []);

  useEffect(() => {
    async function fetchMatch() {
      try {
        const [res, resTimeline] = await Promise.all([
          fetch(`${API_BASE_URL}/api/matchinfo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId, region }),
          }),
          fetch(`${API_BASE_URL}/api/matchtimeline`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ matchId, region }),
          }),
        ]);
        const timelineData = await resTimeline.json();
        setTimeline(timelineData.timeline);

        const rawText = await res.text();
        let data;
        try {
          data = JSON.parse(rawText);
        } catch {
          setError("Risposta API non valida");
          return;
        }

        if (!data || typeof data !== "object" || !data.match || !data.match.info || !Array.isArray(data.match.info.participants)) {
          setError("Dati API incompleti");
          return;
        }

        setMatch(data.match);
      } catch {
        setError("Match non trovato o errore di rete.");
      }
    }

    if (matchId && region) {
      fetchMatch();
    } else {
      setError("Dati URL mancanti");
    }
  }, [matchId, region]);

  // Fetch player ranks after match loads
  useEffect(() => {
    if (!match) return;
    const puuids = match.info.participants.map((p: any) => p.puuid).filter(Boolean);
    if (puuids.length === 0) return;

    fetch(`${API_BASE_URL}/api/player-ranks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puuids, region: region?.toUpperCase() }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.ranks) setPlayerRanks(data.ranks);
      })
      .catch(() => {});
  }, [match]);

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="font-mono text-[11px] tracking-[0.2em] text-error/70 uppercase">{error}</span>
    </div>
  )
  if (!match) return null

  const participants = match.info?.participants ?? []
  const { mvpWin, mvpLose } = calculateLolDataScores(participants);
  const mvpPlayer = participants.find(p => p.puuid === mvpWin);

  const totalKillsBlue = participants
    .filter((p: Participant) => p.teamId === 100)
    .reduce((sum: number, p: Participant) => sum + p.kills, 0)

  const totalKillsRed = participants
    .filter((p: Participant) => p.teamId === 200)
    .reduce((sum: number, p: Participant) => sum + p.kills, 0)

  const blueWon = participants.some((p: any) => p.teamId === 100 && p.win)
  const redWon = participants.some((p: any) => p.teamId === 200 && p.win)
  const blueTeam = participants.filter((p) => p.teamId === 100)
  const redTeam = participants.filter((p) => p.teamId === 200)

  const gameDuration = match.info?.gameDuration ?? 0;
  const durationStr = `${Math.floor(gameDuration / 60)}:${(gameDuration % 60).toString().padStart(2, "0")}`;

  const getKP = (p: Participant, team: Participant[]) => {
    const teamKills = team.reduce((sum: number, curr: Participant) => sum + curr.kills, 0)
    return teamKills === 0 ? "0%" : `${Math.round(((p.kills + p.assists) / teamKills) * 100)}%`
  }

  const renderItems = (p: Participant) => (
    <div className="flex gap-0.5">
      {Array.from({ length: 7 }, (_, i) => {
        const id = (p as unknown as Record<string, number>)[`item${i}`]
        return id > 0 ? (
          <img
            key={i}
            src={`${cdnBaseUrl()}/img/item/${id}.png`}
            className="w-5 h-5 rounded-[3px] ring-1 ring-white/10"
          />
        ) : (
          <div key={i} className="w-5 h-5 rounded-[3px] bg-white/[0.03] ring-1 ring-white/[0.06]" />
        )
      })}
    </div>
  )

  // ── Player row for scoreboard ─────────────────────────────────────
  function PlayerRow({ p, team, side }: { p: Participant; team: Participant[]; side: "blue" | "red" }) {
    const isMvp = p.puuid === mvpWin;
    const isAce = p.puuid === mvpLose;
    const isFocused = p.puuid === focusedPlayerPuuid;
    const teamColor = side === "blue" ? "text-cyan-300/90" : "text-rose-300/90";
    const deaths = p.deaths;
    const kda = deaths === 0 ? "Perfect" : ((p.kills + p.assists) / deaths).toFixed(1);

    return (
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 transition-all",
        "border-b border-white/[0.04] last:border-b-0",
        "hover:bg-white/[0.02]",
        isFocused && "bg-jade/[0.04]"
      )}>
        {/* Champion + spells */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative w-8 h-8">
            <img
              src={`${cdnBaseUrl()}/img/champion/${p.championName}.png`}
              className="w-8 h-8 rounded-[4px] ring-1 ring-white/10"
            />
            {(isMvp || isAce) && (
              <span
                className={cn(
                  "absolute -top-1 -right-1 text-[7px] px-0.5 rounded-sm z-10 font-mono font-bold",
                  isMvp && "bg-pine text-jade",
                  isAce && "bg-[#3A2C45] text-[#C693F1]"
                )}
                style={{ lineHeight: '1' }}
              >
                {isMvp ? "MVP" : "ACE"}
              </span>
            )}
            {p.champLevel && (
              <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-black/90 text-flash/50 rounded px-0.5 leading-none font-mono">
                {p.champLevel}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <img src={summonerSpellUrl(p.summoner1Id)} className="w-4 h-4 rounded-[2px]" />
            <img src={summonerSpellUrl(p.summoner2Id)} className="w-4 h-4 rounded-[2px]" />
          </div>
          {p.perks?.styles && p.perks.styles.length >= 2 && (
            <div className="flex flex-col gap-0.5">
              {(() => {
                const keystoneId = p.perks!.styles[0]?.selections?.[0]?.perk;
                const keystoneSrc = keystoneId ? getKeystoneIcon(keystoneId) : null;
                const keystoneName = keystoneId ? getKeystoneName(keystoneId) : null;
                return (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                          {keystoneSrc && <img src={keystoneSrc} alt={keystoneName ?? "Keystone"} className="w-3.5 h-3.5 rounded-full" />}
                        </div>
                      </TooltipTrigger>
                      {keystoneName && (
                        <TooltipContent side="top" className="text-xs">
                          {keystoneName}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
              {(() => {
                const subStyleId = p.perks!.styles[1]?.style;
                const subStyleSrc = subStyleId ? getStyleIcon(subStyleId) : null;
                const subStyleName = subStyleId ? getStyleName(subStyleId) : null;
                return (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                          {subStyleSrc && <img src={subStyleSrc} alt={subStyleName ?? "Secondary"} className="w-3.5 h-3.5 rounded-full opacity-70" />}
                        </div>
                      </TooltipTrigger>
                      {subStyleName && (
                        <TooltipContent side="top" className="text-xs">
                          {subStyleName}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            </div>
          )}
        </div>

        {/* Name + Rank */}
        <div className="w-[110px] min-w-0 shrink-0">
          {(() => {
            const nameKey = p.riotIdGameName && p.riotIdTagline ? `${p.riotIdGameName}#${p.riotIdTagline}`.toLowerCase() : "";
            const isPro = nameKey && proUsernames.has(nameKey);
            const isStr = nameKey && !isPro && streamerUsernames.has(nameKey);
            return (
              <div className="flex items-center gap-1">
                {p.riotIdGameName && p.riotIdTagline ? (
                  <Link
                    to={`/summoners/${region}/${(p.riotIdGameName || "").replace(/\s+/g, "+")}-${p.riotIdTagline}`}
                    className={cn(
                      "truncate text-[11px] font-mono tracking-wide hover:underline cursor-clicker",
                      isFocused ? "text-jade font-bold" : teamColor
                    )}
                    onClick={(e) => {
                      sessionStorage.setItem("summonerScrollY", window.scrollY.toString());
                      e.stopPropagation();
                    }}
                  >
                    {p.riotIdGameName}
                  </Link>
                ) : (
                  <span className="truncate text-[11px] font-mono text-flash/40">{p.riotIdGameName ?? "Unknown"}</span>
                )}
                {(isPro || isStr) && (
                  <span
                    className="shrink-0 text-[7px] font-black leading-none px-[3px] py-[1px] rounded-[3px] tracking-wide"
                    style={{
                      background: isPro
                        ? "linear-gradient(135deg, #00d992, #00b8ff)"
                        : "linear-gradient(135deg, #7b42a1, #a855c7)",
                      color: isPro ? "#040A0C" : "#e0d0f0",
                      boxShadow: isPro
                        ? "0 0 6px rgba(0,217,146,0.5), 0 0 12px rgba(0,184,255,0.25)"
                        : "0 0 6px rgba(123,66,161,0.4), 0 0 10px rgba(168,85,199,0.2)",
                    }}
                  >
                    {isPro ? "PRO" : "STR"}
                  </span>
                )}
              </div>
            );
          })()}
          {/* Rank badge */}
          {(() => {
            const r = playerRanks[p.puuid];
            if (!r || !r.rank || r.rank === "Unranked") return null;
            return (
              <div className="flex items-center gap-1 mt-0.5">
                <img src={getRankImage(r.rank)} alt="" className="w-4 h-4 object-contain" />
                <span className="text-[10px] font-mono text-flash/40 truncate">{r.rank} {r.lp ? `${r.lp}LP` : ""}</span>
              </div>
            );
          })()}
        </div>

        {/* KDA */}
        <div className="w-[70px] shrink-0 text-center">
          <span className="text-[11px] font-mono text-flash/70">
            {p.kills}/{p.deaths}/{p.assists}
          </span>
          <div className="text-[9px] font-mono text-flash/25 tracking-wider">
            {kda} KDA
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 min-w-0">
          {renderItems(p)}
        </div>

        {/* Gold */}
        <div className="w-[55px] shrink-0 text-right">
          <span className="text-[10px] font-mono text-citrine/60">{(p.goldEarned / 1000).toFixed(1)}k</span>
        </div>

        {/* KP */}
        <div className="w-[40px] shrink-0 text-right">
          <span className="text-[10px] font-mono text-flash/35">{getKP(p, team)}</span>
        </div>

        {/* CS */}
        <div className="w-[45px] shrink-0 text-right">
          <span className="text-[10px] font-mono text-flash/35">
            {(p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0)} cs
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-flash">

      {/* ═══════════════════════════════════════════════════════════════
          HERO BANNER
          ═══════════════════════════════════════════════════════════ */}
      <div className="relative w-full h-[380px] overflow-hidden">
        {/* Splash art */}
        {mvpPlayer && (
          <img
            src={cdnSplashUrl(mvpPlayer.championName)}
            alt={mvpPlayer.championName}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `center ${splashPositionMap[mvpPlayer.championName] || "15%"}` }}
            draggable={false}
          />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-liquirice/70" />

        {/* Scanlines */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] z-[2]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.8)_100%)]" />

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" />

        {/* Navbar */}
        <div className="relative z-10 w-full">
          <div className="w-[65%] mx-auto">
            <Navbar />
          </div>
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 mt-12 gap-3">
          {/* Queue + date */}
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.2em] uppercase text-flash/25">
            <span>{queueMap[match.info?.queueId] || "Unknown Queue"}</span>
            <span className="text-jade/20">◈</span>
            <span>{formatDate(match.info?.gameEndTimestamp)}</span>
            <span className="text-jade/20">◈</span>
            <span>{durationStr}</span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-8">
            <span className={cn(
              "font-mono text-sm tracking-[0.15em] uppercase",
              blueWon ? "text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "text-cyan-300/30"
            )}>
              Blue Side
            </span>

            <div className="flex items-center gap-4">
              <span className={cn(
                "text-5xl font-mono tabular-nums",
                blueWon ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]" : "text-cyan-300/40"
              )}>
                {totalKillsBlue}
              </span>
              <span className="text-flash/10 font-mono text-2xl">/</span>
              <span className={cn(
                "text-5xl font-mono tabular-nums",
                redWon ? "text-rose-300 drop-shadow-[0_0_12px_rgba(251,113,133,0.3)]" : "text-rose-300/40"
              )}>
                {totalKillsRed}
              </span>
            </div>

            <span className={cn(
              "font-mono text-sm tracking-[0.15em] uppercase",
              redWon ? "text-rose-300 drop-shadow-[0_0_10px_rgba(251,113,133,0.4)]" : "text-rose-300/30"
            )}>
              Red Side
            </span>
          </div>

          {/* Match ID */}
          <span className="font-mono text-[9px] tracking-[0.15em] text-flash/10 uppercase mt-1">
            {matchId}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE CONTENT
          ═══════════════════════════════════════════════════════════ */}
      {/* Back button — sticky, left of content */}
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

      <div className="w-[65%] mx-auto -mt-6 relative z-20">

        {/* ── SCOREBOARD ──────────────────────────────────────────── */}
        <SectionHeader>Scoreboard</SectionHeader>

        <div className={glassCard}>
          <div className="relative z-10 flex">
            {/* Blue team — left half */}
            <div className="flex-1 border-r border-white/[0.04]">
              {/* Accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 z-10 bg-gradient-to-b from-cyan-400/80 to-cyan-400/10 rounded-l-md" />

              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
                <span className="text-cyan-400/50 text-[10px]">◈</span>
                <span className={cn(
                  "font-mono text-[10px] tracking-[0.15em] uppercase",
                  blueWon ? "text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]" : "text-cyan-300/50"
                )}>
                  Blue Side
                </span>
                {blueWon && (
                  <span className="font-mono text-[8px] tracking-[0.2em] text-jade/50 uppercase ml-1">Win</span>
                )}
              </div>

              {/* Players */}
              {blueTeam.map((p) => (
                <PlayerRow key={p.puuid} p={p} team={blueTeam} side="blue" />
              ))}
            </div>

            {/* Red team — right half */}
            <div className="flex-1">
              {/* Accent bar */}
              <div className="absolute right-0 top-0 bottom-0 w-1 z-10 bg-gradient-to-b from-rose-400/80 to-rose-400/10 rounded-r-md" />

              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06]">
                <span className="text-rose-400/50 text-[10px]">◈</span>
                <span className={cn(
                  "font-mono text-[10px] tracking-[0.15em] uppercase",
                  redWon ? "text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]" : "text-rose-300/50"
                )}>
                  Red Side
                </span>
                {redWon && (
                  <span className="font-mono text-[8px] tracking-[0.2em] text-jade/50 uppercase ml-1">Win</span>
                )}
              </div>

              {/* Players */}
              {redTeam.map((p) => (
                <PlayerRow key={p.puuid} p={p} team={redTeam} side="red" />
              ))}
            </div>
          </div>
        </div>

        {/* ── STATISTICS ──────────────────────────────────────────── */}
        <SectionHeader>Statistics</SectionHeader>

        <Tabs defaultValue={focusedPlayerPuuid || participants[0]?.puuid} className="w-full">
          <div className="flex gap-3">

            {/* Player sidebar */}
            <div className={cn(glassCard, "w-[22%] shrink-0")}>
              <div className="relative z-10 p-1.5 h-full">
                <TabsList className="flex flex-col justify-between w-full h-full bg-transparent">
                  {participants.map((p) => {
                    const isBlue = p.teamId === 100;
                    return (
                      <TabsTrigger
                        key={p.puuid}
                        value={p.puuid}
                        className={cn(
                          "flex items-center gap-2 text-left px-2 py-1.5 rounded-[4px] w-full justify-start transition-all cursor-clicker",
                          "font-mono text-[10px] tracking-wide",
                          "text-flash/35 hover:text-flash/60 hover:bg-white/[0.03]",
                          "data-[state=active]:bg-white/[0.06] data-[state=active]:text-flash/90",
                          "data-[state=active]:shadow-[inset_0_0_12px_rgba(0,217,146,0.04)]"
                        )}
                      >
                        <img
                          src={`${cdnBaseUrl()}/img/champion/${p.championName}.png`}
                          className="w-6 h-6 rounded-[3px] ring-1 ring-white/10 shrink-0"
                        />
                        <span className={cn(
                          "truncate",
                          p.puuid === focusedPlayerPuuid && "text-jade font-bold"
                        )}>
                          {p.riotIdGameName ?? "Unknown"}
                        </span>
                        {(() => {
                          const nk = p.riotIdGameName && p.riotIdTagline ? `${p.riotIdGameName}#${p.riotIdTagline}`.toLowerCase() : "";
                          const isPro = nk && proUsernames.has(nk);
                          const isStr = nk && !isPro && streamerUsernames.has(nk);
                          if (!isPro && !isStr) return null;
                          return (
                            <span
                              className="shrink-0 text-[7px] font-black leading-none px-[2px] py-[1px] rounded-[2px] tracking-wide"
                              style={{
                                background: isPro
                                  ? "linear-gradient(135deg, #00d992, #00b8ff)"
                                  : "linear-gradient(135deg, #7b42a1, #a855c7)",
                                color: isPro ? "#040A0C" : "#e0d0f0",
                              }}
                            >
                              {isPro ? "PRO" : "STR"}
                            </span>
                          );
                        })()}
                        <span className={cn(
                          "ml-auto text-[8px] opacity-40 shrink-0",
                          isBlue ? "text-cyan-300" : "text-rose-300"
                        )}>
                          ◈
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>
            </div>

            {/* Stats content */}
            <div className={cn(glassCard, "flex-1")}>
                <div className="relative z-10 p-3">
                {participants.map((p) => (
                  <TabsContent key={p.puuid} value={p.puuid} className="mt-0">
                    <div className="space-y-2">
                      {[
                        { label: "Damage Dealt", key: "totalDamageDealtToChampions" },
                        { label: "Damage Taken", key: "totalDamageTaken" },
                        { label: "Heal", key: "totalHeal" },
                        { label: "Damage to Objectives", key: "damageDealtToObjectives" },
                        { label: "Vision Score", key: "visionScore" },
                        { label: "Wards Placed", key: "wardsPlaced" },
                        { label: "Wards Killed", key: "wardsKilled" },
                      ].map(({ label, key }, idx) => {
                        const playerValue = (p as unknown as Record<string, number>)[key] ?? 0
                        const avgValue = getAverage(key, participants)
                        const maxValue = getMax(key, participants)
                        const pct = Math.round((playerValue / maxValue) * 100)
                        const avgPct = Math.round((avgValue / maxValue) * 100)
                        const isAboveAvg = playerValue >= avgValue

                        return (
                          <div key={key}>
                            <div className="flex items-baseline justify-between mb-1">
                              <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-flash/30">{label}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[10px] text-citrine/40 tabular-nums">{avgValue.toLocaleString()} avg</span>
                                <span className={cn(
                                  "font-mono text-[11px] tabular-nums font-medium",
                                  isAboveAvg ? "text-jade" : "text-flash/50"
                                )}>{playerValue.toLocaleString()}</span>
                              </div>
                            </div>
                            <StatBar pct={pct} avgPct={avgPct} isAboveAvg={isAboveAvg} delay={idx * 60} />
                          </div>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-5 mt-3 pt-2.5 border-t border-white/[0.06]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-[3px] rounded-full" style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.1), rgba(0,217,146,0.5))" }} />
                        <span className="font-mono text-[9px] tracking-[0.15em] text-flash/25 uppercase">Player</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-[1px] h-3" style={{ background: "rgba(255,182,21,0.5)" }}>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[4px] h-[4px] rounded-full" style={{ background: "#FFB615" }} />
                        </div>
                        <span className="font-mono text-[9px] tracking-[0.15em] text-flash/25 uppercase">Avg</span>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </div>
            </div>
          </div>
        </Tabs>

        {/* ── MATCH EVENTS ────────────────────────────────────────── */}
        {timeline && <KillMap timeline={timeline} participants={participants} />}

        <Footer className="mt-24" />
      </div>
    </div>
  )
}
