import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SearchDialog } from "@/components/searchdialog";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
export function Navbar() {
    const [open, setOpen] = useState(false);
    // Apre il search dialog con Ctrl + K
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen(!open);
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
    return (_jsxs("div", { className: "flex items-center w-full py-2 px-4 justify-between h-16", children: [_jsx("div", { className: "flex-shrink-0", children: _jsx(Link, { to: "/", className: "flex-shrink-0", children: _jsx("img", { src: "/typelogo.png", className: "w-36 h-26 cursor-clicker", alt: "Logo" }) }) }), _jsxs("div", { className: "flex-1 flex justify-center space-x-6 text-sm", children: [_jsx(MenuItem, { label: "CHAMPIONS" }), _jsx(MenuItem, { label: "LEADERBOARD" }), _jsx(MenuItem, { label: "TIER LISTS" }), _jsx(MenuItem, { label: "LEARN" })] }), _jsx("div", { className: "flex-shrink-0 flex space-x-2", children: _jsx(SearchDialog, { open: open, onOpenChange: setOpen }) })] }));
}
function MenuItem({ label }) {
    return (_jsx("div", { className: "flex items-center px-3 py-1 rounded cursor-pointer hover:bg-flash/5 text-flash/40 hover:text-flash transition-colors duration-150", children: _jsx("div", { children: label }) }));
}
