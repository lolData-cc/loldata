import { useEffect, useState } from "react";
import { getHideStatsBar, setHideStatsBar, getStatsBarVisibleStats, setStatsBarVisibleStats, } from "@/lib/uiPrefs";
export function useStatsBarPrefs() {
    const [hidden, setHiddenState] = useState(false);
    const [visibleStats, setVisibleStatsState] = useState(() => getStatsBarVisibleStats());
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
    const setHidden = (v) => {
        setHideStatsBar(v);
        setHiddenState(v);
    };
    const toggleStat = (key) => {
        const next = { ...visibleStats, [key]: !visibleStats[key] };
        setStatsBarVisibleStats(next);
        setVisibleStatsState(next);
    };
    return { hidden, setHidden, visibleStats, toggleStat };
}
