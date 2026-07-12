// ImprovementTreePage — the 3D skill tree as its own full-screen route
// (/learn/tree). Lives in the LEARN menu under Explorer. Full-bleed so the
// floating tree gets the whole stage; controls align to the content column.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { HelpCircle } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { DiamondButton } from "@/components/ui/diamond-button"
import { useAuth } from "@/context/authcontext"
import ImprovementTree from "@/components/learn/improvement/ImprovementTree"
import { ImprovementTutorial } from "@/components/learn/improvement/ImprovementTutorial"

const EASE = [0.22, 1, 0.36, 1] as const

export default function ImprovementTreePage() {
  const { puuid, region, nametag } = useAuth()
  const navigate = useNavigate()
  const [tutorialOpen, setTutorialOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen flex flex-col overflow-hidden"
    >
      <div className="w-full flex justify-center">
        <div className="w-full lg:w-[65%]"><Navbar /></div>
      </div>

      <div className="relative flex-1 min-h-0 w-full pt-16 md:pt-4 pb-2 overflow-hidden">
        {/* Explorer-style dots grid, full-bleed behind the floating tree */}
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(0,217,146,0.12) 1.4px, transparent 1.4px)", backgroundSize: "24px 24px" }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(58%_58%_at_50%_46%,rgba(0,217,146,0.07),transparent_72%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_55%,rgba(4,10,12,0.55))]" />

        <div className="relative z-10 h-full">
          <ImprovementTree puuid={puuid ?? null} region={region ?? null} nametag={nametag ?? null} />
        </div>

        {/* floating controls — aligned to the content column (65% lock), like the Explorer */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="relative h-full w-full lg:w-[65%] mx-auto px-3 lg:px-0">
            {/* back — diamond, center-left (desktop only; on phone you use the navbar) */}
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto">
              <DiamondButton icon="back" onClick={() => navigate("/learn")} aria-label="Back to Learn" />
            </div>
            {/* what's this? — tutorial, bottom-left, same chrome as the Explorer */}
            <div className="absolute bottom-4 left-0 pointer-events-auto">
              <div className="rounded-[7px] border border-hairline/10 bg-[rgba(8,14,16,0.8)] backdrop-blur-md p-1 shadow-[0_6px_18px_rgba(var(--c-shadow),0.4)]">
                <button onClick={() => setTutorialOpen(true)} aria-label="What's this?" title="What's this?"
                  className="grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker">
                  <HelpCircle size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ImprovementTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </motion.div>
  )
}
