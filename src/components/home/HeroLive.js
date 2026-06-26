"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// HeroLive — the homepage hero. The visual IS the statement: a champion
// re-materialised as a slowly-rotating cloud of glowing points (GPU/WebGL,
// degrades to a flat splash without it). Solid #040A0C throughout — no tint.
// The copy stays minimal and bold; search is the door in.
import { motion } from "framer-motion";
import { Search, ArrowDown } from "lucide-react";
import { PointCloudStatue } from "./PointCloudStatue";
const EASE_BRAND = [0.22, 1, 0.36, 1];
function openSearch() {
    window.dispatchEvent(new Event("open-search-dialog"));
}
export function HeroLive({ onExplore }) {
    const reveal = (delay) => ({
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay, ease: EASE_BRAND },
    });
    return (_jsx("div", { className: "relative w-full", children: _jsxs("section", { className: "relative w-screen left-1/2 -translate-x-1/2 min-h-[100dvh] overflow-hidden bg-[#040A0C]", children: [_jsx("div", { className: "absolute inset-y-0 right-0 w-full md:w-[80%] lg:w-[78%] z-0", children: _jsx(PointCloudStatue, { src: "/models/mercenary_katarina.glb", fallbackImg: "/img/Yasuo.png", className: "h-full w-full" }) }), _jsx("div", { className: "absolute inset-0 z-[1] pointer-events-none", style: {
                        background: "linear-gradient(90deg, #040A0C 30%, rgba(4,10,12,0.86) 46%, rgba(4,10,12,0.30) 66%, rgba(4,10,12,0) 100%)",
                    } }), _jsx("div", { className: "absolute inset-x-0 bottom-0 h-40 z-[1] pointer-events-none", style: { background: "linear-gradient(180deg, transparent, #040A0C)" } }), _jsx("div", { className: "relative z-10 min-h-[100dvh] -mt-[64px] flex items-center", children: _jsx("div", { className: "w-full max-w-[1240px] mx-auto px-6 md:px-10", children: _jsxs("div", { className: "max-w-[600px]", children: [_jsxs(motion.div, { ...reveal(0.05), className: "flex items-center gap-2.5 mb-5", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-jade", style: { boxShadow: "0 0 8px #00d992" } }), _jsx("span", { className: "font-chakrapetch text-[11px] font-bold uppercase tracking-[0.34em] text-jade/80", children: "The Rift, quantified" })] }), _jsxs(motion.h1, { ...reveal(0.12), className: "font-chakrapetch font-bold text-flash leading-[0.98] tracking-tight text-[clamp(40px,6.6vw,78px)]", children: ["Every match on the Rift,", " ", _jsx("span", { className: "text-jade", style: { textShadow: "0 0 42px rgba(0,217,146,0.4)" }, children: "decoded" }), "."] }), _jsx(motion.p, { ...reveal(0.26), className: "mt-6 max-w-[460px] text-[15px] md:text-[16px] leading-relaxed text-flash/55", children: "Builds, matchups and ranks distilled from millions of real games. Look up any summoner, or explore the data yourself." }), _jsxs(motion.div, { ...reveal(0.38), className: "mt-8 w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3", children: [_jsxs("button", { onClick: openSearch, className: "group flex items-center gap-3 sm:flex-1 h-[52px] px-4 rounded-2xl bg-flash/[0.04] ring-1 ring-inset ring-jade/15 cursor-clicker transition-all duration-300 ease-out hover:bg-flash/[0.06] hover:ring-jade/40", children: [_jsx(Search, { size: 17, className: "shrink-0 text-flash/40 transition-colors duration-300 group-hover:text-jade" }), _jsx("span", { className: "flex-1 text-left font-chakrapetch text-[14px] text-flash/45 transition-colors duration-300 group-hover:text-flash/70", children: "Search any summoner" }), _jsx("kbd", { className: "shrink-0 grid place-items-center h-6 px-2 rounded-md bg-flash/[0.06] font-chakrapetch text-[11px] text-flash/40", children: "/" })] }), _jsxs("button", { onClick: () => onExplore?.(), className: "group inline-flex shrink-0 items-center justify-center gap-2 sm:w-auto h-[52px] px-5 rounded-2xl ring-1 ring-inset ring-jade/15 cursor-clicker transition-all duration-300 ease-out hover:bg-jade/[0.04] hover:ring-jade/40", children: [_jsx("span", { className: "font-chakrapetch text-[13px] font-medium tracking-wide whitespace-nowrap text-flash/60 transition-colors duration-300 group-hover:text-flash/90", children: "Explore the data" }), _jsx(ArrowDown, { size: 15, className: "text-flash/45 transition-all duration-300 group-hover:translate-y-0.5 group-hover:text-jade" })] })] })] }) }) })] }) }));
}
