// /champions — the champion index.
//
// This route used to render a radial selector demo: 94 characters of text, no
// links and no SEO tags. That left the site with NO crawlable path to any
// champion page, so none of them could be discovered, let alone indexed. The
// demo still lives in src/pages/championpage.tsx if it wants a home.
//
// The one hard requirement here is that every champion is a real <a href> that
// is present in the DOM without interaction. The filter narrows what is shown,
// it never removes links from the initial render.
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Search } from "lucide-react"
import { useChampions } from "@/hooks/useChampions"
import { useSeo } from "@/hooks/useSeo"
import { cdnBaseUrl } from "@/config"
import { cn } from "@/lib/utils"

export default function ChampionsIndexPage() {
  const { champions, loading } = useChampions()
  const [q, setQ] = useState("")

  useSeo({
    title: "All League of Legends Champions — Builds, Runes & Counters | lolData",
    description:
      "Every League of Legends champion, with the best builds, runes, items, duos and counters for the current patch, from millions of ranked games.",
    canonical: "/champions",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "League of Legends Champions",
      url: "https://loldata.cc/champions",
    },
  })

  const term = q.trim().toLowerCase()
  const shown = useMemo(
    () => (term ? champions.filter((c) => c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term)) : champions),
    [champions, term]
  )

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10">
      <header className="mb-7">
        <h1 className="font-chakrapetch text-[30px] font-bold tracking-[0.02em] text-flash">
          Champions
        </h1>
        <p className="mt-2 max-w-[70ch] font-chakrapetch text-[13px] leading-relaxed text-flash/45">
          Every champion in League of Legends. Open one for its best build, runes and
          items, the duos it performs with, the matchups that beat it, and the players
          who one-trick it — all computed from millions of ranked games.
        </p>
      </header>

      <div className="relative mb-6 max-w-[320px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-flash/25" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="FILTER CHAMPIONS"
          aria-label="Filter champions"
          className={cn(
            "h-9 w-full rounded-[3px] bg-liquirice pl-9 pr-3",
            "border border-jade/20 focus:border-jade/50 focus:outline-none",
            "font-jetbrains text-[10px] uppercase tracking-[0.16em] text-flash/80 placeholder:text-flash/25",
            "transition-colors duration-200"
          )}
        />
      </div>

      {loading && champions.length === 0 ? (
        <p className="font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/30">Loading roster…</p>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {shown.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/champions/${c.slug}`}
                  className={cn(
                    "group flex flex-col items-center gap-1.5 rounded-[3px] p-2",
                    "bg-flash/[0.02] hover:bg-jade/[0.07] transition-colors duration-200"
                  )}
                >
                  <img
                    src={`${cdnBaseUrl()}/img/champion/${c.slug}.png`}
                    alt=""
                    width={56}
                    height={56}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 rounded-[3px] ring-1 ring-jade/15 transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="w-full truncate text-center font-chakrapetch text-[11px] font-semibold text-flash/70 group-hover:text-jade">
                    {c.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {term && shown.length === 0 && (
            <p className="mt-6 font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/30">
              No champion matches “{q}”.
            </p>
          )}
        </>
      )}
    </div>
  )
}
