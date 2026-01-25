"use client"

import React, { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { API_BASE_URL } from "@/config"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"

import {
    RoleTopIcon,
    RoleJungleIcon,
    RoleMidIcon,
    RoleAdcIcon,
    RoleSupportIcon,
} from "@/components/ui/roleicons"

// ✅ highlight component
import { BorderBeam } from "./ui/border-beam"

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

type MiniRow = {
    championKey: number
    games: number
    winrate: number
    winrateShrunk?: number
}

type StatsPayload = {
    core:
    | {
        winrate: number | null
        pickrate: number | null
        banrate: number | null
        gamesAnalyzed: number | null
        avgKDA:
        | {
            kills: number | null
            deaths: number | null
            assists: number | null
        }
        | null
        avgCS: number | null
        avgGold: number | null
        avgDamage: number | null
    }
    | null
    bestMatchups: MiniRow[] | null
    worstMatchups: MiniRow[] | null
    bestSynergies: MiniRow[] | null
    worstCounters: MiniRow[] | null
    gamePhaseWinrates: { phase: string; time: string; winrate: number | null }[] | null
    objectiveWinrates?: { firstDragon?: number | null; firstBaron?: number | null } | null
    meta?: { patch: string | null; queueId: number | null; lastUpdatedUtc: string; role?: string | null } | null
}

type RoleKey = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "SUPPORT"

// ─────────────────────────────────────────────────────────────
// HELPERS (anti-crash)
// ─────────────────────────────────────────────────────────────

const num = (v: any, fallback = 0) => {
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
}

const pct = (v: any, digits = 2) => `${num(v, 0).toFixed(digits)}%`

async function fetchStatsCoreOnly(args: {
    championId: number
    role: RoleKey
    patch: string | null
    queueId: number
}): Promise<number> {
    const r = await fetch(`${API_BASE_URL}/api/champion/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            championId: args.championId,
            patch: args.patch,
            queueId: args.queueId,
            role: args.role,
        }),
    })

    if (!r.ok) return 0
    const json = (await r.json()) as StatsPayload
    return num(json?.core?.gamesAnalyzed, 0)
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
    return <div className={cn("bg-liquirice border border-[#1A1A1A]", className)}>{children}</div>
}

// ─────────────────────────────────────────────────────────────
// ROLE FILTER BAR (bigger icons + optional BorderBeam)
// ─────────────────────────────────────────────────────────────

function RoleFilterBar({
    value,
    onChange,
    suggestedRole,
}: {
    value: RoleKey | null
    onChange: (v: RoleKey | null) => void
    suggestedRole?: RoleKey | null
}) {
    const roles: { key: RoleKey; label: string; Icon: React.FC<{ className?: string }> }[] = [
        { key: "TOP", label: "Top", Icon: RoleTopIcon },
        { key: "JUNGLE", label: "Jungle", Icon: RoleJungleIcon },
        { key: "MIDDLE", label: "Mid", Icon: RoleMidIcon },
        { key: "BOTTOM", label: "ADC", Icon: RoleAdcIcon },
        { key: "SUPPORT", label: "Support", Icon: RoleSupportIcon },
    ]

    return (
        <TechCard className="px-3 py-2">
            <div className="flex items-center justify-between">
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-[0.2em]">
                    Role filter
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className={cn(
                            "h-10 px-3 rounded-md border border-[#00D992]/15 bg-[#00D992]/[0.02] hover:border-[#00D992]/40 transition-colors",
                            "text-[10px] font-mono uppercase tracking-wider",
                            value === null ? "text-[#00D992] border-[#00D992]/50" : "text-[#E8EEF2]/50"
                        )}
                        title="All roles"
                        aria-pressed={value === null}
                    >
                        All
                    </button>

                    {roles.map((r) => {
                        const active = value === r.key
                        const beam = value === null && suggestedRole === r.key

                        return (
                            <div
                                key={r.key}
                                className={cn(
                                    "relative h-10 w-10 rounded-md overflow-hidden",
                                    // ✅ il border sta QUI (come la card del dialog)
                                    active ? "border border-[#00D992]/70" : "border border-[#00D992]/15",
                                    "bg-[#00D992]/[0.02] hover:border-[#00D992]/40 transition-colors"
                                )}
                                title={r.label}
                            >
                                {/* ✅ beam nel wrapper (come il tuo esempio funzionante) */}
                                {beam && !active && <BorderBeam duration={8} size={80} />}

                                <button
                                    type="button"
                                    onClick={() => onChange(r.key)}
                                    aria-pressed={active}
                                    className={cn(
                                        "relative z-10 h-full w-full flex items-center justify-center",
                                        // ✅ importante: niente bg pieno sopra al beam
                                        "bg-transparent"
                                    )}
                                >
                                    <r.Icon
                                        className={cn(
                                            "h-6 w-6",
                                            active ? "text-[#00D992]" : "text-[#E8EEF2]/55"
                                        )}
                                    />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </TechCard>
    )
}


// ─────────────────────────────────────────────────────────────
// MATCHUP ROW (safe)
// ─────────────────────────────────────────────────────────────

function MatchupRow({
    champion,
    winrate,
    games,
    image,
    variant = "default",
}: {
    champion: string
    winrate: number
    games: number
    image: string
    variant?: "default" | "low"
}) {
    return (
        <div className="flex items-center gap-3 py-2 px-3 bg-[#00D992]/[0.02] border-l-2 border-[#00D992]/20 hover:border-[#00D992]/50 transition-colors">
            <img
                src={image || "/placeholder.svg"}
                alt={champion}
                className="w-8 h-8 border border-[#00D992]/30 grayscale-[20%]"
                onError={(e) => {
                    e.currentTarget.style.display = "none"
                }}
            />
            <div className="flex-1 min-w-0">
                <div className="text-[#E8EEF2] text-sm font-mono tracking-wide truncate">{champion}</div>
                <div className="text-[#E8EEF2]/25 text-[10px] font-mono">{num(games).toLocaleString()} GAMES</div>
            </div>
            <div
                className={cn(
                    "text-sm font-mono font-bold tabular-nums",
                    variant === "low" ? "text-[#00875A]" : "text-[#00D992]"
                )}
            >
                {pct(winrate, 1)}
            </div>
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
                <h3 className="text-[#E8EEF2] text-xs font-mono uppercase tracking-[0.25em]">{title}</h3>
            </div>
            {subtitle && <p className="text-[#E8EEF2]/25 text-[10px] font-mono mt-1 ml-3">{subtitle}</p>}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

export function ChampionStats({
    champ,
    patch,
    keyToId,
}: {
    champ: ChampInfo
    patch: string
    keyToId: Record<string, string>
}) {
    const [stats, setStats] = useState<StatsPayload | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [role, setRole] = useState<RoleKey | null>(null)

    // ✅ NEW: role with most games (computed when opening the tab)
    const [suggestedRole, setSuggestedRole] = useState<RoleKey | null>(null)

    const champIdFromKey = (k: number) => keyToId[String(k)] || String(k)
    const champIconFromKey = (k: number) =>
        `https://cdn2.loldata.cc/16.1.1/img/champion/${champIdFromKey(k)}.png`

    // ✅ compute most-played role (once per champion)
    useEffect(() => {
        let cancelled = false

        const roles: RoleKey[] = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "SUPPORT"]
            ; (async () => {
                try {
                    const championId = Number(champ.key)
                    const queueId = 420

                    const results = await Promise.all(
                        roles.map(async (r) => {
                            const g = await fetchStatsCoreOnly({ championId, role: r, patch: null, queueId })
                            return { role: r, games: g }
                        })
                    )

                    if (cancelled) return
                    const best = results.reduce(
                        (acc, cur) => (cur.games > acc.games ? cur : acc),
                        { role: roles[0], games: -1 }
                    )

                    setSuggestedRole(best.games > 0 ? best.role : null)
                } catch {
                    if (!cancelled) setSuggestedRole(null)
                }
            })()

        return () => {
            cancelled = true
        }
    }, [champ.key])

    // main stats fetch (refetch when role changes)
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)

        fetch(`${API_BASE_URL}/api/champion/stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                championId: Number(champ.key),
                patch: null,
                queueId: 420,
                role: role,
            }),
        })
            .then((r) => {
                if (!r.ok) throw new Error("Failed to load champion stats")
                return r.json()
            })
            .then((json: StatsPayload) => {
                if (!cancelled) setStats(json)
            })
            .catch((e: any) => {
                if (!cancelled) setError(e?.message ?? "Error")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [champ.key, role])

    if (loading) {
        return (
            <div className="w-full space-y-3">
                <RoleFilterBar value={role} onChange={setRole} suggestedRole={suggestedRole} />
                <div className="px-6 text-neutral-300">LOADING STATS…</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full space-y-3">
                <RoleFilterBar value={role} onChange={setRole} suggestedRole={suggestedRole} />
                <div className="px-6 text-red-400">Error: {error}</div>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="w-full space-y-3">
                <RoleFilterBar value={role} onChange={setRole} suggestedRole={suggestedRole} />
                <div className="px-6 text-neutral-400">NO STATS AVAILABLE.</div>
            </div>
        )
    }

    const core = stats.core ?? {
        winrate: 0,
        pickrate: 0,
        banrate: null,
        gamesAnalyzed: 0,
        avgKDA: { kills: 0, deaths: 0, assists: 0 },
        avgCS: null,
        avgGold: 0,
        avgDamage: 0,
    }

    const gamesAnalyzed = num(core.gamesAnalyzed, 0)
    const noGames = gamesAnalyzed === 0

    if (noGames) {
        return (
            <div className="w-full space-y-3">
                <RoleFilterBar value={role} onChange={setRole} suggestedRole={suggestedRole} />
                <TechCard className="p-6">
                    <div className="text-[#E8EEF2] font-mono text-sm">NO GAMES FOR THIS FILTER.</div>
                    <div className="text-[#E8EEF2]/30 font-mono text-[10px] mt-2">
                        Try another role or remove the filter.
                    </div>
                </TechCard>
            </div>
        )
    }

    const avgKDA = core.avgKDA ?? { kills: 0, deaths: 0, assists: 0 }
    const k = num(avgKDA.kills, 0)
    const d = num(avgKDA.deaths, 0)
    const a = num(avgKDA.assists, 0)

    const coreStats = {
        winrate: num(core.winrate, 0),
        pickrate: num(core.pickrate, 0),
        gamesAnalyzed,
        avgKDA: { kills: k, deaths: d, assists: a },
        avgCS: core.avgCS,
        avgGold: num(core.avgGold, 0),
        avgDamage: num(core.avgDamage, 0),
    }

    const bestMatchups = (stats.bestMatchups ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }))

    const worstMatchups = (stats.worstMatchups ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }))

    const bestSynergies = (stats.bestSynergies ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }))

    const worstCounters = (stats.worstCounters ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }))

    const objectiveWinrates = {
        riftHerald: 0,
        voidgrubs: 0,
        baron: num(stats.objectiveWinrates?.firstBaron, 0),
        elderDragon: 0,
    }

    const gamePhaseWinrates = (stats.gamePhaseWinrates ?? []).map((p) => ({
        phase: p.phase,
        time: p.time,
        winrate: num(p.winrate, 0),
    }))

    const tierRankings = [
        { tier: "Iron-Bronze", position: "A" },
        { tier: "Silver-Gold", position: "A" },
        { tier: "Platinum", position: "A" },
        { tier: "Diamond+", position: "A" },
    ]

    const dragonWinrates = [
        { name: "Infernal", winrate: 0 },
        { name: "Mountain", winrate: 0 },
        { name: "Ocean", winrate: 0 },
        { name: "Cloud", winrate: 0 },
        { name: "Hextech", winrate: 0 },
        { name: "Chemtech", winrate: 0 },
    ]

    return (
        <div className="w-full space-y-3">
            <RoleFilterBar value={role} onChange={setRole} suggestedRole={suggestedRole} />

            {/* WINRATE / KDA / ECONOMY */}
            <div className="grid grid-cols-3 gap-3">
                <TechCard className="p-5">
                    <SectionHeader title="Winrate" subtitle={role ? `Filtered: ${role}` : undefined} />
                    <div className="text-center">
                        <div className="text-[#00D992] text-3xl font-mono font-bold tabular-nums">
                            {pct(coreStats.winrate, 2)}
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-6">
                            <div className="text-center">
                                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-[0.2em]">
                                    Sample
                                </div>
                                <div className="text-[#E8EEF2] text-sm font-mono font-bold tabular-nums">
                                    {coreStats.gamesAnalyzed.toLocaleString()}
                                </div>
                            </div>

                            <div className="h-8 w-px bg-[#00D992]/10" />

                            <div className="text-center">
                                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-[0.2em]">
                                    Pickrate
                                </div>
                                <div className="text-[#E8EEF2] text-sm font-mono font-bold tabular-nums">
                                    {pct(coreStats.pickrate, 2)}
                                </div>
                            </div>
                        </div>
                    </div>
                </TechCard>

                <TechCard className="p-5">
                    <SectionHeader title="Avg KDA" />
                    <div className="flex items-center justify-center gap-3 text-xl font-mono">
                        <span className="text-[#00D992] font-bold">{k.toFixed(2)}</span>
                        <span className="text-[#E8EEF2]/15">/</span>
                        <span className="text-[#E8EEF2]/50 font-bold">{d.toFixed(2)}</span>
                        <span className="text-[#E8EEF2]/15">/</span>
                        <span className="text-[#00B377] font-bold">{a.toFixed(2)}</span>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[#E8EEF2]/30 text-[10px] font-mono tracking-wider">
                            RATIO: {((k + a) / Math.max(1, d)).toFixed(2)}
                        </span>
                    </div>
                </TechCard>

                <TechCard className="p-5">
                    <SectionHeader title="Economy" />
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[#E8EEF2]/30 text-xs font-mono">CS/GAME</span>
                            <span className="text-[#E8EEF2] font-mono font-bold tabular-nums">
                                {core.avgCS == null ? "N/A" : num(core.avgCS).toFixed(1)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#E8EEF2]/30 text-xs font-mono">GOLD/GAME</span>
                            <span className="text-[#00D992] font-mono font-bold tabular-nums">
                                {coreStats.avgGold.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </TechCard>
            </div>

            {/* MATCHUPS */}
            <div className="grid grid-cols-2 gap-3">
                <TechCard className="p-5">
                    <SectionHeader title="Best Matchups" subtitle="Highest WR against" />
                    <div className="space-y-1">
                        {bestMatchups.map((m) => (
                            <MatchupRow key={m.champion} {...m} variant="default" />
                        ))}
                    </div>
                </TechCard>

                <TechCard className="p-5">
                    <SectionHeader title="Worst Matchups" subtitle="Lowest WR against" />
                    <div className="space-y-1">
                        {worstMatchups.map((m) => (
                            <MatchupRow key={m.champion} {...m} variant="low" />
                        ))}
                    </div>
                </TechCard>
            </div>

            {/* SYNERGIES & COUNTERS */}
            <div className="grid grid-cols-2 gap-3">
                <TechCard className="p-5">
                    <SectionHeader title="Best Synergies" subtitle="Optimal duo partners" />
                    <div className="space-y-1">
                        {bestSynergies.map((m) => (
                            <MatchupRow key={m.champion} {...m} variant="default" />
                        ))}
                    </div>
                </TechCard>

                <TechCard className="p-5">
                    <SectionHeader title="Worst Counters" subtitle="Highest threat enemies" />
                    <div className="space-y-1">
                        {worstCounters.map((m) => (
                            <MatchupRow key={m.champion} {...m} variant="low" />
                        ))}
                    </div>
                </TechCard>
            </div>

            {/* DRAGONS */}
            <TechCard className="p-5">
                <SectionHeader title="Dragon Soul Analysis" subtitle="Winrate when securing each soul type" />
                <div className="grid grid-cols-6 gap-2">
                    {dragonWinrates.map((d) => (
                        <div
                            key={d.name}
                            className="text-center p-3 border border-[#00D992]/10 bg-[#00D992]/[0.02]"
                        >
                            <div className="text-[#E8EEF2]/40 text-[8px] font-mono uppercase tracking-wider mb-2">
                                {d.name}
                            </div>
                            <div className="text-[#00D992] text-lg font-mono font-bold tabular-nums">
                                {pct(d.winrate, 0)}
                            </div>
                        </div>
                    ))}
                </div>
            </TechCard>

            {/* OBJECTIVES */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Rift Herald", value: objectiveWinrates.riftHerald },
                    { label: "Voidgrubs", value: objectiveWinrates.voidgrubs },
                    { label: "Baron Nashor", value: objectiveWinrates.baron },
                    { label: "Elder Dragon", value: objectiveWinrates.elderDragon },
                ].map((obj) => (
                    <TechCard key={obj.label} className="p-4 text-center">
                        <div className="text-[#E8EEF2]/30 text-[8px] font-mono uppercase tracking-wider">
                            {obj.label}
                        </div>
                        <div className="text-[#00D992] text-xl font-mono font-bold mt-1 tabular-nums">
                            {pct(obj.value, 0)}
                        </div>
                        <div className="text-[#E8EEF2]/15 text-[8px] font-mono tracking-wider">WR ON SECURE</div>
                    </TechCard>
                ))}
            </div>

            {/* PHASE + TIER */}
            <div className="grid grid-cols-2 gap-3">
                <TechCard className="p-5">
                    <SectionHeader title="Phase Analysis" subtitle="Performance by game length" />
                    <div className="h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gamePhaseWinrates} layout="vertical">
                                <XAxis type="number" domain={[40, 70]} hide />
                                <YAxis
                                    type="category"
                                    dataKey="phase"
                                    tick={{ fill: "#E8EEF2", fontSize: 9, fontFamily: "monospace" }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                />
                                <Bar dataKey="winrate" radius={0} fill="#00D992" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between mt-2 px-1">
                        {gamePhaseWinrates.map((p) => (
                            <div key={p.phase} className="text-center">
                                <div className="text-[#00D992] text-xs font-mono font-bold tabular-nums">
                                    {pct(p.winrate, 0)}
                                </div>
                                <div className="text-[#E8EEF2]/20 text-[8px] font-mono">{p.time}</div>
                            </div>
                        ))}
                    </div>
                </TechCard>

                <TechCard className="p-5">
                    <SectionHeader title="Meta Position" subtitle="Tier by rank bracket" />
                    <div className="grid grid-cols-4 gap-2 mt-4">
                        {tierRankings.map((t) => (
                            <div
                                key={t.tier}
                                className="text-center p-3 border border-[#00D992]/10 bg-[#00D992]/[0.02]"
                            >
                                <div className={cn("text-2xl font-bold font-mono mb-1", "text-[#00B377]")}>
                                    {t.position}
                                </div>
                                <div className="text-[#E8EEF2]/30 text-[8px] font-mono uppercase tracking-wider">
                                    {t.tier}
                                </div>
                            </div>
                        ))}
                    </div>
                </TechCard>
            </div>
        </div>
    )
}
