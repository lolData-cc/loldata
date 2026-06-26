import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { showCyberToast } from "@/lib/toast-utils";
import { LoadingDots } from "@/components/ui/loading-dots";
/* ── Glass card wrapper ─────────────────────────────────────────────── */
function GlassCard({ children }) {
    return (_jsxs("div", { className: "relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" } }), _jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsx("div", { className: "relative z-[2] px-4 py-4 pl-5", children: children })] }));
}
/* ── Main component ─────────────────────────────────────────────────── */
export function StreamerAdminPanel() {
    // ── Applications state
    const [apps, setApps] = useState([]);
    const [appsLoading, setAppsLoading] = useState(true);
    const [appBusyId, setAppBusyId] = useState(null);
    // ── Streamers directory state
    const [streamers, setStreamers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [regionFilter, setRegionFilter] = useState("all");
    // ── Add dialog
    const [addOpen, setAddOpen] = useState(false);
    const [addForm, setAddForm] = useState({ lol_nametag: "", twitch_login: "", region: "EUW" });
    const [addBusy, setAddBusy] = useState(false);
    // ── Delete dialog
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    /* ── Derived ─────────────────────────────────────────────────────── */
    const regions = useMemo(() => [...new Set(streamers.map((s) => s.region).filter(Boolean))].sort(), [streamers]);
    const filtered = useMemo(() => {
        return streamers.filter((s) => {
            if (regionFilter !== "all" && s.region !== regionFilter)
                return false;
            if (search) {
                const q = search.toLowerCase();
                if (!s.lol_nametag?.toLowerCase().includes(q) && !s.twitch_login?.toLowerCase().includes(q))
                    return false;
            }
            return true;
        });
    }, [streamers, regionFilter, search]);
    const pendingApps = useMemo(() => apps.filter((a) => a.status === "pending"), [apps]);
    /* ── Loaders ─────────────────────────────────────────────────────── */
    async function loadApps() {
        setAppsLoading(true);
        const { data, error } = await supabase
            .from("streamer_applications")
            .select("id, twitch_username, lol_account, region, avg_viewers, status, created_at")
            .order("created_at", { ascending: false });
        if (error) {
            showCyberToast({ title: "Failed to load applications", variant: "error" });
            setApps([]);
        }
        else
            setApps((data ?? []));
        setAppsLoading(false);
    }
    async function loadStreamers() {
        setLoading(true);
        const { data, error } = await supabase
            .from("streamers")
            .select("id, lol_nametag, twitch_login, region, profile_image_url, is_live, created_at")
            .order("created_at", { ascending: false });
        if (error) {
            showCyberToast({ title: "Failed to load streamers", variant: "error" });
            setStreamers([]);
        }
        else
            setStreamers((data ?? []));
        setLoading(false);
    }
    useEffect(() => { loadApps(); loadStreamers(); }, []);
    /* ── Application handlers ─────────────────────────────────────────── */
    async function handleApproveApp(app) {
        setAppBusyId(app.id);
        try {
            // Insert into streamers table
            const { error: insErr } = await supabase.from("streamers").insert({
                twitch_login: app.twitch_username,
                lol_nametag: app.lol_account,
                region: app.region ?? "EUW",
            });
            if (insErr) {
                if (insErr.code === "23505")
                    showCyberToast({ title: "Streamer already exists", variant: "error" });
                else
                    showCyberToast({ title: "Failed to add streamer", variant: "error" });
                return;
            }
            // Update application status
            await supabase.from("streamer_applications").update({ status: "approved" }).eq("id", app.id);
            showCyberToast({ title: "Application approved", tag: "STR" });
            await Promise.all([loadApps(), loadStreamers()]);
        }
        finally {
            setAppBusyId(null);
        }
    }
    async function handleRejectApp(app) {
        setAppBusyId(app.id);
        try {
            await supabase.from("streamer_applications").update({ status: "rejected" }).eq("id", app.id);
            showCyberToast({ title: "Application rejected", tag: "STR" });
            await loadApps();
        }
        finally {
            setAppBusyId(null);
        }
    }
    /* ── Streamer handlers ──────────────────────────────────────────── */
    async function handleAdd() {
        if (!addForm.twitch_login.trim()) {
            showCyberToast({ title: "Twitch login is required", variant: "error" });
            return;
        }
        setAddBusy(true);
        try {
            const { error } = await supabase.from("streamers").insert({
                lol_nametag: addForm.lol_nametag.trim() || null,
                twitch_login: addForm.twitch_login.trim(),
                region: addForm.region || null,
            });
            if (error) {
                if (error.code === "23505")
                    showCyberToast({ title: "Streamer already exists", variant: "error" });
                else
                    showCyberToast({ title: "Failed to add streamer", variant: "error" });
                return;
            }
            showCyberToast({ title: "Streamer added", tag: "STR" });
            setAddOpen(false);
            setAddForm({ lol_nametag: "", twitch_login: "", region: "EUW" });
            await loadStreamers();
        }
        finally {
            setAddBusy(false);
        }
    }
    async function handleDelete() {
        if (!deleteTarget)
            return;
        setDeleteBusy(true);
        try {
            const { error } = await supabase.from("streamers").delete().eq("id", deleteTarget.id);
            if (error) {
                showCyberToast({ title: "Failed to delete", variant: "error" });
                return;
            }
            showCyberToast({ title: "Streamer deleted", tag: "STR" });
            setDeleteTarget(null);
            await loadStreamers();
        }
        finally {
            setDeleteBusy(false);
        }
    }
    /* ── Shared styles ───────────────────────────────────────────────── */
    const btnJade = "px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
    const btnFlash = "px-2 py-1 rounded-sm cursor-clicker border border-flash/20 text-flash/70 hover:bg-flash/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
    const btnDanger = "px-2 py-1 rounded-sm cursor-clicker border border-error/30 text-error/80 hover:bg-error/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
    const inputCls = "w-full rounded-sm border border-flash/15 bg-black/40 px-3 py-1.5 text-[11px] text-flash font-mono outline-none focus:border-jade/30 transition-colors";
    const selectCls = "rounded-sm border border-flash/15 bg-black/40 px-2 py-1.5 text-[11px] text-flash font-mono outline-none focus:border-jade/30 cursor-clicker";
    const thCls = "px-3 py-2 text-[10px] font-mono tracking-[0.15em] uppercase text-flash/50";
    const tdCls = "px-3 py-2 text-[11px] font-mono text-flash/70";
    /* ── Render ──────────────────────────────────────────────────────── */
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: STREAMER APPLICATIONS ::" }), _jsxs(GlassCard, { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("p", { className: "text-xs font-mono text-flash/60", children: ["Pending: ", _jsx("span", { className: "text-jade", children: pendingApps.length }), " \u00B7 Total: ", _jsx("span", { className: "text-flash/80", children: apps.length })] }), _jsx("button", { type: "button", onClick: loadApps, disabled: appsLoading, className: btnFlash, children: appsLoading ? "..." : "REFRESH" })] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" }), appsLoading ? (_jsxs("div", { className: "text-xs text-flash/60 inline-flex items-center gap-2", children: [_jsx(LoadingDots, {}), " Loading..."] })) : pendingApps.length === 0 ? (_jsx("p", { className: "text-[11px] font-mono text-flash/40", children: "No pending applications." })) : (_jsx("div", { className: "w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10", children: _jsxs("tr", { children: [_jsx("th", { className: thCls, children: "Created" }), _jsx("th", { className: thCls, children: "Twitch" }), _jsx("th", { className: thCls, children: "LoL Account" }), _jsx("th", { className: thCls, children: "Region" }), _jsx("th", { className: thCls, children: "Avg Viewers" }), _jsx("th", { className: `${thCls} text-right`, children: "Actions" })] }) }), _jsx("tbody", { children: pendingApps.map((a) => {
                                        const isBusy = appBusyId === a.id;
                                        return (_jsxs("tr", { className: "border-b border-flash/5 hover:bg-white/[0.03] transition-colors", children: [_jsx("td", { className: tdCls, children: new Date(a.created_at).toLocaleDateString() }), _jsx("td", { className: `${tdCls} text-flash`, children: a.twitch_username }), _jsx("td", { className: `${tdCls} text-flash`, children: a.lol_account }), _jsx("td", { className: tdCls, children: a.region ?? "—" }), _jsx("td", { className: tdCls, children: a.avg_viewers ?? "—" }), _jsx("td", { className: tdCls, children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => handleApproveApp(a), disabled: isBusy, className: btnJade, children: isBusy ? "..." : "APPROVE" }), _jsx("button", { type: "button", onClick: () => handleRejectApp(a), disabled: isBusy, className: btnFlash, children: "REJECT" })] }) })] }, a.id));
                                    }) })] }) }))] }), _jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8", children: ":: STREAMERS DIRECTORY ::" }), _jsxs(GlassCard, { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("p", { className: "text-xs font-mono text-flash/60", children: ["Total: ", _jsx("span", { className: "text-jade", children: streamers.length }), filtered.length !== streamers.length && (_jsxs(_Fragment, { children: [" \u00B7 Showing: ", _jsx("span", { className: "text-flash/80", children: filtered.length })] }))] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => setAddOpen(true), className: btnJade, children: "+ ADD STREAMER" }), _jsx("button", { type: "button", onClick: loadStreamers, disabled: loading, className: btnFlash, children: loading ? "..." : "REFRESH" })] })] }), _jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("input", { type: "text", placeholder: "Search nametag or twitch...", value: search, onChange: (e) => setSearch(e.target.value), className: `${inputCls} max-w-[240px]` }), _jsxs("select", { value: regionFilter, onChange: (e) => setRegionFilter(e.target.value), className: selectCls, children: [_jsx("option", { value: "all", children: "All regions" }), regions.map((r) => _jsx("option", { value: r, children: r }, r))] }), (search || regionFilter !== "all") && (_jsx("button", { type: "button", onClick: () => { setSearch(""); setRegionFilter("all"); }, className: "text-[10px] font-mono text-flash/40 hover:text-flash/60 cursor-clicker", children: "CLEAR" }))] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" }), loading ? (_jsxs("div", { className: "text-xs text-flash/60 inline-flex items-center gap-2", children: [_jsx(LoadingDots, {}), " Loading..."] })) : filtered.length === 0 ? (_jsx("p", { className: "text-[11px] font-mono text-flash/40", children: streamers.length === 0 ? "No streamers found." : "No results match your filters." })) : (_jsx("div", { className: "w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[500px]", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10", children: _jsxs("tr", { children: [_jsx("th", { className: thCls, children: "LoL Nametag" }), _jsx("th", { className: thCls, children: "Twitch" }), _jsx("th", { className: thCls, children: "Region" }), _jsx("th", { className: thCls, children: "Live" }), _jsx("th", { className: thCls, children: "Created" }), _jsx("th", { className: `${thCls} text-right`, children: "Actions" })] }) }), _jsx("tbody", { children: filtered.map((s) => (_jsxs("tr", { className: "border-b border-flash/5 hover:bg-white/[0.03] transition-colors", children: [_jsx("td", { className: `${tdCls} text-flash`, children: s.lol_nametag ?? "—" }), _jsx("td", { className: tdCls, children: _jsx("a", { href: `https://twitch.tv/${s.twitch_login}`, target: "_blank", rel: "noreferrer", className: "text-[#9b59b6] hover:text-[#a855c7] underline underline-offset-2 cursor-clicker", children: s.twitch_login }) }), _jsx("td", { className: tdCls, children: s.region ? (_jsx("span", { className: "text-[10px] bg-jade/10 border border-jade/20 px-1.5 py-0.5 rounded-sm font-mono", children: s.region })) : "—" }), _jsx("td", { className: tdCls, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `w-2 h-2 rounded-full ${s.is_live ? "bg-jade shadow-[0_0_6px_rgba(0,217,146,0.5)]" : "bg-flash/20"}` }), _jsx("span", { className: "text-[10px]", children: s.is_live ? "LIVE" : "offline" })] }) }), _jsx("td", { className: tdCls, children: new Date(s.created_at).toLocaleDateString() }), _jsx("td", { className: tdCls, children: _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: () => setDeleteTarget(s), className: btnDanger, children: "DELETE" }) }) })] }, s.id))) })] }) }))] }), _jsx(Dialog, { open: addOpen, onOpenChange: (open) => { if (!open) {
                    setAddOpen(false);
                    setAddForm({ lol_nametag: "", twitch_login: "", region: "EUW" });
                } }, children: _jsxs(DialogContent, { className: "w-full max-w-md bg-liquirice/90 border border-flash/10", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Add Streamer ::" }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "LoL Nametag" }), _jsx("input", { type: "text", placeholder: "Name#TAG", value: addForm.lol_nametag, onChange: (e) => setAddForm((f) => ({ ...f, lol_nametag: e.target.value })), className: inputCls })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Twitch Login *" }), _jsx("input", { type: "text", placeholder: "twitchusername", value: addForm.twitch_login, onChange: (e) => setAddForm((f) => ({ ...f, twitch_login: e.target.value })), className: inputCls })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Region" }), _jsxs("select", { value: addForm.region, onChange: (e) => setAddForm((f) => ({ ...f, region: e.target.value })), className: `${selectCls} w-full`, children: [_jsx("option", { value: "EUW", children: "EUW" }), _jsx("option", { value: "NA", children: "NA" }), _jsx("option", { value: "KR", children: "KR" })] })] })] }), _jsxs(DialogFooter, { className: "mt-3 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setAddOpen(false), className: btnFlash, children: "Cancel" }), _jsx("button", { type: "button", onClick: handleAdd, disabled: addBusy, className: btnJade, children: addBusy ? "..." : "ADD STREAMER" })] })] }) }), _jsx(Dialog, { open: !!deleteTarget, onOpenChange: (open) => { if (!open)
                    setDeleteTarget(null); }, children: _jsxs(DialogContent, { className: "w-full max-w-sm bg-liquirice/90 border border-flash/10", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Delete Streamer ::" }), _jsxs(DialogDescription, { className: "text-flash/60 text-xs font-mono", children: ["Remove ", _jsx("span", { className: "text-flash", children: deleteTarget?.twitch_login }), deleteTarget?.lol_nametag ? ` (${deleteTarget.lol_nametag})` : "", " from streamers?"] })] }), _jsxs(DialogFooter, { className: "mt-2 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setDeleteTarget(null), className: btnFlash, children: "Cancel" }), _jsx("button", { type: "button", onClick: handleDelete, disabled: deleteBusy, className: btnDanger, children: deleteBusy ? "..." : "CONFIRM DELETE" })] })] }) })] }));
}
