import { useCallback, useEffect, useState } from "react"
import { API_BASE_URL } from "@/config"

export type TreeNode = {
  id: string
  category: string
  title: string
  short: string
  why: string
  how: string
  threshold: number
  state: "locked" | "progress" | "complete"
  progress: number
  eligibleGames: number
  successGames: number
  detail: string
  games: { matchId: string; champion: string; win: boolean; success: boolean }[]
}

export type TreeData = {
  role: string
  title: string
  tagline: string
  categories: { id: string; title: string; blurb: string }[]
  gamesAnalyzed: number
  nodes: TreeNode[]
  updatedAt: number
  needsPathSelection?: boolean
  comingSoon?: boolean
  roles?: string[]
}

// module cache so switching tabs doesn't refetch a heavy computation
let cache: { key: string; data: TreeData; ts: number } | null = null
const TTL = 5 * 60_000

export function useImprovementTree(puuid: string | null, region: string | null) {
  const [data, setData] = useState<TreeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (role?: string) => {
      if (!puuid || !region) { setLoading(false); return }
      const key = `${puuid}:${role ?? "_"}`
      if (!role && cache && cache.key.startsWith(`${puuid}:`) && Date.now() - cache.ts < TTL) {
        setData(cache.data); setLoading(false); return
      }
      setLoading(true); setError(null)
      try {
        const res = await globalThis.fetch(`${API_BASE_URL}/api/learn/improvement-tree`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puuid, region, ...(role ? { role } : {}) }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as TreeData
        if (!json.needsPathSelection && !json.comingSoon) cache = { key, data: json, ts: Date.now() }
        setData(json)
      } catch (e: any) {
        setError(e?.message ?? "Failed to load tree")
      } finally {
        setLoading(false)
      }
    },
    [puuid, region]
  )

  useEffect(() => { load() }, [load])

  // choosing a path forces a fresh fetch with the role (persists + recomputes)
  const choosePath = useCallback((role: string) => { cache = null; return load(role) }, [load])

  return { data, loading, error, reload: load, choosePath }
}
