import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LoadingDots } from "@/components/ui/loading-dots";
import { API_BASE_URL } from "@/config";

type ProApplicationRow = {
  id: number;
  created_at: string;
  guild_id: string | null;
  creator_id: string | null;
  thread_id: string | null;
  thread_url: string | null;
  riot_id: string | null; // es: Wasureta#euw (nel tuo esempio)
  nationality: string | null;
  name: string | null;
  team: string | null;
  other: string | null;
  status: "pending" | "approved" | "rejected" | string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reject_reason: string | null;
};

// helper: Riot ID parsing
function parseRiotId(riotId: string): { name: string; tag: string } | null {
  const raw = riotId.trim();
  const idx = raw.lastIndexOf("#");
  if (idx <= 0 || idx === raw.length - 1) return null;
  const name = raw.slice(0, idx).trim();
  const tag = raw.slice(idx + 1).trim();
  if (!name || !tag) return null;
  return { name, tag };
}

// helper: region from tag (fallback EUW)
function regionFromTag(tag: string): "EUW" | "NA" | "KR" {
  const t = tag.trim().toUpperCase();
  if (t === "EUW") return "EUW";
  if (t === "NA") return "NA";
  if (t === "KR") return "KR";
  return "EUW";
}

export function ProApplicationsAdminPanel() {
  const [rows, setRows] = useState<ProApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTarget, setRejectTarget] = useState<ProApplicationRow | null>(null);

  // ✅ LP cache per application.id
  const [lpById, setLpById] = useState<Record<number, number | null>>({});
  const [lpsLoadingId, setLpsLoadingId] = useState<number | null>(null);

  const pendingRows = useMemo(
    () => rows.filter((r) => r.status === "pending"),
    [rows]
  );

  const pendingCount = pendingRows.length;

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("proApplications")
      .select(
        "id, created_at, guild_id, creator_id, thread_id, thread_url, riot_id, nationality, name, team, other, status, reviewed_at, reviewer_id, reject_reason"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("load proApplications error:", error);
      toast.error("Failed to load pro applications.");
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as ProApplicationRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(row: ProApplicationRow) {
    if (!row.riot_id) {
      toast.error("Missing riot_id on application.");
      return;
    }

    setBusyId(row.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        toast.error("Not logged in.");
        return;
      }

      // 1) insert pro_players
      const { error: insErr } = await supabase.from("pro_players").insert({
        username: row.riot_id,        // es: Wasureta#euw
        first_name: row.name ?? null,
        team: row.team ?? null,
        nationality: row.nationality ?? null,
      });

      if (insErr) {
        console.error("insert pro_players error:", insErr);
        toast.error("Failed to create pro player.");
        return;
      }

      // 2) update application status
      const { error: updErr } = await supabase
        .from("proApplications")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewer_id: auth.user.id,
          reject_reason: null,
        })
        .eq("id", row.id);

      if (updErr) {
        console.error("update proApplications error:", updErr);
        toast.error("Player created, but failed to update application status.");
        return;
      }

      toast.success("Application approved.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function openReject(row: ProApplicationRow) {
    setRejectTarget(row);
    setRejectReason("");
    setRejectOpen(true);
  }

  async function confirmReject() {
    if (!rejectTarget) return;

    setBusyId(rejectTarget.id);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        toast.error("Not logged in.");
        return;
      }

      const { error } = await supabase
        .from("proApplications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewer_id: auth.user.id,
          reject_reason: rejectReason.trim() || null,
        })
        .eq("id", rejectTarget.id);

      if (error) {
        console.error("reject proApplications error:", error);
        toast.error("Failed to reject application.");
        return;
      }

      toast.success("Application rejected.");
      setRejectOpen(false);
      setRejectTarget(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  // ✅ CHECK LPS
  async function handleCheckLps(row: ProApplicationRow) {
    if (!row.riot_id) {
      toast.error("Missing riot_id.");
      return;
    }

    const parsed = parseRiotId(row.riot_id);
    if (!parsed) {
      toast.error("Invalid riot_id format. Expected Name#TAG.");
      return;
    }

    const region = regionFromTag(parsed.tag);

    setLpsLoadingId(row.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/summoner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.name,
          tag: parsed.tag,
          region, // EUW | NA | KR
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("getSummoner error:", txt);
        toast.error("Failed to fetch summoner LPs.");
        setLpById((prev) => ({ ...prev, [row.id]: null }));
        return;
      }

      const json = await res.json();
      const lp = Number(json?.summoner?.lp);

      if (Number.isFinite(lp)) {
        setLpById((prev) => ({ ...prev, [row.id]: lp }));
        toast.success(`LPs loaded: ${lp}`);
      } else {
        setLpById((prev) => ({ ...prev, [row.id]: null }));
        toast.error("Could not read LP from backend response.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while checking LPs.");
    } finally {
      setLpsLoadingId(null);
    }
  }

  return (
    <div className="border border-flash/10 rounded-md p-4 bg-cement">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <h4 className="text-flash/40">PRO APPLICATIONS</h4>
          <p className="text-xs text-flash/60">
            Pending: <span className="text-jade">{pendingCount}</span> • Total:{" "}
            <span className="text-flash/80">{rows.length}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 rounded-sm border border-flash/20 hover:bg-flash/10 text-xs text-flash/70 cursor-clicker"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <Separator className="my-3 bg-flash/20" />

      {loading ? (
        <div className="text-xs text-flash/60 inline-flex items-center gap-2">
          <LoadingDots /> Loading applications...
        </div>
      ) : pendingRows.length === 0 ? (
        <div className="text-sm text-flash/60">
          No pending applications found.
        </div>
      ) : (
        <div className="w-full overflow-auto rounded-md border border-flash/10 bg-neutral-950/40">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10">
              <tr className="text-flash/60">
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Riot ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Nationality</th>
                <th className="px-3 py-2">Thread</th>

                {/* ✅ nuova colonna */}
                <th className="px-3 py-2">LPS</th>

                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {pendingRows.map((r) => {
                const isBusy = busyId === r.id;
                const lp = lpById[r.id]; // number | null | undefined
                const isLpsLoading = lpsLoadingId === r.id;

                return (
                  <tr
                    key={r.id}
                    className="border-b border-flash/5 hover:bg-white/5"
                  >
                    <td className="px-3 py-2 text-flash/70">
                      {new Date(r.created_at).toLocaleString()}
                    </td>

                    <td className="px-3 py-2 text-flash">
                      {r.riot_id ?? <span className="text-flash/40">—</span>}
                    </td>

                    <td className="px-3 py-2 text-flash/70">
                      {r.name ?? <span className="text-flash/40">—</span>}
                    </td>

                    <td className="px-3 py-2 text-flash/70">
                      {r.team ?? <span className="text-flash/40">—</span>}
                    </td>

                    <td className="px-3 py-2 text-flash/70">
                      {r.nationality ?? <span className="text-flash/40">—</span>}
                    </td>

                    <td className="px-3 py-2">
                      {r.thread_url ? (
                        <a
                          href={r.thread_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-jade/80 hover:text-jade underline underline-offset-2 cursor-clicker"
                        >
                          open
                        </a>
                      ) : (
                        <span className="text-flash/40">—</span>
                      )}
                    </td>

                    {/* ✅ LPS cell */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-flash/70 w-10">
                          {typeof lp === "number" ? lp : "—"}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCheckLps(r)}
                          disabled={isBusy || isLpsLoading}
                          className="px-2 py-1 rounded-sm cursor-clicker border border-flash/20 text-flash/70 hover:bg-flash/10 text-[11px] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {isLpsLoading ? "..." : "CHECK LPS"}
                        </button>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(r)}
                          disabled={isBusy}
                          className="px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {isBusy ? "..." : "APPROVE"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openReject(r)}
                          disabled={isBusy}
                          className="px-2 py-1 rounded-sm cursor-clicker border border-flash/20 text-flash/70 hover:bg-flash/10 text-[11px] disabled:opacity-50 disabled:pointer-events-none"
                        >
                          REJECT
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject dialog */}
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectOpen(false);
            setRejectTarget(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="w-full max-w-md bg-liquirice/90 border border-flash/10">
          <DialogHeader>
            <DialogTitle className="text-flash">Reject application</DialogTitle>
            <DialogDescription className="text-flash/60 text-xs">
              Optionally provide a reason. This will be saved into{" "}
              <span className="text-flash/80">reject_reason</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label className="text-xs text-flash/60">Reject reason</Label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. insufficient info, not eligible, ... (optional)"
              className="w-full min-h-[90px] rounded-md border border-flash/15 bg-black/40 px-3 py-2 text-sm text-flash outline-none"
            />
          </div>

          <DialogFooter className="mt-2 flex justify-between">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-sm cursor-clicker text-flash"
              disabled={busyId !== null}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmReject}
              className="px-4 py-1.5 rounded-sm border border-red-300/30 hover:bg-red-300/10 text-xs text-red-200 cursor-clicker disabled:opacity-60 disabled:pointer-events-none"
              disabled={busyId !== null}
            >
              {busyId !== null ? "Saving..." : "Confirm Reject"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
