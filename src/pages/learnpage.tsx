import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table"
import { ChevronsUp, ChevronsDown } from "lucide-react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import LoldataAIChat from "@/components/loldataaichat"
import Overview from "@/components/overview"
import { motion, AnimatePresence } from "framer-motion"
import { API_BASE_URL } from "@/config"

dayjs.extend(relativeTime)

const aiUrl = `${API_BASE_URL}/api/chat/ask`

// ── Rank utilities ──
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
        const map: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" }
        division = map[division] || "I"
    }
    const tierIndex = tierOrder.indexOf(tier)
    const divisionIndex = divisionOrder.indexOf(division)
    if (tierIndex === -1 || divisionIndex === -1) return 0
    return tierIndex * 4 + (3 - divisionIndex)
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
        const map: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV" }
        divisionRaw = map[divisionRaw] || "I"
    }
    const numericLp = Number(lp)
    const tierIndex = tierOrder.indexOf(tierRaw)
    const divisionIndex = divisionOrder.indexOf(divisionRaw)
    if (tierIndex === -1 || divisionIndex === -1 || isNaN(numericLp)) return 0
    return tierIndex * 400 + (3 - divisionIndex) * 100 + numericLp
}

function getLpDelta(prev: any, curr: any): number {
    if (!prev || !curr) return 0
    if (prev.rank === curr.rank) return Number(curr.lp) - Number(prev.lp)
    return getAbsoluteLp(curr.rank, curr.lp) - getAbsoluteLp(prev.rank, prev.lp)
}

// ── Tab definitions ──
const TABS = [
    { id: "overview", label: "OVERVIEW", desc: "Daily report" },
    { id: "games", label: "YOUR GAMES", desc: "Tracked history" },
    { id: "itemization", label: "ITEMIZATION", desc: "Build intelligence" },
    { id: "loldata-ai", label: "LOLDATA AI", desc: "Ask anything" },
] as const

type TabId = typeof TABS[number]["id"]

export default function LearnPage() {
    const { nametag, puuid, region } = useAuth()
    const [activeTab, setActiveTab] = useState<TabId>("overview")
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
            if (error || !data) { setLoadingGames(false); return }
            setGamesList(data.map((game) => ({ ...game, day: dayjs(game.created_at).format("YYYY-MM-DD") })))
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
        <div className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen flex flex-col overflow-hidden">
            {/* Navbar */}
            <div className="w-full flex justify-center">
                <div className="w-[65%]"><Navbar /></div>
            </div>
            <Separator className="bg-flash/[0.08] w-full shrink-0" />

            {/* Main layout — 70% centered with floating sidebar */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                <div className="w-[65%] mx-auto py-6 relative">
                    {/* ── Sidebar — positioned at left edge of 65% container, doesn't affect content flow ── */}
                    <div className="absolute left-0 top-6 w-[160px]">
                        <div className="relative">
                            {/* Header */}
                            <div className="mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-jade rounded-full animate-pulse" />
                                    <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/70">AI LEARN</span>
                                </div>
                                {nametag && (
                                    <span className="text-[10px] font-mono text-flash/25 mt-1.5 block truncate">{nametag}</span>
                                )}
                            </div>

                            <div className="h-px bg-flash/[0.06] mb-4" />

                            {/* Navigation */}
                            <nav>
                                <div className="flex flex-col gap-0.5">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                "relative w-full text-left px-4 py-2.5 rounded-sm cursor-clicker transition-colors duration-200 border-l-2",
                                                activeTab === tab.id
                                                    ? "text-jade border-jade"
                                                    : "text-flash/35 hover:text-flash/55 border-transparent"
                                            )}
                                        >
                                            <span className="text-[10px] font-mono tracking-[0.18em] uppercase block leading-none">
                                                {tab.label}
                                            </span>
                                            <span className={cn(
                                                "text-[8px] font-mono tracking-[0.1em] mt-0.5 block transition-colors duration-200",
                                                activeTab === tab.id ? "text-jade/40" : "text-flash/15"
                                            )}>
                                                {tab.desc}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* ── Content — offset to avoid sidebar overlap ── */}
                    <div className="ml-[180px] max-w-[calc(100%-180px)]">
                        <AnimatePresence mode="wait">
                            {/* OVERVIEW */}
                            {activeTab === "overview" && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Overview puuid={puuid ?? null} region={region ?? null} nametag={nametag ?? null} />
                                </motion.div>
                            )}

                            {/* YOUR GAMES */}
                            {activeTab === "games" && (
                                <motion.div
                                    key="games"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="mb-6">
                                        <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50">// TRACKED GAMES</span>
                                    </div>

                                    {loadingGames ? (
                                        <p className="text-flash/30 font-mono text-sm">Loading...</p>
                                    ) : sortedDays.length === 0 ? (
                                        <p className="text-flash/30 font-mono text-sm">No tracked games yet</p>
                                    ) : (
                                        sortedDays.map((day, index) => {
                                            const todayGames = gamesByDay[day]
                                            if (!todayGames?.length) return null

                                            const firstGame = todayGames[0]
                                            const lastGame = todayGames[todayGames.length - 1]
                                            const todayDate = dayjs(day)
                                            const previousGame = [...gamesList].reverse().find(g => dayjs(g.created_at).isBefore(todayDate, "day"))
                                            const startAbs = previousGame ? getAbsoluteLp(previousGame.rank, previousGame.lp) : getAbsoluteLp(firstGame.rank, firstGame.lp)
                                            const endAbs = getAbsoluteLp(lastGame.rank, lastGame.lp)
                                            const totalLp = endAbs - startAbs
                                            const relative = dayjs(day).isSame(dayjs(), "day") ? "Today" : dayjs(day).fromNow()

                                            return (
                                                <div key={day} className="mb-8">
                                                    <div className="flex items-baseline gap-2 mb-3">
                                                        <span className="text-[11px] font-mono text-flash/60">{relative}</span>
                                                        <span className={cn("text-[11px] font-mono tabular-nums", totalLp >= 0 ? "text-jade/60" : "text-red-400/60")}>
                                                            {totalLp >= 0 ? "+" : ""}{totalLp} LP
                                                        </span>
                                                    </div>

                                                    <Table className="w-full uppercase">
                                                        <TableHeader>
                                                            <TableRow className="border-flash/[0.06]">
                                                                <TableHead className="text-[9px] tracking-[0.15em] text-flash/25 w-[18%]">CHAMPION</TableHead>
                                                                <TableHead className="text-[9px] tracking-[0.15em] text-flash/25 w-[12%]">LANE</TableHead>
                                                                <TableHead className="text-[9px] tracking-[0.15em] text-flash/25 w-[18%]">MATCHUP</TableHead>
                                                                <TableHead className="text-[9px] tracking-[0.15em] text-flash/25 w-[15%]">QUEUE</TableHead>
                                                                <TableHead className="text-[9px] tracking-[0.15em] text-flash/25 w-[12%] text-center">LP</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {[...todayGames].reverse().map((g) => {
                                                                const i = gamesList.findIndex(x => x.id === g.id)
                                                                const prev = gamesList[i - 1]
                                                                const diff = prev ? getLpDelta(prev, g) : 0
                                                                const rankChange = getRankChange(prev, g)
                                                                const rankParts = g.rank?.split(" ") || []
                                                                const tierInitial = rankParts[0]?.[0]?.toUpperCase() || ""
                                                                const division = rankParts[1] || ""
                                                                const shortRank = `${tierInitial}${division}`

                                                                return (
                                                                    <TableRow key={g.id} className="border-flash/[0.04] text-[11px] font-mono">
                                                                        <TableCell className="text-flash/60">{g.champion_name}</TableCell>
                                                                        <TableCell className="text-flash/40">{g.lane}</TableCell>
                                                                        <TableCell className="text-flash/40">{g.matchup}</TableCell>
                                                                        <TableCell className="text-flash/30">{g.queue_type}</TableCell>
                                                                        <TableCell className="text-center">
                                                                            <span className={cn(
                                                                                "inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-sm text-[10px] tabular-nums",
                                                                                diff > 0 ? "bg-jade/10 text-jade" : diff < 0 ? "bg-red-400/10 text-red-400" : "text-flash/30"
                                                                            )}>
                                                                                {rankChange === "up" && <><ChevronsUp className="w-3 h-3" />{shortRank}</>}
                                                                                {rankChange === "down" && <><ChevronsDown className="w-3 h-3" />{shortRank}</>}
                                                                                {!rankChange && `${diff >= 0 ? "+" : ""}${diff}`}
                                                                            </span>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            })}
                                                        </TableBody>
                                                    </Table>

                                                    {index !== sortedDays.length - 1 && (
                                                        <div className="flex justify-center my-4">
                                                            <div className="w-px h-8 bg-gradient-to-b from-flash/10 to-transparent" />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </motion.div>
                            )}

                            {/* ITEMIZATION */}
                            {activeTab === "itemization" && (
                                <motion.div
                                    key="itemization"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col items-center justify-center h-48 gap-2"
                                >
                                    <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50">// ITEMIZATION</span>
                                    <span className="text-flash/40 font-mono text-sm">Build intelligence coming soon</span>
                                    <span className="text-flash/20 font-mono text-[10px]">Compare your builds with Diamond+ optimal paths</span>
                                </motion.div>
                            )}

                            {/* LOLDATA AI */}
                            {activeTab === "loldata-ai" && (
                                <motion.div
                                    key="loldata-ai"
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-[calc(100vh-140px)]"
                                >
                                    <div className="mb-4">
                                        <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50">// LOLDATA AI</span>
                                    </div>
                                    <div className="h-[calc(100%-32px)]">
                                        <LoldataAIChat
                                            apiUrl={aiUrl}
                                            contextHint={nametag ? `User: ${nametag}` : undefined}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    )
}
