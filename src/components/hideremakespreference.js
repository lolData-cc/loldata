import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useHideRemakeMatches } from "@/hooks/useHideRemakeMatches";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function HideRemakesPreference() {
    const { enabled, setEnabled } = useHideRemakeMatches();
    return (_jsx(SettingsCard, { title: "Hide Remake Matches", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Completely hide remade games from the match list." }) }), _jsx(CyberToggle, { checked: enabled, onChange: (v) => setEnabled(v) })] }) }));
}
