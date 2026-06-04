import { useEffect, useState } from "react";
import { getAmbientLight, setAmbientLight } from "@/lib/uiPrefs";

export function useAmbientLight() {
  const [intensity, setIntensity] = useState(0);

  useEffect(() => {
    setIntensity(getAmbientLight());

    const onChange = () => setIntensity(getAmbientLight());

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);

    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const update = (v: number) => {
    setAmbientLight(v);
    setIntensity(v);
  };

  return { intensity, setIntensity: update };
}
