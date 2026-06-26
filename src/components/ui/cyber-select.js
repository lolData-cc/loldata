import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, } from "@/components/ui/dropdown-menu";
export function CyberSelect({ value, onChange, options, placeholder = "Select", className }) {
    const activeLabel = options.find(o => o.value === value)?.label ?? placeholder;
    return (_jsxs(DropdownMenu, { children: [_jsxs(DropdownMenuTrigger, { className: cn("group relative font-mono text-[8px] tracking-[0.12em] uppercase px-2 h-[24px] rounded-[2px] transition-all duration-300 cursor-pointer flex items-center gap-1", "border backdrop-blur-lg", value
                    ? "text-jade bg-jade/10 border-jade/30 shadow-[0_0_12px_rgba(0,217,146,0.08)]"
                    : "text-flash/40 border-flash/10 hover:text-flash/60 hover:border-flash/20 bg-black/40", className), children: [activeLabel, _jsx(ChevronDown, { className: "h-3 w-3" })] }), _jsx(DropdownMenuContent, { align: "start", className: "w-40 text-sm bg-black/80 backdrop-blur-xl border-white/10", children: options.map((opt) => (_jsx(DropdownMenuItem, { onClick: () => onChange(opt.value), className: cn("cursor-pointer uppercase font-mono text-[10px] tracking-[0.1em]", value === opt.value ? "text-jade font-semibold" : "text-flash/50"), children: opt.label }, opt.value))) })] }));
}
