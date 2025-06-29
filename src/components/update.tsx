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
        "px-7 flex items-center justify-center gap-2 select-none",
        cooldown
          ? "bg-[#11382E] text-[#00D992]"
          : "bg-[#00D992] text-[#11382E]",
        className
      )}
      disabled={loading || cooldown}
    >
      {loading
        ? <Loader2 className="animate-spin w-5 h-5" />
        : text
      }
    </Button>
  )
}
