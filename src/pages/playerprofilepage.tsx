// PlayerProfilePage — the unified pro/streamer "map" page (/players/<slug>).
// One hub for a talent: identity + socials, every linked LoL account on its own
// rank-progression ladder, and the champions they play most across all accounts.
// Data: GET /api/players/:slug (box). Inspired by deeplol's pro page, in loldata's
// glass/cyber language.

import { Fragment, useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { TeamLogo } from "@/components/teamlogo"
import { cn } from "@/lib/utils"
import { BOX_API_BASE_URL, cdnBaseUrl, normalizeChampName, champDisplayName } from "@/config"
import { getRankImage } from "@/utils/rankIcons"

const EASE = [0.22, 1, 0.36, 1] as const

// ── types (match /api/players/:slug) ──
type Account = {
  nametag: string; region: string
  tier: string | null; division: string | null; lp: number | null
  wins: number; losses: number; puuid: string | null; lastGameMs: number | null
}
type Profile = {
  type: "pro" | "streamer"; slug: string; name: string; nickname: string | null
  realName: string | null; team: string | null; teamLogo: string | null
  nationality: string | null; avatar: string | null; isLive: boolean
  socials: { twitter: string | null; youtube: string | null; twitch: string | null }
  accounts: Account[]
  topChampions: { championName: string; games: number; wins: number }[]
  cutoffs?: Record<string, Cutoff>
}
type Cutoff = { gm_cutoff: number | null; challenger_cutoff: number | null; challenger_max: number | null }

// ── rank metadata ──
const RANK_ORDER = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"]
const RANK_COLOR: Record<string, string> = {
  IRON: "#7d7d86", BRONZE: "#b06a3b", SILVER: "#9aa6b4", GOLD: "#e6b84a",
  PLATINUM: "#3fb6a8", EMERALD: "#27c26b", DIAMOND: "#4f8ff7",
  MASTER: "#c061e8", GRANDMASTER: "#e0444e", CHALLENGER: "#f0c14b",
}
const DIVS = ["IV", "III", "II", "I"]
const APEX = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"])
const NEXT_LETTER: Record<string, string> = { IRON: "B", BRONZE: "S", SILVER: "G", GOLD: "P", PLATINUM: "E", EMERALD: "D", DIAMOND: "M" }

const cap = (s: string) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : s)
function rankScore(a: Account): number {
  if (!a.tier) return -1
  const ti = RANK_ORDER.indexOf(a.tier)
  const di = a.division ? DIVS.indexOf(a.division) : 0
  return ti * 100000 + di * 10000 + (a.lp ?? 0)
}
function timeAgo(ms: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`
  const h = Math.floor(s / 3600); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function summonerHref(nametag: string, region: string): string {
  const [name, tag = ""] = nametag.split("#")
  return `/summoners/${(region || "euw").toLowerCase()}/${encodeURIComponent(name.replace(/\s+/g, "+"))}-${encodeURIComponent(tag)}`
}

// ── the signature rank ladder (deeplol-style, cyber) ──
function RankLadder({ tier, division, lp, cutoffs }: { tier: string; division: string | null; lp: number | null; cutoffs?: Cutoff }) {
  const color = RANK_COLOR[tier] ?? "#00d992"
  if (APEX.has(tier)) {
    // Progress toward the NEXT rank, using the nightly cutoffs:
    //  Master → GM cutoff · GM → Challenger cutoff · Challenger → #1 (challenger_max)
    let base = 0, goal = 0, goalLabel = ""
    if (tier === "MASTER") { base = 0; goal = cutoffs?.gm_cutoff ?? 0; goalLabel = "GM" }
    else if (tier === "GRANDMASTER") { base = cutoffs?.gm_cutoff ?? 0; goal = cutoffs?.challenger_cutoff ?? 0; goalLabel = "Chall" }
    else { base = cutoffs?.challenger_cutoff ?? 0; goal = cutoffs?.challenger_max ?? 0; goalLabel = "#1" }
    const pct = goal > base ? Math.max(0, Math.min(100, Math.round((((lp ?? 0) - base) / (goal - base)) * 100))) : null

    if (pct === null) {
      // cutoffs not loaded → simple lit bar fallback
      return (
        <div className="flex items-center gap-3">
          <div className="h-[3px] flex-1 rounded-full bg-flash/10 overflow-hidden">
            <div className="h-full w-full rounded-full" style={{ background: `linear-gradient(90deg, ${color}44, ${color})`, boxShadow: `0 0 12px ${color}77` }} />
          </div>
          <span className="shrink-0 font-chakrapetch text-[12px] font-bold tabular-nums" style={{ color }}>{lp ?? 0} LP</span>
        </div>
      )
    }
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between font-jetbrains text-[9px] uppercase tracking-[0.1em]">
          <span className="font-bold" style={{ color }}>{cap(tier)} · {lp ?? 0} LP</span>
          <span className="text-flash/40"><span className="font-bold" style={{ color }}>{pct}%</span> to {goalLabel}</span>
        </div>
        <div className="relative h-[6px] rounded-full bg-flash/10">
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: `linear-gradient(90deg, ${color}44, ${color})`, boxShadow: `0 0 10px ${color}55` }} />
          <div className="absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-liquirice" style={{ left: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }} />
        </div>
      </div>
    )
  }
  const curIdx = Math.max(0, DIVS.indexOf(division ?? "IV"))
  const nodes = [
    ...DIVS.map((d, i) => ({ label: d, state: i < curIdx ? "passed" : i === curIdx ? "current" : "ahead" })),
    { label: NEXT_LETTER[tier] ?? "▲", state: "ahead" as const },
  ]
  return (
    <div className="flex items-center px-1">
      {nodes.map((n, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <div className="h-[2px] flex-1" style={{ background: i <= curIdx ? color : "rgba(215,216,217,0.12)", boxShadow: i <= curIdx ? `0 0 6px ${color}66` : "none" }} />
          )}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <span
              className={cn("grid place-items-center rounded-full transition-all duration-300", n.state === "current" ? "h-[15px] w-[15px]" : "h-[9px] w-[9px]")}
              style={{
                background: n.state === "ahead" ? "transparent" : color,
                border: n.state === "ahead" ? "1.5px solid rgba(215,216,217,0.2)" : "none",
                boxShadow: n.state === "current" ? `0 0 0 3px ${color}33, 0 0 12px ${color}` : n.state === "passed" ? `0 0 6px ${color}88` : "none",
              }}
            />
            <span
              className={cn("font-chakrapetch text-[9px] tracking-wide leading-none", n.state === "current" ? "font-bold" : "font-light")}
              style={{ color: n.state === "ahead" ? "rgba(215,216,217,0.3)" : n.state === "current" ? color : "rgba(215,216,217,0.55)" }}
            >
              {n.label}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  )
}

function RegionPill({ region }: { region: string }) {
  return (
    <span className="shrink-0 rounded-[3px] border border-jade/20 bg-jade/[0.06] px-1.5 py-[2px] font-chakrapetch text-[9px] font-bold uppercase tracking-[0.1em] text-jade/70">
      {region}
    </span>
  )
}

function AccountRow({ a, idx, cutoffsMap }: { a: Account; idx: number; cutoffsMap?: Record<string, Cutoff> }) {
  const [name, tag] = a.nametag.split("#")
  const color = a.tier ? RANK_COLOR[a.tier] ?? "#00d992" : "#6b7280"
  const total = a.wins + a.losses
  const wr = total ? Math.round((a.wins / total) * 100) : 0
  const rankLabel = a.tier ? `${cap(a.tier)}${a.division && !APEX.has(a.tier) ? " " + a.division : ""}` : "Unranked"
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: Math.min(idx * 0.05, 0.4) }}
      className="relative overflow-hidden rounded-md border border-flash/[0.07] bg-black/25 px-4 py-3 backdrop-blur-lg transition-colors hover:border-jade/20"
    >
      <span className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: `${color}88` }} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <RegionPill region={a.region} />
          <Link to={summonerHref(a.nametag, a.region)} className="truncate font-chakrapetch text-[14px] font-bold text-flash/90 transition-colors hover:text-jade cursor-clicker">
            {name}
            <span className="text-flash/30">#{tag}</span>
          </Link>
          {a.lastGameMs && <span className="hidden shrink-0 font-jetbrains text-[10px] text-flash/30 sm:inline">{timeAgo(a.lastGameMs)}</span>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <img src={getRankImage(a.tier ?? "unranked")} alt="" className="h-8 w-8 object-contain" onError={(e) => { e.currentTarget.style.visibility = "hidden" }} />
            <div className="font-chakrapetch text-[14px] font-bold leading-none" style={{ color }}>{rankLabel}</div>
          </div>
          {a.tier ? (
            <div className="flex items-center gap-2 font-jetbrains text-[10.5px] leading-none tabular-nums">
              <span className="font-semibold text-flash/80">{a.lp ?? 0}<span className="ml-0.5 font-normal text-flash/35">LP</span></span>
              <span className="h-2.5 w-px bg-flash/15" />
              <span className={cn("font-semibold", wr >= 50 ? "text-jade" : "text-[#ff6286]")}>{wr}%<span className="ml-0.5 font-normal text-flash/35">WR</span></span>
              <span className="h-2.5 w-px bg-flash/15" />
              <span><span className="text-jade/80">{a.wins}W</span> <span className="text-[#ff6286]/80">{a.losses}L</span></span>
            </div>
          ) : (
            <div className="font-jetbrains text-[10.5px] text-flash/35">Unranked</div>
          )}
        </div>
      </div>
      {a.tier && (
        <div className="mt-3">
          <RankLadder tier={a.tier} division={a.division} lp={a.lp} cutoffs={cutoffsMap?.[a.region]} />
        </div>
      )}
    </motion.div>
  )
}

function SocialIcons({ socials }: { socials: Profile["socials"] }) {
  const items = [
    socials.twitter && { href: socials.twitter, label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
    socials.youtube && { href: socials.youtube, label: "YT", path: "M23.498 6.186a3.02 3.02 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.02 3.02 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.02 3.02 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.02 3.02 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814M9.546 15.568V8.432L15.818 12z" },
    socials.twitch && { href: socials.twitch, label: "TW", path: "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0 1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" },
  ].filter(Boolean) as { href: string; label: string; path: string }[]
  if (!items.length) return null
  return (
    <div className="flex items-center gap-2">
      {items.map((it) => (
        <a key={it.label} href={it.href} target="_blank" rel="noreferrer"
          className="grid h-8 w-8 place-items-center rounded-[6px] border border-flash/10 bg-flash/[0.04] text-flash/55 transition-all duration-200 hover:border-jade/30 hover:bg-jade/[0.08] hover:text-jade cursor-clicker">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={it.path} /></svg>
        </a>
      ))}
    </div>
  )
}

function TopChampions({ champs }: { champs: Profile["topChampions"] }) {
  if (!champs.length) return null
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {champs.map((c, i) => {
        const total = c.games || 1
        const wr = Math.round((c.wins / total) * 100)
        return (
          <motion.div
            key={c.championName + i}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE, delay: Math.min(i * 0.04, 0.4) }}
            className="flex items-center gap-2.5 rounded-md border border-flash/[0.07] bg-black/25 px-3 py-2.5 backdrop-blur-lg"
          >
            <img
              src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(c.championName)}.png`}
              alt=""
              className="h-10 w-10 shrink-0 rounded-[4px] object-cover ring-1 ring-flash/10"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.visibility = "hidden" }}
            />
            <div className="min-w-0">
              <div className="truncate font-chakrapetch text-[12px] font-semibold text-flash/85">{champDisplayName(c.championName)}</div>
              <div className="font-jetbrains text-[10px] text-flash/45 tabular-nums">
                {c.games} games · <span className={wr >= 50 ? "text-jade/75" : "text-[#ff6286]/70"}>{wr}%</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="relative inline-grid h-3.5 w-3.5 place-items-center">
        <span className="absolute inset-0 rotate-45 rounded-[2px] border border-jade/45 bg-jade/[0.08]" />
        <span className="absolute h-1 w-1 rounded-full bg-jade" />
      </span>
      <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.28em] text-jade/70">{children}</span>
    </div>
  )
}

export default function PlayerProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<Profile | null>(null)
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading")

  useEffect(() => {
    if (!slug) return
    let alive = true
    setState("loading"); setData(null)
    fetch(`${BOX_API_BASE_URL}/api/players/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        if (r.status === 404) { if (alive) setState("notfound"); return }
        if (!r.ok) throw new Error(String(r.status))
        const d = (await r.json()) as Profile
        if (!alive) return
        d.accounts = [...(d.accounts ?? [])].sort((a, b) => rankScore(b) - rankScore(a))
        setData(d); setState("ok")
      })
      .catch(() => alive && setState("error"))
    return () => { alive = false }
  }, [slug])

  useEffect(() => {
    document.title = data ? `${data.name} - lolData` : "Player - lolData"
    return () => { document.title = "lolData" }
  }, [data])

  return (
    <div className="relative w-full pb-24 pt-3">
      {/* ambient stage light — fixed to the viewport top + behind the (transparent)
          navbar so the glow bleeds up THROUGH the header, not just below it. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[700px] overflow-hidden">
        {/* broad, very soft green wash — diffuse, not a hotspot */}
        <div className="absolute left-1/2 top-[-200px] h-[680px] w-[1360px] -translate-x-1/2 rounded-[50%]" style={{ background: "radial-gradient(ellipse at center, rgba(0,217,146,0.15), rgba(0,217,146,0) 72%)", filter: "blur(64px)" }} />
        {/* cyan + purple colour suffusion: large, heavily blurred, low opacity, pulled inward so the hues blend */}
        <div className="absolute left-[16%] top-[-50px] h-80 w-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,184,255,0.13), transparent 72%)", filter: "blur(72px)" }} />
        <div className="absolute right-[14%] top-[-70px] h-[26rem] w-[26rem] rounded-full" style={{ background: "radial-gradient(circle, rgba(123,66,161,0.12), transparent 72%)", filter: "blur(82px)" }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(215,216,217,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(215,216,217,0.7) 1px, transparent 1px)", backgroundSize: "46px 46px", WebkitMaskImage: "linear-gradient(to bottom, black, transparent 82%)", maskImage: "linear-gradient(to bottom, black, transparent 82%)" }} />
      </div>

      <div className="relative z-[1] mx-auto w-full max-w-[1080px] px-3 lg:px-0">
        {state === "loading" && (
          <div className="flex flex-col gap-4">
            <div className="h-[180px] animate-pulse rounded-lg bg-black/30" />
            <div className="h-6 w-40 animate-pulse rounded bg-black/30" />
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse rounded-md bg-black/20" />)}
          </div>
        )}

        {(state === "notfound" || state === "error") && (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <span className="font-chakrapetch text-[13px] uppercase tracking-[0.25em] text-jade/50">{state === "notfound" ? "// not found" : "// error"}</span>
            <p className="font-chakrapetch text-flash/60">{state === "notfound" ? "No pro or streamer matches this page." : "Couldn't load this profile right now."}</p>
            <Link to="/streamers" className="font-chakrapetch text-[13px] text-jade/80 underline decoration-jade/30 underline-offset-4 hover:text-jade cursor-clicker">Browse streamers</Link>
          </div>
        )}

        {state === "ok" && data && (
          <>
            {/* ── HERO ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
              className="relative overflow-hidden rounded-lg border border-flash/[0.08] bg-black/30 backdrop-blur-xl"
            >
              {/* blurred avatar backdrop */}
              {data.avatar && (
                <div className="pointer-events-none absolute inset-0 opacity-30">
                  <img src={data.avatar} alt="" className="h-full w-full scale-110 object-cover blur-2xl saturate-150" />
                  <div className="absolute inset-0 bg-gradient-to-r from-liquirice via-liquirice/80 to-liquirice/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-liquirice to-transparent" />
                </div>
              )}
              <div className="relative flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-end sm:p-7">
                {/* avatar */}
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-xl bg-jade/20 blur-md" />
                  {data.avatar ? (
                    <img src={data.avatar} alt="" className="relative h-[116px] w-[116px] rounded-xl object-cover ring-2 ring-jade/30 shadow-[0_8px_30px_rgba(0,0,0,0.55)]" />
                  ) : (
                    <div className="relative grid h-[116px] w-[116px] place-items-center rounded-xl bg-black/50 ring-2 ring-jade/20">
                      <span className="font-chakrapetch text-3xl font-black text-jade/40">{data.name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  {data.type === "streamer" && data.isLive && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#ff3b5c] px-2 py-[2px] font-chakrapetch text-[9px] font-black uppercase tracking-wider text-white shadow-[0_0_12px_rgba(255,59,92,0.7)]">● Live</span>
                  )}
                </div>

                {/* identity */}
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
                  {/* team / type eyebrow */}
                  <div className="flex items-center gap-2">
                    {data.type === "pro" && data.team ? (
                      <span className="flex items-center gap-1.5">
                        {data.teamLogo && <TeamLogo src={data.teamLogo} className="h-4 w-4 object-contain" />}
                        <span className="font-chakrapetch text-[12px] font-semibold uppercase tracking-[0.12em] text-jade/75">{data.team}</span>
                      </span>
                    ) : (
                      <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.2em] text-flash/35">{data.type === "pro" ? "Pro Player" : "Streamer"}</span>
                    )}
                  </div>

                  {/* name + badge */}
                  <div className="flex items-center gap-2.5">
                    <h1 className="font-chakrapetch text-[34px] font-black leading-none tracking-tight text-flash">{data.name}</h1>
                    <span
                      className="rounded-[4px] px-1.5 py-[3px] font-chakrapetch text-[9px] font-black tracking-wide"
                      style={data.type === "pro"
                        ? { background: "linear-gradient(135deg, #00d992, #00b8ff)", color: "#040A0C" }
                        : { background: "linear-gradient(135deg, #7b42a1, #a855c7)", color: "#e0d0f0" }}
                    >
                      {data.type === "pro" ? "PRO" : "STRM"}
                    </span>
                  </div>

                  {/* meta */}
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-start">
                    {data.realName && <span className="font-jetbrains text-[12px] text-flash/55">{data.realName}</span>}
                    {data.nationality && <><span className="text-flash/15">·</span><span className="font-jetbrains text-[11px] uppercase tracking-wide text-flash/40">{data.nationality}</span></>}
                    {data.accounts.length > 0 && <><span className="text-flash/15">·</span><span className="font-jetbrains text-[11px] text-flash/40">{data.accounts.length} account{data.accounts.length > 1 ? "s" : ""}</span></>}
                  </div>

                  {/* socials */}
                  <div className="mt-1.5"><SocialIcons socials={data.socials} /></div>
                </div>
              </div>
            </motion.div>

            {/* ── ACCOUNTS ── */}
            <div className="mt-8">
              <SectionLabel>Accounts</SectionLabel>
              {data.accounts.length === 0 ? (
                <p className="font-jetbrains text-sm text-flash/30">No linked accounts yet.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {data.accounts.map((a, i) => <AccountRow key={a.nametag + i} a={a} idx={i} cutoffsMap={data.cutoffs} />)}
                </div>
              )}
            </div>

            {/* ── TOP CHAMPIONS ── */}
            {data.topChampions.length > 0 && (
              <div className="mt-8">
                <SectionLabel>Top Champions</SectionLabel>
                <TopChampions champs={data.topChampions} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
