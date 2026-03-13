import { useEffect, useState } from "react";
import { getEnableMatchCentering, setEnableMatchCentering } from "@/lib/uiPrefs";

export function useEnableMatchCentering() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getEnableMatchCentering());

    const onChange = () => setEnabled(getEnableMatchCentering());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setEnableMatchCentering(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
