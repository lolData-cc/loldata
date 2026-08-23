"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// DesktopShowcase — the desktop companion app, which does not exist yet.
//
// The other showcases render REAL product UI because those products are live.
// This one cannot, so the device is a mockup and the eyebrow says "in
// development" rather than implying you can download it today.
//
// What the screen shows is a game in progress with the loldata overlay pinned
// top-right — the actual pitch, since the whole point of a desktop app is that
// it is on screen WHILE you play. It is assembled from assets we already host
// (splash art, the real minimap, real item icons), so nothing here depends on a
// third-party host at runtime.
//
// The device is CSS 3D rather than WebGL: it is a flat panel on a tilt, which
// perspective + rotateY does perfectly, and it keeps the mock as plain DOM.
// That matters — cdn2 art cannot be used as a WebGL texture (Cloudflare caches
// a copy without the CORS header), and adding crossOrigin to a DOM <img> breaks
// it for the same reason. Plain <img src> is the one thing that always works.
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Showcase, Eyebrow, Headline, Hot, Lead, up, } from "./showcase-kit";
import { cdnBaseUrl } from "@/config";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
// Sylas on purpose: our own aggregation says 87% of Sylas junglers who cut the
// clear short and reset buy exactly this, at a median of 2:05. The overlay is
// suggesting a real thing we actually measured.
// One 9s cycle: sweep in, hold about five seconds, retract, then a beat of
// nothing before it returns — an overlay that surfaces a suggestion and gets
// out of the way, which is how the real thing would behave.
//
// The phase offsets between rail, item and words live in `times`, NOT in
// `delay`. Framer applies a delay to the first iteration only, so on every loop
// after the first the delays would collapse and all three would fire together.
/* ── the callout's cycle ───────────────────────────────────────────────────
   The first two attempts drove four layers with their own keyframe arrays and
   `times`, and the exit never actually landed together: the words went, then a
   long beat, then the rail closed. Chasing that with better numbers was the
   wrong fix, because with five keyframes, per-segment easing and four separate
   tracks, what the numbers SAY and what gets rendered are not the same thing.

   So there are no keyframes here. One element mounts and unmounts, everything
   lives inside it, and the exit is simultaneous by construction rather than by
   arithmetic — there is only one animation to be simultaneous with.

   The wipe is a clip inset from the left: `inset(0 0 0 100%)` hides it entirely
   and 0% reveals it, so the content is uncovered starting at the RIGHT edge and
   travelling left — along the rail, the way it would arrive if it came down the
   line. Reversed on the way out. */
const VISIBLE_MS = 6000;
const HIDDEN_MS = 1600;
const ENTER_S = 0.42;
const EXIT_S = 0.34;
const WIPE_IN = [0.16, 1, 0.3, 1];
const WIPE_OUT = [0.7, 0, 0.84, 0];
/** Alternates on a timer. One timeout at a time, re-armed on each flip, so it
 *  cannot accumulate handles the way an interval plus a toggle would. */
function useCycle(enabled) {
    const [on, setOn] = useState(true);
    useEffect(() => {
        if (!enabled) {
            setOn(true);
            return;
        }
        const t = window.setTimeout(() => setOn((v) => !v), on ? VISIBLE_MS : HIDDEN_MS);
        return () => window.clearTimeout(t);
    }, [on, enabled]);
    return on;
}
// Dark Seal 350 + Fated Ashes 900 = 1250, checked against the live item.json
// rather than typed from memory.
const BUY_ITEMS = [
    { id: 1082, name: "Dark Seal" },
    { id: 2508, name: "Fated Ashes" },
];
export function DesktopShowcase({ id }) {
    return (_jsxs(Showcase, { id: id, mock: _jsx(DesktopMock, {}), children: [_jsx(Eyebrow, { children: "Desktop app \u00B7 in development" }), _jsxs(Headline, { children: ["A second screen that ", _jsx(Hot, { children: "thinks ahead" }), "."] }), _jsx(Lead, { children: "It sits over the game and reads it as it happens \u2014 who you are against, what they built, where the jungle actually is. Then it tells you the next thing to do: the clear that fits this matchup, the item that wins against this composition, the reset you are about to miss. No tab out, no guessing." }), _jsx(motion.div, { variants: up, className: "pt-3", children: _jsx(DesktopCta, {}) })] }));
}
/** The download call to action.
 *
 *  It goes somewhere now. It used to be a real <button disabled>, because a
 *  pointer that never resolves is worse than a control that says so — and now
 *  that there is a build, the same rule says make it a link.
 *
 *  The pill still tells the truth, it just tells a different one: the app is
 *  released and it is version 0.0.1.
 *
 *  The body is near-black, the same ground the COMING SOON pill sits on, and
 *  the only colour in the whole control is a single light running its
 *  perimeter. That is the invitation: nothing is filled with brand colour, but
 *  the edge never stops moving, and the eye follows a line. See .dl-cta in
 *  index.css for how the running border is built.
 *
 *  The pill straddles the corner — the same half-in, half-out anchoring the
 *  champion level badge uses on a match card. */
function DesktopCta() {
    return (_jsxs("div", { className: "relative inline-block", children: [_jsxs(Link, { to: "/download", "aria-label": "Get the lolData desktop app", className: "dl-cta inline-block px-7 py-[14px] cursor-clicker select-none", style: { boxShadow: "0 16px 34px -22px rgba(0,217,146,0.55)" }, children: [_jsx("span", { "aria-hidden": true, className: "dl-cta__orbit pointer-events-none" }), _jsx("span", { "aria-hidden": true, className: "dl-cta__body pointer-events-none" }), _jsx("span", { className: "relative font-jetbrains text-[12px] font-bold uppercase tracking-[0.22em] text-jade", children: "Get the desktop app" })] }), _jsx("span", { "aria-hidden": true, className: cn("pointer-events-none absolute -right-3 -top-[9px] rounded-[3px] px-2 py-[3px]", "bg-liquirice ring-1 ring-citrine/45", "font-jetbrains text-[8.5px] font-bold uppercase leading-none tracking-[0.2em] text-citrine/90"), style: { boxShadow: "0 2px 10px rgba(0,0,0,0.7)" }, children: "Beta" })] }));
}
/* ── the device ─────────────────────────────────────────────────────────── */
function DesktopMock() {
    return (_jsxs("div", { className: "relative mx-auto w-full max-w-[560px]", style: { perspective: "1500px" }, children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute -inset-x-24 -top-32 -bottom-20 -z-10 blur-[18px]", style: {
                    background: 
                    // centre 44% 34%, radius 40% 32%  ->  x 4-84%, y 2-66%
                    "radial-gradient(40% 32% at 44% 34%," +
                        " rgba(0,217,146,0.20) 0%," +
                        " rgba(0,217,146,0.11) 34%," +
                        " rgba(0,217,146,0.04) 62%," +
                        " rgba(0,217,146,0) 100%)," +
                        // centre 52% 52%, radius 46% 44%  ->  x 6-98%, y 8-96%
                        "radial-gradient(46% 44% at 52% 52%," +
                        " rgba(0,217,146,0.075) 0%," +
                        " rgba(0,217,146,0.03) 45%," +
                        " rgba(0,217,146,0) 100%)",
                } }), _jsxs(motion.div
            // The idle drift is what makes it read as a product shot rather than a
            // screenshot. Slow and small on purpose: this sits beside body copy, and
            // a fast float would pull the eye off the words.
            , { 
                // The idle drift is what makes it read as a product shot rather than a
                // screenshot. Slow and small on purpose: this sits beside body copy, and
                // a fast float would pull the eye off the words.
                style: { transformStyle: "preserve-3d", rotateX: 7, rotateZ: -1 }, initial: { rotateY: -18 }, animate: { rotateY: [-18, -13.5, -18], y: [0, -9, 0] }, transition: { duration: 12, repeat: Infinity, ease: "easeInOut" }, className: "relative", children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-y-3 -right-[6px] w-[6px] rounded-r-[4px]", style: {
                            background: "linear-gradient(90deg, rgba(0,217,146,0.22), rgba(4,10,12,0.9))",
                            transform: "rotateY(70deg)",
                            transformOrigin: "left center",
                        } }), _jsx(GameScreen, {})] }), _jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-x-0 -bottom-14 h-32 -z-10 blur-[14px]", style: {
                    background: 
                    // centre 50% 52%, radius 42% 44%  ->  x 8-92%, y 8-96%
                    "radial-gradient(42% 44% at 50% 52%," +
                        " rgba(0,217,146,0.20) 0%," +
                        " rgba(0,217,146,0.08) 42%," +
                        " rgba(0,217,146,0) 100%)",
                } })] }));
}
/** A real frame of the game with the overlay pinned over it.
 *
 *  This was a composed HUD at first — splash art behind hand-built health bars,
 *  ability slots and a minimap. It read as a diagram of a game rather than a
 *  game, which is the wrong thing to promise for a product whose whole pitch is
 *  that it sits on top of the real client. So the screen is a genuine capture
 *  and the only thing we draw is our own overlay.
 *
 *  The capture lives in public/, not on the CDN: it is chrome for this page,
 *  not game data, and it should ship and version with the build. */
const INGAME_SHOT = "/img/home/ingame.jpg";
function GameScreen() {
    const reduce = useReducedMotion();
    // Reduced motion: no cycle at all. Something that appears and disappears on a
    // timer is exactly what that setting asks us not to do, so it simply stays.
    const showCallout = useCycle(!reduce);
    return (_jsxs("div", { className: "relative aspect-[16/9] overflow-hidden rounded-[10px] border border-jade/20 bg-[#050b0d]", style: {
            boxShadow: "0 60px 120px -50px rgba(0,217,146,0.35), 0 0 0 1px rgba(0,217,146,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
        }, children: [_jsx("img", { src: INGAME_SHOT, alt: "A League of Legends game with the lolData overlay running on top of it", className: "absolute inset-0 h-full w-full object-cover", loading: "lazy", decoding: "async" }), _jsx(AnimatePresence, { children: showCallout && (_jsxs(motion.div, { className: "absolute right-0 top-[12%] w-[43%] max-w-[228px]", initial: { clipPath: "inset(0% 0% 0% 100%)", opacity: 0 }, animate: {
                        clipPath: "inset(0% 0% 0% 0%)",
                        opacity: 1,
                        transition: { duration: ENTER_S, ease: WIPE_IN },
                    }, exit: {
                        clipPath: "inset(0% 0% 0% 100%)",
                        opacity: 0,
                        transition: { duration: EXIT_S, ease: WIPE_OUT },
                    }, children: [_jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute -inset-x-8 -inset-y-7 blur-[7px]", style: {
                                background: "radial-gradient(58% 62% at 52% 50%," +
                                    " rgba(4,10,12,0.86) 0%," +
                                    " rgba(4,10,12,0.66) 22%," +
                                    " rgba(4,10,12,0.40) 38%," +
                                    " rgba(4,10,12,0.18) 50%," +
                                    " rgba(4,10,12,0.05) 57%," +
                                    " rgba(4,10,12,0) 62%)",
                            } }), _jsxs("svg", { "aria-hidden": true, viewBox: "0 0 228 10", preserveAspectRatio: "none", className: "absolute inset-x-0 top-0 h-[10px] w-full overflow-visible", style: { filter: "drop-shadow(0 0 4px rgba(0,217,146,0.5))" }, children: [_jsx("path", { d: "M 2 9 L 9 2 L 228 2", fill: "none", stroke: "#00d992", strokeWidth: "1", vectorEffect: "non-scaling-stroke", opacity: "0.9" }), _jsx("rect", { x: "176", y: "-2", width: "7", height: "7", transform: "rotate(45 179.5 1.5)", fill: "#00d992" })] }), _jsx("div", { className: "relative overflow-hidden pl-3 pr-1 pt-[9px]", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", style: { textShadow: "0 1px 4px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.8)" }, children: [_jsx("p", { className: "font-jetbrains text-[6px] uppercase tracking-[0.3em] text-jade/85", children: "Suggested buy" }), _jsxs("p", { className: "font-chakrapetch text-[11.5px] font-bold leading-[1.2] text-flash", children: ["Dark Seal ", _jsx("span", { className: "text-jade/70", children: "+" }), " Fated Ashes"] }), _jsxs("p", { className: "font-jetbrains text-[6.5px] leading-tight text-flash/55", children: ["87% on a 3-camp reset \u00B7 ", _jsx("span", { className: "text-citrine/80", children: "1250g" })] })] }), _jsx("div", { className: "flex shrink-0 items-center gap-[3px]", children: BUY_ITEMS.map((it) => (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${it.id}.png`, alt: it.name, className: "h-[22px] w-[22px] rounded-[2px]", style: { filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.95))" }, 
                                            // Deliberately NOT lazy: these icons are the payload of the
                                            // whole section.
                                            decoding: "async" }, it.id))) })] }) })] }, "callout")) }), _jsx("span", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 z-20", style: {
                    background: "linear-gradient(112deg, rgba(255,255,255,0.05) 0%, transparent 32%, transparent 70%, rgba(0,217,146,0.045) 100%)",
                } })] }));
}
