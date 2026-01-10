// src/components/champion/ChampionItemsTab.tsx
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { API_BASE_URL, CDN_BASE_URL } from "@/config"

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
  champ: { name: string } // es. "Aatrox"
  patch: string
}

type ItemMeta = {
  name: string
  plaintext?: string
}

const slotLabel = (displayIndex: number) => {
  const map: Record<number, string> = {
    1: "FIRST ITEM",
    2: "SECOND ITEM",
    3: "THIRD ITEM",
    4: "FOURTH ITEM",
    5: "FIFTH ITEM",
    6: "SIXTH ITEM",
  }
  return map[displayIndex] ?? `ITEM ${displayIndex}`
}

const fmtPct = (x: number) => `${x.toFixed(2)}%`

const itemIconUrl = (patch: string, itemId: number) =>
  `https://cdn.loldata.cc/15.13.1/img/item/${itemId}.png`

export function ChampionItemsTab({ champ, patch }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slots, setSlots] = useState<Record<string, ItemRow[]>>({})

  // 📦 mapping itemId -> { name, plaintext }
  const [itemsMeta, setItemsMeta] = useState<Record<string, ItemMeta>>({})

  // === fetch items per champ dal backend ===
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${API_BASE_URL}/api/champion/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        championName: champ.name,
        maxPerSlot: 12,
      }),
    })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load champion items")
        return r.json()
      })
      .then((data: ApiResponse) => {
        if (cancelled) return
        setSlots(data.slots || {})
      })
      .catch((e: any) => {
        if (cancelled) return
        setError(e?.message ?? "Errore caricamento items")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [champ.name])

  // === fetch item.json dal CDN per avere i nomi ===
  useEffect(() => {
    let cancelled = false

    fetch(`${CDN_BASE_URL}/data/en_US/item.json`)
      .then(r => r.json())
      .then(json => {
        if (cancelled) return
        const map: Record<string, ItemMeta> = {}

        // json.data = { "6610": { name: "Divine Sunderer", plaintext: "...", ... }, ... }
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

  if (loading) return <div className="text-neutral-300">LOADING ITEMS…</div>
  if (error) return <div className="text-red-400">Error: {error}</div>

  const slotEntries = Object.entries(slots).sort(
    ([a], [b]) => Number(a) - Number(b),
  )

  if (slotEntries.length === 0) {
    return <div className="text-neutral-400">NO ITEM DATA AVAILABLE.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {slotEntries.map(([slotKey, items], idx) => {
        const displayIndex = idx + 1
        return (
          <div
            key={slotKey}
            className="rounded-lg border border-white/10 bg-neutral-900/60 p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-white tracking-wide">
                {slotLabel(displayIndex)}
              </h3>
              <span className="text-[11px] text-neutral-400">
                {items.reduce((sum, it) => sum + it.total_games, 0)} games
              </span>
            </div>

            <div className="space-y-2">
              {items.map((it) => {
                const idStr = String(it.item_id)
                const meta = itemsMeta[idStr]
                const displayName = meta?.name ?? idStr
                const tooltip = meta?.plaintext || displayName

                return (
                  <Link
                    key={it.item_id}
                    to={`/items/${it.item_id}`}
                    className="flex items-center gap-3 rounded-md bg-neutral-900/80 border border-white/5 px-2 py-1.5 hover:bg-white/5 transition-colors"
                    title={tooltip}
                  >
                    <img
                      src={itemIconUrl(patch, it.item_id)}
                      alt={displayName}
                      className="h-8 w-8 rounded-md ring-1 ring-white/10 object-cover"
                      loading="lazy"
                      decoding="async"
                    />

                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-white">
                          {displayName}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {fmtPct(it.winrate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>{it.total_games} picks</span>
                        <span>{it.wins} wins</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
