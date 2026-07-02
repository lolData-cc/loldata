// src/hooks/useDisableMatchGrouping.ts
import { useEffect, useState } from "react";
import { getDisableMatchGrouping, setDisableMatchGrouping } from "@/lib/uiPrefs";

export function useDisableMatchGrouping() {
  // Lazy init from storage so the very first paint already reflects the
  // saved / default value (grouping is OFF by default) — no enabled→disabled flash.
  const [disabled, setDisabled] = useState(() => getDisableMatchGrouping());

  useEffect(() => {
    setDisabled(getDisableMatchGrouping());

    const onChange = () => setDisabled(getDisableMatchGrouping());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setDisableMatchGrouping(v);
    setDisabled(v);
  };

  return { disabled, setDisabled: update };
}
