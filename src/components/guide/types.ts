// Guide section types

export type ThreatLevel = "extreme" | "major" | "even" | "minor" | "tiny"
export type SynergyLevel = "ideal" | "strong" | "ok" | "low" | "none"

export type MatchupEntry = {
  championId: string
  level: ThreatLevel | SynergyLevel
  note: string
}

export type IntroSection = {
  type: "introduction"
  title: string
  visible: boolean
  content: string
}

export type MatchupSection = {
  type: "matchups"
  title: string
  visible: boolean
  threats: MatchupEntry[]
  synergies: MatchupEntry[]
}

export type BuildStep = {
  items: number[]  // 1 item = mandatory, multiple = pick one
}

export type BuildPage = {
  name: string
  description?: string  // Supports item links: [BT](3072) → hoverable text that highlights the item
  steps: BuildStep[]
  items?: number[]  // Legacy flat list (backward compat → each item becomes a single step)
  againstChampions?: string[]
  againstClasses?: string[]
}

/** Normalize a BuildPage: convert legacy flat items to steps */
export function normalizeBuildPage(page: BuildPage): BuildPage & { steps: BuildStep[] } {
  if (page.steps?.length) return page as any
  // Legacy: flat items array → one step per item
  return { ...page, steps: (page.items ?? []).map(id => ({ items: [id] })) }
}

export type BuildSection = {
  type: "build"
  title: string
  visible: boolean
  pages: BuildPage[]
  items?: number[]  // Legacy single-list (backward compat)
}

export type RunePage = {
  name: string
  description?: string
  againstChampions?: string[]
  againstClasses?: string[]
  primary: { tree: number; keystone: number; runes: number[] }
  secondary: { tree: number; runes: number[] }
  shards: number[]
}

export type RuneSection = {
  type: "runes"
  title: string
  visible: boolean
  pages: RunePage[]
  // Legacy single-page fields (for backward compat)
  primary?: { tree: number; keystone: number; runes: number[] }
  secondary?: { tree: number; runes: number[] }
  shards?: number[]
}

export type RecommendedItemsSection = {
  type: "recommended_items"
  title: string
  visible: boolean
  items: number[]
}

export type BackTimingSection = {
  type: "back_timings"
  title: string
  visible: boolean
  timings: { gold: number; items: number[]; note: string }[]
}

export type GuideSection =
  | IntroSection
  | MatchupSection
  | BuildSection
  | RuneSection
  | RecommendedItemsSection
  | BackTimingSection

export type Guide = {
  id: string
  champion_id: string
  author_id: string
  author_name: string | null
  author_linked_account: string | null
  author_discord: string | null
  author_twitter: string | null
  author_reddit: string | null
  title: string
  patch: string | null
  role: string | null
  upvotes: number
  views: number
  sections: GuideSection[]
  created_at: string
  updated_at: string
}

export const THREAT_LEVELS: { key: ThreatLevel; label: string; color: string }[] = [
  { key: "extreme", label: "Extreme", color: "bg-red-600 text-white" },
  { key: "major", label: "Major", color: "bg-red-500/80 text-white" },
  { key: "even", label: "Even", color: "bg-amber-500/80 text-black" },
  { key: "minor", label: "Minor", color: "bg-emerald-500/60 text-white" },
  { key: "tiny", label: "Tiny", color: "bg-emerald-400/40 text-white" },
]

export const SYNERGY_LEVELS: { key: SynergyLevel; label: string; color: string }[] = [
  { key: "ideal", label: "Ideal", color: "bg-jade text-black" },
  { key: "strong", label: "Strong", color: "bg-jade/70 text-black" },
  { key: "ok", label: "OK", color: "bg-jade/40 text-white" },
  { key: "low", label: "Low", color: "bg-flash/20 text-flash/60" },
  { key: "none", label: "None", color: "bg-flash/10 text-flash/40" },
]

export const SECTION_TEMPLATES: Record<GuideSection["type"], () => GuideSection> = {
  introduction: () => ({ type: "introduction", title: "Introduction", visible: true, content: "" }),
  matchups: () => ({ type: "matchups", title: "Threats & Synergies", visible: true, threats: [], synergies: [] }),
  build: () => ({ type: "build", title: "Core Build", visible: true, pages: [{ name: "Default Build", steps: [] }] }),
  runes: () => ({ type: "runes", title: "Runes", visible: true, pages: [{ name: "Default Runes", primary: { tree: 8000, keystone: 8010, runes: [] }, secondary: { tree: 8400, runes: [] }, shards: [] }] }),
  recommended_items: () => ({ type: "recommended_items", title: "Recommended Items", visible: true, items: [] }),
  back_timings: () => ({ type: "back_timings", title: "Buy When You Back", visible: true, timings: [] }),
}
