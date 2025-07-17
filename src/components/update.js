import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
export function UpdateButton({ loading, cooldown, className, children, ...props }) {
    const text = cooldown ? "UPDATED" : (loading ? "" : (children || "UPDATE"));
    return (_jsx(Button, { ...props, className: cn("flex items-center justify-center gap-2 select-none", cooldown
            ? "bg-jade/20 text-jade"
            : "bg-jade bg-jade/20", className), disabled: loading || cooldown, children: loading
            ? _jsx(Loader2, { className: "animate-spin w-20 h-10" })
            : text }));
}
