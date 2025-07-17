import type { MatchWithWin, SummonerInfo, ChampionStats } from "@/assets/types/riot"
import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { LiveViewer } from "@/components/liveviewer"
import { ChevronDown, Star } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { getRankImage } from "@/utils/rankIcons"
import { getWinrateClass } from '@/utils/winratecolor'
import { ChampionPicker } from "@/components/championpicker"
import { getKdaClass } from '@/utils/kdaColor'
import { formatStat } from "@/utils/formatStat"
import { timeAgo } from '@/utils/timeAgo';
import { champPath } from "@/config"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UpdateButton } from "@/components/update"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ShowMoreMatches } from "@/components/showmorematches"

const COOLDOWN_MS = 300_000
const STORAGE_KEY = "loldata:updateTimestamp"

export default function SummonerPage() {
  const { slug } = useParams()
  const [matches, setMatches] = useState<MatchWithWin[]>([])
  const [loading, setLoading] = useState(false)
  const [onCooldown, setOnCooldown] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState("RANKED SOLO / DUO")
  const [name, tag] = slug?.split("-") ?? []
  const [latestPatch, setLatestPatch] = useState("15.13.1")
  const [topChampions, setTopChampions] = useState<ChampionStats[]>([])
  const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null)
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null)
  const [allChampions, setAllChampions] = useState<{ id: string; name: string }[]>([])


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

  async function refreshData() {
    if (!name || !tag) return

    setLoading(true)
    setSummonerInfo(null)
    setMatches([])

    const [summoner, matchData] = await Promise.all([
      fetchSummonerInfo(name, tag),
      fetchMatches(name, tag),
    ])

    await fetch("http://localhost:3001/api/profile/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    }).catch(console.error)

    await fetch("http://localhost:3001/api/profile/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    })
      .then(res => res.json())
      .then(data => setViews(data.views))
      .catch(console.error)

    setLoading(false)
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setOnCooldown(true)
    setTimeout(() => setOnCooldown(false), COOLDOWN_MS)
  }

  async function fetchSummonerInfo(name: string, tag: string) {
    const res = await fetch("http://localhost:3001/api/summoner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    })
    const data = await res.json()
    setSummonerInfo(data.summoner as SummonerInfo)
  }

  async function fetchMatches(name: string, tag: string) {
    const res = await fetch("http://localhost:3001/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    })
    const data = await res.json()
    setMatches(data.matches || [])
    setTopChampions(data.topChampions || [])
  }

  const filteredMatches = selectedChampion
    ? matches.filter((m) => m.championName === selectedChampion)
    : matches


  return (
    <div className="">
      <div className="flex min-h-screen -mt-4">
        <div className="w-[30%] min-w-[30%] flex justify-center">
          <div className="w-[90%] bg-[#1f1f1f] h-[420px] text-sm font-thin rounded-md mt-5 border border-[#2B2A2B] shadow-md">
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
                      {/* Colonna 1: Champion info */}
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

          <div className="flex justify-between items-start mt-4 px-4 w-full min-w-full max-w-full">
            {/* SEZIONE SINISTRA: nuove icone */}
            <div className="flex flex-col items-center gap-1">
              <span>CURRENT RANK</span>
              <div className="relative w-32 h-32 flex items-center justify-center">
                <div className="absolute w-24 h-24 bg-[#1f1f1f] rounded-full z-0 border border-[#2B2A2B] shadow-md" />

                <img
                  src={getRankImage(summonerInfo?.rank)}
                  alt="Rank Icon"
                  className="w-32 h-32 z-10 relative"
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
                <div className="absolute w-24 h-24 bg-[#1f1f1f] rounded-full z-0 border border-[#2B2A2B] shadow-md" />

                {/* Immagine sopra */}
                <img
                  src="/public/master.png"
                  className="w-32 h-32 z-10 relative"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#BFC5C6]">MASTER</span>
                <span className="text-[#5B5555]">461 LP</span>
              </div>
            </div>
            <div>
            </div>


            {/* SEZIONE DESTRA: info summoner */}
            <div className="flex items-start">
              <div className="mr-4 mt-4">
                <div
                  className="uppercase text-2xl cursor-pointer select-none"
                  onClick={() => {
                    if (summonerInfo) {
                      navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`)
                    }
                  }}
                  title="Clicca per copiare"
                >
                  <div className="flex justify-end">
                    <Toggle className="data-[state=on]:bg-[#11382E] hover:bg-[#11382E]">
                      <Star className="text-[#01D18D]" />
                    </Toggle>
                  </div>

                  <p className="text-[#5B5555] text-sm justify-end text-right font-thin">
                    LEVEL {summonerInfo?.level} | RANK 23.329
                  </p>
                  <div className="flex justify-end">
                    <span className="text-[#D7D8D9]">{summonerInfo?.name}</span>
                    <span className="text-[#BCC9C6]">#{summonerInfo?.tag}</span>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  <UpdateButton onClick={refreshData} loading={loading} cooldown={onCooldown} />
                </div>
              </div>

              <div className="relative w-40 h-40 mr-4">
                <img
                  src={`https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${summonerInfo?.profileIconId}.png`}

                  className={cn(
                    "w-full h-full rounded-xl select-none pointer-events-none border-2",
                    summonerInfo?.live ? "border-[#00D992]" : "border-transparent"
                  )}
                  draggable={false}
                />
                {summonerInfo?.live && summonerInfo?.puuid && (
                  <LiveViewer puuid={summonerInfo.puuid} riotId={`${summonerInfo.name}#${summonerInfo.tag}`} />
                )}
              </div>
            </div>
          </div>

          <div className="p-6 max-w-4xl mx-auto">
            <nav className="w-full bg-[#1f1f1f] px-8 h-10 rounded-md border border-[#2B2A2B] shadow-md">

              <div className="flex items-center h-full justify-between">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors">
                    <span className="text-sm font-medium tracking-wide">RANKED SOLO / DUO</span>
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                </DropdownMenu>

                <Separator orientation="vertical" className="h-4 bg-[#48504E] " />

                <div className="space-x-2 flex items-center">
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
                {filteredMatches.map(({ match, win, championName,  }) => {
                  const queueId = match.info.queueId;
                  const queueLabel = queueTypeMap[queueId] || "Unknown Queue";

                  return (
                    <li
                      key={match.metadata.matchId}
                      className={`gap-4 text-flash p-2 rounded-md h-28 transition-colors duration-300 ${win
                        ? "bg-gradient-to-r from-[#11382E] to-[#00D992]"
                        : "bg-gradient-to-r from-[#420909] to-[#c93232]"
                        }`}
                    >
                      <div className="flex justify-between text-[11px] uppercase text-flash/70">
                        <span>{queueLabel}</span>
                        <span>{timeAgo(match.info.gameStartTimestamp)}</span>
                      </div>
                      <div>
                        <img
                          src={`${champPath}/${championName}.png`}
                          alt={championName}
                          className="w-12 h-12 rounded-md"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-gtthin font-normal">
                            MATCH ID: {match.metadata.matchId}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



