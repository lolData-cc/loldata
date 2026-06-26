import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/areyouwithus.tsx
//
// "Are you with us?" — the membership CTA banner sitting between the
// feature sections and the streamers carousel.
//
// Interaction: clicking "BECOME A MEMBER" no longer navigates to
// /pricing. Instead the Jax CTA slides off-screen to the left while
// the PricingPlans component slides in from the right, in parallel.
// A close button in the pricing panel slides them back.
//
// Image-as-silhouette: areuwithus_2.png already ships with a true
// alpha channel, so the character drops onto the page bg with no
// mask / blend-mode workarounds.
import * as React from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PricingPlans } from "./pricingplans";
const EASE_BRAND = [0.22, 1, 0.36, 1];
// Heights — the membership band, then the taller pricing view. The wrapper
// animates between the two so the page below resettles on swap.
const JAX_HEIGHT_MD = 400;
const PRICING_HEIGHT = 720;
export const Jax = () => {
    const reduceMotion = useReducedMotion();
    const ref = React.useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });
    // Swap state — when true the pricing panel is in view, the Jax
    // CTA is off-screen to the left. The two are mounted concurrently
    // during the slide so the user reads it as a horizontal shift,
    // not a wait-then-mount.
    const [showPricing, setShowPricing] = React.useState(false);
    // ESC key returns to the Jax CTA — small but expected affordance
    // since the swap doesn't change the URL.
    React.useEffect(() => {
        if (!showPricing)
            return;
        const onKey = (e) => {
            if (e.key === "Escape")
                setShowPricing(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [showPricing]);
    return (_jsx(motion.div, { ref: ref, 
        // Transparent panel — page bg shows directly through. The
        // wrapper's height animates between the two panel heights so
        // the page below resettles into the new layout.
        className: "relative bg-transparent w-screen left-1/2 -translate-x-1/2 overflow-hidden", initial: { opacity: 0, height: JAX_HEIGHT_MD }, animate: inView
            ? { opacity: 1, height: showPricing ? PRICING_HEIGHT : JAX_HEIGHT_MD }
            : { opacity: 0, height: JAX_HEIGHT_MD }, transition: { duration: 0.45, ease: EASE_BRAND }, children: _jsxs(AnimatePresence, { initial: false, children: [!showPricing && (_jsx(motion.div, { className: "absolute inset-0 w-full", initial: { x: 0 }, animate: { x: 0 }, 
                    // Slide left and out of the viewport — `vw` keeps the
                    // distance correct on any screen width.
                    exit: { x: "-100vw" }, transition: { duration: 0.45, ease: EASE_BRAND }, children: _jsx(JaxCta, { inView: inView, reduceMotion: reduceMotion, onBecomeMember: () => setShowPricing(true) }) }, "jax")), showPricing && (_jsx(motion.div, { className: "absolute inset-0 w-full", initial: { x: "100vw" }, animate: { x: 0 }, exit: { x: "100vw" }, transition: { duration: 0.45, ease: EASE_BRAND }, children: _jsx(PricingPanel, {}) }, "pricing"))] }) }));
};
// ─── Jax CTA inner content ──────────────────────────────────────────
// Extracted as a sub-component purely for readability — the swap
// orchestration above is busy enough without 100 lines of inline JSX.
function JaxCta({ inView, reduceMotion, onBecomeMember, }) {
    const reveal = (delay) => ({
        initial: { opacity: 0, y: 14 },
        animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
        transition: { duration: 0.6, ease: EASE_BRAND, delay },
    });
    return (_jsxs("div", { className: "relative w-full h-full overflow-hidden", children: [_jsx("div", { "aria-hidden": true, className: "absolute inset-0 z-0 pointer-events-none opacity-[0.06] [background-image:radial-gradient(rgba(0,217,146,0.7)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_24%_60%,black_5%,transparent_68%)] [-webkit-mask-image:radial-gradient(ellipse_at_24%_60%,black_5%,transparent_68%)]" }), _jsx(motion.div, { "aria-hidden": true, className: "absolute inset-0 z-0 pointer-events-none", style: {
                    background: "radial-gradient(ellipse 42% 62% at 22% 62%, rgba(0,217,146,0.18) 0%, transparent 70%)",
                }, animate: reduceMotion ? { opacity: 0.9 } : { opacity: [0.6, 1, 0.6] }, transition: reduceMotion ? undefined : { duration: 8, ease: "easeInOut", repeat: Infinity } }), _jsx(motion.img, { className: "hidden md:block absolute left-[19%] bottom-0 -translate-x-1/2 h-full w-[36%] object-contain object-bottom z-[1] pointer-events-none select-none", alt: "", "aria-hidden": true, src: "/img/areuwithus_2.png", draggable: false, initial: { opacity: 0, x: -24, scale: 1.04 }, animate: inView ? { opacity: 0.92, x: 0, scale: 1 } : { opacity: 0, x: -24, scale: 1.04 }, transition: { duration: 0.9, ease: EASE_BRAND, delay: 0.1 }, style: {
                    filter: "brightness(1.1) saturate(1.08) drop-shadow(0 0 28px rgba(0,217,146,0.3))",
                } }), _jsx("div", { "aria-hidden": true, className: "absolute inset-0 z-[2] pointer-events-none", style: {
                    background: "linear-gradient(90deg, rgba(4,10,12,0.55) 0%, rgba(4,10,12,0.12) 30%, transparent 48%)",
                } }), _jsx("div", { className: "relative z-10 h-full", children: _jsx("div", { className: "mx-auto h-full max-w-[1240px] px-6 md:px-10 flex items-center justify-end", children: _jsxs("div", { className: "flex w-full flex-col items-start text-left md:max-w-[540px] md:items-end md:text-right", children: [_jsxs(motion.div, { ...reveal(0.1), className: "mb-4 flex items-center gap-2.5", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-jade", style: { boxShadow: "0 0 8px #00d992" } }), _jsx("span", { className: "font-chakrapetch text-[11px] font-bold uppercase tracking-[0.34em] text-jade/80", children: "Membership" })] }), _jsxs(motion.h2, { ...reveal(0.18), className: "font-chakrapetch font-bold text-flash leading-[0.98] tracking-tight text-[clamp(34px,5vw,58px)]", children: ["Are you", " ", _jsx("span", { className: "text-jade", style: { textShadow: "0 0 38px rgba(0,217,146,0.4)" }, children: "with us" }), "?"] }), _jsx(motion.p, { ...reveal(0.28), className: "mt-4 max-w-[420px] text-[15px] leading-relaxed text-flash/55", children: "One membership unlocks the AI coach, unlimited scouting and every analytic the Rift can give you \u2014 no limits." }), _jsxs(motion.div, { ...reveal(0.38), className: "mt-7 flex items-center gap-5", children: [_jsxs("button", { onClick: onBecomeMember, className: "group inline-flex items-center gap-2 h-[50px] px-6 rounded-xl bg-jade text-liquirice font-chakrapetch text-[13px] font-bold uppercase tracking-[0.1em] cursor-clicker transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_30px_-6px_rgba(0,217,146,0.6)]", children: ["Become a member", _jsx(ArrowRight, { className: "w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" })] }), _jsx("a", { href: "https://discord.gg/SNjKYbdXzG", target: "_blank", rel: "noreferrer", className: "font-chakrapetch text-[12px] font-bold uppercase tracking-[0.12em] text-flash/55 cursor-clicker transition-colors duration-200 hover:text-flash/90", children: "Contact us" })] })] }) }) })] }));
}
// ─── Pricing panel wrapper ──────────────────────────────────────────
// Re-applies the page's standard width constraint (xl:w-[65%]) which
// the full-bleed Jax wrapper escapes from. PricingPlans renders its
// cards at w-[25%] of its parent — in the rest of the site that
// parent is the 65% page container, so cards are ~16% of viewport.
// Inside the full-bleed Jax wrapper without this re-constraint, the
// cards balloon to 25% of full viewport width. The scoped <style>
// also shrinks the giant `PRICING` title (164px hard-coded inside
// PricingPlans) so it doesn't dwarf the now-smaller cards.
//
// No back/close affordance — the parent ESC handler still works for
// keyboard users, but per design the inline pricing is treated as a
// committed view: the only way back to the Jax CTA is via the URL.
function PricingPanel() {
    return (_jsx("div", { className: "relative w-full h-full overflow-y-auto", children: _jsxs("div", { className: "pricing-inline mx-auto w-full xl:w-[65%] min-[2560px]:w-[55%] xl:px-0 px-4", children: [_jsx("style", { children: `
          .pricing-inline span.font-gtmono {
            font-size: 96px !important;
            line-height: 1 !important;
            height: 5rem !important;
          }
          .pricing-inline .relative.bottom-8 { bottom: 1rem !important; }
        ` }), _jsx(PricingPlans, {})] }) }));
}
