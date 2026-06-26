import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ChampionDialog — the ONE champion picker used across the site (summoner
// filter, VS opponent, Explorer, …). Clean cyber dialog: the full roster in a
// grid, live search, keyboard nav. Self-sources the roster via useChampions, so
// callers never pass a list. Emits the chosen Champion (slug + key + name).
//
// Two ways to use it:
//   • Uncontrolled — pass a `trigger`; clicking it opens the dialog.
//   • Controlled  — pass `open` + `onOpenChange` and open it programmatically.
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { BorderBeam } from "@/components/ui/border-beam";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";
import { useChampions } from "@/hooks/useChampions";
const COLS = 7; // grid columns — also drives up/down keyboard nav
// Pin frequently-picked champions to the top. Pick counts live in localStorage;
// once a champion reaches RECENT_THRESHOLD picks it becomes a "recent" and floats
// above the alphabetical roster (most-picked first). Shared by every picker.
const PICK_KEY = "champPickCounts";
const RECENT_THRESHOLD = 3;
function getPickCounts() {
    try {
        return JSON.parse(localStorage.getItem(PICK_KEY) || "{}") || {};
    }
    catch {
        return {};
    }
}
function bumpPick(slug) {
    try {
        const counts = getPickCounts();
        counts[slug] = (counts[slug] ?? 0) + 1;
        localStorage.setItem(PICK_KEY, JSON.stringify(counts));
    }
    catch { /* localStorage unavailable — picker still works, just no recents */ }
}
export function ChampionDialog({ value = null, onSelect, onClear, allowAny = false, onAny, open, onOpenChange, trigger, title = "Select champion", }) {
    const controlled = open !== undefined;
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = controlled ? open : internalOpen;
    const setOpen = (o) => {
        if (!controlled)
            setInternalOpen(o);
        onOpenChange?.(o);
    };
    return (_jsxs(Dialog, { open: isOpen, onOpenChange: setOpen, children: [trigger && !controlled && _jsx(DialogTrigger, { asChild: true, children: trigger }), _jsx(DialogContent, { className: "w-full max-w-[600px] bg-transparent shadow-none border-none p-0 [&>button]:hidden", children: isOpen && (_jsx(PickerBody, { value: value, title: title, allowAny: allowAny, onPick: (c) => {
                        bumpPick(c.slug);
                        onSelect(c);
                        setOpen(false);
                    }, onAny: allowAny && onAny ? () => { onAny(); setOpen(false); } : undefined, onClear: onClear ? () => { onClear(); setOpen(false); } : undefined, onClose: () => setOpen(false) })) })] }));
}
function PickerBody({ value, title, allowAny, onPick, onAny, onClear, onClose, }) {
    const { champions, loading } = useChampions();
    const [search, setSearch] = useState("");
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    const gridRef = useRef(null);
    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 40);
        return () => clearTimeout(t);
    }, []);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return champions;
        return champions.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
    }, [champions, search]);
    // pick counts, read once when the dialog opens. Champions at/above the
    // threshold float to the top (most-picked first), even within search results.
    const counts = useMemo(() => getPickCounts(), []);
    const ordered = useMemo(() => {
        const recents = filtered
            .filter((c) => (counts[c.slug] ?? 0) >= RECENT_THRESHOLD)
            .sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0));
        if (recents.length === 0)
            return filtered;
        const pinned = new Set(recents.map((c) => c.slug));
        return [...recents, ...filtered.filter((c) => !pinned.has(c.slug))];
    }, [filtered, counts]);
    useEffect(() => setActive(0), [search]);
    // keep the highlighted tile in view
    useEffect(() => {
        const el = gridRef.current?.querySelector(`[data-idx="${active}"]`);
        el?.scrollIntoView({ block: "nearest" });
    }, [active]);
    const onKeyDown = (e) => {
        if (!ordered.length)
            return;
        const move = (d) => {
            e.preventDefault();
            setActive((i) => Math.max(0, Math.min(ordered.length - 1, i + d)));
        };
        if (e.key === "ArrowRight")
            move(1);
        else if (e.key === "ArrowLeft")
            move(-1);
        else if (e.key === "ArrowDown")
            move(COLS);
        else if (e.key === "ArrowUp")
            move(-COLS);
        else if (e.key === "Enter") {
            e.preventDefault();
            const c = ordered[active];
            if (c)
                onPick(c);
        }
    };
    return (_jsx("div", { className: "relative w-full", onKeyDown: onKeyDown, children: _jsxs("div", { className: "relative overflow-hidden rounded-lg border border-white/15 bg-black/55 backdrop-blur-2xl saturate-150 shadow-[0_0_0_1px_rgba(0,217,146,0.16),0_18px_50px_rgba(0,0,0,0.65)]", children: [_jsx(BorderBeam, { duration: 8, size: 130 }), _jsxs("div", { className: "relative z-10 flex flex-col", children: [_jsxs("div", { className: "px-4 pt-4 pb-3 border-b border-white/[0.06]", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-1 h-3 bg-jade rounded-full" }), _jsx("span", { className: "text-[11px] font-jetbrains text-flash/50 tracking-[0.2em] uppercase", children: title })] }), _jsxs("div", { className: "flex items-center gap-2", children: [onClear && (_jsx("button", { type: "button", onClick: onClear, className: "text-[9px] font-jetbrains uppercase tracking-[0.2em] px-2 py-0.5 border border-white/[0.06] rounded-sm text-flash/30 hover:text-jade hover:border-jade/30 hover:bg-jade/5 transition-all cursor-clicker", children: "Clear" })), _jsx("button", { type: "button", onClick: onClose, className: "text-flash/35 hover:text-flash transition-colors cursor-clicker", "aria-label": "Close", children: _jsx(X, { size: 15 }) })] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-flash/30" }), _jsx("input", { ref: inputRef, type: "text", placeholder: "Search champion\u2026", value: search, onChange: (e) => setSearch(e.target.value), className: "w-full bg-white/[0.03] border border-white/[0.07] rounded-sm pl-9 pr-3 py-2 text-[13px] font-jetbrains text-flash placeholder:text-flash/25 focus:outline-none focus:border-jade/35 transition-colors" }), _jsx("div", { className: cn("absolute bottom-0 left-0 h-[1px] bg-jade/50 transition-all duration-300", search.length > 0 ? "w-full" : "w-0") })] })] }), _jsx("div", { ref: gridRef, className: "h-[46vh] max-h-[420px] min-h-[260px] overflow-y-auto overscroll-none p-3 cyber-scrollbar", children: loading ? (_jsx("div", { className: "flex items-center justify-center h-full text-[11px] font-jetbrains text-flash/30 uppercase tracking-[0.2em]", children: "Loading roster\u2026" })) : filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full gap-3", children: [_jsxs("svg", { width: "36", height: "36", viewBox: "0 0 36 36", className: "opacity-20", children: [_jsx("polygon", { points: "18,2 32,10 32,26 18,34 4,26 4,10", fill: "none", stroke: "#00d992", strokeWidth: "1" }), _jsx("line", { x1: "12", y1: "12", x2: "24", y2: "24", stroke: "#00d992", strokeWidth: "1.5", strokeLinecap: "round" }), _jsx("line", { x1: "24", y1: "12", x2: "12", y2: "24", stroke: "#00d992", strokeWidth: "1.5", strokeLinecap: "round" })] }), _jsx("span", { className: "text-[10px] font-jetbrains text-flash/25 uppercase tracking-[0.2em]", children: "No match found" })] })) : (_jsxs("div", { className: "grid gap-1.5", style: { gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }, children: [allowAny && onAny && !search.trim() && (_jsxs("button", { type: "button", onClick: onAny, title: "Any champion", className: cn("group flex flex-col items-center gap-1.5 py-2 px-1 rounded-[5px] cursor-clicker border transition-all duration-150", value == null
                                            ? "border-jade/60 bg-jade/15"
                                            : "border-jade/20 bg-jade/[0.05] hover:bg-jade/[0.12] hover:border-jade/40"), children: [_jsx("div", { className: cn("w-11 h-11 rounded-[4px] grid place-items-center border transition-colors duration-150", value == null ? "border-jade/50" : "border-jade/25 group-hover:border-jade/40"), children: _jsx("span", { className: "text-jade text-[20px] leading-none font-chakrapetch", children: "\u2200" }) }), _jsx("span", { className: "text-[10px] font-chakrapetch font-medium truncate max-w-[66px] text-jade", children: "Any" })] })), ordered.map((champ, i) => {
                                        const selected = value === champ.slug;
                                        const isActive = i === active;
                                        const isRecent = (counts[champ.slug] ?? 0) >= RECENT_THRESHOLD;
                                        return (_jsxs("button", { type: "button", "data-idx": i, onMouseEnter: () => setActive(i), onClick: () => onPick(champ), title: isRecent ? `${champ.name} · recent` : champ.name, className: cn("group relative flex flex-col items-center gap-1.5 py-2 px-1 rounded-[5px] cursor-clicker border transition-all duration-150", selected
                                                ? "border-jade/60 bg-jade/15"
                                                : isActive
                                                    ? "border-jade/30 bg-jade/10"
                                                    : "border-white/[0.06] bg-white/[0.02] hover:bg-jade/[0.08] hover:border-jade/30"), children: [isRecent && _jsx("span", { className: "absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-jade shadow-[0_0_5px_rgba(0,217,146,0.95)]" }), _jsx("div", { className: cn("w-11 h-11 rounded-[4px] overflow-hidden border transition-colors duration-150", selected ? "border-jade/50" : isActive ? "border-jade/40" : "border-white/10 group-hover:border-jade/40"), children: _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${champ.slug}.png`, alt: champ.name, loading: "lazy", className: cn("w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.16]", isActive && "scale-[1.16]"), onError: (e) => (e.target.style.visibility = "hidden") }) }), _jsx("span", { className: cn("text-[10px] font-chakrapetch font-medium truncate max-w-[66px] transition-colors", selected ? "text-jade" : isActive ? "text-jade" : "text-flash/75 group-hover:text-jade"), children: champ.name })] }, champ.slug));
                                    })] })) }), _jsxs("div", { className: "px-4 py-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] font-jetbrains text-flash/25 uppercase tracking-[0.18em]", children: [_jsxs("span", { children: [filtered.length, " champions"] }), _jsx("span", { className: "hidden sm:inline", children: "\u2191\u2193\u2190\u2192 navigate \u00B7 enter select \u00B7 esc close" })] })] })] }) }));
}
