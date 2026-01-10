import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Sparkles } from "lucide-react"
import { Separator } from "./ui/separator"
import { CDN_BASE_URL } from "@/config"

type NewItem = {
  id: string
  name: string
  icon: string
  description: string
  stats: string[] // ✅ array
  passiveTitle?: string // ✅ titolo preso da <passive>
}

const LOCALE = "en_US"
const SEASON_2026_NEW_ITEM_IDS = [2510, 2512, 2517, 2520, 2522, 2523, 2524, 2525, 2526, 2530]

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()

function extractStatsFromDescription(descriptionHtml: string): string[] {
  const m = descriptionHtml.match(/<stats>([\s\S]*?)<\/stats>/i)
  if (!m?.[1]) return []

  return m[1]
    .split(/<br\s*\/?>/i)
    .map((s) => stripHtml(s))
    .filter(Boolean)
}

function removeStatsBlock(html: string) {
  return html.replace(/<stats>[\s\S]*?<\/stats>/gi, "")
}

/**
 * Regola richiesta:
 * - subscription title = testo dentro <passive>...</passive>
 * - description = testo dopo </passive> (ripulito da HTML)
 * - se non c'è <passive>, fallback sulla plaintext / stripHtml della description
 */
function extractPassiveTitleAndDescription(descriptionHtml: string): { title: string; description: string } {
  if (!descriptionHtml) return { title: "", description: "" }

  const noStats = removeStatsBlock(descriptionHtml)

  // prende il primo <passive>...</passive> e tutto ciò che segue
  const m = noStats.match(/<passive>([\s\S]*?)<\/passive>([\s\S]*)/i)
  if (!m) return { title: "", description: stripHtml(noStats) }

  const title = stripHtml(m[1])
  const after = m[2] ?? ""
  const description = stripHtml(after)

  return { title, description }
}

export function NewItemsBanner() {
  const [items, setItems] = useState<NewItem[]>([])
  const [loading, setLoading] = useState(true)

  // ✅ state: triggera re-render quando un'icona fallisce
  const [failedIcons, setFailedIcons] = useState<Record<string, true>>({})
  const failedOnceRef = useRef(new Set<string>())

  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, amount: 0.2 })

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        setLoading(true)

        const res = await fetch(`https://cdn2.loldata.cc/16.1.1/data/${LOCALE}/item.json`, {
          cache: "force-cache",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        const itemsMap = json?.data ?? {}

        const mapped: NewItem[] = SEASON_2026_NEW_ITEM_IDS
          .map((id) => {
            const it = itemsMap[String(id)]
            if (!it) return null

            const parsed = extractPassiveTitleAndDescription(it.description || "")

            return {
              id: String(id),
              name: it.name ?? `Item ${id}`,
              icon: `${CDN_BASE_URL}/img/item/${id}.png`,
              passiveTitle: parsed.title || undefined,
              // se parsed.description è vuota, fallback su plaintext o stripHtml
              description: parsed.description || it.plaintext || stripHtml(it.description || ""),
              stats: extractStatsFromDescription(it.description || ""), // ✅ array
            }
          })
          .filter(Boolean) as NewItem[]

        if (active) setItems(mapped)
      } catch (e) {
        console.warn("[NewItemsBanner] load failed:", e)
        if (active) setItems([])
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const failed = useMemo(() => failedIcons, [failedIcons])

  return (
    <section ref={containerRef} className="w-full py-16 relative">
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-jade/20 w-8 h-8 flex items-center justify-center rounded-[3px]">
            <Sparkles className="text-jade size-5" />
          </div>
          <h2 className="text-3xl md:text-4xl font-scifi text-jade uppercase tracking-wide">New Items</h2>
        </div>
        <Separator className="flex-1 bg-jade/20" />
      </div>

      {loading ? (
        <div className="text-flash/60">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-flash/60">Nessun item trovato.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 items-stretch">
          {items.map((item, index) => {
            const hideIcon = !!failed[item.id]

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
                animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
                transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
                className="group relative h-full"
              >
                <div className="relative bg-cement border border-flash/10 rounded-sm overflow-hidden hover:border-jade/40 transition-all duration-300 cursor-clicker h-full flex flex-col">
                  <div className="relative z-10 p-4 flex flex-col items-center text-center gap-3 h-full">
                    {/* Icon */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-[3px] border border-jade/30 bg-liquirice flex items-center justify-center overflow-hidden shrink-0">
                      {!hideIcon && (
                        <img
                          src={item.icon}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={() => {
                            if (failedOnceRef.current.has(item.id)) return
                            failedOnceRef.current.add(item.id)
                            setFailedIcons((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: true }))
                          }}
                        />
                      )}
                    </div>

                    {/* Name */}
                    <h3 className="font-jetbrains text-flash text-sm md:text-base group-hover:text-jade transition-colors duration-300">
                      {item.name}
                    </h3>

                    {/* Stats */}
                    {item.stats.length > 0 ? (
                      <ul className="w-full text-center whitespace-normal break-words">
                        {item.stats.map((s, i) => (
                          <li
                            key={`${item.id}-stat-${i}`}
                            className="block font-geist text-[11px] text-pine uppercase tracking-wide leading-tight"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="block font-geist text-[11px] text-pine/60 uppercase tracking-wide">—</span>
                    )}

                    {/* Subscription title + Description (spinti in basso) */}
                    <div className="mt-auto w-full">
                      {item.passiveTitle ? (
                        <div className="font-jetbrains text-[11px] uppercase tracking-wide text-flash/70 group-hover:text-flash/90 transition-colors duration-300">
                          {item.passiveTitle}
                        </div>
                      ) : null}

                      <p className="font-geist text-xs text-flash/60 line-clamp-2 group-hover:text-flash/80 transition-colors duration-300">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* NEW badge */}
                  <div className="absolute top-2 right-2 bg-jade/90 text-liquirice px-2 py-0.5 rounded-sm font-jetbrains text-[10px] uppercase font-bold shadow-[0_0_10px_rgba(0,217,146,0.4)]">
                    NEW
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <Separator className="mt-12 bg-flash/10" />
    </section>
  )
}
