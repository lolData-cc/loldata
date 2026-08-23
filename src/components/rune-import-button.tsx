import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Sends the rune page you are LOOKING AT to the desktop app.
 *
 * The link carries the exact page rather than a champion to go and look up,
 * because the sidebar lets you pick a variant — importing "the most played one"
 * while a different one is on screen would be the wrong page delivered
 * confidently.
 *
 * There is no reliable way to tell from a browser whether the app is
 * installed: navigating to an unhandled protocol fails silently in every
 * engine, and the focus tricks people use to guess are wrong often enough to
 * be worse than saying nothing. So the requirement is stated up front rather
 * than detected, and the button never claims something happened.
 */
type RunePage = {
  keystone: number
  primaryStyle: number
  subStyle: number
  primary: number[]
  secondary: number[]
  shards: number[]
}

export function buildRuneLink(champion: string, patch: string | null, page: RunePage): string {
  // Four primary, two secondary, three shards — the client's own shape, and
  // the order the app validates against.
  const perks = [...page.primary, ...page.secondary, ...page.shards]
  const q = new URLSearchParams({
    champion,
    primary: String(page.primaryStyle),
    sub: String(page.subStyle),
    perks: perks.join(","),
  })
  if (patch) q.set("patch", patch)
  return `loldata://runes?${q.toString()}`
}

export default function RuneImportButton({
  champion,
  patch,
  page,
  className,
}: {
  champion: string
  patch: string | null
  page: RunePage | undefined
  className?: string
}) {
  const [sent, setSent] = useState(false)

  if (!page) return null

  const complete =
    page.primary?.length === 4 && page.secondary?.length === 2 && page.shards?.length === 3
  if (!complete) return null

  const send = () => {
    window.location.href = buildRuneLink(champion, patch, page)
    // Says the handoff happened, not that the import did — the browser cannot
    // know the second one, and a false "imported" would be worse than nothing.
    setSent(true)
    window.setTimeout(() => setSent(false), 2600)
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <button
        type="button"
        onClick={send}
        title={`Set this page as ${champion} - LolData in your client`}
        className={cn(
          "group relative overflow-hidden rounded-[3px] px-3 py-1.5",
          "font-chakrapetch text-[11px] font-bold uppercase tracking-[0.12em]",
          "text-jade transition-colors cursor-pointer",
          "bg-jade/[0.10] hover:bg-jade/[0.17]",
        )}
        // A left rail rather than an outline — the site does not do pale borders.
        style={{ boxShadow: "inset 2px 0 0 0 #00d992" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-full"
          style={{ background: "linear-gradient(90deg,transparent,rgba(0,217,146,0.22),transparent)" }}
        />
        <span className="relative">{sent ? "opening app" : "import runes"}</span>
      </button>

      <span className="font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/25">
        needs the desktop app
      </span>
    </div>
  )
}
