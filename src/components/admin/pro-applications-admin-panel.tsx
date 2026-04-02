import { useEffect, useMemo, useRef, useState } from "react";
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
import { API_BASE_URL } from "@/config";

/* ── Types ─────────────────────────────────────────────────────────── */

type ProApplicationRow = {
  id: number;
  created_at: string;
  guild_id: string | null;
  creator_id: string | null;
  thread_id: string | null;
  thread_url: string | null;
  riot_id: string | null;
  nationality: string | null;
  name: string | null;
  team: string | null;
  other: string | null;
  status: "pending" | "approved" | "rejected" | string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reject_reason: string | null;
};

type ProPlayerRow = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  team: string | null;
  nationality: string | null;
  profile_image_url: string | null;
  created_at: string;
};

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
};

type ProAccountRow = {
  id: string;
  pro_player_id: string;
  username: string;
  created_at: string;
};

/* ── Helpers ────────────────────────────────────────────────────────── */

function parseRiotId(riotId: string): { name: string; tag: string } | null {
  const raw = riotId.trim();
  const idx = raw.lastIndexOf("#");
  if (idx <= 0 || idx === raw.length - 1) return null;
  return { name: raw.slice(0, idx).trim(), tag: raw.slice(idx + 1).trim() };
}

function regionFromTag(tag: string): "EUW" | "NA" | "KR" {
  const t = tag.trim().toUpperCase();
  if (t === "NA") return "NA";
  if (t === "KR") return "KR";
  return "EUW";
}

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

/* ── Shared styles ───────────────────────────────────────────────── */

const btnJade = "px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
const btnFlash = "px-2 py-1 rounded-sm cursor-clicker border border-flash/20 text-flash/70 hover:bg-flash/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
const btnDanger = "px-2 py-1 rounded-sm cursor-clicker border border-error/30 text-error/80 hover:bg-error/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
const inputCls = "w-full rounded-sm border border-flash/15 bg-black/40 px-3 py-1.5 text-[11px] text-flash font-mono outline-none focus:border-jade/30 transition-colors";
const selectCls = "rounded-sm border border-flash/15 bg-black/40 px-2 py-1.5 text-[11px] text-flash font-mono outline-none focus:border-jade/30 cursor-clicker";
const thCls = "px-3 py-2 text-[10px] font-mono tracking-[0.15em] uppercase text-flash/50";
const tdCls = "px-3 py-2 text-[11px] font-mono text-flash/70";

/* ── Main component ─────────────────────────────────────────────────── */

export function ProApplicationsAdminPanel() {
  // ── Applications state
  const [rows, setRows] = useState<ProApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ProApplicationRow | null>(null);
  const [lpById, setLpById] = useState<Record<number, number | null>>({});
  const [lpsLoadingId, setLpsLoadingId] = useState<number | null>(null);

  // ── Pro players directory state
  const [proPlayers, setProPlayers] = useState<ProPlayerRow[]>([]);
  const [proLoading, setProLoading] = useState(true);
  const [proSearch, setProSearch] = useState("");
  const [proTeamFilter, setProTeamFilter] = useState("all");
  const [proNatFilter, setProNatFilter] = useState("all");

  // ── Add pro dialog
  const [addProOpen, setAddProOpen] = useState(false);
  const [addProForm, setAddProForm] = useState({ username: "", first_name: "", last_name: "", nickname: "", team: "", nationality: "" });
  const [addProBusy, setAddProBusy] = useState(false);

  // ── Delete pro dialog
  const [deleteTarget, setDeleteTarget] = useState<ProPlayerRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // ── Manage pro dialog
  const [manageTarget, setManageTarget] = useState<ProPlayerRow | null>(null);
  const [manageAccounts, setManageAccounts] = useState<ProAccountRow[]>([]);
  const [manageAccountsLoading, setManageAccountsLoading] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [manageAvatarFile, setManageAvatarFile] = useState<File | null>(null);
  const [manageBusy, setManageBusy] = useState(false);
  const [manageNickname, setManageNickname] = useState("");
  const [manageFirstName, setManageFirstName] = useState("");
  const [manageLastName, setManageLastName] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Teams state
  const [teamsList, setTeamsList] = useState<TeamRow[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamSearch, setTeamSearch] = useState("");
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [addTeamForm, setAddTeamForm] = useState({ name: "" });
  const [addTeamLogo, setAddTeamLogo] = useState<File | null>(null);
  const [addTeamBusy, setAddTeamBusy] = useState(false);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<TeamRow | null>(null);
  const [deleteTeamBusy, setDeleteTeamBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /* ── Derived ─────────────────────────────────────────────────────── */

  const pendingRows = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const teamNames = useMemo(() => teamsList.map((t) => t.name).sort(), [teamsList]);
  const teamLogoMap = useMemo(() => {
    const m: Record<string, string | null> = {};
    for (const t of teamsList) m[t.name] = t.logo_url;
    return m;
  }, [teamsList]);
  const nationalities = useMemo(() => [...new Set(proPlayers.map((p) => p.nationality).filter(Boolean))].sort() as string[], [proPlayers]);

  const filteredPros = useMemo(() => {
    return proPlayers.filter((p) => {
      if (proTeamFilter !== "all" && p.team !== proTeamFilter) return false;
      if (proNatFilter !== "all" && p.nationality !== proNatFilter) return false;
      if (proSearch) {
        const q = proSearch.toLowerCase();
        if (!p.username?.toLowerCase().includes(q) && !p.first_name?.toLowerCase().includes(q) && !p.nickname?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [proPlayers, proTeamFilter, proNatFilter, proSearch]);

  const filteredTeams = useMemo(() => {
    if (!teamSearch) return teamsList;
    const q = teamSearch.toLowerCase();
    return teamsList.filter((t) => t.name.toLowerCase().includes(q));
  }, [teamsList, teamSearch]);

  /* ── Loaders ─────────────────────────────────────────────────────── */

  async function loadApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("proApplications")
      .select("id, created_at, guild_id, creator_id, thread_id, thread_url, riot_id, nationality, name, team, other, status, reviewed_at, reviewer_id, reject_reason")
      .order("created_at", { ascending: false });
    if (error) { showCyberToast({ title: "Failed to load applications", variant: "error" }); setRows([]); }
    else setRows((data ?? []) as ProApplicationRow[]);
    setLoading(false);
  }

  async function loadProPlayers() {
    setProLoading(true);
    const { data, error } = await supabase
      .from("pro_players")
      .select("id, username, first_name, last_name, nickname, team, nationality, profile_image_url, created_at")
      .order("created_at", { ascending: false });
    if (error) { showCyberToast({ title: "Failed to load pro players", variant: "error" }); setProPlayers([]); }
    else setProPlayers((data ?? []) as ProPlayerRow[]);
    setProLoading(false);
  }

  async function loadTeams() {
    setTeamsLoading(true);
    const { data, error } = await supabase
      .from("teams")
      .select("id, name, logo_url, created_at")
      .order("name", { ascending: true });
    if (error) { showCyberToast({ title: "Failed to load teams", variant: "error" }); setTeamsList([]); }
    else setTeamsList((data ?? []) as TeamRow[]);
    setTeamsLoading(false);
  }

  async function loadManageAccounts(proPlayerId: string) {
    setManageAccountsLoading(true);
    const { data, error } = await supabase
      .from("pro_player_accounts")
      .select("id, pro_player_id, username, created_at")
      .eq("pro_player_id", proPlayerId)
      .order("created_at", { ascending: true });
    if (error) { showCyberToast({ title: "Failed to load accounts", variant: "error" }); setManageAccounts([]); }
    else setManageAccounts((data ?? []) as ProAccountRow[]);
    setManageAccountsLoading(false);
  }

  useEffect(() => { loadApplications(); loadProPlayers(); loadTeams(); }, []);

  /* ── Application handlers ────────────────────────────────────────── */

  async function handleApprove(row: ProApplicationRow) {
    if (!row.riot_id) { showCyberToast({ title: "Missing riot_id", variant: "error" }); return; }
    setBusyId(row.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { showCyberToast({ title: "Not logged in", variant: "error" }); return; }
      const { error: insErr } = await supabase.from("pro_players").insert({
        username: row.riot_id, first_name: row.name ?? null,
        team: row.team ?? null, nationality: row.nationality ?? null,
      });
      if (insErr) { showCyberToast({ title: "Failed to create pro player", variant: "error" }); return; }
      const { error: updErr } = await supabase.from("proApplications")
        .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewer_id: auth.user.id, reject_reason: null })
        .eq("id", row.id);
      if (updErr) { showCyberToast({ title: "Player created, but failed to update application", variant: "error" }); return; }
      showCyberToast({ title: "Application approved", tag: "PRO" });
      await Promise.all([loadApplications(), loadProPlayers()]);
    } finally { setBusyId(null); }
  }

  function openReject(row: ProApplicationRow) { setRejectTarget(row); setRejectReason(""); setRejectOpen(true); }

  async function confirmReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { showCyberToast({ title: "Not logged in", variant: "error" }); return; }
      const { error } = await supabase.from("proApplications")
        .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewer_id: auth.user.id, reject_reason: rejectReason.trim() || null })
        .eq("id", rejectTarget.id);
      if (error) { showCyberToast({ title: "Failed to reject", variant: "error" }); return; }
      showCyberToast({ title: "Application rejected", tag: "PRO" });
      setRejectOpen(false); setRejectTarget(null);
      await loadApplications();
    } finally { setBusyId(null); }
  }

  async function handleCheckLps(row: ProApplicationRow) {
    if (!row.riot_id) { showCyberToast({ title: "Missing riot_id", variant: "error" }); return; }
    const parsed = parseRiotId(row.riot_id);
    if (!parsed) { showCyberToast({ title: "Invalid riot_id format", variant: "error" }); return; }
    setLpsLoadingId(row.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/summoner`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.name, tag: parsed.tag, region: regionFromTag(parsed.tag) }),
      });
      if (!res.ok) { showCyberToast({ title: "Failed to fetch LPs", variant: "error" }); setLpById((p) => ({ ...p, [row.id]: null })); return; }
      const json = await res.json();
      const lp = Number(json?.summoner?.lp);
      if (Number.isFinite(lp)) { setLpById((p) => ({ ...p, [row.id]: lp })); showCyberToast({ title: `LPs: ${lp}`, tag: "LP" }); }
      else { setLpById((p) => ({ ...p, [row.id]: null })); showCyberToast({ title: "Could not read LP", variant: "error" }); }
    } catch { showCyberToast({ title: "Network error", variant: "error" }); } finally { setLpsLoadingId(null); }
  }

  /* ── Pro players handlers ────────────────────────────────────────── */

  async function handleAddPro() {
    if (!addProForm.username.trim()) { showCyberToast({ title: "Username is required", variant: "error" }); return; }
    setAddProBusy(true);
    try {
      const { error } = await supabase.from("pro_players").insert({
        username: addProForm.username.trim(),
        first_name: addProForm.first_name.trim() || null,
        last_name: addProForm.last_name.trim() || null,
        nickname: addProForm.nickname.trim() || null,
        team: addProForm.team || null,
        nationality: addProForm.nationality.trim() || null,
      });
      if (error) {
        if (error.code === "23505") showCyberToast({ title: "Player already exists", variant: "error" });
        else showCyberToast({ title: "Failed to add pro player", variant: "error" });
        return;
      }
      showCyberToast({ title: "Pro player added", tag: "PRO" });
      setAddProOpen(false);
      setAddProForm({ username: "", first_name: "", last_name: "", nickname: "", team: "", nationality: "" });
      await loadProPlayers();
    } finally { setAddProBusy(false); }
  }

  async function handleDeletePro() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const { error } = await supabase.from("pro_players").delete().eq("id", deleteTarget.id);
      if (error) { showCyberToast({ title: "Failed to delete", variant: "error" }); return; }
      showCyberToast({ title: "Pro player deleted", tag: "PRO" });
      setDeleteTarget(null);
      await loadProPlayers();
    } finally { setDeleteBusy(false); }
  }

  /* ── Manage handlers ─────────────────────────────────────────────── */

  function openManage(player: ProPlayerRow) {
    setManageTarget(player);
    setManageNickname(player.nickname ?? "");
    setManageFirstName(player.first_name ?? "");
    setManageLastName(player.last_name ?? "");
    setManageAvatarFile(null);
    setNewAccountName("");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    loadManageAccounts(player.id);
  }

  function closeManage() {
    setManageTarget(null);
    setManageAccounts([]);
    setManageAvatarFile(null);
    setNewAccountName("");
    setManageNickname("");
    setManageFirstName("");
    setManageLastName("");
  }

  async function handleSaveDetails() {
    if (!manageTarget) return;
    setManageBusy(true);
    try {
      const { error } = await supabase.from("pro_players")
        .update({
          nickname: manageNickname.trim() || null,
          first_name: manageFirstName.trim() || null,
          last_name: manageLastName.trim() || null,
        })
        .eq("id", manageTarget.id);
      if (error) { showCyberToast({ title: "Failed to save", variant: "error" }); return; }
      showCyberToast({ title: "Details saved", tag: "PRO" });
      await loadProPlayers();
      setManageTarget((prev) => prev ? { ...prev, nickname: manageNickname.trim() || null, first_name: manageFirstName.trim() || null, last_name: manageLastName.trim() || null } : null);
    } finally { setManageBusy(false); }
  }

  async function handleUploadAvatar() {
    if (!manageTarget || !manageAvatarFile) return;
    setManageBusy(true);
    try {
      const ext = manageAvatarFile.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${manageTarget.id}.${ext}`;
      // Remove old file if exists (ignore errors)
      await supabase.storage.from("pro-player-avatars").remove([path]);
      const { error: uploadErr } = await supabase.storage
        .from("pro-player-avatars")
        .upload(path, manageAvatarFile, { contentType: manageAvatarFile.type, upsert: true });
      if (uploadErr) { showCyberToast({ title: "Failed to upload avatar", variant: "error" }); return; }
      const { data: urlData } = supabase.storage.from("pro-player-avatars").getPublicUrl(path);
      const url = urlData.publicUrl + `?t=${Date.now()}`; // cache bust
      const { error } = await supabase.from("pro_players").update({ profile_image_url: url }).eq("id", manageTarget.id);
      if (error) { showCyberToast({ title: "Failed to update avatar URL", variant: "error" }); return; }
      showCyberToast({ title: "Avatar uploaded", tag: "PRO" });
      setManageTarget((prev) => prev ? { ...prev, profile_image_url: url } : null);
      setManageAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      await loadProPlayers();
    } finally { setManageBusy(false); }
  }

  async function handleRemoveAvatar() {
    if (!manageTarget) return;
    setManageBusy(true);
    try {
      const { error } = await supabase.from("pro_players").update({ profile_image_url: null }).eq("id", manageTarget.id);
      if (error) { showCyberToast({ title: "Failed to remove avatar", variant: "error" }); return; }
      showCyberToast({ title: "Avatar removed", tag: "PRO" });
      setManageTarget((prev) => prev ? { ...prev, profile_image_url: null } : null);
      await loadProPlayers();
    } finally { setManageBusy(false); }
  }

  async function handleAddAccount() {
    if (!manageTarget || !newAccountName.trim()) return;
    setManageBusy(true);
    try {
      const { error } = await supabase.from("pro_player_accounts").insert({
        pro_player_id: manageTarget.id,
        username: newAccountName.trim(),
      });
      if (error) { showCyberToast({ title: "Failed to add account", variant: "error" }); return; }
      showCyberToast({ title: "Account added", tag: "PRO" });
      setNewAccountName("");
      await loadManageAccounts(manageTarget.id);
    } finally { setManageBusy(false); }
  }

  async function handleRemoveAccount(accountId: string) {
    if (!manageTarget) return;
    setManageBusy(true);
    try {
      const { error } = await supabase.from("pro_player_accounts").delete().eq("id", accountId);
      if (error) { showCyberToast({ title: "Failed to remove account", variant: "error" }); return; }
      showCyberToast({ title: "Account removed", tag: "PRO" });
      await loadManageAccounts(manageTarget.id);
    } finally { setManageBusy(false); }
  }

  /* ── Teams handlers ──────────────────────────────────────────────── */

  async function handleAddTeam() {
    if (!addTeamForm.name.trim()) { showCyberToast({ title: "Team name is required", variant: "error" }); return; }
    setAddTeamBusy(true);
    try {
      let logoUrl: string | null = null;
      if (addTeamLogo) {
        const ext = addTeamLogo.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("team-logos").upload(path, addTeamLogo, { contentType: addTeamLogo.type });
        if (uploadErr) { showCyberToast({ title: "Failed to upload logo", variant: "error" }); return; }
        const { data: urlData } = supabase.storage.from("team-logos").getPublicUrl(path);
        logoUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("teams").insert({ name: addTeamForm.name.trim(), logo_url: logoUrl });
      if (error) {
        if (error.code === "23505") showCyberToast({ title: "Team already exists", variant: "error" });
        else showCyberToast({ title: "Failed to add team", variant: "error" });
        return;
      }
      showCyberToast({ title: "Team created", tag: "TEAM" });
      setAddTeamOpen(false); setAddTeamForm({ name: "" }); setAddTeamLogo(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      await loadTeams();
    } finally { setAddTeamBusy(false); }
  }

  async function handleDeleteTeam() {
    if (!deleteTeamTarget) return;
    setDeleteTeamBusy(true);
    try {
      const { error } = await supabase.from("teams").delete().eq("id", deleteTeamTarget.id);
      if (error) { showCyberToast({ title: "Failed to delete team", variant: "error" }); return; }
      showCyberToast({ title: "Team deleted", tag: "TEAM" });
      setDeleteTeamTarget(null); await loadTeams();
    } finally { setDeleteTeamBusy(false); }
  }

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">

      {/* ═══ SECTION 1: PENDING APPLICATIONS ═══ */}
      <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">:: PENDING APPLICATIONS ::</p>
      <GlassCard>
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-mono text-flash/60">
            Pending: <span className="text-jade">{pendingRows.length}</span> · Total: <span className="text-flash/80">{rows.length}</span>
          </p>
          <button type="button" onClick={loadApplications} disabled={loading} className={btnFlash}>{loading ? "..." : "REFRESH"}</button>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" />
        {loading ? (
          <div className="text-xs text-flash/60 inline-flex items-center gap-2"><LoadingDots /> Loading...</div>
        ) : pendingRows.length === 0 ? (
          <p className="text-[11px] font-mono text-flash/40">No pending applications.</p>
        ) : (
          <div className="w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10">
                <tr>
                  <th className={thCls}>Created</th><th className={thCls}>Riot ID</th><th className={thCls}>Name</th>
                  <th className={thCls}>Team</th><th className={thCls}>Nationality</th><th className={thCls}>Thread</th>
                  <th className={thCls}>LPS</th><th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.map((r) => {
                  const isBusy = busyId === r.id;
                  const lp = lpById[r.id];
                  const isLpsLoading = lpsLoadingId === r.id;
                  return (
                    <tr key={r.id} className="border-b border-flash/5 hover:bg-white/[0.03] transition-colors">
                      <td className={tdCls}>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className={`${tdCls} text-flash`}>{r.riot_id ?? "—"}</td>
                      <td className={tdCls}>{r.name ?? "—"}</td>
                      <td className={tdCls}>{r.team ?? "—"}</td>
                      <td className={tdCls}>{r.nationality ?? "—"}</td>
                      <td className={tdCls}>
                        {r.thread_url ? <a href={r.thread_url} target="_blank" rel="noreferrer" className="text-jade/80 hover:text-jade underline underline-offset-2 cursor-clicker">open</a> : "—"}
                      </td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-2">
                          <span className="w-10">{typeof lp === "number" ? lp : "—"}</span>
                          <button type="button" onClick={() => handleCheckLps(r)} disabled={isBusy || isLpsLoading} className={btnFlash}>{isLpsLoading ? "..." : "CHECK"}</button>
                        </div>
                      </td>
                      <td className={tdCls}>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handleApprove(r)} disabled={isBusy} className={btnJade}>{isBusy ? "..." : "APPROVE"}</button>
                          <button type="button" onClick={() => openReject(r)} disabled={isBusy} className={btnFlash}>REJECT</button>
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

      {/* ═══ SECTION 2: PRO PLAYERS DIRECTORY ═══ */}
      <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8">:: PRO PLAYERS DIRECTORY ::</p>
      <GlassCard>
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-mono text-flash/60">
            Total: <span className="text-jade">{proPlayers.length}</span>
            {filteredPros.length !== proPlayers.length && <> · Showing: <span className="text-flash/80">{filteredPros.length}</span></>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAddProOpen(true)} className={btnJade}>+ ADD PRO</button>
            <button type="button" onClick={loadProPlayers} disabled={proLoading} className={btnFlash}>{proLoading ? "..." : "REFRESH"}</button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <input type="text" placeholder="Search username, name, or nickname..." value={proSearch} onChange={(e) => setProSearch(e.target.value)} className={`${inputCls} max-w-[260px]`} />
          <select value={proTeamFilter} onChange={(e) => setProTeamFilter(e.target.value)} className={selectCls}>
            <option value="all">All teams</option>
            {teamNames.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={proNatFilter} onChange={(e) => setProNatFilter(e.target.value)} className={selectCls}>
            <option value="all">All nationalities</option>
            {nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {(proSearch || proTeamFilter !== "all" || proNatFilter !== "all") && (
            <button type="button" onClick={() => { setProSearch(""); setProTeamFilter("all"); setProNatFilter("all"); }} className="text-[10px] font-mono text-flash/40 hover:text-flash/60 cursor-clicker">CLEAR</button>
          )}
        </div>
        <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" />
        {proLoading ? (
          <div className="text-xs text-flash/60 inline-flex items-center gap-2"><LoadingDots /> Loading...</div>
        ) : filteredPros.length === 0 ? (
          <p className="text-[11px] font-mono text-flash/40">{proPlayers.length === 0 ? "No pro players found." : "No results match your filters."}</p>
        ) : (
          <div className="w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[400px]">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10">
                <tr>
                  <th className={thCls} style={{ width: 36 }}></th>
                  <th className={thCls}>Username</th>
                  <th className={thCls}>Nickname</th>
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Team</th>
                  <th className={thCls}>Nationality</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPros.map((p) => (
                  <tr key={p.id} className="border-b border-flash/5 hover:bg-white/[0.03] transition-colors">
                    <td className={tdCls}>
                      {p.profile_image_url ? (
                        <img src={p.profile_image_url} alt="" className="w-6 h-6 rounded-full object-cover border border-flash/10" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-flash/10" />
                      )}
                    </td>
                    <td className={`${tdCls} text-flash`}>{p.username}</td>
                    <td className={`${tdCls} text-jade/80`}>{p.nickname ?? "—"}</td>
                    <td className={tdCls}>{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className={tdCls}>
                      {p.team ? (
                        <div className="flex items-center gap-1.5">
                          {teamLogoMap[p.team] && <img src={teamLogoMap[p.team]!} alt="" className="w-4 h-4 rounded-sm object-contain" />}
                          <span>{p.team}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className={tdCls}>{p.nationality ?? "—"}</td>
                    <td className={tdCls}>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openManage(p)} className={btnJade}>MANAGE</button>
                        <button type="button" onClick={() => setDeleteTarget(p)} className={btnDanger}>DELETE</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ═══ SECTION 3: TEAMS ═══ */}
      <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8">:: TEAMS ::</p>
      <GlassCard>
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-mono text-flash/60">Total: <span className="text-jade">{teamsList.length}</span></p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAddTeamOpen(true)} className={btnJade}>+ ADD TEAM</button>
            <button type="button" onClick={loadTeams} disabled={teamsLoading} className={btnFlash}>{teamsLoading ? "..." : "REFRESH"}</button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <input type="text" placeholder="Search team name..." value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} className={`${inputCls} max-w-[240px]`} />
          {teamSearch && <button type="button" onClick={() => setTeamSearch("")} className="text-[10px] font-mono text-flash/40 hover:text-flash/60 cursor-clicker">CLEAR</button>}
        </div>
        <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" />
        {teamsLoading ? (
          <div className="text-xs text-flash/60 inline-flex items-center gap-2"><LoadingDots /> Loading...</div>
        ) : filteredTeams.length === 0 ? (
          <p className="text-[11px] font-mono text-flash/40">{teamsList.length === 0 ? "No teams found." : "No results match your search."}</p>
        ) : (
          <div className="w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[400px]">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10">
                <tr><th className={thCls}>Logo</th><th className={thCls}>Name</th><th className={thCls}>Created</th><th className={`${thCls} text-right`}>Actions</th></tr>
              </thead>
              <tbody>
                {filteredTeams.map((t) => (
                  <tr key={t.id} className="border-b border-flash/5 hover:bg-white/[0.03] transition-colors">
                    <td className={tdCls}>
                      {t.logo_url ? <img src={t.logo_url} alt={t.name} className="w-6 h-6 rounded-sm object-contain" /> : <div className="w-6 h-6 rounded-sm bg-flash/10 flex items-center justify-center text-[8px] text-flash/30">—</div>}
                    </td>
                    <td className={`${tdCls} text-flash`}>{t.name}</td>
                    <td className={tdCls}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className={tdCls}><div className="flex justify-end"><button type="button" onClick={() => setDeleteTeamTarget(t)} className={btnDanger}>DELETE</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ═══ DIALOGS ═══ */}

      {/* Reject application */}
      <Dialog open={rejectOpen} onOpenChange={(open) => { if (!open) { setRejectOpen(false); setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent className="w-full max-w-md bg-liquirice/90 border border-flash/10">
          <DialogHeader>
            <DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Reject Application ::</DialogTitle>
            <DialogDescription className="text-flash/60 text-xs font-mono">Optionally provide a reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Reject reason</Label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. insufficient info, not eligible..." className={`${inputCls} min-h-[90px]`} />
          </div>
          <DialogFooter className="mt-2 flex justify-between">
            <button type="button" onClick={() => setRejectOpen(false)} className={btnFlash} disabled={busyId !== null}>Cancel</button>
            <button type="button" onClick={confirmReject} className={btnDanger} disabled={busyId !== null}>{busyId !== null ? "Saving..." : "CONFIRM REJECT"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add pro player */}
      <Dialog open={addProOpen} onOpenChange={(open) => { if (!open) { setAddProOpen(false); setAddProForm({ username: "", first_name: "", last_name: "", nickname: "", team: "", nationality: "" }); } }}>
        <DialogContent className="w-full max-w-md bg-liquirice/90 border border-flash/10">
          <DialogHeader><DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Add Pro Player ::</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Riot ID *</Label>
              <input type="text" placeholder="Name#TAG" value={addProForm.username} onChange={(e) => setAddProForm((f) => ({ ...f, username: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Nickname</Label>
              <input type="text" placeholder="Known as..." value={addProForm.nickname} onChange={(e) => setAddProForm((f) => ({ ...f, nickname: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">First Name</Label>
                <input type="text" placeholder="John" value={addProForm.first_name} onChange={(e) => setAddProForm((f) => ({ ...f, first_name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Last Name</Label>
                <input type="text" placeholder="Doe" value={addProForm.last_name} onChange={(e) => setAddProForm((f) => ({ ...f, last_name: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Team</Label>
              <select value={addProForm.team} onChange={(e) => setAddProForm((f) => ({ ...f, team: e.target.value }))} className={`${selectCls} w-full`}>
                <option value="">No team</option>
                {teamNames.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Nationality</Label>
              <input type="text" placeholder="Country" value={addProForm.nationality} onChange={(e) => setAddProForm((f) => ({ ...f, nationality: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <DialogFooter className="mt-3 flex justify-between">
            <button type="button" onClick={() => setAddProOpen(false)} className={btnFlash}>Cancel</button>
            <button type="button" onClick={handleAddPro} disabled={addProBusy} className={btnJade}>{addProBusy ? "..." : "ADD PLAYER"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete pro confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="w-full max-w-sm bg-liquirice/90 border border-flash/10">
          <DialogHeader>
            <DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Delete Pro Player ::</DialogTitle>
            <DialogDescription className="text-flash/60 text-xs font-mono">Remove <span className="text-flash">{deleteTarget?.username}</span> from pro players?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex justify-between">
            <button type="button" onClick={() => setDeleteTarget(null)} className={btnFlash}>Cancel</button>
            <button type="button" onClick={handleDeletePro} disabled={deleteBusy} className={btnDanger}>{deleteBusy ? "..." : "CONFIRM DELETE"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MANAGE PRO PLAYER DIALOG ═══ */}
      <Dialog open={!!manageTarget} onOpenChange={(open) => { if (!open) closeManage(); }}>
        <DialogContent className="w-full max-w-lg bg-liquirice/90 border border-flash/10">
          <DialogHeader>
            <DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Manage Pro Player ::</DialogTitle>
            <DialogDescription className="text-flash/60 text-xs font-mono">{manageTarget?.username}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Avatar section */}
            <div>
              <p className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50 mb-2">Profile Image</p>
              <div className="flex items-center gap-4">
                {manageTarget?.profile_image_url ? (
                  <img src={manageTarget.profile_image_url} alt="" className="w-16 h-16 rounded-md object-cover border border-jade/15" />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-flash/10 border border-flash/10 flex items-center justify-center text-[10px] text-flash/30">No image</div>
                )}
                <div className="flex flex-col gap-2">
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={(e) => setManageAvatarFile(e.target.files?.[0] ?? null)}
                    className="text-[10px] text-flash/60 font-mono file:mr-2 file:px-2 file:py-1 file:rounded-sm file:border file:border-flash/20 file:bg-black/40 file:text-flash/70 file:text-[10px] file:font-mono file:cursor-clicker hover:file:bg-flash/10" />
                  <div className="flex gap-2">
                    {manageAvatarFile && <button type="button" onClick={handleUploadAvatar} disabled={manageBusy} className={btnJade}>{manageBusy ? "..." : "UPLOAD"}</button>}
                    {manageTarget?.profile_image_url && <button type="button" onClick={handleRemoveAvatar} disabled={manageBusy} className={btnDanger}>REMOVE</button>}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />

            {/* Nickname + Name section */}
            <div>
              <p className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50 mb-2">Details</p>
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40">Nickname</Label>
                  <input type="text" placeholder="Known as..." value={manageNickname} onChange={(e) => setManageNickname(e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40">First Name</Label>
                    <input type="text" placeholder="John" value={manageFirstName} onChange={(e) => setManageFirstName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <Label className="text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40">Last Name</Label>
                    <input type="text" placeholder="Doe" value={manageLastName} onChange={(e) => setManageLastName(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={handleSaveDetails} disabled={manageBusy} className={btnJade}>{manageBusy ? "..." : "SAVE DETAILS"}</button>
                </div>
              </div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />

            {/* Accounts section */}
            <div>
              <p className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50 mb-2">Connected Accounts</p>

              {/* Primary account (from pro_players.username) */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-black/20 border border-flash/10 mb-1.5">
                <span className="text-[10px] font-mono text-jade/60 uppercase shrink-0">Primary</span>
                <span className="text-[11px] font-mono text-flash">{manageTarget?.username}</span>
              </div>

              {/* Additional accounts */}
              {manageAccountsLoading ? (
                <div className="text-xs text-flash/60 inline-flex items-center gap-2 py-2"><LoadingDots /> Loading...</div>
              ) : (
                <div className="space-y-1">
                  {manageAccounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm bg-black/20 border border-flash/5">
                      <span className="text-[11px] font-mono text-flash/70">{acc.username}</span>
                      <button type="button" onClick={() => handleRemoveAccount(acc.id)} disabled={manageBusy} className="text-[9px] font-mono text-error/60 hover:text-error cursor-clicker disabled:opacity-50">
                        REMOVE
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new account */}
              <div className="flex items-center gap-2 mt-2">
                <input type="text" placeholder="Name#TAG" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)}
                  className={inputCls}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddAccount(); }}
                />
                <button type="button" onClick={handleAddAccount} disabled={manageBusy || !newAccountName.trim()} className={btnJade}>ADD</button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3">
            <button type="button" onClick={closeManage} className={btnFlash}>Close</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add team */}
      <Dialog open={addTeamOpen} onOpenChange={(open) => { if (!open) { setAddTeamOpen(false); setAddTeamForm({ name: "" }); setAddTeamLogo(null); if (logoInputRef.current) logoInputRef.current.value = ""; } }}>
        <DialogContent className="w-full max-w-md bg-liquirice/90 border border-flash/10">
          <DialogHeader><DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Add Team ::</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Team Name *</Label>
              <input type="text" placeholder="Team name" value={addTeamForm.name} onChange={(e) => setAddTeamForm({ name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <Label className="text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50">Logo</Label>
              <div className="flex items-center gap-3 mt-1">
                <input ref={logoInputRef} type="file" accept="image/*" onChange={(e) => setAddTeamLogo(e.target.files?.[0] ?? null)}
                  className="text-[11px] text-flash/60 font-mono file:mr-2 file:px-2 file:py-1 file:rounded-sm file:border file:border-flash/20 file:bg-black/40 file:text-flash/70 file:text-[10px] file:font-mono file:cursor-clicker hover:file:bg-flash/10" />
                {addTeamLogo && <img src={URL.createObjectURL(addTeamLogo)} alt="preview" className="w-8 h-8 rounded-sm object-contain border border-flash/10" />}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-3 flex justify-between">
            <button type="button" onClick={() => setAddTeamOpen(false)} className={btnFlash}>Cancel</button>
            <button type="button" onClick={handleAddTeam} disabled={addTeamBusy} className={btnJade}>{addTeamBusy ? "..." : "ADD TEAM"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete team confirmation */}
      <Dialog open={!!deleteTeamTarget} onOpenChange={(open) => { if (!open) setDeleteTeamTarget(null); }}>
        <DialogContent className="w-full max-w-sm bg-liquirice/90 border border-flash/10">
          <DialogHeader>
            <DialogTitle className="text-flash text-[13px] font-mono tracking-[0.2em] uppercase">:: Delete Team ::</DialogTitle>
            <DialogDescription className="text-flash/60 text-xs font-mono">Remove team <span className="text-flash">{deleteTeamTarget?.name}</span>?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex justify-between">
            <button type="button" onClick={() => setDeleteTeamTarget(null)} className={btnFlash}>Cancel</button>
            <button type="button" onClick={handleDeleteTeam} disabled={deleteTeamBusy} className={btnDanger}>{deleteTeamBusy ? "..." : "CONFIRM DELETE"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
