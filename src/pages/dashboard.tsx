import { supabase } from "@/lib/supabaseClient"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/navbar";
import { PremiumAvatarUploader } from "@/components/profileavataruploader";
import { Label } from "@/components/ui/label";
import { useChampionPicker } from "@/context/championpickercontext";
export default function DashboardPage() {
  const navigate = useNavigate()
  const { pickerMode, setPickerMode } = useChampionPicker();

  const handleLogout = async () => {
  await supabase.auth.signOut()
  
  toast.custom((t) => (
    <div className="relative" style={{ perspective: "1000px" }}>
      <div
        className="relative bg-[#040A0C] text-[#00d992] font-mono shadow-lg rounded-md px-6 py-4 w-[320px] 
                   border border-[#00d992]/30 backdrop-blur-sm transform-gpu transition-transform duration-300
                   before:absolute before:top-0 before:left-0 before:w-3 before:h-3 before:border-t-2 before:border-l-2 before:border-[#00d992]
                   after:absolute after:top-0 after:right-0 after:border-t-2 after:border-r-2 after:border-[#00d992]"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(-25deg) translateZ(20px)",
          boxShadow: "0 0 20px rgba(0, 217, 146, 0.3), inset 0 1px 0 rgba(0, 217, 146, 0.1)",
        }}
      >
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#00d992]"></div>
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#00d992]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00d992]/5 to-transparent animate-pulse"></div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="flex-1">
            <p className="text-sm font-medium text-[#00d992] mb-1">LOGOUT COMPLETE</p>
            <p className="text-xs text-[#00d992]/60">Session terminated successfully</p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1">
            <div className="w-2 h-2 bg-[#00d992] rounded-full animate-pulse"></div>
            <span className="text-xs text-[#00d992]/80">SYS</span>
          </div>
        </div>
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


