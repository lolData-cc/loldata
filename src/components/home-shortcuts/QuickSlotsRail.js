import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, X, Crosshair, User, GraduationCap, Dice3, Trophy, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { useQuickSlots } from "@/hooks/useQuickSlots";
import { ShortcutConfigDialog } from "./ShortcutConfigDialog";
import { SLOT_COUNT, clearSlot, readSlots, setSlot, subscribeSlots, } from "./storage";
import { shortcutHref, shortcutLabel, shortcutTag } from "./types";
const EASE_BRAND = [0.22, 1, 0.36, 1];
const DIAMOND_CLIP = "polygon(50% 1.5%, 98.5% 50%, 50% 98.5%, 1.5% 50%)";
const railVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
};
const slotVariants = {
    hidden: { opacity: 0, x: 14 },
    show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_BRAND } },
};
// Per-kind media inside the diamond — champion face, quiet icon otherwise.
function Media({ value }) {
    if (value.kind === "champion") {
        return (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(value.championName)}.png`, alt: "", className: "absolute inset-0 h-full w-full object-cover object-[center_30%]", draggable: false }));
    }
    const Icon = value.kind === "summoner" ? User :
        value.kind === "scout" ? Crosshair :
            value.kind === "learn" ? GraduationCap :
                value.kind === "loldle" ? Dice3 :
                    value.kind === "leaderboard" ? Trophy : Compass;
    return (_jsx("span", { className: "absolute inset-0 flex items-center justify-center", children: _jsx(Icon, { className: "h-[15px] w-[15px] text-jade/70", strokeWidth: 1.6 }) }));
}
function RailSlot({ value, onConfigure, onEdit, onForget }) {
    const filled = value !== null;
    const diamond = (_jsxs("span", { className: "relative block h-11 w-11", children: [_jsx("span", { "aria-hidden": true, className: cn("absolute inset-0 backdrop-blur-md transition-colors duration-300", filled ? "bg-liquirice/70 group-hover:bg-liquirice/80" : "bg-liquirice/55 group-hover:bg-liquirice/70"), style: { clipPath: DIAMOND_CLIP } }), filled ? (_jsx("span", { "aria-hidden": true, className: "absolute inset-0 overflow-hidden transition-transform duration-300 group-hover:scale-[1.04]", style: { clipPath: DIAMOND_CLIP }, children: _jsx(Media, { value: value }) })) : (_jsx("span", { className: "absolute inset-0 flex items-center justify-center", children: _jsx(Plus, { className: "h-3.5 w-3.5 text-flash/30 transition-colors duration-300 group-hover:text-jade", strokeWidth: 1.8 }) })), _jsxs("svg", { "aria-hidden": true, className: "absolute inset-0 h-full w-full", viewBox: "0 0 100 100", children: [_jsx("polygon", { points: "50,1.5 98.5,50 50,98.5 1.5,50", fill: "none", strokeWidth: 1.25, vectorEffect: "non-scaling-stroke", style: { stroke: "rgba(0,217,146,0.22)" } }), _jsx("polygon", { points: "50,1.5 98.5,50 50,98.5 1.5,50", fill: "none", strokeWidth: 1.25, vectorEffect: "non-scaling-stroke", className: "opacity-0 transition-opacity duration-300 group-hover:opacity-100", style: { stroke: "rgba(0,217,146,0.6)" } })] })] }));
    return (_jsxs("div", { className: "group relative flex items-center justify-end", children: [_jsxs("span", { className: cn("pointer-events-none absolute right-full mr-2.5 flex items-center gap-1.5 whitespace-nowrap", "rounded-[3px] bg-liquirice/90 px-2 py-1 backdrop-blur-md", "shadow-[inset_0_0_0_0.5px_rgba(0,217,146,0.25),0_6px_18px_rgba(0,0,0,0.45)]", "opacity-0 translate-x-1 transition-all duration-200", "group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto"), children: [_jsx("span", { className: "font-jetbrains text-[8.5px] uppercase tracking-[0.14em] text-flash/70 max-w-[140px] truncate", children: filled ? shortcutLabel(value) : "Add shortcut" }), filled && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: onEdit, "aria-label": "Edit shortcut", className: "grid h-4 w-5 place-items-center rounded-[2px] bg-flash/[0.06] text-flash/50 transition-colors hover:bg-jade/[0.14] hover:text-jade cursor-clicker", children: _jsx(Pencil, { className: "h-[9px] w-[9px]", strokeWidth: 2 }) }), _jsx("button", { type: "button", onClick: onForget, "aria-label": "Remove shortcut", className: "grid h-4 w-5 place-items-center rounded-[2px] bg-flash/[0.06] text-flash/50 transition-colors hover:bg-[#ff6286]/[0.14] hover:text-[#ff6286] cursor-clicker", children: _jsx(X, { className: "h-[10px] w-[10px]", strokeWidth: 2 }) })] }))] }), filled ? (_jsx(Link, { to: shortcutHref(value), title: `${shortcutTag(value)} · ${shortcutLabel(value)}`, className: "cursor-clicker", children: diamond })) : (_jsx("button", { type: "button", onClick: onConfigure, "aria-label": "Add shortcut", className: "cursor-clicker", children: diamond }))] }));
}
export function QuickSlotsRail() {
    const { enabled } = useQuickSlots();
    const [slots, setSlots] = useState(() => readSlots());
    const [editIndex, setEditIndex] = useState(-1);
    useEffect(() => {
        setSlots(readSlots());
        const unsub = subscribeSlots(() => setSlots(readSlots()));
        return unsub;
    }, []);
    return (_jsx(AnimatePresence, { children: enabled && (_jsxs(motion.div, { className: "fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 select-none flex-col items-end gap-3 lg:flex", variants: railVariants, initial: "hidden", animate: "show", exit: "hidden", children: [Array.from({ length: SLOT_COUNT }, (_, i) => i).map((i) => (_jsx(motion.div, { variants: slotVariants, children: _jsx(RailSlot, { value: slots[i] ?? null, onConfigure: () => setEditIndex(i), onEdit: () => setEditIndex(i), onForget: () => {
                            clearSlot(i);
                            setSlots(readSlots());
                        } }) }, i))), _jsx(ShortcutConfigDialog, { open: editIndex >= 0, onOpenChange: (o) => {
                        if (!o)
                            setEditIndex(-1);
                    }, initial: editIndex >= 0 ? slots[editIndex] ?? null : null, onSave: (v) => {
                        if (editIndex < 0)
                            return;
                        setSlot(editIndex, v);
                        setSlots(readSlots());
                        setEditIndex(-1);
                    } })] }, "quick-slots-rail")) }));
}
