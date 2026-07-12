import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOX_API_BASE_URL, cdnBaseUrl } from "@/config"

type Change = {
  patch: string
  kind: "champion" | "item" | "rune"
  entity_key: string
  entity_name: string
  field: string
  label: string
  old_value: string
  new_value: string
  direction: "buff" | "nerf" | "adjust"
}
type PatchData = { patch: string | null; patches: string[]; changes: Change[]; prose: Record<string, string> }

const dirText = (d: string) => (d === "buff" ? "text-[#00d992]" : d === "nerf" ? "text-[#d63336]" : "text-flash/55")
const dirBorder = (d: string) =>
  d === "buff"
    ? "border-[#00d992]/25 bg-[#00d992]/[0.05]"
    : d === "nerf"
      ? "border-[#d63336]/25 bg-[#d63336]/[0.05]"
      : "border-flash/12 bg-flash/[0.03]"

function verdict(changes: Change[]) {
  const b = changes.filter((c) => c.direction === "buff").length
  const n = changes.filter((c) => c.direction === "nerf").length
  if (b > n) return { label: "BUFFED", d: "buff" }
  if (n > b) return { label: "NERFED", d: "nerf" }
  return { label: "ADJUSTED", d: "adjust" }
}

function EntityCard({ kind, entityKey, name, changes, prose }: {
  kind: "champion" | "item"
  entityKey: string
  name: string
  changes: Change[]
  prose?: string
}) {
  const v = verdict(changes)
  const icon =
    kind === "champion"
      ? `${cdnBaseUrl()}/img/champion/${entityKey}.png`
      : `${cdnBaseUrl()}/img/item/${entityKey}.png`
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className={cn("rounded-xl border p-4 backdrop-blur-xl", dirBorder(v.d))}
    >
      <div className="flex items-center gap-3">
        <img
          src={icon}
          alt={name}
          className="h-11 w-11 shrink-0 rounded-lg bg-filmdark/30 object-cover ring-1 ring-flash/10"
          onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-chakrapetch text-[15px] font-bold text-flash/95">{name}</div>
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.18em]", dirText(v.d))}>{v.label}</span>
        </div>
      </div>
      {prose && <p className="mt-3 font-geist text-[12.5px] italic leading-relaxed text-flash/60">{prose}</p>}
      <div className="mt-3 space-y-1.5">
        {changes.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-[12.5px]">
            <span className="flex-1 truncate text-flash/55">{c.label}</span>
            <span className="tabular-nums text-flash/40">{c.old_value}</span>
            <ArrowRight size={11} className={dirText(c.direction)} />
            <span className={cn("font-semibold tabular-nums", dirText(c.direction))}>{c.new_value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 mt-12 flex items-center gap-3">
      <h2 className="font-chakrapetch text-xl font-bold uppercase tracking-wide text-flash/90">{title}</h2>
      <span className="rounded-full border border-flash/15 px-2 py-0.5 font-jetbrains text-[11px] text-flash/45">{count}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-flash/10 to-transparent" />
    </div>
  )
}

export default function PatchNotesPage() {
  const [data, setData] = useState<PatchData | null>(null)
  const [patch, setPatch] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = patch ? `${BOX_API_BASE_URL}/api/patch-notes?patch=${patch}` : `${BOX_API_BASE_URL}/api/patch-notes`
    fetch(url)
      .then((r) => r.json())
      .then((d: PatchData) => {
        setData(d)
        if (!patch && d.patch) setPatch(d.patch)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [patch])

  const grouped = useMemo(() => {
    const champs = new Map<string, Change[]>()
    const items = new Map<string, Change[]>()
    for (const c of data?.changes ?? []) {
      const m = c.kind === "champion" ? champs : items
      if (!m.has(c.entity_key)) m.set(c.entity_key, [])
      m.get(c.entity_key)!.push(c)
    }
    return { champs: [...champs.entries()], items: [...items.entries()] }
  }, [data])

  const nameOf = (key: string) => (data?.changes ?? []).find((c) => c.entity_key === key)?.entity_name ?? key

  return (
    <div className="min-h-screen bg-[#040A0C] px-4 pb-24 pt-28 text-flash sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-2 font-jetbrains text-[11px] uppercase tracking-[0.3em] text-jade/70">Game Updates</div>
        <h1 className="font-chakrapetch text-4xl font-bold tracking-tight sm:text-5xl">Patch Notes</h1>
        <p className="mt-2 max-w-xl font-geist text-flash/55">
          Champion and item changes, computed straight from the official game data every patch.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {(data?.patches ?? []).map((p) => (
            <button
              key={p}
              onClick={() => setPatch(p)}
              className={cn(
                "rounded-full border px-4 py-1.5 font-chakrapetch text-[13px] tracking-wide transition cursor-clicker",
                p === patch
                  ? "border-jade/50 bg-jade/[0.10] text-jade"
                  : "border-flash/15 bg-flash/[0.03] text-flash/60 hover:text-flash/90"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {loading && <div className="mt-20 text-center font-jetbrains text-flash/40">Loading patch {patch ?? ""}…</div>}

        {!loading && (
          <>
            {grouped.champs.length > 0 && (
              <>
                <SectionHeader title="Champions" count={grouped.champs.length} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.champs.map(([key, ch]) => (
                    <EntityCard key={key} kind="champion" entityKey={key} name={nameOf(key)} changes={ch} prose={data?.prose?.[key]} />
                  ))}
                </div>
              </>
            )}
            {grouped.items.length > 0 && (
              <>
                <SectionHeader title="Items" count={grouped.items.length} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped.items.map(([key, ch]) => (
                    <EntityCard key={key} kind="item" entityKey={key} name={nameOf(key)} changes={ch} />
                  ))}
                </div>
              </>
            )}
            {grouped.champs.length === 0 && grouped.items.length === 0 && (
              <div className="mt-20 text-center text-flash/40">No changes recorded for this patch.</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
