"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, getCdnVersion } from "@/config";
import { ChevronLeft, ChevronRight } from "lucide-react";
function degToRad(d) {
    return (d * Math.PI) / 180;
}
function polar(cx, cy, r, angleDeg) {
    const a = degToRad(angleDeg);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
/** Windowed per ring: ogni anello ha il SUO numero di colonne visibili (inner meno colonne = più spazio) */
function layoutWindowedPerRing(items, ringCount, ringCols, // es: [12, 18, 24] → inner=12, middle=18, outer=24
colOffset) {
    if (items.length === 0)
        return [];
    const totalCols = Math.ceil(items.length / ringCount); // colonne totali del dataset
    const result = [];
    for (let r = 0; r < ringCount; r++) {
        const colsVis = ringCols[r] ?? ringCols[ringCols.length - 1];
        const span = 360 / colsVis;
        for (let k = 0; k < colsVis; k++) {
            const col = (colOffset + k + totalCols) % totalCols;
            const idx = col * ringCount + r;
            if (idx >= items.length)
                continue;
            const item = items[idx];
            const start = k * span;
            const end = start + span;
            result.push({ item, ringIndex: r, startAngleBase: start, endAngleBase: end });
        }
    }
    return result;
}
// ────────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────────
export default function ChampionPage() {
    const [latestPatch, setLatestPatch] = useState("15.13.1");
    const [items, setItems] = useState([]);
    // Use CDN version resolved at startup
    useEffect(() => {
        setLatestPatch(getCdnVersion());
    }, []);
    // Load champions and build items
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((res) => res.json())
            .then((data) => {
            const champs = Object.values(data.data);
            const sorted = champs.sort((a, b) => a.id.localeCompare(b.id));
            const list = sorted.map((c) => ({
                id: String(c.id),
                label: c.id,
                image: `${cdnBaseUrl()}/img/champion/${c.id}.png`, // icone quadrate
            }));
            setItems(list);
        })
            .catch(console.error);
    }, [latestPatch]);
    // Dock open/close + confirmed
    const [open, setOpen] = useState(true);
    const [confirmed, setConfirmed] = useState(null);
    return (_jsxs("main", { className: "min-h-dvh bg-neutral-950 text-white", children: [_jsxs("div", { className: "mx-auto max-w-6xl px-4 py-8", children: [_jsx("h1", { className: "mb-2 text-xl font-semibold", children: "Radial Champion Selector" }), _jsx("p", { className: "text-sm text-neutral-400", children: "Wheel con finestra di colonne per una migliore leggibilit\u00E0." }), confirmed && (_jsxs("div", { className: "mt-4 flex items-center gap-3 rounded-md border border-white/10 bg-neutral-900/50 p-3 text-sm text-neutral-200", children: [_jsx("img", { src: confirmed.image || "/placeholder.svg", alt: `${confirmed.label} portrait`, className: "h-10 w-10 rounded object-cover" }), _jsxs("div", { children: ["Selected: ", _jsx("span", { className: "font-medium text-white", children: confirmed.label })] })] }))] }), _jsx(RadialBottomDock, { items: items, open: open, onOpen: () => setOpen(true), onConfirm: (it) => {
                    setConfirmed(it);
                    setOpen(false);
                } })] }));
}
function RadialBottomDock({ items, open, onOpen, onConfirm }) {
    return (_jsx("div", { className: "fixed inset-x-0 bottom-0 z-50 h-[320px] bg-gradient-to-t from-neutral-950/95 via-neutral-950/80 to-neutral-950/20 backdrop-blur-sm md:h-[380px]", children: _jsxs("div", { className: "relative h-full w-full overflow-hidden", children: [open ? _jsx(RadialWheel, { items: items, onConfirm: onConfirm }) : _jsx(ReopenOverlay, { onOpen: onOpen }), _jsx("div", { "aria-hidden": "true", className: "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-950/90 to-transparent" })] }) }));
}
function ReopenOverlay({ onOpen }) {
    return (_jsx("div", { className: "absolute inset-0 flex items-end justify-center pb-4", children: _jsx(Button, { className: "min-w-[220px] bg-yellow-400 text-black hover:bg-yellow-300", onClick: onOpen, children: "Change Champion" }) }));
}
function RadialWheel({ items, onConfirm }) {
    // Wheel sizing
    const width = 820;
    const height = 820;
    const cx = width / 2;
    const cy = height / 2;
    // Geometria
    const ringCount = 3;
    const baseInnerRadius = 126; // buco più grande → più aria all'anello interno
    const ringGap = 6;
    const ringThickness = 72;
    const outerMost = baseInnerRadius + ringCount * ringThickness + (ringCount - 1) * ringGap;
    // Colonne visibili per anello (inner meno colonne = più spazio angolare)
    const ringCols = [12, 18, 24]; // [inner, middle, outer]
    const [colOffset, setColOffset] = useState(0);
    // Layout windowed per ring
    const laidOut = useMemo(() => layoutWindowedPerRing(items, ringCount, ringCols, colOffset), [items, ringCount, ringCols, colOffset]);
    // Interazione
    const [selectedId, setSelectedId] = useState(null);
    const selectedLayout = laidOut.find((l) => l.item.id === selectedId) || null;
    const selectedItem = selectedLayout?.item ?? null;
    return (_jsxs("div", { className: "pointer-events-none absolute inset-0 flex items-end justify-center", children: [_jsxs("svg", { viewBox: `0 0 ${width} ${height}`, className: "pointer-events-auto h-[640px] w-[1100px] max-w-none translate-y-[40%] transform md:h-[760px] md:translate-y-[45%]", role: "group", "aria-label": "Circular radial selection grid", children: [_jsxs("defs", { children: [_jsxs("radialGradient", { id: "wheel-bg", cx: "50%", cy: "50%", r: "65%", children: [_jsx("stop", { offset: "0%", stopColor: "#0d0d0d" }), _jsx("stop", { offset: "100%", stopColor: "#171717" })] }), _jsxs("filter", { id: "glow", x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "3", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] })] }), _jsx("circle", { cx: cx, cy: cy, r: outerMost + 16, fill: "url(#wheel-bg)", opacity: 0.95 }), Array.from({ length: ringCount }).map((_, r) => {
                        const rInner = baseInnerRadius + r * (ringThickness + ringGap);
                        const rOuter = rInner + ringThickness;
                        return (_jsx("circle", { cx: cx, cy: cy, r: rOuter, fill: "none", stroke: "rgba(255,255,255,0.08)", strokeWidth: 1, style: { pointerEvents: "none" } }, `ring-outline-${r}`));
                    }), laidOut.map(({ item, ringIndex, startAngleBase, endAngleBase }) => {
                        const innerR = baseInnerRadius + ringIndex * (ringThickness + ringGap);
                        const start = startAngleBase;
                        const end = endAngleBase;
                        const mid = (start + end) / 2;
                        // Più spazio nell'anello interno: spingo i tile verso l'esterno
                        const outwardBias = (ringCount - 1 - ringIndex) * 10; // px
                        const tileR = innerR + ringThickness / 2 + outwardBias;
                        const { x: cxTile, y: cyTile } = polar(cx, cy, tileR, mid);
                        // Anelli interni: avatar un filo più piccoli
                        const basePad = 4;
                        const extraPad = (ringCount - 1 - ringIndex) * 6;
                        const pad = basePad + extraPad;
                        const avatarSize = Math.max(22, ringThickness - pad * 2);
                        const clipId = `clip-${item.id}`;
                        const isSelected = selectedId === item.id;
                        return (_jsxs("g", { role: "button", tabIndex: 0, "aria-label": item.label, "aria-pressed": isSelected, onClick: () => setSelectedId(item.id), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setSelectedId(item.id);
                                }
                            }, className: "cursor-pointer outline-none", children: [_jsx("clipPath", { id: clipId, children: _jsx("circle", { cx: cxTile, cy: cyTile, r: avatarSize / 2 }) }), _jsx("image", { href: item.image, x: cxTile - avatarSize / 2, y: cyTile - avatarSize / 2, width: avatarSize, height: avatarSize, preserveAspectRatio: "xMidYMid meet", clipPath: `url(#${clipId})` }), _jsx("circle", { cx: cxTile, cy: cyTile, r: (avatarSize / 2) + (isSelected ? 2 : 0), fill: "none", stroke: isSelected ? "#00d992" : "rgba(255,255,255,0.18)", strokeWidth: isSelected ? 3 : 1.5, className: cn("transition-all duration-200", !isSelected && "hover:stroke-yellow-300/70"), filter: isSelected ? "url(#glow)" : undefined })] }, item.id));
                    })] }), _jsxs("div", { className: "pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { "aria-label": "Scroll left", className: "h-10 w-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700", size: "icon", onClick: () => setColOffset((o) => o - 1), children: _jsx(ChevronLeft, { className: "h-5 w-5" }) }), _jsx(Button, { "aria-label": "Scroll right", className: "h-10 w-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700", size: "icon", onClick: () => setColOffset((o) => o + 1), children: _jsx(ChevronRight, { className: "h-5 w-5" }) })] }), _jsx(Button, { disabled: !selectedItem, className: cn("min-w-[180px] bg-yellow-400 text-black hover:bg-yellow-300", !selectedItem && "opacity-50"), onClick: () => selectedItem && onConfirm(selectedItem), children: selectedItem ? `Confirm: ${selectedItem.label}` : "Confirm" })] })] }));
}
