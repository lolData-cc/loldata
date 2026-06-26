import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { VerifyBadge } from "@/components/verifybadge";
export function VerifyAccountsDialog({ open, onClose, accounts, playerDisplayName, playerColor, onChanged, }) {
    const allDone = accounts.length > 0 && accounts.every((a) => !!a.verifiedAt);
    const accent = playerColor || "#00d992";
    return (_jsx(Dialog, { open: open, onOpenChange: (o) => !o && onClose(), children: _jsxs(DialogContent, { className: "max-w-[520px] p-0 bg-transparent border-none shadow-none [&>button.absolute]:hidden", children: [_jsx(DialogTitle, { className: "sr-only", children: "Verify accounts" }), _jsxs("div", { className: "relative overflow-hidden rounded-lg", style: {
                        background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, transparent) 0%, rgba(0,0,0,0.55) 100%), rgba(4,10,12,0.92)`,
                        border: `0.5px solid color-mix(in srgb, ${accent} 25%, rgba(255,255,255,0.06))`,
                        boxShadow: `0 20px 60px rgba(0,0,0,0.65), inset 0 1px 0 color-mix(in srgb, ${accent} 28%, transparent)`,
                    }, children: [_jsxs("div", { className: "flex items-center gap-3 px-5 py-4 border-b border-flash/[0.06]", children: [_jsx("div", { className: "w-9 h-9 rounded-md flex items-center justify-center shrink-0", style: {
                                        background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                                        border: `0.5px solid color-mix(in srgb, ${accent} 40%, transparent)`,
                                    }, children: _jsx(VerifyBadge, { grade: allDone ? 2 : 1, size: 18 }) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsx("span", { className: "text-[15px] font-chakrapetch font-bold text-flash leading-tight", children: "Verify accounts" }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/45 mt-0.5", children: ["Identity \u00B7", " ", _jsx("span", { style: { color: accent }, children: playerDisplayName })] })] }), _jsx("button", { type: "button", onClick: onClose, className: "w-7 h-7 rounded-md flex items-center justify-center text-flash/40 hover:text-flash hover:bg-flash/[0.06] transition-colors cursor-clicker", "aria-label": "Close", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "px-5 pt-4 pb-3", children: _jsxs("p", { className: "text-[12px] text-flash/65 font-geist leading-snug", children: ["For each account below, set the requested profile icon in your League client, then press ", _jsx("span", { className: "text-jade", children: "Check" }), ". When every account is verified, your identity upgrades to ", _jsx("span", { className: "text-jade font-medium", children: "Verify Grade 2" }), "."] }) }), _jsx("div", { className: "px-3 pb-3 max-h-[60vh] overflow-y-auto", children: accounts.length === 0 ? (_jsx("div", { className: "px-3 py-6 text-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30", children: "No accounts to verify" })) : (_jsx("div", { className: "flex flex-col gap-2", children: accounts.map((a) => (_jsx(AccountVerifyRow, { account: a, onChanged: onChanged }, a.puuid))) })) }), _jsxs("div", { className: "px-5 py-3 border-t border-flash/[0.06] flex items-center justify-between", children: [_jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/40", children: [accounts.filter((a) => !!a.verifiedAt).length, "/", accounts.length, " ", "verified"] }), allDone && (_jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.25em] uppercase text-jade font-bold flex items-center gap-1.5", children: [_jsx(CheckCircle2, { className: "w-3.5 h-3.5" }), "Grade 2 unlocked"] }))] })] })] }) }));
}
function AccountVerifyRow({ account, onChanged, }) {
    const [state, setState] = useState({ phase: "idle" });
    const isVerified = !!account.verifiedAt;
    // Reset row state if it gets verified externally.
    useEffect(() => {
        if (isVerified)
            setState({ phase: "idle" });
    }, [isVerified]);
    const authHeader = async () => {
        const { data: { session }, } = await supabase.auth.getSession();
        if (!session?.access_token)
            return null;
        return {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
        };
    };
    const startChallenge = async () => {
        setState({ phase: "starting" });
        const headers = await authHeader();
        if (!headers) {
            showCyberToast({ title: "Sign in required", variant: "error" });
            setState({ phase: "idle" });
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/scout/verify/start`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    lobbyPlayerId: account.lobbyPlayerId,
                    puuid: account.puuid,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                showCyberToast({
                    title: "Couldn't start verify",
                    description: body?.error,
                    variant: "error",
                });
                setState({ phase: "idle" });
                return;
            }
            const data = await res.json();
            setState({ phase: "challenge", targetIconId: data.targetIconId });
        }
        catch (e) {
            showCyberToast({
                title: "Network error",
                description: e?.message,
                variant: "error",
            });
            setState({ phase: "idle" });
        }
    };
    const checkChallenge = async () => {
        if (state.phase !== "challenge" && state.phase !== "mismatch")
            return;
        const target = state.phase === "challenge"
            ? state.targetIconId
            : state.targetIconId;
        setState({ phase: "checking", targetIconId: target });
        const headers = await authHeader();
        if (!headers) {
            setState({ phase: "challenge", targetIconId: target });
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/scout/verify/check`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    lobbyPlayerId: account.lobbyPlayerId,
                    puuid: account.puuid,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showCyberToast({
                    title: "Check failed",
                    description: data?.error,
                    variant: "error",
                });
                setState({ phase: "challenge", targetIconId: target });
                return;
            }
            if (data?.match) {
                showCyberToast({
                    title: "Account verified",
                    description: `${account.riotName} #${account.riotTag}`,
                });
                onChanged();
                setState({ phase: "idle" });
            }
            else {
                setState({
                    phase: "mismatch",
                    targetIconId: target,
                    currentIconId: data?.currentIconId ?? null,
                });
            }
        }
        catch (e) {
            showCyberToast({
                title: "Network error",
                description: e?.message,
                variant: "error",
            });
            setState({ phase: "challenge", targetIconId: target });
        }
    };
    const iconUrl = (id) => id !== null ? `${cdnBaseUrl()}/img/profileicon/${id}.png` : null;
    // ─── Verified row ──────────────────────────────────────────────────
    if (isVerified) {
        return (_jsxs("div", { className: "flex items-center gap-3 px-3 py-2.5 rounded-md bg-jade/[0.06] border border-jade/25", children: [_jsx("div", { className: "flex items-center justify-center w-8 h-8 rounded-md bg-jade/15 border border-jade/40", children: _jsx(CheckCircle2, { className: "w-4 h-4 text-jade" }) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsxs("span", { className: "text-[12px] font-chakrapetch font-bold text-flash truncate", children: [account.riotName, _jsxs("span", { className: "text-flash/35 font-normal", children: ["#", account.riotTag] })] }), _jsxs("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-jade/80 mt-0.5", children: ["\u2713 Verified \u00B7 ", account.region] })] })] }));
    }
    // ─── Unverified row ────────────────────────────────────────────────
    return (_jsxs("div", { className: "rounded-md bg-black/35 border border-flash/[0.08] overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-3 px-3 py-2.5", children: [_jsx("div", { className: "w-8 h-8 rounded-md bg-flash/[0.04] border border-flash/15 flex items-center justify-center shrink-0", children: _jsx("span", { className: "text-[11px] font-jetbrains font-bold text-flash/55", children: account.region }) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsxs("span", { className: "text-[12px] font-chakrapetch font-bold text-flash truncate", children: [account.riotName, _jsxs("span", { className: "text-flash/35 font-normal", children: ["#", account.riotTag] })] }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/45 mt-0.5", children: "\u25C7 Unverified" })] }), _jsxs("div", { className: "shrink-0", children: [state.phase === "idle" && (_jsx("button", { type: "button", onClick: startChallenge, className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase font-bold px-3 py-1.5 rounded-[3px] border border-[#5bb8ff]/40 text-[#5bb8ff] bg-[#5bb8ff]/[0.08] hover:bg-[#5bb8ff]/[0.18] hover:border-[#5bb8ff]/70 cursor-clicker transition-all", children: "Verify" })), state.phase === "starting" && (_jsx(Loader2, { className: "w-4 h-4 text-[#5bb8ff] animate-spin" }))] })] }), _jsx(AnimatePresence, { children: (state.phase === "challenge" ||
                    state.phase === "checking" ||
                    state.phase === "mismatch") && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }, className: "overflow-hidden border-t border-flash/[0.06]", children: _jsxs("div", { className: "px-3 py-3 flex items-start gap-3", children: [_jsxs("div", { className: "shrink-0", children: [_jsx("div", { className: "text-[8px] font-jetbrains tracking-[0.3em] uppercase text-flash/45 text-center mb-1", children: "Target" }), iconUrl(state.targetIconId) && (_jsx("img", { src: iconUrl(state.targetIconId), alt: `Profile icon ${state.targetIconId}`, className: "w-16 h-16 rounded-md border border-[#5bb8ff]/50", style: {
                                            boxShadow: "0 0 18px rgba(91,184,255,0.35)",
                                        } })), _jsxs("div", { className: "text-[8px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 text-center mt-1", children: ["#", state.targetIconId] })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/70 font-medium mb-1.5", children: "Set this icon" }), _jsx("p", { className: "text-[11px] text-flash/55 font-geist leading-snug mb-3", children: "Open League client \u2192 Profile \u2192 Change profile icon \u2192 pick this one \u2192 wait ~30s for Riot to sync \u2192 press Check." }), state.phase === "mismatch" && (_jsxs("div", { className: "flex items-center gap-2 mb-3 px-2 py-1.5 rounded-[3px] bg-error/10 border border-error/30", children: [_jsx(AlertCircle, { className: "w-3.5 h-3.5 text-error shrink-0" }), _jsxs("div", { className: "text-[10px] font-jetbrains text-error/85 leading-snug", children: ["Icon hasn't changed yet.", state.currentIconId !== null && (_jsxs(_Fragment, { children: [" Current: #", state.currentIconId] })), " ", "Try again in 30s."] })] })), _jsx("button", { type: "button", onClick: checkChallenge, disabled: state.phase === "checking", className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase font-bold px-3 py-1.5 rounded-[3px] border border-jade/40 text-jade bg-jade/[0.10] hover:bg-jade/[0.20] hover:border-jade/70 cursor-clicker transition-all disabled:opacity-50", children: state.phase === "checking" ? (_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx(Loader2, { className: "w-3 h-3 animate-spin" }), "Checking\u2026"] })) : ("I've changed it · Check") })] })] }) })) })] }));
}
