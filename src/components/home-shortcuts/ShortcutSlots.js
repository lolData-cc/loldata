import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RhombusSlot } from "./RhombusSlot";
import { ShortcutConfigDialog } from "./ShortcutConfigDialog";
import { SLOT_COUNT, clearSlot, readSlots, setSlot, subscribeSlots, } from "./storage";
import { cn } from "@/lib/utils";
// Brand easing — matches the rest of the homepage / search dialog
// vocabulary so the reveal feels native to the cyber surface.
const EASE_BRAND = [0.22, 1, 0.36, 1];
// Parent variant: just a host for the stagger config. The 90ms gap
// between children is wide enough to read as a sequence but tight
// enough that all three slots feel like a single coordinated move.
const containerVariants = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.09, delayChildren: 0.05 },
    },
};
// Child variant: each slot rises 10px while scaling up from 92% with
// a slight overshoot via the brand easing. Matches the spring-y
// motion vocabulary the RhombusSlot itself uses on hover.
const slotVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.92 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.55, ease: EASE_BRAND },
    },
};
export function ShortcutSlots({ className, revealed = true, }) {
    const [slots, setSlots] = useState(() => readSlots());
    // Which slot index the config dialog is currently editing.
    // -1 means closed.
    const [editIndex, setEditIndex] = useState(-1);
    // Sync from storage on mount AND whenever another instance broadcasts
    // an update — so if the user changes a slot from anywhere else (e.g.
    // a future nav menu), this row reflects it without remounting.
    useEffect(() => {
        setSlots(readSlots());
        const unsub = subscribeSlots(() => setSlots(readSlots()));
        return unsub;
    }, []);
    return (_jsxs(motion.div, { className: cn(
        // Horizontal gap tuned so the rhombi stay clearly separated
        // (hover scale + chip row need breathing room) without
        // drifting apart enough to read as three unrelated controls.
        "flex items-center justify-center gap-14 select-none", className), variants: containerVariants, initial: "hidden", animate: revealed ? "show" : "hidden", children: [Array.from({ length: SLOT_COUNT }, (_, i) => i).map((i) => (
            // Each slot wrapper carries the child variants — the parent
            // stagger drives the timing per index, so the inner
            // RhombusSlot needs no awareness of orchestration.
            _jsx(motion.div, { variants: slotVariants, children: _jsx(RhombusSlot, { index: i, value: slots[i] ?? null, onConfigure: () => setEditIndex(i), onEdit: () => setEditIndex(i), onForget: () => {
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
                } })] }));
}
