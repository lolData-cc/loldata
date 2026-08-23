import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOX_API_BASE_URL, cdnBaseUrl } from "@/config";
const dirText = (d) => (d === "buff" ? "text-[#00d992]" : d === "nerf" ? "text-[#d63336]" : "text-flash/55");
const dirBorder = (d) => d === "buff"
    ? "border-[#00d992]/25 bg-[#00d992]/[0.05]"
    : d === "nerf"
        ? "border-[#d63336]/25 bg-[#d63336]/[0.05]"
        : "border-flash/12 bg-flash/[0.03]";
function verdict(changes) {
    const b = changes.filter((c) => c.direction === "buff").length;
    const n = changes.filter((c) => c.direction === "nerf").length;
    if (b > n)
        return { label: "BUFFED", d: "buff" };
    if (n > b)
        return { label: "NERFED", d: "nerf" };
    return { label: "ADJUSTED", d: "adjust" };
}
function EntityCard({ kind, entityKey, name, changes, prose }) {
    const v = verdict(changes);
    const icon = kind === "champion"
        ? `${cdnBaseUrl()}/img/champion/${entityKey}.png`
        : `${cdnBaseUrl()}/img/item/${entityKey}.png`;
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" }, transition: { duration: 0.4 }, className: cn("rounded-xl border p-4 backdrop-blur-xl", dirBorder(v.d)), children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: icon, alt: name, className: "h-11 w-11 shrink-0 rounded-lg bg-filmdark/30 object-cover ring-1 ring-flash/10", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "truncate font-chakrapetch text-[15px] font-bold text-flash/95", children: name }), _jsx("span", { className: cn("text-[10px] font-bold uppercase tracking-[0.18em]", dirText(v.d)), children: v.label })] })] }), prose && _jsx("p", { className: "mt-3 font-geist text-[12.5px] italic leading-relaxed text-flash/60", children: prose }), _jsx("div", { className: "mt-3 space-y-1.5", children: changes.map((c, i) => (_jsxs("div", { className: "flex items-center gap-2 text-[12.5px]", children: [_jsx("span", { className: "flex-1 truncate text-flash/55", children: c.label }), _jsx("span", { className: "tabular-nums text-flash/40", children: c.old_value }), _jsx(ArrowRight, { size: 11, className: dirText(c.direction) }), _jsx("span", { className: cn("font-semibold tabular-nums", dirText(c.direction)), children: c.new_value })] }, i))) })] }));
}
function SectionHeader({ title, count }) {
    return (_jsxs("div", { className: "mb-4 mt-12 flex items-center gap-3", children: [_jsx("h2", { className: "font-chakrapetch text-xl font-bold uppercase tracking-wide text-flash/90", children: title }), _jsx("span", { className: "rounded-full border border-flash/15 px-2 py-0.5 font-jetbrains text-[11px] text-flash/45", children: count }), _jsx("span", { className: "h-px flex-1 bg-gradient-to-r from-flash/10 to-transparent" })] }));
}
export default function PatchNotesPage() {
    const [data, setData] = useState(null);
    const [patch, setPatch] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        const url = patch ? `${BOX_API_BASE_URL}/api/patch-notes?patch=${patch}` : `${BOX_API_BASE_URL}/api/patch-notes`;
        fetch(url)
            .then((r) => r.json())
            .then((d) => {
            setData(d);
            if (!patch && d.patch)
                setPatch(d.patch);
        })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [patch]);
    const grouped = useMemo(() => {
        const champs = new Map();
        const items = new Map();
        for (const c of data?.changes ?? []) {
            const m = c.kind === "champion" ? champs : items;
            if (!m.has(c.entity_key))
                m.set(c.entity_key, []);
            m.get(c.entity_key).push(c);
        }
        return { champs: [...champs.entries()], items: [...items.entries()] };
    }, [data]);
    const nameOf = (key) => (data?.changes ?? []).find((c) => c.entity_key === key)?.entity_name ?? key;
    return (_jsx("div", { className: "min-h-screen bg-[#040A0C] px-4 pb-24 pt-28 text-flash sm:px-6", children: _jsxs("div", { className: "mx-auto max-w-6xl", children: [_jsx("div", { className: "mb-2 font-jetbrains text-[11px] uppercase tracking-[0.3em] text-jade/70", children: "Game Updates" }), _jsx("h1", { className: "font-chakrapetch text-4xl font-bold tracking-tight sm:text-5xl", children: "Patch Notes" }), _jsx("p", { className: "mt-2 max-w-xl font-geist text-flash/55", children: "Champion and item changes, computed straight from the official game data every patch." }), _jsx("div", { className: "mt-6 flex flex-wrap gap-2", children: (data?.patches ?? []).map((p) => (_jsx("button", { onClick: () => setPatch(p), className: cn("rounded-full border px-4 py-1.5 font-chakrapetch text-[13px] tracking-wide transition cursor-clicker", p === patch
                            ? "border-jade/50 bg-jade/[0.10] text-jade"
                            : "border-flash/15 bg-flash/[0.03] text-flash/60 hover:text-flash/90"), children: p }, p))) }), loading && _jsxs("div", { className: "mt-20 text-center font-jetbrains text-flash/40", children: ["Loading patch ", patch ?? "", "\u2026"] }), !loading && (_jsxs(_Fragment, { children: [grouped.champs.length > 0 && (_jsxs(_Fragment, { children: [_jsx(SectionHeader, { title: "Champions", count: grouped.champs.length }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: grouped.champs.map(([key, ch]) => (_jsx(EntityCard, { kind: "champion", entityKey: key, name: nameOf(key), changes: ch, prose: data?.prose?.[key] }, key))) })] })), grouped.items.length > 0 && (_jsxs(_Fragment, { children: [_jsx(SectionHeader, { title: "Items", count: grouped.items.length }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: grouped.items.map(([key, ch]) => (_jsx(EntityCard, { kind: "item", entityKey: key, name: nameOf(key), changes: ch }, key))) })] })), grouped.champs.length === 0 && grouped.items.length === 0 && (_jsx("div", { className: "mt-20 text-center text-flash/40", children: "No changes recorded for this patch." }))] }))] }) }));
}
