// src/components/home-shortcuts/types.ts
//
// Discriminated union for the 3-slot homepage shortcut bar. Each slot
// is either `null` (empty rhombus showing a "+" affordance) or one of
// the 6 shortcut types below. Storage layer serialises the array
// verbatim, so adding new fields here means bumping a migration step
// in storage.ts.
/** Compute the URL a shortcut should navigate to when clicked. Keeps
 *  the routing logic in one place so the rhombus components stay
 *  presentational. */
export function shortcutHref(s) {
    switch (s.kind) {
        case "champion": {
            const base = `/champions/${encodeURIComponent(s.championName)}`;
            return s.tab ? `${base}/${s.tab}` : base;
        }
        case "summoner": {
            const slug = `${s.name.replace(/\s+/g, "+")}-${s.tag.toUpperCase()}`;
            const base = `/summoners/${s.region.toLowerCase()}/${slug}`;
            return s.tab === "season" ? `${base}/season` : base;
        }
        case "scout": {
            let path = `/scout/${s.slug}`;
            if (s.tab)
                path += `/${s.tab}`;
            const qs = new URLSearchParams();
            if (s.playerFilter)
                qs.set("player", s.playerFilter);
            if (s.mainOnly)
                qs.set("main", "1");
            const q = qs.toString();
            return q ? `${path}?${q}` : path;
        }
        case "learn":
            return s.tab ? `/learn/${s.tab}` : "/learn";
        case "loldle":
            return "/dle";
        case "leaderboard":
            return `/leaderboards?region=${s.region}&ladder=${s.ladder}`;
    }
}
// Tab label maps — keep human-readable strings out of UI components.
const CHAMPION_TAB_LABEL = {
    overview: "Overview",
    statistics: "Statistics",
    items: "Items",
    matchups: "Matchups",
    guides: "Guides",
    pros: "Pros",
};
const LEARN_TAB_LABEL = {
    overview: "Overview",
    games: "Your Games",
    itemization: "Itemization",
    "loldata-ai": "LolData AI",
};
const SCOUT_TAB_LABEL = {
    matches: "Matches",
    live: "Live",
    leaderboard: "Leaderboard",
    trending: "Trending",
    habits: "Habits",
    champions: "Champions",
};
/** Compact label shown under the filled rhombus. For a champion with
 *  no tab specified we read "Ahri Page" — emphasises the destination
 *  rather than mirroring "Overview" (the implicit default). */
export function shortcutLabel(s) {
    switch (s.kind) {
        case "champion":
            return s.tab
                ? `${s.championName} · ${CHAMPION_TAB_LABEL[s.tab]}`
                : `${s.championName} Page`;
        case "summoner":
            return s.tab === "season"
                ? `${s.name}#${s.tag} · Season`
                : `${s.name}#${s.tag}`;
        case "scout": {
            // Prefer the human-readable lobby name captured at save time;
            // fall back to "<slug> Lobby" only when the user pasted a
            // freeform code whose name we never resolved.
            const head = s.name && s.name.trim().length > 0 ? s.name : `${s.slug} Lobby`;
            return s.tab
                ? `${head} · ${SCOUT_TAB_LABEL[s.tab] ?? s.tab}`
                : head;
        }
        case "learn":
            return s.tab ? `Learn · ${LEARN_TAB_LABEL[s.tab]}` : "Learn";
        case "loldle":
            return "LoLdle";
        case "leaderboard":
            return `${s.region} · ${s.ladder === "solo" ? "Solo" : "Flex"}`;
    }
}
/** Short tag shown at the top of the rhombus (3-4 chars max, mono). */
export function shortcutTag(s) {
    switch (s.kind) {
        case "champion":
            return "CHAMP";
        case "summoner":
            return "SUMM";
        case "scout":
            return "SCOUT";
        case "learn":
            return "LEARN";
        case "loldle":
            return "DLE";
        case "leaderboard":
            return "LDR";
    }
}
