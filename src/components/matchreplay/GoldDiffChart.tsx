// src/components/matchreplay/GoldDiffChart.tsx
//
// Full-size gold difference chart. Same series the PlaybackBar shows
// as a micro-inset, but bigger, with axis labels and tooltip.
//
// Implementation is hand-rolled SVG (no recharts) for total control
// over visual style. The chart is interactive: hover to scrub.

import * as React from "react";
import { useMemo, useRef, useState } from "react";
import type { MatchTimeline } from "./types";
import { goldDiffSeries, fmtClock, fmtShortNum } from "./derive";

export interface GoldDiffChartProps {
  timeline: MatchTimeline;
  durationMs: number;
  timeMs: number;
  onSeek: (ms: number) => void;
}

export function GoldDiffChart({ timeline, durationMs, timeMs, onSeek }: GoldDiffChartProps) {
  const series = useMemo(() => goldDiffSeries(timeline), [timeline]);
  const maxAbs = useMemo(
    () => Math.max(1000, ...series.map((g) => Math.abs(g.diff))),
    [series]
  );

  const [hover, setHover] = useState<{ x: number; t: number; diff: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewbox 0..1000 × 0..200. Mid axis at y=100, ±100 amplitude.
  const W = 1000, H = 200, MID = 100, AMP = 90;
  const xOf = (t: number) => (t / Math.max(1, durationMs)) * W;
  const yOf = (d: number) => MID - (d / maxAbs) * AMP;

  const path = useMemo(() => {
    if (!series.length) return "";
    let d = "";
    series.forEach((g, i) => {
      d += `${i === 0 ? "M" : "L"}${xOf(g.t).toFixed(1)},${yOf(g.diff).toFixed(1)} `;
    });
    return d;
  }, [series, durationMs, maxAbs]);

  const areaPath = useMemo(() => path && `${path} L${W},${MID} L0,${MID} Z`, [path]);

  const playheadX = xOf(timeMs);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, px / rect.width));
    const t = pct * durationMs;
    // find nearest sample
    let nearest = series[0];
    let nearDist = Infinity;
    for (const s of series) {
      const dd = Math.abs(s.t - t);
      if (dd < nearDist) { nearDist = dd; nearest = s; }
    }
    setHover({ x: pct * W, t: nearest.t, diff: nearest.diff });
  };
  const onClick = () => { if (hover) onSeek(hover.t); };

  // Minute gridlines.
  const gridX: number[] = [];
  for (let t = 0; t <= durationMs; t += 300_000) gridX.push(t); // every 5 min

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-flash/50">
          Gold Difference
        </div>
        <div className="text-[10px] font-mono tabular-nums text-flash/50">
          peak ±{fmtShortNum(maxAbs)}
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-48 cursor-crosshair"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={onClick}
      >
        <defs>
          <linearGradient id="gdBigBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5BA8E6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5BA8E6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gdBigRed" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#d63336" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#d63336" stopOpacity="0" />
          </linearGradient>
          <clipPath id="gdBigAbove"><rect x="0" y="0" width={W} height={MID} /></clipPath>
          <clipPath id="gdBigBelow"><rect x="0" y={MID} width={W} height={H - MID} /></clipPath>
        </defs>

        {/* gridlines */}
        {gridX.map((t, i) => (
          <line key={i} x1={xOf(t)} x2={xOf(t)} y1={0} y2={H}
            stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        ))}
        {/* mid axis */}
        <line x1={0} x2={W} y1={MID} y2={MID} stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" strokeDasharray="2 3" />

        {areaPath && (
          <>
            <path d={areaPath} fill="url(#gdBigBlue)" clipPath="url(#gdBigAbove)" />
            <path d={areaPath} fill="url(#gdBigRed)" clipPath="url(#gdBigBelow)" />
          </>
        )}
        <path d={path} fill="none" stroke="rgba(0,217,146,0.9)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />

        {/* Playhead */}
        <line x1={playheadX} x2={playheadX} y1={0} y2={H}
          stroke="rgba(0,217,146,0.9)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />

        {/* Hover crosshair */}
        {hover && (
          <>
            <line x1={hover.x} x2={hover.x} y1={0} y2={H}
              stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            <circle cx={hover.x} cy={yOf(hover.diff)} r="3" fill="#00d992" />
          </>
        )}

        {/* Side labels */}
        <text x="6" y="14" fontSize="10" fill="#5BA8E6" opacity="0.8" fontFamily="ui-monospace">Blue ahead</text>
        <text x="6" y={H - 6} fontSize="10" fill="#d63336" opacity="0.8" fontFamily="ui-monospace">Red ahead</text>
      </svg>

      {/* Hover tooltip */}
      {hover && (
        <div className="font-mono text-[10px] text-flash/70 tabular-nums">
          <span className="text-jade">{fmtClock(hover.t)}</span>
          {" — "}
          <span className={hover.diff >= 0 ? "text-[#5BA8E6]" : "text-[#d63336]"}>
            {hover.diff >= 0 ? "Blue" : "Red"} +{fmtShortNum(Math.abs(hover.diff))} gold
          </span>
        </div>
      )}
    </div>
  );
}
