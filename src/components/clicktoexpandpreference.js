import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useClickToExpandMatch } from "@/hooks/useClickToExpandMatch";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function ClickToExpandPreference() {
    const { enabled, setEnabled } = useClickToExpandMatch();
    return (_jsx(SettingsCard, { title: "Click to Expand Match", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Expand match actions on click instead of hover." }) }), _jsx(CyberToggle, { checked: enabled, onChange: (v) => setEnabled(v) })] }) }));
}
