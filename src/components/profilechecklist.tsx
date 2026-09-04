// "Complete your profile" — the strip at the top of the dashboard.
//
// Five steps, in the order a new member should take them: link League, link
// Discord, try Ctrl+Y, open the daily report on Learn, look at the
// preferences. It sits above the tab content in EVERY tab until it is done
// or dismissed, because the point is to be seen before the person settles
// into one tab and forgets the rest exists.
//
// Two kinds of "done":
//   • from the data — League (nametag from the auth context) and Discord
//     (profile_players.discord_id, or a Discord identity on the account);
//   • from a flag in localStorage — Ctrl+Y (set by the navbar handler when
//     the shortcut actually fires), the Learn page (set on mount) and the
//     Preferences tab (set when the tab is opened). These cannot be known
//     from the server and are not worth a table.
// Dismissal is a flag too, per browser. Nothing here touches the backend.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { useAuth } from "@/context/authcontext";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

export const ONBOARD_FLAGS = {
  ctrlY: "ld:onboard:ctrl-y",
  learn: "ld:onboard:learn",
  preferences: "ld:onboard:preferences",
  dismissed: "ld:onboard:dismissed",
} as const;

export function markOnboardFlag(key: keyof typeof ONBOARD_FLAGS) {
  try {
    localStorage.setItem(ONBOARD_FLAGS[key], "1");
    window.dispatchEvent(new Event("ld:onboard"));
  } catch {
    /* storage unavailable — the step simply stays open */
  }
}

function readFlag(key: keyof typeof ONBOARD_FLAGS): boolean {
  try {
    return localStorage.getItem(ONBOARD_FLAGS[key]) === "1";
  } catch {
    return false;
  }
}

type Step = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  /** Where the step is taken. A path to navigate to, or nothing for a keyboard step. */
  to?: string;
  action?: string;
};

export function ProfileChecklist() {
  const { session, nametag, region } = useAuth();
  const navigate = useNavigate();
  const [discordDone, setDiscordDone] = useState(false);
  const [flags, setFlags] = useState({ ctrlY: false, learn: false, preferences: false, dismissed: false });

  // flags: read on mount and whenever one is set elsewhere in this tab
  useEffect(() => {
    const read = () =>
      setFlags({
        ctrlY: readFlag("ctrlY"),
        learn: readFlag("learn"),
        preferences: readFlag("preferences"),
        dismissed: readFlag("dismissed"),
      });
    read();
    window.addEventListener("ld:onboard", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("ld:onboard", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  // Discord: the profile row, or an identity on the account
  useEffect(() => {
    const user = session?.user;
    if (!user) return;
    const fromIdentity = !!user.identities?.some((i) => i.provider === "discord");
    const fromMeta = !!(user.user_metadata as Record<string, unknown> | undefined)?.discord_id;
    if (fromIdentity || fromMeta) {
      setDiscordDone(true);
      return;
    }
    let alive = true;
    supabase
      .from("profile_players")
      .select("discord_id")
      .eq("profile_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data?.discord_id) setDiscordDone(true);
      });
    return () => {
      alive = false;
    };
  }, [session?.user?.id]);

  const leagueDone = !!nametag && !!region;
  const steps: Step[] = [
    { id: "league", label: "Link your League account", hint: "Your games, your rank, your profile page.", done: leagueDone, to: "/dashboard/profile", action: "Link" },
    { id: "discord", label: "Connect Discord", hint: "Unlocks the scout feed and the community roles.", done: discordDone, to: "/dashboard/profile", action: "Connect" },
    { id: "ctrly", label: "Press Ctrl + Y", hint: leagueDone ? "Jumps to your own profile from anywhere." : "Jumps to your profile — once League is linked.", done: flags.ctrlY },
    { id: "learn", label: "Read your daily report", hint: "Learn → Overview, rebuilt every day from your games.", done: flags.learn, to: "/learn", action: "Open" },
    { id: "prefs", label: "Set your preferences", hint: "Theme, match list, shortcuts — make it yours.", done: flags.preferences, to: "/dashboard/preferences", action: "Open" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (flags.dismissed || !session) return null;

  const dismiss = () => markOnboardFlag("dismissed");

  return (
    <div className="relative overflow-hidden rounded-md glass-surface backdrop-blur-lg saturate-150">
      <div className="relative z-[1] px-4 py-3.5">
        {/* header */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-jade/55">
            {allDone ? "Profile complete" : "Complete your profile"}
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.08em] text-flash/30">◈ {doneCount} / {steps.length}</span>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Hide this checklist"
              className="grid h-5 w-5 place-items-center rounded-[2px] text-flash/30 transition-colors hover:bg-flash/5 hover:text-flash/70 cursor-clicker"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* progress rail */}
        <div className="mb-3 h-[3px] w-full overflow-hidden rounded-full bg-flash/[0.07]">
          <div className="h-full rounded-full bg-jade transition-[width] duration-700 ease-out" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>

        {/* steps */}
        <ol className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-5">
          {steps.map((s, i) => {
            const current = !s.done && steps.slice(0, i).every((p) => p.done);
            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-[2px] p-2 transition-colors md:flex-col md:gap-2",
                  current && "bg-jade/[0.05]"
                )}
              >
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-[2px] border font-mono text-[10px]",
                    s.done ? "border-jade/40 bg-jade/15 text-jade" : current ? "border-jade/50 text-jade" : "border-flash/15 text-flash/40"
                  )}
                >
                  {s.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("text-[12.5px] font-medium leading-snug", s.done ? "text-flash/45 line-through decoration-flash/25" : "text-flash/85")}>
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-flash/40">{s.hint}</div>
                  {!s.done && s.to && s.action && (
                    <Link
                      to={s.to}
                      onClick={() => {
                        if (s.id === "prefs") markOnboardFlag("preferences");
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-jade hover:underline cursor-clicker"
                    >
                      {s.action} →
                    </Link>
                  )}
                  {!s.done && s.id === "ctrly" && leagueDone && (
                    <button
                      type="button"
                      onClick={() => {
                        markOnboardFlag("ctrlY");
                        const [n, t] = (nametag ?? "").split("#");
                        navigate(`/summoners/${region}/${n.replace(/\s+/g, "+")}-${t}`);
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-jade hover:underline cursor-clicker"
                    >
                      Try it →
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {allDone && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-jade/[0.12] pt-3">
            <span className="text-[12px] text-flash/60">Everything is set up.</span>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-[2px] border border-jade/35 bg-jade/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-jade transition-colors hover:bg-jade/20 cursor-clicker"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
