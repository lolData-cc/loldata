// Match card — collapsed view, visually identical to the summoner page card.
// Standalone component so it can be reused from the scout lobby page and
// any future feed surface without dragging in summoner-page state.
//
// Intentionally simplified: no expand/scoreboard, no MVP/ACE detection, no
// context menu, no AI prompt. Those live on the summoner page for now.
// Summoner spells + champion level are skipped because the participants
// table doesn't store them today — TODO when schema is extended.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL, doubleLpBadgeUrl } from "@/config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AnimatedOutline } from "@/components/ui/animated-outline";
import { LikeOverlay } from "@/components/matchsocial/likeoverlay";
import { MatchCommentsPanel } from "@/components/matchsocial/matchcommentspanel";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { timeAgo } from "@/utils/timeAgo";
import { getKdaBackgroundStyle } from "@/utils/kdaColor";
import {
  getKeystoneIcon,
  getStyleIcon,
  getKeystoneName,
  getStyleName,
} from "@/constants/runes";
import { MatchReplayDialog } from "@/components/matchreplay/MatchReplayDialog";

export type ScoreboardParticipant = {
  puuid: string;
  summonerName: string | null;
  riotTagline?: string | null;     // for /summoners/<region>/<name>-<tag>
  championName: string | null;
  teamId: number | null;
  platform?: string | null;        // EUW1 / NA1 / KR / ...
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
};

export type LobbyAccountInfo = {
  riotName: string;
  riotTag: string;
  region: string;                  // "EUW" / "NA" / "KR" — already short form
  // Identity verification — when both `showVerifyBadge` is true and
  // verifyGrade >= 1, the scoreboard row renders the green Meta-style
  // seal next to the player name. Optional so existing callers keep
  // compiling.
  showVerifyBadge?: boolean;
  verifyGrade?: 0 | 1 | 2;
};

export type MatchCardData = {
  matchId: string;
  queueLabel: string;
  win: boolean;
  isRemake: boolean;
  gameDurationSeconds: number;
  gameCreationMs: number;          // unix ms — used for timeAgo
  championName: string;
  championLevel?: number | null;
  keystoneId?: number | null;
  secondaryStyleId?: number | null;
  kills: number;
  deaths: number;
  assists: number;
  items: number[];                 // length 7 (item0..6, last is trinket)
  // Full 10-player roster for the inline scoreboard.
  allParticipants?: ScoreboardParticipant[] | null;
  highlightPuuid?: string | null;
  lobbyMatePuuids?: string[];
  // puuid → riot account info for lobby members. Used to build summoner
  // links even when the match was ingested before riot_id_tagline existed.
  lobbyAccountByPuuid?: Record<string, LobbyAccountInfo>;
  // LP delta for this match (computed from rank snapshots).
  //   lpDelta: signed LP change when tier+division didn't change
  //   rankChange: "PROMOTION" / "DEMOTION" when they did
  //   rankAfter: the tier+division reached when rankChange is set
  // All omitted/null when no snapshot pair is available.
  lpDelta?: number | null;
  rankChange?: "PROMOTION" | "DEMOTION" | null;
  rankAfter?: { tier: string; division: string | null } | null;
  // Short-form region ("EUW" / "NA" / "KR" / …). Optional — when present we
  // expose a REPLAY button that boots the Match Replay Viewer for this game.
  // Omit (or pass null) and the REPLAY button is hidden, e.g. for surfaces
  // where the match isn't ours to replay yet.
  region?: string | null;
  // True when this game earned the Aegis-of-Valor double-LP bonus. When set
  // we paint the Aegis SVG as a large opaque watermark on the right side of
  // the card to flag it visually. The detection lives in the parent (the
  // scout lobby page heuristic-flags games whose lpDelta is too high for a
  // normal ranked gain).
  hasDoubleLp?: boolean;
  // Social — per-match likes + comments. Optional: when omitted (e.g.
  // on the summoner page) the like overlay + comments button stay
  // hidden. When provided, the scout lobby threads down the lobby
  // slug + auth-gated counts so the card can toggle/post inline.
  social?: MatchSocialProps;
};

export type MatchSocialProps = {
  /** Lobby slug — needed for the like + comment endpoints. */
  lobbySlug: string;
  likeCount: number;
  iLiked: boolean;
  commentCount: number;
  /** People who liked this match. The tooltip on the heart renders
   *  these names so users can see who reacted. Unknown profiles
   *  (signed-in users who aren't claimed in this lobby) come back
   *  with displayName="Someone". */
  likers?: Array<{ profileId: string; displayName: string; color: string | null }>;
  /** True when the user is signed in. Likes are open to any signed-in
   *  user; the API enforces this. */
  canLike: boolean;
  /** True when the user passes the lobby's verify_mode gating
   *  (claimed in the lobby, OR verify_mode=disabled + signed in). */
  canComment: boolean;
  /** Called after a successful like toggle so the parent can update
   *  its batch cache. Receives the new local state. */
  onLikeChanged?: (next: { iLiked: boolean; likeCount: number }) => void;
  /** Called after a successful comment post so the parent can bump
   *  the comment counter. */
  onCommentPosted?: () => void;
};

// Compact rank abbreviation: "DIAMOND IV" → "D4", "MASTER" → "M",
// "GRANDMASTER" → "GM", "CHALLENGER" → "C". Used in tight UI slots like the
// promotion/demotion chip.
const TIER_ABBR: Record<string, string> = {
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
const DIV_TO_NUM: Record<string, string> = {
  IV: "4",
  III: "3",
  II: "2",
  I: "1",
};
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function formatRankShort(
  tier: string | null | undefined,
  division: string | null | undefined
): string {
  if (!tier) return "";
  const tUp = tier.toUpperCase();
  const t = TIER_ABBR[tUp] ?? tUp[0];
  if (APEX_TIERS.has(tUp) || !division) return t;
  const d = DIV_TO_NUM[division.toUpperCase()] ?? division;
  return `${t}${d}`;
}

function formatRankFull(
  tier: string | null | undefined,
  division: string | null | undefined
): string {
  if (!tier) return "";
  const t = tier.toUpperCase();
  if (APEX_TIERS.has(t) || !division) return t;
  return `${t} ${division.toUpperCase()}`;
}

/* ── KP detail mini ──────────────────────────────────────────────────
 * Stacked mini-caption next to KDA: big tabular value on top, tiny
 * "KP" label below. Matches the look of the "5.33 KDA" caption to the
 * right of the KDA box.
 */
function KpDetailBox({
  kpPct,
}: {
  kpPct: number | null;
}) {
  if (kpPct == null) return null;

  const valueClass =
    kpPct >= 65
      ? "text-jade/85"
      : kpPct >= 45
        ? "text-flash/75"
        : "text-[#d63336]/80";

  return (
    <div
      title={`${kpPct}% kill participation`}
      className="flex flex-col leading-tight ml-2 tabular-nums"
    >
      <span
        className={cn(
          "font-chakrapetch font-medium text-[13px]",
          valueClass
        )}
      >
        {kpPct}%
      </span>
      <span className="font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]">
        KP
      </span>
    </div>
  );
}

const blueWinTint = false;         // TODO: hook into uiPrefs if needed
// Scout cards always render with the win/loss tint — the matching cards on
// the summoner page have a per-user preference, but the lobby feed is meant
// to scan very quickly so we always tint.
const coloredMatchBg = true;

export function MatchCard({ data }: { data: MatchCardData }) {
  const {
    matchId,
    queueLabel,
    win,
    isRemake,
    gameDurationSeconds,
    gameCreationMs,
    championName,
    championLevel,
    keystoneId,
    secondaryStyleId,
    kills,
    deaths,
    assists,
    items,
    allParticipants,
    highlightPuuid,
    lobbyMatePuuids,
    lobbyAccountByPuuid,
    lpDelta,
    rankChange,
    rankAfter,
    region,
    hasDoubleLp,
  } = data;

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
  const kdaValue: string | number =
    deaths === 0 && kills + assists > 0
      ? "Perfect"
      : deaths > 0
      ? (kills + assists) / deaths
      : 0;
  const isPerfect = kdaValue === "Perfect";
  const { className: kdaCls, style: kdaStyle } =
    getKdaBackgroundStyle(kdaValue);

  const champIcon = `${cdnBaseUrl()}/img/champion/${normalizeChampName(
    championName
  )}.png`;

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
    const me = (allParticipants ?? []).find(
      (p) => p.puuid === highlightPuuid
    );
    if (!me) return null;
    const teamKills = (allParticipants ?? [])
      .filter((p) => p.teamId === me.teamId)
      .reduce((s, p) => s + p.kills, 0);
    if (teamKills <= 0) return null;
    return Math.round(((kills + assists) / teamKills) * 100);
  })();

  return (
    <div
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
      className={cn(
        "relative group/match",
        expanded ? "match-card-expanded" : "match-card-collapsed"
      )}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, a")) return;
        setExpanded((prev) => !prev);
      }}
    >
    <li
      className={cn(
        "relative overflow-hidden rounded-md p-3 text-flash transition",
        isRemake
          ? "bg-black/30 backdrop-blur-lg saturate-150"
          : coloredMatchBg
          ? win
            ? blueWinTint
              ? "bg-[#5BA8E6]/[0.06] backdrop-blur-lg saturate-150"
              : "bg-[#00D18D]/[0.04] backdrop-blur-lg saturate-150"
            : "bg-[#c93232]/[0.05] backdrop-blur-lg saturate-150"
          : "bg-black/18 backdrop-blur-lg saturate-150",
        "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.35px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.025)]"
      )}
    >
      {isRemake && (
        <>
          {/* Diagonal warning stripes */}
          <div
            className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(-45deg, #f5a623 0px, #f5a623 8px, transparent 8px, transparent 20px)",
            }}
          />
          {/* Yellow border glow */}
          <div className="pointer-events-none absolute inset-0 z-[1] rounded-md shadow-[inset_0_0_0_1px_rgba(245,166,35,0.15)]" />
        </>
      )}


      {/* Radial highlight top-left */}
      <div
        className={cn(
          "pointer-events-none absolute -top-28 left-0 h-60 w-full z-[1]",
          isRemake
            ? "bg-[radial-gradient(circle_at_18%_18%,rgba(245,166,35,0.03),rgba(255,255,255,0)_72%)]"
            : "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.018),rgba(255,255,255,0)_72%)]"
        )}
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/3 via-transparent to-black/40" />

      {/* Double-LP watermark — Aegis of Valor as a large opaque
          backdrop pinned to the right edge. The <li>'s overflow-hidden
          clips the parts that overflow top/bottom/right, giving the
          "huge background, cropped" look. z-[1] sits above the bg
          tint but below the content (which is at z-10), so the
          scoreboard and items stay perfectly readable. Anchored to the
          right edge with translate-x so ~30% of the icon spills
          beyond the card border and gets cut off — exactly the
          watermark effect you asked for. */}
      {hasDoubleLp && (
        <img
          src={doubleLpBadgeUrl()}
          alt=""
          aria-hidden
          className="pointer-events-none select-none absolute top-1/2 -translate-y-1/2 right-0 translate-x-[8%] h-[150%] w-auto z-[1] opacity-[0.18]"
          style={{
            // Subtle warm citrine tint so the icon doesn't read as a
            // neutral grey blob — picks up the cyber palette.
            filter:
              "saturate(0.85) brightness(1.05) drop-shadow(0 0 18px rgba(255,182,21,0.18))",
          }}
        />
      )}

      <div className="flex items-center justify-center h-full relative z-10">
        <div className="w-full">
          {/* Left colored bar — narrower with a soft accent glow. Hints at
              the result without dominating the card.

              Inset 6px from top and bottom (top-1.5 / bottom-1.5) so the
              10px box-shadow has room to fade smoothly INSIDE the card's
              overflow-hidden boundary. Without the inset, the bar reached
              the rounded edges and the shadow was sharply clipped right
              at the corner — the "tagliato" jade glow the user was
              seeing at the bottom of every match card. */}
          <div
            className={cn(
              "absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-sm z-10",
              isRemake
                ? "bg-gradient-to-b from-[#f5a623] to-[#8a6010] shadow-[0_0_10px_rgba(245,166,35,0.32)]"
                : win
                ? blueWinTint
                  ? "bg-gradient-to-b from-[#5BA8E6] to-[#1a3a5c] shadow-[0_0_10px_rgba(91,168,230,0.32)]"
                  : "bg-gradient-to-b from-[#00D18D] to-[#11382E] shadow-[0_0_10px_rgba(0,209,141,0.32)]"
                : "bg-gradient-to-b from-[#c93232] to-[#420909] shadow-[0_0_10px_rgba(201,50,50,0.30)]"
            )}
          />

          <div className="relative z-10 ml-2">
            <div className="ml-2">
              {/* Top meta row — typographic W/L instead of a boxed chip.
                  VICTORY / DEFEAT reads as a label, not a pill, and feels
                  more like a HUD readout.

                  Mobile (< sm): collapses to just queue + timeAgo on a
                  single row. The VICTORY/DEFEAT chip, the centered
                  duration, and the inline LP delta are all hidden —
                  they were squeezing into each other at narrow widths.
                  The LP delta moves to an absolutely-positioned badge
                  in the bottom-right of the card body (rendered below
                  in the main content row). */}
              <div className="relative flex justify-between items-center pb-2 mb-2.5 border-b border-flash/[0.06]">
                <span className="relative z-20 flex items-baseline gap-2 min-w-0">
                  <span className="text-[10.5px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 truncate">
                    {queueLabel}
                  </span>
                  <span className="hidden sm:inline text-flash/30 text-[8px] leading-none">
                    ◆
                  </span>
                  <span
                    className={cn(
                      "hidden sm:inline font-chakrapetch font-bold tracking-[0.22em] uppercase text-[10.5px] leading-none",
                      isRemake
                        ? "text-[#f5a623]/85"
                        : win
                        ? blueWinTint
                          ? "text-[#5BA8E6]/85"
                          : "text-[#00D992]/85"
                        : "text-[#d63336]/85"
                    )}
                    style={{
                      textShadow: isRemake
                        ? "0 0 5px rgba(245,166,35,0.18)"
                        : win
                        ? blueWinTint
                          ? "0 0 5px rgba(91,168,230,0.18)"
                          : "0 0 5px rgba(0,217,146,0.20)"
                        : "0 0 5px rgba(214,51,54,0.18)",
                    }}
                  >
                    {isRemake ? "REMAKE" : win ? "VICTORY" : "DEFEAT"}
                  </span>

                  {/* LP delta — inline text after the result on desktop
                      only; on mobile the same delta renders as a chip in
                      the bottom-right of the card body (see below). */}
                  {(() => {
                    const hasDelta =
                      typeof lpDelta === "number" && lpDelta !== 0;
                    const hasRankChange = rankChange != null;
                    if (!hasDelta && !hasRankChange) return null;
                    const positive =
                      rankChange === "PROMOTION" ||
                      (rankChange == null && hasDelta && lpDelta! > 0);
                    const accentText = positive
                      ? "text-[#00D992]/85"
                      : "text-[#d63336]/85";
                    const accentGlow = positive
                      ? "0 0 5px rgba(0,217,146,0.20)"
                      : "0 0 5px rgba(214,51,54,0.18)";
                    const rankShort = formatRankShort(
                      rankAfter?.tier,
                      rankAfter?.division
                    );
                    return (
                      <>
                        <span className="hidden sm:inline text-flash/30 text-[8px] leading-none">
                          ◆
                        </span>
                        <span
                          className={cn(
                            "hidden sm:inline font-chakrapetch font-bold tracking-[0.18em] uppercase text-[10.5px] leading-none tabular-nums",
                            accentText
                          )}
                          style={{ textShadow: accentGlow }}
                        >
                          {hasDelta && (
                            <>
                              {lpDelta! > 0 ? "+" : ""}
                              {lpDelta}{" "}
                              <span className="opacity-65">LP</span>
                            </>
                          )}
                          {hasRankChange && rankShort && (
                            <span
                              className={cn(
                                "ml-1.5 opacity-90",
                                hasDelta && "text-[9.5px]"
                              )}
                            >
                              {positive ? "▲" : "▼"} {rankShort}
                            </span>
                          )}
                        </span>
                      </>
                    );
                  })()}
                </span>

                {/* Game duration — centered on desktop, hidden on
                    mobile to make room for queue + timeAgo on the
                    same row. */}
                <span className="hidden sm:block absolute left-1/2 transform -translate-x-1/2 z-20 font-chakrapetch font-medium text-flash/55 tabular-nums tracking-wider text-[11px]">
                  {minutes}:{seconds}
                </span>

                {/* timeAgo + like — flex row. The like is collapsed
                    (max-w-0) when the match has zero likes, expanded
                    permanently otherwise. The natural flex re-layout
                    on max-width change handles the timeAgo shift —
                    no explicit translate needed. */}
                <span className="relative z-20 flex items-center gap-1.5">
                  <span className="font-jetbrains tracking-[0.15em] text-flash/40 text-[10.5px] whitespace-nowrap shrink-0">
                    {timeAgo(gameCreationMs + (gameDurationSeconds ?? 0) * 1000)}
                  </span>
                  {data.social && (
                    <LikeOverlay
                      matchId={data.matchId}
                      social={data.social}
                    />
                  )}
                </span>
              </div>

              {/* Main row: champion + runes + KDA + items */}
              <div className="relative flex justify-between">
                <div className="relative z-40 flex justify-between w-full">
                  <div>
                    <div className="flex items-start gap-2 relative">
                      <div className="relative w-[54px] h-[54px] shrink-0">
                        <img
                          src={champIcon}
                          alt={championName}
                          className="w-[54px] h-[54px] rounded-md shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                        />
                        {championLevel != null && (
                          <div className="absolute -bottom-1 -right-1 bg-black/85 text-flash text-[10px] px-1.5 py-0.5 rounded-sm shadow font-chakrapetch font-bold tabular-nums leading-none">
                            {championLevel}
                          </div>
                        )}
                      </div>

                      {/* Runes — keystone + secondary stacked */}
                      <div className="grid grid-rows-2 gap-1 shrink-0">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-[26px] h-[26px] rounded-full bg-black/65 flex items-center justify-center ring-1 ring-flash/10">
                                {keystoneSrc && (
                                  <img
                                    src={keystoneSrc}
                                    alt={keystoneName ?? "Keystone"}
                                    className="w-[22px] h-[22px] rounded-full"
                                  />
                                )}
                              </div>
                            </TooltipTrigger>
                            {keystoneName && (
                              <TooltipContent side="top" className="text-xs">
                                {keystoneName}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-[26px] h-[26px] rounded-full bg-black/65 flex items-center justify-center ring-1 ring-flash/10">
                                {subStyleSrc && (
                                  <img
                                    src={subStyleSrc}
                                    alt={subStyleName ?? "Secondary"}
                                    className="w-[20px] h-[20px] rounded-full opacity-70"
                                  />
                                )}
                              </div>
                            </TooltipTrigger>
                            {subStyleName && (
                              <TooltipContent side="top" className="text-xs">
                                {subStyleName}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {/* Items */}
                      <div className="flex ml-1.5">
                        <div className="grid grid-cols-3 grid-rows-2 gap-1">
                          {mainItems.map((itemId, idx) => (
                            <div
                              key={idx}
                              className="group relative w-[26px] h-[26px] rounded-[3px] bg-[#0a0a0a] border border-flash/[0.08]"
                            >
                              {typeof itemId === "number" && itemId > 0 && (
                                <>
                                  <Link
                                    to={`/items/${itemId}`}
                                    className="cursor-clicker"
                                  >
                                    <img
                                      src={`${cdnBaseUrl()}/img/item/${itemId}.png`}
                                      alt={`Item ${itemId}`}
                                      className="w-full h-full rounded-sm"
                                    />
                                  </Link>
                                  <AnimatedOutline rx={3} />
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {typeof trinket === "number" && trinket > 0 && (
                          <div className="flex items-center justify-center ml-1.5">
                            <Link to={`/items/${trinket}`} className="cursor-clicker group relative w-[26px] h-[26px] block">
                              <div className="w-[26px] h-[26px] bg-[#0a0a0a] rounded-full ring-1 ring-flash/[0.08]">
                                <img
                                  src={`${cdnBaseUrl()}/img/item/${trinket}.png`}
                                  alt={`Trinket ${trinket}`}
                                  className="w-full h-full rounded-full"
                                />
                              </div>
                              {/* rx=13 = w/2 → circle outline matching the
                                  trinket's rounded-full shape. */}
                              <AnimatedOutline rx={13} />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* KDA + LP detail box (right of KDA) */}
                    <div className="flex flex-col mt-2.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <div
                          className={cn(
                            "flex items-center justify-center h-8 w-[96px] text-[15px] font-chakrapetch font-bold tabular-nums rounded-[3px] border tracking-wide",
                            kdaCls
                          )}
                          style={kdaStyle}
                        >
                          <span
                            className={
                              isPerfect ? "text-liquirice" : "text-flash/90"
                            }
                          >
                            {kills}
                          </span>
                          <span
                            className={cn(
                              "mx-[2px]",
                              isPerfect ? "text-liquirice/50" : "text-flash/25"
                            )}
                          >
                            /
                          </span>
                          <span
                            className={
                              isPerfect ? "text-liquirice" : "text-red-400/80"
                            }
                          >
                            {deaths}
                          </span>
                          <span
                            className={cn(
                              "mx-[2px]",
                              isPerfect ? "text-liquirice/50" : "text-flash/25"
                            )}
                          >
                            /
                          </span>
                          <span
                            className={
                              isPerfect ? "text-liquirice" : "text-flash/90"
                            }
                          >
                            {assists}
                          </span>
                        </div>
                        <div className="flex flex-col leading-tight ml-1">
                          <span className="font-chakrapetch font-medium tabular-nums text-flash/75 text-[13px]">
                            {typeof kdaValue === "number"
                              ? kdaValue.toFixed(2)
                              : kdaValue}
                          </span>
                          <span className="font-jetbrains tracking-[0.18em] uppercase text-flash/30 text-[9px]">
                            KDA
                          </span>
                        </div>

                        <KpDetailBox kpPct={kpPct} />
                      </div>
                    </div>
                  </div>

                  {/* Scoreboard — right side, two team columns. */}
                  {hasScoreboard && (
                    <div className="hidden sm:grid grid-cols-2 gap-x-5 gap-y-0 mt-1 text-[10px] w-[44%] shrink-0 font-jetbrains">
                      <ul className="space-y-0.5">
                        {team1.map((p) => (
                          <ScoreboardRow
                            key={p.puuid}
                            p={p}
                            highlight={p.puuid === highlightPuuid}
                            isLobbyMate={lobbyMateSet.has(p.puuid)}
                            lobbyOverride={lobbyAccountMap[p.puuid] ?? null}
                            align="left"
                          />
                        ))}
                      </ul>
                      <ul className="space-y-0.5">
                        {team2.map((p) => (
                          <ScoreboardRow
                            key={p.puuid}
                            p={p}
                            highlight={p.puuid === highlightPuuid}
                            isLobbyMate={lobbyMateSet.has(p.puuid)}
                            lobbyOverride={lobbyAccountMap[p.puuid] ?? null}
                            align="right"
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only LP delta badge — pinned to the bottom-right of
          the card body. Matches the inline delta hidden from the meta
          row on small screens so the LP change stays visible without
          fighting the queue label + timeAgo for space. */}
      {(() => {
        const hasDelta = typeof lpDelta === "number" && lpDelta !== 0;
        const hasRankChange = rankChange != null;
        if (!hasDelta && !hasRankChange) return null;
        const positive =
          rankChange === "PROMOTION" ||
          (rankChange == null && hasDelta && lpDelta! > 0);
        const rankShort = formatRankShort(
          rankAfter?.tier,
          rankAfter?.division
        );
        return (
          <div
            className={cn(
              "sm:hidden absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 px-2 py-1 rounded-[3px] tabular-nums",
              positive
                ? "bg-jade/[0.10] ring-1 ring-jade/35"
                : "bg-[#d63336]/[0.10] ring-1 ring-[#d63336]/35"
            )}
          >
            {hasDelta && (
              <span
                className={cn(
                  "text-[11px] font-chakrapetch font-bold tracking-wide leading-none",
                  positive ? "text-jade" : "text-[#d63336]"
                )}
              >
                {lpDelta! > 0 ? "+" : ""}
                {lpDelta}
                <span className="text-[8px] opacity-65 ml-0.5">LP</span>
              </span>
            )}
            {hasRankChange && rankShort && (
              <span
                className={cn(
                  "text-[9px] font-chakrapetch font-bold tracking-wide leading-none",
                  positive ? "text-jade/90" : "text-[#d63336]/90"
                )}
              >
                {positive ? "▲" : "▼"} {rankShort}
              </span>
            )}
          </div>
        );
      })()}
    </li>

    {/* Action strip — only mounted when expanded. We deliberately
        skip CSS transitions/animations here because every approach
        (class-based transition, inline transition, keyframes) ended
        up frozen at the initial opacity in this codebase — the global
        `.match-action-wrap` rule and the constant scout-lobby
        refresh-tick re-renders were interfering with the cascade.
        Mounting + unmounting on each click reads as instant snap,
        which is what the user asked for ("click-collapsible"). */}
    {expanded && (
      <div
        style={{ marginTop: "-1px" }}
      >
        <div className="match-action-tabs flex items-center justify-between px-4 py-1">
        <span className="flex items-center gap-1.5 text-[9px] font-mono text-flash/50 tabular-nums tracking-wider mt-0.5">
          <span className="text-jade/30">&#x25C8;</span>
          {new Date(
            gameCreationMs + (gameDurationSeconds ?? 0) * 1000
          ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <div className="flex gap-1.5">
          {data.social && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCommentsOpen((p) => !p);
              }}
              className={cn(
                "relative px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase border-b transition-all duration-200 cursor-clicker",
                commentsOpen
                  ? "text-flash border-flash/60 bg-flash/[0.10]"
                  : "text-flash/70 hover:text-flash border-flash/25 hover:border-flash/55 bg-flash/[0.03] hover:bg-flash/[0.08]"
              )}
              title="Add a comment to this match"
            >
              {commentsOpen ? "CANCEL" : "ADD COMMENT"}
            </button>
          )}
          {canReplay && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setReplayOpen(true);
              }}
              className="relative px-4 py-1 text-[9px] font-mono tracking-[0.15em] uppercase text-jade/80 hover:text-jade border-b border-jade/30 hover:border-jade/70 bg-jade/[0.04] hover:bg-jade/[0.10] transition-all duration-200 cursor-clicker group/replay"
              title="Open the full match replay — every event on the map"
            >
              {/* Pulsating accent dot */}
              <span
                aria-hidden
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-jade shadow-[0_0_4px_rgba(0,217,146,0.8)] animate-pulse"
              />
              <span className="ml-2">REPLAY</span>
            </button>
          )}
          </div>
        </div>

      </div>
    )}

    {/* Comments — list ALWAYS visible when there's at least one,
        regardless of expanded state. Composer only appears when the
        user clicks ADD COMMENT inside the expanded action strip. */}
    {data.social &&
      (data.social.commentCount > 0 || (expanded && commentsOpen)) && (
        <MatchCommentsPanel
          lobbySlug={data.social.lobbySlug}
          matchId={data.matchId}
          canComment={data.social.canComment}
          showComposer={expanded && commentsOpen}
          onCommentPosted={() => {
            data.social?.onCommentPosted?.();
            setCommentsOpen(false);
          }}
        />
      )}

    {/* Match Replay Viewer — portal-rendered, only mounts content while
        open so closed cards cost nothing. staticMatch is null because
        the scout feed payload doesn't include the full match-v5 blob;
        instead we pass `rosterFallback` with the per-participant info
        we DO have (puuid + championName + summonerName + k/d/a +
        teamId + win), and the dialog builds a stand-in staticMatch
        once the timeline loads (the timeline supplies the canonical
        participantId order via metadata.participants). Without this
        the roster panel / damage bars / event log all stay blank
        because staticParticipantByPid returns null for every PID. */}
    {canReplay && (
      <MatchReplayDialog
        open={replayOpen}
        onClose={() => setReplayOpen(false)}
        matchId={matchId}
        region={(region ?? "EUW").toUpperCase()}
        staticMatch={null}
        focusPuuid={highlightPuuid ?? null}
        rosterFallback={(allParticipants ?? []).map((p) => ({
          puuid: p.puuid,
          championName: p.championName,
          teamId: p.teamId,
          summonerName: p.summonerName,
          riotTagline: p.riotTagline ?? null,
          win: p.win,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
        }))}
      />
    )}
    </div>
  );
}

/* ─── scoreboard row ───────────────────────────────────────────────── */
const PLATFORM_TO_REGION: Record<string, string> = {
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

function buildSummonerLink(
  p: ScoreboardParticipant,
  lobbyOverride: LobbyAccountInfo | null
): { href: string; displayName: string; tag: string } | null {
  // Prefer lobby account override (we always have name+tag+region for lobby
  // members). Fall back to participant data + platform inference.
  if (lobbyOverride) {
    const region = lobbyOverride.region.toLowerCase();
    return {
      href: `/summoners/${region}/${encodeURIComponent(
        lobbyOverride.riotName
      )}-${encodeURIComponent(lobbyOverride.riotTag)}`,
      displayName: lobbyOverride.riotName,
      tag: lobbyOverride.riotTag,
    };
  }

  if (!p.summonerName) return null;
  const region = p.platform ? PLATFORM_TO_REGION[p.platform.toUpperCase()] : null;
  if (!region) return null;
  if (!p.riotTagline) return null;
  return {
    href: `/summoners/${region}/${encodeURIComponent(
      p.summonerName
    )}-${encodeURIComponent(p.riotTagline)}`,
    displayName: p.summonerName,
    tag: p.riotTagline,
  };
}

function ScoreboardRow({
  p,
  highlight,
  isLobbyMate,
  lobbyOverride,
  align,
}: {
  p: ScoreboardParticipant;
  highlight: boolean;
  isLobbyMate: boolean;
  lobbyOverride: LobbyAccountInfo | null;
  align: "left" | "right";
}) {
  const champIcon = `${cdnBaseUrl()}/img/champion/${normalizeChampName(
    p.championName ?? "Aatrox"
  )}.png`;
  const link = buildSummonerLink(p, lobbyOverride);
  const name = link?.displayName ?? p.summonerName ?? p.puuid.slice(0, 6);
  const href = link?.href ?? null;
  const tag = link?.tag ?? null;

  const nameClass = highlight
    ? "text-jade font-medium drop-shadow-[0_0_8px_rgba(0,217,146,0.3)]"
    : isLobbyMate
    ? "text-jade/80 font-medium"
    : "text-flash/85";

  const NameEl = href ? (
    <Link
      to={href}
      className={cn(
        "min-w-0 truncate hover:underline underline-offset-2 cursor-clicker",
        nameClass
      )}
      title={`${name}${tag ? "#" + tag : ""}`}
    >
      {name}
    </Link>
  ) : (
    <ResolveOnClickName
      puuid={p.puuid}
      fallbackName={name}
      regionHint={
        p.platform
          ? PLATFORM_TO_REGION[p.platform.toUpperCase()]?.toUpperCase() ?? "EUW"
          : "EUW"
      }
      className={cn(
        "min-w-0 truncate hover:underline underline-offset-2 cursor-clicker text-left",
        nameClass
      )}
    />
  );

  return (
    <li
      className={cn(
        "flex items-center gap-1.5 px-1 py-[1px] rounded-sm",
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      <img
        src={champIcon}
        alt={p.championName ?? ""}
        className="w-[15px] h-[15px] rounded-[2px] shrink-0"
      />
      {isLobbyMate && !highlight && (
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: "#00d992",
            boxShadow: "0 0 6px rgba(0,217,146,0.7)",
          }}
        />
      )}
      {NameEl}
      {/* NB: verify badge intentionally NOT shown here. It belongs
          next to the lobby player's display name (the human identity)
          in the section-group header, not next to each Riot account
          name in the scoreboard. */}
    </li>
  );
}

/* ─── click-to-resolve name (for players w/o cached tagline) ─────────── */
// Per-puuid in-flight cache so multiple clicks don't spawn duplicate fetches.
const resolveCache = new Map<
  string,
  Promise<{ name: string; tag: string; region: string } | null>
>();

function resolvePuuid(
  puuid: string,
  regionHint: string
): Promise<{ name: string; tag: string; region: string } | null> {
  const cached = resolveCache.get(puuid);
  if (cached) return cached;
  const p = fetch(
    `${API_BASE_URL}/api/scout/resolve-puuid/${encodeURIComponent(
      puuid
    )}?region=${encodeURIComponent(regionHint)}`
  )
    .then(async (r) => {
      if (!r.ok) return null;
      const data = await r.json();
      if (!data?.name || !data?.tag || !data?.region) return null;
      return {
        name: data.name as string,
        tag: data.tag as string,
        region: data.region as string,
      };
    })
    .catch(() => null);
  resolveCache.set(puuid, p);
  return p;
}

function ResolveOnClickName({
  puuid,
  fallbackName,
  regionHint,
  className,
}: {
  puuid: string;
  fallbackName: string;
  regionHint: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await resolvePuuid(puuid, regionHint);
      if (!res) return; // silently fail — name stays unclickable visually
      const region = res.region.toLowerCase();
      navigate(
        `/summoners/${region}/${encodeURIComponent(
          res.name
        )}-${encodeURIComponent(res.tag)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={cn(className, loading && "opacity-60")}
      title={fallbackName}
    >
      {loading ? "…" : fallbackName}
    </button>
  );
}
