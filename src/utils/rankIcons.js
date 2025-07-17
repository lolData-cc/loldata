const RANK_IMAGE_BASE_URL = "https://cdn.loldata.cc/15.13.1/ranks";
function formatRank(rank) {
    const tierOnly = rank.split(" ")[0]; // es. "Diamond i" → "Diamond"
    return tierOnly.charAt(0).toLowerCase() + tierOnly.slice(1).toLowerCase();
}
export function getRankImage(rank) {
    if (!rank)
        return "/fallback.png";
    return `${RANK_IMAGE_BASE_URL}/${formatRank(rank)}.png`;
}
