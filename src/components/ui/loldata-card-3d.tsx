// src/components/ui/loldata-card-3d.tsx
//
// Real-time 3D render of the loldata VIRTUAL membership card.
// Used by the billing success page as the hero focal element. The card
// floats, rotates slowly on its Y axis and bobs subtly on Y position —
// Apple-ad style. It's also grabbable: dragging spins it directly
// (with a vertical grab-tilt), and on release a fling inertia decays
// back into the ambient auto-spin.
//
// The card is fully procedural (no GLB): a thin bevelled extrusion of a
// rounded-rect (the metal body) plus two textured overlay planes (front
// and back face). All four texture maps are painted at runtime on 2K
// canvases, which buys us:
//   • dynamic content — remaining credits (top-right) and the 4 card
//     digits (bottom-left slots) are props, not baked pixels;
//   • the "metal business card" money shot — the wordmark is painted
//     near-black into the roughness map while the surrounding metal
//     stays matte, so the logo turns into a polished mirror that
//     flashes as the card spins through the env-map highlights;
//   • crisp text at any DPR, brand fonts included (JetBrains Mono).
//
// Layout strategy (unchanged from the GLB build)
//   • drei's <Bounds fit clip margin> auto-fits the camera so the card
//     exactly fills the canvas. `observe={false}` (default) fits once
//     at mount and stays put while the card spins.
//   • A pivot group handles the per-frame Y rotation + floating bob
//     without disturbing the Bounds-fit math. Geometry is pre-centred
//     so the card spins around its own midpoint.

import * as React from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, Bounds } from "@react-three/drei"
import * as THREE from "three"

// ─── Physical dimensions (scene units — real credit-card ratio) ─────
const CARD_W = 3.4
const CARD_H = 2.14
const CARD_R = 0.13 // corner radius
const CARD_D = 0.05 // body thickness
const BEVEL = 0.012 // edge bevel — catches rim light like a milled edge
const FACE_Z = CARD_D / 2 + BEVEL + 0.004 // overlay planes sit just above the caps

// ─── Texture resolution ──────────────────────────────────────────────
const TEX_W = 2048
const TEX_H = Math.round((TEX_W * CARD_H) / CARD_W) // ≈1289 — same aspect

// ─── Brand palette ───────────────────────────────────────────────────
const JADE = "#00d992"
const MONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace'

// ─── Canvas layout constants (px on the 2048-wide face) ─────────────
const M = 104 // outer margin
const R_PX = Math.round((CARD_R / CARD_W) * TEX_W) // corner radius ≈ 78
const WM_X = M + 4 // wordmark left
const WM_Y = 742 // wordmark baseline
const WM_SIZE = 208
const SUB_Y = 826 // "VIRTUAL MEMBERSHIP" baseline
const CRED_LABEL_Y = 188
const CRED_VALUE_Y = 356
const CRED_SIZE = 164
const SLOT = 138 // digit slot square
const SLOT_GAP = 26
const SLOT_R = 22
const SLOT_Y = TEX_H - M - SLOT

// ─── Small drawing helpers ───────────────────────────────────────────

/** Deterministic PRNG so the brushed-metal grain is identical across
 *  redraws (fonts-ready repaint) instead of shimmering. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Rounded-rect path (arcTo — no reliance on ctx.roundRect). */
function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Manual letter-spacing (canvas letterSpacing isn't universal). */
function drawSpaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "right" | "center" = "left"
) {
  const prev = ctx.textAlign
  ctx.textAlign = "left"
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  let cx = align === "left" ? x : align === "right" ? x - total : x - total / 2
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx, y)
    cx += widths[i] + spacing
  }
  ctx.textAlign = prev
}

/** HUD corner bracket — two arms meeting at (x, y). */
function bracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: 1 | -1,
  dy: 1 | -1,
  arm = 88
) {
  ctx.beginPath()
  ctx.moveTo(x + dx * arm, y)
  ctx.lineTo(x, y)
  ctx.lineTo(x, y + dy * arm)
  ctx.stroke()
}

/** "loldata" + jade period. Shared between colour / roughness / bump /
 *  emissive passes so the polished region lines up pixel-perfect with
 *  the painted glyphs. Returns nothing useful — pure paint. */
function paintWordmark(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseline: number,
  size: number,
  mainFill: string | CanvasGradient | null,
  dotFill: string | null,
  embossShadow = false
) {
  ctx.font = `800 ${size}px ${MONO}`
  ctx.textAlign = "left"
  ctx.textBaseline = "alphabetic"
  const word = "loldata"
  const w = ctx.measureText(word).width
  if (embossShadow) {
    ctx.save()
    ctx.filter = "blur(6px)"
    ctx.fillStyle = "rgba(0,0,0,0.55)"
    ctx.fillText(word, x + 2, baseline + 7)
    ctx.restore()
  }
  if (mainFill) {
    ctx.fillStyle = mainFill
    ctx.fillText(word, x, baseline)
  }
  if (dotFill) {
    ctx.fillStyle = dotFill
    ctx.fillText(".", x + w + 6, baseline)
  }
}

/** Brushed dark-metal base — gradient, grain filaments, diagonal
 *  sheen, jade ambience from bottom-left, faint jade dot grid (echo of
 *  the site's ambient layer) and a vignette. */
function paintBase(ctx: CanvasRenderingContext2D, seed: number) {
  const rnd = mulberry32(seed)

  const g = ctx.createLinearGradient(0, 0, 0, TEX_H)
  g.addColorStop(0, "#22343a")
  g.addColorStop(0.45, "#182629")
  g.addColorStop(1, "#0e181b")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  // brushed grain — fine horizontal filaments
  for (let i = 0; i < 900; i++) {
    const y = rnd() * TEX_H
    const alpha = 0.016 + rnd() * 0.04
    const light = rnd() > 0.42
    ctx.strokeStyle = light
      ? `rgba(215,216,217,${alpha})`
      : `rgba(0,0,0,${alpha * 1.4})`
    ctx.lineWidth = 0.8 + rnd() * 1.4
    ctx.beginPath()
    ctx.moveTo(-60 + rnd() * 320, y)
    ctx.lineTo(TEX_W + 60 - rnd() * 320, y)
    ctx.stroke()
  }

  // diagonal sheen band
  const sh = ctx.createLinearGradient(0, 0, TEX_W, TEX_H)
  sh.addColorStop(0.3, "rgba(215,216,217,0)")
  sh.addColorStop(0.46, "rgba(215,216,217,0.08)")
  sh.addColorStop(0.52, "rgba(231,233,234,0.14)")
  sh.addColorStop(0.58, "rgba(215,216,217,0.08)")
  sh.addColorStop(0.74, "rgba(215,216,217,0)")
  ctx.fillStyle = sh
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  // jade ambience creeping in from the bottom-left corner
  const jg = ctx.createRadialGradient(0, TEX_H, 0, 0, TEX_H, TEX_W * 0.9)
  jg.addColorStop(0, "rgba(0,217,146,0.075)")
  jg.addColorStop(1, "rgba(0,217,146,0)")
  ctx.fillStyle = jg
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  // faint jade dot grid
  ctx.fillStyle = "rgba(0,217,146,0.05)"
  for (let x = 48; x < TEX_W; x += 60)
    for (let y = 48; y < TEX_H; y += 60) {
      ctx.beginPath()
      ctx.arc(x, y, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }

  // vignette
  const vg = ctx.createRadialGradient(
    TEX_W / 2,
    TEX_H / 2,
    TEX_H * 0.35,
    TEX_W / 2,
    TEX_H / 2,
    TEX_W * 0.72
  )
  vg.addColorStop(0, "rgba(0,0,0,0)")
  vg.addColorStop(1, "rgba(0,0,0,0.26)")
  ctx.fillStyle = vg
  ctx.fillRect(0, 0, TEX_W, TEX_H)
}

/** Jade inner hairline + HUD corner brackets. `corners` picks which
 *  diagonal gets the brackets (front: TL+BR, back: TR+BL). */
function paintFrame(
  ctx: CanvasRenderingContext2D,
  hairlineAlpha: number,
  bracketAlpha: number,
  corners: "tl-br" | "tr-bl"
) {
  ctx.strokeStyle = `rgba(0,217,146,${hairlineAlpha})`
  ctx.lineWidth = 2
  rr(ctx, 26, 26, TEX_W - 52, TEX_H - 52, R_PX - 18)
  ctx.stroke()

  ctx.strokeStyle = `rgba(0,217,146,${bracketAlpha})`
  ctx.lineWidth = 3
  if (corners === "tl-br") {
    bracket(ctx, 56, 56, 1, 1)
    bracket(ctx, TEX_W - 56, TEX_H - 56, -1, -1)
  } else {
    bracket(ctx, TEX_W - 56, 56, -1, 1)
    bracket(ctx, 56, TEX_H - 56, 1, -1)
  }
}

/** 4 rounded digit slots, bottom-left. `mode` switches palette between
 *  the colour / roughness / emissive passes. */
function paintSlots(
  ctx: CanvasRenderingContext2D,
  digits: string,
  mode: "color" | "rough" | "emissive"
) {
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  for (let i = 0; i < 4; i++) {
    const x = M + i * (SLOT + SLOT_GAP)
    rr(ctx, x, SLOT_Y, SLOT, SLOT, SLOT_R)
    if (mode === "color") {
      ctx.fillStyle = "rgba(0,217,146,0.055)"
      ctx.fill()
      ctx.strokeStyle = "rgba(0,217,146,0.4)"
      ctx.lineWidth = 2.5
      ctx.stroke()
    } else if (mode === "rough") {
      ctx.strokeStyle = "#4a4a4a"
      ctx.lineWidth = 2.5
      ctx.stroke()
    } else {
      ctx.strokeStyle = "rgba(0,217,146,0.28)"
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    ctx.font = `700 76px ${MONO}`
    if (mode === "color") {
      ctx.save()
      ctx.shadowColor = "rgba(0,217,146,0.4)"
      ctx.shadowBlur = 18
      ctx.fillStyle = "rgba(235,238,238,0.95)"
      ctx.fillText(digits[i], x + SLOT / 2, SLOT_Y + SLOT / 2 + 4)
      ctx.restore()
    } else if (mode === "rough") {
      ctx.fillStyle = "#2e2e2e"
      ctx.fillText(digits[i], x + SLOT / 2, SLOT_Y + SLOT / 2 + 4)
    } else {
      ctx.fillStyle = "rgba(215,216,217,0.16)"
      ctx.fillText(digits[i], x + SLOT / 2, SLOT_Y + SLOT / 2 + 4)
    }
  }
  ctx.textBaseline = "alphabetic"
  ctx.textAlign = "left"
}

/** Credits value, top-right. Shared font/position across passes. */
function paintCredits(
  ctx: CanvasRenderingContext2D,
  credits: string,
  mode: "color" | "rough" | "emissive"
) {
  ctx.font = `700 ${CRED_SIZE}px ${MONO}`
  ctx.textAlign = "right"
  ctx.textBaseline = "alphabetic"
  if (mode === "color") {
    ctx.save()
    ctx.shadowColor = "rgba(0,217,146,0.85)"
    ctx.shadowBlur = 52
    ctx.fillStyle = JADE
    ctx.fillText(credits, TEX_W - M, CRED_VALUE_Y)
    ctx.restore()
  } else if (mode === "rough") {
    ctx.fillStyle = "#303030"
    ctx.fillText(credits, TEX_W - M, CRED_VALUE_Y)
  } else {
    ctx.save()
    ctx.shadowColor = JADE
    ctx.shadowBlur = 70
    ctx.fillStyle = JADE
    ctx.fillText(credits, TEX_W - M, CRED_VALUE_Y)
    ctx.shadowBlur = 0
    ctx.fillStyle = "#5cffc8"
    ctx.globalAlpha = 0.65
    ctx.fillText(credits, TEX_W - M, CRED_VALUE_Y)
    ctx.globalAlpha = 1
    ctx.restore()
  }
  ctx.textAlign = "left"
}

// ─── Face painters ───────────────────────────────────────────────────

function drawFront(
  ctx: CanvasRenderingContext2D,
  credits: string,
  digits: string
) {
  ctx.clearRect(0, 0, TEX_W, TEX_H)
  ctx.save()
  rr(ctx, 0, 0, TEX_W, TEX_H, R_PX)
  ctx.clip()

  paintBase(ctx, 1337)
  paintFrame(ctx, 0.16, 0.5, "tl-br")

  // top-left microtext
  ctx.font = `500 30px ${MONO}`
  ctx.fillStyle = "rgba(215,216,217,0.4)"
  drawSpaced(ctx, "VIRTUAL MEMBER ACCESS", M, CRED_LABEL_Y, 14, "left")

  // top-right — credits block
  ctx.font = `500 30px ${MONO}`
  ctx.fillStyle = "rgba(215,216,217,0.45)"
  drawSpaced(ctx, "CREDITS", TEX_W - M, CRED_LABEL_Y, 16, "right")
  paintCredits(ctx, credits, "color")

  // wordmark — brushed-silver gradient, embossed, jade period
  const silver = ctx.createLinearGradient(0, WM_Y - 190, 0, WM_Y + 24)
  silver.addColorStop(0, "#f2f4f4")
  silver.addColorStop(0.38, "#c0c5c7")
  silver.addColorStop(0.64, "#8e9497")
  silver.addColorStop(1, "#e2e5e5")
  paintWordmark(ctx, WM_X, WM_Y, WM_SIZE, silver, JADE, true)

  ctx.font = `500 34px ${MONO}`
  ctx.fillStyle = "rgba(215,216,217,0.45)"
  drawSpaced(ctx, "VIRTUAL MEMBERSHIP", WM_X, SUB_Y, 18, "left")

  // bottom-left — the 4 card digit slots
  paintSlots(ctx, digits, "color")

  // bottom-right — url, optically aligned with the slots' bottom edge
  ctx.font = `500 36px ${MONO}`
  ctx.textAlign = "right"
  ctx.fillStyle = "rgba(215,216,217,0.5)"
  ctx.fillText("loldata.cc", TEX_W - M, TEX_H - M - 14)
  ctx.textAlign = "left"

  ctx.restore()
}

/** Roughness map — the metal-card trick. Matte base (#9b), near-black
 *  wordmark → mirror polish, mid-dark digits/credits → subtle gloss. */
function drawFrontRough(
  ctx: CanvasRenderingContext2D,
  credits: string,
  digits: string
) {
  ctx.fillStyle = "#9b9b9b"
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  const rnd = mulberry32(4242)
  for (let i = 0; i < 700; i++) {
    const y = rnd() * TEX_H
    const alpha = 0.02 + rnd() * 0.05
    ctx.strokeStyle =
      rnd() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`
    ctx.lineWidth = 0.8 + rnd() * 1.4
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(TEX_W, y)
    ctx.stroke()
  }

  // smoother diagonal band — the sheen zone reflects a touch more
  const band = ctx.createLinearGradient(0, 0, TEX_W, TEX_H)
  band.addColorStop(0.34, "rgba(0,0,0,0)")
  band.addColorStop(0.52, "rgba(0,0,0,0.22)")
  band.addColorStop(0.7, "rgba(0,0,0,0)")
  ctx.fillStyle = band
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  paintWordmark(ctx, WM_X, WM_Y, WM_SIZE, "#0e0e0e", "#0e0e0e", false)
  paintCredits(ctx, credits, "rough")
  paintSlots(ctx, digits, "rough")

  ctx.font = `500 36px ${MONO}`
  ctx.textAlign = "right"
  ctx.fillStyle = "#4f4f4f"
  ctx.fillText("loldata.cc", TEX_W - M, TEX_H - M - 14)
  ctx.textAlign = "left"
}

/** Bump map — softly raised wordmark + slot rims (milled relief). */
function drawFrontBump(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#808080"
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  ctx.save()
  ctx.filter = "blur(5px)"
  paintWordmark(ctx, WM_X, WM_Y, WM_SIZE, "#b6b6b6", "#b6b6b6", false)
  ctx.strokeStyle = "#a2a2a2"
  ctx.lineWidth = 6
  for (let i = 0; i < 4; i++) {
    rr(ctx, M + i * (SLOT + SLOT_GAP), SLOT_Y, SLOT, SLOT, SLOT_R)
    ctx.stroke()
  }
  ctx.restore()
}

/** Emissive map — what glows in the dark: credits, jade period, slot
 *  rims, brackets. Keeps the card readable on the env-dark side of the
 *  spin and gives the cyber feel. */
function drawFrontEmissive(
  ctx: CanvasRenderingContext2D,
  credits: string,
  digits: string
) {
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  ctx.save()
  rr(ctx, 0, 0, TEX_W, TEX_H, R_PX)
  ctx.clip()

  paintFrame(ctx, 0.09, 0.3, "tl-br")
  paintCredits(ctx, credits, "emissive")
  paintSlots(ctx, digits, "emissive")

  // just the jade period of the wordmark
  ctx.save()
  ctx.shadowColor = JADE
  ctx.shadowBlur = 34
  paintWordmark(ctx, WM_X, WM_Y, WM_SIZE, null, JADE, false)
  ctx.restore()

  ctx.restore()
}

function drawBack(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, TEX_W, TEX_H)
  ctx.save()
  rr(ctx, 0, 0, TEX_W, TEX_H, R_PX)
  ctx.clip()

  paintBase(ctx, 7707)
  paintFrame(ctx, 0.14, 0.42, "tr-bl")

  // jade data band — the virtual card's "magstripe"
  const bandY = 200
  const bandH = 132
  const bg = ctx.createLinearGradient(0, bandY, TEX_W, bandY)
  bg.addColorStop(0, "rgba(0,217,146,0.1)")
  bg.addColorStop(0.5, "rgba(0,217,146,0.24)")
  bg.addColorStop(1, "rgba(0,217,146,0.1)")
  ctx.fillStyle = bg
  ctx.fillRect(0, bandY, TEX_W, bandH)
  ctx.fillStyle = "rgba(0,217,146,0.45)"
  ctx.fillRect(0, bandY, TEX_W, 2)
  ctx.fillRect(0, bandY + bandH - 2, TEX_W, 2)

  // hexdump scrolling through the band
  const rnd = mulberry32(2093)
  const hex = Array.from({ length: 56 }, () =>
    Math.floor(rnd() * 256)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase()
  ).join(" ")
  ctx.font = `500 34px ${MONO}`
  ctx.textBaseline = "middle"
  ctx.fillStyle = "rgba(0,217,146,0.55)"
  ctx.fillText(hex, M, bandY + bandH / 2 + 2)
  ctx.textBaseline = "alphabetic"

  // centred wordmark
  ctx.font = `800 150px ${MONO}`
  const w = ctx.measureText("loldata").width
  const silver = ctx.createLinearGradient(0, 640, 0, 790)
  silver.addColorStop(0, "#e9ebeb")
  silver.addColorStop(0.55, "#a3a9ab")
  silver.addColorStop(1, "#d5d8d8")
  paintWordmark(ctx, (TEX_W - w) / 2, 772, 150, silver, JADE, true)

  ctx.font = `500 30px ${MONO}`
  ctx.fillStyle = "rgba(215,216,217,0.4)"
  drawSpaced(ctx, "NO PHYSICAL FORM", TEX_W / 2, 856, 16, "center")

  ctx.font = `500 34px ${MONO}`
  ctx.fillStyle = "rgba(0,217,146,0.55)"
  drawSpaced(ctx, "loldata.cc", TEX_W / 2, TEX_H - 116, 6, "center")

  ctx.restore()
}

function drawBackEmissive(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, TEX_W, TEX_H)
  ctx.save()
  rr(ctx, 0, 0, TEX_W, TEX_H, R_PX)
  ctx.clip()

  paintFrame(ctx, 0.08, 0.26, "tr-bl")

  const bandY = 200
  const bandH = 132
  ctx.fillStyle = "rgba(0,217,146,0.1)"
  ctx.fillRect(0, bandY, TEX_W, bandH)
  ctx.fillStyle = "rgba(0,217,146,0.3)"
  ctx.fillRect(0, bandY, TEX_W, 2)
  ctx.fillRect(0, bandY + bandH - 2, TEX_W, 2)

  const rnd = mulberry32(2093)
  const hex = Array.from({ length: 56 }, () =>
    Math.floor(rnd() * 256)
      .toString(16)
      .padStart(2, "0")
      .toUpperCase()
  ).join(" ")
  ctx.font = `500 34px ${MONO}`
  ctx.textBaseline = "middle"
  ctx.fillStyle = "rgba(0,217,146,0.3)"
  ctx.fillText(hex, M, bandY + bandH / 2 + 2)
  ctx.textBaseline = "alphabetic"

  // jade period of the centred wordmark
  ctx.font = `800 150px ${MONO}`
  const w = ctx.measureText("loldata").width
  ctx.save()
  ctx.shadowColor = JADE
  ctx.shadowBlur = 30
  paintWordmark(ctx, (TEX_W - w) / 2, 772, 150, null, JADE, false)
  ctx.restore()

  ctx.restore()
}

// ─── Texture factory + hook ──────────────────────────────────────────

function makeTexture(
  draw: (ctx: CanvasRenderingContext2D) => void,
  srgb: boolean
) {
  const c = document.createElement("canvas")
  c.width = TEX_W
  c.height = TEX_H
  const ctx = c.getContext("2d")
  if (ctx) draw(ctx)
  const t = new THREE.CanvasTexture(c)
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

/** Paints all six maps. Repaints once when the document fonts finish
 *  loading so JetBrains Mono replaces the fallback monospace. */
function useCardTextures(credits: string, digits: string) {
  const [fontTick, setFontTick] = React.useState(0)
  React.useEffect(() => {
    let alive = true
    const fonts = document.fonts
    if (!fonts) return
    fonts.ready.then(() => {
      if (alive) setFontTick((t) => t + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  const textures = React.useMemo(() => {
    const d4 = (digits || "4214").slice(0, 4).padEnd(4, "0")
    return {
      front: makeTexture((ctx) => drawFront(ctx, credits, d4), true),
      frontRough: makeTexture((ctx) => drawFrontRough(ctx, credits, d4), false),
      frontBump: makeTexture((ctx) => drawFrontBump(ctx), false),
      frontEmissive: makeTexture(
        (ctx) => drawFrontEmissive(ctx, credits, d4),
        true
      ),
      back: makeTexture((ctx) => drawBack(ctx), true),
      backEmissive: makeTexture((ctx) => drawBackEmissive(ctx), true),
    }
    // fontTick intentionally triggers a full repaint
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credits, digits, fontTick])

  // dispose superseded textures
  React.useEffect(() => {
    const list = Object.values(textures)
    return () => list.forEach((t) => t.dispose())
  }, [textures])

  return textures
}

// ─── Card scene ──────────────────────────────────────────────────────

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/** Shared mutable drag state — written by the wrapper div's pointer
 *  handlers (outside the Canvas), consumed per-frame by CardScene. */
interface DragState {
  active: boolean
  /** accumulated pointer deltas since last frame (px) */
  dx: number
  dy: number
  /** current Y angular velocity (rad/s) — inertia carrier */
  vy: number
  lastX: number
  lastY: number
}

const ROT_PER_PX = 0.008 // horizontal drag sensitivity (rad/px)
const TILT_PER_PX = 0.005 // vertical drag sensitivity (rad/px)
const MAX_TILT = 0.55 // clamp for the vertical grab-tilt (rad)
const MAX_FLING = 7 // rad/s cap on release inertia

function CardScene({
  credits,
  digits,
  drag,
  spinSpeed,
  bobAmplitude,
  bobSpeed,
  baseTiltX,
  baseTiltZ,
}: {
  credits: string
  digits: string
  drag: React.MutableRefObject<DragState>
  spinSpeed: number
  bobAmplitude: number
  bobSpeed: number
  baseTiltX: number
  baseTiltZ: number
}) {
  const spinRef = React.useRef<THREE.Group>(null)
  const tex = useCardTextures(credits, digits)

  // Metal body — bevelled extrusion. Caps hide behind the overlay
  // planes; the bevel + side wall are the visible milled edge.
  const bodyGeom = React.useMemo(() => {
    const g = new THREE.ExtrudeGeometry(
      roundedRectShape(CARD_W, CARD_H, CARD_R),
      {
        depth: CARD_D,
        bevelEnabled: true,
        bevelThickness: BEVEL,
        bevelSize: BEVEL,
        bevelSegments: 4,
        curveSegments: 24,
      }
    )
    g.center()
    return g
  }, [])

  const bodyMats = React.useMemo(
    () => [
      // caps — dark matte gunmetal
      new THREE.MeshStandardMaterial({
        color: "#152225",
        metalness: 1,
        roughness: 0.42,
        envMapIntensity: 1.3,
      }),
      // side wall + bevel — brighter, low roughness → edge glint
      new THREE.MeshStandardMaterial({
        color: "#22343a",
        metalness: 1,
        roughness: 0.24,
        envMapIntensity: 1.8,
      }),
    ],
    []
  )

  useFrame((state, delta) => {
    const spin = spinRef.current
    if (!spin) return
    const d = drag.current

    if (d.active) {
      // Direct control — consume the accumulated pointer deltas and
      // remember the instantaneous velocity for the release fling.
      const dYaw = d.dx * ROT_PER_PX
      spin.rotation.y += dYaw
      spin.rotation.x = THREE.MathUtils.clamp(
        spin.rotation.x + d.dy * TILT_PER_PX,
        -MAX_TILT,
        MAX_TILT
      )
      d.vy = THREE.MathUtils.clamp(
        dYaw / Math.max(delta, 1e-4),
        -MAX_FLING,
        MAX_FLING
      )
      d.dx = 0
      d.dy = 0
    } else {
      // Inertia decays smoothly back to the ambient auto-spin, and
      // the grab-tilt eases back to level.
      d.vy = THREE.MathUtils.damp(d.vy, spinSpeed, 2.2, delta)
      spin.rotation.y += d.vy * delta
      spin.rotation.x = THREE.MathUtils.damp(spin.rotation.x, 0, 3, delta)
    }

    const t = state.clock.getElapsedTime()
    spin.position.y = Math.sin(t * bobSpeed) * bobAmplitude
  })

  return (
    // Outer wrapper applies the static "Apple-ad" tilt; the inner
    // spinRef rotates in place around the centred geometry.
    <group rotation={[baseTiltX, 0, baseTiltZ]}>
      <group ref={spinRef}>
        <mesh geometry={bodyGeom} material={bodyMats} />

        {/* Front face */}
        <mesh position={[0, 0, FACE_Z]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshPhysicalMaterial
            map={tex.front}
            roughnessMap={tex.frontRough}
            roughness={1}
            bumpMap={tex.frontBump}
            bumpScale={0.35}
            emissiveMap={tex.frontEmissive}
            emissive="#ffffff"
            emissiveIntensity={1.1}
            metalness={0.92}
            envMapIntensity={2.0}
            clearcoat={0.5}
            clearcoatRoughness={0.35}
            transparent
          />
        </mesh>

        {/* Back face */}
        <mesh position={[0, 0, -FACE_Z]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_W, CARD_H]} />
          <meshPhysicalMaterial
            map={tex.back}
            roughness={0.34}
            emissiveMap={tex.backEmissive}
            emissive="#ffffff"
            emissiveIntensity={0.9}
            metalness={0.9}
            envMapIntensity={1.8}
            clearcoat={0.4}
            clearcoatRoughness={0.35}
            transparent
          />
        </mesh>
      </group>
    </group>
  )
}

// ─── Public component ────────────────────────────────────────────────

export interface LoldataCard3DProps {
  className?: string
  /** Height of the canvas in px (or any CSS length). Default 380px. */
  height?: number | string
  /** Remaining credits shown top-right on the card face. Default 150.
   *  `null` (still loading) renders an em-dash. */
  credits?: number | string | null
  /** The 4 card digits shown in the bottom-left slots. Default "4214". */
  digits?: string
  /** Rotation speed in rad/s. Default 0.38 (~16s per full turn). */
  spinSpeed?: number
  /** Vertical bob amplitude in scene units. Default 0.06. */
  bobAmplitude?: number
  /** Vertical bob frequency. Default 0.85 Hz. */
  bobSpeed?: number
  /** Static tilt on X (forward/back). Default -0.2 rad ≈ -11°. */
  baseTiltX?: number
  /** Static tilt on Z (roll). Default -0.05 rad ≈ -3°. */
  baseTiltZ?: number
  /** Bounds margin — bigger = more padding around the card. */
  margin?: number
}

export function LoldataCard3D({
  className,
  height = 380,
  credits = 150,
  digits = "4214",
  spinSpeed = 0.38,
  bobAmplitude = 0.06,
  bobSpeed = 0.85,
  baseTiltX = -0.2,
  baseTiltZ = -0.05,
  margin = 1.12,
}: LoldataCard3DProps) {
  const drag = React.useRef<DragState>({
    active: false,
    dx: 0,
    dy: 0,
    vy: spinSpeed,
    lastX: 0,
    lastY: 0,
  })
  const [grabbing, setGrabbing] = React.useState(false)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const d = drag.current
    d.active = true
    d.lastX = e.clientX
    d.lastY = e.clientY
    d.dx = 0
    d.dy = 0
    setGrabbing(true)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d.active) return
    d.dx += e.clientX - d.lastX
    d.dy += e.clientY - d.lastY
    d.lastX = e.clientX
    d.lastY = e.clientY
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
    drag.current.active = false
    setGrabbing(false)
  }

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height,
        position: "relative",
        cursor: grabbing ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 32 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {/* Base ambient — low so PBR reflections dominate. */}
        <ambientLight intensity={0.28} />

        {/* Key light — upper-right, neutral, anisotropic highlight. */}
        <directionalLight
          position={[4, 5, 4]}
          intensity={1.4}
          color="#ffffff"
        />

        {/* Fill — lower-left, jade-tinted, brand colour bleed. */}
        <directionalLight
          position={[-4, -2, 2]}
          intensity={0.45}
          color="#00d992"
        />

        {/* Rim — back-right, citrine, warm edge against dark bg. */}
        <directionalLight
          position={[3, 2, -3]}
          intensity={0.32}
          color="#ffb615"
        />

        <React.Suspense fallback={null}>
          {/* Bounds auto-fits the camera once at mount; observe is
              off by default so the camera stays still while the card
              spins inside. */}
          <Bounds fit clip margin={margin}>
            <CardScene
              credits={credits == null ? "—" : String(credits)}
              digits={digits}
              drag={drag}
              spinSpeed={spinSpeed}
              bobAmplitude={bobAmplitude}
              bobSpeed={bobSpeed}
              baseTiltX={baseTiltX}
              baseTiltZ={baseTiltZ}
            />
          </Bounds>
          <Environment preset="city" />
        </React.Suspense>
      </Canvas>
    </div>
  )
}
