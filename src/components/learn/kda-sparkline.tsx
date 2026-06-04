import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { motion } from "framer-motion"

type DataPoint = { game: number; kda: number; win: boolean; champion: string }

export function KDASparkline({ data, delay = 0 }: { data: DataPoint[]; delay?: number }) {
  if (!data.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="relative bg-black/30 border border-flash/[0.06] rounded-sm p-3 overflow-hidden"
    >
      <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-flash/30 mb-2 block">KDA PER GAME</span>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="kdaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00d992" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#00d992" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="game"
              tick={{ fill: "rgba(191,197,198,0.3)", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "rgba(191,197,198,0.06)" }}
              tickLine={false}
              tickFormatter={(v) => `G${v}`}
            />
            <YAxis
              tick={{ fill: "rgba(191,197,198,0.3)", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <ReferenceLine y={3} stroke="rgba(0,217,146,0.15)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid rgba(191,197,198,0.1)",
                borderRadius: 2,
                fontSize: 11,
                fontFamily: "JetBrains Mono",
              }}
              labelStyle={{ color: "rgba(191,197,198,0.5)" }}
              formatter={(value: any, _: any, entry: any) => {
                const p = entry.payload as DataPoint
                return [`${Number(value).toFixed(2)} KDA — ${p.champion} (${p.win ? "W" : "L"})`, ""]
              }}
              labelFormatter={(v) => `Game ${v}`}
            />
            <Area
              type="monotone"
              dataKey="kda"
              stroke="#00d992"
              strokeWidth={1.5}
              fill="url(#kdaGrad)"
              dot={{ r: 3, fill: "#00d992", stroke: "none" }}
              activeDot={{ r: 5, fill: "#00d992", stroke: "#0a0a0a", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
