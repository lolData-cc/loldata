import { motion } from "framer-motion"

type Props = {
  strengths: string[]
  weaknesses: string[]
  delay?: number
}

export function StrengthsWeaknesses({ strengths, weaknesses, delay = 0 }: Props) {
  if (!strengths.length && !weaknesses.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="grid grid-cols-2 gap-3"
    >
      {/* Strengths */}
      <div className="relative bg-black/30 border border-jade/10 rounded-sm p-3 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-jade/50 mb-2 block">STRENGTHS</span>
        <ul className="space-y-1.5">
          {strengths.map((s, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 * i }}
              className="flex items-start gap-1.5"
            >
              <span className="text-jade text-[10px] mt-0.5 shrink-0">{"\u25C6"}</span>
              <span className="text-[11px] font-mono text-flash/60 leading-snug">{s}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Weaknesses */}
      <div className="relative bg-black/30 border border-red-400/10 rounded-sm p-3 overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-400/40" />
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/50 mb-2 block">WEAKNESSES</span>
        <ul className="space-y-1.5">
          {weaknesses.map((w, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 * i }}
              className="flex items-start gap-1.5"
            >
              <span className="text-red-400 text-[10px] mt-0.5 shrink-0">{"\u25C6"}</span>
              <span className="text-[11px] font-mono text-flash/60 leading-snug">{w}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}
