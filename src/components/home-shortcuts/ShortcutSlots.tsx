// src/components/home-shortcuts/ShortcutSlots.tsx
//
// Orchestrates the 3-rhombus shortcut row. Reads the trio from
// localStorage, broadcasts updates to other instances on the page,
// and owns the config dialog state.
//
// Reveal choreography: each slot rides a parent-driven stagger
// (left → middle → right) gated by the `revealed` prop. The hero
// uses this to land the row only after the rest of its entrance
// sequence has settled, so the eye reaches the rhombi when they
// arrive rather than catching them mid-fade behind the title.

import * as React from "react"
import { useEffect, useState } from "react"
import { motion, type Variants } from "framer-motion"
import { RhombusSlot } from "./RhombusSlot"
import { ShortcutConfigDialog } from "./ShortcutConfigDialog"
import {
  SLOT_COUNT,
  clearSlot,
  readSlots,
  setSlot,
  subscribeSlots,
  type SlotsState,
} from "./storage"
import { cn } from "@/lib/utils"

// Brand easing — matches the rest of the homepage / search dialog
// vocabulary so the reveal feels native to the cyber surface.
const EASE_BRAND = [0.22, 1, 0.36, 1] as const

// Parent variant: just a host for the stagger config. The 90ms gap
// between children is wide enough to read as a sequence but tight
// enough that all three slots feel like a single coordinated move.
const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
}

// Child variant: each slot rises 10px while scaling up from 92% with
// a slight overshoot via the brand easing. Matches the spring-y
// motion vocabulary the RhombusSlot itself uses on hover.
const slotVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.92 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: EASE_BRAND },
  },
}

export interface ShortcutSlotsProps {
  className?: string
  /** When true, the row plays its staggered entrance reveal. When
   *  false, slots stay collapsed/hidden. Defaults to true so
   *  standalone callers (anywhere outside the hero choreography)
   *  still see the row animate in on mount. */
  revealed?: boolean
}

export function ShortcutSlots({
  className,
  revealed = true,
}: ShortcutSlotsProps) {
  const [slots, setSlots] = useState<SlotsState>(() => readSlots())
  // Which slot index the config dialog is currently editing.
  // -1 means closed.
  const [editIndex, setEditIndex] = useState(-1)

  // Sync from storage on mount AND whenever another instance broadcasts
  // an update — so if the user changes a slot from anywhere else (e.g.
  // a future nav menu), this row reflects it without remounting.
  useEffect(() => {
    setSlots(readSlots())
    const unsub = subscribeSlots(() => setSlots(readSlots()))
    return unsub
  }, [])

  return (
    <motion.div
      className={cn(
        // Horizontal gap tuned so the rhombi stay clearly separated
        // (hover scale + chip row need breathing room) without
        // drifting apart enough to read as three unrelated controls.
        "flex items-center justify-center gap-14 select-none",
        className
      )}
      variants={containerVariants}
      initial="hidden"
      animate={revealed ? "show" : "hidden"}
    >
      {Array.from({ length: SLOT_COUNT }, (_, i) => i).map((i) => (
        // Each slot wrapper carries the child variants — the parent
        // stagger drives the timing per index, so the inner
        // RhombusSlot needs no awareness of orchestration.
        <motion.div key={i} variants={slotVariants}>
          <RhombusSlot
            index={i}
            value={slots[i] ?? null}
            onConfigure={() => setEditIndex(i)}
            onEdit={() => setEditIndex(i)}
            onForget={() => {
              clearSlot(i)
              setSlots(readSlots())
            }}
          />
        </motion.div>
      ))}

      <ShortcutConfigDialog
        open={editIndex >= 0}
        onOpenChange={(o) => {
          if (!o) setEditIndex(-1)
        }}
        initial={editIndex >= 0 ? slots[editIndex] ?? null : null}
        onSave={(v) => {
          if (editIndex < 0) return
          setSlot(editIndex, v)
          setSlots(readSlots())
          setEditIndex(-1)
        }}
      />
    </motion.div>
  )
}
