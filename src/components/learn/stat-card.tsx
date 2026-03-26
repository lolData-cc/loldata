import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

type Props = {
  title: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "neutral"
  color?: "jade" | "red" | "amber" | "flash"
  delay?: number
}

const colorMap = {
  jade: "text-jade",
  red: "text-red-400",
  amber: "text-amber-400",
  flash: "text-flash/80",
}

export function StatCard({ title, value, subtitle, trend, color = "flash", delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative bg-black/30 border border-flash/[0.06] rounded-sm p-3 overflow-hidden group"
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px)" }} />

      <div className="relative z-10">
        <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-flash/30">{title}</span>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className={cn("text-xl font-mono font-bold tabular-nums leading-none", colorMap[color])}>
            {value}
          </span>
          {trend && trend !== "neutral" && (
            <span className={cn("text-[10px] font-mono", trend === "up" ? "text-jade" : "text-red-400")}>
              {trend === "up" ? "\u25B2" : "\u25BC"}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-[10px] font-mono text-flash/35 mt-0.5 block">{subtitle}</span>
        )}
      </div>
    </motion.div>
  )
}
