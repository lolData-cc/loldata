import { supabase } from "@/lib/supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
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
import { BorderBeamPreference } from "@/components/borderbeampreference";
import { TechBackgroundPreference } from "@/components/techbackgroundpreference";
import { MatchTransitionPreference } from "@/components/matchtransitionpreference";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { pickerMode, setPickerMode } = useChampionPicker();

  // ✅ prendi isAdmin dal context
  const { isAdmin } = useAuth();

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
        <div className="xl:w-[65%] w-full mx-auto">
          <Navbar />
          <Separator className="bg-flash/20 mt-0 w-full" />
        </div>
      </div>

      {/* riga 2: contenuto */}
      <div className="w-full min-h-0">
        <div className="xl:w-[65%] w-full mx-auto px-4 h-full min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => navigate(`/dashboard/${v}`, { replace: true })} className="flex w-full h-full min-h-0">
            {/* 20%: sidebar */}
            <div className="w-[20%] border-r border-flash/10 h-full overflow-hidden flex flex-col">
              <div>
                <TabsList className="flex flex-col items-stretch gap-1 px-2 pt-1 bg-transparent mt-32 w-[80%]">
                  <TabsTrigger
                    value="profile"
                    className="w-full justify-start px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-jade border border-transparent hover:border-flash/20 rounded-sm cursor-clicker"
                  >
                    PROFILE
                  </TabsTrigger>

                  <TabsTrigger
                    value="documentation"
                    className="w-full justify-start px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-jade border border-transparent hover:border-flash/20 rounded-sm cursor-clicker"
                  >
                    DOCUMENTATION
                  </TabsTrigger>

                  <TabsTrigger
                    value="billing"
                    className="w-full justify-start px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-jade border border-transparent hover:border-flash/20 rounded-sm cursor-clicker"
                  >
                    BILLING
                  </TabsTrigger>

                  <TabsTrigger
                    value="preferences"
                    className="w-full justify-start px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-jade border border-transparent hover:border-flash/20 rounded-sm cursor-clicker"
                  >
                    PREFERENCES
                  </TabsTrigger>

                  {/* ✅ ADMIN ONLY tabs - tra tabs e logout */}
                  {isAdmin && (
                    <>
                      <Separator className="bg-flash/15 my-2" />

                      <TabsTrigger
                        value="proApplications"
                        className="w-full justify-start px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-jade border border-transparent hover:border-flash/20 rounded-sm cursor-clicker"
                      >
                        PRO APPLICATIONS
                      </TabsTrigger>

                      <TabsTrigger
                        value="streamerApplications"
                        className="w-full justify-start px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase text-flash/60 data-[state=active]:text-jade data-[state=active]:bg-jade/10 data-[state=active]:border-jade border border-transparent hover:border-flash/20 rounded-sm cursor-clicker"
                      >
                        STREAMER APPLICATIONS
                      </TabsTrigger>
                    </>
                  )}

                  <Separator className="bg-flash/15 mb-3" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-1.5 rounded-sm border border-flash/20 hover:bg-flash/10 text-xs text-flash/70 cursor-clicker text-left"
                  >
                    Logout
                  </button>
                </TabsList>
              </div>
            </div>

            {/* 70%: content scrollabile */}
            <div className="w-[80%] h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-hide">
              {/* PROFILE TAB */}
              <TabsContent value="profile" className="outline-none">
                <div className="flex flex-col gap-8 p-4 px-6">
                  <div className="space-y-3">
                    <h3 className="text-flash/60">PROFILE AVATAR</h3>
                    <PremiumAvatarUploader />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-flash/60">LEAGUE OF LEGENDS</h3>
                    <ProfilerLinker />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-flash/60">DISCORD</h3>
                    <DiscordLinker />
                  </div>
                </div>
              </TabsContent>

              {/* PREFERENCES TAB */}
              <TabsContent value="preferences" className="outline-none">
                <div className="flex flex-col gap-6 p-4 px-6">
                  <div className="space-y-3">
                    <h3 className="text-flash/60">ANIMATIONS</h3>
                    <BorderBeamPreference />
                    <TechBackgroundPreference />
                    <MatchTransitionPreference />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-flash/60">CHAMPION PICKER</h3>

                    <div className="border border-flash/10 rounded-md p-4 bg-cement">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="text-flash/40">Champion picker UI</h4>
                          <span className="text-flash/80 text-sm">
                            Choose between Sheet (shadcn) and Radial dock.
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end border-t border-flash/20 pt-3 mt-3 -mb-2">
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

              </TabsContent>

              {/* DOCUMENTATION TAB */}
              <TabsContent value="documentation" className="outline-none">
                <div className="flex flex-col gap-6 p-4 px-6">
                  <div className="space-y-2">
                    <h3 className="text-flash/60">DOCUMENTATION</h3>
                    <div className="rounded-md border border-flash/10 bg-neutral-950/60 p-4 text-sm text-flash/70">
                      <p className="mb-1">Docs coming soon.</p>
                      <p className="text-xs text-flash/50">
                        Here you&apos;ll find guides on how LolData tracks your
                        games, how to interpret dashboards, and how to get the
                        most out of your analytics.
                      </p>
                    </div>
                  </div>
                </div>
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

              {/* ✅ ADMIN TAB: PRO APPLICATIONS */}
              {isAdmin && (
                <TabsContent value="proApplications" className="outline-none">
                  <div className="flex flex-col gap-6 p-4 px-6">
                    <h3 className="text-flash/60">PRO APPLICATIONS</h3>
                    <ProApplicationsAdminPanel />
                  </div>
                </TabsContent>
              )}

              {/* ✅ ADMIN TAB: STREAMER APPLICATIONS (placeholder) */}
              {isAdmin && (
                <TabsContent value="streamerApplications" className="outline-none">
                  <div className="flex flex-col gap-6 p-4 px-6">
                    <h3 className="text-flash/60">STREAMER APPLICATIONS</h3>
                    <div className="rounded-md border border-flash/10 bg-neutral-950/60 p-4 text-sm text-flash/70">
                      Streamer applications panel coming soon.
                    </div>
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
