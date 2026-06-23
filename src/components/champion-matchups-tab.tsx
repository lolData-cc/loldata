"use client"

// Champion Matchups — a real "matchup planner".
//
// The champion's real lane matchups (the most-played opponents, from the box's
// mv_lane_matchups via /api/champion/stats `commonMatchups`) form a 3D
// constellation you orbit and click; a flat grid stands in when WebGL is
// unavailable. Picking an opponent lays out, in one clean column:
//   1. the VERDICT — real win rate / games / difficulty badge + curated lane notes
//   2. the GAME PLAN vs that opponent — the best runes (/api/champion/runes with
//      an opponentId) and the optimal build path (/api/explorer/buildpath with an
//      enemy constraint). Same engines the Explorer uses, scoped to the matchup.

import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
// Matchups + runes read from the match-data box (api2); the build path uses the
// Explorer engine (EXPLORER_API_BASE_URL = api2) via runBuildPath inside BuildPathViz.
import { BOX_API_BASE_URL as API_BASE_URL, cdnBaseUrl } from "@/config"
import { MatchupOrbit, supportsWebGL, type MatchupNode } from "./matchup-orbit"
import { BuildPathViz } from "./explorer/BuildPathViz"
import type { ExplorerGraph } from "./explorer/types"
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes"

type ChampInfo = {
  id: string
  key: string
  name: string
  title: string
  tags: string[]
  image: { full: string }
}

type Props = {
  champ: ChampInfo
  patch: string
  keyToId: Record<string, string>
}

// ── win-rate semantics ──────────────────────────────────────────────
type Badge = "FAVOURED" | "GOOD" | "EVEN" | "TRICKY" | "HARD" | "NIGHTMARE"

function badgeFromWR(wr: number): Badge {
  if (wr >= 54) return "FAVOURED"
  if (wr >= 51.5) return "GOOD"
  if (wr > 48.5) return "EVEN"
  if (wr > 46) return "TRICKY"
  if (wr > 43) return "HARD"
  return "NIGHTMARE"
}

function badgeClass(b: Badge): string {
  switch (b) {
    case "FAVOURED": return "bg-jade/15 text-jade ring-1 ring-inset ring-jade/30"
    case "GOOD": return "bg-jade/10 text-jade/85 ring-1 ring-inset ring-jade/20"
    case "EVEN": return "bg-flash/10 text-flash/70 ring-1 ring-inset ring-flash/15"
    case "TRICKY": return "bg-[#FFB615]/12 text-[#FFB615] ring-1 ring-inset ring-[#FFB615]/25"
    case "HARD": return "bg-[#ff6286]/12 text-[#ff6286] ring-1 ring-inset ring-[#ff6286]/25"
    case "NIGHTMARE": return "bg-[#ff6286]/20 text-[#ff6286] ring-1 ring-inset ring-[#ff6286]/40"
  }
}

const wrText = (wr: number) => (wr >= 51 ? "text-jade" : wr < 49 ? "text-[#ff6286]" : "text-flash/75")
const champIcon = (id: string) => `${cdnBaseUrl()}/img/champion/${id}.png`

// ── section header (homepage eyebrow) ───────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-1.5 h-1.5 rounded-full bg-jade shrink-0" style={{ boxShadow: "0 0 8px #00d992" }} />
      <span className="font-chakrapetch text-[11px] font-bold tracking-[0.28em] uppercase text-jade/80">{children}</span>
    </div>
  )
}

const GLASS: React.CSSProperties = {
  boxShadow: "0 40px 90px -50px rgba(0,217,146,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
}

// shared panel chrome (matches the Explorer's BuildPathViz shell, so the runes +
// build-path cards in the game-plan row read as one coherent set)
const PANEL = "rounded-[14px] border border-white/[0.08] bg-[rgba(6,12,14,0.55)]"

// Flat grid — used when WebGL is unavailable AND as the orbit's error-boundary
// fallback (a thrown WebGL texture error must never take down the whole tab).
function Grid2D({ nodes, selectedKey, onSelect }: { nodes: MatchupNode[]; selectedKey: string | null; onSelect: (k: string) => void }) {
  return (
    <div className="relative p-4 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[440px] overflow-y-auto cyber-scrollbar">
      {nodes.map(n => {
        const sel = n.key === selectedKey
        const c = n.winrate >= 51 ? "#00d992" : n.winrate < 49 ? "#ff6286" : "#7c8b92"
        return (
          <button key={n.key} onClick={() => onSelect(n.key)}
            className={cn("group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors", sel ? "bg-jade/[0.06] ring-1 ring-jade/40" : "hover:bg-flash/[0.04] ring-1 ring-inset ring-transparent")}>
            <img src={n.iconUrl} alt={n.name} className="w-12 h-12 rounded-md object-cover" style={{ boxShadow: `0 0 0 2px ${c}66` }} />
            <span className="font-jetbrains text-[9px] text-flash/55 truncate max-w-full">{n.name}</span>
            <span className="font-chakrapetch text-[12px] font-bold tabular-nums" style={{ color: c }}>{n.winrate.toFixed(1)}%</span>
          </button>
        )
      })}
    </div>
  )
}

class OrbitBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: any) { console.warn("[matchup-orbit] fell back to 2D:", err?.message ?? err) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

export function ChampionMatchupsTab({ champ, keyToId }: Props) {
  const navigate = useNavigate()
  const [nodes, setNodes] = useState<MatchupNode[]>([])
  const [tips, setTips] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const webgl = useMemo(() => supportsWebGL(), [])

  const subjectIcon = champIcon(champ.id)

  useEffect(() => {
    if (!champ?.key) return
    let cancelled = false
    setLoading(true); setError(null); setSelectedKey(null); setNodes([])
    const cdnB = cdnBaseUrl()
    const key = Number(champ.key)

    Promise.all([
      fetch(`${API_BASE_URL}/api/champion/stats`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ championId: key }),
      }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_BASE_URL}/api/champion/matchups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ champKey: key }),
      }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${cdnB}/data/en_US/champion.json`).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([stats, mu, champJson]) => {
      if (cancelled) return

      const keyToName: Record<string, string> = {}
      if (champJson?.data) for (const ch of Object.values<any>(champJson.data)) keyToName[String(ch.key)] = ch.name

      const tipMap: Record<string, string> = {}
      for (const m of (mu?.matchups ?? [])) if (m?.tips) tipMap[String(m.opponent_key)] = m.tips
      setTips(tipMap)

      const seen = new Set<string>()
      const list: MatchupNode[] = []
      const push = (rawKey: any, winrate: any, games: any) => {
        const k = String(rawKey ?? "")
        if (!k || k === "undefined" || k === "null" || seen.has(k)) return
        seen.add(k)
        const id = keyToId[k] || k
        list.push({ key: k, id, name: keyToName[k] || id, winrate: Number(winrate) || 0, games: Number(games) || 0, iconUrl: `${cdnB}/img/champion/${id}.png` })
      }
      // REAL aggregated lane matchups — prefer the most-played set so the picker shows
      // EVERY champ you regularly face, not just the win-rate extremes (which hid common
      // mid-win-rate matchups like Rengar). Fall back to best+worst for older snapshots,
      // then to the curated list only if the box returned nothing.
      for (const m of (stats?.commonMatchups ?? [])) push(m.championKey ?? m.opponent_key, m.winrate, m.games)
      if (list.length === 0) {
        for (const m of (stats?.bestMatchups ?? [])) push(m.championKey ?? m.opponent_key, m.winrate, m.games)
        for (const m of (stats?.worstMatchups ?? [])) push(m.championKey ?? m.opponent_key, m.winrate, m.games)
      }
      if (list.length === 0) for (const m of (mu?.matchups ?? [])) push(m.opponent_key, m.winrate, m.games)

      list.sort((a, b) => b.winrate - a.winrate)
      setNodes(list)
      setSelectedKey(list[0]?.key ?? null)
      setLoading(false)
      if (list.length === 0) setError("No matchup data for this champion yet.")
    }).catch(() => { if (!cancelled) { setError("Failed to load matchups."); setLoading(false) } })

    return () => { cancelled = true }
  }, [champ?.key, keyToId])

  const selected = nodes.find(n => n.key === selectedKey) || null
  const best = nodes.slice(0, 3)
  const worst = [...nodes].slice(-3).reverse()

  // The matchup the build-path engine should solve: this champ, with the picked
  // opponent on the enemy team. Roles omitted on purpose — the enemy-champion
  // constraint already pins the lane matchup (verified ~identical cohort with/without
  // role), and this tab doesn't carry the subject's role. Memoised so BuildPathViz
  // only re-queries when the pick actually changes.
  const matchupGraph = useMemo<ExplorerGraph | null>(() => {
    if (!selected) return null
    return {
      subject: { champion: champ.id },
      constraints: [{ type: "enemy", champion: selected.id }],
      filters: { scope: "current_patch", queues: [420, 440] },
      output: { kind: "stats" },
    }
  }, [champ.id, selected?.id])

  if (loading) {
    return (
      <div className="grid place-items-center h-[440px] rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.55)]" style={GLASS}>
        <span className="font-jetbrains text-[11px] uppercase tracking-[0.2em] text-flash/40 animate-pulse">Mapping matchups…</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="grid place-items-center h-[260px] rounded-2xl border border-flash/[0.06] bg-[rgba(6,12,14,0.55)]">
        <span className="font-jetbrains text-[12px] text-flash/40">{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── row 1: pick (orbit) + verdict ────────────────────────── */}
      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4 items-stretch">
        {/* the tree floats in the void — no box */}
        <div className="relative min-h-[440px]">
          {webgl ? (
            <OrbitBoundary fallback={<Grid2D nodes={nodes} selectedKey={selectedKey} onSelect={setSelectedKey} />}>
              <MatchupOrbit
                subjectIconUrl={subjectIcon}
                nodes={nodes}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                className="absolute inset-0"
              />
            </OrbitBoundary>
          ) : (
            <Grid2D nodes={nodes} selectedKey={selectedKey} onSelect={setSelectedKey} />
          )}

          {/* quick best/worst rail along the bottom */}
          <div className="absolute inset-x-0 bottom-0 z-[2] flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-t from-[#040A0C] via-[#040A0C]/85 to-transparent pointer-events-none">
            <div className="flex items-center gap-1.5 pointer-events-auto">
              <span className="font-jetbrains text-[9px] uppercase tracking-[0.16em] text-jade/60 mr-1">Best</span>
              {best.map(n => (
                <button key={n.key} onClick={() => setSelectedKey(n.key)} title={`${n.name} · ${n.winrate.toFixed(1)}%`}>
                  <img src={n.iconUrl} alt={n.name} className={cn("w-7 h-7 rounded-md object-cover ring-1 transition-all hover:scale-110", n.key === selectedKey ? "ring-jade" : "ring-jade/30")} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {worst.map(n => (
                <button key={n.key} onClick={() => setSelectedKey(n.key)} title={`${n.name} · ${n.winrate.toFixed(1)}%`}>
                  <img src={n.iconUrl} alt={n.name} className={cn("w-7 h-7 rounded-md object-cover ring-1 transition-all hover:scale-110", n.key === selectedKey ? "ring-[#ff6286]" : "ring-[#ff6286]/30")} />
                </button>
              ))}
              <span className="font-jetbrains text-[9px] uppercase tracking-[0.16em] text-[#ff6286]/60 ml-1">Worst</span>
            </div>
          </div>
        </div>

        {/* verdict for the picked matchup */}
        <div className={cn(PANEL, "p-5 backdrop-blur-md")} style={GLASS}>
          {selected ? (
            <MatchupVerdict champ={champ} node={selected} badge={badgeFromWR(selected.winrate)} tips={tips[selected.key]} onFull={() => navigate(`/champions/${champ.id}/statistics?vs=${selected.id}`)} />
          ) : (
            <div className="grid place-items-center h-full min-h-[300px] text-flash/40 font-jetbrains text-[12px]">Pick a matchup</div>
          )}
        </div>
      </div>

      {/* ── row 2: game plan vs the picked opponent ──────────────── */}
      {selected && matchupGraph && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>Game plan vs {selected.name}</Eyebrow>
            <span className="font-jetbrains text-[10px] uppercase tracking-[0.16em] text-flash/35">current patch · ranked</span>
          </div>
          <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
            <RunesCard
              key={`${champ.id}:${selected.id}`}
              championKey={Number(champ.key)}
              opponentKey={Number(selected.key)}
              opponentName={selected.name}
            />
            <BuildPathViz graph={matchupGraph} />
          </div>
        </section>
      )}
    </div>
  )
}

// ── verdict card ───────────────────────────────────────────────────
function MatchupVerdict({
  champ, node, badge, tips, onFull,
}: {
  champ: ChampInfo
  node: MatchupNode
  badge: Badge
  tips?: string
  onFull: () => void
}) {
  const wr = node.winrate
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={champIcon(champ.id)} alt={champ.name} className="w-11 h-11 rounded-lg object-cover ring-1 ring-jade/25" />
          <span className="font-chakrapetch text-[13px] font-bold uppercase tracking-[0.1em] text-flash/40">vs</span>
          <img src={node.iconUrl} alt={node.name} className="w-11 h-11 rounded-lg object-cover ring-1 ring-[#ff6286]/25" />
        </div>
        <span className={cn("rounded-md px-2.5 py-1 font-chakrapetch text-[10px] font-bold uppercase tracking-[0.12em]", badgeClass(badge))}>{badge}</span>
      </div>

      <div className="mt-5">
        <div className="flex items-end gap-2">
          <span className={cn("font-chakrapetch text-[44px] font-bold leading-none tabular-nums", wrText(wr))} style={wr >= 51 ? { textShadow: "0 0 28px rgba(0,217,146,0.35)" } : undefined}>{wr.toFixed(1)}%</span>
          <span className="mb-1.5 font-jetbrains text-[10px] uppercase tracking-[0.16em] text-flash/40">win rate</span>
        </div>
        <p className="mt-1 text-[13px] text-flash/55">
          {champ.name} vs <span className="text-flash/75">{node.name}</span> · {node.games.toLocaleString()} games
        </p>
        <div className="mt-3 h-2 rounded-full overflow-hidden bg-[#ff6286]/20">
          <div className="h-full rounded-full bg-gradient-to-r from-jade/70 to-jade" style={{ width: `${Math.max(4, Math.min(96, wr))}%` }} />
        </div>
      </div>

      {tips && (
        <div className="mt-5">
          <div className="font-jetbrains text-[10px] uppercase tracking-[0.16em] text-jade/55 mb-1.5">Lane notes</div>
          <p className="text-[13px] leading-relaxed text-flash/60">{tips}</p>
        </div>
      )}

      <div className="flex-1" />
      <button onClick={onFull}
        className="group mt-5 inline-flex items-center justify-center gap-2 w-full h-[44px] rounded-xl bg-jade/[0.06] ring-1 ring-inset ring-jade/25 font-chakrapetch text-[12px] font-bold uppercase tracking-[0.12em] text-jade cursor-clicker transition-colors hover:bg-jade/[0.12] hover:ring-jade/45">
        Full VS breakdown
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  )
}

// ── best runes vs the picked opponent ──────────────────────────────
type RuneRow = { perk_keystone: number; perk_primary_style: number; perk_sub_style: number; games: number; winrate: number; pick_rate: number }

function RunesCard({ championKey, opponentKey, opponentName }: { championKey: number; opponentKey: number; opponentName: string }) {
  const [top, setTop] = useState<RuneRow | null>(null)
  const [phase, setPhase] = useState<"loading" | "ready" | "empty" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    setPhase("loading"); setTop(null)
    fetch(`${API_BASE_URL}/api/champion/runes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ championId: championKey, opponentId: opponentKey, limit: 1 }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        const r: RuneRow | undefined = d?.runes?.[0]
        setTop(r ?? null)
        setPhase(r ? "ready" : "empty")
      })
      .catch(() => { if (!cancelled) setPhase("error") })
    return () => { cancelled = true }
  }, [championKey, opponentKey])

  return (
    <div className={cn(PANEL, "p-4 md:p-5")}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1 h-3.5 bg-jade rounded-full" />
        <span className="text-[11px] font-chakrapetch font-bold tracking-[0.2em] uppercase text-flash/55">Best runes</span>
      </div>

      {phase === "loading" && (
        <div className="h-[150px] grid place-items-center text-[11px] font-chakrapetch text-flash/35 animate-pulse">reading the runes…</div>
      )}
      {phase === "error" && (
        <div className="h-[120px] grid place-items-center text-[11px] font-chakrapetch text-flash/35">Runes unavailable.</div>
      )}
      {(phase === "empty" || (phase === "ready" && !top)) && (
        <div className="h-[120px] grid place-items-center text-center px-4 text-[11px] font-chakrapetch text-flash/35">No rune data vs {opponentName} yet.</div>
      )}

      {phase === "ready" && top && (
        <div className="flex flex-col items-center text-center">
          {/* keystone */}
          {getKeystoneIcon(top.perk_keystone) ? (
            <img src={getKeystoneIcon(top.perk_keystone)!} alt="" className="w-16 h-16 rounded-full ring-1 ring-jade/30 bg-black/40 p-1.5" style={{ boxShadow: "0 0 22px rgba(0,217,146,0.25)" }} />
          ) : (
            <div className="w-16 h-16 rounded-full ring-1 ring-jade/30 bg-black/40" />
          )}
          <div className="mt-2.5 font-chakrapetch text-[15px] font-bold text-flash/90">{getKeystoneName(top.perk_keystone) ?? "Keystone"}</div>

          {/* primary / secondary trees */}
          <div className="mt-3 flex items-center gap-2">
            <TreePill styleId={top.perk_primary_style} />
            <span className="text-flash/25 text-[11px]">+</span>
            <TreePill styleId={top.perk_sub_style} />
          </div>

          {/* stats */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 w-full">
            <Stat label="win rate" value={`${top.winrate.toFixed(1)}%`} good={top.winrate >= 50} />
            <Stat label="pick" value={`${Math.round(top.pick_rate)}%`} />
            <Stat label="games" value={compact(top.games)} />
          </div>
        </div>
      )}
    </div>
  )
}

function TreePill({ styleId }: { styleId: number }) {
  const icon = getStyleIcon(styleId)
  const name = getStyleName(styleId)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] ring-1 ring-inset ring-white/10 pl-1 pr-2.5 py-1">
      {icon ? <img src={icon} alt="" className="w-5 h-5" /> : <span className="w-5 h-5 rounded-full bg-white/10" />}
      <span className="font-chakrapetch text-[11px] font-semibold text-flash/70">{name ?? "—"}</span>
    </span>
  )
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg bg-black/25 ring-1 ring-inset ring-white/[0.06] py-2">
      <div className={cn("font-chakrapetch text-[15px] font-bold tabular-nums", good == null ? "text-flash/85" : good ? "text-jade" : "text-[#ff6286]")}>{value}</div>
      <div className="font-jetbrains text-[8px] uppercase tracking-[0.16em] text-flash/35 mt-0.5">{label}</div>
    </div>
  )
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export default ChampionMatchupsTab
