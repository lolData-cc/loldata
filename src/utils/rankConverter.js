export function formatRank(rawRank) {
    if (!rawRank)
        return "unranked"; // fallback
    const mainRank = rawRank.split(" ")[0].toLowerCase();
    return mainRank;
}
