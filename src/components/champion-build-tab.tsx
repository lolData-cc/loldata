import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/authcontext"
import { BOX_API_BASE_URL, cdnBaseUrl, summonerSpellUrl, PERK_CDN } from "@/config"
import { getKeystoneIcon, getStyleIcon, getKeystoneName } from "@/constants/runes"
import { useRuneTrees } from "@/constants/runeData"
import type { RuneInfo, RuneTree } from "@/constants/rune-tree-data"
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons"
import { ChampionDialog } from "@/components/champion-dialog"
import type { Champion } from "@/hooks/useChampions"
import { Swords, ChevronDown, Lock, ArrowRight, HelpCircle } from "lucide-react"
import { ExplorerTutorial } from "@/components/explorer-tutorial"
import { motion, AnimatePresence } from "framer-motion"
import { CyberTip } from "@/components/explorer/CyberTip"
import { PatchTag } from "@/components/patch-tag"
import { cn } from "@/lib/utils"
import RuneImportButton from "@/components/rune-import-button"
import BuildImportButton from "@/components/build-import-button"
import DesktopAppPromo from "@/components/desktop-app-promo"

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
  items: { boots: Item[]; core: Item[]; situational: Item[]; support?: Item[]; jungle?: Item[] }
  topPlayers: Player[]
  availableRoles?: { role: string; games: number }[]
  junglePath?: JunglePath | null
}

/** Camp codes are normalised server-side to the player's own half:
 *  1-6 = own Blue/Gromp/Wolves/Raptors/Red/Krugs, 7-12 = the enemy mirror. */
type JungleBack = {
  atSeconds: number
  sample: number
  items: { id: number; pct: number }[]
}
type JungleRoute = { route: number[]; games: number; winrate: number; back?: JungleBack | null }

// Below this a component is a one-off somebody happened to buy, not the reason
// the clear was cut short.
const BACK_ITEM_MIN_PCT = 10
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
type JunglePath = { totalGames: number; routes: JungleRoute[] }

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
// NB: Riot's icon FILES are misnamed — "HealthScalingIcon" is the PLAIN heart (flat
// +Health), "HealthPlusIcon" is the heart-with-up-arrow (scales with level). So by
// ARTWORK: flat Health (5011) → HealthScaling file, Health Scaling (5001) → HealthPlus file.
const SHARD_ROWS: { id: number; icon: string; name: string }[][] = [
  [
    { id: 5008, icon: "StatModsAdaptiveForceIcon.png", name: "Adaptive Force" },
    { id: 5005, icon: "StatModsAttackSpeedIcon.png", name: "Attack Speed" },
    { id: 5007, icon: "StatModsCDRScalingIcon.png", name: "Ability Haste" },
  ],
  [
    { id: 5008, icon: "StatModsAdaptiveForceIcon.png", name: "Adaptive Force" },
    { id: 5010, icon: "StatModsMovementSpeedIcon.png", name: "Move Speed" },
    { id: 5001, icon: "StatModsHealthPlusIcon.png", name: "Health Scaling" },
  ],
  [
    { id: 5011, icon: "StatModsHealthScalingIcon.png", name: "Health" },
    { id: 5013, icon: "StatModsTenacityIcon.png", name: "Tenacity" },
    { id: 5001, icon: "StatModsHealthPlusIcon.png", name: "Health Scaling" },
  ],
]

function SectionTitle({ children, hint, action }: { children: React.ReactNode; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-[11px] font-chakrapetch font-bold uppercase tracking-[0.22em] text-jade/70 whitespace-nowrap">{children}</h3>
      {hint && <span className="text-[11px] font-chakrapetch font-medium tracking-wide text-flash/55 whitespace-nowrap truncate">{hint}</span>}
      <span className="h-px flex-1 bg-gradient-to-r from-jade/15 to-transparent" />
      {/* an action rides the rule rather than sitting under the section, so it
          reads as belonging to this block and not to the one below */}
      {action}
    </div>
  )
}

function ItemIcon({ id, size = 44, names }: { id: number; size?: number; names: Record<number, string> }) {
  return (
    <CyberTip tip={names[id] ?? String(id)}>
      <span className="relative inline-block">
        <img
          src={`${cdnBaseUrl()}/img/item/${id}.png`}
          alt={names[id] ?? String(id)}
          width={size}
          height={size}
          loading="lazy"
          className="rounded-md ring-1 ring-flash/10 bg-filmdark/30"
          onError={(e) => { e.currentTarget.style.opacity = "0.2" }}
        />
        <PatchTag kind="item" id={id} />
      </span>
    </CyberTip>
  )
}

// ── one rune node in the tree — lit when selected, dimmed otherwise. ──
function RuneNode({ rune, active, size, wr }: { rune: RuneInfo; active: boolean; size: number; wr?: { games: number; winrate: number } }) {
  return (
    <CyberTip tip={<><div className="font-bold text-flash/90">{rune.name}</div>{wr && <div className="mt-0.5 text-flash/55">{wr.winrate.toFixed(1)}% WR · {fmt(wr.games)} games</div>}</>}>
      <div
        className={cn("relative grid place-items-center rounded-full transition-all", active ? "ring-2 ring-jade/70 bg-jade/10" : "")}
        style={{ width: size + 6, height: size + 6 }}
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
    </CyberTip>
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
                    <CyberTip key={`${ri}-${s.id}`} tip={s.name}>
                      <div
                        className={cn("grid place-items-center rounded-full transition-all", active ? "ring-2 ring-jade/70 bg-jade/10" : "")}
                        style={{ width: 26, height: 26 }}
                      >
                        <img src={`${PERK_CDN}/StatMods/${s.icon}`} alt={s.name} className={cn("w-5 h-5 transition-all", active ? "opacity-100" : "opacity-25 grayscale")} onError={(e) => { e.currentTarget.style.opacity = "0.15" }} />
                      </div>
                    </CyberTip>
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

// The sequence the strip draws — shared with the desktop import button so the
// app receives exactly the order that is on screen, rather than a second
// opinion assembled from the same data.
export function buildPathSteps(path: BuildPathSlot[], boots?: Item, bootsSlot?: number | null): PathStep[] {
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
  return steps
}

function BuildPathStrip({ path, boots, bootsSlot, names }: { path: BuildPathSlot[]; boots?: Item; bootsSlot?: number | null; names: Record<number, string> }) {
  const steps = buildPathSteps(path, boots, bootsSlot)
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
                  <div key={a.item} className="flex flex-col items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity">
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

// ── Deep stats (Performance + Laning) — from /api/champion/build-stats ────────
type PerfStats = {
  games: number; winrate: number | null
  kills: number | null; deaths: number | null; assists: number | null
  killParticipation: number | null; damageShare: number | null
  damageToChamps: number | null; gold: number | null
  cs: number | null; csPerMin: number | null
  vision: number | null; soloKills: number | null; champLevel: number | null
}
type LaningStats = { games: number; gold: number | null; cs: number | null; xp: number | null; kills: number | null; deaths: number | null; assists: number | null; damage: number | null }
type LaningVs = { games: number; goldDiff: number | null; csDiff: number | null; xpDiff: number | null; damageDiff: number | null }
type GameLengthBucket = { label: string; min: number; games: number; winrate: number | null }
type SkillOrder = { sample: number; perLevel: number[]; priority: number[] }
type StatsResp = { role: string | null; vs: string | null; stats: PerfStats | null; baseline: PerfStats | null; laning: LaningStats | null; laningVs: LaningVs | null; gameLength: GameLengthBucket[] | null; skillOrder: SkillOrder | null }

const kfmt = (n: number | null | undefined) => (n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString())

// One performance metric: big value + a bar whose fill is this champ and whose
// tick marks the role average, plus a Δ% badge (jade when better than average).
function StatBar({ label, value, display, baseline, higherBetter = true, unit = "" }: {
  label: string; value: number | null; display: string; baseline?: number | null; higherBetter?: boolean; unit?: string
}) {
  const hasCmp = value != null && baseline != null && baseline > 0
  const domain = hasCmp ? Math.max(value!, baseline!) * 1.5 : ((value ?? 0) * 1.2 || 1)
  const fill = value != null ? Math.min(100, (value / domain) * 100) : 0
  const mark = hasCmp ? Math.min(100, (baseline! / domain) * 100) : null
  const delta = hasCmp ? ((value! - baseline!) / baseline!) * 100 : null
  const good = delta == null ? null : higherBetter ? delta >= 0 : delta <= 0
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-flash/35 truncate">{label}</span>
        {delta != null && (
          <span className={cn("text-[9px] font-jetbrains tabular-nums shrink-0", good ? "text-jade/80" : "text-flash/30")}>
            {delta >= 0 ? "+" : ""}{delta.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-[16px] font-chakrapetch font-bold tabular-nums text-flash/90 leading-none">{display}</span>
        {unit && <span className="text-[9px] text-flash/30">{unit}</span>}
      </div>
      <div className="mt-1.5 relative h-1 rounded-full bg-flash/[0.06]">
        <div className={cn("absolute inset-y-0 left-0 rounded-full", good === false ? "bg-flash/25" : "bg-jade/60")} style={{ width: `${fill}%` }} />
        {mark != null && <div className="absolute -top-[3px] h-[7px] w-px bg-flash/45" style={{ left: `${mark}%` }} title="role average" />}
      </div>
    </div>
  )
}

function PerformanceSection({ s }: { s: StatsResp }) {
  const st = s.stats, bl = s.baseline
  if (!st || !st.games) return null
  const kda = st.deaths && st.deaths > 0 ? ((st.kills ?? 0) + (st.assists ?? 0)) / st.deaths : null
  return (
    <div>
      <SectionTitle hint="per game · tick = role average">Performance</SectionTitle>
      <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 sm:p-5">
        <div className="flex items-end gap-4 mb-4 pb-4 border-b border-flash/[0.06]">
          <div>
            <div className="text-[9px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-flash/35 mb-1">KDA</div>
            <div className="font-chakrapetch font-bold tabular-nums text-flash/90">
              <span className="text-[22px]">{st.kills?.toFixed(1)}</span>
              <span className="text-flash/25 text-[15px]"> / </span>
              <span className="text-[22px] text-[#ff6286]/90">{st.deaths?.toFixed(1)}</span>
              <span className="text-flash/25 text-[15px]"> / </span>
              <span className="text-[22px]">{st.assists?.toFixed(1)}</span>
            </div>
          </div>
          {kda != null && (
            <div className="ml-auto text-right">
              <div className={cn("text-[22px] font-chakrapetch font-bold tabular-nums leading-none", kda >= 3 ? "text-jade" : kda >= 2 ? "text-[#7bd9b0]" : "text-flash/70")}>{kda.toFixed(2)}</div>
              <div className="text-[9px] font-jetbrains text-flash/30 uppercase tracking-[0.15em] mt-0.5">KDA</div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4">
          <StatBar label="Kill Part." value={st.killParticipation} display={st.killParticipation != null ? `${st.killParticipation.toFixed(0)}%` : "—"} baseline={bl?.killParticipation} />
          <StatBar label="Dmg Share" value={st.damageShare} display={st.damageShare != null ? `${st.damageShare.toFixed(0)}%` : "—"} baseline={bl?.damageShare} />
          <StatBar label="Dmg/Champs" value={st.damageToChamps} display={kfmt(st.damageToChamps)} baseline={bl?.damageToChamps} />
          <StatBar label="Gold" value={st.gold} display={kfmt(st.gold)} baseline={bl?.gold} />
          <StatBar label="CS" value={st.cs} display={st.cs != null ? st.cs.toFixed(0) : "—"} baseline={bl?.cs} unit={st.csPerMin != null ? `${st.csPerMin.toFixed(1)}/m` : ""} />
          <StatBar label="Vision" value={st.vision} display={st.vision != null ? st.vision.toFixed(0) : "—"} baseline={bl?.vision} />
          <StatBar label="Solo Kills" value={st.soloKills} display={st.soloKills != null ? st.soloKills.toFixed(1) : "—"} baseline={bl?.soloKills} />
          <StatBar label="Avg Level" value={st.champLevel} display={st.champLevel != null ? st.champLevel.toFixed(1) : "—"} baseline={bl?.champLevel} />
        </div>
      </div>
    </div>
  )
}

function Stat10({ label, val, d = 0 }: { label: string; val: number | null; d?: number }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-chakrapetch font-bold uppercase tracking-[0.14em] text-flash/35 truncate">{label}</div>
      <div className="text-[15px] font-chakrapetch font-bold tabular-nums text-flash/85 leading-tight">{val == null ? "—" : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(d)}</div>
    </div>
  )
}

function LaningSection({ s, vsName }: { s: StatsResp; vsName?: string | null }) {
  const l = s.laning, v = s.laningVs
  if (!l || !l.games) return null
  const Diff = ({ label, val }: { label: string; val: number | null }) => {
    if (val == null) return null
    const pos = val >= 0
    return (
      <div className="flex flex-col items-center justify-center px-2 py-2 rounded-md bg-filmdark/25">
        <span className="text-[9px] font-chakrapetch font-bold uppercase tracking-[0.14em] text-flash/35">{label}</span>
        <span className={cn("text-[18px] font-chakrapetch font-bold tabular-nums leading-tight", pos ? "text-jade" : "text-[#ff6286]")}>{pos ? "+" : ""}{Math.round(val)}</span>
      </div>
    )
  }
  return (
    <div>
      <SectionTitle hint={v ? `${fmt(v.games)} games vs ${vsName}` : `@10 min · ${fmt(l.games)} games`}>Laning @ 10 min</SectionTitle>
      <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 sm:p-5">
        {v && (
          <>
            <div className="text-[9px] font-chakrapetch font-bold uppercase tracking-[0.16em] text-jade/60 mb-2">Lead vs {vsName ?? "opponent"} @ 10</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Diff label="Gold" val={v.goldDiff} />
              <Diff label="CS" val={v.csDiff} />
              <Diff label="XP" val={v.xpDiff} />
              <Diff label="Damage" val={v.damageDiff} />
            </div>
            <div className="h-px bg-flash/[0.06] my-3.5" />
          </>
        )}
        <div className="grid grid-cols-3 gap-x-4 gap-y-3">
          <Stat10 label="Gold" val={l.gold} />
          <Stat10 label="CS" val={l.cs} />
          <Stat10 label="XP" val={l.xp} />
          <Stat10 label="Kills" val={l.kills} d={1} />
          <Stat10 label="Deaths" val={l.deaths} d={1} />
          <Stat10 label="Damage" val={l.damage} />
        </div>
      </div>
    </div>
  )
}

/** Monotone cubic interpolation (Fritsch-Carlson). A plain polyline made the
 *  trend look like a series of decisions; a Catmull-Rom spline would smooth it
 *  but overshoot, inventing peaks and dips the data never had. Monotone is the
 *  one that curves without ever leaving the range of its own points. */
function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length
  if (n < 2) return ""
  if (n === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`

  const dx: number[] = [], dy: number[] = [], slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x
    dy[i] = pts[i + 1].y - pts[i].y
    slope[i] = dy[i] / dx[i]
  }
  const m: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m[i] = 0
    else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      m[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])
    }
  }
  m[n - 1] = slope[n - 2]

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3
    const c1y = pts[i].y + (m[i] * dx[i]) / 3
    const c2x = pts[i + 1].x - dx[i] / 3
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`
  }
  return d
}

/** Win rate against game length.
 *
 *  Built around the 50% line rather than around the numbers: that line is the
 *  whole question, so it is the spine of the chart and everything else reads as
 *  a departure from it. The band between the curve and the spine is filled jade
 *  where the champion is winning and red where it is losing, with one clip per
 *  side of the line, so the fill changes colour exactly where the curve crosses
 *  even rather than at the nearest bucket boundary.
 *
 *  The strip along the bottom is how many games sit behind each bucket. It used
 *  to be reachable only by hovering a 3px dot, which hid the one thing that says
 *  whether the tail of the curve can be trusted at all. */
function GameLengthChart({ data }: { data: GameLengthBucket[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const present = data.map((d, i) => ({ ...d, i })).filter((d) => d.winrate != null && d.games > 0)
  if (present.length < 2) return null

  const W = 520, H = 208
  const padL = 42, padR = 18, padT = 24
  const stripH = 14, labelH = 16, gap = 10
  const padB = stripH + labelH + gap
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  // Always keep 50 inside the range, and pad it out so a flat champion does not
  // get its noise magnified into a mountain range.
  const wrs = present.map((d) => d.winrate as number)
  const rawLo = Math.min(...wrs, 50)
  const rawHi = Math.max(...wrs, 50)
  const span = Math.max(rawHi - rawLo, 4)
  const mid = (rawHi + rawLo) / 2
  const lo = mid - span * 0.72
  const hi = mid + span * 0.72

  const n = data.length
  const mapX = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const mapY = (wr: number) => padT + (1 - (wr - lo) / (hi - lo)) * plotH
  const y50 = mapY(50)
  const plotBottom = padT + plotH

  const pts = present.map((d) => ({ x: mapX(d.i), y: mapY(d.winrate as number) }))
  const curve = smoothPath(pts)
  const band = `${curve} L ${pts[pts.length - 1].x.toFixed(2)} ${y50.toFixed(2)} L ${pts[0].x.toFixed(2)} ${y50.toFixed(2)} Z`

  const maxGames = Math.max(...data.map((d) => d.games))
  const first = present[0]
  const last = present[present.length - 1]
  const swing = (last.winrate as number) - (first.winrate as number)
  const colBand = plotW / Math.max(1, n - 1)

  return (
    <div>
      <SectionTitle hint="win rate by game duration">Win Rate by Game Length</SectionTitle>
      <div className="rounded-[4px] bg-[rgba(6,12,14,0.55)] ring-1 ring-jade/15 p-3 sm:p-4">
        {/* The trend stated, not only drawn. */}
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-chakrapetch text-[19px] font-bold tabular-nums text-flash/90">
            {(first.winrate as number).toFixed(1)}%
          </span>
          <span className="font-jetbrains text-[10px] text-flash/25">{first.label}</span>
          <span className="text-flash/20">&rarr;</span>
          <span className={cn(
            "font-chakrapetch text-[19px] font-bold tabular-nums",
            (last.winrate as number) >= 50 ? "text-jade" : "text-[#ff6286]"
          )}>
            {(last.winrate as number).toFixed(1)}%
          </span>
          <span className="font-jetbrains text-[10px] text-flash/25">{last.label}</span>
          <span className={cn(
            "ml-auto rounded-[3px] px-2 py-[3px] font-jetbrains text-[10px] uppercase tracking-[0.14em]",
            swing >= 0 ? "bg-jade/[0.10] text-jade/85" : "bg-[#ff6286]/[0.10] text-[#ff6286]/85"
          )}>
            {swing >= 0 ? "+" : ""}{swing.toFixed(1)} over the game
          </span>
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Win rate by game length, from ${(first.winrate as number).toFixed(1)} percent at ${first.label} minutes to ${(last.winrate as number).toFixed(1)} percent at ${last.label}`}
        >
          <defs>
            <linearGradient id="wrlUp" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(0,217,146,0.04)" />
              <stop offset="100%" stopColor="rgba(0,217,146,0.34)" />
            </linearGradient>
            <linearGradient id="wrlDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,98,134,0.04)" />
              <stop offset="100%" stopColor="rgba(255,98,134,0.30)" />
            </linearGradient>
            {/* One clip per side of the spine, so the fill changes colour exactly
                where the curve crosses even, not at a bucket boundary. */}
            <clipPath id="wrlAbove"><rect x="0" y="0" width={W} height={y50} /></clipPath>
            <clipPath id="wrlBelow"><rect x="0" y={y50} width={W} height={H - y50} /></clipPath>
            <filter id="wrlGlow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* the spine */}
          <line x1={padL} y1={y50} x2={W - padR} y2={y50} stroke="rgba(0,217,146,0.30)" strokeWidth="1" />
          <text x={padL - 8} y={y50 + 3.5} textAnchor="end" fill="rgba(0,217,146,0.55)"
                style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.1em" }}>EVEN</text>
          <text x={padL - 8} y={padT + 4} textAnchor="end" fill="rgba(215,216,217,0.22)"
                style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}>{hi.toFixed(0)}%</text>
          <text x={padL - 8} y={plotBottom + 3} textAnchor="end" fill="rgba(215,216,217,0.22)"
                style={{ fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}>{lo.toFixed(0)}%</text>

          <path d={band} fill="url(#wrlUp)" clipPath="url(#wrlAbove)" />
          <path d={band} fill="url(#wrlDown)" clipPath="url(#wrlBelow)" />
          <path d={curve} fill="none" stroke="#00d992" strokeWidth="2.25" strokeLinejoin="round"
                strokeLinecap="round" filter="url(#wrlGlow)" opacity="0.95" />

          {present.map((d) => {
            const x = mapX(d.i)
            const y = mapY(d.winrate as number)
            const good = (d.winrate as number) >= 50
            const on = hover === d.i
            return (
              <g key={d.label}>
                {on && (
                  <line x1={x} y1={padT - 6} x2={x} y2={plotBottom} stroke="rgba(215,216,217,0.16)" strokeWidth="1" />
                )}
                <circle cx={x} cy={y} r={on ? 5 : 3.4} fill={good ? "#00d992" : "#ff6286"}
                        stroke="#040A0C" strokeWidth="1.6" style={{ transition: "r 160ms ease" }} />
                <text x={x} y={good ? y - 11 : y + 17} textAnchor="middle"
                      fill={good ? "rgba(0,217,146,0.95)" : "rgba(255,98,134,0.95)"}
                      style={{ fontSize: 11, fontFamily: "Chakra Petch, sans-serif", fontWeight: 700 }}>
                  {(d.winrate as number).toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Sample size: the confidence behind each bucket, previously hidden
              inside a tooltip on a 3px dot. */}
          {data.map((d, i) => {
            const bw = Math.max(10, (plotW / n) * 0.5)
            const h = maxGames > 0 ? Math.max(1.5, (d.games / maxGames) * stripH) : 0
            const yTop = plotBottom + gap + (stripH - h)
            return (
              <rect key={`s-${d.label}`} x={mapX(i) - bw / 2} y={yTop} width={bw} height={h} rx="1"
                    fill={hover === i ? "rgba(0,217,146,0.55)" : "rgba(0,217,146,0.20)"}
                    style={{ transition: "fill 160ms ease" }} />
            )
          })}

          {data.map((d, i) => (
            <text key={`l-${d.label}`} x={mapX(i)} y={H - 3} textAnchor="middle"
                  fill={hover === i ? "rgba(215,216,217,0.75)" : "rgba(215,216,217,0.38)"}
                  style={{ fontSize: 9.5, fontFamily: "JetBrains Mono, monospace", transition: "fill 160ms ease" }}>
              {d.label}
            </text>
          ))}

          {/* Full-height hit targets: a 3px dot is not a pointer target. */}
          {data.map((d, i) => (
            <rect key={`h-${d.label}`} x={mapX(i) - colBand / 2} y={0} width={colBand} height={H}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <title>{`${d.label} min - ${d.winrate == null ? "no data" : `${d.winrate.toFixed(1)}% WR`} - ${d.games.toLocaleString()} games`}</title>
            </rect>
          ))}
        </svg>

        <p className="mt-2 font-chakrapetch text-[9px] leading-snug text-flash/25">
          Bars under the axis are games per bucket &mdash; the tail of the curve is only
          as trustworthy as the bar beneath it.
        </p>
      </div>
    </div>
  )
}

// Skill order — Q/W/E/R × levels 1-18 grid (most common ability leveled each
// level). Data accrues from the ingest over time, so it shows a "collecting"
// state until there's a meaningful sample.
const SKILL_ABILITIES = [
  { slot: 1, key: "Q" },
  { slot: 2, key: "W" },
  { slot: 3, key: "E" },
  { slot: 4, key: "R" },
]
function skillPriorityHint(priority: number[]) {
  const k: Record<number, string> = { 1: "Q", 2: "W", 3: "E" }
  return priority.length >= 2 ? `max ${priority.map((s) => k[s]).join(" › ")}` : undefined
}
// Compact, monochrome (jade/gray) skill grid sized for the sidebar column.
/* --- Jungle pathing -------------------------------------------------------
   Drawn on the real Summoner's Rift minimap.

   Routes arrive normalised to the player's own half (1-6 own, 7-12 enemy), so
   the map is always shown from the blue side: "own" camps sit bottom-left,
   "enemy" top-right. That is a deliberate re-projection, not the literal side
   played - it is what makes a red-team clear and its blue-team mirror read as
   the same route.

   The route comes from per-minute positions, NOT camp kill events: Riot
   publishes none for normal camps and frames are 60s apart. So a drawn route
   is "the camps this jungler was seen at, in order" and can be shorter than
   the clear really was. The caption says so rather than implying precision the
   data does not have. */

// Game-space camp coordinates: own half first, then the enemy mirror.
const CAMP_POS: [number, number][] = [
  [3821, 8106], [2178, 8410], [3906, 6438], [7420, 5399], [7815, 4052], [8283, 2599],
  [11071, 6969], [12736, 6663], [10983, 8508], [7442, 9663], [7080, 10998], [6489, 12442],
]
const CAMP_NAMES = ["Blue", "Gromp", "Wolves", "Raptors", "Red", "Krugs"] as const

// The real in-game monster portraits (Community Dragon character HUD art),
// mirrored into our own /public so the page never depends on a third-party
// host at runtime. Order matches CAMP_NAMES.
const CAMP_ICONS = [
  "/img/jungle/blue.png",
  "/img/jungle/gromp.png",
  "/img/jungle/wolves.png",
  "/img/jungle/raptors.png",
  "/img/jungle/red.png",
  "/img/jungle/krugs.png",
] as const
const campIcon = (code: number) => CAMP_ICONS[(code - 1) % 6]

// The Rift spans ~14870 x 14980 game units. Game Y grows upward and SVG Y grows
// downward, hence the flip.
const MAP_W = 14870
const MAP_H = 14980

/** Routes are stored own/enemy, not blue/red — so which half of the map "own"
 *  lands on is a pure display choice. Viewing as RED simply swaps the two
 *  halves (codes 1-6 <-> 7-12); the data is identical, it is the same clear
 *  seen from the other side of the map. */
const forSide = (code: number, side: "blue" | "red"): number =>
  side === "blue" ? code : code <= 6 ? code + 6 : code - 6

const toSvg = (code: number, side: "blue" | "red"): { x: number; y: number } => {
  const [gx, gy] = CAMP_POS[forSide(code, side) - 1]
  return { x: (gx / MAP_W) * 1000, y: (1 - gy / MAP_H) * 1000 }
}
const campName = (code: number) => CAMP_NAMES[(code - 1) % 6]
const isEnemyCamp = (code: number) => code > 6

// Radius in viewBox units (the map is a 1000x1000 viewBox). 26 rendered ~19px
// across and was unreadable; 58 rendered ~49px and swallowed the map. 40 lands
// at ~34px on the 420px map — the monster is recognisable and the jungle around
// it still is too.
const R_NODE = 40

/** Blue / red side, as a pill straddling the top edge of the map - the same
 *  half-in-half-out anchoring the champion level badge uses on a match card.
 *
 *  A sliding thumb rather than two buttons swapping colour: the switch then
 *  reads as one control moving, and the eye can follow which side is selected
 *  instead of re-reading both labels.
 *
 *  Fixed height so the map can offset it by exactly half. grid-cols-2 makes the
 *  two cells equal despite "blue" and "red" being different lengths, which is
 *  what lets the thumb be a plain 50% and land dead on the second cell.
 */
function SideSwitch({
  side,
  onChange,
}: {
  side: "blue" | "red"
  onChange: (s: "blue" | "red") => void
}) {
  return (
    <div className="relative grid grid-cols-2 h-[22px] rounded-full p-[3px] bg-liquirice ring-1 ring-flash/[0.07] shadow-[0_3px_12px_rgba(0,0,0,0.7)]">
      {/* translate-x-full moves the thumb by its OWN width - exactly one cell -
          so the travel stays correct at any pill width. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full",
          "transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          side === "red"
            ? "translate-x-full bg-[#e0503f]/30"
            : "translate-x-0 bg-[#5BA8E6]/30"
        )}
      />
      {(["blue", "red"] as const).map((sd) => (
        <button
          key={sd}
          type="button"
          onClick={() => onChange(sd)}
          aria-pressed={side === sd}
          className={cn(
            "relative z-10 flex items-center justify-center rounded-full cursor-clicker select-none",
            "font-jetbrains text-[9px] leading-none uppercase tracking-[0.16em]",
            // All-caps has no descender, so flex centring - which works off the
            // full line metrics - parks the glyphs 1px high (measured: 3.5px of
            // ink above, 5.5px below, in a 16px box). Against items-center a 2px
            // top pad shrinks the content box and moves it down by exactly 1px.
            // The trailing letter-space that tracking adds after the last glyph
            // pulls the word left by half a space; pl compensates by the same.
            "pt-[2px] pl-[calc(0.75rem+0.08em)] pr-3",
            "transition-colors duration-300",
            side === sd
              ? sd === "blue" ? "text-[#bcdcf8]" : "text-[#ffc0b6]"
              : "text-flash/35 hover:text-flash/60"
          )}
        >
          {sd}
        </button>
      ))}
    </div>
  )
}

function JunglePathPanel({ data }: { data: JunglePath }) {
  const [sel, setSel] = useState(0)
  const [side, setSide] = useState<"blue" | "red">("blue")
  const route = data.routes[sel]?.route ?? []
  const pts = route.filter((c) => c >= 1 && c <= 12).map((c) => toSvg(c, side))

  return (
    <div className="mt-8">
      <SectionTitle>Jungle Pathing</SectionTitle>
      <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* the map */}
          <div className="relative w-full max-w-[420px] mx-auto lg:mx-0 shrink-0">
          {/* The clip lives on the inner box: a pill hung on the outer one can
              overhang the edge, which the map's own overflow-hidden would eat. */}
          <div className="relative aspect-square rounded-[4px] overflow-hidden ring-1 ring-jade/15">
            <img
              src={`${cdnBaseUrl()}/img/map/map11.png`}
              alt="Summoner's Rift"
              className="absolute inset-0 w-full h-full object-cover opacity-55"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-liquirice/35" />
            <svg viewBox="0 0 1000 1000" className="absolute inset-0 w-full h-full">
              {/* every camp, dimmed - the route reads against the whole jungle */}
              {CAMP_POS.map((_, i) => {
                const p = toSvg(i + 1, side)
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={13}
                    fill="none"
                    stroke={isEnemyCamp(i + 1) ? "rgba(224,80,63,0.32)" : "rgba(0,217,146,0.32)"}
                    strokeWidth={3}
                  />
                )
              })}

              {pts.length > 1 && (
                <polyline
                  points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="rgb(0,217,146)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="13 10"
                  opacity={0.9}
                />
              )}
              {/* One clip per node: an SVG <image> is rectangular, so the
                  portrait has to be masked to a circle to sit in the ring. */}
              <defs>
                {pts.map((p, i) => (
                  <clipPath key={i} id={`jp-clip-${i}`}>
                    <circle cx={p.x} cy={p.y} r={R_NODE - 2} />
                  </clipPath>
                ))}
              </defs>
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={R_NODE} fill="rgba(4,10,12,0.92)" />
                  <image
                    href={campIcon(route[i])}
                    x={p.x - (R_NODE - 2)}
                    y={p.y - (R_NODE - 2)}
                    width={(R_NODE - 2) * 2}
                    height={(R_NODE - 2) * 2}
                    clipPath={`url(#jp-clip-${i})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  <circle cx={p.x} cy={p.y} r={R_NODE} fill="none" stroke="rgb(0,217,146)" strokeWidth={4} />
                  {/* order badge — which camp came first still matters */}
                  <circle cx={p.x + R_NODE * 0.78} cy={p.y - R_NODE * 0.78} r={R_NODE * 0.34} fill="rgb(0,217,146)" />
                  <text
                    x={p.x + R_NODE * 0.78}
                    y={p.y - R_NODE * 0.78 + R_NODE * 0.12}
                    textAnchor="middle"
                    fontSize={R_NODE * 0.46}
                    fontWeight="700"
                    fill="#040A0C"
                    fontFamily="chakrapetch, sans-serif"
                  >
                    {i + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>
            {/* Centred with flex, never a transform: a half-pixel translate on a
                text-bearing box parks it on a compositing layer and blurs it. */}
            <div className="absolute inset-x-0 -top-[11px] z-20 flex justify-center pointer-events-none">
              <div className="pointer-events-auto">
                <SideSwitch side={side} onChange={setSide} />
              </div>
            </div>
          </div>

          {/* the routes */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch">
                Most played clears - {fmt(data.totalGames)} games
              </span>
            </div>
            <div className="space-y-1.5">
              {data.routes.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSel(i)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-[4px] px-2.5 py-2 text-left transition-colors cursor-clicker",
                    i === sel ? "bg-jade/[0.10]" : "bg-flash/[0.02] hover:bg-flash/[0.05]"
                  )}
                >
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {r.route.map((code, j) => (
                      <span key={j} className="flex items-center gap-1.5">
                        {j > 0 && <span className="text-flash/20 text-[10px]">-&gt;</span>}
                        <span
                          className={cn(
                            "flex items-center gap-1 pl-1 pr-1.5 py-[2px] rounded-[3px] text-[10px] font-chakrapetch font-semibold whitespace-nowrap",
                            isEnemyCamp(code) ? "bg-[#e0503f]/[0.13] text-[#ff9c8f]" : "bg-jade/[0.10] text-jade/90"
                          )}
                          title={isEnemyCamp(code) ? "Enemy jungle" : "Own jungle"}
                        >
                          <img src={campIcon(code)} alt="" className="w-4 h-4 rounded-full" loading="lazy" />
                          {campName(code)}
                        </span>
                      </span>
                    ))}
                  </div>
                  {(() => {
                    // Some clears are deliberately cut short to reset and buy a
                    // component - the point of the route, and invisible in the
                    // final build because the component is gone by then. Citrine
                    // rather than jade so it reads as a different kind of thing
                    // from the camps above it.
                    const items = (r.back?.items ?? []).filter((it) => it.pct >= BACK_ITEM_MIN_PCT)
                    if (!r.back || items.length === 0) return null
                    return (
                      <div
                        className="flex items-center gap-1.5 flex-wrap"
                        title={`${r.back.sample} games with a recorded reset`}
                      >
                        <span className="text-[9px] font-jetbrains uppercase tracking-[0.14em] text-citrine/55">
                          reset {mmss(r.back.atSeconds)}
                        </span>
                        {items.map((it) => (
                          <span
                            key={it.id}
                            className="flex items-center gap-1 rounded-[3px] bg-citrine/[0.09] pl-[2px] pr-1.5 py-[1px]"
                          >
                            <img
                              src={`${cdnBaseUrl()}/img/item/${it.id}.png`}
                              alt=""
                              className="w-4 h-4 rounded-[2px]"
                              loading="lazy"
                            />
                            <span className="text-[9.5px] font-chakrapetch font-semibold tabular-nums text-citrine/85">
                              {Math.round(it.pct)}%
                            </span>
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                  </div>
                  <span className="text-[10px] font-jetbrains text-flash/35 tabular-nums shrink-0">{fmt(r.games)}</span>
                  <span className={cn("text-[11px] font-chakrapetch font-bold tabular-nums shrink-0 w-[46px] text-right", wrClass(r.winrate))}>
                    {r.winrate.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>
            <div className="text-[9px] font-chakrapetch text-flash/25 mt-3 leading-snug max-w-[70ch]">
              Reconstructed from minute-by-minute positions - Riot publishes no event for
              normal camps, so a route lists the camps the jungler was seen at, not every
              camp cleared. Green chips are the jungler's own half, red the enemy's; the
              side switch mirrors the same route onto the other half of the map. A
              reset line marks clears that end at the shop - the median time it
              happens and what gets bought there - which is why a short clear can
              be the plan rather than an interrupted one.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SkillOrderChart({ data }: { data: SkillOrder | null }) {
  const ready = !!data && data.sample >= 30
  return (
    <div>
      <SectionTitle hint={ready ? skillPriorityHint(data!.priority) : undefined}>Skill Order</SectionTitle>
      <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-3">
        {!ready ? (
          <div className="py-5 text-center">
            <div className="text-[10px] font-chakrapetch font-bold uppercase tracking-[0.18em] text-flash/40">Collecting data…</div>
            <div className="text-[9px] text-flash/25 mt-1 leading-relaxed">Builds up from new games{data && data.sample > 0 ? ` · ${data.sample}` : ""}.</div>
          </div>
        ) : (
          <div className="space-y-[3px]">
            {SKILL_ABILITIES.map((ab) => (
              <div key={ab.key} className="flex items-center gap-[2px]">
                <div className="w-[14px] shrink-0 text-center font-chakrapetch font-bold text-[10px] text-flash/45">{ab.key}</div>
                {Array.from({ length: 18 }, (_, i) => {
                  const lit = data!.perLevel[i] === ab.slot
                  return (
                    <div key={i} className="flex-1 aspect-square rounded-[2px]"
                      style={lit ? { background: "#00d992" } : { background: "rgba(215,216,217,0.05)" }}
                      title={lit ? `${ab.key} · level ${i + 1}` : undefined} />
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
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
  const { session } = useAuth()
  const navigate = useNavigate()
  const [showTutorial, setShowTutorial] = useState(false)

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

  // Deep stats (Performance + Laning) — separate endpoint, same cohort.
  const [statsData, setStatsData] = useState<StatsResp | null>(null)
  useEffect(() => {
    if (!champ?.key) return
    let cancelled = false
    setStatsData(null)
    fetch(`${BOX_API_BASE_URL}/api/champion/build-stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champKey: Number(champ.key), champion: champ.id, role: role ?? undefined, vs: vs?.slug ?? undefined, patch: patch ?? undefined, region: region ?? undefined }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StatsResp | null) => !cancelled && setStatsData(d))
      .catch(() => {})
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
        <aside className="flex flex-col gap-6 order-2 lg:order-1">
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
                        {ks && <img src={ks} alt="" className="w-8 h-8 rounded-full bg-filmdark/40" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />}
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

          <div className="flex-1 flex flex-col">
            <SectionTitle>Top Players</SectionTitle>
            <div className="flex-1 flex flex-col justify-center rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] overflow-hidden">
              {data.topPlayers.length === 0 && <div className="px-4 py-8 text-center text-[11px] text-flash/35">Not enough games yet</div>}
              {data.topPlayers.slice(0, 6).map((p, i) => (
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
        <section className="order-1 lg:order-2 flex flex-col">
          <SectionTitle
            hint={hasPrecise && page ? `${fmt(page.games)} games · ${page.winrate.toFixed(1)}% WR` : undefined}
            action={
              hasPrecise ? (
                // The page currently on screen, not the most played one — the
                // sidebar lets you pick a variant.
                <RuneImportButton champion={champ.name} patch={patch ?? patches[0] ?? null} page={page} />
              ) : undefined
            }
          >
            Runes
          </SectionTitle>
          {hasPrecise && page ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pageIdx}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <RunePageTree page={page} trees={trees} perkWr={perkWr} />
              </motion.div>
            </AnimatePresence>
          ) : (
            /* fallback: keystone-level (precise sample still building up) */
            <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
              {data.runes.slice(0, 2).map((r, i) => {
                const ks = getKeystoneIcon(r.keystone)
                const prim = getStyleIcon(r.primary)
                const sec = getStyleIcon(r.sub)
                return (
                  <div key={i} className={cn("flex items-center gap-3", i > 0 && "mt-3 pt-3 border-t border-flash/[0.05]")}>
                    {ks && <img src={ks} alt="" className={cn("rounded-full bg-filmdark/40", i === 0 ? "w-12 h-12" : "w-9 h-9")} onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />}
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
            <div className="mt-6 flex-1 flex flex-col">
              <SectionTitle
                hint={path.length > 0 ? "step by step" : "by priority"}
                action={
                  // The order on screen, runes included when the page is complete —
                  // one click saves the whole thing as your profile for this champion.
                  <BuildImportButton
                    champion={champ.name}
                    patch={patch ?? patches[0] ?? null}
                    items={
                      path.length > 0
                        ? buildPathSteps(path, data.items.boots[0], data.bootsSlot).map((s) => s.item)
                        : data.items.core.map((it) => it.item_id)
                    }
                    page={page}
                  />
                }
              >
                Build Path
              </SectionTitle>
              <div className="flex-1 flex flex-col justify-center rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
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
        <aside className="flex flex-col gap-6 order-3">
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

          <SkillOrderChart data={statsData?.skillOrder ?? null} />

          <div className="flex-1 flex flex-col">
            <SectionTitle>Items</SectionTitle>
            <div className="flex-1 rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 space-y-4">
              {(data.items.support?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Support Item</div>
                  <div className="flex items-start gap-2.5 flex-wrap">
                    {data.items.support!.map((s) => (
                      <div key={s.item_id} className="flex flex-col items-center gap-1 w-[40px]">
                        <ItemIcon id={s.item_id} size={34} names={names} />
                        <span className={cn("text-[10px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(s.winrate))}>{s.winrate.toFixed(1)}%</span>
                        {s.pickrate != null && <span className="text-[8px] text-flash/35 tabular-nums leading-none">{s.pickrate.toFixed(0)}% pick</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(data.items.jungle?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Jungle Item</div>
                  <div className="flex items-start gap-2.5 flex-wrap">
                    {data.items.jungle!.map((j) => (
                      <div key={j.item_id} className="flex flex-col items-center gap-1 w-[40px]">
                        <ItemIcon id={j.item_id} size={34} names={names} />
                        <span className={cn("text-[10px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(j.winrate))}>{j.winrate.toFixed(1)}%</span>
                        {j.pickrate != null && <span className="text-[8px] text-flash/35 tabular-nums leading-none">{j.pickrate.toFixed(0)}% pick</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.items.boots.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Boots</div>
                  <div className="flex items-start gap-2.5 flex-wrap">
                    {data.items.boots.map((b) => (
                      <div key={b.item_id} className="flex flex-col items-center gap-1 w-[40px]">
                        <ItemIcon id={b.item_id} size={34} names={names} />
                        <span className={cn("text-[10px] font-chakrapetch font-bold tabular-nums leading-none", wrClass(b.winrate))}>{b.winrate.toFixed(1)}%</span>
                        {b.pickrate != null && <span className="text-[8px] text-flash/35 tabular-nums leading-none">{b.pickrate.toFixed(0)}% pick</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data.items.situational.length > 0 && (
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Situational</div>
                  <div className="flex items-start gap-1.5 flex-wrap">
                    {data.items.situational.map((it) => (
                      <div key={it.item_id} className="flex flex-col items-center gap-0.5 w-[42px]">
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

      {/* ── Explorer "ad" — full-bleed banner, between the build & the deep stats ── */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 mt-8 h-[150px] sm:h-[170px] overflow-hidden">
        {/* fixed Katarina splash — banner art locked for every champion's Explorer ad.
            only a hair past cover (keeps her body in frame, not a face crop), panned right to bring her near-centre, focus high */}
        <div
          aria-hidden="true"
          className="absolute inset-0 select-none pointer-events-none bg-no-repeat"
          style={{
            backgroundImage: "url('https://cdn2.loldata.cc/img/champion/splash/Katarina_1.jpg')",
            backgroundSize: "120% auto",
            backgroundPosition: "100% 14%",
          }}
        />
        {/* horizontal scrim: solid brand on the left so the copy stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#040A0C] via-[#040A0C]/85 to-[#040A0C]/15" />
        {/* soft top + bottom shadow fades — melt the band into the page (no hard border) */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#040A0C] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#040A0C] to-transparent" />

        {/* content — re-aligned to the page column width (mirrors RootLayout) */}
        <div className="relative h-full mx-auto w-full xl:w-[65%] min-[2560px]:w-[55%] px-4 xl:px-0">
          <div className="flex h-full items-center justify-between gap-5">
            <div className="min-w-0">
              {/* eyebrow + FREE badge */}
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[10px] font-chakrapetch font-bold uppercase tracking-[0.3em] text-jade/80">The Explorer</span>
                <span className="inline-flex items-center rounded-full border border-jade/50 bg-jade/15 px-2.5 py-0.5 text-[10px] font-chakrapetch font-bold uppercase tracking-[0.2em] text-jade shadow-[0_0_18px_rgba(0,217,146,0.35)]">
                  100% Free
                </span>
              </div>
              <h3 className="font-chakrapetch font-bold uppercase tracking-[0.04em] leading-[0.95] text-xl sm:text-[28px] text-flash drop-shadow-[0_2px_14px_rgba(var(--c-shadow),0.85)]">
                Go deeper in the Explorer
              </h3>
              <p className="mt-1.5 hidden sm:block max-w-[46ch] text-[12px] sm:text-[13px] leading-relaxed text-flash/65 drop-shadow-[0_1px_10px_rgba(var(--c-shadow),0.9)]">
                Build custom {name} queries — ally &amp; enemy synergies, item win-rates and matchup splits.
                <span className="text-jade/85 font-semibold"> Completely free.</span>
              </p>
            </div>

            {/* buttons — "what's that?" tutorial (left) + the explorer redirect; items-stretch makes both the same height */}
            <div className="flex shrink-0 items-stretch gap-2">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="group inline-flex items-center justify-center gap-1.5 min-w-[176px] rounded-md bg-filmdark/40 px-4 py-2 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.16em] text-flash/70 backdrop-blur-sm shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)] transition-[color,box-shadow] hover:text-flash hover:shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.22)] cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5" /> What's that?
              </button>
              <button
                type="button"
                onClick={() => navigate(session ? "/learn/explorer" : "/login?redirect=/learn/explorer")}
                className={cn(
                  "group inline-flex items-center justify-center gap-2 min-w-[176px] shrink-0 rounded-md px-4 py-2 font-chakrapetch font-bold text-[11px] uppercase tracking-[0.16em] transition-colors cursor-pointer backdrop-blur-sm",
                  session
                    ? "bg-jade/20 text-jade border border-jade/40 hover:bg-jade/30 shadow-[0_0_24px_rgba(0,217,146,0.25)]"
                    : "bg-filmdark/40 text-flash/80 border border-flash/25 hover:text-flash hover:border-flash/40"
                )}
              >
                {session ? (
                  <>Open Explorer <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></>
                ) : (
                  <><Lock className="h-3.5 w-3.5" /> Login to access</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ExplorerTutorial
        open={showTutorial}
        champion={name}
        onClose={() => setShowTutorial(false)}
        onDive={() => navigate(session ? "/learn/explorer" : "/login?redirect=/learn/explorer")}
      />

      {/* ── Deep stats: Performance · Laning · Win Rate by Length ── */}
      {statsData?.stats && statsData.stats.games > 0 && (
        <div className="mt-8 space-y-4">
          <PerformanceSection s={statsData} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Stacked so the promo fills the run-off under Laning that the
                taller chart leaves beside it — space that was empty, not space
                taken from something the reader came for. */}
            <div className="space-y-4">
              <LaningSection s={statsData} vsName={vs?.name ?? statsData.vs} />
              <DesktopAppPromo champion={champ.name} />
            </div>
            {statsData.gameLength && <GameLengthChart data={statsData.gameLength} />}
          </div>
        </div>
      )}

      {data.junglePath && <JunglePathPanel data={data.junglePath} />}
    </div>
  )
}
