// /scout/[slug] — public feed for a scout lobby.
//
// Layout:
//   1. Yunara splash hero with lobby name + headline stats
//   2. Custom tab nav (Matches / Stats / Habits / Champions)
//   3. Per-tab content

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
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
  Swords,
  Flame,
  Crown,
  Coins,
  Shield,
  Sparkles,
  Zap,
  Wheat,
  Target,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Crosshair,
  Info,
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
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, Check, Pencil, Trash2, Eye } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { VerifyBadge } from "@/components/verifybadge";
import {
  VerifyAccountsDialog,
  type VerifyAccountRow,
} from "@/components/verifyaccountsdialog";
import { ChatTab } from "@/components/scoutchat/chattab";
import { useScoutChat } from "@/components/scoutchat/usescoutchat";
import { CompareTab } from "@/components/scoutcompare/comparetab";

/* ─── shapes ─────────────────────────────────────────────────────────── */
type LobbyAccount = {
  id: string;
  puuid: string;
  region: string;
  riotName: string;
  riotTag: string;
  isPrimary: boolean;
  orderIndex: number;
  /** ISO timestamp set when the account passed the icon-change
   *  challenge. Drives the per-account "verified" badge in the
   *  verify dialog and feeds into the player's verifyGrade. */
  verifiedAt?: string | null;
  // Current solo-queue rank from the latest scout_rank_snapshots row.
  // Used by the matches tab to render a "start → current" pill on each
  // group card. Null when the account has no snapshots yet.
  currentRank?: { tier: string; rankDivision: string | null; lp: number } | null;
};

type LobbyPlayer = {
  id: string;
  displayName: string;
  color: string | null;
  iconId: number | null;
  orderIndex: number;
  accounts: LobbyAccount[];
  // Identity verification (Phase 1).
  claimedByProfileId?: string | null;
  claimedAt?: string | null;
  showVerifyBadge?: boolean;
  verifyGrade?: 0 | 1 | 2;
};

type LobbyAdmin = {
  profileId: string;
  grantedAt: string;
  grantedBy: string | null;
};

type VerifyMode = "disabled" | "claim_only" | "full";

type Lobby = {
  slug: string;
  name: string;
  isPublic: boolean;
  /** True when the lobby is private AND the viewer isn't a member —
   *  the payload is a hero-only stub and the body renders locked. */
  locked?: boolean;
  createdAt: string;
  lastActiveAt: string;
  lastRefreshAt: string | null;
  ownerUserId: string | null;
  heroChampion: string | null;
  /** Which tab keys are enabled for this lobby. Defaults from backend
   *  to the classic 7 (no chat/compare) but admin can toggle any. */
  enabledTabs?: string[];
  /** "disabled" → no claim/verify at all
   *  "claim_only" → Phase 1 only (claim invites + Grade 1 badge)
   *  "full" → Phase 1 + Phase 2 icon challenge (default) */
  verifyMode?: VerifyMode;
  players: LobbyPlayer[];
  admins?: LobbyAdmin[];
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
    // Total creep score (lane + jungle). Optional — older payloads omit it.
    cs?: number | null;
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
  streak: number;        // longest consecutive-wins run in window
  primaryPartner: {
    playerId: string;
    displayName: string;
    color: string | null;
    iconId: number | null;
    sharedGames: number;
    sharedWins: number;
  } | null;
};

// Top-of-lobby duo aggregates returned by the leaderboard endpoint.
// Used by sidebar widgets to swap into duo display when a pair's
// metric strictly exceeds the best individual.
type LeaderboardDuo = {
  playerIdA: string;
  playerIdB: string;
  displayNameA: string;
  displayNameB: string;
  colorA: string | null;
  colorB: string | null;
  iconIdA: number | null;
  iconIdB: number | null;
  sharedGames: number;
  sharedWins: number;
};
type LeaderboardDuoStreak = LeaderboardDuo & { length: number };
type LeaderboardDuoKda = LeaderboardDuo & { avgKda: number };
type LeaderboardDuoWinrate = LeaderboardDuo & { winrate: number };

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
  // Per-account breakdown (puuid → top-5 champions for THAT account only).
  // Lets the card switch between "All accounts" and a single account view.
  // Backend may omit on older payloads — treat as {} when undefined.
  perAccount?: Record<string, ChampionLine[]>;
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
  420: "SOLOQ",
  440: "FLEX",
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
function LobbyHero({
  lobby,
  refreshSlot,
}: {
  lobby: Lobby;
  /** RefreshClock rendered by the parent (it owns the refresh
   *  state/handlers). Placed on the lobby-name row, right-aligned. */
  refreshSlot?: React.ReactNode;
}) {
  const heroName = lobby.heroChampion || DEFAULT_HERO_CHAMPION;
  const splash = cdnSplashUrl(normalizeChampName(heroName));

  return (
    <div
      // Mobile: 320px so the splash actually shows (the -80px
      // negative top margin pulls the hero under the navbar, leaving
      // ~240px of splash visible below it — enough to read the lobby
      // name with breathing room). Desktop keeps the cinematic 420px.
      className="relative w-screen left-1/2 -translate-x-1/2 h-[320px] sm:h-[420px] overflow-hidden mb-1 sm:mb-6"
      style={{ marginTop: "-80px" /* navbar h-16 + content mt-4 — hero goes behind */ }}
    >
      <img
        src={splash}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 20%" }}
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

      {/* Content — matches the tab/content wrapper below so the hero
          title left-aligns with the tablist instead of floating in
          its own xl:w-[65%] column.

          Mobile gets pl-8 (instead of px-4) to absorb the additional
          inner padding of the mobile Matches/Players selects below
          (16px of <select pl-4>). Desktop keeps px-4 since the tab
          triggers below only carry px-2 — close enough to look
          flush. */}
      <div className="absolute inset-0 z-10 flex items-end justify-center pb-3 sm:pb-6">
        <div className="w-full max-w-[1280px] pl-8 pr-4 sm:px-4">
          {/* Scout :: Lobby · slug — desktop only. On mobile the
              brand line was just stealing rows from the hero. */}
          <div className="hidden sm:flex items-center gap-3 mb-2">
            <span style={{ color: JADE, fontSize: "12px" }}>◈</span>
            <span className="text-[11px] font-jetbrains tracking-[0.25em] uppercase text-jade/60">
              Scout :: Lobby
            </span>
            <span className="text-flash/30 text-[11px]">·</span>
            <span className="text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/50">
              {lobby.slug}
            </span>
          </div>

          {/* Name + NEXT UPDATE on one row. Name left, clock pinned
              bottom-right so it sits on the name's baseline. Wraps on
              narrow widths so the clock drops below the name instead
              of squeezing it. */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1 className="text-[34px] sm:text-[60px] font-jetbrains font-medium text-flash tracking-tight leading-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              {lobby.name}
            </h1>
            {refreshSlot && (
              <div className="shrink-0 pb-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                {refreshSlot}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─── locked (private lobby) body ───────────────────────────────────── */
function LockedLobbyBody() {
  return (
    <div className="flex justify-center px-4 mt-10">
      <div
        className={cn(glassDark, "relative w-full max-w-[680px] p-10 sm:p-14 text-center overflow-hidden")}
      >
        <GlowBackdrop />
        <div className="relative z-10 flex flex-col items-center">
          {/* Lock icon in a glowing ring */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{
              background: "radial-gradient(circle, rgba(0,217,146,0.14), transparent 70%)",
              border: "1px solid color-mix(in srgb, #00d992 30%, transparent)",
            }}
          >
            <Lock
              className="w-9 h-9 text-jade"
              style={{ filter: "drop-shadow(0 0 10px rgba(0,217,146,0.5))" }}
            />
          </div>

          <h2 className="text-[24px] sm:text-[30px] font-chakrapetch font-bold text-flash mb-2 tracking-tight">
            This lobby is private
          </h2>
          <p className="text-[13px] sm:text-[14px] text-flash/55 font-geist leading-snug max-w-[440px] mb-1">
            Only verified members of this lobby can view its matches,
            stats and activity.
          </p>
          <p className="text-[12px] text-flash/40 font-geist leading-snug max-w-[440px]">
            If you belong here, claim your identity from an invite link
            an admin sent you — then this page unlocks automatically.
          </p>

          {/* Decorative hairline */}
          <div className="mt-8 flex items-center gap-2 text-flash/25">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-flash/20" />
            <span className="text-[9px] font-jetbrains tracking-[0.3em] uppercase">
              Private
            </span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-flash/20" />
          </div>
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
        // Slim row-aligned chip — height 26px so it sits inline with
        // the 16px player name without bumping the title row taller.
        // Value + label render on a SINGLE horizontal line now (was
        // stacked) since the row height isn't tall enough for two
        // baselines. Width is auto-sized via px-2 so longer values
        // ("PERF", "100%") don't get truncated.
        "inline-flex items-center justify-center gap-1 h-[26px] px-2 rounded-[3px] ring-1 tabular-nums whitespace-nowrap",
        palette.ring,
        palette.bg,
        palette.glow
      )}
    >
      <span
        className={cn(
          "text-[11.5px] font-chakrapetch font-bold tracking-wide leading-none",
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

/* ─── rank-journey pill ────────────────────────────────────────────────
 * Visual recap of where the active member's account *started* this
 * session and where it is *now*. Two rank icons + abbreviated tier and
 * LP, separated by a soft arrow. Sits in the section header next to
 * the W/L / WR / LP / KDA stat chips.
 */
function SessionRankPill({
  startRank,
  endRank,
}: {
  startRank: { tier: string; rankDivision: string | null; lp: number };
  endRank: { tier: string; rankDivision: string | null; lp: number };
}) {
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

  return (
    <div
      title={`Started ${startRank.tier} ${startRank.rankDivision ?? ""} ${startRank.lp}LP → Now ${endRank.tier} ${endRank.rankDivision ?? ""} ${endRank.lp}LP`}
      className="inline-flex items-center gap-1.5 h-[26px] px-1.5 rounded-[3px] ring-1 ring-flash/[0.08] bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] whitespace-nowrap"
    >
      {/* START side — single-line layout to match the slim chip height. */}
      <img
        src={getRankImage(startRank.tier)}
        alt={startRank.tier}
        className="w-4 h-4 shrink-0 opacity-70"
      />
      <span className="text-[11px] font-chakrapetch font-bold tracking-wide text-flash/70 tabular-nums leading-none">
        {startShort}
      </span>
      <span className="text-[8.5px] font-jetbrains tracking-[0.12em] uppercase text-flash/35 tabular-nums leading-none">
        {startRank.lp}LP
      </span>

      {/* Arrow */}
      <span
        aria-hidden
        className="text-flash/35 text-[9px] leading-none"
      >
        ▶
      </span>

      {/* END side */}
      <img
        src={getRankImage(endRank.tier)}
        alt={endRank.tier}
        className="w-4 h-4 shrink-0"
      />
      <span
        className={cn(
          "text-[11px] font-chakrapetch font-bold tracking-wide tabular-nums leading-none",
          endColor
        )}
      >
        {endShort}
      </span>
      <span className="text-[8.5px] font-jetbrains tracking-[0.12em] uppercase text-flash/55 tabular-nums leading-none">
        {endRank.lp}LP
      </span>
    </div>
  );
}

// Short rank label used inside the session pill — e.g. "E4", "D2",
// "MAS" / "GM" / "CHA" for the apex tiers (where division is null).
function formatRankShortPill(r: {
  tier: string;
  rankDivision: string | null;
}): string {
  const tier = r.tier.toUpperCase();
  if (tier === "MASTER") return "M";
  if (tier === "GRANDMASTER") return "GM";
  if (tier === "CHALLENGER") return "C";
  const tLetter = tier[0] ?? "?";
  const divNum: Record<string, string> = { IV: "4", III: "3", II: "2", I: "1" };
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
function focusScoutMatch(matchId: string) {
  if (!matchId) return;

  const fire = () =>
    window.dispatchEvent(
      new CustomEvent("scout:focus-match", { detail: { matchId } })
    );
  fire();

  const safe =
    typeof CSS !== "undefined" && CSS.escape ? CSS.escape(matchId) : matchId;
  const sel = `[data-scout-match="${safe}"]`;

  let tries = 0;
  const maxTries = 50; // ~50 × 50ms ≈ 2.5s before giving up
  const run = () => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) {
      // Card is mounted. Fire once more so the (now-mounted) group
      // listener opens it, then let the 420ms expand animation settle
      // before scrolling + shining — a collapsed row is in the DOM but
      // clipped, so we can't reliably read "visible", we just wait it out.
      fire();
      window.setTimeout(() => {
        // Apply the shine to the card box only (overflow-hidden → the
        // glint is clipped to the card, never the comments panel below).
        const card =
          (el.querySelector("[data-scout-card]") as HTMLElement | null) ?? el;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.remove("scout-match-focus");
        void card.offsetWidth; // restart the glint cleanly if re-triggered
        card.classList.add("scout-match-focus");
        window.setTimeout(
          () => card.classList.remove("scout-match-focus"),
          1400
        );
      }, 470);
      return;
    }
    if (tries++ < maxTries) {
      // Keep nudging groups that mount a beat late (after a tab switch).
      if (tries % 4 === 0) fire();
      window.setTimeout(run, 50);
    }
  };
  window.setTimeout(run, 60);
}

/* ─── player/squad section card ─────────────────────────────────────── */
// Renders matches owned by 1+ (player, account) combos. When 2+ members
// played the EXACT same match set in a day, they're merged into a single
// "A & B" card.
type MatchSocialBatch = {
  counts: Record<string, { likes: number; comments: number }>;
  likers: Record<string, LikerInfo[]>;
  myLikes: Set<string>;
  bumpComment: (matchId: string, delta?: number) => void;
  setLike: (
    matchId: string,
    next: { iLiked: boolean; likeCount: number }
  ) => void;
};

function PlayerSectionCardImpl({
  members,
  matches,
  itemsByMatch,
  squadMatchIds,
  lobbyAccountByPuuid,
  lobbySlug,
  social,
  canLike,
  canComment,
}: {
  members: SectionMember[];
  matches: FeedItem[];
  itemsByMatch: Map<string, FeedItem[]>;
  squadMatchIds: Set<string>;
  lobbyAccountByPuuid: Record<
    string,
    {
      riotName: string;
      riotTag: string;
      region: string;
      showVerifyBadge?: boolean;
      verifyGrade?: 0 | 1 | 2;
    }
  >;
  /** Lobby slug — needed by the like + comment endpoints. */
  lobbySlug: string;
  /** Per-match like + comment counts batched at the MatchesTab level. */
  social: MatchSocialBatch;
  canLike: boolean;
  canComment: boolean;
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

  // Jump-to-match: when someone (the Daily Bounty card) requests focus on
  // a match that lives in this section but isn't the always-visible first
  // one, open the section so it can be scrolled into view + pulsed.
  useEffect(() => {
    const onFocus = (e: Event) => {
      const id = (e as CustomEvent).detail?.matchId as string | undefined;
      if (!id) return;
      const idx = matches.findIndex((m) => m.matchId === id);
      if (idx > 0) setExpanded(true);
    };
    window.addEventListener("scout:focus-match", onFocus as EventListener);
    return () =>
      window.removeEventListener(
        "scout:focus-match",
        onFocus as EventListener
      );
  }, [matches]);

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
    <div
      className="relative overflow-hidden rounded-md bg-flash/[0.013] backdrop-blur-xl saturate-150 ring-1 ring-flash/[0.08] shadow-[0_18px_44px_-12px_rgba(0,0,0,0.8),0_4px_14px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.045)]"
    >
      {/* Glass edge highlight along the top */}
      <div
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-flash/25 to-transparent pointer-events-none z-[1]"
      />
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-[1]"
        style={{
          background: `color-mix(in srgb, ${winLossAccent} 75%, transparent)`,
          boxShadow: `0 0 8px color-mix(in srgb, ${winLossAccent} 35%, transparent)`,
        }}
      />

      {/* Header — name(s) + account(s); active member styled jade.

          Pills (W/L, WR, LP, KDA + the rank-journey pill) live on the
          SAME row as the title now, anchored right with ml-auto. The
          old "between title and subtitle" placement felt floating; this
          aligns them visually with the player's name. */}
      <div className="relative z-[2] flex items-center gap-3 px-4 py-3 border-b border-flash/[0.06]">
        <SectionAvatars
          members={uniquePlayers}
          activePlayerId={activePlayerId}
          accent={accent}
          onSelect={isSquad ? setActivePlayerId : undefined}
        />
        <div className="flex flex-col min-w-0 flex-1">
          {/* Title row — names + DUO badge on the left, stat pills on
              the right (ml-auto). Flex-wraps on narrow widths so pills
              drop below the name instead of squeezing into it on
              mobile. */}
          <div className="flex items-center gap-2 gap-y-1.5 w-full flex-wrap">
            {uniquePlayers.map((m, i) => {
              const isActive = m.player.id === activePlayerId;
              const showBadge =
                !!m.player.showVerifyBadge &&
                (m.player.verifyGrade ?? 0) >= 1;
              const NameSpan = (
                <span className="inline-flex items-center gap-1.5">
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
                  {/* Verify badge — sits next to the lobby player's
                      display name (the human identity), NOT next to
                      the Riot account name. Only when admin has the
                      toggle ON and the player is at grade ≥ 1. */}
                  {showBadge && (
                    <VerifyBadge
                      grade={m.player.verifyGrade === 2 ? 2 : 1}
                      size={13}
                    />
                  )}
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
                // Hidden on mobile — the DUO/TRIO label was eating row
                // space without adding much info, and the names "&"-
                // joined already convey the squad relationship.
                className="hidden sm:flex text-[9px] font-jetbrains font-medium tracking-[0.2em] uppercase px-1.5 py-[2px] rounded-[2px] items-center gap-1"
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
            {/* Session stat pills — inline on the title row, anchored
                right via ml-auto. Slim height (26px) so they sit
                comfortably next to the 16px player name without
                bulging the row. Hidden on mobile (< sm) — phones get
                a stripped-down header with just avatar + name +
                account subtitle. */}
            <div className="hidden sm:flex ml-auto items-center gap-1.5 shrink-0">
              {(() => {
                const activeMember = uniquePlayers.find(
                  (m) => m.player.id === activePlayerId
                );
                const currentRank = activeMember?.account?.currentRank ?? null;
                if (!currentRank || sessionStats.lpCounted === 0) return null;
                const endScore = ladderScoreFE(currentRank);
                const startRank = rankFromLadderScoreFE(
                  endScore - sessionStats.lpTotal
                );
                if (!startRank) return null;
                return (
                  <SessionRankPill
                    startRank={startRank}
                    endRank={currentRank}
                  />
                );
              })()}
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
            </div>
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
      </div>

      {/* Matches list — collapsed view shows only the most recent. The
          rest live in a grid-rows expander that animates open smoothly. */}
      <ul className="relative z-[2] flex flex-col gap-3 px-3 pt-3 pb-0">
        {renderMatchRow(matches[0], 0)}
      </ul>

      {matches.length > 1 && (
        <div
          className={cn(
            "relative z-[2] grid overflow-hidden transition-[grid-template-rows,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            expanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <ul className="flex flex-col gap-3 px-3 pt-3 pb-0 overflow-hidden">
            {matches.slice(1).map((m, i) => renderMatchRow(m, i + 1))}
          </ul>
        </div>
      )}

      {/* Cyber show-more / collapse trigger — minimal jade pulse, no
          boxed border or corner brackets. Reads as part of the section,
          not a separate UI block. */}
      {matches.length > 1 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="group/showmore relative z-[20] w-full -mt-3 pt-0 pb-1.5 cursor-clicker"
        >
          <span className="relative inline-flex items-center justify-center gap-2.5 w-full">
            {/* Left accent line */}
            <span
              aria-hidden
              className="h-[1px] w-10 bg-gradient-to-r from-transparent to-jade/25 group-hover/showmore:to-jade/65 transition-colors duration-300"
            />
            {/* Label cluster — chevron + text + chevron */}
            <span className="inline-flex items-center gap-1.5 text-jade/55 group-hover/showmore:text-jade transition-colors duration-300">
              <span
                aria-hidden
                className={cn(
                  "text-[9px] leading-none transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  expanded ? "rotate-180" : "rotate-0"
                )}
                style={{
                  textShadow:
                    "0 0 5px color-mix(in srgb, #00d992 35%, transparent)",
                }}
              >
                ▾
              </span>
              <span
                className="text-[9px] font-chakrapetch font-bold tracking-[0.26em] uppercase"
                style={{
                  textShadow:
                    "0 0 6px color-mix(in srgb, #00d992 22%, transparent)",
                }}
              >
                {expanded
                  ? "Collapse"
                  : `Show ${matches.length - 1} more ${matches.length - 1 === 1 ? "match" : "matches"}`}
              </span>
              <span
                aria-hidden
                className={cn(
                  "text-[9px] leading-none transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  expanded ? "rotate-180" : "rotate-0"
                )}
                style={{
                  textShadow:
                    "0 0 5px color-mix(in srgb, #00d992 35%, transparent)",
                }}
              >
                ▾
              </span>
            </span>
            {/* Right accent line */}
            <span
              aria-hidden
              className="h-[1px] w-10 bg-gradient-to-l from-transparent to-jade/25 group-hover/showmore:to-jade/65 transition-colors duration-300"
            />
          </span>
        </button>
      )}
    </div>
  );

  // Local renderer — same closure scope as the component so it can use
  // activePlayerId / itemsByMatch / lobbyAccountByPuuid / etc directly.
  function renderMatchRow(repItem: FeedItem, _idx: number) {
    const matchItems = itemsByMatch.get(repItem.matchId) ?? [repItem];
    const item =
      matchItems.find((x) => x.ownerPlayerId === activePlayerId) ?? repItem;

    const card: MatchCardData = {
      matchId: item.matchId,
      queueLabel:
        QUEUE_LABELS[item.queueId ?? -1] ?? `QUEUE ${item.queueId ?? "?"}`,
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
      lobbyMatePuuids: (
        item.lobbyAccountPuuidsInMatch ??
        item.lobbyPlayers.map((lp) => lp.accountPuuid)
      ).filter((p) => p !== item.participant.puuid),
      lobbyAccountByPuuid,
      lpDelta: item.participant.lpDelta ?? null,
      rankChange: item.participant.rankChange ?? null,
      rankAfter: item.participant.rankAfter ?? null,
      // The lobby-account map carries short-form region per puuid (set by
      // the lobby endpoint). Falls back to EUW when the participant isn't
      // a lobby account (shouldn't happen for our own row, but defensive).
      region:
        lobbyAccountByPuuid[item.participant.puuid]?.region ?? "EUW",
      // Aegis-of-Valor (double-LP) heuristic: a normal ranked win caps
      // around 25-30 LP, even with promo bonuses. A delta of 35+ on a
      // win basically can't happen without the 2x modifier, so flag it
      // so the MatchCard renders the Aegis watermark backdrop. Losses
      // are ignored — the cosmetic doubles LP gain, not loss.
      //
      // TODO: when Riot exposes a per-match double-LP flag in match-v5,
      // swap this heuristic for the canonical field.
      hasDoubleLp:
        item.participant.win &&
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
    const showPerMatchSquadBadge =
      !isSquad && squadMatchIds.has(item.matchId);

    return (
      <div key={item.rowId}>
        <div
          className="relative"
          data-scout-match={item.matchId}
          style={
            {
              // Shine colour for the jump-to-match focus glint: jade on a
              // win, red on a loss. Consumed by .scout-match-focus::after.
              ["--scout-shine" as any]: card.win
                ? "0, 217, 146"
                : "214, 51, 54",
            } as React.CSSProperties
          }
        >
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
      </div>
    );
  }
}

// Memoised: a section only re-renders when ITS props change. With the
// social object now stable (memoised in useMatchSocialBatch) and the
// section data coming from the dayGroups memo, unrelated parent renders
// (filter UI, scroll observer, …) no longer cascade into every section.
const PlayerSectionCard = memo(PlayerSectionCardImpl);

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

/* ─── matches tab content ───────────────────────────────────────────── */
/* ─── player filter chip bar (used on Matches tab) ──────────────────── */

type FilterMode =
  | { kind: "all" }
  | { kind: "single"; id: string }
  | { kind: "duo"; ids: [string, string] };

function PlayerFilterBar({
  lobby,
  filterMode,
  onFilterChange,
  countByPlayer,
  mainOnly,
  onToggleMainOnly,
}: {
  lobby: Lobby;
  filterMode: FilterMode;
  onFilterChange: (m: FilterMode) => void;
  countByPlayer: Map<string, number>;
  mainOnly: boolean;
  onToggleMainOnly: () => void;
}) {
  const players = [...lobby.players].sort((a, b) => a.orderIndex - b.orderIndex);
  const totalMatches = Array.from(countByPlayer.values()).reduce((n, v) => n + v, 0);

  // Drag-and-drop state. When the user is dragging a player chip, we
  // remember its ID so the drop target can build a duo from (dragged, dropped).
  // hoveredDropId is the chip currently being hovered over — used to draw a
  // brighter ring + scale on it so the affordance is obvious.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredDropId, setHoveredDropId] = useState<string | null>(null);

  const isActive = (pid: string): boolean => {
    if (filterMode.kind === "single") return filterMode.id === pid;
    if (filterMode.kind === "duo") return filterMode.ids.includes(pid);
    return false;
  };

  const handlePlayerClick = (pid: string) => {
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

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    onFilterChange({ kind: "duo", ids: [draggingId, targetId] });
  };

  // Currently-selected player id in single mode — drives the mobile
  // <select>'s value. "all" stands for the "no filter" option; duo
  // mode is desktop-only (you need drag-and-drop to form one), so the
  // select falls back to "all" while a duo is active.
  const mobileSelectValue =
    filterMode.kind === "single"
      ? filterMode.id
      : "all";

  // Per-click rotation accumulator for the mobile Main toggle. Each
  // tap adds a full 360° turn so the icon spins fluidly — both on
  // the activate AND deactivate transition — instead of snapping
  // back. Using cumulative degrees (not toggling between 0/360)
  // means consecutive taps don't reverse-spin.
  const [mainRotation, setMainRotation] = useState(0);

  return (
    <div
      className={cn(
        // Desktop keeps the dark glass card wrapper; mobile drops the
        // box entirely so the <select> + Main button float on the
        // page like a row of inputs (matches mobile-app conventions
        // better than a "card inside a card"). All the glass styling
        // is gated behind sm: so it only applies from tablet up.
        "h-12 flex items-center",
        "sm:px-3 sm:relative sm:overflow-hidden sm:rounded-md sm:bg-black/15 sm:backdrop-blur-lg sm:saturate-150 sm:shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.04)]"
      )}
    >
      {/* Backdrop glow — desktop only, mobile sheds the whole box. */}
      <div className="hidden sm:block absolute inset-0 pointer-events-none">
        <GlowBackdrop subtle />
      </div>

      {/* MOBILE — native <select>. Same logic as the tab picker
          above: closed-state is custom-styled to fit the glass-jade
          theme, open-state (the actual list) is delegated to the OS
          picker because iOS won't let you replace the bottom-sheet
          and Android won't let you replace the wheel. Duo mode + the
          drag-and-drop ritual are desktop-only. */}
      <div className="relative z-[1] flex sm:hidden items-center gap-2 w-full">
        <label className="relative flex-1 min-w-0">
          <select
            value={mobileSelectValue}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") onFilterChange({ kind: "all" });
              else onFilterChange({ kind: "single", id: v });
            }}
            className="w-full appearance-none bg-black/55 backdrop-blur-md ring-1 ring-flash/15 rounded-md pl-4 pr-9 py-2.5 text-[13px] font-chakrapetch font-bold tracking-[0.16em] uppercase text-flash/90 cursor-clicker focus:outline-none focus:ring-2 focus:ring-jade/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_3px_14px_rgba(0,0,0,0.35)]"
          >
            <option value="all">
              All players · {totalMatches}
            </option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName} · {countByPlayer.get(p.id) ?? 0}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-jade/55 text-[10px]"
          >
            ▼
          </span>
        </label>
        <button
          type="button"
          role="checkbox"
          aria-checked={mainOnly}
          onClick={() => {
            // Tap → flip the underlying state AND add a full 360° to
            // the rotation accumulator. Cumulative degrees keep the
            // spin going in the same direction every tap (no jarring
            // reverse-spin on the deactivate transition). The bouncy
            // cubic-bezier easing makes it feel snappy without being
            // cartoonish.
            onToggleMainOnly();
            setMainRotation((r) => r + 360);
          }}
          title="Show only matches played on each player's primary account"
          className={cn(
            "shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md cursor-clicker",
            mainOnly
              ? "bg-jade/[0.18] ring-1 ring-jade/65 text-jade shadow-[0_0_18px_rgba(0,217,146,0.30)]"
              : "bg-black/55 ring-1 ring-flash/15 text-flash/45 hover:text-flash/75 backdrop-blur-md"
          )}
          style={{
            transform: `rotate(${mainRotation}deg)`,
            transition:
              "transform 520ms cubic-bezier(0.34,1.56,0.64,1), background-color 220ms ease, box-shadow 220ms ease, color 220ms ease",
          }}
        >
          {mainOnly ? (
            <Check className="w-4 h-4" strokeWidth={3} />
          ) : (
            <span className="text-[11px] font-chakrapetch font-bold tracking-wide">
              M
            </span>
          )}
        </button>
      </div>

      {/* DESKTOP — the existing chip row + drag-and-drop duo mode. */}
      <div className="relative z-[1] hidden sm:flex items-center gap-3 w-full h-full">
        {/* Tab-style filter row: name + small count, underline accent on
            active. Horizontal scroll on overflow (scrollbar hidden) so
            the bar height stays fixed. */}
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide flex-1 min-w-0 h-full">
          <PlayerFilterTab
            active={filterMode.kind === "all"}
            accent={JADE}
            onClick={() => onFilterChange({ kind: "all" })}
            icon={<Users className="w-3.5 h-3.5" />}
            label="All"
            count={totalMatches}
          />
          {players.map((p, idx) => {
            const accent = p.color || JADE;
            const count = countByPlayer.get(p.id) ?? 0;
            const inDuo = filterMode.kind === "duo" && filterMode.ids.includes(p.id);
            // Show a "×" separator before this chip iff it's the second
            // member of an active duo — so the duo reads "Marco × Isac".
            const showDuoSep =
              inDuo &&
              filterMode.kind === "duo" &&
              filterMode.ids[1] === p.id &&
              idx > 0;
            return (
              <React.Fragment key={p.id}>
                {showDuoSep && (
                  <span className="text-flash/45 text-[14px] font-jetbrains -mx-2 select-none" aria-hidden>
                    ×
                  </span>
                )}
                <PlayerFilterTab
                  active={isActive(p.id)}
                  accent={accent}
                  onClick={() => handlePlayerClick(p.id)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", p.id);
                    e.dataTransfer.effectAllowed = "link";
                    setDraggingId(p.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setHoveredDropId(null);
                  }}
                  onDragOver={(e) => {
                    if (!draggingId || draggingId === p.id) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "link";
                    if (hoveredDropId !== p.id) setHoveredDropId(p.id);
                  }}
                  onDragLeave={() => {
                    if (hoveredDropId === p.id) setHoveredDropId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId =
                      e.dataTransfer.getData("text/plain") || draggingId || "";
                    if (draggedId && draggedId !== p.id) {
                      onFilterChange({ kind: "duo", ids: [draggedId, p.id] });
                    }
                    setDraggingId(null);
                    setHoveredDropId(null);
                  }}
                  isDropTarget={hoveredDropId === p.id}
                  isDragging={draggingId === p.id}
                  icon={
                    profileIconUrl(p.iconId) ? (
                      <img
                        src={profileIconUrl(p.iconId)!}
                        alt=""
                        className="w-[18px] h-[18px] rounded-full pointer-events-none"
                        style={{
                          border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                        }}
                      />
                    ) : (
                      <span
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-jetbrains font-bold pointer-events-none"
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
              </React.Fragment>
            );
          })}
        </div>

        {filterMode.kind === "duo" && (
          <button
            type="button"
            onClick={() => onFilterChange({ kind: "all" })}
            title="Clear duo filter"
            className="shrink-0 px-2 py-1 rounded-sm text-[9px] font-jetbrains uppercase tracking-[0.18em] text-jade ring-1 ring-jade/30 bg-jade/10 hover:bg-jade/20 cursor-clicker"
          >
            Duo ✕
          </button>
        )}

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
 * Quieter and more "navigation-like" than the old boxed chip approach.
 * Also handles its own drag-and-drop affordances so the user can build a
 * duo filter by dragging one chip onto another. */
function PlayerFilterTab({
  active,
  accent,
  onClick,
  icon,
  label,
  count,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDropTarget,
  isDragging,
}: {
  active: boolean;
  accent: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLButtonElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLButtonElement>) => void;
  isDropTarget?: boolean;
  isDragging?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "group relative inline-flex items-center gap-2 shrink-0 cursor-clicker pb-1.5 -mb-1.5 transition-all duration-150 rounded-sm",
        draggable && "active:cursor-grabbing",
        isDragging && "opacity-50",
        isDropTarget && "scale-110 -translate-y-px",
      )}
      style={
        isDropTarget
          ? {
              boxShadow: `0 0 0 2px color-mix(in srgb, ${accent} 70%, transparent), 0 0 14px color-mix(in srgb, ${accent} 55%, transparent)`,
              padding: "4px 8px",
              marginLeft: "-8px",
              marginRight: "-8px",
            }
          : undefined
      }
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

/** Batch-fetch the like + comment counts for a set of matches.
 *  Refreshes when the matchIds change or when refreshTick bumps.
 *  Used by MatchesTab to feed every MatchCard's `data.social` prop. */
type LikerInfo = {
  profileId: string;
  displayName: string;
  color: string | null;
};

function useMatchSocialBatch(
  slug: string,
  matchIds: string[],
  refreshTick: number
) {
  const [counts, setCounts] = useState<
    Record<string, { likes: number; comments: number }>
  >({});
  const [likers, setLikers] = useState<Record<string, LikerInfo[]>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());

  // Stable key for the matchIds set so the effect doesn't loop when
  // the array identity changes but contents don't.
  const idsKey = useMemo(() => [...matchIds].sort().join(","), [matchIds]);

  // Track which match ids we've already fetched social for, plus the last
  // refresh/slug we saw — so an infinite-scroll append only fetches the
  // NEW ids and merges them, instead of re-fetching the whole growing set
  // on every page (which was O(n²) querystrings AND blew past the backend's
  // 100-id cap once the feed got long).
  const fetchedRef = useRef<Set<string>>(new Set());
  const lastRefreshRef = useRef(refreshTick);
  const lastSlugRef = useRef(slug);

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split(",").filter(Boolean);
    if (ids.length === 0) return;

    // A bumped refreshTick (or a new lobby) means server counts may have
    // changed → re-fetch everything and replace. A pure idsKey change is
    // a scroll append → fetch only the unseen ids and merge.
    const isRefresh = refreshTick !== lastRefreshRef.current;
    const isSlugChange = slug !== lastSlugRef.current;
    lastRefreshRef.current = refreshTick;
    lastSlugRef.current = slug;
    if (isSlugChange) fetchedRef.current = new Set();

    const replace = isRefresh || isSlugChange;
    const toFetch = replace
      ? ids
      : ids.filter((id) => !fetchedRef.current.has(id));
    if (toFetch.length === 0) return;

    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const auth = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : undefined;

      // The endpoint caps `ids` at 100 — chunk defensively (a single
      // scroll page is far smaller, so this rarely loops).
      const CHUNK = 100;
      for (let i = 0; i < toFetch.length; i += CHUNK) {
        const chunk = toFetch.slice(i, i + CHUNK);
        const res = await fetch(
          `${API_BASE_URL}/api/scout/lobby/${slug}/match-social?ids=${encodeURIComponent(
            chunk.join(",")
          )}`,
          auth
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        const fresh = replace && i === 0; // first chunk of a full refresh clears
        setCounts((prev) =>
          fresh ? data.counts ?? {} : { ...prev, ...(data.counts ?? {}) }
        );
        setLikers((prev) =>
          fresh ? data.likers ?? {} : { ...prev, ...(data.likers ?? {}) }
        );
        setMyLikes((prev) => {
          const next = fresh ? new Set<string>() : new Set(prev);
          for (const id of (data.myLikes ?? []) as string[]) next.add(id);
          return next;
        });
        for (const id of chunk) fetchedRef.current.add(id);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [slug, idsKey, refreshTick]);

  // Local mutators so optimistic updates (after a like or comment)
  // propagate without re-fetching the whole batch.
  const bumpComment = useCallback((matchId: string, delta = 1) => {
    setCounts((prev) => ({
      ...prev,
      [matchId]: {
        likes: prev[matchId]?.likes ?? 0,
        comments: (prev[matchId]?.comments ?? 0) + delta,
      },
    }));
  }, []);

  const setLike = useCallback(
    (matchId: string, next: { iLiked: boolean; likeCount: number }) => {
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
    },
    []
  );

  // Memoise the returned object so its identity only changes when the
  // actual social data does — that's what lets the (memoised)
  // PlayerSectionCards skip re-rendering on unrelated parent renders.
  return useMemo(
    () => ({ counts, likers, myLikes, bumpComment, setLike }),
    [counts, likers, myLikes, bumpComment, setLike]
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

  // Social: batch-fetch per-match likes + comment counts. The signed-in
  // user (if any) decides whether we send the auth header so the
  // backend can also return their personal `myLikes` list.
  const { session } = useAuth();
  const myProfileId = session?.user?.id ?? null;
  const myClaimedPlayer = useMemo(
    () => lobby.players.find((p) => p.claimedByProfileId === myProfileId) ?? null,
    [lobby.players, myProfileId]
  );
  const canLike = !!myProfileId;
  // Commenting requires a claimed (certified) identity in this lobby —
  // always. No anonymous comments, regardless of verify_mode. The
  // backend enforces the same rule.
  const canComment = !!myClaimedPlayer;
  const matchIdsForSocial = useMemo(
    () => Array.from(new Set(items.map((i) => i.matchId))),
    [items]
  );
  const social = useMatchSocialBatch(
    lobby.slug,
    matchIdsForSocial,
    items.length
  );

  // Filter mode: { kind:'all' } = no filter, { kind:'single', id } = show one
  // player's matches, { kind:'duo', ids:[a,b] } = show only matches where both
  // lobby players were on the same team in the same game ("duos played"). The
  // duo mode is created by dragging one player chip onto another in the filter
  // bar — a fun way to slice for shared-game stats.
  type FilterMode =
    | { kind: "all" }
    | { kind: "single"; id: string }
    | { kind: "duo"; ids: [string, string] };
  const [filterMode, setFilterMode] = useState<FilterMode>({ kind: "all" });
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
  //
  // Duo mode: we want only matches where BOTH players were on the same team
  // in the same game. We dedupe by keeping only the row owned by player A
  // (the first of the pair) — otherwise the same match would render twice,
  // once for each player.
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (mainOnly && !primaryPuuids.has(it.participant.puuid)) return false;
      if (filterMode.kind === "single" && it.ownerPlayerId !== filterMode.id) return false;
      if (filterMode.kind === "duo") {
        const [a, b] = filterMode.ids;
        // Keep only one row per match
        if (it.ownerPlayerId !== a) return false;
        // Are A and B actually on the same team in this game?
        const myParticipant = it.allParticipants.find(
          (p) => p.puuid === it.participant.puuid
        );
        if (!myParticipant) return false;
        const myTeamId = myParticipant.teamId;
        if (myTeamId == null) return false;
        let bIsTeammate = false;
        for (const lp of it.lobbyPlayers) {
          if (lp.playerId !== b) continue;
          const otherPart = it.allParticipants.find((p) => p.puuid === lp.accountPuuid);
          if (otherPart?.teamId === myTeamId) {
            bIsTeammate = true;
            break;
          }
        }
        if (!bIsTeammate) return false;
      }
      return true;
    });
  }, [items, filterMode, mainOnly, primaryPuuids]);

  // puuid → riot account info (name / tag / region). Used by the scoreboard
  // to build summoner links even for matches ingested before riot_id_tagline
  // existed in DB.
  const lobbyAccountByPuuid = useMemo(() => {
    const map: Record<
      string,
      {
        riotName: string;
        riotTag: string;
        region: string;
        showVerifyBadge?: boolean;
        verifyGrade?: 0 | 1 | 2;
      }
    > = {};
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
      // Sort matches WITHIN each section by gameEnd desc as well, so
      // matches[0] (the visible row in collapsed mode) is always the
      // most recently-ended game. The feed API hands them to us in
      // gameCreation order, which can disagree with end time when game
      // durations differ.
      for (const sec of sections) {
        sec.matches.sort((a, b) => {
          const ae =
            new Date(a.gameCreation).getTime() +
            (a.gameDurationSeconds ?? 0) * 1000;
          const be =
            new Date(b.gameCreation).getTime() +
            (b.gameDurationSeconds ?? 0) * 1000;
          return be - ae;
        });
      }
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
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        countByPlayer={matchCountByPlayer}
        mainOnly={mainOnly}
        onToggleMainOnly={() => setMainOnly((v) => !v)}
      />

      {dayGroups.length === 0 && filterMode.kind !== "all" && (
        <div className={cn(glassDark, "p-10 text-center")}>
          <GlowBackdrop subtle />
          <div className="relative z-10 text-flash/40 text-sm">
            No matches for this player yet.
          </div>
        </div>
      )}

      {/* Filter-change animation: as filterMode flips, day sections and
          player section cards animate in/out instead of snapping. The
          outer LayoutGroup gives surviving cards a smooth slide into
          their new positions; AnimatePresence handles enter/exit so a
          section can fade out gracefully when it stops matching the
          filter (e.g. switching from "All" to a single player).

          `mode="popLayout"` keeps exiting elements out of the layout
          flow so siblings can move into their place immediately rather
          than waiting for the fade-out to finish. */}
      <LayoutGroup>
        <AnimatePresence mode="popLayout" initial={false}>
          {dayGroups.map((day, dayIdx) => (
            <motion.section
              key={day.label + day.sortKey}
              // No `layout` here: it forced framer to re-measure every
              // tracked node on every reflow (infinite-scroll append, card
              // expand) — the feed's main perf cost as it grows. Enter/exit
              // fades stay; the (rare) filter-change reorder just snaps into
              // place instead of sliding, which is a fine trade.
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(dayIdx > 0 && "pt-2")}
            >
              {/* Day separator — bold, full-width, glowing dot. Bigger
                  than before so the eye latches onto the day boundary. */}
              <div className="relative flex items-center gap-3 mb-5 px-1">
                <span
                  className="relative inline-flex items-center justify-center w-2 h-2 rounded-full"
                  style={{
                    background: JADE,
                    boxShadow:
                      "0 0 14px rgba(0,217,146,0.7), 0 0 4px rgba(0,217,146,0.9)",
                  }}
                />
                <h2 className="text-[13px] font-jetbrains tracking-[0.3em] uppercase text-flash font-bold">
                  {day.label}
                </h2>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-jade/30 via-flash/10 to-transparent" />
                <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/35">
                  {day.sections.reduce((n, s) => n + s.matches.length, 0)}{" "}
                  {day.sections.reduce((n, s) => n + s.matches.length, 0) === 1
                    ? "match"
                    : "matches"}
                </span>
              </div>

              <div className="flex flex-col gap-11">
                <AnimatePresence mode="popLayout" initial={false}>
                  {day.sections.map((section, idx) => {
                    const sectionMembers: SectionMember[] = section.members
                      .map((m) => {
                        const player = playerById.get(m.playerId);
                        if (!player) return null;
                        const account =
                          player.accounts.find((a) => a.puuid === m.puuid) ??
                          null;
                        return { player, account };
                      })
                      .filter((x): x is SectionMember => x !== null);
                    if (sectionMembers.length === 0) return null;
                    const key = `${day.sortKey}:${idx}:${section.members
                      .map((m) => `${m.playerId}-${m.puuid}`)
                      .join("+")}`;
                    return (
                      <motion.div
                        key={key}
                        // `layout` removed (see the motion.section note) —
                        // the section's own grid-rows expand animation +
                        // normal flow already keep neighbours moving smoothly.
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -12 }}
                        transition={{
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <PlayerSectionCard
                          members={sectionMembers}
                          matches={section.matches}
                          itemsByMatch={section.itemsByMatch}
                          squadMatchIds={squadMatchIds}
                          lobbyAccountByPuuid={lobbyAccountByPuuid}
                          lobbySlug={lobby.slug}
                          social={social}
                          canLike={canLike}
                          canComment={canComment}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </LayoutGroup>

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

// Mirrors backend ladderScore: per-tier offset is 400 LP (4 divisions ×
// 100), per-division offset is (idx − 1) × 100 with IV=1 / III=2 / II=3 /
// I=4 so IV contributes 0 and I contributes 300. Master+ is divisionless
// and just adds raw LP onto where DIAMOND I 100 ended (2800).
// Accepts any shape with the three fields that contribute to the
// score — wins/losses are tracked on the full CurrentRank but aren't
// part of the math, so callers passing the slim account-side rank
// (which omits them) type-check cleanly.
function ladderScoreFE(
  rank: Pick<CurrentRank, "tier" | "rankDivision" | "lp"> | null
): number {
  if (!rank) return -1; // unranked sinks
  const t = LADDER_TIER_INDEX[rank.tier.toUpperCase()] ?? 0;
  // MASTER index 7 — anything ≥ 7 ignores division.
  if (t >= 7) return 7 * 400 + rank.lp;
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
const DIVISION_LABELS: Record<number, string> = {
  1: "IV",
  2: "III",
  3: "II",
  4: "I",
};
function rankFromLadderScoreFE(
  score: number
): { tier: string; rankDivision: string | null; lp: number } | null {
  if (!isFinite(score) || score < 0) return null;
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

  // Group sessions by gameId — duos / flex stacks should render as a
  // single card with both members shown, not two cards for the same game.
  const groups: LiveSessionGroupFE[] = (() => {
    const byGame = new Map<number, LiveSessionGroupFE>();
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
          {groups.length} {groups.length === 1 ? "session" : "sessions"}
        </span>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-jade/30 via-flash/10 to-transparent" />
        {polledAt > 0 && (
          <span className="text-[9px] font-jetbrains tracking-wider text-flash/30 tabular-nums">
            POLLED {Math.max(0, Math.floor((now - polledAt) / 1000))}s AGO
          </span>
        )}
      </div>

      {groups.map((g) => (
        <LiveSessionCard
          key={g.gameId}
          group={g}
          championIdToName={championIdToName}
          now={now}
        />
      ))}
    </div>
  );
}

// Aggregated view: 1+ lobby members in the same live game, merged so
// we don't render duplicate cards for duos / flex stacks.
type LiveSessionMemberFE = {
  playerId: string;
  displayName: string;
  color: string | null;
  iconId: number | null;
  accountPuuid: string;
  region: string;
  riotName: string;
  riotTag: string;
  championId: number;
};
type LiveSessionGroupFE = {
  gameId: number;
  gameQueueConfigId: number;
  gameMode: string;
  gameType: string;
  gameStartTime: number;
  gameLength: number;
  mapId: number;
  participants: LiveParticipantSlimFE[];
  bansBlue: number[];
  bansRed: number[];
  members: LiveSessionMemberFE[];
};

function LiveSessionCard({
  group,
  championIdToName,
  now,
}: {
  group: LiveSessionGroupFE;
  championIdToName: Record<string, string>;
  now: number;
}) {
  const isMulti = group.members.length > 1;
  // Splash + accent come from the first member.
  const lead = group.members[0];
  const leadChampName =
    championIdToName[String(lead.championId)] ?? String(lead.championId);
  const splash = cdnSplashUrl(normalizeChampName(leadChampName));
  const queueLabel =
    LIVE_QUEUE_LABELS[group.gameQueueConfigId] ?? `QUEUE ${group.gameQueueConfigId}`;
  const accent = lead.color || JADE;

  // gameStartTime is 0 until loading screen ends. While 0, fall back to
  // the snapshot gameLength.
  const elapsedSec =
    group.gameStartTime > 0
      ? Math.max(0, Math.floor((now - group.gameStartTime) / 1000))
      : group.gameLength;
  const mins = Math.floor(elapsedSec / 60);
  const secs = (elapsedSec % 60).toString().padStart(2, "0");

  const blue = group.participants.filter((p) => p.teamId === 100);
  const red = group.participants.filter((p) => p.teamId === 200);

  // For the scoreboard highlight, mark ALL lobby members as "active" so
  // the user sees both rows lit up in the duo case.
  const activePuuids = new Set(group.members.map((m) => m.accountPuuid));

  const leadSummonerHref = `/summoners/${lead.region.toLowerCase()}/${encodeURIComponent(
    lead.riotName
  )}-${encodeURIComponent(lead.riotTag)}`;
  const liveGameHref = `${leadSummonerHref}/livegame`;

  return (
    <div className="relative overflow-hidden rounded-md bg-black/30 backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.06)]">
      {/* Splash background, very subdued */}
      <div className="absolute inset-0 z-0">
        <img
          src={splash}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
          style={{ objectPosition: "center 25%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-liquirice/95 via-liquirice/80 to-liquirice/65" />
      </div>

      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] z-[1]"
        style={{
          background: `color-mix(in srgb, ${accent} 75%, transparent)`,
          boxShadow: `0 0 10px color-mix(in srgb, ${accent} 40%, transparent)`,
        }}
      />

      <div className="relative z-[2] p-3 flex items-stretch gap-3">
        {/* Champion portrait(s) + lobby player avatar(s). When the lobby
            has 2+ members in the same game we stack their portraits with
            a subtle ↔ chain indicator so it's instantly readable as a duo. */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          {isMulti && (
            <span
              className="text-[8.5px] font-jetbrains tracking-[0.22em] uppercase font-bold leading-none"
              style={{ color: accent }}
            >
              {group.members.length === 2 ? "Duo" : `${group.members.length}× Stack`}
            </span>
          )}
          <div
            className={cn(
              "flex shrink-0 items-center",
              isMulti ? "flex-col gap-2" : "gap-1"
            )}
          >
            {group.members.map((m, i) => (
              <React.Fragment key={m.playerId}>
                {i > 0 && isMulti && (
                  <span className="text-jade/45 text-[10px] leading-none -my-0.5">+</span>
                )}
                <MemberPortrait
                  member={m}
                  championName={
                    championIdToName[String(m.championId)] ?? String(m.championId)
                  }
                />
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Middle: queue + names + champions + elapsed timer */}
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

          {/* One row per member: name + champion. Duo rows stay stacked
              tight so the card height stays compact. */}
          <div className={cn("mt-0.5 flex flex-col", isMulti ? "gap-0.5" : "")}>
            {group.members.map((m) => {
              const champ =
                championIdToName[String(m.championId)] ?? String(m.championId);
              const summonerHref = `/summoners/${m.region.toLowerCase()}/${encodeURIComponent(
                m.riotName
              )}-${encodeURIComponent(m.riotTag)}`;
              return (
                <div
                  key={m.playerId}
                  className="flex items-baseline gap-2 min-w-0"
                >
                  <Link
                    to={summonerHref}
                    className={cn(
                      "font-chakrapetch font-bold text-flash hover:text-jade transition-colors tracking-tight truncate cursor-clicker leading-tight",
                      isMulti ? "text-[13px]" : "text-[16px]"
                    )}
                  >
                    {m.riotName}
                    <span
                      className={cn(
                        "text-flash/35 font-medium ml-0.5",
                        isMulti ? "text-[10px]" : "text-[12px]"
                      )}
                    >
                      #{m.riotTag}
                    </span>
                  </Link>
                  <span className="text-flash/35 text-[10px] shrink-0">on</span>
                  <span
                    className={cn(
                      "font-chakrapetch font-bold text-jade/85 truncate leading-tight",
                      isMulti ? "text-[12px]" : "text-[14px]"
                    )}
                  >
                    {champ}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Teams scoreboard — uses full remaining width now */}
          <div className="mt-1.5 grid grid-cols-2 gap-x-5 text-[10.5px] font-jetbrains">
            <TeamRoster
              participants={blue}
              accent="#5fa8ff"
              teamLabel="BLUE"
              championIdToName={championIdToName}
              activePuuids={activePuuids}
              align="left"
            />
            <TeamRoster
              participants={red}
              accent="#ef4444"
              teamLabel="RED"
              championIdToName={championIdToName}
              activePuuids={activePuuids}
              align="right"
            />
          </div>

          {/* Bans row */}
          <div className="mt-2 flex items-center gap-4">
            <BansStrip
              bans={group.bansBlue}
              accent="#5fa8ff"
              championIdToName={championIdToName}
              align="left"
            />
            <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/12 via-flash/20 to-flash/12" />
            <BansStrip
              bans={group.bansRed}
              accent="#ef4444"
              championIdToName={championIdToName}
              align="right"
            />
          </div>
        </div>
      </div>

      {/* Spectate button — pinned top-right of the card. For multi-member
          groups we link to the lead's livegame; it's the same in-game
          session anyway. */}
      <Link
        to={liveGameHref}
        className="absolute top-3 right-3 z-[3] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] border border-jade/35 bg-jade/[0.10] text-jade hover:bg-jade/[0.20] hover:shadow-[0_0_12px_rgba(0,217,146,0.25)] text-[10px] font-jetbrains tracking-[0.22em] uppercase font-bold cursor-clicker transition-all"
      >
        <Eye className="w-3 h-3" />
        Spectate
        <span className="text-jade/45 text-[8.5px] ml-1">{lead.region}</span>
      </Link>
    </div>
  );
}

// Single portrait: champion icon with the lobby player's profile icon
// stuck in the corner + the player's display name underneath.
function MemberPortrait({
  member,
  championName,
}: {
  member: LiveSessionMemberFE;
  championName: string;
}) {
  const accent = member.color || JADE;
  const champIcon = `${cdnBaseUrl()}/img/champion/${normalizeChampName(championName)}.png`;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[52px] h-[52px]">
        <img
          src={champIcon}
          alt={championName}
          className="w-[52px] h-[52px] rounded-md shadow-[0_3px_10px_rgba(0,0,0,0.5)] ring-1 ring-jade/25"
        />
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden ring-2 ring-liquirice bg-black"
          style={{ boxShadow: `0 0 6px color-mix(in srgb, ${accent} 50%, transparent)` }}
        >
          {profileIconUrl(member.iconId) ? (
            <img
              src={profileIconUrl(member.iconId)!}
              alt=""
              className="w-full h-full"
            />
          ) : (
            <span
              className="w-full h-full flex items-center justify-center text-[10px] font-jetbrains font-bold"
              style={{ color: accent, background: "rgba(0,0,0,0.6)" }}
            >
              {member.displayName.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      <span
        className="text-[9.5px] font-jetbrains tracking-[0.18em] uppercase font-bold leading-none"
        style={{ color: accent }}
      >
        {member.displayName}
      </span>
    </div>
  );
}

function TeamRoster({
  participants,
  accent,
  teamLabel,
  championIdToName,
  activePuuids,
  align,
}: {
  participants: LiveParticipantSlimFE[];
  accent: string;
  teamLabel: string;
  championIdToName: Record<string, string>;
  // Set of "the lobby players whose perspective this card is from". For
  // a duo / stack card more than one row in the team scoreboard should
  // light up jade.
  activePuuids: Set<string>;
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

                  {/* Name — riot name big, lobby player label small.
                      Both use chakrapetch so the leaderboard reads with
                      the same display family used elsewhere on champion
                      / player names. */}
                  <div className="min-w-0 relative z-10 flex flex-col leading-tight">
                    <Link
                      to={`/summoners/${p.region.toLowerCase()}/${encodeURIComponent(
                        p.riotName
                      )}-${encodeURIComponent(p.riotTag)}`}
                      className="text-[14px] text-flash/90 font-chakrapetch font-bold tracking-tight truncate block group-hover:text-jade group-hover:underline underline-offset-2 transition-colors duration-200 cursor-clicker"
                    >
                      {p.riotName}
                      <span className="text-flash/30 font-medium">#{p.riotTag}</span>
                    </Link>
                    <span className="text-[10px] font-chakrapetch font-semibold tracking-wide uppercase text-flash/45 truncate mt-0.5">
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

      {/* Bounty leaderboard — all-time claim count per player. */}
      <BountyLeaderboardPanel slug={slug} refreshTick={refreshTick} />
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

function scoreToRankShort(score: number): string {
  if (score < 0) return "—";
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
function scoreParts(score: number): { rankShort: string; lpInDiv: number } {
  if (score < 0) return { rankShort: "—", lpInDiv: 0 };
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
function lpYTicks(lo: number, hi: number): Array<{ score: number; label: string }> {
  const out: Array<{ score: number; label: string }> = [];
  for (let t = 0; t < LP_TIERS_ORDER.length; t++) {
    if (t >= 7) {
      const s = t * LP_PER_TIER_FE;
      if (s >= lo && s <= hi) {
        out.push({ score: s, label: LP_TIER_ABBR[LP_TIERS_ORDER[t]] });
      }
    } else {
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

  // Auto-generated palette for players whose color is null in the
  // backend payload — without it every line falls back to JADE and the
  // chart turns into a single tangle. Hand-picked HSL hues that read
  // distinctly against the liquirice background.
  const AUTO_PALETTE = useMemo(
    () => [
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
    ],
    []
  );

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
    data.players.forEach((p, pIdx) => {
      if (p.accounts.length === 0) return;
      // If the backend gave us a color, use it; otherwise pick from the
      // palette based on the player's index in the lobby so the assignment
      // is stable across renders.
      const accent = p.color || AUTO_PALETTE[pIdx % AUTO_PALETTE.length];
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
        return;
      }
      if (p.playerId !== selectedPlayerId) return;

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
    });
    return out;
  }, [data, selectedPlayerId, selectedAccountPuuid, AUTO_PALETTE]);

  // Chart geometry. Tall enough that 7-8 tier divisions (the typical
  // y-axis range when the lobby spans Iron → Master) have room to
  // breathe. Every stroke uses vectorEffect="non-scaling-stroke" so
  // line widths stay consistent regardless of container scale.
  const CHART = { W: 1000, H: 420 };

  const {
    minY,
    maxY,
    yTicks,
    lines,
    hoverPoints,
  } = useMemo(() => {
    type ChartLineGeom = {
      lineId: string;
      color: string;
      // Each visible run (snapshots between null gaps) becomes one
      // smoothed path. dots are every real datapoint inside the runs.
      runs: Array<{ pathLine: string; pathArea: string; pts: Array<{ x: number; y: number; score: number; bucket: number }> }>;
      finalY: number | null;
      finalScore: number | null;
      dashArray: string | null;
      opacity: number;
      label: string;
    };

    if (!data || data.buckets.length === 0 || visibleLines.length === 0) {
      return {
        minY: 0,
        maxY: 0,
        yTicks: [] as Array<{ score: number; label: string }>,
        lines: [] as ChartLineGeom[],
        hoverPoints: [] as Array<{ x: number; y: number; color: string; lineId: string; score: number; prevScore: number | null; label: string }>,
      };
    }
    const { W, H } = CHART;
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
    // Snap [lo, hi] to the nearest tier-division boundary inside, then add a
    // tiny breath so the line never lives on the top/bottom edge.
    const span = Math.max(50, hi - lo);
    const pad = Math.max(40, span * 0.12);
    lo = Math.max(0, lo - pad);
    hi = hi + pad;
    if (lo === hi) hi = lo + 100;

    const x = (i: number) => (N === 1 ? W / 2 : (i / (N - 1)) * W);
    const y = (score: number) => H - ((score - lo) / (hi - lo)) * H;

    // Step-after path: between two snapshots the LP is "the last known
    // value" — it doesn't smoothly interpolate, it stays put until the
    // next game changes it. So the truthful render is a staircase:
    // horizontal at y_i until x_{i+1}, then vertical to y_{i+1}.
    //
    // (We use straight L commands so the stair corners are sharp; round
    // joins on the stroke soften them just a touch on hover.)
    function stepPath(pts: Array<{ x: number; y: number }>): string {
      if (pts.length === 0) return "";
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        // Horizontal first (carry previous LP to new x), then vertical
        // (snap to new LP). That's the "step-after" convention.
        d += ` L ${pts[i].x.toFixed(2)} ${pts[i - 1].y.toFixed(2)}`;
        d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
      }
      return d;
    }

    const lines: ChartLineGeom[] = visibleLines.map((ln) => {
      // Group consecutive non-null buckets into runs so a long
      // unranked gap doesn't connect with a straight line through it.
      type Run = { pts: Array<{ x: number; y: number; score: number; bucket: number }> };
      const runs: Run[] = [];
      let cur: Run | null = null;
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
        const areaPath =
          r.pts.length >= 2
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
      let finalScore: number | null = null;
      let finalY: number | null = null;
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
    const hoverPoints: Array<{ x: number; y: number; color: string; lineId: string; score: number; prevScore: number | null; label: string }> = [];
    if (hb != null && hb >= 0 && hb < N) {
      for (const ln of visibleLines) {
        const v = ln.account.scores[hb];
        if (v == null) continue;
        // Find the previous non-null snapshot so the tooltip can show
        // the precise LP delta at this point ("+15 LP since last game").
        let prevScore: number | null = null;
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
              viewBox={`0 0 ${CHART.W} ${CHART.H}`}
              preserveAspectRatio="none"
              className="w-full h-[260px] block lp-chart"
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
              {/* Soft gradient defs — one fill gradient per line color so
                  the under-curve area fades from accent to transparent. */}
              <defs>
                {lines.map((ln) => (
                  <linearGradient
                    key={`g-${ln.lineId}`}
                    id={`lp-grad-${ln.lineId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={ln.color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ln.color} stopOpacity={0} />
                  </linearGradient>
                ))}
                <filter id="lp-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Tier-edge horizontal grid (every tick gets a faint line,
                  every TIER boundary gets a slightly stronger one). */}
              {yTicks.map((t) => {
                const range = maxY - minY || 1;
                const yy = CHART.H - ((t.score - minY) / range) * CHART.H;
                if (yy < -1 || yy > CHART.H + 1) return null;
                const isTierEdge = t.score % LP_PER_TIER_FE === 0;
                return (
                  <line
                    key={t.score}
                    x1="0"
                    x2={CHART.W}
                    y1={yy}
                    y2={yy}
                    stroke={isTierEdge ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)"}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {/* Area fills (only when a single line is visible — keeps
                  the all-players overlay readable). */}
              {lines.length === 1 &&
                lines.map((ln) =>
                  ln.runs.map((r, idx) =>
                    r.pathArea ? (
                      <path
                        key={`area-${ln.lineId}-${idx}`}
                        d={r.pathArea}
                        fill={`url(#lp-grad-${ln.lineId})`}
                        opacity={0.95}
                      />
                    ) : null
                  )
                )}

              {/* Lines: smooth monotone-cubic. Strokes use vectorEffect so
                  they stay the same thickness no matter how the SVG is
                  scaled by the container. The drop-shadow glow + the
                  filter give the chart its cyber sheen. */}
              {lines.map((ln) =>
                ln.runs.map((r, idx) => (
                  <path
                    key={`line-${ln.lineId}-${idx}`}
                    d={r.pathLine}
                    fill="none"
                    stroke={ln.color}
                    strokeWidth={lines.length === 1 ? 2.8 : 2.2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={ln.dashArray ?? undefined}
                    opacity={ln.opacity}
                    vectorEffect="non-scaling-stroke"
                    style={{
                      filter: `drop-shadow(0 0 4px color-mix(in srgb, ${ln.color} 55%, transparent))`,
                      // Entry animation — sweep stroke from left to right
                      // using a CSS animation on stroke-dasharray. Single
                      // line per element so it works even for runs.
                      animation: `lp-draw 700ms cubic-bezier(.4,0,.2,1) forwards`,
                      strokeDasharray: 2000,
                      strokeDashoffset: 2000,
                    }}
                  />
                ))
              )}

              {/* Per-snapshot nodes: every real datapoint gets a 3-layer
                  cyber pip — soft outer glow + accent-coloured ring +
                  dark inner core with accent stroke. On hover the layers
                  enlarge & brighten so the node "pops" without a separate
                  hover circle. */}
              {lines.length === 1 &&
                lines.map((ln) =>
                  ln.runs.flatMap((r) =>
                    r.pts.map((pt) => {
                      const isHovered = hoverBucket === pt.bucket;
                      return (
                        <g
                          key={`pt-${ln.lineId}-${pt.bucket}`}
                          style={{
                            animation: "lp-dot-pop 480ms cubic-bezier(.34,1.56,.64,1) forwards",
                            transformOrigin: `${pt.x}px ${pt.y}px`,
                            animationDelay: `${380 + pt.bucket * 18}ms`,
                            opacity: 0,
                            cursor: "pointer",
                            transition: "all 160ms ease-out",
                          }}
                        >
                          {/* Soft outer glow */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 11 : 7}
                            fill={ln.color}
                            opacity={isHovered ? 0.22 : 0.12}
                          />
                          {/* Mid accent ring */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 4.2}
                            fill={ln.color}
                            opacity={isHovered ? 0.5 : 0.32}
                          />
                          {/* Dark core w/ accent stroke */}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 3 : 2.2}
                            fill="#040A0C"
                            stroke={ln.color}
                            strokeWidth={isHovered ? 2 : 1.5}
                            vectorEffect="non-scaling-stroke"
                          />
                        </g>
                      );
                    })
                  )
                )}

              {/* End-of-line "current rank" markers — pulse + halo */}
              {lines.map((ln) =>
                ln.finalY != null ? (
                  <g key={`end-${ln.lineId}`} opacity={ln.opacity}>
                    <circle
                      cx={CHART.W - 10}
                      cy={ln.finalY}
                      r={14}
                      fill={ln.color}
                      opacity={0.12}
                    />
                    <circle
                      cx={CHART.W - 10}
                      cy={ln.finalY}
                      r={8}
                      fill={ln.color}
                      opacity={0.32}
                    />
                    <circle
                      cx={CHART.W - 10}
                      cy={ln.finalY}
                      r={4}
                      fill={ln.color}
                      stroke="#040A0C"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ) : null
              )}

              {/* Hover crosshair. For single-line view the base nodes
                  already enlarge on hover (see above), so we only render
                  extra hover pips for the multi-line overlay where the
                  base nodes are hidden. */}
              {hoverBucket != null && data && hoverPoints.length > 0 && (
                <g>
                  <line
                    x1={hoverPoints[0].x}
                    x2={hoverPoints[0].x}
                    y1={0}
                    y2={CHART.H}
                    stroke="rgba(0,217,146,0.45)"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                  />
                  {lines.length > 1 &&
                    hoverPoints.map((pt) => (
                      <g key={`hover-${pt.lineId}`}>
                        <circle cx={pt.x} cy={pt.y} r={11} fill={pt.color} opacity={0.22} />
                        <circle cx={pt.x} cy={pt.y} r={6} fill={pt.color} opacity={0.5} />
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={3}
                          fill="#040A0C"
                          stroke={pt.color}
                          strokeWidth={2}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    ))}
                </g>
              )}
            </svg>

            {/* Floating cyber tooltip — pinned over the hovered node, shows
                precise LP and the delta from the previous snapshot. The
                overlay matches the SVG's bounds (h-[260px], same left/right
                inset) so % positions line up with the SVG viewBox. */}
            {hoverBucket != null && data && hoverPoints.length > 0 && (() => {
              const sortedPts = [...hoverPoints].sort((a, b) => a.y - b.y);
              const anchor = sortedPts[0];
              const leftPct = (anchor.x / CHART.W) * 100;
              const topPx = Math.max(
                26,
                Math.min(234, (anchor.y / CHART.H) * 260)
              );
              const placeRight = leftPct < 55;
              return (
                <div className="absolute left-9 right-0 top-0 h-[260px] pointer-events-none z-10">
                  <div
                    className="absolute"
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPx}px`,
                      transform: placeRight
                        ? "translate(14px, -50%)"
                        : "translate(calc(-100% - 14px), -50%)",
                      animation: "lp-tip-in 180ms ease-out",
                    }}
                  >
                    <div
                      className={cn(
                        glassDark,
                        "px-3 py-2 min-w-[180px] border border-flash/10"
                      )}
                      style={{
                        boxShadow:
                          "0 8px 24px -8px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
                      }}
                    >
                      <div className="text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mb-1.5">
                        {data.buckets[hoverBucket]?.label}
                      </div>
                      <div className="flex flex-col gap-1">
                        {hoverPoints.map((pt) => {
                          const delta =
                            pt.prevScore != null
                              ? pt.score - pt.prevScore
                              : null;
                          return (
                            <div
                              key={pt.lineId}
                              className="flex items-center gap-2"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  background: pt.color,
                                  boxShadow: `0 0 6px ${pt.color}`,
                                }}
                              />
                              <span className="text-[10px] font-jetbrains text-flash/70 mr-auto truncate max-w-[110px]">
                                {pt.label}
                              </span>
                              <span
                                className="font-bold text-[11px] font-chakrapetch tabular-nums uppercase tracking-wider"
                                style={{ color: pt.color }}
                              >
                                {scoreToRankShort(pt.score)}
                              </span>
                              <span className="text-[10px] text-flash/55 tabular-nums font-jetbrains">
                                {pt.score % 100}<span className="text-flash/30 ml-0.5">LP</span>
                              </span>
                              {delta != null && delta !== 0 && (
                                <span
                                  className={cn(
                                    "text-[9px] tabular-nums font-jetbrains font-bold pl-1.5 ml-0.5 border-l border-flash/10",
                                    delta > 0
                                      ? "text-jade"
                                      : "text-red-400/90"
                                  )}
                                >
                                  {delta > 0 ? "+" : ""}
                                  {delta}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Animations live as a styled-style tag here so we don't have
                to touch the global stylesheet. */}
            <style>{`
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
            `}</style>

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

            {/* (hover tooltip moved into the SVG overlay above — it floats
                next to the hovered node instead of sitting in this row.) */}
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
  const [topDuoStreak, setTopDuoStreak] = useState<LeaderboardDuoStreak | null>(null);
  const [topDuoWinrate, setTopDuoWinrate] = useState<LeaderboardDuoWinrate | null>(null);
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
      const localMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      params.set("since", localMidnight.toISOString());
    }
    fetch(`${API_BASE_URL}/api/scout/leaderboard/${slug}?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
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

  return (
    <div className="flex flex-col gap-3">
      {/* Daily Bounty — sits at the very top of the sidebar so the
          metallic card is the first thing the eye lands on. State
          machine: ACTIVE shows the challenge + threshold; CLAIMED
          shows the winner & value. */}
      <DailyBountyBox slug={slug} refreshTick={refreshTick} />

      {/* Window selector — scopes the stat widgets below to today /
          week / all-time. */}
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

      {/* Top Player (KDA) — always a single player. The "Top Player"
          spot belongs to one MVP; duos don't make sense here. */}
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

      {/* Best Winrate — swaps to duo when a pair's joint WR exceeds
          the best individual's. */}
      <TopWinrateOrDuoBox
        loading={loading}
        leaderboard={leaderboard}
        topDuoWinrate={topDuoWinrate}
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

      {/* Longest Streak — the new widget. Picks the entity (individual
          or duo) with the longest consecutive-wins run in the window.
          Duo wins on tie. */}
      <LongestStreakBox
        loading={loading}
        leaderboard={leaderboard}
        topDuoStreak={topDuoStreak}
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

function adaptiveMinGames(rows: LeaderboardAccount[]): number {
  const maxGames = rows.reduce((m, p) => (p.games > m ? p.games : m), 0);
  return Math.max(3, Math.ceil(maxGames * 0.25));
}

function lobbyWeightedAvgKda(rows: LeaderboardAccount[]): number {
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
function wilsonLowerBound(wins: number, games: number, z: number = 1.96): number {
  if (games <= 0) return 0;
  const phat = wins / games;
  const z2 = z * z;
  const denom = 1 + z2 / games;
  const center = phat + z2 / (2 * games);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * games)) / games);
  return (center - margin) / denom;
}

function pickPlayerOfDay(rows: LeaderboardAccount[]) {
  if (!rows.length) return null;

  const min = adaptiveMinGames(rows);
  let elig = rows.filter((p) => p.games >= min);
  if (!elig.length) elig = rows.filter((p) => p.games >= 1);
  if (!elig.length) return null;

  const priorKda = lobbyWeightedAvgKda(rows);
  const PRIOR_WEIGHT = 10;
  return [...elig]
    .map((p) => ({
      p,
      score:
        (p.avgKda * p.games + priorKda * PRIOR_WEIGHT) /
        (p.games + PRIOR_WEIGHT),
    }))
    .sort((a, b) => b.score - a.score)[0].p;
}

function pickHighestLp(rows: LeaderboardAccount[]) {
  const filt = rows.filter((p) => p.balance !== 0);
  if (!filt.length) return null;
  return [...filt].sort((a, b) => b.balance - a.balance)[0];
}

function pickBestWinrate(rows: LeaderboardAccount[]) {
  if (!rows.length) return null;

  const min = adaptiveMinGames(rows);
  let elig = rows.filter((p) => p.games >= min);
  if (!elig.length) elig = rows.filter((p) => p.games >= 1);
  if (!elig.length) return null;

  return [...elig]
    .map((p) => ({
      p,
      score: wilsonLowerBound(p.wins, p.games),
    }))
    .sort((a, b) => b.score - a.score)[0].p;
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
              <span className="text-[14px] font-chakrapetch font-bold text-flash truncate tracking-[0.01em]">
                {player.riotName}
                <span className="text-flash/30 font-normal">#{player.riotTag}</span>
              </span>
              {player.currentRank ? (
                // Rank as `[icon] LP` — tighter and more recognisable
                // than the old `GOLD 2 · 12G ...` text row. Stats live
                // beside it as a separator-divided sub-chip.
                <span className="flex items-center mt-1 truncate">
                  <img
                    src={getRankImage(player.currentRank.tier)}
                    alt={player.currentRank.tier}
                    className="w-[22px] h-[22px] object-contain shrink-0 -ml-0.5 mr-1"
                  />
                  {/* Division (I/II/III/IV) — Master+ tiers have null
                      rankDivision and skip this label. Coloured per
                      tier so the chip matches the icon at a glance. */}
                  {player.currentRank.rankDivision && (
                    <span
                      className={cn(
                        "font-chakrapetch font-bold text-[12px] leading-none mr-1.5",
                        rankColorClass(player.currentRank.tier)
                      )}
                    >
                      {player.currentRank.rankDivision}
                    </span>
                  )}
                  <span className="font-chakrapetch font-bold tabular-nums text-[14px] text-flash/90 leading-none">
                    {player.currentRank.lp.toLocaleString()}
                    <span className="text-[10px] text-flash/45 ml-1 font-medium">LP</span>
                  </span>
                  <span className="text-flash/25 text-[11px] leading-none mx-2">·</span>
                  <span className="text-[10px] font-jetbrains tracking-[0.12em] uppercase text-flash/50 truncate">
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

/* ─── duo stat box — same chrome as LeaderboardStatBox, two avatars ─── */
//
// Used when a widget swaps to duo display because a pair's metric beats
// (or ties) the best individual. Renders two overlapping avatars on the
// left, joined names + shared-game metadata, and the metric on the right.

function LeaderboardDuoStatBox({
  icon,
  label,
  duo,
  highlightValue,
  highlightLabel,
  subText,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  duo: LeaderboardDuo;
  highlightValue: string;
  highlightLabel: string;
  subText?: string;
  loading: boolean;
}) {
  const colorA = duo.colorA || JADE;
  const colorB = duo.colorB || JADE;
  const renderAvatar = (
    iconId: number | null,
    color: string,
    name: string,
    extraClass: string
  ) => {
    const url = profileIconUrl(iconId);
    if (url) {
      return (
        <img
          src={url}
          alt=""
          className={cn("w-9 h-9 rounded-full shrink-0", extraClass)}
          style={{
            boxShadow: `0 0 12px color-mix(in srgb, ${color} 30%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
          }}
        />
      );
    }
    return (
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
          extraClass
        )}
        style={{
          background: "rgba(0,0,0,0.4)",
          border: `1.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        }}
      >
        <span
          className="text-[13px] font-jetbrains font-bold"
          style={{ color }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      </div>
    );
  };
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
          <span className="text-[8px] font-jetbrains tracking-[0.28em] uppercase font-bold px-1.5 py-[3px] rounded-sm text-jade bg-jade/[0.14] border border-jade/35">
            DUO
          </span>
        </div>

        {loading ? (
          <div className="h-[58px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-jade/60" />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Overlapping avatars — the classic "duo" visual cue. */}
            <div className="flex shrink-0">
              {renderAvatar(duo.iconIdA, colorA, duo.displayNameA, "")}
              {renderAvatar(
                duo.iconIdB,
                colorB,
                duo.displayNameB,
                "-ml-3 ring-2 ring-liquirice/60"
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1 ml-1">
              <span className="text-[13px] font-chakrapetch font-bold text-flash truncate leading-tight tracking-[0.01em]">
                <span style={{ color: colorA }}>{duo.displayNameA}</span>
                <span className="text-flash/35 mx-1 font-normal">+</span>
                <span style={{ color: colorB }}>{duo.displayNameB}</span>
              </span>
              <span className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/40 mt-1 truncate">
                {subText ?? `${duo.sharedGames}G shared · ${duo.sharedWins}W`}
              </span>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[20px] font-chakrapetch font-bold tabular-nums text-jade leading-none">
                {highlightValue}
              </span>
              <span className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 mt-1">
                {highlightLabel}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── best winrate — individual or duo ───────────────────────────────── */

function TopWinrateOrDuoBox({
  loading,
  leaderboard,
  topDuoWinrate,
}: {
  loading: boolean;
  leaderboard: LeaderboardAccount[];
  topDuoWinrate: LeaderboardDuoWinrate | null;
}) {
  const player = pickBestWinrate(leaderboard);
  const useDuo =
    !!topDuoWinrate && (!player || topDuoWinrate.winrate >= player.winrate);
  if (useDuo && topDuoWinrate) {
    return (
      <LeaderboardDuoStatBox
        loading={loading}
        icon={<Award className="w-3.5 h-3.5" />}
        label="Best Winrate"
        duo={topDuoWinrate}
        highlightValue={`${topDuoWinrate.winrate}%`}
        highlightLabel="WR"
      />
    );
  }
  return (
    <LeaderboardStatBox
      loading={loading}
      icon={<Award className="w-3.5 h-3.5" />}
      label="Best Winrate"
      player={player}
      highlightFn={(p) => `${p.winrate}%`}
      highlightLabel="WR"
      emptyText="No games tracked"
    />
  );
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

function LongestStreakBox({
  loading,
  leaderboard,
  topDuoStreak,
}: {
  loading: boolean;
  leaderboard: LeaderboardAccount[];
  topDuoStreak: LeaderboardDuoStreak | null;
}) {
  // Streak is per-PLAYER (all accounts of the same human share it). De-dup.
  const byPlayer = new Map<string, LeaderboardAccount>();
  for (const a of leaderboard) {
    const cur = byPlayer.get(a.playerId);
    if (!cur || a.streak > cur.streak) byPlayer.set(a.playerId, a);
  }
  const sorted = [...byPlayer.values()].sort((x, y) => y.streak - x.streak);
  const topIndividual = sorted[0] ?? null;
  const individualLen = topIndividual?.streak ?? 0;
  const duoLen = topDuoStreak?.length ?? 0;

  // Empty: nothing to show if no one has even a 1-win streak.
  if (!loading && individualLen <= 0 && duoLen <= 0) {
    return (
      <LeaderboardStatBox
        loading={false}
        icon={<Flame className="w-3.5 h-3.5" />}
        label="Longest Streak"
        player={null}
        highlightFn={() => ""}
        highlightLabel="W"
        emptyText="No streaks yet"
      />
    );
  }

  const useDuo = !!topDuoStreak && duoLen >= individualLen;
  if (useDuo && topDuoStreak) {
    return (
      <LeaderboardDuoStatBox
        loading={loading}
        icon={<Flame className="w-3.5 h-3.5" />}
        label="Longest Streak"
        duo={topDuoStreak}
        highlightValue={`${topDuoStreak.length}W`}
        highlightLabel="Streak"
        subText={`${topDuoStreak.length} wins together`}
      />
    );
  }
  return (
    <LeaderboardStatBox
      loading={loading}
      icon={<Flame className="w-3.5 h-3.5" />}
      label="Longest Streak"
      player={topIndividual}
      highlightFn={(p) => `${p.streak}W`}
      highlightLabel="Streak"
      emptyText="No streaks yet"
    />
  );
}

/* ─── daily bounty (sidebar widget) ─────────────────────────────────── */
//
// Shows today's challenge for the lobby. Two visual states:
//   • active  — challenge title, description, threshold metric
//   • claimed — first player's avatar, name, actual achieved value,
//               and a small "CLAIMED" badge
//
// Re-fetches on `refreshTick` so the moment a match lands and the
// backend hook flips the bounty to claimed, the next periodic refresh
// surfaces the winner.

type BountyMetric =
  | "kills"
  | "damage"
  | "kp_pct"
  | "vision"
  | "gold"
  | "kda"
  | "zero_deaths_win"
  | "assists"
  | "quick_win"
  | "cs";

type BountyPayload = {
  template: {
    code: string;
    title: string;
    description: string;
    metric: BountyMetric;
    threshold: number;
    rarity: "common" | "rare" | "legendary";
    icon: string;
  };
  day_utc: string;
  state: "active" | "claimed";
  claimed_at: string | null;
  claimed_value: number | null;
  claimed_match_id: string | null;
  claimed_by: {
    lobby_player_id: string;
    display_name: string | null;
    color: string | null;
  } | null;
};

function bountyIconFor(iconKey: string): React.ReactNode {
  const cls = "w-4 h-4";
  switch (iconKey) {
    case "swords":   return <Swords className={cls} />;
    case "flame":    return <Flame className={cls} />;
    case "crown":    return <Crown className={cls} />;
    case "eye":      return <Eye className={cls} />;
    case "coins":    return <Coins className={cls} />;
    case "shield":   return <Shield className={cls} />;
    case "sparkles": return <Sparkles className={cls} />;
    case "users":    return <Users className={cls} />;
    case "zap":      return <Zap className={cls} />;
    case "wheat":    return <Wheat className={cls} />;
    default:         return <Target className={cls} />;
  }
}

// Human-readable threshold + achieved-value formatters per metric.
function formatBountyTarget(metric: BountyMetric, threshold: number): string {
  switch (metric) {
    case "kills":     return `${threshold} kills`;
    case "damage":    return `${(threshold / 1000).toFixed(0)}k dmg`;
    case "kp_pct":    return `${Math.round(threshold * 100)}% KP`;
    case "vision":    return `${threshold} vision`;
    case "gold":      return `${(threshold / 1000).toFixed(0)}k gold`;
    case "kda":       return `${threshold.toFixed(1)} KDA`;
    case "zero_deaths_win": return "0 deaths · WIN";
    case "assists":   return `${threshold} assists`;
    case "quick_win": return `< ${Math.round(threshold / 60)} min`;
    case "cs":        return `${threshold} CS`;
  }
}

function formatBountyAchieved(metric: BountyMetric, value: number): string {
  switch (metric) {
    case "kills":     return `${value}`;
    case "damage":    return `${(value / 1000).toFixed(1)}k`;
    case "kp_pct":    return `${Math.round(value * 100)}%`;
    case "vision":    return `${value}`;
    case "gold":      return `${(value / 1000).toFixed(1)}k`;
    case "kda":       return value.toFixed(2);
    case "zero_deaths_win": return "PERFECT";
    case "assists":   return `${value}`;
    case "quick_win": return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
    case "cs":        return `${value}`;
  }
}

// Per-rarity accent palette. Common = jade (in line with the rest of
// the sidebar), rare = citrine, legendary = a pinkish flash to set
// the chase challenges apart visually.
const RARITY_ACCENT: Record<
  BountyPayload["template"]["rarity"],
  { color: string; label: string }
> = {
  common:    { color: "#00d992", label: "COMMON" },
  rare:      { color: "#FFB615", label: "RARE" },
  legendary: { color: "#ff5db5", label: "LEGENDARY" },
};

function DailyBountyBox({
  slug,
  refreshTick,
}: {
  slug: string;
  refreshTick: number;
}) {
  const [payload, setPayload] = useState<BountyPayload | null>(null);
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
    return (
      <div
        className="relative overflow-hidden rounded-md"
        style={{
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
        }}
      >
        <div className="relative z-[2] p-3.5">
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className="w-5 h-5 rounded-[3px] flex items-center justify-center shrink-0 text-jade/70"
              style={{
                background: `color-mix(in srgb, ${JADE} 10%, transparent)`,
                border: `0.5px solid color-mix(in srgb, ${JADE} 30%, transparent)`,
              }}
            >
              <Target className="w-3 h-3" />
            </span>
            <span className="text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/70 font-semibold">
              Daily Bounty
            </span>
            <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" />
          </div>
          <div className="h-[64px] flex items-center justify-center">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-jade/60" />
            ) : (
              <span className="text-[10px] font-jetbrains tracking-[0.18em] uppercase text-flash/35">
                no bounty today
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const rarity = RARITY_ACCENT[payload.template.rarity];
  const isClaimed = payload.state === "claimed";
  const winnerColor = payload.claimed_by?.color || JADE;

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{
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
      }}
    >
      <div className="relative z-[2] p-3.5">
        {/* Header row — compact treatment that still distinguishes the
            card from neighbours via the icon chip + rarity badge. */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="w-5 h-5 rounded-[3px] flex items-center justify-center shrink-0"
            style={{
              background: `color-mix(in srgb, ${rarity.color} 14%, transparent)`,
              border: `0.5px solid color-mix(in srgb, ${rarity.color} 40%, transparent)`,
              color: rarity.color,
            }}
          >
            <span className="scale-75 origin-center">
              {bountyIconFor(payload.template.icon)}
            </span>
          </span>
          <span className="text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/70 font-semibold">
            Daily Bounty
          </span>
          {/* How-it-works tooltip — the claim is auto-detected server-side
              (no button to hunt for), and the rules aren't obvious. */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="shrink-0 text-flash/30 hover:text-jade transition-colors cursor-clicker"
                  aria-label="How the daily bounty works"
                >
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="text-xs max-w-[230px] bg-liquirice/90"
              >
                <div className="font-geist leading-snug text-flash/85">
                  The first lobby member to hit this in a ranked game today
                  claims it — auto-tracked, no button needed. The best value
                  holds and can be overtaken. Resets at midnight (Rome time).
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent" />
          <span
            className="text-[7px] font-jetbrains tracking-[0.25em] uppercase font-bold px-1.5 py-[3px] rounded-sm"
            style={{
              color: rarity.color,
              backgroundColor: `color-mix(in srgb, ${rarity.color} 16%, transparent)`,
              border: `0.5px solid color-mix(in srgb, ${rarity.color} 40%, transparent)`,
            }}
          >
            {rarity.label}
          </span>
        </div>

        {/* Title + description — both in chakrapetch to match the
            metric numerals and reinforce the "membership card" feel.
            Subtitle uses the freshly-loaded 300 weight for an airy,
            luxe contrast against the bold title. */}
        <div className="mb-2.5">
          <div className="text-[14px] font-chakrapetch font-bold text-flash leading-tight tracking-[0.01em]">
            {payload.template.title}
          </div>
          <div
            className="text-[11px] font-chakrapetch text-flash/65 mt-0.5 leading-snug tracking-[0.02em]"
            style={{ fontWeight: 300 }}
          >
            {payload.template.description}
          </div>
        </div>

        {isClaimed && payload.claimed_by ? (
          // ── CLAIMED state ─────────────────────────────────────────
          // The chip needs a solid dark backdrop so the card's static
          // shine band doesn't bleed through it — the chip should
          // read as a clean panel sitting on top of the metal.
          <div
            className={cn(
              "group/jump relative overflow-hidden rounded-md p-2.5",
              payload.claimed_match_id &&
                "cursor-clicker transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
            )}
            style={{
              background: `
                linear-gradient(135deg, color-mix(in srgb, ${winnerColor} 14%, transparent) 0%, rgba(0,0,0,0.55) 100%),
                rgba(8, 12, 14, 0.95)
              `,
              border: `0.5px solid color-mix(in srgb, ${winnerColor} 28%, transparent)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
            {...(payload.claimed_match_id
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  title: "Jump to the match where it was claimed",
                  onClick: () => {
                    navigate(`/scout/${slug}`);
                    focusScoutMatch(payload.claimed_match_id!);
                  },
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/scout/${slug}`);
                      focusScoutMatch(payload.claimed_match_id!);
                    }
                  },
                }
              : {})}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(0,0,0,0.45)",
                  border: `1.5px solid color-mix(in srgb, ${winnerColor} 55%, transparent)`,
                  boxShadow: `0 0 12px color-mix(in srgb, ${winnerColor} 30%, transparent)`,
                }}
              >
                <span
                  className="text-[12px] font-jetbrains font-bold"
                  style={{ color: winnerColor }}
                >
                  {(payload.claimed_by.display_name ?? "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[12px] font-geist font-semibold text-flash truncate leading-tight">
                  {payload.claimed_by.display_name ?? "Unknown"}
                </span>
                <span className="text-[8px] font-jetbrains tracking-[0.22em] uppercase text-flash/55 mt-0.5 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-2.5 h-2.5" style={{ color: winnerColor }} />
                  Claimed
                  {payload.claimed_match_id && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-jade/0 group-hover/jump:text-jade/85 transition-colors duration-200">
                      <Crosshair className="w-2.5 h-2.5" />
                      View
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span
                  className="text-[17px] font-chakrapetch font-bold tabular-nums leading-none"
                  style={{ color: winnerColor }}
                >
                  {payload.claimed_value !== null
                    ? formatBountyAchieved(payload.template.metric, payload.claimed_value)
                    : "—"}
                </span>
                <span className="text-[7.5px] font-jetbrains tracking-[0.22em] uppercase text-flash/45 mt-1 font-medium">
                  {payload.template.metric === "zero_deaths_win"
                    ? "PERFECT"
                    : "ACHIEVED"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          // ── ACTIVE state ──────────────────────────────────────────
          // Target + status side by side now (instead of stacked) —
          // saves vertical space while keeping the metric hero-sized.
          // Solid dark backdrop layer ensures the card's static shine
          // doesn't bleed through the chip.
          <div
            className="relative overflow-hidden rounded-md py-2 px-3 flex items-center justify-between gap-3"
            style={{
              background: `
                linear-gradient(180deg, color-mix(in srgb, ${rarity.color} 12%, transparent) 0%, rgba(0,0,0,0.55) 100%),
                rgba(8, 12, 14, 0.95)
              `,
              border: `0.5px solid color-mix(in srgb, ${rarity.color} 26%, transparent)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-jetbrains tracking-[0.3em] uppercase text-flash/45 font-medium">
                Target
              </span>
              <span
                className="text-[16px] font-chakrapetch font-bold tabular-nums leading-tight mt-0.5 tracking-[-0.01em] truncate"
                style={{
                  color: rarity.color,
                  textShadow: `0 0 14px color-mix(in srgb, ${rarity.color} 40%, transparent)`,
                }}
              >
                {formatBountyTarget(payload.template.metric, payload.template.threshold)}
              </span>
            </div>
            <span className="text-[8.5px] font-jetbrains tracking-[0.25em] uppercase text-jade font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-jade/[0.08] border border-jade/25 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-jade opacity-60 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-jade" />
              </span>
              Active
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── bounty leaderboard panel (LeaderboardTab footer) ──────────────── */
//
// All-time bounty claims, grouped by claimer. The backend hands us
// rows already sorted by total claims, so we just render them with
// medal accents for the podium and the most recent claim as a
// trailing chip.

type BountyLeaderboardRow = {
  lobby_player_id: string;
  display_name: string | null;
  color: string | null;
  total_claims: number;
  last_claim_at: string;
  last_template_code: string;
  last_template_title: string;
  last_value: number | null;
};

function BountyLeaderboardPanel({
  slug,
  refreshTick,
}: {
  slug: string;
  refreshTick: number;
}) {
  const [rows, setRows] = useState<BountyLeaderboardRow[]>([]);
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
  const medalFor = (idx: number): string | null => {
    if (idx === 0) return "#FFB615"; // citrine — gold
    if (idx === 1) return "#cdd5dd"; // silver
    if (idx === 2) return "#cd7f32"; // bronze
    return null;
  };

  return (
    <div className={cn(glassDark, "p-5 md:p-6")}>
      <GlowBackdrop subtle />
      <div className="relative z-[1]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-jade">
            <Target className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-jetbrains tracking-[0.25em] uppercase text-flash/70 font-medium">
            Bounty Leaderboard
          </span>
          <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/15 to-transparent" />
          <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/35">
            ALL-TIME
          </span>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-jade/60" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-[12px] font-jetbrains tracking-[0.2em] uppercase text-flash/35">
              No bounties claimed yet
            </div>
            <div className="text-[10px] font-jetbrains tracking-[0.1em] text-flash/25 mt-2">
              Be the first to claim today's challenge
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, idx) => {
              const medal = medalFor(idx);
              const accent = row.color || JADE;
              return (
                <div
                  key={row.lobby_player_id}
                  className="relative flex items-center gap-3 px-3 py-2.5 rounded-md bg-black/15 border border-flash/[0.05] hover:bg-black/25 transition-colors"
                >
                  {/* Rank pip */}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-jetbrains font-bold tabular-nums"
                    style={{
                      background: medal
                        ? `color-mix(in srgb, ${medal} 18%, transparent)`
                        : "rgba(0,0,0,0.35)",
                      color: medal ?? "#a8b0b6",
                      border: `1px solid color-mix(in srgb, ${medal ?? "#3a4248"} 45%, transparent)`,
                    }}
                  >
                    {idx + 1}
                  </div>

                  {/* Player avatar pill */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1.5px solid color-mix(in srgb, ${accent} 45%, transparent)`,
                      boxShadow: `0 0 10px color-mix(in srgb, ${accent} 25%, transparent)`,
                    }}
                  >
                    <span
                      className="text-[12px] font-jetbrains font-bold"
                      style={{ color: accent }}
                    >
                      {(row.display_name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  </div>

                  {/* Name + last claim */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-geist font-medium text-flash truncate">
                      {row.display_name ?? "Unknown"}
                    </span>
                    <span className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/35 mt-0.5 truncate">
                      Last: {row.last_template_title}
                    </span>
                  </div>

                  {/* Total claim count + label */}
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[18px] font-chakrapetch font-bold tabular-nums text-jade leading-none">
                      {row.total_claims}
                    </span>
                    <span className="text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mt-1">
                      {row.total_claims === 1 ? "CLAIM" : "CLAIMS"}
                    </span>
                  </div>
                </div>
              );
            })}
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
function ChampionsTab({ slug, lobby }: { slug: string; lobby: Lobby }) {
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

  // playerId → lobby player (for account chip rendering inside the card).
  const playerById = useMemo(() => {
    const m = new Map<string, LobbyPlayer>();
    for (const p of lobby.players) m.set(p.id, p);
    return m;
  }, [lobby]);

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
              <ChampionsCard
                key={p.playerId}
                player={p}
                lobbyPlayer={playerById.get(p.playerId) ?? null}
              />
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

function ChampionsCard({
  player,
  lobbyPlayer,
}: {
  player: ChampionsPlayer;
  lobbyPlayer: LobbyPlayer | null;
}) {
  const accent = player.color || JADE;
  // null = "All accounts" (aggregate). Otherwise = a specific account puuid.
  const [accountPuuid, setAccountPuuid] = useState<string | null>(null);

  // Decide which champion list to render based on the selected account.
  const champions: ChampionLine[] =
    accountPuuid && player.perAccount?.[accountPuuid]
      ? player.perAccount[accountPuuid]
      : player.champions;

  // Stable list of switchable accounts. Sorted main-first then by orderIndex
  // so the chip row reads like the rest of the UI.
  const accounts = useMemo(() => {
    if (!lobbyPlayer) return [] as LobbyAccount[];
    return [...lobbyPlayer.accounts].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return a.orderIndex - b.orderIndex;
    });
  }, [lobbyPlayer]);

  // Only render the account switcher when the player has more than one
  // linked account — for a solo-account player it's just visual noise.
  const showSwitcher = accounts.length > 1;

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
        </div>

        {showSwitcher && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <button
              type="button"
              onClick={() => setAccountPuuid(null)}
              className={cn(
                "px-2 py-[3px] rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border",
                accountPuuid == null
                  ? "border-jade/40 bg-jade/[0.10] text-jade"
                  : "border-flash/15 text-flash/40 hover:text-flash/75 hover:bg-flash/[0.04]"
              )}
            >
              All
            </button>
            {accounts.map((acc) => {
              const isActive = acc.puuid === accountPuuid;
              const hasData = (player.perAccount?.[acc.puuid] ?? []).length > 0;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccountPuuid(acc.puuid)}
                  disabled={!hasData}
                  title={
                    hasData
                      ? `${acc.riotName}#${acc.riotTag}`
                      : "No champion data on this account in the current window"
                  }
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-[3px] rounded-[3px] text-[9px] font-jetbrains tracking-[0.2em] uppercase font-medium transition-all cursor-clicker border",
                    isActive
                      ? "border-jade/40 bg-jade/[0.10] text-jade"
                      : hasData
                      ? "border-flash/15 text-flash/55 hover:text-flash/85 hover:bg-flash/[0.04]"
                      : "border-flash/10 text-flash/25 cursor-not-allowed"
                  )}
                >
                  <span className="text-jade/55 mr-0.5">{acc.region}</span>
                  <span className="truncate max-w-[100px]">{acc.riotName}</span>
                  {acc.isPrimary && (
                    <span className="text-[7px] font-mono tracking-widest text-jade/60 ml-0.5">
                      MAIN
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {champions.length === 0 ? (
          <div className="py-6 text-center text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/30">
            No champion data on this account
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {champions.map((c, i) => (
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
        )}
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
  large = false,
}: {
  lastRefreshAt: string | null;
  refreshing: boolean;
  onRefreshDone: (newLastRefreshAt: string) => void;
  slug: string;
  /** Larger variant used in the lobby hero (next to the name). */
  large?: boolean;
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
        "group flex items-center font-jetbrains tracking-[0.2em] uppercase text-flash/50",
        "rounded-[3px] transition-colors cursor-clicker hover:bg-flash/[0.05]",
        large
          ? "gap-2.5 text-[13px] px-2.5 py-1.5 -mx-2.5 -my-1.5"
          : "gap-2 text-[10px] px-2 py-1 -mx-2 -my-1"
      )}
    >
      {showIcon ? (
        <RefreshCw
          className={cn(
            large ? "w-4 h-4" : "w-3.5 h-3.5",
            error ? "text-error/70" : "text-jade/70",
            isRefreshing && "animate-spin"
          )}
        />
      ) : (
        <RefreshCw
          className={cn(
            large ? "w-4 h-4" : "w-3.5 h-3.5",
            "opacity-0 group-hover:opacity-60 text-jade/70 transition-opacity"
          )}
        />
      )}
      <span className="text-flash/40">Next update</span>
      <span className={cn("tabular-nums", valueClass)}>{label}</span>
    </button>
  );
}

/* ─── edit lobby dialog config ──────────────────────────────────────── */

type EditSectionKey =
  | "name"
  | "hero"
  | "players"
  | "sections"
  | "verify";

// Canonical list of tab keys. The frontend tab rendering uses these
// to gate which tabs render; SECTIONS_CATALOG is also what the
// EditLobbyDialog's "Sections" panel renders as checkboxes.
const SECTIONS_CATALOG: Array<{
  key: string;
  label: string;
  description: string;
  default: boolean;
}> = [
  { key: "matches",     label: "Matches",     description: "Per-player match feed", default: true },
  { key: "live",        label: "Live",        description: "Currently in-game",     default: true },
  { key: "leaderboard", label: "Leaderboard", description: "Per-account rankings",  default: true },
  { key: "trending",    label: "Trending",    description: "Lobby-wide trends",     default: true },
  { key: "habits",      label: "Habits",      description: "Time-of-day patterns",  default: true },
  { key: "champions",   label: "Champions",   description: "Champion-pool view",    default: true },
  { key: "chat",        label: "Chat",        description: "Group chat (verified)", default: false },
  { key: "compare",     label: "Compare",     description: "VS player breakdown",   default: false },
];

const DEFAULT_ENABLED_TABS = SECTIONS_CATALOG
  .filter((t) => t.default)
  .map((t) => t.key);

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
  // The original backend player_id (null for unsaved new players).
  // We use this to know whether identity/invite controls are available
  // for this row — they only work after the player exists in the DB.
  originalId?: string | null;
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
          style={{ objectPosition: "center 35%" }}
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
      originalId: p.id,
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
  // v3 — admin-tunable lobby config.
  const [enabledTabs, setEnabledTabs] = useState<string[]>(
    () => lobby.enabledTabs ?? DEFAULT_ENABLED_TABS
  );
  const [verifyMode, setVerifyMode] = useState<VerifyMode>(
    lobby.verifyMode ?? "full"
  );
  // Private lobby — when true only claimed members + admins can view.
  const [isPrivate, setIsPrivate] = useState<boolean>(
    lobby.isPublic === false
  );
  // Collapsible sections — all open by default. Stored as a Set of
  // section keys so toggling is O(1) and order-independent.
  const [openSections, setOpenSections] = useState<Set<EditSectionKey>>(
    () => new Set(["name", "hero", "players", "sections", "verify"])
  );
  const toggleSection = (k: EditSectionKey) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

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
    setEnabledTabs(lobby.enabledTabs ?? DEFAULT_ENABLED_TABS);
    setVerifyMode(lobby.verifyMode ?? "full");
    setIsPrivate(lobby.isPublic === false);
    setPlayers(
      lobby.players.map((p) => ({
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
      }))
    );
    setErr(null);
  }, [open, lobby]);

  const addPlayer = () => {
    if (players.length >= EDIT_MAX_PLAYERS) return;
    setPlayers((prev) => [
      ...prev,
      { uid: makeUid(), originalId: null, displayName: "", accounts: [] },
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
            <EditCollapsible
              open={openSections.has("name")}
              onToggle={() => toggleSection("name")}
              title="Lobby name"
              summary={name || "(no name)"}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full bg-black/30 border border-flash/20 rounded-[3px] h-11 px-3 text-[15px] text-flash placeholder:text-flash/35 outline-none focus:border-jade/45 transition-colors"
              />
            </EditCollapsible>

            {/* Hero champion picker */}
            <EditCollapsible
              open={openSections.has("hero")}
              onToggle={() => toggleSection("hero")}
              title="Hero splash"
              summary={heroChampion || "Default"}
            >
              <HeroChampionPicker
                value={heroChampion}
                onChange={setHeroChampion}
              />
            </EditCollapsible>

            {/* Players */}
            <EditCollapsible
              open={openSections.has("players")}
              onToggle={() => toggleSection("players")}
              title="Players"
              summary={`${players.length}/${EDIT_MAX_PLAYERS}`}
              action={
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addPlayer();
                  }}
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
              }
            >
              {/* Co-admins list (above the player rows) */}
              <LobbyAdminsPanel lobby={lobby} onChanged={onSaved} />

              <div className="flex flex-col gap-2">
                {players.map((p, idx) => {
                  // Match the EditPlayer to its persisted LobbyPlayer
                  // (via originalId) so we can show claim/badge state
                  // for already-saved players.
                  const persisted = p.originalId
                    ? lobby.players.find((lp) => lp.id === p.originalId) ?? null
                    : null;
                  // EditPlayerRow + Identity panel share an outer
                  // border so they read as ONE unit. Inner divider
                  // is a hairline so the visual seam stays subtle.
                  return (
                    <div
                      key={p.uid}
                      className="rounded-[4px] border border-flash/[0.08] bg-black/[0.18] overflow-hidden"
                    >
                      <EditPlayerRow
                        index={idx}
                        player={p}
                        onChange={(next) => updatePlayer(p.uid, next)}
                        onRemove={() => removePlayer(p.uid)}
                        seamless
                      />
                      {/* Hairline divider between row and identity */}
                      <div className="h-[1px] bg-flash/[0.06]" />
                      {/* Identity sub-row */}
                      <PlayerIdentityPanel
                        lobbySlug={lobby.slug}
                        playerId={p.originalId ?? null}
                        persisted={persisted}
                        displayName={p.displayName}
                        onChanged={onSaved}
                      />
                    </div>
                  );
                })}
              </div>
            </EditCollapsible>

            {/* Sections (tab chooser) */}
            <EditCollapsible
              open={openSections.has("sections")}
              onToggle={() => toggleSection("sections")}
              title="Sections"
              summary={`${enabledTabs.length} enabled`}
            >
              <SectionsChooser
                enabled={enabledTabs}
                onChange={setEnabledTabs}
              />
            </EditCollapsible>

            {/* Verify mode + privacy */}
            <EditCollapsible
              open={openSections.has("verify")}
              onToggle={() => toggleSection("verify")}
              title="Verify"
              summary={
                (isPrivate ? "Private · " : "") +
                (verifyMode === "disabled"
                  ? "Disabled"
                  : verifyMode === "claim_only"
                    ? "Grade 1 only"
                    : "Full")
              }
            >
              {/* Private toggle */}
              <button
                type="button"
                onClick={() => setIsPrivate((p) => !p)}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-[3px] border cursor-clicker transition-all text-left mb-3",
                  isPrivate
                    ? "border-jade/45 bg-jade/[0.08]"
                    : "border-flash/10 bg-black/15 hover:border-flash/25"
                )}
              >
                <Lock
                  className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    isPrivate ? "text-jade" : "text-flash/45"
                  )}
                />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[11px] font-chakrapetch font-bold",
                        isPrivate ? "text-flash" : "text-flash/70"
                      )}
                    >
                      Private lobby
                    </span>
                    {/* Switch */}
                    <span
                      className={cn(
                        "relative ml-auto w-8 h-4 rounded-full transition-colors shrink-0",
                        isPrivate
                          ? "bg-jade/40 border border-jade/60"
                          : "bg-flash/10 border border-flash/15"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-[1px] w-[14px] h-[14px] rounded-full transition-all",
                          isPrivate
                            ? "left-[15px] bg-jade shadow-[0_0_6px_rgba(0,217,146,0.6)]"
                            : "left-[1px] bg-flash/40"
                        )}
                      />
                    </span>
                  </div>
                  <span className="text-[9px] text-flash/45 font-geist mt-0.5 leading-snug">
                    Only claimed members + admins can view the lobby.
                    Everyone else sees a locked page.
                  </span>
                </div>
              </button>

              <div className="text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mb-1.5">
                Verification mode
              </div>
              <VerifyModeRadio value={verifyMode} onChange={setVerifyMode} />
            </EditCollapsible>

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
  seamless = false,
}: {
  index: number;
  player: EditPlayer;
  onChange: (p: EditPlayer) => void;
  onRemove: () => void;
  /** When true the row drops its own border/bg so it can sit inside
   *  a parent container that owns the chrome (used by the Identity
   *  panel wrapper to merge the row + panel into one visual unit). */
  seamless?: boolean;
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
    <div
      className={cn(
        "p-3",
        seamless
          ? "bg-transparent"
          : "bg-black/25 border border-flash/15 rounded-[3px]"
      )}
    >
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

/* ─── per-player identity panel (claim invite + badge toggle) ───────── */
//
// Sits under each EditPlayerRow inside the EditLobbyDialog. Lets the
// admin generate a reusable claim link, revoke it, and toggle the
// green verify badge on/off for that player.
//
// Auth — every mutation here hits an admin-only endpoint, so we send
// the supabase session token as Bearer.

function PlayerIdentityPanel({
  lobbySlug,
  playerId,
  persisted,
  displayName,
  onChanged,
}: {
  lobbySlug: string;
  playerId: string | null;
  persisted: LobbyPlayer | null;
  displayName: string;
  onChanged: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [showBadge, setShowBadge] = useState<boolean>(
    !!persisted?.showVerifyBadge
  );

  // Sync local toggle when persisted changes (e.g. after onChanged → reload).
  useEffect(() => {
    setShowBadge(!!persisted?.showVerifyBadge);
  }, [persisted?.showVerifyBadge]);

  const isClaimed = !!persisted?.claimedByProfileId;

  // Unsaved player → can't manage identity yet. Sits inside the
  // shared parent border, so no border/bg of our own.
  if (!playerId || !persisted) {
    return (
      <div className="px-3 py-2 bg-black/15">
        <span className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/30">
          Save to enable identity controls
        </span>
      </div>
    );
  }

  const authHeader = async (): Promise<HeadersInit | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
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
      const res = await fetch(
        `${API_BASE_URL}/api/scout/lobby/${lobbySlug}/player/${playerId}/claim-invite`,
        { method: "POST", headers }
      );
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
      } catch {
        showCyberToast({ title: "Invite ready", description: url });
      }
    } finally {
      setLoadingInvite(false);
    }
  };

  const revokeInvite = async () => {
    const headers = await authHeader();
    if (!headers) return;
    const res = await fetch(
      `${API_BASE_URL}/api/scout/lobby/${lobbySlug}/player/${playerId}/claim-invite`,
      { method: "DELETE", headers }
    );
    if (res.ok) {
      setToken(null);
      showCyberToast({ title: "Invite revoked" });
    } else {
      showCyberToast({ title: "Revoke failed", variant: "error" });
    }
  };

  const toggleBadge = async (next: boolean) => {
    setShowBadge(next);
    const headers = await authHeader();
    if (!headers) return;
    const res = await fetch(
      `${API_BASE_URL}/api/scout/lobby/${lobbySlug}/player/${playerId}/verify-badge`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ show: next }),
      }
    );
    if (!res.ok) {
      setShowBadge(!next); // revert
      showCyberToast({ title: "Badge toggle failed", variant: "error" });
      return;
    }
    onChanged();
  };

  return (
    <div className="px-3 py-2 bg-black/15">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isClaimed ? (
            <>
              <VerifyBadge grade={persisted.verifyGrade === 2 ? 2 : 1} size={12} />
              <span className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-jade font-bold">
                Claimed
              </span>
            </>
          ) : (
            <span className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40">
              ◇ Unclaimed
            </span>
          )}
        </div>

        <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/10 to-transparent min-w-[20px]" />

        {/* Invite actions */}
        {!isClaimed && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={generateInvite}
              disabled={loadingInvite}
              className="text-[9px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[3px] border border-jade/30 text-jade bg-jade/[0.08] hover:bg-jade/[0.15] cursor-clicker transition-all disabled:opacity-50"
            >
              {loadingInvite ? "…" : token ? "↺ Copy again" : "+ Invite link"}
            </button>
            {token && (
              <button
                type="button"
                onClick={revokeInvite}
                className="text-[9px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[3px] border border-flash/15 text-flash/55 hover:text-error/80 hover:border-error/30 cursor-clicker transition-all"
              >
                Revoke
              </button>
            )}
          </div>
        )}

        {/* Badge toggle — only meaningful once claimed */}
        {isClaimed && (
          <label
            className="flex items-center gap-2 cursor-clicker shrink-0"
            title="Show verify badge next to player name in match feed"
          >
            <span className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/55">
              Badge
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={showBadge}
              onClick={() => toggleBadge(!showBadge)}
              className={cn(
                "relative w-8 h-4 rounded-full transition-colors",
                showBadge
                  ? "bg-jade/40 border border-jade/60"
                  : "bg-flash/10 border border-flash/15"
              )}
            >
              <span
                className={cn(
                  "absolute top-[1px] w-[14px] h-[14px] rounded-full transition-all",
                  showBadge
                    ? "left-[15px] bg-jade shadow-[0_0_6px_rgba(0,217,146,0.6)]"
                    : "left-[1px] bg-flash/40"
                )}
              />
            </button>
          </label>
        )}
      </div>
    </div>
  );
}

/* ─── edit dialog v3 helpers ─────────────────────────────────────────── */
//
// All four pieces live next to PlayerIdentityPanel since they're
// only used inside EditLobbyDialog. Function declarations hoist so
// the dialog can reference them above.

/** Collapsible section wrapper used by EditLobbyDialog. */
function EditCollapsible({
  open,
  onToggle,
  title,
  summary,
  action,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  summary?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-[4px] border border-flash/10 overflow-hidden bg-black/15">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 cursor-clicker hover:bg-flash/[0.03] transition-colors"
      >
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-flash/55 shrink-0 transition-transform",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
        <span className="text-[11px] font-jetbrains tracking-[0.22em] uppercase text-flash/65 font-medium">
          {title}
        </span>
        {summary && (
          <span className="text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/35 truncate">
            · {summary}
          </span>
        )}
        <div className="flex-1" />
        {action}
      </button>
      {open && (
        <div className="px-4 pt-2 pb-4 border-t border-flash/[0.05]">
          {children}
        </div>
      )}
    </div>
  );
}

/** Co-admin promotion panel — current admins + promote/demote. */
function LobbyAdminsPanel({
  lobby,
  onChanged,
}: {
  lobby: Lobby;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const admins = lobby.admins ?? [];
  const adminIds = new Set(admins.map((a) => a.profileId));
  const claimedPlayers = lobby.players.filter((p) => p.claimedByProfileId);

  const authHeader = async (): Promise<HeadersInit | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const promote = async (profileId: string) => {
    setBusy(profileId);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(
        `${API_BASE_URL}/api/scout/lobby/${lobby.slug}/admins`,
        { method: "POST", headers, body: JSON.stringify({ profileId }) }
      );
      if (res.ok) {
        showCyberToast({ title: "Promoted to co-admin" });
        onChanged();
      } else {
        const body = await res.json().catch(() => ({}));
        showCyberToast({
          title: "Promote failed",
          description: body?.error,
          variant: "error",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const demote = async (profileId: string) => {
    setBusy(profileId);
    try {
      const headers = await authHeader();
      if (!headers) return;
      const res = await fetch(
        `${API_BASE_URL}/api/scout/lobby/${lobby.slug}/admins/${profileId}`,
        { method: "DELETE", headers }
      );
      if (res.ok) {
        showCyberToast({ title: "Co-admin removed" });
        onChanged();
      } else {
        showCyberToast({ title: "Remove failed", variant: "error" });
      }
    } finally {
      setBusy(null);
    }
  };

  const labelFor = (profileId: string): string => {
    const p = lobby.players.find((x) => x.claimedByProfileId === profileId);
    return p?.displayName ?? profileId.slice(0, 8);
  };

  const promotable = claimedPlayers.filter(
    (p) => !adminIds.has(p.claimedByProfileId!)
  );

  return (
    <div className="mb-3 rounded-[3px] bg-black/15 border border-flash/[0.06] p-3">
      <div className="text-[10px] font-jetbrains tracking-[0.22em] uppercase text-flash/50 mb-2">
        ◇ Admins
      </div>
      {admins.length === 0 ? (
        <div className="text-[10px] font-jetbrains tracking-[0.15em] uppercase text-flash/30">
          No admins yet
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 mb-2">
          {admins.map((a) => {
            const isCreator = a.profileId === lobby.ownerUserId;
            return (
              <div
                key={a.profileId}
                className="flex items-center gap-2 text-[11px] font-chakrapetch text-flash"
              >
                <span
                  className={cn(
                    "px-1.5 py-[2px] rounded-[2px] text-[8px] font-jetbrains tracking-[0.2em] uppercase font-bold",
                    isCreator
                      ? "bg-citrine/15 text-citrine border border-citrine/35"
                      : "bg-jade/10 text-jade border border-jade/30"
                  )}
                >
                  {isCreator ? "Creator" : "Co-admin"}
                </span>
                <span className="truncate flex-1">
                  {labelFor(a.profileId)}
                </span>
                {!isCreator && (
                  <button
                    type="button"
                    onClick={() => demote(a.profileId)}
                    disabled={busy === a.profileId}
                    className="text-[9px] font-jetbrains tracking-[0.18em] uppercase text-flash/40 hover:text-error/80 cursor-clicker disabled:opacity-40"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {promotable.length > 0 && (
        <>
          <div className="text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/40 mb-1.5 mt-3">
            Promote claimed users
          </div>
          <div className="flex flex-wrap gap-1.5">
            {promotable.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => promote(p.claimedByProfileId!)}
                disabled={busy === p.claimedByProfileId}
                className="text-[9px] font-jetbrains tracking-[0.18em] uppercase font-medium px-2 py-1 rounded-[3px] border border-jade/25 text-jade/85 bg-jade/[0.06] hover:bg-jade/[0.15] cursor-clicker transition-all disabled:opacity-40"
              >
                + {p.displayName}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Tab chooser — checkbox grid. */
function SectionsChooser({
  enabled,
  onChange,
}: {
  enabled: string[];
  onChange: (next: string[]) => void;
}) {
  const enabledSet = new Set(enabled);
  const toggle = (key: string) => {
    const next = new Set(enabledSet);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {SECTIONS_CATALOG.map((t) => {
        const isOn = enabledSet.has(t.key);
        const isOptIn = !t.default;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => toggle(t.key)}
            className={cn(
              "flex items-start gap-2.5 px-3 py-2 rounded-[3px] border cursor-clicker transition-all text-left",
              isOn
                ? "border-jade/40 bg-jade/[0.08]"
                : "border-flash/10 bg-black/15 hover:border-flash/25"
            )}
          >
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                isOn
                  ? "bg-jade/40 border-jade/60"
                  : "border-flash/20 bg-black/30"
              )}
            >
              {isOn && <Check className="w-2.5 h-2.5 text-flash" />}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-[11px] font-chakrapetch font-bold",
                    isOn ? "text-flash" : "text-flash/70"
                  )}
                >
                  {t.label}
                </span>
                {isOptIn && (
                  <span className="text-[7px] font-jetbrains tracking-[0.2em] uppercase text-citrine/80 bg-citrine/10 border border-citrine/30 px-1 py-[1px] rounded-[2px]">
                    Opt-in
                  </span>
                )}
              </div>
              <span className="text-[9px] text-flash/45 font-geist mt-0.5 leading-snug">
                {t.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Verify-mode 3-way radio. */
function VerifyModeRadio({
  value,
  onChange,
}: {
  value: VerifyMode;
  onChange: (next: VerifyMode) => void;
}) {
  const options: Array<{
    key: VerifyMode;
    label: string;
    helper: string;
  }> = [
    {
      key: "full",
      label: "Full (Grade 1 + Grade 2)",
      helper:
        "Claim invites are active, identity badges show in the feed, and verified users can run the per-account icon challenge to unlock Grade 2.",
    },
    {
      key: "claim_only",
      label: "Grade 1 only",
      helper:
        "Claim invites and identity badges work, but the rhombus Verify FAB and account-challenge dialog stay hidden.",
    },
    {
      key: "disabled",
      label: "Disabled",
      helper:
        "No claim invites, no badges, no FAB. Chat (when enabled) becomes open to anyone signed in.",
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const isOn = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={cn(
              "flex items-start gap-2.5 px-3 py-2 rounded-[3px] border cursor-clicker transition-all text-left",
              isOn
                ? "border-jade/45 bg-jade/[0.08]"
                : "border-flash/10 bg-black/15 hover:border-flash/25"
            )}
          >
            <div
              className={cn(
                "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                isOn ? "border-jade/70" : "border-flash/25"
              )}
            >
              {isOn && (
                <span className="w-1.5 h-1.5 rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.6)]" />
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span
                className={cn(
                  "text-[11px] font-chakrapetch font-bold",
                  isOn ? "text-flash" : "text-flash/70"
                )}
              >
                {o.label}
              </span>
              <span className="text-[9px] text-flash/45 font-geist mt-0.5 leading-snug">
                {o.helper}
              </span>
            </div>
          </button>
        );
      })}
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
        "chat",
        "compare",
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
  const [verifyOpen, setVerifyOpen] = useState(false);
  const { session } = useAuth();

  // ── Live lobby chat — socket runs page-wide ─────────────────────────
  // Mounted here (not inside the Chat tab) so the WebSocket stays open on
  // every tab. That's what lets the Chat tab flash an unread dot when a
  // message lands while the user is looking at another tab.
  const chatUserId = session?.user?.id ?? null;
  const {
    messages: chatMessages,
    loading: chatLoading,
    sending: chatSending,
    unread: chatUnread,
    markRead: chatMarkRead,
    send: chatSend,
  } = useScoutChat({ slug: slug ?? "", activeTab });

  // Clear the unread dot the moment the user opens the Chat tab.
  useEffect(() => {
    if (activeTab === "chat") chatMarkRead();
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
        // Send the auth token so the backend can decide private-lobby
        // access (claimed members + admins see the full payload; others
        // get a locked stub).
        const {
          data: { session: authSession },
        } = await supabase.auth.getSession();
        const authHeaders: HeadersInit = authSession?.access_token
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

  // Sync the browser tab title to the current lobby name. Restored on unmount
  // so backing out of the scout page leaves a clean default for other routes.
  useEffect(() => {
    if (!lobby?.name) return;
    const prev = document.title;
    document.title = `lolData - ${lobby.name}`;
    return () => {
      document.title = prev;
    };
  }, [lobby?.name]);

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

  // Private lobby + non-member → hero (no refresh clock) + locked body.
  if (lobby.locked) {
    return (
      <div className="w-full pb-24 font-geist">
        <LobbyHero lobby={lobby} />
        <LockedLobbyBody />
      </div>
    );
  }

  return (
    <div className="w-full pb-24 font-geist">
      <LobbyHero
        lobby={lobby}
        refreshSlot={
          <RefreshClock
            lastRefreshAt={lobby.lastRefreshAt}
            refreshing={refreshing}
            onRefreshDone={handleRefreshDone}
            slug={slug!}
            large
          />
        }
      />

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
              {/* MOBILE — native <select>. The closed trigger below is
                  pure styling; tapping it on iOS/Android opens the OS
                  picker (iOS 26's blurred bottom sheet, Android's
                  Material bottom sheet). The OS picker UI is NOT
                  customizable — only the closed-state button is — so
                  we style this to look like a glass chip, then let
                  the system handle the actual selection UI. Hidden on
                  desktop where the proper TabsList takes over. */}
              <div className="sm:hidden mb-4">
                <label className="relative block group">
                  {/* Subtle inner highlight + jade ring on focus so the
                      chip feels tappable and matches the rest of the
                      cyber-jade UI. */}
                  <select
                    value={activeTab}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next =
                        v === "matches" ? `/scout/${slug}` : `/scout/${slug}/${v}`;
                      navigate(next, { replace: false });
                    }}
                    className="w-full appearance-none bg-black/55 backdrop-blur-md ring-1 ring-jade/30 rounded-md pl-4 pr-10 py-3.5 text-[14px] font-chakrapetch font-bold tracking-[0.18em] uppercase text-jade cursor-clicker focus:outline-none focus:ring-2 focus:ring-jade/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_18px_rgba(0,0,0,0.4)]"
                  >
                    {visibleTabs.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {/* Unread-chat dot — mirrors the desktop tab dot when
                      Chat is enabled and a message arrived off-tab. */}
                  {chatUnread > 0 &&
                    activeTab !== "chat" &&
                    visibleTabs.some((t) => t.key === "chat") && (
                      <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[#ff3e4e] shadow-[0_0_8px_rgba(255,62,78,0.85)] animate-pulse" />
                    )}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-jade/65 text-[10px]"
                  >
                    ▼
                  </span>
                </label>
              </div>

              {/* DESKTOP — existing tab list + RefreshClock layout. */}
              <div className="hidden sm:flex items-end justify-between border-b border-flash/[0.06] mb-6 gap-2">
                <TabsList className="flex justify-start mx-0 bg-transparent h-auto p-0 gap-7 border-0">
                  {visibleTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.key}
                      value={tab.key}
                      className={cn(
                        "group relative font-jetbrains text-[11px] tracking-[0.22em] uppercase px-2 py-3 rounded-none bg-transparent border-none shadow-none transition-all duration-300 cursor-clicker shrink-0",
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
                      {/* Unread chat dot — only on the CHAT tab, only when
                          a message arrived while the user was elsewhere. */}
                      {tab.key === "chat" && chatUnread > 0 && (
                        <span className="absolute top-1.5 -right-2 w-[7px] h-[7px] rounded-full bg-[#ff3e4e] shadow-[0_0_8px_rgba(255,62,78,0.85)] animate-pulse" />
                      )}
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-jade/70 scale-x-0 group-data-[state=active]:scale-x-100 transition-transform duration-300 origin-center shadow-[0_0_8px_rgba(0,217,146,0.4)]" />
                    </TabsTrigger>
                  ))}
                </TabsList>
                {/* RefreshClock moved up to the lobby hero (next to the
                    lobby name, right-aligned). */}
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
                <ChampionsTab slug={slug!} lobby={lobby} />
              </TabsContent>

              <TabsContent value="chat" className="mt-0">
                <ChatTab
                  lobby={lobby}
                  userId={chatUserId}
                  messages={chatMessages}
                  loading={chatLoading}
                  sending={chatSending}
                  onSend={chatSend}
                />
              </TabsContent>

              <TabsContent value="compare" className="mt-0">
                <CompareTab slug={slug!} lobby={lobby} refreshTick={refreshTick} />
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

      {/* ─── Bottom-left FAB stack ──────────────────────────────────
            Layout hierarchy:
              [VERIFY]   ← above (when claimed and Grade < 2)
              [EDIT]     ← bottom-anchored (when admin/owner)
            When EDIT is hidden, VERIFY animates down to take its
            place via framer-motion's `layout` prop. `flex-col-reverse`
            keeps EDIT pinned to the bottom regardless of DOM order so
            it stays at the same visual anchor when alone.
        */}
      {(() => {
        const myProfileId = session?.user?.id ?? null;
        const me = myProfileId
          ? lobby.players.find(
              (p) => p.claimedByProfileId === myProfileId
            ) ?? null
          : null;
        const showEdit =
          !!myProfileId && myProfileId === lobby.ownerUserId;
        // Verify FAB is gated by lobby's verify_mode. Only the full
        // mode runs the Phase 2 challenge; "claim_only" stops at
        // Grade 1 so there's nothing to do here, and "disabled"
        // turns the whole flow off.
        const verifyMode = lobby.verifyMode ?? "full";
        const showVerify =
          verifyMode === "full" && !!me && (me.verifyGrade ?? 0) < 2;
        if (!showEdit && !showVerify) return null;
        return (
          <div className="fixed bottom-10 left-10 z-50">
            <div className="flex flex-col-reverse items-center gap-3">
              <AnimatePresence initial={false}>
                {showEdit && (
                  <motion.div
                    key="edit-fab"
                    layout
                    initial={{ opacity: 0, y: -10, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.85 }}
                    transition={{
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <DiamondButton
                      icon="edit"
                      label="EDIT"
                      onClick={() => setEditOpen(true)}
                    />
                  </motion.div>
                )}
                {showVerify && (
                  <motion.div
                    key="verify-fab"
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.85 }}
                    transition={{
                      duration: 0.28,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <DiamondButton
                      color="blue"
                      icon={<ShieldCheck className="w-4 h-4" />}
                      label="VERIFY"
                      onClick={() => setVerifyOpen(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );
      })()}

      {editOpen && (
        <EditLobbyDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          lobby={lobby}
          onSaved={() => setRefreshTick((t) => t + 1)}
          onDeleted={() => navigate("/dashboard/scout")}
        />
      )}

      {/* Verify accounts dialog — mounted independently so closing
          the dialog doesn't unmount the FAB stack mid-animation. */}
      {(() => {
        const myProfileId = session?.user?.id ?? null;
        const me = myProfileId
          ? lobby.players.find(
              (p) => p.claimedByProfileId === myProfileId
            ) ?? null
          : null;
        if (!me) return null;
        const verifyRows: VerifyAccountRow[] = me.accounts.map((a) => ({
          lobbyPlayerId: me.id,
          puuid: a.puuid,
          region: a.region,
          riotName: a.riotName,
          riotTag: a.riotTag,
          verifiedAt: a.verifiedAt ?? null,
        }));
        return (
          <VerifyAccountsDialog
            open={verifyOpen}
            onClose={() => setVerifyOpen(false)}
            accounts={verifyRows}
            playerDisplayName={me.displayName}
            playerColor={me.color}
            onChanged={() => setRefreshTick((t) => t + 1)}
          />
        );
      })()}
    </div>
  );
}
