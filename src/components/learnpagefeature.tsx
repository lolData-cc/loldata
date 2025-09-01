'use client';
import { ChartNoAxesCombined, ChevronRight, Rocket, Sword } from "lucide-react";
import { Separator } from "./ui/separator";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";


function TypingOnInView({
  text,
  speed = 50,
  className = "",
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.55 });
  const [typed, setTyped] = useState("");
  const runId = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isInView) return;
    const id = ++runId.current;
    let i = 0;
    setTyped("");

    const step = () => {
      if (runId.current !== id) return;
      const ch = text.charAt(i);
      if (!ch) {
        timerRef.current = null;
        return;
      }
      setTyped((prev) => prev + ch);
      i += 1;
      timerRef.current = window.setTimeout(step, speed);
    };

    timerRef.current = window.setTimeout(step, speed);

    return () => {
      runId.current++;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isInView, text, speed]);

  const done = typed.length === text.length;

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      <span>{typed}</span>
      <span className={`ml-1 inline-block w-[1ch] select-none ${done ? "opacity-0" : "opacity-100 animate-pulse"}`}>|</span>
    </h1>
  );
}


export function LearnPageFeature() {
  const lineLength = 40;
  const viewport = { once: true, amount: 0.55 };
  const transition = { duration: 0.6, ease: "easeOut" } as const;

  return (
    <div>
      <TypingOnInView
        text="Explore lolData features"
        speed={50}
        className="text-4xl text-jade/40 py-6"
      />
      <Separator className="relative w-screen border-t border-flash/20 right-[335px]" />
      <div className="flex justify-between px-24">
        <div className="relative w-full h-[1000px]">
          <Separator
            className="
              w-[50%]
              h-[1000px]
              border-x border-transparent
              [border-image-slice:1]
              [border-image-source:linear-gradient(to_bottom,currentColor,transparent)]
              text-flash/20
            "
          />
          <motion.div
            className="absolute top-24 right-full -left-3 z-10 w-full space-y-3"
            initial={{ opacity: 0, x: -24, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={{ ...viewport, margin: "-25% 0% -25% 0%" }}
            transition={transition}
            style={{ willChange: "transform, opacity, filter" }}
          >
            <div className="group flex w-[46%] gap-4 items-center cursor-clicker">
              <div
                className="
                  z-10 bg-jade/20
                  w-6 h-6
                  flex items-center justify-center
                  rounded-[3px]
                  group-hover:bg-jade/30
                "
              >
                <ChartNoAxesCombined
                  aria-hidden
                  className="
                    text-jade
                    size-5
                    pointer-events-none
                    shadow
                  "
                />
              </div>
              <div className="flex items-center text-flash/90 group-hover:text-flash/95 gap-1.5 group">
                <span className="text-xl">Improve doing allthis and that</span>
                <ChevronRight
                  className="
                    w-4 h-4
                    transform transition-transform duration-200
                    group-hover:translate-x-1.5
                  "
                />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ ...transition, delay: 0.06 }}
              className="w-[45%] ml-10 text-[15px] text-flash/75 font-geist"
            >
              Train smarter with our AI coach. It tracks your games, identifies weaknesses, and delivers daily reports with clear steps to improve.
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ ...transition, delay: 0.12 }}
              className="w-[45%] ml-10 text-[15px] pt-4"
            >
              <div className="space-y-2 text-sm text-flash/30 uppercase font-jetbrains">
                <Separator className="w-full bg-flash/10" />
                <div className="flex items-center">
                  <Rocket className="w-4 h-4 mx-2 text-[#008C5A] fill-[#008C5A]" />
                  Daily performance-based reports
                </div>
                <Separator className="w-full bg-flash/10" />
                <div className="flex items-center">
                  <img src="img/icons/coins.svg" alt="Coins icon" className="w-4 h-4 mx-2" />
                  Custom gold optimization
                </div>
                <Separator className="w-full bg-flash/10" />
                <div className="flex items-center">
                  <Sword className="w-4 h-4 mx-2 text-[#008C5A] fill-[#008C5A]" />
                  ITEMIZATION ANALYSIS
                </div>
              </div>
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute top-[550px] right-full -left-3 z-10 w-full space-y-3"
            initial={{ opacity: 0, x: -24, filter: "blur(4px)" }}
            whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            viewport={viewport}
            transition={transition}
          >
            <div className="group flex w-[46%] gap-4 items-center cursor-clicker">
              <div
                className="
                  z-10 bg-jade/20
                  w-6 h-6
                  flex items-center justify-center
                  rounded-[3px]
                  group-hover:bg-jade/30
                "
              >
                <ChartNoAxesCombined
                  aria-hidden
                  className="
                    text-jade
                    size-5
                    pointer-events-none
                    shadow
                  "
                />
              </div>
              <div className="flex items-center text-flash/90 group-hover:text-flash/95 gap-1.5 group">
                <span className="text-xl">Improve doing allthis and that</span>
                <ChevronRight
                  className="
                    w-4 h-4
                    transform transition-transform duration-200
                    group-hover:translate-x-1.5
                  "
                />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ ...transition, delay: 0.06 }}
              className="w-[45%] ml-10 text-[15px] text-flash/75 font-geist"
            >
              Train smarter with our AI coach. It tracks your games, identifies weaknesses, and delivers daily reports with clear steps to improve.
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewport}
              transition={{ ...transition, delay: 0.12 }}
              className="w-[45%] ml-10 text-[15px] pt-4"
            >
              <div className="space-y-2 text-sm text-flash/30 uppercase font-jetbrains">
                <Separator className="w-full bg-flash/10" />
                <div className="flex items-center">
                  <Rocket className="w-4 h-4 mx-2 text-[#008C5A] fill-[#008C5A]" />
                  Daily performance-based reports
                </div>
                <Separator className="w-full bg-flash/10" />
                <div className="flex items-center">
                  <img src="img/icons/coins.svg" alt="Coins icon" className="w-4 h-4 mx-2" />
                  Custom gold optimization
                </div>
                <Separator className="w-full bg-flash/10" />
                <div className="flex items-center">
                  <Sword className="w-4 h-4 mx-2 text-[#008C5A] fill-[#008C5A]" />
                  ITEMIZATION ANALYSIS
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
        <div className="flex flex-col items-center h-[600px]">
          {Array.from({ length: lineLength }).map((_, i) => {
            const opacity = 1 - i / lineLength;
            return (
              <span key={i} style={{ opacity }} className="text-flash/30 select-none">
                @
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
