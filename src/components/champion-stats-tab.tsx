"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { API_BASE_URL, cdnBaseUrl } from "@/config"
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes"
import { getLegacyRankIcons } from "@/lib/uiPrefs"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { Globe } from "lucide-react"

import {
  RoleTopIcon,
  RoleJungleIcon,
  RoleMidIcon,
  RoleAdcIcon,
  RoleSupportIcon,
} from "@/components/ui/roleicons"

import { BorderBeam } from "./ui/border-beam"
import { ChampionPicker } from "@/components/championpicker"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type ChampInfo = {
  id: string
  key: string
  name: string
  title: string
  tags: string[]
  image: { full: string }
}

type MiniRow = {
  championKey: number
  games: number
  winrate: number
  winrateShrunk?: number
}

type StatsPayload = {
  core:
    | {
        winrate: number | null
        pickrate: number | null
        banrate: number | null
        gamesAnalyzed: number | null
        avgKDA:
          | {
              kills: number | null
              deaths: number | null
              assists: number | null
            }
          | null
        avgCS: number | null
        avgGold: number | null
        avgDamage: number | null
      }
    | null
  bestMatchups: MiniRow[] | null
  worstMatchups: MiniRow[] | null
  bestSynergies: MiniRow[] | null
  worstCounters: MiniRow[] | null
  gamePhaseWinrates: { phase: string; time: string; winrate: number | null }[] | null
  objectiveWinrates?: {
    firstDragon?: number | null
    firstBaron?: number | null
    elderDragon?: { games?: number | null; winrate?: number | null } | null
    riftHerald?: { games?: number | null; winrate?: number | null } | null
    voidgrubs?: { games?: number | null; winrate?: number | null } | null
  } | null
  dragonSoulWinrates?: { name: string; games: number; winrate: number }[] | null
  meta?: {
    patch: string | null
    queueId: number | null
    lastUpdatedUtc: string
    role?: string | null
  } | null
  runes?: { perk_keystone: number; perk_primary_style: number; perk_sub_style: number; games: number; wins: number; winrate: number; pick_rate: number }[] | null
  items?: { item_id: number; games: number; wins: number; winrate: number; pick_rate: number }[] | null
}

type RoleKey = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "SUPPORT"
type OpponentEntry = {
  championId: number; name: string; role: RoleKey | null
  itemId: number | null; itemName: string | null
}
type LegendaryItem = { id: number; name: string }

// ─────────────────────────────────────────────────────────────
// HELPERS (anti-crash)
// ─────────────────────────────────────────────────────────────

const num = (v: any, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

const pct = (v: any, digits = 2) => `${num(v, 0).toFixed(digits)}%`

// ─────────────────────────────────────────────────────────────
// TECH CARD
// ─────────────────────────────────────────────────────────────

function TechCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("bg-liquirice border border-[#1A1A1A]", className)}>{children}</div>
}

// ─────────────────────────────────────────────────────────────
// ROLE FILTER BAR (bigger icons + optional BorderBeam)
// ─────────────────────────────────────────────────────────────

const ROLES: { key: RoleKey; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { key: "TOP", label: "Top", Icon: RoleTopIcon },
  { key: "JUNGLE", label: "Jungle", Icon: RoleJungleIcon },
  { key: "MIDDLE", label: "Mid", Icon: RoleMidIcon },
  { key: "BOTTOM", label: "ADC", Icon: RoleAdcIcon },
  { key: "SUPPORT", label: "Sup", Icon: RoleSupportIcon },
]

function OpponentPentagonDialog({
  opponents,
  champions,
  onSetOpponent,
  onClearOpponent,
  selectedRole,
  legendaryItems,
  onSetItem,
  onClearItem,
}: {
  opponents: OpponentEntry[]
  champions: { id: string; name: string }[]
  onSetOpponent: (role: RoleKey, champName: string) => void
  onClearOpponent: (role: RoleKey) => void
  selectedRole: RoleKey | null
  legendaryItems: LegendaryItem[]
  onSetItem: (role: RoleKey, itemId: number, itemName: string) => void
  onClearItem: (role: RoleKey) => void
}) {
  const [open, setOpen] = useState(false)
  const [activeSlot, setActiveSlot] = useState<RoleKey | null>(null)
  const [activeItemSlot, setActiveItemSlot] = useState<RoleKey | null>(null)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const slotMap = useMemo(() => {
    const m: Partial<Record<RoleKey, OpponentEntry>> = {}
    for (const o of opponents) if (o.role) m[o.role] = o
    return m
  }, [opponents])

  const trimmed = search.trim().toLowerCase()
  const filteredChamps = useMemo(() => {
    if (trimmed.length < 2) return []
    return champions.filter(
      (c) => c.name.toLowerCase().includes(trimmed) || c.id.toLowerCase().includes(trimmed)
    )
  }, [champions, trimmed])

  const filteredItems = useMemo(() => {
    if (trimmed.length < 2) return legendaryItems
    return legendaryItems.filter((it) => it.name.toLowerCase().includes(trimmed))
  }, [legendaryItems, trimmed])

  useEffect(() => {
    if (activeSlot || activeItemSlot) setTimeout(() => inputRef.current?.focus(), 50)
  }, [activeSlot, activeItemSlot])

  useEffect(() => {
    if (!open) { setActiveSlot(null); setActiveItemSlot(null); setSearch("") }
    else if (selectedRole && !slotMap[selectedRole]) setActiveSlot(selectedRole)
  }, [open, selectedRole, slotMap])

  const handleSelect = (champName: string) => {
    if (!activeSlot) return
    onSetOpponent(activeSlot, champName)
    setActiveSlot(null)
    setSearch("")
  }

  const handleItemSelect = (item: LegendaryItem) => {
    if (!activeItemSlot) return
    onSetItem(activeItemSlot, item.id, item.name)
    setActiveItemSlot(null)
    setSearch("")
  }

  const DELAYS = [0.05, 0.13, 0.21, 0.29, 0.37]

  const slotCard = (roleIdx: number) => {
    const r = ROLES[roleIdx]
    const opp = slotMap[r.key]
    const isActive = activeSlot === r.key

    return (
      <div
        key={r.key}
        style={{ opacity: 0, animation: `pentSlotIn 0.45s ease-out ${DELAYS[roleIdx]}s forwards` }}
      >
        <button
          type="button"
          onClick={() => {
            if (opp) return
            setActiveSlot(isActive ? null : r.key)
            setSearch("")
          }}
          className={cn(
            "w-[148px] rounded-md border p-3 transition-all cursor-clicker",
            isActive
              ? "border-jade/50 bg-jade/10"
              : opp
                ? "border-[#00D992]/30 bg-[#00D992]/[0.04]"
                : "border-white/[0.06] bg-white/[0.02] hover:border-[#00D992]/30 hover:bg-white/[0.03]"
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <r.Icon className={cn("w-4 h-4", opp ? "text-[#00D992]" : "text-[#E8EEF2]/30")} />
            <span className={cn(
              "text-[9px] font-jetbrains uppercase tracking-[0.15em]",
              opp ? "text-[#00D992]" : "text-[#E8EEF2]/25"
            )}>
              {r.label}
            </span>
          </div>

          <div className="border-t border-white/[0.06] pt-2">
            {opp ? (
              <div className="flex items-center gap-2">
                <img
                  src={`${cdnBaseUrl()}/img/champion/${opp.name}.png`}
                  alt={opp.name}
                  className="w-6 h-6 rounded-sm"
                />
                <span className="text-[10px] font-jetbrains text-flash/80 truncate flex-1 text-left">
                  {opp.name}
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); onClearOpponent(r.key) }}
                  className="text-[#E8EEF2]/20 hover:text-[#E8EEF2] text-xs cursor-clicker transition-colors"
                >
                  ✕
                </span>
              </div>
            ) : (
              <span className={cn(
                "text-[10px] font-jetbrains uppercase tracking-[0.15em]",
                isActive ? "text-jade" : "text-[#E8EEF2]/20"
              )}>
                + Add
              </span>
            )}
          </div>
        </button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(
        "h-10 px-3 rounded-md border cursor-clicker",
        "bg-[#00D992]/[0.02] hover:border-[#00D992]/40 transition-colors",
        "text-[10px] font-mono uppercase tracking-wider flex items-center gap-2",
        opponents.length > 0
          ? "border-[#00D992]/50 text-[#00D992]"
          : "border-[#00D992]/15 text-[#E8EEF2]/50 hover:text-[#E8EEF2]/80"
      )}>
        <span>VS</span>
        {opponents.length > 0 && (
          <div className="flex -space-x-1">
            {opponents.map((o) => (
              <div key={o.championId} className="relative">
                <img
                  src={`${cdnBaseUrl()}/img/champion/${o.name}.png`}
                  alt={o.name}
                  className="w-5 h-5 rounded-sm ring-1 ring-black"
                />
                {o.itemId && (
                  <img
                    src={`${cdnBaseUrl()}/img/item/${o.itemId}.png`}
                    alt={o.itemName ?? ""}
                    className="absolute -bottom-1 -right-1 w-3 h-3 rounded-sm ring-1 ring-black"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </DialogTrigger>

      {/* Fullscreen overlay with floating pentagram slots */}
      {open && createPortal(
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          onClick={() => setOpen(false)}
        >
          {/* Dim backdrop + CRT scan lines */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,217,146,0.018) 2px, rgba(0,217,146,0.018) 4px)',
            }}
          />

          <style>{`
            @keyframes pentSlotIn {
              0%   { opacity: 0; transform: translate(-50%, -50%) scaleY(0); }
              60%  { opacity: 1; transform: translate(-50%, -50%) scaleY(1.04); }
              100% { opacity: 1; transform: translate(-50%, -50%) scaleY(1); }
            }
            @keyframes searchPanelIn {
              0%   { opacity: 0; transform: translate(-50%, 8px); }
              100% { opacity: 1; transform: translate(-50%, 0); }
            }
          `}</style>

          {/* Pentagon slots — 5 floating cards */}
          {ROLES.map((r, i) => {
            const opp = slotMap[r.key]
            const isActive = activeSlot === r.key
            // Pentagon vertices — tight
            const pos = [
              { top: "26%", left: "50%" },   // TOP
              { top: "42%", left: "35%" },   // JNG
              { top: "42%", left: "65%" },   // MID
              { top: "60%", left: "38%" },   // ADC
              { top: "60%", left: "62%" },   // SUP
            ][i]

            return (
              <div
                key={r.key}
                className="absolute"
                style={{
                  top: pos.top,
                  left: pos.left,
                  opacity: 0,
                  animation: `pentSlotIn 0.35s ease-out ${0.04 + i * 0.07}s forwards`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (opp) return
                    setActiveSlot(isActive ? null : r.key)
                    setActiveItemSlot(null)
                    setSearch("")
                  }}
                  className={cn(
                    "relative overflow-hidden w-[220px] rounded-md border p-5 transition-all",
                    "bg-black/80 backdrop-blur-xl",
                    isActive
                      ? "border-jade/50 shadow-[0_0_12px_rgba(0,217,146,0.15)] cursor-clicker"
                      : opp
                        ? "border-[#00D992]/30 shadow-[0_0_8px_rgba(0,217,146,0.06)] cursor-clicker"
                        : "border-white/15 shadow-[0_0_8px_rgba(255,255,255,0.03)] hover:border-white/25 cursor-clicker"
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <r.Icon className={cn("w-6 h-6", opp ? "text-[#00D992]" : "text-[#E8EEF2]/25")} />
                    <span className={cn(
                      "text-[12px] font-jetbrains uppercase tracking-[0.18em]",
                      opp ? "text-[#00D992]" : "text-[#E8EEF2]/20"
                    )}>
                      {r.label}
                    </span>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3">
                    {opp ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={`${cdnBaseUrl()}/img/champion/${opp.name}.png`}
                            alt={opp.name}
                            className="w-8 h-8 rounded-sm"
                          />
                          <span className="text-[13px] font-jetbrains text-flash/80 truncate flex-1 text-left">
                            {opp.name}
                          </span>
                          <span
                            onClick={(e) => { e.stopPropagation(); onClearOpponent(r.key) }}
                            className="text-[#E8EEF2]/20 hover:text-[#E8EEF2] text-sm cursor-clicker transition-colors"
                          >
                            ✕
                          </span>
                        </div>
                        {/* Item row */}
                        <div className="flex items-center gap-2 pl-1 mt-1">
                          {opp.itemId ? (
                            <>
                              <img
                                src={`${cdnBaseUrl()}/img/item/${opp.itemId}.png`}
                                alt={opp.itemName ?? ""}
                                className="w-5 h-5 rounded-sm"
                              />
                              <span className="text-[10px] font-jetbrains text-flash/50 truncate flex-1 text-left">
                                {opp.itemName}
                              </span>
                              <span
                                onClick={(e) => { e.stopPropagation(); onClearItem(r.key) }}
                                className="text-[#E8EEF2]/15 hover:text-[#E8EEF2] text-[10px] cursor-clicker transition-colors"
                              >
                                ✕
                              </span>
                            </>
                          ) : (
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveItemSlot(activeItemSlot === r.key ? null : r.key)
                                setActiveSlot(null)
                                setSearch("")
                              }}
                              className="group/item flex items-center gap-2 cursor-clicker"
                            >
                              {/* Diamond icon */}
                              <span className={cn(
                                "relative w-4 h-4 flex items-center justify-center transition-all duration-200",
                              )}>
                                <span className={cn(
                                  "absolute w-[10px] h-[10px] rotate-45 rounded-[2px] border transition-all duration-200",
                                  activeItemSlot === r.key
                                    ? "border-jade/80 bg-jade/15 shadow-[0_0_8px_rgba(0,217,146,0.3)]"
                                    : "border-jade/30 bg-transparent group-hover/item:border-jade/50 group-hover/item:bg-jade/5"
                                )} />
                                <span className={cn(
                                  "relative text-[8px] font-bold transition-colors duration-200",
                                  activeItemSlot === r.key
                                    ? "text-jade"
                                    : "text-jade/40 group-hover/item:text-jade/70"
                                )}>+</span>
                              </span>
                              <span className={cn(
                                "text-[9px] font-jetbrains uppercase tracking-[0.12em] transition-colors duration-200",
                                activeItemSlot === r.key
                                  ? "text-jade"
                                  : "text-jade/35 group-hover/item:text-jade/60"
                              )}>
                                Item
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className={cn(
                        "text-[12px] font-jetbrains uppercase tracking-[0.15em]",
                        isActive ? "text-jade" : "text-[#E8EEF2]/15"
                      )}>
                        + Add
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}

          {/* Floating search panel — champion or item mode */}
          {(activeSlot || activeItemSlot) && (
            <div
              className="absolute left-1/2 bottom-[8%] w-[420px]"
              style={{ animation: "searchPanelIn 0.25s ease-out forwards" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={cn(
                "rounded-md border border-jade/20 p-4",
                "bg-black/70 backdrop-blur-xl",
                "shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_0.5px_rgba(255,255,255,0.06)]"
              )}>
                <div className="relative mb-3">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={activeItemSlot
                      ? `Search item for ${ROLES.find((rl) => rl.key === activeItemSlot)?.label ?? ""}...`
                      : `Search champion for ${ROLES.find((rl) => rl.key === activeSlot)?.label ?? ""}...`
                    }
                    className={cn(
                      "w-full bg-white/[0.03] border border-white/[0.06] rounded-sm",
                      "px-3 py-2 text-[13px] font-jetbrains text-flash placeholder:text-flash/20",
                      "focus:outline-none focus:border-jade/30 transition-colors"
                    )}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className={cn(
                    "absolute bottom-0 left-0 h-[1px] bg-jade/50 transition-all duration-300",
                    search.length > 0 ? "w-full" : "w-0"
                  )} />
                </div>

                {activeItemSlot ? (
                  /* Item search grid */
                  <div className="max-h-[200px] overflow-y-auto overscroll-none cyber-scrollbar">
                    {filteredItems.length === 0 ? (
                      <div className="text-center py-3">
                        <span className="text-[10px] font-jetbrains text-flash/20 uppercase tracking-[0.2em]">
                          No match
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2">
                        {filteredItems.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            className={cn(
                              "group flex flex-col items-center gap-1 py-2 px-1 rounded-sm cursor-clicker",
                              "bg-white/[0.02] border border-transparent",
                              "hover:bg-jade/10 hover:border-jade/20 transition-all duration-150"
                            )}
                            onClick={() => handleItemSelect(it)}
                          >
                            <img
                              src={`${cdnBaseUrl()}/img/item/${it.id}.png`}
                              alt={it.name}
                              className="w-8 h-8 rounded-sm transition-transform duration-150 group-hover:scale-105 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)]"
                            />
                            <span className="text-[7px] font-jetbrains text-flash/35 group-hover:text-jade/80 truncate max-w-[70px] transition-colors text-center leading-tight">
                              {it.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Champion search grid */
                  <div className="max-h-[160px] overflow-y-auto overscroll-none cyber-scrollbar">
                    {trimmed.length < 2 ? (
                      <div className="text-center py-3">
                        <span className="text-[10px] font-jetbrains text-flash/20 uppercase tracking-[0.2em]">
                          min. 2 characters
                        </span>
                      </div>
                    ) : filteredChamps.length === 0 ? (
                      <div className="text-center py-3">
                        <span className="text-[10px] font-jetbrains text-flash/20 uppercase tracking-[0.2em]">
                          No match
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-2">
                        {filteredChamps.map((champ) => (
                          <button
                            key={champ.id}
                            type="button"
                            className={cn(
                              "group flex flex-col items-center gap-1.5 py-2 px-1 rounded-sm cursor-clicker",
                              "bg-white/[0.02] border border-transparent",
                              "hover:bg-jade/10 hover:border-jade/20 transition-all duration-150"
                            )}
                            onClick={() => handleSelect(champ.name)}
                          >
                            <img
                              src={`${cdnBaseUrl()}/img/champion/${champ.name}.png`}
                              alt={champ.name}
                              className="w-10 h-10 rounded-sm transition-transform duration-150 group-hover:scale-105 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)]"
                            />
                            <span className="text-[8px] font-jetbrains text-flash/35 group-hover:text-jade/80 truncate max-w-[50px] transition-colors">
                              {champ.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>,
      document.body)}
    </Dialog>
  )
}

const FILTER_REGIONS: { key: string; label: string }[] = [
  { key: "euw1", label: "EUW" },
  { key: "na1",  label: "NA" },
  { key: "kr",   label: "KR" },
  { key: "jp1",  label: "JP" },
  { key: "br1",  label: "BR" },
  { key: "oc1",  label: "OCE" },
  { key: "tr1",  label: "TR" },
  { key: "ru",   label: "RU" },
]

function PatchFilterButton({ value, onChange, patches }: { value: string | null; onChange: (v: string | null) => void; patches: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-10 px-3 rounded-full border transition-colors cursor-clicker",
            "bg-[#00D992]/[0.02] hover:border-[#00D992]/40",
            "text-[10px] font-mono uppercase tracking-wider",
            value ? "text-[#00D992] border-[#00D992]/50" : "border-[#00D992]/15 text-[#E8EEF2]/50"
          )}
        >
          {value ?? "Latest"}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-liquirice border border-[#1A1A1A] p-4 max-w-[260px] rounded-xl">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#E8EEF2]/40 mb-3">Patch</p>
        <div className="max-h-[240px] overflow-y-auto scrollbar-hide space-y-1">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className={cn(
              "w-full text-left px-3 py-2 rounded-md text-[11px] font-mono tracking-wider transition-colors cursor-clicker",
              value === null ? "text-[#00D992] bg-[#00D992]/10" : "text-[#E8EEF2]/50 hover:bg-white/5"
            )}
          >
            Latest
          </button>
          {patches.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => { onChange(p); setOpen(false) }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-[11px] font-mono tracking-wider transition-colors cursor-clicker",
                value === p ? "text-[#00D992] bg-[#00D992]/10" : "text-[#E8EEF2]/50 hover:bg-white/5"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RegionFilterButton({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const regionLabel = value ? FILTER_REGIONS.find((r) => r.key === value)?.label ?? value : null
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-10 rounded-full border transition-colors cursor-clicker flex items-center justify-center",
            "bg-[#00D992]/[0.02] hover:border-[#00D992]/40",
            "text-[10px] font-mono uppercase tracking-wider",
            value ? "text-[#00D992] border-[#00D992]/50 px-3" : "border-[#00D992]/15 text-[#E8EEF2]/50 w-10"
          )}
        >
          {regionLabel ?? <Globe className="h-4 w-4" />}
        </button>
      </DialogTrigger>
      <DialogContent className="bg-liquirice border border-[#1A1A1A] p-4 max-w-[280px] rounded-xl">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#E8EEF2]/40 mb-3">Region</p>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false) }}
            className={cn(
              "px-2 py-2 rounded-md transition-colors cursor-clicker flex items-center justify-center",
              value === null ? "text-[#00D992] bg-[#00D992]/10 ring-1 ring-[#00D992]/30" : "text-[#E8EEF2]/50 hover:bg-white/5"
            )}
          >
            <Globe className="h-4 w-4" />
          </button>
          {FILTER_REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => { onChange(r.key); setOpen(false) }}
              className={cn(
                "px-2 py-2 rounded-md text-[11px] font-mono tracking-wider transition-colors cursor-clicker text-center",
                value === r.key ? "text-[#00D992] bg-[#00D992]/10 ring-1 ring-[#00D992]/30" : "text-[#E8EEF2]/50 hover:bg-white/5"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FilterBar({
  selectedPatch,
  onPatchChange,
  availablePatches,
  selectedRegion,
  onRegionChange,
  role,
  onRoleChange,
  suggestedRole,
  tier,
  onTierChange,
  opponents,
  champions,
  onSetOpponent,
  onClearOpponent,
  legendaryItems,
  onSetItem,
  onClearItem,
}: {
  selectedPatch: string | null
  onPatchChange: (v: string | null) => void
  availablePatches: string[]
  selectedRegion: string | null
  onRegionChange: (v: string | null) => void
  role: RoleKey | null
  onRoleChange: (v: RoleKey | null) => void
  suggestedRole?: RoleKey | null
  tier: TierKey | null
  onTierChange: (v: TierKey | null) => void
  opponents: OpponentEntry[]
  champions: { id: string; name: string }[]
  onSetOpponent: (role: RoleKey, champName: string) => void
  onClearOpponent: (role: RoleKey) => void
  legendaryItems: LegendaryItem[]
  onSetItem: (role: RoleKey, itemId: number, itemName: string) => void
  onClearItem: (role: RoleKey) => void
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999]">
      <div className="bg-liquirice/90 backdrop-blur-xl border border-[#1A1A1A] rounded-full px-4 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,217,146,0.06)]">
        <div className="flex items-center gap-2">
          {/* Patch filter */}
          <PatchFilterButton value={selectedPatch} onChange={onPatchChange} patches={availablePatches} />

          {/* Region filter */}
          <RegionFilterButton value={selectedRegion} onChange={onRegionChange} />

          {/* Separator */}
          <div className="h-6 w-px bg-[#00D992]/10 mx-1" />

          {/* Role filter */}
          <button
            type="button"
            onClick={() => onRoleChange(null)}
            className={cn(
              "h-10 px-3 rounded-full border transition-colors cursor-clicker",
              "bg-[#00D992]/[0.02] hover:border-[#00D992]/40",
              "text-[10px] font-mono uppercase tracking-wider",
              role === null ? "text-[#00D992] border-[#00D992]/50" : "border-[#00D992]/15 text-[#E8EEF2]/50"
            )}
            title="All roles"
            aria-pressed={role === null}
          >
            All
          </button>

          {ROLES.map((r) => {
            const active = role === r.key
            const beam = role === null && suggestedRole === r.key

            return (
              <div
                key={r.key}
                className={cn(
                  "relative h-10 w-10 rounded-full overflow-hidden",
                  active ? "border border-[#00D992]/70" : "border border-[#00D992]/15",
                  "bg-[#00D992]/[0.02] hover:border-[#00D992]/40 transition-colors"
                )}
                title={r.label}
              >
                {beam && !active && <BorderBeam duration={8} size={80} />}

                <button
                  type="button"
                  onClick={() => onRoleChange(r.key)}
                  aria-pressed={active}
                  className={cn(
                    "relative z-10 h-full w-full flex items-center justify-center",
                    "bg-transparent cursor-clicker"
                  )}
                >
                  <r.Icon className={cn("h-6 w-6", active ? "text-[#00D992]" : "text-[#E8EEF2]/55")} />
                </button>
              </div>
            )
          })}

          {/* Separator */}
          <div className="h-6 w-px bg-[#00D992]/10 mx-1" />

          {/* Rank filter */}
          <RankFilterButton value={tier} onChange={onTierChange} />

          {/* Separator */}
          <div className="h-6 w-px bg-[#00D992]/10 mx-1" />

          {/* Opponent pentagon dialog */}
          <OpponentPentagonDialog
            opponents={opponents}
            champions={champions}
            onSetOpponent={onSetOpponent}
            onClearOpponent={onClearOpponent}
            selectedRole={role}
            legendaryItems={legendaryItems}
            onSetItem={onSetItem}
            onClearItem={onClearItem}
          />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MATCHUP ROW (safe)
// ─────────────────────────────────────────────────────────────

function MatchupRow({
  champion,
  winrate,
  games,
  image,
  variant = "default",
}: {
  champion: string
  winrate: number
  games: number
  image: string
  variant?: "default" | "low"
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-[#00D992]/[0.02] border-l-2 border-[#00D992]/20 hover:border-[#00D992]/50 transition-colors">
      <img
        src={image || "/placeholder.svg"}
        alt={champion}
        className="w-8 h-8 border border-[#00D992]/30 grayscale-[20%]"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[#E8EEF2] text-sm font-mono tracking-wide truncate">{champion}</div>
        <div className="text-[#E8EEF2]/25 text-[10px] font-mono">{num(games).toLocaleString()} GAMES</div>
      </div>
      <div
        className={cn(
          "text-sm font-mono font-bold tabular-nums",
          variant === "low" ? "text-[#00875A]" : "text-[#00D992]"
        )}
      >
        {pct(winrate, 1)}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 border-b border-[#00D992]/10 pb-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-[#00D992]" />
        <h3 className="text-[#E8EEF2] text-xs font-mono uppercase tracking-[0.25em]">{title}</h3>
      </div>
      {subtitle && <p className="text-[#E8EEF2]/25 text-[10px] font-mono mt-1 ml-3">{subtitle}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SKELETON HELPERS
// ─────────────────────────────────────────────────────────────

function SkeletonSectionHeader({ withSubtitle = false }: { withSubtitle?: boolean }) {
  return (
    <div className="mb-4 border-b border-[#00D992]/10 pb-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-[#00D992]/20 animate-pulse" />
        <div className="h-3 w-24 rounded bg-[#E8EEF2]/8 animate-pulse" />
      </div>
      {withSubtitle && <div className="h-2.5 w-32 rounded bg-[#E8EEF2]/5 animate-pulse mt-1 ml-3" />}
    </div>
  )
}

function SkeletonMatchupRow() {
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-[#00D992]/[0.02] border-l-2 border-[#00D992]/10">
      <div className="w-8 h-8 border border-[#00D992]/15 bg-[#E8EEF2]/5 animate-pulse" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 w-20 rounded bg-[#E8EEF2]/8 animate-pulse" />
        <div className="h-2.5 w-14 rounded bg-[#E8EEF2]/5 animate-pulse" />
      </div>
      <div className="h-4 w-12 rounded bg-[#00D992]/10 animate-pulse" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RANK FILTER (dialog)
// ─────────────────────────────────────────────────────────────

type TierKey = "EMERALD" | "EMERALD+" | "DIAMOND" | "DIAMOND+" |
  "MASTER" | "MASTER+" | "GRANDMASTER" | "CHALLENGER"

const TIERS: { key: TierKey; label: string; icon: string }[] = [
  { key: "EMERALD", label: "Emerald", icon: "emerald" },
  { key: "EMERALD+", label: "Emerald+", icon: "emerald" },
  { key: "DIAMOND", label: "Diamond", icon: "diamond" },
  { key: "DIAMOND+", label: "Diamond+", icon: "diamond" },
  { key: "MASTER", label: "Master", icon: "master" },
  { key: "MASTER+", label: "Master+", icon: "master" },
  { key: "GRANDMASTER", label: "Grandmaster", icon: "grandmaster" },
  { key: "CHALLENGER", label: "Challenger", icon: "challenger" },
]

const miniRankIcon = (tier: string) => {
  const folder = getLegacyRankIcons() ? "miniranks-legacy" : "miniranks"
  return `${cdnBaseUrl()}/img/${folder}/${tier.toLowerCase()}.png`
}

function RankFilterButton({
  value,
  onChange,
}: {
  value: TierKey | null
  onChange: (v: TierKey | null) => void
}) {
  const [open, setOpen] = useState(false)
  const activeT = TIERS.find(t => t.key === value)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "flex items-center gap-2 h-8 px-3 rounded-sm border cursor-pointer",
          "transition-all duration-200",
          "text-[10px] font-mono uppercase tracking-wider",
          value
            ? "border-jade/30 bg-jade/[0.06] text-jade/80"
            : "border-flash/[0.08] bg-flash/[0.02] text-flash/40 hover:border-jade/20 hover:text-flash/60"
        )}
      >
        {activeT ? (
          <>
            <img src={miniRankIcon(activeT.icon)} alt={activeT.label} className="w-4 h-4 object-contain" />
            <span>{activeT.label}</span>
          </>
        ) : (
          <>
            <span className="text-[10px]">ELO:</span>
            <span>DIAMOND+</span>
          </>
        )}
      </DialogTrigger>

      <DialogContent className="w-full max-w-[340px] bg-transparent shadow-none border-none flex flex-col items-center [&>button]:hidden">
        <div className="w-full relative">
          <div
            className={cn(
              "relative overflow-hidden rounded-sm",
              "bg-[#060e10]/95 backdrop-blur-xl",
              "border border-flash/[0.06]",
              "shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/20" />
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.015) 3px, rgba(0,217,146,0.015) 4px)",
              }}
            />

            <div className="relative z-10 px-5 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-jade/40 rounded-full" />
                  <span className="text-[10px] font-mono text-flash/40 tracking-[0.25em] uppercase">
                    Rank Filter
                  </span>
                </div>
                <button
                  type="button"
                  className={cn(
                    "text-[9px] font-mono uppercase tracking-[0.15em] cursor-pointer",
                    "px-2 py-0.5 rounded-sm",
                    "text-flash/25 hover:text-jade/60",
                    "transition-colors duration-150"
                  )}
                  onClick={() => { onChange(null); setOpen(false) }}
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {TIERS.map((t) => {
                  const active = value === t.key
                  const isPlus = t.key.endsWith("+")
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => { onChange(t.key); setOpen(false) }}
                      className={cn(
                        "group flex items-center gap-2.5 py-2 px-3 rounded-sm cursor-pointer",
                        "border transition-all duration-150",
                        active
                          ? "bg-jade/[0.08] border-jade/25"
                          : "bg-flash/[0.015] border-transparent hover:bg-jade/[0.04] hover:border-jade/15"
                      )}
                    >
                      <img
                        src={miniRankIcon(t.icon)}
                        alt={t.label}
                        className={cn(
                          "w-6 h-6 object-contain transition-opacity shrink-0",
                          active ? "opacity-100" : "opacity-40 group-hover:opacity-70"
                        )}
                      />
                      <span className={cn(
                        "text-[11px] font-mono tracking-wide transition-colors",
                        active ? "text-jade" : "text-flash/35 group-hover:text-flash/60",
                        isPlus && "font-semibold"
                      )}>
                        {t.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 pt-2 border-t border-flash/[0.04]">
                <span className="text-[9px] font-mono text-flash/20 tracking-wide">
                  "+" includes all ranks above
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

export function ChampionStats({
  champ,
  patch,
  keyToId,
}: {
  champ: ChampInfo
  patch: string
  keyToId: Record<string, string>
}) {
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<RoleKey | null>(null)
  const [tier, setTier] = useState<TierKey | null>(null)
  const [opponents, setOpponents] = useState<OpponentEntry[]>([])
  const [selectedPatch, setSelectedPatch] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [availablePatches, setAvailablePatches] = useState<string[]>([])

  // Rune data
  type RuneCombo = { perk_keystone: number; perk_primary_style: number; perk_sub_style: number; games: number; wins: number; winrate: number; pick_rate: number }
  const [runes, setRunes] = useState<RuneCombo[]>([])

  // Item data (flat from snapshot)
  type ItemStat = { item_id: number; games: number; wins: number; winrate: number; pick_rate: number }
  const [items, setItems] = useState<ItemStat[]>([])

  // Build order data (per-slot legendary items)
  type BuildOrderItem = { slot_index: number; item_id: number; games: number; wins: number; winrate: number; pick_rate?: number }
  const [buildOrder, setBuildOrder] = useState<BuildOrderItem[]>([])

  const rawSuggestedRole = (stats?.meta?.role as string | null) ?? null
  const suggestedRole: RoleKey | null = rawSuggestedRole === "UTILITY" ? "SUPPORT" : (rawSuggestedRole as RoleKey | null)

  const champIdFromKey = (k: number) => keyToId[String(k)] || String(k)
  const champIconFromKey = (k: number) =>
    `https://cdn2.loldata.cc/16.1.1/img/champion/${champIdFromKey(k)}.png`

  const championList = useMemo(() =>
    Object.entries(keyToId).map(([, id]) => ({ id, name: id })), [keyToId])

  const idToKey = useMemo(() => {
    const map: Record<string, number> = {}
    for (const [key, id] of Object.entries(keyToId)) map[id] = Number(key)
    return map
  }, [keyToId])

  // Item metadata for the item picker
  const [itemsMeta, setItemsMeta] = useState<Record<string, { name: string; into?: string[]; gold?: { total: number; purchasable: boolean }; maps?: Record<string, boolean> }>>({})
  useEffect(() => {
    let cancelled = false
    fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
      .then((r) => r.json())
      .then((json: any) => {
        if (cancelled) return
        const map: typeof itemsMeta = {}
        for (const [id, item] of Object.entries<any>(json.data || {})) {
          map[id] = { name: item.name, into: item.into, gold: item.gold, maps: item.maps }
        }
        setItemsMeta(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Fetch available patches
  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE_URL}/api/champion/patches`)
      .then((r) => r.json())
      .then((json: { patches: string[] }) => {
        if (!cancelled && json.patches?.length) setAvailablePatches(json.patches)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const legendaryItems: LegendaryItem[] = useMemo(() => {
    const all = Object.entries(itemsMeta)
      .filter(([, m]) => (!m.into || m.into.length === 0) && m.gold?.purchasable !== false && (m.gold?.total ?? 0) >= 2000 && m.maps?.["11"] !== false)
      .map(([id, m]) => ({ id: Number(id), name: m.name }))
      .sort((a, b) => a.id - b.id)
    const seen = new Set<string>()
    return all.filter((it) => {
      if (seen.has(it.name)) return false
      seen.add(it.name)
      return true
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [itemsMeta])

  const setOpponentForRole = (role: RoleKey, champName: string) => {
    const key = idToKey[champName]
    if (!key) return
    setOpponents((prev) => [
      ...prev.filter((o) => o.role !== role && o.championId !== key),
      { championId: key, name: champName, role, itemId: null, itemName: null },
    ])
  }

  const clearOpponentRole = (role: RoleKey) => {
    setOpponents((prev) => prev.filter((o) => o.role !== role))
  }

  const setItemForRole = (role: RoleKey, itemId: number, itemName: string) => {
    setOpponents((prev) => prev.map((o) => o.role === role ? { ...o, itemId, itemName } : o))
  }

  const clearItemForRole = (role: RoleKey) => {
    setOpponents((prev) => prev.map((o) => o.role === role ? { ...o, itemId: null, itemName: null } : o))
  }

  const opponentsKey = JSON.stringify(opponents)

  // Refetch when any filter changes (keep old data visible during load)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // Don't clear stats — keep stale data visible while loading

    fetch(`${API_BASE_URL}/api/champion/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        championId: Number(champ.key),
        patch: selectedPatch,
        region: selectedRegion,
        queueId: 420,
        role: role === "SUPPORT" ? "UTILITY" : role,
        tier: tier,
        opponents: opponents.length > 0
          ? opponents.map((o) => ({ championId: o.championId, role: o.role === "SUPPORT" ? "UTILITY" : o.role, ...(o.itemId ? { itemId: o.itemId } : {}) }))
          : null,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load champion stats")
        return r.json()
      })
      .then((json: StatsPayload) => {
        if (!cancelled) setStats(json)
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message ?? "Error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [champ.key, selectedPatch, selectedRegion, role, tier, opponentsKey])

  // Use rune data from snapshot if available, otherwise fetch from API
  useEffect(() => {
    if (stats?.runes?.length) {
      setRunes(stats.runes as RuneCombo[])
      return
    }
    if (!champ.key) return
    const roleParam = role === "SUPPORT" ? "UTILITY" : role
    fetch(`${API_BASE_URL}/api/champion/runes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ championId: Number(champ.key), role: roleParam, tier }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.runes) setRunes(data.runes) })
      .catch(() => {})
  }, [stats, champ.key, role, tier])

  // Extract items from stats snapshot (already included in snapshot data)
  useEffect(() => {
    if (stats?.items) {
      setItems(stats.items as ItemStat[])
    } else {
      // Fetch items separately if not in snapshot
      if (!champ.key) return
      const roleParam = role === "SUPPORT" ? "UTILITY" : role
      fetch(`${API_BASE_URL}/api/champion/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ championName: champ.id, championId: Number(champ.key), role: roleParam, tier }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.slots) {
            const allItems: ItemStat[] = []
            for (const items of Object.values<any[]>(data.slots)) allItems.push(...items)
            const seen = new Map<number, ItemStat>()
            for (const item of allItems) {
              const games = (item as any).total_games ?? item.games ?? 0
              const existing = seen.get(item.item_id)
              if (!existing || games > (existing.games ?? 0)) {
                seen.set(item.item_id, { item_id: item.item_id, games, wins: item.wins, winrate: item.winrate, pick_rate: item.pick_rate ?? 0 })
              }
            }
            setItems(Array.from(seen.values()).sort((a, b) => b.games - a.games))
          }
        })
        .catch(() => {})
    }
  }, [stats, champ.key, champ.id, role, tier])

  // Fetch build order data (per-slot item winrates)
  useEffect(() => {
    if (!champ.key) return
    const roleParam = role === "SUPPORT" ? "UTILITY" : role
    // Query the champion_build_order RPC via Supabase
    fetch(`${API_BASE_URL}/api/champion/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        championName: champ.id,
        championId: Number(champ.key),
        role: roleParam,
        tier,
        buildOrder: true,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.buildOrder) {
          setBuildOrder(data.buildOrder)
        }
      })
      .catch(() => {})
  }, [champ.key, champ.id, role, tier])

  const floatingBar = (
    <FilterBar
      selectedPatch={selectedPatch} onPatchChange={setSelectedPatch} availablePatches={availablePatches}
      selectedRegion={selectedRegion} onRegionChange={setSelectedRegion}
      role={role} onRoleChange={setRole} suggestedRole={suggestedRole}
      tier={tier} onTierChange={setTier}
      opponents={opponents} champions={championList}
      onSetOpponent={setOpponentForRole} onClearOpponent={clearOpponentRole}
      legendaryItems={legendaryItems} onSetItem={setItemForRole} onClearItem={clearItemForRole}
    />
  )

  if (loading) {
    return (
      <div className="w-full space-y-3 pb-20">
        {floatingBar}
        {/* WINRATE / KDA / ECONOMY skeletons */}
        <div className="grid grid-cols-3 gap-3">
          {/* Winrate skeleton */}
          <TechCard className="p-5">
            <SkeletonSectionHeader />
            <div className="text-center space-y-3">
              <div className="mx-auto h-8 w-28 rounded bg-[#00D992]/10 animate-pulse" />
              <div className="flex items-center justify-center gap-6">
                <div className="text-center space-y-1">
                  <div className="mx-auto h-2.5 w-10 rounded bg-[#E8EEF2]/5 animate-pulse" />
                  <div className="mx-auto h-4 w-14 rounded bg-[#E8EEF2]/8 animate-pulse" />
                </div>
                <div className="h-8 w-px bg-[#00D992]/10" />
                <div className="text-center space-y-1">
                  <div className="mx-auto h-2.5 w-12 rounded bg-[#E8EEF2]/5 animate-pulse" />
                  <div className="mx-auto h-4 w-14 rounded bg-[#E8EEF2]/8 animate-pulse" />
                </div>
              </div>
            </div>
          </TechCard>

          {/* Avg KDA skeleton */}
          <TechCard className="p-5">
            <SkeletonSectionHeader />
            <div className="flex items-center justify-center gap-3">
              <div className="h-6 w-12 rounded bg-[#00D992]/10 animate-pulse" />
              <span className="text-[#E8EEF2]/15">/</span>
              <div className="h-6 w-12 rounded bg-[#E8EEF2]/8 animate-pulse" />
              <span className="text-[#E8EEF2]/15">/</span>
              <div className="h-6 w-12 rounded bg-[#00B377]/10 animate-pulse" />
            </div>
            <div className="text-center mt-2">
              <div className="mx-auto h-3 w-20 rounded bg-[#E8EEF2]/5 animate-pulse" />
            </div>
          </TechCard>

          {/* Economy skeleton */}
          <TechCard className="p-5">
            <SkeletonSectionHeader />
            <div className="space-y-3">
              {["CS/GAME", "GOLD/GAME"].map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[#E8EEF2]/30 text-xs font-mono">{label}</span>
                  <div className="h-4 w-16 rounded bg-[#E8EEF2]/8 animate-pulse" />
                </div>
              ))}
            </div>
          </TechCard>
        </div>

        {/* MATCHUPS skeletons (2 cols) */}
        <div className="grid grid-cols-2 gap-3">
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMatchupRow key={i} />
              ))}
            </div>
          </TechCard>
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMatchupRow key={i} />
              ))}
            </div>
          </TechCard>
        </div>

        {/* SYNERGIES & COUNTERS skeletons (2 cols) */}
        <div className="grid grid-cols-2 gap-3">
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMatchupRow key={i} />
              ))}
            </div>
          </TechCard>
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonMatchupRow key={i} />
              ))}
            </div>
          </TechCard>
        </div>

        {/* DRAGONS skeleton */}
        <TechCard className="p-5">
          <SkeletonSectionHeader withSubtitle />
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="text-center p-3 border border-[#00D992]/10 bg-[#00D992]/[0.02]"
              >
                <div className="mx-auto h-2 w-12 rounded bg-[#E8EEF2]/5 animate-pulse mb-2" />
                <div className="mx-auto h-5 w-10 rounded bg-[#00D992]/10 animate-pulse" />
              </div>
            ))}
          </div>
        </TechCard>

        {/* OBJECTIVES skeleton (4 cols) */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <TechCard key={i} className="p-4 text-center space-y-1">
              <div className="mx-auto h-2 w-16 rounded bg-[#E8EEF2]/5 animate-pulse" />
              <div className="mx-auto h-6 w-12 rounded bg-[#00D992]/10 animate-pulse" />
              <div className="mx-auto h-2 w-14 rounded bg-[#E8EEF2]/5 animate-pulse" />
            </TechCard>
          ))}
        </div>

        {/* PHASE + TIER skeletons (2 cols) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Phase Analysis skeleton */}
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="h-[120px] flex items-end gap-2 px-2">
              {[60, 80, 45].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="h-3 w-10 rounded bg-[#E8EEF2]/5 animate-pulse" />
                  <div
                    className="w-full rounded bg-[#00D992]/10 animate-pulse"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="text-center space-y-1">
                  <div className="mx-auto h-3 w-10 rounded bg-[#00D992]/8 animate-pulse" />
                  <div className="mx-auto h-2 w-12 rounded bg-[#E8EEF2]/5 animate-pulse" />
                </div>
              ))}
            </div>
          </TechCard>

          {/* Meta Position skeleton */}
          <TechCard className="p-5">
            <SkeletonSectionHeader withSubtitle />
            <div className="grid grid-cols-4 gap-2 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="text-center p-3 border border-[#00D992]/10 bg-[#00D992]/[0.02]"
                >
                  <div className="mx-auto h-7 w-6 rounded bg-[#00B377]/10 animate-pulse mb-1" />
                  <div className="mx-auto h-2 w-14 rounded bg-[#E8EEF2]/5 animate-pulse" />
                </div>
              ))}
            </div>
          </TechCard>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full space-y-3 pb-20">
        {floatingBar}
        <div className="px-6 text-red-400">Error: {error}</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="w-full space-y-3 pb-20">
        {floatingBar}
        <div className="px-6 text-neutral-400">NO STATS AVAILABLE.</div>
      </div>
    )
  }

  const core = stats.core ?? {
    winrate: 0,
    pickrate: 0,
    banrate: null,
    gamesAnalyzed: 0,
    avgKDA: { kills: 0, deaths: 0, assists: 0 },
    avgCS: null,
    avgGold: 0,
    avgDamage: 0,
  }

  const gamesAnalyzed = num(core.gamesAnalyzed, 0)
  const noGames = gamesAnalyzed === 0

  if (noGames) {
    return (
      <div className="w-full space-y-3 pb-20">
        {floatingBar}
        <TechCard className="p-6">
          <div className="text-[#E8EEF2] font-mono text-sm">NO GAMES FOR THIS FILTER.</div>
          <div className="text-[#E8EEF2]/30 font-mono text-[10px] mt-2">
            Try another role, rank, or adjust opponents.
          </div>
        </TechCard>
      </div>
    )
  }

  const avgKDA = core.avgKDA ?? { kills: 0, deaths: 0, assists: 0 }
  const k = num(avgKDA.kills, 0)
  const d = num(avgKDA.deaths, 0)
  const a = num(avgKDA.assists, 0)

  const coreStats = {
    winrate: num(core.winrate, 0),
    pickrate: num(core.pickrate, 0),
    gamesAnalyzed,
    avgKDA: { kills: k, deaths: d, assists: a },
    avgCS: core.avgCS,
    avgGold: num(core.avgGold, 0),
    avgDamage: num(core.avgDamage, 0),
  }

  const bestMatchups = (stats.bestMatchups ?? []).map((m) => ({
    champion: champIdFromKey(m.championKey),
    winrate: num(m.winrate, 0),
    games: num(m.games, 0),
    image: champIconFromKey(m.championKey),
  }))

  const worstMatchups = (stats.worstMatchups ?? []).map((m) => ({
    champion: champIdFromKey(m.championKey),
    winrate: num(m.winrate, 0),
    games: num(m.games, 0),
    image: champIconFromKey(m.championKey),
  }))

  const bestSynergies = (stats.bestSynergies ?? []).map((m) => ({
    champion: champIdFromKey(m.championKey),
    winrate: num(m.winrate, 0),
    games: num(m.games, 0),
    image: champIconFromKey(m.championKey),
  }))

  const worstCounters = (stats.worstCounters ?? []).map((m) => ({
    champion: champIdFromKey(m.championKey),
    winrate: num(m.winrate, 0),
    games: num(m.games, 0),
    image: champIconFromKey(m.championKey),
  }))

  const objectiveWinrates = {
    riftHerald: num((stats.objectiveWinrates?.riftHerald as any)?.winrate ?? stats.objectiveWinrates?.riftHerald, 0),
    voidgrubs: num((stats.objectiveWinrates?.voidgrubs as any)?.winrate ?? stats.objectiveWinrates?.voidgrubs, 0),
    baron: num((stats.objectiveWinrates?.firstBaron as any)?.winrate ?? stats.objectiveWinrates?.firstBaron, 0),
    elderDragon: num((stats.objectiveWinrates?.elderDragon as any)?.winrate ?? stats.objectiveWinrates?.elderDragon, 0),
    firstDragon: num((stats.objectiveWinrates?.firstDragon as any)?.winrate ?? stats.objectiveWinrates?.firstDragon, 0),
  }

  const gamePhaseWinrates = (stats.gamePhaseWinrates ?? []).map((p) => ({
    phase: p.phase,
    time: p.time,
    winrate: num(p.winrate, 0),
  }))

  // Meta Position — use tier from tier list if available, fallback based on winrate
  const tierRankings = (() => {
    const wr = num(stats.core?.winrate, 50)
    // Simple heuristic: map winrate to tier letter
    const toTier = (w: number) => w >= 53 ? "S" : w >= 51 ? "A" : w >= 49 ? "B" : w >= 47 ? "C" : "D"
    return [
      { tier: "Iron-Bronze", position: toTier(wr - 1) },
      { tier: "Silver-Gold", position: toTier(wr) },
      { tier: "Platinum", position: toTier(wr + 0.5) },
      { tier: "Diamond+", position: toTier(wr) },
    ]
  })()

  // Map API dragon sub_type names to display names
  const dragonNameMap: Record<string, string> = {
    FIRE_DRAGON: "Infernal",
    EARTH_DRAGON: "Mountain",
    WATER_DRAGON: "Ocean",
    AIR_DRAGON: "Cloud",
    HEXTECH_DRAGON: "Hextech",
    CHEMTECH_DRAGON: "Chemtech",
  }
  const soulData = new Map((stats.dragonSoulWinrates ?? []).map(d => [d.name, d]))
  const dragonWinrates = [
    "FIRE_DRAGON", "EARTH_DRAGON", "WATER_DRAGON", "AIR_DRAGON", "HEXTECH_DRAGON", "CHEMTECH_DRAGON",
  ].map(key => {
    const d = soulData.get(key)
    return { name: dragonNameMap[key] ?? key, winrate: num(d?.winrate, 0), games: d?.games ?? 0 }
  })

  return (
    <div className="w-full space-y-3 pb-20">
      {floatingBar}

      <div className="transition-opacity duration-300" style={{ opacity: loading ? 0.4 : 1 }}>
      {/* WINRATE / KDA / ECONOMY */}
      <div className="grid grid-cols-3 gap-3">
        <TechCard className="p-5">
          <SectionHeader title="Winrate" subtitle={
            [role, tier, opponents.length > 0 ? `VS ${opponents.map((o) => o.name + (o.role ? ` ${o.role}` : '')).join(', ')}` : null].filter(Boolean).join(' · ') || undefined
          } />
          <div className="text-center">
            <div className="text-[#00D992] text-3xl font-mono font-bold tabular-nums">
              {pct(coreStats.winrate, 2)}
            </div>
            <div className="mt-2 flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-[0.2em]">
                  Sample
                </div>
                <div className="text-[#E8EEF2] text-sm font-mono font-bold tabular-nums">
                  {coreStats.gamesAnalyzed.toLocaleString()}
                </div>
              </div>

              <div className="h-8 w-px bg-[#00D992]/10" />

              <div className="text-center">
                <div className="text-[#E8EEF2]/30 text-[9px] font-mono uppercase tracking-[0.2em]">
                  Pickrate
                </div>
                <div className="text-[#E8EEF2] text-sm font-mono font-bold tabular-nums">
                  {pct(coreStats.pickrate, 2)}
                </div>
              </div>
            </div>
          </div>
        </TechCard>

        <TechCard className="p-5">
          <SectionHeader title="Avg KDA" />
          <div className="flex items-center justify-center gap-3 text-xl font-mono">
            <span className="text-[#00D992] font-bold">{k.toFixed(2)}</span>
            <span className="text-[#E8EEF2]/15">/</span>
            <span className="text-[#E8EEF2]/50 font-bold">{d.toFixed(2)}</span>
            <span className="text-[#E8EEF2]/15">/</span>
            <span className="text-[#00B377] font-bold">{a.toFixed(2)}</span>
          </div>
          <div className="text-center mt-2">
            <span className="text-[#E8EEF2]/30 text-[10px] font-mono tracking-wider">
              RATIO: {((k + a) / Math.max(1, d)).toFixed(2)}
            </span>
          </div>
        </TechCard>

        <TechCard className="p-5">
          <SectionHeader title="Economy" />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#E8EEF2]/30 text-xs font-mono">CS/GAME</span>
              <span className="text-[#E8EEF2] font-mono font-bold tabular-nums">
                {core.avgCS == null ? "N/A" : num(core.avgCS).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#E8EEF2]/30 text-xs font-mono">GOLD/GAME</span>
              <span className="text-[#00D992] font-mono font-bold tabular-nums">
                {coreStats.avgGold.toLocaleString()}
              </span>
            </div>
          </div>
        </TechCard>
      </div>

      {/* MATCHUPS */}
      <div className="grid grid-cols-2 gap-3">
        <TechCard className="p-5">
          <SectionHeader title="Best Matchups" subtitle="Highest WR against" />
          <div className="space-y-1">
            {bestMatchups.map((m) => (
              <MatchupRow key={m.champion} {...m} variant="default" />
            ))}
          </div>
        </TechCard>

        <TechCard className="p-5">
          <SectionHeader title="Worst Matchups" subtitle="Lowest WR against" />
          <div className="space-y-1">
            {worstMatchups.map((m) => (
              <MatchupRow key={m.champion} {...m} variant="low" />
            ))}
          </div>
        </TechCard>
      </div>

      {/* SYNERGIES & COUNTERS */}
      <div className="grid grid-cols-2 gap-3">
        <TechCard className="p-5">
          <SectionHeader title="Best Synergies" subtitle="Optimal duo partners" />
          <div className="space-y-1">
            {bestSynergies.map((m) => (
              <MatchupRow key={m.champion} {...m} variant="default" />
            ))}
          </div>
        </TechCard>

        <TechCard className="p-5">
          <SectionHeader title="Worst Counters" subtitle="Highest threat enemies" />
          <div className="space-y-1">
            {worstCounters.map((m) => (
              <MatchupRow key={m.champion} {...m} variant="low" />
            ))}
          </div>
        </TechCard>
      </div>

      {/* DRAGONS */}
      <TechCard className="p-5">
        <SectionHeader title="Dragon Soul Analysis" subtitle="Winrate when securing each soul type" />
        <div className="grid grid-cols-6 gap-2">
          {dragonWinrates.map((d) => (
            <div
              key={d.name}
              className="text-center p-3 border border-[#00D992]/10 bg-[#00D992]/[0.02]"
            >
              <div className="text-[#E8EEF2]/40 text-[8px] font-mono uppercase tracking-wider mb-2">
                {d.name}
              </div>
              <div className="text-[#00D992] text-lg font-mono font-bold tabular-nums">
                {pct(d.winrate, 0)}
              </div>
            </div>
          ))}
        </div>
      </TechCard>

      {/* OBJECTIVES */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "First Dragon", value: objectiveWinrates.firstDragon },
          { label: "Rift Herald", value: objectiveWinrates.riftHerald },
          { label: "Voidgrubs", value: objectiveWinrates.voidgrubs },
          { label: "Baron Nashor", value: objectiveWinrates.baron },
          { label: "Elder Dragon", value: objectiveWinrates.elderDragon },
        ].map((obj) => (
          <TechCard key={obj.label} className="p-4 text-center">
            <div className="text-[#E8EEF2]/30 text-[8px] font-mono uppercase tracking-wider">
              {obj.label}
            </div>
            <div className="text-[#00D992] text-xl font-mono font-bold mt-1 tabular-nums">
              {pct(obj.value, 0)}
            </div>
            <div className="text-[#E8EEF2]/15 text-[8px] font-mono tracking-wider">WR ON SECURE</div>
          </TechCard>
        ))}
      </div>

      {/* PHASE + TIER */}
      <div className="grid grid-cols-2 gap-3">
        <TechCard className="p-5">
          <SectionHeader title="Phase Analysis" subtitle="Performance by game length" />
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gamePhaseWinrates} layout="vertical">
                <XAxis type="number" domain={[40, 70]} hide />
                <YAxis
                  type="category"
                  dataKey="phase"
                  tick={{ fill: "#E8EEF2", fontSize: 9, fontFamily: "monospace" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Bar dataKey="winrate" radius={0} fill="#00D992" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between mt-2 px-1">
            {gamePhaseWinrates.map((p) => (
              <div key={p.phase} className="text-center">
                <div className="text-[#00D992] text-xs font-mono font-bold tabular-nums">
                  {pct(p.winrate, 0)}
                </div>
                <div className="text-[#E8EEF2]/20 text-[8px] font-mono">{p.time}</div>
              </div>
            ))}
          </div>
        </TechCard>

        {/* ── Runes ── */}
        {runes.length > 0 && (
          <TechCard className="p-5">
            <SectionHeader title="Runes" subtitle="Keystone + secondary tree winrates" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {runes.slice(0, 8).map((r, idx) => {
                const wrColor = r.winrate >= 52 ? "text-jade" : r.winrate >= 50 ? "text-flash/50" : "text-red-400/70"
                const keystoneIcon = getKeystoneIcon(r.perk_keystone)
                const keystoneName = getKeystoneName(r.perk_keystone) ?? `Keystone ${r.perk_keystone}`
                const subStyleName = getStyleName(r.perk_sub_style) ?? ""
                const subStyleIcon = getStyleIcon(r.perk_sub_style)
                const isTop = idx === 0
                return (
                  <div key={idx} className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm border transition-colors",
                    isTop ? "bg-jade/[0.04] border-jade/15" : "bg-flash/[0.015] border-transparent"
                  )}>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {keystoneIcon && <img src={keystoneIcon} alt="" className={cn("rounded-full", isTop ? "w-8 h-8" : "w-6 h-6")} onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />}
                      {subStyleIcon && <img src={subStyleIcon} alt="" className="w-4 h-4 rounded-full opacity-40" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn("font-mono truncate", isTop ? "text-[12px] text-flash/60" : "text-[10px] text-flash/40")}>{keystoneName}</div>
                      <div className="text-[9px] font-mono text-flash/20">{subStyleName} · {r.pick_rate.toFixed(1)}% pick · {Number(r.games).toLocaleString()} games</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("font-mono font-semibold tabular-nums", wrColor, isTop ? "text-[15px]" : "text-[13px]")}>{r.winrate.toFixed(1)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </TechCard>
        )}

        {/* ── Item Build Path ── */}
        {(() => {
          // Group build order items by slot
          const slotGroups = new Map<number, BuildOrderItem[]>()
          for (const bo of buildOrder) {
            const idx = bo.slot_index ?? (bo as any).legendary_index ?? 0
            if (!slotGroups.has(idx)) slotGroups.set(idx, [])
            slotGroups.get(idx)!.push(bo)
          }
          const slots = Array.from(slotGroups.entries()).sort(([a], [b]) => a - b).slice(0, 6)
          const slotLabels = ["1st Item", "2nd Item", "3rd Item", "4th Item", "5th Item", "6th Item"]

          // If build order data exists, show per-slot. Otherwise show flat items.
          if (slots.length > 0) {
            return (
              <TechCard className="p-5">
                <SectionHeader title="Item Build Path" subtitle="Winrate by build position" />
                <div className="space-y-4">
                  {slots.map(([slotIdx, slotItems]) => (
                    <div key={slotIdx}>
                      <div className="text-[10px] font-mono text-jade/40 uppercase tracking-[0.2em] mb-2">
                        {slotLabels[slotIdx - 1] ?? `Item ${slotIdx}`}
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {slotItems.slice(0, 8).map((item) => {
                          const wrColor = item.winrate >= 52 ? "text-jade" : item.winrate >= 50 ? "text-flash/50" : "text-red-400/70"
                          return (
                            <div key={item.item_id} className="flex flex-col items-center gap-1 p-2 rounded-sm bg-flash/[0.02] border border-flash/[0.04] min-w-[70px] shrink-0">
                              <img
                                src={`${cdnBaseUrl()}/img/item/${item.item_id}.png`}
                                alt=""
                                className="w-8 h-8 rounded-[2px] border border-flash/[0.08]"
                                onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
                              />
                              <span className={cn("text-[12px] font-mono font-semibold tabular-nums", wrColor)}>{item.winrate.toFixed(1)}%</span>
                              <span className="text-[8px] font-mono text-flash/20">{Number(item.games).toLocaleString()}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </TechCard>
            )
          }

          // Fallback: flat item list
          if (items.length > 0) {
            return (
              <TechCard className="p-5">
                <SectionHeader title="Most Built Items" subtitle="Legendary items by pick rate" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {items.slice(0, 12).map((item) => {
                    const wrColor = item.winrate >= 52 ? "text-jade" : item.winrate >= 50 ? "text-flash/50" : "text-red-400/70"
                    return (
                      <div key={item.item_id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-sm bg-flash/[0.015] border border-transparent hover:border-jade/10 transition-colors">
                        <img
                          src={`${cdnBaseUrl()}/img/item/${item.item_id}.png`}
                          alt=""
                          className="w-7 h-7 rounded-[2px] border border-flash/[0.08] shrink-0"
                          onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-[12px] font-mono font-semibold tabular-nums", wrColor)}>{item.winrate.toFixed(1)}%</div>
                          <div className="text-[9px] font-mono text-flash/20">{item.pick_rate > 0 ? `${item.pick_rate.toFixed(1)}% pick` : ""} · {item.games.toLocaleString()}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </TechCard>
            )
          }

          return null
        })()}

        <TechCard className="p-5">
          <SectionHeader title="Meta Position" subtitle="Estimated tier by rank bracket" />
          <div className="grid grid-cols-4 gap-2 mt-4">
            {tierRankings.map((t) => (
              <div
                key={t.tier}
                className="text-center p-3 border border-[#00D992]/10 bg-[#00D992]/[0.02]"
              >
                <div className={cn("text-2xl font-bold font-mono mb-1",
                  t.position === "S" ? "text-amber-400" :
                  t.position === "A" ? "text-[#00B377]" :
                  t.position === "B" ? "text-flash/60" :
                  t.position === "C" ? "text-orange-400" : "text-red-400"
                )}>
                  {t.position}
                </div>
                <div className="text-[#E8EEF2]/30 text-[8px] font-mono uppercase tracking-wider">
                  {t.tier}
                </div>
              </div>
            ))}
          </div>
        </TechCard>
      </div>
      </div>{/* end opacity transition wrapper */}
    </div>
  )
}
