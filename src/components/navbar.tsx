// Navbar.tsx
import { useEffect, useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { SearchDialog } from "@/components/searchdialog"
import { UserDialog } from "@/components/userdialog"
import { useAuth } from "@/context/authcontext"
import { useChampionPicker } from "@/context/championpickercontext"
import { Menu, ChartNoAxesCombined, Trophy, BookOpen, Layers, User, LogIn, X } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

declare const gtag: (...args: any[]) => void;

type NavbarProps = {
  sticky?: boolean;
  addOffsetSpacer?: boolean;
}

// ── Mobile menu nav items ──
const NAV_ITEMS = [
  { label: "CHAMPIONS", icon: ChartNoAxesCombined, to: null, action: "picker" as const },
  { label: "LEADERBOARD", icon: Trophy, to: "/leaderboards" as const, action: null },
  { label: "TIER LISTS", icon: Layers, to: null, action: null },
  { label: "LEARN", icon: BookOpen, to: "/learn" as const, action: null },
] as const

export function Navbar({ sticky = false, addOffsetSpacer = sticky }: NavbarProps) {
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { session, nametag, region } = useAuth()
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
    }

    function handleOpenSearch() {
      setOpen(true)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("open-search-dialog", handleOpenSearch)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("open-search-dialog", handleOpenSearch)
    }
  }, [open, nametag, region, navigate])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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
    ? "fixed bg-transparent xl:w-[65%] min-[2560px]:w-[55%] mx-auto"
    : "fixed top-0 left-0 md:static"

  const bg = sticky
    ? "bg-[#040A0C]/80 backdrop-blur-sm"
    : "bg-[#040A0C]/80 backdrop-blur-sm md:bg-transparent"

  const border = sticky && scrolled ? "border-b border-flash/10" : ""

  return (
    <>
      <div className={`${base} ${position} ${bg} ${border}`}>
        {/* SX — Mobile menu trigger */}
        <div className="flex-shrink-0">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="p-1.5 text-flash/90 rounded-sm border border-flash/10 md:hidden cursor-clicker hover:border-jade/30 hover:text-jade transition-colors"
              >
                <Menu className="w-3 h-3" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="left"
              hideClose
              className="
                w-[280px] p-0 border-r border-jade/20
                bg-[#040A0C] font-jetbrains
                data-[state=open]:duration-300 data-[state=closed]:duration-200
              "
            >
              {/* Accessibility title */}
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>

              {/* Scanlines overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-[1] opacity-[0.03]"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
                }}
              />

              {/* Right jade accent line */}
              <div
                className="absolute right-0 top-0 bottom-0 w-[1px] z-[2]"
                style={{ background: "linear-gradient(to bottom, rgba(0,217,146,0.4), rgba(0,217,146,0.05) 70%, transparent)" }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col h-full">

                {/* Header */}
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center justify-between">
                    <Link to="/" className="cursor-clicker" onClick={() => setMenuOpen(false)}>
                      <span className="font-mono text-[15px] tracking-[0.18em] select-none">
                        <span className="text-flash/30">lol</span>
                        <span className="text-jade/40 text-[10px] mx-[3px]">◈</span>
                        <span className="text-flash/90">data</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMenuOpen(false)}
                      className="p-1 text-flash/30 hover:text-flash/70 transition-colors cursor-clicker"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tag line */}
                  <div className="flex items-center gap-2 mt-3 text-[8px] tracking-[0.25em] uppercase text-jade/30">
                    <span className="text-jade/50 text-[6px]">◈</span>
                    <span>::</span>
                    <span
                      className="px-1 py-[1px] text-jade/50"
                      style={{
                        background: "rgba(0,217,146,0.08)",
                        border: "1px solid rgba(0,217,146,0.15)",
                        borderRadius: "1px",
                      }}
                    >
                      NAV
                    </span>
                    <span>::</span>
                    <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(0,217,146,0.15), transparent)" }} />
                  </div>
                </div>

                <Separator className="bg-flash/10" />

                {/* Navigation links */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = item.to ? location.pathname === item.to : false
                    const Icon = item.icon

                    const handleClick = () => {
                      if (item.action === "picker") {
                        setMenuOpen(false)
                        setTimeout(() => openPicker(), 150)
                      } else if (item.to) {
                        setMenuOpen(false)
                        navigate(item.to)
                      }
                    }

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={handleClick}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                          text-[13px] tracking-[0.08em] uppercase
                          transition-all duration-200 cursor-clicker group
                          ${isActive
                            ? "bg-jade/10 text-jade border border-jade/20"
                            : "text-flash/60 hover:text-flash/90 hover:bg-flash/5 border border-transparent"
                          }
                        `}
                      >
                        <div className={`
                          w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0
                          transition-colors duration-200
                          ${isActive ? "bg-jade/20" : "bg-flash/5 group-hover:bg-jade/10"}
                        `}>
                          <Icon className={`w-3.5 h-3.5 ${isActive ? "text-jade" : "text-flash/40 group-hover:text-jade/70"} transition-colors`} />
                        </div>
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.5)]" />
                        )}
                      </button>
                    )
                  })}
                </nav>

                <Separator className="bg-flash/10" />

                {/* User section */}
                <div className="px-3 py-4 space-y-1">
                  {session ? (
                    <>
                      {nametag && region && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            const slug = nametag.replace("#", "-")
                            navigate(`/summoners/${region}/${slug}`)
                          }}
                          className="
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                            text-[13px] tracking-[0.08em] uppercase
                            text-flash/60 hover:text-flash/90 hover:bg-flash/5
                            transition-all duration-200 cursor-clicker group
                            border border-transparent
                          "
                        >
                          <div className="w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0 bg-flash/5 group-hover:bg-jade/10 transition-colors">
                            <User className="w-3.5 h-3.5 text-flash/40 group-hover:text-jade/70 transition-colors" />
                          </div>
                          <span>MY PROFILE</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); navigate("/dashboard") }}
                        className="
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                          text-[13px] tracking-[0.08em] uppercase
                          text-jade/80 hover:text-jade hover:bg-jade/5
                          transition-all duration-200 cursor-clicker group
                          border border-jade/10 bg-jade/[0.04]
                        "
                      >
                        <div className="w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0 bg-jade/15">
                          <span className="text-jade text-[8px]">◈</span>
                        </div>
                        <span>DASHBOARD</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); navigate("/login") }}
                      className="
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                        text-[13px] tracking-[0.08em] uppercase
                        text-jade/70 hover:text-jade hover:bg-jade/10
                        transition-all duration-200 cursor-clicker group
                        border border-jade/20 bg-jade/[0.06]
                      "
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0 bg-jade/15">
                        <LogIn className="w-3.5 h-3.5 text-jade" />
                      </div>
                      <span>SIGN IN</span>
                    </button>
                  )}
                </div>

                <Separator className="bg-flash/10" />

                {/* Footer — social + copyright */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <Link
                      to="https://discord.gg/SNjKYbdXzG"
                      onClick={() => setMenuOpen(false)}
                      className="text-flash/20 hover:text-jade/60 transition-colors cursor-clicker"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                      </svg>
                    </Link>
                    <a
                      href="https://x.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-flash/20 hover:text-flash/50 transition-colors cursor-clicker"
                    >
                      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 fill-current">
                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                      </svg>
                    </a>
                  </div>
                  <p className="text-[8px] text-flash/15 leading-relaxed">
                    loldata.cc is not affiliated with or endorsed by Riot Games.
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="hidden md:block cursor-clicker group">
            <span className="font-mono text-[15px] tracking-[0.18em] select-none">
              <span className="text-flash/30 group-hover:text-flash/50 transition-colors">lol</span>
              <span className="text-jade/40 text-[10px] mx-[3px] group-hover:text-jade/70 transition-colors">◈</span>
              <span className="text-flash/90 group-hover:text-jade transition-colors group-hover:drop-shadow-[0_0_8px_rgba(0,217,146,0.3)]">data</span>
            </span>
          </Link>
        </div>

        {/* CENTRO */}
        <div className="hidden md:flex flex-1 justify-center space-x-1 lg:space-x-6 text-sm font-jetbrains">
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
          <Link to="/" className="md:hidden cursor-clicker">
            <span className="font-mono text-[15px] tracking-[0.18em] select-none">
              <span className="text-flash/30">lol</span>
              <span className="text-jade/40 text-[10px] mx-[3px]">◈</span>
              <span className="text-flash/90">data</span>
            </span>
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
    <div className="flex items-center px-1.5 lg:px-3 py-1 rounded cursor-clicker hover:bg-flash/5 text-flash/70 hover:text-flash transition-colors duration-150">
      <div>{label}</div>
    </div>
  )
}
