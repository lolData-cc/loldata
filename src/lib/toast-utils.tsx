import { toast } from "sonner"
import { CyberToast } from "@/components/ui/cyber-toast"

type ShowCyberToastOptions = {
  title: string
  description?: string
  tag?: string
  variant?: "status" | "error"
  duration?: number
  action?: { label: string; onClick: () => void }
  closeButton?: boolean
}

export function showCyberToast({
  title,
  description,
  tag,
  variant = "status",
  duration = 3000,
  action,
  closeButton = false,
}: ShowCyberToastOptions) {
  toast.custom(
    (id) => (
      <CyberToast
        title={title}
        description={description}
        tag={tag}
        variant={variant}
        action={action ? {
          label: action.label,
          onClick: () => { action.onClick(); toast.dismiss(id); },
        } : undefined}
        onDismiss={closeButton ? () => toast.dismiss(id) : undefined}
      />
    ),
    { duration },
  )
}
