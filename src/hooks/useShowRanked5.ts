import { useEffect, useState } from "react";
import { getShowRanked5, setShowRanked5 } from "@/lib/uiPrefs";

/**
 * Whether the Ranked 5s card is shown on a profile.
 *
 * Off by default. It is a weekend-only queue on its own ladder, so for most
 * players it is a permanently "Unranked" third card sitting beside the two that
 * matter — which is why it stopped being shown and became something you ask for.
 */
export function useShowRanked5() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getShowRanked5());

    const onChange = () => setEnabled(getShowRanked5());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setShowRanked5(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
