// /scout/[slug] — public feed for a scout lobby.
//
// Layout:
//   1. Yunara splash hero with lobby name + headline stats
//   2. Custom tab nav (Matches / Stats / Habits / Champions)
//   3. Per-tab content

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Loader2,
  ChevronDown,
  Users,
  Trophy,
  TrendingUp,
  Gamepad2,
  Award,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, cdnBaseUrl, cdnSplashUrl, normalizeChampName, summonerSpellUrl } from "@/config";
import { getKeystoneIcon } from "@/constants/runes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MatchCard, type MatchCardData } from "@/components/matchcard";
import { showCyberToast } from "@/lib/toast-utils";
import { DiamondButton } from "@/components/ui/diamond-button";
import { getRankImage } from "@/utils/rankIcons";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Check, Pencil, Trash2, Eye } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";

/* ─── shapes ─────────────────────────────────────────────────────────── */
type LobbyAccount = {
  id: string;
  puuid: string;
  region: string;
  riotName: string;
  riotTag: string;
  isPrimary: boolean;
  orderIndex: number;
};

type LobbyPlayer = {
  id: string;
  displayName: string;
  color: string | null;
  iconId: number | null;
  orderIndex: number;
  accounts: LobbyAccount[];
};

type Lobby = {
  slug: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  lastActiveAt: string;
  lastRefreshAt: string | null;
  ownerUserId: string | null;
  heroChampion: string | null;
  players: LobbyPlayer[];
};

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;     // must match backend
const COUNTDOWN_TICK_MS = 1000;

type FeedItem = {
  rowId: string;
  matchId: string;
  ownerPlayerId: string;
  queueId: number | null;
  gameCreation: string;
  gameDurationSeconds: number | null;
  platform: string | null;
  participant: {
    puuid: string;
    summonerName: string | null;
    teamId: number | null;
    championId: number | null;
    championName: string | null;
    role: string | null;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    goldEarned: number;
    totalDamageToChampions: number;
    visionScore: number;
    items: number[];
    perkPrimaryStyle: number | null;
    perkSubStyle: number | null;
    perkKeystone: number | null;
    // Backend may omit on older payloads — all are optional.
    lpDelta?: number | null;
    rankChange?: "PROMOTION" | "DEMOTION" | null;
    rankAfter?: { tier: string; division: string | null } | null;
  };
  allParticipants: Array<{
    puuid: string;
    summonerName: string | null;
    championName: string | null;
    teamId: number | null;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
  }>;
  // Optional: may be absent if backend hasn't been restarted with the new
  // payload. Frontend falls back to `lobbyPlayers[].accountPuuid` below.
  lobbyAccountPuuidsInMatch?: string[];
  lobbyPlayers: Array<{
    playerId: string;
    displayName: string;
    color: string | null;
    accountPuuid: string;
  }>;
};

type CurrentRank = {
  tier: string;                 // IRON..CHALLENGER
  rankDivision: string | null;  // I..IV (null for apex tiers)
  lp: number;
  wins: number;
  losses: number;
};

type LeaderboardAccount = {
  // Identity
  puuid: string;
  region: string;
  riotName: string;
  riotTag: string;
  iconId: number | null;
  // Owning lobby player
  playerId: string;
  playerDisplayName: string;
  color: string | null;
  // Stats
  currentRank: CurrentRank | null;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  avgKda: number;
  balance: number;       // LP balance (signed) since lobby creation
};

type StatsBucket = {
  bucketStart: string;
  bucketLabel: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  avgKda: number;
};

type ChampionLine = {
  champion: string;
  games: number;
  wins: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  avgKda: number;
};

type ChampionsPlayer = {
  playerId: string;
  displayName: string;
  color: string | null;
  champions: ChampionLine[];
};

type TimeBucketFE = { games: number; wins: number; winrate: number };
type HabitsPlayer = {
  playerId: string;
  displayName: string;
  color: string | null;
  games: number;
  afterLoss: { games: number; wins: number; winrate: number };
  afterWin: { games: number; wins: number; winrate: number };
  longestWinStreak: number;
  longestLossStreak: number;
  timeOfDay: {
    morning: TimeBucketFE;
    afternoon: TimeBucketFE;
    evening: TimeBucketFE;
    night: TimeBucketFE;
  };
};

type StatsWindow = "today" | "week" | "all";
type StatsPeriod = "day" | "week" | "month";

const JADE = "#00d992";
const QUEUE_LABELS: Record<number, string> = {
  420: "RANKED SOLO/DUO",
  440: "RANKED FLEX",
  400: "NORMAL",
  430: "NORMAL BLIND",
  450: "ARAM",
  490: "QUICKPLAY",
};

const DEFAULT_HERO_CHAMPION = "Yunara";

/* ─── shared styles ──────────────────────────────────────────────────── */
const glassDark = cn(
  "relative overflow-hidden rounded-md",
  "bg-black/15 backdrop-blur-lg saturate-150",
  "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
);

function GlowBackdrop({ subtle = false }: { subtle?: boolean }) {
  const alpha = subtle ? 0.05 : 0.10;
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 30% 0%, rgba(0,217,146,${alpha}) 0%, transparent 65%),
          radial-gradient(ellipse 60% 60% at 100% 100%, rgba(0,184,255,${alpha * 0.5}) 0%, transparent 70%)
        `,
        filter: "blur(20px)",
      }}
    />
  );
}

function profileIconUrl(iconId: number | null) {
  if (iconId == null) return null;
  return `${cdnBaseUrl()}/img/profileicon/${iconId}.png`;
}

/* ─── hero (Yunara splash + lobby title) ────────────────────────────── */
function LobbyHero({ lobby }: { lobby: Lobby }) {
  const heroName = lobby.heroChampion || DEFAULT_HERO_CHAMPION;
  const splash = cdnSplashUrl(normalizeChampName(heroName));

  return (
    <div
      className="relative w-screen left-1/2 -translate-x-1/2 h-[420px] overflow-hidden mb-6"
      style={{ marginTop: "-80px" /* navbar h-16 + content mt-4 — hero goes behind */ }}
    >
      <img
        src={splash}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 30%" }}
        loading="eager"
        decoding="async"
        draggable={false}
      />
      {/* Overlays — same recipe as champion page */}
      <div className="absolute inset-0 bg-liquirice/65" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] z-[2]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none z-[3] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.85)_100%)]" />
      <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-b from-liquirice to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-[3] bg-gradient-to-t from-liquirice to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex items-end justify-center pb-6">
        <div className="w-full xl:w-[65%] min-[2560px]:w-[55%] px-4">
          <div className="flex items-center gap-3 mb-2">
            <span style={{ color: JADE, fontSize: "12px" }}>◈</span>
            <span className="text-[11px] font-jetbrains tracking-[0.25em] uppercase text-jade/60">
              Scout :: Lobby
            </span>
            <span className="text-flash/30 text-[11px]">·</span>
            <span className="text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/50">
              {lobby.slug}
            </span>
          </div>

          <h1 className="text-[48px] sm:text-[60px] font-jetbrains font-medium text-flash tracking-tight leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            {lobby.name}
          </h1>
        </div>
      </div>
    </div>
  );
}


/* ─── day bucket helpers ─────────────────────────────────────────────── */
const MS_PER_DAY = 86_400_000;
function dayBucket(tsMs: number, now: number): string {
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(tsMs);
  b.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  if (diffDays < 7) return `${diffDays} DAYS AGO`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} WEEK${diffDays >= 14 ? "S" : ""} AGO`;
  return `${Math.floor(diffDays / 30)} MONTH${diffDays >= 60 ? "S" : ""} AGO`;
}

/* ─── section avatars — separate icons, active gets jade ring ────────── */
function SectionAvatars({
  members,
  activePlayerId,
  accent,
  onSelect,
}: {
  members: SectionMember[];
  activePlayerId: string;
  accent: string;
  onSelect?: (playerId: string) => void;
}) {
  // De-dupe by player.id (one icon per lobby player, even if multi-account).
  const seen = new Set<string>();
  const unique = members.filter((m) => {
    if (seen.has(m.player.id)) return false;
    seen.add(m.player.id);
    return true;
  });
  const visible = unique.slice(0, 4);

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {visible.map((m) => {
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

        const inner = iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="w-9 h-9 rounded-full transition-all"
            style={{
              border: `1.5px solid ${borderColor}`,
              boxShadow: ringShadow,
              opacity,
            }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: `1.5px solid ${borderColor}`,
              boxShadow: ringShadow,
              opacity,
            }}
          >
            <span
              className="text-[14px] font-jetbrains font-bold"
              style={{ color: memberAccent }}
            >
              {p.displayName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        );

        if (isClickable) {
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect!(p.id)}
              title={`View ${p.displayName}'s stats`}
              className="cursor-clicker hover:scale-110 transition-transform"
            >
              {inner}
            </button>
          );
        }
        return (
          <div
            key={p.id}
            title={p.displayName}
            className={onSelect ? "cursor-default" : undefined}
          >
            {inner}
          </div>
        );
      })}
      {unique.length > 4 && (
        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 border border-flash/15">
          <span className="text-[11px] font-jetbrains font-bold text-flash/60">
            +{unique.length - 4}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── section member (one player+account combo in a section) ────────── */
type SectionMember = {
  player: LobbyPlayer;
  account: LobbyAccount | null;
};

/* ─── compact session stat pill ────────────────────────────────────────
 * Used in the group card header. Every pill is the same w×h so the row
 * stays as a clean grid. Optional sub text renders beneath the value
 * (e.g. K/D/A split under the KDA ratio).
 */
function SessionStatChip({
  label,
  value,
  sub,
  tone,
  title,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "bad" | "neutral";
  title?: string;
}) {
  const palette =
    tone === "good"
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
  return (
    <div
      title={title}
      className={cn(
        "flex flex-col items-center justify-center gap-px w-[78px] h-[34px] rounded-[3px] ring-1 tabular-nums",
        palette.ring,
        palette.bg,
        palette.glow
      )}
    >
      <span
        className={cn(
          "text-[12px] font-chakrapetch font-bold tracking-wide leading-none",
          palette.value
        )}
      >
        {value}
      </span>
      <span
        className={cn(
          "text-[7.5px] font-jetbrains tracking-[0.22em] uppercase leading-none",
          palette.label
        )}
      >
        {sub ?? label}
      </span>
    </div>
  );
}

/* ─── player/squad section card ─────────────────────────────────────── */
// Renders matches owned by 1+ (player, account) combos. When 2+ members
// played the EXACT same match set in a day, they're merged into a single
// "A & B" card.
function PlayerSectionCard({
  members,
  matches,
  itemsByMatch,
  squadMatchIds,
  lobbyAccountByPuuid,
}: {
  members: SectionMember[];
  matches: FeedItem[];
  itemsByMatch: Map<string, FeedItem[]>;
  squadMatchIds: Set<string>;
  lobbyAccountByPuuid: Record<string, { riotName: string; riotTag: string; region: string }>;
}) {
  const accent = members[0].player.color || JADE;

  // De-dupe by player.id and keep accounts grouped per player so the
  // header can show "Marco" once with their accounts inline.
  const uniquePlayers: SectionMember[] = [];
  const seenPlayer = new Set<string>();
  for (const m of members) {
    if (seenPlayer.has(m.player.id)) continue;
    seenPlayer.add(m.player.id);
    uniquePlayers.push(m);
  }
  const isSquad = uniquePlayers.length >= 2;

  // Expand/collapse state — show 1 match by default, "Show N more" CTA
  // beneath unfolds the rest. Sections with a single match never need
  // the toggle. Lets a user with 15 daily games not flood the feed.
  const [expanded, setExpanded] = useState(false);

  // Section outcome — drives the left border color.
  // Tie counts as a win-leaning result, so 50% winrate keeps the jade
  // bar. Only <50% (strictly more losses than wins) goes red.
  const sectionWins = matches.reduce(
    (n, m) => n + (m.participant.win ? 1 : 0),
    0
  );
  const sectionLosses = matches.length - sectionWins;
  const winLossAccent =
    matches.length === 0
      ? accent
      : sectionLosses > sectionWins
        ? "#d63336"
        : JADE;

  // Active member is user-selectable in squad sections. Default = first.
  const [activePlayerId, setActivePlayerId] = useState(
    uniquePlayers[0].player.id
  );
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
      const myItem =
        matchItems.find((x) => x.ownerPlayerId === activePlayerId) ?? it;
      const p = myItem.participant;
      kills += p.kills;
      deaths += p.deaths;
      assists += p.assists;
      if (typeof p.lpDelta === "number") {
        lpTotal += p.lpDelta;
        lpCounted++;
      }
    }
    const kdaRatio =
      deaths === 0
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

  return (
    <div className="relative overflow-hidden rounded-md bg-black/15 backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_0_0_0.5px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-[1]"
        style={{
          background: `color-mix(in srgb, ${winLossAccent} 75%, transparent)`,
          boxShadow: `0 0 8px color-mix(in srgb, ${winLossAccent} 35%, transparent)`,
        }}
      />

      {/* Header — name(s) + account(s); active member styled jade */}
      <div className="relative z-[2] flex items-center gap-3 px-4 py-3 border-b border-flash/[0.06]">
        <SectionAvatars
          members={uniquePlayers}
          activePlayerId={activePlayerId}
          accent={accent}
          onSelect={isSquad ? setActivePlayerId : undefined}
        />
        <div className="flex flex-col min-w-0">
          {/* Title row — each name colored by active state, clickable in squads */}
          <div className="flex items-center gap-2 flex-wrap">
            {uniquePlayers.map((m, i) => {
              const isActive = m.player.id === activePlayerId;
              const NameSpan = (
                <span
                  className={cn(
                    "text-[16px] font-chakrapetch font-semibold leading-none truncate tracking-wide",
                    isActive ? "text-jade" : "text-flash/80"
                  )}
                  style={
                    isActive
                      ? { textShadow: "0 0 14px rgba(0,217,146,0.45)" }
                      : undefined
                  }
                >
                  {m.player.displayName}
                </span>
              );
              return (
                <span key={m.player.id} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <span className="text-flash/25 text-[14px]">&</span>
                  )}
                  {isSquad && !isActive ? (
                    <button
                      type="button"
                      onClick={() => setActivePlayerId(m.player.id)}
                      className="hover:opacity-80 transition-opacity cursor-clicker"
                    >
                      {NameSpan}
                    </button>
                  ) : (
                    NameSpan
                  )}
                </span>
              );
            })}
            {isSquad && (
              <span
                className="text-[9px] font-jetbrains font-medium tracking-[0.2em] uppercase px-1.5 py-[2px] rounded-[2px] flex items-center gap-1"
                style={{
                  color: JADE,
                  background: "rgba(0,217,146,0.10)",
                  border: "1px solid color-mix(in srgb, #00d992 30%, transparent)",
                }}
              >
                <Users className="w-2.5 h-2.5" />
                {squadLabel(uniquePlayers.length)}
              </span>
            )}
          </div>
          {/* Subtitle: account list separated by + */}
          <div className="text-[11px] font-jetbrains tracking-[0.1em] text-flash/55 mt-1 truncate">
            {members.map((m, i) => (
              <span key={`${m.player.id}:${m.account?.id ?? i}`}>
                {i > 0 && <span className="text-flash/25"> + </span>}
                {m.account ? (
                  <>
                    <span className="text-jade/60 mr-1 tracking-[0.18em] uppercase text-[10px]">
                      {m.account.region}
                    </span>
                    {m.account.riotName}
                    <span className="text-flash/30">#{m.account.riotTag}</span>
                  </>
                ) : (
                  <span className="text-flash/40">{m.player.displayName}</span>
                )}
              </span>
            ))}
          </div>
        </div>
        {/* Session stats — compact stat pills for the active player */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <SessionStatChip
            label="W/L"
            value={`${sectionWins}-${sectionLosses}`}
            tone="neutral"
          />
          <SessionStatChip
            label="WR"
            value={`${sessionStats.winrate}%`}
            tone={
              sessionStats.winrate >= 60
                ? "good"
                : sessionStats.winrate >= 50
                  ? "neutral"
                  : "bad"
            }
          />
          <SessionStatChip
            label="LP"
            value={
              sessionStats.lpCounted === 0
                ? "—"
                : `${sessionStats.lpTotal > 0 ? "+" : ""}${sessionStats.lpTotal}`
            }
            tone={
              sessionStats.lpTotal > 0
                ? "good"
                : sessionStats.lpTotal < 0
                  ? "bad"
                  : "neutral"
            }
          />
          <SessionStatChip
            label="KDA"
            value={
              sessionStats.kdaRatio === Infinity
                ? "PERF"
                : sessionStats.kdaRatio.toFixed(2)
            }
            tone={
              sessionStats.kdaRatio === Infinity ||
              sessionStats.kdaRatio >= 3
                ? "good"
                : sessionStats.kdaRatio >= 2
                  ? "neutral"
                  : "bad"
            }
            sub={`${sessionStats.kills}/${sessionStats.deaths}/${sessionStats.assists}`}
          />
        </div>
      </div>

      {/* Matches list — collapsed view shows only the most recent. The
          rest get hidden behind the cyber "show more" trigger below. */}
      <ul className="relative z-[2] flex flex-col gap-3 px-3 pt-3 pb-1">
        {(expanded ? matches : matches.slice(0, 1)).map((repItem, idx) => {
          // Prefer the active player's FeedItem for this match so the card
          // renders THEIR champion/KDA/items, not whoever-was-first.
          const matchItems = itemsByMatch.get(repItem.matchId) ?? [repItem];
          const item =
            matchItems.find((x) => x.ownerPlayerId === activePlayerId) ??
            repItem;

          const card: MatchCardData = {
            matchId: item.matchId,
            queueLabel:
              QUEUE_LABELS[item.queueId ?? -1] ??
              `QUEUE ${item.queueId ?? "?"}`,
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
            items: item.participant.items,
            allParticipants: item.allParticipants,
            highlightPuuid: item.participant.puuid,
            lobbyMatePuuids: (
              item.lobbyAccountPuuidsInMatch ??
              item.lobbyPlayers.map((lp) => lp.accountPuuid)
            ).filter((p) => p !== item.participant.puuid),
            lobbyAccountByPuuid,
            lpDelta: item.participant.lpDelta ?? null,
            rankChange: item.participant.rankChange ?? null,
            rankAfter: item.participant.rankAfter ?? null,
          };
          const showPerMatchSquadBadge =
            !isSquad && squadMatchIds.has(item.matchId);

          // Gap to the OLDER match (matches are newest-first).
          // Gap = newer.start - (older.start + older.duration)
          let breakLabel: string | null = null;
          const next = matches[idx + 1];
          if (next) {
            const newerStart = new Date(item.gameCreation).getTime();
            const olderStart = new Date(next.gameCreation).getTime();
            const olderEnd =
              olderStart + (next.gameDurationSeconds ?? 0) * 1000;
            const gap = newerStart - olderEnd;
            breakLabel = formatBreakLabel(gap);
          }

          return (
            <div key={item.rowId}>
              <div className="relative">
                <MatchCard data={card} />
                {showPerMatchSquadBadge && (
                  <div
                    className="absolute top-2 right-12 z-20 flex items-center gap-1 text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium px-1.5 py-[2px] rounded-[2px]"
                    style={{
                      color: JADE,
                      background: "rgba(0,217,146,0.10)",
                      border:
                        "1px solid color-mix(in srgb, #00d992 30%, transparent)",
                    }}
                  >
                    <Users className="w-2.5 h-2.5" />
                    {squadLabel(item.lobbyPlayers.length)}
                  </div>
                )}
              </div>
              {breakLabel && <BreakDivider label={breakLabel} />}
            </div>
          );
        })}
      </ul>

      {/* Cyber show-more / collapse trigger — wide, low, sits at the
          card's bottom edge. Hidden when the group only has 1 match. */}
      {matches.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn(
            "relative z-[2] group/showmore w-full mt-2 mx-0 px-4 py-2.5 cursor-clicker overflow-hidden",
            "border-t border-flash/[0.06] hover:border-jade/30 transition-colors duration-200"
          )}
        >
          {/* Edge accent gradient */}
          <span
            aria-hidden
            className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-jade/40 to-transparent opacity-0 group-hover/showmore:opacity-100 transition-opacity duration-200"
          />
          {/* Hover wash */}
          <span
            aria-hidden
            className="absolute inset-0 bg-jade/[0.02] opacity-0 group-hover/showmore:opacity-100 transition-opacity duration-200"
          />
          {/* Corner brackets */}
          <span
            aria-hidden
            className="absolute top-1 left-1 w-2 h-2 border-l border-t border-jade/0 group-hover/showmore:border-jade/45 transition-colors duration-200"
          />
          <span
            aria-hidden
            className="absolute top-1 right-1 w-2 h-2 border-r border-t border-jade/0 group-hover/showmore:border-jade/45 transition-colors duration-200"
          />
          <span
            aria-hidden
            className="absolute bottom-1 left-1 w-2 h-2 border-l border-b border-jade/0 group-hover/showmore:border-jade/45 transition-colors duration-200"
          />
          <span
            aria-hidden
            className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-jade/0 group-hover/showmore:border-jade/45 transition-colors duration-200"
          />

          <span className="relative z-[1] inline-flex items-center justify-center gap-2 w-full text-flash/55 group-hover/showmore:text-jade transition-colors duration-200">
            <span
              aria-hidden
              className={cn(
                "text-[12px] leading-none transition-transform duration-300",
                expanded ? "rotate-180" : "rotate-0"
              )}
            >
              ⌄
            </span>
            <span className="text-[10px] font-jetbrains font-bold tracking-[0.3em] uppercase">
              {expanded
                ? "Collapse"
                : `Show ${matches.length - 1} more ${matches.length - 1 === 1 ? "match" : "matches"}`}
            </span>
            <span
              aria-hidden
              className={cn(
                "text-[12px] leading-none transition-transform duration-300",
                expanded ? "rotate-180" : "rotate-0"
              )}
            >
              ⌄
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function squadLabel(n: number): string {
  if (n === 2) return "DUO";
  if (n === 3) return "TRIO";
  if (n === 4) return "QUAD";
  return "5-STACK";
}

/* ─── rank display helpers ─────────────────────────────────────────── */
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function formatRankShort(r: CurrentRank): string {
  const tier = r.tier.toUpperCase();
  if (APEX_TIERS.has(tier)) return `${tier.slice(0, 3)} ${r.lp} LP`;
  return `${tier.slice(0, 3)} ${r.rankDivision ?? "?"} · ${r.lp} LP`;
}

function rankColorClass(tier: string): string {
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

/* ─── break divider between consecutive matches ─────────────────────── */
// Visible window: 1 hour ≤ gap < 4 hours. Shorter gaps are "back-to-back",
// longer ones are a separate session — neither needs a marker.
const BREAK_MIN_MS = 60 * 60 * 1000;
const BREAK_MAX_MS = 4 * 60 * 60 * 1000;

function formatBreakLabel(gapMs: number): string | null {
  if (gapMs < BREAK_MIN_MS || gapMs >= BREAK_MAX_MS) return null;
  const totalMin = Math.round(gapMs / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h} ${h === 1 ? "HOUR" : "HOURS"} BREAK`;
  return `${h}H ${String(m).padStart(2, "0")}M BREAK`;
}

function BreakDivider({ label }: { label: string }) {
  return (
    <div
      className="relative flex items-center gap-2.5 my-2.5 select-none"
      aria-hidden="true"
    >
      {/* Left line with gradient + jade fade */}
      <div className="flex-1 relative h-[1px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-jade/20 to-jade/35" />
      </div>

      {/* Cyber chip — markers + label with scan stripe */}
      <div className="relative flex items-center gap-1.5 px-2 py-[3px] rounded-[2px]"
        style={{
          background: "rgba(0,217,146,0.04)",
          border: "1px solid color-mix(in srgb, #00d992 22%, transparent)",
          boxShadow: "0 0 14px rgba(0,217,146,0.10)",
        }}
      >
        {/* Scan stripe (moving) */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2px] opacity-60"
          aria-hidden
        >
          <div
            className="absolute inset-y-0 w-1/3 -translate-x-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(0,217,146,0.18), transparent)",
              animation: "scoutBreakScan 3.5s linear infinite",
            }}
          />
        </div>

        <span style={{ color: "#00d992", fontSize: "8px" }}>◈</span>
        <span className="relative text-[9px] font-jetbrains font-medium tracking-[0.28em] uppercase text-jade/75 tabular-nums">
          {label}
        </span>
        <span style={{ color: "#00d992", fontSize: "8px" }}>◈</span>
      </div>

      {/* Right line (mirror) */}
      <div className="flex-1 relative h-[1px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-jade/20 to-jade/35" />
      </div>

      <style>{`
        @keyframes scoutBreakScan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

/* ─── matches tab content ───────────────────────────────────────────── */
/* ─── player filter chip bar (used on Matches tab) ──────────────────── */
function PlayerFilterBar({
  lobby,
  selectedPlayerId,
  onSelect,
  countByPlayer,
  mainOnly,
  onToggleMainOnly,
}: {
  lobby: Lobby;
  selectedPlayerId: string | null;
  onSelect: (id: string | null) => void;
  countByPlayer: Map<string, number>;
  mainOnly: boolean;
  onToggleMainOnly: () => void;
}) {
  const players = [...lobby.players].sort((a, b) => a.orderIndex - b.orderIndex);
  const totalMatches = Array.from(countByPlayer.values()).reduce((n, v) => n + v, 0);

  return (
    <div className={cn(glassDark, "px-3 h-12 flex items-center")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1] flex items-center gap-3 w-full h-full">
        {/* Tab-style filter row: name + small count, underline accent on
            active. Horizontal scroll on overflow (scrollbar hidden) so
            the bar height stays fixed. */}
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide flex-1 min-w-0 h-full">
          <PlayerFilterTab
            active={selectedPlayerId === null}
            accent={JADE}
            onClick={() => onSelect(null)}
            icon={<Users className="w-3.5 h-3.5" />}
            label="All"
            count={totalMatches}
          />
          {players.map((p) => {
            const accent = p.color || JADE;
            const count = countByPlayer.get(p.id) ?? 0;
            return (
              <PlayerFilterTab
                key={p.id}
                active={selectedPlayerId === p.id}
                accent={accent}
                onClick={() =>
                  onSelect(selectedPlayerId === p.id ? null : p.id)
                }
                icon={
                  profileIconUrl(p.iconId) ? (
                    <img
                      src={profileIconUrl(p.iconId)!}
                      alt=""
                      className="w-[18px] h-[18px] rounded-full"
                      style={{
                        border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                      }}
                    />
                  ) : (
                    <span
                      className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-jetbrains font-bold"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                        color: accent,
                      }}
                    >
                      {p.displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )
                }
                label={p.displayName}
                count={count}
              />
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-6 w-[1px] bg-flash/10 shrink-0" />

        {/* Main only — compact toggle */}
        <button
          type="button"
          role="checkbox"
          aria-checked={mainOnly}
          onClick={onToggleMainOnly}
          title="Show only matches played on each player's primary account"
          className={cn(
            "shrink-0 inline-flex items-center gap-2 px-2 py-1 rounded-[3px] cursor-clicker transition-all duration-200 font-jetbrains tracking-[0.18em] uppercase text-[10px] font-medium",
            mainOnly
              ? "text-jade"
              : "text-flash/45 hover:text-flash/75"
          )}
        >
          <span
            className={cn(
              "w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center transition-colors",
              mainOnly
                ? "bg-jade border-jade"
                : "bg-transparent border-flash/30"
            )}
          >
            {mainOnly && <Check className="w-2.5 h-2.5 text-liquirice" strokeWidth={3} />}
          </span>
          <span className="hidden sm:inline">Main only</span>
        </button>
      </div>
    </div>
  );
}

/* Tab-style filter item — no surrounding chip, just icon + label + tiny
 * count. Active state is signalled by an accent underline + jade text.
 * Quieter and more "navigation-like" than the old boxed chip approach. */
function PlayerFilterTab({
  active,
  accent,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative inline-flex items-center gap-2 shrink-0 cursor-clicker pb-1.5 -mb-1.5"
    >
      <span className="flex items-center justify-center">{icon}</span>
      <span
        className={cn(
          "text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium transition-colors duration-150",
          active
            ? "text-flash/90"
            : "text-flash/50 group-hover:text-flash/80"
        )}
        style={active ? { color: accent } : undefined}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-[9px] font-jetbrains tabular-nums tracking-wider transition-colors duration-150",
          active ? "opacity-70" : "text-flash/30"
        )}
        style={active ? { color: accent } : undefined}
      >
        {count}
      </span>

      {/* Active underline — glow + accent color */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 right-0 -bottom-0.5 h-[1.5px] rounded-full transition-all duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: accent,
          boxShadow: `0 0 8px color-mix(in srgb, ${accent} 60%, transparent)`,
        }}
      />
    </button>
  );
}

function MatchesTab({
  items,
  lobby,
  hasMore,
  loadingMore,
  loadMore,
}: {
  items: FeedItem[];
  lobby: Lobby;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
}) {
  // Sentinel attaches AFTER this component mounts, so the observer effect
  // must live here (not in the parent) — otherwise it runs while
  // sentinelRef.current is still null and never re-runs.
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, items.length, hasMore]);

  // Filter: null = show all, otherwise show only items owned by this player.
  const [filterPlayerId, setFilterPlayerId] = useState<string | null>(null);
  // When enabled, only matches played on each player's primary account are shown.
  const [mainOnly, setMainOnly] = useState(false);

  const playerById = useMemo(() => {
    const map = new Map<string, LobbyPlayer>();
    for (const p of lobby.players) map.set(p.id, p);
    return map;
  }, [lobby]);

  // Set of primary-account puuids — used by the "Main only" filter.
  const primaryPuuids = useMemo(() => {
    const set = new Set<string>();
    for (const p of lobby.players) {
      const primary = p.accounts.find((a) => a.isPrimary) ?? p.accounts[0];
      if (primary) set.add(primary.puuid);
    }
    return set;
  }, [lobby]);

  // Per-player match count for the chip badges. Respects `mainOnly` so the
  // chip number always reflects what would actually render.
  const matchCountByPlayer = useMemo(() => {
    const counts = new Map<string, number>();
    const seenByPlayer = new Map<string, Set<string>>();
    for (const it of items) {
      if (mainOnly && !primaryPuuids.has(it.participant.puuid)) continue;
      if (!seenByPlayer.has(it.ownerPlayerId)) {
        seenByPlayer.set(it.ownerPlayerId, new Set());
      }
      const set = seenByPlayer.get(it.ownerPlayerId)!;
      if (set.has(it.matchId)) continue;
      set.add(it.matchId);
      counts.set(it.ownerPlayerId, (counts.get(it.ownerPlayerId) ?? 0) + 1);
    }
    return counts;
  }, [items, mainOnly, primaryPuuids]);

  // Apply both filters BEFORE the grouping — squad signatures stay correct
  // because they're derived from each item's lobbyPlayers (not the filtered
  // set), so e.g. Marco's "Marco & Luca" matches still render as squads.
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filterPlayerId && it.ownerPlayerId !== filterPlayerId) return false;
      if (mainOnly && !primaryPuuids.has(it.participant.puuid)) return false;
      return true;
    });
  }, [items, filterPlayerId, mainOnly, primaryPuuids]);

  // puuid → riot account info (name / tag / region). Used by the scoreboard
  // to build summoner links even for matches ingested before riot_id_tagline
  // existed in DB.
  const lobbyAccountByPuuid = useMemo(() => {
    const map: Record<string, { riotName: string; riotTag: string; region: string }> = {};
    for (const p of lobby.players) {
      for (const a of p.accounts) {
        map[a.puuid] = {
          riotName: a.riotName,
          riotTag: a.riotTag,
          region: a.region,
        };
      }
    }
    return map;
  }, [lobby]);

  // Each section starts as (day, player, account). Then we merge sections
  // within the same day whose match sets are IDENTICAL — those become a
  // single "squad" section with multiple members (e.g. "Marco & Luca").
  //
  // For squad sections, `itemsByMatch[mid]` carries all FeedItems for the
  // match (one per involved owner) so the render layer can pick the
  // "active" view consistently.
  type Section = {
    members: Array<{ playerId: string; puuid: string }>;
    matches: FeedItem[];          // representative FeedItem per match (first encountered)
    itemsByMatch: Map<string, FeedItem[]>;
    latestMatchTs: number;
  };
  type DayGroup = {
    label: string;
    sortKey: number;
    sections: Section[];
  };

  const dayGroups: DayGroup[] = useMemo(() => {
    const now = Date.now();
    const buckets = new Map<string, Map<string, Section>>(); // dayKey → squadSig → Section
    const dayMeta = new Map<string, { label: string; sortKey: number }>();
    const seenMatchByBucket = new Map<string, Set<string>>(); // dayKey:sig → matchIds

    for (const item of filteredItems) {
      const ts = new Date(item.gameCreation).getTime();
      const d = new Date(ts);
      d.setHours(0, 0, 0, 0);
      const dayKey = String(d.getTime());
      if (!dayMeta.has(dayKey)) {
        dayMeta.set(dayKey, { label: dayBucket(ts, now), sortKey: d.getTime() });
      }
      if (!buckets.has(dayKey)) buckets.set(dayKey, new Map());

      // Squad signature for THIS specific match — who+account combos that
      // appeared. Matches with the same signature get bucketed together,
      // regardless of who "owns" the FeedItem.
      const memberKeys = item.lobbyPlayers
        .map((lp) => `${lp.playerId}:${lp.accountPuuid}`)
        .sort();
      const sig = memberKeys.join("|");

      const dayMap = buckets.get(dayKey)!;
      if (!dayMap.has(sig)) {
        dayMap.set(sig, {
          members: [...item.lobbyPlayers]
            .sort((a, b) =>
              `${a.playerId}:${a.accountPuuid}`.localeCompare(
                `${b.playerId}:${b.accountPuuid}`
              )
            )
            .map((lp) => ({
              playerId: lp.playerId,
              puuid: lp.accountPuuid,
            })),
          matches: [],
          itemsByMatch: new Map(),
          latestMatchTs: ts,
        });
      }
      const sec = dayMap.get(sig)!;

      // Accumulate every FeedItem for the match (per-owner fan-out).
      if (!sec.itemsByMatch.has(item.matchId)) {
        sec.itemsByMatch.set(item.matchId, []);
      }
      sec.itemsByMatch.get(item.matchId)!.push(item);

      // Dedupe representative match list by matchId.
      const dedupeKey = `${dayKey}:${sig}`;
      if (!seenMatchByBucket.has(dedupeKey)) {
        seenMatchByBucket.set(dedupeKey, new Set());
      }
      const seenSet = seenMatchByBucket.get(dedupeKey)!;
      if (seenSet.has(item.matchId)) continue;
      seenSet.add(item.matchId);

      sec.matches.push(item);
      if (ts > sec.latestMatchTs) sec.latestMatchTs = ts;
    }

    const out: DayGroup[] = [];
    for (const [dayKey, dayMap] of buckets) {
      const meta = dayMeta.get(dayKey)!;
      const sections = Array.from(dayMap.values()).sort(
        (a, b) => b.latestMatchTs - a.latestMatchTs
      );
      out.push({ label: meta.label, sortKey: meta.sortKey, sections });
    }
    return out.sort((a, b) => b.sortKey - a.sortKey);
  }, [filteredItems]);

  const squadMatchIds = useMemo(() => {
    const set = new Set<string>();
    // Use the full items list — squad detection is global per-match, not
    // affected by the player filter.
    for (const item of items) {
      if (item.lobbyPlayers.length >= 2) set.add(item.matchId);
    }
    return set;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className={cn(glassDark, "p-12 text-center")}>
        <GlowBackdrop subtle />
        <div className="relative z-10 text-flash/40 text-sm">
          No matches yet. They'll appear here as games are played.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <PlayerFilterBar
        lobby={lobby}
        selectedPlayerId={filterPlayerId}
        onSelect={setFilterPlayerId}
        countByPlayer={matchCountByPlayer}
        mainOnly={mainOnly}
        onToggleMainOnly={() => setMainOnly((v) => !v)}
      />

      {dayGroups.length === 0 && filterPlayerId && (
        <div className={cn(glassDark, "p-10 text-center")}>
          <GlowBackdrop subtle />
          <div className="relative z-10 text-flash/40 text-sm">
            No matches for this player yet.
          </div>
        </div>
      )}

      {dayGroups.map((day, dayIdx) => (
        <section
          key={day.label + day.sortKey}
          className={cn(dayIdx > 0 && "pt-2")}
        >
          {/* Day separator — bold, full-width, glowing dot. Bigger than
              before so the eye latches onto the day boundary. */}
          <div className="relative flex items-center gap-3 mb-5 px-1">
            <span
              className="relative inline-flex items-center justify-center w-2 h-2 rounded-full"
              style={{
                background: JADE,
                boxShadow: "0 0 14px rgba(0,217,146,0.7), 0 0 4px rgba(0,217,146,0.9)",
              }}
            />
            <h2 className="text-[13px] font-jetbrains tracking-[0.3em] uppercase text-flash font-bold">
              {day.label}
            </h2>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-jade/30 via-flash/10 to-transparent" />
            <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/35">
              {day.sections.reduce((n, s) => n + s.matches.length, 0)} {" "}
              {day.sections.reduce((n, s) => n + s.matches.length, 0) === 1
                ? "match"
                : "matches"}
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {day.sections.map((section, idx) => {
              const sectionMembers: SectionMember[] = section.members
                .map((m) => {
                  const player = playerById.get(m.playerId);
                  if (!player) return null;
                  const account =
                    player.accounts.find((a) => a.puuid === m.puuid) ?? null;
                  return { player, account };
                })
                .filter((x): x is SectionMember => x !== null);
              if (sectionMembers.length === 0) return null;
              const key = `${day.sortKey}:${idx}:${section.members
                .map((m) => `${m.playerId}-${m.puuid}`)
                .join("+")}`;
              return (
                <PlayerSectionCard
                  key={key}
                  members={sectionMembers}
                  matches={section.matches}
                  itemsByMatch={section.itemsByMatch}
                  squadMatchIds={squadMatchIds}
                  lobbyAccountByPuuid={lobbyAccountByPuuid}
                />
              );
            })}
          </div>
        </section>
      ))}

      <div
        ref={sentinelRef}
        className="flex items-center justify-center py-3 text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/40"
      >
        {loadingMore ? (
          <span className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading more
          </span>
        ) : hasMore ? (
          <span className="flex items-center gap-1.5">
            <ChevronDown className="w-3.5 h-3.5" />
            Scroll for more
          </span>
        ) : items.length > 0 ? (
          <span className="text-flash/30">— end of feed —</span>
        ) : null}
      </div>
    </div>
  );
}

/* ─── TRENDING TAB — comprehensive lobby stats dashboard ───────────── */
type TrendingPayload = {
  sinceIso: string;
  lobbySummary: {
    games: number;
    wins: number;
    kills: number;
    deaths: number;
    assists: number;
    damage: number;
    gold: number;
    vision: number;
    durationSec: number;
    avgGameDurationSec: number;
    activeDays: number;
    sinceIso: string;
  };
  daily: Array<{ date: string; games: number; wins: number; avgKda: number }>;
  hourlyHeatmap: number[][];
  durationHistogram: Array<{ label: string; count: number }>;
  kdaHistogram: Array<{ label: string; count: number }>;
  queueBreakdown: {
    solo: number;
    soloWins: number;
    flex: number;
    flexWins: number;
    other: number;
  };
  roleDistribution: Array<{
    role: string;
    games: number;
    wins: number;
    winrate: number;
  }>;
  topChampions: Array<{
    champion: string;
    games: number;
    wins: number;
    winrate: number;
    avgKda: number;
  }>;
  streaks: { longestWinStreak: number; longestLossStreak: number };
  perPlayer: Array<{
    playerId: string;
    displayName: string;
    color: string | null;
    games: number;
    wins: number;
    losses: number;
    winrate: number;
    avgKills: number;
    avgDeaths: number;
    avgAssists: number;
    avgKda: number;
    avgDamage: number;
    avgGoldPerMin: number;
    avgVision: number;
    uniqueChampions: number;
  }>;
};

function TrendingTab({
  slug,
  refreshTick,
}: {
  slug: string;
  refreshTick: number;
}) {
  const [data, setData] = useState<TrendingPayload | null>(null);
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
    return (
      <div className={cn(glassDark, "p-12 flex items-center justify-center")}>
        <Loader2 className="w-5 h-5 animate-spin text-jade" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Lobby summary bar */}
      <LobbySummaryStrip summary={data.lobbySummary} streaks={data.streaks} />

      {/* Row 1: activity line chart full width */}
      <ChartCard title="Activity Trend" subtitle="Games per day + winrate line">
        <ActivityChart daily={data.daily} />
      </ChartCard>

      {/* Row 2: 2-col — duration histogram + KDA histogram */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Game Duration" subtitle="Distribution of game lengths">
          <HistogramChart
            data={data.durationHistogram}
            accent="#5fa8ff"
          />
        </ChartCard>
        <ChartCard title="KDA Distribution" subtitle="How often each KDA bracket happens">
          <HistogramChart data={data.kdaHistogram} accent={JADE} />
        </ChartCard>
      </div>

      {/* Row 3: 2-col — heatmap + role distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <ChartCard title="Time-of-Day Heatmap" subtitle="When the lobby plays (local time)">
          <HourlyHeatmap matrix={data.hourlyHeatmap} />
        </ChartCard>
        <ChartCard title="Role Distribution" subtitle="Games played by lane">
          <RoleBars roles={data.roleDistribution} />
        </ChartCard>
      </div>

      {/* Row 4: 3-col — queue donut + streaks + top champion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Queue Mix" subtitle="Solo / Flex / Other">
          <QueueDonut queue={data.queueBreakdown} />
        </ChartCard>
        <ChartCard title="Streaks" subtitle="Longest unbroken runs">
          <StreaksBox streaks={data.streaks} />
        </ChartCard>
        <ChartCard title="Most-Played Champion" subtitle="Across the whole lobby">
          <TopChampionBox top={data.topChampions[0] ?? null} />
        </ChartCard>
      </div>

      {/* Row 5: Per-player radar comparison */}
      <ChartCard title="Per-Player Profile" subtitle="Avg KDA · DMG · Gold/min · Vision · Champion variety">
        <PlayerRadarGrid players={data.perPlayer} />
      </ChartCard>

      {/* Row 6: Top champions list */}
      <ChartCard title="Top 20 Champions" subtitle="Sorted by games played">
        <TopChampionsList list={data.topChampions} />
      </ChartCard>
    </div>
  );
}

/* ─── trending helper cards/charts ─────────────────────────────────── */

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(glassDark, "p-5")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1]">
        <div className="flex items-center gap-3 mb-4">
          <span style={{ color: JADE, fontSize: "12px" }}>◈</span>
          <span className="text-[12px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium">
            {title}
          </span>
          {subtitle && (
            <span className="text-[10px] font-jetbrains tracking-[0.15em] text-flash/35 normal-case">
              {subtitle}
            </span>
          )}
          <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" />
        </div>
        {children}
      </div>
    </div>
  );
}

function LobbySummaryStrip({
  summary,
  streaks,
}: {
  summary: TrendingPayload["lobbySummary"];
  streaks: TrendingPayload["streaks"];
}) {
  const winrate =
    summary.games > 0 ? Math.round((summary.wins / summary.games) * 100) : 0;
  const avgKda =
    summary.deaths === 0
      ? Math.min(99, summary.kills + summary.assists)
      : (summary.kills + summary.assists) / summary.deaths;
  const since = new Date(summary.sinceIso);
  const daysAgo = Math.floor(
    (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24)
  );
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

  return (
    <div className={cn(glassDark, "p-3")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1] grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col items-center text-center">
            <span
              className="text-[20px] font-chakrapetch font-bold tabular-nums leading-none"
              style={{ color: t.accent }}
            >
              {t.value}
            </span>
            <span className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mt-1">
              {t.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── activity chart (line + bars) ─────────────────────────────────── */
function ActivityChart({ daily }: { daily: TrendingPayload["daily"] }) {
  if (daily.length === 0) {
    return <Empty label="No data" />;
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
      if (d.games === 0) return null;
      const x = padL + i * colW + colW / 2;
      const winrate = d.games > 0 ? (d.wins / d.games) * 100 : 0;
      const y = padT + (1 - winrate / 100) * innerH;
      return { x, y };
    })
    .filter(Boolean) as Array<{ x: number; y: number }>;
  const linePath = wrPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
        {/* horizontal grid */}
        {[0, 50, 100].map((p) => {
          const y = padT + (1 - p / 100) * innerH;
          return (
            <g key={p}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke="rgba(215,216,217,0.06)" strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end" className="fill-flash/30 text-[9px] font-jetbrains">{p}%</text>
            </g>
          );
        })}
        <line x1={padL} x2={padL + innerW} y1={padT + 0.5 * innerH} y2={padT + 0.5 * innerH} stroke="rgba(0,217,146,0.18)" strokeDasharray="3 3" />

        {/* bars */}
        {slice.map((d, i) => {
          const x = padL + i * colW + colW * 0.18;
          const barW = colW * 0.64;
          const h = (d.games / maxGames) * innerH;
          const y = padT + innerH - h;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill="rgba(0,217,146,0.10)" stroke="rgba(0,217,146,0.30)" strokeWidth={0.8} rx={1} />
              {d.games > 0 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" className="fill-jade/70 text-[8px] font-chakrapetch font-bold tabular-nums">{d.games}</text>
              )}
            </g>
          );
        })}

        {/* winrate line */}
        {wrPoints.length > 1 && <path d={linePath} stroke={JADE} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
        {wrPoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={JADE} stroke="#040A0C" strokeWidth={1} />)}

        {/* x labels (every 3rd) */}
        {slice.map((d, i) => {
          if (i % 3 !== 0 && i !== slice.length - 1) return null;
          const x = padL + i * colW + colW / 2;
          const lbl = d.date.slice(5); // MM-DD
          return <text key={i} x={x} y={height - 10} textAnchor="middle" className="fill-flash/35 text-[8px] font-jetbrains">{lbl}</text>;
        })}
      </svg>
    </div>
  );
}

/* ─── generic vertical histogram ───────────────────────────────────── */
function HistogramChart({
  data,
  accent,
}: {
  data: Array<{ label: string; count: number }>;
  accent: string;
}) {
  if (data.length === 0 || data.every((d) => d.count === 0)) {
    return <Empty label="No data" />;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end justify-around gap-2 h-44 px-2">
      {data.map((d) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-chakrapetch font-bold tabular-nums" style={{ color: accent }}>{d.count || ""}</span>
            <div className="w-full bg-black/30 rounded-[3px] relative overflow-hidden" style={{ height: `${pct}%`, minHeight: d.count > 0 ? 6 : 1, border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)` }}>
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, color-mix(in srgb, ${accent} 40%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`, boxShadow: `inset 0 -8px 12px color-mix(in srgb, ${accent} 25%, transparent)` }} />
            </div>
            <span className="text-[9px] font-jetbrains tracking-[0.1em] text-flash/45 truncate w-full text-center">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── hourly heatmap (7×24 grid) ───────────────────────────────────── */
function HourlyHeatmap({ matrix }: { matrix: number[][] }) {
  const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  // Project the matrix down to two independent dimensions so we can render
  // them as two compact bar rows that fill the available width — no
  // horizontal scroll, every hour and weekday still visible.
  const byHour = Array.from({ length: 24 }, (_, h) =>
    matrix.reduce((s, row) => s + (row[h] ?? 0), 0)
  );
  const byDay = matrix.map((row) => row.reduce((s, v) => s + v, 0));

  const maxH = Math.max(1, ...byHour);
  const maxD = Math.max(1, ...byDay);
  const totalGames = byHour.reduce((s, v) => s + v, 0);

  if (totalGames === 0) {
    return (
      <div className="py-6 text-center text-flash/30 text-[11px] font-jetbrains tracking-[0.2em] uppercase">
        No activity yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* HOURS — 24 thin bars with height proportional to intensity */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/40">
            By hour
          </span>
          <span className="text-[8.5px] font-jetbrains tracking-wider text-flash/25 tabular-nums">
            peak {String(byHour.indexOf(maxH)).padStart(2, "0")}:00
          </span>
        </div>
        <div
          className="grid items-end h-12 gap-[2px]"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {byHour.map((v, h) => {
            const intensity = v / maxH;
            return (
              <div
                key={h}
                title={`${String(h).padStart(2, "0")}:00 — ${v} games`}
                className="rounded-[2px] transition-colors"
                style={{
                  height: `${Math.max(6, intensity * 100)}%`,
                  background:
                    v === 0
                      ? "rgba(215,216,217,0.05)"
                      : `rgba(0,217,146,${0.18 + intensity * 0.62})`,
                  boxShadow:
                    intensity > 0.55
                      ? `0 0 6px rgba(0,217,146,${0.35 * intensity})`
                      : undefined,
                }}
              />
            );
          })}
        </div>
        {/* Hour tick labels — every 3 hours */}
        <div
          className="grid mt-1 text-[7.5px] font-jetbrains tracking-wider text-flash/30 tabular-nums"
          style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
        >
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
        </div>
      </div>

      {/* WEEKDAY — 7 fatter bars */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/40">
            By weekday
          </span>
          <span className="text-[8.5px] font-jetbrains tracking-wider text-flash/25">
            peak {DAYS[byDay.indexOf(maxD)]}
          </span>
        </div>
        <div
          className="grid items-end h-10 gap-1"
          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {byDay.map((v, d) => {
            const intensity = v / maxD;
            return (
              <div
                key={d}
                title={`${DAYS[d]} — ${v} games`}
                className="rounded-[3px] transition-colors"
                style={{
                  height: `${Math.max(8, intensity * 100)}%`,
                  background:
                    v === 0
                      ? "rgba(215,216,217,0.05)"
                      : `rgba(0,217,146,${0.18 + intensity * 0.62})`,
                  boxShadow:
                    intensity > 0.55
                      ? `0 0 6px rgba(0,217,146,${0.35 * intensity})`
                      : undefined,
                }}
              />
            );
          })}
        </div>
        <div
          className="grid mt-1 text-[8px] font-jetbrains tracking-[0.15em] text-flash/40"
          style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
        >
          {DAYS.map((d) => (
            <span key={d} className="text-center">
              {d.slice(0, 3)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── role distribution (horizontal bars) ──────────────────────────── */
function RoleBars({ roles }: { roles: TrendingPayload["roleDistribution"] }) {
  if (roles.length === 0) return <Empty label="No role data" />;
  const max = Math.max(1, ...roles.map((r) => r.games));
  const COLORS: Record<string, string> = {
    TOP: "#ef4444",
    JNG: "#10b981",
    MID: "#5fa8ff",
    ADC: "#FFB615",
    SUP: "#c084fc",
    UNKNOWN: "#7d6b5d",
  };
  return (
    <ul className="flex flex-col gap-2.5">
      {roles.map((r) => {
        const color = COLORS[r.role] ?? "#7d6b5d";
        const pct = (r.games / max) * 100;
        return (
          <li key={r.role} className="flex items-center gap-3">
            <span className="w-10 text-[11px] font-jetbrains tracking-[0.15em] uppercase font-medium" style={{ color }}>{r.role}</span>
            <div className="flex-1 h-5 bg-black/30 rounded-[3px] overflow-hidden relative">
              <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(to right, color-mix(in srgb, ${color} 25%, transparent), color-mix(in srgb, ${color} 55%, transparent))`, boxShadow: `inset 0 0 8px color-mix(in srgb, ${color} 20%, transparent)` }} />
              <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-jetbrains tabular-nums text-flash/70">{r.games}g · {r.winrate}%</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ─── queue donut (svg) ────────────────────────────────────────────── */
function QueueDonut({ queue }: { queue: TrendingPayload["queueBreakdown"] }) {
  const total = queue.solo + queue.flex + queue.other;
  if (total === 0) return <Empty label="No data" />;

  const segments = [
    { label: "Solo/Duo", value: queue.solo, color: JADE, wins: queue.soloWins },
    { label: "Flex", value: queue.flex, color: "#5fa8ff", wins: queue.flexWins },
    { label: "Other", value: queue.other, color: "#7d6b5d", wins: 0 },
  ].filter((s) => s.value > 0);

  const R = 55;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="-80 -80 160 160" className="w-40 h-40 shrink-0">
        {segments.map((s) => {
          const dash = (s.value / total) * C;
          const offset = (acc / total) * C;
          acc += s.value;
          const wr =
            s.value > 0 && s.wins > 0
              ? Math.round((s.wins / s.value) * 100)
              : null;
          const pct = Math.round((s.value / total) * 100);
          return (
            <TooltipProvider key={s.label} delayDuration={120}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <circle
                    r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={18}
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90)"
                    style={{
                      filter: `drop-shadow(0 0 6px ${s.color}50)`,
                      cursor: "default",
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="text-xs font-jetbrains tracking-wider"
                >
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-[10px] uppercase tracking-[0.18em] font-bold"
                      style={{ color: s.color }}
                    >
                      {s.label}
                    </span>
                    <span className="text-flash/85">
                      {s.value} {s.value === 1 ? "game" : "games"}
                      <span className="text-flash/35"> · </span>
                      {pct}%
                      {wr != null && (
                        <>
                          <span className="text-flash/35"> · </span>
                          <span
                            className={
                              wr >= 55
                                ? "text-jade"
                                : wr >= 48
                                  ? "text-flash/80"
                                  : "text-red-400/80"
                            }
                          >
                            {wr}% WR
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        <text x={0} y={-4} textAnchor="middle" className="fill-flash text-[22px] font-chakrapetch font-bold tabular-nums">{total}</text>
        <text x={0} y={14} textAnchor="middle" className="fill-flash/40 text-[8px] font-jetbrains tracking-[0.2em] uppercase">Total Games</text>
      </svg>
      <ul className="flex flex-col gap-2 min-w-0 flex-1">
        {segments.map((s) => {
          const pct = Math.round((s.value / total) * 100);
          const wr = s.value > 0 && s.wins > 0 ? Math.round((s.wins / s.value) * 100) : 0;
          return (
            <li key={s.label} className="flex items-center gap-2 text-[11px] font-jetbrains">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
              <span className="text-flash/70 truncate flex-1">{s.label}</span>
              <span className="text-flash/55 tabular-nums">{s.value}</span>
              <span className="text-flash/30 tabular-nums">·</span>
              <span className="text-flash/55 tabular-nums">{pct}%</span>
              {s.wins > 0 && <span className="text-jade/70 tabular-nums">{wr}%WR</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StreaksBox({ streaks }: { streaks: TrendingPayload["streaks"] }) {
  return (
    <div className="flex items-center justify-around h-40">
      <div className="flex flex-col items-center">
        <span className="text-[48px] font-chakrapetch font-bold text-jade tabular-nums leading-none" style={{ textShadow: "0 0 22px rgba(0,217,146,0.45)" }}>{streaks.longestWinStreak}</span>
        <span className="text-[10px] font-jetbrains tracking-[0.2em] uppercase text-jade/55 mt-2">Longest W</span>
      </div>
      <div className="w-[1px] h-20 bg-flash/10" />
      <div className="flex flex-col items-center">
        <span className="text-[48px] font-chakrapetch font-bold text-red-400 tabular-nums leading-none" style={{ textShadow: "0 0 22px rgba(239,68,68,0.4)" }}>{streaks.longestLossStreak}</span>
        <span className="text-[10px] font-jetbrains tracking-[0.2em] uppercase text-red-400/55 mt-2">Longest L</span>
      </div>
    </div>
  );
}

function TopChampionBox({ top }: { top: TrendingPayload["topChampions"][number] | null }) {
  if (!top) return <Empty label="No champion data" />;
  return (
    <div className="flex items-center gap-4 h-40 justify-center">
      <img
        src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(top.champion)}.png`}
        alt={top.champion}
        className="w-20 h-20 rounded-md"
        style={{ boxShadow: "0 0 24px rgba(0,217,146,0.25)", border: "1.5px solid rgba(0,217,146,0.35)" }}
      />
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-geist font-medium text-flash leading-none">{top.champion}</span>
        <span className="text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/50">{top.games} games · {top.wins}W</span>
        <span className="text-[14px] font-chakrapetch font-bold tabular-nums">
          <span className={top.winrate >= 55 ? "text-jade" : top.winrate >= 48 ? "text-flash/85" : "text-red-400/70"}>{top.winrate}%</span>
          <span className="text-flash/30"> · </span>
          <span className="text-jade/70">{top.avgKda.toFixed(2)} KDA</span>
        </span>
      </div>
    </div>
  );
}

/* ─── per-player radar grid (one mini radar per player) ────────────── */
function PlayerRadarGrid({ players }: { players: TrendingPayload["perPlayer"] }) {
  if (players.length === 0) return <Empty label="No player data" />;

  // Normalize per-axis across the lobby so radars are comparable.
  const maxKda = Math.max(0.01, ...players.map((p) => p.avgKda));
  const maxDamage = Math.max(0.01, ...players.map((p) => p.avgDamage));
  const maxGoldPerMin = Math.max(0.01, ...players.map((p) => p.avgGoldPerMin));
  const maxVision = Math.max(0.01, ...players.map((p) => p.avgVision));
  const maxChamps = Math.max(0.01, ...players.map((p) => p.uniqueChampions));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {players
        .filter((p) => p.games > 0)
        .map((p) => (
          <PlayerRadar
            key={p.playerId}
            player={p}
            normFactors={{ maxKda, maxDamage, maxGoldPerMin, maxVision, maxChamps }}
          />
        ))}
    </div>
  );
}

function PlayerRadar({
  player,
  normFactors,
}: {
  player: TrendingPayload["perPlayer"][number];
  normFactors: {
    maxKda: number;
    maxDamage: number;
    maxGoldPerMin: number;
    maxVision: number;
    maxChamps: number;
  };
}) {
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

  const angle = (i: number) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const pt = (i: number, r: number) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
  };

  const valuePoints = axes.map((ax, i) => pt(i, Math.max(0.05, ax.value) * R));
  const polyPath = valuePoints
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ") + " Z";

  return (
    <div className="bg-black/25 border border-flash/10 rounded-[3px] p-3 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
        <span className="text-[12px] font-geist font-medium text-flash">{player.displayName}</span>
        <span className="text-[10px] font-jetbrains tracking-[0.12em] text-flash/35 ml-auto">{player.games}g · {player.winrate}%</span>
      </div>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0">
          {[0.25, 0.5, 0.75, 1].map((s) => (
            <polygon
              key={s}
              points={Array.from({ length: N }, (_, i) => pt(i, R * s).join(",")).join(" ")}
              fill="none"
              stroke="rgba(215,216,217,0.06)"
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: N }, (_, i) => {
            const [x, y] = pt(i, R);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(215,216,217,0.05)" strokeWidth={0.5} />;
          })}
          <path d={polyPath} fill={accent} fillOpacity={0.15} stroke={accent} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 6px ${accent})` }} />
          {valuePoints.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2} fill={accent} />
          ))}
          {axes.map((ax, i) => {
            const [x, y] = pt(i, R + 10);
            return (
              <text key={ax.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-flash/40 text-[7px] font-jetbrains tracking-wider">{ax.label}</text>
            );
          })}
        </svg>
        <div className="flex flex-col gap-1 text-[10px] font-jetbrains tabular-nums text-flash/55 min-w-0">
          <div><span className="text-jade/70">KDA</span> {player.avgKda.toFixed(2)}</div>
          <div><span className="text-flash/55">K/D/A</span> {player.avgKills.toFixed(1)}/{player.avgDeaths.toFixed(1)}/{player.avgAssists.toFixed(1)}</div>
          <div><span className="text-[#5fa8ff]/70">DMG</span> {Math.round(player.avgDamage / 1000)}k</div>
          <div><span className="text-[#FFB615]/70">G/M</span> {Math.round(player.avgGoldPerMin)}</div>
          <div><span className="text-[#c084fc]/70">VIS</span> {player.avgVision.toFixed(1)}</div>
          <div><span className="text-flash/55">Champs</span> {player.uniqueChampions}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── top champions list (compact rows) ────────────────────────────── */
function TopChampionsList({ list }: { list: TrendingPayload["topChampions"] }) {
  if (list.length === 0) return <Empty label="No champion data" />;
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {list.map((c, i) => (
        <li key={c.champion} className="flex items-center gap-3 bg-black/25 border border-flash/10 rounded-[3px] px-3 py-2">
          <span className="text-[10px] font-jetbrains tracking-[0.15em] text-flash/30 w-5">{String(i + 1).padStart(2, "0")}</span>
          <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(c.champion)}.png`} alt={c.champion} className="w-8 h-8 rounded-md" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[12px] font-geist font-medium text-flash truncate">{c.champion}</span>
            <span className="text-[10px] font-jetbrains tracking-[0.12em] text-flash/40">{c.games} games</span>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn("text-[13px] font-chakrapetch font-bold tabular-nums leading-none", c.winrate >= 55 ? "text-jade" : c.winrate >= 48 ? "text-flash/85" : "text-red-400/70")}>{c.winrate}%</span>
            <span className="text-[9px] font-jetbrains tracking-[0.15em] uppercase text-jade/55 mt-0.5">{c.avgKda.toFixed(2)} KDA</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30">
      {label}
    </div>
  );
}

/* ─── stats tab content (just the trend chart now) ─────────────────── */
/* ─── leaderboard tab — rankings-page style ─────────────────────────── */
const LADDER_TIER_INDEX: Record<string, number> = {
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
const DIVISION_INDEX: Record<string, number> = { IV: 1, III: 2, II: 3, I: 4 };

function ladderScoreFE(rank: CurrentRank | null): number {
  if (!rank) return -1;                                  // unranked sinks
  const t = LADDER_TIER_INDEX[rank.tier.toUpperCase()] ?? 0;
  const d = rank.rankDivision
    ? DIVISION_INDEX[rank.rankDivision.toUpperCase()] ?? 0
    : 0;
  return t * 1000 + d * 100 + rank.lp;
}

/* ─── live tab ─────────────────────────────────────────────────────────
 * Polls /api/scout/live/:slug every 30s, renders a card per lobby
 * player currently in game. Card shows the champion they picked, the
 * queue + game length (auto-ticks every second), and the team rosters
 * with lobby-mate dots highlighted.
 */

type LiveParticipantSlimFE = {
  puuid: string;
  championId: number;
  summonerName: string | null;
  teamId: number;
  isLobbyMember: boolean;
  lobbyPlayerId: string | null;
  spell1Id: number;
  spell2Id: number;
  keystoneId: number | null;
  primaryStyleId: number | null;
  subStyleId: number | null;
};
type LiveSessionFE = {
  playerId: string;
  displayName: string;
  color: string | null;
  iconId: number | null;
  accountPuuid: string;
  region: string;
  riotName: string;
  riotTag: string;
  gameId: number;
  gameQueueConfigId: number;
  gameMode: string;
  gameType: string;
  gameStartTime: number;
  gameLength: number;
  mapId: number;
  championId: number;
  participants: LiveParticipantSlimFE[];
  bansBlue: number[];
  bansRed: number[];
};

const LIVE_QUEUE_LABELS: Record<number, string> = {
  400: "NORMAL DRAFT",
  420: "RANKED SOLO/DUO",
  430: "NORMAL BLIND",
  440: "RANKED FLEX",
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

function LiveTab({ slug }: { slug: string }) {
  const [sessions, setSessions] = useState<LiveSessionFE[]>([]);
  const [polledAt, setPolledAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [championIdToName, setChampionIdToName] = useState<
    Record<string, string>
  >({});

  // ddragon champion key → id map (e.g. "266" → "Aatrox")
  useEffect(() => {
    let cancelled = false;
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const c of Object.values<any>(data?.data ?? {})) map[c.key] = c.id;
        setChampionIdToName(map);
      })
      .catch(() => {});
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
        if (cancelled) return;
        if (!res.ok) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        setSessions(data.sessions ?? []);
        setPolledAt(data.polledAt ?? Date.now());
        setError(null);
      } catch (e) {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
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
    return (
      <div className={cn(glassDark, "p-10 text-center")}>
        <GlowBackdrop subtle />
        <div className="relative z-10 flex items-center justify-center gap-3 text-flash/40 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-jade" />
          Probing Spectator API…
        </div>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className={cn(glassDark, "p-10 text-center")}>
        <GlowBackdrop subtle />
        <div className="relative z-10 text-red-400/70 text-sm font-mono">
          {error}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className={cn(glassDark, "p-12 text-center")}>
        <GlowBackdrop subtle />
        <div className="relative z-10 flex flex-col items-center gap-3 text-flash/40">
          <div className="relative">
            <span
              className="absolute inset-0 rounded-full bg-jade/20 animate-ping"
              style={{ animationDuration: "2.4s" }}
            />
            <span className="relative inline-flex w-3 h-3 rounded-full bg-jade/60" />
          </div>
          <p className="text-[13px] font-jetbrains tracking-[0.18em] uppercase text-flash/50">
            No one is in game right now
          </p>
          <p className="text-[10px] font-jetbrains tracking-wider text-flash/30">
            We poll every 30 seconds — refresh manually anytime
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header strip */}
      <div className="flex items-center gap-3 px-1">
        <span className="relative inline-flex">
          <span
            className="absolute inset-0 rounded-full bg-jade/45 animate-ping"
            style={{ animationDuration: "1.8s" }}
          />
          <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-jade" />
        </span>
        <h2 className="text-[12px] font-jetbrains tracking-[0.3em] uppercase text-jade font-bold">
          Live now
        </h2>
        <span className="text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/40">
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </span>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-jade/30 via-flash/10 to-transparent" />
        {polledAt > 0 && (
          <span className="text-[9px] font-jetbrains tracking-wider text-flash/30 tabular-nums">
            POLLED {Math.max(0, Math.floor((now - polledAt) / 1000))}s AGO
          </span>
        )}
      </div>

      {sessions.map((s) => (
        <LiveSessionCard
          key={`${s.gameId}:${s.playerId}`}
          session={s}
          championIdToName={championIdToName}
          now={now}
        />
      ))}
    </div>
  );
}

function LiveSessionCard({
  session: s,
  championIdToName,
  now,
}: {
  session: LiveSessionFE;
  championIdToName: Record<string, string>;
  now: number;
}) {
  const champName =
    championIdToName[String(s.championId)] ?? String(s.championId);
  const champIcon = `${cdnBaseUrl()}/img/champion/${normalizeChampName(champName)}.png`;
  const splash = cdnSplashUrl(normalizeChampName(champName));
  const queueLabel =
    LIVE_QUEUE_LABELS[s.gameQueueConfigId] ?? `QUEUE ${s.gameQueueConfigId}`;

  // gameStartTime is 0 until loading screen ends. While 0, fall back to
  // the snapshot gameLength.
  const elapsedSec =
    s.gameStartTime > 0
      ? Math.max(0, Math.floor((now - s.gameStartTime) / 1000))
      : s.gameLength;
  const mins = Math.floor(elapsedSec / 60);
  const secs = (elapsedSec % 60).toString().padStart(2, "0");

  const blue = s.participants.filter((p) => p.teamId === 100);
  const red = s.participants.filter((p) => p.teamId === 200);

  const summonerHref = `/summoners/${s.region.toLowerCase()}/${encodeURIComponent(
    s.riotName
  )}-${encodeURIComponent(s.riotTag)}`;
  const liveGameHref = `${summonerHref}/livegame`;

  const accent = s.color || JADE;

  return (
    <div className="relative overflow-hidden rounded-md bg-black/30 backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.06)]">
      {/* Splash background, very subdued */}
      <div className="absolute inset-0 z-0">
        <img
          src={splash}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          style={{ objectPosition: "center 35%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-liquirice/95 via-liquirice/80 to-liquirice/65" />
      </div>

      {/* Left jade accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-[1]"
        style={{
          background: `color-mix(in srgb, ${accent} 75%, transparent)`,
          boxShadow: `0 0 10px color-mix(in srgb, ${accent} 40%, transparent)`,
        }}
      />

      <div className="relative z-[2] p-3 flex items-stretch gap-3">
        {/* Champion portrait + lobby player avatar */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="relative w-[52px] h-[52px]">
            <img
              src={champIcon}
              alt={champName}
              className="w-[52px] h-[52px] rounded-md shadow-[0_3px_10px_rgba(0,0,0,0.5)] ring-1 ring-jade/25"
            />
            {/* tiny lobby player avatar over the champ icon */}
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden ring-2 ring-liquirice bg-black"
              style={{ boxShadow: `0 0 6px color-mix(in srgb, ${accent} 50%, transparent)` }}
            >
              {profileIconUrl(s.iconId) ? (
                <img
                  src={profileIconUrl(s.iconId)!}
                  alt=""
                  className="w-full h-full"
                />
              ) : (
                <span
                  className="w-full h-full flex items-center justify-center text-[10px] font-jetbrains font-bold"
                  style={{ color: accent, background: "rgba(0,0,0,0.6)" }}
                >
                  {s.displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <span
            className="text-[9.5px] font-jetbrains tracking-[0.18em] uppercase font-bold leading-none"
            style={{ color: accent }}
          >
            {s.displayName}
          </span>
        </div>

        {/* Middle: queue + champion name + elapsed timer */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative inline-flex">
                <span
                  className="absolute inset-0 rounded-full bg-jade/40 animate-ping"
                  style={{ animationDuration: "1.5s" }}
                />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-jade" />
              </span>
              <span className="text-[10px] font-jetbrains tracking-[0.25em] uppercase text-jade/85 font-bold">
                LIVE
              </span>
            </span>
            <span className="text-flash/15 text-[10px]">·</span>
            <span className="text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/55">
              {queueLabel}
            </span>
            <span className="text-flash/15 text-[10px]">·</span>
            <span className="text-[10px] font-chakrapetch font-medium text-flash/55 tabular-nums tracking-wider">
              {mins}:{secs}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-0.5">
            <Link
              to={summonerHref}
              className="text-[16px] font-chakrapetch font-bold text-flash hover:text-jade transition-colors tracking-tight truncate cursor-clicker leading-tight"
            >
              {s.riotName}
              <span className="text-flash/35 text-[12px] font-medium ml-0.5">
                #{s.riotTag}
              </span>
            </Link>
            <span className="text-flash/35 text-[11px]">on</span>
            <span className="text-[14px] font-chakrapetch font-bold text-jade/85 truncate leading-tight">
              {champName}
            </span>
          </div>

          {/* Teams scoreboard — uses full remaining width now */}
          <div className="mt-1.5 grid grid-cols-2 gap-x-5 text-[10.5px] font-jetbrains">
            <TeamRoster
              participants={blue}
              accent="#5fa8ff"
              teamLabel="BLUE"
              championIdToName={championIdToName}
              activePuuid={s.accountPuuid}
              align="left"
            />
            <TeamRoster
              participants={red}
              accent="#ef4444"
              teamLabel="RED"
              championIdToName={championIdToName}
              activePuuid={s.accountPuuid}
              align="right"
            />
          </div>

          {/* Bans row — blue left, red flushed right edge */}
          <div className="mt-2 flex items-center gap-4">
            <BansStrip
              bans={s.bansBlue}
              accent="#5fa8ff"
              championIdToName={championIdToName}
              align="left"
            />
            <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/12 via-flash/20 to-flash/12" />
            <BansStrip
              bans={s.bansRed}
              accent="#ef4444"
              championIdToName={championIdToName}
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Spectate button — pinned top-right of the card */}
      <Link
        to={liveGameHref}
        className="absolute top-3 right-3 z-[3] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-jade/35 bg-jade/[0.10] text-jade hover:bg-jade/[0.20] hover:shadow-[0_0_12px_rgba(0,217,146,0.25)] text-[10px] font-jetbrains tracking-[0.22em] uppercase font-bold cursor-clicker transition-all"
      >
        <Eye className="w-3 h-3" />
        Spectate
        <span className="text-jade/45 text-[8.5px] ml-1">{s.region}</span>
      </Link>
    </div>
  );
}

function TeamRoster({
  participants,
  accent,
  teamLabel,
  championIdToName,
  activePuuid,
  align,
}: {
  participants: LiveParticipantSlimFE[];
  accent: string;
  teamLabel: string;
  championIdToName: Record<string, string>;
  activePuuid: string;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex flex-col", align === "right" && "items-end")}>
      <div
        className="mb-0.5 text-[8px] font-jetbrains tracking-[0.28em] uppercase font-bold"
        style={{ color: accent }}
      >
        {teamLabel}
      </div>
      <ul
        className={cn("space-y-[2px] text-[10px]", align === "right" && "text-right")}
      >
        {participants.map((p) => {
          const champName =
            championIdToName[String(p.championId)] ?? String(p.championId);
          const isActive = p.puuid === activePuuid;
          const isMate = p.isLobbyMember && !isActive;
          const nameClass = isActive
            ? "text-jade font-bold drop-shadow-[0_0_6px_rgba(0,217,146,0.4)]"
            : isMate
              ? "text-jade/80"
              : "text-flash/70";
          const keystoneSrc = p.keystoneId
            ? getKeystoneIcon(p.keystoneId)
            : null;
          return (
            <li
              key={p.puuid}
              className={cn(
                "flex items-center gap-1",
                align === "right" && "flex-row-reverse"
              )}
            >
              {/* Champion icon */}
              <img
                src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(champName)}.png`}
                alt={champName}
                title={champName}
                className="w-[15px] h-[15px] rounded-[2px] shrink-0"
                style={{
                  border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                }}
              />
              {/* Summoner spells stacked */}
              <div className="grid grid-rows-2 gap-[1px] shrink-0">
                <img
                  src={summonerSpellUrl(p.spell1Id)}
                  alt=""
                  className="w-[7px] h-[7px] rounded-[1.5px]"
                />
                <img
                  src={summonerSpellUrl(p.spell2Id)}
                  alt=""
                  className="w-[7px] h-[7px] rounded-[1.5px]"
                />
              </div>
              {/* Keystone */}
              {keystoneSrc && (
                <img
                  src={keystoneSrc}
                  alt=""
                  className="w-[12px] h-[12px] rounded-full bg-black/50 shrink-0"
                />
              )}
              {(isMate || isActive) && (
                <span
                  aria-hidden
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{
                    background: isActive ? JADE : "rgba(0,217,146,0.7)",
                    boxShadow: isActive
                      ? "0 0 5px rgba(0,217,146,0.8)"
                      : undefined,
                  }}
                />
              )}
              <span className={cn("truncate min-w-0", nameClass)}>
                {p.summonerName ?? "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── bans strip ─── */
function BansStrip({
  bans,
  accent,
  championIdToName,
  align,
}: {
  bans: number[];
  accent: string;
  championIdToName: Record<string, string>;
  align: "left" | "right";
}) {
  if (bans.length === 0) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 shrink-0",
        align === "right" && "flex-row-reverse"
      )}
    >
      <span
        className="text-[8px] font-jetbrains tracking-[0.25em] uppercase font-bold opacity-70"
        style={{ color: accent }}
      >
        BANS
      </span>
      <div className={cn("flex gap-[3px]", align === "right" && "flex-row-reverse")}>
        {bans.map((id, i) => {
          const champName = championIdToName[String(id)] ?? String(id);
          return (
            <div
              key={`${id}-${i}`}
              className="relative w-5 h-5 rounded-[2px] overflow-hidden grayscale opacity-75 hover:opacity-100 hover:grayscale-0 transition-all"
              title={`Banned: ${champName}`}
              style={{
                border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
              }}
            >
              <img
                src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(champName)}.png`}
                alt={champName}
                className="w-full h-full"
              />
              {/* Red diagonal slash */}
              <span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom right, transparent 47%, rgba(239,68,68,0.75) 49%, rgba(239,68,68,0.75) 51%, transparent 53%)",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeaderboardTab({
  slug,
  refreshTick,
}: {
  slug: string;
  refreshTick: number;
}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardAccount[]>([]);
  const [champions, setChampions] = useState<ChampionsPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyToName, setKeyToName] = useState<Record<string, string>>({});

  // Champion id → name lookup (matches rankings page)
  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        for (const c of Object.values<any>(data?.data ?? {})) map[c.key] = c.id;
        setKeyToName(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      // No window param → backend uses lobby creation cutoff.
      fetch(`${API_BASE_URL}/api/scout/leaderboard/${slug}`).then((r) =>
        r.ok ? r.json() : null
      ),
      // Champions still uses window=all for the top picks display.
      fetch(`${API_BASE_URL}/api/scout/champions/${slug}?window=all`).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([lb, ch]) => {
        if (cancelled) return;
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
    const map = new Map<string, ChampionLine[]>();
    for (const p of champions) map.set(p.playerId, p.champions);
    return map;
  }, [champions]);

  const sorted = useMemo(() => {
    return [...leaderboard].sort(
      (a, b) => ladderScoreFE(b.currentRank) - ladderScoreFE(a.currentRank)
    );
  }, [leaderboard]);

  return (
    <div className="flex flex-col gap-5">
      {/* Leaderboard table */}
      <div className={cn(glassDark)}>
        <GlowBackdrop subtle />
        <div className="relative z-[1]">
          {/* Header */}
          <div className="grid grid-cols-[40px_44px_36px_1fr_140px_90px_120px_120px_56px] items-center px-4 py-2.5 text-[8px] font-jetbrains text-flash/25 tracking-[0.22em] uppercase border-b border-flash/[0.05]">
            <span className="text-center">#</span>
            <span />
            <span />
            <span>Player</span>
            <span className="text-center">Rank</span>
            <span className="text-center">Balance</span>
            <span className="text-center">Record</span>
            <span className="text-center">Top Champs</span>
            <span className="text-right">WR</span>
          </div>

          {/* Rows */}
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[40px_44px_36px_1fr_140px_90px_120px_120px_56px] items-center px-4 py-3 border-b border-flash/[0.03]"
              >
                <Skeleton className="w-5 h-3.5 bg-flash/5 mx-auto" />
                <Skeleton className="w-9 h-9 rounded-full bg-flash/5" />
                <span />
                <Skeleton className="h-4 w-32 bg-flash/5" />
                <Skeleton className="w-20 h-4 bg-flash/5 mx-auto" />
                <Skeleton className="w-14 h-4 bg-flash/5 mx-auto" />
                <Skeleton className="w-20 h-4 bg-flash/5 mx-auto" />
                <div className="flex gap-1 justify-center">
                  <Skeleton className="w-6 h-6 rounded-full bg-flash/5" />
                  <Skeleton className="w-6 h-6 rounded-full bg-flash/5" />
                  <Skeleton className="w-6 h-6 rounded-full bg-flash/5" />
                </div>
                <Skeleton className="w-9 h-4 bg-flash/5 ml-auto" />
              </div>
            ))
          ) : sorted.length === 0 ? (
            <div className="py-14 text-center text-flash/40 text-sm">
              No leaderboard data yet
            </div>
          ) : (
            sorted.map((p, i) => {
              const rank = i + 1;
              const total = p.wins + p.losses;
              const winrate = p.winrate;
              const isTop3 = rank <= 3;
              const topChamps = champByPlayer.get(p.playerId) ?? [];

              return (
                <motion.div
                  // Use puuid as key — leaderboard rows are per-account, so
                  // a player with multiple linked accounts has multiple rows
                  // sharing the same playerId. Using puuid avoids React
                  // collapsing or duplicating siblings on re-renders.
                  key={p.puuid}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04, ease: "easeOut" }}
                  className={cn(
                    "group relative grid grid-cols-[40px_44px_36px_1fr_140px_90px_120px_120px_56px] items-center px-4 py-3 transition-all duration-300",
                    "border-b border-flash/[0.03]",
                    "hover:bg-jade/[0.02] hover:border-flash/[0.06]"
                  )}
                >
                  {/* Rank # */}
                  <span
                    className={cn(
                      "text-center font-orbitron font-bold tabular-nums relative z-10 text-[14px]",
                      rank === 1
                        ? "text-amber-300"
                        : rank === 2
                        ? "text-gray-300"
                        : rank === 3
                        ? "text-orange-400"
                        : "text-flash/25"
                    )}
                  >
                    {rank}
                  </span>

                  {/* Profile icon */}
                  <div
                    className="relative w-9 h-9 rounded-full overflow-hidden shrink-0 z-10 transition-transform duration-300 group-hover:scale-105"
                    style={{
                      border: `1.5px solid color-mix(in srgb, ${p.color || JADE} 35%, transparent)`,
                      boxShadow: isTop3
                        ? `0 0 14px color-mix(in srgb, ${p.color || JADE} 40%, transparent)`
                        : undefined,
                    }}
                  >
                    {profileIconUrl(p.iconId) ? (
                      <img
                        src={profileIconUrl(p.iconId)!}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-black/40">
                        <span
                          className="text-[14px] font-jetbrains font-bold"
                          style={{ color: p.color || JADE }}
                        >
                          {p.playerDisplayName.slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Color chip (accent badge) */}
                  <div className="flex items-center justify-center relative z-10">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: p.color || JADE,
                        boxShadow: `0 0 6px ${p.color || JADE}`,
                      }}
                    />
                  </div>

                  {/* Name — riot name big, lobby player label small */}
                  <div className="min-w-0 relative z-10 flex flex-col leading-tight">
                    <Link
                      to={`/summoners/${p.region.toLowerCase()}/${encodeURIComponent(
                        p.riotName
                      )}-${encodeURIComponent(p.riotTag)}`}
                      className="text-[13px] text-flash/85 font-geist font-medium truncate block group-hover:text-jade group-hover:underline underline-offset-2 transition-colors duration-200 cursor-clicker"
                    >
                      {p.riotName}
                      <span className="text-flash/30">#{p.riotTag}</span>
                    </Link>
                    <span className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/40 truncate mt-0.5">
                      <span className="text-jade/55 mr-1">{p.region}</span>
                      · {p.playerDisplayName}
                    </span>
                  </div>

                  {/* Tier + LP — grid with a fixed-width icon slot so every
                      rank starts at the same x regardless of label length. */}
                  <div className="grid grid-cols-[28px_1fr] gap-2 items-center relative z-10 pl-3">
                    {p.currentRank ? (
                      <>
                        <img
                          src={getRankImage(p.currentRank.tier)}
                          alt={p.currentRank.tier}
                          className="w-7 h-7 object-contain transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="flex flex-col items-start leading-tight min-w-0">
                          <span
                            className={cn(
                              "text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium truncate",
                              rankColorClass(p.currentRank.tier)
                            )}
                          >
                            {p.currentRank.tier.slice(0, 3)}
                            {p.currentRank.rankDivision
                              ? ` ${p.currentRank.rankDivision}`
                              : ""}
                          </span>
                          <span className="font-geist font-bold tabular-nums text-[12px] text-flash/70">
                            {p.currentRank.lp.toLocaleString()}
                            <span className="text-[8px] text-flash/30 ml-0.5">LP</span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="w-7 h-7" />
                        <span className="text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/30">
                          UNRANKED
                        </span>
                      </>
                    )}
                  </div>

                  {/* Balance */}
                  <div className="flex flex-col items-center relative z-10">
                    {p.balance === 0 ? (
                      <span className="text-[13px] font-chakrapetch font-bold tabular-nums text-flash/30">
                        —
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "text-[14px] font-chakrapetch font-bold tabular-nums",
                          p.balance > 0 ? "text-jade" : "text-red-400/80"
                        )}
                        style={
                          p.balance > 0
                            ? { textShadow: "0 0 10px rgba(0,217,146,0.35)" }
                            : { textShadow: "0 0 10px rgba(239,68,68,0.25)" }
                        }
                      >
                        {p.balance > 0 ? "+" : ""}
                        {p.balance}
                      </span>
                    )}
                    <span className="text-[8px] font-jetbrains tracking-[0.2em] uppercase text-flash/30 mt-0.5">
                      LP
                    </span>
                  </div>

                  {/* W/L record */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-jetbrains text-jade/70 tabular-nums">
                        {p.wins}W
                      </span>
                      <span className="text-[10px] font-jetbrains text-red-400/50 tabular-nums">
                        {p.losses}L
                      </span>
                    </div>
                    <div
                      className="relative h-[3px] rounded-[1px] overflow-hidden"
                      style={{ background: "rgba(239,68,68,0.08)" }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-[1px] transition-all duration-700 ease-out"
                        style={{
                          width: `${total > 0 ? (p.wins / total) * 100 : 50}%`,
                          background:
                            winrate >= 60
                              ? "linear-gradient(90deg, rgba(0,217,146,0.3), rgba(0,217,146,0.6))"
                              : winrate >= 52
                              ? "linear-gradient(90deg, rgba(0,217,146,0.2), rgba(0,217,146,0.45))"
                              : "linear-gradient(90deg, rgba(215,216,217,0.1), rgba(215,216,217,0.25))",
                          boxShadow:
                            winrate >= 55 ? "0 0 6px rgba(0,217,146,0.2)" : "none",
                        }}
                      />
                    </div>
                  </div>

                  {/* Top champions */}
                  <div className="flex gap-1 justify-center relative z-10">
                    {topChamps.slice(0, 3).map((c) => {
                      const champNameFromKey = keyToName[c.champion] ?? c.champion;
                      return (
                        <div key={c.champion} title={`${c.champion} ${c.winrate}% WR (${c.games}g)`}>
                          <img
                            src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(
                              champNameFromKey
                            )}.png`}
                            alt=""
                            className="w-7 h-7 rounded-full border border-flash/[0.08] transition-transform duration-200 hover:scale-110"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Winrate */}
                  <span
                    className={cn(
                      "text-right font-jetbrains font-medium tabular-nums text-[13px] relative z-10",
                      winrate >= 55
                        ? "text-jade"
                        : winrate >= 48
                        ? "text-flash/75"
                        : "text-red-400/70"
                    )}
                  >
                    {winrate}%
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* LP timeline chart — per-player, with day/week/month granularity */}
      <LpTimelineChart slug={slug} refreshTick={refreshTick} />
    </div>
  );
}

/* ─── LP timeline chart ────────────────────────────────────────────────
 * Net LP change per bucket since lobby creation. User picks a player
 * (chips at the top) and a granularity (Day / Week / Month tabs). SVG
 * area chart: cumulative LP, with hover dots showing the per-bucket
 * delta. "All players" picks the best total + draws every player line.
 */
type LpTimelinePeriod = "today" | "day" | "week" | "month";

type LpTimelineAccountFE = {
  puuid: string;
  region: string;
  riotName: string;
  riotTag: string;
  isPrimary: boolean;
  iconId: number | null;
  // ladderScore (tier*1000 + div*100 + lp) per bucket — forward-filled,
  // null when no snapshot is known yet.
  scores: (number | null)[];
  finalScore: number | null;
  finalRank: { tier: string; division: string | null; lp: number } | null;
};
type LpTimelinePayload = {
  period: LpTimelinePeriod;
  buckets: Array<{ bucketStart: string; label: string }>;
  players: Array<{
    playerId: string;
    displayName: string;
    color: string | null;
    accounts: LpTimelineAccountFE[];
  }>;
};

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
] as const;
const LP_TIER_ABBR: Record<string, string> = {
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

/** Inverse of ladderScore — turn a score back into "E2" / "GM" / "D4".
 *  Ladder math stores I=4 / II=3 / III=2 / IV=1 in the hundreds digit,
 *  so we invert (5 − idx) to get the display number where I=1 / IV=4. */
function scoreToRankShort(score: number): string {
  if (score < 0) return "—";
  const tierIdx = Math.min(9, Math.floor(score / 1000));
  const tier = LP_TIERS_ORDER[tierIdx];
  const abbr = LP_TIER_ABBR[tier];
  if (tierIdx >= 7) return abbr; // M / GM / C — no division
  const divIdx = Math.max(1, Math.min(4, Math.floor((score % 1000) / 100)));
  const divNum = 5 - divIdx;
  return `${abbr}${divNum}`;
}

/** Ticks for the Y-axis: every (tier, division) crossing inside [lo, hi]. */
function lpYTicks(lo: number, hi: number): Array<{ score: number; label: string }> {
  const out: Array<{ score: number; label: string }> = [];
  for (let t = 0; t < LP_TIERS_ORDER.length; t++) {
    if (t >= 7) {
      const s = t * 1000;
      if (s >= lo && s <= hi) out.push({ score: s, label: LP_TIER_ABBR[LP_TIERS_ORDER[t]] });
    } else {
      // Divisions IV (1) → I (4). Tick at the floor of each division.
      for (let d = 1; d <= 4; d++) {
        const s = t * 1000 + d * 100;
        if (s >= lo && s <= hi) {
          out.push({ score: s, label: `${LP_TIER_ABBR[LP_TIERS_ORDER[t]]}${5 - d}` });
        }
      }
    }
  }
  // If the range is enormous (multiple tiers), thin ticks down.
  if (out.length > 10) {
    const stride = Math.ceil(out.length / 8);
    return out.filter((_, i) => i % stride === 0 || i === out.length - 1);
  }
  return out;
}

function LpTimelineChart({
  slug,
  refreshTick,
}: {
  slug: string;
  refreshTick: number;
}) {
  // Default to "today" so fresh lobbies show meaningful intra-day movement
  // instead of a single Day bucket that renders as a near-invisible dot.
  const [period, setPeriod] = useState<LpTimelinePeriod>("today");
  const [data, setData] = useState<LpTimelinePayload | null>(null);
  const [loading, setLoading] = useState(true);
  // null = ALL players overlaid; otherwise a specific playerId
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  // Only meaningful when a single player is isolated. null = show every
  // linked account; otherwise restrict the chart to just that puuid.
  const [selectedAccountPuuid, setSelectedAccountPuuid] = useState<
    string | null
  >(null);
  const [hoverBucket, setHoverBucket] = useState<number | null>(null);

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

  // Lines to draw, derived from the player + account selection. Each line
  // carries its display label, color, and a styling tweak so multiple
  // accounts of the same player are visually distinguishable.
  type ChartLine = {
    lineId: string;
    label: string;
    accent: string;
    isPrimary: boolean;
    dashArray: string | null;   // null = solid
    opacity: number;
    iconId: number | null;
    account: LpTimelineAccountFE;
    playerId: string;
  };
  const visibleLines: ChartLine[] = useMemo(() => {
    if (!data) return [];
    const out: ChartLine[] = [];
    for (const p of data.players) {
      if (p.accounts.length === 0) continue;
      const accent = p.color || JADE;
      const primary =
        p.accounts.find((a) => a.isPrimary) ?? p.accounts[0];

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
        continue;
      }
      if (p.playerId !== selectedPlayerId) continue;

      // Single-player view → optionally restricted to one account.
      let order = 0;
      for (const acc of p.accounts) {
        if (selectedAccountPuuid != null && acc.puuid !== selectedAccountPuuid)
          continue;
        const label =
          p.accounts.length === 1
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
    }
    return out;
  }, [data, selectedPlayerId, selectedAccountPuuid]);

  const { minY, maxY, yTicks, paths, hoverPoints } = useMemo(() => {
    if (!data || data.buckets.length === 0 || visibleLines.length === 0) {
      return {
        minY: 0,
        maxY: 0,
        yTicks: [] as Array<{ score: number; label: string }>,
        paths: [] as Array<{
          lineId: string;
          color: string;
          line: string;
          area: string;
          finalY: number | null;
          dashArray: string | null;
          opacity: number;
        }>,
        hoverPoints: [] as Array<{
          x: number;
          y: number;
          color: string;
          lineId: string;
          score: number;
          label: string;
        }>,
      };
    }
    const W = 100;
    const H = 100;
    const N = data.buckets.length;

    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const ln of visibleLines) {
      for (const v of ln.account.scores) {
        if (v == null) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (!isFinite(lo) || !isFinite(hi)) {
      lo = 0;
      hi = 100;
    }
    const span = hi - lo;
    const pad = Math.max(150, span * 0.15);
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    if (lo === hi) hi = lo + 100;

    const x = (i: number) => (N === 1 ? W / 2 : (i / (N - 1)) * W);
    const y = (score: number) => H - ((score - lo) / (hi - lo)) * H;

    type PathObj = {
      lineId: string;
      color: string;
      line: string;
      area: string;
      finalY: number | null;
      dashArray: string | null;
      opacity: number;
    };
    const paths: PathObj[] = visibleLines.map((ln) => {
      let line = "";
      let pen = false;
      const segPoints: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < N; i++) {
        const v = ln.account.scores[i];
        if (v == null) {
          pen = false;
          continue;
        }
        const px = x(i);
        const py = y(v);
        line += pen ? ` L ${px} ${py}` : ` M ${px} ${py}`;
        pen = true;
        segPoints.push({ x: px, y: py });
      }
      let area = "";
      if (segPoints.length >= 2) {
        const baseY = H;
        area =
          segPoints
            .map((pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `L ${pt.x} ${pt.y}`))
            .join(" ") +
          ` L ${segPoints[segPoints.length - 1].x} ${baseY}` +
          ` L ${segPoints[0].x} ${baseY} Z`;
      }
      const lastNonNull = [...ln.account.scores]
        .reverse()
        .find((s): s is number => s != null);
      const finalY = lastNonNull != null ? y(lastNonNull) : null;
      return {
        lineId: ln.lineId,
        color: ln.accent,
        line,
        area,
        finalY,
        dashArray: ln.dashArray,
        opacity: ln.opacity,
      };
    });

    const hi2 = hoverBucket;
    const hoverPoints: Array<{
      x: number;
      y: number;
      color: string;
      lineId: string;
      score: number;
      label: string;
    }> = [];
    if (hi2 != null && hi2 >= 0 && hi2 < N) {
      for (const ln of visibleLines) {
        const v = ln.account.scores[hi2];
        if (v == null) continue;
        hoverPoints.push({
          x: x(hi2),
          y: y(v),
          color: ln.accent,
          lineId: ln.lineId,
          score: v,
          label: ln.label,
        });
      }
    }

    const ticks = lpYTicks(lo, hi);

    return { minY: lo, maxY: hi, yTicks: ticks, paths, hoverPoints };
  }, [data, visibleLines, hoverBucket]);

  const hasData =
    !!data &&
    data.players.some((p) =>
      p.accounts.some((a) => a.scores.some((s) => s != null))
    );

  // Label spacing — show ~6 evenly spaced labels along x-axis to avoid clutter
  const labelStep = data
    ? Math.max(1, Math.ceil(data.buckets.length / 6))
    : 1;

  return (
    <div className={cn(glassDark, "p-5")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span style={{ color: JADE, fontSize: "12px" }}>◆</span>
          <span className="text-[13px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium">
            LP Timeline
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" />
          <div className="flex items-center gap-1">
            {(["today", "day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-[10px] font-jetbrains tracking-[0.2em] uppercase px-3 py-1.5 rounded-[3px] transition-all cursor-clicker font-medium",
                  period === p
                    ? "bg-jade/[0.15] text-jade border border-jade/40"
                    : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"
                )}
              >
                {p === "today"
                  ? "Today"
                  : p === "day"
                    ? "Day"
                    : p === "week"
                      ? "Week"
                      : "Month"}
              </button>
            ))}
          </div>
        </div>

        {/* Player + account chips. Two rows: top is players, bottom is the
            account chips for the currently-isolated player (only shown when
            that player has 2+ linked accounts). */}
        {data && data.players.length > 0 && (
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedPlayerId(null);
                  setSelectedAccountPuuid(null);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[3px] text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium transition-all cursor-clicker border",
                  selectedPlayerId == null
                    ? "border-jade/40 bg-jade/[0.10] text-jade"
                    : "border-flash/15 text-flash/45 hover:text-flash/75 hover:bg-flash/[0.04]"
                )}
              >
                <Users className="w-3 h-3" />
                All
              </button>
              {data.players.map((p) => {
                const accent = p.color || JADE;
                const active = selectedPlayerId === p.playerId;
                const primary =
                  p.accounts.find((a) => a.isPrimary) ?? p.accounts[0];
                const finalScore = primary?.finalScore ?? null;
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => {
                      setSelectedPlayerId(active ? null : p.playerId);
                      setSelectedAccountPuuid(null);
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium transition-all cursor-clicker border",
                      active
                        ? "bg-flash/[0.05] text-flash/90"
                        : "border-transparent text-flash/45 hover:text-flash/75 hover:bg-flash/[0.04]"
                    )}
                    style={
                      active
                        ? {
                            borderColor: `color-mix(in srgb, ${accent} 50%, transparent)`,
                            boxShadow: `0 0 12px color-mix(in srgb, ${accent} 25%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    {profileIconUrl(primary?.iconId ?? null) ? (
                      <img
                        src={profileIconUrl(primary?.iconId ?? null)!}
                        alt=""
                        className="w-4 h-4 rounded-full"
                        style={{ border: `1px solid ${accent}` }}
                      />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: accent, boxShadow: `0 0 4px ${accent}` }}
                      />
                    )}
                    <span>{p.displayName}</span>
                    {finalScore != null && (
                      <span
                        className="tabular-nums font-bold opacity-80"
                        style={{ color: accent }}
                      >
                        {scoreToRankShort(finalScore)}
                      </span>
                    )}
                    {p.accounts.length > 1 && (
                      <span className="text-[8px] font-mono text-flash/30 tabular-nums">
                        ×{p.accounts.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Account row — only when an isolated player has multiple
                accounts. Lets the user pick which one to chart. */}
            {(() => {
              if (selectedPlayerId == null) return null;
              const player = data.players.find(
                (p) => p.playerId === selectedPlayerId
              );
              if (!player || player.accounts.length < 2) return null;
              const accent = player.color || JADE;
              return (
                <div className="flex items-center gap-2 flex-wrap pl-3 ml-1 border-l border-flash/10">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountPuuid(null)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border",
                      selectedAccountPuuid == null
                        ? "bg-flash/[0.05] text-flash/85"
                        : "border-transparent text-flash/35 hover:text-flash/70 hover:bg-flash/[0.04]"
                    )}
                    style={
                      selectedAccountPuuid == null
                        ? {
                            borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    All accounts
                  </button>
                  {player.accounts.map((acc) => {
                    const active = selectedAccountPuuid === acc.puuid;
                    return (
                      <button
                        key={acc.puuid}
                        type="button"
                        onClick={() =>
                          setSelectedAccountPuuid(active ? null : acc.puuid)
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border",
                          active
                            ? "bg-flash/[0.05] text-flash/85"
                            : "border-transparent text-flash/35 hover:text-flash/70 hover:bg-flash/[0.04]"
                        )}
                        style={
                          active
                            ? {
                                borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
                                boxShadow: `0 0 10px color-mix(in srgb, ${accent} 22%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        {profileIconUrl(acc.iconId) ? (
                          <img
                            src={profileIconUrl(acc.iconId)!}
                            alt=""
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ border: `1px solid ${accent}` }}
                          />
                        ) : (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: accent }}
                          />
                        )}
                        <span className="text-jade/55 mr-0.5">{acc.region}</span>
                        <span>{acc.riotName}</span>
                        <span className="text-flash/25">#{acc.riotTag}</span>
                        {acc.isPrimary && (
                          <span className="text-[7px] font-mono tracking-widest text-jade/60 ml-0.5">
                            MAIN
                          </span>
                        )}
                        {acc.finalScore != null && (
                          <span
                            className="tabular-nums font-bold opacity-80 ml-0.5"
                            style={{ color: accent }}
                          >
                            {scoreToRankShort(acc.finalScore)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Chart */}
        {loading ? (
          <div className="h-[260px] flex items-center justify-center text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/30">
            Loading…
          </div>
        ) : !hasData ? (
          <div className="h-[260px] flex items-center justify-center text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/30">
            Not enough rank data yet — keep playing.
          </div>
        ) : (
          <div className="relative pl-9">
            {/* Y-axis rank labels — absolutely positioned alongside the SVG.
                The SVG itself is 100×100 viewBox; here we map each tick's
                ladderScore into a percentage from the top. */}
            <div className="absolute left-0 top-0 bottom-6 w-9 pointer-events-none">
              {yTicks.map((t) => {
                const range = maxY - minY || 1;
                const topPct = 100 - ((t.score - minY) / range) * 100;
                if (topPct < -2 || topPct > 102) return null;
                return (
                  <div
                    key={t.score}
                    className="absolute right-1 -translate-y-1/2 flex items-center gap-1"
                    style={{ top: `${topPct}%` }}
                  >
                    <span className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/45 tabular-nums">
                      {t.label}
                    </span>
                    <span className="w-1.5 h-[1px] bg-flash/20" />
                  </div>
                );
              })}
            </div>

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-[260px] block"
              onMouseLeave={() => setHoverBucket(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const xPct = ((e.clientX - rect.left) / rect.width) * 100;
                if (!data) return;
                const N = data.buckets.length;
                const idx = Math.round((xPct / 100) * (N - 1));
                setHoverBucket(Math.max(0, Math.min(N - 1, idx)));
              }}
            >
              {/* Rank tier grid lines — one horizontal at every tick */}
              {yTicks.map((t) => {
                const range = maxY - minY || 1;
                const yy = 100 - ((t.score - minY) / range) * 100;
                if (yy < 0 || yy > 100) return null;
                return (
                  <line
                    key={t.score}
                    x1="0"
                    x2="100"
                    y1={yy}
                    y2={yy}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="0.12"
                  />
                );
              })}

              {/* Area fill when exactly one line is being rendered */}
              {paths.length === 1 &&
                paths.map((p) =>
                  p.area ? (
                    <path
                      key={`area-${p.lineId}`}
                      d={p.area}
                      fill={`color-mix(in srgb, ${p.color} 22%, transparent)`}
                      opacity={0.55}
                    />
                  ) : null
                )}

              {/* Lines */}
              {paths.map((p) => (
                <path
                  key={`line-${p.lineId}`}
                  d={p.line}
                  fill="none"
                  stroke={p.color}
                  strokeWidth="0.55"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={p.dashArray ?? undefined}
                  opacity={p.opacity}
                  style={{
                    filter: `drop-shadow(0 0 1.4px color-mix(in srgb, ${p.color} 55%, transparent))`,
                  }}
                />
              ))}

              {/* End-of-line dot — marks current rank for that line.
                  Two-circle stack so the dot stays prominent even in the
                  single-bucket case where the line is just a single
                  invisible "M x y" point. */}
              {paths.map((p) =>
                p.finalY != null ? (
                  <g key={`end-${p.lineId}`} opacity={p.opacity}>
                    <circle
                      cx={98}
                      cy={p.finalY}
                      r="2.4"
                      fill={p.color}
                      opacity={0.22}
                    />
                    <circle
                      cx={98}
                      cy={p.finalY}
                      r="1.4"
                      fill={p.color}
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth="0.22"
                    />
                  </g>
                ) : null
              )}

              {/* Hover guide */}
              {hoverBucket != null && data && hoverPoints.length > 0 && (
                <>
                  <line
                    x1={hoverPoints[0].x}
                    x2={hoverPoints[0].x}
                    y1={0}
                    y2={100}
                    stroke="rgba(0,217,146,0.35)"
                    strokeWidth="0.18"
                  />
                  {hoverPoints.map((pt) => (
                    <circle
                      key={`dot-${pt.lineId}`}
                      cx={pt.x}
                      cy={pt.y}
                      r="1.1"
                      fill={pt.color}
                      stroke="rgba(0,0,0,0.45)"
                      strokeWidth="0.22"
                    />
                  ))}
                </>
              )}
            </svg>

            {/* X-axis labels */}
            <div className="relative mt-2 h-4">
              {data?.buckets.map((b, i) => {
                if (i % labelStep !== 0 && i !== data.buckets.length - 1)
                  return null;
                const N = data.buckets.length;
                const left = N === 1 ? 50 : (i / (N - 1)) * 100;
                return (
                  <span
                    key={b.bucketStart}
                    className="absolute -translate-x-1/2 text-[8px] font-jetbrains tracking-[0.18em] uppercase text-flash/30 whitespace-nowrap"
                    style={{ left: `${left}%` }}
                  >
                    {b.label}
                  </span>
                );
              })}
            </div>

            {/* Hover tooltip — shows rank reached at the hovered bucket */}
            {hoverBucket != null && data && hoverPoints.length > 0 && (
              <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] font-jetbrains text-flash/60">
                <span className="text-flash/30 uppercase tracking-[0.2em]">
                  {data.buckets[hoverBucket]?.label}
                </span>
                {hoverPoints.map((pt) => (
                  <span
                    key={pt.lineId}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: pt.color }}
                    />
                    <span className="text-flash/55">{pt.label}</span>
                    <span
                      className="font-bold tabular-nums uppercase tracking-wider"
                      style={{ color: pt.color }}
                    >
                      {scoreToRankShort(pt.score)}
                    </span>
                    <span className="text-flash/30 tabular-nums">
                      {pt.score % 100} LP
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsTab({ slug }: { slug: string }) {
  const [period, setPeriod] = useState<StatsPeriod>("day");
  const [buckets, setBuckets] = useState<StatsBucket[]>([]);
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

  return (
    <div className={cn(glassDark, "p-5")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1]">
        <div className="flex items-center gap-3 mb-4">
          <span style={{ color: JADE, fontSize: "12px" }}>◈</span>
          <span className="text-[13px] font-jetbrains tracking-[0.22em] uppercase text-flash/90 font-medium">
            Activity Trend
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" />
          <div className="flex items-center gap-1">
            {(["day", "week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "text-[10px] font-jetbrains tracking-[0.2em] uppercase px-3 py-1.5 rounded-[3px] transition-all cursor-clicker font-medium",
                  period === p
                    ? "bg-jade/[0.15] text-jade border border-jade/40"
                    : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"
                )}
              >
                {p === "day" ? "Daily" : p === "week" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        {bucketsLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-jade animate-spin" />
          </div>
        ) : (
          <TrendChart buckets={buckets} />
        )}
      </div>
    </div>
  );
}

/* ─── sidebar leaderboard — always visible on the right ─────────────── */
function SidebarLeaderboard({
  slug,
  refreshTick,
}: {
  slug: string;
  refreshTick: number;
}) {
  // Default to "all" so the widgets show meaningful data on first load —
  // a fresh lobby with only a couple of games today would otherwise render
  // "no games yet" everywhere.
  const [window, setWindow] = useState<StatsWindow>("all");
  const [leaderboard, setLeaderboard] = useState<LeaderboardAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/scout/leaderboard/${slug}?window=${window}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setLeaderboard(d?.accounts ?? []))
      .catch(console.error)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug, window, refreshTick]);

  return (
    <div className="flex flex-col gap-3">
      {/* Window selector */}
      <div className={cn(glassDark, "p-3")}>
        <GlowBackdrop subtle />
        <div className="relative z-[1] flex items-center gap-1">
          {(["today", "week", "all"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={cn(
                "flex-1 text-[10px] font-jetbrains tracking-[0.2em] uppercase py-2 rounded-[3px] transition-all cursor-clicker font-medium",
                window === w
                  ? "bg-jade/[0.15] text-jade border border-jade/40"
                  : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"
              )}
            >
              {w === "today" ? "Today" : w === "week" ? "Week" : "All"}
            </button>
          ))}
        </div>
      </div>

      <LeaderboardStatBox
        loading={loading}
        icon={<Trophy className="w-3.5 h-3.5" />}
        label={topPlayerLabel(window)}
        player={pickPlayerOfDay(leaderboard)}
        highlightFn={(p) => (p.deaths === 0 ? "PERF" : p.avgKda.toFixed(2))}
        highlightLabel="KDA"
        emptyText="No games tracked"
      />
      <LeaderboardStatBox
        loading={loading}
        icon={<TrendingUp className="w-3.5 h-3.5" />}
        label="Highest LP Gain"
        player={pickHighestLp(leaderboard)}
        highlightFn={(p) => `${p.balance > 0 ? "+" : ""}${p.balance}`}
        highlightLabel="LP"
        emptyText="No rank data"
      />
      <LeaderboardStatBox
        loading={loading}
        icon={<Award className="w-3.5 h-3.5" />}
        label="Best Winrate"
        player={pickBestWinrate(leaderboard)}
        highlightFn={(p) => `${p.winrate}%`}
        highlightLabel="WR"
        emptyText="No games tracked"
      />
      <LeaderboardStatBox
        loading={loading}
        icon={<Gamepad2 className="w-3.5 h-3.5" />}
        label="Most Games"
        player={pickMostGames(leaderboard)}
        highlightFn={(p) => String(p.games)}
        highlightLabel="Games"
        emptyText="No games tracked"
      />
    </div>
  );
}

// Window-aware label for the top KDA widget.
function topPlayerLabel(w: StatsWindow): string {
  if (w === "today") return "Player of the Day";
  if (w === "week") return "Player of the Week";
  return "Top Player";
}

// Thresholds were too strict for fresh lobbies: required 2+ games for
// player-of-the-day and 3+ for best-winrate. Drop everything to 1+ so the
// widgets render as soon as any match has been ingested.
function pickPlayerOfDay(rows: LeaderboardAccount[]) {
  const elig = rows.filter((p) => p.games >= 1);
  if (!elig.length) return null;
  return [...elig].sort((a, b) => b.avgKda - a.avgKda)[0];
}
function pickHighestLp(rows: LeaderboardAccount[]) {
  const filt = rows.filter((p) => p.balance !== 0);
  if (!filt.length) return null;
  return [...filt].sort((a, b) => b.balance - a.balance)[0];
}
function pickBestWinrate(rows: LeaderboardAccount[]) {
  const elig = rows.filter((p) => p.games >= 1);
  if (!elig.length) return null;
  return [...elig].sort((a, b) => b.winrate - a.winrate)[0];
}
function pickMostGames(rows: LeaderboardAccount[]) {
  const elig = rows.filter((p) => p.games > 0);
  if (!elig.length) return null;
  return [...elig].sort((a, b) => b.games - a.games)[0];
}

function LeaderboardStatBox({
  icon,
  label,
  player,
  highlightFn,
  highlightLabel,
  emptyText,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  player: LeaderboardAccount | null;
  highlightFn: (p: LeaderboardAccount) => string;
  highlightLabel: string;
  emptyText: string;
  loading: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-md bg-black/18 backdrop-blur-lg saturate-150 shadow-[0_8px_24px_rgba(0,0,0,0.45),inset_0_0_0_0.5px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]">
      <GlowBackdrop subtle />
      <div className="relative z-[1] p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-jade">{icon}</span>
          <span className="text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/55 font-medium">
            {label}
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" />
        </div>

        {loading ? (
          <div className="h-[58px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-jade/60" />
          </div>
        ) : player ? (
          <div className="flex items-center gap-3">
            {profileIconUrl(player.iconId) ? (
              <img
                src={profileIconUrl(player.iconId)!}
                alt=""
                className="w-11 h-11 rounded-full shrink-0"
                style={{
                  boxShadow: `0 0 14px color-mix(in srgb, ${player.color || JADE} 35%, transparent)`,
                  border: `1.5px solid color-mix(in srgb, ${player.color || JADE} 40%, transparent)`,
                }}
              />
            ) : (
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: `1.5px solid color-mix(in srgb, ${player.color || JADE} 40%, transparent)`,
                }}
              >
                <span
                  className="text-[16px] font-jetbrains font-bold"
                  style={{ color: player.color || JADE }}
                >
                  {player.playerDisplayName.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[14px] font-geist font-medium text-flash truncate">
                {player.riotName}
                <span className="text-flash/30">#{player.riotTag}</span>
              </span>
              {player.currentRank ? (
                <span className="text-[10px] font-jetbrains tracking-[0.15em] uppercase mt-0.5 truncate">
                  <span className={cn(rankColorClass(player.currentRank.tier), "font-medium")}>
                    {formatRankShort(player.currentRank)}
                  </span>
                  <span className="text-flash/30"> · </span>
                  <span className="text-flash/40">
                    {player.games}G {player.wins}W {player.losses}L
                  </span>
                </span>
              ) : (
                <span className="text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/35 mt-0.5">
                  {player.games} {player.games === 1 ? "game" : "games"} ·{" "}
                  {player.wins}W {player.losses}L
                </span>
              )}
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[20px] font-chakrapetch font-bold tabular-nums text-jade leading-none">
                {highlightFn(player)}
              </span>
              <span className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mt-1">
                {highlightLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-[58px] flex items-center justify-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── trend chart (pure SVG) ────────────────────────────────────────── */
function TrendChart({ buckets }: { buckets: StatsBucket[] }) {
  if (buckets.length === 0) {
    return (
      <div className="py-12 text-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30">
        No data
      </div>
    );
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
      if (b.games === 0) return null;
      const x = padL + i * colW + colW / 2;
      const y = padT + (1 - b.winrate / 100) * innerH;
      return { x, y, b };
    })
    .filter(Boolean) as Array<{ x: number; y: number; b: StatsBucket }>;

  // Line path
  const linePath = winratePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        {/* Horizontal grid: 0/25/50/75/100 winrate */}
        {[0, 25, 50, 75, 100].map((p) => {
          const y = padT + (1 - p / 100) * innerH;
          return (
            <g key={p}>
              <line
                x1={padL}
                x2={padL + innerW}
                y1={y}
                y2={y}
                stroke="rgba(215,216,217,0.06)"
                strokeWidth={1}
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-flash/30 text-[9px] font-jetbrains"
              >
                {p}%
              </text>
            </g>
          );
        })}

        {/* 50% reference line */}
        <line
          x1={padL}
          x2={padL + innerW}
          y1={padT + 0.5 * innerH}
          y2={padT + 0.5 * innerH}
          stroke="rgba(0,217,146,0.18)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />

        {/* Games bars */}
        {buckets.map((b, i) => {
          const x = padL + i * colW + colW * 0.18;
          const barW = colW * 0.64;
          const h = b.games === 0 ? 0 : (b.games / maxGames) * innerH;
          const y = padT + innerH - h;
          return (
            <g key={`bar-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                fill="rgba(0,217,146,0.10)"
                stroke="rgba(0,217,146,0.25)"
                strokeWidth={0.8}
                rx={1}
              />
              {b.games > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  className="fill-jade/70 text-[9px] font-chakrapetch font-bold tabular-nums"
                >
                  {b.games}
                </text>
              )}
            </g>
          );
        })}

        {/* Winrate line */}
        {winratePoints.length > 1 && (
          <path
            d={linePath}
            stroke={JADE}
            strokeWidth={2}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {winratePoints.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={JADE}
            stroke="#040A0C"
            strokeWidth={1}
          />
        ))}

        {/* Bucket labels */}
        {buckets.map((b, i) => {
          const x = padL + i * colW + colW / 2;
          return (
            <text
              key={`lbl-${i}`}
              x={x}
              y={height - 14}
              textAnchor="middle"
              className="fill-flash/40 text-[9px] font-jetbrains tracking-[0.1em] uppercase"
            >
              {b.bucketLabel}
            </text>
          );
        })}
      </svg>
      <div className="flex items-center gap-4 mt-3 text-[10px] font-jetbrains tracking-[0.18em] uppercase">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ background: "rgba(0,217,146,0.10)", border: "1px solid rgba(0,217,146,0.25)" }}
          />
          <span className="text-flash/45">Games</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-[2px] bg-jade" />
          <span className="text-flash/45">Winrate</span>
        </span>
      </div>
    </div>
  );
}

/* ─── habits tab ────────────────────────────────────────────────────── */
function HabitsTab({ slug }: { slug: string }) {
  const [window, setWindow] = useState<StatsWindow>("week");
  const [data, setData] = useState<HabitsPlayer[]>([]);
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

  return (
    <div className="flex flex-col gap-5">
      <WindowSelector window={window} onChange={setWindow} />

      {loading ? (
        <div className={cn(glassDark, "p-12 flex items-center justify-center")}>
          <Loader2 className="w-5 h-5 animate-spin text-jade" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data
            .filter((p) => p.games > 0)
            .sort((a, b) => b.games - a.games)
            .map((p) => (
              <HabitsCard key={p.playerId} player={p} />
            ))}
        </div>
      )}
    </div>
  );
}

function WindowSelector({
  window,
  onChange,
}: {
  window: StatsWindow;
  onChange: (w: StatsWindow) => void;
}) {
  return (
    <div className={cn(glassDark, "p-3")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1] flex items-center gap-3">
        <span className="text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/55">
          Window
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {(["today", "week", "all"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => onChange(w)}
              className={cn(
                "text-[10px] font-jetbrains tracking-[0.2em] uppercase px-3 py-1.5 rounded-[3px] transition-all cursor-clicker font-medium",
                window === w
                  ? "bg-jade/[0.15] text-jade border border-jade/40"
                  : "bg-transparent text-flash/40 hover:text-flash/70 hover:bg-flash/[0.04] border border-transparent"
              )}
            >
              {w === "today" ? "Today" : w === "week" ? "Week" : "All-time"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitsCard({ player }: { player: HabitsPlayer }) {
  const accent = player.color || JADE;
  const tilt =
    player.afterLoss.games >= 3
      ? player.afterLoss.winrate
      : null;
  const tiltColor =
    tilt === null
      ? "text-flash/35"
      : tilt >= 55
      ? "text-jade"
      : tilt >= 45
      ? "text-flash/80"
      : "text-error";

  const todTotal =
    player.timeOfDay.morning.games +
    player.timeOfDay.afternoon.games +
    player.timeOfDay.evening.games +
    player.timeOfDay.night.games;

  return (
    <div className={cn(glassDark, "p-4")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <span className="text-[14px] font-geist font-medium text-flash">
            {player.displayName}
          </span>
          <span className="text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/35 ml-auto">
            {player.games} games
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <HabitMetric
            label="WR after loss"
            value={
              tilt === null
                ? "—"
                : `${tilt}%`
            }
            sub={
              tilt === null
                ? "min 3 needed"
                : `${player.afterLoss.wins}/${player.afterLoss.games}`
            }
            valueClass={tiltColor}
          />
          <HabitMetric
            label="WR after win"
            value={
              player.afterWin.games >= 3
                ? `${player.afterWin.winrate}%`
                : "—"
            }
            sub={
              player.afterWin.games >= 3
                ? `${player.afterWin.wins}/${player.afterWin.games}`
                : "min 3 needed"
            }
            valueClass="text-flash/80"
          />
          <HabitMetric
            label="Longest W streak"
            value={String(player.longestWinStreak)}
            sub="in a row"
            valueClass="text-jade"
          />
          <HabitMetric
            label="Longest L streak"
            value={String(player.longestLossStreak)}
            sub="in a row"
            valueClass="text-error/80"
          />
        </div>

        {/* Time of day distribution */}
        <div>
          <div className="text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/45 mb-2">
            Time of day
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <TodBar label="Morn" bucket={player.timeOfDay.morning} total={todTotal} accent={accent} fullLabel="Morning · 05:00–11:59" />
            <TodBar label="Aft" bucket={player.timeOfDay.afternoon} total={todTotal} accent={accent} fullLabel="Afternoon · 12:00–17:59" />
            <TodBar label="Eve" bucket={player.timeOfDay.evening} total={todTotal} accent={accent} fullLabel="Evening · 18:00–22:59" />
            <TodBar label="Night" bucket={player.timeOfDay.night} total={todTotal} accent={accent} fullLabel="Night · 23:00–04:59" />
          </div>
        </div>
      </div>
    </div>
  );
}

function HabitMetric({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub: string;
  valueClass: string;
}) {
  return (
    <div className="bg-black/25 border border-flash/10 rounded-[3px] p-3">
      <div className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mb-1.5">
        {label}
      </div>
      <div className={cn("text-[22px] font-chakrapetch font-bold tabular-nums leading-none", valueClass)}>
        {value}
      </div>
      <div className="text-[10px] font-jetbrains tracking-[0.12em] text-flash/35 mt-1.5">
        {sub}
      </div>
    </div>
  );
}

function TodBar({
  label,
  bucket,
  total,
  accent,
  fullLabel,
}: {
  label: string;
  bucket: TimeBucketFE;
  total: number;
  accent: string;
  fullLabel: string;
}) {
  const pct = total > 0 ? Math.round((bucket.games / total) * 100) : 0;
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1 cursor-default">
            <div className="relative w-full h-14 bg-black/25 border border-flash/10 rounded-[3px] overflow-hidden flex items-end justify-center transition-colors hover:border-flash/25">
              <div
                className="w-full transition-all"
                style={{
                  height: `${pct}%`,
                  background: `color-mix(in srgb, ${accent} 30%, transparent)`,
                }}
              />
              <span className="absolute top-1 right-1 text-[9px] font-jetbrains text-flash/45 tabular-nums">
                {bucket.games}
              </span>
            </div>
            <span className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/45">
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="text-xs font-jetbrains tracking-wider"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-jade/85 font-bold">
              {fullLabel}
            </span>
            <span className="text-flash/85">
              {bucket.games} {bucket.games === 1 ? "game" : "games"}
              <span className="text-flash/35"> · </span>
              <span
                className={
                  bucket.winrate >= 55
                    ? "text-jade"
                    : bucket.winrate >= 48
                      ? "text-flash/80"
                      : "text-red-400/80"
                }
              >
                {bucket.wins}W {bucket.games - bucket.wins}L · {bucket.winrate}% WR
              </span>
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ─── champions tab ─────────────────────────────────────────────────── */
function ChampionsTab({ slug }: { slug: string }) {
  const [window, setWindow] = useState<StatsWindow>("all");
  const [data, setData] = useState<ChampionsPlayer[]>([]);
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

  return (
    <div className="flex flex-col gap-5">
      <WindowSelector window={window} onChange={setWindow} />

      {loading ? (
        <div className={cn(glassDark, "p-12 flex items-center justify-center")}>
          <Loader2 className="w-5 h-5 animate-spin text-jade" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data
            .filter((p) => p.champions.length > 0)
            .map((p) => (
              <ChampionsCard key={p.playerId} player={p} />
            ))}
          {data.every((p) => p.champions.length === 0) && (
            <div className={cn(glassDark, "p-8 text-center col-span-full")}>
              <div className="text-flash/40 text-sm">No champion data yet.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChampionsCard({ player }: { player: ChampionsPlayer }) {
  const accent = player.color || JADE;
  return (
    <div className={cn(glassDark, "p-4")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1]">
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
          />
          <span className="text-[14px] font-geist font-medium text-flash">
            {player.displayName}
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {player.champions.map((c, i) => (
            <li
              key={c.champion}
              className="flex items-center gap-3 bg-black/25 border border-flash/10 rounded-[3px] px-3 py-2"
            >
              <span className="text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/35 w-4">
                {String(i + 1).padStart(2, "0")}
              </span>
              <img
                src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(c.champion)}.png`}
                alt={c.champion}
                className="w-9 h-9 rounded-md"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-geist font-medium text-flash truncate">
                  {c.champion}
                </span>
                <span className="text-[10px] font-jetbrains tracking-[0.12em] text-flash/40">
                  {c.games} games · {c.wins}W {c.games - c.wins}L
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span
                  className={cn(
                    "text-[15px] font-chakrapetch font-bold tabular-nums leading-none",
                    c.winrate >= 60
                      ? "text-jade"
                      : c.winrate >= 50
                      ? "text-flash/85"
                      : "text-error/80"
                  )}
                >
                  {c.winrate}%
                </span>
                <span className="text-[9px] font-jetbrains tracking-[0.15em] uppercase text-flash/40 mt-0.5">
                  {c.deaths === 0 ? "PERF" : c.avgKda.toFixed(2)} KDA
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── refresh clock — countdown + auto-trigger ──────────────────────── */
function RefreshClock({
  lastRefreshAt,
  refreshing,
  onRefreshDone,
  slug,
}: {
  lastRefreshAt: string | null;
  refreshing: boolean;
  onRefreshDone: (newLastRefreshAt: string) => void;
  slug: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const lastFiredAtRef = useRef<number>(0);

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
  const triggerRefresh = useCallback(
    (manual = false) => {
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
        console.warn(
          `[RefreshClock] inFlight stuck for ${lastFiredAgo}ms — forcing reset`
        );
        inFlightRef.current = false;
        setLocalRefreshing(false);
      }

      if (isRefreshing && lastFiredAgo > STUCK_MS) {
        // eslint-disable-next-line no-console
        console.warn(
          `[RefreshClock] localRefreshing stuck for ${lastFiredAgo}ms — forcing reset`
        );
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
          if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
          return data;
        })
        .then((d: any) => {
          // eslint-disable-next-line no-console
          console.log("[RefreshClock] response data", d);
          if (!d?.lastRefreshAt) {
            throw new Error("Refresh response missing lastRefreshAt");
          }
          // eslint-disable-next-line no-console
          console.log(
            "[RefreshClock] calling onRefreshDone — bumps refreshTick, parent should refetch lobby+feed"
          );
          onRefreshDone(d.lastRefreshAt);
          if (!d.skipped) {
            showCyberToast({
              title: "Lobby refreshed",
              description: `${d.accountsRefreshed ?? 0} accounts updated`,
              tag: "SYNC",
              variant: "status",
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
    },
    [isRefreshing, onRefreshDone, slug]
  );

  // Auto-trigger when due. Backs off if there's an error to avoid loops.
  useEffect(() => {
    if (!isDue) return;
    if (error) return;
    triggerRefresh(false);
  }, [isDue, error, triggerRefresh]);

  const label = (() => {
    if (error) return "RETRY";
    if (isRefreshing) return "REFRESHING";
    if (!lastRefreshAt) return "PENDING";
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

  return (
    <button
      type="button"
      onClick={() => {
        // eslint-disable-next-line no-console
        console.log("[RefreshClock] button onClick fired");
        triggerRefresh(true);
      }}
      aria-disabled={isRefreshing}
      title={error ?? "Click to refresh now"}
      className={cn(
        "group flex items-center gap-2 text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/50",
        "rounded-[3px] px-2 py-1 -mx-2 -my-1 transition-colors cursor-clicker",
        "hover:bg-flash/[0.05]"
      )}
    >
      {showIcon ? (
        <RefreshCw
          className={cn(
            "w-3.5 h-3.5",
            error ? "text-error/70" : "text-jade/70",
            isRefreshing && "animate-spin"
          )}
        />
      ) : (
        <RefreshCw className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 text-jade/70 transition-opacity" />
      )}
      <span className="text-flash/40">Next update</span>
      <span className={cn("tabular-nums", valueClass)}>{label}</span>
    </button>
  );
}

/* ─── edit lobby dialog (creator only) ──────────────────────────────── */
type EditAccount = {
  uid: string;
  puuid: string;
  region: string;
  riotName: string;
  riotTag: string;
};
type EditPlayer = {
  uid: string;
  displayName: string;
  accounts: EditAccount[];
};
const REGIONS = ["EUW", "NA", "KR"] as const;
const EDIT_MAX_PLAYERS = 20;
const EDIT_MAX_ACCOUNTS = 3;
const makeUid = () => Math.random().toString(36).slice(2, 10);

/* ── Hero champion picker ──────────────────────────────────────────────
 * Tiny search + scrollable grid of champion portraits, sits inside the
 * edit dialog. Selected champion previews a small splash thumbnail.
 */
function HeroChampionPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [champions, setChampions] = useState<
    Array<{ key: string; name: string; id: string }>
  >([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const list = Object.values<any>(data?.data ?? {}).map((c) => ({
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
    if (!q) return champions;
    return champions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().startsWith(q)
    );
  }, [champions, search]);

  const splash = cdnSplashUrl(normalizeChampName(value || DEFAULT_HERO_CHAMPION));

  return (
    <div className="flex flex-col gap-2">
      {/* Preview strip — click anywhere to toggle the picker open. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cn(
          "relative h-16 rounded-[3px] overflow-hidden border bg-black/40 cursor-clicker text-left",
          "transition-all duration-200",
          expanded
            ? "border-jade/45 shadow-[0_0_14px_rgba(0,217,146,0.18)]"
            : "border-flash/15 hover:border-jade/30 hover:shadow-[0_0_12px_rgba(0,217,146,0.12)]"
        )}
      >
        <img
          src={splash}
          alt={value}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: "center 45%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-liquirice/85 via-liquirice/30 to-transparent" />
        <div className="absolute inset-0 px-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-[2px] border border-jade/30 shadow-[0_0_10px_rgba(0,217,146,0.25)] shrink-0 overflow-hidden bg-black">
            <img
              src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(value)}.png`}
              alt=""
              className="w-full h-full"
            />
          </span>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-jetbrains tracking-[0.22em] uppercase text-jade/65">
              Hero splash
            </span>
            <span className="text-[15px] font-chakrapetch font-bold text-flash tracking-wide truncate">
              {value}
            </span>
          </div>
          {/* Chevron indicator */}
          <span
            className={cn(
              "shrink-0 text-jade/60 text-[16px] leading-none transition-transform duration-200",
              expanded ? "rotate-180" : "rotate-0"
            )}
            aria-hidden
          >
            ⌃
          </span>
        </div>
      </button>

      {/* Expanded picker — search + grid. Animates in/out. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-2 pt-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search champion…"
              className="w-full bg-black/30 border border-flash/15 rounded-[3px] h-9 px-3 text-[13px] text-flash placeholder:text-flash/30 outline-none focus:border-jade/45 transition-colors font-geist"
            />
            <div className="grid grid-cols-9 gap-1 max-h-[180px] overflow-y-auto cyber-scrollbar pr-1 -mr-1">
              {filtered.map((c) => {
                const selected = c.id === value;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setExpanded(false);
                    }}
                    title={c.name}
                    className={cn(
                      "relative aspect-square rounded-[2px] overflow-hidden border transition-all cursor-clicker",
                      selected
                        ? "border-jade/70 ring-1 ring-jade/40 shadow-[0_0_10px_rgba(0,217,146,0.35)]"
                        : "border-flash/[0.08] hover:border-jade/30"
                    )}
                  >
                    <img
                      src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(c.id)}.png`}
                      alt={c.name}
                      className="w-full h-full"
                      loading="lazy"
                    />
                    {selected && (
                      <span className="absolute inset-0 bg-jade/[0.18] pointer-events-none" />
                    )}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <span className="col-span-9 py-3 text-center text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/35">
                  No match
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditLobbyDialog({
  open,
  onClose,
  lobby,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  lobby: Lobby;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [name, setName] = useState(lobby.name);
  const [heroChampion, setHeroChampion] = useState(
    lobby.heroChampion ?? DEFAULT_HERO_CHAMPION
  );
  const [players, setPlayers] = useState<EditPlayer[]>(() =>
    lobby.players.map((p) => ({
      uid: makeUid(),
      displayName: p.displayName,
      accounts: p.accounts.map((a) => ({
        uid: makeUid(),
        puuid: a.puuid,
        region: a.region,
        riotName: a.riotName,
        riotTag: a.riotTag,
      })),
    }))
  );
  const [saving, setSaving] = useState(false);
  // Two phases for the Save button label — first the PATCH ("Saving…"),
  // then the backend refresh that pre-warms ingestion ("Syncing…").
  const [savePhase, setSavePhase] = useState<"idle" | "saving" | "syncing">(
    "idle"
  );
  const [err, setErr] = useState<string | null>(null);
  // Two-step delete: first click → confirmArmed. Second click within
  // CONFIRM_WINDOW → actually delete. Auto-disarms after 4 seconds.
  const [confirmArmed, setConfirmArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!confirmArmed) return;
    const t = window.setTimeout(() => setConfirmArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmArmed]);
  useEffect(() => {
    if (!open) setConfirmArmed(false);
  }, [open]);

  // Reset state when reopened with a different lobby
  useEffect(() => {
    if (!open) return;
    setName(lobby.name);
    setHeroChampion(lobby.heroChampion ?? DEFAULT_HERO_CHAMPION);
    setPlayers(
      lobby.players.map((p) => ({
        uid: makeUid(),
        displayName: p.displayName,
        accounts: p.accounts.map((a) => ({
          uid: makeUid(),
          puuid: a.puuid,
          region: a.region,
          riotName: a.riotName,
          riotTag: a.riotTag,
        })),
      }))
    );
    setErr(null);
  }, [open, lobby]);

  const addPlayer = () => {
    if (players.length >= EDIT_MAX_PLAYERS) return;
    setPlayers((prev) => [
      ...prev,
      { uid: makeUid(), displayName: "", accounts: [] },
    ]);
  };
  const removePlayer = (uid: string) =>
    setPlayers((prev) => prev.filter((p) => p.uid !== uid));
  const updatePlayer = (uid: string, patch: Partial<EditPlayer>) =>
    setPlayers((prev) =>
      prev.map((p) => (p.uid === uid ? { ...p, ...patch } : p))
    );

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
    } catch (e) {
      console.error(e);
      setErr("Network error");
    } finally {
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
      } catch {
        /* ignore — the lobby has been saved already */
      }

      showCyberToast({
        title: "Lobby updated",
        description: `${players.length} players, ${players.reduce(
          (n, p) => n + p.accounts.length,
          0
        )} accounts`,
        tag: "SYNC",
        variant: "status",
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      setErr("Network error");
    } finally {
      setSaving(false);
      setSavePhase("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[640px] font-geist [&>button]:hidden">
        <DialogTitle className="sr-only">Edit lobby</DialogTitle>
        <div
          className="relative rounded-md overflow-hidden"
          style={{
            background: "rgba(8,16,20,0.96)",
            backdropFilter: "blur(12px)",
            border: "1px solid color-mix(in srgb, #00d992 25%, transparent)",
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-[2px] z-[1]"
            style={{ background: "color-mix(in srgb, #00d992 55%, transparent)" }}
          />
          <div className="relative z-10 p-6 max-h-[80vh] overflow-y-auto cyber-scrollbar">
            <div className="flex items-center gap-3 mb-5">
              <Pencil className="w-4 h-4 text-jade" />
              <span className="text-[12px] font-jetbrains tracking-[0.22em] uppercase text-jade font-medium">
                Edit Lobby
              </span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" />
              <button
                onClick={onClose}
                className="text-flash/40 hover:text-flash/80 cursor-clicker"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lobby name */}
            <div className="mb-5">
              <span className="text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/55 mb-2 block">
                ◆ Lobby name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full bg-black/30 border border-flash/20 rounded-[3px] h-11 px-3 text-[15px] text-flash placeholder:text-flash/35 outline-none focus:border-jade/45 transition-colors"
              />
            </div>

            {/* Hero champion picker */}
            <div className="mb-5">
              <span className="text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/55 mb-2 block">
                ◆ Hero splash
              </span>
              <HeroChampionPicker
                value={heroChampion}
                onChange={setHeroChampion}
              />
            </div>

            {/* Players */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/55">
                  ◆ Players {players.length}/{EDIT_MAX_PLAYERS}
                </span>
                <button
                  onClick={addPlayer}
                  disabled={players.length >= EDIT_MAX_PLAYERS}
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] font-jetbrains tracking-[0.2em] uppercase font-medium px-2.5 py-1.5 rounded-[3px] border cursor-clicker transition-all",
                    players.length >= EDIT_MAX_PLAYERS
                      ? "border-flash/10 text-flash/25"
                      : "border-jade/30 text-jade bg-jade/[0.08] hover:bg-jade/[0.15]"
                  )}
                >
                  <Plus className="w-3 h-3" /> Add player
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {players.map((p, idx) => (
                  <EditPlayerRow
                    key={p.uid}
                    index={idx}
                    player={p}
                    onChange={(next) => updatePlayer(p.uid, next)}
                    onRemove={() => removePlayer(p.uid)}
                  />
                ))}
              </div>
            </div>

            {err && (
              <div className="text-[11px] font-jetbrains tracking-[0.15em] uppercase text-error/80 mb-3">
                ◆ {err}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              {/* Two-step delete on the left. First click arms a red
                  confirmation chip with countdown; second click within 4s
                  fires the DELETE request. */}
              <button
                onClick={() => {
                  if (confirmArmed) deleteLobby();
                  else setConfirmArmed(true);
                }}
                disabled={saving || deleting}
                className={cn(
                  "text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium px-3 py-2 rounded-[3px] border cursor-clicker transition-all flex items-center gap-2",
                  confirmArmed
                    ? "border-[#d63336]/55 text-[#d63336] bg-[#d63336]/[0.10] shadow-[0_0_18px_rgba(214,51,54,0.25)]"
                    : "border-flash/15 text-flash/45 hover:text-[#d63336] hover:border-[#d63336]/40 hover:bg-[#d63336]/[0.05]",
                  (saving || deleting) && "opacity-50"
                )}
                title={
                  confirmArmed
                    ? "Click again to confirm deletion"
                    : "Delete this lobby"
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting
                  ? "Deleting…"
                  : confirmArmed
                    ? "Click again to confirm"
                    : "Delete lobby"}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={saving || deleting}
                  className="text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium px-4 py-2 rounded-[3px] border border-flash/15 text-flash/60 hover:bg-flash/[0.05] cursor-clicker disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || deleting}
                  className="text-[11px] font-jetbrains tracking-[0.2em] uppercase font-medium px-5 py-2 rounded-[3px] border border-jade/45 text-jade bg-jade/[0.10] hover:bg-jade/[0.20] shadow-[0_0_20px_rgba(0,217,146,0.18)] cursor-clicker disabled:opacity-50"
                >
                  {savePhase === "syncing"
                    ? "Syncing…"
                    : saving
                      ? "Saving…"
                      : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditPlayerRow({
  index,
  player,
  onChange,
  onRemove,
}: {
  index: number;
  player: EditPlayer;
  onChange: (p: EditPlayer) => void;
  onRemove: () => void;
}) {
  const slotLabel = `P${String(index + 1).padStart(2, "0")}`;
  const [adding, setAdding] = useState(false);
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("EUW");
  const [raw, setRaw] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [accErr, setAccErr] = useState<string | null>(null);

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
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="bg-black/25 border border-flash/15 rounded-[3px] p-3">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[10px] font-jetbrains font-medium tracking-[0.2em] uppercase px-1.5 py-[2px] rounded-[2px]"
          style={{
            color: "#00d992",
            background: "rgba(0,217,146,0.08)",
            border: "1px solid color-mix(in srgb, #00d992 25%, transparent)",
          }}
        >
          {slotLabel}
        </span>
        <input
          value={player.displayName}
          onChange={(e) => onChange({ ...player, displayName: e.target.value })}
          placeholder="Player name"
          maxLength={40}
          className="flex-1 bg-transparent text-sm text-flash placeholder:text-flash/30 outline-none border-b border-flash/0 focus:border-jade/40 transition-colors py-0.5"
        />
        <button
          onClick={onRemove}
          className="text-flash/35 hover:text-error transition-colors cursor-clicker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1 pl-1">
        {player.accounts.map((a) => (
          <div
            key={a.uid}
            className="flex items-center gap-2 text-xs px-1 py-1 rounded-[2px] hover:bg-flash/[0.03]"
          >
            <Check className="w-3 h-3 text-jade shrink-0" />
            <span className="text-[10px] font-jetbrains tracking-[0.15em] uppercase text-jade/60 w-9">
              {a.region}
            </span>
            <span className="text-flash/80 truncate">
              {a.riotName}
              <span className="text-flash/30">#{a.riotTag}</span>
            </span>
            <button
              onClick={() =>
                onChange({
                  ...player,
                  accounts: player.accounts.filter((x) => x.uid !== a.uid),
                })
              }
              className="ml-auto text-flash/30 hover:text-error cursor-clicker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {adding ? (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center gap-2">
              <select
                value={region}
                onChange={(e) =>
                  setRegion(e.target.value as (typeof REGIONS)[number])
                }
                className="bg-black/40 border border-flash/15 rounded-[2px] text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/85 px-2 py-1 outline-none"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                autoFocus
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitAccount();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="name#tag"
                className="flex-1 bg-black/30 border border-flash/15 rounded-[2px] text-xs text-flash placeholder:text-flash/30 px-2 py-1 outline-none focus:border-jade/40"
              />
              <button
                onClick={submitAccount}
                disabled={verifying}
                className="text-[10px] font-jetbrains tracking-[0.15em] uppercase px-2 py-1 rounded-[2px] border border-jade/40 text-jade bg-jade/10 hover:bg-jade/20 cursor-clicker"
              >
                {verifying ? "…" : "Add"}
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setRaw("");
                  setAccErr(null);
                }}
                className="text-flash/40 hover:text-flash/80 cursor-clicker"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {accErr && (
              <span className="text-[10px] font-jetbrains tracking-[0.12em] uppercase text-error/80 pl-1">
                ◆ {accErr}
              </span>
            )}
          </div>
        ) : (
          player.accounts.length < EDIT_MAX_ACCOUNTS && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 mt-1 text-[10px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[2px] border border-flash/15 text-flash/55 hover:bg-flash/[0.04] cursor-clicker self-start"
            >
              <Plus className="w-3 h-3" /> Account
            </button>
          )
        )}
      </div>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────────── */
export default function ScoutLobbyPage() {
  const { slug, tab: tabParam } = useParams<{ slug: string; tab?: string }>();
  // Allowed tab values — anything else falls back to "matches".
  const VALID_TABS = useMemo(
    () =>
      new Set([
        "matches",
        "live",
        "leaderboard",
        "trending",
        "habits",
        "champions",
      ]),
    []
  );
  const activeTab =
    tabParam && VALID_TABS.has(tabParam) ? tabParam : "matches";
  const navigate = useNavigate();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { session } = useAuth();

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

  const handleRefreshDone = useCallback(
    (newLastRefreshAt: string) => {
      setLobby((prev) =>
        prev ? { ...prev, lastRefreshAt: newLastRefreshAt } : prev
      );
      setRefreshTick((t) => t + 1);
    },
    []
  );

  // Initial load — re-runs after refreshTick increments to pull fresh data.
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const isFirst = refreshTick === 0;

    const load = async () => {
      if (isFirst) setInitialLoading(true);
      setLobbyError(null);
      // eslint-disable-next-line no-console
      console.log(
        `[ScoutLobby] reload (refreshTick=${refreshTick}, isFirst=${isFirst})`
      );
      try {
        const [lobbyRes, feedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/scout/lobby/${slug}`, {
            cache: "no-store",
          }),
          fetch(`${API_BASE_URL}/api/scout/feed/${slug}`, {
            cache: "no-store",
          }),
        ]);

        if (lobbyRes.status === 404) {
          if (!cancelled) setLobbyError("Lobby not found");
          return;
        }
        if (!lobbyRes.ok) {
          if (!cancelled) setLobbyError("Failed to load lobby");
          return;
        }

        const lobbyData = (await lobbyRes.json()) as Lobby;
        const feedData = (await feedRes.json()) as {
          items: FeedItem[];
          nextCursor: string | null;
        };

        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.log(
          `[ScoutLobby] feed loaded: ${feedData.items.length} items, newest matchId=${feedData.items[0]?.matchId ?? "(none)"} @ ${feedData.items[0]?.gameCreation ?? "(none)"}`
        );
        setLobby(lobbyData);
        setItems(feedData.items);
        setCursor(feedData.nextCursor);
        setHasMore(feedData.nextCursor !== null);
      } catch (err) {
        console.error(err);
        if (!cancelled) setLobbyError("Network error");
      } finally {
        if (!cancelled && isFirst) setInitialLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, refreshTick]);

  const loadMore = useCallback(async () => {
    if (!slug || !cursor || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/scout/feed/${slug}?cursor=${encodeURIComponent(cursor)}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: FeedItem[];
        nextCursor: string | null;
      };
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [slug, cursor, loadingMore, hasMore]);

  if (lobbyError) {
    return (
      <div className="w-full flex justify-center pt-10 pb-24 font-geist">
        <div className="w-full max-w-[820px]">
          <div className={cn(glassDark, "p-8 text-center")}>
            <GlowBackdrop />
            <div className="relative z-10">
              <span className="text-[12px] font-jetbrains tracking-[0.22em] uppercase text-error/80">
                ◆ {lobbyError}
              </span>
              <p className="mt-3 text-flash/55 text-sm">
                The lobby link may be broken or the lobby has been deleted.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoading || !lobby) {
    return (
      <div className="w-full flex justify-center pt-10 pb-24 font-geist">
        <div className="w-full max-w-[860px]">
          <div className={cn(glassDark, "p-10 flex items-center justify-center gap-3")}>
            <GlowBackdrop />
            <Loader2 className="w-5 h-5 text-jade animate-spin relative z-10" />
            <span className="relative z-10 text-flash/65 text-sm font-jetbrains tracking-[0.18em] uppercase">
              Loading lobby
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-24 font-geist">
      <LobbyHero lobby={lobby} />

      <div className="flex justify-center">
        <div className="w-full max-w-[1280px] px-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Left: tabs + content */}
          <div className="min-w-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                // Default tab → bare slug URL. Other tabs → /:slug/:tab.
                const next = v === "matches" ? `/scout/${slug}` : `/scout/${slug}/${v}`;
                navigate(next, { replace: false });
              }}
            >
              <div className="flex items-end justify-between border-b border-flash/[0.06] mb-6">
                <TabsList className="flex justify-start mx-0 bg-transparent h-auto p-0 gap-7 border-0">
                  {(
                    [
                      { value: "matches", label: "Matches" },
                      { value: "live", label: "Live" },
                      { value: "leaderboard", label: "Leaderboard" },
                      { value: "trending", label: "Trending" },
                      { value: "habits", label: "Habits" },
                      { value: "champions", label: "Champions" },
                    ] as const
                  ).map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className={cn(
                        "group relative font-jetbrains text-[11px] tracking-[0.22em] uppercase px-2 py-3 rounded-none bg-transparent border-none shadow-none transition-all duration-300 cursor-clicker",
                        "text-flash/40 hover:text-flash/65 font-medium",
                        "data-[state=active]:text-jade data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      )}
                    >
                      <span className="hidden group-data-[state=active]:inline text-jade/45 mr-1">
                        [
                      </span>
                      {tab.label}
                      <span className="hidden group-data-[state=active]:inline text-jade/45 ml-1">
                        ]
                      </span>
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-jade/70 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300 origin-center shadow-[0_0_8px_rgba(0,217,146,0.4)]" />
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="pb-3">
                  <RefreshClock
                    lastRefreshAt={lobby.lastRefreshAt}
                    refreshing={refreshing}
                    onRefreshDone={handleRefreshDone}
                    slug={slug!}
                  />
                </div>
              </div>

              <TabsContent value="matches" className="mt-0">
                <MatchesTab
                  items={items}
                  lobby={lobby}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  loadMore={loadMore}
                />
              </TabsContent>

              <TabsContent value="live" className="mt-0">
                <LiveTab slug={slug!} />
              </TabsContent>

              <TabsContent value="leaderboard" className="mt-0">
                <LeaderboardTab slug={slug!} refreshTick={refreshTick} />
              </TabsContent>

              <TabsContent value="trending" className="mt-0">
                <TrendingTab slug={slug!} refreshTick={refreshTick} />
              </TabsContent>

              <TabsContent value="habits" className="mt-0">
                <HabitsTab slug={slug!} />
              </TabsContent>

              <TabsContent value="champions" className="mt-0">
                <ChampionsTab slug={slug!} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right: sticky sidebar with leaderboard boxes */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <SidebarLeaderboard slug={slug!} refreshTick={refreshTick} />
          </aside>
        </div>
      </div>

      {/* Back-to-top */}
      <div
        className={cn(
          "fixed bottom-10 right-10 z-50 transition-all duration-300 ease-in-out",
          showScrollTop
            ? "opacity-100 pointer-events-auto translate-y-0"
            : "opacity-0 pointer-events-none translate-y-3"
        )}
      >
        <DiamondButton
          icon="top"
          label="TOP"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        />
      </div>

      {/* Edit lobby button — bottom-left, owner only */}
      {!!session?.user?.id && session.user.id === lobby.ownerUserId && (
        <div className="fixed bottom-10 left-10 z-50">
          <DiamondButton
            icon="edit"
            label="EDIT"
            onClick={() => setEditOpen(true)}
          />
        </div>
      )}

      {editOpen && (
        <EditLobbyDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          lobby={lobby}
          onSaved={() => setRefreshTick((t) => t + 1)}
          onDeleted={() => navigate("/dashboard/scout")}
        />
      )}
    </div>
  );
}
