"use client"

// Champion Matchups — REAL lane-matchup data (no mock differentials).
// The champion's strongest and hardest lanes (from mv_lane_matchups, served via
// /api/champion/stats best/worstMatchups) become a 3D constellation you orbit
// and click to pick a matchup; a flat grid stands in when WebGL is unavailable.
// Picking one shows the real win rate / games / difficulty + curated lane notes,
// and links into the full VS breakdown on the Statistics tab.

import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
// Matchups read from the match-data box (api2) — fresh mv_lane_matchups, not Cloud.
import { BOX_API_BASE_URL as API_BASE_URL, cdnBaseUrl } from "@/config"
import { MatchupOrbit, supportsWebGL, type MatchupNode } from "./matchup-orbit"

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

// Flat grid — used when WebGL is unavailable AND as the orbit's error-boundary
// fallback (a thrown WebGL texture error must never take down the whole tab).
function Grid2D({ nodes, selectedKey, onSelect }: { nodes: MatchupNode[]; selectedKey: string | null; onSelect: (k: string) => void }) {
  return (
    <div className="relative p-4 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[460px] overflow-y-auto">
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

  const subjectIcon = `${cdnBaseUrl()}/img/champion/${champ.id}.png`

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

  if (loading) {
    return (
      <div className="grid place-items-center h-[420px] rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.55)]" style={GLASS}>
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
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Matchups</Eyebrow>
          <p className="mt-2 text-[14px] leading-relaxed text-flash/55 max-w-[560px]">
            {champ.name}'s real lane matchups — {nodes.length} opponents from the box, by win rate.{" "}
            <span className="text-flash/75">{webgl ? "Orbit the map and click a champion" : "Tap a champion"}</span> to break down the lane.
          </p>
        </div>
        {/* legend */}
        <div className="flex items-center gap-4 font-jetbrains text-[10px] uppercase tracking-[0.16em]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-jade" />Favoured</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#7c8b92]" />Even</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ff6286]" />Hard</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        {/* picker — 3D orbit or 2D grid fallback */}
        {/* the tree floats in the void — no box */}
        <div className="relative min-h-[500px]">

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
          <div className="absolute inset-x-0 bottom-0 z-[2] flex items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-t from-[#040A0C] via-[#040A0C]/85 to-transparent pointer-events-none">
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

        {/* detail panel for the picked matchup */}
        <div className="rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-5" style={GLASS}>
          {selected ? (
            <MatchupDetail champ={champ} node={selected} badge={badgeFromWR(selected.winrate)} tips={tips[selected.key]} onFull={() => navigate(`/champions/${champ.id}/statistics?vs=${selected.id}`)} />
          ) : (
            <div className="grid place-items-center h-full min-h-[300px] text-flash/40 font-jetbrains text-[12px]">Pick a matchup</div>
          )}
        </div>
      </div>
    </div>
  )
}

function MatchupDetail({
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
      {/* heads */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={`${cdnBaseUrl()}/img/champion/${champ.id}.png`} alt={champ.name} className="w-11 h-11 rounded-lg object-cover ring-1 ring-jade/25" />
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
          {champ.name} <span className="text-flash/75">{node.name}</span> · {node.games.toLocaleString()} games
        </p>
        {/* win-rate bar */}
        <div className="mt-3 h-2 rounded-full overflow-hidden bg-[#ff6286]/20">
          <div className="h-full rounded-full bg-gradient-to-r from-jade/70 to-jade" style={{ width: `${Math.max(4, Math.min(96, wr))}%` }} />
        </div>
      </div>

      {/* lane notes (curated) */}
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

export default ChampionMatchupsTab
