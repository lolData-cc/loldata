// src/components/searchdialog.tsx
//
// Search-player dialog — wide-and-short card on top, suggestions
// drop below as their own glass rows with a staggered entrance.
// Visual vocabulary is loldata's (glass bg-black/60, jade accent,
// chakrapetch + jetbrains, BorderBeam edge) but the chrome is
// quieter and the motion does the heavy lifting:
//   - card itself: soft scale+blur entrance (cubic-bezier)
//   - results panel: drops in below with a small parent fade
//   - rows: stagger ~35ms each, slide up 8px → 0, ease-out
//   - region pill: jade glow + crossfade on active
//   - input: animated jade underline that grows with input
//   - hover/highlight: 200ms color & border transitions
//
// Trigger preserved verbatim.

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import type React from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Star, ChevronDown } from "lucide-react"
import { getRankImage } from "@/utils/rankIcons"
import { API_BASE_URL, BOX_API_BASE_URL, cdnBaseUrl } from "@/config"
import { BorderBeam } from "./ui/border-beam"
import { SavedProfiles } from "./savedprofiles"
import { showCyberToast } from "@/lib/toast-utils"
import {
  readRecentProfiles,
  removeRecentProfile,
  subscribeRecentProfiles,
  RECENT_KEY as SHARED_RECENT_KEY,
  UPDATED_EVENT as RECENT_UPDATED_EVENT,
} from "@/lib/recentSearchedProfiles"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type SearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Suggestion = {
  name: string
  tag: string
  rank: string | null
  icon_id: number | null
  region: string
  _isPro?: boolean
  _nickname?: string
  _avatar?: string | null
  _plan?: string | null // "premium" | "elite" → tier badge
  _team?: string | null
  // Set when this row came from the local recently-viewed cache.
  // Drives the violet outline + RECENT badge in SuggestionRow.
  _isRecent?: boolean
}

type SavedProfile = {
  key: string
  name: string
  tag: string
  region: string
  icon_id: number | null
  rank: string | null
}

// Recently-viewed profile (local cache only). Distinct from SavedProfile:
//   - savedProfiles are user-curated bookmarks (max 5, star toggle)
//   - recentProfiles are an opt-in trail of every profile the user has
//     opened from the dialog. Capped at RECENT_MAX, surfaced only when
//     the user types a query that prefix-matches one of them — never
//     proactively suggested on dialog open.
type RecentProfile = {
  name: string
  tag: string
  region: string
  icon_id: number | null
  rank: string | null
  avatar_url?: string | null
  plan?: string | null
  lastSearchedAt: number
}

// Key lives in @/lib/recentSearchedProfiles so other surfaces (summoner
// page in particular) can patch trail entries without us re-declaring
// the literal. Re-export the local alias for tidy reads below.
const RECENT_KEY = SHARED_RECENT_KEY
const RECENT_MAX = 50

const REGIONS = ["EUW", "NA", "KR"] as const

// Pick a sensible default region from the visitor's IANA timezone (no network,
// no permission prompt). Americas → NA, Asia/Oceania → KR (closest of the three
// supported servers), everything else (Europe/Africa/…) → EUW.
function detectDefaultRegion(): (typeof REGIONS)[number] {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
    if (tz.startsWith("America/")) return "NA"
    if (tz.startsWith("Asia/") || tz.startsWith("Australia/") || tz.startsWith("Pacific/")) return "KR"
  } catch {
    /* Intl unavailable — fall through to EUW */
  }
  return "EUW"
}

// House easing — same out-back-ish curve we use elsewhere
const EASE_OUT = [0.22, 1, 0.36, 1] as const

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const navigate = useNavigate()

  const [input, setInput] = useState("")
  const [region, setRegion] = useState<(typeof REGIONS)[number]>(detectDefaultRegion)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([])
  const [recentProfiles, setRecentProfiles] = useState<RecentProfile[]>([])
  const [highlightIdx, setHighlightIdx] = useState(0)
  const [showingSaved, setShowingSaved] = useState(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // NB: highlight reset depends on the FINAL list shown to the user
  // (recents + autocomplete), not just the live API results — otherwise
  // hovering over a recent row and then typing a new char would not
  // re-anchor the highlight to position 0.
  // displaySuggestions is referenced via the useMemo below; declared
  // before this effect runs each render so the dependency is stable.

  // Reset on close
  useEffect(() => {
    if (!open) {
      setInput("")
      setSuggestions([])
      setLoading(false)
      setHighlightIdx(0)
      setShowingSaved(false)
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open])

  // Steal focus back from Radix
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [open])

  // Load saved profiles
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem("savedProfiles")
      if (stored) setSavedProfiles(JSON.parse(stored))
    } catch {
      localStorage.removeItem("savedProfiles")
    }
  }, [])

  // Load recently-viewed profiles from localStorage. Tolerates a
  // legacy/corrupt blob by silently resetting — losing the trail is
  // better than throwing on dialog mount.
  //
  // Re-runs whenever the dialog opens AND whenever another surface
  // (most importantly the summoner page) broadcasts an update via
  // recentSearchedProfiles.enrichRecentProfile(). The summoner page
  // fires that event after a profile loads, so a manual "Name#Tag"
  // submit picks up the avatar + rank the next time the user opens
  // the dialog — even within the same session.
  useEffect(() => {
    setRecentProfiles(readRecentProfiles())
    const unsubscribe = subscribeRecentProfiles(() => {
      setRecentProfiles(readRecentProfiles())
    })
    return unsubscribe
  }, [open])

  // Append/promote a profile in the recently-viewed trail. Called
  // whenever the user navigates away to a summoner page from the
  // dialog (either via a suggestion click or a manual #-search). The
  // entry MOVES to the head if it already exists, so the cache acts
  // as a Most-Recently-Used cache, not append-only.
  function pushToRecent(p: {
    name: string
    tag: string
    region: string
    icon_id: number | null
    rank: string | null
    _avatar?: string | null
    _plan?: string | null
  }) {
    if (typeof window === "undefined") return
    const regionUpper = p.region.toUpperCase()
    const key = `${p.name}#${p.tag}#${regionUpper}`.toLowerCase()
    setRecentProfiles((prev) => {
      const filtered = prev.filter(
        (r) =>
          `${r.name}#${r.tag}#${r.region}`.toLowerCase() !== key
      )
      const next: RecentProfile[] = [
        {
          name: p.name,
          tag: p.tag,
          region: regionUpper,
          icon_id: p.icon_id,
          rank: p.rank,
          avatar_url: p._avatar ?? null,
          plan: p._plan ?? null,
          lastSearchedAt: Date.now(),
        },
        ...filtered,
      ].slice(0, RECENT_MAX)
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        // Quota errors: silently drop, will retry next time.
      }
      return next
    })
  }

  /** Forget a recent profile — fired when the user swipes its card
   *  past the threshold. We touch BOTH local state (so the current
   *  render reacts instantly + AnimatePresence plays the exit
   *  animation) AND the persistent cache (so the entry doesn't come
   *  back next time the dialog opens). The shared utility also
   *  dispatches an update event, which the subscription effect picks
   *  up to redundantly reconcile — harmless idempotent overlap. */
  function forgetRecent(name: string, tag: string, region: string) {
    const key = `${name}#${tag}#${region}`.toLowerCase()
    setRecentProfiles((prev) =>
      prev.filter(
        (r) =>
          `${r.name}#${r.tag}#${r.region}`.toLowerCase() !== key
      )
    )
    removeRecentProfile(name, tag, region)
  }

  // Cleanup
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Opportunistic enrichment of the recent-profiles cache. Recents
  // saved via a manual "Name#Tag" submit (the path that bypasses the
  // autocomplete list because no exact match was found) land in the
  // cache with `icon_id` and `rank` both null — the dialog has no
  // way to know those values at submit time. Once the user later
  // searches for a prefix that surfaces the same profile in the API
  // results (which by then includes it, because visiting the summoner
  // page upserted into `users`), we patch the cached entry in place
  // so the avatar and rank chip appear next time without forcing the
  // user to delete and re-save. Effect is cheap: it only runs when
  // `suggestions` updates AND only writes when there's actually
  // something to enrich.
  useEffect(() => {
    if (suggestions.length === 0) return
    setRecentProfiles((prev) => {
      if (prev.length === 0) return prev
      let changed = false
      const next = prev.map((r) => {
        const match = suggestions.find(
          (s) =>
            s.name.toLowerCase() === r.name.toLowerCase() &&
            s.tag.toLowerCase() === r.tag.toLowerCase() &&
            (s.region || region).toUpperCase() === r.region
        )
        if (!match) return r
        const merged = {
          ...r,
          icon_id: r.icon_id ?? match.icon_id ?? null,
          rank: r.rank ?? match.rank ?? null,
          // avatar + plan refresh from the live result (they change: new pfp,
          // upgrade/downgrade) so an OLD cached row stops showing the LoL icon
          // and gains its premium/elite badge.
          avatar_url: match._avatar ?? r.avatar_url ?? null,
          plan: match._plan ?? r.plan ?? null,
        }
        if (
          merged.icon_id !== r.icon_id || merged.rank !== r.rank ||
          merged.avatar_url !== (r.avatar_url ?? null) || merged.plan !== (r.plan ?? null)
        ) {
          changed = true
          return merged
        }
        return r
      })
      if (!changed) return prev
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* quota — keep in-memory copy regardless */
      }
      return next
    })
  }, [suggestions, region])

  const fetchAutocomplete = useCallback(
    async (query: string) => {
      abortRef.current?.abort()
      const [partialName] = query.split("#")
      if (partialName.trim().length < 2) {
        setSuggestions([])
        setLoading(false)
        return
      }
      setLoading(true)
      const controller = new AbortController()
      abortRef.current = controller
      const searchTerm = partialName.trim()

      const [apiRes, proRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/autocomplete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim(), region: region.toUpperCase() }),
          signal: controller.signal,
        })
          .then((r) => r.json())
          .catch((err) => {
            if (err.name !== "AbortError") console.error("Autocomplete fetch:", err)
            return { results: [] }
          }),
        // Pro suggestions from the box (curated Cloud pros + scraped lolpros
        // import, merged server-side) — the browser no longer reads Supabase.
        fetch(`${BOX_API_BASE_URL}/api/pros/search?query=${encodeURIComponent(searchTerm)}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : { suggestions: [] }))
          .then((j) => j.suggestions ?? [])
          .catch((err) => {
            if (err.name !== "AbortError") console.error("Pro search fetch:", err)
            return []
          }),
      ])
      if (controller.signal.aborted) return

      const proSuggestions: Suggestion[] = proRes.map((p: any) => ({
        name: p.name || "",
        tag: p.tag || "",
        rank: null,
        icon_id: null,
        // the ACCOUNT's real shard from the backend (a KR/NA/BR pro must not
        // inherit the currently selected search region)
        region: (p.region || region).toUpperCase(),
        _isPro: true,
        _nickname: p.nickname,
        _avatar: p.avatar,
        _team: p.team,
      }))
      const proKeys = new Set(
        proSuggestions.map((p) => `${p.name}#${p.tag}`.toLowerCase())
      )
      const apiFiltered: Suggestion[] = (apiRes.results ?? [])
        .filter((s: any) => !proKeys.has(`${s.name}#${s.tag}`.toLowerCase()))
        .map((s: any) => ({
          // Premium uploaded propic — backend enriches `avatar_url` from
          // profile_players. Render it instead of the LoL icon. We do NOT set
          // `_isPro` (that's for esports pros: it swaps in a nickname + hides
          // the rank). Premium users keep their normal rank/name display.
          ...s,
          _avatar: s.avatar_url ?? null,
          _plan: s.plan ?? null,
        }))

      setSuggestions([...proSuggestions, ...apiFiltered])
      setLoading(false)
    },
    [region]
  )

  function handleSubmit() {
    // If the user typed an explicit "name#tag", that's an UNAMBIGUOUS
    // navigation intent — we must not silently redirect them to the
    // first autocomplete match. Only honor a highlighted suggestion if
    // it represents the same exact (name, tag) the user typed, so the
    // suggestion's enriched icon/rank ride along. Otherwise route them
    // to the literal slug they wrote — the profile may exist in Riot
    // even when our DB hasn't seen it (e.g. brand-new accounts), and
    // visiting the page will trigger the on-demand fetch.
    if (input.includes("#")) {
      const [nameRaw, tagRaw] = input.split("#")
      const name = nameRaw.trim()
      const tag = (tagRaw || "").trim()
      if (!name || !tag) return
      const typedKey = `${name}#${tag}`.toLowerCase()
      const exactMatch = displaySuggestions.find(
        (s) => `${s.name}#${s.tag}`.toLowerCase() === typedKey
      )
      if (exactMatch) {
        pickSuggestion(exactMatch)
        return
      }
      pushToRecent({
        name,
        tag: tag.toUpperCase(),
        region,
        icon_id: null,
        rank: null,
      })
      const slug = `${name.replace(/\s+/g, "+")}-${tag.toUpperCase()}`
      navigate(`/summoners/${region.toLowerCase()}/${slug}`)
      onOpenChange(false)
      return
    }

    // No explicit tag — treat the input as a name prefix and use the
    // highlighted autocomplete suggestion as the completion. Falls back
    // to the typed name with the region's default tag if there are no
    // suggestions at all (e.g. the API is down).
    if (displaySuggestions[highlightIdx]) {
      pickSuggestion(displaySuggestions[highlightIdx])
      return
    }
    const name = input.trim()
    if (!name) return
    const tag = region
    pushToRecent({
      name,
      tag,
      region,
      icon_id: null,
      rank: null,
    })
    const slug = `${name.replace(/\s+/g, "+")}-${tag}`
    navigate(`/summoners/${region.toLowerCase()}/${slug}`)
    onOpenChange(false)
  }

  function pickSuggestion(sugg: Suggestion) {
    pushToRecent({
      name: sugg.name,
      tag: sugg.tag,
      region: (sugg.region || region).toUpperCase(),
      icon_id: sugg.icon_id,
      rank: sugg.rank,
      _avatar: sugg._avatar ?? null,
      _plan: sugg._plan ?? null,
    })
    const slug = `${sugg.name.replace(/\s+/g, "+")}-${sugg.tag.toUpperCase()}`
    const targetRegion = (sugg.region || region).toLowerCase()
    navigate(`/summoners/${targetRegion}/${slug}`)
    onOpenChange(false)
  }

  function isSaved(s: Suggestion): boolean {
    return savedProfiles.some(
      (p) =>
        p.name === s.name &&
        p.tag === s.tag &&
        p.region === (s.region || region).toUpperCase()
    )
  }

  function toggleSaved(e: React.MouseEvent, s: Suggestion) {
    e.stopPropagation()
    const profileRegion = (s.region || region).toUpperCase()
    const key = `${s.name}-${s.tag}-${profileRegion}`
    setSavedProfiles((prev) => {
      const exists = prev.some((p) => p.key === key)
      if (!exists && prev.length >= 5) {
        showCyberToast({
          title: "Limit reached",
          description: "You can save up to 5 profiles.",
          tag: "ERR",
          variant: "error",
        })
        return prev
      }
      const next = exists
        ? prev.filter((p) => p.key !== key)
        : [
            ...prev,
            {
              key,
              name: s.name,
              tag: s.tag,
              region: profileRegion,
              icon_id: s.icon_id,
              rank: s.rank,
            },
          ]
      if (typeof window !== "undefined") {
        localStorage.setItem("savedProfiles", JSON.stringify(next))
      }
      return next
    })
  }

  function showSavedProfilesList() {
    const filtered = savedProfiles
      .filter((p) => p.region === region.toUpperCase())
      .map<Suggestion>((p) => ({
        name: p.name,
        tag: p.tag,
        rank: p.rank,
        icon_id: p.icon_id,
        region: p.region,
      }))
    setInput("")
    setShowingSaved(true)
    setSuggestions(filtered)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (displaySuggestions.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIdx((i) => Math.min(i + 1, displaySuggestions.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIdx((i) => Math.max(i - 1, 0))
    }
  }

  const trimmed = input.trim()
  const hasQuery = trimmed.length >= 2

  // Recently-viewed matches. Only kicks in once the user has typed at
  // least 3 chars — the whole point of this feature is to surface
  // history WITHOUT being proactive about it. We match name-prefix or
  // a "name#tag" substring against the recent cache, restricted to the
  // active region (so EUW history doesn't bleed into the NA results
  // tab). Capped at 5 to keep the panel from drowning in history when
  // the live API is still loading.
  const recentMatches = useMemo((): Suggestion[] => {
    const t = input.trim().toLowerCase()
    if (t.length < 3) return []
    const [partialName] = t.split("#")
    const regionUpper = region.toUpperCase()
    const partial = partialName.trim()
    return recentProfiles
      .filter((r) => r.region === regionUpper)
      .filter((r) => {
        if (!partial) return false
        const name = r.name.toLowerCase()
        const fullKey = `${r.name}#${r.tag}`.toLowerCase()
        return name.startsWith(partial) || fullKey.includes(t)
      })
      .slice(0, 5)
      .map<Suggestion>((r) => ({
        name: r.name,
        tag: r.tag,
        region: r.region,
        rank: r.rank,
        icon_id: r.icon_id,
        _avatar: r.avatar_url ?? null,
        _plan: r.plan ?? null,
        _isRecent: true,
      }))
  }, [input, recentProfiles, region])

  // Final list shown to the user. Recents come first, then live API
  // results, deduped against recent matches so we never show the same
  // profile twice — recents always win the duplicate (they carry the
  // violet outline + chip even if the API also returned them).
  const displaySuggestions = useMemo((): Suggestion[] => {
    if (recentMatches.length === 0) return suggestions
    // Index the LIVE API results so a recent row keeps its violet "recent"
    // badge but shows the CURRENT rank / icon / premium avatar — not whatever
    // was cached the last time the profile was opened. Without this, a profile
    // in the recent cache (e.g. ranked Diamond months ago, no uploaded pfp)
    // would override the fresh API data and look stale forever.
    const apiByKey = new Map<string, Suggestion>()
    for (const s of suggestions) {
      apiByKey.set(`${s.name}#${s.tag}#${(s.region || region).toUpperCase()}`.toLowerCase(), s)
    }
    const recentKeys = new Set<string>()
    const mergedRecents = recentMatches.map((r) => {
      const key = `${r.name}#${r.tag}#${r.region}`.toLowerCase()
      recentKeys.add(key)
      const live = apiByKey.get(key)
      if (!live) return r
      return {
        ...r, // keeps _isRecent (the badge)
        rank: live.rank ?? r.rank,
        icon_id: live.icon_id ?? r.icon_id,
        _avatar: live._avatar ?? r._avatar,
        _plan: live._plan ?? r._plan,
      }
    })
    const filtered = suggestions.filter(
      (s) =>
        !recentKeys.has(
          `${s.name}#${s.tag}#${(s.region || region).toUpperCase()}`.toLowerCase()
        )
    )
    return [...mergedRecents, ...filtered]
  }, [recentMatches, suggestions, region])

  // Snap keyboard highlight back to the top whenever the visible list
  // changes (autocomplete returned, recents matched, user typed). We
  // depend on length rather than the array reference itself so a
  // reshuffle that doesn't change size won't keep stealing focus.
  useEffect(() => {
    setHighlightIdx(0)
  }, [displaySuggestions.length])

  // Show the panel when: there's a query (always feedback), or we're
  // explicitly displaying saved profiles. Avoids a flicker when the
  // dialog opens.
  const showPanel = hasQuery || showingSaved || loading

  let panelState: "loading" | "results" | "empty" | null = null
  if (loading && displaySuggestions.length === 0) panelState = "loading"
  else if (displaySuggestions.length > 0) panelState = "results"
  else if (hasQuery) panelState = "empty"
  else if (showingSaved) panelState = "empty"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Trigger — preserved verbatim */}
      <div className="hidden md:block">
        <DialogTrigger asChild>
          <div className="font-jetbrains bg-jade/10 text-jade hover:bg-jade/20 items-center py-2 h-full px-3 rounded-sm cursor-clicker">
            SEARCH A PLAYER
          </div>
        </DialogTrigger>
      </div>
      <div className="md:hidden">
        <DialogTrigger asChild>
          <div className="p-1.5 bg-jade/20 text-jade rounded-sm cursor-clicker">
            <Search className="w-3 h-3" />
          </div>
        </DialogTrigger>
      </div>

      <DialogContent
        className={cn(
          "w-[95vw] max-w-[500px] bg-transparent shadow-none border-none p-0",
          "top-[9vh] translate-y-0",
          "[&>button]:hidden"
        )}
      >
        {/* relative wrapper — results dropdown anchors here */}
        <div className="relative w-full">
          {/* ── Search card (short and wide) ──
              Open animation: same CRT-power-on motion as the homepage
              shortcut config dialog — clip-path collapses to a single
              centred slit then ramps open vertically while a jade zap
              line races across the full width and fades. Inner
              content cross-fades after the geometry settles so the
              user reads it as the screen booting, not a snap-in. */}
          <motion.div
            initial={{
              clipPath: "inset(49.5% 49.5% 49.5% 49.5%)",
              scale: 0.96,
              opacity: 0.85,
            }}
            animate={{
              clipPath: [
                "inset(49.5% 49.5% 49.5% 49.5%)",
                "inset(48% 0% 48% 0%)",
                "inset(0% 0% 0% 0%)",
              ],
              scale: [0.96, 0.98, 1],
              opacity: [0.85, 1, 1],
            }}
            transition={{
              duration: 0.6,
              times: [0, 0.32, 1],
              ease: [0.4, 0, 0.2, 1],
            }}
            className={cn(
              "relative overflow-hidden rounded-md",
              "bg-black/75 backdrop-blur-xl saturate-150",
              "shadow-[0_24px_70px_rgba(0,0,0,0.75),0_0_40px_rgba(0,217,146,0.08),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.04)]"
            )}
          >
            {/* CRT zap line — the bright jade neon that spawns at
                centre, races outward to the card's full width during
                the slit phase, then fades as the card finishes
                opening. Same shape + timing as the shortcut config
                dialog so the two surfaces share a "this is a loldata
                modal" signature. */}
            <motion.span
              aria-hidden
              className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] pointer-events-none z-20"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(0,217,146,0.95) 12%, rgba(255,255,255,1) 50%, rgba(0,217,146,0.95) 88%, transparent 100%)",
                boxShadow:
                  "0 0 18px rgba(0,217,146,1), 0 0 36px rgba(0,217,146,0.5), 0 0 60px rgba(0,217,146,0.25)",
                transformOrigin: "center",
              }}
              initial={{ scaleX: 0.05, opacity: 0 }}
              animate={{
                scaleX: [0.05, 1, 1],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 0.6,
                times: [0, 0.32, 0.85],
                ease: "easeOut",
              }}
            />

            <BorderBeam duration={8} size={140} />

            {/* Inner content — settles in after the geometry opens, so
                the boot reads as the screen stabilising. */}
            <motion.div
              className="relative z-10 px-5 py-7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22, delay: 0.42, ease: "easeOut" }}
            >
              <DialogTitle className="sr-only">Search a player</DialogTitle>

              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-1 h-4 bg-jade rounded-full shadow-[0_0_10px_rgba(0,217,146,0.45)]" />
                  <span className="text-[12px] font-jetbrains text-flash/60 tracking-[0.22em] uppercase">
                    Player Search
                  </span>
                </div>
                <SavedProfiles onClick={showSavedProfilesList} />
              </div>

              {/* Input + region row — short, wide */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSubmit()
                }}
                className="flex items-stretch gap-2"
              >
                {/* Input */}
                <label className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-flash/25 pointer-events-none" />
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      const value = e.target.value
                      setInput(value)
                      setShowingSaved(false)
                      if (debounceRef.current) clearTimeout(debounceRef.current)
                      const [partial] = value.split("#")
                      if (partial.trim().length < 2) {
                        abortRef.current?.abort()
                        setSuggestions([])
                        setLoading(false)
                        return
                      }
                      debounceRef.current = setTimeout(() => {
                        fetchAutocomplete(value)
                      }, 320)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Username#TAG"
                    spellCheck={false}
                    autoComplete="off"
                    className={cn(
                      "w-full h-12 bg-white/[0.03] border border-white/[0.06] rounded-sm",
                      "pl-10 pr-3 text-[14px] font-jetbrains text-flash",
                      "placeholder:text-flash/20",
                      "focus:outline-none focus:border-jade/30",
                      "transition-colors duration-200"
                    )}
                  />
                  {/* Animated jade underline */}
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 h-[1px] bg-jade/50",
                      "transition-all duration-[400ms]"
                    )}
                    style={{ width: input.length > 0 ? "100%" : "0%" }}
                  />
                </label>

                {/* Region — compact dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      "h-12 px-3.5 rounded-sm cursor-clicker outline-none shrink-0",
                      "font-chakrapetch text-[11px] tracking-[0.18em] uppercase",
                      "flex items-center gap-1.5",
                      "border text-jade bg-jade/10 border-jade/30",
                      "hover:bg-jade/15 transition-all duration-200",
                      "data-[state=open]:bg-jade/15 data-[state=open]:shadow-[0_0_18px_rgba(0,217,146,0.18)]"
                    )}
                  >
                    {region}
                    <ChevronDown className="w-3 h-3 opacity-70 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className={cn(
                      "min-w-[120px] p-1 border border-white/10",
                      "bg-black/85 backdrop-blur-xl saturate-150",
                      "shadow-[0_16px_44px_rgba(0,0,0,0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.05)]"
                    )}
                  >
                    {REGIONS.map((r) => {
                      const active = r === region
                      return (
                        <DropdownMenuItem
                          key={r}
                          onClick={() => setRegion(r)}
                          className={cn(
                            "cursor-clicker rounded-sm px-3 py-1.5",
                            "font-chakrapetch text-[11px] tracking-[0.18em] uppercase",
                            "focus:bg-jade/10 focus:text-jade",
                            "transition-colors duration-150",
                            active ? "text-jade bg-jade/[0.08]" : "text-flash/50"
                          )}
                        >
                          {r}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </form>
            </motion.div>
          </motion.div>

          {/* ── Results dropdown (absolute, anchored below card) ── */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="absolute left-0 right-0 top-full mt-2 flex flex-col gap-1.5"
              >
                {panelState === "loading" && <RowLoading />}
                {panelState === "empty" && (
                  <RowEmpty
                    label={showingSaved ? "No saved profiles in this region" : "No player found"}
                  />
                )}
                {panelState === "results" &&
                  displaySuggestions.map((s, i) => (
                    <motion.div
                      key={`${s.name}-${s.tag}-${s.region}-${i}-${s._isRecent ? "r" : "a"}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      // Forgotten recents slide off the left edge with
                      // a quick fade — matches the swipe direction so
                      // the gesture and the dismissal read as one
                      // continuous motion.
                      exit={{
                        opacity: 0,
                        x: s._isRecent ? -320 : 0,
                        y: s._isRecent ? 0 : 4,
                        transition: { duration: 0.22, ease: EASE_OUT },
                      }}
                      transition={{
                        duration: 0.24,
                        ease: EASE_OUT,
                        delay: i * 0.035,
                      }}
                    >
                      <SwipeableRow
                        enabled={!!s._isRecent}
                        onForget={() =>
                          forgetRecent(s.name, s.tag, s.region)
                        }
                      >
                        <SuggestionRow
                          sugg={s}
                          highlighted={i === highlightIdx}
                          saved={isSaved(s)}
                          onHover={() => setHighlightIdx(i)}
                          onPick={() => pickSuggestion(s)}
                          onToggleSave={(e) => toggleSaved(e, s)}
                        />
                      </SwipeableRow>
                    </motion.div>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── states (used as standalone rows below the card) ───────────────

function RowShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md",
        "bg-black/75 backdrop-blur-xl saturate-150",
        "shadow-[0_16px_44px_rgba(0,0,0,0.65),inset_0_0_0_0.5px_rgba(255,255,255,0.08)]",
        className
      )}
    >
      {children}
    </div>
  )
}

function RowLoading() {
  return (
    <RowShell>
      <div className="flex items-center justify-center gap-2 px-5 py-4">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-jade/60 animate-pulse"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
        <span className="ml-2 text-[10px] font-jetbrains text-jade/40 uppercase tracking-[0.3em]">
          Scanning
        </span>
      </div>
    </RowShell>
  )
}

function RowEmpty({ label }: { label: string }) {
  return (
    <RowShell>
      <div className="flex items-center justify-center gap-3 px-5 py-4">
        <svg width="20" height="20" viewBox="0 0 36 36" className="opacity-25 shrink-0">
          <polygon
            points="18,2 32,10 32,26 18,34 4,26 4,10"
            fill="none"
            stroke="#00d992"
            strokeWidth="1.5"
          />
          <line
            x1="12"
            y1="12"
            x2="24"
            y2="24"
            stroke="#00d992"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="24"
            y1="12"
            x2="12"
            y2="24"
            stroke="#00d992"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-jetbrains text-flash/30 uppercase tracking-[0.2em]">
          {label}
        </span>
      </div>
    </RowShell>
  )
}

// ─── swipe-to-forget wrapper ────────────────────────────────────────
//
// Wraps a recent suggestion row in a draggable layer. The user grabs
// the card and slides it leftward; once they release past the
// FORGET_THRESHOLD, we call `onForget` (which removes the entry from
// state + localStorage), and the parent <motion.div exit> sweeps the
// row off the left edge in the same direction the gesture was already
// going — so the dismissal reads as one fluid motion rather than a
// snap-back-then-disappear two-step.
//
// Disabled (`enabled=false`) for non-recent rows: the autocomplete
// API results have nothing to forget, so the wrapper renders its
// children unchanged with zero overhead.
const FORGET_THRESHOLD_PX = 110

function SwipeableRow({
  enabled,
  onForget,
  children,
}: {
  enabled: boolean
  onForget: () => void
  children: React.ReactNode
}) {
  // useMotionValue MUST run unconditionally — calling hooks inside
  // the `enabled` short-circuit below would violate the rules of
  // hooks if the prop ever changed. Cost is trivial when unused.
  const x = useMotionValue(0)
  // Flips to true on dragStart and stays true through the synthetic
  // click that fires on pointerup; the capture-phase click handler
  // below uses it to suppress the child SuggestionRow's onClick so
  // releasing after a swipe never accidentally opens the profile.
  // Framer-motion's built-in click suppression only covers the
  // motion.div itself, not descendant handlers — the React onClick
  // we bind in SuggestionRow falls through that net.
  const didDragRef = useRef(false)
  // The card fades + barely tilts as the drag deepens; once the user
  // is past ~half the threshold the visual hint that "release will
  // forget" is unmistakable, but the curve stays gentle so quick
  // accidental nudges don't look destructive.
  const opacity = useTransform(
    x,
    [-FORGET_THRESHOLD_PX * 2, -FORGET_THRESHOLD_PX * 0.4, 0],
    [0.35, 0.92, 1]
  )
  const rotate = useTransform(
    x,
    [-FORGET_THRESHOLD_PX * 2, 0],
    [-1.5, 0]
  )

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <motion.div
      drag="x"
      // Hard left bound prevents the user from dragging past the
      // dialog edge; the right bound = 0 keeps the row from being
      // pulled rightward at all (nothing to do over there).
      dragConstraints={{ left: -260, right: 0 }}
      dragElastic={0.18}
      // Auto-snaps back to 0 when released inside constraints,
      // making sub-threshold gestures feel weightless instead of
      // sticky.
      dragSnapToOrigin
      whileDrag={{ cursor: "grabbing" }}
      style={{ x, opacity, rotate }}
      onDragStart={() => {
        didDragRef.current = true
      }}
      onDragEnd={(_, info) => {
        if (info.offset.x < -FORGET_THRESHOLD_PX) {
          onForget()
        }
        // Leave didDragRef = true until the synthetic click that
        // follows pointerup has been swallowed by onClickCapture
        // below — that handler resets it.
      }}
      onClickCapture={(e) => {
        if (!didDragRef.current) return
        // A drag just ended; intercept the click in the CAPTURE phase
        // before it reaches the SuggestionRow's onClick. Without this
        // the child's navigate() fires the moment the user releases,
        // turning every swipe into an unwanted profile open.
        e.preventDefault()
        e.stopPropagation()
        didDragRef.current = false
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── suggestion row ─────────────────────────────────────────────────

function SuggestionRow({
  sugg,
  highlighted,
  saved,
  onHover,
  onPick,
  onToggleSave,
}: {
  sugg: Suggestion
  highlighted: boolean
  saved: boolean
  onHover: () => void
  onPick: () => void
  onToggleSave: (e: React.MouseEvent) => void
}) {
  const isRecent = !!sugg._isRecent
  return (
    <div
      onMouseEnter={onHover}
      onClick={onPick}
      className={cn(
        "group relative overflow-hidden rounded-md cursor-clicker",
        "bg-black/75 backdrop-blur-xl saturate-150",
        "border transition-all duration-200",
        // Recent rows keep their violet identity through every state
        // (idle, hover, keyboard-highlight). Non-recent rows use jade
        // as before. The keyboard-highlight branch just deepens the
        // active accent rather than switching colour palettes.
        isRecent
          ? highlighted
            ? "border-[#a78bfa]/55 bg-[#a78bfa]/[0.10]"
            : "border-[#a78bfa]/35 bg-[#a78bfa]/[0.04] hover:border-[#a78bfa]/55 hover:bg-[#a78bfa]/[0.08]"
          : highlighted
            ? "border-jade/30 bg-jade/[0.06]"
            : "border-transparent hover:border-jade/20 hover:bg-jade/[0.04]"
      )}
      style={{
        boxShadow: isRecent
          ? "0 16px 44px rgba(0,0,0,0.65), 0 0 16px rgba(167,139,250,0.16), inset 0 0 0 0.5px rgba(255,255,255,0.08)"
          : "0 16px 44px rgba(0,0,0,0.65), inset 0 0 0 0.5px rgba(255,255,255,0.08)",
      }}
    >
      {/* Left accent strip — jade when keyboard-focused, violet for
          recents, fades out otherwise. */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-2 bottom-2 w-[2px] rounded-full transition-opacity duration-200",
          highlighted ? "bg-jade opacity-100" : isRecent ? "bg-[#a78bfa] opacity-100" : "bg-jade opacity-0"
        )}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        {sugg._avatar ? (
          <img
            src={sugg._avatar}
            alt=""
            className="w-9 h-9 rounded-sm object-cover border border-jade/25 shrink-0"
          />
        ) : sugg._isPro ? (
          <div className="w-9 h-9 rounded-sm bg-black/40 border border-jade/15 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 64 52" className="w-5 h-4">
              <circle
                cx="32"
                cy="16"
                r="9"
                fill="rgba(0,217,146,0.15)"
                stroke="rgba(0,217,146,0.25)"
                strokeWidth="1"
              />
              <path
                d="M16 48c0-8.8 7.2-16 16-16s16 7.2 16 16"
                fill="rgba(0,217,146,0.1)"
                stroke="rgba(0,217,146,0.2)"
                strokeWidth="1"
              />
            </svg>
          </div>
        ) : sugg.icon_id != null ? (
          <img
            // Use the live CDN version resolved at boot — the hardcoded
            // 16.1.1 path 404's on any profile icon id added after that
            // patch (e.g. ~7000+). cdnBaseUrl() tracks the value fetched
            // from /_current_version.txt so newer accounts render.
            src={`${cdnBaseUrl()}/img/profileicon/${sugg.icon_id}.png`}
            alt=""
            className="w-9 h-9 rounded-sm border border-white/[0.06] shrink-0"
          />
        ) : (
          <div className="w-9 h-9 rounded-sm bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
            <span className="text-[13px] font-chakrapetch font-bold text-flash/55">
              {sugg.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}

        {/* Name + tag/team */}
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "font-chakrapetch font-bold text-[14px] tracking-wide truncate transition-colors duration-200",
                highlighted ? "text-jade" : "text-flash group-hover:text-jade"
              )}
            >
              {sugg._isPro && sugg._nickname ? sugg._nickname : sugg.name}
            </span>
            {sugg._isPro && (
              <span
                className="text-[7.5px] font-black px-1 py-[1px] rounded-[2px] tracking-wider shrink-0"
                style={{
                  background: "linear-gradient(135deg, #00d992, #00b8ff)",
                  color: "#040A0C",
                }}
              >
                PRO
              </span>
            )}
            {sugg._plan === "elite" || sugg._plan === "premium" ? (
              <img
                src={`https://cdn2.loldata.cc/img/badge/loldata-plans/${sugg._plan === "elite" ? "Elite" : "Premium"}.png`}
                alt={sugg._plan === "elite" ? "Elite" : "Premium"}
                title={sugg._plan === "elite" ? "Elite member" : "Premium member"}
                className="h-[18px] w-auto shrink-0 object-contain"
                draggable={false}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            ) : null}
            {isRecent && (
              <span
                className="text-[8px] font-jetbrains font-bold uppercase px-1.5 py-[1px] rounded-[2px] tracking-[0.18em] shrink-0"
                style={{
                  background: "rgba(167,139,250,0.12)",
                  border: "1px solid rgba(167,139,250,0.4)",
                  color: "rgba(184,160,255,0.95)",
                }}
              >
                Recent
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-jetbrains text-flash/40 min-w-0">
            <span className="truncate">
              {sugg.name}
              <span className="text-flash/25">#{sugg.tag}</span>
            </span>
            {sugg._team && (
              <>
                <span className="text-flash/15">·</span>
                <span className="text-jade/55 shrink-0 uppercase tracking-wider">
                  {sugg._team}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Rank chip + star */}
        <div className="flex items-center gap-2 shrink-0">
          {!sugg._isPro && (
            <div
              className={cn(
                "flex items-center justify-center gap-1 px-2 py-1 rounded-sm sm:w-[100px] overflow-hidden",
                "border transition-colors duration-200",
                // Default: subtle white tint. On row hover (group) AND
                // when the row is keyboard-highlighted, brighten the
                // pill so it lifts off the glossy card background —
                // otherwise the rank chip blends with the bg-jade/
                // bg-violet tint of an active row. We mirror the row's
                // accent palette so the chip stays coordinated rather
                // than going neutral white on a coloured row.
                isRecent
                  ? highlighted
                    ? "bg-[#a78bfa]/[0.18] border-[#a78bfa]/30"
                    : "bg-white/[0.02] border-white/[0.05] group-hover:bg-[#a78bfa]/[0.14] group-hover:border-[#a78bfa]/25"
                  : highlighted
                    ? "bg-jade/[0.14] border-jade/25"
                    : "bg-white/[0.02] border-white/[0.05] group-hover:bg-jade/[0.10] group-hover:border-jade/20"
              )}
            >
              <img
                src={getRankImage(sugg.rank ?? "Unranked")}
                alt={sugg.rank ?? "Unranked"}
                className="w-4 h-4 object-contain shrink-0"
              />
              <span className="hidden sm:inline text-[9px] font-jetbrains text-flash/50 tracking-[0.1em] uppercase whitespace-nowrap">
                {sugg.rank ?? "Unranked"}
              </span>
            </div>
          )}
          {!sugg._isPro && (
            <StarSaveButton saved={saved} onToggle={onToggleSave} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── animated star save button ──────────────────────────────────────
//
// Cyber "save profile" toggle. On the unsaved→saved transition we play a
// short burst: a jade ring expands out of the chip, a soft inner flash
// pops, and 8 jade sparks fan outward at HUD-style speed. The star
// itself does a spring scale-pop. On unsave we just fall back to the
// quiet color/border transition so removal feels deliberate, not noisy.
function StarSaveButton({
  saved,
  onToggle,
}: {
  saved: boolean
  onToggle: (e: React.MouseEvent) => void
}) {
  // burstKey changes on each save so framer-motion remounts the FX
  // children and replays their initial → animate sequence.
  const [burstKey, setBurstKey] = useState(0)

  const handleClick = (e: React.MouseEvent) => {
    if (!saved) setBurstKey((k) => k + 1)
    onToggle(e)
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      title={saved ? "Remove from saved" : "Save profile"}
      whileTap={{ scale: 0.85 }}
      transition={{ duration: 0.15, ease: EASE_OUT }}
      className={cn(
        "relative inline-flex items-center justify-center w-7 h-7 rounded-sm cursor-clicker overflow-visible",
        "transition-colors duration-200",
        saved
          ? "text-jade bg-jade/15 border border-jade/25"
          : "text-flash/30 border border-transparent hover:text-jade hover:bg-jade/10 hover:border-jade/20"
      )}
    >
      {/* Star — spring scale pop when becoming saved.
          key={saved} forces a remount on toggle so the spring fires
          cleanly each time instead of interpolating from mid-flight. */}
      <motion.span
        key={`star-${saved}`}
        initial={saved ? { scale: 0.4, rotate: -90 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={
          saved
            ? { type: "spring", stiffness: 380, damping: 14 }
            : { duration: 0.15 }
        }
        className="relative z-10"
      >
        <Star className={cn("w-3.5 h-3.5", saved && "fill-current")} />
      </motion.span>

      {/* Burst FX — only renders after the first save. Re-keyed per
          click so it replays. Sits absolutely over the button without
          intercepting pointer events. */}
      {burstKey > 0 && <StarBurstFX key={burstKey} />}
    </motion.button>
  )
}

function StarBurstFX() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {/* Expanding jade ring — the loud part of the cyber effect */}
      <motion.span
        initial={{ scale: 0.4, opacity: 0.9 }}
        animate={{ scale: 2.6, opacity: 0 }}
        transition={{ duration: 0.55, ease: EASE_OUT }}
        className="absolute inset-0 rounded-sm border-[1.5px] border-jade"
        style={{ boxShadow: "0 0 14px rgba(0,217,146,0.6)" }}
      />
      {/* Soft inner flash — fills the chip briefly */}
      <motion.span
        initial={{ scale: 0.5, opacity: 0.55 }}
        animate={{ scale: 1.7, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute inset-0 rounded-sm bg-jade/40"
      />
      {/* 8 sparks fanning outward at uneven distances for a less
          mechanical, more "HUD spark" look */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2 + Math.PI / 8
        const distance = 16 + (i % 2) * 4
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 w-1 h-1 -ml-0.5 -mt-0.5 rounded-full bg-jade"
            style={{ boxShadow: "0 0 5px rgba(0,217,146,0.8)" }}
          />
        )
      })}
    </span>
  )
}
