import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
/** The classic Meta-style scalloped seal as an inline SVG path.
 *  Rendered as a single shape so it scales cleanly at small sizes. */
function SealSvg({ fill, stroke, innerStroke, size, }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": "true", children: [_jsx("path", { d: "M12 1.5l2.06 2.1 2.93-.34.84 2.83 2.78.97-.62 2.88 1.91 2.18-1.91 2.18.62 2.88-2.78.97-.84 2.83-2.93-.34L12 22.5l-2.06-2.1-2.93.34-.84-2.83-2.78-.97.62-2.88L2.1 11.88l1.91-2.18-.62-2.88 2.78-.97.84-2.83 2.93.34L12 1.5z", fill: fill, stroke: stroke, strokeWidth: "0.5" }), _jsx("path", { d: "M8.5 12.3l2.5 2.5 4.7-5.4", fill: "none", stroke: innerStroke, strokeWidth: "2.1", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
export function VerifyBadge({ grade, size = 14, className, }) {
    // Palette per grade. Grade 1 = solid jade green (Meta vibe but on-brand).
    // Grade 2 = brighter jade with a deeper cyan glow + extra outline ring.
    const fill = grade === 2 ? "#00d992" : "#1faa6d";
    const stroke = grade === 2 ? "#04261b" : "#062318";
    const innerStroke = "#03110b";
    const tooltipText = grade === 2
        ? "2nd grade of verify — identity + all Riot accounts verified."
        : "1st grade of verify — the identity is verified, but not the accounts.";
    // Grade 2 wraps the seal in a soft outer ring of jade+cyan to make
    // it visibly distinct from Grade 1 at-a-glance.
    const containerClass = cn("relative inline-flex items-center justify-center shrink-0", grade === 2 &&
        "before:absolute before:inset-[-2px] before:rounded-full before:bg-gradient-to-br before:from-jade/40 before:to-citrine/20 before:blur-[2px] before:-z-10", className);
    return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("span", { className: containerClass, style: {
                            filter: grade === 2
                                ? "drop-shadow(0 0 4px rgba(0,217,146,0.55))"
                                : "drop-shadow(0 0 2px rgba(0,217,146,0.35))",
                        }, children: _jsx(SealSvg, { fill: fill, stroke: stroke, innerStroke: innerStroke, size: size }) }) }), _jsx(TooltipContent, { side: "top", className: "bg-liquirice/95 border border-jade/30 text-flash text-[11px] font-jetbrains tracking-[0.05em] px-2.5 py-1.5", children: tooltipText })] }) }));
}
