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
import { champDisplayName, cdnBaseUrl, BOX_API_BASE_URL } from "@/config";
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
    return (_jsxs("div", { className: "fixed inset-0 z-[100]", children: [_jsx("div", { className: "absolute inset-0 bg-black/0", onClick: onClose }), _jsx("div", { className: "absolute inset-x-0 bottom-0 h-[320px] md:h-[380px]\n                   bg-gradient-to-t from-neutral-950/95 via-neutral-950/80 to-neutral-950/20", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "relative h-full w-full overflow-hidden", children: [_jsx("div", { className: "pointer-events-none absolute inset-0\n                       backdrop-blur-xl\n                       [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,.75)_35%,rgba(0,0,0,.35)_65%,rgba(0,0,0,0)_100%)]\n                       [-webkit-mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,.75)_35%,rgba(0,0,0,.35)_65%,rgba(0,0,0,0)_100%)]" }), _jsx(RadialWheel, { items: items, onConfirm: onConfirm }), _jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-neutral-950/90 to-transparent" })] }) })] }));
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
/* ── Favourites ────────────────────────────────────────────────────────────
   Held locally: this is a per-browser shelf, not account state, so it needs no
   round trip and works logged out. The custom event keeps every mounted picker
   (desktop sheet + mobile overlay can both exist) in step, and `storage` keeps
   other tabs in step — neither fires in the tab that wrote, hence both. */
const FAV_KEY = "champFavourites";
const FAV_EVENT = "champFavourites:changed";
function readFavourites() {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
        return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
    }
    catch {
        return [];
    }
}
function useFavourites() {
    const [favs, setFavs] = React.useState(readFavourites);
    React.useEffect(() => {
        const sync = () => setFavs(readFavourites());
        window.addEventListener(FAV_EVENT, sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener(FAV_EVENT, sync);
            window.removeEventListener("storage", sync);
        };
    }, []);
    const toggle = React.useCallback((id) => {
        const next = readFavourites();
        const i = next.indexOf(id);
        if (i >= 0)
            next.splice(i, 1);
        else
            next.unshift(id); // newest first — the shelf reads as a recency stack
        localStorage.setItem(FAV_KEY, JSON.stringify(next.slice(0, 40)));
        window.dispatchEvent(new Event(FAV_EVENT));
        return i < 0; // true when it was just added
    }, []);
    return { favs, toggle };
}
// Long enough not to fire on a normal click, short enough not to feel stuck.
const HOLD_MS = 620;
/** One champion. A tap selects; a press-and-hold saves.
 *
 *  The progress ring is a CSS transition on stroke-dashoffset, not a timer
 *  redrawing every frame: the compositor interpolates it, so it stays smooth
 *  even while the grid scrolls, and releasing early just transitions back. */
function ChampTile({ c, role, isFav, onPick, onHoldComplete, }) {
    const [holding, setHolding] = React.useState(false);
    const [burst, setBurst] = React.useState(false);
    const timer = React.useRef(null);
    const fired = React.useRef(false);
    const clear = () => {
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = null;
    };
    React.useEffect(() => clear, []);
    const start = () => {
        fired.current = false;
        setHolding(true);
        clear();
        timer.current = setTimeout(() => {
            fired.current = true;
            setHolding(false);
            setBurst(true);
            setTimeout(() => setBurst(false), 480);
            onHoldComplete();
        }, HOLD_MS);
    };
    const end = () => {
        clear();
        setHolding(false);
    };
    return (_jsxs("button", { type: "button", className: "relative w-full flex flex-col items-center gap-1 group cursor-clicker select-none", 
        // A completed hold must not also fire the click, or saving would select
        // the champion and close the sheet.
        onClick: () => { if (!fired.current)
            onPick(); }, onPointerDown: start, onPointerUp: end, onPointerLeave: end, onPointerCancel: end, onContextMenu: (e) => e.preventDefault(), title: isFav ? `${c.label} · hold to unsave` : `${c.label} · hold to save`, children: [_jsxs("div", { className: "relative w-full max-w-[46px] aspect-square mx-auto", children: [_jsxs("div", { className: cn("absolute inset-0 rounded-[5px] overflow-hidden bg-jade/10 cp-art", holding && "cp-art-holding"), children: [_jsx("img", { src: c.image, alt: c.label, className: "w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.12]", loading: "lazy", decoding: "async", draggable: false }), _jsx("div", { className: "absolute inset-0 bg-liquirice transition-opacity duration-300", style: { opacity: holding ? 0.34 : 0 } })] }), _jsxs("svg", { className: "absolute inset-0 w-full h-full pointer-events-none overflow-visible", viewBox: "0 0 46 46", "aria-hidden": true, children: [_jsx("rect", { x: "1", y: "1", width: "44", height: "44", rx: "5", fill: "none", stroke: isFav ? "rgba(0,217,146,0.55)" : "rgba(255,255,255,0.10)", strokeWidth: "1.5", className: "transition-[stroke] duration-300" }), _jsx("rect", { x: "1", y: "1", width: "44", height: "44", rx: "5", fill: "none", stroke: "rgb(0,217,146)", strokeWidth: "2.5", strokeLinecap: "round", pathLength: 100, strokeDasharray: "100", strokeDashoffset: holding ? 0 : 100, style: {
                                    transition: holding
                                        ? `stroke-dashoffset ${HOLD_MS}ms linear, opacity 120ms ease`
                                        : "stroke-dashoffset 260ms cubic-bezier(0.22,1,0.36,1), opacity 260ms ease",
                                    opacity: holding ? 1 : 0,
                                    filter: "drop-shadow(0 0 5px rgba(0,217,146,0.85))",
                                } }), burst && (_jsx("rect", { x: "1", y: "1", width: "44", height: "44", rx: "5", fill: "none", stroke: "rgb(0,217,146)", strokeWidth: "2", className: "cp-bloom" }))] }), isFav && (_jsx("span", { className: "cp-badge absolute top-[2px] right-[2px] w-[13px] h-[13px] rounded-full bg-jade grid place-items-center shadow-[0_0_6px_rgba(0,217,146,0.7)] ring-1 ring-liquirice", "aria-hidden": true, children: _jsx("svg", { viewBox: "0 0 24 24", className: "w-[8px] h-[8px]", fill: "#040A0C", children: _jsx("path", { d: "M12 2.6l2.62 5.94 6.38.57-4.82 4.28 1.43 6.31L12 16.4l-5.61 3.3 1.43-6.31L3 9.11l6.38-.57z" }) }) }, `badge-${c.id}`))] }), _jsx("span", { className: cn("w-full text-center text-[10px] leading-tight truncate px-0.5", isFav ? "text-jade/80" : "text-flash/60"), children: champDisplayName(c.id) })] }, `${role}-${c.id}`));
}
const ROLES = ["TOP", "JNG", "MID", "ADC", "SUP"];
const ROLE_SETS = {
    TOP: new Set(TOP_CHAMPIONS),
    JNG: new Set(JNG_CHAMPIONS),
    MID: new Set(MID_CHAMPIONS),
    ADC: new Set(ADC_CHAMPIONS),
    SUP: new Set(SUP_CHAMPIONS),
};
// Most-popular-by-role, sourced LIVE from the tier list (regenerated nightly /
// per-patch) so the picker auto-updates and includes EVERY champ — no more
// hardcoded list that missed new champs (Locke) or had wrong ids ("KaiSa" vs
// the real "Kaisa"). Falls back to the hardcoded ROLE_SETS if the fetch fails.
const BOX_ROLE_TO_PICKER = { TOP: "TOP", JUNGLE: "JNG", MIDDLE: "MID", BOTTOM: "ADC", UTILITY: "SUP" };
const BOX_ROLES = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];
let _roleChampsCache = null;
function useRoleChamps() {
    const [rc, setRc] = React.useState(_roleChampsCache);
    React.useEffect(() => {
        if (_roleChampsCache)
            return;
        let cancelled = false;
        // The tier list serves ONE role per request (default JUNGLE), so fetch all
        // five (region=ALL = the global pool) and merge by most-popular (games desc).
        Promise.all(BOX_ROLES.map((r) => fetch(`${BOX_API_BASE_URL}/api/tierlist?role=${r}&region=ALL`)
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null))).then((results) => {
            if (cancelled)
                return;
            // Games per champion per role, so a champion can be judged against its
            // OWN play pattern rather than against the size of the role.
            const byChamp = new Map();
            let any = false;
            for (const d of results) {
                if (!d?.champions?.length)
                    continue;
                for (const c of d.champions) {
                    const role = BOX_ROLE_TO_PICKER[c.role];
                    if (!role || !c.champion_name)
                        continue;
                    const name = String(c.champion_name);
                    const rec = byChamp.get(name) ?? {};
                    rec[role] = (rec[role] ?? 0) + (Number(c.games) || 0);
                    byChamp.set(name, rec);
                    any = true;
                }
            }
            if (!any)
                return; // every fetch failed → keep the hardcoded fallback
            // A champion belongs to a role when a meaningful share of ITS games are
            // played there — not merely because the role has a non-zero count.
            // Without this the tier list put Maokai, Sejuani, Zilean and Akshan in
            // TOP on 9-15% of their games, and TOP listed 134 champions.
            //
            // The split is bimodal, which is why the exact cut barely matters: real
            // role players sit at 55-92% (Garen 91, Sett 92, Aatrox 73) and off-role
            // noise at under 15%. 18% keeps the genuine flex picks — Pantheon TOP 31%,
            // Akali 28%, Elise SUPPORT 31%, Maokai JUNGLE 23% — and drops the rest.
            const ROLE_SHARE_MIN = 0.18;
            const acc = { TOP: [], JNG: [], MID: [], ADC: [], SUP: [] };
            for (const [name, rec] of byChamp) {
                const total = ROLES.reduce((n, r) => n + (rec[r] ?? 0), 0);
                if (total <= 0)
                    continue;
                // Every champion keeps its single best role no matter how thin the
                // spread, so nobody can end up unpickable in every shelf.
                let bestRole = ROLES[0];
                for (const r of ROLES)
                    if ((rec[r] ?? 0) > (rec[bestRole] ?? 0))
                        bestRole = r;
                for (const r of ROLES) {
                    const g = rec[r] ?? 0;
                    if (g > 0 && (g / total >= ROLE_SHARE_MIN || r === bestRole)) {
                        acc[r].push({ name, games: g });
                    }
                }
            }
            const out = { TOP: [], JNG: [], MID: [], ADC: [], SUP: [] };
            for (const role of ROLES)
                out[role] = acc[role].sort((a, b) => b.games - a.games).map((x) => x.name);
            // Safety net: any champ the snapshot omits entirely (brand-new, or <200
            // games in every role) falls back to its hardcoded role so it can never
            // become unpickable — appended after the popular ones.
            const covered = new Set(ROLES.flatMap((r) => out[r]));
            for (const role of ROLES)
                for (const id of ROLE_SETS[role])
                    if (!covered.has(id))
                        out[role].push(id);
            _roleChampsCache = out;
            setRc(out);
        });
        return () => {
            cancelled = true;
        };
    }, []);
    return rc;
}
// ── Shared champion grid content (used by both mobile + desktop) ──
function ChampionPickerContent({ items, onClose, onConfirm, hideHeader = false, }) {
    const [q, setQ] = React.useState("");
    const inputRef = React.useRef(null);
    React.useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 80);
    }, []);
    const term = q.trim().toLowerCase();
    const roleChamps = useRoleChamps();
    const { favs, toggle } = useFavourites();
    const grouped = React.useMemo(() => {
        const base = {
            TOP: [], JNG: [], MID: [], ADC: [], SUP: [],
        };
        for (const role of ROLES) {
            const dyn = roleChamps?.[role];
            const useDyn = !!dyn && dyn.length > 0;
            const set = useDyn ? new Set(dyn) : ROLE_SETS[role];
            // Popularity order from the tier list (index = rank); fall back to A→Z.
            const orderIdx = useDyn ? new Map(dyn.map((id, i) => [id, i])) : null;
            base[role] = items
                .filter((c) => {
                const inRole = set.has(c.id);
                const display = champDisplayName(c.id).toLowerCase();
                const matchSearch = !term || c.label.toLowerCase().includes(term) || c.id.toLowerCase().includes(term) || display.includes(term);
                return inRole && matchSearch;
            })
                .sort((a, b) => orderIdx
                ? (orderIdx.get(a.id) ?? 9999) - (orderIdx.get(b.id) ?? 9999)
                : a.label.localeCompare(b.label));
        }
        return base;
    }, [items, term, roleChamps]);
    // Saved champions, in save order, filtered by the same search term as the
    // role shelves so the whole sheet responds to typing as one surface.
    const favChamps = React.useMemo(() => {
        const byId = new Map(items.map((c) => [c.id, c]));
        return favs
            .map((id) => byId.get(id))
            .filter((c) => !!c)
            .filter((c) => {
            if (!term)
                return true;
            const display = champDisplayName(c.id).toLowerCase();
            return c.label.toLowerCase().includes(term) || c.id.toLowerCase().includes(term) || display.includes(term);
        });
    }, [items, favs, term]);
    return (_jsxs(_Fragment, { children: [!hideHeader && (_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex flex-col gap-[3px]", children: [_jsx("span", { className: "text-[11px] font-jetbrains text-flash/60 tracking-[0.22em] uppercase", children: "CHAMPION PICKER" }), _jsx("span", { className: "text-[9px] font-jetbrains text-jade/50 tracking-[0.22em] uppercase", children: "tap + hold to save" })] }), _jsx("button", { type: "button", className: "text-[11px] text-flash/50 hover:text-flash/80 cursor-clicker font-jetbrains", onClick: () => setQ(""), children: "CLEAR" })] })), _jsx("div", { className: "flex items-center gap-2 mb-4", children: _jsx(Input, { ref: inputRef, placeholder: "Type a champion name\u2026", value: q, onChange: (e) => setQ(e.target.value), onKeyDown: (e) => {
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
                    }, className: "bg-filmdark/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20 text-sm" }) }), _jsxs("div", { className: "flex-1 overflow-y-auto pr-1 scrollbar-hide", children: [_jsxs(Accordion, { type: "multiple", defaultValue: ["FAV", ...ROLES], className: "space-y-3", children: [favChamps.length > 0 && (_jsxs(AccordionItem, { value: "FAV", className: "border border-jade/25 rounded-sm px-2 bg-jade/[0.03]", children: [_jsxs(AccordionTrigger, { className: "flex items-center justify-between py-2 hover:no-underline", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx("span", { className: "text-[11px] font-jetbrains text-jade/80 tracking-[0.18em] uppercase", children: "FAVORITES" }) }), _jsxs("span", { className: "text-[10px] text-jade/45", children: [favChamps.length, " champion", favChamps.length !== 1 ? "s" : ""] })] }), _jsx(AccordionContent, { className: "pb-3 pt-2.5", children: _jsx("div", { className: "grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-3", children: favChamps.map((c) => (_jsx("div", { className: "cp-enter", children: _jsx(ChampTile, { c: c, role: "fav", isFav: true, onPick: () => { onConfirm(c); onClose(); }, onHoldComplete: () => toggle(c.id) }) }, `fav-${c.id}`))) }) })] })), ROLES.map((role) => {
                                const champs = grouped[role];
                                if (!champs || champs.length === 0)
                                    return null;
                                const label = role === "ADC" ? "BOTTOM" : role;
                                return (_jsxs(AccordionItem, { value: role, className: "border border-flash/10 rounded-sm px-2", children: [_jsxs(AccordionTrigger, { className: "flex items-center justify-between py-2 hover:no-underline", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx("span", { className: "text-[11px] font-jetbrains text-flash/60 tracking-[0.18em] uppercase", children: label }) }), _jsxs("span", { className: "text-[10px] text-flash/40", children: [champs.length, " champion", champs.length !== 1 ? "s" : ""] })] }), _jsx(AccordionContent, { className: "pb-3 pt-2.5", children: _jsx("div", { className: "grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-3", children: champs.map((c) => (_jsx(ChampTile, { c: c, role: role, isFav: favs.includes(c.id), onPick: () => { onConfirm(c); onClose(); }, onHoldComplete: () => toggle(c.id) }, `${role}-${c.id}`))) }) })] }, role));
                            })] }), ROLES.every((r) => grouped[r].length === 0) && (_jsx("div", { className: "text-xs text-flash/40 text-center py-10", children: "No champion found for this search." }))] })] }));
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
