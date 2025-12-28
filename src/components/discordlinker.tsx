"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { Separator } from "@/components/ui/separator";

type ProfileRow = {
  profile_id: string;
  player_id: string | null;
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
};

type DiscordInfo = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
};

export function DiscordLinker() {
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectingOAuth, setConnectingOAuth] = useState(false);

  // ===== INIT: user + profile_players =====
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          setInitialLoading(false);
          return;
        }

        setAuthUser(auth.user);

        const { data, error } = await supabase
          .from("profile_players")
          .select(
            "profile_id, player_id, discord_id, discord_username, discord_avatar_url"
          )
          .eq("profile_id", auth.user.id)
          .maybeSingle<ProfileRow>();

        if (error) {
          console.warn("profile_players discord load error:", error.message);
        }

        if (data) setProfile(data);
      } catch (err) {
        console.error("DiscordLinker init error:", err);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // ===== helper: estrai info Discord da identity =====
  const extractDiscordFromUser = (user: any): DiscordInfo | null => {
    if (!user?.identities) return null;
    const discordIdentity = user.identities.find(
      (id: any) => id.provider === "discord"
    );
    if (!discordIdentity?.identity_data) return null;

    const data = discordIdentity.identity_data;

    const id = data.id || data.user_id || data.sub || null;
    if (!id) return null;

    const username =
      data.username ||
      data.global_name ||
      data.full_name ||
      data.name ||
      null;

    const avatarUrl =
      data.avatar_url ||
      data.picture ||
      (data.avatar &&
        `https://cdn.discordapp.com/avatars/${id}/${data.avatar}.png`) ||
      null;

    return { id, username, avatarUrl };
  };

  const metadata = authUser?.user_metadata ?? {};
  const discordFromMetadata: DiscordInfo | null = metadata.discord_id
    ? {
        id: metadata.discord_id,
        username: metadata.discord_username ?? null,
        avatarUrl: metadata.discord_avatar_url ?? null,
      }
    : null;

  const discordFromIdentity: DiscordInfo | null = authUser
    ? extractDiscordFromUser(authUser)
    : null;

  // 🔑 Fonte verità: se profile ha discord_id uso quello, altrimenti metadata
  const linkedDiscordId =
    profile?.discord_id ?? discordFromMetadata?.id ?? null;

  const isLinked = !!linkedDiscordId;

  // Info da mostrare: ordine profile -> metadata -> identity
  const effectiveDiscord: DiscordInfo | null =
    (profile?.discord_id && {
      id: profile.discord_id,
      username: profile.discord_username,
      avatarUrl: profile.discord_avatar_url,
    }) ||
    discordFromMetadata ||
    discordFromIdentity;

  // ===== OAuth Connect (quando non c'è identity Discord) =====
  const handleConnectDiscordOAuth = useCallback(async () => {
    if (connectingOAuth) return;
    setConnectingOAuth(true);

    try {
      if (typeof window === "undefined") {
        throw new Error("Window is undefined in DiscordLinker");
      }

      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/callback`;

      console.log("[DiscordLinker] redirectTo =", redirectTo);

      const { data, error } = await supabase.auth.linkIdentity({
        provider: "discord",
        options: {
          redirectTo,
          scopes: "identify email",
        },
      });

      if (error) {
        console.error("Discord linkIdentity error:", error.message);
        showCyberToast({
          title: "Discord link failed",
          description: error.message,
          variant: "error",
          tag: "AUTH",
        });
        setConnectingOAuth(false);
        return;
      }
      // Supabase gestisce il redirect
    } catch (err: any) {
      console.error(err);
      showCyberToast({
        title: "Discord linking error",
        description: "Something went wrong while linking Discord.",
        variant: "error",
        tag: "ERR",
      });
      setConnectingOAuth(false);
    }
  }, [connectingOAuth]);

  // ===== Link effettivo: UPDATE (se c'è la row) + metadata =====
  const handleLinkDiscord = async () => {
    if (linking) return;
    setLinking(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        showCyberToast({
          title: "Auth error",
          description: "You must be logged in to link Discord.",
          variant: "error",
          tag: "AUTH",
        });
        return;
      }

      const user = auth.user;
      setAuthUser(user); // aggiorno eventuali identities

      const info = extractDiscordFromUser(user);
      if (!info?.id) {
        showCyberToast({
          title: "No Discord account found",
          description: "Connect Discord first, then try linking again.",
          variant: "error",
          tag: "DISC",
        });
        return;
      }

      const now = new Date().toISOString();

      const { error: updErr } = await supabase
        .from("profile_players")
        .update({
          discord_id: info.id,
          discord_username: info.username,
          discord_avatar_url: info.avatarUrl,
        })
        .eq("profile_id", user.id);

      if (updErr) {
        console.warn("profile_players discord update error:", updErr);
      }

      const { data: updatedUser, error: metaErr } =
        await supabase.auth.updateUser({
          data: {
            discord_id: info.id,
            discord_username: info.username,
            discord_avatar_url: info.avatarUrl,
            discord_linked_at: now,
          },
        });

      if (metaErr) {
        console.warn("auth.updateUser discord meta error:", metaErr.message);
      }

      if (updatedUser?.user) {
        setAuthUser(updatedUser.user);
      } else {
        setAuthUser((prev: any) =>
          prev
            ? {
                ...prev,
                user_metadata: {
                  ...(prev.user_metadata ?? {}),
                  discord_id: info.id,
                  discord_username: info.username,
                  discord_avatar_url: info.avatarUrl,
                  discord_linked_at: now,
                },
              }
            : prev
        );
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              discord_id: info.id,
              discord_username: info.username,
              discord_avatar_url: info.avatarUrl,
            }
          : prev
      );

      showCyberToast({
        title: "Discord linked",
        description: info.username
          ? `Connected as ${info.username}.`
          : "Your Discord account has been linked.",
        variant: "status",
        tag: "OK",
      });
    } catch (err: any) {
      console.error(err);
      showCyberToast({
        title: "Link error",
        description: "Something went wrong while linking your Discord.",
        variant: "error",
        tag: "ERR",
      });
    } finally {
      setLinking(false);
    }
  };

  // ===== Unlink: pulisce profile_players (se c'è) + metadata =====
  const handleUnlinkDiscord = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;

      const user = auth.user;

      const { error: updErr } = await supabase
        .from("profile_players")
        .update({
          discord_id: null,
          discord_username: null,
          discord_avatar_url: null,
        })
        .eq("profile_id", user.id);

      if (updErr) {
        console.warn("profile_players discord unlink error:", updErr);
      }

      const { data: updatedUser, error: metaErr } =
        await supabase.auth.updateUser({
          data: {
            discord_id: null,
            discord_username: null,
            discord_avatar_url: null,
            discord_linked_at: null,
          },
        });

      if (metaErr) {
        console.warn("auth.updateUser discord meta error:", metaErr.message);
      }

      if (updatedUser?.user) {
        setAuthUser(updatedUser.user);
      } else {
        setAuthUser((prev: any) =>
          prev
            ? {
                ...prev,
                user_metadata: {
                  ...(prev.user_metadata ?? {}),
                  discord_id: null,
                  discord_username: null,
                  discord_avatar_url: null,
                  discord_linked_at: null,
                },
              }
            : prev
        );
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              discord_id: null,
              discord_username: null,
              discord_avatar_url: null,
            }
          : prev
      );

      showCyberToast({
        title: "Discord unlinked",
        description: "Your Discord account has been disconnected.",
        variant: "status",
        tag: "OK",
      });
    } catch (err: any) {
      console.error(err);
      showCyberToast({
        title: "Unlink error",
        description: "Something went wrong while unlinking Discord.",
        variant: "error",
        tag: "ERR",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const loadingState = initialLoading;

  // ===== UI =====
  return (
    <div className="border border-flash/10 rounded-md p-4 bg-cement">
      {/* Header + stato */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 justify-between">
          <h4 className="text-flash/40">DISCORD PROFILE</h4>

          {loadingState ? (
            <span className="text-[10px] uppercase tracking-[0.15em] text-flash/40">
              LOADING…
            </span>
          ) : isLinked ? (
            <span className="text-[10px] uppercase tracking-[0.15em] text-jade/80">
              CONNECTED
            </span>
          ) : discordFromIdentity ? (
            <span className="text-[10px] uppercase tracking-[0.15em] text-citrine/80">
              READY TO LINK
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.15em] text-flash/50">
              NOT CONNECTED
            </span>
          )}
        </div>

        {isLinked && effectiveDiscord ? (
          // ✅ UI quando Discord è collegato: avatar + username
          <div className="mt-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-flash/20 bg-black/40">
              {effectiveDiscord.avatarUrl ? (
                <img
                  src={effectiveDiscord.avatarUrl}
                  alt="Discord avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-flash/40">
                  no avatar
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-flash text-sm font-semibold">
                {effectiveDiscord.username ?? "Discord user"}
              </span>
              <span className="text-[11px] text-flash/60">
                Connected via Discord
              </span>
            </div>
          </div>
        ) : (
          // 🧩 Stati NON collegati: testo + pill come prima
          <>
            <p className="text-flash/80 text-sm">
              Connect your Discord account to unlock lolData integrations.
            </p>

            {!loadingState && (
              <>
                {discordFromIdentity ? (
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-citrine/40 px-3 py-1 text-xs text-citrine">
                    <span className="w-2 h-2 rounded-full bg-citrine animate-pulse" />
                    <span>
                      Detected Discord account{" "}
                      <span className="font-semibold">
                        {discordFromIdentity.username ?? "Discord user"}
                      </span>{" "}
                      – ready to link.
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-flash/20 px-3 py-1 text-xs text-flash/60">
                    <span className="w-2 h-2 rounded-full bg-flash/40" />
                    <span>No Discord account linked.</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Separator className="mt-4 bg-flash/15" />

      {/* Disclaimer + pulsanti azione */}
      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-[11px] text-flash/45">
          We never see your Discord password. Authorization is handled securely
          by Discord via OAuth.
        </p>

        {!loadingState && (
          <div className="flex gap-2">
            {isLinked ? (
              <button
                type="button"
                onClick={handleUnlinkDiscord}
                disabled={disconnecting}
                className="px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-sm disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center"
              >
                {disconnecting ? "Unlinking…" : "UNLINK DISCORD"}
              </button>
            ) : discordFromIdentity ? (
              <button
                type="button"
                onClick={handleLinkDiscord}
                disabled={linking}
                className="px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-sm disabled:opacity-60 disabled:pointer-events-none inline-flex items-center justify-center"
              >
                {linking ? "Linking…" : "LINK DISCORD"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectDiscordOAuth}
                disabled={connectingOAuth}
                className="px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-xs cursor-clicker disabled:opacity-60 disabled:pointer-events-none"
              >
                {connectingOAuth ? "Opening Discord…" : "Connect Discord"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
