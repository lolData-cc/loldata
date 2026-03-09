// src/hooks/useDisableTechBackground.ts
import { useEffect, useState } from "react";
import { getDisableTechBackground, setDisableTechBackground } from "@/lib/uiPrefs";

export function useDisableTechBackground() {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    setDisabled(getDisableTechBackground());

    const onChange = () => setDisabled(getDisableTechBackground());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setDisableTechBackground(v);
    setDisabled(v);
  };

  return { disabled, setDisabled: update };
}
