import { useEffect, useState, useCallback } from "react"
import { API_BASE_URL } from "@/config"

type OverviewData = {
  today: any
  baseline: any
  strengths: string[]
  weaknesses: string[]
}

let cachedData: { data: OverviewData; ts: number; key: string } | null = null
const CACHE_TTL = 60_000 // 60s

export function useLearnOverview(puuid: string | null, region: string | null, nametag: string | null) {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch_ = useCallback(async () => {
    if (!puuid || !region) { setLoading(false); return }

    const key = `${puuid}:${region}`
    if (cachedData && cachedData.key === key && Date.now() - cachedData.ts < CACHE_TTL) {
      setData(cachedData.data)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await globalThis.fetch(`${API_BASE_URL}/api/learn/overview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puuid, region, nametag, debug: true }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      cachedData = { data: json, ts: Date.now(), key }
      setData(json)
    } catch (err: any) {
      setError(err.message ?? "Failed to load overview")
    } finally {
      setLoading(false)
    }
  }, [puuid, region, nametag])

  useEffect(() => { fetch_() }, [fetch_])

  return { data, loading, error, refetch: fetch_ }
}
