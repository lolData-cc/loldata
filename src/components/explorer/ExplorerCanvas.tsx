// ExplorerCanvas.tsx — the node-based query builder (Learn ▸ EXPLORER).
//
// Full-bleed canvas grid; floating UI (palette, run, zoom, minimap) is locked
// to the page content column so nothing hugs the screen edge. v1 runs on mock
// data; the same compiled graph will hit /api/explorer/query once wired.

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant,
  addEdge, useNodesState, useEdgesState, useReactFlow, type Connection, type Edge, type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./explorer.css";
import { Play, Loader2, X, Plus, Minus, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { showCyberToast } from "@/lib/toast-utils";
import { DiamondButton } from "@/components/ui/diamond-button";
import { MODULE_GLYPH, type ModuleIcon } from "./module-icons";
import { nodeTypes } from "./ExplorerNodes";
import { edgeTypes } from "./GlowEdge";
import { compileGraph, runQuery } from "./graph";
import { champIcon, itemIcon, itemName } from "./catalog";
import type { ExplorerGraph, QueryResult } from "./types";

const DEFAULTS: Record<string, Record<string, unknown>> = {
  subject: { champion: "", role: "" },
  ally: { champion: "", role: "" },
  enemy: { champion: "", role: "" },
  item: { itemId: undefined },
  rune: { keystone: undefined },
  filter: { scope: "current_patch", tiers: ["CHALLENGER", "GRANDMASTER", "MASTER"], queues: [420, 440] },
  output: { mode: "rank", dimension: "ally", role: "UTILITY", limit: 5, minGames: 5 },
};

const PALETTE: { kind: string; label: string; Icon: ModuleIcon; accent: string }[] = [
  { kind: "subject", label: "Subject", Icon: MODULE_GLYPH.subject, accent: "#00d992" },
  { kind: "ally", label: "Ally", Icon: MODULE_GLYPH.ally, accent: "#36d3ff" },
  { kind: "enemy", label: "Enemy", Icon: MODULE_GLYPH.enemy, accent: "#ff6286" },
  { kind: "item", label: "Item", Icon: MODULE_GLYPH.item, accent: "#FFB615" },
  { kind: "rune", label: "Rune", Icon: MODULE_GLYPH.rune, accent: "#b483ff" },
  { kind: "filter", label: "Filter", Icon: MODULE_GLYPH.filter, accent: "#d7d8d9" },
  { kind: "output", label: "Output", Icon: MODULE_GLYPH.output, accent: "#00d992" },
];

// start empty — a centered "+" CTA shows until the first node lands
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

function Canvas({ onBack }: { onBack?: () => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [result, setResult] = useState<{ res: QueryResult; graph: ExplorerGraph } | null>(null);
  const [running, setRunning] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const idRef = useRef(10);
  const rf = useReactFlow();

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, type: "glow" }, eds)),
    [setEdges]
  );

  // Topology guard: ally/enemy/item/rune/filter attach to the SUBJECT (and
  // items/runes may also attach to an ally/enemy). Only the Subject may feed the
  // Output — wiring an ally straight into the Output yields a graph that won't run.
  const isValidConnection = useCallback(
    (c: Connection | Edge) => {
      const s = nodes.find((n) => n.id === c.source)?.type;
      const t = nodes.find((n) => n.id === c.target)?.type;
      if (!s || !t) return false;
      if (t === "output") return s === "subject" || s === "filter";
      if (t === "subject") return s === "ally" || s === "enemy" || s === "item" || s === "rune" || s === "filter";
      if (t === "ally" || t === "enemy") return s === "item" || s === "rune";
      return false;
    },
    [nodes]
  );

  // Add a node — at the right-click spot if given, else a default position.
  const addNode = (kind: string, screen?: { x: number; y: number }) => {
    const id = `${kind}-${++idRef.current}`;
    const position = screen
      ? rf.screenToFlowPosition(screen)
      : { x: 200 + Math.random() * 140, y: 130 + Math.random() * 120 };
    setNodes((ns) => [...ns, { id, type: kind, position, data: { ...DEFAULTS[kind] } }]);
    setCtx(null);
  };

  const run = async () => {
    const { graph, error } = compileGraph(nodes as any, edges);
    if (error || !graph) {
      showCyberToast({ title: error ?? "Invalid graph", tag: "Explorer", variant: "error" });
      return;
    }
    setRunning(true);
    try {
      const res = await runQuery(graph);
      setResult({ res, graph });
    } catch (e: any) {
      showCyberToast({
        title: "Query failed",
        description: e?.message || "Is the backend running?",
        tag: "Explorer",
        variant: "error",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#05090b]"
      onContextMenu={(e) => {
        // override the native browser menu everywhere on the canvas (pane, nodes,
        // empty-state, controls) with our custom one — but keep native on text fields
        if ((e.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) return;
        e.preventDefault();
        setCtx({ x: e.clientX, y: e.clientY });
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "glow" }}
        defaultViewport={{ x: 90, y: 70, zoom: 0.72 }}
        minZoom={0.3}
        maxZoom={1.6}
        onPaneClick={() => setCtx(null)}
        proOptions={{ hideAttribution: true }}
        className="explorer-flow"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="rgba(0,217,146,0.13)" />
      </ReactFlow>

      {/* floating UI — controls aligned to the content-column edges, in tune:
          a single diamond rail center-left (back + zoom), run top-right. */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        <div className="relative h-full w-[65%] mx-auto">
          {/* run — primary action, top right */}
          <div className="absolute top-3 right-0 pointer-events-auto">
            <button
              onClick={run}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-[5px] font-chakrapetch text-[12px] font-bold tracking-[0.1em] uppercase text-jade border border-jade/40 bg-jade/10 hover:bg-jade/20 transition-all cursor-clicker disabled:opacity-50"
              style={{ boxShadow: "0 0 16px rgba(0,217,146,0.2)" }}
            >
              {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {running ? "Crunching…" : "Run query"}
            </button>
          </div>

          {/* back — primary, prominent diamond, center-left */}
          {onBack && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-auto">
              <DiamondButton icon="back" onClick={onBack} aria-label="Back to Learn" />
            </div>
          )}

          {/* zoom — secondary, compact horizontal bar, bottom-left */}
          <div className="absolute bottom-4 left-0 pointer-events-auto flex items-center gap-1 rounded-[7px] border border-white/10 bg-[rgba(8,14,16,0.8)] backdrop-blur-md p-1 shadow-[0_6px_18px_rgba(0,0,0,0.4)]">
            <button onClick={() => rf.zoomIn({ duration: 200 })} aria-label="Zoom in" className="grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker"><Plus size={14} /></button>
            <button onClick={() => rf.zoomOut({ duration: 200 })} aria-label="Zoom out" className="grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker"><Minus size={14} /></button>
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            <button onClick={() => rf.fitView({ duration: 300, padding: 0.2 })} aria-label="Fit view" className="grid place-items-center w-7 h-7 rounded-[5px] text-flash/45 hover:text-jade hover:bg-jade/10 transition-colors cursor-clicker"><Maximize size={12} /></button>
          </div>
        </div>
      </div>

      {/* empty state — centered + with quick-add chips */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-5 pointer-events-auto">
            <button
              type="button"
              onClick={() => setCtx({ x: window.innerWidth / 2, y: window.innerHeight / 2 })}
              aria-label="Add module"
              className="group relative flex items-center justify-center w-16 h-16 rounded-full border border-jade/40 bg-jade/[0.08] hover:bg-jade/[0.15] hover:border-jade/70 transition-all cursor-clicker"
              style={{ boxShadow: "0 0 22px rgba(0,217,146,0.18)" }}
            >
              <Plus size={26} className="text-jade transition-transform duration-200 group-hover:scale-110" />
              <span className="absolute inset-[-6px] rounded-full border border-jade/25 animate-ping pointer-events-none" />
            </button>
            <div className="text-center">
              <p className="text-[15px] font-chakrapetch font-bold text-flash tracking-wide">Build a query from modules</p>
              <p className="text-[12px] font-chakrapetch text-flash/60 mt-1.5">
                Start with a <span className="text-jade font-semibold">Subject</span>, wire in constraints → an <span className="text-jade font-semibold">Output</span>
              </p>
              <p className="text-[10px] font-chakrapetch text-flash/45 mt-2 tracking-wide">Click ＋ or right-click the canvas to add modules</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-[440px]">
              {PALETTE.map((p) => (
                <button
                  key={p.kind}
                  onClick={() => addNode(p.kind)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] border border-white/10 bg-[rgba(8,14,16,0.82)] hover:bg-white/[0.06] hover:border-white/20 transition-colors cursor-clicker"
                >
                  <p.Icon size={12} style={{ color: p.accent }} />
                  <span className="text-[11px] font-chakrapetch text-flash/75">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* right-click context menu — add a node where you clicked */}
      {ctx && (
        <>
          <div
            className="fixed inset-0 z-[8]"
            onClick={() => setCtx(null)}
            onContextMenu={(e) => { e.preventDefault(); setCtx(null); }}
          />
          <div
            className="explorer-surface outline-none fixed z-[9] w-[248px] p-2 rounded-[8px] border border-jade/25 bg-[rgba(6,12,14,0.97)] backdrop-blur-xl shadow-[0_16px_44px_rgba(0,0,0,0.7)] animate-in fade-in-0 zoom-in-95 duration-100"
            style={{ left: Math.min(ctx.x, window.innerWidth - 260), top: Math.min(ctx.y, window.innerHeight - 220) }}
          >
            <div className="px-1 pb-1.5 mb-1.5 border-b border-white/[0.07] text-[8px] font-chakrapetch font-semibold tracking-[0.18em] uppercase text-jade/55">Add module</div>
            <div className="grid grid-cols-2 gap-1">
              {PALETTE.map((p) => (
                <button
                  key={p.kind}
                  onClick={() => addNode(p.kind, ctx)}
                  className="group flex items-center gap-2 px-2 py-2 rounded-[5px] border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.07] hover:border-white/15 transition-colors cursor-clicker text-left"
                >
                  <span className="grid place-items-center w-5 h-5 rounded-[4px] shrink-0" style={{ background: `${p.accent}1f` }}>
                    <p.Icon size={12} style={{ color: p.accent }} />
                  </span>
                  <span className="text-[11px] font-chakrapetch text-flash/75 group-hover:text-flash">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* results */}
      {result && <ResultsPanel data={result.res} graph={result.graph} onClose={() => setResult(null)} />}
    </div>
  );
}

function ResultsPanel({ data, graph, onClose }: { data: QueryResult; graph: ExplorerGraph; onClose: () => void }) {
  const isRank = data.columns.includes("dimension");
  const isItemDim = isRank && graph.output.kind === "rank" && graph.output.dimension === "item";
  const stat = data.rows[0] as Record<string, number | null> | undefined;
  // 0-game combos come back with null aggregates (avg_gold/winrate = null) —
  // an empty state avoids calling .toLocaleString() on null (which blanked the page).
  const empty = isRank ? data.rows.length === 0 : !stat || Number(stat.games) === 0;
  // the rank band the result was filtered to (from the Filter module's tiers)
  const rank = (() => {
    const t = graph.filters?.tiers;
    if (!t?.length) return null;
    const s = new Set(t);
    if (s.has("MASTER")) return "Master+";
    if (s.has("GRANDMASTER")) return "GM+";
    if (s.has("CHALLENGER")) return "Challenger";
    return t[0];
  })();

  return (
    <div className="absolute top-0 right-0 h-full w-[320px] border-l border-jade/15 bg-[rgba(5,10,12,0.94)] backdrop-blur-xl flex flex-col animate-[slideIn_0.25s_ease] z-[5]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex flex-col">
          <span className="text-[10px] font-chakrapetch font-semibold tracking-[0.22em] uppercase text-jade/65">Result</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[19px] font-chakrapetch font-bold tabular-nums leading-none text-flash">{data.meta.games.toLocaleString()}</span>
            <span className="text-[9px] font-chakrapetch uppercase tracking-[0.18em] text-flash/40 -ml-0.5">games</span>
            <span className="px-2 py-0.5 rounded-[4px] bg-jade/10 border border-jade/30 text-[9px] font-chakrapetch font-bold uppercase tracking-[0.12em] text-jade">
              {data.meta.mode === "all" ? "all patches" : data.meta.patch ? `patch ${data.meta.patch}` : "current patch"}
            </span>
            {rank && (
              <span className="px-2 py-0.5 rounded-[4px] bg-citrine/10 border border-citrine/30 text-[9px] font-chakrapetch font-bold uppercase tracking-[0.12em] text-citrine">
                {rank}
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-flash/40 hover:text-flash cursor-clicker"><X size={15} /></button>
      </div>

      <div className="flex-1 overflow-y-auto cyber-scrollbar p-4">
        {graph.subject.champion && (
          <div className="flex items-center gap-2 mb-4">
            <img src={champIcon(graph.subject.champion)} className="w-8 h-8 rounded-[4px] border border-jade/30" alt="" />
            <div className="flex flex-col">
              <span className="text-[13px] font-chakrapetch font-semibold text-flash">{graph.subject.champion}</span>
              <span className="text-[9px] font-chakrapetch text-flash/35 uppercase tracking-wider">
                {graph.constraints.length} constraint{graph.constraints.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        )}

        {empty ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-3 gap-2.5">
            <span className="text-[30px] leading-none text-jade/40">∅</span>
            <span className="text-[12px] font-chakrapetch text-flash/70">No games match this combo</span>
            <span className="text-[10px] font-chakrapetch text-flash/35 leading-relaxed">
              Each item, rune, and ally narrows the pool — remove a constraint or widen the scope to All patches.
            </span>
          </div>
        ) : !isRank ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col items-center py-3 rounded-[6px] border border-jade/15 bg-jade/[0.04]">
              <span className="text-[42px] leading-none font-chakrapetch font-bold tabular-nums text-jade">{stat!.winrate ?? 0}%</span>
              <span className="text-[9px] font-chakrapetch tracking-[0.2em] uppercase text-flash/40 mt-1.5">winrate</span>
            </div>
            {(() => {
              const k = Number(stat!.avg_kills ?? 0), d = Number(stat!.avg_deaths ?? 0), a = Number(stat!.avg_assists ?? 0);
              const ratio = d > 0 ? (k + a) / d : k + a;
              const rc = ratio >= 5 ? "#FFB615" : ratio >= 3 ? "#00d992" : ratio >= 2 ? "#d7d8d9" : "#8a9096";
              return (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-[6px] border border-white/[0.07] bg-black/30">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-chakrapetch tracking-[0.16em] uppercase text-flash/35">Avg · kills / deaths / assists</span>
                    <div className="flex items-baseline gap-1.5 font-chakrapetch tabular-nums text-[18px] leading-none">
                      <span className="text-flash">{k.toFixed(1)}</span>
                      <span className="text-flash/25 text-[12px]">/</span>
                      <span className="text-error/80">{d.toFixed(1)}</span>
                      <span className="text-flash/25 text-[12px]">/</span>
                      <span className="text-flash">{a.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end leading-none pl-3 border-l border-white/[0.06]">
                    <span className="text-[24px] font-bold font-chakrapetch tabular-nums" style={{ color: rc }}>{ratio.toFixed(2)}</span>
                    <span className="text-[8px] font-chakrapetch tracking-[0.18em] uppercase text-flash/35 mt-1.5">KDA</span>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Avg CS", Number(stat!.avg_cs ?? 0).toLocaleString()],
                ["Avg Gold", Number(stat!.avg_gold ?? 0).toLocaleString()],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 px-2.5 py-2 rounded-[5px] border border-white/[0.07] bg-black/30">
                  <span className="text-[8px] font-chakrapetch tracking-[0.16em] uppercase text-flash/35">{k}</span>
                  <span className="text-[14px] font-chakrapetch text-flash tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {data.rows.map((r, i) => {
              const raw = r.dimension as string | number;
              const icon = isItemDim ? itemIcon(Number(raw)) : champIcon(String(raw));
              const label = isItemDim ? itemName(Number(raw)) : String(raw);
              const wr = Number(r.winrate);
              return (
                <div key={String(raw)} className="flex items-center gap-2.5 px-2 py-1.5 rounded-[5px] hover:bg-white/[0.04]">
                  <span className="text-[10px] font-chakrapetch text-flash/30 w-4 tabular-nums">{i + 1}</span>
                  <img src={icon} onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} className="w-7 h-7 rounded-[4px] border border-white/10" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-chakrapetch text-flash truncate">{label}</span>
                      <span className={cn("text-[12px] font-chakrapetch tabular-nums", wr >= 50 ? "text-jade" : "text-error")}>{wr}%</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, wr)}%`, background: wr >= 50 ? "#00d992" : "#ff6286" }} />
                    </div>
                  </div>
                  <span className="text-[9px] font-chakrapetch text-flash/30 tabular-nums w-9 text-right">{Number(r.games)}g</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExplorerCanvas({ onBack }: { onBack?: () => void }) {
  return (
    <ReactFlowProvider>
      <Canvas onBack={onBack} />
    </ReactFlowProvider>
  );
}
