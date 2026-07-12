import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useImprovementTree, type TreeData, type TreeNode } from "@/hooks/useImprovementTree"
import { PathSelection } from "./PathSelection"
import { TreeCanvas } from "./TreeCanvas"
import { TreeLoader } from "./TreeLoader"
import { NodeDetail, HubDetail, type HubRow } from "./NodeDetail"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = { puuid: string | null; region: string | null; nametag: string | null }

// ── R3F guard: if WebGL blows up, drop to the 2D board instead of a blank canvas
class TreeBoundary extends React.Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: any) { console.warn("[improvement-tree] fell back to 2D:", err?.message ?? err) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

const DOT = { complete: "bg-jade", progress: "bg-[#FFB615]", locked: "bg-flash/25" } as const

function Board2D({ data, onSelect }: { data: TreeData; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 p-4">
      {data.categories.map((cat) => (
        <div key={cat.id} className="rounded-md bg-filmdark/30 p-3 shadow-[inset_0_0_0_1px_rgba(0,217,146,0.1)]">
          <p className="font-chakrapetch font-bold text-[12px] uppercase tracking-[0.1em] text-flash/85 mb-2.5">{cat.title}</p>
          <div className="space-y-2">
            {data.nodes.filter((n) => n.category === cat.id).map((n) => {
              const fill = n.threshold > 0 ? Math.min(1, n.progress / n.threshold) : n.progress
              return (
                <button key={n.id} onClick={() => onSelect(n.id)} className="w-full text-left cursor-clicker group">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT[n.state])} />
                    <span className="font-jetbrains text-[11px] text-flash/70 group-hover:text-flash/95 truncate">{n.title}</span>
                    <span className="ml-auto font-mono text-[9px] text-flash/35 tabular-nums">{Math.round(n.progress * 100)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-black/50 overflow-hidden">
                    <div className={cn("h-full rounded-full", n.state === "complete" ? "bg-jade" : n.state === "progress" ? "bg-[#FFB615]" : "bg-flash/20")} style={{ width: `${fill * 100}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ImprovementTree({ puuid, region }: Props) {
  const { data, loading, error, choosePath } = useImprovementTree(puuid, region)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reselecting, setReselecting] = useState(false)

  const header = (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2.5">
        <span className="inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" />
        <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-jade/55">Improvement Tree</span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="shrink-0 mx-auto w-full lg:w-[65%] px-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" />
            <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-jade/55">Improvement Tree</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <TreeLoader />
        </div>
      </div>
    )
  }
  if (error || !data) {
    return <>{header}<div className="flex items-center justify-center h-48"><span className="text-flash/40 font-mono text-sm">Failed to load the Improvement Tree</span></div></>
  }

  // first visit (or "change path") → choose a path
  if (data.needsPathSelection || reselecting) {
    return <PathSelection onChoose={(role) => { setReselecting(false); choosePath(role) }} />
  }

  // path chosen but its tree isn't built yet
  if (data.comingSoon) {
    return (
      <>{header}
        <div className="flex flex-col items-center justify-center h-[420px] gap-4 text-center">
          <div className="w-14 h-14 rounded-lg bg-jade/[0.06] flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(0,217,146,0.2)]"><Sparkles className="text-jade/70" size={24} /></div>
          <div>
            <p className="font-chakrapetch font-bold text-[18px] text-flash/90">The {data.role} tree is coming soon</p>
            <p className="font-jetbrains text-[12px] text-flash/45 mt-1">The Path of the Jungle is fully live — pick it to see the tree in action.</p>
          </div>
          <button onClick={() => setReselecting(true)} className="cursor-clicker inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-jade/80 hover:text-jade bg-jade/[0.08] px-3.5 py-2 rounded-[4px] shadow-[inset_0_0_0_1px_rgba(0,217,146,0.3)]">
            <RotateCcw size={12} /> Choose another path
          </button>
        </div>
      </>
    )
  }

  const completeCount = data.nodes.filter((n) => n.state === "complete").length

  // a node click can land on a leaf skill, a category hub, or the root
  const selectedLeaf: TreeNode | null = data.nodes.find((n) => n.id === selectedId) ?? null
  const selectedCat = selectedId?.startsWith("cat:") ? data.categories.find((c) => `cat:${c.id}` === selectedId) : null
  const isRoot = selectedId === "root"
  const catRows: HubRow[] = selectedCat
    ? data.nodes.filter((n) => n.category === selectedCat.id).map((n) => ({ id: n.id, label: n.title, state: n.state, progress: n.progress }))
    : []
  const rootRows: HubRow[] = isRoot
    ? data.categories.map((c) => {
        const kids = data.nodes.filter((n) => n.category === c.id)
        const done = kids.filter((k) => k.state === "complete").length
        const anyProg = kids.some((k) => k.state !== "locked")
        const state = kids.length && done === kids.length ? "complete" : anyProg ? "progress" : "locked"
        return { id: `cat:${c.id}`, label: c.title, state: state as HubRow["state"], progress: done / Math.max(1, kids.length) }
      })
    : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="h-full flex flex-col">
      {/* header row — locked to the 65% content column */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2 shrink-0 mx-auto w-full lg:w-[65%] px-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-block w-1.5 h-1.5 rotate-45 bg-jade/70 shadow-[0_0_8px_rgba(0,217,146,0.8)]" />
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-jade/55">Improvement Tree</span>
          </div>
          <h2 className="font-chakrapetch font-bold text-[24px] md:text-[28px] text-flash/95 leading-tight">{data.title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-chakrapetch font-bold text-[22px] tabular-nums text-jade leading-none">{completeCount}<span className="text-flash/30 text-[14px]">/{data.nodes.length}</span></div>
            <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-flash/35">skills mastered</span>
          </div>
          <button onClick={() => { setSelectedId(null); setReselecting(true) }} title="Change path" className="cursor-clicker rounded-[4px] p-2 text-flash/40 hover:text-jade hover:bg-jade/[0.06] transition-colors shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* the tree — floating, no box; fills the page height */}
      <div className="relative flex-1 min-h-0">
        <TreeBoundary fallback={<div className="w-full h-full overflow-y-auto no-scrollbar"><Board2D data={data} onSelect={setSelectedId} /></div>}>
          <TreeCanvas data={data} selectedId={selectedId} onSelect={setSelectedId} />
        </TreeBoundary>

        <AnimatePresence>
          {selectedLeaf && <NodeDetail key={selectedLeaf.id} node={selectedLeaf} onClose={() => setSelectedId(null)} />}
          {selectedCat && <HubDetail key={selectedCat.id} eyebrow="Category" title={selectedCat.title} subtitle={selectedCat.blurb} rows={catRows} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />}
          {isRoot && <HubDetail key="root" eyebrow="Overview" title={data.title} subtitle={data.tagline} rows={rootRows} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}
