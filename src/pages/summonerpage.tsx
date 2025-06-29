import { useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { LiveViewer } from "@/components/liveviewer"
import { Navbar } from "@/components/navbar"
import { ChevronDown } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { Star } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UpdateButton } from "@/components/update"
import { Skeleton } from "@/components/ui/skeleton"

type MatchWithWin = {
  match: any
  win: boolean
  championName: string
}

const COOLDOWN_MS = 300_000 // 5 minutes
const STORAGE_KEY = "loldata:updateTimestamp"

export default function SummonerPage() {
  const { slug } = useParams()
  const [matches, setMatches] = useState<MatchWithWin[]>([])
  const [loading, setLoading] = useState(false)
  const [onCooldown, setOnCooldown] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState("RANKED SOLO / DUO")
  const [name, tag] = slug?.split("-") ?? []
  const [latestPatch, setLatestPatch] = useState("15.13.1")
  const [views, setViews] = useState<number | null>(null)

  const [summonerInfo, setSummonerInfo] = useState<{
    rank: string
    lp: number
    wins: number
    losses: number
    profileIconId: number
    level: number
    name: string
    tag: string
    live: boolean
  } | null>(null)

  const queueOptions = [
    "RANKED SOLO / DUO",
    "RANKED FLEX",
    "DRAFTS"
  ]

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

  async function refreshData() {
    if (!name || !tag) return;

    setLoading(true);
    setSummonerInfo(null);
    setMatches([]);

    const [summoner, matches] = await Promise.all([
      fetchSummonerInfo(name, tag),
      fetchMatches(name, tag),
    ]);

    await fetch("http://localhost:3001/api/profile/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    }).catch(console.error);

    await fetch("http://localhost:3001/api/profile/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    })
      .then(res => res.json())
      .then(data => setViews(data.views))
      .catch(console.error);


    setLoading(false);

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
    setSummonerInfo(data.summoner)
  }

  async function fetchMatches(name: string, tag: string) {
    const res = await fetch("http://localhost:3001/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tag }),
    })
    const data = await res.json()
    setMatches(data.matches || [])
  }

  useEffect(() => {
    if (!name || !tag) return;
    refreshData();
  }, [name, tag]);


  return (
    <div>
      <Navbar />

      <div className="flex h-screen">
        <div className="w-2/5 flex justify-center">
          <div className="w-[90%] bg-[#1f1f1f] h-[400px] pt-3 pl-4 text-sm font-thin rounded-md mt-5">
            <DropdownMenu>
              <DropdownMenuTrigger className="w-52 px-3 py-2 rounded-md bg-card text-card-foreground flex items-center gap-2">
                {selectedQueue}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-none shadow rounded-md z-10">
                {queueOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => setSelectedQueue(option)}
                    className={cn(
                      "cursor-pointer",
                      selectedQueue === option
                        ? "bg-[#00D992] text-black"
                        : "hover:bg-[#00D992] hover:text-black"
                    )}
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="z-0">rank: {summonerInfo?.rank}</div>
          </div>
        </div>

        <div className="w-4/5">
          <div className="flex justify-end">
            <div className="mr-4 mt-16">
              <div
                className="uppercase text-3xl cursor-pointer select-none"
                onClick={() => {
                  if (summonerInfo) {
                    navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`)
                  }
                }}
                title="Clicca per copiare"
              >
                <Toggle className="hover:bg-[#11382E]">
                  <Star className="text-blue-400"/>
                </Toggle>
                <p className="text-[#5B5555] text-sm justify-end text-right font-thin">LEVEL {summonerInfo?.level} | RANK 23.329</p>
                <div className="">
                  <span className="text-[#D7D8D9]">{summonerInfo?.name}</span>
                  <span className="text-[#BCC9C6]">#{summonerInfo?.tag}</span>
                </div>

              </div>
              <div className="mt-2 flex justify-end">
                <UpdateButton onClick={refreshData} loading={loading} cooldown={onCooldown} />
              </div>
            </div>

            <div className="relative w-40 h-40 mt-4 mr-4">
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${summonerInfo?.profileIconId}.png`}
                alt="Icona profilo"
                className={cn(
                  "w-full h-full rounded-xl select-none pointer-events-none border-2",
                  summonerInfo?.live ? "border-[#00D992]" : "border-transparent"
                )}
                draggable={false}
              />
              {summonerInfo?.live && <LiveViewer />}
            </div>
          </div>

          <div className="p-6 max-w-4xl mx-auto">
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
                {matches.map(({ match, win, championName }) => (
                  <li
                    key={match.metadata.matchId}
                    className={`flex items-center gap-4 text-white p-3 rounded-md h-28 transition-colors duration-300 ${win
                      ? "bg-gradient-to-r from-[#11382E] to-[#00D992]"
                      : "bg-gradient-to-r from-[#420909] to-[#c93232]"
                      }`}
                  >
                    <img
                      src={`https://opgg-static.akamaized.net/meta/images/lol/${latestPatch}/champion/${championName}.png`}
                      alt={championName}
                      className="w-12 h-12 rounded-md"
                    />
                    <span className="text-sm font-semibold">
                      Match ID: {match.metadata.matchId}
                    </span>
                  </li>
                ))}
              </ul>
            )}


          </div>
        </div>
      </div>
    </div>
  )
}
