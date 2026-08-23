import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
export const ACTION_ACCENTS = {
    citrine: "255 182 21",
    jade: "0 217 146",
};
// Fixed so a label change (UPDATE → UPDATED → 2:31) cannot shift the text off
// centre and make the button twitch.
const LABEL_W = "w-[62px]";
export function ActionButton({ accent = "jade", label, loading, muted, progress, fill, className, disabled, style, ...props }) {
    return (_jsxs("button", { ...props, disabled: disabled || loading, "data-state": muted ? "muted" : undefined, style: { ["--acc"]: ACTION_ACCENTS[accent], ...style }, className: cn("act-btn h-8 shrink-0 inline-flex items-center justify-center", fill ? "w-full" : "w-[104px]", "font-jetbrains text-[10px] uppercase tracking-[0.16em]", "cursor-clicker select-none disabled:pointer-events-none", className), children: [_jsx("span", { "aria-hidden": true, className: "act-sweep pointer-events-none absolute inset-y-0 left-0 w-[34%]", style: { background: "linear-gradient(90deg, transparent, rgb(var(--acc) / 0.16), transparent)" } }), _jsx("span", { className: cn("relative z-10 text-center tabular-nums", fill ? "" : LABEL_W), children: label }), loading ? (_jsx("span", { "aria-hidden": true, className: "act-indeterminate" })) : progress != null ? (_jsx("span", { "aria-hidden": true, className: "act-progress", style: { width: `${Math.max(0, Math.min(1, progress)) * 100}%` } })) : null] }));
}
