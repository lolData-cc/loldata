import { useEffect, useState } from "react";
import { getLegacyRankIcons, setLegacyRankIcons } from "@/lib/uiPrefs";

export function useLegacyRankIcons() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getLegacyRankIcons());

    const onChange = () => setEnabled(getLegacyRankIcons());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setLegacyRankIcons(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
