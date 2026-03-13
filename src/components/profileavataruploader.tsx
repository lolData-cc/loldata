import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { cn } from "@/lib/utils";
import { AvatarCropper } from "@/components/avatarcropper";
import { useAuth } from "@/context/authcontext";

const BUCKET = "avatars";

export function PremiumAvatarUploader() {
  const { session, plan, puuid, refreshProfile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null | undefined>(undefined); // undefined = still loading
  const [uploading, setUploading] = useState(false);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  const isPremium = !!plan && plan.toLowerCase() !== "free";
  const profileId = session?.user?.id ?? null;

  // Only fetch avatar_url — plan/puuid already in auth context
  useEffect(() => {
    if (!profileId) return;
    supabase
      .from("profile_players")
      .select("avatar_url")
      .eq("profile_id", profileId)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [profileId]);

  async function uploadBlob(blob: Blob) {
    if (!profileId) return;
    setUploading(true);
    try {
      const fileKey = puuid && puuid.length ? puuid : profileId;
      const path = `${fileKey}.webp`;

      const { error: upErr } = await supabase
        .storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: "image/webp" });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl + `?v=${Date.now()}`;

      const { error: updErr } = await supabase
        .from("profile_players")
        .update({ avatar_url: publicUrl })
        .eq("profile_id", profileId);

      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
      await refreshProfile();
      showCyberToast({
        title: "Avatar updated",
        description: "Your profile avatar has been changed.",
        tag: "OK",
        variant: "status",
      });
    } catch (e: any) {
      console.error(e);
      showCyberToast({
        title: "Upload failed",
        description: e?.message ?? "An error occurred",
        tag: "ERR",
        variant: "error",
      });
    } finally {
      setUploading(false);
      setFileToCrop(null);
    }
  }

  async function handleReset() {
    if (!profileId) return;
    const fileKey = puuid && puuid.length > 0 ? puuid : profileId;
    const path = `${fileKey}.webp`;

    try {
      const { error: delErr } = await supabase.storage.from("avatars").remove([path]);
      if (delErr && !delErr.message?.toLowerCase().includes("not found")) throw delErr;

      const { error: updErr } = await supabase
        .from("profile_players")
        .update({ avatar_url: null })
        .eq("profile_id", profileId);

      if (updErr) throw updErr;

      setAvatarUrl(null);
      await refreshProfile();
      showCyberToast({
        title: "Avatar reset",
        description: "Reverted to default avatar.",
        tag: "OK",
        variant: "status",
      });
    } catch (e: any) {
      console.error(e);
      showCyberToast({
        title: "Reset failed",
        description: e?.message ?? "Error removing your avatar.",
        tag: "ERR",
        variant: "error",
      });
    }
  }

  return (
    <>
      <div className="relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden">
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
        {/* HUD bracket corners */}
        <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
        {/* Bottom gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />

        <div className="relative z-[2] px-4 py-3 pl-5">
          <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mb-3">
            :: AVATAR ::
          </p>

          <div className="flex gap-4 items-start">
            {/* Avatar preview */}
            {avatarUrl !== undefined && (
              <div className="w-16 h-16 rounded-[2px] overflow-hidden border border-jade/15 bg-black/30 shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-flash/30 font-mono">
                    N/A
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="text-flash/80 text-sm font-medium">
                {isPremium ? "◈ Customize Your Avatar" : "◈ Upgrade to Customize"}
              </h4>
              <p className="text-flash/40 text-xs">
                {isPremium
                  ? "Upload a custom image to make your profile truly yours."
                  : "Unlock avatar customization with a Premium plan."}
              </p>
            </div>

            {/* Status badge */}
            <div className="text-right shrink-0">
              {isPremium ? (
                <span className="text-[9px] uppercase tracking-[0.2em] text-jade/60 font-mono">◈ PREMIUM</span>
              ) : (
                <span className="text-[9px] uppercase tracking-[0.2em] text-flash/30 font-mono">FREE</span>
              )}
            </div>
          </div>

          <div className="my-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={uploading || !avatarUrl}
              title={avatarUrl ? "Reset to Riot avatar" : "No custom avatar"}
              className="px-2 py-1 rounded-[2px] border border-flash/15 hover:bg-flash/5 text-[11px] tracking-[0.1em] uppercase text-flash/50 cursor-clicker transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              RESET
            </button>

            {isPremium ? (
              <label
                className={cn(
                  "px-2 py-1 rounded-[2px] cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-[11px] tracking-[0.1em] uppercase transition-colors inline-flex items-center gap-1",
                  uploading && "opacity-60 pointer-events-none"
                )}
              >
                {uploading ? "UPLOADING..." : "◈ UPLOAD"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!f.type.startsWith("image/"))
                      return showCyberToast({
                        title: "Invalid file",
                        description: "Select an image file.",
                        tag: "ERR",
                        variant: "error",
                      });
                    if (f.size > 5 * 1024 * 1024)
                      return showCyberToast({
                        title: "File too large",
                        description: "Maximum file size is 5 MB.",
                        tag: "ERR",
                        variant: "error",
                      });
                    setFileToCrop(f);
                  }}
                />
              </label>
            ) : (
              <span className="text-[10px] text-flash/30 font-mono tracking-[0.1em] self-center">
                PREMIUM REQUIRED
              </span>
            )}
          </div>
        </div>
      </div>

      {fileToCrop && (
        <AvatarCropper
          file={fileToCrop}
          onCancel={() => setFileToCrop(null)}
          onCropped={(blob) => uploadBlob(blob)}
        />
      )}
    </>
  );
}
