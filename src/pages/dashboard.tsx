import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useNavigate } from "react-router-dom"
import { toast, Toaster } from "sonner"
import { Check } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { PremiumAvatarUploader } from "@/components/profileavataruploader";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useChampionPicker } from "@/context/championpickercontext";
export default function DashboardPage() {
  const navigate = useNavigate()
  const { pickerMode, setPickerMode } = useChampionPicker();

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.custom((t) => (
      <div className="bg-[#162322] text-flash font-jetbrains border border-jade shadow-md rounded-[3px] px-6 py-3 w-full flex items-start gap-3 relative">
        <button className="text-flash/40 hover:text-flash absolute left-4 top-4 text-sm" onClick={() => toast.dismiss(t)}>
          <Check className="w-3 h-3 text-black bg-jade rounded-[100px]" />
        </button>
        <div className="pl-4 w-[300px]">
          <p className="text-md text-jade font-jetbrains">Logout</p>
          <p className="text-sm text-jade/50">You succesfully logged out</p>
        </div>
      </div>
    ), { duration: 3000 })
    navigate("/")
  }

  return (
    <div className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen grid grid-rows-[auto,1fr] overflow-hidden">
      {/* riga 1: navbar */}
      <div className="w-full">
        <div className="xl:w-[65%] w-full mx-auto">
          <Navbar />
          <Separator className="bg-flash/20 mt-0 w-full" />
        </div>
      </div>

      {/* riga 2: contenuto; deve poter contrarsi => min-h-0 */}
      <div className="w-full min-h-0">
        <div className="xl:w-[65%] w-full mx-auto px-4 h-full min-h-0">
          <div className="flex w-full h-full min-h-0">
            {/* 20%: sidebar (niente scroll qui) */}
            <div className="w-[20%] border-r border-flash/10 h-full overflow-hidden">
              <div className="text-center font-sourcecode font-extralight text-flash/30 text-[14px]">
                DASHBOARD
              </div>
            </div>

            {/* 70%: SOLO questo scrolla */}
            <div className="w-[70%] h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain touch-pan-y scrollbar-hide">
              <div onClick={handleLogout}>LOGOUT</div>

              <div className="flex flex-col gap-8 p-4 px-6">
                <div className="space-y-3">
                  <h3 className="text-flash/60">PROFILE AVATAR</h3>
                  <PremiumAvatarUploader />
                </div>

<p className="text-xs text-flash/50">
  Mode attuale: <span className="font-semibold">{pickerMode}</span>
</p>

                {/* ⬇️ QUI DENTRO: CHAMPION PICKER */}
                <div className="space-y-3">
                  <h3 className="text-flash/60">CHAMPION PICKER</h3>
                  <div className="flex items-center justify-between rounded-md border border-flash/10 bg-neutral-950/60 p-4">
  <div className="space-y-1">
    <Label className="text-flash">Champion picker UI</Label>
    <p className="text-xs text-flash/50">
      Scegli tra Sheet (shadcn) e Radial dock.
    </p>
  </div>

  <div className="flex gap-2">
    <button
      type="button"
      onClick={() => setPickerMode("sheet")}
      className={`px-3 py-1.5 rounded border ${
        pickerMode === "sheet"
          ? "bg-jade text-liquirice border-jade"
          : "bg-transparent text-flash/80 border-flash/20 hover:border-flash/40"
      }`}
    >
      Sheet
    </button>
    <button
      type="button"
      onClick={() => setPickerMode("radial")}
      className={`px-3 py-1.5 rounded border ${
        pickerMode === "radial"
          ? "bg-jade text-liquirice border-jade"
          : "bg-transparent text-flash/80 border-flash/20 hover:border-flash/40"
      }`}
    >
      Radial
    </button>
  </div>
</div>

                </div>
              </div>
            </div>

            {/* opzionale: il 10% restante */}
            <div className="flex-1 h-full overflow-hidden" />
          </div>
        </div>
      </div>
    </div>
  )
}


