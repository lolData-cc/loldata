import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/context/championPickerContext.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCdnVersion } from "@/config";
// shadcn sheet picker
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { BorderBeam } from "@/components/ui/border-beam";
import { champDisplayName, cdnBaseUrl } from "@/config";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, } from "@/components/ui/accordion";
// ⚠️ se il file è in src/utils/champion-roles.ts cambia questo path
import { TOP_CHAMPIONS, JNG_CHAMPIONS, MID_CHAMPIONS, ADC_CHAMPIONS, SUP_CHAMPIONS, } from "@/utils/champion-roles";
const ChampionPickerCtx = createContext(null);
export function useChampionPicker() {
    const ctx = useContext(ChampionPickerCtx);
    if (!ctx)
        throw new Error("useChampionPicker must be used within ChampionPickerProvider");
    return ctx;
}
// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function ChampionPickerProvider({ children }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [latestPatch, setLatestPatch] = useState("15.13.1");
    const [pickerMode, setPickerMode] = useState(() => {
        if (typeof window === "undefined")
            return "sheet";
        try {
            const saved = localStorage.getItem("pickerMode");
            return saved === "sheet" || saved === "radial" ? saved : "sheet";
        }
        catch {
            return "sheet";
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem("pickerMode", pickerMode);
        }
        catch { }
    }, [pickerMode]);
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);
    useEffect(() => {
        setLatestPatch(getCdnVersion());
    }, []);
    // fetch champions, senza ruoli – li useremo nello sheet
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((r) => r.json())
            .then((data) => {
            const champs = Object.values(data?.data ?? {});
            const sorted = champs.sort((a, b) => a.id.localeCompare(b.id));
            const list = sorted.map((c) => {
                const id = String(c.id);
                return {
                    id,
                    label: String(c.name || id),
                    image: `${cdnBaseUrl()}/img/champion/${id}.png`,
                };
            });
            setItems(list);
        })
            .catch(console.error);
    }, [latestPatch]);
    const openPicker = useCallback(() => setOpen(true), []);
    const closePicker = useCallback(() => setOpen(false), []);
    const onConfirm = useCallback((it) => {
        setOpen(false);
        navigate(`/champions/${it.id}`);
    }, [navigate]);
    const ctxValue = useMemo(() => ({ openPicker, closePicker, pickerMode, setPickerMode }), [openPicker, closePicker, pickerMode]);
    return (_jsxs(ChampionPickerCtx.Provider, { value: ctxValue, children: [children, typeof document !== "undefined" &&
                createPortal(pickerMode === "radial" ? (_jsx(RadialChampionDock, { open: open, items: items, onClose: closePicker, onConfirm: onConfirm })) : (_jsx(SheetChampionPicker, { open: open, items: items, onClose: closePicker, onConfirm: onConfirm })), document.body)] }));
}
const degToRad = (d) => (d * Math.PI) / 180;
const polar = (cx, cy, r, angleDeg) => {
    const a = degToRad(angleDeg);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};
function layoutWindowedPerRing(items, ringCount, ringCols, colOffset) {
    if (!items.length)
        return [];
    const totalCols = Math.ceil(items.length / ringCount);
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
function RadialChampionDock({ open, items, onClose, onConfirm, }) {
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-[100]", children: [_jsx("div", { className: "absolute inset-0 bg-black/0", onClick: onClose }), _jsx("div", { className: "absolute inset-x-0 bottom-0 h-[320px] md:h-[380px]\r\n                   bg-gradient-to-t from-neutral-950/95 via-neutral-950/80 to-neutral-950/20", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "relative h-full w-full overflow-hidden", children: [_jsx("div", { className: "pointer-events-none absolute inset-0\r\n                       backdrop-blur-xl\r\n                       [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,.75)_35%,rgba(0,0,0,.35)_65%,rgba(0,0,0,0)_100%)]\r\n                       [-webkit-mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,.75)_35%,rgba(0,0,0,.35)_65%,rgba(0,0,0,0)_100%)]" }), _jsx(RadialWheel, { items: items, onConfirm: onConfirm }), _jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-950/90 to-transparent" })] }) })] }));
}
function RadialWheel({ items, onConfirm }) {
    const width = 820, height = 820, cx = width / 2, cy = height / 2;
    const ringCount = 3, baseInnerRadius = 126, ringGap = 6, ringThickness = 72;
    const ringCols = [12, 18, 24];
    const [colOffset, setColOffset] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    // Pre-calcola gli slot (posizioni fisse)
    const slots = useMemo(() => {
        const out = [];
        for (let r = 0; r < ringCount; r++) {
            const cols = ringCols[r] ?? ringCols[ringCols.length - 1];
            const span = 360 / cols;
            const innerR = baseInnerRadius + r * (ringThickness + ringGap);
            for (let k = 0; k < cols; k++) {
                const mid = (k + 0.5) * span;
                const outwardBias = (ringCount - 1 - r) * 10;
                const tileR = innerR + ringThickness / 2 + outwardBias;
                const { x, y } = polar(cx, cy, tileR, mid);
                const basePad = 4, extraPad = (ringCount - 1 - r) * 6;
                const pad = basePad + extraPad;
                const avatarSize = Math.max(22, ringThickness - pad * 2);
                out.push({ r, k, cx: x, cy: y, avatarSize, clipId: `clip-r${r}-k${k}` });
            }
        }
        return out;
    }, []);
    // Mappa slot → item index (dipende dal colOffset)
    const slotItems = useMemo(() => {
        const result = [];
        if (!items.length)
            return result;
        const totalCols = Math.ceil(items.length / ringCount);
        for (const s of slots) {
            const colsVis = ringCols[s.r] ?? ringCols[ringCols.length - 1];
            void colsVis;
            const kGlobal = ((colOffset % totalCols) + totalCols) % totalCols;
            const col = (kGlobal + s.k) % totalCols;
            const idx = col * ringCount + s.r;
            result.push(items[idx] ?? null);
        }
        return result;
    }, [slots, items, colOffset, ringCols, ringCount]);
    // Preload delle immagini della prossima finestra
    useEffect(() => {
        const preload = (list) => {
            for (const it of list) {
                if (!it)
                    continue;
                const img = new Image();
                img.decoding = "async";
                img.loading = "eager";
                img.src = it.image;
            }
        };
        preload(slotItems); // visibili ora
        if (items.length) {
            const totalCols = Math.ceil(items.length / ringCount);
            const nextOffset = colOffset + 1;
            const tmp = [];
            for (const s of slots) {
                const col = ((nextOffset % totalCols) + totalCols) % totalCols;
                const idx = ((col + s.k) % totalCols) * ringCount + s.r;
                tmp.push(items[idx] ?? null);
            }
            preload(tmp);
        }
    }, [slotItems, colOffset, items, ringCount, slots]);
    const selectedItem = useMemo(() => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null), [selectedId, items]);
    return (_jsxs("div", { className: "pointer-events-none absolute inset-0 flex items-end justify-center", children: [_jsxs("svg", { viewBox: `0 0 ${width} ${height}`, className: "pointer-events-auto h-[640px] w-[1100px] max-w-none translate-y-[40%] transform md:h-[760px] md:translate-y-[45%] ", role: "group", "aria-label": "Circular radial selection grid", children: [_jsxs("defs", { children: [_jsxs("radialGradient", { id: "wheel-bg", cx: "50%", cy: "50%", r: "65%", children: [_jsx("stop", { offset: "0%", stopColor: "#0d0d0d" }), _jsx("stop", { offset: "100%", stopColor: "#171717" })] }), _jsxs("filter", { id: "glow", x: "-50%", y: "-50%", width: "200%", height: "200%", children: [_jsx("feGaussianBlur", { stdDeviation: "3", result: "blur" }), _jsxs("feMerge", { children: [_jsx("feMergeNode", { in: "blur" }), _jsx("feMergeNode", { in: "SourceGraphic" })] })] }), slots.map((s) => (_jsx("clipPath", { id: s.clipId, children: _jsx("circle", { cx: s.cx, cy: s.cy, r: s.avatarSize / 2 }) }, s.clipId)))] }), _jsx("circle", { cx: cx, cy: cy, r: baseInnerRadius + ringCount * (ringThickness + ringGap) + 16, fill: "url(#wheel-bg)", opacity: 0.95 }), Array.from({ length: ringCount }).map((_, r) => {
                        const rInner = baseInnerRadius + r * (ringThickness + ringGap);
                        const rOuter = rInner + ringThickness;
                        return (_jsx("circle", { cx: cx, cy: cy, r: rOuter, fill: "none", stroke: "rgba(255,255,255,0.08)", strokeWidth: 1, style: { pointerEvents: "none" } }, `ring-outline-${r}`));
                    }), slots.map((s, i) => {
                        const it = slotItems[i];
                        const isSelected = it && it.id === selectedId;
                        return (_jsxs("g", { role: "button", tabIndex: 0, "aria-label": it?.label ?? "empty", "aria-pressed": !!isSelected, onClick: () => it && setSelectedId(it.id), onKeyDown: (e) => {
                                if (it && (e.key === "Enter" || e.key === " ")) {
                                    e.preventDefault();
                                    setSelectedId(it.id);
                                }
                            }, className: "cursor-clicker outline-none", children: [it && (_jsx("image", { href: it.image, x: s.cx - s.avatarSize / 2, y: s.cy - s.avatarSize / 2, width: s.avatarSize, height: s.avatarSize, preserveAspectRatio: "xMidYMid meet", clipPath: `url(#${s.clipId})`, style: { transition: "opacity 120ms linear" } })), _jsx("circle", { cx: s.cx, cy: s.cy, r: s.avatarSize / 2 + (isSelected ? 2 : 0), fill: "none", stroke: isSelected ? "#00d992" : "rgba(255,255,255,0.18)", strokeWidth: isSelected ? 3 : 1.5, className: cn("transition-[stroke,stroke-width] duration-150", !isSelected && "hover:jade/20"), filter: isSelected ? "url(#glow)" : undefined })] }, `slot-${s.r}-${s.k}`));
                    })] }), _jsxs("div", { className: "pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { "aria-label": "Scroll left", size: "icon", className: "h-10 w-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700", onClick: () => setColOffset((o) => o - 1), children: _jsx(ChevronLeft, { className: "h-5 w-5" }) }), _jsx(Button, { "aria-label": "Scroll right", size: "icon", className: "h-10 w-10 rounded-full bg-neutral-800/80 hover:bg-neutral-700", onClick: () => setColOffset((o) => o + 1), children: _jsx(ChevronRight, { className: "h-5 w-5" }) })] }), _jsx(Button, { disabled: !selectedItem, className: cn("min-w-[180px] bg-jade/70 text-liquirice font-scifi hover:bg-jade/90", !selectedItem && "opacity-50"), onClick: () => selectedItem && onConfirm(selectedItem), children: selectedItem ? `${selectedItem.label}` : "Confirm" })] })] }));
}
// ─────────────────────────────────────────────────────────────
// SheetChampionPicker (sidebar a 5 sezioni)
// ─────────────────────────────────────────────────────────────
const ROLES = ["TOP", "JNG", "MID", "ADC", "SUP"];
const ROLE_SETS = {
    TOP: new Set(TOP_CHAMPIONS),
    JNG: new Set(JNG_CHAMPIONS),
    MID: new Set(MID_CHAMPIONS),
    ADC: new Set(ADC_CHAMPIONS),
    SUP: new Set(SUP_CHAMPIONS),
};
// ── Shared champion grid content (used by both mobile + desktop) ──
function ChampionPickerContent({ items, onClose, onConfirm, hideHeader = false, }) {
    const [q, setQ] = React.useState("");
    const inputRef = React.useRef(null);
    React.useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 80);
    }, []);
    const term = q.trim().toLowerCase();
    const grouped = React.useMemo(() => {
        const base = {
            TOP: [], JNG: [], MID: [], ADC: [], SUP: [],
        };
        for (const role of ROLES) {
            const set = ROLE_SETS[role];
            base[role] = items
                .filter((c) => {
                const inRole = set.has(c.id);
                const display = champDisplayName(c.id).toLowerCase();
                const matchSearch = !term || c.label.toLowerCase().includes(term) || c.id.toLowerCase().includes(term) || display.includes(term);
                return inRole && matchSearch;
            })
                .sort((a, b) => a.label.localeCompare(b.label));
        }
        return base;
    }, [items, term]);
    return (_jsxs(_Fragment, { children: [!hideHeader && (_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("span", { className: "text-[11px] font-jetbrains text-flash/60 tracking-[0.22em] uppercase", children: "CHAMPION PICKER" }), _jsx("button", { type: "button", className: "text-[11px] text-flash/50 hover:text-flash/80 cursor-clicker font-jetbrains", onClick: () => setQ(""), children: "CLEAR" })] })), _jsx("div", { className: "flex items-center gap-2 mb-4", children: _jsx(Input, { ref: inputRef, placeholder: "Type a champion name\u2026", value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (e) => {
                        if (e.key === "Enter") {
                            // Collect all visible champs across roles
                            const allVisible = Object.values(grouped).flat();
                            // Deduplicate by id
                            const unique = [...new Map(allVisible.map(c => [c.id, c])).values()];
                            if (unique.length === 1) {
                                onConfirm(unique[0]);
                                onClose();
                            }
                        }
                    }, className: "bg-black/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20 text-sm" }) }), _jsxs("div", { className: "flex-1 overflow-y-auto pr-1 scrollbar-hide", children: [_jsx(Accordion, { type: "multiple", defaultValue: ROLES, className: "space-y-3", children: ROLES.map((role) => {
                            const champs = grouped[role];
                            if (!champs || champs.length === 0)
                                return null;
                            const label = role === "ADC" ? "BOTTOM" : role;
                            return (_jsxs(AccordionItem, { value: role, className: "border border-flash/10 rounded-sm px-2", children: [_jsxs(AccordionTrigger, { className: "flex items-center justify-between py-2 hover:no-underline", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx("span", { className: "text-[11px] font-jetbrains text-flash/60 tracking-[0.18em] uppercase", children: label }) }), _jsxs("span", { className: "text-[10px] text-flash/40", children: [champs.length, " champion", champs.length !== 1 ? "s" : ""] })] }), _jsx(AccordionContent, { className: "pb-3 pt-1", children: _jsx("div", { className: "grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-3", children: champs.map((c) => (_jsxs("button", { type: "button", className: "flex flex-col items-center gap-1 group cursor-clicker", onClick: () => { onConfirm(c); onClose(); }, children: [_jsx("div", { className: "bg-jade/10 rounded-[3px] p-[2px] border border-flash/10 group-hover:border-jade/50 transition-colors", children: _jsx("img", { src: c.image, alt: c.label, title: c.label, className: "w-10 h-10 rounded-[3px] object-cover transition-transform group-hover:scale-110", loading: "lazy", decoding: "async" }) }), _jsx("span", { className: "text-[10px] text-flash/60 truncate max-w-[64px]", children: champDisplayName(c.id) })] }, `${role}-${c.id}`))) }) })] }, role));
                        }) }), ROLES.every((r) => grouped[r].length === 0) && (_jsx("div", { className: "text-xs text-flash/40 text-center py-10", children: "No champion found for this search." }))] })] }));
}
// ── Mobile: full-screen overlay (no slide animation) ──
function MobileChampionPicker({ open, items, onClose, onConfirm, }) {
    // Lock body scroll while open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = ""; };
        }
    }, [open]);
    if (!open)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-[100] bg-liquirice flex flex-col font-jetbrains text-flash", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-flash/10", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1 h-3 bg-jade rounded-full" }), _jsx("span", { className: "text-[11px] text-flash/60 tracking-[0.22em] uppercase", children: "CHAMPION PICKER" })] }), _jsx("button", { type: "button", onClick: onClose, className: "p-1.5 text-flash/40 hover:text-flash/80 transition-colors cursor-clicker", children: _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", children: [_jsx("line", { x1: "4", y1: "4", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "4", x2: "4", y2: "12" })] }) })] }), _jsx("div", { className: "flex-1 flex flex-col px-4 py-3 overflow-hidden", children: _jsx(ChampionPickerContent, { items: items, onClose: onClose, onConfirm: onConfirm, hideHeader: true }) })] }));
}
// ── Desktop: Sheet sidebar ──
function DesktopSheetPicker({ open, items, onClose, onConfirm, }) {
    return (_jsx(Sheet, { open: open, onOpenChange: (v) => { if (!v)
            onClose(); }, children: _jsx(SheetContent, { side: "right", className: cn("w-[420px] md:w-[460px] lg:w-[520px]", "h-full flex flex-col p-0", "bg-liquirice/95 border-l border-flash/15 text-flash", "[&>button]:hidden"), children: _jsxs("div", { className: "relative flex-1 flex flex-col px-6 py-5 overflow-hidden", children: [_jsx(BorderBeam, { duration: 8, size: 110 }), _jsx(ChampionPickerContent, { items: items, onClose: onClose, onConfirm: onConfirm })] }) }) }));
}
// ── Wrapper: picks mobile vs desktop ──
function SheetChampionPicker({ open, items, onClose, onConfirm, }) {
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);
    React.useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const handler = (e) => setIsMobile(e.matches);
        setIsMobile(mq.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    if (isMobile) {
        return _jsx(MobileChampionPicker, { open: open, items: items, onClose: onClose, onConfirm: onConfirm });
    }
    return _jsx(DesktopSheetPicker, { open: open, items: items, onClose: onClose, onConfirm: onConfirm });
}
