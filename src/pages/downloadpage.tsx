import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { Navbar } from "@/components/navbar"

/**
 * Where the desktop app is downloaded from.
 *
 * Built as a sequence rather than a page: a rail draws, a marker lands on it,
 * the headline uncovers, the button arrives last. The same Death Stranding
 * grammar the app and the overlay use, at the one scale where it can actually
 * breathe — nothing here is decoration borrowed from somewhere else.
 *
 * The device drifts on scroll and the glow behind it moves with it. Slowly:
 * the point is depth, not motion. Everything respects prefers-reduced-motion,
 * where the whole thing collapses to a still page that says the same things.
 *
 * The version, filename, size and date are READ from the same latest.yml the
 * installed app polls. One source, so this page cannot drift out of date behind
 * a release — which is what every hand-written download page eventually does.
 *
 * ⚠️ x64 only, and deliberately. League requires 64-bit Windows, so a machine
 * that cannot run this build cannot run the game it sits beside. Offering an
 * x86 download would be a second thing to build, host and test for nobody.
 */
const FEED = "https://cdn2.loldata.cc/desktopapp"

type Release = { version: string; file: string; size: number; releaseDate: string | null }

/** latest.yml is small and regular, so a few lines beat a YAML parser for one
 *  file. Anything unreadable becomes null and the page offers the download
 *  without the details, rather than showing nothing. */
function parseLatest(text: string): Release | null {
  const version = text.match(/^version:\s*(.+)$/m)?.[1]?.trim()
  const file = text.match(/^path:\s*(.+)$/m)?.[1]?.trim()
  if (!version || !file) return null
  return {
    version,
    file,
    size: Number(text.match(/^\s+size:\s*(\d+)$/m)?.[1] ?? 0),
    releaseDate: text.match(/^releaseDate:\s*'?([^'\n]+)'?$/m)?.[1]?.trim() ?? null,
  }
}

export default function DownloadPage() {
  const [rel, setRel] = useState<Release | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading")
  const still = useReducedMotion()

  const stage = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start start", "end start"] })
  // Slow, and only ever downward. A hero that races the scroll reads as a bug.
  const deviceY = useTransform(scrollYProgress, [0, 1], [0, still ? 0 : 90])
  const deviceRot = useTransform(scrollYProgress, [0, 1], [0, still ? 0 : -3])
  const glowY = useTransform(scrollYProgress, [0, 1], [0, still ? 0 : 140])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, still ? 1 : 0.25])

  useEffect(() => {
    const ctl = new AbortController()
    fetch(`${FEED}/latest.yml`, { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => {
        const parsed = t ? parseLatest(t) : null
        if (parsed) { setRel(parsed); setState("ready") } else setState("unavailable")
      })
      .catch(() => { if (!ctl.signal.aborted) setState("unavailable") })
    return () => ctl.abort()
  }, [])

  const href = rel ? `${FEED}/${rel.file}` : null
  const mb = rel?.size ? (rel.size / 1048576).toFixed(0) : null

  // One timeline for the whole opening, so the parts arrive in a considered
  // order instead of each animating on its own schedule.
  const step = (i: number) => ({
    initial: still ? {} : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: still ? 0 : 0.15 + i * 0.09, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <div className="min-h-screen bg-liquirice text-flash overflow-x-hidden">
      <Navbar columnInset />

      {/* ── the stage ─────────────────────────────────────────────────── */}
      <section ref={stage} className="relative px-6 xl:px-[17.5%] min-[2560px]:px-[22.5%] pt-28 pb-24">
        {/* Ambient ground. Contained: a radial only fades to nothing inside its
            own box when centre ± radius stays within 0-100% on both axes, and
            otherwise its rectangle shows as a hard edge across the glow. */}
        <motion.div
          aria-hidden
          style={{ y: glowY, opacity: fade }}
          className="pointer-events-none absolute inset-x-0 -top-24 h-[820px] -z-10 blur-[26px]"
        >
          <div
            className="h-full w-full"
            style={{
              background:
                "radial-gradient(46% 38% at 62% 30%, rgba(0,217,146,0.15) 0%, rgba(0,217,146,0.05) 42%, rgba(0,217,146,0) 74%)",
            }}
          />
        </motion.div>

        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            {/* The rail draws itself, then the marker lands on it. */}
            <motion.svg
              aria-hidden
              viewBox="0 0 460 12"
              preserveAspectRatio="none"
              className="h-[12px] w-full overflow-visible"
              style={{ filter: "drop-shadow(0 0 6px rgba(0,217,146,0.5))" }}
            >
              <motion.path
                d="M 0 2 L 449 2 L 458 11"
                fill="none"
                stroke="#00d992"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                opacity="0.85"
                pathLength={1}
                strokeDasharray={1}
                initial={still ? {} : { strokeDashoffset: 1 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Rotation on the group and scale on the rect: an animated
                  transform REPLACES an SVG transform attribute rather than
                  composing with it, which turns a diamond into a square. */}
              <g transform="rotate(45 18 2)">
                <motion.rect
                  x="14" y="-2" width="8" height="8" fill="#00d992"
                  style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  initial={still ? {} : { scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                />
              </g>
            </motion.svg>

            <div className="pl-6 pt-6">
              <motion.p {...step(0)} className="font-jetbrains text-[9px] uppercase tracking-[0.34em] text-jade/60">
                lolData desktop
              </motion.p>

              {/* Uncovers left to right rather than fading — the app's own
                  headline treatment, at page scale. */}
              <motion.h1
                initial={still ? {} : { clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: "inset(0 -2% 0 0)" }}
                transition={{ duration: 0.85, delay: still ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 font-chakrapetch text-[clamp(34px,5vw,56px)] font-bold leading-[1.02] tracking-tight"
              >
                Your runes,
                <br />
                <span className="text-jade">in the client.</span>
              </motion.h1>

              <motion.p {...step(3)} className="mt-6 max-w-[48ch] font-chakrapetch text-[15px] leading-relaxed text-flash/45">
                It sits beside League and does what a website cannot: writes the
                page you picked straight into your client, reads your history from
                the client itself, and tells you what changed this patch for the
                champions you actually play.
              </motion.p>

              <motion.div {...step(5)} className="mt-10 flex flex-wrap items-center gap-5">
                <DownloadButton href={href} state={state} />
                {rel && (
                  <p className="font-jetbrains text-[10px] uppercase tabular-nums tracking-[0.18em] text-flash/30">
                    v{rel.version} · 64-bit{mb ? ` · ${mb} MB` : ""}
                    {rel.releaseDate ? ` · ${new Date(rel.releaseDate).toLocaleDateString()}` : ""}
                  </p>
                )}
              </motion.div>

              {state === "unavailable" && (
                <motion.p {...step(6)} className="mt-5 max-w-[50ch] font-jetbrains text-[10px] leading-relaxed text-citrine/70">
                  The build is not on the CDN yet. Nothing is broken — it simply
                  has not been published.
                </motion.p>
              )}
            </div>
          </div>

          {/* ── the device ──────────────────────────────────────────────── */}
          <motion.div
            style={{ y: deviceY, rotate: deviceRot, perspective: 1600 }}
            initial={still ? {} : { opacity: 0, x: 40, rotateY: -14 }}
            animate={{ opacity: 1, x: 0, rotateY: -9 }}
            transition={{ duration: 1.1, delay: still ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div
              className="relative overflow-hidden rounded-[6px]"
              style={{
                transform: "rotateY(-9deg) rotateX(3deg)",
                boxShadow: "0 50px 90px -40px rgba(0,0,0,0.95), 0 0 0 1px rgba(0,217,146,0.16)",
              }}
            >
              <img
                src="/img/home/ingame.jpg"
                alt="The overlay during a game"
                className="block w-full"
                loading="eager"
              />
              {/* Screen light: a device with no light on it reads as a photo of
                  a switched-off monitor. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(115deg, rgba(0,217,146,0.10) 0%, transparent 38%, transparent 70%, rgba(4,10,12,0.45) 100%)" }}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── what it does ──────────────────────────────────────────────── */}
      <section className="px-6 xl:px-[17.5%] min-[2560px]:px-[22.5%] pb-32">
        <div className="grid gap-y-12 gap-x-10 sm:grid-cols-3">
          <Panel
            index={0}
            title="It updates itself"
            body="New versions show a button inside the app. It downloads only what changed and restarts when you press it — never on its own, and never mid-game."
          />
          <Panel
            index={1}
            title="Windows will warn you"
            body="The app is not code-signed yet, so SmartScreen says “unrecognised app”. Choose More info, then Run anyway. A certificate is on the list; it costs money rather than effort."
          />
          <Panel
            index={2}
            title="64-bit only"
            body="League itself needs 64-bit Windows, so there is no machine that could run the game but not this."
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mt-20 max-w-[54ch] font-jetbrains text-[9.5px] leading-relaxed text-flash/25"
        >
          The app never asks for your password — signing in opens your browser. It
          reads the League client the way Riot allows, and shows only what you
          could already see yourself.
        </motion.p>
      </section>
    </div>
  )
}

/**
 * The one control on the page.
 *
 * Reuses the homepage's running-edge button rather than inventing a second
 * look for the same action — the body stays near-black and the only colour is a
 * light travelling the perimeter, because the eye follows a line.
 *
 * A disabled <a> is not a thing, so when there is nothing to download this
 * renders a real disabled <button>. A pointer that never resolves is worse than
 * a control that says so.
 */
function DownloadButton({ href, state }: { href: string | null; state: "loading" | "ready" | "unavailable" }) {
  const label =
    state === "loading" ? "Checking…" : state === "unavailable" ? "Not released yet" : "Download for Windows"

  const inner = (
    <>
      <span aria-hidden className="dl-cta__orbit pointer-events-none" />
      <span aria-hidden className="dl-cta__body pointer-events-none" />
      <span className="relative font-jetbrains text-[12px] font-bold uppercase tracking-[0.22em] text-jade">
        {label}
      </span>
    </>
  )

  if (!href) {
    return (
      <button type="button" disabled className="dl-cta cursor-not-allowed select-none px-8 py-[16px]">
        {inner}
      </button>
    )
  }

  return (
    <a
      href={href}
      className="dl-cta inline-block cursor-clicker select-none px-8 py-[16px]"
      style={{ boxShadow: "0 18px 38px -22px rgba(0,217,146,0.6)" }}
    >
      {inner}
    </a>
  )
}

/** Each panel assembles as it arrives: its rule opens from the left, then the
 *  words lift. Once — a section that re-animates every time you scroll past is
 *  a section you stop reading. */
function Panel({ index, title, body }: { index: number; title: string; body: string }) {
  const still = useReducedMotion()
  const view = { once: true, margin: "-90px" } as const

  return (
    <div>
      <motion.span
        aria-hidden
        className="block h-px origin-left bg-gradient-to-r from-jade/45 to-transparent"
        initial={still ? {} : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={view}
        transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        initial={still ? {} : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={view}
        transition={{ duration: 0.6, delay: 0.14 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="mt-4 font-jetbrains text-[9px] uppercase tracking-[0.22em] text-jade/55">{title}</p>
        <p className="mt-3 font-chakrapetch text-[13.5px] leading-relaxed text-flash/40">{body}</p>
      </motion.div>
    </div>
  )
}
