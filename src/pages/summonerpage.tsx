import React from "react"
import type { MatchWithWin, SummonerInfo, ChampionStats, Participant } from "@/assets/types/riot"
import { motion, AnimatePresence } from "framer-motion"
import { calculateLolDataScores } from "@/utils/calculatePlayerRating";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { LiveViewer } from "@/components/liveviewer"
import { ChevronDown, ChevronRight, ChevronUp, RotateCw, Search, BarChart3, Flag, SlidersHorizontal, X } from "lucide-react"
import { getRankImage } from "@/utils/rankIcons"
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons"
import { getWinrateClass } from '@/utils/winratecolor'
import { ChampionPicker } from "@/components/championpicker"
import { getKdaClass } from '@/utils/kdaColor'
import { getKdaBackgroundStyle } from '@/utils/kdaColor'
import { formatStat } from "@/utils/formatStat"
import { timeAgo } from '@/utils/timeAgo';
import { cdnBaseUrl, cdnSplashUrl, getCdnVersion, normalizeChampName, summonerSpellUrl } from "@/config"
import { JunglePlaystyleBadge, JungleStartingCampBadge, JungleInvadeBadge } from "@/components/jungleplaystylebadge";
import { getKeystoneIcon, getStyleIcon, getKeystoneName, getStyleName } from "@/constants/runes";
import { PlayerAnalysisDialog } from "@/components/PlayerAnalysisDialog";
import { checkUserFlags } from "@/converters/checkUserFlags";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
// import { getPlayerBadges } from "@/utils/badges";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { UpdateButton } from "@/components/update"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ShowMoreMatches } from "@/components/showmorematches"
import { API_BASE_URL } from "@/config"
import UltraTechBackground from "@/components/techdetails"
import { useDisableTechBackground } from "@/hooks/useDisableTechBackground"
import { useDisableMatchTransition } from "@/hooks/useDisableMatchTransition"
import { useDisableMatchGrouping } from "@/hooks/useDisableMatchGrouping"
import { useEnableColoredMatchBg } from "@/hooks/useEnableColoredMatchBg"
import { useBlueWinTint } from "@/hooks/useBlueWinTint"
import { useEnableMatchCentering } from "@/hooks/useEnableMatchCentering"
import { useHideRemakeMatches } from "@/hooks/useHideRemakeMatches"
import { useStatsBarPrefs } from "@/hooks/useStatsBarPrefs"
import { useContextMenuActions } from "@/hooks/useContextMenuActions"
import { useClickToExpandMatch } from "@/hooks/useClickToExpandMatch"
import { useAuth } from "@/context/authcontext"
import { Error404 } from "@/components/error404";
import { Tabs, TabsTrigger, TabsContent, TabsList } from "@/components/ui/tabs";
import { AnimatedTabsList } from "@/components/animated-tabs-list";

import { PlayerHoverCard } from "@/components/playerhovercard";
import { TeamLogo } from "@/components/teamlogo";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { calculatePlayerRating } from "@/utils/calculatePlayerRating";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { GlassOverlays } from "@/components/ui/glass-overlays";

const itemKeys: (keyof Participant)[] = [
  "item0",
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6"
];



function getMatchTimestamp(m: MatchWithWin["match"]["info"]) {
  return m.gameEndTimestamp ?? m.gameStartTimestamp ?? m.gameCreation;
}

function dayKeyFromTs(ts: number) {
  const d = new Date(ts);
  // yyyy-mm-dd in local time
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}



function dayLabelFromKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (same(date, today)) return "Today";
  if (same(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}

function formatPlayedTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  // mostriamo ore e minuti; i secondi solo se < 1 min
  if (h > 0) return `${h} ${h === 1 ? "hour" : "hours"} ${m} ${m === 1 ? "minute" : "minutes"}`;
  if (m > 0) return `${m} ${m === 1 ? "minute" : "minutes"}`;
  return `${s} ${s === 1 ? "second" : "seconds"}`;
}

export default function SummonerPage() {
  const { disabled: techBgDisabled } = useDisableTechBackground()
  const { disabled: matchTransitionDisabled } = useDisableMatchTransition()
  const { disabled: matchGroupingDisabled } = useDisableMatchGrouping()
  const { enabled: coloredMatchBg } = useEnableColoredMatchBg()
  const { enabled: blueWinTint } = useBlueWinTint()
  const { enabled: matchCenteringEnabled } = useEnableMatchCentering()
  const { enabled: hideRemakes } = useHideRemakeMatches()
  const { hidden: statsBarHidden, visibleStats } = useStatsBarPrefs()
  const { enabled: contextMenuMode } = useContextMenuActions()
  const { enabled: clickToExpand } = useClickToExpandMatch()
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null)
  const { session: authSession } = useAuth()
  const [matches, setMatches] = useState<MatchWithWin[]>([])
  const [analysisMap, setAnalysisMap] = useState<Record<string, { loading: boolean; data: any; open: boolean }>>({})
  const [enteringMatchId, setEnteringMatchId] = useState<string | null>(null)

  function handleEnterMatch(matchId: string) {
    sessionStorage.setItem("summonerScrollY", String(window.scrollY));
    if (matchTransitionDisabled) {
      navigate(`/matches/${matchId}`, { state: { focusedPlayerPuuid: summonerInfo?.puuid, region } });
      return;
    }
    setEnteringMatchId(matchId);
    setTimeout(() => {
      navigate(`/matches/${matchId}`, { state: { focusedPlayerPuuid: summonerInfo?.puuid, region } });
    }, 950);
  }

  async function fetchAnalysis(matchId: string) {
    const entry = analysisMap[matchId];

    // Already fetched — just toggle open/closed
    if (entry && !entry.loading) {
      setAnalysisMap(prev => ({ ...prev, [matchId]: { ...prev[matchId], open: !prev[matchId].open } }));
      return;
    }

    // Currently loading — do nothing
    if (entry?.loading) return;

    // First time — fetch and open
    setAnalysisMap(prev => ({ ...prev, [matchId]: { loading: true, data: null, open: true } }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/match/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, region }),
      });
      const data = await res.json();
      setAnalysisMap(prev => ({ ...prev, [matchId]: { loading: false, data: data.junglePlaystyle, open: true } }));
    } catch {
      setAnalysisMap(prev => ({ ...prev, [matchId]: { loading: false, data: null, open: true } }));
    }
  }
  const [loading, setLoading] = useState(false)
  const [onCooldown, setOnCooldown] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [selectedQueue, setSelectedQueue] = useState<QueueType>("All");
  const [isPro, setIsPro] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);
  const [proUsernames, setProUsernames] = useState<Set<string>>(new Set());
  const [streamerUsernames, setStreamerUsernames] = useState<Set<string>>(new Set());
  const [proPlayerInfo, setProPlayerInfo] = useState<{
    id: string; username: string; first_name: string | null; last_name: string | null;
    nickname: string | null; team: string | null; nationality: string | null;
    profile_image_url: string | null;
  } | null>(null);
  const [proTeamLogo, setProTeamLogo] = useState<string | null>(null);
  const [proLinkedAccounts, setProLinkedAccounts] = useState<string[]>([]);
  const { region, slug } = useParams()
  const _dashIdx = slug?.lastIndexOf("-") ?? -1
  const name = _dashIdx > 0 ? slug!.slice(0, _dashIdx).replace(/\+/g, " ") : slug ?? ""
  const tag = _dashIdx > 0 ? slug!.slice(_dashIdx + 1) : ""
  const [latestPatch, setLatestPatch] = useState("15.13.1")
  const [topChampions, setTopChampions] = useState<ChampionStats[]>([])
  const [summonerInfo, setSummonerInfo] = useState<SummonerWithAvatar | null>(null)
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null)
  const [selectedResult, setSelectedResult] = useState<"all" | "wins" | "losses">("all")
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [filterDuoPuuid, setFilterDuoPuuid] = useState<string | null>(null)
  const [allChampions, setAllChampions] = useState<{ id: string; name: string }[]>([])
  const [championMap, setChampionMap] = useState<Record<number, string>>({});
  const [championMapReverse, setChampionMapReverse] = useState<Record<string, number>>({});
  const [topChampionsSeason, setTopChampionsSeason] = useState<ChampionStats[]>([]);
  const [topChampionsSolo, setTopChampionsSolo] = useState<ChampionStats[]>([]);
  const [topChampionsFlex, setTopChampionsFlex] = useState<ChampionStats[]>([]);
  const [topMastery, setTopMastery] = useState<{ championId: number; champName: string; points: number; pct: number }[]>([]);
  const [seasonStatsTab, setSeasonStatsTab] = useState("season");
  const [rankQueueView, setRankQueueView] = useState<"solo" | "flex">("solo");
  const [premiumPlan, setPremiumPlan] = useState<null | "premium" | "elite">(null)
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [matchesCentered, setMatchesCentered] = useState(false);
  const [showAllDuos, setShowAllDuos] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [matchCtxMenu, setMatchCtxMenu] = useState<{ x: number; y: number; matchId: string; isJungler: boolean } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);

  const [linkedDiscord, setLinkedDiscord] = useState<{
    discord_username: string | null;
    discord_avatar_url: string | null;
  } | null>(null);

  const monthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase();
  }, []);

  const recentBadgeCount = useMemo(() => {
    if (!summonerInfo?.puuid || matches.length === 0) return 0;

    // prendiamo gli ultimi 10 (quelli visibili)
    const recent = matches.slice(0, 10);

    let count = 0;
    for (const m of recent) {
      const participants = m.match.info.participants;
      const { mvpWin, mvpLose } = calculateLolDataScores(participants);
      if (mvpWin === summonerInfo.puuid || mvpLose === summonerInfo.puuid) {
        count++;
      }
    }
    return count;
  }, [matches, summonerInfo?.puuid]);

  const recentBadgeLabel = useMemo<null | "GODLIKE" | "SOLOCARRY" | "CARRY">(() => {
    if (recentBadgeCount >= 8) return "GODLIKE";
    if (recentBadgeCount >= 5) return "SOLOCARRY";
    if (recentBadgeCount >= 4) return "CARRY";
    return null;
  }, [recentBadgeCount]);


  const recentRating = useMemo(() => {
    return calculatePlayerRating(matches, summonerInfo?.puuid ?? "", 15);
  }, [matches, summonerInfo?.puuid]);

  const recentDetailedStats = useMemo(() => {
    if (!summonerInfo?.puuid || matches.length === 0)
      return null;

    const recent = matches.slice(0, 10);
    let games = 0, wins = 0;
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalCS = 0, totalGold = 0, totalMinutes = 0;
    const kpValues: number[] = [];
    const dmgValues: number[] = [];
    const visionValues: number[] = [];
    const roles: string[] = [];
    const form: ("W" | "L")[] = [];

    for (const m of recent) {
      const me = m.match.info.participants.find(p => p.puuid === summonerInfo.puuid);
      if (!me) continue;

      games++;
      if (m.win) wins++;
      form.push(m.win ? "W" : "L");

      totalKills += me.kills;
      totalDeaths += me.deaths;
      totalAssists += me.assists;

      const minutes = m.match.info.gameDuration / 60;
      totalMinutes += minutes;
      totalCS += (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
      totalGold += me.goldEarned ?? 0;

      if (me.challenges?.killParticipation != null) kpValues.push(me.challenges.killParticipation);
      if (me.challenges?.teamDamagePercentage != null) dmgValues.push(me.challenges.teamDamagePercentage);
      if (me.challenges?.visionScorePerMinute != null) visionValues.push(me.challenges.visionScorePerMinute);

      const role = me.teamPosition || me.individualPosition || "";
      if (role) roles.push(role);
    }

    if (games === 0) return null;

    const avgKills = totalKills / games;
    const avgDeaths = totalDeaths / games;
    const avgAssists = totalAssists / games;
    const avgKda = avgDeaths <= 0 ? "Perfect" : ((avgKills + avgAssists) / avgDeaths).toFixed(2);
    const csPerMin = totalMinutes > 0 ? (totalCS / totalMinutes).toFixed(1) : "0.0";
    const goldPerMin = totalMinutes > 0 ? Math.round(totalGold / totalMinutes) : 0;
    const avgKP = kpValues.length > 0 ? Math.round((kpValues.reduce((a, b) => a + b, 0) / kpValues.length) * 100) : 0;
    const avgDmg = dmgValues.length > 0 ? Math.round((dmgValues.reduce((a, b) => a + b, 0) / dmgValues.length) * 100) : 0;
    const avgVision = visionValues.length > 0 ? (visionValues.reduce((a, b) => a + b, 0) / visionValues.length).toFixed(2) : "0.00";

    // Role distribution
    const roleCounts: Record<string, number> = {};
    for (const r of roles) {
      const key = r === "MIDDLE" ? "MID" : r === "BOTTOM" ? "ADC" : r === "UTILITY" ? "SUP" : r === "JUNGLE" ? "JNG" : r;
      roleCounts[key] = (roleCounts[key] || 0) + 1;
    }
    const roleTotal = roles.length;
    const roleDistribution = Object.entries(roleCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => ({ role, count, pct: Math.round((count / roleTotal) * 100) }));

    // Current streak
    let streakType: "W" | "L" = form[0] || "W";
    let streakCount = 0;
    for (const f of form) {
      if (f === streakType) streakCount++;
      else break;
    }

    return {
      games, wins, form,
      avgKills: avgKills.toFixed(1), avgDeaths: avgDeaths.toFixed(1), avgAssists: avgAssists.toFixed(1),
      avgKda, csPerMin, goldPerMin, avgKP, avgDmg, avgVision,
      roleDistribution, streakType, streakCount,
    };
  }, [matches, summonerInfo?.puuid]);

  const navigate = useNavigate();
  const queueGroups = {
    "Ranked Solo/Duo": [420],
    "Ranked Flex": [440],
    "Normal": [400, 430],
    "All": [400, 420, 430, 440, 450, 700, 900, 1020],
  } satisfies Record<QueueType, number[]>;

  type DayWinrateCell = {
    date: Date;
    games: number;
    wins: number;
    winrate: number | null;
  };

  type QueueType = "Ranked Solo/Duo" | "Ranked Flex" | "Normal" | "All";

  type SummonerWithAvatar = SummonerInfo & { avatar_url?: string | null }


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
  };

  const glassDark = cn(
    "relative overflow-hidden rounded-md",
    "bg-black/25 backdrop-blur-lg saturate-150",
    "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
  );



  const filteredMatches = matches.filter((m) => {
    const matchQueueId = m.match.info.queueId;

    const isCorrectQueue =
      selectedQueue === "All"
        ? true
        : (queueGroups[selectedQueue] || []).includes(matchQueueId);

    const isCorrectChampion = selectedChampion ? m.championName === selectedChampion : true;

    const isCorrectResult =
      selectedResult === "all"
        ? true
        : selectedResult === "wins" ? m.win : !m.win;

    const isCorrectRole =
      !selectedRole
        ? true
        : (() => {
            const pos = (m.match.info.participants ?? []).find(
              (p: any) => p.puuid === summonerInfo?.puuid
            )?.teamPosition?.toUpperCase();
            return pos === selectedRole;
          })();

    const isCorrectDuo =
      !filterDuoPuuid
        ? true
        : m.match.info.participants.some((p: any) => p.puuid === filterDuoPuuid);

    const isNotHiddenRemake = hideRemakes ? m.match.info.gameDuration >= 300 : true;

    return isCorrectQueue && isCorrectChampion && isCorrectResult && isCorrectRole && isCorrectDuo && isNotHiddenRemake;
  });

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    if (!name || !tag || !region) return;

    setIsLoadingMore(true);
    try {
      await fetchMatches(name, tag, region, nextOffset, /* append */ true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, name, tag, region, nextOffset]);

  const monthlyDayStats = useMemo<DayWinrateCell[]>(() => {
    if (!matches || matches.length === 0) return [];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0 = gennaio
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Build cache key from player identity + month
    const cacheKey = summonerInfo?.puuid
      ? `lolData:heatmap:${summonerInfo.puuid}:${year}-${month}`
      : null;

    // Read cached data
    type CachedDay = { games: number; wins: number };
    let cached: CachedDay[] | null = null;
    if (cacheKey) {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) cached = JSON.parse(raw);
      } catch { /* ignore */ }
    }

    // inizializza un record per ogni giorno del mese (start from cache if available)
    const stats: DayWinrateCell[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const c = cached?.[day - 1];
      stats.push({
        date: new Date(year, month, day),
        games: c?.games ?? 0,
        wins: c?.wins ?? 0,
        winrate: null,
      });
    }

    // accumula stats usando TUTTE le partite del mese corrente, taking max with cache
    const liveStats: { games: number; wins: number }[] = Array.from(
      { length: daysInMonth },
      () => ({ games: 0, wins: 0 })
    );

    for (const m of matches) {
      const ts = getMatchTimestamp(m.match.info);
      if (!ts) continue;

      const d = new Date(ts);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;

      const dayIndex = d.getDate() - 1;
      liveStats[dayIndex].games += 1;
      if (m.win) liveStats[dayIndex].wins += 1;
    }

    // Merge: take the max of cache vs live for each day
    for (let i = 0; i < daysInMonth; i++) {
      if (liveStats[i].games >= stats[i].games) {
        stats[i].games = liveStats[i].games;
        stats[i].wins = liveStats[i].wins;
      }
    }

    // calcola winrate
    stats.forEach(cell => {
      if (cell.games > 0) {
        cell.winrate = Math.round((cell.wins / cell.games) * 100);
      } else {
        cell.winrate = null;
      }
    });

    // Persist to cache
    if (cacheKey) {
      try {
        const toCache = stats.map(s => ({ games: s.games, wins: s.wins }));
        localStorage.setItem(cacheKey, JSON.stringify(toCache));
      } catch { /* quota exceeded — ignore */ }
    }

    return stats;
  }, [matches, summonerInfo?.puuid]);

  const githubWeeks = useMemo(() => {
    if (!monthlyDayStats.length) return [];

    // parto dal primo giorno del mese (lo hai già calcolato così in monthlyDayStats)
    const first = monthlyDayStats[0].date;
    const year = first.getFullYear();
    const month = first.getMonth();

    const firstDay = new Date(year, month, 1);
    // 0 = lunedì, 6 = domenica (così hai le righe tipo "lun-dom")
    const weekdayOfFirst = (firstDay.getDay() + 6) % 7;

    const cells: (DayWinrateCell | null)[] = [];

    // celle "vuote" prima del giorno 1 del mese (per allineare alle settimane)
    for (let i = 0; i < weekdayOfFirst; i++) {
      cells.push(null);
    }

    // aggiungo tutti i giorni reali del mese
    monthlyDayStats.forEach((c) => cells.push(c));

    // spezzetto in colonne da 7 (settimane)
    const weeks: (DayWinrateCell | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
  }, [monthlyDayStats]);

  const heatmapRows = useMemo(() => {
    // vogliamo esattamente 3 righe
    const rows: DayWinrateCell[][] = [[], [], []];

    monthlyDayStats.forEach((cell, index) => {
      const rowIndex = index % 3; // riempiamo per righe: 0,1,2,0,1,2...
      rows[rowIndex].push(cell);
    });

    return rows;
  }, [monthlyDayStats]);



  const duoStats = useMemo(() => {
    if (!summonerInfo || matches.length === 0) return [];

    const duosMap: Record<
      string,
      {
        games: number;
        wins: number;
        riotId: string;
        lastChampionName: string | null;
        profileIconId: number | null;
      }
    > = {};

    // prendiamo al massimo le prime 20 partite
    matches.slice(0, 20).forEach(({ match, win }) => {
      const participants = match.info.participants;
      const myTeamId = participants.find(p => p.puuid === summonerInfo.puuid)?.teamId;
      const teammates = participants.filter(p => p.teamId === myTeamId && p.puuid !== summonerInfo.puuid);

      teammates.forEach(teammate => {
        const idKey = teammate.puuid;
        if (!duosMap[idKey]) {
          duosMap[idKey] = {
            games: 0,
            wins: 0,
            riotId:
              teammate.riotIdGameName && teammate.riotIdTagline
                ? `${teammate.riotIdGameName}#${teammate.riotIdTagline}`
                : teammate.summonerName || "Unknown",
            lastChampionName: teammate.championName || null,
            profileIconId: typeof teammate.profileIconId === "number" ? teammate.profileIconId : null,
          };
        } else {
          // aggiorno champ e icon con l'ultima partita vista
          duosMap[idKey].lastChampionName = teammate.championName || duosMap[idKey].lastChampionName;
          duosMap[idKey].profileIconId =
            typeof teammate.profileIconId === "number" ? teammate.profileIconId : duosMap[idKey].profileIconId;
        }

        duosMap[idKey].games += 1;
        if (win) duosMap[idKey].wins += 1;
      });
    });

    // trasformiamo in array, filtriamo solo chi ha più di 1 game
    return Object.entries(duosMap)
      .filter(([_, data]) => data.games > 1)
      .map(([puuid, data]) => ({
        puuid,
        ...data,
        losses: data.games - data.wins,
        winrate: Math.round((data.wins / data.games) * 100),
      }))
      .sort((a, b) => b.games - a.games); // ordina per più partite giocate insieme
  }, [matches, summonerInfo]);





  const visibleDuos = showAllDuos ? duoStats : duoStats.slice(0, 3);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!summonerInfo?.name || !summonerInfo?.tag) {
      setLinkedDiscord(null);
      return;
    }

    const nametag = `${summonerInfo.name}#${summonerInfo.tag}`;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("profile_players")
          .select("discord_username, discord_avatar_url")
          .eq("nametag", nametag)
          .not("discord_id", "is", null)
          .maybeSingle();

        if (error) {
          console.warn("discord lookup error:", error.message);
          setLinkedDiscord(null);
          return;
        }

        if (data) {
          setLinkedDiscord({
            discord_username: data.discord_username,
            discord_avatar_url: data.discord_avatar_url,
          });
        } else {
          setLinkedDiscord(null);
        }
      } catch (err) {
        console.error("discord lookup exception:", err);
        setLinkedDiscord(null);
      }
    })();
  }, [summonerInfo?.name, summonerInfo?.tag]);

  useEffect(() => {
    function onScroll() {
      if (!listRef.current) return;
      const items = listRef.current.querySelectorAll("li");
      if (items.length >= 13) {
        const thirteenth = items[12] as HTMLElement; // 0-based index
        const rect = thirteenth.getBoundingClientRect();
        // se il top dell—elemento è sopra la viewport, vuol dire che l—abbiamo superato
        setShowScrollTop(rect.top < 0);
      }
      if (matchCenteringEnabled) {
        const matchItems = listRef.current.querySelectorAll(":scope > section > ul > li");
        if (matchItems.length >= 12) {
          const target = matchItems[11] as HTMLElement;
          const rectTarget = target.getBoundingClientRect();
          setMatchesCentered(rectTarget.top + (rectTarget.height * 0.25) < 0);
        } else {
          setMatchesCentered(false);
        }
      } else {
        setMatchesCentered(false);
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [matchCenteringEnabled]);

  useEffect(() => {
    setNextOffset(0);
    setHasMore(true);
    setIsLoadingMore(false);
  }, [name, tag, region]);

  useEffect(() => {
    const defaultTitle = "lolData";

    const baseName =
      summonerInfo?.name
      ?? (slug
        ? (() => {
          const idx = slug.lastIndexOf("-");
          return idx > 0 ? slug.slice(0, idx) : slug;
        })()
        : name);

    if (baseName && baseName.trim().length > 0) {
      document.title = `${baseName} - lolData`;
    } else {
      document.title = defaultTitle;
    }

    return () => {
      document.title = defaultTitle;
    };
  }, [slug, summonerInfo?.name]);

  useEffect(() => {
    if (!summonerInfo?.name || !summonerInfo?.tag) return
    const nametag = `${summonerInfo.name}#${summonerInfo.tag}`

    fetch(`${API_BASE_URL}/api/pro/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nametag }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(({ plan }) => {
        const p = typeof plan === "string" ? plan.toLowerCase() : null
        setPremiumPlan(p === "premium" || p === "elite" ? (p as "premium" | "elite") : null)
      })
      .catch(() => setPremiumPlan(null))
  }, [summonerInfo?.name, summonerInfo?.tag])

  useEffect(() => {
    if (!slug) return;
    const di = slug.lastIndexOf("-");
    const name = di > 0 ? slug.slice(0, di).replace(/\+/g, " ") : slug;
    const tag = di > 0 ? slug.slice(di + 1) : "";
    if (!name || !tag) return;

    checkUserFlags(name, tag).then(({ isPro, isStreamer }) => {
      setIsPro(isPro);
      setIsStreamer(isStreamer);
    });

    // Fetch full pro player details for this summoner
    // Check both pro_players.username and pro_player_accounts.username
    const nametag = `${name}#${tag}`;

    async function fetchProInfo() {
      const cols = "id, username, first_name, last_name, nickname, team, nationality, profile_image_url";

      // 1. Direct match on pro_players.username
      const { data: directRows } = await supabase
        .from("pro_players")
        .select(cols)
        .ilike("username", nametag)
        .limit(1);

      let proData = directRows?.[0] ?? null;

      // 2. If not found, check pro_player_accounts
      if (!proData) {
        const { data: accRows } = await supabase
          .from("pro_player_accounts")
          .select("pro_player_id")
          .ilike("username", nametag)
          .limit(1);
        if (accRows?.[0]) {
          const { data: playerRows } = await supabase
            .from("pro_players")
            .select(cols)
            .eq("id", accRows[0].pro_player_id)
            .limit(1);
          proData = playerRows?.[0] ?? null;
        }
      }

      if (proData) {
        setProPlayerInfo(proData);
        // Fetch team logo
        if (proData.team) {
          const { data: teamData } = await supabase.from("teams").select("logo_url").eq("name", proData.team).maybeSingle();
          setProTeamLogo(teamData?.logo_url ?? null);
        } else { setProTeamLogo(null); }
        // Fetch linked accounts (primary + additional)
        const { data: accData } = await supabase
          .from("pro_player_accounts")
          .select("username")
          .eq("pro_player_id", proData.id);
        const allAccounts = [proData.username, ...(accData ?? []).map((a: { username: string }) => a.username)];
        setProLinkedAccounts(allAccounts);
      } else {
        setProPlayerInfo(null);
        setProTeamLogo(null);
        setProLinkedAccounts([]);
      }
    }
    fetchProInfo();
  }, [slug]);

  useEffect(() => {
    // Load pro usernames from both pro_players and pro_player_accounts
    Promise.all([
      supabase.from("pro_players").select("username"),
      supabase.from("pro_player_accounts").select("username"),
    ]).then(([{ data: proData }, { data: accData }]) => {
      const names = new Set<string>();
      for (const r of proData ?? []) if (r.username) names.add(r.username.toLowerCase());
      for (const r of accData ?? []) if (r.username) names.add(r.username.toLowerCase());
      setProUsernames(names);
    });
    supabase
      .from("streamers")
      .select("lol_nametag")
      .then(({ data }) => {
        if (data) {
          setStreamerUsernames(new Set(data.filter((r) => r.lol_nametag).map((r) => r.lol_nametag.toLowerCase())));
        }
      });
  }, []);

  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load champion.json")
        return res.json()
      })
      .then((data) => {
        const champs = Object.values(data.data).map((champ: any) => ({
          id: champ.key as string,   // "266"
          name: champ.id as string,  // "Aatrox"
        }))

        const map: Record<number, string> = {}
        const reverseMap: Record<string, number> = {}

        champs.forEach((c) => {
          const numId = Number(c.id)
          if (!Number.isNaN(numId)) {
            map[numId] = c.name          // 266 -> "Aatrox"
            reverseMap[c.name] = numId   // "Aatrox" -> 266
          }
        })

        setChampionMap(map)
        setChampionMapReverse(reverseMap)
        setAllChampions(champs)
      })
      .catch((err) => {
        console.error("Error loading champions:", err)
      })
  }, [])


  useEffect(() => {
    const savedScroll = sessionStorage.getItem("summonerScrollY");
    if (savedScroll) {
      window.scrollTo(0, parseInt(savedScroll, 10));
      sessionStorage.removeItem("summonerScrollY"); //clear the y axis
    }
  }, []);

  useEffect(() => {
    setLatestPatch(getCdnVersion())
  }, [])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) {
      setOnCooldown(false)
      return
    }
    setOnCooldown(true)
    const interval = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setOnCooldown(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldownSeconds > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!name || !tag) return
    refreshData()
  }, [name, tag, region])

  useEffect(() => {
    if (!summonerInfo?.puuid || !region) return;

    // Fetch all three season stat groups — no polling needed,
    // data is populated during match ingestion by the backend.
    fetchSeasonStats(summonerInfo.puuid, region, "ranked_all");
    fetchSeasonStats(summonerInfo.puuid, region, "ranked_solo");
    fetchSeasonStats(summonerInfo.puuid, region, "ranked_flex");
  }, [summonerInfo?.puuid, region]);

  // Poll for matches when ingestion is in progress (first-time search)
  useEffect(() => {
    if (!isIngesting || !name || !tag || !region) return;
    const id = setInterval(() => {
      fetchMatches(name, tag, region, 0, false);
    }, 3000);
    return () => clearInterval(id);
  }, [isIngesting, name, tag, region]);

  // Also re-fetch season stats once ingestion completes
  useEffect(() => {
    if (!isIngesting && summonerInfo?.puuid && region && matches.length > 0) {
      // Matches just appeared — refresh season stats
      fetchSeasonStats(summonerInfo.puuid, region, "ranked_all");
      fetchSeasonStats(summonerInfo.puuid, region, "ranked_solo");
      fetchSeasonStats(summonerInfo.puuid, region, "ranked_flex");
    }
  }, [isIngesting, matches.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "200px 0px 200px 0px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // riesegui quando cambia la dimensione della lista o lo stato di loading/hasMore
  }, [loadMore, filteredMatches.length, hasMore, loading]);

  // ── Context menu dismiss ──
  useEffect(() => {
    if (!ctxMenu) return;
    const dismiss = () => setCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("click", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  // ── Match context menu dismiss ──
  useEffect(() => {
    if (!matchCtxMenu) return;
    const dismiss = () => setMatchCtxMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("click", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", dismiss);
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [matchCtxMenu]);

  // ── Global context menu override ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      setCtxMenu({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  async function refreshData() {

    if (!region) {
      console.error("— Region mancante in refreshData")
      return
    }

    if (!name || !tag) return

    setLoading(true)
    setSummonerInfo(null);
    setMatches([]);
    setTopChampionsSeason([]);
    setTopChampionsSolo([]);
    setTopChampionsFlex([]);
    setHasMore(true);
    setNextOffset(0);
    setIsLoadingMore(false);
    setIsIngesting(false);
    setSelectedChampion(null);
    setSelectedQueue("All" as QueueType);
    setSelectedResult("all");
    setSelectedRole(null);
    setRankQueueView("solo");

    try {
      // Fire summoner info and matches in parallel — summoner endpoint
      // no longer blocks on match ingestion, so both can run concurrently
      const [summonerResult] = await Promise.all([
        fetchSummonerInfo(name, tag, region),
        fetchMatches(name, tag, region, 0, false),
      ])

      if (!summonerResult.found) {
        navigate("/404", {
          state: {
            message: "Summoner not found",
            subtitle: `No data found for "${name}#${tag}" — maybe you misspelled the name or tag?`,
          },
          replace: true,
        })
        return
      }

      // Re-fetch matches after a short delay to catch
      // any additional matches ingested in background
      setTimeout(async () => {
        try {
          await fetchMatches(name, tag, region, 0, false);
        } catch {}
      }, 3000);

      // Fetch mastery data + champion names for profile card
      Promise.all([
        fetch(`${API_BASE_URL}/api/mastery/list`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tag, region }),
        }).then(r => r.ok ? r.json() : null),
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`).then(r => r.json()).catch(() => null),
      ]).then(([masteryData, champJson]) => {
        const list = (masteryData?.masteryList ?? []) as { championId: number; championPoints: number }[];
        if (list.length === 0) return;
        // Build ID → name map
        const idMap: Record<number, string> = {};
        if (champJson?.data) {
          for (const c of Object.values<any>(champJson.data)) {
            idMap[Number(c.key)] = String(c.id);
          }
        }
        const top3 = list.sort((a, b) => b.championPoints - a.championPoints).slice(0, 3);
        const total = top3.reduce((s, c) => s + c.championPoints, 0);
        setTopMastery(top3.map(c => ({
          championId: c.championId,
          champName: idMap[c.championId] ?? String(c.championId),
          points: c.championPoints,
          pct: total > 0 ? Math.round((c.championPoints / total) * 100) : 0,
        })));
      }).catch(() => {});

      // Fire-and-forget tracking calls — don't block the UI
      fetch(`${API_BASE_URL}/api/summoner/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag }),
      }).catch(console.error)

      fetch(`${API_BASE_URL}/api/profile/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag }),
      }).catch(console.error)
    } catch (err) {
      console.error("— Error loading summoner data:", err)
      navigate("/404", {
        state: {
          message: "Summoner not found",
          subtitle: `No data found for "${name}#${tag}" — maybe you misspelled the name or tag?`,
        },
        replace: true,
      })
      return
    }

    setLoading(false)
  }

  function LoadingSquares() {
    return (
      <div className="flex items-center gap-1 h-10">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2.5 h-2.5 bg-jade rounded-[2px] animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  function ratingToTier(score: number): string {
    if (score >= 92) return "S+";
    if (score >= 85) return "S";
    if (score >= 78) return "A+";
    if (score >= 72) return "A";
    if (score >= 66) return "B+";
    if (score >= 60) return "B";
    if (score >= 55) return "C+";
    if (score >= 50) return "C";
    if (score >= 45) return "D+";
    if (score >= 40) return "D";
    return "D";
  }


  async function fetchSummonerInfo(name: string, tag: string, region: string): Promise<{ found: boolean; cooldownRemaining: number }> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/summoner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag, region }),
      })

      if (!res.ok) return { found: false, cooldownRemaining: 0 }

      const data = await res.json()
      if (!data.summoner) return { found: false, cooldownRemaining: 0 }

      setSummonerInfo(data.summoner as SummonerInfo)

      const cd = data.cooldownRemaining ?? 0
      if (cd > 0) setCooldownSeconds(cd)

      return { found: true, cooldownRemaining: cd }
    } catch {
      return { found: false, cooldownRemaining: 0 }
    }
  }

  async function fetchMatches(name: string, tag: string, region: string, offset = 0, append = false) {
    const res = await fetch(`${API_BASE_URL}/api/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag, region, offset, limit: 10 }),
    });
    const data = await res.json();

    // Track ingestion state — keep polling while backend says ingesting
    setIsIngesting(Boolean(data.ingesting));

    setHasMore(Boolean(data.hasMore));
    setNextOffset(Number(data.nextOffset ?? (offset + (data.matches?.length ?? 0))));

    setTopChampions(data.topChampions || []);

    // Always update matches if we got any (even partial during ingestion)
    if (data.matches && data.matches.length > 0) {
      if (append) {
        setMatches(prev => [...prev, ...data.matches]);
      } else {
        setMatches(data.matches);
      }
    }
  }

  async function fetchSeasonStats(
    puuid: string,
    region: string,
    queueGroup: "ranked_all" | "ranked_solo" | "ranked_flex" = "ranked_all"
  ) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/season_stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, region, queueGroup }),
      });

      if (res.ok) {
        const data = await res.json();
        if (queueGroup === "ranked_all") setTopChampionsSeason(data.topChampions || []);
        if (queueGroup === "ranked_solo") setTopChampionsSolo(data.topChampions || []);
        if (queueGroup === "ranked_flex") setTopChampionsFlex(data.topChampions || []);
      }
    } catch (err) {
      console.error("Error fetching season stats:", err);
    }
  }




  type MatchRow = MatchWithWin;

  const groupedByDay = useMemo(() => {
    // garantiamo l'ordinamento decrescente per timestamp
    const sorted: MatchRow[] = [...filteredMatches].sort((a, b) => {
      const ta = getMatchTimestamp(a.match.info) || 0;
      const tb = getMatchTimestamp(b.match.info) || 0;
      return tb - ta;
    });

    const map = new Map<string, MatchRow[]>();
    for (const row of sorted) {
      const ts = getMatchTimestamp(row.match.info);
      const key = dayKeyFromTs(ts);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map; // mantiene l—ordine d—inserimento
  }, [filteredMatches]);



  function StatsList({ champs }: { champs: ChampionStats[] }) {
    const isEmpty = !champs || champs.length === 0;
    // Show skeleton only while initial page is loading or ingesting
    const showSkeleton = isEmpty && (loading || isIngesting);
    return (
      <div className="flex flex-col gap-3 mx-2 mt-3">
        {showSkeleton ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="grid items-center px-4 py-1 animate-pulse">
              <div className="flex items-center gap-3 w-full">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex flex-col gap-0.5 w-[300px]">
                  <Skeleton className="w-[30%] h-2.5" />
                  <Skeleton className="w-[60%] h-2.5" />
                </div>
              </div>
            </div>
          ))
        ) : isEmpty ? (
          <div className="text-center py-6 text-flash/40 text-sm">
            No ranked games this season
          </div>
        ) : (
          (() => {
            const displayChamps = champs.slice(0, 5);
            return (
              <>
                {displayChamps.map((champ) => (
                  <div key={champ.champion} className="flex items-center justify-between px-3 w-full">
                    <div className="flex items-center gap-3">
                      <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(champ.champion)}.png`} alt={champ.champion} className="w-12 h-12 rounded-full" />
                      <div className="flex flex-col text-xs text-white gap-1 justify-start text-[11px] min-w-[100px]">
                        <div className="text-[#979D9B] font-bold uppercase truncate w-[90px]">{champ.champion}</div>
                        <div className="text-white font-thin text-[11px]">
                          {(() => {
                            const num = Number(champ.csPerMin);
                            const rounded = Math.round(num * 10) / 10;
                            return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
                          })()}{" "}CS/({champ.avgGold})
                        </div>
                      </div>
                    </div>

                    {/* Center KDA column — visible only at xl+ */}
                    <div className="hidden xl:flex flex-col items-center text-xs text-white gap-1 w-[90px] whitespace-nowrap text-[11px]">
                      <div className={getKdaClass(champ.avgKda)}>{champ.avgKda} KDA</div>
                      <div>
                        {formatStat(champ.kills / champ.games)}/
                        {formatStat(champ.deaths / champ.games)}/
                        {formatStat(champ.assists / champ.games)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 xl:flex-col xl:items-end xl:gap-1">
                      {/* KDA with tooltip — visible only below xl */}
                      <div className="xl:hidden">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn("text-[11px] cursor-default", getKdaClass(champ.avgKda))}>{champ.avgKda} KDA</div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {formatStat(champ.kills / champ.games)} / {formatStat(champ.deaths / champ.games)} / {formatStat(champ.assists / champ.games)}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Winrate with tooltip for matches — visible below xl */}
                      <div className="xl:hidden">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn("text-[11px] cursor-default", getWinrateClass(champ.winrate, champ.games))}>{champ.winrate}%</div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {champ.games} matches
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Winrate + matches text — visible at xl+ */}
                      <div className={cn("hidden xl:block text-[11px]", getWinrateClass(champ.winrate, champ.games))}>{champ.winrate}%</div>
                      <div className="hidden xl:block text-[11px] text-white">{champ.games} MATCHES</div>
                    </div>
                  </div>
                ))}
                {/* Placeholder slots when fewer than 5 champions */}
                {displayChamps.length < 5 && Array.from({ length: 5 - displayChamps.length }).map((_, i) => (
                  <div key={`placeholder-${i}`} className="flex items-center px-3 w-full h-12">
                    <div className="flex items-center gap-3">
                      <img
                        src={`${cdnBaseUrl()}/img/profileicon/29.png`}
                        alt="empty slot"
                        className="w-12 h-12 rounded-full grayscale"
                        style={{ opacity: 0.3 - i * 0.05 }}
                      />
                      <div className="h-2 w-16 rounded bg-flash/5" style={{ opacity: 0.3 - i * 0.05 }} />
                    </div>
                  </div>
                ))}
              </>
            );
          })()
        )}
      </div>
    );
  }

  return (
    <div className="relative z-0">
      {!techBgDisabled && <UltraTechBackground />}

      {(selectedQueue !== "All" || selectedChampion || selectedResult !== "all" || selectedRole || filterDuoPuuid) && (
        <div
          className={cn(
            "fixed right-10 z-50 flex flex-col items-center gap-2 transition-all duration-300 w-11",
            showScrollTop ? "bottom-[7.5rem]" : "bottom-10"
          )}
        >
          <button
            onClick={() => {
              setSelectedQueue("All");
              setSelectedChampion(null);
              setSelectedResult("all");
              setSelectedRole(null);
              setFilterDuoPuuid(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="group relative w-11 h-11 cursor-clicker"
          >
            <span className={cn(
              "absolute inset-0 rotate-45 rounded-[4px] border transition-all duration-300",
              "bg-black/60 border-[#c93232]/40",
              "group-hover:border-[#c93232]/80 group-hover:bg-[#c93232]/10",
              "group-hover:shadow-[0_0_18px_rgba(201,50,50,0.35),inset_0_0_8px_rgba(201,50,50,0.08)]",
              "shadow-[0_0_8px_rgba(201,50,50,0.15)]"
            )}>
              <span
                className="absolute inset-0 rounded-[3px] opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(201,50,50,0.5) 3px, rgba(201,50,50,0.5) 4px)"
                }}
              />
            </span>
            <span className="absolute inset-0 flex items-center justify-center">
              <X className="w-3.5 h-3.5 text-[#c93232] transition-transform duration-300 group-hover:scale-110" />
            </span>
          </button>
          <span className="font-mono text-[7px] tracking-[0.2em] text-[#c93232]/50 uppercase select-none text-center leading-tight">REMOVE<br/>FILTER</span>
        </div>
      )}
      <div className="relative flex min-h-screen -mt-4 z-10">
        <div
          className="w-2/5 min-w-[35%] flex flex-col gap-0 items-center transition-opacity duration-700 ease-in-out"
          style={{ opacity: matchesCentered ? 0 : 1 }}
        >

          {/* ═══ PRO PLAYER CARD — floating layout ═══ */}
          {proPlayerInfo && (
            <div className="w-[90%] mt-5 mb-2 flex items-start gap-4 px-1">
              {/* Player image — left, prominent */}
              {proPlayerInfo.profile_image_url ? (
                <img
                  src={proPlayerInfo.profile_image_url}
                  alt=""
                  className="shrink-0 w-[88px] h-[88px] rounded-lg object-cover shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_15px_rgba(0,217,146,0.1)]"
                />
              ) : (
                <div className="shrink-0 w-[88px] h-[88px] rounded-lg bg-black/50 border border-jade/10 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden relative">
                  {/* Scanlines */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.03) 3px, rgba(0,217,146,0.03) 4px)" }} />
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-3 h-3"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/20" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/20" /></div>
                  <div className="absolute top-0 right-0 w-3 h-3"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/20" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/20" /></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/20" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/20" /></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/20" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/20" /></div>
                  {/* Silhouette + diamond */}
                  <div className="relative flex flex-col items-center gap-1">
                    <svg viewBox="0 0 64 52" className="w-10 h-8">
                      <circle cx="32" cy="16" r="9" fill="rgba(0,217,146,0.12)" stroke="rgba(0,217,146,0.2)" strokeWidth="1" />
                      <path d="M16 48c0-8.8 7.2-16 16-16s16 7.2 16 16" fill="rgba(0,217,146,0.08)" stroke="rgba(0,217,146,0.15)" strokeWidth="1" />
                    </svg>
                    <span className="text-jade/25 text-[8px] font-orbitron tracking-[0.2em]">◈</span>
                  </div>
                </div>
              )}

              {/* Right side — info stack */}
              <div className="flex flex-col gap-0.5 min-w-0 pt-0.5">
                {/* Team icon + team name — top header */}
                {proPlayerInfo.team && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {proTeamLogo && <TeamLogo src={proTeamLogo} className="w-3.5 h-3.5 object-contain" />}
                    <span className="text-[10px] font-mono text-jade/60 tracking-[0.15em] uppercase">{proPlayerInfo.team}</span>
                  </div>
                )}

                {/* Nickname — biggest */}
                <div className="text-2xl font-bold font-mono text-flash leading-tight tracking-wide">
                  {proPlayerInfo.nickname || proPlayerInfo.username.split("#")[0]}
                </div>

                {/* Name + surname + nationality + accounts */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  {(proPlayerInfo.first_name || proPlayerInfo.last_name) && (
                    <span className="text-[11px] font-mono text-flash/45">
                      {[proPlayerInfo.first_name, proPlayerInfo.last_name].filter(Boolean).join(" ")}
                    </span>
                  )}
                  {proPlayerInfo.nationality && (
                    <>
                      {(proPlayerInfo.first_name || proPlayerInfo.last_name) && <span className="text-flash/15">·</span>}
                      <span className="text-[10px] font-mono text-flash/35 uppercase">{proPlayerInfo.nationality}</span>
                    </>
                  )}
                  {proLinkedAccounts.length > 1 && (
                    <>
                      <span className="text-flash/15">·</span>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[9px] font-mono tracking-[0.08em] text-jade/35 hover:text-jade/60 transition-colors cursor-clicker">
                              +{proLinkedAccounts.length - 1} acc
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="p-0 bg-transparent border-none shadow-none">
                            <div className="bg-[#0a0f14] border border-jade/15 rounded-[4px] px-3 py-2 min-w-[140px]">
                              <div className="text-[9px] font-mono text-jade/50 tracking-[0.15em] uppercase mb-1.5">Accounts</div>
                              <div className="flex flex-col gap-1">
                                {proLinkedAccounts.map((acc, i) => (
                                  <div key={i} className="text-[11px] font-mono text-flash/70">{acc}</div>
                                ))}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div
            className={cn(
              "relative overflow-hidden w-[90%] mt-5 rounded-md text-sm font-thin",
              "bg-black/25 backdrop-blur-lg saturate-150",
              "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
            )}
          >
            {/* glossy overlays */}
            <div
              className={cn(
                "pointer-events-none absolute -top-24 left-0 h-56 w-full z-[1]",
                "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.12),rgba(255,255,255,0)_62%)]"
              )}
            />
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" />

            {/* beam sopra al vetro */}
            <BorderBeam duration={8} size={100} />

            {/* contenuto */}
            {/* Splash art — absolute from card top, doesn't affect layout */}
            {topChampionsSeason.length > 0 && (
              <div className="absolute inset-x-0 top-0 h-[220px] overflow-hidden z-[2] pointer-events-none">
                <img
                  src={cdnSplashUrl(topChampionsSeason[0].champion)}
                  alt={`Splash art ${topChampionsSeason[0].champion}`}
                  className="w-full h-full object-cover opacity-15 filter grayscale brightness-150"
                  style={{
                    objectPosition: "top center",
                    maskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 85%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 85%)",
                  }}
                />
              </div>
            )}
            <div className="relative z-10">
              <div className="relative w-full h-32 mt-2">

                <div className="relative z-10 px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-flash/40">This Season</span>
                    <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" />
                    {recentDetailedStats?.roleDistribution?.[0] && (() => {
                      const roleMap: Record<string, React.ReactNode> = {
                        TOP: <RoleTopIcon className="w-7 h-7" />,
                        JNG: <RoleJungleIcon className="w-7 h-7" />,
                        MID: <RoleMidIcon className="w-7 h-7" />,
                        ADC: <RoleAdcIcon className="w-7 h-7" />,
                        SUP: <RoleSupportIcon className="w-7 h-7" />,
                      };
                      return (
                        <div className="text-flash/20">
                          {roleMap[recentDetailedStats.roleDistribution[0].role] ?? null}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-end gap-5 mt-12">
                    {/* Wins */}
                    <div className="flex flex-col items-center">
                      {summonerInfo ? (
                        <span className="text-3xl font-orbitron font-bold text-jade tabular-nums leading-none">{summonerInfo.wins}</span>
                      ) : (
                        <span className="text-3xl font-orbitron font-bold text-jade/30 tabular-nums leading-none animate-pulse">--</span>
                      )}
                      <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-jade/50 mt-1">Wins</span>
                    </div>

                    {/* Separator */}
                    <div className="h-8 w-[1px] bg-flash/10 mb-1" />

                    {/* Losses */}
                    <div className="flex flex-col items-center">
                      {summonerInfo ? (
                        <span className="text-3xl font-orbitron font-bold text-[#b11315] tabular-nums leading-none">{summonerInfo.losses}</span>
                      ) : (
                        <span className="text-3xl font-orbitron font-bold text-[#b11315]/30 tabular-nums leading-none animate-pulse">--</span>
                      )}
                      <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#b11315]/50 mt-1">Losses</span>
                    </div>

                    {/* Separator */}
                    <div className="h-8 w-[1px] bg-flash/10 mb-1" />

                    {/* Winrate */}
                    {summonerInfo ? (() => {
                      const totalGames = summonerInfo.wins + summonerInfo.losses;
                      const winrate = totalGames > 0 ? Math.round((summonerInfo.wins / totalGames) * 100) : 0;
                      return (
                        <div className="flex flex-col items-center">
                          <div className="flex items-baseline gap-0.5">
                            <span className={`text-3xl font-orbitron font-bold tabular-nums leading-none ${getWinrateClass(winrate, totalGames)}`}>{winrate}</span>
                            <span className={`text-lg font-orbitron font-bold leading-none ${getWinrateClass(winrate, totalGames)}`}>%</span>
                          </div>
                          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 mt-1">Winrate</span>
                        </div>
                      );
                    })() : (
                      <div className="flex flex-col items-center">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-3xl font-orbitron font-bold text-flash/20 tabular-nums leading-none animate-pulse">--</span>
                          <span className="text-lg font-orbitron font-bold text-flash/20 leading-none animate-pulse">%</span>
                        </div>
                        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 mt-1">Winrate</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ———— PERFORMANCE OVERVIEW ———— */}
              {!recentDetailedStats && (
                <div className="px-3 pt-2 pb-4 font-jetbrains animate-pulse">
                  <div className="flex items-start gap-1">
                    {/* Radar skeleton */}
                    <div className="shrink-0 -ml-2 flex items-center justify-center" style={{ width: 190, height: 190 }}>
                      <div className="w-[130px] h-[130px] rounded-full border border-white/[0.06]" />
                    </div>
                    {/* Stats skeleton */}
                    <div className="flex flex-col gap-[7px] pt-3 flex-1 min-w-0">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-white/[0.04] pb-[6px] last:border-0 last:pb-0">
                          <Skeleton className="w-[40px] h-3" />
                          <Skeleton className="w-[50px] h-4" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Footer skeleton */}
                  <div className="flex gap-3 px-1 pt-2 mt-1 border-t border-white/[0.06]">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="w-[45px] h-3" />
                    ))}
                  </div>
                </div>
              )}
              {recentDetailedStats && (() => {
                const radarStats = [
                  { label: "KDA", pct: Math.min(Number(recentDetailedStats.avgKda === "Perfect" ? 5 : recentDetailedStats.avgKda) / 5, 1) },
                  { label: "CS", pct: Math.min(Number(recentDetailedStats.csPerMin) / 10, 1) },
                  { label: "KP", pct: recentDetailedStats.avgKP / 100 },
                  { label: "DMG", pct: recentDetailedStats.avgDmg / 40 },
                  { label: "GOLD", pct: Math.min(recentDetailedStats.goldPerMin / 500, 1) },
                  { label: "VIS", pct: Math.min(Number(recentDetailedStats.avgVision) / 2.5, 1) },
                ];
                const cx = 110, cy = 110, maxR = 82;
                const angles = radarStats.map((_, i) => (i * Math.PI * 2) / 6 - Math.PI / 2);
                const pt = (a: number, r: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
                const hex = (r: number) => angles.map(a => pt(a, r).join(",")).join(" ");
                const dataHex = radarStats.map((s, i) => pt(angles[i], Math.max(s.pct, 0.08) * maxR).join(",")).join(" ");

                const tooltipLabels = ["Avg KDA", "CS per Min", "Kill Participation", "Damage Share", "Gold per Min", "Vision per Min"];
                const tooltipValues = [
                  recentDetailedStats.avgKda,
                  recentDetailedStats.csPerMin,
                  `${recentDetailedStats.avgKP}%`,
                  `${recentDetailedStats.avgDmg}%`,
                  String(recentDetailedStats.goldPerMin),
                  recentDetailedStats.avgVision,
                ];

                return (
                  <div className="px-3 pt-2 pb-4 font-jetbrains">
                    <div className="flex items-start gap-1">

                      {/* Radar chart — left */}
                      <TooltipProvider delayDuration={0}>
                        <div className="shrink-0 -ml-2 relative mt-[22px]">
                          <svg width="190" height="190" viewBox="0 0 220 220">
                            {/* Grid hexagons */}
                            {[0.25, 0.5, 0.75, 1].map(s => (
                              <polygon key={s} points={hex(maxR * s)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                            ))}
                            {/* Axis lines */}
                            {angles.map((a, i) => {
                              const [ex, ey] = pt(a, maxR);
                              return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />;
                            })}
                            {/* Data fill */}
                            <polygon points={dataHex} fill="rgba(0,217,146,0.08)" stroke="rgba(0,217,146,0.5)" strokeWidth="1.5" strokeLinejoin="round" />
                            {/* Inner glow fill */}
                            <polygon points={dataHex} fill="url(#radarGlow)" />
                            {/* Data dots with tooltips */}
                            {radarStats.map((s, i) => {
                              const [dx, dy] = pt(angles[i], Math.max(s.pct, 0.08) * maxR);
                              return (
                                <Tooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <g className="cursor-clicker">
                                      <circle cx={dx} cy={dy} r="10" fill="transparent" />
                                      <circle cx={dx} cy={dy} r="5" fill="#00d992" fillOpacity="0.12" />
                                      <circle cx={dx} cy={dy} r="2.5" fill="#00d992" fillOpacity="0.9" />
                                    </g>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="font-jetbrains">
                                    <span className="text-jade font-semibold">{tooltipValues[i]}</span>
                                    <span className="text-flash/50 ml-1.5">{tooltipLabels[i]}</span>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {/* Labels */}
                            {radarStats.map((s, i) => {
                              const [lx, ly] = pt(angles[i], maxR + 16);
                              return (
                                <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                                  className="fill-flash/30 text-[9px] font-jetbrains uppercase tracking-wider"
                                >{s.label}</text>
                              );
                            })}
                            <defs>
                              <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#00d992" stopOpacity="0.12" />
                                <stop offset="100%" stopColor="#00d992" stopOpacity="0" />
                              </radialGradient>
                            </defs>
                          </svg>
                        </div>
                      </TooltipProvider>

                      {/* Stats panel — right */}
                      <div className="flex flex-col gap-[7px] pt-6 flex-1 min-w-0">
                        {[
                          { label: "KDA", value: recentDetailedStats.avgKda, sub: `${recentDetailedStats.avgKills}/${recentDetailedStats.avgDeaths}/${recentDetailedStats.avgAssists}` },
                          { label: "CS/MIN", value: recentDetailedStats.csPerMin },
                          { label: "KP", value: `${recentDetailedStats.avgKP}%` },
                          { label: "DMG", value: `${recentDetailedStats.avgDmg}%` },
                          { label: "GOLD/M", value: String(recentDetailedStats.goldPerMin) },
                          { label: "VIS/M", value: recentDetailedStats.avgVision },
                        ].map(s => (
                          <div key={s.label} className="flex items-baseline justify-between border-b border-white/[0.04] pb-[6px] last:border-0 last:pb-0">
                            <span className="text-[10px] text-flash/35 uppercase tracking-wider">{s.label}</span>
                            <div className="flex items-baseline gap-1.5">
                              {s.sub && <span className="text-[10px] text-flash/25">{s.sub}</span>}
                              <span className="text-[14px] text-jade tabular-nums font-medium">{s.value}</span>
                            </div>
                          </div>
                        ))}

                      </div>

                    </div>

                    {/* MVP badge */}
                    {recentBadgeLabel && (
                      <div className="flex justify-end px-1 mt-2">
                        <span
                          className="text-[9px] font-orbitron font-bold tracking-[0.15em] px-2 py-[2px] rounded-[2px]"
                          style={{
                            background: "linear-gradient(135deg, rgba(0,217,146,0.12), rgba(0,184,255,0.08))",
                            color: "#00d992",
                            boxShadow: "0 0 8px rgba(0,217,146,0.2)",
                          }}
                        >
                          {recentBadgeCount}/{recentDetailedStats.games} MVP · {recentBadgeLabel}
                        </span>
                      </div>
                    )}

                  </div>
                );
              })()}
            </div>
          </div>


          <div
            id="season-stats"
            className={cn(
              "relative overflow-hidden w-[90%] h-[420px] mt-4 rounded-md text-sm font-thin",
              "bg-black/25 backdrop-blur-lg saturate-150",
              "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.02)]"
            )}
          >
            <GlassOverlays />

            {/* contenuto */}
            <div className="relative z-10">
              <Tabs
                value={seasonStatsTab}
                onValueChange={(v) => {
                  setSeasonStatsTab(v);
                  if (!summonerInfo?.puuid || !region) return;
                  if (v === "solo" && topChampionsSolo.length === 0)
                    fetchSeasonStats(summonerInfo.puuid, region, "ranked_solo");
                  if (v === "flex" && topChampionsFlex.length === 0)
                    fetchSeasonStats(summonerInfo.puuid, region, "ranked_flex");
                  if (v === "season" && topChampionsSeason.length === 0)
                    fetchSeasonStats(summonerInfo.puuid, region, "ranked_all");
                }}
              >
                <nav className="flex flex-col min-h-[400px]">
                  <div className="px-3 pt-3">
                    <TabsList className="flex justify-center w-[90%] mx-auto bg-transparent h-auto p-0 gap-5 border-b border-flash/[0.06]">
                      {([
                        { value: "season", label: "Season" },
                        { value: "solo", label: "Solo/Duo" },
                        { value: "flex", label: "Flex" },
                      ] as const).map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className={cn(
                            "group relative font-mono text-[10px] tracking-[0.2em] uppercase px-1 py-2.5 rounded-none bg-transparent border-none shadow-none transition-all duration-300 cursor-clicker",
                            "text-flash/30 hover:text-flash/50",
                            "data-[state=active]:text-jade data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                          )}
                        >
                          <span className="hidden group-data-[state=active]:inline text-jade/40 mr-0.5">[</span>
                          {tab.label}
                          <span className="hidden group-data-[state=active]:inline text-jade/40 ml-0.5">]</span>
                          <span className="absolute bottom-0 left-0 right-0 h-px bg-jade/60 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300 origin-center shadow-[0_0_6px_rgba(0,217,146,0.3)]" />
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {/* small spacer after tabs */}
                  <div className="h-2" />

                  <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait">
                      {seasonStatsTab === "season" && (
                        <TabsContent value="season" className="m-0" forceMount asChild>
                          <motion.div
                            key="season"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <StatsList champs={topChampionsSeason} />
                          </motion.div>
                        </TabsContent>
                      )}

                      {seasonStatsTab === "solo" && (
                        <TabsContent value="solo" className="m-0" forceMount asChild>
                          <motion.div
                            key="solo"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <StatsList champs={topChampionsSolo} />
                          </motion.div>
                        </TabsContent>
                      )}

                      {seasonStatsTab === "flex" && (
                        <TabsContent value="flex" className="m-0" forceMount asChild>
                          <motion.div
                            key="flex"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                          >
                            <StatsList champs={topChampionsFlex} />
                          </motion.div>
                        </TabsContent>
                      )}
                    </AnimatePresence>
                  </div>

                  <Link
                    to={`/summoners/${region}/${slug}/season`}
                    className="flex items-center justify-center gap-1.5 mt-auto mb-4 pt-2 mx-auto text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30 hover:text-jade transition-colors cursor-clicker"
                  >
                    Show more
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </nav>
              </Tabs>
            </div>
          </div>

          {monthlyDayStats.length > 0 && (
            <div className="w-[90%] mt-4 flex flex-col xl:flex-row gap-4 xl:items-stretch">
              {/* SINISTRA: HEATMAP (uguale a prima come altezza) */}
              <div className={cn(glassDark, "flex-1 text-sm font-thin")}>
                <div className="relative z-10 px-4 py-3">
                  <div className="flex items-center justify-between text-xs text-flash/70">
                    <span>THIS MONTH</span>
                    <span className="uppercase opacity-70">{monthLabel}</span>
                  </div>

                  <div className="mt-3">
                    <TooltipProvider delayDuration={80}>
                      {/* GRID CON 3 RIGHE FISSE E COLONNE AUTOMATICHE */}
                      <div
                        className="grid gap-[2px] w-fit mx-auto"
                        style={{
                          gridTemplateRows: "repeat(3, auto)",
                          gridAutoFlow: "column",
                        }}
                      >

                        {monthlyDayStats.map((cell, idx) => {
                          const dayNumber = cell.date.getDate();
                          const baseClasses = "w-3 h-3 rounded-[2px] cursor-default";

                          const dayName = cell.date.toLocaleDateString("en-US", { weekday: "short" });
                          const monthDay = cell.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                          // Celle senza partite
                          if (!cell.games || cell.winrate == null) {
                            return (
                              <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                  <div className={cn(baseClasses, "bg-white/5")} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="p-0 bg-transparent border-none shadow-none">
                                  <div className="relative bg-[#0a0f14] border border-flash/10 rounded-[3px] px-3 py-2 min-w-[100px]">
                                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-flash/20 rounded-l-[3px]" />
                                    <div className="text-[10px] font-mono text-flash/40 tracking-wider uppercase">{dayName} · {monthDay}</div>
                                    <div className="mt-1 text-[11px] text-flash/30 font-mono">No games</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }

                          // Cells with games: color based on winrate
                          // 0% = red, 50% = muted neutral, 100% = jade green
                          const wr = cell.winrate;
                          const isHighWr = wr >= 70 && cell.games >= 3;
                          let bgColor: string;
                          let shadow: string | undefined;

                          if (wr < 50) {
                            // Red side: lerp from deep red to muted
                            const t = wr / 50; // 0→1
                            const r = Math.round(180 - 100 * t);  // 180→80
                            const g = Math.round(40 + 40 * t);    // 40→80
                            const b = Math.round(50 + 30 * t);    // 50→80
                            bgColor = `rgb(${r}, ${g}, ${b})`;
                          } else {
                            // Green side: lerp from muted to jade
                            const t = (wr - 50) / 50; // 0→1
                            const r = Math.round(80 - 80 * t);    // 80→0
                            const g = Math.round(80 + 137 * t);   // 80→217
                            const b = Math.round(80 + 66 * t);    // 80→146
                            bgColor = `rgb(${r}, ${g}, ${b})`;
                          }

                          if (isHighWr) {
                            shadow = `0 0 6px rgba(0, 217, 146, 0.6), 0 0 2px rgba(0, 217, 146, 0.3)`;
                          }

                          return (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(baseClasses, isHighWr && "animate-heatmapPulse")}
                                  style={{ backgroundColor: bgColor, boxShadow: shadow }}
                                />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="p-0 bg-transparent border-none shadow-none">
                                <div className="relative bg-[#0a0f14] border border-jade/15 rounded-[3px] px-3 py-2 min-w-[120px]">
                                  <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-[2px] rounded-l-[3px]",
                                    cell.winrate >= 60 ? "bg-jade" : cell.winrate >= 50 ? "bg-jade/50" : "bg-[#c93232]"
                                  )} />
                                  <div className="text-[10px] font-mono text-flash/40 tracking-wider uppercase">{dayName} · {monthDay}</div>
                                  <div className="mt-1.5 flex items-baseline gap-2">
                                    <span className={cn(
                                      "text-base font-bold font-mono leading-none",
                                      cell.winrate >= 60 ? "text-jade" : cell.winrate >= 50 ? "text-flash/70" : "text-[#c93232]"
                                    )}>{cell.winrate}%</span>
                                    <span className="text-[10px] text-flash/30 font-mono uppercase">WR</span>
                                  </div>
                                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-flash/50">
                                    <span className="text-jade/70">{cell.wins}W</span>
                                    <span className="text-flash/20">·</span>
                                    <span className="text-[#c93232]/70">{cell.games - cell.wins}L</span>
                                    <span className="text-flash/20">·</span>
                                    <span>{cell.games} {cell.games === 1 ? "game" : "games"}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>

                  </div>

                  <div className="flex justify-between items-center mt-3 text-[10px] text-flash/50">
                    <span>NO GAMES</span>
                    <span>LOW WR</span>
                    <span>HIGH WR</span>
                  </div>
                </div>
              </div>

              {/* DESTRA: PLAYER RATING (stessa altezza grazie a items-stretch) */}
              <div className={cn(glassDark, "w-full xl:w-52 text-sm font-thin xl:flex-shrink-0")}>
                <div className="relative z-10 px-4 py-3 h-full flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] uppercase text-flash/70 tracking-wide">
                      Player rating
                    </div>
                    <div className="mt-1 text-[10px] text-flash/50">
                      Based on recent games
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2">
                    {/* Valore grande dinamico */}
                    <div className="text-3xl font-semibold text-jade leading-none">
                      {summonerInfo?.puuid && matches.length > 0
                        ? ratingToTier(recentRating)
                        : "--"}
                    </div>

                    {/* Barra score dinamica */}
                    <div className="mt-1">
                      <div className="flex justify-between text-[10px] text-flash/50 mb-1">
                        <span>Score</span>
                        <span>
                          {summonerInfo?.puuid && matches.length > 0
                            ? `${recentRating} / 100`
                            : "No data"}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-jade transition-all duration-300"
                          style={{
                            width:
                              summonerInfo?.puuid && matches.length > 0
                                ? `${recentRating}%`
                                : "40%",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}







          {duoStats.length > 0 && (
            <div className="relative overflow-hidden w-[90%] mt-5 rounded-md bg-black/25 backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="pointer-events-none absolute -top-24 left-0 h-56 w-full z-[1] bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.025),rgba(255,255,255,0)_70%)]" />
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/[0.015] via-transparent to-black/30" />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 px-4 pt-3 pb-2.5">
                  <span className="text-[11px] font-mono text-flash/50 tracking-[0.2em] uppercase shrink-0">Played With</span>
                  <div className="flex-1 h-px bg-flash/[0.08]" />
                  <span className="text-[11px] font-mono text-flash/30">{duoStats.length}</span>
                </div>

                {/* Column headers */}
                <div className="px-4 pb-2 grid grid-cols-[1.6rem_1fr_4.2rem_3.2rem] gap-x-3 items-center border-b border-flash/[0.07]">
                  <span className="text-[10px] font-mono text-flash/30 tracking-widest">#</span>
                  <span className="text-[10px] font-mono text-flash/30 tracking-widest uppercase">Player</span>
                  <span className="text-[10px] font-mono text-flash/30 tracking-widest text-right">W ◆ L</span>
                  <span className="text-[10px] font-mono text-flash/30 tracking-widest text-right">WR</span>
                </div>

                {/* Rows */}
                {visibleDuos.map((duo, i) => (
                  <div
                    key={duo.puuid}
                    onClick={() => setFilterDuoPuuid(duo.puuid === filterDuoPuuid ? null : duo.puuid)}
                    className={cn(
                      "px-4 py-2.5 grid grid-cols-[1.6rem_1fr_4.2rem_3.2rem] gap-x-3 items-center border-b border-flash/[0.05] transition-colors cursor-clicker",
                      filterDuoPuuid === duo.puuid
                        ? "bg-jade/10 border-jade/20"
                        : "hover:bg-white/[0.02]"
                    )}
                  >
                    {/* Rank */}
                    <span className="text-[10px] font-mono text-flash/30 leading-none tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    {/* Profile icon + name */}
                    <div className="flex items-center gap-2 min-w-0">
                      {duo.profileIconId && (
                        <img
                          src={`${cdnBaseUrl()}/img/profileicon/${duo.profileIconId}.png`}
                          alt=""
                          className="w-5 h-5 rounded-sm shrink-0 opacity-80"
                        />
                      )}
                      {duo.riotId.includes("#") ? (
                        <span onClick={(e) => e.stopPropagation()}>
                          <PlayerHoverCard
                            riotId={duo.riotId}
                            region={region!}
                            championId={duo.lastChampionName ? championMapReverse[duo.lastChampionName] : undefined}
                            profileIconId={duo.profileIconId ?? undefined}
                            patch={latestPatch}
                            isCurrentUser={duo.puuid === summonerInfo?.puuid}
                            championMap={championMap}
                          >
                            <span className="truncate text-flash/85 text-xs cursor-clicker">{duo.riotId}</span>
                          </PlayerHoverCard>
                        </span>
                      ) : (
                        <span className="truncate text-flash/85 text-xs">{duo.riotId}</span>
                      )}
                    </div>

                    {/* W ◆ L */}
                    <div className="flex items-center justify-end gap-1 font-mono text-xs tabular-nums">
                      <span className="text-jade">{duo.wins}W</span>
                      <span className="text-flash/30">·</span>
                      <span className="text-[#b11315]">{duo.losses}L</span>
                    </div>

                    {/* WR + mini bar */}
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn("text-xs font-mono leading-none tabular-nums", getWinrateClass(duo.winrate, duo.games))}>
                        {duo.winrate}%
                      </span>
                      <div className="w-full h-[3px] bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", duo.winrate >= 50 ? "bg-jade/60" : "bg-[#b11315]/60")}
                          style={{ width: `${duo.winrate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Expand / collapse */}
                {duoStats.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDuos(v => !v)}
                    className="group w-full py-2.5 text-[10px] font-mono text-flash/25 hover:text-jade/60 tracking-[0.25em] uppercase transition-all duration-300 cursor-clicker flex items-center justify-center gap-2"
                  >
                    <span className="h-px flex-1 max-w-[3rem] bg-flash/[0.06] group-hover:bg-jade/20 transition-colors" />
                    <span className="flex items-center gap-1.5">
                      <span className="text-jade/40 group-hover:text-jade/70 transition-colors">{showAllDuos ? '[-]' : '[+]'}</span>
                      {showAllDuos ? 'collapse' : `${duoStats.length - 3} more`}
                    </span>
                    <span className="h-px flex-1 max-w-[3rem] bg-flash/[0.06] group-hover:bg-jade/20 transition-colors" />
                  </button>
                )}
              </div>
            </div>
          )}


        </div>

        <div
          className="w-full transition-transform duration-700 ease-in-out"
          style={{
            transform: matchesCentered ? "translateX(-20%)" : "translateX(0)",
          }}
        >

          <div className="flex flex-row-reverse justify-between items-start mt-[22px] mb-6 w-full min-w-full max-w-full">
            {/* Ranks (rendered first in DOM but displayed on the right via flex-row-reverse) */}
            {(() => {
              const currentRank = rankQueueView === "flex" ? (summonerInfo?.flexRank ?? "Unranked") : (summonerInfo?.rank ?? "Unranked");
              const currentLp = rankQueueView === "flex" ? (summonerInfo?.flexLp ?? 0) : (summonerInfo?.lp ?? 0);
              const peakRank = rankQueueView === "flex" ? (summonerInfo?.peakFlexRank ?? "Unranked") : (summonerInfo?.peakRank ?? "Unranked");
              const peakLp = rankQueueView === "flex" ? (summonerInfo?.peakFlexLp ?? 0) : (summonerInfo?.peakLp ?? 0);
              return (
                <div className="flex items-center justify-center gap-0 h-full">
                  <div className="flex flex-col items-center gap-1 min-w-[160px]">
                    <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-flash/25">Current</span>
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <div className="absolute w-20 h-20 bg-black/40 rounded-full z-0 border border-flash/[0.08] shadow-md" />
                      <img
                        src={
                          !currentRank || currentRank.toLowerCase() === "unranked"
                            ? "/img/unranked.png"
                            : getRankImage(currentRank)
                        }
                        alt="Rank icon"
                        className="w-28 h-28 z-10 relative"
                        draggable={false}
                        onError={(e) => { e.currentTarget.src = "/img/unranked.png"; }}
                      />
                    </div>
                    <div className="flex flex-col items-center text-sm min-w-[180px]">
                      <span className="text-[13px] font-mono font-semibold text-flash/70 tracking-wide">{currentRank}</span>
                      {currentRank && currentRank.toLowerCase() !== "unranked" && (
                        <span className="text-[16px] font-orbitron font-bold text-jade/60 tabular-nums">{currentLp} <span className="text-[11px] text-jade/30">LP</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 min-w-[160px]">
                    <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-flash/25">Peak</span>
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <div className="absolute w-20 h-20 bg-black/40 rounded-full z-0 border border-flash/[0.08] shadow-md" />
                      <img
                        src={
                          !peakRank || peakRank.toLowerCase() === "unranked"
                            ? "/img/unranked.png"
                            : getRankImage(peakRank)
                        }
                        alt="Highest Rank icon"
                        className="w-32 h-32 z-10 relative opacity-70"
                        draggable={false}
                        onError={(e) => { e.currentTarget.src = "/img/unranked.png"; }}
                      />
                    </div>
                    <div className="flex flex-col items-center text-sm min-w-[180px]">
                      <span className="text-[13px] font-mono font-semibold text-flash/50 tracking-wide">{peakRank}</span>
                      {peakRank && peakRank.toLowerCase() !== "unranked" && (
                        <span className="text-[16px] font-orbitron font-bold text-flash/30 tabular-nums">{peakLp} <span className="text-[11px] text-flash/15">LP</span></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            <div
              className={cn(
                "relative overflow-hidden rounded-md max-w-[440px]",
                "bg-black/25 backdrop-blur-lg saturate-150",
                "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
              )}
            >
              {/* glossy overlays */}
              <div className={cn(
                "pointer-events-none absolute -top-24 left-0 h-56 w-full z-[1]",
                "bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),rgba(255,255,255,0)_62%)]"
              )} />
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/[0.02] via-transparent to-black/30" />

              <div className="relative z-10 flex items-center gap-5 px-6 py-4">

                {/* Avatar */}
                <div className="relative shrink-0 w-[96px] h-[96px]">
                  <img
                    src={
                      summonerInfo?.avatar_url
                      ?? `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`
                    }
                    className={cn(
                      "relative w-full h-full rounded-xl select-none pointer-events-none border-2 object-cover",
                      summonerInfo?.live ? "border-red-500" : "border-transparent"
                    )}
                    style={summonerInfo?.live ? { boxShadow: "0 0 16px rgba(239,68,68,0.35), 0 0 4px rgba(239,68,68,0.5)" } : undefined}
                    draggable={false}
                    onError={(e) => {
                      e.currentTarget.src =
                        `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`
                    }}
                  />
                  {summonerInfo?.live && summonerInfo?.puuid && (
                    <LiveViewer
                      puuid={summonerInfo.puuid}
                      riotId={`${summonerInfo.name}#${summonerInfo.tag}`}
                      region={region!}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {isPro && (
                      <span className="text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide" style={{ background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }}>PRO</span>
                    )}
                    {isStreamer && (
                      <span className="text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide" style={{ background: "linear-gradient(135deg, #7b42a1, #a855c7)", color: "#e0d0f0" }}>STR</span>
                    )}
                    {linkedDiscord && (
                      <span className="flex items-center gap-1.5 text-[12px] font-mono text-[#7289da]/60">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/></svg>
                        {linkedDiscord.discord_username}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div
                    className="cursor-clicker"
                    title="Click to copy"
                    onClick={() => { if (summonerInfo) navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`); }}
                  >
                    {!summonerInfo ? (
                      <Skeleton className="h-8 w-[200px] bg-white/10" />
                    ) : (
                      <>
                        <span className={cn(
                          "font-bold font-mono text-flash tracking-wide leading-none",
                          (summonerInfo.name?.length || 0) > 14 ? "text-[18px]" : (summonerInfo.name?.length || 0) > 10 ? "text-[22px]" : "text-[26px]"
                        )}>
                          {summonerInfo.name}
                        </span>
                        {summonerInfo.tag && (
                          <span className="text-[18px] font-mono text-flash/30 ml-1">#{summonerInfo.tag}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Level · Region · Rank */}
                  <div className="flex items-center gap-2.5 text-[12px] font-mono">
                    <span className="text-flash/35">Level {summonerInfo?.level}</span>
                    <span className="text-flash/15">·</span>
                    <span className="text-flash/35">{region?.toUpperCase()}</span>
                    {summonerInfo?.ladderRank && (
                      <>
                        <span className="text-flash/15">·</span>
                        <span className="text-jade/50 tracking-[0.08em]">Rank #{summonerInfo.ladderRank.toLocaleString()}</span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-1">
                    <UpdateButton
                      onClick={refreshData}
                      loading={loading}
                      cooldown={onCooldown}
                      cooldownSeconds={cooldownSeconds}
                    />
                    {summonerInfo?.puuid && region && (
                      <PlayerAnalysisDialog
                        puuid={summonerInfo.puuid}
                        region={region}
                        summonerName={summonerInfo?.name ?? name ?? "Unknown"}
                        externalOpen={analyzeOpen}
                        onExternalOpenChange={setAnalyzeOpen}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Top 3 mastery champions */}
              {topMastery.length > 0 && (
                <div className="relative z-10 flex gap-[2px] border-t border-white/[0.04]">
                  {topMastery.map((m, idx) => {
                    const fmtPoints = m.points >= 1_000_000
                      ? `${(m.points / 1_000_000).toFixed(1)}M`
                      : m.points >= 1_000
                        ? `${Math.round(m.points / 1_000)}k`
                        : String(m.points);
                    return (
                      <div
                        key={m.championId}
                        className="relative flex-1 overflow-hidden"
                      >
                        {/* Splash background */}
                        <img
                          src={cdnSplashUrl(m.champName)}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-20"
                          style={{ objectPosition: "center 20%" }}
                          onError={(e) => { e.currentTarget.style.opacity = "0" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        <div className="relative z-10 flex items-center gap-1.5 px-2.5 py-2">
                          <img
                            src={`${cdnBaseUrl()}/img/champion/${m.champName}.png`}
                            alt={m.champName}
                            className="w-5 h-5 rounded-[2px] border border-flash/[0.1]"
                          />
                          <span className="text-[11px] font-mono font-bold text-flash/70 tabular-nums">{fmtPoints}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            </div>

          </div>

          <div className="w-full mt-4">
            {/* ── Unified filter row ── */}
            <div className="flex items-center gap-2">
              {/* Queue — dropdown (many options) */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "group relative font-orbitron text-[10px] tracking-[0.15em] uppercase px-3.5 h-[32px] rounded-[2px] transition-all duration-300 cursor-clicker flex items-center gap-1.5 overflow-hidden",
                    "border backdrop-blur-lg",
                    selectedQueue !== "All"
                      ? "text-jade bg-jade/10 border-jade/30 shadow-[0_0_16px_rgba(0,217,146,0.12)]"
                      : "text-flash/50 border-flash/10 hover:text-flash/70 hover:border-flash/20 hover:shadow-[0_0_10px_rgba(215,216,217,0.05)] bg-black/40",
                  )}
                >
                  {selectedQueue === "All" ? "Queue" : selectedQueue === "Ranked Solo/Duo" ? "Solo/Duo" : "Flex"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 text-sm bg-black/60 backdrop-blur-xl border-white/10">
                  {(["All", "Ranked Solo/Duo", "Ranked Flex"] as QueueType[]).map((queue) => (
                    <DropdownMenuItem
                      key={queue}
                      onClick={() => setSelectedQueue(queue)}
                      className={cn(
                        "cursor-clicker uppercase font-mono text-[11px] tracking-[0.1em]",
                        selectedQueue === queue ? "text-jade font-semibold" : "text-flash/50"
                      )}
                    >
                      {queue}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Champion — dialog picker */}
              <div
                className={cn(
                  "font-orbitron text-[10px] tracking-[0.15em] uppercase px-3.5 rounded-[2px] transition-all duration-300 cursor-clicker flex items-center gap-1.5 h-[32px]",
                  "border backdrop-blur-lg",
                  selectedChampion
                    ? "text-jade bg-jade/10 border-jade/30 shadow-[0_0_16px_rgba(0,217,146,0.12)]"
                    : "text-flash/50 border-flash/10 hover:text-flash/70 hover:border-flash/20 hover:shadow-[0_0_10px_rgba(215,216,217,0.05)] bg-black/40",
                )}
              >
                <ChampionPicker
                  champions={allChampions}
                  selectedChampion={selectedChampion}
                  onSelect={(champName) => setSelectedChampion(champName)}
                  triggerClassName="!text-[10px] !tracking-[0.15em] !font-orbitron"
                />
              </div>

              {/* Role — segmented buttons */}
              <div className="flex items-center gap-0">
                {([
                  { value: null, label: "Role", icon: null },
                  { value: "TOP", label: "Top", icon: <RoleTopIcon className="w-4 h-4" /> },
                  { value: "JUNGLE", label: "Jng", icon: <RoleJungleIcon className="w-4 h-4" /> },
                  { value: "MIDDLE", label: "Mid", icon: <RoleMidIcon className="w-4 h-4" /> },
                  { value: "BOTTOM", label: "Adc", icon: <RoleAdcIcon className="w-4 h-4" /> },
                  { value: "UTILITY", label: "Sup", icon: <RoleSupportIcon className="w-4 h-4" /> },
                ] as { value: string | null; label: string; icon: React.ReactNode }[]).map((role, i, arr) => (
                  <button
                    key={role.label}
                    type="button"
                    onClick={() => setSelectedRole(role.value === selectedRole ? null : role.value)}
                    className={cn(
                      "font-orbitron text-[10px] tracking-[0.15em] uppercase min-w-[32px] px-2 h-[32px] transition-all duration-300 cursor-clicker flex items-center justify-center",
                      "border border-flash/10 backdrop-blur-lg",
                      i === 0 && "rounded-l-[2px]",
                      i === arr.length - 1 && "rounded-r-[2px]",
                      i > 0 && "-ml-px",
                      (role.value === null ? selectedRole === null : selectedRole === role.value)
                        ? "text-jade bg-jade/10 border-jade/30 shadow-[0_0_16px_rgba(0,217,146,0.12)] z-10"
                        : "text-flash/40 hover:text-flash/70 bg-black/40",
                    )}
                  >
                    {role.icon ?? role.label}
                  </button>
                ))}
              </div>

              {/* Result — segmented buttons */}
              <div className="flex items-center gap-0">
                {([
                  { value: "all" as const, label: "All" },
                  { value: "wins" as const, label: "W" },
                  { value: "losses" as const, label: "L" },
                ]).map((opt, i, arr) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedResult(opt.value)}
                    className={cn(
                      "font-orbitron text-[10px] tracking-[0.15em] uppercase px-2.5 h-[32px] transition-all duration-300 cursor-clicker",
                      "border border-flash/10 backdrop-blur-lg",
                      i === 0 && "rounded-l-[2px]",
                      i === arr.length - 1 && "rounded-r-[2px]",
                      i > 0 && "-ml-px",
                      selectedResult === opt.value
                        ? "text-jade bg-jade/10 border-jade/30 shadow-[0_0_16px_rgba(0,217,146,0.12)] z-10"
                        : "text-flash/40 hover:text-flash/70 bg-black/40",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Rank queue toggle */}
              <div className="flex items-center gap-0">
                {(["solo", "flex"] as const).map((mode, i, arr) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRankQueueView(mode)}
                    className={cn(
                      "font-orbitron text-[10px] tracking-[0.15em] uppercase min-w-[48px] text-center px-3 h-[32px] transition-all duration-300 cursor-clicker",
                      "border border-flash/10 backdrop-blur-lg",
                      i === 0 && "rounded-l-[2px]",
                      i === arr.length - 1 && "rounded-r-[2px]",
                      i > 0 && "border-l-0",
                      rankQueueView === mode
                        ? "text-jade bg-jade/10 border-jade/30 shadow-[0_0_16px_rgba(0,217,146,0.12)]"
                        : "text-flash/40 hover:text-flash/70 bg-black/40",
                    )}
                  >
                    {mode === "solo" ? "Solo" : "Flex"}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Stats summary bar ── */}
            {!statsBarHidden && !loading && !isIngesting && filteredMatches.length > 0 && (() => {
              const puuid = summonerInfo?.puuid
              const stats = filteredMatches.reduce((acc, m) => {
                const me = m.match.info.participants.find((p: any) => p.puuid === puuid)
                if (!me) return acc
                acc.wins += m.win ? 1 : 0
                acc.losses += m.win ? 0 : 1
                acc.kills += me.kills ?? 0
                acc.deaths += me.deaths ?? 0
                acc.assists += me.assists ?? 0
                acc.cs += (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0)
                acc.damage += me.totalDamageDealtToChampions ?? 0
                acc.vision += me.visionScore ?? 0
                acc.durationMin += (m.match.info.gameDuration ?? 0) / 60
                // Team total kills for KP
                const teamId = me.teamId
                const teamKills = m.match.info.participants
                  .filter((p: any) => p.teamId === teamId)
                  .reduce((sum: number, p: any) => sum + (p.kills ?? 0), 0)
                acc.teamKills += teamKills
                acc.count++
                return acc
              }, { wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, cs: 0, damage: 0, vision: 0, durationMin: 0, teamKills: 0, count: 0 })

              const n = stats.count || 1
              const wr = Math.round((stats.wins / (stats.wins + stats.losses || 1)) * 100)
              const avgK = (stats.kills / n).toFixed(1)
              const avgD = (stats.deaths / n).toFixed(1)
              const avgA = (stats.assists / n).toFixed(1)
              const kda = stats.deaths === 0 ? "Perfect" : ((stats.kills + stats.assists) / stats.deaths).toFixed(2)
              const csMin = stats.durationMin > 0 ? (stats.cs / stats.durationMin).toFixed(1) : "0"
              const avgDmg = Math.round(stats.damage / n).toLocaleString()
              const avgVis = (stats.vision / n).toFixed(1)
              const kp = stats.teamKills > 0 ? Math.round(((stats.kills + stats.assists) / stats.teamKills) * 100) : 0

              // SVG donut params
              const r = 20, cx = 24, cy = 24
              const circ = 2 * Math.PI * r
              const winArc = (wr / 100) * circ
              const kdaNum = stats.deaths === 0 ? 99 : (stats.kills + stats.assists) / stats.deaths
              const kdaColor = kdaNum >= 4 ? "text-jade" : kdaNum >= 3 ? "text-amber-400" : kdaNum >= 2 ? "text-flash/70" : "text-rose-400"

              // Collect visible stat sections with separators
              const sections: React.ReactNode[] = []
              if (visibleStats.kda) {
                sections.push(
                  <div key="kda" className="flex flex-col">
                    <div className="flex items-baseline gap-1">
                      <span className={cn("text-[14px] font-bold tabular-nums tracking-tight leading-none", kdaColor)}>{kda}</span>
                      <span className="text-[9px] text-flash/25 tracking-[0.1em] uppercase leading-none">KDA</span>
                    </div>
                    <span className="text-[9px] text-flash/40 tabular-nums leading-none mt-1">
                      {avgK}<span className="text-flash/15"> / </span><span className="text-red-400/50">{avgD}</span><span className="text-flash/15"> / </span>{avgA}
                    </span>
                  </div>
                )
              }
              if (visibleStats.kp) {
                sections.push(
                  <div key="kp" className="flex flex-col">
                    <span className="text-[13px] font-semibold text-flash/60 tabular-nums leading-none">{kp}%</span>
                    <span className="text-[7px] text-flash/20 tracking-[0.15em] uppercase leading-none mt-1">KP</span>
                  </div>
                )
              }
              if (visibleStats.csm) {
                sections.push(
                  <div key="csm" className="flex flex-col">
                    <span className="text-[13px] font-semibold text-flash/60 tabular-nums leading-none">{csMin}</span>
                    <span className="text-[7px] text-flash/20 tracking-[0.15em] uppercase leading-none mt-1">CS/M</span>
                  </div>
                )
              }
              if (visibleStats.dmg) {
                sections.push(
                  <div key="dmg" className="flex flex-col">
                    <span className="text-[13px] font-semibold text-flash/60 tabular-nums leading-none">{avgDmg}</span>
                    <span className="text-[7px] text-flash/20 tracking-[0.15em] uppercase leading-none mt-1">DMG</span>
                  </div>
                )
              }
              if (visibleStats.vis) {
                sections.push(
                  <div key="vis" className="flex flex-col">
                    <span className="text-[13px] font-semibold text-flash/60 tabular-nums leading-none">{avgVis}</span>
                    <span className="text-[7px] text-flash/20 tracking-[0.15em] uppercase leading-none mt-1">VIS</span>
                  </div>
                )
              }

              return (
                <div className="mt-3 flex items-center gap-4">
                  {/* Win rate ring */}
                  <div className="relative shrink-0">
                    <svg width="52" height="52" viewBox="0 0 48 48">
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3.5" />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(185,30,30,0.45)" strokeWidth="3.5"
                        strokeDasharray={circ} strokeDashoffset={0}
                        transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round" />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#00d992" strokeWidth="3.5"
                        strokeDasharray={`${winArc} ${circ - winArc}`} strokeDashoffset={0}
                        transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="round"
                        style={{ filter: "drop-shadow(0 0 5px rgba(0,217,146,0.5))" }} />
                      <text x={cx} y={cy - 3} textAnchor="middle" dominantBaseline="central"
                        className="font-mono text-[11px] font-bold"
                        fill={wr >= 55 ? "#00d992" : wr < 45 ? "#f87171" : "rgba(255,255,255,0.5)"}>
                        {wr}%
                      </text>
                      <text x={cx} y={cy + 8} textAnchor="middle" dominantBaseline="central"
                        className="font-mono text-[7px]" fill="rgba(255,255,255,0.25)">
                        {stats.wins}W {stats.losses}L
                      </text>
                    </svg>
                  </div>

                  {/* Stats row — flat, evenly distributed with separators */}
                  <div className="flex-1 flex items-center justify-between font-mono">
                    {sections.map((section, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="w-px h-5 bg-flash/[0.06]" />}
                        {section}
                      </React.Fragment>
                    ))}

                    {sections.length > 0 && <span className="w-px h-5 bg-flash/[0.06]" />}

                    {/* Games count — always shown */}
                    <span className="text-[9px] text-flash/20 tracking-[0.15em] uppercase">LAST {stats.count} GAMES</span>
                  </div>
                </div>
              )
            })()}

            {loading || isIngesting ? (
              <ul className="space-y-3 mt-4">
                {isIngesting && !loading && (
                  <div className="text-center py-4 mb-2">
                    <div className="text-flash/60 text-sm font-mono animate-pulse">
                      Fetching match history for the first time...
                    </div>
                    <div className="text-flash/30 text-xs mt-1">
                      This may take a moment
                    </div>
                  </div>
                )}
                {Array.from({ length: 10 }).map((_, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-md h-28",
                      "bg-black/22 backdrop-blur-lg saturate-150",
                      "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.4px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]"
                    )}
                  >
                    {/* summoner icon 29 as placeholder */}
                    <img
                      src={`${cdnBaseUrl()}/img/profileicon/29.png`}
                      alt=""
                      className="w-12 h-12 rounded-md opacity-15 animate-pulse"
                    />

                    {/* skeleton text */}
                    <div className="flex flex-col gap-2 w-full">
                      <Skeleton className="h-4 w-1/2 bg-white/10" />
                      <Skeleton className="h-4 w-1/3 bg-white/10" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : filteredMatches.length === 0 ? (
              <Error404 />
            ) : (
              <div ref={listRef} className="space-y-1 mt-4">
                {(matchGroupingDisabled
                  ? [["all", filteredMatches] as const]
                  : [...groupedByDay.entries()]
                ).map(([dayKey, rows]) => {
                  const wins = rows.filter(r => r.win).length;
                  const losses = rows.length - wins;
                  const wr = rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0;
                  const totalSeconds = rows.reduce((acc, r) => acc + (r.match.info.gameDuration || 0), 0);
                  const playedLabel = formatPlayedTime(totalSeconds);

                  return (
                    <section key={dayKey} className="space-y-1">
                      {/* HEADER DEL GIORNO */}
                      {!matchGroupingDisabled && (
                      <div className="flex items-center justify-between px-4 py-2 rounded-md mt-2 text-xs font-thin" >
                        <div className="uppercase text-flash/80 tracking-wide">
                          {dayLabelFromKey(dayKey)}
                        </div>
                        <div className="flex items-center gap-3 font-semibold">
                          <span className="text-jade">{wins}W</span>
                          <span className="text-[#b11315]">{losses}L</span>
                          <span className={getWinrateClass(wr, rows.length)}>{wr}% WR</span>
                          <Separator orientation="vertical" className="h-4 bg-[#48504E]" />
                          <span className="text-flash/70 uppercase">{playedLabel}</span>
                        </div>
                      </div>
                      )}

                      {/* LISTA MATCH DI QUEL GIORNO */}
                      <ul className="flex flex-col gap-1">
                        {rows.map((row) => {
                          const { match, win, championName } = row;

                          const queueId = match.info.queueId;
                          const queueLabel = queueTypeMap[queueId] || "Unknown Queue";
                          const participants = match.info.participants;

                          const team1 = participants.filter(p => p.teamId === 100);
                          const team2 = participants.filter(p => p.teamId === 200);
                          const itemKeys: (keyof Participant)[] = ["item0", "item1", "item2", "item3", "item4", "item5"];
                          const { scores, mvpWin, mvpLose } = calculateLolDataScores(participants);

                          const participant = participants.find((p) => p.puuid === summonerInfo?.puuid);

                          const playerRole = participant?.teamPosition || participant?.individualPosition;
                          const isJungler = playerRole === "JUNGLE";

                          const matchId = match.metadata.matchId;
                          const analysisEntry = analysisMap[matchId];
                          const myTeamAnalysis = analysisEntry?.data
                            ? (participant?.teamId === 100 ? analysisEntry.data.blue : analysisEntry.data.red)
                            : null;
                          const myJungleTag = myTeamAnalysis?.tag ?? null;
                          const myStartingCamp = myTeamAnalysis?.startingCamp ?? null;
                          const myInvade = myTeamAnalysis?.invade ?? null;

                          const kda =
                            participant && participant.deaths === 0 && (participant.kills + participant.assists) > 0
                              ? "Perfect"
                              : participant && participant.deaths > 0
                                ? (participant.kills + participant.assists) / participant.deaths
                                : 0;

                          const isSelfMvpOrAce =
                            !!summonerInfo?.puuid &&
                            (summonerInfo.puuid === mvpWin || summonerInfo.puuid === mvpLose);

                          const isRemake = match.info.gameDuration < 300;

                          const matchTs = getMatchTimestamp(match.info);

                          return (
                            <div
                              key={match.metadata.matchId}
                              className={cn(
                                clickToExpand
                                  ? (expandedMatchId === match.metadata.matchId ? "match-card-expanded" : "match-card-collapsed")
                                  : "match-card-group"
                              )}
                              onClick={clickToExpand ? (e) => {
                                // Don't toggle if clicking a button/link inside
                                if ((e.target as HTMLElement).closest("button, a")) return;
                                setExpandedMatchId(prev => prev === match.metadata.matchId ? null : match.metadata.matchId);
                              } : undefined}
                            >
                            <li
                              className={cn(
                                "relative overflow-hidden rounded-md p-2 text-flash transition",
                                isRemake
                                  ? "bg-black/30 backdrop-blur-lg saturate-150"
                                  : coloredMatchBg
                                    ? win
                                      ? (blueWinTint ? "bg-[#5BA8E6]/[0.10] backdrop-blur-lg saturate-150" : "bg-[#00D18D]/[0.08] backdrop-blur-lg saturate-150")
                                      : "bg-[#c93232]/[0.10] backdrop-blur-lg saturate-150"
                                    : "bg-black/18 backdrop-blur-lg saturate-150",
                                "shadow-[0_10px_30px_rgba(0,0,0,0.60),inset_0_0_0_0.35px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]",
                                isRemake
                                  ? "hover:bg-black/35 hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                                  : coloredMatchBg
                                    ? win
                                      ? (blueWinTint ? "hover:bg-[#5BA8E6]/[0.14] hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]" : "hover:bg-[#00D18D]/[0.12] hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]")
                                      : "hover:bg-[#c93232]/[0.14] hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                                    : "hover:bg-black/16 hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                              )}
                              {...(contextMenuMode ? {
                                onContextMenu: (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  setMatchCtxMenu({ x: e.clientX, y: e.clientY, matchId, isJungler });
                                }
                              } : {})}
                            >
                              {isRemake && (
                                <>
                                  {/* Diagonal warning stripes */}
                                  <div
                                    className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07]"
                                    style={{
                                      backgroundImage: "repeating-linear-gradient(-45deg, #f5a623 0px, #f5a623 8px, transparent 8px, transparent 20px)",
                                    }}
                                  />
                                  {/* Yellow border glow */}
                                  <div className="pointer-events-none absolute inset-0 z-[1] rounded-md shadow-[inset_0_0_0_1px_rgba(245,166,35,0.15)]" />
                                </>
                              )}

                              <div
                                className={cn(
                                  "pointer-events-none absolute -top-28 left-0 h-60 w-full z-[1]",
                                  isRemake
                                    ? "bg-[radial-gradient(circle_at_18%_18%,rgba(245,166,35,0.03),rgba(255,255,255,0)_72%)]"
                                    : "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.018),rgba(255,255,255,0)_72%)]"
                                )}
                              />

                              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" />

                              <div className="flex items-center justify-center h-full relative z-10">
                                <div className="w-full">


                                  {isSelfMvpOrAce && !coloredMatchBg && (
                                    <div
                                      className="absolute inset-0 z-0 mvpAceGlow"
                                      style={{ ['--glow-blue' as any]: '#0058ff', ['--glow-mint' as any]: '#9fffc3' }}
                                    />
                                  )}



                                  {/* — BORDO COLORATO */}
                                  <div
                                    className={cn(
                                      "absolute left-0 top-0 h-full w-1 rounded-l-sm z-10",
                                      isRemake
                                        ? "bg-gradient-to-b from-[#f5a623] to-[#8a6010]"
                                        : win
                                          ? (blueWinTint ? "bg-gradient-to-b from-[#5BA8E6] to-[#1a3a5c]" : "bg-gradient-to-b from-[#00D18D] to-[#11382E]")
                                          : "bg-gradient-to-b from-[#c93232] to-[#420909]"
                                    )}
                                  />

                                  {/* — CONTENUTO INTERNO */}
                                  <div className="relative z-10 ml-2">
                                    <div className="ml-2">
                                      <div className="relative flex justify-between text-[11px] uppercase text-flash/70">
                                        <span className="relative z-20 flex items-center gap-2">
                                          <span>{queueLabel}</span>

                                          <span
                                            className={cn(
                                              "px-0.5 py-[1px] rounded-sm text-[11px] font-medium border border-transparent",
                                              isRemake
                                                ? "text-[#f5a623]"
                                                : win ? (blueWinTint ? "text-[#5BA8E6]" : "text-[#00D992]") : "text-[#d63336]"
                                            )}
                                          >
                                            {isRemake ? "REMAKE" : win ? "WIN" : "LOSS"}
                                          </span>

                                          {isSelfMvpOrAce && coloredMatchBg && (
                                            <span className={cn(
                                              "text-[9px] font-mono font-bold tracking-[0.15em] px-1.5 py-[1px] rounded-[2px] border",
                                              summonerInfo?.puuid === mvpWin
                                                ? (blueWinTint ? "text-[#8ec5ff] border-[#8ec5ff]/25 bg-[#8ec5ff]/10" : "text-[#9fffc3] border-[#9fffc3]/25 bg-[#9fffc3]/10")
                                                : "text-[#ff6b6b] border-[#ff6b6b]/25 bg-[#ff6b6b]/10"
                                            )}>
                                              {summonerInfo?.puuid === mvpWin ? "MVP" : "ACE"}
                                            </span>
                                          )}

                                        </span>

                                        <span className="absolute left-1/2 transform -translate-x-1/2 z-20">
                                          {Math.floor(match.info.gameDuration / 60)}:
                                          {(match.info.gameDuration % 60).toString().padStart(2, "0")}
                                        </span>

                                        <span className="relative z-20">
                                          {timeAgo(
                                            match.info.gameEndTimestamp ??
                                            match.info.gameStartTimestamp ??
                                            match.info.gameCreation
                                          )}
                                        </span>
                                      </div>


                                      <div className="relative flex justify-between">
                                        <div className="relative z-40 flex justify-between w-full">
                                          <div className="mt-3">
                                            <div className="flex space-x-1.5 relative">
                                              <div className="relative w-12 h-12">
                                                <img
                                                  src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(championName)}.png`}
                                                  alt={championName}
                                                  className="w-12 h-12 rounded-md"
                                                />
                                                {participant?.champLevel && (
                                                  <div className="absolute -bottom-1 -right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-sm shadow font-geist">
                                                    {participant.champLevel}
                                                  </div>
                                                )}
                                              </div>

                                              {participant && (
                                                <>
                                                  <div className="flex flex-col">
                                                    <img
                                                      src={summonerSpellUrl(participant.summoner1Id)}
                                                      alt="Spell 1"
                                                      className="w-6 h-6 rounded-sm"
                                                    />
                                                    <img
                                                      src={summonerSpellUrl(participant.summoner2Id)}
                                                      alt="Spell 2"
                                                      className="w-6 h-6 rounded-sm"
                                                    />
                                                  </div>
                                                  {participant.perks?.styles && participant.perks.styles.length >= 2 && (
                                                    <div className="grid grid-rows-2 gap-0.5">
                                                      {(() => {
                                                        const keystoneId = participant.perks!.styles[0]?.selections?.[0]?.perk;
                                                        const keystoneSrc = keystoneId ? getKeystoneIcon(keystoneId) : null;
                                                        const keystoneName = keystoneId ? getKeystoneName(keystoneId) : null;
                                                        return (
                                                          <TooltipProvider delayDuration={150}>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                                                                  {keystoneSrc && (
                                                                    <img src={keystoneSrc} alt={keystoneName ?? "Keystone"} className="w-5 h-5 rounded-full" />
                                                                  )}
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
                                                        const subStyleId = participant.perks!.styles[1]?.style;
                                                        const subStyleSrc = subStyleId ? getStyleIcon(subStyleId) : null;
                                                        const subStyleName = subStyleId ? getStyleName(subStyleId) : null;
                                                        return (
                                                          <TooltipProvider delayDuration={150}>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                                                                  {subStyleSrc && (
                                                                    <img src={subStyleSrc} alt={subStyleName ?? "Secondary"} className="w-5 h-5 rounded-full opacity-70" />
                                                                  )}
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
                                                </>
                                              )}
                                              {participant && (
                                                <div className="flex ml-1">
                                                  <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
                                                    {itemKeys.map((key, index) => {
                                                      const itemId = participant[key];
                                                      return (
                                                        <div
                                                          key={index}
                                                          className="w-6 h-6 rounded-sm bg-[#0f0f0f] border border-[#2B2A2B]"
                                                        >
                                                          {typeof itemId === "number" && itemId > 0 && (
                                                            <Link to={`/items/${itemId}`} className="cursor-clicker">
                                                              <img
                                                                src={`${cdnBaseUrl()}/img/item/${itemId}.png`}
                                                                alt={`Item ${itemId}`}
                                                                className="w-full h-full rounded-sm"
                                                              />
                                                            </Link>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>

                                                  {typeof participant.item6 === "number" && participant.item6 > 0 && (
                                                    <div className="flex items-center justify-center ml-1">
                                                      <div className="w-6 h-6 bg-[#0f0f0f] rounded-full">
                                                        <img
                                                          src={`${cdnBaseUrl()}/img/item/${participant.item6}.png`}
                                                          alt={`Trinket ${participant.item6}`}
                                                          className="w-full h-full rounded-full"
                                                        />
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            { }
                                            <div className="flex flex-col mt-2">
                                              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                                {(() => {
                                                  const { className, style } = getKdaBackgroundStyle(kda);
                                                  return (
                                                    <div
                                                      className={cn(
                                                        "flex items-center justify-center h-6 w-[80px] text-[13px] font-orbitron font-bold tabular-nums rounded-[2px] border text-flash/70",
                                                        className
                                                      )}
                                                      style={style}
                                                    >
                                                      {participant?.kills}/{participant?.deaths}/{participant?.assists}
                                                    </div>
                                                  );
                                                })()}
                                                <span className="font-geist text-xs font-thin text-flash/40 ml-1">
                                                  {typeof kda === "number" ? kda.toFixed(2) : kda} KDA
                                                </span>
                                                {participant && (() => {
                                                  const team = participant.teamId === 100 ? team1 : team2;
                                                  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
                                                  const kp = teamKills > 0
                                                    ? Math.round(((participant.kills + participant.assists) / teamKills) * 100)
                                                    : 0;
                                                  return (
                                                    <span className="font-geist text-xs font-thin text-flash/40 pl-1">
                                                      {kp}% KP
                                                    </span>
                                                  );
                                                })()}

                                                <div className="ml-2">
                                                </div>

                                              </div>
                                            </div>
                                          </div>
                                          <div className="w-[44%] grid grid-cols-2 gap-4 mt-2 text-[11px]">
                                            <div>
                                              <ul className="space-y-0.5">
                                                {team1.map((p) => {
                                                  const isCurrentUser = p.puuid === summonerInfo?.puuid;
                                                  const riotName = p.riotIdGameName;
                                                  const tag = p.riotIdTagline;
                                                  const showName = riotName ? `${riotName}#${tag}` : p.puuid;
                                                  const isMvp = p.puuid === mvpWin;
                                                  const isAce = p.puuid === mvpLose;
                                                  const nameKey = riotName && tag ? `${riotName}#${tag}`.toLowerCase() : "";
                                                  const isProPlayer = nameKey && proUsernames.has(nameKey);
                                                  const isStreamerPlayer = nameKey && !isProPlayer && streamerUsernames.has(nameKey);

                                                  return (
                                                    <li key={p.puuid} className="flex items-center gap-1">
                                                      <div className="relative w-4 h-4 shrink-0">
                                                        <img
                                                          src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(p.championName)}.png`}
                                                          alt={p.championName}
                                                          className="w-4 h-4 rounded-sm"
                                                        />
                                                        {(isMvp || isAce) && (
                                                          <span
                                                            className={cn(
                                                              "absolute -top-1 -right-1 text-[8px] px-0.5 rounded-sm z-10",
                                                              isMvp && "bg-pine text-jade",
                                                              isAce && "bg-[#3A2C45] text-[#C693F1]"
                                                            )}
                                                            style={{ lineHeight: '1', fontWeight: 600 }}
                                                          >
                                                            {isMvp ? "MVP" : "ACE"}
                                                          </span>
                                                        )}
                                                      </div>
                                                      {(isProPlayer || isStreamerPlayer) && (
                                                        <span
                                                          className="shrink-0 text-[8px] font-black leading-none px-[3px] py-[1px] rounded-[3px] tracking-wide"
                                                          style={{
                                                            background: isProPlayer
                                                              ? "linear-gradient(135deg, #00d992, #00b8ff)"
                                                              : "linear-gradient(135deg, #7b42a1, #a855c7)",
                                                            color: isProPlayer ? "#040A0C" : "#e0d0f0",
                                                            boxShadow: isProPlayer
                                                              ? "0 0 6px rgba(0,217,146,0.5), 0 0 12px rgba(0,184,255,0.25)"
                                                              : "0 0 6px rgba(123,66,161,0.4), 0 0 10px rgba(168,85,199,0.2)",
                                                          }}
                                                        >
                                                          {isProPlayer ? "PRO" : "STR"}
                                                        </span>
                                                      )}
                                                      <span className="min-w-0 truncate">
                                                        {riotName && tag ? (
                                                          <PlayerHoverCard
                                                            riotId={showName}
                                                            region={region!}
                                                            championId={championMapReverse[p.championName]}
                                                            profileIconId={p.profileIconId}
                                                            patch={latestPatch}
                                                            isCurrentUser={isCurrentUser}
                                                            championMap={championMap}
                                                          >
                                                            {showName}
                                                          </PlayerHoverCard>
                                                        ) : (
                                                          <span className="truncate">{showName}</span>
                                                        )}
                                                      </span>
                                                    </li>
                                                  );
                                                })}
                                              </ul>

                                            </div>
                                            <div>
                                              <ul className="space-y-0.5">
                                                {team2.map((p) => {
                                                  const isCurrentUser = p.puuid === summonerInfo?.puuid;
                                                  const riotName = p.riotIdGameName;
                                                  const tag = p.riotIdTagline;
                                                  const showName = riotName ? `${riotName}#${tag}` : p.puuid;
                                                  const isMvp = p.puuid === mvpWin;
                                                  const isAce = p.puuid === mvpLose;
                                                  const nameKey2 = riotName && tag ? `${riotName}#${tag}`.toLowerCase() : "";
                                                  const isProPlayer = nameKey2 && proUsernames.has(nameKey2);
                                                  const isStreamerPlayer = nameKey2 && !isProPlayer && streamerUsernames.has(nameKey2);

                                                  return (
                                                    <li key={p.puuid} className="flex items-center justify-end gap-1">
                                                      <span className="min-w-0 truncate text-right">
                                                        {riotName && tag ? (
                                                          <PlayerHoverCard
                                                            riotId={showName}
                                                            region={region!}
                                                            championId={championMapReverse[p.championName]}
                                                            profileIconId={p.profileIconId}
                                                            patch={latestPatch}
                                                            isCurrentUser={isCurrentUser}
                                                            championMap={championMap}
                                                          >
                                                            {showName}
                                                          </PlayerHoverCard>
                                                        ) : (
                                                          <span className="truncate">{showName}</span>
                                                        )}
                                                      </span>
                                                      {(isProPlayer || isStreamerPlayer) && (
                                                        <span
                                                          className="shrink-0 text-[8px] font-black leading-none px-[3px] py-[1px] rounded-[3px] tracking-wide"
                                                          style={{
                                                            background: isProPlayer
                                                              ? "linear-gradient(135deg, #00d992, #00b8ff)"
                                                              : "linear-gradient(135deg, #7b42a1, #a855c7)",
                                                            color: isProPlayer ? "#040A0C" : "#e0d0f0",
                                                            boxShadow: isProPlayer
                                                              ? "0 0 6px rgba(0,217,146,0.5), 0 0 12px rgba(0,184,255,0.25)"
                                                              : "0 0 6px rgba(123,66,161,0.4), 0 0 10px rgba(168,85,199,0.2)",
                                                          }}
                                                        >
                                                          {isProPlayer ? "PRO" : "STR"}
                                                        </span>
                                                      )}
                                                      <div className="relative w-4 h-4 shrink-0">
                                                        <img
                                                          src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(p.championName)}.png`}
                                                          alt={p.championName}
                                                          className="w-4 h-4 rounded-sm"
                                                        />
                                                        {(isMvp || isAce) && (
                                                          <span
                                                            className={cn(
                                                              "absolute -top-1 -left-1 text-[8px] px-0.5 rounded-sm z-10",
                                                              isMvp && "bg-pine text-jade",
                                                              isAce && "bg-[#3A2C45] text-[#C693F1]"
                                                            )}
                                                            style={{ lineHeight: '1', fontWeight: 600 }}
                                                          >
                                                            {isMvp ? "MVP" : "ACE"}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </li>
                                                  );
                                                })}
                                              </ul>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* BADGE STRIP — only visible when analysis is open */}
                                      {isJungler && analysisEntry?.open && (
                                        <div className="mt-1.5 pt-1.5 border-t border-flash/[0.07] flex items-center gap-3">
                                          <span className="text-[8px] font-mono text-flash/20 tracking-[0.2em] uppercase shrink-0">Analysis</span>
                                          <div className="flex items-center gap-1.5">
                                            {analysisEntry.loading ? (
                                              <span className="h-5 flex items-center px-2 font-mono text-[9px] text-flash/25 tracking-[0.1em] animate-pulse">
                                                loading...
                                              </span>
                                            ) : (myJungleTag || myStartingCamp || myInvade === "invade") ? (
                                              <>
                                                {myStartingCamp && <JungleStartingCampBadge camp={myStartingCamp} />}
                                                {myInvade && <JungleInvadeBadge invade={myInvade} />}
                                                {myJungleTag && <JunglePlaystyleBadge tag={myJungleTag} topsideCount={myTeamAnalysis?.topsideCount} botsideCount={myTeamAnalysis?.botsideCount} />}
                                              </>
                                            ) : (
                                              <span className="h-5 flex items-center px-2 font-mono text-[9px] text-flash/20 tracking-[0.1em]">
                                                no data
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </li>
                            {/* Hover action tabs below the card */}
                            {!contextMenuMode && (
                              <div className="match-action-wrap" style={{ marginTop: '-1px' }}>
                                <div className="match-action-tabs flex items-center justify-between px-4 py-1">
                                  <span className="flex items-center gap-1.5 text-[9px] font-mono text-flash/50 tabular-nums tracking-wider mt-0.5">
                                    <span className="text-jade/30">&#x25C8;</span>
                                    {matchTs ? new Date(matchTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                  </span>
                                  <div className="flex gap-1.5">
                                    {/* VIEW */}
                                    <button
                                      type="button"
                                      onClick={() => handleEnterMatch(matchId)}
                                      className="px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-flash/40 hover:text-jade border-b border-flash/10 hover:border-jade/40 bg-transparent hover:bg-jade/5 transition-all duration-200 cursor-clicker"
                                    >
                                      VIEW
                                    </button>

                                    {/* SCAN */}
                                    {isJungler && (
                                      <button
                                        type="button"
                                        onClick={() => fetchAnalysis(matchId)}
                                        className={cn(
                                          "px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase border-b transition-all duration-200 cursor-clicker",
                                          analysisEntry?.open
                                            ? "text-jade border-jade/50 bg-jade/5"
                                            : "text-flash/40 border-flash/10 hover:text-jade hover:border-jade/40 hover:bg-jade/5"
                                        )}
                                      >
                                        SCAN
                                      </button>
                                    )}

                                    {/* ASK AI */}
                                    <button
                                      type="button"
                                      className="px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-flash/40 hover:text-purple-400 border-b border-flash/10 hover:border-purple-400/40 bg-transparent hover:bg-purple-500/5 transition-all duration-200 cursor-clicker"
                                      onClick={() => {
                                        const me = match.info.participants.find((p: any) => p.puuid === summonerInfo?.puuid)
                                        const champName = me?.championName ?? "Unknown"
                                        const kda = `${me?.kills ?? 0}/${me?.deaths ?? 0}/${me?.assists ?? 0}`
                                        const result = win ? "won" : "lost"
                                        const prompt = `Analyze my ${champName} game where I went ${kda} and ${result}. Match ID: ${match.metadata.matchId}`
                                        navigate(`/learn?tab=ai&prompt=${encodeURIComponent(prompt)}`)
                                      }}
                                    >
                                      ASK AI
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                            </div>
                          )
                        })}
                      </ul>
                    </section>
                  );
                })}
                {/* SENTINEL per infinite scroll */}
                <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                  {isLoadingMore && hasMore ? (
                    <LoadingSquares />
                  ) : !hasMore ? (
                    <div></div>//limit reached 
                  ) : null}
                </div>
              </div>
            )}

          </div>
        </div>
        {/* ———— CYBER MATCH TRANSITION OVERLAY ———— */}
        <style>{`
          @keyframes cyberGlitch {
            0%,100% { transform: translate(0) skewX(0deg); opacity: 1; }
            8%  { transform: translate(-3px, 1px) skewX(-2deg); opacity: 0.85; }
            16% { transform: translate(3px,-1px) skewX(2deg); clip-path: inset(15% 0 40% 0); }
            24% { transform: translate(0) skewX(0deg); opacity: 1; clip-path: none; }
            48% { transform: translate(-2px, 2px); clip-path: inset(55% 0 8% 0); opacity:0.9; }
            56% { transform: translate(2px,-2px); clip-path: none; opacity: 1; }
            72% { transform: translate(-1px,0) skewX(-1deg); }
            80% { transform: translate(0); }
          }
          @keyframes cyberScan {
            0%   { transform: translateY(-100%); opacity: 0; }
            10%  { opacity: 0.6; }
            90%  { opacity: 0.6; }
            100% { transform: translateY(100vh); opacity: 0; }
          }
          @keyframes cyberFlicker {
            0%,100% { opacity: 1; }
            33% { opacity: 0.4; }
            66% { opacity: 0.85; }
          }
          .cyber-glitch  { animation: cyberGlitch  0.55s steps(1) infinite; }
          .cyber-flicker { animation: cyberFlicker 0.4s linear infinite; }
        `}</style>

        <AnimatePresence>
          {enteringMatchId && (
            <motion.div
              className="fixed inset-0 z-[9999] overflow-hidden pointer-events-all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {/* Dark base */}
              <motion.div
                className="absolute inset-0 bg-[#020a06]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.96 }}
                transition={{ duration: 0.1 }}
              />

              {/* Horizontal scan lines — staggered sweep */}
              {Array.from({ length: 18 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute left-0 right-0 h-px"
                  style={{ top: `${(i / 18) * 100}%`, background: i % 3 === 0 ? 'rgba(0,217,146,0.25)' : 'rgba(0,217,146,0.08)' }}
                  initial={{ scaleX: 0, opacity: 0, transformOrigin: 'left' }}
                  animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 1, 0.5, 0] }}
                  transition={{ duration: 0.5, delay: i * 0.025, ease: 'easeOut' }}
                />
              ))}

              {/* Fast moving bright sweep line */}
              <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-jade to-transparent"
                initial={{ top: '-2px' }}
                animate={{ top: '100vh' }}
                transition={{ duration: 0.55, ease: 'easeIn', delay: 0.05 }}
              />
              <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-jade/40 to-transparent"
                initial={{ top: '-1px' }}
                animate={{ top: '100vh' }}
                transition={{ duration: 0.55, ease: 'easeIn', delay: 0.1 }}
              />

              {/* Corner brackets */}
              {[
                { corner: 'top-10 left-10',     border: 'border-t-2 border-l-2', origin: '-translate-x-4 -translate-y-4' },
                { corner: 'top-10 right-10',    border: 'border-t-2 border-r-2', origin: 'translate-x-4 -translate-y-4' },
                { corner: 'bottom-10 left-10',  border: 'border-b-2 border-l-2', origin: '-translate-x-4 translate-y-4' },
                { corner: 'bottom-10 right-10', border: 'border-b-2 border-r-2', origin: 'translate-x-4 translate-y-4' },
              ].map(({ corner, border, origin }, i) => (
                <motion.div
                  key={i}
                  className={`absolute ${corner} w-14 h-14 ${border} border-jade/70`}
                  initial={{ opacity: 0, transform: origin }}
                  animate={{ opacity: 1, transform: 'translate(0,0)' }}
                  transition={{ duration: 0.2, delay: 0.08 + i * 0.03, ease: 'easeOut' }}
                />
              ))}

              {/* Side readouts */}
              {['SYS://MATCH_LOAD', 'AUTH: OK', `PID: ${enteringMatchId.slice(-6)}`].map((txt, i) => (
                <motion.div
                  key={i}
                  className="absolute left-12 font-mono text-[9px] text-jade/30 tracking-[0.2em]"
                  style={{ top: `${20 + i * 5}%` }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: 0.2 + i * 0.06 }}
                >
                  {txt}
                </motion.div>
              ))}

              {/* Center HUD */}
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center gap-5"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.15 }}
              >
                {/* ◈ icon */}
                <motion.div
                  className="text-jade text-4xl font-mono cyber-flicker"
                  animate={{ rotate: [0, 180, 360] }}
                  transition={{ duration: 0.9, ease: 'easeInOut' }}
                >
                  ◈
                </motion.div>

                {/* Title */}
                <div className="flex flex-col items-center gap-1.5">
                  <span className="font-mono text-base tracking-[0.35em] uppercase text-jade cyber-glitch">
                    Entering Match
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.2em] text-jade/30">
                    {enteringMatchId}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-64 h-[2px] bg-jade/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-jade rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.85, ease: 'easeInOut', delay: 0.1 }}
                  />
                </div>

                {/* Status text */}
                <motion.span
                  className="font-mono text-[9px] text-jade/30 tracking-[0.25em] uppercase cyber-flicker"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  Loading match data...
                </motion.span>
              </motion.div>

              {/* Vignette */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cyber scroll-to-top */}
        <div
          className={cn(
            "fixed bottom-10 right-10 z-50 flex flex-col items-center gap-2",
            "transition-all duration-300 ease-in-out",
            showScrollTop ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-3"
          )}
        >
          {/* Diamond button */}
          <button
            aria-label="Scroll to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="group relative w-11 h-11 cursor-clicker"
          >
            {/* Rotated square track */}
            <span className={cn(
              "absolute inset-0 rotate-45 rounded-[4px] border transition-all duration-300",
              "bg-black/60 border-jade/40",
              "group-hover:border-jade/80 group-hover:bg-jade/10",
              "group-hover:shadow-[0_0_18px_rgba(0,217,146,0.35),inset_0_0_8px_rgba(0,217,146,0.08)]",
              "shadow-[0_0_8px_rgba(0,217,146,0.15)]"
            )}>
              {/* Scanlines inside diamond */}
              <span
                className="absolute inset-0 rounded-[3px] opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                style={{
                  background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.5) 3px, rgba(0,217,146,0.5) 4px)"
                }}
              />
            </span>

            {/* Inner content — counter-rotated to stay upright */}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-[1px]">
              {/* Up chevron */}
              <svg
                viewBox="0 0 10 6"
                className="w-3 h-3 text-jade transition-transform duration-300 group-hover:-translate-y-[2px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1,5 5,1 9,5" />
              </svg>
            </span>
          </button>

          {/* Label below */}
          <span className="font-mono text-[8px] tracking-[0.2em] text-jade/50 uppercase select-none">
            TOP
          </span>
        </div>

      </div>

      {/* ── Custom Context Menu ── */}
      <AnimatePresence>
        {ctxMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="fixed z-50"
            style={{
              top: ctxMenu.y + 200 > window.innerHeight ? ctxMenu.y - 180 : ctxMenu.y,
              left: ctxMenu.x + 200 > window.innerWidth ? ctxMenu.x - 200 : ctxMenu.x,
            }}
          >
            <div
              className={cn(
                "min-w-[200px] py-1.5 rounded-sm overflow-hidden",
                "bg-black/80 backdrop-blur-xl border border-flash/[0.10]",
                "shadow-[0_10px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(0,217,146,0.05)]"
              )}
            >
              {/* Header accent */}
              <div className="px-3 pt-1.5 pb-2 border-b border-flash/[0.06] mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-jade rounded-full" />
                  <span className="font-mono text-[9px] tracking-[0.2em] text-jade/50 uppercase">
                    {summonerInfo?.name ?? name ?? "Player"}
                  </span>
                </div>
              </div>

              {/* Section 1: Actions */}
              {([
                { icon: RotateCw, label: "Update Page", action: () => { refreshData(); }, disabled: loading || onCooldown },
                { icon: Search, label: "Analyze Player", action: () => setAnalyzeOpen(true) },
                { icon: BarChart3, label: "Season Stats", action: () => navigate(`/summoners/${region}/${name.replace(/\s+/g, "+")}-${tag}/season`) },
              ] as { icon: any; label: string; action: () => void; disabled?: boolean }[]).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => { e.stopPropagation(); setCtxMenu(null); item.action(); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150",
                    "font-mono text-[11px] tracking-[0.12em] uppercase",
                    item.disabled
                      ? "text-flash/15 cursor-not-allowed"
                      : "text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker",
                  )}
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Section: Change Visualization (logged-in only) */}
              {authSession && (
                <>
                  <div className="mx-3 my-1 h-px bg-flash/[0.06]" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCtxMenu(null);
                      navigate("/dashboard/preferences?highlight=summoner-page");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Change Visualization</span>
                  </button>
                </>
              )}

              {/* Section 2: Copy IDs */}
              {(linkedDiscord?.discord_username || summonerInfo?.name) && (
                <>
                  <div className="mx-3 my-1 h-px bg-flash/[0.06]" />
                  {/* Copy Riot ID */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCtxMenu(null);
                      const riotId = `${summonerInfo?.name ?? name}#${summonerInfo?.tag ?? tag}`;
                      navigator.clipboard.writeText(riotId);
                      showCyberToast({ title: "Riot ID copied" });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                      <path d="M13.458.86 0 7.093l3.353 12.761 2.552-.313-.701-8.024.838-.373 1.447 8.202 4.361-.535-.775-8.857.83-.37 1.591 9.025 4.412-.542-.849-9.708.84-.374 1.74 9.87L24 17.318V3.5Zm.316 19.356.222 1.256L24 23.14v-4.18l-10.22 1.256Z" />
                    </svg>
                    <span>Copy Riot ID</span>
                  </button>
                  {/* Copy Discord */}
                  {linkedDiscord?.discord_username && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCtxMenu(null);
                        navigator.clipboard.writeText(linkedDiscord.discord_username!);
                        showCyberToast({ title: "Discord ID copied" });
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                        <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                      </svg>
                      <span>Copy Discord</span>
                    </button>
                  )}
                </>
              )}

              {/* Section 3: Report */}
              {premiumPlan && (
                <>
                  <div className="mx-3 my-1 h-px bg-flash/[0.06]" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCtxMenu(null);
                      setReportReason(null);
                      setShowReportModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-red-400 hover:bg-red-500/[0.06] cursor-clicker"
                  >
                    <Flag className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Report Player</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Match Context Menu (right-click) ── */}
        {matchCtxMenu && contextMenuMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="fixed z-50"
            style={{
              top: matchCtxMenu.y + 160 > window.innerHeight ? matchCtxMenu.y - 140 : matchCtxMenu.y,
              left: matchCtxMenu.x + 200 > window.innerWidth ? matchCtxMenu.x - 200 : matchCtxMenu.x,
            }}
          >
            <div
              className={cn(
                "min-w-[180px] py-1.5 rounded-sm overflow-hidden",
                "bg-black/80 backdrop-blur-xl border border-flash/[0.10]",
                "shadow-[0_10px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(0,217,146,0.05)]"
              )}
            >
              <div className="px-3 pt-1.5 pb-2 border-b border-flash/[0.06] mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-jade rounded-full" />
                  <span className="font-mono text-[9px] tracking-[0.2em] text-jade/50 uppercase">
                    Match Actions
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { handleEnterMatch(matchCtxMenu.matchId); setMatchCtxMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker"
              >
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                <span>View Match</span>
              </button>

              {matchCtxMenu.isJungler && (
                <button
                  type="button"
                  onClick={() => { fetchAnalysis(matchCtxMenu.matchId); setMatchCtxMenu(null); }}
                  className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-amber-400 hover:bg-amber-400/[0.06] cursor-clicker"
                >
                  <Search className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Scan Jungle</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setMatchCtxMenu(null); }}
                className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-violet-400 hover:bg-violet-400/[0.06] cursor-clicker"
              >
                <BarChart3 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Ask AI</span>
              </button>

              <div className="mx-3 my-1 h-px bg-flash/[0.06]" />

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(matchCtxMenu.matchId);
                  showCyberToast({ title: "Match ID copied" });
                  setMatchCtxMenu(null);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy Match ID</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report Player Modal ── */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowReportModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "relative z-10 w-[380px] rounded-sm overflow-hidden",
                "bg-[#060d10]/95 backdrop-blur-xl",
                "border border-flash/[0.10]",
                "shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(0,217,146,0.05)]"
              )}
            >
              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-flash/[0.06]">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-red-500 rounded-full" />
                  <span className="font-mono text-[10px] tracking-[0.2em] text-flash/50 uppercase">
                    Report Player
                  </span>
                </div>
                <p className="font-mono text-[10px] text-flash/25 mt-2 tracking-wide">
                  Select a reason for reporting{" "}
                  <span className="text-jade/60">{summonerInfo?.name ?? name}</span>
                </p>
              </div>

              {/* Reason options */}
              <div className="px-5 py-4 flex flex-col gap-2">
                {["Inappropriate Profile Picture", "Inappropriate Username", "Impersonation", "Other"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReportReason(reportReason === reason ? null : reason)}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-sm text-left transition-all duration-150 cursor-clicker",
                      "font-mono text-[11px] tracking-[0.12em] uppercase",
                      "border",
                      reportReason === reason
                        ? "text-red-400 bg-red-500/[0.08] border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.08)]"
                        : "text-flash/35 border-flash/[0.08] hover:text-flash/50 hover:border-flash/[0.15] bg-black/20"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 pb-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="font-mono text-[10px] tracking-[0.15em] uppercase text-flash/30 hover:text-flash/50 transition-colors cursor-clicker px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    showCyberToast({ title: "Report submitted" });
                  }}
                  disabled={!reportReason}
                  className={cn(
                    "font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded-sm transition-all duration-150 cursor-clicker",
                    "border",
                    reportReason
                      ? "text-red-400 border-red-500/30 bg-red-500/[0.06] hover:bg-red-500/[0.12]"
                      : "text-flash/15 border-flash/[0.05] bg-black/10 cursor-not-allowed"
                  )}
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}



