import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import {
    Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table"
import { ChevronsUp, ChevronsDown, LayoutDashboard, History, Workflow, Sword, Sparkles } from "lucide-react"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"
import LoldataAIChat from "@/components/loldataaichat"
import Overview from "@/components/overview"
import { motion, AnimatePresence } from "framer-motion"
import { API_BASE_URL } from "@/config"

dayjs.extend(relativeTime)

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
    { id: "overview", label: "OVERVIEW", desc: "Daily report", icon: LayoutDashboard },
    { id: "games", label: "YOUR GAMES", desc: "Tracked history", icon: History },
    { id: "explorer", label: "EXPLORER", desc: "Node query builder", icon: Workflow },
    { id: "itemization", label: "ITEMIZATION", desc: "Build intelligence", icon: Sword },
    { id: "loldata-ai", label: "LOLDATA AI", desc: "Ask anything", icon: Sparkles },
] as const

type TabId = typeof TABS[number]["id"]

export default function LearnPage() {
    const { nametag, puuid, region, session } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = (searchParams.get("t") || "overview") as TabId
    const setActiveTab = (id: string) => setSearchParams((p) => { p.set("t", id); return p }, { replace: true })
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
                <div className="w-full lg:w-[65%]"><Navbar /></div>
            </div>
            <Separator className="bg-flash/[0.08] w-full shrink-0" />

            {/* Main layout — 65% centered; EXPLORER breaks out to full width.
                pt-16 on mobile clears the fixed (h-16) navbar; md+ navbar is static. */}
            <div className="flex-1 min-h-0 scrollbar-hide relative overflow-y-auto pt-16 md:pt-0">
                <div className="w-full px-3 lg:w-[65%] lg:px-0 mx-auto py-4 lg:py-6 relative z-10">
                    {/* ── Sidebar — floats; stays interactive even over the full-bleed canvas ── */}
                    <div className="hidden lg:block absolute left-0 top-6 w-[178px] pointer-events-auto">
                        {/* Header */}
                        <div className="mb-5 flex items-center gap-2.5">
                            <span className="relative inline-grid h-4 w-4 place-items-center">
                                <span className="absolute inset-0 rotate-45 rounded-[2px] border border-jade/45 bg-jade/[0.08]" />
                                <span className="absolute h-1 w-1 rounded-full bg-jade animate-pulse" />
                            </span>
                            <div className="min-w-0">
                                <span className="block font-chakrapetch text-[10px] font-bold uppercase tracking-[0.3em] text-jade/70 leading-none">Learn</span>
                                {nametag && <span className="mt-1.5 block truncate font-chakrapetch text-[10px] font-light text-flash/25">{nametag}</span>}
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex flex-col gap-1">
                            {TABS.map((tab) => {
                                const active = activeTab === tab.id
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => (tab.id === "explorer" ? navigate("/learn/explorer") : setActiveTab(tab.id))}
                                        className={cn(
                                            "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-200 cursor-clicker",
                                            active ? "bg-jade/[0.08]" : "hover:bg-flash/[0.03]"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full transition-all duration-200",
                                                active ? "bg-jade shadow-[0_0_8px_#00d992]" : "bg-transparent"
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors duration-200",
                                                active ? "bg-jade/15 text-jade" : "bg-flash/[0.04] text-flash/35 group-hover:text-flash/60"
                                            )}
                                        >
                                            <Icon size={14} strokeWidth={1.75} />
                                        </span>
                                        <span className="min-w-0">
                                            <span
                                                className={cn(
                                                    "block font-chakrapetch text-[11px] font-light uppercase tracking-[0.14em] leading-none transition-colors duration-200",
                                                    active ? "text-jade" : "text-flash/55 group-hover:text-flash/85"
                                                )}
                                            >
                                                {tab.label}
                                            </span>
                                            <span
                                                className={cn(
                                                    "mt-1 block truncate font-chakrapetch text-[9px] font-light tracking-wide leading-none transition-colors duration-200",
                                                    active ? "text-jade/45" : "text-flash/20"
                                                )}
                                            >
                                                {tab.desc}
                                            </span>
                                        </span>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    {/* ── Content — offset to avoid sidebar overlap (desktop only) ── */}
                    <div className="ml-0 max-w-full lg:ml-[200px] lg:max-w-[calc(100%-200px)]">
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
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="h-[calc(100vh-150px)]"
                                >
                                    <LoldataAIChat
                                        className="h-full"
                                        authToken={session?.access_token}
                                        userContext={{ puuid: puuid ?? null, region: region ?? null, nametag: nametag ?? null }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

            </div>
        </div>
    )
}
