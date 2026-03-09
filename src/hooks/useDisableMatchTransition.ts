import { useEffect, useState } from "react";
import { getDisableMatchTransition, setDisableMatchTransition } from "@/lib/uiPrefs";

export function useDisableMatchTransition() {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    setDisabled(getDisableMatchTransition());

    const onChange = () => setDisabled(getDisableMatchTransition());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: boolean) => {
    setDisableMatchTransition(v);
    setDisabled(v);
  };

  return { disabled, setDisabled: update };
}
