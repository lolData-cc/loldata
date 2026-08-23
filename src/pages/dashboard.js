import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showCyberToast } from "@/lib/toast-utils";
import { Separator } from "@/components/ui/separator";
import { SettingsCard } from "@/components/ui/settings-card";
import { Navbar } from "@/components/navbar";
import { PremiumAvatarUploader } from "@/components/profileavataruploader";
import { useChampionPicker } from "@/context/championpickercontext";
import { ProfilerLinker } from "@/components/profilelinker";
import { Tabs, TabsList, TabsTrigger, TabsContent, } from "@/components/ui/tabs";
import { DiscordLinker } from "@/components/discordlinker";
import { useAuth } from "@/context/authcontext";
import { ProApplicationsAdminPanel } from "@/components/admin/pro-applications-admin-panel";
import { StreamerAdminPanel } from "@/components/admin/streamer-admin-panel";
import { AccountLinkOverride } from "@/components/admin/account-link-override";
import { DatabaseStatsPanel } from "@/components/admin/database-stats-panel";
import { BorderBeamPreference } from "@/components/borderbeampreference";
import { TechBackgroundPreference } from "@/components/techbackgroundpreference";
import { MatchTransitionPreference } from "@/components/matchtransitionpreference";
import { AccountDeletion } from "@/components/accountdeletion";
import { DocumentationGuide } from "@/components/documentationguide";
import { MatchGroupingPreference } from "@/components/matchgroupingpreference";
import { ColoredMatchBgPreference } from "@/components/coloredmatchbgpreference";
import { MatchCenteringPreference } from "@/components/matchcenteringpreference";
import { HideRemakesPreference } from "@/components/hideremakespreference";
import { StatsBarPreference } from "@/components/statsbarpreference";
import { ContextMenuActionsPreference } from "@/components/contextmenuactionspreference";
import { ClickToExpandPreference } from "@/components/clicktoexpandpreference";
import { QuickSlotsPreference } from "@/components/quickslotspreference";
import { LegacyRankIconsPreference } from "@/components/legacyrankiconspreference";
import { AmbientLightPreference } from "@/components/ambientlightpreference";
import { ThemePreference } from "@/components/themepreference";
import { ChangePassword } from "@/components/changepassword";
import ScoutLobbiesManager from "@/components/scoutlobbiesmanager";
import { cdnBaseUrl, API_BASE_URL, BOX_API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Loader2, CreditCard, ExternalLink, Check, Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";
export default function DashboardPage() {
    const navigate = useNavigate();
    const { tab } = useParams();
    const { pickerMode, setPickerMode } = useChampionPicker();
    const { session, isAdmin, nametag, avatarUrl, region: userRegion, plan } = useAuth();
    useEffect(() => {
        document.title = "Dashboard - lolData";
        return () => { document.title = "lolData"; };
    }, []);
    const email = session?.user?.email ?? "";
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightSummoner, setHighlightSummoner] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false); // mobile bottom section picker
    useEffect(() => {
        if (searchParams.get("highlight") === "summoner-page") {
            setHighlightSummoner(true);
            // Clean up the query param
            searchParams.delete("highlight");
            setSearchParams(searchParams, { replace: true });
            // Remove glow after 2.5s
            const t = setTimeout(() => setHighlightSummoner(false), 2500);
            return () => clearTimeout(t);
        }
    }, []);
    // Fetch summoner icon_id when account is linked
    const [iconId, setIconId] = useState(null);
    useEffect(() => {
        if (!nametag) {
            setIconId(null);
            return;
        }
        const [name, tag] = nametag.split("#");
        if (!name || !tag)
            return;
        supabase
            .from("users")
            .select("icon_id")
            .eq("name", name)
            .eq("tag", tag)
            .single()
            .then(({ data }) => { if (data?.icon_id)
            setIconId(data.icon_id); });
    }, [nametag]);
    // Resolve avatar source
    const avatarSrc = avatarUrl
        ? avatarUrl
        : `${cdnBaseUrl()}/img/profileicon/${iconId ?? 29}.png`;
    const displayName = nametag ?? email;
    const validTabs = ["profile", "documentation", "billing", "preferences", "scout", "database", "proApplications", "streamerApplications", "accountLink", "planSetup"];
    const activeTab = tab && validTabs.includes(tab) ? tab : "profile";
    // mobile bottom section picker — rises up to choose a dashboard section
    const SECTIONS = [
        { value: "profile", label: "PROFILE" },
        { value: "documentation", label: "DOCUMENTATION" },
        { value: "billing", label: "BILLING" },
        { value: "preferences", label: "PREFERENCES" },
        { value: "scout", label: "SCOUT" },
        ...(isAdmin ? [
            { value: "database", label: "DATABASE" },
            { value: "proApplications", label: "PRO APPLICATIONS" },
            { value: "streamerApplications", label: "STREAMER APPLICATIONS" },
            { value: "accountLink", label: "ACCOUNT LINK" },
            { value: "planSetup", label: "PLAN SETUP" },
        ] : []),
    ];
    const currentSectionLabel = SECTIONS.find((s) => s.value === activeTab)?.label ?? "PROFILE";
    const handleLogout = async () => {
        await supabase.auth.signOut();
        showCyberToast({
            title: "Logout complete",
            description: "Session terminated successfully",
            tag: "SYS",
            variant: "status",
        });
        navigate("/");
    };
    return (_jsxs("div", { className: "font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen grid grid-rows-[64px,1fr] md:grid-rows-[auto,1fr] overflow-hidden", children: [_jsxs("div", { className: "w-full", children: [_jsx(Navbar, { columnInset: true }), _jsx(Separator, { className: "bg-flash/20 mt-0 w-full" })] }), _jsxs("div", { className: "lg:hidden", children: [pickerOpen && _jsx("div", { className: "fixed inset-0 z-[55] bg-black/60", onClick: () => setPickerOpen(false) }), _jsxs("div", { className: "fixed inset-x-0 bottom-0 z-[56] border-t border-jade/25 bg-[rgba(5,10,12,0.97)] backdrop-blur-xl", children: [_jsxs("button", { type: "button", onClick: () => setPickerOpen((v) => !v), className: "w-full h-14 flex items-center justify-between px-5 cursor-clicker", children: [_jsxs("span", { className: "flex items-center gap-2 font-jetbrains text-[12px] tracking-[0.18em] uppercase text-jade", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade" }), currentSectionLabel] }), _jsx("svg", { className: cn("w-4 h-4 text-flash/50 transition-transform", pickerOpen && "rotate-180"), viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: _jsx("path", { d: "M18 15l-6-6-6 6" }) })] }), _jsx("div", { className: cn("overflow-hidden transition-[max-height] duration-300 ease-out", pickerOpen ? "max-h-[60vh]" : "max-h-0"), children: _jsxs("div", { className: "max-h-[60vh] overflow-y-auto scrollbar-hide px-2 pb-3", children: [SECTIONS.map((s) => (_jsx("button", { type: "button", onClick: () => { navigate(`/dashboard/${s.value}`, { replace: true }); setPickerOpen(false); }, className: cn("w-full text-left px-3 py-2.5 rounded-sm font-jetbrains text-[12px] tracking-[0.15em] uppercase border-l-2 transition-colors cursor-clicker", activeTab === s.value ? "text-jade border-jade bg-jade/10" : "text-flash/55 border-transparent hover:text-flash/80"), children: s.label }, s.value))), _jsx("button", { type: "button", onClick: handleLogout, className: "w-full text-left px-3 py-2.5 mt-1 rounded-sm font-jetbrains text-[12px] tracking-[0.15em] uppercase text-flash/40 hover:text-red-400/80 cursor-clicker", children: "LOGOUT" })] }) })] })] }), _jsx("div", { className: "w-full min-h-0", children: _jsx("div", { className: "xl:w-[65%] min-[2560px]:w-[55%] w-full mx-auto px-4 h-full min-h-0", children: _jsxs(Tabs, { value: activeTab, onValueChange: (v) => navigate(`/dashboard/${v}`, { replace: true }), className: "flex flex-col lg:flex-row w-full h-full min-h-0", children: [_jsx("div", { className: "hidden lg:flex w-full lg:w-[20%] border-b lg:border-r border-flash/10 h-auto lg:h-full shrink-0 overflow-x-auto lg:overflow-y-auto scrollbar-hide flex-col pt-3 lg:pt-6", children: _jsxs("div", { children: [_jsxs("div", { className: cn("relative mx-2 mb-3 rounded-[2px] border border-flash/10 bg-filmdark/30 overflow-hidden", nametag && userRegion && "cursor-clicker hover:bg-filmdark/40 transition-colors"), onClick: () => {
                                                if (nametag && userRegion) {
                                                    const [n, t] = nametag.split("#");
                                                    navigate(`/summoners/${userRegion.toLowerCase()}/${n.replace(/\s+/g, "+")}-${t}`);
                                                }
                                            }, children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsxs("div", { className: "flex items-center gap-3 px-3 py-2.5 pl-4", children: [_jsx("img", { src: avatarSrc, alt: "", className: "w-9 h-9 rounded-sm object-cover border border-flash/10 flex-shrink-0" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.1em] uppercase text-flash/80 truncate", children: displayName }), nametag && (_jsx("p", { className: "text-[9px] font-mono tracking-[0.15em] uppercase text-jade/50 mt-0.5", children: "LINKED" })), !nametag && (_jsx("p", { className: "text-[9px] font-mono tracking-[0.15em] uppercase text-flash/30 mt-0.5", children: "NOT LINKED" }))] })] })] }), _jsxs(TabsList, { className: "flex flex-row flex-wrap lg:flex-col lg:flex-nowrap items-stretch gap-1 px-2 pt-1 bg-transparent w-full lg:w-[80%] h-auto lg:overflow-visible", children: [_jsx(TabsTrigger, { value: "profile", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "PROFILE" }), _jsx(TabsTrigger, { value: "documentation", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "DOCUMENTATION" }), _jsx(TabsTrigger, { value: "billing", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "BILLING" }), _jsx(TabsTrigger, { value: "preferences", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "PREFERENCES" }), _jsx(TabsTrigger, { value: "scout", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "SCOUT" }), isAdmin && (_jsxs(_Fragment, { children: [_jsx(Separator, { className: "hidden lg:block bg-flash/15 my-2" }), _jsx(TabsTrigger, { value: "database", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "DATABASE" }), _jsx(TabsTrigger, { value: "proApplications", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "PRO APPLICATIONS" }), _jsx(TabsTrigger, { value: "streamerApplications", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "STREAMER APPLICATIONS" }), _jsx(TabsTrigger, { value: "accountLink", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "ACCOUNT LINK" }), _jsx(TabsTrigger, { value: "planSetup", className: "shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors", children: "PLAN SETUP" })] })), _jsx(Separator, { className: "hidden lg:block bg-flash/15 mb-3" }), _jsx("button", { type: "button", onClick: handleLogout, className: "w-auto lg:w-full shrink-0 px-3 py-1.5 rounded-none font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/40 hover:text-red-400/80 hover:bg-red-400/5 cursor-clicker text-left transition-colors", children: "LOGOUT" })] })] }) }), _jsxs("div", { className: "w-full lg:w-[80%] h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-hide pb-20 lg:pb-0", children: [_jsx(TabsContent, { value: "profile", className: "outline-none", children: _jsxs("div", { className: "flex flex-col gap-5 p-3 px-3 sm:p-4 sm:px-6", children: [_jsx(PremiumAvatarUploader, {}), _jsx(DiscordLinker, {}), _jsx(ProfilerLinker, {}), _jsx(ChangePassword, {}), _jsx(AccountDeletion, {})] }) }), _jsx(TabsContent, { value: "preferences", className: "outline-none", children: _jsxs("div", { className: "flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6", children: [_jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: GENERAL ::" }), _jsx(ThemePreference, {}), _jsx(AmbientLightPreference, {}), _jsx(LegacyRankIconsPreference, {})] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: cn("text-[11px] font-mono tracking-[0.25em] uppercase transition-all duration-700", highlightSummoner
                                                                ? "text-jade drop-shadow-[0_0_8px_rgba(0,217,146,0.6)]"
                                                                : "text-jade/50"), children: ":: SUMMONER PAGE ::" }), _jsx(MatchGroupingPreference, {}), _jsx(ColoredMatchBgPreference, {}), _jsx(MatchCenteringPreference, {}), _jsx(HideRemakesPreference, {}), _jsx(StatsBarPreference, {}), _jsx(ContextMenuActionsPreference, {}), _jsx(ClickToExpandPreference, {})] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: ANIMATIONS ::" }), _jsx(BorderBeamPreference, {}), _jsx(TechBackgroundPreference, {}), _jsx(MatchTransitionPreference, {})] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: CUSTOMIZATIONS ::" }), _jsx(QuickSlotsPreference, {})] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: CHAMPION PICKER ::" }), _jsx(SettingsCard, { title: "Champion Picker UI", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("span", { className: "text-flash/80 text-sm", children: "Choose between Sheet (shadcn) and Radial dock." }), _jsxs("div", { className: "relative flex shrink-0 rounded-sm border border-hairline/[0.08] bg-filmlight/[0.02] p-[3px]", children: [_jsx("div", { className: cn("absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] rounded-[2px]", "bg-jade/15 border border-jade/30", "transition-all duration-300 ease-out", "shadow-[0_0_8px_rgba(0,217,146,0.1)]", pickerMode === "sheet" ? "left-[3px]" : "left-[calc(50%)]") }), _jsx("button", { type: "button", onClick: () => setPickerMode("sheet"), className: cn("relative z-10 px-4 py-1 text-[11px] font-jetbrains uppercase tracking-[0.15em] cursor-clicker rounded-[2px]", "transition-colors duration-300", pickerMode === "sheet" ? "text-jade" : "text-flash/40 hover:text-flash/60"), children: "Sheet" }), _jsx("button", { type: "button", onClick: () => setPickerMode("radial"), className: cn("relative z-10 px-4 py-1 text-[11px] font-jetbrains uppercase tracking-[0.15em] cursor-clicker rounded-[2px]", "transition-colors duration-300", pickerMode === "radial" ? "text-jade" : "text-flash/40 hover:text-flash/60"), children: "Radial" })] })] }) })] })] }) }), _jsx(TabsContent, { value: "scout", className: "outline-none", children: _jsx("div", { className: "flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6", children: _jsxs("div", { children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-1", children: ":: YOUR SCOUT LOBBIES ::" }), _jsx("p", { className: "text-[11px] font-mono text-flash/30 leading-relaxed mb-3", children: "Shareable feeds tracking up to 20 players each. Lobby quota depends on your plan." }), _jsx(ScoutLobbiesManager, {})] }) }) }), _jsx(TabsContent, { value: "documentation", className: "outline-none", children: _jsx(DocumentationGuide, {}) }), _jsx(TabsContent, { value: "billing", className: "outline-none", children: _jsx(BillingTabContent, { plan: plan }) }), isAdmin && (_jsx(TabsContent, { value: "database", className: "outline-none", children: _jsx(DatabaseStatsPanel, {}) })), isAdmin && (_jsx(TabsContent, { value: "proApplications", className: "outline-none", children: _jsx("div", { className: "flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6", children: _jsx(ProApplicationsAdminPanel, {}) }) })), isAdmin && (_jsx(TabsContent, { value: "streamerApplications", className: "outline-none", children: _jsx("div", { className: "flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6", children: _jsx(StreamerAdminPanel, {}) }) })), isAdmin && (_jsx(TabsContent, { value: "accountLink", className: "outline-none", children: _jsx(AccountLinkOverride, {}) })), isAdmin && (_jsx(TabsContent, { value: "planSetup", className: "outline-none", children: _jsx(PlanSetupContent, { currentPlan: plan }) }))] }), _jsx("div", { className: "flex-1 h-full overflow-hidden" })] }) }) })] }));
}
// ─── Billing tab inner panel ────────────────────────────────────────
// Luxury treatment: glass plan card with BorderBeam + jade halo, plan
// perks listed inline, and a Manage Subscription button that opens the
// Stripe customer portal. Sub-component shared between dashboard tab
// and (if we ever want to) any standalone billing route.
//
// Portal opening flows through POST /api/billing/portal-session —
// Stripe requires a fresh session URL on each visit (URLs expire), so
// we never cache it; the fetch happens on click.
function BillingTabContent({ plan }) {
    const [loadingPortal, setLoadingPortal] = useState(false);
    const isPaid = !!plan && plan !== "free";
    const isElite = plan === "elite";
    const displayPlan = (plan ?? "free").toUpperCase();
    async function openPortal() {
        try {
            setLoadingPortal(true);
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            const resp = await fetch(`${API_BASE_URL}/api/billing/portal-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!resp.ok) {
                const body = await resp.text().catch(() => "");
                throw new Error(`HTTP ${resp.status} ${body}`.trim());
            }
            const { url } = await resp.json();
            if (!url)
                throw new Error("Missing portal URL");
            window.location.href = url;
        }
        catch (err) {
            console.error("Portal error:", err);
            showCyberToast({
                title: "Couldn't open the portal",
                description: "Stripe didn't return a session URL. Refresh and try again in a moment.",
                tag: "STRIPE",
                variant: "error",
                duration: 4500,
                id: "stripe-portal-error",
            });
            setLoadingPortal(false);
        }
    }
    // Per-plan perks shown inline so the user sees what they're getting
    // even when not on the success page. Truncated copy fitting the
    // dashboard's compact column width.
    const perks = isElite
        ? [
            { icon: Crown, label: "Scout lobbies ×3" },
            { icon: Sparkles, label: "AI Coach + Matchup Engine" },
            { icon: Sparkles, label: "10× daily AI tokens" },
            { icon: Check, label: "Early access to new features" },
            { icon: Check, label: "Private Discord channel" },
            { icon: Check, label: "Priority support" },
        ]
        : isPaid
            ? [
                { icon: Crown, label: "Scout lobbies ×2" },
                { icon: Sparkles, label: "AI Coach + Matchup Engine" },
                { icon: Sparkles, label: "Itemization analysis" },
                { icon: Check, label: "Daily performance reports" },
                { icon: Check, label: "Unlimited player & champion analysis" },
            ]
            : [
                { icon: Check, label: "Personal data tracking" },
                { icon: Check, label: "3 daily AI tokens" },
                { icon: Check, label: "Complete loldata stats access" },
            ];
    // AI credit balance + plan economics, folded into the membership card below.
    const allot = isElite ? 750 : isPaid ? 150 : 3;
    const priceLabel = isElite ? "€14.99 / month" : isPaid ? "€3.49 / month" : null;
    const [credits, setCredits] = useState(null);
    const [creditReset, setCreditReset] = useState(null);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (!token)
                    return;
                const r = await fetch(`${BOX_API_BASE_URL}/api/ai/credits`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!r.ok || !alive)
                    return;
                const d = await r.json();
                if (!alive)
                    return;
                if (typeof d.credits === "number")
                    setCredits(d.credits);
                if (d.resetAt)
                    setCreditReset(d.resetAt);
            }
            catch {
                /* endpoint not live yet — show "—" */
            }
        })();
        return () => {
            alive = false;
        };
    }, []);
    const creditPct = credits == null ? 6 : Math.max(6, Math.min(100, (credits / allot) * 100));
    const creditUntil = (() => {
        if (!creditReset)
            return null;
        const ms = new Date(creditReset).getTime() - Date.now();
        if (ms <= 0)
            return "soon";
        const h = Math.floor(ms / 3_600_000);
        if (h < 1)
            return `${Math.max(1, Math.floor(ms / 60_000))}m`;
        if (h < 24)
            return `${h}h`;
        return `${Math.floor(h / 24)}d`;
    })();
    return (_jsxs("div", { className: "flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-flash/60", children: "BILLING" }), _jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-flash/35", children: ":: SUBSCRIPTION ::" })] }), _jsxs(motion.div, { className: "relative overflow-hidden rounded-lg bg-filmdark/40 backdrop-blur-lg saturate-150 glass-panel", style: {
                    boxShadow: isPaid
                        ? "0 22px 60px rgba(0,0,0,0.6), 0 0 36px rgba(0,217,146,0.16), inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
                        : "0 22px 60px rgba(0,0,0,0.55), inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
                }, initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }, children: [isPaid ? _jsx(BorderBeam, { duration: 10, size: 220 }) : null, _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2", children: [_jsxs("div", { className: "relative p-6 border-b md:border-b-0 md:border-r border-hairline/[0.07]", children: [isPaid ? (_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -top-20 -left-20 h-56 w-56", style: {
                                            background: "radial-gradient(circle, rgba(0,217,146,0.28) 0%, transparent 70%)",
                                        } })) : null, _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.25em] text-flash/45", children: "Current plan" }), _jsxs("span", { className: cn("inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em]", isPaid
                                                            ? "border-jade/40 bg-jade/15 text-jade"
                                                            : "border-flash/15 bg-flash/[0.05] text-flash/50"), style: isPaid ? { boxShadow: "0 0 16px rgba(0,217,146,0.22)" } : undefined, children: [_jsx("span", { className: cn("h-1.5 w-1.5 rounded-full", isPaid ? "bg-jade animate-pulse" : "bg-flash/40") }), isPaid ? "Active" : "Free"] })] }), _jsx("div", { className: cn("mt-3 font-jetbrains text-4xl font-bold tabular-nums tracking-[0.04em]", isPaid ? "text-jade" : "text-flash/85"), style: isPaid
                                                    ? {
                                                        textShadow: "0 0 22px rgba(0,217,146,0.5), 0 0 48px rgba(0,217,146,0.2)",
                                                    }
                                                    : undefined, children: displayPlan }), _jsx("div", { className: "mt-2 font-jetbrains text-[12px] text-flash/55", children: priceLabel ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-flash/80", children: priceLabel }), _jsx("span", { className: "text-flash/40", children: " \u00B7 billed via Stripe" })] })) : ("No active subscription") })] })] }), _jsxs("div", { className: "relative p-6 bg-jade/[0.03]", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsxs("span", { className: "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-flash/45", children: [_jsx(Sparkles, { className: "h-3 w-3 text-jade" }), " AI credits"] }), _jsx("span", { className: "font-mono text-[9px] uppercase tracking-[0.18em] text-flash/35", children: "1 / question" })] }), _jsxs("div", { className: "mt-3 flex items-baseline gap-1.5", children: [_jsx("span", { className: "font-jetbrains text-4xl font-bold tabular-nums tracking-[0.04em] text-jade", style: { textShadow: "0 0 22px rgba(0,217,146,0.45)" }, children: credits ?? "—" }), _jsxs("span", { className: "font-jetbrains text-lg tabular-nums text-flash/35", children: ["/ ", allot] })] }), _jsx("div", { className: "mt-3 h-1.5 w-full overflow-hidden rounded-full bg-flash/[0.07]", children: _jsx(motion.div, { className: "h-full rounded-full bg-jade", style: { boxShadow: "0 0 10px rgba(0,217,146,0.5)" }, initial: { width: 0 }, animate: { width: `${creditPct}%` }, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }) }), _jsxs("p", { className: "mt-2.5 font-jetbrains text-[11px] text-flash/45", children: [isPaid ? `Refills to ${allot} monthly` : "Refills to 3 daily", creditUntil ? ` · resets in ${creditUntil}` : ""] })] })] }), _jsxs("div", { className: "border-t border-hairline/[0.07] px-6 py-5", children: [_jsx("div", { className: "mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-flash/40", children: isPaid ? "Included with your plan" : "Free tier includes" }), _jsx("ul", { className: "grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2", children: perks.map((p, i) => {
                                    const Icon = p.icon;
                                    return (_jsxs(motion.li, { className: "flex items-center gap-2.5 font-jetbrains text-[12px] text-flash/75", initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0 }, transition: {
                                            duration: 0.35,
                                            delay: 0.2 + i * 0.04,
                                            ease: [0.22, 1, 0.36, 1],
                                        }, children: [_jsx("span", { className: cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border", isPaid
                                                    ? "border-jade/40 bg-jade/15 text-jade"
                                                    : "border-flash/15 bg-flash/[0.05] text-flash/55"), children: _jsx(Icon, { className: "h-3 w-3", strokeWidth: 2.5 }) }), _jsx("span", { className: "truncate", children: p.label })] }, i));
                                }) })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 border-t border-hairline/[0.07] bg-filmdark/20 px-6 py-4", children: [isPaid ? (_jsxs(motion.button, { type: "button", onClick: openPortal, disabled: loadingPortal, whileHover: loadingPortal ? undefined : { y: -1 }, transition: { duration: 0.18 }, className: "group inline-flex items-center justify-center gap-2.5 rounded-sm bg-jade px-6 py-2.5 font-jetbrains text-[12px] uppercase tracking-[0.22em] text-liquirice shadow-[0_12px_28px_rgba(0,217,146,0.32),0_0_18px_rgba(0,217,146,0.25)] transition-all duration-200 hover:bg-jade/95 disabled:cursor-not-allowed disabled:opacity-60 cursor-clicker", children: [loadingPortal ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(CreditCard, { className: "h-4 w-4" })), loadingPortal ? "OPENING…" : "MANAGE SUBSCRIPTION", !loadingPortal && (_jsx(ExternalLink, { className: "h-3 w-3 opacity-75 transition-transform duration-200 group-hover:translate-x-0.5" }))] })) : (_jsxs(Link, { to: "/pricing", className: "group inline-flex items-center justify-center gap-2.5 rounded-sm bg-jade px-6 py-2.5 font-jetbrains text-[12px] uppercase tracking-[0.22em] text-liquirice shadow-[0_12px_28px_rgba(0,217,146,0.32),0_0_18px_rgba(0,217,146,0.25)] transition-all duration-200 hover:bg-jade/95 cursor-clicker", children: [_jsx(CreditCard, { className: "h-4 w-4" }), "VIEW PLANS", _jsx(ExternalLink, { className: "h-3 w-3 opacity-75 transition-transform duration-200 group-hover:translate-x-0.5" })] })), _jsx("p", { className: "font-mono text-[10px] uppercase tracking-[0.18em] text-flash/30", children: "Secured by Stripe \u00B7 no card details stored" })] })] })] }));
}
// ─── ADMIN: Plan Setup debug panel ──────────────────────────────────
// Lets admin users force-switch their own `plan` column in Supabase
// to any tier without going through Stripe. Useful for:
//   • Previewing the /billing/success cinematic without a real payment
//   • Testing plan-gated feature gates (AI tokens, scout lobbies)
//   • Resetting a stale stripe_customer_id after test/live mode switch
//
// Citrine accent throughout so this section reads as "tools, not a
// production feature" — distinct from the jade dashboard tabs.
function PlanSetupContent({ currentPlan }) {
    const { session, refreshProfile } = useAuth();
    const [pending, setPending] = useState(null);
    const [resetting, setResetting] = useState(false);
    const userId = session?.user?.id;
    const email = session?.user?.email ?? "—";
    // Force-set plan + null the dependent stripe columns so the value
    // we set doesn't conflict with a stale subscription record.
    async function setPlan(next) {
        if (!userId)
            return;
        try {
            setPending(next);
            const { error } = await supabase
                .from("profile_players")
                .update({ plan: next })
                .eq("profile_id", userId);
            if (error)
                throw error;
            await refreshProfile();
            showCyberToast({
                title: `Plan switched → ${next.toUpperCase()}`,
                description: "Refreshed locally. Plan-gated UI will re-evaluate.",
                tag: "DEBUG",
                variant: "status",
                duration: 2800,
                id: "plan-debug-switch",
            });
        }
        catch (err) {
            console.error("plan switch error", err);
            showCyberToast({
                title: "Couldn't switch plan",
                description: err?.message ?? "Supabase rejected the update.",
                tag: "DEBUG",
                variant: "error",
                duration: 4000,
            });
        }
        finally {
            setPending(null);
        }
    }
    // Wipes stripe_customer_id + dependent columns. Forces the next
    // checkout to mint a new customer in whatever Stripe environment
    // the backend is currently configured for.
    async function resetStripe() {
        if (!userId)
            return;
        if (!window.confirm("Reset Stripe linkage on YOUR profile? This nulls stripe_customer_id + subscription columns. Use after switching test ↔ live keys."))
            return;
        try {
            setResetting(true);
            const { error } = await supabase
                .from("profile_players")
                .update({
                stripe_customer_id: null,
                stripe_subscription_id: null,
                subscription_status: null,
                current_period_end: null,
            })
                .eq("profile_id", userId);
            if (error)
                throw error;
            await refreshProfile();
            showCyberToast({
                title: "Stripe linkage cleared",
                description: "Next checkout will create a fresh Stripe customer in the active environment.",
                tag: "DEBUG",
                variant: "status",
                duration: 3500,
            });
        }
        catch (err) {
            console.error("stripe reset error", err);
            showCyberToast({
                title: "Couldn't clear Stripe linkage",
                description: err?.message ?? "Supabase rejected the update.",
                tag: "DEBUG",
                variant: "error",
                duration: 4000,
            });
        }
        finally {
            setResetting(false);
        }
    }
    const planButtons = [
        { key: "free", label: "FREE", hint: "Tier 00 — default" },
        { key: "premium", label: "PREMIUM", hint: "Tier 02" },
        { key: "elite", label: "ELITE", hint: "Tier 03 — max" },
    ];
    return (_jsxs("div", { className: "flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-citrine/85", children: "\u2699 PLAN SETUP" }), _jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-citrine/45", children: ":: DEBUG ONLY ::" }), _jsxs("p", { className: "text-[12px] text-flash/55 leading-relaxed max-w-xl", children: ["Force-switch your ", _jsx("code", { className: "text-citrine/85", children: "plan" }), " column in ", _jsx("code", { className: "text-flash/80", children: "profile_players" }), " without going through Stripe. Use this to preview gated UI, test the success cinematic, or reset stale Stripe linkage after env-var swaps."] })] }), _jsx("div", { className: "rounded-md border border-citrine/15 bg-filmdark/30 backdrop-blur-md p-4", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-jetbrains", children: [_jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1", children: "EMAIL" }), _jsx("div", { className: "text-flash/80 truncate", children: email })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1", children: "PROFILE_ID" }), _jsx("div", { className: "text-flash/80 truncate tabular-nums", children: userId ?? "—" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1", children: "CURRENT PLAN" }), _jsx("div", { className: cn("font-bold tabular-nums", currentPlan && currentPlan !== "free"
                                        ? "text-jade"
                                        : "text-flash/85"), children: (currentPlan ?? "free").toUpperCase() })] })] }) }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-citrine/55 mb-3", children: "\u25B8 Switch tier" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3", children: planButtons.map((b) => {
                            const isCurrent = (currentPlan ?? "free") === b.key;
                            const isPending = pending === b.key;
                            return (_jsxs("button", { type: "button", onClick: () => setPlan(b.key), disabled: isCurrent || pending !== null, className: cn("relative rounded-sm border p-4 text-left transition-all duration-200 cursor-clicker", "disabled:cursor-not-allowed", isCurrent
                                    ? "border-jade/55 bg-jade/10 shadow-[0_0_24px_rgba(0,217,146,0.25)]"
                                    : "border-flash/15 bg-filmdark/30 hover:border-citrine/45 hover:bg-citrine/[0.05]"), children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("span", { className: cn("font-jetbrains text-[10px] uppercase tracking-[0.22em]", isCurrent ? "text-jade" : "text-flash/50"), children: b.hint }), isCurrent && (_jsxs("span", { className: "text-[9px] font-mono uppercase tracking-[0.2em] text-jade flex items-center gap-1", children: [_jsx(Check, { className: "w-2.5 h-2.5", strokeWidth: 3 }), "ACTIVE"] })), isPending && (_jsx(Loader2, { className: "w-3 h-3 text-citrine animate-spin" }))] }), _jsx("div", { className: cn("font-jetbrains font-bold tabular-nums text-2xl", isCurrent ? "text-jade" : "text-flash/85"), style: isCurrent
                                            ? {
                                                textShadow: "0 0 18px rgba(0,217,146,0.5), 0 0 36px rgba(0,217,146,0.18)",
                                            }
                                            : undefined, children: b.label })] }, b.key));
                        }) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-citrine/55 mb-3", children: "\u25B8 Utilities" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs(Link, { to: "/billing/success?session_id=cs_debug_local", className: "\n              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-sm\n              font-jetbrains text-[11px] tracking-[0.2em] uppercase\n              text-citrine border border-citrine/40 bg-citrine/[0.05]\n              hover:bg-citrine/15 hover:border-citrine/65\n              transition-colors duration-200 cursor-clicker\n            ", children: [_jsx(Sparkles, { className: "w-3.5 h-3.5" }), "PREVIEW SUCCESS PAGE", _jsx(ExternalLink, { className: "w-3 h-3 opacity-65" })] }), _jsxs("button", { type: "button", onClick: resetStripe, disabled: resetting, className: "\n              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-sm\n              font-jetbrains text-[11px] tracking-[0.2em] uppercase\n              text-red-400/85 border border-red-400/30 bg-red-400/[0.04]\n              hover:bg-red-400/10 hover:border-red-400/55 hover:text-red-300\n              disabled:opacity-60 disabled:cursor-not-allowed\n              transition-colors duration-200 cursor-clicker\n            ", children: [resetting ? (_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" })) : (_jsx(CreditCard, { className: "w-3.5 h-3.5" })), resetting ? "WIPING…" : "RESET STRIPE LINKAGE"] })] })] }), _jsx("p", { className: "text-[10px] font-mono tracking-[0.18em] uppercase text-flash/30 leading-relaxed", children: "These actions edit your own profile row only. Other users are not affected. Use for staging / preview / sanity tests." })] }));
}
