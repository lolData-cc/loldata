import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MousePointer2, Pen, Eraser, Trash2, Undo2 } from "lucide-react";
export const DRAW_COLORS = [
    "#00d992", // jade
    "#FFB615", // citrine
    "#d63336", // red
    "#5BA8E6", // blue
    "#ffffff", // white
];
export function DrawingOverlay({ tool, color, strokes, setStrokes }) {
    const canvasRef = useRef(null);
    // The in-progress stroke. We keep it in a ref so each pointermove
    // doesn't trigger a re-render — we redraw onto the canvas directly.
    const liveRef = useRef(null);
    // Keep canvas resolution in sync with its CSS size (DPR-aware).
    const syncSize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return { w: canvas.width, h: canvas.height };
    }, []);
    // Draw a single stroke onto a 2D context.
    const drawStroke = useCallback((ctx, s, w, h) => {
        if (s.points.length < 1)
            return;
        const px = Math.min(w, h);
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = s.width * px;
        if (s.kind === "eraser") {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
        }
        else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = s.color;
            // tiny shadow for "marker on glass" feel — cheap on canvas
            ctx.shadowColor = s.color;
            ctx.shadowBlur = px * 0.004;
        }
        ctx.beginPath();
        ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
        if (s.points.length === 1) {
            // dot — a tiny line back to itself
            ctx.lineTo(s.points[0].x * w + 0.01, s.points[0].y * h + 0.01);
        }
        else {
            for (let i = 1; i < s.points.length; i++) {
                ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
            }
        }
        ctx.stroke();
        ctx.restore();
    }, []);
    // Full redraw — used after stroke add / undo / clear / resize.
    const redrawAll = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const sized = syncSize();
        if (!sized)
            return;
        const { w, h } = sized;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        ctx.clearRect(0, 0, w, h);
        for (const s of strokes)
            drawStroke(ctx, s, w, h);
        if (liveRef.current)
            drawStroke(ctx, liveRef.current, w, h);
    }, [strokes, syncSize, drawStroke]);
    // Redraw on stroke list change.
    useLayoutEffect(() => { redrawAll(); }, [redrawAll]);
    // Resize observer.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ro = new ResizeObserver(() => redrawAll());
        ro.observe(canvas);
        return () => ro.disconnect();
    }, [redrawAll]);
    // Pointer handlers.
    const localPoint = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
            y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
        };
    };
    const onPointerDown = (e) => {
        if (tool === "off")
            return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const p = localPoint(e);
        liveRef.current = {
            kind: tool === "eraser" ? "eraser" : "pen",
            color: tool === "eraser" ? "transparent" : color,
            width: tool === "eraser" ? 0.06 : 0.008,
            points: [p],
        };
        redrawAll();
    };
    const onPointerMove = (e) => {
        if (!liveRef.current)
            return;
        const p = localPoint(e);
        const last = liveRef.current.points[liveRef.current.points.length - 1];
        // Skip duplicate / near-duplicate points to keep stroke list small.
        const dx = p.x - last.x, dy = p.y - last.y;
        if (dx * dx + dy * dy < 0.000001)
            return;
        liveRef.current.points.push(p);
        // Cheaper redraw: just draw the live stroke incrementally? For now
        // a full redraw is fine — strokes are simple and canvas is small.
        redrawAll();
    };
    const onPointerUp = (e) => {
        if (!liveRef.current)
            return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        const stroke = liveRef.current;
        liveRef.current = null;
        setStrokes((prev) => [...prev, stroke]);
    };
    return (_jsx("canvas", { ref: canvasRef, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, onPointerCancel: onPointerUp, className: cn("absolute inset-0 w-full h-full rounded-lg", tool === "off"
            ? "pointer-events-none"
            : tool === "eraser"
                ? "cursor-cell"
                : "cursor-crosshair"), style: { touchAction: tool === "off" ? "auto" : "none" } }));
}
export function DrawingToolbar({ tool, setTool, color, setColor, onClear, onUndo, hasStrokes }) {
    return (_jsxs("div", { className: "absolute top-2 left-2 z-[120] flex flex-col gap-1 pointer-events-auto", children: [_jsxs("div", { className: "flex flex-col gap-0.5 p-1 rounded-sm bg-liquirice/80 backdrop-blur-md ring-1 ring-flash/10 shadow-[0_4px_14px_rgba(0,0,0,0.55)]", children: [_jsx(ToolBtn, { icon: _jsx(MousePointer2, { className: "w-3.5 h-3.5" }), label: "select", active: tool === "off", onClick: () => setTool("off") }), _jsx(ToolBtn, { icon: _jsx(Pen, { className: "w-3.5 h-3.5" }), label: "draw", active: tool === "pen", onClick: () => setTool("pen") }), _jsx(ToolBtn, { icon: _jsx(Eraser, { className: "w-3.5 h-3.5" }), label: "erase", active: tool === "eraser", onClick: () => setTool("eraser") })] }), tool === "pen" && (_jsx("div", { className: "flex flex-col gap-0.5 p-1 rounded-sm bg-liquirice/80 backdrop-blur-md ring-1 ring-flash/10 shadow-[0_4px_14px_rgba(0,0,0,0.55)]", children: DRAW_COLORS.map((c) => (_jsx("button", { type: "button", onClick: () => setColor(c), className: cn("w-5 h-5 rounded-sm cursor-clicker transition-all", color === c ? "ring-2 ring-flash/70 scale-110" : "ring-1 ring-flash/20 hover:scale-105"), style: { background: c }, title: c }, c))) })), hasStrokes && (_jsxs("div", { className: "flex flex-col gap-0.5 p-1 rounded-sm bg-liquirice/80 backdrop-blur-md ring-1 ring-flash/10 shadow-[0_4px_14px_rgba(0,0,0,0.55)]", children: [_jsx(ToolBtn, { icon: _jsx(Undo2, { className: "w-3.5 h-3.5" }), label: "undo", active: false, onClick: onUndo }), _jsx(ToolBtn, { icon: _jsx(Trash2, { className: "w-3.5 h-3.5" }), label: "clear", active: false, onClick: onClear, danger: true })] }))] }));
}
function ToolBtn({ icon, label, active, onClick, danger, }) {
    return (_jsx("button", { type: "button", onClick: onClick, title: label, className: cn("p-1.5 rounded-sm transition-all cursor-clicker flex items-center justify-center", active
            ? "text-jade bg-jade/15 ring-1 ring-jade/40"
            : danger
                ? "text-flash/55 hover:text-[#d63336] hover:bg-[#d63336]/10"
                : "text-flash/55 hover:text-jade hover:bg-jade/10"), children: icon }));
}
