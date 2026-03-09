export const UI_PREFS_KEYS = {
  disableBorderBeams: "lolData:disableBorderBeams",
  disableTechBackground: "lolData:disableTechBackground",
  disableMatchTransition: "lolData:disableMatchTransition",
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
