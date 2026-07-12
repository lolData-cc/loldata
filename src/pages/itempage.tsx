// src/pages/itempage.tsx
//
// Item detail page — completely reworked to match the rest of the
// site's visual language (championdetailpage.tsx is the closest
// analog). All data-fetching logic, retry behaviour, race-condition
// guards, and URL params are preserved verbatim from the previous
// implementation; only the layout, typography and motion changed.

import { Link, useParams } from "react-router-dom"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { ArrowRight, ChevronDown, Coins, Sparkles, Users } from "lucide-react"
import { API_BASE_URL, cdnBaseUrl } from "@/config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FlickeringGrid } from "@/components/ui/flickering-grid"
import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"

// ─── Types ──────────────────────────────────────────────────────────
type ItemStats = {
  games: number
  wins: number
  winrate_pct: number
  total_games: number
  build_rate_pct: number
} | null

type BestUtilizer = {
  champion_id: number
  games: number
  wins: number
  winrate_pct: number
}

// ─── Brand tokens (shared with hero / search dialog / Jax) ──────────
const EASE_BRAND = [0.22, 1, 0.36, 1] as const

// `glassDark` recipe extracted from summonerpage.tsx so the page
// reads as native to the site rather than a fork of a fork.
const glassDark = cn(
  "relative overflow-hidden rounded-md",
  "bg-filmdark/25 backdrop-blur-lg saturate-150 glass-panel",
  "shadow-[0_10px_30px_rgba(var(--c-shadow),0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]"
)

// ─── Fetch helper with timeout + exponential backoff retries ────────
// Verbatim from the previous version — production-tested.
async function fetchJsonWithRetry(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
  retryCfg = { retries: 2, backoffMs: 600 }
) {
  const { timeoutMs = 8000, ...rest } = options
  let attempt = 0
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

  while (true) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...rest, signal: controller.signal })
      if (!res.ok) {
        if (
          [502, 503, 504].includes(res.status) &&
          attempt < retryCfg.retries
        ) {
          attempt++
          await sleep(retryCfg.backoffMs * Math.pow(2, attempt - 1))
          continue
        }
        const text = await res.text().catch(() => "")
        throw new Error(`HTTP ${res.status} ${text}`.trim())
      }
      return await res.json()
    } catch (err: any) {
      const isAbort = err?.name === "AbortError"
      if (
        (isAbort || err?.message?.includes("NetworkError")) &&
        attempt < retryCfg.retries
      ) {
        attempt++
        await sleep(retryCfg.backoffMs * Math.pow(2, attempt - 1))
        continue
      }
      throw err
    } finally {
      clearTimeout(id)
    }
  }
}

// ─── Reusable: section header with jade caps + gradient divider ─────
// Mirrors the section-header pattern used across champion detail
// page and elsewhere — same vocabulary, no surprises.
function SectionHeader({
  children,
  icon: Icon,
}: {
  children: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      {Icon ? <Icon className="w-3.5 h-3.5 text-jade/70" /> : null}
      <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/65 whitespace-nowrap">
        {children}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-jade/20 to-transparent" />
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────
export default function ItemPage() {
  const { itemId } = useParams<{ itemId: string }>()

  // === Item data (CDN) ===
  const [itemData, setItemData] = useState<any>(null)
  const [itemDataError, setItemDataError] = useState(false)

  // === Filters (rank/role/champion-ids) ===
  const [rank, setRank] = useState<string>("")
  const [role, setRole] = useState<string>("")
  const [championIds, setChampionIds] = useState<number[]>([])
  const [championCsv, setChampionCsv] = useState<string>("")

  // === Stats ===
  const [stats, setStats] = useState<ItemStats>(null)
  const [loadingStats, setLoadingStats] = useState<boolean>(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // === Best utilizers ===
  const [bestRows, setBestRows] = useState<BestUtilizer[]>([])
  const [loadingBest, setLoadingBest] = useState(false)

  // === Champion id → DDragon name map ===
  const [idToName, setIdToName] = useState<Record<number, string>>({})
  const champPath = `${cdnBaseUrl()}/img/champion`

  // Parse CSV → number[] (debounced via React batching).
  useEffect(() => {
    const parsed = championCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter((n) => Number.isFinite(n))
    setChampionIds(parsed)
  }, [championCsv])

  // Fetch item JSON from the CDN.
  useEffect(() => {
    if (!itemId) return
    setItemDataError(false)
    fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
      .then((res) => res.json())
      .then((data) => {
        const found = data.data[itemId]
        if (!found) {
          setItemDataError(true)
          setItemData(null)
        } else {
          setItemData(found)
        }
      })
      .catch(() => {
        setItemDataError(true)
        setItemData(null)
      })
  }, [itemId])

  // Champion-name map (one-shot).
  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then((r) => r.json())
      .then((json) => {
        const map: Record<number, string> = {}
        Object.entries<any>(json.data).forEach(([name, champ]) => {
          const keyNum = Number(champ.key)
          if (Number.isFinite(keyNum)) map[keyNum] = name
        })
        setIdToName(map)
      })
      .catch(() => setIdToName({}))
  }, [])

  // Stats with race-condition guard.
  useEffect(() => {
    if (!itemId) return
    let active = true
    setLoadingStats(true)
    setStatsError(null)

    fetchJsonWithRetry(
      `${API_BASE_URL}/api/itemstats`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: Number(itemId),
          tier: rank || null,
          role: role || null,
          championIds: championIds.length ? championIds : null,
          queues: [420, 440],
        }),
        timeoutMs: 12000,
      },
      { retries: 2, backoffMs: 700 }
    )
      .then((json) => {
        if (!active) return
        setStats(json?.stats ?? null)
      })
      .catch(() => {
        if (!active) return
        setStats(null)
        setStatsError("Couldn't load the stats. Try again in a moment.")
      })
      .finally(() => {
        if (!active) return
        setLoadingStats(false)
      })

    return () => {
      active = false
    }
  }, [itemId, rank, role, championIds])

  // Best utilizers with race-condition guard.
  useEffect(() => {
    if (!itemId) return
    let active = true
    setLoadingBest(true)

    fetchJsonWithRetry(
      `${API_BASE_URL}/api/itembestutilizers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: Number(itemId),
          tier: rank || null,
          role: role || null,
          queues: [420, 440],
          minGames: 5,
        }),
        timeoutMs: 12000,
      },
      { retries: 2, backoffMs: 700 }
    )
      .then((json) => {
        if (!active) return
        setBestRows(Array.isArray(json?.rows) ? json.rows : [])
      })
      .catch(() => {
        if (!active) return
        setBestRows([])
      })
      .finally(() => {
        if (!active) return
        setLoadingBest(false)
      })

    return () => {
      active = false
    }
  }, [itemId, rank, role])

  // ─── Loading + error states ──────────────────────────────────────
  if (itemDataError) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-center">
        <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-jade/60">
          ◇ NOT FOUND
        </div>
        <h1 className="font-jetbrains text-2xl text-flash/85">
          Item not in catalogue
        </h1>
        <p className="text-sm text-flash/55 max-w-md">
          ID <code className="text-flash/80">{itemId}</code> wasn't found in
          the current patch's item list.
        </p>
        <Link
          to="/champions"
          className="mt-2 inline-flex items-center gap-2 text-jade/80 hover:text-jade font-mono uppercase text-[11px] tracking-[0.2em]"
        >
          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          Back
        </Link>
      </div>
    )
  }

  if (!itemData) return <ItemSkeleton />

  // 📌 Extracted data points (verbatim selectors).
  const name = itemData.name as string
  const description = itemData.description as string // HTML
  const lore = itemData.plaintext as string | undefined
  const costTotal = itemData.gold?.total as number
  const costBase = itemData.gold?.base as number
  const costSell = itemData.gold?.sell as number
  const buildFrom: string[] = itemData.from || []
  const buildInto: string[] = itemData.into || []

  return (
    <div className="relative pb-16">
      <ItemHero
        itemId={itemId!}
        name={name}
        costTotal={costTotal}
        costBase={costBase}
        costSell={costSell}
        buildFrom={buildFrom}
      />

      <Tabs defaultValue="overview" className="mt-8">
        {/* Tab strip — same horizontal style + spring underline as
            championdetailpage.tsx so navigation feels identical. */}
        <TabsList className="bg-transparent p-0 gap-0 flex justify-start border-b border-flash/[0.06] rounded-none">
          <ItemTabTrigger value="overview">Overview</ItemTabTrigger>
          <ItemTabTrigger value="statistics">Statistics</ItemTabTrigger>
        </TabsList>

        <TabsContent
          value="overview"
          className="pt-6 focus-visible:outline-none"
        >
          <OverviewTab
            description={description}
            lore={lore}
            itemId={itemId!}
            buildFrom={buildFrom}
            buildInto={buildInto}
          />
        </TabsContent>

        <TabsContent
          value="statistics"
          className="pt-6 focus-visible:outline-none"
        >
          <StatisticsTab
            rank={rank}
            setRank={setRank}
            role={role}
            setRole={setRole}
            championCsv={championCsv}
            setChampionCsv={setChampionCsv}
            stats={stats}
            loadingStats={loadingStats}
            statsError={statsError}
            bestRows={bestRows}
            loadingBest={loadingBest}
            idToName={idToName}
            champPath={champPath}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Hero band ──────────────────────────────────────────────────────
function ItemHero({
  itemId,
  name,
  costTotal,
  costBase,
  costSell,
  buildFrom,
}: {
  itemId: string
  name: string
  costTotal: number
  costBase: number
  costSell: number
  buildFrom: string[]
}) {
  const iconUrl = `${cdnBaseUrl()}/img/item/${itemId}.png`

  return (
    <div className="relative -mt-6 mb-2 h-[260px] md:h-[300px] overflow-hidden rounded-md">
      {/* Backdrop: blurred + zoomed item splash so the hero feels
          inhabited rather than flat. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${iconUrl})`,
          backgroundSize: "120% auto",
          backgroundPosition: "center",
          filter: "blur(40px) saturate(0.7) brightness(0.55)",
          opacity: 0.55,
        }}
      />

      {/* FlickeringGrid layer — same atmospheric cyber dot field
          as the homepage hero, masked to the centre. */}
      <FlickeringGrid
        className="absolute inset-0 z-[1] opacity-50 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]"
        squareSize={4}
        gridGap={6}
        color="#00d992"
        maxOpacity={0.45}
        flickerChance={0.08}
      />

      {/* Jade tint + scanlines + vignette stack — borrowed wholesale
          from the homepage hero so the visual signature carries. */}
      <div className="absolute inset-0 z-[2] bg-jade/[0.04] mix-blend-color pointer-events-none" />
      <div
        className="absolute inset-0 z-[3] pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
        }}
      />
      <div className="absolute inset-0 z-[4] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.85)_100%)]" />

      {/* Foreground content. */}
      <div className="relative z-10 h-full flex items-center gap-5 md:gap-8 p-5 md:p-8">
        {/* Item icon with jade halo. */}
        <motion.div
          className="relative shrink-0"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: EASE_BRAND }}
        >
          {/* Halo ring — slowly pulses. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-md"
            style={{
              boxShadow:
                "0 0 32px rgba(0,217,146,0.45), 0 0 80px rgba(0,217,146,0.18)",
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
          />
          <img
            src={iconUrl}
            alt={name}
            className="relative w-20 h-20 md:w-28 md:h-28 rounded-md border border-jade/40"
          />
        </motion.div>

        {/* Title block. */}
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <motion.div
            className="text-[10px] font-mono tracking-[0.3em] uppercase text-jade/65"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE_BRAND, delay: 0.08 }}
          >
            ITEM // {itemId}
          </motion.div>

          <motion.h1
            className="font-scifi text-2xl md:text-4xl text-jade leading-tight truncate"
            style={{
              textShadow:
                "0 0 28px rgba(0,217,146,0.45), 0 0 60px rgba(0,217,146,0.18)",
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_BRAND, delay: 0.12 }}
          >
            {name}
          </motion.h1>

          {/* Cost + recipe inline. */}
          <motion.div
            className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.2 }}
          >
            {/* Total cost — citrine accent. */}
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-citrine/85" />
              <span className="font-jetbrains text-base md:text-lg text-citrine font-bold tabular-nums">
                {fmt(costTotal)}
              </span>
              <span className="text-[11px] font-mono tracking-wider uppercase text-flash/40">
                gold
              </span>
            </div>

            {/* Base + sell secondary line. */}
            <div className="text-[11px] font-mono text-flash/45 tracking-wider uppercase">
              base {fmt(costBase)} • sell {fmt(costSell)}
            </div>

            {/* Recipe summary chip — small icons of build-from items
                that link back to their own pages. */}
            {buildFrom.length > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/40">
                  Recipe
                </span>
                {buildFrom.map((id) => (
                  <Link
                    key={id}
                    to={`/items/${id}`}
                    className="group cursor-clicker"
                    title={id}
                  >
                    <img
                      src={`${cdnBaseUrl()}/img/item/${id}.png`}
                      alt={`Component ${id}`}
                      className="w-7 h-7 rounded-sm border border-flash/20 group-hover:border-jade/55 group-hover:scale-105 transition-all duration-200"
                    />
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Bottom edge fade so the hero blends into the tab strip. */}
      <div className="absolute inset-x-0 bottom-0 h-8 z-[5] pointer-events-none bg-gradient-to-t from-liquirice to-transparent" />
    </div>
  )
}

// ─── Tab trigger with spring underline (mirrors champion detail) ────
function ItemTabTrigger({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "relative px-4 sm:px-6 py-3 rounded-none whitespace-nowrap",
        "font-mono text-[11px] tracking-[0.18em] uppercase",
        "text-flash/45 data-[state=active]:text-jade",
        "transition-colors duration-200",
        "data-[state=active]:bg-transparent",
        "after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[2px]",
        "after:bg-jade after:shadow-[0_0_8px_rgba(0,217,146,0.45)]",
        "after:scale-x-0 after:origin-center after:transition-transform after:duration-300 after:ease-out",
        "data-[state=active]:after:scale-x-100"
      )}
    >
      {children}
    </TabsTrigger>
  )
}

// ─── Overview tab ───────────────────────────────────────────────────
function OverviewTab({
  description,
  lore,
  itemId,
  buildFrom,
  buildInto,
}: {
  description: string
  lore: string | undefined
  itemId: string
  buildFrom: string[]
  buildInto: string[]
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* TOP: Build path — full width so the recipe tree has room
          to breathe even when an item upgrades into a dozen others
          (Amplifying Tome, Long Sword, etc.). */}
      <motion.div
        className={cn(glassDark, "p-5 md:p-7")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_BRAND }}
      >
        <SectionHeader>Build Path</SectionHeader>
        <BuildPath
          itemId={itemId}
          buildFrom={buildFrom}
          buildInto={buildInto}
        />
      </motion.div>

      {/* BOTTOM: Description + lore. */}
      <motion.div
        className={cn(glassDark, "p-5 md:p-7")}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.08 }}
      >
        <SectionHeader icon={Sparkles}>Description</SectionHeader>
        <div
          className="text-[13px] md:text-[14px] text-flash/80 leading-[1.85] font-geist [&_br]:block [&_br]:my-1 [&_b]:text-flash [&_b]:font-semibold [&_i]:text-jade/85 [&_attentionIcon]:hidden"
          dangerouslySetInnerHTML={{ __html: description }}
        />

        {lore ? (
          <div className="mt-7">
            <SectionHeader>Use</SectionHeader>
            <p className="text-[13px] text-flash/55 leading-[1.85] font-geist italic">
              {lore}
            </p>
          </div>
        ) : null}
      </motion.div>
    </div>
  )
}

// ─── Build path tree (LoL in-game recipe widget style) ─────────────
// Renders an authentic family-tree layout: component items at the
// top connected by short verticals → horizontal bar → single drop →
// current item → optional inverted tree to "builds into" upgrades.
//
//   [ Component 1 ]   [ Component 2 ]
//          │                  │
//          ├──────────────────┤    ← horizontal connector
//                  │              ← single drop
//             [ CURRENT ]
//                  │
//          ├──────────────────┤    ← inverted connector
//          │                  │
//   [ Upgrade 1 ]      [ Upgrade 2 ]
//
// All lines are pure CSS — no SVG — using a CSS grid for the item
// rows and absolute-positioned border divs for the T-junctions.
// The horizontal bar's `left`/`right` insets are computed from the
// row's column count so the bar always spans exactly from the
// centre of the first column to the centre of the last.
function BuildPath({
  itemId,
  buildFrom,
  buildInto,
}: {
  itemId: string
  buildFrom: string[]
  buildInto: string[]
}) {
  const hasFrom = buildFrom.length > 0
  const hasInto = buildInto.length > 0

  if (!hasFrom && !hasInto) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <CurrentItemTile itemId={itemId} />
        <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-flash/35 text-center">
          Basic item — no recipe, no upgrades
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Recipe (components → current). */}
      {hasFrom ? (
        <>
          <ItemsRow items={buildFrom} kind="component" />
          <TreeJunction count={buildFrom.length} />
        </>
      ) : null}

      <CurrentItemTile itemId={itemId} />

      {/* Upgrade tree (current → into). */}
      {hasInto ? (
        <>
          <TreeJunction count={buildInto.length} swapped />
          <ItemsRow items={buildInto} kind="upgrade" />
        </>
      ) : null}
    </div>
  )
}

// A grid row of N item icons spread evenly so a parallel set of
// connector lines beneath them lines up exactly column-by-column.
//
// Two subtleties:
//   1. Items can REPEAT in DDragon's `from` array (e.g., Fiendish
//      Codex builds from 2× Amplifying Tome). Using `id` alone as
//      the React key collapses duplicate IDs into one rendered
//      slot — items end up stacked. We compose `${id}-${i}` so
//      every cell gets a unique key.
//   2. Some basic items (Amplifying Tome, Long Sword) upgrade into
//      10+ items. We scale the icon size, gap, and row max-width
//      based on the count so a 14-item row doesn't squash icons
//      into illegible slivers.
function ItemsRow({
  items,
  kind,
}: {
  items: string[]
  kind: "component" | "upgrade"
}) {
  const n = items.length
  const sizing = rowSizing(n)

  return (
    <div
      className={cn("grid w-full mx-auto", sizing.maxW)}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      {items.map((id, i) => (
        <motion.div
          key={`${id}-${i}`}
          className="flex justify-center"
          initial={{
            opacity: 0,
            y: kind === "component" ? -6 : 6,
          }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: EASE_BRAND,
            // Cap the per-item delay so a 14-upgrade row doesn't
            // take 700ms to finish revealing.
            delay: 0.1 + Math.min(i, 8) * 0.04,
          }}
        >
          <Link
            to={`/items/${id}`}
            className="cursor-clicker group"
            title={id}
          >
            <img
              src={`${cdnBaseUrl()}/img/item/${id}.png`}
              alt={`Item ${id}`}
              className={cn(
                sizing.icon,
                "rounded-sm border border-flash/20 group-hover:border-jade/55 group-hover:scale-110 group-hover:shadow-[0_0_18px_rgba(0,217,146,0.35)] transition-all duration-200"
              )}
            />
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

// Maps a count of items in a row to icon size + row max-width.
// The thresholds are tuned so adjacent items never touch and the
// row never crams more than fits the page comfortably.
function rowSizing(n: number): { icon: string; maxW: string } {
  if (n <= 4) return { icon: "w-12 h-12", maxW: "max-w-[320px]" }
  if (n <= 6) return { icon: "w-11 h-11", maxW: "max-w-[460px]" }
  if (n <= 9) return { icon: "w-10 h-10", maxW: "max-w-[620px]" }
  if (n <= 12) return { icon: "w-9 h-9", maxW: "max-w-[760px]" }
  return { icon: "w-8 h-8", maxW: "max-w-full" }
}

// The T-junction (horizontal bar + N short sticks one side, single
// drop the other). `swapped` flips the geometry so the items end up
// BELOW the current item (used for the upgrade tree).
//
// Crucially, this row uses the SAME max-width as the ItemsRow above
// (via the same `rowSizing` helper) so the columns line up exactly
// — each short stick sits directly under its item's centre.
function TreeJunction({
  count,
  swapped = false,
}: {
  count: number
  swapped?: boolean
}) {
  // Zero items → no junction at all.
  if (count <= 0) return null
  // Single item → just a vertical line, no T-junction needed.
  if (count === 1) {
    return (
      <div className="relative w-full h-7 flex justify-center my-0.5">
        <div className="w-px h-full bg-jade/50" />
      </div>
    )
  }

  // The horizontal bar's insets put it from the centre of the first
  // column to the centre of the last column. Each column is
  // `100 / count` % wide; the centre of column 1 is `50/count` % in
  // from the left, and the centre of column N is `50/count` % in
  // from the right.
  const insetPct = 50 / count
  const sizing = rowSizing(count)

  return (
    <div className={cn("relative w-full h-7 mx-auto my-0.5", sizing.maxW)}>
      {/* Sticks on the items side (top by default, bottom when
          swapped) — one per column, vertically centred within the
          column. */}
      <div
        className={cn(
          "absolute inset-x-0 grid h-1/2",
          swapped ? "bottom-0" : "top-0"
        )}
        style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex justify-center">
            <div className="w-px h-full bg-jade/50" />
          </div>
        ))}
      </div>

      {/* Horizontal connector bar. */}
      <div
        className="absolute h-px bg-jade/50 top-1/2"
        style={{ left: `${insetPct}%`, right: `${insetPct}%` }}
      />

      {/* Single drop on the current-item side. */}
      <div
        className={cn(
          "absolute h-1/2 left-1/2 -translate-x-1/2 w-px bg-jade/50",
          swapped ? "top-0" : "bottom-0"
        )}
      />
    </div>
  )
}

// The centre tile — emphasised with a jade halo + slightly larger so
// the eye locks onto it as "the item the tree is about".
function CurrentItemTile({ itemId }: { itemId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE_BRAND, delay: 0.05 }}
      className="relative"
    >
      <span
        aria-hidden
        className="absolute -inset-1 rounded-md"
        style={{
          background:
            "radial-gradient(circle, rgba(0,217,146,0.5) 0%, transparent 75%)",
        }}
      />
      <img
        src={`${cdnBaseUrl()}/img/item/${itemId}.png`}
        alt="Current item"
        className="relative w-16 h-16 rounded-sm border border-jade/60 shadow-[0_0_28px_rgba(0,217,146,0.4)]"
      />
    </motion.div>
  )
}

// ─── Statistics tab ─────────────────────────────────────────────────
function StatisticsTab(props: {
  rank: string
  setRank: (v: string) => void
  role: string
  setRole: (v: string) => void
  championCsv: string
  setChampionCsv: (v: string) => void
  stats: ItemStats
  loadingStats: boolean
  statsError: string | null
  bestRows: BestUtilizer[]
  loadingBest: boolean
  idToName: Record<number, string>
  champPath: string
}) {
  const {
    rank,
    setRank,
    role,
    setRole,
    championCsv,
    setChampionCsv,
    stats,
    loadingStats,
    statsError,
    bestRows,
    loadingBest,
    idToName,
    champPath,
  } = props

  const buildRateWidth = useMemo(
    () => `${Math.min(Math.max(stats?.build_rate_pct ?? 0, 0), 100)}%`,
    [stats?.build_rate_pct]
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Filters row. */}
      <motion.div
        className={cn(glassDark, "p-4 md:p-5")}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_BRAND }}
      >
        <SectionHeader>Filters</SectionHeader>
        <div className="flex flex-wrap items-end gap-3">
          <CyberSelect
            label="Rank"
            value={rank}
            onChange={setRank}
            options={[
              { value: "", label: "All" },
              { value: "CHALLENGER", label: "Challenger" },
              { value: "GRANDMASTER", label: "Grandmaster" },
              { value: "MASTER", label: "Master" },
              { value: "DIAMOND", label: "Diamond" },
              { value: "EMERALD", label: "Emerald" },
              { value: "PLATINUM", label: "Platinum" },
              { value: "GOLD", label: "Gold" },
              { value: "SILVER", label: "Silver" },
              { value: "BRONZE", label: "Bronze" },
              { value: "IRON", label: "Iron" },
            ]}
          />

          <CyberSelect
            label="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: "", label: "All" },
              { value: "TOP", label: "Top" },
              { value: "JUNGLE", label: "Jungle" },
              { value: "MIDDLE", label: "Mid" },
              { value: "BOTTOM", label: "ADC" },
              { value: "SUPPORT", label: "Support" },
            ]}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/50">
              Champion IDs
            </label>
            <input
              value={championCsv}
              onChange={(e) => setChampionCsv(e.target.value)}
              placeholder="e.g. 64, 76"
              className="bg-filmdark/40 border border-flash/15 hover:border-flash/30 focus:border-jade/55 focus:outline-none rounded-sm px-3 py-1.5 w-[200px] text-[13px] font-jetbrains text-flash placeholder:text-flash/30 transition-colors"
            />
          </div>
        </div>
      </motion.div>

      {/* Stats grid + best utilizers. */}
      {loadingStats ? (
        <StatsSkeleton />
      ) : statsError ? (
        <motion.div
          className={cn(glassDark, "p-6 text-center")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-error/75 mb-2">
            ⚠ ERROR
          </div>
          <p className="text-sm text-flash/65">{statsError}</p>
        </motion.div>
      ) : !stats ? (
        <motion.div
          className={cn(glassDark, "p-6 text-center")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-[12px] font-mono tracking-wider uppercase text-flash/35">
            No data available for these filters.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key={`${rank}-${role}-${props.championCsv}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_BRAND }}
        >
          {/* Stat tiles 2×2. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatTile
              label="Games"
              value={fmt(stats.games)}
              hint="Games where the item was completed"
              delay={0}
            />
            <StatTile
              label="Wins"
              value={fmt(stats.wins)}
              hint="Won games with the item"
              delay={0.06}
            />
            <StatTile
              label="Winrate"
              value={`${stats.winrate_pct ?? 0}%`}
              hint={`Out of ${fmt(stats.total_games)} total matches under the current filter`}
              accent="jade"
              delay={0.12}
            />
            <StatTile
              label="Build Rate"
              value={`${stats.build_rate_pct ?? 0}%`}
              hint={`${stats.build_rate_pct ?? 0}% of players built this item`}
              delay={0.18}
              extra={
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-filmdark/35 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-jade to-jade/45"
                      initial={{ width: 0 }}
                      animate={{ width: buildRateWidth }}
                      transition={{
                        duration: 0.7,
                        ease: EASE_BRAND,
                        delay: 0.35,
                      }}
                    />
                  </div>
                </div>
              }
            />
          </div>

          {/* Best utilizers panel. */}
          <motion.div
            className={cn(glassDark, "mt-6 p-5 md:p-6")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_BRAND, delay: 0.25 }}
          >
            <SectionHeader icon={Users}>Best Utilizers</SectionHeader>
            {loadingBest ? (
              <UtilizersSkeleton />
            ) : bestRows.length === 0 ? (
              <p className="text-[12px] font-mono tracking-wider uppercase text-flash/35">
                No champion data yet.
              </p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {bestRows.map((r, i) => {
                  const resolved = Boolean(idToName[r.champion_id])
                  return (
                    <UtilizerRow
                      key={r.champion_id}
                      rank={i + 1}
                      name={
                        idToName[r.champion_id] || String(r.champion_id)
                      }
                      games={r.games}
                      wins={r.wins}
                      winrate={r.winrate_pct}
                      champPath={champPath}
                      resolved={resolved}
                    />
                  )
                })}
              </ul>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Stat tile (jade accent for the headline stat) ──────────────────
function StatTile({
  label,
  value,
  hint,
  accent,
  extra,
  delay = 0,
}: {
  label: string
  value: string
  hint?: string
  accent?: "jade"
  extra?: React.ReactNode
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })

  return (
    <motion.div
      ref={ref}
      className={cn(glassDark, "p-4 md:p-5")}
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.5, ease: EASE_BRAND, delay }}
    >
      <BorderBeam duration={9} size={120} />
      <div className="text-[10px] font-mono tracking-[0.22em] uppercase text-flash/45">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-jetbrains font-bold tabular-nums text-3xl md:text-[34px] leading-tight",
          accent === "jade" ? "text-jade" : "text-flash/95"
        )}
        style={
          accent === "jade"
            ? {
                textShadow:
                  "0 0 18px rgba(0,217,146,0.45), 0 0 36px rgba(0,217,146,0.18)",
              }
            : undefined
        }
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-2 text-[11px] font-mono text-flash/40 leading-relaxed">
          {hint}
        </div>
      ) : null}
      {extra}
    </motion.div>
  )
}

// ─── A single best-utilizer row (avatar + name + winrate) ───────────
// `name` may be the champion id stringified when the id→name map
// hasn't resolved yet; the `onError` handler swaps the broken
// avatar for the project's `/img/unknown.png` placeholder rather
// than leaving a 404'd image rect. Once the map loads, this row
// re-renders with the real name and the broken-image state goes
// away on the next paint.
function UtilizerRow({
  rank,
  name,
  games,
  wins,
  winrate,
  champPath,
  resolved,
}: {
  rank: number
  name: string
  games: number
  wins: number
  winrate: number
  champPath: string
  /** True when the id has been resolved to a real champion name. */
  resolved: boolean
}) {
  return (
    <li className="group flex items-center gap-3 p-2.5 rounded-sm bg-filmdark/25 border border-flash/[0.06] hover:border-jade/30 hover:bg-jade/[0.04] transition-colors duration-200">
      <span className="w-5 text-center text-[10px] font-mono tracking-wider text-flash/35">
        {rank.toString().padStart(2, "0")}
      </span>
      <img
        src={resolved ? `${champPath}/${name}.png` : "/img/unknown.png"}
        alt={name}
        onError={(e) => {
          // Defensive fallback if the CDN path 404s for any reason
          // (e.g. champion name with apostrophe-encoding drift).
          const img = e.currentTarget
          if (!img.src.endsWith("/img/unknown.png")) {
            img.src = "/img/unknown.png"
          }
        }}
        className="w-10 h-10 rounded-md border border-flash/15 group-hover:border-jade/55 transition-colors duration-200"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-flash/90 font-jetbrains truncate">
          {resolved ? name : "—"}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-flash/40">
          {fmt(games)} games
        </div>
      </div>
      <div className="text-right">
        <div className="text-[15px] font-jetbrains font-bold tabular-nums text-jade">
          {winrate}%
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-flash/40">
          {fmt(wins)} wins
        </div>
      </div>
    </li>
  )
}

// ─── Reusable cyber select ──────────────────────────────────────────
function CyberSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono tracking-[0.2em] uppercase text-flash/50">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            appearance-none cursor-clicker
            bg-filmdark/40 border border-flash/15 hover:border-flash/30
            focus:border-jade/55 focus:outline-none
            rounded-sm pl-3 pr-8 py-1.5
            text-[13px] font-jetbrains text-flash
            transition-colors
          "
        >
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              className="bg-liquirice text-flash"
            >
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-flash/45" />
      </div>
    </div>
  )
}

// ─── Skeletons ──────────────────────────────────────────────────────
function ItemSkeleton() {
  return (
    <div className="relative pb-16">
      <div className="relative -mt-6 mb-6 h-[260px] md:h-[300px] overflow-hidden rounded-md bg-filmdark/30 animate-pulse">
        <div className="h-full flex items-center gap-6 p-6">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-md bg-flash/[0.06]" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-24 bg-flash/[0.05] rounded" />
            <div className="h-8 w-1/2 bg-flash/[0.08] rounded" />
            <div className="h-3 w-1/3 bg-flash/[0.05] rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(glassDark, "p-5 h-32 animate-pulse")}
          />
        ))}
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(glassDark, "p-5 h-32 animate-pulse")}
        />
      ))}
    </div>
  )
}

function UtilizersSkeleton() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li
          key={i}
          className="flex items-center gap-3 p-2.5 rounded-sm bg-filmdark/25 border border-flash/[0.06] animate-pulse"
        >
          <div className="w-5 h-3 bg-flash/[0.05] rounded" />
          <div className="w-10 h-10 rounded-md bg-flash/[0.06]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 bg-flash/[0.06] rounded" />
            <div className="h-2 w-16 bg-flash/[0.04] rounded" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-10 bg-flash/[0.06] rounded ml-auto" />
            <div className="h-2 w-12 bg-flash/[0.04] rounded ml-auto" />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Number helper ──────────────────────────────────────────────────
const fmt = (n: number | undefined) =>
  typeof n === "number" ? n.toLocaleString() : "—"
