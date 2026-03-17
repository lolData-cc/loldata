export const UI_PREFS_KEYS = {
  disableBorderBeams: "lolData:disableBorderBeams",
  disableTechBackground: "lolData:disableTechBackground",
  disableMatchTransition: "lolData:disableMatchTransition",
  disableMatchGrouping: "lolData:disableMatchGrouping",
  enableColoredMatchBg: "lolData:enableColoredMatchBg",
  enableMatchCentering: "lolData:enableMatchCentering",
  hideRemakeMatches: "lolData:hideRemakeMatches",
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
