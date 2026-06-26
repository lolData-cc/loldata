"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export function CyberToast({ title, description, tag = "SYS", variant = "status", action, onDismiss, }) {
    const [phase, setPhase] = useState("hidden");
    useEffect(() => {
        // Phase 1: glitch-in (0ms → 50ms trigger, 400ms anim)
        const t1 = setTimeout(() => setPhase("glitch"), 30);
        // Phase 2: settle into visible (after glitch anim completes)
        const t2 = setTimeout(() => setPhase("visible"), 450);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);
    const isError = variant === "error";
    const ac = isError ? "#ff6286" : "#00d992"; // accent color (using site's error color)
    const glow = isError ? "rgba(255,98,134,0.4)" : "rgba(0,217,146,0.4)";
    const dimGlow = isError ? "rgba(255,98,134,0.08)" : "rgba(0,217,146,0.08)";
    const midGlow = isError ? "rgba(255,98,134,0.15)" : "rgba(0,217,146,0.15)";
    return (_jsxs("div", { className: "relative font-mono select-none", style: {
            opacity: phase === "hidden" ? 0 : 1,
            transform: phase === "hidden"
                ? "scaleY(0.8) skew(2deg, 2deg) translateY(-10px)"
                : phase === "glitch"
                    ? "scaleY(1.02) skew(-0.5deg, -0.5deg) translateY(1px)"
                    : "scaleY(1) skew(0deg, 0deg) translateY(0)",
            filter: phase === "hidden"
                ? "brightness(0.5) contrast(2)"
                : phase === "glitch"
                    ? "brightness(1.15) contrast(1.3)"
                    : "brightness(1) contrast(1)",
            transition: phase === "hidden"
                ? "none"
                : phase === "glitch"
                    ? "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
                    : "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }, children: [_jsxs("div", { className: "relative overflow-hidden w-[340px]", style: {
                    background: "#040A0C",
                    border: `1px solid color-mix(in srgb, ${ac} 30%, transparent)`,
                    borderRadius: "2px",
                    boxShadow: `
            0 0 30px ${dimGlow},
            0 4px 20px rgba(0,0,0,0.6)
          `,
                }, children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px]", style: {
                            background: ac,
                            boxShadow: `0 0 8px ${glow}, 0 0 20px ${dimGlow}`,
                        } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[1]", style: {
                            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
                        } }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[2]", style: {
                            background: `linear-gradient(to bottom, transparent 0%, ${midGlow} 50%, transparent 100%)`,
                            backgroundSize: "100% 30px",
                            animation: "ct-scan 4s linear infinite",
                        } }), _jsxs("div", { className: "absolute top-0 left-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[2px]", style: { background: ac } }), _jsx("div", { className: "absolute top-0 left-0 w-[2px] h-full", style: { background: ac } })] }), _jsxs("div", { className: "absolute top-0 right-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[2px]", style: { background: ac } }), _jsx("div", { className: "absolute top-0 right-0 w-[2px] h-full", style: { background: ac } })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[2px]", style: { background: ac } }), _jsx("div", { className: "absolute bottom-0 left-0 w-[2px] h-full", style: { background: ac } })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-4 h-4 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[2px]", style: { background: ac } }), _jsx("div", { className: "absolute bottom-0 right-0 w-[2px] h-full", style: { background: ac } })] }), _jsxs("div", { className: "relative z-[5] px-5 pt-3 pb-4", children: [_jsxs("div", { className: "flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-2.5", style: { color: `color-mix(in srgb, ${ac} 50%, transparent)` }, children: [_jsx("span", { style: { color: ac, fontSize: "8px" }, children: "\u25C8" }), _jsx("span", { children: "::" }), _jsx("span", { className: "px-1.5 py-[1px]", style: {
                                            color: ac,
                                            background: dimGlow,
                                            border: `1px solid color-mix(in srgb, ${ac} 30%, transparent)`,
                                            borderRadius: "1px",
                                            letterSpacing: "0.2em",
                                        }, children: tag }), _jsx("span", { children: "::" }), _jsx("span", { className: "flex-1 h-[1px]", style: {
                                            background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 25%, transparent), transparent)`,
                                        } }), _jsx("span", { style: { fontSize: "8px", color: `color-mix(in srgb, ${ac} 30%, transparent)` }, children: "\u25C6" })] }), _jsxs("div", { className: "relative", children: [_jsx("p", { className: "text-[13px] font-medium tracking-[0.04em] leading-tight", style: { color: "#d7d8d9" }, children: title }), _jsx("p", { className: "absolute inset-0 text-[13px] font-medium tracking-[0.04em] leading-tight pointer-events-none", style: {
                                            color: ac,
                                            opacity: 0.3,
                                            clipPath: "inset(20% 0 50% 0)",
                                            animation: "ct-glitch 5s infinite",
                                        }, "aria-hidden": "true", children: title })] }), description && (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-16 h-[1px] mt-2 mb-1.5", style: {
                                            background: `linear-gradient(90deg, color-mix(in srgb, ${ac} 35%, transparent), transparent)`,
                                        } }), _jsx("p", { className: "text-[11px] leading-relaxed tracking-[0.02em]", style: { color: "color-mix(in srgb, #d7d8d9 45%, transparent)" }, children: description })] })), (action || onDismiss) && (_jsxs("div", { className: "flex items-center gap-2 mt-3", children: [action && (_jsx("button", { type: "button", onClick: action.onClick, className: "group/btn relative cursor-pointer select-none", style: {
                                            background: dimGlow,
                                            border: `1px solid color-mix(in srgb, ${ac} 40%, transparent)`,
                                            borderRadius: "2px",
                                            padding: "4px 12px",
                                            color: ac,
                                            fontSize: "10px",
                                            letterSpacing: "0.15em",
                                            textTransform: "uppercase",
                                            transition: "all 0.2s ease",
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.background = midGlow;
                                            e.currentTarget.style.borderColor = ac;
                                            e.currentTarget.style.boxShadow = `0 0 12px ${dimGlow}, 0 0 4px ${dimGlow}`;
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.background = dimGlow;
                                            e.currentTarget.style.borderColor = `color-mix(in srgb, ${ac} 40%, transparent)`;
                                            e.currentTarget.style.boxShadow = "none";
                                        }, children: _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { style: { fontSize: "7px" }, children: "\u25C8" }), action.label] }) })), onDismiss && (_jsx("button", { type: "button", onClick: onDismiss, className: "cursor-pointer", style: {
                                            background: "transparent",
                                            border: `1px solid color-mix(in srgb, #d7d8d9 15%, transparent)`,
                                            borderRadius: "2px",
                                            padding: "4px 10px",
                                            color: "color-mix(in srgb, #d7d8d9 40%, transparent)",
                                            fontSize: "10px",
                                            letterSpacing: "0.1em",
                                            textTransform: "uppercase",
                                            transition: "all 0.2s ease",
                                        }, onMouseEnter: (e) => {
                                            e.currentTarget.style.borderColor = "color-mix(in srgb, #d7d8d9 30%, transparent)";
                                            e.currentTarget.style.color = "color-mix(in srgb, #d7d8d9 60%, transparent)";
                                        }, onMouseLeave: (e) => {
                                            e.currentTarget.style.borderColor = "color-mix(in srgb, #d7d8d9 15%, transparent)";
                                            e.currentTarget.style.color = "color-mix(in srgb, #d7d8d9 40%, transparent)";
                                        }, children: "Dismiss" }))] }))] }), _jsx("div", { className: "absolute top-3 right-3 flex flex-col gap-[3px] z-[5]", children: [7, 12, 5, 9, 4, 8, 6].map((w, i) => (_jsx("div", { className: "h-[1.5px] rounded-full", style: {
                                width: `${w}px`,
                                marginLeft: "auto",
                                backgroundColor: `color-mix(in srgb, ${ac} ${20 + i * 5}%, transparent)`,
                                animation: `ct-flicker ${1.5 + i * 0.4}s ease-in-out infinite`,
                                animationDelay: `${i * 0.15}s`,
                            } }, i))) }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[2px] z-[4]", children: _jsx("div", { className: "h-full", style: {
                                background: `linear-gradient(90deg, ${ac}, color-mix(in srgb, ${ac} 40%, transparent))`,
                                animation: "ct-progress 3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                                animationDelay: "0.1s",
                                width: "0%",
                                boxShadow: `0 0 8px ${glow}`,
                            } }) })] }), _jsx("style", { children: `
        @keyframes ct-scan {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes ct-glitch {
          0%, 100% { transform: translate(0); opacity: 0; }
          8%       { transform: translate(-2px, 0); opacity: 0.4; }
          10%      { transform: translate(3px, 0); opacity: 0.3; }
          12%      { transform: translate(0); opacity: 0; }
          48%      { transform: translate(0); opacity: 0; }
          50%      { transform: translate(2px, -1px); opacity: 0.35; }
          52%      { transform: translate(-1px, 1px); opacity: 0.25; }
          54%      { transform: translate(0); opacity: 0; }
        }

        @keyframes ct-flicker {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.9; }
        }

        @keyframes ct-progress {
          to { width: 100%; }
        }
      ` })] }));
}
