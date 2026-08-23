import { jsx as _jsx } from "react/jsx-runtime";
import { ShieldCheck } from "lucide-react";
import { DiamondButton } from "@/components/ui/diamond-button";
import { cn } from "@/lib/utils";
export function VerifyFab({ onOpen, className, }) {
    return (_jsx("div", { className: cn("fixed bottom-6 left-6 z-50 flex flex-col items-center", className), children: _jsx(DiamondButton, { color: "blue", icon: _jsx(ShieldCheck, { className: "w-4 h-4" }), label: "Verify", onClick: onOpen, "aria-label": "Verify accounts" }) }));
}
