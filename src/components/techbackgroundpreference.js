import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDisableTechBackground } from "@/hooks/useDisableTechBackground";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function TechBackgroundPreference() {
    const { disabled, setDisabled } = useDisableTechBackground();
    return (_jsx(SettingsCard, { title: "Tech Background", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Animated tech background on the summoner page." }) }), _jsx(CyberToggle, { checked: !disabled, onChange: (v) => setDisabled(!v) })] }) }));
}
