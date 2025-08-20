import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { SearchDialog } from "@/components/searchdialog"
import { UserDialog } from "@/components/userdialog"
import { useAuth } from "@/context/authcontext"
import { useChampionPicker } from "@/context/championpickercontext"
import { Bell, Menu, Search as SearchIcon } from "lucide-react"

declare const gtag: (...args: any[]) => void;

export function Navbar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { nametag, region } = useAuth()
  const { openPicker } = useChampionPicker()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        const newState = !open
        setOpen(newState)
        if (!open) {
          gtag?.('event', 'open_search_dialog', {
            event_category: 'interaction',
            event_label: 'Navbar Shortcut',
          })
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        if (nametag && region) {
          const slug = nametag.replace("#", "-")
          navigate(`/summoners/${region}/${slug}`)
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault()
        openPicker()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, nametag, region, navigate, openPicker])

  return (
    <div
      className="
    flex items-center w-full h-16 z-50
    px-3 sm:px-4
    md:px-4 md:py-2
    border-b border-flash/20 md:border-0
    justify-between
    fixed top-0 left-0 md:static
    bg-[#040A0C]/80 backdrop-blur-md md:bg-transparent
  "
    >
      {/* SX */}
      <div className="flex-shrink-0">
        {/* mobile: toast button */}

          <div className="p-1.5 text-flash/90 rounded-sm border border-flash/10 md:hidden">
            <Menu className="w-3 h-3 cursor-clicker "/>
          </div>


        {/* desktop: logo */}
        <Link to="/" className="hidden md:block cursor-clicker">
          <img src="/typelogo.png" className="w-24 h-22" alt="Logo" />
        </Link>
      </div>

      {/* CENTRO (desktop) */}
      <div className="hidden md:flex flex-1 justify-center space-x-6 text-sm font-jetbrains">
        <button
          type="button"
          className="flex-shrink-0"
          onClick={(e) => {
            e.preventDefault()
            openPicker()
          }}
        >
          <MenuItem label="CHAMPIONS" />
        </button>

        <MenuItem label="LEADERBOARD" />
        <MenuItem label="TIER LISTS" />

        <Link to="/learn" className="flex-shrink-0">
          <MenuItem label="LEARN" />
        </Link>
      </div>

      {/* DX */}
      <div className="flex-shrink-0 flex items-center">
        {/* mobile search icon */}
        <Link to="/" className="md:hidden">
          <img src="/typelogo.png" className="w-24 h-22 cursor-clicker" alt="Logo" />
        </Link>

        {/* desktop search + user */}
        <div className="hidden md:flex space-x-2 items-center text-[12px]">
          <SearchDialog open={open} onOpenChange={setOpen} />
          <UserDialog />
        </div>
      </div>

      {/* SearchDialog per mobile */}
      <div className="md:hidden">
        <SearchDialog open={open} onOpenChange={setOpen} />
      </div>
    </div>
  )
}

function MenuItem({ label }: { label: string }) {
  return (
    <div className="flex items-center px-3 py-1 rounded cursor-clicker hover:bg-flash/5 text-flash/70 hover:text-flash transition-colors duration-150">
      <div>{label}</div>
    </div>
  )
}
