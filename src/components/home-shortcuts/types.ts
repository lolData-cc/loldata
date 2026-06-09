// src/components/home-shortcuts/types.ts
//
// Discriminated union for the 3-slot homepage shortcut bar. Each slot
// is either `null` (empty rhombus showing a "+" affordance) or one of
// the 6 shortcut types below. Storage layer serialises the array
// verbatim, so adding new fields here means bumping a migration step
// in storage.ts.

export type ShortcutKind =
  | "champion"
  | "summoner"
  | "scout"
  | "learn"
  | "loldle"
  | "leaderboard"

/** The 6 tabs the championdetail page actually routes to. Keeping the
 *  union strict means typo'd tabs can't sneak into storage. */
export type ChampionTab =
  | "overview"
  | "statistics"
  | "items"
  | "matchups"
  | "guides"
  | "pros"

/** Direct link to a champion page. `tab` optional — when omitted the
 *  shortcut lands on the page's default tab (overview). */
export interface ChampionShortcut {
  kind: "champion"
  /** Canonical champion display name (e.g. "Ahri"). */
  championName: string
  tab?: ChampionTab | null
}

/** Direct link to a summoner page. */
export interface SummonerShortcut {
  kind: "summoner"
  region: string
  name: string
  tag: string
  /** `"season"` opens the "This Season" tab; null/undefined = profile root. */
  tab?: "season" | null
}

/** Direct link to a scout lobby. Optional refinements: a specific tab,
 *  a single-player filter, and the "main account only" toggle. */
export interface ScoutShortcut {
  kind: "scout"
  /** Lobby slug, the part after /scout/ in the URL. */
  slug: string
  /** Human-readable lobby name, captured at save time when known
   *  (e.g. picked from the user's own lobbies). Used purely for the
   *  rhombus caption; navigation still uses the slug. Null when the
   *  user pasted a freeform slug we couldn't resolve. */
  name?: string | null
  tab?:
    | "matches"
    | "live"
    | "leaderboard"
    | "trending"
    | "habits"
    | "champions"
    | null
  /** Optional player id to land on with the filter pre-applied. */
  playerFilter?: string | null
  /** When true, the Main-only toggle starts active on the matches tab. */
  mainOnly?: boolean
}

/** Tabs the learn page actually renders. Kept as a strict union so
 *  storage / serialisation can't drift. */
export type LearnTab = "overview" | "games" | "itemization" | "loldata-ai"

/** Direct link to the logged-in user's learn page. Only configurable
 *  while logged in — we don't capture an account here because there's
 *  only ever one learn page (your own). */
export interface LearnShortcut {
  kind: "learn"
  tab?: LearnTab | null
}

/** Direct link to the daily LoLdle game. No params. */
export interface LoldleShortcut {
  kind: "loldle"
}

/** Direct link to the leaderboard, filtered by region + ladder. */
export interface LeaderboardShortcut {
  kind: "leaderboard"
  region: "EUW" | "NA" | "KR"
  /** Which queue ranking. Solo includes 5v5 ranked solo/duo only. */
  ladder: "solo" | "flex"
}

export type ShortcutSlot =
  | ChampionShortcut
  | SummonerShortcut
  | ScoutShortcut
  | LearnShortcut
  | LoldleShortcut
  | LeaderboardShortcut

/** Compute the URL a shortcut should navigate to when clicked. Keeps
 *  the routing logic in one place so the rhombus components stay
 *  presentational. */
export function shortcutHref(s: ShortcutSlot): string {
  switch (s.kind) {
    case "champion": {
      const base = `/champions/${encodeURIComponent(s.championName)}`
      return s.tab ? `${base}/${s.tab}` : base
    }
    case "summoner": {
      const slug = `${s.name.replace(/\s+/g, "+")}-${s.tag.toUpperCase()}`
      const base = `/summoners/${s.region.toLowerCase()}/${slug}`
      return s.tab === "season" ? `${base}/season` : base
    }
    case "scout": {
      let path = `/scout/${s.slug}`
      if (s.tab) path += `/${s.tab}`
      const qs = new URLSearchParams()
      if (s.playerFilter) qs.set("player", s.playerFilter)
      if (s.mainOnly) qs.set("main", "1")
      const q = qs.toString()
      return q ? `${path}?${q}` : path
    }
    case "learn":
      return s.tab ? `/learn/${s.tab}` : "/learn"
    case "loldle":
      return "/dle"
    case "leaderboard":
      return `/leaderboards?region=${s.region}&ladder=${s.ladder}`
  }
}

// Tab label maps — keep human-readable strings out of UI components.
const CHAMPION_TAB_LABEL: Record<ChampionTab, string> = {
  overview: "Overview",
  statistics: "Statistics",
  items: "Items",
  matchups: "Matchups",
  guides: "Guides",
  pros: "Pros",
}
const LEARN_TAB_LABEL: Record<LearnTab, string> = {
  overview: "Overview",
  games: "Your Games",
  itemization: "Itemization",
  "loldata-ai": "LolData AI",
}
const SCOUT_TAB_LABEL: Record<string, string> = {
  matches: "Matches",
  live: "Live",
  leaderboard: "Leaderboard",
  trending: "Trending",
  habits: "Habits",
  champions: "Champions",
}

/** Compact label shown under the filled rhombus. For a champion with
 *  no tab specified we read "Ahri Page" — emphasises the destination
 *  rather than mirroring "Overview" (the implicit default). */
export function shortcutLabel(s: ShortcutSlot): string {
  switch (s.kind) {
    case "champion":
      return s.tab
        ? `${s.championName} · ${CHAMPION_TAB_LABEL[s.tab]}`
        : `${s.championName} Page`
    case "summoner":
      return s.tab === "season"
        ? `${s.name}#${s.tag} · Season`
        : `${s.name}#${s.tag}`
    case "scout": {
      // Prefer the human-readable lobby name captured at save time;
      // fall back to "<slug> Lobby" only when the user pasted a
      // freeform code whose name we never resolved.
      const head = s.name && s.name.trim().length > 0 ? s.name : `${s.slug} Lobby`
      return s.tab
        ? `${head} · ${SCOUT_TAB_LABEL[s.tab] ?? s.tab}`
        : head
    }
    case "learn":
      return s.tab ? `Learn · ${LEARN_TAB_LABEL[s.tab]}` : "Learn"
    case "loldle":
      return "LoLdle"
    case "leaderboard":
      return `${s.region} · ${s.ladder === "solo" ? "Solo" : "Flex"}`
  }
}

/** Short tag shown at the top of the rhombus (3-4 chars max, mono). */
export function shortcutTag(s: ShortcutSlot): string {
  switch (s.kind) {
    case "champion":
      return "CHAMP"
    case "summoner":
      return "SUMM"
    case "scout":
      return "SCOUT"
    case "learn":
      return "LEARN"
    case "loldle":
      return "DLE"
    case "leaderboard":
      return "LDR"
  }
}
