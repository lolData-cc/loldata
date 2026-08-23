import { useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Sends the build path you are LOOKING AT to the desktop app.
 *
 * Saved as that champion's profile rather than written anywhere in League: a
 * build is a plan for a game that has not started, unlike a rune page, which
 * the client can hold right now. Once saved, the app walks you through the
 * order in game and tells you when the next item becomes affordable.
 *
 * The item order comes from the same function the strip on screen draws with,
 * so the app cannot receive a different build to the one you can see — the
 * failure mode that would matter most here.
 *
 * Like the rune button, this never claims the import happened. A browser cannot
 * tell whether a custom protocol was handled, and every trick for guessing is
 * wrong often enough to be worse than saying nothing.
 */
type RunePage = {
  primaryStyle: number
  subStyle: number
  primary: number[]
  secondary: number[]
  shards: number[]
}

export function buildBuildLink(
  champion: string,
  patch: string | null,
  items: number[],
  page?: RunePage,
): string {
  const q = new URLSearchParams({ champion, items: items.slice(0, 6).join(",") })
  if (patch) q.set("patch", patch)

  // The runes ride along when the page on screen is complete. The app drops a
  // malformed page and keeps the items, so a half-page never costs the build.
  if (page && page.primary?.length === 4 && page.secondary?.length === 2 && page.shards?.length === 3) {
    q.set("primary", String(page.primaryStyle))
    q.set("sub", String(page.subStyle))
    q.set("perks", [...page.primary, ...page.secondary, ...page.shards].join(","))
  }

  return `loldata://build?${q.toString()}`
}

export default function BuildImportButton({
  champion,
  patch,
  items,
  page,
  className,
}: {
  champion: string
  patch: string | null
  items: number[]
  page?: RunePage
  className?: string
}) {
  const [sent, setSent] = useState(false)

  // Nothing to import is not an error state, it is a button that should not be
  // there — a build of zero items would save an empty profile that can never
  // produce a notice.
  if (!items.length) return null

  const send = () => {
    window.location.href = buildBuildLink(champion, patch, items, page)
    setSent(true)
    window.setTimeout(() => setSent(false), 2600)
  }

  return (
    <button
      type="button"
      onClick={send}
      title={`Needs the loldata desktop app · saves this ${items.length}-item order as your ${champion} build`}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-[3px] px-3 py-1.5",
        "font-chakrapetch text-[11px] font-bold uppercase tracking-[0.12em]",
        "text-jade transition-colors cursor-pointer",
        "bg-jade/[0.10] hover:bg-jade/[0.17]",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-full w-full skew-x-[-20deg] bg-gradient-to-r from-transparent via-jade/25 to-transparent transition-transform duration-700 group-hover:translate-x-[200%]"
      />
      <span className="relative">{sent ? "opening app…" : "import build"}</span>
    </button>
  )
}
