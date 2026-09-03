import { useEffect, useRef } from "react"
import { useReducedMotion } from "framer-motion"

/**
 * A picture resolved as a field of struck crosses.
 *
 * Shared by the download page's hero and the sign-in page, because it is the
 * site's one piece of real atmosphere and two copies of it would drift.
 *
 * ⚠️ SAME-ORIGIN, and it has to be. Reading pixels back out of a canvas taints
 * it the moment the source is cross-origin without a passing CORS check, and
 * our art CDN is cached by Cloudflare in a copy carrying no ACAO header — the
 * documented trap that also stops that art being a WebGL texture. So the images
 * this dithers are served from our own origin.
 *
 * ⚠️ The luminance is NORMALISED between percentiles before anything is drawn.
 * A splash occupies a narrow slice of the range, and a fixed threshold turns the
 * whole picture into one flat field of identical marks — a rectangle of noise
 * with no subject in it.
 */
export function Halftone({
  src,
  cols = 168,
  cell = 8,
  /**
   * How hard the dissolve bites from the LEFT and RIGHT, relative to top and
   * bottom.
   *
   * ⚠️ It has to be settable, because the right value depends on the shape of
   * the picture. The default under 1 is tuned for a wide splash, where the
   * horizontal edges are far away and dimming them early would eat the scene.
   * Feed the same number a tall portrait and the sides never reach zero: the
   * field ends in two hard vertical lines and the whole thing reads as a
   * rectangle of dots pasted onto the page, which is the one thing this
   * treatment must never look like. Portraits want a value above 1.
   */
  spreadX = 0.8,
  /**
   * The three tone controls, and the reason they exist.
   *
   * ⚠️ A painting that is mostly TEXTURE — fog, hair, armour, cloth — puts a
   * mid-tone in nearly every cell, and a mid-tone becomes a mark. The result
   * is not a figure but a contour map: bands of same-sized marks tracing every
   * gradient in the picture. The download hero never met this because its
   * subject is a mask, flat shapes on black. Anything painted has to be pushed
   * back to that: the black point raised so the shadows fall out (`black`, a
   * luminance percentile), the curve steepened so the mids fall with them
   * (`gamma`), and the faint marks dropped outright (`floor`). Defaults are the
   * download hero's, unchanged.
   */
  black = 0.02,
  gamma = 1.6,
  floor = 0.055,
  /**
   * The colour painted under the marks, or null for none.
   *
   * ⚠️ On the pages this is the page's own black and the fill is invisible.
   * Inside a dialog it is NOT: the canvas sits on a blurred, lighter overlay,
   * and a filled canvas shows up as a dark rectangle with the figure in it —
   * the exact box the dissolve exists to avoid. There, pass null and the
   * marks float on whatever is behind them.
   */
  ground = "#040A0C" as string | null,
  className,
}: {
  src: string
  cols?: number
  cell?: number
  spreadX?: number
  black?: number
  gamma?: number
  floor?: number
  ground?: string | null
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
      const lo = sorted[Math.floor(sorted.length * black)]
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
          l = Math.pow(Math.min(1, Math.max(0, l)), gamma)
          // ⚠️ A RADIAL DISSOLVE. A splash is a painted scene edge to edge, and
          // dotting all of it gives a rectangle of noise. The subject has to
          // come out of the black and go back into it, so the edges must die.
          const u = (x / cols - 0.5) * 2
          const v = (y / rows - 0.5) * 2
          const d = Math.sqrt(u * u * spreadX + v * v)
          l *= Math.min(1, Math.max(0, 1.16 - d * 1.05))
          if (l < floor) continue
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
      if (ground) {
        g.fillStyle = ground
        g.fillRect(0, 0, canvas.width, canvas.height)
      }

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
  }, [src, cols, cell, spreadX, black, gamma, floor, ground, still])

  return <canvas ref={ref} aria-hidden className={className} />
}
