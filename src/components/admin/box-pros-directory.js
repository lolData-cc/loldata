import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Admin dashboard — the SCRAPED pros directory (box `pros` table, lolpros
// import). Read-only: these rows are refreshed by the box scraper, not managed
// here — each row links to its public /players/<slug> page. The hand-curated
// Cloud pro_players keep their own (editable) table above this one.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BOX_API_BASE_URL } from "@/config";
import { LoadingDots } from "@/components/ui/loading-dots";
import { TeamLogo } from "@/components/teamlogo";
const PAGE_SIZE = 50;
// mirror the panel's table styling consts (kept local: this file is standalone)
const thCls = "px-3 py-2 text-[10px] font-mono tracking-[0.15em] uppercase text-flash/50";
const tdCls = "px-3 py-2 text-[11px] font-mono text-flash/70";
const btnFlash = "px-2 py-1 rounded-sm cursor-clicker border border-flash/20 text-flash/70 hover:bg-flash/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
const inputCls = "w-full rounded-sm border border-flash/15 bg-filmdark/40 px-3 py-1.5 text-[11px] text-flash font-mono outline-none focus:border-jade/30 transition-colors";
function GlassCard({ children }) {
    return (_jsx("div", { className: "relative overflow-hidden rounded-md bg-filmlight/[0.04] backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(var(--c-shadow),0.45),inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.10)]", children: _jsx("div", { className: "relative z-[1] px-4 py-4", children: children }) }));
}
export function BoxProsDirectory() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const debounceRef = useRef(null);
    // debounced server-side search — resets to page 1 on new query
    const onQueryChange = (v) => {
        setQuery(v);
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setPage(1), 300);
    };
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
                if (query.trim())
                    params.set("query", query.trim());
                const res = await fetch(`${BOX_API_BASE_URL}/api/pros?${params}`, { cache: "no-store" });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const json = (await res.json());
                if (!cancelled) {
                    setData(json);
                    setError(null);
                }
            }
            catch (e) {
                if (!cancelled)
                    setError(e instanceof Error ? e.message : "Failed to load");
            }
            finally {
                if (!cancelled)
                    setLoading(false);
            }
        };
        // debounce the query-triggered reload (page changes fire immediately)
        const t = setTimeout(load, query ? 300 : 0);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [query, page]);
    const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
    return (_jsxs(_Fragment, { children: [_jsxs("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8", children: [":: LOLPROS DIRECTORY ", _jsx("span", { className: "text-flash/30", children: "\u00B7 BOX \u00B7 READ-ONLY" }), " ::"] }), _jsxs(GlassCard, { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("p", { className: "text-xs font-mono text-flash/60", children: ["Total: ", _jsx("span", { className: "text-jade", children: data?.total ?? "…" }), _jsx("span", { className: "ml-2 inline-flex items-center px-1.5 py-[1px] rounded-sm border border-jade/25 bg-jade/5 text-[9px] font-bold tracking-[0.2em] text-jade/80 uppercase", children: "lolpros" })] }), _jsx("input", { type: "text", placeholder: "Search name, slug, or team...", value: query, onChange: (e) => onQueryChange(e.target.value), className: `${inputCls} max-w-[260px]` })] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" }), error ? (_jsx("p", { className: "text-[11px] font-mono text-red-300/80", children: error })) : loading && !data ? (_jsxs("div", { className: "text-xs text-flash/60 inline-flex items-center gap-2", children: [_jsx(LoadingDots, {}), " Loading..."] })) : !data || data.pros.length === 0 ? (_jsx("p", { className: "text-[11px] font-mono text-flash/40", children: query ? "No results match your search." : "No scraped pros yet — the box import is still running." })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[400px]", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10", children: _jsxs("tr", { children: [_jsx("th", { className: thCls, children: "Player" }), _jsx("th", { className: thCls, children: "Role" }), _jsx("th", { className: thCls, children: "Team" }), _jsx("th", { className: thCls, children: "Country" }), _jsx("th", { className: `${thCls} text-right`, children: "Accounts" }), _jsx("th", { className: `${thCls} text-right`, children: "Score" }), _jsx("th", { className: `${thCls} text-right`, children: "Links" })] }) }), _jsx("tbody", { children: data.pros.map((p) => (_jsxs("tr", { className: "border-b border-flash/5 hover:bg-filmlight/[0.03] transition-colors", children: [_jsx("td", { className: `${tdCls} text-flash`, children: _jsx(Link, { to: `/players/${p.slug}`, className: "text-jade/90 hover:text-jade hover:underline underline-offset-2 cursor-clicker", children: p.name }) }), _jsx("td", { className: `${tdCls} uppercase`, children: p.position ?? "—" }), _jsx("td", { className: tdCls, children: p.team_name ? (_jsxs("div", { className: "flex items-center gap-1.5", children: [p.team_logo && _jsx(TeamLogo, { src: p.team_logo, className: "w-4 h-4 rounded-sm object-contain" }), _jsx("span", { children: p.team_tag ?? p.team_name })] })) : "—" }), _jsx("td", { className: tdCls, children: p.country ?? "—" }), _jsx("td", { className: `${tdCls} text-right tabular-nums`, children: p.accounts }), _jsx("td", { className: `${tdCls} text-right tabular-nums`, children: p.lolpros_score ?? "—" }), _jsx("td", { className: tdCls, children: _jsxs("div", { className: "flex justify-end gap-2", children: [p.twitter && _jsx("a", { href: p.twitter, target: "_blank", rel: "noreferrer", className: "text-flash/40 hover:text-jade cursor-clicker", children: "TW" }), p.twitch && _jsx("a", { href: p.twitch, target: "_blank", rel: "noreferrer", className: "text-flash/40 hover:text-jade cursor-clicker", children: "TTV" }), _jsx(Link, { to: `/players/${p.slug}`, className: "text-jade/70 hover:text-jade cursor-clicker", children: "VIEW \u2192" })] }) })] }, p.slug))) })] }) }), _jsxs("div", { className: "flex items-center justify-between mt-3", children: [_jsx("button", { type: "button", onClick: () => setPage((p) => Math.max(1, p - 1)), disabled: page <= 1 || loading, className: btnFlash, children: "\u2039 Prev" }), _jsxs("span", { className: "text-[10px] font-mono text-flash/40 tabular-nums", children: ["page ", data.page, " / ", totalPages, loading && _jsx("span", { className: "ml-2 text-jade/60", children: "updating\u2026" })] }), _jsx("button", { type: "button", onClick: () => setPage((p) => Math.min(totalPages, p + 1)), disabled: page >= totalPages || loading, className: btnFlash, children: "Next \u203A" })] })] }))] })] }));
}
