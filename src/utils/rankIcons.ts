import { getLegacyRankIcons } from "@/lib/uiPrefs"

const CDN_ROOT = "https://cdn2.loldata.cc"

function formatRank(rank: string): string {
  const tierOnly = rank.split(" ")[0] // es. "Diamond i" -> "Diamond"
  return tierOnly.charAt(0).toLowerCase() + tierOnly.slice(1).toLowerCase()
}

export function getRankImage(rank: string | undefined): string {
  if (!rank || rank.toLowerCase() === "unranked") return "/img/unranked.png"
  const folder = getLegacyRankIcons() ? "ranks-legacy" : "ranks"
  return `${CDN_ROOT}/${folder}/${formatRank(rank)}.png`
}
