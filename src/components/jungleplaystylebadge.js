import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
import { getReadableJunglePlaystyleTag, getJunglePlaystyleTagClasses, getReadableStartingCamp, getStartingCampClasses, getReadableInvade, getInvadeClasses, } from "@/utils/junglePlaystyle";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, } from "@/components/ui/tooltip";
export function JunglePlaystyleBadge({ tag, topsideCount, botsideCount }) {
    const label = getReadableJunglePlaystyleTag(tag);
    if (!label)
        return null;
    const badge = (_jsxs("div", { className: cn("h-5 flex items-center gap-1.5 pl-2 pr-2.5", "font-mono text-[9px] uppercase tracking-[0.1em]", "border-l-2 bg-black/30", getJunglePlaystyleTagClasses(tag)), children: [_jsx("span", { className: "opacity-40 text-[8px] leading-none", children: "\u25C8" }), _jsx("span", { children: label })] }));
    if (tag === "played_for_both" && topsideCount != null && botsideCount != null) {
        return (_jsx(TooltipProvider, { delayDuration: 0, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: badge }), _jsx(TooltipContent, { side: "top", className: "font-mono text-[10px] tracking-wide", children: _jsxs("span", { children: ["Ganked top ", topsideCount === 2 ? "twice" : `${topsideCount} times`, ", bot ", botsideCount === 2 ? "twice" : `${botsideCount} times`] }) })] }) }));
    }
    return badge;
}
export function JungleStartingCampBadge({ camp }) {
    const label = getReadableStartingCamp(camp);
    if (!label)
        return null;
    return (_jsxs("div", { className: cn("h-5 flex items-center gap-1.5 pl-2 pr-2.5", "font-mono text-[9px] uppercase tracking-[0.1em]", "border-l-2 bg-black/30", getStartingCampClasses(camp)), children: [_jsx("span", { className: "opacity-40 text-[8px] leading-none", children: "\u25C8" }), _jsx("span", { children: label })] }));
}
export function JungleInvadeBadge({ invade }) {
    const label = getReadableInvade(invade);
    if (!label)
        return null;
    return (_jsxs("div", { className: cn("h-5 flex items-center gap-1.5 pl-2 pr-2.5", "font-mono text-[9px] uppercase tracking-[0.1em]", "border-l-2 bg-black/30", getInvadeClasses(invade)), children: [_jsx("span", { className: "opacity-40 text-[8px] leading-none", children: "\u25C8" }), _jsx("span", { children: label })] }));
}
