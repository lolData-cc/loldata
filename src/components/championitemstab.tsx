// src/components/champion/ChampionItemsTab.tsx
"use client"

import React from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { API_BASE_URL, cdnBaseUrl } from "@/config"

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type ItemCardProps = {
  itemId: number
  name: string
  tooltip: string
  winrate: number
  totalGames: number
  iconUrl: string
}

type ItemRow = {
  legendary_index: number
  item_id: number
  total_games: number
  wins: number
  winrate: number
}

type ApiResponse = {
  championName: string
  slots: Record<string, ItemRow[]>
}

type Props = {
  champ: { name: string; key?: string }
  patch: string
  role?: string | null
  tier?: string | null
}

type ItemMeta = {
  name: string
  plaintext?: string
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const slotLabel = (displayIndex: number) => {
  const map: Record<number, string> = {
    1: "First Item",
    2: "Second Item",
    3: "Third Item",
    4: "Fourth Item",
    5: "Fifth Item",
    6: "Sixth Item",
  }
  return map[displayIndex] ?? `Item ${displayIndex}`
}

const fmtPct = (x: number, digits = 2) => `${x.toFixed(digits)}%`

const itemIconUrl = (patch: string, itemId: number) =>
  `${cdnBaseUrl()}/img/item/${itemId}.png`

// ─────────────────────────────────────────────────────────────
// TECH CARD (matches champion-stats.tsx)
// ─────────────────────────────────────────────────────────────

function TechCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("bg-liquirice border border-[#1A1A1A]", className)}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SECTION HEADER (matches champion-stats.tsx)
// ─────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-4 border-b border-[#00D992]/10 pb-2">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 bg-[#00D992]" />
        <h3 className="text-[#E8EEF2] text-xs font-mono uppercase tracking-[0.25em]">
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="text-[#E8EEF2]/25 text-[10px] font-mono mt-1 ml-3">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ITEM CARD (horizontal layout - compact card style)
// ─────────────────────────────────────────────────────────────

function ItemCard({
  itemId,
  name,
  tooltip,
  winrate,
  totalGames,
  iconUrl,
}: ItemCardProps) {
  return (
    <Link
      to={`/items/${itemId}`}
      className="flex flex-col items-center p-3 bg-[#00D992]/[0.02] border border-[#00D992]/10 hover:border-[#00D992]/30 hover:bg-[#00D992]/[0.05] transition-all w-[120px] flex-shrink-0"
      title={tooltip}
    >
      <img
        src={iconUrl || "/placeholder.svg"}
        alt={name}
        className="w-10 h-10 border border-[#00D992]/30 grayscale-[20%] mb-2"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.style.display = "none"
        }}
      />
      <div className="text-[#E8EEF2] text-[10px] font-mono tracking-wide text-center truncate w-full">
        {name}
      </div>
      <div className="text-[#00D992] text-xs font-mono font-bold tabular-nums mt-1">
        {fmtPct(winrate, 1)}
      </div>
      <div className="text-[#E8EEF2]/25 text-[9px] font-mono">
        {totalGames.toLocaleString()}
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

export function ChampionItemsTab({ champ, patch, role, tier }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, ItemRow[]>>({})
  const [itemsMeta, setItemsMeta] = useState<Record<string, ItemMeta>>({})

  // Fetch items per champ from backend
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/champion/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        championName: champ.name,
        championId: champ.key ? Number(champ.key) : undefined,
        role: role ?? undefined,
        tier: tier ?? undefined,
        maxPerSlot: 12,
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load champion items")
        return r.json()
      })
      .then((data: ApiResponse) => {
        if (cancelled) return
        setSlots(data.slots || {})
      })
      .catch((e: any) => {
        if (cancelled) return
        setError(e?.message ?? "Error loading items")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [champ.name, champ.key, role, tier])

  // Fetch item.json from CDN for names
  useEffect(() => {
    let cancelled = false

    fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const map: Record<string, ItemMeta> = {}

        Object.entries<any>(json.data || {}).forEach(([id, item]) => {
          map[id] = {
            name: item.name,
            plaintext: item.plaintext,
          }
        })

        setItemsMeta(map)
      })
      .catch(() => {
        if (cancelled) return
        setItemsMeta({})
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Loading state
  if (loading) {
    return (
      <TechCard className="p-6">
        <div className="text-[#E8EEF2]/50 font-mono text-sm uppercase tracking-wider">
          Loading items...
        </div>
      </TechCard>
    )
  }

  // Error state
  if (error) {
    return (
      <TechCard className="p-6">
        <div className="text-red-400 font-mono text-sm">Error: {error}</div>
      </TechCard>
    )
  }

  const slotEntries = Object.entries(slots).sort(
    ([a], [b]) => Number(a) - Number(b)
  )

  // Empty state
  if (slotEntries.length === 0) {
    return (
      <TechCard className="p-6">
        <div className="text-[#E8EEF2] font-mono text-sm">
          NO ITEM DATA AVAILABLE.
        </div>
        <div className="text-[#E8EEF2]/30 font-mono text-[10px] mt-2">
          No item builds found for this champion.
        </div>
      </TechCard>
    )
  }

  return (
    <div className="w-full space-y-3">
      {/* Custom scrollbar styles */}
      <style>{`
        .green-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .green-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
          border-radius: 3px;
        }
        .green-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 217, 146, 0.3);
          border-radius: 3px;
        }
        .green-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 217, 146, 0.5);
        }
      `}</style>

      {/* Item slots - each section displays items horizontally */}
      <div className="space-y-4">
        {slotEntries.map(([slotKey, items], idx) => {
          const displayIndex = idx + 1
          const totalGamesInSlot = items.reduce(
            (sum, it) => sum + it.total_games,
            0
          )

          return (
            <TechCard key={slotKey} className="pt-5 px-0">
              <div className="px-5">
                <SectionHeader
                  title={slotLabel(displayIndex)}
                  subtitle={`${totalGamesInSlot.toLocaleString()} games analyzed`}
                />
              </div>

              <div 
                className="green-scrollbar flex gap-2 overflow-x-auto pb-3 px-5"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(0, 217, 146, 0.3) #0a0a0a',
                }}
              >
                {items.map((it) => {
                  const idStr = String(it.item_id)
                  const meta = itemsMeta[idStr]
                  const displayName = meta?.name ?? idStr
                  const tooltip = meta?.plaintext || displayName

                  return (
                    <ItemCard
                      key={it.item_id}
                      itemId={it.item_id}
                      name={displayName}
                      tooltip={tooltip}
                      winrate={it.winrate}
                      totalGames={it.total_games}
                      iconUrl={itemIconUrl(patch, it.item_id)}
                    />
                  )
                })}
              </div>
            </TechCard>
          )
        })}
      </div>
    </div>
  )
}
