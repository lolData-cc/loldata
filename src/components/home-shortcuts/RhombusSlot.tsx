// src/components/home-shortcuts/RhombusSlot.tsx
//
// One shortcut slot rendered as a violet diamond. Two states:
//   - empty:  centred + and "ADD" caption, quiet hover lift
//   - filled: target's image clipped to the diamond shape, label below,
//             a soft "lock-in" hover treatment (scale+glow+image zoom)
//
// Geometry: the rhombus shape is produced by clip-path on square
// elements, so the border, scanline overlay and image all align with
// the same diamond mask. The border is drawn via SVG <polygon> (clip-
// path swallows borders on the cut edges).
//
// Edit / × micro-actions live BELOW the slot, connected with a thin
// violet drop-line so they read as attached to the rhombus rather
// than floating. Their horizontal centering uses framer-motion's `x`
// prop (not Tailwind's -translate-x-1/2), because framer's animated
// `transform` overrides any class-set transform — leaving the chips
// drifting off-axis during the hover transition.

import * as React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Plus, Pencil, X, Crosshair, User, Compass, GraduationCap, Dice3, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { cdnBaseUrl, normalizeChampName } from "@/config"
import type { ShortcutSlot } from "./types"
import { shortcutHref, shortcutLabel, shortcutTag } from "./types"

export interface RhombusSlotProps {
  value: ShortcutSlot | null
  index: number
  onConfigure: () => void
  onEdit: () => void
  onForget: () => void
}

// Violet palette — shared across the file so future tweaks land in
// one place. Picked to clearly separate the shortcut row from the
// jade-coded Discover button right above it.
const VIOLET = "#a78bfa"
const VIOLET_RGB = "167,139,250"

// Diamond clip path applied to every layer (bg tint, scanlines,
// image, mask). Polygon inset slightly off the edges so the SVG
// border has room to draw on the inside of the diamond's geometry.
const DIAMOND_CLIP =
  "polygon(50% 1.5%, 98.5% 50%, 50% 98.5%, 1.5% 50%)"

// Hover treatment: no rotation (that was overkill). Instead, the
// shell does a small spring scale-up, the inner image lifts a touch
// more (so the eye reads it as the focal element), and the border /
// scanlines brighten. Smooth, quick, restrained.
const shellVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.06 },
}
const imageVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.10 },
}

export function RhombusSlot({
  value,
  index,
  onConfigure,
  onEdit,
  onForget,
}: RhombusSlotProps) {
  const filled = value !== null
  const [hover, setHover] = useState(false)

  // Fixed slot width so adding/removing/editing a shortcut doesn't
  // jostle its neighbours sideways. Without this, each wrapper sized
  // itself to its label ("Add shortcut" vs "Ahri Page" vs
  // "marco#EUW") and the whole row re-flowed every time a slot
  // changed state. 140px comfortably hosts the label's 130px cap
  // plus a 5px breathing margin per side. flex-shrink-0 keeps the
  // wrapper at exactly that width inside the parent flex row.
  const wrapperClass = cn(
    "group relative inline-flex flex-col items-center w-[140px] shrink-0",
    "outline-none cursor-clicker"
  )

  const inner = (
    <motion.div
      // `flex flex-col items-center` is the centering fix: without it
      // the shell (a `block` element with explicit width) stuck to
      // the left edge of the motion.div while the label centred
      // itself via mx-auto, so the rhombus looked shifted off-axis
      // from its caption. With items-center, every flow child stacks
      // along the same vertical line.
      className="relative flex flex-col items-center"
      initial="rest"
      animate={hover ? "hover" : "rest"}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
    >
      {/* Tag chip on top — pure identification of the shortcut type. */}
      {filled && (
        <span
          className={cn(
            "absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 px-1.5 py-[1px] rounded-[2px]",
            "font-jetbrains text-[7.5px] tracking-[0.22em] uppercase",
            "bg-liquirice/90 pointer-events-none"
          )}
          style={{
            border: `1px solid rgba(${VIOLET_RGB},0.4)`,
            color: VIOLET,
            boxShadow: `0 0 10px rgba(${VIOLET_RGB},0.2)`,
          }}
        >
          {shortcutTag(value!)}
        </span>
      )}

      {/* ── Rhombus diamond itself ─────────────────────────── */}
      <motion.span
        // The whole rhombus group scales as one unit. Children
        // (border, scanlines, image) inherit the scale cleanly.
        // w-20 / h-20 lands between the discover button (48px) above
        // and the original 96px the user found overwhelming — big
        // enough to host a recognisable champion face, small enough
        // to feel like a quick-action.
        className="relative block w-20 h-20"
        variants={shellVariants}
        transition={{
          type: "spring",
          stiffness: 340,
          damping: 18,
          mass: 0.6,
        }}
      >
        {/* Layer 1 — bg tint (clipped diamond) */}
        <span
          aria-hidden
          className="absolute inset-0 transition-colors duration-300"
          style={{
            clipPath: DIAMOND_CLIP,
            background: filled
              ? `linear-gradient(135deg, rgba(${VIOLET_RGB},0.20), rgba(${VIOLET_RGB},0.08))`
              : `linear-gradient(135deg, rgba(${VIOLET_RGB},0.08), rgba(${VIOLET_RGB},0.02))`,
          }}
        />

        {/* Layer 2 — image fills the diamond (filled state only).
            Lifts a touch more than the shell so the focal point
            stays the content, not the chrome. */}
        {filled && (
          <motion.span
            aria-hidden
            className="absolute inset-0 block overflow-hidden"
            style={{ clipPath: DIAMOND_CLIP }}
            variants={imageVariants}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 16,
              mass: 0.6,
            }}
          >
            <FilledMedia value={value!} />
          </motion.span>
        )}

        {/* Layer 3 — scanlines for texture */}
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.18] group-hover:opacity-[0.34] transition-opacity duration-300"
          style={{
            clipPath: DIAMOND_CLIP,
            background: `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(${VIOLET_RGB},0.45) 3px, rgba(${VIOLET_RGB},0.45) 4px)`,
          }}
        />

        {/* Layer 4 — SVG border with hover glow boost. */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="none"
        >
          <polygon
            points="50,2 98,50 50,98 2,50"
            fill="none"
            stroke={VIOLET}
            strokeOpacity={filled ? 0.65 : 0.4}
            strokeWidth={1.6}
            strokeLinejoin="round"
            className="group-hover:[stroke-opacity:1] transition-[stroke-opacity] duration-300"
            style={{
              filter: `drop-shadow(0 0 ${filled ? "7px" : "5px"} rgba(${VIOLET_RGB},${filled ? 0.5 : 0.3}))`,
            }}
          />
        </svg>

        {/* Layer 5 — centred + for the empty state. */}
        {!filled && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Plus
              className="w-5 h-5 transition-colors duration-300"
              strokeWidth={2.5}
              style={{ color: VIOLET, opacity: 0.8 }}
            />
          </span>
        )}
      </motion.span>

      {/* Caption under the rhombus. Empty = ADD; filled = label
          (e.g. "Ahri Page", "EUW · Solo"). Always rendered so the
          slot's purpose is legible without hovering. */}
      <span
        className={cn(
          "block mt-4 max-w-[130px] whitespace-nowrap truncate text-center",
          "font-jetbrains text-[10px] tracking-[0.22em] uppercase",
          "transition-colors duration-300"
        )}
        style={{
          color: hover ? VIOLET : `rgba(${VIOLET_RGB},0.55)`,
        }}
      >
        {filled ? shortcutLabel(value!) : "Add shortcut"}
      </span>

      {/* Edit + × cyber chips — hover-only, attached to the rhombus
          via a short drop-line. Horizontal centering uses motion's
          `x` prop because framer's animated transform overrides any
          Tailwind transform class, which previously left the chips
          drifting off to the right during the entry animation. */}
      {filled && (
        <motion.span
          aria-hidden={!hover}
          initial={{ opacity: 0, y: -3, x: "-50%" }}
          animate={
            hover
              ? { opacity: 1, y: 0, x: "-50%" }
              : { opacity: 0, y: -3, x: "-50%" }
          }
          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-1/2 top-[calc(100%+20px)] flex items-center gap-1.5 pointer-events-auto whitespace-nowrap"
        >
          {/* Connecting drop-line — runs from the rhombus' bottom
              point down to the chip row, anchoring them visually. */}
          <span
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 -top-[14px] w-px h-[10px]"
            style={{
              background: `linear-gradient(to bottom, transparent, rgba(${VIOLET_RGB},0.65))`,
            }}
          />
          {/* HUD "data tap" dot at top of the line. */}
          <span
            aria-hidden
            className="absolute left-1/2 -translate-x-1/2 -top-[16px] w-1 h-1 rounded-full"
            style={{
              background: VIOLET,
              boxShadow: `0 0 6px rgba(${VIOLET_RGB},0.85)`,
            }}
          />

          <CyberChip
            kind="edit"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onEdit()
            }}
          />
          <CyberChip
            kind="forget"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onForget()
            }}
          />
        </motion.span>
      )}
    </motion.div>
  )

  if (filled) {
    return (
      <Link
        to={shortcutHref(value!)}
        className={wrapperClass}
        aria-label={`Open shortcut ${index + 1}: ${shortcutLabel(value!)}`}
      >
        {inner}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onConfigure}
      className={wrapperClass}
      aria-label={`Configure shortcut ${index + 1}`}
    >
      {inner}
    </button>
  )
}

// ─── filled media (image OR icon, depending on type) ────────────────

function FilledMedia({ value }: { value: ShortcutSlot }) {
  switch (value.kind) {
    case "champion":
      return (
        <img
          src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(value.championName)}.png`}
          alt=""
          // object-position picks the upper-mid of the splash so the
          // champion's face stays visible instead of getting clipped
          // by the diamond's narrow vertical extents.
          className="absolute inset-0 w-full h-full object-cover object-[center_30%]"
          draggable={false}
        />
      )
    case "summoner":
      return <FallbackIcon Icon={User} />
    case "scout":
      return <FallbackIcon Icon={Crosshair} />
    case "learn":
      return <FallbackIcon Icon={GraduationCap} />
    case "loldle":
      return <FallbackIcon Icon={Dice3} />
    case "leaderboard":
      return <FallbackIcon Icon={Trophy} />
    default:
      return <FallbackIcon Icon={Compass} />
  }
}

// Centred icon variant when there's no per-target image. Uses a soft
// radial gradient bg behind the icon so the diamond doesn't feel
// hollow.
function FallbackIcon({
  Icon,
}: {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background: `radial-gradient(circle at center, rgba(${VIOLET_RGB},0.16), rgba(${VIOLET_RGB},0) 70%)`,
      }}
    >
      <Icon
        className="w-8 h-8"
        strokeWidth={1.75}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ style: { color: VIOLET, filter: `drop-shadow(0 0 6px rgba(${VIOLET_RGB},0.45))` } } as any)}
      />
    </span>
  )
}

// ─── cyber chips for edit / × ───────────────────────────────────────

function CyberChip({
  kind,
  onClick,
}: {
  kind: "edit" | "forget"
  onClick: (e: React.MouseEvent) => void
}) {
  if (kind === "edit") {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Edit shortcut"
        className={cn(
          "group/chip relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] cursor-clicker",
          "font-jetbrains text-[9.5px] tracking-[0.22em] uppercase",
          "bg-black/85 backdrop-blur-sm transition-all duration-200"
        )}
        style={{
          border: `1px solid rgba(${VIOLET_RGB},0.4)`,
          color: VIOLET,
          boxShadow: `0 0 8px rgba(${VIOLET_RGB},0.12)`,
        }}
      >
        {/* Cyber bracket flair — pure HUD ornament */}
        <span className="opacity-60">[</span>
        <Pencil className="w-2.5 h-2.5" strokeWidth={2.5} />
        <span>EDIT</span>
        <span className="opacity-60">]</span>
        {/* Hover boost — extra glow on the chip itself */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-[2px] opacity-0 group-hover/chip:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ boxShadow: `0 0 18px rgba(${VIOLET_RGB},0.35), inset 0 0 8px rgba(${VIOLET_RGB},0.18)` }}
        />
      </button>
    )
  }
  // forget
  return (
    <button
      type="button"
      onClick={onClick}
      title="Remove shortcut"
      className={cn(
        "group/chip relative inline-flex items-center justify-center w-7 h-7 rounded-[2px] cursor-clicker",
        "bg-black/85 backdrop-blur-sm transition-all duration-200"
      )}
      style={{
        border: `1px solid rgba(214,51,54,0.45)`,
        color: "#d63336",
        boxShadow: `0 0 8px rgba(214,51,54,0.18)`,
      }}
    >
      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span
        aria-hidden
        className="absolute inset-0 rounded-[2px] opacity-0 group-hover/chip:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{ boxShadow: "0 0 18px rgba(214,51,54,0.4), inset 0 0 8px rgba(214,51,54,0.2)" }}
      />
    </button>
  )
}
