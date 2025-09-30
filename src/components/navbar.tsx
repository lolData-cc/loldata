// Navbar.tsx
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { SearchDialog } from "@/components/searchdialog"
import { UserDialog } from "@/components/userdialog"
import { useAuth } from "@/context/authcontext"
import { useChampionPicker } from "@/context/championpickercontext"
import { Menu } from "lucide-react"

declare const gtag: (...args: any[]) => void;

type NavbarProps = {
  sticky?: boolean;
  addOffsetSpacer?: boolean;
}

export function Navbar({ sticky = false, addOffsetSpacer = sticky }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)   // 👈 stato per lo scroll
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
          gtag?.("event", "open_search_dialog", {
            event_category: "interaction",
            event_label: "Navbar Shortcut",
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

  // 👇 listener per scroll, solo se sticky
  useEffect(() => {
    if (!sticky) return
    const onScroll = () => setScrolled(window.scrollY > 0)
    window.addEventListener("scroll", onScroll)
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [sticky])

  const base =
    "flex items-center w-full h-16 z-50 px-3 sm:px-4 md:px-4 md:py-2 justify-between"

  const position = sticky
    ? "fixed bg-transparent xl:w-[65%] mx-auto"
    : "fixed top-0 left-0 md:static"

  const bg = sticky
    ? "bg-[#040A0C]/80 backdrop-blur-sm"
    : "bg-[#040A0C]/80 backdrop-blur-sm md:bg-transparent"

  // 👇 border visibile solo se sticky + scrolled
  const border = sticky && scrolled ? "border-b border-flash/10" : ""

  return (
    <>
      <div className={`${base} ${position} ${bg} ${border}`}>
        {/* SX */}
        <div className="flex-shrink-0">
          <div className="p-1.5 text-flash/90 rounded-sm border border-flash/10 md:hidden">
            <Menu className="w-3 h-3 cursor-clicker" />
          </div>
          <Link to="/" className="hidden md:block cursor-clicker">
            <img src="/typelogo.png" className="w-24 h-22" alt="Logo" />
          </Link>
        </div>

        {/* CENTRO */}
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
          <Link to="/leaderboards" className="flex-shrink-0">
            <MenuItem label="LEADERBOARD" />
          </Link>
          <MenuItem label="TIER LISTS" />
          <Link to="/learn" className="flex-shrink-0">
            <MenuItem label="LEARN" />
          </Link>
        </div>

        {/* DX */}
        <div className="flex-shrink-0 flex items-center">
          <Link to="/" className="md:hidden">
            <img src="/typelogo.png" className="w-24 h-22 cursor-clicker" alt="Logo" />
          </Link>
          <div className="hidden md:flex space-x-2 items-center text-[12px]">
            <SearchDialog open={open} onOpenChange={setOpen} />
            <UserDialog />
          </div>
        </div>

        <div className="md:hidden">
          <SearchDialog open={open} onOpenChange={setOpen} />
        </div>
      </div>

      {addOffsetSpacer && <div className="h-16 md:h-16" />}
    </>
  )
}

function MenuItem({ label }: { label: string }) {
  return (
    <div className="flex items-center px-3 py-1 rounded cursor-clicker hover:bg-flash/5 text-flash/70 hover:text-flash transition-colors duration-150">
      <div>{label}</div>
    </div>
  )
}
