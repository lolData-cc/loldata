// The desktop profile card on the summoner page, as a PERSONNEL ID CARD.
//
// Built from a reference the user handed over: a sci-fi crew ID — halftone
// portrait on the left, the name in spaced capitals, a filled rank tag, an
// id code, key/value rows each underlined by a bar, a honeycomb module, a
// row of big numerals, a ">" list of facts, and a footer with a ruler scale.
// Here the portrait is the summoner icon, the rank tag is the Solo/Duo tier,
// the rows are PEAK and LADDER, and the footer carries UPDATE and ANALYZE.
// Kept SMALL and beside the rank emblems, which stay in their own block: a
// full-width dossier with honeycomb and numerals was tried and was too much.
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
  flexRank?: string | null;
  flexLp?: number | null;
  ranked5Rank?: string | null;
  ranked5Lp?: number | null;
  peakRank?: string | null;
  peakLp?: number | null;
  ladderRank?: number | null;
  wins?: number | null;
  losses?: number | null;
};

const HEX = "polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)";

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
  region,
  identity,
  liveViewer,
  actions,
  trialNote,
  className,
}: {
  info: IdCardInfo | null;
  region: string;
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
    ? `${info.peakRank}${info.peakLp != null ? ` · ${info.peakLp}LP` : ""}`
    : null;
  const nameLen = info?.name?.length ?? 0;

  return (
    <div className={cn("font-jetbrains", className)}>
      {/* ── header strip: wordmark, rule, three hexes ─────────────────── */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-2.5">
        <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.35em] text-flash/80">
          <span className="text-jade">◈</span> Summoner
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-jade/40 via-jade/15 to-transparent" />
        <span className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="relative h-3 w-3">
              <span className="absolute inset-0 bg-flash/25" style={{ clipPath: HEX }} />
              <span className="absolute inset-[1px] bg-[#0a1416]" style={{ clipPath: HEX }} />
            </span>
          ))}
        </span>
      </div>

      {/* ── body ─────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex gap-4 px-4 pb-3 pt-2.5">
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
          {/* the dot screen */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              // fine print screen — a dot per 3px cell, small enough to keep the face
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

        {/* dossier */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {identity && <div className="flex min-h-[14px] flex-wrap items-center gap-2">{identity}</div>}

          {/* name, tag */}
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className={cn(
                "truncate font-chakrapetch font-bold uppercase leading-none text-flash",
                // ~230px of column: spaced capitals only where they fit
                nameLen > 14 ? "text-[14px] tracking-[0.06em]" : nameLen > 10 ? "text-[16px] tracking-[0.08em]" : "text-[19px] tracking-[0.14em]"
              )}
            >
              {info?.name ?? "—"}
            </span>
            {info?.tag && <span className="shrink-0 text-[12px] tracking-[0.12em] text-flash/35">#{info.tag}</span>}
          </div>

          {/* rank tag + id code */}
          <div className="flex items-center gap-2.5 whitespace-nowrap">
            <span
              className={cn(
                "shrink-0 px-1.5 py-[3px] font-chakrapetch text-[10px] font-bold uppercase leading-none tracking-[0.16em]",
                soloUnranked ? "bg-flash/10 text-flash/50" : "bg-jade text-[#040A0C]"
              )}
            >
              {soloUnranked ? "Unranked" : info?.rank}
            </span>
            <span className="truncate text-[9.5px] tracking-[0.14em] text-flash/40">
              {region.toUpperCase()}.{info?.level ?? "—"}{!soloUnranked && info?.lp != null ? ` · ${info.lp}LP` : ""}
            </span>
          </div>

          {/* key / value rows */}
          <div className="grid grid-cols-1 gap-y-2">
            <Row label="PEAK" value={peak ?? "—"} dim={!peak} />
            <Row label="LADDER" value={info?.ladderRank ? `#${info.ladderRank.toLocaleString()}` : "—"} dim={!info?.ladderRank} />
          </div>

        </div>
      </div>

      {/* ── footer: label, ruler, actions ─────────────────────────────── */}
      <div className="relative z-10 flex items-center gap-3 border-t border-jade/[0.12] px-4 py-2">
        <span className="shrink-0 whitespace-nowrap text-[9px] uppercase tracking-[0.14em] text-flash/35">
          {trialNote ? (
            <span className="inline-flex items-center gap-1.5 text-citrine/70">
              <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-citrine" />
              one free analysis
            </span>
          ) : (
            <>loldata <span className="text-flash/20">·</span> personnel</>
          )}
        </span>
        {/* the ruler */}
        <span aria-hidden className="flex min-w-0 flex-1 items-end gap-[5px] overflow-hidden px-1">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className={cn("w-px shrink-0 bg-flash/25", i % 5 === 0 ? "h-2" : "h-1")} />
          ))}
        </span>
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
