
export function formatRank(rawRank: string | undefined): string {
  if (!rawRank) return "unranked"; // fallback

  const mainRank = rawRank.split(" ")[0].toLowerCase();
  return mainRank;
}