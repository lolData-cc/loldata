// src/components/overview.tsx — Daily Performance Dashboard (Cyber UI)
import { useLearnOverview } from "@/hooks/useLearnOverview"
import { KDASparkline } from "@/components/learn/kda-sparkline"
import { StrengthsWeaknesses } from "@/components/learn/strengths-weaknesses"
import { OverviewSkeleton } from "@/components/learn/overview-skeleton"
import { OrbitEmpty } from "@/components/learn/orbit-empty"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { normalizeChampName, cdnBaseUrl } from "@/config"

type Props = { puuid: string | null; region: string | null; nametag: string | null }

const NUM_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
function numWord(n: number): string {
  return n >= 0 && n < NUM_WORDS.length ? NUM_WORDS[n] : String(n)
}

/* ── Cyber card wrapper with corner brackets + scanlines ── */
function CyberCard({ children, className, accent = "jade", delay = 0 }: {
  children: React.ReactNode; className?: string; accent?: "jade" | "red" | "amber" | "flash"; delay?: number
}) {
  const borderColor = accent === "jade" ? "border-jade/10" : accent === "red" ? "border-red-400/10" : accent === "amber" ? "border-amber-400/10" : "border-flash/[0.06]"
  const barColor = accent === "jade" ? "bg-jade/30" : accent === "red" ? "bg-red-400/30" : accent === "amber" ? "bg-amber-400/30" : "bg-flash/10"
  const cornerColor = accent === "jade" ? "bg-jade/20" : accent === "red" ? "bg-red-400/20" : accent === "amber" ? "bg-amber-400/20" : "bg-flash/10"
  const scanColor = accent === "jade" ? "rgba(0,217,146,0.012)" : accent === "red" ? "rgba(248,113,113,0.012)" : accent === "amber" ? "rgba(245,158,11,0.012)" : "rgba(255,255,255,0.008)"

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}
      className={cn("relative rounded-[2px] border overflow-hidden", borderColor, className)}
    >
      {/* Left accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[2px]", barColor)} />
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${scanColor} 3px, ${scanColor} 4px)` }} />
      {/* Corner brackets */}
      {[["top-0 left-0", "top-0 left-0", "top-0 left-0"], ["top-0 right-0", "top-0 right-0", "top-0 right-0"], ["bottom-0 left-0", "bottom-0 left-0", "bottom-0 left-0"], ["bottom-0 right-0", "bottom-0 right-0", "bottom-0 right-0"]].map((pos, i) => (
        <div key={i} className={cn("absolute w-2.5 h-2.5 z-[3]", i === 0 ? "top-0 left-0" : i === 1 ? "top-0 right-0" : i === 2 ? "bottom-0 left-0" : "bottom-0 right-0")}>
          <div className={cn("absolute h-px w-full", cornerColor, i < 2 ? "top-0" : "bottom-0", i % 2 === 0 ? "left-0" : "right-0")} />
          <div className={cn("absolute w-px h-full", cornerColor, i < 2 ? "top-0" : "bottom-0", i % 2 === 0 ? "left-0" : "right-0")} />
        </div>
      ))}
      {/* Bottom glow line */}
      <div className={cn("absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent", accent === "jade" ? "via-jade/15" : accent === "red" ? "via-red-400/15" : accent === "amber" ? "via-amber-400/15" : "via-flash/8")} style={{ zIndex: 3 }} />
      {/* Content */}
      <div className="relative z-[2] p-4 pl-5">{children}</div>
    </motion.div>
  )
}

/* ── Section header with jade dashes ── */
function SectionLabel({ children, delay = 0 }: { children: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
      className="flex items-center gap-3 mt-8 mb-3">
      <div className="w-1.5 h-1.5 rotate-45 bg-jade/30" />
      <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-jade/40">{children}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-jade/10 to-transparent" />
    </motion.div>
  )
}

/* ── Stat row inside a CyberCard ── */
function StatRow({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-flash/[0.03] last:border-0">
      <span className="text-[11px] font-mono text-flash/35 tracking-wide">{label}</span>
      <div className="flex items-baseline gap-2.5">
        <span className={cn("text-[13px] font-orbitron font-semibold tabular-nums", color || "text-flash/65")}>{value}</span>
        {sub && <span className="text-[13px] font-orbitron font-semibold tabular-nums text-flash/20">{sub}</span>}
      </div>
    </div>
  )
}

/* ── Big stat with glow ── */
function BigStat({ value, label, sub, color, glow }: { value: string | number; label: string; sub?: string; color: string; glow?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-mono tracking-[0.25em] uppercase text-flash/20 mb-1">{label}</span>
      <span className={cn("text-[42px] font-orbitron font-bold tabular-nums leading-none tracking-tight", color)}
        style={glow ? { textShadow: glow } : undefined}
      >{value}</span>
      {sub && <span className="text-[11px] font-mono text-flash/25 mt-1">{sub}</span>}
    </div>
  )
}

export default function Overview({ puuid, region, nametag }: Props) {
  const { data, loading, error } = useLearnOverview(puuid, region, nametag)

  if (loading) return <OverviewSkeleton />
  if (error) return <div className="flex items-center justify-center h-48"><span className="text-flash/40 font-mono text-sm">Failed to load overview data</span></div>

  if (!data?.today || data.today.totalGames === 0) {
    return (
      <div className="space-y-2">
        <OrbitEmpty label="No ranked games played today" />
        {data?.baseline && (
          <div className="text-center pt-2">
            <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-flash/20">RECENT AVERAGES</span>
            <div className="flex justify-center gap-6 mt-2">
              {[["KDA", data.baseline.avgKDA], ["CS/M", data.baseline.avgCSPM], ["KP", data.baseline.avgKP + "%"]].map(([l, v]) => (
                <div key={l as string} className="flex flex-col items-center">
                  <span className="text-[13px] font-mono text-flash/50 tabular-nums">{v}</span>
                  <span className="text-[8px] font-mono text-flash/20 tracking-[0.15em]">{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const t = data.today
  const b = data.baseline
  const kdaColor = t.aggregateKDA.ratio >= 4 ? "text-jade" : t.aggregateKDA.ratio >= 3 ? "text-amber-400" : t.aggregateKDA.ratio >= 2 ? "text-flash/80" : "text-red-400"
  const kdaGlow = t.aggregateKDA.ratio >= 4 ? "0 0 35px rgba(0,217,146,0.3), 0 0 80px rgba(0,217,146,0.1)" : t.aggregateKDA.ratio >= 3 ? "0 0 35px rgba(245,158,11,0.25), 0 0 80px rgba(245,158,11,0.08)" : t.aggregateKDA.ratio >= 2 ? "0 0 25px rgba(255,255,255,0.08)" : "0 0 35px rgba(248,113,113,0.25), 0 0 80px rgba(248,113,113,0.08)"
  const wrColor = t.winrate >= 50 ? "text-jade" : "text-red-400"
  const wrGlow = t.winrate >= 50 ? "0 0 35px rgba(0,217,146,0.3), 0 0 80px rgba(0,217,146,0.1)" : "0 0 35px rgba(248,113,113,0.3), 0 0 80px rgba(248,113,113,0.1)"
  const impactColor = t.impact >= 70 ? "text-jade" : t.impact >= 50 ? "text-amber-400" : "text-red-400"
  const impactStroke = t.impact >= 70 ? "#00d992" : t.impact >= 50 ? "#f59e0b" : "#f87171"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-1 pb-12">

      {/* ═══ HERO STRIP ═══ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between pb-6 mb-2 border-b border-flash/[0.05]">

        {/* WR */}
        <BigStat value={`${t.winrate}%`} label="SESSION WINRATE" sub={`${t.wins}W ${t.losses}L  //  ${t.totalGames} games`} color={wrColor} glow={wrGlow} />

        {/* KDA */}
        <div className="text-right">
          <BigStat value={t.aggregateKDA.ratio} label="SESSION KDA" color={kdaColor} glow={kdaGlow} />
          <div className="text-[11px] font-mono text-flash/30 mt-1">
            {t.aggregateKDA.kills}<span className="text-flash/12"> / </span>
            <span className="text-red-400/50">{t.aggregateKDA.deaths}</span>
            <span className="text-flash/12"> / </span>{t.aggregateKDA.assists}
          </div>
        </div>
      </motion.div>

      {/* ═══ PERFORMANCE ═══ */}
      <SectionLabel delay={0.1}>PERFORMANCE</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <CyberCard delay={0.12}>
          <StatRow label="CS / min" value={t.avgCSPM} sub={b ? `avg ${b.avgCSPM}` : undefined} />
          <StatRow label="Gold / min" value={t.avgGoldPerMin ?? 0} sub={b ? `avg ${b.avgGoldPerMin}` : undefined} />
          <StatRow label="Gold / game" value={Number(t.avgGoldPerGame).toLocaleString()} />
          <StatRow label="Avg game length" value={`${t.avgGameDuration}m`} />
        </CyberCard>
        <CyberCard delay={0.14}>
          <StatRow label="Kill participation" value={`${t.killParticipation}%`} sub={b ? `avg ${b.avgKP}%` : undefined} />
          <StatRow label="Damage share" value={`${t.avgDamageShare}%`} sub={b ? `avg ${b.avgDmgShare}%` : undefined} />
          <StatRow label="Vision score" value={t.avgVision} sub={`${t.avgWardsPlaced} placed`} />
          <StatRow label="CC time / game" value={`${t.avgCCTime}s`} />
        </CyberCard>
      </div>

      {/* ═══ COMBAT ═══ */}
      <SectionLabel delay={0.18}>COMBAT</SectionLabel>
      <div className="grid grid-cols-2 gap-4">
        <CyberCard delay={0.2}>
          <StatRow label="Avg damage dealt" value={Number(t.avgDmgPerGame).toLocaleString()} />
          <StatRow label="Avg damage taken" value={Number(t.avgDmgTakenPerGame).toLocaleString()} />
          <StatRow label="Turret damage" value={Number(t.avgTurretDmg).toLocaleString()} />
        </CyberCard>
        <CyberCard delay={0.22}>
          <StatRow label="Solo kills" value={t.soloKills} color={t.soloKills > 0 ? "text-jade/70" : undefined} />
          <StatRow label="First bloods" value={t.firstBloods} color={t.firstBloods > 0 ? "text-jade/70" : undefined} />
          <StatRow label="Multi kills" value={[
            t.doubleKills > 0 ? `${numWord(t.doubleKills)} double${t.doubleKills > 1 ? "s" : ""}` : null,
            t.tripleKills > 0 ? `${numWord(t.tripleKills)} triple${t.tripleKills > 1 ? "s" : ""}` : null,
            t.quadraKills > 0 ? `${numWord(t.quadraKills)} quadra${t.quadraKills > 1 ? "s" : ""}` : null,
            t.pentaKills > 0 ? `${numWord(t.pentaKills)} penta${t.pentaKills > 1 ? "s" : ""}` : null,
          ].filter(Boolean).join(", ") || "none"} />
        </CyberCard>
      </div>

      {/* ═══ IMPACT ═══ */}
      <SectionLabel delay={0.24}>IMPACT SCORE</SectionLabel>
      <CyberCard accent={t.impact >= 65 ? "jade" : t.impact >= 50 ? "amber" : "red"} delay={0.26}>
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" className="absolute inset-0">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3" />
              <circle cx="40" cy="40" r="34" fill="none"
                stroke={impactStroke} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(t.impact / 100) * 213.6} 213.6`}
                transform="rotate(-90 40 40)"
                style={{ filter: `drop-shadow(0 0 6px ${impactStroke}40)` }}
              />
            </svg>
            <span className={cn("text-[26px] font-orbitron font-bold tabular-nums", impactColor)}>{t.impact}</span>
          </div>
          <div className="flex-1">
            <span className={cn("text-[14px] font-orbitron font-bold tracking-wide", impactColor)}>
              {t.impact >= 80 ? "DOMINANT" : t.impact >= 65 ? "STRONG" : t.impact >= 50 ? "AVERAGE" : t.impact >= 35 ? "BELOW AVERAGE" : "ROUGH SESSION"}
            </span>
            <p className="text-[11px] font-mono text-flash/30 mt-1 leading-relaxed">
              {t.impact >= 65
                ? "You outperformed relative to your team. Your individual plays had a significant positive effect on outcomes."
                : t.impact >= 50
                  ? "You played at an average level relative to your team. Consistent but room to carry harder."
                  : "Your individual performance was below your team average. Focus on reducing deaths and increasing participation."}
            </p>
          </div>
        </div>
      </CyberCard>

      {/* ═══ KDA TREND ═══ */}
      <SectionLabel delay={0.24}>KDA TREND</SectionLabel>
      <CyberCard delay={0.26} className="!p-0 !pl-0">
        <div className="-ml-1">
          <KDASparkline data={t.perGameKDA} delay={0} />
        </div>
      </CyberCard>

      {/* ═══ CHAMPIONS ═══ */}
      {t.allChampions?.length > 0 && (
        <>
          <SectionLabel delay={0.3}>CHAMPIONS PLAYED</SectionLabel>
          <CyberCard delay={0.32} className="!p-0 !pl-0">
            <div>
              {t.allChampions.map((c: any, i: number) => (
                <div key={c.name} className={cn(
                  "flex items-center gap-3 px-4 py-2.5 pl-5 transition-colors duration-150 hover:bg-jade/[0.02]",
                  i > 0 && "border-t border-flash/[0.03]"
                )}>
                  <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(c.name)}.png`} alt="" className="w-8 h-8 rounded-sm border border-flash/[0.06]" onError={e => { e.currentTarget.style.display = "none" }} />
                  <span className="text-[12px] font-mono text-flash/65 w-28 truncate">{c.name}</span>
                  <div className="flex-1 flex items-center gap-4 justify-end">
                    <span className={cn("text-[12px] font-mono tabular-nums font-semibold", c.winrate >= 50 ? "text-jade/70" : "text-red-400/70")}>{c.winrate}%</span>
                    <span className="text-[10px] font-mono text-flash/25 w-8 text-right">{c.games}g</span>
                    <span className="text-[10px] font-mono text-flash/35 w-14 text-right">{c.avgKDA} KDA</span>
                    <span className="text-[10px] font-mono text-flash/20 w-12 text-right">{c.avgCSPM} cs/m</span>
                  </div>
                </div>
              ))}
            </div>
          </CyberCard>
        </>
      )}

      {/* ═══ MATCHUPS ═══ */}
      {(t.worstMatchups?.length > 0 || t.bestMatchups?.length > 0) && (
        <>
          <SectionLabel delay={0.36}>MATCHUPS</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            {t.bestMatchups?.length > 0 && (
              <CyberCard accent="jade" delay={0.38}>
                <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-jade/40 mb-2 block">BEST MATCHUPS</span>
                {t.bestMatchups.map((m: any) => (
                  <div key={m.enemy} className="flex items-center gap-2 py-1.5">
                    <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(m.enemy)}.png`} alt="" className="w-6 h-6 rounded-sm border border-jade/10" onError={e => { e.currentTarget.style.display = "none" }} />
                    <span className="text-[11px] font-mono text-flash/50 flex-1 truncate">{m.enemy}</span>
                    <span className="text-[11px] font-mono text-jade/60 tabular-nums font-semibold">{m.winrate}%</span>
                    <span className="text-[9px] font-mono text-flash/18">{m.wins}W {m.games - m.wins}L</span>
                  </div>
                ))}
              </CyberCard>
            )}
            {t.worstMatchups?.length > 0 && (
              <CyberCard accent="red" delay={0.4}>
                <span className="text-[9px] font-mono tracking-[0.2em] uppercase text-red-400/40 mb-2 block">WORST MATCHUPS</span>
                {t.worstMatchups.map((m: any) => (
                  <div key={m.enemy} className="flex items-center gap-2 py-1.5">
                    <img src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(m.enemy)}.png`} alt="" className="w-6 h-6 rounded-sm border border-red-400/10" onError={e => { e.currentTarget.style.display = "none" }} />
                    <span className="text-[11px] font-mono text-flash/50 flex-1 truncate">{m.enemy}</span>
                    <span className="text-[11px] font-mono text-red-400/60 tabular-nums font-semibold">{m.winrate}%</span>
                    <span className="text-[9px] font-mono text-flash/18">{m.wins}W {m.games - m.wins}L</span>
                  </div>
                ))}
              </CyberCard>
            )}
          </div>
        </>
      )}

      {/* ═══ WIN vs LOSS ═══ */}
      {t.winSplitStats && t.lossSplitStats && (
        <>
          <SectionLabel delay={0.42}>WIN vs LOSS BREAKDOWN</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <CyberCard accent="jade" delay={0.44}>
              <span className="text-[9px] font-mono tracking-[0.2em] text-jade/40 uppercase mb-2 block">IN WINS ({t.winSplitStats.games})</span>
              <StatRow label="KDA" value={t.winSplitStats.avgKDA} color="text-jade/70" />
              <StatRow label="K / D / A" value={`${t.winSplitStats.avgKills} / ${t.winSplitStats.avgDeaths} / ${t.winSplitStats.avgAssists}`} />
              <StatRow label="CS/min" value={t.winSplitStats.avgCSPM} />
              <StatRow label="Damage" value={Number(t.winSplitStats.avgDmg).toLocaleString()} />
            </CyberCard>
            <CyberCard accent="red" delay={0.46}>
              <span className="text-[9px] font-mono tracking-[0.2em] text-red-400/40 uppercase mb-2 block">IN LOSSES ({t.lossSplitStats.games})</span>
              <StatRow label="KDA" value={t.lossSplitStats.avgKDA} color="text-red-400/70" />
              <StatRow label="K / D / A" value={`${t.lossSplitStats.avgKills} / ${t.lossSplitStats.avgDeaths} / ${t.lossSplitStats.avgAssists}`} />
              <StatRow label="CS/min" value={t.lossSplitStats.avgCSPM} />
              <StatRow label="Damage" value={Number(t.lossSplitStats.avgDmg).toLocaleString()} />
            </CyberCard>
          </div>
        </>
      )}

      {/* ═══ INSIGHTS ═══ */}
      <SectionLabel delay={0.48}>INSIGHTS</SectionLabel>
      <StrengthsWeaknesses strengths={data.strengths} weaknesses={data.weaknesses} delay={0.5} />
    </motion.div>
  )
}
