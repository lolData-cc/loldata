// src/lib/recentSearchedProfiles.ts
//
// Shared utilities for the localStorage-backed "recently searched
// profiles" trail used by the search dialog. Lives outside the dialog
// so other surfaces (most importantly the summoner page) can patch
// the trail with the icon/rank they discover at load time — even if
// the trail entry was originally saved by a manual Name#Tag submit
// that had no enrichment data available.
//
// Storage key is shared with searchdialog.tsx as a literal — keep them
// in sync if it ever changes.
const RECENT_KEY = "recentSearchedProfiles";
/** Broadcast on any in-memory change so an already-open dialog can
 *  rehydrate without waiting for the next reopen. CustomEvent works
 *  same-tab (the storage event only fires cross-tab). */
const UPDATED_EVENT = "recentSearchedProfiles:updated";
/** Read the current trail. Returns [] on missing/corrupt JSON or SSR. */
export function readRecentProfiles() {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
/**
 * Patch a single trail entry by (name, tag, region) lookup. Only
 * fields that are currently null get filled in — we never overwrite
 * already-known data. Designed to be safe to call from anywhere with
 * partial info; it's a no-op when the entry isn't in the trail.
 *
 * Dispatches a same-tab custom event after a successful write so any
 * open dialog can rehydrate its state without waiting for the user to
 * close & reopen it.
 */
export function enrichRecentProfile(name, tag, region, patch) {
    if (typeof window === "undefined")
        return;
    const cur = readRecentProfiles();
    if (cur.length === 0)
        return;
    const targetKey = `${name}#${tag}#${region}`.toLowerCase();
    let changed = false;
    const next = cur.map((r) => {
        const k = `${r.name}#${r.tag}#${r.region}`.toLowerCase();
        if (k !== targetKey)
            return r;
        const mergedIcon = r.icon_id == null && patch.icon_id != null ? patch.icon_id : r.icon_id;
        const mergedRank = (r.rank == null || r.rank === "") && patch.rank != null && patch.rank !== ""
            ? patch.rank
            : r.rank;
        if (mergedIcon === r.icon_id && mergedRank === r.rank)
            return r;
        changed = true;
        return { ...r, icon_id: mergedIcon, rank: mergedRank };
    });
    if (!changed)
        return;
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
    }
    catch {
        /* localStorage quota — keep silent, the cache simply stays stale */
    }
}
/**
 * Drop a trail entry by (name, tag, region). No-op when the entry
 * isn't present. Dispatches the same update event as enrichment so an
 * open dialog rehydrates immediately — the swipe-to-forget gesture in
 * the search dialog leans on this for the cache-side write while
 * letting framer-motion's exit animation handle the visual slide-out.
 */
export function removeRecentProfile(name, tag, region) {
    if (typeof window === "undefined")
        return;
    const cur = readRecentProfiles();
    if (cur.length === 0)
        return;
    const targetKey = `${name}#${tag}#${region}`.toLowerCase();
    const next = cur.filter((r) => `${r.name}#${r.tag}#${r.region}`.toLowerCase() !== targetKey);
    if (next.length === cur.length)
        return;
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(UPDATED_EVENT));
    }
    catch {
        /* localStorage quota — silent */
    }
}
/** Subscribe to same-tab updates. Returns the unsubscribe function. */
export function subscribeRecentProfiles(handler) {
    if (typeof window === "undefined")
        return () => { };
    window.addEventListener(UPDATED_EVENT, handler);
    return () => window.removeEventListener(UPDATED_EVENT, handler);
}
export { RECENT_KEY, UPDATED_EVENT };
