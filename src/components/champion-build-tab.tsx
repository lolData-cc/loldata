import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BOX_API_BASE_URL, cdnBaseUrl, summonerSpellUrl } from "@/config"
import { getKeystoneIcon, getStyleIcon, getKeystoneName } from "@/constants/runes"
import { cn } from "@/lib/utils"

type Item = { item_id: number; winrate: number; pick_rate?: number; games?: number; total_games?: number }
type Rune = { keystone: number; primary: number; sub: number; winrate: number; pickrate: number | null; games: number }
type Spell = { spell1: number; spell2: number; winrate: number; pickrate: number | null; games: number }
type Player = { name: string; tag: string; games: number; winrate: number }
type BuildResp = {
  role: string | null
  core: { winrate: number; pickrate: number; banrate: number | null; games: number; kda?: { kills: number; deaths: number; assists: number }; avgGold?: number; avgDamage?: number } | null
  runes: Rune[]
  spells: Spell[]
  items: { boots: Item[]; core: Item[]; situational: Item[] }
  topPlayers: Player[]
}

const fmt = (n: number) => n.toLocaleString("en-US")
function wrClass(wr: number) {
  if (wr >= 53) return "text-jade"
  if (wr >= 50.5) return "text-[#7bd9b0]"
  if (wr >= 49) return "text-flash/70"
  return "text-[#ff6286]"
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <h3 className="text-[11px] font-chakrapetch font-bold uppercase tracking-[0.22em] text-jade/70 whitespace-nowrap">{children}</h3>
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

export default function ChampionBuildTab({ champ, patch }: { champ: { id: string; key: string; name: string }; patch: string }) {
  const [data, setData] = useState<BuildResp | null>(null)
  const [names, setNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (!champ?.key) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${BOX_API_BASE_URL}/api/champion/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champKey: Number(champ.key), champion: champ.id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load build"))))
      .then((d: BuildResp) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [champ?.key, champ?.id])

  const name = champ.name
  const bestRune = data?.runes?.[0]
  const bestSpells = data?.spells?.[0]
  const core = data?.items?.core ?? []
  const region = useMemo(() => "euw", []) // top-player links default region

  if (loading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-lg bg-flash/[0.015] animate-pulse" />)}
      </div>
    )
  if (error || !data) return <div className="px-4 py-12 text-center text-[#ff6286]/80 text-sm">{error ?? "No build data"}</div>

  return (
    <div className="font-jetbrains text-flash">
      <style>{`@keyframes bIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}`}</style>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* ── MAIN: runes/spells + items ── */}
        <div className="space-y-7">
          {/* RUNES & SPELLS */}
          <section>
            <SectionTitle>Best Runes &amp; Spells</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
              {/* runes */}
              <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
                {data.runes.slice(0, 2).map((r, i) => {
                  const ks = getKeystoneIcon(r.keystone)
                  const prim = getStyleIcon(r.primary)
                  const sec = getStyleIcon(r.sub)
                  return (
                    <div key={i} className={cn("flex items-center gap-3", i > 0 && "mt-3 pt-3 border-t border-flash/[0.05]")}>
                      {ks && <img src={ks} alt="" className={cn("rounded-full bg-black/40", i === 0 ? "w-12 h-12" : "w-9 h-9")} onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />}
                      <div className="min-w-0 flex-1">
                        <div className={cn("font-chakrapetch font-bold truncate", i === 0 ? "text-[14px] text-flash/90" : "text-[12px] text-flash/60")}>
                          {getKeystoneName(r.keystone) ?? `Keystone ${r.keystone}`}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {prim && <img src={prim} alt="" className="w-4 h-4" />}
                          <span className="text-flash/20 text-[10px]">+</span>
                          {sec && <img src={sec} alt="" className="w-4 h-4 opacity-80" />}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn("font-chakrapetch font-bold tabular-nums", i === 0 ? "text-[15px]" : "text-[12px]", wrClass(r.winrate))}>{r.winrate.toFixed(1)}%</div>
                        {r.pickrate != null && <div className="text-[9px] text-flash/35 tabular-nums">{r.pickrate.toFixed(1)}% pick</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* spells */}
              <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 flex flex-col items-center justify-center min-w-[130px]">
                <span className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2">Spells</span>
                {bestSpells && (
                  <>
                    <div className="flex items-center gap-2">
                      <img src={summonerSpellUrl(bestSpells.spell1)} alt="" className="w-9 h-9 rounded-md ring-1 ring-flash/10" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />
                      <img src={summonerSpellUrl(bestSpells.spell2)} alt="" className="w-9 h-9 rounded-md ring-1 ring-flash/10" onError={(e) => { e.currentTarget.style.opacity = "0.2" }} />
                    </div>
                    <div className={cn("mt-2 font-chakrapetch font-bold text-[14px] tabular-nums", wrClass(bestSpells.winrate))}>{bestSpells.winrate.toFixed(1)}%</div>
                    {bestSpells.pickrate != null && <div className="text-[9px] text-flash/35 tabular-nums">{bestSpells.pickrate.toFixed(1)}% pick</div>}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* CORE BUILD */}
          <section>
            <SectionTitle>Core Build · by build priority</SectionTitle>
            <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
              {/* boots */}
              {data.items.boots.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch w-14 shrink-0">Boots</span>
                  <div className="flex items-center gap-2">
                    {data.items.boots.map((b) => <ItemIcon key={b.item_id} id={b.item_id} size={38} names={names} />)}
                  </div>
                </div>
              )}
              {/* core items as ordered path */}
              <div className="flex items-center gap-3">
                <span className="text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch w-14 shrink-0">Core</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {core.map((it, i) => (
                    <div key={it.item_id} className="flex items-center" style={{ animation: "bIn .3s ease-out both", animationDelay: `${i * 40}ms` }}>
                      <div className="flex flex-col items-center gap-1">
                        <ItemIcon id={it.item_id} size={48} names={names} />
                        <span className={cn("text-[10px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate))}>{it.winrate.toFixed(1)}%</span>
                      </div>
                      {i < core.length - 1 && <span className="text-flash/20 mx-1 text-[14px]">›</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* SITUATIONAL */}
          {data.items.situational.length > 0 && (
            <section>
              <SectionTitle>Situational Items</SectionTitle>
              <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  {data.items.situational.map((it) => (
                    <div key={it.item_id} className="flex flex-col items-center gap-1 w-[56px]">
                      <ItemIcon id={it.item_id} size={42} names={names} />
                      <span className={cn("text-[10px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate))}>{it.winrate.toFixed(1)}%</span>
                      <span className="text-[8px] text-flash/35 text-center leading-tight truncate w-full">{names[it.item_id] ?? ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── SIDEBAR: top players ── */}
        <aside>
          <SectionTitle>Top {name} Players</SectionTitle>
          <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] overflow-hidden">
            {data.topPlayers.length === 0 && <div className="px-4 py-8 text-center text-[11px] text-flash/35">Not enough games yet</div>}
            {data.topPlayers.map((p, i) => (
              <Link
                key={`${p.name}-${p.tag}-${i}`}
                to={`/summoners/${region}/${encodeURIComponent(p.name.replace(/\s+/g, "+"))}-${p.tag}`}
                className="flex items-center gap-2.5 px-3 py-2 border-b border-flash/[0.04] last:border-0 hover:bg-jade/[0.04] transition-colors group"
              >
                <span className={cn("w-5 text-center text-[12px] font-chakrapetch font-bold tabular-nums", i === 0 ? "text-jade" : "text-flash/35")}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] text-flash/85 group-hover:text-flash leading-tight">{p.name}</div>
                  <div className="truncate text-[9px] text-flash/30 leading-tight">#{p.tag}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={cn("text-[12px] font-chakrapetch font-bold tabular-nums", wrClass(p.winrate))}>{p.winrate.toFixed(0)}%</div>
                  <div className="text-[9px] text-flash/30 tabular-nums">{fmt(p.games)}g</div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
