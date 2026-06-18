// types.ts — the EXPLORER graph contract.
//
// The node editor builds these node data shapes; `compileGraph` (in
// graph.ts) folds the connected nodes into an `ExplorerGraph`, which is the
// exact JSON the backend `/api/explorer/query` compiler consumes.

import type { Role } from "./catalog";

// ── node data (what each node on the canvas holds) ──
export type NodeKind = "subject" | "ally" | "enemy" | "item" | "rune" | "filter" | "output";

export type SubjectData = { kind: "subject"; champion?: string; role?: Role | "" };
export type AllyData = { kind: "ally"; champion?: string; role?: Role | "" };
export type EnemyData = { kind: "enemy"; champion?: string; role?: Role | "" };
export type ItemData = { kind: "item"; itemId?: number };
export type RuneData = { kind: "rune"; keystone?: number };
export type FilterData = {
  kind: "filter";
  scope: "current_patch" | "all";
  tiers: string[];
  queues: number[];
};
export type OutputData = {
  kind: "output";
  mode: "stats" | "rank";
  dimension: "ally" | "enemy" | "item";
  role?: Role | "";
  limit: number;
  minGames: number;
};

export type ExplorerNodeData =
  | SubjectData | AllyData | EnemyData | ItemData | RuneData | FilterData | OutputData;

// ── the compiled graph (sent to the backend) ──
// Item/Rune modules attach to a champion node (subject OR an ally/enemy), so
// each champion carries its own item + keystone constraints.
export type ChampSpec = { champion?: string; role?: Role; items?: number[]; keystones?: number[] };

export type Constraint =
  | ({ type: "ally" } & ChampSpec)
  | ({ type: "enemy" } & ChampSpec);

export type ExplorerGraph = {
  subject: ChampSpec;
  constraints: Constraint[];
  filters: { scope?: "current_patch" | "all"; tiers?: string[]; queues?: number[] };
  output:
    | { kind: "stats" }
    | { kind: "rank"; dimension: "ally" | "enemy" | "item"; role?: Role; limit?: number; minGames?: number };
};

export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  meta: { games: number; ms: number; mode: string; patch?: string };
};
