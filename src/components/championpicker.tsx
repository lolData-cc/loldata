import { useState, useMemo, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"
import { champPath, champDisplayName } from "@/config"

type Champion = {
  id: string
  name: string
}

export function ChampionPicker({
  champions,
  onSelect,
  selectedChampion = null,
  triggerLabel = "CHAMPION",
  triggerClassName,
}: {
  champions: Champion[]
  onSelect: (championId: string | null) => void
  selectedChampion?: string | null
  triggerLabel?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = search.trim()
  const hasQuery = trimmed.length >= 2

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase()
    if (q.length < 2) return []
    return champions.filter((c) => {
      const name = (c.name ?? "").toLowerCase()
      const id = (c.id ?? "").toLowerCase()
      const display = champDisplayName(c.name).toLowerCase()
      return name.includes(q) || id.includes(q) || display.includes(q)
    })
  }, [champions, trimmed])

  const handleClear = () => {
    setSearch("")
    onSelect(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) setSearch("")
      }}
    >
      <DialogTrigger className={cn(
        "flex items-center space-x-2 hover:text-gray-300 transition-colors text-sm font-thin tracking-wide cursor-clicker h-full",
        triggerClassName
      )}>
        {selectedChampion ? (
          <>
            <img
              src={`${champPath}/${selectedChampion}.png`}
              alt={selectedChampion}
              className="w-4 h-4 rounded-sm"
              draggable={false}
            />
            <span className="text-jade/80">{selectedChampion.toUpperCase()}</span>
          </>
        ) : (
          <span>{triggerLabel}</span>
        )}
      </DialogTrigger>

      <DialogContent className="w-full max-w-[520px] bg-transparent shadow-none border-none flex flex-col items-center [&>button]:hidden">
        <div className="w-full relative">
          <div
            className={cn(
              "relative overflow-hidden rounded-md",
              "bg-black/60 backdrop-blur-xl saturate-150",
              "shadow-[0_10px_30px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_rgba(255,255,255,0.08)]"
            )}
          >
            <BorderBeam duration={8} size={120} />


            <div className="relative z-10 px-5 py-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-jade rounded-full" />
                  <span className="text-[11px] font-jetbrains text-flash/50 tracking-[0.2em] uppercase">
                    Champion Filter
                  </span>
                </div>
                <button
                  type="button"
                  className={cn(
                    "text-[9px] font-jetbrains uppercase tracking-[0.2em] cursor-clicker",
                    "px-2 py-0.5 border border-white/[0.06] rounded-sm",
                    "text-flash/30 hover:text-jade hover:border-jade/30 hover:bg-jade/5",
                    "transition-all duration-150"
                  )}
                  onClick={handleClear}
                >
                  Clear
                </button>
              </div>

              {/* Search input */}
              <div className="relative mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search champion..."
                  className={cn(
                    "w-full bg-white/[0.03] border border-white/[0.06] rounded-sm",
                    "px-3 py-2 text-[13px] font-jetbrains text-flash placeholder:text-flash/20",
                    "focus:outline-none focus:border-jade/30",
                    "transition-colors"
                  )}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {/* Animated underline */}
                <div className={cn(
                  "absolute bottom-0 left-0 h-[1px] bg-jade/50 transition-all duration-300",
                  search.length > 0 ? "w-full" : "w-0"
                )} />
              </div>

              {/* Results */}
              <div className="h-[180px] overflow-y-auto overscroll-none pr-1 cyber-scrollbar">
                {!hasQuery ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    {/* Scanning hex icon */}
                    <svg width="36" height="36" viewBox="0 0 36 36" className="opacity-20">
                      <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill="none" stroke="#00d992" strokeWidth="1" />
                      <polygon points="18,8 26,12.5 26,23.5 18,28 10,23.5 10,12.5" fill="none" stroke="#00d992" strokeWidth="0.5" strokeDasharray="2 2" />
                      <line x1="18" y1="14" x2="18" y2="22" stroke="#00d992" strokeWidth="1" strokeLinecap="round" />
                      <circle cx="18" cy="12" r="1" fill="#00d992" />
                    </svg>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-jetbrains text-jade/40 uppercase tracking-[0.3em]">
                        Awaiting Input
                      </span>
                      <span className="text-[10px] font-jetbrains text-flash/35">
                        min. 2 characters required
                      </span>
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <svg width="36" height="36" viewBox="0 0 36 36" className="opacity-20">
                      <polygon points="18,2 32,10 32,26 18,34 4,26 4,10" fill="none" stroke="#00d992" strokeWidth="1" />
                      <line x1="12" y1="12" x2="24" y2="24" stroke="#00d992" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="24" y1="12" x2="12" y2="24" stroke="#00d992" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-[10px] font-jetbrains text-flash/25 uppercase tracking-[0.2em]">
                      No match found
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2">
                    {filtered.map((champ) => (
                      <button
                        key={champ.id}
                        type="button"
                        className={cn(
                          "group flex flex-col items-center gap-1.5 py-2 px-1 rounded-sm cursor-clicker",
                          "bg-white/[0.02] border border-transparent",
                          "hover:bg-jade/10 hover:border-jade/20",
                          "transition-all duration-150"
                        )}
                        onClick={() => {
                          onSelect(champ.name)
                          setOpen(false)
                        }}
                      >
                        <div className="relative">
                          <img
                            src={`${champPath}/${champ.name}.png`}
                            alt={champ.name}
                            title={champ.name}
                            className="w-11 h-11 rounded-sm transition-transform duration-150 group-hover:scale-105 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)]"
                          />
                        </div>
                        <span className="text-[9px] font-jetbrains text-flash/40 group-hover:text-jade/80 truncate max-w-[60px] transition-colors">
                          {champDisplayName(champ.name)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
