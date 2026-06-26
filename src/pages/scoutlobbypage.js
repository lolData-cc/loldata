import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// /scout/[slug] — public feed for a scout lobby.
//
// Layout:
//   1. Yunara splash hero with lobby name + headline stats
//   2. Custom tab nav (Matches / Stats / Habits / Champions)
//   3. Per-tab content
import React, { useCallback, useEffect, useMemo, useRef, useState, memo, } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Loader2, ChevronDown, Users, Trophy, TrendingUp, Gamepad2, Award, RefreshCw, Swords, Flame, Crown, Coins, Shield, Sparkles, Zap, Wheat, Target, CheckCircle2, ShieldCheck, Lock, Crosshair, Info, } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, cdnBaseUrl, cdnSplashUrl, normalizeChampName, summonerSpellUrl } from "@/config";
import { getKeystoneIcon } from "@/constants/runes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MatchCard } from "@/components/matchcard";
import { showCyberToast } from "@/lib/toast-utils";
import { DiamondButton } from "@/components/ui/diamond-button";
import { getRankImage } from "@/utils/rankIcons";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle, } from "@/components/ui/dialog";
import { Plus, X, Check, Pencil, Trash2, Eye } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { VerifyBadge } from "@/components/verifybadge";
import { VerifyAccountsDialog, } from "@/components/verifyaccountsdialog";
import { ChatTab } from "@/components/scoutchat/chattab";
import { useScoutChat } from "@/components/scoutchat/usescoutchat";
import { CompareTab } from "@/components/scoutcompare/comparetab";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // must match backend
const COUNTDOWN_TICK_MS = 1000;
const JADE = "#00d992";
const QUEUE_LABELS = {
    420: "SOLOQ",
    440: "FLEX",
    400: "NORMAL",
    430: "NORMAL BLIND",
    450: "ARAM",
    490: "QUICKPLAY",
};
const DEFAULT_HERO_CHAMPION = "Yunara";
/* ─── shared styles ──────────────────────────────────────────────────── */
const glassDark = cn("relative overflow-hidden rounded-md", "bg-black/15 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]");
function GlowBackdrop({ subtle = false }) {
    const alpha = subtle ? 0.05 : 0.10;
    return (_jsx("div", { "aria-hidden": true, className: "absolute inset-0 pointer-events-none z-0", style: {
            background: `
          radial-gradient(ellipse 80% 50% at 30% 0%, rgba(0,217,146,${alpha}) 0%, transparent 65%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,184,255,${alpha * 0.5}) 0%, transparent 70%)
        `,
            filter: "blur(20px)",
        } }));
}
function profileIconUrl(iconId) {
    if (iconId == null)
        return null;
    return `${cdnBaseUrl()}/img/profileicon/${iconId}.png`;
}
/* ─── hero (Yunara splash + lobby title) ────────────────────────────── */
function LobbyHero({ lobby, refreshSlot, }) {
    const heroName = lobby.heroChampion || DEFAULT_HERO_CHAMPION;
    const splash = cdnSplashUrl(normalizeChampName(heroName));
    return (_jsxs("div", { 
        // Mobile: 320px so the splash actually shows (the -80px
        // negative top margin pulls the hero under the navbar, leaving
        // ~240px of splash visible below it — enough to read the lobby
        // name with breathing room). Desktop keeps the cinematic 420px.
        className: "relative w-screen left-1/2 -translate-x-1/2 h-[320px] sm:h-[420px] overflow-hidden mb-1 sm:mb-6", style: { marginTop: "-80px" /* navbar h-16 + content mt-4 — hero goes behind */ }, children: [_jsx("img", { src: splash, alt: "", className: "absolute inset-0 w-full h-full object-cover", style: { objectPosition: "center 20%" }, loading: "eager", decoding: "async", draggable: false }), _jsx("div", { className: "absolute inset-0 bg-liquirice/65" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-[0.04] z-[2]", style: {
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
                } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.85)_100%)]" }), _jsx("div", { className: "absolute top-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" }), _jsx("div", { className: "absolute inset-0 z-10 flex items-end justify-center pb-3 sm:pb-6", children: _jsxs("div", { className: "w-full max-w-[1280px] pl-8 pr-4 sm:px-4", children: [_jsxs("div", { className: "hidden sm:flex items-center gap-3 mb-2", children: [_jsx("span", { style: { color: JADE, fontSize: "12px" }, children: "\u25C8" }), _jsx("span", { className: "text-[11px] font-jetbrains tracking-[0.25em] uppercase text-jade/60", children: "Scout :: Lobby" }), _jsx("span", { className: "text-flash/30 text-[11px]", children: "\u00B7" }), _jsx("span", { className: "text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/50", children: lobby.slug })] }), _jsxs("div", { className: "flex items-end justify-between gap-4 flex-wrap", children: [_jsx("h1", { className: "text-[34px] sm:text-[60px] font-jetbrains font-medium text-flash tracking-tight leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]", children: lobby.name }), refreshSlot && (_jsx("div", { className: "shrink-0 pb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]", children: refreshSlot }))] })] }) })] }));
}
/* ─── locked (private lobby) body ───────────────────────────────────── */
function LockedLobbyBody() {
    return (_jsx("div", { className: "flex justify-center px-4 mt-10", children: _jsxs("div", { className: cn(glassDark, "relative w-full max-w-[680px] p-10 sm:p-14 text-center overflow-hidden"), children: [_jsx(GlowBackdrop, {}), _jsxs("div", { className: "relative z-10 flex flex-col items-center", children: [_jsx("div", { className: "w-20 h-20 rounded-full flex items-center justify-center mb-6", style: {
                                background: "radial-gradient(circle, rgba(0,217,146,0.14), transparent 70%)",
                                border: "1px solid color-mix(in srgb, #00d992 30%, transparent)",
                            }, children: _jsx(Lock, { className: "w-9 h-9 text-jade", style: { filter: "drop-shadow(0 0 10px rgba(0,217,146,0.5))" } }) }), _jsx("h2", { className: "text-[24px] sm:text-[30px] font-chakrapetch font-bold text-flash mb-2 tracking-tight", children: "This lobby is private" }), _jsx("p", { className: "text-[13px] sm:text-[14px] text-flash/55 font-geist leading-snug max-w-[440px] mb-1", children: "Only verified members of this lobby can view its matches, stats and activity." }), _jsx("p", { className: "text-[12px] text-flash/40 font-geist leading-snug max-w-[440px]", children: "If you belong here, claim your identity from an invite link an admin sent you \u2014 then this page unlocks automatically." }), _jsxs("div", { className: "mt-8 flex items-center gap-2 text-flash/25", children: [_jsx("span", { className: "h-px w-12 bg-gradient-to-r from-transparent to-flash/20" }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.3em] uppercase", children: "Private" }), _jsx("span", { className: "h-px w-12 bg-gradient-to-l from-transparent to-flash/20" })] })] })] }) }));
}
/* ─── day bucket helpers ─────────────────────────────────────────────── */
const MS_PER_DAY = 86_400_000;
function dayBucket(tsMs, now) {
    const a = new Date(now);
    a.setHours(0, 0, 0, 0);
    const b = new Date(tsMs);
    b.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
    if (diffDays === 0)
        return "TODAY";
    if (diffDays === 1)
        return "YESTERDAY";
    if (diffDays < 7)
        return `${diffDays} DAYS AGO`;
    if (diffDays < 30)
        return `${Math.floor(diffDays / 7)} WEEK${diffDays >= 14 ? "S" : ""} AGO`;
    return `${Math.floor(diffDays / 30)} MONTH${diffDays >= 60 ? "S" : ""} AGO`;
}
/* ─── section avatars — separate icons, active gets jade ring ────────── */
function SectionAvatars({ members, activePlayerId, accent, onSelect, }) {
    // De-dupe by player.id (one icon per lobby player, even if multi-account).
    const seen = new Set();
    const unique = members.filter((m) => {
        if (seen.has(m.player.id))
            return false;
        seen.add(m.player.id);
        return true;
    });
    const visible = unique.slice(0, 4);
    return (_jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [visible.map((m) => {
                const p = m.player;
                const iconUrl = profileIconUrl(p.iconId);
                const isActive = p.id === activePlayerId;
                const memberAccent = isActive ? JADE : p.color || accent;
                const borderColor = isActive
                    ? JADE
                    : `color-mix(in srgb, ${memberAccent} 35%, transparent)`;
                const ringShadow = isActive
                    ? `0 0 0 1.5px ${JADE}, 0 0 14px rgba(0,217,146,0.4)`
                    : "none";
                const opacity = isActive ? 1 : 0.6;
                const isClickable = !!onSelect && !isActive;
                const inner = iconUrl ? (_jsx("img", { src: iconUrl, alt: "", className: "w-9 h-9 rounded-full transition-all", style: {
                        border: `1.5px solid ${borderColor}`,
                        boxShadow: ringShadow,
                        opacity,
                    } })) : (_jsx("div", { className: "w-9 h-9 rounded-full flex items-center justify-center transition-all", style: {
                        background: "rgba(0,0,0,0.4)",
                        border: `1.5px solid ${borderColor}`,
                        boxShadow: ringShadow,
                        opacity,
                    }, children: _jsx("span", { className: "text-[14px] font-jetbrains font-bold", style: { color: memberAccent }, children: p.displayName.slice(0, 1).toUpperCase() }) }));
                if (isClickable) {
                    return (_jsx("button", { type: "button", onClick: () => onSelect(p.id), title: `View ${p.displayName}'s stats`, className: "cursor-clicker hover:scale-110 transition-transform", children: inner }, p.id));
                }
                return (_jsx("div", { title: p.displayName, className: onSelect ? "cursor-default" : undefined, children: inner }, p.id));
            }), unique.length > 4 && (_jsx("div", { className: "w-9 h-9 rounded-full flex items-center justify-center bg-black/40 border border-flash/15", children: _jsxs("span", { className: "text-[11px] font-jetbrains font-bold text-flash/60", children: ["+", unique.length - 4] }) }))] }));
}
/* ─── compact session stat pill ────────────────────────────────────────
 * Used in the group card header. Every pill is the same w×h so the row
 * stays as a clean grid. Optional sub text renders beneath the value
 * (e.g. K/D/A split under the KDA ratio).
 */
function SessionStatChip({ label, value, sub, tone, title, }) {
    const palette = tone === "good"
        ? {
            ring: "ring-jade/30",
            bg: "bg-jade/[0.06]",
            value: "text-jade",
            label: "text-jade/55",
            glow: "shadow-[0_0_10px_rgba(0,217,146,0.10)]",
        }
        : tone === "bad"
            ? {
                ring: "ring-[#d63336]/30",
                bg: "bg-[#d63336]/[0.06]",
                value: "text-[#d63336]",
                label: "text-[#d63336]/60",
                glow: "shadow-[0_0_10px_rgba(214,51,54,0.10)]",
            }
            : {
                // Glass-dark neutral — sits in the card without shouting.
                ring: "ring-flash/[0.08]",
                bg: "bg-black/25",
                value: "text-flash/80",
                label: "text-flash/35",
                glow: "shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
            };
    return (_jsxs("div", { title: title, className: cn(
        // Slim row-aligned chip — height 26px so it sits inline with
        // the 16px player name without bumping the title row taller.
        // Value + label render on a SINGLE horizontal line now (was
        // stacked) since the row height isn't tall enough for two
        // baselines. Width is auto-sized via px-2 so longer values
        // ("PERF", "100%") don't get truncated.
        "inline-flex items-center justify-center gap-1 h-[26px] px-2 rounded-[3px] ring-1 tabular-nums whitespace-nowrap", palette.ring, palette.bg, palette.glow), children: [_jsx("span", { className: cn("text-[11.5px] font-chakrapetch font-bold tracking-wide leading-none", palette.value), children: value }), _jsx("span", { className: cn("text-[7.5px] font-jetbrains tracking-[0.22em] uppercase leading-none", palette.label), children: sub ?? label })] }));
}
/* ─── rank-journey pill ────────────────────────────────────────────────
 * Visual recap of where the active member's account *started* this
 * session and where it is *now*. Two rank icons + abbreviated tier and
 * LP, separated by a soft arrow. Sits in the section header next to
 * the W/L / WR / LP / KDA stat chips.
 */
function SessionRankPill({ startRank, endRank, }) {
    const startShort = formatRankShortPill(startRank);
    const endShort = formatRankShortPill(endRank);
    const delta = ladderScoreFE(endRank) - ladderScoreFE(startRank);
    const positive = delta > 0;
    const negative = delta < 0;
    const endColor = positive
        ? "text-jade"
        : negative
            ? "text-[#d63336]"
            : "text-flash/80";
    return (_jsxs("div", { title: `Started ${startRank.tier} ${startRank.rankDivision ?? ""} ${startRank.lp}LP → Now ${endRank.tier} ${endRank.rankDivision ?? ""} ${endRank.lp}LP`, className: "inline-flex items-center gap-1.5 h-[26px] px-1.5 rounded-[3px] ring-1 ring-flash/[0.08] bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] whitespace-nowrap", children: [_jsx("img", { src: getRankImage(startRank.tier), alt: startRank.tier, className: "w-4 h-4 shrink-0 opacity-70" }), _jsx("span", { className: "text-[11px] font-chakrapetch font-bold tracking-wide text-flash/70 tabular-nums leading-none", children: startShort }), _jsxs("span", { className: "text-[8.5px] font-jetbrains tracking-[0.12em] uppercase text-flash/35 tabular-nums leading-none", children: [startRank.lp, "LP"] }), _jsx("span", { "aria-hidden": true, className: "text-flash/35 text-[9px] leading-none", children: "\u25B6" }), _jsx("img", { src: getRankImage(endRank.tier), alt: endRank.tier, className: "w-4 h-4 shrink-0" }), _jsx("span", { className: cn("text-[11px] font-chakrapetch font-bold tracking-wide tabular-nums leading-none", endColor), children: endShort }), _jsxs("span", { className: "text-[8.5px] font-jetbrains tracking-[0.12em] uppercase text-flash/55 tabular-nums leading-none", children: [endRank.lp, "LP"] })] }));
}
// Short rank label used inside the session pill — e.g. "E4", "D2",
// "MAS" / "GM" / "CHA" for the apex tiers (where division is null).
function formatRankShortPill(r) {
    const tier = r.tier.toUpperCase();
    if (tier === "MASTER")
        return "M";
    if (tier === "GRANDMASTER")
        return "GM";
    if (tier === "CHALLENGER")
        return "C";
    const tLetter = tier[0] ?? "?";
    const divNum = { IV: "4", III: "3", II: "2", I: "1" };
    const div = r.rankDivision ? divNum[r.rankDivision.toUpperCase()] ?? "" : "";
    return `${tLetter}${div}`;
}
/* ─── jump-to-match (from the Daily Bounty claim) ───────────────────── */
// Imperative, decoupled scroll-to-and-focus. Match cards are tagged with
// `data-scout-match="<matchId>"`. We dispatch a `scout:focus-match`
// event that any collapsed PlayerSectionCard containing the match listens
// for and opens, then poll the DOM until the card is actually visible and
// scroll it into view + run the 1s focus pulse. Polling absorbs the React
// work of switching to the Matches tab + expanding the group.
function focusScoutMatch(matchId) {
    if (!matchId)
        return;
    const fire = () => window.dispatchEvent(new CustomEvent("scout:focus-match", { detail: { matchId } }));
    fire();
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(matchId) : matchId;
    const sel = `[data-scout-match="${safe}"]`;
    let tries = 0;
    const maxTries = 50; // ~50 × 50ms ≈ 2.5s before giving up
    const run = () => {
        const el = document.querySelector(sel);
        if (el) {
            // Card is mounted. Fire once more so the (now-mounted) group
            // listener opens it, then let the 420ms expand animation settle
            // before scrolling + shining — a collapsed row is in the DOM but
            // clipped, so we can't reliably read "visible", we just wait it out.
            fire();
            window.setTimeout(() => {
                // Apply the shine to the card box only (overflow-hidden → the
                // glint is clipped to the card, never the comments panel below).
                const card = el.querySelector("[data-scout-card]") ?? el;
                card.scrollIntoView({ behavior: "smooth", block: "center" });
                card.classList.remove("scout-match-focus");
                void card.offsetWidth; // restart the glint cleanly if re-triggered
                card.classList.add("scout-match-focus");
                window.setTimeout(() => card.classList.remove("scout-match-focus"), 1400);
            }, 470);
            return;
        }
        if (tries++ < maxTries) {
            // Keep nudging groups that mount a beat late (after a tab switch).
            if (tries % 4 === 0)
                fire();
            window.setTimeout(run, 50);
        }
    };
    window.setTimeout(run, 60);
}
function PlayerSectionCardImpl({ members, matches, itemsByMatch, squadMatchIds, lobbyAccountByPuuid, lobbySlug, social, canLike, canComment, }) {
    const accent = members[0].player.color || JADE;
    // De-dupe by player.id and keep accounts grouped per player so the
    // header can show "Marco" once with their accounts inline.
    const uniquePlayers = [];
    const seenPlayer = new Set();
    for (const m of members) {
        if (seenPlayer.has(m.player.id))
            continue;
        seenPlayer.add(m.player.id);
        uniquePlayers.push(m);
    }
    const isSquad = uniquePlayers.length >= 2;
    // Expand/collapse state — show 1 match by default, "Show N more" CTA
    // beneath unfolds the rest. Sections with a single match never need
    // the toggle. Lets a user with 15 daily games not flood the feed.
    const [expanded, setExpanded] = useState(false);
    // Jump-to-match: when someone (the Daily Bounty card) requests focus on
    // a match that lives in this section but isn't the always-visible first
    // one, open the section so it can be scrolled into view + pulsed.
    useEffect(() => {
        const onFocus = (e) => {
            const id = e.detail?.matchId;
            if (!id)
                return;
            const idx = matches.findIndex((m) => m.matchId === id);
            if (idx > 0)
                setExpanded(true);
        };
        window.addEventListener("scout:focus-match", onFocus);
        return () => window.removeEventListener("scout:focus-match", onFocus);
    }, [matches]);
    // Section outcome — drives the left border color.
    // Tie counts as a win-leaning result, so 50% winrate keeps the jade
    // bar. Only <50% (strictly more losses than wins) goes red.
    const sectionWins = matches.reduce((n, m) => n + (m.participant.win ? 1 : 0), 0);
    const sectionLosses = matches.length - sectionWins;
    const winLossAccent = matches.length === 0
        ? accent
        : sectionLosses > sectionWins
            ? "#d63336"
            : JADE;
    // Active member is user-selectable in squad sections. Default = first.
    const [activePlayerId, setActivePlayerId] = useState(uniquePlayers[0].player.id);
    // Reset if section composition changes (e.g. after edit).
    useEffect(() => {
        if (!uniquePlayers.find((m) => m.player.id === activePlayerId)) {
            setActivePlayerId(uniquePlayers[0].player.id);
        }
    }, [uniquePlayers, activePlayerId]);
    // Session aggregates for the header chip row. Only the active player's
    // matches contribute — switching squad members updates the numbers.
    // Backend now emits a real ladderScore-based lpDelta even for promo /
    // demote games, so the total here is exact.
    const sessionStats = useMemo(() => {
        let kills = 0;
        let deaths = 0;
        let assists = 0;
        let lpTotal = 0;
        let lpCounted = 0;
        for (const it of matches) {
            const matchItems = itemsByMatch.get(it.matchId) ?? [it];
            const myItem = matchItems.find((x) => x.ownerPlayerId === activePlayerId) ?? it;
            const p = myItem.participant;
            kills += p.kills;
            deaths += p.deaths;
            assists += p.assists;
            if (typeof p.lpDelta === "number") {
                lpTotal += p.lpDelta;
                lpCounted++;
            }
        }
        const kdaRatio = deaths === 0
            ? kills + assists > 0
                ? Infinity
                : 0
            : (kills + assists) / deaths;
        const total = sectionWins + sectionLosses;
        const winrate = total > 0 ? Math.round((sectionWins / total) * 100) : 0;
        return {
            kills,
            deaths,
            assists,
            kdaRatio,
            lpTotal,
            lpCounted,
            winrate,
        };
    }, [matches, itemsByMatch, activePlayerId, sectionWins, sectionLosses]);
    return (_jsxs("div", { className: "relative overflow-hidden rounded-md bg-flash/[0.013] backdrop-blur-xl saturate-150 ring-1 ring-flash/[0.08] shadow-[0_18px_44px_-12px_rgba(0,0,0,0.8),0_4px_14px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.045)]", children: [_jsx("div", { "aria-hidden": true, className: "absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-flash/25 to-transparent pointer-events-none z-[1]" }), _jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[3px] z-[1]", style: {
                    background: `color-mix(in srgb, ${winLossAccent} 75%, transparent)`,
                    boxShadow: `0 0 8px color-mix(in srgb, ${winLossAccent} 35%, transparent)`,
                } }), _jsxs("div", { className: "relative z-[2] flex items-center gap-3 px-4 py-3 border-b border-flash/[0.06]", children: [_jsx(SectionAvatars, { members: uniquePlayers, activePlayerId: activePlayerId, accent: accent, onSelect: isSquad ? setActivePlayerId : undefined }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 gap-y-1.5 w-full flex-wrap", children: [uniquePlayers.map((m, i) => {
                                        const isActive = m.player.id === activePlayerId;
                                        const showBadge = !!m.player.showVerifyBadge &&
                                            (m.player.verifyGrade ?? 0) >= 1;
                                        const NameSpan = (_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsx("span", { className: cn("text-[16px] font-chakrapetch font-semibold leading-none truncate tracking-wide", isActive ? "text-jade" : "text-flash/80"), style: isActive
                                                        ? { textShadow: "0 0 14px rgba(0,217,146,0.45)" }
                                                        : undefined, children: m.player.displayName }), showBadge && (_jsx(VerifyBadge, { grade: m.player.verifyGrade === 2 ? 2 : 1, size: 13 }))] }));
                                        return (_jsxs("span", { className: "flex items-center gap-1.5", children: [i > 0 && (_jsx("span", { className: "text-flash/25 text-[14px]", children: "&" })), isSquad && !isActive ? (_jsx("button", { type: "button", onClick: () => setActivePlayerId(m.player.id), className: "hover:opacity-80 transition-opacity cursor-clicker", children: NameSpan })) : (NameSpan)] }, m.player.id));
                                    }), isSquad && (_jsxs("span", { 
                                        // Hidden on mobile — the DUO/TRIO label was eating row
                                        // space without adding much info, and the names "&"-
                                        // joined already convey the squad relationship.
                                        className: "hidden sm:flex text-[9px] font-jetbrains font-medium tracking-[0.2em] uppercase px-1.5 py-[2px] rounded-[2px] items-center gap-1", style: {
                                            color: JADE,
                                            background: "rgba(0,217,146,0.10)",
                                            border: "1px solid color-mix(in srgb, #00d992 30%, transparent)",
                                        }, children: [_jsx(Users, { className: "w-2.5 h-2.5" }), squadLabel(uniquePlayers.length)] })), _jsxs("div", { className: "hidden sm:flex ml-auto items-center gap-1.5 shrink-0", children: [(() => {
                                                const activeMember = uniquePlayers.find((m) => m.player.id === activePlayerId);
                                                const currentRank = activeMember?.account?.currentRank ?? null;
                                                if (!currentRank || sessionStats.lpCounted === 0)
                                                    return null;
                                                const endScore = ladderScoreFE(currentRank);
                                                const startRank = rankFromLadderScoreFE(endScore - sessionStats.lpTotal);
                                                if (!startRank)
                                                    return null;
                                                return (_jsx(SessionRankPill, { startRank: startRank, endRank: currentRank }));
                                            })(), _jsx(SessionStatChip, { label: "W/L", value: `${sectionWins}-${sectionLosses}`, tone: "neutral" }), _jsx(SessionStatChip, { label: "WR", value: `${sessionStats.winrate}%`, tone: sessionStats.winrate >= 60
                                                    ? "good"
                                                    : sessionStats.winrate >= 50
                                                        ? "neutral"
                                                        : "bad" }), _jsx(SessionStatChip, { label: "LP", value: sessionStats.lpCounted === 0
                                                    ? "—"
                                                    : `${sessionStats.lpTotal > 0 ? "+" : ""}${sessionStats.lpTotal}`, tone: sessionStats.lpTotal > 0
                                                    ? "good"
                                                    : sessionStats.lpTotal < 0
                                                        ? "bad"
                                                        : "neutral" })] })] }), _jsx("div", { className: "text-[11px] font-jetbrains tracking-[0.1em] text-flash/55 mt-1 truncate", children: members.map((m, i) => (_jsxs("span", { children: [i > 0 && _jsx("span", { className: "text-flash/25", children: " + " }), m.account ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-jade/60 mr-1 tracking-[0.18em] uppercase text-[10px]", children: m.account.region }), m.account.riotName, _jsxs("span", { className: "text-flash/30", children: ["#", m.account.riotTag] })] })) : (_jsx("span", { className: "text-flash/40", children: m.player.displayName }))] }, `${m.player.id}:${m.account?.id ?? i}`))) })] })] }), _jsx("ul", { className: "relative z-[2] flex flex-col gap-3 px-3 pt-3 pb-0", children: renderMatchRow(matches[0], 0) }), matches.length > 1 && (_jsx("div", { className: cn("relative z-[2] grid overflow-hidden transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]", expanded
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"), children: _jsx("ul", { className: "flex flex-col gap-3 px-3 pt-3 pb-0 overflow-hidden", children: matches.slice(1).map((m, i) => renderMatchRow(m, i + 1)) }) })), matches.length > 1 && (_jsx("button", { type: "button", onClick: () => setExpanded((v) => !v), "aria-expanded": expanded, className: "group/showmore relative z-[20] w-full -mt-3 pt-0 pb-1.5 cursor-clicker", children: _jsxs("span", { className: "relative inline-flex items-center justify-center gap-2.5 w-full", children: [_jsx("span", { "aria-hidden": true, className: "h-[1px] w-10 bg-gradient-to-r from-transparent to-jade/25 group-hover/showmore:to-jade/65 transition-colors duration-300" }), _jsxs("span", { className: "inline-flex items-center gap-1.5 text-jade/55 group-hover/showmore:text-jade transition-colors duration-300", children: [_jsx("span", { "aria-hidden": true, className: cn("text-[9px] leading-none transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]", expanded ? "rotate-180" : "rotate-0"), style: {
                                        textShadow: "0 0 5px color-mix(in srgb, #00d992 35%, transparent)",
                                    }, children: "\u25BE" }), _jsx("span", { className: "text-[9px] font-chakrapetch font-bold tracking-[0.26em] uppercase", style: {
                                        textShadow: "0 0 6px color-mix(in srgb, #00d992 22%, transparent)",
                                    }, children: expanded
                                        ? "Collapse"
                                        : `Show ${matches.length - 1} more ${matches.length - 1 === 1 ? "match" : "matches"}` }), _jsx("span", { "aria-hidden": true, className: cn("text-[9px] leading-none transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]", expanded ? "rotate-180" : "rotate-0"), style: {
                                        textShadow: "0 0 5px color-mix(in srgb, #00d992 35%, transparent)",
                                    }, children: "\u25BE" })] }), _jsx("span", { "aria-hidden": true, className: "h-[1px] w-10 bg-gradient-to-l from-transparent to-jade/25 group-hover/showmore:to-jade/65 transition-colors duration-300" })] }) }))] }));
    // Local renderer — same closure scope as the component so it can use
    // activePlayerId / itemsByMatch / lobbyAccountByPuuid / etc directly.
    function renderMatchRow(repItem, _idx) {
        const matchItems = itemsByMatch.get(repItem.matchId) ?? [repItem];
        const item = matchItems.find((x) => x.ownerPlayerId === activePlayerId) ?? repItem;
        const card = {
            matchId: item.matchId,
            queueLabel: QUEUE_LABELS[item.queueId ?? -1] ?? `QUEUE ${item.queueId ?? "?"}`,
            win: item.participant.win,
            isRemake: (item.gameDurationSeconds ?? 0) < 300,
            gameDurationSeconds: item.gameDurationSeconds ?? 0,
            gameCreationMs: new Date(item.gameCreation).getTime(),
            championName: item.participant.championName ?? "Aatrox",
            championLevel: null,
            keystoneId: item.participant.perkKeystone,
            secondaryStyleId: item.participant.perkSubStyle,
            kills: item.participant.kills,
            deaths: item.participant.deaths,
            assists: item.participant.assists,
            cs: item.participant.cs ?? null,
            role: item.participant.role ?? null,
            gold: item.participant.goldEarned ?? null,
            items: item.participant.items,
            allParticipants: item.allParticipants,
            highlightPuuid: item.participant.puuid,
            lobbyMatePuuids: (item.lobbyAccountPuuidsInMatch ??
                item.lobbyPlayers.map((lp) => lp.accountPuuid)).filter((p) => p !== item.participant.puuid),
            lobbyAccountByPuuid,
            lpDelta: item.participant.lpDelta ?? null,
            rankChange: item.participant.rankChange ?? null,
            rankAfter: item.participant.rankAfter ?? null,
            // The lobby-account map carries short-form region per puuid (set by
            // the lobby endpoint). Falls back to EUW when the participant isn't
            // a lobby account (shouldn't happen for our own row, but defensive).
            region: lobbyAccountByPuuid[item.participant.puuid]?.region ?? "EUW",
            // Aegis-of-Valor (double-LP) heuristic: a normal ranked win caps
            // around 25-30 LP, even with promo bonuses. A delta of 35+ on a
            // win basically can't happen without the 2x modifier, so flag it
            // so the MatchCard renders the Aegis watermark backdrop. Losses
            // are ignored — the cosmetic doubles LP gain, not loss.
            //
            // TODO: when Riot exposes a per-match double-LP flag in match-v5,
            // swap this heuristic for the canonical field.
            hasDoubleLp: item.participant.win &&
                typeof item.participant.lpDelta === "number" &&
                item.participant.lpDelta >= 35,
            social: {
                lobbySlug,
                likeCount: social.counts[item.matchId]?.likes ?? 0,
                commentCount: social.counts[item.matchId]?.comments ?? 0,
                iLiked: social.myLikes.has(item.matchId),
                likers: social.likers[item.matchId] ?? [],
                canLike,
                canComment,
                onLikeChanged: (next) => social.setLike(item.matchId, next),
                onCommentPosted: () => social.bumpComment(item.matchId, 1),
            },
        };
        const showPerMatchSquadBadge = !isSquad && squadMatchIds.has(item.matchId);
        return (_jsx("div", { children: _jsxs("div", { className: "relative", "data-scout-match": item.matchId, style: {
                    // Shine colour for the jump-to-match focus glint: jade on a
                    // win, red on a loss. Consumed by .scout-match-focus::after.
                    ["--scout-shine"]: card.win
                        ? "0, 217, 146"
                        : "214, 51, 54",
                }, children: [_jsx(MatchCard, { data: card }), showPerMatchSquadBadge && (_jsxs("div", { className: "absolute top-2 right-12 z-20 flex items-center gap-1 text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium px-1.5 py-[2px] rounded-[2px]", style: {
                            color: JADE,
                            background: "rgba(0,217,146,0.10)",
                            border: "1px solid color-mix(in srgb, #00d992 30%, transparent)",
                        }, children: [_jsx(Users, { className: "w-2.5 h-2.5" }), squadLabel(item.lobbyPlayers.length)] }))] }) }, item.rowId));
    }
}
// Memoised: a section only re-renders when ITS props change. With the
// social object now stable (memoised in useMatchSocialBatch) and the
// section data coming from the dayGroups memo, unrelated parent renders
// (filter UI, scroll observer, …) no longer cascade into every section.
const PlayerSectionCard = memo(PlayerSectionCardImpl);
function squadLabel(n) {
    if (n === 2)
        return "DUO";
    if (n === 3)
        return "TRIO";
    if (n === 4)
        return "QUAD";
    return "5-STACK";
}
/* ─── rank display helpers ─────────────────────────────────────────── */
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
function formatRankShort(r) {
    const tier = r.tier.toUpperCase();
    if (APEX_TIERS.has(tier))
        return `${tier.slice(0, 3)} ${r.lp} LP`;
    return `${tier.slice(0, 3)} ${r.rankDivision ?? "?"} · ${r.lp} LP`;
}
function rankColorClass(tier) {
    const t = tier.toUpperCase();
    switch (t) {
        case "IRON":
            return "text-[#7d6b5d]";
        case "BRONZE":
            return "text-[#cd7f32]";
        case "SILVER":
            return "text-[#c0c0c0]";
        case "GOLD":
            return "text-[#ffb615]";
        case "PLATINUM":
            return "text-[#6cd0c2]";
        case "EMERALD":
            return "text-[#10b981]";
        case "DIAMOND":
            return "text-[#5fa8ff]";
        case "MASTER":
            return "text-[#c084fc]";
        case "GRANDMASTER":
            return "text-[#ef4444]";
        case "CHALLENGER":
            return "text-[#00d992]";
        default:
            return "text-flash/60";
    }
}
function PlayerFilterBar({ lobby, filterMode, onFilterChange, countByPlayer, mainOnly, onToggleMainOnly, }) {
    const players = [...lobby.players].sort((a, b) => a.orderIndex - b.orderIndex);
    const totalMatches = Array.from(countByPlayer.values()).reduce((n, v) => n + v, 0);
    // Drag-and-drop state. When the user is dragging a player chip, we
    // remember its ID so the drop target can build a duo from (dragged, dropped).
    // hoveredDropId is the chip currently being hovered over — used to draw a
    // brighter ring + scale on it so the affordance is obvious.
    const [draggingId, setDraggingId] = useState(null);
    const [hoveredDropId, setHoveredDropId] = useState(null);
    const isActive = (pid) => {
        if (filterMode.kind === "single")
            return filterMode.id === pid;
        if (filterMode.kind === "duo")
            return filterMode.ids.includes(pid);
        return false;
    };
    const handlePlayerClick = (pid) => {
        // Click toggles single mode; in duo mode, clicking a member exits the duo
        // and lands on single(otherMember) — easier than chaining "All → single".
        if (filterMode.kind === "single" && filterMode.id === pid) {
            onFilterChange({ kind: "all" });
            return;
        }
        if (filterMode.kind === "duo") {
            const other = filterMode.ids.find((x) => x !== pid);
            if (other && pid !== other) {
                onFilterChange({ kind: "single", id: other });
                return;
            }
        }
        onFilterChange({ kind: "single", id: pid });
    };
    const handleDrop = (targetId) => {
        if (!draggingId || draggingId === targetId)
            return;
        onFilterChange({ kind: "duo", ids: [draggingId, targetId] });
    };
    // Currently-selected player id in single mode — drives the mobile
    // <select>'s value. "all" stands for the "no filter" option; duo
    // mode is desktop-only (you need drag-and-drop to form one), so the
    // select falls back to "all" while a duo is active.
    const mobileSelectValue = filterMode.kind === "single"
        ? filterMode.id
        : "all";
    // Per-click rotation accumulator for the mobile Main toggle. Each
    // tap adds a full 360° turn so the icon spins fluidly — both on
    // the activate AND deactivate transition — instead of snapping
    // back. Using cumulative degrees (not toggling between 0/360)
    // means consecutive taps don't reverse-spin.
    const [mainRotation, setMainRotation] = useState(0);
    return (_jsxs("div", { className: cn(
        // Desktop keeps the dark glass card wrapper; mobile drops the
        // box entirely so the <select> + Main button float on the
        // page like a row of inputs (matches mobile-app conventions
        // better than a "card inside a card"). All the glass styling
        // is gated behind sm: so it only applies from tablet up.
        "h-12 flex items-center", "sm:px-3 sm:relative sm:overflow-hidden sm:rounded-md sm:bg-black/15 sm:backdrop-blur-lg sm:saturate-150 sm:shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"), children: [_jsx("div", { className: "hidden sm:block absolute inset-0 pointer-events-none", children: _jsx(GlowBackdrop, { subtle: true }) }), _jsxs("div", { className: "relative z-[1] flex sm:hidden items-center gap-2 w-full", children: [_jsxs("label", { className: "relative flex-1 min-w-0", children: [_jsxs("select", { value: mobileSelectValue, onChange: (e) => {
                                    const v = e.target.value;
                                    if (v === "all")
                                        onFilterChange({ kind: "all" });
                                    else
                                        onFilterChange({ kind: "single", id: v });
                                }, className: "w-full appearance-none bg-black/55 backdrop-blur-md ring-1 ring-flash/15 rounded-md pl-4 pr-9 py-2.5 text-[13px] font-chakrapetch font-bold tracking-[0.16em] uppercase text-flash/90 cursor-clicker focus:outline-none focus:ring-2 focus:ring-jade/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_3px_14px_rgba(0,0,0,0.35)]", children: [_jsxs("option", { value: "all", children: ["All players \u00B7 ", totalMatches] }), players.map((p) => (_jsxs("option", { value: p.id, children: [p.displayName, " \u00B7 ", countByPlayer.get(p.id) ?? 0] }, p.id)))] }), _jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-jade/55 text-[10px]", children: "\u25BC" })] }), _jsx("button", { type: "button", role: "checkbox", "aria-checked": mainOnly, onClick: () => {
                            // Tap → flip the underlying state AND add a full 360° to
                            // the rotation accumulator. Cumulative degrees keep the
                            // spin going in the same direction every tap (no jarring
                            // reverse-spin on the deactivate transition). The bouncy
                            // cubic-bezier easing makes it feel snappy without being
                            // cartoonish.
                            onToggleMainOnly();
                            setMainRotation((r) => r + 360);
                        }, title: "Show only matches played on each player's primary account", className: cn("shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md cursor-clicker", mainOnly
                            ? "bg-jade/[0.18] ring-1 ring-jade/65 text-jade shadow-[0_0_18px_rgba(0,217,146,0.30)]"
                            : "bg-black/55 ring-1 ring-flash/15 text-flash/45 hover:text-flash/75 backdrop-blur-md"), style: {
                            transform: `rotate(${mainRotation}deg)`,
                            transition: "transform 520ms cubic-bezier(0.34,1.56,0.64,1), background-color 220ms ease, box-shadow 220ms ease, color 220ms ease",
                        }, children: mainOnly ? (_jsx(Check, { className: "w-4 h-4", strokeWidth: 3 })) : (_jsx("span", { className: "text-[11px] font-chakrapetch font-bold tracking-wide", children: "M" })) })] }), _jsxs("div", { className: "relative z-[1] hidden sm:flex items-center gap-3 w-full h-full", children: [_jsxs("div", { className: "flex items-center gap-4 overflow-x-auto scrollbar-hide flex-1 min-w-0 h-full", children: [_jsx(PlayerFilterTab, { active: filterMode.kind === "all", accent: JADE, onClick: () => onFilterChange({ kind: "all" }), icon: _jsx(Users, { className: "w-3.5 h-3.5" }), label: "All", count: totalMatches }), players.map((p, idx) => {
                                const accent = p.color || JADE;
                                const count = countByPlayer.get(p.id) ?? 0;
                                const inDuo = filterMode.kind === "duo" && filterMode.ids.includes(p.id);
                                // Show a "×" separator before this chip iff it's the second
                                // member of an active duo — so the duo reads "Marco × Isac".
                                const showDuoSep = inDuo &&
                                    filterMode.kind === "duo" &&
                                    filterMode.ids[1] === p.id &&
                                    idx > 0;
                                return (_jsxs(React.Fragment, { children: [showDuoSep && (_jsx("span", { className: "text-flash/45 text-[14px] font-jetbrains -mx-2 select-none", "aria-hidden": true, children: "\u00D7" })), _jsx(PlayerFilterTab, { active: isActive(p.id), accent: accent, onClick: () => handlePlayerClick(p.id), draggable: true, onDragStart: (e) => {
                                                e.dataTransfer.setData("text/plain", p.id);
                                                e.dataTransfer.effectAllowed = "link";
                                                setDraggingId(p.id);
                                            }, onDragEnd: () => {
                                                setDraggingId(null);
                                                setHoveredDropId(null);
                                            }, onDragOver: (e) => {
                                                if (!draggingId || draggingId === p.id)
                                                    return;
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = "link";
                                                if (hoveredDropId !== p.id)
                                                    setHoveredDropId(p.id);
                                            }, onDragLeave: () => {
                                                if (hoveredDropId === p.id)
                                                    setHoveredDropId(null);
                                            }, onDrop: (e) => {
                                                e.preventDefault();
                                                const draggedId = e.dataTransfer.getData("text/plain") || draggingId || "";
                                                if (draggedId && draggedId !== p.id) {
                                                    onFilterChange({ kind: "duo", ids: [draggedId, p.id] });
                                                }
                                                setDraggingId(null);
                                                setHoveredDropId(null);
                                            }, isDropTarget: hoveredDropId === p.id, isDragging: draggingId === p.id, icon: profileIconUrl(p.iconId) ? (_jsx("img", { src: profileIconUrl(p.iconId), alt: "", className: "w-[18px] h-[18px] rounded-full pointer-events-none", style: {
                                                    border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                                                } })) : (_jsx("span", { className: "w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-jetbrains font-bold pointer-events-none", style: {
                                                    background: "rgba(0,0,0,0.4)",
                                                    border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                                                    color: accent,
                                                }, children: p.displayName.slice(0, 1).toUpperCase() })), label: p.displayName, count: count })] }, p.id));
                            })] }), filterMode.kind === "duo" && (_jsx("button", { type: "button", onClick: () => onFilterChange({ kind: "all" }), title: "Clear duo filter", className: "shrink-0 px-2 py-1 rounded-sm text-[9px] font-jetbrains uppercase tracking-[0.18em] text-jade ring-1 ring-jade/30 bg-jade/10 hover:bg-jade/20 cursor-clicker", children: "Duo \u2715" })), _jsx("div", { className: "h-6 w-[1px] bg-flash/10 shrink-0" }), _jsxs("button", { type: "button", role: "checkbox", "aria-checked": mainOnly, onClick: onToggleMainOnly, title: "Show only matches played on each player's primary account", className: cn("shrink-0 inline-flex items-center gap-2 px-2 py-1 rounded-[3px] cursor-clicker transition-all duration-200 font-jetbrains tracking-[0.18em] uppercase text-[10px] font-medium", mainOnly
                            ? "text-jade"
                            : "text-flash/45 hover:text-flash/75"), children: [_jsx("span", { className: cn("w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center transition-colors", mainOnly
                                    ? "bg-jade border-jade"
                                    : "bg-transparent border-flash/30"), children: mainOnly && _jsx(Check, { className: "w-2.5 h-2.5 text-liquirice", strokeWidth: 3 }) }), _jsx("span", { className: "hidden sm:inline", children: "Main only" })] })] })] }));
}
/* Tab-style filter item — no surrounding chip, just icon + label + tiny
 * count. Active state is signalled by an accent underline + jade text.
 * Quieter and more "navigation-like" than the old boxed chip approach.
 * Also handles its own drag-and-drop affordances so the user can build a
 * duo filter by dragging one chip onto another. */
function PlayerFilterTab({ active, accent, onClick, icon, label, count, draggable, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, isDropTarget, isDragging, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, draggable: draggable, onDragStart: onDragStart, onDragEnd: onDragEnd, onDragOver: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop, className: cn("group relative inline-flex items-center gap-2 shrink-0 cursor-clicker pb-1.5 -mb-1.5 transition-all duration-150 rounded-sm", draggable && "active:cursor-grabbing", isDragging && "opacity-50", isDropTarget && "scale-110 -translate-y-px"), style: isDropTarget
            ? {
                boxShadow: `0 0 0 2px color-mix(in srgb, ${accent} 70%, transparent), 0 0 14px color-mix(in srgb, ${accent} 55%, transparent)`,
                padding: "4px 8px",
                marginLeft: "-8px",
                marginRight: "-8px",
            }
            : undefined, children: [_jsx("span", { className: "flex items-center justify-center", children: icon }), _jsx("span", { className: cn("text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium transition-colors duration-150", active
                    ? "text-flash/90"
                    : "text-flash/50 group-hover:text-flash/80"), style: active ? { color: accent } : undefined, children: label }), _jsx("span", { className: cn("text-[9px] font-jetbrains tabular-nums tracking-wider transition-colors duration-150", active ? "opacity-70" : "text-flash/30"), style: active ? { color: accent } : undefined, children: count }), _jsx("span", { "aria-hidden": true, className: cn("pointer-events-none absolute left-0 right-0 -bottom-0.5 h-[1.5px] rounded-full transition-all duration-200", active ? "opacity-100" : "opacity-0"), style: {
                    background: accent,
                    boxShadow: `0 0 8px color-mix(in srgb, ${accent} 60%, transparent)`,
                } })] }));
}
function useMatchSocialBatch(slug, matchIds, refreshTick) {
    const [counts, setCounts] = useState({});
    const [likers, setLikers] = useState({});
    const [myLikes, setMyLikes] = useState(new Set());
    // Stable key for the matchIds set so the effect doesn't loop when
    // the array identity changes but contents don't.
    const idsKey = useMemo(() => [...matchIds].sort().join(","), [matchIds]);
    // Track which match ids we've already fetched social for, plus the last
    // refresh/slug we saw — so an infinite-scroll append only fetches the
    // NEW ids and merges them, instead of re-fetching the whole growing set
    // on every page (which was O(n²) querystrings AND blew past the backend's
    // 100-id cap once the feed got long).
    const fetchedRef = useRef(new Set());
    const lastRefreshRef = useRef(refreshTick);
    const lastSlugRef = useRef(slug);
    useEffect(() => {
        if (!idsKey)
            return;
        const ids = idsKey.split(",").filter(Boolean);
        if (ids.length === 0)
            return;
        // A bumped refreshTick (or a new lobby) means server counts may have
        // changed → re-fetch everything and replace. A pure idsKey change is
        // a scroll append → fetch only the unseen ids and merge.
        const isRefresh = refreshTick !== lastRefreshRef.current;
        const isSlugChange = slug !== lastSlugRef.current;
        lastRefreshRef.current = refreshTick;
        lastSlugRef.current = slug;
        if (isSlugChange)
            fetchedRef.current = new Set();
        const replace = isRefresh || isSlugChange;
        const toFetch = replace
            ? ids
            : ids.filter((id) => !fetchedRef.current.has(id));
        if (toFetch.length === 0)
            return;
        let cancelled = false;
        (async () => {
            const { data: { session }, } = await supabase.auth.getSession();
            const auth = session?.access_token
                ? { headers: { Authorization: `Bearer ${session.access_token}` } }
                : undefined;
            // The endpoint caps `ids` at 100 — chunk defensively (a single
            // scroll page is far smaller, so this rarely loops).
            const CHUNK = 100;
            for (let i = 0; i < toFetch.length; i += CHUNK) {
                const chunk = toFetch.slice(i, i + CHUNK);
                const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${slug}/match-social?ids=${encodeURIComponent(chunk.join(","))}`, auth);
                if (!res.ok || cancelled)
                    return;
                const data = await res.json();
                if (cancelled)
                    return;
                const fresh = replace && i === 0; // first chunk of a full refresh clears
                setCounts((prev) => fresh ? data.counts ?? {} : { ...prev, ...(data.counts ?? {}) });
                setLikers((prev) => fresh ? data.likers ?? {} : { ...prev, ...(data.likers ?? {}) });
                setMyLikes((prev) => {
                    const next = fresh ? new Set() : new Set(prev);
                    for (const id of (data.myLikes ?? []))
                        next.add(id);
                    return next;
                });
                for (const id of chunk)
                    fetchedRef.current.add(id);
            }
        })().catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [slug, idsKey, refreshTick]);
    // Local mutators so optimistic updates (after a like or comment)
    // propagate without re-fetching the whole batch.
    const bumpComment = useCallback((matchId, delta = 1) => {
        setCounts((prev) => ({
            ...prev,
            [matchId]: {
                likes: prev[matchId]?.likes ?? 0,
                comments: (prev[matchId]?.comments ?? 0) + delta,
            },
        }));
    }, []);
    const setLike = useCallback((matchId, next) => {
        setCounts((prev) => ({
            ...prev,
            [matchId]: {
                comments: prev[matchId]?.comments ?? 0,
                likes: next.likeCount,
            },
        }));
        setMyLikes((prev) => {
            const s = new Set(prev);
            next.iLiked ? s.add(matchId) : s.delete(matchId);
            return s;
        });
    }, []);
    // Memoise the returned object so its identity only changes when the
    // actual social data does — that's what lets the (memoised)
    // PlayerSectionCards skip re-rendering on unrelated parent renders.
    return useMemo(() => ({ counts, likers, myLikes, bumpComment, setLike }), [counts, likers, myLikes, bumpComment, setLike]);
}
function MatchesTab({ items, lobby, hasMore, loadingMore, loadMore, }) {
    // Sentinel attaches AFTER this component mounts, so the observer effect
    // must live here (not in the parent) — otherwise it runs while
    // sentinelRef.current is still null and never re-runs.
    const sentinelRef = useRef(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el)
            return;
        const obs = new IntersectionObserver((entries) => {
            if (entries[0]?.isIntersecting)
                loadMore();
        }, { rootMargin: "300px" });
        obs.observe(el);
        return () => obs.disconnect();
    }, [loadMore, items.length, hasMore]);
    // Social: batch-fetch per-match likes + comment counts. The signed-in
    // user (if any) decides whether we send the auth header so the
    // backend can also return their personal `myLikes` list.
    const { session } = useAuth();
    const myProfileId = session?.user?.id ?? null;
    const myClaimedPlayer = useMemo(() => lobby.players.find((p) => p.claimedByProfileId === myProfileId) ?? null, [lobby.players, myProfileId]);
    const canLike = !!myProfileId;
    // Commenting requires a claimed (certified) identity in this lobby —
    // always. No anonymous comments, regardless of verify_mode. The
    // backend enforces the same rule.
    const canComment = !!myClaimedPlayer;
    const matchIdsForSocial = useMemo(() => Array.from(new Set(items.map((i) => i.matchId))), [items]);
    const social = useMatchSocialBatch(lobby.slug, matchIdsForSocial, items.length);
    const [filterMode, setFilterMode] = useState({ kind: "all" });
    // When enabled, only matches played on each player's primary account are shown.
    const [mainOnly, setMainOnly] = useState(false);
    const playerById = useMemo(() => {
        const map = new Map();
        for (const p of lobby.players)
            map.set(p.id, p);
        return map;
    }, [lobby]);
    // Set of primary-account puuids — used by the "Main only" filter.
    const primaryPuuids = useMemo(() => {
        const set = new Set();
        for (const p of lobby.players) {
            const primary = p.accounts.find((a) => a.isPrimary) ?? p.accounts[0];
            if (primary)
                set.add(primary.puuid);
        }
        return set;
    }, [lobby]);
    // Per-player match count for the chip badges. Respects `mainOnly` so the
    // chip number always reflects what would actually render.
    const matchCountByPlayer = useMemo(() => {
        const counts = new Map();
        const seenByPlayer = new Map();
        for (const it of items) {
            if (mainOnly && !primaryPuuids.has(it.participant.puuid))
                continue;
            if (!seenByPlayer.has(it.ownerPlayerId)) {
                seenByPlayer.set(it.ownerPlayerId, new Set());
            }
            const set = seenByPlayer.get(it.ownerPlayerId);
            if (set.has(it.matchId))
                continue;
            set.add(it.matchId);
            counts.set(it.ownerPlayerId, (counts.get(it.ownerPlayerId) ?? 0) + 1);
        }
        return counts;
    }, [items, mainOnly, primaryPuuids]);
    // Apply both filters BEFORE the grouping — squad signatures stay correct
    // because they're derived from each item's lobbyPlayers (not the filtered
    // set), so e.g. Marco's "Marco & Luca" matches still render as squads.
    //
    // Duo mode: we want only matches where BOTH players were on the same team
    // in the same game. We dedupe by keeping only the row owned by player A
    // (the first of the pair) — otherwise the same match would render twice,
    // once for each player.
    const filteredItems = useMemo(() => {
        return items.filter((it) => {
            if (mainOnly && !primaryPuuids.has(it.participant.puuid))
                return false;
            if (filterMode.kind === "single" && it.ownerPlayerId !== filterMode.id)
                return false;
            if (filterMode.kind === "duo") {
                const [a, b] = filterMode.ids;
                // Keep only one row per match
                if (it.ownerPlayerId !== a)
                    return false;
                // Are A and B actually on the same team in this game?
                const myParticipant = it.allParticipants.find((p) => p.puuid === it.participant.puuid);
                if (!myParticipant)
                    return false;
                const myTeamId = myParticipant.teamId;
                if (myTeamId == null)
                    return false;
                let bIsTeammate = false;
                for (const lp of it.lobbyPlayers) {
                    if (lp.playerId !== b)
                        continue;
                    const otherPart = it.allParticipants.find((p) => p.puuid === lp.accountPuuid);
                    if (otherPart?.teamId === myTeamId) {
                        bIsTeammate = true;
                        break;
                    }
                }
                if (!bIsTeammate)
                    return false;
            }
            return true;
        });
    }, [items, filterMode, mainOnly, primaryPuuids]);
    // puuid → riot account info (name / tag / region). Used by the scoreboard
    // to build summoner links even for matches ingested before riot_id_tagline
    // existed in DB.
    const lobbyAccountByPuuid = useMemo(() => {
        const map = {};
        for (const p of lobby.players) {
            for (const a of p.accounts) {
                // Verify info is per-player (per-human identity), but we
                // attach it to every account so the scoreboard can render
                // the badge regardless of which Riot account played.
                map[a.puuid] = {
                    riotName: a.riotName,
                    riotTag: a.riotTag,
                    region: a.region,
                    showVerifyBadge: p.showVerifyBadge,
                    verifyGrade: p.verifyGrade,
                };
            }
        }
        return map;
    }, [lobby]);
    const dayGroups = useMemo(() => {
        const now = Date.now();
        const buckets = new Map(); // dayKey → squadSig → Section
        const dayMeta = new Map();
        const seenMatchByBucket = new Map(); // dayKey:sig → matchIds
        for (const item of filteredItems) {
            // Sort + bucket by gameEnd (gameCreation + duration), not by
            // gameCreation. The "X minutes ago" label already uses gameEnd,
            // so the section order needs to match: a long game that started
            // earlier but ended later should rank as "more recent" than a
            // short game that started later but ended sooner. Using
            // gameCreation produced the opposite — a 23-min game ending 17
            // min ago could outrank a 40-min game ending just now because
            // the former started later.
            const durationMs = (item.gameDurationSeconds ?? 0) * 1000;
            const ts = new Date(item.gameCreation).getTime() + durationMs;
            const d = new Date(ts);
            d.setHours(0, 0, 0, 0);
            const dayKey = String(d.getTime());
            if (!dayMeta.has(dayKey)) {
                dayMeta.set(dayKey, { label: dayBucket(ts, now), sortKey: d.getTime() });
            }
            if (!buckets.has(dayKey))
                buckets.set(dayKey, new Map());
            // Squad signature for THIS specific match — who+account combos that
            // appeared. Matches with the same signature get bucketed together,
            // regardless of who "owns" the FeedItem.
            const memberKeys = item.lobbyPlayers
                .map((lp) => `${lp.playerId}:${lp.accountPuuid}`)
                .sort();
            const sig = memberKeys.join("|");
            const dayMap = buckets.get(dayKey);
            if (!dayMap.has(sig)) {
                dayMap.set(sig, {
                    members: [...item.lobbyPlayers]
                        .sort((a, b) => `${a.playerId}:${a.accountPuuid}`.localeCompare(`${b.playerId}:${b.accountPuuid}`))
                        .map((lp) => ({
                        playerId: lp.playerId,
                        puuid: lp.accountPuuid,
                    })),
                    matches: [],
                    itemsByMatch: new Map(),
                    latestMatchTs: ts,
                });
            }
            const sec = dayMap.get(sig);
            // Accumulate every FeedItem for the match (per-owner fan-out).
            if (!sec.itemsByMatch.has(item.matchId)) {
                sec.itemsByMatch.set(item.matchId, []);
            }
            sec.itemsByMatch.get(item.matchId).push(item);
            // Dedupe representative match list by matchId.
            const dedupeKey = `${dayKey}:${sig}`;
            if (!seenMatchByBucket.has(dedupeKey)) {
                seenMatchByBucket.set(dedupeKey, new Set());
            }
            const seenSet = seenMatchByBucket.get(dedupeKey);
            if (seenSet.has(item.matchId))
                continue;
            seenSet.add(item.matchId);
            sec.matches.push(item);
            if (ts > sec.latestMatchTs)
                sec.latestMatchTs = ts;
        }
        const out = [];
        for (const [dayKey, dayMap] of buckets) {
            const meta = dayMeta.get(dayKey);
            const sections = Array.from(dayMap.values()).sort((a, b) => b.latestMatchTs - a.latestMatchTs);
            // Sort matches WITHIN each section by gameEnd desc as well, so
            // matches[0] (the visible row in collapsed mode) is always the
            // most recently-ended game. The feed API hands them to us in
            // gameCreation order, which can disagree with end time when game
            // durations differ.
            for (const sec of sections) {
                sec.matches.sort((a, b) => {
                    const ae = new Date(a.gameCreation).getTime() +
                        (a.gameDurationSeconds ?? 0) * 1000;
                    const be = new Date(b.gameCreation).getTime() +
                        (b.gameDurationSeconds ?? 0) * 1000;
                    return be - ae;
                });
            }
            out.push({ label: meta.label, sortKey: meta.sortKey, sections });
        }
        return out.sort((a, b) => b.sortKey - a.sortKey);
    }, [filteredItems]);
    const squadMatchIds = useMemo(() => {
        const set = new Set();
        // Use the full items list — squad detection is global per-match, not
        // affected by the player filter.
        for (const item of items) {
            if (item.lobbyPlayers.length >= 2)
                set.add(item.matchId);
        }
        return set;
    }, [items]);
    if (items.length === 0) {
        return (_jsxs("div", { className: cn(glassDark, "p-12 text-center"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsx("div", { className: "relative z-10 text-flash/40 text-sm", children: "No matches yet. They'll appear here as games are played." })] }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-10", children: [_jsx(PlayerFilterBar, { lobby: lobby, filterMode: filterMode, onFilterChange: setFilterMode, countByPlayer: matchCountByPlayer, mainOnly: mainOnly, onToggleMainOnly: () => setMainOnly((v) => !v) }), dayGroups.length === 0 && filterMode.kind !== "all" && (_jsxs("div", { className: cn(glassDark, "p-10 text-center"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsx("div", { className: "relative z-10 text-flash/40 text-sm", children: "No matches for this player yet." })] })), _jsx(LayoutGroup, { children: _jsx(AnimatePresence, { mode: "popLayout", initial: false, children: dayGroups.map((day, dayIdx) => (_jsxs(motion.section, { 
                        // No `layout` here: it forced framer to re-measure every
                        // tracked node on every reflow (infinite-scroll append, card
                        // expand) — the feed's main perf cost as it grows. Enter/exit
                        // fades stay; the (rare) filter-change reorder just snaps into
                        // place instead of sliding, which is a fine trade.
                        initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] }, className: cn(dayIdx > 0 && "pt-2"), children: [_jsxs("div", { className: "relative flex items-center gap-3 mb-5 px-1", children: [_jsx("span", { className: "relative inline-flex items-center justify-center w-2 h-2 rounded-full", style: {
                                            background: JADE,
                                            boxShadow: "0 0 14px rgba(0,217,146,0.7), 0 0 4px rgba(0,217,146,0.9)",
                                        } }), _jsx("h2", { className: "text-[13px] font-jetbrains tracking-[0.3em] uppercase text-flash font-bold", children: day.label }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-jade/30 via-flash/10 to-transparent" }), _jsxs("span", { className: "text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/35", children: [day.sections.reduce((n, s) => n + s.matches.length, 0), " ", day.sections.reduce((n, s) => n + s.matches.length, 0) === 1
                                                ? "match"
                                                : "matches"] })] }), _jsx("div", { className: "flex flex-col gap-11", children: _jsx(AnimatePresence, { mode: "popLayout", initial: false, children: day.sections.map((section, idx) => {
                                        const sectionMembers = section.members
                                            .map((m) => {
                                            const player = playerById.get(m.playerId);
                                            if (!player)
                                                return null;
                                            const account = player.accounts.find((a) => a.puuid === m.puuid) ??
                                                null;
                                            return { player, account };
                                        })
                                            .filter((x) => x !== null);
                                        if (sectionMembers.length === 0)
                                            return null;
                                        const key = `${day.sortKey}:${idx}:${section.members
                                            .map((m) => `${m.playerId}-${m.puuid}`)
                                            .join("+")}`;
                                        return (_jsx(motion.div, { 
                                            // `layout` removed (see the motion.section note) —
                                            // the section's own grid-rows expand animation +
                                            // normal flow already keep neighbours moving smoothly.
                                            initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.96, y: -12 }, transition: {
                                                duration: 0.3,
                                                ease: [0.22, 1, 0.36, 1],
                                            }, children: _jsx(PlayerSectionCard, { members: sectionMembers, matches: section.matches, itemsByMatch: section.itemsByMatch, squadMatchIds: squadMatchIds, lobbyAccountByPuuid: lobbyAccountByPuuid, lobbySlug: lobby.slug, social: social, canLike: canLike, canComment: canComment }) }, key));
                                    }) }) })] }, day.label + day.sortKey))) }) }), _jsx("div", { ref: sentinelRef, className: "flex items-center justify-center py-3 text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/40", children: loadingMore ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(Loader2, { className: "w-3.5 h-3.5 animate-spin" }), "Loading more"] })) : hasMore ? (_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx(ChevronDown, { className: "w-3.5 h-3.5" }), "Scroll for more"] })) : items.length > 0 ? (_jsx("span", { className: "text-flash/30", children: "\u2014 end of feed \u2014" })) : null })] }));
}
function TrendingTab({ slug, refreshTick, }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE_URL}/api/scout/trending/${slug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !cancelled && setData(d))
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, refreshTick]);
    if (loading || !data) {
        return (_jsx("div", { className: cn(glassDark, "p-12 flex items-center justify-center"), children: _jsx(Loader2, { className: "w-5 h-5 animate-spin text-jade" }) }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(LobbySummaryStrip, { summary: data.lobbySummary, streaks: data.streaks }), _jsx(ChartCard, { title: "Activity Trend", subtitle: "Games per day + winrate line", children: _jsx(ActivityChart, { daily: data.daily }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(ChartCard, { title: "Game Duration", subtitle: "Distribution of game lengths", children: _jsx(HistogramChart, { data: data.durationHistogram, accent: "#5fa8ff" }) }), _jsx(ChartCard, { title: "KDA Distribution", subtitle: "How often each KDA bracket happens", children: _jsx(HistogramChart, { data: data.kdaHistogram, accent: JADE }) })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4", children: [_jsx(ChartCard, { title: "Time-of-Day Heatmap", subtitle: "When the lobby plays (local time)", children: _jsx(HourlyHeatmap, { matrix: data.hourlyHeatmap }) }), _jsx(ChartCard, { title: "Role Distribution", subtitle: "Games played by lane", children: _jsx(RoleBars, { roles: data.roleDistribution }) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(ChartCard, { title: "Queue Mix", subtitle: "Solo / Flex / Other", children: _jsx(QueueDonut, { queue: data.queueBreakdown }) }), _jsx(ChartCard, { title: "Streaks", subtitle: "Longest unbroken runs", children: _jsx(StreaksBox, { streaks: data.streaks }) }), _jsx(ChartCard, { title: "Most-Played Champion", subtitle: "Across the whole lobby", children: _jsx(TopChampionBox, { top: data.topChampions[0] ?? null }) })] }), _jsx(ChartCard, { title: "Per-Player Profile", subtitle: "Avg KDA \u00B7 DMG \u00B7 Gold/min \u00B7 Vision \u00B7 Champion variety", children: _jsx(PlayerRadarGrid, { players: data.perPlayer }) }), _jsx(ChartCard, { title: "Top 20 Champions", subtitle: "Sorted by games played", children: _jsx(TopChampionsList, { list: data.topChampions }) })] }));
}
/* ─── trending helper cards/charts ─────────────────────────────────── */
function ChartCard({ title, subtitle, children, }) {
    return (_jsxs("div", { className: cn(glassDark, "p-5"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1]", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("span", { style: { color: JADE, fontSize: "12px" }, children: "\u25C8" }), _jsx("span", { className: "text-[12px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium", children: title }), subtitle && (_jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.15em] text-flash/35 normal-case", children: subtitle })), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" })] }), children] })] }));
}
function LobbySummaryStrip({ summary, streaks, }) {
    const winrate = summary.games > 0 ? Math.round((summary.wins / summary.games) * 100) : 0;
    const avgKda = summary.deaths === 0
        ? Math.min(99, summary.kills + summary.assists)
        : (summary.kills + summary.assists) / summary.deaths;
    const since = new Date(summary.sinceIso);
    const daysAgo = Math.floor((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
    const totalHours = Math.round(summary.durationSec / 3600);
    const tiles = [
        { label: "Games", value: summary.games.toString(), accent: JADE },
        { label: "Winrate", value: `${winrate}%`, accent: winrate >= 50 ? JADE : "#ef4444" },
        {
            label: "Avg KDA",
            value: avgKda.toFixed(2),
            accent: avgKda >= 3 ? JADE : "#d7d8d9",
        },
        { label: "Active Days", value: `${summary.activeDays}/${Math.max(1, daysAgo + 1)}`, accent: "#5fa8ff" },
        { label: "Play Time", value: `${totalHours}h`, accent: "#c084fc" },
        { label: "W-Streak", value: streaks.longestWinStreak.toString(), accent: JADE },
        { label: "L-Streak", value: streaks.longestLossStreak.toString(), accent: "#ef4444" },
    ];
    return (_jsxs("div", { className: cn(glassDark, "p-3"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsx("div", { className: "relative z-[1] grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3", children: tiles.map((t) => (_jsxs("div", { className: "flex flex-col items-center text-center", children: [_jsx("span", { className: "text-[20px] font-chakrapetch font-bold tabular-nums leading-none", style: { color: t.accent }, children: t.value }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mt-1", children: t.label })] }, t.label))) })] }));
}
/* ─── activity chart (line + bars) ─────────────────────────────────── */
function ActivityChart({ daily }) {
    if (daily.length === 0) {
        return _jsx(Empty, { label: "No data" });
    }
    // Take last 30 days max
    const slice = daily.slice(-30);
    const maxGames = Math.max(1, ...slice.map((d) => d.games));
    const width = Math.max(slice.length * 32, 600);
    const height = 200;
    const padL = 36;
    const padR = 12;
    const padT = 12;
    const padB = 28;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const colW = innerW / slice.length;
    const wrPoints = slice
        .map((d, i) => {
        if (d.games === 0)
            return null;
        const x = padL + i * colW + colW / 2;
        const winrate = d.games > 0 ? (d.wins / d.games) * 100 : 0;
        const y = padT + (1 - winrate / 100) * innerH;
        return { x, y };
    })
        .filter(Boolean);
    const linePath = wrPoints
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
    return (_jsx("div", { className: "overflow-x-auto", children: _jsxs("svg", { width: width, height: height, viewBox: `0 0 ${width} ${height}`, className: "block", children: [[0, 50, 100].map((p) => {
                    const y = padT + (1 - p / 100) * innerH;
                    return (_jsxs("g", { children: [_jsx("line", { x1: padL, x2: padL + innerW, y1: y, y2: y, stroke: "rgba(215,216,217,0.06)", strokeWidth: 1 }), _jsxs("text", { x: padL - 6, y: y + 3, textAnchor: "end", className: "fill-flash/30 text-[9px] font-jetbrains", children: [p, "%"] })] }, p));
                }), _jsx("line", { x1: padL, x2: padL + innerW, y1: padT + 0.5 * innerH, y2: padT + 0.5 * innerH, stroke: "rgba(0,217,146,0.18)", strokeDasharray: "3 3" }), slice.map((d, i) => {
                    const x = padL + i * colW + colW * 0.18;
                    const barW = colW * 0.64;
                    const h = (d.games / maxGames) * innerH;
                    const y = padT + innerH - h;
                    return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: barW, height: h, fill: "rgba(0,217,146,0.10)", stroke: "rgba(0,217,146,0.30)", strokeWidth: 0.8, rx: 1 }), d.games > 0 && (_jsx("text", { x: x + barW / 2, y: y - 3, textAnchor: "middle", className: "fill-jade/70 text-[8px] font-chakrapetch font-bold tabular-nums", children: d.games }))] }, i));
                }), wrPoints.length > 1 && _jsx("path", { d: linePath, stroke: JADE, strokeWidth: 2, fill: "none", strokeLinejoin: "round", strokeLinecap: "round" }), wrPoints.map((p, i) => _jsx("circle", { cx: p.x, cy: p.y, r: 2.5, fill: JADE, stroke: "#040A0C", strokeWidth: 1 }, i)), slice.map((d, i) => {
                    if (i % 3 !== 0 && i !== slice.length - 1)
                        return null;
                    const x = padL + i * colW + colW / 2;
                    const lbl = d.date.slice(5); // MM-DD
                    return _jsx("text", { x: x, y: height - 10, textAnchor: "middle", className: "fill-flash/35 text-[8px] font-jetbrains", children: lbl }, i);
                })] }) }));
}
/* ─── generic vertical histogram ───────────────────────────────────── */
function HistogramChart({ data, accent, }) {
    if (data.length === 0 || data.every((d) => d.count === 0)) {
        return _jsx(Empty, { label: "No data" });
    }
    const max = Math.max(1, ...data.map((d) => d.count));
    return (_jsx("div", { className: "flex items-end justify-around gap-2 h-44 px-2", children: data.map((d) => {
            const pct = (d.count / max) * 100;
            return (_jsxs("div", { className: "flex-1 flex flex-col items-center gap-1.5 min-w-0", children: [_jsx("span", { className: "text-[10px] font-chakrapetch font-bold tabular-nums", style: { color: accent }, children: d.count || "" }), _jsx("div", { className: "w-full bg-black/30 rounded-[3px] relative overflow-hidden", style: { height: `${pct}%`, minHeight: d.count > 0 ? 6 : 1, border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)` }, children: _jsx("div", { className: "absolute inset-0", style: { background: `linear-gradient(to top, color-mix(in srgb, ${accent} 40%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`, boxShadow: `inset 0 -8px 12px color-mix(in srgb, ${accent} 25%, transparent)` } }) }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.1em] text-flash/45 truncate w-full text-center", children: d.label })] }, d.label));
        }) }));
}
/* ─── hourly heatmap (7×24 grid) ───────────────────────────────────── */
function HourlyHeatmap({ matrix }) {
    const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    // Project the matrix down to two independent dimensions so we can render
    // them as two compact bar rows that fill the available width — no
    // horizontal scroll, every hour and weekday still visible.
    const byHour = Array.from({ length: 24 }, (_, h) => matrix.reduce((s, row) => s + (row[h] ?? 0), 0));
    const byDay = matrix.map((row) => row.reduce((s, v) => s + v, 0));
    const maxH = Math.max(1, ...byHour);
    const maxD = Math.max(1, ...byDay);
    const totalGames = byHour.reduce((s, v) => s + v, 0);
    if (totalGames === 0) {
        return (_jsx("div", { className: "py-6 text-center text-flash/30 text-[11px] font-jetbrains tracking-[0.2em] uppercase", children: "No activity yet" }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/40", children: "By hour" }), _jsxs("span", { className: "text-[8.5px] font-jetbrains tracking-wider text-flash/25 tabular-nums", children: ["peak ", String(byHour.indexOf(maxH)).padStart(2, "0"), ":00"] })] }), _jsx("div", { className: "grid items-end h-12 gap-[2px]", style: { gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }, children: byHour.map((v, h) => {
                            const intensity = v / maxH;
                            return (_jsx("div", { title: `${String(h).padStart(2, "0")}:00 — ${v} games`, className: "rounded-[2px] transition-colors", style: {
                                    height: `${Math.max(6, intensity * 100)}%`,
                                    background: v === 0
                                        ? "rgba(215,216,217,0.05)"
                                        : `rgba(0,217,146,${0.18 + intensity * 0.62})`,
                                    boxShadow: intensity > 0.55
                                        ? `0 0 6px rgba(0,217,146,${0.35 * intensity})`
                                        : undefined,
                                } }, h));
                        }) }), _jsx("div", { className: "grid mt-1 text-[7.5px] font-jetbrains tracking-wider text-flash/30 tabular-nums", style: { gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }, children: Array.from({ length: 24 }).map((_, h) => (_jsx("span", { className: "text-center", children: h % 3 === 0 ? String(h).padStart(2, "0") : "" }, h))) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [_jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/40", children: "By weekday" }), _jsxs("span", { className: "text-[8.5px] font-jetbrains tracking-wider text-flash/25", children: ["peak ", DAYS[byDay.indexOf(maxD)]] })] }), _jsx("div", { className: "grid items-end h-10 gap-1", style: { gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }, children: byDay.map((v, d) => {
                            const intensity = v / maxD;
                            return (_jsx("div", { title: `${DAYS[d]} — ${v} games`, className: "rounded-[3px] transition-colors", style: {
                                    height: `${Math.max(8, intensity * 100)}%`,
                                    background: v === 0
                                        ? "rgba(215,216,217,0.05)"
                                        : `rgba(0,217,146,${0.18 + intensity * 0.62})`,
                                    boxShadow: intensity > 0.55
                                        ? `0 0 6px rgba(0,217,146,${0.35 * intensity})`
                                        : undefined,
                                } }, d));
                        }) }), _jsx("div", { className: "grid mt-1 text-[8px] font-jetbrains tracking-[0.15em] text-flash/40", style: { gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }, children: DAYS.map((d) => (_jsx("span", { className: "text-center", children: d.slice(0, 3) }, d))) })] })] }));
}
/* ─── role distribution (horizontal bars) ──────────────────────────── */
function RoleBars({ roles }) {
    if (roles.length === 0)
        return _jsx(Empty, { label: "No role data" });
    const max = Math.max(1, ...roles.map((r) => r.games));
    const COLORS = {
        TOP: "#ef4444",
        JNG: "#10b981",
        MID: "#5fa8ff",
        ADC: "#FFB615",
        SUP: "#c084fc",
        UNKNOWN: "#7d6b5d",
    };
    return (_jsx("ul", { className: "flex flex-col gap-2.5", children: roles.map((r) => {
            const color = COLORS[r.role] ?? "#7d6b5d";
            const pct = (r.games / max) * 100;
            return (_jsxs("li", { className: "flex items-center gap-3", children: [_jsx("span", { className: "w-10 text-[11px] font-jetbrains tracking-[0.15em] uppercase font-medium", style: { color }, children: r.role }), _jsxs("div", { className: "flex-1 h-5 bg-black/30 rounded-[3px] overflow-hidden relative", children: [_jsx("div", { className: "h-full transition-all duration-500", style: { width: `${pct}%`, background: `linear-gradient(to right, color-mix(in srgb, ${color} 25%, transparent), color-mix(in srgb, ${color} 55%, transparent))`, boxShadow: `inset 0 0 8px color-mix(in srgb, ${color} 20%, transparent)` } }), _jsxs("span", { className: "absolute inset-y-0 right-2 flex items-center text-[10px] font-jetbrains tabular-nums text-flash/70", children: [r.games, "g \u00B7 ", r.winrate, "%"] })] })] }, r.role));
        }) }));
}
/* ─── queue donut (svg) ────────────────────────────────────────────── */
function QueueDonut({ queue }) {
    const total = queue.solo + queue.flex + queue.other;
    if (total === 0)
        return _jsx(Empty, { label: "No data" });
    const segments = [
        { label: "Solo/Duo", value: queue.solo, color: JADE, wins: queue.soloWins },
        { label: "Flex", value: queue.flex, color: "#5fa8ff", wins: queue.flexWins },
        { label: "Other", value: queue.other, color: "#7d6b5d", wins: 0 },
    ].filter((s) => s.value > 0);
    const R = 55;
    const C = 2 * Math.PI * R;
    let acc = 0;
    return (_jsxs("div", { className: "flex items-center gap-5", children: [_jsxs("svg", { viewBox: "-80 -80 160 160", className: "w-40 h-40 shrink-0", children: [segments.map((s) => {
                        const dash = (s.value / total) * C;
                        const offset = (acc / total) * C;
                        acc += s.value;
                        const wr = s.value > 0 && s.wins > 0
                            ? Math.round((s.wins / s.value) * 100)
                            : null;
                        const pct = Math.round((s.value / total) * 100);
                        return (_jsx(TooltipProvider, { delayDuration: 120, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("circle", { r: R, fill: "none", stroke: s.color, strokeWidth: 18, strokeDasharray: `${dash} ${C - dash}`, strokeDashoffset: -offset, transform: "rotate(-90)", style: {
                                                filter: `drop-shadow(0 0 6px ${s.color}50)`,
                                                cursor: "default",
                                            } }) }), _jsx(TooltipContent, { side: "top", className: "text-xs font-jetbrains tracking-wider", children: _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "text-[10px] uppercase tracking-[0.18em] font-bold", style: { color: s.color }, children: s.label }), _jsxs("span", { className: "text-flash/85", children: [s.value, " ", s.value === 1 ? "game" : "games", _jsx("span", { className: "text-flash/35", children: " \u00B7 " }), pct, "%", wr != null && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-flash/35", children: " \u00B7 " }), _jsxs("span", { className: wr >= 55
                                                                        ? "text-jade"
                                                                        : wr >= 48
                                                                            ? "text-flash/80"
                                                                            : "text-red-400/80", children: [wr, "% WR"] })] }))] })] }) })] }) }, s.label));
                    }), _jsx("text", { x: 0, y: -4, textAnchor: "middle", className: "fill-flash text-[22px] font-chakrapetch font-bold tabular-nums", children: total }), _jsx("text", { x: 0, y: 14, textAnchor: "middle", className: "fill-flash/40 text-[8px] font-jetbrains tracking-[0.2em] uppercase", children: "Total Games" })] }), _jsx("ul", { className: "flex flex-col gap-2 min-w-0 flex-1", children: segments.map((s) => {
                    const pct = Math.round((s.value / total) * 100);
                    const wr = s.value > 0 && s.wins > 0 ? Math.round((s.wins / s.value) * 100) : 0;
                    return (_jsxs("li", { className: "flex items-center gap-2 text-[11px] font-jetbrains", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full shrink-0", style: { background: s.color, boxShadow: `0 0 6px ${s.color}` } }), _jsx("span", { className: "text-flash/70 truncate flex-1", children: s.label }), _jsx("span", { className: "text-flash/55 tabular-nums", children: s.value }), _jsx("span", { className: "text-flash/30 tabular-nums", children: "\u00B7" }), _jsxs("span", { className: "text-flash/55 tabular-nums", children: [pct, "%"] }), s.wins > 0 && _jsxs("span", { className: "text-jade/70 tabular-nums", children: [wr, "%WR"] })] }, s.label));
                }) })] }));
}
function StreaksBox({ streaks }) {
    return (_jsxs("div", { className: "flex items-center justify-around h-40", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "text-[48px] font-chakrapetch font-bold text-jade tabular-nums leading-none", style: { textShadow: "0 0 22px rgba(0,217,146,0.45)" }, children: streaks.longestWinStreak }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.2em] uppercase text-jade/55 mt-2", children: "Longest W" })] }), _jsx("div", { className: "w-[1px] h-20 bg-flash/10" }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("span", { className: "text-[48px] font-chakrapetch font-bold text-red-400 tabular-nums leading-none", style: { textShadow: "0 0 22px rgba(239,68,68,0.4)" }, children: streaks.longestLossStreak }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.2em] uppercase text-red-400/55 mt-2", children: "Longest L" })] })] }));
}
function TopChampionBox({ top }) {
    if (!top)
        return _jsx(Empty, { label: "No champion data" });
    return (_jsxs("div", { className: "flex items-center gap-4 h-40 justify-center", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(top.champion)}.png`, alt: top.champion, className: "w-20 h-20 rounded-md", style: { boxShadow: "0 0 24px rgba(0,217,146,0.25)", border: "1.5px solid rgba(0,217,146,0.35)" } }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "text-[16px] font-geist font-medium text-flash leading-none", children: top.champion }), _jsxs("span", { className: "text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/50", children: [top.games, " games \u00B7 ", top.wins, "W"] }), _jsxs("span", { className: "text-[14px] font-chakrapetch font-bold tabular-nums", children: [_jsxs("span", { className: top.winrate >= 55 ? "text-jade" : top.winrate >= 48 ? "text-flash/85" : "text-red-400/70", children: [top.winrate, "%"] }), _jsx("span", { className: "text-flash/30", children: " \u00B7 " }), _jsxs("span", { className: "text-jade/70", children: [top.avgKda.toFixed(2), " KDA"] })] })] })] }));
}
/* ─── per-player radar grid (one mini radar per player) ────────────── */
function PlayerRadarGrid({ players }) {
    if (players.length === 0)
        return _jsx(Empty, { label: "No player data" });
    // Normalize per-axis across the lobby so radars are comparable.
    const maxKda = Math.max(0.01, ...players.map((p) => p.avgKda));
    const maxDamage = Math.max(0.01, ...players.map((p) => p.avgDamage));
    const maxGoldPerMin = Math.max(0.01, ...players.map((p) => p.avgGoldPerMin));
    const maxVision = Math.max(0.01, ...players.map((p) => p.avgVision));
    const maxChamps = Math.max(0.01, ...players.map((p) => p.uniqueChampions));
    return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: players
            .filter((p) => p.games > 0)
            .map((p) => (_jsx(PlayerRadar, { player: p, normFactors: { maxKda, maxDamage, maxGoldPerMin, maxVision, maxChamps } }, p.playerId))) }));
}
function PlayerRadar({ player, normFactors, }) {
    const accent = player.color || JADE;
    const axes = [
        { label: "KDA", value: player.avgKda / normFactors.maxKda },
        { label: "DMG", value: player.avgDamage / normFactors.maxDamage },
        { label: "GLD", value: player.avgGoldPerMin / normFactors.maxGoldPerMin },
        { label: "VIS", value: player.avgVision / normFactors.maxVision },
        { label: "CHA", value: player.uniqueChampions / normFactors.maxChamps },
    ];
    const N = axes.length;
    const R = 50;
    const cx = 70;
    const cy = 70;
    const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;
    const pt = (i, r) => {
        const a = angle(i);
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    };
    const valuePoints = axes.map((ax, i) => pt(i, Math.max(0.05, ax.value) * R));
    const polyPath = valuePoints
        .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
        .join(" ") + " Z";
    return (_jsxs("div", { className: "bg-black/25 border border-flash/10 rounded-[3px] p-3 flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { background: accent, boxShadow: `0 0 6px ${accent}` } }), _jsx("span", { className: "text-[12px] font-geist font-medium text-flash", children: player.displayName }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.12em] text-flash/35 ml-auto", children: [player.games, "g \u00B7 ", player.winrate, "%"] })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("svg", { viewBox: "0 0 140 140", className: "w-32 h-32 shrink-0", children: [[0.25, 0.5, 0.75, 1].map((s) => (_jsx("polygon", { points: Array.from({ length: N }, (_, i) => pt(i, R * s).join(",")).join(" "), fill: "none", stroke: "rgba(215,216,217,0.06)", strokeWidth: 0.5 }, s))), Array.from({ length: N }, (_, i) => {
                                const [x, y] = pt(i, R);
                                return _jsx("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: "rgba(215,216,217,0.05)", strokeWidth: 0.5 }, i);
                            }), _jsx("path", { d: polyPath, fill: accent, fillOpacity: 0.15, stroke: accent, strokeWidth: 1.5, style: { filter: `drop-shadow(0 0 6px ${accent})` } }), valuePoints.map(([x, y], i) => (_jsx("circle", { cx: x, cy: y, r: 2, fill: accent }, i))), axes.map((ax, i) => {
                                const [x, y] = pt(i, R + 10);
                                return (_jsx("text", { x: x, y: y, textAnchor: "middle", dominantBaseline: "middle", className: "fill-flash/40 text-[7px] font-jetbrains tracking-wider", children: ax.label }, ax.label));
                            })] }), _jsxs("div", { className: "flex flex-col gap-1 text-[10px] font-jetbrains tabular-nums text-flash/55 min-w-0", children: [_jsxs("div", { children: [_jsx("span", { className: "text-jade/70", children: "KDA" }), " ", player.avgKda.toFixed(2)] }), _jsxs("div", { children: [_jsx("span", { className: "text-flash/55", children: "K/D/A" }), " ", player.avgKills.toFixed(1), "/", player.avgDeaths.toFixed(1), "/", player.avgAssists.toFixed(1)] }), _jsxs("div", { children: [_jsx("span", { className: "text-[#5fa8ff]/70", children: "DMG" }), " ", Math.round(player.avgDamage / 1000), "k"] }), _jsxs("div", { children: [_jsx("span", { className: "text-[#FFB615]/70", children: "G/M" }), " ", Math.round(player.avgGoldPerMin)] }), _jsxs("div", { children: [_jsx("span", { className: "text-[#c084fc]/70", children: "VIS" }), " ", player.avgVision.toFixed(1)] }), _jsxs("div", { children: [_jsx("span", { className: "text-flash/55", children: "Champs" }), " ", player.uniqueChampions] })] })] })] }));
}
/* ─── top champions list (compact rows) ────────────────────────────── */
function TopChampionsList({ list }) {
    if (list.length === 0)
        return _jsx(Empty, { label: "No champion data" });
    return (_jsx("ul", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: list.map((c, i) => (_jsxs("li", { className: "flex items-center gap-3 bg-black/25 border border-flash/10 rounded-[3px] px-3 py-2", children: [_jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.15em] text-flash/30 w-5", children: String(i + 1).padStart(2, "0") }), _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(c.champion)}.png`, alt: c.champion, className: "w-8 h-8 rounded-md" }), _jsxs("div", { className: "flex flex-col flex-1 min-w-0", children: [_jsx("span", { className: "text-[12px] font-geist font-medium text-flash truncate", children: c.champion }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.12em] text-flash/40", children: [c.games, " games"] })] }), _jsxs("div", { className: "flex flex-col items-end", children: [_jsxs("span", { className: cn("text-[13px] font-chakrapetch font-bold tabular-nums leading-none", c.winrate >= 55 ? "text-jade" : c.winrate >= 48 ? "text-flash/85" : "text-red-400/70"), children: [c.winrate, "%"] }), _jsxs("span", { className: "text-[9px] font-jetbrains tracking-[0.15em] uppercase text-jade/55 mt-0.5", children: [c.avgKda.toFixed(2), " KDA"] })] })] }, c.champion))) }));
}
function Empty({ label }) {
    return (_jsx("div", { className: "py-12 text-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30", children: label }));
}
/* ─── stats tab content (just the trend chart now) ─────────────────── */
/* ─── leaderboard tab — rankings-page style ─────────────────────────── */
const LADDER_TIER_INDEX = {
    IRON: 0,
    BRONZE: 1,
    SILVER: 2,
    GOLD: 3,
    PLATINUM: 4,
    EMERALD: 5,
    DIAMOND: 6,
    MASTER: 7,
    GRANDMASTER: 7,
    CHALLENGER: 7,
};
const DIVISION_INDEX = { IV: 1, III: 2, II: 3, I: 4 };
// Mirrors backend ladderScore: per-tier offset is 400 LP (4 divisions ×
// 100), per-division offset is (idx − 1) × 100 with IV=1 / III=2 / II=3 /
// I=4 so IV contributes 0 and I contributes 300. Master+ is divisionless
// and just adds raw LP onto where DIAMOND I 100 ended (2800).
// Accepts any shape with the three fields that contribute to the
// score — wins/losses are tracked on the full CurrentRank but aren't
// part of the math, so callers passing the slim account-side rank
// (which omits them) type-check cleanly.
function ladderScoreFE(rank) {
    if (!rank)
        return -1; // unranked sinks
    const t = LADDER_TIER_INDEX[rank.tier.toUpperCase()] ?? 0;
    // MASTER index 7 — anything ≥ 7 ignores division.
    if (t >= 7)
        return 7 * 400 + rank.lp;
    const dIdx = rank.rankDivision
        ? DIVISION_INDEX[rank.rankDivision.toUpperCase()] ?? 1
        : 1;
    return t * 400 + (dIdx - 1) * 100 + rank.lp;
}
// Inverse of ladderScoreFE — given a composite score, return the
// (tier, division, lp) triple it represents. Used by the session pill
// to reconstruct the "started at" rank from current_rank − lpDelta_total.
const TIER_ORDER_FE = [
    "IRON",
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "EMERALD",
    "DIAMOND",
    "MASTER",
];
const DIVISION_LABELS = {
    1: "IV",
    2: "III",
    3: "II",
    4: "I",
};
function rankFromLadderScoreFE(score) {
    if (!isFinite(score) || score < 0)
        return null;
    // MASTER+ (score ≥ 2800): no division, lp = remainder.
    if (score >= 7 * 400) {
        return { tier: "MASTER", rankDivision: null, lp: Math.max(0, score - 7 * 400) };
    }
    const tIdx = Math.floor(score / 400);
    const tier = TIER_ORDER_FE[tIdx] ?? "IRON";
    const offsetInTier = score - tIdx * 400;
    const dIdx = Math.min(4, Math.floor(offsetInTier / 100) + 1);
    const lp = Math.max(0, Math.min(99, offsetInTier - (dIdx - 1) * 100));
    return { tier, rankDivision: DIVISION_LABELS[dIdx] ?? "IV", lp };
}
const LIVE_QUEUE_LABELS = {
    400: "NORMAL DRAFT",
    420: "SOLOQ",
    430: "NORMAL BLIND",
    440: "FLEX",
    450: "ARAM",
    490: "QUICKPLAY",
    700: "CLASH",
    720: "CLASH ARAM",
    830: "INTRO BOT",
    840: "BEGINNER BOT",
    850: "INTERMEDIATE BOT",
    870: "CO-OP VS AI",
    1700: "ARENA",
    1900: "URF",
};
function LiveTab({ slug }) {
    const [sessions, setSessions] = useState([]);
    const [polledAt, setPolledAt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [championIdToName, setChampionIdToName] = useState({});
    // ddragon champion key → id map (e.g. "266" → "Aatrox")
    useEffect(() => {
        let cancelled = false;
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((r) => r.json())
            .then((data) => {
            if (cancelled)
                return;
            const map = {};
            for (const c of Object.values(data?.data ?? {}))
                map[c.key] = c.id;
            setChampionIdToName(map);
        })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, []);
    // Poll live status while tab is open
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/scout/live/${slug}`, {
                    cache: "no-store",
                });
                if (cancelled)
                    return;
                if (!res.ok) {
                    setError(`HTTP ${res.status}`);
                    return;
                }
                const data = await res.json();
                setSessions(data.sessions ?? []);
                setPolledAt(data.polledAt ?? Date.now());
                setError(null);
            }
            catch (e) {
                if (!cancelled)
                    setError("Network error");
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        load();
        const id = window.setInterval(load, 30_000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [slug]);
    // Tick every second so the game timer animates between polls
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);
    if (loading && sessions.length === 0) {
        return (_jsxs("div", { className: cn(glassDark, "p-10 text-center"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-10 flex items-center justify-center gap-3 text-flash/40 text-sm", children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin text-jade" }), "Probing Spectator API\u2026"] })] }));
    }
    if (error && sessions.length === 0) {
        return (_jsxs("div", { className: cn(glassDark, "p-10 text-center"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsx("div", { className: "relative z-10 text-red-400/70 text-sm font-mono", children: error })] }));
    }
    if (sessions.length === 0) {
        return (_jsxs("div", { className: cn(glassDark, "p-12 text-center"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-10 flex flex-col items-center gap-3 text-flash/40", children: [_jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute inset-0 rounded-full bg-jade/20 animate-ping", style: { animationDuration: "2.4s" } }), _jsx("span", { className: "relative inline-flex w-3 h-3 rounded-full bg-jade/60" })] }), _jsx("p", { className: "text-[13px] font-jetbrains tracking-[0.18em] uppercase text-flash/50", children: "No one is in game right now" }), _jsx("p", { className: "text-[10px] font-jetbrains tracking-wider text-flash/30", children: "We poll every 30 seconds \u2014 refresh manually anytime" })] })] }));
    }
    // Group sessions by gameId — duos / flex stacks should render as a
    // single card with both members shown, not two cards for the same game.
    const groups = (() => {
        const byGame = new Map();
        for (const s of sessions) {
            let g = byGame.get(s.gameId);
            if (!g) {
                g = {
                    gameId: s.gameId,
                    gameQueueConfigId: s.gameQueueConfigId,
                    gameMode: s.gameMode,
                    gameType: s.gameType,
                    gameStartTime: s.gameStartTime,
                    gameLength: s.gameLength,
                    mapId: s.mapId,
                    participants: s.participants,
                    bansBlue: s.bansBlue,
                    bansRed: s.bansRed,
                    members: [],
                };
                byGame.set(s.gameId, g);
            }
            g.members.push({
                playerId: s.playerId,
                displayName: s.displayName,
                color: s.color,
                iconId: s.iconId,
                accountPuuid: s.accountPuuid,
                region: s.region,
                riotName: s.riotName,
                riotTag: s.riotTag,
                championId: s.championId,
            });
        }
        return Array.from(byGame.values());
    })();
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex items-center gap-3 px-1", children: [_jsxs("span", { className: "relative inline-flex", children: [_jsx("span", { className: "absolute inset-0 rounded-full bg-jade/45 animate-ping", style: { animationDuration: "1.8s" } }), _jsx("span", { className: "relative inline-flex w-2.5 h-2.5 rounded-full bg-jade" })] }), _jsx("h2", { className: "text-[12px] font-jetbrains tracking-[0.3em] uppercase text-jade font-bold", children: "Live now" }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/40", children: [groups.length, " ", groups.length === 1 ? "session" : "sessions"] }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-jade/30 via-flash/10 to-transparent" }), polledAt > 0 && (_jsxs("span", { className: "text-[9px] font-jetbrains tracking-wider text-flash/30 tabular-nums", children: ["POLLED ", Math.max(0, Math.floor((now - polledAt) / 1000)), "s AGO"] }))] }), groups.map((g) => (_jsx(LiveSessionCard, { group: g, championIdToName: championIdToName, now: now }, g.gameId)))] }));
}
function LiveSessionCard({ group, championIdToName, now, }) {
    const isMulti = group.members.length > 1;
    // Splash + accent come from the first member.
    const lead = group.members[0];
    const leadChampName = championIdToName[String(lead.championId)] ?? String(lead.championId);
    const splash = cdnSplashUrl(normalizeChampName(leadChampName));
    const queueLabel = LIVE_QUEUE_LABELS[group.gameQueueConfigId] ?? `QUEUE ${group.gameQueueConfigId}`;
    const accent = lead.color || JADE;
    // gameStartTime is 0 until loading screen ends. While 0, fall back to
    // the snapshot gameLength.
    const elapsedSec = group.gameStartTime > 0
        ? Math.max(0, Math.floor((now - group.gameStartTime) / 1000))
        : group.gameLength;
    const mins = Math.floor(elapsedSec / 60);
    const secs = (elapsedSec % 60).toString().padStart(2, "0");
    const blue = group.participants.filter((p) => p.teamId === 100);
    const red = group.participants.filter((p) => p.teamId === 200);
    // For the scoreboard highlight, mark ALL lobby members as "active" so
    // the user sees both rows lit up in the duo case.
    const activePuuids = new Set(group.members.map((m) => m.accountPuuid));
    const leadSummonerHref = `/summoners/${lead.region.toLowerCase()}/${encodeURIComponent(lead.riotName)}-${encodeURIComponent(lead.riotTag)}`;
    const liveGameHref = `${leadSummonerHref}/livegame`;
    return (_jsxs("div", { className: "relative overflow-hidden rounded-md bg-black/30 backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.06)]", children: [_jsxs("div", { className: "absolute inset-0 z-0", children: [_jsx("img", { src: splash, alt: "", className: "absolute inset-0 w-full h-full object-cover opacity-25", style: { objectPosition: "center 25%" } }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-liquirice/95 via-liquirice/80 to-liquirice/65" })] }), _jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[3px] z-[1]", style: {
                    background: `color-mix(in srgb, ${accent} 75%, transparent)`,
                    boxShadow: `0 0 10px color-mix(in srgb, ${accent} 40%, transparent)`,
                } }), _jsxs("div", { className: "relative z-[2] p-3 flex items-stretch gap-3", children: [_jsxs("div", { className: "flex flex-col items-center gap-1.5 shrink-0", children: [isMulti && (_jsx("span", { className: "text-[8.5px] font-jetbrains tracking-[0.22em] uppercase font-bold leading-none", style: { color: accent }, children: group.members.length === 2 ? "Duo" : `${group.members.length}× Stack` })), _jsx("div", { className: cn("flex shrink-0 items-center", isMulti ? "flex-col gap-2" : "gap-1"), children: group.members.map((m, i) => (_jsxs(React.Fragment, { children: [i > 0 && isMulti && (_jsx("span", { className: "text-jade/45 text-[10px] leading-none -my-0.5", children: "+" })), _jsx(MemberPortrait, { member: m, championName: championIdToName[String(m.championId)] ?? String(m.championId) })] }, m.playerId))) })] }), _jsxs("div", { className: "flex-1 min-w-0 flex flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("span", { className: "inline-flex items-center gap-1.5", children: [_jsxs("span", { className: "relative inline-flex", children: [_jsx("span", { className: "absolute inset-0 rounded-full bg-jade/40 animate-ping", style: { animationDuration: "1.5s" } }), _jsx("span", { className: "relative inline-flex w-1.5 h-1.5 rounded-full bg-jade" })] }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.25em] uppercase text-jade/85 font-bold", children: "LIVE" })] }), _jsx("span", { className: "text-flash/15 text-[10px]", children: "\u00B7" }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/55", children: queueLabel }), _jsx("span", { className: "text-flash/15 text-[10px]", children: "\u00B7" }), _jsxs("span", { className: "text-[10px] font-chakrapetch font-medium text-flash/55 tabular-nums tracking-wider", children: [mins, ":", secs] })] }), _jsx("div", { className: cn("mt-0.5 flex flex-col", isMulti ? "gap-0.5" : ""), children: group.members.map((m) => {
                                    const champ = championIdToName[String(m.championId)] ?? String(m.championId);
                                    const summonerHref = `/summoners/${m.region.toLowerCase()}/${encodeURIComponent(m.riotName)}-${encodeURIComponent(m.riotTag)}`;
                                    return (_jsxs("div", { className: "flex items-baseline gap-2 min-w-0", children: [_jsxs(Link, { to: summonerHref, className: cn("font-chakrapetch font-bold text-flash hover:text-jade transition-colors tracking-tight truncate cursor-clicker leading-tight", isMulti ? "text-[13px]" : "text-[16px]"), children: [m.riotName, _jsxs("span", { className: cn("text-flash/35 font-medium ml-0.5", isMulti ? "text-[10px]" : "text-[12px]"), children: ["#", m.riotTag] })] }), _jsx("span", { className: "text-flash/35 text-[10px] shrink-0", children: "on" }), _jsx("span", { className: cn("font-chakrapetch font-bold text-jade/85 truncate leading-tight", isMulti ? "text-[12px]" : "text-[14px]"), children: champ })] }, m.playerId));
                                }) }), _jsxs("div", { className: "mt-1.5 grid grid-cols-2 gap-x-5 text-[10.5px] font-jetbrains", children: [_jsx(TeamRoster, { participants: blue, accent: "#5fa8ff", teamLabel: "BLUE", championIdToName: championIdToName, activePuuids: activePuuids, align: "left" }), _jsx(TeamRoster, { participants: red, accent: "#ef4444", teamLabel: "RED", championIdToName: championIdToName, activePuuids: activePuuids, align: "right" })] }), _jsxs("div", { className: "mt-2 flex items-center gap-4", children: [_jsx(BansStrip, { bans: group.bansBlue, accent: "#5fa8ff", championIdToName: championIdToName, align: "left" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/12 via-flash/20 to-flash/12" }), _jsx(BansStrip, { bans: group.bansRed, accent: "#ef4444", championIdToName: championIdToName, align: "right" })] })] })] }), _jsxs(Link, { to: liveGameHref, className: "absolute top-3 right-3 z-[3] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-jade/35 bg-jade/[0.10] text-jade hover:bg-jade/[0.20] hover:shadow-[0_0_12px_rgba(0,217,146,0.25)] text-[10px] font-jetbrains tracking-[0.22em] uppercase font-bold cursor-clicker transition-all", children: [_jsx(Eye, { className: "w-3 h-3" }), "Spectate", _jsx("span", { className: "text-jade/45 text-[8.5px] ml-1", children: lead.region })] })] }));
}
// Single portrait: champion icon with the lobby player's profile icon
// stuck in the corner + the player's display name underneath.
function MemberPortrait({ member, championName, }) {
    const accent = member.color || JADE;
    const champIcon = `${cdnBaseUrl()}/img/champion/${normalizeChampName(championName)}.png`;
    return (_jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsxs("div", { className: "relative w-[52px] h-[52px]", children: [_jsx("img", { src: champIcon, alt: championName, className: "w-[52px] h-[52px] rounded-md shadow-[0_3px_10px_rgba(0,0,0,0.5)] ring-1 ring-jade/25" }), _jsx("div", { className: "absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden ring-2 ring-liquirice bg-black", style: { boxShadow: `0 0 6px color-mix(in srgb, ${accent} 50%, transparent)` }, children: profileIconUrl(member.iconId) ? (_jsx("img", { src: profileIconUrl(member.iconId), alt: "", className: "w-full h-full" })) : (_jsx("span", { className: "w-full h-full flex items-center justify-center text-[10px] font-jetbrains font-bold", style: { color: accent, background: "rgba(0,0,0,0.6)" }, children: member.displayName.slice(0, 1).toUpperCase() })) })] }), _jsx("span", { className: "text-[9.5px] font-jetbrains tracking-[0.18em] uppercase font-bold leading-none", style: { color: accent }, children: member.displayName })] }));
}
function TeamRoster({ participants, accent, teamLabel, championIdToName, activePuuids, align, }) {
    return (_jsxs("div", { className: cn("flex flex-col", align === "right" && "items-end"), children: [_jsx("div", { className: "mb-0.5 text-[8px] font-jetbrains tracking-[0.28em] uppercase font-bold", style: { color: accent }, children: teamLabel }), _jsx("ul", { className: cn("space-y-[2px] text-[10px]", align === "right" && "text-right"), children: participants.map((p) => {
                    const champName = championIdToName[String(p.championId)] ?? String(p.championId);
                    const isActive = activePuuids.has(p.puuid);
                    const isMate = p.isLobbyMember && !isActive;
                    const nameClass = isActive
                        ? "text-jade font-bold drop-shadow-[0_0_6px_rgba(0,217,146,0.4)]"
                        : isMate
                            ? "text-jade/80"
                            : "text-flash/70";
                    const keystoneSrc = p.keystoneId
                        ? getKeystoneIcon(p.keystoneId)
                        : null;
                    return (_jsxs("li", { className: cn("flex items-center gap-1", align === "right" && "flex-row-reverse"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(champName)}.png`, alt: champName, title: champName, className: "w-[15px] h-[15px] rounded-[2px] shrink-0", style: {
                                    border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                                } }), _jsxs("div", { className: "grid grid-rows-2 gap-[1px] shrink-0", children: [_jsx("img", { src: summonerSpellUrl(p.spell1Id), alt: "", className: "w-[7px] h-[7px] rounded-[1.5px]" }), _jsx("img", { src: summonerSpellUrl(p.spell2Id), alt: "", className: "w-[7px] h-[7px] rounded-[1.5px]" })] }), keystoneSrc && (_jsx("img", { src: keystoneSrc, alt: "", className: "w-[12px] h-[12px] rounded-full bg-black/50 shrink-0" })), (isMate || isActive) && (_jsx("span", { "aria-hidden": true, className: "w-1 h-1 rounded-full shrink-0", style: {
                                    background: isActive ? JADE : "rgba(0,217,146,0.7)",
                                    boxShadow: isActive
                                        ? "0 0 5px rgba(0,217,146,0.8)"
                                        : undefined,
                                } })), _jsx("span", { className: cn("truncate min-w-0", nameClass), children: p.summonerName ?? "—" })] }, p.puuid));
                }) })] }));
}
/* ─── bans strip ─── */
function BansStrip({ bans, accent, championIdToName, align, }) {
    if (bans.length === 0)
        return null;
    return (_jsxs("div", { className: cn("flex items-center gap-1.5 shrink-0", align === "right" && "flex-row-reverse"), children: [_jsx("span", { className: "text-[8px] font-jetbrains tracking-[0.25em] uppercase font-bold opacity-70", style: { color: accent }, children: "BANS" }), _jsx("div", { className: cn("flex gap-[3px]", align === "right" && "flex-row-reverse"), children: bans.map((id, i) => {
                    const champName = championIdToName[String(id)] ?? String(id);
                    return (_jsxs("div", { className: "relative w-5 h-5 rounded-[2px] overflow-hidden grayscale opacity-75 hover:opacity-100 hover:grayscale-0 transition-all", title: `Banned: ${champName}`, style: {
                            border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                        }, children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(champName)}.png`, alt: champName, className: "w-full h-full" }), _jsx("span", { "aria-hidden": true, className: "absolute inset-0 pointer-events-none", style: {
                                    background: "linear-gradient(to bottom right, transparent 47%, rgba(239,68,68,0.75) 49%, rgba(239,68,68,0.75) 51%, transparent 53%)",
                                } })] }, `${id}-${i}`));
                }) })] }));
}
function LeaderboardTab({ slug, refreshTick, }) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [champions, setChampions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyToName, setKeyToName] = useState({});
    // Champion id → name lookup (matches rankings page)
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((r) => r.json())
            .then((data) => {
            const map = {};
            for (const c of Object.values(data?.data ?? {}))
                map[c.key] = c.id;
            setKeyToName(map);
        })
            .catch(() => { });
    }, []);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            // No window param → backend uses lobby creation cutoff.
            fetch(`${API_BASE_URL}/api/scout/leaderboard/${slug}`).then((r) => r.ok ? r.json() : null),
            // Champions still uses window=all for the top picks display.
            fetch(`${API_BASE_URL}/api/scout/champions/${slug}?window=all`).then((r) => r.ok ? r.json() : null),
        ])
            .then(([lb, ch]) => {
            if (cancelled)
                return;
            setLeaderboard(lb?.accounts ?? []);
            setChampions(ch?.players ?? []);
        })
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, refreshTick]);
    const champByPlayer = useMemo(() => {
        const map = new Map();
        for (const p of champions)
            map.set(p.playerId, p.champions);
        return map;
    }, [champions]);
    const sorted = useMemo(() => {
        return [...leaderboard].sort((a, b) => ladderScoreFE(b.currentRank) - ladderScoreFE(a.currentRank));
    }, [leaderboard]);
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsxs("div", { className: cn(glassDark), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1]", children: [_jsxs("div", { className: "grid grid-cols-[40px_44px_36px_1fr_140px_90px_120px_120px_56px] items-center px-4 py-2.5 text-[8px] font-jetbrains text-flash/25 tracking-[0.22em] uppercase border-b border-flash/[0.05]", children: [_jsx("span", { className: "text-center", children: "#" }), _jsx("span", {}), _jsx("span", {}), _jsx("span", { children: "Player" }), _jsx("span", { className: "text-center", children: "Rank" }), _jsx("span", { className: "text-center", children: "Balance" }), _jsx("span", { className: "text-center", children: "Record" }), _jsx("span", { className: "text-center", children: "Top Champs" }), _jsx("span", { className: "text-right", children: "WR" })] }), loading ? (Array.from({ length: 4 }).map((_, i) => (_jsxs("div", { className: "grid grid-cols-[40px_44px_36px_1fr_140px_90px_120px_120px_56px] items-center px-4 py-3 border-b border-flash/[0.03]", children: [_jsx(Skeleton, { className: "w-5 h-3.5 bg-flash/5 mx-auto" }), _jsx(Skeleton, { className: "w-9 h-9 rounded-full bg-flash/5" }), _jsx("span", {}), _jsx(Skeleton, { className: "h-4 w-32 bg-flash/5" }), _jsx(Skeleton, { className: "w-20 h-4 bg-flash/5 mx-auto" }), _jsx(Skeleton, { className: "w-14 h-4 bg-flash/5 mx-auto" }), _jsx(Skeleton, { className: "w-20 h-4 bg-flash/5 mx-auto" }), _jsxs("div", { className: "flex gap-1 justify-center", children: [_jsx(Skeleton, { className: "w-6 h-6 rounded-full bg-flash/5" }), _jsx(Skeleton, { className: "w-6 h-6 rounded-full bg-flash/5" }), _jsx(Skeleton, { className: "w-6 h-6 rounded-full bg-flash/5" })] }), _jsx(Skeleton, { className: "w-9 h-4 bg-flash/5 ml-auto" })] }, i)))) : sorted.length === 0 ? (_jsx("div", { className: "py-14 text-center text-flash/40 text-sm", children: "No leaderboard data yet" })) : (sorted.map((p, i) => {
                                const rank = i + 1;
                                const total = p.wins + p.losses;
                                const winrate = p.winrate;
                                const isTop3 = rank <= 3;
                                const topChamps = champByPlayer.get(p.playerId) ?? [];
                                return (_jsxs(motion.div
                                // Use puuid as key — leaderboard rows are per-account, so
                                // a player with multiple linked accounts has multiple rows
                                // sharing the same playerId. Using puuid avoids React
                                // collapsing or duplicating siblings on re-renders.
                                , { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.25, delay: i * 0.04, ease: "easeOut" }, className: cn("group relative grid grid-cols-[40px_44px_36px_1fr_140px_90px_120px_120px_56px] items-center px-4 py-3 transition-all duration-300", "border-b border-flash/[0.03]", "hover:bg-jade/[0.02] hover:border-flash/[0.06]"), children: [_jsx("span", { className: cn("text-center font-orbitron font-bold tabular-nums relative z-10 text-[14px]", rank === 1
                                                ? "text-amber-300"
                                                : rank === 2
                                                    ? "text-gray-300"
                                                    : rank === 3
                                                        ? "text-orange-400"
                                                        : "text-flash/25"), children: rank }), _jsx("div", { className: "relative w-9 h-9 rounded-full overflow-hidden shrink-0 z-10 transition-transform duration-300 group-hover:scale-105", style: {
                                                border: `1.5px solid color-mix(in srgb, ${p.color || JADE} 35%, transparent)`,
                                                boxShadow: isTop3
                                                    ? `0 0 14px color-mix(in srgb, ${p.color || JADE} 40%, transparent)`
                                                    : undefined,
                                            }, children: profileIconUrl(p.iconId) ? (_jsx("img", { src: profileIconUrl(p.iconId), alt: "", className: "w-full h-full object-cover", draggable: false })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center bg-black/40", children: _jsx("span", { className: "text-[14px] font-jetbrains font-bold", style: { color: p.color || JADE }, children: p.playerDisplayName.slice(0, 1).toUpperCase() }) })) }), _jsx("div", { className: "flex items-center justify-center relative z-10", children: _jsx("span", { className: "w-2 h-2 rounded-full", style: {
                                                    background: p.color || JADE,
                                                    boxShadow: `0 0 6px ${p.color || JADE}`,
                                                } }) }), _jsxs("div", { className: "min-w-0 relative z-10 flex flex-col leading-tight", children: [_jsxs(Link, { to: `/summoners/${p.region.toLowerCase()}/${encodeURIComponent(p.riotName)}-${encodeURIComponent(p.riotTag)}`, className: "text-[14px] text-flash/90 font-chakrapetch font-bold tracking-tight truncate block group-hover:text-jade group-hover:underline underline-offset-2 transition-colors duration-200 cursor-clicker", children: [p.riotName, _jsxs("span", { className: "text-flash/30 font-medium", children: ["#", p.riotTag] })] }), _jsxs("span", { className: "text-[10px] font-chakrapetch font-semibold tracking-wide uppercase text-flash/45 truncate mt-0.5", children: [_jsx("span", { className: "text-jade/55 mr-1", children: p.region }), "\u00B7 ", p.playerDisplayName] })] }), _jsx("div", { className: "grid grid-cols-[28px_1fr] gap-2 items-center relative z-10 pl-3", children: p.currentRank ? (_jsxs(_Fragment, { children: [_jsx("img", { src: getRankImage(p.currentRank.tier), alt: p.currentRank.tier, className: "w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-110" }), _jsxs("div", { className: "flex flex-col items-start leading-tight min-w-0", children: [_jsxs("span", { className: cn("text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium truncate", rankColorClass(p.currentRank.tier)), children: [p.currentRank.tier.slice(0, 3), p.currentRank.rankDivision
                                                                        ? ` ${p.currentRank.rankDivision}`
                                                                        : ""] }), _jsxs("span", { className: "font-geist font-bold tabular-nums text-[12px] text-flash/70", children: [p.currentRank.lp.toLocaleString(), _jsx("span", { className: "text-[8px] text-flash/30 ml-0.5", children: "LP" })] })] })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-7 h-7" }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/30", children: "UNRANKED" })] })) }), _jsxs("div", { className: "flex flex-col items-center relative z-10", children: [p.balance === 0 ? (_jsx("span", { className: "text-[13px] font-chakrapetch font-bold tabular-nums text-flash/30", children: "\u2014" })) : (_jsxs("span", { className: cn("text-[14px] font-chakrapetch font-bold tabular-nums", p.balance > 0 ? "text-jade" : "text-red-400/80"), style: p.balance > 0
                                                        ? { textShadow: "0 0 10px rgba(0,217,146,0.35)" }
                                                        : { textShadow: "0 0 10px rgba(239,68,68,0.25)" }, children: [p.balance > 0 ? "+" : "", p.balance] })), _jsx("span", { className: "text-[8px] font-jetbrains tracking-[0.2em] uppercase text-flash/30 mt-0.5", children: "LP" })] }), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsxs("span", { className: "text-[10px] font-jetbrains text-jade/70 tabular-nums", children: [p.wins, "W"] }), _jsxs("span", { className: "text-[10px] font-jetbrains text-red-400/50 tabular-nums", children: [p.losses, "L"] })] }), _jsx("div", { className: "relative h-[3px] rounded-[1px] overflow-hidden", style: { background: "rgba(239,68,68,0.08)" }, children: _jsx("div", { className: "absolute inset-y-0 left-0 rounded-[1px] transition-all duration-700 ease-out", style: {
                                                            width: `${total > 0 ? (p.wins / total) * 100 : 50}%`,
                                                            background: winrate >= 60
                                                                ? "linear-gradient(90deg, rgba(0,217,146,0.3), rgba(0,217,146,0.6))"
                                                                : winrate >= 52
                                                                    ? "linear-gradient(90deg, rgba(0,217,146,0.2), rgba(0,217,146,0.45))"
                                                                    : "linear-gradient(90deg, rgba(215,216,217,0.1), rgba(215,216,217,0.25))",
                                                            boxShadow: winrate >= 55 ? "0 0 6px rgba(0,217,146,0.2)" : "none",
                                                        } }) })] }), _jsx("div", { className: "flex gap-1 justify-center relative z-10", children: topChamps.slice(0, 3).map((c) => {
                                                const champNameFromKey = keyToName[c.champion] ?? c.champion;
                                                return (_jsx("div", { title: `${c.champion} ${c.winrate}% WR (${c.games}g)`, children: _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(champNameFromKey)}.png`, alt: "", className: "w-7 h-7 rounded-full border border-flash/[0.08] transition-transform duration-200 hover:scale-110", onError: (e) => {
                                                            e.currentTarget.style.display = "none";
                                                        } }) }, c.champion));
                                            }) }), _jsxs("span", { className: cn("text-right font-jetbrains font-medium tabular-nums text-[13px] relative z-10", winrate >= 55
                                                ? "text-jade"
                                                : winrate >= 48
                                                    ? "text-flash/75"
                                                    : "text-red-400/70"), children: [winrate, "%"] })] }, p.puuid));
                            }))] })] }), _jsx(LpTimelineChart, { slug: slug, refreshTick: refreshTick }), _jsx(BountyLeaderboardPanel, { slug: slug, refreshTick: refreshTick })] }));
}
// Tier abbreviations + Y-axis tick helpers (mirror of backend ladderScore).
const LP_TIERS_ORDER = [
    "IRON",
    "BRONZE",
    "SILVER",
    "GOLD",
    "PLATINUM",
    "EMERALD",
    "DIAMOND",
    "MASTER",
    "GRANDMASTER",
    "CHALLENGER",
];
const LP_TIER_ABBR = {
    IRON: "I",
    BRONZE: "B",
    SILVER: "S",
    GOLD: "G",
    PLATINUM: "P",
    EMERALD: "E",
    DIAMOND: "D",
    MASTER: "M",
    GRANDMASTER: "GM",
    CHALLENGER: "C",
};
/** Inverse of ladderScore (400 LP per tier, 100 LP per division).
 *
 *   Score=0    → I4 (IRON IV)         tierIdx=0  rem=0   → div 1 → "I4"
 *   Score=399  → I1 (IRON I 99 LP)    tierIdx=0  rem=399 → div 4 → "I1"
 *   Score=400  → B4 (BRONZE IV 0)     tierIdx=1
 *   Score=1950 → P1 (PLATINUM I 50)   tierIdx=4  rem=350 → div 4 → "P1"
 *   Score=2800 → M  (MASTER 0)        tierIdx=7  → "M"
 *
 *  IRON..DIAMOND: tier_idx = floor(score/400), div = floor((score%400)/100)+1
 *  where div 1=IV, 2=III, 3=II, 4=I. We render as the number 5-divIdx? No
 *  — division index here already is 1=IV..4=I, so display number = 5-divIdx
 *  is wrong. We want IV=4, III=3, II=2, I=1 as displayed. So:
 *      div index 1 → "4"  (IV → "4")
 *      div index 2 → "3"  (III → "3")
 *      div index 3 → "2"  (II → "2")
 *      div index 4 → "1"  (I → "1")
 *  → displayNum = 5 − divIdx. Yep, that holds.
 */
const LP_PER_DIVISION_FE = 100;
const LP_PER_TIER_FE = 400; // 4 divisions × 100
function scoreToRankShort(score) {
    if (score < 0)
        return "—";
    const masterStart = 7 * LP_PER_TIER_FE; // 2800
    if (score >= masterStart) {
        // Pick MASTER / GRANDMASTER / CHALLENGER by raw LP brackets that
        // roughly match Riot's ladder gating. We only know the tier from the
        // backend payload itself, but for an abbreviation an "M" is fine.
        return LP_TIER_ABBR[LP_TIERS_ORDER[7]];
    }
    const tierIdx = Math.max(0, Math.min(6, Math.floor(score / LP_PER_TIER_FE)));
    const tierAbbr = LP_TIER_ABBR[LP_TIERS_ORDER[tierIdx]];
    const rem = score - tierIdx * LP_PER_TIER_FE; // 0..399
    const divIdx = Math.max(1, Math.min(4, Math.floor(rem / LP_PER_DIVISION_FE) + 1));
    return `${tierAbbr}${5 - divIdx}`;
}
/** Same as above but also returns the LP-within-division for tooltips. */
function scoreParts(score) {
    if (score < 0)
        return { rankShort: "—", lpInDiv: 0 };
    const masterStart = 7 * LP_PER_TIER_FE;
    if (score >= masterStart) {
        return {
            rankShort: LP_TIER_ABBR[LP_TIERS_ORDER[7]],
            lpInDiv: score - masterStart, // raw uncapped LP
        };
    }
    const tierIdx = Math.max(0, Math.min(6, Math.floor(score / LP_PER_TIER_FE)));
    const rem = score - tierIdx * LP_PER_TIER_FE;
    const divIdx = Math.max(1, Math.min(4, Math.floor(rem / LP_PER_DIVISION_FE) + 1));
    return {
        rankShort: `${LP_TIER_ABBR[LP_TIERS_ORDER[tierIdx]]}${5 - divIdx}`,
        lpInDiv: rem - (divIdx - 1) * LP_PER_DIVISION_FE,
    };
}
/** Y-axis ticks: every (tier, division) edge inside [lo, hi]. */
function lpYTicks(lo, hi) {
    const out = [];
    for (let t = 0; t < LP_TIERS_ORDER.length; t++) {
        if (t >= 7) {
            const s = t * LP_PER_TIER_FE;
            if (s >= lo && s <= hi) {
                out.push({ score: s, label: LP_TIER_ABBR[LP_TIERS_ORDER[t]] });
            }
        }
        else {
            // Division floors. d 1=IV..4=I → labels 4..1.
            for (let d = 1; d <= 4; d++) {
                const s = t * LP_PER_TIER_FE + (d - 1) * LP_PER_DIVISION_FE;
                if (s >= lo && s <= hi) {
                    out.push({
                        score: s,
                        label: `${LP_TIER_ABBR[LP_TIERS_ORDER[t]]}${5 - d}`,
                    });
                }
            }
        }
    }
    // If the range is huge, thin to ~8 ticks for legibility.
    if (out.length > 10) {
        const stride = Math.ceil(out.length / 8);
        return out.filter((_, i) => i % stride === 0 || i === out.length - 1);
    }
    return out;
}
function LpTimelineChart({ slug, refreshTick, }) {
    // Default to "today" so fresh lobbies show meaningful intra-day movement
    // instead of a single Day bucket that renders as a near-invisible dot.
    const [period, setPeriod] = useState("today");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    // null = ALL players overlaid; otherwise a specific playerId
    const [selectedPlayerId, setSelectedPlayerId] = useState(null);
    // Only meaningful when a single player is isolated. null = show every
    // linked account; otherwise restrict the chart to just that puuid.
    const [selectedAccountPuuid, setSelectedAccountPuuid] = useState(null);
    const [hoverBucket, setHoverBucket] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE_URL}/api/scout/lp-timeline/${slug}?period=${period}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !cancelled && setData(d))
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, period, refreshTick]);
    // Auto-generated palette for players whose color is null in the
    // backend payload — without it every line falls back to JADE and the
    // chart turns into a single tangle. Hand-picked HSL hues that read
    // distinctly against the liquirice background.
    const AUTO_PALETTE = useMemo(() => [
        "#5BA8E6", // cyan-blue
        "#FFB615", // citrine
        "#d63336", // red
        "#9b59b6", // purple
        "#e67e22", // orange
        "#1abc9c", // teal
        "#f1c40f", // sun yellow
        "#FF6B9D", // pink
        "#7CFFB2", // mint
        "#A98AFF", // lavender
    ], []);
    const visibleLines = useMemo(() => {
        if (!data)
            return [];
        const out = [];
        data.players.forEach((p, pIdx) => {
            if (p.accounts.length === 0)
                return;
            // If the backend gave us a color, use it; otherwise pick from the
            // palette based on the player's index in the lobby so the assignment
            // is stable across renders.
            const accent = p.color || AUTO_PALETTE[pIdx % AUTO_PALETTE.length];
            const primary = p.accounts.find((a) => a.isPrimary) ?? p.accounts[0];
            if (selectedPlayerId == null) {
                // Multi-player overlay → just the primary line per player.
                out.push({
                    lineId: `${p.playerId}:${primary.puuid}`,
                    label: p.displayName,
                    accent,
                    isPrimary: true,
                    dashArray: null,
                    opacity: 1,
                    iconId: primary.iconId,
                    account: primary,
                    playerId: p.playerId,
                });
                return;
            }
            if (p.playerId !== selectedPlayerId)
                return;
            // Single-player view → optionally restricted to one account.
            let order = 0;
            for (const acc of p.accounts) {
                if (selectedAccountPuuid != null && acc.puuid !== selectedAccountPuuid)
                    continue;
                const label = p.accounts.length === 1
                    ? p.displayName
                    : `${p.displayName} · ${acc.riotName}`;
                const isPrim = acc.isPrimary;
                // Style: primary solid full-opacity. Secondary accounts get a
                // dashed stroke + slight transparency so the lines don't read as
                // the same data twice.
                const dash = isPrim ? null : order === 1 ? "1.4 0.8" : "0.8 0.6";
                const opacity = isPrim ? 1 : 0.75;
                out.push({
                    lineId: `${p.playerId}:${acc.puuid}`,
                    label,
                    accent,
                    isPrimary: isPrim,
                    dashArray: dash,
                    opacity,
                    iconId: acc.iconId,
                    account: acc,
                    playerId: p.playerId,
                });
                order++;
            }
        });
        return out;
    }, [data, selectedPlayerId, selectedAccountPuuid, AUTO_PALETTE]);
    // Chart geometry. Tall enough that 7-8 tier divisions (the typical
    // y-axis range when the lobby spans Iron → Master) have room to
    // breathe. Every stroke uses vectorEffect="non-scaling-stroke" so
    // line widths stay consistent regardless of container scale.
    const CHART = { W: 1000, H: 420 };
    const { minY, maxY, yTicks, lines, hoverPoints, } = useMemo(() => {
        if (!data || data.buckets.length === 0 || visibleLines.length === 0) {
            return {
                minY: 0,
                maxY: 0,
                yTicks: [],
                lines: [],
                hoverPoints: [],
            };
        }
        const { W, H } = CHART;
        const N = data.buckets.length;
        let lo = Number.POSITIVE_INFINITY;
        let hi = Number.NEGATIVE_INFINITY;
        for (const ln of visibleLines) {
            for (const v of ln.account.scores) {
                if (v == null)
                    continue;
                if (v < lo)
                    lo = v;
                if (v > hi)
                    hi = v;
            }
        }
        if (!isFinite(lo) || !isFinite(hi)) {
            lo = 0;
            hi = 100;
        }
        // Snap [lo, hi] to the nearest tier-division boundary inside, then add a
        // tiny breath so the line never lives on the top/bottom edge.
        const span = Math.max(50, hi - lo);
        const pad = Math.max(40, span * 0.12);
        lo = Math.max(0, lo - pad);
        hi = hi + pad;
        if (lo === hi)
            hi = lo + 100;
        const x = (i) => (N === 1 ? W / 2 : (i / (N - 1)) * W);
        const y = (score) => H - ((score - lo) / (hi - lo)) * H;
        // Step-after path: between two snapshots the LP is "the last known
        // value" — it doesn't smoothly interpolate, it stays put until the
        // next game changes it. So the truthful render is a staircase:
        // horizontal at y_i until x_{i+1}, then vertical to y_{i+1}.
        //
        // (We use straight L commands so the stair corners are sharp; round
        // joins on the stroke soften them just a touch on hover.)
        function stepPath(pts) {
            if (pts.length === 0)
                return "";
            let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
            for (let i = 1; i < pts.length; i++) {
                // Horizontal first (carry previous LP to new x), then vertical
                // (snap to new LP). That's the "step-after" convention.
                d += ` L ${pts[i].x.toFixed(2)} ${pts[i - 1].y.toFixed(2)}`;
                d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
            }
            return d;
        }
        const lines = visibleLines.map((ln) => {
            const runs = [];
            let cur = null;
            for (let i = 0; i < N; i++) {
                const v = ln.account.scores[i];
                if (v == null) {
                    cur = null;
                    continue;
                }
                const px = x(i);
                const py = y(v);
                if (!cur) {
                    cur = { pts: [] };
                    runs.push(cur);
                }
                cur.pts.push({ x: px, y: py, score: v, bucket: i });
            }
            const runGeoms = runs.map((r) => {
                const pathLine = stepPath(r.pts);
                const areaPath = r.pts.length >= 2
                    ? `${pathLine} L ${r.pts[r.pts.length - 1].x} ${H} L ${r.pts[0].x} ${H} Z`
                    : "";
                return { pathLine, pathArea: areaPath, pts: r.pts };
            });
            const lastPt = (() => {
                for (const r of runs) {
                    if (r.pts.length > 0) {
                        const last = r.pts[r.pts.length - 1];
                        return last;
                    }
                }
                return null;
            })();
            // We want the absolute final non-null score regardless of run order
            let finalScore = null;
            let finalY = null;
            for (let i = N - 1; i >= 0; i--) {
                const v = ln.account.scores[i];
                if (v != null) {
                    finalScore = v;
                    finalY = y(v);
                    break;
                }
            }
            void lastPt; // kept in case we want last-of-first-run later
            return {
                lineId: ln.lineId,
                color: ln.accent,
                runs: runGeoms,
                finalY,
                finalScore,
                dashArray: ln.dashArray,
                opacity: ln.opacity,
                label: ln.label,
            };
        });
        const hb = hoverBucket;
        const hoverPoints = [];
        if (hb != null && hb >= 0 && hb < N) {
            for (const ln of visibleLines) {
                const v = ln.account.scores[hb];
                if (v == null)
                    continue;
                // Find the previous non-null snapshot so the tooltip can show
                // the precise LP delta at this point ("+15 LP since last game").
                let prevScore = null;
                for (let i = hb - 1; i >= 0; i--) {
                    const pv = ln.account.scores[i];
                    if (pv != null) {
                        prevScore = pv;
                        break;
                    }
                }
                hoverPoints.push({
                    x: x(hb),
                    y: y(v),
                    color: ln.accent,
                    lineId: ln.lineId,
                    score: v,
                    prevScore,
                    label: ln.label,
                });
            }
        }
        return { minY: lo, maxY: hi, yTicks: lpYTicks(lo, hi), lines, hoverPoints };
    }, [data, visibleLines, hoverBucket]);
    const hasData = !!data &&
        data.players.some((p) => p.accounts.some((a) => a.scores.some((s) => s != null)));
    // Label spacing — show ~6 evenly spaced labels along x-axis to avoid clutter
    const labelStep = data
        ? Math.max(1, Math.ceil(data.buckets.length / 6))
        : 1;
    return (_jsxs("div", { className: cn(glassDark, "p-5"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1]", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("span", { style: { color: JADE, fontSize: "12px" }, children: "\u25C6" }), _jsx("span", { className: "text-[13px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium", children: "LP Timeline" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" }), _jsx("div", { className: "flex items-center gap-1", children: ["today", "day", "week", "month"].map((p) => (_jsx("button", { type: "button", onClick: () => setPeriod(p), className: cn("text-[10px] font-jetbrains tracking-[0.2em] uppercase px-3 py-1.5 rounded-[3px] transition-all cursor-clicker font-medium", period === p
                                        ? "bg-jade/[0.15] text-jade border border-jade/40"
                                        : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"), children: p === "today"
                                        ? "Today"
                                        : p === "day"
                                            ? "Day"
                                            : p === "week"
                                                ? "Week"
                                                : "Month" }, p))) })] }), data && data.players.length > 0 && (_jsxs("div", { className: "flex flex-col gap-2 mb-4", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsxs("button", { type: "button", onClick: () => {
                                            setSelectedPlayerId(null);
                                            setSelectedAccountPuuid(null);
                                        }, className: cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium transition-all cursor-clicker border", selectedPlayerId == null
                                            ? "border-jade/40 bg-jade/[0.10] text-jade"
                                            : "border-flash/15 text-flash/45 hover:text-flash/75 hover:bg-flash/[0.04]"), children: [_jsx(Users, { className: "w-3 h-3" }), "All"] }), data.players.map((p) => {
                                        const accent = p.color || JADE;
                                        const active = selectedPlayerId === p.playerId;
                                        const primary = p.accounts.find((a) => a.isPrimary) ?? p.accounts[0];
                                        const finalScore = primary?.finalScore ?? null;
                                        return (_jsxs("button", { type: "button", onClick: () => {
                                                setSelectedPlayerId(active ? null : p.playerId);
                                                setSelectedAccountPuuid(null);
                                            }, className: cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium transition-all cursor-clicker border", active
                                                ? "bg-flash/[0.05] text-flash/90"
                                                : "border-transparent text-flash/45 hover:text-flash/75 hover:bg-flash/[0.04]"), style: active
                                                ? {
                                                    borderColor: `color-mix(in srgb, ${accent} 50%, transparent)`,
                                                    boxShadow: `0 0 12px color-mix(in srgb, ${accent} 25%, transparent)`,
                                                }
                                                : undefined, children: [profileIconUrl(primary?.iconId ?? null) ? (_jsx("img", { src: profileIconUrl(primary?.iconId ?? null), alt: "", className: "w-4 h-4 rounded-full", style: { border: `1px solid ${accent}` } })) : (_jsx("span", { className: "w-2 h-2 rounded-full", style: { background: accent, boxShadow: `0 0 4px ${accent}` } })), _jsx("span", { children: p.displayName }), finalScore != null && (_jsx("span", { className: "tabular-nums font-bold opacity-80", style: { color: accent }, children: scoreToRankShort(finalScore) })), p.accounts.length > 1 && (_jsxs("span", { className: "text-[8px] font-mono text-flash/30 tabular-nums", children: ["\u00D7", p.accounts.length] }))] }, p.playerId));
                                    })] }), (() => {
                                if (selectedPlayerId == null)
                                    return null;
                                const player = data.players.find((p) => p.playerId === selectedPlayerId);
                                if (!player || player.accounts.length < 2)
                                    return null;
                                const accent = player.color || JADE;
                                return (_jsxs("div", { className: "flex items-center gap-2 flex-wrap pl-3 ml-1 border-l border-flash/10", children: [_jsx("button", { type: "button", onClick: () => setSelectedAccountPuuid(null), className: cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border", selectedAccountPuuid == null
                                                ? "bg-flash/[0.05] text-flash/85"
                                                : "border-transparent text-flash/35 hover:text-flash/70 hover:bg-flash/[0.04]"), style: selectedAccountPuuid == null
                                                ? {
                                                    borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
                                                }
                                                : undefined, children: "All accounts" }), player.accounts.map((acc) => {
                                            const active = selectedAccountPuuid === acc.puuid;
                                            return (_jsxs("button", { type: "button", onClick: () => setSelectedAccountPuuid(active ? null : acc.puuid), className: cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border", active
                                                    ? "bg-flash/[0.05] text-flash/85"
                                                    : "border-transparent text-flash/35 hover:text-flash/70 hover:bg-flash/[0.04]"), style: active
                                                    ? {
                                                        borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
                                                        boxShadow: `0 0 10px color-mix(in srgb, ${accent} 22%, transparent)`,
                                                    }
                                                    : undefined, children: [profileIconUrl(acc.iconId) ? (_jsx("img", { src: profileIconUrl(acc.iconId), alt: "", className: "w-3.5 h-3.5 rounded-full", style: { border: `1px solid ${accent}` } })) : (_jsx("span", { className: "w-1.5 h-1.5 rounded-full", style: { background: accent } })), _jsx("span", { className: "text-jade/55 mr-0.5", children: acc.region }), _jsx("span", { children: acc.riotName }), _jsxs("span", { className: "text-flash/25", children: ["#", acc.riotTag] }), acc.isPrimary && (_jsx("span", { className: "text-[7px] font-mono tracking-widest text-jade/60 ml-0.5", children: "MAIN" })), acc.finalScore != null && (_jsx("span", { className: "tabular-nums font-bold opacity-80 ml-0.5", style: { color: accent }, children: scoreToRankShort(acc.finalScore) }))] }, acc.puuid));
                                        })] }));
                            })()] })), loading ? (_jsx("div", { className: "h-[260px] flex items-center justify-center text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/30", children: "Loading\u2026" })) : !hasData ? (_jsx("div", { className: "h-[260px] flex items-center justify-center text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/30", children: "Not enough rank data yet \u2014 keep playing." })) : (_jsxs("div", { className: "relative pl-9", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-6 w-9 pointer-events-none", children: yTicks.map((t) => {
                                    const range = maxY - minY || 1;
                                    const topPct = 100 - ((t.score - minY) / range) * 100;
                                    if (topPct < -2 || topPct > 102)
                                        return null;
                                    return (_jsxs("div", { className: "absolute right-1 -translate-y-1/2 flex items-center gap-1", style: { top: `${topPct}%` }, children: [_jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/45 tabular-nums", children: t.label }), _jsx("span", { className: "w-1.5 h-[1px] bg-flash/20" })] }, t.score));
                                }) }), _jsxs("svg", { viewBox: `0 0 ${CHART.W} ${CHART.H}`, preserveAspectRatio: "none", className: "w-full h-[260px] block lp-chart", onMouseLeave: () => setHoverBucket(null), onMouseMove: (e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
                                    if (!data)
                                        return;
                                    const N = data.buckets.length;
                                    const idx = Math.round((xPct / 100) * (N - 1));
                                    setHoverBucket(Math.max(0, Math.min(N - 1, idx)));
                                }, children: [_jsxs("defs", { children: [lines.map((ln) => (_jsxs("linearGradient", { id: `lp-grad-${ln.lineId}`, x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: ln.color, stopOpacity: 0.35 }), _jsx("stop", { offset: "100%", stopColor: ln.color, stopOpacity: 0 })] }, `g-${ln.lineId}`))), _jsxs("filter", { id: "lp-glow", x: "-20%", y: "-20%", width: "140%", height: "140%", children: [_jsx("feGaussianBlur", { stdDeviation: "1.6", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), yTicks.map((t) => {
                                        const range = maxY - minY || 1;
                                        const yy = CHART.H - ((t.score - minY) / range) * CHART.H;
                                        if (yy < -1 || yy > CHART.H + 1)
                                            return null;
                                        const isTierEdge = t.score % LP_PER_TIER_FE === 0;
                                        return (_jsx("line", { x1: "0", x2: CHART.W, y1: yy, y2: yy, stroke: isTierEdge ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)", strokeWidth: "1", vectorEffect: "non-scaling-stroke" }, t.score));
                                    }), lines.length === 1 &&
                                        lines.map((ln) => ln.runs.map((r, idx) => r.pathArea ? (_jsx("path", { d: r.pathArea, fill: `url(#lp-grad-${ln.lineId})`, opacity: 0.95 }, `area-${ln.lineId}-${idx}`)) : null)), lines.map((ln) => ln.runs.map((r, idx) => (_jsx("path", { d: r.pathLine, fill: "none", stroke: ln.color, strokeWidth: lines.length === 1 ? 2.8 : 2.2, strokeLinejoin: "round", strokeLinecap: "round", strokeDasharray: ln.dashArray ?? undefined, opacity: ln.opacity, vectorEffect: "non-scaling-stroke", style: {
                                            filter: `drop-shadow(0 0 4px color-mix(in srgb, ${ln.color} 55%, transparent))`,
                                            // Entry animation — sweep stroke from left to right
                                            // using a CSS animation on stroke-dasharray. Single
                                            // line per element so it works even for runs.
                                            animation: `lp-draw 700ms cubic-bezier(.4,0,.2,1) forwards`,
                                            strokeDasharray: 2000,
                                            strokeDashoffset: 2000,
                                        } }, `line-${ln.lineId}-${idx}`)))), lines.length === 1 &&
                                        lines.map((ln) => ln.runs.flatMap((r) => r.pts.map((pt) => {
                                            const isHovered = hoverBucket === pt.bucket;
                                            return (_jsxs("g", { style: {
                                                    animation: "lp-dot-pop 480ms cubic-bezier(.34,1.56,.64,1) forwards",
                                                    transformOrigin: `${pt.x}px ${pt.y}px`,
                                                    animationDelay: `${380 + pt.bucket * 18}ms`,
                                                    opacity: 0,
                                                    cursor: "pointer",
                                                    transition: "all 160ms ease-out",
                                                }, children: [_jsx("circle", { cx: pt.x, cy: pt.y, r: isHovered ? 11 : 7, fill: ln.color, opacity: isHovered ? 0.22 : 0.12 }), _jsx("circle", { cx: pt.x, cy: pt.y, r: isHovered ? 6 : 4.2, fill: ln.color, opacity: isHovered ? 0.5 : 0.32 }), _jsx("circle", { cx: pt.x, cy: pt.y, r: isHovered ? 3 : 2.2, fill: "#040A0C", stroke: ln.color, strokeWidth: isHovered ? 2 : 1.5, vectorEffect: "non-scaling-stroke" })] }, `pt-${ln.lineId}-${pt.bucket}`));
                                        }))), lines.map((ln) => ln.finalY != null ? (_jsxs("g", { opacity: ln.opacity, children: [_jsx("circle", { cx: CHART.W - 10, cy: ln.finalY, r: 14, fill: ln.color, opacity: 0.12 }), _jsx("circle", { cx: CHART.W - 10, cy: ln.finalY, r: 8, fill: ln.color, opacity: 0.32 }), _jsx("circle", { cx: CHART.W - 10, cy: ln.finalY, r: 4, fill: ln.color, stroke: "#040A0C", strokeWidth: 1.5, vectorEffect: "non-scaling-stroke" })] }, `end-${ln.lineId}`)) : null), hoverBucket != null && data && hoverPoints.length > 0 && (_jsxs("g", { children: [_jsx("line", { x1: hoverPoints[0].x, x2: hoverPoints[0].x, y1: 0, y2: CHART.H, stroke: "rgba(0,217,146,0.45)", strokeWidth: 1.5, strokeDasharray: "4 3", vectorEffect: "non-scaling-stroke" }), lines.length > 1 &&
                                                hoverPoints.map((pt) => (_jsxs("g", { children: [_jsx("circle", { cx: pt.x, cy: pt.y, r: 11, fill: pt.color, opacity: 0.22 }), _jsx("circle", { cx: pt.x, cy: pt.y, r: 6, fill: pt.color, opacity: 0.5 }), _jsx("circle", { cx: pt.x, cy: pt.y, r: 3, fill: "#040A0C", stroke: pt.color, strokeWidth: 2, vectorEffect: "non-scaling-stroke" })] }, `hover-${pt.lineId}`)))] }))] }), hoverBucket != null && data && hoverPoints.length > 0 && (() => {
                                const sortedPts = [...hoverPoints].sort((a, b) => a.y - b.y);
                                const anchor = sortedPts[0];
                                const leftPct = (anchor.x / CHART.W) * 100;
                                const topPx = Math.max(26, Math.min(234, (anchor.y / CHART.H) * 260));
                                const placeRight = leftPct < 55;
                                return (_jsx("div", { className: "absolute left-9 right-0 top-0 h-[260px] pointer-events-none z-10", children: _jsx("div", { className: "absolute", style: {
                                            left: `${leftPct}%`,
                                            top: `${topPx}px`,
                                            transform: placeRight
                                                ? "translate(14px, -50%)"
                                                : "translate(calc(-100% - 14px), -50%)",
                                            animation: "lp-tip-in 180ms ease-out",
                                        }, children: _jsxs("div", { className: cn(glassDark, "px-3 py-2 min-w-[180px] border border-flash/10"), style: {
                                                boxShadow: "0 8px 24px -8px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
                                            }, children: [_jsx("div", { className: "text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mb-1.5", children: data.buckets[hoverBucket]?.label }), _jsx("div", { className: "flex flex-col gap-1", children: hoverPoints.map((pt) => {
                                                        const delta = pt.prevScore != null
                                                            ? pt.score - pt.prevScore
                                                            : null;
                                                        return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full shrink-0", style: {
                                                                        background: pt.color,
                                                                        boxShadow: `0 0 6px ${pt.color}`,
                                                                    } }), _jsx("span", { className: "text-[10px] font-jetbrains text-flash/70 mr-auto truncate max-w-[110px]", children: pt.label }), _jsx("span", { className: "font-bold text-[11px] font-chakrapetch tabular-nums uppercase tracking-wider", style: { color: pt.color }, children: scoreToRankShort(pt.score) }), _jsxs("span", { className: "text-[10px] text-flash/55 tabular-nums font-jetbrains", children: [pt.score % 100, _jsx("span", { className: "text-flash/30 ml-0.5", children: "LP" })] }), delta != null && delta !== 0 && (_jsxs("span", { className: cn("text-[9px] tabular-nums font-jetbrains font-bold pl-1.5 ml-0.5 border-l border-flash/10", delta > 0
                                                                        ? "text-jade"
                                                                        : "text-red-400/90"), children: [delta > 0 ? "+" : "", delta] }))] }, pt.lineId));
                                                    }) })] }) }) }));
                            })(), _jsx("style", { children: `
              @keyframes lp-draw {
                to { stroke-dashoffset: 0; }
              }
              @keyframes lp-dot-pop {
                from { opacity: 0; transform: scale(0.2); }
                60%  { opacity: 1; transform: scale(1.2); }
                to   { opacity: 1; transform: scale(1); }
              }
              @keyframes lp-tip-in {
                from { opacity: 0; transform: translate(0, -50%) scale(0.94); }
                to   { opacity: 1; transform: translate(0, -50%) scale(1); }
              }
            ` }), _jsx("div", { className: "relative mt-2 h-4", children: data?.buckets.map((b, i) => {
                                    if (i % labelStep !== 0 && i !== data.buckets.length - 1)
                                        return null;
                                    const N = data.buckets.length;
                                    const left = N === 1 ? 50 : (i / (N - 1)) * 100;
                                    return (_jsx("span", { className: "absolute -translate-x-1/2 text-[8px] font-jetbrains tracking-[0.18em] uppercase text-flash/30 whitespace-nowrap", style: { left: `${left}%` }, children: b.label }, b.bucketStart));
                                }) })] }))] })] }));
}
function StatsTab({ slug }) {
    const [period, setPeriod] = useState("day");
    const [buckets, setBuckets] = useState([]);
    const [bucketsLoading, setBucketsLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setBucketsLoading(true);
        fetch(`${API_BASE_URL}/api/scout/stats/${slug}?period=${period}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !cancelled && setBuckets(d?.buckets ?? []))
            .catch(console.error)
            .finally(() => !cancelled && setBucketsLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, period]);
    return (_jsxs("div", { className: cn(glassDark, "p-5"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1]", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("span", { style: { color: JADE, fontSize: "12px" }, children: "\u25C8" }), _jsx("span", { className: "text-[13px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium", children: "Activity Trend" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" }), _jsx("div", { className: "flex items-center gap-1", children: ["day", "week", "month"].map((p) => (_jsx("button", { type: "button", onClick: () => setPeriod(p), className: cn("text-[10px] font-jetbrains tracking-[0.2em] uppercase px-3 py-1.5 rounded-[3px] transition-all cursor-clicker font-medium", period === p
                                        ? "bg-jade/[0.15] text-jade border border-jade/40"
                                        : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"), children: p === "day" ? "Daily" : p === "week" ? "Weekly" : "Monthly" }, p))) })] }), bucketsLoading ? (_jsx("div", { className: "py-12 flex items-center justify-center", children: _jsx(Loader2, { className: "w-4 h-4 text-jade animate-spin" }) })) : (_jsx(TrendChart, { buckets: buckets }))] })] }));
}
/* ─── sidebar leaderboard — always visible on the right ─────────────── */
function SidebarLeaderboard({ slug, refreshTick, }) {
    // Default to "all" so the widgets show meaningful data on first load —
    // a fresh lobby with only a couple of games today would otherwise render
    // "no games yet" everywhere.
    const [window, setWindow] = useState("all");
    const [leaderboard, setLeaderboard] = useState([]);
    const [topDuoStreak, setTopDuoStreak] = useState(null);
    const [topDuoWinrate, setTopDuoWinrate] = useState(null);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        // For "today", send the client's LOCAL midnight as the cutoff.
        // The backend's default `today` uses UTC midnight, which means at
        // 01:56 CEST the widget would still count everything played after
        // UTC 00:00 (= 02:00 local the previous day) — i.e. nearly 24h
        // worth of games labelled as "today". With `since` overriding it
        // server-side, the reset happens at the user's local midnight as
        // they expect.
        const params = new URLSearchParams({ window });
        if (window === "today") {
            const now = new Date();
            const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            params.set("since", localMidnight.toISOString());
        }
        fetch(`${API_BASE_URL}/api/scout/leaderboard/${slug}?${params.toString()}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
            if (cancelled)
                return;
            setLeaderboard(d?.accounts ?? []);
            setTopDuoStreak(d?.topDuoStreak ?? null);
            setTopDuoWinrate(d?.topDuoWinrate ?? null);
        })
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, window, refreshTick]);
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(DailyBountyBox, { slug: slug, refreshTick: refreshTick }), _jsxs("div", { className: cn(glassDark, "p-3"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsx("div", { className: "relative z-[1] flex items-center gap-1", children: ["today", "week", "all"].map((w) => (_jsx("button", { type: "button", onClick: () => setWindow(w), className: cn("flex-1 text-[10px] font-jetbrains tracking-[0.2em] uppercase py-2 rounded-[3px] transition-all cursor-clicker font-medium", window === w
                                ? "bg-jade/[0.15] text-jade border border-jade/40"
                                : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"), children: w === "today" ? "Today" : w === "week" ? "Week" : "All" }, w))) })] }), _jsx(LeaderboardStatBox, { loading: loading, icon: _jsx(Trophy, { className: "w-3.5 h-3.5" }), label: topPlayerLabel(window), player: pickPlayerOfDay(leaderboard), highlightFn: (p) => (p.deaths === 0 ? "PERF" : p.avgKda.toFixed(2)), highlightLabel: "KDA", emptyText: "No games tracked" }), _jsx(LeaderboardStatBox, { loading: loading, icon: _jsx(TrendingUp, { className: "w-3.5 h-3.5" }), label: "Highest LP Gain", player: pickHighestLp(leaderboard), highlightFn: (p) => `${p.balance > 0 ? "+" : ""}${p.balance}`, highlightLabel: "LP", emptyText: "No rank data" }), _jsx(TopWinrateOrDuoBox, { loading: loading, leaderboard: leaderboard, topDuoWinrate: topDuoWinrate }), _jsx(LeaderboardStatBox, { loading: loading, icon: _jsx(Gamepad2, { className: "w-3.5 h-3.5" }), label: "Most Games", player: pickMostGames(leaderboard), highlightFn: (p) => String(p.games), highlightLabel: "Games", emptyText: "No games tracked" }), _jsx(LongestStreakBox, { loading: loading, leaderboard: leaderboard, topDuoStreak: topDuoStreak })] }));
}
// Window-aware label for the top KDA widget.
function topPlayerLabel(w) {
    if (w === "today")
        return "Player of the Day";
    if (w === "week")
        return "Player of the Week";
    return "Top Player";
}
// Small-sample calibration for the top-stat widgets.
//
// Raw stat sorting (highest avgKda / highest winrate) is misleading when
// game counts vary wildly across a lobby. A player with 7 KDA over 3 games
// shouldn't outrank one with 4 KDA over 20 games — the first is largely
// noise, the second is a confirmed pattern. Two mechanisms address this:
//
// 1. Adaptive minimum-games gate. To qualify as Top Player / Best Winrate,
//    a player must have at least ~25% of the lobby's most-active player's
//    games (floored at 3). In a lobby where the grinder has 20 games,
//    anyone with fewer than 5 is excluded; in a fresh lobby with only 4
//    games per player, the floor of 3 still applies. If the threshold
//    excludes everyone (fresh lobby with all 1-2 game players), we relax
//    to "any player with at least 1 game" so the widget still renders.
//
// 2. Stat-appropriate smoothing on top of the gate:
//    - KDA: Bayesian shrinkage toward the lobby's weighted-average KDA,
//      with PRIOR_WEIGHT acting like 10 "ghost games at average KDA" added
//      to each player. Small-sample outliers get pulled hard toward the
//      mean; high-game-count averages stay essentially unchanged.
//    - Winrate: Wilson lower confidence bound (z ≈ 1.96, 95% CI). This
//      naturally penalizes small samples — a 3-0 record (100% over 3)
//      ranks below a 12-8 (60% over 20) because the lower bound on the
//      first is much lower than the lower bound on the second.
function adaptiveMinGames(rows) {
    const maxGames = rows.reduce((m, p) => (p.games > m ? p.games : m), 0);
    return Math.max(3, Math.ceil(maxGames * 0.25));
}
function lobbyWeightedAvgKda(rows) {
    let weighted = 0;
    let total = 0;
    for (const p of rows) {
        if (p.games > 0) {
            weighted += p.avgKda * p.games;
            total += p.games;
        }
    }
    // Sensible fallback if the lobby has zero games anywhere.
    return total > 0 ? weighted / total : 2.5;
}
// Wilson lower confidence bound on the proportion p = wins/games. Higher
// z = stricter penalty on small samples. 1.96 ≈ 95% CI.
function wilsonLowerBound(wins, games, z = 1.96) {
    if (games <= 0)
        return 0;
    const phat = wins / games;
    const z2 = z * z;
    const denom = 1 + z2 / games;
    const center = phat + z2 / (2 * games);
    const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * games)) / games);
    return (center - margin) / denom;
}
function pickPlayerOfDay(rows) {
    if (!rows.length)
        return null;
    const min = adaptiveMinGames(rows);
    let elig = rows.filter((p) => p.games >= min);
    if (!elig.length)
        elig = rows.filter((p) => p.games >= 1);
    if (!elig.length)
        return null;
    const priorKda = lobbyWeightedAvgKda(rows);
    const PRIOR_WEIGHT = 10;
    return [...elig]
        .map((p) => ({
        p,
        score: (p.avgKda * p.games + priorKda * PRIOR_WEIGHT) /
            (p.games + PRIOR_WEIGHT),
    }))
        .sort((a, b) => b.score - a.score)[0].p;
}
function pickHighestLp(rows) {
    const filt = rows.filter((p) => p.balance !== 0);
    if (!filt.length)
        return null;
    return [...filt].sort((a, b) => b.balance - a.balance)[0];
}
function pickBestWinrate(rows) {
    if (!rows.length)
        return null;
    const min = adaptiveMinGames(rows);
    let elig = rows.filter((p) => p.games >= min);
    if (!elig.length)
        elig = rows.filter((p) => p.games >= 1);
    if (!elig.length)
        return null;
    return [...elig]
        .map((p) => ({
        p,
        score: wilsonLowerBound(p.wins, p.games),
    }))
        .sort((a, b) => b.score - a.score)[0].p;
}
function pickMostGames(rows) {
    const elig = rows.filter((p) => p.games > 0);
    if (!elig.length)
        return null;
    return [...elig].sort((a, b) => b.games - a.games)[0];
}
function LeaderboardStatBox({ icon, label, player, highlightFn, highlightLabel, emptyText, loading, }) {
    return (_jsxs("div", { className: "relative overflow-hidden rounded-md bg-black/18 backdrop-blur-lg saturate-150 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_0_0_0.5px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]", children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1] p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "text-jade", children: icon }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/55 font-medium", children: label }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" })] }), loading ? (_jsx("div", { className: "h-[58px] flex items-center justify-center", children: _jsx(Loader2, { className: "w-4 h-4 animate-spin text-jade/60" }) })) : player ? (_jsxs("div", { className: "flex items-center gap-3", children: [profileIconUrl(player.iconId) ? (_jsx("img", { src: profileIconUrl(player.iconId), alt: "", className: "w-11 h-11 rounded-full shrink-0", style: {
                                    boxShadow: `0 0 14px color-mix(in srgb, ${player.color || JADE} 35%, transparent)`,
                                    border: `1.5px solid color-mix(in srgb, ${player.color || JADE} 40%, transparent)`,
                                } })) : (_jsx("div", { className: "w-11 h-11 rounded-full flex items-center justify-center shrink-0", style: {
                                    background: "rgba(0,0,0,0.4)",
                                    border: `1.5px solid color-mix(in srgb, ${player.color || JADE} 40%, transparent)`,
                                }, children: _jsx("span", { className: "text-[16px] font-jetbrains font-bold", style: { color: player.color || JADE }, children: player.playerDisplayName.slice(0, 1).toUpperCase() }) })), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsxs("span", { className: "text-[14px] font-chakrapetch font-bold text-flash truncate tracking-[0.01em]", children: [player.riotName, _jsxs("span", { className: "text-flash/30 font-normal", children: ["#", player.riotTag] })] }), player.currentRank ? (
                                    // Rank as `[icon] LP` — tighter and more recognisable
                                    // than the old `GOLD 2 · 12G ...` text row. Stats live
                                    // beside it as a separator-divided sub-chip.
                                    _jsxs("span", { className: "flex items-center mt-1 truncate", children: [_jsx("img", { src: getRankImage(player.currentRank.tier), alt: player.currentRank.tier, className: "w-[22px] h-[22px] object-contain shrink-0 -ml-0.5 mr-1" }), player.currentRank.rankDivision && (_jsx("span", { className: cn("font-chakrapetch font-bold text-[12px] leading-none mr-1.5", rankColorClass(player.currentRank.tier)), children: player.currentRank.rankDivision })), _jsxs("span", { className: "font-chakrapetch font-bold tabular-nums text-[14px] text-flash/90 leading-none", children: [player.currentRank.lp.toLocaleString(), _jsx("span", { className: "text-[10px] text-flash/45 ml-1 font-medium", children: "LP" })] }), _jsx("span", { className: "text-flash/25 text-[11px] leading-none mx-2", children: "\u00B7" }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.12em] uppercase text-flash/50 truncate", children: [player.games, "G ", player.wins, "W ", player.losses, "L"] })] })) : (_jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/35 mt-0.5", children: [player.games, " ", player.games === 1 ? "game" : "games", " \u00B7", " ", player.wins, "W ", player.losses, "L"] }))] }), _jsxs("div", { className: "flex flex-col items-end shrink-0", children: [_jsx("span", { className: "text-[20px] font-chakrapetch font-bold tabular-nums text-jade leading-none", children: highlightFn(player) }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mt-1", children: highlightLabel })] })] })) : (_jsx("div", { className: "h-[58px] flex items-center justify-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30", children: emptyText }))] })] }));
}
/* ─── duo stat box — same chrome as LeaderboardStatBox, two avatars ─── */
//
// Used when a widget swaps to duo display because a pair's metric beats
// (or ties) the best individual. Renders two overlapping avatars on the
// left, joined names + shared-game metadata, and the metric on the right.
function LeaderboardDuoStatBox({ icon, label, duo, highlightValue, highlightLabel, subText, loading, }) {
    const colorA = duo.colorA || JADE;
    const colorB = duo.colorB || JADE;
    const renderAvatar = (iconId, color, name, extraClass) => {
        const url = profileIconUrl(iconId);
        if (url) {
            return (_jsx("img", { src: url, alt: "", className: cn("w-9 h-9 rounded-full shrink-0", extraClass), style: {
                    boxShadow: `0 0 12px color-mix(in srgb, ${color} 30%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
                } }));
        }
        return (_jsx("div", { className: cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", extraClass), style: {
                background: "rgba(0,0,0,0.4)",
                border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
            }, children: _jsx("span", { className: "text-[13px] font-jetbrains font-bold", style: { color }, children: name.slice(0, 1).toUpperCase() }) }));
    };
    return (_jsxs("div", { className: "relative overflow-hidden rounded-md bg-black/18 backdrop-blur-lg saturate-150 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_0_0_0.5px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]", children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1] p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "text-jade", children: icon }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/55 font-medium", children: label }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" }), _jsx("span", { className: "text-[8px] font-jetbrains tracking-[0.28em] uppercase font-bold px-1.5 py-[3px] rounded-sm text-jade bg-jade/[0.14] border border-jade/35", children: "DUO" })] }), loading ? (_jsx("div", { className: "h-[58px] flex items-center justify-center", children: _jsx(Loader2, { className: "w-4 h-4 animate-spin text-jade/60" }) })) : (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex shrink-0", children: [renderAvatar(duo.iconIdA, colorA, duo.displayNameA, ""), renderAvatar(duo.iconIdB, colorB, duo.displayNameB, "-ml-3 ring-2 ring-liquirice/60")] }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1 ml-1", children: [_jsxs("span", { className: "text-[13px] font-chakrapetch font-bold text-flash truncate leading-tight tracking-[0.01em]", children: [_jsx("span", { style: { color: colorA }, children: duo.displayNameA }), _jsx("span", { className: "text-flash/35 mx-1 font-normal", children: "+" }), _jsx("span", { style: { color: colorB }, children: duo.displayNameB })] }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/40 mt-1 truncate", children: subText ?? `${duo.sharedGames}G shared · ${duo.sharedWins}W` })] }), _jsxs("div", { className: "flex flex-col items-end shrink-0", children: [_jsx("span", { className: "text-[20px] font-chakrapetch font-bold tabular-nums text-jade leading-none", children: highlightValue }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mt-1", children: highlightLabel })] })] }))] })] }));
}
/* ─── best winrate — individual or duo ───────────────────────────────── */
function TopWinrateOrDuoBox({ loading, leaderboard, topDuoWinrate, }) {
    const player = pickBestWinrate(leaderboard);
    const useDuo = !!topDuoWinrate && (!player || topDuoWinrate.winrate >= player.winrate);
    if (useDuo && topDuoWinrate) {
        return (_jsx(LeaderboardDuoStatBox, { loading: loading, icon: _jsx(Award, { className: "w-3.5 h-3.5" }), label: "Best Winrate", duo: topDuoWinrate, highlightValue: `${topDuoWinrate.winrate}%`, highlightLabel: "WR" }));
    }
    return (_jsx(LeaderboardStatBox, { loading: loading, icon: _jsx(Award, { className: "w-3.5 h-3.5" }), label: "Best Winrate", player: player, highlightFn: (p) => `${p.winrate}%`, highlightLabel: "WR", emptyText: "No games tracked" }));
}
/* ─── longest streak — individual or duo ─────────────────────────────── */
//
// Picks the entity with the longest consecutive-wins run in the window.
// Per the user spec:
//   • Duo wins on tie or greater ("isac e gabri 7 di fila" wins over
//     each of their individual 7-streaks since the shared narrative is
//     more interesting).
//   • Individual wins strictly greater ("isac vince un game da solo"
//     after the 7-streak makes his individual 8 > duo 7 → show only
//     Isac with 8).
function LongestStreakBox({ loading, leaderboard, topDuoStreak, }) {
    // Streak is per-PLAYER (all accounts of the same human share it). De-dup.
    const byPlayer = new Map();
    for (const a of leaderboard) {
        const cur = byPlayer.get(a.playerId);
        if (!cur || a.streak > cur.streak)
            byPlayer.set(a.playerId, a);
    }
    const sorted = [...byPlayer.values()].sort((x, y) => y.streak - x.streak);
    const topIndividual = sorted[0] ?? null;
    const individualLen = topIndividual?.streak ?? 0;
    const duoLen = topDuoStreak?.length ?? 0;
    // Empty: nothing to show if no one has even a 1-win streak.
    if (!loading && individualLen <= 0 && duoLen <= 0) {
        return (_jsx(LeaderboardStatBox, { loading: false, icon: _jsx(Flame, { className: "w-3.5 h-3.5" }), label: "Longest Streak", player: null, highlightFn: () => "", highlightLabel: "W", emptyText: "No streaks yet" }));
    }
    const useDuo = !!topDuoStreak && duoLen >= individualLen;
    if (useDuo && topDuoStreak) {
        return (_jsx(LeaderboardDuoStatBox, { loading: loading, icon: _jsx(Flame, { className: "w-3.5 h-3.5" }), label: "Longest Streak", duo: topDuoStreak, highlightValue: `${topDuoStreak.length}W`, highlightLabel: "Streak", subText: `${topDuoStreak.length} wins together` }));
    }
    return (_jsx(LeaderboardStatBox, { loading: loading, icon: _jsx(Flame, { className: "w-3.5 h-3.5" }), label: "Longest Streak", player: topIndividual, highlightFn: (p) => `${p.streak}W`, highlightLabel: "Streak", emptyText: "No streaks yet" }));
}
function bountyIconFor(iconKey) {
    const cls = "w-4 h-4";
    switch (iconKey) {
        case "swords": return _jsx(Swords, { className: cls });
        case "flame": return _jsx(Flame, { className: cls });
        case "crown": return _jsx(Crown, { className: cls });
        case "eye": return _jsx(Eye, { className: cls });
        case "coins": return _jsx(Coins, { className: cls });
        case "shield": return _jsx(Shield, { className: cls });
        case "sparkles": return _jsx(Sparkles, { className: cls });
        case "users": return _jsx(Users, { className: cls });
        case "zap": return _jsx(Zap, { className: cls });
        case "wheat": return _jsx(Wheat, { className: cls });
        default: return _jsx(Target, { className: cls });
    }
}
// Human-readable threshold + achieved-value formatters per metric.
function formatBountyTarget(metric, threshold) {
    switch (metric) {
        case "kills": return `${threshold} kills`;
        case "damage": return `${(threshold / 1000).toFixed(0)}k dmg`;
        case "kp_pct": return `${Math.round(threshold * 100)}% KP`;
        case "vision": return `${threshold} vision`;
        case "gold": return `${(threshold / 1000).toFixed(0)}k gold`;
        case "kda": return `${threshold.toFixed(1)} KDA`;
        case "zero_deaths_win": return "0 deaths · WIN";
        case "assists": return `${threshold} assists`;
        case "quick_win": return `< ${Math.round(threshold / 60)} min`;
        case "cs": return `${threshold} CS`;
    }
}
function formatBountyAchieved(metric, value) {
    switch (metric) {
        case "kills": return `${value}`;
        case "damage": return `${(value / 1000).toFixed(1)}k`;
        case "kp_pct": return `${Math.round(value * 100)}%`;
        case "vision": return `${value}`;
        case "gold": return `${(value / 1000).toFixed(1)}k`;
        case "kda": return value.toFixed(2);
        case "zero_deaths_win": return "PERFECT";
        case "assists": return `${value}`;
        case "quick_win": return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
        case "cs": return `${value}`;
    }
}
// Per-rarity accent palette. Common = jade (in line with the rest of
// the sidebar), rare = citrine, legendary = a pinkish flash to set
// the chase challenges apart visually.
const RARITY_ACCENT = {
    common: { color: "#00d992", label: "COMMON" },
    rare: { color: "#FFB615", label: "RARE" },
    legendary: { color: "#ff5db5", label: "LEGENDARY" },
};
function DailyBountyBox({ slug, refreshTick, }) {
    const [payload, setPayload] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE_URL}/api/scout/bounty/today/${slug}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !cancelled && setPayload(d))
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, refreshTick]);
    // Skeleton-equivalent: same metallic chrome (jade-tinted placeholder
    // since we don't know the bounty's rarity yet) so the layout doesn't
    // reflow when the request resolves.
    if (loading || !payload) {
        return (_jsx("div", { className: "relative overflow-hidden rounded-md", style: {
                background: `
            linear-gradient(180deg,
              rgba(255,255,255,0.06) 0%,
              transparent 25%,
              transparent 75%,
              rgba(0,0,0,0.22) 100%
            ),
            linear-gradient(135deg,
              color-mix(in srgb, ${JADE} 22%, #0a0e10) 0%,
              color-mix(in srgb, ${JADE} 10%, #0a0e10) 50%,
              color-mix(in srgb, ${JADE} 18%, #0a0e10) 100%
            )
          `,
                boxShadow: `
            0 14px 36px rgba(0,0,0,0.6),
            0 2px 10px color-mix(in srgb, ${JADE} 18%, transparent),
            inset 0 1px 0 rgba(255,255,255,0.18),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            inset 0 0 0 0.5px rgba(255,255,255,0.08)
          `,
            }, children: _jsxs("div", { className: "relative z-[2] p-3.5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2.5", children: [_jsx("span", { className: "w-5 h-5 rounded-[3px] flex items-center justify-center shrink-0 text-jade/70", style: {
                                    background: `color-mix(in srgb, ${JADE} 10%, transparent)`,
                                    border: `0.5px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
                                }, children: _jsx(Target, { className: "w-3 h-3" }) }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/70 font-semibold", children: "Daily Bounty" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" })] }), _jsx("div", { className: "h-[64px] flex items-center justify-center", children: loading ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin text-jade/60" })) : (_jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/35", children: "no bounty today" })) })] }) }));
    }
    const rarity = RARITY_ACCENT[payload.template.rarity];
    const isClaimed = payload.state === "claimed";
    const winnerColor = payload.claimed_by?.color || JADE;
    return (_jsx("div", { className: "relative overflow-hidden rounded-md", style: {
            // Polished-metal card aesthetic.
            //
            // Stack (back → front) — composited via CSS multi-background:
            //   1. Anisotropic top→bottom sheen (white top edge → dark
            //      bottom edge) → suggests brushed metal curvature.
            //   2. Static diagonal "shine band" across the centre, like
            //      a luxury credit card catching light.
            //   3. Rarity-tinted metal base. The rarity colour is mixed
            //      into a dark base at varying ratios across a 135° axis
            //      so the surface reads as coloured metal (jade-tinted
            //      steel, citrine-tinted brass, rose-gold) without
            //      tipping into "neon glow."
            background: `
          linear-gradient(115deg,
            transparent 0%,
            transparent 30%,
            rgba(255,255,255,0.04) 44%,
            rgba(255,255,255,0.14) 50%,
            rgba(255,255,255,0.04) 56%,
            transparent 70%,
            transparent 100%
          ),
          linear-gradient(180deg,
            rgba(255,255,255,0.06) 0%,
            transparent 25%,
            transparent 75%,
            rgba(0,0,0,0.22) 100%
          ),
          linear-gradient(135deg,
            color-mix(in srgb, ${rarity.color} 32%, #0a0e10) 0%,
            color-mix(in srgb, ${rarity.color} 14%, #0a0e10) 35%,
            color-mix(in srgb, ${rarity.color} 10%, #0a0e10) 65%,
            color-mix(in srgb, ${rarity.color} 26%, #0a0e10) 100%
          )
        `,
            // Box shadow layers:
            //   • outer drop — sits the card above its neighbours
            //   • coloured ambient — a soft tinted halo so the card has
            //     a presence on the page without a bright accent border
            //   • inset highlights — embossed top edge, recessed bottom
            //     edge (the classic metal-card depth illusion)
            //   • hairline outline — keeps the silhouette crisp
            boxShadow: `
          0 14px 36px rgba(0,0,0,0.6),
          0 2px 10px color-mix(in srgb, ${rarity.color} 22%, transparent),
          inset 0 1px 0 rgba(255,255,255,0.22),
          inset 0 -1px 0 rgba(0,0,0,0.5),
          inset 0 0 0 0.5px rgba(255,255,255,0.08)
        `,
        }, children: _jsxs("div", { className: "relative z-[2] p-3.5", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2.5", children: [_jsx("span", { className: "w-5 h-5 rounded-[3px] flex items-center justify-center shrink-0", style: {
                                background: `color-mix(in srgb, ${rarity.color} 14%, transparent)`,
                                border: `0.5px solid color-mix(in srgb, ${rarity.color} 40%, transparent)`,
                                color: rarity.color,
                            }, children: _jsx("span", { className: "scale-75 origin-center", children: bountyIconFor(payload.template.icon) }) }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/70 font-semibold", children: "Daily Bounty" }), _jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "shrink-0 text-flash/30 hover:text-jade transition-colors cursor-clicker", "aria-label": "How the daily bounty works", children: _jsx(Info, { className: "w-3 h-3" }) }) }), _jsx(TooltipContent, { side: "top", className: "text-xs max-w-[230px] bg-liquirice/90", children: _jsx("div", { className: "font-geist leading-snug text-flash/85", children: "The first lobby member to hit this in a ranked game today claims it \u2014 auto-tracked, no button needed. The best value holds and can be overtaken. Resets at midnight (Rome time)." }) })] }) }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" }), _jsx("span", { className: "text-[7px] font-jetbrains tracking-[0.25em] uppercase font-bold px-1.5 py-[3px] rounded-sm", style: {
                                color: rarity.color,
                                backgroundColor: `color-mix(in srgb, ${rarity.color} 16%, transparent)`,
                                border: `0.5px solid color-mix(in srgb, ${rarity.color} 40%, transparent)`,
                            }, children: rarity.label })] }), _jsxs("div", { className: "mb-2.5", children: [_jsx("div", { className: "text-[14px] font-chakrapetch font-bold text-flash leading-tight tracking-[0.01em]", children: payload.template.title }), _jsx("div", { className: "text-[11px] font-chakrapetch text-flash/65 mt-0.5 leading-snug tracking-[0.02em]", style: { fontWeight: 300 }, children: payload.template.description })] }), isClaimed && payload.claimed_by ? (
                // ── CLAIMED state ─────────────────────────────────────────
                // The chip needs a solid dark backdrop so the card's static
                // shine band doesn't bleed through it — the chip should
                // read as a clean panel sitting on top of the metal.
                _jsx("div", { className: cn("group/jump relative overflow-hidden rounded-md p-2.5", payload.claimed_match_id &&
                        "cursor-clicker transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"), style: {
                        background: `
                linear-gradient(135deg, color-mix(in srgb, ${winnerColor} 14%, transparent) 0%, rgba(0,0,0,0.55) 100%),
                rgba(8, 12, 14, 0.95)
              `,
                        border: `0.5px solid color-mix(in srgb, ${winnerColor} 28%, transparent)`,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }, ...(payload.claimed_match_id
                        ? {
                            role: "button",
                            tabIndex: 0,
                            title: "Jump to the match where it was claimed",
                            onClick: () => {
                                navigate(`/scout/${slug}`);
                                focusScoutMatch(payload.claimed_match_id);
                            },
                            onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    navigate(`/scout/${slug}`);
                                    focusScoutMatch(payload.claimed_match_id);
                                }
                            },
                        }
                        : {}), children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("div", { className: "w-8 h-8 rounded-full flex items-center justify-center shrink-0", style: {
                                    background: "rgba(0,0,0,0.45)",
                                    border: `1.5px solid color-mix(in srgb, ${winnerColor} 55%, transparent)`,
                                    boxShadow: `0 0 12px color-mix(in srgb, ${winnerColor} 30%, transparent)`,
                                }, children: _jsx("span", { className: "text-[12px] font-jetbrains font-bold", style: { color: winnerColor }, children: (payload.claimed_by.display_name ?? "?")
                                        .slice(0, 1)
                                        .toUpperCase() }) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsx("span", { className: "text-[12px] font-geist font-semibold text-flash truncate leading-tight", children: payload.claimed_by.display_name ?? "Unknown" }), _jsxs("span", { className: "text-[8px] font-jetbrains tracking-[0.22em] uppercase text-flash/55 mt-0.5 flex items-center gap-1 font-medium", children: [_jsx(CheckCircle2, { className: "w-2.5 h-2.5", style: { color: winnerColor } }), "Claimed", payload.claimed_match_id && (_jsxs("span", { className: "ml-1 inline-flex items-center gap-0.5 text-jade/0 group-hover/jump:text-jade/85 transition-colors duration-200", children: [_jsx(Crosshair, { className: "w-2.5 h-2.5" }), "View"] }))] })] }), _jsxs("div", { className: "flex flex-col items-end shrink-0", children: [_jsx("span", { className: "text-[17px] font-chakrapetch font-bold tabular-nums leading-none", style: { color: winnerColor }, children: payload.claimed_value !== null
                                            ? formatBountyAchieved(payload.template.metric, payload.claimed_value)
                                            : "—" }), _jsx("span", { className: "text-[7.5px] font-jetbrains tracking-[0.22em] uppercase text-flash/45 mt-1 font-medium", children: payload.template.metric === "zero_deaths_win"
                                            ? "PERFECT"
                                            : "ACHIEVED" })] })] }) })) : (
                // ── ACTIVE state ──────────────────────────────────────────
                // Target + status side by side now (instead of stacked) —
                // saves vertical space while keeping the metric hero-sized.
                // Solid dark backdrop layer ensures the card's static shine
                // doesn't bleed through the chip.
                _jsxs("div", { className: "relative overflow-hidden rounded-md py-2 px-3 flex items-center justify-between gap-3", style: {
                        background: `
                linear-gradient(180deg, color-mix(in srgb, ${rarity.color} 12%, transparent) 0%, rgba(0,0,0,0.55) 100%),
                rgba(8, 12, 14, 0.95)
              `,
                        border: `0.5px solid color-mix(in srgb, ${rarity.color} 26%, transparent)`,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                    }, children: [_jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-[8px] font-jetbrains tracking-[0.3em] uppercase text-flash/45 font-medium", children: "Target" }), _jsx("span", { className: "text-[16px] font-chakrapetch font-bold tabular-nums leading-tight mt-0.5 tracking-[-0.01em] truncate", style: {
                                        color: rarity.color,
                                        textShadow: `0 0 14px color-mix(in srgb, ${rarity.color} 40%, transparent)`,
                                    }, children: formatBountyTarget(payload.template.metric, payload.template.threshold) })] }), _jsxs("span", { className: "text-[8.5px] font-jetbrains tracking-[0.25em] uppercase text-jade font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-jade/[0.08] border border-jade/25 shrink-0", children: [_jsxs("span", { className: "relative flex h-1.5 w-1.5", children: [_jsx("span", { className: "absolute inline-flex h-full w-full rounded-full bg-jade opacity-60 animate-ping" }), _jsx("span", { className: "relative inline-flex rounded-full h-1.5 w-1.5 bg-jade" })] }), "Active"] })] }))] }) }));
}
function BountyLeaderboardPanel({ slug, refreshTick, }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE_URL}/api/scout/bounty/leaderboard/${slug}`)
            .then((r) => (r.ok ? r.json() : { rows: [] }))
            .then((d) => !cancelled && setRows(d?.rows ?? []))
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, refreshTick]);
    // Medal colours for the top-3 — gold / silver / bronze. Matches the
    // luxury aesthetic without leaning too hard on the brand palette.
    const medalFor = (idx) => {
        if (idx === 0)
            return "#FFB615"; // citrine — gold
        if (idx === 1)
            return "#cdd5dd"; // silver
        if (idx === 2)
            return "#cd7f32"; // bronze
        return null;
    };
    return (_jsxs("div", { className: cn(glassDark, "p-5 md:p-6"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1]", children: [_jsxs("div", { className: "flex items-center gap-3 mb-5", children: [_jsx("span", { className: "text-jade", children: _jsx(Target, { className: "w-4 h-4" }) }), _jsx("span", { className: "text-[11px] font-jetbrains tracking-[0.25em] uppercase text-flash/70 font-medium", children: "Bounty Leaderboard" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/35", children: "ALL-TIME" })] }), loading ? (_jsx("div", { className: "py-10 flex items-center justify-center", children: _jsx(Loader2, { className: "w-4 h-4 animate-spin text-jade/60" }) })) : rows.length === 0 ? (_jsxs("div", { className: "py-10 text-center", children: [_jsx("div", { className: "text-[12px] font-jetbrains tracking-[0.2em] uppercase text-flash/35", children: "No bounties claimed yet" }), _jsx("div", { className: "text-[10px] font-jetbrains tracking-[0.1em] text-flash/25 mt-2", children: "Be the first to claim today's challenge" })] })) : (_jsx("div", { className: "flex flex-col gap-2", children: rows.map((row, idx) => {
                            const medal = medalFor(idx);
                            const accent = row.color || JADE;
                            return (_jsxs("div", { className: "relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-black/15 border border-flash/[0.05] hover:bg-black/25 transition-colors", children: [_jsx("div", { className: "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-jetbrains font-bold tabular-nums", style: {
                                            background: medal
                                                ? `color-mix(in srgb, ${medal} 18%, transparent)`
                                                : "rgba(0,0,0,0.35)",
                                            color: medal ?? "#a8b0b6",
                                            border: `1px solid color-mix(in srgb, ${medal ?? "#3a4248"} 45%, transparent)`,
                                        }, children: idx + 1 }), _jsx("div", { className: "w-8 h-8 rounded-full flex items-center justify-center shrink-0", style: {
                                            background: "rgba(0,0,0,0.4)",
                                            border: `1.5px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                                            boxShadow: `0 0 10px color-mix(in srgb, ${accent} 25%, transparent)`,
                                        }, children: _jsx("span", { className: "text-[12px] font-jetbrains font-bold", style: { color: accent }, children: (row.display_name ?? "?").slice(0, 1).toUpperCase() }) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsx("span", { className: "text-[13px] font-geist font-medium text-flash truncate", children: row.display_name ?? "Unknown" }), _jsxs("span", { className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/35 mt-0.5 truncate", children: ["Last: ", row.last_template_title] })] }), _jsxs("div", { className: "flex flex-col items-end shrink-0", children: [_jsx("span", { className: "text-[18px] font-chakrapetch font-bold tabular-nums text-jade leading-none", children: row.total_claims }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mt-1", children: row.total_claims === 1 ? "CLAIM" : "CLAIMS" })] })] }, row.lobby_player_id));
                        }) }))] })] }));
}
/* ─── trend chart (pure SVG) ────────────────────────────────────────── */
function TrendChart({ buckets }) {
    if (buckets.length === 0) {
        return (_jsx("div", { className: "py-12 text-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30", children: "No data" }));
    }
    const maxGames = Math.max(1, ...buckets.map((b) => b.games));
    const width = Math.max(buckets.length * 60, 600);
    const height = 200;
    const padL = 36;
    const padR = 10;
    const padT = 14;
    const padB = 36;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const colW = innerW / buckets.length;
    // Winrate line points (only for buckets with games > 0)
    const winratePoints = buckets
        .map((b, i) => {
        if (b.games === 0)
            return null;
        const x = padL + i * colW + colW / 2;
        const y = padT + (1 - b.winrate / 100) * innerH;
        return { x, y, b };
    })
        .filter(Boolean);
    // Line path
    const linePath = winratePoints
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
    return (_jsxs("div", { className: "overflow-x-auto", children: [_jsxs("svg", { width: width, height: height, viewBox: `0 0 ${width} ${height}`, className: "block", children: [[0, 25, 50, 75, 100].map((p) => {
                        const y = padT + (1 - p / 100) * innerH;
                        return (_jsxs("g", { children: [_jsx("line", { x1: padL, x2: padL + innerW, y1: y, y2: y, stroke: "rgba(215,216,217,0.06)", strokeWidth: 1 }), _jsxs("text", { x: padL - 6, y: y + 3, textAnchor: "end", className: "fill-flash/30 text-[9px] font-jetbrains", children: [p, "%"] })] }, p));
                    }), _jsx("line", { x1: padL, x2: padL + innerW, y1: padT + 0.5 * innerH, y2: padT + 0.5 * innerH, stroke: "rgba(0,217,146,0.18)", strokeWidth: 1, strokeDasharray: "3 3" }), buckets.map((b, i) => {
                        const x = padL + i * colW + colW * 0.18;
                        const barW = colW * 0.64;
                        const h = b.games === 0 ? 0 : (b.games / maxGames) * innerH;
                        const y = padT + innerH - h;
                        return (_jsxs("g", { children: [_jsx("rect", { x: x, y: y, width: barW, height: h, fill: "rgba(0,217,146,0.10)", stroke: "rgba(0,217,146,0.25)", strokeWidth: 0.8, rx: 1 }), b.games > 0 && (_jsx("text", { x: x + barW / 2, y: y - 4, textAnchor: "middle", className: "fill-jade/70 text-[9px] font-chakrapetch font-bold tabular-nums", children: b.games }))] }, `bar-${i}`));
                    }), winratePoints.length > 1 && (_jsx("path", { d: linePath, stroke: JADE, strokeWidth: 2, fill: "none", strokeLinejoin: "round", strokeLinecap: "round" })), winratePoints.map((p, i) => (_jsx("circle", { cx: p.x, cy: p.y, r: 3, fill: JADE, stroke: "#040A0C", strokeWidth: 1 }, `pt-${i}`))), buckets.map((b, i) => {
                        const x = padL + i * colW + colW / 2;
                        return (_jsx("text", { x: x, y: height - 14, textAnchor: "middle", className: "fill-flash/40 text-[9px] font-jetbrains tracking-[0.1em] uppercase", children: b.bucketLabel }, `lbl-${i}`));
                    })] }), _jsxs("div", { className: "flex items-center gap-4 mt-3 text-[10px] font-jetbrains tracking-[0.18em] uppercase", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-block w-3 h-3 rounded-sm", style: { background: "rgba(0,217,146,0.10)", border: "1px solid rgba(0,217,146,0.25)" } }), _jsx("span", { className: "text-flash/45", children: "Games" })] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "inline-block w-4 h-[2px] bg-jade" }), _jsx("span", { className: "text-flash/45", children: "Winrate" })] })] })] }));
}
/* ─── habits tab ────────────────────────────────────────────────────── */
function HabitsTab({ slug }) {
    const [window, setWindow] = useState("week");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE_URL}/api/scout/habits/${slug}?window=${window}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !cancelled && setData(d?.players ?? []))
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, window]);
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(WindowSelector, { window: window, onChange: setWindow }), loading ? (_jsx("div", { className: cn(glassDark, "p-12 flex items-center justify-center"), children: _jsx(Loader2, { className: "w-5 h-5 animate-spin text-jade" }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: data
                    .filter((p) => p.games > 0)
                    .sort((a, b) => b.games - a.games)
                    .map((p) => (_jsx(HabitsCard, { player: p }, p.playerId))) }))] }));
}
function WindowSelector({ window, onChange, }) {
    return (_jsxs("div", { className: cn(glassDark, "p-3"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1] flex items-center gap-3", children: [_jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/55", children: "Window" }), _jsx("div", { className: "flex items-center gap-1 ml-auto", children: ["today", "week", "all"].map((w) => (_jsx("button", { type: "button", onClick: () => onChange(w), className: cn("text-[10px] font-jetbrains tracking-[0.2em] uppercase px-3 py-1.5 rounded-[3px] transition-all cursor-clicker font-medium", window === w
                                ? "bg-jade/[0.15] text-jade border border-jade/40"
                                : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"), children: w === "today" ? "Today" : w === "week" ? "Week" : "All-time" }, w))) })] })] }));
}
function HabitsCard({ player }) {
    const accent = player.color || JADE;
    const tilt = player.afterLoss.games >= 3
        ? player.afterLoss.winrate
        : null;
    const tiltColor = tilt === null
        ? "text-flash/35"
        : tilt >= 55
            ? "text-jade"
            : tilt >= 45
                ? "text-flash/80"
                : "text-error";
    const todTotal = player.timeOfDay.morning.games +
        player.timeOfDay.afternoon.games +
        player.timeOfDay.evening.games +
        player.timeOfDay.night.games;
    return (_jsxs("div", { className: cn(glassDark, "p-4"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { background: accent, boxShadow: `0 0 8px ${accent}` } }), _jsx("span", { className: "text-[14px] font-geist font-medium text-flash", children: player.displayName }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/35 ml-auto", children: [player.games, " games"] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 mb-4", children: [_jsx(HabitMetric, { label: "WR after loss", value: tilt === null
                                    ? "—"
                                    : `${tilt}%`, sub: tilt === null
                                    ? "min 3 needed"
                                    : `${player.afterLoss.wins}/${player.afterLoss.games}`, valueClass: tiltColor }), _jsx(HabitMetric, { label: "WR after win", value: player.afterWin.games >= 3
                                    ? `${player.afterWin.winrate}%`
                                    : "—", sub: player.afterWin.games >= 3
                                    ? `${player.afterWin.wins}/${player.afterWin.games}`
                                    : "min 3 needed", valueClass: "text-flash/80" }), _jsx(HabitMetric, { label: "Longest W streak", value: String(player.longestWinStreak), sub: "in a row", valueClass: "text-jade" }), _jsx(HabitMetric, { label: "Longest L streak", value: String(player.longestLossStreak), sub: "in a row", valueClass: "text-error/80" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/45 mb-2", children: "Time of day" }), _jsxs("div", { className: "grid grid-cols-4 gap-1.5", children: [_jsx(TodBar, { label: "Morn", bucket: player.timeOfDay.morning, total: todTotal, accent: accent, fullLabel: "Morning \u00B7 05:00\u201311:59" }), _jsx(TodBar, { label: "Aft", bucket: player.timeOfDay.afternoon, total: todTotal, accent: accent, fullLabel: "Afternoon \u00B7 12:00\u201317:59" }), _jsx(TodBar, { label: "Eve", bucket: player.timeOfDay.evening, total: todTotal, accent: accent, fullLabel: "Evening \u00B7 18:00\u201322:59" }), _jsx(TodBar, { label: "Night", bucket: player.timeOfDay.night, total: todTotal, accent: accent, fullLabel: "Night \u00B7 23:00\u201304:59" })] })] })] })] }));
}
function HabitMetric({ label, value, sub, valueClass, }) {
    return (_jsxs("div", { className: "bg-black/25 border border-flash/10 rounded-[3px] p-3", children: [_jsx("div", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mb-1.5", children: label }), _jsx("div", { className: cn("text-[22px] font-chakrapetch font-bold tabular-nums leading-none", valueClass), children: value }), _jsx("div", { className: "text-[10px] font-jetbrains tracking-[0.12em] text-flash/35 mt-1.5", children: sub })] }));
}
function TodBar({ label, bucket, total, accent, fullLabel, }) {
    const pct = total > 0 ? Math.round((bucket.games / total) * 100) : 0;
    return (_jsx(TooltipProvider, { delayDuration: 120, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: "flex flex-col items-center gap-1 cursor-default", children: [_jsxs("div", { className: "relative w-full h-14 bg-black/25 border border-flash/10 rounded-[3px] overflow-hidden flex items-end justify-center transition-colors hover:border-flash/25", children: [_jsx("div", { className: "w-full transition-all", style: {
                                            height: `${pct}%`,
                                            background: `color-mix(in srgb, ${accent} 30%, transparent)`,
                                        } }), _jsx("span", { className: "absolute top-1 right-1 text-[9px] font-jetbrains text-flash/45 tabular-nums", children: bucket.games })] }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/45", children: label })] }) }), _jsx(TooltipContent, { side: "top", className: "text-xs font-jetbrains tracking-wider", children: _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("span", { className: "text-[10px] uppercase tracking-[0.18em] text-jade/85 font-bold", children: fullLabel }), _jsxs("span", { className: "text-flash/85", children: [bucket.games, " ", bucket.games === 1 ? "game" : "games", _jsx("span", { className: "text-flash/35", children: " \u00B7 " }), _jsxs("span", { className: bucket.winrate >= 55
                                            ? "text-jade"
                                            : bucket.winrate >= 48
                                                ? "text-flash/80"
                                                : "text-red-400/80", children: [bucket.wins, "W ", bucket.games - bucket.wins, "L \u00B7 ", bucket.winrate, "% WR"] })] })] }) })] }) }));
}
/* ─── champions tab ─────────────────────────────────────────────────── */
function ChampionsTab({ slug, lobby }) {
    const [window, setWindow] = useState("all");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`${API_BASE_URL}/api/scout/champions/${slug}?window=${window}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => !cancelled && setData(d?.players ?? []))
            .catch(console.error)
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [slug, window]);
    // playerId → lobby player (for account chip rendering inside the card).
    const playerById = useMemo(() => {
        const m = new Map();
        for (const p of lobby.players)
            m.set(p.id, p);
        return m;
    }, [lobby]);
    return (_jsxs("div", { className: "flex flex-col gap-5", children: [_jsx(WindowSelector, { window: window, onChange: setWindow }), loading ? (_jsx("div", { className: cn(glassDark, "p-12 flex items-center justify-center"), children: _jsx(Loader2, { className: "w-5 h-5 animate-spin text-jade" }) })) : (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [data
                        .filter((p) => p.champions.length > 0)
                        .map((p) => (_jsx(ChampionsCard, { player: p, lobbyPlayer: playerById.get(p.playerId) ?? null }, p.playerId))), data.every((p) => p.champions.length === 0) && (_jsx("div", { className: cn(glassDark, "p-8 text-center col-span-full"), children: _jsx("div", { className: "text-flash/40 text-sm", children: "No champion data yet." }) }))] }))] }));
}
function ChampionsCard({ player, lobbyPlayer, }) {
    const accent = player.color || JADE;
    // null = "All accounts" (aggregate). Otherwise = a specific account puuid.
    const [accountPuuid, setAccountPuuid] = useState(null);
    // Decide which champion list to render based on the selected account.
    const champions = accountPuuid && player.perAccount?.[accountPuuid]
        ? player.perAccount[accountPuuid]
        : player.champions;
    // Stable list of switchable accounts. Sorted main-first then by orderIndex
    // so the chip row reads like the rest of the UI.
    const accounts = useMemo(() => {
        if (!lobbyPlayer)
            return [];
        return [...lobbyPlayer.accounts].sort((a, b) => {
            if (a.isPrimary !== b.isPrimary)
                return a.isPrimary ? -1 : 1;
            return a.orderIndex - b.orderIndex;
        });
    }, [lobbyPlayer]);
    // Only render the account switcher when the player has more than one
    // linked account — for a solo-account player it's just visual noise.
    const showSwitcher = accounts.length > 1;
    return (_jsxs("div", { className: cn(glassDark, "p-4"), children: [_jsx(GlowBackdrop, { subtle: true }), _jsxs("div", { className: "relative z-[1]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { background: accent, boxShadow: `0 0 8px ${accent}` } }), _jsx("span", { className: "text-[14px] font-geist font-medium text-flash", children: player.displayName })] }), showSwitcher && (_jsxs("div", { className: "flex items-center gap-1.5 flex-wrap mb-3", children: [_jsx("button", { type: "button", onClick: () => setAccountPuuid(null), className: cn("px-2 py-[3px] rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border", accountPuuid == null
                                    ? "border-jade/40 bg-jade/[0.10] text-jade"
                                    : "border-flash/15 text-flash/40 hover:text-flash/75 hover:bg-flash/[0.04]"), children: "All" }), accounts.map((acc) => {
                                const isActive = acc.puuid === accountPuuid;
                                const hasData = (player.perAccount?.[acc.puuid] ?? []).length > 0;
                                return (_jsxs("button", { type: "button", onClick: () => setAccountPuuid(acc.puuid), disabled: !hasData, title: hasData
                                        ? `${acc.riotName}#${acc.riotTag}`
                                        : "No champion data on this account in the current window", className: cn("inline-flex items-center gap-1 px-2 py-[3px] rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border", isActive
                                        ? "border-jade/40 bg-jade/[0.10] text-jade"
                                        : hasData
                                            ? "border-flash/15 text-flash/55 hover:text-flash/85 hover:bg-flash/[0.04]"
                                            : "border-flash/10 text-flash/25 cursor-not-allowed"), children: [_jsx("span", { className: "text-jade/55 mr-0.5", children: acc.region }), _jsx("span", { className: "truncate max-w-[100px]", children: acc.riotName }), acc.isPrimary && (_jsx("span", { className: "text-[7px] font-mono tracking-widest text-jade/60 ml-0.5", children: "MAIN" }))] }, acc.id));
                            })] })), champions.length === 0 ? (_jsx("div", { className: "py-6 text-center text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/30", children: "No champion data on this account" })) : (_jsx("ul", { className: "flex flex-col gap-2", children: champions.map((c, i) => (_jsxs("li", { className: "flex items-center gap-3 bg-black/25 border border-flash/10 rounded-[3px] px-3 py-2", children: [_jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/35 w-4", children: String(i + 1).padStart(2, "0") }), _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(c.champion)}.png`, alt: c.champion, className: "w-9 h-9 rounded-md" }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsx("span", { className: "text-[13px] font-geist font-medium text-flash truncate", children: c.champion }), _jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.12em] text-flash/40", children: [c.games, " games \u00B7 ", c.wins, "W ", c.games - c.wins, "L"] })] }), _jsxs("div", { className: "flex flex-col items-end shrink-0", children: [_jsxs("span", { className: cn("text-[15px] font-chakrapetch font-bold tabular-nums leading-none", c.winrate >= 60
                                                ? "text-jade"
                                                : c.winrate >= 50
                                                    ? "text-flash/85"
                                                    : "text-error/80"), children: [c.winrate, "%"] }), _jsxs("span", { className: "text-[9px] font-jetbrains tracking-[0.15em] uppercase text-flash/40 mt-0.5", children: [c.deaths === 0 ? "PERF" : c.avgKda.toFixed(2), " KDA"] })] })] }, c.champion))) }))] })] }));
}
/* ─── refresh clock — countdown + auto-trigger ──────────────────────── */
function RefreshClock({ lastRefreshAt, refreshing, onRefreshDone, slug, large = false, }) {
    const [now, setNow] = useState(() => Date.now());
    const [localRefreshing, setLocalRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const inFlightRef = useRef(false);
    const lastFiredAtRef = useRef(0);
    const isRefreshing = refreshing || localRefreshing;
    // Ticking clock so the countdown updates every second.
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
        return () => window.clearInterval(id);
    }, []);
    const dueAt = lastRefreshAt
        ? new Date(lastRefreshAt).getTime() + REFRESH_INTERVAL_MS
        : 0;
    const remainingMs = dueAt - now;
    const isDue = remainingMs <= 0;
    // Stable trigger function — used by auto-fire AND by manual click.
    const triggerRefresh = useCallback((manual = false) => {
        const lastFiredAgo = Date.now() - lastFiredAtRef.current;
        // eslint-disable-next-line no-console
        console.log("[RefreshClock] triggerRefresh", {
            manual,
            isRefreshing,
            inFlight: inFlightRef.current,
            lastFiredAgo,
        });
        // Stuck-state recovery: if the user manually clicks and we've been
        // "in-flight" for > 30s, assume something hung and reset. Otherwise
        // bail on overlapping fires.
        const STUCK_MS = 30_000;
        if (inFlightRef.current && lastFiredAgo > STUCK_MS) {
            // eslint-disable-next-line no-console
            console.warn(`[RefreshClock] inFlight stuck for ${lastFiredAgo}ms — forcing reset`);
            inFlightRef.current = false;
            setLocalRefreshing(false);
        }
        if (isRefreshing && lastFiredAgo > STUCK_MS) {
            // eslint-disable-next-line no-console
            console.warn(`[RefreshClock] localRefreshing stuck for ${lastFiredAgo}ms — forcing reset`);
            setLocalRefreshing(false);
        }
        if (isRefreshing && lastFiredAgo <= STUCK_MS) {
            // eslint-disable-next-line no-console
            console.log("[RefreshClock] blocked: isRefreshing=true");
            return;
        }
        if (inFlightRef.current && lastFiredAgo <= STUCK_MS) {
            // eslint-disable-next-line no-console
            console.log("[RefreshClock] blocked: inFlightRef=true");
            return;
        }
        // Local 5s debounce floor only for AUTO firing; a manual click bypasses
        // it so the user can retry after an error without waiting.
        if (!manual && Date.now() - lastFiredAtRef.current < 5000) {
            // eslint-disable-next-line no-console
            console.log("[RefreshClock] blocked: auto-debounce <5s");
            return;
        }
        inFlightRef.current = true;
        lastFiredAtRef.current = Date.now();
        setLocalRefreshing(true);
        setError(null);
        const url = `${API_BASE_URL}/api/scout/refresh/${slug}`;
        // eslint-disable-next-line no-console
        console.log("[RefreshClock] fetch START →", url);
        fetch(url, { method: "POST" })
            .then(async (r) => {
            // eslint-disable-next-line no-console
            console.log("[RefreshClock] fetch response", r.status, r.ok);
            const data = await r.json().catch(() => ({}));
            if (!r.ok)
                throw new Error(data?.error ?? `HTTP ${r.status}`);
            return data;
        })
            .then((d) => {
            // eslint-disable-next-line no-console
            console.log("[RefreshClock] response data", d);
            if (!d?.lastRefreshAt) {
                throw new Error("Refresh response missing lastRefreshAt");
            }
            // eslint-disable-next-line no-console
            console.log("[RefreshClock] calling onRefreshDone — bumps refreshTick, parent should refetch lobby+feed");
            onRefreshDone(d.lastRefreshAt);
            if (!d.skipped) {
                showCyberToast({
                    // Stable id so the auto-refresh ticker (every ~10 min)
                    // never accumulates multiple "Lobby refreshed" toasts —
                    // a new one always replaces the previous instead of
                    // queuing up behind it.
                    id: "scout-lobby-refreshed",
                    title: "Lobby refreshed",
                    description: `${d.accountsRefreshed ?? 0} accounts updated`,
                    tag: "SYNC",
                    variant: "status",
                    duration: 3000,
                });
            }
        })
            .catch((err) => {
            console.error("scout refresh error:", err);
            setError(err.message ?? "Refresh failed");
        })
            .finally(() => {
            inFlightRef.current = false;
            setLocalRefreshing(false);
        });
    }, [isRefreshing, onRefreshDone, slug]);
    // Auto-trigger when due. Backs off if there's an error to avoid loops.
    useEffect(() => {
        if (!isDue)
            return;
        if (error)
            return;
        triggerRefresh(false);
    }, [isDue, error, triggerRefresh]);
    const label = (() => {
        if (error)
            return "RETRY";
        if (isRefreshing)
            return "REFRESHING";
        if (!lastRefreshAt)
            return "PENDING";
        const ms = Math.max(0, remainingMs);
        const m = Math.floor(ms / 60_000);
        const s = Math.floor((ms % 60_000) / 1000);
        return `${m}M ${String(s).padStart(2, "0")}S`;
    })();
    const valueClass = error
        ? "text-error/80"
        : isRefreshing
            ? "text-jade"
            : "text-flash/75";
    const showIcon = isRefreshing || !!error;
    return (_jsxs("button", { type: "button", onClick: () => {
            // eslint-disable-next-line no-console
            console.log("[RefreshClock] button onClick fired");
            triggerRefresh(true);
        }, "aria-disabled": isRefreshing, title: error ?? "Click to refresh now", className: cn("group flex items-center font-jetbrains tracking-[0.2em] uppercase text-flash/50", "rounded-[3px] transition-colors cursor-clicker hover:bg-flash/[0.05]", large
            ? "gap-2.5 text-[13px] px-2.5 py-1.5 -mx-2.5 -my-1.5"
            : "gap-2 text-[10px] px-2 py-1 -mx-2 -my-1"), children: [showIcon ? (_jsx(RefreshCw, { className: cn(large ? "w-4 h-4" : "w-3.5 h-3.5", error ? "text-error/70" : "text-jade/70", isRefreshing && "animate-spin") })) : (_jsx(RefreshCw, { className: cn(large ? "w-4 h-4" : "w-3.5 h-3.5", "opacity-0 group-hover:opacity-60 text-jade/70 transition-opacity") })), _jsx("span", { className: "text-flash/40", children: "Next update" }), _jsx("span", { className: cn("tabular-nums", valueClass), children: label })] }));
}
// Canonical list of tab keys. The frontend tab rendering uses these
// to gate which tabs render; SECTIONS_CATALOG is also what the
// EditLobbyDialog's "Sections" panel renders as checkboxes.
const SECTIONS_CATALOG = [
    { key: "matches", label: "Matches", description: "Per-player match feed", default: true },
    { key: "live", label: "Live", description: "Currently in-game", default: true },
    { key: "leaderboard", label: "Leaderboard", description: "Per-account rankings", default: true },
    { key: "trending", label: "Trending", description: "Lobby-wide trends", default: true },
    { key: "habits", label: "Habits", description: "Time-of-day patterns", default: true },
    { key: "champions", label: "Champions", description: "Champion-pool view", default: true },
    { key: "chat", label: "Chat", description: "Group chat (verified)", default: false },
    { key: "compare", label: "Compare", description: "VS player breakdown", default: false },
];
const DEFAULT_ENABLED_TABS = SECTIONS_CATALOG
    .filter((t) => t.default)
    .map((t) => t.key);
const REGIONS = ["EUW", "NA", "KR"];
const EDIT_MAX_PLAYERS = 20;
const EDIT_MAX_ACCOUNTS = 3;
const makeUid = () => Math.random().toString(36).slice(2, 10);
/* ── Hero champion picker ──────────────────────────────────────────────
 * Tiny search + scrollable grid of champion portraits, sits inside the
 * edit dialog. Selected champion previews a small splash thumbnail.
 */
function HeroChampionPicker({ value, onChange, }) {
    const [champions, setChampions] = useState([]);
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState(false);
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((r) => r.json())
            .then((data) => {
            const list = Object.values(data?.data ?? {}).map((c) => ({
                key: c.key,
                id: c.id,
                name: c.name,
            }));
            list.sort((a, b) => a.name.localeCompare(b.name));
            setChampions(list);
        })
            .catch(console.error);
    }, []);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return champions;
        return champions.filter((c) => c.name.toLowerCase().includes(q) ||
            c.id.toLowerCase().startsWith(q));
    }, [champions, search]);
    const splash = cdnSplashUrl(normalizeChampName(value || DEFAULT_HERO_CHAMPION));
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsxs("button", { type: "button", onClick: () => setExpanded((v) => !v), "aria-expanded": expanded, className: cn("relative h-16 rounded-[3px] overflow-hidden border bg-black/40 cursor-clicker text-left", "transition-all duration-200", expanded
                    ? "border-jade/45 shadow-[0_0_14px_rgba(0,217,146,0.18)]"
                    : "border-flash/15 hover:border-jade/30 hover:shadow-[0_0_12px_rgba(0,217,146,0.12)]"), children: [_jsx("img", { src: splash, alt: value, className: "absolute inset-0 w-full h-full object-cover", style: { objectPosition: "center 35%" } }), _jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-liquirice/85 via-liquirice/30 to-transparent" }), _jsxs("div", { className: "absolute inset-0 px-3 flex items-center gap-3", children: [_jsx("span", { className: "w-8 h-8 rounded-[2px] border border-jade/30 shadow-[0_0_10px_rgba(0,217,146,0.25)] shrink-0 overflow-hidden bg-black", children: _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(value)}.png`, alt: "", className: "w-full h-full" }) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-jade/65", children: "Hero splash" }), _jsx("span", { className: "text-[15px] font-chakrapetch font-bold text-flash tracking-wide truncate", children: value })] }), _jsx("span", { className: cn("shrink-0 text-jade/60 text-[16px] leading-none transition-transform duration-200", expanded ? "rotate-180" : "rotate-0"), "aria-hidden": true, children: "\u2303" })] })] }), _jsx("div", { className: cn("grid transition-[grid-template-rows,opacity] duration-200", expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"), children: _jsx("div", { className: "overflow-hidden", children: _jsxs("div", { className: "flex flex-col gap-2 pt-1", children: [_jsx("input", { type: "text", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search champion\u2026", className: "w-full bg-black/30 border border-flash/15 rounded-[3px] h-9 px-3 text-[13px] text-flash placeholder:text-flash/30 outline-none focus:border-jade/45 transition-colors font-geist" }), _jsxs("div", { className: "grid grid-cols-9 gap-1 max-h-[180px] overflow-y-auto cyber-scrollbar pr-1 -mr-1", children: [filtered.map((c) => {
                                        const selected = c.id === value;
                                        return (_jsxs("button", { type: "button", onClick: () => {
                                                onChange(c.id);
                                                setExpanded(false);
                                            }, title: c.name, className: cn("relative aspect-square rounded-[2px] overflow-hidden border transition-all cursor-clicker", selected
                                                ? "border-jade/70 ring-1 ring-jade/40 shadow-[0_0_10px_rgba(0,217,146,0.35)]"
                                                : "border-flash/[0.08] hover:border-jade/30"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(c.id)}.png`, alt: c.name, className: "w-full h-full", loading: "lazy" }), selected && (_jsx("span", { className: "absolute inset-0 bg-jade/[0.18] pointer-events-none" }))] }, c.key));
                                    }), filtered.length === 0 && (_jsx("span", { className: "col-span-9 py-3 text-center text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/35", children: "No match" }))] })] }) }) })] }));
}
function EditLobbyDialog({ open, onClose, lobby, onSaved, onDeleted, }) {
    const [name, setName] = useState(lobby.name);
    const [heroChampion, setHeroChampion] = useState(lobby.heroChampion ?? DEFAULT_HERO_CHAMPION);
    const [players, setPlayers] = useState(() => lobby.players.map((p) => ({
        uid: makeUid(),
        originalId: p.id,
        displayName: p.displayName,
        accounts: p.accounts.map((a) => ({
            uid: makeUid(),
            puuid: a.puuid,
            region: a.region,
            riotName: a.riotName,
            riotTag: a.riotTag,
        })),
    })));
    // v3 — admin-tunable lobby config.
    const [enabledTabs, setEnabledTabs] = useState(() => lobby.enabledTabs ?? DEFAULT_ENABLED_TABS);
    const [verifyMode, setVerifyMode] = useState(lobby.verifyMode ?? "full");
    // Private lobby — when true only claimed members + admins can view.
    const [isPrivate, setIsPrivate] = useState(lobby.isPublic === false);
    // Collapsible sections — all open by default. Stored as a Set of
    // section keys so toggling is O(1) and order-independent.
    const [openSections, setOpenSections] = useState(() => new Set(["name", "hero", "players", "sections", "verify"]));
    const toggleSection = (k) => setOpenSections((prev) => {
        const next = new Set(prev);
        next.has(k) ? next.delete(k) : next.add(k);
        return next;
    });
    const [saving, setSaving] = useState(false);
    // Two phases for the Save button label — first the PATCH ("Saving…"),
    // then the backend refresh that pre-warms ingestion ("Syncing…").
    const [savePhase, setSavePhase] = useState("idle");
    const [err, setErr] = useState(null);
    // Two-step delete: first click → confirmArmed. Second click within
    // CONFIRM_WINDOW → actually delete. Auto-disarms after 4 seconds.
    const [confirmArmed, setConfirmArmed] = useState(false);
    const [deleting, setDeleting] = useState(false);
    useEffect(() => {
        if (!confirmArmed)
            return;
        const t = window.setTimeout(() => setConfirmArmed(false), 4000);
        return () => window.clearTimeout(t);
    }, [confirmArmed]);
    useEffect(() => {
        if (!open)
            setConfirmArmed(false);
    }, [open]);
    // Reset state when reopened with a different lobby
    useEffect(() => {
        if (!open)
            return;
        setName(lobby.name);
        setHeroChampion(lobby.heroChampion ?? DEFAULT_HERO_CHAMPION);
        setEnabledTabs(lobby.enabledTabs ?? DEFAULT_ENABLED_TABS);
        setVerifyMode(lobby.verifyMode ?? "full");
        setIsPrivate(lobby.isPublic === false);
        setPlayers(lobby.players.map((p) => ({
            uid: makeUid(),
            originalId: p.id,
            displayName: p.displayName,
            accounts: p.accounts.map((a) => ({
                uid: makeUid(),
                puuid: a.puuid,
                region: a.region,
                riotName: a.riotName,
                riotTag: a.riotTag,
            })),
        })));
        setErr(null);
    }, [open, lobby]);
    const addPlayer = () => {
        if (players.length >= EDIT_MAX_PLAYERS)
            return;
        setPlayers((prev) => [
            ...prev,
            { uid: makeUid(), originalId: null, displayName: "", accounts: [] },
        ]);
    };
    const removePlayer = (uid) => setPlayers((prev) => prev.filter((p) => p.uid !== uid));
    const updatePlayer = (uid, patch) => setPlayers((prev) => prev.map((p) => (p.uid === uid ? { ...p, ...patch } : p)));
    const deleteLobby = async () => {
        setErr(null);
        setDeleting(true);
        try {
            const { data: sess } = await supabase.auth.getSession();
            const token = sess?.session?.access_token;
            if (!token) {
                setErr("Login required");
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobby.slug}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setErr(data.error ?? "Failed to delete lobby");
                return;
            }
            showCyberToast({
                title: "Lobby deleted",
                description: `${lobby.name} has been removed`,
                tag: "DEL",
                variant: "status",
            });
            onClose();
            onDeleted?.();
        }
        catch (e) {
            console.error(e);
            setErr("Network error");
        }
        finally {
            setDeleting(false);
        }
    };
    const save = async () => {
        setErr(null);
        if (!name.trim()) {
            setErr("Lobby name required");
            return;
        }
        if (players.length === 0) {
            setErr("At least one player required");
            return;
        }
        for (const p of players) {
            if (!p.displayName.trim()) {
                setErr("Each player needs a name");
                return;
            }
            if (p.accounts.length === 0) {
                setErr(`Player "${p.displayName}" has no accounts`);
                return;
            }
        }
        setSaving(true);
        setSavePhase("saving");
        try {
            const { data: sess } = await supabase.auth.getSession();
            const token = sess?.session?.access_token;
            if (!token) {
                setErr("Login required");
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobby.slug}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    heroChampion: heroChampion?.trim() || null,
                    enabledTabs,
                    verifyMode,
                    isPublic: !isPrivate,
                    players: players.map((p) => ({
                        // Pass the original DB id so the backend can match this
                        // EditPlayer to an existing scout_lobby_players row and
                        // UPDATE it in place — preserving claim/badge/verify
                        // state. New players (added during edit) have id = null
                        // and get freshly inserted.
                        id: p.originalId ?? null,
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
                setErr(data.error ?? "Failed to update lobby");
                return;
            }
            // Force a backend refresh so the fire-and-forget ingestion the PATCH
            // kicked off is actually AWAITED (15s cap on the backend) before we
            // reload the UI. Without this, a freshly added player's matches
            // don't show up in the feed or leaderboard until the next manual
            // refresh — the user perceives this as "the new player isn't
            // tracked". Failures here are non-fatal: the save itself succeeded.
            setSavePhase("syncing");
            try {
                await fetch(`${API_BASE_URL}/api/scout/refresh/${lobby.slug}`, {
                    method: "POST",
                });
            }
            catch {
                /* ignore — the lobby has been saved already */
            }
            showCyberToast({
                title: "Lobby updated",
                description: `${players.length} players, ${players.reduce((n, p) => n + p.accounts.length, 0)} accounts`,
                tag: "SYNC",
                variant: "status",
            });
            onSaved();
            onClose();
        }
        catch (e) {
            console.error(e);
            setErr("Network error");
        }
        finally {
            setSaving(false);
            setSavePhase("idle");
        }
    };
    return (_jsx(Dialog, { open: open, onOpenChange: (v) => !v && onClose(), children: _jsxs(DialogContent, { className: "p-0 border-0 bg-transparent shadow-none max-w-[640px] font-geist [&>button]:hidden", children: [_jsx(DialogTitle, { className: "sr-only", children: "Edit lobby" }), _jsxs("div", { className: "relative rounded-md overflow-hidden", style: {
                        background: "rgba(8,16,20,0.96)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid color-mix(in srgb, #00d992 25%, transparent)",
                    }, children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] z-[1]", style: { background: "color-mix(in srgb, #00d992 55%, transparent)" } }), _jsxs("div", { className: "relative z-10 p-6 max-h-[80vh] overflow-y-auto cyber-scrollbar", children: [_jsxs("div", { className: "flex items-center gap-3 mb-5", children: [_jsx(Pencil, { className: "w-4 h-4 text-jade" }), _jsx("span", { className: "text-[12px] font-jetbrains tracking-[0.22em] uppercase text-jade font-medium", children: "Edit Lobby" }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" }), _jsx("button", { onClick: onClose, className: "text-flash/40 hover:text-flash/80 cursor-clicker", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsx(EditCollapsible, { open: openSections.has("name"), onToggle: () => toggleSection("name"), title: "Lobby name", summary: name || "(no name)", children: _jsx("input", { value: name, onChange: (e) => setName(e.target.value), maxLength: 80, className: "w-full bg-black/30 border border-flash/20 rounded-[3px] h-11 px-3 text-[15px] text-flash placeholder:text-flash/35 outline-none focus:border-jade/45 transition-colors" }) }), _jsx(EditCollapsible, { open: openSections.has("hero"), onToggle: () => toggleSection("hero"), title: "Hero splash", summary: heroChampion || "Default", children: _jsx(HeroChampionPicker, { value: heroChampion, onChange: setHeroChampion }) }), _jsxs(EditCollapsible, { open: openSections.has("players"), onToggle: () => toggleSection("players"), title: "Players", summary: `${players.length}/${EDIT_MAX_PLAYERS}`, action: _jsxs("button", { onClick: (e) => {
                                            e.stopPropagation();
                                            addPlayer();
                                        }, disabled: players.length >= EDIT_MAX_PLAYERS, className: cn("flex items-center gap-1.5 text-[10px] font-jetbrains tracking-[0.2em] uppercase font-medium px-2.5 py-1.5 rounded-[3px] border cursor-clicker transition-all", players.length >= EDIT_MAX_PLAYERS
                                            ? "border-flash/10 text-flash/25"
                                            : "border-jade/30 text-jade bg-jade/[0.08] hover:bg-jade/[0.15]"), children: [_jsx(Plus, { className: "w-3 h-3" }), " Add player"] }), children: [_jsx(LobbyAdminsPanel, { lobby: lobby, onChanged: onSaved }), _jsx("div", { className: "flex flex-col gap-2", children: players.map((p, idx) => {
                                                // Match the EditPlayer to its persisted LobbyPlayer
                                                // (via originalId) so we can show claim/badge state
                                                // for already-saved players.
                                                const persisted = p.originalId
                                                    ? lobby.players.find((lp) => lp.id === p.originalId) ?? null
                                                    : null;
                                                // EditPlayerRow + Identity panel share an outer
                                                // border so they read as ONE unit. Inner divider
                                                // is a hairline so the visual seam stays subtle.
                                                return (_jsxs("div", { className: "rounded-[4px] border border-flash/[0.08] bg-black/[0.18] overflow-hidden", children: [_jsx(EditPlayerRow, { index: idx, player: p, onChange: (next) => updatePlayer(p.uid, next), onRemove: () => removePlayer(p.uid), seamless: true }), _jsx("div", { className: "h-[1px] bg-flash/[0.06]" }), _jsx(PlayerIdentityPanel, { lobbySlug: lobby.slug, playerId: p.originalId ?? null, persisted: persisted, displayName: p.displayName, onChanged: onSaved })] }, p.uid));
                                            }) })] }), _jsx(EditCollapsible, { open: openSections.has("sections"), onToggle: () => toggleSection("sections"), title: "Sections", summary: `${enabledTabs.length} enabled`, children: _jsx(SectionsChooser, { enabled: enabledTabs, onChange: setEnabledTabs }) }), _jsxs(EditCollapsible, { open: openSections.has("verify"), onToggle: () => toggleSection("verify"), title: "Verify", summary: (isPrivate ? "Private · " : "") +
                                        (verifyMode === "disabled"
                                            ? "Disabled"
                                            : verifyMode === "claim_only"
                                                ? "Grade 1 only"
                                                : "Full"), children: [_jsxs("button", { type: "button", onClick: () => setIsPrivate((p) => !p), className: cn("w-full flex items-start gap-2.5 px-3 py-2.5 rounded-[3px] border cursor-clicker transition-all text-left mb-3", isPrivate
                                                ? "border-jade/45 bg-jade/[0.08]"
                                                : "border-flash/10 bg-black/15 hover:border-flash/25"), children: [_jsx(Lock, { className: cn("w-4 h-4 mt-0.5 shrink-0", isPrivate ? "text-jade" : "text-flash/45") }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: cn("text-[11px] font-chakrapetch font-bold", isPrivate ? "text-flash" : "text-flash/70"), children: "Private lobby" }), _jsx("span", { className: cn("relative ml-auto w-8 h-4 rounded-full transition-colors shrink-0", isPrivate
                                                                        ? "bg-jade/40 border border-jade/60"
                                                                        : "bg-flash/10 border border-flash/15"), children: _jsx("span", { className: cn("absolute top-[1px] w-[14px] h-[14px] rounded-full transition-all", isPrivate
                                                                            ? "left-[15px] bg-jade shadow-[0_0_6px_rgba(0,217,146,0.6)]"
                                                                            : "left-[1px] bg-flash/40") }) })] }), _jsx("span", { className: "text-[9px] text-flash/45 font-geist mt-0.5 leading-snug", children: "Only claimed members + admins can view the lobby. Everyone else sees a locked page." })] })] }), _jsx("div", { className: "text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mb-1.5", children: "Verification mode" }), _jsx(VerifyModeRadio, { value: verifyMode, onChange: setVerifyMode })] }), err && (_jsxs("div", { className: "text-[11px] font-jetbrains tracking-[0.15em] uppercase text-error/80 mb-3", children: ["\u25C6 ", err] })), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("button", { onClick: () => {
                                                if (confirmArmed)
                                                    deleteLobby();
                                                else
                                                    setConfirmArmed(true);
                                            }, disabled: saving || deleting, className: cn("text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium px-3 py-2 rounded-[3px] border cursor-clicker transition-all flex items-center gap-2", confirmArmed
                                                ? "border-[#d63336]/55 text-[#d63336] bg-[#d63336]/[0.10] shadow-[0_0_18px_rgba(214,51,54,0.25)]"
                                                : "border-flash/15 text-flash/45 hover:text-[#d63336] hover:border-[#d63336]/40 hover:bg-[#d63336]/[0.05]", (saving || deleting) && "opacity-50"), title: confirmArmed
                                                ? "Click again to confirm deletion"
                                                : "Delete this lobby", children: [_jsx(Trash2, { className: "w-3.5 h-3.5" }), deleting
                                                    ? "Deleting…"
                                                    : confirmArmed
                                                        ? "Click again to confirm"
                                                        : "Delete lobby"] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onClose, disabled: saving || deleting, className: "text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium px-4 py-2 rounded-[3px] border border-flash/15 text-flash/60 hover:bg-flash/[0.05] cursor-clicker disabled:opacity-50", children: "Cancel" }), _jsx("button", { onClick: save, disabled: saving || deleting, className: "text-[11px] font-jetbrains tracking-[0.2em] uppercase font-medium px-5 py-2 rounded-[3px] border border-jade/45 text-jade bg-jade/[0.10] hover:bg-jade/[0.20] shadow-[0_0_20px_rgba(0,217,146,0.18)] cursor-clicker disabled:opacity-50", children: savePhase === "syncing"
                                                        ? "Syncing…"
                                                        : saving
                                                            ? "Saving…"
                                                            : "Save" })] })] })] })] })] }) }));
}
function EditPlayerRow({ index, player, onChange, onRemove, seamless = false, }) {
    const slotLabel = `P${String(index + 1).padStart(2, "0")}`;
    const [adding, setAdding] = useState(false);
    const [region, setRegion] = useState("EUW");
    const [raw, setRaw] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [accErr, setAccErr] = useState(null);
    const submitAccount = async () => {
        setAccErr(null);
        const m = raw.trim().match(/^(.+)#(.+)$/);
        if (!m) {
            setAccErr("Format: name#tag");
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
                setAccErr("Account not found");
                return;
            }
            const data = await res.json();
            const sum = data?.summoner;
            if (!sum?.puuid) {
                setAccErr("Account not found");
                return;
            }
            onChange({
                ...player,
                accounts: [
                    ...player.accounts,
                    {
                        uid: makeUid(),
                        puuid: sum.puuid,
                        region,
                        riotName: sum.name ?? name,
                        riotTag: sum.tag ?? tag,
                    },
                ],
            });
            setRaw("");
            setAdding(false);
        }
        finally {
            setVerifying(false);
        }
    };
    return (_jsxs("div", { className: cn("p-3", seamless
            ? "bg-transparent"
            : "bg-black/25 border border-flash/15 rounded-[3px]"), children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("span", { className: "text-[10px] font-jetbrains font-medium tracking-[0.2em] uppercase px-1.5 py-[2px] rounded-[2px]", style: {
                            color: "#00d992",
                            background: "rgba(0,217,146,0.08)",
                            border: "1px solid color-mix(in srgb, #00d992 25%, transparent)",
                        }, children: slotLabel }), _jsx("input", { value: player.displayName, onChange: (e) => onChange({ ...player, displayName: e.target.value }), placeholder: "Player name", maxLength: 40, className: "flex-1 bg-transparent text-sm text-flash placeholder:text-flash/30 outline-none border-b border-flash/0 focus:border-jade/40 transition-colors py-0.5" }), _jsx("button", { onClick: onRemove, className: "text-flash/35 hover:text-error transition-colors cursor-clicker", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex flex-col gap-1 pl-1", children: [player.accounts.map((a) => (_jsxs("div", { className: "flex items-center gap-2 text-xs px-1 py-1 rounded-[2px] hover:bg-flash/[0.03]", children: [_jsx(Check, { className: "w-3 h-3 text-jade shrink-0" }), _jsx("span", { className: "text-[10px] font-jetbrains tracking-[0.15em] uppercase text-jade/60 w-9", children: a.region }), _jsxs("span", { className: "text-flash/80 truncate", children: [a.riotName, _jsxs("span", { className: "text-flash/30", children: ["#", a.riotTag] })] }), _jsx("button", { onClick: () => onChange({
                                    ...player,
                                    accounts: player.accounts.filter((x) => x.uid !== a.uid),
                                }), className: "ml-auto text-flash/30 hover:text-error cursor-clicker", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }, a.uid))), adding ? (_jsxs("div", { className: "flex flex-col gap-1.5 mt-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("select", { value: region, onChange: (e) => setRegion(e.target.value), className: "bg-black/40 border border-flash/15 rounded-[2px] text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/85 px-2 py-1 outline-none", children: REGIONS.map((r) => (_jsx("option", { value: r, children: r }, r))) }), _jsx("input", { autoFocus: true, value: raw, onChange: (e) => setRaw(e.target.value), onKeyDown: (e) => {
                                            if (e.key === "Enter")
                                                submitAccount();
                                            if (e.key === "Escape")
                                                setAdding(false);
                                        }, placeholder: "name#tag", className: "flex-1 bg-black/30 border border-flash/15 rounded-[2px] text-xs text-flash placeholder:text-flash/30 px-2 py-1 outline-none focus:border-jade/40" }), _jsx("button", { onClick: submitAccount, disabled: verifying, className: "text-[10px] font-jetbrains tracking-[0.15em] uppercase px-2 py-1 rounded-[2px] border border-jade/40 text-jade bg-jade/10 hover:bg-jade/20 cursor-clicker", children: verifying ? "…" : "Add" }), _jsx("button", { onClick: () => {
                                            setAdding(false);
                                            setRaw("");
                                            setAccErr(null);
                                        }, className: "text-flash/40 hover:text-flash/80 cursor-clicker", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }), accErr && (_jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.12em] uppercase text-error/80 pl-1", children: ["\u25C6 ", accErr] }))] })) : (player.accounts.length < EDIT_MAX_ACCOUNTS && (_jsxs("button", { onClick: () => setAdding(true), className: "flex items-center gap-1.5 mt-1 text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[2px] border border-flash/15 text-flash/55 hover:bg-flash/[0.04] cursor-clicker self-start", children: [_jsx(Plus, { className: "w-3 h-3" }), " Account"] })))] })] }));
}
/* ─── per-player identity panel (claim invite + badge toggle) ───────── */
//
// Sits under each EditPlayerRow inside the EditLobbyDialog. Lets the
// admin generate a reusable claim link, revoke it, and toggle the
// green verify badge on/off for that player.
//
// Auth — every mutation here hits an admin-only endpoint, so we send
// the supabase session token as Bearer.
function PlayerIdentityPanel({ lobbySlug, playerId, persisted, displayName, onChanged, }) {
    const [token, setToken] = useState(null);
    const [loadingInvite, setLoadingInvite] = useState(false);
    const [showBadge, setShowBadge] = useState(!!persisted?.showVerifyBadge);
    // Sync local toggle when persisted changes (e.g. after onChanged → reload).
    useEffect(() => {
        setShowBadge(!!persisted?.showVerifyBadge);
    }, [persisted?.showVerifyBadge]);
    const isClaimed = !!persisted?.claimedByProfileId;
    // Unsaved player → can't manage identity yet. Sits inside the
    // shared parent border, so no border/bg of our own.
    if (!playerId || !persisted) {
        return (_jsx("div", { className: "px-3 py-2 bg-black/15", children: _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/30", children: "Save to enable identity controls" }) }));
    }
    const authHeader = async () => {
        const { data: { session }, } = await supabase.auth.getSession();
        if (!session?.access_token)
            return null;
        return { Authorization: `Bearer ${session.access_token}` };
    };
    const generateInvite = async () => {
        setLoadingInvite(true);
        try {
            const headers = await authHeader();
            if (!headers) {
                showCyberToast({ title: "Sign in required", variant: "error" });
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobbySlug}/player/${playerId}/claim-invite`, { method: "POST", headers });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                showCyberToast({
                    title: "Invite failed",
                    description: body?.error,
                    variant: "error",
                });
                return;
            }
            const data = await res.json();
            setToken(data.token);
            const url = `${window.location.origin}/scout/claim/${data.token}`;
            try {
                await navigator.clipboard.writeText(url);
                showCyberToast({
                    title: "Invite link copied",
                    description: url,
                });
            }
            catch {
                showCyberToast({ title: "Invite ready", description: url });
            }
        }
        finally {
            setLoadingInvite(false);
        }
    };
    const revokeInvite = async () => {
        const headers = await authHeader();
        if (!headers)
            return;
        const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobbySlug}/player/${playerId}/claim-invite`, { method: "DELETE", headers });
        if (res.ok) {
            setToken(null);
            showCyberToast({ title: "Invite revoked" });
        }
        else {
            showCyberToast({ title: "Revoke failed", variant: "error" });
        }
    };
    const toggleBadge = async (next) => {
        setShowBadge(next);
        const headers = await authHeader();
        if (!headers)
            return;
        const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobbySlug}/player/${playerId}/verify-badge`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ show: next }),
        });
        if (!res.ok) {
            setShowBadge(!next); // revert
            showCyberToast({ title: "Badge toggle failed", variant: "error" });
            return;
        }
        onChanged();
    };
    return (_jsx("div", { className: "px-3 py-2 bg-black/15", children: _jsxs("div", { className: "flex items-center gap-3 flex-wrap", children: [_jsx("div", { className: "flex items-center gap-1.5 shrink-0", children: isClaimed ? (_jsxs(_Fragment, { children: [_jsx(VerifyBadge, { grade: persisted.verifyGrade === 2 ? 2 : 1, size: 12 }), _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-jade font-bold", children: "Claimed" })] })) : (_jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40", children: "\u25C7 Unclaimed" })) }), _jsx("div", { className: "flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent min-w-[20px]" }), !isClaimed && (_jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [_jsx("button", { type: "button", onClick: generateInvite, disabled: loadingInvite, className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[3px] border border-jade/30 text-jade bg-jade/[0.08] hover:bg-jade/[0.15] cursor-clicker transition-all disabled:opacity-50", children: loadingInvite ? "…" : token ? "↺ Copy again" : "+ Invite link" }), token && (_jsx("button", { type: "button", onClick: revokeInvite, className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[3px] border border-flash/15 text-flash/55 hover:text-error/80 hover:border-error/30 cursor-clicker transition-all", children: "Revoke" }))] })), isClaimed && (_jsxs("label", { className: "flex items-center gap-2 cursor-clicker shrink-0", title: "Show verify badge next to player name in match feed", children: [_jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/55", children: "Badge" }), _jsx("button", { type: "button", role: "switch", "aria-checked": showBadge, onClick: () => toggleBadge(!showBadge), className: cn("relative w-8 h-4 rounded-full transition-colors", showBadge
                                ? "bg-jade/40 border border-jade/60"
                                : "bg-flash/10 border border-flash/15"), children: _jsx("span", { className: cn("absolute top-[1px] w-[14px] h-[14px] rounded-full transition-all", showBadge
                                    ? "left-[15px] bg-jade shadow-[0_0_6px_rgba(0,217,146,0.6)]"
                                    : "left-[1px] bg-flash/40") }) })] }))] }) }));
}
/* ─── edit dialog v3 helpers ─────────────────────────────────────────── */
//
// All four pieces live next to PlayerIdentityPanel since they're
// only used inside EditLobbyDialog. Function declarations hoist so
// the dialog can reference them above.
/** Collapsible section wrapper used by EditLobbyDialog. */
function EditCollapsible({ open, onToggle, title, summary, action, children, }) {
    return (_jsxs("div", { className: "mb-3 rounded-[4px] border border-flash/10 overflow-hidden bg-black/15", children: [_jsxs("button", { type: "button", onClick: onToggle, className: "w-full flex items-center gap-2 px-3 py-2.5 cursor-clicker hover:bg-flash/[0.03] transition-colors", children: [_jsx(ChevronDown, { className: cn("w-3.5 h-3.5 text-flash/55 shrink-0 transition-transform", open ? "rotate-0" : "-rotate-90") }), _jsx("span", { className: "text-[11px] font-jetbrains tracking-[0.22em] uppercase text-flash/65 font-medium", children: title }), summary && (_jsxs("span", { className: "text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/35 truncate", children: ["\u00B7 ", summary] })), _jsx("div", { className: "flex-1" }), action] }), open && (_jsx("div", { className: "px-4 pt-2 pb-4 border-t border-flash/[0.05]", children: children }))] }));
}
/** Co-admin promotion panel — current admins + promote/demote. */
function LobbyAdminsPanel({ lobby, onChanged, }) {
    const [busy, setBusy] = useState(null);
    const admins = lobby.admins ?? [];
    const adminIds = new Set(admins.map((a) => a.profileId));
    const claimedPlayers = lobby.players.filter((p) => p.claimedByProfileId);
    const authHeader = async () => {
        const { data: { session }, } = await supabase.auth.getSession();
        if (!session?.access_token)
            return null;
        return {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
        };
    };
    const promote = async (profileId) => {
        setBusy(profileId);
        try {
            const headers = await authHeader();
            if (!headers)
                return;
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobby.slug}/admins`, { method: "POST", headers, body: JSON.stringify({ profileId }) });
            if (res.ok) {
                showCyberToast({ title: "Promoted to co-admin" });
                onChanged();
            }
            else {
                const body = await res.json().catch(() => ({}));
                showCyberToast({
                    title: "Promote failed",
                    description: body?.error,
                    variant: "error",
                });
            }
        }
        finally {
            setBusy(null);
        }
    };
    const demote = async (profileId) => {
        setBusy(profileId);
        try {
            const headers = await authHeader();
            if (!headers)
                return;
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${lobby.slug}/admins/${profileId}`, { method: "DELETE", headers });
            if (res.ok) {
                showCyberToast({ title: "Co-admin removed" });
                onChanged();
            }
            else {
                showCyberToast({ title: "Remove failed", variant: "error" });
            }
        }
        finally {
            setBusy(null);
        }
    };
    const labelFor = (profileId) => {
        const p = lobby.players.find((x) => x.claimedByProfileId === profileId);
        return p?.displayName ?? profileId.slice(0, 8);
    };
    const promotable = claimedPlayers.filter((p) => !adminIds.has(p.claimedByProfileId));
    return (_jsxs("div", { className: "mb-3 rounded-[3px] bg-black/15 border border-flash/[0.06] p-3", children: [_jsx("div", { className: "text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/50 mb-2", children: "\u25C7 Admins" }), admins.length === 0 ? (_jsx("div", { className: "text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/30", children: "No admins yet" })) : (_jsx("div", { className: "flex flex-col gap-1.5 mb-2", children: admins.map((a) => {
                    const isCreator = a.profileId === lobby.ownerUserId;
                    return (_jsxs("div", { className: "flex items-center gap-2 text-[11px] font-chakrapetch text-flash", children: [_jsx("span", { className: cn("px-1.5 py-[2px] rounded-[2px] text-[8px] font-jetbrains tracking-[0.2em] uppercase font-bold", isCreator
                                    ? "bg-citrine/15 text-citrine border border-citrine/35"
                                    : "bg-jade/10 text-jade border border-jade/30"), children: isCreator ? "Creator" : "Co-admin" }), _jsx("span", { className: "truncate flex-1", children: labelFor(a.profileId) }), !isCreator && (_jsx("button", { type: "button", onClick: () => demote(a.profileId), disabled: busy === a.profileId, className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/40 hover:text-error/80 cursor-clicker disabled:opacity-40", children: "Remove" }))] }, a.profileId));
                }) })), promotable.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mb-1.5 mt-3", children: "Promote claimed users" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: promotable.map((p) => (_jsxs("button", { type: "button", onClick: () => promote(p.claimedByProfileId), disabled: busy === p.claimedByProfileId, className: "text-[9px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[3px] border border-jade/25 text-jade/85 bg-jade/[0.06] hover:bg-jade/[0.15] cursor-clicker transition-all disabled:opacity-40", children: ["+ ", p.displayName] }, p.id))) })] }))] }));
}
/** Tab chooser — checkbox grid. */
function SectionsChooser({ enabled, onChange, }) {
    const enabledSet = new Set(enabled);
    const toggle = (key) => {
        const next = new Set(enabledSet);
        next.has(key) ? next.delete(key) : next.add(key);
        onChange([...next]);
    };
    return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: SECTIONS_CATALOG.map((t) => {
            const isOn = enabledSet.has(t.key);
            const isOptIn = !t.default;
            return (_jsxs("button", { type: "button", onClick: () => toggle(t.key), className: cn("flex items-start gap-2.5 px-3 py-2 rounded-[3px] border cursor-clicker transition-all text-left", isOn
                    ? "border-jade/40 bg-jade/[0.08]"
                    : "border-flash/10 bg-black/15 hover:border-flash/25"), children: [_jsx("div", { className: cn("w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5 transition-all", isOn
                            ? "bg-jade/40 border-jade/60"
                            : "border-flash/20 bg-black/30"), children: isOn && _jsx(Check, { className: "w-2.5 h-2.5 text-flash" }) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: cn("text-[11px] font-chakrapetch font-bold", isOn ? "text-flash" : "text-flash/70"), children: t.label }), isOptIn && (_jsx("span", { className: "text-[7px] font-jetbrains tracking-[0.2em] uppercase text-citrine/80 bg-citrine/10 border border-citrine/30 px-1 py-[1px] rounded-[2px]", children: "Opt-in" }))] }), _jsx("span", { className: "text-[9px] text-flash/45 font-geist mt-0.5 leading-snug", children: t.description })] })] }, t.key));
        }) }));
}
/** Verify-mode 3-way radio. */
function VerifyModeRadio({ value, onChange, }) {
    const options = [
        {
            key: "full",
            label: "Full (Grade 1 + Grade 2)",
            helper: "Claim invites are active, identity badges show in the feed, and verified users can run the per-account icon challenge to unlock Grade 2.",
        },
        {
            key: "claim_only",
            label: "Grade 1 only",
            helper: "Claim invites and identity badges work, but the rhombus Verify FAB and account-challenge dialog stay hidden.",
        },
        {
            key: "disabled",
            label: "Disabled",
            helper: "No claim invites, no badges, no FAB. Chat (when enabled) becomes open to anyone signed in.",
        },
    ];
    return (_jsx("div", { className: "flex flex-col gap-2", children: options.map((o) => {
            const isOn = value === o.key;
            return (_jsxs("button", { type: "button", onClick: () => onChange(o.key), className: cn("flex items-start gap-2.5 px-3 py-2 rounded-[3px] border cursor-clicker transition-all text-left", isOn
                    ? "border-jade/45 bg-jade/[0.08]"
                    : "border-flash/10 bg-black/15 hover:border-flash/25"), children: [_jsx("div", { className: cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all", isOn ? "border-jade/70" : "border-flash/25"), children: isOn && (_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.6)]" })) }), _jsxs("div", { className: "flex flex-col min-w-0 flex-1", children: [_jsx("span", { className: cn("text-[11px] font-chakrapetch font-bold", isOn ? "text-flash" : "text-flash/70"), children: o.label }), _jsx("span", { className: "text-[9px] text-flash/45 font-geist mt-0.5 leading-snug", children: o.helper })] })] }, o.key));
        }) }));
}
/* ─── main page ─────────────────────────────────────────────────────── */
export default function ScoutLobbyPage() {
    const { slug, tab: tabParam } = useParams();
    // Allowed tab values — anything else falls back to "matches".
    const VALID_TABS = useMemo(() => new Set([
        "matches",
        "live",
        "leaderboard",
        "trending",
        "habits",
        "champions",
        "chat",
        "compare",
    ]), []);
    const activeTab = tabParam && VALID_TABS.has(tabParam) ? tabParam : "matches";
    const navigate = useNavigate();
    const [lobby, setLobby] = useState(null);
    const [lobbyError, setLobbyError] = useState(null);
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [verifyOpen, setVerifyOpen] = useState(false);
    const { session } = useAuth();
    // ── Live lobby chat — socket runs page-wide ─────────────────────────
    // Mounted here (not inside the Chat tab) so the WebSocket stays open on
    // every tab. That's what lets the Chat tab flash an unread dot when a
    // message lands while the user is looking at another tab.
    const chatUserId = session?.user?.id ?? null;
    const { messages: chatMessages, loading: chatLoading, sending: chatSending, unread: chatUnread, markRead: chatMarkRead, send: chatSend, } = useScoutChat({ slug: slug ?? "", activeTab });
    // Clear the unread dot the moment the user opens the Chat tab.
    useEffect(() => {
        if (activeTab === "chat")
            chatMarkRead();
    }, [activeTab, chatMarkRead]);
    // Single source of truth for which tabs are visible — the desktop
    // TabsList AND the mobile <select> both derive from this, so they can
    // never drift (the mobile picker used to hard-code 6 options, omitting
    // Chat/Compare and ignoring enabledTabs).
    const visibleTabs = useMemo(() => {
        const enabled = new Set(lobby?.enabledTabs ?? DEFAULT_ENABLED_TABS);
        return SECTIONS_CATALOG.filter((t) => enabled.has(t.key));
    }, [lobby?.enabledTabs]);
    useEffect(() => {
        const onScroll = () => setShowScrollTop(window.scrollY > 400);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    // Refresh-cycle wiring. `refreshTick` is bumped after each refresh so the
    // feed/leaderboard/etc. re-fetch with the freshly-ingested matches.
    const [refreshTick, setRefreshTick] = useState(0);
    const [refreshing] = useState(false);
    const handleRefreshDone = useCallback((newLastRefreshAt) => {
        setLobby((prev) => prev ? { ...prev, lastRefreshAt: newLastRefreshAt } : prev);
        setRefreshTick((t) => t + 1);
    }, []);
    // Initial load — re-runs after refreshTick increments to pull fresh data.
    useEffect(() => {
        if (!slug)
            return;
        let cancelled = false;
        const isFirst = refreshTick === 0;
        const load = async () => {
            if (isFirst)
                setInitialLoading(true);
            setLobbyError(null);
            // eslint-disable-next-line no-console
            console.log(`[ScoutLobby] reload (refreshTick=${refreshTick}, isFirst=${isFirst})`);
            try {
                // Send the auth token so the backend can decide private-lobby
                // access (claimed members + admins see the full payload; others
                // get a locked stub).
                const { data: { session: authSession }, } = await supabase.auth.getSession();
                const authHeaders = authSession?.access_token
                    ? { Authorization: `Bearer ${authSession.access_token}` }
                    : {};
                const [lobbyRes, feedRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/api/scout/lobby/${slug}`, {
                        cache: "no-store",
                        headers: authHeaders,
                    }),
                    fetch(`${API_BASE_URL}/api/scout/feed/${slug}`, {
                        cache: "no-store",
                        headers: authHeaders,
                    }),
                ]);
                if (lobbyRes.status === 404) {
                    if (!cancelled)
                        setLobbyError("Lobby not found");
                    return;
                }
                if (!lobbyRes.ok) {
                    if (!cancelled)
                        setLobbyError("Failed to load lobby");
                    return;
                }
                const lobbyData = (await lobbyRes.json());
                const feedData = (await feedRes.json());
                if (cancelled)
                    return;
                // eslint-disable-next-line no-console
                console.log(`[ScoutLobby] feed loaded: ${feedData.items.length} items, newest matchId=${feedData.items[0]?.matchId ?? "(none)"} @ ${feedData.items[0]?.gameCreation ?? "(none)"}`);
                setLobby(lobbyData);
                setItems(feedData.items);
                setCursor(feedData.nextCursor);
                setHasMore(feedData.nextCursor !== null);
            }
            catch (err) {
                console.error(err);
                if (!cancelled)
                    setLobbyError("Network error");
            }
            finally {
                if (!cancelled && isFirst)
                    setInitialLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [slug, refreshTick]);
    // Sync the browser tab title to the current lobby name. Restored on unmount
    // so backing out of the scout page leaves a clean default for other routes.
    useEffect(() => {
        if (!lobby?.name)
            return;
        const prev = document.title;
        document.title = `lolData - ${lobby.name}`;
        return () => {
            document.title = prev;
        };
    }, [lobby?.name]);
    const loadMore = useCallback(async () => {
        if (!slug || !cursor || loadingMore || !hasMore)
            return;
        setLoadingMore(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/scout/feed/${slug}?cursor=${encodeURIComponent(cursor)}`);
            if (!res.ok)
                return;
            const data = (await res.json());
            setItems((prev) => [...prev, ...data.items]);
            setCursor(data.nextCursor);
            setHasMore(data.nextCursor !== null);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            setLoadingMore(false);
        }
    }, [slug, cursor, loadingMore, hasMore]);
    if (lobbyError) {
        return (_jsx("div", { className: "w-full flex justify-center pt-10 pb-24 font-geist", children: _jsx("div", { className: "w-full max-w-[820px]", children: _jsxs("div", { className: cn(glassDark, "p-8 text-center"), children: [_jsx(GlowBackdrop, {}), _jsxs("div", { className: "relative z-10", children: [_jsxs("span", { className: "text-[12px] font-jetbrains tracking-[0.22em] uppercase text-error/80", children: ["\u25C6 ", lobbyError] }), _jsx("p", { className: "mt-3 text-flash/55 text-sm", children: "The lobby link may be broken or the lobby has been deleted." })] })] }) }) }));
    }
    if (initialLoading || !lobby) {
        return (_jsx("div", { className: "w-full flex justify-center pt-10 pb-24 font-geist", children: _jsx("div", { className: "w-full max-w-[860px]", children: _jsxs("div", { className: cn(glassDark, "p-10 flex items-center justify-center gap-3"), children: [_jsx(GlowBackdrop, {}), _jsx(Loader2, { className: "w-5 h-5 text-jade animate-spin relative z-10" }), _jsx("span", { className: "relative z-10 text-flash/65 text-sm font-jetbrains tracking-[0.18em] uppercase", children: "Loading lobby" })] }) }) }));
    }
    // Private lobby + non-member → hero (no refresh clock) + locked body.
    if (lobby.locked) {
        return (_jsxs("div", { className: "w-full pb-24 font-geist", children: [_jsx(LobbyHero, { lobby: lobby }), _jsx(LockedLobbyBody, {})] }));
    }
    return (_jsxs("div", { className: "w-full pb-24 font-geist", children: [_jsx(LobbyHero, { lobby: lobby, refreshSlot: _jsx(RefreshClock, { lastRefreshAt: lobby.lastRefreshAt, refreshing: refreshing, onRefreshDone: handleRefreshDone, slug: slug, large: true }) }), _jsx("div", { className: "flex justify-center", children: _jsxs("div", { className: "w-full max-w-[1280px] px-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6", children: [_jsx("div", { className: "min-w-0", children: _jsxs(Tabs, { value: activeTab, onValueChange: (v) => {
                                    // Default tab → bare slug URL. Other tabs → /:slug/:tab.
                                    const next = v === "matches" ? `/scout/${slug}` : `/scout/${slug}/${v}`;
                                    navigate(next, { replace: false });
                                }, children: [_jsx("div", { className: "sm:hidden mb-4", children: _jsxs("label", { className: "relative block group", children: [_jsx("select", { value: activeTab, onChange: (e) => {
                                                        const v = e.target.value;
                                                        const next = v === "matches" ? `/scout/${slug}` : `/scout/${slug}/${v}`;
                                                        navigate(next, { replace: false });
                                                    }, className: "w-full appearance-none bg-black/55 backdrop-blur-md ring-1 ring-jade/30 rounded-md pl-4 pr-10 py-3.5 text-[14px] font-chakrapetch font-bold tracking-[0.18em] uppercase text-jade cursor-clicker focus:outline-none focus:ring-2 focus:ring-jade/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_18px_rgba(0,0,0,0.4)]", children: visibleTabs.map((t) => (_jsx("option", { value: t.key, children: t.label }, t.key))) }), chatUnread > 0 &&
                                                    activeTab !== "chat" &&
                                                    visibleTabs.some((t) => t.key === "chat") && (_jsx("span", { className: "pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[#ff3e4e] shadow-[0_0_8px_rgba(255,62,78,0.85)] animate-pulse" })), _jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-jade/65 text-[10px]", children: "\u25BC" })] }) }), _jsx("div", { className: "hidden sm:flex items-end justify-between border-b border-flash/[0.06] mb-6 gap-2", children: _jsx(TabsList, { className: "flex justify-start mx-0 bg-transparent h-auto p-0 gap-7 border-0", children: visibleTabs.map((tab) => (_jsxs(TabsTrigger, { value: tab.key, className: cn("group relative font-jetbrains text-[11px] tracking-[0.22em] uppercase px-2 py-3 rounded-none bg-transparent border-none shadow-none transition-all duration-300 cursor-clicker shrink-0", "text-flash/40 hover:text-flash/65 font-medium", "data-[state=active]:text-jade data-[state=active]:bg-transparent data-[state=active]:shadow-none"), children: [_jsx("span", { className: "hidden group-data-[state=active]:inline text-jade/45 mr-1", children: "[" }), tab.label, _jsx("span", { className: "hidden group-data-[state=active]:inline text-jade/45 ml-1", children: "]" }), tab.key === "chat" && chatUnread > 0 && (_jsx("span", { className: "absolute top-1.5 -right-2 w-[7px] h-[7px] rounded-full bg-[#ff3e4e] shadow-[0_0_8px_rgba(255,62,78,0.85)] animate-pulse" })), _jsx("span", { className: "absolute bottom-0 left-0 right-0 h-px bg-jade/70 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300 origin-center shadow-[0_0_8px_rgba(0,217,146,0.4)]" })] }, tab.key))) }) }), _jsx(TabsContent, { value: "matches", className: "mt-0", children: _jsx(MatchesTab, { items: items, lobby: lobby, hasMore: hasMore, loadingMore: loadingMore, loadMore: loadMore }) }), _jsx(TabsContent, { value: "live", className: "mt-0", children: _jsx(LiveTab, { slug: slug }) }), _jsx(TabsContent, { value: "leaderboard", className: "mt-0", children: _jsx(LeaderboardTab, { slug: slug, refreshTick: refreshTick }) }), _jsx(TabsContent, { value: "trending", className: "mt-0", children: _jsx(TrendingTab, { slug: slug, refreshTick: refreshTick }) }), _jsx(TabsContent, { value: "habits", className: "mt-0", children: _jsx(HabitsTab, { slug: slug }) }), _jsx(TabsContent, { value: "champions", className: "mt-0", children: _jsx(ChampionsTab, { slug: slug, lobby: lobby }) }), _jsx(TabsContent, { value: "chat", className: "mt-0", children: _jsx(ChatTab, { lobby: lobby, userId: chatUserId, messages: chatMessages, loading: chatLoading, sending: chatSending, onSend: chatSend }) }), _jsx(TabsContent, { value: "compare", className: "mt-0", children: _jsx(CompareTab, { slug: slug, lobby: lobby, refreshTick: refreshTick }) })] }) }), _jsx("aside", { className: "lg:sticky lg:top-6 lg:self-start", children: _jsx(SidebarLeaderboard, { slug: slug, refreshTick: refreshTick }) })] }) }), _jsx("div", { className: cn("fixed bottom-10 right-10 z-50 transition-all duration-300 ease-in-out", showScrollTop
                    ? "opacity-100 pointer-events-auto translate-y-0"
                    : "opacity-0 pointer-events-none translate-y-3"), children: _jsx(DiamondButton, { icon: "top", label: "TOP", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) }) }), (() => {
                const myProfileId = session?.user?.id ?? null;
                const me = myProfileId
                    ? lobby.players.find((p) => p.claimedByProfileId === myProfileId) ?? null
                    : null;
                const showEdit = !!myProfileId && myProfileId === lobby.ownerUserId;
                // Verify FAB is gated by lobby's verify_mode. Only the full
                // mode runs the Phase 2 challenge; "claim_only" stops at
                // Grade 1 so there's nothing to do here, and "disabled"
                // turns the whole flow off.
                const verifyMode = lobby.verifyMode ?? "full";
                const showVerify = verifyMode === "full" && !!me && (me.verifyGrade ?? 0) < 2;
                if (!showEdit && !showVerify)
                    return null;
                return (_jsx("div", { className: "fixed bottom-10 left-10 z-50", children: _jsx("div", { className: "flex flex-col-reverse items-center gap-3", children: _jsxs(AnimatePresence, { initial: false, children: [showEdit && (_jsx(motion.div, { layout: true, initial: { opacity: 0, y: -10, scale: 0.85 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -10, scale: 0.85 }, transition: {
                                        duration: 0.28,
                                        ease: [0.22, 1, 0.36, 1],
                                    }, children: _jsx(DiamondButton, { icon: "edit", label: "EDIT", onClick: () => setEditOpen(true) }) }, "edit-fab")), showVerify && (_jsx(motion.div, { layout: true, initial: { opacity: 0, y: 10, scale: 0.85 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 10, scale: 0.85 }, transition: {
                                        duration: 0.28,
                                        ease: [0.22, 1, 0.36, 1],
                                    }, children: _jsx(DiamondButton, { color: "blue", icon: _jsx(ShieldCheck, { className: "w-4 h-4" }), label: "VERIFY", onClick: () => setVerifyOpen(true) }) }, "verify-fab"))] }) }) }));
            })(), editOpen && (_jsx(EditLobbyDialog, { open: editOpen, onClose: () => setEditOpen(false), lobby: lobby, onSaved: () => setRefreshTick((t) => t + 1), onDeleted: () => navigate("/dashboard/scout") })), (() => {
                const myProfileId = session?.user?.id ?? null;
                const me = myProfileId
                    ? lobby.players.find((p) => p.claimedByProfileId === myProfileId) ?? null
                    : null;
                if (!me)
                    return null;
                const verifyRows = me.accounts.map((a) => ({
                    lobbyPlayerId: me.id,
                    puuid: a.puuid,
                    region: a.region,
                    riotName: a.riotName,
                    riotTag: a.riotTag,
                    verifiedAt: a.verifiedAt ?? null,
                }));
                return (_jsx(VerifyAccountsDialog, { open: verifyOpen, onClose: () => setVerifyOpen(false), accounts: verifyRows, playerDisplayName: me.displayName, playerColor: me.color, onChanged: () => setRefreshTick((t) => t + 1) }));
            })()] }));
}
