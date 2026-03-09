'use client';
import React, { useEffect, useRef, useState, Children, isValidElement, cloneElement } from "react";
import { Separator } from "./ui/separator";
import { Sword, BarChart3, Clock, Brain } from "lucide-react";
import SearchDialogMock from "@/components/searchdialogmock";

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
        <div>
            <div className="flex justify-between items-end space-x-24">
                <img src="/img/katarina.png" className="w-[45%]"/>
                <span className="text-4xl text-jade py-6 font-scifi"> Detail page functionalities </span>
            </div>

            <Separator className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t border-flash/20" />

            {/* wrapper relativo per i freeze absolute */}
            <div ref={containerRef} className="flex justify-between px-24 relative">
                <div className="flex flex-col items-center h-[1000px] pt-6">
                    {Array.from({ length: lineLength }).map((_, i) => {
                        const opacity = 1 - i / lineLength;
                        return (
                            <span key={i} style={{ opacity }} className="text-flash/30 select-none">
                                @
                            </span>
                        );
                    })}
                </div>

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
                <div className=" relative left-[50%] w-[50%] pt-5 space-y-12 text-sm px-8 font-geist">
                    {/* Heading nel flow: nascondi quando il relativo pin è attivo */}
                    <div className={`${prof.phase === 'pin' ? 'invisible' : ''}`}> PROFILE PAGE </div>

                    {/* Overlay label: priorità champion, poi profile */}
                    {overlay && (
                        <div
                            className="fixed z-30 font-geist tracking-wide text-sm w-[27%] bg-[#010202] pt-3.5 pb-3 border-b border-flash/10 px-8"
                            style={{ left: FIXED_LABEL_LEFT, top: FIXED_LABEL_TOP }}
                        >
                            {overlay}
                        </div>
                    )}

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
                    <div className={`${champ.phase === 'pin' ? 'invisible' : ''} pt-24`}> CHAMPION PAGE </div>

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
        </div>
    );
}
