// src/components/home-shortcuts/QuickSlotsRail.tsx
//
// Site-wide floating presentation of the 3-slot shortcut system: a vertical
// rail of small diamonds anchored to the centre-right edge of the viewport
// (same species as the floating Diamond back-to-top button, opposite side).
// Gated by the "Quick Slots" preference (Preferences → Customizations) via
// useQuickSlots; renders nothing when disabled. Reuses the storage layer +
// config dialog untouched.

import * as React from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { Plus, Pencil, X, Crosshair, User, GraduationCap, Dice3, Trophy, Compass } from "lucide-react"
import { cn } from "@/lib/utils"
import { cdnBaseUrl, normalizeChampName } from "@/config"
import { useQuickSlots } from "@/hooks/useQuickSlots"
import { ShortcutConfigDialog } from "./ShortcutConfigDialog"
import {
  SLOT_COUNT,
  clearSlot,
  readSlots,
  setSlot,
  subscribeSlots,
  type SlotsState,
} from "./storage"
import { shortcutHref, shortcutLabel, shortcutTag, type ShortcutSlot } from "./types"

const EASE_BRAND = [0.22, 1, 0.36, 1] as const
const DIAMOND_CLIP = "polygon(50% 1.5%, 98.5% 50%, 50% 98.5%, 1.5% 50%)"

const railVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const slotVariants: Variants = {
  hidden: { opacity: 0, x: 14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_BRAND } },
}

// Per-kind media inside the diamond — champion face, quiet icon otherwise.
function Media({ value }: { value: ShortcutSlot }) {
  if (value.kind === "champion") {
    return (
      <img
        src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(value.championName)}.png`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
        draggable={false}
      />
    )
  }
  const Icon =
    value.kind === "summoner" ? User :
    value.kind === "scout" ? Crosshair :
    value.kind === "learn" ? GraduationCap :
    value.kind === "loldle" ? Dice3 :
    value.kind === "leaderboard" ? Trophy : Compass
  return (
    <span className="absolute inset-0 flex items-center justify-center">
      <Icon className="h-[15px] w-[15px] text-jade/70" strokeWidth={1.6} />
    </span>
  )
}

function RailSlot({ value, onConfigure, onEdit, onForget }: {
  value: ShortcutSlot | null
  onConfigure: () => void
  onEdit: () => void
  onForget: () => void
}) {
  const filled = value !== null

  const diamond = (
    <span className="relative block h-11 w-11">
      {/* soft fill over the page glass */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 backdrop-blur-md transition-colors duration-300",
          filled ? "bg-liquirice/70 group-hover:bg-liquirice/80" : "bg-liquirice/55 group-hover:bg-liquirice/70"
        )}
        style={{ clipPath: DIAMOND_CLIP }}
      />
      {/* media */}
      {filled ? (
        <span
          aria-hidden
          className="absolute inset-0 overflow-hidden transition-transform duration-300 group-hover:scale-[1.04]"
          style={{ clipPath: DIAMOND_CLIP }}
        >
          <Media value={value!} />
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          <Plus className="h-3.5 w-3.5 text-flash/30 transition-colors duration-300 group-hover:text-jade" strokeWidth={1.8} />
        </span>
      )}
      {/* hairline diamond outline (SVG — clip-path would swallow a CSS border) */}
      <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
        <polygon
          points="50,1.5 98.5,50 50,98.5 1.5,50"
          fill="none"
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
          style={{ stroke: "rgba(0,217,146,0.22)" }}
        />
        <polygon
          points="50,1.5 98.5,50 50,98.5 1.5,50"
          fill="none"
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ stroke: "rgba(0,217,146,0.6)" }}
        />
      </svg>
    </span>
  )

  return (
    <div className="group relative flex items-center justify-end">
      {/* hover pill — floats LEFT of the diamond: label + micro-actions */}
      <span
        className={cn(
          "pointer-events-none absolute right-full mr-2.5 flex items-center gap-1.5 whitespace-nowrap",
          "rounded-[3px] bg-liquirice/90 px-2 py-1 backdrop-blur-md",
          "shadow-[inset_0_0_0_0.5px_rgba(0,217,146,0.25),0_6px_18px_rgba(0,0,0,0.45)]",
          "opacity-0 translate-x-1 transition-all duration-200",
          "group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto"
        )}
      >
        <span className="font-jetbrains text-[8.5px] uppercase tracking-[0.14em] text-flash/70 max-w-[140px] truncate">
          {filled ? shortcutLabel(value!) : "Add shortcut"}
        </span>
        {filled && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit shortcut"
              className="grid h-4 w-5 place-items-center rounded-[2px] bg-flash/[0.06] text-flash/50 transition-colors hover:bg-jade/[0.14] hover:text-jade cursor-clicker"
            >
              <Pencil className="h-[9px] w-[9px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onForget}
              aria-label="Remove shortcut"
              className="grid h-4 w-5 place-items-center rounded-[2px] bg-flash/[0.06] text-flash/50 transition-colors hover:bg-[#ff6286]/[0.14] hover:text-[#ff6286] cursor-clicker"
            >
              <X className="h-[10px] w-[10px]" strokeWidth={2} />
            </button>
          </>
        )}
      </span>

      {filled ? (
        <Link
          to={shortcutHref(value!)}
          title={`${shortcutTag(value!)} · ${shortcutLabel(value!)}`}
          className="cursor-clicker"
        >
          {diamond}
        </Link>
      ) : (
        <button type="button" onClick={onConfigure} aria-label="Add shortcut" className="cursor-clicker">
          {diamond}
        </button>
      )}
    </div>
  )
}

export function QuickSlotsRail() {
  const { enabled } = useQuickSlots()
  const [slots, setSlots] = useState<SlotsState>(() => readSlots())
  const [editIndex, setEditIndex] = useState(-1)

  useEffect(() => {
    setSlots(readSlots())
    const unsub = subscribeSlots(() => setSlots(readSlots()))
    return unsub
  }, [])

  return (
    <AnimatePresence>
      {enabled && (
        <motion.div
          key="quick-slots-rail"
          className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 select-none flex-col items-end gap-3 lg:flex"
          variants={railVariants}
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          {Array.from({ length: SLOT_COUNT }, (_, i) => i).map((i) => (
            <motion.div key={i} variants={slotVariants}>
              <RailSlot
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
      )}
    </AnimatePresence>
  )
}
