import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Label } from "@/components/ui/label";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { showCyberToast } from "@/lib/toast-utils";
import { LoadingDots } from "@/components/ui/loading-dots";
import { API_BASE_URL } from "@/config";
import { TeamLogo } from "@/components/teamlogo";
/* ── Helpers ────────────────────────────────────────────────────────── */
function parseRiotId(riotId) {
    const raw = riotId.trim();
    const idx = raw.lastIndexOf("#");
    if (idx <= 0 || idx === raw.length - 1)
        return null;
    return { name: raw.slice(0, idx).trim(), tag: raw.slice(idx + 1).trim() };
}
function regionFromTag(tag) {
    const t = tag.trim().toUpperCase();
    if (t === "NA")
        return "NA";
    if (t === "KR")
        return "KR";
    return "EUW";
}
/* ── Glass card wrapper ─────────────────────────────────────────────── */
function GlassCard({ children }) {
    return (_jsxs("div", { className: "relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" } }), _jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsx("div", { className: "relative z-[2] px-4 py-4 pl-5", children: children })] }));
}
/* ── Crop helper ─────────────────────────────────────────────────── */
async function getCroppedBlob(imageSrc, pixelCrop) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = imageSrc; });
    const canvas = document.createElement("canvas");
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
    return new Promise((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")), "image/jpeg", 0.92));
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
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);
    const [lpById, setLpById] = useState({});
    const [lpsLoadingId, setLpsLoadingId] = useState(null);
    // ── Pro players directory state
    const [proPlayers, setProPlayers] = useState([]);
    const [proLoading, setProLoading] = useState(true);
    const [proSearch, setProSearch] = useState("");
    const [proTeamFilter, setProTeamFilter] = useState("all");
    const [proNatFilter, setProNatFilter] = useState("all");
    // ── Add pro dialog
    const [addProOpen, setAddProOpen] = useState(false);
    const [addProForm, setAddProForm] = useState({ username: "", first_name: "", last_name: "", nickname: "", team: "", nationality: "" });
    const [addProBusy, setAddProBusy] = useState(false);
    // ── Delete pro dialog
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    // ── Manage pro dialog
    const [manageTarget, setManageTarget] = useState(null);
    const [manageAccounts, setManageAccounts] = useState([]);
    const [manageAccountsLoading, setManageAccountsLoading] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [manageAvatarFile, setManageAvatarFile] = useState(null);
    const [cropImageUrl, setCropImageUrl] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [cropOpen, setCropOpen] = useState(false);
    const [manageBusy, setManageBusy] = useState(false);
    const [manageNickname, setManageNickname] = useState("");
    const [manageFirstName, setManageFirstName] = useState("");
    const [manageLastName, setManageLastName] = useState("");
    const [manageTeam, setManageTeam] = useState("");
    const [manageNationality, setManageNationality] = useState("");
    const avatarInputRef = useRef(null);
    // ── Teams state
    const [teamsList, setTeamsList] = useState([]);
    const [teamsLoading, setTeamsLoading] = useState(true);
    const [teamSearch, setTeamSearch] = useState("");
    const [addTeamOpen, setAddTeamOpen] = useState(false);
    const [addTeamForm, setAddTeamForm] = useState({ name: "" });
    const [addTeamLogo, setAddTeamLogo] = useState(null);
    const [addTeamBusy, setAddTeamBusy] = useState(false);
    const [deleteTeamTarget, setDeleteTeamTarget] = useState(null);
    const [deleteTeamBusy, setDeleteTeamBusy] = useState(false);
    const logoInputRef = useRef(null);
    /* ── Derived ─────────────────────────────────────────────────────── */
    const pendingRows = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
    const teamNames = useMemo(() => teamsList.map((t) => t.name).sort(), [teamsList]);
    const teamLogoMap = useMemo(() => {
        const m = {};
        for (const t of teamsList)
            m[t.name] = t.logo_url;
        return m;
    }, [teamsList]);
    const nationalities = useMemo(() => [...new Set(proPlayers.map((p) => p.nationality).filter(Boolean))].sort(), [proPlayers]);
    const filteredPros = useMemo(() => {
        return proPlayers.filter((p) => {
            if (proTeamFilter !== "all" && p.team !== proTeamFilter)
                return false;
            if (proNatFilter !== "all" && p.nationality !== proNatFilter)
                return false;
            if (proSearch) {
                const q = proSearch.toLowerCase();
                if (!p.username?.toLowerCase().includes(q) && !p.first_name?.toLowerCase().includes(q) && !p.nickname?.toLowerCase().includes(q))
                    return false;
            }
            return true;
        });
    }, [proPlayers, proTeamFilter, proNatFilter, proSearch]);
    const filteredTeams = useMemo(() => {
        if (!teamSearch)
            return teamsList;
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
        if (error) {
            showCyberToast({ title: "Failed to load applications", variant: "error" });
            setRows([]);
        }
        else
            setRows((data ?? []));
        setLoading(false);
    }
    async function loadProPlayers() {
        setProLoading(true);
        const { data, error } = await supabase
            .from("pro_players")
            .select("id, username, first_name, last_name, nickname, team, nationality, profile_image_url, created_at")
            .order("created_at", { ascending: false });
        if (error) {
            showCyberToast({ title: "Failed to load pro players", variant: "error" });
            setProPlayers([]);
        }
        else
            setProPlayers((data ?? []));
        setProLoading(false);
    }
    async function loadTeams() {
        setTeamsLoading(true);
        const { data, error } = await supabase
            .from("teams")
            .select("id, name, logo_url, created_at")
            .order("name", { ascending: true });
        if (error) {
            showCyberToast({ title: "Failed to load teams", variant: "error" });
            setTeamsList([]);
        }
        else
            setTeamsList((data ?? []));
        setTeamsLoading(false);
    }
    async function loadManageAccounts(proPlayerId) {
        setManageAccountsLoading(true);
        const { data, error } = await supabase
            .from("pro_player_accounts")
            .select("id, pro_player_id, username, created_at")
            .eq("pro_player_id", proPlayerId)
            .order("created_at", { ascending: true });
        if (error) {
            showCyberToast({ title: "Failed to load accounts", variant: "error" });
            setManageAccounts([]);
        }
        else
            setManageAccounts((data ?? []));
        setManageAccountsLoading(false);
    }
    useEffect(() => { loadApplications(); loadProPlayers(); loadTeams(); }, []);
    /* ── Application handlers ────────────────────────────────────────── */
    async function handleApprove(row) {
        if (!row.riot_id) {
            showCyberToast({ title: "Missing riot_id", variant: "error" });
            return;
        }
        setBusyId(row.id);
        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) {
                showCyberToast({ title: "Not logged in", variant: "error" });
                return;
            }
            const { error: insErr } = await supabase.from("pro_players").insert({
                username: row.riot_id, first_name: row.name ?? null,
                team: row.team ?? null, nationality: row.nationality ?? null,
            });
            if (insErr) {
                showCyberToast({ title: "Failed to create pro player", variant: "error" });
                return;
            }
            const { error: updErr } = await supabase.from("proApplications")
                .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewer_id: auth.user.id, reject_reason: null })
                .eq("id", row.id);
            if (updErr) {
                showCyberToast({ title: "Player created, but failed to update application", variant: "error" });
                return;
            }
            showCyberToast({ title: "Application approved", tag: "PRO" });
            await Promise.all([loadApplications(), loadProPlayers()]);
        }
        finally {
            setBusyId(null);
        }
    }
    function openReject(row) { setRejectTarget(row); setRejectReason(""); setRejectOpen(true); }
    async function confirmReject() {
        if (!rejectTarget)
            return;
        setBusyId(rejectTarget.id);
        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user) {
                showCyberToast({ title: "Not logged in", variant: "error" });
                return;
            }
            const { error } = await supabase.from("proApplications")
                .update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewer_id: auth.user.id, reject_reason: rejectReason.trim() || null })
                .eq("id", rejectTarget.id);
            if (error) {
                showCyberToast({ title: "Failed to reject", variant: "error" });
                return;
            }
            showCyberToast({ title: "Application rejected", tag: "PRO" });
            setRejectOpen(false);
            setRejectTarget(null);
            await loadApplications();
        }
        finally {
            setBusyId(null);
        }
    }
    async function handleCheckLps(row) {
        if (!row.riot_id) {
            showCyberToast({ title: "Missing riot_id", variant: "error" });
            return;
        }
        const parsed = parseRiotId(row.riot_id);
        if (!parsed) {
            showCyberToast({ title: "Invalid riot_id format", variant: "error" });
            return;
        }
        setLpsLoadingId(row.id);
        try {
            const res = await fetch(`${API_BASE_URL}/api/summoner`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: parsed.name, tag: parsed.tag, region: regionFromTag(parsed.tag) }),
            });
            if (!res.ok) {
                showCyberToast({ title: "Failed to fetch LPs", variant: "error" });
                setLpById((p) => ({ ...p, [row.id]: null }));
                return;
            }
            const json = await res.json();
            const lp = Number(json?.summoner?.lp);
            if (Number.isFinite(lp)) {
                setLpById((p) => ({ ...p, [row.id]: lp }));
                showCyberToast({ title: `LPs: ${lp}`, tag: "LP" });
            }
            else {
                setLpById((p) => ({ ...p, [row.id]: null }));
                showCyberToast({ title: "Could not read LP", variant: "error" });
            }
        }
        catch {
            showCyberToast({ title: "Network error", variant: "error" });
        }
        finally {
            setLpsLoadingId(null);
        }
    }
    /* ── Pro players handlers ────────────────────────────────────────── */
    async function handleAddPro() {
        if (!addProForm.username.trim()) {
            showCyberToast({ title: "Username is required", variant: "error" });
            return;
        }
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
                if (error.code === "23505")
                    showCyberToast({ title: "Player already exists", variant: "error" });
                else
                    showCyberToast({ title: "Failed to add pro player", variant: "error" });
                return;
            }
            showCyberToast({ title: "Pro player added", tag: "PRO" });
            setAddProOpen(false);
            setAddProForm({ username: "", first_name: "", last_name: "", nickname: "", team: "", nationality: "" });
            await loadProPlayers();
        }
        finally {
            setAddProBusy(false);
        }
    }
    async function handleDeletePro() {
        if (!deleteTarget)
            return;
        setDeleteBusy(true);
        try {
            const { error } = await supabase.from("pro_players").delete().eq("id", deleteTarget.id);
            if (error) {
                showCyberToast({ title: "Failed to delete", variant: "error" });
                return;
            }
            showCyberToast({ title: "Pro player deleted", tag: "PRO" });
            setDeleteTarget(null);
            await loadProPlayers();
        }
        finally {
            setDeleteBusy(false);
        }
    }
    /* ── Manage handlers ─────────────────────────────────────────────── */
    function openManage(player) {
        setManageTarget(player);
        setManageNickname(player.nickname ?? "");
        setManageFirstName(player.first_name ?? "");
        setManageLastName(player.last_name ?? "");
        setManageTeam(player.team ?? "");
        setManageNationality(player.nationality ?? "");
        setManageAvatarFile(null);
        setNewAccountName("");
        if (avatarInputRef.current)
            avatarInputRef.current.value = "";
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
        setManageTeam("");
        setManageNationality("");
    }
    async function handleSaveDetails() {
        if (!manageTarget)
            return;
        setManageBusy(true);
        try {
            const { error } = await supabase.from("pro_players")
                .update({
                nickname: manageNickname.trim() || null,
                first_name: manageFirstName.trim() || null,
                last_name: manageLastName.trim() || null,
                team: manageTeam || null,
                nationality: manageNationality.trim() || null,
            })
                .eq("id", manageTarget.id);
            if (error) {
                showCyberToast({ title: "Failed to save", variant: "error" });
                return;
            }
            showCyberToast({ title: "Details saved", tag: "PRO" });
            await loadProPlayers();
            setManageTarget((prev) => prev ? { ...prev, nickname: manageNickname.trim() || null, first_name: manageFirstName.trim() || null, last_name: manageLastName.trim() || null, team: manageTeam || null, nationality: manageNationality.trim() || null } : null);
        }
        finally {
            setManageBusy(false);
        }
    }
    function handleFileSelect(file) {
        if (!file)
            return;
        const url = URL.createObjectURL(file);
        setCropImageUrl(url);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setCropOpen(true);
    }
    const onCropComplete = useCallback((_, croppedPixels) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);
    async function handleCropConfirm() {
        if (!cropImageUrl || !croppedAreaPixels)
            return;
        try {
            const blob = await getCroppedBlob(cropImageUrl, croppedAreaPixels);
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            setManageAvatarFile(file);
        }
        catch {
            showCyberToast({ title: "Failed to crop image", variant: "error" });
        }
        setCropOpen(false);
        if (cropImageUrl)
            URL.revokeObjectURL(cropImageUrl);
        setCropImageUrl(null);
    }
    function handleCropCancel() {
        setCropOpen(false);
        if (cropImageUrl)
            URL.revokeObjectURL(cropImageUrl);
        setCropImageUrl(null);
        if (avatarInputRef.current)
            avatarInputRef.current.value = "";
    }
    async function handleUploadAvatar() {
        if (!manageTarget || !manageAvatarFile)
            return;
        setManageBusy(true);
        try {
            const path = `${manageTarget.id}.jpg`;
            await supabase.storage.from("pro-player-avatars").remove([path]);
            const { error: uploadErr } = await supabase.storage
                .from("pro-player-avatars")
                .upload(path, manageAvatarFile, { contentType: "image/jpeg", upsert: true });
            if (uploadErr) {
                showCyberToast({ title: "Failed to upload avatar", variant: "error" });
                return;
            }
            const { data: urlData } = supabase.storage.from("pro-player-avatars").getPublicUrl(path);
            const url = urlData.publicUrl + `?t=${Date.now()}`;
            const { error } = await supabase.from("pro_players").update({ profile_image_url: url }).eq("id", manageTarget.id);
            if (error) {
                showCyberToast({ title: "Failed to update avatar URL", variant: "error" });
                return;
            }
            showCyberToast({ title: "Avatar uploaded", tag: "PRO" });
            setManageTarget((prev) => prev ? { ...prev, profile_image_url: url } : null);
            setManageAvatarFile(null);
            if (avatarInputRef.current)
                avatarInputRef.current.value = "";
            await loadProPlayers();
        }
        finally {
            setManageBusy(false);
        }
    }
    async function handleRemoveAvatar() {
        if (!manageTarget)
            return;
        setManageBusy(true);
        try {
            const { error } = await supabase.from("pro_players").update({ profile_image_url: null }).eq("id", manageTarget.id);
            if (error) {
                showCyberToast({ title: "Failed to remove avatar", variant: "error" });
                return;
            }
            showCyberToast({ title: "Avatar removed", tag: "PRO" });
            setManageTarget((prev) => prev ? { ...prev, profile_image_url: null } : null);
            await loadProPlayers();
        }
        finally {
            setManageBusy(false);
        }
    }
    async function handleAddAccount() {
        if (!manageTarget || !newAccountName.trim())
            return;
        setManageBusy(true);
        try {
            const { error } = await supabase.from("pro_player_accounts").insert({
                pro_player_id: manageTarget.id,
                username: newAccountName.trim(),
            });
            if (error) {
                showCyberToast({ title: "Failed to add account", variant: "error" });
                return;
            }
            showCyberToast({ title: "Account added", tag: "PRO" });
            setNewAccountName("");
            await loadManageAccounts(manageTarget.id);
        }
        finally {
            setManageBusy(false);
        }
    }
    async function handleRemoveAccount(accountId) {
        if (!manageTarget)
            return;
        setManageBusy(true);
        try {
            const { error } = await supabase.from("pro_player_accounts").delete().eq("id", accountId);
            if (error) {
                showCyberToast({ title: "Failed to remove account", variant: "error" });
                return;
            }
            showCyberToast({ title: "Account removed", tag: "PRO" });
            await loadManageAccounts(manageTarget.id);
        }
        finally {
            setManageBusy(false);
        }
    }
    /* ── Teams handlers ──────────────────────────────────────────────── */
    async function handleAddTeam() {
        if (!addTeamForm.name.trim()) {
            showCyberToast({ title: "Team name is required", variant: "error" });
            return;
        }
        setAddTeamBusy(true);
        try {
            let logoUrl = null;
            if (addTeamLogo) {
                const ext = addTeamLogo.name.split(".").pop()?.toLowerCase() || "png";
                const path = `${crypto.randomUUID()}.${ext}`;
                const { error: uploadErr } = await supabase.storage.from("team-logos").upload(path, addTeamLogo, { contentType: addTeamLogo.type });
                if (uploadErr) {
                    showCyberToast({ title: "Failed to upload logo", variant: "error" });
                    return;
                }
                const { data: urlData } = supabase.storage.from("team-logos").getPublicUrl(path);
                logoUrl = urlData.publicUrl;
            }
            const { error } = await supabase.from("teams").insert({ name: addTeamForm.name.trim(), logo_url: logoUrl });
            if (error) {
                if (error.code === "23505")
                    showCyberToast({ title: "Team already exists", variant: "error" });
                else
                    showCyberToast({ title: "Failed to add team", variant: "error" });
                return;
            }
            showCyberToast({ title: "Team created", tag: "TEAM" });
            setAddTeamOpen(false);
            setAddTeamForm({ name: "" });
            setAddTeamLogo(null);
            if (logoInputRef.current)
                logoInputRef.current.value = "";
            await loadTeams();
        }
        finally {
            setAddTeamBusy(false);
        }
    }
    async function handleDeleteTeam() {
        if (!deleteTeamTarget)
            return;
        setDeleteTeamBusy(true);
        try {
            const { error } = await supabase.from("teams").delete().eq("id", deleteTeamTarget.id);
            if (error) {
                showCyberToast({ title: "Failed to delete team", variant: "error" });
                return;
            }
            showCyberToast({ title: "Team deleted", tag: "TEAM" });
            setDeleteTeamTarget(null);
            await loadTeams();
        }
        finally {
            setDeleteTeamBusy(false);
        }
    }
    /* ── Render ──────────────────────────────────────────────────────── */
    return (_jsxs("div", { className: "space-y-6", children: [_jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50", children: ":: PENDING APPLICATIONS ::" }), _jsxs(GlassCard, { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("p", { className: "text-xs font-mono text-flash/60", children: ["Pending: ", _jsx("span", { className: "text-jade", children: pendingRows.length }), " \u00B7 Total: ", _jsx("span", { className: "text-flash/80", children: rows.length })] }), _jsx("button", { type: "button", onClick: loadApplications, disabled: loading, className: btnFlash, children: loading ? "..." : "REFRESH" })] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" }), loading ? (_jsxs("div", { className: "text-xs text-flash/60 inline-flex items-center gap-2", children: [_jsx(LoadingDots, {}), " Loading..."] })) : pendingRows.length === 0 ? (_jsx("p", { className: "text-[11px] font-mono text-flash/40", children: "No pending applications." })) : (_jsx("div", { className: "w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10", children: _jsxs("tr", { children: [_jsx("th", { className: thCls, children: "Created" }), _jsx("th", { className: thCls, children: "Riot ID" }), _jsx("th", { className: thCls, children: "Name" }), _jsx("th", { className: thCls, children: "Team" }), _jsx("th", { className: thCls, children: "Nationality" }), _jsx("th", { className: thCls, children: "Thread" }), _jsx("th", { className: thCls, children: "LPS" }), _jsx("th", { className: `${thCls} text-right`, children: "Actions" })] }) }), _jsx("tbody", { children: pendingRows.map((r) => {
                                        const isBusy = busyId === r.id;
                                        const lp = lpById[r.id];
                                        const isLpsLoading = lpsLoadingId === r.id;
                                        return (_jsxs("tr", { className: "border-b border-flash/5 hover:bg-white/[0.03] transition-colors", children: [_jsx("td", { className: tdCls, children: new Date(r.created_at).toLocaleDateString() }), _jsx("td", { className: `${tdCls} text-flash`, children: r.riot_id ?? "—" }), _jsx("td", { className: tdCls, children: r.name ?? "—" }), _jsx("td", { className: tdCls, children: r.team ?? "—" }), _jsx("td", { className: tdCls, children: r.nationality ?? "—" }), _jsx("td", { className: tdCls, children: r.thread_url ? _jsx("a", { href: r.thread_url, target: "_blank", rel: "noreferrer", className: "text-jade/80 hover:text-jade underline underline-offset-2 cursor-clicker", children: "open" }) : "—" }), _jsx("td", { className: tdCls, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-10", children: typeof lp === "number" ? lp : "—" }), _jsx("button", { type: "button", onClick: () => handleCheckLps(r), disabled: isBusy || isLpsLoading, className: btnFlash, children: isLpsLoading ? "..." : "CHECK" })] }) }), _jsx("td", { className: tdCls, children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => handleApprove(r), disabled: isBusy, className: btnJade, children: isBusy ? "..." : "APPROVE" }), _jsx("button", { type: "button", onClick: () => openReject(r), disabled: isBusy, className: btnFlash, children: "REJECT" })] }) })] }, r.id));
                                    }) })] }) }))] }), _jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8", children: ":: PRO PLAYERS DIRECTORY ::" }), _jsxs(GlassCard, { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("p", { className: "text-xs font-mono text-flash/60", children: ["Total: ", _jsx("span", { className: "text-jade", children: proPlayers.length }), filteredPros.length !== proPlayers.length && _jsxs(_Fragment, { children: [" \u00B7 Showing: ", _jsx("span", { className: "text-flash/80", children: filteredPros.length })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => setAddProOpen(true), className: btnJade, children: "+ ADD PRO" }), _jsx("button", { type: "button", onClick: loadProPlayers, disabled: proLoading, className: btnFlash, children: proLoading ? "..." : "REFRESH" })] })] }), _jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("input", { type: "text", placeholder: "Search username, name, or nickname...", value: proSearch, onChange: (e) => setProSearch(e.target.value), className: `${inputCls} max-w-[260px]` }), _jsxs("select", { value: proTeamFilter, onChange: (e) => setProTeamFilter(e.target.value), className: selectCls, children: [_jsx("option", { value: "all", children: "All teams" }), teamNames.map((t) => _jsx("option", { value: t, children: t }, t))] }), _jsxs("select", { value: proNatFilter, onChange: (e) => setProNatFilter(e.target.value), className: selectCls, children: [_jsx("option", { value: "all", children: "All nationalities" }), nationalities.map((n) => _jsx("option", { value: n, children: n }, n))] }), (proSearch || proTeamFilter !== "all" || proNatFilter !== "all") && (_jsx("button", { type: "button", onClick: () => { setProSearch(""); setProTeamFilter("all"); setProNatFilter("all"); }, className: "text-[10px] font-mono text-flash/40 hover:text-flash/60 cursor-clicker", children: "CLEAR" }))] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" }), proLoading ? (_jsxs("div", { className: "text-xs text-flash/60 inline-flex items-center gap-2", children: [_jsx(LoadingDots, {}), " Loading..."] })) : filteredPros.length === 0 ? (_jsx("p", { className: "text-[11px] font-mono text-flash/40", children: proPlayers.length === 0 ? "No pro players found." : "No results match your filters." })) : (_jsx("div", { className: "w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[400px]", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10", children: _jsxs("tr", { children: [_jsx("th", { className: thCls, style: { width: 36 } }), _jsx("th", { className: thCls, children: "Username" }), _jsx("th", { className: thCls, children: "Nickname" }), _jsx("th", { className: thCls, children: "Name" }), _jsx("th", { className: thCls, children: "Team" }), _jsx("th", { className: thCls, children: "Nationality" }), _jsx("th", { className: `${thCls} text-right`, children: "Actions" })] }) }), _jsx("tbody", { children: filteredPros.map((p) => (_jsxs("tr", { className: "border-b border-flash/5 hover:bg-white/[0.03] transition-colors", children: [_jsx("td", { className: tdCls, children: p.profile_image_url ? (_jsx("img", { src: p.profile_image_url, alt: "", className: "w-6 h-6 rounded-full object-cover border border-flash/10" })) : (_jsx("div", { className: "w-6 h-6 rounded-full bg-flash/10" })) }), _jsx("td", { className: `${tdCls} text-flash`, children: p.username }), _jsx("td", { className: `${tdCls} text-jade/80`, children: p.nickname ?? "—" }), _jsx("td", { className: tdCls, children: [p.first_name, p.last_name].filter(Boolean).join(" ") || "—" }), _jsx("td", { className: tdCls, children: p.team ? (_jsxs("div", { className: "flex items-center gap-1.5", children: [teamLogoMap[p.team] && _jsx(TeamLogo, { src: teamLogoMap[p.team], className: "w-4 h-4 rounded-sm object-contain" }), _jsx("span", { children: p.team })] })) : "—" }), _jsx("td", { className: tdCls, children: p.nationality ?? "—" }), _jsx("td", { className: tdCls, children: _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => openManage(p), className: btnJade, children: "MANAGE" }), _jsx("button", { type: "button", onClick: () => setDeleteTarget(p), className: btnDanger, children: "DELETE" })] }) })] }, p.id))) })] }) }))] }), _jsx("p", { className: "text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8", children: ":: TEAMS ::" }), _jsxs(GlassCard, { children: [_jsxs("div", { className: "flex items-center justify-between gap-4 mb-3", children: [_jsxs("p", { className: "text-xs font-mono text-flash/60", children: ["Total: ", _jsx("span", { className: "text-jade", children: teamsList.length })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => setAddTeamOpen(true), className: btnJade, children: "+ ADD TEAM" }), _jsx("button", { type: "button", onClick: loadTeams, disabled: teamsLoading, className: btnFlash, children: teamsLoading ? "..." : "REFRESH" })] })] }), _jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("input", { type: "text", placeholder: "Search team name...", value: teamSearch, onChange: (e) => setTeamSearch(e.target.value), className: `${inputCls} max-w-[240px]` }), teamSearch && _jsx("button", { type: "button", onClick: () => setTeamSearch(""), className: "text-[10px] font-mono text-flash/40 hover:text-flash/60 cursor-clicker", children: "CLEAR" })] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" }), teamsLoading ? (_jsxs("div", { className: "text-xs text-flash/60 inline-flex items-center gap-2", children: [_jsx(LoadingDots, {}), " Loading..."] })) : filteredTeams.length === 0 ? (_jsx("p", { className: "text-[11px] font-mono text-flash/40", children: teamsList.length === 0 ? "No teams found." : "No results match your search." })) : (_jsx("div", { className: "w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[400px]", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10", children: _jsxs("tr", { children: [_jsx("th", { className: thCls, children: "Logo" }), _jsx("th", { className: thCls, children: "Name" }), _jsx("th", { className: thCls, children: "Created" }), _jsx("th", { className: `${thCls} text-right`, children: "Actions" })] }) }), _jsx("tbody", { children: filteredTeams.map((t) => (_jsxs("tr", { className: "border-b border-flash/5 hover:bg-white/[0.03] transition-colors", children: [_jsx("td", { className: tdCls, children: t.logo_url ? _jsx(TeamLogo, { src: t.logo_url, alt: t.name, className: "w-6 h-6 rounded-sm object-contain" }) : _jsx("div", { className: "w-6 h-6 rounded-sm bg-flash/10 flex items-center justify-center text-[8px] text-flash/30", children: "\u2014" }) }), _jsx("td", { className: `${tdCls} text-flash`, children: t.name }), _jsx("td", { className: tdCls, children: new Date(t.created_at).toLocaleDateString() }), _jsx("td", { className: tdCls, children: _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: () => setDeleteTeamTarget(t), className: btnDanger, children: "DELETE" }) }) })] }, t.id))) })] }) }))] }), _jsx(Dialog, { open: rejectOpen, onOpenChange: (open) => { if (!open) {
                    setRejectOpen(false);
                    setRejectTarget(null);
                    setRejectReason("");
                } }, children: _jsxs(DialogContent, { className: "w-full max-w-md bg-liquirice/90 border border-flash/10", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Reject Application ::" }), _jsx(DialogDescription, { className: "text-flash/60 text-xs font-mono", children: "Optionally provide a reason." })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Reject reason" }), _jsx("textarea", { value: rejectReason, onChange: (e) => setRejectReason(e.target.value), placeholder: "e.g. insufficient info, not eligible...", className: `${inputCls} min-h-[90px]` })] }), _jsxs(DialogFooter, { className: "mt-2 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setRejectOpen(false), className: btnFlash, disabled: busyId !== null, children: "Cancel" }), _jsx("button", { type: "button", onClick: confirmReject, className: btnDanger, disabled: busyId !== null, children: busyId !== null ? "Saving..." : "CONFIRM REJECT" })] })] }) }), _jsx(Dialog, { open: addProOpen, onOpenChange: (open) => { if (!open) {
                    setAddProOpen(false);
                    setAddProForm({ username: "", first_name: "", last_name: "", nickname: "", team: "", nationality: "" });
                } }, children: _jsxs(DialogContent, { className: "w-full max-w-md bg-liquirice/90 border border-flash/10", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Add Pro Player ::" }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Riot ID *" }), _jsx("input", { type: "text", placeholder: "Name#TAG", value: addProForm.username, onChange: (e) => setAddProForm((f) => ({ ...f, username: e.target.value })), className: inputCls })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Nickname" }), _jsx("input", { type: "text", placeholder: "Known as...", value: addProForm.nickname, onChange: (e) => setAddProForm((f) => ({ ...f, nickname: e.target.value })), className: inputCls })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "First Name" }), _jsx("input", { type: "text", placeholder: "John", value: addProForm.first_name, onChange: (e) => setAddProForm((f) => ({ ...f, first_name: e.target.value })), className: inputCls })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Last Name" }), _jsx("input", { type: "text", placeholder: "Doe", value: addProForm.last_name, onChange: (e) => setAddProForm((f) => ({ ...f, last_name: e.target.value })), className: inputCls })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Team" }), _jsxs("select", { value: addProForm.team, onChange: (e) => setAddProForm((f) => ({ ...f, team: e.target.value })), className: `${selectCls} w-full`, children: [_jsx("option", { value: "", children: "No team" }), teamNames.map((t) => _jsx("option", { value: t, children: t }, t))] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Nationality" }), _jsx("input", { type: "text", placeholder: "Country", value: addProForm.nationality, onChange: (e) => setAddProForm((f) => ({ ...f, nationality: e.target.value })), className: inputCls })] })] }), _jsxs(DialogFooter, { className: "mt-3 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setAddProOpen(false), className: btnFlash, children: "Cancel" }), _jsx("button", { type: "button", onClick: handleAddPro, disabled: addProBusy, className: btnJade, children: addProBusy ? "..." : "ADD PLAYER" })] })] }) }), _jsx(Dialog, { open: !!deleteTarget, onOpenChange: (open) => { if (!open)
                    setDeleteTarget(null); }, children: _jsxs(DialogContent, { className: "w-full max-w-sm bg-liquirice/90 border border-flash/10", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Delete Pro Player ::" }), _jsxs(DialogDescription, { className: "text-flash/60 text-xs font-mono", children: ["Remove ", _jsx("span", { className: "text-flash", children: deleteTarget?.username }), " from pro players?"] })] }), _jsxs(DialogFooter, { className: "mt-2 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setDeleteTarget(null), className: btnFlash, children: "Cancel" }), _jsx("button", { type: "button", onClick: handleDeletePro, disabled: deleteBusy, className: btnDanger, children: deleteBusy ? "..." : "CONFIRM DELETE" })] })] }) }), _jsx(Dialog, { open: !!manageTarget, onOpenChange: (open) => { if (!open)
                    closeManage(); }, children: _jsxs(DialogContent, { className: "w-full max-w-lg bg-liquirice/90 border border-flash/10", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Manage Pro Player ::" }), _jsx(DialogDescription, { className: "text-flash/60 text-xs font-mono", children: manageTarget?.username })] }), _jsxs("div", { className: "space-y-5 mt-2", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50 mb-2", children: "Profile Image" }), _jsxs("div", { className: "flex items-center gap-4", children: [manageTarget?.profile_image_url ? (_jsx("img", { src: manageTarget.profile_image_url, alt: "", className: "w-16 h-16 rounded-md object-cover border border-jade/15" })) : (_jsx("div", { className: "w-16 h-16 rounded-md bg-flash/10 border border-flash/10 flex items-center justify-center text-[10px] text-flash/30", children: "No image" })), _jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("input", { ref: avatarInputRef, type: "file", accept: "image/*", className: "hidden", onChange: (e) => handleFileSelect(e.target.files?.[0] ?? null) }), manageAvatarFile && (_jsx("img", { src: URL.createObjectURL(manageAvatarFile), alt: "Cropped", className: "w-16 h-16 rounded-md object-cover border border-jade/20" })), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => avatarInputRef.current?.click(), className: btnFlash, children: manageAvatarFile ? "CHANGE" : "SELECT IMAGE" }), manageAvatarFile && _jsx("button", { type: "button", onClick: handleUploadAvatar, disabled: manageBusy, className: btnJade, children: manageBusy ? "..." : "UPLOAD" }), manageTarget?.profile_image_url && _jsx("button", { type: "button", onClick: handleRemoveAvatar, disabled: manageBusy, className: btnDanger, children: "REMOVE" })] })] })] })] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50 mb-2", children: "Details" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40", children: "Nickname" }), _jsx("input", { type: "text", placeholder: "Known as...", value: manageNickname, onChange: (e) => setManageNickname(e.target.value), className: inputCls })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40", children: "First Name" }), _jsx("input", { type: "text", placeholder: "John", value: manageFirstName, onChange: (e) => setManageFirstName(e.target.value), className: inputCls })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40", children: "Last Name" }), _jsx("input", { type: "text", placeholder: "Doe", value: manageLastName, onChange: (e) => setManageLastName(e.target.value), className: inputCls })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40", children: "Team" }), _jsxs("select", { value: manageTeam, onChange: (e) => setManageTeam(e.target.value), className: `${selectCls} w-full`, children: [_jsx("option", { value: "", children: "No team" }), teamNames.map((t) => _jsx("option", { value: t, children: t }, t))] })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.12em] uppercase text-flash/40", children: "Nationality" }), _jsx("input", { type: "text", placeholder: "Country", value: manageNationality, onChange: (e) => setManageNationality(e.target.value), className: inputCls })] })] }), _jsx("div", { className: "flex justify-end", children: _jsx("button", { type: "button", onClick: handleSaveDetails, disabled: manageBusy, className: btnJade, children: manageBusy ? "..." : "SAVE DETAILS" }) })] })] }), _jsx("div", { className: "h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50 mb-2", children: "Connected Accounts" }), _jsxs("div", { className: "flex items-center gap-2 px-2 py-1.5 rounded-sm bg-black/20 border border-flash/10 mb-1.5", children: [_jsx("span", { className: "text-[10px] font-mono text-jade/60 uppercase shrink-0", children: "Primary" }), _jsx("span", { className: "text-[11px] font-mono text-flash", children: manageTarget?.username })] }), manageAccountsLoading ? (_jsxs("div", { className: "text-xs text-flash/60 inline-flex items-center gap-2 py-2", children: [_jsx(LoadingDots, {}), " Loading..."] })) : (_jsx("div", { className: "space-y-1", children: manageAccounts.map((acc) => (_jsxs("div", { className: "flex items-center justify-between gap-2 px-2 py-1.5 rounded-sm bg-black/20 border border-flash/5", children: [_jsx("span", { className: "text-[11px] font-mono text-flash/70", children: acc.username }), _jsx("button", { type: "button", onClick: () => handleRemoveAccount(acc.id), disabled: manageBusy, className: "text-[9px] font-mono text-error/60 hover:text-error cursor-clicker disabled:opacity-50", children: "REMOVE" })] }, acc.id))) })), _jsxs("div", { className: "flex items-center gap-2 mt-2", children: [_jsx("input", { type: "text", placeholder: "Name#TAG", value: newAccountName, onChange: (e) => setNewAccountName(e.target.value), className: inputCls, onKeyDown: (e) => { if (e.key === "Enter")
                                                        handleAddAccount(); } }), _jsx("button", { type: "button", onClick: handleAddAccount, disabled: manageBusy || !newAccountName.trim(), className: btnJade, children: "ADD" })] })] })] }), _jsx(DialogFooter, { className: "mt-3", children: _jsx("button", { type: "button", onClick: closeManage, className: btnFlash, children: "Close" }) })] }) }), _jsx(Dialog, { open: addTeamOpen, onOpenChange: (open) => { if (!open) {
                    setAddTeamOpen(false);
                    setAddTeamForm({ name: "" });
                    setAddTeamLogo(null);
                    if (logoInputRef.current)
                        logoInputRef.current.value = "";
                } }, children: _jsxs(DialogContent, { className: "w-full max-w-md bg-liquirice/90 border border-flash/10", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Add Team ::" }) }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Team Name *" }), _jsx("input", { type: "text", placeholder: "Team name", value: addTeamForm.name, onChange: (e) => setAddTeamForm({ name: e.target.value }), className: inputCls })] }), _jsxs("div", { children: [_jsx(Label, { className: "text-[10px] font-mono tracking-[0.15em] uppercase text-jade/50", children: "Logo" }), _jsxs("div", { className: "flex items-center gap-3 mt-1", children: [_jsx("input", { ref: logoInputRef, type: "file", accept: "image/*", onChange: (e) => setAddTeamLogo(e.target.files?.[0] ?? null), className: "text-[11px] text-flash/60 font-mono file:mr-2 file:px-2 file:py-1 file:rounded-sm file:border file:border-flash/20 file:bg-black/40 file:text-flash/70 file:text-[10px] file:font-mono file:cursor-clicker hover:file:bg-flash/10" }), addTeamLogo && _jsx("img", { src: URL.createObjectURL(addTeamLogo), alt: "preview", className: "w-8 h-8 rounded-sm object-contain border border-flash/10" })] })] })] }), _jsxs(DialogFooter, { className: "mt-3 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setAddTeamOpen(false), className: btnFlash, children: "Cancel" }), _jsx("button", { type: "button", onClick: handleAddTeam, disabled: addTeamBusy, className: btnJade, children: addTeamBusy ? "..." : "ADD TEAM" })] })] }) }), _jsx(Dialog, { open: !!deleteTeamTarget, onOpenChange: (open) => { if (!open)
                    setDeleteTeamTarget(null); }, children: _jsxs(DialogContent, { className: "w-full max-w-sm bg-liquirice/90 border border-flash/10", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Delete Team ::" }), _jsxs(DialogDescription, { className: "text-flash/60 text-xs font-mono", children: ["Remove team ", _jsx("span", { className: "text-flash", children: deleteTeamTarget?.name }), "?"] })] }), _jsxs(DialogFooter, { className: "mt-2 flex justify-between", children: [_jsx("button", { type: "button", onClick: () => setDeleteTeamTarget(null), className: btnFlash, children: "Cancel" }), _jsx("button", { type: "button", onClick: handleDeleteTeam, disabled: deleteTeamBusy, className: btnDanger, children: deleteTeamBusy ? "..." : "CONFIRM DELETE" })] })] }) }), _jsx(Dialog, { open: cropOpen, onOpenChange: (open) => { if (!open)
                    handleCropCancel(); }, children: _jsxs(DialogContent, { className: "w-full max-w-md bg-liquirice/90 border border-flash/10", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { className: "text-flash text-[13px] font-mono tracking-[0.2em] uppercase", children: ":: Crop Image ::" }) }), _jsx("div", { className: "relative w-full h-[300px] bg-black/60 rounded-sm overflow-hidden", children: cropImageUrl && (_jsx(Cropper, { image: cropImageUrl, crop: crop, zoom: zoom, aspect: 1, cropShape: "round", showGrid: false, onCropChange: setCrop, onZoomChange: setZoom, onCropComplete: onCropComplete })) }), _jsxs("div", { className: "flex items-center gap-3 mt-2", children: [_jsx("span", { className: "text-[10px] font-mono text-flash/40 shrink-0", children: "Zoom" }), _jsx("input", { type: "range", min: 1, max: 3, step: 0.05, value: zoom, onChange: (e) => setZoom(Number(e.target.value)), className: "flex-1 accent-jade" })] }), _jsxs(DialogFooter, { className: "mt-3 flex justify-between", children: [_jsx("button", { type: "button", onClick: handleCropCancel, className: btnFlash, children: "Cancel" }), _jsx("button", { type: "button", onClick: handleCropConfirm, className: btnJade, children: "Confirm Crop" })] })] }) })] }));
}
