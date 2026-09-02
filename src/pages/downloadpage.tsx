import { useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Headline, Hot, Lead, stagger, upSm, VIEWPORT } from "@/components/home/showcase-kit"
import { cdnBaseUrl, cdnVersionReady, PERK_CDN } from "@/config"
import { cn } from "@/lib/utils"

/**
 * Where the desktop app is downloaded from.
 *
 * ⚠️ NOTHING ON THIS PAGE IS A SCREENSHOT, and that is the whole design. The
 * version before this pasted PNG captures of the app into rounded frames beside
 * paragraphs, which is an attachment rather than a page: soft at any size the
 * frame is not, dead on arrival, and the same shape whatever it contains. Every
 * depiction of the app here is REBUILT — real DOM, real SVG, real type — from
 * the app's own geometry, so it stays crisp at any zoom, it moves, and it can
 * be hovered.
 *
 * The language is an instrument's, because that is what the app is: it watches
 * a game and marks what happened in it. So the page annotates its own subjects
 * the way a machine would — hairline jade boxes, leader lines out to monospace
 * tags, metadata pinned to the four corners, and a subject resolved as a field
 * of struck crosses that dissolves back into the ground at its edges.
 *
 * ⚠️ The specimens have NO FRAME. Every instinct says to put a rebuilt panel in
 * a bordered plate, and every plate turns it back into a picture of the app
 * instead of the app. What says "this is a thing being examined" is the
 * hairline box and the tag, never a container.
 *
 * The version, filename, size and date are READ from the release the installed
 * app's updater polls, so this page cannot drift a version behind a release.
 */

/**
 * The app ships from GitHub Releases, so this asks GitHub what the newest one
 * is — the same single source as the installed app's own updater.
 *
 * ⚠️ The API, not the release asset. Reading `latest.yml` straight from
 * `/releases/latest/download/` looks tidier and fails in the browser: that URL
 * redirects to release-assets.githubusercontent.com, which sends NO
 * `Access-Control-Allow-Origin`, so the fetch dies on CORS. The API sends `*`.
 * The download link itself is fine either way — a link is a navigation, not a
 * cross-origin read.
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
  // x64 only, deliberately: League needs 64-bit Windows, so a machine that
  // cannot run this build cannot run the game it sits beside.
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

/* ───────────────────────── the annotation layer ───────────────────────── */

/** A monospace tag: what the instrument has decided about a subject. Two lines,
 *  because a label that names a thing and then says what it is reads in that
 *  order or not at all. */
function Tag({
  head,
  body,
  className,
  style,
}: {
  head: string
  body?: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute whitespace-nowrap font-jetbrains text-[9px] uppercase leading-[1.5] tracking-[0.22em]",
        className
      )}
      style={style}
    >
      <span className="block text-jade/75">{head}</span>
      {body && <span className="block tabular-nums text-flash/55">{body}</span>}
    </span>
  )
}

/** A hairline box around something the instrument is looking at. Jade, never
 *  white — the house rule, and the reason these read as measurement rather than
 *  as a card. */
function Reticle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute border border-jade/45", className)} style={style} />
  )
}

/** The line from a box out to its tag. */
function Leader({ style, className }: { style: React.CSSProperties; className?: string }) {
  return <span aria-hidden className={cn("pointer-events-none absolute h-px bg-jade/40", className)} style={style} />
}

/**
 * A box on the subject, a rule out to the margin, and the tag at the end of it.
 *
 * ⚠️ ONE PRIMITIVE, because three hand-placed ones drifted: a tag landed inside
 * the headline, another sat on top of a row it was supposed to point at, and a
 * box framed empty space beside the thing it meant. Here the leader is pinned to
 * the reticle at one end and to the margin at the other — `left` and `right`
 * together, so its length is whatever the gap happens to be and no arithmetic
 * can be wrong. The tag always lands in the gutter, at the leader's own height.
 *
 * The specimens sit on the LEFT of the column and the gutter is what is left
 * over on the right, which is the whole reason the annotation has anywhere to
 * live. Below `lg` there is no gutter, so there is no annotation.
 */
function Callout({
  top,
  left,
  width,
  height,
  head,
  body,
}: {
  top: number
  /** A CSS length inside the specimen box — px or a percentage of it. */
  left: string
  width: number
  height: number
  head: string
  body: string
}) {
  // ⚠️ Off the TOP-RIGHT corner, not the middle. A leader at the box's centre
  // runs straight through whatever sits on that line — it crossed a timestamp
  // in the match row — and leaving from the corner also continues the box's own
  // top edge, which is what makes the two read as one drawn figure.
  return (
    <span aria-hidden className="hidden lg:block">
      <Reticle style={{ left, top, width, height }} />
      <Leader style={{ left: `calc(${left} + ${width}px)`, right: -34, top }} />
      <Tag head={head} body={body} style={{ left: "calc(100% + 42px)", top: top - 13 }} />
    </span>
  )
}

/* ───────────────────────────── the subject ───────────────────────────── */

/**
 * A picture resolved as a field of struck crosses.
 *
 * ⚠️ SAME-ORIGIN, and it has to be. Reading pixels back out of a canvas taints
 * it the moment the source is cross-origin without a passing CORS check, and
 * our art CDN is cached by Cloudflare in a copy carrying no ACAO header — the
 * documented trap that also stops that art being a WebGL texture. So the one
 * image this page dithers is served from our own origin.
 *
 * ⚠️ The luminance is NORMALISED between percentiles before anything is drawn.
 * A splash occupies a narrow slice of the range, and a fixed threshold turns the
 * whole picture into one flat field of identical marks — a rectangle of noise
 * with no subject in it.
 */
function Halftone({
  src,
  cols = 168,
  cell = 8,
  className,
}: {
  src: string
  cols?: number
  cell?: number
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const still = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let dead = false
    let raf = 0

    const img = new Image()
    img.onload = () => {
      if (dead) return
      const rows = Math.max(1, Math.round(cols * (img.height / img.width)))

      const small = document.createElement("canvas")
      small.width = cols
      small.height = rows
      const sx = small.getContext("2d", { willReadFrequently: true })
      if (!sx) return
      sx.drawImage(img, 0, 0, cols, rows)
      const px = sx.getImageData(0, 0, cols, rows).data

      const lum = new Float32Array(cols * rows)
      for (let i = 0; i < lum.length; i++) {
        const j = i * 4
        lum[i] = (0.2126 * px[j] + 0.7152 * px[j + 1] + 0.0722 * px[j + 2]) / 255
      }
      const sorted = Float32Array.from(lum).sort()
      const lo = sorted[Math.floor(sorted.length * 0.02)]
      const hi = sorted[Math.floor(sorted.length * 0.985)]

      const mix = (a: number, b: number, t: number) => a + (b - a) * t
      const smooth = (e0: number, e1: number, x: number) => {
        const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
        return t * t * (3 - 2 * t)
      }

      type Cell = { x: number; y: number; r: number; colour: string; d: number }
      const cells: Cell[] = []
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let l = (lum[y * cols + x] - lo) / Math.max(0.001, hi - lo)
          l = Math.pow(Math.min(1, Math.max(0, l)), 1.6)
          // ⚠️ A RADIAL DISSOLVE. A splash is a painted scene edge to edge, and
          // dotting all of it gives a rectangle of noise. The subject has to
          // come out of the black and go back into it, so the edges must die.
          const u = (x / cols - 0.5) * 2
          const v = (y / rows - 0.5) * 2
          const d = Math.sqrt(u * u * 0.8 + v * v)
          l *= Math.min(1, Math.max(0, 1.16 - d * 1.05))
          if (l < 0.055) continue
          // ⚠️ NEUTRAL at the top end. Tinting the highlights jade made a green
          // picture; the palette belongs in the shadows, where the image has no
          // colour of its own to argue with.
          const t = smooth(0.22, 0.8, l)
          cells.push({
            x: x * cell + cell / 2,
            y: y * cell + cell / 2,
            r: Math.pow(l, 0.78) * (cell * 0.72),
            colour: `rgb(${Math.round(mix(0, 215, t))},${Math.round(mix(217, 216, t))},${Math.round(mix(146, 217, t))})`,
            d,
          })
        }
      }
      // It resolves from the middle outwards, the way a picture comes up.
      cells.sort((a, b) => a.d - b.d)

      canvas.width = cols * cell
      canvas.height = rows * cell
      const g = canvas.getContext("2d")
      if (!g) return
      g.fillStyle = "#040A0C"
      g.fillRect(0, 0, canvas.width, canvas.height)

      const paint = (from: number, to: number) => {
        for (let i = from; i < to; i++) {
          const c = cells[i]
          g.strokeStyle = c.colour
          g.lineWidth = Math.max(0.7, c.r * 0.58)
          g.beginPath()
          g.moveTo(c.x - c.r, c.y)
          g.lineTo(c.x + c.r, c.y)
          g.moveTo(c.x, c.y - c.r)
          g.lineTo(c.x, c.y + c.r)
          g.stroke()
        }
      }

      if (still) {
        paint(0, cells.length)
        return
      }
      let done = 0
      const t0 = performance.now()
      const tick = () => {
        if (dead) return
        const p = Math.min(1, (performance.now() - t0) / 1100)
        const target = Math.floor(cells.length * (p * p * (3 - 2 * p)))
        paint(done, target)
        done = target
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    img.src = src

    return () => {
      dead = true
      cancelAnimationFrame(raf)
    }
  }, [src, cols, cell, still])

  return <canvas ref={ref} aria-hidden className={className} />
}

/* ─────────────────────── the app's own marks, redrawn ─────────────────── */

const MARK = {
  kill: "#00d992",
  multi: "#FFB615",
  death: "#ff6286",
  assist: "#7f8386",
} as const
type MarkKind = keyof typeof MARK

/**
 * ⚠️ The app's glyphs, to the unit. Authored in a 14-unit box centred on (7,7)
 * — crossed swords for a kill, a golem's face for a death, a dot for an assist.
 * Shape carries the meaning and colour only agrees with it, because a red tick
 * and a green tick are the same tick to a colourblind player, and this game has
 * a lot of both.
 */
function MarkGlyph({ kind, size = 14 }: { kind: MarkKind; size?: number }) {
  const c = MARK[kind]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      aria-hidden
      style={{
        filter: `drop-shadow(0 0 3px ${c}${kind === "assist" ? "44" : "88"}) drop-shadow(0 1px 2px rgba(0,0,0,0.85))`,
      }}
    >
      {kind === "assist" && <circle cx="7" cy="7" r="2.6" fill={c} opacity="0.75" />}
      {kind === "death" && (
        <>
          <path d="M2.5 5.5 L4.3 2.4 L9.7 2.4 L11.5 5.5 Z" fill={c} />
          <path
            d="M3.4 6.6 L10.6 6.6 L10.6 9.6 L9 11.7 L5 11.7 L3.4 9.6 Z"
            fill="none"
            stroke={c}
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <rect x="4.5" y="7.4" width="1.9" height="1.7" fill="#fff5f7" />
          <rect x="7.6" y="7.4" width="1.9" height="1.7" fill="#fff5f7" />
        </>
      )}
      {(kind === "kill" || kind === "multi") && (
        <>
          <path d="M11.9 1.6 L12.4 3.4 L4.6 11.9 L3.1 10.5 Z" fill={c} />
          <path d="M2.1 1.6 L1.6 3.4 L9.4 11.9 L10.9 10.5 Z" fill={c} opacity="0.92" />
          <path d="M2 8.2 L5.4 11.6 M12 8.2 L8.6 11.6" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

/* ───────────────────────────── the page ───────────────────────────── */

export default function DownloadPage() {
  const [rel, setRel] = useState<Release | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading")
  const [cdn, setCdn] = useState(cdnBaseUrl())
  const still = useReducedMotion()

  useEffect(() => {
    const ctl = new AbortController()
    fetch(RELEASE_API, { signal: ctl.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const parsed = d ? parseRelease(d) : null
        if (parsed) {
          setRel(parsed)
          setState("ready")
        } else setState("unavailable")
      })
      .catch(() => {
        if (!ctl.signal.aborted) setState("unavailable")
      })
    return () => ctl.abort()
  }, [])

  // Champion art is served UNDER A PATCH, so the path can only be built once the
  // CDN has said which patch it is on. Until then the fallback version is used,
  // which is a real one — nothing 404s while this resolves.
  useEffect(() => {
    let alive = true
    void cdnVersionReady.then(() => {
      if (alive) setCdn(cdnBaseUrl())
    })
    return () => {
      alive = false
    }
  }, [])

  const href = rel?.url ?? null
  const mb = rel?.size ? (rel.size / 1048576).toFixed(0) : null
  const meta = [rel ? `v${rel.version}` : null, "windows x64", mb ? `${mb} mb` : null].filter(Boolean).join(" · ")

  // One timeline for the opening, so the parts arrive in a considered order
  // instead of each animating on its own schedule.
  const step = (i: number) => ({
    initial: still ? {} : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay: still ? 0 : 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] as const },
  })

  return (
    <div className="min-h-screen overflow-x-hidden bg-liquirice text-flash">
      {/* ⚠️ NO STRIP BEHIND THE BAR. There used to be a solid gradient here so
          section headlines could not run through the navbar, and it also cut a
          64px black band across the top of the subject. The bar is already
          `bg-[#040A0C]/30 backdrop-blur-xl` in its floating mode — built for a
          hero to read THROUGH it, which is what the homepage does with Katarina
          — so the right fix was to delete the strip, not to tint it. */}
      <Navbar sticky addOffsetSpacer={false} />

      {/* ───────────────── the subject ───────────────── */}
      {/* Full height, and it starts at y=0: the navbar is `fixed` in this mode
          and takes no space in the flow, so the field of marks runs under it. */}
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden">
        <motion.div
          initial={still ? {} : { opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Halftone src="/img/desktop/subject.jpg" className="h-full w-full object-cover" />
        </motion.div>

        {/* One pass of the instrument down the frame, while the picture is still
            resolving. It happens ONCE — an edge that never stops moving asks for
            attention it does not need after the first second. */}
        {!still && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-[180px]"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,217,146,0) 0%, rgba(0,217,146,0.10) 55%, rgba(215,216,217,0.16) 82%, rgba(0,217,146,0) 100%)",
            }}
            initial={{ top: "-20%", opacity: 0 }}
            animate={{ top: "110%", opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.9, ease: [0.33, 0, 0.15, 1], times: [0, 0.12, 0.8, 1] }}
          />
        )}

        {/* The ground climbs back over the lower half so the type has somewhere
            to sit. Contained: it reaches zero inside its own box. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%]"
          style={{ background: "linear-gradient(180deg, rgba(4,10,12,0) 0%, rgba(4,10,12,0.62) 30%, rgba(4,10,12,0.94) 55%, #040A0C 100%)" }}
        />

        {/* What the instrument has noticed, hung off the subject — and it
            arrives AFTER the picture it is annotating: the box lands, the rule
            draws out of it, the tag follows. Reading order, not decoration. */}
        {ANNOTATIONS.map((a, i) => (
          <div key={a.head} aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
            <motion.span
              className="absolute border border-jade/45"
              style={{ left: a.box.left, top: a.box.top, width: a.box.w, height: a.box.h }}
              initial={still ? {} : { opacity: 0, scale: 0.82 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: still ? 0 : 1.15 + i * 0.16, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {a.inner && (
                <span className="absolute left-1/2 top-1/2 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 border border-jade/80" />
              )}
            </motion.span>
            <motion.span
              className="absolute h-px bg-jade/40"
              style={{ left: a.rule.left, top: a.rule.top, width: a.rule.w, transformOrigin: a.rule.from }}
              initial={still ? {} : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.45, delay: still ? 0 : 1.35 + i * 0.16, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              className={cn(
                "absolute whitespace-nowrap font-jetbrains text-[9px] uppercase leading-[1.5] tracking-[0.22em]",
                a.align === "right" && "text-right"
              )}
              style={{ left: a.tag.left, top: a.tag.top, width: a.tag.w }}
              initial={still ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: still ? 0 : 1.7 + i * 0.16 }}
            >
              <span className="block text-jade/75">{a.head}</span>
              <span className="block tabular-nums text-flash/55">{a.body}</span>
            </motion.span>
          </div>
        ))}

        <div className="absolute inset-x-0 bottom-[12%] px-6 text-center xl:px-[12%]">
          <motion.h1
            {...step(0)}
            className="mx-auto max-w-[17ch] font-chakrapetch text-[clamp(38px,7vw,86px)] font-bold leading-[0.94] tracking-tight text-flash"
          >
            It watches the game.
            <br />
            It <Hot>marks</Hot> what mattered.
          </motion.h1>
          <motion.p
            {...step(1)}
            className="mx-auto mt-6 max-w-[56ch] font-chakrapetch text-[15px] leading-relaxed text-flash/60"
          >
            A companion that sits beside League: it writes your runes into the client, reads the fight
            while you are still in it, and keeps the ninety seconds of a thirty-minute game you
            actually wanted.
          </motion.p>
          <motion.div {...step(2)} className="mt-9">
            <DownloadButton href={href} state={state} />
            {/* The release metadata, under the thing it describes. It used to be
                pinned to a corner of the frame, where it read as furniture. */}
            <p className="mt-4 font-jetbrains text-[9px] uppercase tracking-[0.24em] tabular-nums text-flash/25">
              {meta || "reading the release…"}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ───────────────── the objects ───────────────── */}
      <Subject
        index="01"
        when="champion select"
        title={
          <>
            The runes are already <Hot>chosen</Hot>.
          </>
        }
        lead="Lock in, and the five pages people actually run on that champion — in that lane — are on screen with their win rates. One press writes the one you want into the client, and it never touches a page you made yourself."
      >
        <RuneSpecimen />
      </Subject>

      <Subject
        index="02"
        when="in game"
        title={
          <>
            The scoreboard, on the game's <Hot>own HUD</Hot>.
          </>
        }
        lead="Both teams, live, with the gold lead spelled out where the kill count already is. Dragon and Baron ninety seconds early, boots read off the composition you are actually against, and a nudge the moment an item is affordable. Nothing to alt-tab to."
      >
        <BoardSpecimen cdn={cdn} />
      </Subject>

      <Subject
        index="03"
        when="while you play"
        title={
          <>
            Thirty minutes in. <Hot>Eleven marks</Hot> on it.
          </>
        }
        lead="It starts when the game starts and stops when it ends, capturing the League window only — never the rest of your screen. Every kill, death and assist lands on the timeline, so the fight you want is one press away instead of a hunt along a scrub bar."
      >
        <TimelineSpecimen cdn={cdn} />
      </Subject>

      <Subject
        index="04"
        when="after the game"
        title={
          <>
            Every death is a <Hot>button</Hot>.
          </>
        }
        lead="The recap opens by itself the second the game ends. Press a death and the recording opens two seconds before it happened, so you watch the fight that caused it rather than the moment you died."
      >
        <MatchesSpecimen cdn={cdn} />
      </Subject>

      {/* ───────────────── the notes ───────────────── */}
      <section className="px-6 pb-24 pt-4 xl:px-[12%]">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT}
          className="grid gap-x-12 gap-y-9 sm:grid-cols-3"
        >
          {NOTES.map((n) => (
            <motion.div key={n.head} variants={upSm}>
              <span
                aria-hidden
                className="mb-4 block h-px w-full"
                style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.45), rgba(0,217,146,0))" }}
              />
              <p className="font-jetbrains text-[9px] uppercase tracking-[0.22em] text-jade/70">{n.head}</p>
              <p className="mt-3 max-w-[38ch] font-chakrapetch text-[13px] leading-relaxed text-flash/40">{n.body}</p>
            </motion.div>
          ))}
        </motion.div>

        <p className="mt-14 max-w-[64ch] font-jetbrains text-[9px] uppercase leading-[2] tracking-[0.2em] text-flash/22">
          The app never asks for your password — signing in opens your browser. It reads the League
          client the way Riot allows, and shows only what you could already see yourself.
        </p>
      </section>

      <Footer className="px-6 pb-10 xl:px-[12%]" />
    </div>
  )
}

/**
 * The two things the instrument has picked out of the hero, and where.
 *
 * ⚠️ Both live ABOVE the headline. At the subject's mid-height a box and its tag
 * ran straight through "It watches the game." — an annotation layer that lands
 * on the type is just debris on the picture.
 */
const ANNOTATIONS = [
  {
    head: "object (1)",
    body: "kill · 18:23",
    align: "left" as const,
    inner: true,
    box: { left: "53.5%", top: "24%", w: 74, h: 74 },
    rule: { left: "calc(53.5% + 74px)", top: "calc(24% + 12px)", w: 172, from: "left center" },
    tag: { left: "calc(53.5% + 254px)", top: "calc(24% - 4px)", w: 160 },
  },
  {
    head: "object (2)",
    body: "death · 21:07",
    align: "right" as const,
    inner: false,
    box: { left: "31%", top: "27%", w: 46, h: 46 },
    rule: { left: "calc(31% - 150px)", top: "calc(27% + 23px)", w: 150, from: "right center" },
    tag: { left: "calc(31% - 306px)", top: "calc(27% + 8px)", w: 150 },
  },
]

const NOTES = [
  {
    head: "it updates itself",
    body:
      "New versions show a button inside the app. It downloads only what changed and restarts when you press it — never on its own, and never mid-game.",
  },
  {
    head: "windows will warn you",
    body:
      "The app is not code-signed yet, so SmartScreen says “unrecognised app”. Choose More info, then Run anyway. A certificate is on the list; it costs money rather than effort.",
  },
  {
    head: "64-bit only",
    body: "League itself needs 64-bit Windows, so there is no machine that could run the game but not this.",
  },
]

/** One subject, annotated: the index and headline, the lead beside it, and the
 *  rebuilt specimen underneath with its tag. */
function Subject({
  index,
  when,
  title,
  lead,
  children,
}: {
  index: string
  when: string
  title: React.ReactNode
  lead: string
  children: React.ReactNode
}) {
  return (
    <section className="px-6 py-20 md:py-28 xl:px-[12%]">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT}
        className="grid items-end gap-x-16 gap-y-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]"
      >
        <div>
          <motion.p variants={upSm} className="font-jetbrains text-[9px] uppercase tracking-[0.26em] text-flash/30">
            <span className="text-jade/70">{index}</span>
            <span className="mx-2.5 text-jade/25">/</span>
            {when}
          </motion.p>
          <Headline className="mt-4 max-w-[16ch]">{title}</Headline>
        </div>
        <Lead className="max-w-[52ch]">{lead}</Lead>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-16"
      >
        {children}
      </motion.div>
    </section>
  )
}

/* ───────────────────────────── the specimens ───────────────────────────── */

const RUNE_PAGES = [
  { key: "Electrocute", tree: "Domination", style: "7200_Domination", name: "electrocute", wr: "51.8%" },
  { key: "SummonAery", tree: "Sorcery", style: "7202_Sorcery", name: "aery", wr: "52.4%" },
  { key: "PressTheAttack", tree: "Precision", style: "7201_Precision", name: "press the attack", wr: "50.1%" },
  { key: "FirstStrike", tree: "Inspiration", style: "7203_Whimsy", name: "first strike", wr: "49.2%" },
  { key: "GraspOfTheUndying", tree: "Resolve", style: "7204_Resolve", name: "grasp", wr: "53.9%" },
]
const CHOSEN = 1

/**
 * The rune row, rebuilt — and hoverable, which the screenshot never was.
 *
 * ⚠️ A GRID, not a row of buttons that each size to their own label. The app
 * learned this the hard way: five text buttons measured 60, 47.5, 47.5, 60 and
 * 66px, which is what made them read as debris rather than as a set.
 */
function RuneSpecimen() {
  const [over, setOver] = useState<number | null>(null)
  const on = over ?? CHOSEN
  const page = RUNE_PAGES[on]

  return (
    <div className="relative max-w-[640px]">
      <div className="grid grid-cols-5 gap-1.5">
        {RUNE_PAGES.map((p, i) => {
          const lit = on === i
          return (
            <button
              key={p.key}
              type="button"
              onMouseEnter={() => setOver(i)}
              onMouseLeave={() => setOver(null)}
              onFocus={() => setOver(i)}
              onBlur={() => setOver(null)}
              className="flex flex-col items-center gap-1.5 rounded-[3px] px-1 py-2.5 leading-none transition-all duration-150"
              style={{
                // ⚠️ INSET, never an outline. This codebase lights a control
                // from the inside; a shadow pooling outward is ruled out.
                background: lit ? "rgba(0,217,146,0.13)" : "rgba(215,216,217,0.045)",
                boxShadow: lit
                  ? "inset 0 0 0 1px rgba(0,217,146,0.45)"
                  : "inset 0 0 0 1px rgba(215,216,217,0.13)",
              }}
            >
              <span className="flex items-center gap-1">
                <img
                  src={`${PERK_CDN}/Styles/${p.tree}/${p.key}/${p.key}.png`}
                  alt=""
                  className={cn("h-8 w-8 transition-opacity", !lit && "opacity-55")}
                />
                <img
                  src={`${PERK_CDN}/Styles/${p.style}.png`}
                  alt=""
                  className={cn("h-3.5 w-3.5 transition-opacity", lit ? "opacity-90" : "opacity-40")}
                />
              </span>
              <span
                className={cn(
                  "block text-center font-jetbrains text-[8.5px] uppercase leading-[1.35] tracking-[0.12em]",
                  lit ? "text-jade" : "text-flash/45"
                )}
              >
                {p.name}
              </span>
              <span
                className={cn(
                  "block font-chakrapetch text-[11px] font-bold tabular-nums",
                  lit ? "text-flash/85" : "text-flash/45"
                )}
              >
                {p.wr}
              </span>
            </button>
          )
        })}
      </div>

      {/* the resolved page, and the one thing here that looks like a button */}
      <div className="mt-5 flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <img src={`${PERK_CDN}/Styles/${page.style}.png`} alt="" className="h-5 w-5 opacity-70" />
          <img src={`${PERK_CDN}/Styles/${page.tree}/${page.key}/${page.key}.png`} alt="" className="h-8 w-8" />
          {["Sorcery/Transcendence/Transcendence", "Sorcery/Scorch/Scorch", "Domination/UltimateHunter/UltimateHunter"].map(
            (r) => (
              <img key={r} src={`${PERK_CDN}/Styles/${r}.png`} alt="" className="h-[22px] w-[22px] opacity-85" />
            )
          )}
        </span>
        <span aria-hidden className="h-6 w-px bg-jade/[0.12]" />
        <span className="flex items-center gap-1.5">
          <img src={`${PERK_CDN}/Styles/7200_Domination.png`} alt="" className="h-5 w-5 opacity-70" />
          {["Domination/TasteOfBlood/GreenTerror_TasteOfBlood", "Domination/EyeballCollection/EyeballCollection"].map(
            (r) => (
              <img key={r} src={`${PERK_CDN}/Styles/${r}.png`} alt="" className="h-[22px] w-[22px] opacity-85" />
            )
          )}
        </span>

        <span
          className="ml-auto grid h-8 w-[112px] place-items-center rounded-[3px] font-chakrapetch text-[12px] font-bold uppercase tracking-[0.12em] text-jade"
          style={{ background: "rgba(0,217,146,0.10)", boxShadow: "inset 2px 0 0 0 #00d992" }}
        >
          import
        </span>
      </div>
      <p className="mt-3 font-jetbrains text-[9px] tabular-nums tracking-[0.14em] text-flash/30">
        {page.wr} win rate · 12% of games · 43,201 games
      </p>

      <Callout
        top={-8}
        left={`${on * 20}%`}
        width={118}
        height={96}
        head="object (01)"
        body={`${page.name} · ${page.wr}`}
      />
    </div>
  )
}

const BOARD = [
  { name: "MOSCARDINO S.", role: "mid", champ: "Ahri", kda: "9 / 3 / 12", cs: "7.4/m", gold: "12.1k", me: true },
  { name: "EGO A CATERVE", role: "jungle", champ: "LeeSin", kda: "5 / 3 / 14", cs: "6.1/m", gold: "10.4k", me: false },
  { name: "LETHALITY JET", role: "top", champ: "Aatrox", kda: "8 / 5 / 4", cs: "8.0/m", gold: "11.8k", me: false },
]

/** The live board: two kill counts, one clock, and a single bar that meets
 *  where the lead actually is. */
function BoardSpecimen({ cdn }: { cdn: string }) {
  return (
    <div className="relative max-w-[660px]">
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <p className="font-jetbrains text-[9.5px] uppercase tracking-[0.24em] text-flash/30">your team</p>
          <p className="font-chakrapetch text-[30px] font-bold leading-none tabular-nums text-jade">32</p>
        </div>
        <div className="shrink-0 text-center">
          <p className="font-jetbrains text-[9px] uppercase tracking-[0.24em] text-flash/25">elapsed</p>
          <p className="font-chakrapetch text-[22px] font-bold leading-none tabular-nums text-flash/80">22:00</p>
        </div>
        <div className="flex-1 text-right">
          <p className="font-jetbrains text-[9.5px] uppercase tracking-[0.24em] text-flash/30">enemy team</p>
          <p className="font-chakrapetch text-[30px] font-bold leading-none tabular-nums" style={{ color: "#ff6286" }}>
            22
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="w-[64px] shrink-0 text-right font-chakrapetch text-[12.5px] font-bold tabular-nums text-jade">
          51.6k
        </span>
        <span className="relative h-[4px] min-w-0 flex-1 overflow-hidden rounded-[2px] bg-flash/[0.06]">
          <span
            className="absolute inset-y-0 left-0 rounded-[2px]"
            style={{ width: "56%", background: "rgba(0,217,146,0.75)" }}
          />
          <span
            className="absolute inset-y-0 right-0 rounded-[2px]"
            style={{ width: "44%", background: "rgba(255,98,134,0.6)" }}
          />
          {/* ⚠️ Cut in the GROUND colour, not a light hairline: the bar looks
              severed rather than marked, and it obeys the no-light-edge rule. */}
          <span className="absolute inset-y-[-3px] left-1/2 w-px bg-liquirice" />
        </span>
        <span
          className="w-[64px] shrink-0 font-chakrapetch text-[12.5px] font-bold tabular-nums"
          style={{ color: "#ff6286" }}
        >
          40.2k
        </span>
      </div>
      <p className="mt-1.5 text-center font-jetbrains text-[9px] uppercase tracking-[0.2em] text-flash/25">
        <span className="text-jade/70">11.4k ahead</span> · two drakes on the board
      </p>

      {/* ⚠️ It SCROLLS on a narrow screen rather than reflowing. These rows are
          the app's own geometry — a 42px portrait, fixed stat columns — and a
          phone-width reflow stacked the KDA vertically and cut the right-hand
          column off entirely. Bleeding past the edge is also what tells you
          there is more of it. */}
      <div className="-mx-6 mt-7 overflow-x-auto px-6 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="min-w-[560px] space-y-1.5">
        {BOARD.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-2.5 rounded-[3px] py-2 pl-2.5 pr-2.5"
            style={{
              background: p.me ? "rgba(0,217,146,0.09)" : "rgba(0,217,146,0.035)",
              boxShadow: p.me ? "inset 2px 0 0 0 #00d992" : "inset 1px 0 0 0 rgba(0,217,146,0.30)",
            }}
          >
            <span className="relative shrink-0">
              <img
                src={`${cdn}/img/champion/${p.champ}.png`}
                alt=""
                className="h-[42px] w-[42px] rounded-[3px]"
                style={{ boxShadow: "0 0 0 1px rgba(0,217,146,0.35)" }}
              />
              <span
                className="absolute -bottom-[3px] -left-[3px] grid h-[16px] min-w-[16px] place-items-center rounded-[2px] px-[3px] font-jetbrains text-[9px] font-bold leading-none tabular-nums"
                style={{ background: "#00d992", color: "#040A0C" }}
              >
                14
              </span>
            </span>
            <span className="w-[126px] min-w-0 shrink-0">
              <span className="block truncate font-chakrapetch text-[12.5px] font-bold leading-tight text-flash/85">
                {p.name}
                {p.me && <span className="ml-1 font-jetbrains text-[8px] uppercase tracking-[0.14em] text-jade">you</span>}
              </span>
              <span className="block truncate font-jetbrains text-[8.5px] uppercase tracking-[0.14em] text-flash/25">
                {p.role}
              </span>
            </span>
            <span className="font-chakrapetch text-[13px] font-bold tabular-nums text-flash/85">{p.kda}</span>
            <span className="ml-auto flex items-center gap-3.5">
              <span className="w-[46px] text-right">
                <span className="block font-chakrapetch text-[12.5px] font-bold leading-none tabular-nums text-flash/70">
                  {p.cs}
                </span>
                <span className="block font-jetbrains text-[8px] uppercase tracking-[0.12em] text-flash/22">cs</span>
              </span>
              <span className="w-[46px] text-right">
                <span className="block font-chakrapetch text-[12.5px] font-bold leading-none tabular-nums text-flash/70">
                  {p.gold}
                </span>
                <span className="block font-jetbrains text-[8px] uppercase tracking-[0.12em] text-flash/22">worth</span>
              </span>
            </span>
          </div>
        ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2.5 border-t border-jade/[0.10] pt-3">
        <span className="h-[7px] w-[7px] rounded-full bg-jade" style={{ boxShadow: "0 0 8px rgba(0,217,146,0.8)" }} />
        <span className="font-jetbrains text-[9px] uppercase tracking-[0.2em] text-flash/35">recording</span>
      </div>

      <Callout top={62} left="0px" width={660} height={30} head="the gold lead" body="11.4k ahead · 22:00" />
    </div>
  )
}

const PINS: { at: number; kind: MarkKind; n: number; time: string; who: string[] }[] = [
  { at: 5, kind: "kill", n: 1, time: "3:12", who: ["Ashe"] },
  { at: 11, kind: "death", n: 1, time: "5:40", who: ["Zed"] },
  { at: 18, kind: "kill", n: 1, time: "7:55", who: ["Thresh"] },
  { at: 26, kind: "assist", n: 1, time: "9:31", who: ["Ashe"] },
  { at: 37, kind: "kill", n: 1, time: "12:18", who: ["Zed"] },
  { at: 44, kind: "death", n: 1, time: "14:02", who: ["Ashe"] },
  { at: 61, kind: "multi", n: 3, time: "18:23", who: ["Ashe", "Thresh", "Zed"] },
  { at: 69, kind: "assist", n: 1, time: "20:44", who: ["Thresh"] },
  { at: 77, kind: "kill", n: 1, time: "22:51", who: ["Zed"] },
  { at: 86, kind: "death", n: 1, time: "25:33", who: ["Thresh"] },
  { at: 93, kind: "kill", n: 1, time: "28:07", who: ["Ashe"] },
]

/**
 * The timeline, rebuilt — and hoverable, which a PNG of it never was.
 *
 * A stem standing on the track with a head whose shape says which way the fight
 * went. The label is a WASH rather than a card: a gradient opaque at the mark
 * and fading to nothing away from it, so it never draws an edge.
 */
function TimelineSpecimen({ cdn }: { cdn: string }) {
  const [over, setOver] = useState(6)
  const pin = PINS[over]
  // A label near the right edge would run off the page, so past two thirds it
  // hangs backwards off the mark instead. Measured from the mark's own position,
  // never with a transform — a transform on a text container softens the type.
  const back = pin.at > 66

  return (
    // ⚠️ `pt-14`, and it is not decoration: the label hangs 54px ABOVE the marks
    // row, outside its own box, so without this clearance it lands on the last
    // line of the lead paragraph.
    <div className="relative pt-14">
      <div className="relative h-[58px]">
        {PINS.map((p, i) => {
          const c = MARK[p.kind]
          const many = p.n > 1
          const assist = p.kind === "assist"
          const stem = assist ? 5 : many ? 13 : 9
          return (
            <button
              key={i}
              type="button"
              aria-label={`${p.kind} at ${p.time}`}
              onMouseEnter={() => setOver(i)}
              onFocus={() => setOver(i)}
              className="group absolute bottom-0 flex h-[58px] w-[22px] -translate-x-1/2 flex-col items-center justify-end"
              style={{ left: `${p.at}%` }}
            >
              {many && (
                <span
                  className="mb-[1px] font-jetbrains text-[8px] font-bold leading-none tabular-nums"
                  style={{ color: c, opacity: 0.9 }}
                >
                  {p.n}
                </span>
              )}
              <span className="transition-transform duration-150 group-hover:-translate-y-[2px] group-hover:scale-125">
                <MarkGlyph kind={p.kind} />
              </span>
              <span
                aria-hidden
                style={{ width: 1, height: stem, background: `linear-gradient(${c}${assist ? "55" : "cc"}, ${c}22)` }}
              />
            </button>
          )
        })}

        {/* the label, hung off whichever mark is under the pointer */}
        <span
          key={over}
          className="pointer-events-none absolute -top-[54px] z-10 flex flex-col gap-[3px] whitespace-nowrap py-1.5"
          style={{
            [back ? "right" : "left"]: `${back ? 100 - pin.at : pin.at}%`,
            paddingLeft: back ? 40 : 12,
            paddingRight: back ? 12 : 40,
            // The tail is the long side and always points AWAY from the mark, so
            // it still reads as growing out of it.
            background: `linear-gradient(${back ? 270 : 90}deg, ${MARK[pin.kind]}2e 0%, ${MARK[pin.kind]}14 42%, transparent 100%)`,
          }}
        >
          <span className="flex items-center gap-2.5">
            {pin.who.map((ch) => (
              <span key={ch} className="flex items-center gap-1.5">
                <img src={`${cdn}/img/champion/${ch}.png`} alt="" className="h-[18px] w-[18px] rounded-[2px]" />
                {/* ⚠️ Icons only on a phone. Three faces, three names and a tail
                    is wider than the screen the bar is on, and a label that
                    leaves the screen has stopped labelling anything. The face is
                    the half that gets recognised anyway. */}
                <span className="hidden font-chakrapetch text-[13px] font-bold text-flash/90 sm:inline">{ch}</span>
              </span>
            ))}
          </span>
          <span className="flex items-center gap-1.5 font-jetbrains text-[9px] uppercase tracking-[0.16em]">
            <MarkGlyph kind={pin.kind} size={11} />
            <span style={{ color: MARK[pin.kind] }}>{pin.n > 1 ? `${pin.n} × kill` : pin.kind}</span>
            <span className="tabular-nums text-flash/45">{pin.time}</span>
          </span>
        </span>
      </div>

      {/* the track, and where you are on it */}
      <div className="relative h-[2px] w-full bg-flash/10">
        <span
          className="absolute inset-y-0 left-0 w-[38%]"
          style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.18), rgba(0,217,146,0.6))" }}
        />
        <span className="absolute left-[38%] top-[-8px] h-[19px] w-[2px] bg-flash" />
      </div>
      <p className="mt-3 font-jetbrains text-[10px] tabular-nums tracking-[0.14em] text-flash/45">
        11:38 <span className="text-flash/20">/ 30:40</span>
      </p>

      <div className="mt-16 grid gap-x-12 gap-y-8 sm:grid-cols-3">
        {[
          [
            "hover a mark",
            "It names the champions in the fight, and a teamfight collapses into one pin carrying its count.",
          ],
          [
            "game and Discord apart",
            "Recorded on separate channels, so in the replay you can turn your friends down without touching the game.",
          ],
          [
            "a disk budget",
            "You set a size in gigabytes. Older recordings age out on their own, and anything you keep never does.",
          ],
        ].map(([head, body]) => (
          <div key={head}>
            <p className="font-jetbrains text-[9px] uppercase tracking-[0.22em] text-jade/70">{head}</p>
            <p className="mt-2.5 max-w-[36ch] font-chakrapetch text-[13px] leading-relaxed text-flash/40">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const MATCHES = [
  { champ: "Ahri", queue: "ranked solo", kda: "9 / 3 / 12", win: true, when: "2h ago", deaths: 3 },
  { champ: "Lillia", queue: "ranked solo", kda: "4 / 7 / 9", win: false, when: "3h ago", deaths: 7 },
  { champ: "Ashe", queue: "clash", kda: "14 / 2 / 6", win: true, when: "yesterday", deaths: 2 },
]

/** The recap list. ⚠️ A LOSS IS CITRINE, not rose — the app reserves #ff6286
 *  for deaths and enemies, so a lost game reads as noted rather than as alarm. */
function MatchesSpecimen({ cdn }: { cdn: string }) {
  return (
    <div className="relative max-w-[700px]">
      <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="min-w-[600px] space-y-1.5">
      {MATCHES.map((m) => (
        <div
          key={m.champ}
          className="flex items-center gap-3 rounded-[3px] py-2.5 pl-4 pr-3"
          style={{
            background: m.win ? "rgba(0,217,146,0.05)" : "rgba(255,182,21,0.04)",
            boxShadow: `inset 3px 0 0 0 ${m.win ? "#00d992" : "#FFB615"}`,
          }}
        >
          <img
            src={`${cdn}/img/champion/${m.champ}.png`}
            alt=""
            className="h-11 w-11 rounded-[3px] ring-1 ring-jade/15"
          />
          <span className="w-[116px]">
            <span className="block font-chakrapetch text-[13px] font-bold text-flash/85">{m.champ}</span>
            <span className="block font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/25">{m.queue}</span>
          </span>
          <span className="w-[92px] font-chakrapetch text-[15px] font-bold tabular-nums text-flash/80">{m.kda}</span>

          {/* every death, as the button it is */}
          <span className="ml-auto flex items-center gap-1.5">
            {Array.from({ length: m.deaths }).map((_, d) => (
              <span
                key={d}
                className="grid h-[22px] w-[22px] place-items-center rounded-[2px]"
                style={{ background: "rgba(255,98,134,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,98,134,0.22)" }}
              >
                <MarkGlyph kind="death" size={11} />
              </span>
            ))}
          </span>
          <span className="w-[78px] text-right font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/25">
            {m.when}
          </span>
        </div>
      ))}
        </div>
      </div>

      {/* Row 2's deaths, measured: rows are 64px tall on a 6px gap, the death
          chips are right-aligned before a 78px column, and there are seven of
          them at 22px on a 6px gap. */}
      <Callout top={86} left="418px" width={194} height={32} head="press one" body="opens at −2s" />
    </div>
  )
}

/**
 * The one control on the page.
 *
 * ⚠️ Lit from the INSIDE. An outward jade pool under a flat plate is ruled out
 * across this codebase — a control glows inward or not at all. A disabled <a> is
 * not a thing either, so with nothing to download this renders a real disabled
 * <button>: a pointer that never resolves is worse than a control that says so.
 */
function DownloadButton({ href, state }: { href: string | null; state: "loading" | "ready" | "unavailable" }) {
  const label =
    state === "loading" ? "checking…" : state === "unavailable" ? "not released yet" : "download for windows"

  const skin =
    "group relative inline-flex items-center gap-3 rounded-[3px] px-8 py-4 font-jetbrains text-[11px] uppercase tracking-[0.24em] transition-all duration-200"
  const ready = state === "ready" && href

  const inner = (
    <>
      {/* The rhombus is the mark. No stock download glyph: the sentence already
          says what happens, and an icon beside explicit words reads as clip art. */}
      <span
        aria-hidden
        className="block h-[6px] w-[6px] rotate-45 transition-transform duration-300 group-hover:rotate-[135deg]"
        style={{ background: ready ? "#00d992" : "rgba(215,216,217,0.35)" }}
      />
      {label}
    </>
  )

  if (!ready) {
    return (
      <button
        type="button"
        disabled
        className={skin}
        style={{
          color: "rgba(215,216,217,0.35)",
          background: "rgba(215,216,217,0.05)",
          boxShadow: "inset 0 0 0 1px rgba(215,216,217,0.14)",
        }}
      >
        {inner}
      </button>
    )
  }
  return (
    <a
      href={href}
      className={skin}
      style={{
        color: "#00d992",
        background: "rgba(0,217,146,0.07)",
        boxShadow: "inset 0 0 0 1px rgba(0,217,146,0.42), inset 0 0 22px rgba(0,217,146,0.12)",
      }}
    >
      {inner}
    </a>
  )
}
