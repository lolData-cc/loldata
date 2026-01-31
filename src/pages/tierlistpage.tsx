import { useEffect, useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { API_BASE_URL, CDN_BASE_URL } from "@/config"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  RoleTopIcon,
  RoleJungleIcon,
  RoleMidIcon,
  RoleAdcIcon,
  RoleSupportIcon,
} from "@/components/ui/roleicons"

type RoleKey = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "SUPPORT" | null

type ChampionTierData = {
  championKey: number
  championId: string
  championName: string
  winrate: number
  pickrate: number
  banrate: number
  games: number
  tier: "Z" | "S" | "A" | "B" | "C"
}

type TierListResponse = {
  patch: string
  role: string | null
  champions: ChampionTierData[]
}

const TIERS = ["Z", "S", "A", "B", "C"] as const

const tierColors: Record<string, { bg: string; border: string; text: string }> = {
  Z: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  S: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" },
  A: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400" },
  B: { bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-400" },
  C: { bg: "bg-neutral-500/10", border: "border-neutral-500/30", text: "text-neutral-400" },
}

const tierDescriptions: Record<string, string> = {
  Z: "God Tier - Overpowered champions that dominate the meta",
  S: "Excellent - Strong picks that perform exceptionally well",
  A: "Good - Reliable champions with solid performance",
  B: "Average - Viable picks but not optimal",
  C: "Below Average - Weaker picks in the current meta",
}

function calculateTier(winrate: number, pickrate: number, games: number): "Z" | "S" | "A" | "B" | "C" {
  // Minimum games threshold for reliable data
  if (games < 100) return "C"
  
  // Score based on winrate and pickrate
  // Winrate is weighted more heavily
  const wrScore = winrate - 50 // -50 to +50 range typically
  const prScore = Math.min(pickrate * 2, 10) // Cap pickrate contribution
  
  const totalScore = wrScore * 1.5 + prScore
  
  if (totalScore > 12) return "Z"
  if (totalScore > 6) return "S"
  if (totalScore > 0) return "A"
  if (totalScore > -6) return "B"
  return "C"
}

function RoleFilterBar({
  value,
  onChange,
}: {
  value: RoleKey
  onChange: (v: RoleKey) => void
}) {
  const roles: { key: RoleKey; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { key: "TOP", label: "Top", Icon: RoleTopIcon },
    { key: "JUNGLE", label: "Jungle", Icon: RoleJungleIcon },
    { key: "MIDDLE", label: "Mid", Icon: RoleMidIcon },
    { key: "BOTTOM", label: "ADC", Icon: RoleAdcIcon },
    { key: "SUPPORT", label: "Support", Icon: RoleSupportIcon },
  ]

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "h-10 px-4 rounded-md border transition-colors font-mono text-xs uppercase tracking-wider",
          value === null
            ? "border-jade/50 bg-jade/10 text-jade"
            : "border-flash/10 bg-flash/5 text-flash/50 hover:border-flash/20"
        )}
      >
        All
      </button>
      {roles.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          title={r.label}
          className={cn(
            "h-10 w-10 rounded-md border flex items-center justify-center transition-colors",
            value === r.key
              ? "border-jade/50 bg-jade/10"
              : "border-flash/10 bg-flash/5 hover:border-flash/20"
          )}
        >
          <r.Icon
            className={cn(
              "h-5 w-5",
              value === r.key ? "text-jade" : "text-flash/50"
            )}
          />
        </button>
      ))}
    </div>
  )
}

function ChampionCard({ champion, patch }: { champion: ChampionTierData; patch: string }) {
  const iconUrl = `${CDN_BASE_URL}/img/champion/${champion.championId}.png`
  const tier = tierColors[champion.tier]

  return (
    <Link
      to={`/champions/${champion.championId}`}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-lg border transition-all",
        "hover:scale-[1.02] hover:shadow-lg",
        tier.bg,
        tier.border
      )}
    >
      <img
        src={iconUrl}
        alt={champion.championName}
        className="w-12 h-12 rounded-md ring-1 ring-white/10"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm text-flash truncate">
          {champion.championName}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs font-mono text-jade">
            {champion.winrate.toFixed(1)}% WR
          </span>
          <span className="text-xs font-mono text-flash/40">
            {champion.pickrate.toFixed(1)}% PR
          </span>
        </div>
      </div>
      <div className={cn("text-2xl font-bold font-mono", tier.text)}>
        {champion.tier}
      </div>
    </Link>
  )
}

function TierSection({ tier, champions, patch }: { tier: string; champions: ChampionTierData[]; patch: string }) {
  const colors = tierColors[tier]
  
  if (champions.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-14 h-14 rounded-lg border-2 flex items-center justify-center font-mono text-2xl font-bold",
          colors.bg,
          colors.border,
          colors.text
        )}>
          {tier}
        </div>
        <div>
          <h3 className={cn("font-mono text-lg font-semibold", colors.text)}>
            {tier} Tier
          </h3>
          <p className="text-xs text-flash/40 font-mono">
            {tierDescriptions[tier]}
          </p>
        </div>
        <div className="ml-auto text-xs font-mono text-flash/30">
          {champions.length} champions
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {champions.map((champ) => (
          <ChampionCard key={champ.championKey} champion={champ} patch={patch} />
        ))}
      </div>
    </div>
  )
}

export default function TierListPage() {
  const [patches, setPatches] = useState<string[]>([])
  const [selectedPatch, setSelectedPatch] = useState<string>("")
  const [role, setRole] = useState<RoleKey>(null)
  const [champions, setChampions] = useState<ChampionTierData[]>([])
  const [keyToId, setKeyToId] = useState<Record<string, { id: string; name: string }>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch available patches
  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then((r) => r.json())
      .then((versions: string[]) => {
        // Get recent patches (last 5)
        const recentPatches = versions.slice(0, 5)
        setPatches(recentPatches)
        if (recentPatches.length > 0) {
          setSelectedPatch(recentPatches[0])
        }
      })
      .catch(() => setError("Failed to load patches"))
  }, [])

  // Fetch champion mapping
  useEffect(() => {
    if (!selectedPatch) return

    fetch(`${CDN_BASE_URL}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((data) => {
        const mapping: Record<string, { id: string; name: string }> = {}
        Object.values(data.data || {}).forEach((ch: any) => {
          mapping[ch.key] = { id: ch.id, name: ch.name }
        })
        setKeyToId(mapping)
      })
      .catch(() => {})
  }, [selectedPatch])

  // Fetch tierlist data
  useEffect(() => {
    if (!selectedPatch || Object.keys(keyToId).length === 0) return

    let cancelled = false
    setLoading(true)
    setError(null)

    // Fetch stats for all champions and calculate tiers
    const fetchAllChampionStats = async () => {
      try {
        const championKeys = Object.keys(keyToId)
        const batchSize = 20
        const allChampions: ChampionTierData[] = []

        for (let i = 0; i < championKeys.length; i += batchSize) {
          if (cancelled) return

          const batch = championKeys.slice(i, i + batchSize)
          const batchResults = await Promise.all(
            batch.map(async (key) => {
              try {
                const response = await fetch(`${API_BASE_URL}/api/champion/stats`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    championId: Number(key),
                    patch: null, // Use latest
                    queueId: 420, // Ranked Solo
                    role: role,
                  }),
                })

                if (!response.ok) return null

                const data = await response.json()
                const core = data?.core

                if (!core || core.gamesAnalyzed < 50) return null

                const champInfo = keyToId[key]
                const tier = calculateTier(
                  core.winrate ?? 50,
                  core.pickrate ?? 0,
                  core.gamesAnalyzed ?? 0
                )

                return {
                  championKey: Number(key),
                  championId: champInfo.id,
                  championName: champInfo.name,
                  winrate: core.winrate ?? 50,
                  pickrate: core.pickrate ?? 0,
                  banrate: core.banrate ?? 0,
                  games: core.gamesAnalyzed ?? 0,
                  tier,
                } as ChampionTierData
              } catch {
                return null
              }
            })
          )

          allChampions.push(...batchResults.filter((c): c is ChampionTierData => c !== null))
        }

        if (!cancelled) {
          // Sort by winrate within each tier
          allChampions.sort((a, b) => {
            const tierOrder = { Z: 0, S: 1, A: 2, B: 3, C: 4 }
            if (tierOrder[a.tier] !== tierOrder[b.tier]) {
              return tierOrder[a.tier] - tierOrder[b.tier]
            }
            return b.winrate - a.winrate
          })
          setChampions(allChampions)
          setLoading(false)
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load tierlist")
          setLoading(false)
        }
      }
    }

    fetchAllChampionStats()

    return () => {
      cancelled = true
    }
  }, [selectedPatch, keyToId, role])

  const championsByTier = useMemo(() => {
    const grouped: Record<string, ChampionTierData[]> = {
      Z: [],
      S: [],
      A: [],
      B: [],
      C: [],
    }

    champions.forEach((champ) => {
      grouped[champ.tier].push(champ)
    })

    return grouped
  }, [champions])

  return (
    <main className="min-h-dvh py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-mono font-bold text-flash mb-2">
          Champion Tier List
        </h1>
        <p className="text-flash/50 font-mono text-sm">
          Updated tier rankings based on winrate and pickrate data from Ranked Solo Queue
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-lg border border-flash/10 bg-flash/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-flash/40 uppercase tracking-wider">
            Patch
          </span>
          <Select value={selectedPatch} onValueChange={setSelectedPatch}>
            <SelectTrigger className="w-32 h-10 bg-liquirice border-flash/20 text-flash font-mono">
              <SelectValue placeholder="Select patch" />
            </SelectTrigger>
            <SelectContent className="bg-liquirice border-flash/20">
              {patches.map((p) => (
                <SelectItem key={p} value={p} className="text-flash font-mono">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-8 w-px bg-flash/10" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-flash/40 uppercase tracking-wider">
            Role
          </span>
          <RoleFilterBar value={role} onChange={setRole} />
        </div>

        {loading && (
          <div className="ml-auto text-xs font-mono text-jade animate-pulse">
            Loading champions...
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 font-mono text-sm mb-8">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !error && (
        <div className="space-y-8">
          {TIERS.map((tier) => (
            <div key={tier} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-14 h-14 rounded-lg border-2 flex items-center justify-center font-mono text-2xl font-bold animate-pulse",
                  tierColors[tier].bg,
                  tierColors[tier].border,
                  tierColors[tier].text
                )}>
                  {tier}
                </div>
                <div className="h-4 w-32 bg-flash/10 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg border border-flash/10 bg-flash/5 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tier Sections */}
      {!loading && !error && (
        <div className="space-y-10">
          {TIERS.map((tier) => (
            <TierSection
              key={tier}
              tier={tier}
              champions={championsByTier[tier]}
              patch={selectedPatch}
            />
          ))}

          {champions.length === 0 && (
            <div className="text-center py-16">
              <p className="text-flash/40 font-mono">
                No champion data available for the selected filters.
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
