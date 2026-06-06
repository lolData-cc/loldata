// src/components/matchreplay/timelineApi.ts
//
// React hook to fetch a match timeline from the loldata backend.
// The backend caches per-match in-memory, so re-opens of the same
// match are basically free. We still keep a tiny module-level cache
// here so that closing/reopening the dialog doesn't re-incur even
// the network round-trip.
import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/config";
const moduleCache = new Map();
export function useMatchTimeline(matchId, region) {
    const [state, setState] = useState({
        data: matchId && moduleCache.has(matchId) ? moduleCache.get(matchId) : null,
        loading: false,
        error: null,
    });
    // Abort previous fetch when matchId changes.
    const abortRef = useRef(null);
    useEffect(() => {
        if (!matchId || !region) {
            setState({ data: null, loading: false, error: null });
            return;
        }
        const cached = moduleCache.get(matchId);
        if (cached) {
            setState({ data: cached, loading: false, error: null });
            return;
        }
        abortRef.current?.abort();
        const ac = new AbortController();
        abortRef.current = ac;
        setState({ data: null, loading: true, error: null });
        (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/matchtimeline`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ matchId, region }),
                    signal: ac.signal,
                });
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                const json = await res.json();
                const tl = json?.timeline;
                if (!tl?.info?.frames?.length) {
                    throw new Error("Empty timeline payload");
                }
                moduleCache.set(matchId, tl);
                if (!ac.signal.aborted)
                    setState({ data: tl, loading: false, error: null });
            }
            catch (e) {
                if (ac.signal.aborted)
                    return;
                const msg = e?.message ?? String(e);
                setState({ data: null, loading: false, error: msg });
            }
        })();
        return () => { ac.abort(); };
    }, [matchId, region]);
    return state;
}
