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
    legacyRankIcons: "lolData:legacyRankIcons",
    ambientLight: "lolData:ambientLight",
};
function safeWindow() {
    return typeof window !== "undefined" ? window : null;
}
export function getDisableBorderBeams() {
    const w = safeWindow();
    if (!w)
        return false; // default: beams attivi
    return w.localStorage.getItem(UI_PREFS_KEYS.disableBorderBeams) === "1";
}
export function setDisableBorderBeams(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.disableBorderBeams, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getDisableTechBackground() {
    const w = safeWindow();
    if (!w)
        return true; // default: tech bg disabled for new users
    const val = w.localStorage.getItem(UI_PREFS_KEYS.disableTechBackground);
    if (val === null)
        return true; // first visit: disabled by default
    return val === "1";
}
export function setDisableTechBackground(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.disableTechBackground, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getDisableMatchTransition() {
    const w = safeWindow();
    if (!w)
        return false;
    return w.localStorage.getItem(UI_PREFS_KEYS.disableMatchTransition) === "1";
}
export function setDisableMatchTransition(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.disableMatchTransition, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getDisableMatchGrouping() {
    const w = safeWindow();
    if (!w)
        return false; // default: grouping enabled
    return w.localStorage.getItem(UI_PREFS_KEYS.disableMatchGrouping) === "1";
}
export function setDisableMatchGrouping(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.disableMatchGrouping, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getEnableColoredMatchBg() {
    const w = safeWindow();
    if (!w)
        return true; // default: on
    const val = w.localStorage.getItem(UI_PREFS_KEYS.enableColoredMatchBg);
    if (val === null)
        return true; // first visit: enabled by default
    return val === "1";
}
export function setEnableColoredMatchBg(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.enableColoredMatchBg, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getEnableMatchCentering() {
    const w = safeWindow();
    if (!w)
        return false; // default: off
    return w.localStorage.getItem(UI_PREFS_KEYS.enableMatchCentering) === "1";
}
export function setEnableMatchCentering(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.enableMatchCentering, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getHideRemakeMatches() {
    const w = safeWindow();
    if (!w)
        return false; // default: show remakes
    return w.localStorage.getItem(UI_PREFS_KEYS.hideRemakeMatches) === "1";
}
export function setHideRemakeMatches(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.hideRemakeMatches, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
// ── Stats Bar ──
export const STATS_BAR_STAT_KEYS = ["kda", "kp", "csm", "dmg", "vis"];
const DEFAULT_VISIBLE_STATS = {
    kda: true, kp: true, csm: true, dmg: true, vis: true,
};
export function getHideStatsBar() {
    const w = safeWindow();
    if (!w)
        return false; // default: shown
    return w.localStorage.getItem(UI_PREFS_KEYS.hideStatsBar) === "1";
}
export function setHideStatsBar(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.hideStatsBar, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getStatsBarVisibleStats() {
    const w = safeWindow();
    if (!w)
        return { ...DEFAULT_VISIBLE_STATS };
    const raw = w.localStorage.getItem(UI_PREFS_KEYS.statsBarVisibleStats);
    if (!raw)
        return { ...DEFAULT_VISIBLE_STATS };
    try {
        return { ...DEFAULT_VISIBLE_STATS, ...JSON.parse(raw) };
    }
    catch {
        return { ...DEFAULT_VISIBLE_STATS };
    }
}
export function setStatsBarVisibleStats(stats) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.statsBarVisibleStats, JSON.stringify(stats));
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
// ── Context Menu Actions (right-click on match) ──
export function getUseContextMenuActions() {
    const w = safeWindow();
    if (!w)
        return false; // default: off (hover collapse mode)
    return w.localStorage.getItem(UI_PREFS_KEYS.useContextMenuActions) === "1";
}
export function setUseContextMenuActions(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.useContextMenuActions, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
// ── Click to Expand Match ──
export function getClickToExpandMatch() {
    const w = safeWindow();
    if (!w)
        return true; // default: click mode
    const val = w.localStorage.getItem(UI_PREFS_KEYS.clickToExpandMatch);
    if (val === null)
        return true; // first visit: click mode by default
    return val === "1";
}
export function setClickToExpandMatch(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.clickToExpandMatch, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getBlueWinTint() {
    const w = safeWindow();
    if (!w)
        return false; // default: green wins
    return w.localStorage.getItem(UI_PREFS_KEYS.blueWinTint) === "1";
}
export function setBlueWinTint(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.blueWinTint, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
export function getLegacyRankIcons() {
    const w = safeWindow();
    if (!w)
        return false;
    return w.localStorage.getItem(UI_PREFS_KEYS.legacyRankIcons) === "1";
}
export function setLegacyRankIcons(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.legacyRankIcons, value ? "1" : "0");
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
/** Ambient light intensity: 0 (off) to 100 (max). Default 0. */
export function getAmbientLight() {
    const w = safeWindow();
    if (!w)
        return 0;
    const val = w.localStorage.getItem(UI_PREFS_KEYS.ambientLight);
    return val ? Number(val) : 0;
}
export function setAmbientLight(value) {
    const w = safeWindow();
    if (!w)
        return;
    w.localStorage.setItem(UI_PREFS_KEYS.ambientLight, String(Math.max(0, Math.min(100, Math.round(value)))));
    w.dispatchEvent(new Event("lolData:uiPrefsChanged"));
}
