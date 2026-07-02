// Dashboard SCOUT tab — lists the authenticated user's scout lobbies with
// quota info and a create-new button. Plan limits enforced by the backend:
// free 3, premium (PRO) 5, elite 10.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Users,
  ExternalLink,
  Clock,
  AlertCircle,
  Crown,
} from "lucide-react";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
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

const PLAN_LABEL: Record<PlanTier, string> = {
  free: "FREE",
  premium: "PRO",
  elite: "ELITE",
};

const PLAN_COLOR: Record<PlanTier, string> = {
  free: "text-flash/60",
  premium: "text-jade",
  elite: "text-amber-300",
};

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export default function ScoutLobbiesManager() {
  const [data, setData] = useState<MyLobbiesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-[2px] border border-flash/8 bg-black/20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[2px] border border-red-400/20 bg-red-400/5 px-4 py-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-red-400/70" />
        <span className="text-[11px] font-mono text-red-300/80">
          {error ?? "Failed to load"}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* QUOTA HEADER */}
      <div className="relative overflow-hidden rounded-md bg-white/[0.04] backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.10)]">
        <div className="relative z-[1] px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h4 className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">
                Your Plan
              </h4>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-[0.2em] px-1.5 py-[1px] rounded-sm border",
                  data.plan === "free"
                    ? "border-flash/15 text-flash/60"
                    : data.plan === "premium"
                      ? "border-jade/30 bg-jade/10 text-jade"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-300"
                )}
              >
                {data.plan !== "free" && <Crown className="w-2.5 h-2.5" />}
                {PLAN_LABEL[data.plan]}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-[20px] font-orbitron font-bold tabular-nums",
                  PLAN_COLOR[data.plan]
                )}
              >
                {data.used}
              </span>
              <span className="text-[12px] font-mono text-flash/30">
                / {data.limit} lobbies used
              </span>
            </div>
            {!data.canCreate && data.plan !== "elite" && (
              <p className="mt-1 text-[10px] font-mono text-flash/40">
                Limit reached — upgrade for more.{" "}
                <Link to="/pricing" className="text-jade hover:underline">
                  See plans →
                </Link>
              </p>
            )}
          </div>

          {data.canCreate ? (
            <Link
              to="/scout/new"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border border-jade/40 text-jade hover:bg-jade/10 hover:shadow-[0_0_15px_rgba(0,217,146,0.15)] font-mono text-[10px] tracking-[0.2em] uppercase cursor-clicker transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New lobby
            </Link>
          ) : (
            <Link
              to="/pricing"
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-sm border font-mono text-[10px] tracking-[0.2em] uppercase cursor-clicker transition-all",
                data.plan === "premium"
                  ? "border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
                  : "border-jade/40 text-jade hover:bg-jade/10"
              )}
            >
              <Crown className="w-3.5 h-3.5" />
              Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* LOBBIES LIST */}
      {data.lobbies.length === 0 ? (
        <div className="rounded-[2px] border border-dashed border-flash/15 bg-black/20 px-6 py-10 flex flex-col items-center text-center gap-3">
          <div className="relative w-10 h-10">
            <span className="absolute inset-0 rotate-45 rounded-[3px] border border-jade/30 bg-jade/5" />
            <span className="absolute inset-0 flex items-center justify-center text-jade/60">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div>
            <p className="text-[12px] font-mono text-flash/60 mb-1">
              No lobbies yet
            </p>
            <p className="text-[10px] font-mono text-flash/30">
              Create your first lobby to start tracking your squad.
            </p>
          </div>
          <Link
            to="/scout/new"
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-sm border border-jade/40 text-jade hover:bg-jade/10 font-mono text-[10px] tracking-[0.2em] uppercase cursor-clicker transition-all"
          >
            <Plus className="w-3 h-3" />
            Create lobby
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {data.lobbies.map((lobby) => (
            <Link
              key={lobby.slug}
              to={`/scout/${lobby.slug}`}
              className="group relative block rounded-[2px] border border-flash/10 bg-black/25 hover:bg-black/35 hover:border-jade/25 hover:shadow-[0_0_15px_rgba(0,217,146,0.08)] transition-all overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-flash/20 group-hover:bg-jade/50 transition-colors" />
              <div className="relative z-10 px-4 py-3 pl-5 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[13px] font-mono font-bold text-flash truncate group-hover:text-jade transition-colors">
                      {lobby.name}
                    </h3>
                    {!lobby.isPublic && (
                      <span className="text-[8px] font-mono uppercase tracking-wider text-flash/40 border border-flash/15 px-1 py-[1px] rounded-sm">
                        Private
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-flash/35">
                    <span className="flex items-center gap-1">
                      <Users className="w-2.5 h-2.5" />
                      {lobby.playerCount}{" "}
                      {lobby.playerCount === 1 ? "player" : "players"}
                    </span>
                    <span className="opacity-30">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      refreshed {formatRelative(lobby.lastRefreshAt)}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <code className="hidden sm:block text-[10px] font-mono text-flash/25 tabular-nums">
                    /{lobby.slug}
                  </code>
                  <ExternalLink className="w-3.5 h-3.5 text-flash/30 group-hover:text-jade transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
