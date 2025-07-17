import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
export function UserDialog() {
    return (_jsxs(Dialog, { children: [_jsx(DialogTrigger, { className: "text-[#00D992] hover:bg-[#11382E] rounded px-2", children: _jsx(UserRound, { className: "w-5" }) }), _jsx(DialogContent, { children: _jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Are you absolutely sure?" }), _jsx(DialogDescription, { children: "This action cannot be undone. This will permanently delete your account and remove your data from our servers." })] }) })] }));
}
