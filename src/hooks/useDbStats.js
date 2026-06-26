// useDbStats — the platform's live heartbeat for the homepage.
//
// Fetches the one-shot overview (total matches, DB size, table sizes) and then
// subscribes to the box's WebSocket, which pushes a { matches, ratePerMin } tick
// every ~5s as the ingest runs. Reads BOX_API_BASE_URL so it reflects the box
// (where the data actually grows) in both dev and prod. Auto-reconnects.
import { useEffect, useRef, useState } from "react";
import { BOX_API_BASE_URL } from "@/config";
const httpBase = BOX_API_BASE_URL;
const wsBase = httpBase
    ? httpBase.replace(/^http/, "ws")
    : (typeof window !== "undefined"
        ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
        : "");
export function useDbStats() {
    const [overview, setOverview] = useState(null);
    const [live, setLive] = useState(null);
    const [status, setStatus] = useState("connecting");
    // one-shot snapshot (matches baseline + db size + table sizes)
    useEffect(() => {
        let cancelled = false;
        fetch(`${httpBase}/api/admin/db-stats`)
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => !cancelled && setOverview(d))
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, []);
    // live ticker with auto-reconnect
    useEffect(() => {
        let ws = null;
        let retry;
        let closed = false;
        const connect = () => {
            setStatus("connecting");
            try {
                ws = new WebSocket(`${wsBase}/api/admin/db-stats/ws`);
            }
            catch {
                setStatus("offline");
                return;
            }
            ws.onopen = () => setStatus("live");
            ws.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (msg.type === "tick")
                        setLive(msg);
                }
                catch {
                    /* ignore */
                }
            };
            ws.onclose = () => {
                setStatus("offline");
                if (!closed)
                    retry = setTimeout(connect, 3000);
            };
            ws.onerror = () => ws?.close();
        };
        connect();
        return () => {
            closed = true;
            clearTimeout(retry);
            ws?.close();
        };
    }, []);
    const matches = live?.matches ?? overview?.matches ?? 0;
    const ratePerMin = live?.ratePerMin ?? 0;
    const players = overview?.tables.find((t) => t.table === "users")?.estRows ?? 0;
    return { matches, ratePerMin, players, overview, status };
}
// smooth count-up to `target`, with a setTimeout fallback so it never sticks at
// a stale value when rAF is paused (background tab).
export function useCountUp(target, ms = 1100) {
    const [val, setVal] = useState(target);
    const fromRef = useRef(target);
    const startRef = useRef(0);
    const rafRef = useRef(0);
    useEffect(() => {
        cancelAnimationFrame(rafRef.current);
        fromRef.current = val;
        startRef.current = 0;
        const step = (t) => {
            if (!startRef.current)
                startRef.current = t;
            const p = Math.min(1, (t - startRef.current) / ms);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(fromRef.current + (target - fromRef.current) * eased));
            if (p < 1)
                rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        const settle = setTimeout(() => setVal(target), ms + 120);
        return () => {
            cancelAnimationFrame(rafRef.current);
            clearTimeout(settle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);
    return val;
}
