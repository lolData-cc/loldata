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
import { API_BASE_URL } from "@/config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { timeAgo } from "@/utils/timeAgo";
import { getKdaBackgroundStyle } from "@/utils/kdaColor";
import {
  getKeystoneIcon,
  getStyleIcon,
  getKeystoneName,
  getStyleName,
} from "@/constants/runes";

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

const blueWinTint = false;         // TODO: hook into uiPrefs if needed
const coloredMatchBg = false;      // TODO: hook into uiPrefs if needed

export function MatchCard({ data }: { data: MatchCardData }) {
  const {
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
  } = data;

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

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-md p-2 text-flash transition",
        isRemake
          ? "bg-black/30 backdrop-blur-lg saturate-150"
          : coloredMatchBg
          ? win
            ? blueWinTint
              ? "bg-[#5BA8E6]/[0.10] backdrop-blur-lg saturate-150"
              : "bg-[#00D18D]/[0.08] backdrop-blur-lg saturate-150"
            : "bg-[#c93232]/[0.10] backdrop-blur-lg saturate-150"
          : "bg-black/18 backdrop-blur-lg saturate-150",
        "shadow-[0_10px_30px_rgba(0,0,0,0.60),inset_0_0_0_0.35px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]",
        isRemake
          ? "hover:bg-black/35 hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "hover:bg-black/16 hover:shadow-[0_14px_40px_rgba(0,0,0,0.65),inset_0_0_0_0.35px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
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

      <div className="flex items-center justify-center h-full relative z-10">
        <div className="w-full">
          {/* Left colored bar — gradient by win/loss/remake */}
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-1 rounded-l-sm z-10",
              isRemake
                ? "bg-gradient-to-b from-[#f5a623] to-[#8a6010]"
                : win
                ? blueWinTint
                  ? "bg-gradient-to-b from-[#5BA8E6] to-[#1a3a5c]"
                  : "bg-gradient-to-b from-[#00D18D] to-[#11382E]"
                : "bg-gradient-to-b from-[#c93232] to-[#420909]"
            )}
          />

          <div className="relative z-10 ml-2">
            <div className="ml-2">
              {/* Top meta row */}
              <div className="relative flex justify-between text-[11px] uppercase text-flash/70">
                <span className="relative z-20 flex items-center gap-2">
                  <span>{queueLabel}</span>
                  <span
                    className={cn(
                      "px-0.5 py-[1px] rounded-sm text-[11px] font-medium border border-transparent",
                      isRemake
                        ? "text-[#f5a623]"
                        : win
                        ? blueWinTint
                          ? "text-[#5BA8E6]"
                          : "text-[#00D992]"
                        : "text-[#d63336]"
                    )}
                  >
                    {isRemake ? "REMAKE" : win ? "WIN" : "LOSS"}
                  </span>

                  {/* LP delta chip — cyber/HUD style. Only shown for ranked
                      games where we have a snapshot pair. Promotion/demotion
                      chips show the rank reached, e.g. "▲ D4". */}
                  {rankChange === "PROMOTION" && (
                    <span
                      className="ml-0.5 inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm border border-[#00D992]/30 bg-[#00D992]/10 text-[#00D992] text-[10px] font-mono tracking-wider uppercase shadow-[0_0_8px_rgba(0,217,146,0.18)]"
                      title={`Promoted to ${rankAfter?.tier ?? ""} ${rankAfter?.division ?? ""}`.trim()}
                    >
                      <span aria-hidden>▲</span>
                      <span>
                        {formatRankShort(
                          rankAfter?.tier,
                          rankAfter?.division
                        ) || "PROMO"}
                      </span>
                    </span>
                  )}
                  {rankChange === "DEMOTION" && (
                    <span
                      className="ml-0.5 inline-flex items-center gap-1 px-1.5 py-[1px] rounded-sm border border-[#d63336]/30 bg-[#d63336]/10 text-[#d63336] text-[10px] font-mono tracking-wider uppercase shadow-[0_0_8px_rgba(214,51,54,0.18)]"
                      title={`Demoted to ${rankAfter?.tier ?? ""} ${rankAfter?.division ?? ""}`.trim()}
                    >
                      <span aria-hidden>▼</span>
                      <span>
                        {formatRankShort(
                          rankAfter?.tier,
                          rankAfter?.division
                        ) || "DEMOTE"}
                      </span>
                    </span>
                  )}
                  {rankChange == null &&
                    typeof lpDelta === "number" &&
                    lpDelta !== 0 && (
                      <span
                        className={cn(
                          "ml-0.5 inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-sm border text-[10px] font-mono tracking-wider",
                          lpDelta > 0
                            ? "border-[#00D992]/30 bg-[#00D992]/10 text-[#00D992] shadow-[0_0_8px_rgba(0,217,146,0.18)]"
                            : "border-[#d63336]/30 bg-[#d63336]/10 text-[#d63336] shadow-[0_0_8px_rgba(214,51,54,0.18)]"
                        )}
                        title={`${lpDelta > 0 ? "+" : ""}${lpDelta} LP this game`}
                      >
                        <span>
                          {lpDelta > 0 ? "+" : ""}
                          {lpDelta}
                        </span>
                        <span className="opacity-70">LP</span>
                      </span>
                    )}
                </span>

                <span className="absolute left-1/2 transform -translate-x-1/2 z-20">
                  {minutes}:{seconds}
                </span>

                <span className="relative z-20">
                  {timeAgo(gameCreationMs)}
                </span>
              </div>

              {/* Main row: champion + runes + KDA + items */}
              <div className="relative flex justify-between">
                <div className="relative z-40 flex justify-between w-full">
                  <div className="mt-3">
                    <div className="flex space-x-1.5 relative">
                      <div className="relative w-12 h-12">
                        <img
                          src={champIcon}
                          alt={championName}
                          className="w-12 h-12 rounded-md"
                        />
                        {championLevel != null && (
                          <div className="absolute -bottom-1 -right-1 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded-sm shadow font-geist">
                            {championLevel}
                          </div>
                        )}
                      </div>

                      {/* Runes */}
                      <div className="grid grid-rows-2 gap-0.5">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                                {keystoneSrc && (
                                  <img
                                    src={keystoneSrc}
                                    alt={keystoneName ?? "Keystone"}
                                    className="w-5 h-5 rounded-full"
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
                              <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                                {subStyleSrc && (
                                  <img
                                    src={subStyleSrc}
                                    alt={subStyleName ?? "Secondary"}
                                    className="w-5 h-5 rounded-full opacity-70"
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
                      <div className="flex ml-1">
                        <div className="grid grid-cols-3 grid-rows-2 gap-0.5">
                          {mainItems.map((itemId, idx) => (
                            <div
                              key={idx}
                              className="w-6 h-6 rounded-sm bg-[#0f0f0f] border border-[#2B2A2B]"
                            >
                              {typeof itemId === "number" && itemId > 0 && (
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
                              )}
                            </div>
                          ))}
                        </div>

                        {typeof trinket === "number" && trinket > 0 && (
                          <div className="flex items-center justify-center ml-1">
                            <div className="w-6 h-6 bg-[#0f0f0f] rounded-full">
                              <img
                                src={`${cdnBaseUrl()}/img/item/${trinket}.png`}
                                alt={`Trinket ${trinket}`}
                                className="w-full h-full rounded-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* KDA */}
                    <div className="flex flex-col mt-2">
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        <div
                          className={cn(
                            "flex items-center justify-center h-7 w-[88px] text-[14px] font-chakrapetch font-bold tabular-nums rounded-[3px] border tracking-wide",
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
                        <span className="font-geist text-xs font-thin text-flash/40 ml-1">
                          {typeof kdaValue === "number"
                            ? kdaValue.toFixed(2)
                            : kdaValue}{" "}
                          KDA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scoreboard — right side, two team columns */}
                  {hasScoreboard && (
                    <div className="hidden sm:grid grid-cols-2 gap-x-4 gap-y-0 mt-3 text-[10px] w-[44%] shrink-0 font-jetbrains">
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
    </li>
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
        className="w-4 h-4 rounded-sm shrink-0"
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
