import { useEffect, useState } from "react";
import { getTheme, setTheme as persistTheme, type ThemeMode } from "@/lib/uiPrefs";

/**
 * Reactive colour-theme hook, mirroring the app's other UI-preference hooks:
 * reads from localStorage on mount, listens for the cross-component
 * `lolData:uiPrefsChanged` event (and the native cross-tab `storage` event),
 * and exposes a setter that persists + flips the <html> class.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    setThemeState(getTheme());
    const onChange = () => setThemeState(getTheme());
    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const setTheme = (v: ThemeMode) => {
    persistTheme(v);
    setThemeState(v);
  };

  return { theme, setTheme, isLight: theme === "light" };
}
