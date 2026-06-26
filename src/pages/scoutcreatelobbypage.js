import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// /scout/new — wizard for creating a scout-feed lobby.
// Style follows the "This Season" box on the summoner page:
// glass dark background, BorderBeam, small mono headers with gradient rule,
// jade accents, jetbrains body.
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, Check, Loader2, Copy, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, SITE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { BorderBeam } from "@/components/ui/border-beam";
import { Dialog, DialogContent, DialogTitle, } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
/* ─── constants ───────────────────────────────────────────────────────── */
const MAX_PLAYERS = 20;
const MAX_ACCOUNTS = 3;
const REGIONS = ["EUW", "NA", "KR"];
const JADE = "#00d992";
const JADE_DIM = "rgba(0,217,146,0.08)";
function makeUid() {
    return Math.random().toString(36).slice(2, 10);
}
/* ─── glass card style (mirrors summonerpage "This Season" box) ──────── */
const glassDark = cn("relative overflow-hidden rounded-md", "bg-black/15 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]");
/* Soft jade radial glow that sits behind the card content so the surface
   reads brighter without losing the dark theme. Two stops: a focused
   highlight near the top + a fainter wash at the bottom right. */
function GlowBackdrop() {
    return (_jsx("div", { "aria-hidden": true, className: "absolute inset-0 pointer-events-none z-0", style: {
            background: `
          radial-gradient(ellipse 80% 50% at 30% 0%, rgba(0,217,146,0.10) 0%, transparent 65%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,184,255,0.05) 0%, transparent 70%),
          radial-gradient(ellipse 120% 80% at 50% 50%, rgba(255,255,255,0.025) 0%, transparent 70%)
        `,
            filter: "blur(20px)",
        } }));
}
/* ─── small header bar (◈ :: SECTION :: tag) ─────────────────────────── */
function SectionHeader({ label, meta, right, }) {
    return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { style: { color: JADE, fontSize: "12px" }, children: "\u25C8" }), _jsx("span", { className: "text-[13px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium", children: label }), meta && (_jsx("span", { className: "text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/45", children: meta })), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" }), right] }));
}
/* ─── field label (◆ Label) — sits above an input ──────────────────── */
function FieldLabel({ children }) {
    return (_jsxs("span", { className: "text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/65 flex items-center gap-1.5 mb-2", children: [_jsx("span", { className: "text-jade/70", style: { fontSize: "9px" }, children: "\u25C6" }), children] }));
}
const FluidInput = ({ size = "md", className, ...props }) => {
    const sizing = size === "lg"
        ? "h-14 px-4 text-[17px]"
        : "h-11 px-3.5 text-[14px]";
    return (_jsxs("div", { className: "relative group", children: [_jsx("div", { "aria-hidden": true, className: "absolute inset-0 rounded-[3px] pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300", style: {
                    boxShadow: "0 0 0 1px rgba(0,217,146,0.45), 0 0 18px rgba(0,217,146,0.18)",
                } }), _jsx("input", { ...props, className: cn("relative w-full bg-black/30 border border-flash/15 rounded-[3px] text-flash placeholder:text-flash/35 outline-none", "transition-[border-color,background-color] duration-200", "group-focus-within:border-jade/0 group-hover:border-flash/25", "group-focus-within:bg-black/40", sizing, className) })] }));
};
function FluidButton({ variant = "secondary", size = "md", icon, children, className, disabled, ...rest }) {
    const sizing = {
        sm: "h-8 px-3 text-[11px] tracking-[0.18em]",
        md: "h-10 px-4 text-[12px] tracking-[0.2em]",
        lg: "h-12 px-6 text-[13px] tracking-[0.22em]",
    }[size];
    const palette = disabled
        ? "border-flash/10 text-flash/25 bg-transparent cursor-not-allowed"
        : variant === "primary"
            ? cn("border-jade/40 text-jade bg-jade/[0.10]", "hover:bg-jade/[0.20] hover:border-jade/60 hover:text-jade", "shadow-[0_0_24px_rgba(0,217,146,0.18),inset_0_0_24px_rgba(0,217,146,0.06)]", "hover:shadow-[0_0_32px_rgba(0,217,146,0.30),inset_0_0_28px_rgba(0,217,146,0.10)]")
            : variant === "secondary"
                ? cn("border-jade/25 text-jade/85 bg-jade/[0.05]", "hover:bg-jade/[0.12] hover:border-jade/45 hover:text-jade")
                : cn("border-flash/15 text-flash/60 bg-transparent", "hover:bg-flash/[0.06] hover:border-flash/25 hover:text-flash/80");
    return (_jsxs("button", { ...rest, disabled: disabled, className: cn("relative inline-flex items-center justify-center gap-2 rounded-[3px] border", "font-jetbrains font-medium uppercase cursor-clicker", "transition-all duration-200 ease-out", "hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]", "disabled:hover:translate-y-0 disabled:hover:scale-100", sizing, palette, className), children: [icon, children] }));
}
/* ─── account row ─────────────────────────────────────────────────────── */
function AccountRow({ account, onRemove, }) {
    return (_jsxs("div", { className: "flex items-center gap-2.5 px-2 py-1.5 rounded-[3px] hover:bg-flash/[0.04] transition-colors group", children: [_jsx(Check, { className: "w-3.5 h-3.5 text-jade shrink-0" }), _jsx("span", { className: "text-[11px] font-jetbrains font-medium tracking-[0.18em] uppercase text-jade/70 w-10", children: account.region }), _jsxs("span", { className: "text-sm font-geist text-flash/90 truncate", children: [account.riotName, _jsxs("span", { className: "text-flash/40", children: ["#", account.riotTag] })] }), _jsx("button", { type: "button", onClick: onRemove, className: "ml-auto text-flash/30 hover:text-error transition-colors cursor-clicker opacity-60 group-hover:opacity-100 p-0.5", "aria-label": "Remove account", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }));
}
/* ─── account input (add new) ─────────────────────────────────────────── */
function AccountAdder({ onAdd, disabled, }) {
    const [open, setOpen] = useState(false);
    const [region, setRegion] = useState("EUW");
    const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
    const [raw, setRaw] = useState(""); // "name#tag"
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState(null);
    const submit = async () => {
        setError(null);
        const m = raw.trim().match(/^(.+)#(.+)$/);
        if (!m) {
            setError("Format: name#tag");
            return;
        }
        const name = m[1].trim();
        const tag = m[2].trim();
        setVerifying(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/summoner`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, tag, region }),
            });
            if (!res.ok) {
                setError("Account not found");
                setVerifying(false);
                return;
            }
            const data = await res.json();
            const sum = data?.summoner;
            if (!sum?.puuid) {
                setError("Account not found");
                setVerifying(false);
                return;
            }
            onAdd({
                uid: makeUid(),
                puuid: sum.puuid,
                region,
                riotName: sum.name ?? name,
                riotTag: sum.tag ?? tag,
            });
            setRaw("");
            setOpen(false);
        }
        catch (err) {
            setError("Network error");
        }
        finally {
            setVerifying(false);
        }
    };
    if (!open) {
        return (_jsx(FluidButton, { onClick: () => setOpen(true), disabled: disabled, variant: "ghost", size: "sm", icon: _jsx(Plus, { className: "w-3.5 h-3.5" }), children: "Add account" }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-200", children: [_jsxs("div", { className: "flex items-stretch gap-2 w-full", children: [_jsxs("div", { className: "relative group flex-1 min-w-0", children: [_jsx("div", { "aria-hidden": true, className: "absolute inset-0 rounded-[3px] pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300", style: {
                                    boxShadow: "0 0 0 1px rgba(0,217,146,0.45), 0 0 18px rgba(0,217,146,0.18)",
                                } }), _jsx("input", { autoFocus: true, value: raw, onChange: (e) => setRaw(e.target.value), onKeyDown: (e) => {
                                    if (e.key === "Enter")
                                        submit();
                                    if (e.key === "Escape")
                                        setOpen(false);
                                }, placeholder: "name#tag", className: cn("relative w-full h-10 px-3.5 bg-black/30 border border-flash/15 rounded-[3px]", "text-[14px] text-flash placeholder:text-flash/35 outline-none", "transition-[border-color,background-color] duration-200", "group-focus-within:border-jade/0 group-hover:border-flash/25", "group-focus-within:bg-black/40") })] }), _jsxs(Popover, { open: regionPopoverOpen, onOpenChange: setRegionPopoverOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx(Button, { variant: "outline", role: "combobox", className: cn("h-10 w-[78px] justify-between bg-black/30 border border-flash/15", "font-jetbrains text-[12px] tracking-[0.18em] uppercase text-flash/85", "hover:border-flash/25 hover:bg-black/40"), children: region }) }), _jsx(PopoverContent, { className: "pointer-events-auto z-[9999] w-[100px] p-0 bg-liquirice/90 border-flash/20 cursor-clicker", children: _jsx(Command, { children: _jsxs(CommandList, { children: [_jsx(CommandEmpty, { children: "No region found." }), _jsx(CommandGroup, { children: REGIONS.map((r) => (_jsx(CommandItem, { value: r, onSelect: () => {
                                                        setRegion(r);
                                                        setRegionPopoverOpen(false);
                                                    }, className: "font-jetbrains tracking-[0.18em] uppercase", children: r }, r))) })] }) }) })] }), _jsx(FluidButton, { onClick: submit, disabled: verifying, variant: "primary", size: "md", icon: verifying ? _jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" }) : null, children: verifying ? "Verifying" : "Add" }), _jsx("button", { type: "button", onClick: () => {
                            setOpen(false);
                            setRaw("");
                            setError(null);
                        }, className: "text-flash/40 hover:text-flash/80 transition-colors cursor-clicker p-1 self-center", "aria-label": "Cancel", children: _jsx(X, { className: "w-4 h-4" }) })] }), error && (_jsxs("span", { className: "text-[11px] font-jetbrains tracking-[0.15em] uppercase text-error/80 pl-1 flex items-center gap-1.5 animate-in fade-in duration-200", children: [_jsx("span", { style: { fontSize: "9px" }, children: "\u25C6" }), " ", error] }))] }));
}
/* ─── single player card ──────────────────────────────────────────────── */
function PlayerCard({ index, player, onChange, onRemove, }) {
    const addAccount = (acc) => onChange({ ...player, accounts: [...player.accounts, acc] });
    const removeAccount = (uid) => onChange({
        ...player,
        accounts: player.accounts.filter((a) => a.uid !== uid),
    });
    const slotLabel = `P${String(index + 1).padStart(2, "0")}`;
    return (_jsxs("div", { className: "relative rounded-[2px] overflow-hidden bg-black/20 border border-flash/15", style: {
            boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.03)",
        }, children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px]", style: { background: `color-mix(in srgb, ${JADE} 35%, transparent)` } }), _jsxs("div", { className: "px-5 py-4", children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("span", { className: "text-[11px] font-jetbrains font-medium tracking-[0.22em] uppercase px-2 py-1 rounded-[2px]", style: {
                                    color: JADE,
                                    background: JADE_DIM,
                                    border: `1px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
                                }, children: slotLabel }), _jsx("input", { value: player.displayName, onChange: (e) => onChange({ ...player, displayName: e.target.value }), placeholder: "Player name", maxLength: 40, className: cn("flex-1 bg-transparent text-base font-geist text-flash placeholder:text-flash/30 outline-none", "border-b border-flash/0 focus:border-jade/40 hover:border-flash/15", "transition-colors duration-200 py-1") }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/35 shrink-0", children: [player.accounts.length, "/", MAX_ACCOUNTS] }), _jsx("button", { type: "button", onClick: onRemove, className: "text-flash/35 hover:text-error transition-colors cursor-clicker p-1 -mr-1", "aria-label": "Remove player", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex flex-col gap-1.5 pl-1", children: [player.accounts.map((a) => (_jsx(AccountRow, { account: a, onRemove: () => removeAccount(a.uid) }, a.uid))), _jsx("div", { className: "pt-2", children: _jsx(AccountAdder, { onAdd: addAccount, disabled: player.accounts.length >= MAX_ACCOUNTS }) })] })] })] }));
}
/* ─── success dialog (after lobby created) ───────────────────────────── */
function CreatedDialog({ result, onClose, onOpenLobby, }) {
    const [copiedField, setCopiedField] = useState(null);
    const lobbyUrl = `${SITE_URL}/scout/${result.slug}`;
    const editUrl = `${SITE_URL}/scout/${result.slug}/edit?key=${result.ownerKey}`;
    const copy = async (value, field) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 1500);
        }
        catch {
            // ignore
        }
    };
    return (_jsx(Dialog, { open: true, onOpenChange: (v) => !v && onClose(), children: _jsxs(DialogContent, { className: "p-0 border-0 bg-transparent shadow-none max-w-[480px] font-geist [&>button]:hidden", children: [_jsx(DialogTitle, { className: "sr-only", children: "Lobby created" }), _jsxs("div", { className: "relative rounded-[2px] overflow-hidden", style: {
                        background: "rgba(8,16,20,0.92)",
                        backdropFilter: "blur(12px)",
                        border: `1px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
                    }, children: [_jsx("div", { "aria-hidden": true, className: "absolute inset-0 pointer-events-none z-0", style: {
                                background: `
                radial-gradient(ellipse 80% 60% at 30% 0%, rgba(0,217,146,0.12) 0%, transparent 65%),
                radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,184,255,0.06) 0%, transparent 70%)
              `,
                                filter: "blur(16px)",
                            } }), _jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] z-[1]", style: { background: `color-mix(in srgb, ${JADE} 55%, transparent)` } }), _jsxs("div", { className: "relative z-10 px-7 py-6", children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-5 text-[12px] font-jetbrains tracking-[0.22em] uppercase", children: [_jsx("span", { style: { color: JADE, fontSize: "12px" }, children: "\u25C8" }), _jsx("span", { className: "text-flash/45", children: "::" }), _jsx("span", { className: "px-2 py-0.5 font-medium", style: {
                                                color: JADE,
                                                background: JADE_DIM,
                                                border: `1px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
                                                borderRadius: "2px",
                                            }, children: "LOBBY CREATED" }), _jsx("span", { className: "text-flash/45", children: "::" }), _jsx("span", { className: "text-flash/55", children: result.slug })] }), _jsx("p", { className: "text-flash/80 text-[14px] mb-5 leading-relaxed", children: "Share the public link with anyone \u2014 they'll see the feed and leaderboards. Keep the edit link private; it grants modification rights." }), _jsxs("div", { className: "flex flex-col gap-4 mb-6", children: [_jsx(LinkRow, { label: "Public link", value: lobbyUrl, copied: copiedField === "link", onCopy: () => copy(lobbyUrl, "link") }), _jsx(LinkRow, { label: "Edit link", value: editUrl, copied: copiedField === "edit", onCopy: () => copy(editUrl, "edit"), emphasis: "warn" })] }), _jsxs("div", { className: "flex justify-end gap-2.5", children: [_jsx(FluidButton, { onClick: onClose, variant: "ghost", size: "md", children: "Close" }), _jsx(FluidButton, { onClick: onOpenLobby, variant: "primary", size: "md", icon: _jsx(ExternalLink, { className: "w-3.5 h-3.5" }), children: "Open lobby" })] })] })] })] }) }));
}
function LinkRow({ label, value, copied, onCopy, emphasis, }) {
    const accent = emphasis === "warn" ? "#FFB615" : JADE;
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsxs("span", { className: "text-[11px] font-jetbrains tracking-[0.18em] uppercase flex items-center gap-1.5", style: { color: `color-mix(in srgb, ${accent} 75%, transparent)` }, children: [_jsx("span", { style: { fontSize: "9px" }, children: "\u25C6" }), " ", label] }), _jsxs("div", { className: "flex items-center gap-2 bg-black/30 border border-flash/15 rounded-[3px] px-3 py-2.5 hover:border-flash/25 transition-colors", children: [_jsx("code", { className: "flex-1 text-[13px] font-jetbrains text-flash/90 truncate", children: value }), _jsx("button", { type: "button", onClick: onCopy, className: cn("text-[11px] font-jetbrains tracking-[0.18em] uppercase px-3 py-1.5 rounded-[3px] border cursor-clicker", "flex items-center gap-1.5 transition-all duration-200", copied
                            ? "border-jade/40 text-jade bg-jade/[0.10]"
                            : "border-flash/20 text-flash/70 hover:bg-flash/[0.06] hover:border-flash/35 hover:text-flash"), children: copied ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-3.5 h-3.5" }), " Copied"] })) : (_jsxs(_Fragment, { children: [_jsx(Copy, { className: "w-3.5 h-3.5" }), " Copy"] })) })] })] }));
}
/* ─── main page ───────────────────────────────────────────────────────── */
export default function ScoutCreateLobbyPage() {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [lobbyName, setLobbyName] = useState("");
    const [players, setPlayers] = useState(() => [
        { uid: makeUid(), displayName: "", accounts: [] },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [createResult, setCreateResult] = useState(null);
    const addPlayer = useCallback(() => {
        setPlayers((prev) => {
            if (prev.length >= MAX_PLAYERS)
                return prev;
            return [...prev, { uid: makeUid(), displayName: "", accounts: [] }];
        });
    }, []);
    const updatePlayer = useCallback((uid, next) => {
        setPlayers((prev) => prev.map((p) => (p.uid === uid ? next : p)));
    }, []);
    const removePlayer = useCallback((uid) => {
        setPlayers((prev) => prev.filter((p) => p.uid !== uid));
    }, []);
    const { canSubmit, totalAccounts } = useMemo(() => {
        let total = 0;
        let valid = true;
        if (!lobbyName.trim())
            valid = false;
        if (players.length === 0)
            valid = false;
        for (const p of players) {
            if (!p.displayName.trim())
                valid = false;
            if (p.accounts.length === 0)
                valid = false;
            total += p.accounts.length;
        }
        return { canSubmit: valid, totalAccounts: total };
    }, [lobbyName, players]);
    const submit = async () => {
        if (!canSubmit || submitting)
            return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const { data: sess } = await supabase.auth.getSession();
            const token = sess?.session?.access_token;
            if (!token) {
                setSubmitError("You must be logged in");
                setSubmitting(false);
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: lobbyName.trim(),
                    isPublic: true,
                    players: players.map((p) => ({
                        displayName: p.displayName.trim(),
                        accounts: p.accounts.map((a) => ({
                            puuid: a.puuid,
                            region: a.region,
                            riotName: a.riotName,
                            riotTag: a.riotTag,
                        })),
                    })),
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setSubmitError(data.error ?? "Failed to create lobby");
                setSubmitting(false);
                return;
            }
            const data = (await res.json());
            setCreateResult(data);
        }
        catch (err) {
            console.error(err);
            setSubmitError("Network error");
        }
        finally {
            setSubmitting(false);
        }
    };
    // basic guardrail — AuthGuard wraps the route, but if session goes away mid-page:
    if (!session)
        return null;
    return (_jsxs("div", { className: "w-full flex justify-center pt-8 pb-24 font-geist", children: [_jsx("div", { className: "w-full max-w-[860px]", children: _jsxs("div", { className: glassDark, children: [_jsx(GlowBackdrop, {}), _jsx(BorderBeam, { duration: 10, size: 120 }), _jsxs("div", { className: "relative z-10 p-8", children: [_jsx(SectionHeader, { label: "Scout", meta: ":: NEW LOBBY", right: _jsxs("span", { className: "text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/50", children: [players.length, "/", MAX_PLAYERS, " players \u00B7 ", totalAccounts, " accounts"] }) }), _jsxs("div", { className: "mt-6", children: [_jsx(FieldLabel, { children: "Lobby name" }), _jsx(FluidInput, { value: lobbyName, onChange: (e) => setLobbyName(e.target.value), placeholder: "e.g. Friday Night Crew", maxLength: 80, size: "lg" })] }), _jsxs("div", { className: "mt-7", children: [_jsx(SectionHeader, { label: "Players", meta: `${players.length}/${MAX_PLAYERS}`, right: _jsx(FluidButton, { onClick: addPlayer, disabled: players.length >= MAX_PLAYERS, variant: "secondary", size: "sm", icon: _jsx(Plus, { className: "w-3.5 h-3.5" }), children: "Add Player" }) }), _jsx("div", { className: "mt-4 flex flex-col gap-3", children: players.map((p, i) => (_jsx(PlayerCard, { index: i, player: p, onChange: (next) => updatePlayer(p.uid, next), onRemove: () => removePlayer(p.uid) }, p.uid))) })] }), _jsxs("div", { className: "mt-8 flex flex-col gap-3", children: [submitError && (_jsxs("span", { className: "text-[11px] font-jetbrains tracking-[0.15em] uppercase text-error/80 flex items-center gap-1.5", children: [_jsx("span", { style: { fontSize: "9px" }, children: "\u25C6" }), " ", submitError] })), _jsx("div", { className: "flex justify-end", children: _jsx(FluidButton, { onClick: submit, disabled: !canSubmit || submitting, variant: "primary", size: "lg", icon: submitting ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin" })) : (_jsx("span", { style: { fontSize: "10px" }, children: "\u25C8" })), children: submitting ? "Creating" : "Create lobby" }) })] })] })] }) }), createResult && (_jsx(CreatedDialog, { result: createResult, onClose: () => {
                    setCreateResult(null);
                    // soft reset: keep the form? for now we navigate so the user
                    // doesn't re-submit the same lobby by accident.
                    navigate(`/scout/${createResult.slug}`);
                }, onOpenLobby: () => navigate(`/scout/${createResult.slug}`) }))] }));
}
