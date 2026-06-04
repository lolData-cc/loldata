// src/hooks/useEnableColoredMatchBg.ts
import { useEffect, useState } from "react";
import { getEnableColoredMatchBg, setEnableColoredMatchBg } from "@/lib/uiPrefs";

export function useEnableColoredMatchBg() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(getEnableColoredMatchBg());

    const onChange = () => setEnabled(getEnableColoredMatchBg());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setEnableColoredMatchBg(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
