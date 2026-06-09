// src/components/ui/animated-outline.tsx
//
// AnimatedOutline — a reusable hover affordance that "draws" itself
// around the parent's edge from a single starting point, smooth and
// fluid. Standardized across the site so any clickable surface can
// signal "I'll take you somewhere" with a consistent visual.
//
// Usage — wrap the target element with `group relative` (anything
// `group` works, named groups too) and drop the outline inside as a
// sibling of the visible content:
//
//   <div className="group relative w-6 h-6 rounded-sm bg-...">
//     <img ... />
//     <AnimatedOutline rx={2} />
//   </div>
//
// The container drives the hover state; the outline is purely visual
// (pointer-events-none) and starts/ends invisible so the static
// layout never shifts.
//
// Implementation: an SVG `<rect>` whose path length is normalized to
// 100 units via the `pathLength` attribute. We initialize with
// stroke-dasharray=100 + stroke-dashoffset=100 — the path is fully
// retracted past its starting point so nothing is visible. On
// group-hover, a CSS custom property `--ao-offset` flips to 0 and the
// browser animates `stroke-dashoffset` from 100 → 0 over `durationMs`,
// drawing the stroke around the rect's perimeter from the top-left
// corner clockwise. pathLength normalization keeps the motion
// resolution-independent: a 12px chip and a 200px card both draw at
// the same speed.

import * as React from "react"
import { cn } from "@/lib/utils"

export interface AnimatedOutlineProps {
  /** Border radius in CSS pixels. Match the parent's rounding so the
   *  stroke sits on the edge cleanly. */
  rx?: number
  /** Stroke color. Defaults to loldata jade. */
  color?: string
  /** Stroke width in CSS pixels. */
  strokeWidth?: number
  /** Duration of the draw animation in milliseconds. */
  durationMs?: number
  /** Adds a soft drop-shadow glow in the stroke colour. */
  glow?: boolean
  /** Extra classes — usually a z-index bump if the parent has
   *  competing absolute children. */
  className?: string
}

export function AnimatedOutline({
  rx = 4,
  color = "#00d992",
  strokeWidth = 1,
  durationMs = 550,
  glow = true,
  className,
}: AnimatedOutlineProps) {
  return (
    <svg
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none overflow-visible",
        // Default: fully retracted (invisible). On group-hover the
        // variable flips to 0 → stroke-dashoffset animates → stroke
        // draws itself around. Using a CSS variable (instead of two
        // class-based stroke-dashoffset states) lets the transition on
        // the rect run on the COMPUTED value change, which is exactly
        // what CSS transitions need to interpolate.
        "[--ao-offset:100]",
        "group-hover:[--ao-offset:0]",
        className
      )}
      aria-hidden
      preserveAspectRatio="none"
    >
      <rect
        x={0}
        y={0}
        width="100%"
        height="100%"
        rx={rx}
        ry={rx}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        // pathLength normalizes the perimeter to 100 user units so
        // dasharray/offset math is independent of the rect's actual
        // pixel size. A 12px chip and a 200px card both draw with the
        // same eased motion.
        pathLength={100}
        style={{
          strokeDasharray: 100,
          strokeDashoffset: "var(--ao-offset, 100)",
          transition: `stroke-dashoffset ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
          filter: glow ? `drop-shadow(0 0 4px ${color}aa)` : undefined,
        } as React.CSSProperties}
      />
    </svg>
  )
}
