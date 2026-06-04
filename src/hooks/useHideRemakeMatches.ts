import { useEffect, useState } from "react";
import { getHideRemakeMatches, setHideRemakeMatches } from "@/lib/uiPrefs";

export function useHideRemakeMatches() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getHideRemakeMatches());

    const onChange = () => setEnabled(getHideRemakeMatches());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setHideRemakeMatches(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
