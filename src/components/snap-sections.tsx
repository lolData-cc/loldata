// src/components/snap-sections.tsx
import React, { Children, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type SnapSectionsProps = {
  children: React.ReactNode | React.ReactNode[]
  className?: string
  scrollPaddingTop?: number
  maxDots?: number
}

export default function SnapSections({
  children,
  className,
  scrollPaddingTop = 0,
  maxDots,
}: SnapSectionsProps) {
  const sections = Children.toArray(children) // sempre un array
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]) // array mutabile di ref
  const [active, setActive] = useState(0)

  // Observer per capire quale sezione è attiva
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e
        }
        if (!best) return
        const idx = sectionRefs.current.findIndex((el) => el === best!.target)
        if (idx !== -1) setActive(idx)
      },
      {
        root: containerRef.current,
        rootMargin: "-40% 0px -40% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    )

    sectionRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [sections.length]) // se cambia il numero di sezioni, ri-registra

  const scrollTo = (idx: number) => {
    const el = sectionRefs.current[idx]
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const dotCount = maxDots ? Math.min(maxDots, sections.length) : sections.length
  const mapIndex = (i: number) => {
    if (!maxDots || sections.length <= maxDots) return i
    const step = sections.length / maxDots
    return Math.round(i * step)
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          "h-screen overflow-y-auto snap-y snap-mandatory overscroll-contain scrollbar-hide",
          className
        )}
        style={{ scrollPaddingTop }}
      >
        {sections.map((child, i) => (
          <section
            key={i}
            // callback ref: niente hook nel loop
            ref={(el) => (sectionRefs.current[i] = el)}
            className="snap-start min-h-screen flex flex-col"
          >
            {child}
          </section>
        ))}
      </div>

      {/* Dots */}
      <div className="pointer-events-auto fixed right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        {Array.from({ length: dotCount }).map((_, i) => {
          const sectionIdx = mapIndex(i)
          const isActive = active === sectionIdx
          return (
            <button
              key={i}
              aria-label={`Vai alla sezione ${i + 1}`}
              onClick={() => scrollTo(sectionIdx)}
              className={cn(
                "h-3 w-3 rounded-full border transition-all duration-200",
                isActive
                  ? "scale-125 border-jade/80 bg-jade/70 shadow"
                  : "border-flash/30 bg-flash/10 hover:bg-flash/20"
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
