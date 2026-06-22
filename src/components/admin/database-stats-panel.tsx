// database-stats-panel.tsx — admin "Database" tab.
//
// Shows how much data we hold: a LIVE match counter (driven by a WebSocket the
// Explorer backend pushes every ~5s, so it ticks up as the ingest runs), the
// total DB size, and the biggest tables. Reads EXPLORER_API_BASE_URL so in prod
// it reflects the box (where the match data grows), not the frozen Supabase set.

import { useEffect, useRef, useState } from "react";
import { Database, Activity, HardDrive, Table2, Layers, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOX_API_BASE_URL } from "@/config";

type TableStat = { table: string; estRows: number; sizeBytes: number; sizePretty: string };
type DbOverview = {
  matches: number;
  dbSizeBytes: number;
  dbSizePretty: string;
  tables: TableStat[];
  generatedAt: number;
};
type Tick = { type: "tick"; matches: number; ratePerMin: number; ts: number };

const httpBase = BOX_API_BASE_URL;
const wsBase = httpBase
  ? httpBase.replace(/^http/, "ws")
  : `${typeof window !== "undefined" && window.location.protocol === "https:" ? "wss" : "ws"}://${typeof window !== "undefined" ? window.location.host : ""}`;

const fmt = (n: number) => n.toLocaleString("en-US");

// smooth count-up between successive live values
function useCountUp(target: number, ms = 900) {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    fromRef.current = val;
    startRef.current = 0;
    const step = (t: number) => {
      if (!startRef.current) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    // rAF is paused in background/headless tabs — guarantee we still land on the
    // target so the counter never sticks at a stale value (e.g. 0 before first paint).
    const settle = setTimeout(() => setVal(target), ms + 120);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(settle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

export function DatabaseStatsPanel() {
  const [overview, setOverview] = useState<DbOverview | null>(null);
  const [live, setLive] = useState<Tick | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const [err, setErr] = useState(false);

  // initial snapshot (tables + size + a matches baseline)
  useEffect(() => {
    let cancelled = false;
    fetch(`${httpBase}/api/admin/db-stats`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: DbOverview) => !cancelled && setOverview(d))
      .catch(() => !cancelled && setErr(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // live ticker via WebSocket, with auto-reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let closed = false;
    const connect = () => {
      setStatus("connecting");
      try {
        ws = new WebSocket(`${wsBase}/api/admin/db-stats/ws`);
      } catch {
        setStatus("offline");
        return;
      }
      ws.onopen = () => setStatus("live");
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as Tick;
          if (msg.type === "tick") setLive(msg);
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setStatus("offline");
        if (!closed) retry = setTimeout(connect, 3000);
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
  const shownMatches = useCountUp(matches);
  const rate = live?.ratePerMin ?? 0;
  const maxBytes = overview?.tables[0]?.sizeBytes ?? 1;

  return (
    <div className="font-chakrapetch text-flash">
      <div className="flex items-center gap-2.5 mb-1">
        <Database size={18} className="text-jade" />
        <h2 className="text-[18px] font-bold tracking-tight text-flash">Database</h2>
        <span
          className={cn(
            "ml-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] border",
            status === "live"
              ? "border-jade/30 bg-jade/10 text-jade"
              : status === "connecting"
              ? "border-citrine/30 bg-citrine/10 text-citrine"
              : "border-error/30 bg-error/10 text-error"
          )}
        >
          {status === "offline" ? <WifiOff size={11} /> : <Wifi size={11} />}
          {status === "live" ? "live" : status === "connecting" ? "connecting" : "offline"}
          {status === "live" && <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />}
        </span>
      </div>
      <p className="text-[11px] text-flash/40 mb-5">Live counts straight from the match database.</p>

      {err && !overview && (
        <div className="rounded-[10px] border border-error/25 bg-error/5 px-4 py-3 text-[12px] text-flash/60">
          Couldn't reach the stats endpoint. Is the backend up?
        </div>
      )}

      {/* hero: live match counter */}
      <div className="relative overflow-hidden rounded-[14px] border border-jade/20 bg-[rgba(6,12,14,0.6)] p-5 mb-3">
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #00d992 0%, transparent 55%)" }} />
        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-jade/70 mb-1">
              <Layers size={12} /> Matches ingested
            </div>
            <div className="font-bold tabular-nums leading-none text-flash text-[clamp(38px,7vw,64px)]" style={{ textShadow: "0 0 30px rgba(0,217,146,0.25)" }}>
              {fmt(shownMatches)}
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border tabular-nums text-[13px] font-bold",
              rate > 0 ? "border-jade/30 bg-jade/[0.07] text-jade" : "border-white/10 bg-black/30 text-flash/40"
            )}
          >
            <Activity size={14} className={rate > 0 ? "animate-pulse" : ""} />
            {rate > 0 ? `+${fmt(rate)}/min` : "idle"}
          </div>
        </div>
      </div>

      {/* metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Metric icon={<HardDrive size={14} />} label="DB size" value={overview?.dbSizePretty ?? "—"} />
        <Metric icon={<Table2 size={14} />} label="Tables tracked" value={overview ? String(overview.tables.length) : "—"} />
        <Metric
          icon={<Layers size={14} />}
          label="Rows (top table)"
          value={overview ? fmt(overview.tables[0]?.estRows ?? 0) : "—"}
          sub={overview?.tables[0]?.table}
        />
      </div>

      {/* tables by size */}
      <div className="rounded-[12px] border border-white/[0.08] bg-[rgba(6,12,14,0.45)] p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-flash/45 mb-3">Biggest tables</div>
        <div className="flex flex-col gap-2">
          {(overview?.tables ?? []).map((t) => {
            const pct = Math.max(2, Math.round((t.sizeBytes / maxBytes) * 100));
            return (
              <div key={t.table} className="group">
                <div className="flex items-center justify-between gap-3 text-[12px] mb-1">
                  <span className="truncate text-flash/80">{t.table}</span>
                  <span className="shrink-0 tabular-nums text-flash/45">
                    <span className="text-flash/70">{t.sizePretty}</span>
                    <span className="mx-1.5 text-flash/20">·</span>
                    {fmt(t.estRows)} <span className="text-flash/30">rows</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-jade/40 to-jade/70 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {!overview && !err && (
            <div className="py-6 text-center text-[11px] text-flash/30">loading table sizes…</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[10px] border border-white/[0.07] bg-black/30 px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-flash/40 mb-1.5">
        <span className="text-jade/70">{icon}</span>
        {label}
      </div>
      <div className="text-[19px] font-bold tabular-nums text-flash leading-none truncate">{value}</div>
      {sub && <div className="mt-1 text-[10px] text-flash/35 truncate">{sub}</div>}
    </div>
  );
}
