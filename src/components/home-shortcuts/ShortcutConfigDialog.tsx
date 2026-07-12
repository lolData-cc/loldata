// src/components/home-shortcuts/ShortcutConfigDialog.tsx
//
// Two-step config flow:
//   Step 1 — TYPE PICKER: 6 type cards.
//   Step 2 — TYPE FORM:   typed inputs. Wherever a value is bounded
//                         (tabs, regions, ladder, scout players when
//                         resolvable) we pick from a list rather than
//                         making the user type — typed strings would
//                         silently break routing on a typo.
//
// Picker components in this file:
//   - SegmentedPicker — pill row, our standard choice picker
//   - ChampionCombobox — autocomplete dropdown of all champions
//     hydrated from the CDN data dragon manifest
//   - ScoutPlayerCombobox — autocomplete dropdown of the chosen
//     lobby's players, fetched lazily once the slug is valid

import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  Crosshair,
  User,
  Compass,
  GraduationCap,
  Dice3,
  Trophy,
  Search,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BorderBeam } from "@/components/ui/border-beam"
import { useAuth } from "@/context/authcontext"
import { API_BASE_URL, cdnBaseUrl, normalizeChampName } from "@/config"
import { supabase } from "@/lib/supabaseClient"
import type {
  ChampionShortcut,
  ChampionTab,
  LeaderboardShortcut,
  LearnShortcut,
  LearnTab,
  LoldleShortcut,
  ScoutShortcut,
  ShortcutKind,
  ShortcutSlot,
  SummonerShortcut,
} from "./types"

export interface ShortcutConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: ShortcutSlot | null
  onSave: (value: ShortcutSlot) => void
}

type TypeOption = {
  kind: ShortcutKind
  label: string
  desc: string
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  disabledReason?: string
}

// ─── known tab catalogs ─────────────────────────────────────────────
//
// Keep these in sync with src/pages/championdetailpage.tsx and
// src/pages/learnpage.tsx — they're the SAME identifiers the routes
// use, just exposed here as picker options.
const CHAMPION_TABS: { value: ChampionTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "statistics", label: "Statistics" },
  { value: "items", label: "Items" },
  { value: "matchups", label: "Matchups" },
  { value: "guides", label: "Guides" },
  { value: "pros", label: "Pros" },
]
const LEARN_TABS: { value: LearnTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "games", label: "Your Games" },
  { value: "itemization", label: "Itemization" },
  { value: "loldata-ai", label: "LolData AI" },
]
const SCOUT_TABS: { value: ScoutShortcut["tab"]; label: string }[] = [
  { value: "matches", label: "Matches" },
  { value: "live", label: "Live" },
  { value: "leaderboard", label: "Leaderboard" },
  { value: "trending", label: "Trending" },
  { value: "habits", label: "Habits" },
  { value: "champions", label: "Champions" },
]

// ─── main dialog ────────────────────────────────────────────────────

export function ShortcutConfigDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: ShortcutConfigDialogProps) {
  const { session } = useAuth()
  const loggedIn = !!session
  const [stage, setStage] = useState<ShortcutKind | null>(null)

  useEffect(() => {
    if (!open) return
    setStage(initial?.kind ?? null)
  }, [open, initial])

  const types: TypeOption[] = [
    { kind: "champion", label: "Champion", desc: "Open a champion page directly, optionally pinned to a tab.", Icon: Compass },
    { kind: "summoner", label: "Summoner", desc: "Jump straight to a player's profile or season tab.", Icon: User },
    { kind: "scout", label: "Scout lobby", desc: "Open a lobby with optional tab + per-player filter.", Icon: Crosshair },
    {
      kind: "learn",
      label: "Learn",
      desc: "Your personal learn page.",
      Icon: GraduationCap,
      disabledReason: loggedIn ? undefined : "Log in to use this shortcut",
    },
    { kind: "loldle", label: "LoLdle", desc: "Today's LoLdle puzzle.", Icon: Dice3 },
    { kind: "leaderboard", label: "Leaderboard", desc: "Filtered by region + ladder type.", Icon: Trophy },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[95vw] max-w-[560px] bg-transparent shadow-none border-none p-0",
          "top-[14vh] translate-y-0",
          "[&>button]:hidden"
        )}
      >
        {/* ── Cyber TV-power-on entry animation ──
            Two beats: (1) clip-path collapses the card to a single
            horizontal slit at centre, then opens vertically like a CRT
            ramping up — keyframes 0% point → 32% thin slit → 100% full
            open; (2) a bright jade horizontal scanline races across the
            full width during the slit phase and fades out as the card
            fills in, selling the "tube zap" beat. Inner content cross-
            fades after the geometry settles. */}
        <motion.div
          className={cn(
            "relative overflow-hidden rounded-md",
            "bg-black/75 backdrop-blur-xl saturate-150"
          )}
          style={{
            boxShadow:
              "0 24px 70px rgba(0,0,0,0.75), 0 0 36px rgba(0,217,146,0.08), inset 0 0 0 0.5px rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          initial={{
            clipPath: "inset(49.5% 49.5% 49.5% 49.5%)",
            scale: 0.96,
            opacity: 0.85,
          }}
          animate={{
            clipPath: [
              "inset(49.5% 49.5% 49.5% 49.5%)", // 0% — point
              "inset(48% 0% 48% 0%)",            // 32% — full-width slit
              "inset(0% 0% 0% 0%)",              // 100% — open
            ],
            scale: [0.96, 0.98, 1],
            opacity: [0.85, 1, 1],
          }}
          transition={{
            duration: 0.6,
            times: [0, 0.32, 1],
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          {/* CRT zap line — bright jade neon that grows horizontally
              during the slit phase, then fades as the card opens. */}
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

          <BorderBeam duration={9} size={140} />

          {/* Inner content — fades in once the geometry has finished
              opening, so the user reads it as the screen settling
              rather than dropping in all at once. */}
          <motion.div
            className="relative z-10 px-6 py-5 space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.22, delay: 0.42, ease: "easeOut" }}
          >
            <DialogTitle className="sr-only">Configure shortcut</DialogTitle>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-4 bg-jade rounded-full shadow-[0_0_10px_rgba(0,217,146,0.45)]" />
                <span className="text-[12px] font-jetbrains text-flash/60 tracking-[0.22em] uppercase">
                  {stage === null ? "Shortcut · Type" : "Shortcut · Details"}
                </span>
              </div>
              {stage !== null && (
                <button
                  type="button"
                  onClick={() => setStage(null)}
                  className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 hover:text-jade cursor-clicker"
                >
                  ← Change type
                </button>
              )}
            </div>

            {stage === null ? (
              <TypeGrid types={types} onPick={(kind) => setStage(kind)} />
            ) : (
              <TypeForm
                kind={stage}
                initial={initial?.kind === stage ? initial : null}
                onCancel={() => onOpenChange(false)}
                onSave={(v) => {
                  onSave(v)
                  onOpenChange(false)
                }}
                loggedIn={loggedIn}
              />
            )}
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Step 1: type picker grid ───────────────────────────────────────

function TypeGrid({
  types,
  onPick,
}: {
  types: TypeOption[]
  onPick: (kind: ShortcutKind) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {types.map((t) => {
        const disabled = !!t.disabledReason
        return (
          <button
            key={t.kind}
            type="button"
            onClick={() => !disabled && onPick(t.kind)}
            disabled={disabled}
            title={disabled ? t.disabledReason : undefined}
            className={cn(
              "group text-left rounded-sm p-3 border transition-all duration-200 cursor-clicker",
              "bg-filmlight/[0.02] border-hairline/[0.06]",
              "hover:border-jade/35 hover:bg-jade/[0.06]",
              "disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-filmlight/[0.02] disabled:hover:border-hairline/[0.06]"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <t.Icon className="w-4 h-4 text-jade/80" strokeWidth={2} />
              <span className="font-chakrapetch font-bold uppercase tracking-[0.08em] text-[12px] text-flash group-hover:text-jade transition-colors">
                {t.label}
              </span>
            </div>
            <p className="font-jetbrains text-[10px] text-flash/40 leading-snug">
              {t.disabledReason ?? t.desc}
            </p>
          </button>
        )
      })}
    </div>
  )
}

// ─── Step 2: per-type forms ─────────────────────────────────────────

function TypeForm({
  kind,
  initial,
  onCancel,
  onSave,
  loggedIn,
}: {
  kind: ShortcutKind
  initial: ShortcutSlot | null
  onCancel: () => void
  onSave: (value: ShortcutSlot) => void
  loggedIn: boolean
}) {
  switch (kind) {
    case "champion":
      return <ChampionForm initial={asInitial<ChampionShortcut>(initial, "champion")} onCancel={onCancel} onSave={onSave} />
    case "summoner":
      return <SummonerForm initial={asInitial<SummonerShortcut>(initial, "summoner")} onCancel={onCancel} onSave={onSave} />
    case "scout":
      return <ScoutForm initial={asInitial<ScoutShortcut>(initial, "scout")} onCancel={onCancel} onSave={onSave} />
    case "learn":
      return <LearnForm initial={asInitial<LearnShortcut>(initial, "learn")} onCancel={onCancel} onSave={onSave} loggedIn={loggedIn} />
    case "loldle":
      return <LoldleForm initial={asInitial<LoldleShortcut>(initial, "loldle")} onCancel={onCancel} onSave={onSave} />
    case "leaderboard":
      return <LeaderboardForm initial={asInitial<LeaderboardShortcut>(initial, "leaderboard")} onCancel={onCancel} onSave={onSave} />
  }
}

function asInitial<T extends ShortcutSlot>(
  initial: ShortcutSlot | null,
  kind: ShortcutKind
): T | null {
  if (!initial || initial.kind !== kind) return null
  return initial as T
}

// ─── form chrome (shared inputs) ────────────────────────────────────

const labelClass =
  "block font-jetbrains text-[9px] tracking-[0.22em] uppercase text-flash/40 mb-1.5"

const inputClass = cn(
  "w-full bg-filmlight/[0.03] border border-hairline/[0.08] rounded-sm",
  "px-3 py-2 text-[13px] font-jetbrains text-flash",
  "placeholder:text-flash/20",
  "focus:outline-none focus:border-jade/35 focus:bg-filmlight/[0.05]",
  "transition-colors duration-150"
)

function FormFooter({
  saveLabel = "Save shortcut",
  onCancel,
  onSave,
  saveDisabled,
}: {
  saveLabel?: string
  onCancel: () => void
  onSave: () => void
  saveDisabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between pt-2 mt-1 border-t border-hairline/[0.05]">
      <button
        type="button"
        onClick={onCancel}
        className="font-jetbrains text-[10px] tracking-[0.2em] uppercase text-flash/40 hover:text-flash/70 cursor-clicker"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        className={cn(
          "font-chakrapetch text-[12px] tracking-[0.12em] uppercase px-3.5 py-1.5 rounded-sm cursor-clicker",
          "border transition-all duration-200",
          saveDisabled
            ? "border-flash/10 bg-flash/[0.02] text-flash/25 cursor-not-allowed"
            : "border-jade/35 bg-jade/10 text-jade hover:bg-jade/20 hover:border-jade/60 shadow-[0_0_18px_rgba(0,217,146,0.10)]"
        )}
      >
        {saveLabel}
      </button>
    </div>
  )
}

// ─── per-type forms ─────────────────────────────────────────────────

function ChampionForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: ChampionShortcut | null
  onCancel: () => void
  onSave: (v: ChampionShortcut) => void
}) {
  const [name, setName] = useState<string | null>(initial?.championName ?? null)
  const [tab, setTab] = useState<ChampionTab | "">(initial?.tab ?? "")
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Champion</label>
        <ChampionCombobox value={name} onChange={setName} />
      </div>
      <div>
        <label className={labelClass}>Tab (optional)</label>
        <SegmentedPicker
          value={tab}
          options={[
            { value: "", label: "Page (default)" },
            ...CHAMPION_TABS,
          ]}
          onChange={(v) => setTab(v as ChampionTab | "")}
        />
      </div>
      <FormFooter
        onCancel={onCancel}
        onSave={() =>
          name &&
          onSave({
            kind: "champion",
            championName: name,
            tab: tab || null,
          })
        }
        saveDisabled={!name}
      />
    </div>
  )
}

function SummonerForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: SummonerShortcut | null
  onCancel: () => void
  onSave: (v: SummonerShortcut) => void
}) {
  const [region, setRegion] = useState<"EUW" | "NA" | "KR">(
    (initial?.region as "EUW" | "NA" | "KR") ?? "EUW"
  )
  const [name, setName] = useState(initial?.name ?? "")
  const [tag, setTag] = useState(initial?.tag ?? "")
  const [tab, setTab] = useState<"" | "season">(initial?.tab ?? "")

  const valid = name.trim().length >= 1 && tag.trim().length >= 1

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_120px] gap-2 items-end">
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Riot name"
            autoFocus
          />
        </div>
        <div className="self-end text-flash/35 font-jetbrains pb-2.5">#</div>
        <div>
          <label className={labelClass}>Tag</label>
          <input
            className={inputClass}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="EUW"
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Region</label>
        <SegmentedPicker
          value={region}
          options={[
            { value: "EUW", label: "EUW" },
            { value: "NA", label: "NA" },
            { value: "KR", label: "KR" },
          ]}
          onChange={(v) => setRegion(v as "EUW" | "NA" | "KR")}
        />
      </div>
      <div>
        <label className={labelClass}>Open on</label>
        <SegmentedPicker
          value={tab}
          options={[
            { value: "", label: "Profile" },
            { value: "season", label: "This Season" },
          ]}
          onChange={(v) => setTab(v as "" | "season")}
        />
      </div>
      <FormFooter
        onCancel={onCancel}
        onSave={() =>
          onSave({
            kind: "summoner",
            region,
            name: name.trim(),
            tag: tag.trim().toUpperCase(),
            tab: tab || null,
          })
        }
        saveDisabled={!valid}
      />
    </div>
  )
}

function ScoutForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: ScoutShortcut | null
  onCancel: () => void
  onSave: (v: ScoutShortcut) => void
}) {
  // "" sentinel = "Default" (no tab override). Anything else is one of
  // the real tab slugs.
  type ScoutTabValue = NonNullable<ScoutShortcut["tab"]> | ""

  const [slug, setSlug] = useState(initial?.slug ?? "")
  // Lobby's human-readable name, captured when picked from the user's
  // own lobbies. Saved alongside the slug so the rhombus caption can
  // read "Crunchyroll" instead of "MB9Wnfz Lobby". Cleared when the
  // user manually edits the slug — that means they're pointing at a
  // different (probably someone else's) lobby and the previous name
  // would be stale.
  const [lobbyName, setLobbyName] = useState<string | null>(
    initial?.name ?? null
  )
  const [tab, setTab] = useState<ScoutTabValue>(initial?.tab ?? "")
  const [playerFilter, setPlayerFilter] = useState(initial?.playerFilter ?? null)
  const [mainOnly, setMainOnly] = useState(initial?.mainOnly ?? false)

  return (
    <div className="space-y-3">
      {/* Quick-pick from the lobbies the logged-in user created. The
          dropdown is only enabled when the auth session resolves; the
          freeform "Lobby code" input below stays available either way
          so users can still set a shortcut to a friend's lobby. */}
      <div>
        <label className={labelClass}>Your lobbies</label>
        <MyLobbiesCombobox
          value={slug}
          onPick={(s, n) => {
            setSlug(s)
            setLobbyName(n)
          }}
        />
      </div>
      <div>
        <label className={labelClass}>Or paste a lobby code</label>
        <input
          className={inputClass}
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value)
            // Typing a new slug invalidates whatever lobby name was
            // captured — fall back to "<slug> Lobby" until/unless the
            // user picks a known lobby from the dropdown above.
            setLobbyName(null)
          }}
          placeholder="e.g. MB9Wnfz"
        />
      </div>
      <div>
        <label className={labelClass}>Tab (optional)</label>
        <SegmentedPicker
          value={tab}
          options={[
            { value: "", label: "Default" },
            ...SCOUT_TABS.map((t) => ({ value: t.value ?? "", label: t.label })),
          ]}
          onChange={(v) => setTab(v as ScoutTabValue)}
        />
      </div>
      <div>
        <label className={labelClass}>Player filter (optional)</label>
        <ScoutPlayerCombobox
          slug={slug.trim()}
          value={playerFilter ?? null}
          onChange={setPlayerFilter}
        />
      </div>
      <CheckRow
        checked={mainOnly}
        onChange={setMainOnly}
        label="Main account only"
      />
      <FormFooter
        onCancel={onCancel}
        onSave={() =>
          onSave({
            kind: "scout",
            slug: slug.trim(),
            name: lobbyName,
            tab: tab || null,
            playerFilter: playerFilter || null,
            mainOnly,
          })
        }
        saveDisabled={slug.trim().length < 1}
      />
    </div>
  )
}

function LearnForm({
  initial,
  onCancel,
  onSave,
  loggedIn,
}: {
  initial: LearnShortcut | null
  onCancel: () => void
  onSave: (v: LearnShortcut) => void
  loggedIn: boolean
}) {
  const [tab, setTab] = useState<LearnTab | "">(initial?.tab ?? "")
  if (!loggedIn) {
    return (
      <div className="space-y-3">
        <p className="font-jetbrains text-[12px] text-flash/55 leading-relaxed">
          This shortcut needs you to be logged in — the learn page is
          tied to your account. Log in first, then come back to set it
          up.
        </p>
        <FormFooter onCancel={onCancel} onSave={onCancel} saveLabel="OK" />
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Tab</label>
        <SegmentedPicker
          value={tab}
          options={[
            { value: "", label: "Default" },
            ...LEARN_TABS,
          ]}
          onChange={(v) => setTab(v as LearnTab | "")}
        />
      </div>
      <FormFooter
        onCancel={onCancel}
        onSave={() =>
          onSave({ kind: "learn", tab: (tab as LearnTab) || null })
        }
      />
    </div>
  )
}

function LoldleForm({
  onCancel,
  onSave,
}: {
  initial: LoldleShortcut | null
  onCancel: () => void
  onSave: (v: LoldleShortcut) => void
}) {
  return (
    <div className="space-y-3">
      <p className="font-jetbrains text-[12px] text-flash/55 leading-relaxed">
        Nothing to configure — this shortcut opens today's LoLdle
        puzzle. Hit save to drop it into the slot.
      </p>
      <FormFooter
        onCancel={onCancel}
        onSave={() => onSave({ kind: "loldle" })}
      />
    </div>
  )
}

function LeaderboardForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: LeaderboardShortcut | null
  onCancel: () => void
  onSave: (v: LeaderboardShortcut) => void
}) {
  const [region, setRegion] = useState<"EUW" | "NA" | "KR">(
    initial?.region ?? "EUW"
  )
  const [ladder, setLadder] = useState<"solo" | "flex">(
    initial?.ladder ?? "solo"
  )
  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Region</label>
        <SegmentedPicker
          value={region}
          options={[
            { value: "EUW", label: "EUW" },
            { value: "NA", label: "NA" },
            { value: "KR", label: "KR" },
          ]}
          onChange={(v) => setRegion(v as "EUW" | "NA" | "KR")}
        />
      </div>
      <div>
        <label className={labelClass}>Ladder</label>
        <SegmentedPicker
          value={ladder}
          options={[
            { value: "solo", label: "Solo / Duo" },
            { value: "flex", label: "Flex" },
          ]}
          onChange={(v) => setLadder(v as "solo" | "flex")}
        />
      </div>
      <FormFooter
        onCancel={onCancel}
        onSave={() => onSave({ kind: "leaderboard", region, ladder })}
      />
    </div>
  )
}

// ─── tiny shared inputs ─────────────────────────────────────────────

function SegmentedPicker({
  value,
  options,
  onChange,
}: {
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 h-9 rounded-sm border font-chakrapetch text-[11px] tracking-[0.15em] uppercase cursor-clicker",
              "transition-all duration-200",
              active
                ? "text-jade bg-jade/10 border-jade/30"
                : "text-flash/40 border-hairline/[0.06] hover:text-flash/65 hover:border-hairline/[0.14] bg-filmdark/30"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 w-full text-left cursor-clicker py-1"
    >
      <span
        className={cn(
          "w-4 h-4 rounded-[3px] border flex items-center justify-center transition-all duration-200",
          checked
            ? "border-jade bg-jade/20 shadow-[0_0_8px_rgba(0,217,146,0.3)]"
            : "border-flash/25 bg-filmlight/[0.02]"
        )}
      >
        {checked && (
          <svg viewBox="0 0 8 7" className="w-2.5 h-2.5">
            <polyline
              points="1,4 3,6 7,1"
              fill="none"
              stroke="#00d992"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="font-jetbrains text-[11px] tracking-[0.1em] text-flash/65">
        {label}
      </span>
    </button>
  )
}

// ─── ChampionCombobox ────────────────────────────────────────────────
//
// Autocomplete dropdown of every champion in Data Dragon. Pasted-down
// open state, search-as-you-type, click to select. We pre-hydrate the
// list from the CDN once and cache it on the module level so opening
// multiple times in a session doesn't re-hit the network.

let CHAMP_CACHE: { id: string; name: string }[] | null = null

function ChampionCombobox({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [champs, setChamps] = useState<{ id: string; name: string }[]>(
    CHAMP_CACHE ?? []
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Hydrate once. Fault-tolerant — empty list just means the picker
  // shows "no champions loaded" and falls back to typing.
  useEffect(() => {
    if (CHAMP_CACHE) return
    fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.data) return
        const list = Object.values(data.data).map((c: any) => ({
          id: c.key as string,
          name: c.id as string,
        }))
        list.sort((a, b) => a.name.localeCompare(b.name))
        CHAMP_CACHE = list
        setChamps(list)
      })
      .catch(() => {})
  }, [])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return champs.slice(0, 20)
    return champs.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 20)
  }, [champs, query])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          inputClass,
          "flex items-center gap-2 text-left h-10",
          "hover:border-jade/25"
        )}
      >
        {value ? (
          <>
            <img
              src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(value)}.png`}
              alt=""
              className="w-6 h-6 rounded-full ring-1 ring-jade/30"
              draggable={false}
            />
            <span className="text-flash font-chakrapetch tracking-wide uppercase text-[12px]">
              {value}
            </span>
          </>
        ) : (
          <span className="text-flash/35 text-[13px]">Pick a champion…</span>
        )}
        <ChevronDown
          className={cn(
            "ml-auto w-4 h-4 text-flash/35 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 mt-2 z-50 rounded-sm overflow-hidden",
            "bg-black/90 backdrop-blur-xl border border-hairline/10",
            "shadow-[0_16px_44px_rgba(var(--c-shadow),0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.05)]"
          )}
        >
          <div className="p-2 border-b border-hairline/[0.06]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-flash/25 pointer-events-none" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search champion…"
                className={cn(
                  "w-full bg-filmlight/[0.03] border border-hairline/[0.06] rounded-sm",
                  "pl-8 pr-2 py-1.5 text-[12px] font-jetbrains text-flash placeholder:text-flash/20",
                  "focus:outline-none focus:border-jade/30"
                )}
              />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto cyber-scrollbar p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-[10px] font-jetbrains text-flash/30 uppercase tracking-[0.2em] text-center">
                No matches
              </div>
            ) : (
              filtered.map((c) => {
                const active = value === c.name
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      onChange(c.name)
                      setOpen(false)
                      setQuery("")
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-clicker text-left",
                      "transition-colors duration-100",
                      active
                        ? "bg-jade/[0.10] text-jade"
                        : "text-flash/80 hover:bg-filmlight/[0.04] hover:text-jade"
                    )}
                  >
                    <img
                      src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(c.name)}.png`}
                      alt=""
                      className="w-5 h-5 rounded-full ring-1 ring-hairline/[0.08]"
                      draggable={false}
                    />
                    <span className="font-chakrapetch text-[12px] tracking-wide">
                      {c.name}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ScoutPlayerCombobox ─────────────────────────────────────────────
//
// Pulls the chosen lobby's player list via the public lobby endpoint,
// then renders a clickable dropdown. While the slug is empty or the
// fetch is in flight, falls back to a disabled "Enter a lobby first"
// trigger so the user can't type garbage into the URL by accident.

type LobbyPlayerOption = {
  id: string
  displayName: string
}

function ScoutPlayerCombobox({
  slug,
  value,
  onChange,
}: {
  slug: string
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [players, setPlayers] = useState<LobbyPlayerOption[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Re-fetch whenever the slug changes (debounced lightly via the
  // 350ms timeout so typing 7 chars doesn't fire 7 requests).
  useEffect(() => {
    setPlayers(null)
    if (slug.length < 3) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      setLoading(true)
      fetch(`${API_BASE_URL}/api/scout/lobby/${encodeURIComponent(slug)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.players) {
            setPlayers([])
            return
          }
          setPlayers(
            (d.players as any[]).map((p) => ({
              id: p.id,
              displayName: p.displayName ?? p.display_name ?? "Player",
            }))
          )
        })
        .catch(() => setPlayers([]))
        .finally(() => setLoading(false))
    }, 350)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [slug])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const disabled = slug.trim().length < 3 || (players != null && players.length === 0)
  const activeName =
    value && players?.find((p) => p.id === value)?.displayName

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          inputClass,
          "flex items-center gap-2 text-left h-10",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && "hover:border-jade/25"
        )}
      >
        <span
          className={cn(
            value ? "text-flash font-chakrapetch tracking-wide uppercase text-[12px]" : "text-flash/35 text-[13px]"
          )}
        >
          {loading
            ? "Loading…"
            : disabled
              ? slug.trim().length < 3
                ? "Enter a lobby code first"
                : "No players in this lobby"
              : activeName ?? "Any player"}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto w-4 h-4 text-flash/35 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && players && (
        <div
          className={cn(
            "absolute left-0 right-0 mt-2 z-50 rounded-sm overflow-hidden",
            "bg-black/90 backdrop-blur-xl border border-hairline/10",
            "shadow-[0_16px_44px_rgba(var(--c-shadow),0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.05)]"
          )}
        >
          <div className="max-h-[200px] overflow-y-auto cyber-scrollbar p-1">
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setOpen(false)
              }}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-sm font-chakrapetch text-[12px] tracking-wide cursor-clicker",
                !value
                  ? "bg-jade/[0.10] text-jade"
                  : "text-flash/55 hover:bg-filmlight/[0.04] hover:text-jade"
              )}
            >
              Any player
            </button>
            {players.map((p) => {
              const active = value === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onChange(p.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-sm font-chakrapetch text-[12px] tracking-wide cursor-clicker",
                    active
                      ? "bg-jade/[0.10] text-jade"
                      : "text-flash/80 hover:bg-filmlight/[0.04] hover:text-jade"
                  )}
                >
                  {p.displayName}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MyLobbiesCombobox ───────────────────────────────────────────────
//
// Dropdown listing every scout lobby the logged-in user created
// (GET /api/scout/my-lobbies, gated by their supabase session token).
// Selecting one writes its slug into the parent form, so the user
// never has to copy a code by hand for their own lobbies. When the
// user isn't logged in, has no lobbies, or the fetch fails, the
// trigger shows a quiet hint instead of a dropdown — the freeform
// "lobby code" input below stays available as the fallback either
// way, so this picker is purely additive.

type MyLobby = { slug: string; name: string }

function MyLobbiesCombobox({
  value,
  onPick,
}: {
  value: string
  onPick: (slug: string, name: string) => void
}) {
  const [lobbies, setLobbies] = useState<MyLobby[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) {
          if (!cancelled) {
            setLobbies([])
            setLoading(false)
          }
          return
        }
        const res = await fetch(`${API_BASE_URL}/api/scout/my-lobbies`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { lobbies?: MyLobby[] }
        if (!cancelled) {
          setLobbies(json.lobbies ?? [])
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setLobbies([])
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const hasLobbies = lobbies != null && lobbies.length > 0
  const disabled = !hasLobbies && !loading
  const activeLobby = lobbies?.find((l) => l.slug === value)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          inputClass,
          "flex items-center gap-2 text-left h-10",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "hover:border-jade/25"
        )}
      >
        <span
          className={cn(
            activeLobby
              ? "text-flash font-chakrapetch tracking-wide text-[12px]"
              : "text-flash/40 text-[13px]"
          )}
        >
          {loading
            ? "Checking your lobbies…"
            : !hasLobbies
              ? "No lobbies of yours — paste a code below"
              : activeLobby
                ? activeLobby.name
                : `Pick one of your ${lobbies!.length} lobbies…`}
        </span>
        <ChevronDown
          className={cn(
            "ml-auto w-4 h-4 text-flash/35 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && hasLobbies && (
        <div
          className={cn(
            "absolute left-0 right-0 mt-2 z-50 rounded-sm overflow-hidden",
            "bg-black/90 backdrop-blur-xl border border-hairline/10",
            "shadow-[0_16px_44px_rgba(var(--c-shadow),0.7),inset_0_0_0_0.5px_rgba(255,255,255,0.05)]"
          )}
        >
          <div className="max-h-[240px] overflow-y-auto cyber-scrollbar p-1">
            {lobbies!.map((l) => {
              const active = l.slug === value
              return (
                <button
                  key={l.slug}
                  type="button"
                  onClick={() => {
                    onPick(l.slug, l.name)
                    setOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-clicker text-left",
                    "transition-colors duration-100",
                    active
                      ? "bg-jade/[0.10] text-jade"
                      : "text-flash/80 hover:bg-filmlight/[0.04] hover:text-jade"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-chakrapetch text-[12px] tracking-wide truncate">
                      {l.name}
                    </div>
                    <div className="font-jetbrains text-[9px] tracking-[0.15em] text-flash/35 uppercase truncate">
                      {l.slug}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
