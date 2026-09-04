// Dashboard SCOUT tab — the user's scout lobbies, in the dashboard's own
// language: SettingsCards, the same rows as the Profile tab (square icon,
// title, a line of context, the action on the right).
//
// ⚠️ It used to be a bespoke quota header plus a list of bordered link
// rows with an accent bar — a third visual system next to Profile and
// Preferences. Now: one card for the quota and the create action, one card
// listing the lobbies as rows separated by hairlines.
//
// Plan limits are enforced by the backend (free 3, premium 5, elite 10);
// this only shows what /api/scout/my-lobbies reports.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, ExternalLink, Plus, Users } from "lucide-react";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { SettingsCard } from "@/components/ui/settings-card";
import { cn } from "@/lib/utils";

type PlanTier = "free" | "premium" | "elite";

type LobbyRow = {
  slug: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  lastRefreshAt: string | null;
  playerCount: number;
};

type MyLobbiesPayload = {
  plan: PlanTier;
  used: number;
  limit: number;
  canCreate: boolean;
  lobbies: LobbyRow[];
};

const PLAN_LABEL: Record<PlanTier, string> = { free: "FREE", premium: "PREMIUM", elite: "ELITE" };

const PRIMARY =
  "inline-flex items-center gap-1.5 rounded-[2px] border border-jade/35 bg-jade/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-jade transition-colors hover:bg-jade/20 hover:border-jade/50 cursor-clicker";
const SECONDARY =
  "inline-flex items-center gap-1.5 rounded-[2px] border border-flash/15 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-flash/50 transition-colors hover:bg-flash/5 hover:text-flash/70 cursor-clicker";

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

export default function ScoutLobbiesManager() {
  const [data, setData] = useState<MyLobbiesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (!cancelled) {
            setError("Login required");
            setLoading(false);
          }
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/scout/my-lobbies`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as MyLobbiesPayload;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <SettingsCard title="Scout lobbies">
        <div className="flex items-center gap-3.5">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-[2px] bg-flash/5" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-32 animate-pulse rounded-[2px] bg-flash/5" />
            <div className="h-3 w-56 animate-pulse rounded-[2px] bg-flash/5" />
          </div>
        </div>
      </SettingsCard>
    );
  }

  if (error || !data) {
    return (
      <SettingsCard title="Scout lobbies" variant="danger" hint="◈ UNAVAILABLE">
        <span className="text-flash/60 text-sm">Couldn't load your lobbies: {error ?? "unknown error"}.</span>
      </SettingsCard>
    );
  }

  const limitReached = !data.canCreate && data.plan !== "elite";

  return (
    <>
      {/* ── Quota + create ── */}
      <SettingsCard title="Scout lobbies" hint={`◈ ${data.used} / ${data.limit} USED`}>
        <div className="flex items-center gap-3.5">
          <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-[2px] border bg-filmdark/30", data.plan === "free" ? "border-jade/15 text-flash/35" : "border-jade/25 text-jade")}>
            <Users className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-flash/85">Your lobbies</span>
              <span className={cn("inline-flex items-center gap-1 rounded-sm border px-1.5 py-[1px] font-mono text-[9px] tracking-[0.2em]", data.plan === "free" ? "border-flash/15 text-flash/50" : "border-jade/30 bg-jade/10 text-jade")}>
                {data.plan !== "free" && <Crown className="h-2.5 w-2.5" />}
                {PLAN_LABEL[data.plan]}
              </span>
            </div>
            <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-flash/40">
              {limitReached
                ? `Shareable feeds tracking up to 20 players each. You are at your plan's limit of ${data.limit}.`
                : "Shareable feeds tracking up to 20 players each. The quota depends on your plan."}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {data.canCreate ? (
              <Link to="/scout/new" className={PRIMARY}>
                <Plus className="h-3.5 w-3.5" />
                New lobby
              </Link>
            ) : (
              <Link to="/pricing" className={PRIMARY}>
                <Crown className="h-3.5 w-3.5" />
                Upgrade
              </Link>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* ── The lobbies ── */}
      <SettingsCard title="Lobbies" hint={data.lobbies.length ? `◈ ${data.lobbies.length}` : undefined}>
        {data.lobbies.length === 0 ? (
          <div className="flex items-center gap-3.5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[2px] border border-jade/15 bg-filmdark/30 text-flash/25">
              <Users className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-flash/85">No lobbies yet</div>
              <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-flash/40">
                Create your first lobby to start tracking your squad.
              </div>
            </div>
            {data.canCreate && (
              <div className="flex shrink-0 items-center gap-2">
                <Link to="/scout/new" className={PRIMARY}>
                  <Plus className="h-3.5 w-3.5" />
                  Create lobby
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {data.lobbies.map((lobby, i) => (
              <div key={lobby.slug}>
                {i > 0 && <div className="my-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />}
                <div className="flex items-center gap-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[2px] border border-jade/15 bg-filmdark/30 font-jetbrains text-[13px] text-jade/80">
                    {lobby.playerCount}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-flash/85">{lobby.name}</span>
                      {!lobby.isPublic && (
                        <span className="rounded-sm border border-flash/15 px-1 py-[1px] font-mono text-[8px] uppercase tracking-wider text-flash/40">
                          Private
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[12px] leading-snug text-flash/40">
                      {lobby.playerCount} {lobby.playerCount === 1 ? "player" : "players"} · refreshed {formatRelative(lobby.lastRefreshAt)}
                      <span className="hidden sm:inline text-flash/25"> · /{lobby.slug}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link to={`/scout/${lobby.slug}`} className={SECONDARY}>
                      Open
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingsCard>
    </>
  );
}
