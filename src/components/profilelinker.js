import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// components/profilelinker.tsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { BorderBeam } from "@/components/ui/border-beam";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, } from "@/components/ui/tooltip";
import { useAuth } from "@/context/authcontext";
const GET_SUMMONER_URL = `${API_BASE_URL}/api/summoner`;
const PROFILE_ICON_BASE = "https://cdn2.loldata.cc/16.1.1/img/profileicon";
export function ProfilerLinker() {
    const { refreshProfile } = useAuth();
    const [profile, setProfile] = useState(null);
    const [name, setName] = useState("");
    const [tag, setTag] = useState("");
    const [region, setRegion] = useState("EUW");
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [rsoLoading, setRsoLoading] = useState(false);
    const [step, setStep] = useState("preview");
    const [currentSummoner, setCurrentSummoner] = useState(null);
    const [verifyingIcon, setVerifyingIcon] = useState(false);
    const [linkedSummoner, setLinkedSummoner] = useState(null);
    const tagInputRef = useRef(null);
    // dettagli del summoner già linkato (per avatar + dati)
    const [linkedSummonerDetails, setLinkedSummonerDetails] = useState(null);
    useEffect(() => {
        (async () => {
            try {
                const { data: auth } = await supabase.auth.getUser();
                if (!auth?.user)
                    return;
                const { data, error } = await supabase
                    .from("profile_players")
                    .select("profile_id, player_id, puuid, nametag, region")
                    .eq("profile_id", auth.user.id)
                    .maybeSingle();
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
                                        region: upperRegion,
                                    }),
                                });
                                if (res.ok) {
                                    const json = await res.json();
                                    const summ = json.summoner;
                                    setLinkedSummonerDetails(summ);
                                }
                            }
                            catch (err) {
                                console.warn("Failed to fetch linked summoner details:", err);
                            }
                        }
                    }
                }
            }
            finally {
                setInitialLoading(false);
            }
        })();
    }, []);
    // Riot RSO callback — detect ?code= param or saved code from sessionStorage
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let code = params.get("code");
        // Also check sessionStorage (saved by AuthGuard before redirect to login)
        if (!code) {
            code = sessionStorage.getItem("riot_rso_code");
            if (code)
                sessionStorage.removeItem("riot_rso_code");
        }
        if (!code)
            return;
        // Remove code from URL to prevent re-processing on refresh
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
        (async () => {
            setRsoLoading(true);
            try {
                const { data: auth } = await supabase.auth.getUser();
                const userId = auth?.user?.id;
                const res = await fetch(`${API_BASE_URL}/api/auth/riot/callback`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code, userId, mode: userId ? "link" : "login" }),
                });
                if (!res.ok) {
                    const errText = await res.text();
                    showCyberToast({ title: "Riot link failed", description: errText, variant: "error", tag: "ERR" });
                    return;
                }
                const data = await res.json();
                if (data.mode === "login" && data.verifyUrl) {
                    // Login mode: verify the magic link to create a Supabase session
                    const { error: verifyErr } = await supabase.auth.verifyOtp({
                        token_hash: data.hashed_token,
                        type: "magiclink",
                    });
                    if (verifyErr) {
                        console.error("Magic link verify error:", verifyErr);
                        showCyberToast({ title: "Login failed", description: verifyErr.message, variant: "error", tag: "ERR" });
                        return;
                    }
                    showCyberToast({ title: "Logged in with Riot", description: `${data.nametag} (${data.region.toUpperCase()})`, variant: "status" });
                    window.location.href = "/dashboard";
                    return;
                }
                // Link mode
                showCyberToast({ title: "Riot account linked", description: `${data.nametag} (${data.region.toUpperCase()})`, variant: "status" });
                await refreshProfile();
                window.location.reload();
            }
            catch (err) {
                console.error("RSO callback error:", err);
                showCyberToast({ title: "Link failed", description: "Something went wrong.", variant: "error", tag: "ERR" });
            }
            finally {
                setRsoLoading(false);
            }
        })();
    }, []);
    async function handleRiotSignIn() {
        setRsoLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/riot/url`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        }
        catch (err) {
            console.error("Failed to get Riot auth URL:", err);
            showCyberToast({ title: "Failed to connect", variant: "error", tag: "ERR" });
            setRsoLoading(false);
        }
    }
    async function handleSearch(e) {
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
            const summoner = data.summoner;
            setCurrentSummoner(summoner);
            setStep("preview");
            setDialogOpen(true);
        }
        catch (err) {
            console.error(err);
            showCyberToast({
                title: "Network error",
                description: "An error occurred while searching for the profile.",
                variant: "error",
                tag: "NET",
            });
        }
        finally {
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
        if (!currentSummoner)
            return;
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
            const refresh = data.summoner;
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
                .maybeSingle();
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
            }
            else {
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
                description: "Your League profile has been successfully linked! Press CTRL+Y and go check your profile!",
                variant: "status",
                tag: "OK",
            });
            handleDialogClose();
        }
        catch (err) {
            console.error(err);
            showCyberToast({
                title: "Verification error",
                description: "An error occurred while verifying your icon.",
                variant: "error",
                tag: "ERR",
            });
        }
        finally {
            setVerifyingIcon(false);
        }
    }
    async function handleUnlink() {
        if (!profile)
            return;
        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user)
                return;
            const { error: updErr } = await supabase
                .from("profile_players")
                .update({
                puuid: null,
                nametag: null,
                region: null,
            })
                .eq("profile_id", auth.user.id);
            if (updErr)
                throw updErr;
            await supabase.auth.updateUser({
                data: {
                    lol_nametag: null,
                    lol_region: null,
                    lol_linked_at: null,
                },
            });
            setLinkedSummoner(null);
            setLinkedSummonerDetails(null);
            setProfile((p) => p
                ? {
                    ...p,
                    puuid: null,
                    nametag: null,
                    region: null,
                }
                : p);
            showCyberToast({
                title: "Profile unlinked",
                description: "Your League profile has been unlinked.",
                variant: "status",
                tag: "OK",
            });
        }
        catch (e) {
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
    const currentIconUrl = currentSummoner &&
        `${PROFILE_ICON_BASE}/${currentSummoner.profileIconId}.png`;
    const minionIconUrl = `${PROFILE_ICON_BASE}/3.png`;
    // icon per il profilo già linkato (header)
    const linkedIconUrl = linkedSummonerDetails &&
        (linkedSummonerDetails.avatar_url ??
            `${PROFILE_ICON_BASE}/${linkedSummonerDetails.profileIconId}.png`);
    return (_jsxs("div", { className: "relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" } }), _jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsxs("div", { className: "relative z-[2] px-4 py-3 pl-5", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4", children: [_jsx("div", { className: "w-16 h-16 rounded-[2px] overflow-hidden border border-jade/15 bg-black/30 shrink-0", children: isLinked && linkedSummonerDetails && linkedIconUrl ? (_jsx("img", { src: linkedIconUrl, alt: "", className: "w-full h-full object-cover" })) : (_jsx("img", { src: `${cdnBaseUrl()}/img/profileicon/29.png`, alt: "", className: "w-full h-full object-cover opacity-30" })) }), _jsx("div", { className: "min-w-0", children: initialLoading ? (_jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "h-3.5 w-32 rounded-[2px] bg-flash/5 animate-pulse" }), _jsx("div", { className: "h-3 w-48 rounded-[2px] bg-flash/5 animate-pulse" })] })) : isLinked && linkedSummoner && linkedSummonerDetails ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "text-flash/90 text-sm font-medium block", children: [linkedSummonerDetails.name, _jsxs("span", { className: "text-flash/40", children: ["#", linkedSummonerDetails.tag] })] }), _jsxs("span", { className: "text-[11px] text-flash/40 font-mono", children: [linkedSummoner.region.toUpperCase(), " / ", linkedSummonerDetails.rank, " / ", linkedSummonerDetails.lp, " LP"] })] })) : (_jsx("span", { className: "text-flash/40 text-sm", children: "Connect your Riot account for personalized analytics." })) })] }), _jsx("div", { className: "mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsxs("div", { className: "flex flex-wrap justify-between items-center gap-2 pt-2", children: [_jsx("span", { className: "text-[10px] font-mono text-flash/30 tracking-[0.08em]", children: isLinked ? "◈ LINKED" : "◈ NOT LINKED" }), _jsxs("div", { className: "flex items-center gap-2", children: [isLinked && (_jsx("button", { type: "button", onClick: handleUnlink, className: "px-2 py-1 rounded-[2px] cursor-clicker border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 transition-colors", children: "UNLINK" })), _jsxs("button", { type: "button", onClick: handleRiotSignIn, disabled: rsoLoading, className: "px-3 py-1.5 rounded-[2px] cursor-clicker border border-[#c8292e]/40 bg-[#c8292e]/10 hover:bg-[#c8292e]/20 text-[#e8484d] hover:text-[#ff5f63] text-[11px] tracking-[0.1em] uppercase transition-colors disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-1.5", children: [_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", className: "w-3.5 h-3.5 fill-current", children: _jsx("path", { d: "M13.458.86 0 7.093l3.353 12.761 2.552-.313-.701-8.024.838-.373 1.447 8.202 4.361-.535-.775-8.857.83-.37 1.591 9.025 4.412-.542-.849-9.708.84-.374 1.74 9.87L24 17.318V3.5Zm.316 19.356.222 1.256L24 23.14v-4.18l-10.22 1.256Z" }) }), rsoLoading ? "CONNECTING..." : isLinked ? "RE-LINK" : "LINK"] })] })] })] }), _jsx(Dialog, { open: dialogOpen, onOpenChange: (open) => !open && handleDialogClose(), children: _jsx(DialogContent, { className: "w-full max-w-[92vw] sm:max-w-md bg-transparent shadow-none top-60 [&>button]:hidden flex flex-col items-center", children: _jsx("div", { className: "w-full relative", children: _jsxs("div", { className: "font-jetbrains bg-liquirice/90 select-none border-flash/10 border px-7 py-5 rounded-md", children: [_jsx(BorderBeam, { duration: 8, size: 100 }), step === "preview" && currentSummoner && (_jsxs(_Fragment, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash flex justify-between items-center", children: _jsx("span", { children: "Is this your profile?" }) }), _jsx(DialogDescription, { className: "text-flash/60 pt-1 text-sm", children: "Double-check name, tag, and region before verifying ownership." })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4 items-start sm:items-center", children: [_jsx("div", { className: "w-16 h-16 rounded-xl overflow-hidden border border-flash/20 bg-black/40 shrink-0", children: currentIconUrl ? (_jsx("img", { src: currentIconUrl, alt: "Summoner Icon", className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-[10px] text-flash/40", children: "no icon" })) }), _jsxs("div", { className: "space-y-1 min-w-0", children: [_jsxs("div", { className: "text-flash font-semibold text-sm uppercase", children: [currentSummoner.name, _jsxs("span", { className: "text-flash/60 text-xs", children: ["#", currentSummoner.tag] })] }), _jsxs("div", { className: "text-xs text-flash/60", children: ["Region:", " ", _jsx("span", { className: "text-flash/90", children: region })] }), _jsxs("div", { className: "text-xs text-flash/60", children: ["Rank:", " ", _jsxs("span", { className: "text-flash", children: [currentSummoner.rank, " (", currentSummoner.lp, " LP)"] })] })] })] }), _jsxs(DialogFooter, { className: "mt-5 flex justify-between", children: [_jsx("button", { type: "button", onClick: handleDialogClose, className: "px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-sm cursor-clicker text-flash", children: "CANCEL" }), _jsx("button", { type: "button", onClick: handleConfirmIsMe, className: "px-4 py-1.5 rounded-sm border border-jade/30  hover:bg-jade/10 text-xs text-jade cursor-clicker", children: "Yes, that is me" })] })] })), step === "verifyIcon" && currentSummoner && (_jsxs(_Fragment, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash", children: "Verify profile ownership" }), _jsx(DialogDescription, { className: "text-flash/60 pt-1 text-xs", children: "Temporarily set your summoner icon to the minion with the gem (ID 3) so we can confirm that this account is yours." })] }), _jsxs("div", { className: "mt-4 space-y-3 text-xs text-flash/70", children: [_jsx("p", { className: "text-flash/90 text-sm", children: "Step 1" }), _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "w-16 h-16 flex-none rounded-lg overflow-hidden border border-jade/40 bg-black/40", children: _jsx("img", { src: minionIconUrl, alt: "Minion gem", className: "w-full h-full object-cover" }) }), _jsx("div", { children: _jsx("p", { children: "Open League of Legends and change your summoner icon to this one." }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-flash/90 text-sm mb-1", children: "Step 2" }), _jsxs("p", { children: ["Come back here and click", " ", _jsx("span", { className: "text-jade", children: "\u201CI Changed my Icon\u201D" }), ". We will check in real time that your icon is set to ID", " ", _jsx("b", { children: "3" }), "."] })] }), _jsx(TooltipProvider, { children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "mt-1 text-[11px] text-flash/60 underline underline-offset-4 decoration-dotted cursor-clicker", children: "Why do I have to do this?" }) }), _jsx(TooltipContent, { side: "top", className: "text-xs max-w-xs", children: "We use this temporary icon change as proof that you control this League account. You can switch back to your favorite icon right after the verification succeeds." })] }) })] }), _jsxs(DialogFooter, { className: "mt-5 flex justify-between", children: [_jsx("button", { type: "button", onClick: handleDialogClose, className: "px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-sm cursor-clicker disabled:opacity-60 disabled:pointer-events-none text-flash", disabled: verifyingIcon, children: "CANCEL" }), _jsx("button", { type: "button", onClick: handleVerifyIcon, className: "px-4 py-1.5 rounded-sm border border-jade/30 hover:bg-jade/10 text-xs text-jade cursor-clicker disabled:opacity-60 disabled:pointer-events-none", disabled: verifyingIcon, children: verifyingIcon ? "Checking..." : "I Changed my Icon" })] })] }))] }) }) }) })] }));
}
