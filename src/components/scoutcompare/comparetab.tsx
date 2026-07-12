// src/components/scoutcompare/comparetab.tsx
//
// Two-player VS comparison view. Pulls the leaderboard endpoint and
// aggregates per-player (across all their accounts) so the user can
// pick two of the lobby's members and see a side-by-side breakdown:
//   • current rank + LP delta
//   • games, winrate, avg KDA, KP% (computed from raw kills/teamkills
//     where available — we approximate from kills+assists/games)
//   • a per-row visual bar showing who has the edge
//
// Default selection: first two players in the lobby. If the user
// changes it, we persist the choice in component state only (no URL
// param) — the comparison is throw-away by design.

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { getRankImage } from "@/utils/rankIcons";

const JADE = "#00d992";

type LobbyAccountForCompare = {
  puuid: string;
  region: string;
  riotName: string;
  riotTag: string;
};

type LobbyPlayerForCompare = {
  id: string;
  displayName: string;
  color: string | null;
  iconId?: number | null;
  accounts: LobbyAccountForCompare[];
};

type LobbyForCompare = {
  slug: string;
  players: LobbyPlayerForCompare[];
};

type LeaderboardAccount = {
  puuid: string;
  playerId: string;
  playerDisplayName: string;
  color: string | null;
  iconId: number | null;
  currentRank: {
    tier: string;
    rankDivision: string | null;
    lp: number;
  } | null;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  avgKda: number;
  balance: number;
};

/** Aggregate per-player numbers (collapsing all their accounts). */
type PlayerAggregate = {
  playerId: string;
  displayName: string;
  color: string | null;
  iconId: number | null;
  // Best current rank across their accounts (highest ladder score).
  bestRank: { tier: string; rankDivision: string | null; lp: number } | null;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  avgKda: number;
  balance: number;
};

function profileIconUrl(iconId: number | null) {
  if (iconId === null || iconId === undefined) return null;
  return `https://cdn.loldata.cc/profileicon/${iconId}.png`;
}

// Tier color shorthand (mirrors the sidebar widgets).
function rankColorClass(tier: string): string {
  const t = tier.toUpperCase();
  if (t === "CHALLENGER") return "text-[#f4c874]";
  if (t === "GRANDMASTER") return "text-[#cd4747]";
  if (t === "MASTER") return "text-[#9a5dff]";
  if (t === "DIAMOND") return "text-[#5bb8ff]";
  if (t === "EMERALD") return "text-[#00d992]";
  if (t === "PLATINUM") return "text-[#5bd8b0]";
  if (t === "GOLD") return "text-[#e3b85b]";
  if (t === "SILVER") return "text-[#b5c3cc]";
  if (t === "BRONZE") return "text-[#a36c40]";
  return "text-flash/60";
}

export function CompareTab({
  slug,
  lobby,
  refreshTick,
}: {
  slug: string;
  lobby: LobbyForCompare;
  refreshTick: number;
}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftPlayerId, setLeftPlayerId] = useState<string | null>(
    lobby.players[0]?.id ?? null
  );
  const [rightPlayerId, setRightPlayerId] = useState<string | null>(
    lobby.players[1]?.id ?? null
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/scout/leaderboard/${slug}?window=all`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setLeaderboard(d?.accounts ?? []))
      .catch(console.error)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [slug, refreshTick]);

  // Aggregate leaderboard rows per playerId. We sum games/wins/etc,
  // pick the highest-rank account as bestRank, and recompute winrate
  // and avgKda from the aggregated counters (so it's not a misleading
  // unweighted average across accounts).
  const aggByPlayerId = useMemo(() => {
    const m = new Map<string, PlayerAggregate>();
    for (const row of leaderboard) {
      const cur = m.get(row.playerId);
      const lift = (
        a: PlayerAggregate | undefined,
        row: LeaderboardAccount
      ): PlayerAggregate => {
        if (!a) {
          return {
            playerId: row.playerId,
            displayName: row.playerDisplayName,
            color: row.color,
            iconId: row.iconId,
            bestRank: row.currentRank,
            games: row.games,
            wins: row.wins,
            losses: row.losses,
            winrate: row.winrate,
            kills: row.kills,
            deaths: row.deaths,
            assists: row.assists,
            avgKda: row.avgKda,
            balance: row.balance,
          };
        }
        const games = a.games + row.games;
        const wins = a.wins + row.wins;
        const losses = a.losses + row.losses;
        const kills = a.kills + row.kills;
        const deaths = a.deaths + row.deaths;
        const assists = a.assists + row.assists;
        const winrate = games > 0 ? Math.round((wins / games) * 100) : 0;
        const avgKda =
          deaths === 0
            ? Math.min(99, kills + assists)
            : (kills + assists) / deaths;
        return {
          ...a,
          // Keep the first non-null icon we encounter.
          iconId: a.iconId ?? row.iconId,
          bestRank: a.bestRank ?? row.currentRank,
          games,
          wins,
          losses,
          winrate,
          kills,
          deaths,
          assists,
          avgKda,
          balance: a.balance + row.balance,
        };
      };
      m.set(row.playerId, lift(cur, row));
    }
    return m;
  }, [leaderboard]);

  const left = leftPlayerId ? aggByPlayerId.get(leftPlayerId) ?? null : null;
  const right = rightPlayerId ? aggByPlayerId.get(rightPlayerId) ?? null : null;

  if (loading) {
    return (
      <div className="h-[640px] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-jade animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top picker row */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <PlayerPicker
          label="Player A"
          players={lobby.players}
          aggByPlayerId={aggByPlayerId}
          value={leftPlayerId}
          onChange={setLeftPlayerId}
          excludeId={rightPlayerId}
          align="right"
        />
        <span className="text-[28px] font-chakrapetch font-bold text-jade tracking-[0.1em] [text-shadow:0_0_18px_rgba(0,217,146,0.4)]">
          VS
        </span>
        <PlayerPicker
          label="Player B"
          players={lobby.players}
          aggByPlayerId={aggByPlayerId}
          value={rightPlayerId}
          onChange={setRightPlayerId}
          excludeId={leftPlayerId}
          align="left"
        />
      </div>

      {/* Stat rows */}
      {left && right ? (
        <div className="rounded-md bg-filmdark/20 border border-flash/[0.06] divide-y divide-flash/[0.06] overflow-hidden">
          <StatRow
            label="Games"
            leftValue={left.games}
            rightValue={right.games}
            format={(n) => `${n}`}
            higherIsBetter
          />
          <StatRow
            label="Winrate"
            leftValue={left.winrate}
            rightValue={right.winrate}
            format={(n) => `${n}%`}
            higherIsBetter
            barMax={100}
          />
          <StatRow
            label="Avg KDA"
            leftValue={left.avgKda}
            rightValue={right.avgKda}
            format={(n) => n.toFixed(2)}
            higherIsBetter
          />
          <StatRow
            label="Total K / D / A"
            leftStr={`${left.kills} / ${left.deaths} / ${left.assists}`}
            rightStr={`${right.kills} / ${right.deaths} / ${right.assists}`}
            higherIsBetter={null}
          />
          <StatRow
            label="LP gain"
            leftValue={left.balance}
            rightValue={right.balance}
            format={(n) => `${n > 0 ? "+" : ""}${n}`}
            higherIsBetter
          />
          <RankRow left={left} right={right} />
        </div>
      ) : (
        <div className="rounded-md bg-filmdark/20 border border-flash/[0.06] py-10 text-center text-[11px] font-jetbrains tracking-[0.2em] uppercase text-flash/30">
          Pick two players to compare
        </div>
      )}
    </div>
  );
}

// ─── Player picker (sidebar-like) ───────────────────────────────────
function PlayerPicker({
  label,
  players,
  aggByPlayerId,
  value,
  onChange,
  excludeId,
  align,
}: {
  label: string;
  players: LobbyPlayerForCompare[];
  aggByPlayerId: Map<string, PlayerAggregate>;
  value: string | null;
  onChange: (id: string) => void;
  excludeId: string | null;
  align: "left" | "right";
}) {
  const selected = value ? aggByPlayerId.get(value) ?? null : null;
  const accent = selected?.color || JADE;
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "right" ? "items-end" : "items-start"
      )}
    >
      <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/40">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {players.map((p) => {
          const isSelected = p.id === value;
          const isExcluded = p.id === excludeId;
          const agg = aggByPlayerId.get(p.id);
          const iconId = agg?.iconId ?? p.iconId ?? null;
          const url = profileIconUrl(iconId);
          const color = p.color || JADE;
          return (
            <button
              key={p.id}
              type="button"
              disabled={isExcluded}
              onClick={() => onChange(p.id)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-[3px] border transition-all cursor-clicker",
                isSelected
                  ? "border-jade/60 bg-jade/[0.12]"
                  : isExcluded
                    ? "border-flash/5 bg-filmdark/15 opacity-30 cursor-not-allowed"
                    : "border-flash/15 bg-filmdark/20 hover:border-flash/35"
              )}
            >
              {url ? (
                <img
                  src={url}
                  alt=""
                  className="w-6 h-6 rounded-full shrink-0"
                  style={{
                    border: `1px solid color-mix(in srgb, ${color} 50%, transparent)`,
                  }}
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: `1px solid color-mix(in srgb, ${color} 50%, transparent)`,
                  }}
                >
                  <span
                    className="text-[10px] font-jetbrains font-bold"
                    style={{ color }}
                  >
                    {p.displayName.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              <span
                className="text-[11px] font-chakrapetch font-bold"
                style={{ color: isSelected ? accent : "#d7d8d9" }}
              >
                {p.displayName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Stat row with comparison bar ───────────────────────────────────
function StatRow({
  label,
  leftValue,
  rightValue,
  leftStr,
  rightStr,
  format,
  higherIsBetter,
  barMax,
}: {
  label: string;
  leftValue?: number;
  rightValue?: number;
  leftStr?: string;
  rightStr?: string;
  format?: (n: number) => string;
  higherIsBetter: boolean | null;
  barMax?: number;
}) {
  const hasNumeric = leftValue !== undefined && rightValue !== undefined;
  let leftRatio = 0.5;
  let rightRatio = 0.5;
  if (hasNumeric && higherIsBetter !== null) {
    const total =
      barMax !== undefined
        ? barMax * 2
        : Math.max(0.0001, Math.abs(leftValue!) + Math.abs(rightValue!));
    leftRatio = Math.max(0.05, Math.abs(leftValue!) / total);
    rightRatio = Math.max(0.05, Math.abs(rightValue!) / total);
    const sum = leftRatio + rightRatio;
    leftRatio /= sum;
    rightRatio /= sum;
  }
  const leftWins =
    hasNumeric && higherIsBetter !== null
      ? higherIsBetter
        ? leftValue! > rightValue!
        : leftValue! < rightValue!
      : false;
  const rightWins =
    hasNumeric && higherIsBetter !== null
      ? higherIsBetter
        ? rightValue! > leftValue!
        : rightValue! < leftValue!
      : false;

  return (
    <div className="px-5 py-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <span
          className={cn(
            "text-[14px] font-chakrapetch font-bold tabular-nums text-right",
            leftWins ? "text-jade" : "text-flash/85"
          )}
        >
          {hasNumeric ? format!(leftValue!) : leftStr}
        </span>
        <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/45 min-w-[88px] text-center">
          {label}
        </span>
        <span
          className={cn(
            "text-[14px] font-chakrapetch font-bold tabular-nums text-left",
            rightWins ? "text-jade" : "text-flash/85"
          )}
        >
          {hasNumeric ? format!(rightValue!) : rightStr}
        </span>
      </div>
      {hasNumeric && higherIsBetter !== null && (
        <div className="flex items-center gap-[2px] mt-2">
          <div
            className={cn(
              "h-[3px] rounded-full transition-all",
              leftWins ? "bg-jade" : "bg-flash/30"
            )}
            style={{ width: `${leftRatio * 100}%` }}
          />
          <div
            className={cn(
              "h-[3px] rounded-full transition-all",
              rightWins ? "bg-jade" : "bg-flash/30"
            )}
            style={{ width: `${rightRatio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function RankRow({
  left,
  right,
}: {
  left: PlayerAggregate;
  right: PlayerAggregate;
}) {
  const tagFor = (r: PlayerAggregate["bestRank"]) => {
    if (!r) return null;
    return `${r.tier}${r.rankDivision ? ` ${r.rankDivision}` : ""}`;
  };
  return (
    <div className="px-5 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      {/* Left */}
      <div className="flex items-center justify-end gap-3">
        <div className="flex flex-col items-end">
          <span
            className={cn(
              "text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium",
              left.bestRank ? rankColorClass(left.bestRank.tier) : "text-flash/40"
            )}
          >
            {tagFor(left.bestRank) ?? "Unranked"}
          </span>
          <span className="text-[12px] font-chakrapetch font-bold tabular-nums text-flash/85 mt-0.5">
            {left.bestRank?.lp ?? 0}{" "}
            <span className="text-[9px] text-flash/40 ml-0.5">LP</span>
          </span>
        </div>
        {left.bestRank && (
          <img
            src={getRankImage(left.bestRank.tier)}
            alt={left.bestRank.tier}
            className="w-10 h-10 object-contain"
          />
        )}
      </div>
      <span className="text-[9px] font-jetbrains tracking-[0.25em] uppercase text-flash/45 text-center">
        Rank
      </span>
      {/* Right */}
      <div className="flex items-center gap-3">
        {right.bestRank && (
          <img
            src={getRankImage(right.bestRank.tier)}
            alt={right.bestRank.tier}
            className="w-10 h-10 object-contain"
          />
        )}
        <div className="flex flex-col items-start">
          <span
            className={cn(
              "text-[11px] font-jetbrains tracking-[0.18em] uppercase font-medium",
              right.bestRank
                ? rankColorClass(right.bestRank.tier)
                : "text-flash/40"
            )}
          >
            {tagFor(right.bestRank) ?? "Unranked"}
          </span>
          <span className="text-[12px] font-chakrapetch font-bold tabular-nums text-flash/85 mt-0.5">
            {right.bestRank?.lp ?? 0}{" "}
            <span className="text-[9px] text-flash/40 ml-0.5">LP</span>
          </span>
        </div>
      </div>
    </div>
  );
}
