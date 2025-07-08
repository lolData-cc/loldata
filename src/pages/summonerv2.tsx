import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { MatchWithWin, SummonerInfo, ChampionStats } from "@/assets/types/riot"
import { Toggle } from "@/components/ui/toggle"
import { ChevronDown, Star } from "lucide-react"
import { UpdateButton } from "@/components/update"
import { LiveViewer } from "@/components/liveviewer"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"


const COOLDOWN_MS = 2000
const STORAGE_KEY = "loldata:updateTimestamp"

export default function SummonerPageV2(){

    const [latestPatch, setLatestPatch] = useState("15.13.1")
    const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null)
    const [topChampions, setTopChampions] = useState<ChampionStats[]>([])
    const [loading, setLoading] = useState(false)
    const [onCooldown, setOnCooldown] = useState(false)
    const { slug } = useParams()
    const [name, tag] = slug?.split("-") ?? []
    const [matches, setMatches] = useState<MatchWithWin[]>([])

    
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

    async function refreshData() {
        if (!name || !tag) return

        setLoading(true)
        setSummonerInfo(null)
        setMatches([])

        const [summoner, matchData] = await Promise.all([
        fetchSummonerInfo(name, tag),
        fetchMatches(name, tag),
        ])

        setLoading(false)
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        setOnCooldown(true)
        setTimeout(() => setOnCooldown(false), COOLDOWN_MS)
  }

    return (
        <div className="w-full">
            <div className="flex w-fit space-x-4 p-6 border bg-flash/2 border-flash/10 rounded-lg">
                <div className="relative w-28 h-28">
                    {loading ? <Skeleton className="rounded-md w-28 h-28"/> :
                    <img
                    src={`https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${summonerInfo?.profileIconId}.png`}
                    alt="Icona profilo"
                    className={cn(
                        "w-full h-full rounded-md select-none pointer-events-none border",
                        summonerInfo?.live ? "border-jade" : "border-transparent"
                    )}
                    draggable={false}
                    />
                    }
                    
                    {summonerInfo?.live && summonerInfo?.puuid && (
                    <LiveViewer puuid={summonerInfo.puuid} />
                    )}
                </div>

                <div className="flex flex-col space-y-1">

                    {loading ? <Skeleton className="rounded-sm w-40 h-4"/> :                       
                    <div className="text-xs text-flash/30">
                        LEVEL {summonerInfo?.level} | RANK 23.329
                    </div>}

                    {loading ? <Skeleton className="rounded-sm w-80 h-8"/> : 
                    <div
                    className="uppercase text-2xl cursor-pointer select-none font-semibold"
                    onClick={() => {
                        if (summonerInfo) {
                        navigator.clipboard.writeText(`${summonerInfo.name}#${summonerInfo.tag}`)
                        }
                    }}
                    title="Copy"
                    >
                        <div className="flex space-x-2 w-80">
                            <span className="text-flash">{summonerInfo?.name}</span>
                            
                            <span className="text-flash/40">#{summonerInfo?.tag}</span>
                        </div>

                    </div>
                    }
                    
                    
                    <div className=" flex-1 grid place-content-end">
                        <div>
                            <UpdateButton onClick={refreshData} loading={loading} cooldown={onCooldown} />
                        </div>
                    </div>

                </div>
            </div>

        </div>
    )
}