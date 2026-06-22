const CDN_ORIGIN = "https://cdn2.loldata.cc";
const FALLBACK_VERSION = "16.1.1";

let _cdnVersion = FALLBACK_VERSION;

/**
 * Fetches the current CDN version from R2 once at startup.
 * main.tsx awaits this before mounting React, so by the time any
 * component renders, cdnBaseUrl() returns the correct version.
 */
export const cdnVersionReady: Promise<string> = fetch(
  `${CDN_ORIGIN}/_current_version.txt`,
  { signal: AbortSignal.timeout(5_000) },
)
  .then((r) => (r.ok ? r.text() : FALLBACK_VERSION))
  .then((v) => {
    _cdnVersion = v.trim() || FALLBACK_VERSION;
    return _cdnVersion;
  })
  .catch(() => FALLBACK_VERSION);

export function getCdnVersion() {
  return _cdnVersion;
}

/** Dynamic CDN base URL — always returns the resolved version */
export function cdnBaseUrl() {
  return `${CDN_ORIGIN}/${_cdnVersion}`;
}

/** Splash arts live at /img/champion/splash/ without a version prefix */
export function cdnSplashUrl(champName: string, skinNum = 0) {
  return `${CDN_ORIGIN}/img/champion/splash/${champName}_${skinNum}.jpg`;
}

/** Aegis of Valor — Riot's cosmetic that grants double LP for a game.
 *  Custom asset hosted on our R2, version-less just like other UI
 *  badges (eg /img/class/…). Used as a watermark backdrop on match
 *  cards for games that earned the double-LP bonus. */
export function doubleLpBadgeUrl() {
  return `${CDN_ORIGIN}/img/badge/double-lp.svg`;
}

/** Perk/rune images — served from OUR CDN, which mirrors dragontail's
 *  perk-images at an UNVERSIONED path (cdn2.loldata.cc/img/perk-images/Styles/…).
 *  Self-reliant: no dependency on ddragon, and it carries every rune we've synced. */
export const PERK_CDN = `${CDN_ORIGIN}/img/perk-images`;

/** Summoner spell images by ID — custom path on our CDN, fallback to ddragon */
export function summonerSpellUrl(spellId: number | string | undefined) {
  return `https://ddragon.leagueoflegends.com/cdn/${_cdnVersion}/img/spell/${SUMMONER_SPELL_MAP[Number(spellId)] ?? "SummonerFlash"}.png`;
}

const SUMMONER_SPELL_MAP: Record<number, string> = {
  1: "SummonerBoost",       // Cleanse
  3: "SummonerExhaust",     // Exhaust
  4: "SummonerFlash",       // Flash
  6: "SummonerHaste",       // Ghost
  7: "SummonerHeal",        // Heal
  11: "SummonerSmite",      // Smite
  12: "SummonerTeleport",   // Teleport
  13: "SummonerMana",       // Clarity
  14: "SummonerDot",        // Ignite
  21: "SummonerBarrier",    // Barrier
  30: "SummonerPoroRecall", // To the King!
  31: "SummonerPoroThrow",  // Poro Toss
  32: "SummonerSnowball",   // Mark (ARAM)
  39: "SummonerSnowURFSnowball_Mark", // Mark (URF)
  54: "Summoner_UltBookPlaceholder",  // Placeholder
  55: "Summoner_UltBookSmitePlaceholder", // Placeholder
  2202: "SummonerFlash",    // Flash (alt)
};

// Static exports kept for backward compat — frozen at fallback version.
// Prefer cdnBaseUrl() for dynamic version.
export const CDN_BASE_URL = `${CDN_ORIGIN}/${FALLBACK_VERSION}`;

// In development we leave the base URL empty so fetches hit the same
// origin as the page (`/api/...`), and Vite's proxy forwards them to
// the local backend on :3001. The win: the phone can hit
// http://<PC-LAN-IP>:5173 and everything Just Works — no separate
// backend exposure on the LAN, no CORS noise. In production the
// frontend talks to the real api.loldata.cc.
export const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? ""
    : "https://api.loldata.cc";

// Explorer runs heavy aggregate reads. In production they're routed at the
// dedicated match-data box (Hetzner Postgres, exposed via Cloudflare Tunnel at
// api2.loldata.cc) instead of the main api.loldata.cc, so the big queries hit the
// box's horsepower. Override with VITE_EXPLORER_API_URL at build time to repoint.
// In dev it's empty → Vite proxies /api/explorer/* to the local backend, which is
// tunnelled to the box.
export const EXPLORER_API_BASE_URL =
  import.meta.env.MODE === "development"
    ? ""
    : (import.meta.env.VITE_EXPLORER_API_URL || "https://api2.loldata.cc");

// The match-data box, ALWAYS (dev + prod). Unlike EXPLORER_API_BASE_URL (which is
// "" in dev → Vite proxy → local backend → Supabase), DB-stats must reflect the
// BOX, where the ingest actually grows the match data — so we hit api2 directly
// even in dev. Override with VITE_EXPLORER_API_URL if the box moves.
export const BOX_API_BASE_URL =
  import.meta.env.VITE_EXPLORER_API_URL || "https://api2.loldata.cc";
export const champPath = `${CDN_ORIGIN}/${FALLBACK_VERSION}/img/champion`;
export const itemPath = `${CDN_ORIGIN}/${FALLBACK_VERSION}/img/item`;
export const SITE_URL =
  import.meta.env.VITE_SITE_URL || window.location.origin;

/** Fix champion name → icon CDN name (cdn2: uses "Fiddlesticks") */
const ICON_NAME_FIXES: Record<string, string> = {
  FiddleSticks: "Fiddlesticks",
};
/** Fix champion name → splash CDN name (cdn: uses "FiddleSticks") */
const SPLASH_NAME_FIXES: Record<string, string> = {
  Fiddlesticks: "FiddleSticks",
};
/** Fix internal champion ID → display name */
const DISPLAY_NAME_FIXES: Record<string, string> = {
  MonkeyKing: "Wukong",
  FiddleSticks: "Fiddlesticks",
};
export function normalizeChampName(name: string): string {
  return ICON_NAME_FIXES[name] ?? name;
}
export function normalizeChampSplash(name: string): string {
  return SPLASH_NAME_FIXES[name] ?? name;
}
export function champDisplayName(name: string): string {
  return DISPLAY_NAME_FIXES[name] ?? name;
}
