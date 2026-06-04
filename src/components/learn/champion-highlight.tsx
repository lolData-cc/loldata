import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { cdnBaseUrl } from "@/config"
import { normalizeChampName } from "@/config"

type ChampData = {
  name: string
  games: number
  wins: number
  avgKDA: string | number
} | null

export function ChampionHighlight({ best, worst, delay = 0 }: { best: ChampData; worst: ChampData; delay?: number }) {
  if (!best && !worst) return null

  return (
    <div className="grid grid-cols-2 gap-3">
      {best && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay }}
          className="relative bg-black/30 border border-jade/10 rounded-sm p-3 overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-jade/50 mb-2 block">BEST CHAMPION</span>
          <div className="flex items-center gap-2.5">
            <img
              src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(best.name)}.png`}
              alt={best.name}
              className="w-9 h-9 rounded-sm border border-jade/20"
              onError={(e) => { e.currentTarget.style.display = "none" }}
            />
            <div className="flex flex-col">
              <span className="text-[12px] font-mono text-flash/80 font-semibold">{best.name}</span>
              <span className="text-[10px] font-mono text-flash/40">
                {best.wins}W {best.games - best.wins}L — {best.avgKDA} KDA
              </span>
            </div>
          </div>
        </motion.div>
      )}
      {worst && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: delay + 0.1 }}
          className="relative bg-black/30 border border-red-400/10 rounded-sm p-3 overflow-hidden"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-red-400/40" />
          <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/50 mb-2 block">WORST CHAMPION</span>
          <div className="flex items-center gap-2.5">
            <img
              src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(worst.name)}.png`}
              alt={worst.name}
              className="w-9 h-9 rounded-sm border border-red-400/20"
              onError={(e) => { e.currentTarget.style.display = "none" }}
            />
            <div className="flex flex-col">
              <span className="text-[12px] font-mono text-flash/80 font-semibold">{worst.name}</span>
              <span className="text-[10px] font-mono text-flash/40">
                {worst.wins}W {worst.games - worst.wins}L — {worst.avgKDA} KDA
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
