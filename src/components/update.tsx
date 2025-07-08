// src/components/UpdateButton.tsx
import { ButtonHTMLAttributes } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type UpdateButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  cooldown?: boolean
}

export function UpdateButton({ loading, cooldown, className, children, ...props }: UpdateButtonProps) {
  const text = cooldown ? "UPDATED" : (loading ? "" : (children || "UPDATE"))
  return (
    <Button
      {...props}
      className={cn(
        "flex items-center justify-center gap-2 select-none",
        cooldown
          ? "bg-jade/20 text-jade"
          : "bg-jade bg-jade/20",
        className
      )}
      disabled={loading || cooldown}
    >
      {loading
        ? <Loader2 className="animate-spin w-20 h-10" />
        : text
      }
    </Button>
  )
}
