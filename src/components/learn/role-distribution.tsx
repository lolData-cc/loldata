import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { motion } from "framer-motion"

type RoleData = { role: string; games: number }

const ROLE_COLORS: Record<string, string> = {
  TOP: "#00d992",
  JUNGLE: "#f59e0b",
  MIDDLE: "#8b5cf6",
  BOTTOM: "#ef4444",
  UTILITY: "#3b82f6",
  UNKNOWN: "rgba(191,197,198,0.3)",
}

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top",
  JUNGLE: "Jungle",
  MIDDLE: "Mid",
  BOTTOM: "ADC",
  UTILITY: "Support",
  UNKNOWN: "Other",
}

export function RoleDistribution({ data, delay = 0 }: { data: RoleData[]; delay?: number }) {
  if (!data.length) return null

  const total = data.reduce((s, d) => s + d.games, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative bg-black/30 border border-flash/[0.06] rounded-sm p-3 overflow-hidden"
    >
      <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-flash/30 mb-1 block">ROLES PLAYED</span>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="games"
                nameKey="role"
                cx="50%"
                cy="50%"
                innerRadius={22}
                outerRadius={36}
                strokeWidth={0}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={ROLE_COLORS[d.role] ?? ROLE_COLORS.UNKNOWN} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid rgba(191,197,198,0.1)",
                  borderRadius: 2,
                  fontSize: 10,
                  fontFamily: "JetBrains Mono",
                }}
                formatter={(value: any, name: any) => [`${value} games`, ROLE_LABELS[name as string] ?? name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1">
          {data.sort((a, b) => b.games - a.games).map((d) => (
            <div key={d.role} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: ROLE_COLORS[d.role] ?? ROLE_COLORS.UNKNOWN }} />
              <span className="text-[10px] font-mono text-flash/50">
                {ROLE_LABELS[d.role] ?? d.role} <span className="text-flash/25">{d.games}g</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
