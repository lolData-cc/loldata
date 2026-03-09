// SearchDialogMock.tsx
import * as React from "react"
import {
  motion,
  useAnimationControls,
  useMotionValue,
  animate,
  AnimatePresence,
} from "framer-motion"
import { Zap } from "lucide-react"

// ⏱️ Moltiplicatore globale della velocità (3 = 3× più lento)
const SPEED = 1.4

export default function SearchDialogMock({
  className = "",
  cursorSrc = "/cursors/base.svg",
  cursorClickerSrc = "/cursors/clicker.svg",
  cursorSize = 22,
  cursorHotspot = { x: 8, y: 8 },
  attachRef,
  zIndex = 30,
  baseWidth = 560,
  follow = true,
  hideWhenNoTarget = false,
}: {
  className?: string
  cursorSrc?: string
  cursorClickerSrc?: string
  cursorSize?: number
  cursorHotspot?: { x: number; y: number }
  attachRef?: React.RefObject<HTMLElement | null>
  zIndex?: number
  baseWidth?: number
  follow?: boolean
  hideWhenNoTarget?: boolean
}) {
  const [typed, setTyped] = React.useState("")
  const controls = useAnimationControls()
  const dialog = useAnimationControls()
  const pulse = useAnimationControls()

  // motion values per il cursore
  const cx = useMotionValue(-40)
  const cy = useMotionValue(0)
  const cursorFx = useAnimationControls() // scale/opacity

  // Stato per seguire rect del target agganciato
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const [scale, setScale] = React.useState(1)

  // Refs per coordinate locali
  const rootRef = React.useRef<HTMLDivElement | null>(null)    // contenitore relativo del mock (button + dialog)
  const btnRef = React.useRef<HTMLButtonElement | null>(null)  // bottone mock
  const suggRef = React.useRef<HTMLDivElement | null>(null)    // primo suggerimento

  // target di movimento
  const [cursorTargetBtn, setCursorTargetBtn] = React.useState({ x: 60, y: 14 })

  // hover states per cambiare il cursore
  const [overBtnArea, setOverBtnArea] = React.useState(false)
  const [overSuggArea, setOverSuggArea] = React.useState(false)

  const full = "Wasureta#EUW"

  // Durate/pause scalate
  const DUR_HOVER = 0.25 * SPEED
  const DUR_MOVE = 0.55 * SPEED
  const DUR_CLICK_DOWN = 0.10 * SPEED
  const DUR_CLICK_UP = 0.14 * SPEED
  const DUR_DIALOG_IN = 0.35 * SPEED
  const DUR_DIALOG_OUT = 0.28 * SPEED
  const DUR_RESET = 0.24 * SPEED
  const DUR_EXIT = 0.65 * SPEED
  const TYPE_DELAY_MS = 60 * SPEED
  const PAUSE_AFTER_TYPE_MS = 500 * SPEED
  const PAUSE_AFTER_SELECT_MS = 350 * SPEED
  const PAUSE_LOOP_MS = 700 * SPEED

  // Misura il target agganciato (img fantasma) e aggiorna posizione + scala
  React.useLayoutEffect(() => {
    if (!attachRef?.current) return
    const target = attachRef.current
    const update = () => {
      const r = target.getBoundingClientRect()
      setRect(r)
      setScale(r.width / baseWidth)
    }
    update()
    if (!follow) return
    const ro = new ResizeObserver(update)
    ro.observe(target)
    const onScroll = () => update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll, { passive: true })
    return () => {
      ro.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [attachRef, baseWidth, follow])

  // Helper: coordinate locali al rootRef da un DOMRect assoluto
  const toLocal = React.useCallback((abs: DOMRect) => {
    const root = rootRef.current
    if (!root) return { x: 0, y: 0 }
    const rr = root.getBoundingClientRect()
    return { x: abs.left - rr.left, y: abs.top - rr.top }
  }, [])

  // Calcola target cursore sul bottone
  React.useLayoutEffect(() => {
    const btn = btnRef.current
    const root = rootRef.current
    if (!btn || !root) return
    const br = btn.getBoundingClientRect()
    const { x, y } = toLocal(br)
    setCursorTargetBtn({ x: x + br.width * 0.62, y: y + br.height * 0.52 })
  }, [scale, toLocal])

  // Tracking hover dinamico (bottone + primo suggerimento)
  React.useEffect(() => {
    const checkZones = () => {
      const btn = btnRef.current
      const root = rootRef.current
      if (!root) return

      const bx = cx.get()
      const by = cy.get()
      const pad = 6

      // area bottone
      if (btn) {
        const br = btn.getBoundingClientRect()
        const { x, y } = toLocal(br)
        const insideBtn = bx >= x - pad && bx <= x + br.width + pad && by >= y - pad && by <= y + br.height + pad
        setOverBtnArea(insideBtn)
      } else {
        setOverBtnArea(false)
      }

      // area primo suggerimento (se esiste)
      const sr = suggRef.current?.getBoundingClientRect()
      if (sr) {
        const { x: sx, y: sy } = toLocal(sr)
        const insideSugg = bx >= sx - pad && bx <= sx + sr.width + pad && by >= sy - pad && by <= sy + sr.height + pad
        setOverSuggArea(insideSugg)
      } else {
        setOverSuggArea(false)
      }
    }

    const unsubX = cx.on("change", checkZones)
    const unsubY = cy.on("change", checkZones)
    checkZones()
    return () => {
      unsubX()
      unsubY()
    }
  }, [toLocal])

  // piccolo feedback neutro quando entra/esce dalle aree
  React.useEffect(() => {
    cursorFx.start({ scale: 1.0 }, { duration: 0.08 * SPEED })
  }, [overBtnArea, overSuggArea])

  // utility: attende che il primo suggerimento esista nel DOM
  const waitForFirstSuggestion = React.useCallback(async (timeoutMs = 3000) => {
    const start = performance.now()
    return new Promise<void>((resolve) => {
      const tick = () => {
        if (suggRef.current) return resolve()
        if (performance.now() - start > timeoutMs) return resolve() // non bloccare il loop
        requestAnimationFrame(tick)
      }
      tick()
    })
  }, [])

  React.useEffect(() => {
    let cancelled = false

    async function loop() {
      while (!cancelled) {
        // reset
        setTyped("")
        await controls.start({ y: 0 }, { duration: 0 })
        await dialog.start({ opacity: 0, y: 8, scale: 0.98 }, { duration: 0 })
        cx.set(-40); cy.set(0); await cursorFx.start({ opacity: 1, scale: 1 }, { duration: 0 })

        // hover “lift” del bottone
        await Promise.all([
          controls.start({ y: -2 }, { type: "spring", stiffness: 400, damping: 26 }),
          pulse.start({ boxShadow: "0 18px 40px rgba(16,185,129,0.18)" }, { duration: DUR_HOVER }),
        ])

        // vai al bottone
        await Promise.all([
          animate(cx, cursorTargetBtn.x, { duration: DUR_MOVE, ease: "easeOut" }),
          animate(cy, cursorTargetBtn.y, { duration: DUR_MOVE, ease: "easeOut" }),
        ])

        // click sul bottone
        await cursorFx.start({ scale: 0.9 }, { duration: DUR_CLICK_DOWN })
        await cursorFx.start({ scale: 1 }, { duration: DUR_CLICK_UP })

        // apri dialog
        await dialog.start({ opacity: 1, y: 0, scale: 1 }, { duration: DUR_DIALOG_IN, ease: "easeOut" })

        // typing
        for (let i = 0; i < full.length; i++) {
          if (cancelled) return
          setTyped((t) => t + full[i])
          await new Promise((r) => setTimeout(r, TYPE_DELAY_MS))
        }

        // aspetta che compaiano i suggerimenti (min 4 lettere => ormai ci siamo)
        await waitForFirstSuggestion()
        // brevissima pausa per far stabilizzare i rect
        await new Promise((r) => setTimeout(r, 40 * SPEED))

        // calcola target del primo suggerimento (se esiste)
        const sr = suggRef.current?.getBoundingClientRect()
        if (sr && rootRef.current) {
          const { x: sx, y: sy } = toLocal(sr)
          const targetX = sx + sr.width * 0.85   // più verso destra
          const targetY = sy + sr.height * 0.50 + 16  // a metà altezza

          // muovi sul primo suggerimento
          await Promise.all([
            animate(cx, targetX, { duration: DUR_MOVE, ease: "easeOut" }),
            animate(cy, targetY, { duration: DUR_MOVE, ease: "easeOut" }),
          ])

          // click sul suggerimento
          await cursorFx.start({ scale: 0.92 }, { duration: DUR_CLICK_DOWN })
          await cursorFx.start({ scale: 1 }, { duration: DUR_CLICK_UP })
          await new Promise((r) => setTimeout(r, PAUSE_AFTER_SELECT_MS))
        } else {
          // fallback: se il suggerimento non c'è, continua normalmente
          await new Promise((r) => setTimeout(r, PAUSE_AFTER_TYPE_MS))
        }

        // chiudi dialog
        await dialog.start({ opacity: 0, y: 6, scale: 0.99 }, { duration: DUR_DIALOG_OUT })

        // reset hover bottone
        await controls.start({ y: 0 }, { duration: DUR_RESET })
        await pulse.start({ boxShadow: "0 0 0 rgba(0,0,0,0)" }, { duration: DUR_RESET })

        // cursore esce
        const ex = cx.get() + 80
        const ey = cy.get() - 30
        await Promise.all([
          animate(cx, ex, { duration: DUR_EXIT }),
          animate(cy, ey, { duration: DUR_EXIT }),
          cursorFx.start({ opacity: 0 }, { duration: DUR_EXIT }),
        ])

        await new Promise((r) => setTimeout(r, PAUSE_LOOP_MS))
      }
    }

    loop()
    return () => { cancelled = true }
  }, [
    cursorTargetBtn.x,
    cursorTargetBtn.y,
    waitForFirstSuggestion,
    toLocal,
  ])

  // Se deve sparire quando non c'è target
  if (hideWhenNoTarget && !rect) return null

  const anchored = !!rect

  return (
    <div
      className={(anchored ? "fixed" : "relative") + " " + className}
      style={
        anchored
          ? {
              left: rect!.left,
              top: rect!.top,
              width: rect!.width,
              height: rect!.height,
              zIndex,
              pointerEvents: "none",
            }
          : undefined
      }
    >
      <div
        className="w-[--mock-w] relative" // root relativo per button, dialog e cursore
        ref={rootRef}
        style={{
          // @ts-ignore var custom
          "--mock-w": `${baseWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: baseWidth,
        }}
      >
        {/* pulsante */}
        <div className="relative inline-block">
          <motion.button
            ref={btnRef}
            className="relative inline-flex items-center gap-2 rounded-sm font-jetbrains cursor-default border border-flash/10 bg-jade/10 text-jade px-4 py-2 select-none"
            animate={controls}
          >
            <motion.span className="absolute inset-0 rounded-sm -z-10" animate={pulse} />
            <span className="hidden sm:inline">SEARCH A PLAYER</span>
          </motion.button>
        </div>

        {/* dialog finto */}
        <motion.div
          className="mt-5 w-[560px] max-w-[85vw] rounded-md border border-flash/10 bg-liquirice/90 p-5"
          animate={dialog}
          style={{ pointerEvents: "none" }}
        >
          <div className="flex items-center justify-between text-flash mb-3">
            <div className="text-sm font-semibold font-jetbrains">Search a player</div>
            <div className="flex text-citrine/80 bg-citrine/20 px-1.5 py-0.5 border border-citrine/10 space-x-1 rounded-sm items-center">
              <Zap className="w-3.5 h-3.5" />
              <div className="text-xs pr-1">CTRL+K</div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <div className="bg-black/20 border border-flash/10 rounded px-3 py-2 text-flash text-sm font-mono tracking-wide">
                {typed || <span className="text-flash/30">Your username + #TAG</span>}
              </div>
            </div>
            <div className="w-20">
              <div className="w-full h-full flex items-center justify-center bg-black/20 border border-flash/10 rounded text-flash text-xs">
                EUW
              </div>
            </div>
          </div>

          <AnimatePresence>
            {(() => {
              const namePartLen = (typed.split("#")[0] || "").length
              const show = namePartLen >= 4
              return show ? (
                <motion.div
                  key="suggestions"
                  className="mt-3 space-y-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 * SPEED }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      ref={i === 0 ? suggRef : undefined} // 👈 il primo ha il ref
                      key={i}
                      className="h-14 bg-liquirice/90 border border-flash/10 text-flash px-4 py-2 rounded-md flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-flash/30 rounded-sm" />
                        <div>
                          <div className="text-sm">Wasureta</div>
                          <div className="text-[11px] text-flash/50">#EUW</div>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-flash/20" />
                    </div>
                  ))}
                </motion.div>
              ) : null
            })()}
          </AnimatePresence>
        </motion.div>

        {/* cursore custom: clicker quando sopra bottone O suggerimento */}
        <motion.img
          src={overBtnArea || overSuggArea ? cursorClickerSrc : cursorSrc}
          alt="cursor"
          className="pointer-events-none absolute z-50 select-none"
          animate={cursorFx}
          style={{
            left: 0,
            top: 0,
            width: cursorSize,
            height: cursorSize,
            translateX: -cursorHotspot.x,
            translateY: -cursorHotspot.y,
            x: cx,
            y: cy,
          }}
        />
      </div>
    </div>
  )
}
