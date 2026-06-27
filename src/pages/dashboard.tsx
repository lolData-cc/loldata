import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { showCyberToast } from "@/lib/toast-utils";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { PremiumAvatarUploader } from "@/components/profileavataruploader";
import { Label } from "@/components/ui/label";
import { useChampionPicker } from "@/context/championpickercontext";
import { ProfilerLinker } from "@/components/profilelinker";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import { LegacyRankIconsPreference } from "@/components/legacyrankiconspreference";
import { AmbientLightPreference } from "@/components/ambientlightpreference";
import { ChangePassword } from "@/components/changepassword";
import ScoutLobbiesManager from "@/components/scoutlobbiesmanager";
import { cdnBaseUrl, API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Loader2, CreditCard, ExternalLink, Check, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { pickerMode, setPickerMode } = useChampionPicker();

  const { session, isAdmin, nametag, avatarUrl, region: userRegion, plan } = useAuth();

  useEffect(() => {
    document.title = "Dashboard - lolData";
    return () => { document.title = "lolData"; };
  }, []);
  const email = session?.user?.email ?? ""
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
  }, [])

  // Fetch summoner icon_id when account is linked
  const [iconId, setIconId] = useState<number | null>(null)
  useEffect(() => {
    if (!nametag) { setIconId(null); return }
    const [name, tag] = nametag.split("#")
    if (!name || !tag) return
    supabase
      .from("users")
      .select("icon_id")
      .eq("name", name)
      .eq("tag", tag)
      .single()
      .then(({ data }) => { if (data?.icon_id) setIconId(data.icon_id) })
  }, [nametag])

  // Resolve avatar source
  const avatarSrc = avatarUrl
    ? avatarUrl
    : `${cdnBaseUrl()}/img/profileicon/${iconId ?? 29}.png`
  const displayName = nametag ?? email

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

  return (
    <div className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen grid grid-rows-[64px,1fr] md:grid-rows-[auto,1fr] overflow-hidden">
      {/* riga 1: navbar */}
      <div className="w-full">
        <div className="xl:w-[65%] min-[2560px]:w-[55%] w-full mx-auto">
          <Navbar />
          <Separator className="bg-flash/20 mt-0 w-full" />
        </div>
      </div>

      {/* mobile section picker — a bottom bar that rises up to choose a section (phone only) */}
      <div className="lg:hidden">
        {pickerOpen && <div className="fixed inset-0 z-[55] bg-black/60" onClick={() => setPickerOpen(false)} />}
        <div className="fixed inset-x-0 bottom-0 z-[56] border-t border-jade/25 bg-[rgba(5,10,12,0.97)] backdrop-blur-xl">
          <button type="button" onClick={() => setPickerOpen((v) => !v)} className="w-full h-14 flex items-center justify-between px-5 cursor-clicker">
            <span className="flex items-center gap-2 font-jetbrains text-[12px] tracking-[0.18em] uppercase text-jade">
              <span className="w-1.5 h-1.5 rounded-full bg-jade" />{currentSectionLabel}
            </span>
            <svg className={cn("w-4 h-4 text-flash/50 transition-transform", pickerOpen && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6" /></svg>
          </button>
          <div className={cn("overflow-hidden transition-[max-height] duration-300 ease-out", pickerOpen ? "max-h-[60vh]" : "max-h-0")}>
            <div className="max-h-[60vh] overflow-y-auto scrollbar-hide px-2 pb-3">
              {SECTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { navigate(`/dashboard/${s.value}`, { replace: true }); setPickerOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-sm font-jetbrains text-[12px] tracking-[0.15em] uppercase border-l-2 transition-colors cursor-clicker",
                    activeTab === s.value ? "text-jade border-jade bg-jade/10" : "text-flash/55 border-transparent hover:text-flash/80"
                  )}
                >
                  {s.label}
                </button>
              ))}
              <button type="button" onClick={handleLogout} className="w-full text-left px-3 py-2.5 mt-1 rounded-sm font-jetbrains text-[12px] tracking-[0.15em] uppercase text-flash/40 hover:text-red-400/80 cursor-clicker">
                LOGOUT
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* riga 2: contenuto */}
      <div className="w-full min-h-0">
        <div className="xl:w-[65%] min-[2560px]:w-[55%] w-full mx-auto px-4 h-full min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => navigate(`/dashboard/${v}`, { replace: true })} className="flex flex-col lg:flex-row w-full h-full min-h-0">
            {/* sidebar — desktop only; on phone the bottom section picker replaces it */}
            <div className="hidden lg:flex w-full lg:w-[20%] border-b lg:border-r border-flash/10 h-auto lg:h-full shrink-0 overflow-x-auto lg:overflow-y-auto scrollbar-hide flex-col pt-3 lg:pt-6">
              <div>
                {/* User identity card */}
                <div
                  className={cn(
                    "relative mx-2 mb-3 rounded-[2px] border border-flash/10 bg-black/30 overflow-hidden",
                    nametag && userRegion && "cursor-clicker hover:bg-black/40 transition-colors"
                  )}
                  onClick={() => {
                    if (nametag && userRegion) {
                      const [n, t] = nametag.split("#");
                      navigate(`/summoners/${userRegion.toLowerCase()}/${n.replace(/\s+/g, "+")}-${t}`);
                    }
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
                  <div className="flex items-center gap-3 px-3 py-2.5 pl-4">
                    <img
                      src={avatarSrc}
                      alt=""
                      className="w-9 h-9 rounded-sm object-cover border border-flash/10 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono tracking-[0.1em] uppercase text-flash/80 truncate">
                        {displayName}
                      </p>
                      {nametag && (
                        <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-jade/50 mt-0.5">
                          LINKED
                        </p>
                      )}
                      {!nametag && (
                        <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-flash/30 mt-0.5">
                          NOT LINKED
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <TabsList className="flex flex-row flex-wrap lg:flex-col lg:flex-nowrap items-stretch gap-1 px-2 pt-1 bg-transparent w-full lg:w-[80%] h-auto lg:overflow-visible">
                  <TabsTrigger
                    value="profile"
                    className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    PROFILE
                  </TabsTrigger>

                  <TabsTrigger
                    value="documentation"
                    className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    DOCUMENTATION
                  </TabsTrigger>

                  <TabsTrigger
                    value="billing"
                    className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    BILLING
                  </TabsTrigger>

                  <TabsTrigger
                    value="preferences"
                    className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    PREFERENCES
                  </TabsTrigger>

                  <TabsTrigger
                    value="scout"
                    className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    SCOUT
                  </TabsTrigger>

                  {/* ✅ ADMIN ONLY tabs - tra tabs e logout */}
                  {isAdmin && (
                    <>
                      <Separator className="hidden lg:block bg-flash/15 my-2" />

                      <TabsTrigger
                        value="database"
                        className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                      >
                        DATABASE
                      </TabsTrigger>

                      <TabsTrigger
                        value="proApplications"
                        className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                      >
                        PRO APPLICATIONS
                      </TabsTrigger>

                      <TabsTrigger
                        value="streamerApplications"
                        className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                      >
                        STREAMER APPLICATIONS
                      </TabsTrigger>

                      <TabsTrigger
                        value="accountLink"
                        className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                      >
                        ACCOUNT LINK
                      </TabsTrigger>

                      <TabsTrigger
                        value="planSetup"
                        className="shrink-0 lg:w-full justify-center lg:justify-start whitespace-nowrap px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-b-2 lg:data-[state=active]:border-b-0 lg:data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-b-2 lg:border-b-0 lg:border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                      >
                        PLAN SETUP
                      </TabsTrigger>
                    </>
                  )}

                  <Separator className="hidden lg:block bg-flash/15 mb-3" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-auto lg:w-full shrink-0 px-3 py-1.5 rounded-none font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/40 hover:text-red-400/80 hover:bg-red-400/5 cursor-clicker text-left transition-colors"
                  >
                    LOGOUT
                  </button>
                </TabsList>
              </div>
            </div>

            {/* 70%: content scrollabile */}
            <div className="w-full lg:w-[80%] h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-hide pb-20 lg:pb-0">
              {/* PROFILE TAB */}
              <TabsContent value="profile" className="outline-none">
                <div className="flex flex-col gap-5 p-3 px-3 sm:p-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">:: AVATAR ::</p>
                    <PremiumAvatarUploader />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">:: DISCORD ::</p>
                    <DiscordLinker />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">:: LEAGUE PROFILE ::</p>
                    <ProfilerLinker />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">:: SECURITY ::</p>
                    <ChangePassword />
                  </div>
                  <div>
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-2">:: DANGER ZONE ::</p>
                    <AccountDeletion />
                  </div>
                </div>
              </TabsContent>

              {/* PREFERENCES TAB */}
              <TabsContent value="preferences" className="outline-none">
                <div className="flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6">
                  {/* GENERAL */}
                  <div className="space-y-3">
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">:: GENERAL ::</p>
                    <AmbientLightPreference />
                    <LegacyRankIconsPreference />
                  </div>

                  <div className="space-y-3">
                    <p className={cn(
                      "text-[11px] font-mono tracking-[0.25em] uppercase transition-all duration-700",
                      highlightSummoner
                        ? "text-jade drop-shadow-[0_0_8px_rgba(0,217,146,0.6)]"
                        : "text-jade/50"
                    )}>:: SUMMONER PAGE ::</p>
                    <MatchGroupingPreference />
                    <ColoredMatchBgPreference />
                    <MatchCenteringPreference />
                    <HideRemakesPreference />
                    <StatsBarPreference />
                    <ContextMenuActionsPreference />
                    <ClickToExpandPreference />
                  </div>

                  <div className="space-y-3">
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">:: ANIMATIONS ::</p>
                    <BorderBeamPreference />
                    <TechBackgroundPreference />
                    <MatchTransitionPreference />
                  </div>

                  <div className="space-y-3">
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">:: CHAMPION PICKER ::</p>

                    <div className="relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
                      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
                      <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
                      <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
                      <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />

                      <div className="relative z-[2] px-4 py-3 pl-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">Champion Picker UI</h4>
                            <span className="text-flash/80 text-sm">
                              Choose between Sheet (shadcn) and Radial dock.
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />

                        <div className="flex justify-end pt-3">
                          <div className="relative flex rounded-sm border border-white/[0.08] bg-white/[0.02] p-[3px]">
                            {/* Sliding indicator */}
                            <div
                              className={cn(
                                "absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] rounded-[2px]",
                                "bg-jade/15 border border-jade/30",
                                "transition-all duration-300 ease-out",
                                "shadow-[0_0_8px_rgba(0,217,146,0.1)]",
                                pickerMode === "sheet" ? "left-[3px]" : "left-[calc(50%)]"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => setPickerMode("sheet")}
                              className={cn(
                                "relative z-10 px-4 py-1 text-[11px] font-jetbrains uppercase tracking-[0.15em] cursor-clicker rounded-[2px]",
                                "transition-colors duration-300",
                                pickerMode === "sheet" ? "text-jade" : "text-flash/40 hover:text-flash/60"
                              )}
                            >
                              Sheet
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickerMode("radial")}
                              className={cn(
                                "relative z-10 px-4 py-1 text-[11px] font-jetbrains uppercase tracking-[0.15em] cursor-clicker rounded-[2px]",
                                "transition-colors duration-300",
                                pickerMode === "radial" ? "text-jade" : "text-flash/40 hover:text-flash/60"
                              )}
                            >
                              Radial
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </TabsContent>

              {/* SCOUT TAB */}
              <TabsContent value="scout" className="outline-none">
                <div className="flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-1">
                      :: YOUR SCOUT LOBBIES ::
                    </p>
                    <p className="text-[11px] font-mono text-flash/30 leading-relaxed mb-3">
                      Shareable feeds tracking up to 20 players each.
                      Lobby quota depends on your plan.
                    </p>
                    <ScoutLobbiesManager />
                  </div>
                </div>
              </TabsContent>

              {/* DOCUMENTATION TAB */}
              <TabsContent value="documentation" className="outline-none">
                <DocumentationGuide />
              </TabsContent>

              {/* BILLING TAB */}
              <TabsContent value="billing" className="outline-none">
                <BillingTabContent plan={plan} />
              </TabsContent>

              {/* ADMIN TAB: DATABASE */}
              {isAdmin && (
                <TabsContent value="database" className="outline-none">
                  <DatabaseStatsPanel />
                </TabsContent>
              )}

              {/* ADMIN TAB: PRO APPLICATIONS */}
              {isAdmin && (
                <TabsContent value="proApplications" className="outline-none">
                  <div className="flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6">
                    <ProApplicationsAdminPanel />
                  </div>
                </TabsContent>
              )}

              {/* ADMIN TAB: STREAMER MANAGEMENT */}
              {isAdmin && (
                <TabsContent value="streamerApplications" className="outline-none">
                  <div className="flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6">
                    <StreamerAdminPanel />
                  </div>
                </TabsContent>
              )}

              {/* ADMIN TAB: ACCOUNT LINK (force-link a profile, no RSO) */}
              {isAdmin && (
                <TabsContent value="accountLink" className="outline-none">
                  <AccountLinkOverride />
                </TabsContent>
              )}

              {/* ADMIN TAB: PLAN SETUP (debug-only plan switcher) */}
              {isAdmin && (
                <TabsContent value="planSetup" className="outline-none">
                  <PlanSetupContent currentPlan={plan} />
                </TabsContent>
              )}
            </div>

            <div className="flex-1 h-full overflow-hidden" />
          </Tabs>
        </div>
      </div>
    </div>
  );
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
function BillingTabContent({ plan }: { plan: string | null }) {
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
      if (!url) throw new Error("Missing portal URL");
      window.location.href = url;
    } catch (err) {
      console.error("Portal error:", err);
      showCyberToast({
        title: "Couldn't open the portal",
        description:
          "Stripe didn't return a session URL. Refresh and try again in a moment.",
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
  const perks: { icon: typeof Check; label: string }[] = isElite
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

  return (
    <div className="flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6">
      <div className="space-y-2">
        <h3 className="text-flash/60">BILLING</h3>
        <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-flash/35">
          :: SUBSCRIPTION ::
        </p>
      </div>

      {/* Current plan — luxury glass card with BorderBeam + jade halo. */}
      <motion.div
        className="relative overflow-hidden rounded-md bg-black/45 backdrop-blur-lg saturate-150 p-6"
        style={{
          boxShadow: isPaid
            ? "0 18px 50px rgba(0,0,0,0.6), 0 0 32px rgba(0,217,146,0.18), inset 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.06)"
            : "0 18px 50px rgba(0,0,0,0.55), inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isPaid ? <BorderBeam duration={10} size={200} /> : null}

        {/* Jade radial glow seeping in from top-left. */}
        {isPaid ? (
          <div
            aria-hidden
            className="absolute -top-16 -left-16 w-56 h-56 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(0,217,146,0.35) 0%, transparent 70%)",
            }}
          />
        ) : null}

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-flash/45 mb-2">
              Current plan
            </div>
            <div
              className={cn(
                "font-jetbrains font-bold text-3xl md:text-4xl tabular-nums tracking-[0.04em]",
                isPaid ? "text-jade" : "text-flash/85"
              )}
              style={
                isPaid
                  ? {
                      textShadow:
                        "0 0 22px rgba(0,217,146,0.55), 0 0 48px rgba(0,217,146,0.22)",
                    }
                  : undefined
              }
            >
              {displayPlan}
            </div>
            <p className="mt-3 text-[12px] text-flash/55 leading-relaxed max-w-md">
              {isPaid
                ? "Subscription active. Manage payment method, view invoices and cancel anytime from the secure Stripe portal."
                : "You're on the free plan. Upgrade to unlock the AI coach, unlimited analysis, and higher scout lobby quotas."}
            </p>
          </div>

          {/* Status pill — jade for paid, neutral for free. */}
          <motion.span
            className={cn(
              "shrink-0 inline-flex items-center gap-2 px-3 py-1 rounded-sm font-mono text-[10px] tracking-[0.22em] uppercase border",
              isPaid
                ? "bg-jade/15 border-jade/45 text-jade"
                : "bg-flash/[0.05] border-flash/15 text-flash/50"
            )}
            style={
              isPaid
                ? { boxShadow: "0 0 18px rgba(0,217,146,0.25)" }
                : undefined
            }
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <span
              className={cn(
                "inline-block w-1.5 h-1.5 rounded-full",
                isPaid ? "bg-jade animate-pulse" : "bg-flash/40"
              )}
            />
            {isPaid ? "ACTIVE" : "FREE TIER"}
          </motion.span>
        </div>

        {/* Plan perks list — checkmarks of what's unlocked. Staggered
            for the eye to read the list as items lighting up. */}
        <div className="relative z-10 mt-6 pt-5 border-t border-flash/[0.08]">
          <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-flash/40 mb-3">
            {isPaid ? "▸ Unlocked perks" : "▸ Free tier perks"}
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {perks.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.li
                  key={i}
                  className="flex items-center gap-2.5 text-[12px] text-flash/75 font-jetbrains"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.25 + i * 0.05,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-sm border",
                      isPaid
                        ? "bg-jade/15 border-jade/45 text-jade"
                        : "bg-flash/[0.05] border-flash/15 text-flash/55"
                    )}
                  >
                    <Icon className="w-3 h-3" strokeWidth={2.5} />
                  </span>
                  <span className="truncate">{p.label}</span>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </motion.div>

      {/* Actions. */}
      <div className="flex flex-wrap gap-3">
        {isPaid ? (
          <motion.button
            type="button"
            onClick={openPortal}
            disabled={loadingPortal}
            whileHover={loadingPortal ? undefined : { y: -1 }}
            transition={{ duration: 0.18 }}
            className="
              group relative inline-flex items-center justify-center gap-2.5
              px-6 py-2.5 rounded-sm font-jetbrains text-[12px] tracking-[0.22em] uppercase
              text-liquirice bg-jade hover:bg-jade/95 disabled:opacity-60 disabled:cursor-not-allowed
              shadow-[0_12px_28px_rgba(0,217,146,0.32),0_0_18px_rgba(0,217,146,0.25)]
              transition-all duration-200 cursor-clicker
            "
          >
            {loadingPortal ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {loadingPortal ? "OPENING…" : "MANAGE SUBSCRIPTION"}
            {!loadingPortal && (
              <ExternalLink className="w-3 h-3 opacity-75 transition-transform duration-200 group-hover:translate-x-0.5" />
            )}
          </motion.button>
        ) : (
          <Link
            to="/pricing"
            className="
              group inline-flex items-center justify-center gap-2.5
              px-6 py-2.5 rounded-sm font-jetbrains text-[12px] tracking-[0.22em] uppercase
              text-liquirice bg-jade hover:bg-jade/95
              shadow-[0_12px_28px_rgba(0,217,146,0.32),0_0_18px_rgba(0,217,146,0.25)]
              transition-all duration-200 cursor-clicker
            "
          >
            <CreditCard className="w-4 h-4" />
            VIEW PLANS
            <ExternalLink className="w-3 h-3 opacity-75 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-flash/30 leading-relaxed">
        Payments handled by Stripe. We never store card details on our servers.
      </p>
    </div>
  );
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
function PlanSetupContent({ currentPlan }: { currentPlan: string | null }) {
  const { session, refreshProfile } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const userId = session?.user?.id;
  const email = session?.user?.email ?? "—";

  // Force-set plan + null the dependent stripe columns so the value
  // we set doesn't conflict with a stale subscription record.
  async function setPlan(next: "free" | "premium" | "elite") {
    if (!userId) return;
    try {
      setPending(next);
      const { error } = await supabase
        .from("profile_players")
        .update({ plan: next })
        .eq("profile_id", userId);
      if (error) throw error;
      await refreshProfile();
      showCyberToast({
        title: `Plan switched → ${next.toUpperCase()}`,
        description: "Refreshed locally. Plan-gated UI will re-evaluate.",
        tag: "DEBUG",
        variant: "status",
        duration: 2800,
        id: "plan-debug-switch",
      });
    } catch (err: any) {
      console.error("plan switch error", err);
      showCyberToast({
        title: "Couldn't switch plan",
        description: err?.message ?? "Supabase rejected the update.",
        tag: "DEBUG",
        variant: "error",
        duration: 4000,
      });
    } finally {
      setPending(null);
    }
  }

  // Wipes stripe_customer_id + dependent columns. Forces the next
  // checkout to mint a new customer in whatever Stripe environment
  // the backend is currently configured for.
  async function resetStripe() {
    if (!userId) return;
    if (
      !window.confirm(
        "Reset Stripe linkage on YOUR profile? This nulls stripe_customer_id + subscription columns. Use after switching test ↔ live keys."
      )
    )
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
      if (error) throw error;
      await refreshProfile();
      showCyberToast({
        title: "Stripe linkage cleared",
        description:
          "Next checkout will create a fresh Stripe customer in the active environment.",
        tag: "DEBUG",
        variant: "status",
        duration: 3500,
      });
    } catch (err: any) {
      console.error("stripe reset error", err);
      showCyberToast({
        title: "Couldn't clear Stripe linkage",
        description: err?.message ?? "Supabase rejected the update.",
        tag: "DEBUG",
        variant: "error",
        duration: 4000,
      });
    } finally {
      setResetting(false);
    }
  }

  const planButtons: {
    key: "free" | "premium" | "elite";
    label: string;
    hint: string;
  }[] = [
    { key: "free", label: "FREE", hint: "Tier 00 — default" },
    { key: "premium", label: "PREMIUM", hint: "Tier 02" },
    { key: "elite", label: "ELITE", hint: "Tier 03 — max" },
  ];

  return (
    <div className="flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6">
      <div className="space-y-2">
        <h3 className="text-citrine/85">⚙ PLAN SETUP</h3>
        <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-citrine/45">
          :: DEBUG ONLY ::
        </p>
        <p className="text-[12px] text-flash/55 leading-relaxed max-w-xl">
          Force-switch your <code className="text-citrine/85">plan</code> column
          in <code className="text-flash/80">profile_players</code> without
          going through Stripe. Use this to preview gated UI, test the success
          cinematic, or reset stale Stripe linkage after env-var swaps.
        </p>
      </div>

      {/* Identity card — shows who's editing what so an admin doesn't
          accidentally fire this on a session they didn't expect. */}
      <div className="rounded-md border border-citrine/15 bg-black/30 backdrop-blur-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-jetbrains">
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1">
              EMAIL
            </div>
            <div className="text-flash/80 truncate">{email}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1">
              PROFILE_ID
            </div>
            <div className="text-flash/80 truncate tabular-nums">
              {userId ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1">
              CURRENT PLAN
            </div>
            <div
              className={cn(
                "font-bold tabular-nums",
                currentPlan && currentPlan !== "free"
                  ? "text-jade"
                  : "text-flash/85"
              )}
            >
              {(currentPlan ?? "free").toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Plan switcher — three big tappable tiles with active highlight. */}
      <div>
        <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-citrine/55 mb-3">
          ▸ Switch tier
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {planButtons.map((b) => {
            const isCurrent = (currentPlan ?? "free") === b.key;
            const isPending = pending === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setPlan(b.key)}
                disabled={isCurrent || pending !== null}
                className={cn(
                  "relative rounded-sm border p-4 text-left transition-all duration-200 cursor-clicker",
                  "disabled:cursor-not-allowed",
                  isCurrent
                    ? "border-jade/55 bg-jade/10 shadow-[0_0_24px_rgba(0,217,146,0.25)]"
                    : "border-flash/15 bg-black/30 hover:border-citrine/45 hover:bg-citrine/[0.05]"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={cn(
                      "font-jetbrains text-[10px] uppercase tracking-[0.22em]",
                      isCurrent ? "text-jade" : "text-flash/50"
                    )}
                  >
                    {b.hint}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-jade flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                      ACTIVE
                    </span>
                  )}
                  {isPending && (
                    <Loader2 className="w-3 h-3 text-citrine animate-spin" />
                  )}
                </div>
                <div
                  className={cn(
                    "font-jetbrains font-bold tabular-nums text-2xl",
                    isCurrent ? "text-jade" : "text-flash/85"
                  )}
                  style={
                    isCurrent
                      ? {
                          textShadow:
                            "0 0 18px rgba(0,217,146,0.5), 0 0 36px rgba(0,217,146,0.18)",
                        }
                      : undefined
                  }
                >
                  {b.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Utility row — preview success page + reset stripe. */}
      <div>
        <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-citrine/55 mb-3">
          ▸ Utilities
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/billing/success?session_id=cs_debug_local"
            className="
              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-sm
              font-jetbrains text-[11px] tracking-[0.2em] uppercase
              text-citrine border border-citrine/40 bg-citrine/[0.05]
              hover:bg-citrine/15 hover:border-citrine/65
              transition-colors duration-200 cursor-clicker
            "
          >
            <Sparkles className="w-3.5 h-3.5" />
            PREVIEW SUCCESS PAGE
            <ExternalLink className="w-3 h-3 opacity-65" />
          </Link>

          <button
            type="button"
            onClick={resetStripe}
            disabled={resetting}
            className="
              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-sm
              font-jetbrains text-[11px] tracking-[0.2em] uppercase
              text-red-400/85 border border-red-400/30 bg-red-400/[0.04]
              hover:bg-red-400/10 hover:border-red-400/55 hover:text-red-300
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors duration-200 cursor-clicker
            "
          >
            {resetting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5" />
            )}
            {resetting ? "WIPING…" : "RESET STRIPE LINKAGE"}
          </button>
        </div>
      </div>

      <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-flash/30 leading-relaxed">
        These actions edit your own profile row only. Other users are not
        affected. Use for staging / preview / sanity tests.
      </p>
    </div>
  );
}
