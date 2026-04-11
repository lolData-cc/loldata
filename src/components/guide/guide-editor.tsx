"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { cdnBaseUrl, getCdnVersion } from "@/config"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import type { Guide, GuideSection, MatchupEntry, ThreatLevel, SynergyLevel, BuildStep } from "./types"
import { THREAT_LEVELS, SYNERGY_LEVELS, SECTION_TEMPLATES, normalizeBuildPage } from "./types"
import { Eye, EyeOff, GripVertical, ChevronDown, ChevronUp, Save, X, Search } from "lucide-react"
import { RuneTreeEditor } from "./rune-tree-editor"

// ── Champion search popup ──
function ChampionSearch({ onSelect, onClose }: { onSelect: (champId: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [champs, setChamps] = useState<{ id: string; name: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then(r => r.json())
      .then(data => {
        const list = Object.values<any>(data?.data ?? {}).map(c => ({ id: String(c.id), name: String(c.name) }))
        setChamps(list.sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const term = q.trim().toLowerCase()
  const filtered = term.length < 1 ? champs : champs.filter(c => c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term))

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-[420px] max-h-[460px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        style={{ background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }}
        onClick={e => e.stopPropagation()}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" }} />
        <div className="relative z-10 px-4 py-3 border-b border-jade/10">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-jade/30" />
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search champion..."
              className="flex-1 bg-transparent text-[13px] font-mono text-flash/70 placeholder:text-flash/20 focus:outline-none caret-jade" />
            <button type="button" onClick={onClose} className="text-flash/30 hover:text-flash/60 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="relative z-10 max-h-[380px] overflow-y-auto p-3 scrollbar-hide">
          <div className="grid grid-cols-7 gap-1.5">
            {filtered.slice(0, 70).map(c => (
              <button key={c.id} type="button" onClick={() => { onSelect(c.id); onClose() }}
                className="flex flex-col items-center gap-1 p-1.5 rounded-sm hover:bg-jade/[0.08] hover:shadow-[0_0_8px_rgba(0,217,146,0.1)] transition-all cursor-pointer group">
                <img src={`${cdnBaseUrl()}/img/champion/${c.id}.png`} alt={c.name}
                  className="w-9 h-9 rounded-[3px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" />
                <span className="text-[7px] font-mono text-flash/25 group-hover:text-jade/50 truncate w-full text-center transition-colors">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Item search popup ──
function ItemSearch({ onSelect, onClose }: { onSelect: (itemId: number, itemName: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [items, setItems] = useState<{ id: number; name: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
      .then(r => r.json())
      .then(data => {
        const list: { id: number; name: string }[] = []
        for (const [id, item] of Object.entries<any>(data?.data ?? {})) {
          // Filter to completed items (no builds into, purchasable, costs >= 1000, available on SR)
          if ((!item.into || item.into.length === 0) && item.gold?.purchasable !== false && (item.gold?.total ?? 0) >= 400 && item.maps?.["11"] !== false) {
            list.push({ id: Number(id), name: item.name })
          }
        }
        setItems(list.sort((a, b) => a.name.localeCompare(b.name)))
      })
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const term = q.trim().toLowerCase()
  const filtered = term.length < 1 ? items : items.filter(i => i.name.toLowerCase().includes(term))

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-[460px] max-h-[460px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        style={{ background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }}
        onClick={e => e.stopPropagation()}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" }} />
        <div className="relative z-10 px-4 py-3 border-b border-jade/10">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-jade/30" />
            <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search item..."
              className="flex-1 bg-transparent text-[13px] font-mono text-flash/70 placeholder:text-flash/20 focus:outline-none caret-jade" />
            <button type="button" onClick={onClose} className="text-flash/30 hover:text-flash/60 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="relative z-10 max-h-[380px] overflow-y-auto p-3 scrollbar-hide">
          <div className="grid grid-cols-8 gap-1.5">
            {filtered.slice(0, 80).map(i => (
              <button key={i.id} type="button" onClick={() => { onSelect(i.id, i.name); onClose() }}
                className="flex flex-col items-center gap-1 p-1 rounded-sm hover:bg-jade/[0.08] hover:shadow-[0_0_8px_rgba(0,217,146,0.1)] transition-all cursor-pointer group">
                <img src={`${cdnBaseUrl()}/img/item/${i.id}.png`} alt={i.name}
                  className="w-8 h-8 rounded-[2px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" />
                <span className="text-[6px] font-mono text-flash/20 group-hover:text-jade/40 truncate w-full text-center leading-tight transition-colors">{i.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Section Header (collapsible, draggable, toggle visibility) ──
function SectionHeader({ title, type, visible, collapsed, onTitleChange, onToggleVisible, onToggleCollapse }: {
  title: string; type: string; visible: boolean; collapsed: boolean
  onTitleChange: (t: string) => void; onToggleVisible: () => void; onToggleCollapse: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-flash/[0.04] bg-flash/[0.01]">
      <GripVertical className="w-3.5 h-3.5 text-flash/12 cursor-grab shrink-0" />
      <div className="w-1 h-5 bg-jade/30 rounded-full shrink-0" />
      <span className="text-[9px] font-orbitron text-jade/30 uppercase tracking-[0.15em] shrink-0">{type}</span>
      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="flex-1 bg-transparent text-[14px] font-orbitron text-flash/50 focus:outline-none focus:text-flash/80 border-b border-transparent focus:border-jade/15 px-1 transition-colors"
      />
      <button type="button" onClick={onToggleVisible} className={cn("transition-colors", visible ? "text-jade/30 hover:text-jade/60" : "text-red-400/30 hover:text-red-400/60")} title={visible ? "Visible" : "Hidden"}>
        {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>
      <button type="button" onClick={onToggleCollapse} className="text-flash/20 hover:text-flash/50 transition-colors">
        {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ── Intro Editor ──
function IntroEditor({ section, onChange }: { section: GuideSection & { type: "introduction" }; onChange: (s: GuideSection) => void }) {
  return (
    <textarea
      value={section.content}
      onChange={(e) => onChange({ ...section, content: e.target.value })}
      placeholder="Write your introduction... Describe yourself, your experience with this champion, and what this guide covers."
      className="w-full h-28 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[12px] font-mono text-flash/50 placeholder:text-flash/15 resize-y focus:outline-none focus:border-jade/15 transition-colors"
    />
  )
}

// ── Build Editor (with item picker) ──
function BuildEditor({ section, onChange }: { section: GuideSection & { type: "build" | "recommended_items" }; onChange: (s: GuideSection) => void }) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {section.items.map((itemId, idx) => (
          <div key={idx} className="group relative">
            <img src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt="" className="w-10 h-10 rounded-[2px] border border-flash/[0.08] transition-transform group-hover:scale-105" />
            <button type="button" onClick={() => onChange({ ...section, items: section.items.filter((_, i) => i !== idx) })}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setShowPicker(true)}
          className="w-10 h-10 rounded-[2px] border border-dashed border-flash/[0.1] flex items-center justify-center text-flash/20 hover:text-jade/40 hover:border-jade/20 transition-colors cursor-pointer">
          <span className="text-[16px]">+</span>
        </button>
      </div>
      {showPicker && <ItemSearch onSelect={(id) => onChange({ ...section, items: [...section.items, id] })} onClose={() => setShowPicker(false)} />}
    </div>
  )
}

// ── Matchup Editor (with champion picker) ──
function MatchupEditor({ section, onChange }: { section: GuideSection & { type: "matchups" }; onChange: (s: GuideSection) => void }) {
  const [showPicker, setShowPicker] = useState<"threats" | "synergies" | null>(null)
  const [pendingLevel, setPendingLevel] = useState<string>("even")
  const [pendingNote, setPendingNote] = useState("")
  const [editingNoteIdx, setEditingNoteIdx] = useState<{ type: "threats" | "synergies"; idx: number } | null>(null)

  const addChampion = (champId: string, type: "threats" | "synergies") => {
    const entry: MatchupEntry = { championId: champId, level: pendingLevel as any, note: pendingNote }
    if (type === "threats") {
      onChange({ ...section, threats: [...section.threats, entry] })
    } else {
      onChange({ ...section, synergies: [...section.synergies, entry] })
    }
    setPendingNote("")
  }

  const removeEntry = (type: "threats" | "synergies", idx: number) => {
    if (type === "threats") onChange({ ...section, threats: section.threats.filter((_, i) => i !== idx) })
    else onChange({ ...section, synergies: section.synergies.filter((_, i) => i !== idx) })
  }

  const updateNote = (type: "threats" | "synergies", idx: number, note: string) => {
    if (type === "threats") onChange({ ...section, threats: section.threats.map((e, i) => i === idx ? { ...e, note } : e) })
    else onChange({ ...section, synergies: section.synergies.map((e, i) => i === idx ? { ...e, note } : e) })
  }

  const updateLevel = (type: "threats" | "synergies", idx: number, level: string) => {
    if (type === "threats") onChange({ ...section, threats: section.threats.map((e, i) => i === idx ? { ...e, level: level as any } : e) })
    else onChange({ ...section, synergies: section.synergies.map((e, i) => i === idx ? { ...e, level: level as any } : e) })
  }

  const renderGroup = (entries: MatchupEntry[], type: "threats" | "synergies") => {
    const levels = type === "threats" ? THREAT_LEVELS : SYNERGY_LEVELS
    const accent = type === "threats" ? "red-400" : "jade"
    return (
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className={cn("text-[9px] font-mono uppercase tracking-[0.2em]", type === "threats" ? "text-red-400/40" : "text-jade/40")}>
            {type === "threats" ? "Threats" : "Synergies"} ({entries.length})
          </span>
          <button type="button" onClick={() => setShowPicker(type)}
            className={cn("text-[9px] font-mono px-2 py-0.5 rounded-sm border transition-colors cursor-pointer",
              type === "threats" ? "text-red-400/40 border-red-400/15 hover:text-red-400/70 hover:border-red-400/30" : "text-jade/40 border-jade/15 hover:text-jade/70 hover:border-jade/30"
            )}>+ Add</button>
        </div>
        <div className="space-y-1">
          {entries.map((e, idx) => (
            <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-flash/[0.02] border border-flash/[0.04] group">
              <img src={`${cdnBaseUrl()}/img/champion/${e.championId}.png`} alt="" className="w-7 h-7 rounded-[2px] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-flash/50">{e.championId}</div>
                <input
                  value={e.note}
                  onChange={(ev) => updateNote(type, idx, ev.target.value)}
                  placeholder="Add note..."
                  className="w-full bg-transparent text-[9px] font-mono text-flash/30 placeholder:text-flash/15 focus:outline-none focus:text-flash/50 border-none"
                />
              </div>
              <select value={e.level} onChange={(ev) => updateLevel(type, idx, ev.target.value)}
                className="bg-[#0a1214] text-[8px] font-mono text-flash/40 border border-flash/[0.08] rounded-sm px-1.5 py-0.5 focus:outline-none focus:border-jade/20 cursor-pointer appearance-none">
                {levels.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
              <button type="button" onClick={() => removeEntry(type, idx)}
                className="text-red-400/0 group-hover:text-red-400/40 hover:text-red-400/80 transition-colors cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Level selector for next add */}
      <div className="flex items-center gap-2 mb-3 text-[9px] font-mono text-flash/25">
        <span>Default level:</span>
        <select value={pendingLevel} onChange={e => setPendingLevel(e.target.value)}
          className="bg-[#0a1214] border border-flash/[0.08] rounded-sm px-2 py-0.5 text-flash/40 focus:outline-none focus:border-jade/20 cursor-pointer appearance-none">
          {[...THREAT_LEVELS, ...SYNERGY_LEVELS].map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {renderGroup(section.threats, "threats")}
        {renderGroup(section.synergies, "synergies")}
      </div>
      {showPicker && (
        <ChampionSearch
          onSelect={(id) => addChampion(id, showPicker)}
          onClose={() => setShowPicker(null)}
        />
      )}
    </div>
  )
}

// ── Back Timing Editor ──
function BackTimingEditor({ section, onChange }: { section: GuideSection & { type: "back_timings" }; onChange: (s: GuideSection) => void }) {
  const [showItemPicker, setShowItemPicker] = useState(false)
  const [pendingGold, setPendingGold] = useState("")
  const [pendingItems, setPendingItems] = useState<number[]>([])
  const [pendingNote, setPendingNote] = useState("")

  const addTiming = () => {
    const g = Number(pendingGold)
    if (!g || pendingItems.length === 0) return
    onChange({ ...section, timings: [...section.timings, { gold: g, items: pendingItems, note: pendingNote }] })
    setPendingGold("")
    setPendingItems([])
    setPendingNote("")
  }

  return (
    <div>
      <div className="space-y-1.5 mb-4">
        {section.timings.map((t, idx) => (
          <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-sm bg-flash/[0.02] border border-flash/[0.04] group">
            <span className="text-[13px] font-orbitron font-bold text-jade/50 tabular-nums min-w-[55px]">{t.gold}g</span>
            <div className="flex gap-1">
              {t.items.map((id, i) => <img key={i} src={`${cdnBaseUrl()}/img/item/${id}.png`} alt="" className="w-6 h-6 rounded-[2px]" />)}
            </div>
            <span className="text-[10px] font-mono text-flash/35 flex-1">{t.note}</span>
            <button type="button" onClick={() => onChange({ ...section, timings: section.timings.filter((_, i) => i !== idx) })}
              className="text-red-400/0 group-hover:text-red-400/40 hover:text-red-400/80 transition-colors cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      {/* Add new timing */}
      <div className="flex gap-2 items-center flex-wrap px-3 py-2 rounded-sm border border-dashed border-flash/[0.06]">
        <input value={pendingGold} onChange={e => setPendingGold(e.target.value)} placeholder="Gold" type="number"
          className="w-16 bg-transparent text-[12px] font-orbitron text-jade/40 placeholder:text-flash/15 focus:outline-none border-b border-flash/[0.06] focus:border-jade/20 transition-colors" />
        <div className="flex gap-1">
          {pendingItems.map((id, i) => (
            <div key={i} className="relative group">
              <img src={`${cdnBaseUrl()}/img/item/${id}.png`} alt="" className="w-6 h-6 rounded-[2px]" />
              <button type="button" onClick={() => setPendingItems(prev => prev.filter((_, j) => j !== i))}
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500/80 text-white text-[6px] flex items-center justify-center opacity-0 group-hover:opacity-100">x</button>
            </div>
          ))}
          <button type="button" onClick={() => setShowItemPicker(true)}
            className="w-6 h-6 rounded-[2px] border border-dashed border-flash/[0.1] flex items-center justify-center text-flash/15 hover:text-jade/30 transition-colors cursor-pointer text-[10px]">+</button>
        </div>
        <input value={pendingNote} onChange={e => setPendingNote(e.target.value)} placeholder="Note (e.g. Vampiric Sceptre + Potion)"
          className="flex-1 bg-transparent text-[10px] font-mono text-flash/40 placeholder:text-flash/15 focus:outline-none border-b border-flash/[0.06] focus:border-jade/20 transition-colors" />
        <button type="button" onClick={addTiming} disabled={!pendingGold || pendingItems.length === 0}
          className={cn("text-[9px] font-mono px-2.5 py-1 rounded-sm border transition-colors",
            pendingGold && pendingItems.length > 0 ? "text-jade/60 border-jade/20 hover:text-jade hover:border-jade/40 cursor-pointer" : "text-flash/15 border-flash/[0.04]"
          )}>Add</button>
      </div>
      {showItemPicker && <ItemSearch onSelect={(id) => { setPendingItems(prev => [...prev, id]); setShowItemPicker(false) }} onClose={() => setShowItemPicker(false)} />}
    </div>
  )
}

// ── Multi-page rune editor ──
function MultiRuneEditor({ section, onChange }: { section: GuideSection & { type: "runes" }; onChange: (s: GuideSection) => void }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const pages = (section as any).pages ?? (section.primary ? [{ name: "Default", primary: section.primary, secondary: section.secondary, shards: section.shards }] : [])
  const activePage = pages[activeIdx]

  const updatePage = (idx: number, page: any) => {
    const newPages = [...pages]; newPages[idx] = page
    onChange({ ...section, pages: newPages } as any)
  }
  const addPage = () => {
    const newPages = [...pages, { name: `Rune Page ${pages.length + 1}`, primary: { tree: 8000, keystone: 8010, runes: [] }, secondary: { tree: 8400, runes: [] }, shards: [] }]
    onChange({ ...section, pages: newPages } as any)
    setActiveIdx(newPages.length - 1)
  }
  const removePage = (idx: number) => {
    if (pages.length <= 1) return
    const newPages = pages.filter((_: any, i: number) => i !== idx)
    onChange({ ...section, pages: newPages } as any)
    if (activeIdx >= newPages.length) setActiveIdx(newPages.length - 1)
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4 border-b border-flash/[0.04] pb-2">
        {pages.map((p: any, idx: number) => (
          <button key={idx} type="button" onClick={() => setActiveIdx(idx)}
            className={cn(
              "group relative px-3 py-1.5 rounded-sm text-[10px] font-mono transition-all cursor-pointer",
              activeIdx === idx
                ? "bg-jade/[0.1] text-jade/80 border border-jade/25"
                : "text-flash/30 hover:text-flash/60 border border-transparent hover:border-flash/[0.08]"
            )}>
            {p.name || `Page ${idx + 1}`}
            {pages.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); removePage(idx) }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">x</span>
            )}
          </button>
        ))}
        <button type="button" onClick={addPage}
          className="text-[9px] font-orbitron text-jade/30 hover:text-jade/60 px-2.5 py-1.5 border border-dashed border-jade/15 hover:border-jade/30 rounded-sm transition-colors cursor-pointer">
          + Page
        </button>
      </div>
      {activePage && (
        <RuneTreeEditor
          value={activePage}
          onChange={(v) => updatePage(activeIdx, { ...activePage, primary: v.primary, secondary: v.secondary, shards: v.shards })}
          title={activePage.name}
          onTitleChange={(t) => updatePage(activeIdx, { ...activePage, name: t })}
          description={activePage.description ?? ""}
          onDescriptionChange={(d) => updatePage(activeIdx, { ...activePage, description: d })}
          againstChampions={activePage.againstChampions ?? []}
          onAgainstChange={(c) => updatePage(activeIdx, { ...activePage, againstChampions: c })}
          againstClasses={activePage.againstClasses ?? []}
          onAgainstClassesChange={(c) => updatePage(activeIdx, { ...activePage, againstClasses: c })}
        />
      )}
    </div>
  )
}

// ── Multi-Build Editor (tabbed, with step-based flow + "use against") ──
function MultiBuildEditor({ section, onChange }: { section: GuideSection & { type: "build" }; onChange: (s: GuideSection) => void }) {
  const [activeIdx, setActiveIdx] = useState(0)
  // Normalize pages
  const rawPages = (section as any).pages ?? (section.items ? [{ name: "Default Build", items: section.items }] : [{ name: "Default Build", steps: [] }])
  const pages = rawPages.map((p: any) => normalizeBuildPage(p))
  const activePage = pages[activeIdx]
  const [pickerTarget, setPickerTarget] = useState<{ mode: "step"; stepIdx: number } | { mode: "new" } | null>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const [showChampPicker, setShowChampPicker] = useState(false)
  const [champList, setChampList] = useState<{ id: string; name: string }[]>([])
  const [champSearch, setChampSearch] = useState("")

  const CLASSES = [
    { key: "Fighter", label: "Fighter" },
    { key: "Tank", label: "Tank" },
    { key: "Mage", label: "Mage" },
    { key: "Assassin", label: "Assassin" },
    { key: "Marksman", label: "Marksman" },
    { key: "Support", label: "Support" },
  ]

  const updatePage = (idx: number, page: any) => {
    const newPages = [...pages]; newPages[idx] = page
    onChange({ ...section, pages: newPages, items: undefined } as any)
  }
  const addPage = () => {
    const newPages = [...pages, { name: `Build ${pages.length + 1}`, steps: [] }]
    onChange({ ...section, pages: newPages, items: undefined } as any)
    setActiveIdx(newPages.length - 1)
  }
  const removePage = (idx: number) => {
    if (pages.length <= 1) return
    const newPages = pages.filter((_: any, i: number) => i !== idx)
    onChange({ ...section, pages: newPages, items: undefined } as any)
    if (activeIdx >= newPages.length) setActiveIdx(newPages.length - 1)
  }

  const updateSteps = (newSteps: BuildStep[]) => {
    updatePage(activeIdx, { ...activePage, steps: newSteps })
  }

  const addItemToStep = (stepIdx: number, itemId: number) => {
    const newSteps = [...activePage.steps]
    newSteps[stepIdx] = { ...newSteps[stepIdx], items: [...newSteps[stepIdx].items, itemId] }
    updateSteps(newSteps)
  }

  const addNewStep = (itemId: number) => {
    updateSteps([...activePage.steps, { items: [itemId] }])
  }

  const removeItemFromStep = (stepIdx: number, itemIdx: number) => {
    const newSteps = [...activePage.steps]
    const newItems = newSteps[stepIdx].items.filter((_, i) => i !== itemIdx)
    if (newItems.length === 0) {
      // Remove the entire step
      newSteps.splice(stepIdx, 1)
    } else {
      newSteps[stepIdx] = { ...newSteps[stepIdx], items: newItems }
    }
    updateSteps(newSteps)
  }

  const handlePickerSelect = (itemId: number) => {
    if (!pickerTarget) return
    if (pickerTarget.mode === "step") addItemToStep(pickerTarget.stepIdx, itemId)
    else addNewStep(itemId)
    setPickerTarget(null)
  }

  const loadChamps = () => {
    if (champList.length === 0) {
      fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
        .then(r => r.json())
        .then(data => {
          const list = Object.values<any>(data?.data ?? {}).map(c => ({ id: String(c.id), name: String(c.name) }))
          setChampList(list.sort((a, b) => a.name.localeCompare(b.name)))
        })
        .catch(() => {})
    }
    setShowChampPicker(true)
  }

  const toggleClass = (cls: string) => {
    const current = activePage.againstClasses ?? []
    const updated = current.includes(cls) ? current.filter((x: string) => x !== cls) : [...current, cls]
    updatePage(activeIdx, { ...activePage, againstClasses: updated })
  }

  const steps: BuildStep[] = activePage?.steps ?? []

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1.5 mb-4 border-b border-flash/[0.04] pb-2">
        {pages.map((p: any, idx: number) => (
          <button key={idx} type="button" onClick={() => setActiveIdx(idx)}
            className={cn(
              "group relative px-3 py-1.5 rounded-sm text-[10px] font-mono transition-all cursor-pointer",
              activeIdx === idx
                ? "bg-jade/[0.1] text-jade/80 border border-jade/25"
                : "text-flash/30 hover:text-flash/60 border border-transparent hover:border-flash/[0.08]"
            )}>
            {p.name || `Build ${idx + 1}`}
            {pages.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); removePage(idx) }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">x</span>
            )}
          </button>
        ))}
        <button type="button" onClick={addPage}
          className="text-[9px] font-orbitron text-jade/30 hover:text-jade/60 px-2.5 py-1.5 border border-dashed border-jade/15 hover:border-jade/30 rounded-sm transition-colors cursor-pointer">
          + Build
        </button>
      </div>

      {activePage && (
        <div>
          {/* Build name + against (row) */}
          <div className="flex items-start gap-4 mb-4">
            <input
              value={activePage.name}
              onChange={e => updatePage(activeIdx, { ...activePage, name: e.target.value })}
              placeholder="e.g. Build vs Tanks"
              className="flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[13px] font-orbitron text-flash/60 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-mono text-flash/25 uppercase tracking-wider">vs</span>
              {(activePage.againstClasses ?? []).map((cls: string) => (
                <div key={cls} className="relative group">
                  <img src={`https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`} alt={cls}
                    className="w-7 h-7 object-contain" style={{ filter: "brightness(1.2)" }} />
                  <button type="button" onClick={() => updatePage(activeIdx, { ...activePage, againstClasses: (activePage.againstClasses ?? []).filter((x: string) => x !== cls) })}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">x</button>
                </div>
              ))}
              {(activePage.againstChampions ?? []).map((c: string) => (
                <div key={c} className="relative group">
                  <img src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c} className="w-7 h-7 rounded-[2px] border border-flash/[0.08]" />
                  <button type="button" onClick={() => updatePage(activeIdx, { ...activePage, againstChampions: (activePage.againstChampions ?? []).filter((x: string) => x !== c) })}
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">x</button>
                </div>
              ))}
              <button type="button" onClick={loadChamps}
                className="w-7 h-7 rounded-[2px] border border-dashed border-jade/20 hover:border-jade/40 flex items-center justify-center text-jade/30 hover:text-jade/60 transition-colors cursor-pointer text-[12px]">+</button>
            </div>
          </div>

          {/* Description with item linker */}
          <div className="mb-4">
            <textarea
              ref={descRef}
              value={activePage.description ?? ""}
              onChange={e => updatePage(activeIdx, { ...activePage, description: e.target.value })}
              placeholder="Describe this build path... Select text then click an item below to link it"
              className="w-full h-16 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-flash/40 placeholder:text-flash/15 resize-y focus:outline-none focus:border-jade/15 transition-colors"
            />
            {/* Item chips from build — click to link selected text */}
            {(() => {
              const allItems = [...new Set(steps.flatMap(s => s.items))]
              if (allItems.length === 0) return null
              return (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[8px] font-mono text-flash/20 uppercase tracking-wider shrink-0">Link item:</span>
                  {allItems.map(itemId => (
                    <button key={itemId} type="button"
                      onClick={() => {
                        const ta = descRef.current
                        if (!ta) return
                        const desc = activePage.description ?? ""
                        const start = ta.selectionStart
                        const end = ta.selectionEnd
                        const selected = desc.slice(start, end)
                        if (selected) {
                          // Wrap selected text with item link
                          const linked = `[${selected}](${itemId})`
                          const newDesc = desc.slice(0, start) + linked + desc.slice(end)
                          updatePage(activeIdx, { ...activePage, description: newDesc })
                        } else {
                          // Insert item link at cursor with item ID as placeholder text
                          const linked = `[item](${itemId})`
                          const newDesc = desc.slice(0, start) + linked + desc.slice(end)
                          updatePage(activeIdx, { ...activePage, description: newDesc })
                        }
                        ta.focus()
                      }}
                      className="group relative cursor-pointer"
                      title="Select text in description, then click to link it to this item">
                      <img src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt=""
                        className="w-7 h-7 rounded-[2px] border border-flash/[0.08] group-hover:border-jade/30 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)] transition-all" />
                    </button>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* ── Build flow ── */}
          <div className="flex items-center overflow-x-auto pb-2">
            {steps.map((step, stepIdx) => {
              const nextStep = steps[stepIdx + 1]
              const ITEM_SZ = 44, GAP = 6, CONN = 44
              const curH = step.items.length * ITEM_SZ + (step.items.length - 1) * GAP
              const nextH = nextStep ? nextStep.items.length * ITEM_SZ + (nextStep.items.length - 1) * GAP : 0
              const svgH = Math.max(curH, nextH, ITEM_SZ)
              // Y centers for current step items
              const curYs = step.items.map((_, i) => {
                const top = (svgH - curH) / 2; return top + i * (ITEM_SZ + GAP) + ITEM_SZ / 2
              })
              // Y centers for next step items
              const nextYs = nextStep ? nextStep.items.map((_, i) => {
                const top = (svgH - nextH) / 2; return top + i * (ITEM_SZ + GAP) + ITEM_SZ / 2
              }) : []

              return (
                <div key={stepIdx} className="flex items-center shrink-0">
                  {/* Step: vertical stack of items */}
                  <div className="flex flex-col items-center gap-1.5">
                    {step.items.map((itemId, itemIdx) => (
                      <div key={itemIdx} className="group relative">
                        <img src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt=""
                          className="w-11 h-11 rounded-[3px] border border-flash/[0.08] transition-all group-hover:scale-105 group-hover:border-jade/20" />
                        <button type="button" onClick={() => removeItemFromStep(stepIdx, itemIdx)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    {/* Add alternative to this step */}
                    <button type="button" onClick={() => setPickerTarget({ mode: "step", stepIdx })}
                      className="w-7 h-7 rounded-[2px] border border-dashed border-flash/[0.06] flex items-center justify-center text-flash/15 hover:text-jade/30 hover:border-jade/15 transition-colors cursor-pointer text-[10px]"
                      title="Add alternative item to this step">
                      OR
                    </button>
                  </div>

                  {/* SVG connector lines */}
                  {nextStep && (
                    <svg width={CONN} height={svgH} className="shrink-0" style={{ minHeight: svgH }}>
                      {curYs.flatMap(fy => nextYs.map((ty, i) => (
                        <line key={`${fy}-${i}`} x1={0} y1={fy} x2={CONN} y2={ty}
                          stroke="rgba(0,217,146,0.2)" strokeWidth={1} />
                      )))}
                    </svg>
                  )}

                  {/* Simple horizontal line to "+" button at end */}
                  {!nextStep && (
                    <svg width={CONN} height={ITEM_SZ} className="shrink-0">
                      <line x1={0} y1={ITEM_SZ / 2} x2={CONN} y2={ITEM_SZ / 2}
                        stroke="rgba(0,217,146,0.15)" strokeWidth={1} strokeDasharray="3 3" />
                    </svg>
                  )}
                </div>
              )
            })}

            {/* Add new step at end */}
            <button type="button" onClick={() => setPickerTarget({ mode: "new" })}
              className="w-11 h-11 shrink-0 rounded-[3px] border border-dashed border-flash/[0.1] flex items-center justify-center text-flash/20 hover:text-jade/40 hover:border-jade/20 transition-colors cursor-pointer">
              <span className="text-[16px]">+</span>
            </button>
          </div>

          {steps.length === 0 && (
            <div className="text-[10px] font-mono text-flash/20 mt-1">Click + to add the first item in your build path</div>
          )}
        </div>
      )}

      {/* Item picker */}
      {pickerTarget && <ItemSearch onSelect={handlePickerSelect} onClose={() => setPickerTarget(null)} />}

      {/* Champion picker portal */}
      {showChampPicker && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={() => setShowChampPicker(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-[480px] max-h-[520px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            style={{ background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }}
            onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 pointer-events-none opacity-15"
              style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" }} />
            {/* Class icons */}
            <div className="relative z-10 flex justify-center gap-4 px-4 py-4 border-b border-flash/[0.04]">
              {CLASSES.map(cls => {
                const active = (activePage.againstClasses ?? []).includes(cls.key)
                return (
                  <button key={cls.key} type="button"
                    onClick={() => toggleClass(cls.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer",
                      active ? "scale-110" : "opacity-35 hover:opacity-65 hover:scale-105"
                    )}>
                    <img src={`https://cdn2.loldata.cc/img/class/${cls.key.toLowerCase()}.png`} alt={cls.label}
                      className="w-9 h-9 object-contain"
                      style={active ? { filter: "brightness(1.4) drop-shadow(0 0 8px rgba(0,217,146,0.5))" } : { filter: "brightness(0.7)" }} />
                    <span className={cn("text-[7px] font-orbitron uppercase tracking-wider transition-colors",
                      active ? "text-jade/80" : "text-flash/20"
                    )}>{cls.label}</span>
                  </button>
                )
              })}
            </div>
            {/* Search */}
            <div className="relative z-10 px-4 py-2.5 border-b border-jade/10">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-jade/30" />
                <input value={champSearch} onChange={e => setChampSearch(e.target.value)} placeholder="Or search a specific champion..."
                  className="flex-1 bg-transparent text-[12px] font-mono text-flash/60 placeholder:text-flash/20 focus:outline-none caret-jade" autoFocus />
                <button type="button" onClick={() => setShowChampPicker(false)} className="text-flash/30 hover:text-flash/60 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {/* Champion grid */}
            <div className="relative z-10 max-h-[340px] overflow-y-auto p-3 scrollbar-hide">
              <div className="grid grid-cols-8 gap-1.5">
                {champList.filter(c => !champSearch || c.name.toLowerCase().includes(champSearch.toLowerCase())).slice(0, 80).map(c => (
                  <button key={c.id} type="button" onClick={() => {
                    updatePage(activeIdx, { ...activePage, againstChampions: [...(activePage.againstChampions ?? []).filter((x: string) => x !== c.id), c.id] })
                    setShowChampPicker(false)
                    setChampSearch("")
                  }}
                    className="flex flex-col items-center gap-1 p-1 rounded-sm hover:bg-jade/[0.08] hover:shadow-[0_0_8px_rgba(0,217,146,0.1)] transition-all cursor-pointer group">
                    <img src={`${cdnBaseUrl()}/img/champion/${c.id}.png`} alt={c.name}
                      className="w-9 h-9 rounded-[3px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" />
                    <span className="text-[6px] font-mono text-flash/20 group-hover:text-jade/40 truncate w-full text-center transition-colors">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Section wrapper ──
function SectionEditor({ section, onChange, onMoveUp, onMoveDown, isFirst, isLast }: {
  section: GuideSection; onChange: (s: GuideSection) => void
  onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const typeLabel = { introduction: "Intro", matchups: "Matchups", build: "Build", runes: "Runes", recommended_items: "Items", back_timings: "Backs" }[section.type] ?? section.type

  return (
    <div className={cn(
      "relative overflow-hidden rounded-sm border transition-all duration-300",
      section.visible ? "border-flash/[0.06] bg-flash/[0.008]" : "border-flash/[0.03] opacity-40"
    )}
    style={{ animation: "sectionReveal 0.3s ease-out forwards" }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/15" />
      <div className="absolute inset-0 pointer-events-none opacity-15"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,217,146,0.008) 4px, rgba(0,217,146,0.008) 5px)" }} />

      <SectionHeader
        title={section.title} type={typeLabel} visible={section.visible} collapsed={collapsed}
        onTitleChange={t => onChange({ ...section, title: t })}
        onToggleVisible={() => onChange({ ...section, visible: !section.visible })}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Move buttons */}
      <div className="absolute right-12 top-2 flex gap-0.5">
        {!isFirst && <button type="button" onClick={onMoveUp} className="text-flash/15 hover:text-flash/40 transition-colors" title="Move up"><ChevronUp className="w-3 h-3" /></button>}
        {!isLast && <button type="button" onClick={onMoveDown} className="text-flash/15 hover:text-flash/40 transition-colors" title="Move down"><ChevronDown className="w-3 h-3" /></button>}
      </div>

      {!collapsed && (
        <div className="relative z-10 p-4">
          {section.type === "introduction" && <IntroEditor section={section} onChange={onChange} />}
          {section.type === "matchups" && <MatchupEditor section={section} onChange={onChange} />}
          {section.type === "build" && <MultiBuildEditor section={section as any} onChange={onChange} />}
          {section.type === "recommended_items" && <BuildEditor section={section as any} onChange={onChange} />}
          {section.type === "runes" && (
            <MultiRuneEditor section={section} onChange={onChange} />
          )}
          {section.type === "back_timings" && <BackTimingEditor section={section} onChange={onChange} />}
        </div>
      )}
    </div>
  )
}

// ── Main Editor ──
export function GuideEditor({ championId, existingGuide, onSave }: {
  championId: string; existingGuide?: Guide | null; onSave?: (guide: Guide) => void
}) {
  const { session, nametag } = useAuth()
  const [title, setTitle] = useState(existingGuide?.title ?? `${championId} Guide`)
  const [role, setRole] = useState(existingGuide?.role ?? "")
  const [linkedAccount, setLinkedAccount] = useState(existingGuide?.author_linked_account ?? "")
  const [discord, setDiscord] = useState(existingGuide?.author_discord ?? "")
  const [twitter, setTwitter] = useState(existingGuide?.author_twitter ?? "")
  const [reddit, setReddit] = useState(existingGuide?.author_reddit ?? "")
  const [sections, setSections] = useState<GuideSection[]>(existingGuide?.sections ?? [
    SECTION_TEMPLATES.introduction(),
    SECTION_TEMPLATES.recommended_items(),
    SECTION_TEMPLATES.build(),
    SECTION_TEMPLATES.runes(),
    SECTION_TEMPLATES.matchups(),
    SECTION_TEMPLATES.back_timings(),
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const updateSection = useCallback((idx: number, section: GuideSection) => {
    setSections(prev => prev.map((s, i) => i === idx ? section : s))
  }, [])

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    setSections(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }, [])

  const save = async () => {
    if (!session?.user) { setError("You must be logged in"); return }
    setSaving(true); setError(null); setSuccess(false)
    try {
      const guideData = {
        champion_id: championId,
        author_id: session.user.id,
        author_name: nametag ?? session.user.email ?? "Anonymous",
        author_linked_account: linkedAccount || null,
        author_discord: discord || null,
        author_twitter: twitter || null,
        author_reddit: reddit || null,
        title, patch: null, role: role || null, sections,
        updated_at: new Date().toISOString(),
      }
      if (existingGuide?.id) {
        const { error: err } = await supabase.from("guides").update(guideData).eq("id", existingGuide.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from("guides").insert(guideData)
        if (err) throw err
      }
      setSuccess(true)
      setTimeout(() => onSave?.(guideData as any), 500)
    } catch (e: any) {
      setError(e.message ?? "Failed to save")
    } finally { setSaving(false) }
  }

  if (!session?.user) {
    return (
      <div className="text-center py-16">
        <div className="text-[14px] font-mono text-flash/30">Log in to create a guide</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes sectionReveal { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Guide meta */}
      <div className="relative overflow-hidden rounded-sm border border-flash/[0.06] bg-flash/[0.01] p-4">
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/25" />
        <div className="space-y-3">
          <div className="flex gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Guide title"
              className="flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[14px] font-mono text-flash/60 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" />
            <select value={role} onChange={e => setRole(e.target.value)}
              className="bg-[#0a1214] border border-flash/[0.08] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/40 focus:outline-none focus:border-jade/20 cursor-pointer appearance-none">
              <option value="">Role</option>
              <option value="TOP">Top</option><option value="JUNGLE">Jungle</option><option value="MID">Mid</option><option value="ADC">ADC</option><option value="SUPPORT">Support</option>
            </select>
          </div>
          <input value={linkedAccount} onChange={e => setLinkedAccount(e.target.value)}
            placeholder="Link your account (e.g. Wasureta#EUW) — users can click to view your profile"
            className="w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" />
          <div className="flex gap-2">
            <input value={discord} onChange={e => setDiscord(e.target.value)}
              placeholder="Discord username"
              className="flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" />
            <input value={twitter} onChange={e => setTwitter(e.target.value)}
              placeholder="X handle (e.g. @username)"
              className="flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" />
            <input value={reddit} onChange={e => setReddit(e.target.value)}
              placeholder="Reddit username (e.g. u/username)"
              className="flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" />
          </div>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, idx) => (
        <SectionEditor
          key={`${section.type}-${idx}`}
          section={section}
          onChange={s => updateSection(idx, s)}
          onMoveUp={() => moveSection(idx, -1)}
          onMoveDown={() => moveSection(idx, 1)}
          isFirst={idx === 0}
          isLast={idx === sections.length - 1}
        />
      ))}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving}
          className={cn(
            "relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-sm font-mono text-[11px] uppercase tracking-[0.15em] transition-all cursor-pointer",
            saving ? "bg-jade/5 text-jade/20 border border-jade/10" : "bg-jade/15 text-jade/80 border border-jade/25 hover:bg-jade/25 hover:shadow-[0_0_15px_rgba(0,217,146,0.15)]"
          )}>
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving..." : existingGuide ? "Update Guide" : "Publish Guide"}
        </button>
        {error && <span className="text-[10px] font-mono text-red-400/70">{error}</span>}
        {success && <span className="text-[10px] font-mono text-jade/60">Saved successfully</span>}
      </div>
    </div>
  )
}
