"use client"

import { cn } from "@/lib/utils"
import { cdnBaseUrl } from "@/config"
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes"
import type { Guide, GuideSection, MatchupEntry, ThreatLevel, SynergyLevel } from "./types"
import { THREAT_LEVELS, SYNERGY_LEVELS } from "./types"
import { Link } from "react-router-dom"

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-sm border border-flash/[0.06] bg-flash/[0.015]", className)}>
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/20" />
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" }} />
      <div className="relative z-10 p-5">
        <div className="flex items-center gap-2 mb-4 border-b border-jade/10 pb-2">
          <div className="w-1 h-4 bg-jade" />
          <h3 className="text-flash text-xs font-mono uppercase tracking-[0.25em]">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Introduction ──
function IntroView({ content }: { content: string }) {
  return (
    <div className="text-[13px] font-mono text-flash/60 leading-relaxed whitespace-pre-wrap">{content}</div>
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
function BuildView({ items }: { items: number[] }) {
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

// ── Runes ──
function RuneView({ primary, secondary }: { primary: { tree: number; keystone: number; runes: number[] }; secondary: { tree: number; runes: number[] } }) {
  const keystoneIcon = getKeystoneIcon(primary.keystone)
  const keystoneName = getKeystoneName(primary.keystone) ?? ""
  const primaryTreeIcon = getStyleIcon(primary.tree)
  const secondaryTreeIcon = getStyleIcon(secondary.tree)
  const secondaryName = getStyleName(secondary.tree) ?? ""

  return (
    <div className="flex gap-6">
      {/* Primary */}
      <div className="flex items-center gap-3">
        {primaryTreeIcon && <img src={primaryTreeIcon} alt="" className="w-6 h-6 rounded-full opacity-40" />}
        {keystoneIcon && <img src={keystoneIcon} alt="" className="w-10 h-10 rounded-full border border-jade/20 shadow-[0_0_8px_rgba(0,217,146,0.15)]" />}
        <div>
          <div className="text-[12px] font-mono text-flash/60">{keystoneName}</div>
          <div className="text-[9px] font-mono text-flash/25">{getStyleName(primary.tree) ?? ""}</div>
        </div>
      </div>
      {/* Secondary */}
      <div className="flex items-center gap-2">
        {secondaryTreeIcon && <img src={secondaryTreeIcon} alt="" className="w-5 h-5 rounded-full opacity-30" />}
        <div className="text-[11px] font-mono text-flash/40">{secondaryName}</div>
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-mono font-bold text-flash">{guide.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            {guide.author_linked_account ? (
              <Link to={`/summoners/${guide.author_linked_account.replace("#", "-")}`} className="text-[11px] font-mono text-jade/50 hover:text-jade/80 transition-colors">
                by {guide.author_name ?? guide.author_linked_account}
              </Link>
            ) : (
              <span className="text-[11px] font-mono text-flash/30">by {guide.author_name ?? "Anonymous"}</span>
            )}
            {guide.patch && <span className="text-[9px] font-mono text-flash/20">Patch {guide.patch}</span>}
            {guide.role && <span className="text-[9px] font-mono text-jade/30 uppercase">{guide.role}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-flash/25">
          <span>{guide.views} views</span>
          <span>{guide.upvotes} upvotes</span>
        </div>
      </div>

      {/* Sections */}
      {guide.sections.filter(s => s.visible).map((section, idx) => (
        <SectionCard key={idx} title={section.title}>
          {section.type === "introduction" && <IntroView content={section.content} />}
          {section.type === "matchups" && <MatchupView threats={section.threats} synergies={section.synergies} />}
          {section.type === "build" && <BuildView items={section.items} />}
          {section.type === "runes" && <RuneView primary={section.primary} secondary={section.secondary} />}
          {section.type === "recommended_items" && <BuildView items={section.items} />}
          {section.type === "back_timings" && <BackTimingView timings={section.timings} />}
        </SectionCard>
      ))}
    </div>
  )
}
