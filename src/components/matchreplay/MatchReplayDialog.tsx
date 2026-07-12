// src/components/matchreplay/MatchReplayDialog.tsx
//
// The flagship Match Replay Viewer.
//
// Layout (80vw × 90vh):
//
//   ┌──────────────────────────────────────────────────────────────────────┐
//   │ HEADER: bans blue • gold blue • tabs • gold red • bans red • close  │
//   ├──────────────┬─────────────────────────────────────┬─────────────────┤
//   │              │                                     │                 │
//   │ DAMAGE BARS  │                                     │                 │
//   │              │           CENTER                    │   ROSTER        │
//   │     ──       │     (Map / Scoreboard /             │   (5 + 5)       │
//   │              │      GoldDiff full)                 │                 │
//   │ EVENT LOG    │                                     │                 │
//   │              │                                     │                 │
//   ├──────────────┴─────────────────────────────────────┴─────────────────┤
//   │                       PLAYBACK BAR                                   │
//   └──────────────────────────────────────────────────────────────────────┘

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X, Map as MapIcon, ListChecks, LineChart, Play, Pause, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cdnBaseUrl, normalizeChampName } from "@/config";

import type { MatchTimeline, StaticMatch, TeamId } from "./types";
import { useMatchTimeline } from "./timelineApi";
import { useReplayPlayback, type ReplaySpeed } from "./useReplayPlayback";
import {
  durationMs, fmtShortNum, fmtClock,
  objectivesAt, teamGoldAt, kdaAt,
  BLUE_IDS, RED_IDS,
} from "./derive";

import { RiftMap } from "./RiftMap";
import { PlaybackBar } from "./PlaybackBar";
import { EventLog } from "./EventLog";
import { DamageBars } from "./DamageBars";
import { RosterPanel } from "./RosterPanel";
import { ScoreboardLive } from "./ScoreboardLive";
import { GoldDiffChart } from "./GoldDiffChart";
import { DrawingOverlay, DrawingToolbar, DRAW_COLORS, type Stroke, type DrawTool } from "./DrawingOverlay";
import { CalibrationPanel, DEFAULT_CALIBRATION, DEFAULT_LANDMARK_OVERRIDES, type MapCalibration, type LandmarkOverrides } from "./DebugMapOverlay";
import { dragonColor, eliteMonsterIcon, TowerIcon, InhibitorIcon } from "./eventIcons";

type CenterView = "map" | "scoreboard" | "golddiff";

/** Minimal per-participant info the scout feed already has — enough to
 *  build a stand-in staticMatch when the parent doesn't have the full
 *  match-v5 payload (the scout feed doesn't include it). The dialog
 *  pairs each puuid with the timeline's metadata.participants ordering
 *  to assign the correct participantId. */
export interface RosterFallbackParticipant {
  puuid: string;
  championName: string | null;
  teamId: number | null;
  summonerName: string | null;
  riotTagline?: string | null;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
}

export interface MatchReplayDialogProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  region: string;
  /** The match-v5 static info, if the parent already has it loaded.
   *  Used to render bans, champion names, etc. without re-fetching. */
  staticMatch: StaticMatch | null;
  /** Optional puuid of the "main" player — kicks off focus. */
  focusPuuid?: string | null;
  /** Stand-in roster used when staticMatch is null. The scout feed
   *  doesn't ship the full match-v5 blob, so without this the roster
   *  panel / damage bars / event log all draw blank because
   *  staticParticipantByPid returns null for every PID. */
  rosterFallback?: RosterFallbackParticipant[];
}

export function MatchReplayDialog({
  open, onClose, matchId, region, staticMatch, focusPuuid, rosterFallback,
}: MatchReplayDialogProps) {
  const { data: timeline, loading, error } = useMatchTimeline(open ? matchId : null, region);

  // Build a stand-in StaticMatch from the timeline's puuid ordering +
  // the scout feed's rosterFallback. Only kicks in when the parent
  // didn't pass a real staticMatch (the scout MatchCard's case). The
  // timeline puts participants in the canonical 1..10 order via
  // metadata.participants[]; we look each puuid up in rosterFallback
  // to get the championName / summonerName / k/d/a. Fields we don't
  // know (items, perks, gold totals, level — all of which the timeline
  // supplies anyway) get safe zero defaults so the type stays happy.
  const syntheticStaticMatch = useMemo<StaticMatch | null>(() => {
    if (staticMatch) return null; // parent already gave us the real thing
    if (!timeline || !rosterFallback || rosterFallback.length === 0) return null;
    const byPuuid = new Map(rosterFallback.map((p) => [p.puuid, p]));
    const participants = timeline.metadata.participants.map((puuid, idx) => {
      const p = byPuuid.get(puuid);
      const tid: TeamId = (p?.teamId === 200 ? 200 : 100) as TeamId;
      return {
        puuid,
        participantId: idx + 1,
        teamId: tid,
        championId: 0,
        championName: p?.championName ?? "Unknown",
        riotIdGameName: p?.summonerName ?? undefined,
        riotIdTagline: p?.riotTagline ?? undefined,
        summonerName: p?.summonerName ?? undefined,
        summoner1Id: 0,
        summoner2Id: 0,
        champLevel: 1,
        kills: p?.kills ?? 0,
        deaths: p?.deaths ?? 0,
        assists: p?.assists ?? 0,
        totalDamageDealtToChampions: 0,
        goldEarned: 0,
        totalMinionsKilled: 0,
        neutralMinionsKilled: 0,
        item0: 0, item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 0,
        win: p?.win ?? false,
      };
    });
    return {
      metadata: { matchId },
      info: {
        gameDuration: 0,
        queueId: 0,
        participants,
        teams: [
          { teamId: 100 as TeamId, win: participants.find((p) => p.teamId === 100)?.win ?? false, bans: [] },
          { teamId: 200 as TeamId, win: participants.find((p) => p.teamId === 200)?.win ?? false, bans: [] },
        ],
      },
    };
  }, [staticMatch, timeline, rosterFallback, matchId]);

  const effectiveStaticMatch = staticMatch ?? syntheticStaticMatch;

  // Lock body scroll AND any inner scroll-container while open.
  // The site's RootLayout uses a wrapping <div> with
  // overflow-y-scroll, so just freezing the body wasn't enough —
  // the inner scroller still drifted under the dialog. We sweep
  // for any element currently set to overflow-y: scroll / auto and
  // freeze them all; restored exactly as they were on unmount.
  useEffect(() => {
    if (!open) return;
    const snapshots: Array<{ el: HTMLElement; overflow: string }> = [];
    const freeze = (el: HTMLElement) => {
      snapshots.push({ el, overflow: el.style.overflow });
      el.style.overflow = "hidden";
    };
    freeze(document.body);
    freeze(document.documentElement);
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (el === document.body || el === document.documentElement) return;
      const cs = window.getComputedStyle(el);
      if (cs.overflowY === "scroll" || cs.overflowY === "auto") {
        // Only lock if it's actually a top-level scroll container —
        // tiny ones inside the dialog (event log, etc.) should keep
        // their scroll. Heuristic: lock those bigger than 60% viewport.
        const rect = el.getBoundingClientRect();
        if (rect.height >= window.innerHeight * 0.6 && rect.width >= window.innerWidth * 0.6) {
          freeze(el);
        }
      }
    });
    return () => {
      snapshots.forEach(({ el, overflow }) => { el.style.overflow = overflow; });
    };
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[1400px] h-[92vh] bg-liquirice/95 rounded-lg ring-1 ring-flash/10 shadow-[0_30px_120px_-20px_rgba(var(--c-shadow),0.9),0_8px_28px_rgba(var(--c-shadow),0.7),inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden flex flex-col"
      >
        {/* Background ambient glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,217,146,0.06),transparent_60%)]" />

        {timeline ? (
          <Loaded
            timeline={timeline}
            staticMatch={effectiveStaticMatch}
            focusPuuid={focusPuuid ?? null}
            onClose={onClose}
          />
        ) : (
          <LoadingState loading={loading} error={error} onClose={onClose} />
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Loading / error state ────────────────────────────────────────────

function LoadingState({ loading, error, onClose }: { loading: boolean; error: string | null; onClose: () => void }) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full p-8">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 p-2 rounded-sm text-flash/40 hover:text-flash hover:bg-flash/10 transition-colors cursor-clicker"
      >
        <X className="w-4 h-4" />
      </button>
      {loading && (
        <div className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-jade rounded-sm animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-jade/70">
            Loading match timeline
          </div>
        </div>
      )}
      {error && (
        <div className="text-center space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#d63336]">
            Timeline unavailable
          </div>
          <div className="font-mono text-[11px] text-flash/50">{error}</div>
        </div>
      )}
    </div>
  );
}

// ─── Loaded body ──────────────────────────────────────────────────────

function Loaded({
  timeline, staticMatch, focusPuuid, onClose,
}: {
  timeline: MatchTimeline;
  staticMatch: StaticMatch | null;
  focusPuuid: string | null;
  onClose: () => void;
}) {
  const dur = useMemo(() => durationMs(timeline), [timeline]);

  // ── Shift-click loop range ─────────────────────────────────────
  // Shift+click on the scrubber drops a marker. The first click sets
  // pendingLoopStart; the second seals the range and the playback bar
  // shows a glowing blue band. Any subsequent shift+click clears the
  // existing range and starts a new pending marker. Escape clears at
  // any moment. While a range is set, useReplayPlayback loops the
  // playhead inside it, and DamageBars subtracts the cumulative damage
  // at range.start from the running totals so the chart reads "damage
  // dealt during this segment" only.
  const [pendingLoopStart, setPendingLoopStart] = useState<number | null>(null);
  const [loopRange, setLoopRange] = useState<{ start: number; end: number } | null>(null);

  const playback = useReplayPlayback({
    durationMs: dur,
    initialMs: 0,
    initialSpeed: 4,
    loopRange,
  });

  const [view, setView] = useState<CenterView>("map");
  const [hiddenPids, setHiddenPids] = useState<Set<number>>(new Set());

  const handleShiftSeek = useCallback(
    (t: number) => {
      if (loopRange) {
        // Already have a range — third shift+click resets and starts
        // a new pending marker at this position.
        setLoopRange(null);
        setPendingLoopStart(t);
        return;
      }
      if (pendingLoopStart != null) {
        // Second click — seal the range. Order doesn't matter (we
        // sort), and we require a minimum 500ms span to avoid an
        // accidental double-tap creating a zero-width band.
        const start = Math.min(pendingLoopStart, t);
        const end = Math.max(pendingLoopStart, t);
        if (end - start < 500) {
          // Reposition the pending marker instead of sealing.
          setPendingLoopStart(t);
          return;
        }
        setLoopRange({ start, end });
        setPendingLoopStart(null);
        playback.seek(start);
        return;
      }
      // First click — just stash the start.
      setPendingLoopStart(t);
    },
    [loopRange, pendingLoopStart, playback]
  );

  const handleClearLoop = useCallback(() => {
    setLoopRange(null);
    setPendingLoopStart(null);
  }, []);

  // Escape dismisses any pending marker / sealed range. Only mounted
  // while there's something to dismiss so we don't compete with the
  // dialog's own Esc-to-close on the empty case.
  useEffect(() => {
    if (!loopRange && pendingLoopStart == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        handleClearLoop();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [loopRange, pendingLoopStart, handleClearLoop]);

  // Drawing state — shared across mounts/unmounts within the dialog
  // so switching to scoreboard tab and back doesn't wipe annotations.
  const [drawTool, setDrawTool] = useState<DrawTool>("off");
  const [drawColor, setDrawColor] = useState<string>(DRAW_COLORS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // Map calibration — for aligning Riot's (0..15000) coordinate space
  // with the Wiki SR render. With debug ON, you drag landmark markers
  // to where they REALLY are, then hit Apply to compute the best-fit
  // transform (least-squares) and slap it on the wrapper.
  const [debugMap, setDebugMap] = useState(false);
  const [calibration, setCalibration] = useState<MapCalibration>(DEFAULT_CALIBRATION);
  // Seed the per-landmark anchors with the user's converged positions
  // so opening the debug overlay shows the calibrated state, and the
  // auto-fit button re-derives the same scaleX/scaleY/offsets the
  // dialog ships with by default.
  const [landmarkOverrides, setLandmarkOverrides] = useState<LandmarkOverrides>(DEFAULT_LANDMARK_OVERRIDES);

  // Map the focus puuid to a participantId once timeline arrives.
  const initialFocusPid = useMemo<number | null>(() => {
    if (!focusPuuid) return null;
    const idx = timeline.metadata.participants.indexOf(focusPuuid);
    return idx >= 0 ? idx + 1 : null;
  }, [timeline, focusPuuid]);
  const [focusedPid, setFocusedPid] = useState<number | null>(initialFocusPid);
  useEffect(() => { setFocusedPid(initialFocusPid); }, [initialFocusPid]);

  const toggleHidden = (pid: number) => {
    setHiddenPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  // Spacebar to toggle play
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " ") { e.preventDefault(); playback.toggle(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); playback.step(-15_000); }
      else if (e.key === "ArrowRight") { e.preventDefault(); playback.step(15_000); }
      else if (e.key === "ArrowUp") { e.preventDefault(); cycleSpeed(+1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); cycleSpeed(-1); }
    };
    const SPEEDS: ReplaySpeed[] = [0.5, 1, 2, 4, 8, 16];
    const cycleSpeed = (dir: number) => {
      const idx = SPEEDS.indexOf(playback.speed);
      const next = Math.max(0, Math.min(SPEEDS.length - 1, idx + dir));
      playback.setSpeed(SPEEDS[next]);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [playback]);

  return (
    <>
      <Header
        view={view}
        setView={setView}
        onClose={onClose}
        staticMatch={staticMatch}
      />

      {/* MAIN GRID — center column auto-sizes to the map (= its height
          via aspect-square), so the column hugs the map exactly. The
          1fr sidebars split whatever's left, with a min so they stay
          usable. gap-0 + no center bg = damage/roster touch the map. */}
      <div className="flex-1 min-h-0 grid grid-cols-[minmax(130px,1fr)_auto_minmax(150px,1fr)] gap-0 px-1 pt-1 pb-1 relative z-10">
        {/* LEFT — DAMAGE */}
        <section className="rounded-sm bg-flash/[0.015] ring-1 ring-flash/[0.06] p-2.5 overflow-y-auto cyber-scrollbar">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div
              className={cn(
                "text-[9px] font-mono uppercase tracking-[0.22em] transition-colors",
                loopRange ? "text-[#5BA8E6]" : "text-flash/45"
              )}
            >
              {loopRange ? "Damage in Window" : "Damage Chart"}
            </div>
            {loopRange && (
              <span
                className="text-[8px] font-mono tabular-nums text-[#5BA8E6]/80 px-1 py-[1px] rounded-sm border border-[#5BA8E6]/30 bg-[#5BA8E6]/[0.08]"
                title="Cumulative damage during the highlighted band"
              >
                {Math.round((loopRange.end - loopRange.start) / 1000)}s
              </span>
            )}
          </div>
          <DamageBars
            timeline={timeline}
            staticMatch={staticMatch}
            timeMs={playback.timeMs}
            focusedPid={focusedPid}
            onFocusPid={setFocusedPid}
            windowStart={loopRange?.start ?? null}
          />
        </section>

        {/* CENTER — auto-sized so the column hugs the map; nothing
            "blank" on the sides. Background panel is dropped so the
            damage/roster sidebars visually touch the map edges. */}
        <div className="relative min-h-0">
          {view === "map" && (
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="relative aspect-[3/2] h-full max-h-full max-w-full">
                <RiftMap
                  timeline={timeline}
                  staticMatch={staticMatch}
                  timeMs={playback.timeMs}
                  focusedPid={focusedPid}
                  hiddenPids={hiddenPids}
                  onFocusPid={setFocusedPid}
                  calibration={calibration}
                  debug={debugMap}
                  debugOverrides={landmarkOverrides}
                  setDebugOverrides={setLandmarkOverrides}
                />
                <DrawingOverlay
                  tool={drawTool}
                  color={drawColor}
                  strokes={strokes}
                  setStrokes={setStrokes}
                />
                <DrawingToolbar
                  tool={drawTool}
                  setTool={setDrawTool}
                  color={drawColor}
                  setColor={setDrawColor}
                  onClear={() => setStrokes([])}
                  onUndo={() => setStrokes((p) => p.slice(0, -1))}
                  hasStrokes={strokes.length > 0}
                />
                <CalibrationPanel
                  debug={debugMap}
                  setDebug={setDebugMap}
                  overrides={landmarkOverrides}
                  setOverrides={setLandmarkOverrides}
                  appliedCalibration={calibration}
                  onApply={(c) => setCalibration(c)}
                  onResetCalibration={() => setCalibration(DEFAULT_CALIBRATION)}
                />
                {/* TOP-CENTER: score (both teams) */}
                <ScoreTopOverlay
                  timeline={timeline}
                  timeMs={playback.timeMs}
                />
                {/* BOTTOM-LEFT: speed chips */}
                <SpeedControlsOverlay
                  speed={playback.speed}
                  onSetSpeed={playback.setSpeed}
                />
                {/* BOTTOM-CENTER: transport buttons */}
                <PlaybackControlsOverlay
                  isPlaying={playback.isPlaying}
                  onToggle={playback.toggle}
                  onStep={playback.step}
                />
              </div>
            </div>
          )}
          {view === "scoreboard" && (
            <div className="w-full h-full overflow-y-auto cyber-scrollbar p-3">
              <ScoreboardLive timeline={timeline} staticMatch={staticMatch} timeMs={playback.timeMs} />
            </div>
          )}
          {view === "golddiff" && (
            <div className="w-full h-full overflow-y-auto cyber-scrollbar p-4 flex flex-col justify-center">
              <GoldDiffChart
                timeline={timeline}
                durationMs={dur}
                timeMs={playback.timeMs}
                onSeek={playback.seek}
              />
            </div>
          )}
        </div>

        {/* RIGHT — ROSTERS */}
        <section className="min-h-0 rounded-sm bg-flash/[0.015] ring-1 ring-flash/[0.06] p-2.5 overflow-y-auto cyber-scrollbar">
          <div className="text-[9px] font-mono uppercase tracking-[0.22em] text-flash/45 mb-2">
            Players
          </div>
          <RosterPanel
            timeline={timeline}
            staticMatch={staticMatch}
            timeMs={playback.timeMs}
            focusedPid={focusedPid}
            hiddenPids={hiddenPids}
            onFocusPid={setFocusedPid}
            onToggleHidden={toggleHidden}
          />
        </section>
      </div>

      {/* PLAYBACK BAR (compact) */}
      <div className="px-4 pb-1 pt-1 border-t border-flash/[0.05] bg-flash/[0.015] relative z-10">
        <PlaybackBar
          timeline={timeline}
          durationMs={dur}
          timeMs={playback.timeMs}
          isPlaying={playback.isPlaying}
          speed={playback.speed}
          onTogglePlay={playback.toggle}
          onSeek={playback.seek}
          onSetSpeed={playback.setSpeed}
          onStep={playback.step}
          loopRange={loopRange}
          pendingLoopStart={pendingLoopStart}
          onShiftSeek={handleShiftSeek}
          onClearLoop={handleClearLoop}
        />
      </div>

      {/* EVENT LOG — taller (220px) to leave the map slightly shorter,
          which also lets the roster panel above fill its column with
          no empty space below. */}
      <div className="px-2 pb-1.5 pt-1 border-t border-flash/[0.05] bg-flash/[0.01] relative z-10 h-[220px]">
        <div className="rounded-sm bg-flash/[0.015] ring-1 ring-flash/[0.06] p-2 h-full flex flex-col">
          <EventLog
            timeline={timeline}
            staticMatch={staticMatch}
            timeMs={playback.timeMs}
            onSeek={playback.seek}
            onFocusPid={setFocusedPid}
          />
        </div>
      </div>
    </>
  );
}

// ─── Score top-center overlay — sits on the map's top edge ──────────
//
// One single horizontal bar showing kills + gold + dragons for both
// teams in a "23 | vs | 28" format. Gold lead chip is folded in when
// the difference is meaningful.

function ScoreTopOverlay({
  timeline, timeMs,
}: {
  timeline: MatchTimeline;
  timeMs: number;
}) {
  const teamGold = useMemo(() => teamGoldAt(timeline, timeMs), [timeline, timeMs]);
  const kda = useMemo(() => kdaAt(timeline, timeMs), [timeline, timeMs]);
  const objs = useMemo(() => objectivesAt(timeline, timeMs), [timeline, timeMs]);
  const blueKills = BLUE_IDS.reduce((s, p) => s + (kda.get(p)?.k ?? 0), 0);
  const redKills = RED_IDS.reduce((s, p) => s + (kda.get(p)?.k ?? 0), 0);
  const showLead = Math.abs(teamGold.diff) >= 300;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[90] pointer-events-none flex flex-col items-center gap-1">
      <div className="pointer-events-auto flex items-center gap-3 rounded-sm bg-liquirice/75 backdrop-blur-md ring-1 ring-flash/15 px-3 py-1.5 shadow-[0_4px_14px_rgba(var(--c-shadow),0.6)]">
        {/* BLUE side */}
        <div className="flex items-baseline gap-2">
          <span
            className="font-chakrapetch font-bold tabular-nums text-[20px] leading-none"
            style={{ color: "#5BA8E6" }}
          >
            {blueKills}
          </span>
          <span className="text-[9px] font-mono tabular-nums text-citrine/80">
            {fmtShortNum(teamGold.blue)}g
          </span>
          {objs.blue.dragons.length > 0 && (
            <ObjBadges side="blue" objs={objs.blue} />
          )}
        </div>
        {/* VS pivot */}
        <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-flash/35 self-center">
          vs
        </span>
        {/* RED side */}
        <div className="flex items-baseline gap-2">
          {objs.red.dragons.length > 0 && (
            <ObjBadges side="red" objs={objs.red} />
          )}
          <span className="text-[9px] font-mono tabular-nums text-citrine/80">
            {fmtShortNum(teamGold.red)}g
          </span>
          <span
            className="font-chakrapetch font-bold tabular-nums text-[20px] leading-none"
            style={{ color: "#d63336" }}
          >
            {redKills}
          </span>
        </div>
      </div>
      {showLead && (
        <div
          className={cn(
            "pointer-events-auto flex items-center gap-1.5 rounded-full bg-liquirice/70 backdrop-blur-md px-2 py-0.5 ring-1 shadow-[0_4px_14px_rgba(var(--c-shadow),0.55)]",
            teamGold.diff > 0 ? "ring-[#5BA8E6]/40" : "ring-[#d63336]/40"
          )}
        >
          <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-flash/45">
            gold lead
          </span>
          <span
            className="font-chakrapetch font-bold tabular-nums text-[11px] leading-none"
            style={{ color: teamGold.diff > 0 ? "#5BA8E6" : "#d63336" }}
          >
            {teamGold.diff > 0 ? "+" : "−"}{fmtShortNum(Math.abs(teamGold.diff))}g
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Speed controls overlay (bottom-left of the map) ───────────────

function SpeedControlsOverlay({
  speed, onSetSpeed,
}: {
  speed: ReplaySpeed;
  onSetSpeed: (s: ReplaySpeed) => void;
}) {
  const SPEEDS: ReplaySpeed[] = [0.5, 1, 2, 4, 8, 16];
  return (
    <div className="absolute bottom-2 left-2 z-[100] pointer-events-auto">
      <div className="flex items-center gap-0.5 p-1 rounded-sm bg-liquirice/80 backdrop-blur-md ring-1 ring-flash/10 shadow-[0_4px_14px_rgba(var(--c-shadow),0.6)]">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSetSpeed(s)}
            className={cn(
              "px-1.5 py-1 text-[10px] font-mono tracking-wider tabular-nums transition-all cursor-clicker rounded-sm",
              speed === s
                ? "text-jade bg-jade/15 ring-1 ring-jade/35"
                : "text-flash/45 hover:text-flash/85 hover:bg-flash/8"
            )}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Transport controls overlay (bottom-center of the map) ─────────

function PlaybackControlsOverlay({
  isPlaying, onToggle, onStep,
}: {
  isPlaying: boolean;
  onToggle: () => void;
  onStep: (deltaMs: number) => void;
}) {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[100] pointer-events-auto">
      <div className="flex items-center gap-1 p-1 rounded-sm bg-liquirice/80 backdrop-blur-md ring-1 ring-flash/10 shadow-[0_4px_14px_rgba(var(--c-shadow),0.6)]">
        <button
          type="button"
          onClick={() => onStep(-30_000)}
          title="Back 30s"
          className="p-1.5 rounded-sm text-flash/55 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          title={isPlaying ? "Pause" : "Play"}
          className="p-1.5 rounded-sm text-jade bg-jade/15 ring-1 ring-jade/40 hover:bg-jade/25 transition-colors cursor-clicker"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => onStep(30_000)}
          title="Forward 30s"
          className="p-1.5 rounded-sm text-flash/55 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// (Deprecated stubs from earlier iterations — superseded by ScoreColumn / GoldLeadChip below.)
function __DeprecatedScoreHeader_DoNotUse() { return null;
}

// ─── Top header (bans BLU · tabs · bans ROSSO · close) ───────────────

function Header({
  view, setView, onClose, staticMatch,
}: {
  view: CenterView;
  setView: (v: CenterView) => void;
  onClose: () => void;
  staticMatch: StaticMatch | null;
}) {
  const blueBans = staticMatch?.info.teams.find((t) => t.teamId === 100)?.bans ?? [];
  const redBans = staticMatch?.info.teams.find((t) => t.teamId === 200)?.bans ?? [];

  return (
    <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-flash/[0.06] bg-flash/[0.01] backdrop-blur-md px-3 py-2">
      {/* Blue bans */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#5BA8E6]/65 shrink-0">
          Blue bans
        </span>
        <div className="flex gap-1">
          {blueBans.length === 0
            ? Array.from({ length: 5 }).map((_, i) => <BanIcon key={i} championId={-1} />)
            : blueBans.slice(0, 5).map((b, i) => <BanIcon key={i} championId={b.championId} />)
          }
        </div>
      </div>

      {/* Centered tabs */}
      <div className="flex items-center gap-1 p-0.5 rounded-sm bg-flash/[0.03] ring-1 ring-flash/[0.05]">
        <TabBtn icon={<MapIcon className="w-3.5 h-3.5" />}      label="Map"        active={view === "map"}        onClick={() => setView("map")} />
        <TabBtn icon={<ListChecks className="w-3.5 h-3.5" />}   label="Scoreboard" active={view === "scoreboard"} onClick={() => setView("scoreboard")} />
        <TabBtn icon={<LineChart className="w-3.5 h-3.5" />}    label="Gold Diff"  active={view === "golddiff"}   onClick={() => setView("golddiff")} />
      </div>

      {/* Red bans + close */}
      <div className="flex items-center gap-2 min-w-0 justify-end">
        <div className="flex gap-1">
          {redBans.length === 0
            ? Array.from({ length: 5 }).map((_, i) => <BanIcon key={i} championId={-1} />)
            : redBans.slice(0, 5).map((b, i) => <BanIcon key={i} championId={b.championId} />)
          }
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#d63336]/65 shrink-0">
          Red bans
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-sm text-flash/40 hover:text-flash hover:bg-flash/[0.05] transition-colors cursor-clicker ml-1"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TabBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-all text-[10px] font-mono uppercase tracking-[0.15em] cursor-clicker",
        active
          ? "text-jade bg-jade/15 ring-1 ring-jade/30"
          : "text-flash/45 hover:text-flash/80 hover:bg-flash/5"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ObjBadges({ side, objs }: { side: "blue" | "red"; objs: ReturnType<typeof objectivesAt>["blue"] }) {
  return (
    <div className="flex items-center gap-1.5 px-2">
      {/* Dragons */}
      <div className="flex items-center gap-0.5">
        {objs.dragons.length === 0 ? (
          <span className="opacity-30">
            <DragonGhost />
          </span>
        ) : (
          objs.dragons.map((sub, i) => (
            <span key={i} title={sub} style={{ color: dragonColor(sub) }}>
              <DragonGhost />
            </span>
          ))
        )}
      </div>
      {/* Other objectives — show as count chips when present */}
      {objs.barons > 0 && <ObjChip count={objs.barons} icon="baron" />}
      {objs.heralds > 0 && <ObjChip count={objs.heralds} icon="herald" />}
      {objs.voidgrubs > 0 && <ObjChip count={objs.voidgrubs} icon="voidgrub" />}
      {objs.atakhans > 0 && <ObjChip count={objs.atakhans} icon="atakhan" />}
      {/* Towers */}
      {objs.towers > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-flash/60">
          <TowerIcon className={cn("w-3 h-3", side === "blue" ? "text-[#5BA8E6]" : "text-[#d63336]")} />
          {objs.towers}
        </span>
      )}
      {/* Inhibs */}
      {objs.inhibitors > 0 && (
        <span className="flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-flash/60">
          <InhibitorIcon className={cn("w-3 h-3", side === "blue" ? "text-[#5BA8E6]" : "text-[#d63336]")} />
          {objs.inhibitors}
        </span>
      )}
    </div>
  );
}

function DragonGhost() {
  const Icon = eliteMonsterIcon("DRAGON");
  // Bumped from w-3 h-3 (12px) — at 12px the new dragon silhouette
  // was still cramped; 16px reads clearly as a proper dragon profile.
  return <Icon className="w-4 h-4 drop-shadow-[0_0_2px_rgba(var(--c-shadow),0.7)]" />;
}

function ObjChip({ count, icon }: { count: number; icon: "baron" | "herald" | "voidgrub" | "atakhan" }) {
  const Icon = eliteMonsterIcon(
    icon === "baron" ? "BARON_NASHOR" :
    icon === "herald" ? "RIFTHERALD" :
    icon === "voidgrub" ? "HORDE" : "ATAKHAN"
  );
  return (
    <span className="flex items-center gap-0.5 text-[10px] font-mono tabular-nums text-flash/60">
      <Icon className="w-3 h-3 text-flash/60" />
      {count}
    </span>
  );
}

function BanIcon({ championId }: { championId: number }) {
  if (!championId || championId < 0) {
    // Slot not used (Riot uses -1 for "no ban").
    return <div className="w-5 h-5 rounded-sm bg-flash/[0.04] ring-1 ring-flash/[0.05]" />;
  }
  // CommunityDragon exposes per-championId icon URLs that are stable
  // across patches — perfect for ban thumbnails since we don't have
  // an id→name map synchronously available here.
  const cdragonUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${championId}.png`;
  return (
    <div
      className="relative w-5 h-5 rounded-sm bg-flash/[0.04] ring-1 ring-flash/[0.05] overflow-hidden grayscale opacity-70"
      title={`Champion ${championId}`}
    >
      <img
        src={cdragonUrl}
        alt={`Ban ${championId}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
        }}
      />
      {/* Red diagonal slash overlay (the universal "banned" mark) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[140%] h-[1.5px] rotate-[-45deg] bg-[#d63336]/80 shadow-[0_0_2px_rgba(214,51,54,0.8)]" />
      </div>
    </div>
  );
}
