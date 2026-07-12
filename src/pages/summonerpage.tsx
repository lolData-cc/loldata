import React from "react"
import { createPortal } from "react-dom"
import type { MatchWithWin, SummonerInfo, ChampionStats, Participant } from "@/assets/types/riot"
import { computeImpact } from "@/utils/impact"
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
import { cdnBaseUrl, cdnSplashUrl, doubleLpBadgeUrl, getCdnVersion, normalizeChampName, summonerSpellUrl } from "@/config"
import { JunglePlaystyleBadge, JungleStartingCampBadge, JungleInvadeBadge } from "@/components/jungleplaystylebadge";
import { getKeystoneIcon, getStyleIcon, getKeystoneName, getStyleName } from "@/constants/runes";
import { PlayerAnalysisDialog } from "@/components/PlayerAnalysisDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { DiamondButton } from "@/components/ui/diamond-button"
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
import { API_BASE_URL, BOX_API_BASE_URL } from "@/config"
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
import { calculateLoldataScore } from "@/utils/loldataScore";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { enrichRecentProfile } from "@/lib/recentSearchedProfiles";
import { GlassOverlays } from "@/components/ui/glass-overlays";
import { MatchReplayDialog } from "@/components/matchreplay/MatchReplayDialog";
import MatchExpand from "@/components/matchexpand";
import { AnimatedOutline } from "@/components/ui/animated-outline";

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
  const [closingMatchId, setClosingMatchId] = useState<string | null>(null) // plays the collapse animation before unmount
  const [replayMatch, setReplayMatch] = useState<{ matchId: string; match: MatchWithWin["match"] } | null>(null)
  const { session: authSession, isAdmin } = useAuth()
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
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminType, setAdminType] = useState<"pro" | "streamer">("pro");
  const [adminFields, setAdminFields] = useState({ nickname: "", team: "", firstName: "", lastName: "", nationality: "", twitchLogin: "" });
  const [proUsernames, setProUsernames] = useState<Set<string>>(new Set());
  const [streamerUsernames, setStreamerUsernames] = useState<Set<string>>(new Set());
  const [proPlayerInfo, setProPlayerInfo] = useState<{
    id: string; username: string; first_name: string | null; last_name: string | null;
    nickname: string | null; team: string | null; nationality: string | null;
    profile_image_url: string | null; slug: string;
  } | null>(null);
  const [proTeamLogo, setProTeamLogo] = useState<string | null>(null);
  const [proLinkedAccounts, setProLinkedAccounts] = useState<string[]>([]);
  const [streamerInfo, setStreamerInfo] = useState<{ twitch_login: string; region: string | null; slug: string } | null>(null);
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
  const [splitTotals, setSplitTotals] = useState<{ games: number; wins: number; losses: number } | null>(null);
  const [seasonOrSplitView, setSeasonOrSplitView] = useState<"season" | "split">("season");
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

  const loldata = useMemo(() => {
    return calculateLoldataScore(matches, summonerInfo?.puuid ?? "", 20);
  }, [matches, summonerInfo?.puuid]);

  const recentDetailedStats = useMemo(() => {
    if (!summonerInfo?.puuid || matches.length === 0)
      return null;

    const recent = matches.slice(0, 10);
    let games = 0, wins = 0;
    let totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalCS = 0, totalGold = 0, totalMinutes = 0;
    let impactSum = 0;
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
      impactSum += computeImpact(me, m.match.info);

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
      avgImpact: games > 0 ? Math.round(impactSum / games) : 0,
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
    710: "Ranked 5s",
    900: "URF",
    1020: "One for All",
    1700: "Arena",
  };

  const glassDark = cn(
    "relative overflow-hidden rounded-md",
    "bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel",
    "shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
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
          .select("discord_username, discord_avatar_url, discord_public")
          .eq("nametag", nametag)
          .not("discord_id", "is", null)
          .maybeSingle();

        if (error) {
          console.warn("discord lookup error:", error.message);
          setLinkedDiscord(null);
          return;
        }

        // discord_public === false → the player opted out of showing the badge.
        // null/true → shown (default, pre-toggle behaviour).
        if (data && data.discord_public !== false) {
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

  // Backfill the search-dialog "recently viewed" trail with whatever
  // icon/rank we just loaded. The trail is populated client-side by
  // the dialog (localStorage); when the user types a manual
  // "Name#Tag" submit that has no autocomplete match the entry lands
  // with icon_id / rank both null. Visiting this page IS the act of
  // resolving the profile, so we patch the trail in place — next time
  // the dialog opens, the avatar + rank chip are already there
  // without forcing the user to re-search.
  useEffect(() => {
    if (!summonerInfo?.name || !summonerInfo?.tag || !region) return;
    enrichRecentProfile(
      summonerInfo.name,
      summonerInfo.tag,
      region.toUpperCase(),
      {
        icon_id: summonerInfo.profileIconId ?? null,
        rank: summonerInfo.rank ?? null,
      }
    );
  }, [
    region,
    summonerInfo?.name,
    summonerInfo?.tag,
    summonerInfo?.profileIconId,
    summonerInfo?.rank,
  ]);

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

    // One box call resolves the whole talent identity for the header line:
    // curated Cloud pros win, then the scraped box pros (lolpros import),
    // then streamers. Replaces the old browser→Supabase reads.
    const nametag = `${name}#${tag}`;
    const clear = () => {
      setProPlayerInfo(null); setProTeamLogo(null); setProLinkedAccounts([]); setStreamerInfo(null);
    };
    fetch(`${BOX_API_BASE_URL}/api/pros/identity?nametag=${encodeURIComponent(nametag)}`)
      .then((r) => (r.ok ? r.json() : { type: null }))
      .then((id) => {
        setIsPro(id.type === "pro");
        setIsStreamer(id.type === "streamer");
        if (id.type === "pro") {
          setProPlayerInfo({
            id: id.slug,
            username: id.accounts?.[0] ?? nametag,
            first_name: id.realName ?? null,
            last_name: null,
            nickname: id.name ?? null,
            team: id.team ?? null,
            nationality: id.nationality ?? null,
            profile_image_url: id.avatar ?? null,
            slug: id.slug,
          });
          setProTeamLogo(id.teamLogo ?? null);
          setProLinkedAccounts(id.accounts ?? []);
          setStreamerInfo(null);
        } else if (id.type === "streamer") {
          clear();
          setStreamerInfo({ twitch_login: id.twitchLogin ?? id.name, region: id.region ?? null, slug: id.slug });
        } else {
          clear();
        }
      })
      .catch(() => { setIsPro(false); setIsStreamer(false); clear(); });
  }, [slug]);

  useEffect(() => {
    // Scoreboard nameplates: every known pro/streamer account nametag, merged
    // server-side on the box (lolpros import + curated Cloud tables).
    fetch(`${BOX_API_BASE_URL}/api/pros/badge-map`)
      .then((r) => (r.ok ? r.json() : { pros: [], streamers: [] }))
      .then(({ pros, streamers }: { pros: string[]; streamers: string[] }) => {
        setProUsernames(new Set(pros));
        setStreamerUsernames(new Set(streamers));
      })
      .catch(() => { /* badges are decorative — fail silent */ });
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
    fetchSplitStats(summonerInfo.puuid, region, "ranked_all");
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
      fetchSplitStats(summonerInfo.puuid, region, "ranked_all");
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
    setSplitTotals(null);
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

  async function fetchSplitStats(
    puuid: string,
    region: string,
    queueGroup: "ranked_all" | "ranked_solo" | "ranked_flex" = "ranked_all"
  ) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/split_stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, region, queueGroup }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.splitTotals) setSplitTotals(data.splitTotals);
      }
    } catch (err) {
      console.error("Error fetching split stats:", err);
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
                  <div key={champ.champion} className="flex items-center justify-between px-3 w-full xl:grid xl:grid-cols-[148px_96px_minmax(0,1fr)] xl:items-center xl:gap-3">
                    <div className="flex items-center gap-3 xl:justify-self-start">
                      <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(champ.champion)}.png`} alt={champ.champion} className="w-12 h-12 rounded-full ring-1 ring-flash/10" />
                      <div className="flex flex-col gap-0.5 justify-start min-w-0">
                        <div className="font-chakrapetch font-bold uppercase tracking-[0.04em] text-[13px] text-flash truncate max-w-[100px]">{champ.champion}</div>
                        <div className="font-mono text-[10.5px] tabular-nums text-flash/55">
                          {(() => {
                            const num = Number(champ.csPerMin);
                            const rounded = Math.round(num * 10) / 10;
                            return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
                          })()} CS
                        </div>
                      </div>
                    </div>

                    {/* Center KDA column — visible only at xl+ */}
                    <div className="hidden xl:flex flex-col items-center gap-0.5 whitespace-nowrap xl:w-full">
                      <div className={cn("font-chakrapetch font-bold text-[13px] tabular-nums leading-none", getKdaClass(champ.avgKda))}>
                        {champ.avgKda} KDA
                      </div>
                      <div className="font-mono text-[10.5px] tabular-nums text-flash/55">
                        {formatStat(champ.kills / champ.games)} / {formatStat(champ.deaths / champ.games)} / {formatStat(champ.assists / champ.games)}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 xl:flex-col xl:items-end xl:gap-1 xl:justify-self-end">
                      {/* KDA with tooltip — visible only below xl */}
                      <div className="xl:hidden">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn("font-chakrapetch font-bold text-[13px] tabular-nums cursor-default", getKdaClass(champ.avgKda))}>{champ.avgKda} KDA</div>
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
                              <div className={cn("font-chakrapetch font-bold text-[13px] tabular-nums cursor-default", getWinrateClass(champ.winrate, champ.games))}>{champ.winrate}%</div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {champ.games} matches
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Winrate + matches text — visible at xl+ */}
                      <div className={cn("hidden xl:block font-chakrapetch font-bold text-[13px] tabular-nums leading-none", getWinrateClass(champ.winrate, champ.games))}>
                        {champ.winrate}%
                      </div>
                      <div className="hidden xl:block font-mono text-[9.5px] tracking-[0.18em] uppercase text-flash/40">
                        {champ.games} matches
                      </div>
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
        <div className={cn(
          "fixed right-10 z-50 transition-all duration-300",
          showScrollTop ? "bottom-[7.5rem]" : "bottom-10"
        )}>
          <DiamondButton
            color="red"
            icon={<X className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" />}
            label="RESET"
            onClick={() => {
              setSelectedQueue("All");
              setSelectedChampion(null);
              setSelectedResult("all");
              setSelectedRole(null);
              setFilterDuoPuuid(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}
      <div className="relative flex min-h-screen -mt-4 z-10">
        <div
          className="hidden lg:flex w-2/5 min-w-[35%] flex flex-col gap-0 items-center transition-opacity duration-700 ease-in-out"
          style={{ opacity: matchesCentered ? 0 : 1 }}
        >

          {/* (pro/streamer identity now renders on the header line above the summoner name) */}

          <div
            className={cn(
              "relative overflow-hidden w-[90%] mt-5 rounded-md text-sm font-thin",
              "bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel",
              "shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
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
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSeasonOrSplitView("season")}
                      className={cn(
                        "text-[10px] font-mono tracking-[0.25em] uppercase transition-colors cursor-clicker",
                        seasonOrSplitView === "season"
                          ? "text-flash/60"
                          : "text-flash/20 hover:text-flash/40"
                      )}
                    >
                      This Season
                    </button>
                    <span className="text-flash/15 text-[10px]">·</span>
                    <button
                      type="button"
                      onClick={() => setSeasonOrSplitView("split")}
                      className={cn(
                        "text-[10px] font-mono tracking-[0.25em] uppercase transition-colors cursor-clicker",
                        seasonOrSplitView === "split"
                          ? "text-flash/60"
                          : "text-flash/20 hover:text-flash/40"
                      )}
                    >
                      This Split
                    </button>
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

                  {(() => {
                    const isSplit = seasonOrSplitView === "split";
                    const dataReady = isSplit ? splitTotals !== null : summonerInfo !== null;
                    const wins = isSplit ? splitTotals?.wins ?? 0 : summonerInfo?.wins ?? 0;
                    const losses = isSplit ? splitTotals?.losses ?? 0 : summonerInfo?.losses ?? 0;
                    const totalGames = wins + losses;
                    const winrate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

                    return (
                      <div className="flex items-end gap-5 mt-12">
                        {/* Wins */}
                        <div className="flex flex-col items-center">
                          {dataReady ? (
                            <span className="text-3xl font-orbitron font-bold text-jade tabular-nums leading-none">{wins}</span>
                          ) : (
                            <span className="text-3xl font-orbitron font-bold text-jade/30 tabular-nums leading-none animate-pulse">--</span>
                          )}
                          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-jade/50 mt-1">Wins</span>
                        </div>

                        {/* Separator */}
                        <div className="h-8 w-[1px] bg-flash/10 mb-1" />

                        {/* Losses */}
                        <div className="flex flex-col items-center">
                          {dataReady ? (
                            <span className="text-3xl font-orbitron font-bold text-[#b11315] tabular-nums leading-none">{losses}</span>
                          ) : (
                            <span className="text-3xl font-orbitron font-bold text-[#b11315]/30 tabular-nums leading-none animate-pulse">--</span>
                          )}
                          <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-[#b11315]/50 mt-1">Losses</span>
                        </div>

                        {/* Separator */}
                        <div className="h-8 w-[1px] bg-flash/10 mb-1" />

                        {/* Winrate */}
                        {dataReady ? (
                          <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-0.5">
                              <span className={`text-3xl font-orbitron font-bold tabular-nums leading-none ${getWinrateClass(winrate, totalGames)}`}>{winrate}</span>
                              <span className={`text-lg font-orbitron font-bold leading-none ${getWinrateClass(winrate, totalGames)}`}>%</span>
                            </div>
                            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 mt-1">Winrate</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="flex items-baseline gap-0.5">
                              <span className="text-3xl font-orbitron font-bold text-flash/20 tabular-nums leading-none animate-pulse">--</span>
                              <span className="text-lg font-orbitron font-bold text-flash/20 leading-none animate-pulse">%</span>
                            </div>
                            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 mt-1">Winrate</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* ———— PERFORMANCE OVERVIEW ———— */}
              {!recentDetailedStats && (
                <div className="px-3 pt-2 pb-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 -ml-2 flex items-center justify-center w-[180px] h-[180px]">
                      <div className="w-[120px] h-[120px] rounded-full border border-hairline/[0.06]" />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3.5 flex-1 min-w-0">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col gap-1.5">
                          <Skeleton className="w-[40px] h-2.5" />
                          <Skeleton className="w-[52px] h-4" />
                        </div>
                      ))}
                    </div>
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
                    <div className="flex items-center gap-3">

                      {/* Radar chart — left (unchanged mood) */}
                      <TooltipProvider delayDuration={0}>
                        <div className="shrink-0 -ml-2 relative">
                          <svg width="180" height="180" viewBox="0 0 220 220">
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
                            {/* Axis labels */}
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

                      {/* Stats — minimal 2-column readout, each a grey cyber pill */}
                      <div className="grid grid-cols-2 gap-1.5 flex-1 min-w-0 self-start mt-7">
                        {[
                          { label: "KDA", value: recentDetailedStats.avgKda },
                          { label: "CS/MIN", value: recentDetailedStats.csPerMin },
                          { label: "KP", value: `${recentDetailedStats.avgKP}%` },
                          { label: "DMG", value: `${recentDetailedStats.avgDmg}%` },
                          { label: "GOLD/M", value: String(recentDetailedStats.goldPerMin) },
                          { label: "AVG IMPACT", value: recentDetailedStats.avgImpact },
                        ].map(s => (
                          <div key={s.label} className="flex flex-col gap-0.5 rounded-[7px] bg-gradient-to-b from-filmlight/[0.07] to-filmlight/[0.02] px-2.5 py-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]">
                            <div className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rotate-45 bg-jade/60 shrink-0" />
                              <span className="text-[8.5px] font-mono uppercase tracking-[0.14em] text-flash/35 whitespace-nowrap">{s.label}</span>
                            </div>
                            <span className="font-chakrapetch font-bold text-[17px] text-flash/90 tabular-nums leading-none pl-2.5">{s.value}</span>
                          </div>
                        ))}
                      </div>

                    </div>

                  </div>
                );
              })()}
            </div>
          </div>


          <div
            id="season-stats"
            className={cn(
              "relative overflow-hidden w-[90%] h-[420px] mt-4 rounded-md text-sm font-thin",
              "bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel",
              "shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.02)]"
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
                            "group relative font-chakrapetch text-[12px] tracking-[0.18em] uppercase px-1 py-2.5 rounded-none bg-transparent border-none shadow-none transition-all duration-300 cursor-clicker",
                            "text-flash/40 hover:text-flash/65",
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
                    className="flex items-center justify-center gap-1.5 mt-auto mb-4 pt-2 mx-auto text-[11px] font-chakrapetch tracking-[0.18em] uppercase text-flash/45 hover:text-jade transition-colors cursor-clicker"
                  >
                    Show more
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </nav>
              </Tabs>
            </div>
          </div>

          {!!summonerInfo?.puuid && matches.length > 0 && (
            <div className="w-[90%] mt-4 flex flex-col gap-4">
              {/* LOLDATA SCORE — rank-relative performance rating (full-width) */}
              <div className={cn(glassDark, "w-full text-sm font-thin")}>
                <div className="relative z-10 px-5 py-4">
                  {(() => {
                    const has = !!summonerInfo?.puuid && matches.length > 0 && loldata.games > 0;
                    const s = loldata.score;
                    const up = s >= 57, down = s <= 44;
                    const sColor = up ? "text-jade" : down ? "text-[#e0503f]" : "text-flash/80";
                    const cats = [
                      { k: "Combat", v: loldata.dimensions.combat },
                      { k: "Damage", v: loldata.dimensions.damage },
                      { k: "Economy", v: loldata.dimensions.economy },
                      { k: "Vision", v: loldata.dimensions.vision },
                      { k: "Objectives", v: loldata.dimensions.objectives },
                    ];
                    const vHex = (v: number) => (v >= 55 ? "#00d992" : v <= 45 ? "#e0503f" : "rgba(215,216,217,0.72)");
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/55">
                            LOLDATA Score
                          </span>
                          <div className="flex-1 h-px bg-flash/[0.07]" />
                          {has && (
                            <span className="text-[9px] font-jetbrains tracking-wide uppercase text-flash/35">
                              {loldata.games} games
                            </span>
                          )}
                        </div>

                        {/* score row */}
                        <div className="mt-2 flex items-center gap-3 flex-wrap">
                          <span className={cn("text-[54px] font-chakrapetch font-bold leading-none tracking-tight", sColor)}>
                            {has ? s : "--"}
                          </span>
                          {has && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={cn(
                                  "text-[12px] font-chakrapetch font-bold px-2 py-[2px] rounded-[3px] tracking-wide leading-none",
                                  up ? "bg-jade/15 text-jade" : down ? "bg-[#e0503f]/15 text-[#e0503f]" : "bg-flash/10 text-flash/60"
                                )}
                              >
                                {loldata.delta >= 0 ? `+${loldata.delta}` : loldata.delta}
                              </span>
                              <span className="text-[8px] font-jetbrains uppercase tracking-[0.16em] text-flash/35 leading-none">
                                vs rank
                              </span>
                            </div>
                          )}
                          <div className="hidden sm:block h-9 w-px bg-flash/[0.08] mx-0.5" />
                          <span
                            className={cn(
                              "text-[13px] font-chakrapetch",
                              up ? "text-jade" : down ? "text-[#e0503f]" : "text-flash/65"
                            )}
                          >
                            {has ? loldata.verdict : "Not enough games"}
                          </span>
                        </div>

                        {/* dimension stat pills — symmetric 5-up grid, full width */}
                        {has && (
                          <div className="mt-4 grid grid-cols-5 gap-2.5">
                            {cats.map((d) => (
                              <div
                                key={d.k}
                                className="flex flex-col items-center justify-center gap-1.5 rounded-[3px] py-3 px-1 bg-gradient-to-b from-filmlight/[0.055] to-filmlight/[0.015] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                              >
                                <span className="text-[8px] font-jetbrains uppercase tracking-[0.04em] text-flash/45 text-center leading-none whitespace-nowrap">
                                  {d.k}
                                </span>
                                <span className="text-[22px] font-chakrapetch font-bold leading-none" style={{ color: vHex(d.v) }}>
                                  {d.v}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}







          {duoStats.length > 0 && (
            <div className="relative overflow-hidden w-[90%] mt-5 rounded-md bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]">
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
                        : "hover:bg-filmlight/[0.02]"
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
                      <div className="w-full h-[3px] bg-filmlight/10 rounded-full overflow-hidden">
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
          className="w-full min-w-0 transition-transform duration-700 ease-in-out"
          style={{
            transform: matchesCentered ? "translateX(-20%)" : "translateX(0)",
          }}
        >

          {/* ── mobile-only minimal profile + rank card (replaces the oversized desktop blocks below, which are hidden on phones) ── */}
          <div className="lg:hidden relative overflow-hidden mt-20 rounded-md border border-jade/15 bg-[rgba(6,12,14,0.6)] p-3">
            {/* semi-transparent main-champion splash, faded out toward the left */}
            {topChampionsSeason.length > 0 && (
              <img
                src={cdnSplashUrl(topChampionsSeason[0].champion)}
                alt=""
                className="pointer-events-none absolute inset-y-0 right-0 h-full w-[60%] object-cover object-right opacity-20"
                style={{
                  WebkitMaskImage: "linear-gradient(to left, black 0%, transparent 85%)",
                  maskImage: "linear-gradient(to left, black 0%, transparent 85%)",
                }}
                draggable={false}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            )}
            <div className="relative z-10">
            {/* header: icon + name/tag + level·region */}
            <div className="flex items-center gap-3">
              <img
                src={
                  summonerInfo?.avatar_url
                  ?? `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`
                }
                alt=""
                className={cn(
                  "w-14 h-14 rounded object-cover shrink-0 border-2",
                  summonerInfo?.live ? "border-red-500" : "border-transparent"
                )}
                draggable={false}
                onError={(e) => {
                  e.currentTarget.src = `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`;
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate">
                  <span className="font-chakrapetch font-bold text-lg text-flash">{summonerInfo?.name}</span>
                  {summonerInfo?.tag && (
                    <span className="text-flash/40 font-chakrapetch text-sm ml-0.5">#{summonerInfo.tag}</span>
                  )}
                </div>
                <div className="text-[11px] font-jetbrains text-flash/40 mt-0.5">
                  Level {summonerInfo?.level} · {region?.toUpperCase()}
                </div>
              </div>
            </div>

            <div className="h-px bg-flash/10 my-2.5" />

            {/* rank rows: Solo/Duo + Flex */}
            {([
              { label: "Solo", rank: summonerInfo?.rank, lp: summonerInfo?.lp },
              { label: "Flex", rank: summonerInfo?.flexRank, lp: summonerInfo?.flexLp },
            ] as { label: string; rank?: string; lp?: number }[]).map((q) => {
              const isUnranked = !q.rank || q.rank.toLowerCase() === "unranked";
              return (
                <div key={q.label} className="flex items-center gap-2 py-0.5">
                  <img
                    src={isUnranked ? "/img/unranked.png" : getRankImage(q.rank)}
                    alt=""
                    className="w-8 h-8 shrink-0"
                    draggable={false}
                    onError={(e) => { e.currentTarget.src = "/img/unranked.png"; }}
                  />
                  {isUnranked ? (
                    <span className="font-chakrapetch text-sm text-flash/50">Unranked</span>
                  ) : (
                    <span className="font-chakrapetch text-sm text-flash">
                      {q.rank}
                      <span className="text-flash/50 text-xs"> · {q.lp ?? 0} LP</span>
                    </span>
                  )}
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-flash/30">{q.label}</span>
                </div>
              );
            })}
            </div>
          </div>

          <div className="flex flex-col-reverse lg:flex-row-reverse lg:flex-nowrap justify-center lg:justify-between items-center lg:items-start mt-2 lg:mt-[22px] mb-2 lg:mb-0 w-full min-w-full max-w-full">
            {/* Ranks (rendered first in DOM but displayed on the right via flex-row-reverse) */}
            {(() => {
              const ranks = [
                { key: "solo", label: "Solo/Duo", rank: summonerInfo?.rank ?? "Unranked", lp: summonerInfo?.lp ?? 0 },
                { key: "flex", label: "Flex", rank: summonerInfo?.flexRank ?? "Unranked", lp: summonerInfo?.flexLp ?? 0 },
                { key: "ranked5", label: "Ranked 5s", rank: summonerInfo?.ranked5Rank ?? "Unranked", lp: summonerInfo?.ranked5Lp ?? 0 },
              ];
              return (
                <div className="hidden lg:flex flex-nowrap items-start justify-center gap-9 h-full flex-1 mt-3">
                  {ranks.map(({ key, label, rank, lp }) => {
                    const unranked = !rank || String(rank).toLowerCase() === "unranked";
                    return (
                      <div key={key} className="flex flex-col items-center gap-1.5 min-w-[106px]">
                        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 whitespace-nowrap">{label}</span>
                        <div className="relative w-[84px] h-[84px] flex items-center justify-center">
                          <div className="absolute w-14 h-14 bg-filmdark/40 rounded-full z-0 border border-flash/[0.08] shadow-md" />
                          <img
                            src={unranked ? "/img/unranked.png" : getRankImage(rank)}
                            alt={`${label} rank`}
                            className="relative z-10 w-[98px] h-[98px]"
                            draggable={false}
                            onError={(e) => { e.currentTarget.src = "/img/unranked.png"; }}
                          />
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[13px] font-mono font-semibold text-flash/65 tracking-wide whitespace-nowrap">{rank}</span>
                          {!unranked && (
                            <span
                              className="text-[16px] font-chakrapetch font-bold text-flash tabular-nums"
                              style={{ textShadow: "0 0 10px rgba(255,255,255,0.35), 0 0 20px rgba(255,255,255,0.12)" }}
                            >
                              {lp} <span className="text-[11px] text-flash/45">LP</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div
              className={cn(
                "hidden lg:block relative overflow-hidden rounded-md max-w-[440px]",
                "bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel",
                "shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
              )}
            >
              {/* glossy overlays */}
              <div className={cn(
                "pointer-events-none absolute -top-24 left-0 h-56 w-full z-[1]",
                "bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.08),rgba(255,255,255,0)_62%)]"
              )} />
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/[0.02] via-transparent to-black/30" />

              <div className="relative z-10 flex items-center gap-5 px-6 py-6">

                {/* Avatar */}
                <div className="relative shrink-0 w-[118px] h-[118px]">
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
                <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                  {/* Pro / streamer identity — shown directly above the summoner name */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {proPlayerInfo ? (
                      <Link
                        to={`/players/${proPlayerInfo.slug}`}
                        className="group/talent flex items-center gap-1.5 cursor-clicker"
                      >
                        {proPlayerInfo.team && proTeamLogo && <TeamLogo src={proTeamLogo} className="w-4 h-4 object-contain" />}
                        {proPlayerInfo.team && (
                          <span className="font-chakrapetch text-[12px] font-semibold uppercase tracking-[0.1em] text-jade/80">{proPlayerInfo.team}</span>
                        )}
                        {proPlayerInfo.team && <span className="text-jade/35 text-[9px]">◆</span>}
                        <span className="font-chakrapetch text-[13px] font-bold text-flash/95 tracking-wide transition-colors group-hover/talent:text-jade">
                          {proPlayerInfo.nickname || proPlayerInfo.username.split("#")[0]}
                        </span>
                        <span className="text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide" style={{ background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }}>PRO</span>
                      </Link>
                    ) : streamerInfo ? (
                      <Link
                        to={`/players/${streamerInfo.slug}`}
                        className="group/talent flex items-center gap-1.5 cursor-clicker"
                      >
                        <span className="text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide" style={{ background: "linear-gradient(135deg, #7b42a1, #a855c7)", color: "#e0d0f0" }}>STRM</span>
                        <span className="font-chakrapetch text-[13px] font-bold text-flash/95 tracking-wide transition-colors group-hover/talent:text-jade">{streamerInfo.twitch_login}</span>
                      </Link>
                    ) : (
                      <>
                        {isPro && (
                          <span className="text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide" style={{ background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }}>PRO</span>
                        )}
                        {isStreamer && (
                          <span className="text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide" style={{ background: "linear-gradient(135deg, #7b42a1, #a855c7)", color: "#e0d0f0" }}>STR</span>
                        )}
                      </>
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
                    onClick={() => {
                      if (!summonerInfo) return;
                      const riotId = `${summonerInfo.name}#${summonerInfo.tag}`;
                      navigator.clipboard.writeText(riotId);
                      showCyberToast({ title: "Summoner name copied", description: riotId });
                    }}
                  >
                    {!summonerInfo ? (
                      <Skeleton className="h-8 w-[200px] bg-filmlight/10" />
                    ) : (
                      <>
                        <span className={cn(
                          "font-bold font-chakrapetch text-flash tracking-wide leading-none",
                          (summonerInfo.name?.length || 0) > 14 ? "text-[18px]" : (summonerInfo.name?.length || 0) > 10 ? "text-[22px]" : "text-[26px]"
                        )}>
                          {summonerInfo.name}
                        </span>
                        {summonerInfo.tag && (
                          <span className="text-[18px] font-chakrapetch text-flash/30 ml-1">#{summonerInfo.tag}</span>
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

            </div>

          </div>

          {/* mobile-only season overall W/L/WR (the sidebar version is hidden on phones) */}
          {(() => {
            const wins = summonerInfo?.wins ?? 0;
            const losses = summonerInfo?.losses ?? 0;
            const totalGames = wins + losses;
            const winrate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
            return (
              <div className="lg:hidden flex items-center gap-4 mt-1 lg:mt-4 px-1">
                <div><span className="text-jade text-2xl font-chakrapetch font-bold tabular-nums">{wins}</span><span className="ml-1 text-[10px] uppercase tracking-wider text-flash/40">Wins</span></div>
                <div><span className="text-[#b11315] text-2xl font-chakrapetch font-bold tabular-nums">{losses}</span><span className="ml-1 text-[10px] uppercase tracking-wider text-flash/40">Losses</span></div>
                <div className="ml-auto"><span className={cn("text-2xl font-chakrapetch font-bold tabular-nums", getWinrateClass(winrate, totalGames))}>{winrate}%</span><span className="ml-1 text-[10px] uppercase tracking-wider text-flash/40">WR</span></div>
              </div>
            );
          })()}

          <div className="w-full mt-4">
            {/* ── Unified filter row — cohesive glass toolbar ── */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-hairline/[0.07] bg-filmdark/30 p-1 backdrop-blur-lg shadow-[0_8px_24px_rgba(var(--c-shadow),0.4),inset_0_1px_0_rgb(var(--c-hairline)/0.05)]">
              {/* Queue — dropdown (many options) */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "group font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase px-3 h-6 rounded-[5px] transition-all duration-200 cursor-clicker flex w-32 items-center justify-center gap-1.5",
                    selectedQueue !== "All"
                      ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                      : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]",
                  )}
                >
                  {selectedQueue === "All" ? "Queue" : selectedQueue === "Ranked Solo/Duo" ? "Solo/Duo" : "Flex"}
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 text-sm bg-filmdark/95 backdrop-blur-xl border-hairline/10">
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
                  "font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase px-3 rounded-[5px] transition-all duration-200 cursor-clicker flex w-32 items-center justify-center gap-1.5 h-6",
                  selectedChampion
                    ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                    : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]",
                )}
              >
                <ChampionPicker
                  champions={allChampions}
                  selectedChampion={selectedChampion}
                  onSelect={(champName) => setSelectedChampion(champName)}
                  triggerClassName="!text-[10px] !tracking-[0.15em] !font-chakrapetch !font-semibold"
                />
              </div>

              {/* Role — segmented group */}
              <div className="flex items-center gap-0.5 rounded-md bg-filmdark/30 p-0.5">
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
                      "font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase min-w-[30px] px-2 h-6 rounded-[5px] transition-all duration-200 cursor-clicker flex items-center justify-center",
                      (role.value === null ? selectedRole === null : selectedRole === role.value)
                        ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                        : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]",
                    )}
                  >
                    {role.icon ?? role.label}
                  </button>
                ))}
              </div>

              {/* Result — segmented group */}
              <div className="flex items-center gap-0.5 rounded-md bg-filmdark/30 p-0.5 ml-auto">
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
                      "font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase px-2.5 h-6 rounded-[5px] transition-all duration-200 cursor-clicker flex items-center justify-center min-w-[30px]",
                      selectedResult === opt.value
                        ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                        : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]",
                    )}
                  >
                    {opt.label}
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

              // KDA quality colour (reused for the KDA tile) + win-rate colour
              const kdaNum = stats.deaths === 0 ? 99 : (stats.kills + stats.assists) / stats.deaths
              const kdaColor = kdaNum >= 4 ? "text-jade" : kdaNum >= 3 ? "text-amber-400" : kdaNum >= 2 ? "text-flash/75" : "text-rose-400"
              const wrColor = getWinrateClass(wr, stats.wins + stats.losses)

              // Collect the enabled stat tiles
              const tiles: { label: string; value: React.ReactNode; sub?: React.ReactNode; color?: string }[] = []
              if (visibleStats.kda) tiles.push({
                label: "KDA",
                value: kda,
                color: kdaColor,
                sub: (
                  <>{avgK}<span className="text-flash/20"> / </span><span className="text-rose-400/55">{avgD}</span><span className="text-flash/20"> / </span>{avgA}</>
                ),
              })
              if (visibleStats.kp) tiles.push({ label: "KP", value: `${kp}%` })
              if (visibleStats.csm) tiles.push({ label: "CS/M", value: csMin })
              if (visibleStats.dmg) tiles.push({ label: "DMG", value: avgDmg })
              if (visibleStats.vis) tiles.push({ label: "VIS", value: avgVis })

              return (
                <div className="mt-3 hidden lg:block rounded-md border border-flash/10 bg-[rgba(6,12,14,0.5)] backdrop-blur-md overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_26px_rgba(var(--c-shadow),0.35)]">
                  {/* header strip */}
                  <div className="flex items-center gap-2 px-4 pt-2.5">
                    <span className="h-[5px] w-[5px] rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.8)]" />
                    <span className="text-[9px] font-chakrapetch uppercase tracking-[0.24em] text-flash/40 leading-none">
                      Last {stats.count} Games
                    </span>
                    <span className="flex-1 h-px bg-gradient-to-r from-flash/10 via-flash/[0.04] to-transparent" />
                  </div>

                  {/* body */}
                  <div className="flex items-center gap-5 px-4 py-3">
                    {/* win-rate cluster */}
                    <div className="flex flex-col gap-1.5 shrink-0 w-[150px] pr-5 border-r border-flash/[0.06]">
                      <div className="flex items-baseline gap-2">
                        <span className={cn("text-[26px] font-chakrapetch font-bold tabular-nums leading-none", wrColor)}>{wr}%</span>
                        <span className="text-[8px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch">Win Rate</span>
                      </div>
                      {/* W/L ratio bar */}
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-filmdark/40">
                        <div className="h-full bg-jade shadow-[0_0_8px_rgba(0,217,146,0.45)]" style={{ width: `${wr}%` }} />
                        <div className="h-full bg-[#b11315]/55" style={{ width: `${100 - wr}%` }} />
                      </div>
                      <div className="flex items-center justify-between leading-none">
                        <span className="text-jade text-[11px] font-chakrapetch font-bold tabular-nums">{stats.wins}<span className="text-flash/30 ml-0.5">W</span></span>
                        <span className="text-[#e0686a] text-[11px] font-chakrapetch font-bold tabular-nums">{stats.losses}<span className="text-flash/30 ml-0.5">L</span></span>
                      </div>
                    </div>

                    {/* stat tiles */}
                    {tiles.length > 0 && (
                      <div className="flex-1 flex items-center justify-between">
                        {tiles.map((t, i) => (
                          <React.Fragment key={t.label}>
                            {i > 0 && <span className="w-px h-8 bg-flash/[0.06]" />}
                            <div className="flex flex-1 flex-col items-center justify-center gap-1 px-1">
                              <span className={cn("text-[17px] font-chakrapetch font-bold tabular-nums leading-none", t.color ?? "text-flash/85")}>
                                {t.value}
                              </span>
                              {t.sub && (
                                <span className="text-[8px] text-flash/35 tabular-nums font-chakrapetch leading-none">{t.sub}</span>
                              )}
                              <span className="text-[8px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch leading-none">{t.label}</span>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
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
                      "bg-filmdark/22 backdrop-blur-lg saturate-150 glass-panel",
                      "shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.4px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]"
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
                      <Skeleton className="h-4 w-1/2 bg-filmlight/10" />
                      <Skeleton className="h-4 w-1/3 bg-filmlight/10" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : filteredMatches.length === 0 ? (
              <Error404 />
            ) : (
              <div ref={listRef} className="theme-dark bg-liquirice text-flash space-y-1 mt-4 rounded-lg pb-2">
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
                      <div className="flex items-center justify-between px-4 py-2.5 rounded-md mt-3 text-xs" >
                        <div className="uppercase text-flash/70 tracking-[0.12em] font-mono font-medium text-[12px]">
                          {dayLabelFromKey(dayKey)}
                        </div>
                        <div className="flex items-center gap-3 font-semibold">
                          {wins > 0 && <span className="text-jade">{wins}W</span>}
                          {losses > 0 && <span className="text-[#b11315]">{losses}L</span>}
                          {wins > 0 && losses > 0 && <span className={getWinrateClass(wr, rows.length)}>{wr}% WR</span>}
                          <Separator orientation="vertical" className="hidden lg:block h-4 bg-flash/20" />
                          <span className="hidden lg:inline text-flash/70 uppercase">{playedLabel}</span>
                        </div>
                      </div>
                      )}

                      {/* LISTA MATCH DI QUEL GIORNO */}
                      <ul className="flex flex-col gap-1">
                        {rows.map((row) => {
                          const { match, win, championName, lpDelta } = row;

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
                                expandedMatchId === match.metadata.matchId
                                  ? "match-card-expanded"
                                  : clickToExpand ? "match-card-collapsed" : "match-card-group"
                              )}
                              onClick={(e) => {
                                // Don't toggle if clicking a button/link inside
                                if ((e.target as HTMLElement).closest("button, a")) return;
                                const id = match.metadata.matchId;
                                if (expandedMatchId === id) {
                                  // play the collapse animation, then unmount
                                  setExpandedMatchId(null);
                                  setClosingMatchId(id);
                                  window.setTimeout(() => setClosingMatchId(c => (c === id ? null : c)), 320);
                                } else {
                                  setExpandedMatchId(id);
                                }
                              }}
                            >
                            <li
                              className={cn(
                                "relative z-[2] overflow-hidden rounded-md p-2 text-flash transition cursor-clicker",
                                isRemake
                                  ? "bg-filmdark/30 backdrop-blur-lg saturate-150 glass-panel"
                                  : coloredMatchBg
                                    ? win
                                      ? (blueWinTint ? "bg-[#5BA8E6]/[0.10] backdrop-blur-lg saturate-150" : "bg-[#00D18D]/[0.08] backdrop-blur-lg saturate-150")
                                      : "bg-[#c93232]/[0.10] backdrop-blur-lg saturate-150"
                                    : "bg-filmdark/18 backdrop-blur-lg saturate-150 glass-panel",
                                "shadow-[0_10px_30px_rgba(var(--c-shadow),0.60),inset_0_0_0_0.35px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]",
                                isRemake
                                  ? "hover:bg-filmdark/35 hover:shadow-[0_14px_40px_rgba(var(--c-shadow),0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                                  : coloredMatchBg
                                    ? win
                                      ? (blueWinTint ? "hover:bg-[#5BA8E6]/[0.14] hover:shadow-[0_14px_40px_rgba(var(--c-shadow),0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]" : "hover:bg-[#00D18D]/[0.12] hover:shadow-[0_14px_40px_rgba(var(--c-shadow),0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]")
                                      : "hover:bg-[#c93232]/[0.14] hover:shadow-[0_14px_40px_rgba(var(--c-shadow),0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                                    : "hover:bg-filmdark/16 hover:shadow-[0_14px_40px_rgba(var(--c-shadow),0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
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

                              {/* Aegis of Valor watermark — a loss that cost 0 LP (no-LP-loss).
                                  Same cosmetic the scout MatchCard uses for double-LP wins. */}
                              {!win && lpDelta === 0 && (
                                <img
                                  src={doubleLpBadgeUrl()}
                                  alt=""
                                  aria-hidden
                                  className="pointer-events-none select-none absolute top-1/2 -translate-y-1/2 right-0 translate-x-[8%] h-[150%] w-auto z-[1] opacity-[0.18]"
                                  style={{ filter: "saturate(0.85) brightness(1.05) drop-shadow(0 0 18px rgba(255,182,21,0.18))" }}
                                />
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

                                          {/* Per-game LP change (tracked premium/elite accounts only).
                                              Desktop: inline after the result. Mobile: a pill next to
                                              the KDA box (see below) — so hide this one on phones.
                                              0 LP is real (Aegis-of-Valor no-LP-loss) → show it neutral. */}
                                          {typeof lpDelta === "number" && (
                                            <span className={cn(
                                              "hidden lg:inline text-[11px] font-semibold tabular-nums",
                                              lpDelta > 0 ? "text-[#00D992]" : lpDelta < 0 ? "text-[#d63336]" : "text-flash/55"
                                            )}>
                                              {lpDelta > 0 ? "+" : ""}{lpDelta}
                                              <span className="opacity-55 ml-0.5">LP</span>
                                            </span>
                                          )}

                                          {isSelfMvpOrAce && coloredMatchBg && (
                                            <span className={cn(
                                              "hidden lg:inline text-[9px] font-mono font-bold tracking-[0.15em] px-1.5 py-[1px] rounded-[2px] border",
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
                                          <div className="mt-3 flex-1 min-w-0">
                                            <div className="flex space-x-1 lg:space-x-1.5 relative">
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
                                                {isSelfMvpOrAce && (
                                                  <span
                                                    className={cn(
                                                      "lg:hidden absolute -top-1 -left-1 z-20 px-1 rounded-[3px] text-[8px] leading-none",
                                                      summonerInfo?.puuid === mvpWin
                                                        ? "bg-pine text-jade"
                                                        : "bg-[#3A2C45] text-[#C693F1]"
                                                    )}
                                                    style={{ lineHeight: '1', fontWeight: 700 }}
                                                  >
                                                    {summonerInfo?.puuid === mvpWin ? "MVP" : "ACE"}
                                                  </span>
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
                                                    <div className="grid grid-rows-2 gap-0 lg:gap-0.5">
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
                                                  <div className="grid grid-cols-3 grid-rows-2 gap-x-0.5 gap-y-0 lg:gap-0.5">
                                                    {itemKeys.map((key, index) => {
                                                      const itemId = participant[key];
                                                      return (
                                                        <div
                                                          key={index}
                                                          className="group relative w-6 h-6 rounded-sm bg-[#0f0f0f] border border-[#2B2A2B]"
                                                        >
                                                          {typeof itemId === "number" && itemId > 0 && (
                                                            <>
                                                              <Link to={`/items/${itemId}`} className="cursor-clicker">
                                                                <img
                                                                  src={`${cdnBaseUrl()}/img/item/${itemId}.png`}
                                                                  alt={`Item ${itemId}`}
                                                                  className="w-full h-full rounded-sm"
                                                                />
                                                              </Link>
                                                              <AnimatedOutline rx={2} />
                                                            </>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>

                                                  {typeof participant.item6 === "number" && participant.item6 > 0 && (
                                                    <div className="hidden lg:flex items-center justify-center ml-1">
                                                      <Link
                                                        to={`/items/${participant.item6}`}
                                                        className="cursor-clicker group relative w-6 h-6 block"
                                                      >
                                                        <div className="w-6 h-6 bg-[#0f0f0f] rounded-full">
                                                          <img
                                                            src={`${cdnBaseUrl()}/img/item/${participant.item6}.png`}
                                                            alt={`Trinket ${participant.item6}`}
                                                            className="w-full h-full rounded-full"
                                                          />
                                                        </div>
                                                        {/* rx=12 = w/2 (w-6 = 24px) → circle outline matching
                                                            the trinket's rounded-full shape. */}
                                                        <AnimatedOutline rx={12} />
                                                      </Link>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                            { }
                                            <div className="flex flex-col mt-2">
                                              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 w-full">
                                                {(() => {
                                                  const { className, style } = getKdaBackgroundStyle(kda);
                                                  const isPerfect = kda === "Perfect";
                                                  return (
                                                    <div
                                                      className={cn(
                                                        "flex items-center justify-center h-7 w-[88px] text-[14px] font-chakrapetch font-bold tabular-nums rounded-[3px] border tracking-wide",
                                                        className
                                                      )}
                                                      style={style}
                                                    >
                                                      <span className={isPerfect ? "text-liquirice" : "text-flash/90"}>{participant?.kills}</span>
                                                      <span className={cn("mx-[2px]", isPerfect ? "text-liquirice/50" : "text-flash/25")}>/</span>
                                                      <span className={isPerfect ? "text-liquirice" : "text-red-400/80"}>{participant?.deaths}</span>
                                                      <span className={cn("mx-[2px]", isPerfect ? "text-liquirice/50" : "text-flash/25")}>/</span>
                                                      <span className={isPerfect ? "text-liquirice" : "text-flash/90"}>{participant?.assists}</span>
                                                    </div>
                                                  );
                                                })()}
                                                {/* MOBILE-ONLY LP pill — same box style as the KDA box,
                                                    centered EXACTLY in the gap between it and the
                                                    scoreboard (the flex-1 wrapper eats the space after
                                                    the KDA box, justify-center centers the pill in it).
                                                    Tracked (premium/elite) games; 0 LP is real (Aegis
                                                    no-LP-loss) → shown neutral. */}
                                                {typeof lpDelta === "number" && (
                                                  <div className="lg:hidden flex-1 flex justify-center">
                                                    <div className={cn(
                                                      "flex items-center justify-center h-7 px-2.5 text-[14px] font-chakrapetch font-bold tabular-nums rounded-[3px] border tracking-wide",
                                                      lpDelta > 0
                                                        ? "text-[#00D992] border-[#00D992]/30 bg-[#00D992]/[0.08]"
                                                        : lpDelta < 0
                                                          ? "text-[#d63336] border-[#d63336]/30 bg-[#d63336]/[0.08]"
                                                          : "text-flash/55 border-flash/20 bg-flash/[0.05]"
                                                    )}>
                                                      {lpDelta > 0 ? "+" : ""}{lpDelta}
                                                      <span className="text-[9px] opacity-60 ml-1 font-jetbrains tracking-[0.1em]">LP</span>
                                                    </div>
                                                  </div>
                                                )}
                                                {/* KDA caption — stacked big value + tiny label,
                                                    mirrors the scout matchcard look. */}
                                                <div className="hidden lg:flex flex-col leading-tight ml-3 tabular-nums">
                                                  <span className="font-chakrapetch font-bold tabular-nums text-flash/75 text-[13px]">
                                                    {typeof kda === "number" ? kda.toFixed(2) : kda}
                                                  </span>
                                                  <span className="font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]">
                                                    KDA
                                                  </span>
                                                </div>
                                                {/* CS caption — same stack, value coloured by CS/min:
                                                    >10 glowing jade, 8-10 jade, 6-8 citrine, else grey.
                                                    Support roles are always neutral grey (their low CS
                                                    isn't a performance signal). Mirrors CsDetailBox in
                                                    components/matchcard.tsx. */}
                                                {participant && (() => {
                                                  const cs =
                                                    (participant.totalMinionsKilled ?? 0) +
                                                    (participant.neutralMinionsKilled ?? 0);
                                                  const minutes =
                                                    match.info.gameDuration > 0
                                                      ? match.info.gameDuration / 60
                                                      : 0;
                                                  const csPerMin = minutes > 0 ? cs / minutes : 0;
                                                  const roleUpper = (playerRole ?? "").toUpperCase();
                                                  const support =
                                                    roleUpper === "UTILITY" ||
                                                    roleUpper === "SUPPORT" ||
                                                    roleUpper === "SUP";
                                                  let csValueClass = "text-flash/55";
                                                  let csGlow: React.CSSProperties | undefined;
                                                  if (!support) {
                                                    if (csPerMin > 10) {
                                                      csValueClass = "text-[#00ff9d]";
                                                      csGlow = {
                                                        textShadow:
                                                          "0 0 10px rgba(0,255,157,0.7)",
                                                      };
                                                    } else if (csPerMin >= 8) {
                                                      csValueClass = "text-[#00ff9d]";
                                                    } else if (csPerMin >= 6) {
                                                      csValueClass = "text-[#FFB615]";
                                                    }
                                                  }
                                                  // Italian-style decimal for cs/min ("7,2");
                                                  // thousands-grouped gold ("14,732").
                                                  const csPerMinStr = csPerMin.toFixed(1).replace(".", ",");
                                                  const goldStr =
                                                    participant.goldEarned != null
                                                      ? Math.round(participant.goldEarned).toLocaleString("en-US")
                                                      : null;
                                                  return (
                                                    <TooltipProvider delayDuration={150}>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <div className="hidden lg:flex flex-col leading-tight ml-4 tabular-nums cursor-default">
                                                            <span
                                                              className={cn(
                                                                "font-chakrapetch font-bold text-[13px]",
                                                                csValueClass
                                                              )}
                                                              style={csGlow}
                                                            >
                                                              {cs}
                                                            </span>
                                                            <span className="font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]">
                                                              CS
                                                            </span>
                                                          </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs bg-liquirice/80">
                                                          <div className="flex flex-col items-center gap-1.5 py-0.5">
                                                            <span className="tabular-nums">{csPerMinStr} cs per minute</span>
                                                            {goldStr && (
                                                              <>
                                                                <div className="h-px w-full bg-flash/20" />
                                                                <span className="tabular-nums">{goldStr} gold</span>
                                                              </>
                                                            )}
                                                          </div>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  );
                                                })()}
                                                {/* KP caption — same stack, value coloured by tier:
                                                    ≥65% jade, ≥45% neutral flash, else red. Matches
                                                    KpDetailBox in components/matchcard.tsx. */}
                                                {participant && (() => {
                                                  const team = participant.teamId === 100 ? team1 : team2;
                                                  const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
                                                  const kp = teamKills > 0
                                                    ? Math.round(((participant.kills + participant.assists) / teamKills) * 100)
                                                    : 0;
                                                  const kpValueClass =
                                                    kp >= 65
                                                      ? "text-jade/85"
                                                      : kp >= 45
                                                        ? "text-flash/75"
                                                        : "text-[#d63336]/80";
                                                  return (
                                                    <TooltipProvider delayDuration={150}>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <div className="hidden lg:flex flex-col leading-tight ml-4 tabular-nums cursor-default">
                                                            <span className={cn("font-chakrapetch font-bold text-[13px]", kpValueClass)}>
                                                              {kp}%
                                                            </span>
                                                            <span className="font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]">
                                                              KP
                                                            </span>
                                                          </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="text-xs bg-liquirice/80">
                                                          <span className="tabular-nums">{kp}% kill participation</span>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  );
                                                })()}

                                                <div className="ml-2">
                                                </div>

                                              </div>
                                            </div>
                                          </div>
                                          <div className="w-[46%] lg:w-[44%] grid grid-cols-2 gap-1.5 lg:gap-4 mt-2 text-[8px] lg:text-[11px]">
                                            <div className="min-w-0">
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
                                                    <li key={p.puuid} className="flex items-center gap-1 min-w-0">
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
                                            <div className="min-w-0">
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

                            {/* ── Expanded scoreboard — build / stats / runes per player ── */}
                            {(expandedMatchId === match.metadata.matchId || closingMatchId === match.metadata.matchId) && (
                              <MatchExpand
                                match={match as any}
                                mePuuid={summonerInfo?.puuid ?? ""}
                                region={region ?? "euw"}
                                closing={closingMatchId === match.metadata.matchId}
                                actions={
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEnterMatch(matchId)}
                                      className="h-7 px-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase bg-filmlight/[0.05] ring-1 ring-white/[0.1] text-flash/65 hover:text-jade hover:ring-jade/40 hover:bg-jade/[0.08] transition-all duration-200 cursor-clicker"
                                    >
                                      VIEW
                                    </button>
                                    {isJungler && (
                                      <button
                                        type="button"
                                        onClick={() => fetchAnalysis(matchId)}
                                        className={cn(
                                          "h-7 px-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase ring-1 transition-all duration-200 cursor-clicker",
                                          analysisEntry?.open
                                            ? "bg-jade/[0.12] text-jade ring-jade/40"
                                            : "bg-filmlight/[0.05] ring-white/[0.1] text-flash/65 hover:text-jade hover:ring-jade/40 hover:bg-jade/[0.08]"
                                        )}
                                      >
                                        SCAN
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="h-7 px-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase bg-filmlight/[0.05] ring-1 ring-white/[0.1] text-flash/65 hover:text-purple-300 hover:ring-purple-400/40 hover:bg-purple-500/[0.08] transition-all duration-200 cursor-clicker"
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
                                    <button
                                      type="button"
                                      onClick={() => setReplayMatch({ matchId, match })}
                                      className="relative h-7 pl-6 pr-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase bg-jade/[0.14] text-jade ring-1 ring-jade/35 hover:bg-jade/[0.22] hover:ring-jade/60 transition-all duration-200 cursor-clicker"
                                      title="Open the full match replay — every event on the map"
                                    >
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-jade shadow-[0_0_4px_rgba(0,217,146,0.8)] animate-pulse" />
                                      REPLAY
                                    </button>
                                  </>
                                }
                              />
                            )}

                            {/* Hover action tabs below the card */}
                            {!contextMenuMode && expandedMatchId !== match.metadata.matchId && closingMatchId !== match.metadata.matchId && (
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

                                    {/* REPLAY — flagship feature: full match timeline player */}
                                    <button
                                      type="button"
                                      onClick={() => setReplayMatch({ matchId, match })}
                                      className="relative px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-jade/80 hover:text-jade border-b border-jade/30 hover:border-jade/70 bg-jade/[0.04] hover:bg-jade/[0.10] transition-all duration-200 cursor-clicker group/replay"
                                      title="Open the full match replay — every event on the map"
                                    >
                                      {/* Pulsating accent dot */}
                                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-jade shadow-[0_0_4px_rgba(0,217,146,0.8)] animate-pulse" />
                                      <span className="ml-2">REPLAY</span>
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
        <div className={cn(
          "fixed bottom-10 right-10 z-50 transition-all duration-300 ease-in-out",
          showScrollTop ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-3"
        )}>
          <DiamondButton icon="top" label="TOP" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
        </div>


      </div>

      {/* ── Admin Dialog: Create Pro/Streamer ── */}
      {showAdminDialog && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={() => setShowAdminDialog(false)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative z-10 w-[420px] rounded-md overflow-hidden bg-filmdark/95 backdrop-blur-xl saturate-150"
            style={{
              animation: "dialogOpen 0.25s ease-out",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
            onClick={e => e.stopPropagation()}>
            {/* Radial white glow */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04)_0%,transparent_60%)]" />

            <div className="relative z-10 px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-orbitron text-citrine/80 uppercase tracking-wider">Admin Panel</h3>
                <button type="button" onClick={() => setShowAdminDialog(false)} className="text-flash/30 hover:text-flash/70 cursor-pointer">✕</button>
              </div>

              <div className="text-[11px] font-mono text-flash/40">
                Creating profile for: <span className="text-flash/70">{name}#{tag}</span>
              </div>

              {/* Type toggle */}
              <div className="flex gap-2">
                {(["pro", "streamer"] as const).map(t => (
                  <button key={t} type="button" onClick={() => setAdminType(t)}
                    className={cn("flex-1 py-2 text-[10px] font-orbitron uppercase tracking-[0.12em] rounded-[2px] border transition-all cursor-pointer",
                      adminType === t ? "text-citrine border-citrine/30 bg-citrine/10" : "text-flash/25 border-flash/[0.06] hover:text-flash/40"
                    )}>{t}</button>
                ))}
              </div>

              {/* Pro fields */}
              {adminType === "pro" && (
                <div className="space-y-2">
                  <input value={adminFields.nickname} onChange={e => setAdminFields(f => ({ ...f, nickname: e.target.value }))} placeholder="Nickname (e.g. Caps)"
                    className="w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" />
                  <input value={adminFields.team} onChange={e => setAdminFields(f => ({ ...f, team: e.target.value }))} placeholder="Team (e.g. G2 Esports)"
                    className="w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" />
                  <div className="flex gap-2">
                    <input value={adminFields.firstName} onChange={e => setAdminFields(f => ({ ...f, firstName: e.target.value }))} placeholder="First name"
                      className="flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" />
                    <input value={adminFields.lastName} onChange={e => setAdminFields(f => ({ ...f, lastName: e.target.value }))} placeholder="Last name"
                      className="flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" />
                  </div>
                  <input value={adminFields.nationality} onChange={e => setAdminFields(f => ({ ...f, nationality: e.target.value }))} placeholder="Nationality (e.g. DK)"
                    className="w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" />
                </div>
              )}

              {/* Streamer fields */}
              {adminType === "streamer" && (
                <div className="space-y-2">
                  <input value={adminFields.twitchLogin} onChange={e => setAdminFields(f => ({ ...f, twitchLogin: e.target.value }))} placeholder="Twitch username"
                    className="w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" />
                </div>
              )}

              {/* Save */}
              <button type="button" disabled={adminSaving}
                onClick={async () => {
                  setAdminSaving(true);
                  const nametag = `${name}#${tag}`;
                  try {
                    if (adminType === "pro") {
                      await supabase.from("pro_players").delete().eq("username", nametag);
                      await supabase.from("pro_players").insert({
                        username: nametag,
                        nickname: adminFields.nickname || name,
                        team: adminFields.team || null,
                        first_name: adminFields.firstName || null,
                        last_name: adminFields.lastName || null,
                        nationality: adminFields.nationality || null,
                      });
                    } else {
                      // Delete existing entry first, then insert
                      await supabase.from("streamers").delete().eq("lol_nametag", nametag);
                      await supabase.from("streamers").insert({
                        lol_nametag: nametag,
                        twitch_login: adminFields.twitchLogin || null,
                        region: region?.toUpperCase() || "EUW",
                      });
                    }
                    setShowAdminDialog(false);
                    setIsPro(adminType === "pro");
                    setIsStreamer(adminType === "streamer");
                  } catch (e: any) {
                    console.error("Admin save error:", e);
                  } finally {
                    setAdminSaving(false);
                  }
                }}
                className={cn(
                  "w-full py-2.5 rounded-sm text-[10px] font-orbitron uppercase tracking-[0.15em] transition-all cursor-pointer",
                  adminSaving ? "bg-citrine/5 text-citrine/20 border border-citrine/10" : "bg-citrine/15 text-citrine/80 border border-citrine/25 hover:bg-citrine/25"
                )}>
                {adminSaving ? "Saving..." : `Create ${adminType} profile`}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes dialogOpen {
              from { opacity: 0; transform: scale(0.95) translateY(8px); filter: blur(4px); }
              to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
            }
          `}</style>
        </div>,
        document.body
      )}

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
                "shadow-[0_10px_40px_rgba(var(--c-shadow),0.7),0_0_20px_rgba(0,217,146,0.05)]"
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
                "shadow-[0_10px_40px_rgba(var(--c-shadow),0.7),0_0_20px_rgba(0,217,146,0.05)]"
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
                "shadow-[0_20px_60px_rgba(var(--c-shadow),0.7),0_0_30px_rgba(0,217,146,0.05)]"
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
                        : "text-flash/35 border-flash/[0.08] hover:text-flash/50 hover:border-flash/[0.15] bg-filmdark/20"
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
                      : "text-flash/15 border-flash/[0.05] bg-filmdark/10 cursor-not-allowed"
                  )}
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin: create pro/streamer profile — admins ONLY (the button is the entry
          point to the pro/streamer creation dialog, so it must never render for
          regular users). */}
      {isAdmin && (
        <div className="fixed bottom-10 left-10 z-[999]">
          <DiamondButton color="citrine" icon="edit" label="ADMIN" onClick={() => setShowAdminDialog(true)} />
        </div>
      )}

      {/* ───────────  MATCH REPLAY DIALOG  ─────────── */}
      <MatchReplayDialog
        open={!!replayMatch}
        onClose={() => setReplayMatch(null)}
        matchId={replayMatch?.matchId ?? ""}
        region={(region ?? "EUW").toUpperCase()}
        staticMatch={(replayMatch?.match as any) ?? null}
        focusPuuid={summonerInfo?.puuid ?? null}
      />

    </div>
  )
}



