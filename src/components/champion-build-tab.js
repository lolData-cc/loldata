import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BOX_API_BASE_URL, cdnBaseUrl, summonerSpellUrl } from "@/config";
import { getKeystoneIcon, getStyleIcon, getKeystoneName } from "@/constants/runes";
import { cn } from "@/lib/utils";
const fmt = (n) => n.toLocaleString("en-US");
function wrClass(wr) {
    if (wr >= 53)
        return "text-jade";
    if (wr >= 50.5)
        return "text-[#7bd9b0]";
    if (wr >= 49)
        return "text-flash/70";
    return "text-[#ff6286]";
}
function SectionTitle({ children }) {
    return (_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("h3", { className: "text-[11px] font-chakrapetch font-bold uppercase tracking-[0.22em] text-jade/70 whitespace-nowrap", children: children }), _jsx("span", { className: "h-px flex-1 bg-gradient-to-r from-jade/15 to-transparent" })] }));
}
function ItemIcon({ id, size = 44, names }) {
    return (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: names[id] ?? String(id), title: names[id] ?? String(id), width: size, height: size, loading: "lazy", className: "rounded-md ring-1 ring-flash/10 bg-black/30", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }));
}
export default function ChampionBuildTab({ champ, patch }) {
    const [data, setData] = useState(null);
    const [names, setNames] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
            if (!j?.data)
                return;
            const m = {};
            for (const [id, it] of Object.entries(j.data))
                m[Number(id)] = it.name;
            setNames(m);
        })
            .catch(() => { });
    }, []);
    useEffect(() => {
        if (!champ?.key)
            return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`${BOX_API_BASE_URL}/api/champion/build`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ champKey: Number(champ.key), champion: champ.id }),
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load build"))))
            .then((d) => !cancelled && setData(d))
            .catch((e) => !cancelled && setError(e?.message ?? "Error"))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [champ?.key, champ?.id]);
    const name = champ.name;
    const bestRune = data?.runes?.[0];
    const bestSpells = data?.spells?.[0];
    const core = data?.items?.core ?? [];
    const region = useMemo(() => "euw", []); // top-player links default region
    if (loading)
        return (_jsx("div", { className: "space-y-4", children: Array.from({ length: 3 }).map((_, i) => _jsx("div", { className: "h-40 rounded-lg bg-flash/[0.015] animate-pulse" }, i)) }));
    if (error || !data)
        return _jsx("div", { className: "px-4 py-12 text-center text-[#ff6286]/80 text-sm", children: error ?? "No build data" });
    return (_jsxs("div", { className: "font-jetbrains text-flash", children: [_jsx("style", { children: `@keyframes bIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}` }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5", children: [_jsxs("div", { className: "space-y-7", children: [_jsxs("section", { children: [_jsx(SectionTitle, { children: "Best Runes & Spells" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4", children: [_jsx("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4", children: data.runes.slice(0, 2).map((r, i) => {
                                                    const ks = getKeystoneIcon(r.keystone);
                                                    const prim = getStyleIcon(r.primary);
                                                    const sec = getStyleIcon(r.sub);
                                                    return (_jsxs("div", { className: cn("flex items-center gap-3", i > 0 && "mt-3 pt-3 border-t border-flash/[0.05]"), children: [ks && _jsx("img", { src: ks, alt: "", className: cn("rounded-full bg-black/40", i === 0 ? "w-12 h-12" : "w-9 h-9"), onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: cn("font-chakrapetch font-bold truncate", i === 0 ? "text-[14px] text-flash/90" : "text-[12px] text-flash/60"), children: getKeystoneName(r.keystone) ?? `Keystone ${r.keystone}` }), _jsxs("div", { className: "flex items-center gap-1.5 mt-1", children: [prim && _jsx("img", { src: prim, alt: "", className: "w-4 h-4" }), _jsx("span", { className: "text-flash/20 text-[10px]", children: "+" }), sec && _jsx("img", { src: sec, alt: "", className: "w-4 h-4 opacity-80" })] })] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsxs("div", { className: cn("font-chakrapetch font-bold tabular-nums", i === 0 ? "text-[15px]" : "text-[12px]", wrClass(r.winrate)), children: [r.winrate.toFixed(1), "%"] }), r.pickrate != null && _jsxs("div", { className: "text-[9px] text-flash/35 tabular-nums", children: [r.pickrate.toFixed(1), "% pick"] })] })] }, i));
                                                }) }), _jsxs("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4 flex flex-col items-center justify-center min-w-[130px]", children: [_jsx("span", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch mb-2", children: "Spells" }), bestSpells && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: summonerSpellUrl(bestSpells.spell1), alt: "", className: "w-9 h-9 rounded-md ring-1 ring-flash/10", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsx("img", { src: summonerSpellUrl(bestSpells.spell2), alt: "", className: "w-9 h-9 rounded-md ring-1 ring-flash/10", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } })] }), _jsxs("div", { className: cn("mt-2 font-chakrapetch font-bold text-[14px] tabular-nums", wrClass(bestSpells.winrate)), children: [bestSpells.winrate.toFixed(1), "%"] }), bestSpells.pickrate != null && _jsxs("div", { className: "text-[9px] text-flash/35 tabular-nums", children: [bestSpells.pickrate.toFixed(1), "% pick"] })] }))] })] })] }), _jsxs("section", { children: [_jsx(SectionTitle, { children: "Core Build \u00B7 by build priority" }), _jsxs("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4", children: [data.items.boots.length > 0 && (_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("span", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch w-14 shrink-0", children: "Boots" }), _jsx("div", { className: "flex items-center gap-2", children: data.items.boots.map((b) => _jsx(ItemIcon, { id: b.item_id, size: 38, names: names }, b.item_id)) })] })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-[9px] uppercase tracking-[0.18em] text-flash/30 font-chakrapetch w-14 shrink-0", children: "Core" }), _jsx("div", { className: "flex items-center gap-1.5 flex-wrap", children: core.map((it, i) => (_jsxs("div", { className: "flex items-center", style: { animation: "bIn .3s ease-out both", animationDelay: `${i * 40}ms` }, children: [_jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx(ItemIcon, { id: it.item_id, size: 48, names: names }), _jsxs("span", { className: cn("text-[10px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate)), children: [it.winrate.toFixed(1), "%"] })] }), i < core.length - 1 && _jsx("span", { className: "text-flash/20 mx-1 text-[14px]", children: "\u203A" })] }, it.item_id))) })] })] })] }), data.items.situational.length > 0 && (_jsxs("section", { children: [_jsx(SectionTitle, { children: "Situational Items" }), _jsx("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] p-4", children: _jsx("div", { className: "flex items-start gap-3 flex-wrap", children: data.items.situational.map((it) => (_jsxs("div", { className: "flex flex-col items-center gap-1 w-[56px]", children: [_jsx(ItemIcon, { id: it.item_id, size: 42, names: names }), _jsxs("span", { className: cn("text-[10px] font-chakrapetch font-bold tabular-nums", wrClass(it.winrate)), children: [it.winrate.toFixed(1), "%"] }), _jsx("span", { className: "text-[8px] text-flash/35 text-center leading-tight truncate w-full", children: names[it.item_id] ?? "" })] }, it.item_id))) }) })] }))] }), _jsxs("aside", { children: [_jsxs(SectionTitle, { children: ["Top ", name, " Players"] }), _jsxs("div", { className: "rounded-lg border border-flash/10 bg-[rgba(6,12,14,0.5)] overflow-hidden", children: [data.topPlayers.length === 0 && _jsx("div", { className: "px-4 py-8 text-center text-[11px] text-flash/35", children: "Not enough games yet" }), data.topPlayers.map((p, i) => (_jsxs(Link, { to: `/summoners/${region}/${encodeURIComponent(p.name.replace(/\s+/g, "+"))}-${p.tag}`, className: "flex items-center gap-2.5 px-3 py-2 border-b border-flash/[0.04] last:border-0 hover:bg-jade/[0.04] transition-colors group", children: [_jsx("span", { className: cn("w-5 text-center text-[12px] font-chakrapetch font-bold tabular-nums", i === 0 ? "text-jade" : "text-flash/35"), children: i + 1 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate text-[12px] text-flash/85 group-hover:text-flash leading-tight", children: p.name }), _jsxs("div", { className: "truncate text-[9px] text-flash/30 leading-tight", children: ["#", p.tag] })] }), _jsxs("div", { className: "text-right shrink-0", children: [_jsxs("div", { className: cn("text-[12px] font-chakrapetch font-bold tabular-nums", wrClass(p.winrate)), children: [p.winrate.toFixed(0), "%"] }), _jsxs("div", { className: "text-[9px] text-flash/30 tabular-nums", children: [fmt(p.games), "g"] })] })] }, `${p.name}-${p.tag}-${i}`)))] })] })] })] }));
}
