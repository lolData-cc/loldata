import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// ExplorerCanvas.tsx — the node-based query builder (Learn ▸ EXPLORER).
//
// Full-bleed canvas grid; floating UI (palette, run, zoom, minimap) is locked
// to the page content column so nothing hugs the screen edge. v1 runs on mock
// data; the same compiled graph will hit /api/explorer/query once wired.
import { useCallback, useEffect, useRef, useState } from "react";
import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant, addEdge, reconnectEdge, useNodesState, useEdgesState, useReactFlow, } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./explorer.css";
import { Play, Loader2, X, Plus, Minus, Maximize, Eraser, Maximize2, BookmarkPlus, Check, Layers, Trash2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { showCyberToast } from "@/lib/toast-utils";
import { DiamondButton } from "@/components/ui/diamond-button";
import { MODULE_GLYPH } from "./module-icons";
import { nodeTypes, ConnectingContext, ExcludeDragContext, isValidPair } from "./ExplorerNodes";
import { edgeTypes } from "./GlowEdge";
import { compileGraph, runQuery, runPatchVariation } from "./graph";
import { champIcon, itemIcon, itemName } from "./catalog";
import { DeepDive } from "./DeepDive";
import { MiniBuildPath } from "./MiniBuildPath";
import { CyberTip } from "./CyberTip";
import { isSnapshottable, isSaved, getSnapshots, saveSnapshot, deleteSnapshot, graphToCanvas } from "./snapshots";
const DEFAULTS = {
    subject: { champion: "", role: "" },
    ally: { champion: "", role: "" },
    enemy: { champion: "", role: "" },
    item: { itemId: undefined },
    rune: { keystone: undefined },
    filter: { scope: "current_patch", tiers: ["CHALLENGER", "GRANDMASTER", "MASTER"], queues: [420, 440], platforms: [] },
    output: { mode: "rank", dimension: "ally", role: "UTILITY", limit: 5, minGames: 5 },
    exclude: {},
};
const PALETTE = [
    { kind: "subject", label: "Subject", Icon: MODULE_GLYPH.subject, accent: "#00d992" },
    { kind: "ally", label: "Ally", Icon: MODULE_GLYPH.ally, accent: "#36d3ff" },
    { kind: "enemy", label: "Enemy", Icon: MODULE_GLYPH.enemy, accent: "#ff6286" },
    { kind: "item", label: "Item", Icon: MODULE_GLYPH.item, accent: "#FFB615" },
    { kind: "rune", label: "Rune", Icon: MODULE_GLYPH.rune, accent: "#b483ff" },
    { kind: "filter", label: "Filter", Icon: MODULE_GLYPH.filter, accent: "#d7d8d9" },
    { kind: "output", label: "Output", Icon: MODULE_GLYPH.output, accent: "#00d992" },
];
// start empty — a centered "+" CTA shows until the first node lands
const initialNodes = [];
const initialEdges = [];
// "2h ago" relative time for the snapshots list
function timeAgo(ms) {
    const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (s < 60)
        return "just now";
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
function Canvas({ onBack }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [result, setResult] = useState(null);
    const [running, setRunning] = useState(false);
    // right-click menu. `target` = the negatable module under the cursor (item/rune/
    // ally/enemy), which unlocks the SUBMODULE section (attach/detach EXCLUDE).
    const [ctx, setCtx] = useState(null);
    // negatable modules glow as drop targets while an Exclude block is dragged
    const [draggingExclude, setDraggingExclude] = useState(false);
    const [expanded, setExpanded] = useState(false); // deep-dive overlay
    const [snapshots, setSnapshots] = useState(() => getSnapshots());
    const [snapsOpen, setSnapsOpen] = useState(false); // saved-snapshots list
    const idRef = useRef(10);
    // touch long-press → opens the same context menu as desktop right-click
    // (so you can add a submodule by holding on empty canvas on a phone)
    const lpTimer = useRef(null);
    const lpStart = useRef(null);
    const rf = useReactFlow();
    // The Exclude block (a real canvas node, no handles) attaches by being DROPPED
    // overlapping a negatable module: set that module's `exclude` flag, then remove
    // the block. No wires — it just docks.
    const onNodeDragStart = useCallback((_e, node) => {
        if (node.type === "exclude")
            setDraggingExclude(true);
    }, []);
    const onNodeDragStop = useCallback((_e, node) => {
        if (node.type !== "exclude")
            return;
        setDraggingExclude(false);
        const hit = rf.getIntersectingNodes(node).find((n) => ["item", "rune", "ally", "enemy"].includes(n.type));
        if (hit) {
            rf.updateNodeData(hit.id, { exclude: true });
            rf.deleteElements({ nodes: [{ id: node.id }] });
        }
    }, [rf]);
    const onConnect = useCallback((c) => setEdges((eds) => addEdge({ ...c, type: "glow" }, eds)), [setEdges]);
    // Detach a wire: grab either endpoint and drop it in empty space to delete it.
    // reconnectDone tracks whether the drag landed on a valid handle; if it didn't
    // (= dropped in the void), onReconnectEnd removes the edge.
    const reconnectDone = useRef(true);
    const onReconnectStart = useCallback(() => { reconnectDone.current = false; }, []);
    const onReconnect = useCallback((oldEdge, newConn) => {
        reconnectDone.current = true;
        setEdges((els) => reconnectEdge(oldEdge, newConn, els));
    }, [setEdges]);
    const onReconnectEnd = useCallback((_, edge) => {
        if (!reconnectDone.current)
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        reconnectDone.current = true;
    }, [setEdges]);
    // While a wire is being dragged, remember the source node so valid target nodes
    // can pulse their input handle (drag from Subject's out → Output's in pulses).
    const [connecting, setConnecting] = useState({ sourceId: null, sourceType: null });
    const onConnectStart = useCallback((_, p) => {
        setConnecting({ sourceId: p.nodeId ?? null, sourceType: nodes.find((n) => n.id === p.nodeId)?.type ?? null });
    }, [nodes]);
    const onConnectEnd = useCallback(() => setConnecting({ sourceId: null, sourceType: null }), []);
    // Topology guard (shared with each node's input-pulse via isValidPair):
    // ally/enemy/item/rune/filter feed the SUBJECT (items/runes also feed an
    // ally/enemy); only the Subject/filter feed the Output.
    const isValidConnection = useCallback((c) => isValidPair(nodes.find((n) => n.id === c.source)?.type, nodes.find((n) => n.id === c.target)?.type), [nodes]);
    // Add a node — at the right-click spot if given, else a default position.
    const addNode = (kind, screen) => {
        const id = `${kind}-${++idRef.current}`;
        const position = screen
            ? rf.screenToFlowPosition(screen)
            : { x: 200 + Math.random() * 140, y: 130 + Math.random() * 120 };
        setNodes((ns) => [...ns, { id, type: kind, position, data: { ...DEFAULTS[kind] } }]);
        setCtx(null);
    };
    // wipe the canvas — modules, wires, and any open result/overlay
    const clearCanvas = () => { setNodes([]); setEdges([]); setResult(null); setExpanded(false); };
    // ── snapshots: save the current combo, list them, re-open (rebuild + re-run) ──
    const onSaveSnapshot = () => {
        if (!result)
            return;
        setSnapshots(saveSnapshot(result.graph, Date.now()));
        showCyberToast({ title: "Snapshot saved", description: "Re-open it any day for fresh numbers.", tag: "Explorer", variant: "status" });
    };
    const onDeleteSnapshot = (id) => {
        const next = deleteSnapshot(id);
        setSnapshots(next);
        if (next.length === 0)
            setSnapsOpen(false); // trigger button is gone — close the now-empty panel
    };
    const onOpenSnapshot = async (snap) => {
        setSnapsOpen(false);
        const { nodes: n, edges: e } = graphToCanvas(snap.graph);
        setNodes(n);
        setEdges(e);
        setRunning(true);
        try {
            const res = await runQuery(snap.graph); // re-run for fresh numbers
            setResult({ res, graph: snap.graph });
        }
        catch (e) {
            showCyberToast({ title: "Query failed", description: e?.message || "Is the backend running?", tag: "Explorer", variant: "error" });
        }
        finally {
            setRunning(false);
        }
        setTimeout(() => rf.fitView({ duration: 400, padding: 0.25 }), 80);
    };
    const run = async () => {
        const { graph, error } = compileGraph(nodes, edges);
        if (error || !graph) {
            showCyberToast({ title: error ?? "Invalid graph", tag: "Explorer", variant: "error" });
            return;
        }
        setRunning(true);
        try {
            const res = await runQuery(graph);
            setResult({ res, graph });
        }
        catch (e) {
            showCyberToast({
                title: "Query failed",
                description: e?.message || "Is the backend running?",
                tag: "Explorer",
                variant: "error",
            });
        }
        finally {
            setRunning(false);
        }
    };
    return (_jsxs("div", { className: "relative w-full h-full overflow-hidden bg-[#05090b]", onContextMenu: (e) => {
            // override the native browser menu everywhere on the canvas (pane, nodes,
            // empty-state, controls) with our custom one — but keep native on text fields
            if (e.target.closest("input, textarea, [contenteditable='true']"))
                return;
            e.preventDefault();
            // which module did we right-click? ReactFlow tags node DOM with data-id.
            const nodeId = e.target.closest(".react-flow__node")?.getAttribute("data-id") ?? undefined;
            const node = nodeId ? nodes.find((n) => n.id === nodeId) : undefined;
            const negatable = node && ["item", "rune", "ally", "enemy"].includes(node.type);
            setCtx({
                x: e.clientX, y: e.clientY,
                target: negatable ? { id: node.id, type: node.type, exclude: node.data?.exclude === true } : undefined,
            });
        }, onTouchStart: (e) => {
            if (e.target.closest("input, textarea, [contenteditable='true'], button, a"))
                return;
            if (e.touches.length !== 1)
                return;
            const t = e.touches[0];
            const sx = t.clientX, sy = t.clientY;
            lpStart.current = { x: sx, y: sy };
            if (lpTimer.current)
                clearTimeout(lpTimer.current);
            lpTimer.current = window.setTimeout(() => {
                const el = document.elementFromPoint(sx, sy);
                const nodeId = el?.closest(".react-flow__node")?.getAttribute("data-id") ?? undefined;
                const node = nodeId ? nodes.find((n) => n.id === nodeId) : undefined;
                const negatable = node && ["item", "rune", "ally", "enemy"].includes(node.type);
                setCtx({ x: sx, y: sy, target: negatable ? { id: node.id, type: node.type, exclude: node.data?.exclude === true } : undefined });
                if (typeof navigator !== "undefined" && navigator.vibrate)
                    navigator.vibrate(8);
                lpTimer.current = null;
            }, 450);
        }, onTouchMove: (e) => {
            if (lpTimer.current && lpStart.current) {
                const t = e.touches[0];
                if (Math.hypot(t.clientX - lpStart.current.x, t.clientY - lpStart.current.y) > 12) {
                    clearTimeout(lpTimer.current);
                    lpTimer.current = null;
                }
            }
        }, onTouchEnd: () => { if (lpTimer.current) {
            clearTimeout(lpTimer.current);
            lpTimer.current = null;
        } }, children: [_jsx(ExcludeDragContext.Provider, { value: draggingExclude, children: _jsx(ConnectingContext.Provider, { value: connecting, children: _jsx(ReactFlow, { nodes: nodes, edges: edges, onNodesChange: onNodesChange, onEdgesChange: onEdgesChange, onConnect: onConnect, onConnectStart: onConnectStart, onConnectEnd: onConnectEnd, onReconnect: onReconnect, onReconnectStart: onReconnectStart, onReconnectEnd: onReconnectEnd, onNodeDragStart: onNodeDragStart, onNodeDragStop: onNodeDragStop, isValidConnection: isValidConnection, nodeTypes: nodeTypes, edgeTypes: edgeTypes, defaultEdgeOptions: { type: "glow" }, defaultViewport: { x: 90, y: 70, zoom: 0.72 }, minZoom: 0.3, maxZoom: 1.6, onPaneClick: () => setCtx(null), proOptions: { hideAttribution: true }, className: "explorer-flow", children: _jsx(Background, { variant: BackgroundVariant.Dots, gap: 24, size: 1.4, color: "rgba(0,217,146,0.13)" }) }) }) }), _jsx("div", { className: "absolute inset-0 pointer-events-none z-[2]", children: _jsxs("div", { className: "relative h-full w-full lg:w-[65%] mx-auto px-3 lg:px-0", children: [_jsx("div", { className: "hidden lg:block absolute bottom-4 right-0 pointer-events-auto", children: _jsxs("button", { onClick: run, disabled: running, className: "flex items-center gap-2 px-4 py-2 rounded-[5px] font-chakrapetch text-[12px] font-bold tracking-[0.1em] uppercase text-jade border border-jade/40 bg-jade/10 hover:bg-jade/20 transition-all cursor-clicker disabled:opacity-50", style: { boxShadow: "0 0 16px rgba(0,217,146,0.2)" }, children: [running ? _jsx(Loader2, { size: 13, className: "animate-spin" }) : _jsx(Play, { size: 13 }), running ? "Crunching…" : "Run query"] }) }), _jsx("div", { className: "lg:hidden absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-auto", children: _jsx("button", { onClick: run, disabled: running, "aria-label": "Run query", className: "grid place-items-center w-[68px] h-[68px] rotate-45 rounded-[16px] border border-jade/50 bg-jade/15 active:bg-jade/30 transition-all cursor-clicker disabled:opacity-50", style: { boxShadow: "0 0 26px rgba(0,217,146,0.32)" }, children: _jsxs("span", { className: "-rotate-45 flex flex-col items-center gap-0.5 text-jade", children: [running ? _jsx(Loader2, { size: 20, className: "animate-spin" }) : _jsx(Play, { size: 20, className: "ml-0.5" }), _jsx("span", { className: "text-[8px] font-chakrapetch font-bold tracking-[0.12em] uppercase", children: running ? "…" : "Run" })] }) }) }), onBack && (_jsx("div", { className: "hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto", children: _jsx(DiamondButton, { icon: "back", onClick: onBack, "aria-label": "Back to Learn" }) })), _jsxs("div", { className: "absolute bottom-4 left-0 pointer-events-auto flex items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1 rounded-[7px] border border-white/10 bg-[rgba(8,14,16,0.8)] backdrop-blur-md p-1 shadow-[0_6px_18px_rgba(0,0,0,0.4)]", children: [_jsx("button", { onClick: () => rf.zoomIn({ duration: 200 }), "aria-label": "Zoom in", className: "grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker", children: _jsx(Plus, { size: 14 }) }), _jsx("button", { onClick: () => rf.zoomOut({ duration: 200 }), "aria-label": "Zoom out", className: "grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker", children: _jsx(Minus, { size: 14 }) }), _jsx("span", { className: "w-px h-4 bg-white/10 mx-0.5" }), _jsx("button", { onClick: () => rf.fitView({ duration: 300, padding: 0.2 }), "aria-label": "Fit view", className: "grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker", children: _jsx(Maximize, { size: 12 }) })] }), _jsx("div", { className: "rounded-[7px] border border-white/10 bg-[rgba(8,14,16,0.8)] backdrop-blur-md p-1 shadow-[0_6px_18px_rgba(0,0,0,0.4)]", children: _jsx("button", { onClick: clearCanvas, "aria-label": "Clear canvas", title: "Clear canvas", className: "grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-error hover:bg-error/10 transition-colors cursor-clicker", children: _jsx(Eraser, { size: 13 }) }) }), snapshots.length > 0 && (_jsx("div", { className: "rounded-[7px] border border-white/10 bg-[rgba(8,14,16,0.8)] backdrop-blur-md p-1 shadow-[0_6px_18px_rgba(0,0,0,0.4)]", children: _jsxs("button", { onClick: () => setSnapsOpen((v) => !v), "aria-label": "Saved snapshots", title: "Saved snapshots", className: cn("relative grid place-items-center w-7 h-7 rounded-[5px] transition-colors cursor-clicker", snapsOpen ? "text-jade bg-jade/10" : "text-flash/45 hover:text-jade hover:bg-jade/10"), children: [_jsx(Layers, { size: 14 }), _jsx("span", { className: "absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 grid place-items-center rounded-full bg-jade text-[8px] font-chakrapetch font-bold text-[#03110c] leading-none", children: snapshots.length })] }) }))] })] }) }), nodes.length === 0 && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none", children: _jsxs("div", { className: "flex flex-col items-center gap-5 pointer-events-auto", children: [_jsxs("button", { type: "button", onClick: () => setCtx({ x: window.innerWidth / 2, y: window.innerHeight / 2 }), "aria-label": "Add module", className: "group relative flex items-center justify-center w-16 h-16 rounded-full border border-jade/40 bg-jade/[0.08] hover:bg-jade/[0.15] hover:border-jade/70 transition-all cursor-clicker", style: { boxShadow: "0 0 22px rgba(0,217,146,0.18)" }, children: [_jsx(Plus, { size: 26, className: "text-jade transition-transform duration-200 group-hover:scale-110" }), _jsx("span", { className: "absolute inset-[-6px] rounded-full border border-jade/25 animate-ping pointer-events-none" })] }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-[15px] font-chakrapetch font-bold text-flash tracking-wide", children: "Build a query from modules" }), _jsxs("p", { className: "text-[12px] font-chakrapetch text-flash/60 mt-1.5", children: ["Start with a ", _jsx("span", { className: "text-jade font-semibold", children: "Subject" }), ", wire in constraints \u2192 an ", _jsx("span", { className: "text-jade font-semibold", children: "Output" })] }), _jsxs("p", { className: "text-[10px] font-chakrapetch text-flash/45 mt-2 tracking-wide", children: [_jsx("span", { className: "lg:hidden", children: "Tap \uFF0B or long-press the canvas to add modules" }), _jsx("span", { className: "hidden lg:inline", children: "Click \uFF0B or right-click the canvas to add modules" })] })] }), _jsx("div", { className: "flex flex-wrap justify-center gap-2 max-w-[440px]", children: PALETTE.map((p) => (_jsxs("button", { onClick: () => addNode(p.kind), className: "flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border border-white/10 bg-[rgba(8,14,16,0.82)] hover:bg-white/[0.06] hover:border-white/20 transition-colors cursor-clicker", children: [_jsx(p.Icon, { size: 12, style: { color: p.accent } }), _jsx("span", { className: "text-[11px] font-chakrapetch text-flash/75", children: p.label })] }, p.kind))) })] }) })), ctx && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-[8]", onClick: () => setCtx(null), onContextMenu: (e) => { e.preventDefault(); setCtx(null); } }), _jsxs("div", { className: "explorer-surface outline-none fixed z-[9] w-[230px] sm:w-[248px] p-2 rounded-[8px] border border-jade/25 bg-[rgba(6,12,14,0.97)] backdrop-blur-xl shadow-[0_16px_44px_rgba(0,0,0,0.7)] animate-in fade-in-0 zoom-in-95 duration-100", style: { left: Math.min(ctx.x, window.innerWidth - 260), top: Math.min(ctx.y, window.innerHeight - 330) }, children: [_jsx("div", { className: "px-1 pb-1.5 mb-1.5 border-b border-white/[0.07] text-[8px] font-chakrapetch font-semibold tracking-[0.18em] uppercase text-jade/55", children: "Add module" }), _jsx("div", { className: "grid grid-cols-2 gap-1", children: PALETTE.map((p) => (_jsxs("button", { onClick: () => addNode(p.kind, ctx), className: "group flex items-center gap-2 px-2 py-2 rounded-[5px] border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.07] hover:border-white/15 transition-colors cursor-clicker text-left", children: [_jsx("span", { className: "grid place-items-center w-5 h-5 rounded-[4px] shrink-0", style: { background: `${p.accent}1f` }, children: _jsx(p.Icon, { size: 12, style: { color: p.accent } }) }), _jsx("span", { className: "text-[11px] font-chakrapetch text-flash/75 group-hover:text-flash", children: p.label })] }, p.kind))) }), _jsx("div", { className: "px-1 pt-2.5 pb-1.5 mb-1.5 border-b border-white/[0.07] text-[8px] font-chakrapetch font-semibold tracking-[0.18em] uppercase text-error/55", children: "Add submodule" }), _jsxs("button", { onClick: () => addNode("exclude", ctx), className: "group w-full flex items-center gap-2 px-2 py-2 rounded-[5px] border border-error/25 bg-error/[0.07] hover:bg-error/[0.13] hover:border-error/45 transition-colors cursor-clicker text-left", children: [_jsx("span", { className: "grid place-items-center w-5 h-5 rounded-[4px] shrink-0 bg-error/15", children: _jsx(MODULE_GLYPH.exclude, { size: 12, style: { color: "#ff5470" } }) }), _jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-[11px] font-chakrapetch text-flash/85 group-hover:text-flash", children: "Exclude" }), _jsx("span", { className: "text-[8px] font-chakrapetch text-flash/40 leading-none mt-0.5 truncate", children: "adds a block \u2014 drag it onto a module" })] })] })] })] })), result && (_jsx(ResultsPanel, { data: result.res, graph: result.graph, onClose: () => setResult(null), onExpand: () => setExpanded(true), onSave: onSaveSnapshot, canSave: isSnapshottable(result.graph), saved: isSaved(result.graph) })), expanded && result && (_jsx(DeepDive, { data: result.res, graph: result.graph, onClose: () => setExpanded(false), onSave: onSaveSnapshot, canSave: isSnapshottable(result.graph), saved: isSaved(result.graph) })), snapsOpen && (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute inset-0 z-[7] pointer-events-auto", onClick: () => setSnapsOpen(false) }), _jsxs("div", { className: "absolute bottom-[58px] left-4 z-[8] w-[calc(100vw-2rem)] sm:w-[300px] max-h-[52vh] flex flex-col rounded-[10px] border border-jade/20 bg-[rgba(6,12,14,0.97)] backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.7)] overflow-hidden pointer-events-auto animate-[snapPanelIn_0.18s_cubic-bezier(0.16,1,0.3,1)]", children: [_jsxs("div", { className: "flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.07]", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Layers, { size: 13, className: "text-jade" }), _jsx("span", { className: "text-[10px] font-chakrapetch font-bold tracking-[0.2em] uppercase text-jade/70", children: "Snapshots" }), _jsx("span", { className: "text-[10px] font-chakrapetch text-flash/30 tabular-nums", children: snapshots.length })] }), _jsx("button", { onClick: () => setSnapsOpen(false), className: "text-flash/40 hover:text-flash cursor-clicker", children: _jsx(X, { size: 13 }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto cyber-scrollbar p-2 flex flex-col gap-1.5", children: snapshots.length === 0 ? (_jsxs("div", { className: "px-3 py-6 text-center text-[10px] font-chakrapetch text-flash/35 leading-relaxed", children: ["No snapshots yet. Build a combo with an item, rune, or ally, then hit ", _jsx("span", { className: "text-jade/70", children: "Save snapshot" }), "."] })) : (snapshots.map((s) => (_jsxs("div", { className: "group flex items-center gap-2 px-2.5 py-2 rounded-[6px] border border-white/[0.06] bg-white/[0.02] hover:border-jade/30 hover:bg-jade/[0.05] transition-colors", children: [_jsxs("button", { onClick: () => onOpenSnapshot(s), className: "flex-1 min-w-0 flex flex-col items-start text-left cursor-clicker", children: [_jsx("span", { className: "text-[11px] font-chakrapetch font-semibold text-flash/90 truncate max-w-full group-hover:text-jade transition-colors", children: s.name }), _jsxs("span", { className: "text-[8px] font-chakrapetch uppercase tracking-[0.14em] text-flash/30 mt-0.5", children: ["saved ", timeAgo(s.savedAt), " \u00B7 re-runs live"] })] }), _jsx("button", { onClick: () => onOpenSnapshot(s), title: "Open & refresh", className: "grid place-items-center w-6 h-6 rounded-[5px] text-flash/40 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker", children: _jsx(ChevronRight, { size: 14 }) }), _jsx("button", { onClick: () => onDeleteSnapshot(s.id), title: "Delete snapshot", className: "grid place-items-center w-6 h-6 rounded-[5px] text-flash/30 hover:text-error hover:bg-error/10 transition-colors cursor-clicker", children: _jsx(Trash2, { size: 12 }) })] }, s.id)))) })] })] }))] }));
}
function ResultsPanel({ data, graph, onClose, onExpand, onSave, canSave, saved }) {
    const isRank = data.columns.includes("dimension");
    const isItemDim = isRank && graph.output.kind === "rank" && graph.output.dimension === "item";
    const stat = data.rows[0];
    // 0-game combos come back with null aggregates (avg_gold/winrate = null) —
    // an empty state avoids calling .toLocaleString() on null (which blanked the page).
    const empty = isRank ? data.rows.length === 0 : !stat || Number(stat.games) === 0;
    // the rank band the result was filtered to (from the Filter module's tiers)
    const rank = (() => {
        const t = graph.filters?.tiers;
        if (!t?.length)
            return null;
        const s = new Set(t);
        if (s.has("MASTER"))
            return "Master+";
        if (s.has("GRANDMASTER"))
            return "GM+";
        if (s.has("CHALLENGER"))
            return "Challenger";
        return t[0];
    })();
    return (_jsxs("div", { className: "absolute inset-x-0 bottom-0 lg:inset-x-auto lg:right-0 lg:top-0 h-[58%] lg:h-full w-full lg:w-[320px] border-t lg:border-t-0 lg:border-l border-jade/15 bg-[rgba(5,10,12,0.94)] backdrop-blur-xl flex flex-col animate-[slideUp_0.3s_ease-out] lg:animate-[slideIn_0.25s_ease] z-[5]", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-white/[0.06]", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[10px] font-chakrapetch font-semibold tracking-[0.22em] uppercase text-jade/65", children: "Result" }), _jsxs("div", { className: "flex items-center gap-2 mt-1.5", children: [_jsx("span", { className: "text-[19px] font-chakrapetch font-bold tabular-nums leading-none text-flash", children: data.meta.games.toLocaleString() }), _jsx("span", { className: "text-[9px] font-chakrapetch uppercase tracking-[0.18em] text-flash/40 -ml-0.5", children: "games" }), _jsx("span", { className: "px-2 py-0.5 rounded-[4px] bg-jade/10 border border-jade/30 text-[9px] font-chakrapetch font-bold uppercase tracking-[0.12em] text-jade", children: data.meta.mode === "all" ? "all patches" : data.meta.patch ? `patch ${data.meta.patch}` : "current patch" }), rank && (_jsx("span", { className: "px-2 py-0.5 rounded-[4px] bg-citrine/10 border border-citrine/30 text-[9px] font-chakrapetch font-bold uppercase tracking-[0.12em] text-citrine", children: rank }))] })] }), _jsx("button", { onClick: onClose, className: "text-flash/40 hover:text-flash cursor-clicker", children: _jsx(X, { size: 15 }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto cyber-scrollbar p-4", children: [graph.subject.champion && (_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("img", { src: champIcon(graph.subject.champion), className: "w-8 h-8 rounded-[4px] border border-jade/30", alt: "" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[13px] font-chakrapetch font-semibold text-flash", children: graph.subject.champion }), _jsxs("span", { className: "text-[9px] font-chakrapetch text-flash/35 uppercase tracking-wider", children: [graph.constraints.length, " constraint", graph.constraints.length === 1 ? "" : "s"] })] })] })), empty ? (_jsxs("div", { className: "flex flex-col items-center justify-center text-center py-12 px-3 gap-2.5", children: [_jsx("span", { className: "text-[30px] leading-none text-jade/40", children: "\u2205" }), _jsx("span", { className: "text-[12px] font-chakrapetch text-flash/70", children: "No games match this combo" }), _jsx("span", { className: "text-[10px] font-chakrapetch text-flash/35 leading-relaxed", children: "Each item, rune, and ally narrows the pool \u2014 remove a constraint or widen the scope to All patches." })] })) : !isRank ? (_jsxs("div", { className: "flex flex-col gap-2.5", children: [_jsxs("div", { className: "flex flex-col items-center py-3 rounded-[6px] border border-jade/15 bg-jade/[0.04]", children: [_jsxs("span", { className: "text-[42px] leading-none font-chakrapetch font-bold tabular-nums text-jade", children: [stat.winrate ?? 0, "%"] }), _jsx("span", { className: "text-[9px] font-chakrapetch tracking-[0.2em] uppercase text-flash/40 mt-1.5", children: "winrate" })] }), (() => {
                                const k = Number(stat.avg_kills ?? 0), d = Number(stat.avg_deaths ?? 0), a = Number(stat.avg_assists ?? 0);
                                const ratio = d > 0 ? (k + a) / d : k + a;
                                const rc = ratio >= 5 ? "#FFB615" : ratio >= 3 ? "#00d992" : ratio >= 2 ? "#d7d8d9" : "#8a9096";
                                return (_jsxs("div", { className: "flex items-center justify-between px-3 py-2.5 rounded-[6px] border border-white/[0.07] bg-black/30", children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("span", { className: "text-[8px] font-chakrapetch tracking-[0.16em] uppercase text-flash/35", children: "Avg \u00B7 kills / deaths / assists" }), _jsxs("div", { className: "flex items-baseline gap-1.5 font-chakrapetch tabular-nums text-[18px] leading-none", children: [_jsx("span", { className: "text-flash", children: k.toFixed(1) }), _jsx("span", { className: "text-flash/25 text-[12px]", children: "/" }), _jsx("span", { className: "text-error/80", children: d.toFixed(1) }), _jsx("span", { className: "text-flash/25 text-[12px]", children: "/" }), _jsx("span", { className: "text-flash", children: a.toFixed(1) })] })] }), _jsxs("div", { className: "flex flex-col items-end leading-none pl-3 border-l border-white/[0.06]", children: [_jsx("span", { className: "text-[24px] font-bold font-chakrapetch tabular-nums", style: { color: rc }, children: ratio.toFixed(2) }), _jsx("span", { className: "text-[8px] font-chakrapetch tracking-[0.18em] uppercase text-flash/35 mt-1.5", children: "KDA" })] })] }));
                            })(), _jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                                    ["Avg CS", Number(stat.avg_cs ?? 0).toLocaleString()],
                                    ["Avg Gold", Number(stat.avg_gold ?? 0).toLocaleString()],
                                ].map(([k, v]) => (_jsxs("div", { className: "flex flex-col gap-0.5 px-2.5 py-2 rounded-[5px] border border-white/[0.07] bg-black/30", children: [_jsx("span", { className: "text-[8px] font-chakrapetch tracking-[0.16em] uppercase text-flash/35", children: k }), _jsx("span", { className: "text-[14px] font-chakrapetch text-flash tabular-nums", children: v })] }, k))) }), _jsx(PatchVariation, { graph: graph })] })) : (_jsxs("div", { className: "flex flex-col gap-1.5", children: [isItemDim && _jsx(MiniBuildPath, { graph: graph }), isItemDim && (_jsxs("p", { className: "text-[8.5px] font-chakrapetch text-flash/35 leading-snug mb-1", children: ["Ranked by ", _jsx("b", { className: "text-flash/55", children: "lift \u00D7 confidence" }), ", not raw winrate. ", _jsx("b", { className: "text-jade/70", children: "+N" }), " = winrate above ", graph.subject.champion, "'s average. Open ", _jsx("b", { className: "text-jade/70", children: "Deep dive" }), " for the full path + matchups."] })), data.rows.map((r, i) => {
                                const raw = r.dimension;
                                const icon = isItemDim ? itemIcon(Number(raw)) : champIcon(String(raw));
                                const label = isItemDim ? itemName(Number(raw)) : String(raw);
                                const wr = Number(r.winrate);
                                const lift = r.lift != null ? Number(r.lift) : null;
                                const pick = r.pickrate != null ? Number(r.pickrate) : null;
                                return (_jsxs("div", { className: "flex items-center gap-2.5 px-2 py-1.5 rounded-[5px] hover:bg-white/[0.04]", children: [_jsx("span", { className: "text-[10px] font-chakrapetch text-flash/30 w-4 tabular-nums", children: i + 1 }), _jsx("img", { src: icon, onError: (e) => (e.target.style.visibility = "hidden"), className: "w-7 h-7 rounded-[4px] border border-white/10", alt: "" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-[12px] font-chakrapetch text-flash truncate", children: label }), _jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [lift != null && (_jsx(CyberTip, { tip: _jsxs(_Fragment, { children: [_jsxs("b", { className: "text-flash", children: ["Lift ", lift > 0 ? "+" : "", lift.toFixed(1)] }), " \u2014 winrate ", lift >= 0 ? "above" : "below", " ", graph.subject.champion, "'s average. The ranking weights this by sample size, not raw winrate."] }), children: _jsxs("span", { className: cn("text-[10px] font-chakrapetch font-bold tabular-nums cursor-help", lift > 0.05 ? "text-jade/80" : lift < -0.05 ? "text-error/80" : "text-flash/40"), children: [lift > 0 ? "+" : "", lift.toFixed(1)] }) })), _jsxs("span", { className: cn("text-[12px] font-chakrapetch tabular-nums", wr >= 50 ? "text-jade" : "text-error"), children: [wr, "%"] })] })] }), _jsx("div", { className: "mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden", children: _jsx("div", { className: "h-full rounded-full", style: { width: `${Math.min(100, wr)}%`, background: wr >= 50 ? "#00d992" : "#ff6286" } }) })] }), isItemDim && pick != null ? (_jsx(CyberTip, { tip: _jsxs(_Fragment, { children: [_jsxs("b", { className: "text-flash", children: [pick, "% pick"] }), " \u00B7 ", Number(r.games).toLocaleString(), " games \u2014 how often ", graph.subject.champion, " players built this, and the sample behind it."] }), children: _jsxs("span", { className: "text-[9px] font-chakrapetch text-flash/35 tabular-nums w-9 text-right cursor-help", children: [pick, "%"] }) })) : (_jsxs("span", { className: "text-[9px] font-chakrapetch text-flash/30 tabular-nums w-9 text-right", children: [Number(r.games), "g"] }))] }, String(raw)));
                            })] }))] }), !empty && (_jsxs("div", { className: "flex items-stretch gap-2 px-4 py-3 border-t border-white/[0.06]", children: [_jsxs("button", { onClick: onExpand, className: "group basis-[80%] grow flex items-center justify-center gap-2 h-10 rounded-[7px] border border-jade/35 bg-jade/[0.08] hover:bg-jade/[0.16] hover:border-jade/60 transition-all cursor-clicker outline-none focus:outline-none focus-visible:outline-none shadow-[0_0_0_rgba(0,217,146,0)] hover:shadow-[0_0_22px_rgba(0,217,146,0.25)]", children: [_jsx(Maximize2, { size: 13, className: "text-jade transition-transform group-hover:scale-110" }), _jsx("span", { className: "text-[11px] font-chakrapetch font-bold tracking-[0.14em] uppercase text-jade", children: "Deep dive" })] }), canSave && (_jsx("button", { onClick: onSave, title: saved ? "Snapshot saved — click to refresh" : "Save this combo as a snapshot", className: cn("basis-[20%] shrink-0 flex items-center justify-center gap-1.5 h-10 rounded-[7px] border transition-all cursor-clicker outline-none focus:outline-none focus-visible:outline-none", saved
                            ? "border-jade/45 bg-jade/15 text-jade"
                            : "border-jade/20 bg-jade/[0.05] text-flash/60 hover:text-jade hover:border-jade/45 hover:bg-jade/[0.1]"), children: saved ? _jsx(Check, { size: 14 }) : _jsx(BookmarkPlus, { size: 14 }) }))] }))] }));
}
// `floor` = the smallest span the bar scale uses, so a tiny real range (e.g. a
// 0.2pt winrate wobble) maps to a tiny bar difference instead of being blown up
// to the full width. `eps` = below this, a patch-over-patch delta reads as flat.
const PV_METRICS = [
    { key: "winrate", label: "WR", get: (r) => Number(r.winrate ?? 0), fmt: (v) => `${v.toFixed(1)}%`, eps: 0.05, floor: 5 },
    { key: "kda", label: "KDA", get: (r) => { const d = Number(r.avg_deaths ?? 0); const ka = Number(r.avg_kills ?? 0) + Number(r.avg_assists ?? 0); return d > 0 ? ka / d : ka; }, fmt: (v) => v.toFixed(2), eps: 0.01, floor: 0.4 },
    { key: "cs", label: "CS", get: (r) => Number(r.avg_cs ?? 0), fmt: (v) => v.toFixed(0), eps: 0.5, floor: 20 },
    { key: "gold", label: "Gold", get: (r) => Number(r.avg_gold ?? 0), fmt: (v) => `${(v / 1000).toFixed(1)}k`, eps: 50, floor: 1000 },
];
function PatchVariation({ graph }) {
    const [rows, setRows] = useState(null);
    const [phase, setPhase] = useState("loading");
    const [exact, setExact] = useState(false);
    const [exactLoading, setExactLoading] = useState(false);
    const [metric, setMetric] = useState("winrate");
    const hasConstraints = graph.constraints.length > 0 ||
        (graph.subject.items?.length ?? 0) > 0 ||
        (graph.subject.keystones?.length ?? 0) > 0;
    // instant subject-level fetch whenever the result graph changes
    useEffect(() => {
        let cancelled = false;
        setPhase("loading");
        setRows(null);
        setExact(false);
        setMetric("winrate");
        runPatchVariation(graph, false)
            .then((r) => { if (cancelled)
            return; setRows(r.rows); setPhase(r.rows.length >= 2 ? "ready" : "empty"); })
            .catch(() => { if (!cancelled)
            setPhase("error"); });
        return () => { cancelled = true; };
    }, [graph]);
    const loadExact = async () => {
        setExactLoading(true);
        try {
            const r = await runPatchVariation(graph, true);
            if (r.rows.length >= 2) {
                setRows(r.rows);
                setExact(true);
                setPhase("ready");
            }
            else
                showCyberToast({ title: "Not enough data", description: "This exact combo has too few games per patch to chart.", tag: "PATCH", variant: "error" });
        }
        catch (e) {
            showCyberToast({ title: "Exact trend failed", description: e?.message ?? "Too heavy — try fewer constraints.", tag: "PATCH", variant: "error" });
        }
        finally {
            setExactLoading(false);
        }
    };
    const header = (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-[9px] font-chakrapetch font-bold tracking-[0.2em] uppercase text-flash/45", children: "Patch variation" }), exact
                ? _jsx("span", { className: "text-[8px] font-chakrapetch uppercase tracking-[0.14em] text-jade/80 px-1.5 py-0.5 rounded-[3px] bg-jade/10 border border-jade/25", children: "exact" })
                : _jsxs("span", { className: "text-[8px] font-chakrapetch uppercase tracking-[0.14em] text-flash/30 truncate max-w-[140px]", children: [graph.subject.champion, graph.subject.role ? ` · ${graph.subject.role}` : ""] })] }));
    if (phase === "loading") {
        return (_jsxs("div", { className: "mt-1 flex flex-col gap-2 pt-3 border-t border-white/[0.06]", children: [header, _jsxs("div", { className: "flex items-center gap-2 text-flash/40 text-[10px] font-chakrapetch py-1.5", children: [_jsx(Loader2, { size: 12, className: "animate-spin" }), " loading patch trend\u2026"] })] }));
    }
    if (phase !== "ready" || !rows) {
        return (_jsxs("div", { className: "mt-1 flex flex-col gap-2 pt-3 border-t border-white/[0.06]", children: [header, _jsx("span", { className: "text-[10px] font-chakrapetch text-flash/35 py-0.5", children: phase === "error" ? "Patch trend unavailable." : "Not enough patches to chart a trend." })] }));
    }
    const m = PV_METRICS.find((x) => x.key === metric);
    const vals = rows.map(m.get);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = Math.max(max - min, m.floor); // never over-amplify a tiny range
    const totalGames = rows.reduce((a, r) => a + r.games, 0);
    return (_jsxs("div", { className: "mt-1 flex flex-col gap-2.5 pt-3 border-t border-white/[0.06]", children: [header, _jsx("div", { className: "flex gap-1", children: PV_METRICS.map((x) => (_jsx("button", { onClick: () => setMetric(x.key), className: cn("flex-1 py-1 rounded-[4px] text-[9px] font-chakrapetch font-bold tracking-[0.1em] uppercase transition-colors cursor-clicker", metric === x.key ? "bg-jade/15 text-jade border border-jade/35" : "text-flash/40 border border-white/[0.07] hover:text-flash/70"), children: x.label }, x.key))) }), _jsx("div", { className: "flex flex-col gap-1", children: rows.map((r, i) => {
                    const v = m.get(r);
                    const prev = i > 0 ? m.get(rows[i - 1]) : null;
                    const delta = prev == null ? null : v - prev;
                    const w = 14 + ((v - min) / span) * 86; // keep even the min visible
                    const barColor = metric === "winrate" ? (v >= 50 ? "#00d992" : "#ff6286") : "#00d992";
                    const low = r.games < 100;
                    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "w-9 shrink-0 text-[10px] font-chakrapetch tabular-nums text-flash/55", children: r.patch }), _jsx("div", { className: "flex-1 h-2.5 rounded-[3px] bg-white/[0.05] overflow-hidden", children: _jsx("div", { className: "h-full rounded-[3px] transition-all duration-300", style: { width: `${w}%`, background: barColor, opacity: low ? 0.4 : 0.85 } }) }), _jsx("span", { className: cn("w-11 shrink-0 text-right text-[11px] font-chakrapetch font-bold tabular-nums", metric === "winrate" ? (v >= 50 ? "text-jade" : "text-error") : "text-flash"), children: m.fmt(v) }), _jsx("span", { className: "w-10 shrink-0 text-right text-[9px] font-chakrapetch tabular-nums", children: delta == null ? (_jsx("span", { className: "text-flash/20", children: "\u2014" })) : Math.abs(delta) < m.eps ? (_jsx("span", { className: "text-flash/25", children: "\u00B7" })) : (_jsxs("span", { className: delta > 0 ? "text-jade/80" : "text-error/80", children: [delta > 0 ? "▲" : "▼", m.fmt(Math.abs(delta)).replace("%", "")] })) })] }, r.patch));
                }) }), _jsxs("span", { className: "text-[8px] font-chakrapetch text-flash/25 uppercase tracking-[0.12em]", children: [totalGames.toLocaleString(), " games \u00B7 faded bar = <100 / patch"] }), hasConstraints && !exact && (_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("button", { onClick: loadExact, disabled: exactLoading, className: "flex items-center justify-center gap-1.5 py-1.5 rounded-[5px] border border-citrine/30 bg-citrine/[0.06] text-citrine text-[9px] font-chakrapetch font-bold uppercase tracking-[0.12em] hover:bg-citrine/[0.12] transition-colors cursor-clicker disabled:opacity-50", children: exactLoading ? _jsxs(_Fragment, { children: [_jsx(Loader2, { size: 11, className: "animate-spin" }), " computing exact\u2026"] }) : _jsx(_Fragment, { children: "\u25C6 compute exact (allies / items)" }) }), _jsx("span", { className: "text-[8px] font-chakrapetch text-flash/25 leading-snug", children: "Trend is the champion only \u2014 it ignores your allies/items. Exact is slower." })] }))] }));
}
export default function ExplorerCanvas({ onBack }) {
    return (_jsx(ReactFlowProvider, { children: _jsx(Canvas, { onBack: onBack }) }));
}
