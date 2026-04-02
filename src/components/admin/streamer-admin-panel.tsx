import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { showCyberToast } from "@/lib/toast-utils";
import { LoadingDots } from "@/components/ui/loading-dots";

/* ── Types ─────────────────────────────────────────────────────────── */

type StreamerRow = {
  id: string;
  lol_nametag: string | null;
  twitch_login: string;
  region: string | null;
  profile_image_url: string | null;
  is_live: boolean;
  created_at: string;
};

type StreamerAppRow = {
  id: string;
  twitch_username: string;
  lol_account: string;
  region: string | null;
  avg_viewers: number | null;
  status: string;
  created_at: string;
};

/* ── Glass card wrapper ─────────────────────────────────────────────── */

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
      <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />
      <div className="relative z-[2] px-4 py-4 pl-5">{children}</div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export function StreamerAdminPanel() {
  // ── Applications state
  const [apps, setApps] = useState<StreamerAppRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appBusyId, setAppBusyId] = useState<string | null>(null);

  // ── Streamers directory state
  const [streamers, setStreamers] = useState<StreamerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");

  // ── Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ lol_nametag: "", twitch_login: "", region: "EUW" });
  const [addBusy, setAddBusy] = useState(false);

  // ── Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<StreamerRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  /* ── Derived ─────────────────────────────────────────────────────── */

  const regions = useMemo(() => [...new Set(streamers.map((s) => s.region).filter(Boolean))].sort() as string[], [streamers]);

  const filtered = useMemo(() => {
    return streamers.filter((s) => {
      if (regionFilter !== "all" && s.region !== regionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.lol_nametag?.toLowerCase().includes(q) && !s.twitch_login?.toLowerCase().includes(q)) return false;
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
    if (error) { showCyberToast({ title: "Failed to load applications", variant: "error" }); setApps([]); }
    else setApps((data ?? []) as StreamerAppRow[]);
    setAppsLoading(false);
  }

  async function loadStreamers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("streamers")
      .select("id, lol_nametag, twitch_login, region, profile_image_url, is_live, created_at")
      .order("created_at", { ascending: false });
    if (error) { showCyberToast({ title: "Failed to load streamers", variant: "error" }); setStreamers([]); }
    else setStreamers((data ?? []) as StreamerRow[]);
    setLoading(false);
  }

  useEffect(() => { loadApps(); loadStreamers(); }, []);

  /* ── Application handlers ─────────────────────────────────────────── */

  async function handleApproveApp(app: StreamerAppRow) {
    setAppBusyId(app.id);
    try {
      // Insert into streamers table
      const { error: insErr } = await supabase.from("streamers").insert({
        twitch_login: app.twitch_username,
        lol_nametag: app.lol_account,
        region: app.region ?? "EUW",
      });
      if (insErr) {
        if (insErr.code === "23505") showCyberToast({ title: "Streamer already exists", variant: "error" });
        else showCyberToast({ title: "Failed to add streamer", variant: "error" });
        return;
      }
      // Update application status
      await supabase.from("streamer_applications").update({ status: "approved" }).eq("id", app.id);
      showCyberToast({ title: "Application approved", tag: "STR" });
      await Promise.all([loadApps(), loadStreamers()]);
    } finally { setAppBusyId(null); }
  }

  async function handleRejectApp(app: StreamerAppRow) {
    setAppBusyId(app.id);
    try {
      await supabase.from("streamer_applications").update({ status: "rejected" }).eq("id", app.id);
      showCyberToast({ title: "Application rejected", tag: "STR" });
      await loadApps();
    } finally { setAppBusyId(null); }
  }

  /* ── Streamer handlers ──────────────────────────────────────────── */

  async function handleAdd() {
    if (!addForm.twitch_login.trim()) { showCyberToast({ title: "Twitch login is required", variant: "error" }); return; }
    setAddBusy(true);
    try {
      const { error } = await supabase.from("streamers").insert({
        lol_nametag: addForm.lol_nametag.trim() || null,
        twitch_login: addForm.twitch_login.trim(),
        region: addForm.region || null,
      });
      if (error) {
        if (error.code === "23505") showCyberToast({ title: "Streamer already exists", variant: "error" });
        else showCyberToast({ title: "Failed to add streamer", variant: "error" });
        return;
      }
      showCyberToast({ title: "Streamer added", tag: "STR" });
      setAddOpen(false);
      setAddForm({ lol_nametag: "", twitch_login: "", region: "EUW" });
      await loadStreamers();
    } finally { setAddBusy(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase.from("streamers").delete().eq("id", deleteTarget.id);
      if (error) { showCyberToast({ title: "Failed to delete", variant: "error" }); return; }
      showCyberToast({ title: "Streamer deleted", tag: "STR" });
      setDeleteTarget(null);
      await loadStreamers();
    } finally { setDeleteBusy(false); }
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

  return (
    <div className="space-y-6">

      {/* ═══ SECTION 1: PENDING APPLICATIONS ═══ */}
      <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">:: STREAMER APPLICATIONS ::</p>
      <GlassCard>
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-mono text-flash/60">
            Pending: <span className="text-jade">{pendingApps.length}</span> · Total: <span className="text-flash/80">{apps.length}</span>
          </p>
          <button type="button" onClick={loadApps} disabled={appsLoading} className={btnFlash}>{appsLoading ? "..." : "REFRESH"}</button>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" />
        {appsLoading ? (
          <div className="text-xs text-flash/60 inline-flex items-center gap-2"><LoadingDots /> Loading...</div>
        ) : pendingApps.length === 0 ? (
          <p className="text-[11px] font-mono text-flash/40">No pending applications.</p>
        ) : (
          <div className="w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10">
                <tr>
                  <th className={thCls}>Created</th>
                  <th className={thCls}>Twitch</th>
                  <th className={thCls}>LoL Account</th>
                  <th className={thCls}>Region</th>
                  <th className={thCls}>Avg Viewers</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApps.map((a) => {
                  const isBusy = appBusyId === a.id;
                  return (
                    <tr key={a.id} className="border-b border-flash/5 hover:bg-white/[0.03] transition-colors">
                      <td className={tdCls}>{new Date(a.created_at).toLocaleDateString()}</td>
                      <td className={`${tdCls} text-flash`}>{a.twitch_username}</td>
                      <td className={`${tdCls} text-flash`}>{a.lol_account}</td>
                      <td className={tdCls}>{a.region ?? "—"}</td>
                      <td className={tdCls}>{a.avg_viewers ?? "—"}</td>
                      <td className={tdCls}>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handleApproveApp(a)} disabled={isBusy} className={btnJade}>{isBusy ? "..." : "APPROVE"}</button>
                          <button type="button" onClick={() => handleRejectApp(a)} disabled={isBusy} className={btnFlash}>REJECT</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ═══ SECTION 2: STREAMERS DIRECTORY ═══ */}
      <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8">:: STREAMERS DIRECTORY ::</p>

      <GlassCard>
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-mono text-flash/60">
            Total: <span className="text-jade">{streamers.length}</span>
            {filtered.length !== streamers.length && (
              <> · Showing: <span className="text-flash/80">{filtered.length}</span></>
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAddOpen(true)} className={btnJade}>+ ADD STREAMER</button>
            <button type="button" onClick={loadStreamers} disabled={loading} className={btnFlash}>
              {loading ? "..." : "REFRESH"}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            placeholder="Search nametag or twitch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputCls} max-w-[240px]`}
          />
          <select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} className={selectCls}>
            <option value="all">All regions</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {(search || regionFilter !== "all") && (
            <button type="button" onClick={() => { setSearch(""); setRegionFilter("all"); }} className="text-[10px] font-mono text-flash/40 hover:text-flash/60 cursor-clicker">
              CLEAR
            </button>
          )}
        </div>

        <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" />

        {loading ? (
          <div className="text-xs text-flash/60 inline-flex items-center gap-2"><LoadingDots /> Loading...</div>
        ) : filtered.length === 0 ? (
          <p className="text-[11px] font-mono text-flash/40">
            {streamers.length === 0 ? "No streamers found." : "No results match your filters."}
          </p>
        ) : (
          <div className="w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[500px]">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10">
                <tr>
                  <th className={thCls}>LoL Nametag</th>
                  <th className={thCls}>Twitch</th>
                  <th className={thCls}>Region</th>
                  <th className={thCls}>Live</th>
                  <th className={thCls}>Created</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-flash/5 hover:bg-white/[0.03] transition-colors">
                    <td className={`${tdCls} text-flash`}>{s.lol_nametag ?? "—"}</td>
                    <td className={tdCls}>
                      <a
                        href={`https://twitch.tv/${s.twitch_login}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#9b59b6] hover:text-[#a855c7] underline underline-offset-2 cursor-clicker"
                      >
                        {s.twitch_login}
                      </a>
                    </td>
                    <td className={tdCls}>
                      {s.region ? (
                        <span className="text-[10px] bg-jade/10 border border-jade/20 px-1.5 py-0.5 rounded-sm font-mono">
                          {s.region}
                        </span>
                      ) : "—"}
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.is_live ? "bg-jade shadow-[0_0_6px_rgba(0,217,146,0.5)]" : "bg-flash/20"}`} />
                        <span className="text-[10px]">{s.is_live ? "LIVE" : "offline"}</span>
                      </div>
                    </td>
                    <td className={tdCls}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className={tdCls}>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => setDeleteTarget(s)} className={btnDanger}>DELETE</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ═══ DIALOGS ═══ */}

      {/* Add streamer */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setAddOpen(false); setAddForm({ lol_nametag: "", twitch_login: "", region: "EUW" }); } }}>
        <DialogContent className="w-full max-w-md bg-liquirice/90 border border-flash/10">
          <DialogHeader>
            <DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Add Streamer ::</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">LoL Nametag</Label>
              <input type="text" placeholder="Name#TAG" value={addForm.lol_nametag} onChange={(e) => setAddForm((f) => ({ ...f, lol_nametag: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Twitch Login *</Label>
              <input type="text" placeholder="twitchusername" value={addForm.twitch_login} onChange={(e) => setAddForm((f) => ({ ...f, twitch_login: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Region</Label>
              <select value={addForm.region} onChange={(e) => setAddForm((f) => ({ ...f, region: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="EUW">EUW</option>
                <option value="NA">NA</option>
                <option value="KR">KR</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-3 flex justify-between">
            <button type="button" onClick={() => setAddOpen(false)} className={btnFlash}>Cancel</button>
            <button type="button" onClick={handleAdd} disabled={addBusy} className={btnJade}>
              {addBusy ? "..." : "ADD STREAMER"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="w-full max-w-sm bg-liquirice/90 border border-flash/10">
          <DialogHeader>
            <DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Delete Streamer ::</DialogTitle>
            <DialogDescription className="text-flash/60 text-xs font-mono">
              Remove <span className="text-flash">{deleteTarget?.twitch_login}</span>{deleteTarget?.lol_nametag ? ` (${deleteTarget.lol_nametag})` : ""} from streamers?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex justify-between">
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnFlash}>Cancel</button>
            <button type="button" onClick={handleDelete} disabled={deleteBusy} className={btnDanger}>
              {deleteBusy ? "..." : "CONFIRM DELETE"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
