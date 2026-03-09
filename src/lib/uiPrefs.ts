export const UI_PREFS_KEYS = {
  disableBorderBeams: "lolData:disableBorderBeams",
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
