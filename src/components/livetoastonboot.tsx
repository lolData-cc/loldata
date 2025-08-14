// components/LiveToastOnBoot.tsx
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useAuth } from "@/context/authcontext"
import { useLiveViewer } from "@/context/liveviewercontext"
import { API_BASE_URL } from "@/config"

const STORAGE_KEY = "loldata:lastLiveGameId"

export function LiveToastOnBoot() {
  const { nametag, region, loading } = useAuth()
  const { openWith } = useLiveViewer()
  const firedRef = useRef(false) // evita doppie chiamate allo strict mode

  useEffect(() => {
    if (loading || firedRef.current) return
    firedRef.current = true

    ;(async () => {
      try {
        if (!nametag || !region) return

        const [name, tag] = nametag.split("#")
        if (!name || !tag) return

        // 1) prendo info summoner (per il PUUID)
        const summonerRes = await fetch(`${API_BASE_URL}/api/summoner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, tag, region }),
        })
        const summonerData = await summonerRes.json()
        const puuid: string | undefined = summonerData?.summoner?.puuid
        const isLive: boolean = Boolean(summonerData?.summoner?.live)

        if (!puuid || !isLive) return

        // 2) prendo i dettagli della live per avere un gameId affidabile
        const liveRes = await fetch(`${API_BASE_URL}/api/livegame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puuid, region }),
        })

        if (liveRes.status === 204) return // non live
        const liveData = await liveRes.json()
        const gameId = liveData?.game?.gameId || liveData?.game?.gameStartTime // fallback

        if (!gameId) return

        // 3) evita toast duplicati per lo stesso game
        const last = sessionStorage.getItem(STORAGE_KEY)
        if (String(last) === String(gameId)) return
        sessionStorage.setItem(STORAGE_KEY, String(gameId))

        // 4) Sonner toast + CTA
        toast("ooks like you are playing. Check out the game here.", {
          description: `${name}#${tag} • ${region.toUpperCase()}`,
          action: {
            label: "Open Live Viewer",
            onClick: () => openWith({ puuid, riotId: `${name}#${tag}`, region }),
          },
          duration: 100000,
          closeButton: true,
        })
      } catch (e) {
        // silenzioso: niente toast d’errore qui
        console.warn("[LiveToastOnBoot] failed", e)
      }
    })()
  }, [nametag, region, loading, openWith])

  return null
}
