"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { cdnBaseUrl } from "@/config"
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes"
import { getRuneIcon, getRuneName, getRuneTree } from "@/constants/rune-tree-data"
import type { Guide, GuideSection, MatchupEntry, ThreatLevel, SynergyLevel, BuildStep, JungleCamp, JunglePath } from "./types"
import { normalizeBuildPage, CAMP_POSITIONS } from "./types"
import { THREAT_LEVELS, SYNERGY_LEVELS } from "./types"
import { MatchupDisplay } from "./matchup-display"
import { Link } from "react-router-dom"

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-jade/30 rounded-full" />
        <h3 className="text-[13px] font-orbitron text-flash/70 uppercase tracking-[0.2em]">{title}</h3>
        <div className="flex-1 h-[1px] bg-gradient-to-r from-flash/[0.06] to-transparent" />
      </div>
      {children}
    </div>
  )
}

// ── Introduction ──
function IntroView({ content }: { content: string }) {
  return (
    <div className="text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap">{content}</div>
  )
}

// ── Matchups ──
function MatchupView({ threats, synergies }: { threats: MatchupEntry[]; synergies: MatchupEntry[] }) {
  const levelColors: Record<string, string> = {}
  for (const t of THREAT_LEVELS) levelColors[t.key] = t.color
  for (const s of SYNERGY_LEVELS) levelColors[s.key] = s.color

  const renderGroup = (entries: MatchupEntry[], label: string, isThreats: boolean) => {
    if (entries.length === 0) return null
    // Group by level
    const groups = new Map<string, MatchupEntry[]>()
    for (const e of entries) {
      if (!groups.has(e.level)) groups.set(e.level, [])
      groups.get(e.level)!.push(e)
    }

    return (
      <div className="flex-1">
        <div className={cn("text-[10px] font-mono uppercase tracking-[0.2em] mb-3", isThreats ? "text-red-400/50" : "text-jade/50")}>{label}</div>
        {Array.from(groups.entries()).map(([level, champs]) => (
          <div key={level} className="mb-3">
            <span className={cn("inline-block text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded-sm mb-1.5", levelColors[level] ?? "bg-flash/10 text-flash/40")}>
              {level} ({champs.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {champs.map(c => (
                <div key={c.championId} className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-flash/[0.03] border border-flash/[0.05]" title={c.note}>
                  <img src={`${cdnBaseUrl()}/img/champion/${c.championId}.png`} alt={c.championId} className="w-7 h-7 rounded-[2px]" />
                  <div>
                    <div className="text-[10px] font-mono text-flash/60">{c.championId}</div>
                    {c.note && <div className="text-[9px] font-mono text-flash/30 max-w-[120px] truncate">{c.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      {renderGroup(threats, "Threats", true)}
      {renderGroup(synergies, "Synergies", false)}
    </div>
  )
}

// ── Build ──
function BuildItemRow({ items }: { items: number[] }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map((itemId, idx) => (
        <Link key={idx} to={`/items/${itemId}`} className="flex flex-col items-center gap-1 p-2 rounded-sm bg-flash/[0.02] border border-flash/[0.04] hover:border-jade/15 transition-colors min-w-[70px]">
          <img src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt="" className="w-10 h-10 rounded-[2px] border border-flash/[0.08]" />
        </Link>
      ))}
    </div>
  )
}

function BuildView({ items }: { items: number[] }) {
  return <BuildItemRow items={items} />
}

function RecommendedItemsView({ section }: { section: any }) {
  const richItems: { itemId: number; description?: string }[] = section.richItems ??
    (section.items ?? []).map((id: number) => ({ itemId: id }))
  const [selectedIdx, setSelectedIdx] = useState<number | null>(richItems.length > 0 ? 0 : null)

  if (richItems.length === 0) return null

  const ITEM_W = 56 // item card width approx
  const GAP = 8
  const totalW = richItems.length * ITEM_W + (richItems.length - 1) * GAP

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Items row — centered */}
      <div className="flex gap-2 justify-center flex-wrap">
        {richItems.map((item, idx) => (
          <button key={idx} type="button" onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-sm border transition-all cursor-pointer",
              selectedIdx === idx
                ? "border-jade/40 bg-jade/[0.05] shadow-[0_0_12px_rgba(0,217,146,0.15)]"
                : "border-flash/[0.04] bg-flash/[0.02] hover:border-flash/[0.1]"
            )}>
            <img src={`${cdnBaseUrl()}/img/item/${item.itemId}.png`} alt=""
              className={cn("w-10 h-10 rounded-[2px] border transition-all", selectedIdx === idx ? "border-jade/30" : "border-flash/[0.08]")} />
          </button>
        ))}
      </div>

      {/* Connector line + description */}
      {selectedIdx !== null && richItems[selectedIdx]?.description && (
        <div className="flex flex-col items-center w-full">
          <div className="w-[1px] h-4 bg-jade/20" />
          <div className="w-2 h-2 rotate-45 border border-jade/25 bg-jade/[0.08] -mt-[1px]" />
          <p className="mt-2 w-full text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap">{richItems[selectedIdx].description}</p>
        </div>
      )}
    </div>
  )
}

const ITEM_SIZE = 44 // w-11 = 44px
const ITEM_GAP = 6   // gap-1.5 = 6px
const CONN_W = 44     // horizontal connector width

function stepHeight(step: BuildStep) {
  return step.items.length * ITEM_SIZE + (step.items.length - 1) * ITEM_GAP
}

function BuildFlowConnector({ from, to, index }: { from: BuildStep; to: BuildStep; index: number }) {
  const fromH = stepHeight(from)
  const toH = stepHeight(to)
  const h = Math.max(fromH, toH)

  const fromYs = from.items.map((_, i) => {
    const stepTop = (h - fromH) / 2
    return stepTop + i * (ITEM_SIZE + ITEM_GAP) + ITEM_SIZE / 2
  })
  const toYs = to.items.map((_, i) => {
    const stepTop = (h - toH) / 2
    return stepTop + i * (ITEM_SIZE + ITEM_GAP) + ITEM_SIZE / 2
  })

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (const fy of fromYs) {
    for (const ty of toYs) {
      lines.push({ x1: 0, y1: fy, x2: CONN_W, y2: ty })
    }
  }

  const uid = `pulse-${index}-${Math.random().toString(36).slice(2, 6)}`
  const delay = 0.3 + index * 0.15

  return (
    <svg width={CONN_W} height={h} className="shrink-0" style={{ minHeight: h }}>
      <defs>
        <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="0%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(0,217,146,0.15)">
            <animate attributeName="stop-color" values="rgba(0,217,146,0.15);rgba(0,217,146,0.15)" dur="0.01s" begin={`${delay}s`} fill="freeze" />
          </stop>
          <stop offset="50%" stopColor="rgba(0,217,146,0.15)">
            <animate attributeName="stop-color" values="rgba(0,217,146,0.15);rgba(0,217,146,0.9);rgba(0,217,146,0.15)" dur="0.5s" begin={`${delay}s`} fill="freeze" />
          </stop>
          <stop offset="100%" stopColor="rgba(0,217,146,0.15)">
            <animate attributeName="stop-color" values="rgba(0,217,146,0.15);rgba(0,217,146,0.15)" dur="0.01s" begin={`${delay + 0.5}s`} fill="freeze" />
          </stop>
        </linearGradient>
      </defs>
      {/* Base lines (always visible) */}
      {lines.map((l, i) => (
        <line key={`b${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(0,217,146,0.25)" strokeWidth={1} />
      ))}
      {/* Pulse overlay lines */}
      {lines.map((l, i) => (
        <line key={`p${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(0,217,146,0)" strokeWidth={2}>
          <animate attributeName="stroke" values="rgba(0,217,146,0);rgba(0,217,146,0.9);rgba(0,217,146,0)" dur="0.4s" begin={`${delay}s`} fill="freeze" />
          <animate attributeName="stroke-width" values="2;3;1" dur="0.4s" begin={`${delay}s`} fill="freeze" />
        </line>
      ))}
    </svg>
  )
}

function BuildFlowView({ steps, highlightedItemId }: { steps: BuildStep[]; highlightedItemId?: number }) {
  if (steps.length === 0) return null
  const maxH = Math.max(...steps.map(s => stepHeight(s)))

  return (
    <div className="flex items-center overflow-x-auto pb-1 pl-1 pt-1">
      {steps.map((step, stepIdx) => (
        <div key={stepIdx} className="flex items-center shrink-0">
          {/* Step: items stacked vertically */}
          <div className="flex flex-col items-center gap-1.5" style={{ justifyContent: "center", minHeight: maxH }}>
            {step.items.map((itemId, i) => {
              const isHighlighted = highlightedItemId === itemId
              return (
                <Link key={i} to={`/items/${itemId}`}
                  className={cn(
                    "block rounded-[3px] border transition-all duration-300",
                    isHighlighted
                      ? "border-jade/60 ring-2 ring-jade/40 shadow-[0_0_14px_rgba(0,217,146,0.4)] scale-110"
                      : "border-flash/[0.06] hover:border-jade/15"
                  )}>
                  <img src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt=""
                    className="w-11 h-11 rounded-[2px]" />
                </Link>
              )
            })}
          </div>
          {/* SVG connector lines to next step */}
          {stepIdx < steps.length - 1 && (
            <BuildFlowConnector from={step} to={steps[stepIdx + 1]} index={stepIdx} />
          )}
        </div>
      ))}
    </div>
  )
}

/** Parse [text](itemId) markup into segments */
function parseItemLinks(text: string): { type: "text"; value: string }[] | { type: "link"; text: string; itemId: number }[] {
  const parts: ({ type: "text"; value: string } | { type: "link"; text: string; itemId: number })[] = []
  const regex = /\[([^\]]+)\]\((\d+)\)/g
  let lastIdx = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push({ type: "text", value: text.slice(lastIdx, match.index) })
    parts.push({ type: "link", text: match[1], itemId: Number(match[2]) })
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < text.length) parts.push({ type: "text", value: text.slice(lastIdx) })
  return parts as any
}

function LinkedDescription({ text, onHover }: { text: string; onHover: (itemId: number | null) => void }) {
  const parts = parseItemLinks(text)
  return (
    <p className="text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <span key={i}
            onMouseEnter={() => onHover((part as any).itemId)}
            onMouseLeave={() => onHover(null)}
            className="text-jade/70 underline decoration-jade/25 underline-offset-2 cursor-help hover:text-jade hover:decoration-jade/50 transition-colors">
            {(part as any).text}
          </span>
        )
      )}
    </p>
  )
}

function MultiBuildView({ section }: { section: any }) {
  const rawPages = section.pages ?? (section.items ? [{ name: "Default", items: section.items }] : [])
  const pages = rawPages.map((p: any) => normalizeBuildPage(p))
  const [activeIdx, setActiveIdx] = useState(0)
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null)
  if (pages.length === 0) return null
  const activePage = pages[activeIdx] ?? pages[0]

  return (
    <div>
      {/* Tab bar (only if multiple pages) */}
      {pages.length > 1 && (
        <div className="flex items-center gap-0 mb-4 border-b border-flash/[0.06]">
          {pages.map((p: any, idx: number) => {
            const isActive = activeIdx === idx
            return (
              <button key={idx} type="button" onClick={() => { setActiveIdx(idx); setHighlightedItemId(null) }}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors cursor-pointer",
                  isActive ? "text-jade" : "text-flash/25 hover:text-flash/50"
                )}>
                {p.name || `Build ${idx + 1}`}
                {(p.againstClasses ?? []).map((cls: string) => (
                  <img key={cls} src={`https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`} alt={cls}
                    className={cn("w-4 h-4 object-contain transition-opacity", isActive ? "opacity-70" : "opacity-30")} />
                ))}
                {(p.againstChampions ?? []).map((c: string) => (
                  <img key={c} src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c}
                    className={cn("w-4 h-4 rounded-[1px] border border-flash/[0.06] transition-opacity", isActive ? "opacity-70" : "opacity-30")} />
                ))}
                {/* Sliding underline */}
                {isActive && (
                  <motion.span
                    layoutId="build-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Single page: show name + against if they exist */}
      {pages.length === 1 && (activePage.againstChampions?.length || activePage.againstClasses?.length) && (
        <div className="flex items-center gap-2 mb-2">
          <div className="text-[11px] font-orbitron text-flash/40">{activePage.name}</div>
          {(activePage.againstClasses ?? []).map((cls: string) => (
            <img key={cls} src={`https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`} alt={cls}
              className="w-5 h-5 object-contain opacity-50" title={cls} />
          ))}
          {(activePage.againstChampions ?? []).map((c: string) => (
            <img key={c} src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c}
              className="w-5 h-5 rounded-[2px] border border-flash/[0.06] opacity-60" title={c} />
          ))}
        </div>
      )}

      {/* Content with crossfade animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* Description with item links */}
          {activePage.description && (
            <div className="mb-3">
              <LinkedDescription text={activePage.description} onHover={setHighlightedItemId} />
            </div>
          )}

          {/* Build flow + boots centered */}
          <div className="flex items-start gap-10 justify-center">
            <BuildFlowView steps={activePage.steps} highlightedItemId={highlightedItemId ?? undefined} />

            {activePage.showBoots && (activePage.boots?.length ?? 0) > 0 && (
              <div className="shrink-0 flex flex-col gap-2.5 pt-1">
                {activePage.boots!.map((boot: any, bi: number) => {
                  const hasContext = (boot.againstClasses?.length ?? 0) > 0 || (boot.againstChampions?.length ?? 0) > 0
                  return (
                    <div key={bi} className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img src={`${cdnBaseUrl()}/img/item/${boot.itemId}.png`} alt=""
                          className="w-10 h-10 rounded-[3px] border border-flash/[0.08]" />
                        {!hasContext && (
                          <span className="absolute -top-1.5 -right-1 text-[5px] font-orbitron font-bold text-jade/60 bg-jade/10 border border-jade/20 px-1 py-px rounded-[2px] uppercase tracking-wider leading-none">DEFAULT</span>
                        )}
                      </div>
                      {hasContext && (
                        <>
                          <span className="text-[9px] font-mono text-flash/25 shrink-0">VS</span>
                          <div className="flex gap-1.5">
                            {(boot.againstClasses ?? []).map((cls: string) => (
                              <img key={cls} src={`https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`} alt={cls}
                                className="w-5 h-5 object-contain opacity-60" />
                            ))}
                            {(boot.againstChampions ?? []).map((c: string) => (
                              <img key={c} src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c}
                                className="w-5 h-5 rounded-[2px] border border-flash/[0.06] opacity-60" />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Runes ──
function RuneView({ primary, secondary }: { primary: { tree: number; keystone: number; runes: number[] }; secondary: { tree: number; runes: number[] } }) {
  const keystoneIcon = getKeystoneIcon(primary.keystone)
  const keystoneName = getKeystoneName(primary.keystone) ?? ""
  const primaryTreeIcon = getStyleIcon(primary.tree)
  const secondaryTreeIcon = getStyleIcon(secondary.tree)
  const secondaryName = getStyleName(secondary.tree) ?? ""

  const primaryTreeData = getRuneTree(primary.tree)
  const secondaryTreeData = getRuneTree(secondary.tree)

  return (
    <div className="flex gap-8">
      {/* Primary tree */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          {primaryTreeIcon && <img src={primaryTreeIcon} alt="" className="w-6 h-6 rounded-full" />}
          <span className="text-[11px] font-mono text-flash/40 uppercase tracking-wider">{getStyleName(primary.tree)}</span>
        </div>
        {/* Keystone */}
        <div className="flex gap-2 justify-center">
          {keystoneIcon && (
            <img src={keystoneIcon} alt={keystoneName ?? ""} className="w-12 h-12 rounded-full border-2 border-jade/40 shadow-[0_0_10px_rgba(0,217,146,0.25)]" />
          )}
        </div>
        {/* Minor runes */}
        {primaryTreeData?.rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-2 justify-center">
            {row.map(rune => {
              const selected = primary.runes.includes(rune.id)
              const icon = getRuneIcon(rune.id)
              return icon ? (
                <img key={rune.id} src={icon} alt={rune.name}
                  className={cn("w-8 h-8 rounded-full transition-opacity", selected ? "opacity-100 ring-1 ring-jade/30" : "opacity-20")}
                  title={rune.name} />
              ) : null
            })}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-[1px] bg-gradient-to-b from-transparent via-flash/[0.08] to-transparent" />

      {/* Secondary tree */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          {secondaryTreeIcon && <img src={secondaryTreeIcon} alt="" className="w-5 h-5 rounded-full opacity-50" />}
          <span className="text-[10px] font-mono text-flash/30 uppercase tracking-wider">{secondaryName}</span>
        </div>
        {secondaryTreeData?.rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-2 justify-center">
            {row.map(rune => {
              const selected = secondary.runes.includes(rune.id)
              const icon = getRuneIcon(rune.id)
              return icon ? (
                <img key={rune.id} src={icon} alt={rune.name}
                  className={cn("w-7 h-7 rounded-full transition-opacity", selected ? "opacity-100 ring-1 ring-jade/30" : "opacity-15")}
                  title={rune.name} />
              ) : null
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Multi-Rune View ──
function MultiRunePageView({ section }: { section: any }) {
  const pages = section.pages ?? (section.primary ? [{ name: "Default", primary: section.primary, secondary: section.secondary }] : [])
  const [activeIdx, setActiveIdx] = useState(0)
  if (pages.length === 0) return null
  const activePage = pages[activeIdx] ?? pages[0]

  return (
    <div>
      {/* Tabs */}
      {pages.length > 1 && (
        <div className="flex items-center gap-0 mb-4 border-b border-flash/[0.06]">
          {pages.map((p: any, idx: number) => {
            const isActive = activeIdx === idx
            return (
              <button key={idx} type="button" onClick={() => setActiveIdx(idx)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors cursor-pointer",
                  isActive ? "text-jade" : "text-flash/25 hover:text-flash/50"
                )}>
                {p.name || `Page ${idx + 1}`}
                {(p.againstClasses ?? []).map((cls: string) => (
                  <img key={cls} src={`https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`} alt={cls}
                    className={cn("w-4 h-4 object-contain transition-opacity", isActive ? "opacity-70" : "opacity-30")} />
                ))}
                {(p.againstChampions ?? []).map((c: string) => (
                  <img key={c} src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c}
                    className={cn("w-4 h-4 rounded-[1px] border border-flash/[0.06] transition-opacity", isActive ? "opacity-70" : "opacity-30")} />
                ))}
                {isActive && (
                  <motion.span layoutId="rune-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={activeIdx}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex gap-6">
          {/* Left — info */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Against badges */}
            {((activePage.againstChampions ?? []).length > 0 || (activePage.againstClasses ?? []).length > 0) && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-flash/25 uppercase tracking-wider">vs</span>
                {(activePage.againstClasses ?? []).map((cls: string) => (
                  <img key={cls} src={`https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`} alt={cls}
                    className="w-6 h-6 object-contain opacity-60" title={cls} />
                ))}
                {(activePage.againstChampions ?? []).map((c: string) => (
                  <img key={c} src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c}
                    className="w-6 h-6 rounded-[2px] border border-flash/[0.08] opacity-60" title={c} />
                ))}
              </div>
            )}

            {/* Description */}
            {activePage.description && (
              <p className="text-[14px] font-mono text-flash/50 leading-relaxed whitespace-pre-wrap">{activePage.description}</p>
            )}

            {/* Keystone summary */}
            {activePage.primary && (() => {
              const icon = getKeystoneIcon(activePage.primary.keystone)
              const name = getKeystoneName(activePage.primary.keystone)
              const primaryName = getStyleName(activePage.primary.tree)
              const secondaryName = getStyleName(activePage.secondary?.tree)
              return (
                <div className="flex items-center gap-2 mt-2">
                  {icon && <img src={icon} alt="" className="w-8 h-8 rounded-full border border-jade/30" />}
                  <div>
                    <div className="text-[13px] font-orbitron text-flash/60">{name}</div>
                    <div className="text-[10px] font-mono text-flash/25">{primaryName} / {secondaryName}</div>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Divider */}
          <div className="w-[1px] bg-gradient-to-b from-transparent via-flash/[0.06] to-transparent shrink-0" />

          {/* Right — rune tree */}
          <div className="shrink-0">
            <RuneView primary={activePage.primary} secondary={activePage.secondary} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Back Timings ──
function BackTimingView({ timings }: { timings: { gold: number; items: number[]; note: string; ideal?: boolean }[] }) {
  return (
    <div className="space-y-2">
      {timings.map((t, idx) => (
        <div key={idx} className={cn(
          "relative grid grid-cols-[60px_1px_120px_1px_1fr] items-center gap-3 px-4 py-2.5 rounded-sm",
          t.ideal ? "border border-jade/30 bg-jade/[0.03] shadow-[0_0_8px_rgba(0,217,146,0.08)]" : "border border-flash/[0.04] bg-flash/[0.02]"
        )}>
          {t.ideal && <span className="absolute -top-2 left-3 z-10 text-[8px] font-orbitron font-bold text-jade/70 bg-[#0a1214] border border-jade/25 px-1.5 py-0.5 rounded-[2px] uppercase tracking-[0.15em] leading-none">IDEAL</span>}
          <span className="text-[15px] font-orbitron font-bold text-jade/60 tabular-nums">{t.gold}g</span>
          <div className="w-[1px] h-full bg-flash/[0.06]" />
          <div className="flex gap-1.5">
            {t.items.map((itemId, i) => (
              <img key={i} src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt="" className="w-7 h-7 rounded-[2px]" />
            ))}
          </div>
          <div className="w-[1px] h-full bg-flash/[0.06]" />
          <span className="text-[13px] font-mono text-flash/45">{t.note}</span>
        </div>
      ))}
    </div>
  )
}

// ── Jungle Pathing ──
const MINIMAP_URL = "https://ddragon.leagueoflegends.com/cdn/14.10.1/img/map/map11.png"

function JungleMapView({ path }: { path: JunglePath }) {
  const camps = path.camps
  const side = path.side

  return (
    <div className="relative w-[280px] h-[280px] shrink-0 rounded-sm overflow-hidden border border-flash/[0.06]"
      style={{ perspective: "800px" }}>
      {/* 3D tilted minimap */}
      <div className="absolute inset-0" style={{ transform: "rotateX(8deg) scale(1.05)", transformOrigin: "center center" }}>
        <img src={MINIMAP_URL} alt="Summoner's Rift" className="w-full h-full object-cover opacity-60" draggable={false} />
        <div className="absolute inset-0 bg-liquirice/30" />
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.04) 3px, rgba(0,217,146,0.04) 4px)" }} />

      {/* Path lines connecting camps in order */}
      <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
        {camps.map((camp, i) => {
          if (i === 0) return null
          const prev = CAMP_POSITIONS[camps[i - 1]]
          const curr = CAMP_POSITIONS[camp]
          const p = prev[side], c = curr[side]
          const delay = 0.3 + i * 0.12
          return (
            <line key={i}
              x1={`${p.x}%`} y1={`${p.y}%`} x2={`${c.x}%`} y2={`${c.y}%`}
              stroke="rgba(0,217,146,0.15)" strokeWidth={1.5} strokeDasharray="4 3">
              <animate attributeName="stroke" values="rgba(0,217,146,0.15);rgba(0,217,146,0.7);rgba(0,217,146,0.25)" dur="0.4s" begin={`${delay}s`} fill="freeze" />
            </line>
          )
        })}
      </svg>

      {/* Camp markers — numbered */}
      {camps.map((camp, i) => {
        const pos = CAMP_POSITIONS[camp][side]
        const delay = 0.2 + i * 0.1
        return (
          <div key={i} className="absolute z-20 flex items-center justify-center"
            style={{
              left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)",
              animation: `campPop 0.3s ease-out ${delay}s both`,
            }}>
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-black/70 border border-jade/40 flex items-center justify-center shadow-[0_0_10px_rgba(0,217,146,0.3)]">
                <span className="text-[11px] font-orbitron font-bold text-jade">{i + 1}</span>
              </div>
              <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-[7px] font-mono text-flash/30">{CAMP_POSITIONS[camp].label}</span>
              </div>
            </div>
          </div>
        )
      })}

      {/* Side badge */}
      <div className={cn(
        "absolute top-2 right-2 z-20 px-2 py-0.5 rounded-sm text-[7px] font-orbitron uppercase tracking-[0.15em] border",
        side === "blue" ? "text-blue-300/70 border-blue-400/20 bg-blue-500/10" : "text-red-300/70 border-red-400/20 bg-red-500/10"
      )}>
        {side} side
      </div>

      <style>{`
        @keyframes campPop {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  )
}

function JunglePathView({ paths }: { paths: JunglePath[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null)
  if (!paths || paths.length === 0) return null
  const activePath = paths[activeIdx] ?? paths[0]

  return (
    <div>
      {/* Tabs */}
      {paths.length > 1 && (
        <div className="flex items-center gap-0 mb-4 border-b border-flash/[0.06]">
          {paths.map((p, idx) => {
            const isActive = activeIdx === idx
            return (
              <button key={idx} type="button" onClick={() => setActiveIdx(idx)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-[0.12em] transition-colors cursor-pointer",
                  isActive ? "text-jade" : "text-flash/25 hover:text-flash/50"
                )}>
                {p.name || `Path ${idx + 1}`}
                {(p.againstChampions ?? []).map(c => (
                  <img key={c} src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c}
                    className={cn("w-4 h-4 rounded-[1px] border border-flash/[0.06] transition-opacity", isActive ? "opacity-70" : "opacity-30")} />
                ))}
                {isActive && (
                  <motion.span layoutId="path-tab-underline"
                    className="absolute bottom-0 left-2 right-2 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
              </button>
            )
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={activeIdx}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex gap-6">
          {/* Map */}
          <JungleMapView path={activePath} />

          {/* Right — description & against */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-orbitron text-flash/60">{activePath.name}</h4>
              {(activePath.againstChampions ?? []).length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-mono text-flash/20 uppercase">vs</span>
                  {(activePath.againstChampions ?? []).map(c => (
                    <img key={c} src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c}
                      className="w-6 h-6 rounded-[2px] border border-flash/[0.08]" />
                  ))}
                </div>
              )}
            </div>

            {/* Camp order list */}
            <div className="flex items-center gap-1 flex-wrap">
              {activePath.camps.map((camp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-flash/[0.03] border border-flash/[0.06]">
                    <span className="text-[10px] font-orbitron text-jade/60">{i + 1}</span>
                    <span className="text-[10px] font-mono text-flash/40">{CAMP_POSITIONS[camp].label}</span>
                  </div>
                  {i < activePath.camps.length - 1 && (
                    <span className="text-flash/15 text-[8px]">&rarr;</span>
                  )}
                </div>
              ))}
            </div>

            {/* Description */}
            {activePath.description && (
              <LinkedDescription text={activePath.description} onHover={setHighlightedItemId} />
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function isSectionEmpty(s: GuideSection): boolean {
  if (s.type === "introduction") return !s.content?.trim()
  if (s.type === "matchups") return s.threats.length === 0 && s.synergies.length === 0
  if (s.type === "build") {
    const pages = (s as any).pages ?? (s.items ? [{ items: s.items }] : [])
    return pages.every((p: any) => {
      const steps = p.steps ?? (p.items ? p.items.map((id: number) => ({ items: [id] })) : [])
      return steps.length === 0
    })
  }
  if (s.type === "runes") {
    const pages = (s as any).pages ?? (s.primary ? [s] : [])
    return pages.length === 0 || pages.every((p: any) => !p.primary?.keystone && (!p.primary?.runes || p.primary.runes.length === 0))
  }
  if (s.type === "recommended_items") return !s.items || s.items.length === 0
  if (s.type === "back_timings") return s.timings.length === 0
  if (s.type === "jungle_pathing") {
    const paths = (s as any).paths ?? []
    return paths.length === 0 || paths.every((p: any) => p.camps.length === 0)
  }
  return false
}

// ── Main Viewer ──
export function GuideViewer({ guide }: { guide: Guide }) {
  return (
    <div className="space-y-8">
      {/* Sections */}
      {guide.sections.filter(s => s.visible && !isSectionEmpty(s)).map((section, idx) => (
        <SectionCard key={idx} title={section.title}>
          {section.type === "introduction" && <IntroView content={section.content} />}
          {section.type === "matchups" && <MatchupDisplay threats={section.threats} synergies={section.synergies} championId={guide.champion_id} />}
          {section.type === "build" && <MultiBuildView section={section} />}
          {section.type === "runes" && <MultiRunePageView section={section} />}
          {section.type === "recommended_items" && <RecommendedItemsView section={section} />}
          {section.type === "back_timings" && <BackTimingView timings={section.timings} />}
          {section.type === "jungle_pathing" && <JunglePathView paths={(section as any).paths} />}
        </SectionCard>
      ))}
    </div>
  )
}
