// src/components/champion/ChampionItemsTab.tsx
"use client"

import React from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { API_BASE_URL, cdnBaseUrl } from "@/config"

type ItemData = {
  item_id: number
  total_games?: number
  games?: number
  wins: number
  winrate: number
  pick_rate?: number
}

type Props = {
  champ: { name: string; key?: string }
  patch: string
  role?: string | null
  tier?: string | null
}

type ItemMeta = { name: string; plaintext?: string }

const fmtPct = (x: number, digits = 1) => `${x.toFixed(digits)}%`

export function ChampionItemsTab({ champ, patch, role, tier }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ItemData[]>([])
  const [itemsMeta, setItemsMeta] = useState<Record<string, ItemMeta>>({})

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
      .then((data) => {
        if (cancelled) return
        // Handle both flat (snapshot) and slot-based (legacy) formats
        if (data.slots) {
          const allItems: ItemData[] = []
          for (const items of Object.values<any[]>(data.slots)) {
            allItems.push(...items)
          }
          // Deduplicate by item_id, keeping highest game count
          const seen = new Map<number, ItemData>()
          for (const item of allItems) {
            const existing = seen.get(item.item_id)
            const games = item.total_games ?? item.games ?? 0
            if (!existing || games > (existing.total_games ?? existing.games ?? 0)) {
              seen.set(item.item_id, item)
            }
          }
          setItems(Array.from(seen.values()).sort((a, b) =>
            (b.total_games ?? b.games ?? 0) - (a.total_games ?? a.games ?? 0)
          ))
        } else {
          setItems([])
        }
      })
      .catch((e: any) => {
        if (cancelled) return
        setError(e?.message ?? "Error loading items")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [champ.name, champ.key, role, tier])

  useEffect(() => {
    let cancelled = false
    fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        const map: Record<string, ItemMeta> = {}
        Object.entries<any>(json.data || {}).forEach(([id, item]) => {
          map[id] = { name: item.name, plaintext: item.plaintext }
        })
        setItemsMeta(map)
      })
      .catch(() => { if (!cancelled) setItemsMeta({}) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="p-6 bg-liquirice border border-[#1A1A1A]">
        <div className="text-flash/30 font-mono text-[11px] uppercase tracking-wider animate-pulse">
          Loading items...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-liquirice border border-[#1A1A1A]">
        <div className="text-red-400/60 font-mono text-[11px]">{error}</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-6 bg-liquirice border border-[#1A1A1A]">
        <div className="text-flash/30 font-mono text-[11px] uppercase tracking-wider">
          No item data available
        </div>
      </div>
    )
  }

  const totalGames = items.reduce((s, i) => s + (i.total_games ?? i.games ?? 0), 0) / items.length

  return (
    <div className="space-y-1">
      <div className="px-1 mb-3 border-b border-jade/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-jade" />
          <h3 className="text-flash text-xs font-mono uppercase tracking-[0.25em]">
            Most Built Items
          </h3>
        </div>
        <p className="text-flash/20 text-[10px] font-mono mt-1 ml-3">
          Legendary items sorted by pick rate
        </p>
      </div>

      <div className="space-y-[2px]">
        {items.map((item, idx) => {
          const games = item.total_games ?? item.games ?? 0
          const idStr = String(item.item_id)
          const meta = itemsMeta[idStr]
          const name = meta?.name ?? `Item ${idStr}`
          const wrColor = item.winrate >= 52 ? "text-jade" : item.winrate >= 50 ? "text-flash/50" : "text-red-400/70"
          const pickRate = item.pick_rate ?? 0

          return (
            <Link
              key={item.item_id}
              to={`/items/${item.item_id}`}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-sm",
                "bg-flash/[0.015] border border-transparent",
                "hover:bg-jade/[0.04] hover:border-jade/10",
                "transition-all duration-150"
              )}
            >
              {/* Rank number */}
              <span className="text-[10px] font-mono text-flash/15 w-4 text-right shrink-0">
                {idx + 1}
              </span>

              {/* Item icon */}
              <img
                src={`${cdnBaseUrl()}/img/item/${item.item_id}.png`}
                alt={name}
                className="w-8 h-8 rounded-[2px] border border-flash/[0.08] shrink-0"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
              />

              {/* Name + pick rate bar */}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-mono text-flash/60 truncate group-hover:text-flash/80 transition-colors">
                  {name}
                </div>
                {pickRate > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-[3px] bg-flash/[0.04] rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className="h-full bg-jade/30 rounded-full"
                        style={{ width: `${Math.min(pickRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-mono text-flash/20 tabular-nums">
                      {fmtPct(pickRate)} pick
                    </span>
                  </div>
                )}
              </div>

              {/* Winrate */}
              <div className="text-right shrink-0">
                <div className={cn("text-[13px] font-mono font-semibold tabular-nums", wrColor)}>
                  {fmtPct(item.winrate)}
                </div>
                <div className="text-[9px] font-mono text-flash/15 tabular-nums">
                  {games.toLocaleString()} games
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
