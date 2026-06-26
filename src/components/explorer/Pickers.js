import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Pickers.tsx — node dropdowns in the searchdialog visual language: glass
// Radix surfaces, chakrapetch type, jade focus. ExplorerSelect for short
// lists; IconCombobox (Popover + cmdk) for the long, searchable champion/item
// lists with icons. Both portal to <body>, so they never clip inside a node.
import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, } from "@/components/ui/command";
// `explorer-surface` (see explorer.css) nukes stray focus outlines on these
// portaled popups; jade border instead of the base theme's white one.
const GLASS = "explorer-surface outline-none !border !border-jade/25 bg-black/90 backdrop-blur-xl saturate-150 " +
    "shadow-[0_16px_44px_rgba(0,0,0,0.7)]";
const triggerBase = "nodrag group w-full rounded-[4px] cursor-clicker outline-none focus:outline-none " +
    "focus-visible:outline-none focus-visible:ring-0 flex items-center " +
    "border bg-black/40 backdrop-blur-lg transition-all duration-200";
export function ExplorerSelect({ value, onChange, options, groups, placeholder = "—", renderIcon, }) {
    // normalise to sections: explicit groups, or one unlabelled section from options
    const sections = groups ?? [{ options: options ?? [] }];
    const active = sections.flatMap((s) => s.options).find((o) => o.value === value);
    const activeIcon = renderIcon && active ? renderIcon(active.value) : null;
    return (_jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { className: cn(triggerBase, "h-8 px-2.5 gap-1.5 font-chakrapetch text-[11.5px]", active ? "text-flash border-jade/30 hover:border-jade/50" : "text-flash/45 border-white/10 hover:border-white/20"), children: [activeIcon && _jsx("span", { className: "shrink-0 grid place-items-center w-[18px] h-[18px]", children: activeIcon }), _jsx("span", { className: "flex-1 text-left truncate", children: active?.label ?? placeholder }), _jsx(ChevronDown, { className: "w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" })] }), _jsx(DropdownMenuContent, { align: "start", sideOffset: 6, className: cn("min-w-[var(--radix-dropdown-menu-trigger-width)] p-1", GLASS), children: sections.map((sec, si) => (_jsxs("div", { children: [si > 0 && _jsx("div", { className: "mx-1 my-1 h-px bg-white/[0.07]" }), sec.label && (_jsx("div", { className: "px-2 pt-1 pb-1 font-chakrapetch text-[8.5px] font-bold uppercase tracking-[0.2em] text-flash/30 select-none", children: sec.label })), sec.options.map((o) => (_jsxs(DropdownMenuItem, { onClick: () => onChange(o.value), className: cn(
                            // before:hidden kills the base menu-item's white highlight bar
                            "flex items-center gap-2 cursor-clicker rounded-[3px] px-2.5 py-1.5 font-chakrapetch text-[11.5px] transition-colors before:hidden", "focus:bg-jade/10 focus:text-jade", value === o.value ? "text-jade bg-jade/[0.08]" : "text-flash/55"), children: [renderIcon && _jsx("span", { className: "shrink-0 grid place-items-center w-[18px] h-[18px]", children: renderIcon(o.value) }), _jsx("span", { className: "flex-1 truncate", children: o.label })] }, o.value)))] }, si))) })] }));
}
export function IconCombobox({ value, onChange, options, placeholder, icon, }) {
    const [open, setOpen] = useState(false);
    const active = options.find((o) => o.value === value);
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs("button", { className: cn(triggerBase, "h-9 px-2 gap-2", active ? "border-jade/30 hover:border-jade/50" : "border-white/10 hover:border-white/20"), children: [active ? (_jsx("img", { src: icon(active.value), className: "w-6 h-6 rounded-[3px] border border-white/10 shrink-0", alt: "", draggable: false })) : (_jsx("div", { className: "w-6 h-6 rounded-[3px] bg-black/40 border border-white/10 shrink-0" })), _jsx("span", { className: cn("flex-1 text-left truncate font-chakrapetch text-[12px]", active ? "text-flash" : "text-flash/40"), children: active?.label ?? placeholder }), _jsx(ChevronDown, { className: "w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" })] }) }), _jsx(PopoverContent, { align: "start", sideOffset: 6, className: cn("w-[232px] p-0 overflow-hidden", GLASS), children: _jsxs(Command, { className: "bg-transparent", children: [_jsx(CommandInput, { placeholder: "Search\u2026", className: "font-chakrapetch text-[12px]" }), _jsxs(CommandList, { className: "max-h-[248px] cyber-scrollbar", children: [_jsx(CommandEmpty, { className: "py-5 text-center font-chakrapetch text-[11px] text-flash/35", children: "No match" }), _jsx(CommandGroup, { className: "p-1", children: options.map((o) => (_jsxs(CommandItem, { value: o.label, onSelect: () => { onChange(o.value); setOpen(false); }, className: cn("gap-2 rounded-[3px] px-2 py-1.5 font-chakrapetch text-[12px] cursor-clicker", "text-flash/70 aria-selected:bg-jade/10 aria-selected:text-jade"), children: [_jsx("img", { src: icon(o.value), className: "w-6 h-6 rounded-[3px] border border-white/10 shrink-0", alt: "", loading: "lazy", draggable: false }), _jsx("span", { className: "flex-1 truncate", children: o.label }), value === o.value && _jsx(Check, { className: "w-3.5 h-3.5 text-jade shrink-0" })] }, o.value))) })] })] }) })] }));
}
