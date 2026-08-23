import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContextMenuActions } from "@/hooks/useContextMenuActions";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function ContextMenuActionsPreference() {
    const { enabled, setEnabled } = useContextMenuActions();
    return (_jsx(SettingsCard, { title: "Right-Click Match Actions", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: "Replace hover buttons with a right-click context menu on matches." }) }), _jsx(CyberToggle, { checked: enabled, onChange: (v) => setEnabled(v) })] }) }));
}
