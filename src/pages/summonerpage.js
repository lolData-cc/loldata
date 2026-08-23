import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { createPortal } from "react-dom";
import { computeImpact, impactTone } from "@/utils/impact";
import { motion, AnimatePresence } from "framer-motion";
import { calculateLolDataScores } from "@/utils/calculatePlayerRating";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { LiveViewer } from "@/components/liveviewer";
import { ChevronDown, ChevronRight, RotateCw, Search, BarChart3, Flag, SlidersHorizontal, X } from "lucide-react";
import { getRankImage } from "@/utils/rankIcons";
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons";
import { getWinrateClass } from '@/utils/winratecolor';
import { ChampionPicker } from "@/components/championpicker";
import { getKdaClass } from '@/utils/kdaColor';
import { formatStat } from "@/utils/formatStat";
import { timeAgo } from '@/utils/timeAgo';
import { cdnBaseUrl, cdnSplashUrl, doubleLpBadgeUrl, getCdnVersion, normalizeChampName, summonerSpellUrl } from "@/config";
import { JunglePlaystyleBadge, JungleStartingCampBadge, JungleInvadeBadge } from "@/components/jungleplaystylebadge";
import { getKeystoneIcon, getStyleIcon, getKeystoneName, getStyleName } from "@/constants/runes";
import { PlayerAnalysisDialog } from "@/components/PlayerAnalysisDialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DiamondButton } from "@/components/ui/diamond-button";
// import { getPlayerBadges } from "@/utils/badges";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { UpdateButton } from "@/components/update";
import { SummonerBootOverlay } from "@/components/summonerbootoverlay";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { API_BASE_URL, BOX_API_BASE_URL } from "@/config";
import UltraTechBackground from "@/components/techdetails";
import { useDisableTechBackground } from "@/hooks/useDisableTechBackground";
import { useDisableMatchTransition } from "@/hooks/useDisableMatchTransition";
import { useDisableMatchGrouping } from "@/hooks/useDisableMatchGrouping";
import { useEnableColoredMatchBg } from "@/hooks/useEnableColoredMatchBg";
import { useBlueWinTint } from "@/hooks/useBlueWinTint";
import { useEnableMatchCentering } from "@/hooks/useEnableMatchCentering";
import { useHideRemakeMatches } from "@/hooks/useHideRemakeMatches";
import { useStatsBarPrefs } from "@/hooks/useStatsBarPrefs";
import { useContextMenuActions } from "@/hooks/useContextMenuActions";
import { useClickToExpandMatch } from "@/hooks/useClickToExpandMatch";
import { useAuth } from "@/context/authcontext";
import { Error404 } from "@/components/error404";
import { Tabs, TabsTrigger, TabsContent, TabsList } from "@/components/ui/tabs";
import { PlayerHoverCard } from "@/components/playerhovercard";
import { TeamLogo } from "@/components/teamlogo";
import { BorderBeam } from "@/components/ui/border-beam";
import { calculateLoldataScore } from "@/utils/loldataScore";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { enrichRecentProfile } from "@/lib/recentSearchedProfiles";
import { MatchReplayDialog } from "@/components/matchreplay/MatchReplayDialog";
import MatchExpand from "@/components/matchexpand";
import { AnimatedOutline } from "@/components/ui/animated-outline";
const itemKeys = [
    "item0",
    "item1",
    "item2",
    "item3",
    "item4",
    "item5",
    "item6"
];
/** MVP (best score on the winning team) / ACE (best on the losing team),
 *  stamped on the top-left of whichever portrait the collapsed card shows.
 *
 *  The card only draws two of the ten players — you and your lane opponent —
 *  so this renders for those two and nothing else; a puuid with no portrait
 *  here has no corner to anchor to. */
function MvpAceBadge({ puuid, mvpWin, mvpLose, }) {
    if (!puuid)
        return null;
    const isMvp = puuid === mvpWin;
    const isAce = puuid === mvpLose;
    if (!isMvp && !isAce)
        return null;
    return (_jsx("span", { "aria-hidden": true, title: isMvp ? "MVP - best score on the winning team" : "ACE - best score on the losing team", className: cn("pointer-events-none absolute -left-1 -top-1 z-20 rounded-[3px] px-1 py-[2px]", "font-bold leading-none text-[8px] shadow-[0_1px_6px_rgba(0,0,0,0.6)]", isMvp ? "bg-pine text-jade" : "bg-[#3A2C45] text-[#C693F1]"), children: isMvp ? "MVP" : "ACE" }));
}
function getMatchTimestamp(m) {
    return m.gameEndTimestamp ?? m.gameStartTimestamp ?? m.gameCreation;
}
function dayKeyFromTs(ts) {
    const d = new Date(ts);
    // yyyy-mm-dd in local time
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayLabelFromKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const same = (a, b) => a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
    if (same(date, today))
        return "Today";
    if (same(date, yesterday))
        return "Yesterday";
    return date.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
}
function formatPlayedTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    // mostriamo ore e minuti; i secondi solo se < 1 min
    if (h > 0)
        return `${h} ${h === 1 ? "hour" : "hours"} ${m} ${m === 1 ? "minute" : "minutes"}`;
    if (m > 0)
        return `${m} ${m === 1 ? "minute" : "minutes"}`;
    return `${s} ${s === 1 ? "second" : "seconds"}`;
}
export default function SummonerPage() {
    const { disabled: techBgDisabled } = useDisableTechBackground();
    const { disabled: matchTransitionDisabled } = useDisableMatchTransition();
    const { disabled: matchGroupingDisabled } = useDisableMatchGrouping();
    const { enabled: coloredMatchBg } = useEnableColoredMatchBg();
    const { enabled: blueWinTint } = useBlueWinTint();
    const { enabled: matchCenteringEnabled } = useEnableMatchCentering();
    const { enabled: hideRemakes } = useHideRemakeMatches();
    const { hidden: statsBarHidden, visibleStats } = useStatsBarPrefs();
    const { enabled: contextMenuMode } = useContextMenuActions();
    const { enabled: clickToExpand } = useClickToExpandMatch();
    const [expandedMatchId, setExpandedMatchId] = useState(null);
    const [closingMatchId, setClosingMatchId] = useState(null); // plays the collapse animation before unmount
    const [replayMatch, setReplayMatch] = useState(null);
    const { session: authSession, isAdmin } = useAuth();
    const [matches, setMatches] = useState([]);
    const [analysisMap, setAnalysisMap] = useState({});
    const [enteringMatchId, setEnteringMatchId] = useState(null);
    function handleEnterMatch(matchId) {
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
    async function fetchAnalysis(matchId) {
        const entry = analysisMap[matchId];
        // Already fetched — just toggle open/closed
        if (entry && !entry.loading) {
            setAnalysisMap(prev => ({ ...prev, [matchId]: { ...prev[matchId], open: !prev[matchId].open } }));
            return;
        }
        // Currently loading — do nothing
        if (entry?.loading)
            return;
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
        }
        catch {
            setAnalysisMap(prev => ({ ...prev, [matchId]: { loading: false, data: null, open: true } }));
        }
    }
    const [loading, setLoading] = useState(false);
    // Deliberately separate from `loading`. `loading` gates the skeletons and the
    // boot overlay, so reusing it for the UPDATE button would tear the page down
    // and rebuild it — which is exactly what UPDATE should not do.
    const [refreshing, setRefreshing] = useState(false);
    // Match ids that arrived in the last soft refresh, so only those animate in.
    const [freshMatchIds, setFreshMatchIds] = useState(new Set());
    // Mirrors `matches` so a merge can read the current list without a functional
    // updater. React state updaters must be PURE — calling setFreshMatchIds from
    // inside one is what blanked the page.
    const matchesRef = useRef([]);
    useEffect(() => { matchesRef.current = matches; }, [matches]);
    // The highlight is a one-shot: clear it after the entrance so an unrelated
    // re-render (a filter change, a hover) cannot make old cards fly in again.
    useEffect(() => {
        if (freshMatchIds.size === 0)
            return;
        const t = window.setTimeout(() => setFreshMatchIds(new Set()), 900);
        return () => window.clearTimeout(t);
    }, [freshMatchIds]);
    const [onCooldown, setOnCooldown] = useState(false);
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [selectedQueue, setSelectedQueue] = useState("All");
    const [isPro, setIsPro] = useState(false);
    const [isStreamer, setIsStreamer] = useState(false);
    const [showAdminDialog, setShowAdminDialog] = useState(false);
    const [adminSaving, setAdminSaving] = useState(false);
    const [adminType, setAdminType] = useState("pro");
    const [adminFields, setAdminFields] = useState({ nickname: "", team: "", firstName: "", lastName: "", nationality: "", twitchLogin: "" });
    const [proUsernames, setProUsernames] = useState(new Set());
    const [streamerUsernames, setStreamerUsernames] = useState(new Set());
    // nametag → who they actually are, so a nameplate can say "Faker" and link
    // to the profile instead of only flagging the account as notable.
    const [proNames, setProNames] = useState(new Map());
    const [streamerNames, setStreamerNames] = useState(new Map());
    const [proPlayerInfo, setProPlayerInfo] = useState(null);
    const [proTeamLogo, setProTeamLogo] = useState(null);
    const [proLinkedAccounts, setProLinkedAccounts] = useState([]);
    const [streamerInfo, setStreamerInfo] = useState(null);
    const { region, slug } = useParams();
    const _dashIdx = slug?.lastIndexOf("-") ?? -1;
    const name = _dashIdx > 0 ? slug.slice(0, _dashIdx).replace(/\+/g, " ") : slug ?? "";
    const tag = _dashIdx > 0 ? slug.slice(_dashIdx + 1) : "";
    const [latestPatch, setLatestPatch] = useState("15.13.1");
    const [topChampions, setTopChampions] = useState([]);
    const [summonerInfo, setSummonerInfo] = useState(null);
    const [selectedChampion, setSelectedChampion] = useState(null);
    const [selectedResult, setSelectedResult] = useState("all");
    const [selectedRole, setSelectedRole] = useState(null);
    const [filterDuoPuuid, setFilterDuoPuuid] = useState(null);
    const [allChampions, setAllChampions] = useState([]);
    const [championMap, setChampionMap] = useState({});
    const [championMapReverse, setChampionMapReverse] = useState({});
    const [topChampionsSeason, setTopChampionsSeason] = useState([]);
    const [topChampionsSolo, setTopChampionsSolo] = useState([]);
    const [topChampionsFlex, setTopChampionsFlex] = useState([]);
    const [splitTotals, setSplitTotals] = useState(null);
    const [seasonOrSplitView, setSeasonOrSplitView] = useState("season");
    const [topMastery, setTopMastery] = useState([]);
    const [seasonStatsTab, setSeasonStatsTab] = useState("season");
    const [rankQueueView, setRankQueueView] = useState("solo");
    const [premiumPlan, setPremiumPlan] = useState(null);
    const [nextOffset, setNextOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isIngesting, setIsIngesting] = useState(false);
    const [matchesCentered, setMatchesCentered] = useState(false);
    const [showAllDuos, setShowAllDuos] = useState(false);
    const [ctxMenu, setCtxMenu] = useState(null);
    const [matchCtxMenu, setMatchCtxMenu] = useState(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [analyzeOpen, setAnalyzeOpen] = useState(false);
    const [mobileLiveOpen, setMobileLiveOpen] = useState(false); // phone LIVE viewer (desktop card has its own trigger)
    const [reportReason, setReportReason] = useState(null);
    const [linkedDiscord, setLinkedDiscord] = useState(null);
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
        const kpValues = [];
        const dmgValues = [];
        const visionValues = [];
        const roles = [];
        const form = [];
        for (const m of recent) {
            const me = m.match.info.participants.find(p => p.puuid === summonerInfo.puuid);
            if (!me)
                continue;
            games++;
            if (m.win)
                wins++;
            form.push(m.win ? "W" : "L");
            impactSum += computeImpact(me, m.match.info);
            totalKills += me.kills;
            totalDeaths += me.deaths;
            totalAssists += me.assists;
            const minutes = m.match.info.gameDuration / 60;
            totalMinutes += minutes;
            totalCS += (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
            totalGold += me.goldEarned ?? 0;
            if (me.challenges?.killParticipation != null)
                kpValues.push(me.challenges.killParticipation);
            if (me.challenges?.teamDamagePercentage != null)
                dmgValues.push(me.challenges.teamDamagePercentage);
            if (me.challenges?.visionScorePerMinute != null)
                visionValues.push(me.challenges.visionScorePerMinute);
            const role = me.teamPosition || me.individualPosition || "";
            if (role)
                roles.push(role);
        }
        if (games === 0)
            return null;
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
        const roleCounts = {};
        for (const r of roles) {
            const key = r === "MIDDLE" ? "MID" : r === "BOTTOM" ? "ADC" : r === "UTILITY" ? "SUP" : r === "JUNGLE" ? "JNG" : r;
            roleCounts[key] = (roleCounts[key] || 0) + 1;
        }
        const roleTotal = roles.length;
        const roleDistribution = Object.entries(roleCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([role, count]) => ({ role, count, pct: Math.round((count / roleTotal) * 100) }));
        // Current streak
        let streakType = form[0] || "W";
        let streakCount = 0;
        for (const f of form) {
            if (f === streakType)
                streakCount++;
            else
                break;
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
    };
    const queueTypeMap = {
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
    const glassDark = cn("relative overflow-hidden rounded-md", "bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel", "shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]");
    const filteredMatches = matches.filter((m) => {
        const matchQueueId = m.match.info.queueId;
        const isCorrectQueue = selectedQueue === "All"
            ? true
            : (queueGroups[selectedQueue] || []).includes(matchQueueId);
        const isCorrectChampion = selectedChampion ? m.championName === selectedChampion : true;
        const isCorrectResult = selectedResult === "all"
            ? true
            : selectedResult === "wins" ? m.win : !m.win;
        const isCorrectRole = !selectedRole
            ? true
            : (() => {
                const pos = (m.match.info.participants ?? []).find((p) => p.puuid === summonerInfo?.puuid)?.teamPosition?.toUpperCase();
                return pos === selectedRole;
            })();
        const isCorrectDuo = !filterDuoPuuid
            ? true
            : m.match.info.participants.some((p) => p.puuid === filterDuoPuuid);
        const isNotHiddenRemake = hideRemakes ? m.match.info.gameDuration >= 300 : true;
        return isCorrectQueue && isCorrectChampion && isCorrectResult && isCorrectRole && isCorrectDuo && isNotHiddenRemake;
    });
    // Manual "load more": +20 per click, hard-capped at the latest 50 matches.
    const MAX_MATCHES = 50;
    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore)
            return;
        if (!name || !tag || !region)
            return;
        const remaining = MAX_MATCHES - matches.length;
        if (remaining <= 0)
            return;
        setIsLoadingMore(true);
        try {
            await fetchMatches(name, tag, region, nextOffset, /* append */ true, Math.min(20, remaining));
        }
        finally {
            setIsLoadingMore(false);
        }
    }, [isLoadingMore, hasMore, name, tag, region, nextOffset, matches.length]);
    const monthlyDayStats = useMemo(() => {
        if (!matches || matches.length === 0)
            return [];
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0 = gennaio
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // Build cache key from player identity + month
        const cacheKey = summonerInfo?.puuid
            ? `lolData:heatmap:${summonerInfo.puuid}:${year}-${month}`
            : null;
        let cached = null;
        if (cacheKey) {
            try {
                const raw = localStorage.getItem(cacheKey);
                if (raw)
                    cached = JSON.parse(raw);
            }
            catch { /* ignore */ }
        }
        // inizializza un record per ogni giorno del mese (start from cache if available)
        const stats = [];
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
        const liveStats = Array.from({ length: daysInMonth }, () => ({ games: 0, wins: 0 }));
        for (const m of matches) {
            const ts = getMatchTimestamp(m.match.info);
            if (!ts)
                continue;
            const d = new Date(ts);
            if (d.getFullYear() !== year || d.getMonth() !== month)
                continue;
            const dayIndex = d.getDate() - 1;
            liveStats[dayIndex].games += 1;
            if (m.win)
                liveStats[dayIndex].wins += 1;
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
            }
            else {
                cell.winrate = null;
            }
        });
        // Persist to cache
        if (cacheKey) {
            try {
                const toCache = stats.map(s => ({ games: s.games, wins: s.wins }));
                localStorage.setItem(cacheKey, JSON.stringify(toCache));
            }
            catch { /* quota exceeded — ignore */ }
        }
        return stats;
    }, [matches, summonerInfo?.puuid]);
    const githubWeeks = useMemo(() => {
        if (!monthlyDayStats.length)
            return [];
        // parto dal primo giorno del mese (lo hai già calcolato così in monthlyDayStats)
        const first = monthlyDayStats[0].date;
        const year = first.getFullYear();
        const month = first.getMonth();
        const firstDay = new Date(year, month, 1);
        // 0 = lunedì, 6 = domenica (così hai le righe tipo "lun-dom")
        const weekdayOfFirst = (firstDay.getDay() + 6) % 7;
        const cells = [];
        // celle "vuote" prima del giorno 1 del mese (per allineare alle settimane)
        for (let i = 0; i < weekdayOfFirst; i++) {
            cells.push(null);
        }
        // aggiungo tutti i giorni reali del mese
        monthlyDayStats.forEach((c) => cells.push(c));
        // spezzetto in colonne da 7 (settimane)
        const weeks = [];
        for (let i = 0; i < cells.length; i += 7) {
            weeks.push(cells.slice(i, i + 7));
        }
        return weeks;
    }, [monthlyDayStats]);
    const heatmapRows = useMemo(() => {
        // vogliamo esattamente 3 righe
        const rows = [[], [], []];
        monthlyDayStats.forEach((cell, index) => {
            const rowIndex = index % 3; // riempiamo per righe: 0,1,2,0,1,2...
            rows[rowIndex].push(cell);
        });
        return rows;
    }, [monthlyDayStats]);
    const duoStats = useMemo(() => {
        if (!summonerInfo || matches.length === 0)
            return [];
        const duosMap = {};
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
                        riotId: teammate.riotIdGameName && teammate.riotIdTagline
                            ? `${teammate.riotIdGameName}#${teammate.riotIdTagline}`
                            : teammate.summonerName || "Unknown",
                        lastChampionName: teammate.championName || null,
                        profileIconId: typeof teammate.profileIconId === "number" ? teammate.profileIconId : null,
                    };
                }
                else {
                    // aggiorno champ e icon con l'ultima partita vista
                    duosMap[idKey].lastChampionName = teammate.championName || duosMap[idKey].lastChampionName;
                    duosMap[idKey].profileIconId =
                        typeof teammate.profileIconId === "number" ? teammate.profileIconId : duosMap[idKey].profileIconId;
                }
                duosMap[idKey].games += 1;
                if (win)
                    duosMap[idKey].wins += 1;
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
    const listRef = useRef(null);
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
                }
                else {
                    setLinkedDiscord(null);
                }
            }
            catch (err) {
                console.error("discord lookup exception:", err);
                setLinkedDiscord(null);
            }
        })();
    }, [summonerInfo?.name, summonerInfo?.tag]);
    useEffect(() => {
        function onScroll() {
            if (!listRef.current)
                return;
            const items = listRef.current.querySelectorAll("li");
            if (items.length >= 13) {
                const thirteenth = items[12]; // 0-based index
                const rect = thirteenth.getBoundingClientRect();
                // se il top dell—elemento è sopra la viewport, vuol dire che l—abbiamo superato
                setShowScrollTop(rect.top < 0);
            }
            if (matchCenteringEnabled) {
                const matchItems = listRef.current.querySelectorAll(":scope > section > ul > li");
                if (matchItems.length >= 12) {
                    const target = matchItems[11];
                    const rectTarget = target.getBoundingClientRect();
                    setMatchesCentered(rectTarget.top + (rectTarget.height * 0.25) < 0);
                }
                else {
                    setMatchesCentered(false);
                }
            }
            else {
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
        const baseName = summonerInfo?.name
            ?? (slug
                ? (() => {
                    const idx = slug.lastIndexOf("-");
                    return idx > 0 ? slug.slice(0, idx) : slug;
                })()
                : name);
        if (baseName && baseName.trim().length > 0) {
            document.title = `${baseName} - lolData`;
        }
        else {
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
        if (!summonerInfo?.name || !summonerInfo?.tag || !region)
            return;
        enrichRecentProfile(summonerInfo.name, summonerInfo.tag, region.toUpperCase(), {
            icon_id: summonerInfo.profileIconId ?? null,
            rank: summonerInfo.rank ?? null,
        });
    }, [
        region,
        summonerInfo?.name,
        summonerInfo?.tag,
        summonerInfo?.profileIconId,
        summonerInfo?.rank,
    ]);
    useEffect(() => {
        if (!summonerInfo?.name || !summonerInfo?.tag)
            return;
        const nametag = `${summonerInfo.name}#${summonerInfo.tag}`;
        fetch(`${API_BASE_URL}/api/pro/check`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nametag }),
        })
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(({ plan }) => {
            const p = typeof plan === "string" ? plan.toLowerCase() : null;
            setPremiumPlan(p === "premium" || p === "elite" ? p : null);
        })
            .catch(() => setPremiumPlan(null));
    }, [summonerInfo?.name, summonerInfo?.tag]);
    useEffect(() => {
        if (!slug)
            return;
        const di = slug.lastIndexOf("-");
        const name = di > 0 ? slug.slice(0, di).replace(/\+/g, " ") : slug;
        const tag = di > 0 ? slug.slice(di + 1) : "";
        if (!name || !tag)
            return;
        // One box call resolves the whole talent identity for the header line:
        // curated Cloud pros win, then the scraped box pros (lolpros import),
        // then streamers. Replaces the old browser→Supabase reads.
        const nametag = `${name}#${tag}`;
        const clear = () => {
            setProPlayerInfo(null);
            setProTeamLogo(null);
            setProLinkedAccounts([]);
            setStreamerInfo(null);
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
            }
            else if (id.type === "streamer") {
                clear();
                setStreamerInfo({ twitch_login: id.twitchLogin ?? id.name, region: id.region ?? null, slug: id.slug });
            }
            else {
                clear();
            }
        })
            .catch(() => { setIsPro(false); setIsStreamer(false); clear(); });
    }, [slug]);
    useEffect(() => {
        // Scoreboard nameplates: every known pro/streamer account nametag, merged
        // server-side on the box (lolpros import + curated Cloud tables).
        fetch(`${BOX_API_BASE_URL}/api/pros/badge-map`)
            .then((r) => (r.ok ? r.json() : {}))
            .then((d) => {
            setProUsernames(new Set(d.pros ?? []));
            setStreamerUsernames(new Set(d.streamers ?? []));
            setProNames(new Map(Object.entries(d.proNames ?? {})));
            setStreamerNames(new Map(Object.entries(d.streamerNames ?? {})));
        })
            .catch(() => { });
    }, []);
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((res) => {
            if (!res.ok)
                throw new Error("Failed to load champion.json");
            return res.json();
        })
            .then((data) => {
            const champs = Object.values(data.data).map((champ) => ({
                id: champ.key, // "266"
                name: champ.id, // "Aatrox"
            }));
            const map = {};
            const reverseMap = {};
            champs.forEach((c) => {
                const numId = Number(c.id);
                if (!Number.isNaN(numId)) {
                    map[numId] = c.name; // 266 -> "Aatrox"
                    reverseMap[c.name] = numId; // "Aatrox" -> 266
                }
            });
            setChampionMap(map);
            setChampionMapReverse(reverseMap);
            setAllChampions(champs);
        })
            .catch((err) => {
            console.error("Error loading champions:", err);
        });
    }, []);
    useEffect(() => {
        const savedScroll = sessionStorage.getItem("summonerScrollY");
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
            sessionStorage.removeItem("summonerScrollY"); //clear the y axis
        }
    }, []);
    useEffect(() => {
        setLatestPatch(getCdnVersion());
    }, []);
    // Cooldown countdown timer
    useEffect(() => {
        if (cooldownSeconds <= 0) {
            setOnCooldown(false);
            return;
        }
        setOnCooldown(true);
        const interval = setInterval(() => {
            setCooldownSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setOnCooldown(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [cooldownSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!name || !tag)
            return;
        refreshData();
    }, [name, tag, region]);
    useEffect(() => {
        if (!summonerInfo?.puuid || !region)
            return;
        // Fetch all three season stat groups — no polling needed,
        // data is populated during match ingestion by the backend.
        fetchSeasonStats(summonerInfo.puuid, region, "ranked_all");
        fetchSeasonStats(summonerInfo.puuid, region, "ranked_solo");
        fetchSeasonStats(summonerInfo.puuid, region, "ranked_flex");
        fetchSplitStats(summonerInfo.puuid, region, "ranked_all");
    }, [summonerInfo?.puuid, region]);
    // Poll for matches when ingestion is in progress (first-time search)
    useEffect(() => {
        if (!isIngesting || !name || !tag || !region)
            return;
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
    // ── Context menu dismiss ──
    useEffect(() => {
        if (!ctxMenu)
            return;
        const dismiss = () => setCtxMenu(null);
        const onKey = (e) => { if (e.key === "Escape")
            dismiss(); };
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
        if (!matchCtxMenu)
            return;
        const dismiss = () => setMatchCtxMenu(null);
        const onKey = (e) => { if (e.key === "Escape")
            dismiss(); };
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
        const handler = (e) => {
            e.preventDefault();
            setCtxMenu({ x: e.clientX, y: e.clientY });
        };
        document.addEventListener("contextmenu", handler);
        return () => document.removeEventListener("contextmenu", handler);
    }, []);
    /**
     * @param soft  UPDATE-button refresh: keep everything on screen, swap the
     *              numbers underneath and slide in whatever is new.
     *
     * The hard path wipes state first, which is right on first load (there is
     * nothing to preserve and the skeletons explain the wait) and wrong on a
     * refresh: nulling summonerInfo re-arms the boot overlay, emptying matches
     * re-arms the skeletons, and the filter resets throw away the champion/queue/
     * role the user had chosen.
     */
    async function refreshData(soft = false) {
        if (!region) {
            console.error("— Region mancante in refreshData");
            return;
        }
        if (!name || !tag)
            return;
        if (soft) {
            setRefreshing(true);
        }
        else {
            setLoading(true);
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
            setSelectedQueue("All");
            setSelectedResult("all");
            setSelectedRole(null);
            setRankQueueView("solo");
        }
        try {
            // Fire summoner info and matches in parallel — summoner endpoint
            // no longer blocks on match ingestion, so both can run concurrently
            const [summonerResult] = await Promise.all([
                fetchSummonerInfo(name, tag, region),
                fetchMatches(name, tag, region, 0, false, 20, soft),
            ]);
            if (!summonerResult.found) {
                // Same reasoning as the catch below: never evict a working page
                // because a refresh came back empty.
                if (soft) {
                    setRefreshing(false);
                    return;
                }
                navigate("/404", {
                    state: {
                        message: "Summoner not found",
                        subtitle: `No data found for "${name}#${tag}" — maybe you misspelled the name or tag?`,
                    },
                    replace: true,
                });
                return;
            }
            // Re-fetch matches after a short delay to catch
            // any additional matches ingested in background
            setTimeout(async () => {
                try {
                    await fetchMatches(name, tag, region, 0, false, 20, soft);
                }
                catch { }
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
                const list = (masteryData?.masteryList ?? []);
                if (list.length === 0)
                    return;
                // Build ID → name map
                const idMap = {};
                if (champJson?.data) {
                    for (const c of Object.values(champJson.data)) {
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
            }).catch(() => { });
            // Fire-and-forget tracking calls — don't block the UI
            fetch(`${API_BASE_URL}/api/summoner/view`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, tag }),
            }).catch(console.error);
            fetch(`${API_BASE_URL}/api/profile/views`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, tag }),
            }).catch(console.error);
        }
        catch (err) {
            console.error("— Error loading summoner data:", err);
            // On a soft refresh the page is already showing good data. Bouncing to
            // /404 because a background refresh hiccuped throws away everything the
            // user was looking at — leave the page alone and let them retry.
            if (soft) {
                setRefreshing(false);
                return;
            }
            navigate("/404", {
                state: {
                    message: "Summoner not found",
                    subtitle: `No data found for "${name}#${tag}" — maybe you misspelled the name or tag?`,
                },
                replace: true,
            });
            return;
        }
        if (soft)
            setRefreshing(false);
        else
            setLoading(false);
    }
    function LoadingSquares() {
        return (_jsx("div", { className: "flex items-center gap-1 h-10", children: [0, 1, 2].map(i => (_jsx("span", { className: "w-2.5 h-2.5 bg-jade rounded-[2px] animate-pulse", style: { animationDelay: `${i * 0.15}s` } }, i))) }));
    }
    async function fetchSummonerInfo(name, tag, region) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/summoner`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, tag, region }),
            });
            if (!res.ok)
                return { found: false, cooldownRemaining: 0 };
            const data = await res.json();
            if (!data.summoner)
                return { found: false, cooldownRemaining: 0 };
            setSummonerInfo(data.summoner);
            const cd = data.cooldownRemaining ?? 0;
            if (cd > 0)
                setCooldownSeconds(cd);
            return { found: true, cooldownRemaining: cd };
        }
        catch {
            return { found: false, cooldownRemaining: 0 };
        }
    }
    // Loads 20 at once (backend caps a single page at 20) so the LOLDATA Score
    // — computed on the latest 20 games — is stable from the first paint instead
    // of drifting as more matches stream in.
    async function fetchMatches(name, tag, region, offset = 0, append = false, limit = 20, merge = false) {
        const res = await fetch(`${API_BASE_URL}/api/matches`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, tag, region, offset, limit }),
        });
        const data = await res.json();
        // Track ingestion state — keep polling while backend says ingesting
        setIsIngesting(Boolean(data.ingesting));
        if (!merge) {
            setHasMore(Boolean(data.hasMore));
            setNextOffset(Number(data.nextOffset ?? (offset + (data.matches?.length ?? 0))));
        }
        setTopChampions(data.topChampions || []);
        // Always update matches if we got any (even partial during ingestion)
        if (data.matches && data.matches.length > 0) {
            if (merge) {
                // Keep what is on screen and splice in only genuinely new games, so the
                // list never blanks and the scroll position survives. Computed against
                // the ref, NOT inside a setMatches updater: an updater that calls
                // another setter is impure and tears the tree down.
                const seen = new Set(matchesRef.current.map((m) => m?.metadata?.matchId).filter(Boolean));
                const incoming = (data.matches ?? []).filter((m) => m?.metadata?.matchId && !seen.has(m.metadata.matchId));
                if (incoming.length > 0) {
                    // Second dedupe against `prev`: the ref only catches up on commit, so
                    // two refreshes in quick succession could otherwise prepend the same
                    // game twice - and matchId is the list key.
                    setMatches(prev => {
                        const have = new Set(prev.map((m) => m?.metadata?.matchId));
                        const add = incoming.filter((m) => !have.has(m.metadata.matchId));
                        return add.length > 0 ? [...add, ...prev] : prev;
                    });
                    setFreshMatchIds(new Set(incoming.map((m) => m.metadata.matchId)));
                    // Slide the pagination window by however many games we spliced in,
                    // otherwise the next "load more" re-requests rows we already show.
                    setNextOffset(prev => prev + incoming.length);
                }
            }
            else if (append) {
                setMatches(prev => {
                    const have = new Set(prev.map((m) => m?.metadata?.matchId));
                    const add = data.matches.filter((m) => !have.has(m?.metadata?.matchId));
                    return add.length > 0 ? [...prev, ...add] : prev;
                });
            }
            else {
                setMatches(data.matches);
            }
        }
    }
    async function fetchSeasonStats(puuid, region, queueGroup = "ranked_all") {
        try {
            const res = await fetch(`${API_BASE_URL}/api/season_stats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ puuid, region, queueGroup }),
            });
            if (res.ok) {
                const data = await res.json();
                if (queueGroup === "ranked_all")
                    setTopChampionsSeason(data.topChampions || []);
                if (queueGroup === "ranked_solo")
                    setTopChampionsSolo(data.topChampions || []);
                if (queueGroup === "ranked_flex")
                    setTopChampionsFlex(data.topChampions || []);
            }
        }
        catch (err) {
            console.error("Error fetching season stats:", err);
        }
    }
    async function fetchSplitStats(puuid, region, queueGroup = "ranked_all") {
        try {
            const res = await fetch(`${API_BASE_URL}/api/split_stats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ puuid, region, queueGroup }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.splitTotals)
                    setSplitTotals(data.splitTotals);
            }
        }
        catch (err) {
            console.error("Error fetching split stats:", err);
        }
    }
    const groupedByDay = useMemo(() => {
        // garantiamo l'ordinamento decrescente per timestamp
        const sorted = [...filteredMatches].sort((a, b) => {
            const ta = getMatchTimestamp(a.match.info) || 0;
            const tb = getMatchTimestamp(b.match.info) || 0;
            return tb - ta;
        });
        const map = new Map();
        for (const row of sorted) {
            const ts = getMatchTimestamp(row.match.info);
            const key = dayKeyFromTs(ts);
            if (!map.has(key))
                map.set(key, []);
            map.get(key).push(row);
        }
        return map; // mantiene l—ordine d—inserimento
    }, [filteredMatches]);
    function StatsList({ champs }) {
        const isEmpty = !champs || champs.length === 0;
        // Show skeleton only while initial page is loading or ingesting
        const showSkeleton = isEmpty && (loading || isIngesting);
        return (_jsx("div", { className: "flex flex-col gap-3 mx-2 mt-3", children: showSkeleton ? (Array.from({ length: 5 }).map((_, idx) => (_jsx("div", { className: "grid items-center px-4 py-1 animate-pulse", children: _jsxs("div", { className: "flex items-center gap-3 w-full", children: [_jsx(Skeleton, { className: "w-10 h-10 rounded-full" }), _jsxs("div", { className: "flex flex-col gap-0.5 w-[300px]", children: [_jsx(Skeleton, { className: "w-[30%] h-2.5" }), _jsx(Skeleton, { className: "w-[60%] h-2.5" })] })] }) }, idx)))) : isEmpty ? (_jsx("div", { className: "text-center py-6 text-flash/40 text-sm", children: "No ranked games this season" })) : ((() => {
                const displayChamps = champs.slice(0, 5);
                return (_jsxs(_Fragment, { children: [displayChamps.map((champ) => (_jsxs("div", { className: "flex items-center justify-between px-3 w-full xl:grid xl:grid-cols-[148px_96px_minmax(0,1fr)] xl:items-center xl:gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 xl:justify-self-start", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(champ.champion)}.png`, alt: champ.champion, className: "w-12 h-12 rounded-full ring-1 ring-flash/10" }), _jsxs("div", { className: "flex flex-col gap-0.5 justify-start min-w-0", children: [_jsx("div", { className: "font-chakrapetch font-bold uppercase tracking-[0.04em] text-[13px] text-flash truncate max-w-[100px]", children: champ.champion }), _jsxs("div", { className: "font-mono text-[10.5px] tabular-nums text-flash/55", children: [(() => {
                                                            const num = Number(champ.csPerMin);
                                                            const rounded = Math.round(num * 10) / 10;
                                                            return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
                                                        })(), " CS"] })] })] }), _jsxs("div", { className: "hidden xl:flex flex-col items-center gap-0.5 whitespace-nowrap xl:w-full", children: [_jsxs("div", { className: cn("font-chakrapetch font-bold text-[13px] tabular-nums leading-none", getKdaClass(champ.avgKda)), children: [champ.avgKda, " KDA"] }), _jsxs("div", { className: "font-mono text-[10.5px] tabular-nums text-flash/55", children: [formatStat(champ.kills / champ.games), " / ", formatStat(champ.deaths / champ.games), " / ", formatStat(champ.assists / champ.games)] })] }), _jsxs("div", { className: "flex items-center gap-4 xl:flex-col xl:items-end xl:gap-1 xl:justify-self-end", children: [_jsx("div", { className: "xl:hidden", children: _jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: cn("font-chakrapetch font-bold text-[13px] tabular-nums cursor-default", getKdaClass(champ.avgKda)), children: [champ.avgKda, " KDA"] }) }), _jsxs(TooltipContent, { side: "top", className: "text-xs", children: [formatStat(champ.kills / champ.games), " / ", formatStat(champ.deaths / champ.games), " / ", formatStat(champ.assists / champ.games)] })] }) }) }), _jsx("div", { className: "xl:hidden", children: _jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: cn("font-chakrapetch font-bold text-[13px] tabular-nums cursor-default", getWinrateClass(champ.winrate, champ.games)), children: [champ.winrate, "%"] }) }), _jsxs(TooltipContent, { side: "top", className: "text-xs", children: [champ.games, " matches"] })] }) }) }), _jsxs("div", { className: cn("hidden xl:block font-chakrapetch font-bold text-[13px] tabular-nums leading-none", getWinrateClass(champ.winrate, champ.games)), children: [champ.winrate, "%"] }), _jsxs("div", { className: "hidden xl:block font-mono text-[9.5px] tracking-[0.18em] uppercase text-flash/40", children: [champ.games, " matches"] })] })] }, champ.champion))), displayChamps.length < 5 && Array.from({ length: 5 - displayChamps.length }).map((_, i) => (_jsx("div", { className: "flex items-center px-3 w-full h-12", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/profileicon/29.png`, alt: "empty slot", className: "w-12 h-12 rounded-full grayscale", style: { opacity: 0.3 - i * 0.05 } }), _jsx("div", { className: "h-2 w-16 rounded bg-flash/5", style: { opacity: 0.3 - i * 0.05 } })] }) }, `placeholder-${i}`)))] }));
            })()) }));
    }
    return (_jsxs("div", { className: "relative z-0", children: [_jsx(SummonerBootOverlay, { active: !summonerInfo }), !techBgDisabled && _jsx(UltraTechBackground, {}), (selectedQueue !== "All" || selectedChampion || selectedResult !== "all" || selectedRole || filterDuoPuuid) && (_jsx("div", { className: cn("fixed right-10 z-50 transition-all duration-300", showScrollTop ? "bottom-[7.5rem]" : "bottom-10"), children: _jsx(DiamondButton, { color: "red", icon: _jsx(X, { className: "w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" }), label: "RESET", onClick: () => {
                        setSelectedQueue("All");
                        setSelectedChampion(null);
                        setSelectedResult("all");
                        setSelectedRole(null);
                        setFilterDuoPuuid(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    } }) })), _jsxs("div", { className: "relative flex min-h-screen -mt-4 z-10", children: [_jsxs("div", { className: "hidden lg:flex w-2/5 min-w-[35%] flex flex-col gap-0 items-center transition-opacity duration-700 ease-in-out", style: { opacity: matchesCentered ? 0 : 1 }, children: [_jsxs("div", { className: cn(glassDark, "w-[90%] mt-5 text-sm font-thin"), children: [_jsx(BorderBeam, { duration: 8, size: 100 }), topChampionsSeason.length > 0 && (_jsx("div", { className: "absolute inset-x-0 top-0 h-[220px] overflow-hidden z-[2] pointer-events-none", children: _jsx("img", { src: cdnSplashUrl(topChampionsSeason[0].champion), alt: `Splash art ${topChampionsSeason[0].champion}`, className: "w-full h-full object-cover opacity-15 filter grayscale brightness-150", style: {
                                                objectPosition: "top center",
                                                maskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 85%)",
                                                WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 40%, transparent 85%)",
                                            } }) })), _jsxs("div", { className: "relative z-10", children: [_jsx("div", { className: "relative w-full h-32 mt-2", children: _jsxs("div", { className: "relative z-10 px-5 py-3", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", onClick: () => setSeasonOrSplitView("season"), className: cn("text-[10px] font-mono tracking-[0.25em] uppercase transition-colors cursor-clicker", seasonOrSplitView === "season"
                                                                        ? "text-flash/60"
                                                                        : "text-flash/20 hover:text-flash/40"), children: "This Season" }), _jsx("span", { className: "text-flash/15 text-[10px]", children: "\u00B7" }), _jsx("button", { type: "button", onClick: () => setSeasonOrSplitView("split"), className: cn("text-[10px] font-mono tracking-[0.25em] uppercase transition-colors cursor-clicker", seasonOrSplitView === "split"
                                                                        ? "text-flash/60"
                                                                        : "text-flash/20 hover:text-flash/40"), children: "This Split" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" }), recentDetailedStats?.roleDistribution?.[0] && (() => {
                                                                    const roleMap = {
                                                                        TOP: _jsx(RoleTopIcon, { className: "w-7 h-7" }),
                                                                        JNG: _jsx(RoleJungleIcon, { className: "w-7 h-7" }),
                                                                        MID: _jsx(RoleMidIcon, { className: "w-7 h-7" }),
                                                                        ADC: _jsx(RoleAdcIcon, { className: "w-7 h-7" }),
                                                                        SUP: _jsx(RoleSupportIcon, { className: "w-7 h-7" }),
                                                                    };
                                                                    return (_jsx("div", { className: "text-flash/20", children: roleMap[recentDetailedStats.roleDistribution[0].role] ?? null }));
                                                                })()] }), (() => {
                                                            const isSplit = seasonOrSplitView === "split";
                                                            const dataReady = isSplit ? splitTotals !== null : summonerInfo !== null;
                                                            const wins = isSplit ? splitTotals?.wins ?? 0 : summonerInfo?.wins ?? 0;
                                                            const losses = isSplit ? splitTotals?.losses ?? 0 : summonerInfo?.losses ?? 0;
                                                            const totalGames = wins + losses;
                                                            const winrate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
                                                            return (_jsxs("div", { className: "flex items-end gap-5 mt-12", children: [_jsxs("div", { className: "flex flex-col items-center", children: [dataReady ? (_jsx("span", { className: "text-3xl font-orbitron font-bold text-jade tabular-nums leading-none", children: wins })) : (_jsx("span", { className: "text-3xl font-orbitron font-bold text-jade/30 tabular-nums leading-none animate-pulse", children: "--" })), _jsx("span", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-jade/50 mt-1", children: "Wins" })] }), _jsx("div", { className: "h-8 w-[1px] bg-flash/10 mb-1" }), _jsxs("div", { className: "flex flex-col items-center", children: [dataReady ? (_jsx("span", { className: "text-3xl font-orbitron font-bold text-[#b11315] tabular-nums leading-none", children: losses })) : (_jsx("span", { className: "text-3xl font-orbitron font-bold text-[#b11315]/30 tabular-nums leading-none animate-pulse", children: "--" })), _jsx("span", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-[#b11315]/50 mt-1", children: "Losses" })] }), _jsx("div", { className: "h-8 w-[1px] bg-flash/10 mb-1" }), dataReady ? (_jsxs("div", { className: "flex flex-col items-center", children: [_jsxs("div", { className: "flex items-baseline gap-0.5", children: [_jsx("span", { className: `text-3xl font-orbitron font-bold tabular-nums leading-none ${getWinrateClass(winrate, totalGames)}`, children: winrate }), _jsx("span", { className: `text-lg font-orbitron font-bold leading-none ${getWinrateClass(winrate, totalGames)}`, children: "%" })] }), _jsx("span", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 mt-1", children: "Winrate" })] })) : (_jsxs("div", { className: "flex flex-col items-center", children: [_jsxs("div", { className: "flex items-baseline gap-0.5", children: [_jsx("span", { className: "text-3xl font-orbitron font-bold text-flash/20 tabular-nums leading-none animate-pulse", children: "--" }), _jsx("span", { className: "text-lg font-orbitron font-bold text-flash/20 leading-none animate-pulse", children: "%" })] }), _jsx("span", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 mt-1", children: "Winrate" })] }))] }));
                                                        })()] }) }), !recentDetailedStats && (_jsx("div", { className: "px-3 pt-2 pb-4 animate-pulse", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "shrink-0 -ml-2 flex items-center justify-center w-[180px] h-[180px]", children: _jsx("div", { className: "w-[120px] h-[120px] rounded-full border border-hairline/[0.06]" }) }), _jsx("div", { className: "grid grid-cols-2 gap-x-3 gap-y-3.5 flex-1 min-w-0", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx(Skeleton, { className: "w-[40px] h-2.5" }), _jsx(Skeleton, { className: "w-[52px] h-4" })] }, i))) })] }) })), recentDetailedStats && (() => {
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
                                                const pt = (a, r) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
                                                const hex = (r) => angles.map(a => pt(a, r).join(",")).join(" ");
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
                                                return (_jsx("div", { className: "px-3 pt-2 pb-4 font-jetbrains", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(TooltipProvider, { delayDuration: 0, children: _jsx("div", { className: "shrink-0 -ml-2 relative", children: _jsxs("svg", { width: "180", height: "180", viewBox: "0 0 220 220", children: [[0.25, 0.5, 0.75, 1].map(s => (_jsx("polygon", { points: hex(maxR * s), fill: "none", stroke: "rgba(255,255,255,0.05)", strokeWidth: "0.5" }, s))), angles.map((a, i) => {
                                                                                const [ex, ey] = pt(a, maxR);
                                                                                return _jsx("line", { x1: cx, y1: cy, x2: ex, y2: ey, stroke: "rgba(255,255,255,0.05)", strokeWidth: "0.5" }, i);
                                                                            }), _jsx("polygon", { points: dataHex, fill: "rgba(0,217,146,0.08)", stroke: "rgba(0,217,146,0.5)", strokeWidth: "1.5", strokeLinejoin: "round" }), _jsx("polygon", { points: dataHex, fill: "url(#radarGlow)" }), radarStats.map((s, i) => {
                                                                                const [dx, dy] = pt(angles[i], Math.max(s.pct, 0.08) * maxR);
                                                                                return (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("g", { className: "cursor-clicker", children: [_jsx("circle", { cx: dx, cy: dy, r: "10", fill: "transparent" }), _jsx("circle", { cx: dx, cy: dy, r: "5", fill: "#00d992", fillOpacity: "0.12" }), _jsx("circle", { cx: dx, cy: dy, r: "2.5", fill: "#00d992", fillOpacity: "0.9" })] }) }), _jsxs(TooltipContent, { side: "top", className: "font-jetbrains", children: [_jsx("span", { className: "text-jade font-semibold", children: tooltipValues[i] }), _jsx("span", { className: "text-flash/50 ml-1.5", children: tooltipLabels[i] })] })] }, i));
                                                                            }), radarStats.map((s, i) => {
                                                                                const [lx, ly] = pt(angles[i], maxR + 16);
                                                                                return (_jsx("text", { x: lx, y: ly, textAnchor: "middle", dominantBaseline: "middle", className: "fill-flash/30 text-[9px] font-jetbrains uppercase tracking-wider", children: s.label }, i));
                                                                            }), _jsx("defs", { children: _jsxs("radialGradient", { id: "radarGlow", cx: "50%", cy: "50%", r: "50%", children: [_jsx("stop", { offset: "0%", stopColor: "#00d992", stopOpacity: "0.12" }), _jsx("stop", { offset: "100%", stopColor: "#00d992", stopOpacity: "0" })] }) })] }) }) }), _jsx("div", { className: "grid grid-cols-2 gap-1.5 flex-1 min-w-0 self-start mt-7", children: [
                                                                    { label: "KDA", value: recentDetailedStats.avgKda },
                                                                    { label: "CS/MIN", value: recentDetailedStats.csPerMin },
                                                                    { label: "KP", value: `${recentDetailedStats.avgKP}%` },
                                                                    { label: "DMG", value: `${recentDetailedStats.avgDmg}%` },
                                                                    { label: "GOLD/M", value: String(recentDetailedStats.goldPerMin) },
                                                                    { label: "AVG IMPACT", value: recentDetailedStats.avgImpact },
                                                                ].map(s => (_jsxs("div", { className: "flex flex-col gap-0.5 rounded-[7px] bg-gradient-to-b from-filmlight/[0.07] to-filmlight/[0.02] px-2.5 py-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-1 h-1 rotate-45 bg-jade/60 shrink-0" }), _jsx("span", { className: "text-[8.5px] font-mono uppercase tracking-[0.14em] text-flash/35 whitespace-nowrap", children: s.label })] }), _jsx("span", { className: "font-chakrapetch font-bold text-[17px] text-flash/90 tabular-nums leading-none pl-2.5", children: s.value })] }, s.label))) })] }) }));
                                            })()] })] }), _jsx("div", { id: "season-stats", className: cn(glassDark, "w-[90%] h-[420px] mt-4 text-sm font-thin"), children: _jsx("div", { className: "relative z-10", children: _jsx(Tabs, { value: seasonStatsTab, onValueChange: (v) => {
                                            setSeasonStatsTab(v);
                                            if (!summonerInfo?.puuid || !region)
                                                return;
                                            if (v === "solo" && topChampionsSolo.length === 0)
                                                fetchSeasonStats(summonerInfo.puuid, region, "ranked_solo");
                                            if (v === "flex" && topChampionsFlex.length === 0)
                                                fetchSeasonStats(summonerInfo.puuid, region, "ranked_flex");
                                            if (v === "season" && topChampionsSeason.length === 0)
                                                fetchSeasonStats(summonerInfo.puuid, region, "ranked_all");
                                        }, children: _jsxs("nav", { className: "flex flex-col min-h-[400px]", children: [_jsx("div", { className: "px-3 pt-3", children: _jsx(TabsList, { className: "flex justify-center w-[90%] mx-auto bg-transparent h-auto p-0 gap-5 border-b border-flash/[0.06]", children: [
                                                            { value: "season", label: "Season" },
                                                            { value: "solo", label: "Solo/Duo" },
                                                            { value: "flex", label: "Flex" },
                                                        ].map((tab) => (_jsxs(TabsTrigger, { value: tab.value, className: cn("group relative font-chakrapetch text-[12px] tracking-[0.18em] uppercase px-1 py-2.5 rounded-none bg-transparent border-none shadow-none transition-all duration-300 cursor-clicker", "text-flash/40 hover:text-flash/65", "data-[state=active]:text-jade data-[state=active]:bg-transparent data-[state=active]:shadow-none"), children: [_jsx("span", { className: "hidden group-data-[state=active]:inline text-jade/40 mr-0.5", children: "[" }), tab.label, _jsx("span", { className: "hidden group-data-[state=active]:inline text-jade/40 ml-0.5", children: "]" }), _jsx("span", { className: "absolute bottom-0 left-0 right-0 h-px bg-jade/60 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300 origin-center shadow-[0_0_6px_rgba(0,217,146,0.3)]" })] }, tab.value))) }) }), _jsx("div", { className: "h-2" }), _jsx("div", { className: "relative overflow-hidden", children: _jsxs(AnimatePresence, { mode: "wait", children: [seasonStatsTab === "season" && (_jsx(TabsContent, { value: "season", className: "m-0", forceMount: true, asChild: true, children: _jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, transition: { duration: 0.2, ease: "easeInOut" }, children: _jsx(StatsList, { champs: topChampionsSeason }) }, "season") })), seasonStatsTab === "solo" && (_jsx(TabsContent, { value: "solo", className: "m-0", forceMount: true, asChild: true, children: _jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, transition: { duration: 0.2, ease: "easeInOut" }, children: _jsx(StatsList, { champs: topChampionsSolo }) }, "solo") })), seasonStatsTab === "flex" && (_jsx(TabsContent, { value: "flex", className: "m-0", forceMount: true, asChild: true, children: _jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, transition: { duration: 0.2, ease: "easeInOut" }, children: _jsx(StatsList, { champs: topChampionsFlex }) }, "flex") }))] }) }), _jsxs(Link, { to: `/summoners/${region}/${slug}/season`, className: "flex items-center justify-center gap-1.5 mt-auto mb-4 pt-2 mx-auto text-[11px] font-chakrapetch tracking-[0.18em] uppercase text-flash/45 hover:text-jade transition-colors cursor-clicker", children: ["Show more", _jsx(ChevronRight, { className: "w-3.5 h-3.5" })] })] }) }) }) }), !!summonerInfo?.puuid && matches.length > 0 && (_jsx("div", { className: "w-[90%] mt-4 flex flex-col gap-4", children: _jsx("div", { className: cn(glassDark, "w-full text-sm font-thin"), children: _jsx("div", { className: "relative z-10 px-5 py-4", children: (() => {
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
                                            const vHex = (v) => (v >= 55 ? "#00d992" : v <= 45 ? "#e0503f" : "rgba(215,216,217,0.72)");
                                            return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/55", children: "LOLDATA Score" }), _jsx("div", { className: "flex-1 h-px bg-flash/[0.07]" }), has && (_jsxs("span", { className: "text-[9px] font-jetbrains tracking-wide uppercase text-flash/35", children: [loldata.games, " games"] }))] }), _jsxs("div", { className: "mt-2 flex items-center gap-3 flex-wrap", children: [_jsx("span", { className: cn("text-[54px] font-chakrapetch font-bold leading-none tracking-tight", sColor), children: has ? s : "--" }), has && (_jsxs("div", { className: "flex flex-col items-center gap-0.5", children: [_jsx("span", { className: cn("text-[12px] font-chakrapetch font-bold px-2 py-[2px] rounded-[3px] tracking-wide leading-none", up ? "bg-jade/15 text-jade" : down ? "bg-[#e0503f]/15 text-[#e0503f]" : "bg-flash/10 text-flash/60"), children: loldata.delta >= 0 ? `+${loldata.delta}` : loldata.delta }), _jsx("span", { className: "text-[8px] font-jetbrains uppercase tracking-[0.16em] text-flash/35 leading-none", children: "vs rank" })] })), _jsx("div", { className: "hidden sm:block h-9 w-px bg-flash/[0.08] mx-0.5" }), _jsx("span", { className: cn("text-[13px] font-chakrapetch", up ? "text-jade" : down ? "text-[#e0503f]" : "text-flash/65"), children: has ? loldata.verdict : "Not enough games" })] }), has && (_jsx("div", { className: "mt-4 grid grid-cols-5 gap-2.5", children: cats.map((d) => (_jsxs("div", { className: "flex flex-col items-center justify-center gap-1.5 rounded-[3px] py-3 px-1 bg-gradient-to-b from-filmlight/[0.055] to-filmlight/[0.015] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]", children: [_jsx("span", { className: "text-[8px] font-jetbrains uppercase tracking-[0.04em] text-flash/45 text-center leading-none whitespace-nowrap", children: d.k }), _jsx("span", { className: "text-[22px] font-chakrapetch font-bold leading-none", style: { color: vHex(d.v) }, children: d.v })] }, d.k))) }))] }));
                                        })() }) }) })), duoStats.length > 0 && (_jsxs("div", { className: cn(glassDark, "w-[90%] mt-5"), children: [_jsx("div", { className: "pointer-events-none absolute -top-24 left-0 h-56 w-full z-[1] bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.025),rgba(255,255,255,0)_70%)]" }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/[0.015] via-transparent to-black/30" }), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 pt-3 pb-2.5", children: [_jsx("span", { className: "text-[11px] font-mono text-flash/50 tracking-[0.2em] uppercase shrink-0", children: "Played With" }), _jsx("div", { className: "flex-1 h-px bg-flash/[0.08]" }), _jsx("span", { className: "text-[11px] font-mono text-flash/30", children: duoStats.length })] }), _jsxs("div", { className: "px-4 pb-2 grid grid-cols-[1.6rem_1fr_4.2rem_3.2rem] gap-x-3 items-center border-b border-flash/[0.07]", children: [_jsx("span", { className: "text-[10px] font-mono text-flash/30 tracking-widest", children: "#" }), _jsx("span", { className: "text-[10px] font-mono text-flash/30 tracking-widest uppercase", children: "Player" }), _jsx("span", { className: "text-[10px] font-mono text-flash/30 tracking-widest text-right", children: "W \u25C6 L" }), _jsx("span", { className: "text-[10px] font-mono text-flash/30 tracking-widest text-right", children: "WR" })] }), visibleDuos.map((duo, i) => (_jsxs("div", { onClick: () => setFilterDuoPuuid(duo.puuid === filterDuoPuuid ? null : duo.puuid), className: cn("px-4 py-2.5 grid grid-cols-[1.6rem_1fr_4.2rem_3.2rem] gap-x-3 items-center border-b border-flash/[0.05] transition-colors cursor-clicker", filterDuoPuuid === duo.puuid
                                                    ? "bg-jade/10 border-jade/20"
                                                    : "hover:bg-filmlight/[0.02]"), children: [_jsx("span", { className: "text-[10px] font-mono text-flash/30 leading-none tabular-nums", children: String(i + 1).padStart(2, '0') }), _jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [duo.profileIconId && (_jsx("img", { src: `${cdnBaseUrl()}/img/profileicon/${duo.profileIconId}.png`, alt: "", className: "w-5 h-5 rounded-sm shrink-0 opacity-80" })), duo.riotId.includes("#") ? (_jsx("span", { onClick: (e) => e.stopPropagation(), children: _jsx(PlayerHoverCard, { riotId: duo.riotId, region: region, championId: duo.lastChampionName ? championMapReverse[duo.lastChampionName] : undefined, profileIconId: duo.profileIconId ?? undefined, patch: latestPatch, isCurrentUser: duo.puuid === summonerInfo?.puuid, championMap: championMap, children: _jsx("span", { className: "truncate text-flash/85 text-xs cursor-clicker", children: duo.riotId }) }) })) : (_jsx("span", { className: "truncate text-flash/85 text-xs", children: duo.riotId }))] }), _jsxs("div", { className: "flex items-center justify-end gap-1 font-mono text-xs tabular-nums", children: [_jsxs("span", { className: "text-jade", children: [duo.wins, "W"] }), _jsx("span", { className: "text-flash/30", children: "\u00B7" }), _jsxs("span", { className: "text-[#b11315]", children: [duo.losses, "L"] })] }), _jsxs("div", { className: "flex flex-col items-end gap-1", children: [_jsxs("span", { className: cn("text-xs font-mono leading-none tabular-nums", getWinrateClass(duo.winrate, duo.games)), children: [duo.winrate, "%"] }), _jsx("div", { className: "w-full h-[3px] bg-filmlight/10 rounded-full overflow-hidden", children: _jsx("div", { className: cn("h-full rounded-full", duo.winrate >= 50 ? "bg-jade/60" : "bg-[#b11315]/60"), style: { width: `${duo.winrate}%` } }) })] })] }, duo.puuid))), duoStats.length > 3 && (_jsxs("button", { type: "button", onClick: () => setShowAllDuos(v => !v), className: "group w-full py-2.5 text-[10px] font-mono text-flash/25 hover:text-jade/60 tracking-[0.25em] uppercase transition-all duration-300 cursor-clicker flex items-center justify-center gap-2", children: [_jsx("span", { className: "h-px flex-1 max-w-[3rem] bg-flash/[0.06] group-hover:bg-jade/20 transition-colors" }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-jade/40 group-hover:text-jade/70 transition-colors", children: showAllDuos ? '[-]' : '[+]' }), showAllDuos ? 'collapse' : `${duoStats.length - 3} more`] }), _jsx("span", { className: "h-px flex-1 max-w-[3rem] bg-flash/[0.06] group-hover:bg-jade/20 transition-colors" })] }))] })] }))] }), _jsxs("div", { className: "w-full min-w-0 transition-transform duration-700 ease-in-out", style: {
                            transform: matchesCentered ? "translateX(-20%)" : "translateX(0)",
                        }, children: [_jsxs("div", { className: "lg:hidden relative overflow-hidden mt-20 rounded-md border border-jade/15 bg-[rgba(6,12,14,0.6)] p-3", children: [topChampionsSeason.length > 0 && (_jsx("img", { src: cdnSplashUrl(topChampionsSeason[0].champion), alt: "", className: "pointer-events-none absolute inset-y-0 right-0 h-full w-[60%] object-cover object-right opacity-20", style: {
                                            WebkitMaskImage: "linear-gradient(to left, black 0%, transparent 85%)",
                                            maskImage: "linear-gradient(to left, black 0%, transparent 85%)",
                                        }, draggable: false, onError: (e) => { e.currentTarget.style.display = "none"; } })), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: summonerInfo?.avatar_url
                                                            ?? `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`, alt: "", className: cn("w-14 h-14 rounded object-cover shrink-0 border-2", summonerInfo?.live ? "border-red-500" : "border-transparent"), draggable: false, onError: (e) => {
                                                            e.currentTarget.src = `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`;
                                                        } }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "truncate", children: [_jsx("span", { className: "font-chakrapetch font-bold text-lg text-flash", children: summonerInfo?.name }), summonerInfo?.tag && (_jsxs("span", { className: "text-flash/40 font-chakrapetch text-sm ml-0.5", children: ["#", summonerInfo.tag] }))] }), _jsxs("div", { className: "text-[11px] font-jetbrains text-flash/40 mt-0.5", children: ["Level ", summonerInfo?.level, " \u00B7 ", region?.toUpperCase()] })] }), summonerInfo?.live && summonerInfo?.puuid && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: () => setMobileLiveOpen(true), className: "shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-red-500 font-mono text-[9px] font-bold tracking-[0.18em] uppercase text-white shadow-[0_0_14px_rgba(239,68,68,0.55)] active:brightness-110 cursor-clicker", children: [_jsx("span", { className: "w-[5px] h-[5px] rounded-full bg-white animate-pulse" }), "Live"] }), _jsx(LiveViewer, { puuid: summonerInfo.puuid, riotId: `${summonerInfo.name}#${summonerInfo.tag}`, region: region, controlledOpen: mobileLiveOpen, onControlledOpenChange: setMobileLiveOpen })] }))] }), _jsx("div", { className: "h-px bg-flash/10 my-2.5" }), [
                                                { label: "Solo", rank: summonerInfo?.rank, lp: summonerInfo?.lp },
                                                { label: "Flex", rank: summonerInfo?.flexRank, lp: summonerInfo?.flexLp },
                                            ].map((q) => {
                                                const isUnranked = !q.rank || q.rank.toLowerCase() === "unranked";
                                                return (_jsxs("div", { className: "flex items-center gap-2 py-0.5", children: [_jsx("img", { src: isUnranked ? "/img/unranked.png" : getRankImage(q.rank), alt: "", className: "w-8 h-8 shrink-0", draggable: false, onError: (e) => { e.currentTarget.src = "/img/unranked.png"; } }), isUnranked ? (_jsx("span", { className: "font-chakrapetch text-sm text-flash/50", children: "Unranked" })) : (_jsxs("span", { className: "font-chakrapetch text-sm text-flash", children: [q.rank, _jsxs("span", { className: "text-flash/50 text-xs", children: [" \u00B7 ", q.lp ?? 0, " LP"] })] })), _jsx("span", { className: "ml-auto text-[10px] uppercase tracking-wider text-flash/30", children: q.label })] }, q.label));
                                            })] })] }), _jsxs("div", { className: "flex flex-col-reverse lg:flex-row-reverse lg:flex-nowrap justify-center lg:justify-between items-center lg:items-start mt-2 lg:mt-[22px] mb-2 lg:mb-0 w-full min-w-full max-w-full", children: [(() => {
                                        const ranks = [
                                            { key: "solo", label: "Solo/Duo", rank: summonerInfo?.rank ?? "Unranked", lp: summonerInfo?.lp ?? 0 },
                                            { key: "flex", label: "Flex", rank: summonerInfo?.flexRank ?? "Unranked", lp: summonerInfo?.flexLp ?? 0 },
                                            { key: "ranked5", label: "Ranked 5s", rank: summonerInfo?.ranked5Rank ?? "Unranked", lp: summonerInfo?.ranked5Lp ?? 0 },
                                        ];
                                        return (_jsx("div", { className: "hidden lg:flex flex-nowrap items-start justify-center gap-9 h-full flex-1 mt-3", children: ranks.map(({ key, label, rank, lp }) => {
                                                const unranked = !rank || String(rank).toLowerCase() === "unranked";
                                                return (_jsxs("div", { className: "flex flex-col items-center gap-1.5 min-w-[106px]", children: [_jsx("span", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-flash/30 whitespace-nowrap", children: label }), _jsxs("div", { className: "relative w-[84px] h-[84px] flex items-center justify-center", children: [_jsx("div", { className: "absolute w-14 h-14 bg-filmdark/40 rounded-full z-0 border border-flash/[0.08] shadow-md" }), _jsx("img", { src: unranked ? "/img/unranked.png" : getRankImage(rank), alt: `${label} rank`, className: "relative z-10 w-[98px] h-[98px]", draggable: false, onError: (e) => { e.currentTarget.src = "/img/unranked.png"; } })] }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "text-[13px] font-mono font-semibold text-flash/65 tracking-wide whitespace-nowrap", children: rank }), !unranked && (_jsxs("span", { className: "text-[16px] font-chakrapetch font-bold text-flash tabular-nums", style: { textShadow: "0 0 10px rgba(255,255,255,0.35), 0 0 20px rgba(255,255,255,0.12)" }, children: [lp, " ", _jsx("span", { className: "text-[11px] text-flash/45", children: "LP" })] }))] })] }, key));
                                            }) }));
                                    })(), _jsx("div", { className: cn(glassDark, "hidden lg:block max-w-[440px]"), children: _jsxs("div", { className: "relative z-10 flex items-center gap-5 px-6 py-6", children: [_jsxs("div", { className: "relative shrink-0 w-[118px] h-[118px]", children: [_jsx("img", { src: summonerInfo?.avatar_url
                                                                ?? `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`, className: cn("relative w-full h-full rounded-xl select-none pointer-events-none border-2 object-cover", summonerInfo?.live ? "border-red-500" : "border-transparent"), style: summonerInfo?.live ? { boxShadow: "0 0 16px rgba(239,68,68,0.35), 0 0 4px rgba(239,68,68,0.5)" } : undefined, draggable: false, onError: (e) => {
                                                                e.currentTarget.src =
                                                                    `${cdnBaseUrl()}/img/profileicon/${summonerInfo?.profileIconId ?? 29}.png`;
                                                            } }), summonerInfo?.level != null && (_jsx("span", { className: "absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 rounded-[3px] bg-black/85 px-1.5 py-[2px] font-chakrapetch text-[10px] font-bold tabular-nums leading-none text-flash/90 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]", children: summonerInfo.level })), summonerInfo?.live && summonerInfo?.puuid && (_jsx(LiveViewer, { puuid: summonerInfo.puuid, riotId: `${summonerInfo.name}#${summonerInfo.tag}`, region: region }))] }), _jsxs("div", { className: "flex flex-col gap-2.5 flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [proPlayerInfo ? (_jsxs(Link, { to: `/players/${proPlayerInfo.slug}`, className: "group/talent flex items-center gap-1.5 cursor-clicker", children: [proPlayerInfo.team && proTeamLogo && _jsx(TeamLogo, { src: proTeamLogo, className: "w-4 h-4 object-contain" }), proPlayerInfo.team && (_jsx("span", { className: "font-chakrapetch text-[12px] font-semibold uppercase tracking-[0.1em] text-jade/80", children: proPlayerInfo.team })), proPlayerInfo.team && _jsx("span", { className: "text-jade/35 text-[9px]", children: "\u25C6" }), _jsx("span", { className: "font-chakrapetch text-[13px] font-bold text-flash/95 tracking-wide transition-colors group-hover/talent:text-jade", children: proPlayerInfo.nickname || proPlayerInfo.username.split("#")[0] }), _jsx("span", { className: "text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide", style: { background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }, children: "PRO" })] })) : streamerInfo ? (_jsxs(Link, { to: `/players/${streamerInfo.slug}`, className: "group/talent flex items-center gap-1.5 cursor-clicker", children: [_jsx("span", { className: "text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide", style: { background: "linear-gradient(135deg, #7b42a1, #a855c7)", color: "#e0d0f0" }, children: "STRM" }), _jsx("span", { className: "font-chakrapetch text-[13px] font-bold text-flash/95 tracking-wide transition-colors group-hover/talent:text-jade", children: streamerInfo.twitch_login })] })) : (_jsxs(_Fragment, { children: [isPro && (_jsx("span", { className: "text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide", style: { background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }, children: "PRO" })), isStreamer && (_jsx("span", { className: "text-[8px] font-black px-[5px] py-[2px] rounded-[3px] tracking-wide", style: { background: "linear-gradient(135deg, #7b42a1, #a855c7)", color: "#e0d0f0" }, children: "STR" }))] })), linkedDiscord && (_jsxs("span", { className: "flex items-center gap-1.5 text-[12px] font-mono text-[#7289da]/60", children: [_jsx("svg", { width: "14", height: "14", viewBox: "0 0 16 16", fill: "currentColor", children: _jsx("path", { d: "M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" }) }), linkedDiscord.discord_username] }))] }), _jsx("div", { className: "cursor-clicker", title: "Click to copy", onClick: () => {
                                                                if (!summonerInfo)
                                                                    return;
                                                                const riotId = `${summonerInfo.name}#${summonerInfo.tag}`;
                                                                navigator.clipboard.writeText(riotId);
                                                                showCyberToast({ title: "Summoner name copied", description: riotId });
                                                            }, children: !summonerInfo ? (_jsx(Skeleton, { className: "h-8 w-[200px] bg-filmlight/10" })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: cn("font-bold font-chakrapetch text-flash tracking-wide leading-none", (summonerInfo.name?.length || 0) > 14 ? "text-[18px]" : (summonerInfo.name?.length || 0) > 10 ? "text-[22px]" : "text-[26px]"), children: summonerInfo.name }), summonerInfo.tag && (_jsxs("span", { className: "text-[18px] font-chakrapetch text-flash/30 ml-1", children: ["#", summonerInfo.tag] }))] })) }), _jsxs("div", { className: "flex min-h-[18px] items-center gap-2 font-mono text-[12px]", children: [summonerInfo?.peakRank && summonerInfo.peakRank.toLowerCase() !== "unranked" && (_jsxs("span", { className: "inline-flex items-center gap-1.5 rounded-[3px] bg-flash/[0.06] px-1.5 py-[2px] leading-none", children: [_jsx("span", { className: "text-[9px] uppercase tracking-[0.14em] text-citrine/60", children: "Peak" }), _jsx("span", { className: "text-[11px] font-semibold text-flash/70", children: summonerInfo.peakRank }), summonerInfo.peakLp != null && (_jsxs("span", { className: "text-[11px] text-flash/40 tabular-nums", children: [summonerInfo.peakLp, " LP"] }))] })), summonerInfo?.ladderRank && (_jsxs("span", { className: "tracking-[0.08em] text-jade/50", children: ["Rank #", summonerInfo.ladderRank.toLocaleString()] }))] }), _jsxs("div", { className: "flex items-center gap-2 mt-1", children: [_jsx(UpdateButton, { onClick: () => refreshData(true), loading: refreshing, cooldown: onCooldown, cooldownSeconds: cooldownSeconds }), summonerInfo?.puuid && region && (_jsx(PlayerAnalysisDialog, { puuid: summonerInfo.puuid, region: region, summonerName: summonerInfo?.name ?? name ?? "Unknown", externalOpen: analyzeOpen, onExternalOpenChange: setAnalyzeOpen }))] })] })] }) })] }), (() => {
                                const wins = summonerInfo?.wins ?? 0;
                                const losses = summonerInfo?.losses ?? 0;
                                const totalGames = wins + losses;
                                const winrate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
                                return (_jsxs("div", { className: "lg:hidden flex items-center gap-4 mt-1 lg:mt-4 px-1", children: [_jsxs("div", { children: [_jsx("span", { className: "text-jade text-2xl font-chakrapetch font-bold tabular-nums", children: wins }), _jsx("span", { className: "ml-1 text-[10px] uppercase tracking-wider text-flash/40", children: "Wins" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-[#b11315] text-2xl font-chakrapetch font-bold tabular-nums", children: losses }), _jsx("span", { className: "ml-1 text-[10px] uppercase tracking-wider text-flash/40", children: "Losses" })] }), _jsxs("div", { className: "ml-auto", children: [_jsxs("span", { className: cn("text-2xl font-chakrapetch font-bold tabular-nums", getWinrateClass(winrate, totalGames)), children: [winrate, "%"] }), _jsx("span", { className: "ml-1 text-[10px] uppercase tracking-wider text-flash/40", children: "WR" })] })] }));
                            })(), _jsxs("div", { className: "w-full mt-4", children: [_jsxs("div", { className: cn(glassDark, "hidden lg:flex items-center gap-1.5 p-1"), children: [_jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { className: cn("group font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase px-3 h-6 rounded-[5px] transition-all duration-200 cursor-clicker flex w-32 items-center justify-center gap-1.5", selectedQueue !== "All"
                                                            ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                                                            : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]"), children: [selectedQueue === "All" ? "Queue" : selectedQueue === "Ranked Solo/Duo" ? "Solo/Duo" : "Flex", _jsx(ChevronDown, { className: "h-3.5 w-3.5" })] }), _jsx(DropdownMenuContent, { align: "start", className: "w-48 text-sm bg-filmdark/95 backdrop-blur-xl border-hairline/10", children: ["All", "Ranked Solo/Duo", "Ranked Flex"].map((queue) => (_jsx(DropdownMenuItem, { onClick: () => setSelectedQueue(queue), className: cn("cursor-clicker uppercase font-mono text-[11px] tracking-[0.1em]", selectedQueue === queue ? "text-jade font-semibold" : "text-flash/50"), children: queue }, queue))) })] }), _jsx("div", { className: cn("font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase px-3 rounded-[5px] transition-all duration-200 cursor-clicker flex w-32 items-center justify-center gap-1.5 h-6", selectedChampion
                                                    ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                                                    : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]"), children: _jsx(ChampionPicker, { champions: allChampions, selectedChampion: selectedChampion, onSelect: (champName) => setSelectedChampion(champName), triggerClassName: "!text-[10px] !tracking-[0.15em] !font-chakrapetch !font-semibold" }) }), _jsx("div", { className: "flex items-center gap-0.5 rounded-md bg-filmdark/30 p-0.5", children: [
                                                    { value: null, label: "Role", icon: null },
                                                    { value: "TOP", label: "Top", icon: _jsx(RoleTopIcon, { className: "w-4 h-4" }) },
                                                    { value: "JUNGLE", label: "Jng", icon: _jsx(RoleJungleIcon, { className: "w-4 h-4" }) },
                                                    { value: "MIDDLE", label: "Mid", icon: _jsx(RoleMidIcon, { className: "w-4 h-4" }) },
                                                    { value: "BOTTOM", label: "Adc", icon: _jsx(RoleAdcIcon, { className: "w-4 h-4" }) },
                                                    { value: "UTILITY", label: "Sup", icon: _jsx(RoleSupportIcon, { className: "w-4 h-4" }) },
                                                ].map((role, i, arr) => (_jsx("button", { type: "button", onClick: () => setSelectedRole(role.value === selectedRole ? null : role.value), className: cn("font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase min-w-[30px] px-2 h-6 rounded-[5px] transition-all duration-200 cursor-clicker flex items-center justify-center", (role.value === null ? selectedRole === null : selectedRole === role.value)
                                                        ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                                                        : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]"), children: role.icon ?? role.label }, role.label))) }), _jsx("div", { className: "flex items-center gap-0.5 rounded-md bg-filmdark/30 p-0.5 ml-auto", children: ([
                                                    { value: "all", label: "All" },
                                                    { value: "wins", label: "W" },
                                                    { value: "losses", label: "L" },
                                                ]).map((opt, i, arr) => (_jsx("button", { type: "button", onClick: () => setSelectedResult(opt.value), className: cn("font-chakrapetch font-semibold text-[10px] tracking-[0.13em] uppercase px-2.5 h-6 rounded-[5px] transition-all duration-200 cursor-clicker flex items-center justify-center min-w-[30px]", selectedResult === opt.value
                                                        ? "bg-jade/[0.14] text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.32)]"
                                                        : "text-flash/50 hover:text-flash/80 hover:bg-filmlight/[0.05]"), children: opt.label }, opt.value))) })] }), !statsBarHidden && !loading && !isIngesting && filteredMatches.length > 0 && (() => {
                                        const puuid = summonerInfo?.puuid;
                                        const stats = filteredMatches.reduce((acc, m) => {
                                            const me = m.match.info.participants.find((p) => p.puuid === puuid);
                                            if (!me)
                                                return acc;
                                            acc.wins += m.win ? 1 : 0;
                                            acc.losses += m.win ? 0 : 1;
                                            acc.kills += me.kills ?? 0;
                                            acc.deaths += me.deaths ?? 0;
                                            acc.assists += me.assists ?? 0;
                                            acc.cs += (me.totalMinionsKilled ?? 0) + (me.neutralMinionsKilled ?? 0);
                                            acc.damage += me.totalDamageDealtToChampions ?? 0;
                                            acc.vision += me.visionScore ?? 0;
                                            acc.durationMin += (m.match.info.gameDuration ?? 0) / 60;
                                            // Team total kills for KP
                                            const teamId = me.teamId;
                                            const teamKills = m.match.info.participants
                                                .filter((p) => p.teamId === teamId)
                                                .reduce((sum, p) => sum + (p.kills ?? 0), 0);
                                            acc.teamKills += teamKills;
                                            acc.count++;
                                            return acc;
                                        }, { wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, cs: 0, damage: 0, vision: 0, durationMin: 0, teamKills: 0, count: 0 });
                                        const n = stats.count || 1;
                                        const wr = Math.round((stats.wins / (stats.wins + stats.losses || 1)) * 100);
                                        const avgK = (stats.kills / n).toFixed(1);
                                        const avgD = (stats.deaths / n).toFixed(1);
                                        const avgA = (stats.assists / n).toFixed(1);
                                        const kda = stats.deaths === 0 ? "Perfect" : ((stats.kills + stats.assists) / stats.deaths).toFixed(2);
                                        const csMin = stats.durationMin > 0 ? (stats.cs / stats.durationMin).toFixed(1) : "0";
                                        const avgDmg = Math.round(stats.damage / n).toLocaleString();
                                        const avgVis = (stats.vision / n).toFixed(1);
                                        const kp = stats.teamKills > 0 ? Math.round(((stats.kills + stats.assists) / stats.teamKills) * 100) : 0;
                                        // KDA quality colour (reused for the KDA tile) + win-rate colour
                                        const kdaNum = stats.deaths === 0 ? 99 : (stats.kills + stats.assists) / stats.deaths;
                                        const kdaColor = kdaNum >= 4 ? "text-jade" : kdaNum >= 3 ? "text-amber-400" : kdaNum >= 2 ? "text-flash/75" : "text-rose-400";
                                        const wrColor = getWinrateClass(wr, stats.wins + stats.losses);
                                        // Collect the enabled stat tiles
                                        const tiles = [];
                                        if (visibleStats.kda)
                                            tiles.push({
                                                label: "KDA",
                                                value: kda,
                                                color: kdaColor,
                                                sub: (_jsxs(_Fragment, { children: [avgK, _jsx("span", { className: "text-flash/20", children: " / " }), _jsx("span", { className: "text-rose-400/55", children: avgD }), _jsx("span", { className: "text-flash/20", children: " / " }), avgA] })),
                                            });
                                        if (visibleStats.kp)
                                            tiles.push({ label: "KP", value: `${kp}%` });
                                        if (visibleStats.csm)
                                            tiles.push({ label: "CS/M", value: csMin });
                                        if (visibleStats.dmg)
                                            tiles.push({ label: "DMG", value: avgDmg });
                                        if (visibleStats.vis)
                                            tiles.push({ label: "VIS", value: avgVis });
                                        return (_jsxs("div", { className: cn(glassDark, "mt-3 hidden lg:block"), children: [_jsxs("div", { className: "flex items-center gap-2 px-4 pt-2.5", children: [_jsx("span", { className: "h-[5px] w-[5px] rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.8)]" }), _jsxs("span", { className: "text-[9px] font-chakrapetch uppercase tracking-[0.24em] text-flash/40 leading-none", children: ["Last ", stats.count, " Games"] }), _jsx("span", { className: "flex-1 h-px bg-gradient-to-r from-flash/10 via-flash/[0.04] to-transparent" })] }), _jsxs("div", { className: "flex items-center gap-5 px-4 py-3", children: [_jsxs("div", { className: "flex flex-col gap-1.5 shrink-0 w-[150px] pr-5 border-r border-flash/[0.06]", children: [_jsxs("div", { className: "flex items-baseline gap-2", children: [_jsxs("span", { className: cn("text-[26px] font-chakrapetch font-bold tabular-nums leading-none", wrColor), children: [wr, "%"] }), _jsx("span", { className: "text-[8px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch", children: "Win Rate" })] }), _jsxs("div", { className: "flex h-1.5 w-full overflow-hidden rounded-full bg-filmdark/40", children: [_jsx("div", { className: "h-full bg-jade shadow-[0_0_8px_rgba(0,217,146,0.45)]", style: { width: `${wr}%` } }), _jsx("div", { className: "h-full bg-[#b11315]/55", style: { width: `${100 - wr}%` } })] }), _jsxs("div", { className: "flex items-center justify-between leading-none", children: [_jsxs("span", { className: "text-jade text-[11px] font-chakrapetch font-bold tabular-nums", children: [stats.wins, _jsx("span", { className: "text-flash/30 ml-0.5", children: "W" })] }), _jsxs("span", { className: "text-[#e0686a] text-[11px] font-chakrapetch font-bold tabular-nums", children: [stats.losses, _jsx("span", { className: "text-flash/30 ml-0.5", children: "L" })] })] })] }), tiles.length > 0 && (_jsx("div", { className: "flex-1 flex items-center justify-between", children: tiles.map((t, i) => (_jsxs(React.Fragment, { children: [i > 0 && _jsx("span", { className: "w-px h-8 bg-flash/[0.06]" }), _jsxs("div", { className: "flex flex-1 flex-col items-center justify-center gap-1 px-1", children: [_jsx("span", { className: cn("text-[17px] font-chakrapetch font-bold tabular-nums leading-none", t.color ?? "text-flash/85"), children: t.value }), t.sub && (_jsx("span", { className: "text-[8px] text-flash/35 tabular-nums font-chakrapetch leading-none", children: t.sub })), _jsx("span", { className: "text-[8px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch leading-none", children: t.label })] })] }, t.label))) }))] })] }));
                                    })(), loading || isIngesting ? (_jsxs("ul", { className: "space-y-3 mt-4", children: [isIngesting && !loading && (_jsxs("div", { className: "text-center py-4 mb-2", children: [_jsx("div", { className: "text-flash/60 text-sm font-mono animate-pulse", children: "Fetching match history for the first time..." }), _jsx("div", { className: "text-flash/30 text-xs mt-1", children: "This may take a moment" })] })), Array.from({ length: 10 }).map((_, idx) => (_jsxs("li", { className: cn("flex items-center gap-4 p-3 rounded-md h-28", 
                                                // same resting surface as the real (ungrouped) match cards
                                                "bg-filmdark/18 backdrop-blur-lg saturate-150 glass-panel"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/profileicon/29.png`, alt: "", className: "w-12 h-12 rounded-md opacity-15 animate-pulse" }), _jsxs("div", { className: "flex flex-col gap-2 w-full", children: [_jsx(Skeleton, { className: "h-4 w-1/2 bg-filmlight/10" }), _jsx(Skeleton, { className: "h-4 w-1/3 bg-filmlight/10" })] })] }, idx)))] })) : filteredMatches.length === 0 ? (_jsx(Error404, {})) : (_jsxs("div", { ref: listRef, className: "theme-dark bg-liquirice text-flash space-y-1 mt-4 rounded-lg pb-2", children: [(matchGroupingDisabled
                                                ? [["all", filteredMatches]]
                                                : [...groupedByDay.entries()]).map(([dayKey, rows]) => {
                                                const wins = rows.filter(r => r.win).length;
                                                const losses = rows.length - wins;
                                                const wr = rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0;
                                                const totalSeconds = rows.reduce((acc, r) => acc + (r.match.info.gameDuration || 0), 0);
                                                const playedLabel = formatPlayedTime(totalSeconds);
                                                return (_jsxs("section", { className: "space-y-1", children: [!matchGroupingDisabled && (_jsxs("div", { className: "flex items-center justify-between px-4 py-2.5 rounded-md mt-3 text-xs", children: [_jsx("div", { className: "uppercase text-flash/70 tracking-[0.12em] font-mono font-medium text-[12px]", children: dayLabelFromKey(dayKey) }), _jsxs("div", { className: "flex items-center gap-3 font-semibold", children: [wins > 0 && _jsxs("span", { className: "text-jade", children: [wins, "W"] }), losses > 0 && _jsxs("span", { className: "text-[#b11315]", children: [losses, "L"] }), wins > 0 && losses > 0 && _jsxs("span", { className: getWinrateClass(wr, rows.length), children: [wr, "% WR"] }), _jsx(Separator, { orientation: "vertical", className: "hidden lg:block h-4 bg-flash/20" }), _jsx("span", { className: "hidden lg:inline text-flash/70 uppercase", children: playedLabel })] })] })), _jsx("ul", { className: "flex flex-col gap-1", children: rows.map((row) => {
                                                                const { match, win, championName, lpDelta } = row;
                                                                const queueId = match.info.queueId;
                                                                const queueLabel = queueTypeMap[queueId] || "Unknown Queue";
                                                                const participants = match.info.participants;
                                                                const team1 = participants.filter(p => p.teamId === 100);
                                                                const team2 = participants.filter(p => p.teamId === 200);
                                                                const itemKeys = ["item0", "item1", "item2", "item3", "item4", "item5"];
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
                                                                const kda = participant && participant.deaths === 0 && (participant.kills + participant.assists) > 0
                                                                    ? "Perfect"
                                                                    : participant && participant.deaths > 0
                                                                        ? (participant.kills + participant.assists) / participant.deaths
                                                                        : 0;
                                                                const isSelfMvpOrAce = !!summonerInfo?.puuid &&
                                                                    (summonerInfo.puuid === mvpWin || summonerInfo.puuid === mvpLose);
                                                                const isRemake = match.info.gameDuration < 300;
                                                                const matchTs = getMatchTimestamp(match.info);
                                                                return (_jsxs("div", { className: cn(expandedMatchId === match.metadata.matchId
                                                                        ? "match-card-expanded"
                                                                        : clickToExpand ? "match-card-collapsed" : "match-card-group", freshMatchIds.has(match.metadata.matchId) && "sp-new-match"), onClick: (e) => {
                                                                        // Don't toggle if clicking a button/link inside
                                                                        if (e.target.closest("button, a"))
                                                                            return;
                                                                        const id = match.metadata.matchId;
                                                                        if (expandedMatchId === id) {
                                                                            // play the collapse animation, then unmount
                                                                            setExpandedMatchId(null);
                                                                            setClosingMatchId(id);
                                                                            window.setTimeout(() => setClosingMatchId(c => (c === id ? null : c)), 320);
                                                                        }
                                                                        else {
                                                                            setExpandedMatchId(id);
                                                                        }
                                                                    }, children: [_jsxs("li", { 
                                                                            // Drives the chamfer outline, the hover sheen and
                                                                            // the win/loss rail from one value instead of a
                                                                            // four-way branch in every rule.
                                                                            style: {
                                                                                ["--mc-accent"]: isRemake
                                                                                    ? "245,166,35"
                                                                                    : win
                                                                                        ? (blueWinTint ? "91,168,230" : "0,209,141")
                                                                                        : "201,50,50",
                                                                            }, className: cn("mc-card relative z-[2] overflow-hidden rounded-md p-2 text-flash cursor-clicker", 
                                                                            // Win/loss backgrounds: no more flat green/red slabs — a deep,
                                                                            // desaturated wash that's strongest at the coloured left border
                                                                            // and dies into neutral glass within ~40% of the card (dpm-style
                                                                            // tint: the card stays dark, the colour just breathes off the edge).
                                                                            isRemake
                                                                                ? "bg-filmdark/30 backdrop-blur-lg saturate-150 glass-panel"
                                                                                : coloredMatchBg
                                                                                    ? win
                                                                                        ? (blueWinTint
                                                                                            ? "bg-filmlight/[0.045] bg-[linear-gradient(90deg,rgba(91,168,230,0.11),rgba(91,168,230,0.045)_45%,rgba(91,168,230,0.018)_100%)] backdrop-blur-lg"
                                                                                            : "bg-filmlight/[0.045] bg-[linear-gradient(90deg,rgba(0,209,141,0.10),rgba(0,209,141,0.04)_45%,rgba(0,209,141,0.016)_100%)] backdrop-blur-lg")
                                                                                        : "bg-filmlight/[0.045] bg-[linear-gradient(90deg,rgba(201,50,50,0.10),rgba(201,50,50,0.04)_45%,rgba(201,50,50,0.016)_100%)] backdrop-blur-lg"
                                                                                    : "bg-filmdark/18 backdrop-blur-lg saturate-150 glass-panel", "shadow-[0_10px_30px_rgba(var(--c-shadow),0.60),inset_0_0_0_0.35px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]", "hover:shadow-[0_14px_40px_rgba(var(--c-shadow),0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]", isRemake && "hover:bg-filmdark/35"), ...(contextMenuMode ? {
                                                                                onContextMenu: (e) => {
                                                                                    e.preventDefault();
                                                                                    setMatchCtxMenu({ x: e.clientX, y: e.clientY, matchId, isJungler });
                                                                                }
                                                                            } : {}), children: [isRemake && (_jsxs(_Fragment, { children: [_jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] opacity-[0.07]", style: {
                                                                                                backgroundImage: "repeating-linear-gradient(-45deg, #f5a623 0px, #f5a623 8px, transparent 8px, transparent 20px)",
                                                                                            } }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] rounded-md shadow-[inset_0_0_0_1px_rgba(245,166,35,0.15)]" })] })), ((!win && lpDelta === 0) || (win && typeof lpDelta === "number" && lpDelta >= 35)) && (_jsx("img", { src: doubleLpBadgeUrl(), alt: "", "aria-hidden": true, className: "pointer-events-none select-none absolute top-1/2 -translate-y-1/2 right-0 translate-x-[8%] h-[150%] w-auto z-[1] opacity-[0.18]", style: { filter: "saturate(0.85) brightness(1.05) drop-shadow(0 0 18px rgba(255,182,21,0.18))" } })), _jsx("div", { className: cn("pointer-events-none absolute -top-28 left-0 h-60 w-full z-[1]", isRemake
                                                                                        ? "bg-[radial-gradient(circle_at_18%_18%,rgba(245,166,35,0.03),rgba(255,255,255,0)_72%)]"
                                                                                        : "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.018),rgba(255,255,255,0)_72%)]") }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" }), _jsx("div", { className: "flex items-center justify-center h-full relative z-10", children: _jsxs("div", { className: "w-full", children: [isSelfMvpOrAce && !coloredMatchBg && (_jsx("div", { className: "absolute inset-0 z-0 mvpAceGlow", style: { ['--glow-blue']: '#0058ff', ['--glow-mint']: '#9fffc3' } })), _jsx("div", { className: "absolute left-0 top-0 z-10 h-full w-[2px]", style: {
                                                                                                    background: "rgb(var(--mc-accent))",
                                                                                                    boxShadow: "0 0 9px rgba(var(--mc-accent),0.45)",
                                                                                                    opacity: 0.8,
                                                                                                } }), _jsx("div", { className: "absolute left-0 top-0 z-10 h-6 w-[2px]", style: {
                                                                                                    background: "rgb(var(--mc-accent))",
                                                                                                    boxShadow: "0 0 14px rgba(var(--mc-accent),0.85)",
                                                                                                } }), _jsx("div", { className: "relative z-10 ml-2", children: _jsxs("div", { className: "ml-2", children: [_jsxs("div", { className: "relative flex justify-between text-[11px] uppercase text-flash/70", children: [_jsxs("span", { className: "relative z-20 flex items-center gap-2", children: [_jsx("span", { children: queueLabel }), _jsx("span", { className: cn("px-0.5 py-[1px] rounded-sm text-[11px] font-medium border border-transparent", isRemake
                                                                                                                                ? "text-[#f5a623]"
                                                                                                                                : win ? (blueWinTint ? "text-[#5BA8E6]" : "text-[#00D992]") : "text-[#d63336]"), children: isRemake ? "REMAKE" : win ? "WIN" : "LOSS" })] }), _jsxs("span", { className: "absolute left-1/2 transform -translate-x-1/2 z-20", children: [Math.floor(match.info.gameDuration / 60), ":", (match.info.gameDuration % 60).toString().padStart(2, "0")] }), _jsx("span", { className: "relative z-20", children: timeAgo(match.info.gameEndTimestamp ??
                                                                                                                        match.info.gameStartTimestamp ??
                                                                                                                        match.info.gameCreation) })] }), _jsxs("div", { className: "relative z-40 mt-2.5 flex w-full items-center justify-between gap-3 lg:gap-5", children: [_jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [_jsxs("div", { className: "relative h-[52px] w-[52px]", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(championName)}.png`, alt: championName, className: "h-[52px] w-[52px] rounded-md" }), participant?.champLevel && (_jsx("div", { className: "absolute -bottom-1 -right-1 rounded-sm bg-black/80 px-1.5 py-0.5 font-geist text-[10px] text-white shadow", children: participant.champLevel })), _jsx(MvpAceBadge, { puuid: summonerInfo?.puuid, mvpWin: mvpWin, mvpLose: mvpLose })] }), participant && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("img", { src: summonerSpellUrl(participant.summoner1Id), alt: "Spell 1", className: "h-6 w-6 rounded-sm" }), _jsx("img", { src: summonerSpellUrl(participant.summoner2Id), alt: "Spell 2", className: "h-6 w-6 rounded-sm" })] }), participant.perks?.styles && participant.perks.styles.length >= 2 && (_jsxs("div", { className: "grid grid-rows-2 gap-0.5", children: [(() => {
                                                                                                                                            const keystoneId = participant.perks.styles[0]?.selections?.[0]?.perk;
                                                                                                                                            const keystoneSrc = keystoneId ? getKeystoneIcon(keystoneId) : null;
                                                                                                                                            const keystoneName = keystoneId ? getKeystoneName(keystoneId) : null;
                                                                                                                                            return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "flex h-6 w-6 items-center justify-center rounded-full bg-black/60", children: keystoneSrc && _jsx("img", { src: keystoneSrc, alt: keystoneName ?? "Keystone", className: "h-5 w-5 rounded-full" }) }) }), keystoneName && _jsx(TooltipContent, { side: "top", className: "text-xs", children: keystoneName })] }) }));
                                                                                                                                        })(), (() => {
                                                                                                                                            const subStyleId = participant.perks.styles[1]?.style;
                                                                                                                                            const subStyleSrc = subStyleId ? getStyleIcon(subStyleId) : null;
                                                                                                                                            const subStyleName = subStyleId ? getStyleName(subStyleId) : null;
                                                                                                                                            return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "flex h-6 w-6 items-center justify-center rounded-full bg-black/60", children: subStyleSrc && _jsx("img", { src: subStyleSrc, alt: subStyleName ?? "Secondary", className: "h-5 w-5 rounded-full opacity-70" }) }) }), subStyleName && _jsx(TooltipContent, { side: "top", className: "text-xs", children: subStyleName })] }) }));
                                                                                                                                        })()] }))] }))] }), _jsxs("div", { className: "flex min-w-[104px] shrink-0 flex-col items-center leading-none", children: [(() => {
                                                                                                                            const isPerfect = kda === "Perfect";
                                                                                                                            return (_jsxs("div", { className: "flex items-baseline font-chakrapetch text-[18px] font-bold tabular-nums tracking-wide", children: [_jsx("span", { className: "text-flash/95", children: participant?.kills }), _jsx("span", { className: "mx-1.5 text-[13px] text-flash/25", children: "/" }), _jsx("span", { className: isPerfect ? "text-jade" : "text-flash/50", children: participant?.deaths }), _jsx("span", { className: "mx-1.5 text-[13px] text-flash/25", children: "/" }), _jsx("span", { className: "text-flash/95", children: participant?.assists })] }));
                                                                                                                        })(), _jsxs("span", { className: "mt-1.5 font-jetbrains text-[9.5px] tabular-nums tracking-[0.14em] text-flash/45", children: [typeof kda === "number" ? kda.toFixed(2) : kda, _jsx("span", { className: "ml-1 uppercase text-flash/30", children: "KDA" })] }), typeof lpDelta === "number" && (_jsxs("span", { className: cn("mt-1 font-chakrapetch text-[12px] font-bold tabular-nums", lpDelta > 0 ? "text-[#00D992]" : lpDelta < 0 ? "text-[#d63336]" : "text-flash/55"), children: [lpDelta > 0 ? "+" : "", lpDelta, " LP"] }))] }), _jsxs("div", { className: "hidden shrink-0 items-center gap-5 lg:flex", children: [participant && (() => {
                                                                                                                            const cs = (participant.totalMinionsKilled ?? 0) + (participant.neutralMinionsKilled ?? 0);
                                                                                                                            const minutes = match.info.gameDuration > 0 ? match.info.gameDuration / 60 : 0;
                                                                                                                            const csPerMin = minutes > 0 ? cs / minutes : 0;
                                                                                                                            const roleUpper = (playerRole ?? "").toUpperCase();
                                                                                                                            const support = roleUpper === "UTILITY" || roleUpper === "SUPPORT" || roleUpper === "SUP";
                                                                                                                            void support;
                                                                                                                            const csValueClass = "text-flash/75";
                                                                                                                            const csGlow = undefined;
                                                                                                                            const csPerMinStr = csPerMin.toFixed(1).replace(".", ",");
                                                                                                                            const goldStr = participant.goldEarned != null ? Math.round(participant.goldEarned).toLocaleString("en-US") : null;
                                                                                                                            return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: "flex cursor-default flex-col leading-tight tabular-nums", children: [_jsx("span", { className: cn("font-chakrapetch text-[13px] font-bold", csValueClass), style: csGlow, children: cs }), _jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.18em] text-flash/30", children: "CS" })] }) }), _jsx(TooltipContent, { side: "top", className: "bg-liquirice/80 text-xs", children: _jsxs("div", { className: "flex flex-col items-center gap-1.5 py-0.5", children: [_jsxs("span", { className: "tabular-nums", children: [csPerMinStr, " cs per minute"] }), goldStr && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-px w-full bg-flash/20" }), _jsxs("span", { className: "tabular-nums", children: [goldStr, " gold"] })] }))] }) })] }) }));
                                                                                                                        })(), participant && (() => {
                                                                                                                            const team = participant.teamId === 100 ? team1 : team2;
                                                                                                                            const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
                                                                                                                            const kp = teamKills > 0 ? Math.round(((participant.kills + participant.assists) / teamKills) * 100) : 0;
                                                                                                                            const kpValueClass = "text-flash/75";
                                                                                                                            return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: "flex cursor-default flex-col leading-tight tabular-nums", children: [_jsxs("span", { className: cn("font-chakrapetch text-[13px] font-bold", kpValueClass), children: [kp, "%"] }), _jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.18em] text-flash/30", children: "KP" })] }) }), _jsx(TooltipContent, { side: "top", className: "bg-liquirice/80 text-xs", children: _jsxs("span", { className: "tabular-nums", children: [kp, "% kill participation"] }) })] }) }));
                                                                                                                        })(), participant && (() => {
                                                                                                                            const dmg = participant.totalDamageDealtToChampions ?? 0;
                                                                                                                            const dmgStr = dmg >= 1000 ? `${(dmg / 1000).toFixed(1)}k` : String(dmg);
                                                                                                                            return (_jsxs("div", { className: "flex cursor-default flex-col leading-tight tabular-nums", title: `${dmg.toLocaleString("en-US")} damage to champions`, children: [_jsx("span", { className: "font-chakrapetch text-[13px] font-bold text-flash/75", children: dmgStr }), _jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.18em] text-flash/30", children: "DMG" })] }));
                                                                                                                        })()] }), participant && (_jsxs("div", { className: "flex shrink-0 items-center", children: [_jsx("div", { className: "grid grid-cols-3 grid-rows-2 gap-0.5 lg:flex lg:items-center lg:gap-1", children: itemKeys.map((key, index) => {
                                                                                                                                const itemId = participant[key];
                                                                                                                                return (_jsx("div", { className: "group relative h-6 w-6 rounded-sm border border-[#2B2A2B] bg-[#0f0f0f] lg:h-7 lg:w-7", children: typeof itemId === "number" && itemId > 0 && (_jsxs(_Fragment, { children: [_jsx(Link, { to: `/items/${itemId}`, className: "cursor-clicker", children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: `Item ${itemId}`, className: "h-full w-full rounded-sm" }) }), _jsx(AnimatedOutline, { rx: 2 })] })) }, index));
                                                                                                                            }) }), typeof participant.item6 === "number" && participant.item6 > 0 && (_jsx("div", { className: "ml-1.5 hidden items-center justify-center lg:flex", children: _jsxs(Link, { to: `/items/${participant.item6}`, className: "group relative block h-7 w-7 cursor-clicker", children: [_jsx("div", { className: "h-7 w-7 rounded-full bg-[#0f0f0f]", children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${participant.item6}.png`, alt: `Trinket ${participant.item6}`, className: "h-full w-full rounded-full" }) }), _jsx(AnimatedOutline, { rx: 14 })] }) }))] })), (() => {
                                                                                                                    if (!participant)
                                                                                                                        return null;
                                                                                                                    const myPos = (participant.teamPosition || participant.individualPosition || "").toUpperCase();
                                                                                                                    const enemies = participant.teamId === 100 ? team2 : team1;
                                                                                                                    const opp = myPos ? enemies.find((e) => ((e.teamPosition || e.individualPosition || "").toUpperCase()) === myPos) : null;
                                                                                                                    if (!opp)
                                                                                                                        return null;
                                                                                                                    // The lane is stamped on the portrait instead of
                                                                                                                    // spelled out underneath: the glyph already says
                                                                                                                    // "this is your opposite number in this role", and
                                                                                                                    // the label was costing a whole row of card height
                                                                                                                    // to repeat what the icon shows.
                                                                                                                    const laneMark = {
                                                                                                                        TOP: _jsx(RoleTopIcon, { className: "h-full w-full" }),
                                                                                                                        JUNGLE: _jsx(RoleJungleIcon, { className: "h-full w-full" }),
                                                                                                                        MIDDLE: _jsx(RoleMidIcon, { className: "h-full w-full" }),
                                                                                                                        BOTTOM: _jsx(RoleAdcIcon, { className: "h-full w-full" }),
                                                                                                                        UTILITY: _jsx(RoleSupportIcon, { className: "h-full w-full" }),
                                                                                                                    };
                                                                                                                    const mark = laneMark[myPos] ?? null;
                                                                                                                    return (_jsxs("div", { className: "relative hidden h-10 w-10 shrink-0 lg:block", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(opp.championName)}.png`, alt: opp.championName, title: opp.riotIdGameName ? `${opp.riotIdGameName}#${opp.riotIdTagline} · ${myPos.toLowerCase()}` : opp.championName, className: "h-10 w-10 rounded-[4px] ring-1 ring-flash/25 shadow-[0_2px_10px_rgba(0,0,0,0.5)]" }), _jsx(MvpAceBadge, { puuid: opp.puuid, mvpWin: mvpWin, mvpLose: mvpLose }), mark && (_jsx("span", { "aria-hidden": true, 
                                                                                                                                // Opaque disc rather than a bare glyph with a
                                                                                                                                // shadow: champion art runs from near-black to
                                                                                                                                // near-white, and at this size a shadowed
                                                                                                                                // outline still dissolved into the busy half of
                                                                                                                                // the splashes. The disc gives the icon a fixed
                                                                                                                                // ground, so it reads the same on every card.
                                                                                                                                className: "pointer-events-none absolute -right-[7px] -top-[7px] grid h-[19px] w-[19px] place-items-center rounded-full bg-liquirice shadow-[0_1px_5px_rgba(0,0,0,0.65)]", children: _jsx("span", { className: "h-[12px] w-[12px] text-flash/90", children: mark }) }))] }));
                                                                                                                })(), participant && (() => {
                                                                                                                    const all = match.info.participants;
                                                                                                                    const myImpact = computeImpact(participant, match.info);
                                                                                                                    const place = 1 + all.filter((p) => p.puuid !== participant.puuid && computeImpact(p, match.info) > myImpact).length;
                                                                                                                    const tone = impactTone(myImpact);
                                                                                                                    const color = tone === "jade" ? "#00d992" : tone === "citrine" ? "#FFB615" : "#9aa0a4";
                                                                                                                    const R = 21;
                                                                                                                    const CIRC = 2 * Math.PI * R;
                                                                                                                    const ordStr = place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`;
                                                                                                                    return (_jsxs("div", { className: "relative hidden h-[56px] w-[56px] shrink-0 lg:block", title: `IMPACT ${myImpact} - ${ordStr} of 10`, children: [_jsxs("svg", { viewBox: "0 0 56 56", className: "h-full w-full -rotate-90", children: [_jsx("circle", { cx: "28", cy: "28", r: R, fill: "none", stroke: "rgba(215,216,217,0.1)", strokeWidth: "3.5" }), _jsx("circle", { cx: "28", cy: "28", r: R, fill: "none", stroke: color, strokeWidth: "3.5", strokeLinecap: "round", strokeDasharray: `${(CIRC * myImpact) / 100} ${CIRC}`, style: { filter: `drop-shadow(0 0 6px ${color}66)` } })] }), _jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center leading-none", children: [_jsx("span", { className: "font-chakrapetch text-[15px] font-bold tabular-nums", style: { color }, children: myImpact }), _jsx("span", { className: "mt-[2px] font-jetbrains text-[7px] uppercase tracking-[0.12em] text-flash/40", children: ordStr })] })] }));
                                                                                                                })()] }), isJungler && analysisEntry?.open && (_jsxs("div", { className: "mt-1.5 pt-1.5 border-t border-flash/[0.07] flex items-center gap-3", children: [_jsx("span", { className: "text-[8px] font-mono text-flash/20 tracking-[0.2em] uppercase shrink-0", children: "Analysis" }), _jsx("div", { className: "flex items-center gap-1.5", children: analysisEntry.loading ? (_jsx("span", { className: "h-5 flex items-center px-2 font-mono text-[9px] text-flash/25 tracking-[0.1em] animate-pulse", children: "loading..." })) : (myJungleTag || myStartingCamp || myInvade === "invade") ? (_jsxs(_Fragment, { children: [myStartingCamp && _jsx(JungleStartingCampBadge, { camp: myStartingCamp }), myInvade && _jsx(JungleInvadeBadge, { invade: myInvade }), myJungleTag && _jsx(JunglePlaystyleBadge, { tag: myJungleTag, topsideCount: myTeamAnalysis?.topsideCount, botsideCount: myTeamAnalysis?.botsideCount })] })) : (_jsx("span", { className: "h-5 flex items-center px-2 font-mono text-[9px] text-flash/20 tracking-[0.1em]", children: "no data" })) })] }))] }) })] }) })] }), (expandedMatchId === match.metadata.matchId || closingMatchId === match.metadata.matchId) && (_jsx(MatchExpand, { match: match, mePuuid: summonerInfo?.puuid ?? "", region: region ?? "euw", closing: closingMatchId === match.metadata.matchId, proUsernames: proUsernames, streamerUsernames: streamerUsernames, proNames: proNames, streamerNames: streamerNames, actions: _jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => handleEnterMatch(matchId), className: "h-7 px-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase bg-filmlight/[0.05] ring-1 ring-white/[0.1] text-flash/65 hover:text-jade hover:ring-jade/40 hover:bg-jade/[0.08] transition-all duration-200 cursor-clicker", children: "VIEW" }), isJungler && (_jsx("button", { type: "button", onClick: () => fetchAnalysis(matchId), className: cn("h-7 px-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase ring-1 transition-all duration-200 cursor-clicker", analysisEntry?.open
                                                                                            ? "bg-jade/[0.12] text-jade ring-jade/40"
                                                                                            : "bg-filmlight/[0.05] ring-white/[0.1] text-flash/65 hover:text-jade hover:ring-jade/40 hover:bg-jade/[0.08]"), children: "SCAN" })), _jsx("button", { type: "button", className: "h-7 px-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase bg-filmlight/[0.05] ring-1 ring-white/[0.1] text-flash/65 hover:text-purple-300 hover:ring-purple-400/40 hover:bg-purple-500/[0.08] transition-all duration-200 cursor-clicker", onClick: () => {
                                                                                            const me = match.info.participants.find((p) => p.puuid === summonerInfo?.puuid);
                                                                                            const champName = me?.championName ?? "Unknown";
                                                                                            const kda = `${me?.kills ?? 0}/${me?.deaths ?? 0}/${me?.assists ?? 0}`;
                                                                                            const result = win ? "won" : "lost";
                                                                                            const prompt = `Analyze my ${champName} game where I went ${kda} and ${result}. Match ID: ${match.metadata.matchId}`;
                                                                                            navigate(`/learn?tab=ai&prompt=${encodeURIComponent(prompt)}`);
                                                                                        }, children: "ASK AI" }), _jsxs("button", { type: "button", onClick: () => setReplayMatch({ matchId, match }), className: "relative h-7 pl-6 pr-4 rounded-[3px] text-[9.5px] font-mono tracking-[0.15em] uppercase bg-jade/[0.14] text-jade ring-1 ring-jade/35 hover:bg-jade/[0.22] hover:ring-jade/60 transition-all duration-200 cursor-clicker", title: "Open the full match replay \u2014 every event on the map", children: [_jsx("span", { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-jade shadow-[0_0_4px_rgba(0,217,146,0.8)] animate-pulse" }), "REPLAY"] })] }) })), !contextMenuMode && expandedMatchId !== match.metadata.matchId && closingMatchId !== match.metadata.matchId && (_jsx("div", { className: "match-action-wrap", style: { marginTop: '-1px' }, children: _jsxs("div", { className: "match-action-tabs flex items-center justify-between px-4 py-1", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-[9px] font-mono text-flash/50 tabular-nums tracking-wider mt-0.5", children: [_jsx("span", { className: "text-jade/30", children: "\u25C8" }), matchTs ? new Date(matchTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""] }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("button", { type: "button", onClick: () => handleEnterMatch(matchId), className: "px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-flash/40 hover:text-jade border-b border-flash/10 hover:border-jade/40 bg-transparent hover:bg-jade/5 transition-all duration-200 cursor-clicker", children: "VIEW" }), isJungler && (_jsx("button", { type: "button", onClick: () => fetchAnalysis(matchId), className: cn("px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase border-b transition-all duration-200 cursor-clicker", analysisEntry?.open
                                                                                                    ? "text-jade border-jade/50 bg-jade/5"
                                                                                                    : "text-flash/40 border-flash/10 hover:text-jade hover:border-jade/40 hover:bg-jade/5"), children: "SCAN" })), _jsx("button", { type: "button", className: "px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-flash/40 hover:text-purple-400 border-b border-flash/10 hover:border-purple-400/40 bg-transparent hover:bg-purple-500/5 transition-all duration-200 cursor-clicker", onClick: () => {
                                                                                                    const me = match.info.participants.find((p) => p.puuid === summonerInfo?.puuid);
                                                                                                    const champName = me?.championName ?? "Unknown";
                                                                                                    const kda = `${me?.kills ?? 0}/${me?.deaths ?? 0}/${me?.assists ?? 0}`;
                                                                                                    const result = win ? "won" : "lost";
                                                                                                    const prompt = `Analyze my ${champName} game where I went ${kda} and ${result}. Match ID: ${match.metadata.matchId}`;
                                                                                                    navigate(`/learn?tab=ai&prompt=${encodeURIComponent(prompt)}`);
                                                                                                }, children: "ASK AI" }), _jsxs("button", { type: "button", onClick: () => setReplayMatch({ matchId, match }), className: "relative px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-jade/80 hover:text-jade border-b border-jade/30 hover:border-jade/70 bg-jade/[0.04] hover:bg-jade/[0.10] transition-all duration-200 cursor-clicker group/replay", title: "Open the full match replay \u2014 every event on the map", children: [_jsx("span", { className: "absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-jade shadow-[0_0_4px_rgba(0,217,146,0.8)] animate-pulse" }), _jsx("span", { className: "ml-2", children: "REPLAY" })] })] })] }) }))] }, match.metadata.matchId));
                                                            }) })] }, dayKey));
                                            }), _jsx("div", { className: "h-12 flex items-center justify-center", children: isLoadingMore ? (_jsx(LoadingSquares, {})) : hasMore && matches.length < 50 ? (_jsxs("button", { type: "button", onClick: loadMore, className: cn("group relative inline-flex items-center justify-center gap-1.5 h-8 px-6", "font-jetbrains text-[10px] tracking-[0.16em] uppercase", "bg-jade/30 hover:bg-jade/70 text-jade/85 hover:text-jade", "transition-all duration-300 cursor-clicker select-none"), style: { clipPath: "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)" }, children: [_jsx("span", { className: "pointer-events-none absolute inset-[1.5px] bg-[#081012] transition-colors duration-300", style: { clipPath: "polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)" } }), _jsx("span", { className: "pointer-events-none absolute inset-[1.5px] bg-jade/[0.06] group-hover:bg-jade/[0.12] transition-colors duration-300", style: { clipPath: "polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)" } }), _jsx("span", { className: "relative w-[5px] h-[5px] rotate-45 shrink-0 bg-jade/45 group-hover:bg-jade group-hover:shadow-[0_0_6px_rgba(0,217,146,0.9)] transition-all duration-300" }), _jsx("span", { className: "relative", children: "Load more" }), _jsxs("span", { className: "relative font-jetbrains text-[8.5px] text-jade/40 tracking-[0.1em] normal-case", children: [matches.length, "/50"] })] })) : matches.length >= 50 ? (_jsx("span", { className: "font-jetbrains text-[8.5px] tracking-[0.2em] uppercase text-flash/25", children: "\u25C8 latest 50 matches loaded" })) : null })] }))] })] }), _jsx("style", { children: `
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
        ` }), _jsx(AnimatePresence, { children: enteringMatchId && (_jsxs(motion.div, { className: "fixed inset-0 z-[9999] overflow-hidden pointer-events-all", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.12 }, children: [_jsx(motion.div, { className: "absolute inset-0 bg-[#020a06]", initial: { opacity: 0 }, animate: { opacity: 0.96 }, transition: { duration: 0.1 } }), Array.from({ length: 18 }).map((_, i) => (_jsx(motion.div, { className: "absolute left-0 right-0 h-px", style: { top: `${(i / 18) * 100}%`, background: i % 3 === 0 ? 'rgba(0,217,146,0.25)' : 'rgba(0,217,146,0.08)' }, initial: { scaleX: 0, opacity: 0, transformOrigin: 'left' }, animate: { scaleX: [0, 1, 1, 0], opacity: [0, 1, 0.5, 0] }, transition: { duration: 0.5, delay: i * 0.025, ease: 'easeOut' } }, i))), _jsx(motion.div, { className: "absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-jade to-transparent", initial: { top: '-2px' }, animate: { top: '100vh' }, transition: { duration: 0.55, ease: 'easeIn', delay: 0.05 } }), _jsx(motion.div, { className: "absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-jade/40 to-transparent", initial: { top: '-1px' }, animate: { top: '100vh' }, transition: { duration: 0.55, ease: 'easeIn', delay: 0.1 } }), [
                                    { corner: 'top-10 left-10', border: 'border-t-2 border-l-2', origin: '-translate-x-4 -translate-y-4' },
                                    { corner: 'top-10 right-10', border: 'border-t-2 border-r-2', origin: 'translate-x-4 -translate-y-4' },
                                    { corner: 'bottom-10 left-10', border: 'border-b-2 border-l-2', origin: '-translate-x-4 translate-y-4' },
                                    { corner: 'bottom-10 right-10', border: 'border-b-2 border-r-2', origin: 'translate-x-4 translate-y-4' },
                                ].map(({ corner, border, origin }, i) => (_jsx(motion.div, { className: `absolute ${corner} w-14 h-14 ${border} border-jade/70`, initial: { opacity: 0, transform: origin }, animate: { opacity: 1, transform: 'translate(0,0)' }, transition: { duration: 0.2, delay: 0.08 + i * 0.03, ease: 'easeOut' } }, i))), ['SYS://MATCH_LOAD', 'AUTH: OK', `PID: ${enteringMatchId.slice(-6)}`].map((txt, i) => (_jsx(motion.div, { className: "absolute left-12 font-mono text-[9px] text-jade/30 tracking-[0.2em]", style: { top: `${20 + i * 5}%` }, initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.15, delay: 0.2 + i * 0.06 }, children: txt }, i))), _jsxs(motion.div, { className: "absolute inset-0 flex flex-col items-center justify-center gap-5", initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.2, delay: 0.15 }, children: [_jsx(motion.div, { className: "text-jade text-4xl font-mono cyber-flicker", animate: { rotate: [0, 180, 360] }, transition: { duration: 0.9, ease: 'easeInOut' }, children: "\u25C8" }), _jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [_jsx("span", { className: "font-mono text-base tracking-[0.35em] uppercase text-jade cyber-glitch", children: "Entering Match" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] text-jade/30", children: enteringMatchId })] }), _jsx("div", { className: "w-64 h-[2px] bg-jade/10 rounded-full overflow-hidden", children: _jsx(motion.div, { className: "h-full bg-jade rounded-full", initial: { width: '0%' }, animate: { width: '100%' }, transition: { duration: 0.85, ease: 'easeInOut', delay: 0.1 } }) }), _jsx(motion.span, { className: "font-mono text-[9px] text-jade/30 tracking-[0.25em] uppercase cyber-flicker", initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.3 }, children: "Loading match data..." })] }), _jsx("div", { className: "absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" })] })) }), _jsx("div", { className: cn("fixed bottom-10 right-10 z-50 transition-all duration-300 ease-in-out", showScrollTop ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-3"), children: _jsx(DiamondButton, { icon: "top", label: "TOP", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }) })] }), showAdminDialog && createPortal(_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center", onClick: () => setShowAdminDialog(false), children: [_jsx("div", { className: "absolute inset-0 bg-black/75 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-[420px] rounded-md overflow-hidden bg-filmdark/95 backdrop-blur-xl saturate-150", style: {
                            animation: "dialogOpen 0.25s ease-out",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.7), inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.05)",
                        }, onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.04)_0%,transparent_60%)]" }), _jsxs("div", { className: "relative z-10 px-6 py-5 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-[14px] font-orbitron text-citrine/80 uppercase tracking-wider", children: "Admin Panel" }), _jsx("button", { type: "button", onClick: () => setShowAdminDialog(false), className: "text-flash/30 hover:text-flash/70 cursor-pointer", children: "\u2715" })] }), _jsxs("div", { className: "text-[11px] font-mono text-flash/40", children: ["Creating profile for: ", _jsxs("span", { className: "text-flash/70", children: [name, "#", tag] })] }), _jsx("div", { className: "flex gap-2", children: ["pro", "streamer"].map(t => (_jsx("button", { type: "button", onClick: () => setAdminType(t), className: cn("flex-1 py-2 text-[10px] font-orbitron uppercase tracking-[0.12em] rounded-[2px] border transition-all cursor-pointer", adminType === t ? "text-citrine border-citrine/30 bg-citrine/10" : "text-flash/25 border-flash/[0.06] hover:text-flash/40"), children: t }, t))) }), adminType === "pro" && (_jsxs("div", { className: "space-y-2", children: [_jsx("input", { value: adminFields.nickname, onChange: e => setAdminFields(f => ({ ...f, nickname: e.target.value })), placeholder: "Nickname (e.g. Caps)", className: "w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" }), _jsx("input", { value: adminFields.team, onChange: e => setAdminFields(f => ({ ...f, team: e.target.value })), placeholder: "Team (e.g. G2 Esports)", className: "w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { value: adminFields.firstName, onChange: e => setAdminFields(f => ({ ...f, firstName: e.target.value })), placeholder: "First name", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" }), _jsx("input", { value: adminFields.lastName, onChange: e => setAdminFields(f => ({ ...f, lastName: e.target.value })), placeholder: "Last name", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" })] }), _jsx("input", { value: adminFields.nationality, onChange: e => setAdminFields(f => ({ ...f, nationality: e.target.value })), placeholder: "Nationality (e.g. DK)", className: "w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" })] })), adminType === "streamer" && (_jsx("div", { className: "space-y-2", children: _jsx("input", { value: adminFields.twitchLogin, onChange: e => setAdminFields(f => ({ ...f, twitchLogin: e.target.value })), placeholder: "Twitch username", className: "w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50 placeholder:text-flash/15 focus:outline-none focus:border-citrine/20" }) })), _jsx("button", { type: "button", disabled: adminSaving, onClick: async () => {
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
                                                }
                                                else {
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
                                            }
                                            catch (e) {
                                                console.error("Admin save error:", e);
                                            }
                                            finally {
                                                setAdminSaving(false);
                                            }
                                        }, className: cn("w-full py-2.5 rounded-sm text-[10px] font-orbitron uppercase tracking-[0.15em] transition-all cursor-pointer", adminSaving ? "bg-citrine/5 text-citrine/20 border border-citrine/10" : "bg-citrine/15 text-citrine/80 border border-citrine/25 hover:bg-citrine/25"), children: adminSaving ? "Saving..." : `Create ${adminType} profile` })] })] }), _jsx("style", { children: `
            @keyframes dialogOpen {
              from { opacity: 0; transform: scale(0.95) translateY(8px); filter: blur(4px); }
              to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
            }
          ` })] }), document.body), _jsxs(AnimatePresence, { children: [ctxMenu && (_jsx(motion.div, { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 }, transition: { duration: 0.12, ease: "easeOut" }, className: "fixed z-50", style: {
                            top: ctxMenu.y + 200 > window.innerHeight ? ctxMenu.y - 180 : ctxMenu.y,
                            left: ctxMenu.x + 200 > window.innerWidth ? ctxMenu.x - 200 : ctxMenu.x,
                        }, children: _jsxs("div", { className: cn("min-w-[200px] py-1.5 rounded-sm overflow-hidden", "bg-black/80 backdrop-blur-xl border border-flash/[0.10]", "shadow-[0_10px_40px_rgba(var(--c-shadow),0.7),0_0_20px_rgba(0,217,146,0.05)]"), children: [_jsx("div", { className: "px-3 pt-1.5 pb-2 border-b border-flash/[0.06] mb-1", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1 h-3 bg-jade rounded-full" }), _jsx("span", { className: "font-mono text-[9px] tracking-[0.2em] text-jade/50 uppercase", children: summonerInfo?.name ?? name ?? "Player" })] }) }), [
                                    { icon: RotateCw, label: "Update Page", action: () => { refreshData(true); }, disabled: refreshing || onCooldown },
                                    { icon: Search, label: "Analyze Player", action: () => setAnalyzeOpen(true) },
                                    { icon: BarChart3, label: "Season Stats", action: () => navigate(`/summoners/${region}/${name.replace(/\s+/g, "+")}-${tag}/season`) },
                                ].map((item) => (_jsxs("button", { type: "button", disabled: item.disabled, onClick: (e) => { e.stopPropagation(); setCtxMenu(null); item.action(); }, className: cn("w-full flex items-center gap-3 px-3 py-2 transition-all duration-150", "font-mono text-[11px] tracking-[0.12em] uppercase", item.disabled
                                        ? "text-flash/15 cursor-not-allowed"
                                        : "text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker"), children: [_jsx(item.icon, { className: "w-3.5 h-3.5 flex-shrink-0" }), _jsx("span", { children: item.label })] }, item.label))), authSession && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mx-3 my-1 h-px bg-flash/[0.06]" }), _jsxs("button", { type: "button", onClick: (e) => {
                                                e.stopPropagation();
                                                setCtxMenu(null);
                                                navigate("/dashboard/preferences?highlight=summoner-page");
                                            }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker", children: [_jsx(SlidersHorizontal, { className: "w-3.5 h-3.5 flex-shrink-0" }), _jsx("span", { children: "Change Visualization" })] })] })), (linkedDiscord?.discord_username || summonerInfo?.name) && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mx-3 my-1 h-px bg-flash/[0.06]" }), _jsxs("button", { type: "button", onClick: (e) => {
                                                e.stopPropagation();
                                                setCtxMenu(null);
                                                const riotId = `${summonerInfo?.name ?? name}#${summonerInfo?.tag ?? tag}`;
                                                navigator.clipboard.writeText(riotId);
                                                showCyberToast({ title: "Riot ID copied" });
                                            }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker", children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-3.5 h-3.5 flex-shrink-0", children: _jsx("path", { d: "M13.458.86 0 7.093l3.353 12.761 2.552-.313-.701-8.024.838-.373 1.447 8.202 4.361-.535-.775-8.857.83-.37 1.591 9.025 4.412-.542-.849-9.708.84-.374 1.74 9.87L24 17.318V3.5Zm.316 19.356.222 1.256L24 23.14v-4.18l-10.22 1.256Z" }) }), _jsx("span", { children: "Copy Riot ID" })] }), linkedDiscord?.discord_username && (_jsxs("button", { type: "button", onClick: (e) => {
                                                e.stopPropagation();
                                                setCtxMenu(null);
                                                navigator.clipboard.writeText(linkedDiscord.discord_username);
                                                showCyberToast({ title: "Discord ID copied" });
                                            }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 16 16", fill: "currentColor", className: "w-3.5 h-3.5 flex-shrink-0", children: _jsx("path", { d: "M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" }) }), _jsx("span", { children: "Copy Discord" })] }))] })), premiumPlan && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mx-3 my-1 h-px bg-flash/[0.06]" }), _jsxs("button", { type: "button", onClick: (e) => {
                                                e.stopPropagation();
                                                setCtxMenu(null);
                                                setReportReason(null);
                                                setShowReportModal(true);
                                            }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-red-400 hover:bg-red-500/[0.06] cursor-clicker", children: [_jsx(Flag, { className: "w-3.5 h-3.5 flex-shrink-0" }), _jsx("span", { children: "Report Player" })] })] }))] }) })), matchCtxMenu && contextMenuMode && (_jsx(motion.div, { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 }, transition: { duration: 0.12, ease: "easeOut" }, className: "fixed z-50", style: {
                            top: matchCtxMenu.y + 160 > window.innerHeight ? matchCtxMenu.y - 140 : matchCtxMenu.y,
                            left: matchCtxMenu.x + 200 > window.innerWidth ? matchCtxMenu.x - 200 : matchCtxMenu.x,
                        }, children: _jsxs("div", { className: cn("min-w-[180px] py-1.5 rounded-sm overflow-hidden", "bg-black/80 backdrop-blur-xl border border-flash/[0.10]", "shadow-[0_10px_40px_rgba(var(--c-shadow),0.7),0_0_20px_rgba(0,217,146,0.05)]"), children: [_jsx("div", { className: "px-3 pt-1.5 pb-2 border-b border-flash/[0.06] mb-1", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1 h-3 bg-jade rounded-full" }), _jsx("span", { className: "font-mono text-[9px] tracking-[0.2em] text-jade/50 uppercase", children: "Match Actions" })] }) }), _jsxs("button", { type: "button", onClick: () => { handleEnterMatch(matchCtxMenu.matchId); setMatchCtxMenu(null); }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker", children: [_jsx(ChevronRight, { className: "w-3.5 h-3.5 flex-shrink-0" }), _jsx("span", { children: "View Match" })] }), matchCtxMenu.isJungler && (_jsxs("button", { type: "button", onClick: () => { fetchAnalysis(matchCtxMenu.matchId); setMatchCtxMenu(null); }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-amber-400 hover:bg-amber-400/[0.06] cursor-clicker", children: [_jsx(Search, { className: "w-3.5 h-3.5 flex-shrink-0" }), _jsx("span", { children: "Scan Jungle" })] })), _jsxs("button", { type: "button", onClick: () => { setMatchCtxMenu(null); }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-violet-400 hover:bg-violet-400/[0.06] cursor-clicker", children: [_jsx(BarChart3, { className: "w-3.5 h-3.5 flex-shrink-0" }), _jsx("span", { children: "Ask AI" })] }), _jsx("div", { className: "mx-3 my-1 h-px bg-flash/[0.06]" }), _jsxs("button", { type: "button", onClick: () => {
                                        navigator.clipboard.writeText(matchCtxMenu.matchId);
                                        showCyberToast({ title: "Match ID copied" });
                                        setMatchCtxMenu(null);
                                    }, className: "w-full flex items-center gap-3 px-3 py-2 transition-all duration-150 font-mono text-[11px] tracking-[0.12em] uppercase text-flash/40 hover:text-jade hover:bg-jade/[0.06] cursor-clicker", children: [_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className: "w-3.5 h-3.5 flex-shrink-0", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }), _jsx("span", { children: "Copy Match ID" })] })] }) }))] }), _jsx(AnimatePresence, { children: showReportModal && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 }, className: "fixed inset-0 z-50 flex items-center justify-center", onClick: () => setShowReportModal(false), children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }), _jsxs(motion.div, { initial: { opacity: 0, scale: 0.92, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.92, y: 12 }, transition: { duration: 0.2, ease: "easeOut" }, onClick: (e) => e.stopPropagation(), className: cn("relative z-10 w-[380px] rounded-sm overflow-hidden", "bg-[#060d10]/95 backdrop-blur-xl", "border border-flash/[0.10]", "shadow-[0_20px_60px_rgba(var(--c-shadow),0.7),0_0_30px_rgba(0,217,146,0.05)]"), children: [_jsxs("div", { className: "px-5 pt-4 pb-3 border-b border-flash/[0.06]", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1 h-3 bg-red-500 rounded-full" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.2em] text-flash/50 uppercase", children: "Report Player" })] }), _jsxs("p", { className: "font-mono text-[10px] text-flash/25 mt-2 tracking-wide", children: ["Select a reason for reporting", " ", _jsx("span", { className: "text-jade/60", children: summonerInfo?.name ?? name })] })] }), _jsx("div", { className: "px-5 py-4 flex flex-col gap-2", children: ["Inappropriate Profile Picture", "Inappropriate Username", "Impersonation", "Other"].map((reason) => (_jsx("button", { type: "button", onClick: () => setReportReason(reportReason === reason ? null : reason), className: cn("w-full px-3.5 py-2.5 rounded-sm text-left transition-all duration-150 cursor-clicker", "font-mono text-[11px] tracking-[0.12em] uppercase", "border", reportReason === reason
                                            ? "text-red-400 bg-red-500/[0.08] border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.08)]"
                                            : "text-flash/35 border-flash/[0.08] hover:text-flash/50 hover:border-flash/[0.15] bg-filmdark/20"), children: reason }, reason))) }), _jsxs("div", { className: "px-5 pb-4 flex items-center justify-end gap-3", children: [_jsx("button", { type: "button", onClick: () => setShowReportModal(false), className: "font-mono text-[10px] tracking-[0.15em] uppercase text-flash/30 hover:text-flash/50 transition-colors cursor-clicker px-3 py-1.5", children: "Cancel" }), _jsx("button", { type: "button", onClick: () => {
                                                setShowReportModal(false);
                                                showCyberToast({ title: "Report submitted" });
                                            }, disabled: !reportReason, className: cn("font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2 rounded-sm transition-all duration-150 cursor-clicker", "border", reportReason
                                                ? "text-red-400 border-red-500/30 bg-red-500/[0.06] hover:bg-red-500/[0.12]"
                                                : "text-flash/15 border-flash/[0.05] bg-filmdark/10 cursor-not-allowed"), children: "Submit Report" })] })] })] })) }), isAdmin && (_jsx("div", { className: "fixed bottom-10 left-10 z-[999]", children: _jsx(DiamondButton, { color: "citrine", icon: "edit", label: "ADMIN", onClick: () => setShowAdminDialog(true) }) })), _jsx(MatchReplayDialog, { open: !!replayMatch, onClose: () => setReplayMatch(null), matchId: replayMatch?.matchId ?? "", region: (region ?? "EUW").toUpperCase(), staticMatch: replayMatch?.match ?? null, focusPuuid: summonerInfo?.puuid ?? null })] }));
}
