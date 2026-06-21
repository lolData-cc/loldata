// BuildPathViz.tsx — the cyber "core build path".
//
// Renders the cohort's most-common completed-item sequence as a row of slots
// (1st → 2nd → 3rd …), the top item of each slot wired to the next by a glowing
// jade connector, with situational alternatives stacked under each slot. Each item
// is clickable → opens its conditional strength panel in the parent.
//
// Data: GET-style POST to /api/explorer/buildpath (runBuildPath). Item winrate is
// per-slot (survivorship-correct); lift is vs the cohort baseline.

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { runBuildPath } from "./graph";
import { itemIcon, itemName } from "./catalog";
import type { ExplorerGraph, BuildPathResult, BuildSlotItem } from "./types";

const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th"];

export function BuildPathViz({
  graph,
  onSelectItem,
  selectedItem,
}: {
  graph: ExplorerGraph;
  onSelectItem?: (id: number) => void;
  selectedItem?: number | null;
}) {
  const [res, setRes] = useState<BuildPathResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "empty" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    setRes(null);
    runBuildPath(graph)
      .then((r) => {
        if (cancelled) return;
        const has = r.slots.some((s) => s.length > 0);
        setRes(r);
        setPhase(has ? "ready" : "empty");
      })
      .catch(() => !cancelled && setPhase("error"));
    return () => {
      cancelled = true;
    };
  }, [graph]);

  if (phase === "loading")
    return (
      <Shell>
        <div className="h-[150px] grid place-items-center text-[11px] font-chakrapetch text-flash/35">
          tracing the build path…
        </div>
      </Shell>
    );
  if (phase === "error")
    return (
      <Shell>
        <div className="h-[110px] grid place-items-center text-[11px] font-chakrapetch text-flash/35">
          Build path unavailable for this query.
        </div>
      </Shell>
    );
  if (phase === "empty" || !res)
    return (
      <Shell>
        <div className="h-[110px] grid place-items-center text-center text-[11px] font-chakrapetch text-flash/35 px-6">
          No item-order data for this cohort yet — build paths need timeline-covered games.
        </div>
      </Shell>
    );

  return (
    <Shell coverage={res.coverage} covered={res.coveredGames}>
      <div className="overflow-x-auto cyber-scrollbar pb-2 -mx-1 px-1">
        <div className="flex items-start gap-7 min-w-min pt-1">
          {res.slots.map((slot, i) => {
            const main = slot[0];
            const alts = slot.slice(1);
            const last = i === res.slots.length - 1;
            if (!main) return null;
            return (
              <div key={i} className="relative shrink-0 w-[116px]">
                {/* connector to the next slot's main item (centered on the icon row) */}
                {!last && res.slots[i + 1]?.[0] && (
                  <div className="pointer-events-none absolute right-[-28px] top-[34px] w-[28px] flex items-center">
                    <span
                      className="block h-[2px] flex-1 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, rgba(0,217,146,0.15), rgba(0,217,146,0.85))",
                        boxShadow: "0 0 8px rgba(0,217,146,0.55)",
                      }}
                    />
                    <ChevronRight size={14} className="text-jade -ml-1 shrink-0" style={{ filter: "drop-shadow(0 0 4px rgba(0,217,146,0.7))" }} />
                  </div>
                )}

                <div className="text-center text-[9px] font-chakrapetch font-bold uppercase tracking-[0.18em] text-jade/60 mb-1.5">
                  {ORD[i] ?? `${i + 1}th`}
                </div>

                <ItemNode item={main} big selected={selectedItem === main.item} onClick={() => onSelectItem?.(main.item)} />

                {alts.length > 0 && (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    <div className="text-center text-[8px] font-chakrapetch uppercase tracking-[0.16em] text-flash/25">alt</div>
                    {alts.map((alt) => (
                      <ItemNode key={alt.item} item={alt} selected={selectedItem === alt.item} onClick={() => onSelectItem?.(alt.item)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function ItemNode({
  item,
  big,
  selected,
  onClick,
}: {
  item: BuildSlotItem;
  big?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const wr = item.winrate;
  const good = wr >= 50;
  const size = big ? "w-14 h-14" : "w-9 h-9";
  return (
    <button
      onClick={onClick}
      title={`${itemName(item.item)} — ${wr}% WR · ${item.games.toLocaleString()} games · ${item.pickrate}% pick`}
      className={cn(
        "group w-full flex flex-col items-center rounded-[9px] border px-1.5 py-2 transition-all cursor-clicker",
        selected
          ? "border-citrine/60 bg-citrine/[0.06]"
          : big
            ? "border-jade/25 bg-jade/[0.04] hover:border-jade/45"
            : "border-white/[0.07] bg-black/30 hover:border-white/20"
      )}
    >
      <div className="relative">
        <img
          src={itemIcon(item.item)}
          onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
          className={cn("rounded-[6px] border", size, good ? "border-jade/40" : "border-error/40")}
          style={{ boxShadow: big ? `0 0 12px ${good ? "rgba(0,217,146,0.3)" : "rgba(255,98,134,0.25)"}` : undefined }}
          alt=""
        />
      </div>
      {big && (
        <span className="mt-1 text-[10px] leading-tight font-chakrapetch font-bold text-flash/80 text-center line-clamp-2 h-[26px]">
          {itemName(item.item)}
        </span>
      )}
      <div className="mt-1 flex items-baseline gap-1">
        <span className={cn("font-chakrapetch font-bold tabular-nums", big ? "text-[14px]" : "text-[11px]", good ? "text-jade" : "text-error")}>
          {wr}%
        </span>
        <LiftBadge lift={item.lift} small={!big} />
      </div>
      <span className={cn("font-chakrapetch tabular-nums text-flash/35", big ? "text-[9px]" : "text-[8px]")}>
        {item.pickrate}% · {compact(item.games)}
      </span>
    </button>
  );
}

function LiftBadge({ lift, small }: { lift: number; small?: boolean }) {
  if (Math.abs(lift) < 0.05) return null;
  const up = lift > 0;
  return (
    <span
      className={cn(
        "font-chakrapetch font-bold tabular-nums",
        small ? "text-[8px]" : "text-[9px]",
        up ? "text-jade/70" : "text-error/70"
      )}
    >
      {up ? "+" : ""}
      {lift.toFixed(1)}
    </span>
  );
}

function Shell({
  children,
  coverage,
  covered,
}: {
  children: React.ReactNode;
  coverage?: number;
  covered?: number;
}) {
  return (
    <div className="deep-section rounded-[12px] border border-white/[0.08] bg-[rgba(6,12,14,0.55)] p-4 md:p-5" style={{ animationDelay: "150ms" }}>
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-1 h-3.5 bg-jade rounded-full" />
          <span className="text-[11px] font-chakrapetch font-bold tracking-[0.2em] uppercase text-flash/55">Core build path</span>
        </div>
        {coverage != null && (
          <span className="text-[9px] font-chakrapetch text-flash/35 tabular-nums">
            {compact(covered ?? 0)} games with build data · {coverage}% coverage
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function compact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
