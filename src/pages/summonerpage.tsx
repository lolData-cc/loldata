import type { MatchWithWin, SummonerInfo, ChampionStats, Participant } from "@/assets/types/riot"
import { calculateLolDataScores } from "@/utils/calculatePlayerRating";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useEffect, useState, useMemo, useRef, useCallback } from "react"
import { LiveViewer } from "@/components/liveviewer"
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react"
import { getRankImage } from "@/utils/rankIcons"
import { getWinrateClass } from '@/utils/winratecolor'
import { ChampionPicker } from "@/components/championpicker"
import { getKdaClass } from '@/utils/kdaColor'
import { getKdaBackgroundStyle } from '@/utils/kdaColor'
import { formatStat } from "@/utils/formatStat"
import { timeAgo } from '@/utils/timeAgo';
import { champPath, CDN_BASE_URL } from "@/config"
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
import { Error404 } from "@/components/error404";
import { Tabs, TabsTrigger, TabsContent, TabsList } from "@/components/ui/tabs";
import { RecentGamesSummary } from "@/components/recentgamessummary";
import { PlayerHoverCard } from "@/components/playerhovercard";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { calculatePlayerRating } from "@/utils/calculatePlayerRating";
import { supabase } from "@/lib/supabaseClient";

const itemKeys: (keyof Participant)[] = [
  "item0",
  "item1",
  "item2",
  "item3",
  "item4",
  "item5",
  "item6"
];

const COOLDOWN_MS = 300_000
const STORAGE_KEY = "loldata:updateTimestamp"


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
  const [matches, setMatches] = useState<MatchWithWin[]>([])
  const [loading, setLoading] = useState(false)
  const [onCooldown, setOnCooldown] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState<QueueType>("All");
  const [isPro, setIsPro] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);
  const { region, slug } = useParams()
  const [name, tag] = slug?.split("-") ?? []
  const [latestPatch, setLatestPatch] = useState("15.13.1")
  const [topChampions, setTopChampions] = useState<ChampionStats[]>([])
  const [summonerInfo, setSummonerInfo] = useState<SummonerWithAvatar | null>(null)
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null)
  const [allChampions, setAllChampions] = useState<{ id: string; name: string }[]>([])
  const [championMap, setChampionMap] = useState<Record<number, string>>({});
  const [championMapReverse, setChampionMapReverse] = useState<Record<string, number>>({});
  const [topChampionsSeason, setTopChampionsSeason] = useState<ChampionStats[]>([]);
  const [topChampionsSolo, setTopChampionsSolo] = useState<ChampionStats[]>([]);
  const [topChampionsFlex, setTopChampionsFlex] = useState<ChampionStats[]>([]);
  const [premiumPlan, setPremiumPlan] = useState<null | "premium" | "elite">(null)
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAllDuos, setShowAllDuos] = useState(false);

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

  const glassOverlays = (
    <>
      <div className="pointer-events-none absolute -top-24 left-0 h-56 w-full z-[1]
      bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.12),rgba(255,255,255,0)_62%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" />
    </>
  );


  const filteredMatches = matches.filter((m) => {
    const matchQueueId = m.match.info.queueId;

    // Niente filtro queue quando è "All"
    const isCorrectQueue =
      selectedQueue === "All"
        ? true
        : (queueGroups[selectedQueue] || []).includes(matchQueueId);

    const isCorrectChampion = selectedChampion ? m.championName === selectedChampion : true;

    return isCorrectQueue && isCorrectChampion;
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

    // inizializza un record per ogni giorno del mese
    const stats: DayWinrateCell[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      stats.push({
        date: new Date(year, month, day),
        games: 0,
        wins: 0,
        winrate: null,
      });
    }

    // accumula stats usando TUTTE le partite del mese corrente
    for (const m of matches) {
      const ts = getMatchTimestamp(m.match.info);
      if (!ts) continue;

      const d = new Date(ts);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;

      const dayIndex = d.getDate() - 1; // 0-based index
      const cell = stats[dayIndex];
      cell.games += 1;
      if (m.win) cell.wins += 1;
    }

    // calcola winrate
    stats.forEach(cell => {
      if (cell.games > 0) {
        cell.winrate = Math.round((cell.wins / cell.games) * 100);
      } else {
        cell.winrate = null;
      }
    });

    return stats;
  }, [matches]);

  const githubWeeks = useMemo(() => {
    if (!monthlyDayStats.length) return [];

    // parto dal primo giorno del mese (lo hai già calcolato così in monthlyDayStats)
    const first = monthlyDayStats[0].date;
    const year = first.getFullYear();
    const month = first.getMonth();

    const firstDay = new Date(year, month, 1);
    // 0 = lunedì, 6 = domenica (così hai le righe tipo "lun→dom")
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
        // se il top dell’elemento è sopra la viewport, vuol dire che l’abbiamo superato
        setShowScrollTop(rect.top < 0);
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    const [name, tag] = slug.split("-");
    if (!name || !tag) return;

    checkUserFlags(name, tag).then(({ isPro, isStreamer }) => {
      setIsPro(isPro);
      setIsStreamer(isStreamer);
    });
  }, [slug]);

  useEffect(() => {
    fetch("http://cdn.loldata.cc/15.13.1/data/en_US/champion.json")
      .then(res => res.json())
      .then(data => {
        const champs = Object.values(data.data).map((champ: any) => ({
          id: champ.key,
          name: champ.id,
        }));

        const map: Record<number, string> = {};
        const reverseMap: Record<string, number> = {};

        champs.forEach((c) => {
          map[c.id] = c.name;
          reverseMap[c.name] = c.id;
        });

        setChampionMap(map);
        setChampionMapReverse(reverseMap);
        setAllChampions(champs);
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
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then(res => res.json())
      .then((versions: string[]) => setLatestPatch(versions[0]))
  }, [])

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY)
    if (last) {
      const diff = Date.now() - Number(last)
      if (diff < COOLDOWN_MS) {
        setOnCooldown(true)
        setTimeout(() => setOnCooldown(false), COOLDOWN_MS - diff)
      }
    }
  }, [])

  useEffect(() => {
    if (!name || !tag) return
    refreshData()
  }, [name, tag])

  useEffect(() => {
    if (name && tag && region) {
      fetchSummonerInfo(name, tag, region)
    }
  }, [name, tag, region])

  useEffect(() => {
    if (!summonerInfo?.puuid || !region) return;
    let cancelled = false;

    (async () => {
      const okAll = await fetchSeasonStats(summonerInfo.puuid, region, "ranked_all");
      const okSolo = await fetchSeasonStats(summonerInfo.puuid, region, "ranked_solo");
      const okFlex = await fetchSeasonStats(summonerInfo.puuid, region, "ranked_flex");

      if (cancelled) return;

      if (!(okAll && okSolo && okFlex)) {
        const id = setInterval(async () => {
          if (cancelled) { clearInterval(id); return; }
          const doneAll = topChampionsSeason.length > 0 || await fetchSeasonStats(summonerInfo!.puuid, region!, "ranked_all");
          const doneSolo = topChampionsSolo.length > 0 || await fetchSeasonStats(summonerInfo!.puuid, region!, "ranked_solo");
          const doneFlex = topChampionsFlex.length > 0 || await fetchSeasonStats(summonerInfo!.puuid, region!, "ranked_flex");
          if (doneAll && doneSolo && doneFlex) clearInterval(id);
        }, 2000);
      }
    })();

    return () => { cancelled = true; };
  }, [summonerInfo?.puuid, region]);

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

  async function refreshData() {

    if (!region) {
      console.error("❌ Region mancante in refreshData")
      return
    }

    if (!name || !tag) return

    setLoading(true)
    setSummonerInfo(null);
    setMatches([]);
    setTopChampionsSeason([]);
    setHasMore(true);
    setNextOffset(0);
    setIsLoadingMore(false);

    const [summoner, matchData] = await Promise.all([
      fetchSummonerInfo(name, tag, region),
      fetchMatches(name, tag, region, 0, false),
    ])

    await fetch(`${API_BASE_URL}/api/summoner/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    }).catch(console.error)

    await fetch(`${API_BASE_URL}/api/profile/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    })
      .then(res => res.json())
      //.then(data => setViews(data.views))
      .catch(console.error)

    setLoading(false)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setOnCooldown(true)
    setTimeout(() => setOnCooldown(false), COOLDOWN_MS)
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


  async function fetchSummonerInfo(name: string, tag: string, region: string) {
    const res = await fetch(`${API_BASE_URL}/api/summoner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag, region }),
    })

    const data = await res.json()
    setSummonerInfo(data.summoner as SummonerInfo)
  }

  async function fetchMatches(name: string, tag: string, region: string, offset = 0, append = false) {
    const res = await fetch(`${API_BASE_URL}/api/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag, region, offset, limit: 10 }),
    });
    const data = await res.json();

    setHasMore(Boolean(data.hasMore));
    setNextOffset(Number(data.nextOffset ?? (offset + (data.matches?.length ?? 0))));

    setTopChampions(data.topChampions || []);

    if (append) {
      setMatches(prev => [...prev, ...(data.matches || [])]);
    } else {
      setMatches(data.matches || []);
    }
  }

  async function fetchSeasonStats(
    puuid: string,
    region: string,
    queueGroup: "ranked_all" | "ranked_solo" | "ranked_flex" = "ranked_all"
  ) {
    const res = await fetch(`${API_BASE_URL}/api/season_stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ puuid, region, queueGroup }),
    });

    if (res.status === 200) {
      const data = await res.json();
      if (queueGroup === "ranked_all") setTopChampionsSeason(data.topChampions || []);
      if (queueGroup === "ranked_solo") setTopChampionsSolo(data.topChampions || []);
      if (queueGroup === "ranked_flex") setTopChampionsFlex(data.topChampions || []);
      return true;
    }
    if (res.status === 202) return false;
    return false;
  }




  type MatchRow = {
    match: MatchWithWin["match"];
    win: boolean;
    championName: string;
  };

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
    return map; // mantiene l’ordine d’inserimento
  }, [filteredMatches]);



  function StatsList({ champs }: { champs: ChampionStats[] }) {
    const isLoading = !champs || champs.length === 0;
    return (
      <div className="flex flex-col gap-3 mx-2 mt-3">
        {isLoading ? (
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
        ) : (
          champs.slice(0, 5).map((champ) => (
            <div key={champ.champion} className="grid grid-cols-3 items-center px-3 gap-4 w-full">
              <div className="flex items-center gap-3">
                <img src={`${champPath}/${champ.champion}.png`} alt={champ.champion} className="w-12 h-12 rounded-full" />
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

              <div className="flex flex-col items-center text-xs text-white gap-1 w-[90px] whitespace-nowrap pl-20 text-[11px]">
                <div className={getKdaClass(champ.avgKda)}>{champ.avgKda} KDA</div>
                <div>
                  {formatStat(champ.kills / champ.games)}/
                  {formatStat(champ.deaths / champ.games)}/
                  {formatStat(champ.assists / champ.games)}
                </div>
              </div>

              <div className="flex flex-col items-end text-xs text-white gap-1 text-[11px] min-w-[80px]">
                <div className={getWinrateClass(champ.winrate, champ.games)}>{champ.winrate}%</div>
                <div className="text-[11px]">{champ.games} MATCHES</div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="relative z-0">
      <UltraTechBackground />
      <div className="relative flex min-h-screen -mt-4 z-10">
        <div className="w-2/5 min-w-[35%] flex flex-col gap-0 items-center">
          <div
            className={cn(
              "relative overflow-hidden w-[90%] h-[420px] mt-5 rounded-md text-sm font-thin",
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
            <div className="relative z-10">
              <div className="relative w-full h-32 overflow-hidden mt-6">
                {topChampionsSeason.length > 0 && (
                  <img
                    src={`https://cdn.loldata.cc/15.13.1/img/champion/${topChampionsSeason[0].champion}_0.jpg`}
                    alt={`Splash art ${topChampionsSeason[0].champion}`}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 filter grayscale brightness-150"
                    style={{ objectPosition: "top center" }}
                  />
                )}

                <div className="relative z-10 px-4 py-2">
                  <span className="text-flash/70">THIS SEASON</span>

                  <div className="flex mt-14 px-3 gap-4">
                    <div className="flex">
                      <span className="text-2xl text-jade">{summonerInfo?.wins}</span>
                      <span>WINS</span>
                    </div>

                    <div className="flex">
                      <span className="text-2xl text-[#b11315]">{summonerInfo?.losses}</span>
                      <span>LOSSES</span>
                    </div>

                    {summonerInfo && (
                      <div className="flex items-center gap-1">
                        {(() => {
                          const totalGames = summonerInfo.wins + summonerInfo.losses;
                          const winrate =
                            totalGames > 0 ? Math.round((summonerInfo.wins / totalGames) * 100) : 0;

                          return (
                            <>
                              <span className={`text-2xl ${getWinrateClass(winrate, totalGames)}`}>
                                {winrate}%
                              </span>
                              <span>WINRATE</span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Tabs defaultValue="recentgames">
                <div className="p-3">
                  <TabsList className="flex justify-start">
                    <TabsTrigger
                      value="recentgames"
                      className="font-thin font-jetbrains text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/20 rounded-sm px-2 py0.5"
                    >
                      RECENT GAMES
                    </TabsTrigger>
                    <TabsTrigger
                      value="allgames"
                      className="font-thin font-jetbrains text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/20 rounded-sm px-2 py0.5"
                    >
                      ALL GAMES
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="recentgames">
                  <RecentGamesSummary matches={matches} summonerPuuid={summonerInfo?.puuid} />

                  <Separator className="bg-white/10 mt-16" />

                  {recentBadgeLabel && (
                    <div className="flex items-center justify-between px-6 py-4">
                      <div className="text-flash/60 text-sm">
                        LAST 10 GAMES: {recentBadgeCount} MVPS
                      </div>

                      <div className="relative rounded-sm overflow-hidden px-2 py-0.5">
                        <div
                          className={cn(
                            "absolute inset-0 animate-glow",
                            recentBadgeLabel === "GODLIKE" &&
                            "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400",
                            recentBadgeLabel === "SOLOCARRY" &&
                            "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300",
                            recentBadgeLabel === "CARRY" &&
                            "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400"
                          )}
                        />
                        <div className="relative z-10 text-black text-sm font-semibold tracking-wide">
                          {recentBadgeLabel}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="allgames">allgames</TabsContent>
              </Tabs>
            </div>
          </div>


          <div
            className={cn(
              "relative overflow-hidden w-[90%] h-[420px] mt-4 rounded-md text-sm font-thin",
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

            {/* contenuto */}
            <div className="relative z-10">
              <Tabs
                defaultValue="season"
                onValueChange={(v) => {
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
                    <TabsList className="grid grid-cols-3 w-[85%] mx-auto">
                      <TabsTrigger
                        value="solo"
                        className="font-thin text-flash/70 data-[state=active]:text-jade data-[state=active]:bg-jade/20"
                      >
                        SOLO/DUO
                      </TabsTrigger>
                      <TabsTrigger
                        value="flex"
                        className="font-thin text-flash/70 data-[state=active]:text-jade data-[state=active]:bg-jade/20"
                      >
                        FLEX
                      </TabsTrigger>
                      <TabsTrigger
                        value="season"
                        className="font-thin text-flash/70 data-[state=active]:text-jade data-[state=active]:bg-jade/20"
                      >
                        SEASON
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* separator più “glass” */}
                  <Separator className="bg-white/10 w-[85%] mx-auto mt-2" />

                  {/* Season (solo+flex) */}
                  <TabsContent value="season" className="m-0">
                    <StatsList champs={topChampionsSeason} />
                  </TabsContent>

                  {/* Solo/Duo */}
                  <TabsContent value="solo" className="m-0">
                    <StatsList champs={topChampionsSolo} />
                  </TabsContent>

                  {/* Flex */}
                  <TabsContent value="flex" className="m-0">
                    <StatsList champs={topChampionsFlex} />
                  </TabsContent>

                  <div className="flex justify-center mt-auto pb-4 pt-2">
                    <ShowMoreMatches />
                  </div>
                </nav>
              </Tabs>
            </div>
          </div>

          {monthlyDayStats.length > 0 && (
            <div className="w-[90%] mt-4 flex gap-4 items-stretch">
              {/* SINISTRA: HEATMAP (uguale a prima come altezza) */}
              <div className={cn(glassDark, "flex-1 text-sm font-thin")}>
                {glassOverlays}
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

                          // Celle senza partite
                          if (!cell.games || cell.winrate == null) {
                            return (
                              <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                  <div className={cn(baseClasses, "bg-white/5")} />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="flex flex-col gap-[2px] leading-snug">
                                    <span className="uppercase tracking-wide text-flash/60">Day {dayNumber}</span>
                                    <span className="text-flash/60">
                                      {cell.games} {cell.games === 1 ? "game" : "games"}
                                    </span>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          }

                          // Celle con partite: calcolo colore
                          const rawT = cell.winrate / 100;
                          const t = Math.max(0.2, Math.min(1, rawT)); // almeno 20% di intensità

                          // base leggermente più chiara (verde molto scuro ma leggibile)
                          const start = { r: 0x0C, g: 0x40, b: 0x32 }; // #0C4032
                          const end = { r: 0x00, g: 0xD9, b: 0x92 };   // jade

                          const r = Math.round(start.r + (end.r - start.r) * t);
                          const g = Math.round(start.g + (end.g - start.g) * t);
                          const b = Math.round(start.b + (end.b - start.b) * t);
                          const bgColor = `rgb(${r}, ${g}, ${b})`;

                          return (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <div className={baseClasses} style={{ backgroundColor: bgColor }} />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="flex flex-col gap-[2px] leading-snug">
                                  <span className="uppercase tracking-wide text-flash/60">Day {dayNumber}</span>
                                  <span className="font-jetbrains text-flash/70">{cell.winrate}% WR</span>
                                  <span className="text-flash/60">
                                    {cell.games} {cell.games === 1 ? "game" : "games"}
                                  </span>
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
              <div className={cn(glassDark, "w-52 text-sm font-thin flex-shrink-0")}>
                {glassOverlays}
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
                                : "40%", // minimo visivo se non ci sono dati
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
            <div
              className={cn(
                "relative overflow-hidden w-[90%] mt-5 rounded-md text-sm font-thin",
                "bg-black/25 backdrop-blur-lg saturate-150",
                "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
              )}
              style={
                showAllDuos
                  ? undefined
                  : {
                    maxHeight: `${(Math.min(duoStats.length, 5) * 64) + 60}px`,
                  }
              }
            >
              {/* glossy overlays */}
              <div
                className={cn(
                  "pointer-events-none absolute -top-24 left-0 h-56 w-full z-[1]",
                  "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.045),rgba(255,255,255,0)_70%)]"
                )}
              />
              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/2 via-transparent to-black/40" />

              {/* fade top/bottom (effetto scroll premium) */}
              <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 z-[2] bg-gradient-to-b from-black/45 to-transparent" />
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 z-[2] bg-gradient-to-t from-black/55 to-transparent" />

              {/* contenuto */}
              <div className="relative z-10">
                <div className="px-4 py-2 text-flash/70">PLAYED WITH</div>

                <div
                  className={cn(
                    showAllDuos
                      ? "overflow-visible"
                      : "max-h-[calc(100%-40px)] overflow-y-auto"
                  )}
                >
                  <div className="flex flex-col gap-4 px-5 py-2 pb-6">
                    {visibleDuos.map((duo) => (
                      <div key={duo.puuid} className="flex flex-col gap-1">
                        {/* Riga 1: Nome e WR */}
                        <div className="flex justify-between items-center">
                          {/* Nome con hover card + click verso pagina summoner, come nelle match card */}
                          {duo.riotId.includes("#") ? (
                            <PlayerHoverCard
                              riotId={duo.riotId}
                              region={region!}
                              championId={
                                duo.lastChampionName
                                  ? championMapReverse[duo.lastChampionName] // stesso mapping usato nelle match card
                                  : undefined
                              }
                              profileIconId={duo.profileIconId ?? undefined}
                              patch={latestPatch}
                              isCurrentUser={duo.puuid === summonerInfo?.puuid}
                              championMap={championMap}
                            >
                              <span className="truncate text-white cursor-clicker">{duo.riotId}</span>
                            </PlayerHoverCard>
                          ) : (
                            // fallback se non abbiamo un vero Riot ID (tipo "Unknown")
                            <span className="truncate text-white">{duo.riotId}</span>
                          )}

                          <div className="flex items-center gap-1">
                            <span className={cn("text-sm", getWinrateClass(duo.winrate, duo.games))}>
                              {duo.winrate}%
                            </span>
                            <span className="truncate text-flash/60 text-xs">
                              ({duo.games} GAMES)
                            </span>
                          </div>
                        </div>

                        {/* Riga 2: Barra wins/losses */}
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-jade"
                            style={{ width: `${duo.winrate}%` }}
                          />
                        </div>

                        {/* Riga 3: WINS / LOSSES */}
                        <div className="flex justify-between text-xs">
                          {duo.wins > 0 && (
                            <span className="text-jade">{duo.wins} WINS</span>
                          )}
                          {duo.losses > 0 && (
                            <span className="text-[#b11315]">{duo.losses} LOSSES</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {duoStats.length > 3 && (
                  <div className="flex justify-center pb-4 pt-1">
                    <Button
                      type="button"
                      onClick={() => setShowAllDuos((v) => !v)}
                      className="text-[#00D992] bg-[#122322] hover:bg-[#11382E] rounded w-[90%] uppercase tracking-wide"
                    >
                      {showAllDuos ? "SHOW LESS" : "SHOW MORE"}
                    </Button>
                  </div>
                )}

              </div>

            </div>
          )}


        </div>

        <div className="w-4/5">

          <div className="flex justify-between items-start mt-4 w-full min-w-full max-w-full">
            {/* SEZIONE SINISTRA: nuove icone */}
            <div className="flex flex-col items-center gap-1">
              <span>CURRENT RANK</span>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute w-24 h-24 bg-cement rounded-full z-0 border border-[#2B2A2B] shadow-md" />

                <img
                  src={
                    !summonerInfo?.rank || summonerInfo.rank.toLowerCase() === "unranked"
                      ? "/img/unranked.png"
                      : getRankImage(summonerInfo.rank)
                  }
                  alt="Rank icon"
                  className="w-32 h-32 z-10 relative"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = "/img/unranked.png";
                  }}
                />


              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#BFC5C6]"> {summonerInfo?.rank} </span>
                {summonerInfo?.rank &&
                  summonerInfo.rank.toLowerCase() !== "unranked" && (
                    <span className="text-[#5B5555]">{summonerInfo.lp} LP</span>
                  )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[#E3E3E3]">HIGHEST RANK</span>
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Cerchio dietro */}
                <div className="absolute w-24 h-24 bg-cement rounded-full z-0 border border-[#2B2A2B] shadow-md" />

                {/* Immagine sopra */}
                <img
                  src={
                    !summonerInfo?.peakRank || summonerInfo.peakRank?.toLowerCase() === "unranked"
                      ? "/img/unranked.png"
                      : getRankImage(summonerInfo.peakRank)
                  }
                  alt="Highest Rank icon"
                  className="w-32 h-32 z-10 relative"
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = "/img/unranked.png";
                  }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#BFC5C6]">{summonerInfo?.peakRank}</span>
                {summonerInfo?.rank &&
                  summonerInfo.rank.toLowerCase() !== "unranked" && (
                    <span className="text-[#5B5555]">{summonerInfo.peakLp} LP</span>
                  )}
              </div>
            </div>
            <div>
            </div>


            <div className="flex w-[55%] justify-end">
              <div className="flex flex-col pr-4">
                <div
                  className="uppercase select-none"
                  title="CLICK TO COPY"
                >
                  {(isPro || isStreamer) && (
                    <div className="flex justify-end mb-2 items-center space-x-2">
                      {/* PRO / STREAMER badges come prima */}
                      {isPro && (
                        <div className="relative rounded-sm overflow-hidden px-1.5">
                          <div className="absolute inset-0 animate-glow bg-gradient-to-r from-blue-500 via-cyan-300 to-green-300" />
                          <div className="relative text-black text-sm text-center z-10">PRO</div>
                        </div>
                      )}
                      {isStreamer && (
                        <div className="relative rounded-sm overflow-hidden px-1.5">
                          <div className="absolute inset-0 animate-glow bg-gradient-to-r from-purple-600 via-pink-500 to-red-400" />
                          <div className="relative text-black text-sm z-10">STREAMER</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🔹 Discord sopra il livello */}
                  {linkedDiscord && (
                    <div className="flex justify-end mb-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-flash/20 bg-black/50 px-2.5 py-1">
                        {linkedDiscord.discord_avatar_url && (
                          <img
                            src={linkedDiscord.discord_avatar_url}
                            alt="Discord avatar"
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span className="text-[10px] text-flash/50 tracking-[0.18em]">
                          DISCORD
                        </span>
                        <span className="text-xs text-flash/80 font-medium">
                          {linkedDiscord.discord_username ?? "Connected user"}
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[#5B5555] text-sm justify-end text-right font-thin">
                    LEVEL {summonerInfo?.level} | {region}
                  </p>

                  <div
                    className={`flex justify-end cursor-clicker ${((summonerInfo?.name?.length || 0) + (summonerInfo?.tag?.length || 0) > 16)
                        ? "text-[17px]"
                        : "text-2xl"
                      }`}
                    onClick={() => {
                      if (summonerInfo) {
                        navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`);
                      }
                    }}
                  >
                    {/* blocco name + tag come ce l’hai già adesso */}
                    {/* ... */}
                  </div>
                </div>

                <div className="mt-2 flex justify-end items-center gap-2">
                  <UpdateButton
                    onClick={refreshData}
                    loading={loading}
                    cooldown={onCooldown}
                    className="px-5 py-2"
                  />
                </div>
              </div>


              <div className="relative w-40 h-40 mr-2">
                <img
                  src={
                    summonerInfo?.avatar_url
                    ?? `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${summonerInfo?.profileIconId}.png`
                  }
                  className={cn(
                    "w-full h-full rounded-xl select-none pointer-events-none border-2 object-cover",
                    summonerInfo?.live ? "border-[#00D992]" : "border-transparent"
                  )}
                  draggable={false}
                  onError={(e) => {
                    e.currentTarget.src = `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${summonerInfo?.profileIconId}.png`
                  }}
                />
                {summonerInfo?.live && summonerInfo?.puuid && (
                  <LiveViewer puuid={summonerInfo.puuid} riotId={`${summonerInfo.name}#${summonerInfo.tag}`} region={region!} />
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-4">
            <nav
              className={cn(
                "relative w-full h-8 px-8 rounded-md text-flash font-jetbrains overflow-hidden",
                // vetro scuro puro
                "bg-black/20 backdrop-blur-lg saturate-150",
                // edge ultra sottile solo via shadow
                "shadow-[0_6px_18px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
              )}
            >
              <div className="relative z-10 flex items-center h-full justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors font-thin cursor-clicker">
                    <span className="text-sm tracking-wide cursor-clicker">
                      {selectedQueue === "All" ? "ALL QUEUES" : selectedQueue.toUpperCase()}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    className="w-48 text-sm bg-black/40 backdrop-blur-lg border-white/10"
                  >
                    {(["All", "Ranked Solo/Duo", "Ranked Flex"] as QueueType[]).map((queue) => (
                      <DropdownMenuItem
                        key={queue}
                        onClick={() => setSelectedQueue(queue)}
                        className={cn(
                          "cursor-clicker uppercase font-jetbrains",
                          selectedQueue === queue ? "text-jade font-semibold" : "text-flash/70"
                        )}
                      >
                        {queue}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Separator orientation="vertical" className="h-4 bg-white/10" />

                <div className="space-x-2 flex items-center">
                  <ChampionPicker
                    champions={allChampions}
                    onSelect={(champId) => setSelectedChampion(champId)}
                  />
                  <ChevronDown className="h-4 w-4" />
                </div>

                <Separator orientation="vertical" className="h-4 bg-white/10" />

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors">
                    <span className="text-sm font-medium tracking-wide">LOREM IPSUM</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                </DropdownMenu>

                <Separator orientation="vertical" className="h-4 bg-white/10" />

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors">
                    <span className="text-sm font-medium tracking-wide">LOREM IPSUM</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                </DropdownMenu>
              </div>
            </nav>


            {loading ? (
              <ul className="space-y-3 mt-4">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-md h-28",
                      // vetro scuro identico alle card
                      "bg-black/22 backdrop-blur-lg saturate-150",
                      // edge ultra sottile solo via shadow (NO alone)
                      "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.4px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]"
                    )}
                  >
                    {/* champ icon */}
                    <Skeleton className="w-12 h-12 rounded-md bg-white/10" />

                    {/* testo */}
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
                {[...groupedByDay.entries()].map(([dayKey, rows]) => {
                  const wins = rows.filter(r => r.win).length;
                  const losses = rows.length - wins;
                  const wr = rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0;
                  const totalSeconds = rows.reduce((acc, r) => acc + (r.match.info.gameDuration || 0), 0);
                  const playedLabel = formatPlayedTime(totalSeconds);

                  return (
                    <section key={dayKey} className="space-y-1">
                      {/* HEADER DEL GIORNO */}
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

                      {/* LISTA MATCH DI QUEL GIORNO */}
                      <ul className="space-y-3">
                        {rows.map(({ match, win, championName }) => {
                          // === tuo codice esistente per una singola card ===
                          const queueId = match.info.queueId;
                          const queueLabel = queueTypeMap[queueId] || "Unknown Queue";
                          const participants = match.info.participants;
                          const team1 = participants.filter(p => p.teamId === 100);
                          const team2 = participants.filter(p => p.teamId === 200);
                          const itemKeys: (keyof Participant)[] = ["item0", "item1", "item2", "item3", "item4", "item5"];
                          const { scores, mvpWin, mvpLose } = calculateLolDataScores(participants);
                          const participant = participants.find((p) => p.puuid === summonerInfo?.puuid);
                          const kda =
                            participant && participant.deaths === 0 && (participant.kills + participant.assists) > 0
                              ? 'Perfect'
                              : participant && participant.deaths > 0
                                ? (participant.kills + participant.assists) / participant.deaths
                                : 0;
                          const isSelfMvpOrAce =
                            !!summonerInfo?.puuid &&
                            (summonerInfo.puuid === mvpWin || summonerInfo.puuid === mvpLose);

                          return (
                            <li
                              key={match.metadata.matchId}
                              className={cn(
                                "relative overflow-hidden rounded-md p-2 text-flash transition",
                                "bg-black/18 backdrop-blur-lg saturate-150",
                                "shadow-[0_10px_30px_rgba(0,0,0,0.60),inset_0_0_0_0.35px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]",
                                "hover:bg-black/16 hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
                              )}
                            >
                              <div
                                className={cn(
                                  "pointer-events-none absolute -top-28 left-0 h-60 w-full z-[1]",
                                  "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.018),rgba(255,255,255,0)_72%)]"
                                )}
                              />

                              <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" />

                              <div className="flex items-center justify-center h-full relative z-10">
                                <div className="w-[95%]">


                                  {isSelfMvpOrAce && (
                                    <div
                                      className="absolute inset-0 z-0 mvpAceGlow"
                                      style={{ ['--glow-blue' as any]: '#0058ff', ['--glow-mint' as any]: '#9fffc3' }}
                                    />
                                  )}


                                  {/* ✅ BORDO COLORATO */}
                                  <div
                                    className={cn(
                                      "absolute left-0 top-0 h-full w-1 rounded-l-sm z-10",
                                      win
                                        ? "bg-gradient-to-b from-[#00D18D] to-[#11382E]"
                                        : "bg-gradient-to-b from-[#c93232] to-[#420909]"
                                    )}
                                  />

                                  {/* ✅ CONTENUTO INTERNO */}
                                  <div className="relative z-10 ml-2">
                                    <div className="ml-2">
                                      <div className="relative flex justify-between text-[11px] uppercase text-flash/70 ">
                                        {/* Sfondo cliccabile */}


                                        {/* Testi sopra lo sfondo - con z-20 */}
                                        <span className="relative z-20">{queueLabel}</span>
                                        <span className="absolute left-1/2 transform -translate-x-1/2 z-20">
                                          {Math.floor(match.info.gameDuration / 60)}:
                                          {(match.info.gameDuration % 60).toString().padStart(2, "0")}
                                        </span>
                                        <span className="relative z-20">
                                          {timeAgo(match.info.gameEndTimestamp ?? match.info.gameStartTimestamp ?? match.info.gameCreation)}
                                        </span>
                                      </div>

                                      <div className="relative flex justify-between">
                                        <div className="relative z-40 flex justify-between w-full">
                                          <div className="mt-3">
                                            <div className="flex space-x-1.5 relative">
                                              <div className="relative w-12 h-12">
                                                <img
                                                  src={`${champPath}/${championName}.png`}
                                                  alt={championName}
                                                  className="w-12 h-12 rounded-md"
                                                />
                                                {participant?.champLevel && (
                                                  <div className="absolute -bottom-1 -right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-sm shadow font-geist">
                                                    {participant.champLevel}
                                                  </div>
                                                )}
                                              </div>

                                              {
                                                participant && (
                                                  <div className="flex flex-col">
                                                    <img
                                                      src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${participant.summoner1Id}.png`}
                                                      alt="Spell 1"
                                                      className="w-6 h-6 rounded-sm"
                                                    />
                                                    <img
                                                      src={`https://cdn.loldata.cc/15.13.1/img/summonerspells/${participant.summoner2Id}.png`}
                                                      alt="Spell 2"
                                                      className="w-6 h-6 rounded-sm"
                                                    />
                                                  </div>
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
                                                                src={`${CDN_BASE_URL}/img/item/${itemId}.png`}
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
                                                          src={`${CDN_BASE_URL}/img/item/${participant.item6}.png`}
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
                                                        "flex items-center justify-center h-6 text-sm font-gtthin font-normal px-3 rounded-sm border-liquirice/20 border shadow-md",
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
                                          <div className="w-[40%] grid grid-cols-2 gap-4 mt-2 text-[11px]">
                                            <div>
                                              <ul className="space-y-0.5">
                                                {team1.map((p) => {
                                                  const isCurrentUser = p.puuid === summonerInfo?.puuid;
                                                  const riotName = p.riotIdGameName;
                                                  const tag = p.riotIdTagline;
                                                  const showName = riotName ? `${riotName}#${tag}` : p.puuid;
                                                  const isMvp = p.puuid === mvpWin;
                                                  const isAce = p.puuid === mvpLose;


                                                  return (
                                                    <li key={p.puuid} className="flex items-center gap-2">
                                                      <div className="relative w-4 h-4">
                                                        <img
                                                          src={`${champPath}/${p.championName}.png`}
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
                                                      {/* Nome */}
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

                                                  return (
                                                    <li key={p.puuid} className="flex items-center justify-end gap-2">
                                                      {/* Nome */}
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
                                                      <div className="relative w-4 h-4">
                                                        <img
                                                          src={`${champPath}/${p.championName}.png`}
                                                          alt={p.championName}
                                                          className="w-4 h-4 rounded-sm"
                                                        />
                                                        {(isMvp || isAce) && (
                                                          <span
                                                            className={cn(
                                                              "absolute -top-1 -left-1 text-[8px] px-0.5 rounded-sm z-10", // <- a sinistra
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
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-center items-center mx-auto w-[5%]">
                                  <button
                                    type="button"
                                    className="w-full mx-auto border-l border-cement/20 bg-cement hover:bg-jade/20 text-jade h-28 ml-2 rounded-[4px] flex items-center justify-center cursor-clicker"
                                    onClick={() => {
                                      sessionStorage.setItem("summonerScrollY", String(window.scrollY));
                                      navigate(`/matches/${match.metadata.matchId}`, {
                                        state: { focusedPlayerPuuid: summonerInfo?.puuid, region }
                                      });
                                    }}
                                  >
                                    <ChevronRight className="w-5 h-5 pointer-events-none" />
                                  </button>
                                </div>
                              </div>
                            </li>
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
        <button
          aria-label="Scroll to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className={cn(
            "fixed bottom-8 right-8 z-50 rounded-full shadow-lg p-3 md:p-3.5",
            "bg-jade/20 hover:bg-jade/40 active:scale-95 cursor-clicker",
            "transition-opacity duration-300 ease-in-out",
            showScrollTop ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
        >
          <img src="/icons/arrowup2.svg" alt="" className="w-5 h-5" />
        </button>

      </div>
    </div>
  )
}



