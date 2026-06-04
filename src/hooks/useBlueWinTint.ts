import { useEffect, useState } from "react";
import { getBlueWinTint, setBlueWinTint } from "@/lib/uiPrefs";

export function useBlueWinTint() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getBlueWinTint());

    const onChange = () => setEnabled(getBlueWinTint());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setBlueWinTint(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
