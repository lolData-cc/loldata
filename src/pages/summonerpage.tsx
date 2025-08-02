import type { MatchWithWin, SummonerInfo, ChampionStats, Participant } from "@/assets/types/riot"
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { LiveViewer } from "@/components/liveviewer"
import { ChevronDown } from "lucide-react"
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
} from "@/components/ui/dropdown-menu"
import { UpdateButton } from "@/components/update"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ShowMoreMatches } from "@/components/showmorematches"
import { API_BASE_URL } from "@/config"
import UltraTechBackground from "@/components/techdetails"

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
  const [selectedQueue, setSelectedQueue] = useState<QueueType>("Ranked Solo/Duo");
  const [isPro, setIsPro] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);
  const { region, slug } = useParams()
  const [name, tag] = slug?.split("-") ?? []
  const [latestPatch, setLatestPatch] = useState("15.13.1")
  const [topChampions, setTopChampions] = useState<ChampionStats[]>([])
  const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null)
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null)
  const [allChampions, setAllChampions] = useState<{ id: string; name: string }[]>([])
  const navigate = useNavigate();
  const queueGroups = {
    "Ranked Solo/Duo": [420],
    "Ranked Flex": [440],
    "Normal": [400, 430],
  } satisfies Record<QueueType, number[]>;


  type QueueType = "Ranked Solo/Duo" | "Ranked Flex" | "Normal";




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
          id: champ.id,
          name: champ.name,
        }))
        setAllChampions(champs)
      })
  }, [])



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

  async function refreshData() {

    if (!region) {
      console.error("❌ Region mancante in refreshData")
      return
    }

    if (!name || !tag) return

    setLoading(true)
    setSummonerInfo(null)
    setMatches([])

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

  const filteredMatches = matches.filter((m) => {
    const matchQueueId = m.match.info.queueId;
    const selectedQueueIds = queueGroups[selectedQueue] || [];

    const isCorrectQueue = selectedQueueIds.includes(matchQueueId);
    const isCorrectChampion = selectedChampion ? m.championName === selectedChampion : true;

    return isCorrectQueue && isCorrectChampion;
  });


  return (
    <div className="relative z-0">
      <UltraTechBackground />
      <div className="relative flex min-h-screen -mt-4 z-10">
        <div className="w-2/5 min-w-[35%] flex justify-center">
          <div className="w-[90%] bg-[#1B1B1B] h-[420px] text-sm font-thin rounded-md mt-5 border border-[#2B2A2B] shadow-md">
            <nav className="flex flex-col min-h-[400px]">
              <div className="flex justify-between px-10 py-3">
                <div className="z-0 text-[14px]">SOLO/DUO</div>
                <div className="z-0">FLEX</div>
                <div className="z-0">SEASON</div>
              </div>
              <Separator className="bg-[#48504E] w-[85%] mx-auto" />

              <div className="flex flex-col gap-3 mx-2 mt-3 ">
                {topChampions.length === 0 ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} className="grid  items-center px-4 py-1 animate-pulse">
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
                  topChampions.slice(0, 5).map((champ) => (
                    <div
                      key={champ.champion}
                      className="grid grid-cols-3 items-center px-3 gap-4 w-full"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`${champPath}/${champ.champion}.png`}
                          alt={champ.champion}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex flex-col text-xs text-white gap-1 justify-start text-[11px] min-w-[100px]">
                          <div className="text-[#979D9B] font-thin uppercase truncate w-[90px]">
                            {champ.champion}
                          </div>
                          <div className="text-white font-thin text-[11px]">
                            {(() => {
                              const num = Number(champ.csPerMin);
                              const rounded = Math.round(num * 10) / 10;
                              return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
                            })()}CS/({champ.avgGold})
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
                        <div className={getWinrateClass(champ.winrate)}>{champ.winrate}%</div>
                        <div className="text-[11px]">{champ.games} MATCHES</div>
                      </div>
                    </div>

                  ))
                )}
              </div>

              <div className="flex justify-center mt-auto pb-4 pt-4">
                <ShowMoreMatches />
              </div>
            </nav>

          </div>
        </div>

        <div className="w-4/5">

          <div className="flex justify-between items-start mt-4 w-full min-w-full max-w-full ml-2">
            {/* SEZIONE SINISTRA: nuove icone */}
            <div className="flex flex-col items-center gap-1">
              <span>CURRENT RANK</span>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute w-24 h-24 bg-[#1B1B1B] rounded-full z-0 border border-[#2B2A2B] shadow-md" />

                <img
                  src={getRankImage(summonerInfo?.rank)}
                  alt="Rank Icon"
                  className="w-32 h-32 z-10 relative"
                  draggable={false}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#BFC5C6]"> {summonerInfo?.rank} </span>
                <span className="text-[#5B5555]">{summonerInfo?.lp} LP</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[#E3E3E3]">HIGHEST RANK</span>
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Cerchio dietro */}
                <div className="absolute w-24 h-24 bg-[#1B1B1B] rounded-full z-0 border border-[#2B2A2B] shadow-md" />

                {/* Immagine sopra */}
                <img
                  src={getRankImage(summonerInfo?.peakRank)}
                  className="w-32 h-32 z-10 relative"
                  draggable={false}
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#BFC5C6]">{summonerInfo?.peakRank}</span>
                <span className="text-[#5B5555]">{summonerInfo?.peakLp} LP</span>
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
                  <div className="flex justify-end cursor-clicker text-2xl"
                    onClick={() => {
                      if (summonerInfo) {
                        navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`)
                      }
                    }}>
                    <span className="text-[#D7D8D9]">{summonerInfo?.name}</span>
                    <span className="text-[#BCC9C6]">#{summonerInfo?.tag}</span>
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
                  src={`https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${summonerInfo?.profileIconId}.png`}

                  className={cn(
                    "w-full h-full rounded-xl select-none pointer-events-none border-2",
                    summonerInfo?.live ? "border-[#00D992]" : "border-transparent"
                  )}
                  draggable={false}
                />
                {summonerInfo?.live && summonerInfo?.puuid && (
                  <LiveViewer puuid={summonerInfo.puuid} riotId={`${summonerInfo.name}#${summonerInfo.tag}`} region={region!} />
                )}
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-4">
            <nav className="w-full bg-[#1B1B1B] text-flash px-8 h-8 rounded-md border border-[#2B2A2B] shadow-md font-jetbrain s">
              <div className="flex items-center h-full justify-between ">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors font-thin">
                    <span className="text-sm  tracking-wide">RANKED SOLO / DUO</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
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
                    className="flex items-center gap-4 p-3 rounded-md h-28 bg-[#1f1f1f]"
                  >
                    <Skeleton className="w-12 h-12 rounded-md" />
                    <div className="flex flex-col gap-2 w-full">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : matches.length === 0 ? (
              <p className="text-muted-foreground mt-4">Nessuna partita trovata.</p>
            ) : (
              <ul className="space-y-3 mt-4">
                {filteredMatches.map(({ match, win, championName, }) => {
                  const queueId = match.info.queueId;
                  const queueLabel = queueTypeMap[queueId] || "Unknown Queue";
                  const participants = match.info.participants;
                  const team1 = participants.filter(p => p.teamId === 100);
                  const team2 = participants.filter(p => p.teamId === 200);
                  const itemKeys: (keyof Participant)[] = ["item0", "item1", "item2", "item3", "item4", "item5"];

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
                      className="relative gap-4  text-flash p-2 rounded-md transition-colors duration-300 bg-[#1B1B1B] border border-[#2B2A2B]"
                    >
                      {/* ✅ LAYER CLICCABILE */}
                      <div
                        onClick={() => navigate(`/matches/${match.metadata.matchId}`, {
                          state: {
                            focusedPlayerPuuid: summonerInfo?.puuid
                          }
                        })}
                        className="absolute inset-0 z-0 rounded-md transition-colors cursor-clicker"
                      />

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
                            <div
                              onClick={() => navigate(`/matches/${match.metadata.matchId}`, {
                                state: {
                                  focusedPlayerPuuid: summonerInfo?.puuid
                                }
                              })}
                              className="absolute inset-0 z-10 cursor-clicker transition-colors rounded-sm"
                            />

                            {/* Testi sopra lo sfondo - con z-20 */}
                            <span className="relative z-20">{queueLabel}</span>
                            <span className="absolute left-1/2 transform -translate-x-1/2 z-20">
                              {Math.floor(match.info.gameDuration / 60)}:
                              {(match.info.gameDuration % 60).toString().padStart(2, "0")}
                            </span>
                            <span className="relative z-20">{timeAgo(match.info.gameStartTimestamp)}</span>
                          </div>

                          <div className="relative flex justify-between">
                            <div
                              onClick={() => navigate(`/matches/${match.metadata.matchId}`, {
                                state: {
                                  focusedPlayerPuuid: summonerInfo?.puuid
                                }
                              })}
                              className="absolute inset-0 z-10 rounded-md transition-colors cursor-clicker"
                            />
                            <div className="relative z-40 flex justify-between w-full" style={{ pointerEvents: "none" }}>
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
                                                <img
                                                  src={`${CDN_BASE_URL}/img/item/${itemId}.png`}
                                                  alt={`Item ${itemId}`}
                                                  className="w-full h-full rounded-sm"
                                                />
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

                                      return (
                                        <li key={p.puuid} className="flex items-center gap-2 bg">
                                          <img
                                            src={`${champPath}/${p.championName}.png`}
                                            alt={p.championName}
                                            className="w-4 h-4 rounded-sm"
                                          />
                                          {riotName && tag ? (
                                            <Link
                                              to={`/summoners/${region}/${riotName}-${tag}`}
                                              className={cn("truncate hover:underline text-flash/50", isCurrentUser && "font-bold text-jade")}
                                            >
                                              {showName}
                                            </Link>
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

                                      return (
                                        <li key={p.puuid} className="flex items-center justify-end gap-2">
                                          {riotName && tag ? (
                                            <Link
                                              to={`/summoners/${region}/${riotName}-${tag}`}
                                              className={cn("truncate hover:underline text-flash/50", isCurrentUser && "font-bold text-jade")}
                                            >
                                              {showName}
                                            </Link>
                                          ) : (
                                            <span className="truncate text-right">{showName}</span>
                                          )}
                                          <img
                                            src={`${champPath}/${p.championName}.png`}
                                            alt={p.championName}
                                            className="w-4 h-4 rounded-sm"
                                          />
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



