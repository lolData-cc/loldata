import { useEffect, useState } from "react";
import { getClickToExpandMatch, setClickToExpandMatch } from "@/lib/uiPrefs";

export function useClickToExpandMatch() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getClickToExpandMatch());
    const onChange = () => setEnabled(getClickToExpandMatch());
    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setClickToExpandMatch(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
