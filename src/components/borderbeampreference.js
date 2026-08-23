import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDisableBorderBeams } from "@/hooks/useDisableBorderBeams";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function BorderBeamPreference() {
    const { disabled, setDisabled } = useDisableBorderBeams();
    return (_jsx(SettingsCard, { title: "Border Beam", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Animated border effect (disable to improve performance)." }) }), _jsx(CyberToggle, { checked: !disabled, onChange: (v) => setDisabled(!v) })] }) }));
}
