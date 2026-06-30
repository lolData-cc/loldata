import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/authcontext"
import { supabase } from "@/lib/supabaseClient"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"
import { cdnBaseUrl } from "@/config"
import { Separator } from "@/components/ui/separator"
import { LayoutDashboard, History, Workflow, Sword, Sparkles, ArrowUpRight, type LucideIcon } from "lucide-react"
import LoldataAIChat from "@/components/loldataaichat"
import Overview from "@/components/overview"
import { RecentMatches } from "@/components/learn/recent-matches"
import type { MatchCardData } from "@/components/matchcard"
import { motion, AnimatePresence } from "framer-motion"

// ── Tab definitions ──
const TABS = [
    { id: "overview", label: "OVERVIEW", desc: "Daily report", icon: LayoutDashboard },
    { id: "games", label: "YOUR GAMES", desc: "Recent matches", icon: History },
    { id: "itemization", label: "ITEMIZATION", desc: "Build intelligence", icon: Sword },
    { id: "loldata-ai", label: "LOLDATA AI", desc: "Ask anything", icon: Sparkles },
] as const

type TabId = typeof TABS[number]["id"]

// One sidebar entry — shared by the in-page tabs and the standalone Explorer link.
function SidebarButton({
    icon: Icon,
    label,
    desc,
    active,
    onClick,
}: {
    icon: LucideIcon
    label: string
    desc: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
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
                    {label}
                </span>
                <span
                    className={cn(
                        "mt-1 block truncate font-chakrapetch text-[9.5px] font-normal tracking-wide leading-none transition-colors duration-200",
                        active ? "text-jade/80" : "text-flash/80"
                    )}
                >
                    {desc}
                </span>
            </span>
        </button>
    )
}

export default function LearnPage() {
    const { nametag, puuid, region, session, avatarUrl } = useAuth()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = (searchParams.get("t") || "overview") as TabId
    const setActiveTab = (id: string) => setSearchParams((p) => { p.set("t", id); return p }, { replace: true })

    // Profile-banner avatar: the linked account's summoner icon (or a custom upload).
    const [iconId, setIconId] = useState<number | null>(null)
    useEffect(() => {
        if (!nametag) { setIconId(null); return }
        const [name, tag] = nametag.split("#")
        if (!name || !tag) return
        supabase.from("users").select("icon_id").eq("name", name).eq("tag", tag).single()
            .then(({ data }) => { if (data?.icon_id) setIconId(data.icon_id) })
    }, [nametag])
    const avatarSrc = avatarUrl ? avatarUrl : `${cdnBaseUrl()}/img/profileicon/${iconId ?? 29}.png`

    // AI Coach: a YOUR GAMES rail button seeds this prompt (+ the selected game)
    // and jumps to the LOLDATA AI tab, where the chat auto-sends it once on mount.
    const [aiSeed, setAiSeed] = useState<{ prompt: string; matchId: string | null; card: MatchCardData | null } | null>(null)
    const launchAnalysis = (prompt: string, attach?: { matchId: string; card: MatchCardData }) => {
        setAiSeed({ prompt, matchId: attach?.matchId ?? null, card: attach?.card ?? null })
        setActiveTab("loldata-ai")
    }


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
                    <div className="hidden lg:block absolute left-0 top-6 w-[208px] pointer-events-auto">
                        {/* Header eyebrow */}
                        <div className="mb-3 flex items-center gap-2.5">
                            <span className="relative inline-grid h-4 w-4 place-items-center">
                                <span className="absolute inset-0 rotate-45 rounded-[2px] border border-jade/45 bg-jade/[0.08]" />
                                <span className="absolute h-1 w-1 rounded-full bg-jade animate-pulse" />
                            </span>
                            <span className="font-chakrapetch text-[10px] font-bold uppercase tracking-[0.3em] text-jade/70 leading-none">Learn</span>
                        </div>

                        {/* Profile banner — clickable, redirects to the summoner page (like the dashboard). */}
                        <button
                            type="button"
                            disabled={!nametag || !region}
                            onClick={() => {
                                if (!nametag || !region) return
                                const [n, t] = nametag.split("#")
                                navigate(`/summoners/${region.toLowerCase()}/${n.replace(/\s+/g, "+")}-${t}`)
                            }}
                            className={cn(
                                "group relative mb-5 flex w-full items-center gap-2.5 overflow-hidden rounded-[3px] border border-flash/10 bg-black/30 px-2.5 py-2 text-left transition-colors duration-200",
                                nametag && region ? "cursor-clicker hover:border-jade/25 hover:bg-black/45" : "cursor-default"
                            )}
                        >
                            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
                            <img src={avatarSrc} alt="" className="h-9 w-9 shrink-0 rounded-sm border border-flash/10 object-cover" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-chakrapetch text-[11px] font-medium tracking-wide text-flash/85">
                                    {nametag ? nametag.split("#")[0] : "Not linked"}
                                </span>
                                {nametag && region ? (
                                    <span className="mt-0.5 flex items-center gap-0.5 font-chakrapetch text-[9px] font-light uppercase tracking-[0.18em] text-jade/55 transition-colors duration-200 group-hover:text-jade/85">
                                        View profile
                                        <ArrowUpRight size={10} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </span>
                                ) : (
                                    <span className="mt-0.5 block font-chakrapetch text-[9px] font-light uppercase tracking-[0.18em] text-flash/30">Link an account</span>
                                )}
                            </span>
                        </button>

                        {/* Navigation — in-page tabs */}
                        <nav className="flex flex-col gap-1">
                            {TABS.map((tab) => (
                                <SidebarButton
                                    key={tab.id}
                                    icon={tab.icon}
                                    label={tab.label}
                                    desc={tab.desc}
                                    active={activeTab === tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                />
                            ))}
                        </nav>

                        {/* Explorer — standalone tool on its own full-page route, set apart from the tabs. */}
                        <div className="mt-4 border-t border-flash/[0.07] pt-4">
                            <span className="mb-2 block px-2.5 font-chakrapetch text-[8.5px] font-bold uppercase tracking-[0.32em] text-flash/25">Tools</span>
                            <SidebarButton
                                icon={Workflow}
                                label="EXPLORER"
                                desc="Node query builder"
                                active={false}
                                onClick={() => navigate("/learn/explorer")}
                            />
                        </div>
                    </div>

                    {/* ── Content — offset to avoid sidebar overlap (desktop only) ── */}
                    <div className="ml-0 max-w-full lg:ml-[230px] lg:max-w-[calc(100%-230px)]">
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
                                    <RecentMatches nametag={nametag} region={region} puuid={puuid} onAnalyze={launchAnalysis} />
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
                                        initialPrompt={aiSeed?.prompt ?? null}
                                        initialMatchId={aiSeed?.matchId ?? null}
                                        initialMatchCard={aiSeed?.card ?? null}
                                        onInitialPromptConsumed={() => setAiSeed(null)}
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
