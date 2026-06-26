// useChampions — single source of truth for the champion roster.
//
// Every champion picker on the site used to fetch `champion.json` independently.
// This hook fetches it ONCE (module-level cache + in-flight promise dedupe) and
// hands back a normalized, alphabetically sorted list. Icons and the champion
// page route both key off `slug` (the ddragon id, e.g. "Aatrox" / "MonkeyKing").
import { useEffect, useState } from "react";
import { cdnBaseUrl, champDisplayName } from "@/config";
let _cache = null;
let _promise = null;
export function loadChampions() {
    if (_cache)
        return Promise.resolve(_cache);
    if (_promise)
        return _promise;
    _promise = fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
        .then((r) => {
        if (!r.ok)
            throw new Error("Failed to load champion.json");
        return r.json();
    })
        .then((data) => {
        const list = Object.values(data.data)
            .map((c) => ({ slug: c.id, key: Number(c.key), name: champDisplayName(c.id) }))
            .sort((a, b) => a.name.localeCompare(b.name));
        _cache = list;
        return list;
    })
        .catch((e) => {
        _promise = null; // allow a retry on next caller
        throw e;
    });
    return _promise;
}
export function useChampions() {
    const [champions, setChampions] = useState(_cache ?? []);
    const [loading, setLoading] = useState(!_cache);
    useEffect(() => {
        if (_cache)
            return;
        let alive = true;
        loadChampions()
            .then((l) => alive && (setChampions(l), setLoading(false)))
            .catch(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);
    return { champions, loading };
}
