// components/profilelinker.tsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BorderBeam } from "@/components/ui/border-beam";
import { API_BASE_URL } from "@/config";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { LoadingDots } from "./ui/loading-dots";
import { useAuth } from "@/context/authcontext";

type LolRegion = "EUW" | "NA" | "KR";

type Summoner = {
  name: string;
  tag: string;
  puuid: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
  profileIconId: number;
  level: number;
  live: boolean;
  peakRank: string;
  peakLp: number;
  avatar_url: string | null;
};

type ProfileRow = {
  profile_id: string;
  player_id: string | null;
  puuid: string | null;
  nametag: string | null;
  region: string | null;
};

const GET_SUMMONER_URL = `${API_BASE_URL}/api/summoner`;
const PROFILE_ICON_BASE = "https://cdn2.loldata.cc/16.1.1/img/profileicon";

export function ProfilerLinker() {
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [region, setRegion] = useState<LolRegion>("EUW");

  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [step, setStep] = useState<"preview" | "verifyIcon">("preview");
  const [currentSummoner, setCurrentSummoner] = useState<Summoner | null>(null);
  const [verifyingIcon, setVerifyingIcon] = useState(false);

  const [linkedSummoner, setLinkedSummoner] = useState<{
    nametag: string;
    region: string;
  } | null>(null);

  const tagInputRef = useRef<HTMLInputElement | null>(null);

  // dettagli del summoner già linkato (per avatar + dati)
  const [linkedSummonerDetails, setLinkedSummonerDetails] =
    useState<Summoner | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) return;

        const { data, error } = await supabase
          .from("profile_players")
          .select("profile_id, player_id, puuid, nametag, region")
          .eq("profile_id", auth.user.id)
          .maybeSingle<ProfileRow>();

        if (error) {
          console.warn("profile_players load error:", error.message);
          return;
        }

        if (data) {
          setProfile(data);

          if (data.puuid && data.nametag && data.region) {
            const upperRegion = (data.region ?? "").toUpperCase();
            setLinkedSummoner({
              nametag: data.nametag,
              region: upperRegion,
            });

            // fetch dettagli summoner per mostrare avatar + nome
            const [summName, summTag] = data.nametag.split("#");
            if (summName && summTag) {
              try {
                const res = await fetch(GET_SUMMONER_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: summName,
                    tag: summTag,
                    region: upperRegion as LolRegion,
                  }),
                });

                if (res.ok) {
                  const json = await res.json();
                  const summ: Summoner = json.summoner;
                  setLinkedSummonerDetails(summ);
                }
              } catch (err) {
                console.warn("Failed to fetch linked summoner details:", err);
              }
            }
          }
        }
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !tag.trim()) {
      showCyberToast({
        title: "Incomplete Riot ID",
        description: "Don't forget your #TAG.",
        variant: "error",
        tag: "ERR",
      });
      return;
    }

    setLoadingSearch(true);
    try {
      const res = await fetch(GET_SUMMONER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tag: tag.trim(),
          region,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("getSummoner error:", errText);
        showCyberToast({
          title: "Profile not found",
          description: "Check username, tag, and region.",
          variant: "error",
          tag: "ERR",
        });
        return;
      }

      const data = await res.json();
      const summoner: Summoner = data.summoner;
      setCurrentSummoner(summoner);
      setStep("preview");
      setDialogOpen(true);
    } catch (err: any) {
      console.error(err);
      showCyberToast({
        title: "Network error",
        description: "An error occurred while searching for the profile.",
        variant: "error",
        tag: "NET",
      });
    } finally {
      setLoadingSearch(false);
    }
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setStep("preview");
    setCurrentSummoner(null);
    setVerifyingIcon(false);
  }

  async function handleConfirmIsMe() {
    setStep("verifyIcon");
  }

  async function handleVerifyIcon() {
    if (!currentSummoner) return;

    setVerifyingIcon(true);
    try {
      const res = await fetch(GET_SUMMONER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: currentSummoner.name,
          tag: currentSummoner.tag,
          region,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("getSummoner verify error:", errText);
        showCyberToast({
          title: "Icon verification error",
          description: "An error occurred while verifying the profile icon.",
          variant: "error",
          tag: "ERR",
        });
        return;
      }

      const data = await res.json();
      const refresh: Summoner = data.summoner;

      if (refresh.profileIconId !== 3) {
        showCyberToast({
          title: "Wrong icon",
          description: "Make sure you set the minion with the gem (ID 3).",
          variant: "error",
          tag: "ICON",
        });
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        showCyberToast({
          title: "Auth error",
          description: "You are not logged in.",
          variant: "error",
          tag: "AUTH",
        });
        return;
      }

      const nametag = `${refresh.name}#${refresh.tag}`;

      // payload base per insert/update
      const payload = {
        player_id: auth.user.id,
        puuid: refresh.puuid,
        nametag,
        region: region.toLowerCase(),
      };

      // 1) vedo se esiste già una riga per questo profilo
      const { data: existingRow, error: selErr } = await supabase
        .from("profile_players")
        .select("profile_id")
        .eq("profile_id", auth.user.id)
        .maybeSingle<Pick<ProfileRow, "profile_id">>();

      if (selErr) {
        console.error("select profile_players error:", selErr);
        showCyberToast({
          title: "Load error",
          description: "Could not check existing profile link.",
          variant: "error",
          tag: "DB",
        });
        return;
      }

      if (existingRow) {
        // 2a) UPDATE se la riga esiste già (es. premium seedata ecc.)
        const { error: updErr } = await supabase
          .from("profile_players")
          .update({
            ...payload,
            profile_id: auth.user.id,
          })
          .eq("profile_id", auth.user.id);

        if (updErr) {
          console.error("update profile_players error:", updErr);
          showCyberToast({
            title: "Save error",
            description: "The linked profile could not be updated.",
            variant: "error",
            tag: "DB",
          });
          return;
        }
      } else {
        // 2b) INSERT se non esiste
        const { error: insErr } = await supabase.from("profile_players").insert({
          profile_id: auth.user.id,
          ...payload,
        });

        if (insErr) {
          console.error("insert profile_players error:", insErr);
          showCyberToast({
            title: "Save error",
            description: "The linked profile could not be saved.",
            variant: "error",
            tag: "DB",
          });
          return;
        }
      }

      await supabase.auth.updateUser({
        data: {
          lol_nametag: nametag,
          lol_region: region.toUpperCase(),
          lol_linked_at: new Date().toISOString(),
        },
      });

      setProfile((prev) => ({
        profile_id: prev?.profile_id ?? auth.user.id,
        player_id: prev?.player_id ?? auth.user.id,
        puuid: refresh.puuid,
        nametag,
        region: region.toLowerCase(),
      }));

      setLinkedSummoner({
        nametag,
        region,
      });

      await refreshProfile();

      showCyberToast({
        title: "Profile linked",
        description:
          "Your League profile has been successfully linked! Press CTRL+Y and go check your profile!",
        variant: "status",
        tag: "OK",
      });
      handleDialogClose();
    } catch (err: any) {
      console.error(err);
      showCyberToast({
        title: "Verification error",
        description: "An error occurred while verifying your icon.",
        variant: "error",
        tag: "ERR",
      });
    } finally {
      setVerifyingIcon(false);
    }
  }

  async function handleUnlink() {
    if (!profile) return;

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const { error: updErr } = await supabase
        .from("profile_players")
        .update({
          puuid: null,
          nametag: null,
          region: null,
        })
        .eq("profile_id", auth.user.id);

      if (updErr) throw updErr;

      await supabase.auth.updateUser({
        data: {
          lol_nametag: null,
          lol_region: null,
          lol_linked_at: null,
        },
      });

      setLinkedSummoner(null);
      setLinkedSummonerDetails(null);
      setProfile((p) =>
        p
          ? {
              ...p,
              puuid: null,
              nametag: null,
              region: null,
            }
          : p
      );

      showCyberToast({
        title: "Profile unlinked",
        description: "Your League profile has been unlinked.",
        variant: "status",
        tag: "OK",
      });
    } catch (e: any) {
      console.error(e);
      showCyberToast({
        title: "Reset error",
        description: "An error occurred while resetting your linked profile.",
        variant: "error",
        tag: "ERR",
      });
    }
  }

  const isLinked = !!linkedSummoner;

  const currentIconUrl =
    currentSummoner &&
    `${PROFILE_ICON_BASE}/${currentSummoner.profileIconId}.png`;

  const minionIconUrl = `${PROFILE_ICON_BASE}/3.png`;

  // icon per il profilo già linkato (header)
  const linkedIconUrl =
    linkedSummonerDetails &&
    (linkedSummonerDetails.avatar_url ??
      `${PROFILE_ICON_BASE}/${linkedSummonerDetails.profileIconId}.png`);

  return (
    <div className="relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden">
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
      {/* HUD bracket corners */}
      <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />

      <div className="relative z-[2] px-4 py-3 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {/* Profile icon */}
            <div className="w-16 h-16 rounded-[2px] overflow-hidden border border-jade/15 bg-black/30 shrink-0">
              {isLinked && linkedSummonerDetails && currentIconUrl ? (
                <img src={currentIconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <img src="https://ddragon.leagueoflegends.com/cdn/15.13.1/img/profileicon/29.png" alt="" className="w-full h-full object-cover opacity-30" />
              )}
            </div>

            <div>
              <h4 className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">
                League Profile
              </h4>
              {initialLoading ? (
                <div className="space-y-1.5 mt-1">
                  <div className="h-3.5 w-32 rounded-[2px] bg-flash/5 animate-pulse" />
                  <div className="h-3 w-48 rounded-[2px] bg-flash/5 animate-pulse" />
                </div>
              ) : isLinked && linkedSummoner && linkedSummonerDetails ? (
                <>
                  <span className="text-flash/90 text-sm font-medium block mt-0.5">
                    {linkedSummonerDetails.name}<span className="text-flash/40">#{linkedSummonerDetails.tag}</span>
                  </span>
                  <span className="text-[11px] text-flash/40 font-mono">
                    {linkedSummoner.region.toUpperCase()} / {linkedSummonerDetails.rank} / {linkedSummonerDetails.lp} LP
                  </span>
                </>
              ) : (
                <span className="text-flash/40 text-sm block mt-0.5">
                  Connect your Riot ID for personalized analytics.
                </span>
              )}
            </div>
          </div>

          {/* Buttons — right aligned */}
          <div className="flex items-center gap-2 shrink-0 self-center">
            {isLinked && (
              <button
                type="button"
                onClick={handleUnlink}
                className="px-2 py-1 rounded-[2px] cursor-clicker border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 transition-colors"
              >
                UNLINK
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowLinkForm(!showLinkForm)}
              className="px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase transition-colors"
            >
              {isLinked ? "RE-LINK" : "LINK"}
            </button>
          </div>
        </div>

        {/* Expandable link form */}
        {showLinkForm && (
          <>
            <div className="my-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />
            <form onSubmit={(e) => { handleSearch(e); }} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-flash/30 font-mono tracking-[0.15em] uppercase">Riot ID</Label>
                <div className="flex items-center gap-1 rounded-[2px] border border-flash/10 bg-black/40 px-3 py-1.5">
                  <input
                    type="text"
                    placeholder="SummonerName"
                    value={name}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes("#")) {
                        const [rawName, rawTag = ""] = value.split("#");
                        setName(rawName.trim());
                        setTag(rawTag.trim());
                        tagInputRef.current?.focus();
                      } else {
                        setName(value);
                      }
                    }}
                    className="bg-transparent text-sm text-flash flex-1 outline-none"
                  />
                  <span className="text-jade/40 text-xs font-mono">#</span>
                  <input
                    type="text"
                    placeholder="TAG"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    ref={tagInputRef}
                    className="bg-transparent text-sm text-flash w-16 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] text-flash/30 font-mono tracking-[0.15em] uppercase">Region</Label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as LolRegion)}
                  className="w-full rounded-[2px] border border-flash/10 bg-black/40 px-3 py-1.5 text-sm text-flash outline-none cursor-clicker"
                >
                  <option value="EUW">EUW</option>
                  <option value="NA">NA</option>
                  <option value="KR">KR</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loadingSearch}
                className="px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-60 disabled:pointer-events-none transition-colors"
              >
                <span className="relative inline-flex items-center justify-center">
                  <span className={loadingSearch ? "opacity-0" : "opacity-100"}>SEARCH</span>
                  {loadingSearch && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <LoadingDots />
                    </span>
                  )}
                </span>
              </button>
            </form>
          </>
        )}

        <div className="mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />
        <div className="pt-2 text-[10px] font-mono text-flash/30 tracking-[0.08em]">
          {isLinked ? "◈ LINKED" : "◈ NOT LINKED"}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => !open && handleDialogClose()}
      >
        <DialogContent className="w-full max-w-md bg-transparent shadow-none top-60 [&>button]:hidden flex flex-col items-center">
          <div className="w-full relative">
            <div className="font-jetbrains bg-liquirice/90 select-none border-flash/10 border px-7 py-5 rounded-md">
              <BorderBeam duration={8} size={100} />
              {step === "preview" && currentSummoner && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-flash flex justify-between items-center">
                      <span>Is this your profile?</span>
                    </DialogTitle>
                    <DialogDescription className="text-flash/60 pt-1 text-sm">
                      Double-check name, tag, and region before verifying
                      ownership.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex gap-4 mt-4 items-center">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-flash/20 bg-black/40">
                      {currentIconUrl ? (
                        <img
                          src={currentIconUrl}
                          alt="Summoner Icon"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-flash/40">
                          no icon
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="text-flash font-semibold text-sm uppercase">
                        {currentSummoner.name}
                        <span className="text-flash/60 text-xs">
                          #{currentSummoner.tag}
                        </span>
                      </div>
                      <div className="text-xs text-flash/60">
                        Region:{" "}
                        <span className="text-flash/90">{region}</span>
                      </div>
                      <div className="text-xs text-flash/60">
                        Rank:{" "}
                        <span className="text-flash">
                          {currentSummoner.rank} ({currentSummoner.lp} LP)
                        </span>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="mt-5 flex justify-between">
                    <button
                      type="button"
                      onClick={handleDialogClose}
                      className="px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-sm cursor-clicker text-flash"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmIsMe}
                      className="px-4 py-1.5 rounded-sm border border-jade/30  hover:bg-jade/10 text-xs text-jade cursor-clicker"
                    >
                      Yes, that is me
                    </button>
                  </DialogFooter>
                </>
              )}

              {step === "verifyIcon" && currentSummoner && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-flash">
                      Verify profile ownership
                    </DialogTitle>
                    <DialogDescription className="text-flash/60 pt-1 text-xs">
                      Temporarily set your summoner icon to the minion with the
                      gem (ID 3) so we can confirm that this account is yours.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="mt-4 space-y-3 text-xs text-flash/70">
                    <p className="text-flash/90 text-sm">Step 1</p>
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 flex-none rounded-lg overflow-hidden border border-jade/40 bg-black/40">
                        <img
                          src={minionIconUrl}
                          alt="Minion gem"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p>
                          Open League of Legends and change your summoner icon
                          to this one.
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-flash/90 text-sm mb-1">Step 2</p>
                      <p>
                        Come back here and click{" "}
                        <span className="text-jade">“I Changed my Icon”</span>.
                        We will check in real time that your icon is set to ID{" "}
                        <b>3</b>.
                      </p>
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="mt-1 text-[11px] text-flash/60 underline underline-offset-4 decoration-dotted cursor-clicker"
                          >
                            Why do I have to do this?
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="text-xs max-w-xs"
                        >
                          We use this temporary icon change as proof that you
                          control this League account. You can switch back to
                          your favorite icon right after the verification
                          succeeds.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <DialogFooter className="mt-5 flex justify-between">
                    <button
                      type="button"
                      onClick={handleDialogClose}
                      className="px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-sm cursor-clicker disabled:opacity-60 disabled:pointer-events-none text-flash"
                      disabled={verifyingIcon}
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyIcon}
                      className="px-4 py-1.5 rounded-sm border border-jade/30 hover:bg-jade/10 text-xs text-jade cursor-clicker disabled:opacity-60 disabled:pointer-events-none"
                      disabled={verifyingIcon}
                    >
                      {verifyingIcon ? "Checking..." : "I Changed my Icon"}
                    </button>
                  </DialogFooter>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
