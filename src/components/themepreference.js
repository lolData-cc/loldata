import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { SettingsCard } from "@/components/ui/settings-card";
import { cn } from "@/lib/utils";
import { LIGHT_THEME_ENABLED } from "@/lib/uiPrefs";
export function ThemePreference() {
    const { theme, setTheme } = useTheme();
    return (_jsx(SettingsCard, { title: "Theme", children: _jsxs("div", { className: "flex items-center justify-between gap-4", children: [_jsx("div", { children: _jsx("span", { className: "text-flash/80 text-sm", children: LIGHT_THEME_ENABLED
                            ? "Switch the whole site between dark and light."
                            : "A light theme is on the way — the site is dark for now." }) }), _jsxs("div", { className: "flex shrink-0 items-center gap-1 rounded-[5px] p-1 bg-filmdark/40 shadow-[inset_0_0_0_1px_rgb(var(--c-hairline)/0.14)]", children: [_jsxs("button", { type: "button", onClick: () => setTheme("dark"), "aria-pressed": theme === "dark", className: cn("flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-all duration-200 cursor-clicker", theme === "dark"
                                ? "bg-jade/15 text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.4),0_0_8px_rgb(var(--c-jade)/0.18)]"
                                : "text-flash/40 hover:text-flash/70"), children: [_jsx(Moon, { size: 12, strokeWidth: 2.2 }), "Dark"] }), _jsxs("button", { type: "button", disabled: !LIGHT_THEME_ENABLED, onClick: () => LIGHT_THEME_ENABLED && setTheme("light"), "aria-disabled": !LIGHT_THEME_ENABLED, title: LIGHT_THEME_ENABLED ? undefined : "Light theme — coming soon", className: cn("relative flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-all duration-200", LIGHT_THEME_ENABLED
                                ? "cursor-clicker text-flash/40 hover:text-flash/70"
                                : "cursor-not-allowed text-flash/25"), children: [_jsx(Sun, { size: 12, strokeWidth: 2.2 }), "Light", !LIGHT_THEME_ENABLED && (_jsx("span", { className: "ml-1 rounded-[2px] bg-citrine/15 px-1 py-[1px] font-mono text-[7px] font-bold tracking-[0.12em] text-citrine/90 shadow-[inset_0_0_0_1px_rgb(var(--c-citrine)/0.3)]", children: "SOON" }))] })] })] }) }));
}
