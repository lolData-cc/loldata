"use client"

import React, { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { API_BASE_URL } from "@/config"

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type ChampInfo = {
  id: string
  key: string
  name: string
  title: string
  tags: string[]
  image: { full: string }
}

type Matchup = {
  opponent_key: number
  games: number
  winrate: number
  tips?: string | null
  // Mock extended stats
  goldDiff?: number
  csDiff?: number
  killsDiff?: number
  deathsDiff?: number
  firstBloodRate?: number
  soloKillRate?: number
  lanePressure?: number
  teamfightImpact?: number
}

type Badge = "EASY" | "GOOD" | "EVEN" | "HARD" | "VERY HARD" | "IMPOSSIBLE" | "OK"

type Props = {
  champ: ChampInfo
  patch: string
  keyToId: Record<string, string>
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const num = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const fmtPct = (v: number, digits = 2) => `${num(v, 0).toFixed(digits)}%`

const fmtDiff = (v: number) => {
  const val = num(v, 0)
  if (val > 0) return `+${val.toFixed(0)}`
  if (val < 0) return val.toFixed(0)
  return "0"
}

function badgeFromWR(wr: number): Badge {
  if (wr > 54) return "EASY"
  if (wr > 52) return "GOOD"
  if (wr >= 50 && wr <= 50.09) return "EVEN"
  if (wr < 50 && wr > 48) return "HARD"
  if (wr < 48 && wr > 46) return "VERY HARD"
  if (wr < 46) return "IMPOSSIBLE"
  return "OK"
}

function badgeClass(label: Badge): string {
  switch (label) {
    case "EASY":
      return "bg-[#00D992]/20 text-[#00D992] border border-[#00D992]/30"
    case "GOOD":
      return "bg-[#00B377]/20 text-[#00B377] border border-[#00B377]/30"
    case "EVEN":
      return "bg-[#E8EEF2]/10 text-[#E8EEF2]/70 border border-[#E8EEF2]/20"
    case "HARD":
      return "bg-orange-500/20 text-orange-400 border border-orange-500/30"
    case "VERY HARD":
      return "bg-red-500/20 text-red-400 border border-red-500/30"
    case "IMPOSSIBLE":
      return "bg-red-700/30 text-red-300 border border-red-700/40"
    default:
      return "bg-[#E8EEF2]/10 text-[#E8EEF2]/50 border border-[#E8EEF2]/20"
  }
}

function generateMockStats(matchup: Matchup): Matchup {
  // Generate realistic mock stats based on winrate
  const wr = matchup.winrate
  const advantage = (wr - 50) / 10 // normalized advantage
  
  return {
    ...matchup,
    goldDiff: Math.round(advantage * 350 + (Math.random() - 0.5) * 200),
    csDiff: Math.round(advantage * 12 + (Math.random() - 0.5) * 8),
    killsDiff: Number((advantage * 0.8 + (Math.random() - 0.5) * 0.4).toFixed(2)),
    deathsDiff: Number((-advantage * 0.6 + (Math.random() - 0.5) * 0.3).toFixed(2)),
    firstBloodRate: Math.min(100, Math.max(0, 50 + advantage * 15 + (Math.random() - 0.5) * 10)),
    soloKillRate: Math.min(100, Math.max(0, 30 + advantage * 20 + (Math.random() - 0.5) * 15)),
    lanePressure: Math.min(100, Math.max(0, 50 + advantage * 25 + (Math.random() - 0.5) * 10)),
    teamfightImpact: Math.min(100, Math.max(0, 50 + advantage * 20 + (Math.random() - 0.5) * 15)),
  }
}

// ─────────────────────────────────────────────────────────────
// TECH CARD
// ─────────────────────────────────────────────────────────────

function TechCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("bg-liquirice border border-[#1A1A1A]", className)}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 border-b border-[#00D992]/10 pb-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-[#00D992]" />
        <h3 className="text-[#E8EEF2] text-xs font-mono uppercase tracking-[0.25em]">
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="text-[#E8EEF2]/25 text-[10px] font-mono mt-1 ml-3">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// STAT BAR
// ─────────────────────────────────────────────────────────────

function StatBar({
  label,
  value,
  maxValue = 100,
  showPercent = true,
  color = "#00D992",
}: {
  label: string
  value: number
  maxValue?: number
  showPercent?: boolean
  color?: string
}) {
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100))
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[#E8EEF2]/50 text-[10px] font-mono uppercase tracking-wider">
          {label}
        </span>
        <span className="text-[#E8EEF2] text-xs font-mono font-bold tabular-nums">
          {showPercent ? fmtPct(value, 1) : value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            opacity: 0.8,
          }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// DIFF STAT
// ─────────────────────────────────────────────────────────────

function DiffStat({
  label,
  value,
  unit = "",
  inverted = false,
}: {
  label: string
  value: number
  unit?: string
  inverted?: boolean
}) {
  const isPositive = inverted ? value < 0 : value > 0
  const isNegative = inverted ? value > 0 : value < 0
  
  return (
    <div className="flex flex-col items-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10">
      <span className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-wider mb-1">
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-mono font-bold tabular-nums",
          isPositive && "text-[#00D992]",
          isNegative && "text-red-400",
          !isPositive && !isNegative && "text-[#E8EEF2]/50"
        )}
      >
        {fmtDiff(value)}{unit}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OPPONENT CARD
// ─────────────────────────────────────────────────────────────

function OpponentCard({
  matchup,
  champId,
  iconUrl,
  isSelected,
  onClick,
}: {
  matchup: Matchup
  champId: string
  iconUrl: string
  isSelected: boolean
  onClick: () => void
}) {
  const badge = badgeFromWR(matchup.winrate)
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center p-3 transition-all flex-shrink-0 w-[90px]",
        "border hover:border-[#00D992]/30",
        isSelected
          ? "bg-[#00D992]/10 border-[#00D992]/50"
          : "bg-[#00D992]/[0.02] border-[#00D992]/10 hover:bg-[#00D992]/[0.05]"
      )}
    >
      <img
        src={iconUrl || "/placeholder.svg"}
        alt={champId}
        className={cn(
          "w-12 h-12 border grayscale-[20%] mb-2",
          isSelected ? "border-[#00D992]/50" : "border-[#00D992]/20"
        )}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
      <div className="text-[#E8EEF2] text-[10px] font-mono tracking-wide text-center truncate w-full">
        {champId}
      </div>
      <div
        className={cn(
          "text-xs font-mono font-bold tabular-nums mt-1",
          matchup.winrate >= 50 ? "text-[#00D992]" : "text-red-400"
        )}
      >
        {fmtPct(matchup.winrate, 1)}
      </div>
      <span
        className={cn(
          "mt-1 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider",
          badgeClass(badge)
        )}
      >
        {badge}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// SKELETON HELPER
// ─────────────────────────────────────────────────────────────

function SkeletonSectionHeader({ withSubtitle = false }: { withSubtitle?: boolean }) {
  return (
    <div className="mb-4 border-b border-[#00D992]/10 pb-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-[#00D992]/20 animate-pulse" />
        <div className="h-3 w-24 rounded bg-[#E8EEF2]/8 animate-pulse" />
      </div>
      {withSubtitle && (
        <div className="h-2.5 w-32 rounded bg-[#E8EEF2]/5 animate-pulse mt-1 ml-3" />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export function ChampionMatchupsTab({ champ, patch, keyToId }: Props) {
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null)

  const keyToIdSafe = (k: number | string) => keyToId[String(k)] || String(k)
  const opponentIcon = (k: number) =>
    //to fix
    `https://cdn2.loldata.cc/16.1.1/img/champion/${keyToIdSafe(k)}.png`

  useEffect(() => {
    if (!champ) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/champion/matchups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champKey: Number(champ.key) }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load matchups")
        return r.json()
      })
      .then((data: { matchups: Matchup[] }) => {
        if (cancelled) return
        // Add mock stats to each matchup
        const enrichedMatchups = (data.matchups || []).map(generateMockStats)
        setMatchups(enrichedMatchups)
        setSelectedOpponent(
          enrichedMatchups[0] ? String(enrichedMatchups[0].opponent_key) : null
        )
      })
      .catch((e: any) => setError(e?.message ?? "Error loading matchups"))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [champ])

  // Get selected matchup
  const selectedMatchup = matchups.find(
    (m) => String(m.opponent_key) === selectedOpponent
  )
  const selectedChampId = selectedMatchup
    ? keyToIdSafe(selectedMatchup.opponent_key)
    : null

  if (loading) {
    return (
      <div className="w-full space-y-4">
        {/* Opponent Selector skeleton */}
        <TechCard className="pt-5 px-0">
          <div className="px-5">
            <SkeletonSectionHeader withSubtitle />
          </div>
          <div className="flex gap-2 overflow-hidden pb-3 px-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center p-3 flex-shrink-0 w-[90px] border border-[#00D992]/10 bg-[#00D992]/[0.02]"
              >
                <div className="w-12 h-12 border border-[#00D992]/15 bg-[#E8EEF2]/5 animate-pulse mb-2" />
                <div className="h-2.5 w-14 rounded bg-[#E8EEF2]/8 animate-pulse mb-1" />
                <div className="h-3.5 w-10 rounded bg-[#00D992]/10 animate-pulse mb-1" />
                <div className="h-3 w-12 rounded bg-[#E8EEF2]/5 animate-pulse" />
              </div>
            ))}
          </div>
        </TechCard>

        {/* Main Stats Grid skeleton (3 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Winrate skeleton */}
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="text-center space-y-3">
              <div className="mx-auto h-10 w-32 rounded bg-[#00D992]/10 animate-pulse" />
              <div className="flex items-center justify-center gap-4">
                <div className="text-center space-y-1">
                  <div className="mx-auto h-2 w-10 rounded bg-[#E8EEF2]/5 animate-pulse" />
                  <div className="mx-auto h-4 w-14 rounded bg-[#E8EEF2]/8 animate-pulse" />
                </div>
                <div className="h-8 w-px bg-[#00D992]/10" />
                <div className="text-center space-y-1">
                  <div className="mx-auto h-2 w-14 rounded bg-[#E8EEF2]/5 animate-pulse" />
                  <div className="mx-auto h-4 w-16 rounded bg-[#E8EEF2]/8 animate-pulse" />
                </div>
              </div>
            </div>
          </TechCard>

          {/* Laning Phase skeleton (2x2 diff stats) */}
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="grid grid-cols-2 gap-2">
              {["Gold", "CS", "Kills", "Deaths"].map((label) => (
                <div
                  key={label}
                  className="flex flex-col items-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10"
                >
                  <span className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-wider mb-1">
                    {label}
                  </span>
                  <div className="h-6 w-12 rounded bg-[#E8EEF2]/8 animate-pulse" />
                </div>
              ))}
            </div>
          </TechCard>

          {/* Performance skeleton (4 stat bars) */}
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="space-y-3">
              {["First Blood Rate", "Solo Kill Rate", "Lane Pressure", "Teamfight Impact"].map(
                (label) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[#E8EEF2]/50 text-[10px] font-mono uppercase tracking-wider">
                        {label}
                      </span>
                      <div className="h-3 w-10 rounded bg-[#E8EEF2]/8 animate-pulse" />
                    </div>
                    <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00D992]/15 animate-pulse"
                        style={{ width: `${40 + Math.random() * 30}%` }}
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          </TechCard>
        </div>

        {/* Matchup Tips skeleton */}
        <TechCard className="p-5">
          <SkeletonSectionHeader withSubtitle />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2 px-3 bg-[#00D992]/[0.02] border-l-2 border-[#00D992]/20"
              >
                <div className="h-3 w-4 rounded bg-[#00D992]/15 animate-pulse mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-full rounded bg-[#E8EEF2]/6 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-[#E8EEF2]/4 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </TechCard>

        {/* Quick Summary skeleton (4 cols) */}
        <TechCard className="p-5">
          <SkeletonSectionHeader />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {["Lane Phase", "Teamfights", "Kill Threat", "Overall"].map((label) => (
              <div
                key={label}
                className="text-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10"
              >
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-wider mb-1">
                  {label}
                </div>
                <div className="mx-auto h-5 w-16 rounded bg-[#00D992]/10 animate-pulse" />
              </div>
            ))}
          </div>
        </TechCard>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-3">
        <TechCard className="p-6">
          <div className="text-red-400 font-mono text-sm">Error: {error}</div>
        </TechCard>
      </div>
    )
  }

  if (matchups.length === 0) {
    return (
      <div className="w-full space-y-3">
        <TechCard className="p-6">
          <div className="text-[#E8EEF2]/50 font-mono text-sm">
            NO MATCHUP DATA AVAILABLE
          </div>
        </TechCard>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Custom scrollbar styles */}
      <style>{`
        .green-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .green-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
          border-radius: 3px;
        }
        .green-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 217, 146, 0.3);
          border-radius: 3px;
        }
        .green-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 217, 146, 0.5);
        }
      `}</style>

      {/* Opponent Selector */}
      <TechCard className="pt-5 px-0">
        <div className="px-5">
          <SectionHeader
            title="Select Opponent"
            subtitle={`${matchups.length} matchups analyzed`}
          />
        </div>
        <div
          className="green-scrollbar flex gap-2 overflow-x-auto pb-3 px-5"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0, 217, 146, 0.3) #0a0a0a",
          }}
        >
          {matchups.map((m) => (
            <OpponentCard
              key={m.opponent_key}
              matchup={m}
              champId={keyToIdSafe(m.opponent_key)}
              iconUrl={opponentIcon(m.opponent_key)}
              isSelected={String(m.opponent_key) === selectedOpponent}
              onClick={() => setSelectedOpponent(String(m.opponent_key))}
            />
          ))}
        </div>
      </TechCard>

      {selectedMatchup && selectedChampId && (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Winrate Overview */}
            <TechCard className="p-5">
              <SectionHeader title="Winrate" subtitle={`vs ${selectedChampId}`} />
              <div className="text-center">
                <div
                  className={cn(
                    "text-4xl font-mono font-bold tabular-nums",
                    selectedMatchup.winrate >= 50 ? "text-[#00D992]" : "text-red-400"
                  )}
                >
                  {fmtPct(selectedMatchup.winrate, 2)}
                </div>
                <div className="mt-2 flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-[0.2em]">
                      Games
                    </div>
                    <div className="text-[#E8EEF2] text-sm font-mono font-bold tabular-nums">
                      {selectedMatchup.games.toLocaleString()}
                    </div>
                  </div>
                  <div className="h-8 w-px bg-[#00D992]/10" />
                  <div className="text-center">
                    <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-[0.2em]">
                      Difficulty
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-mono uppercase",
                        badgeClass(badgeFromWR(selectedMatchup.winrate))
                      )}
                    >
                      {badgeFromWR(selectedMatchup.winrate)}
                    </span>
                  </div>
                </div>
              </div>
            </TechCard>

            {/* Laning Differential */}
            <TechCard className="p-5">
              <SectionHeader title="Laning Phase" subtitle="Avg differentials @15" />
              <div className="grid grid-cols-2 gap-2">
                <DiffStat label="Gold" value={selectedMatchup.goldDiff || 0} />
                <DiffStat label="CS" value={selectedMatchup.csDiff || 0} />
                <DiffStat label="Kills" value={selectedMatchup.killsDiff || 0} />
                <DiffStat
                  label="Deaths"
                  value={selectedMatchup.deathsDiff || 0}
                  inverted
                />
              </div>
            </TechCard>

            {/* Performance Metrics */}
            <TechCard className="p-5">
              <SectionHeader title="Performance" subtitle="Key metrics" />
              <div className="space-y-3">
                <StatBar
                  label="First Blood Rate"
                  value={selectedMatchup.firstBloodRate || 0}
                  color="#00D992"
                />
                <StatBar
                  label="Solo Kill Rate"
                  value={selectedMatchup.soloKillRate || 0}
                  color="#00B377"
                />
                <StatBar
                  label="Lane Pressure"
                  value={selectedMatchup.lanePressure || 0}
                  color="#00D992"
                />
                <StatBar
                  label="Teamfight Impact"
                  value={selectedMatchup.teamfightImpact || 0}
                  color="#00B377"
                />
              </div>
            </TechCard>
          </div>

          {/* Tips Section */}
          <TechCard className="p-5">
            <SectionHeader
              title="Matchup Tips"
              subtitle={`How to play ${champ.name} vs ${selectedChampId}`}
            />
            {selectedMatchup.tips ? (
              <ul className="space-y-2">
                {selectedMatchup.tips.split("\n").map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 py-2 px-3 bg-[#00D992]/[0.02] border-l-2 border-[#00D992]/20"
                  >
                    <span className="text-[#00D992] text-xs font-mono font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[#E8EEF2]/80 text-sm font-mono leading-relaxed">
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4 px-3 bg-[#00D992]/[0.02] border-l-2 border-[#00D992]/20">
                <span className="text-[#E8EEF2]/40 text-sm font-mono">
                  No specific tips available for this matchup yet.
                </span>
              </div>
            )}
          </TechCard>

          {/* Quick Summary */}
          <TechCard className="p-5">
            <SectionHeader title="Quick Summary" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10">
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-wider mb-1">
                  Lane Phase
                </div>
                <div
                  className={cn(
                    "text-lg font-mono font-bold",
                    (selectedMatchup.lanePressure || 50) >= 50
                      ? "text-[#00D992]"
                      : "text-red-400"
                  )}
                >
                  {(selectedMatchup.lanePressure || 50) >= 55
                    ? "STRONG"
                    : (selectedMatchup.lanePressure || 50) >= 45
                    ? "EVEN"
                    : "WEAK"}
                </div>
              </div>
              <div className="text-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10">
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-wider mb-1">
                  Teamfights
                </div>
                <div
                  className={cn(
                    "text-lg font-mono font-bold",
                    (selectedMatchup.teamfightImpact || 50) >= 50
                      ? "text-[#00D992]"
                      : "text-red-400"
                  )}
                >
                  {(selectedMatchup.teamfightImpact || 50) >= 55
                    ? "STRONG"
                    : (selectedMatchup.teamfightImpact || 50) >= 45
                    ? "EVEN"
                    : "WEAK"}
                </div>
              </div>
              <div className="text-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10">
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-wider mb-1">
                  Kill Threat
                </div>
                <div
                  className={cn(
                    "text-lg font-mono font-bold",
                    (selectedMatchup.soloKillRate || 30) >= 35
                      ? "text-[#00D992]"
                      : "text-[#E8EEF2]/50"
                  )}
                >
                  {(selectedMatchup.soloKillRate || 30) >= 40
                    ? "HIGH"
                    : (selectedMatchup.soloKillRate || 30) >= 25
                    ? "MEDIUM"
                    : "LOW"}
                </div>
              </div>
              <div className="text-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10">
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-wider mb-1">
                  Overall
                </div>
                <span
                  className={cn(
                    "text-lg font-mono font-bold",
                    badgeFromWR(selectedMatchup.winrate) === "EASY" ||
                      badgeFromWR(selectedMatchup.winrate) === "GOOD"
                      ? "text-[#00D992]"
                      : badgeFromWR(selectedMatchup.winrate) === "EVEN" ||
                        badgeFromWR(selectedMatchup.winrate) === "OK"
                      ? "text-[#E8EEF2]/70"
                      : "text-red-400"
                  )}
                >
                  {badgeFromWR(selectedMatchup.winrate)}
                </span>
              </div>
            </div>
          </TechCard>
        </>
      )}
    </div>
  )
}
