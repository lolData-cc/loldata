// src/components/UpdateButton.tsx
import { ButtonHTMLAttributes } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type UpdateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  cooldown?: boolean
  cooldownSeconds?: number
}

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
        "group relative inline-flex items-center justify-center gap-1.5 h-8 w-[100px]",
        cooldown ? "font-orbitron text-[10px] tracking-wider" : "font-jetbrains text-[10px] tracking-[0.12em] uppercase",
        "rounded-[3px] overflow-hidden",
        "transition-all duration-300",
        "cursor-clicker select-none",
        "disabled:opacity-60 disabled:pointer-events-none",
        cooldown
          ? "bg-citrine/10 text-citrine/50 border border-citrine/20"
          : "bg-citrine/5 text-citrine/70 border border-citrine/20 hover:border-citrine/40 hover:text-citrine hover:shadow-[0_0_12px_rgba(255,182,21,0.12)]",
        className
      )}
    >
      {/* Scanlines */}
      <span
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,182,21,0.04) 3px, rgba(255,182,21,0.04) 4px)" }}
      />
      {/* Hover fill sweep */}
      <span className="absolute inset-0 bg-citrine/8 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />

      <span className="relative inline-flex items-center justify-center gap-1.5">
        <span className="text-citrine/40 text-[8px] group-hover:text-citrine/70 transition-colors">◈</span>
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
