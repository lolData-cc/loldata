// src/components/matchreplay/PlaybackBar.tsx
//
// Slim playback bar that lives BELOW the map. It only carries the
// scrubber + the event markers + the minute ticks + the current
// timecode. All transport buttons + speed chips have been moved to
// floating overlays on the map itself.

import * as React from "react";
import { useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import type { MatchTimeline } from "./types";
import { allEvents, fmtClock, teamOf } from "./derive";
import type { ReplaySpeed } from "./useReplayPlayback";

export interface PlaybackBarProps {
  timeline: MatchTimeline;
  durationMs: number;
  timeMs: number;
  isPlaying: boolean;
  speed: ReplaySpeed;
  onTogglePlay: () => void;
  onSeek: (ms: number) => void;
  onSetSpeed: (s: ReplaySpeed) => void;
  onStep: (deltaMs: number) => void;
}

export function PlaybackBar({
  timeline, durationMs, timeMs, onSeek,
}: PlaybackBarProps) {
  const scrubRef = useRef<HTMLDivElement>(null);

  // Event markers along the time axis. Compact; mouse-over reveals what.
  const markers = useMemo(() => {
    const all = allEvents(timeline);
    type Marker = { t: number; kind: string; tint: string; label: string };
    const out: Marker[] = [];
    for (const e of all) {
      if (e.type === "CHAMPION_KILL" && e.killerId && e.killerId > 0) {
        const t = teamOf(e.killerId);
        out.push({
          t: e.timestamp,
          kind: "kill",
          tint: t === 100 ? "#5BA8E6" : "#d63336",
          label: `Kill @ ${fmtClock(e.timestamp)}`,
        });
      } else if (e.type === "ELITE_MONSTER_KILL" && e.killerTeamId) {
        const isBlue = e.killerTeamId === 100;
        const color =
          e.monsterType === "DRAGON" ? "#e67e22" :
          e.monsterType === "BARON_NASHOR" ? "#9b59b6" :
          e.monsterType === "RIFTHERALD" ? "#a07242" :
          e.monsterType === "HORDE" ? "#7f8c8d" :
          e.monsterType === "ATAKHAN" ? "#f1c40f" :
          (isBlue ? "#5BA8E6" : "#d63336");
        out.push({
          t: e.timestamp,
          kind: "obj",
          tint: color,
          label: `${e.monsterType ?? "Obj"} ${e.monsterSubType ? `(${e.monsterSubType.replace("_DRAGON", "")})` : ""} @ ${fmtClock(e.timestamp)}`,
        });
      } else if (e.type === "BUILDING_KILL") {
        const winner = e.teamId === 100 ? "#d63336" : "#5BA8E6";
        out.push({
          t: e.timestamp,
          kind: e.buildingType === "INHIBITOR_BUILDING" ? "inhib" : "tower",
          tint: winner,
          label: `${e.buildingType?.replace("_BUILDING", "") ?? "Building"} @ ${fmtClock(e.timestamp)}`,
        });
      }
    }
    return out;
  }, [timeline]);

  const playheadPct = durationMs > 0 ? (timeMs / durationMs) * 100 : 0;

  // ── Scrubber interaction ──
  const seekFromEvent = useCallback((clientX: number) => {
    const el = scrubRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const pct = x / rect.width;
    onSeek(pct * durationMs);
  }, [durationMs, onSeek]);

  const onScrubPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seekFromEvent(e.clientX);
  }, [seekFromEvent]);
  const onScrubPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return;
    seekFromEvent(e.clientX);
  }, [seekFromEvent]);

  // Minute tick labels (every 2.5 min).
  const minuteTicks = useMemo(() => {
    const out: number[] = [];
    const step = 150_000;
    for (let t = 0; t <= durationMs; t += step) out.push(t);
    return out;
  }, [durationMs]);

  return (
    <div className="w-full select-none">
      {/* Event markers strip */}
      <div className="relative h-3 mb-0.5">
        {markers.map((m, i) => {
          const left = durationMs > 0 ? (m.t / durationMs) * 100 : 0;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(m.t)}
              title={m.label}
              className="absolute top-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
              style={{ left: `${left}%`, transform: "translate(-50%, -50%)" }}
            >
              <div
                className={cn(
                  "w-[5px] h-[5px] rounded-sm transition-all hover:scale-[1.6]",
                  m.kind === "kill" ? "rotate-45" : "",
                )}
                style={{ background: m.tint, boxShadow: `0 0 3px ${m.tint}` }}
              />
            </button>
          );
        })}
      </div>

      {/* Scrubber */}
      <div
        ref={scrubRef}
        onPointerDown={onScrubPointerDown}
        onPointerMove={onScrubPointerMove}
        className="relative h-1.5 bg-flash/5 rounded-full cursor-pointer mb-1"
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-jade/40 to-jade/70"
          style={{ width: `${playheadPct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-jade shadow-[0_0_8px_rgba(0,217,146,0.8),0_0_2px_rgba(0,0,0,0.8)] pointer-events-none"
          style={{ left: `${playheadPct}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>

      {/* Bottom row: ticks (left) and timecode (right) */}
      <div className="relative h-3 flex items-center">
        {/* Minute ticks — laid out across the bar */}
        <div className="absolute inset-0">
          {minuteTicks.map((t, i) => {
            const left = durationMs > 0 ? (t / durationMs) * 100 : 0;
            return (
              <div
                key={`tick-${i}`}
                className="absolute top-0 text-[8px] font-mono text-flash/30 tabular-nums tracking-wider"
                style={{ left: `${left}%`, transform: "translateX(-50%)" }}
              >
                {fmtClock(t)}
              </div>
            );
          })}
        </div>
        {/* Timecode — pinned to the right edge */}
        <div className="absolute right-0 bottom-0 flex items-baseline gap-1 font-mono tabular-nums leading-none bg-liquirice/80 px-1 rounded-sm">
          <span className="text-jade text-[11px] font-semibold">{fmtClock(timeMs)}</span>
          <span className="text-flash/25 text-[9px]">/</span>
          <span className="text-flash/45 text-[9px]">{fmtClock(durationMs)}</span>
        </div>
      </div>
    </div>
  );
}
