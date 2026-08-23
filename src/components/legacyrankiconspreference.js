import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLegacyRankIcons } from "@/hooks/useLegacyRankIcons";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function LegacyRankIconsPreference() {
    const { enabled, setEnabled } = useLegacyRankIcons();
    return (_jsx(SettingsCard, { title: "Legacy Rank Icons", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Use the classic 2019 helmet-style ranked emblems." }) }), _jsx(CyberToggle, { checked: enabled, onChange: (v) => setEnabled(v) })] }) }));
}
