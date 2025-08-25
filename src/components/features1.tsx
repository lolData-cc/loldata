import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Divide } from "lucide-react";

/**
 * WordShiftOnScroll (band-highlight version)
 * - Evidenzia ciascuna parola SOLO quando il suo centro verticale
 *   cade nella fascia compresa tra il 50% e il 70% dell'altezza viewport.
 * - In quel range: shift a destra + colore scuro. Fuori: torna grigio e x=0.
 */
export default function WordShiftOnScroll({
  words = ["Master", "Your", "Macro", "Like", "Pro"],
  band = { min: 0.5, max: 0.7 }, // 50% – 70% della viewport
}: {
  words?: string[];
  band?: { min: number; max: number };
}) {
  return (
    <section className="w-full py-24 md:py-40 flex flex-col gap-14 md:gap-20" aria-label="Animated headline words">
      {words.slice(0, 5).map((w, i) => (
        <BandAwareWord key={w + i} index={i} word={w} band={band} />
      ))}
    </section>
  );
}

function BandAwareWord({ word, index, band }: { word: string; index: number; band: { min: number; max: number } }) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const [active, setActive] = useState(false);

  // Prepara i colori come rgb per interpolazione fluida
  const initialColor = "rgb(209,213,219)"; // gray-300
  const finalColor = "rgb(10,10,10)"; // quasi nero

  const handleScroll = useMemo(() => {
    const minY = band.min; // 0.5
    const maxY = band.max; // 0.7
    return () => {
      const el = ref.current;
      if (!el) return;
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

    return (
        <div>
            <motion.h2
                ref={ref}
                // Usiamo `animate` invece di whileInView: controlliamo noi quando è active
                initial={{ x: 0, color: initialColor, opacity: 0.9 }}
                animate={{ x: active ? 40 : 0, color: active ? finalColor : initialColor, opacity: 1 }}
                transition={{ type: "spring", stiffness: 140, damping: 18, mass: 0.6 }}
                className="font-jetbrains tracking-tight leading-none text-6xl md:text-8xl lg:text-4xl select-none"
                style={{ willChange: "transform, color" }}
            >
                <span className="text-gray-300 motion-reduce:text-neutral-900 motion-reduce:translate-x-0 inline-block">
                    {word}
                </span>
            </motion.h2>
        </div>

    );
}

/*
USAGE EXAMPLE:

  <WordShiftOnScroll
    words={["The", "Future", "Of", "Improvement", "Arrived"]}
    band={{ min: 0.5, max: 0.7 }} // 50% – 70% viewport
  />

Note:
- Se vuoi vedere la fascia, per debug puoi overlayare una guida:

  <div className="fixed left-0 right-0 pointer-events-none z-50">
    <div className="absolute top-1/2 h-[1px] w-full bg-pink-500/30" />
    <div className="absolute" style={{ top: "50vh" }}>
      <div className="h-0.5 w-full bg-emerald-400/30" />
    </div>
    <div className="absolute" style={{ top: "70vh" }}>
      <div className="h-0.5 w-full bg-emerald-400/30" />
    </div>
  </div>

- Cambia la fascia con `band={{ min: 0.45, max: 0.65 }}` ecc.
- `passive: true` sul listener di scroll per performance.
*/
