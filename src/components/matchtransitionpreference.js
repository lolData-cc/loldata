import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useDisableMatchTransition } from "@/hooks/useDisableMatchTransition";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function MatchTransitionPreference() {
    const { disabled, setDisabled } = useDisableMatchTransition();
    return (_jsx(SettingsCard, { title: "Match Transition", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Cyber animation when entering a match detail view." }) }), _jsx(CyberToggle, { checked: !disabled, onChange: (v) => setDisabled(!v) })] }) }));
}
