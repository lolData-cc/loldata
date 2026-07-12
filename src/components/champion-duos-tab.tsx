import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BOX_API_BASE_URL, cdnBaseUrl } from "@/config"
import { cn } from "@/lib/utils"

type Duo = { champion: string; games: number; winrate: number; lift: number }
type DuosResp = {
  duos: Duo[]
  primaryRole: string
  partnerRole: "UTILITY" | "BOTTOM" | null
  cohortGames: number
  patch: string
}

export function partnerWords(p: DuosResp["partnerRole"]) {
  if (p === "UTILITY") return { one: "Support", many: "Supports", q: "support" }
  if (p === "BOTTOM") return { one: "ADC", many: "ADC Carries", q: "ADC carry" }
  return { one: "Duo", many: "Duo Partners", q: "duo partner" }
}
function wrClass(wr: number) {
  if (wr >= 53) return "text-jade"
  if (wr >= 50.5) return "text-[#7bd9b0]"
  if (wr >= 49) return "text-flash/70"
  return "text-[#ff6286]"
}
const fmt = (n: number) => n.toLocaleString("en-US")

export default function ChampionDuosTab({ champ, patch }: { champ: { id: string; key: string; name: string }; patch: string }) {
  const [data, setData] = useState<DuosResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!champ?.key) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`${BOX_API_BASE_URL}/api/champion/duos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champKey: Number(champ.key), champion: champ.id }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load duos"))))
      .then((d: DuosResp) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message ?? "Error"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [champ?.key, champ?.id])

  const words = partnerWords(data?.partnerRole ?? null)
  const name = champ.name
  const top = data?.duos?.[0]
  const maxLift = Math.max(1, ...(data?.duos ?? []).map((d) => Math.abs(d.lift)))

  return (
    <div className="font-jetbrains text-flash">
      <style>{`@keyframes duoRow{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}`}</style>

      {/* section header */}
      <div className="mb-4">
        <h2 className="font-chakrapetch font-bold text-[20px] sm:text-[22px] leading-tight">
          Best {words.many} for <span className="text-jade">{name}</span>
        </h2>
        <p className="text-[12px] text-flash/45 mt-1">
          {data ? <span className="tabular-nums">{fmt(data.cohortGames)}</span> : "—"} games analyzed
          <span className="mx-2 text-flash/20">·</span>Patch {patch}
          <span className="mx-2 text-flash/20">·</span>ranked by confidence-weighted synergy
        </p>
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap items-center gap-2 mb-5 text-[10px] font-chakrapetch uppercase tracking-[0.14em]">
        {["Patch " + patch, "Emerald+", "Ranked Solo/Flex", "World"].map((c) => (
          <span key={c} className="px-2.5 py-1 rounded-[3px] border border-flash/10 bg-[rgba(255,255,255,0.02)] text-flash/45">{c}</span>
        ))}
      </div>

      <p className="text-[13px] leading-relaxed text-flash/50 mb-6 max-w-3xl">
        The strongest <strong className="text-flash/80">{words.q}s to duo with {name}</strong> this patch. Every pairing is
        scored by a <em className="text-jade/70 not-italic">confidence-weighted synergy</em> — a 5-game fluke can't outrank a
        partner proven over thousands of games — so the list reflects who genuinely makes {name} win more.
      </p>

      {/* ranked table */}
      <section className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] backdrop-blur-md overflow-hidden shadow-[0_20px_50px_-20px_rgba(var(--c-shadow),0.7)]">
        <div className="grid grid-cols-[34px_1fr_64px_52px] sm:grid-cols-[48px_1fr_150px_110px_84px] items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-flash/30 border-b border-flash/10 font-chakrapetch">
          <span className="text-center">#</span>
          <span>{words.one}</span>
          <span className="text-right sm:text-left">Win Rate</span>
          <span className="text-center">Syn</span>
          <span className="hidden sm:block text-right">Games</span>
        </div>

        {loading && (
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-[60px] border-b border-flash/[0.04] animate-pulse bg-flash/[0.012]" />
            ))}
          </div>
        )}
        {!loading && error && <div className="px-5 py-12 text-center text-[#ff6286]/80 text-sm">{error}</div>}

        {!loading && !error && data && (
          <div>
            {data.duos.map((d, i) => {
              const wrBar = Math.max(3, Math.min(100, ((d.winrate - 42) / 16) * 100))
              const synBar = Math.max(4, (Math.abs(d.lift) / maxLift) * 100)
              return (
                <Link
                  key={d.champion}
                  to={`/champions/${d.champion}/duos`}
                  className={cn(
                    "grid grid-cols-[34px_1fr_64px_52px] sm:grid-cols-[48px_1fr_150px_110px_84px] items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 border-b border-flash/[0.04] last:border-0 hover:bg-jade/[0.04] transition-colors group",
                    i === 0 && "bg-jade/[0.06]"
                  )}
                  style={{ animation: `duoRow .35s ease-out both`, animationDelay: `${Math.min(i, 14) * 22}ms` }}
                >
                  <span className="flex justify-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-[5px] text-[12px] font-chakrapetch font-bold tabular-nums",
                      i === 0 ? "bg-jade/15 text-jade ring-1 ring-jade/30" : i < 3 ? "text-flash/70" : "text-flash/35"
                    )}>{i + 1}</span>
                  </span>
                  <span className="flex items-center gap-3 min-w-0">
                    <img
                      src={`${cdnBaseUrl()}/img/champion/${d.champion}.png`}
                      alt={d.champion}
                      loading="lazy"
                      className={cn("rounded-md object-cover transition-all duration-200", i === 0 ? "w-11 h-11 ring-1 ring-jade/40" : "w-10 h-10 ring-1 ring-flash/10 group-hover:ring-jade/30")}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-flash/90 group-hover:text-flash font-medium leading-tight">{d.champion}</span>
                      {i === 0 && <span className="block text-[9px] font-chakrapetch uppercase tracking-[0.16em] text-jade/60 leading-tight mt-0.5">Best Duo</span>}
                    </span>
                  </span>
                  <span className="flex items-center gap-2.5 justify-end sm:justify-start">
                    <span className="hidden sm:block h-1.5 flex-1 rounded-full bg-filmdark/40 overflow-hidden">
                      <span className="block h-full rounded-full bg-gradient-to-r from-jade/50 to-jade" style={{ width: `${wrBar}%` }} />
                    </span>
                    <span className={cn("text-[13px] font-chakrapetch font-bold tabular-nums w-[44px] text-right", wrClass(d.winrate))}>{d.winrate.toFixed(1)}%</span>
                  </span>
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-1 w-10 rounded-full bg-filmdark/40 overflow-hidden hidden sm:block">
                      <span className="block h-full rounded-full bg-[#7bd9b0]/70" style={{ width: `${synBar}%` }} />
                    </span>
                    <span className={cn("text-[12px] font-chakrapetch font-bold tabular-nums", d.lift > 0 ? "text-jade" : "text-[#ff6286]")}>
                      {d.lift > 0 ? "+" : ""}{d.lift.toFixed(1)}
                    </span>
                  </span>
                  <span className="hidden sm:block text-right text-[12px] text-flash/45 tabular-nums">{fmt(d.games)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <p className="text-[11px] text-flash/30 mt-3 leading-relaxed max-w-3xl">
        <span className="text-jade/50 font-chakrapetch uppercase tracking-[0.14em]">Synergy</span> = win-rate points the pairing
        adds over {name}'s baseline, shrunk toward that baseline by sample size (Bayesian) so small samples can't dominate.
      </p>

      {top && (
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[13px] font-chakrapetch font-bold uppercase tracking-[0.18em] text-flash/80">FAQ</h3>
            <span className="h-px flex-1 bg-gradient-to-r from-jade/20 to-transparent" />
          </div>
          <div className="rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.4)] p-5">
            <h4 className="text-[13px] text-flash/85 font-medium">Who is the best {words.q} for {name}?</h4>
            <p className="text-[12px] text-flash/55 mt-1.5 leading-relaxed">
              <strong className="text-flash/85">{top.champion}</strong> is currently the best {words.q} for {name}, with a{" "}
              <span className={wrClass(top.winrate)}>{top.winrate.toFixed(1)}%</span> win rate over {fmt(top.games)} games on Patch {patch}.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
