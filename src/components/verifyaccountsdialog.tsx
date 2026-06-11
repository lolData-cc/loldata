// src/components/verifyaccountsdialog.tsx
//
// Per-account verify challenge dialog.
//
//   • Lists every Riot account linked to the current user's claimed
//     lobby_player identity.
//   • Each row has a "VERIFY" button; clicking it:
//       1. Asks the backend for a target profile-icon id (/verify/start)
//       2. Renders the target icon + instructions
//       3. User changes their icon in the LoL client, returns,
//          presses "I'VE CHANGED IT — CHECK"
//       4. Backend fetches their current Riot icon and compares.
//          Match → row becomes "VERIFIED" with a check; mismatch →
//          inline error showing current vs target.
//
// Grade 2 is reached only when every account is verified. The badge
// next to the player display name auto-upgrades to Grade 2 on the
// next lobby read (the backend computes verifyGrade from accounts).

import * as React from "react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { showCyberToast } from "@/lib/toast-utils";
import { VerifyBadge } from "@/components/verifybadge";

export type VerifyAccountRow = {
  /** lobby_player_id (UUID) — passed to /verify/start and /check. */
  lobbyPlayerId: string;
  puuid: string;
  region: string;
  riotName: string;
  riotTag: string;
  /** ISO timestamp if already verified, null otherwise. */
  verifiedAt: string | null;
};

export function VerifyAccountsDialog({
  open,
  onClose,
  accounts,
  playerDisplayName,
  playerColor,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  accounts: VerifyAccountRow[];
  playerDisplayName: string;
  playerColor: string | null;
  onChanged: () => void;
}) {
  const allDone =
    accounts.length > 0 && accounts.every((a) => !!a.verifiedAt);
  const accent = playerColor || "#00d992";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[520px] p-0 bg-transparent border-none shadow-none [&>button.absolute]:hidden">
        <DialogTitle className="sr-only">Verify accounts</DialogTitle>
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, transparent) 0%, rgba(0,0,0,0.55) 100%), rgba(4,10,12,0.92)`,
            border: `0.5px solid color-mix(in srgb, ${accent} 25%, rgba(255,255,255,0.06))`,
            boxShadow: `0 20px 60px rgba(0,0,0,0.65), inset 0 1px 0 color-mix(in srgb, ${accent} 28%, transparent)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-flash/[0.06]">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
              style={{
                background: `color-mix(in srgb, ${accent} 14%, transparent)`,
                border: `0.5px solid color-mix(in srgb, ${accent} 40%, transparent)`,
              }}
            >
              <VerifyBadge grade={allDone ? 2 : 1} size={18} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[15px] font-chakrapetch font-bold text-flash leading-tight">
                Verify accounts
              </span>
              <span className="text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/45 mt-0.5">
                Identity ·{" "}
                <span style={{ color: accent }}>{playerDisplayName}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center text-flash/40 hover:text-flash hover:bg-flash/[0.06] transition-colors cursor-clicker"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Intro */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-[12px] text-flash/65 font-geist leading-snug">
              For each account below, set the requested profile icon
              in your League client, then press <span className="text-jade">Check</span>.
              When every account is verified, your identity upgrades
              to <span className="text-jade font-medium">Verify Grade 2</span>.
            </p>
          </div>

          {/* Accounts list */}
          <div className="px-3 pb-3 max-h-[60vh] overflow-y-auto">
            {accounts.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] font-jetbrains tracking-[0.15em] uppercase text-flash/30">
                No accounts to verify
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {accounts.map((a) => (
                  <AccountVerifyRow
                    key={a.puuid}
                    account={a}
                    onChanged={onChanged}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer status */}
          <div className="px-5 py-3 border-t border-flash/[0.06] flex items-center justify-between">
            <span className="text-[10px] font-jetbrains tracking-[0.2em] uppercase text-flash/40">
              {accounts.filter((a) => !!a.verifiedAt).length}/{accounts.length}{" "}
              verified
            </span>
            {allDone && (
              <span className="text-[10px] font-jetbrains tracking-[0.25em] uppercase text-jade font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Grade 2 unlocked
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Per-account row ────────────────────────────────────────────────

type RowState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "challenge"; targetIconId: number }
  | {
      phase: "checking";
      targetIconId: number;
    }
  | {
      phase: "mismatch";
      targetIconId: number;
      currentIconId: number | null;
    };

function AccountVerifyRow({
  account,
  onChanged,
}: {
  account: VerifyAccountRow;
  onChanged: () => void;
}) {
  const [state, setState] = useState<RowState>({ phase: "idle" });
  const isVerified = !!account.verifiedAt;

  // Reset row state if it gets verified externally.
  useEffect(() => {
    if (isVerified) setState({ phase: "idle" });
  }, [isVerified]);

  const authHeader = async (): Promise<HeadersInit | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  };

  const startChallenge = async () => {
    setState({ phase: "starting" });
    const headers = await authHeader();
    if (!headers) {
      showCyberToast({ title: "Sign in required", variant: "error" });
      setState({ phase: "idle" });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/scout/verify/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          lobbyPlayerId: account.lobbyPlayerId,
          puuid: account.puuid,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showCyberToast({
          title: "Couldn't start verify",
          description: body?.error,
          variant: "error",
        });
        setState({ phase: "idle" });
        return;
      }
      const data = await res.json();
      setState({ phase: "challenge", targetIconId: data.targetIconId });
    } catch (e: any) {
      showCyberToast({
        title: "Network error",
        description: e?.message,
        variant: "error",
      });
      setState({ phase: "idle" });
    }
  };

  const checkChallenge = async () => {
    if (state.phase !== "challenge" && state.phase !== "mismatch") return;
    const target =
      state.phase === "challenge"
        ? state.targetIconId
        : state.targetIconId;
    setState({ phase: "checking", targetIconId: target });
    const headers = await authHeader();
    if (!headers) {
      setState({ phase: "challenge", targetIconId: target });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/scout/verify/check`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          lobbyPlayerId: account.lobbyPlayerId,
          puuid: account.puuid,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showCyberToast({
          title: "Check failed",
          description: data?.error,
          variant: "error",
        });
        setState({ phase: "challenge", targetIconId: target });
        return;
      }
      if (data?.match) {
        showCyberToast({
          title: "Account verified",
          description: `${account.riotName} #${account.riotTag}`,
        });
        onChanged();
        setState({ phase: "idle" });
      } else {
        setState({
          phase: "mismatch",
          targetIconId: target,
          currentIconId: data?.currentIconId ?? null,
        });
      }
    } catch (e: any) {
      showCyberToast({
        title: "Network error",
        description: e?.message,
        variant: "error",
      });
      setState({ phase: "challenge", targetIconId: target });
    }
  };

  const iconUrl = (id: number | null) =>
    id !== null ? `${cdnBaseUrl()}/img/profileicon/${id}.png` : null;

  // ─── Verified row ──────────────────────────────────────────────────
  if (isVerified) {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-jade/[0.06] border border-jade/25"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-jade/15 border border-jade/40">
          <CheckCircle2 className="w-4 h-4 text-jade" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[12px] font-chakrapetch font-bold text-flash truncate">
            {account.riotName}
            <span className="text-flash/35 font-normal">#{account.riotTag}</span>
          </span>
          <span className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-jade/80 mt-0.5">
            ✓ Verified · {account.region}
          </span>
        </div>
      </div>
    );
  }

  // ─── Unverified row ────────────────────────────────────────────────
  return (
    <div className="rounded-md bg-black/35 border border-flash/[0.08] overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="w-8 h-8 rounded-md bg-flash/[0.04] border border-flash/15 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-jetbrains font-bold text-flash/55">
            {account.region}
          </span>
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[12px] font-chakrapetch font-bold text-flash truncate">
            {account.riotName}
            <span className="text-flash/35 font-normal">#{account.riotTag}</span>
          </span>
          <span className="text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/45 mt-0.5">
            ◇ Unverified
          </span>
        </div>
        <div className="shrink-0">
          {state.phase === "idle" && (
            <button
              type="button"
              onClick={startChallenge}
              className="text-[10px] font-jetbrains tracking-[0.22em] uppercase font-bold px-3 py-1.5 rounded-[3px] border border-[#5bb8ff]/40 text-[#5bb8ff] bg-[#5bb8ff]/[0.08] hover:bg-[#5bb8ff]/[0.18] hover:border-[#5bb8ff]/70 cursor-clicker transition-all"
            >
              Verify
            </button>
          )}
          {state.phase === "starting" && (
            <Loader2 className="w-4 h-4 text-[#5bb8ff] animate-spin" />
          )}
        </div>
      </div>

      {/* Challenge / mismatch panel — expands under the row */}
      <AnimatePresence>
        {(state.phase === "challenge" ||
          state.phase === "checking" ||
          state.phase === "mismatch") && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-flash/[0.06]"
          >
            <div className="px-3 py-3 flex items-start gap-3">
              {/* Target icon big */}
              <div className="shrink-0">
                <div className="text-[8px] font-jetbrains tracking-[0.3em] uppercase text-flash/45 text-center mb-1">
                  Target
                </div>
                {iconUrl(state.targetIconId) && (
                  <img
                    src={iconUrl(state.targetIconId)!}
                    alt={`Profile icon ${state.targetIconId}`}
                    className="w-16 h-16 rounded-md border border-[#5bb8ff]/50"
                    style={{
                      boxShadow: "0 0 18px rgba(91,184,255,0.35)",
                    }}
                  />
                )}
                <div className="text-[8px] font-jetbrains tracking-[0.2em] uppercase text-flash/40 text-center mt-1">
                  #{state.targetIconId}
                </div>
              </div>

              {/* Instructions + check button */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-jetbrains tracking-[0.18em] uppercase text-flash/70 font-medium mb-1.5">
                  Set this icon
                </div>
                <p className="text-[11px] text-flash/55 font-geist leading-snug mb-3">
                  Open League client → Profile → Change profile icon →
                  pick this one → wait ~30s for Riot to sync → press
                  Check.
                </p>
                {state.phase === "mismatch" && (
                  <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-[3px] bg-error/10 border border-error/30">
                    <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
                    <div className="text-[10px] font-jetbrains text-error/85 leading-snug">
                      Icon hasn't changed yet.
                      {state.currentIconId !== null && (
                        <> Current: #{state.currentIconId}</>
                      )}{" "}
                      Try again in 30s.
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={checkChallenge}
                  disabled={state.phase === "checking"}
                  className="text-[10px] font-jetbrains tracking-[0.22em] uppercase font-bold px-3 py-1.5 rounded-[3px] border border-jade/40 text-jade bg-jade/[0.10] hover:bg-jade/[0.20] hover:border-jade/70 cursor-clicker transition-all disabled:opacity-50"
                >
                  {state.phase === "checking" ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Checking…
                    </span>
                  ) : (
                    "I've changed it · Check"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
