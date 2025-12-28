import { supabase } from "@/lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { pickerMode, setPickerMode } = useChampionPicker();

  const handleLogout = async () => {
    await supabase.auth.signOut();

    toast.custom(
      () => (
        <div className="relative" style={{ perspective: "1000px" }}>
          <div
            className="relative bg-[#040A0C] text-[#00d992] font-mono shadow-lg rounded-md px-6 py-4 w-[320px] 
                   border border-[#00d992]/30 backdrop-blur-sm transform-gpu transition-transform duration-300
                   before:absolute before:top-0 before:left-0 before:w-3 before:h-3 before:border-t-2 before:border-l-2 before:border-[#00d992]
                   after:absolute after:top-0 after:right-0 after:border-t-2 after:border-r-2 after:border-[#00d992]"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(-25deg) translateZ(20px)",
              boxShadow:
                "0 0 20px rgba(0, 217, 146, 0.3), inset 0 1px 0 rgba(0, 217, 146, 0.1)",
            }}
          >
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00d992]" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00d992]" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00d992]/5 to-transparent animate-pulse" />

            <div className="flex items-center gap-3 relative z-10">
              <div className="flex-1">
                <p className="text-sm font-medium text-[#00d992] mb-1">
                  LOGOUT COMPLETE
                </p>
                <p className="text-xs text-[#00d992]/60">
                  Session terminated successfully
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-1">
                <div className="w-2 h-2 bg-[#00d992] rounded-full animate-pulse" />
                <span className="text-xs text-[#00d992]/80">SYS</span>
              </div>
            </div>
          </div>
        </div>
      ),
      { duration: 3000 }
    );

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
          <Tabs defaultValue="profile" className="flex w-full h-full min-h-0">
            {/* 20%: sidebar */}
            <div className="w-[20%] border-r border-flash/10 h-full overflow-hidden flex flex-col">
              {/* header + tabs blocco superiore */}
              <div>
                <TabsList className="flex flex-col items-stretch gap-1 px-2 pt-1 bg-transparent mt-24 w-[80%]">
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
            <div className="w-[70%] h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-hide">
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
                  <p className="text-xs text-flash/50">
                    Current champion picker mode:{" "}
                    <span className="font-semibold">{pickerMode}</span>
                  </p>

                  <div className="space-y-3">
                    <h3 className="text-flash/60">CHAMPION PICKER</h3>
                    <div className="flex items-center justify-between rounded-md border border-flash/10 bg-neutral-950/60 p-4">
                      <div className="space-y-1">
                        <Label className="text-flash">Champion picker UI</Label>
                        <p className="text-xs text-flash/50">
                          Choose between Sheet (shadcn) and Radial dock.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPickerMode("sheet")}
                          className={`px-3 py-1.5 rounded border ${
                            pickerMode === "sheet"
                              ? "bg-jade text-liquirice border-jade"
                              : "bg-transparent text-flash/80 border-flash/20 hover:border-flash/40"
                          }`}
                        >
                          Sheet
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerMode("radial")}
                          className={`px-3 py-1.5 rounded border ${
                            pickerMode === "radial"
                              ? "bg-jade text-liquirice border-jade"
                              : "bg-transparent text-flash/80 border-flash/20 hover:border-flash/40"
                          }`}
                        >
                          Radial
                        </button>
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
            </div>

            {/* opzionale: 10% restante */}
            <div className="flex-1 h-full overflow-hidden" />
          </Tabs>
        </div>
      </div>
    </div>
  );
}
