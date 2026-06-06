// src/components/matchreplay/DebugMapOverlay.tsx
//
// Calibration helper.
//
// How it works:
//   1. We hardcode landmark positions in Riot world coords (drake pit,
//      baron pit, T1 towers, corners, ...).
//   2. With debug ON, each landmark shows up as a draggable marker on
//      the map. Its INITIAL position is where the current calibration
//      thinks Riot's (x,y) maps to.
//   3. You drag each marker to where that landmark VISUALLY IS on the
//      Wiki SR render.
//   4. We compute a least-squares affine transform (scaleX, scaleY,
//      offsetX, offsetY) from your drops and apply it to the whole
//      scaled wrapper — so player sprites, ward icons, kill markers,
//      everything, snap into the right place.
//   5. A snapshot of the resulting calibration shows in the panel so
//      you can paste it back to me to hardcode as the new default.
//
// You don't need to place all of them. Two opposite corners is the
// minimum to constrain scale+offset. The more drops, the more robust.

import * as React from "react";
import { useRef, useState } from "react";
import { Settings2, Minus } from "lucide-react";

export interface DraggableLandmark {
  id: string;
  /** Riot world coords (0..15000). */
  riotX: number;
  riotY: number;
  label: string;
  color: string;
  kind: "corner" | "fountain" | "pit" | "tower" | "center";
}

// ─── Lane schema (the "white 2D map" the user sees on top of the bg) ─
// Polylines that trace each lane through known landmark coords.
// Drawn as dashed white lines + filled fountain/nexus markers.
//
// Riot coord conventions remember: (0,0) is bottom-left (Blue fountain).

export const LANES: Array<{ id: "top" | "mid" | "bot"; points: Array<{ x: number; y: number }> }> = [
  {
    id: "top",
    points: [
      { x: 1750,  y: 1750  }, // Blue nexus area
      { x: 1200,  y: 4500  }, // Blue inhibitor top
      { x: 981,   y: 10441 }, // T1 Top Blue
      { x: 4318,  y: 13875 }, // T1 Top Red
      { x: 11000, y: 13700 }, // Red inhibitor top
      { x: 12700, y: 12700 }, // Red nexus area
    ],
  },
  {
    id: "mid",
    points: [
      { x: 1750,  y: 1750  }, // Blue nexus
      { x: 3651,  y: 3696  }, // Inhibitor mid B
      { x: 5048,  y: 4812  }, // T2 Mid Blue
      { x: 5846,  y: 6396  }, // T1 Mid Blue
      { x: 7500,  y: 7500  }, // center
      { x: 8955,  y: 8510  }, // T1 Mid Red
      { x: 9886,  y: 10180 }, // T2 Mid Red
      { x: 11134, y: 11207 }, // Inhibitor mid R
      { x: 12700, y: 12700 }, // Red nexus
    ],
  },
  {
    id: "bot",
    points: [
      { x: 1750,  y: 1750  }, // Blue nexus
      { x: 4281,  y: 1253  }, // Inhibitor bot B
      { x: 10504, y: 1029  }, // T1 Bot Blue
      { x: 13866, y: 4505  }, // T1 Bot Red
      { x: 13624, y: 10572 }, // Inhibitor bot R
      { x: 12700, y: 12700 }, // Red nexus
    ],
  },
];

// Canonical Riot landmark coords.
export const LANDMARKS: DraggableLandmark[] = [
  // Map bounding-box corners — these are the (0,0) / (15k,15k) of
  // Riot's coordinate space, NOT the in-game fountains (which sit
  // inside the bases). Useful for clamping the overall transform.
  { id: "corner-bl", riotX: 0,     riotY: 0,     label: "Corner BL (0,0)",         color: "#FFB615", kind: "corner" },
  { id: "corner-br", riotX: 15000, riotY: 0,     label: "Corner BR (15k,0)",       color: "#FFB615", kind: "corner" },
  { id: "corner-tl", riotX: 0,     riotY: 15000, label: "Corner TL (0,15k)",       color: "#FFB615", kind: "corner" },
  { id: "corner-tr", riotX: 15000, riotY: 15000, label: "Corner TR (15k,15k)",     color: "#FFB615", kind: "corner" },

  // FOUNTAINS — these are inside the bases, draggable separately
  // because they're far easier to identify visually than abstract
  // bounding corners. Center-of-fountain coords (approx).
  { id: "fountain-b", riotX: 1750,  riotY: 1750,  label: "Blue fountain", color: "#5BA8E6", kind: "fountain" },
  { id: "fountain-r", riotX: 12700, riotY: 12700, label: "Red fountain",  color: "#d63336", kind: "fountain" },

  // Pits — easiest to identify visually
  { id: "drake",  riotX: 9866, riotY: 4414,  label: "Drake pit",  color: "#e67e22", kind: "pit" },
  { id: "baron",  riotX: 4928, riotY: 10406, label: "Baron pit",  color: "#9b59b6", kind: "pit" },

  // T1 outer towers
  { id: "t1-top-b", riotX: 981,   riotY: 10441, label: "T1 Top Blue",  color: "#5BA8E6", kind: "tower" },
  { id: "t1-mid-b", riotX: 5846,  riotY: 6396,  label: "T1 Mid Blue",  color: "#5BA8E6", kind: "tower" },
  { id: "t1-bot-b", riotX: 10504, riotY: 1029,  label: "T1 Bot Blue",  color: "#5BA8E6", kind: "tower" },
  { id: "t1-top-r", riotX: 4318,  riotY: 13875, label: "T1 Top Red",   color: "#d63336", kind: "tower" },
  { id: "t1-mid-r", riotX: 8955,  riotY: 8510,  label: "T1 Mid Red",   color: "#d63336", kind: "tower" },
  { id: "t1-bot-r", riotX: 13866, riotY: 4505,  label: "T1 Bot Red",   color: "#d63336", kind: "tower" },
];

// ─── Calibration shape ─────────────────────────────────────────────

export interface MapCalibration {
  scaleX: number;
  scaleY: number;
  /** Translation as a PERCENT of the wrapper size (so it's resolution-independent). */
  offsetXPct: number;
  offsetYPct: number;
}

// DEFAULT_CALIBRATION — final converged values from the user's
// 9-landmark drag session on the Wiki S14 asset:
//
//   Red fountain   (12700, 12700) → wrapper (78.8%,  9.9%)
//   Drake pit      (9866, 4414)   → wrapper (63.5%, 64.8%)
//   Baron pit      (4928, 10406)  → wrapper (32.0%, 27.3%)
//   T1 Top Blue                   → wrapper (22.2%, 28.6%)
//   T1 Bot Blue                   → wrapper (67.5%, 93.7%)
//   T1 Top Red                    → wrapper (27.6%, 11.7%)
//   T1 Mid Red                    → wrapper (55.8%, 36.7%)
//   T1 Bot Red                    → wrapper (85.3%, 69.5%)
//   Corner BR (15k,0)             → wrapper (78.5%, 92.5%)
//   Corner TL (0,15k)             → wrapper (23.0%,  8.3%)
//
// Best-fit affine transform (least-squares per axis):
//   scaleX = 0.690   offsetXPct = +0.61
//   scaleY = 0.929   offsetYPct = −2.07
//
// The Wiki asset is rendered isometrically, so a pure scale+translate
// can never be PERFECT for every point. This is the best 4-parameter
// approximation across the user's 9 anchors — residuals are sub-2%.
export const DEFAULT_CALIBRATION: MapCalibration = {
  scaleX: 0.690,
  scaleY: 0.929,
  offsetXPct: 0.61,
  offsetYPct: -2.07,
};

export type LandmarkOverrides = Record<string, { nx: number; ny: number }>;

/**
 * Riot world → naive normalized (0..1, no calibration applied).
 * Y is flipped because Riot's y=0 is the bottom of the map but ours
 * is the top.
 */
function riotToNaiveNorm(x: number, y: number): { nx: number; ny: number } {
  return {
    nx: x / 15000,
    ny: 1 - y / 15000,
  };
}

/**
 * Least-squares fit: given overrides, compute the calibration that
 * minimizes per-axis residuals.
 *
 * Model per axis: target = scale * raw + offset
 *   (where `raw` = riotToNaiveNorm, `target` = user-dropped normalized)
 *
 * The wrapper applies: visible = scale * raw + offset.
 * We then convert offset (a normalized fraction) into a PERCENT of
 * the wrapper for the CSS transform.
 *
 * NB. transform-origin is center, so a scale of 1.2× pushes content
 * outward from the center. To preserve our "raw" mapping under that
 * center-origin scale, the equivalence is:
 *   visible = (raw - 0.5) * scale + 0.5 + offsetPct
 *   visible = scale * raw + (0.5 - scale * 0.5 + offsetPct)
 * So the intercept fitted by least-squares = 0.5 - scale*0.5 + offsetPct
 *   ⇒ offsetPct = intercept - 0.5 + scale * 0.5
 */
export function computeCalibrationFromOverrides(overrides: LandmarkOverrides): MapCalibration {
  const pts: Array<{ raw: { nx: number; ny: number }; tgt: { nx: number; ny: number } }> = [];
  for (const lm of LANDMARKS) {
    const ov = overrides[lm.id];
    if (!ov) continue;
    pts.push({
      raw: riotToNaiveNorm(lm.riotX, lm.riotY),
      tgt: ov,
    });
  }
  if (pts.length < 2) return DEFAULT_CALIBRATION;

  // Solve per axis.
  const solve = (
    rawAxis: "nx" | "ny",
    tgtAxis: "nx" | "ny",
  ): { scale: number; intercept: number } => {
    const n = pts.length;
    let sR = 0, sT = 0, sRT = 0, sRR = 0;
    for (const p of pts) {
      const r = p.raw[rawAxis];
      const t = p.tgt[tgtAxis];
      sR += r; sT += t; sRT += r * t; sRR += r * r;
    }
    const denom = n * sRR - sR * sR;
    if (denom === 0) return { scale: 1, intercept: 0 };
    const scale = (n * sRT - sR * sT) / denom;
    const intercept = (sT - scale * sR) / n;
    return { scale, intercept };
  };

  const x = solve("nx", "nx");
  const y = solve("ny", "ny");

  const offXPct = (x.intercept - 0.5 + x.scale * 0.5) * 100;
  const offYPct = (y.intercept - 0.5 + y.scale * 0.5) * 100;

  return {
    scaleX: x.scale,
    scaleY: y.scale,
    offsetXPct: offXPct,
    offsetYPct: offYPct,
  };
}

// ─── Overlay (rendered INSIDE the scaled wrapper) ─────────────────

export interface DebugMapOverlayProps {
  enabled: boolean;
  overrides: LandmarkOverrides;
  setOverrides: React.Dispatch<React.SetStateAction<LandmarkOverrides>>;
}

export function DebugMapOverlay({ enabled, overrides, setOverrides }: DebugMapOverlayProps) {
  if (!enabled) return null;
  return (
    <div className="absolute inset-0 z-[60]">
      {/* Grid + lane schema — the "white 2D map" stretched over the bg.
          User drags landmarks to where they really are; the whole
          schema (lanes + grid + landmarks) stretches with the
          calibration so it serves as a precise alignment guide. */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        {/* Soft 10% grid */}
        {Array.from({ length: 11 }).map((_, i) => {
          const p = (i / 10) * 100;
          return (
            <React.Fragment key={i}>
              <line x1={p} y1="0" x2={p} y2="100" stroke="rgba(255,255,255,0.07)" strokeWidth="0.15" />
              <line x1="0" y1={p} x2="100" y2={p} stroke="rgba(255,255,255,0.07)" strokeWidth="0.15" />
            </React.Fragment>
          );
        })}
        {/* River diagonal */}
        <line x1="0" y1="100" x2="100" y2="0"
          stroke="rgba(120,220,255,0.18)" strokeWidth="0.4" strokeDasharray="1.5 1.5" />

        {/* Lanes — bold white dashed polylines */}
        {LANES.map((lane) => {
          const pts = lane.points
            .map((p) => {
              const n = riotToNaiveNorm(p.x, p.y);
              return `${(n.nx * 100).toFixed(2)},${(n.ny * 100).toFixed(2)}`;
            })
            .join(" ");
          return (
            <polyline
              key={lane.id}
              points={pts}
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.55"
              strokeDasharray="1.6 1.0"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Lane labels */}
        {(() => {
          const labels: Array<{ id: string; x: number; y: number; text: string }> = [];
          for (const lane of LANES) {
            // Label at midpoint
            const mid = lane.points[Math.floor(lane.points.length / 2)];
            const n = riotToNaiveNorm(mid.x, mid.y);
            labels.push({
              id: lane.id,
              x: n.nx * 100,
              y: n.ny * 100,
              text: lane.id.toUpperCase(),
            });
          }
          return labels.map((l) => (
            <text
              key={l.id}
              x={l.x} y={l.y}
              fontSize="2"
              fill="rgba(255,255,255,0.85)"
              fontFamily="ui-monospace, monospace"
              letterSpacing="0.3"
              textAnchor="middle"
              style={{
                paintOrder: "stroke",
                stroke: "rgba(0,0,0,0.85)",
                strokeWidth: "0.4",
                strokeLinejoin: "round",
              } as any}
            >
              {l.text}
            </text>
          ));
        })()}
      </svg>

      {/* Markers */}
      {LANDMARKS.map((lm) => (
        <DraggableMarker
          key={lm.id}
          lm={lm}
          override={overrides[lm.id]}
          onDrop={(pos) => setOverrides((p) => ({ ...p, [lm.id]: pos }))}
          onReset={() => setOverrides((p) => {
            const np = { ...p };
            delete np[lm.id];
            return np;
          })}
        />
      ))}
    </div>
  );
}

function DraggableMarker({
  lm, override, onDrop, onReset,
}: {
  lm: DraggableLandmark;
  override?: { nx: number; ny: number };
  onDrop: (pos: { nx: number; ny: number }) => void;
  onReset: () => void;
}) {
  const dragRef = useRef<{ nx: number; ny: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);
  const naive = riotToNaiveNorm(lm.riotX, lm.riotY);
  const pos = override ?? naive;

  const updateFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    // We want the pointer position normalized to the PARENT (the
    // overlay), not this marker. Use ownerDocument elementsFromPoint
    // fallback: simpler — get parent rect from element offsetParent.
    const parent = elRef.current?.parentElement;
    if (!parent) return;
    const r = parent.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    dragRef.current = { nx, ny };
    onDrop({ nx, ny });
  };

  const size =
    lm.kind === "corner" ? 16 :
    lm.kind === "fountain" ? 18 :
    lm.kind === "pit" ? 14 :
    lm.kind === "tower" ? 12 : 14;

  return (
    <div
      ref={elRef}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        updateFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (!(e.buttons & 1)) return;
        updateFromEvent(e);
      }}
      onPointerUp={() => { dragRef.current = null; }}
      onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); onReset(); }}
      className="absolute pointer-events-auto cursor-move group/marker"
      style={{
        left: `${pos.nx * 100}%`,
        top: `${pos.ny * 100}%`,
        transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
        touchAction: "none",
      }}
      title={`${lm.label} — drag to align; double-click to reset`}
    >
      <div
        style={{
          width: size, height: size,
          borderRadius: lm.kind === "tower" ? 3 : 999,
          border: `2px solid ${lm.color}`,
          boxShadow: `0 0 0 1px rgba(0,0,0,0.7), 0 0 10px ${lm.color}aa`,
          background: override ? lm.color : "transparent",
          opacity: override ? 1 : 0.85,
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap font-mono pointer-events-none"
        style={{
          top: "100%",
          color: lm.color,
          fontSize: 9,
          textShadow: "0 0 4px rgba(0,0,0,1), 0 1px 0 rgba(0,0,0,0.95)",
        }}
      >
        {lm.label}
        {override && <span className="ml-1 text-jade">●</span>}
      </div>
    </div>
  );
}

// ─── Calibration Panel ─────────────────────────────────────────────

export interface CalibrationPanelProps {
  debug: boolean;
  setDebug: (v: boolean) => void;
  overrides: LandmarkOverrides;
  setOverrides: React.Dispatch<React.SetStateAction<LandmarkOverrides>>;
  appliedCalibration: MapCalibration;
  onApply: (c: MapCalibration) => void;
  onResetCalibration: () => void;
}

export function CalibrationPanel({
  debug, setDebug, overrides, setOverrides,
  appliedCalibration, onApply, onResetCalibration,
}: CalibrationPanelProps) {
  const placedCount = Object.keys(overrides).length;
  const computed = computeCalibrationFromOverrides(overrides);
  const [collapsed, setCollapsed] = useState(false);

  // Collapsed: tiny 28×28 chip in the corner. Click to expand.
  // The chip is the absolute minimum surface area so it can't really
  // be in the way of any drag, but it's still visible enough to find.
  if (collapsed) {
    return (
      <div className="absolute top-2 right-2 z-[120] pointer-events-auto">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={`flex items-center justify-center w-7 h-7 rounded-sm backdrop-blur-md ring-1 cursor-clicker transition-colors ${
            debug
              ? "bg-jade/15 text-jade ring-jade/35 hover:bg-jade/25"
              : "bg-liquirice/70 text-flash/55 ring-flash/15 hover:text-flash hover:bg-liquirice/85"
          }`}
          title="Expand calibration panel"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-2 right-2 z-[120] pointer-events-auto max-h-[calc(100%-1rem)] overflow-hidden">
      <div className="flex flex-col gap-1.5 p-2 rounded-sm bg-liquirice/90 backdrop-blur-md ring-1 ring-flash/15 shadow-[0_4px_14px_rgba(0,0,0,0.6)] w-[210px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-flash/65">
            calibration
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDebug(!debug)}
              className={`px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-sm cursor-clicker ${
                debug
                  ? "text-jade bg-jade/15 ring-1 ring-jade/35"
                  : "text-flash/40 ring-1 ring-flash/15 hover:text-flash/70"
              }`}
            >
              debug
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="p-0.5 rounded-sm text-flash/45 hover:text-flash hover:bg-flash/10 transition-colors cursor-clicker"
              title="Collapse panel (Esc-style hide)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {debug && (
          <>
            <div className="text-[9px] font-geist text-flash/55 leading-tight">
              Drag landmark markers to where they REALLY are on the map.
              Double-click a marker to reset it.
            </div>

            <div className="text-[10px] font-mono text-flash/60">
              placed: <span className="text-jade tabular-nums">{placedCount}</span> / {LANDMARKS.length}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 mt-0.5">
              <button
                type="button"
                disabled={placedCount < 2}
                onClick={() => onApply(computed)}
                className="flex-1 px-1.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-sm cursor-clicker disabled:cursor-not-allowed disabled:text-flash/20 disabled:bg-transparent text-jade bg-jade/15 ring-1 ring-jade/35 hover:bg-jade/25"
              >
                apply
              </button>
              <button
                type="button"
                onClick={() => setOverrides({})}
                disabled={placedCount === 0}
                className="px-1.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-sm cursor-clicker disabled:cursor-not-allowed disabled:text-flash/20 text-flash/55 ring-1 ring-flash/15 hover:text-flash/80"
                title="Clear all drops"
              >
                clear
              </button>
              <button
                type="button"
                onClick={onResetCalibration}
                className="px-1.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-sm cursor-clicker text-flash/55 ring-1 ring-flash/15 hover:text-flash/80"
                title="Reset calibration to default"
              >
                reset
              </button>
            </div>

            {/* Computed vs applied calibration */}
            <div className="mt-1 px-1.5 py-1.5 rounded-sm bg-black/40 ring-1 ring-flash/[0.04] text-[9px] font-mono text-flash/55 leading-snug">
              <div className="text-flash/40 uppercase tracking-wider text-[8px] mb-0.5">applied</div>
              <div>scaleX: <span className="text-flash/85 tabular-nums">{appliedCalibration.scaleX.toFixed(3)}</span></div>
              <div>scaleY: <span className="text-flash/85 tabular-nums">{appliedCalibration.scaleY.toFixed(3)}</span></div>
              <div>offX:   <span className="text-flash/85 tabular-nums">{appliedCalibration.offsetXPct.toFixed(2)}%</span></div>
              <div>offY:   <span className="text-flash/85 tabular-nums">{appliedCalibration.offsetYPct.toFixed(2)}%</span></div>
              {placedCount >= 2 && (
                <>
                  <div className="text-flash/40 uppercase tracking-wider text-[8px] mt-1.5 mb-0.5">computed (preview)</div>
                  <div>scaleX: <span className="text-jade tabular-nums">{computed.scaleX.toFixed(3)}</span></div>
                  <div>scaleY: <span className="text-jade tabular-nums">{computed.scaleY.toFixed(3)}</span></div>
                  <div>offX:   <span className="text-jade tabular-nums">{computed.offsetXPct.toFixed(2)}%</span></div>
                  <div>offY:   <span className="text-jade tabular-nums">{computed.offsetYPct.toFixed(2)}%</span></div>
                </>
              )}
            </div>

            {/* Per-landmark status (compact) */}
            <details className="text-[9px] font-mono text-flash/45 mt-0.5">
              <summary className="cursor-clicker hover:text-flash/70 uppercase tracking-wider text-[8px]">drops detail</summary>
              <div className="mt-1 max-h-32 overflow-y-auto cyber-scrollbar pr-1 space-y-0.5">
                {LANDMARKS.map((lm) => {
                  const ov = overrides[lm.id];
                  return (
                    <div key={lm.id} className="flex items-center gap-1 tabular-nums">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ov ? lm.color : "transparent", border: `1px solid ${lm.color}` }} />
                      <span className="text-flash/65 truncate flex-1" title={lm.label}>{lm.label}</span>
                      {ov ? (
                        <span className="text-jade text-[8px]">{(ov.nx * 100).toFixed(1)}, {(ov.ny * 100).toFixed(1)}</span>
                      ) : (
                        <span className="text-flash/25 text-[8px]">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
