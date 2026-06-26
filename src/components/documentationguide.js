import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useChampionPicker } from "@/context/championpickercontext";
import { Search, Swords, GraduationCap, Bot, Shield, Package, Trophy, Crown, Radio, Settings, BookOpen, ExternalLink, } from "lucide-react";
/* ------------------------------------------------------------------ */
/*  Section Data                                                       */
/* ------------------------------------------------------------------ */
const SECTIONS = [
    {
        id: "getting-started",
        title: "Getting Started",
        tag: "INIT",
        icon: BookOpen,
        route: "/dashboard/profile",
        routeLabel: "Go to Profile",
        description: "Create your account and link your profiles to unlock the full power of loldata analytics.",
        features: [
            {
                label: "Account Creation",
                detail: "Sign up with email and password or use Discord OAuth for instant access. A one-time OTP verification secures your account.",
            },
            {
                label: "Profile Linking",
                detail: "Connect your Riot ID by verifying ownership through a temporary icon change. This unlocks personalized analytics across all pages.",
            },
            {
                label: "Discord Integration",
                detail: "Link your Discord account to display your avatar and social presence on your loldata profile.",
            },
            {
                label: "Dashboard Overview",
                detail: "Your dashboard is the central hub for managing profile settings, preferences, billing, and this documentation.",
            },
        ],
        tips: [
            "Link your Riot ID first — it unlocks summoner-specific analytics across every page.",
            "Use Discord OAuth for the fastest sign-up experience.",
        ],
    },
    {
        id: "summoner-profile",
        title: "Summoner Profile",
        tag: "SEARCH",
        icon: Search,
        description: "Look up any player by Riot ID to view their rank, match history, and performance metrics in detail.",
        features: [
            {
                label: "Riot ID Search",
                detail: "Search any player by Name#Tag and region. Results show current rank, LP, and overall win/loss record.",
            },
            {
                label: "Match History",
                detail: "Browse recent matches grouped by day, with individual KDA, champion played, items built, and LP delta between games.",
            },
            {
                label: "Champion Picker",
                detail: "Filter your match history by champion using either the Sheet browser or the Radial dock selector — configurable in Preferences.",
            },
            {
                label: "Live Game Detection",
                detail: "When a searched player is in an active game, a live indicator appears with a link to the Live Game Viewer.",
            },
        ],
        tips: [
            "You can paste your full Riot ID including the # separator directly into the search bar.",
        ],
    },
    {
        id: "match-analysis",
        title: "Match Analysis",
        tag: "MATCH",
        icon: Swords,
        description: "Dive deep into any match with a full scoreboard, interactive kill map, build timeline, and damage breakdowns.",
        features: [
            {
                label: "Scoreboard",
                detail: "Blue vs Red team display showing champion, summoner spells, KDA, items, gold, kill participation, CS, and MVP/ACE badges.",
            },
            {
                label: "Kill Map",
                detail: "Visual timeline of all kills plotted on Summoner's Rift. Toggle between Kills, Objectives, Towers, and Builds tabs.",
            },
            {
                label: "Build Timeline",
                detail: "Horizontally scrolling timeline showing every item purchase, with timestamps and sold-item indicators.",
            },
            {
                label: "Damage Charts",
                detail: "Per-player bar charts comparing damage dealt, damage taken, healing, objective damage, vision score, and ward stats.",
            },
            {
                label: "Performance Rating",
                detail: "LolData Score system that rates individual performance with weighted metrics beyond simple KDA.",
            },
        ],
        tips: [
            "Click any player in the scoreboard to jump to their summoner profile.",
        ],
    },
    {
        id: "learn-page",
        title: "Learn Page",
        tag: "LEARN",
        icon: GraduationCap,
        route: "/learn",
        routeLabel: "Open Learn",
        description: "Track your daily performance, monitor LP progression, and identify trends in your gameplay over time.",
        features: [
            {
                label: "Daily Overview",
                detail: "See today's aggregate KDA, total games played, and current rank with LP progress bar — all at a glance.",
            },
            {
                label: "Game Tracking",
                detail: "Every tracked game is logged with LP deltas between matches, organized by day with rank-up and rank-down indicators.",
            },
            {
                label: "KDA Visualization",
                detail: "Bar chart showing your kills, deaths, and assists across each game of the day for pattern recognition.",
            },
            {
                label: "Goal Setting",
                detail: "Set improvement targets and track your progress toward them over time (coming soon).",
            },
        ],
        tips: [
            "Check the Learn page daily to spot trends in your performance before and after tilt.",
        ],
    },
    {
        id: "loldata-ai",
        title: "LolData AI",
        tag: "AI",
        icon: Bot,
        route: "/learn",
        routeLabel: "Open AI Chat",
        description: "Ask the AI assistant any League of Legends question — from matchup advice to build paths and macro strategy.",
        features: [
            {
                label: "Natural Language Chat",
                detail: "Type any question about League and receive detailed, data-backed answers with typewriter-style streaming responses.",
            },
            {
                label: "Matchup Analysis",
                detail: "Ask about specific champion matchups to receive win rate data, lane tips, and power spike timing.",
            },
            {
                label: "Build Recommendations",
                detail: "Request item builds for any champion and receive stat-backed suggestions with situational alternatives.",
            },
            {
                label: "Strategy Advice",
                detail: "Get macro guidance on wave management, objective timing, team fighting, and split-pushing strategies.",
            },
            {
                label: "Context Awareness",
                detail: "When accessed from the Learn page, the AI receives your recent game context for more personalized answers.",
            },
        ],
        tips: [
            "Be specific — include champion names and roles for the most accurate advice.",
            "Free tier includes 3 daily AI tokens. Premium unlocks unlimited usage.",
        ],
    },
    {
        id: "champion-analytics",
        title: "Champion Analytics",
        tag: "CHAMP",
        icon: Shield,
        description: "Explore comprehensive statistics for every champion — win rates, item builds, matchup difficulty, and pro player data.",
        features: [
            {
                label: "Core Statistics",
                detail: "Win rate, pick rate, ban rate, average KDA, CS, gold, and damage — filterable by rank and role.",
            },
            {
                label: "Item Builds",
                detail: "Recommended item builds organized by slot (1st, 2nd, 3rd item, etc.) with win rate and game count per build path.",
            },
            {
                label: "Matchup Difficulty",
                detail: "Head-to-head matchup data with color-coded difficulty badges: Easy, Good, Even, Hard, Very Hard, and Impossible.",
            },
            {
                label: "Game Phase Breakdown",
                detail: "Early, mid, and late game win rates so you know when your champion's power spikes and dips.",
            },
            {
                label: "Pro Player Stats",
                detail: "See which professional players excel on a champion with their tournament-level KDA and game references.",
            },
        ],
        tips: [
            "Sort matchups by win rate to quickly find your champion's best and worst lanes.",
        ],
    },
    {
        id: "item-analytics",
        title: "Item Analytics",
        tag: "ITEM",
        icon: Package,
        description: "Analyze individual item performance, see which champions benefit most from each item, and compare build efficiency.",
        features: [
            {
                label: "Item Statistics",
                detail: "Overall win rate, build rate, and total games analyzed for every purchasable item in the game.",
            },
            {
                label: "Best Utilizers",
                detail: "Ranked list of champions who build this item most effectively, sorted by win rate contribution.",
            },
            {
                label: "Filter by Context",
                detail: "Narrow item stats by rank, role, and specific champion to see how an item performs in your exact context.",
            },
        ],
        tips: [
            "Compare item win rates across roles to discover off-meta builds that actually work.",
        ],
    },
    {
        id: "leaderboard",
        title: "Leaderboard",
        tag: "RANK",
        icon: Trophy,
        route: "/leaderboards",
        routeLabel: "View Leaderboard",
        description: "Browse the ranked ladder for any supported region, with paginated player rankings and quick profile access.",
        features: [
            {
                label: "Regional Ladders",
                detail: "View ranked standings across EUW, NA, and KR regions — the three most competitive servers.",
            },
            {
                label: "Queue Selection",
                detail: "Toggle between Ranked Solo/Duo and Ranked Flex leaderboards to see standings in both queues.",
            },
            {
                label: "Player Cards",
                detail: "Each entry shows profile icon, rank badge, LP, win/loss record, and win rate percentage with direct profile links.",
            },
            {
                label: "Paginated Navigation",
                detail: "Browse through hundreds of players with cyber-styled pagination and animated scanline effects.",
            },
        ],
        tips: [
            "Click any player name to instantly view their full summoner profile and match history.",
        ],
    },
    {
        id: "total-mastery",
        title: "Total Mastery",
        tag: "MASTERY",
        icon: Crown,
        route: "/mastery",
        routeLabel: "Open Mastery",
        description: "Track your champion mastery across multiple accounts and see your true dedication to every champion.",
        features: [
            {
                label: "Multi-Account Tracking",
                detail: "Add all your Riot accounts (Name#Tag + Region) to aggregate mastery data across every account you play on.",
            },
            {
                label: "Top Champions",
                detail: "Your top 3 most-played champions across all linked accounts, ranked by total mastery points.",
            },
            {
                label: "Per-Account Breakdown",
                detail: "Detailed mastery stats per account with search and filter capabilities to find any champion quickly.",
            },
            {
                label: "Cloud Storage",
                detail: "Your mastery tracking configuration is saved to the cloud so it persists across sessions and devices.",
            },
        ],
        tips: [
            "Add all your accounts — including smurfs — to get an accurate picture of your total champion mastery.",
        ],
    },
    {
        id: "live-game",
        title: "Live Game Viewer",
        tag: "LIVE",
        icon: Radio,
        description: "When your linked account enters a game, the Live Game Viewer activates with real-time team data and AI-powered tips.",
        features: [
            {
                label: "Auto-Detection",
                detail: "The viewer activates automatically when your linked summoner enters an active game — no manual refresh needed.",
            },
            {
                label: "Team Compositions",
                detail: "See both teams' champions, summoner spells, current rank, LP, and individual win rates side by side.",
            },
            {
                label: "AI Strategy Tips",
                detail: "Receive AI-generated advice on how to win the current game based on the team compositions and matchups.",
            },
            {
                label: "Build Suggestions",
                detail: "Get real-time item build recommendations tailored to the enemy team composition you're facing.",
            },
            {
                label: "Matchup Insights",
                detail: "Per-lane matchup analysis showing your expected win rate and tips for the laning phase.",
            },
        ],
        tips: [
            "Keep loldata open in a second monitor or tab — the live viewer updates as soon as champion select finishes.",
        ],
    },
    {
        id: "dashboard-settings",
        title: "Dashboard & Settings",
        tag: "SYS",
        icon: Settings,
        route: "/dashboard/profile",
        routeLabel: "Open Dashboard",
        description: "Manage your profile, link accounts, customize your experience, and control your loldata preferences from the dashboard.",
        features: [
            {
                label: "Avatar Upload",
                detail: "Premium users can upload a custom profile avatar with built-in image cropping. Reset to your Riot icon anytime.",
            },
            {
                label: "Discord Linking",
                detail: "Connect your Discord account to display your avatar and identity. Auto-syncs when you change your Discord picture.",
            },
            {
                label: "Riot ID Verification",
                detail: "Link your Riot account by temporarily changing your summoner icon to a specified one for verification.",
            },
            {
                label: "Animation Preferences",
                detail: "Toggle Border Beam effects, Tech Background animations, and Match Transition effects on or off.",
            },
            {
                label: "Champion Picker Mode",
                detail: "Choose between the Sheet browser or the Radial dock for champion selection throughout the app.",
            },
        ],
        tips: [
            "Disable animations in Preferences if you want a snappier, lower-resource experience.",
        ],
    },
];
/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function HudCorners({ color = "jade" }) {
    const c = color === "citrine" ? "bg-citrine/25" : "bg-jade/25";
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: cn("absolute top-0 left-0 w-full h-[1px]", c) }), _jsx("div", { className: cn("absolute top-0 left-0 w-[1px] h-full", c) })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: cn("absolute top-0 right-0 w-full h-[1px]", c) }), _jsx("div", { className: cn("absolute top-0 right-0 w-[1px] h-full", c) })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: cn("absolute bottom-0 left-0 w-full h-[1px]", c) }), _jsx("div", { className: cn("absolute bottom-0 left-0 w-[1px] h-full", c) })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: cn("absolute bottom-0 right-0 w-full h-[1px]", c) }), _jsx("div", { className: cn("absolute bottom-0 right-0 w-[1px] h-full", c) })] })] }));
}
function SectionTag({ tag, color = "jade" }) {
    const cls = color === "citrine"
        ? "text-citrine/50"
        : "text-jade/50";
    return (_jsxs("p", { className: cn("text-[11px] font-mono tracking-[0.25em] uppercase", cls), children: [":: ", tag, " ::"] }));
}
function FeatureBullet({ label, detail }) {
    return (_jsxs("div", { className: "flex gap-2.5 items-start", children: [_jsx("span", { className: "text-jade/40 text-[8px] mt-[5px] shrink-0", children: "\u25C6" }), _jsxs("div", { className: "min-w-0", children: [_jsx("span", { className: "text-flash/70 text-[11px] font-medium uppercase tracking-wide", children: label }), _jsxs("span", { className: "text-flash/40 text-[11px]", children: [" \u2014 ", detail] })] })] }));
}
/* ---------- Section Card ---------- */
function DocSectionCard({ section, action, actionLabel }) {
    const Icon = section.icon;
    return (_jsxs("div", { id: section.id, className: "relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                    background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)",
                } }), _jsx(HudCorners, {}), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsxs("div", { className: "relative z-[2] px-5 py-4 pl-5", children: [_jsx(SectionTag, { tag: section.tag }), _jsxs("div", { className: "flex items-center gap-2 mt-2", children: [_jsx(Icon, { className: "w-4 h-4 text-jade shrink-0" }), _jsxs("h3", { className: "text-flash/90 text-sm font-medium tracking-wide", children: ["\u25C8 ", section.title.toUpperCase()] })] }), _jsx("div", { className: "my-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsx("p", { className: "text-flash/60 text-xs leading-relaxed", children: section.description }), _jsx("div", { className: "mt-3 space-y-2", children: section.features.map((f) => (_jsx(FeatureBullet, { label: f.label, detail: f.detail }, f.label))) }), section.tips && section.tips.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx(SectionTag, { tag: "TIPS", color: "citrine" }), _jsx("div", { className: "mt-1.5 h-[1px] bg-gradient-to-r from-citrine/15 via-citrine/5 to-transparent" }), _jsx("div", { className: "mt-2 space-y-1.5", children: section.tips.map((tip, i) => (_jsxs("div", { className: "flex gap-2 items-start", children: [_jsx("span", { className: "text-citrine/50 text-[9px] mt-[3px] shrink-0", children: "\u25B8" }), _jsx("span", { className: "text-citrine/40 text-[11px] leading-relaxed", children: tip })] }, i))) })] })), (section.route || action) && (_jsxs(_Fragment, { children: [_jsx("div", { className: "mt-4 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsx("div", { className: "mt-3 flex justify-end", children: action ? (_jsxs("button", { type: "button", onClick: action, className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] border border-jade/20 text-jade/70 hover:text-jade hover:bg-jade/5 text-[10px] tracking-[0.12em] uppercase cursor-clicker transition-colors", children: [actionLabel ?? "Open", _jsx(ExternalLink, { className: "w-3 h-3" })] })) : section.route ? (_jsxs(Link, { to: section.route, className: "inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] border border-jade/20 text-jade/70 hover:text-jade hover:bg-jade/5 text-[10px] tracking-[0.12em] uppercase cursor-clicker transition-colors", children: [section.routeLabel ?? "Open", _jsx(ExternalLink, { className: "w-3 h-3" })] })) : null })] }))] })] }));
}
/* ---------- Cyber Index Navigation ---------- */
function CyberIndexNav({ activeSection, onNavigate, }) {
    return (_jsx("div", { className: "fixed right-4 top-1/2 -translate-y-1/2 z-50 w-[200px]", children: _jsxs("div", { className: "relative rounded-[2px] border border-jade/10 bg-cement/95 backdrop-blur-sm overflow-hidden shadow-[0_0_20px_rgba(0,217,146,0.05)]", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                        background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)",
                    } }), _jsx(HudCorners, {}), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsxs("div", { className: "relative z-[2] py-3 pl-4 pr-3", children: [_jsx(SectionTag, { tag: "SYS INDEX" }), _jsx("div", { className: "mt-2 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsx("div", { className: "mt-2 flex flex-col gap-0.5", children: SECTIONS.map((s) => {
                                const Icon = s.icon;
                                const isActive = activeSection === s.id;
                                return (_jsxs("button", { type: "button", onClick: () => onNavigate(s.id), className: cn("flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-[2px] cursor-clicker transition-colors relative", isActive
                                        ? "text-jade bg-jade/5"
                                        : "text-flash/40 hover:text-flash/60 hover:bg-flash/[0.02]"), children: [isActive && (_jsx("div", { className: "absolute left-0 top-1 bottom-1 w-[2px] bg-jade rounded-full" })), _jsx(Icon, { className: "w-3.5 h-3.5 shrink-0" }), _jsx("span", { className: "text-[10px] tracking-[0.12em] uppercase truncate flex-1", children: s.title }), _jsx("span", { className: cn("text-[8px] font-mono tracking-wider shrink-0", isActive ? "text-jade/50" : "text-flash/20"), children: s.tag })] }, s.id));
                            }) }), _jsx("div", { className: "mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsx("p", { className: "mt-2 text-[9px] font-mono text-flash/20 tracking-[0.1em]", children: "\u25C8 v1.0 // LOLDATA DOCS" })] })] }) }));
}
/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function DocumentationGuide() {
    const [activeSection, setActiveSection] = useState("getting-started");
    const wrapperRef = useRef(null);
    const { openPicker } = useChampionPicker();
    /* --- section action map --- */
    const openSearchDialog = useCallback(() => {
        window.dispatchEvent(new CustomEvent("open-search-dialog"));
    }, []);
    const sectionActions = {
        "summoner-profile": { action: openSearchDialog, label: "Search a Player" },
        "champion-analytics": { action: openPicker, label: "Browse Champions" },
    };
    /* --- scroll to section --- */
    const isAutoScrolling = useRef(false);
    const scrollToSection = useCallback((id) => {
        const el = document.getElementById(id);
        const container = wrapperRef.current?.closest(".overflow-y-auto");
        if (!el || !container)
            return;
        const offset = el.getBoundingClientRect().top -
            container.getBoundingClientRect().top +
            container.scrollTop -
            20;
        // Temporarily suppress the scroll listener to prevent re-render interruption
        isAutoScrolling.current = true;
        setActiveSection(id);
        container.scrollTo({ top: offset, behavior: "smooth" });
        // Re-enable scroll tracking after the animation
        setTimeout(() => {
            isAutoScrolling.current = false;
        }, 800);
    }, []);
    /* --- Scroll-based active section tracking --- */
    useEffect(() => {
        const container = wrapperRef.current?.closest(".overflow-y-auto");
        if (!container)
            return;
        function onScroll() {
            if (isAutoScrolling.current)
                return;
            const containerTop = container.getBoundingClientRect().top;
            let current = SECTIONS[0].id;
            for (const s of SECTIONS) {
                const el = document.getElementById(s.id);
                if (!el)
                    continue;
                const top = el.getBoundingClientRect().top - containerTop;
                if (top <= 80)
                    current = s.id;
            }
            setActiveSection(current);
        }
        container.addEventListener("scroll", onScroll, { passive: true });
        onScroll(); // set initial
        return () => container.removeEventListener("scroll", onScroll);
    }, []);
    return (_jsxs("div", { ref: wrapperRef, className: "p-4 px-5", children: [_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: LOLDATA // DOCUMENTATION SYSTEM ::" }), _jsx("h2", { className: "font-mechano text-2xl text-flash/90 mt-1 tracking-wide", children: "SYSTEM GUIDE" }), _jsx("p", { className: "text-flash/40 text-xs mt-1", children: "Comprehensive guide to all loldata functionalities and features." }), _jsx("div", { className: "mt-3 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent" }), _jsxs("p", { className: "mt-2 text-[9px] font-mono text-flash/20 tracking-[0.1em]", children: ["\u25C8 v1.0 // ", SECTIONS.length, " MODULES // LOLDATA DOCUMENTATION"] })] }), _jsx(CyberIndexNav, { activeSection: activeSection, onNavigate: scrollToSection }), _jsx("div", { className: "flex flex-col gap-5 pb-12", children: SECTIONS.map((s) => {
                    const sa = sectionActions[s.id];
                    return (_jsx(DocSectionCard, { section: s, action: sa?.action, actionLabel: sa?.label }, s.id));
                }) })] }));
}
