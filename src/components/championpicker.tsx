import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { BorderBeam } from "@/components/ui/border-beam"
import { cn } from "@/lib/utils"
import { champPath } from "@/config"

type Champion = {
  id: string
  name: string
}

export function ChampionPicker({
  champions,
  onSelect,
}: {
  champions: Champion[]
  onSelect: (championId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const trimmed = search.trim()
  const hasQuery = trimmed.length >= 2

  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase()
    if (q.length < 2) return []           // niente risultati finché non ci sono 2+ lettere

    return champions.filter((c) => {
      const name = (c.name ?? "").toLowerCase()
      const id = (c.id ?? "").toLowerCase()
      return name.includes(q) || id.includes(q)
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
      <DialogTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors text-sm font-thin tracking-wide cursor-clicker">
        <span>CHAMPION</span>
      </DialogTrigger>

      <DialogContent className="w-full max-w-[640px] bg-transparent shadow-none border-none flex flex-col items-center [&>button]:hidden">
        <div className="w-full relative">
          <div
            className={cn(
              "relative bg-liquirice/90 border border-flash/10",
              "px-5 py-4 rounded-md overflow-hidden"
            )}
          >
            <BorderBeam duration={8} size={120} />

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-jetbrains text-flash/70 tracking-[0.2em]">
                CHAMPION FILTER
              </span>
              <button
                type="button"
                className="text-[11px] text-flash/50 hover:text-flash/80 cursor-clicker"
                onClick={handleClear}
              >
                CLEAR FILTER
              </button>
            </div>

            <Input
              autoFocus
              type="text"
              placeholder="Type a champion name (e.g. Ahri, Aatrox...)"
              className="bg-black/20 border border-flash/10 hover:border-flash/20 focus:outline-none focus:ring-1 focus:ring-flash/20 rounded text-flash placeholder:text-flash/20 text-sm mb-4"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* altezza fissa, niente overscroll che trascina il body */}
            <div className="h-[150px] overflow-y-auto pr-1 overscroll-none">
              {!hasQuery ? (
                <div className="text-xs text-flash/40 text-center py-6">
                  Type at least 2 characters to see the champions.
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-xs text-flash/40 text-center py-6">
                  No champion found.
                </div>
                ) : (
                  <div className="grid grid-cols-8 gap-3">
                    {filtered.map((champ) => (
                      <div className="bg-jade/10 px-2 py-1 rounded-[3px]">
                        <button
                          key={champ.id}
                          type="button"
                          className="flex flex-col items-center gap-1 group cursor-clicker"
                          onClick={() => {
                            onSelect(champ.name) // championName usato nei match
                            setOpen(false)
                          }}
                        >
                          <img
                            src={`${champPath}/${champ.name}.png`}
                            alt={champ.name}
                            title={champ.name}
                            className="w-10 h-10 rounded-md transition-transform group-hover:scale-110"
                          />
                          <span className="text-[10px] text-flash/60 truncate max-w-[64px]">
                            {champ.name}
                          </span>
                        </button>
                      </div>

                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
