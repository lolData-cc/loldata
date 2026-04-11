"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { cdnBaseUrl, cdnSplashUrl } from "@/config"
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes"
import { getRuneIcon, getRuneTree } from "@/constants/rune-tree-data"
import { Link } from "react-router-dom"
import { X } from "lucide-react"
import type { MatchupEntry } from "./types"
import { THREAT_LEVELS, SYNERGY_LEVELS } from "./types"

const THREAT_NODES = [
  { key: "impossible", label: "Impossible", levels: ["impossible"], color: "rgba(215,216,217,0.7)", dimColor: "rgba(215,216,217,0.04)" },
  { key: "hard", label: "Hard", levels: ["hard"], color: "rgba(215,216,217,0.5)", dimColor: "rgba(215,216,217,0.03)" },
  { key: "skill", label: "Skill", levels: ["skill"], color: "rgba(215,216,217,0.35)", dimColor: "rgba(215,216,217,0.025)" },
  { key: "easy", label: "Easy", levels: ["easy"], color: "rgba(215,216,217,0.2)", dimColor: "rgba(215,216,217,0.02)" },
]

const SYNERGY_NODES = [
  { key: "perfect", label: "Perfect", levels: ["perfect"], color: "rgba(0,217,146,0.7)", dimColor: "rgba(0,217,146,0.04)" },
  { key: "ideal", label: "Ideal", levels: ["ideal"], color: "rgba(0,217,146,0.5)", dimColor: "rgba(0,217,146,0.03)" },
  { key: "good", label: "Good", levels: ["good"], color: "rgba(0,217,146,0.35)", dimColor: "rgba(0,217,146,0.025)" },
  { key: "bad", label: "Bad", levels: ["bad"], color: "rgba(0,217,146,0.2)", dimColor: "rgba(0,217,146,0.02)" },
]

// ── Mini rune view for dialog ──
function MiniRuneView({ runes }: { runes: { primary: { tree: number; keystone: number; runes: number[] }; secondary: { tree: number; runes: number[] } } }) {
  const keystoneIcon = getKeystoneIcon(runes.primary.keystone)
  const keystoneName = getKeystoneName(runes.primary.keystone)
  const primaryTree = getRuneTree(runes.primary.tree)
  const secondaryTree = getRuneTree(runes.secondary.tree)
  return (
    <div className="flex gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          {getStyleIcon(runes.primary.tree) && <img src={getStyleIcon(runes.primary.tree)!} alt="" className="w-5 h-5 rounded-full" />}
          <span className="text-[9px] font-mono text-flash/35 uppercase">{getStyleName(runes.primary.tree)}</span>
        </div>
        {keystoneIcon && <img src={keystoneIcon} alt={keystoneName ?? ""} className="w-10 h-10 rounded-full border-2 border-jade/30" />}
        {primaryTree?.rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.map(r => {
              const sel = runes.primary.runes.includes(r.id)
              const icon = getRuneIcon(r.id)
              return icon ? <img key={r.id} src={icon} alt={r.name} className={cn("w-6 h-6 rounded-full", sel ? "opacity-100 ring-1 ring-jade/30" : "opacity-15")} /> : null
            })}
          </div>
        ))}
      </div>
      <div className="w-[1px] bg-gradient-to-b from-transparent via-flash/[0.06] to-transparent" />
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          {getStyleIcon(runes.secondary.tree) && <img src={getStyleIcon(runes.secondary.tree)!} alt="" className="w-4 h-4 rounded-full opacity-50" />}
          <span className="text-[8px] font-mono text-flash/25 uppercase">{getStyleName(runes.secondary.tree)}</span>
        </div>
        {secondaryTree?.rows.map((row, ri) => (
          <div key={ri} className="flex gap-1.5">
            {row.map(r => {
              const sel = runes.secondary.runes.includes(r.id)
              const icon = getRuneIcon(r.id)
              return icon ? <img key={r.id} src={icon} alt={r.name} className={cn("w-5 h-5 rounded-full", sel ? "opacity-100 ring-1 ring-jade/30" : "opacity-10")} /> : null
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Matchup Detail Dialog ──
function MatchupDetailDialog({ entry, isThreat, championId, onClose }: {
  entry: MatchupEntry; isThreat: boolean; championId?: string; onClose: () => void
}) {
  const levelData = isThreat
    ? THREAT_LEVELS.find(l => l.key === entry.level)
    : SYNERGY_LEVELS.find(l => l.key === entry.level)
  const hasItems = (entry.items?.length ?? 0) > 0
  const hasRunes = !!entry.runes

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div className="relative z-10 w-[560px] max-h-[85vh] overflow-y-auto rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        style={{ background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)", animation: "dialogOpen 0.25s ease-out" }}
        onClick={e => e.stopPropagation()}>
        {/* Splash header */}
        <div className="relative h-[140px] overflow-hidden">
          <img src={cdnSplashUrl(entry.championId)} alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            style={{ objectPosition: "center 25%" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c1517]/60 to-[#0c1517]" />
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.03) 3px, rgba(0,217,146,0.03) 4px)" }} />
          {/* Close */}
          <button type="button" onClick={onClose} className="absolute top-3 right-3 text-flash/30 hover:text-flash/70 transition-colors cursor-pointer z-10">
            <X className="w-5 h-5" />
          </button>
          {/* Champion info */}
          <div className="absolute bottom-3 left-4 flex items-center gap-3 z-10">
            <img src={`${cdnBaseUrl()}/img/champion/${entry.championId}.png`} alt="" className="w-12 h-12 rounded-[4px] border border-white/[0.1]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[18px] font-orbitron text-flash/90">{entry.championId}</h3>
                {entry.ban && (
                  <span className="text-[7px] font-orbitron font-bold text-red-400 bg-red-400/15 border border-red-400/30 px-1.5 py-0.5 rounded-[2px] uppercase tracking-wider">BAN</span>
                )}
              </div>
              {levelData && (
                <span className={cn("text-[9px] font-orbitron uppercase tracking-[0.15em] px-2 py-0.5 rounded-[2px]", levelData.color)}>
                  {levelData.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-5">
          {/* Description */}
          {entry.note && (
            <div>
              <div className="text-[11px] font-orbitron text-flash/55 uppercase tracking-[0.15em] mb-2">Matchup Description</div>
              <p className="text-[13px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap">{entry.note}</p>
            </div>
          )}

          {/* Runes + Build side by side */}
          {(hasRunes || hasItems) && (
            <div className="flex gap-5">
              {/* Runes — left */}
              {hasRunes && (
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-orbitron text-flash/55 uppercase tracking-[0.15em] mb-2">Custom Runes</div>
                  <MiniRuneView runes={entry.runes!} />
                </div>
              )}

              {/* Build — right */}
              {hasItems && (
                <div className={hasRunes ? "shrink-0" : "flex-1"}>
                  <div className="text-[11px] font-orbitron text-flash/55 uppercase tracking-[0.15em] mb-2">Recommended Build</div>
                  <div className="flex gap-2 flex-wrap">
                    {entry.items!.map((itemId, i) => (
                      <Link key={i} to={`/items/${itemId}`} className="block rounded-[3px] border border-flash/[0.06] hover:border-jade/15 transition-colors">
                        <img src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt="" className="w-10 h-10 rounded-[2px]" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View Stats button */}
          {championId && (
            <Link to={`/champions/${championId}/statistics?vs=${entry.championId}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-sm border border-jade/20 bg-jade/[0.05] text-jade/70 hover:text-jade hover:border-jade/40 hover:bg-jade/[0.1] hover:shadow-[0_0_15px_rgba(0,217,146,0.1)] transition-all cursor-pointer">
              <span className="text-[10px] font-orbitron uppercase tracking-[0.15em]">View Stats vs {entry.championId}</span>
            </Link>
          )}
        </div>
      </div>
      <style>{`
        @keyframes dialogOpen {
          from { opacity: 0; transform: scale(0.95) translateY(8px); filter: blur(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}

// ── Champion Card ──
function ChampCard({ entry, isThreat, championId }: { entry: MatchupEntry; isThreat?: boolean; championId?: string }) {
  const [showDialog, setShowDialog] = useState(false)
  return (
    <>
      <div
        className="group relative overflow-hidden rounded-[3px] border border-flash/[0.05] cursor-clicker transition-all duration-300 hover:border-flash/[0.12]"
        onClick={() => setShowDialog(true)}
      >
        <img src={cdnSplashUrl(entry.championId)} alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.05] grayscale group-hover:opacity-[0.15] group-hover:grayscale-0 transition-all duration-500"
          style={{ objectPosition: "center 25%" }}
          onError={(e) => { e.currentTarget.style.display = "none" }} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex items-center gap-3 px-3.5 py-3">
          <div className="relative shrink-0">
            <img src={`${cdnBaseUrl()}/img/champion/${entry.championId}.png`} alt={entry.championId}
              className="w-10 h-10 rounded-[3px] border border-white/[0.08]" />
            {entry.ban && (
              <span className="absolute -top-1.5 -right-1.5 text-[6px] font-orbitron font-bold text-red-400 bg-red-400/15 border border-red-400/30 px-1 py-px rounded-[2px] uppercase tracking-wider leading-none">BAN</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-mono text-flash/70 font-medium">{entry.championId}</div>
            {entry.note && (
              <div className="relative mt-0.5 max-h-[18px] overflow-hidden">
                <div className="text-[10px] font-mono text-flash/30 leading-[18px]">{entry.note}</div>
                <div className="absolute bottom-0 left-0 right-0 h-[12px] bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
              </div>
            )}
          </div>
          {/* Rhomboid indicator */}
          <div className="shrink-0 w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className={cn(
              "block w-3.5 h-3.5 rotate-45 rounded-[2px] border transition-all",
              "border-jade/30 bg-jade/[0.08] group-hover:border-jade/50 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)]"
            )} />
          </div>
        </div>
      </div>
      {showDialog && <MatchupDetailDialog entry={entry} isThreat={isThreat ?? false} championId={championId} onClose={() => setShowDialog(false)} />}
    </>
  )
}

export function MatchupDisplay({ threats, synergies, championId }: {
  threats: MatchupEntry[]; synergies: MatchupEntry[]; championId?: string
}) {
  const [activeNode, setActiveNode] = useState<string | null>("impossible")

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
  const W = 900, H = 280
  const CX = W / 2, CY = H / 2
  const NODE_W = 110, NODE_H = 34

  const threatPos = [
    { x: CX - 290, y: CY - 90 },
    { x: CX - 260, y: CY - 30 },
    { x: CX - 260, y: CY + 30 },
    { x: CX - 290, y: CY + 90 },
  ]
  const synergyPos = [
    { x: CX + 290, y: CY - 90 },
    { x: CX + 260, y: CY - 30 },
    { x: CX + 260, y: CY + 30 },
    { x: CX + 290, y: CY + 90 },
  ]

  return (
    <div>
      {/* ── SVG Diagram ── */}
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[900px] h-auto" style={{ minHeight: 280 }}>
          {/* Defs for glow effects */}
          <defs>
            <filter id="glowFilter">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="energyGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <style>{`
            @keyframes energyTravel {
              0% { stroke-dashoffset: 30; }
              100% { stroke-dashoffset: 0; }
            }
            @keyframes orbitPulse {
              0%, 100% { stroke-opacity: 0.04; }
              50% { stroke-opacity: 0.12; }
            }
            @keyframes junctionPing {
              0%, 100% { r: 1.5; opacity: 0.3; }
              50% { r: 3; opacity: 0.8; }
            }
          `}</style>

          {/* Subtle grid background */}
          <g opacity={0.02}>
            {Array.from({ length: Math.floor(W / 40) }, (_, i) => (
              <line key={`gv${i}`} x1={i * 40} y1={0} x2={i * 40} y2={H} stroke="rgba(0,217,146,1)" strokeWidth={0.5} />
            ))}
            {Array.from({ length: Math.floor(H / 40) }, (_, i) => (
              <line key={`gh${i}`} x1={0} y1={i * 40} x2={W} y2={i * 40} stroke="rgba(0,217,146,1)" strokeWidth={0.5} />
            ))}
          </g>

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
                {/* Energy pulse overlay */}
                {isActive && (
                  <path d={path} fill="none"
                    stroke={THREAT_NODES[i].color} strokeWidth={2.5} strokeOpacity={0.6}
                    strokeDasharray="8 22" filter="url(#energyGlow)"
                    style={{ animation: "energyTravel 0.8s linear infinite" }} />
                )}
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
                {isActive && (
                  <path d={path} fill="none"
                    stroke={SYNERGY_NODES[i].color} strokeWidth={2.5} strokeOpacity={0.6}
                    strokeDasharray="8 22" filter="url(#energyGlow)"
                    style={{ animation: "energyTravel 0.8s linear infinite" }} />
                )}
                <circle cx={midX} cy={pos.y} r={1.5} fill={SYNERGY_NODES[i].color} fillOpacity={isActive ? 0.8 : 0.2} className="transition-all duration-300" />
                <circle cx={midX} cy={CY} r={1.5} fill={SYNERGY_NODES[i].color} fillOpacity={isActive ? 0.6 : 0.1} className="transition-all duration-300" />
              </g>
            )
          })}

          {/* Center champion — cyber rings */}
          <circle cx={CX} cy={CY} r={48} fill="none" stroke="rgba(0,217,146,0.03)" strokeWidth={0.5} strokeDasharray="2 6" style={{ animation: "orbitPulse 3s ease-in-out infinite" }} />
          <circle cx={CX} cy={CY} r={40} fill="none" stroke="rgba(215,216,217,0.05)" strokeWidth={0.8} />
          <circle cx={CX} cy={CY} r={34} fill="none" stroke="rgba(0,217,146,0.04)" strokeWidth={0.5} strokeDasharray="4 4" style={{ animation: "orbitPulse 4s ease-in-out infinite 1s" }} />
          {championId && (
            <clipPath id="champClip"><circle cx={CX} cy={CY} r={28} /></clipPath>
          )}
          {championId && (
            <>
              <circle cx={CX} cy={CY} r={28} fill="rgba(0,0,0,0.4)" />
              <image
                href={`${cdnBaseUrl()}/img/champion/${championId}.png`}
                x={CX - 28} y={CY - 28} width={56} height={56}
                clipPath="url(#champClip)"
                className="pointer-events-none"
              />
            </>
          )}
          <circle cx={CX} cy={CY} r={28} fill="none" stroke="rgba(215,216,217,0.1)" strokeWidth={1.5} />
          {/* Corner ticks on center */}
          {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([dx,dy], ci) => (
            <line key={`ct${ci}`} x1={CX + dx * 26} y1={CY + dy * 32} x2={CX + dx * 26} y2={CY + dy * 26}
              stroke="rgba(0,217,146,0.12)" strokeWidth={0.8} />
          ))}

          {/* Threat nodes */}
          {THREAT_NODES.map((node, i) => {
            const pos = threatPos[i]
            const count = getChamps(node.levels, threats).length
            const isActive = activeNode === node.key
            const nx = pos.x - NODE_W / 2, ny = pos.y - NODE_H / 2
            const bk = 6 // bracket length
            return (
              <g key={node.key} className="cursor-clicker" onClick={() => toggleNode(node.key)}>
                <rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={2}
                  fill={isActive ? node.dimColor : "rgba(0,0,0,0.4)"}
                  stroke={node.color} strokeOpacity={isActive ? 0.5 : 0.1} strokeWidth={isActive ? 1 : 0.5}
                  className="transition-all duration-300" />
                {/* Scanlines */}
                <clipPath id={`tn-c${i}`}><rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={2} /></clipPath>
                <g clipPath={`url(#tn-c${i})`} opacity={isActive ? 0.08 : 0.03}>
                  {Array.from({ length: 6 }, (_, j) => (
                    <line key={j} x1={nx} y1={ny + j * 6} x2={nx + NODE_W} y2={ny + j * 6} stroke={node.color} strokeWidth={0.5} />
                  ))}
                </g>
                {/* Corner brackets */}
                <path d={`M${nx} ${ny + bk} L${nx} ${ny} L${nx + bk} ${ny}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                <path d={`M${nx + NODE_W - bk} ${ny} L${nx + NODE_W} ${ny} L${nx + NODE_W} ${ny + bk}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                <path d={`M${nx + NODE_W} ${ny + NODE_H - bk} L${nx + NODE_W} ${ny + NODE_H} L${nx + NODE_W - bk} ${ny + NODE_H}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                <path d={`M${nx + bk} ${ny + NODE_H} L${nx} ${ny + NODE_H} L${nx} ${ny + NODE_H - bk}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                {/* Connector dot */}
                <circle cx={pos.x + NODE_W / 2 + 5} cy={pos.y} r={isActive ? 3 : 2}
                  fill={node.color} fillOpacity={isActive ? 0.8 : 0.25}
                  className="transition-all duration-300"
                  style={isActive ? { animation: "junctionPing 1.5s ease-in-out infinite" } : undefined} />
                {/* Label */}
                <text x={pos.x} y={pos.y - 2} textAnchor="middle"
                  fill={node.color} fillOpacity={isActive ? 1 : 0.45}
                  fontSize={9} fontFamily="'Orbitron', monospace" fontWeight={700}
                  className="transition-all duration-300 uppercase pointer-events-none select-none">
                  {node.label}
                </text>
                {count > 0 && (
                  <text x={pos.x} y={pos.y + 11} textAnchor="middle"
                    fill="rgba(215,216,217,0.2)" fontSize={7} fontFamily="monospace"
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
            const nx = pos.x - NODE_W / 2, ny = pos.y - NODE_H / 2
            const bk = 6
            return (
              <g key={node.key} className="cursor-clicker" onClick={() => toggleNode(node.key)}>
                <rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={2}
                  fill={isActive ? node.dimColor : "rgba(0,0,0,0.4)"}
                  stroke={node.color} strokeOpacity={isActive ? 0.5 : 0.1} strokeWidth={isActive ? 1 : 0.5}
                  className="transition-all duration-300" />
                {/* Scanlines */}
                <clipPath id={`sn-c${i}`}><rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={2} /></clipPath>
                <g clipPath={`url(#sn-c${i})`} opacity={isActive ? 0.08 : 0.03}>
                  {Array.from({ length: 6 }, (_, j) => (
                    <line key={j} x1={nx} y1={ny + j * 6} x2={nx + NODE_W} y2={ny + j * 6} stroke={node.color} strokeWidth={0.5} />
                  ))}
                </g>
                {/* Corner brackets */}
                <path d={`M${nx} ${ny + bk} L${nx} ${ny} L${nx + bk} ${ny}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                <path d={`M${nx + NODE_W - bk} ${ny} L${nx + NODE_W} ${ny} L${nx + NODE_W} ${ny + bk}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                <path d={`M${nx + NODE_W} ${ny + NODE_H - bk} L${nx + NODE_W} ${ny + NODE_H} L${nx + NODE_W - bk} ${ny + NODE_H}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                <path d={`M${nx + bk} ${ny + NODE_H} L${nx} ${ny + NODE_H} L${nx} ${ny + NODE_H - bk}`} fill="none" stroke={node.color} strokeOpacity={isActive ? 0.4 : 0.1} strokeWidth={0.8} />
                {/* Connector dot */}
                <circle cx={pos.x - NODE_W / 2 - 5} cy={pos.y} r={isActive ? 3 : 2}
                  fill={node.color} fillOpacity={isActive ? 0.8 : 0.25}
                  className="transition-all duration-300"
                  style={isActive ? { animation: "junctionPing 1.5s ease-in-out infinite" } : undefined} />
                {/* Label */}
                <text x={pos.x} y={pos.y - 2} textAnchor="middle"
                  fill={node.color} fillOpacity={isActive ? 1 : 0.45}
                  fontSize={9} fontFamily="'Orbitron', monospace" fontWeight={700}
                  className="transition-all duration-300 uppercase pointer-events-none select-none">
                  {node.label}
                </text>
                {count > 0 && (
                  <text x={pos.x} y={pos.y + 11} textAnchor="middle"
                    fill="rgba(0,217,146,0.2)" fontSize={7} fontFamily="monospace"
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
              <ChampCard key={`${entry.championId}-${i}`} entry={entry}
                isThreat={THREAT_NODES.some(n => n.key === activeNode)}
                championId={championId} />
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
