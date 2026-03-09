import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AvatarCropper } from "@/components/avatarcropper";
import { useAuth } from "@/context/authcontext";

const BUCKET = "avatars";

export function PremiumAvatarUploader() {
  const { session, plan, puuid } = useAuth();
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
      toast.success("Avatar updated!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload failed");
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
      toast.success("Avatar reset!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error removing your avatar.");
    }
  }

  return (
    <div className="border border-flash/10 rounded-md p-4 bg-cement">
      <div className="flex gap-4 justify-between">
        <div>
          {isPremium ? (
            <div>
              <h4 className="text-flash/40">Customize Your Avatar</h4>
              <span className="text-flash/80 text-sm">
                Upload a custom image to make your profile truly yours.
              </span>
            </div>
          ) : (
            <div>
              <h4 className="text-flash/40">Upgrade to Customize</h4>
              <span className="text-flash/80 text-sm">
                Unlock avatar customization and stand out from the crowd with a Premium plan.
              </span>
            </div>
          )}
        </div>

        {/* Avatar preview */}
        <div className="w-20 h-20 rounded-xl overflow-hidden border border-flash/10 bg-black/30 shrink-0">
          {avatarUrl === undefined ? (
            // Skeleton while avatar_url is fetching
            <div className="w-full h-full animate-pulse bg-flash/5" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-flash/40">
              no avatar
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-flash/20 gap-3 pt-2 mt-2 -mb-2">
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-sm cursor-clicker"
          disabled={uploading || !avatarUrl}
          title={avatarUrl ? "Reset to Riot avatar" : "No custom avatar"}
        >
          RESET
        </button>

        {isPremium ? (
          <div className="flex items-center gap-2">
            <label className={cn(
              "px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-sm",
              uploading && "opacity-60 pointer-events-none"
            )}>
              {uploading ? "Uploading..." : "UPLOAD"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (!f.type.startsWith("image/")) return toast.error("Select an image");
                  if (f.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
                  setFileToCrop(f);
                }}
              />
            </label>
          </div>
        ) : (
          <div className="text-xs text-flash/50">Premium required for custom avatar.</div>
        )}
      </div>

      {fileToCrop && (
        <AvatarCropper
          file={fileToCrop}
          onCancel={() => setFileToCrop(null)}
          onCropped={(blob) => uploadBlob(blob)}
        />
      )}
    </div>
  );
}
