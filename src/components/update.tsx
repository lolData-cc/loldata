// src/components/update.tsx
// Profile-card UPDATE action. Chrome comes from ActionButton so it stays in
// lockstep with ANALYZE next to it; this file only owns the cooldown wording
// and the drain bar.
import { ButtonHTMLAttributes, useEffect, useState } from "react"
import { ActionButton } from "@/components/ui/actionbutton"

type UpdateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Accent taken from the player's profile picture, as "R G B".
   *  Rides the spread onto ActionButton, which prefers it over `accent`. */
  accentRgb?: string
  loading?: boolean
  cooldown?: boolean
  cooldownSeconds?: number
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

export function UpdateButton({
  loading,
  cooldown,
  cooldownSeconds,
  children,
  ...props
}: UpdateButtonProps) {
  // The API hands us the seconds left, never the window it was cut from, so the
  // longest value seen this cycle IS the window — good enough to draw against,
  // and it resets when the cooldown ends.
  const [window, setWindow] = useState(0)
  useEffect(() => {
    if (!cooldown) { setWindow(0); return }
    setWindow(w => Math.max(w, cooldownSeconds ?? 0))
  }, [cooldown, cooldownSeconds])

  const label = cooldown && cooldownSeconds
    ? formatTime(cooldownSeconds)
    : cooldown
      ? "UPDATED"
      : ((children as string) || "UPDATE")

  return (
    <ActionButton
      {...props}
      accent="citrine"
      label={label}
      loading={loading}
      muted={cooldown}
      disabled={cooldown}
      progress={cooldown && window > 0 ? (cooldownSeconds ?? 0) / window : undefined}
    />
  )
}
