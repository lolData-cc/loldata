"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function CyberToast({ title, description, tag = "SYS", variant = "status", action, onDismiss, duration = 3000, }) {
    const error = variant === "error";
    const ac = error ? "#ff6286" : "#00d992";
    return (_jsxs("div", { className: "ctd-in relative w-[340px] select-none pb-3", children: [_jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 rounded-[3px]", style: {
                    background: "linear-gradient(180deg, #0d181b 0%, #091214 100%)",
                    boxShadow: `inset 0 0 0 1px ${ac}22, 0 1px 0 0 rgba(255,255,255,0.02) inset,` +
                        " 0 12px 28px -8px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.6)",
                } }), _jsxs("svg", { "aria-hidden": true, viewBox: "0 0 340 10", preserveAspectRatio: "none", className: "absolute inset-x-0 top-0 h-[10px] w-full overflow-visible", style: { filter: `drop-shadow(0 0 5px ${ac}66)` }, children: [_jsx("path", { className: "ctd-rail", d: "M 0 2 L 329 2 L 338 9", fill: "none", stroke: ac, strokeWidth: "1", vectorEffect: "non-scaling-stroke", opacity: "0.9", pathLength: 1, strokeDasharray: 1 }), _jsx("g", { transform: "rotate(45 16 2)", children: _jsx("rect", { className: "ctd-mark", x: "12", y: "-2", width: "8", height: "8", fill: ac }) })] }), _jsxs("div", { className: "relative pl-6 pr-4 pt-[14px]", children: [_jsxs("div", { className: "ctd-tag flex items-center gap-2.5", children: [_jsx("span", { className: "font-jetbrains text-[9px] uppercase leading-none tracking-[0.28em]", style: { color: ac }, children: tag }), _jsx("span", { "aria-hidden": true, className: "h-px flex-1", style: { background: `linear-gradient(90deg, ${ac}33, transparent)` } })] }), _jsx("p", { className: "ctd-title mt-2 font-chakrapetch text-[15px] font-bold leading-tight text-flash", style: { textShadow: "0 1px 6px rgba(0,0,0,0.9)" }, children: title }), description && (_jsx("p", { className: "ctd-body mt-1.5 font-chakrapetch text-[12px] leading-relaxed text-flash/45", children: description })), (action || onDismiss) && (_jsxs("div", { className: "ctd-body mt-3 flex items-center gap-2 pb-1", children: [action && (_jsx("button", { type: "button", onClick: action.onClick, className: "ctd-btn relative overflow-hidden rounded-[2px] px-3 py-1 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.12em]", style: { color: ac, background: `${ac}1a`, boxShadow: `inset 2px 0 0 0 ${ac}` }, children: action.label })), onDismiss && (_jsx("button", { type: "button", onClick: onDismiss, className: "rounded-[2px] px-2.5 py-1 font-jetbrains text-[10px] uppercase tracking-[0.14em] text-flash/30 transition-colors hover:text-flash/60", children: "dismiss" }))] })), _jsx("span", { "aria-hidden": true, className: "ctd-timer absolute bottom-0 left-6 right-4 h-px origin-left", style: { background: `linear-gradient(90deg, ${ac}, ${ac}22)`, animationDuration: `${duration}ms` } })] }), _jsx("style", { children: `
        /* The card arrives from slightly above and settles. One movement. */
        @keyframes ctd-arrive {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ctd-draw   { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
        @keyframes ctd-snap {
          0%   { opacity: 0; transform: scale(0.3); }
          65%  { opacity: 1; transform: scale(1.18); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ctd-wipe   { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 -2% 0 0); } }
        @keyframes ctd-lift   { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        @keyframes ctd-timer  { from { transform: scaleX(1); } to { transform: scaleX(0); } }

        .ctd-in    { animation: ctd-arrive 320ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .ctd-rail  { animation: ctd-draw 340ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .ctd-mark  { animation: ctd-snap 260ms cubic-bezier(0.34, 1.56, 0.64, 1) 170ms both;
                     transform-box: fill-box; transform-origin: center; }
        .ctd-tag   { animation: ctd-lift 220ms cubic-bezier(0.16, 1, 0.3, 1) 150ms both; }
        .ctd-title { animation: ctd-wipe 300ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both; }
        .ctd-body  { animation: ctd-lift 240ms cubic-bezier(0.16, 1, 0.3, 1) 290ms both; }
        .ctd-timer { animation-name: ctd-timer; animation-timing-function: linear;
                     animation-fill-mode: both; animation-delay: 340ms; }

        .ctd-btn::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ctd-btn:hover::after { transform: translateX(100%); }

        @media (prefers-reduced-motion: reduce) {
          .ctd-in, .ctd-rail, .ctd-mark, .ctd-tag, .ctd-title, .ctd-body { animation: none; }
          .ctd-btn::after { display: none; }
        }
      ` })] }));
}
