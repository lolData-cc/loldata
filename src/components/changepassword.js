import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from "@/components/ui/dialog";
import { BorderBeam } from "@/components/ui/border-beam";
export function ChangePassword() {
    const [open, setOpen] = useState(false);
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [loading, setLoading] = useState(false);
    const canSubmit = newPw.length >= 6 && newPw === confirmPw && !loading;
    function handleClose() {
        if (loading)
            return;
        setOpen(false);
        setNewPw("");
        setConfirmPw("");
    }
    async function handleChange() {
        if (!canSubmit)
            return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPw });
            if (error)
                throw error;
            showCyberToast({ title: "Password updated", variant: "status" });
            handleClose();
        }
        catch (err) {
            showCyberToast({
                title: "Failed to update password",
                description: err?.message ?? "Unknown error",
                variant: "error",
            });
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" } }), _jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsxs("div", { className: "relative z-[2] px-4 py-3 pl-5", children: [_jsx("span", { className: "text-flash/60 text-sm", children: "Update your account password." }), _jsx("div", { className: "mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsxs("div", { className: "flex justify-between items-center pt-2", children: [_jsx("span", { className: "text-[10px] font-mono text-flash/30 tracking-[0.08em]", children: "\u25C8 REQUIRES ACTIVE SESSION" }), _jsx("button", { type: "button", onClick: () => setOpen(true), className: "px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase transition-colors shrink-0", children: "CHANGE" })] })] })] }), _jsx(Dialog, { open: open, onOpenChange: (v) => !v && handleClose(), children: _jsx(DialogContent, { className: "w-full max-w-[92vw] sm:max-w-sm bg-transparent shadow-none top-60 [&>button]:hidden flex flex-col items-center", children: _jsx("div", { className: "w-full relative", children: _jsxs("div", { className: "font-jetbrains bg-liquirice/90 select-none border-flash/10 border px-7 py-5 rounded-md", children: [_jsx(BorderBeam, { duration: 8, size: 100 }), _jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash", children: "Change Password" }), _jsx(DialogDescription, { className: "text-flash/50 text-sm", children: "Enter a new password (minimum 6 characters)." })] }), _jsxs("div", { className: "flex flex-col gap-3 mt-4", children: [_jsx("input", { type: "password", placeholder: "New password", value: newPw, onChange: (e) => setNewPw(e.target.value), className: "w-full px-3 py-2 rounded-[2px] border border-flash/10 bg-black/30 text-flash/80 text-sm font-mono placeholder:text-flash/20 focus:outline-none focus:border-jade/30 transition-colors" }), _jsx("input", { type: "password", placeholder: "Confirm new password", value: confirmPw, onChange: (e) => setConfirmPw(e.target.value), className: "w-full px-3 py-2 rounded-[2px] border border-flash/10 bg-black/30 text-flash/80 text-sm font-mono placeholder:text-flash/20 focus:outline-none focus:border-jade/30 transition-colors" }), newPw && confirmPw && newPw !== confirmPw && (_jsx("p", { className: "text-[10px] text-red-400/60 font-mono", children: "Passwords do not match" })), newPw && newPw.length > 0 && newPw.length < 6 && (_jsx("p", { className: "text-[10px] text-flash/30 font-mono", children: "Minimum 6 characters" }))] }), _jsxs("div", { className: "flex justify-end gap-3 mt-5", children: [_jsx("button", { type: "button", onClick: handleClose, disabled: loading, className: "px-2 py-1 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker transition-colors disabled:opacity-40", children: "CANCEL" }), _jsx("button", { type: "button", disabled: !canSubmit, onClick: handleChange, className: "px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase transition-colors disabled:opacity-30 disabled:pointer-events-none", children: loading ? "UPDATING..." : "CONFIRM" })] })] }) }) }) })] }));
}
