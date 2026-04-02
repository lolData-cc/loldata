export const UI_PREFS_KEYS = {
  disableBorderBeams: "lolData:disableBorderBeams",
  disableTechBackground: "lolData:disableTechBackground",
  disableMatchTransition: "lolData:disableMatchTransition",
  disableMatchGrouping: "lolData:disableMatchGrouping",
  enableColoredMatchBg: "lolData:enableColoredMatchBg",
  enableMatchCentering: "lolData:enableMatchCentering",
  hideRemakeMatches: "lolData:hideRemakeMatches",
  hideStatsBar: "lolData:hideStatsBar",
  statsBarVisibleStats: "lolData:statsBarVisibleStats",
  useContextMenuActions: "lolData:useContextMenuActions",
  clickToExpandMatch: "lolData:clickToExpandMatch",
  blueWinTint: "lolData:blueWinTint",
} as const;

function safeWindow() {
  return typeof window !== "undefined" ? window : null;
}

export function getDisableBorderBeams(): boolean {
  const w = safeWindow();
  if (!w) return false; // default: beams attivi
  return w.localStorage.getItem(UI_PREFS_KEYS.disableBorderBeams) === "1";
}

export function setDisableBorderBeams(value: boolean) {
  const w = safeWindow();
  if (!w) return;

  w.localStorage.setItem(UI_PREFS_KEYS.disableBorderBeams, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getDisableTechBackground(): boolean {
  const w = safeWindow();
  if (!w) return true; // default: tech bg disabled for new users
  const val = w.localStorage.getItem(UI_PREFS_KEYS.disableTechBackground);
  if (val === null) return true; // first visit: disabled by default
  return val === "1";
}

export function setDisableTechBackground(value: boolean) {
  const w = safeWindow();
  if (!w) return;

  w.localStorage.setItem(UI_PREFS_KEYS.disableTechBackground, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getDisableMatchTransition(): boolean {
  const w = safeWindow();
  if (!w) return false;
  return w.localStorage.getItem(UI_PREFS_KEYS.disableMatchTransition) === "1";
}

export function setDisableMatchTransition(value: boolean) {
  const w = safeWindow();
  if (!w) return;

  w.localStorage.setItem(UI_PREFS_KEYS.disableMatchTransition, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getDisableMatchGrouping(): boolean {
  const w = safeWindow();
  if (!w) return false; // default: grouping enabled
  return w.localStorage.getItem(UI_PREFS_KEYS.disableMatchGrouping) === "1";
}

export function setDisableMatchGrouping(value: boolean) {
  const w = safeWindow();
  if (!w) return;

  w.localStorage.setItem(UI_PREFS_KEYS.disableMatchGrouping, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getEnableColoredMatchBg(): boolean {
  const w = safeWindow();
  if (!w) return true; // default: on
  const val = w.localStorage.getItem(UI_PREFS_KEYS.enableColoredMatchBg);
  if (val === null) return true; // first visit: enabled by default
  return val === "1";
}

export function setEnableColoredMatchBg(value: boolean) {
  const w = safeWindow();
  if (!w) return;

  w.localStorage.setItem(UI_PREFS_KEYS.enableColoredMatchBg, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getEnableMatchCentering(): boolean {
  const w = safeWindow();
  if (!w) return false; // default: off
  return w.localStorage.getItem(UI_PREFS_KEYS.enableMatchCentering) === "1";
}

export function setEnableMatchCentering(value: boolean) {
  const w = safeWindow();
  if (!w) return;

  w.localStorage.setItem(UI_PREFS_KEYS.enableMatchCentering, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getHideRemakeMatches(): boolean {
  const w = safeWindow();
  if (!w) return false; // default: show remakes
  return w.localStorage.getItem(UI_PREFS_KEYS.hideRemakeMatches) === "1";
}

export function setHideRemakeMatches(value: boolean) {
  const w = safeWindow();
  if (!w) return;

  w.localStorage.setItem(UI_PREFS_KEYS.hideRemakeMatches, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

// ── Stats Bar ──

export const STATS_BAR_STAT_KEYS = ["kda", "kp", "csm", "dmg", "vis"] as const;
export type StatsBarStatKey = (typeof STATS_BAR_STAT_KEYS)[number];

const DEFAULT_VISIBLE_STATS: Record<StatsBarStatKey, boolean> = {
  kda: true, kp: true, csm: true, dmg: true, vis: true,
};

export function getHideStatsBar(): boolean {
  const w = safeWindow();
  if (!w) return false; // default: shown
  return w.localStorage.getItem(UI_PREFS_KEYS.hideStatsBar) === "1";
}

export function setHideStatsBar(value: boolean) {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(UI_PREFS_KEYS.hideStatsBar, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getStatsBarVisibleStats(): Record<StatsBarStatKey, boolean> {
  const w = safeWindow();
  if (!w) return { ...DEFAULT_VISIBLE_STATS };
  const raw = w.localStorage.getItem(UI_PREFS_KEYS.statsBarVisibleStats);
  if (!raw) return { ...DEFAULT_VISIBLE_STATS };
  try {
    return { ...DEFAULT_VISIBLE_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_VISIBLE_STATS };
  }
}

export function setStatsBarVisibleStats(stats: Record<StatsBarStatKey, boolean>) {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(UI_PREFS_KEYS.statsBarVisibleStats, JSON.stringify(stats));
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

// ── Context Menu Actions (right-click on match) ──

export function getUseContextMenuActions(): boolean {
  const w = safeWindow();
  if (!w) return false; // default: off (hover collapse mode)
  return w.localStorage.getItem(UI_PREFS_KEYS.useContextMenuActions) === "1";
}

export function setUseContextMenuActions(value: boolean) {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(UI_PREFS_KEYS.useContextMenuActions, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

// ── Click to Expand Match ──

export function getClickToExpandMatch(): boolean {
  const w = safeWindow();
  if (!w) return true; // default: click mode
  const val = w.localStorage.getItem(UI_PREFS_KEYS.clickToExpandMatch);
  if (val === null) return true; // first visit: click mode by default
  return val === "1";
}

export function setClickToExpandMatch(value: boolean) {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(UI_PREFS_KEYS.clickToExpandMatch, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}

export function getBlueWinTint(): boolean {
  const w = safeWindow();
  if (!w) return false; // default: green wins
  return w.localStorage.getItem(UI_PREFS_KEYS.blueWinTint) === "1";
}

export function setBlueWinTint(value: boolean) {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.setItem(UI_PREFS_KEYS.blueWinTint, value ? "1" : "0");
  w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
