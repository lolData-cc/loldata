"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from "@/context/authcontext"
import { cdnBaseUrl } from "@/config"
import type { Guide } from "./types"
import { GuideViewer } from "./guide-viewer"
import { GuideEditor } from "./guide-editor"
import { Plus } from "lucide-react"

type ViewMode = "list" | "view" | "edit"

export function GuidesTab({ championId, initialGuideId, editRef, onGuideView }: { championId: string; initialGuideId?: string; editRef?: React.MutableRefObject<(() => void) | null>; onGuideView?: (guide: Guide | null) => void }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(initialGuideId ? "view" : "list")
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null)

  useEffect(() => {
    setLoading(true)
    supabase
      .from("guides")
      .select("*")
      .eq("champion_id", championId)
      .order("upvotes", { ascending: false })
      .then(({ data }) => {
        const all = (data ?? []) as Guide[]
        setGuides(all)
        // Auto-open guide from URL
        if (initialGuideId && !selectedGuide) {
          const target = all.find(g => g.id === initialGuideId)
          if (target) {
            setSelectedGuide(target)
            setViewMode("view")
            onGuideView?.(target)
            // Increment views
            supabase.rpc("increment_guide_views", { guide_id: target.id }).then(() => {})
          }
        }
        setLoading(false)
      })
  }, [championId])

  const openGuide = (guide: Guide) => {
    setSelectedGuide(guide)
    setViewMode("view")
    onGuideView?.(guide)
    navigate(`/champions/${championId}/guides/${guide.id}`, { replace: true })
    // Increment views
    supabase.rpc("increment_guide_views", { guide_id: guide.id }).then(() => {})
  }

  const goBackToList = () => {
    setViewMode("list")
    setSelectedGuide(null)
    onGuideView?.(null)
    navigate(`/champions/${championId}/guides`, { replace: true })
  }

  const startEditing = (guide?: Guide) => {
    setSelectedGuide(guide ?? null)
    setViewMode("edit")
    onGuideView?.(null)
    navigate(`/champions/${championId}/guides`, { replace: true })
  }

  const handleSave = () => {
    goBackToList()
    // Refresh
    supabase
      .from("guides")
      .select("*")
      .eq("champion_id", championId)
      .order("upvotes", { ascending: false })
      .then(({ data }) => setGuides((data ?? []) as Guide[]))
  }

  // Clear edit ref when not viewing
  if (editRef) editRef.current = null

  // ── Edit mode ──
  if (viewMode === "edit") {
    return (
      <div>
        <GuideEditor championId={championId} existingGuide={selectedGuide} onSave={handleSave} />
      </div>
    )
  }

  // ── View mode ──
  if (viewMode === "view" && selectedGuide) {
    // Expose edit trigger to parent via ref
    if (editRef) editRef.current = () => startEditing(selectedGuide)
    return (
      <div>
        <GuideViewer guide={selectedGuide} />
      </div>
    )
  }

  // ── List mode ──
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-jade" />
          <h3 className="text-flash text-xs font-mono uppercase tracking-[0.25em]">Community Guides</h3>
        </div>
        {session?.user && (
          <button
            type="button"
            onClick={() => startEditing()}
            className="flex items-center gap-1.5 text-[10px] font-mono text-jade/60 hover:text-jade px-3 py-1.5 border border-jade/20 hover:border-jade/40 rounded-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Create Guide
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-[11px] font-mono text-flash/30 py-8 text-center">Loading guides...</div>
      ) : guides.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="text-[13px] font-mono text-flash/30">No guides yet for {championId}</div>
          {session?.user && (
            <button
              type="button"
              onClick={() => startEditing()}
              className="text-[11px] font-mono text-jade/50 hover:text-jade transition-colors"
            >
              Be the first to create one
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {guides.map(guide => (
            <button
              key={guide.id}
              type="button"
              onClick={() => openGuide(guide)}
              className={cn(
                "w-full text-left flex items-center gap-4 px-4 py-3 rounded-sm cursor-pointer",
                "bg-flash/[0.015] border border-flash/[0.06]",
                "hover:border-jade/15 hover:bg-jade/[0.02] transition-all"
              )}
            >
              <img src={`${cdnBaseUrl()}/img/champion/${championId}.png`} alt="" className="w-10 h-10 rounded-[2px] border border-flash/[0.08]" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-mono text-flash/70 truncate">{guide.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] font-mono text-flash/30">by {guide.author_name ?? "Anonymous"}</span>
                  {guide.role && <span className="text-[8px] font-mono text-jade/30 uppercase">{guide.role}</span>}
                  {guide.patch && <span className="text-[8px] font-mono text-flash/20">Patch {guide.patch}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[9px] font-mono text-flash/20 shrink-0">
                <span>{guide.upvotes} upvotes</span>
                <span>{guide.views} views</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
