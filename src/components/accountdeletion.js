import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { Dialog, DialogContent, DialogTitle, } from "@/components/ui/dialog";
const ERR = "#ff6286";
const ERR_GLOW = "rgba(255,98,134,0.15)";
const ERR_DIM = "rgba(255,98,134,0.08)";
export function AccountDeletion() {
    const navigate = useNavigate();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);
    const canConfirm = confirmText === "DELETE";
    function handleOpen() {
        setConfirmText("");
        setDialogOpen(true);
    }
    function handleClose() {
        if (deleting)
            return;
        setDialogOpen(false);
        setConfirmText("");
    }
    async function handleDelete() {
        if (!canConfirm || deleting)
            return;
        setDeleting(true);
        try {
            // Try RPC first (requires a Postgres function `delete_user`)
            const { error } = await supabase.rpc("delete_user");
            if (error)
                throw error;
            await supabase.auth.signOut();
            showCyberToast({
                title: "Account deleted",
                description: "Your account and all data have been permanently removed.",
                tag: "SYS",
                variant: "status",
            });
            navigate("/", { replace: true });
        }
        catch (e) {
            console.error("Account deletion error:", e);
            showCyberToast({
                title: "Deletion failed",
                description: e?.message ?? "Could not delete your account. Contact support.",
                tag: "ERR",
                variant: "error",
            });
        }
        finally {
            setDeleting(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative rounded-[2px] border border-transparent bg-cement/30 overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-error/20" }), _jsxs("div", { className: "relative z-[2] px-4 py-3 pl-5", children: [_jsx("p", { className: "text-flash/20 text-[11px]", children: "Permanently remove your account and all associated data." }), _jsx("div", { className: "mt-3 h-[1px] bg-gradient-to-r from-error/15 via-flash/5 to-transparent" }), _jsxs("div", { className: "flex justify-between items-center pt-2", children: [_jsx("span", { className: "text-[10px] font-mono text-error/20 tracking-[0.08em]", children: "\u25C8 IRREVERSIBLE" }), _jsx("button", { type: "button", onClick: handleOpen, className: "px-2 py-1 rounded-[2px] border border-error/20 text-error/50 hover:text-error hover:border-error/40 hover:bg-error/5 text-[11px] tracking-[0.1em] uppercase cursor-clicker transition-colors shrink-0", children: "DELETE" })] })] })] }), _jsx(Dialog, { open: dialogOpen, onOpenChange: (open) => { if (!open)
                    handleClose(); }, children: _jsxs(DialogContent, { className: "p-0 border-0 bg-transparent shadow-none max-w-[92vw] sm:max-w-[440px] [&>button]:hidden", children: [_jsx(DialogTitle, { className: "sr-only", children: "Confirm Account Deletion" }), _jsxs("div", { className: "relative rounded-[2px] overflow-hidden", style: {
                                background: "rgba(4,10,12,0.96)",
                                border: `1px solid color-mix(in srgb, ${ERR} 15%, transparent)`,
                            }, children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px]", style: { background: `color-mix(in srgb, ${ERR} 50%, transparent)` } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[1]", style: {
                                        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
                                    } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[2]", style: {
                                        background: `linear-gradient(to bottom, transparent 0%, ${ERR_GLOW} 50%, transparent 100%)`,
                                        backgroundSize: "100% 30px",
                                        animation: "ct-scan 4s linear infinite",
                                    } }), _jsx(Corner, { pos: "top-left", color: ERR }), _jsx(Corner, { pos: "top-right", color: ERR }), _jsx(Corner, { pos: "bottom-left", color: ERR }), _jsx(Corner, { pos: "bottom-right", color: ERR }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] z-[3]", style: { background: `linear-gradient(90deg, ${ERR}, transparent)`, opacity: 0.3 } }), _jsxs("div", { className: "relative z-[5] px-6 py-5", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-4", style: { color: `color-mix(in srgb, ${ERR} 50%, transparent)` }, children: [_jsx("span", { style: { color: ERR, fontSize: "8px" }, children: "\u25C8" }), _jsx("span", { children: "::" }), _jsx("span", { className: "px-1.5 py-[1px]", style: {
                                                        color: ERR,
                                                        background: ERR_DIM,
                                                        border: `1px solid color-mix(in srgb, ${ERR} 30%, transparent)`,
                                                        borderRadius: "1px",
                                                        letterSpacing: "0.2em",
                                                    }, children: "WARNING" }), _jsx("span", { children: "::" }), _jsx("span", { style: { color: `color-mix(in srgb, ${ERR} 40%, transparent)`, letterSpacing: "0.15em" }, children: "IRREVERSIBLE" })] }), _jsx("h3", { className: "text-flash text-base font-medium mb-1", children: "Confirm Account Deletion" }), _jsx("div", { className: "w-16 h-[1px] mb-4", style: { background: `linear-gradient(90deg, ${ERR}, transparent)` } }), _jsx("p", { className: "text-flash/40 text-xs mb-2", children: "This will permanently delete:" }), _jsx("ul", { className: "space-y-1 mb-5", children: [
                                                "Your loldata account and login credentials",
                                                "All linked profiles (League of Legends, Discord)",
                                                "Analytics data, preferences, and settings",
                                            ].map((item) => (_jsxs("li", { className: "flex items-start gap-2 text-xs text-flash/50", children: [_jsx("span", { className: "text-error/60 mt-0.5 text-[8px]", children: "\u25C6" }), _jsx("span", { children: item })] }, item))) }), _jsxs("label", { className: "block mb-4", children: [_jsxs("span", { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-flash/30 block mb-1.5", children: ["Type ", _jsx("span", { style: { color: ERR }, children: "DELETE" }), " to confirm"] }), _jsx("input", { type: "text", value: confirmText, onChange: (e) => setConfirmText(e.target.value), placeholder: "DELETE", autoComplete: "off", spellCheck: false, disabled: deleting, className: "w-full rounded-[2px] border border-flash/10 bg-black/40 px-3 py-2 text-sm text-flash outline-none font-mono tracking-widest placeholder:text-flash/15 focus:border-error/30 transition-colors", onKeyDown: (e) => {
                                                        if (e.key === "Enter" && canConfirm)
                                                            handleDelete();
                                                    } })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("button", { type: "button", onClick: handleClose, disabled: deleting, className: "px-3 py-1.5 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker transition-colors disabled:opacity-40", children: "CANCEL" }), _jsx("button", { type: "button", onClick: handleDelete, disabled: !canConfirm || deleting, className: "px-4 py-1.5 rounded-[2px] cursor-clicker text-[11px] tracking-[0.1em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed", style: {
                                                        border: `1px solid color-mix(in srgb, ${ERR} ${canConfirm ? "50%" : "15%"}, transparent)`,
                                                        color: canConfirm ? ERR : `color-mix(in srgb, ${ERR} 30%, transparent)`,
                                                        background: canConfirm ? ERR_DIM : "transparent",
                                                        boxShadow: canConfirm ? `0 0 20px ${ERR_DIM}, inset 0 0 20px ${ERR_DIM}` : "none",
                                                    }, children: deleting ? "DELETING..." : "◈ CONFIRM DELETION" })] })] })] })] }) })] }));
}
/* ── HUD bracket corner ── */
function Corner({ pos, color, }) {
    const isTop = pos.includes("top");
    const isLeft = pos.includes("left");
    return (_jsxs("div", { className: `absolute w-4 h-4 z-[3] ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"}`, children: [_jsx("div", { className: `absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-full h-[2px]`, style: { background: color } }), _jsx("div", { className: `absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-[2px] h-full`, style: { background: color } })] }));
}
