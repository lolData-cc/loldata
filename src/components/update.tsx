// src/components/UpdateButton.tsx
// Profile-card UPDATE action — cyber-notch button. The notched 1px outline is
// built with two clipped layers: the button itself is the border colour, an
// inset span (same notch, 1.5px in) is the dark fill.
import { ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type UpdateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  cooldown?: boolean
  cooldownSeconds?: number
}

// clip-path notch: cut top-left + bottom-right corners
const NOTCH = "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)"
const NOTCH_IN = "polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)"

export function UpdateButton({
  loading,
  cooldown,
  cooldownSeconds,
  className,
  children,
  ...props
}: UpdateButtonProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }
  const label = cooldown && cooldownSeconds
    ? formatTime(cooldownSeconds)
    : cooldown
      ? "UPDATED"
      : (children || "UPDATE")

  return (
    <button
      {...props}
      disabled={loading || cooldown}
      className={cn(
        "group relative inline-flex items-center justify-center gap-1.5 h-8 w-[104px]",
        cooldown ? "font-orbitron text-[10px] tracking-wider" : "font-jetbrains text-[10px] tracking-[0.16em] uppercase",
        "transition-all duration-300 cursor-clicker select-none",
        "disabled:pointer-events-none",
        // the button bg IS the notched outline colour
        cooldown ? "bg-citrine/15 text-citrine/45" : "bg-citrine/35 hover:bg-citrine/75 text-citrine",
        loading && "opacity-70",
        className
      )}
      style={{ clipPath: NOTCH }}
    >
      {/* inner fill — 1.5px inset, same notch → crisp 1px outline all around */}
      <span
        className="pointer-events-none absolute inset-[1.5px] bg-[#081012] transition-colors duration-300"
        style={{ clipPath: NOTCH_IN }}
      />
      {/* tint over the fill */}
      <span
        className={cn(
          "pointer-events-none absolute inset-[1.5px] transition-colors duration-300",
          cooldown ? "bg-citrine/[0.04]" : "bg-citrine/[0.07] group-hover:bg-citrine/[0.13]"
        )}
        style={{ clipPath: NOTCH_IN }}
      />
      {/* scanlines on hover */}
      {!cooldown && (
        <span
          className="absolute inset-[1.5px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ clipPath: NOTCH_IN, background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,182,21,0.05) 3px, rgba(255,182,21,0.05) 4px)" }}
        />
      )}

      <span className="relative inline-flex items-center justify-center gap-1.5">
        {/* diamond tick */}
        <span className={cn(
          "w-[5px] h-[5px] rotate-45 shrink-0 transition-all duration-300",
          cooldown
            ? "bg-citrine/25"
            : "bg-citrine/50 group-hover:bg-citrine group-hover:shadow-[0_0_6px_rgba(255,182,21,0.9)]"
        )} />
        <span
          className={cn(
            "inline-block text-center transition-opacity",
            "min-w-[7ch]",
            loading ? "opacity-0" : "opacity-100"
          )}
        >
          {label}
        </span>

        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
        )}
      </span>
    </button>
  )
}
