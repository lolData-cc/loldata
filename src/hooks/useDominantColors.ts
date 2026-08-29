// src/hooks/useDominantColors.ts
//
// The two colours a profile picture is actually made of, so the UPDATE and
// ANALYZE buttons can wear the player's own palette instead of a fixed pair.
//
// ⚠️ THE `?cors=1` IS LOAD-BEARING. Do not remove it.
//
// cdn2.loldata.cc DOES send `Access-Control-Allow-Origin`, but Cloudflare has
// cached a copy of each icon WITHOUT that header — served to any request that
// did not ask for it. So the plain URL fails both ways: without `crossOrigin`
// the image loads and taints the canvas (SecurityError on getImageData), and
// WITH `crossOrigin` the cached header-less copy is rejected and the image
// never loads at all. Both measured live, 2026-08-29.
//
// A distinct query string is a distinct cache key, so `?cors=1` gets its own
// edge entry — populated by a CORS request, therefore carrying the header. One
// extra cached variant per icon, and it stays readable on later loads (also
// measured, twice, plus on an icon never fetched before).
import { useEffect, useState } from "react";

export type Rgb = [number, number, number];
export type Palette = { primary: Rgb | null; secondary: Rgb | null };

const cache = new Map<string, Palette>();

const EMPTY: Palette = { primary: null, secondary: null };

/** Same-origin and data URLs need no help; anything else gets the CORS variant. */
function corsUrl(url: string): string {
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    const u = new URL(url, window.location.href);
    if (u.origin === window.location.origin) return url;
    u.searchParams.set("cors", "1");
    return u.toString();
  } catch {
    return url;
  }
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) :
    max === g ? ((b - r) / d + 2) :
                ((r - g) / d + 4);
  return [(h * 60 + 360) % 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60  ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/**
 * Pulls a colour into a band where it can actually be used as an accent on a
 * near-black page.
 *
 * A profile icon's dominant colour is very often a deep shadow or a pale
 * highlight; used raw, one button would be invisible and the other would glare.
 * The HUE is what carries the identity, so that is kept exactly and only the
 * saturation and lightness are moved into a usable range.
 */
function usable(h: number, s: number, l: number): Rgb {
  return hslToRgb(h, Math.min(0.85, Math.max(0.45, s)), Math.min(0.66, Math.max(0.5, l)));
}

/** 24 buckets of 15°: fine enough to separate red from orange, coarse enough
 *  that one noisy pixel cannot invent a colour. */
const BUCKETS = 24;

function extract(img: HTMLImageElement): Palette {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return EMPTY;
  ctx.drawImage(img, 0, 0, size, size);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    // Tainted canvas — the CORS variant did not take. Silence is right: the
    // buttons keep their default accents and nothing looks broken.
    return EMPTY;
  }

  const weight = new Array(BUCKETS).fill(0);
  const hueSum = new Array(BUCKETS).fill(0);
  const satSum = new Array(BUCKETS).fill(0);
  const litSum = new Array(BUCKETS).fill(0);

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 200) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    // Near-black, near-white and greys carry no identity — every icon has them,
    // so letting them win would give every player the same two buttons.
    if (l < 0.12 || l > 0.92 || s < 0.18) continue;
    const b = Math.min(BUCKETS - 1, Math.floor(h / (360 / BUCKETS)));
    // Weighted by saturation: a vivid pixel says more about the picture than a
    // washed-out one, even when the washed-out ones are more numerous.
    const w = s;
    weight[b] += w; hueSum[b] += h * w; satSum[b] += s * w; litSum[b] += l * w;
  }

  const order = weight
    .map((w, i) => ({ i, w }))
    .filter((x) => x.w > 0)
    .sort((a, b) => b.w - a.w);
  if (!order.length) return EMPTY;

  const at = (i: number) => ({
    h: hueSum[i] / weight[i],
    s: satSum[i] / weight[i],
    l: litSum[i] / weight[i],
  });

  const first = at(order[0].i);
  const primary = usable(first.h, first.s, first.l);

  // The second colour has to be far enough away in hue to read as a different
  // one. Two buttons in neighbouring shades of the same blue look like a
  // rendering bug rather than a palette.
  const apart = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };
  const distinct = order.slice(1).find((x) => apart(at(x.i).h, first.h) >= 40);

  const second = distinct ? at(distinct.i) : null;
  const secondary = second
    ? usable(second.h, second.s, second.l)
    // Nothing far enough away: rotate the hue instead of repeating the colour,
    // so the pair still reads as a pair drawn from one picture.
    : usable(first.h + 150, first.s, first.l);

  return { primary, secondary };
}

/**
 * The palette of an image, or nulls while it loads and whenever it cannot be
 * read. Callers should fall back to their fixed accents on null rather than
 * waiting — a button that has no colour until an image decodes is worse than a
 * button that changes colour once.
 */
export function useDominantColors(url: string | null | undefined): Palette {
  const [palette, setPalette] = useState<Palette>(() => (url && cache.get(url)) || EMPTY);

  useEffect(() => {
    if (!url) return setPalette(EMPTY);
    const hit = cache.get(url);
    if (hit) return setPalette(hit);

    let alive = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const p = extract(img);
      cache.set(url, p);
      if (alive) setPalette(p);
    };
    img.onerror = () => {
      cache.set(url, EMPTY);
      if (alive) setPalette(EMPTY);
    };
    img.src = corsUrl(url);

    return () => { alive = false; };
  }, [url]);

  return palette;
}

/** "R G B", the form the accent CSS variables are written in. */
export const rgbVar = (c: Rgb | null): string | undefined =>
  c ? `${c[0]} ${c[1]} ${c[2]}` : undefined;
