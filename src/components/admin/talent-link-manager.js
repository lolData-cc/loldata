import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// Admin widget: link multiple LoL accounts (with region) + edit socials for a
// pro or streamer. All reads/writes go through the admin-gated backend endpoints
// (service role), not the browser writing Supabase directly.
import { useEffect, useState } from "react";
import { useAuth } from "@/context/authcontext";
import { BOX_API_BASE_URL } from "@/config";
import { toast } from "sonner";
import { Plus, X, Save, Loader2 } from "lucide-react";
const REGIONS = ["EUW", "EUNE", "NA", "KR"];
const inputCls = "w-full rounded-[4px] border border-flash/10 bg-filmdark/40 px-2.5 py-1.5 font-jetbrains text-[12px] text-flash/90 outline-none transition-colors focus:border-jade/40 placeholder:text-flash/25";
const selCls = "rounded-[4px] border border-flash/10 bg-filmdark/40 px-2 py-1.5 font-jetbrains text-[11px] text-flash/80 outline-none transition-colors focus:border-jade/40 cursor-clicker";
export function TalentLinkManager({ type, ownerId }) {
    const { session } = useAuth();
    const token = session?.access_token;
    const [accounts, setAccounts] = useState([]);
    const [socials, setSocials] = useState({});
    const [newUser, setNewUser] = useState("");
    const [newRegion, setNewRegion] = useState("EUW");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    async function api(path, opts = {}) {
        const r = await fetch(`${BOX_API_BASE_URL}${path}`, {
            ...opts,
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok)
            throw new Error(j?.error || `Error ${r.status}`);
        return j;
    }
    useEffect(() => {
        let alive = true;
        setLoading(true);
        api(`/api/admin/talent?type=${type}&ownerId=${encodeURIComponent(ownerId)}`)
            .then((d) => { if (!alive)
            return; setAccounts(d.accounts ?? []); setSocials(d.socials ?? {}); })
            .catch((e) => toast.error(String(e?.message || e)))
            .finally(() => { if (alive)
            setLoading(false); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, ownerId]);
    async function addAccount() {
        const username = newUser.trim();
        if (!username)
            return;
        if (!username.includes("#")) {
            toast.error("Use Name#TAG");
            return;
        }
        setBusy(true);
        try {
            const { account } = await api("/api/admin/talent/account/add", { method: "POST", body: JSON.stringify({ type, ownerId, username, region: newRegion }) });
            setAccounts((a) => [...a, account]);
            setNewUser("");
            toast.success("Account linked");
        }
        catch (e) {
            toast.error(String(e?.message || e));
        }
        finally {
            setBusy(false);
        }
    }
    async function removeAccount(id) {
        setBusy(true);
        try {
            await api("/api/admin/talent/account/remove", { method: "POST", body: JSON.stringify({ type, accountId: id }) });
            setAccounts((a) => a.filter((x) => x.id !== id));
        }
        catch (e) {
            toast.error(String(e?.message || e));
        }
        finally {
            setBusy(false);
        }
    }
    async function save() {
        setBusy(true);
        try {
            await api("/api/admin/talent/save", { method: "POST", body: JSON.stringify({ type, ownerId, ...socials }) });
            toast.success("Saved");
        }
        catch (e) {
            toast.error(String(e?.message || e));
        }
        finally {
            setBusy(false);
        }
    }
    return (
    // Horizontal 2-column layout: the accounts list (left) grows independently
    // inside its own capped, scrollable box, so the socials Save button (right)
    // never gets pushed off-screen no matter how many accounts are linked.
    _jsxs("div", { className: "grid grid-cols-1 gap-5 md:grid-cols-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "mb-2 font-jetbrains text-[10px] uppercase tracking-[0.15em] text-jade/60", children: ["Linked accounts (", accounts.length, ")"] }), loading ? (_jsxs("div", { className: "flex items-center gap-2 font-jetbrains text-[11px] text-flash/40", children: [_jsx(Loader2, { className: "h-3 w-3 animate-spin" }), " loading\u2026"] })) : (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "max-h-[176px] space-y-1.5 overflow-y-auto pr-1 cyber-scrollbar", children: [accounts.map((a) => (_jsxs("div", { className: "flex items-center gap-2 rounded-[4px] border border-flash/[0.07] bg-filmdark/25 px-2.5 py-1.5", children: [_jsx("span", { className: "rounded-[3px] border border-jade/20 bg-jade/[0.06] px-1.5 py-[1px] font-jetbrains text-[9px] font-bold uppercase text-jade/70", children: a.region || "—" }), _jsx("span", { className: "flex-1 truncate font-jetbrains text-[12px] text-flash/85", children: a.username }), _jsx("button", { type: "button", onClick: () => removeAccount(a.id), disabled: busy, className: "grid h-5 w-5 shrink-0 place-items-center rounded-[3px] text-flash/35 transition-colors hover:bg-[#ff6286]/15 hover:text-[#ff6286] disabled:opacity-40 cursor-clicker", children: _jsx(X, { className: "h-3 w-3" }) })] }, a.id))), accounts.length === 0 && _jsx("div", { className: "font-jetbrains text-[11px] text-flash/25", children: "No accounts linked yet." })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { value: newUser, onChange: (e) => setNewUser(e.target.value), onKeyDown: (e) => { if (e.key === "Enter")
                                            addAccount(); }, placeholder: "Name#TAG", className: inputCls }), _jsx("select", { value: newRegion, onChange: (e) => setNewRegion(e.target.value), className: selCls, children: REGIONS.map((r) => _jsx("option", { value: r, children: r }, r)) }), _jsxs("button", { type: "button", onClick: addAccount, disabled: busy || !newUser.trim(), className: "flex shrink-0 items-center gap-1 rounded-[4px] bg-jade/15 px-2.5 py-1.5 font-jetbrains text-[11px] font-medium text-jade transition-colors hover:bg-jade/25 disabled:opacity-40 cursor-clicker", children: [_jsx(Plus, { className: "h-3 w-3" }), " Add"] })] })] }))] }), _jsxs("div", { className: "flex min-w-0 flex-col", children: [_jsx("div", { className: "mb-2 font-jetbrains text-[10px] uppercase tracking-[0.15em] text-jade/60", children: "Primary region & socials" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-wide text-flash/35", children: "Primary region" }), _jsxs("select", { value: socials.region || "", onChange: (e) => setSocials((s) => ({ ...s, region: e.target.value })), className: `${selCls} w-full`, children: [_jsx("option", { value: "", children: "\u2014" }), REGIONS.map((r) => _jsx("option", { value: r, children: r }, r))] })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-wide text-flash/35", children: "X / Twitter URL" }), _jsx("input", { value: socials.twitter_url || "", onChange: (e) => setSocials((s) => ({ ...s, twitter_url: e.target.value })), placeholder: "https://x.com/\u2026", className: inputCls })] }), _jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-wide text-flash/35", children: "YouTube URL" }), _jsx("input", { value: socials.youtube_url || "", onChange: (e) => setSocials((s) => ({ ...s, youtube_url: e.target.value })), placeholder: "https://youtube.com/\u2026", className: inputCls })] }), type === "pro" && (_jsxs("label", { className: "flex flex-col gap-1", children: [_jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-wide text-flash/35", children: "Twitch URL" }), _jsx("input", { value: socials.twitch_url || "", onChange: (e) => setSocials((s) => ({ ...s, twitch_url: e.target.value })), placeholder: "https://twitch.tv/\u2026", className: inputCls })] }))] }), _jsxs("button", { type: "button", onClick: save, disabled: busy, className: "mt-3 flex items-center justify-center gap-1.5 rounded-[4px] bg-jade px-3 py-2 font-jetbrains text-[11px] font-bold uppercase tracking-wide text-[#04110c] transition-transform hover:scale-[1.02] disabled:opacity-40 cursor-clicker", children: [busy ? _jsx(Loader2, { className: "h-3 w-3 animate-spin" }) : _jsx(Save, { className: "h-3 w-3" }), " Save"] })] })] }));
}
