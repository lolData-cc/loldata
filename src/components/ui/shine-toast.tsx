// components/ui/ShineToast.tsx
import { useEffect } from "react"
import { toast } from "sonner"
import { ShineBorder } from "@/components/ui/shine-border"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  onClose?: () => void
}

export function ShineToast({ open, title, description, actionLabel, onAction, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const id = toast.custom((t) => (
      <ShineBorder className="rounded-2xl p-[2px] block" borderRadius={16}>
        <div className="rounded-2xl bg-liquirice px-4 py-3 flex items-start gap-3">
          <div className="flex-1">
            <div className="font-jetbrains text-flash/90">{title}</div>
            {description && <p className="text-sm font-geist text-flash/60 mt-0.5">{description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {actionLabel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onAction?.()
                  toast.dismiss(t)
                  onClose?.()
                }}
              >
                {actionLabel}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { toast.dismiss(t); onClose?.() }}>
              Chiudi
            </Button>
          </div>
        </div>
      </ShineBorder>
    ))
    return () => toast.dismiss(id)
  }, [open, title, description, actionLabel, onAction, onClose])

  return null
}
