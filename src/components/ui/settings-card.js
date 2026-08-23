import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export function SettingsCard({ title, hint, variant = "default", className, contentClassName, children, }) {
    const danger = variant === "danger";
    return (_jsx("div", { className: cn("relative flex flex-col overflow-hidden rounded-md", "backdrop-blur-lg saturate-150", 
        // Theme-aware glass: dark keeps the historic light-film-on-near-black
        // look; light becomes a crisp elevated paper card. Both recipes live in
        // .glass-surface (index.css) so the surface flips with the theme.
        danger
            ? "bg-error/[0.06] shadow-[0_10px_30px_rgb(var(--c-filmdark)/0.30),inset_0_0_0_1px_rgb(var(--c-error)/0.30),inset_0_1px_0_rgb(var(--c-error)/0.14)]"
            : "glass-surface", className), children: _jsxs("div", { className: "relative z-[1] flex flex-1 flex-col px-4 py-3.5", children: [(title || hint) && (_jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [title && (_jsx("p", { className: cn("font-mono text-[11px] uppercase tracking-[0.25em]", danger ? "text-[#ff6286]/75" : "text-jade/55"), children: title })), hint && _jsx("span", { className: "shrink-0 font-mono text-[10px] tracking-[0.08em] text-flash/30", children: hint })] })), _jsx("div", { className: cn("flex-1", contentClassName), children: children })] }) }));
}
