// src/components/matchreplay/ScoreboardLive.tsx
//
// Live scoreboard view — all 10 players in two columns with live
// running stats at the playhead. Used as the "Scoreboard" tab in
// the dialog (alternative to the map view).

import * as React from "react";
import { useMemo } from "react";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import type { MatchTimeline, StaticMatch } from "./types";
import {
  kdaAt, metricsAt, staticParticipantByPid, fmtShortNum,
  inventoryAt, BLUE_IDS, RED_IDS,
} from "./derive";
import { cn } from "@/lib/utils";

export interface ScoreboardLiveProps {
  timeline: MatchTimeline;
  staticMatch: StaticMatch | null;
  timeMs: number;
}

export function ScoreboardLive({ timeline, staticMatch, timeMs }: ScoreboardLiveProps) {
  const kda = useMemo(() => kdaAt(timeline, timeMs), [timeline, timeMs]);

  return (
    <div className="grid grid-cols-2 gap-4">
      <TeamColumn side="blue" ids={BLUE_IDS} timeline={timeline} staticMatch={staticMatch} timeMs={timeMs} kda={kda} />
      <TeamColumn side="red" ids={RED_IDS} timeline={timeline} staticMatch={staticMatch} timeMs={timeMs} kda={kda} />
    </div>
  );
}

function TeamColumn({
  side, ids, timeline, staticMatch, timeMs, kda,
}: {
  side: "blue" | "red";
  ids: number[];
  timeline: MatchTimeline;
  staticMatch: StaticMatch | null;
  timeMs: number;
  kda: Map<number, { k: number; d: number; a: number }>;
}) {
  const tint = side === "blue" ? "#5BA8E6" : "#d63336";
  const totalK = ids.reduce((s, p) => s + (kda.get(p)?.k ?? 0), 0);
  const totalGold = ids.reduce((s, p) => {
    const m = metricsAt(timeline, p, timeMs);
    return s + (m?.totalGold ?? 0);
  }, 0);

  return (
    <div className="rounded-sm bg-flash/[0.015] ring-1 ring-flash/[0.06] p-3">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <div className="w-2 h-2 rounded-sm self-center" style={{ background: tint }} />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: tint }}>
            {side === "blue" ? "Blue Side" : "Red Side"}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] tabular-nums text-flash/60">
          <span><span className="text-flash/40">K</span> {totalK}</span>
          <span><span className="text-flash/40">G</span> {fmtShortNum(totalGold)}</span>
        </div>
      </div>
      <div className="space-y-1">
        {ids.map((pid) => {
          const sp = staticParticipantByPid(staticMatch, pid);
          if (!sp) return null;
          const k = kda.get(pid) ?? { k: 0, d: 0, a: 0 };
          const m = metricsAt(timeline, pid, timeMs);
          const inv = inventoryAt(timeline, pid, timeMs);
          const cs = Math.round((m?.cs ?? 0) + (m?.jungleCs ?? 0));
          const gold = Math.round(m?.totalGold ?? 0);
          const lv = m?.level ?? 1;
          const dmg = Math.round(m?.damageStats.totalDamageDoneToChampions ?? 0);
          return (
            <div key={pid} className="flex items-center gap-2 px-1.5 py-1 rounded-sm hover:bg-flash/[0.04] transition-colors">
              <div className="relative shrink-0">
                <img
                  src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(sp.championName)}.png`}
                  alt={sp.championName}
                  className="w-8 h-8 rounded-sm"
                  style={{ boxShadow: `0 0 0 1px ${tint}aa` }}
                />
                <div
                  className="absolute -bottom-0.5 -right-0.5 text-[8px] font-mono font-bold tabular-nums px-0.5 rounded-sm"
                  style={{ background: "#040A0C", color: tint, boxShadow: `0 0 0 1px ${tint}60` }}
                >
                  {lv}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-chakrapetch font-medium text-flash/90 truncate leading-none">
                  {sp.championName}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* KDA — matches the chakrapetch + tracking style of
                      the summoner page match-card KDA, slightly scaled
                      down to fit the scoreboard row. */}
                  <span className="text-[13px] font-chakrapetch font-bold tabular-nums tracking-wide leading-none">
                    <span className="text-flash/90">{k.k}</span>
                    <span className="mx-[2px] text-flash/25">/</span>
                    <span className="text-red-400/85">{k.d}</span>
                    <span className="mx-[2px] text-flash/25">/</span>
                    <span className="text-flash/90">{k.a}</span>
                  </span>
                  <span className="text-[8px] font-mono text-flash/30">·</span>
                  <span className="text-[8px] font-mono text-flash/45 tabular-nums">{cs} CS</span>
                  <span className="text-[8px] font-mono text-flash/30">·</span>
                  <span className="text-[8px] font-mono text-citrine/70 tabular-nums">{fmtShortNum(gold)}g</span>
                  <span className="text-[8px] font-mono text-flash/30">·</span>
                  <span className="text-[8px] font-mono text-jade/70 tabular-nums">{fmtShortNum(dmg)} dmg</span>
                </div>
              </div>
              {/* Inventory mini-strip */}
              <div className="flex gap-0.5 shrink-0">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const id = inv.items[idx];
                  return (
                    <div key={idx} className={cn(
                      "w-4 h-4 rounded-[2px] bg-[#0f0f0f] ring-1 ring-flash/[0.05]"
                    )}>
                      {id ? (
                        <img src={`${cdnBaseUrl()}/img/item/${id}.png`} alt="" className="w-full h-full rounded-[2px]" />
                      ) : null}
                    </div>
                  );
                })}
                {inv.trinketId ? (
                  <div className="w-4 h-4 rounded-full bg-[#0f0f0f] ring-1 ring-flash/[0.05] ml-0.5">
                    <img src={`${cdnBaseUrl()}/img/item/${inv.trinketId}.png`} alt="" className="w-full h-full rounded-full" />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
