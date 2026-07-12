import { motion } from "framer-motion"
import { X, Info, Gauge } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeChampName, cdnBaseUrl } from "@/config"
import type { TreeNode } from "@/hooks/useImprovementTree"

const EASE = [0.22, 1, 0.36, 1] as const

const TONE = {
  complete: { text: "text-jade", ring: "rgba(0,217,146,0.55)", bar: "#00d992", label: "COMPLETE" },
  progress: { text: "text-[#FFB615]", ring: "rgba(255,182,21,0.5)", bar: "#FFB615", label: "IN PROGRESS" },
  locked: { text: "text-flash/40", ring: "rgba(215,216,217,0.18)", bar: "#5b6b66", label: "NO DATA YET" },
} as const

const asideCls =
  "absolute right-0 top-0 bottom-0 z-20 w-[340px] max-w-[86%] overflow-y-auto no-scrollbar " +
  "bg-[linear-gradient(200deg,rgba(4,10,12,0.86),rgba(4,10,12,0.96))] backdrop-blur-xl " +
  "shadow-[inset_1px_0_0_rgba(0,217,146,0.18),-24px_0_50px_-20px_rgba(var(--c-shadow),0.8)]"

export type HubRow = { id: string; label: string; state: "locked" | "progress" | "complete"; progress: number }

// panel for a category hub or the root — lists the branch's skills, each drills in
export function HubDetail({ eyebrow, title, subtitle, rows, onSelect, onClose }: {
  eyebrow: string; title: string; subtitle?: string; rows: HubRow[]
  onSelect: (id: string) => void; onClose: () => void
}) {
  const done = rows.filter((r) => r.state === "complete").length
  return (
    <motion.aside initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }} transition={{ duration: 0.32, ease: EASE }} className={asideCls}>
      <span className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-jade/50 to-transparent" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-jade/55">{eyebrow}</span>
            <h3 className="font-chakrapetch font-bold text-[19px] leading-tight text-flash/95 mt-1">{title}</h3>
          </div>
          <button onClick={onClose} className="shrink-0 cursor-clicker rounded-[4px] p-1.5 text-flash/40 hover:text-flash/80 hover:bg-filmlight/[0.05] transition-colors"><X size={16} /></button>
        </div>
        {subtitle && <p className="font-jetbrains text-[12px] leading-relaxed text-flash/55 mb-4">{subtitle}</p>}
        <div className="flex items-center justify-between mb-2.5">
          <span className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-flash/35">{rows.length ? "Skills" : ""}</span>
          <span className="font-chakrapetch font-bold text-[13px] tabular-nums text-jade">{done}<span className="text-flash/30">/{rows.length}</span></span>
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => {
            const t = TONE[r.state]
            const fill = Math.min(1, r.progress <= 1 ? r.progress : r.progress / 100)
            return (
              <button key={r.id} onClick={() => onSelect(r.id)}
                className="w-full text-left cursor-clicker group rounded-[4px] px-2.5 py-2 bg-filmdark/25 hover:bg-filmdark/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:shadow-[inset_0_0_0_1px_rgba(0,217,146,0.22)] transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", r.state === "complete" ? "bg-jade" : r.state === "progress" ? "bg-[#FFB615]" : "bg-flash/25")} />
                  <span className="font-jetbrains text-[12px] text-flash/75 group-hover:text-flash/95 truncate">{r.label}</span>
                  <span className={cn("ml-auto font-mono text-[9.5px] tabular-nums shrink-0", t.text)}>{Math.round(fill * 100)}%</span>
                </div>
                <div className="h-1 rounded-full bg-black/50 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${fill * 100}%`, background: t.bar, boxShadow: `0 0 8px ${t.ring}` }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </motion.aside>
  )
}

export function NodeDetail({ node, onClose }: { node: TreeNode; onClose: () => void }) {
  const tone = TONE[node.state]
  const pct = Math.round(node.progress * 100)
  const fill = node.threshold > 0 ? Math.min(1, node.progress / node.threshold) : node.progress

  return (
    <motion.aside
      initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.32, ease: EASE }}
      className="absolute right-0 top-0 bottom-0 z-20 w-[340px] max-w-[86%] overflow-y-auto no-scrollbar
        bg-[linear-gradient(200deg,rgba(4,10,12,0.86),rgba(4,10,12,0.96))] backdrop-blur-xl
        shadow-[inset_1px_0_0_rgba(0,217,146,0.18),-24px_0_50px_-20px_rgba(var(--c-shadow),0.8)]"
    >
      <span className="pointer-events-none absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-jade/50 to-transparent" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <span className={cn("font-mono text-[9.5px] tracking-[0.22em] uppercase", tone.text)}>{tone.label}</span>
            <h3 className="font-chakrapetch font-bold text-[19px] leading-tight text-flash/95 mt-1">{node.title}</h3>
          </div>
          <button onClick={onClose} className="shrink-0 cursor-clicker rounded-[4px] p-1.5 text-flash/40 hover:text-flash/80 hover:bg-filmlight/[0.05] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* progress */}
        <div className="relative rounded-md p-4 mb-5 bg-filmdark/40 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.12)]">
          <div className="flex items-end justify-between mb-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className={cn("font-chakrapetch font-bold text-[30px] leading-none tabular-nums", tone.text)}>{pct}</span>
              <span className="font-mono text-[11px] text-flash/35">%</span>
            </div>
            <span className="font-mono text-[11px] text-flash/45">{node.detail}</span>
          </div>
          <div className="h-2 rounded-full bg-black/50 overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${fill * 100}%` }} transition={{ duration: 0.8, ease: EASE }}
              className="h-full rounded-full" style={{ background: tone.bar, boxShadow: `0 0 12px ${tone.ring}` }} />
          </div>
          <p className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-flash/25 mt-2">
            fully lit at {Math.round(node.threshold * 100)}% of eligible games
          </p>
        </div>

        {/* why */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Info size={13} className="text-jade/70" />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-jade/60">Why this matters</span>
          </div>
          <p className="font-jetbrains text-[12.5px] leading-relaxed text-flash/70">{node.why}</p>
        </div>

        {/* how */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Gauge size={13} className="text-flash/45" />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-flash/40">How it's measured</span>
          </div>
          <p className="font-jetbrains text-[12px] leading-relaxed text-flash/50">{node.how}</p>
        </div>

        {/* per-game breakdown */}
        {node.games.length > 0 && (
          <div>
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-flash/40 block mb-2.5">Recent games</span>
            <div className="flex flex-wrap gap-1.5">
              {node.games.map((g, i) => (
                <div key={i} title={`${g.champion} · ${g.success ? "demonstrated" : "missed"}`}
                  className={cn("relative w-8 h-8 rounded-[4px] overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
                    g.success ? "ring-1 ring-jade/50" : "ring-1 ring-red-400/30 opacity-70")}>
                  <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(g.champion)}.png`} alt=""
                    className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
                  <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 flex items-center justify-center text-[7px] font-black rounded-tl-[3px]",
                    g.success ? "bg-jade text-liquirice" : "bg-red-400/80 text-liquirice")}>{g.success ? "✓" : "×"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
