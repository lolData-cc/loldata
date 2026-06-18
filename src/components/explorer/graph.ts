// graph.ts — fold the canvas (nodes + edges) into an ExplorerGraph, and a
// mock runner so the editor is fully alive before the backend endpoint lands.
//
// Topology: constraints + filter wire INTO the Subject; the Subject wires INTO
// the Output. compileGraph walks Output ← Subject ← {constraints, filter}.

import type { Node, Edge } from "@xyflow/react";
import type { ExplorerGraph, ExplorerNodeData, OutputData, QueryResult } from "./types";
import { CHAMPIONS, ITEMS } from "./catalog";
import { API_BASE_URL } from "@/config";

/** POST the compiled graph to the live query engine. Throws on error (the
 *  backend returns { error } with a friendly message). */
export async function runQuery(graph: ExplorerGraph): Promise<QueryResult> {
  const res = await fetch(`${API_BASE_URL}/api/explorer/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (json?.error) throw new Error(json.error);
  return json as QueryResult;
}

type N = Node<ExplorerNodeData>;

export function compileGraph(
  nodes: N[],
  edges: Edge[]
): { graph?: ExplorerGraph; error?: string } {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const inputsOf = (id: string) =>
    edges.filter((e) => e.target === id).map((e) => byId.get(e.source)).filter((n): n is N => !!n);

  // Item / Rune modules wired INTO a champion (or the Output) node.
  const attach = (id: string) => {
    const a = inputsOf(id);
    return {
      items: a.filter((n) => n.type === "item" && (n.data as any).itemId).map((n) => (n.data as any).itemId as number),
      keystones: a.filter((n) => n.type === "rune" && (n.data as any).keystone).map((n) => (n.data as any).keystone as number),
    };
  };

  const output = nodes.find((n) => n.type === "output");
  if (!output) return { error: "Add an Output node" };

  const outInputs = inputsOf(output.id);
  const subjectNode = outInputs.find((n) => n.type === "subject");
  if (!subjectNode) return { error: "Connect a Subject → Output" };
  const sd = subjectNode.data as any;
  if (!sd.champion) return { error: "Pick a champion on the Subject" };

  // subject's items/runes = wired into it, plus any wired straight to Output
  const sAtt = attach(subjectNode.id);
  const oAtt = attach(output.id);
  const graph: ExplorerGraph = {
    subject: {
      champion: sd.champion,
      role: sd.role || undefined,
      items: [...sAtt.items, ...oAtt.items],
      keystones: [...sAtt.keystones, ...oAtt.keystones],
    },
    constraints: [],
    filters: {},
    output: { kind: "stats" },
  };

  // ally / enemy / filter modules may be wired into the Output OR straight into
  // the Subject (the Subject accepts inputs too). Gather constraint nodes from
  // both, deduped by id, so an ally attached to the Subject still counts.
  const constraintNodes = [...outInputs, ...inputsOf(subjectNode.id)].filter(
    (n, i, arr) => arr.findIndex((m) => m.id === n.id) === i
  );
  for (const n of constraintNodes) {
    const d = n.data as any;
    if ((n.type === "ally" || n.type === "enemy") && d.champion) {
      const a = attach(n.id);
      graph.constraints.push({ type: n.type, champion: d.champion, role: d.role || undefined, items: a.items, keystones: a.keystones });
    } else if (n.type === "filter") {
      graph.filters = { scope: d.scope, tiers: d.tiers, queues: d.queues };
    }
  }

  const od = output.data as OutputData;
  graph.output =
    od.mode === "rank"
      ? { kind: "rank", dimension: od.dimension, role: od.role || undefined, limit: od.limit, minGames: od.minGames }
      : { kind: "stats" };

  return { graph };
}

// deterministic pseudo-random in [0,1) from a string (so mock data is stable)
function seed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/** Plausible fake results — replaced by the real /api/explorer/query fetch. */
export function mockRun(graph: ExplorerGraph): QueryResult {
  const key = JSON.stringify(graph);
  const constraintTightness =
    (graph.subject.items?.length ?? 0) +
    (graph.subject.keystones?.length ?? 0) +
    graph.constraints.length +
    graph.constraints.reduce((s, c) => s + (c.items?.length ?? 0) + (c.keystones?.length ?? 0), 0);
  const baseGames = Math.round(8000 / Math.pow(3, constraintTightness) * (0.6 + seed(key)));

  if (graph.output.kind === "rank") {
    const pool =
      graph.output.dimension === "item"
        ? ITEMS.map((i) => i.name)
        : CHAMPIONS;
    const n = Math.min(graph.output.limit ?? 10, 12);
    const picks = [...pool]
      .sort((a, b) => seed(b + key) - seed(a + key))
      .slice(0, n)
      .map((name, i) => ({
        dimension: name,
        games: Math.max(graph.output.kind === "rank" ? graph.output.minGames ?? 5 : 5, Math.round(baseGames / (i + 2) * (0.4 + seed(name)))),
        winrate: Math.round((68 - i * 1.6 + (seed(name + "wr") - 0.5) * 6) * 10) / 10,
      }))
      .sort((a, b) => b.winrate - a.winrate);
    return {
      columns: ["dimension", "games", "winrate"],
      rows: picks,
      meta: { games: baseGames, ms: Math.round(120 + seed(key) * 400), mode: graph.filters.scope ?? "current_patch" },
    };
  }

  const wr = Math.round((46 + seed(key) * 10) * 100) / 100;
  return {
    columns: ["games", "winrate", "avg_kills", "avg_deaths", "avg_assists", "avg_cs", "avg_gold"],
    rows: [{
      games: baseGames,
      winrate: wr,
      avg_kills: Math.round((5 + seed(key + "k") * 6) * 10) / 10,
      avg_deaths: Math.round((4 + seed(key + "d") * 4) * 10) / 10,
      avg_assists: Math.round((6 + seed(key + "a") * 8) * 10) / 10,
      avg_cs: Math.round((180 + seed(key + "cs") * 80) * 10) / 10,
      avg_gold: Math.round(11000 + seed(key + "g") * 5000),
    }],
    meta: { games: baseGames, ms: Math.round(120 + seed(key) * 400), mode: graph.filters.scope ?? "current_patch" },
  };
}
