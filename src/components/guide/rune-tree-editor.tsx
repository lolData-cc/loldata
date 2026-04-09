"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { PERK_CDN } from "@/config"
import { RUNE_TREES, type RuneTree, type RuneInfo } from "@/constants/rune-tree-data"

type RuneSelection = {
  primary: { tree: number; keystone: number; runes: number[] }
  secondary: { tree: number; runes: number[] }
  shards: number[]
}

type Props = {
  value: RuneSelection
  onChange: (v: RuneSelection) => void
}

function RuneIcon({ rune, selected, onClick, size = "md" }: {
  rune: RuneInfo; selected: boolean; onClick: () => void; size?: "sm" | "md" | "lg"
}) {
  const sizeClass = size === "lg" ? "w-12 h-12" : size === "md" ? "w-9 h-9" : "w-7 h-7"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-full transition-all duration-200 cursor-pointer",
        selected
          ? "ring-2 ring-jade/60 shadow-[0_0_12px_rgba(0,217,146,0.3)] scale-110"
          : "opacity-35 hover:opacity-70 hover:scale-105"
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
        <div className="absolute inset-0 rounded-full border border-jade/30 animate-pulse" />
      )}
    </button>
  )
}

function TreeSelector({ trees, selectedId, onSelect, disabled }: {
  trees: RuneTree[]; selectedId: number; onSelect: (id: number) => void; disabled?: number
}) {
  return (
    <div className="flex gap-2 justify-center mb-4">
      {trees.map(tree => (
        <button
          key={tree.id}
          type="button"
          onClick={() => tree.id !== disabled && onSelect(tree.id)}
          className={cn(
            "relative w-8 h-8 rounded-full transition-all duration-200",
            tree.id === selectedId
              ? "ring-2 ring-jade/50 scale-110"
              : tree.id === disabled
                ? "opacity-15 cursor-not-allowed"
                : "opacity-40 hover:opacity-70 hover:scale-105 cursor-pointer"
          )}
          disabled={tree.id === disabled}
        >
          <img src={`${PERK_CDN}/${tree.icon}`} alt={tree.name} className="w-full h-full rounded-full" />
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
    <div className="flex flex-col items-center gap-3">
      {/* Tree icon + name */}
      <div className="flex items-center gap-2 mb-1">
        <img src={`${PERK_CDN}/${tree.icon}`} alt="" className="w-6 h-6 rounded-full" />
        <span className="text-[11px] font-mono text-flash/50 uppercase tracking-wider">{tree.name}</span>
      </div>

      {/* Keystones */}
      <div className="flex gap-2 justify-center">
        {tree.keystones.map(ks => (
          <RuneIcon key={ks.id} rune={ks} selected={selection.keystone === ks.id} onClick={() => selectKeystone(ks.id)} size="lg" />
        ))}
      </div>

      {/* Separator */}
      <div className="w-[1px] h-3 bg-flash/[0.08]" />

      {/* Minor runes — 3 rows */}
      {tree.rows.map((row, rowIdx) => (
        <div key={rowIdx}>
          <div className="flex gap-2 justify-center">
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
          {rowIdx < 2 && <div className="w-[1px] h-2 bg-flash/[0.04] mx-auto mt-1" />}
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
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2 mb-1">
        <img src={`${PERK_CDN}/${tree.icon}`} alt="" className="w-5 h-5 rounded-full opacity-60" />
        <span className="text-[10px] font-mono text-flash/40 uppercase tracking-wider">{tree.name}</span>
      </div>

      {tree.rows.map((row, rowIdx) => (
        <div key={rowIdx}>
          <div className="flex gap-2 justify-center">
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
          {rowIdx < 2 && <div className="w-[1px] h-1.5 bg-flash/[0.03] mx-auto mt-0.5" />}
        </div>
      ))}
    </div>
  )
}

export function RuneTreeEditor({ value, onChange }: Props) {
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
    <div className="relative overflow-hidden rounded-sm border border-flash/[0.06] bg-flash/[0.01]">
      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.008) 3px, rgba(0,217,146,0.008) 4px)" }} />

      <div className="relative z-10 p-5">
        <div className="flex gap-8">
          {/* Primary tree */}
          <div className="flex-1">
            <div className="text-[9px] font-mono text-jade/30 uppercase tracking-[0.2em] text-center mb-2">Primary</div>
            <TreeSelector trees={RUNE_TREES} selectedId={value.primary.tree} onSelect={setPrimaryTree} disabled={value.secondary.tree} />
            <PrimaryTreePanel
              tree={primaryTree}
              selection={value.primary}
              onChange={(s) => onChange({ ...value, primary: { ...value.primary, ...s } })}
            />
          </div>

          {/* Divider */}
          <div className="w-[1px] bg-gradient-to-b from-transparent via-flash/[0.06] to-transparent" />

          {/* Secondary tree */}
          <div className="flex-1">
            <div className="text-[9px] font-mono text-flash/25 uppercase tracking-[0.2em] text-center mb-2">Secondary</div>
            <TreeSelector trees={RUNE_TREES} selectedId={value.secondary.tree} onSelect={setSecondaryTree} disabled={value.primary.tree} />
            <SecondaryTreePanel
              tree={secondaryTree}
              selection={value.secondary}
              onChange={(s) => onChange({ ...value, secondary: { ...value.secondary, ...s } })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
