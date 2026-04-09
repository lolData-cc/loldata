"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { cdnBaseUrl } from "@/config"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes"
import type { Guide, GuideSection, MatchupEntry, ThreatLevel, SynergyLevel } from "./types"
import { THREAT_LEVELS, SYNERGY_LEVELS, SECTION_TEMPLATES } from "./types"
import { Eye, EyeOff, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Save } from "lucide-react"
import { RuneTreeEditor } from "./rune-tree-editor"

// ── Section type labels ──
const SECTION_TYPE_LABELS: Record<GuideSection["type"], string> = {
  introduction: "Introduction",
  matchups: "Threats & Synergies",
  build: "Item Build",
  runes: "Runes",
  recommended_items: "Recommended Items",
  back_timings: "Back Timings",
}

// ── Intro Editor ──
function IntroEditor({ section, onChange }: { section: GuideSection & { type: "introduction" }; onChange: (s: GuideSection) => void }) {
  return (
    <textarea
      value={section.content}
      onChange={(e) => onChange({ ...section, content: e.target.value })}
      placeholder="Write your introduction here... You can describe who you are, link your account, and explain the guide."
      className="w-full h-32 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-3 py-2 text-[13px] font-mono text-flash/60 placeholder:text-flash/20 resize-y focus:outline-none focus:border-jade/20"
    />
  )
}

// ── Build Editor ──
function BuildEditor({ section, onChange }: { section: GuideSection & { type: "build" | "recommended_items" }; onChange: (s: GuideSection) => void }) {
  const [newItemId, setNewItemId] = useState("")

  const addItem = () => {
    const id = Number(newItemId)
    if (!id || section.items.includes(id)) return
    onChange({ ...section, items: [...section.items, id] })
    setNewItemId("")
  }

  const removeItem = (idx: number) => {
    onChange({ ...section, items: section.items.filter((_, i) => i !== idx) })
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        {section.items.map((itemId, idx) => (
          <div key={idx} className="relative group">
            <img src={`${cdnBaseUrl()}/img/item/${itemId}.png`} alt="" className="w-10 h-10 rounded-[2px] border border-flash/[0.08]" />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >x</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          value={newItemId}
          onChange={(e) => setNewItemId(e.target.value)}
          placeholder="Item ID"
          className="w-24 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[11px] font-mono text-flash/50 placeholder:text-flash/20 focus:outline-none focus:border-jade/20"
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <button type="button" onClick={addItem} className="text-[10px] font-mono text-jade/50 hover:text-jade px-2 py-1 border border-jade/15 rounded-sm transition-colors">Add</button>
      </div>
    </div>
  )
}

// ── Matchup Editor ──
function MatchupEditor({ section, onChange }: { section: GuideSection & { type: "matchups" }; onChange: (s: GuideSection) => void }) {
  const [newChamp, setNewChamp] = useState("")
  const [newNote, setNewNote] = useState("")
  const [newLevel, setNewLevel] = useState<ThreatLevel | SynergyLevel>("even")
  const [addingTo, setAddingTo] = useState<"threats" | "synergies">("threats")

  const addEntry = () => {
    if (!newChamp.trim()) return
    const entry: MatchupEntry = { championId: newChamp.trim(), level: newLevel, note: newNote }
    if (addingTo === "threats") {
      onChange({ ...section, threats: [...section.threats, entry] })
    } else {
      onChange({ ...section, synergies: [...section.synergies, entry] })
    }
    setNewChamp("")
    setNewNote("")
  }

  const removeEntry = (type: "threats" | "synergies", idx: number) => {
    if (type === "threats") {
      onChange({ ...section, threats: section.threats.filter((_, i) => i !== idx) })
    } else {
      onChange({ ...section, synergies: section.synergies.filter((_, i) => i !== idx) })
    }
  }

  const renderEntries = (entries: MatchupEntry[], type: "threats" | "synergies") => (
    <div className="space-y-1">
      {entries.map((e, idx) => (
        <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded-sm bg-flash/[0.02]">
          <img src={`${cdnBaseUrl()}/img/champion/${e.championId}.png`} alt="" className="w-6 h-6 rounded-[2px]" />
          <span className="text-[10px] font-mono text-flash/50 flex-1">{e.championId}</span>
          <span className={cn("text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-sm",
            type === "threats" ? "bg-red-500/20 text-red-400/70" : "bg-jade/20 text-jade/70"
          )}>{e.level}</span>
          <button type="button" onClick={() => removeEntry(type, idx)} className="text-red-400/40 hover:text-red-400 text-[10px]">x</button>
        </div>
      ))}
    </div>
  )

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-[10px] font-mono text-red-400/40 uppercase tracking-wider mb-2">Threats ({section.threats.length})</div>
          {renderEntries(section.threats, "threats")}
        </div>
        <div>
          <div className="text-[10px] font-mono text-jade/40 uppercase tracking-wider mb-2">Synergies ({section.synergies.length})</div>
          {renderEntries(section.synergies, "synergies")}
        </div>
      </div>
      {/* Add new */}
      <div className="flex gap-2 items-center flex-wrap border-t border-flash/[0.04] pt-3">
        <select value={addingTo} onChange={(e) => setAddingTo(e.target.value as any)} className="bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[10px] font-mono text-flash/50">
          <option value="threats">Threat</option>
          <option value="synergies">Synergy</option>
        </select>
        <input value={newChamp} onChange={(e) => setNewChamp(e.target.value)} placeholder="Champion ID" className="w-24 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[11px] font-mono text-flash/50 placeholder:text-flash/20 focus:outline-none focus:border-jade/20" />
        <select value={newLevel} onChange={(e) => setNewLevel(e.target.value as any)} className="bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[10px] font-mono text-flash/50">
          {(addingTo === "threats" ? THREAT_LEVELS : SYNERGY_LEVELS).map(l => (
            <option key={l.key} value={l.key}>{l.label}</option>
          ))}
        </select>
        <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Note" className="flex-1 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[11px] font-mono text-flash/50 placeholder:text-flash/20 focus:outline-none focus:border-jade/20" />
        <button type="button" onClick={addEntry} className="text-[10px] font-mono text-jade/50 hover:text-jade px-2 py-1 border border-jade/15 rounded-sm transition-colors">Add</button>
      </div>
    </div>
  )
}

// ── Back Timing Editor ──
function BackTimingEditor({ section, onChange }: { section: GuideSection & { type: "back_timings" }; onChange: (s: GuideSection) => void }) {
  const [gold, setGold] = useState("")
  const [items, setItems] = useState("")
  const [note, setNote] = useState("")

  const addTiming = () => {
    const g = Number(gold)
    if (!g) return
    const itemIds = items.split(",").map(s => Number(s.trim())).filter(n => n > 0)
    onChange({ ...section, timings: [...section.timings, { gold: g, items: itemIds, note }] })
    setGold("")
    setItems("")
    setNote("")
  }

  const removeTiming = (idx: number) => {
    onChange({ ...section, timings: section.timings.filter((_, i) => i !== idx) })
  }

  return (
    <div>
      <div className="space-y-1 mb-3">
        {section.timings.map((t, idx) => (
          <div key={idx} className="flex items-center gap-3 px-2 py-1.5 rounded-sm bg-flash/[0.02]">
            <span className="text-[12px] font-orbitron font-bold text-jade/50 tabular-nums">{t.gold}g</span>
            <div className="flex gap-1">
              {t.items.map((id, i) => <img key={i} src={`${cdnBaseUrl()}/img/item/${id}.png`} alt="" className="w-5 h-5 rounded-[2px]" />)}
            </div>
            <span className="text-[10px] font-mono text-flash/40 flex-1">{t.note}</span>
            <button type="button" onClick={() => removeTiming(idx)} className="text-red-400/40 hover:text-red-400 text-[10px]">x</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center flex-wrap border-t border-flash/[0.04] pt-3">
        <input value={gold} onChange={(e) => setGold(e.target.value)} placeholder="Gold" type="number" className="w-16 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[11px] font-mono text-flash/50 placeholder:text-flash/20 focus:outline-none focus:border-jade/20" />
        <input value={items} onChange={(e) => setItems(e.target.value)} placeholder="Item IDs (comma separated)" className="w-40 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[11px] font-mono text-flash/50 placeholder:text-flash/20 focus:outline-none focus:border-jade/20" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="flex-1 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-2 py-1 text-[11px] font-mono text-flash/50 placeholder:text-flash/20 focus:outline-none focus:border-jade/20" />
        <button type="button" onClick={addTiming} className="text-[10px] font-mono text-jade/50 hover:text-jade px-2 py-1 border border-jade/15 rounded-sm transition-colors">Add</button>
      </div>
    </div>
  )
}

// ── Section wrapper with visibility toggle ──
function SectionEditor({ section, onChange, onRemove }: { section: GuideSection; onChange: (s: GuideSection) => void; onRemove: () => void }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={cn("relative overflow-hidden rounded-sm border transition-colors",
      section.visible ? "border-flash/[0.08] bg-flash/[0.01]" : "border-flash/[0.04] bg-flash/[0.005] opacity-50"
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-flash/[0.04]">
        <GripVertical className="w-3.5 h-3.5 text-flash/15 cursor-grab" />
        <span className="text-[9px] font-mono text-jade/30 uppercase tracking-wider">{SECTION_TYPE_LABELS[section.type]}</span>
        <input
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          className="flex-1 bg-transparent text-[12px] font-mono text-flash/60 focus:outline-none focus:text-flash border-b border-transparent focus:border-jade/20 px-1"
        />
        <button type="button" onClick={() => onChange({ ...section, visible: !section.visible })} className="text-flash/25 hover:text-flash/60 transition-colors" title={section.visible ? "Hide" : "Show"}>
          {section.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={() => setCollapsed(!collapsed)} className="text-flash/25 hover:text-flash/60 transition-colors">
          {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={onRemove} className="text-red-400/30 hover:text-red-400/70 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-4">
          {section.type === "introduction" && <IntroEditor section={section} onChange={onChange} />}
          {section.type === "matchups" && <MatchupEditor section={section} onChange={onChange} />}
          {(section.type === "build" || section.type === "recommended_items") && <BuildEditor section={section as any} onChange={onChange} />}
          {section.type === "runes" && (
            <RuneTreeEditor
              value={section}
              onChange={(v) => onChange({ ...section, primary: v.primary, secondary: v.secondary, shards: v.shards })}
            />
          )}
          {section.type === "back_timings" && <BackTimingEditor section={section} onChange={onChange} />}
        </div>
      )}
    </div>
  )
}

// ── Main Editor ──
export function GuideEditor({ championId, existingGuide, onSave }: {
  championId: string
  existingGuide?: Guide | null
  onSave?: (guide: Guide) => void
}) {
  const { session, nametag } = useAuth()
  const [title, setTitle] = useState(existingGuide?.title ?? `${championId} Guide`)
  const [role, setRole] = useState(existingGuide?.role ?? "")
  const [linkedAccount, setLinkedAccount] = useState(existingGuide?.author_linked_account ?? "")
  const [sections, setSections] = useState<GuideSection[]>(existingGuide?.sections ?? [
    SECTION_TEMPLATES.introduction(),
    SECTION_TEMPLATES.matchups(),
    SECTION_TEMPLATES.build(),
    SECTION_TEMPLATES.runes(),
    SECTION_TEMPLATES.back_timings(),
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateSection = useCallback((idx: number, section: GuideSection) => {
    setSections(prev => prev.map((s, i) => i === idx ? section : s))
  }, [])

  const removeSection = useCallback((idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const addSection = useCallback((type: GuideSection["type"]) => {
    setSections(prev => [...prev, SECTION_TEMPLATES[type]()])
  }, [])

  const save = async () => {
    if (!session?.user) {
      setError("You must be logged in to save a guide")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const guideData = {
        champion_id: championId,
        author_id: session.user.id,
        author_name: nametag ?? session.user.email ?? "Anonymous",
        author_linked_account: linkedAccount || null,
        title,
        patch: null,
        role: role || null,
        sections,
        updated_at: new Date().toISOString(),
      }

      if (existingGuide?.id) {
        const { error: err } = await supabase.from("guides").update(guideData).eq("id", existingGuide.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from("guides").insert(guideData)
        if (err) throw err
      }
      onSave?.(guideData as any)
    } catch (e: any) {
      setError(e.message ?? "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <div className="text-[13px] font-mono text-flash/40">You must be logged in to create a guide.</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Guide header */}
      <div className="flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Guide title"
          className="flex-1 bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-3 py-2 text-[15px] font-mono text-flash/70 placeholder:text-flash/20 focus:outline-none focus:border-jade/20"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-3 py-2 text-[11px] font-mono text-flash/50">
          <option value="">Role</option>
          <option value="TOP">Top</option>
          <option value="JUNGLE">Jungle</option>
          <option value="MID">Mid</option>
          <option value="ADC">ADC</option>
          <option value="SUPPORT">Support</option>
        </select>
      </div>

      <input
        value={linkedAccount}
        onChange={(e) => setLinkedAccount(e.target.value)}
        placeholder="Link your account (e.g. Wasureta#EUW)"
        className="w-full bg-flash/[0.03] border border-flash/[0.08] rounded-sm px-3 py-1.5 text-[11px] font-mono text-flash/50 placeholder:text-flash/20 focus:outline-none focus:border-jade/20"
      />

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <SectionEditor
            key={idx}
            section={section}
            onChange={(s) => updateSection(idx, s)}
            onRemove={() => removeSection(idx)}
          />
        ))}
      </div>

      {/* Add section */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(SECTION_TEMPLATES) as GuideSection["type"][]).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => addSection(type)}
            className="flex items-center gap-1 text-[9px] font-mono text-flash/30 hover:text-jade/60 px-2.5 py-1.5 border border-flash/[0.06] hover:border-jade/15 rounded-sm transition-colors"
          >
            <Plus className="w-3 h-3" />
            {SECTION_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Save */}
      {error && <div className="text-[11px] font-mono text-red-400">{error}</div>}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-sm font-mono text-[11px] uppercase tracking-wider transition-all",
          saving ? "bg-jade/10 text-jade/30" : "bg-jade/20 text-jade hover:bg-jade/30 border border-jade/25"
        )}
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? "Saving..." : existingGuide ? "Update Guide" : "Publish Guide"}
      </button>
    </div>
  )
}
