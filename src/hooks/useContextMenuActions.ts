import { useEffect, useState } from "react";
import { getUseContextMenuActions, setUseContextMenuActions } from "@/lib/uiPrefs";

export function useContextMenuActions() {
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    setEnabledState(getUseContextMenuActions());

    const onChange = () => setEnabledState(getUseContextMenuActions());
    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const setEnabled = (v: boolean) => {
    setUseContextMenuActions(v);
    setEnabledState(v);
  };

  return { enabled, setEnabled };
}
