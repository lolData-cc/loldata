import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// Navbar.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { SearchDialog } from "@/components/searchdialog";
import { UserDialog } from "@/components/userdialog";
import { useAuth } from "@/context/authcontext";
import { useChampionPicker } from "@/context/championpickercontext";
import { Menu, ChartNoAxesCombined, Trophy, BookOpen, Layers, User, LogIn, X, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
// ── Mobile menu nav items ──
const NAV_ITEMS = [
    { label: "CHAMPIONS", icon: ChartNoAxesCombined, to: null, action: "picker" },
    { label: "RANKINGS", icon: Trophy, to: "/leaderboards", action: null },
    { label: "TIER LISTS", icon: Layers, to: "/tierlist", action: null },
    { label: "LEARN", icon: BookOpen, to: "/learn", action: null },
];
export function Navbar({ sticky = false, addOffsetSpacer = sticky }) {
    const [open, setOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [learnOpen, setLearnOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { session, nametag, region } = useAuth();
    const { openPicker } = useChampionPicker();
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                const newState = !open;
                setOpen(newState);
                if (!open) {
                    gtag?.("event", "open_search_dialog", {
                        event_category: "interaction",
                        event_label: "Navbar Shortcut",
                    });
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                if (nametag && region) {
                    const [n, t] = nametag.split("#");
                    const slug = `${n.replace(/\s+/g, "+")}-${t}`;
                    navigate(`/summoners/${region}/${slug}`);
                }
            }
        }
        function handleOpenSearch() {
            setOpen(true);
        }
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("open-search-dialog", handleOpenSearch);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("open-search-dialog", handleOpenSearch);
        };
    }, [open, nametag, region, navigate]);
    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false);
    }, [location.pathname]);
    useEffect(() => {
        if (!sticky)
            return;
        const onScroll = () => setScrolled(window.scrollY > 0);
        window.addEventListener("scroll", onScroll);
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [sticky]);
    const base = "flex items-center w-full h-16 z-50 px-3 sm:px-4 md:px-4 md:py-2 justify-between";
    const position = sticky
        ? "fixed bg-transparent xl:w-[65%] min-[2560px]:w-[55%] mx-auto"
        : "fixed top-0 left-0 md:static";
    // Mobile (< md): keep the navbar barely-there — heavy blur + low
    // opacity so it reads as a faint glass strip over the splash hero
    // instead of a solid black bar that fights the content underneath.
    // Desktop keeps the original solid-ish backdrop.
    const bg = sticky
        ? `bg-[#040A0C]/30 backdrop-blur-xl saturate-150 md:backdrop-blur-sm md:saturate-100 transition-colors duration-300 ${
        // Homepage hero: at the very top keep the bar barely-tinted so Katarina's
        // hair reads as continuing THROUGH it; once scrolled, restore the solid backdrop.
        scrolled ? "md:bg-[#040A0C]/80" : "md:bg-[#040A0C]/25"}`
        : "bg-[#040A0C]/30 backdrop-blur-xl saturate-150 md:bg-transparent md:backdrop-blur-none md:saturate-100";
    const border = sticky && scrolled ? "border-b border-flash/10" : "";
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: `${base} ${position} ${bg} ${border}`, children: [_jsxs("div", { className: "flex-shrink-0", children: [_jsxs(Sheet, { open: menuOpen, onOpenChange: setMenuOpen, children: [_jsx(SheetTrigger, { asChild: true, children: _jsx("button", { type: "button", className: "p-1.5 text-flash/90 rounded-sm border border-flash/10 md:hidden cursor-clicker hover:border-jade/30 hover:text-jade transition-colors", children: _jsx(Menu, { className: "w-3 h-3" }) }) }), _jsxs(SheetContent, { side: "left", hideClose: true, className: "\r\n                w-[280px] p-0 border-r border-jade/20\r\n                bg-[#040A0C] font-jetbrains\r\n                data-[state=open]:duration-300 data-[state=closed]:duration-200\r\n              ", children: [_jsx(SheetTitle, { className: "sr-only", children: "Navigation menu" }), _jsx(SheetDescription, { className: "sr-only", children: "Main site navigation and account links" }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[1] opacity-[0.03]", style: {
                                                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
                                                } }), _jsx("div", { className: "absolute right-0 top-0 bottom-0 w-[1px] z-[2]", style: { background: "linear-gradient(to bottom, rgba(0,217,146,0.4), rgba(0,217,146,0.05) 70%, transparent)" } }), _jsxs("div", { className: "relative z-10 flex flex-col h-full", children: [_jsxs("div", { className: "px-5 pt-5 pb-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(Link, { to: "/", className: "cursor-clicker", onClick: () => setMenuOpen(false), children: _jsxs("span", { className: "font-mono text-[15px] tracking-[0.18em] select-none", children: [_jsx("span", { className: "text-flash/30", children: "lol" }), _jsx("span", { className: "text-jade/40 text-[10px] mx-[3px]", children: "\u25C8" }), _jsx("span", { className: "text-flash/90", children: "data" })] }) }), _jsx("button", { type: "button", onClick: () => setMenuOpen(false), className: "p-1 text-flash/30 hover:text-flash/70 transition-colors cursor-clicker", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "flex items-center gap-2 mt-3 text-[8px] tracking-[0.25em] uppercase text-jade/30", children: [_jsx("span", { className: "text-jade/50 text-[6px]", children: "\u25C8" }), _jsx("span", { children: "::" }), _jsx("span", { className: "px-1 py-[1px] text-jade/50", style: {
                                                                            background: "rgba(0,217,146,0.08)",
                                                                            border: "1px solid rgba(0,217,146,0.15)",
                                                                            borderRadius: "1px",
                                                                        }, children: "NAV" }), _jsx("span", { children: "::" }), _jsx("span", { className: "flex-1 h-px", style: { background: "linear-gradient(90deg, rgba(0,217,146,0.15), transparent)" } })] })] }), _jsx(Separator, { className: "bg-flash/10" }), _jsx("nav", { className: "flex-1 px-3 py-4 space-y-1", children: NAV_ITEMS.map((item) => {
                                                            const isActive = item.to ? location.pathname === item.to : false;
                                                            const Icon = item.icon;
                                                            // LEARN → collapsible that reveals the Learn page tabs as sub-links
                                                            if (item.label === "LEARN") {
                                                                const learnActive = location.pathname.startsWith("/learn");
                                                                const subLinks = [
                                                                    { label: "Overview", to: "/learn?t=overview" },
                                                                    { label: "Your Games", to: "/learn?t=games" },
                                                                    { label: "Explorer", to: "/learn/explorer" },
                                                                    { label: "Itemization", to: "/learn?t=itemization" },
                                                                    { label: "Loldata AI", to: "/learn?t=loldata-ai" },
                                                                ];
                                                                return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => setLearnOpen((v) => !v), "aria-expanded": learnOpen, className: `
                              w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                              text-[13px] tracking-[0.08em] uppercase
                              transition-all duration-200 cursor-clicker group
                              ${learnActive
                                                                                ? "bg-jade/10 text-jade border border-jade/20"
                                                                                : "text-flash/60 hover:text-flash/90 hover:bg-flash/5 border border-transparent"}
                            `, children: [_jsx("div", { className: `
                              w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0
                              transition-colors duration-200
                              ${learnActive ? "bg-jade/20" : "bg-flash/5 group-hover:bg-jade/10"}
                            `, children: _jsx(Icon, { className: `w-3.5 h-3.5 ${learnActive ? "text-jade" : "text-flash/40 group-hover:text-jade/70"} transition-colors` }) }), _jsx("span", { children: item.label }), _jsx(ChevronDown, { className: `ml-auto w-3.5 h-3.5 transition-transform duration-200 ${learnOpen ? "rotate-180" : ""} ${learnActive ? "text-jade/70" : "text-flash/30 group-hover:text-jade/60"}` })] }), learnOpen && (_jsx("div", { className: "mt-1 ml-9 flex flex-col gap-0.5 border-l border-flash/10 pl-2", children: subLinks.map((sub) => (_jsx(Link, { to: sub.to, onClick: () => setMenuOpen(false), className: "\r\n                                    px-3 py-2 rounded-sm\r\n                                    text-[11px] tracking-[0.08em] uppercase\r\n                                    text-flash/45 hover:text-jade hover:bg-flash/5\r\n                                    transition-all duration-200 cursor-clicker\r\n                                  ", children: sub.label }, sub.to))) }))] }, item.label));
                                                            }
                                                            const handleClick = () => {
                                                                if (item.action === "picker") {
                                                                    setMenuOpen(false);
                                                                    setTimeout(() => openPicker(), 150);
                                                                }
                                                                else if (item.to) {
                                                                    setMenuOpen(false);
                                                                    navigate(item.to);
                                                                }
                                                            };
                                                            return (_jsxs("button", { type: "button", onClick: handleClick, className: `
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-sm
                          text-[13px] tracking-[0.08em] uppercase
                          transition-all duration-200 cursor-clicker group
                          ${isActive
                                                                    ? "bg-jade/10 text-jade border border-jade/20"
                                                                    : "text-flash/60 hover:text-flash/90 hover:bg-flash/5 border border-transparent"}
                        `, children: [_jsx("div", { className: `
                          w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0
                          transition-colors duration-200
                          ${isActive ? "bg-jade/20" : "bg-flash/5 group-hover:bg-jade/10"}
                        `, children: _jsx(Icon, { className: `w-3.5 h-3.5 ${isActive ? "text-jade" : "text-flash/40 group-hover:text-jade/70"} transition-colors` }) }), _jsx("span", { children: item.label }), isActive && (_jsx("div", { className: "ml-auto w-1.5 h-1.5 rounded-full bg-jade shadow-[0_0_6px_rgba(0,217,146,0.5)]" }))] }, item.label));
                                                        }) }), _jsx(Separator, { className: "bg-flash/10" }), _jsx("div", { className: "px-3 py-4 space-y-1", children: session ? (_jsxs(_Fragment, { children: [nametag && region && (_jsxs("button", { type: "button", onClick: () => {
                                                                        setMenuOpen(false);
                                                                        const [n, t] = nametag.split("#");
                                                                        const slug = `${n.replace(/\s+/g, "+")}-${t}`;
                                                                        navigate(`/summoners/${region}/${slug}`);
                                                                    }, className: "\r\n                            w-full flex items-center gap-3 px-3 py-2.5 rounded-sm\r\n                            text-[13px] tracking-[0.08em] uppercase\r\n                            text-flash/60 hover:text-flash/90 hover:bg-flash/5\r\n                            transition-all duration-200 cursor-clicker group\r\n                            border border-transparent\r\n                          ", children: [_jsx("div", { className: "w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0 bg-flash/5 group-hover:bg-jade/10 transition-colors", children: _jsx(User, { className: "w-3.5 h-3.5 text-flash/40 group-hover:text-jade/70 transition-colors" }) }), _jsx("span", { children: "MY PROFILE" })] })), _jsxs("button", { type: "button", onClick: () => { setMenuOpen(false); navigate("/dashboard"); }, className: "\r\n                          w-full flex items-center gap-3 px-3 py-2.5 rounded-sm\r\n                          text-[13px] tracking-[0.08em] uppercase\r\n                          text-jade/80 hover:text-jade hover:bg-jade/5\r\n                          transition-all duration-200 cursor-clicker group\r\n                          border border-jade/10 bg-jade/[0.04]\r\n                        ", children: [_jsx("div", { className: "w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0 bg-jade/15", children: _jsx("span", { className: "text-jade text-[8px]", children: "\u25C8" }) }), _jsx("span", { children: "DASHBOARD" })] })] })) : (_jsxs("button", { type: "button", onClick: () => { setMenuOpen(false); navigate("/login"); }, className: "\r\n                        w-full flex items-center gap-3 px-3 py-2.5 rounded-sm\r\n                        text-[13px] tracking-[0.08em] uppercase\r\n                        text-jade/70 hover:text-jade hover:bg-jade/10\r\n                        transition-all duration-200 cursor-clicker group\r\n                        border border-jade/20 bg-jade/[0.06]\r\n                      ", children: [_jsx("div", { className: "w-6 h-6 flex items-center justify-center rounded-[3px] flex-shrink-0 bg-jade/15", children: _jsx(LogIn, { className: "w-3.5 h-3.5 text-jade" }) }), _jsx("span", { children: "SIGN IN" })] })) }), _jsx(Separator, { className: "bg-flash/10" }), _jsxs("div", { className: "px-5 py-4 space-y-3", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx(Link, { to: "https://discord.gg/SNjKYbdXzG", onClick: () => setMenuOpen(false), className: "text-flash/20 hover:text-jade/60 transition-colors cursor-clicker", children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", fill: "currentColor", viewBox: "0 0 16 16", children: _jsx("path", { d: "M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" }) }) }), _jsx("a", { href: "https://x.com", target: "_blank", rel: "noopener noreferrer", className: "text-flash/20 hover:text-flash/50 transition-colors cursor-clicker", children: _jsx("svg", { role: "img", viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg", className: "w-3 h-3 fill-current", children: _jsx("path", { d: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" }) }) })] }), _jsx("p", { className: "text-[8px] text-flash/15 leading-relaxed", children: "loldata.cc is not affiliated with or endorsed by Riot Games." })] })] })] })] }), _jsx(Link, { to: "/", className: "hidden md:block cursor-clicker group", children: _jsxs("span", { className: "font-mono text-[15px] tracking-[0.18em] select-none", children: [_jsx("span", { className: "text-flash/30 group-hover:text-flash/50 transition-colors", children: "lol" }), _jsx("span", { className: "text-jade/40 text-[10px] mx-[3px] group-hover:text-jade/70 transition-colors", children: "\u25C8" }), _jsx("span", { className: "text-flash/90 group-hover:text-jade transition-colors group-hover:drop-shadow-[0_0_8px_rgba(0,217,146,0.3)]", children: "data" })] }) })] }), _jsxs("div", { className: "hidden md:flex flex-1 justify-center space-x-1 lg:space-x-6 text-sm font-jetbrains", children: [_jsx("button", { type: "button", className: "flex-shrink-0", onClick: (e) => {
                                    e.preventDefault();
                                    openPicker();
                                }, children: _jsx(MenuItem, { label: "CHAMPIONS", active: location.pathname.startsWith("/champions") }) }), _jsx(Link, { to: "/leaderboards", className: "flex-shrink-0", children: _jsx(MenuItem, { label: "RANKINGS", active: location.pathname.startsWith("/leaderboard") }) }), _jsx(Link, { to: "/tierlist", className: "flex-shrink-0", children: _jsx(MenuItem, { label: "TIER LISTS", active: location.pathname.startsWith("/tierlist") }) }), _jsx(Link, { to: "/learn", className: "flex-shrink-0", children: _jsx(MenuItem, { label: "LEARN", active: location.pathname.startsWith("/learn") }) })] }), _jsxs("div", { className: "flex-shrink-0 flex items-center", children: [_jsx(Link, { to: "/", className: "md:hidden cursor-clicker", children: _jsxs("span", { className: "font-mono text-[15px] tracking-[0.18em] select-none", children: [_jsx("span", { className: "text-flash/30", children: "lol" }), _jsx("span", { className: "text-jade/40 text-[10px] mx-[3px]", children: "\u25C8" }), _jsx("span", { className: "text-flash/90", children: "data" })] }) }), _jsxs("div", { className: "hidden md:flex space-x-2 items-center text-[12px]", children: [_jsx(SearchDialog, { open: open, onOpenChange: setOpen }), _jsx(UserDialog, {})] })] }), _jsx("div", { className: "md:hidden", children: _jsx(SearchDialog, { open: open, onOpenChange: setOpen }) })] }), addOffsetSpacer && _jsx("div", { className: "h-16 md:h-16" })] }));
}
function MenuItem({ label, active }) {
    return (_jsx("div", { className: active
            ? "flex items-center px-1.5 lg:px-3 py-1 rounded cursor-clicker text-jade brightness-125 transition-all duration-300"
            : "flex items-center px-1.5 lg:px-3 py-1 rounded cursor-clicker hover:bg-flash/5 text-flash/70 hover:text-flash transition-colors duration-150", style: active ? {
            textShadow: "0 0 6px rgba(0,217,146,0.9), 0 0 20px rgba(0,217,146,0.6), 0 0 45px rgba(0,217,146,0.35), 0 0 80px rgba(0,217,146,0.15)",
        } : undefined, children: _jsx("div", { children: label }) }));
}
