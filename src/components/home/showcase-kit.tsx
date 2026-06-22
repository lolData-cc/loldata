"use client";

// showcase-kit — shared scaffolding for the homepage below-fold product
// showcases (Summoner & Scout, AI Coach, Match & Replay). One vocabulary:
// solid #040A0C, chakrapetch headlines with a single jade-lit word, a faint
// jade dot-grid, glass "device" panels with corner ticks + a scanline, and
// EASE_BRAND on-view reveals — the same rhythm as the hero so the page reads
// as one continuous statement.

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const EASE_BRAND = [0.22, 1, 0.36, 1] as const;

export const VIEWPORT = { once: true, amount: 0.35 } as const;

// ── reveal variants ──────────────────────────────────────────────────
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};
export const up: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_BRAND } },
};
export const upSm: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_BRAND } },
};
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.9, ease: EASE_BRAND } },
};

// ── copy primitives ──────────────────────────────────────────────────
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={upSm} className={cn("flex items-center gap-2.5", className)}>
      <span
        className="w-2 h-2 rounded-full bg-jade shrink-0"
        style={{ boxShadow: "0 0 8px #00d992" }}
      />
      <span className="font-chakrapetch text-[11px] font-bold uppercase tracking-[0.34em] text-jade/80">
        {children}
      </span>
    </motion.div>
  );
}

export function Headline({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.h2
      variants={up}
      className={cn(
        "font-chakrapetch font-bold text-flash leading-[0.98] tracking-tight",
        "text-[clamp(30px,4.4vw,52px)]",
        className
      )}
    >
      {children}
    </motion.h2>
  );
}

/** A jade-lit emphasis word for inside a Headline. */
export function Hot({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-jade" style={{ textShadow: "0 0 38px rgba(0,217,146,0.4)" }}>
      {children}
    </span>
  );
}

export function Lead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.p
      variants={up}
      className={cn("text-[15px] md:text-[16px] leading-relaxed text-flash/55", className)}
    >
      {children}
    </motion.p>
  );
}

/** Feature labels rendered as interlocking mechanical pieces — a single
 *  no-wrap row where each piece's dovetail tab slots into the next piece's
 *  notch (replaces the old wrapping pills). */
const TAB = 11; // dovetail tab / notch depth, px

function pieceClip(i: number, n: number): string {
  const first = i === 0;
  const last = i === n - 1;
  // right edge: a notch (recessed) unless it's the last piece (flat)
  const right = last
    ? "100% 0, 100% 100%"
    : `100% 0, 100% 30%, calc(100% - ${TAB}px) 30%, calc(100% - ${TAB}px) 70%, 100% 70%, 100% 100%`;
  // left edge: flat for the first piece, otherwise a protruding tab
  if (first) return `polygon(0 0, ${right}, 0 100%)`;
  const tabL = `${TAB}px 70%, 0 70%, 0 30%, ${TAB}px 30%`;
  return `polygon(${TAB}px 0, ${right}, ${TAB}px 100%, ${tabL})`;
}

export function Bullets({
  items,
  className,
}: {
  items: { icon: LucideIcon; label: string }[];
  className?: string;
}) {
  const n = items.length;
  return (
    <motion.div variants={upSm} className={cn("flex w-full flex-nowrap items-stretch", className)}>
      {items.map(({ icon: Icon, label }, i) => (
        <div
          key={label}
          className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-1 h-12 bg-jade/[0.06] border border-jade/25 transition-colors duration-200 hover:bg-jade/[0.12]"
          style={{
            clipPath: pieceClip(i, n),
            marginLeft: i === 0 ? 0 : -TAB,
            paddingLeft: i === 0 ? 8 : TAB + 4,
            paddingRight: i === n - 1 ? 8 : TAB + 4,
          }}
        >
          <Icon size={13} className="shrink-0 text-jade/85" />
          <span className="max-w-full font-jetbrains text-[9px] uppercase tracking-wider text-flash/65 whitespace-nowrap overflow-hidden text-ellipsis">
            {label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

/** Ghost text link with a sliding chevron — matches the hero's "Explore" CTA. */
export function GhostLink({
  children,
  onClick,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "group inline-flex items-center gap-2 font-chakrapetch text-[13px] font-bold uppercase tracking-[0.12em] text-flash/70 cursor-clicker transition-colors duration-200 hover:text-jade";
  const inner = (
    <>
      {children}
      <ChevronRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
    </>
  );
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

// ── glass device panel ───────────────────────────────────────────────
/** The recurring "device mock" frame: glass, a jade hairline, corner ticks,
 *  a faint scanline sweep and a soft jade lift shadow. */
export function GlassPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md overflow-hidden",
        className
      )}
      style={{
        boxShadow:
          "0 40px 90px -50px rgba(0,217,146,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* corner ticks */}
      <Ticks />
      {/* scanline sweep */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 h-24 -z-0"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(0,217,146,0.06), transparent)",
        }}
        initial={{ y: "-20%" }}
        animate={{ y: ["-20%", "520%"] }}
        transition={{ duration: 6.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.5 }}
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

function Ticks() {
  const base =
    "pointer-events-none absolute w-3 h-3 border-jade/40";
  return (
    <>
      <span className={cn(base, "top-2 left-2 border-t border-l")} />
      <span className={cn(base, "top-2 right-2 border-t border-r")} />
      <span className={cn(base, "bottom-2 left-2 border-b border-l")} />
      <span className={cn(base, "bottom-2 right-2 border-b border-r")} />
    </>
  );
}

// ── section shell + 2-col alternating layout ─────────────────────────
/** Faint jade dot-grid wash, concentrated by a radial mask — the section
 *  atmosphere shared across the below-fold (echoes the hero's point field). */
export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute inset-0 -z-10 pointer-events-none opacity-[0.06]",
        "[background-image:radial-gradient(rgba(0,217,146,0.7)_1px,transparent_1px)]",
        "[background-size:24px_24px]",
        "[mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_72%)]",
        "[-webkit-mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_72%)]",
        className
      )}
    />
  );
}

/**
 * One product showcase: a copy column and a glass "device" column, side by
 * side, alternating which side the device sits on (`flip`). The whole thing
 * is one stagger container so copy + device reveal as a unit on view.
 */
export function Showcase({
  id,
  flip = false,
  mock,
  children,
  className,
}: {
  id?: string;
  flip?: boolean;
  mock: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      className={cn("relative py-20 md:py-28", className)}
    >
      <DotGrid />
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div className={cn("max-w-[540px] space-y-5", flip && "lg:order-2 lg:justify-self-end")}>
          {children}
        </div>
        <motion.div variants={up} className={cn("relative", flip && "lg:order-1")}>
          {mock}
        </motion.div>
      </div>
    </motion.section>
  );
}

// ── small shared bits used inside the device mocks ───────────────────
/** A W/L pill, jade for a win, red for a loss. */
export function WLPill({ win }: { win: boolean }) {
  return (
    <span
      className={cn(
        "inline-grid place-items-center w-6 h-6 rounded-[6px] font-chakrapetch text-[12px] font-bold",
        win ? "bg-jade/15 text-jade" : "bg-[#ff6286]/12 text-[#ff6286]"
      )}
    >
      {win ? "W" : "L"}
    </span>
  );
}

/** A faux champion tile — a jade-tinted gradient square with a glyph, so the
 *  mocks read as real product UI without shipping fragile champion art. */
export function ChampTile({
  icon: Icon,
  size = 34,
  win,
}: {
  icon: LucideIcon;
  size?: number;
  win?: boolean;
}) {
  return (
    <span
      className="relative grid place-items-center rounded-[8px] shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background:
          win === false
            ? "linear-gradient(135deg, rgba(255,98,134,0.18), rgba(4,10,12,0.6))"
            : "linear-gradient(135deg, rgba(0,217,146,0.22), rgba(4,10,12,0.6))",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Icon size={size * 0.5} className={win === false ? "text-[#ff6286]/80" : "text-jade/90"} />
    </span>
  );
}
