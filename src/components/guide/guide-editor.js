"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authcontext";
import { THREAT_LEVELS, SYNERGY_LEVELS, SECTION_TEMPLATES, normalizeBuildPage, CAMP_POSITIONS } from "./types";
import { Eye, EyeOff, GripVertical, ChevronDown, ChevronUp, Save, X, Search } from "lucide-react";
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons";
import { RuneTreeEditor } from "./rune-tree-editor";
import { CyberSelect } from "@/components/ui/cyber-select";
const ROLE_ICONS = {
    TOP: RoleTopIcon, JUNGLE: RoleJungleIcon, MID: RoleMidIcon, ADC: RoleAdcIcon, SUPPORT: RoleSupportIcon,
};
// ── Role Picker ──
const ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
function RolePicker({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef(null);
    const popRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useEffect(() => {
        if (!open)
            return;
        // Position above the button
        const rect = btnRef.current?.getBoundingClientRect();
        if (rect)
            setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
        const handler = (e) => {
            if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target))
                return;
            setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);
    const ActiveIcon = value ? ROLE_ICONS[value] : null;
    return (_jsxs(_Fragment, { children: [_jsx("button", { ref: btnRef, type: "button", onClick: () => setOpen(!open), className: cn("flex items-center justify-center w-10 h-10 rounded-sm border transition-all cursor-pointer", value ? "border-jade/20 text-jade/60 hover:border-jade/40 hover:text-jade" : "border-flash/[0.08] text-flash/25 hover:text-flash/50 hover:border-flash/[0.15]"), children: ActiveIcon ? _jsx(ActiveIcon, { className: "w-5 h-5" }) : _jsx("span", { className: "text-[9px] font-mono uppercase", children: "Role" }) }), open && createPortal(_jsx("div", { ref: popRef, className: "fixed z-[999] flex items-center gap-1", style: { top: pos.top, left: pos.left, transform: "translate(-50%, -100%)" }, children: ROLES.map((r, i) => {
                    const Icon = ROLE_ICONS[r];
                    const isActive = value === r;
                    return (_jsx("button", { type: "button", onClick: () => { onChange(isActive ? "" : r); setOpen(false); }, className: cn("p-1.5 rounded-sm transition-all cursor-pointer", isActive ? "text-jade scale-110" : "text-flash/30 hover:text-flash/70 hover:scale-110"), style: { animation: `fadeUp 0.15s ease-out ${i * 0.03}s both` }, title: r, children: _jsx(Icon, { className: "w-6 h-6" }) }, r));
                }) }), document.body), _jsx("style", { children: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      ` })] }));
}
// ── Champion search popup ──
function ChampionSearch({ onSelect, onClose }) {
    const [q, setQ] = useState("");
    const [champs, setChamps] = useState([]);
    const inputRef = useRef(null);
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then(r => r.json())
            .then(data => {
            const list = Object.values(data?.data ?? {}).map(c => ({ id: String(c.id), name: String(c.name) }));
            setChamps(list.sort((a, b) => a.name.localeCompare(b.name)));
        })
            .catch(() => { });
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);
    const term = q.trim().toLowerCase();
    const filtered = term.length < 1 ? champs : champs.filter(c => c.name.toLowerCase().includes(term) || c.id.toLowerCase().includes(term));
    return createPortal(_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center", onClick: onClose, children: [_jsx("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-[420px] max-h-[460px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]", style: { background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }, onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-20", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" } }), _jsx("div", { className: "relative z-10 px-4 py-3 border-b border-jade/10", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4 text-jade/30" }), _jsx("input", { ref: inputRef, value: q, onChange: e => setQ(e.target.value), placeholder: "Search champion...", className: "flex-1 bg-transparent text-[13px] font-mono text-flash/70 placeholder:text-flash/20 focus:outline-none caret-jade" }), _jsx("button", { type: "button", onClick: onClose, className: "text-flash/30 hover:text-flash/60 transition-colors cursor-pointer", children: _jsx(X, { className: "w-4 h-4" }) })] }) }), _jsx("div", { className: "relative z-10 max-h-[380px] overflow-y-auto p-3 scrollbar-hide", children: _jsx("div", { className: "grid grid-cols-7 gap-1.5", children: filtered.slice(0, 70).map(c => (_jsxs("button", { type: "button", onClick: () => { onSelect(c.id); onClose(); }, className: "flex flex-col items-center gap-1 p-1.5 rounded-sm hover:bg-jade/[0.08] hover:shadow-[0_0_8px_rgba(0,217,146,0.1)] transition-all cursor-pointer group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.id}.png`, alt: c.name, className: "w-9 h-9 rounded-[3px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" }), _jsx("span", { className: "text-[7px] font-mono text-flash/25 group-hover:text-jade/50 truncate w-full text-center transition-colors", children: c.name })] }, c.id))) }) })] })] }), document.body);
}
// ── Item search popup ──
function ItemSearch({ onSelect, onClose, includeComponents, keepOpen }) {
    const [q, setQ] = useState("");
    const [items, setItems] = useState([]);
    const inputRef = useRef(null);
    useEffect(() => {
        fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
            .then(r => r.json())
            .then(data => {
            const list = [];
            for (const [id, item] of Object.entries(data?.data ?? {})) {
                if (item.gold?.purchasable === false || item.maps?.["11"] === false)
                    continue;
                if (includeComponents) {
                    // Show all purchasable SR items (including components, boots, etc)
                    if ((item.gold?.total ?? 0) >= 50)
                        list.push({ id: Number(id), name: item.name });
                }
                else {
                    // Filter to completed items only
                    if ((!item.into || item.into.length === 0) && (item.gold?.total ?? 0) >= 400) {
                        list.push({ id: Number(id), name: item.name });
                    }
                }
            }
            setItems(list.sort((a, b) => a.name.localeCompare(b.name)));
        })
            .catch(() => { });
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);
    const term = q.trim().toLowerCase();
    const filtered = term.length < 1 ? items : items.filter(i => i.name.toLowerCase().includes(term));
    return createPortal(_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center", onClick: onClose, children: [_jsx("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-[460px] max-h-[460px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]", style: { background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }, onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-20", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" } }), _jsx("div", { className: "relative z-10 px-4 py-3 border-b border-jade/10", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4 text-jade/30" }), _jsx("input", { ref: inputRef, value: q, onChange: e => setQ(e.target.value), placeholder: "Search item...", className: "flex-1 bg-transparent text-[13px] font-mono text-flash/70 placeholder:text-flash/20 focus:outline-none caret-jade" }), _jsx("button", { type: "button", onClick: onClose, className: "text-flash/30 hover:text-flash/60 transition-colors cursor-pointer", children: _jsx(X, { className: "w-4 h-4" }) })] }) }), _jsx("div", { className: "relative z-10 max-h-[380px] overflow-y-auto p-3 scrollbar-hide", children: _jsx("div", { className: "grid grid-cols-8 gap-1.5", children: filtered.slice(0, 80).map(i => (_jsxs("button", { type: "button", onClick: () => { onSelect(i.id, i.name); if (!keepOpen)
                                    onClose(); }, className: "flex flex-col items-center gap-1 p-1 rounded-sm hover:bg-jade/[0.08] hover:shadow-[0_0_8px_rgba(0,217,146,0.1)] transition-all cursor-pointer group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${i.id}.png`, alt: i.name, className: "w-8 h-8 rounded-[2px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" }), _jsx("span", { className: "text-[6px] font-mono text-flash/20 group-hover:text-jade/40 truncate w-full text-center leading-tight transition-colors", children: i.name })] }, i.id))) }) })] })] }), document.body);
}
// ── Section Header (collapsible, draggable, toggle visibility) ──
function SectionHeader({ title, type, visible, collapsed, onTitleChange, onToggleVisible, onToggleCollapse, onDragStart }) {
    return (_jsxs("div", { className: "flex items-center gap-2 px-4 py-2.5 border-b border-flash/[0.04] bg-flash/[0.01]", children: [_jsx("div", { draggable: true, onDragStart: (e) => { e.dataTransfer.effectAllowed = "move"; onDragStart?.(); }, className: "shrink-0 cursor-grab active:cursor-grabbing", children: _jsx(GripVertical, { className: "w-3.5 h-3.5 text-flash/15 hover:text-flash/40 transition-colors" }) }), _jsx("div", { className: "w-1 h-5 bg-jade/30 rounded-full shrink-0" }), _jsx("span", { className: "text-[9px] font-orbitron text-jade/30 uppercase tracking-[0.15em] shrink-0", children: type }), _jsx("input", { value: title, onChange: (e) => onTitleChange(e.target.value), className: "flex-1 bg-transparent text-[14px] font-orbitron text-flash/50 focus:outline-none focus:text-flash/80 border-b border-transparent focus:border-jade/15 px-1 transition-colors" }), _jsx("button", { type: "button", onClick: onToggleVisible, className: cn("transition-colors", visible ? "text-jade/30 hover:text-jade/60" : "text-red-400/30 hover:text-red-400/60"), title: visible ? "Visible" : "Hidden", children: visible ? _jsx(Eye, { className: "w-3.5 h-3.5" }) : _jsx(EyeOff, { className: "w-3.5 h-3.5" }) }), _jsx("button", { type: "button", onClick: onToggleCollapse, className: "text-flash/20 hover:text-flash/50 transition-colors", children: collapsed ? _jsx(ChevronDown, { className: "w-3.5 h-3.5" }) : _jsx(ChevronUp, { className: "w-3.5 h-3.5" }) })] }));
}
// ── Auto-resize textarea ──
function useAutoResize(ref, value, minHeight) {
    const prevHeight = useRef(minHeight);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        // Measure by temporarily collapsing
        const saved = el.style.transition;
        el.style.transition = "none";
        el.style.height = "0px";
        const target = Math.max(el.scrollHeight, minHeight);
        // Restore to previous height instantly, then animate to target
        el.style.height = `${prevHeight.current}px`;
        // Force reflow so the browser registers the starting height
        el.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
        el.style.transition = "height 0.2s ease-out";
        el.style.height = `${target}px`;
        prevHeight.current = target;
    }, [value, minHeight, ref]);
}
function AutoTextarea({ value, onChange, placeholder, className, minHeight = 112 }) {
    const ref = useRef(null);
    useAutoResize(ref, value, minHeight);
    return (_jsx("textarea", { ref: ref, value: value, onChange: (e) => onChange(e.target.value), placeholder: placeholder, className: cn("overflow-hidden resize-none", className), style: { minHeight } }));
}
// ── Intro Editor ──
function IntroEditor({ section, onChange }) {
    return (_jsx(AutoTextarea, { value: section.content, onChange: (v) => onChange({ ...section, content: v }), placeholder: "Write your introduction... Describe yourself, your experience with this champion, and what this guide covers.", className: "w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[12px] font-mono text-flash/50 placeholder:text-flash/15 resize-none focus:outline-none focus:border-jade/15" }));
}
// ── Build Editor (with item picker) ──
function RecommendedItemsEditor({ section, onChange }) {
    const [showPicker, setShowPicker] = useState(false);
    // Normalize: legacy items → richItems
    const richItems = section.richItems ??
        (section.items ?? []).map((id) => ({ itemId: id }));
    const updateRichItems = (newItems) => {
        onChange({ ...section, richItems: newItems, items: newItems.map(i => i.itemId) });
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "space-y-2 mb-3", children: richItems.map((item, idx) => (_jsxs("div", { className: "flex items-start gap-3 px-3 py-2 rounded-sm bg-flash/[0.02] border border-flash/[0.04] group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${item.itemId}.png`, alt: "", className: "w-10 h-10 rounded-[2px] border border-flash/[0.08] shrink-0" }), _jsx("textarea", { value: item.description ?? "", onChange: (e) => { const n = [...richItems]; n[idx] = { ...n[idx], description: e.target.value }; updateRichItems(n); }, placeholder: "Why is this item recommended?", className: "flex-1 bg-transparent text-[11px] font-mono text-flash/40 placeholder:text-flash/15 focus:outline-none focus:text-flash/60 resize-none h-10 py-1" }), _jsx("button", { type: "button", onClick: () => updateRichItems(richItems.filter((_, i) => i !== idx)), className: "text-red-400/0 group-hover:text-red-400/40 hover:!text-red-400/80 transition-colors cursor-pointer shrink-0 mt-2", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }, idx))) }), _jsx("button", { type: "button", onClick: () => setShowPicker(true), className: "w-full py-2 rounded-sm border border-dashed border-flash/[0.06] text-flash/15 hover:text-jade/30 hover:border-jade/15 transition-colors cursor-pointer text-[10px] font-mono", children: "+ Add item" }), showPicker && _jsx(ItemSearch, { onSelect: (id) => { updateRichItems([...richItems, { itemId: id }]); setShowPicker(false); }, onClose: () => setShowPicker(false) })] }));
}
// ── Matchup Editor (with champion picker) ──
function MatchupEditor({ section, onChange }) {
    const [showPicker, setShowPicker] = useState(null);
    const [pendingLevel, setPendingLevel] = useState("skill");
    const [pendingNote, setPendingNote] = useState("");
    const [editingNoteIdx, setEditingNoteIdx] = useState(null);
    const [expandedEntry, setExpandedEntry] = useState(null);
    const [showMatchupItemPicker, setShowMatchupItemPicker] = useState(false);
    const updateEntry = (type, idx, patch) => {
        if (type === "threats")
            onChange({ ...section, threats: section.threats.map((e, i) => i === idx ? { ...e, ...patch } : e) });
        else
            onChange({ ...section, synergies: section.synergies.map((e, i) => i === idx ? { ...e, ...patch } : e) });
    };
    const addChampion = (champId, type) => {
        const entry = { championId: champId, level: pendingLevel, note: pendingNote };
        if (type === "threats") {
            onChange({ ...section, threats: [...section.threats, entry] });
        }
        else {
            onChange({ ...section, synergies: [...section.synergies, entry] });
        }
        setPendingNote("");
    };
    const removeEntry = (type, idx) => {
        if (type === "threats")
            onChange({ ...section, threats: section.threats.filter((_, i) => i !== idx) });
        else
            onChange({ ...section, synergies: section.synergies.filter((_, i) => i !== idx) });
    };
    const updateNote = (type, idx, note) => {
        if (type === "threats")
            onChange({ ...section, threats: section.threats.map((e, i) => i === idx ? { ...e, note } : e) });
        else
            onChange({ ...section, synergies: section.synergies.map((e, i) => i === idx ? { ...e, note } : e) });
    };
    const updateLevel = (type, idx, level) => {
        if (type === "threats")
            onChange({ ...section, threats: section.threats.map((e, i) => i === idx ? { ...e, level: level } : e) });
        else
            onChange({ ...section, synergies: section.synergies.map((e, i) => i === idx ? { ...e, level: level } : e) });
    };
    const toggleBan = (idx) => {
        onChange({ ...section, threats: section.threats.map((e, i) => i === idx ? { ...e, ban: !e.ban } : e) });
    };
    const renderGroup = (entries, type) => {
        const levels = type === "threats" ? THREAT_LEVELS : SYNERGY_LEVELS;
        const accent = type === "threats" ? "red-400" : "jade";
        return (_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("span", { className: cn("text-[9px] font-mono uppercase tracking-[0.2em]", type === "threats" ? "text-red-400/40" : "text-jade/40"), children: [type === "threats" ? "Threats" : "Synergies", " (", entries.length, ")"] }), _jsx("button", { type: "button", onClick: () => setShowPicker(type), className: cn("text-[9px] font-mono px-2 py-0.5 rounded-sm border transition-colors cursor-pointer", type === "threats" ? "text-red-400/40 border-red-400/15 hover:text-red-400/70 hover:border-red-400/30" : "text-jade/40 border-jade/15 hover:text-jade/70 hover:border-jade/30"), children: "+ Add" })] }), _jsx("div", { className: "space-y-1", children: entries.map((e, idx) => {
                        const isExpanded = expandedEntry?.type === type && expandedEntry?.idx === idx;
                        const hasExtras = (e.items?.length ?? 0) > 0 || !!e.runes;
                        return (_jsx("div", { children: _jsxs("div", { className: cn("flex items-center gap-1.5 px-2 py-1.5 rounded-sm bg-flash/[0.02] border group transition-all", isExpanded ? "border-jade/15" : "border-flash/[0.04]"), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${e.championId}.png`, alt: "", className: "w-7 h-7 rounded-[2px] shrink-0" }), _jsx("div", { className: "text-[10px] font-mono text-flash/50 min-w-0 truncate flex-1", children: e.championId }), e.ban && _jsx("span", { className: "text-[7px] font-orbitron font-bold text-red-400/60 uppercase tracking-wider shrink-0", children: "BAN" }), _jsx(CyberSelect, { value: e.level, onChange: (v) => updateLevel(type, idx, v), options: levels.map(l => ({ value: l.key, label: l.label })) }), _jsx("button", { type: "button", onClick: () => setExpandedEntry(isExpanded ? null : { type, idx }), className: cn("text-[8px] font-orbitron uppercase tracking-[0.1em] h-[24px] px-2 rounded-[2px] border transition-all cursor-pointer shrink-0", isExpanded ? "text-jade border-jade/30 bg-jade/10" : hasExtras ? "text-jade/40 border-jade/15" : "text-flash/15 border-flash/[0.04] hover:text-flash/30"), children: isExpanded ? "CLOSE" : hasExtras ? "EDIT" : "+" }), _jsx("button", { type: "button", onClick: () => removeEntry(type, idx), className: "text-red-400/0 group-hover:text-red-400/40 hover:!text-red-400/80 transition-colors cursor-pointer shrink-0", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }) }, idx));
                    }) })] }));
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("span", { className: "text-[9px] font-mono text-flash/25", children: "Default level:" }), _jsx(CyberSelect, { value: pendingLevel, onChange: setPendingLevel, options: [...THREAT_LEVELS, ...SYNERGY_LEVELS].map(l => ({ value: l.key, label: l.label })), placeholder: "Level" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [renderGroup(section.threats, "threats"), renderGroup(section.synergies, "synergies")] }), expandedEntry && (() => {
                const entries = expandedEntry.type === "threats" ? section.threats : section.synergies;
                const e = entries[expandedEntry.idx];
                if (!e)
                    return null;
                return (_jsxs("div", { className: "mt-3 p-4 rounded-sm border border-jade/15 bg-flash/[0.01] space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${e.championId}.png`, alt: "", className: "w-8 h-8 rounded-[2px]" }), _jsx("span", { className: "text-[12px] font-orbitron text-flash/60", children: e.championId }), _jsx("span", { className: "text-[8px] font-mono text-flash/25 uppercase", children: "\u2014 build & runes" })] }), _jsx("button", { type: "button", onClick: () => setExpandedEntry(null), className: "text-[8px] font-orbitron text-flash/30 hover:text-flash/60 px-2 py-1 border border-flash/[0.06] rounded-sm transition-colors cursor-pointer", children: "CLOSE" })] }), expandedEntry.type === "threats" && (_jsx("button", { type: "button", onClick: () => toggleBan(expandedEntry.idx), className: cn("text-[9px] font-orbitron font-bold uppercase tracking-[0.12em] h-[28px] px-4 rounded-[2px] border transition-all cursor-pointer", e.ban
                                ? "text-red-400 border-red-400/40 bg-red-400/10 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                                : "text-flash/25 border-flash/[0.08] hover:text-red-400/60 hover:border-red-400/25"), children: e.ban ? "BANNED" : "MARK AS BAN" })), _jsxs("div", { children: [_jsx("div", { className: "text-[11px] font-orbitron text-flash/50 uppercase tracking-[0.15em] mb-1.5", children: "Matchup Notes" }), _jsx("textarea", { value: e.note, onChange: (ev) => updateNote(expandedEntry.type, expandedEntry.idx, ev.target.value), placeholder: "Describe how to play this matchup...", className: "w-full h-20 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[12px] font-mono text-flash/45 placeholder:text-flash/15 resize-y focus:outline-none focus:border-jade/15 transition-colors" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[11px] font-orbitron text-flash/50 uppercase tracking-[0.15em] mb-2", children: "Recommended Build" }), _jsxs("div", { className: "flex gap-1.5 flex-wrap", children: [(e.items ?? []).map((itemId, ii) => (_jsxs("div", { className: "group/item relative", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: "", className: "w-9 h-9 rounded-[2px] border border-flash/[0.08]" }), _jsx("button", { type: "button", onClick: () => updateEntry(expandedEntry.type, expandedEntry.idx, { items: (e.items ?? []).filter((_, j) => j !== ii) }), className: "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white text-[6px] flex items-center justify-center opacity-0 group-hover/item:opacity-100 cursor-pointer", children: "x" })] }, ii))), _jsx("button", { type: "button", onClick: () => setShowMatchupItemPicker(true), className: "w-9 h-9 rounded-[2px] border border-dashed border-flash/[0.08] flex items-center justify-center text-flash/15 hover:text-jade/30 hover:border-jade/15 transition-colors cursor-pointer text-[11px]", children: "+" })] }), showMatchupItemPicker && (_jsx(ItemSearch, { includeComponents: true, onSelect: (id) => { updateEntry(expandedEntry.type, expandedEntry.idx, { items: [...(e.items ?? []), id] }); }, onClose: () => setShowMatchupItemPicker(false) }))] }), _jsxs("div", { children: [_jsx("div", { className: "text-[11px] font-orbitron text-flash/50 uppercase tracking-[0.15em] mb-2", children: "Custom Runes" }), _jsx(RuneTreeEditor, { value: { ...{ primary: { tree: 8000, keystone: 8010, runes: [] }, secondary: { tree: 8400, runes: [] }, shards: [] }, ...e.runes }, onChange: (v) => updateEntry(expandedEntry.type, expandedEntry.idx, { runes: { primary: v.primary, secondary: v.secondary } }) })] })] }));
            })(), showPicker && (_jsx(ChampionSearch, { onSelect: (id) => addChampion(id, showPicker), onClose: () => setShowPicker(null) }))] }));
}
// ── Back Timing Editor ──
function BackTimingEditor({ section, onChange }) {
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [pendingGold, setPendingGold] = useState("");
    const [pendingItems, setPendingItems] = useState([]);
    const [pendingNote, setPendingNote] = useState("");
    const [pendingIdeal, setPendingIdeal] = useState(false);
    const [editIdx, setEditIdx] = useState(null);
    const saveTiming = () => {
        const g = Number(pendingGold);
        if (!g)
            return;
        const timing = { gold: g, items: pendingItems, note: pendingNote, ideal: pendingIdeal };
        if (editIdx !== null) {
            // Update existing
            const newTimings = [...section.timings];
            newTimings[editIdx] = timing;
            onChange({ ...section, timings: newTimings });
            setEditIdx(null);
        }
        else {
            // Add new
            onChange({ ...section, timings: [...section.timings, timing] });
        }
        setPendingGold("");
        setPendingItems([]);
        setPendingNote("");
    };
    const startEdit = (idx) => {
        const t = section.timings[idx];
        setPendingGold(String(t.gold));
        setPendingItems([...t.items]);
        setPendingNote(t.note);
        setPendingIdeal(t.ideal ?? false);
        setEditIdx(idx);
    };
    const cancelEdit = () => {
        setEditIdx(null);
        setPendingGold("");
        setPendingItems([]);
        setPendingNote("");
        setPendingIdeal(false);
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "space-y-2 mb-4", children: section.timings.map((t, idx) => (_jsxs("div", { className: cn("grid grid-cols-[60px_1px_120px_1px_1fr_auto] items-center gap-3 px-4 py-2.5 rounded-sm border group cursor-pointer transition-all", editIdx === idx ? "border-jade/25 bg-jade/[0.03]" : t.ideal ? "border-jade/20 bg-jade/[0.02]" : "border-flash/[0.04] bg-flash/[0.02] hover:border-flash/[0.1]"), onClick: () => startEdit(idx), children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsxs("span", { className: "text-[15px] font-orbitron font-bold text-jade/50 tabular-nums", children: [t.gold, "g"] }), t.ideal && _jsx("span", { className: "text-[6px] font-orbitron font-bold text-jade/50 uppercase", children: "\u2605" })] }), _jsx("div", { className: "w-[1px] self-stretch bg-flash/[0.06]" }), _jsx("div", { className: "flex gap-1.5", children: t.items.map((id, i) => _jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: "", className: "w-7 h-7 rounded-[2px]" }, i)) }), _jsx("div", { className: "w-[1px] self-stretch bg-flash/[0.06]" }), _jsx("span", { className: "text-[13px] font-mono text-flash/40", children: t.note }), _jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [idx > 0 && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); const t2 = [...section.timings]; [t2[idx - 1], t2[idx]] = [t2[idx], t2[idx - 1]]; onChange({ ...section, timings: t2 }); }, className: "text-flash/20 hover:text-flash/50 transition-colors cursor-pointer", children: _jsx(ChevronUp, { className: "w-3.5 h-3.5" }) })), idx < section.timings.length - 1 && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); const t2 = [...section.timings]; [t2[idx], t2[idx + 1]] = [t2[idx + 1], t2[idx]]; onChange({ ...section, timings: t2 }); }, className: "text-flash/20 hover:text-flash/50 transition-colors cursor-pointer", children: _jsx(ChevronDown, { className: "w-3.5 h-3.5" }) })), _jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); onChange({ ...section, timings: section.timings.filter((_, i) => i !== idx) }); if (editIdx === idx)
                                        cancelEdit(); }, className: "text-red-400/30 hover:text-red-400/80 transition-colors cursor-pointer", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] })] }, idx))) }), _jsxs("div", { className: "grid grid-cols-[60px_1px_120px_1px_1fr_auto] items-center gap-3 px-4 py-2.5 rounded-sm border border-dashed border-flash/[0.06]", children: [_jsx("input", { value: pendingGold, onChange: e => setPendingGold(e.target.value), placeholder: "Gold", type: "number", className: "w-full bg-transparent text-[14px] font-orbitron text-jade/40 placeholder:text-flash/15 focus:outline-none border-b border-flash/[0.06] focus:border-jade/20 transition-colors" }), _jsx("div", { className: "w-[1px] self-stretch bg-flash/[0.04]" }), _jsxs("div", { className: "flex gap-1.5", children: [pendingItems.map((id, i) => (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: "", className: "w-7 h-7 rounded-[2px]" }), _jsx("button", { type: "button", onClick: () => setPendingItems(prev => prev.filter((_, j) => j !== i)), className: "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/80 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100", children: "x" })] }, i))), _jsx("button", { type: "button", onClick: () => setShowItemPicker(true), className: "w-7 h-7 rounded-[2px] border border-dashed border-flash/[0.1] flex items-center justify-center text-flash/15 hover:text-jade/30 transition-colors cursor-pointer text-[11px]", children: "+" })] }), _jsx("div", { className: "w-[1px] self-stretch bg-flash/[0.04]" }), _jsx("input", { value: pendingNote, onChange: e => setPendingNote(e.target.value), placeholder: "Note (e.g. Vampiric Sceptre + Potion)", className: "w-full bg-transparent text-[13px] font-mono text-flash/40 placeholder:text-flash/15 focus:outline-none border-b border-flash/[0.06] focus:border-jade/20 transition-colors" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("button", { type: "button", onClick: () => setPendingIdeal(!pendingIdeal), className: cn("text-[9px] font-orbitron uppercase tracking-[0.1em] px-2 py-1.5 rounded-sm border transition-all cursor-pointer", pendingIdeal ? "text-jade border-jade/30 bg-jade/10" : "text-flash/20 border-flash/[0.06] hover:text-jade/40"), children: "IDEAL" }), _jsx("button", { type: "button", onClick: saveTiming, disabled: !pendingGold, className: cn("text-[10px] font-mono px-3 py-1.5 rounded-sm border transition-colors", pendingGold ? "text-jade/60 border-jade/20 hover:text-jade hover:border-jade/40 cursor-pointer" : "text-flash/15 border-flash/[0.04]"), children: editIdx !== null ? "Save" : "Add" }), editIdx !== null && (_jsx("button", { type: "button", onClick: cancelEdit, className: "text-[10px] font-mono px-2 py-1.5 text-flash/30 hover:text-flash/60 transition-colors cursor-pointer", children: "Cancel" }))] })] }), showItemPicker && _jsx(ItemSearch, { includeComponents: true, keepOpen: true, onSelect: (id) => { setPendingItems(prev => [...prev, id]); }, onClose: () => setShowItemPicker(false) })] }));
}
// ── Multi-page rune editor ──
function MultiRuneEditor({ section, onChange }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const pages = section.pages ?? (section.primary ? [{ name: "Default", primary: section.primary, secondary: section.secondary, shards: section.shards }] : []);
    const activePage = pages[activeIdx];
    const updatePage = (idx, page) => {
        const newPages = [...pages];
        newPages[idx] = page;
        onChange({ ...section, pages: newPages });
    };
    const addPage = () => {
        const newPages = [...pages, { name: `Rune Page ${pages.length + 1}`, primary: { tree: 8000, keystone: 8010, runes: [] }, secondary: { tree: 8400, runes: [] }, shards: [] }];
        onChange({ ...section, pages: newPages });
        setActiveIdx(newPages.length - 1);
    };
    const removePage = (idx) => {
        if (pages.length <= 1)
            return;
        const newPages = pages.filter((_, i) => i !== idx);
        onChange({ ...section, pages: newPages });
        if (activeIdx >= newPages.length)
            setActiveIdx(newPages.length - 1);
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-4 border-b border-flash/[0.04] pb-2", children: [pages.map((p, idx) => (_jsxs("button", { type: "button", onClick: () => setActiveIdx(idx), className: cn("group relative px-3 py-1.5 rounded-sm text-[10px] font-mono transition-all cursor-pointer", activeIdx === idx
                            ? "bg-jade/[0.1] text-jade/80 border border-jade/25"
                            : "text-flash/30 hover:text-flash/60 border border-transparent hover:border-flash/[0.08]"), children: [p.name || `Page ${idx + 1}`, pages.length > 1 && (_jsx("span", { onClick: (e) => { e.stopPropagation(); removePage(idx); }, className: "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", children: "x" }))] }, idx))), _jsx("button", { type: "button", onClick: addPage, className: "text-[9px] font-orbitron text-jade/30 hover:text-jade/60 px-2.5 py-1.5 border border-dashed border-jade/15 hover:border-jade/30 rounded-sm transition-colors cursor-pointer", children: "+ Page" })] }), activePage && (_jsx(RuneTreeEditor, { value: activePage, onChange: (v) => updatePage(activeIdx, { ...activePage, primary: v.primary, secondary: v.secondary, shards: v.shards }), title: activePage.name, onTitleChange: (t) => updatePage(activeIdx, { ...activePage, name: t }), description: activePage.description ?? "", onDescriptionChange: (d) => updatePage(activeIdx, { ...activePage, description: d }), againstChampions: activePage.againstChampions ?? [], onAgainstChange: (c) => updatePage(activeIdx, { ...activePage, againstChampions: c }), againstClasses: activePage.againstClasses ?? [], onAgainstClassesChange: (c) => updatePage(activeIdx, { ...activePage, againstClasses: c }) }))] }));
}
// ── Multi-Build Editor (tabbed, with step-based flow + "use against") ──
function MultiBuildEditor({ section, onChange }) {
    const [activeIdx, setActiveIdx] = useState(0);
    // Normalize pages
    const rawPages = section.pages ?? (section.items ? [{ name: "Default Build", items: section.items }] : [{ name: "Default Build", steps: [] }]);
    const pages = rawPages.map((p) => normalizeBuildPage(p));
    const activePage = pages[activeIdx];
    const [pickerTarget, setPickerTarget] = useState(null);
    const [bootChampPickerIdx, setBootChampPickerIdx] = useState(null);
    const descRef = useRef(null);
    useAutoResize(descRef, activePage?.description ?? "", 64);
    const [showChampPicker, setShowChampPicker] = useState(false);
    const [champList, setChampList] = useState([]);
    const [champSearch, setChampSearch] = useState("");
    const CLASSES = [
        { key: "Fighter", label: "Fighter" },
        { key: "Tank", label: "Tank" },
        { key: "Mage", label: "Mage" },
        { key: "Assassin", label: "Assassin" },
        { key: "Marksman", label: "Marksman" },
        { key: "Support", label: "Support" },
    ];
    const updatePage = (idx, page) => {
        const newPages = [...pages];
        newPages[idx] = page;
        onChange({ ...section, pages: newPages, items: undefined });
    };
    const addPage = () => {
        const newPages = [...pages, { name: `Build ${pages.length + 1}`, steps: [] }];
        onChange({ ...section, pages: newPages, items: undefined });
        setActiveIdx(newPages.length - 1);
    };
    const removePage = (idx) => {
        if (pages.length <= 1)
            return;
        const newPages = pages.filter((_, i) => i !== idx);
        onChange({ ...section, pages: newPages, items: undefined });
        if (activeIdx >= newPages.length)
            setActiveIdx(newPages.length - 1);
    };
    const updateSteps = (newSteps) => {
        updatePage(activeIdx, { ...activePage, steps: newSteps });
    };
    const addItemToStep = (stepIdx, itemId) => {
        const newSteps = [...activePage.steps];
        newSteps[stepIdx] = { ...newSteps[stepIdx], items: [...newSteps[stepIdx].items, itemId] };
        updateSteps(newSteps);
    };
    const addNewStep = (itemId) => {
        updateSteps([...activePage.steps, { items: [itemId] }]);
    };
    const removeItemFromStep = (stepIdx, itemIdx) => {
        const newSteps = [...activePage.steps];
        const newItems = newSteps[stepIdx].items.filter((_, i) => i !== itemIdx);
        if (newItems.length === 0) {
            // Remove the entire step
            newSteps.splice(stepIdx, 1);
        }
        else {
            newSteps[stepIdx] = { ...newSteps[stepIdx], items: newItems };
        }
        updateSteps(newSteps);
    };
    const handlePickerSelect = (itemId) => {
        if (!pickerTarget)
            return;
        if (pickerTarget.mode === "boot") {
            const boots = [...(activePage?.boots ?? []), { itemId }];
            updatePage(activeIdx, { ...activePage, boots });
        }
        else if (pickerTarget.mode === "step") {
            addItemToStep(pickerTarget.stepIdx, itemId);
        }
        else {
            addNewStep(itemId);
        }
        setPickerTarget(null);
    };
    const loadChamps = () => {
        if (champList.length === 0) {
            fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
                .then(r => r.json())
                .then(data => {
                const list = Object.values(data?.data ?? {}).map(c => ({ id: String(c.id), name: String(c.name) }));
                setChampList(list.sort((a, b) => a.name.localeCompare(b.name)));
            })
                .catch(() => { });
        }
        setShowChampPicker(true);
    };
    const toggleClass = (cls) => {
        const current = activePage.againstClasses ?? [];
        const updated = current.includes(cls) ? current.filter((x) => x !== cls) : [...current, cls];
        updatePage(activeIdx, { ...activePage, againstClasses: updated });
    };
    const steps = activePage?.steps ?? [];
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-4 border-b border-flash/[0.04] pb-2", children: [pages.map((p, idx) => (_jsxs("button", { type: "button", onClick: () => setActiveIdx(idx), className: cn("group relative px-3 py-1.5 rounded-sm text-[10px] font-mono transition-all cursor-pointer", activeIdx === idx
                            ? "bg-jade/[0.1] text-jade/80 border border-jade/25"
                            : "text-flash/30 hover:text-flash/60 border border-transparent hover:border-flash/[0.08]"), children: [p.name || `Build ${idx + 1}`, pages.length > 1 && (_jsx("span", { onClick: (e) => { e.stopPropagation(); removePage(idx); }, className: "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", children: "x" }))] }, idx))), _jsx("button", { type: "button", onClick: addPage, className: "text-[9px] font-orbitron text-jade/30 hover:text-jade/60 px-2.5 py-1.5 border border-dashed border-jade/15 hover:border-jade/30 rounded-sm transition-colors cursor-pointer", children: "+ Build" })] }), activePage && (_jsxs("div", { children: [_jsxs("div", { className: "flex items-start gap-4 mb-4", children: [_jsx("input", { value: activePage.name, onChange: e => updatePage(activeIdx, { ...activePage, name: e.target.value }), placeholder: "e.g. Build vs Tanks", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[13px] font-orbitron text-flash/60 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" }), _jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [_jsx("span", { className: "text-[9px] font-mono text-flash/25 uppercase tracking-wider", children: "vs" }), (activePage.againstClasses ?? []).map((cls) => (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: "w-7 h-7 object-contain", style: { filter: "brightness(1.2)" } }), _jsx("button", { type: "button", onClick: () => updatePage(activeIdx, { ...activePage, againstClasses: (activePage.againstClasses ?? []).filter((x) => x !== cls) }), className: "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", children: "x" })] }, cls))), (activePage.againstChampions ?? []).map((c) => (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-7 h-7 rounded-[2px] border border-flash/[0.08]" }), _jsx("button", { type: "button", onClick: () => updatePage(activeIdx, { ...activePage, againstChampions: (activePage.againstChampions ?? []).filter((x) => x !== c) }), className: "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", children: "x" })] }, c))), _jsx("button", { type: "button", onClick: loadChamps, className: "w-7 h-7 rounded-[2px] border border-dashed border-jade/20 hover:border-jade/40 flex items-center justify-center text-jade/30 hover:text-jade/60 transition-colors cursor-pointer text-[12px]", children: "+" })] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("textarea", { ref: descRef, value: activePage.description ?? "", onChange: e => updatePage(activeIdx, { ...activePage, description: e.target.value }), placeholder: "Describe this build path... Select text then click an item below to link it", className: "w-full overflow-hidden bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-flash/40 placeholder:text-flash/15 resize-none focus:outline-none focus:border-jade/15", style: { minHeight: 64 } }), (() => {
                                const allItems = [...new Set(steps.flatMap(s => s.items))];
                                if (allItems.length === 0)
                                    return null;
                                return (_jsxs("div", { className: "flex items-center gap-1.5 mt-1.5", children: [_jsx("span", { className: "text-[8px] font-mono text-flash/20 uppercase tracking-wider shrink-0", children: "Link item:" }), allItems.map(itemId => (_jsx("button", { type: "button", onClick: () => {
                                                const ta = descRef.current;
                                                if (!ta)
                                                    return;
                                                const desc = activePage.description ?? "";
                                                const start = ta.selectionStart;
                                                const end = ta.selectionEnd;
                                                const selected = desc.slice(start, end);
                                                if (selected) {
                                                    // Wrap selected text with item link
                                                    const linked = `[${selected}](${itemId})`;
                                                    const newDesc = desc.slice(0, start) + linked + desc.slice(end);
                                                    updatePage(activeIdx, { ...activePage, description: newDesc });
                                                }
                                                else {
                                                    // Insert item link at cursor with item ID as placeholder text
                                                    const linked = `[item](${itemId})`;
                                                    const newDesc = desc.slice(0, start) + linked + desc.slice(end);
                                                    updatePage(activeIdx, { ...activePage, description: newDesc });
                                                }
                                                ta.focus();
                                            }, className: "group relative cursor-pointer", title: "Select text in description, then click to link it to this item", children: _jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: "", className: "w-7 h-7 rounded-[2px] border border-flash/[0.08] group-hover:border-jade/30 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)] transition-all" }) }, itemId)))] }));
                            })()] }), _jsxs("div", { className: "flex items-center overflow-x-auto pb-2", children: [steps.map((step, stepIdx) => {
                                const nextStep = steps[stepIdx + 1];
                                const ITEM_SZ = 44, GAP = 6, CONN = 44;
                                const curH = step.items.length * ITEM_SZ + (step.items.length - 1) * GAP;
                                const nextH = nextStep ? nextStep.items.length * ITEM_SZ + (nextStep.items.length - 1) * GAP : 0;
                                const svgH = Math.max(curH, nextH, ITEM_SZ);
                                // Y centers for current step items
                                const curYs = step.items.map((_, i) => {
                                    const top = (svgH - curH) / 2;
                                    return top + i * (ITEM_SZ + GAP) + ITEM_SZ / 2;
                                });
                                // Y centers for next step items
                                const nextYs = nextStep ? nextStep.items.map((_, i) => {
                                    const top = (svgH - nextH) / 2;
                                    return top + i * (ITEM_SZ + GAP) + ITEM_SZ / 2;
                                }) : [];
                                return (_jsxs("div", { className: "flex items-center shrink-0", children: [_jsxs("div", { className: "flex flex-col items-center gap-1.5", children: [step.items.map((itemId, itemIdx) => (_jsxs("div", { className: "group relative", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${itemId}.png`, alt: "", className: "w-11 h-11 rounded-[3px] border border-flash/[0.08] transition-all group-hover:scale-105 group-hover:border-jade/20" }), _jsx("button", { type: "button", onClick: () => removeItemFromStep(stepIdx, itemIdx), className: "absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500/80 text-white text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", children: _jsx(X, { className: "w-2.5 h-2.5" }) })] }, itemIdx))), _jsx("button", { type: "button", onClick: () => setPickerTarget({ mode: "step", stepIdx }), className: "w-7 h-7 rounded-[2px] border border-dashed border-flash/[0.06] flex items-center justify-center text-flash/15 hover:text-jade/30 hover:border-jade/15 transition-colors cursor-pointer text-[10px]", title: "Add alternative item to this step", children: "OR" })] }), nextStep && (_jsx("svg", { width: CONN, height: svgH, className: "shrink-0", style: { minHeight: svgH }, children: curYs.flatMap(fy => nextYs.map((ty, i) => (_jsx("line", { x1: 0, y1: fy, x2: CONN, y2: ty, stroke: "rgba(0,217,146,0.2)", strokeWidth: 1 }, `${fy}-${i}`)))) })), !nextStep && (_jsx("svg", { width: CONN, height: ITEM_SZ, className: "shrink-0", children: _jsx("line", { x1: 0, y1: ITEM_SZ / 2, x2: CONN, y2: ITEM_SZ / 2, stroke: "rgba(0,217,146,0.25)", strokeWidth: 1, strokeDasharray: "3 3" }) }))] }, stepIdx));
                            }), _jsx("button", { type: "button", onClick: () => setPickerTarget({ mode: "new" }), className: "w-11 h-11 shrink-0 rounded-[3px] border border-dashed border-flash/[0.1] flex items-center justify-center text-flash/20 hover:text-jade/40 hover:border-jade/20 transition-colors cursor-pointer", children: _jsx("span", { className: "text-[16px]", children: "+" }) })] }), steps.length === 0 && (_jsx("div", { className: "text-[10px] font-mono text-flash/20 mt-1", children: "Click + to add the first item in your build path" })), _jsxs("div", { className: "mt-4 pt-3 border-t border-flash/[0.04]", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("button", { type: "button", onClick: () => updatePage(activeIdx, { ...activePage, showBoots: !activePage.showBoots }), className: cn("text-[8px] font-orbitron uppercase tracking-[0.1em] h-[24px] px-3 rounded-[2px] border transition-all cursor-pointer", activePage.showBoots
                                            ? "text-jade border-jade/30 bg-jade/10"
                                            : "text-flash/25 border-flash/[0.06] hover:text-flash/40"), children: activePage.showBoots ? "BOOTS ✓" : "BOOTS" }), _jsx("span", { className: "text-[10px] font-mono text-flash/25", children: activePage.showBoots ? "Shown in guide" : "Hidden — click to enable" })] }), activePage.showBoots && (_jsxs("div", { className: "space-y-2", children: [(activePage.boots ?? []).map((boot, bi) => (_jsxs("div", { className: "flex items-center gap-2 px-2 py-1.5 rounded-sm bg-flash/[0.02] border border-flash/[0.04] group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${boot.itemId}.png`, alt: "", className: "w-9 h-9 rounded-[2px] border border-flash/[0.08]" }), _jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [_jsx("span", { className: "text-[10px] font-mono text-flash/30 shrink-0", children: "vs" }), (boot.againstClasses ?? []).map((cls) => (_jsxs("div", { className: "relative group/cls", children: [_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: "w-6 h-6 object-contain", style: { filter: "brightness(1.2)" } }), _jsx("button", { type: "button", onClick: () => {
                                                                    const boots = [...(activePage.boots ?? [])];
                                                                    boots[bi] = { ...boots[bi], againstClasses: (boots[bi].againstClasses ?? []).filter((x) => x !== cls) };
                                                                    updatePage(activeIdx, { ...activePage, boots });
                                                                }, className: "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500/70 text-white text-[6px] flex items-center justify-center opacity-0 group-hover/cls:opacity-100 cursor-pointer", children: "x" })] }, cls))), (boot.againstChampions ?? []).map((c) => (_jsxs("div", { className: "relative group/champ", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-6 h-6 rounded-[2px] border border-flash/[0.08]" }), _jsx("button", { type: "button", onClick: () => {
                                                                    const boots = [...(activePage.boots ?? [])];
                                                                    boots[bi] = { ...boots[bi], againstChampions: (boots[bi].againstChampions ?? []).filter((x) => x !== c) };
                                                                    updatePage(activeIdx, { ...activePage, boots });
                                                                }, className: "absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500/70 text-white text-[6px] flex items-center justify-center opacity-0 group-hover/champ:opacity-100 cursor-pointer", children: "x" })] }, c))), _jsx("button", { type: "button", onClick: () => { loadChamps(); setBootChampPickerIdx(bi); }, className: "w-6 h-6 rounded-[2px] border border-dashed border-jade/15 hover:border-jade/30 flex items-center justify-center text-jade/25 hover:text-jade/50 transition-colors cursor-pointer text-[10px]", children: "+" }), !(boot.againstClasses?.length || boot.againstChampions?.length) && _jsx("span", { className: "text-[10px] font-mono text-flash/20", children: "default" })] }), _jsx("button", { type: "button", onClick: () => {
                                                    const boots = (activePage.boots ?? []).filter((_, i) => i !== bi);
                                                    updatePage(activeIdx, { ...activePage, boots });
                                                }, className: "text-red-400/0 group-hover:text-red-400/40 hover:!text-red-400/80 transition-colors cursor-pointer", children: _jsx(X, { className: "w-3.5 h-3.5" }) })] }, bi))), _jsx("button", { type: "button", onClick: () => setPickerTarget({ mode: "boot" }), className: "w-full py-2 rounded-sm border border-dashed border-flash/[0.06] text-flash/15 hover:text-jade/30 hover:border-jade/15 transition-colors cursor-pointer text-[10px] font-mono", children: "+ Add boots" })] }))] })] })), pickerTarget && _jsx(ItemSearch, { includeComponents: true, onSelect: handlePickerSelect, onClose: () => setPickerTarget(null) }), showChampPicker && createPortal(_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center", onClick: () => setShowChampPicker(false), children: [_jsx("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-[480px] max-h-[520px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]", style: { background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }, onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-15", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" } }), _jsx("div", { className: "relative z-10 flex justify-center gap-4 px-4 py-4 border-b border-flash/[0.04]", children: CLASSES.map(cls => {
                                    const active = (activePage.againstClasses ?? []).includes(cls.key);
                                    return (_jsxs("button", { type: "button", onClick: () => toggleClass(cls.key), className: cn("flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer", active ? "scale-110" : "opacity-35 hover:opacity-65 hover:scale-105"), children: [_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.key.toLowerCase()}.png`, alt: cls.label, className: "w-9 h-9 object-contain", style: active ? { filter: "brightness(1.4) drop-shadow(0 0 8px rgba(0,217,146,0.5))" } : { filter: "brightness(0.7)" } }), _jsx("span", { className: cn("text-[7px] font-orbitron uppercase tracking-wider transition-colors", active ? "text-jade/80" : "text-flash/20"), children: cls.label })] }, cls.key));
                                }) }), _jsx("div", { className: "relative z-10 px-4 py-2.5 border-b border-jade/10", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4 text-jade/30" }), _jsx("input", { value: champSearch, onChange: e => setChampSearch(e.target.value), placeholder: "Or search a specific champion...", className: "flex-1 bg-transparent text-[12px] font-mono text-flash/60 placeholder:text-flash/20 focus:outline-none caret-jade", autoFocus: true }), _jsx("button", { type: "button", onClick: () => setShowChampPicker(false), className: "text-flash/30 hover:text-flash/60 cursor-pointer", children: _jsx(X, { className: "w-4 h-4" }) })] }) }), _jsx("div", { className: "relative z-10 max-h-[340px] overflow-y-auto p-3 scrollbar-hide", children: _jsx("div", { className: "grid grid-cols-8 gap-1.5", children: champList.filter(c => !champSearch || c.name.toLowerCase().includes(champSearch.toLowerCase())).slice(0, 80).map(c => (_jsxs("button", { type: "button", onClick: () => {
                                            updatePage(activeIdx, { ...activePage, againstChampions: [...(activePage.againstChampions ?? []).filter((x) => x !== c.id), c.id] });
                                            setShowChampPicker(false);
                                            setChampSearch("");
                                        }, className: "flex flex-col items-center gap-1 p-1 rounded-sm hover:bg-jade/[0.08] hover:shadow-[0_0_8px_rgba(0,217,146,0.1)] transition-all cursor-pointer group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.id}.png`, alt: c.name, className: "w-9 h-9 rounded-[3px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" }), _jsx("span", { className: "text-[6px] font-mono text-flash/20 group-hover:text-jade/40 truncate w-full text-center transition-colors", children: c.name })] }, c.id))) }) })] })] }), document.body), bootChampPickerIdx !== null && createPortal(_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center", onClick: () => setBootChampPickerIdx(null), children: [_jsx("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-[480px] max-h-[520px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]", style: { background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }, onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-15", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" } }), _jsx("div", { className: "relative z-10 flex justify-center gap-4 px-4 py-4 border-b border-flash/[0.04]", children: CLASSES.map(cls => {
                                    const boot = (activePage?.boots ?? [])[bootChampPickerIdx];
                                    const active = (boot?.againstClasses ?? []).includes(cls.key);
                                    return (_jsxs("button", { type: "button", onClick: () => {
                                            const boots = [...(activePage?.boots ?? [])];
                                            const b = { ...boots[bootChampPickerIdx] };
                                            const current = b.againstClasses ?? [];
                                            b.againstClasses = active ? current.filter((x) => x !== cls.key) : [...current, cls.key];
                                            boots[bootChampPickerIdx] = b;
                                            updatePage(activeIdx, { ...activePage, boots });
                                        }, className: cn("flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer", active ? "scale-110" : "opacity-35 hover:opacity-65 hover:scale-105"), children: [_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.key.toLowerCase()}.png`, alt: cls.label, className: "w-9 h-9 object-contain", style: active ? { filter: "brightness(1.4) drop-shadow(0 0 8px rgba(0,217,146,0.5))" } : { filter: "brightness(0.7)" } }), _jsx("span", { className: cn("text-[7px] font-orbitron uppercase tracking-wider transition-colors", active ? "text-jade/80" : "text-flash/20"), children: cls.label })] }, cls.key));
                                }) }), _jsx("div", { className: "relative z-10 px-4 py-2.5 border-b border-jade/10", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4 text-jade/30" }), _jsx("input", { value: champSearch, onChange: e => setChampSearch(e.target.value), placeholder: "Or search a specific champion...", className: "flex-1 bg-transparent text-[12px] font-mono text-flash/60 placeholder:text-flash/20 focus:outline-none caret-jade", autoFocus: true }), _jsx("button", { type: "button", onClick: () => setBootChampPickerIdx(null), className: "text-flash/30 hover:text-flash/60 cursor-pointer", children: _jsx(X, { className: "w-4 h-4" }) })] }) }), _jsx("div", { className: "relative z-10 max-h-[340px] overflow-y-auto p-3 scrollbar-hide", children: _jsx("div", { className: "grid grid-cols-8 gap-1.5", children: champList.filter(c => !champSearch || c.name.toLowerCase().includes(champSearch.toLowerCase())).slice(0, 80).map(c => (_jsxs("button", { type: "button", onClick: () => {
                                            const boots = [...(activePage?.boots ?? [])];
                                            const b = { ...boots[bootChampPickerIdx] };
                                            b.againstChampions = [...(b.againstChampions ?? []).filter((x) => x !== c.id), c.id];
                                            boots[bootChampPickerIdx] = b;
                                            updatePage(activeIdx, { ...activePage, boots });
                                            setBootChampPickerIdx(null);
                                            setChampSearch("");
                                        }, className: "flex flex-col items-center gap-1 p-1 rounded-sm hover:bg-jade/[0.08] transition-all cursor-pointer group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.id}.png`, alt: c.name, className: "w-9 h-9 rounded-[3px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" }), _jsx("span", { className: "text-[6px] font-mono text-flash/20 group-hover:text-jade/40 truncate w-full text-center transition-colors", children: c.name })] }, c.id))) }) })] })] }), document.body)] }));
}
// ── Jungle Path Editor ──
const ALL_CAMPS = ["blue", "gromp", "wolves", "raptors", "red", "krugs", "scuttle_top", "scuttle_bot"];
const MINIMAP_URL = "https://ddragon.leagueoflegends.com/cdn/14.10.1/img/map/map11.png";
function JunglePathEditor({ section, onChange }) {
    const [activeIdx, setActiveIdx] = useState(0);
    const paths = section.paths ?? [];
    const activePath = paths[activeIdx];
    const [showChampPicker, setShowChampPicker] = useState(false);
    const [champList, setChampList] = useState([]);
    const [champSearch, setChampSearch] = useState("");
    const descRef = useRef(null);
    useAutoResize(descRef, activePath?.description ?? "", 64);
    const updatePath = (idx, path) => {
        const newPaths = [...paths];
        newPaths[idx] = path;
        onChange({ ...section, paths: newPaths });
    };
    const addPath = () => {
        const newPaths = [...paths, { name: `Path ${paths.length + 1}`, side: "blue", camps: [], description: "" }];
        onChange({ ...section, paths: newPaths });
        setActiveIdx(newPaths.length - 1);
    };
    const removePath = (idx) => {
        if (paths.length <= 1)
            return;
        const newPaths = paths.filter((_, i) => i !== idx);
        onChange({ ...section, paths: newPaths });
        if (activeIdx >= newPaths.length)
            setActiveIdx(newPaths.length - 1);
    };
    const toggleCamp = (camp) => {
        const camps = activePath.camps;
        const existing = camps.indexOf(camp);
        if (existing >= 0) {
            updatePath(activeIdx, { ...activePath, camps: camps.filter(c => c !== camp) });
        }
        else {
            updatePath(activeIdx, { ...activePath, camps: [...camps, camp] });
        }
    };
    const loadChamps = () => {
        if (champList.length === 0) {
            fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
                .then(r => r.json())
                .then(data => {
                const list = Object.values(data?.data ?? {}).map(c => ({ id: String(c.id), name: String(c.name) }));
                setChampList(list.sort((a, b) => a.name.localeCompare(b.name)));
            })
                .catch(() => { });
        }
        setShowChampPicker(true);
    };
    if (!activePath)
        return null;
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5 mb-4 border-b border-flash/[0.04] pb-2", children: [paths.map((p, idx) => (_jsxs("button", { type: "button", onClick: () => setActiveIdx(idx), className: cn("group relative px-3 py-1.5 rounded-sm text-[10px] font-mono transition-all cursor-pointer", activeIdx === idx ? "bg-jade/[0.1] text-jade/80 border border-jade/25" : "text-flash/30 hover:text-flash/60 border border-transparent hover:border-flash/[0.08]"), children: [p.name || `Path ${idx + 1}`, paths.length > 1 && (_jsx("span", { onClick: (e) => { e.stopPropagation(); removePath(idx); }, className: "absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", children: "x" }))] }, idx))), _jsx("button", { type: "button", onClick: addPath, className: "text-[9px] font-orbitron text-jade/30 hover:text-jade/60 px-2.5 py-1.5 border border-dashed border-jade/15 hover:border-jade/30 rounded-sm transition-colors cursor-pointer", children: "+ Path" })] }), _jsxs("div", { className: "flex items-start gap-3 mb-4", children: [_jsx("input", { value: activePath.name, onChange: e => updatePath(activeIdx, { ...activePath, name: e.target.value }), placeholder: "e.g. Standard Full Clear", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[13px] font-orbitron text-flash/60 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" }), _jsxs("button", { type: "button", onClick: () => updatePath(activeIdx, { ...activePath, side: activePath.side === "blue" ? "red" : "blue" }), className: cn("px-3 py-1.5 rounded-sm text-[10px] font-orbitron uppercase tracking-[0.1em] border transition-all cursor-pointer", activePath.side === "blue" ? "text-blue-300/70 border-blue-400/20 bg-blue-500/10 hover:border-blue-400/40" : "text-red-300/70 border-red-400/20 bg-red-500/10 hover:border-red-400/40"), children: [activePath.side, " side"] }), _jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [_jsx("span", { className: "text-[9px] font-mono text-flash/25 uppercase", children: "vs" }), (activePath.againstChampions ?? []).map(c => (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-7 h-7 rounded-[2px] border border-flash/[0.08]" }), _jsx("button", { type: "button", onClick: () => updatePath(activeIdx, { ...activePath, againstChampions: (activePath.againstChampions ?? []).filter(x => x !== c) }), className: "absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500/70 text-white text-[7px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer", children: "x" })] }, c))), _jsx("button", { type: "button", onClick: loadChamps, className: "w-7 h-7 rounded-[2px] border border-dashed border-jade/20 hover:border-jade/40 flex items-center justify-center text-jade/30 hover:text-jade/60 transition-colors cursor-pointer text-[12px]", children: "+" })] })] }), _jsx("textarea", { ref: descRef, value: activePath.description ?? "", onChange: e => updatePath(activeIdx, { ...activePath, description: e.target.value }), placeholder: "Describe this jungle path...", className: "w-full overflow-hidden bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-flash/40 placeholder:text-flash/15 resize-none focus:outline-none focus:border-jade/15 mb-4", style: { minHeight: 64 } }), _jsxs("div", { className: "relative w-[300px] h-[300px] rounded-sm overflow-hidden border border-flash/[0.08] bg-black/40", children: [_jsx("img", { src: MINIMAP_URL, alt: "Map", className: "w-full h-full object-cover opacity-50", draggable: false }), _jsx("div", { className: "absolute inset-0 bg-liquirice/20" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-10", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.03) 3px, rgba(0,217,146,0.03) 4px)" } }), _jsx("svg", { className: "absolute inset-0 w-full h-full z-10 pointer-events-none", children: activePath.camps.map((camp, i) => {
                            if (i === 0)
                                return null;
                            const prev = CAMP_POSITIONS[activePath.camps[i - 1]][activePath.side];
                            const curr = CAMP_POSITIONS[camp][activePath.side];
                            return _jsx("line", { x1: `${prev.x}%`, y1: `${prev.y}%`, x2: `${curr.x}%`, y2: `${curr.y}%`, stroke: "rgba(0,217,146,0.3)", strokeWidth: 1.5, strokeDasharray: "4 3" }, i);
                        }) }), ALL_CAMPS.map(camp => {
                        const pos = CAMP_POSITIONS[camp][activePath.side];
                        const idx = activePath.camps.indexOf(camp);
                        const isSelected = idx >= 0;
                        return (_jsx("button", { type: "button", onClick: () => toggleCamp(camp), className: "absolute z-20 cursor-pointer transition-all duration-200 hover:scale-110", style: { left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }, children: _jsx("div", { className: cn("w-7 h-7 rounded-full flex items-center justify-center border transition-all", isSelected
                                    ? "bg-black/80 border-jade/50 shadow-[0_0_10px_rgba(0,217,146,0.3)]"
                                    : "bg-black/40 border-flash/[0.15] hover:border-flash/30"), children: isSelected ? (_jsx("span", { className: "text-[11px] font-orbitron font-bold text-jade", children: idx + 1 })) : (_jsx("span", { className: "text-[7px] font-mono text-flash/30", children: CAMP_POSITIONS[camp].label.slice(0, 2) })) }) }, camp));
                    })] }), showChampPicker && createPortal(_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center", onClick: () => setShowChampPicker(false), children: [_jsx("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-[480px] max-h-[520px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]", style: { background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }, onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "relative z-10 px-4 py-2.5 border-b border-jade/10", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4 text-jade/30" }), _jsx("input", { value: champSearch, onChange: e => setChampSearch(e.target.value), placeholder: "Search enemy jungler...", className: "flex-1 bg-transparent text-[12px] font-mono text-flash/60 placeholder:text-flash/20 focus:outline-none caret-jade", autoFocus: true }), _jsx("button", { type: "button", onClick: () => setShowChampPicker(false), className: "text-flash/30 hover:text-flash/60 cursor-pointer", children: _jsx(X, { className: "w-4 h-4" }) })] }) }), _jsx("div", { className: "relative z-10 max-h-[400px] overflow-y-auto p-3 scrollbar-hide", children: _jsx("div", { className: "grid grid-cols-8 gap-1.5", children: champList.filter(c => !champSearch || c.name.toLowerCase().includes(champSearch.toLowerCase())).slice(0, 80).map(c => (_jsxs("button", { type: "button", onClick: () => {
                                            updatePath(activeIdx, { ...activePath, againstChampions: [...(activePath.againstChampions ?? []).filter(x => x !== c.id), c.id] });
                                            setShowChampPicker(false);
                                            setChampSearch("");
                                        }, className: "flex flex-col items-center gap-1 p-1 rounded-sm hover:bg-jade/[0.08] transition-all cursor-pointer group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.id}.png`, alt: c.name, className: "w-9 h-9 rounded-[3px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" }), _jsx("span", { className: "text-[6px] font-mono text-flash/20 group-hover:text-jade/40 truncate w-full text-center transition-colors", children: c.name })] }, c.id))) }) })] })] }), document.body)] }));
}
// ── Section wrapper ──
function SectionEditor({ section, onChange, index, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop }) {
    const [collapsed, setCollapsed] = useState(false);
    const typeLabel = { introduction: "Intro", matchups: "Matchups", build: "Build", runes: "Runes", recommended_items: "Items", back_timings: "Backs", jungle_pathing: "Path" }[section.type] ?? section.type;
    return (_jsxs("div", { onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver(index); }, onDragEnd: onDragEnd, onDrop: (e) => { e.preventDefault(); onDrop(index); }, className: cn("relative rounded-sm border transition-all duration-300 overflow-visible", section.visible ? "border-flash/[0.06] bg-flash/[0.008]" : "border-flash/[0.03] opacity-40", isDragOver && "border-jade/30 shadow-[0_0_12px_rgba(0,217,146,0.1)]"), style: { animation: "sectionReveal 0.3s ease-out forwards" }, children: [isDragOver && _jsx("div", { className: "absolute top-0 left-0 right-0 h-[2px] bg-jade shadow-[0_0_8px_rgba(0,217,146,0.5)] z-20" }), _jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/15 rounded-l-sm" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-15 rounded-sm overflow-hidden", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,217,146,0.008) 4px, rgba(0,217,146,0.008) 5px)" } }), _jsx(SectionHeader, { title: section.title, type: typeLabel, visible: section.visible, collapsed: collapsed, onTitleChange: t => onChange({ ...section, title: t }), onToggleVisible: () => onChange({ ...section, visible: !section.visible }), onToggleCollapse: () => setCollapsed(!collapsed), onDragStart: () => onDragStart(index) }), !collapsed && (_jsxs("div", { className: "relative z-10 p-4", children: [section.type === "introduction" && _jsx(IntroEditor, { section: section, onChange: onChange }), section.type === "matchups" && _jsx(MatchupEditor, { section: section, onChange: onChange }), section.type === "build" && _jsx(MultiBuildEditor, { section: section, onChange: onChange }), section.type === "recommended_items" && _jsx(RecommendedItemsEditor, { section: section, onChange: onChange }), section.type === "runes" && (_jsx(MultiRuneEditor, { section: section, onChange: onChange })), section.type === "back_timings" && _jsx(BackTimingEditor, { section: section, onChange: onChange }), section.type === "jungle_pathing" && _jsx(JunglePathEditor, { section: section, onChange: onChange })] }))] }));
}
// ── Main Editor ──
export function GuideEditor({ championId, existingGuide, onSave }) {
    const { session, nametag } = useAuth();
    const [title, setTitle] = useState(existingGuide?.title ?? `${championId} Guide`);
    const [authorName, setAuthorName] = useState(existingGuide?.author_name ?? nametag ?? "");
    const [role, setRoleRaw] = useState(existingGuide?.role ?? "");
    const setRole = useCallback((r) => {
        setRoleRaw(r);
        setSections(prev => {
            const hasJungle = prev.some(s => s.type === "jungle_pathing");
            if (r === "JUNGLE" && !hasJungle)
                return [...prev, SECTION_TEMPLATES.jungle_pathing()];
            if (r !== "JUNGLE" && hasJungle)
                return prev.filter(s => s.type !== "jungle_pathing");
            return prev;
        });
    }, []);
    const [linkedAccount, setLinkedAccount] = useState(existingGuide?.author_linked_account ?? "");
    const [discord, setDiscord] = useState(existingGuide?.author_discord ?? "");
    const [twitter, setTwitter] = useState(existingGuide?.author_twitter ?? "");
    const [reddit, setReddit] = useState(existingGuide?.author_reddit ?? "");
    const [sections, setSections] = useState(existingGuide?.sections ?? [
        SECTION_TEMPLATES.introduction(),
        SECTION_TEMPLATES.recommended_items(),
        SECTION_TEMPLATES.build(),
        SECTION_TEMPLATES.runes(),
        SECTION_TEMPLATES.matchups(),
        SECTION_TEMPLATES.back_timings(),
    ]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    // Auto-inject jungle section for existing guides with role=JUNGLE
    useEffect(() => {
        if (role === "JUNGLE") {
            setSections(prev => {
                if (prev.some(s => s.type === "jungle_pathing"))
                    return prev;
                return [...prev, SECTION_TEMPLATES.jungle_pathing()];
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const handleDrop = useCallback((targetIdx) => {
        if (dragIdx === null || dragIdx === targetIdx) {
            setDragIdx(null);
            setDragOverIdx(null);
            return;
        }
        setSections(prev => {
            const arr = [...prev];
            const [moved] = arr.splice(dragIdx, 1);
            arr.splice(targetIdx, 0, moved);
            return arr;
        });
        setDragIdx(null);
        setDragOverIdx(null);
    }, [dragIdx]);
    const updateSection = useCallback((idx, section) => {
        setSections(prev => prev.map((s, i) => i === idx ? section : s));
    }, []);
    const save = async () => {
        if (!session?.user) {
            setError("You must be logged in");
            return;
        }
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const guideData = {
                champion_id: championId,
                author_id: session.user.id,
                author_name: authorName || nametag || session.user.email || "Anonymous",
                author_linked_account: linkedAccount || null,
                author_discord: discord || null,
                author_twitter: twitter || null,
                author_reddit: reddit || null,
                title, patch: null, role: role || null, sections,
                updated_at: new Date().toISOString(),
            };
            if (existingGuide?.id) {
                const { error: err } = await supabase.from("guides").update(guideData).eq("id", existingGuide.id);
                if (err)
                    throw err;
            }
            else {
                const { error: err } = await supabase.from("guides").insert(guideData);
                if (err)
                    throw err;
            }
            setSuccess(true);
            setTimeout(() => onSave?.(guideData), 500);
        }
        catch (e) {
            setError(e.message ?? "Failed to save");
        }
        finally {
            setSaving(false);
        }
    };
    if (!session?.user) {
        return (_jsx("div", { className: "text-center py-16", children: _jsx("div", { className: "text-[14px] font-mono text-flash/30", children: "Log in to create a guide" }) }));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("style", { children: `
        @keyframes sectionReveal { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }
      ` }), _jsxs("div", { className: "relative overflow-hidden rounded-sm border border-flash/[0.06] bg-flash/[0.01] p-4", children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/25" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex gap-3", children: [_jsx("input", { value: title, onChange: e => setTitle(e.target.value), placeholder: "Guide title", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-2 text-[14px] font-mono text-flash/60 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" }), _jsx(RolePicker, { value: role, onChange: setRole })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { value: authorName, onChange: e => setAuthorName(e.target.value), placeholder: "Author name", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" }), _jsx("input", { value: linkedAccount, onChange: e => setLinkedAccount(e.target.value), placeholder: "Linked account (e.g. Wasureta#EUW)", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { value: discord, onChange: e => setDiscord(e.target.value), placeholder: "Discord username", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" }), _jsx("input", { value: twitter, onChange: e => setTwitter(e.target.value), placeholder: "X handle (e.g. @username)", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" }), _jsx("input", { value: reddit, onChange: e => setReddit(e.target.value), placeholder: "Reddit username (e.g. u/username)", className: "flex-1 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-3 py-1.5 text-[10px] font-mono text-flash/35 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" })] })] })] }), sections.map((section, idx) => (_jsx(SectionEditor, { section: section, onChange: s => updateSection(idx, s), index: idx, isDragOver: dragOverIdx === idx && dragIdx !== idx, onDragStart: setDragIdx, onDragOver: setDragOverIdx, onDragEnd: () => { setDragIdx(null); setDragOverIdx(null); }, onDrop: handleDrop }, `${section.type}-${idx}`))), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { type: "button", onClick: save, disabled: saving, className: cn("relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-sm font-mono text-[11px] uppercase tracking-[0.15em] transition-all cursor-pointer", saving ? "bg-jade/5 text-jade/20 border border-jade/10" : "bg-jade/15 text-jade/80 border border-jade/25 hover:bg-jade/25 hover:shadow-[0_0_15px_rgba(0,217,146,0.15)]"), children: [_jsx(Save, { className: "w-3.5 h-3.5" }), saving ? "Saving..." : existingGuide ? "Update Guide" : "Publish Guide"] }), error && _jsx("span", { className: "text-[10px] font-mono text-red-400/70", children: error }), success && _jsx("span", { className: "text-[10px] font-mono text-jade/60", children: "Saved successfully" })] })] }));
}
