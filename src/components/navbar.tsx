import { ChevronDown } from "lucide-react"
import { SearchDialog } from "@/components/searchdialog"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"

export function Navbar() {
  const [open, setOpen] = useState(false)

  // Apre il search dialog con Ctrl + K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="text-white py-4">
      <div className="flex items-center w-full px-8" style={{ justifyContent: "space-between", gap: "8rem" }}>
        {/* Logo (sx) */}
        <div className="flex items-center gap-2">
          <Link to="/" className="text-xl font-mono tracking-wide hover:underline">
            LolData
          </Link>
        </div>

        {/* Menu (centro) */}
        <div className="flex gap-8 text-sm">
          <MenuItem label="CHAMPIONS" />
          <MenuItem label="LEADERBOARD" />
          <MenuItem label="TIER LISTS" />
          <MenuItem label="LEARN" />
        </div>

        {/* Search (dx) */}
        <div className="flex">
          <SearchDialog open={open} onOpenChange={setOpen} />
        </div>
      </div>
    </div>
  )
}

function MenuItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-xs cursor-pointer hover:bg-[#20292A] transition-colors duration-150 group">
      <span className="text-[#BFC5C6]">{label}</span>
      <ChevronDown className="w-4 h-4 text-[#84898A] transition-transform group-hover:rotate-180" />
    </div>
  )
}
