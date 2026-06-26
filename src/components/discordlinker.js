"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
export function DiscordLinker() {
    const [authUser, setAuthUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [linking, setLinking] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [connectingOAuth, setConnectingOAuth] = useState(false);
    const [avatarBroken, setAvatarBroken] = useState(false);
    // ===== INIT: user + profile_players + avatar sync =====
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
                    .select("profile_id, player_id, discord_id, discord_username, discord_avatar_url")
                    .eq("profile_id", auth.user.id)
                    .maybeSingle();
                if (error) {
                    console.warn("profile_players discord load error:", error.message);
                }
                if (data)
                    setProfile(data);
                // ── Auto-sync Discord avatar from identity if it changed ──
                // The Discord identity in auth.user.identities gets refreshed on login,
                // so if the user changed their Discord avatar, the identity has the fresh URL
                // while profile_players still has the stale one.
                if (data?.discord_id) {
                    const freshInfo = extractDiscordFromUser(auth.user);
                    if (freshInfo?.avatarUrl && freshInfo.avatarUrl !== data.discord_avatar_url) {
                        // Silently update DB + metadata with the fresh avatar URL
                        await supabase
                            .from("profile_players")
                            .update({ discord_avatar_url: freshInfo.avatarUrl })
                            .eq("profile_id", auth.user.id);
                        await supabase.auth.updateUser({
                            data: { discord_avatar_url: freshInfo.avatarUrl },
                        });
                        setProfile((prev) => prev ? { ...prev, discord_avatar_url: freshInfo.avatarUrl } : prev);
                    }
                }
            }
            catch (err) {
                console.error("DiscordLinker init error:", err);
            }
            finally {
                setInitialLoading(false);
            }
        })();
    }, []);
    // ===== helper: estrai info Discord da identity =====
    const extractDiscordFromUser = (user) => {
        if (!user?.identities)
            return null;
        const discordIdentity = user.identities.find((id) => id.provider === "discord");
        if (!discordIdentity?.identity_data)
            return null;
        const data = discordIdentity.identity_data;
        const id = data.id || data.user_id || data.sub || null;
        if (!id)
            return null;
        const username = data.username ||
            data.global_name ||
            data.full_name ||
            data.name ||
            null;
        const avatarUrl = data.avatar_url ||
            data.picture ||
            (data.avatar &&
                `https://cdn.discordapp.com/avatars/${id}/${data.avatar}.png`) ||
            null;
        return { id, username, avatarUrl };
    };
    const metadata = authUser?.user_metadata ?? {};
    const discordFromMetadata = metadata.discord_id
        ? {
            id: metadata.discord_id,
            username: metadata.discord_username ?? null,
            avatarUrl: metadata.discord_avatar_url ?? null,
        }
        : null;
    const discordFromIdentity = authUser
        ? extractDiscordFromUser(authUser)
        : null;
    // 🔑 Fonte verità: se profile ha discord_id uso quello, altrimenti metadata
    const linkedDiscordId = profile?.discord_id ?? discordFromMetadata?.id ?? null;
    const isLinked = !!linkedDiscordId;
    // Info da mostrare: ordine profile -> metadata -> identity
    const effectiveDiscord = (profile?.discord_id && {
        id: profile.discord_id,
        username: profile.discord_username,
        avatarUrl: profile.discord_avatar_url,
    }) ||
        discordFromMetadata ||
        discordFromIdentity;
    // ===== OAuth Connect (quando non c'è identity Discord) =====
    const handleConnectDiscordOAuth = useCallback(async () => {
        if (connectingOAuth)
            return;
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
        }
        catch (err) {
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
        if (linking)
            return;
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
            const { data: updatedUser, error: metaErr } = await supabase.auth.updateUser({
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
            }
            else {
                setAuthUser((prev) => prev
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
                    : prev);
            }
            setProfile((prev) => prev
                ? {
                    ...prev,
                    discord_id: info.id,
                    discord_username: info.username,
                    discord_avatar_url: info.avatarUrl,
                }
                : prev);
            showCyberToast({
                title: "Discord linked",
                description: info.username
                    ? `Connected as ${info.username}.`
                    : "Your Discord account has been linked.",
                variant: "status",
                tag: "OK",
            });
        }
        catch (err) {
            console.error(err);
            showCyberToast({
                title: "Link error",
                description: "Something went wrong while linking your Discord.",
                variant: "error",
                tag: "ERR",
            });
        }
        finally {
            setLinking(false);
        }
    };
    // ===== Unlink: pulisce profile_players (se c'è) + metadata =====
    const handleUnlinkDiscord = async () => {
        if (disconnecting)
            return;
        setDisconnecting(true);
        try {
            const { data: auth } = await supabase.auth.getUser();
            if (!auth?.user)
                return;
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
            const { data: updatedUser, error: metaErr } = await supabase.auth.updateUser({
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
            }
            else {
                setAuthUser((prev) => prev
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
                    : prev);
            }
            setProfile((prev) => prev
                ? {
                    ...prev,
                    discord_id: null,
                    discord_username: null,
                    discord_avatar_url: null,
                }
                : prev);
            showCyberToast({
                title: "Discord unlinked",
                description: "Your Discord account has been disconnected.",
                variant: "status",
                tag: "OK",
            });
        }
        catch (err) {
            console.error(err);
            showCyberToast({
                title: "Unlink error",
                description: "Something went wrong while unlinking Discord.",
                variant: "error",
                tag: "ERR",
            });
        }
        finally {
            setDisconnecting(false);
        }
    };
    const loadingState = initialLoading;
    // ===== UI =====
    return (_jsxs("div", { className: "relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" } }), _jsxs("div", { className: "absolute top-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute top-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute top-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute top-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 left-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" })] }), _jsxs("div", { className: "absolute bottom-0 right-0 w-3 h-3 z-[3]", children: [_jsx("div", { className: "absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" }), _jsx("div", { className: "absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" })] }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" }), _jsx("div", { className: "relative z-[2] px-4 py-3 pl-5", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center", children: [isLinked && effectiveDiscord && (_jsx("div", { className: "w-16 h-16 rounded-[2px] overflow-hidden border border-jade/15 bg-black/30 shrink-0", children: effectiveDiscord.avatarUrl && !avatarBroken ? (_jsx("img", { src: effectiveDiscord.avatarUrl, alt: "Discord avatar", className: "w-full h-full object-cover", onError: () => setAvatarBroken(true) })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center text-[9px] text-flash/30 font-mono", children: "N/A" })) })), _jsxs("div", { className: "w-full sm:flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx("h4", { className: "text-flash/80 text-sm font-medium", children: "Discord" }), loadingState ? (_jsx("span", { className: "text-[9px] uppercase tracking-[0.2em] text-flash/30 font-mono", children: "LOADING\u2026" })) : isLinked ? (_jsx("span", { className: "text-[9px] uppercase tracking-[0.2em] text-jade/60 font-mono", children: "\u25C8 CONNECTED" })) : discordFromIdentity ? (_jsx("span", { className: "text-[9px] uppercase tracking-[0.2em] text-citrine/60 font-mono", children: "READY TO LINK" })) : (_jsx("span", { className: "text-[9px] uppercase tracking-[0.2em] text-flash/30 font-mono", children: "NOT CONNECTED" }))] }), isLinked && effectiveDiscord ? (_jsxs("span", { className: "text-flash/40 text-xs mt-1 block", children: ["Connected as ", _jsx("span", { className: "text-flash/70", children: effectiveDiscord.username ?? "Discord user" })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-flash/40 text-xs mt-1 block", children: "Connect your Discord account to unlock lolData integrations." }), !loadingState && discordFromIdentity && (_jsxs("div", { className: "mt-1.5 inline-flex items-center gap-2 rounded-[2px] border border-citrine/20 px-3 py-1 text-[10px] text-citrine font-mono", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-citrine animate-pulse" }), _jsxs("span", { children: ["Detected ", _jsx("span", { className: "font-semibold", children: discordFromIdentity.username ?? "Discord user" }), " \u2013 ready to link."] })] })), !loadingState && !discordFromIdentity && (_jsxs("div", { className: "mt-1.5 inline-flex items-center gap-2 rounded-[2px] border border-flash/10 px-3 py-1 text-[10px] text-flash/40 font-mono", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-flash/40" }), _jsx("span", { children: "No Discord account linked." })] }))] })), _jsx("div", { className: "my-2 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" }), _jsx("div", { className: "flex justify-end gap-3", children: !loadingState && (_jsx(_Fragment, { children: isLinked ? (_jsx("button", { type: "button", onClick: handleUnlinkDiscord, disabled: disconnecting, className: "px-2 py-1 rounded-[2px] cursor-clicker border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 disabled:opacity-60 disabled:pointer-events-none transition-colors", children: disconnecting ? "UNLINKING…" : "UNLINK" })) : discordFromIdentity ? (_jsx("button", { type: "button", onClick: handleLinkDiscord, disabled: linking, className: "px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-60 disabled:pointer-events-none transition-colors", children: linking ? "LINKING…" : "◈ LINK" })) : (_jsx("button", { type: "button", onClick: handleConnectDiscordOAuth, disabled: connectingOAuth, className: "px-3 py-1 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker disabled:opacity-60 disabled:pointer-events-none transition-colors", children: connectingOAuth ? "CONNECTING…" : "CONNECT DISCORD" })) })) })] })] }) })] }));
}
