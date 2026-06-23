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
      <div className="rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-6">
        <div className="text-flash/40 font-jetbrains text-[11px] uppercase tracking-[0.2em] animate-pulse">
          Loading items...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-6">
        <div className="text-[#ff6286] font-jetbrains text-[11px] uppercase tracking-[0.2em]">{error}</div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-6">
        <div className="text-flash/40 font-jetbrains text-[11px] uppercase tracking-[0.2em]">
          No item data available
        </div>
      </div>
    )
  }

  const totalGames = items.reduce((s, i) => s + (i.total_games ?? i.games ?? 0), 0) / items.length

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-4 sm:p-5"
      style={{
        boxShadow:
          "0 40px 90px -50px rgba(0,217,146,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Faint scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="relative space-y-4">
        {/* Section header */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-jade shrink-0"
              style={{ boxShadow: "0 0 8px #00d992" }}
            />
            <h3 className="text-[11px] font-chakrapetch font-bold uppercase tracking-[0.28em] text-jade/80">
              Most Built Items
            </h3>
            <span className="h-px flex-1 bg-gradient-to-r from-jade/15 to-transparent" />
          </div>
          <p className="text-flash/40 text-[10px] font-jetbrains uppercase tracking-[0.2em] ml-4">
            Legendary items sorted by pick rate
          </p>
        </div>

        {/* Item rows */}
        <div className="space-y-1">
          {items.map((item, idx) => {
            const games = item.total_games ?? item.games ?? 0
            const idStr = String(item.item_id)
            const meta = itemsMeta[idStr]
            const name = meta?.name ?? `Item ${idStr}`
            const wrColor =
              item.winrate >= 52
                ? "text-jade"
                : item.winrate >= 50
                ? "text-flash/70"
                : "text-[#ff6286]"
            const pickRate = item.pick_rate ?? 0
            const isTop3 = idx < 3

            return (
              <Link
                key={item.item_id}
                to={`/items/${item.item_id}`}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-lg",
                  "bg-flash/[0.02] ring-1 ring-inset ring-flash/[0.05]",
                  "hover:bg-jade/[0.04] hover:ring-jade/20",
                  "transition-colors"
                )}
              >
                {/* Rank number */}
                <span
                  className={cn(
                    "font-chakrapetch font-bold text-[12px] tabular-nums w-5 text-right shrink-0",
                    isTop3 ? "text-jade" : "text-flash/40"
                  )}
                >
                  {idx + 1}
                </span>

                {/* Item icon */}
                <img
                  src={`${cdnBaseUrl()}/img/item/${item.item_id}.png`}
                  alt={name}
                  className="w-8 h-8 rounded-md ring-1 ring-inset ring-flash/10 shrink-0"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
                />

                {/* Name + pick rate bar */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-jetbrains text-flash/80 truncate group-hover:text-flash transition-colors">
                    {name}
                  </div>
                  {pickRate > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-[3px] bg-flash/[0.06] rounded-full overflow-hidden max-w-[120px]">
                        <div
                          className="h-full bg-gradient-to-r from-jade to-jade/30 rounded-full"
                          style={{ width: `${Math.min(pickRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-jetbrains text-flash/40 tabular-nums">
                        {fmtPct(pickRate)} pick
                      </span>
                    </div>
                  )}
                </div>

                {/* Winrate */}
                <div className="text-right shrink-0">
                  <div className={cn("text-[13px] font-jetbrains font-semibold tabular-nums", wrColor)}>
                    {fmtPct(item.winrate)}
                  </div>
                  <div className="text-[9px] font-jetbrains text-flash/40 tabular-nums">
                    {games.toLocaleString()} games
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
