import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Pencil, X, Crosshair, User, Compass, GraduationCap, Dice3, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { shortcutHref, shortcutLabel, shortcutTag } from "./types";
// Violet palette — shared across the file so future tweaks land in
// one place. Picked to clearly separate the shortcut row from the
// jade-coded Discover button right above it.
const VIOLET = "#a78bfa";
const VIOLET_RGB = "167,139,250";
// Diamond clip path applied to every layer (bg tint, scanlines,
// image, mask). Polygon inset slightly off the edges so the SVG
// border has room to draw on the inside of the diamond's geometry.
const DIAMOND_CLIP = "polygon(50% 1.5%, 98.5% 50%, 50% 98.5%, 1.5% 50%)";
// Hover treatment: no rotation (that was overkill). Instead, the
// shell does a small spring scale-up, the inner image lifts a touch
// more (so the eye reads it as the focal element), and the border /
// scanlines brighten. Smooth, quick, restrained.
const shellVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.06 },
};
const imageVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.10 },
};
export function RhombusSlot({ value, index, onConfigure, onEdit, onForget, }) {
    const filled = value !== null;
    const [hover, setHover] = useState(false);
    // Fixed slot width so adding/removing/editing a shortcut doesn't
    // jostle its neighbours sideways. Without this, each wrapper sized
    // itself to its label ("Add shortcut" vs "Ahri Page" vs
    // "marco#EUW") and the whole row re-flowed every time a slot
    // changed state. 140px comfortably hosts the label's 130px cap
    // plus a 5px breathing margin per side. flex-shrink-0 keeps the
    // wrapper at exactly that width inside the parent flex row.
    const wrapperClass = cn("group relative inline-flex flex-col items-center w-[140px] shrink-0", "outline-none cursor-clicker");
    const inner = (_jsxs(motion.div
    // `flex flex-col items-center` is the centering fix: without it
    // the shell (a `block` element with explicit width) stuck to
    // the left edge of the motion.div while the label centred
    // itself via mx-auto, so the rhombus looked shifted off-axis
    // from its caption. With items-center, every flow child stacks
    // along the same vertical line.
    , { 
        // `flex flex-col items-center` is the centering fix: without it
        // the shell (a `block` element with explicit width) stuck to
        // the left edge of the motion.div while the label centred
        // itself via mx-auto, so the rhombus looked shifted off-axis
        // from its caption. With items-center, every flow child stacks
        // along the same vertical line.
        className: "relative flex flex-col items-center", initial: "rest", animate: hover ? "hover" : "rest", onHoverStart: () => setHover(true), onHoverEnd: () => setHover(false), children: [filled && (_jsx("span", { className: cn("absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-[1px] rounded-[2px]", "font-jetbrains text-[7.5px] tracking-[0.22em] uppercase", "bg-liquirice/90 pointer-events-none"), style: {
                    border: `1px solid rgba(${VIOLET_RGB},0.4)`,
                    color: VIOLET,
                    boxShadow: `0 0 10px rgba(${VIOLET_RGB},0.2)`,
                }, children: shortcutTag(value) })), _jsxs(motion.span
            // The whole rhombus group scales as one unit. Children
            // (border, scanlines, image) inherit the scale cleanly.
            // w-20 / h-20 lands between the discover button (48px) above
            // and the original 96px the user found overwhelming — big
            // enough to host a recognisable champion face, small enough
            // to feel like a quick-action.
            , { 
                // The whole rhombus group scales as one unit. Children
                // (border, scanlines, image) inherit the scale cleanly.
                // w-20 / h-20 lands between the discover button (48px) above
                // and the original 96px the user found overwhelming — big
                // enough to host a recognisable champion face, small enough
                // to feel like a quick-action.
                className: "relative block w-20 h-20", variants: shellVariants, transition: {
                    type: "spring",
                    stiffness: 340,
                    damping: 18,
                    mass: 0.6,
                }, children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0 transition-colors duration-300", style: {
                            clipPath: DIAMOND_CLIP,
                            background: filled
                                ? `linear-gradient(135deg, rgba(${VIOLET_RGB},0.20), rgba(${VIOLET_RGB},0.08))`
                                : `linear-gradient(135deg, rgba(${VIOLET_RGB},0.08), rgba(${VIOLET_RGB},0.02))`,
                        } }), filled && (_jsx(motion.span, { "aria-hidden": true, className: "absolute inset-0 block overflow-hidden", style: { clipPath: DIAMOND_CLIP }, variants: imageVariants, transition: {
                            type: "spring",
                            stiffness: 280,
                            damping: 16,
                            mass: 0.6,
                        }, children: _jsx(FilledMedia, { value: value }) })), _jsx("span", { "aria-hidden": true, className: "absolute inset-0 opacity-[0.18] group-hover:opacity-[0.34] transition-opacity duration-300", style: {
                            clipPath: DIAMOND_CLIP,
                            background: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(${VIOLET_RGB},0.45) 3px, rgba(${VIOLET_RGB},0.45) 4px)`,
                        } }), _jsx("svg", { "aria-hidden": true, viewBox: "0 0 100 100", className: "absolute inset-0 w-full h-full pointer-events-none", preserveAspectRatio: "none", children: _jsx("polygon", { points: "50,2 98,50 50,98 2,50", fill: "none", stroke: VIOLET, strokeOpacity: filled ? 0.65 : 0.4, strokeWidth: 1.6, strokeLinejoin: "round", className: "group-hover:[stroke-opacity:1] transition-[stroke-opacity] duration-300", style: {
                                filter: `drop-shadow(0 0 ${filled ? "7px" : "5px"} rgba(${VIOLET_RGB},${filled ? 0.5 : 0.3}))`,
                            } }) }), !filled && (_jsx("span", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: _jsx(Plus, { className: "w-5 h-5 transition-colors duration-300", strokeWidth: 2.5, style: { color: VIOLET, opacity: 0.8 } }) }))] }), _jsx("span", { className: cn("block mt-4 max-w-[130px] whitespace-nowrap truncate text-center", "font-jetbrains text-[10px] tracking-[0.22em] uppercase", "transition-colors duration-300"), style: {
                    color: hover ? VIOLET : `rgba(${VIOLET_RGB},0.55)`,
                }, children: filled ? shortcutLabel(value) : "Add shortcut" }), filled && (_jsxs(motion.span, { "aria-hidden": !hover, initial: { opacity: 0, y: -3, x: "-50%" }, animate: hover
                    ? { opacity: 1, y: 0, x: "-50%" }
                    : { opacity: 0, y: -3, x: "-50%" }, transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] }, className: "absolute left-1/2 top-[calc(100%+20px)] flex items-center gap-1.5 pointer-events-auto whitespace-nowrap", children: [_jsx("span", { "aria-hidden": true, className: "absolute left-1/2 -translate-x-1/2 -top-[14px] w-px h-[10px]", style: {
                            background: `linear-gradient(to bottom, transparent, rgba(${VIOLET_RGB},0.65))`,
                        } }), _jsx("span", { "aria-hidden": true, className: "absolute left-1/2 -translate-x-1/2 -top-[16px] w-1 h-1 rounded-full", style: {
                            background: VIOLET,
                            boxShadow: `0 0 6px rgba(${VIOLET_RGB},0.85)`,
                        } }), _jsx(CyberChip, { kind: "edit", onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEdit();
                        } }), _jsx(CyberChip, { kind: "forget", onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onForget();
                        } })] }))] }));
    if (filled) {
        return (_jsx(Link, { to: shortcutHref(value), className: wrapperClass, "aria-label": `Open shortcut ${index + 1}: ${shortcutLabel(value)}`, children: inner }));
    }
    return (_jsx("button", { type: "button", onClick: onConfigure, className: wrapperClass, "aria-label": `Configure shortcut ${index + 1}`, children: inner }));
}
// ─── filled media (image OR icon, depending on type) ────────────────
function FilledMedia({ value }) {
    switch (value.kind) {
        case "champion":
            return (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(value.championName)}.png`, alt: "", 
                // object-position picks the upper-mid of the splash so the
                // champion's face stays visible instead of getting clipped
                // by the diamond's narrow vertical extents.
                className: "absolute inset-0 w-full h-full object-cover object-[center_30%]", draggable: false }));
        case "summoner":
            return _jsx(FallbackIcon, { Icon: User });
        case "scout":
            return _jsx(FallbackIcon, { Icon: Crosshair });
        case "learn":
            return _jsx(FallbackIcon, { Icon: GraduationCap });
        case "loldle":
            return _jsx(FallbackIcon, { Icon: Dice3 });
        case "leaderboard":
            return _jsx(FallbackIcon, { Icon: Trophy });
        default:
            return _jsx(FallbackIcon, { Icon: Compass });
    }
}
// Centred icon variant when there's no per-target image. Uses a soft
// radial gradient bg behind the icon so the diamond doesn't feel
// hollow.
function FallbackIcon({ Icon, }) {
    return (_jsx("span", { className: "absolute inset-0 flex items-center justify-center", style: {
            background: `radial-gradient(circle at center, rgba(${VIOLET_RGB},0.16), rgba(${VIOLET_RGB},0) 70%)`,
        }, children: _jsx(Icon, { className: "w-8 h-8", strokeWidth: 1.75, ...{ style: { color: VIOLET, filter: `drop-shadow(0 0 6px rgba(${VIOLET_RGB},0.45))` } } }) }));
}
// ─── cyber chips for edit / × ───────────────────────────────────────
function CyberChip({ kind, onClick, }) {
    if (kind === "edit") {
        return (_jsxs("button", { type: "button", onClick: onClick, title: "Edit shortcut", className: cn("group/chip relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] cursor-clicker", "font-jetbrains text-[9.5px] tracking-[0.22em] uppercase", "bg-black/85 backdrop-blur-sm transition-all duration-200"), style: {
                border: `1px solid rgba(${VIOLET_RGB},0.4)`,
                color: VIOLET,
                boxShadow: `0 0 8px rgba(${VIOLET_RGB},0.12)`,
            }, children: [_jsx("span", { className: "opacity-60", children: "[" }), _jsx(Pencil, { className: "w-2.5 h-2.5", strokeWidth: 2.5 }), _jsx("span", { children: "EDIT" }), _jsx("span", { className: "opacity-60", children: "]" }), _jsx("span", { "aria-hidden": true, className: "absolute inset-0 rounded-[2px] opacity-0 group-hover/chip:opacity-100 transition-opacity duration-200 pointer-events-none", style: { boxShadow: `0 0 18px rgba(${VIOLET_RGB},0.35), inset 0 0 8px rgba(${VIOLET_RGB},0.18)` } })] }));
    }
    // forget
    return (_jsxs("button", { type: "button", onClick: onClick, title: "Remove shortcut", className: cn("group/chip relative inline-flex items-center justify-center w-7 h-7 rounded-[2px] cursor-clicker", "bg-black/85 backdrop-blur-sm transition-all duration-200"), style: {
            border: `1px solid rgba(214,51,54,0.45)`,
            color: "#d63336",
            boxShadow: `0 0 8px rgba(214,51,54,0.18)`,
        }, children: [_jsx(X, { className: "w-3.5 h-3.5", strokeWidth: 2.5 }), _jsx("span", { "aria-hidden": true, className: "absolute inset-0 rounded-[2px] opacity-0 group-hover/chip:opacity-100 transition-opacity duration-200 pointer-events-none", style: { boxShadow: "0 0 18px rgba(214,51,54,0.4), inset 0 0 8px rgba(214,51,54,0.2)" } })] }));
}
