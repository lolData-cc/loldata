'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, Children, isValidElement, cloneElement } from "react";
import { Separator } from "./ui/separator";
import { Sword, BarChart3, Clock, Brain } from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import SearchDialogMock from "@/components/searchdialogmock";
// Brand easing — shared with hero / search dialog / Learn / Jax so
// this section's reveals slot into the site's motion vocabulary.
const SPF_EASE_BRAND = [0.22, 1, 0.36, 1];
/* ===== utils: animazioni ===== */
function useActivateAt30pct() {
    const ref = useRef(null);
    const [hasActivated, setHasActivated] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el || hasActivated)
            return;
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    setHasActivated(true);
                    io.unobserve(el);
                }
            }
        }, { root: null, threshold: 0, rootMargin: "-50% 0px -100% 0px" });
        io.observe(el);
        return () => io.disconnect();
    }, [hasActivated]);
    return { ref, hasActivated };
}
function AnimatedSection({ children }) {
    const { ref, hasActivated } = useActivateAt30pct();
    return (_jsx("section", { ref: ref, "data-activated": hasActivated, className: "\r\n        group transition-all duration-700 ease-in-out\r\n        text-gray-500 translate-x-0 translate-y-0\r\n        will-change:transform, color\r\n        motion-reduce:transition-none\r\n        data-[activated=true]:-translate-x-[6px]\r\n        data-[activated=true]:-translate-y-[6px]\r\n        text-md\r\n      ", children: children }));
}
function Stagger({ children, step = 500, from = 0, }) {
    const items = Children.toArray(children);
    return (_jsx(_Fragment, { children: items.map((child, i) => {
            if (!isValidElement(child))
                return child;
            const el = child;
            const delay = `${from + i * step}ms`;
            const style = {
                ...(el.props?.style ?? {}),
                transitionDelay: delay,
                ["--sd"]: delay,
            };
            const cls = (el.props?.className ?? "") + " transition-all duration-700 ease-out";
            return cloneElement(el, { style, className: cls });
        }) }));
}
/* ===== pin logic: fixed tra Y e poi absolute nello stesso punto ===== */
function usePinThenAbsoluteInside(targetRef, containerRef, startY, endY) {
    const [phase, setPhase] = useState('before');
    const fixedLeftRef = useRef(null);
    const absPosRef = useRef(null);
    const prevPhaseRef = useRef('before');
    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY || document.documentElement.scrollTop || 0;
            const next = y < startY ? 'before' : y < endY ? 'pin' : 'after';
            const el = targetRef.current;
            const container = containerRef.current;
            if (prevPhaseRef.current !== 'pin' && next === 'pin' && el) {
                const r = el.getBoundingClientRect();
                fixedLeftRef.current = r.left;
            }
            if (prevPhaseRef.current === 'pin' && next === 'after' && el && container) {
                const r = el.getBoundingClientRect();
                const cr = container.getBoundingClientRect();
                const left = r.left - cr.left;
                const top = r.top - cr.top;
                absPosRef.current = { left, top };
            }
            prevPhaseRef.current = next;
            setPhase(next);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, [startY, endY, targetRef, containerRef]);
    return {
        phase,
        fixedLeftPx: fixedLeftRef.current,
        afterLeftPx: absPosRef.current?.left ?? null,
        afterTopPx: absPosRef.current?.top ?? null,
    };
}
/* ===== componente ===== */
export function SearchPageFeature() {
    const lineLength = 40;
    /* --- RANGEs A Y FISSE --- */
    // PROFILE PAGE (già funzionante)
    const YP_START = 2285;
    const YP_END = 2800;
    // CHAMPION PAGE (imposta tu questi due valori)
    const YC_START = 3200; // <- REGOLA
    const YC_END = 3600; // <- REGOLA
    // Offset verticale mentre sono "pin" (fixed)
    const PIN_TOP_PROFILE = 96;
    const PIN_TOP_CHAMPION = 96;
    // Label overlay posizione
    const FIXED_LABEL_LEFT = '50.4vw';
    const FIXED_LABEL_TOP = '15px';
    const containerRef = useRef(null);
    // PROFILE image ghost + pin
    const profileImgRef = useRef(null);
    const prof = usePinThenAbsoluteInside(profileImgRef, containerRef, YP_START, YP_END);
    // CHAMPION image ghost + pin (immagine da aggiungere poi)
    const champImgRef = useRef(null);
    const champ = usePinThenAbsoluteInside(champImgRef, containerRef, YC_START, YC_END);
    // Overlay label: priorità CHAMP se entrambi pin (non dovrebbero sovrapporsi, ma per sicurezza)
    const overlay = champ.phase === 'pin' ? 'CHAMPION PAGE'
        : prof.phase === 'pin' ? 'PROFILE PAGE'
            : null;
    return (_jsxs("div", { className: "relative", children: [_jsx("div", { "aria-hidden": true, className: "\r\n                    absolute inset-x-0 top-0 h-[2400px] -z-10\r\n                    pointer-events-none opacity-[0.05]\r\n                    [background-image:radial-gradient(rgba(0,217,146,0.6)_1px,transparent_1px)]\r\n                    [background-size:24px_24px]\r\n                    [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]\r\n                    [-webkit-mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]\r\n                " }), _jsx(SearchFeatureHeader, {}), _jsx(Separator, { className: "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" }), _jsxs("div", { ref: containerRef, className: "hidden md:flex justify-between px-6 lg:px-24 relative", children: [_jsx(motion.div, { className: "flex flex-col items-center h-[1000px] pt-6", initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 1.1, ease: SPF_EASE_BRAND, delay: 0.15 }, children: Array.from({ length: lineLength }).map((_, i) => {
                            const opacity = 1 - i / lineLength;
                            return (_jsx("span", { style: { opacity }, className: "text-flash/30 select-none", children: "@" }, i));
                        }) }), _jsx("img", { ref: profileImgRef, src: "/img/irelia 1.png", alt: "", "aria-hidden": "true", className: `
            ${prof.phase === 'before' ? 'absolute left-32 mt-8 z-0'
                            : prof.phase === 'pin' ? 'fixed z-0'
                                : 'absolute z-0'}
            w-[475px] h-[267px] select-none pointer-events-none opacity-0
          `, style: prof.phase === 'pin'
                            ? { left: prof.fixedLeftPx != null ? `${prof.fixedLeftPx}px` : undefined, top: `${PIN_TOP_PROFILE}px` }
                            : prof.phase === 'after'
                                ? { left: prof.afterLeftPx != null ? `${prof.afterLeftPx}px` : undefined, top: prof.afterTopPx != null ? `${prof.afterTopPx}px` : undefined }
                                : undefined, loading: "lazy", decoding: "async", draggable: false }), _jsx(SearchDialogMock, { attachRef: profileImgRef, cursorSrc: "/cursors/base.svg", cursorClickerSrc: "/cursors/clicker.svg", cursorSize: 32, cursorHotspot: { x: 8, y: 8 }, zIndex: 40 }), _jsx("img", { ref: champImgRef, src: "/img/placeholder.png" /* sostituisci con l'immagine campione quando pronta */, alt: "", "aria-hidden": "true", className: `
            ${champ.phase === 'before' ? 'absolute left-32 mt-8 z-0'
                            : champ.phase === 'pin' ? 'fixed z-0'
                                : 'absolute z-0'}
            w-[475px] h-[267px] select-none pointer-events-none opacity-0
          `, style: champ.phase === 'pin'
                            ? { left: champ.fixedLeftPx != null ? `${champ.fixedLeftPx}px` : undefined, top: `${PIN_TOP_CHAMPION}px` }
                            : champ.phase === 'after'
                                ? { left: champ.afterLeftPx != null ? `${champ.afterLeftPx}px` : undefined, top: champ.afterTopPx != null ? `${champ.afterTopPx}px` : undefined }
                                : undefined, loading: "lazy", decoding: "async", draggable: false }), _jsxs("div", { className: "relative left-[50%] w-[50%] pt-5 space-y-12 text-sm px-4 lg:px-8 font-geist", children: [_jsx(SectionLabel, { label: "PROFILE PAGE", invisible: prof.phase === 'pin' }), _jsx(AnimatePresence, { children: overlay && (_jsx(motion.div, { className: "fixed z-30 font-geist tracking-wide text-sm w-[27%] bg-[#010202] pt-3.5 pb-3 border-b border-flash/10 px-8", style: { left: FIXED_LABEL_LEFT, top: FIXED_LABEL_TOP }, initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.32, ease: SPF_EASE_BRAND }, children: overlay }, overlay)) }), _jsx(AnimatedSection, { children: _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["The profile page isn\u2019t just about results \u2014 it\u2019s about telling ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "the full story of how you play." }), " Every match is tracked and displayed with clarity, giving you a complete view of your journey and progress."] }) }), _jsx(AnimatedSection, { children: _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["Winrate becomes ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "more than just a number" }), ". It\u2019s a way to understand your performance over time, with trends and insights that show whether you\u2019re improving, plateauing, or need to ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "adjust your strategy." })] }) }), _jsx(AnimatedSection, { children: _jsx("div", { className: "space-y-4", children: _jsxs(Stagger, { step: 500, children: [_jsx("p", { className: "transition-colors duration-700 text-gray-500 group-data-[activated=true]:text-white ", style: { transitionDelay: 'var(--sd)' }, children: "Each game is broken down in detail. Timelines, runes, damage, builds \u2014 every element is captured so you can dive deep into what worked and what didn\u2019t." }), _jsxs("div", { className: "flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1 pt-3", style: { transitionDelay: 'var(--sd)' }, children: [_jsx(Sword, { className: "w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade", "aria-hidden": true, style: { transitionDelay: 'var(--sd)' } }), _jsx("span", { className: "uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold", style: { transitionDelay: 'var(--sd)' }, children: "BUILD ANALYSIS" })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1", style: { transitionDelay: 'var(--sd)' }, children: [_jsx(BarChart3, { className: "w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade", "aria-hidden": true, style: { transitionDelay: 'var(--sd)' } }), _jsx("span", { className: "uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold", style: { transitionDelay: 'var(--sd)' }, children: "ITEMS AND RUNES" })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1", style: { transitionDelay: 'var(--sd)' }, children: [_jsx(Clock, { className: "w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade", "aria-hidden": true, style: { transitionDelay: 'var(--sd)' } }), _jsx("span", { className: "uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold", style: { transitionDelay: 'var(--sd)' }, children: "EVENTS TIMELINE" })] })] }) }) }), _jsx(AnimatedSection, { children: _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["Most importantly, the page highlights the turning points. When you shine, it shows. When mistakes cost you, they stand out too \u2014 so you can learn, adapt, and ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "raise your game" }), "."] }) }), _jsx(AnimatedSection, { children: _jsxs("div", { className: "flex h-full gap-4", children: [_jsx("div", { className: "w-3 bg-jade/20 group-data-[activated=true]:bg-jade/80" }), _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["Most importantly, the page highlights the turning points. When you shine, it shows. When mistakes cost you, they stand out too \u2014 so you can learn, adapt, and ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "raise your game" }), "."] })] }) }), _jsx(SectionLabel, { label: "CHAMPION PAGE", invisible: champ.phase === 'pin', className: "pt-24" }), _jsx(AnimatedSection, { children: _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["Every champion isn\u2019t just stats on a page \u2014 it\u2019s a ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "story waiting to be explored." }), " From their lore to their abilities, you\u2019ll find everything that defines who they are and how they play."] }) }), _jsx(AnimatedSection, { children: _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["Current patch performance is ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "tracked in real time" }), ". See how strong a champion really is right now, and understand their power level as the meta evolves."] }) }), _jsx(AnimatedSection, { children: _jsxs("div", { className: "flex h-full gap-4", children: [_jsx("div", { className: "w-3 bg-jade/20 group-data-[activated=true]:bg-jade/80" }), _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["Want to learn from the best? The page highlights ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "pro players in action" }), ". Watch their games, study their choices, and bring pro-level insights into your own matches."] })] }) }), _jsx(AnimatedSection, { children: _jsx("div", { className: "space-y-4", children: _jsxs(Stagger, { step: 500, children: [_jsxs("p", { className: "transition-colors duration-700 text-gray-500 group-data-[activated=true]:text-white ", style: { transitionDelay: 'var(--sd)' }, children: ["Matchups aren\u2019t left to guesswork. Detailed winrates and trends are paired with ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "AI-powered matchup insights" }), ", so you know exactly what to expect in lane and beyond."] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1 pt-3", style: { transitionDelay: 'var(--sd)' }, children: [_jsx(BarChart3, { className: "w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade", "aria-hidden": true, style: { transitionDelay: 'var(--sd)' } }), _jsx("span", { className: "uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold", style: { transitionDelay: 'var(--sd)' }, children: "MATCHUP STATS" })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1", style: { transitionDelay: 'var(--sd)' }, children: [_jsx(Brain, { className: "w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade", "aria-hidden": true, style: { transitionDelay: 'var(--sd)' } }), _jsx("span", { className: "uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold", style: { transitionDelay: 'var(--sd)' }, children: "AI ANALYSIS" })] })] }) }) }), _jsx(AnimatedSection, { children: _jsxs("p", { className: "transition-colors duration-700 group-data-[activated=true]:text-white", children: ["Items and builds are more than recommendations \u2014 they\u2019re a ", _jsx("span", { className: "transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold", children: "blueprint for success." }), " See what works best, adapt to the situation, and bring every advantage into your games."] }) })] }), _jsx("div", { className: "relative w-[50%] h-[1000px] ml-auto", children: _jsx(Separator, { className: "\r\n              w-[100%]\r\n              h-[1500px]\r\n              border-x border-transparent\r\n              [border-image-slice:1]\r\n              [border-image-source:linear-gradient(to_bottom,currentColor,transparent)]\r\n              text-flash/20\r\n            " }) })] }), _jsxs("div", { className: "md:hidden px-4 py-8 space-y-10 font-geist text-sm", children: [_jsx(MobileFeatureBlock, { label: "Profile Page", paragraphs: [
                            "The profile page tells the full story of how you play. Every match is tracked with clarity, giving you a complete view of your journey.",
                            "Each game is broken down in detail — timelines, runes, damage, builds — so you can dive deep into what worked and what didn't.",
                        ], bullets: [
                            { icon: Sword, label: "Build Analysis" },
                            { icon: BarChart3, label: "Items and Runes" },
                            { icon: Clock, label: "Events Timeline" },
                        ] }), _jsx(Separator, { className: "bg-flash/10" }), _jsx(MobileFeatureBlock, { label: "Champion Page", paragraphs: [
                            "Every champion is a story waiting to be explored. Current patch performance is tracked in real time so you understand their power level as the meta evolves.",
                            "Matchups aren't left to guesswork — detailed winrates are paired with AI-powered insights so you know exactly what to expect.",
                        ], bullets: [
                            { icon: BarChart3, label: "Matchup Stats" },
                            { icon: Brain, label: "AI Analysis" },
                        ] })] })] }));
}
// ─── Sub-components ──────────────────────────────────────────────────
/**
 * Header for the section: Katarina splash + section title.
 * Both animate in on view — title slides from the right, splash
 * rises with a slight scale so it reads as walking into frame.
 */
function SearchFeatureHeader() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.3 });
    return (_jsxs("div", { ref: ref, className: "flex flex-col-reverse md:flex-row justify-between items-center md:items-end gap-4 md:space-x-24", children: [_jsx(motion.img, { src: "/img/katarina.png", className: "w-[60%] md:w-[45%]", initial: { opacity: 0, y: 24, scale: 1.04 }, animate: inView
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 0, y: 24, scale: 1.04 }, transition: { duration: 0.85, ease: SPF_EASE_BRAND }, draggable: false }), _jsx(motion.span, { className: "text-2xl md:text-4xl text-jade py-6 font-scifi text-center md:text-right", initial: { opacity: 0, x: 24 }, animate: inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }, transition: { duration: 0.7, ease: SPF_EASE_BRAND, delay: 0.15 }, children: "Detail page functionalities" })] }));
}
/**
 * "PROFILE PAGE" / "CHAMPION PAGE" inline labels. Adds a small jade
 * accent line that draws in beneath the text when it scrolls into
 * view, so each label reads as a deliberate section break rather
 * than just an inline string.
 */
function SectionLabel({ label, invisible, className = "", }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    return (_jsx("div", { ref: ref, className: `${invisible ? "invisible" : ""} ${className}`, children: _jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }, transition: { duration: 0.55, ease: SPF_EASE_BRAND }, className: "flex items-center gap-3", children: [_jsx("span", { children: label }), _jsx(motion.span, { "aria-hidden": true, className: "h-[1px] w-20 origin-left", style: {
                        background: "linear-gradient(90deg, rgba(0,217,146,0.7), transparent)",
                    }, initial: { scaleX: 0 }, animate: inView ? { scaleX: 1 } : { scaleX: 0 }, transition: {
                        duration: 0.65,
                        ease: SPF_EASE_BRAND,
                        delay: 0.2,
                    } })] }) }));
}
/**
 * One mobile feature block — animates on view with a paragraph
 * stagger and bullet cascade. Mirrors the desktop choreography so
 * the two layouts read as the same component, not two designs.
 */
function MobileFeatureBlock({ label, paragraphs, bullets, }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.35 });
    return (_jsxs(motion.div, { ref: ref, className: "space-y-4", initial: "hidden", animate: inView ? "show" : "hidden", variants: {
            hidden: {},
            show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
        }, children: [_jsxs(motion.p, { className: "text-flash/40 uppercase text-xs tracking-wider font-jetbrains flex items-center gap-3", variants: {
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: SPF_EASE_BRAND } },
                }, children: [_jsx("span", { children: label }), _jsx("span", { "aria-hidden": true, className: "h-[1px] flex-1", style: {
                            background: "linear-gradient(90deg, rgba(0,217,146,0.55), transparent)",
                        } })] }), paragraphs.map((p, i) => (_jsx(motion.p, { className: "text-flash/80", variants: {
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: SPF_EASE_BRAND } },
                }, children: p }, i))), _jsx(motion.div, { className: "space-y-2 text-flash/50", variants: {
                    hidden: {},
                    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
                }, children: bullets.map(({ icon: Icon, label }, i) => (_jsxs(motion.div, { className: "flex items-center gap-2", variants: {
                        hidden: { opacity: 0, x: -8 },
                        show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: SPF_EASE_BRAND } },
                    }, children: [_jsx(Icon, { className: "w-4 h-4 text-jade" }), _jsx("span", { className: "uppercase text-xs tracking-wide", children: label })] }, i))) })] }));
}
