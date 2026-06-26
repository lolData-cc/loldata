// src/components/champion/ChampionItemsTab.tsx
"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
// Champion item stats read from the match-data box (api2) — see BOX_API_BASE_URL.
import { BOX_API_BASE_URL as API_BASE_URL, cdnBaseUrl } from "@/config";
const fmtPct = (x, digits = 1) => `${x.toFixed(digits)}%`;
export function ChampionItemsTab({ champ, patch, role, tier }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [items, setItems] = useState([]);
    const [itemsMeta, setItemsMeta] = useState({});
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`${API_BASE_URL}/api/champion/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                championName: champ.name,
                championId: champ.key ? Number(champ.key) : undefined,
                role: role ?? undefined,
                tier: tier ?? undefined,
                maxPerSlot: 12,
            }),
        })
            .then((r) => {
            if (!r.ok)
                throw new Error("Failed to load champion items");
            return r.json();
        })
            .then((data) => {
            if (cancelled)
                return;
            // Handle both flat (snapshot) and slot-based (legacy) formats
            if (data.slots) {
                const allItems = [];
                for (const items of Object.values(data.slots)) {
                    allItems.push(...items);
                }
                // Deduplicate by item_id, keeping highest game count
                const seen = new Map();
                for (const item of allItems) {
                    const existing = seen.get(item.item_id);
                    const games = item.total_games ?? item.games ?? 0;
                    if (!existing || games > (existing.total_games ?? existing.games ?? 0)) {
                        seen.set(item.item_id, item);
                    }
                }
                setItems(Array.from(seen.values()).sort((a, b) => (b.total_games ?? b.games ?? 0) - (a.total_games ?? a.games ?? 0)));
            }
            else {
                setItems([]);
            }
        })
            .catch((e) => {
            if (cancelled)
                return;
            setError(e?.message ?? "Error loading items");
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => { cancelled = true; };
    }, [champ.name, champ.key, role, tier]);
    useEffect(() => {
        let cancelled = false;
        fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
            .then((r) => r.json())
            .then((json) => {
            if (cancelled)
                return;
            const map = {};
            Object.entries(json.data || {}).forEach(([id, item]) => {
                map[id] = { name: item.name, plaintext: item.plaintext };
            });
            setItemsMeta(map);
        })
            .catch(() => { if (!cancelled)
            setItemsMeta({}); });
        return () => { cancelled = true; };
    }, []);
    if (loading) {
        return (_jsx("div", { className: "rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-6", children: _jsx("div", { className: "text-flash/40 font-jetbrains text-[11px] uppercase tracking-[0.2em] animate-pulse", children: "Loading items..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-6", children: _jsx("div", { className: "text-[#ff6286] font-jetbrains text-[11px] uppercase tracking-[0.2em]", children: error }) }));
    }
    if (items.length === 0) {
        return (_jsx("div", { className: "rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-6", children: _jsx("div", { className: "text-flash/40 font-jetbrains text-[11px] uppercase tracking-[0.2em]", children: "No item data available" }) }));
    }
    const totalGames = items.reduce((s, i) => s + (i.total_games ?? i.games ?? 0), 0) / items.length;
    return (_jsxs("div", { className: "relative overflow-hidden rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md p-4 sm:p-5", style: {
            boxShadow: "0 40px 90px -50px rgba(0,217,146,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
        }, children: [_jsx("div", { "aria-hidden": true, className: "pointer-events-none absolute inset-0 opacity-[0.05]", style: {
                    backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
                } }), _jsxs("div", { className: "relative space-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade shrink-0", style: { boxShadow: "0 0 8px #00d992" } }), _jsx("h3", { className: "text-[11px] font-chakrapetch font-bold uppercase tracking-[0.28em] text-jade/80", children: "Most Built Items" }), _jsx("span", { className: "h-px flex-1 bg-gradient-to-r from-jade/15 to-transparent" })] }), _jsx("p", { className: "text-flash/40 text-[10px] font-jetbrains uppercase tracking-[0.2em] ml-4", children: "Legendary items sorted by pick rate" })] }), _jsx("div", { className: "space-y-1", children: items.map((item, idx) => {
                            const games = item.total_games ?? item.games ?? 0;
                            const idStr = String(item.item_id);
                            const meta = itemsMeta[idStr];
                            const name = meta?.name ?? `Item ${idStr}`;
                            const wrColor = item.winrate >= 52
                                ? "text-jade"
                                : item.winrate >= 50
                                    ? "text-flash/70"
                                    : "text-[#ff6286]";
                            const pickRate = item.pick_rate ?? 0;
                            const isTop3 = idx < 3;
                            return (_jsxs(Link, { to: `/items/${item.item_id}`, className: cn("group flex items-center gap-3 px-3 py-2 rounded-lg", "bg-flash/[0.02] ring-1 ring-inset ring-flash/[0.05]", "hover:bg-jade/[0.04] hover:ring-jade/20", "transition-colors"), children: [_jsx("span", { className: cn("font-chakrapetch font-bold text-[12px] tabular-nums w-5 text-right shrink-0", isTop3 ? "text-jade" : "text-flash/40"), children: idx + 1 }), _jsx("img", { src: `${cdnBaseUrl()}/img/item/${item.item_id}.png`, alt: name, className: "w-8 h-8 rounded-md ring-1 ring-inset ring-flash/10 shrink-0", loading: "lazy", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[12px] font-jetbrains text-flash/80 truncate group-hover:text-flash transition-colors", children: name }), pickRate > 0 && (_jsxs("div", { className: "mt-1 flex items-center gap-2", children: [_jsx("div", { className: "flex-1 h-[3px] bg-flash/[0.06] rounded-full overflow-hidden max-w-[120px]", children: _jsx("div", { className: "h-full bg-gradient-to-r from-jade to-jade/30 rounded-full", style: { width: `${Math.min(pickRate, 100)}%` } }) }), _jsxs("span", { className: "text-[9px] font-jetbrains text-flash/40 tabular-nums", children: [fmtPct(pickRate), " pick"] })] }))] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsx("div", { className: cn("text-[13px] font-jetbrains font-semibold tabular-nums", wrColor), children: fmtPct(item.winrate) }), _jsxs("div", { className: "text-[9px] font-jetbrains text-flash/40 tabular-nums", children: [games.toLocaleString(), " games"] })] })] }, item.item_id));
                        }) })] })] }));
}
