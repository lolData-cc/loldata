// components/admin/account-link-override.tsx
//
// ADMIN-ONLY shortcut to link ANY League profile to the current account
// with just name + tag — no Riot RSO, no icon-ownership step.
//
// Why this exists: the real linker (ProfilerLinker) kicks off Riot RSO,
// whose redirect_uri is the production domain, so on localhost the
// "LINK" button bounces you to loldata.cc. For local dev we just need
// SOME linked account (so personalised features — the AI "how am I
// performing" tool, the summoner shortcuts — have a puuid to work with).
//
// It does exactly what ProfilerLinker.handleVerifyIcon does on success,
// minus the icon check:
//   1. resolve name+tag → puuid via the LIVE box (/api/summoner on api2,
//      so it works with NO local backend running)
//   2. upsert profile_players { puuid, nametag, region }
//   3. mirror onto auth metadata (lol_nametag / lol_region / lol_linked_at)
//   4. refreshProfile() so the auth context (and the AI userContext)
//      pick up the new puuid/nametag/region reactively — no reload.
//
// Citrine accent throughout so it reads as a debug tool, matching the
// sibling Plan Setup panel — not a production feature.

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { useAuth } from "@/context/authcontext";
import { BOX_API_BASE_URL } from "@/config";
import { cn } from "@/lib/utils";
import { Loader2, Link2, Link2Off, Search } from "lucide-react";

type LolRegion = "EUW" | "NA" | "KR";

export function AccountLinkOverride() {
  const { session, nametag, region, puuid, refreshProfile } = useAuth();
  const userId = session?.user?.id;
  const email = session?.user?.email ?? "—";

  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [reg, setReg] = useState<LolRegion>("EUW");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const isLinked = !!(nametag && puuid);

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    const n = name.trim();
    const t = tag.replace(/^#/, "").trim();
    if (!n || !t) {
      showCyberToast({
        title: "Name and tag required",
        description: "Enter both the in-game name and the #TAG.",
        variant: "error",
        tag: "ERR",
      });
      return;
    }

    try {
      setLinking(true);

      // 1) Resolve puuid from the LIVE box — works with no local backend.
      const res = await fetch(`${BOX_API_BASE_URL}/api/summoner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, tag: t, region: reg }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        showCyberToast({
          title: "Profile not found",
          description: `Check name, tag and region. ${txt}`.trim().slice(0, 140),
          variant: "error",
          tag: "ERR",
        });
        return;
      }

      const json = await res.json();
      const summ = json?.summoner;
      if (!summ?.puuid) {
        showCyberToast({
          title: "No PUUID returned",
          description: "The lookup succeeded but no puuid came back.",
          variant: "error",
          tag: "ERR",
        });
        return;
      }

      const resolvedNametag = `${summ.name}#${summ.tag}`;
      const payload = {
        player_id: userId,
        puuid: summ.puuid,
        nametag: resolvedNametag,
        region: reg.toLowerCase(),
      };

      // 2) Upsert profile_players (update if a row exists, else insert) —
      //    identical to the real linker's persistence path.
      const { data: existing, error: selErr } = await supabase
        .from("profile_players")
        .select("profile_id")
        .eq("profile_id", userId)
        .maybeSingle<{ profile_id: string }>();
      if (selErr) throw selErr;

      if (existing) {
        const { error } = await supabase
          .from("profile_players")
          .update(payload)
          .eq("profile_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profile_players")
          .insert({ profile_id: userId, ...payload });
        if (error) throw error;
      }

      // 3) Mirror onto auth metadata, like the RSO flow does.
      await supabase.auth.updateUser({
        data: {
          lol_nametag: resolvedNametag,
          lol_region: reg.toUpperCase(),
          lol_linked_at: new Date().toISOString(),
        },
      });

      // 4) Re-read the profile so the auth context + AI userContext update.
      await refreshProfile();

      showCyberToast({
        title: "Profile linked",
        description: `${resolvedNametag} (${reg}) — no RSO needed.`,
        variant: "status",
        tag: "OK",
      });
      setName("");
      setTag("");
    } catch (err: any) {
      console.error("admin link error", err);
      showCyberToast({
        title: "Link failed",
        description: err?.message ?? "Supabase rejected the write.",
        variant: "error",
        tag: "DB",
      });
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink() {
    if (!userId) return;
    try {
      setUnlinking(true);
      const { error } = await supabase
        .from("profile_players")
        .update({ puuid: null, nametag: null, region: null })
        .eq("profile_id", userId);
      if (error) throw error;

      await supabase.auth.updateUser({
        data: { lol_nametag: null, lol_region: null, lol_linked_at: null },
      });
      await refreshProfile();

      showCyberToast({
        title: "Profile unlinked",
        description: "Cleared puuid / nametag / region on your row.",
        variant: "status",
        tag: "OK",
      });
    } catch (err: any) {
      console.error("admin unlink error", err);
      showCyberToast({
        title: "Unlink failed",
        description: err?.message ?? "Supabase rejected the write.",
        variant: "error",
        tag: "DB",
      });
    } finally {
      setUnlinking(false);
    }
  }

  const regions: LolRegion[] = ["EUW", "NA", "KR"];

  return (
    <div className="flex flex-col gap-6 p-3 px-3 sm:p-4 sm:px-6">
      <div className="space-y-2">
        <h3 className="text-citrine/85">⚙ ACCOUNT LINK</h3>
        <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-citrine/45">
          :: ADMIN OVERRIDE ::
        </p>
        <p className="text-[12px] text-flash/55 leading-relaxed max-w-xl">
          Force-link ANY League profile to your account with just a name and
          tag — no Riot RSO, no icon check. The normal{" "}
          <code className="text-flash/80">LINK</code> button uses Riot login,
          whose redirect goes to production, so on localhost it bounces you to
          loldata.cc. This writes{" "}
          <code className="text-citrine/85">puuid / nametag / region</code>{" "}
          straight into <code className="text-flash/80">profile_players</code>.
        </p>
      </div>

      {/* Identity card — who's being edited + current link state. */}
      <div className="rounded-md border border-citrine/15 bg-filmdark/30 backdrop-blur-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] font-jetbrains">
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1">
              EMAIL
            </div>
            <div className="text-flash/80 truncate">{email}</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1">
              LINKED ACCOUNT
            </div>
            <div className={cn("truncate", isLinked ? "text-jade" : "text-flash/40")}>
              {isLinked ? `${nametag} · ${(region ?? "").toUpperCase()}` : "— not linked —"}
            </div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1">
              PUUID
            </div>
            <div className="text-flash/60 truncate tabular-nums text-[10px]">
              {puuid ? `${puuid.slice(0, 16)}…` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Link form — name + tag + region, one shot. */}
      <form onSubmit={handleLink} className="space-y-4">
        <div className="text-[10px] font-mono tracking-[0.25em] uppercase text-citrine/55">
          ▸ Link a profile
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <label className="block text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1.5">
              In-game name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Faker"
              disabled={linking}
              className="w-full bg-filmdark/30 border border-flash/15 focus:border-citrine/55 rounded-sm px-3 py-2 text-sm text-flash placeholder:text-flash/25 font-jetbrains outline-none transition-colors disabled:opacity-60"
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="block text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1.5">
              Tag
            </label>
            <div className="flex items-center bg-filmdark/30 border border-flash/15 focus-within:border-citrine/55 rounded-sm px-3 py-2 transition-colors">
              <span className="text-flash/35 text-sm font-jetbrains mr-0.5">#</span>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value.replace(/^#/, ""))}
                placeholder="KR1"
                disabled={linking}
                className="w-full bg-transparent text-sm text-flash placeholder:text-flash/25 font-jetbrains outline-none disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-[0.22em] text-flash/35 mb-1.5">
            Region
          </label>
          <div className="inline-flex rounded-sm border border-flash/[0.12] bg-filmlight/[0.02] p-[3px]">
            {regions.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReg(r)}
                disabled={linking}
                className={cn(
                  "px-4 py-1 text-[11px] font-jetbrains uppercase tracking-[0.15em] cursor-clicker rounded-[2px] transition-colors disabled:opacity-60",
                  reg === r
                    ? "text-citrine bg-citrine/15 border border-citrine/35"
                    : "text-flash/40 hover:text-flash/65 border border-transparent"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={linking || !name.trim() || !tag.trim()}
            className="
              inline-flex items-center gap-2.5 px-5 py-2.5 rounded-sm
              font-jetbrains text-[11px] tracking-[0.2em] uppercase
              text-citrine border border-citrine/40 bg-citrine/[0.06]
              hover:bg-citrine/15 hover:border-citrine/65
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200 cursor-clicker
            "
          >
            {linking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {linking ? "RESOLVING…" : "RESOLVE & LINK"}
          </button>

          {isLinked && (
            <button
              type="button"
              onClick={handleUnlink}
              disabled={unlinking}
              className="
                inline-flex items-center gap-2.5 px-5 py-2.5 rounded-sm
                font-jetbrains text-[11px] tracking-[0.2em] uppercase
                text-red-400/85 border border-red-400/30 bg-red-400/[0.04]
                hover:bg-red-400/10 hover:border-red-400/55 hover:text-red-300
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-colors duration-200 cursor-clicker
              "
            >
              {unlinking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link2Off className="w-3.5 h-3.5" />
              )}
              {unlinking ? "UNLINKING…" : "UNLINK"}
            </button>
          )}
        </div>
      </form>

      <p className="text-[10px] font-mono tracking-[0.18em] uppercase text-flash/30 leading-relaxed">
        Edits your own profile row only — no other user is affected. The puuid
        is resolved live from the box (api2), so this works without a local
        backend. Use for local dev / preview.
      </p>
    </div>
  );
}
