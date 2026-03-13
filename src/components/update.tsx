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
        "inline-flex items-center justify-center gap-1.5 h-9 px-5",
        "font-jetbrains text-[11px] tracking-[0.1em] uppercase",
        "rounded-sm border-0",
        "transition-all duration-200",
        "cursor-clicker select-none",
        "disabled:opacity-30 disabled:pointer-events-none",
        cooldown
          ? "bg-jade/25 text-jade"
          : "bg-[#11382E] text-jade hover:bg-[#195848]",
        className
      )}
    >
      <span className="relative inline-flex items-center justify-center">
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
