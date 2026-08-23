import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEnableMatchCentering } from "@/hooks/useEnableMatchCentering";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function MatchCenteringPreference() {
    const { enabled, setEnabled } = useEnableMatchCentering();
    return (_jsx(SettingsCard, { title: "Center Matches on Scroll", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Shift match list to the center after scrolling past the sidebar." }) }), _jsx(CyberToggle, { checked: enabled, onChange: (v) => setEnabled(v) })] }) }));
}
