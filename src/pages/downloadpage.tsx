import { cn } from "@/lib/utils"
import { Footer } from "@/components/footer"
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
/**
 * The app ships from GitHub Releases, so this asks GitHub what the newest one
 * is. Same single source as the installed app's own updater — this page cannot
 * fall a version behind a release, which is what every hand-maintained download
 * page eventually does.
 *
 * ⚠️ The API, not the release asset. Reading `latest.yml` straight from
 * `/releases/latest/download/` looks tidier and fails in the browser: that URL
 * redirects to release-assets.githubusercontent.com, which sends NO
 * `Access-Control-Allow-Origin`, so the fetch dies on CORS. The API sends `*`.
 * The download link itself is fine either way — a link is a navigation, not a
 * cross-origin read.
 *
 * Unauthenticated GitHub API calls are capped at 60/hour PER IP. That is per
 * visitor's own browser, so it is one call out of their sixty.
 */
const RELEASE_API = "https://api.github.com/repos/lolData-cc/desktopapp/releases/latest"

type Release = { version: string; file: string; url: string; size: number; releaseDate: string | null }

/** Anything unreadable becomes null and the page offers no stale download,
 *  rather than linking at a version that may not be there. */
function parseRelease(data: unknown): Release | null {
  const r = data as {
    tag_name?: string
    published_at?: string
    assets?: { name?: string; size?: number; browser_download_url?: string }[]
  }
  // x64 only, deliberately — see above. The .exe is the only asset a person
  // wants; latest.yml sits beside it for the updater.
  const asset = r?.assets?.find((a) => a?.name?.endsWith(".exe") && a.browser_download_url)
  const version = r?.tag_name?.replace(/^v/, "").trim()
  if (!version || !asset?.name || !asset.browser_download_url) return null
  return {
    version,
    file: asset.name,
    url: asset.browser_download_url,
    size: asset.size ?? 0,
    releaseDate: r.published_at ?? null,
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
    fetch(RELEASE_API, { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const parsed = d ? parseRelease(d) : null
        if (parsed) { setRel(parsed); setState("ready") } else setState("unavailable")
      })
      .catch(() => { if (!ctl.signal.aborted) setState("unavailable") })
    return () => ctl.abort()
  }, [])

  const href = rel?.url ?? null
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
      {/* ⚠️ A solid strip behind the fixed bar. In its floating mode the navbar
          is only tinted until the page is scrolled, so section headlines ran
          straight through it and came out unreadable. The bar keeps its own
          look; this is the ground it stands on. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-16"
        style={{ background: "linear-gradient(180deg, #040A0C 55%, rgba(4,10,12,0.85) 100%)" }}
      />
      {/* ⚠️ STICKY, where it used to be columnInset. That mode is `md:static`,
          so on any desktop window the bar scrolled away with the page and the
          only way back to the site was the browser's own back button. A page
          whose whole job is to send you somewhere else must keep the way out
          visible. The section below already carries its own top padding, so it
          asks for no spacer. */}
      <Navbar sticky addOffsetSpacer={false} />

      {/* ── the stage ─────────────────────────────────────────────────── */}
      {/* ⚠️ `pb-10`, not `pb-24`. Between this section's old bottom padding and
          the first act's own top padding there was a whole empty screen — a
          viewport of black with nothing in it, which is what "the first page is
          unwatchable" was really about. The acts below bring their own air. */}
      <section ref={stage} className="relative px-6 xl:px-[17.5%] min-[2560px]:px-[22.5%] pt-24 pb-10">
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

      {/* ── what it does, shown rather than described ─────────────────── */}
      <section className="pb-8">
        {ACTS.map((act, i) => (
          <Act key={act.when} act={act} flip={i % 2 === 1} />
        ))}
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

      {/* Every other page on the site ends with this. Without it the page just
          stopped, and there was no way on from the bottom of it. */}
      <Footer className="px-6 pb-10 xl:px-[17.5%] min-[2560px]:px-[22.5%]" />
    </div>
  )
}

/**
 * What the app does, in the order a game happens.
 *
 * ⚠️ EACH ACT IS A PICTURE FIRST. The version before this was four bullet
 * points per act and nothing to look at — a specification, not a page. Nobody
 * downloads a thing because a list told them to; they download it because they
 * saw it and wanted it on their screen. The words are down to a headline and a
 * single sentence, and everything else is the shot doing the talking.
 *
 * ⚠️ The shots are REAL, taken from the built app by scripts/shots.ts in the
 * desktop repo, driving its own development fixtures. Nothing here is a mockup
 * — which matters more on this page than anywhere else on the site, because it
 * is the last thing somebody sees before the thing itself.
 */
const ACTS: {
  when: string
  title: string
  hot: string
  lead: string
  shot: string
  alt: string
  notes: string[]
  /** A shot far wider than it is tall gets the full column instead of half of
   *  it. In a half-width column a 6:1 strip lands about forty pixels high and
   *  everything in it disappears — the picture is there and reads as nothing. */
  wide?: boolean
}[] = [
  {
    when: "champion select",
    title: "The runes are already",
    hot: "chosen",
    lead:
      "Lock in and the five pages people actually run on that champion, in that lane, are on screen with their win rates. One press writes the one you want into your client.",
    shot: "/img/desktop/runes.png",
    alt: "The app during champion select, offering five rune pages with their win rates",
    notes: ["never another lane's page", "the top one-trick's own page, with their name on it"],
  },
  {
    when: "in game",
    title: "The scoreboard you",
    hot: "keep asking for",
    lead:
      "Both teams, live, with the gold lead spelled out. Dragon and Baron ninety seconds early, boots read off the comp you are actually against, and a nudge the moment an item is affordable.",
    shot: "/img/desktop/scoreboard.png",
    alt: "The live scoreboard during a game, with the gold lead and both teams",
    notes: ["notices land on the game's own HUD", "no alt-tab, ever"],
  },
  {
    when: "while you play",
    title: "It records itself, and",
    hot: "marks the moments",
    lead:
      "Starts when the game starts, stops when it ends, and captures the League window only — never the rest of your screen. Every kill and death lands on the timeline, so the fight you want is one press away instead of a hunt along a scrub bar.",
    shot: "/img/desktop/timeline.png",
    alt: "A recording's timeline, marked at every kill and death",
    notes: [
      "hover a mark and it names the champions",
      "game and Discord on separate channels, balanced in the replay",
    ],
    wide: true,
  },
]

/** One act: a full-width shot, and as few words as it can be said in. */
function Act({ act, flip }: { act: (typeof ACTS)[number]; flip: boolean }) {
  const still = useReducedMotion()
  const view = { once: true, margin: "-120px" } as const

  const shot = (
    <motion.div
      initial={still ? {} : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={view}
      transition={{ duration: 0.75, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      className={cn("relative", !act.wide && flip && "lg:order-1")}
    >
      <div
        className="relative overflow-hidden rounded-[6px]"
        style={{
          boxShadow: "0 50px 90px -46px rgba(0,0,0,0.95), 0 0 0 1px rgba(0,217,146,0.16)",
        }}
      >
        <img src={act.shot} alt={act.alt} loading="lazy" className="block w-full" />
        {/* Screen light, not a gloss — see the note on the framed shot below. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(0,217,146,0.10) 0%, transparent 36%, transparent 72%, rgba(4,10,12,0.45) 100%)",
          }}
        />
      </div>
    </motion.div>
  )

  // A timeline is a wide, shallow thing, and it should be shown as one: the
  // words above it, the strip running the whole width beneath. It also breaks
  // the left-right-left rhythm at the right moment, on the last act.
  if (act.wide) {
    return (
      <div className="px-6 py-12 xl:px-[17.5%] min-[2560px]:px-[22.5%] sm:py-16">
        <motion.div
          initial={still ? {} : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16"
        >
          <div>
            <p className="font-jetbrains text-[9px] uppercase tracking-[0.26em] text-jade/55">
              {act.when}
            </p>
            <h3 className="mt-4 max-w-[15ch] font-chakrapetch text-[32px] font-bold leading-[1.05] tracking-tight text-flash/90 sm:text-[40px]">
              {act.title} <span className="text-jade">{act.hot}</span>.
            </h3>
          </div>
          <div>
            <p className="max-w-[48ch] font-chakrapetch text-[14px] leading-relaxed text-flash/45">
              {act.lead}
            </p>
            <ul className="mt-5 space-y-2.5">
              {act.notes.map((n) => (
                <li key={n} className="flex items-baseline gap-2.5">
                  <span aria-hidden className="mt-[1px] block h-[5px] w-[5px] shrink-0 rotate-45 bg-jade/70" />
                  <span className="font-jetbrains text-[10px] uppercase tracking-[0.14em] text-flash/35">
                    {n}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="mt-10">{shot}</div>
      </div>
    )
  }

  return (
    <div className="px-6 py-12 xl:px-[17.5%] min-[2560px]:px-[22.5%] sm:py-16">
      <div
        className={cn(
          "grid items-center gap-10 lg:gap-14",
          // ⚠️ The COLUMNS swap with the sides. Before, the text column stayed
          // narrow while only the order changed, so a flipped act had its words
          // squeezed against the edge and the layouts did not mirror.
          flip
            ? "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]"
            : "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
        )}
      >
        {/* ⚠️ The words change SIDE between acts, and the picture follows. A
            page of identical rows reads as a table however good each row is;
            alternating gives the scroll a rhythm and keeps the eye moving. */}
        <motion.div
          initial={still ? {} : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={view}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(flip && "lg:order-2")}
        >
          <p className="font-jetbrains text-[9px] uppercase tracking-[0.26em] text-jade/55">
            {act.when}
          </p>
          <h3 className="mt-4 max-w-[13ch] font-chakrapetch text-[32px] font-bold leading-[1.05] tracking-tight text-flash/90 sm:text-[40px]">
            {act.title} <span className="text-jade">{act.hot}</span>.
          </h3>
          <p className="mt-5 max-w-[44ch] font-chakrapetch text-[14px] leading-relaxed text-flash/45">
            {act.lead}
          </p>
          <ul className="mt-6 space-y-2.5">
            {act.notes.map((n) => (
              <li key={n} className="flex items-baseline gap-2.5">
                <span aria-hidden className="mt-[1px] block h-[5px] w-[5px] shrink-0 rotate-45 bg-jade/70" />
                <span className="font-jetbrains text-[10px] uppercase tracking-[0.14em] text-flash/35">
                  {n}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* The shot, sitting in the page rather than floating on it: a dark
            plate, a jade hairline, and light falling across the glass. */}
        {shot}
      </div>
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

  /**
   * ⚠️ FILLED, where it used to be a hairline outline with a light running
   * around it. This is the one thing the whole page exists to be pressed, and
   * it was the quietest object on the screen — lighter than the headline above
   * it and thinner than the paragraph beside it.
   *
   * ⚠️ Lit from the INSIDE, with no outward glow. The same rule the app writes
   * on its own volume panel: an outward coloured shadow makes a flat control
   * look stuck onto the page instead of cut into it.
   */
  const dress =
    "group inline-flex items-baseline gap-3 rounded-[3px] px-8 py-[18px] select-none transition-colors duration-200"
  const lit = {
    boxShadow: "inset 0 0 0 1px rgba(0,217,146,0.42), inset 0 0 22px rgba(0,217,146,0.14)",
  }

  const inner = (
    <>
      <span
        aria-hidden
        className="block h-[7px] w-[7px] shrink-0 translate-y-[-1px] rotate-45 bg-jade transition-transform duration-200 group-hover:rotate-[135deg]"
      />
      <span className="font-jetbrains text-[12px] font-bold uppercase tracking-[0.22em] text-jade">
        {label}
      </span>
    </>
  )

  if (!href) {
    return (
      <button
        type="button"
        disabled
        className={cn(dress, "cursor-not-allowed bg-jade/[0.05] opacity-60")}
        style={lit}
      >
        {inner}
      </button>
    )
  }

  return (
    <a href={href} className={cn(dress, "cursor-clicker bg-jade/[0.10] hover:bg-jade/[0.18]")} style={lit}>
      {inner}
    </a>
  )
}

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
