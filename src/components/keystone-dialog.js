import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// KeystoneDialog — pick a keystone with every option on screen at once. One row
// per rune tree (Precision = gold, Domination = red, …), each keystone a round
// "coin", the whole board floating inside an iOS-16 frosted-glass square.
// Driven by the live rune roster (runeData), so new keystones appear on their own.
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PERK_CDN } from "@/config";
import { useRuneTrees } from "@/constants/runeData";
// canonical client order → row order (gold, red, violet, green, cyan)
const TREE_ORDER = [8000, 8100, 8200, 8400, 8300];
const TREE_HEX = {
    8000: "#E8C36B", // Precision — gold
    8100: "#E0564E", // Domination — red
    8200: "#B28DED", // Sorcery — violet
    8400: "#62CB8E", // Resolve — green
    8300: "#4FC4D6", // Inspiration — cyan
};
export function KeystoneDialog({ selectedKeystone = null, onSelect, open, onOpenChange, trigger, }) {
    const trees = useRuneTrees();
    const orderIdx = (id) => {
        const i = TREE_ORDER.indexOf(id);
        return i === -1 ? 999 : i;
    };
    const ordered = [...trees].sort((a, b) => orderIdx(a.id) - orderIdx(b.id));
    const controlled = open !== undefined;
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlled ? open : internalOpen;
    const setOpen = (o) => {
        if (!controlled)
            setInternalOpen(o);
        onOpenChange?.(o);
    };
    return (_jsxs(Dialog, { open: isOpen, onOpenChange: setOpen, children: [trigger && !controlled && _jsx(DialogTrigger, { asChild: true, children: trigger }), _jsx(DialogContent, { className: "w-auto max-w-none bg-transparent border-none shadow-none p-0 [&>button]:hidden", children: _jsxs("div", { className: "relative rounded-[30px] p-6 border border-white/20", style: {
                        background: "linear-gradient(135deg, rgba(255,255,255,0.11), rgba(255,255,255,0.035))",
                        backdropFilter: "blur(28px) saturate(160%)",
                        WebkitBackdropFilter: "blur(28px) saturate(160%)",
                        boxShadow: "0 28px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 0 0.5px rgba(255,255,255,0.06)",
                    }, children: [_jsx("div", { className: "pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[30px]", style: { background: "linear-gradient(180deg, rgba(255,255,255,0.12), transparent)" } }), _jsxs("div", { className: "relative z-10 flex flex-col gap-3", children: [_jsx("div", { className: "mb-1 text-center text-[10px] font-chakrapetch font-semibold uppercase tracking-[0.32em] text-white/55", children: "Keystone" }), ordered.map((tree) => {
                                    const hex = TREE_HEX[tree.id] ?? "#d7d8d9";
                                    return (_jsx("div", { className: "flex items-start justify-center gap-2.5", children: tree.keystones.map((ks) => {
                                            const active = selectedKeystone === ks.id;
                                            return (_jsxs("button", { type: "button", title: ks.name, onClick: () => { onSelect(tree.id, ks.id); setOpen(false); }, className: "group flex flex-col items-center gap-1.5 w-[84px] focus:outline-none", children: [_jsxs("span", { className: "relative grid place-items-center w-[58px] h-[58px] rounded-full transition-transform duration-200 ease-out group-hover:scale-[1.12]", style: { transform: active ? "scale(1.08)" : undefined }, children: [_jsx("span", { className: "absolute inset-0 rounded-full transition-all duration-200", style: {
                                                                    background: "radial-gradient(circle at 50% 35%, rgba(255,255,255,0.10), rgba(0,0,0,0.35))",
                                                                    border: `1.5px solid ${hex}${active ? "" : "55"}`,
                                                                    boxShadow: active
                                                                        ? `0 0 16px ${hex}aa, inset 0 0 10px ${hex}33`
                                                                        : `inset 0 0 8px rgba(0,0,0,0.45)`,
                                                                } }), _jsx("span", { className: "pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200", style: { boxShadow: `0 0 14px ${hex}88` } }), _jsx("img", { src: `${PERK_CDN}/${ks.icon}`, alt: ks.name, draggable: false, className: cn("relative w-[42px] h-[42px] rounded-full object-cover transition-all duration-200", active ? "" : "saturate-[0.85] group-hover:saturate-100"), style: { filter: active ? `drop-shadow(0 0 4px ${hex})` : undefined }, onError: (e) => (e.target.style.visibility = "hidden") })] }), _jsx("span", { className: cn("text-[11px] font-chakrapetch font-bold text-center leading-tight line-clamp-2 transition-colors duration-200", active ? "text-white" : "text-white/75 group-hover:text-white"), children: ks.name })] }, ks.id));
                                        }) }, tree.id));
                                })] })] }) })] }));
}
