// Dashboard BILLING tab — three SettingsCards, the same rows as the Profile
// tab: a square icon on the left, a title and a line of context, the action
// on the right.
//
// ⚠️ It used to be one large "luxury" plan panel (BorderBeam, halo, a 4xl
// glowing plan name, a two-column grid) that read nothing like the tabs next
// to it. Profile and Preferences are plain stacked cards, and that is the
// dashboard's language; Billing is now written in it.
//
// The Stripe portal is opened through POST /api/billing/portal-session on
// click — Stripe wants a fresh URL every visit, so it is never cached.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, CreditCard, Crown, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { API_BASE_URL, BOX_API_BASE_URL } from "@/config";
import { showCyberToast } from "@/lib/toast-utils";
import { SettingsCard } from "@/components/ui/settings-card";
import { cn } from "@/lib/utils";

const PRIMARY =
  "inline-flex items-center gap-1.5 rounded-[2px] border border-jade/35 bg-jade/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-jade transition-colors hover:bg-jade/20 hover:border-jade/50 cursor-clicker disabled:opacity-50 disabled:pointer-events-none";

export function BillingSettings({ plan }: { plan: string | null }) {
  const [loadingPortal, setLoadingPortal] = useState(false);
  const isPaid = !!plan && plan !== "free";
  const isElite = plan === "elite";
  const planName = isElite ? "Elite" : isPaid ? "Premium" : "Free";
  const priceLabel = isElite ? "€14.99 / month" : isPaid ? "€3.49 / month" : null;

  async function openPortal() {
    try {
      setLoadingPortal(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const resp = await fetch(`${API_BASE_URL}/api/billing/portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} ${body}`.trim());
      }
      const { url } = await resp.json();
      if (!url) throw new Error("Missing portal URL");
      window.location.href = url;
    } catch (err) {
      console.error("Portal error:", err);
      showCyberToast({
        title: "Couldn't open the portal",
        description: "Stripe didn't return a session URL. Refresh and try again in a moment.",
        tag: "STRIPE",
        variant: "error",
        duration: 4500,
        id: "stripe-portal-error",
      });
      setLoadingPortal(false);
    }
  }

  // The product's own per-plan wording — the same list billingsuccess.tsx uses.
  const perks: string[] = isElite
    ? ["Scout lobbies ×3", "AI Coach + Matchup Engine", "10× daily AI tokens", "Early access to new features", "Private Discord channel", "Priority support"]
    : isPaid
      ? ["Scout lobbies ×2", "AI Coach + Matchup Engine", "Itemization analysis", "Daily performance reports", "Unlimited player & champion analysis"]
      : ["Personal data tracking", "3 daily AI tokens", "Complete loldata stats access"];

  // AI credit balance
  const allot = isElite ? 750 : isPaid ? 150 : 3;
  const [credits, setCredits] = useState<number | null>(null);
  const [creditReset, setCreditReset] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const r = await fetch(`${BOX_API_BASE_URL}/api/ai/credits`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok || !alive) return;
        const d = await r.json();
        if (!alive) return;
        if (typeof d.credits === "number") setCredits(d.credits);
        if (d.resetAt) setCreditReset(d.resetAt);
      } catch {
        /* endpoint unreachable — the card shows a dash */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const creditPct = credits == null ? 0 : Math.max(2, Math.min(100, (credits / allot) * 100));
  const creditUntil = (() => {
    if (!creditReset) return null;
    const ms = new Date(creditReset).getTime() - Date.now();
    if (ms <= 0) return "soon";
    const h = Math.floor(ms / 3_600_000);
    if (h < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m`;
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  })();

  return (
    <>
      {/* ── Membership ── */}
      <SettingsCard title="Membership" hint={isPaid ? "◈ ACTIVE" : "◈ FREE TIER"}>
        <div className="flex items-center gap-3.5">
          <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-[2px] border bg-filmdark/30", isPaid ? "border-jade/25 text-jade" : "border-jade/15 text-flash/30")}>
            <Crown className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-flash/85">
              {planName} plan
            </div>
            <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-flash/40">
              {priceLabel ? `${priceLabel} · billed via Stripe. Invoices, card and cancellation live in the portal.` : "No active subscription. Premium adds the coach, the matchups and a monthly pool of AI credits."}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isPaid ? (
              <button type="button" onClick={openPortal} disabled={loadingPortal} className={PRIMARY}>
                {loadingPortal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                {loadingPortal ? "Opening…" : "Manage"}
                {!loadingPortal && <ExternalLink className="h-3 w-3 opacity-70" />}
              </button>
            ) : (
              <Link to="/pricing" className={PRIMARY}>
                <Sparkles className="h-3.5 w-3.5" />
                View plans
              </Link>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* ── AI credits ── */}
      <SettingsCard title="AI credits" hint="◈ 1 PER QUESTION">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-flash/80 text-sm">
              {credits == null ? "Your credit balance." : `${credits} of ${allot} credits left.`}
            </span>
            <div className="mt-0.5 text-[12px] leading-snug text-flash/40">
              {isPaid ? `Refills to ${allot} every month` : "Refills to 3 every day"}
              {creditUntil ? ` · resets in ${creditUntil}` : ""}
            </div>
          </div>
          <span className="shrink-0 font-jetbrains text-lg tabular-nums text-jade">
            {credits ?? "—"}
            <span className="text-flash/30"> / {allot}</span>
          </span>
        </div>
        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-flash/[0.07]">
          <div className="h-full rounded-full bg-jade transition-[width] duration-700 ease-out" style={{ width: `${creditPct}%` }} />
        </div>
      </SettingsCard>

      {/* ── Included ── */}
      <SettingsCard title={isPaid ? "Included with your plan" : "Free tier includes"}>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {perks.map((p) => (
            <li key={p} className="flex items-center gap-2.5 text-[12.5px] text-flash/70">
              <span className={cn("grid h-4 w-4 shrink-0 place-items-center rounded-[2px] border", isPaid ? "border-jade/35 bg-jade/10 text-jade" : "border-flash/15 bg-flash/[0.04] text-flash/50")}>
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="truncate">{p}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>
    </>
  );
}
