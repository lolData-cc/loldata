import { jsx as _jsx } from "react/jsx-runtime";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { getDisableBorderBeams } from "@/lib/uiPrefs"; // 👈 aggiungi
export const BorderBeam = ({ className, size = 200, delay = 0, duration = 6, colorFrom = "#00734D", colorTo = "#00d992", transition, style, reverse = false, initialOffset = 0, borderWidth = 1, respectGlobalPreference = true, }) => {
    // 👇 se disabilitato globalmente, non renderizza niente
    if (respectGlobalPreference && getDisableBorderBeams())
        return null;
    return (_jsx("div", { className: "pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-transparent [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] [mask-composite:intersect] [mask-clip:padding-box,border-box]", style: {
            "--border-beam-width": `${borderWidth}px`,
        }, children: _jsx(motion.div, { className: cn("absolute aspect-square", "bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent", className), style: {
                width: size,
                offsetPath: `rect(0 auto auto 0 round ${size}px)`,
                "--color-from": colorFrom,
                "--color-to": colorTo,
                ...style,
            }, initial: { offsetDistance: `${initialOffset}%` }, animate: {
                offsetDistance: reverse
                    ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
                    : [`${initialOffset}%`, `${100 + initialOffset}%`],
            }, transition: {
                repeat: Infinity,
                ease: "linear",
                duration,
                delay: -delay,
                ...transition,
            } }) }));
};
