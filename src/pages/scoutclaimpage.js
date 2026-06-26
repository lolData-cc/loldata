import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/pages/scoutclaimpage.tsx
//
// /scout/claim/:token — public claim landing page.
//
// Flow
//   1. Fetch invite info (lobby name, player display name, accounts).
//   2. Show "Sei tu {name}?" dialog. CTAs:
//      - Logged out → "Sign in to claim" (opens existing login flow,
//        comes back here on success).
//      - Logged in  → "Claim this identity" → POST .../claim → on
//        success, jade success animation + auto-redirect to lobby.
//   3. Edge states:
//      - Invite revoked / not found → friendly 404 page.
//      - Already claimed → "this identity is already linked to
//        another loldata account."
//      - User already claimed someone else in this lobby → 409 toast.
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { API_BASE_URL, cdnSplashUrl } from "@/config";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { showCyberToast } from "@/lib/toast-utils";
import { VerifyBadge } from "@/components/verifybadge";
// Cyber-styled primary CTA button — matches the brand's "luxury
// glass" vocabulary without dragging in extra deps.
function PrimaryCta({ label, onClick, disabled, loading, className, }) {
    return (_jsx("button", { type: "button", onClick: disabled || loading ? undefined : onClick, disabled: disabled || loading, className: cn("w-full px-5 py-3 rounded-md text-[12px] font-jetbrains tracking-[0.25em] uppercase font-bold transition-all cursor-clicker relative overflow-hidden", "bg-jade/[0.14] text-jade border border-jade/45", "hover:bg-jade/[0.22] hover:border-jade/70 hover:shadow-[0_0_24px_rgba(0,217,146,0.35)]", "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-jade/[0.14]", className), children: loading ? (_jsxs("span", { className: "inline-flex items-center justify-center gap-2", children: [_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" }), label] })) : (label) }));
}
export default function ScoutClaimPage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { session } = useAuth();
    const user = session?.user ?? null;
    const [invite, setInvite] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [success, setSuccess] = useState(false);
    // Load invite info on mount.
    useEffect(() => {
        if (!token)
            return;
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE_URL}/api/scout/claim-invite/${token}`)
            .then(async (r) => {
            if (r.status === 404) {
                if (!cancelled)
                    setNotFound(true);
                return null;
            }
            return r.ok ? r.json() : null;
        })
            .then((d) => {
            if (cancelled)
                return;
            if (d)
                setInvite(d);
        })
            .catch(() => !cancelled && setNotFound(true))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [token]);
    // After claim, animate success and auto-redirect to the lobby.
    useEffect(() => {
        if (!success || !invite)
            return;
        const t = setTimeout(() => {
            navigate(`/scout/${invite.lobby.slug}`);
        }, 1800);
        return () => clearTimeout(t);
    }, [success, invite, navigate]);
    const handleClaim = async () => {
        if (!token || !user)
            return;
        setClaiming(true);
        try {
            const { data: { session }, } = await supabase.auth.getSession();
            const auth = session?.access_token;
            if (!auth) {
                showCyberToast({
                    title: "Session expired",
                    description: "Sign in again to claim",
                    variant: "error",
                });
                setClaiming(false);
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/scout/claim-invite/${token}/claim`, {
                method: "POST",
                headers: { Authorization: `Bearer ${auth}` },
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                showCyberToast({
                    title: "Claim failed",
                    description: body?.error ?? "Try again",
                    variant: "error",
                });
                setClaiming(false);
                return;
            }
            setSuccess(true);
        }
        catch (e) {
            showCyberToast({
                title: "Network error",
                description: e?.message ?? "",
                variant: "error",
            });
            setClaiming(false);
        }
    };
    // ─── Loading state ────────────────────────────────────────────────
    if (loading) {
        return (_jsx(CenteredPage, { children: _jsx(Loader2, { className: "w-6 h-6 text-jade animate-spin" }) }));
    }
    // ─── 404 / revoked ────────────────────────────────────────────────
    if (notFound || !invite) {
        return (_jsx(CenteredPage, { children: _jsxs("div", { className: "text-center max-w-sm", children: [_jsx(AlertCircle, { className: "w-10 h-10 text-citrine/70 mx-auto mb-4" }), _jsx("div", { className: "text-[18px] font-chakrapetch font-bold text-flash mb-2", children: "Invite not found" }), _jsx("div", { className: "text-[12px] text-flash/55 font-geist leading-snug", children: "This link has been revoked or never existed. Ask the lobby admin for a fresh invite." })] }) }));
    }
    const { player, lobby } = invite;
    const accent = player.color || "#00d992";
    const splash = lobby.heroChampion ? cdnSplashUrl(lobby.heroChampion, 0) : null;
    // ─── Already claimed by someone else ──────────────────────────────
    if (player.alreadyClaimed) {
        return (_jsx(CenteredPage, { splash: splash, children: _jsxs("div", { className: "text-center max-w-md", children: [_jsx("div", { className: "inline-flex items-center justify-center w-14 h-14 rounded-full bg-citrine/15 border border-citrine/40 mb-4", children: _jsx(AlertCircle, { className: "w-7 h-7 text-citrine" }) }), _jsx("div", { className: "text-[20px] font-chakrapetch font-bold text-flash mb-2", children: "Already linked" }), _jsxs("div", { className: "text-[13px] text-flash/60 font-geist leading-snug mb-5", children: [_jsx("span", { style: { color: accent }, className: "font-medium", children: player.displayName }), " ", "in ", _jsx("span", { className: "text-flash/85", children: lobby.name }), " has already been claimed by another loldata account."] }), _jsx(PrimaryCta, { onClick: () => navigate(`/scout/${lobby.slug}`), label: "Visit lobby" })] }) }));
    }
    // ─── Success animation ────────────────────────────────────────────
    if (success) {
        return (_jsx(CenteredPage, { splash: splash, children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.6 }, animate: { opacity: 1, scale: 1 }, transition: {
                    type: "spring",
                    stiffness: 280,
                    damping: 22,
                }, className: "text-center max-w-sm", children: [_jsx("div", { className: "inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 relative", style: {
                            background: `radial-gradient(circle, color-mix(in srgb, ${accent} 30%, transparent), transparent 70%)`,
                        }, children: _jsx(VerifyBadge, { grade: 1, size: 64 }) }), _jsx("div", { className: "text-[22px] font-chakrapetch font-bold text-flash mb-2", children: "Identity verified" }), _jsxs("div", { className: "text-[12px] text-flash/55 font-geist leading-snug", children: ["You're now linked to", " ", _jsx("span", { style: { color: accent }, className: "font-medium", children: player.displayName }), " ", "in ", lobby.name, ".", _jsx("br", {}), "Redirecting\u2026"] })] }) }));
    }
    // ─── Main claim dialog ────────────────────────────────────────────
    return (_jsx(CenteredPage, { splash: splash, children: _jsx(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }, className: "relative w-full max-w-md", children: _jsxs("div", { className: "relative overflow-hidden rounded-lg p-7 backdrop-blur-2xl", style: {
                    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, transparent) 0%, rgba(0,0,0,0.5) 100%), rgba(4,10,12,0.85)`,
                    border: `0.5px solid color-mix(in srgb, ${accent} 25%, rgba(255,255,255,0.07))`,
                    boxShadow: `0 20px 60px rgba(0,0,0,0.65), inset 0 1px 0 color-mix(in srgb, ${accent} 30%, transparent)`,
                }, children: [_jsx("div", { className: "text-[10px] font-jetbrains tracking-[0.3em] uppercase text-flash/45 mb-1", children: lobby.name }), _jsxs("h1", { className: "text-[28px] font-chakrapetch font-bold text-flash leading-tight mb-1", children: ["Are you", " ", _jsx("span", { style: { color: accent }, children: player.displayName }), "?"] }), _jsx("p", { className: "text-[12px] text-flash/60 font-geist leading-snug mb-5", children: "Claim this identity to link it to your loldata account. You'll earn the Verify Grade 1 badge and unlock the account certification flow." }), player.accounts.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsx("div", { className: "text-[9px] font-jetbrains tracking-[0.28em] uppercase text-flash/40 mb-2", children: "Linked accounts" }), _jsx("div", { className: "flex flex-col gap-1.5", children: player.accounts.map((a) => (_jsxs("div", { className: "flex items-center justify-between px-3 py-2 rounded-md bg-black/35 border border-flash/[0.06]", children: [_jsxs("span", { className: "text-[12px] font-chakrapetch font-bold text-flash truncate", children: [a.riotName, _jsxs("span", { className: "text-flash/35 font-normal", children: ["#", a.riotTag] })] }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/45 shrink-0 ml-2", children: a.region })] }, a.puuid))) })] })), !user ? (_jsxs("div", { children: [_jsx(PrimaryCta, { onClick: () => {
                                    // Redirect to login with returnTo set to this page.
                                    const back = encodeURIComponent(window.location.pathname + window.location.search);
                                    navigate(`/login?returnTo=${back}`);
                                }, label: "Sign in to claim" }), _jsx("p", { className: "text-[10px] text-flash/40 text-center mt-3 font-jetbrains tracking-[0.15em] uppercase", children: "You must be signed in" })] })) : (_jsx(PrimaryCta, { onClick: handleClaim, label: claiming ? "Claiming…" : "Yes, claim this identity", loading: claiming }))] }) }) }));
}
// ─── Layout helper ──────────────────────────────────────────────────
// Natural-flow container (NOT position: fixed) — fixed would float
// outside RootLayout's content slot and the footer would render
// stacked over the dialog. min-h-[calc(100vh-60px)] makes the section
// claim the viewport space between navbar and footer; the splash is
// `absolute` inside so it stays bounded to this section.
function CenteredPage({ children, splash, }) {
    return (_jsxs("section", { className: "relative w-full min-h-[calc(100vh-60px)] flex items-center justify-center px-4 py-12", children: [splash && (_jsx(_Fragment, { children: _jsxs("div", { className: "absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-screen pointer-events-none overflow-hidden", "aria-hidden": true, children: [_jsx("div", { className: "absolute inset-0", style: {
                                backgroundImage: `url(${splash})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                filter: "blur(28px) brightness(0.32)",
                                transform: "scale(1.12)",
                            } }), _jsx("div", { className: "absolute inset-0", style: {
                                background: "radial-gradient(ellipse at center, rgba(4,10,12,0.4) 0%, rgba(4,10,12,0.94) 75%)",
                            } })] }) })), _jsx("div", { className: "relative z-[1] flex items-center justify-center w-full", children: children })] }));
}
