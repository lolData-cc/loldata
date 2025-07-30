import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { SearchDialog } from "@/components/searchdialog"
import { UserDialog } from "@/components/userdialog"

declare const gtag: (...args: any[]) => void;
export function Navbar() {
  const [open, setOpen] = useState(false)



  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const newState = !open;
        setOpen(newState);

        if (!open) {
          gtag('event', 'open_search_dialog', {
            event_category: 'interaction',
            event_label: 'Navbar Shortcut',
          });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Apre il search dialog con Ctrl + K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(!open)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <div className="flex items-center w-full py-2 px-4 justify-between h-16 z-20">

      {/* Logo (sx) */}
      <div className="flex-shrink-0">
        <Link to="/" className="flex-shrink-0">
          <img src="/typelogo.png" className="w-28 h-22 cursor-clicker" alt="Logo" />
        </Link>
      </div>

      {/* Menu (centro) */}
      <div className="flex-1 flex justify-center space-x-6 text-sm">
        <MenuItem label="CHAMPIONS" />
        <MenuItem label="LEADERBOARD" />
        <MenuItem label="TIER LISTS" />
        <Link to="/learn" className="flex-shrink-0">
          <MenuItem label="LEARN" />
        </Link>
        
      </div>

      {/* Search (dx) */}
      <div className="flex-shrink-0 flex space-x-2 items-center text-[12px]">
        <SearchDialog open={open} onOpenChange={setOpen} />
        <UserDialog />
      </div>

    </div>
  );

}

function MenuItem({ label }: { label: string }) {
  return (
    <div className="flex items-center px-3 py-1 rounded cursor-pointer hover:bg-flash/5 text-flash/40 hover:text-flash transition-colors duration-150">
      <div >{label}</div>
      {/* <ChevronDown className="w-4 h-4 text-[#84898A] transition-transform group-hover:rotate-180" /> */}
    </div>
  )
}
