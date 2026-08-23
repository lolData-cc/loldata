import { useState, useEffect } from "react";
// Champion stats come from the match-data box (api2), where the ingest grows the
// data — NOT api.loldata.cc/local-backend, which read the frozen Cloud snapshot.
import { BOX_API_BASE_URL as API_BASE_URL } from "@/config";
const cache = new Map();
const CACHE_TTL = 60_000; // 60s
export function useChampionOtpRanking(championName, region) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!championName)
            return;
        const key = `${championName}:${region}`;
        const cached = cache.get(key);
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
            setData(cached.data);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        fetch(`${API_BASE_URL}/api/champion/otp-ranking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ championName, region }),
        })
            .then(async (res) => {
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            cache.set(key, { data: json, ts: Date.now() });
            setData(json);
        })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [championName, region]);
    return { data, loading, error };
}
