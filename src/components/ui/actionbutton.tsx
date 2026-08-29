// src/components/ui/actionbutton.tsx
// The profile-card action pair (UPDATE / ANALYZE). Deliberately ONE component:
// they sit side by side, so anything that can drift between them will. Only the
// accent and the label differ.
//
// No glyph by design — the label carries the meaning and the accent rail
// carries the identity. State is told along the bottom edge instead: a drain
// bar for cooldown, a travelling bar while in flight.
//
// Chrome lives in .act-* in index.css — the states need :hover/::before, which
// utilities cannot express against a runtime accent colour.
import { ButtonHTMLAttributes, CSSProperties } from "react"
import { cn } from "@/lib/utils"

export const ACTION_ACCENTS = {
  citrine: "255 182 21",
  jade: "0 217 146",
} as const

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  accent?: keyof typeof ACTION_ACCENTS
  /**
   * An accent taken from somewhere else, as "R G B".
   *
   * Overrides `accent`. The summoner page passes the two dominant colours of
   * the player's own profile picture, so the pair wears their palette instead
   * of the fixed citrine/jade. Falls back to `accent` whenever the picture
   * cannot be read — never leaves a button with no colour.
   */
  accentRgb?: string
  label: string
  /** blocks input and runs the bottom bar, but keeps the label — a button that
   *  swaps its text out mid-flight reads as broken */
  loading?: boolean
  /** dimmed and in-palette: on cooldown, or locked behind the paywall */
  muted?: boolean
  /** 0..1, drains a bar along the bottom edge */
  progress?: number
  fill?: boolean
}

// Fixed so a label change (UPDATE → UPDATED → 2:31) cannot shift the text off
// centre and make the button twitch.
const LABEL_W = "w-[62px]"

export function ActionButton({
  accent = "jade",
  accentRgb,
  label,
  loading,
  muted,
  progress,
  fill,
  className,
  disabled,
  style,
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      data-state={muted ? "muted" : undefined}
      style={{ ["--acc" as string]: accentRgb ?? ACTION_ACCENTS[accent], ...style } as CSSProperties}
      className={cn(
        "act-btn h-8 shrink-0 inline-flex items-center justify-center",
        fill ? "w-full" : "w-[104px]",
        "font-jetbrains text-[10px] uppercase tracking-[0.16em]",
        "cursor-clicker select-none disabled:pointer-events-none",
        className
      )}
    >
      <span
        aria-hidden
        className="act-sweep pointer-events-none absolute inset-y-0 left-0 w-[34%]"
        style={{ background: "linear-gradient(90deg, transparent, rgb(var(--acc) / 0.16), transparent)" }}
      />

      <span className={cn("relative z-10 text-center tabular-nums", fill ? "" : LABEL_W)}>
        {label}
      </span>

      {loading ? (
        <span aria-hidden className="act-indeterminate" />
      ) : progress != null ? (
        <span
          aria-hidden
          className="act-progress"
          style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
        />
      ) : null}
    </button>
  )
}
