import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useHardwareAcceleration } from "@/hooks/useHardwareAcceleration";
const DISMISS_KEY = "lolData:hwAccelWarningDismissed";
const ALERT = "#00d992";
const ALERT_DIM = "rgba(0,217,146,0.08)";
const FREEZE_CLASS = "modal-frozen";
export function HardwareAccelerationWarning() {
    const status = useHardwareAcceleration();
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (status !== "disabled")
            return;
        if (typeof window === "undefined")
            return;
        const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
        if (!dismissed)
            setOpen(true);
    }, [status]);
    useEffect(() => {
        if (typeof document === "undefined")
            return;
        if (open)
            document.body.classList.add(FREEZE_CLASS);
        else
            document.body.classList.remove(FREEZE_CLASS);
        return () => document.body.classList.remove(FREEZE_CLASS);
    }, [open]);
    const handleDismiss = () => {
        try {
            window.localStorage.setItem(DISMISS_KEY, "1");
        }
        catch {
            // ignore — quota / disabled storage
        }
        setOpen(false);
    };
    return (_jsx(Dialog, { open: open, onOpenChange: (v) => !v && handleDismiss(), children: _jsxs(DialogContent, { className: "p-0 border-0 bg-transparent shadow-none max-w-[460px] font-jetbrains [&>button]:hidden", children: [_jsx(DialogTitle, { className: "sr-only", children: "Hardware acceleration is off" }), _jsxs("div", { className: "relative rounded-[2px] overflow-hidden", style: {
                        background: "rgba(4,10,12,0.96)",
                        border: `1px solid color-mix(in srgb, ${ALERT} 18%, transparent)`,
                    }, children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px]", style: { background: `color-mix(in srgb, ${ALERT} 55%, transparent)` } }), _jsx(Corner, { pos: "top-left", color: ALERT }), _jsx(Corner, { pos: "top-right", color: ALERT }), _jsx(Corner, { pos: "bottom-left", color: ALERT }), _jsx(Corner, { pos: "bottom-right", color: ALERT }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] z-[3]", style: {
                                background: `linear-gradient(90deg, ${ALERT}, transparent)`,
                                opacity: 0.3,
                            } }), _jsxs("div", { className: "relative z-[5] px-6 py-5", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-4", style: { color: `color-mix(in srgb, ${ALERT} 50%, transparent)` }, children: [_jsx("span", { style: { color: ALERT, fontSize: "8px" }, children: "\u25C8" }), _jsx("span", { children: "::" }), _jsx("span", { className: "px-1.5 py-[1px]", style: {
                                                color: ALERT,
                                                background: ALERT_DIM,
                                                border: `1px solid color-mix(in srgb, ${ALERT} 30%, transparent)`,
                                                borderRadius: "1px",
                                                letterSpacing: "0.2em",
                                            }, children: "SYSTEM ALERT" }), _jsx("span", { children: "::" }), _jsx("span", { style: {
                                                color: `color-mix(in srgb, ${ALERT} 40%, transparent)`,
                                                letterSpacing: "0.15em",
                                            }, children: "GPU" })] }), _jsx("h3", { className: "text-flash text-base font-medium mb-1", children: "Hardware acceleration is off" }), _jsx("div", { className: "w-16 h-[1px] mb-4", style: { background: `linear-gradient(90deg, ${ALERT}, transparent)` } }), _jsx("p", { className: "text-flash/55 text-xs mb-3 leading-relaxed", children: "loldata.cc relies on GPU rendering for animations, charts, and visual effects. With acceleration disabled, the site will be really bad to use." }), _jsx("ul", { className: "space-y-1 mb-5", children: [
                                        "Animations and transitions will stutter",
                                        "Charts and overlays may flicker or drop frames",
                                        "Heavy pages will feel sluggish or freeze",
                                    ].map((item) => (_jsxs("li", { className: "flex items-start gap-2 text-xs text-flash/50", children: [_jsx("span", { className: "mt-0.5 text-[8px]", style: { color: `color-mix(in srgb, ${ALERT} 60%, transparent)` }, children: "\u25C6" }), _jsx("span", { children: item })] }, item))) }), _jsxs("p", { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-flash/30 mb-4", children: ["Tip ", _jsx("span", { className: "text-flash/40", children: "\u203A" }), " Enable it in your browser settings, then reload."] }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: handleDismiss, className: "px-4 py-1.5 rounded-[2px] cursor-clicker text-[11px] tracking-[0.1em] uppercase transition-all", style: {
                                            border: `1px solid color-mix(in srgb, ${ALERT} 45%, transparent)`,
                                            color: ALERT,
                                            background: ALERT_DIM,
                                            boxShadow: `0 0 20px ${ALERT_DIM}, inset 0 0 20px ${ALERT_DIM}`,
                                        }, children: "\u25C8 I'LL USE IT ANYWAY" }) })] })] })] }) }));
}
/* ── HUD bracket corner ── */
function Corner({ pos, color, }) {
    const isTop = pos.includes("top");
    const isLeft = pos.includes("left");
    return (_jsxs("div", { className: `absolute w-4 h-4 z-[3] ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"}`, children: [_jsx("div", { className: `absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-full h-[2px]`, style: { background: color } }), _jsx("div", { className: `absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-[2px] h-full`, style: { background: color } })] }));
}
