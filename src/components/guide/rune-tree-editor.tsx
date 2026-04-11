"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { PERK_CDN, cdnBaseUrl } from "@/config"
import { RUNE_TREES, type RuneTree, type RuneInfo } from "@/constants/rune-tree-data"
import { getKeystoneIcon, getKeystoneName } from "@/constants/runes"
import { Search, X } from "lucide-react"

type RuneSelection = {
  primary: { tree: number; keystone: number; runes: number[] }
  secondary: { tree: number; runes: number[] }
  shards: number[]
}

type Props = {
  value: RuneSelection
  onChange: (v: RuneSelection) => void
  title?: string
  onTitleChange?: (t: string) => void
  description?: string
  onDescriptionChange?: (d: string) => void
  againstChampions?: string[]
  onAgainstChange?: (champs: string[]) => void
  againstClasses?: string[]
  onAgainstClassesChange?: (classes: string[]) => void
}

function RuneIcon({ rune, selected, onClick, size = "md" }: {
  rune: RuneInfo; selected: boolean; onClick: () => void; size?: "sm" | "md" | "lg"
}) {
  const sizeClass = size === "lg" ? "w-14 h-14" : size === "md" ? "w-10 h-10" : "w-8 h-8"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-full transition-all duration-300 cursor-pointer",
        selected
          ? "scale-110"
          : "opacity-30 hover:opacity-65 hover:scale-105"
      )}
      title={rune.name}
    >
      <img
        src={`${PERK_CDN}/${rune.icon}`}
        alt={rune.name}
        className={cn(sizeClass, "rounded-full")}
        onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
      />
      {selected && (
        <>
          <div className="absolute -inset-[3px] rounded-full border-2 border-jade/50" />
          <div className="absolute -inset-[3px] rounded-full shadow-[0_0_14px_rgba(0,217,146,0.35)]" />
        </>
      )}
    </button>
  )
}

function TreeSelector({ trees, selectedId, onSelect, disabled }: {
  trees: RuneTree[]; selectedId: number; onSelect: (id: number) => void; disabled?: number
}) {
  return (
    <div className="flex gap-3 justify-center mb-5">
      {trees.map(tree => (
        <button
          key={tree.id}
          type="button"
          onClick={() => tree.id !== disabled && onSelect(tree.id)}
          className={cn(
            "relative w-9 h-9 rounded-full transition-all duration-300",
            tree.id === selectedId
              ? "scale-115 shadow-[0_0_12px_rgba(0,217,146,0.25)]"
              : tree.id === disabled
                ? "opacity-10 cursor-not-allowed"
                : "opacity-30 hover:opacity-60 hover:scale-110 cursor-pointer"
          )}
          disabled={tree.id === disabled}
        >
          <img src={`${PERK_CDN}/${tree.icon}`} alt={tree.name} className="w-full h-full rounded-full" />
          {tree.id === selectedId && <div className="absolute -inset-[2px] rounded-full border border-jade/40" />}
        </button>
      ))}
    </div>
  )
}

function PrimaryTreePanel({ tree, selection, onChange }: {
  tree: RuneTree
  selection: { keystone: number; runes: number[] }
  onChange: (s: { keystone: number; runes: number[] }) => void
}) {
  const selectKeystone = (id: number) => onChange({ ...selection, keystone: id })

  const selectMinorRune = (rowIdx: number, runeId: number) => {
    const newRunes = [...selection.runes]
    // Ensure we have 3 slots
    while (newRunes.length < 3) newRunes.push(0)
    newRunes[rowIdx] = runeId
    onChange({ ...selection, runes: newRunes })
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Tree icon + name */}
      <div className="flex items-center gap-2">
        <img src={`${PERK_CDN}/${tree.icon}`} alt="" className="w-7 h-7 rounded-full" />
        <span className="text-[12px] font-mono text-flash/50 uppercase tracking-[0.15em]">{tree.name}</span>
      </div>

      {/* Keystones */}
      <div className="flex gap-3 justify-center">
        {tree.keystones.map(ks => (
          <RuneIcon key={ks.id} rune={ks} selected={selection.keystone === ks.id} onClick={() => selectKeystone(ks.id)} size="lg" />
        ))}
      </div>

      {/* Separator */}
      <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-jade/15 to-transparent" />

      {/* Minor runes — 3 rows */}
      {tree.rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 justify-center">
          {row.map(rune => (
            <RuneIcon
              key={rune.id}
              rune={rune}
              selected={selection.runes[rowIdx] === rune.id}
              onClick={() => selectMinorRune(rowIdx, rune.id)}
              size="md"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function SecondaryTreePanel({ tree, selection, onChange }: {
  tree: RuneTree
  selection: { runes: number[] }
  onChange: (s: { runes: number[] }) => void
}) {
  // Secondary allows 2 runes from any of the 3 rows (but max 1 per row)
  const allMinorIds = tree.rows.flat().map(r => r.id)
  const selectedRunes = selection.runes.filter(id => allMinorIds.includes(id))

  const toggleRune = (runeId: number, rowIdx: number) => {
    const isSelected = selectedRunes.includes(runeId)
    if (isSelected) {
      onChange({ runes: selectedRunes.filter(id => id !== runeId) })
    } else {
      // Max 2 runes, max 1 per row
      const rowRunes = tree.rows[rowIdx].map(r => r.id)
      let newRunes = selectedRunes.filter(id => !rowRunes.includes(id))
      newRunes.push(runeId)
      if (newRunes.length > 2) newRunes = newRunes.slice(-2)
      onChange({ runes: newRunes })
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <img src={`${PERK_CDN}/${tree.icon}`} alt="" className="w-6 h-6 rounded-full opacity-50" />
        <span className="text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em]">{tree.name}</span>
      </div>

      {tree.rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 justify-center">
          {row.map(rune => (
            <RuneIcon
              key={rune.id}
              rune={rune}
              selected={selectedRunes.includes(rune.id)}
              onClick={() => toggleRune(rune.id, rowIdx)}
              size="sm"
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function RuneTreeEditor({ value, onChange, title, onTitleChange, description, onDescriptionChange, againstChampions, onAgainstChange, againstClasses, onAgainstClassesChange }: Props) {
  const CLASSES = [
    { key: "Fighter", label: "Fighter" },
    { key: "Tank", label: "Tank" },
    { key: "Mage", label: "Mage" },
    { key: "Assassin", label: "Assassin" },
    { key: "Marksman", label: "Marksman" },
    { key: "Support", label: "Support" },
  ]

  const toggleClass = (cls: string) => {
    const current = againstClasses ?? []
    if (current.includes(cls)) {
      onAgainstClassesChange?.(current.filter(c => c !== cls))
    } else {
      onAgainstClassesChange?.([...current, cls])
    }
  }
  const [showChampPicker, setShowChampPicker] = useState(false)
  const [champList, setChampList] = useState<{ id: string; name: string; tags: string[] }[]>([])
  const [champSearch, setChampSearch] = useState("")

  const loadChamps = () => {
    if (champList.length > 0) { setShowChampPicker(true); return }
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then(r => r.json())
      .then(data => {
        setChampList(Object.values<any>(data?.data ?? {}).map(c => ({ id: String(c.id), name: String(c.name), tags: c.tags ?? [] })).sort((a, b) => a.name.localeCompare(b.name)))
        setShowChampPicker(true)
      })
      .catch(() => {})
  }
  const primaryTree = RUNE_TREES.find(t => t.id === value.primary.tree) ?? RUNE_TREES[0]
  const secondaryTree = RUNE_TREES.find(t => t.id === value.secondary.tree) ?? RUNE_TREES[4]

  const setPrimaryTree = (treeId: number) => {
    const tree = RUNE_TREES.find(t => t.id === treeId)!
    onChange({
      ...value,
      primary: { tree: treeId, keystone: tree.keystones[0].id, runes: [] },
      // If secondary was same tree, switch it
      secondary: value.secondary.tree === treeId
        ? { tree: RUNE_TREES.find(t => t.id !== treeId)!.id, runes: [] }
        : value.secondary,
    })
  }

  const setSecondaryTree = (treeId: number) => {
    onChange({
      ...value,
      secondary: { tree: treeId, runes: [] },
    })
  }

  return (
    <div className="relative overflow-hidden rounded-md"
      style={{ background: "linear-gradient(180deg, rgba(4,10,12,0.8) 0%, rgba(8,14,16,0.9) 100%)" }}>
      <div className="absolute inset-0 pointer-events-none opacity-15"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.008) 3px, rgba(0,217,146,0.008) 5px)" }} />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,217,146,0.03)_0%,transparent_70%)]" />

      <div className="relative z-10 px-6 py-5">
        <div className="flex gap-6">
          {/* Left — Rune trees (fixed width) */}
          <div className="flex gap-8 w-[580px] shrink-0">
            {/* Primary tree */}
            <div className="flex flex-col items-center">
              <div className="text-[9px] font-orbitron text-jade/40 uppercase tracking-[0.3em] mb-3">Primary</div>
              <TreeSelector trees={RUNE_TREES} selectedId={value.primary.tree} onSelect={setPrimaryTree} disabled={value.secondary.tree} />
              <PrimaryTreePanel
                tree={primaryTree}
                selection={value.primary}
                onChange={(s) => onChange({ ...value, primary: { ...value.primary, ...s } })}
              />
            </div>

            {/* Divider */}
            <div className="w-[1px] bg-gradient-to-b from-transparent via-jade/10 to-transparent my-6" />

            {/* Secondary tree */}
            <div className="flex flex-col items-center">
              <div className="text-[9px] font-orbitron text-flash/25 uppercase tracking-[0.3em] mb-3">Secondary</div>
              <TreeSelector trees={RUNE_TREES} selectedId={value.secondary.tree} onSelect={setSecondaryTree} disabled={value.primary.tree} />
              <SecondaryTreePanel
                tree={secondaryTree}
                selection={value.secondary}
                onChange={(s) => onChange({ ...value, secondary: { ...value.secondary, ...s } })}
              />
            </div>
          </div>

          {/* Right — Title, description, against champions (fixed width) */}
          <div className="w-[1px] bg-gradient-to-b from-transparent via-flash/[0.06] to-transparent" />
          <div className="w-[260px] shrink-0 flex flex-col gap-4 py-2">
            {/* Editable title */}
            {onTitleChange && (
              <div>
                <div className="text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em] mb-1.5">Rune Page Title</div>
                <input
                  value={title ?? ""}
                  onChange={e => onTitleChange(e.target.value)}
                  placeholder="e.g. Runes vs Tanks"
                  className="w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[13px] font-orbitron text-flash/60 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors"
                />
              </div>
            )}

            {/* Editable description */}
            {onDescriptionChange && (
              <div>
                <div className="text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em] mb-1.5">Description</div>
                <textarea
                  value={description ?? ""}
                  onChange={e => onDescriptionChange(e.target.value)}
                  placeholder="When to use this rune page..."
                  className="w-full h-16 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-flash/40 placeholder:text-flash/15 resize-y focus:outline-none focus:border-jade/15 transition-colors"
                />
              </div>
            )}

            <div className="w-full h-[1px] bg-flash/[0.04]" />

            {/* Against classes + champions */}
            {(onAgainstChange || onAgainstClassesChange) && (
              <div>
                <div className="text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em] mb-2">Use Against</div>
                {/* Selected class + champion icons */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {(againstClasses ?? []).map(cls => (
                    <div key={cls} className="relative group">
                      <img src={`https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`} alt={cls}
                        className="w-10 h-10 object-contain rounded-[3px] p-0.5"
                        style={{ filter: "brightness(1.3) drop-shadow(0 0 4px rgba(0,217,146,0.3))" }} />
                      <button type="button" onClick={() => onAgainstClassesChange?.((againstClasses ?? []).filter(x => x !== cls))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rotate-45 bg-[#0a1214] border border-red-400/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.2)] hover:border-red-400/70">
                        <X className="w-2.5 h-2.5 -rotate-45 text-red-400/70" />
                      </button>
                    </div>
                  ))}
                  {(againstChampions ?? []).map(c => (
                    <div key={c} className="relative group">
                      <img src={`${cdnBaseUrl()}/img/champion/${c}.png`} alt={c} className="w-10 h-10 rounded-[3px] border border-flash/[0.08] group-hover:border-jade/20 transition-colors" />
                      <button type="button" onClick={() => onAgainstChange?.((againstChampions ?? []).filter(x => x !== c))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rotate-45 bg-[#0a1214] border border-red-400/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.2)] hover:border-red-400/70 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                        <X className="w-2.5 h-2.5 -rotate-45 text-red-400/70" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={loadChamps}
                    className="group relative overflow-hidden h-7 px-3 rounded-[2px] cursor-pointer transition-all duration-300 border border-jade/20 hover:border-jade/50 hover:shadow-[0_0_12px_rgba(0,217,146,0.15)] flex items-center justify-center">
                    <div className="absolute inset-0 bg-jade/[0.04] group-hover:bg-jade/[0.08] transition-colors" />
                    <div className="absolute inset-0 pointer-events-none opacity-30"
                      style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,217,146,0.03) 2px, rgba(0,217,146,0.03) 3px)" }} />
                    <span className="relative z-10 text-[8px] font-orbitron text-jade/60 group-hover:text-jade/90 uppercase tracking-[0.12em] transition-colors">+ Add</span>
                  </button>
                </div>
              </div>
            )}

            <div className="w-full h-[1px] bg-flash/[0.04]" />

            {/* Selected keystone info */}
            <div className="flex items-center gap-2">
              {getKeystoneIcon(value.primary.keystone) && (
                <img src={getKeystoneIcon(value.primary.keystone)!} alt="" className="w-7 h-7 rounded-full" />
              )}
              <div>
                <div className="text-[14px] font-mono text-flash/60">{getKeystoneName(value.primary.keystone) ?? "None"}</div>
                <div className="text-[11px] font-mono text-flash/30">{primaryTree.name} / {secondaryTree.name}</div>
              </div>
            </div>

            <div className="text-[12px] font-mono text-flash/30">
              {value.primary.runes.filter(r => r > 0).length + value.secondary.runes.length} / 5 runes selected
            </div>
          </div>

          {/* Champion picker portal */}
          {showChampPicker && createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center" onClick={() => setShowChampPicker(false)}>
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
              <div className="relative z-10 w-[480px] max-h-[520px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
                style={{ background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }}
                onClick={e => e.stopPropagation()}>
                <div className="absolute inset-0 pointer-events-none opacity-15"
                  style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" }} />

                {/* Class icons — click to add as "against class" tag */}
                <div className="relative z-10 flex justify-center gap-4 px-4 py-4 border-b border-flash/[0.04]">
                  {CLASSES.map(cls => {
                    const active = (againstClasses ?? []).includes(cls.key)
                    return (
                      <button key={cls.key} type="button"
                        onClick={() => {
                          toggleClass(cls.key)
                        }}
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
                        onAgainstChange?.([...(againstChampions ?? []).filter(x => x !== c.id), c.id])
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
      </div>
    </div>
  )
}
