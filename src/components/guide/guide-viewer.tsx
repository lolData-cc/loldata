"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { cdnBaseUrl } from "@/config"
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes"
import { getRuneIcon, getRuneName, getRuneTree } from "@/constants/rune-tree-data"
import type { Guide, GuideSection, MatchupEntry, ThreatLevel, SynergyLevel, BuildStep } from "./types"
import { normalizeBuildPage } from "./types"
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
          stroke="rgba(0,217,146,0.15)" strokeWidth={1} />
      ))}
      {/* Pulse overlay lines */}
      {lines.map((l, i) => (
        <line key={`p${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(0,217,146,0)" strokeWidth={2}>
          <animate attributeName="stroke" values="rgba(0,217,146,0);rgba(0,217,146,0.8);rgba(0,217,146,0)" dur="0.4s" begin={`${delay}s`} fill="freeze" />
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

          {/* Build flow */}
          <BuildFlowView steps={activePage.steps} highlightedItemId={highlightedItemId ?? undefined} />
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

// ── Back Timings ──
function BackTimingView({ timings }: { timings: { gold: number; items: number[]; note: string }[] }) {
  return (
    <div className="space-y-2">
      {timings.map((t, idx) => (
        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-flash/[0.02] border border-flash/[0.04]">
          <span className="text-[14px] font-orbitron font-bold text-jade/60 tabular-nums min-w-[60px]">{t.gold}g</span>
          <div className="flex gap-1">
            {t.items.map((itemId, i) => (
              <img key={i} src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt="" className="w-6 h-6 rounded-[2px]" />
            ))}
          </div>
          <span className="text-[11px] font-mono text-flash/40 flex-1">{t.note}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main Viewer ──
export function GuideViewer({ guide }: { guide: Guide }) {
  return (
    <div className="space-y-8">
      {/* Sections */}
      {guide.sections.filter(s => s.visible).map((section, idx) => (
        <SectionCard key={idx} title={section.title}>
          {section.type === "introduction" && <IntroView content={section.content} />}
          {section.type === "matchups" && <MatchupDisplay threats={section.threats} synergies={section.synergies} championId={guide.champion_id} />}
          {section.type === "build" && <MultiBuildView section={section} />}
          {section.type === "runes" && (section.pages ?? (section.primary ? [{ name: "Default", primary: section.primary!, secondary: section.secondary! }] : [])).map((page: any, i: number) => (
            <div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-flash/[0.04]" : ""}>
              {page.name && <div className="text-[11px] font-orbitron text-flash/40 mb-2">{page.name}</div>}
              <RuneView primary={page.primary} secondary={page.secondary} />
            </div>
          ))}
          {section.type === "recommended_items" && <BuildView items={section.items} />}
          {section.type === "back_timings" && <BackTimingView timings={section.timings} />}
        </SectionCard>
      ))}
    </div>
  )
}
