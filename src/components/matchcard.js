import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// Match card — collapsed view, visually identical to the summoner page card.
// Standalone component so it can be reused from the scout lobby page and
// any future feed surface without dragging in summoner-page state.
//
// Intentionally simplified: no expand/scoreboard, no MVP/ACE detection, no
// context menu, no AI prompt. Those live on the summoner page for now.
// Summoner spells + champion level are skipped because the participants
// table doesn't store them today — TODO when schema is extended.
import { useState, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { API_BASE_URL, doubleLpBadgeUrl } from "@/config";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnimatedOutline } from "@/components/ui/animated-outline";
import { LikeOverlay } from "@/components/matchsocial/likeoverlay";
import { MatchCommentsPanel } from "@/components/matchsocial/matchcommentspanel";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { timeAgo } from "@/utils/timeAgo";
import { getKdaBackgroundStyle } from "@/utils/kdaColor";
import { getKeystoneIcon, getStyleIcon, getKeystoneName, getStyleName, } from "@/constants/runes";
import { MatchReplayDialog } from "@/components/matchreplay/MatchReplayDialog";
// Compact rank abbreviation: "DIAMOND IV" → "D4", "MASTER" → "M",
// "GRANDMASTER" → "GM", "CHALLENGER" → "C". Used in tight UI slots like the
// promotion/demotion chip.
const TIER_ABBR = {
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
const DIV_TO_NUM = {
    IV: "4",
    III: "3",
    II: "2",
    I: "1",
};
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);
function formatRankShort(tier, division) {
    if (!tier)
        return "";
    const tUp = tier.toUpperCase();
    const t = TIER_ABBR[tUp] ?? tUp[0];
    if (APEX_TIERS.has(tUp) || !division)
        return t;
    const d = DIV_TO_NUM[division.toUpperCase()] ?? division;
    return `${t}${d}`;
}
function formatRankFull(tier, division) {
    if (!tier)
        return "";
    const t = tier.toUpperCase();
    if (APEX_TIERS.has(t) || !division)
        return t;
    return `${t} ${division.toUpperCase()}`;
}
/* ── KP detail mini ──────────────────────────────────────────────────
 * Stacked mini-caption next to KDA: big tabular value on top, tiny
 * "KP" label below. Matches the look of the "5.33 KDA" caption to the
 * right of the KDA box.
 */
function KpDetailBox({ kpPct, }) {
    if (kpPct == null)
        return null;
    const valueClass = kpPct >= 65
        ? "text-jade/85"
        : kpPct >= 45
            ? "text-flash/75"
            : "text-[#d63336]/80";
    return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: "flex flex-col leading-tight ml-2 tabular-nums cursor-default", children: [_jsxs("span", { className: cn("font-chakrapetch font-bold text-[13px]", valueClass), children: [kpPct, "%"] }), _jsx("span", { className: "font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]", children: "KP" })] }) }), _jsx(TooltipContent, { side: "top", className: "text-xs bg-liquirice/80", children: _jsxs("span", { className: "tabular-nums", children: [kpPct, "% kill participation"] }) })] }) }));
}
/* ── CS detail mini ──────────────────────────────────────────────────
 * Creep-score caption next to KDA/KP. The value colour is driven by
 * CS-per-minute (a far better skill signal than raw CS, since a 40-min
 * game inflates totals):
 *   • > 10 cs/min  → glowing bright green (exceptional farming)
 *   • 8–10 cs/min  → bright green
 *   • 6–8  cs/min  → yellow
 *   • < 6  cs/min  → neutral grey
 * Support roles are exempt — they don't farm, so their CS is always
 * rendered in the neutral grey so it never reads as "bad farming".
 */
function isSupportRole(role) {
    if (!role)
        return false;
    const r = role.toUpperCase();
    return r === "UTILITY" || r === "SUPPORT" || r === "SUP";
}
function CsDetailBox({ cs, gold, gameDurationSeconds, role, }) {
    if (cs == null)
        return null;
    const minutes = gameDurationSeconds > 0 ? gameDurationSeconds / 60 : 0;
    const csPerMin = minutes > 0 ? cs / minutes : 0;
    const support = isSupportRole(role);
    // Colour + optional glow by cs/min tier. Support always neutral.
    let valueClass = "text-flash/55";
    let glowStyle;
    if (!support) {
        if (csPerMin > 10) {
            valueClass = "text-[#00ff9d]";
            glowStyle = { textShadow: "0 0 10px rgba(0,255,157,0.7)" };
        }
        else if (csPerMin >= 8) {
            valueClass = "text-[#00ff9d]";
        }
        else if (csPerMin >= 6) {
            valueClass = "text-[#FFB615]";
        }
        else {
            valueClass = "text-flash/55";
        }
    }
    // Italian-style decimal for cs/min ("7,2"); thousands-grouped gold ("14,732").
    const csPerMinStr = csPerMin.toFixed(1).replace(".", ",");
    const goldStr = gold != null ? Math.round(gold).toLocaleString("en-US") : null;
    return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs("div", { className: "flex flex-col leading-tight ml-2 tabular-nums cursor-default", children: [_jsx("span", { className: cn("font-chakrapetch font-bold text-[13px]", valueClass), style: glowStyle, children: cs }), _jsx("span", { className: "font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]", children: "CS" })] }) }), _jsx(TooltipContent, { side: "top", className: "text-xs bg-liquirice/80", children: _jsxs("div", { className: "flex flex-col items-center gap-1.5 py-0.5", children: [_jsxs("span", { className: "tabular-nums", children: [csPerMinStr, " cs per minute"] }), goldStr && (_jsxs(_Fragment, { children: [_jsx("div", { className: "h-px w-full bg-flash/20" }), _jsxs("span", { className: "tabular-nums", children: [goldStr, " gold"] })] }))] }) })] }) }));
}
const blueWinTint = false; // TODO: hook into uiPrefs if needed
// Scout cards always render with the win/loss tint — the matching cards on
// the summoner page have a per-user preference, but the lobby feed is meant
// to scan very quickly so we always tint.
const coloredMatchBg = true;
function MatchCardImpl({ data }) {
    const { matchId, queueLabel, win, isRemake, gameDurationSeconds, gameCreationMs, championName, championLevel, keystoneId, secondaryStyleId, kills, deaths, assists, items, allParticipants, highlightPuuid, lobbyMatePuuids, lobbyAccountByPuuid, lpDelta, rankChange, rankAfter, region, hasDoubleLp, } = data;
    // Replay viewer state — owned by the card so the parent doesn't have to
    // wire a dialog and there's no prop drilling. The dialog uses
    // createPortal under the hood, so even though we render it inside the
    // card markup, it attaches to <body> and overlays the whole page.
    const [replayOpen, setReplayOpen] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    // Click-to-expand state — toggled by clicking the card body. When true
    // the action strip below the card slides into view (see CSS rules for
    // .match-card-expanded in index.css).
    const [expanded, setExpanded] = useState(false);
    const canReplay = !isRemake && !!matchId;
    const team1 = (allParticipants ?? []).filter((p) => p.teamId === 100);
    const team2 = (allParticipants ?? []).filter((p) => p.teamId === 200);
    const hasScoreboard = team1.length > 0 || team2.length > 0;
    const lobbyMateSet = new Set(lobbyMatePuuids ?? []);
    const lobbyAccountMap = lobbyAccountByPuuid ?? {};
    // KDA value used for color/background — "Perfect" when deaths=0 and got kills/assists
    const kdaValue = deaths === 0 && kills + assists > 0
        ? "Perfect"
        : deaths > 0
            ? (kills + assists) / deaths
            : 0;
    const isPerfect = kdaValue === "Perfect";
    const { className: kdaCls, style: kdaStyle } = getKdaBackgroundStyle(kdaValue);
    const champIcon = `${cdnBaseUrl()}/img/champion/${normalizeChampName(championName)}.png`;
    const keystoneSrc = keystoneId ? getKeystoneIcon(keystoneId) : null;
    const keystoneName = keystoneId ? getKeystoneName(keystoneId) : null;
    const subStyleSrc = secondaryStyleId
        ? getStyleIcon(secondaryStyleId)
        : null;
    const subStyleName = secondaryStyleId
        ? getStyleName(secondaryStyleId)
        : null;
    const minutes = Math.floor(gameDurationSeconds / 60);
    const seconds = (gameDurationSeconds % 60).toString().padStart(2, "0");
    const mainItems = items.slice(0, 6);
    const trinket = items[6];
    // Kill participation: (kills + assists) / total team kills × 100.
    // Falls back to null when we don't know the team roster (no
    // scoreboard data) or when the team had zero kills.
    const kpPct = (() => {
        const me = (allParticipants ?? []).find((p) => p.puuid === highlightPuuid);
        if (!me)
            return null;
        const teamKills = (allParticipants ?? [])
            .filter((p) => p.teamId === me.teamId)
            .reduce((s, p) => s + p.kills, 0);
        if (teamKills <= 0)
            return null;
        return Math.round(((kills + assists) / teamKills) * 100);
    })();
    return (_jsxs("div", { 
        // Click-to-expand wrapper, same pattern as the summoner page card.
        // Clicking anywhere inside the card (except buttons/links) toggles
        // an action strip below the card with the REPLAY action — the inline
        // REPLAY chip in the meta row was removed in favour of this less
        // crowded "tap to reveal" surface.
        //
        // The `match-card-expanded` / `match-card-collapsed` classes drive
        // the action strip's height + opacity via index.css (already shared
        // with the summoner page implementation).
        // `group/match` scopes the like-overlay's hover state to this
        // single card so other cards' overlays don't react.
        // `relative` is the anchor for the LikeOverlay tab, which lives
        // OUTSIDE the <li> (because the <li> has overflow-hidden) and
        // pokes up above the card's top edge.
        className: cn("relative group/match", expanded ? "match-card-expanded" : "match-card-collapsed"), onClick: (e) => {
            if (e.target.closest("button, a"))
                return;
            setExpanded((prev) => !prev);
        }, children: [_jsxs("li", { "data-scout-card": "", className: cn("relative overflow-hidden rounded-md p-3 text-flash transition", isRemake
                    ? "bg-black/30 backdrop-blur-lg saturate-150"
                    : coloredMatchBg
                        ? win
                            ? blueWinTint
                                ? "bg-[#5BA8E6]/[0.06] backdrop-blur-lg saturate-150"
                                : "bg-[#00D18D]/[0.04] backdrop-blur-lg saturate-150"
                            : "bg-[#c93232]/[0.05] backdrop-blur-lg saturate-150"
                        : "bg-black/18 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.35px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.025)]"), children: [isRemake && (_jsxs(_Fragment, { children: [_jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] opacity-[0.07]", style: {
                                    backgroundImage: "repeating-linear-gradient(-45deg, #f5a623 0px, #f5a623 8px, transparent 8px, transparent 20px)",
                                } }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] rounded-md shadow-[inset_0_0_0_1px_rgba(245,166,35,0.15)]" })] })), _jsx("div", { className: cn("pointer-events-none absolute -top-28 left-0 h-60 w-full z-[1]", isRemake
                            ? "bg-[radial-gradient(circle_at_18%_18%,rgba(245,166,35,0.03),rgba(255,255,255,0)_72%)]"
                            : "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.018),rgba(255,255,255,0)_72%)]") }), _jsx("div", { className: "pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" }), hasDoubleLp && (_jsx("img", { src: doubleLpBadgeUrl(), alt: "", "aria-hidden": true, className: "pointer-events-none select-none absolute top-1/2 -translate-y-1/2 right-0 translate-x-[8%] h-[150%] w-auto z-[1] opacity-[0.18]", style: {
                            // Subtle warm citrine tint so the icon doesn't read as a
                            // neutral grey blob — picks up the cyber palette.
                            filter: "saturate(0.85) brightness(1.05) drop-shadow(0 0 18px rgba(255,182,21,0.18))",
                        } })), _jsx("div", { className: "flex items-center justify-center h-full relative z-10", children: _jsxs("div", { className: "w-full", children: [_jsx("div", { className: cn("absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-sm z-10", isRemake
                                        ? "bg-gradient-to-b from-[#f5a623] to-[#8a6010] shadow-[0_0_10px_rgba(245,166,35,0.32)]"
                                        : win
                                            ? blueWinTint
                                                ? "bg-gradient-to-b from-[#5BA8E6] to-[#1a3a5c] shadow-[0_0_10px_rgba(91,168,230,0.32)]"
                                                : "bg-gradient-to-b from-[#00D18D] to-[#11382E] shadow-[0_0_10px_rgba(0,209,141,0.32)]"
                                            : "bg-gradient-to-b from-[#c93232] to-[#420909] shadow-[0_0_10px_rgba(201,50,50,0.30)]") }), _jsx("div", { className: "relative z-10 ml-2", children: _jsxs("div", { className: "ml-2", children: [_jsxs("div", { className: "relative flex justify-between items-center pb-2 mb-2.5 border-b border-flash/[0.06]", children: [_jsxs("span", { className: "relative z-20 flex items-baseline gap-2 min-w-0", children: [_jsx("span", { className: "text-[10.5px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 truncate", children: queueLabel }), _jsx("span", { className: "hidden sm:inline text-flash/30 text-[8px] leading-none", children: "\u25C6" }), _jsx("span", { className: cn("hidden sm:inline font-chakrapetch font-bold tracking-[0.22em] uppercase text-[10.5px] leading-none", isRemake
                                                                    ? "text-[#f5a623]/85"
                                                                    : win
                                                                        ? blueWinTint
                                                                            ? "text-[#5BA8E6]/85"
                                                                            : "text-[#00D992]/85"
                                                                        : "text-[#d63336]/85"), style: {
                                                                    textShadow: isRemake
                                                                        ? "0 0 5px rgba(245,166,35,0.18)"
                                                                        : win
                                                                            ? blueWinTint
                                                                                ? "0 0 5px rgba(91,168,230,0.18)"
                                                                                : "0 0 5px rgba(0,217,146,0.20)"
                                                                            : "0 0 5px rgba(214,51,54,0.18)",
                                                                }, children: isRemake ? "REMAKE" : win ? "VICTORY" : "DEFEAT" }), (() => {
                                                                const hasDelta = typeof lpDelta === "number" && lpDelta !== 0;
                                                                const hasRankChange = rankChange != null;
                                                                if (!hasDelta && !hasRankChange)
                                                                    return null;
                                                                const positive = rankChange === "PROMOTION" ||
                                                                    (rankChange == null && hasDelta && lpDelta > 0);
                                                                const accentText = positive
                                                                    ? "text-[#00D992]/85"
                                                                    : "text-[#d63336]/85";
                                                                const accentGlow = positive
                                                                    ? "0 0 5px rgba(0,217,146,0.20)"
                                                                    : "0 0 5px rgba(214,51,54,0.18)";
                                                                const rankShort = formatRankShort(rankAfter?.tier, rankAfter?.division);
                                                                return (_jsxs(_Fragment, { children: [_jsx("span", { className: "hidden sm:inline text-flash/30 text-[8px] leading-none", children: "\u25C6" }), _jsxs("span", { className: cn("hidden sm:inline font-chakrapetch font-bold tracking-[0.18em] uppercase text-[10.5px] leading-none tabular-nums", accentText), style: { textShadow: accentGlow }, children: [hasDelta && (_jsxs(_Fragment, { children: [lpDelta > 0 ? "+" : "", lpDelta, " ", _jsx("span", { className: "opacity-65", children: "LP" })] })), hasRankChange && rankShort && (_jsxs("span", { className: cn("ml-1.5 opacity-90", hasDelta && "text-[9.5px]"), children: [positive ? "▲" : "▼", " ", rankShort] }))] })] }));
                                                            })()] }), _jsxs("span", { className: "hidden sm:block absolute left-1/2 transform -translate-x-1/2 z-20 font-chakrapetch font-medium text-flash/55 tabular-nums tracking-wider text-[11px]", children: [minutes, ":", seconds] }), _jsxs("span", { className: "relative z-20 flex items-center gap-2", children: [_jsx("span", { className: "font-jetbrains tracking-[0.15em] text-flash/40 text-[10.5px] leading-none whitespace-nowrap shrink-0", children: timeAgo(gameCreationMs + (gameDurationSeconds ?? 0) * 1000) }), data.social && (_jsx(LikeOverlay, { matchId: data.matchId, social: data.social }))] })] }), _jsx("div", { className: "relative flex justify-between", children: _jsxs("div", { className: "relative z-40 flex justify-between w-full", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start gap-2 relative", children: [_jsxs("div", { className: "relative w-[54px] h-[54px] shrink-0", children: [_jsx("img", { src: champIcon, alt: championName, className: "w-[54px] h-[54px] rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.4)]" }), championLevel != null && (_jsx("div", { className: "absolute -bottom-1 -right-1 bg-black/85 text-flash text-[10px] px-1.5 py-0.5 rounded-sm shadow font-chakrapetch font-bold tabular-nums leading-none", children: championLevel }))] }), _jsxs("div", { className: "grid grid-rows-2 gap-1 shrink-0", children: [_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "w-[26px] h-[26px] rounded-full bg-black/65 flex items-center justify-center ring-1 ring-flash/10", children: keystoneSrc && (_jsx("img", { src: keystoneSrc, alt: keystoneName ?? "Keystone", className: "w-[22px] h-[22px] rounded-full" })) }) }), keystoneName && (_jsx(TooltipContent, { side: "top", className: "text-xs", children: keystoneName }))] }) }), _jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("div", { className: "w-[26px] h-[26px] rounded-full bg-black/65 flex items-center justify-center ring-1 ring-flash/10", children: subStyleSrc && (_jsx("img", { src: subStyleSrc, alt: subStyleName ?? "Secondary", className: "w-[20px] h-[20px] rounded-full opacity-70" })) }) }), subStyleName && (_jsx(TooltipContent, { side: "top", className: "text-xs", children: subStyleName }))] }) })] }), _jsxs("div", { className: "flex ml-1.5", children: [_jsx("div", { className: "grid grid-cols-3 grid-rows-2 gap-1", children: mainItems.map((itemId, idx) => (_jsx("div", { className: "group relative w-[26px] h-[26px] rounded-[3px] bg-[#0a0a0a] border border-flash/[0.08]", children: typeof itemId === "number" && itemId > 0 && (_jsxs(_Fragment, { children: [_jsx(Link, { to: `/items/${itemId}`, className: "cursor-clicker", children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: `Item ${itemId}`, className: "w-full h-full rounded-sm" }) }), _jsx(AnimatedOutline, { rx: 3 })] })) }, idx))) }), typeof trinket === "number" && trinket > 0 && (_jsx("div", { className: "flex items-center justify-center ml-1.5", children: _jsxs(Link, { to: `/items/${trinket}`, className: "cursor-clicker group relative w-[26px] h-[26px] block", children: [_jsx("div", { className: "w-[26px] h-[26px] bg-[#0a0a0a] rounded-full ring-1 ring-flash/[0.08]", children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${trinket}.png`, alt: `Trinket ${trinket}`, className: "w-full h-full rounded-full" }) }), _jsx(AnimatedOutline, { rx: 13 })] }) }))] })] }), _jsx("div", { className: "flex flex-col mt-2.5", children: _jsxs("div", { className: "flex flex-wrap items-center gap-x-2 gap-y-1", children: [_jsxs("div", { className: cn("flex items-center justify-center h-8 w-[96px] text-[15px] font-chakrapetch font-bold tabular-nums rounded-[3px] border tracking-wide", kdaCls), style: kdaStyle, children: [_jsx("span", { className: isPerfect ? "text-liquirice" : "text-flash/90", children: kills }), _jsx("span", { className: cn("mx-[2px]", isPerfect ? "text-liquirice/50" : "text-flash/25"), children: "/" }), _jsx("span", { className: isPerfect ? "text-liquirice" : "text-red-400/80", children: deaths }), _jsx("span", { className: cn("mx-[2px]", isPerfect ? "text-liquirice/50" : "text-flash/25"), children: "/" }), _jsx("span", { className: isPerfect ? "text-liquirice" : "text-flash/90", children: assists })] }), _jsxs("div", { className: "flex flex-col leading-tight ml-1", children: [_jsx("span", { className: "font-chakrapetch font-bold tabular-nums text-flash/75 text-[13px]", children: typeof kdaValue === "number"
                                                                                            ? kdaValue.toFixed(2)
                                                                                            : kdaValue }), _jsx("span", { className: "font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]", children: "KDA" })] }), _jsx(CsDetailBox, { cs: data.cs, gold: data.gold, gameDurationSeconds: gameDurationSeconds, role: data.role }), _jsx(KpDetailBox, { kpPct: kpPct })] }) })] }), hasScoreboard && (_jsxs("div", { className: "hidden sm:grid grid-cols-2 gap-x-5 gap-y-0 mt-1 text-[10px] w-[44%] shrink-0 font-jetbrains", children: [_jsx("ul", { className: "space-y-0.5", children: team1.map((p) => (_jsx(ScoreboardRow, { p: p, highlight: p.puuid === highlightPuuid, isLobbyMate: lobbyMateSet.has(p.puuid), lobbyOverride: lobbyAccountMap[p.puuid] ?? null, align: "left" }, p.puuid))) }), _jsx("ul", { className: "space-y-0.5", children: team2.map((p) => (_jsx(ScoreboardRow, { p: p, highlight: p.puuid === highlightPuuid, isLobbyMate: lobbyMateSet.has(p.puuid), lobbyOverride: lobbyAccountMap[p.puuid] ?? null, align: "right" }, p.puuid))) })] }))] }) })] }) })] }) }), (() => {
                        const hasDelta = typeof lpDelta === "number" && lpDelta !== 0;
                        const hasRankChange = rankChange != null;
                        if (!hasDelta && !hasRankChange)
                            return null;
                        const positive = rankChange === "PROMOTION" ||
                            (rankChange == null && hasDelta && lpDelta > 0);
                        const rankShort = formatRankShort(rankAfter?.tier, rankAfter?.division);
                        return (_jsxs("div", { className: cn("sm:hidden absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 px-2 py-1 rounded-[3px] tabular-nums", positive
                                ? "bg-jade/[0.10] ring-1 ring-jade/35"
                                : "bg-[#d63336]/[0.10] ring-1 ring-[#d63336]/35"), children: [hasDelta && (_jsxs("span", { className: cn("text-[11px] font-chakrapetch font-bold tracking-wide leading-none", positive ? "text-jade" : "text-[#d63336]"), children: [lpDelta > 0 ? "+" : "", lpDelta, _jsx("span", { className: "text-[8px] opacity-65 ml-0.5", children: "LP" })] })), hasRankChange && rankShort && (_jsxs("span", { className: cn("text-[9px] font-chakrapetch font-bold tracking-wide leading-none", positive ? "text-jade/90" : "text-[#d63336]/90"), children: [positive ? "▲" : "▼", " ", rankShort] }))] }));
                    })()] }), expanded && (_jsx("div", { style: { marginTop: "-1px" }, children: _jsxs("div", { className: "match-action-tabs flex items-center justify-between px-4 py-1", children: [_jsxs("span", { className: "flex items-center gap-1.5 text-[9px] font-mono text-flash/50 tabular-nums tracking-wider mt-0.5", children: [_jsx("span", { className: "text-jade/30", children: "\u25C8" }), new Date(gameCreationMs + (gameDurationSeconds ?? 0) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })] }), _jsxs("div", { className: "flex gap-1.5", children: [data.social && (_jsx("button", { type: "button", onClick: (e) => {
                                        e.stopPropagation();
                                        setCommentsOpen((p) => !p);
                                    }, className: cn("relative px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase border-b transition-all duration-200 cursor-clicker", commentsOpen
                                        ? "text-flash border-flash/60 bg-flash/[0.10]"
                                        : "text-flash/70 hover:text-flash border-flash/25 hover:border-flash/55 bg-flash/[0.03] hover:bg-flash/[0.08]"), title: "Add a comment to this match", children: commentsOpen ? "CANCEL" : "ADD COMMENT" })), canReplay && (_jsxs("button", { type: "button", onClick: (e) => {
                                        e.stopPropagation();
                                        setReplayOpen(true);
                                    }, className: "relative px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-jade/80 hover:text-jade border-b border-jade/30 hover:border-jade/70 bg-jade/[0.04] hover:bg-jade/[0.10] transition-all duration-200 cursor-clicker group/replay", title: "Open the full match replay \u2014 every event on the map", children: [_jsx("span", { "aria-hidden": true, className: "absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-jade shadow-[0_0_4px_rgba(0,217,146,0.8)] animate-pulse" }), _jsx("span", { className: "ml-2", children: "REPLAY" })] }))] })] }) })), data.social && expanded &&
                (data.social.commentCount > 0 || commentsOpen) && (_jsx(MatchCommentsPanel, { lobbySlug: data.social.lobbySlug, matchId: data.matchId, canComment: data.social.canComment, showComposer: commentsOpen, onCommentPosted: () => {
                    data.social?.onCommentPosted?.();
                    setCommentsOpen(false);
                } })), data.social && !expanded && data.social.commentCount > 0 && (_jsxs("button", { type: "button", onClick: (e) => {
                    e.stopPropagation();
                    setExpanded(true);
                }, className: "group/cmt inline-flex items-center gap-1.5 ml-4 mt-2 mb-1.5 px-2.5 py-1 rounded-[4px] border border-jade/30 bg-jade/[0.08] hover:bg-jade/[0.16] hover:border-jade/55 text-jade/85 hover:text-jade text-[11px] font-chakrapetch font-semibold tracking-[0.03em] transition-all duration-200 cursor-clicker shadow-[0_0_10px_rgba(0,217,146,0.08)]", children: [_jsx(MessageSquare, { className: "w-3.5 h-3.5" }), data.social.commentCount, " ", data.social.commentCount === 1 ? "comment" : "comments", _jsx("span", { className: "ml-0.5 text-jade/40 group-hover/cmt:text-jade/70 transition-colors", children: "\u203A" })] })), canReplay && (_jsx(MatchReplayDialog, { open: replayOpen, onClose: () => setReplayOpen(false), matchId: matchId, region: (region ?? "EUW").toUpperCase(), staticMatch: null, focusPuuid: highlightPuuid ?? null, rosterFallback: (allParticipants ?? []).map((p) => ({
                    puuid: p.puuid,
                    championName: p.championName,
                    teamId: p.teamId,
                    summonerName: p.summonerName,
                    riotTagline: p.riotTagline ?? null,
                    win: p.win,
                    kills: p.kills,
                    deaths: p.deaths,
                    assists: p.assists,
                })) }))] }));
}
// Re-render a card only when something it actually renders changes. The
// parent rebuilds `data` on every render, so default shallow memo would
// never hit — but only two of its fields churn without a real change: the
// `social` object literal and the derived `lobbyMatePuuids` array. We
// compare those by content and everything else by value/reference (the
// remaining object fields — items, allParticipants, lobbyAccountByPuuid —
// are stable refs until the underlying feed item is refetched, at which
// point a re-render is correct). Net effect: a like/comment on one match
// re-renders only that card instead of the whole feed.
function matchCardPropsEqual(prev, next) {
    const a = prev.data;
    const b = next.data;
    if (a === b)
        return true;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length)
        return false;
    for (const k of keys) {
        if (k === "social" || k === "lobbyMatePuuids")
            continue;
        if (a[k] !== b[k])
            return false;
    }
    // lobbyMatePuuids — fresh .filter() each render, compare by content.
    const pa = a.lobbyMatePuuids ?? [];
    const pb = b.lobbyMatePuuids ?? [];
    if (pa.length !== pb.length)
        return false;
    for (let i = 0; i < pa.length; i++)
        if (pa[i] !== pb[i])
            return false;
    // social — fresh object each render; compare the bits that affect
    // rendering (ignore the callbacks, which are behaviourally stable).
    const sa = a.social;
    const sb = b.social;
    if (!sa !== !sb)
        return false;
    if (sa && sb) {
        if (sa.likeCount !== sb.likeCount ||
            sa.iLiked !== sb.iLiked ||
            sa.commentCount !== sb.commentCount ||
            sa.canLike !== sb.canLike ||
            sa.canComment !== sb.canComment ||
            sa.lobbySlug !== sb.lobbySlug ||
            sa.likers !== sb.likers) {
            return false;
        }
    }
    return true;
}
export const MatchCard = memo(MatchCardImpl, matchCardPropsEqual);
/* ─── scoreboard row ───────────────────────────────────────────────── */
const PLATFORM_TO_REGION = {
    EUW1: "euw",
    EUN1: "eune",
    NA1: "na",
    KR: "kr",
    BR1: "br",
    LA1: "lan",
    LA2: "las",
    OC1: "oce",
    TR1: "tr",
    RU: "ru",
    JP1: "jp",
};
function buildSummonerLink(p, lobbyOverride) {
    // Prefer lobby account override (we always have name+tag+region for lobby
    // members). Fall back to participant data + platform inference.
    if (lobbyOverride) {
        const region = lobbyOverride.region.toLowerCase();
        return {
            href: `/summoners/${region}/${encodeURIComponent(lobbyOverride.riotName)}-${encodeURIComponent(lobbyOverride.riotTag)}`,
            displayName: lobbyOverride.riotName,
            tag: lobbyOverride.riotTag,
        };
    }
    if (!p.summonerName)
        return null;
    const region = p.platform ? PLATFORM_TO_REGION[p.platform.toUpperCase()] : null;
    if (!region)
        return null;
    if (!p.riotTagline)
        return null;
    return {
        href: `/summoners/${region}/${encodeURIComponent(p.summonerName)}-${encodeURIComponent(p.riotTagline)}`,
        displayName: p.summonerName,
        tag: p.riotTagline,
    };
}
function ScoreboardRow({ p, highlight, isLobbyMate, lobbyOverride, align, }) {
    const champIcon = `${cdnBaseUrl()}/img/champion/${normalizeChampName(p.championName ?? "Aatrox")}.png`;
    const link = buildSummonerLink(p, lobbyOverride);
    const name = link?.displayName ?? p.summonerName ?? p.puuid.slice(0, 6);
    const href = link?.href ?? null;
    const tag = link?.tag ?? null;
    const nameClass = highlight
        ? "text-jade font-medium drop-shadow-[0_0_8px_rgba(0,217,146,0.3)]"
        : isLobbyMate
            ? "text-jade/80 font-medium"
            : "text-flash/85";
    const NameEl = href ? (_jsx(Link, { to: href, className: cn("min-w-0 truncate hover:underline underline-offset-2 cursor-clicker", nameClass), title: `${name}${tag ? "#" + tag : ""}`, children: name })) : (_jsx(ResolveOnClickName, { puuid: p.puuid, fallbackName: name, regionHint: p.platform
            ? PLATFORM_TO_REGION[p.platform.toUpperCase()]?.toUpperCase() ?? "EUW"
            : "EUW", className: cn("min-w-0 truncate hover:underline underline-offset-2 cursor-clicker text-left", nameClass) }));
    return (_jsxs("li", { className: cn("flex items-center gap-1.5 px-1 py-[1px] rounded-sm", align === "right" && "flex-row-reverse text-right"), children: [_jsx("img", { src: champIcon, alt: p.championName ?? "", className: "w-[15px] h-[15px] rounded-[2px] shrink-0" }), isLobbyMate && !highlight && (_jsx("span", { "aria-hidden": true, className: "w-1.5 h-1.5 rounded-full shrink-0", style: {
                    background: "#00d992",
                    boxShadow: "0 0 6px rgba(0,217,146,0.7)",
                } })), NameEl] }));
}
/* ─── click-to-resolve name (for players w/o cached tagline) ─────────── */
// Per-puuid in-flight cache so multiple clicks don't spawn duplicate fetches.
const resolveCache = new Map();
function resolvePuuid(puuid, regionHint) {
    const cached = resolveCache.get(puuid);
    if (cached)
        return cached;
    const p = fetch(`${API_BASE_URL}/api/scout/resolve-puuid/${encodeURIComponent(puuid)}?region=${encodeURIComponent(regionHint)}`)
        .then(async (r) => {
        if (!r.ok)
            return null;
        const data = await r.json();
        if (!data?.name || !data?.tag || !data?.region)
            return null;
        return {
            name: data.name,
            tag: data.tag,
            region: data.region,
        };
    })
        .catch(() => null);
    resolveCache.set(puuid, p);
    return p;
}
function ResolveOnClickName({ puuid, fallbackName, regionHint, className, }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const handleClick = async () => {
        if (loading)
            return;
        setLoading(true);
        try {
            const res = await resolvePuuid(puuid, regionHint);
            if (!res)
                return; // silently fail — name stays unclickable visually
            const region = res.region.toLowerCase();
            navigate(`/summoners/${region}/${encodeURIComponent(res.name)}-${encodeURIComponent(res.tag)}`);
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("button", { type: "button", onClick: handleClick, disabled: loading, className: cn(className, loading && "opacity-60"), title: fallbackName, children: loading ? "…" : fallbackName }));
}
