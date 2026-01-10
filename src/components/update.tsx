// src/components/UpdateButton.tsx
import { ButtonHTMLAttributes } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type UpdateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  cooldown?: boolean
}

export function UpdateButton({
  loading,
  cooldown,
  className,
  children,
  ...props
}: UpdateButtonProps) {
  const label = cooldown ? "UPDATED" : (children || "UPDATE")

  return (
    <Button
      {...props}
      className={cn(
        "inline-flex items-center justify-center select-none",
        "h-9 px-5",
        cooldown ? "bg-jade/20 text-jade" : "bg-jade/10",
        className
      )}
      disabled={loading || cooldown}
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
    </Button>
  )
}
