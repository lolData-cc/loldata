import type { MatchWithWin, SummonerInfo, ChampionStats, Participant } from "@/assets/types/riot"
import { calculateLolDataScores } from "@/utils/calculateLolDataScores";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useEffect, useState, useMemo } from "react"
import { LiveViewer } from "@/components/liveviewer"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getRankImage } from "@/utils/rankIcons"
import { getWinrateClass } from '@/utils/winratecolor'
import { ChampionPicker } from "@/components/championpicker"
import { getKdaClass } from '@/utils/kdaColor'
import { getKdaBackgroundStyle } from '@/utils/kdaColor'
import { formatStat } from "@/utils/formatStat"
import { timeAgo } from '@/utils/timeAgo';
import { champPath, CDN_BASE_URL } from "@/config"
import { checkUserFlags } from "@/converters/checkUserFlags";
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

  const navigate = useNavigate();
  const queueGroups = {
    "Ranked Solo/Duo": [420],
    "Ranked Flex": [440],
    "Normal": [400, 430],
    "All": [400, 420, 430, 440, 450, 700, 900, 1020],
  } satisfies Record<QueueType, number[]>;


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


  const duoStats = useMemo(() => {
    if (!summonerInfo || matches.length === 0) return [];

    const duosMap: Record<string, { games: number; wins: number; riotId: string }> = {};

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
              : teammate.summonerName || "Unknown"
          };
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
        winrate: Math.round((data.wins / data.games) * 100)
      }))
      .sort((a, b) => b.games - a.games); // ordina per più partite giocate insieme
  }, [matches, summonerInfo]);

  useEffect(() => {
    const defaultTitle = "lolData";

    const baseName =
      summonerInfo?.name
      ?? (slug
        ? (() => {
          // lo slug è "name-tag": prendo tutto prima dell’ultimo "-"
          const idx = slug.lastIndexOf("-");
          return idx > 0 ? slug.slice(0, idx) : slug;
        })()
        : name);

    if (baseName && baseName.trim().length > 0) {
      document.title = `lolData - ${baseName}`;
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

  //checks if the user is coming back from matchpage and matches the y position
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

  async function refreshData() {

    if (!region) {
      console.error("❌ Region mancante in refreshData")
      return
    }

    if (!name || !tag) return

    setLoading(true)
    setSummonerInfo(null)
    setMatches([])
    setTopChampionsSeason([]);

    const [summoner, matchData] = await Promise.all([
      fetchSummonerInfo(name, tag, region),
      fetchMatches(name, tag, region),
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

  async function fetchSummonerInfo(name: string, tag: string, region: string) {
    const res = await fetch(`${API_BASE_URL}/api/summoner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag, region }),
    })

    const data = await res.json()
    setSummonerInfo(data.summoner as SummonerInfo)
  }

  async function fetchMatches(name: string, tag: string, region: string) {
    const res = await fetch(`${API_BASE_URL}/api/matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag, region }),
    })
    const data = await res.json()
    setMatches(data.matches || [])
    setTopChampions(data.topChampions || [])
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


  const filteredMatches = matches.filter((m) => {
    const matchQueueId = m.match.info.queueId;
    const selectedQueueIds = queueGroups[selectedQueue] || [];

    const isCorrectQueue = selectedQueueIds.includes(matchQueueId);
    const isCorrectChampion = selectedChampion ? m.championName === selectedChampion : true;

    return isCorrectQueue && isCorrectChampion;
  });


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
        <div className="w-2/5 min-w-[35%] flex flex-col gap-16 items-center">
          <div className="w-[90%] bg-cement h-[420px] text-sm font-thin rounded-md mt-5 border border-[#2B2A2B] shadow-md">
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
                    <span className="text-2xl text-jade">
                      {summonerInfo?.wins}
                    </span>
                    <span>
                      WINS
                    </span>
                  </div>

                  <div className="flex">
                    <span className="text-2xl text-[#b11315]">
                      {summonerInfo?.losses}
                    </span>
                    <span>
                      LOSSES
                    </span>
                  </div>

                  {summonerInfo && (
                    <div className="flex items-center gap-1">
                      {(() => {
                        const totalGames = summonerInfo.wins + summonerInfo.losses;
                        const winrate =
                          totalGames > 0
                            ? Math.round((summonerInfo.wins / totalGames) * 100)
                            : 0;

                        return (
                          <>
                            <span
                              className={`text-2xl ${getWinrateClass(winrate, totalGames)}`}
                            >
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
                {/* Badge recent games */}


                <Separator className="bg-flash/20 h1 mt-16" />
                {recentBadgeLabel && (
                  <div className="flex items-center justify-between px-6 py-4">
                    <div className="text-flash/60 text-sm">
                      LAST 10 GAMES: {recentBadgeCount} MVPS
                    </div>

                    <div className="relative rounded-sm overflow-hidden px-2 py-0.5">
                      {/* piccolo glow diverso per i tre livelli */}
                      <div
                        className={cn(
                          "absolute inset-0 animate-glow",
                          recentBadgeLabel === "GODLIKE" && "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400",
                          recentBadgeLabel === "SOLOCARRY" && "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300",
                          recentBadgeLabel === "CARRY" && "bg-gradient-to-r from-purple-500 via-pink-500 to-rose-400"
                        )}
                      />
                      <div className="relative z-10 text-black text-sm font-semibold tracking-wide">
                        {recentBadgeLabel}
                      </div>
                    </div>
                  </div>
                )}

              </TabsContent>
              <TabsContent value="allgames">
                allgames
              </TabsContent>
            </Tabs>

          </div>

          <div className="w-[90%] bg-cement h-[420px] text-sm font-thin rounded-md mt-5 border border-[#2B2A2B] shadow-md">
            <Tabs defaultValue="season" onValueChange={(v) => {
              if (!summonerInfo?.puuid || !region) return;
              if (v === "solo" && topChampionsSolo.length === 0) fetchSeasonStats(summonerInfo.puuid, region, "ranked_solo");
              if (v === "flex" && topChampionsFlex.length === 0) fetchSeasonStats(summonerInfo.puuid, region, "ranked_flex");
              if (v === "season" && topChampionsSeason.length === 0) fetchSeasonStats(summonerInfo.puuid, region, "ranked_all");
            }}>
              <nav className="flex flex-col min-h-[400px]">
                <div className="px-3 pt-3">
                  <TabsList className="grid grid-cols-3 w-[85%] mx-auto">
                    <TabsTrigger value="solo" className="font-thin text-flash/70 data-[state=active]:text-jade data-[state=active]:bg-jade/20">SOLO/DUO</TabsTrigger>
                    <TabsTrigger value="flex" className="font-thin text-flash/70 data-[state=active]:text-jade data-[state=active]:bg-jade/20">FLEX</TabsTrigger>
                    <TabsTrigger value="season" className="font-thin text-flash/70 data-[state=active]:text-jade data-[state=active]:bg-jade/20">SEASON</TabsTrigger>
                  </TabsList>
                </div>

                <Separator className="bg-[#48504E] w-[85%] mx-auto mt-2" />

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


          {duoStats.length > 0 && (
            <div
              className={`
      w-[90%] bg-cement text-sm font-thin rounded-md mt-5
      border border-[#2B2A2B] shadow-md overflow-y-auto
    `}
              style={{
                maxHeight: `${(Math.min(duoStats.length, 5) * 64) + 60}px`
              }}
            >
              <div className="px-4 py-2 text-flash/70">PLAYED WITH</div>
              {/* <Separator className="bg-[#48504E] w-[85%] mx-auto" /> */}

              <div className="flex flex-col gap-4 px-5 py-2">
                {duoStats.map(duo => (
                  <div key={duo.puuid} className="flex flex-col gap-1">
                    {/* Riga 1: Nome e WR */}
                    <div className="flex justify-between items-center">
                      <span className="truncate text-white">{duo.riotId}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-sm ${getWinrateClass(duo.winrate, duo.games)}`}>
                          {duo.winrate}%
                        </span>
                        <span className="truncate text-flash/60 text-xs">({duo.games} GAMES)</span>
                      </div>

                    </div>

                    {/* Riga 2: Barra wins/losses */}
                    <div className="w-full h-1 bg-flash/15 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-jade"
                        style={{ width: `${duo.winrate}%` }}
                      ></div>
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


            {/* SEZIONE DESTRA: info summoner */}
            {/* rounded-md py-2 border-flash/10 border  */}
            <div className="flex w-[55%] justify-end">
              <div className="mt-4 pr-4">
                <div
                  className="uppercase select-none"

                  title="Clicca per copiare"
                >
                  {/* <div className="flex justify-end">
                    <Toggle className="data-[state=on]:bg-[#11382E] hover:bg-[#11382E]">
                      <Star className="text-[#01D18D]" />
                    </Toggle>
                  </div> */}

                  {(isPro || isStreamer) && (
                    <div className="flex justify-end mb-2 items-center space-x-2">
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
                        navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`)
                      }
                    }}
                  >
                    <span className="text-right">
                      {/* NAME */}
                      <span
                        className={
                          premiumPlan === "premium" || premiumPlan === "elite"
                            ? "bg-clip-text text-transparent animate-glow"
                            : "text-[#D7D8D9] animate-glow"
                        }
                        style={
                          premiumPlan === "premium"
                            ? { backgroundImage: "linear-gradient(90deg,#d4843d,#ffde90)", WebkitBackgroundClip: "text" }
                            : premiumPlan === "elite"
                              ? { backgroundImage: "linear-gradient(90deg,#ff1a1a,#7a0000)", WebkitBackgroundClip: "text" }
                              : undefined
                        }
                      >
                        {summonerInfo?.name}
                      </span>

                      {/* #TAG */}
                      <span
                        className={
                          premiumPlan === "premium" || premiumPlan === "elite"
                            ? "ml-0.5 bg-clip-text text-transparent animate-glow"
                            : "ml-0.5 text-[#BCC9C6] animate-glow"
                        }
                        style={
                          premiumPlan === "premium"
                            ? { backgroundImage: "linear-gradient(90deg,#d4843d,#ffde90)", WebkitBackgroundClip: "text" }
                            : premiumPlan === "elite"
                              ? { backgroundImage: "linear-gradient(90deg,#ff1a1a,#7a0000)", WebkitBackgroundClip: "text" }
                              : undefined
                        }
                      >
                        #{summonerInfo?.tag}
                      </span>
                    </span>
                  </div>




                </div>

                {/* <div className="flex justify-end">
                  <span className="text-[#D7D8D9]">{summonerInfo?.}</span>
                </div> */}


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
                    // fallback extra se l’URL custom è rotto
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
            <nav className="w-full bg-cement text-flash px-8 h-8 rounded-md border border-[#2B2A2B] shadow-md font-jetbrain s">
              <div className="flex items-center h-full justify-between ">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors font-thin cursor-clicker">
                    <span className="text-sm tracking-wide cursor-clicker">
                      {selectedQueue === "All" ? "ALL QUEUES" : selectedQueue.toUpperCase()}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 text-sm">
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


                <Separator orientation="vertical" className="h-4 bg-[#48504E] " />

                <div className="space-x-2 flex items-center ">
                  <ChampionPicker
                    champions={allChampions}
                    onSelect={(champId) => setSelectedChampion(champId)}
                  />
                  <ChevronDown className="h-4 w-4" />
                </div>

                <Separator orientation="vertical" className="h-4 bg-[#48504E] " />

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors">
                    <span className="text-sm font-medium tracking-wide">LOREM IPSUM</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                </DropdownMenu>

                <Separator orientation="vertical" className="h-4 bg-[#48504E] " />

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
                {Array.from({ length: 5 }).map((_, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-4 p-3 rounded-md h-28 bg-cement border-flash/20 border"
                  >
                    <Skeleton className="w-12 h-12 rounded-md" />
                    <div className="flex flex-col gap-2 w-full">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : filteredMatches.length === 0 ? (
              <Error404 />
            ) : (
              <ul className="space-y-3 mt-4">
                {filteredMatches.map(({ match, win, championName, }) => {
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


                  return (
                    <li
                      key={match.metadata.matchId}
                      className="relative gap-4  text-flash p-2 rounded-md transition-colors duration-300 bg-cement border border-[#2B2A2B]"
                    >
                      {/* ✅ LAYER CLICCABILE */}
                      <div className="flex items-center justify-center h-full">
                        <div className="w-[95%]">


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
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
                                        <span className="font-geist text-xs font-thin text-flash/40">
                                          {typeof kda === "number" ? kda.toFixed(2) : kda} KDA
                                        </span>
                                        {participant && (() => {
                                          const team = participant.teamId === 100 ? team1 : team2;
                                          const teamKills = team.reduce((sum, p) => sum + p.kills, 0);
                                          const kp = teamKills > 0
                                            ? Math.round(((participant.kills + participant.assists) / teamKills) * 100)
                                            : 0;
                                          return (
                                            <span className="font-geist text-xs font-thin text-flash/40 pl-1.5">
                                              {kp}% KP
                                            </span>
                                          );
                                        })()}
                                        <div className="ml-2">
                                          {/* {participant && getPlayerBadges(participant, participant.teamId === 100 ? team1 : team2).map((badge) => (
                                    <span
                                      key={badge.id}
                                      className="bg-[#041F1A] text-[10px] px-2 py-0.5 rounded-md shadow-sm font-geist text-jade flex items-center gap-1 border border-jade/20 space-x-0.5"
                                    >
                                      {badge.icon}
                                      <span>{badge.label}</span>
                                    </span>
                                  ))} */}
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



