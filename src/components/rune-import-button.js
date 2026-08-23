import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { cn } from "@/lib/utils";
export function buildRuneLink(champion, patch, page) {
    // Four primary, two secondary, three shards — the client's own shape, and
    // the order the app validates against.
    const perks = [...page.primary, ...page.secondary, ...page.shards];
    const q = new URLSearchParams({
        champion,
        primary: String(page.primaryStyle),
        sub: String(page.subStyle),
        perks: perks.join(","),
    });
    if (patch)
        q.set("patch", patch);
    return `loldata://runes?${q.toString()}`;
}
export default function RuneImportButton({ champion, patch, page, className, }) {
    const [sent, setSent] = useState(false);
    if (!page)
        return null;
    const complete = page.primary?.length === 4 && page.secondary?.length === 2 && page.shards?.length === 3;
    if (!complete)
        return null;
    const send = () => {
        window.location.href = buildRuneLink(champion, patch, page);
        // Says the handoff happened, not that the import did — the browser cannot
        // know the second one, and a false "imported" would be worse than nothing.
        setSent(true);
        window.setTimeout(() => setSent(false), 2600);
    };
    return (_jsxs("button", { type: "button", onClick: send, title: `Needs the loldata desktop app · sets this page as "${champion} - LolData" in your client`, className: cn("group relative shrink-0 overflow-hidden rounded-[3px] px-3 py-1.5", "font-chakrapetch text-[11px] font-bold uppercase tracking-[0.12em]", "text-jade transition-colors cursor-pointer", "bg-jade/[0.10] hover:bg-jade/[0.17]", className), 
        // A left rail rather than an outline — the site does not do pale borders.
        style: { boxShadow: "inset 2px 0 0 0 #00d992" }, children: [_jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-full", style: { background: "linear-gradient(90deg,transparent,rgba(0,217,146,0.22),transparent)" } }), _jsx("span", { className: "relative", children: sent ? "opening app" : "import runes" })] }));
}
