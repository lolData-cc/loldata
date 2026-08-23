import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/**
 * The desktop app, promoted where the Build page has room for it.
 *
 * ⚠️ It FILLS the run-off under Laning rather than being sized to it. That gap
 * is a different height for every champion — the Laning panel grows a row in a
 * matchup, the chart does not — so a fixed height fits exactly one of them. The
 * caller stretches it; this only has to look right at any height.
 *
 * The art is the champion you are ALREADY looking at, not a fixed one: the
 * Explorer banner further up this page locks Katarina in for everyone, which is
 * right for a full-bleed strip and wrong for a small card sitting inside that
 * champion's own stats. Behind a scrim, exactly as that banner does it — a
 * splash at full strength eats the copy.
 */
const SPLASH = "https://cdn2.loldata.cc/img/champion/splash"

export default function DesktopAppPromo({
  champion,
  championId,
  className,
}: {
  champion?: string
  championId?: string
  className?: string
}) {
  return (
    <Link
      to="/download"
      className={cn(
        "group relative flex items-center overflow-hidden rounded-lg px-5 py-4",
        "border border-jade/20 bg-[rgba(6,12,14,0.5)]",
        "transition-colors hover:border-jade/35",
        className,
      )}
    >
      {/* the art, watermarked */}
      {championId && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none bg-no-repeat opacity-[0.5] transition-transform duration-[1200ms] group-hover:scale-[1.04]"
          style={{
            backgroundImage: `url('${SPLASH}/${championId}_0.jpg')`,
            backgroundSize: "cover",
            backgroundPosition: "72% 22%",
          }}
        />
      )}

      {/* Scrim: solid on the left where the copy is, thinning to the right so
          the art is still art. Same treatment as the Explorer banner above. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#040A0C] via-[#040A0C]/90 to-[#040A0C]/45"
      />

      <div className="relative min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="font-chakrapetch text-[10px] font-bold uppercase tracking-[0.3em] text-jade/80">
            loldata desktop
          </span>
          <span className="inline-flex items-center rounded-full border border-jade/50 bg-jade/15 px-2 py-0.5 font-chakrapetch text-[9px] font-bold uppercase tracking-[0.2em] text-jade shadow-[0_0_18px_rgba(0,217,146,0.35)]">
            free
          </span>
        </div>

        <h3 className="font-chakrapetch text-[21px] font-bold leading-none text-flash">
          Stop alt-tabbing.
        </h3>
        <p className="mt-1.5 max-w-[44ch] font-chakrapetch text-[12px] leading-snug text-flash/50">
          One click puts {champion ? `${champion}'s` : "this"} runes and build in your client. In
          game it tells you the second the next item is affordable.
        </p>
      </div>

      <span
        className={cn(
          "relative ml-4 shrink-0 rounded-[3px] px-4 py-2 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.14em]",
          "bg-jade/[0.14] text-jade transition-colors group-hover:bg-jade/25",
        )}
      >
        download
      </span>
    </Link>
  )
}
