// components/profileavataruploader.tsx (estratto)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AvatarCropper } from "@/components/avatarcropper";
import { Separator } from "./ui/separator";

type ProfileRow = {
  profile_id: string;
  plan: string | null;
  puuid: string | null;
  avatar_url: string | null;
};

const BUCKET = "avatars";

export function PremiumAvatarUploader() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  const isPremium = !!profile && (profile.plan ?? "free").toLowerCase() !== "free";

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data } = await supabase
        .from("profile_players")
        .select("profile_id,plan,puuid,avatar_url")
        .eq("profile_id", auth.user.id)
        .maybeSingle();

      if (data) setProfile(data);
    })();
  }, []);

  async function uploadBlob(blob: Blob) {
    if (!profile) return;

    setLoading(true);
    try {
      const fileKey = profile.puuid && profile.puuid.length ? profile.puuid : profile.profile_id;
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
        .eq("profile_id", profile.profile_id);

      if (updErr) throw updErr;

      setProfile(p => p ? ({ ...p, avatar_url: publicUrl }) : p);
      toast.success("Avatar aggiornato!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload fallito");
    } finally {
      setLoading(false);
      setFileToCrop(null);
    }
  }

async function handleReset() {
    if (!profile) return;

    const fileKey = profile.puuid && profile.puuid.length > 0
      ? profile.puuid
      : profile.profile_id;

    const path = `${fileKey}.webp`;

    try {
      const { error: delErr } = await supabase.storage.from("avatars").remove([path]);
      if (delErr && delErr.message?.toLowerCase().includes("not found") === false) {
        throw delErr;
      }

      const { error: updErr } = await supabase
        .from("profile_players")
        .update({ avatar_url: null })
        .eq("profile_id", profile.profile_id);

      if (updErr) throw updErr;

      // 3) aggiorna stato UI
      setProfile(p => p ? { ...p, avatar_url: null } : p);
      toast.success("Avatar resettato!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error removing your avatar.");
    }
  }

  if (!profile) return null;

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
        <div className="w-20 h-20 rounded-xl overflow-hidden border border-flash/10 bg-black/30">


          {profile?.avatar_url ? (
            <div className="">

              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            </div>

         ) : (
           <div className="w-full h-full flex items-center justify-center text-xs text-flash/40">
             no avatar
           </div>
         )}


       </div>

        
     </div>
     <div className="flex justify-end border-t border-flash/20 gap-4 pt-2 mt-2 -mb-2">
       <button
         type="button"
         onClick={handleReset}
         className="px-3 py-1 rounded-sm border border-flash/20 hover:bg-flash/10 text-sm cursor-clicker"
         disabled={loading || !profile?.avatar_url}
         title={profile?.avatar_url ? "Ripristina avatar Riot" : "Nessun avatar custom"}
       >
         RESET
       </button>
       {isPremium ? (
         <div className="flex items-center gap-2">
           {/* Upload */}
           <label className={cn(
             "px-2 py-1 rounded-sm cursor-clicker border border-jade/30 text-jade hover:bg-jade/10 text-sm",
             loading && "opacity-60 pointer-events-none"
           )}>
             {loading ? "Uploading..." : "UPLOAD"}
             <input
               type="file"
               accept="image/*"
               className="hidden"
               onChange={(e) => {
                 const f = e.target.files?.[0];
                 if (!f) return;
                 if (!f.type.startsWith("image/")) return toast.error("Seleziona un'immagine");
                 if (f.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
                 setFileToCrop(f);
               }}
             />
           </label>

           {/* Reset */}

         </div>
       ) : (
         <div className="text-xs text-flash/50">Premium required per avatar custom.</div>
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