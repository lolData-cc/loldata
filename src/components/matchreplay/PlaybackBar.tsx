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
  // ── Shift-click loop range ──
  loopRange?: { start: number; end: number } | null;
  pendingLoopStart?: number | null;
  /** Called instead of onSeek when the user shift-clicks the scrubber. */
  onShiftSeek?: (ms: number) => void;
  onClearLoop?: () => void;
}

// Cyber-blue palette for the loop-range UI — tuned to the BLUE_TEAM
// tint already used by the playback bar's kill markers, glow boosted
// so the highlighted band reads clearly against the dark backdrop.
const LOOP_BLUE = "#5BA8E6";
const LOOP_GLOW = "rgba(91,168,230,0.7)";

export function PlaybackBar({
  timeline, durationMs, timeMs, onSeek,
  loopRange = null, pendingLoopStart = null, onShiftSeek, onClearLoop,
}: PlaybackBarProps) {
  const scrubRef = useRef<HTMLDivElement>(null);
  // Tracks the modifier state at pointerdown so the move handler can
  // ignore drags that started as a shift-click marker placement —
  // otherwise dragging after a shift+click would also scrub the head.
  const isShiftDownRef = useRef(false);

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
    isShiftDownRef.current = e.shiftKey && !!onShiftSeek;
    if (isShiftDownRef.current) {
      // Marker placement — don't scrub the head, just notify the
      // parent of the clicked timestamp.
      const el = scrubRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = x / rect.width;
      onShiftSeek?.(pct * durationMs);
      return;
    }
    seekFromEvent(e.clientX);
  }, [seekFromEvent, onShiftSeek, durationMs]);
  const onScrubPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!(e.buttons & 1)) return;
    // Dragging after a shift-click placement shouldn't suddenly scrub
    // the head — the user is still in marker mode for this gesture.
    if (isShiftDownRef.current) return;
    seekFromEvent(e.clientX);
  }, [seekFromEvent]);
  const onScrubPointerUp = useCallback(() => {
    isShiftDownRef.current = false;
  }, []);

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
              className="absolute top-1/2 -translate-y-1/2 cursor-clicker focus:outline-none"
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
        onPointerUp={onScrubPointerUp}
        title="Shift-click to mark a loop range start / end"
        className="relative h-1.5 bg-flash/5 rounded-full cursor-clicker mb-1"
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-jade/40 to-jade/70"
          style={{ width: `${playheadPct}%` }}
        />

        {/* Loop range glow band — sealed both ends. The band sits
            BEHIND the playhead and ABOVE the fill so it reads against
            the jade trail; markers extend slightly past the bar's top
            and bottom so they stay legible at this height. */}
        {loopRange && durationMs > 0 && (() => {
          const startPct = (loopRange.start / durationMs) * 100;
          const endPct = (loopRange.end / durationMs) * 100;
          return (
            <>
              <div
                className="absolute top-0 h-full rounded-sm pointer-events-none"
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(0.5, endPct - startPct)}%`,
                  background: "linear-gradient(180deg, rgba(91,168,230,0.45) 0%, rgba(91,168,230,0.18) 100%)",
                  boxShadow: `0 0 12px ${LOOP_GLOW}, inset 0 0 0 0.5px ${LOOP_BLUE}`,
                }}
              />
              <div
                className="absolute -top-[4px] -bottom-[4px] w-[2px] rounded-full pointer-events-none"
                style={{
                  left: `${startPct}%`,
                  transform: "translateX(-50%)",
                  background: LOOP_BLUE,
                  boxShadow: `0 0 8px ${LOOP_GLOW}, 0 0 2px rgba(0,0,0,0.7)`,
                }}
              />
              <div
                className="absolute -top-[4px] -bottom-[4px] w-[2px] rounded-full pointer-events-none"
                style={{
                  left: `${endPct}%`,
                  transform: "translateX(-50%)",
                  background: LOOP_BLUE,
                  boxShadow: `0 0 8px ${LOOP_GLOW}, 0 0 2px rgba(0,0,0,0.7)`,
                }}
              />
            </>
          );
        })()}

        {/* Pending single marker — drawn while waiting for the user's
            second shift-click. Soft pulse so it reads as "armed". */}
        {pendingLoopStart != null && durationMs > 0 && (
          <div
            className="absolute -top-[4px] -bottom-[4px] w-[2px] rounded-full pointer-events-none animate-pulse"
            style={{
              left: `${(pendingLoopStart / durationMs) * 100}%`,
              transform: "translateX(-50%)",
              background: LOOP_BLUE,
              boxShadow: `0 0 10px ${LOOP_GLOW}, 0 0 2px rgba(0,0,0,0.7)`,
            }}
          />
        )}

        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-jade shadow-[0_0_8px_rgba(0,217,146,0.8),0_0_2px_rgba(var(--c-shadow),0.8)] pointer-events-none"
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
        {/* Loop range chip — sits to the left of the timecode so the
            user can dismiss the band without leaving the bar. Hint
            tells them how to repeat the gesture. */}
        {(loopRange || pendingLoopStart != null) && (
          <button
            type="button"
            onClick={onClearLoop}
            title="Clear loop range (Esc)"
            className="absolute right-[88px] bottom-0 flex items-center gap-1 font-mono tabular-nums leading-none px-1.5 py-[2px] rounded-sm cursor-clicker transition-colors"
            style={{
              background: "rgba(91,168,230,0.10)",
              border: "1px solid rgba(91,168,230,0.35)",
              color: LOOP_BLUE,
            }}
          >
            <span className="text-[9px] tracking-wider uppercase">
              {loopRange
                ? `Loop ${fmtClock(loopRange.start)}–${fmtClock(loopRange.end)}`
                : "Set end"}
            </span>
            <span className="text-[10px] leading-none opacity-70">×</span>
          </button>
        )}

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
