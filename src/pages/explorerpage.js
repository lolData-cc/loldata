import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ExplorerPage — the node query builder as its own full-screen route
// (/learn/explorer). No Learn tablist here: just the navbar and a single
// diamond back-button to return to /learn, so the canvas owns the whole stage.
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/navbar";
import ExplorerCanvas from "@/components/explorer/ExplorerCanvas";
// Brand easing — same curve used across the app's entrances.
const EASE = [0.22, 1, 0.36, 1];
export default function ExplorerPage() {
    const navigate = useNavigate();
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.35, ease: EASE }, className: "font-jetbrains subpixel-antialiased bg-liquirice text-flash w-full h-screen flex flex-col overflow-hidden", children: [_jsx("div", { className: "w-full flex justify-center", children: _jsx("div", { className: "w-full lg:w-[65%]", children: _jsx(Navbar, {}) }) }), _jsx(motion.div, { initial: { opacity: 0, scale: 0.965 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.6, ease: EASE, delay: 0.06 }, style: { transformOrigin: "center 40%" }, className: "relative flex-1 min-h-0 overflow-hidden pt-16 md:pt-0", children: _jsx(ExplorerCanvas, { onBack: () => navigate("/learn") }) })] }));
}
