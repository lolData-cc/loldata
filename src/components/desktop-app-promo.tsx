import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

/**
 * The desktop app, promoted where the Build page has room for it.
 *
 * ⚠️ Sized to FIT the run-off under Laning that the taller win-rate chart
 * leaves beside it — about 130px. That is the whole point: it fills space that
 * was already empty. A first pass at 269px overshot and simply moved the gap to
 * the other column, which is worse than leaving it alone, because an advert
 * that lengthens the page makes the page worse at the job the reader came for.
 *
 * So it is one row, and it says what the app DOES with the page you are already
 * reading rather than describing itself. Anything that needs a second paragraph
 * does not belong in a gap.
 */
export default function DesktopAppPromo({ champion, className }: { champion?: string; className?: string }) {
  return (
    <Link
      to="/download"
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-lg px-4 py-3.5",
        "border border-jade/20 bg-[rgba(6,12,14,0.5)]",
        "transition-colors hover:border-jade/35",
        className,
      )}
    >
      {/* A single slow sheen on hover. The panels either side are perfectly
          still, so anything moving on its own would pull the eye off the
          numbers the reader is actually here for. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-jade/[0.07] to-transparent transition-transform duration-[900ms] group-hover:translate-x-[400%]"
      />

      <Monitor />

      <div className="relative min-w-0 flex-1">
        <p className="font-jetbrains text-[8.5px] uppercase tracking-[0.24em] text-jade/60">
          loldata desktop
        </p>
        <h3 className="mt-1 font-chakrapetch text-[15.5px] font-bold leading-tight text-flash">
          This build, in your client
        </h3>
        <p className="mt-1 font-chakrapetch text-[11.5px] leading-snug text-flash/40">
          Sends {champion ? `${champion}'s` : "these"} runes and item order to League, then tells
          you in game when the next item is affordable.
        </p>
      </div>

      <span
        className={cn(
          "relative shrink-0 rounded-[3px] px-3 py-1.5 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.12em]",
          "bg-jade/[0.12] text-jade transition-colors group-hover:bg-jade/20",
        )}
      >
        get it
      </span>
    </Link>
  )
}

/**
 * A monitor with the overlay's own shoulder on it, drawn rather than
 * screenshotted: a real capture would go stale the first time the app changes,
 * and at this size would read as a grey smudge anyway.
 */
const Monitor = () => (
  <svg width="44" height="44" viewBox="0 0 52 52" aria-hidden className="relative shrink-0">
    <rect x="4.5" y="8.5" width="43" height="29" rx="2.5" fill="none" stroke="rgba(0,217,146,0.45)" strokeWidth="1.4" />
    <path d="M20 42.5 L32 42.5 M26 37.5 L26 42.5" fill="none" stroke="rgba(0,217,146,0.35)" strokeWidth="1.4" strokeLinecap="round" />
    {/* the notification, mid-arrival */}
    <path d="M9 20.5 L16 20.5 L20 15.5 L34 15.5" fill="none" stroke="rgba(0,217,146,0.75)" strokeWidth="1.3" strokeLinejoin="round" />
    <rect x="18" y="13.5" width="4" height="4" fill="rgba(0,217,146,0.9)" transform="rotate(45 20 15.5)" />
    <path d="M23 24.5 L38 24.5 M23 29 L32 29" fill="none" stroke="rgba(215,216,217,0.22)" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="14" cy="27" r="3.4" fill="none" stroke="rgba(0,217,146,0.4)" strokeWidth="1.3" />
  </svg>
)
