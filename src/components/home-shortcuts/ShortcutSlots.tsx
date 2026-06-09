// src/components/home-shortcuts/ShortcutSlots.tsx
//
// Orchestrates the 3-rhombus shortcut row. Reads the trio from
// localStorage, broadcasts updates to other instances on the page,
// and owns the config dialog state.

import * as React from "react"
import { useEffect, useState } from "react"
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

export interface ShortcutSlotsProps {
  className?: string
}

export function ShortcutSlots({ className }: ShortcutSlotsProps) {
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
    <div
      className={cn(
        // Horizontal gap tuned so the rhombi stay clearly separated
        // (hover scale + chip row need breathing room) without
        // drifting apart enough to read as three unrelated controls.
        "flex items-center justify-center gap-14 select-none",
        className
      )}
    >
      {Array.from({ length: SLOT_COUNT }, (_, i) => i).map((i) => (
        <RhombusSlot
          key={i}
          index={i}
          value={slots[i] ?? null}
          onConfigure={() => setEditIndex(i)}
          onEdit={() => setEditIndex(i)}
          onForget={() => {
            clearSlot(i)
            setSlots(readSlots())
          }}
        />
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
    </div>
  )
}
