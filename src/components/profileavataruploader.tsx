import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";
import { AvatarCropper } from "@/components/avatarcropper";
import { useAuth } from "@/context/authcontext";
import { SettingsCard } from "@/components/ui/settings-card";

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
      <SettingsCard title="Avatar" hint={isPremium ? "◈ PREMIUM" : "◈ FREE TIER"}>
        <div className="flex items-center gap-3.5">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[2px] border border-jade/15 bg-black/30">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <img src={`${cdnBaseUrl()}/img/profileicon/29.png`} alt="" className="h-full w-full object-cover opacity-30" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-flash/85">Custom avatar</div>
            <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-flash/40">
              {isPremium
                ? "Upload an image to personalize your profile."
                : "Upgrade to Premium to customize your avatar."}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={uploading || !avatarUrl}
              className="rounded-[2px] border border-flash/15 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-flash/50 transition-colors hover:bg-flash/5 cursor-clicker disabled:opacity-40 disabled:pointer-events-none"
            >
              RESET
            </button>
            {isPremium ? (
              <label
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[2px] border border-jade/35 bg-jade/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-jade transition-colors hover:bg-jade/20 hover:border-jade/50 cursor-clicker disabled:opacity-50 disabled:pointer-events-none",
                  uploading && "opacity-50 pointer-events-none"
                )}
              >
                {uploading ? "UPLOADING..." : "UPLOAD"}
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
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 rounded-[2px] border border-jade/35 bg-jade/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-jade transition-colors hover:bg-jade/20 hover:border-jade/50 cursor-clicker disabled:opacity-50 disabled:pointer-events-none"
              >
                UPGRADE
              </button>
            )}
          </div>
        </div>
      </SettingsCard>

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
