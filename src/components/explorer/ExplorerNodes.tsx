// ExplorerNodes.tsx — the glass/glow node cards. One component switches on the
// node type; `nodeTypes` maps every kind to it. Dropdowns use the shared
// searchdialog-style pickers; type is chakrapetch throughout.

import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { X, ChevronDown } from "lucide-react";
import { MODULE_GLYPH, type ModuleIcon } from "./module-icons";
import { cn } from "@/lib/utils";
import { champDisplayName } from "@/config";
import { ChampionDialog } from "@/components/champion-dialog";
import { KeystoneDialog } from "@/components/keystone-dialog";
import { getKeystoneIcon, getKeystoneName } from "@/constants/runes";
import {
  ITEMS, ROLES, ROLE_LABEL, champIcon, itemIcon,
} from "./catalog";
import { ExplorerSelect, IconCombobox } from "./Pickers";

type Meta = { label: string; accent: string; Icon: ModuleIcon };
const META: Record<string, Meta> = {
  subject: { label: "SUBJECT", accent: "#00d992", Icon: MODULE_GLYPH.subject },
  ally: { label: "WITH · ALLY", accent: "#36d3ff", Icon: MODULE_GLYPH.ally },
  enemy: { label: "VS · ENEMY", accent: "#ff6286", Icon: MODULE_GLYPH.enemy },
  item: { label: "ITEM", accent: "#FFB615", Icon: MODULE_GLYPH.item },
  rune: { label: "RUNE", accent: "#b483ff", Icon: MODULE_GLYPH.rune },
  filter: { label: "FILTER", accent: "#d7d8d9", Icon: MODULE_GLYPH.filter },
  output: { label: "OUTPUT", accent: "#00d992", Icon: MODULE_GLYPH.output },
};

// ── option sets (built once) ──
const ITEM_OPTS = ITEMS.map((it) => ({ value: String(it.id), label: it.name }));
const ROLE_OPTS = [{ value: "", label: "Any role" }, ...ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))];
const SCOPE_OPTS = [{ value: "current_patch", label: "Current patch · fast" }, { value: "all", label: "All patches · season" }];
const TIER_OPTS = [{ value: "", label: "All ranks" }, { value: "CHALLENGER,GRANDMASTER,MASTER", label: "Master+" }, { value: "CHALLENGER,GRANDMASTER", label: "GM+" }, { value: "CHALLENGER", label: "Challenger" }];
const QUEUE_OPTS = [{ value: "420,440", label: "Ranked · Solo+Flex" }, { value: "420", label: "Solo / Duo" }, { value: "440", label: "Flex" }];
const MODE_OPTS = [{ value: "stats", label: "Winrate + stats" }, { value: "rank", label: "Top-N ranking" }];
const DIM_OPTS = [{ value: "ally", label: "Allies · e.g. supports" }, { value: "enemy", label: "Enemies · matchups" }, { value: "item", label: "Items" }];

const itemIconFromValue = (v: string) => itemIcon(Number(v));

const dotStyle = (accent: string): React.CSSProperties => ({
  width: 11, height: 11, background: "#05100d",
  border: `2px solid ${accent}`, boxShadow: `0 0 7px ${accent}aa`,
});

const numCls =
  "nodrag w-full h-8 bg-black/40 border border-jade/25 rounded-[4px] px-2 " +
  "font-chakrapetch text-[12px] text-flash outline-none focus:border-jade/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[8px] font-chakrapetch font-semibold tracking-[0.14em] uppercase text-flash/35">{label}</span>
      {children}
    </label>
  );
}

export function ExplorerNode({ id, type, data, selected }: NodeProps) {
  const rf = useReactFlow();
  const set = (patch: Record<string, unknown>) => rf.updateNodeData(id, patch);
  const meta = META[type as string] ?? META.subject;
  const d = data as any;
  // champion nodes accept Item/Rune attachments; everything still feeds Output
  const hasIn = type === "output" || type === "subject" || type === "ally" || type === "enemy";
  const hasOut = type !== "output";

  return (
    <div
      className={cn(
        "group relative w-[224px] rounded-[7px] border bg-[rgba(8,14,16,0.86)] backdrop-blur-md transition-colors",
        selected ? "border-transparent" : "border-white/10"
      )}
      style={{
        boxShadow: selected
          ? `0 0 0 1px ${meta.accent}, 0 8px 30px rgba(0,0,0,.55), 0 0 22px ${meta.accent}33`
          : "0 8px 26px rgba(0,0,0,.5)",
      }}
    >
      {/* accent header */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-[7px]"
        style={{ background: `linear-gradient(90deg, ${meta.accent}22, transparent)`, borderBottom: `1px solid ${meta.accent}33` }}
      >
        <meta.Icon size={12} style={{ color: meta.accent }} />
        <span className="text-[10px] font-chakrapetch font-bold tracking-[0.16em]" style={{ color: meta.accent }}>
          {meta.label}
        </span>
        {/* remove module — anchored right inside the header, shown on node hover */}
        <button
          type="button"
          title="Remove module"
          onClick={(e) => { e.stopPropagation(); rf.deleteElements({ nodes: [{ id }] }); }}
          className="nodrag nopan ml-auto -mr-1 grid place-items-center w-4 h-4 rounded-[3px] text-flash/45 opacity-0 group-hover:opacity-100 hover:text-error hover:bg-error/10 transition-all cursor-clicker"
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* body */}
      <div className="flex flex-col gap-2 p-2.5">
        {(type === "subject" || type === "ally" || type === "enemy") && (
          <>
            <Field label="Champion">
              <ChampionDialog
                value={d.champion || null}
                onSelect={(c) => set({ champion: c.slug })}
                title="Select champion"
                trigger={
                  <button
                    className={cn(
                      "nodrag group w-full h-9 px-2 gap-2 rounded-[4px] cursor-clicker outline-none flex items-center border bg-black/40 backdrop-blur-lg transition-all duration-200",
                      d.champion ? "border-jade/30 hover:border-jade/50" : "border-white/10 hover:border-white/20"
                    )}
                  >
                    {d.champion ? (
                      <img src={champIcon(d.champion)} className="w-6 h-6 rounded-[3px] border border-white/10 shrink-0" alt="" draggable={false} />
                    ) : (
                      <div className="w-6 h-6 rounded-[3px] bg-black/40 border border-white/10 shrink-0" />
                    )}
                    <span className={cn("flex-1 text-left truncate font-chakrapetch text-[12px]", d.champion ? "text-flash" : "text-flash/40")}>
                      {d.champion ? champDisplayName(d.champion) : "Pick a champion"}
                    </span>
                    <ChevronDown className="w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                }
              />
            </Field>
            <Field label="Role">
              <ExplorerSelect value={d.role ?? ""} onChange={(v) => set({ role: v })} options={ROLE_OPTS} placeholder="Any role" />
            </Field>
          </>
        )}

        {type === "item" && (
          <Field label="Item">
            <IconCombobox value={d.itemId ? String(d.itemId) : undefined} onChange={(v) => set({ itemId: Number(v) || undefined })} options={ITEM_OPTS} icon={itemIconFromValue} placeholder="Pick an item" />
          </Field>
        )}

        {type === "rune" && (
          <Field label="Keystone">
            <KeystoneDialog
              selectedKeystone={d.keystone ?? null}
              onSelect={(_treeId, keystoneId) => set({ keystone: keystoneId })}
              trigger={
                <button
                  className={cn(
                    "nodrag group w-full h-9 px-2 gap-2 rounded-[4px] cursor-clicker outline-none flex items-center border bg-black/40 backdrop-blur-lg transition-all duration-200",
                    d.keystone ? "border-jade/30 hover:border-jade/50" : "border-white/10 hover:border-white/20"
                  )}
                >
                  {d.keystone && getKeystoneIcon(d.keystone) ? (
                    <img src={getKeystoneIcon(d.keystone)!} className="w-6 h-6 rounded-full border border-white/10 shrink-0" alt="" draggable={false} />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-black/40 border border-white/10 shrink-0" />
                  )}
                  <span className={cn("flex-1 text-left truncate font-chakrapetch text-[12px]", d.keystone ? "text-flash" : "text-flash/40")}>
                    {d.keystone ? (getKeystoneName(d.keystone) ?? "Keystone") : "Pick a keystone"}
                  </span>
                  <ChevronDown className="w-3 h-3 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              }
            />
          </Field>
        )}

        {type === "filter" && (
          <>
            <Field label="Scope">
              <ExplorerSelect value={d.scope ?? "current_patch"} onChange={(v) => set({ scope: v })} options={SCOPE_OPTS} />
            </Field>
            <Field label="Tier">
              <ExplorerSelect value={(d.tiers ?? []).join(",")} onChange={(v) => set({ tiers: v ? v.split(",") : [] })} options={TIER_OPTS} placeholder="All ranks" />
            </Field>
            <Field label="Queue">
              <ExplorerSelect value={(d.queues ?? [420, 440]).join(",")} onChange={(v) => set({ queues: v.split(",").map(Number) })} options={QUEUE_OPTS} />
            </Field>
          </>
        )}

        {type === "output" && (
          <>
            <Field label="Result">
              <ExplorerSelect value={d.mode ?? "stats"} onChange={(v) => set({ mode: v })} options={MODE_OPTS} />
            </Field>
            {d.mode === "rank" && (
              <>
                <Field label="Rank by">
                  <ExplorerSelect value={d.dimension ?? "ally"} onChange={(v) => set({ dimension: v })} options={DIM_OPTS} />
                </Field>
                {(d.dimension ?? "ally") !== "item" && (
                  <Field label="Restrict role">
                    <ExplorerSelect value={d.role ?? ""} onChange={(v) => set({ role: v })} options={ROLE_OPTS} placeholder="Any role" />
                  </Field>
                )}
                <div className="flex gap-2">
                  <Field label="Top N">
                    <input type="number" min={1} max={50} className={numCls} value={d.limit ?? 5}
                      onChange={(e) => set({ limit: Math.max(1, Math.min(50, Number(e.target.value) || 5)) })} />
                  </Field>
                  <Field label="Min games">
                    <input type="number" min={1} className={numCls} value={d.minGames ?? 5}
                      onChange={(e) => set({ minGames: Math.max(1, Number(e.target.value) || 5) })} />
                  </Field>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {hasIn && <Handle type="target" position={Position.Left} style={dotStyle(meta.accent)} />}
      {hasOut && <Handle type="source" position={Position.Right} style={dotStyle(meta.accent)} />}
    </div>
  );
}

export const nodeTypes = {
  subject: ExplorerNode, ally: ExplorerNode, enemy: ExplorerNode,
  item: ExplorerNode, rune: ExplorerNode, filter: ExplorerNode, output: ExplorerNode,
};
