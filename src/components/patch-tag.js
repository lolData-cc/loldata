import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// A tiny corner badge for a champion/item icon showing how it changed in the
// LATEST patch: buff ▲ (jade), nerf ▼ (red), adjusted ◆ (neutral). Renders
// nothing if the entity wasn't touched this patch. Hovering the badge reveals a
// CyberTip (same tooltip as the build tab / deep dive) listing the EXACT changes.
//
// Drop it INSIDE a `position: relative` element that wraps the icon:
//   <span className="relative inline-block">
//     <img src={champIcon(name)} .../>
//     <PatchTag kind="champion" id={name} />
//   </span>
//
// Two maps are fetched ONCE and cached process-wide: the compact direction map
// (badge color/shape) and the detailed per-entity change list (tooltip body).
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BOX_API_BASE_URL } from "@/config";
import { CyberTip } from "@/components/explorer/CyberTip";
const normChamp = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
// ── compact direction map (badge color + shape) ──────────────────────────────
let _cache = null;
let _promise = null;
function loadMap() {
    if (_cache)
        return Promise.resolve(_cache);
    if (!_promise) {
        _promise = fetch(`${BOX_API_BASE_URL}/api/patch-notes/latest-map`)
            .then((r) => r.json())
            .then((d) => {
            const champions = {};
            for (const [k, v] of Object.entries(d?.champions || {}))
                champions[normChamp(k)] = v;
            _cache = { patch: d?.patch ?? null, champions, items: d?.items || {} };
            return _cache;
        })
            .catch(() => {
            _cache = { patch: null, champions: {}, items: {} };
            return _cache;
        });
    }
    return _promise;
}
// ── detailed change list (tooltip body) ──────────────────────────────────────
let _changes = null;
let _changesPromise = null;
function loadChanges() {
    if (_changes)
        return Promise.resolve(_changes);
    if (!_changesPromise) {
        _changesPromise = fetch(`${BOX_API_BASE_URL}/api/patch-notes/latest-changes`)
            .then((r) => { if (!r.ok)
            throw new Error(String(r.status)); return r.json(); })
            .then((d) => {
            _changes = { patch: d?.patch ?? null, champions: d?.champions || {}, items: d?.items || {} };
            return _changes;
        })
            .catch(() => {
            // DON'T cache a failed fetch — reset so the next render/hover retries
            // (otherwise a single early 404, e.g. before the endpoint deployed,
            // would leave every tooltip detail-less for the whole session).
            _changesPromise = null;
            return { patch: null, champions: {}, items: {} };
        });
    }
    return _changesPromise;
}
/** Lower-level hook: the latest-patch direction for one entity, or null. */
export function usePatchDirection(kind, id) {
    const [map, setMap] = useState(_cache);
    useEffect(() => {
        if (_cache) {
            setMap(_cache);
            return;
        }
        let alive = true;
        loadMap().then((m) => alive && setMap(m));
        return () => { alive = false; };
    }, []);
    if (!map || id == null || id === "")
        return null;
    return kind === "champion" ? map.champions[normChamp(id)] ?? null : map.items[String(id)] ?? null;
}
/** The detailed change rows for one entity in the latest patch (empty until loaded). */
function usePatchChanges(kind, id) {
    const [map, setMap] = useState(_changes);
    useEffect(() => {
        if (_changes) {
            setMap(_changes);
            return;
        }
        let alive = true;
        loadChanges().then((m) => alive && setMap(m));
        return () => { alive = false; };
    }, []);
    if (!map || id == null || id === "")
        return { patch: map?.patch ?? null, rows: [] };
    const rows = kind === "champion" ? map.champions[normChamp(id)] ?? [] : map.items[String(id)] ?? [];
    return { patch: map.patch, rows };
}
const CFG = {
    buff: { ring: "ring-[#00d992]/55", bg: "bg-[#04140e]", fg: "text-[#00d992]", dot: "bg-[#00d992]", label: "Buffed this patch" },
    nerf: { ring: "ring-[#d63336]/55", bg: "bg-[#170809]", fg: "text-[#ff5b5e]", dot: "bg-[#ff5b5e]", label: "Nerfed this patch" },
    adjust: { ring: "ring-flash/40", bg: "bg-[#0c1012]", fg: "text-flash/80", dot: "bg-flash/50", label: "Adjusted this patch" },
};
const CORNER = {
    tr: "-top-1 -right-1",
    tl: "-top-1 -left-1",
    br: "-bottom-1 -right-1",
    bl: "-bottom-1 -left-1",
};
// per-change-row color (each individual stat can move a different direction).
const rowColor = (d) => (d === "buff" ? "text-[#00d992]" : d === "nerf" ? "text-[#ff5b5e]" : "text-flash/70");
// Sharp, FILLED glyphs (not lucide line-arrows): a solid triangle pointing up
// (buff) / down (nerf), or a diamond (adjust) — the "cyber" look the user drew.
function DirGlyph({ dir, px }) {
    const d = dir === "buff"
        ? "M5 0.7 L9.3 8.4 L0.7 8.4 Z" // up triangle
        : dir === "nerf"
            ? "M0.7 1.6 L9.3 1.6 L5 9.3 Z" // down triangle
            : "M5 0.5 L9.5 5 L5 9.5 L0.5 5 Z"; // diamond (adjust)
    return (_jsx("svg", { width: px, height: px, viewBox: "0 0 10 10", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: d }) }));
}
// The tooltip body — the patch label, the net verdict, and the exact stat moves.
function ChangesTip({ dir, patch, rows }) {
    const c = CFG[dir];
    const MAX = 8;
    const shown = rows.slice(0, MAX);
    const more = rows.length - shown.length;
    return (_jsxs("div", { className: "text-left", children: [_jsxs("div", { className: "mb-1.5 flex items-center gap-1.5", children: [_jsx("span", { className: cn("inline-block h-1.5 w-1.5 rounded-[1px]", c.dot) }), _jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-flash/90", children: c.label }), patch && _jsxs("span", { className: "ml-auto pl-3 text-[9.5px] font-light text-flash/40", children: ["Patch ", patch] })] }), shown.length > 0 ? (_jsx("ul", { className: "space-y-1", children: shown.map((ch, i) => (_jsxs("li", { className: "flex items-baseline justify-between gap-3", children: [_jsx("span", { className: "text-flash/65", children: ch.label }), _jsxs("span", { className: "flex shrink-0 items-baseline gap-1 tabular-nums", children: [_jsx("span", { className: "text-flash/40", children: ch.old ?? "—" }), _jsx("span", { className: rowColor(ch.direction), children: "\u2192" }), _jsx("span", { className: cn("font-semibold", rowColor(ch.direction)), children: ch.new ?? "—" })] })] }, i))) })) : (_jsx("div", { className: "text-flash/45", children: "Changed this patch." })), more > 0 && _jsxs("div", { className: "mt-1.5 text-[9.5px] text-flash/35", children: ["+", more, " more change", more > 1 ? "s" : ""] })] }));
}
export function PatchTag({ kind, id, size = 13, corner = "tr", className }) {
    const dir = usePatchDirection(kind, id);
    const { patch, rows } = usePatchChanges(kind, id);
    if (!dir)
        return null;
    const c = CFG[dir];
    // The visual badge: a rounded-SQUARE chip (angular, tech feel) with the glyph.
    const badge = (_jsx("span", { className: cn("grid place-items-center rounded-[3px] ring-1 shadow-[0_1px_4px_rgba(var(--c-shadow),0.65)]", c.ring, c.bg, c.fg), style: { width: size, height: size }, children: _jsx(DirGlyph, { dir: dir, px: Math.round(size * 0.6) }) }));
    return (
    // Outer span owns the corner positioning; the CyberTip wraps the badge so the
    // tooltip (portal-rendered) anchors to the chip. pointer-events on → hoverable;
    // a click still bubbles up to the icon/card underneath.
    _jsx("span", { className: cn("absolute z-20 cursor-help", CORNER[corner], className), "aria-label": c.label, children: _jsx(CyberTip, { side: "top", tip: _jsx(ChangesTip, { dir: dir, patch: patch, rows: rows }), children: badge }) }));
}
