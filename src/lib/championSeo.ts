// Titles and descriptions for /champions/<slug>[/<tab>].
//
// Shared on purpose: the page writes these into the document at runtime, and
// scripts/generate-seo.ts bakes the same strings into the prerendered HTML at
// build time. If the two ever disagree, Googlebot sees one document on its
// first pass and a different one after rendering, which is exactly the signal
// you do not want to send. One function, both callers.

export const CHAMPION_TABS = ["overview", "build", "duos", "counters", "pros", "guides"] as const
export type ChampionTab = (typeof CHAMPION_TABS)[number]

/** Tabs worth their own indexed URL. `guides` is user-generated and often empty,
 *  so it stays out of the sitemap while remaining perfectly crawlable. */
export const INDEXABLE_TABS: ChampionTab[] = ["overview", "build", "duos", "counters", "pros"]

export const TAB_LABEL: Record<ChampionTab, string> = {
  overview: "Overview",
  build: "Build",
  duos: "Duos",
  counters: "Matchups",
  pros: "OTPs",
  guides: "Guides",
}

export function championPath(slug: string, tab: ChampionTab = "overview"): string {
  return tab === "overview" ? `/champions/${slug}` : `/champions/${slug}/${tab}`
}

export function championSeo(input: {
  name: string
  tags?: string[]
  tab?: ChampionTab
  patch: string
}): { title: string; description: string } {
  const { name, tags = [], patch } = input
  const tab = input.tab ?? "overview"
  const isSup = tags.includes("Support")
  const isAdc = tags.includes("Marksman")

  switch (tab) {
    case "duos": {
      const duoLabel = isSup ? "ADC Duos" : isAdc ? "Supports" : "Duos"
      const partner = isSup ? "ADC carries" : isAdc ? "supports" : "duo partners"
      return {
        title: `Best ${duoLabel} for ${name} — Patch ${patch} | lolData`,
        description: `The best ${partner} to pair with ${name} in Patch ${patch}, ranked by confidence-weighted win rate from millions of ranked games.`,
      }
    }
    case "build":
      return {
        title: `${name} Build — Best Items & Runes — Patch ${patch} | lolData`,
        description: `The best build, items and runes for ${name} in Patch ${patch}, from millions of ranked games.`,
      }
    case "counters":
      return {
        title: `${name} Counters & Best Matchups — Patch ${patch} | lolData`,
        description: `${name} counters and best / worst lane matchups in Patch ${patch}.`,
      }
    // These two used to fall through to the overview text, which gave three
    // URLs per champion the same title and description - the surest way to have
    // two of them dropped as duplicates.
    case "pros":
      return {
        title: `${name} OTPs — Best ${name} Players — Patch ${patch} | lolData`,
        description: `The highest-ranked ${name} one-tricks, with their rank, win rate and games played in Patch ${patch}.`,
      }
    case "guides":
      return {
        title: `${name} Guides — Community Builds & Tips | lolData`,
        description: `Player-written ${name} guides: builds, runes, matchup notes and tips.`,
      }
    default:
      return {
        title: `${name} Build, Runes, Duos & Counters — Patch ${patch} | lolData`,
        description: `${name} guide: best build, runes, items, duos and counters from ranked games — Patch ${patch}.`,
      }
  }
}
