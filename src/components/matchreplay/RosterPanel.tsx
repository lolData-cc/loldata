// src/components/matchreplay/RosterPanel.tsx
//
// Right-side roster strip. One row per team (5 players each), with:
//   - champion icon (clickable → focus)
//   - champion name + KDA running
//   - eye toggle to hide that player on the map
//   - tiny stat strip: level / CS / gold

import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import type { MatchTimeline, StaticMatch } from "./types";
import {
  BLUE_IDS, RED_IDS,
  kdaAt, metricsAt, staticParticipantByPid, fmtShortNum,
} from "./derive";

export interface RosterPanelProps {
  timeline: MatchTimeline;
  staticMatch: StaticMatch | null;
  timeMs: number;
  focusedPid: number | null;
  hiddenPids: Set<number>;
  onFocusPid?: (pid: number | null) => void;
  onToggleHidden?: (pid: number) => void;
}

export function RosterPanel({
  timeline, staticMatch, timeMs, focusedPid, hiddenPids,
  onFocusPid, onToggleHidden,
}: RosterPanelProps) {
  const kda = useMemo(() => kdaAt(timeline, timeMs), [timeline, timeMs]);

  return (
    // Two equal-height team blocks. The whole strip fills the parent
    // height so there's no empty padding below the last player row.
    <div className="flex flex-col h-full gap-3">
      <TeamBlock
        side="red"
        ids={RED_IDS}
        timeline={timeline}
        staticMatch={staticMatch}
        timeMs={timeMs}
        kda={kda}
        focusedPid={focusedPid}
        hiddenPids={hiddenPids}
        onFocusPid={onFocusPid}
        onToggleHidden={onToggleHidden}
      />
      <TeamBlock
        side="blue"
        ids={BLUE_IDS}
        timeline={timeline}
        staticMatch={staticMatch}
        timeMs={timeMs}
        kda={kda}
        focusedPid={focusedPid}
        hiddenPids={hiddenPids}
        onFocusPid={onFocusPid}
        onToggleHidden={onToggleHidden}
      />
    </div>
  );
}

function TeamBlock({
  side, ids, timeline, staticMatch, timeMs, kda,
  focusedPid, hiddenPids, onFocusPid, onToggleHidden,
}: {
  side: "blue" | "red";
  ids: number[];
  timeline: MatchTimeline;
  staticMatch: StaticMatch | null;
  timeMs: number;
  kda: Map<number, { k: number; d: number; a: number }>;
  focusedPid: number | null;
  hiddenPids: Set<number>;
  onFocusPid?: (pid: number | null) => void;
  onToggleHidden?: (pid: number) => void;
}) {
  const tint = side === "blue" ? "#5BA8E6" : "#d63336";
  return (
    // flex-1 makes both team blocks share the parent height equally.
    // Inside, the player rows are spaced via "flex-1 + flex-col" so
    // they grow vertically to fill — no empty trailer space.
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center gap-2 mb-1.5 shrink-0">
        <div className="w-1.5 h-1.5 rounded-sm" style={{ background: tint }} />
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-flash/50">
          {side === "blue" ? "Blue Side" : "Red Side"}
        </span>
      </div>
      <div className="flex-1 min-h-0 flex flex-col justify-evenly gap-0.5">
        {ids.map((pid) => {
          const sp = staticParticipantByPid(staticMatch, pid);
          if (!sp) return null;
          const k = kda.get(pid) ?? { k: 0, d: 0, a: 0 };
          const m = metricsAt(timeline, pid, timeMs);
          const cs = Math.round((m?.cs ?? 0) + (m?.jungleCs ?? 0));
          const gold = Math.round(m?.totalGold ?? 0);
          const lv = m?.level ?? 1;
          const isFocused = focusedPid === pid;
          const isHidden = hiddenPids.has(pid);
          return (
            <div
              key={pid}
              className={cn(
                "group flex items-center gap-2 px-1.5 py-1 rounded-sm transition-all",
                isFocused ? "bg-jade/[0.08] ring-1 ring-jade/30" : "hover:bg-flash/[0.04]"
              )}
            >
              <button
                type="button"
                onClick={() => onFocusPid?.(focusedPid === pid ? null : pid)}
                className="flex items-center gap-2 flex-1 min-w-0 cursor-clicker text-left"
              >
                <div className="relative shrink-0">
                  <img
                    src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(sp.championName)}.png`}
                    alt={sp.championName}
                    className={cn(
                      "w-7 h-7 rounded-full ring-1 transition-all",
                      isHidden && "grayscale brightness-50"
                    )}
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
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-[11px] font-chakrapetch font-medium text-flash/90 leading-none shrink-0">
                      {sp.championName}
                    </span>
                    <span className="text-flash/25 text-[7px] leading-none shrink-0" aria-hidden>
                      &#x25C8;
                    </span>
                    <span className="text-[10px] font-jetbrains text-flash/55 leading-none truncate" title={sp.riotIdGameName ?? sp.summonerName ?? ""}>
                      {sp.riotIdGameName ?? sp.summonerName ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-mono tabular-nums text-flash/65">
                      {k.k}/<span className="text-[#d63336]/80">{k.d}</span>/{k.a}
                    </span>
                    <span className="text-[8px] font-mono text-flash/30">·</span>
                    <span className="text-[8px] font-mono text-flash/40 tabular-nums">{cs} CS</span>
                    <span className="text-[8px] font-mono text-flash/30">·</span>
                    <span className="text-[8px] font-mono text-citrine/70 tabular-nums">{fmtShortNum(gold)}g</span>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onToggleHidden?.(pid)}
                title={isHidden ? "Show on map" : "Hide on map"}
                className="p-1 rounded-sm text-flash/30 hover:text-flash/70 transition-colors cursor-clicker"
              >
                {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
