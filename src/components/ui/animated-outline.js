import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function AnimatedOutline({ rx = 4, color = "#00d992", strokeWidth = 1, durationMs = 550, glow = true, className, }) {
    return (_jsx("svg", { className: cn("absolute inset-0 w-full h-full pointer-events-none overflow-visible", 
        // Default: fully retracted (invisible). On group-hover the
        // variable flips to 0 → stroke-dashoffset animates → stroke
        // draws itself around. Using a CSS variable (instead of two
        // class-based stroke-dashoffset states) lets the transition on
        // the rect run on the COMPUTED value change, which is exactly
        // what CSS transitions need to interpolate.
        "[--ao-offset:100]", "group-hover:[--ao-offset:0]", className), "aria-hidden": true, preserveAspectRatio: "none", children: _jsx("rect", { x: 0, y: 0, width: "100%", height: "100%", rx: rx, ry: rx, fill: "none", stroke: color, strokeWidth: strokeWidth, 
            // pathLength normalizes the perimeter to 100 user units so
            // dasharray/offset math is independent of the rect's actual
            // pixel size. A 12px chip and a 200px card both draw with the
            // same eased motion.
            pathLength: 100, style: {
                strokeDasharray: 100,
                strokeDashoffset: "var(--ao-offset, 100)",
                transition: `stroke-dashoffset ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                filter: glow ? `drop-shadow(0 0 4px ${color}aa)` : undefined,
            } }) }));
}
