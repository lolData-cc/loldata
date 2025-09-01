'use client';
import React, { useEffect, useRef, useState, Children, isValidElement, cloneElement } from "react";
import { Separator } from "./ui/separator";
import { Sword, BarChart3, Clock } from "lucide-react";
import { SearchDialog } from "./searchdialog";
import SearchDialogMock from "@/components/searchdialogmock";
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

/* Stagger: applica ritardo ai figli diretti + espone la var CSS --sd */
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
        // Narrow esplicito a ReactElement<any>
        if (!isValidElement(child)) return child;
        const el = child as React.ReactElement<any>;

        const delay = `${from + i * step}ms`;

        // style: CSSProperties + custom property --sd
        const style: React.CSSProperties & Record<string, string> = {
          ...(el.props?.style ?? {}),
          transitionDelay: delay,
          ["--sd"]: delay,
        };

        const cls =
          (el.props?.className ?? "") + " transition-all duration-700 ease-out";

        return cloneElement(el, { style, className: cls });
      })}
    </>
  );
}




/** Pin tra due Y fisse:
 * before  -> layout originale
 * pin     -> position:fixed (X congelata al rising edge)
 * after   -> position:absolute dentro container `relative`,
 *            con left/top calcolati al falling edge (scorre).
 */
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

export function SearchPageFeature() {
    const lineLength = 40;

    // Range a Y fisse (px)
    const Y_START = 2195;
    const Y_END = 2600;

    // Offset verticale mentre è "pin" (fixed)
    const PIN_TOP = 96; // px

    // Label overlay durante il pin
    const FIXED_LABEL_LEFT = '50.4vw';
    const FIXED_LABEL_TOP = '15px';

    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const { phase, fixedLeftPx, afterLeftPx, afterTopPx } =
        usePinThenAbsoluteInside(imgRef as React.RefObject<HTMLElement>, containerRef as React.RefObject<HTMLElement>, Y_START, Y_END);

    return (
        <div>
            <h1 className="text-4xl text-jade/40 py-6 text-right"> Detail page functionalities </h1>
            <Separator className="relative w-screen border-t border-flash/20 right-[335px]" />

            {/* wrapper relativo per l'absolute finale */}
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

                {/* Immagine: before -> absolute; pin -> fixed (X congelata); after -> absolute nella stessa posizione */}
                <img
                    ref={imgRef}
                    src="/img/irelia 1.png"
                    alt=""
                    aria-hidden="true"
                    className={`
    ${phase === 'before'
                            ? 'absolute left-32 mt-8 z-0'
                            : phase === 'pin'
                                ? 'fixed z-0'
                                : 'absolute z-0'}
    w-[475px] h-[267px] select-none pointer-events-none opacity-0
  `}
                    style={
                        phase === 'pin'
                            ? { left: fixedLeftPx != null ? `${fixedLeftPx}px` : undefined, top: `${PIN_TOP}px` }
                            : phase === 'after'
                                ? { left: afterLeftPx != null ? `${afterLeftPx}px` : undefined, top: afterTopPx != null ? `${afterTopPx}px` : undefined }
                                : undefined
                    }
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                />

                {/* Mock animato che copia posizione/dimensioni dell’immagine “fantasma” */}
                <SearchDialogMock
                    attachRef={imgRef}
                    cursorSrc="/cursors/base.svg"
                    cursorClickerSrc="/cursors/clicker.svg"
                    cursorSize={32}
                    cursorHotspot={{ x: 8, y: 8 }}
                    zIndex={40}
                />

                {/* Colonna destra */}
                <div className=" relative left-[50%] w-[50%] pt-5 space-y-12 text-sm px-8 font-geist">
                    <div className={`${phase === 'pin' ? 'invisible' : ''}`}> PROFILE PAGE </div>

                    {phase === 'pin' && (
                        <div
                            className="fixed z-30 font-geist tracking-wide text-sm w-[27%] bg-[#010202] pt-3.5 pb-3 border-b border-flash/10 px-8"
                            style={{ left: FIXED_LABEL_LEFT, top: FIXED_LABEL_TOP }}
                        >
                            PROFILE PAGE
                        </div>
                    )}

                    {/* Questi paragrafi diventano bianchi come blocco (no stagger per il colore) */}
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

                    {/* Paragrafo con 3 icone, colore del TESTO a stagger */}
                    <AnimatedSection>
                        <div className="space-y-4">
                            <Stagger step={500}>
                                {/* 0) Paragrafo: parte subito (delay 0) */}
                                <p
                                    className="transition-colors duration-700 text-gray-500 group-data-[activated=true]:text-white "
                                    style={{ transitionDelay: 'var(--sd)' }}
                                >
                                    Each game is broken down in detail. Timelines, runes, damage, builds — every element is captured so you can dive deep into what worked and what didn’t.
                                </p>

                                {/* 1) BUILD ANALYSIS */}
                                <div
                                    className="
          flex items-center gap-2 text-gray-500
          group-data-[activated=true]:-translate-y-1 pt-3
        "
                                    style={{ transitionDelay: 'var(--sd)' }}
                                >
                                    <Sword
                                        className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade"
                                        aria-hidden
                                        style={{ transitionDelay: 'var(--sd)' }}
                                    />
                                    <span
                                        className="
            uppercase text-xs tracking-wide
            transition-colors duration-700 opacity-80
            group-data-[activated=true]:opacity-100
           group-data-[activated=true]:text-flash font-semibold
          "
                                        style={{ transitionDelay: 'var(--sd)' }}
                                    >
                                        BUILD ANALYSIS
                                    </span>
                                </div>

                                {/* 2) ITEMS AND RUNES */}
                                <div
                                    className="
          flex items-center gap-2 text-gray-500
          group-data-[activated=true]:-translate-y-1
        "
                                    style={{ transitionDelay: 'var(--sd)' }}
                                >
                                    <BarChart3
                                        className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade"
                                        aria-hidden
                                        style={{ transitionDelay: 'var(--sd)' }}
                                    />
                                    <span
                                        className="
            uppercase text-xs tracking-wide
            transition-colors duration-700 opacity-80
            group-data-[activated=true]:opacity-100
            group-data-[activated=true]:text-flash font-semibold
          "
                                        style={{ transitionDelay: 'var(--sd)' }}
                                    >
                                        ITEMS AND RUNES
                                    </span>
                                </div>

                                {/* 3) EVENTS TIMELINE */}
                                <div
                                    className="
          flex items-center gap-2 text-gray-500
          group-data-[activated=true]:-translate-y-1
        "
                                    style={{ transitionDelay: 'var(--sd)' }}
                                >
                                    <Clock
                                        className="w-4 h-4 transition-colors duration-700 group-data-[activated=true]:text-jade"
                                        aria-hidden
                                        style={{ transitionDelay: 'var(--sd)' }}
                                    />
                                    <span
                                        className="
            uppercase text-xs tracking-wide
            transition-colors duration-700 opacity-80
            group-data-[activated=true]:opacity-100
            group-data-[activated=true]:text-flash font-semibold
          "
                                        style={{ transitionDelay: 'var(--sd)' }}
                                    >
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



                    <div className="pt-24"> CHAMPION PAGE </div>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Lorem Ipsum is simply dummy text of the <span className="transition-colors group-data-[activated=true]:text-jade group-data-[activated=true]:font-semibold">printing</span> and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                        </p>
                    </AnimatedSection>

                    <AnimatedSection>
                        <p className="transition-colors duration-700 group-data-[activated=true]:text-white">
                            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                        </p>
                    </AnimatedSection>
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
