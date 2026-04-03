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
import { ChangePassword } from "@/components/changepassword";
import { cdnBaseUrl } from "@/config";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { pickerMode, setPickerMode } = useChampionPicker();

  const { session, isAdmin, nametag, avatarUrl, region: userRegion } = useAuth();

  useEffect(() => {
    document.title = "Dashboard - lolData";
    return () => { document.title = "lolData"; };
  }, []);
  const email = session?.user?.email ?? ""
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightSummoner, setHighlightSummoner] = useState(false);

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

  const validTabs = ["profile", "documentation", "billing", "preferences", "proApplications", "streamerApplications"];
  const activeTab = tab && validTabs.includes(tab) ? tab : "profile";

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
    <div className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen grid grid-rows-[auto,1fr] overflow-hidden">
      {/* riga 1: navbar */}
      <div className="w-full">
        <div className="xl:w-[65%] min-[2560px]:w-[55%] w-full mx-auto">
          <Navbar />
          <Separator className="bg-flash/20 mt-0 w-full" />
        </div>
      </div>

      {/* riga 2: contenuto */}
      <div className="w-full min-h-0">
        <div className="xl:w-[65%] min-[2560px]:w-[55%] w-full mx-auto px-4 h-full min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => navigate(`/dashboard/${v}`, { replace: true })} className="flex w-full h-full min-h-0">
            {/* 20%: sidebar */}
            <div className="w-[20%] border-r border-flash/10 h-full overflow-y-auto scrollbar-hide flex flex-col pt-6">
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

                <TabsList className="flex flex-col items-stretch gap-1 px-2 pt-1 bg-transparent w-[80%] h-auto">
                  <TabsTrigger
                    value="profile"
                    className="w-full justify-start px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    PROFILE
                  </TabsTrigger>

                  <TabsTrigger
                    value="documentation"
                    className="w-full justify-start px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    DOCUMENTATION
                  </TabsTrigger>

                  <TabsTrigger
                    value="billing"
                    className="w-full justify-start px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    BILLING
                  </TabsTrigger>

                  <TabsTrigger
                    value="preferences"
                    className="w-full justify-start px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                  >
                    PREFERENCES
                  </TabsTrigger>

                  {/* ✅ ADMIN ONLY tabs - tra tabs e logout */}
                  {isAdmin && (
                    <>
                      <Separator className="bg-flash/15 my-2" />

                      <TabsTrigger
                        value="proApplications"
                        className="w-full justify-start px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                      >
                        PRO APPLICATIONS
                      </TabsTrigger>

                      <TabsTrigger
                        value="streamerApplications"
                        className="w-full justify-start px-3 py-1.5 font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-l-2 data-[state=active]:border-jade data-[state=active]:shadow-none border-l-2 border-transparent hover:text-flash/80 rounded-none cursor-clicker transition-colors"
                      >
                        STREAMER APPLICATIONS
                      </TabsTrigger>
                    </>
                  )}

                  <Separator className="bg-flash/15 mb-3" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-1.5 rounded-none font-jetbrains text-[11px] tracking-[0.15em] uppercase text-flash/40 hover:text-red-400/80 hover:bg-red-400/5 cursor-clicker text-left transition-colors"
                  >
                    LOGOUT
                  </button>
                </TabsList>
              </div>
            </div>

            {/* 70%: content scrollabile */}
            <div className="w-[80%] h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-hide">
              {/* PROFILE TAB */}
              <TabsContent value="profile" className="outline-none">
                <div className="flex flex-col gap-5 p-4 px-6">
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
                <div className="flex flex-col gap-6 p-4 px-6">
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

              {/* DOCUMENTATION TAB */}
              <TabsContent value="documentation" className="outline-none">
                <DocumentationGuide />
              </TabsContent>

              {/* BILLING TAB */}
              <TabsContent value="billing" className="outline-none">
                <div className="flex flex-col gap-6 p-4 px-6">
                  <div className="space-y-2">
                    <h3 className="text-flash/60">BILLING</h3>
                    <div className="rounded-md border border-flash/10 bg-neutral-950/60 p-4 text-sm text-flash/70">
                      <p className="mb-1">Billing panel coming soon.</p>
                      <p className="text-xs text-flash/50">
                        You&apos;ll be able to manage your subscription, view
                        invoices and update your payment details from here.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ADMIN TAB: PRO APPLICATIONS */}
              {isAdmin && (
                <TabsContent value="proApplications" className="outline-none">
                  <div className="flex flex-col gap-6 p-4 px-6">
                    <ProApplicationsAdminPanel />
                  </div>
                </TabsContent>
              )}

              {/* ADMIN TAB: STREAMER MANAGEMENT */}
              {isAdmin && (
                <TabsContent value="streamerApplications" className="outline-none">
                  <div className="flex flex-col gap-6 p-4 px-6">
                    <StreamerAdminPanel />
                  </div>
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
