import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/authcontext";
import { Navbar } from "@/components/navbar";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, History, Workflow, Network, Sword, Sparkles, ArrowUpRight, FlaskConical } from "lucide-react";
import LoldataAIChat from "@/components/loldataaichat";
import Overview from "@/components/overview";
import { RecentMatches } from "@/components/learn/recent-matches";
import { motion, AnimatePresence } from "framer-motion";
// ── Tab definitions ──
const TABS = [
    { id: "overview", label: "OVERVIEW", desc: "Daily report", icon: LayoutDashboard },
    { id: "games", label: "YOUR GAMES", desc: "Recent matches", icon: History },
    { id: "itemization", label: "ITEMIZATION", desc: "Build intelligence", icon: Sword },
    { id: "loldata-ai", label: "LOLDATA AI", desc: "Ask anything", icon: Sparkles },
];
// One sidebar entry — shared by the in-page tabs and the standalone Explorer link.
function SidebarButton({ icon: Icon, label, desc, active, onClick, disabled = false, }) {
    return (_jsxs("button", { onClick: onClick, disabled: disabled, "aria-disabled": disabled, className: cn("group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all duration-200", disabled ? "cursor-not-allowed opacity-55" : "cursor-clicker", active ? "bg-jade/[0.08]" : disabled ? "" : "hover:bg-flash/[0.03]"), children: [_jsx("span", { className: cn("absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full transition-all duration-200", active ? "bg-jade shadow-[0_0_8px_#00d992]" : "bg-transparent") }), _jsx("span", { className: cn("grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors duration-200", active ? "bg-jade/15 text-jade" : "bg-flash/[0.04] text-flash/35 group-hover:text-flash/60"), children: _jsx(Icon, { size: 14, strokeWidth: 1.75 }) }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: cn("block whitespace-nowrap font-chakrapetch text-[12.5px] font-semibold uppercase tracking-[0.09em] leading-none transition-colors duration-200", active ? "text-jade" : "text-flash/85 group-hover:text-flash"), children: label }), _jsxs("span", { className: "mt-1.5 flex items-center gap-1.5", children: [_jsx("span", { className: cn("min-w-0 truncate font-chakrapetch text-[11px] font-normal tracking-[0.01em] leading-none transition-colors duration-200", active ? "text-jade/70" : "text-flash/45 group-hover:text-flash/65"), children: desc }), disabled && (_jsx("span", { className: "shrink-0 rounded-full bg-citrine/15 px-1.5 py-[2px] font-chakrapetch text-[7.5px] font-bold uppercase tracking-[0.13em] leading-none text-citrine/90 shadow-[inset_0_0_0_1px_rgb(var(--c-citrine)/0.3)]", children: "Soon" }))] })] })] }));
}
export default function LearnPage() {
    const { nametag, puuid, region, session, avatarUrl } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get("t") || "overview");
    const setActiveTab = (id) => setSearchParams((p) => { p.set("t", id); return p; }, { replace: true });
    // Profile-banner avatar: the linked account's summoner icon (or a custom upload).
    const [iconId, setIconId] = useState(null);
    useEffect(() => {
        if (!nametag) {
            setIconId(null);
            return;
        }
        const [name, tag] = nametag.split("#");
        if (!name || !tag)
            return;
        // ⚠️ Via l'API: `users` vive sul box dal 2026-08-28 e la sua
        //    PostgREST non e' pubblica. Un errore lascia l'icona di default.
        fetch(`${API_BASE_URL}/api/user-icon?nametag=${encodeURIComponent(nametag)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d?.iconId)
            setIconId(d.iconId); })
            .catch(() => { });
    }, [nametag]);
    const avatarSrc = avatarUrl ? avatarUrl : `${cdnBaseUrl()}/img/profileicon/${iconId ?? 29}.png`;
    // AI Coach: a YOUR GAMES rail button seeds this prompt (+ the selected game)
    // and jumps to the LOLDATA AI tab, where the chat auto-sends it once on mount.
    const [aiSeed, setAiSeed] = useState(null);
    const launchAnalysis = (prompt, attach) => {
        setAiSeed({ prompt, matchId: attach?.matchId ?? null, card: attach?.card ?? null });
        setActiveTab("loldata-ai");
    };
    return (_jsxs("div", { className: "font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen flex flex-col overflow-hidden", children: [_jsx("div", { className: "w-full flex justify-center", children: _jsx("div", { className: "w-full lg:w-[65%]", children: _jsx(Navbar, {}) }) }), _jsx(Separator, { className: "bg-flash/[0.08] w-full shrink-0" }), _jsx("div", { className: "flex-1 min-h-0 scrollbar-hide relative overflow-y-auto pt-16 md:pt-0", children: _jsxs("div", { className: "w-full px-3 lg:w-[65%] lg:px-0 mx-auto py-4 lg:py-6 relative z-10", children: [_jsxs("div", { className: "hidden lg:block absolute left-0 top-6 w-[208px] pointer-events-auto", children: [_jsxs("div", { className: "mb-3 flex items-center gap-2.5", children: [_jsxs("span", { className: "relative inline-grid h-4 w-4 place-items-center", children: [_jsx("span", { className: "absolute inset-0 rotate-45 rounded-[2px] border border-jade/45 bg-jade/[0.08]" }), _jsx("span", { className: "absolute h-1 w-1 rounded-full bg-jade animate-pulse" })] }), _jsx("span", { className: "font-chakrapetch text-[10px] font-bold uppercase tracking-[0.3em] text-jade/70 leading-none", children: "Learn" })] }), _jsxs("button", { type: "button", disabled: !nametag || !region, onClick: () => {
                                        if (!nametag || !region)
                                            return;
                                        const [n, t] = nametag.split("#");
                                        navigate(`/summoners/${region.toLowerCase()}/${n.replace(/\s+/g, "+")}-${t}`);
                                    }, className: cn("group relative mb-5 flex w-full items-center gap-2.5 overflow-hidden rounded-[3px] border border-flash/10 bg-filmdark/30 px-2.5 py-2 text-left transition-colors duration-200", nametag && region ? "cursor-clicker hover:border-jade/25 hover:bg-filmdark/45" : "cursor-default"), children: [_jsx("span", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("img", { src: avatarSrc, alt: "", className: "h-9 w-9 shrink-0 rounded-sm border border-flash/10 object-cover" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate font-chakrapetch text-[11px] font-medium tracking-wide text-flash/85", children: nametag ? nametag.split("#")[0] : "Not linked" }), nametag && region ? (_jsxs("span", { className: "mt-0.5 flex items-center gap-0.5 font-chakrapetch text-[10px] font-normal uppercase tracking-[0.14em] text-jade/80 transition-colors duration-200 group-hover:text-jade", children: ["View profile", _jsx(ArrowUpRight, { size: 10, className: "transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" })] })) : (_jsx("span", { className: "mt-0.5 block font-chakrapetch text-[9px] font-light uppercase tracking-[0.18em] text-flash/30", children: "Link an account" }))] })] }), _jsx("nav", { className: "flex flex-col gap-1", children: TABS.map((tab) => (_jsx(SidebarButton, { icon: tab.icon, label: tab.label, desc: tab.desc, active: activeTab === tab.id, onClick: () => setActiveTab(tab.id) }, tab.id))) }), _jsxs("div", { className: "mt-4 border-t border-flash/[0.07] pt-4", children: [_jsx("span", { className: "mb-2 block px-2.5", children: _jsxs("span", { className: "relative inline-block font-chakrapetch text-[8.5px] font-bold uppercase tracking-[0.32em] text-flash/25", children: ["Tools", _jsx("span", { className: "absolute -top-2 left-full -translate-x-[9px] rounded-full bg-gradient-to-r from-[#a85585] to-[#6f4287] px-[5px] py-[1px] font-chakrapetch text-[6.5px] font-bold uppercase tracking-[0.13em] leading-none text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_1px_5px_rgba(120,60,120,0.35)]", children: "Beta" })] }) }), _jsx(SidebarButton, { icon: Workflow, label: "EXPLORER", desc: "Node query builder", active: false, onClick: () => navigate("/learn/explorer") }), _jsx(SidebarButton, { icon: Network, label: "IMPROVEMENT TREE", desc: "3D skill path", active: false, onClick: () => navigate("/learn/tree") }), _jsx(SidebarButton, { icon: FlaskConical, label: "PATCH ANALYZER", desc: "Patch impact", active: false, disabled: true, onClick: () => { } })] })] }), _jsx("div", { className: "ml-0 max-w-full lg:ml-[230px] lg:max-w-[calc(100%-230px)]", children: _jsxs(AnimatePresence, { mode: "wait", children: [activeTab === "overview" && (_jsx(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.2 }, children: _jsx(Overview, { puuid: puuid ?? null, region: region ?? null, nametag: nametag ?? null }) }, "overview")), activeTab === "games" && (_jsx(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.2 }, children: _jsx(RecentMatches, { nametag: nametag, region: region, puuid: puuid, onAnalyze: launchAnalysis }) }, "games")), activeTab === "itemization" && (_jsxs(motion.div, { initial: { opacity: 0, x: -12 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 12 }, transition: { duration: 0.2 }, className: "flex flex-col items-center justify-center h-48 gap-2", children: [_jsx("span", { className: "text-[9px] font-mono tracking-[0.25em] uppercase text-jade/50", children: "// ITEMIZATION" }), _jsx("span", { className: "text-flash/40 font-mono text-sm", children: "Build intelligence coming soon" }), _jsx("span", { className: "text-flash/20 font-mono text-[10px]", children: "Compare your builds with Diamond+ optimal paths" })] }, "itemization")), activeTab === "loldata-ai" && (_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 }, className: "h-[calc(100vh-150px)]", children: _jsx(LoldataAIChat, { className: "h-full", authToken: session?.access_token, userContext: { puuid: puuid ?? null, region: region ?? null, nametag: nametag ?? null }, initialPrompt: aiSeed?.prompt ?? null, initialMatchId: aiSeed?.matchId ?? null, initialMatchCard: aiSeed?.card ?? null, onInitialPromptConsumed: () => setAiSeed(null) }) }, "loldata-ai"))] }) })] }) })] }));
}
