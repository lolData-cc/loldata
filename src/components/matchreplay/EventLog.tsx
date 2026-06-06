// src/components/matchreplay/EventLog.tsx
//
// The narrative event log. Every line reads like a play-by-play caption
// rather than a wall of icons, because this is the piece the user said
// is the most important — they want to scan it and understand what
// happened at a glance.
//
// Row anatomy:
//   ┌────────────────────────────────────────────────────────────────┐
//   │ 12:34  [KILL]  ⓒViego killed ⓒPantheon · +Lee Sin · +400g shut │
//   └────────────────────────────────────────────────────────────────┘
//
// The leftmost time chip is fixed-width so columns align across rows.
// The type tag chip is color-coded per category (kill / objective /
// building / item / ward / lifecycle). The narrative sentence has
// inline champion icons next to player names and shows a small jade
// chip when the row is *new* (most recent 3 seconds of playback).

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import type { MatchTimeline, StaticMatch, TimelineEvent } from "./types";
import { eventsUpTo, fmtClock, staticParticipantByPid, teamOf } from "./derive";
import { dragonColor } from "./eventIcons";

type Filter = "kills" | "objs" | "buildings" | "items" | "wards";

export interface EventLogProps {
  timeline: MatchTimeline;
  staticMatch: StaticMatch | null;
  timeMs: number;
  onSeek: (ms: number) => void;
  onFocusPid?: (pid: number | null) => void;
}

const DEFAULT_FILTERS: Record<Filter, boolean> = {
  kills: true, objs: true, buildings: true, items: false, wards: false,
};

export function EventLog({ timeline, staticMatch, timeMs, onSeek, onFocusPid }: EventLogProps) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const listRef = useRef<HTMLDivElement>(null);
  const lastFollowedTsRef = useRef(0);
  const [autoFollow, setAutoFollow] = useState(true);

  const events = useMemo(() => {
    const all = eventsUpTo(timeline, timeMs);
    return all.filter((e) => {
      if (!filters.kills && (e.type === "CHAMPION_KILL" || e.type === "CHAMPION_SPECIAL_KILL")) return false;
      if (!filters.objs && e.type === "ELITE_MONSTER_KILL") return false;
      if (!filters.buildings && (e.type === "BUILDING_KILL" || e.type === "TURRET_PLATE_DESTROYED")) return false;
      if (!filters.items && (e.type === "ITEM_PURCHASED" || e.type === "ITEM_SOLD")) return false;
      if (!filters.wards && (e.type === "WARD_PLACED" || e.type === "WARD_KILL")) return false;
      // Always hide noise:
      if (e.type === "SKILL_LEVEL_UP" || e.type === "LEVEL_UP" ||
          e.type === "ITEM_DESTROYED" || e.type === "ITEM_UNDO" ||
          e.type === "PAUSE_END" || e.type === "PAUSE_START" ||
          e.type === "OBJECTIVE_BOUNTY_START" || e.type === "OBJECTIVE_BOUNTY_END" ||
          e.type === "OBJECTIVE_BOUNTY_FINISH") return false;
      return true;
    });
  }, [timeline, timeMs, filters]);

  // Auto-scroll to the bottom on new events.
  useEffect(() => {
    if (!autoFollow) return;
    const last = events[events.length - 1];
    if (!last) return;
    if (last.timestamp === lastFollowedTsRef.current) return;
    lastFollowedTsRef.current = last.timestamp;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events, autoFollow]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header row: title + filters + auto-follow */}
      <div className="flex items-center gap-2 mb-2.5 flex-wrap shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-flash/60">
          Event Log
        </span>
        <span className="text-[10px] font-mono tabular-nums text-flash/35">
          {events.length}
        </span>
        <div className="flex items-center gap-1 ml-2">
          {(["kills", "objs", "buildings", "items", "wards"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilters((p) => ({ ...p, [f]: !p[f] }))}
              className={cn(
                "px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-all cursor-clicker rounded-sm",
                filters[f]
                  ? "text-jade bg-jade/10 ring-1 ring-jade/30"
                  : "text-flash/40 ring-1 ring-flash/10 hover:text-flash/65"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAutoFollow((p) => !p)}
          className={cn(
            "ml-auto px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider transition-all cursor-clicker rounded-sm",
            autoFollow
              ? "text-jade bg-jade/10 ring-1 ring-jade/30"
              : "text-flash/40 ring-1 ring-flash/10 hover:text-flash/65"
          )}
        >
          {autoFollow ? "● follow" : "○ follow"}
        </button>
      </div>

      {/* List */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto cyber-scrollbar pr-1 space-y-1"
      >
        {events.length === 0 && (
          <div className="text-flash/30 text-[12px] font-geist italic mt-4 text-center">
            No events yet — let the replay play
          </div>
        )}
        {events.map((e, i) => (
          <EventRow
            key={`${e._frame}-${e.timestamp}-${i}`}
            e={e}
            now={timeMs}
            onSeek={onSeek}
            onFocusPid={onFocusPid}
            staticMatch={staticMatch}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Single row ─────────────────────────────────────────────────────

const RECENT_MS = 3500;

function EventRow({
  e, now, onSeek, onFocusPid, staticMatch,
}: {
  e: TimelineEvent & { _frame: number };
  now: number;
  onSeek: (ms: number) => void;
  onFocusPid?: (pid: number | null) => void;
  staticMatch: StaticMatch | null;
}) {
  const sp = (pid?: number) =>
    pid && pid >= 1 && pid <= 10 ? staticParticipantByPid(staticMatch, pid) : null;

  const champName = (pid?: number) => sp(pid)?.championName ?? null;
  const playerName = (pid?: number) =>
    sp(pid)?.riotIdGameName ?? sp(pid)?.summonerName ?? "—";

  // Builders
  const champ = (pid?: number) =>
    pid ? (
      <ChampInline
        pid={pid}
        name={champName(pid) ?? undefined}
        onClick={() => onFocusPid?.(pid)}
      />
    ) : null;

  const teamWord = (teamId: number, capitalize = true) =>
    teamId === 100 ? (capitalize ? "Blue" : "blue") : (capitalize ? "Red" : "red");

  const teamTint = (teamId: number) => (teamId === 100 ? "#5BA8E6" : "#d63336");

  let tag: { label: string; tint: string; bg: string } | null = null;
  let body: React.ReactNode = null;

  if (e.type === "CHAMPION_KILL") {
    const killer = e.killerId && e.killerId > 0 ? e.killerId : null;
    const victim = e.victimId;
    const assistIds = (e.assistingParticipantIds ?? []).filter((x) => x > 0);
    tag = killer
      ? { label: "kill", tint: teamTint(teamOf(killer)), bg: teamOf(killer) === 100 ? "bg-[#5BA8E6]/12" : "bg-[#d63336]/12" }
      : { label: "exec", tint: "rgba(255,255,255,0.45)", bg: "bg-flash/[0.04]" };
    body = (
      <>
        {killer ? (
          <>
            {champ(killer)} <span className="text-flash/85">killed</span> {champ(victim)}
          </>
        ) : (
          <>
            {champ(victim)} <span className="text-flash/55">was executed</span>
          </>
        )}
        {assistIds.length > 0 && (
          <span className="text-flash/45 ml-1">
            · assist {assistIds.slice(0, 3).map((aid, i) => (
              <React.Fragment key={aid}>
                {i > 0 && <span className="text-flash/30">, </span>}
                <span className="inline-flex items-center align-middle gap-0.5">
                  {champ(aid)}
                </span>
              </React.Fragment>
            ))}
            {assistIds.length > 3 && <span> +{assistIds.length - 3}</span>}
          </span>
        )}
        {!!e.shutdownBounty && (
          <span className="ml-2 text-citrine font-mono tabular-nums text-[10px]">
            +{e.shutdownBounty}g shutdown
          </span>
        )}
        {!e.shutdownBounty && !!e.bounty && (
          <span className="ml-2 text-citrine/70 font-mono tabular-nums text-[10px]">
            +{e.bounty}g
          </span>
        )}
      </>
    );
  } else if (e.type === "CHAMPION_SPECIAL_KILL") {
    tag = { label: "epic", tint: "#FFB615", bg: "bg-citrine/15" };
    const headline =
      e.killType === "KILL_FIRST_BLOOD" ? "First Blood!" :
      e.killType === "KILL_ACE" ? "ACE — team wiped!" :
      e.killType === "KILL_MULTI" ? `${e.multiKillLength ?? 2}× Multi-Kill` : "Special kill";
    body = (
      <>
        <span className="text-citrine font-bold tracking-wide">{headline}</span>
        {e.killerId && (
          <>
            <span className="text-flash/55 ml-1">drawn by</span> {champ(e.killerId)}
          </>
        )}
      </>
    );
  } else if (e.type === "ELITE_MONSTER_KILL") {
    const team = e.killerTeamId === 100 || e.killerTeamId === 200 ? e.killerTeamId : null;
    const tint =
      e.monsterType === "DRAGON" ? dragonColor(e.monsterSubType) :
      e.monsterType === "BARON_NASHOR" ? "#9b59b6" :
      e.monsterType === "RIFTHERALD" ? "#a07242" :
      e.monsterType === "HORDE" ? "#7f8c8d" :
      e.monsterType === "ATAKHAN" ? "#f1c40f" :
      "#ffffff";
    const objLabel =
      e.monsterType === "DRAGON"
        ? `${e.monsterSubType?.replace("_DRAGON", "")?.toLowerCase() ?? "Drake"} Drake`
        : e.monsterType === "BARON_NASHOR" ? "Baron Nashor"
        : e.monsterType === "RIFTHERALD" ? "Rift Herald"
        : e.monsterType === "HORDE" ? "Voidgrub"
        : e.monsterType === "ATAKHAN" ? "Atakhan"
        : "Objective";
    tag = { label: "obj", tint, bg: "bg-flash/[0.04]" };
    body = (
      <>
        {team ? (
          <span style={{ color: teamTint(team) }} className="font-semibold">
            {teamWord(team)}
          </span>
        ) : (
          <span className="text-flash/55">Someone</span>
        )}{" "}
        <span className="text-flash/70">secured</span>{" "}
        <span style={{ color: tint }} className="font-semibold capitalize">
          {objLabel}
        </span>
        {e.killerId && (
          <span className="text-flash/45 ml-1">· last hit {champ(e.killerId)}</span>
        )}
      </>
    );
  } else if (e.type === "BUILDING_KILL") {
    const winner = e.teamId === 100 ? 200 : e.teamId === 200 ? 100 : 0;
    const tint = winner ? teamTint(winner) : "rgba(255,255,255,0.45)";
    const isInhib = e.buildingType === "INHIBITOR_BUILDING";
    const towerLabel = e.towerType?.replace("_TURRET", "")?.toLowerCase() ?? "";
    const lane = e.laneType?.replace("_LANE", "")?.toLowerCase() ?? "";
    tag = isInhib
      ? { label: "inhib", tint, bg: "bg-jade/[0.06]" }
      : { label: "tower", tint, bg: "bg-flash/[0.04]" };
    body = (
      <>
        {winner ? (
          <span style={{ color: tint }} className="font-semibold">
            {teamWord(winner)}
          </span>
        ) : (
          <span className="text-flash/55">Someone</span>
        )}{" "}
        <span className="text-flash/70">destroyed the</span>{" "}
        <span style={{ color: tint }} className="font-semibold">
          {isInhib ? `${lane} inhibitor` : `${towerLabel} ${lane} tower`.trim()}
        </span>
        {e.killerId && e.killerId > 0 && (
          <span className="text-flash/45 ml-1">· {champ(e.killerId)}</span>
        )}
      </>
    );
  } else if (e.type === "TURRET_PLATE_DESTROYED") {
    const winner = e.teamId === 100 ? 200 : e.teamId === 200 ? 100 : 0;
    const tint = winner ? teamTint(winner) : "rgba(255,255,255,0.45)";
    const lane = e.laneType?.replace("_LANE", "")?.toLowerCase() ?? "";
    tag = { label: "plate", tint: "#FFB615", bg: "bg-citrine/[0.06]" };
    body = (
      <>
        {winner && (
          <span style={{ color: tint }} className="font-semibold">
            {teamWord(winner)}
          </span>
        )}{" "}
        <span className="text-flash/70">cracked a turret plate</span>{" "}
        <span className="text-flash/50">({lane})</span>
      </>
    );
  } else if (e.type === "ITEM_PURCHASED") {
    tag = { label: "item", tint: "#FFB615", bg: "bg-citrine/[0.04]" };
    body = (
      <>
        {champ(e.participantId)} <span className="text-flash/65">picked up</span>
        {e.itemId ? (
          <img
            src={`${cdnBaseUrl()}/img/item/${e.itemId}.png`}
            alt=""
            className="inline-block w-4 h-4 mx-1 align-middle rounded-sm ring-1 ring-flash/10"
          />
        ) : null}
        <span className="text-flash/45 text-[10px]">— {playerName(e.participantId)}</span>
      </>
    );
  } else if (e.type === "ITEM_SOLD") {
    tag = { label: "sold", tint: "rgba(255,255,255,0.45)", bg: "bg-flash/[0.03]" };
    body = (
      <>
        {champ(e.participantId)} <span className="text-flash/65">sold</span>
        {e.itemId ? (
          <img
            src={`${cdnBaseUrl()}/img/item/${e.itemId}.png`}
            alt=""
            className="inline-block w-4 h-4 mx-1 align-middle rounded-sm ring-1 ring-flash/10 opacity-60 grayscale"
          />
        ) : null}
      </>
    );
  } else if (e.type === "WARD_PLACED") {
    tag = { label: "ward", tint: "#00d992", bg: "bg-jade/[0.06]" };
    const wardName = (e.wardType ?? "ward")
      .replace("_TRINKET", " trinket")
      .replace("_WARD", " ward")
      .replace("TEEMO_MUSHROOM", "Teemo shroom")
      .toLowerCase();
    body = (
      <>
        {champ(e.creatorId)} <span className="text-flash/65">placed a</span>{" "}
        <span className="text-jade/85 lowercase">{wardName}</span>
      </>
    );
  } else if (e.type === "WARD_KILL") {
    tag = { label: "vision", tint: "rgba(255,255,255,0.55)", bg: "bg-flash/[0.04]" };
    body = (
      <>
        {champ(e.killerId)} <span className="text-flash/65">killed an enemy ward</span>
      </>
    );
  } else if (e.type === "GAME_END") {
    const win = e.winningTeam ?? 0;
    const tint = win === 100 ? "#5BA8E6" : "#d63336";
    tag = { label: "end", tint: "#00d992", bg: "bg-jade/12" };
    body = (
      <span className="font-semibold">
        <span style={{ color: tint }}>Team {win === 100 ? "Blue" : "Red"}</span>{" "}
        <span className="text-flash/80">wins the game</span>
      </span>
    );
  } else {
    return null;
  }

  const isRecent = now - e.timestamp <= RECENT_MS;

  return (
    <button
      type="button"
      onClick={() => onSeek(e.timestamp)}
      className={cn(
        "w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm transition-all cursor-clicker",
        "hover:bg-jade/[0.06] hover:translate-x-[1px]",
        isRecent ? "bg-jade/[0.05] ring-1 ring-jade/15" : "",
      )}
    >
      {/* Time chip */}
      <span className="shrink-0 w-11 text-right text-[12px] font-mono tabular-nums text-flash/55 tracking-[0.05em]">
        {fmtClock(e.timestamp)}
      </span>

      {/* Type tag pill */}
      {tag && (
        <span
          className={cn(
            "shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] rounded-sm min-w-[44px] text-center",
            tag.bg,
          )}
          style={{ color: tag.tint, boxShadow: `inset 0 0 0 1px ${tag.tint}40` }}
        >
          {tag.label}
        </span>
      )}

      {/* Narrative — Geist for readability, slightly tighter than default */}
      <div className="flex-1 min-w-0 text-[13px] font-geist leading-snug truncate text-flash/90">
        {body}
      </div>

      {/* Tiny "new" pulse dot when very recent */}
      {isRecent && (
        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />
      )}
    </button>
  );
}

// ─── Champion inline chip (icon + name) ──────────────────────────────

function ChampInline({
  pid, name, onClick,
}: {
  pid: number;
  name?: string;
  onClick?: () => void;
}) {
  if (!name) return null;
  const tint = teamOf(pid) === 100 ? "#5BA8E6" : "#d63336";
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="inline-flex items-center gap-1 align-middle cursor-clicker hover:underline"
      style={{ color: tint }}
    >
      <img
        src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(name)}.png`}
        alt={name}
        className="w-4 h-4 rounded-full ring-1"
        style={{ boxShadow: `0 0 0 1px ${tint}88` }}
      />
      <span className="font-chakrapetch font-medium">{name}</span>
    </span>
  );
}
