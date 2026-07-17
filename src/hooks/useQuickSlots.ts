import { useEffect, useState } from "react";
import { getQuickSlotsEnabled, setQuickSlotsEnabled } from "@/lib/uiPrefs";

export function useQuickSlots() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getQuickSlotsEnabled());
    const onChange = () => setEnabled(getQuickSlotsEnabled());
    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setQuickSlotsEnabled(v);
    setEnabled(v);
  };

  return { enabled, setEnabled: update };
}
