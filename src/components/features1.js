import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
/**
 * WordShiftOnScroll (band-highlight version)
 * - Evidenzia ciascuna parola SOLO quando il suo centro verticale
 *   cade nella fascia compresa tra il 50% e il 70% dell'altezza viewport.
 * - In quel range: shift a destra + colore scuro. Fuori: torna grigio e x=0.
 */
export default function WordShiftOnScroll({ words = ["Master", "Your", "Macro", "Like", "Pro"], band = { min: 0.5, max: 0.7 }, // 50% – 70% della viewport
 }) {
    return (_jsx("section", { className: "w-full py-24 md:py-40 flex flex-col gap-14 md:gap-20", "aria-label": "Animated headline words", children: words.slice(0, 5).map((w, i) => (_jsx(BandAwareWord, { index: i, word: w, band: band }, w + i))) }));
}
function BandAwareWord({ word, index, band }) {
    const ref = useRef(null);
    const [active, setActive] = useState(false);
    // Prepara i colori come rgb per interpolazione fluida
    const initialColor = "rgb(209,213,219)"; // gray-300
    const finalColor = "rgb(10,10,10)"; // quasi nero
    const handleScroll = useMemo(() => {
        const minY = band.min; // 0.5
        const maxY = band.max; // 0.7
        return () => {
            const el = ref.current;
            if (!el)
                return;
            const rect = el.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2; // centro dell'elemento rispetto al viewport
            const vh = window.innerHeight || document.documentElement.clientHeight;
            const lower = vh * minY;
            const upper = vh * maxY;
            const isActive = centerY >= lower && centerY <= upper;
            setActive(isActive);
        };
    }, [band.min, band.max]);
    useEffect(() => {
        // Primo calcolo e listener
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        window.addEventListener("resize", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleScroll);
        };
    }, [handleScroll]);
    return (_jsx("div", { children: _jsx(motion.h2, { ref: ref, 
            // Usiamo `animate` invece di whileInView: controlliamo noi quando è active
            initial: { x: 0, color: initialColor, opacity: 0.9 }, animate: { x: active ? 40 : 0, color: active ? finalColor : initialColor, opacity: 1 }, transition: { type: "spring", stiffness: 140, damping: 18, mass: 0.6 }, className: "font-jetbrains tracking-tight leading-none text-6xl md:text-8xl lg:text-4xl select-none", style: { willChange: "transform, color" }, children: _jsx("span", { className: "text-gray-300 motion-reduce:text-neutral-900 motion-reduce:translate-x-0 inline-block", children: word }) }) }));
}
