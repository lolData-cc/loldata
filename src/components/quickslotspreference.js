import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuickSlots } from "@/hooks/useQuickSlots";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";
export function QuickSlotsPreference() {
    const { enabled, setEnabled } = useQuickSlots();
    return (_jsx(SettingsCard, { title: "Quick Slots", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsxs("div", { children: [_jsx("span", { className: "text-flash/80 text-sm", children: "Floating 3-slot shortcut rail, anchored to the right edge on every page." }), _jsx("p", { className: "text-flash/35 text-xs mt-1", children: "Pin champions, summoners, scout lobbies and more for one-click access." })] }), _jsx(CyberToggle, { checked: enabled, onChange: (v) => setEnabled(v) })] }) }));
}
