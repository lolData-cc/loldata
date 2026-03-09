import { toast } from "sonner"
import { CyberToast } from "@/components/ui/cyber-toast"

type ShowCyberToastOptions = {
  title: string
  description?: string
  tag?: string
  variant?: "status" | "error"
  duration?: number
}

export function showCyberToast({
  title,
  description,
  tag,
  variant = "status",
  duration = 3000,
}: ShowCyberToastOptions) {
  toast.custom(() => (
    <CyberToast
      title={title}
      description={description}
      tag={tag}
      variant={variant}
    />
  ), { duration })
}
