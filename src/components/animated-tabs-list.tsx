import * as React from "react"
import { TabsList } from "@/components/ui/tabs"

type Item = { value: string; label: React.ReactNode }

export function AnimatedTabsList({
  items,
  value,
  onValueChange,
  className = "",
  triggerClassName = "",
}: {
  items: Item[]
  value: string
  onValueChange: (v: string) => void
  className?: string
  triggerClassName?: string
}) {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [pill, setPill] = React.useState({ left: 0, width: 0 })

  const measure = React.useCallback(() => {
    const root = listRef.current
    if (!root) return
    const active = root.querySelector<HTMLElement>(`[data-value="${value}"]`)
    if (!active) return

    const rootRect = root.getBoundingClientRect()
    const aRect = active.getBoundingClientRect()
    setPill({
      left: aRect.left - rootRect.left,
      width: aRect.width,
    })
  }, [value])

  React.useLayoutEffect(() => {
    measure()
  }, [measure, items.length])

  React.useEffect(() => {
    const root = listRef.current
    if (!root) return

    const ro = new ResizeObserver(() => measure())
    ro.observe(root)
    // opzionale: osserva anche i figli per font load / wrap
    Array.from(root.children).forEach((c) => ro.observe(c as Element))

    return () => ro.disconnect()
  }, [measure])

  return (
    <TabsList
      ref={listRef as any}
      className={[
        // look simile al dashboard ma orizzontale
        "relative bg-transparent p-1 flex flex-row items-stretch gap-1 w-full",
        className,
      ].join(" ")}
    >
      {/* cornice “scorrevole” */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute top-1 bottom-1 rounded-sm border",
          // stile active come dashboard
          "border-jade/70 bg-jade/10",
          // animazione smooth
          "transition-[transform,width] duration-300 ease-out",
        ].join(" ")}
        style={{
          width: pill.width,
          transform: `translateX(${pill.left}px)`,
        }}
      />

      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          // IMPORTANT: data-value ci serve per misurare
          data-value={it.value}
          onClick={() => onValueChange(it.value)}
          className={[
            "relative z-10 flex-1",
            "px-3 py-1.5 text-[11px] tracking-[0.18em] uppercase rounded-sm",
            "border border-transparent",
            "text-flash/60 hover:border-flash/20",
            // lo stato attivo lo gestiamo noi (per tenere la stessa estetica)
            value === it.value ? "text-jade" : "",
            "cursor-clicker",
            triggerClassName,
          ].join(" ")}
        >
          {it.label}
        </button>
      ))}
    </TabsList>
  )
}
