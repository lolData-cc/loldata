import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Dashboard SCOUT tab — lists the authenticated user's scout lobbies with
// quota info and a create-new button. Plan limits enforced by the backend:
// free 3, premium (PRO) 5, elite 10.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users, ExternalLink, Clock, AlertCircle, Crown, } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
const PLAN_LABEL = {
    free: "FREE",
    premium: "PRO",
    elite: "ELITE",
};
const PLAN_COLOR = {
    free: "text-flash/60",
    premium: "text-jade",
    elite: "text-amber-300",
};
function formatRelative(iso) {
    if (!iso)
        return "never";
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const min = Math.floor(diff / 60_000);
    if (min < 1)
        return "just now";
    if (min < 60)
        return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    if (d < 30)
        return `${d}d ago`;
    const mo = Math.floor(d / 30);
    return `${mo}mo ago`;
}
export default function ScoutLobbiesManager() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) {
                    if (!cancelled) {
                        setError("Login required");
                        setLoading(false);
                    }
                    return;
                }
                const res = await fetch(`${API_BASE_URL}/api/scout/my-lobbies`, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const json = (await res.json());
                if (!cancelled) {
                    setData(json);
                    setLoading(false);
                }
            }
            catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : "Failed to load");
                    setLoading(false);
                }
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);
    if (loading) {
        return (_jsx("div", { className: "space-y-3", children: [0, 1, 2].map((i) => (_jsx("div", { className: "h-16 rounded-[2px] border border-flash/8 bg-black/20 animate-pulse" }, i))) }));
    }
    if (error || !data) {
        return (_jsxs("div", { className: "rounded-[2px] border border-red-400/20 bg-red-400/5 px-4 py-3 flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-red-400/70" }), _jsx("span", { className: "text-[11px] font-mono text-red-300/80", children: error ?? "Failed to load" })] }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                            background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)",
                        } }), _jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsxs("div", { className: "relative z-[2] px-4 py-3 pl-5 flex items-center justify-between gap-4", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-0.5", children: [_jsx("h4", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: "Your Plan" }), _jsxs("span", { className: cn("inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-[0.2em] px-1.5 py-[1px] rounded-sm border", data.plan === "free"
                                                    ? "border-flash/15 text-flash/60"
                                                    : data.plan === "premium"
                                                        ? "border-jade/30 bg-jade/10 text-jade"
                                                        : "border-amber-400/30 bg-amber-400/10 text-amber-300"), children: [data.plan !== "free" && _jsx(Crown, { className: "w-2.5 h-2.5" }), PLAN_LABEL[data.plan]] })] }), _jsxs("div", { className: "flex items-baseline gap-1.5", children: [_jsx("span", { className: cn("text-[20px] font-orbitron font-bold tabular-nums", PLAN_COLOR[data.plan]), children: data.used }), _jsxs("span", { className: "text-[12px] font-mono text-flash/30", children: ["/ ", data.limit, " lobbies used"] })] }), !data.canCreate && data.plan !== "elite" && (_jsxs("p", { className: "mt-1 text-[10px] font-mono text-flash/40", children: ["Limit reached \u2014 upgrade for more.", " ", _jsx(Link, { to: "/pricing", className: "text-jade hover:underline", children: "See plans \u2192" })] }))] }), data.canCreate ? (_jsxs(Link, { to: "/scout/new", className: "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-jade/40 text-jade hover:bg-jade/10 hover:shadow-[0_0_15px_rgba(0,217,146,0.15)] font-mono text-[10px] tracking-[0.2em] uppercase cursor-clicker transition-all", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), "New lobby"] })) : (_jsxs(Link, { to: "/pricing", className: cn("shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border font-mono text-[10px] tracking-[0.2em] uppercase cursor-clicker transition-all", data.plan === "premium"
                                    ? "border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                                    : "border-jade/40 text-jade hover:bg-jade/10"), children: [_jsx(Crown, { className: "w-3.5 h-3.5" }), "Upgrade"] }))] })] }), data.lobbies.length === 0 ? (_jsxs("div", { className: "rounded-[2px] border border-dashed border-flash/15 bg-black/20 px-6 py-10 flex flex-col items-center text-center gap-3", children: [_jsxs("div", { className: "relative w-10 h-10", children: [_jsx("span", { className: "absolute inset-0 rotate-45 rounded-[3px] border border-jade/30 bg-jade/5" }), _jsx("span", { className: "absolute inset-0 flex items-center justify-center text-jade/60", children: _jsx(Users, { className: "w-4 h-4" }) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-[12px] font-mono text-flash/60 mb-1", children: "No lobbies yet" }), _jsx("p", { className: "text-[10px] font-mono text-flash/30", children: "Create your first lobby to start tracking your squad." })] }), _jsxs(Link, { to: "/scout/new", className: "mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border border-jade/40 text-jade hover:bg-jade/10 font-mono text-[10px] tracking-[0.2em] uppercase cursor-clicker transition-all", children: [_jsx(Plus, { className: "w-3 h-3" }), "Create lobby"] })] })) : (_jsx("div", { className: "space-y-2", children: data.lobbies.map((lobby) => (_jsxs(Link, { to: `/scout/${lobby.slug}`, className: "group relative block rounded-[2px] border border-flash/10 bg-black/25 hover:bg-black/35 hover:border-jade/25 hover:shadow-[0_0_15px_rgba(0,217,146,0.08)] transition-all overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-flash/20 group-hover:bg-jade/50 transition-colors" }), _jsxs("div", { className: "relative z-10 px-4 py-3 pl-5 flex items-center gap-4", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h3", { className: "text-[13px] font-mono font-bold text-flash truncate group-hover:text-jade transition-colors", children: lobby.name }), !lobby.isPublic && (_jsx("span", { className: "text-[8px] font-mono uppercase tracking-wider text-flash/40 border border-flash/15 px-1 py-[1px] rounded-sm", children: "Private" }))] }), _jsxs("div", { className: "flex items-center gap-3 text-[10px] font-mono text-flash/35", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Users, { className: "w-2.5 h-2.5" }), lobby.playerCount, " ", lobby.playerCount === 1 ? "player" : "players"] }), _jsx("span", { className: "opacity-30", children: "\u00B7" }), _jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "w-2.5 h-2.5" }), "refreshed ", formatRelative(lobby.lastRefreshAt)] })] })] }), _jsxs("div", { className: "shrink-0 flex items-center gap-2", children: [_jsxs("code", { className: "hidden sm:block text-[10px] font-mono text-flash/25 tabular-nums", children: ["/", lobby.slug] }), _jsx(ExternalLink, { className: "w-3.5 h-3.5 text-flash/30 group-hover:text-jade transition-colors" })] })] })] }, lobby.slug))) }))] }));
}
