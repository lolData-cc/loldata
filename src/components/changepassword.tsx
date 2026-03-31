import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { BorderBeam } from "@/components/ui/border-beam";

export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = newPw.length >= 6 && newPw === confirmPw && !loading;

  function handleClose() {
    if (loading) return;
    setOpen(false);
    setNewPw("");
    setConfirmPw("");
  }

  async function handleChange() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      showCyberToast({ title: "Password updated", variant: "status" });
      handleClose();
    } catch (err: any) {
      showCyberToast({
        title: "Failed to update password",
        description: err?.message ?? "Unknown error",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Card — matches AccountDeletion layout */}
      <div className="relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
        <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />

        <div className="relative z-[2] px-4 py-3 pl-5 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">
              Change Password
            </h4>
            <span className="text-flash/60 text-sm">
              Update your account password.
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase transition-colors shrink-0"
          >
            CHANGE
          </button>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="w-full max-w-sm bg-transparent shadow-none top-60 [&>button]:hidden flex flex-col items-center">
          <div className="w-full relative">
            <div className="font-jetbrains bg-liquirice/90 select-none border-flash/10 border px-7 py-5 rounded-md">
              <BorderBeam duration={8} size={100} />

              <DialogHeader>
                <DialogTitle className="text-flash">Change Password</DialogTitle>
                <DialogDescription className="text-flash/50 text-sm">
                  Enter a new password (minimum 6 characters).
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 mt-4">
                <input
                  type="password"
                  placeholder="New password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-full px-3 py-2 rounded-[2px] border border-flash/10 bg-black/30 text-flash/80 text-sm font-mono placeholder:text-flash/20 focus:outline-none focus:border-jade/30 transition-colors"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3 py-2 rounded-[2px] border border-flash/10 bg-black/30 text-flash/80 text-sm font-mono placeholder:text-flash/20 focus:outline-none focus:border-jade/30 transition-colors"
                />

                {newPw && confirmPw && newPw !== confirmPw && (
                  <p className="text-[10px] text-red-400/60 font-mono">Passwords do not match</p>
                )}
                {newPw && newPw.length > 0 && newPw.length < 6 && (
                  <p className="text-[10px] text-flash/30 font-mono">Minimum 6 characters</p>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-2 py-1 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker transition-colors disabled:opacity-40"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleChange}
                  className="px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  {loading ? "UPDATING..." : "CONFIRM"}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
