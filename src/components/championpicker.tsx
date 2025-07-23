import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

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
  const [search, setSearch] = useState("")

  const filtered = champions.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog>
      <DialogTrigger className="flex items-center space-x-2 hover:text-gray-300 transition-colors text-sm font-medium tracking-wide font-thin">
        <span>CHAMPION</span>
      </DialogTrigger>
      <DialogContent className="bg-[#1f1f1f] max-w-[600px] rounded-xl p-6 border-none">
        <span>CHAMPIONS</span>
        <input
          type="text"
          placeholder="Search champions..."
          className="w-full p-2 rounded-md bg-[#2B2A2B] text-white text-sm mb-4 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-8 gap-3 max-h-[300px] overflow-y-scroll scrollbar-hide pr-0">
          {filtered.map((champ) => (
            <img
              key={champ.id}
              src={`http://cdn.loldata.cc/15.13.1/img/champion/${champ.id}.png`}
              alt={champ.name}
              title={champ.name}
              className="w-10 h-10 rounded-md cursor-pointer hover:scale-110 transition"
              onClick={() => onSelect(champ.id || null)}
            />
          ))}
        </div>

        <button
          onClick={() => onSelect(null)}
          className="text-xs text-gray-400 hover:text-white mt-4"
        >
          Clear filter
        </button>
      </DialogContent>
    </Dialog>
  )
}
