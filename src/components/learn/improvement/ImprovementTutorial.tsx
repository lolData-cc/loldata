import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"

const EASE = [0.22, 1, 0.36, 1] as const
const container = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }
const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }

function GlowNode({ color }: { color: string }) {
  return (
    <div className="relative grid place-items-center h-16">
      <div className="absolute w-16 h-16 rounded-full blur-2xl" style={{ background: color, opacity: 0.32 }} />
      <div className="relative w-9 h-9 rotate-45 rounded-[6px]" style={{ background: `${color}22`, boxShadow: `inset 0 0 0 1.5px ${color}, 0 0 22px -4px ${color}` }} />
    </div>
  )
}

const STEPS = [
  { n: 1, color: "#00d992", title: "Choose your path", desc: "Pick the role you're climbing on. Each role has its own tree of the specific skills that decide games in that position." },
  { n: 2, color: "#00d992", title: "Play your games", desc: "We read the timelines of your recent ranked games and light up every skill you actually demonstrated — objective trades, clean clears, vision habits and more." },
  { n: 3, color: "#FFB615", title: "Master the tree", desc: "Jade = mastered, amber = in progress, dim = no data yet. Click any node for why it matters, your live progress, and the games behind it." },
]

export function ImprovementTutorial({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey) }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto px-4 py-12"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
          onClick={onClose}
        >
          <div className="absolute inset-0" style={{ background: "rgba(2,7,6,0.86)", backdropFilter: "blur(10px)" }} />
          <div className="pointer-events-none absolute left-1/2 top-[22%] h-[320px] w-[620px] -translate-x-1/2 rounded-full bg-jade/15 blur-[90px]" />

          <motion.div
            className="relative w-full max-w-4xl"
            initial={{ scale: 0.97, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 16 }} transition={{ duration: 0.45, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={onClose} aria-label="Close tutorial"
              className="group/close absolute right-0 top-0 z-10 inline-flex items-center gap-1.5 font-chakrapetch text-[10px] font-bold uppercase tracking-[0.22em] text-flash/40 transition-colors hover:text-jade cursor-clicker">
              Close <X className="h-3.5 w-3.5 transition-transform group-hover/close:rotate-90" />
            </button>

            <motion.div className="text-center" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <div className="mb-2 font-jetbrains text-[11px] uppercase tracking-[0.5em] text-jade/70">How it works</div>
              <h2 className="font-chakrapetch text-4xl font-black uppercase tracking-[0.16em] text-flash sm:text-5xl" style={{ textShadow: "0 0 32px rgba(0,217,146,0.45), 0 0 4px rgba(0,217,146,0.6)" }}>Improvement Tree</h2>
              <div className="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-jade/60 to-transparent" />
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="mt-10 flex flex-col items-stretch justify-center gap-5 sm:flex-row">
              {STEPS.map((s) => (
                <motion.div key={s.n} variants={item}
                  className="relative flex-1 rounded-lg p-5 bg-[linear-gradient(158deg,rgba(0,217,146,0.06)_0%,rgba(6,14,16,0.6)_40%,rgba(2,6,8,0.66)_100%)] shadow-[0_16px_40px_-12px_rgba(var(--c-shadow),0.7),0_0_0_1px_rgba(0,217,146,0.22)]">
                  <span className="pointer-events-none absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-jade/40 to-transparent" />
                  <GlowNode color={s.color} />
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-chakrapetch font-bold text-[11px] text-jade/70">0{s.n}</span>
                    <span className="font-chakrapetch font-bold text-[15px] uppercase tracking-[0.06em] text-flash/95">{s.title}</span>
                  </div>
                  <p className="mt-2 font-jetbrains text-[12px] leading-relaxed text-flash/55">{s.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div variants={item} initial="hidden" animate="show" className="mt-8 flex flex-wrap items-center justify-center gap-5 font-mono text-[10px] tracking-[0.12em] uppercase text-flash/45">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-jade shadow-[0_0_6px_#00d992]" /> mastered</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FFB615] shadow-[0_0_6px_#FFB615]" /> in progress</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-flash/25" /> no data yet</span>
            </motion.div>

            <div className="mt-8 flex justify-center">
              <button type="button" onClick={onClose}
                className="inline-flex items-center gap-2.5 rounded-md border border-jade/45 bg-jade/20 px-7 py-3 font-chakrapetch text-[13px] font-bold uppercase tracking-[0.2em] text-jade shadow-[0_0_36px_rgba(0,217,146,0.32)] transition-colors hover:bg-jade/30 cursor-clicker">
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
