import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell
} from "@/components/ui/table"
import { Airplay, ChevronsUp, ChevronsDown } from "lucide-react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import LoldataAIChat from "@/components/loldataaichat"
import Overview from "@/components/overview"


dayjs.extend(relativeTime)

// Rank conversion
const tierOrder = [
    "IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM",
    "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"
]
const divisionOrder = ["I", "II", "III", "IV"]

function getRankTierValue(rank: string): number {
    if (!rank) return 0

    const parts = rank.trim().split(" ")
    if (parts.length < 2) return 0

    const tier = parts[0]?.toUpperCase()
    let division = parts[1]?.toUpperCase()

    if (!isNaN(Number(division))) {
        const map: Record<string, string> = {
            "1": "I",
            "2": "II",
            "3": "III",
            "4": "IV"
        }
        division = map[division] || "I"
    }

    const tierIndex = tierOrder.indexOf(tier)
    const divisionIndex = divisionOrder.indexOf(division)

    if (tierIndex === -1 || divisionIndex === -1) return 0

    return tierIndex * 4 + (3 - divisionIndex) // più alto = rank migliore
}
function getRankChange(prev: any, curr: any): "up" | "down" | null {
    if (!prev || !curr) return null

    const prevVal = getRankTierValue(prev.rank)
    const currVal = getRankTierValue(curr.rank)

    if (currVal > prevVal) return "up"
    if (currVal < prevVal) return "down"
    return null
}
function getAbsoluteLp(rank: string, lp: any): number {
    if (!rank || lp === undefined || lp === null) return 0

    const parts = rank.trim().split(" ")
    if (parts.length < 2) return 0

    const tierRaw = parts[0]?.toUpperCase()
    let divisionRaw = parts[1]?.toUpperCase()

    if (!isNaN(Number(divisionRaw))) {
        const map: Record<string, string> = {
            "1": "I",
            "2": "II",
            "3": "III",
            "4": "IV"
        }
        divisionRaw = map[divisionRaw] || "I"

    }

    const numericLp = Number(lp)
    const tierIndex = tierOrder.indexOf(tierRaw)
    const divisionIndex = divisionOrder.indexOf(divisionRaw)

    if (
        tierIndex === -1 ||
        divisionIndex === -1 ||
        isNaN(numericLp)
    ) {
        console.warn(`Invalid rank or LP: rank="${rank}", lp="${lp}"`)
        return 0
    }

    const baseTierLp = tierIndex * 400
    const baseDivisionLp = (3 - divisionIndex) * 100
    return baseTierLp + baseDivisionLp + numericLp
}

function getLpDelta(prev: any, curr: any): number {
    if (!prev || !curr) return 0

    if (prev.rank === curr.rank) {
        return Number(curr.lp) - Number(prev.lp)
    }

    const prevAbs = getAbsoluteLp(prev.rank, prev.lp)
    const currAbs = getAbsoluteLp(curr.rank, curr.lp)
    return currAbs - prevAbs
}

export default function LearnPage() {
    const { nametag, puuid, region } = useAuth()
    const [gamesList, setGamesList] = useState<any[]>([])
    const [loadingGames, setLoadingGames] = useState(true)

    useEffect(() => {
        const fetchGames = async () => {
            if (!nametag) return

            const { data, error } = await supabase
                .from("tracked_games")
                .select("*")
                .eq("nametag", nametag)
                .order("created_at", { ascending: true })

            if (error || !data) {
                console.error("Error fetching games:", error)
                setLoadingGames(false)
                return
            }

            const withMeta = data.map((game) => ({
                ...game,
                day: dayjs(game.created_at).format("YYYY-MM-DD")
            }))

            setGamesList(withMeta)
            setLoadingGames(false)
        }

        fetchGames()
    }, [nametag])

    const gamesByDay = gamesList.reduce((acc: Record<string, any[]>, game) => {
        if (!acc[game.day]) acc[game.day] = []
        acc[game.day].push(game)
        return acc
    }, {})

    const sortedDays = Object.keys(gamesByDay).sort().reverse()

    return (
        <div className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen flex justify-center overflow-hidden">
            <div className="xl:px-0 w-full px-4 flex flex-col items-center h-screen">
                <div className="w-[65%]">
                    <Navbar />
                </div>

                <Separator className="bg-flash/20 mt-0 w-screen" />

                <Tabs defaultValue="overview" className="flex w-full h-full gap-4">
                    <div className="border-r border-flash/10 h-full w-[30%] flex flex-col">
                        <div className="flex items-center gap-1.5 justify-end font-sourcecode font-extralight text-pine text-xl px-12 py-6">
                            <img src="/public/logo.png" className="w-8 h-8" alt="" />
                            <span>AI Learn</span>
                        </div>
                        <Separator className="bg-flash/20 w-full" />

                        <div className="px-12 py-12 flex justify-end">
                            <TabsList className="flex flex-col gap-2 bg-transparent">
                                
                                <TabsTrigger
                                    value="games"
                                    className="flex gap-2 items-center justify-end px-4 pl-24 py-1 rounded-[4px] data-[state=active]:bg-jade/20 data-[state=active]:text-jade text-flash/30 cursor-clicker"
                                >
                                    <Airplay className="w-4 h-4 relative" />
                                    <span>Your Games</span>
                                </TabsTrigger>

                                <TabsTrigger
                                    value="goals"
                                    className="flex gap-2 items-center justify-end px-4 pl-24 py-1 rounded-[4px] data-[state=active]:bg-jade/20 data-[state=active]:text-jade text-flash/30 cursor-clicker"
                                >
                                    <Airplay className="w-4 h-4 relative" />
                                    <span>Your Goals </span>

                                </TabsTrigger>
                                <TabsTrigger
                                    value="loldata-ai"
                                    className="flex gap-2 items-center justify-end px-4 pl-24 py-1 rounded-[4px] data-[state=active]:bg-jade/20 data-[state=active]:text-jade text-flash/30 cursor-clicker"
                                >
                                    <Airplay className="w-4 h-4 relative" />
                                    <span>LOLDATA AI</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </div>

                    <div className="w-[52.5%] h-full p-6 overflow-hidden">


                        <TabsContent value="overview">
                            <Overview nametag="ROT KARI#KURVE" region={region ?? null} puuid={puuid ?? null} />
                        </TabsContent>

                        <TabsContent value="games" className="p-4 -full overflow-hidden">
                            <div className="h-full overflow-y-auto pr-2 scrollbar-hide">
                                <h2 className="text-jade text-4xl mb-8">
                                    Your games
                                </h2>

                                {loadingGames ? (
                                    <p className="text-flash/50">Loading tracked games...</p>
                                ) : (
                                    sortedDays.map((day, index) => {
                                        const todayGames = gamesByDay[day]
                                        if (!todayGames?.length) return null

                                        const firstGame = todayGames[0]
                                        const lastGame = todayGames[todayGames.length - 1]

                                        // Trova il game precedente
                                        const todayDate = dayjs(day)
                                        const previousGame = [...gamesList]
                                            .reverse()
                                            .find(g => dayjs(g.created_at).isBefore(todayDate, "day"))

                                        const startAbs = previousGame
                                            ? getAbsoluteLp(previousGame.rank, previousGame.lp)
                                            : getAbsoluteLp(firstGame.rank, firstGame.lp)

                                        const endAbs = getAbsoluteLp(lastGame.rank, lastGame.lp)

                                        const totalLp = endAbs - startAbs

                                        console.log(`[DEBUG] startAbs: ${startAbs} – endAbs: ${endAbs} – delta: ${totalLp}`)

                                        const relative = dayjs(day).isSame(dayjs(), "day")
                                            ? "Today"
                                            : dayjs(day).fromNow()

                                        return (
                                            <div key={day} className="mb-10">
                                                <div className="text-xl text-jade mb-2">
                                                    <span className="text-flash">{relative} </span>
                                                    <span className={`text-[16px] ${totalLp < 0 ? "text-red-400" : ""}`}>
                                                        {totalLp >= 0 ? "+" : ""}{totalLp} LP
                                                    </span>
                                                </div>
                                                <div>

                                                </div>
                                                <Table className="w-[80%] uppercase">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-[15%]">CHAMPION</TableHead>
                                                            <TableHead className="w-[15%]">LANE</TableHead>
                                                            <TableHead className="w-[15%]">MATCHUP</TableHead>
                                                            <TableHead className="w-[15%]">QUEUE</TableHead>
                                                            <TableHead className="w-[10%] text-center">LP</TableHead>
                                                            <TableHead className="w-[15%] text-center"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {[...todayGames].reverse().map((g) => (
                                                            <TableRow key={g.id}>
                                                                <TableCell>{g.champion_name}</TableCell>
                                                                <TableCell>{g.lane}</TableCell>
                                                                <TableCell>{g.matchup}</TableCell>
                                                                <TableCell>{g.queue_type}</TableCell>
                                                                <TableCell className="text-center">
                                                                    {(() => {
                                                                        const i = gamesList.findIndex(x => x.id === g.id)
                                                                        const prev = gamesList[i - 1]
                                                                        const diff = prev ? getLpDelta(prev, g) : 0

                                                                        const rankChange = getRankChange(prev, g)
                                                                        const rankParts = g.rank?.split(" ") || []
                                                                        const tier = rankParts[0]?.toLowerCase()
                                                                        const tierInitial = tier?.[0]?.toUpperCase() || ""
                                                                        const division = rankParts[1] || ""
                                                                        const shortRank = `${tierInitial}${division}`

                                                                        return (
                                                                            <div
                                                                                className={cn(
                                                                                    "inline-flex items-center justify-center gap-1 py-1 rounded-[3px] w-[80px] text-center",
                                                                                    diff > 0
                                                                                        ? "bg-jade/20 text-jade"
                                                                                        : diff < 0
                                                                                            ? "bg-red-400/10 text-red-400"
                                                                                            : "text-flash"
                                                                                )}
                                                                            >
                                                                                {rankChange === "up" && tier && (
                                                                                    <>
                                                                                        <ChevronsUp className="w-4 h-4 text-jade" />
                                                                                        {/* <img
                                                                                        src={`https://cdn.loldata.cc/15.13.1/img/miniranks/${tier}.png`}
                                                                                        alt={tier}
                                                                                        className="w-4 h-4"
                                                                                    /> */}
                                                                                        <span className="text-jade text-sm">{shortRank}</span>
                                                                                    </>
                                                                                )}
                                                                                {rankChange === "down" && tier && (
                                                                                    <>
                                                                                        <ChevronsDown className="w-4 h-4 text-red-400" />
                                                                                        {/* <img
                                                                                        src={`https://cdn.loldata.cc/15.13.1/img/miniranks/${tier}.png`}
                                                                                        alt={tier}
                                                                                        className="w-4 h-4"
                                                                                    /> */}
                                                                                        <span className="text-red-400 text-sm">{shortRank}</span>
                                                                                    </>
                                                                                )}
                                                                                {!rankChange && (
                                                                                    <span>{`${diff >= 0 ? "+" : ""}${diff} LP`}</span>
                                                                                )}
                                                                            </div>
                                                                        )
                                                                    })()}</TableCell>
                                                                <TableCell></TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>

                                                {index !== sortedDays.length - 1 && (
                                                    <div className="flex flex-col items-center my-4 mr-[90%]">
                                                        <div className="w-3 h-3 bg-jade my-4" />
                                                        <div className="w-3 h-3 bg-jade/80 my-2" />
                                                        <div className="w-1 h-12 bg-jade/60 mt-4" />
                                                        <div className="w-3 h-3 bg-jade/50" />
                                                    </div>
                                                )}

                                            </div>
                                        )
                                    })
                                )}
                            </div>

                        </TabsContent>

                        <TabsContent value="goals">
                            <div className="font-geist mb-4 uppercase">Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</div>
                            <div className="font-jetbrains mb-4 uppercase">Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</div>
                            <div className="font-gtmono mb-4 uppercase">Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</div>
                            <div className="font-vivala uppercase">Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.</div>
                        </TabsContent>

                        <TabsContent value="loldata-ai" className="p-4 h-full">
                            <h2 className="text-jade text-4xl mb-8">LOLDATA AI</h2>
                            <div className="h-[70vh] w-[80%]">
                                <LoldataAIChat
                                    apiUrl="/api/loldata-ai"
                                    contextHint={nametag ? `User: ${nametag}` : undefined}
                                />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}
