import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const ERR = "#ff6286";
const ERR_GLOW = "rgba(255,98,134,0.15)";
const ERR_DIM = "rgba(255,98,134,0.08)";

export function AccountDeletion() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canConfirm = confirmText === "DELETE";

  function handleOpen() {
    setConfirmText("");
    setDialogOpen(true);
  }

  function handleClose() {
    if (deleting) return;
    setDialogOpen(false);
    setConfirmText("");
  }

  async function handleDelete() {
    if (!canConfirm || deleting) return;
    setDeleting(true);

    try {
      // Try RPC first (requires a Postgres function `delete_user`)
      const { error } = await supabase.rpc("delete_user");

      if (error) throw error;

      await supabase.auth.signOut();

      showCyberToast({
        title: "Account deleted",
        description: "Your account and all data have been permanently removed.",
        tag: "SYS",
        variant: "status",
      });

      navigate("/", { replace: true });
    } catch (e: any) {
      console.error("Account deletion error:", e);
      showCyberToast({
        title: "Deletion failed",
        description: e?.message ?? "Could not delete your account. Contact support.",
        tag: "ERR",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* ── Danger Zone ── */}
      <div className="relative rounded-[2px] border border-transparent bg-cement/30 overflow-hidden">
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-error/20" />

        {/* Content */}
        <div className="relative z-[2] px-4 py-3 pl-5">
          <p className="text-flash/20 text-[11px]">
            Permanently remove your account and all associated data.
          </p>

          <div className="mt-3 h-[1px] bg-gradient-to-r from-error/15 via-flash/5 to-transparent" />

          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] font-mono text-error/20 tracking-[0.08em]">◈ IRREVERSIBLE</span>
            <button
              type="button"
              onClick={handleOpen}
              className="px-2 py-1 rounded-[2px] border border-error/20 text-error/50 hover:text-error hover:border-error/40 hover:bg-error/5 text-[11px] tracking-[0.1em] uppercase cursor-clicker transition-colors shrink-0"
            >
              DELETE
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirmation Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[440px] [&>button]:hidden">
          <DialogTitle className="sr-only">Confirm Account Deletion</DialogTitle>

          <div
            className="relative rounded-[2px] overflow-hidden"
            style={{
              background: "rgba(4,10,12,0.96)",
              border: `1px solid color-mix(in srgb, ${ERR} 15%, transparent)`,
            }}
          >
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: `color-mix(in srgb, ${ERR} 50%, transparent)` }} />

            {/* Scanlines */}
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
              }}
            />

            {/* Sweeping scan beam */}
            <div
              className="absolute inset-0 pointer-events-none z-[2]"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${ERR_GLOW} 50%, transparent 100%)`,
                backgroundSize: "100% 30px",
                animation: "ct-scan 4s linear infinite",
              }}
            />

            {/* HUD bracket corners */}
            <Corner pos="top-left" color={ERR} />
            <Corner pos="top-right" color={ERR} />
            <Corner pos="bottom-left" color={ERR} />
            <Corner pos="bottom-right" color={ERR} />

            {/* Bottom gradient */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[1px] z-[3]"
              style={{ background: `linear-gradient(90deg, ${ERR}, transparent)`, opacity: 0.3 }}
            />

            {/* Content */}
            <div className="relative z-[5] px-6 py-5">
              {/* Tag header */}
              <div
                className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase mb-4"
                style={{ color: `color-mix(in srgb, ${ERR} 50%, transparent)` }}
              >
                <span style={{ color: ERR, fontSize: "8px" }}>◈</span>
                <span>::</span>
                <span
                  className="px-1.5 py-[1px]"
                  style={{
                    color: ERR,
                    background: ERR_DIM,
                    border: `1px solid color-mix(in srgb, ${ERR} 30%, transparent)`,
                    borderRadius: "1px",
                    letterSpacing: "0.2em",
                  }}
                >
                  WARNING
                </span>
                <span>::</span>
                <span style={{ color: `color-mix(in srgb, ${ERR} 40%, transparent)`, letterSpacing: "0.15em" }}>
                  IRREVERSIBLE
                </span>
              </div>

              {/* Title */}
              <h3 className="text-flash text-base font-medium mb-1">
                Confirm Account Deletion
              </h3>
              <div
                className="w-16 h-[1px] mb-4"
                style={{ background: `linear-gradient(90deg, ${ERR}, transparent)` }}
              />

              {/* Warning list */}
              <p className="text-flash/40 text-xs mb-2">
                This will permanently delete:
              </p>
              <ul className="space-y-1 mb-5">
                {[
                  "Your loldata account and login credentials",
                  "All linked profiles (League of Legends, Discord)",
                  "Analytics data, preferences, and settings",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-flash/50">
                    <span className="text-error/60 mt-0.5 text-[8px]">◆</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Type to confirm */}
              <label className="block mb-4">
                <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-flash/30 block mb-1.5">
                  Type <span style={{ color: ERR }}>DELETE</span> to confirm
                </span>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  spellCheck={false}
                  disabled={deleting}
                  className="w-full rounded-[2px] border border-flash/10 bg-black/40 px-3 py-2 text-sm text-flash outline-none font-mono tracking-widest placeholder:text-flash/15 focus:border-error/30 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canConfirm) handleDelete();
                  }}
                />
              </label>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker transition-colors disabled:opacity-40"
                >
                  CANCEL
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canConfirm || deleting}
                  className="px-4 py-1.5 rounded-[2px] cursor-clicker text-[11px] tracking-[0.1em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    border: `1px solid color-mix(in srgb, ${ERR} ${canConfirm ? "50%" : "15%"}, transparent)`,
                    color: canConfirm ? ERR : `color-mix(in srgb, ${ERR} 30%, transparent)`,
                    background: canConfirm ? ERR_DIM : "transparent",
                    boxShadow: canConfirm ? `0 0 20px ${ERR_DIM}, inset 0 0 20px ${ERR_DIM}` : "none",
                  }}
                >
                  {deleting ? "DELETING..." : "◈ CONFIRM DELETION"}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── HUD bracket corner ── */
function Corner({
  pos,
  color,
}: {
  pos: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  color: string;
}) {
  const isTop = pos.includes("top");
  const isLeft = pos.includes("left");
  return (
    <div
      className={`absolute w-4 h-4 z-[3] ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"}`}
    >
      <div
        className={`absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-full h-[2px]`}
        style={{ background: color }}
      />
      <div
        className={`absolute ${isTop ? "top-0" : "bottom-0"} ${isLeft ? "left-0" : "right-0"} w-[2px] h-full`}
        style={{ background: color }}
      />
    </div>
  );
}
