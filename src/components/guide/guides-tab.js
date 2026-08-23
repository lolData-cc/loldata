"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { cdnBaseUrl } from "@/config";
import { GuideViewer } from "./guide-viewer";
import { GuideEditor } from "./guide-editor";
import { Plus } from "lucide-react";
export function GuidesTab({ championId, initialGuideId, editRef, onGuideView }) {
    const { session } = useAuth();
    const navigate = useNavigate();
    const [guides, setGuides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(initialGuideId ? "view" : "list");
    const [selectedGuide, setSelectedGuide] = useState(null);
    useEffect(() => {
        setLoading(true);
        supabase
            .from("guides")
            .select("*")
            .eq("champion_id", championId)
            .order("upvotes", { ascending: false })
            .then(({ data }) => {
            const all = (data ?? []);
            setGuides(all);
            // Auto-open guide from URL
            if (initialGuideId && !selectedGuide) {
                const target = all.find(g => g.id === initialGuideId);
                if (target) {
                    setSelectedGuide(target);
                    setViewMode("view");
                    onGuideView?.(target);
                    // Increment views
                    supabase.rpc("increment_guide_views", { guide_id: target.id }).then(() => { });
                }
            }
            setLoading(false);
        });
    }, [championId]);
    const openGuide = (guide) => {
        setSelectedGuide(guide);
        setViewMode("view");
        onGuideView?.(guide);
        navigate(`/champions/${championId}/guides/${guide.id}`, { replace: true });
        // Increment views
        supabase.rpc("increment_guide_views", { guide_id: guide.id }).then(() => { });
    };
    const goBackToList = () => {
        setViewMode("list");
        setSelectedGuide(null);
        onGuideView?.(null);
        navigate(`/champions/${championId}/guides`, { replace: true });
    };
    const startEditing = (guide) => {
        setSelectedGuide(guide ?? null);
        setViewMode("edit");
        onGuideView?.(null);
        navigate(`/champions/${championId}/guides`, { replace: true });
    };
    const handleSave = () => {
        goBackToList();
        // Refresh
        supabase
            .from("guides")
            .select("*")
            .eq("champion_id", championId)
            .order("upvotes", { ascending: false })
            .then(({ data }) => setGuides((data ?? [])));
    };
    // Clear edit ref when not viewing
    if (editRef)
        editRef.current = null;
    // ── Edit mode ──
    if (viewMode === "edit") {
        return (_jsx("div", { children: _jsx(GuideEditor, { championId: championId, existingGuide: selectedGuide, onSave: handleSave }) }));
    }
    // ── View mode ──
    if (viewMode === "view" && selectedGuide) {
        // Expose edit trigger to parent via ref
        if (editRef)
            editRef.current = () => startEditing(selectedGuide);
        return (_jsx("div", { children: _jsx(GuideViewer, { guide: selectedGuide }) }));
    }
    // ── List mode ──
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1 h-4 bg-jade" }), _jsx("h3", { className: "text-flash text-xs font-mono uppercase tracking-[0.25em]", children: "Community Guides" })] }), session?.user && (_jsxs("button", { type: "button", onClick: () => startEditing(), className: "flex items-center gap-1.5 text-[10px] font-mono text-jade/60 hover:text-jade px-3 py-1.5 border border-jade/20 hover:border-jade/40 rounded-sm transition-colors", children: [_jsx(Plus, { className: "w-3.5 h-3.5" }), " Create Guide"] }))] }), loading ? (_jsx("div", { className: "text-[11px] font-mono text-flash/30 py-8 text-center", children: "Loading guides..." })) : guides.length === 0 ? (_jsxs("div", { className: "text-center py-12 space-y-3", children: [_jsxs("div", { className: "text-[13px] font-mono text-flash/30", children: ["No guides yet for ", championId] }), session?.user && (_jsx("button", { type: "button", onClick: () => startEditing(), className: "text-[11px] font-mono text-jade/50 hover:text-jade transition-colors", children: "Be the first to create one" }))] })) : (_jsx("div", { className: "space-y-2", children: guides.map(guide => (_jsxs("button", { type: "button", onClick: () => openGuide(guide), className: cn("w-full text-left flex items-center gap-4 px-4 py-3 rounded-sm cursor-pointer", "bg-flash/[0.015] border border-flash/[0.06]", "hover:border-jade/15 hover:bg-jade/[0.02] transition-all"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${championId}.png`, alt: "", className: "w-10 h-10 rounded-[2px] border border-flash/[0.08]" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-[13px] font-mono text-flash/70 truncate", children: guide.title }), _jsxs("div", { className: "flex items-center gap-2 mt-0.5", children: [_jsxs("span", { className: "text-[9px] font-mono text-flash/30", children: ["by ", guide.author_name ?? "Anonymous"] }), guide.role && _jsx("span", { className: "text-[8px] font-mono text-jade/30 uppercase", children: guide.role }), guide.patch && _jsxs("span", { className: "text-[8px] font-mono text-flash/20", children: ["Patch ", guide.patch] })] })] }), _jsxs("div", { className: "flex items-center gap-3 text-[9px] font-mono text-flash/20 shrink-0", children: [_jsxs("span", { children: [guide.upvotes, " upvotes"] }), _jsxs("span", { children: [guide.views, " views"] })] })] }, guide.id))) }))] }));
}
