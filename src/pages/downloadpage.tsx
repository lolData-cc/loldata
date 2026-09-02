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
      {/* ⚠️ STICKY, where it used to be columnInset. That mode is `md:static`,
          so on any desktop window the bar scrolled away with the page and the
          only way back to the site was the browser's own back button. A page
          whose whole job is to send you somewhere else must keep the way out
          visible. The section below already carries its own top padding, so it
          asks for no spacer. */}
      <Navbar sticky addOffsetSpacer={false} />

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

      {/* ── everything it does, in the order you meet it ──────────────── */}
      <section className="px-6 xl:px-[17.5%] min-[2560px]:px-[22.5%] pb-28">
        <Rule />
        <h2 className="mt-10 max-w-[20ch] font-chakrapetch text-[34px] font-bold leading-[1.08] tracking-tight text-flash/90 sm:text-[42px]">
          It is with you for the <span className="text-jade">whole game</span>.
        </h2>
        <p className="mt-4 max-w-[62ch] font-chakrapetch text-[14px] leading-relaxed text-flash/40">
          Not a tab you remember to open. It wakes with the client, follows the game
          you are actually in, and has already done the reading by the time you need it.
        </p>

        {/* ⚠️ Grouped by WHEN you meet each one, not by what part of the app it
            lives in. A feature list ordered by architecture asks the reader to
            hold a map of the software; ordered by the minute of the game it
            happens in, it reads as the evening they are about to have. */}
        <div className="mt-16 space-y-16">
          {ACTS.map((act, i) => (
            <Act key={act.when} act={act} index={i} />
          ))}
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
 * What the app does, in the order a game happens.
 *
 * ⚠️ Every line here is a thing that SHIPS. The temptation on a download page
 * is to write the roadmap in the present tense; the cost of doing it is that
 * the first evening disproves the page, and nothing else on it is believed
 * afterwards.
 */
const ACTS: {
  when: string
  title: string
  lead: string
  items: { name: string; body: string }[]
}[] = [
  {
    when: "champion select",
    title: "The page you would have looked up, already open",
    lead: "The moment you lock in, it knows the champion and the lane.",
    items: [
      {
        name: "Five real rune pages",
        body: "The pages people actually run on that champion IN THAT LANE, each with its win rate and how much of the sample it is. Never another lane's page — if there is no data for top, it says so instead of handing you the mid one.",
      },
      {
        name: "Written into your client",
        body: "One press and the page is in League's own rune list, ready to select. It never touches a page you made yourself.",
      },
      {
        name: "The highest elo's own page",
        body: "Beside the popular ones: the exact page the best one-trick on that champion and role is playing, with their name and rank on it.",
      },
      {
        name: "Who you are against",
        body: "Ranks over all ten cards on the loading screen, while there is still time to read them.",
      },
    ],
  },
  {
    when: "in game",
    title: "It talks to you on the HUD, and only when it matters",
    lead: "Notices land in the game's own furniture. Nothing to alt-tab to.",
    items: [
      {
        name: "Gold lead where the score is",
        body: "A chevron and a number beside the kill counter, so the one question you keep asking is answered without opening the scoreboard.",
      },
      {
        name: "Dragon and Baron, ninety seconds early",
        body: "With who has taken which drakes so far — the part you forget by minute twenty.",
      },
      {
        name: "Boots for THIS comp",
        body: "The opening build, and boots advice read off what the enemy actually picked rather than the average game.",
      },
      {
        name: "It notices when you go off-plan",
        body: "Buy something that is not in your build and it stops reciting the plan, and asks instead what players who reached your ACTUAL inventory bought next.",
      },
    ],
  },
  {
    when: "while you play",
    title: "The game records itself, and marks its own highlights",
    lead: "Starts when the game does, stops when it ends. You do nothing.",
    items: [
      {
        name: "The window, never your screen",
        body: "It captures the League window and nothing else you have open, and the overlay says it is recording at the start of every game — a notice that cannot be switched off.",
      },
      {
        name: "A timeline of moments, not a scrub bar",
        body: "Every kill, death and assist is a mark on the timeline. Hover one and it says death by Kha'Zix, with the champion's face. A teamfight collapses into a single pin that carries its count.",
      },
      {
        name: "Game and Discord on separate channels",
        body: "Recorded apart, so in the replay you can turn your friends down without touching the game. Your own microphone too, with the input and the level you choose.",
      },
      {
        name: "A disk budget, not a mess",
        body: "You set a size in gigabytes. Older recordings age out on their own, and anything you mark as kept never does.",
      },
    ],
  },
  {
    when: "after the game",
    title: "The post-mortem is open before you ask for it",
    lead: "The recap arrives the second the game ends, and waits for you.",
    items: [
      {
        name: "Every death is a button",
        body: "Press one and the recording opens two seconds before it happened, so you see the fight that caused it rather than the moment you died.",
      },
      {
        name: "The full board, as a page",
        body: "Your last ranked and Clash games, and any of them opens into its whole scoreboard with the recording playing at the top.",
      },
      {
        name: "Look up anyone in it",
        body: "Click a row and the app pulls that player's real profile — rank, LP, this season's record — over the champion they played.",
      },
      {
        name: "Your form, plainly",
        body: "Win rate, KDA, CS a minute, vision a minute, hours played. The numbers you would go and calculate.",
      },
    ],
  },
  {
    when: "when you want to know why",
    title: "Two ways to interrogate the whole database",
    lead: "The same match data the website runs on, without the website.",
    items: [
      {
        name: "Ask it in words",
        body: "lolData AI answers questions about your games, a matchup or a build, with the data behind it rather than a guess.",
      },
      {
        name: "Or build the question yourself",
        body: "The Explorer wires up a subject champion, allies, enemies, items and filters on a canvas, and runs it against every recorded game.",
      },
      {
        name: "When an item is actually good",
        body: "It shows how a item's win rate moves against enemy compositions — more AD, more assassins — and only calls a shift real when it survives a significance test.",
      },
      {
        name: "What changed this patch",
        body: "Win rate, KDA, CS and gold drawn across recent patches, with a plain verdict on which way it is going.",
      },
    ],
  },
]

/** A hairline that starts at the left and dies before the right edge — the
 *  same figure the app uses to open a panel. */
const Rule = () => (
  <span
    aria-hidden
    className="block h-px w-full"
    style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.5), rgba(0,217,146,0))" }}
  />
)

/** One act of the game, and what the app does during it. */
function Act({ act, index }: { act: (typeof ACTS)[number]; index: number }) {
  const still = useReducedMotion()
  const view = { once: true, margin: "-70px" } as const

  return (
    <motion.div
      initial={still ? {} : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={view}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
    >
      <div>
        {/* The minute of the game this belongs to, numbered — these ARE a
            sequence, which is the one thing that earns a numeral. */}
        <p className="font-jetbrains text-[9px] uppercase tracking-[0.24em] text-jade/60">
          <span className="text-jade/30">{String(index + 1).padStart(2, "0")}</span>
          <span className="mx-2 text-jade/20">/</span>
          {act.when}
        </p>
        <h3 className="mt-3 max-w-[22ch] font-chakrapetch text-[21px] font-bold leading-[1.2] text-flash/85">
          {act.title}
        </h3>
        <p className="mt-3 max-w-[36ch] font-chakrapetch text-[13px] leading-relaxed text-flash/35">
          {act.lead}
        </p>
      </div>

      <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
        {act.items.map((it) => (
          <div key={it.name}>
            <p className="flex items-baseline gap-2 font-chakrapetch text-[14px] font-bold leading-snug text-flash/80">
              <span
                aria-hidden
                className="mt-[1px] block h-[6px] w-[6px] shrink-0 rotate-45 bg-jade/70"
              />
              {it.name}
            </p>
            <p className="mt-2 pl-[14px] font-chakrapetch text-[12.5px] leading-relaxed text-flash/35">
              {it.body}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
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
