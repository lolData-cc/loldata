import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDisableMatchGrouping } from "@/hooks/useDisableMatchGrouping";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function MatchGroupingPreference() {
    const { disabled, setDisabled } = useDisableMatchGrouping();
    return (_jsx(SettingsCard, { title: "Group Matches by Day", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Group match history by date with day headers and stats." }) }), _jsx(CyberToggle, { checked: !disabled, onChange: (v) => setDisabled(!v) })] }) }));
}
