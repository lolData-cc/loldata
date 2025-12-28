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
import { Separator } from "@/components/ui/separator";
import { BorderBeam } from "@/components/ui/border-beam";
import { API_BASE_URL } from "@/config";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { LoadingDots } from "./ui/loading-dots";

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
const PROFILE_ICON_BASE = "https://cdn.loldata.cc/15.13.1/img/profileicon";

export function ProfilerLinker() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [region, setRegion] = useState<LolRegion>("EUW");

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
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

      // 🔧 Costruiamo il payload SENZA player_id per i nuovi utenti
      const upsertPayload: any = {
        profile_id: auth.user.id,
        puuid: refresh.puuid,
        nametag,
        region: region.toLowerCase(),
      };

      // Se la row esiste già e ha un player_id valido, lo preserviamo
      if (profile?.player_id) {
        upsertPayload.player_id = profile.player_id;
      }

      const { error: upErr } = await supabase
        .from("profile_players")
        .upsert(upsertPayload, { onConflict: "profile_id" });

      if (upErr) {
        console.error("upsert profile_players error:", upErr.message);
        showCyberToast({
          title: "Save error",
          description: "The linked profile could not be saved.",
          variant: "error",
          tag: "DB",
        });
        return;
      }

      await supabase.auth.updateUser({
        data: {
          lol_nametag: nametag,
          lol_region: region.toUpperCase(),
          lol_linked_at: new Date().toISOString(),
        },
      });

      setProfile((prev) =>
        prev
          ? {
            ...prev,
            puuid: refresh.puuid,
            nametag,
            region: region.toLowerCase(),
          }
          : prev
      );
      setLinkedSummoner({
        nametag,
        region,
      });

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
    <div className="border border-flash/10 rounded-md p-4 bg-cement">
      <div className="flex justify-between gap-4 items-start">
        {/* colonna sinistra: titolo + avatar/info */}
        <div className="space-y-2">
          <h4 className="text-flash/40">LOL PROFILE</h4>

          {isLinked && linkedSummoner && linkedSummonerDetails ? (
            // stato collegato: avatar + gamename#tag + region
            <div className="mt-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-flash/20 bg-black/40">
                {linkedIconUrl ? (
                  <img
                    src={linkedIconUrl}
                    alt="Summoner Icon"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-flash/40">
                    no icon
                  </div>
                )}
              </div>

              <div className="flex flex-col">
                <span className="text-flash text-sm font-semibold">
                  {linkedSummonerDetails.name}
                  <span className="text-flash/60 text-xs">
                    #{linkedSummonerDetails.tag}
                  </span>
                </span>
                <span className="text-[11px] text-flash/60">
                  Region: {linkedSummoner.region} • Rank:{" "}
                  {linkedSummonerDetails.rank} ({linkedSummonerDetails.lp} LP)
                </span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-flash/80 text-sm">
                Connect your Riot ID to unlock personalized gameplay analytics.
              </p>

              {isLinked && linkedSummoner && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-jade/30 px-3 py-1 text-xs text-jade ">
                  <span className="w-2 h-2 rounded-full bg-jade animate-pulse" />
                  <span>
                    Linked:{" "}
                    <span className="font-semibold">{linkedSummoner.nametag}</span>{" "}
                    ({linkedSummoner.region})
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* colonna destra: status allineato alla fine */}
        <div className="text-right">
          {isLinked ? (
            <span className="text-[10px] uppercase tracking-[0.15em] text-jade/80">
              VERIFIED LINK
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.15em] text-flash/50">
              NO PROFILE LINKED
            </span>
          )}
        </div>
      </div>


      <Separator className="my-3 bg-flash/20" />

      <form onSubmit={handleSearch} className="space-y-3">
        <div className="grid grid-cols-[2fr,1fr,1fr] gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-flash/60">Riot ID</Label>
            <div className="flex items-center gap-1 rounded-md border border-flash/15 bg-black/40 px-3 py-1.5">
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
              <span className="text-flash/40 text-xs">#</span>
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
            <Label className="text-xs text-flash/60">Region</Label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as LolRegion)}
              className="w-full rounded-md border border-flash/15 bg-black/40 px-3 py-1.5 text-sm text-flash outline-none cursor-clicker"
            >
              <option value="EUW">EUW</option>
              <option value="NA">NA</option>
              <option value="KR">KR</option>
            </select>
          </div>

          <div className="flex justify-end gap-3">
            {isLinked && (
              <button
                type="button"
                onClick={handleUnlink}
                className="px-2 py-1 rounded-sm cursor-clicker border border-flash/20 hover:bg-flash/10 text-sm text-flash disabled:opacity-60 disabled:pointer-events-none"
              >
                UNLINK
              </button>
            )}

            <button
              type="submit"
              disabled={loadingSearch}
              className="px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-sm disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center"
            >
              <span className="relative inline-flex items-center justify-center w-full">
                <span className={loadingSearch ? "opacity-0" : "opacity-100"}>
                  {isLinked ? "RE-LINK" : "LINK PROFILE"}
                </span>

                {loadingSearch && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <LoadingDots />
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </form>

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
