// StreamersInfiniteCarousel.tsx
//
// Live streamer marquee — the last section above the footer on the
// homepage. Fetches currently-live partner channels and tiles them
// in a CSS-keyframe infinite-scroll strip. The rework adds:
//   • A scroll-in entrance for the whole strip (whileInView)
//   • Heading reveal + jade accent underline
//   • Per-card hover: subtle scale + jade border glow + saturation
//   • A pulsing LIVE indicator beside each name
//   • A shimmering skeleton state (replaces plain animate-pulse)
//
// The 35s CSS marquee is preserved as-is — that's the load-bearing
// animation, and framer-motion has no business interfering with it.

import * as React from "react"
import { Eye } from "lucide-react"
import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, useInView } from "framer-motion"

type LiveStreamer = {
  id: string
  twitch_login: string
  title: string | null
  thumbnail_url: string | null
  viewer_count: number | null
  profile_image_url: string | null
  lol_nametag: string | null
  region: string | null
}

const API_BASE =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ||
  "http://localhost:3001"

const SCROLL_DURATION_S = 35

const TILE_W_FRAC_DESKTOP = 0.25
const TILE_W_FRAC_TABLET = 0.35
const TILE_W_FRAC_MOBILE = 0.48

const TILE_H_DESKTOP = 280
const TILE_H_MOBILE = 180

// Brand easing — shared with hero / search dialog / Jax banner.
const EASE_BRAND = [0.22, 1, 0.36, 1] as const

function buildSlugFromNametag(nametag: string) {
  const [name, tag] = nametag.split("#")
  if (!name || !tag) return null
  const formattedName = name.replace(/\s+/g, "+")
  const formattedTag = tag.toUpperCase()
  return `${formattedName}-${formattedTag}`
}

export default function StreamersInfiniteCarousel({
  withHeading = true,
}: {
  withHeading?: boolean
}) {
  const [items, setItems] = useState<LiveStreamer[]>([])
  const [loading, setLoading] = useState(true)
  const [vw, setVw] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1280
  )
  const navigate = useNavigate()

  // Whole-section entrance gates on the marquee scrolling into view.
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.25 })

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Measure the rail (the page column) so tiles size to the page — not the
  // full viewport — keeping the marquee in line with the rest of the homepage.
  const stripRef = useRef<HTMLDivElement>(null)
  const [stripW, setStripW] = useState(0)
  useLayoutEffect(() => {
    const el = stripRef.current
    if (!el) return
    const measure = () => setStripW(el.getBoundingClientRect().width)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [loading])

  const fetchLive = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/streamers/live`, {
        cache: "no-store",
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()

      const live = (data.live ?? []).map((x: any) => ({
        id: x.id,
        twitch_login: x.twitch_login,
        title: x.title ?? x.twitch_login,
        thumbnail_url: x.thumbnail_url ?? null,
        viewer_count: x.viewer_count ?? null,
        profile_image_url: x.profile_image_url ?? null,
        lol_nametag: x.lol_nametag ?? null,
        region: x.region ?? null,
      })) as LiveStreamer[]

      live.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""))
      setItems(live)
    } catch (e) {
      console.error(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLive()
  }, [fetchLive])

  // 👉 Se non sto caricando e non ho items, non renderizzo nulla (niente titolo, niente strip)
  if (!loading && items.length === 0) return null

  // strip per loop continuo — tiles are a fraction of the RAIL (page column)
  // width, so the same count shows across the now-narrower in-page strip.
  const frac =
    vw >= 1024 ? TILE_W_FRAC_DESKTOP : vw >= 640 ? TILE_W_FRAC_TABLET : TILE_W_FRAC_MOBILE
  const railW = stripW > 0 ? stripW : vw
  const tileWpx = Math.round(railW * frac)

  const tileHpx = vw >= 640 ? TILE_H_DESKTOP : TILE_H_MOBILE

  const base = items.length > 0 ? items : []
  let strip: LiveStreamer[] = []
  if (base.length > 0) {
    const targetWidth = railW + tileWpx
    const baseWidth = base.length * tileWpx
    const times = Math.max(1, Math.ceil(targetWidth / baseWidth))
    strip = Array.from({ length: times }, () => base).flat()
  }
  const track = strip.length ? [...strip, ...strip] : []

  return (
    <motion.section
      ref={sectionRef}
      className="relative w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.7, ease: EASE_BRAND }}
    >
      {/* Optional heading — fades in with its own jade accent line. */}
      {withHeading && (
        <div className="w-full">
          <motion.div
            className="flex items-end gap-3 mb-2 sm:mb-3"
            initial={{ opacity: 0, x: -12 }}
            animate={
              inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }
            }
            transition={{ duration: 0.55, ease: EASE_BRAND, delay: 0.1 }}
          >
            <h2 className="text-flash/60 text-base sm:text-xl">
              STREAMING PARTNERS
            </h2>
            {/* Accent line that draws under the title. */}
            <motion.span
              aria-hidden
              className="h-[1px] flex-1 max-w-[280px] origin-left mb-1.5"
              style={{
                background:
                  "linear-gradient(90deg, rgba(0,217,146,0.55), transparent)",
              }}
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.7, ease: EASE_BRAND, delay: 0.3 }}
            />
          </motion.div>
        </div>
      )}

      <style>{`
        @keyframes streamers-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .scroll-track { display: flex; animation: streamers-scroll ${SCROLL_DURATION_S}s linear infinite; will-change: transform; white-space: nowrap; }
        .scroll-paused:hover .scroll-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .scroll-track { animation: none; } }

        /* Skeleton shimmer — replaces plain pulse with a sweeping
           gradient that reads as a "loading scan" rather than a
           heartbeat. Tinted jade to match the brand. */
        @keyframes streamerShimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .streamer-skeleton {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.025) 0%,
            rgba(0,217,146,0.07) 50%,
            rgba(255,255,255,0.025) 100%
          );
          background-size: 200% 100%;
          animation: streamerShimmer 1.8s linear infinite;
        }

        /* Pulsing LIVE dot — soft jade halo loop. */
        @keyframes liveDotPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,80,100,0.7); transform: scale(1); }
          50%     { box-shadow: 0 0 0 6px rgba(255,80,100,0); transform: scale(1.15); }
        }
        .live-dot {
          animation: liveDotPulse 1.8s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .live-dot { animation: none; box-shadow: 0 0 6px rgba(255,80,100,0.6); }
        }

        /* Hover signature on a card — slight scale up plus jade
           inner ring. We attach it via the .stream-tile group class
           so framer-motion can stay out of the marquee's hair. */
        .stream-tile {
          transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .scroll-paused:hover .stream-tile:hover {
          transform: scale(1.025);
          box-shadow:
            inset 0 0 0 1px rgba(0,217,146,0.55),
            0 0 24px rgba(0,217,146,0.18);
          z-index: 5;
        }
      `}</style>

      {/* Borders removed — the streamer tiles themselves visually
          demarcate the section against the page; adding a hairline
          border made a hard white line that read as a "card edge"
          against the matching liquirice page background. */}
      <div ref={stripRef} className="scroll-paused relative select-none overflow-hidden bg-liquirice">
        {/* Fade sinistro */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-24 bg-gradient-to-r from-liquirice via-liquirice/80 to-transparent z-10" />
        {/* Fade destro */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-24 bg-gradient-to-l from-liquirice via-liquirice/80 to-transparent z-10" />
        {/* Contenuto scorrevole */}
        <div className="scroll-track">
          {loading && <SkeletonRow height={tileHpx} width={tileWpx} />}
          {!loading &&
            track.map((s, i) => {
              const hasProfile = !!s.lol_nametag && !!s.region
              const slug = hasProfile
                ? buildSlugFromNametag(s.lol_nametag!)
                : null
              const regionLc = s.region?.toLowerCase()

              return (
                <a
                  key={`${s.id}-${i}`}
                  href={`https://twitch.tv/${s.twitch_login}`}
                  target="_blank"
                  rel="noreferrer"
                  className="stream-tile relative inline-flex overflow-hidden group shrink-0 cursor-clicker"
                  style={{
                    width: tileWpx,
                    minWidth: tileWpx,
                    maxWidth: tileWpx,
                    height: tileHpx,
                    flex: `0 0 ${tileWpx}px`,
                  }}
                  draggable={false}
                >
                  {s.thumbnail_url && (
                    <img
                      src={s.thumbnail_url}
                      alt={s.title ?? s.twitch_login}
                      className="absolute inset-0 w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-[filter] duration-500"
                    />
                  )}
                  <div className="absolute inset-0 z-[1] bg-black/60 opacity-90 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />
                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/50 to-transparent opacity-95 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />
                  <div className="relative z-[2] w-full h-full p-3 sm:p-4 flex flex-col">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <img
                        src={s.profile_image_url ?? "/placeholder-avatar.png"}
                        alt={s.twitch_login}
                        className="h-9 w-9 sm:h-12 sm:w-12 rounded-lg object-cover border border-flash/20 group-hover:border-jade/40 transition-colors duration-300"
                      />
                      <div className="min-w-0">
                        <div className="text-flash/80 font-jetbrains uppercase tracking-wide text-sm sm:text-xl transition-colors text-jade font-bold flex items-center gap-2">
                          {/* Pulsing LIVE dot. */}
                          <span
                            aria-hidden
                            className="live-dot inline-block w-2 h-2 rounded-full bg-[#ff5064]"
                          />
                          <span className="truncate">{s.twitch_login}</span>
                        </div>
                        <div className="w-[80%] leading-tight text-xs sm:text-sm break-words truncate transition-colors group-hover:text-flash pt-0.5 text-flash/60 font-jetbrains uppercase">
                          {s.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1" />

                    <div className="flex items-end justify-between">
                      <div className="text-flash/60 text-xs sm:text-sm flex items-center gap-1 font-geist group-hover:text-flash transition-colors duration-300">
                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {s.viewer_count != null
                          ? s.viewer_count.toLocaleString()
                          : "—"}
                      </div>

                      {hasProfile && slug && regionLc ? (
                        <button
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-sm bg-[#041f1a] text-jade font-jetbrains uppercase text-xs cursor-clicker
                                     transition-all duration-200
                                     hover:bg-[#062e25] hover:shadow-[0_0_14px_rgba(0,217,146,0.35)] hover:scale-[1.04]"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.scrollTo({
                              top: 0,
                              left: 0,
                              behavior: "instant",
                            })
                            navigate(`/summoners/${regionLc}/${slug}`)
                          }}
                        >
                          PROFILE
                        </button>
                      ) : null}
                    </div>
                  </div>
                </a>
              )
            })}
        </div>
      </div>
    </motion.section>
  )
}

function SkeletonRow({ height, width }: { height: number; width: number }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280
  const targetWidth = vw + width
  const minTiles = Math.ceil(targetWidth / width)
  const tiles = Array.from({ length: minTiles * 2 }, (_, i) => i)
  return (
    <>
      {tiles.map((i) => (
        <div
          key={i}
          className="streamer-skeleton inline-flex shrink-0"
          style={{
            width,
            minWidth: width,
            maxWidth: width,
            height,
            flex: `0 0 ${width}px`,
            borderRight: "1px solid rgba(255,255,255,0.15)",
          }}
        />
      ))}
    </>
  )
}
