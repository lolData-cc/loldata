// src/hooks/useDisableMatchGrouping.ts
import { useEffect, useState } from "react";
import { getDisableMatchGrouping, setDisableMatchGrouping } from "@/lib/uiPrefs";

export function useDisableMatchGrouping() {
  const [disabled, setDisabled] = useState(false);

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
