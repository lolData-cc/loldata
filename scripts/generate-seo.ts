/**
 * Post-build SEO pass. Runs after `vite build`, against dist/.
 *
 * Two jobs:
 *
 *  1. sitemap.xml — the site had none. /sitemap.xml answered 200 with the SPA
 *     shell (byte-identical to every other route), so Google was reading HTML
 *     where XML should be and had no URL list at all.
 *
 *  2. Prerendered HTML per champion route. The app is client-rendered with no
 *     SSR, so the document a crawler gets on its first pass carried the generic
 *     "lolData" title, the site-wide description, and a canonical pointing at
 *     the HOME PAGE for every URL — which tells Google every page is a
 *     duplicate of the home page. This writes a real document per route, with
 *     the right head and an accurate, crawlable content block.
 *
 * The body block sits inside #root. React mounts with createRoot().render(),
 * which CLEARS the container, so it is replaced the moment the app boots — no
 * hydration mismatch, and nothing a user ever sees. It exists so the page has
 * indexable text and outbound links before any JavaScript runs.
 *
 * Titles and descriptions come from src/lib/championSeo.ts, the same module the
 * page uses at runtime, so the two passes cannot drift apart.
 *
 * Degrades on purpose: if the CDN is unreachable this still writes a sitemap of
 * the static routes and skips prerendering, rather than failing the deploy.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import {
  championPath,
  championSeo,
  INDEXABLE_TABS,
  TAB_LABEL,
  CHAMPION_TABS,
  type ChampionTab,
} from "../src/lib/championSeo"

const SITE = "https://loldata.cc"
const DIST = "dist"
const CDN = "https://cdn2.loldata.cc"
const FALLBACK_PATCH = "16.16.1"

type Champ = { id: string; name: string; title: string; tags: string[]; blurb: string }

/** Routes that are not champion pages. Everything here is public and stable;
 *  private surfaces (dashboard, auth, billing, overlay, scout) are excluded
 *  here AND disallowed in public/robots.txt.
 *
 *  A title/description pair means "prerender this one too". Pages that do not
 *  call useSeo keep whatever the document ships with, so baking a real title
 *  is a straight win for them; pages that DO call it are left alone here and
 *  handled by the champion pass, which shares the runtime's strings. */
const STATIC_ROUTES: {
  path: string
  changefreq: string
  priority: string
  title?: string
  description?: string
}[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/champions", changefreq: "weekly", priority: "0.9" },
  {
    path: "/tierlist",
    changefreq: "daily",
    priority: "0.9",
    title: "League of Legends Tier List — Best Champions by Role | lolData",
    description:
      "The current League of Legends tier list, by role and region, ranked on win rate and pick rate from millions of ranked games.",
  },
  {
    path: "/leaderboards",
    changefreq: "daily",
    priority: "0.7",
    title: "Leaderboards — Highest Ranked Players | lolData",
    description:
      "The highest ranked League of Legends players, with LP, win rate and their most played champions.",
  },
  {
    path: "/patch-notes",
    changefreq: "weekly",
    priority: "0.7",
    title: "League of Legends Patch Notes — Champion & Item Changes | lolData",
    description:
      "What changed in the latest League of Legends patch: champion buffs and nerfs, item and rune changes.",
  },
  {
    path: "/learn",
    changefreq: "weekly",
    priority: "0.6",
    title: "Learn — Improve at League of Legends | lolData",
    description: "Personalised lessons and drills built from your own ranked games.",
  },
  { path: "/streamers", changefreq: "weekly", priority: "0.5" },
  { path: "/pricing", changefreq: "monthly", priority: "0.5" },
  { path: "/status", changefreq: "weekly", priority: "0.3" },
  { path: "/contact", changefreq: "monthly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
]

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return (await r.json()) as T
}

async function loadRoster(): Promise<{ patch: string; champs: Champ[] }> {
  const marker = await fetch(`${CDN}/_current_version.txt`, {
    signal: AbortSignal.timeout(15_000),
  })
  const patch = marker.ok ? (await marker.text()).trim() || FALLBACK_PATCH : FALLBACK_PATCH
  const data = await fetchJson<{ data: Record<string, Champ> }>(
    `${CDN}/${patch}/data/en_US/champion.json`
  )
  const champs = Object.values(data.data).sort((a, b) => a.name.localeCompare(b.name))
  return { patch, champs }
}

/** Rewrites the head of the built shell. The template ships one canonical
 *  pointing at the home page plus the site-wide title and description; every
 *  route needs its own or Google folds them all into a single result. */
function renderHead(
  template: string,
  o: { title: string; description: string; canonical: string; image?: string; jsonLd?: unknown }
): string {
  const url = SITE + o.canonical
  let html = template

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(o.title)}</title>`)
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${esc(o.description)}">`
  )
  html = html.replace(/<link\s+rel="canonical"[^>]*>/, `<link rel="canonical" href="${esc(url)}" />`)

  const tags = [
    `<meta name="robots" content="index,follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="lolData" />`,
    `<meta property="og:title" content="${esc(o.title)}" />`,
    `<meta property="og:description" content="${esc(o.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    o.image ? `<meta property="og:image" content="${esc(o.image)}" />` : "",
    `<meta name="twitter:card" content="${o.image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(o.title)}" />`,
    `<meta name="twitter:description" content="${esc(o.description)}" />`,
    o.jsonLd ? `<script type="application/ld+json">${JSON.stringify(o.jsonLd)}</script>` : "",
  ]
    .filter(Boolean)
    .join("\n  ")

  return html.replace("</head>", `  ${tags}\n</head>`)
}

/** Text and links for the pre-JS document. Everything stated here is what the
 *  rendered page shows; nothing is written for crawlers alone. */
function championBody(c: Champ, tab: ChampionTab, patch: string): string {
  const links = CHAMPION_TABS.map(
    (t) => `<a href="${SITE}${championPath(c.id, t)}">${TAB_LABEL[t]}</a>`
  ).join(" ")
  const { description } = championSeo({ name: c.name, tags: c.tags, tab, patch })
  return [
    `<h1>${esc(c.name)}</h1>`,
    `<p>${esc(c.title)}</p>`,
    `<p>${esc(description)}</p>`,
    `<p>${esc(c.blurb)}</p>`,
    `<nav>${links}</nav>`,
    `<p><a href="${SITE}/champions">All champions</a></p>`,
  ].join("\n    ")
}

function injectBody(html: string, inner: string): string {
  return html.replace('<div id="root"></div>', `<div id="root">\n    ${inner}\n  </div>`)
}

async function writePage(route: string, html: string) {
  const file =
    route === "/" ? join(DIST, "index.html") : join(DIST, route.replace(/^\//, ""), "index.html")
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, html, "utf8")
}

async function main() {
  const template = await readFile(join(DIST, "index.html"), "utf8")
  const today = new Date().toISOString().slice(0, 10)
  const urls: { loc: string; changefreq: string; priority: string }[] = []

  let roster: { patch: string; champs: Champ[] } | null = null
  try {
    roster = await loadRoster()
  } catch (e) {
    console.warn(
      `[seo] roster unavailable (${(e as Error).message}) — sitemap will cover static routes only, no champion prerender`
    )
  }

  for (const r of STATIC_ROUTES) {
    urls.push({ loc: SITE + r.path, changefreq: r.changefreq, priority: r.priority })
    if (r.title && r.description) {
      await writePage(
        r.path,
        renderHead(template, { title: r.title, description: r.description, canonical: r.path })
      )
    }
  }

  if (roster) {
    const { patch, champs } = roster

    // The index, prerendered with every champion link present before any JS.
    const indexBody = [
      `<h1>Champions</h1>`,
      `<ul>${champs
        .map((c) => `<li><a href="${SITE}${championPath(c.id)}">${esc(c.name)}</a></li>`)
        .join("")}</ul>`,
    ].join("\n    ")
    await writePage(
      "/champions",
      injectBody(
        renderHead(template, {
          title: "All League of Legends Champions — Builds, Runes & Counters | lolData",
          description:
            "Every League of Legends champion, with the best builds, runes, items, duos and counters for the current patch, from millions of ranked games.",
          canonical: "/champions",
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "League of Legends Champions",
            url: `${SITE}/champions`,
          },
        }),
        indexBody
      )
    )

    for (const c of champs) {
      for (const tab of INDEXABLE_TABS) {
        const path = championPath(c.id, tab)
        const { title, description } = championSeo({ name: c.name, tags: c.tags, tab, patch })
        await writePage(
          path,
          injectBody(
            renderHead(template, {
              title,
              description,
              canonical: path,
              image: `${CDN}/img/champion/splash/${c.id}_0.jpg`,
              jsonLd: {
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: title,
                description,
                url: SITE + path,
                isPartOf: { "@type": "WebSite", name: "lolData", url: SITE },
              },
            }),
            championBody(c, tab, patch)
          )
        )
        urls.push({
          loc: SITE + path,
          changefreq: "daily",
          priority: tab === "overview" ? "0.8" : "0.7",
        })
      }
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url><loc>${esc(u.loc)}</loc><lastmod>${today}</lastmod>` +
        `<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    ),
    "</urlset>",
    "",
  ].join("\n")
  await writeFile(join(DIST, "sitemap.xml"), xml, "utf8")

  console.log(
    `[seo] sitemap.xml: ${urls.length} urls` +
      (roster
        ? ` — prerendered ${roster.champs.length} champions x ${INDEXABLE_TABS.length} tabs + the index`
        : " — NO prerender (roster unavailable)")
  )
}

main().catch((e) => {
  console.error("[seo] failed:", e)
  process.exit(1)
})
