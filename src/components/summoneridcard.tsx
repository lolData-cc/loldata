// The desktop profile card on the summoner page.
//
// Cut from a personnel-ID reference the user handed over — a print-screened
// portrait, the name in spaced capitals, a filled tag for the grade, a
// key/value row underlined by a bar — and then STRIPPED to what a profile
// actually needs: the portrait, the name, the Solo/Duo tier as the tag, the
// PEAK row (the ladder rank only when there is one) and the two actions.
// The header strip, the hexes, the code line, the ruler and the footer were
// tried and were noise. Small, and beside the rank emblems, which keep their
// own block.
//
// ⚠️ The portrait is dithered with CSS, not with the Halftone canvas: the
// icon lives on the CDN, and Cloudflare caches a copy of it WITHOUT the CORS
// header, so a canvas that reads its pixels is tainted and throws. A grayscale
// image under a dot screen gives the print look without touching pixels.

import type { ReactNode } from "react";
import { cdnBaseUrl } from "@/config";
import { cn } from "@/lib/utils";

export type IdCardInfo = {
  name?: string;
  tag?: string;
  level?: number | null;
  profileIconId?: number | null;
  avatar_url?: string | null;
  live?: boolean;
  rank?: string | null;
  lp?: number | null;
  peakRank?: string | null;
  peakLp?: number | null;
  ladderRank?: number | null;
};

function unrankedOf(rank?: string | null) {
  return !rank || String(rank).toLowerCase() === "unranked";
}

/** A key/value row with the reference's bar underneath. */
function Row({ label, value, dim }: { label: string; value: ReactNode; dim?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-2 whitespace-nowrap text-[10.5px] leading-none tracking-[0.08em]">
        <span className="text-flash/35">{label}:</span>
        <span className={cn("truncate font-semibold uppercase", dim ? "text-flash/35" : "text-flash/85")}>{value}</span>
      </div>
      <div className="mt-1.5 h-[3px] w-full bg-flash/[0.06]">
        <div className={cn("h-full", dim ? "w-[18%] bg-flash/15" : "w-[62%] bg-jade/55")} />
      </div>
    </div>
  );
}

export function SummonerIdCard({
  info,
  identity,
  liveViewer,
  actions,
  trialNote,
  className,
}: {
  info: IdCardInfo | null;
  /** the pro / streamer / discord line, rendered by the page */
  identity?: ReactNode;
  /** the LIVE viewer trigger, rendered by the page when the player is in game */
  liveViewer?: ReactNode;
  /** UPDATE and ANALYZE, rendered by the page */
  actions?: ReactNode;
  trialNote?: boolean;
  className?: string;
}) {
  const icon = info?.avatar_url ?? `${cdnBaseUrl()}/img/profileicon/${info?.profileIconId ?? 29}.png`;
  const fallbackIcon = `${cdnBaseUrl()}/img/profileicon/${info?.profileIconId ?? 29}.png`;
  const soloUnranked = unrankedOf(info?.rank);
  const peak = info?.peakRank && !unrankedOf(info.peakRank)
    ? `${info.peakRank}${info.peakLp != null ? ` · ${info.peakLp} LP` : ""}`
    : null;
  const nameLen = info?.name?.length ?? 0;

  return (
    <div className={cn("font-jetbrains", className)}>
      <div className="relative z-10 flex gap-4 px-4 py-4">
        {/* portrait */}
        <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-[2px] border border-jade/15 bg-[#06100f]">
          <img
            src={icon}
            alt=""
            className="h-full w-full select-none object-cover"
            style={{ filter: "grayscale(1) contrast(1.15) brightness(1.05)" }}
            draggable={false}
            onError={(e) => { e.currentTarget.src = fallbackIcon; }}
          />
          {/* the dot screen — a dot per 3px cell, small enough to keep the face */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(4,10,12,0.75) 0.55px, transparent 0.95px)",
              backgroundSize: "3px 3px",
              mixBlendMode: "multiply",
            }}
          />
          {/* the jade tint, in the shadows only */}
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-jade/[0.14] mix-blend-color" />
          {info?.level != null && (
            <span className="absolute bottom-1.5 left-1.5 bg-[#040A0C]/90 px-1.5 py-[3px] text-[9px] font-semibold tracking-[0.18em] text-flash/85">
              LVL.{info.level}
            </span>
          )}
          {info?.live && (
            <span className="absolute right-1.5 top-1.5 flex items-center gap-1 bg-red-500 px-1.5 py-[3px] text-[8px] font-bold tracking-[0.18em] text-white">
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-white" /> LIVE
            </span>
          )}
          {liveViewer}
        </div>

        {/* the essentials */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {identity && <div className="flex min-h-[14px] flex-wrap items-center gap-2">{identity}</div>}

          {/* name, tag */}
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className={cn(
                "truncate font-chakrapetch font-bold uppercase leading-none text-flash",
                nameLen > 14 ? "text-[14px] tracking-[0.06em]" : nameLen > 10 ? "text-[16px] tracking-[0.08em]" : "text-[19px] tracking-[0.14em]"
              )}
            >
              {info?.name ?? "—"}
            </span>
            {info?.tag && <span className="shrink-0 text-[12px] tracking-[0.12em] text-flash/35">#{info.tag}</span>}
          </div>

          {/* the tier, as the reference's filled tag */}
          <div>
            <span
              className={cn(
                "inline-block px-1.5 py-[3px] font-chakrapetch text-[10px] font-bold uppercase leading-none tracking-[0.16em]",
                soloUnranked ? "bg-flash/10 text-flash/50" : "bg-jade text-[#040A0C]"
              )}
            >
              {soloUnranked ? "Unranked" : `${info?.rank} · ${info?.lp ?? 0} LP`}
            </span>
          </div>

          {/* peak — and the ladder rank only when there is one */}
          <div className="grid grid-cols-1 gap-y-2">
            <Row label="PEAK" value={peak ?? "—"} dim={!peak} />
            {info?.ladderRank ? <Row label="LADDER" value={`#${info.ladderRank.toLocaleString()}`} /> : null}
          </div>

          {/* actions */}
          <div className="mt-0.5 flex items-center gap-2">{actions}</div>
          {trialNote && (
            <div className="whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.14em] leading-none text-citrine/60">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-citrine" />
                one free analysis
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
