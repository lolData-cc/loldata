// A tiny corner badge for a champion/item icon showing how it changed in the
// LATEST patch: buff ↑ (jade), nerf ↓ (red), adjusted ⚙ (neutral). Renders
// nothing if the entity wasn't touched this patch.
//
// Drop it INSIDE a `position: relative` element that wraps the icon:
//   <span className="relative inline-block">
//     <img src={champIcon(name)} .../>
//     <PatchTag kind="champion" id={name} />
//   </span>
//
// The latest-patch map is fetched ONCE and cached process-wide (a module
// singleton), so sprinkling <PatchTag> across hundreds of icons costs one fetch.

import { useEffect, useState } from "react"
import { ArrowUp, ArrowDown, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { BOX_API_BASE_URL } from "@/config"

type Dir = "buff" | "nerf" | "adjust"
type PatchMap = { patch: string | null; champions: Record<string, Dir>; items: Record<string, Dir> }

const normChamp = (s: string | number) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "")

let _cache: PatchMap | null = null
let _promise: Promise<PatchMap> | null = null
function loadMap(): Promise<PatchMap> {
  if (_cache) return Promise.resolve(_cache)
  if (!_promise) {
    _promise = fetch(`${BOX_API_BASE_URL}/api/patch-notes/latest-map`)
      .then((r) => r.json())
      .then((d: PatchMap) => {
        // normalize champion keys so "Kai'Sa" / "Kaisa" / "kaisa" all resolve.
        const champions: Record<string, Dir> = {}
        for (const [k, v] of Object.entries(d?.champions || {})) champions[normChamp(k)] = v
        _cache = { patch: d?.patch ?? null, champions, items: d?.items || {} }
        return _cache
      })
      .catch(() => {
        _cache = { patch: null, champions: {}, items: {} }
        return _cache
      })
  }
  return _promise
}

/** Lower-level hook: the latest-patch direction for one entity, or null. */
export function usePatchDirection(kind: "champion" | "item", id?: string | number | null): Dir | null {
  const [map, setMap] = useState<PatchMap | null>(_cache)
  useEffect(() => {
    if (_cache) { setMap(_cache); return }
    let alive = true
    loadMap().then((m) => alive && setMap(m))
    return () => { alive = false }
  }, [])
  if (!map || id == null || id === "") return null
  return kind === "champion" ? map.champions[normChamp(id)] ?? null : map.items[String(id)] ?? null
}

const CFG: Record<Dir, { ring: string; bg: string; fg: string; label: string }> = {
  buff: { ring: "ring-[#00d992]/55", bg: "bg-[#04140e]", fg: "text-[#00d992]", label: "Buffed this patch" },
  nerf: { ring: "ring-[#d63336]/55", bg: "bg-[#170809]", fg: "text-[#ff5b5e]", label: "Nerfed this patch" },
  adjust: { ring: "ring-flash/40", bg: "bg-[#0c1012]", fg: "text-flash/80", label: "Adjusted this patch" },
}

const CORNER: Record<string, string> = {
  tr: "-top-1 -right-1",
  tl: "-top-1 -left-1",
  br: "-bottom-1 -right-1",
  bl: "-bottom-1 -left-1",
}

export function PatchTag({ kind, id, size = 13, corner = "tr", className }: {
  kind: "champion" | "item"
  id?: string | number | null
  size?: number
  corner?: "tr" | "tl" | "br" | "bl"
  className?: string
}) {
  const dir = usePatchDirection(kind, id)
  if (!dir) return null
  const c = CFG[dir]
  const Icon = dir === "buff" ? ArrowUp : dir === "nerf" ? ArrowDown : Settings2
  return (
    <span
      title={c.label}
      aria-label={c.label}
      className={cn(
        "pointer-events-none absolute z-20 grid place-items-center rounded-full ring-1 shadow-[0_1px_4px_rgba(0,0,0,0.6)]",
        CORNER[corner], c.ring, c.bg, c.fg, className
      )}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.64)} strokeWidth={3.4} />
    </span>
  )
}
