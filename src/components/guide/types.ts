// Guide section types

export type ThreatLevel = "impossible" | "hard" | "skill" | "easy"
export type SynergyLevel = "perfect" | "ideal" | "good" | "bad"

export type MatchupEntry = {
  championId: string
  level: ThreatLevel | SynergyLevel
  note: string
  ban?: boolean
  items?: number[]
  runes?: {
    primary: { tree: number; keystone: number; runes: number[] }
    secondary: { tree: number; runes: number[] }
  }
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

export type JungleCamp = "blue" | "gromp" | "wolves" | "raptors" | "red" | "krugs" | "scuttle_top" | "scuttle_bot"

export type JunglePath = {
  name: string
  description?: string
  side: "blue" | "red"
  camps: JungleCamp[]
  againstChampions?: string[]
}

export type JunglePathingSection = {
  type: "jungle_pathing"
  title: string
  visible: boolean
  paths: JunglePath[]
}

// Camp positions on minimap (percentage-based x,y)
// Positions calibrated to ddragon map11.png (0,0 = top-left, 100,100 = bottom-right)
export const CAMP_POSITIONS: Record<JungleCamp, { blue: { x: number; y: number }; red: { x: number; y: number }; label: string }> = {
  gromp:       { blue: { x: 15, y: 43 }, red: { x: 85, y: 57 }, label: "Gromp" },
  blue:        { blue: { x: 25, y: 47 }, red: { x: 75, y: 53 }, label: "Blue" },
  wolves:      { blue: { x: 26, y: 56 }, red: { x: 74, y: 44 }, label: "Wolves" },
  raptors:     { blue: { x: 48, y: 65 }, red: { x: 53, y: 36 }, label: "Raptors" },
  red:         { blue: { x: 53, y: 74 }, red: { x: 48, y: 27 }, label: "Red" },
  krugs:       { blue: { x: 56, y: 83 }, red: { x: 45, y: 16 }, label: "Krugs" },
  scuttle_top: { blue: { x: 29, y: 36 }, red: { x: 29, y: 36 }, label: "Scuttle" },
  scuttle_bot: { blue: { x: 70, y: 65 }, red: { x: 70, y: 65 }, label: "Scuttle" },
}

export type GuideSection =
  | IntroSection
  | MatchupSection
  | BuildSection
  | RuneSection
  | RecommendedItemsSection
  | BackTimingSection
  | JunglePathingSection

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
  { key: "impossible", label: "Impossible", color: "bg-red-600 text-white" },
  { key: "hard", label: "Hard", color: "bg-red-500/80 text-white" },
  { key: "skill", label: "Skill", color: "bg-amber-500/80 text-black" },
  { key: "easy", label: "Easy", color: "bg-emerald-500/60 text-white" },
]

export const SYNERGY_LEVELS: { key: SynergyLevel; label: string; color: string }[] = [
  { key: "perfect", label: "Perfect", color: "bg-jade text-black" },
  { key: "ideal", label: "Ideal", color: "bg-jade/70 text-black" },
  { key: "good", label: "Good", color: "bg-jade/40 text-white" },
  { key: "bad", label: "Bad", color: "bg-flash/20 text-flash/60" },
]

export const SECTION_TEMPLATES: Record<GuideSection["type"], () => GuideSection> = {
  introduction: () => ({ type: "introduction", title: "Introduction", visible: true, content: "" }),
  matchups: () => ({ type: "matchups", title: "Threats & Synergies", visible: true, threats: [], synergies: [] }),
  build: () => ({ type: "build", title: "Core Build", visible: true, pages: [{ name: "Default Build", steps: [] }] }),
  runes: () => ({ type: "runes", title: "Runes", visible: true, pages: [{ name: "Default Runes", primary: { tree: 8000, keystone: 8010, runes: [] }, secondary: { tree: 8400, runes: [] }, shards: [] }] }),
  recommended_items: () => ({ type: "recommended_items", title: "Recommended Items", visible: true, items: [] }),
  back_timings: () => ({ type: "back_timings", title: "Buy When You Back", visible: true, timings: [] }),
  jungle_pathing: () => ({ type: "jungle_pathing", title: "Jungle Path", visible: true, paths: [{ name: "Standard Clear", side: "blue" as const, camps: [], description: "" }] }),
}
