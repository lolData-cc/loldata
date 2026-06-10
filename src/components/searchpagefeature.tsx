'use client';
import React, { useEffect, useRef, useState, Children, isValidElement, cloneElement } from "react";
import { Separator } from "./ui/separator";
import { Sword, BarChart3, Clock, Brain, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import SearchDialogMock from "@/components/searchdialogmock";

// Brand easing — shared with hero / search dialog / Learn / Jax so
// this section's reveals slot into the site's motion vocabulary.
const SPF_EASE_BRAND = [0.22, 1, 0.36, 1] as const;

/* ===== utils: animazioni ===== */
function useActivateAt30pct<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);
    const [hasActivated, setHasActivated] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || hasActivated) return;

        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        setHasActivated(true);
                        io.unobserve(el);
                    }
                }
            },
            { root: null, threshold: 0, rootMargin: "-50% 0px -100% 0px" }
        );

        io.observe(el);
        return () => io.disconnect();
    }, [hasActivated]);

    return { ref, hasActivated };
}

function AnimatedSection({ children }: { children: React.ReactNode }) {
    const { ref, hasActivated } = useActivateAt30pct<HTMLElement>();
    return (
        <section
            ref={ref}
            data-activated={hasActivated}
            className="
        group transition-all duration-700 ease-in-out
        text-gray-500 translate-x-0 translate-y-0
        will-change:transform, color
        motion-reduce:transition-none
        data-[activated=true]:-translate-x-[6px]
        data-[activated=true]:-translate-y-[6px]
        text-md
      "
        >
            {children}
        </section>
    );
}

function Stagger({
    children,
    step = 500,
    from = 0,
}: {
    children: React.ReactNode;
    step?: number;
    from?: number;
}) {
    const items = Children.toArray(children);
    return (
        <>
            {items.map((child, i) => {
                if (!isValidElement(child)) return child;
                const el = child as React.ReactElement<any>;
                const delay = `${from + i * step}ms`;
                const style: React.CSSProperties & Record<string, string> = {
                    ...(el.props?.style ?? {}),
                    transitionDelay: delay,
                    ["--sd"]: delay,
                };
                const cls = (el.props?.className ?? "") + " transition-all duration-700 ease-out";
                return cloneElement(el, { style, className: cls });
            })}
        </>
    );
}

/* ===== pin logic: fixed tra Y e poi absolute nello stesso punto ===== */
function usePinThenAbsoluteInside(
    targetRef: React.RefObject<HTMLElement>,
    containerRef: React.RefObject<HTMLElement>,
    startY: number,
    endY: number
) {
    type Phase = 'before' | 'pin' | 'after';
    const [phase, setPhase] = useState<Phase>('before');
    const fixedLeftRef = useRef<number | null>(null);
    const absPosRef = useRef<{ left: number; top: number } | null>(null);
    const prevPhaseRef = useRef<Phase>('before');

    useEffect(() => {
        const onScroll = () => {
            const y = window.scrollY || document.documentElement.scrollTop || 0;
            const next: Phase = y < startY ? 'before' : y < endY ? 'pin' : 'after';

            const el = targetRef.current as HTMLElement | null;
            const container = containerRef.current as HTMLElement | null;

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
    const YC_START = 3200;     // <- REGOLA
    const YC_END = 3600;     // <- REGOLA

    // Offset verticale mentre sono "pin" (fixed)
    const PIN_TOP_PROFILE = 96;
    const PIN_TOP_CHAMPION = 96;

    // Label overlay posizione
    const FIXED_LABEL_LEFT = '50.4vw';
    const FIXED_LABEL_TOP = '15px';

    const containerRef = useRef<HTMLDivElement>(null);

    // PROFILE image ghost + pin
    const profileImgRef = useRef<HTMLImageElement>(null);
    const prof = usePinThenAbsoluteInside(
        profileImgRef as React.RefObject<HTMLElement>,
        containerRef as React.RefObject<HTMLElement>,
        YP_START,
        YP_END
    );

    // CHAMPION image ghost + pin (immagine da aggiungere poi)
    const champImgRef = useRef<HTMLImageElement>(null);
    const champ = usePinThenAbsoluteInside(
        champImgRef as React.RefObject<HTMLElement>,
        containerRef as React.RefObject<HTMLElement>,
        YC_START,
        YC_END
    );

    // Overlay label: priorità CHAMP se entrambi pin (non dovrebbero sovrapporsi, ma per sicurezza)
    const overlay =
        champ.phase === 'pin' ? 'CHAMPION PAGE'
            : prof.phase === 'pin' ? 'PROFILE PAGE'
                : null;

    return (
        <div className="relative">
            {/* Ambient backdrop — same faint dot-grid signature used in
                the Learn section, kept at low opacity (5%) so it
                reads as atmosphere rather than texture. Sits behind
                everything; pointer-events-none so it never catches
                a click. */}
            <div
                aria-hidden
                className="
                    absolute inset-x-0 top-0 h-[2400px] -z-10
                    pointer-events-none opacity-[0.05]
                    [background-image:radial-gradient(rgba(0,217,146,0.6)_1px,transparent_1px)]
                    [background-size:24px_24px]
                    [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]
                    [-webkit-mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_75%)]
                "
            />

            {/* Header row — Katarina splash + section title. Both
                animate on view: the title slides up from the right
                while the splash rises from below with a slight scale
                so it feels like she's stepping into frame. */}
            <SearchFeatureHeader />

            <Separator className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" />

            {/* ── Desktop: scroll-pin layout ── */}
            <div ref={containerRef} className="hidden md:flex justify-between px-6 lg:px-24 relative">
                <motion.div
                    className="flex flex-col items-center h-[1000px] pt-6"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 1.1, ease: SPF_EASE_BRAND, delay: 0.15 }}
                >
                    {Array.from({ length: lineLength }).map((_, i) => {
                        const opacity = 1 - i / lineLength;
                        return (
                            <span key={i} style={{ opacity }} className="text-flash/30 select-none">
                                @
                            </span>
                        );
                    })}
                </motion.div>

                {/* ===== PROFILE PAGE: ghost image che definisce posizione/dimensione ===== */}
                <img
                    ref={profileImgRef}
                    src="/img/irelia 1.png"
                    alt=""
                    aria-hidden="true"
                    className={`
            ${prof.phase === 'before' ? 'absolute left-32 mt-8 z-0'
                            : prof.phase === 'pin' ? 'fixed z-0'
                                : 'absolute z-0'}
            w-[475px] h-[267px] select-none pointer-events-none opacity-0
          `}
                    style={
                        prof.phase === 'pin'
                            ? { left: prof.fixedLeftPx != null ? `${prof.fixedLeftPx}px` : undefined, top: `${PIN_TOP_PROFILE}px` }
                            : prof.phase === 'after'
                                ? { left: prof.afterLeftPx != null ? `${prof.afterLeftPx}px` : undefined, top: prof.afterTopPx != null ? `${prof.afterTopPx}px` : undefined }
                                : undefined
                    }
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                />
                <SearchDialogMock
                    attachRef={profileImgRef}
                    cursorSrc="/cursors/base.svg"
                    cursorClickerSrc="/cursors/clicker.svg"
                    cursorSize={32}
                    cursorHotspot={{ x: 8, y: 8 }}
                    zIndex={40}
                />

                <img
                    ref={champImgRef}
                    src="/img/placeholder.png"   /* sostituisci con l'immagine campione quando pronta */
                    alt=""
                    aria-hidden="true"
                    className={`
            ${champ.phase === 'before' ? 'absolute left-32 mt-8 z-0'
                            : champ.phase === 'pin' ? 'fixed z-0'
                                : 'absolute z-0'}
            w-[475px] h-[267px] select-none pointer-events-none opacity-0
          `}
                    style={
                        champ.phase === 'pin'
                            ? { left: champ.fixedLeftPx != null ? `${champ.fixedLeftPx}px` : undefined, top: `${PIN_TOP_CHAMPION}px` }
                            : champ.phase === 'after'
                                ? { left: champ.afterLeftPx != null ? `${champ.afterLeftPx}px` : undefined, top: champ.afterTopPx != null ? `${champ.afterTopPx}px` : undefined }
                                : undefined
                    }
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                />
                {/* se vuoi un overlay anche per il champion, collega qui il tuo componente/immagine reale */}
                {/* <SearchDialogMock attachRef={champImgRef} ... /> */}

                {/* ===== colonna destra ===== */}
                <div className="relative left-[50%] w-[50%] pt-5 space-y-12 text-sm px-4 lg:px-8 font-geist">
                    {/* Heading nel flow: nascondi quando il relativo pin è attivo.
                        Now has a small jade accent line drawn under it on
                        view, so it reads as a deliberate section break. */}
                    <SectionLabel
                        label="PROFILE PAGE"
                        invisible={prof.phase === 'pin'}
                    />

                    {/* Overlay label — fades in and out instead of
                        snap-swapping when the pin phase changes. */}
                    <AnimatePresence>
                        {overlay && (
                            <motion.div
                                key={overlay}
                                className="fixed z-30 font-geist tracking-wide text-sm w-[27%] bg-[#010202] pt-3.5 pb-3 border-b border-flash/10 px-8"
                                style={{ left: FIXED_LABEL_LEFT, top: FIXED_LABEL_TOP }}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.32, ease: SPF_EASE_BRAND }}
                            >
                                {overlay}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            The profile page isn’t just about results — it’s about telling <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">the full story of how you play.</span> Every match is tracked and displayed with clarity, giving you a complete view of your journey and progress.
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Winrate becomes <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">more than just a number</span>. It’s a way to understand your performance over time, with trends and insights that show whether you’re improving, plateauing, or need to <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">adjust your strategy.</span>
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div className="space-y-4">
                            <Stagger step={500}>
                                <p className="transition-colors duration-700 text-gray-500 group-data-[activated=true]:text-white " style={{ transitionDelay: 'var(--sd)' }}>
                                    Each game is broken down in detail. Timelines, runes, damage, builds — every element is captured so you can dive deep into what worked and what didn’t.
                                </p>

                                <div className="flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1 pt-3" style={{ transitionDelay: 'var(--sd)' }}>
                                    <Sword className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade" aria-hidden style={{ transitionDelay: 'var(--sd)' }} />
                                    <span className="uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold" style={{ transitionDelay: 'var(--sd)' }}>
                                        BUILD ANALYSIS
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1" style={{ transitionDelay: 'var(--sd)' }}>
                                    <BarChart3 className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade" aria-hidden style={{ transitionDelay: 'var(--sd)' }} />
                                    <span className="uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold" style={{ transitionDelay: 'var(--sd)' }}>
                                        ITEMS AND RUNES
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1" style={{ transitionDelay: 'var(--sd)' }}>
                                    <Clock className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade" aria-hidden style={{ transitionDelay: 'var(--sd)' }} />
                                    <span className="uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold" style={{ transitionDelay: 'var(--sd)' }}>
                                        EVENTS TIMELINE
                                    </span>
                                </div>
                            </Stagger>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Most importantly, the page highlights the turning points. When you shine, it shows. When mistakes cost you, they stand out too — so you can learn, adapt, and <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">raise your game</span>.
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div className="flex h-full gap-4">
                            <div className="w-3 bg-jade/20 group-data-[activated=true]:bg-jade/80" />
                            <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                                Most importantly, the page highlights the turning points. When you shine, it shows. When mistakes cost you, they stand out too — so you can learn, adapt, and <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">raise your game</span>.
                            </p>
                        </div>
                    </AnimatedSection>

                    {/* ======== INIZIO SEZIONE CHAMPION PAGE ======== */}
                    <SectionLabel
                        label="CHAMPION PAGE"
                        invisible={champ.phase === 'pin'}
                        className="pt-24"
                    />

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Every champion isn’t just stats on a page — it’s a <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">story waiting to be explored.</span> From their lore to their abilities, you’ll find everything that defines who they are and how they play.
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Current patch performance is <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">tracked in real time</span>. See how strong a champion really is right now, and understand their power level as the meta evolves.
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div className="flex h-full gap-4">
                            <div className="w-3 bg-jade/20 group-data-[activated=true]:bg-jade/80" />
                            <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                                Want to learn from the best? The page highlights <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">pro players in action</span>. Watch their games, study their choices, and bring pro-level insights into your own matches.
                            </p>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <div className="space-y-4">
                            <Stagger step={500}>
                                <p className="transition-colors duration-700 text-gray-500 group-data-[activated=true]:text-white " style={{ transitionDelay: 'var(--sd)' }}>
                                    Matchups aren’t left to guesswork. Detailed winrates and trends are paired with <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">AI-powered matchup insights</span>, so you know exactly what to expect in lane and beyond.
                                </p>

                                <div className="flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1 pt-3" style={{ transitionDelay: 'var(--sd)' }}>
                                    <BarChart3 className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade" aria-hidden style={{ transitionDelay: 'var(--sd)' }} />
                                    <span className="uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold" style={{ transitionDelay: 'var(--sd)' }}>
                                        MATCHUP STATS
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-gray-500 group-data-[activated=true]:-translate-y-1" style={{ transitionDelay: 'var(--sd)' }}>
                                    <Brain className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade" aria-hidden style={{ transitionDelay: 'var(--sd)' }} />
                                    <span className="uppercase text-xs tracking-wide transition-colors duration-700 opacity-80 group-data-[activated=true]:opacity-100 group-data-[activated=true]:text-flash font-semibold" style={{ transitionDelay: 'var(--sd)' }}>
                                        AI ANALYSIS
                                    </span>
                                </div>
                            </Stagger>
                        </div>
                    </AnimatedSection>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Items and builds are more than recommendations — they’re a <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">blueprint for success.</span> See what works best, adapt to the situation, and bring every advantage into your games.
                        </p>
                    </AnimatedSection>

                    {/* ======== FINE SEZIONE CHAMPION PAGE ======== */}
                </div>

                <div className="relative w-[50%] h-[1000px] ml-auto">
                    <Separator
                        className="
              w-[100%]
              h-[1500px]
              border-x border-transparent
              [border-image-slice:1]
              [border-image-source:linear-gradient(to_bottom,currentColor,transparent)]
              text-flash/20
            "
                    />
                </div>
            </div>

            {/* ── Mobile: simplified text layout with on-view reveals ──
                Each block fades up as it enters the viewport, with
                its own internal stagger across paragraphs + icon
                labels. Matches the desktop choreography rhythm. */}
            <div className="md:hidden px-4 py-8 space-y-10 font-geist text-sm">
                <MobileFeatureBlock
                    label="Profile Page"
                    paragraphs={[
                        "The profile page tells the full story of how you play. Every match is tracked with clarity, giving you a complete view of your journey.",
                        "Each game is broken down in detail — timelines, runes, damage, builds — so you can dive deep into what worked and what didn't.",
                    ]}
                    bullets={[
                        { icon: Sword, label: "Build Analysis" },
                        { icon: BarChart3, label: "Items and Runes" },
                        { icon: Clock, label: "Events Timeline" },
                    ]}
                />

                <Separator className="bg-flash/10" />

                <MobileFeatureBlock
                    label="Champion Page"
                    paragraphs={[
                        "Every champion is a story waiting to be explored. Current patch performance is tracked in real time so you understand their power level as the meta evolves.",
                        "Matchups aren't left to guesswork — detailed winrates are paired with AI-powered insights so you know exactly what to expect.",
                    ]}
                    bullets={[
                        { icon: BarChart3, label: "Matchup Stats" },
                        { icon: Brain, label: "AI Analysis" },
                    ]}
                />
            </div>
        </div>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────

/**
 * Header for the section: Katarina splash + section title.
 * Both animate in on view — title slides from the right, splash
 * rises with a slight scale so it reads as walking into frame.
 */
function SearchFeatureHeader() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.3 });

    return (
        <div
            ref={ref}
            className="flex flex-col-reverse md:flex-row justify-between items-center md:items-end gap-4 md:space-x-24"
        >
            <motion.img
                src="/img/katarina.png"
                className="w-[60%] md:w-[45%]"
                initial={{ opacity: 0, y: 24, scale: 1.04 }}
                animate={
                    inView
                        ? { opacity: 1, y: 0, scale: 1 }
                        : { opacity: 0, y: 24, scale: 1.04 }
                }
                transition={{ duration: 0.85, ease: SPF_EASE_BRAND }}
                draggable={false}
            />
            <motion.span
                className="text-2xl md:text-4xl text-jade py-6 font-scifi text-center md:text-right"
                initial={{ opacity: 0, x: 24 }}
                animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }}
                transition={{ duration: 0.7, ease: SPF_EASE_BRAND, delay: 0.15 }}
            >
                Detail page functionalities
            </motion.span>
        </div>
    );
}

/**
 * "PROFILE PAGE" / "CHAMPION PAGE" inline labels. Adds a small jade
 * accent line that draws in beneath the text when it scrolls into
 * view, so each label reads as a deliberate section break rather
 * than just an inline string.
 */
function SectionLabel({
    label,
    invisible,
    className = "",
}: {
    label: string;
    invisible: boolean;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });

    return (
        <div
            ref={ref}
            className={`${invisible ? "invisible" : ""} ${className}`}
        >
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.55, ease: SPF_EASE_BRAND }}
                className="flex items-center gap-3"
            >
                <span>{label}</span>
                <motion.span
                    aria-hidden
                    className="h-[1px] w-20 origin-left"
                    style={{
                        background:
                            "linear-gradient(90deg, rgba(0,217,146,0.7), transparent)",
                    }}
                    initial={{ scaleX: 0 }}
                    animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{
                        duration: 0.65,
                        ease: SPF_EASE_BRAND,
                        delay: 0.2,
                    }}
                />
            </motion.div>
        </div>
    );
}

/**
 * One mobile feature block — animates on view with a paragraph
 * stagger and bullet cascade. Mirrors the desktop choreography so
 * the two layouts read as the same component, not two designs.
 */
function MobileFeatureBlock({
    label,
    paragraphs,
    bullets,
}: {
    label: string;
    paragraphs: string[];
    bullets: { icon: LucideIcon; label: string }[];
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.35 });

    return (
        <motion.div
            ref={ref}
            className="space-y-4"
            initial="hidden"
            animate={inView ? "show" : "hidden"}
            variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
            }}
        >
            <motion.p
                className="text-flash/40 uppercase text-xs tracking-wider font-jetbrains flex items-center gap-3"
                variants={{
                    hidden: { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: SPF_EASE_BRAND } },
                }}
            >
                <span>{label}</span>
                <span
                    aria-hidden
                    className="h-[1px] flex-1"
                    style={{
                        background:
                            "linear-gradient(90deg, rgba(0,217,146,0.55), transparent)",
                    }}
                />
            </motion.p>

            {paragraphs.map((p, i) => (
                <motion.p
                    key={i}
                    className="text-flash/80"
                    variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: SPF_EASE_BRAND } },
                    }}
                >
                    {p}
                </motion.p>
            ))}

            <motion.div
                className="space-y-2 text-flash/50"
                variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
                }}
            >
                {bullets.map(({ icon: Icon, label }, i) => (
                    <motion.div
                        key={i}
                        className="flex items-center gap-2"
                        variants={{
                            hidden: { opacity: 0, x: -8 },
                            show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: SPF_EASE_BRAND } },
                        }}
                    >
                        <Icon className="w-4 h-4 text-jade" />
                        <span className="uppercase text-xs tracking-wide">{label}</span>
                    </motion.div>
                ))}
            </motion.div>
        </motion.div>
    );
}
