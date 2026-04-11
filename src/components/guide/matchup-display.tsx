"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { cdnBaseUrl, cdnSplashUrl } from "@/config"
import type { MatchupEntry } from "./types"

// Muted mono palette — threats use warm flash tones, synergies use cool jade tones
const THREAT_NODES = [
  { key: "hard", label: "Hard", levels: ["extreme", "major"], color: "rgba(215,216,217,0.6)", dimColor: "rgba(215,216,217,0.04)" },
  { key: "medium", label: "Skill", levels: ["even"], color: "rgba(215,216,217,0.4)", dimColor: "rgba(215,216,217,0.03)" },
  { key: "easy", label: "Easy", levels: ["minor", "tiny"], color: "rgba(215,216,217,0.25)", dimColor: "rgba(215,216,217,0.02)" },
]

const SYNERGY_NODES = [
  { key: "ideal", label: "Ideal", levels: ["ideal", "strong"], color: "rgba(0,217,146,0.6)", dimColor: "rgba(0,217,146,0.04)" },
  { key: "good", label: "Good", levels: ["ok"], color: "rgba(0,217,146,0.4)", dimColor: "rgba(0,217,146,0.03)" },
  { key: "low", label: "Low", levels: ["low", "none"], color: "rgba(0,217,146,0.25)", dimColor: "rgba(0,217,146,0.02)" },
]

function ChampCard({ entry }: { entry: MatchupEntry }) {
  const [showNote, setShowNote] = useState(false)
  return (
    <div
      className="group relative overflow-hidden rounded-[3px] border border-flash/[0.05] cursor-pointer transition-all duration-300 hover:border-flash/[0.1]"
      onClick={() => entry.note && setShowNote(!showNote)}
    >
      <img src={cdnSplashUrl(entry.championId)} alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.05] grayscale group-hover:opacity-[0.1] group-hover:grayscale-0 transition-all duration-500"
        style={{ objectPosition: "center 25%" }}
        onError={(e) => { e.currentTarget.style.display = "none" }} />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative z-10 flex items-center gap-2.5 px-3 py-2">
        <img src={`${cdnBaseUrl()}/img/champion/${entry.championId}.png`} alt={entry.championId}
          className="w-8 h-8 rounded-[3px] border border-white/[0.08] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-mono text-flash/60">{entry.championId}</div>
          {entry.note && !showNote && <div className="text-[8px] font-mono text-flash/20 truncate">{entry.note}</div>}
        </div>
      </div>
      {showNote && entry.note && (
        <div className="relative z-10 px-3 pb-2.5 -mt-0.5">
          <div className="text-[10px] font-mono text-flash/30 leading-relaxed pl-[42px]">{entry.note}</div>
        </div>
      )}
    </div>
  )
}

export function MatchupDisplay({ threats, synergies, championId }: {
  threats: MatchupEntry[]; synergies: MatchupEntry[]; championId?: string
}) {
  const [activeNode, setActiveNode] = useState<string | null>(null)

  const getChamps = (levels: string[], entries: MatchupEntry[]) =>
    entries.filter(e => levels.includes(e.level))

  const toggleNode = (key: string) => setActiveNode(prev => prev === key ? null : key)

  const activeEntries: MatchupEntry[] = (() => {
    if (!activeNode) return []
    const tn = THREAT_NODES.find(n => n.key === activeNode)
    if (tn) return getChamps(tn.levels, threats)
    const sn = SYNERGY_NODES.find(n => n.key === activeNode)
    if (sn) return getChamps(sn.levels, synergies)
    return []
  })()

  // Layout: SVG diagram with nodes positioned manually
  const W = 900, H = 220
  const CX = W / 2, CY = H / 2
  const NODE_W = 110, NODE_H = 38

  const threatPos = [
    { x: CX - 280, y: CY - 70 },
    { x: CX - 250, y: CY },
    { x: CX - 280, y: CY + 70 },
  ]
  const synergyPos = [
    { x: CX + 280, y: CY - 70 },
    { x: CX + 250, y: CY },
    { x: CX + 280, y: CY + 70 },
  ]

  return (
    <div>
      {/* ── SVG Diagram ── */}
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[900px] h-auto" style={{ minHeight: 220 }}>
          {/* Defs for glow effects */}
          <defs>
            <filter id="glowFilter">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Circuit-style connections — threats (L-shaped paths) */}
          {threatPos.map((pos, i) => {
            const isActive = activeNode === THREAT_NODES[i].key
            const midX = CX - 90
            const path = `M ${pos.x + NODE_W / 2 + 8} ${pos.y} L ${midX} ${pos.y} L ${midX} ${CY} L ${CX - 42} ${CY}`
            return (
              <g key={`tl-${i}`}>
                <path d={path} fill="none"
                  stroke={THREAT_NODES[i].color} strokeWidth={isActive ? 1.2 : 0.5}
                  strokeDasharray={isActive ? "none" : "3 4"}
                  filter={isActive ? "url(#glowFilter)" : undefined}
                  className="transition-all duration-500" />
                {/* Junction dots */}
                <circle cx={midX} cy={pos.y} r={1.5} fill={THREAT_NODES[i].color} fillOpacity={isActive ? 0.8 : 0.2} className="transition-all duration-300" />
                <circle cx={midX} cy={CY} r={1.5} fill={THREAT_NODES[i].color} fillOpacity={isActive ? 0.6 : 0.1} className="transition-all duration-300" />
              </g>
            )
          })}

          {/* Circuit-style connections — synergies (L-shaped paths) */}
          {synergyPos.map((pos, i) => {
            const isActive = activeNode === SYNERGY_NODES[i].key
            const midX = CX + 90
            const path = `M ${pos.x - NODE_W / 2 - 8} ${pos.y} L ${midX} ${pos.y} L ${midX} ${CY} L ${CX + 42} ${CY}`
            return (
              <g key={`sl-${i}`}>
                <path d={path} fill="none"
                  stroke={SYNERGY_NODES[i].color} strokeWidth={isActive ? 1.2 : 0.5}
                  strokeDasharray={isActive ? "none" : "3 4"}
                  filter={isActive ? "url(#glowFilter)" : undefined}
                  className="transition-all duration-500" />
                <circle cx={midX} cy={pos.y} r={1.5} fill={SYNERGY_NODES[i].color} fillOpacity={isActive ? 0.8 : 0.2} className="transition-all duration-300" />
                <circle cx={midX} cy={CY} r={1.5} fill={SYNERGY_NODES[i].color} fillOpacity={isActive ? 0.6 : 0.1} className="transition-all duration-300" />
              </g>
            )
          })}

          {/* Center champion */}
          <circle cx={CX} cy={CY} r={40} fill="none" stroke="rgba(215,216,217,0.05)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={34} fill="none" stroke="rgba(215,216,217,0.03)" strokeWidth={0.5} />
          {championId && (
            <clipPath id="champClip"><circle cx={CX} cy={CY} r={28} /></clipPath>
          )}
          {championId && (
            <image
              href={`${cdnBaseUrl()}/img/champion/${championId}.png`}
              x={CX - 28} y={CY - 28} width={56} height={56}
              clipPath="url(#champClip)"
              className="pointer-events-none"
            />
          )}
          <circle cx={CX} cy={CY} r={28} fill="none" stroke="rgba(215,216,217,0.08)" strokeWidth={1.5} />

          {/* Threat nodes */}
          {THREAT_NODES.map((node, i) => {
            const pos = threatPos[i]
            const count = getChamps(node.levels, threats).length
            const isActive = activeNode === node.key
            return (
              <g key={node.key} className="cursor-pointer" onClick={() => toggleNode(node.key)}>
                <rect x={pos.x - NODE_W / 2} y={pos.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={3}
                  fill={isActive ? node.dimColor : "rgba(0,0,0,0.3)"}
                  stroke={node.color} strokeOpacity={isActive ? 0.6 : 0.15} strokeWidth={isActive ? 1.2 : 0.6}
                  className="transition-all duration-300" />
                {/* Connector dot */}
                <circle cx={pos.x + NODE_W / 2 + 5} cy={pos.y} r={3}
                  fill={node.color} fillOpacity={isActive ? 0.8 : 0.3}
                  className="transition-all duration-300" />
                {/* Label */}
                <text x={pos.x} y={pos.y - 2} textAnchor="middle"
                  fill={node.color} fillOpacity={isActive ? 1 : 0.5}
                  fontSize={10} fontFamily="'Orbitron', monospace" fontWeight={700}
                  className="transition-all duration-300 uppercase pointer-events-none select-none">
                  {node.label}
                </text>
                {count > 0 && (
                  <text x={pos.x} y={pos.y + 11} textAnchor="middle"
                    fill="rgba(215,216,217,0.25)" fontSize={8} fontFamily="monospace"
                    className="pointer-events-none select-none">
                    {count}
                  </text>
                )}
              </g>
            )
          })}

          {/* Synergy nodes */}
          {SYNERGY_NODES.map((node, i) => {
            const pos = synergyPos[i]
            const count = getChamps(node.levels, synergies).length
            const isActive = activeNode === node.key
            return (
              <g key={node.key} className="cursor-pointer" onClick={() => toggleNode(node.key)}>
                <rect x={pos.x - NODE_W / 2} y={pos.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={3}
                  fill={isActive ? node.dimColor : "rgba(0,0,0,0.3)"}
                  stroke={node.color} strokeOpacity={isActive ? 0.6 : 0.15} strokeWidth={isActive ? 1.2 : 0.6}
                  className="transition-all duration-300" />
                {/* Connector dot */}
                <circle cx={pos.x - NODE_W / 2 - 5} cy={pos.y} r={3}
                  fill={node.color} fillOpacity={isActive ? 0.8 : 0.3}
                  className="transition-all duration-300" />
                {/* Label */}
                <text x={pos.x} y={pos.y - 2} textAnchor="middle"
                  fill={node.color} fillOpacity={isActive ? 1 : 0.5}
                  fontSize={10} fontFamily="'Orbitron', monospace" fontWeight={700}
                  className="transition-all duration-300 uppercase pointer-events-none select-none">
                  {node.label}
                </text>
                {count > 0 && (
                  <text x={pos.x} y={pos.y + 11} textAnchor="middle"
                    fill="rgba(215,216,217,0.25)" fontSize={8} fontFamily="monospace"
                    className="pointer-events-none select-none">
                    {count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* ── Expanded champion list ── */}
      {activeNode && activeEntries.length > 0 && (
        <div className="mt-1">
          <div className="h-[1px] bg-gradient-to-r from-transparent via-flash/[0.06] to-transparent mb-3" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {activeEntries.map((entry, i) => (
              <ChampCard key={`${entry.championId}-${i}`} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {threats.length === 0 && synergies.length === 0 && (
        <div className="text-center py-4 text-[10px] font-mono text-flash/15">No matchups added</div>
      )}
    </div>
  )
}
