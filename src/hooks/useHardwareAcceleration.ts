import { useEffect, useState } from "react";
import { detectHardwareAcceleration } from "@/utils/detectHardwareAcceleration";

type Status = "checking" | "enabled" | "disabled" | "unknown";

export function useHardwareAcceleration() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    let cancelled = false;
    detectHardwareAcceleration().then((result) => {
      if (cancelled) return;
      if (result === true) setStatus("enabled");
      else if (result === false) setStatus("disabled");
      else setStatus("unknown");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
