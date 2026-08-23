import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useImprovementTree } from "@/hooks/useImprovementTree";
import { PathSelection } from "./PathSelection";
import { TreeCanvas } from "./TreeCanvas";
import { TreeLoader } from "./TreeLoader";
import { NodeDetail, HubDetail } from "./NodeDetail";
const EASE = [0.22, 1, 0.36, 1];
// ── R3F guard: if WebGL blows up, drop to the 2D board instead of a blank canvas
class TreeBoundary extends React.Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(err) { console.warn("[improvement-tree] fell back to 2D:", err?.message ?? err); }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
const DOT = { complete: "bg-jade", progress: "bg-[#FFB615]", locked: "bg-flash/25" };
function Board2D({ data, onSelect }) {
    return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4", children: data.categories.map((cat) => (_jsxs("div", { className: "rounded-md bg-filmdark/30 p-3 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.1)]", children: [_jsx("p", { className: "font-chakrapetch font-bold text-[12px] uppercase tracking-[0.1em] text-flash/85 mb-2.5", children: cat.title }), _jsx("div", { className: "space-y-2", children: data.nodes.filter((n) => n.category === cat.id).map((n) => {
                        const fill = n.threshold > 0 ? Math.min(1, n.progress / n.threshold) : n.progress;
                        return (_jsxs("button", { onClick: () => onSelect(n.id), className: "w-full text-left cursor-clicker group", children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-1", children: [_jsx("span", { className: cn("w-1.5 h-1.5 rounded-full shrink-0", DOT[n.state]) }), _jsx("span", { className: "font-jetbrains text-[11px] text-flash/70 group-hover:text-flash/95 truncate", children: n.title }), _jsxs("span", { className: "ml-auto font-mono text-[9px] text-flash/35 tabular-nums", children: [Math.round(n.progress * 100), "%"] })] }), _jsx("div", { className: "h-1 rounded-full bg-black/50 overflow-hidden", children: _jsx("div", { className: cn("h-full rounded-full", n.state === "complete" ? "bg-jade" : n.state === "progress" ? "bg-[#FFB615]" : "bg-flash/20"), style: { width: `${fill * 100}%` } }) })] }, n.id));
                    }) })] }, cat.id))) }));
}
export default function ImprovementTree({ puuid, region }) {
    const { data, loading, error, choosePath } = useImprovementTree(puuid, region);
    const [selectedId, setSelectedId] = useState(null);
    const [reselecting, setReselecting] = useState(false);
    const header = (_jsx("div", { className: "flex items-center justify-between mb-5", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.35em] uppercase text-jade/55", children: "Improvement Tree" })] }) }));
    if (loading) {
        return (_jsxs("div", { className: "h-full flex flex-col", children: [_jsx("div", { className: "shrink-0 mx-auto w-full lg:w-[65%] px-4", children: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.35em] uppercase text-jade/55", children: "Improvement Tree" })] }) }), _jsx("div", { className: "flex-1 min-h-0", children: _jsx(TreeLoader, {}) })] }));
    }
    if (error || !data) {
        return _jsxs(_Fragment, { children: [header, _jsx("div", { className: "flex items-center justify-center h-48", children: _jsx("span", { className: "text-flash/40 font-mono text-sm", children: "Failed to load the Improvement Tree" }) })] });
    }
    // first visit (or "change path") → choose a path
    if (data.needsPathSelection || reselecting) {
        return _jsx(PathSelection, { onChoose: (role) => { setReselecting(false); choosePath(role); } });
    }
    // path chosen but its tree isn't built yet
    if (data.comingSoon) {
        return (_jsxs(_Fragment, { children: [header, _jsxs("div", { className: "flex flex-col items-center justify-center h-[420px] gap-4 text-center", children: [_jsx("div", { className: "w-14 h-14 rounded-lg bg-jade/[0.06] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(0,217,146,0.2)]", children: _jsx(Sparkles, { className: "text-jade/70", size: 24 }) }), _jsxs("div", { children: [_jsxs("p", { className: "font-chakrapetch font-bold text-[18px] text-flash/90", children: ["The ", data.role, " tree is coming soon"] }), _jsx("p", { className: "font-jetbrains text-[12px] text-flash/45 mt-1", children: "The Path of the Jungle is fully live \u2014 pick it to see the tree in action." })] }), _jsxs("button", { onClick: () => setReselecting(true), className: "cursor-clicker inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-jade/80 hover:text-jade bg-jade/[0.08] px-3.5 py-2 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(0,217,146,0.3)]", children: [_jsx(RotateCcw, { size: 12 }), " Choose another path"] })] })] }));
    }
    const completeCount = data.nodes.filter((n) => n.state === "complete").length;
    // a node click can land on a leaf skill, a category hub, or the root
    const selectedLeaf = data.nodes.find((n) => n.id === selectedId) ?? null;
    const selectedCat = selectedId?.startsWith("cat:") ? data.categories.find((c) => `cat:${c.id}` === selectedId) : null;
    const isRoot = selectedId === "root";
    const catRows = selectedCat
        ? data.nodes.filter((n) => n.category === selectedCat.id).map((n) => ({ id: n.id, label: n.title, state: n.state, progress: n.progress }))
        : [];
    const rootRows = isRoot
        ? data.categories.map((c) => {
            const kids = data.nodes.filter((n) => n.category === c.id);
            const done = kids.filter((k) => k.state === "complete").length;
            const anyProg = kids.some((k) => k.state !== "locked");
            const state = kids.length && done === kids.length ? "complete" : anyProg ? "progress" : "locked";
            return { id: `cat:${c.id}`, label: c.title, state: state, progress: done / Math.max(1, kids.length) };
        })
        : [];
    return (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 }, className: "h-full flex flex-col", children: [_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-4 mb-2 shrink-0 mx-auto w-full lg:w-[65%] px-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2.5 mb-1.5", children: [_jsx("span", { className: "inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" }), _jsx("span", { className: "font-mono text-[10px] tracking-[0.3em] uppercase text-jade/55", children: "Improvement Tree" })] }), _jsx("h2", { className: "font-chakrapetch font-bold text-[24px] md:text-[28px] text-flash/95 leading-tight", children: data.title })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "text-right", children: [_jsxs("div", { className: "font-chakrapetch font-bold text-[22px] tabular-nums text-jade leading-none", children: [completeCount, _jsxs("span", { className: "text-flash/30 text-[14px]", children: ["/", data.nodes.length] })] }), _jsx("span", { className: "font-mono text-[9px] tracking-[0.16em] uppercase text-flash/35", children: "skills mastered" })] }), _jsx("button", { onClick: () => { setSelectedId(null); setReselecting(true); }, title: "Change path", className: "cursor-clicker rounded-[4px] p-2 text-flash/40 hover:text-jade hover:bg-jade/[0.06] transition-colors shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]", children: _jsx(RotateCcw, { size: 15 }) })] })] }), _jsxs("div", { className: "relative flex-1 min-h-0", children: [_jsx(TreeBoundary, { fallback: _jsx("div", { className: "w-full h-full overflow-y-auto no-scrollbar", children: _jsx(Board2D, { data: data, onSelect: setSelectedId }) }), children: _jsx(TreeCanvas, { data: data, selectedId: selectedId, onSelect: setSelectedId }) }), _jsxs(AnimatePresence, { children: [selectedLeaf && _jsx(NodeDetail, { node: selectedLeaf, onClose: () => setSelectedId(null) }, selectedLeaf.id), selectedCat && _jsx(HubDetail, { eyebrow: "Category", title: selectedCat.title, subtitle: selectedCat.blurb, rows: catRows, onSelect: setSelectedId, onClose: () => setSelectedId(null) }, selectedCat.id), isRoot && _jsx(HubDetail, { eyebrow: "Overview", title: data.title, subtitle: data.tagline, rows: rootRows, onSelect: setSelectedId, onClose: () => setSelectedId(null) }, "root")] })] })] }));
}
