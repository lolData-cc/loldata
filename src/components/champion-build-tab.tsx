import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BOX_API_BASE_URL, cdnBaseUrl, summonerSpellUrl, PERK_CDN } from "@/config"
import { getKeystoneIcon, getStyleIcon, getKeystoneName } from "@/constants/runes"
import { useRuneTrees } from "@/constants/runeData"
import type { RuneInfo, RuneTree } from "@/constants/rune-tree-data"
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons"
import { ChampionDialog } from "@/components/champion-dialog"
import type { Champion } from "@/hooks/useChampions"
import { Swords, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const FILTER_REGIONS: { key: string; label: string }[] = [
  { key: "euw1", label: "EUW" }, { key: "na1", label: "NA" }, { key: "kr", label: "KR" },
  { key: "jp1", label: "JP" }, { key: "br1", label: "BR" }, { key: "oc1", label: "OCE" }, { key: "tr1", label: "TR" }, { key: "ru", label: "RU" },
]

// compact cyber dropdown for the patch / region filters
function FilterDropdown({ value, options, onChange, allLabel }: { value: string | null; options: { value: string; label: string }[]; onChange: (v: string | null) => void; allLabel: string }) {
  const [open, setOpen] = useState(false)
  const cur = value ? options.find((o) => o.value === value)?.label ?? value : allLabel
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className={cn("flex items-center gap-1 pl-2.5 pr-2 py-1.5 rounded-sm text-[11px] font-chakrapetch font-bold uppercase tracking-[0.12em] border cursor-pointer transition-colors",
          value ? "text-jade border-jade/40 bg-jade/10" : "text-flash/55 border-flash/10 hover:text-flash/80 hover:border-flash/20")}>
        {cur}<ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-30 min-w-[130px] max-h-[280px] overflow-y-auto rounded-md border border-flash/15 bg-[#0a1416] shadow-xl py-1 cyber-scrollbar">
            <button type="button" onClick={() => { onChange(null); setOpen(false) }} className={cn("w-full text-left px-3 py-1.5 text-[11px] font-chakrapetch hover:bg-jade/10", !value ? "text-jade" : "text-flash/55")}>{allLabel}</button>
            {options.map((o) => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} className={cn("w-full text-left px-3 py-1.5 text-[11px] font-chakrapetch hover:bg-jade/10", value === o.value ? "text-jade" : "text-flash/55")}>{o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const ROLE_ICON: Record<string, React.FC<{ className?: string }>> = {
  TOP: RoleTopIcon, JUNGLE: RoleJungleIcon, MIDDLE: RoleMidIcon, BOTTOM: RoleAdcIcon, UTILITY: RoleSupportIcon,
}

type Item = { item_id: number; winrate: number; pickrate?: number; pick_rate?: number; games?: number; total_games?: number }
type Rune = { keystone: number; primary: number; sub: number; winrate: number; pickrate: number | null; games: number }
type Spell = { spell1: number; spell2: number; winrate: number; pickrate: number | null; games: number }
type Player = { name: string; tag: string; games: number; winrate: number }
type RuneOption = { perk: number; games: number; winrate: number }
type RuneSlot = { slot: string; options: RuneOption[] }
type RunePage = { keystone: number; primaryStyle: number; subStyle: number; primary: number[]; secondary: number[]; shards: number[]; games: number; winrate: number }
type PreciseRunes = { sample: number; pages: RunePage[]; slots: RuneSlot[] }
type BuildPathSlot = { slot: number; items: { item: number; games: number; winrate: number }[] }
type BuildResp = {
  role: string | null
  core: { winrate: number; pickrate: number; banrate: number | null; games: number } | null
  runes: Rune[]
  preciseRunes?: PreciseRunes | null
  buildPath?: BuildPathSlot[]
  bootsSlot?: number | null
  spells: Spell[]
  items: { boots: Item[]; core: Item[]; situational: Item[] }
  topPlayers: Player[]
  availableRoles?: { role: string; games: number }[]
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n))
function wrClass(wr: number) {
  if (wr >= 53) return "text-jade"
  if (wr >= 50.5) return "text-[#7bd9b0]"
  if (wr >= 49) return "text-flash/70"
  return "text-[#ff6286]"
}
const ROLE_LABEL: Record<string, string> = { TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid", BOTTOM: "Bot", UTILITY: "Support" }
const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"]
const ORD_WORD = ["", "FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH", "SIXTH"]

// Stat shards (not in runesReforged) — standard 3 rows, served from StatMods.
const SHARD_ROWS: { id: number; icon: string; name: string }[][] = [
  [
    { id: 5008, icon: "StatModsAdaptiveForceIcon.png", name: "Adaptive Force" },
    { id: 5005, icon: "StatModsAttackSpeedIcon.png", name: "Attack Speed" },
    { id: 5007, icon: "StatModsCDRScalingIcon.png", name: "Ability Haste" },
  ],
  [
    { id: 5008, icon: "StatModsAdaptiveForceIcon.png", name: "Adaptive Force" },
    { id: 5010, icon: "StatModsMovementSpeedIcon.png", name: "Move Speed" },
    { id: 5001, icon: "StatModsHealthScalingIcon.png", name: "Health Scaling" },
  ],
  [
    { id: 5011, icon: "StatModsHealthPlusIcon.png", name: "Health" },
    { id: 5013, icon: "StatModsTenacityIcon.png", name: "Tenacity" },
    { id: 5001, icon: "StatModsHealthScalingIcon.png", name: "Health Scaling" },
  ],
]

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-[11px] font-chakrapetch font-bold uppercase tracking-[0.22em] text-jade/70 whitespace-nowrap">{children}</h3>
      {hint && <span className="text-[9px] font-jetbrains text-flash/30 whitespace-nowrap truncate">{hint}</span>}
      <span className="h-px flex-1 bg-gradient-to-r from-jade/15 to-transparent" />
    </div>
  )
}

function ItemIcon({ id, size = 44, names }: { id: number; size?: number; names: Record<number, string> }) {
  return (
    <img
      src={`${cdnBaseUrl()}/img/item/${id}.png`}
      alt={names[id] ?? String(id)}
      title={names[id] ?? String(id)}
      width={size}
      height={size}
      loading="lazy"
      className="rounded-md ring-1 ring-flash/10 bg-black/30"
      onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
    />
  )
}

// ── one rune node in the tree — lit when selected, dimmed otherwise. ──
function RuneNode({ rune, active, size, wr }: { rune: RuneInfo; active: boolean; size: number; wr?: { games: number; winrate: number } }) {
  const title = wr ? `${rune.name} · ${wr.winrate.toFixed(1)}% over ${fmt(wr.games)} games` : rune.name
  return (
    <div
      className={cn("relative grid place-items-center rounded-full transition-all", active ? "ring-2 ring-jade/70 bg-jade/10" : "")}
      style={{ width: size + 6, height: size + 6 }}
      title={title}
    >
      <img
        src={`${PERK_CDN}/${rune.icon}`}
        alt={rune.name}
        width={size}
        height={size}
        loading="lazy"
        className={cn("rounded-full transition-all", active ? "opacity-100" : "opacity-25 grayscale")}
        onError={(e) => { e.currentTarget.style.opacity = "0.15" }}
      />
    </div>
  )
}

// ── a primary or secondary tree column (LoL-standard layout). ──
function TreeColumn({ tree, page, perkWr, primary }: { tree: RuneTree; page: RunePage; perkWr: Map<number, { games: number; winrate: number }>; primary: boolean }) {
  const sel = new Set(primary ? page.primary : page.secondary)
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 justify-center">
        <img src={`${PERK_CDN}/${tree.icon}`} alt="" className="w-5 h-5" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />
        <span className="text-[11px] font-chakrapetch font-bold uppercase tracking-[0.18em] text-flash/70">{tree.name}</span>
      </div>
      {primary && (
        <>
          <div className="flex items-center justify-center gap-2 mb-3">
            {tree.keystones.map((k) => (
              <RuneNode key={k.id} rune={k} active={k.id === page.keystone} size={42} wr={perkWr.get(k.id)} />
            ))}
          </div>
          <div className="h-px bg-flash/[0.06] mb-3" />
        </>
      )}
      <div className="space-y-2.5">
        {tree.rows.map((row, ri) => (
          <div key={ri} className="flex items-center justify-center gap-3">
            {row.map((r) => <RuneNode key={r.id} rune={r} active={sel.has(r.id)} size={primary ? 30 : 28} wr={perkWr.get(r.id)} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── the full rune page: two trees + shards, exactly the in-client structure. ──
function RunePageTree({ page, trees, perkWr }: { page: RunePage; trees: RuneTree[]; perkWr: Map<number, { games: number; winrate: number }> }) {
  const primaryTree = trees.find((t) => t.id === page.primaryStyle)
  const subTree = trees.find((t) => t.id === page.subStyle)
  if (!primaryTree || !subTree) return null
  return (
    <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-5">
      <div className="flex flex-col sm:flex-row gap-6">
        <TreeColumn tree={primaryTree} page={page} perkWr={perkWr} primary />
        <div className="hidden sm:block w-px bg-flash/[0.06]" />
        <div className="flex-1 min-w-0">
          <TreeColumn tree={subTree} page={page} perkWr={perkWr} primary={false} />
          {/* shards */}
          <div className="h-px bg-flash/[0.06] my-3" />
          <div className="space-y-2">
            {SHARD_ROWS.map((row, ri) => (
              <div key={ri} className="flex items-center justify-center gap-3">
                {row.map((s) => {
                  const active = page.shards[ri] === s.id
                  return (
                    <div
                      key={`${ri}-${s.id}`}
                      className={cn("grid place-items-center rounded-full transition-all", active ? "ring-2 ring-jade/70 bg-jade/10" : "")}
                      style={{ width: 26, height: 26 }}
                      title={s.name}
                    >
                      <img src={`${PERK_CDN}/StatMods/${s.icon}`} alt={s.name} className={cn("w-5 h-5 transition-all", active ? "opacity-100" : "opacity-25 grayscale")} onError={(e) => { e.currentTarget.style.opacity = "0.15" }} />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── cyber linear build path (FIRST → SECOND → …): items wired by a glowing,
//    energy-flowing jade line, alternatives stacked under each step. ──
type PathStep = { item: number; winrate: number; games: number; ord?: number; isBoots?: boolean; alts: { item: number; winrate: number; games: number }[] }

function BuildPathStrip({ path, boots, bootsSlot, names }: { path: BuildPathSlot[]; boots?: Item; bootsSlot?: number | null; names: Record<number, string> }) {
  // Dedup legendaries into a coherent sequence: each slot takes its most-common
  // item not already used (you can't build the same item twice).
  const used = new Set<number>()
  const steps: PathStep[] = []
  let ord = 0
  for (const s of path) {
    const top = s.items.find((it) => !used.has(it.item))
    if (!top) continue
    used.add(top.item)
    ord++
    const alts = s.items.filter((a) => a.item !== top.item).slice(0, 2).filter((a) => a.games >= Math.max(15, top.games * 0.06))
    steps.push({ item: top.item, winrate: top.winrate, games: top.games, ord, alts })
  }
  // Interleave boots at their typical build position (1 = boots first). Only when
  // we have the boots_slot data (fills in over time as new matches are ingested).
  if (boots && bootsSlot && bootsSlot >= 1) {
    const idx = Math.min(bootsSlot - 1, steps.length)
    steps.splice(idx, 0, { item: boots.item_id, winrate: boots.winrate, games: boots.games ?? 0, isBoots: true, alts: [] })
  }
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {steps.map((s, i) => (
        <div key={`${s.item}-${i}`} className="flex items-start shrink-0">
          <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
            <span className={cn("text-[9px] font-chakrapetch font-bold uppercase tracking-[0.22em]", s.isBoots ? "text-citrine/80" : "text-jade/80")} style={{ textShadow: s.isBoots ? "0 0 10px rgba(255,182,21,0.4)" : "0 0 10px rgba(0,217,146,0.4)" }}>
              {s.isBoots ? "BOOTS" : (ORD_WORD[s.ord ?? 0] ?? `${s.ord}TH`)}
            </span>
            <div className="relative">
              <div className={cn("absolute -inset-[3px] rounded-lg ring-1 pointer-events-none", s.isBoots ? "ring-citrine/40 shadow-[0_0_14px_rgba(255,182,21,0.3)]" : "ring-jade/40 shadow-[0_0_14px_rgba(0,217,146,0.32)]")} />
              <ItemIcon id={s.item} size={52} names={names} />
            </div>
            <span className={cn("text-[12px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(s.winrate))}>{s.winrate.toFixed(1)}%</span>
            {s.games > 0 && <span className="text-[8px] text-flash/35 tabular-nums leading-none">{fmt(s.games)} games</span>}
            {s.alts.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-flash/[0.06]">
                {s.alts.map((a) => (
                  <div key={a.item} className="flex flex-col items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity" title={`${names[a.item] ?? a.item} · ${a.winrate.toFixed(1)}% · ${fmt(a.games)}g`}>
                    <ItemIcon id={a.item} size={26} names={names} />
                    <span className={cn("text-[8px] font-chakrapetch tabular-nums leading-none", wrClass(a.winrate))}>{a.winrate.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {i < steps.length - 1 && (
            <div className="self-start mt-[34px] mx-1 w-8 h-[3px] rounded-full relative overflow-hidden bg-gradient-to-r from-jade/60 via-jade/25 to-jade/60 shadow-[0_0_10px_rgba(0,217,146,0.6)]">
              <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent" style={{ animation: "flow 1.8s linear infinite" }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const VARIANT_LABEL = ["Most Popular", "2nd Most Popular", "Alternative", "Off-Meta", "Niche"]

export default function ChampionBuildTab({ champ }: { champ: { id: string; key: string; name: string }; patch: string }) {
  const [data, setData] = useState<BuildResp | null>(null)
  const [names, setNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [pageIdx, setPageIdx] = useState(0)
  const [vs, setVs] = useState<Champion | null>(null)
  const [patch, setPatch] = useState<string | null>(null)
  const [region, setRegion] = useState<string | null>(null)
  const [patches, setPatches] = useState<string[]>([])
  const trees = useRuneTrees()

  useEffect(() => {
    fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.data) return
        const m: Record<number, string> = {}
        for (const [id, it] of Object.entries<any>(j.data)) m[Number(id)] = it.name
        setNames(m)
      })
      .catch(() => {})
  }, [])

  useEffect(() => { setRole(null); setVs(null); setPatch(null); setRegion(null) }, [champ?.key])
  useEffect(() => { setPageIdx(0) }, [champ?.key, role])
  useEffect(() => {
    fetch(`${BOX_API_BASE_URL}/api/champion/patches`).then((r) => (r.ok ? r.json() : null)).then((j) => j?.patches?.length && setPatches(j.patches as string[])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!champ?.key) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${BOX_API_BASE_URL}/api/champion/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champKey: Number(champ.key), champion: champ.id, role: role ?? undefined, vs: vs?.slug ?? undefined, patch: patch ?? undefined, region: region ?? undefined }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load build"))))
      .then((d: BuildResp) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [champ?.key, champ?.id, role, vs, patch, region])

  const name = champ.name
  const bestSpells = data?.spells?.[0]
  const linkRegion = useMemo(() => "euw", [])
  const buildRoles = (data?.availableRoles ?? []).filter((r) => ROLE_LABEL[r.role])
  const path = data?.buildPath ?? []
  const pr = data?.preciseRunes ?? null
  const pages = pr?.pages ?? []
  const hasPrecise = !!pr && pr.sample >= 40 && pages.length > 0
  const page = pages[Math.min(pageIdx, pages.length - 1)]

  // perk → best winrate (for the rune hover tooltips, "is this sub-rune better?")
  const perkWr = useMemo(() => {
    const m = new Map<number, { games: number; winrate: number }>()
    for (const s of pr?.slots ?? []) for (const o of s.options) {
      const cur = m.get(o.perk)
      if (!cur || o.games > cur.games) m.set(o.perk, { games: o.games, winrate: o.winrate })
    }
    return m
  }, [pr])

  if (loading && !data)
    return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-lg bg-flash/[0.015] animate-pulse" />)}</div>
  if (error || !data) return <div className="px-4 py-12 text-center text-[#ff6286]/80 text-sm">{error ?? "No build data"}</div>

  return (
    <div className="font-jetbrains text-flash">
      <style>{`@keyframes bIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}@keyframes flow{0%{transform:translateX(0)}100%{transform:translateX(400%)}}`}</style>

      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        {buildRoles.length > 1 && (
          <>
            {buildRoles.map((r, idx) => {
              const Icon = ROLE_ICON[r.role]
              const active = r.role === data.role
              const popular = idx === 0 // availableRoles is sorted by games desc
              return (
                <button key={r.role} type="button" onClick={() => setRole(r.role)}
                  className={cn("relative flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-sm text-[11px] font-chakrapetch font-bold uppercase tracking-[0.15em] border transition-colors cursor-pointer",
                    active ? "text-jade border-jade/40 bg-jade/10" : "text-flash/45 border-flash/10 hover:text-flash/70 hover:border-flash/20")}>
                  {Icon && <Icon className={cn("w-4 h-4", active ? "text-jade" : "text-flash/45")} />}
                  {ROLE_LABEL[r.role] ?? r.role}
                  {popular && <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.8)]" title="Most popular role" />}
                </button>
              )
            })}
            <span className="h-5 w-px bg-flash/10 mx-1" />
          </>
        )}

        {/* vs champion — opens the usual champion picker */}
        <ChampionDialog
          onSelect={(c) => setVs(c)}
          onClear={vs ? () => setVs(null) : undefined}
          trigger={
            <button type="button"
              className={cn("flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-sm text-[11px] font-chakrapetch font-bold uppercase tracking-[0.12em] border cursor-pointer transition-colors",
                vs ? "text-jade border-jade/40 bg-jade/10" : "text-flash/55 border-flash/10 hover:text-flash/80 hover:border-flash/20")}>
              {vs ? <img src={`${cdnBaseUrl()}/img/champion/${vs.slug}.png`} alt="" className="w-4 h-4 rounded-full" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} /> : <Swords className="w-3.5 h-3.5" />}
              {vs ? vs.name : "VS"}
            </button>
          }
        />
        <FilterDropdown value={patch} options={patches.map((p) => ({ value: p, label: p }))} onChange={setPatch} allLabel="All patches" />
        <FilterDropdown value={region} options={FILTER_REGIONS.map((r) => ({ value: r.key, label: r.label }))} onChange={setRegion} allLabel="All regions" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr_260px] gap-5">
        {/* ── LEFT: recommended builds + top players ── */}
        <aside className="space-y-6 order-2 lg:order-1">
          {hasPrecise && pages.length > 1 && (
            <div>
              <SectionTitle>Recommended</SectionTitle>
              <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] overflow-hidden">
                {pages.map((p, i) => {
                  const ks = getKeystoneIcon(p.keystone)
                  const ss = getStyleIcon(p.subStyle)
                  return (
                    <button key={i} type="button" onClick={() => setPageIdx(i)}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-flash/[0.04] last:border-0 transition-colors text-left cursor-pointer",
                        i === pageIdx ? "bg-jade/[0.07]" : "hover:bg-flash/[0.03]")}>
                      <div className="relative shrink-0">
                        {ks && <img src={ks} alt="" className="w-8 h-8 rounded-full bg-black/40" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />}
                        {ss && <img src={ss} alt="" className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0a1416] p-px" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={cn("text-[11px] font-chakrapetch font-bold truncate", i === pageIdx ? "text-flash/90" : "text-flash/55")}>{VARIANT_LABEL[i] ?? `Build ${i + 1}`}</div>
                        <div className="text-[9px] text-flash/30 tabular-nums">{fmt(p.games)} games</div>
                      </div>
                      <span className={cn("text-[12px] font-chakrapetch font-bold tabular-nums shrink-0", wrClass(p.winrate))}>{p.winrate.toFixed(1)}%</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div>
            <SectionTitle>Top Players</SectionTitle>
            <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] overflow-hidden">
              {data.topPlayers.length === 0 && <div className="px-4 py-8 text-center text-[11px] text-flash/35">Not enough games yet</div>}
              {data.topPlayers.slice(0, 8).map((p, i) => (
                <Link key={`${p.name}-${p.tag}-${i}`} to={`/summoners/${linkRegion}/${encodeURIComponent(p.name.replace(/\s+/g, "+"))}-${p.tag}`}
                  className="flex items-center gap-2 px-3 py-2 border-b border-flash/[0.04] last:border-0 hover:bg-jade/[0.04] transition-colors group">
                  <span className={cn("w-4 text-center text-[11px] font-chakrapetch font-bold tabular-nums", i === 0 ? "text-jade" : "text-flash/35")}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] text-flash/85 group-hover:text-flash leading-tight">{p.name}</div>
                    <div className="truncate text-[9px] text-flash/30 leading-tight">#{p.tag}</div>
                  </div>
                  <span className={cn("text-[11px] font-chakrapetch font-bold tabular-nums shrink-0", wrClass(p.winrate))}>{p.winrate.toFixed(0)}%</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER: the standard rune page ── */}
        <section className="order-1 lg:order-2">
          <SectionTitle hint={hasPrecise && page ? `${fmt(page.games)} games · ${page.winrate.toFixed(1)}% WR · hover a rune for its win rate` : undefined}>Runes</SectionTitle>
          {hasPrecise && page ? (
            <RunePageTree page={page} trees={trees} perkWr={perkWr} />
          ) : (
            /* fallback: keystone-level (precise sample still building up) */
            <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
              {data.runes.slice(0, 2).map((r, i) => {
                const ks = getKeystoneIcon(r.keystone)
                const prim = getStyleIcon(r.primary)
                const sec = getStyleIcon(r.sub)
                return (
                  <div key={i} className={cn("flex items-center gap-3", i > 0 && "mt-3 pt-3 border-t border-flash/[0.05]")}>
                    {ks && <img src={ks} alt="" className={cn("rounded-full bg-black/40", i === 0 ? "w-12 h-12" : "w-9 h-9")} onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />}
                    <div className="min-w-0 flex-1">
                      <div className={cn("font-chakrapetch font-bold truncate", i === 0 ? "text-[14px] text-flash/90" : "text-[12px] text-flash/60")}>{getKeystoneName(r.keystone) ?? `Keystone ${r.keystone}`}</div>
                      <div className="flex items-center gap-1.5 mt-1">{prim && <img src={prim} alt="" className="w-4 h-4" />}<span className="text-flash/20 text-[10px]">+</span>{sec && <img src={sec} alt="" className="w-4 h-4 opacity-80" />}</div>
                    </div>
                    <div className={cn("font-chakrapetch font-bold tabular-nums shrink-0", i === 0 ? "text-[15px]" : "text-[12px]", wrClass(r.winrate))}>{r.winrate.toFixed(1)}%</div>
                  </div>
                )
              })}
              {pr && pr.sample < 40 && <div className="mt-3 pt-3 border-t border-flash/[0.05] text-[9px] text-flash/30 leading-snug">Precise rune tree is still building up for this pick — it appears once we have enough fully-recorded pages.</div>}
            </div>
          )}

          {/* BUILD PATH under the runes */}
          {(path.length > 0 || data.items.core.length > 0) && (
            <div className="mt-6">
              <SectionTitle hint={path.length > 0 ? "step by step" : "by priority"}>Build Path</SectionTitle>
              <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
                {path.length > 0 ? (
                  <BuildPathStrip path={path} boots={data.items.boots[0]} bootsSlot={data.bootsSlot} names={names} />
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {data.items.core.map((it, i) => (
                      <div key={it.item_id} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                          <ItemIcon id={it.item_id} size={48} names={names} />
                          <span className={cn("text-[10px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate))}>{it.winrate.toFixed(1)}%</span>
                        </div>
                        {i < data.items.core.length - 1 && <span className="text-flash/20 mx-1 text-[14px]">›</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── RIGHT: spells + items ── */}
        <aside className="space-y-6 order-3">
          <div>
            <SectionTitle>Spells</SectionTitle>
            <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-3 space-y-2">
              {data.spells.length === 0 && <div className="text-center text-[11px] text-flash/35 py-2">—</div>}
              {data.spells.slice(0, 2).map((sp, i) => (
                <div key={i} className={cn("flex items-center gap-2.5", i > 0 && "pt-2 border-t border-flash/[0.05]")}>
                  <img src={summonerSpellUrl(sp.spell1)} alt="" className={cn("rounded-md ring-1 ring-flash/10", i === 0 ? "w-10 h-10" : "w-8 h-8")} onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />
                  <img src={summonerSpellUrl(sp.spell2)} alt="" className={cn("rounded-md ring-1 ring-flash/10", i === 0 ? "w-10 h-10" : "w-8 h-8")} onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />
                  <div className="flex-1" />
                  <div className="text-right">
                    <div className={cn("font-chakrapetch font-bold tabular-nums", i === 0 ? "text-[15px]" : "text-[12px]", wrClass(sp.winrate))}>{sp.winrate.toFixed(1)}%</div>
                    {sp.pickrate != null && <div className="text-[9px] text-flash/35 tabular-nums">{sp.pickrate.toFixed(0)}% pick</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>Items</SectionTitle>
            <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 space-y-4">
              {data.items.boots.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Boots</div>
                  <div className="flex items-start gap-2.5 flex-wrap">
                    {data.items.boots.map((b) => (
                      <div key={b.item_id} className="flex flex-col items-center gap-1 w-[40px]" title={names[b.item_id] ?? ""}>
                        <ItemIcon id={b.item_id} size={34} names={names} />
                        <span className={cn("text-[10px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(b.winrate))}>{b.winrate.toFixed(1)}%</span>
                        {b.pickrate != null && <span className="text-[8px] text-flash/35 tabular-nums leading-none">{b.pickrate.toFixed(0)}% pick</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.items.core.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Core</div>
                  <div className="flex items-center gap-1.5 flex-wrap">{data.items.core.map((it) => <ItemIcon key={it.item_id} id={it.item_id} size={36} names={names} />)}</div>
                </div>
              )}
              {data.items.situational.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Situational</div>
                  <div className="flex items-start gap-1.5 flex-wrap">
                    {data.items.situational.map((it) => (
                      <div key={it.item_id} className="flex flex-col items-center gap-0.5 w-[42px]" title={names[it.item_id] ?? ""}>
                        <ItemIcon id={it.item_id} size={32} names={names} />
                        <span className={cn("text-[9px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate))}>{it.winrate.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
