// src/hooks/useDisableBorderBeams.ts
import { useEffect, useState } from "react";
import { getDisableBorderBeams, setDisableBorderBeams } from "@/lib/uiPrefs";

export function useDisableBorderBeams() {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    // init da cache
    setDisabled(getDisableBorderBeams());

    const onChange = () => setDisabled(getDisableBorderBeams());

    window.addEventListener("storage", onChange); // cambi in altre tab
    window.addEventListener("lolData:uiPrefsChanged", onChange); // cambi in-app

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setDisableBorderBeams(v);
    setDisabled(v);
  };

  return { disabled, setDisabled: update };
}
