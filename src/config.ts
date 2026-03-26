export const CDN_BASE_URL = "https://cdn2.loldata.cc/16.1.1";
export const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : "https://api.loldata.cc";
export const champPath = `${CDN_BASE_URL}/img/champion`;
export const itemPath = `${CDN_BASE_URL}/img/item`;
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