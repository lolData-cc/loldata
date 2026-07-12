import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons"

const EASE = [0.22, 1, 0.36, 1] as const

const PATHS = [
  { role: "TOP", name: "Top", Icon: RoleTopIcon, live: false },
  { role: "JUNGLE", name: "Jungle", Icon: RoleJungleIcon, live: true },
  { role: "MID", name: "Mid", Icon: RoleMidIcon, live: false },
  { role: "ADC", name: "ADC", Icon: RoleAdcIcon, live: false },
  { role: "SUPPORT", name: "Support", Icon: RoleSupportIcon, live: false },
]

export function PathSelection({ onChoose }: { onChoose: (role: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="text-center mb-9">
        <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-jade/55">Choose your path</span>
        <h2 className="font-chakrapetch font-bold text-[24px] md:text-[30px] text-flash/95 leading-tight mt-1.5">Improvement Tree</h2>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 w-full max-w-[840px]">
        {PATHS.map((p, i) => {
          const Icon = p.Icon
          return (
            <motion.button
              key={p.role}
              type="button"
              disabled={!p.live}
              onClick={() => p.live && onChoose(p.role)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.05, duration: 0.4, ease: EASE }}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-3 rounded-lg py-7 px-3 transition-all duration-250",
                p.live
                  ? "cursor-clicker bg-[linear-gradient(158deg,rgba(0,217,146,0.09)_0%,rgba(6,14,16,0.6)_40%,rgba(2,6,8,0.66)_100%)] shadow-[0_16px_40px_-12px_rgba(var(--c-shadow),0.7),0_0_0_1px_rgba(0,217,146,0.32),0_0_26px_-10px_rgba(0,217,146,0.4)] hover:shadow-[0_18px_46px_-8px_rgba(var(--c-shadow),0.75),0_0_0_1px_rgba(0,217,146,0.6),0_0_40px_-8px_rgba(0,217,146,0.55)] hover:-translate-y-0.5"
                  : "cursor-default bg-filmdark/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] opacity-45"
              )}
            >
              <Icon className={cn("h-10 w-10 transition-colors", p.live ? "text-jade drop-shadow-[0_0_10px_rgba(0,217,146,0.45)]" : "text-flash/45")} />
              <span className={cn("font-chakrapetch font-bold text-[13px] uppercase tracking-[0.14em]", p.live ? "text-flash/95" : "text-flash/55")}>{p.name}</span>
              {!p.live && <span className="absolute top-2 right-2 font-mono text-[7.5px] tracking-[0.16em] uppercase text-flash/30">soon</span>}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
