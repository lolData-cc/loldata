import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/pages/itempage.tsx
//
// Item detail page — completely reworked to match the rest of the
// site's visual language (championdetailpage.tsx is the closest
// analog). All data-fetching logic, retry behaviour, race-condition
// guards, and URL params are preserved verbatim from the previous
// implementation; only the layout, typography and motion changed.
import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, ChevronDown, Coins, Sparkles, Users } from "lucide-react";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";
// ─── Brand tokens (shared with hero / search dialog / Jax) ──────────
const EASE_BRAND = [0.22, 1, 0.36, 1];
// `glassDark` recipe extracted from summonerpage.tsx so the page
// reads as native to the site rather than a fork of a fork.
const glassDark = cn("relative overflow-hidden rounded-md", "bg-black/25 backdrop-blur-lg saturate-150", "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]");
// ─── Fetch helper with timeout + exponential backoff retries ────────
// Verbatim from the previous version — production-tested.
async function fetchJsonWithRetry(url, options = {}, retryCfg = { retries: 2, backoffMs: 600 }) {
    const { timeoutMs = 8000, ...rest } = options;
    let attempt = 0;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    while (true) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, { ...rest, signal: controller.signal });
            if (!res.ok) {
                if ([502, 503, 504].includes(res.status) &&
                    attempt < retryCfg.retries) {
                    attempt++;
                    await sleep(retryCfg.backoffMs * Math.pow(2, attempt - 1));
                    continue;
                }
                const text = await res.text().catch(() => "");
                throw new Error(`HTTP ${res.status} ${text}`.trim());
            }
            return await res.json();
        }
        catch (err) {
            const isAbort = err?.name === "AbortError";
            if ((isAbort || err?.message?.includes("NetworkError")) &&
                attempt < retryCfg.retries) {
                attempt++;
                await sleep(retryCfg.backoffMs * Math.pow(2, attempt - 1));
                continue;
            }
            throw err;
        }
        finally {
            clearTimeout(id);
        }
    }
}
// ─── Reusable: section header with jade caps + gradient divider ─────
// Mirrors the section-header pattern used across champion detail
// page and elsewhere — same vocabulary, no surprises.
function SectionHeader({ children, icon: Icon, }) {
    return (_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [Icon ? _jsx(Icon, { className: "w-3.5 h-3.5 text-jade/70" }) : null, _jsx("span", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/65 whitespace-nowrap", children: children }), _jsx("div", { className: "h-px flex-1 bg-gradient-to-r from-jade/20 to-transparent" })] }));
}
// ─── Page ───────────────────────────────────────────────────────────
export default function ItemPage() {
    const { itemId } = useParams();
    // === Item data (CDN) ===
    const [itemData, setItemData] = useState(null);
    const [itemDataError, setItemDataError] = useState(false);
    // === Filters (rank/role/champion-ids) ===
    const [rank, setRank] = useState("");
    const [role, setRole] = useState("");
    const [championIds, setChampionIds] = useState([]);
    const [championCsv, setChampionCsv] = useState("");
    // === Stats ===
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [statsError, setStatsError] = useState(null);
    // === Best utilizers ===
    const [bestRows, setBestRows] = useState([]);
    const [loadingBest, setLoadingBest] = useState(false);
    // === Champion id → DDragon name map ===
    const [idToName, setIdToName] = useState({});
    const champPath = `${cdnBaseUrl()}/img/champion`;
    // Parse CSV → number[] (debounced via React batching).
    useEffect(() => {
        const parsed = championCsv
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
        setChampionIds(parsed);
    }, [championCsv]);
    // Fetch item JSON from the CDN.
    useEffect(() => {
        if (!itemId)
            return;
        setItemDataError(false);
        fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
            .then((res) => res.json())
            .then((data) => {
            const found = data.data[itemId];
            if (!found) {
                setItemDataError(true);
                setItemData(null);
            }
            else {
                setItemData(found);
            }
        })
            .catch(() => {
            setItemDataError(true);
            setItemData(null);
        });
    }, [itemId]);
    // Champion-name map (one-shot).
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then((r) => r.json())
            .then((json) => {
            const map = {};
            Object.entries(json.data).forEach(([name, champ]) => {
                const keyNum = Number(champ.key);
                if (Number.isFinite(keyNum))
                    map[keyNum] = name;
            });
            setIdToName(map);
        })
            .catch(() => setIdToName({}));
    }, []);
    // Stats with race-condition guard.
    useEffect(() => {
        if (!itemId)
            return;
        let active = true;
        setLoadingStats(true);
        setStatsError(null);
        fetchJsonWithRetry(`${API_BASE_URL}/api/itemstats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemId: Number(itemId),
                tier: rank || null,
                role: role || null,
                championIds: championIds.length ? championIds : null,
                queues: [420, 440],
            }),
            timeoutMs: 12000,
        }, { retries: 2, backoffMs: 700 })
            .then((json) => {
            if (!active)
                return;
            setStats(json?.stats ?? null);
        })
            .catch(() => {
            if (!active)
                return;
            setStats(null);
            setStatsError("Couldn't load the stats. Try again in a moment.");
        })
            .finally(() => {
            if (!active)
                return;
            setLoadingStats(false);
        });
        return () => {
            active = false;
        };
    }, [itemId, rank, role, championIds]);
    // Best utilizers with race-condition guard.
    useEffect(() => {
        if (!itemId)
            return;
        let active = true;
        setLoadingBest(true);
        fetchJsonWithRetry(`${API_BASE_URL}/api/itembestutilizers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemId: Number(itemId),
                tier: rank || null,
                role: role || null,
                queues: [420, 440],
                minGames: 5,
            }),
            timeoutMs: 12000,
        }, { retries: 2, backoffMs: 700 })
            .then((json) => {
            if (!active)
                return;
            setBestRows(Array.isArray(json?.rows) ? json.rows : []);
        })
            .catch(() => {
            if (!active)
                return;
            setBestRows([]);
        })
            .finally(() => {
            if (!active)
                return;
            setLoadingBest(false);
        });
        return () => {
            active = false;
        };
    }, [itemId, rank, role]);
    // ─── Loading + error states ──────────────────────────────────────
    if (itemDataError) {
        return (_jsxs("div", { className: "py-24 flex flex-col items-center justify-center gap-3 text-center", children: [_jsx("div", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-jade/60", children: "\u25C7 NOT FOUND" }), _jsx("h1", { className: "font-jetbrains text-2xl text-flash/85", children: "Item not in catalogue" }), _jsxs("p", { className: "text-sm text-flash/55 max-w-md", children: ["ID ", _jsx("code", { className: "text-flash/80", children: itemId }), " wasn't found in the current patch's item list."] }), _jsxs(Link, { to: "/champions", className: "mt-2 inline-flex items-center gap-2 text-jade/80 hover:text-jade font-mono uppercase text-[11px] tracking-[0.2em]", children: [_jsx(ArrowRight, { className: "w-3.5 h-3.5 rotate-180" }), "Back"] })] }));
    }
    if (!itemData)
        return _jsx(ItemSkeleton, {});
    // 📌 Extracted data points (verbatim selectors).
    const name = itemData.name;
    const description = itemData.description; // HTML
    const lore = itemData.plaintext;
    const costTotal = itemData.gold?.total;
    const costBase = itemData.gold?.base;
    const costSell = itemData.gold?.sell;
    const buildFrom = itemData.from || [];
    const buildInto = itemData.into || [];
    return (_jsxs("div", { className: "relative pb-16", children: [_jsx(ItemHero, { itemId: itemId, name: name, costTotal: costTotal, costBase: costBase, costSell: costSell, buildFrom: buildFrom }), _jsxs(Tabs, { defaultValue: "overview", className: "mt-8", children: [_jsxs(TabsList, { className: "bg-transparent p-0 gap-0 flex justify-start border-b border-flash/[0.06] rounded-none", children: [_jsx(ItemTabTrigger, { value: "overview", children: "Overview" }), _jsx(ItemTabTrigger, { value: "statistics", children: "Statistics" })] }), _jsx(TabsContent, { value: "overview", className: "pt-6 focus-visible:outline-none", children: _jsx(OverviewTab, { description: description, lore: lore, itemId: itemId, buildFrom: buildFrom, buildInto: buildInto }) }), _jsx(TabsContent, { value: "statistics", className: "pt-6 focus-visible:outline-none", children: _jsx(StatisticsTab, { rank: rank, setRank: setRank, role: role, setRole: setRole, championCsv: championCsv, setChampionCsv: setChampionCsv, stats: stats, loadingStats: loadingStats, statsError: statsError, bestRows: bestRows, loadingBest: loadingBest, idToName: idToName, champPath: champPath }) })] })] }));
}
// ─── Hero band ──────────────────────────────────────────────────────
function ItemHero({ itemId, name, costTotal, costBase, costSell, buildFrom, }) {
    const iconUrl = `${cdnBaseUrl()}/img/item/${itemId}.png`;
    return (_jsxs("div", { className: "relative -mt-6 mb-2 h-[260px] md:h-[300px] overflow-hidden rounded-md", children: [_jsx("div", { "aria-hidden": true, className: "absolute inset-0 z-0", style: {
                    backgroundImage: `url(${iconUrl})`,
                    backgroundSize: "120% auto",
                    backgroundPosition: "center",
                    filter: "blur(40px) saturate(0.7) brightness(0.55)",
                    opacity: 0.55,
                } }), _jsx(FlickeringGrid, { className: "absolute inset-0 z-[1] opacity-50 [mask-image:radial-gradient(700px_circle_at_center,white,transparent)]", squareSize: 4, gridGap: 6, color: "#00d992", maxOpacity: 0.45, flickerChance: 0.08 }), _jsx("div", { className: "absolute inset-0 z-[2] bg-jade/[0.04] mix-blend-color pointer-events-none" }), _jsx("div", { className: "absolute inset-0 z-[3] pointer-events-none opacity-[0.05]", style: {
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
                } }), _jsx("div", { className: "absolute inset-0 z-[4] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(4,10,12,0.85)_100%)]" }), _jsxs("div", { className: "relative z-10 h-full flex items-center gap-5 md:gap-8 p-5 md:p-8", children: [_jsxs(motion.div, { className: "relative shrink-0", initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.55, ease: EASE_BRAND }, children: [_jsx(motion.div, { "aria-hidden": true, className: "absolute inset-0 rounded-md", style: {
                                    boxShadow: "0 0 32px rgba(0,217,146,0.45), 0 0 80px rgba(0,217,146,0.18)",
                                }, animate: { opacity: [0.7, 1, 0.7] }, transition: { duration: 4, ease: "easeInOut", repeat: Infinity } }), _jsx("img", { src: iconUrl, alt: name, className: "relative w-20 h-20 md:w-28 md:h-28 rounded-md border border-jade/40" })] }), _jsxs("div", { className: "flex flex-col gap-2 min-w-0 flex-1", children: [_jsxs(motion.div, { className: "text-[10px] font-mono tracking-[0.3em] uppercase text-jade/65", initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.5, ease: EASE_BRAND, delay: 0.08 }, children: ["ITEM // ", itemId] }), _jsx(motion.h1, { className: "font-scifi text-2xl md:text-4xl text-jade leading-tight truncate", style: {
                                    textShadow: "0 0 28px rgba(0,217,146,0.45), 0 0 60px rgba(0,217,146,0.18)",
                                }, initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: EASE_BRAND, delay: 0.12 }, children: name }), _jsxs(motion.div, { className: "flex flex-wrap items-center gap-x-4 gap-y-2 pt-1", initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, ease: EASE_BRAND, delay: 0.2 }, children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx(Coins, { className: "w-4 h-4 text-citrine/85" }), _jsx("span", { className: "font-jetbrains text-base md:text-lg text-citrine font-bold tabular-nums", children: fmt(costTotal) }), _jsx("span", { className: "text-[11px] font-mono tracking-wider uppercase text-flash/40", children: "gold" })] }), _jsxs("div", { className: "text-[11px] font-mono text-flash/45 tracking-wider uppercase", children: ["base ", fmt(costBase), " \u2022 sell ", fmt(costSell)] }), buildFrom.length > 0 && (_jsxs("div", { className: "flex items-center gap-1.5 ml-auto", children: [_jsx("span", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-flash/40", children: "Recipe" }), buildFrom.map((id) => (_jsx(Link, { to: `/items/${id}`, className: "group cursor-clicker", title: id, children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: `Component ${id}`, className: "w-7 h-7 rounded-sm border border-flash/20 group-hover:border-jade/55 group-hover:scale-105 transition-all duration-200" }) }, id)))] }))] })] })] }), _jsx("div", { className: "absolute inset-x-0 bottom-0 h-8 z-[5] pointer-events-none bg-gradient-to-t from-liquirice to-transparent" })] }));
}
// ─── Tab trigger with spring underline (mirrors champion detail) ────
function ItemTabTrigger({ value, children, }) {
    return (_jsx(TabsTrigger, { value: value, className: cn("relative px-4 sm:px-6 py-3 rounded-none whitespace-nowrap", "font-mono text-[11px] tracking-[0.18em] uppercase", "text-flash/45 data-[state=active]:text-jade", "transition-colors duration-200", "data-[state=active]:bg-transparent", "after:absolute after:left-3 after:right-3 after:bottom-0 after:h-[2px]", "after:bg-jade after:shadow-[0_0_8px_rgba(0,217,146,0.45)]", "after:scale-x-0 after:origin-center after:transition-transform after:duration-300 after:ease-out", "data-[state=active]:after:scale-x-100"), children: children }));
}
// ─── Overview tab ───────────────────────────────────────────────────
function OverviewTab({ description, lore, itemId, buildFrom, buildInto, }) {
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs(motion.div, { className: cn(glassDark, "p-5 md:p-7"), initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, ease: EASE_BRAND }, children: [_jsx(SectionHeader, { children: "Build Path" }), _jsx(BuildPath, { itemId: itemId, buildFrom: buildFrom, buildInto: buildInto })] }), _jsxs(motion.div, { className: cn(glassDark, "p-5 md:p-7"), initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.55, ease: EASE_BRAND, delay: 0.08 }, children: [_jsx(SectionHeader, { icon: Sparkles, children: "Description" }), _jsx("div", { className: "text-[13px] md:text-[14px] text-flash/80 leading-[1.85] font-geist [&_br]:block [&_br]:my-1 [&_b]:text-flash [&_b]:font-semibold [&_i]:text-jade/85 [&_attentionIcon]:hidden", dangerouslySetInnerHTML: { __html: description } }), lore ? (_jsxs("div", { className: "mt-7", children: [_jsx(SectionHeader, { children: "Use" }), _jsx("p", { className: "text-[13px] text-flash/55 leading-[1.85] font-geist italic", children: lore })] })) : null] })] }));
}
// ─── Build path tree (LoL in-game recipe widget style) ─────────────
// Renders an authentic family-tree layout: component items at the
// top connected by short verticals → horizontal bar → single drop →
// current item → optional inverted tree to "builds into" upgrades.
//
//   [ Component 1 ]   [ Component 2 ]
//          │                  │
//          ├──────────────────┤    ← horizontal connector
//                  │              ← single drop
//             [ CURRENT ]
//                  │
//          ├──────────────────┤    ← inverted connector
//          │                  │
//   [ Upgrade 1 ]      [ Upgrade 2 ]
//
// All lines are pure CSS — no SVG — using a CSS grid for the item
// rows and absolute-positioned border divs for the T-junctions.
// The horizontal bar's `left`/`right` insets are computed from the
// row's column count so the bar always spans exactly from the
// centre of the first column to the centre of the last.
function BuildPath({ itemId, buildFrom, buildInto, }) {
    const hasFrom = buildFrom.length > 0;
    const hasInto = buildInto.length > 0;
    if (!hasFrom && !hasInto) {
        return (_jsxs("div", { className: "flex flex-col items-center gap-3 py-2", children: [_jsx(CurrentItemTile, { itemId: itemId }), _jsx("p", { className: "text-[11px] font-mono uppercase tracking-[0.18em] text-flash/35 text-center", children: "Basic item \u2014 no recipe, no upgrades" })] }));
    }
    return (_jsxs("div", { className: "flex flex-col items-center w-full", children: [hasFrom ? (_jsxs(_Fragment, { children: [_jsx(ItemsRow, { items: buildFrom, kind: "component" }), _jsx(TreeJunction, { count: buildFrom.length })] })) : null, _jsx(CurrentItemTile, { itemId: itemId }), hasInto ? (_jsxs(_Fragment, { children: [_jsx(TreeJunction, { count: buildInto.length, swapped: true }), _jsx(ItemsRow, { items: buildInto, kind: "upgrade" })] })) : null] }));
}
// A grid row of N item icons spread evenly so a parallel set of
// connector lines beneath them lines up exactly column-by-column.
//
// Two subtleties:
//   1. Items can REPEAT in DDragon's `from` array (e.g., Fiendish
//      Codex builds from 2× Amplifying Tome). Using `id` alone as
//      the React key collapses duplicate IDs into one rendered
//      slot — items end up stacked. We compose `${id}-${i}` so
//      every cell gets a unique key.
//   2. Some basic items (Amplifying Tome, Long Sword) upgrade into
//      10+ items. We scale the icon size, gap, and row max-width
//      based on the count so a 14-item row doesn't squash icons
//      into illegible slivers.
function ItemsRow({ items, kind, }) {
    const n = items.length;
    const sizing = rowSizing(n);
    return (_jsx("div", { className: cn("grid w-full mx-auto", sizing.maxW), style: { gridTemplateColumns: `repeat(${n}, 1fr)` }, children: items.map((id, i) => (_jsx(motion.div, { className: "flex justify-center", initial: {
                opacity: 0,
                y: kind === "component" ? -6 : 6,
            }, animate: { opacity: 1, y: 0 }, transition: {
                duration: 0.4,
                ease: EASE_BRAND,
                // Cap the per-item delay so a 14-upgrade row doesn't
                // take 700ms to finish revealing.
                delay: 0.1 + Math.min(i, 8) * 0.04,
            }, children: _jsx(Link, { to: `/items/${id}`, className: "cursor-clicker group", title: id, children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: `Item ${id}`, className: cn(sizing.icon, "rounded-sm border border-flash/20 group-hover:border-jade/55 group-hover:scale-110 group-hover:shadow-[0_0_18px_rgba(0,217,146,0.35)] transition-all duration-200") }) }) }, `${id}-${i}`))) }));
}
// Maps a count of items in a row to icon size + row max-width.
// The thresholds are tuned so adjacent items never touch and the
// row never crams more than fits the page comfortably.
function rowSizing(n) {
    if (n <= 4)
        return { icon: "w-12 h-12", maxW: "max-w-[320px]" };
    if (n <= 6)
        return { icon: "w-11 h-11", maxW: "max-w-[460px]" };
    if (n <= 9)
        return { icon: "w-10 h-10", maxW: "max-w-[620px]" };
    if (n <= 12)
        return { icon: "w-9 h-9", maxW: "max-w-[760px]" };
    return { icon: "w-8 h-8", maxW: "max-w-full" };
}
// The T-junction (horizontal bar + N short sticks one side, single
// drop the other). `swapped` flips the geometry so the items end up
// BELOW the current item (used for the upgrade tree).
//
// Crucially, this row uses the SAME max-width as the ItemsRow above
// (via the same `rowSizing` helper) so the columns line up exactly
// — each short stick sits directly under its item's centre.
function TreeJunction({ count, swapped = false, }) {
    // Zero items → no junction at all.
    if (count <= 0)
        return null;
    // Single item → just a vertical line, no T-junction needed.
    if (count === 1) {
        return (_jsx("div", { className: "relative w-full h-7 flex justify-center my-0.5", children: _jsx("div", { className: "w-px h-full bg-jade/50" }) }));
    }
    // The horizontal bar's insets put it from the centre of the first
    // column to the centre of the last column. Each column is
    // `100 / count` % wide; the centre of column 1 is `50/count` % in
    // from the left, and the centre of column N is `50/count` % in
    // from the right.
    const insetPct = 50 / count;
    const sizing = rowSizing(count);
    return (_jsxs("div", { className: cn("relative w-full h-7 mx-auto my-0.5", sizing.maxW), children: [_jsx("div", { className: cn("absolute inset-x-0 grid h-1/2", swapped ? "bottom-0" : "top-0"), style: { gridTemplateColumns: `repeat(${count}, 1fr)` }, children: Array.from({ length: count }).map((_, i) => (_jsx("div", { className: "flex justify-center", children: _jsx("div", { className: "w-px h-full bg-jade/50" }) }, i))) }), _jsx("div", { className: "absolute h-px bg-jade/50 top-1/2", style: { left: `${insetPct}%`, right: `${insetPct}%` } }), _jsx("div", { className: cn("absolute h-1/2 left-1/2 -translate-x-1/2 w-px bg-jade/50", swapped ? "top-0" : "bottom-0") })] }));
}
// The centre tile — emphasised with a jade halo + slightly larger so
// the eye locks onto it as "the item the tree is about".
function CurrentItemTile({ itemId }) {
    return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, ease: EASE_BRAND, delay: 0.05 }, className: "relative", children: [_jsx("span", { "aria-hidden": true, className: "absolute -inset-1 rounded-md", style: {
                    background: "radial-gradient(circle, rgba(0,217,146,0.5) 0%, transparent 75%)",
                } }), _jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: "Current item", className: "relative w-16 h-16 rounded-sm border border-jade/60 shadow-[0_0_28px_rgba(0,217,146,0.4)]" })] }));
}
// ─── Statistics tab ─────────────────────────────────────────────────
function StatisticsTab(props) {
    const { rank, setRank, role, setRole, championCsv, setChampionCsv, stats, loadingStats, statsError, bestRows, loadingBest, idToName, champPath, } = props;
    const buildRateWidth = useMemo(() => `${Math.min(Math.max(stats?.build_rate_pct ?? 0, 0), 100)}%`, [stats?.build_rate_pct]);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsxs(motion.div, { className: cn(glassDark, "p-4 md:p-5"), initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: EASE_BRAND }, children: [_jsx(SectionHeader, { children: "Filters" }), _jsxs("div", { className: "flex flex-wrap items-end gap-3", children: [_jsx(CyberSelect, { label: "Rank", value: rank, onChange: setRank, options: [
                                    { value: "", label: "All" },
                                    { value: "CHALLENGER", label: "Challenger" },
                                    { value: "GRANDMASTER", label: "Grandmaster" },
                                    { value: "MASTER", label: "Master" },
                                    { value: "DIAMOND", label: "Diamond" },
                                    { value: "EMERALD", label: "Emerald" },
                                    { value: "PLATINUM", label: "Platinum" },
                                    { value: "GOLD", label: "Gold" },
                                    { value: "SILVER", label: "Silver" },
                                    { value: "BRONZE", label: "Bronze" },
                                    { value: "IRON", label: "Iron" },
                                ] }), _jsx(CyberSelect, { label: "Role", value: role, onChange: setRole, options: [
                                    { value: "", label: "All" },
                                    { value: "TOP", label: "Top" },
                                    { value: "JUNGLE", label: "Jungle" },
                                    { value: "MIDDLE", label: "Mid" },
                                    { value: "BOTTOM", label: "ADC" },
                                    { value: "SUPPORT", label: "Support" },
                                ] }), _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-flash/50", children: "Champion IDs" }), _jsx("input", { value: championCsv, onChange: (e) => setChampionCsv(e.target.value), placeholder: "e.g. 64, 76", className: "bg-black/40 border border-flash/15 hover:border-flash/30 focus:border-jade/55 focus:outline-none rounded-sm px-3 py-1.5 w-[200px] text-[13px] font-jetbrains text-flash placeholder:text-flash/30 transition-colors" })] })] })] }), loadingStats ? (_jsx(StatsSkeleton, {})) : statsError ? (_jsxs(motion.div, { className: cn(glassDark, "p-6 text-center"), initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 }, children: [_jsx("div", { className: "text-[10px] font-mono tracking-[0.25em] uppercase text-error/75 mb-2", children: "\u26A0 ERROR" }), _jsx("p", { className: "text-sm text-flash/65", children: statsError })] })) : !stats ? (_jsx(motion.div, { className: cn(glassDark, "p-6 text-center"), initial: { opacity: 0 }, animate: { opacity: 1 }, children: _jsx("p", { className: "text-[12px] font-mono tracking-wider uppercase text-flash/35", children: "No data available for these filters." }) })) : (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: EASE_BRAND }, children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsx(StatTile, { label: "Games", value: fmt(stats.games), hint: "Games where the item was completed", delay: 0 }), _jsx(StatTile, { label: "Wins", value: fmt(stats.wins), hint: "Won games with the item", delay: 0.06 }), _jsx(StatTile, { label: "Winrate", value: `${stats.winrate_pct ?? 0}%`, hint: `Out of ${fmt(stats.total_games)} total matches under the current filter`, accent: "jade", delay: 0.12 }), _jsx(StatTile, { label: "Build Rate", value: `${stats.build_rate_pct ?? 0}%`, hint: `${stats.build_rate_pct ?? 0}% of players built this item`, delay: 0.18, extra: _jsx("div", { className: "mt-3", children: _jsx("div", { className: "h-1.5 rounded-full bg-black/35 overflow-hidden", children: _jsx(motion.div, { className: "h-full rounded-full bg-gradient-to-r from-jade to-jade/45", initial: { width: 0 }, animate: { width: buildRateWidth }, transition: {
                                                duration: 0.7,
                                                ease: EASE_BRAND,
                                                delay: 0.35,
                                            } }) }) }) })] }), _jsxs(motion.div, { className: cn(glassDark, "mt-6 p-5 md:p-6"), initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: EASE_BRAND, delay: 0.25 }, children: [_jsx(SectionHeader, { icon: Users, children: "Best Utilizers" }), loadingBest ? (_jsx(UtilizersSkeleton, {})) : bestRows.length === 0 ? (_jsx("p", { className: "text-[12px] font-mono tracking-wider uppercase text-flash/35", children: "No champion data yet." })) : (_jsx("ul", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: bestRows.map((r, i) => {
                                    const resolved = Boolean(idToName[r.champion_id]);
                                    return (_jsx(UtilizerRow, { rank: i + 1, name: idToName[r.champion_id] || String(r.champion_id), games: r.games, wins: r.wins, winrate: r.winrate_pct, champPath: champPath, resolved: resolved }, r.champion_id));
                                }) }))] })] }, `${rank}-${role}-${props.championCsv}`))] }));
}
// ─── Stat tile (jade accent for the headline stat) ──────────────────
function StatTile({ label, value, hint, accent, extra, delay = 0, }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });
    return (_jsxs(motion.div, { ref: ref, className: cn(glassDark, "p-4 md:p-5"), initial: { opacity: 0, y: 10 }, animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }, transition: { duration: 0.5, ease: EASE_BRAND, delay }, children: [_jsx(BorderBeam, { duration: 9, size: 120 }), _jsx("div", { className: "text-[10px] font-mono tracking-[0.22em] uppercase text-flash/45", children: label }), _jsx("div", { className: cn("mt-1 font-jetbrains font-bold tabular-nums text-3xl md:text-[34px] leading-tight", accent === "jade" ? "text-jade" : "text-flash/95"), style: accent === "jade"
                    ? {
                        textShadow: "0 0 18px rgba(0,217,146,0.45), 0 0 36px rgba(0,217,146,0.18)",
                    }
                    : undefined, children: value }), hint ? (_jsx("div", { className: "mt-2 text-[11px] font-mono text-flash/40 leading-relaxed", children: hint })) : null, extra] }));
}
// ─── A single best-utilizer row (avatar + name + winrate) ───────────
// `name` may be the champion id stringified when the id→name map
// hasn't resolved yet; the `onError` handler swaps the broken
// avatar for the project's `/img/unknown.png` placeholder rather
// than leaving a 404'd image rect. Once the map loads, this row
// re-renders with the real name and the broken-image state goes
// away on the next paint.
function UtilizerRow({ rank, name, games, wins, winrate, champPath, resolved, }) {
    return (_jsxs("li", { className: "group flex items-center gap-3 p-2.5 rounded-sm bg-black/25 border border-flash/[0.06] hover:border-jade/30 hover:bg-jade/[0.04] transition-colors duration-200", children: [_jsx("span", { className: "w-5 text-center text-[10px] font-mono tracking-wider text-flash/35", children: rank.toString().padStart(2, "0") }), _jsx("img", { src: resolved ? `${champPath}/${name}.png` : "/img/unknown.png", alt: name, onError: (e) => {
                    // Defensive fallback if the CDN path 404s for any reason
                    // (e.g. champion name with apostrophe-encoding drift).
                    const img = e.currentTarget;
                    if (!img.src.endsWith("/img/unknown.png")) {
                        img.src = "/img/unknown.png";
                    }
                }, className: "w-10 h-10 rounded-md border border-flash/15 group-hover:border-jade/55 transition-colors duration-200" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[13px] text-flash/90 font-jetbrains truncate", children: resolved ? name : "—" }), _jsxs("div", { className: "text-[10px] font-mono uppercase tracking-wider text-flash/40", children: [fmt(games), " games"] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "text-[15px] font-jetbrains font-bold tabular-nums text-jade", children: [winrate, "%"] }), _jsxs("div", { className: "text-[10px] font-mono uppercase tracking-wider text-flash/40", children: [fmt(wins), " wins"] })] })] }));
}
// ─── Reusable cyber select ──────────────────────────────────────────
function CyberSelect({ label, value, onChange, options, }) {
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-[10px] font-mono tracking-[0.2em] uppercase text-flash/50", children: label }), _jsxs("div", { className: "relative", children: [_jsx("select", { value: value, onChange: (e) => onChange(e.target.value), className: "\n            appearance-none cursor-clicker\n            bg-black/40 border border-flash/15 hover:border-flash/30\n            focus:border-jade/55 focus:outline-none\n            rounded-sm pl-3 pr-8 py-1.5\n            text-[13px] font-jetbrains text-flash\n            transition-colors\n          ", children: options.map((o) => (_jsx("option", { value: o.value, className: "bg-liquirice text-flash", children: o.label }, o.value))) }), _jsx(ChevronDown, { className: "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-flash/45" })] })] }));
}
// ─── Skeletons ──────────────────────────────────────────────────────
function ItemSkeleton() {
    return (_jsxs("div", { className: "relative pb-16", children: [_jsx("div", { className: "relative -mt-6 mb-6 h-[260px] md:h-[300px] overflow-hidden rounded-md bg-black/30 animate-pulse", children: _jsxs("div", { className: "h-full flex items-center gap-6 p-6", children: [_jsx("div", { className: "w-24 h-24 md:w-28 md:h-28 rounded-md bg-flash/[0.06]" }), _jsxs("div", { className: "flex-1 space-y-3", children: [_jsx("div", { className: "h-3 w-24 bg-flash/[0.05] rounded" }), _jsx("div", { className: "h-8 w-1/2 bg-flash/[0.08] rounded" }), _jsx("div", { className: "h-3 w-1/3 bg-flash/[0.05] rounded" })] })] }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [0, 1, 2, 3].map((i) => (_jsx("div", { className: cn(glassDark, "p-5 h-32 animate-pulse") }, i))) })] }));
}
function StatsSkeleton() {
    return (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [0, 1, 2, 3].map((i) => (_jsx("div", { className: cn(glassDark, "p-5 h-32 animate-pulse") }, i))) }));
}
function UtilizersSkeleton() {
    return (_jsx("ul", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: [0, 1, 2, 3, 4, 5].map((i) => (_jsxs("li", { className: "flex items-center gap-3 p-2.5 rounded-sm bg-black/25 border border-flash/[0.06] animate-pulse", children: [_jsx("div", { className: "w-5 h-3 bg-flash/[0.05] rounded" }), _jsx("div", { className: "w-10 h-10 rounded-md bg-flash/[0.06]" }), _jsxs("div", { className: "flex-1 space-y-1.5", children: [_jsx("div", { className: "h-3 w-24 bg-flash/[0.06] rounded" }), _jsx("div", { className: "h-2 w-16 bg-flash/[0.04] rounded" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "h-3 w-10 bg-flash/[0.06] rounded ml-auto" }), _jsx("div", { className: "h-2 w-12 bg-flash/[0.04] rounded ml-auto" })] })] }, i))) }));
}
// ─── Number helper ──────────────────────────────────────────────────
const fmt = (n) => typeof n === "number" ? n.toLocaleString() : "—";
