import { useEffect, useState } from "react";
import {
  getHideStatsBar,
  setHideStatsBar,
  getStatsBarVisibleStats,
  setStatsBarVisibleStats,
  type StatsBarStatKey,
} from "@/lib/uiPrefs";

export function useStatsBarPrefs() {
  // Lazy init from storage so the first paint already reflects the saved /
  // default value (stats bar is HIDDEN by default) — no shown→hidden flash.
  const [hidden, setHiddenState] = useState(() => getHideStatsBar());
  const [visibleStats, setVisibleStatsState] = useState<Record<StatsBarStatKey, boolean>>(
    () => getStatsBarVisibleStats()
  );

  useEffect(() => {
    setHiddenState(getHideStatsBar());
    setVisibleStatsState(getStatsBarVisibleStats());

    const onChange = () => {
      setHiddenState(getHideStatsBar());
      setVisibleStatsState(getStatsBarVisibleStats());
    };

    window.addEventListener("storage", onChange);
    window.addEventListener("lolData:uiPrefsChanged", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("lolData:uiPrefsChanged", onChange);
    };
  }, []);

  const setHidden = (v: boolean) => {
    setHideStatsBar(v);
    setHiddenState(v);
  };

  const toggleStat = (key: StatsBarStatKey) => {
    const next = { ...visibleStats, [key]: !visibleStats[key] };
    setStatsBarVisibleStats(next);
    setVisibleStatsState(next);
  };

  return { hidden, setHidden, visibleStats, toggleStat };
}
