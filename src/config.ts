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

/** Perk/rune images — not in dragontail, served from Riot's CDN */
export const PERK_CDN = "https://ddragon.leagueoflegends.com/cdn/img/perk-images";

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

export const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : "https://api.loldata.cc";
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
