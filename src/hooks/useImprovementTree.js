import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
// module cache so switching tabs doesn't refetch a heavy computation
let cache = null;
const TTL = 5 * 60_000;
export function useImprovementTree(puuid, region) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const load = useCallback(async (role) => {
        if (!puuid || !region) {
            setLoading(false);
            return;
        }
        const key = `${puuid}:${role ?? "_"}`;
        if (!role && cache && cache.key.startsWith(`${puuid}:`) && Date.now() - cache.ts < TTL) {
            setData(cache.data);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await globalThis.fetch(`${API_BASE_URL}/api/learn/improvement-tree`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ puuid, region, ...(role ? { role } : {}) }),
            });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const json = (await res.json());
            if (!json.needsPathSelection && !json.comingSoon)
                cache = { key, data: json, ts: Date.now() };
            setData(json);
        }
        catch (e) {
            setError(e?.message ?? "Failed to load tree");
        }
        finally {
            setLoading(false);
        }
    }, [puuid, region]);
    useEffect(() => { load(); }, [load]);
    // choosing a path forces a fresh fetch with the role (persists + recomputes)
    const choosePath = useCallback((role) => { cache = null; return load(role); }, [load]);
    return { data, loading, error, reload: load, choosePath };
}
