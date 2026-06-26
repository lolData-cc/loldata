"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
// Champion stats read from the match-data box (api2) — fresh box data, not Cloud.
import { BOX_API_BASE_URL as API_BASE_URL, cdnBaseUrl } from "@/config";
import { getKeystoneIcon, getKeystoneName, getStyleIcon, getStyleName } from "@/constants/runes";
import { getLegacyRankIcons } from "@/lib/uiPrefs";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Globe } from "lucide-react";
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon, } from "@/components/ui/roleicons";
import { BorderBeam } from "./ui/border-beam";
import { Dialog, DialogContent, DialogTrigger, } from "@/components/ui/dialog";
// ─────────────────────────────────────────────────────────────
// HELPERS (anti-crash)
// ─────────────────────────────────────────────────────────────
const num = (v, fallback = 0) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
};
const pct = (v, digits = 2) => `${num(v, 0).toFixed(digits)}%`;
// Winrate → homepage token color. >=51 jade, 49–51 neutral, <49 error red.
const wrClass = (wr) => wr >= 51 ? "text-jade" : wr >= 49 ? "text-flash/75" : "text-[#ff6286]";
// Glass shadow shared by the homepage cards.
const GLASS = {
    boxShadow: "0 40px 90px -50px rgba(0,217,146,0.30), inset 0 1px 0 rgba(255,255,255,0.04)",
};
// ─────────────────────────────────────────────────────────────
// TECH CARD (glass container)
// ─────────────────────────────────────────────────────────────
function TechCard({ children, className, }) {
    return (_jsx("div", { className: cn("rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] backdrop-blur-md", className), style: GLASS, children: children }));
}
// ─────────────────────────────────────────────────────────────
// ROLE FILTER BAR (bigger icons + optional BorderBeam)
// ─────────────────────────────────────────────────────────────
const ROLES = [
    { key: "TOP", label: "Top", Icon: RoleTopIcon },
    { key: "JUNGLE", label: "Jungle", Icon: RoleJungleIcon },
    { key: "MIDDLE", label: "Mid", Icon: RoleMidIcon },
    { key: "BOTTOM", label: "ADC", Icon: RoleAdcIcon },
    { key: "SUPPORT", label: "Sup", Icon: RoleSupportIcon },
];
function OpponentPentagonDialog({ opponents, champions, onSetOpponent, onClearOpponent, selectedRole, legendaryItems, onSetItem, onClearItem, }) {
    const [open, setOpen] = useState(false);
    const [activeSlot, setActiveSlot] = useState(null);
    const [activeItemSlot, setActiveItemSlot] = useState(null);
    const [search, setSearch] = useState("");
    const inputRef = useRef(null);
    const slotMap = useMemo(() => {
        const m = {};
        for (const o of opponents)
            if (o.role)
                m[o.role] = o;
        return m;
    }, [opponents]);
    const trimmed = search.trim().toLowerCase();
    const filteredChamps = useMemo(() => {
        if (trimmed.length < 2)
            return [];
        return champions.filter((c) => c.name.toLowerCase().includes(trimmed) || c.id.toLowerCase().includes(trimmed));
    }, [champions, trimmed]);
    const filteredItems = useMemo(() => {
        if (trimmed.length < 2)
            return legendaryItems;
        return legendaryItems.filter((it) => it.name.toLowerCase().includes(trimmed));
    }, [legendaryItems, trimmed]);
    useEffect(() => {
        if (activeSlot || activeItemSlot)
            setTimeout(() => inputRef.current?.focus(), 50);
    }, [activeSlot, activeItemSlot]);
    useEffect(() => {
        if (!open) {
            setActiveSlot(null);
            setActiveItemSlot(null);
            setSearch("");
        }
        else if (selectedRole && !slotMap[selectedRole])
            setActiveSlot(selectedRole);
    }, [open, selectedRole, slotMap]);
    const handleSelect = (champName) => {
        if (!activeSlot)
            return;
        onSetOpponent(activeSlot, champName);
        setActiveSlot(null);
        setSearch("");
    };
    const handleItemSelect = (item) => {
        if (!activeItemSlot)
            return;
        onSetItem(activeItemSlot, item.id, item.name);
        setActiveItemSlot(null);
        setSearch("");
    };
    const DELAYS = [0.05, 0.13, 0.21, 0.29, 0.37];
    const slotCard = (roleIdx) => {
        const r = ROLES[roleIdx];
        const opp = slotMap[r.key];
        const isActive = activeSlot === r.key;
        return (_jsx("div", { style: { opacity: 0, animation: `pentSlotIn 0.45s ease-out ${DELAYS[roleIdx]}s forwards` }, children: _jsxs("button", { type: "button", onClick: () => {
                    if (opp)
                        return;
                    setActiveSlot(isActive ? null : r.key);
                    setSearch("");
                }, className: cn("w-[148px] rounded-md border p-3 transition-all cursor-clicker", isActive
                    ? "border-jade/50 bg-jade/10"
                    : opp
                        ? "border-jade/30 bg-jade/[0.04]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-jade/30 hover:bg-white/[0.03]"), children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(r.Icon, { className: cn("w-4 h-4", opp ? "text-jade" : "text-flash/30") }), _jsx("span", { className: cn("text-[9px] font-jetbrains uppercase tracking-[0.15em]", opp ? "text-jade" : "text-flash/25"), children: r.label })] }), _jsx("div", { className: "border-t border-white/[0.06] pt-2", children: opp ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${opp.name}.png`, alt: opp.name, className: "w-6 h-6 rounded-sm" }), _jsx("span", { className: "text-[10px] font-jetbrains text-flash/80 truncate flex-1 text-left", children: opp.name }), _jsx("span", { onClick: (e) => { e.stopPropagation(); onClearOpponent(r.key); }, className: "text-flash/20 hover:text-flash text-xs cursor-clicker transition-colors", children: "\u2715" })] })) : (_jsx("span", { className: cn("text-[10px] font-jetbrains uppercase tracking-[0.15em]", isActive ? "text-jade" : "text-flash/20"), children: "+ Add" })) })] }) }, r.key));
    };
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsxs(DialogTrigger, { className: cn("h-10 px-3 rounded-full border cursor-clicker", "bg-jade/[0.02] hover:border-jade/40 transition-colors", "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.2em] flex items-center gap-2", opponents.length > 0
                    ? "border-jade/50 text-jade"
                    : "border-jade/15 text-flash/50 hover:text-flash/80"), children: [_jsx("span", { children: "VS" }), opponents.length > 0 && (_jsx("div", { className: "flex -space-x-1", children: opponents.map((o) => (_jsxs("div", { className: "relative", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${o.name}.png`, alt: o.name, className: "w-5 h-5 rounded-sm ring-1 ring-black" }), o.itemId && (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${o.itemId}.png`, alt: o.itemName ?? "", className: "absolute -bottom-1 -right-1 w-3 h-3 rounded-sm ring-1 ring-black" }))] }, o.championId))) }))] }), open && createPortal(_jsxs("div", { className: "fixed inset-0 z-50 overflow-hidden", onClick: () => setOpen(false), children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", style: {
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,217,146,0.018) 2px, rgba(0,217,146,0.018) 4px)',
                        } }), _jsx("style", { children: `
            @keyframes pentSlotIn {
              0%   { opacity: 0; transform: translate(-50%, -50%) scaleY(0); }
              60%  { opacity: 1; transform: translate(-50%, -50%) scaleY(1.04); }
              100% { opacity: 1; transform: translate(-50%, -50%) scaleY(1); }
            }
            @keyframes searchPanelIn {
              0%   { opacity: 0; transform: translate(-50%, 8px); }
              100% { opacity: 1; transform: translate(-50%, 0); }
            }
          ` }), ROLES.map((r, i) => {
                        const opp = slotMap[r.key];
                        const isActive = activeSlot === r.key;
                        // Pentagon vertices — tight
                        const pos = [
                            { top: "26%", left: "50%" }, // TOP
                            { top: "42%", left: "35%" }, // JNG
                            { top: "42%", left: "65%" }, // MID
                            { top: "60%", left: "38%" }, // ADC
                            { top: "60%", left: "62%" }, // SUP
                        ][i];
                        return (_jsx("div", { className: "absolute", style: {
                                top: pos.top,
                                left: pos.left,
                                opacity: 0,
                                animation: `pentSlotIn 0.35s ease-out ${0.04 + i * 0.07}s forwards`,
                            }, onClick: (e) => e.stopPropagation(), children: _jsxs("button", { type: "button", onClick: () => {
                                    if (opp)
                                        return;
                                    setActiveSlot(isActive ? null : r.key);
                                    setActiveItemSlot(null);
                                    setSearch("");
                                }, className: cn("relative overflow-hidden w-[220px] rounded-md border p-5 transition-all", "bg-black/80 backdrop-blur-xl", isActive
                                    ? "border-jade/50 shadow-[0_0_12px_rgba(0,217,146,0.15)] cursor-clicker"
                                    : opp
                                        ? "border-jade/30 shadow-[0_0_8px_rgba(0,217,146,0.06)] cursor-clicker"
                                        : "border-white/15 shadow-[0_0_8px_rgba(255,255,255,0.03)] hover:border-white/25 cursor-clicker"), children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx(r.Icon, { className: cn("w-6 h-6", opp ? "text-jade" : "text-flash/25") }), _jsx("span", { className: cn("text-[12px] font-jetbrains uppercase tracking-[0.18em]", opp ? "text-jade" : "text-flash/20"), children: r.label })] }), _jsx("div", { className: "border-t border-white/[0.06] pt-3", children: opp ? (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${opp.name}.png`, alt: opp.name, className: "w-8 h-8 rounded-sm" }), _jsx("span", { className: "text-[13px] font-jetbrains text-flash/80 truncate flex-1 text-left", children: opp.name }), _jsx("span", { onClick: (e) => { e.stopPropagation(); onClearOpponent(r.key); }, className: "text-flash/20 hover:text-flash text-sm cursor-clicker transition-colors", children: "\u2715" })] }), _jsx("div", { className: "flex items-center gap-2 pl-1 mt-1", children: opp.itemId ? (_jsxs(_Fragment, { children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${opp.itemId}.png`, alt: opp.itemName ?? "", className: "w-5 h-5 rounded-sm" }), _jsx("span", { className: "text-[10px] font-jetbrains text-flash/50 truncate flex-1 text-left", children: opp.itemName }), _jsx("span", { onClick: (e) => { e.stopPropagation(); onClearItem(r.key); }, className: "text-flash/15 hover:text-flash text-[10px] cursor-clicker transition-colors", children: "\u2715" })] })) : (_jsxs("span", { onClick: (e) => {
                                                            e.stopPropagation();
                                                            setActiveItemSlot(activeItemSlot === r.key ? null : r.key);
                                                            setActiveSlot(null);
                                                            setSearch("");
                                                        }, className: "group/item flex items-center gap-2 cursor-clicker", children: [_jsxs("span", { className: cn("relative w-4 h-4 flex items-center justify-center transition-all duration-200"), children: [_jsx("span", { className: cn("absolute w-[10px] h-[10px] rotate-45 rounded-[2px] border transition-all duration-200", activeItemSlot === r.key
                                                                            ? "border-jade/80 bg-jade/15 shadow-[0_0_8px_rgba(0,217,146,0.3)]"
                                                                            : "border-jade/30 bg-transparent group-hover/item:border-jade/50 group-hover/item:bg-jade/5") }), _jsx("span", { className: cn("relative text-[8px] font-bold transition-colors duration-200", activeItemSlot === r.key
                                                                            ? "text-jade"
                                                                            : "text-jade/40 group-hover/item:text-jade/70"), children: "+" })] }), _jsx("span", { className: cn("text-[9px] font-jetbrains uppercase tracking-[0.12em] transition-colors duration-200", activeItemSlot === r.key
                                                                    ? "text-jade"
                                                                    : "text-jade/35 group-hover/item:text-jade/60"), children: "Item" })] })) })] })) : (_jsx("span", { className: cn("text-[12px] font-jetbrains uppercase tracking-[0.15em]", isActive ? "text-jade" : "text-flash/15"), children: "+ Add" })) })] }) }, r.key));
                    }), (activeSlot || activeItemSlot) && (_jsx("div", { className: "absolute left-1/2 bottom-[8%] w-[420px]", style: { animation: "searchPanelIn 0.25s ease-out forwards" }, onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: cn("rounded-md border border-jade/20 p-4", "bg-black/70 backdrop-blur-xl", "shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_0_0_0.5px_rgba(255,255,255,0.06)]"), children: [_jsxs("div", { className: "relative mb-3", children: [_jsx("input", { ref: inputRef, type: "text", placeholder: activeItemSlot
                                                ? `Search item for ${ROLES.find((rl) => rl.key === activeItemSlot)?.label ?? ""}...`
                                                : `Search champion for ${ROLES.find((rl) => rl.key === activeSlot)?.label ?? ""}...`, className: cn("w-full bg-white/[0.03] border border-white/[0.06] rounded-sm", "px-3 py-2 text-[13px] font-jetbrains text-flash placeholder:text-flash/20", "focus:outline-none focus:border-jade/30 transition-colors"), value: search, onChange: (e) => setSearch(e.target.value) }), _jsx("div", { className: cn("absolute bottom-0 left-0 h-[1px] bg-jade/50 transition-all duration-300", search.length > 0 ? "w-full" : "w-0") })] }), activeItemSlot ? (
                                /* Item search grid */
                                _jsx("div", { className: "max-h-[200px] overflow-y-auto overscroll-none cyber-scrollbar", children: filteredItems.length === 0 ? (_jsx("div", { className: "text-center py-3", children: _jsx("span", { className: "text-[10px] font-jetbrains text-flash/20 uppercase tracking-[0.2em]", children: "No match" }) })) : (_jsx("div", { className: "grid grid-cols-5 gap-2", children: filteredItems.map((it) => (_jsxs("button", { type: "button", className: cn("group flex flex-col items-center gap-1 py-2 px-1 rounded-sm cursor-clicker", "bg-white/[0.02] border border-transparent", "hover:bg-jade/10 hover:border-jade/20 transition-all duration-150"), onClick: () => handleItemSelect(it), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${it.id}.png`, alt: it.name, className: "w-8 h-8 rounded-sm transition-transform duration-150 group-hover:scale-105 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)]" }), _jsx("span", { className: "text-[7px] font-jetbrains text-flash/35 group-hover:text-jade/80 truncate max-w-[70px] transition-colors text-center leading-tight", children: it.name })] }, it.id))) })) })) : (
                                /* Champion search grid */
                                _jsx("div", { className: "max-h-[160px] overflow-y-auto overscroll-none cyber-scrollbar", children: trimmed.length < 2 ? (_jsx("div", { className: "text-center py-3", children: _jsx("span", { className: "text-[10px] font-jetbrains text-flash/20 uppercase tracking-[0.2em]", children: "min. 2 characters" }) })) : filteredChamps.length === 0 ? (_jsx("div", { className: "text-center py-3", children: _jsx("span", { className: "text-[10px] font-jetbrains text-flash/20 uppercase tracking-[0.2em]", children: "No match" }) })) : (_jsx("div", { className: "grid grid-cols-7 gap-2", children: filteredChamps.map((champ) => (_jsxs("button", { type: "button", className: cn("group flex flex-col items-center gap-1.5 py-2 px-1 rounded-sm cursor-clicker", "bg-white/[0.02] border border-transparent", "hover:bg-jade/10 hover:border-jade/20 transition-all duration-150"), onClick: () => handleSelect(champ.name), children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${champ.name}.png`, alt: champ.name, className: "w-10 h-10 rounded-sm transition-transform duration-150 group-hover:scale-105 group-hover:shadow-[0_0_8px_rgba(0,217,146,0.2)]" }), _jsx("span", { className: "text-[8px] font-jetbrains text-flash/35 group-hover:text-jade/80 truncate max-w-[50px] transition-colors", children: champ.name })] }, champ.id))) })) }))] }) }))] }), document.body)] }));
}
const FILTER_REGIONS = [
    { key: "euw1", label: "EUW" },
    { key: "na1", label: "NA" },
    { key: "kr", label: "KR" },
    { key: "jp1", label: "JP" },
    { key: "br1", label: "BR" },
    { key: "oc1", label: "OCE" },
    { key: "tr1", label: "TR" },
    { key: "ru", label: "RU" },
];
function PatchFilterButton({ value, onChange, patches }) {
    const [open, setOpen] = useState(false);
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsx("button", { type: "button", className: cn("h-10 px-3 rounded-full border transition-colors cursor-clicker", "bg-jade/[0.02] hover:border-jade/40", "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.2em]", value ? "text-jade border-jade/50" : "border-jade/15 text-flash/50"), children: value ?? "Latest" }) }), _jsxs(DialogContent, { className: "bg-[rgba(6,12,14,0.9)] backdrop-blur-xl border border-jade/15 p-4 max-w-[260px] rounded-2xl", children: [_jsx("p", { className: "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.28em] text-jade/80 mb-3", children: "Patch" }), _jsxs("div", { className: "max-h-[240px] overflow-y-auto scrollbar-hide space-y-1", children: [_jsx("button", { type: "button", onClick: () => { onChange(null); setOpen(false); }, className: cn("w-full text-left px-3 py-2 rounded-md text-[11px] font-jetbrains tracking-wider transition-colors cursor-clicker", value === null ? "text-jade bg-jade/10" : "text-flash/50 hover:bg-flash/5"), children: "Latest" }), patches.map((p) => (_jsx("button", { type: "button", onClick: () => { onChange(p); setOpen(false); }, className: cn("w-full text-left px-3 py-2 rounded-md text-[11px] font-jetbrains tracking-wider transition-colors cursor-clicker", value === p ? "text-jade bg-jade/10" : "text-flash/50 hover:bg-flash/5"), children: p }, p)))] })] })] }));
}
function RegionFilterButton({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const regionLabel = value ? FILTER_REGIONS.find((r) => r.key === value)?.label ?? value : null;
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsx("button", { type: "button", className: cn("h-10 rounded-full border transition-colors cursor-clicker flex items-center justify-center", "bg-jade/[0.02] hover:border-jade/40", "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.2em]", value ? "text-jade border-jade/50 px-3" : "border-jade/15 text-flash/50 w-10"), children: regionLabel ?? _jsx(Globe, { className: "h-4 w-4" }) }) }), _jsxs(DialogContent, { className: "bg-[rgba(6,12,14,0.9)] backdrop-blur-xl border border-jade/15 p-4 max-w-[280px] rounded-2xl", children: [_jsx("p", { className: "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.28em] text-jade/80 mb-3", children: "Region" }), _jsxs("div", { className: "grid grid-cols-4 gap-2", children: [_jsx("button", { type: "button", onClick: () => { onChange(null); setOpen(false); }, className: cn("px-2 py-2 rounded-md transition-colors cursor-clicker flex items-center justify-center", value === null ? "text-jade bg-jade/10 ring-1 ring-jade/30" : "text-flash/50 hover:bg-flash/5"), children: _jsx(Globe, { className: "h-4 w-4" }) }), FILTER_REGIONS.map((r) => (_jsx("button", { type: "button", onClick: () => { onChange(r.key); setOpen(false); }, className: cn("px-2 py-2 rounded-md text-[11px] font-jetbrains tracking-wider transition-colors cursor-clicker text-center", value === r.key ? "text-jade bg-jade/10 ring-1 ring-jade/30" : "text-flash/50 hover:bg-flash/5"), children: r.label }, r.key)))] })] })] }));
}
function FilterBar({ selectedPatch, onPatchChange, availablePatches, selectedRegion, onRegionChange, role, onRoleChange, suggestedRole, tier, onTierChange, opponents, champions, onSetOpponent, onClearOpponent, legendaryItems, onSetItem, onClearItem, }) {
    return (_jsx("div", { className: "fixed bottom-6 left-1/2 -translate-x-1/2 z-[999]", children: _jsx("div", { className: "bg-[rgba(6,12,14,0.9)] backdrop-blur-xl border border-jade/15 rounded-full px-4 py-2 shadow-[0_40px_90px_-50px_rgba(0,217,146,0.30),inset_0_1px_0_rgba(255,255,255,0.04)]", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(PatchFilterButton, { value: selectedPatch, onChange: onPatchChange, patches: availablePatches }), _jsx(RegionFilterButton, { value: selectedRegion, onChange: onRegionChange }), _jsx("div", { className: "h-6 w-px bg-jade/10 mx-1" }), _jsx("button", { type: "button", onClick: () => onRoleChange(null), className: cn("h-10 px-3 rounded-full border transition-colors cursor-clicker", "bg-jade/[0.02] hover:border-jade/40", "text-[10px] font-chakrapetch font-bold uppercase tracking-[0.2em]", role === null ? "text-jade border-jade/50" : "border-jade/15 text-flash/50"), title: "All roles", "aria-pressed": role === null, children: "All" }), ROLES.map((r) => {
                        const active = role === r.key;
                        const beam = role === null && suggestedRole === r.key;
                        return (_jsxs("div", { className: cn("relative h-10 w-10 rounded-full overflow-hidden", active ? "border border-jade/70" : "border border-jade/15", "bg-jade/[0.02] hover:border-jade/40 transition-colors"), title: r.label, children: [beam && !active && _jsx(BorderBeam, { duration: 8, size: 80 }), _jsx("button", { type: "button", onClick: () => onRoleChange(r.key), "aria-pressed": active, className: cn("relative z-10 h-full w-full flex items-center justify-center", "bg-transparent cursor-clicker"), children: _jsx(r.Icon, { className: cn("h-6 w-6", active ? "text-jade" : "text-flash/55") }) })] }, r.key));
                    }), _jsx("div", { className: "h-6 w-px bg-jade/10 mx-1" }), _jsx(RankFilterButton, { value: tier, onChange: onTierChange }), _jsx("div", { className: "h-6 w-px bg-jade/10 mx-1" }), _jsx(OpponentPentagonDialog, { opponents: opponents, champions: champions, onSetOpponent: onSetOpponent, onClearOpponent: onClearOpponent, selectedRole: role, legendaryItems: legendaryItems, onSetItem: onSetItem, onClearItem: onClearItem })] }) }) }));
}
// ─────────────────────────────────────────────────────────────
// MATCHUP ROW (safe)
// ─────────────────────────────────────────────────────────────
function MatchupRow({ champion, winrate, games, image, }) {
    return (_jsxs("div", { className: "flex items-center gap-3 py-2 px-3 rounded-xl bg-flash/[0.02] ring-1 ring-inset ring-jade/10 hover:ring-jade/25 transition-all", children: [_jsx("img", { src: image || "/placeholder.svg", alt: champion, className: "w-8 h-8 rounded-md ring-1 ring-inset ring-jade/20", onError: (e) => {
                    e.currentTarget.style.display = "none";
                } }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-flash/80 text-sm font-chakrapetch tracking-wide truncate", children: champion }), _jsxs("div", { className: "text-flash/30 text-[10px] font-jetbrains uppercase tracking-wider", children: [num(games).toLocaleString(), " games"] })] }), _jsx("div", { className: cn("text-sm font-chakrapetch font-bold tabular-nums", wrClass(winrate)), children: pct(winrate, 1) })] }));
}
// ─────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
    return (_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade shrink-0", style: { boxShadow: "0 0 8px #00d992" } }), _jsx("span", { className: "font-chakrapetch text-[11px] font-bold tracking-[0.28em] uppercase text-jade/80", children: title }), _jsx("div", { className: "h-px flex-1 bg-gradient-to-r from-jade/20 to-transparent" })] }), subtitle && (_jsx("p", { className: "text-flash/40 text-[10px] font-jetbrains mt-1.5 ml-4 tracking-wide", children: subtitle }))] }));
}
// ─────────────────────────────────────────────────────────────
// SKELETON HELPERS
// ─────────────────────────────────────────────────────────────
function SkeletonSectionHeader({ withSubtitle = false }) {
    return (_jsxs("div", { className: "mb-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade/30 animate-pulse" }), _jsx("div", { className: "h-3 w-24 rounded bg-flash/[0.08] animate-pulse" }), _jsx("div", { className: "h-px flex-1 bg-gradient-to-r from-jade/10 to-transparent" })] }), withSubtitle && _jsx("div", { className: "h-2.5 w-32 rounded bg-flash/[0.05] animate-pulse mt-1.5 ml-4" })] }));
}
function SkeletonMatchupRow() {
    return (_jsxs("div", { className: "flex items-center gap-3 py-2 px-3 rounded-xl bg-flash/[0.02] ring-1 ring-inset ring-jade/10", children: [_jsx("div", { className: "w-8 h-8 rounded-md ring-1 ring-inset ring-jade/15 bg-flash/[0.05] animate-pulse" }), _jsxs("div", { className: "flex-1 min-w-0 space-y-1.5", children: [_jsx("div", { className: "h-3.5 w-20 rounded bg-flash/[0.08] animate-pulse" }), _jsx("div", { className: "h-2.5 w-14 rounded bg-flash/[0.05] animate-pulse" })] }), _jsx("div", { className: "h-4 w-12 rounded bg-jade/10 animate-pulse" })] }));
}
const TIERS = [
    { key: "EMERALD", label: "Emerald", icon: "emerald" },
    { key: "EMERALD+", label: "Emerald+", icon: "emerald" },
    { key: "DIAMOND", label: "Diamond", icon: "diamond" },
    { key: "DIAMOND+", label: "Diamond+", icon: "diamond" },
    { key: "MASTER", label: "Master", icon: "master" },
    { key: "MASTER+", label: "Master+", icon: "master" },
    { key: "GRANDMASTER", label: "Grandmaster", icon: "grandmaster" },
    { key: "CHALLENGER", label: "Challenger", icon: "challenger" },
];
const miniRankIcon = (tier) => {
    const folder = getLegacyRankIcons() ? "miniranks-legacy" : "miniranks";
    return `${cdnBaseUrl()}/img/${folder}/${tier.toLowerCase()}.png`;
};
function RankFilterButton({ value, onChange, }) {
    const [open, setOpen] = useState(false);
    const activeT = TIERS.find(t => t.key === value);
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { className: cn("flex items-center gap-2 h-8 px-3 rounded-sm border cursor-pointer", "transition-all duration-200", "text-[10px] font-mono uppercase tracking-wider", value
                    ? "border-jade/30 bg-jade/[0.06] text-jade/80"
                    : "border-flash/[0.08] bg-flash/[0.02] text-flash/40 hover:border-jade/20 hover:text-flash/60"), children: activeT ? (_jsxs(_Fragment, { children: [_jsx("img", { src: miniRankIcon(activeT.icon), alt: activeT.label, className: "w-4 h-4 object-contain" }), _jsx("span", { children: activeT.label })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-[10px]", children: "ELO:" }), _jsx("span", { children: "DIAMOND+" })] })) }), _jsx(DialogContent, { className: "w-full max-w-[340px] bg-transparent shadow-none border-none flex flex-col items-center [&>button]:hidden", children: _jsx("div", { className: "w-full relative", children: _jsxs("div", { className: cn("relative overflow-hidden rounded-sm", "bg-[#060e10]/95 backdrop-blur-xl", "border border-flash/[0.06]", "shadow-[0_20px_60px_rgba(0,0,0,0.6)]"), children: [_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-[2px] bg-jade/20" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-40", style: {
                                    background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.015) 3px, rgba(0,217,146,0.015) 4px)",
                                } }), _jsxs("div", { className: "relative z-10 px-5 py-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-1 h-3 bg-jade/40 rounded-full" }), _jsx("span", { className: "text-[10px] font-mono text-flash/40 tracking-[0.25em] uppercase", children: "Rank Filter" })] }), _jsx("button", { type: "button", className: cn("text-[9px] font-mono uppercase tracking-[0.15em] cursor-pointer", "px-2 py-0.5 rounded-sm", "text-flash/25 hover:text-jade/60", "transition-colors duration-150"), onClick: () => { onChange(null); setOpen(false); }, children: "Reset" })] }), _jsx("div", { className: "grid grid-cols-2 gap-1.5", children: TIERS.map((t) => {
                                            const active = value === t.key;
                                            const isPlus = t.key.endsWith("+");
                                            return (_jsxs("button", { type: "button", onClick: () => { onChange(t.key); setOpen(false); }, className: cn("group flex items-center gap-2.5 py-2 px-3 rounded-sm cursor-pointer", "border transition-all duration-150", active
                                                    ? "bg-jade/[0.08] border-jade/25"
                                                    : "bg-flash/[0.015] border-transparent hover:bg-jade/[0.04] hover:border-jade/15"), children: [_jsx("img", { src: miniRankIcon(t.icon), alt: t.label, className: cn("w-6 h-6 object-contain transition-opacity shrink-0", active ? "opacity-100" : "opacity-40 group-hover:opacity-70") }), _jsx("span", { className: cn("text-[11px] font-mono tracking-wide transition-colors", active ? "text-jade" : "text-flash/35 group-hover:text-flash/60", isPlus && "font-semibold"), children: t.label })] }, t.key));
                                        }) }), _jsx("div", { className: "mt-3 pt-2 border-t border-flash/[0.04]", children: _jsx("span", { className: "text-[9px] font-mono text-flash/20 tracking-wide", children: "\"+\" includes all ranks above" }) })] })] }) }) })] }));
}
// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
export function ChampionStats({ champ, patch, keyToId, onVsChange, initialVs, }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [role, setRole] = useState(null);
    const [tier, setTier] = useState(null);
    const [opponents, setOpponents] = useState([]);
    const [selectedPatch, setSelectedPatch] = useState(null);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [availablePatches, setAvailablePatches] = useState([]);
    const [runes, setRunes] = useState([]);
    const [items, setItems] = useState([]);
    const [buildOrder, setBuildOrder] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(0);
    const rawSuggestedRole = stats?.meta?.role ?? null;
    const suggestedRole = rawSuggestedRole === "UTILITY" ? "SUPPORT" : rawSuggestedRole;
    const champIdFromKey = (k) => keyToId[String(k)] || String(k);
    const champIconFromKey = (k) => `https://cdn2.loldata.cc/16.1.1/img/champion/${champIdFromKey(k)}.png`;
    const championList = useMemo(() => Object.entries(keyToId).map(([, id]) => ({ id, name: id })), [keyToId]);
    const idToKey = useMemo(() => {
        const map = {};
        for (const [key, id] of Object.entries(keyToId))
            map[id] = Number(key);
        return map;
    }, [keyToId]);
    // Pre-fill VS opponent from URL param
    useEffect(() => {
        if (initialVs && Object.keys(idToKey).length > 0 && opponents.length === 0) {
            const key = idToKey[initialVs];
            if (key) {
                // Find the most likely role for this opponent
                setOpponents([{ championId: key, name: initialVs, role: "TOP", itemId: null, itemName: null }]);
            }
        }
    }, [initialVs, idToKey]);
    // Item metadata for the item picker
    const [itemsMeta, setItemsMeta] = useState({});
    useEffect(() => {
        let cancelled = false;
        fetch(`${cdnBaseUrl()}/data/en_US/item.json`)
            .then((r) => r.json())
            .then((json) => {
            if (cancelled)
                return;
            const map = {};
            for (const [id, item] of Object.entries(json.data || {})) {
                map[id] = { name: item.name, into: item.into, gold: item.gold, maps: item.maps };
            }
            setItemsMeta(map);
        })
            .catch(() => { });
        return () => { cancelled = true; };
    }, []);
    // Fetch available patches
    useEffect(() => {
        let cancelled = false;
        fetch(`${API_BASE_URL}/api/champion/patches`)
            .then((r) => r.json())
            .then((json) => {
            if (!cancelled && json.patches?.length)
                setAvailablePatches(json.patches);
        })
            .catch(() => { });
        return () => { cancelled = true; };
    }, []);
    const legendaryItems = useMemo(() => {
        const all = Object.entries(itemsMeta)
            .filter(([, m]) => (!m.into || m.into.length === 0) && m.gold?.purchasable !== false && (m.gold?.total ?? 0) >= 2000 && m.maps?.["11"] !== false)
            .map(([id, m]) => ({ id: Number(id), name: m.name }))
            .sort((a, b) => a.id - b.id);
        const seen = new Set();
        return all.filter((it) => {
            if (seen.has(it.name))
                return false;
            seen.add(it.name);
            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [itemsMeta]);
    const setOpponentForRole = (role, champName) => {
        const key = idToKey[champName];
        if (!key)
            return;
        setOpponents((prev) => [
            ...prev.filter((o) => o.role !== role && o.championId !== key),
            { championId: key, name: champName, role, itemId: null, itemName: null },
        ]);
    };
    const clearOpponentRole = (role) => {
        setOpponents((prev) => prev.filter((o) => o.role !== role));
    };
    const setItemForRole = (role, itemId, itemName) => {
        setOpponents((prev) => prev.map((o) => o.role === role ? { ...o, itemId, itemName } : o));
    };
    const clearItemForRole = (role) => {
        setOpponents((prev) => prev.map((o) => o.role === role ? { ...o, itemId: null, itemName: null } : o));
    };
    const opponentsKey = JSON.stringify(opponents);
    // Notify parent about VS opponent for hero display
    useEffect(() => {
        if (opponents.length === 1) {
            onVsChange?.({ championId: opponents[0].championId, name: opponents[0].name, role: opponents[0].role ?? undefined });
        }
        else {
            onVsChange?.(null);
        }
    }, [opponentsKey]);
    // Refetch when any filter changes (keep old data visible during load)
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        // Don't clear stats — keep stale data visible while loading
        fetch(`${API_BASE_URL}/api/champion/stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                championId: Number(champ.key),
                patch: selectedPatch,
                region: selectedRegion,
                queueId: 420,
                role: role === "SUPPORT" ? "UTILITY" : role,
                tier: tier,
                opponents: opponents.length > 0
                    ? opponents.map((o) => ({ championId: o.championId, role: o.role === "SUPPORT" ? "UTILITY" : o.role, ...(o.itemId ? { itemId: o.itemId } : {}) }))
                    : null,
            }),
        })
            .then((r) => {
            if (!r.ok)
                throw new Error("Failed to load champion stats");
            return r.json();
        })
            .then((json) => {
            if (!cancelled)
                setStats(json);
        })
            .catch((e) => {
            if (!cancelled)
                setError(e?.message ?? "Error");
        })
            .finally(() => {
            if (!cancelled)
                setLoading(false);
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [champ.key, selectedPatch, selectedRegion, role, tier, opponentsKey]);
    // Rune data: use snapshot when no opponents, fetch with opponent when VS is active
    useEffect(() => {
        if (opponents.length === 0 && stats?.runes?.length) {
            setRunes(stats.runes);
            return;
        }
        if (!champ.key)
            return;
        const roleParam = role === "SUPPORT" ? "UTILITY" : role;
        const firstOppId = opponents.length > 0 ? opponents[0].championId : undefined;
        fetch(`${API_BASE_URL}/api/champion/runes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                championId: Number(champ.key),
                role: roleParam,
                tier,
                opponentId: firstOppId,
            }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.runes)
            setRunes(data.runes); })
            .catch(() => { });
    }, [stats, champ.key, role, tier, opponentsKey]);
    // Extract items from stats snapshot (skip when VS is active — build order handles it)
    useEffect(() => {
        if (opponents.length === 0 && stats?.items) {
            setItems(stats.items);
        }
        else {
            // Fetch items separately if not in snapshot
            if (!champ.key)
                return;
            const roleParam = role === "SUPPORT" ? "UTILITY" : role;
            fetch(`${API_BASE_URL}/api/champion/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ championName: champ.id, championId: Number(champ.key), role: roleParam, tier }),
            })
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                if (data?.slots) {
                    const allItems = [];
                    for (const items of Object.values(data.slots))
                        allItems.push(...items);
                    const seen = new Map();
                    for (const item of allItems) {
                        const games = item.total_games ?? item.games ?? 0;
                        const existing = seen.get(item.item_id);
                        if (!existing || games > (existing.games ?? 0)) {
                            seen.set(item.item_id, { item_id: item.item_id, games, wins: item.wins, winrate: item.winrate, pick_rate: item.pick_rate ?? 0 });
                        }
                    }
                    setItems(Array.from(seen.values()).sort((a, b) => b.games - a.games));
                }
            })
                .catch(() => { });
        }
    }, [stats, champ.key, champ.id, role, tier]);
    // Fetch build order data (per-slot item winrates, includes opponent if VS active)
    useEffect(() => {
        if (!champ.key)
            return;
        const roleParam = role === "SUPPORT" ? "UTILITY" : role;
        const firstOppId = opponents.length > 0 ? opponents[0].championId : undefined;
        fetch(`${API_BASE_URL}/api/champion/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                championName: champ.id,
                championId: Number(champ.key),
                role: roleParam,
                tier,
                buildOrder: true,
                opponentId: firstOppId,
            }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
            if (data?.buildOrder) {
                setBuildOrder(data.buildOrder);
            }
        })
            .catch(() => { });
    }, [champ.key, champ.id, role, tier, opponentsKey]);
    const floatingBar = (_jsx(FilterBar, { selectedPatch: selectedPatch, onPatchChange: setSelectedPatch, availablePatches: availablePatches, selectedRegion: selectedRegion, onRegionChange: setSelectedRegion, role: role, onRoleChange: setRole, suggestedRole: suggestedRole, tier: tier, onTierChange: setTier, opponents: opponents, champions: championList, onSetOpponent: setOpponentForRole, onClearOpponent: clearOpponentRole, legendaryItems: legendaryItems, onSetItem: setItemForRole, onClearItem: clearItemForRole }));
    if (loading) {
        return (_jsxs("div", { className: "w-full space-y-3 pb-20", children: [floatingBar, _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs(TechCard, { className: "p-5", children: [_jsx(SkeletonSectionHeader, {}), _jsxs("div", { className: "text-center space-y-3", children: [_jsx("div", { className: "mx-auto h-8 w-28 rounded bg-jade/10 animate-pulse" }), _jsxs("div", { className: "flex items-center justify-center gap-6", children: [_jsxs("div", { className: "text-center space-y-1", children: [_jsx("div", { className: "mx-auto h-2.5 w-10 rounded bg-flash/5 animate-pulse" }), _jsx("div", { className: "mx-auto h-4 w-14 rounded bg-flash/8 animate-pulse" })] }), _jsx("div", { className: "h-8 w-px bg-jade/10" }), _jsxs("div", { className: "text-center space-y-1", children: [_jsx("div", { className: "mx-auto h-2.5 w-12 rounded bg-flash/5 animate-pulse" }), _jsx("div", { className: "mx-auto h-4 w-14 rounded bg-flash/8 animate-pulse" })] })] })] })] }), _jsxs(TechCard, { className: "p-5", children: [_jsx(SkeletonSectionHeader, {}), _jsxs("div", { className: "flex items-center justify-center gap-3", children: [_jsx("div", { className: "h-6 w-12 rounded bg-jade/10 animate-pulse" }), _jsx("span", { className: "text-flash/15", children: "/" }), _jsx("div", { className: "h-6 w-12 rounded bg-flash/8 animate-pulse" }), _jsx("span", { className: "text-flash/15", children: "/" }), _jsx("div", { className: "h-6 w-12 rounded bg-jade/10 animate-pulse" })] }), _jsx("div", { className: "text-center mt-2", children: _jsx("div", { className: "mx-auto h-3 w-20 rounded bg-flash/5 animate-pulse" }) })] }), _jsxs(TechCard, { className: "p-5", children: [_jsx(SkeletonSectionHeader, {}), _jsx("div", { className: "space-y-3", children: ["CS / Game", "Gold / Game"].map((label) => (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-flash/40 text-xs font-jetbrains uppercase tracking-wider", children: label }), _jsx("div", { className: "h-4 w-16 rounded bg-flash/8 animate-pulse" })] }, label))) })] })] }), _jsxs(TechCard, { className: "p-5", children: [_jsx(SkeletonSectionHeader, {}), _jsx("div", { className: "flex gap-2", children: Array.from({ length: 6 }).map((_, i) => (_jsxs("div", { className: "flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-flash/[0.02] ring-1 ring-inset ring-jade/10 min-w-[75px]", children: [_jsx("div", { className: "w-9 h-9 rounded-md bg-flash/8 animate-pulse" }), _jsx("div", { className: "h-3 w-10 rounded bg-jade/10 animate-pulse" }), _jsx("div", { className: "h-2 w-8 rounded bg-flash/5 animate-pulse" })] }, i))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs(TechCard, { className: "p-5", children: [_jsx(SkeletonSectionHeader, { withSubtitle: true }), _jsx("div", { className: "space-y-1", children: Array.from({ length: 5 }).map((_, i) => (_jsx(SkeletonMatchupRow, {}, i))) })] }), _jsxs(TechCard, { className: "p-5", children: [_jsx(SkeletonSectionHeader, { withSubtitle: true }), _jsx("div", { className: "space-y-1", children: Array.from({ length: 5 }).map((_, i) => (_jsx(SkeletonMatchupRow, {}, i))) })] })] })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "w-full space-y-3 pb-20", children: [floatingBar, _jsxs("div", { className: "px-6 font-jetbrains text-sm text-[#ff6286]", children: ["Error: ", error] })] }));
    }
    if (!stats) {
        return (_jsxs("div", { className: "w-full space-y-3 pb-20", children: [floatingBar, _jsx("div", { className: "px-6 font-jetbrains text-sm uppercase tracking-[0.2em] text-flash/40", children: "No stats available." })] }));
    }
    const core = stats.core ?? {
        winrate: 0,
        pickrate: 0,
        banrate: null,
        gamesAnalyzed: 0,
        avgKDA: { kills: 0, deaths: 0, assists: 0 },
        avgCS: null,
        avgGold: 0,
        avgDamage: 0,
    };
    const gamesAnalyzed = num(core.gamesAnalyzed, 0);
    const noGames = gamesAnalyzed === 0;
    if (noGames) {
        return (_jsxs("div", { className: "w-full space-y-3 pb-20", children: [floatingBar, _jsxs(TechCard, { className: "p-6", children: [_jsx("div", { className: "text-flash/80 font-chakrapetch font-bold uppercase tracking-[0.2em] text-sm", children: "No games for this filter." }), _jsx("div", { className: "text-flash/30 font-jetbrains text-[10px] mt-2 tracking-wide", children: "Try another role, rank, or adjust opponents." })] })] }));
    }
    const avgKDA = core.avgKDA ?? { kills: 0, deaths: 0, assists: 0 };
    const k = num(avgKDA.kills, 0);
    const d = num(avgKDA.deaths, 0);
    const a = num(avgKDA.assists, 0);
    const coreStats = {
        winrate: num(core.winrate, 0),
        pickrate: num(core.pickrate, 0),
        gamesAnalyzed,
        avgKDA: { kills: k, deaths: d, assists: a },
        avgCS: core.avgCS,
        avgGold: num(core.avgGold, 0),
        avgDamage: num(core.avgDamage, 0),
    };
    const bestMatchups = (stats.bestMatchups ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }));
    const worstMatchups = (stats.worstMatchups ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }));
    const bestSynergies = (stats.bestSynergies ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }));
    const worstCounters = (stats.worstCounters ?? []).map((m) => ({
        champion: champIdFromKey(m.championKey),
        winrate: num(m.winrate, 0),
        games: num(m.games, 0),
        image: champIconFromKey(m.championKey),
    }));
    const objectiveWinrates = {
        riftHerald: num(stats.objectiveWinrates?.riftHerald?.winrate ?? stats.objectiveWinrates?.riftHerald, 0),
        voidgrubs: num(stats.objectiveWinrates?.voidgrubs?.winrate ?? stats.objectiveWinrates?.voidgrubs, 0),
        baron: num(stats.objectiveWinrates?.firstBaron?.winrate ?? stats.objectiveWinrates?.firstBaron, 0),
        elderDragon: num(stats.objectiveWinrates?.elderDragon?.winrate ?? stats.objectiveWinrates?.elderDragon, 0),
        firstDragon: num(stats.objectiveWinrates?.firstDragon?.winrate ?? stats.objectiveWinrates?.firstDragon, 0),
    };
    // Gate: box snapshot does NOT populate objectiveWinrates — only render when at least one value is real.
    const hasObjectiveData = stats.objectiveWinrates != null &&
        Object.values(objectiveWinrates).some((v) => v > 0);
    const gamePhaseWinrates = (stats.gamePhaseWinrates ?? []).map((p) => ({
        phase: p.phase,
        time: p.time,
        winrate: num(p.winrate, 0),
    }));
    // Map API dragon sub_type names to display names
    const dragonNameMap = {
        FIRE_DRAGON: "Infernal",
        EARTH_DRAGON: "Mountain",
        WATER_DRAGON: "Ocean",
        AIR_DRAGON: "Cloud",
        HEXTECH_DRAGON: "Hextech",
        CHEMTECH_DRAGON: "Chemtech",
    };
    const soulData = new Map((stats.dragonSoulWinrates ?? []).map(d => [d.name, d]));
    const dragonWinrates = [
        "FIRE_DRAGON", "EARTH_DRAGON", "WATER_DRAGON", "AIR_DRAGON", "HEXTECH_DRAGON", "CHEMTECH_DRAGON",
    ].map(key => {
        const d = soulData.get(key);
        return { name: dragonNameMap[key] ?? key, winrate: num(d?.winrate, 0), games: d?.games ?? 0 };
    });
    return (_jsxs("div", { className: "w-full space-y-3 pb-20", children: [floatingBar, _jsx("style", { children: `
        @keyframes sectionReveal {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .stat-section {
          opacity: 0;
          animation: sectionReveal 0.4s ease-out forwards;
        }
        @keyframes vsSlideLeft {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes vsSlideRight {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes vsPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(0,217,146,0.3); }
          50% { text-shadow: 0 0 40px rgba(0,217,146,0.6), 0 0 60px rgba(0,217,146,0.2); }
        }
      ` }), _jsxs("div", { className: "transition-opacity duration-300", style: { opacity: loading ? 0.4 : 1 }, children: [_jsxs("div", { className: "stat-section grid grid-cols-3 gap-3", style: { animationDelay: "0s" }, children: [_jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Winrate", subtitle: [role, tier, opponents.length > 0 ? `VS ${opponents.map((o) => o.name + (o.role ? ` ${o.role}` : '')).join(', ')}` : null].filter(Boolean).join(' · ') || undefined }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: cn("text-3xl font-chakrapetch font-bold tabular-nums", wrClass(coreStats.winrate)), style: coreStats.winrate >= 51 ? { textShadow: "0 0 22px rgba(0,217,146,0.3)" } : undefined, children: pct(coreStats.winrate, 2) }), _jsxs("div", { className: "mt-3 flex items-center justify-center gap-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-flash/40 text-[9px] font-jetbrains uppercase tracking-[0.2em]", children: "Sample" }), _jsx("div", { className: "text-flash/80 text-sm font-chakrapetch font-bold tabular-nums", children: coreStats.gamesAnalyzed.toLocaleString() })] }), _jsx("div", { className: "h-8 w-px bg-jade/10" }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-flash/40 text-[9px] font-jetbrains uppercase tracking-[0.2em]", children: "Pickrate" }), _jsx("div", { className: "text-flash/80 text-sm font-chakrapetch font-bold tabular-nums", children: pct(coreStats.pickrate, 2) })] })] })] })] }), _jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Avg KDA" }), _jsxs("div", { className: "flex items-center justify-center gap-3 text-xl font-chakrapetch", children: [_jsx("span", { className: "text-jade font-bold tabular-nums", style: { textShadow: "0 0 22px rgba(0,217,146,0.3)" }, children: k.toFixed(2) }), _jsx("span", { className: "text-flash/20", children: "/" }), _jsx("span", { className: "text-flash/55 font-bold tabular-nums", children: d.toFixed(2) }), _jsx("span", { className: "text-flash/20", children: "/" }), _jsx("span", { className: "text-jade/80 font-bold tabular-nums", children: a.toFixed(2) })] }), _jsx("div", { className: "text-center mt-2", children: _jsxs("span", { className: "text-flash/40 text-[10px] font-jetbrains uppercase tracking-[0.15em]", children: ["Ratio ", ((k + a) / Math.max(1, d)).toFixed(2)] }) })] }), _jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Economy" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-flash/40 text-xs font-jetbrains uppercase tracking-wider", children: "CS / Game" }), _jsx("span", { className: "text-flash/80 font-chakrapetch font-bold tabular-nums", children: core.avgCS == null ? "N/A" : num(core.avgCS).toFixed(1) })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-flash/40 text-xs font-jetbrains uppercase tracking-wider", children: "Gold / Game" }), _jsx("span", { className: "text-jade font-chakrapetch font-bold tabular-nums", style: { textShadow: "0 0 22px rgba(0,217,146,0.3)" }, children: coreStats.avgGold.toLocaleString() })] })] })] })] }), _jsx("div", { className: "stat-section", style: { animationDelay: "0.08s" }, children: (() => {
                            // Group build order items by slot
                            const slotGroups = new Map();
                            for (const bo of buildOrder) {
                                const idx = bo.slot_index ?? bo.legendary_index ?? 0;
                                if (!slotGroups.has(idx))
                                    slotGroups.set(idx, []);
                                slotGroups.get(idx).push(bo);
                            }
                            const slots = Array.from(slotGroups.entries()).sort(([a], [b]) => a - b).slice(0, 6);
                            const slotLabels = ["1st Item", "2nd Item", "3rd Item", "4th Item", "5th Item", "6th Item"];
                            // Items to display: either build-order slot or flat items
                            const displayItems = slots.length > 0
                                ? (slotGroups.get(selectedSlot) ?? slotGroups.get(slots[0]?.[0] ?? 0) ?? [])
                                : items;
                            if (displayItems.length === 0)
                                return null;
                            return (_jsxs(TechCard, { className: "p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-jade shrink-0", style: { boxShadow: "0 0 8px #00d992" } }), _jsx("span", { className: "font-chakrapetch text-[11px] font-bold tracking-[0.28em] uppercase text-jade/80", children: "Item Build Path" })] }), slots.length > 0 && (_jsx("div", { className: "flex gap-1", children: slots.map(([slotIdx]) => (_jsx("button", { type: "button", onClick: () => setSelectedSlot(slotIdx), className: cn("px-2.5 py-1 rounded-md text-[9px] font-chakrapetch font-bold uppercase tracking-[0.15em] transition-all duration-200 cursor-pointer", selectedSlot === slotIdx
                                                        ? "bg-jade/[0.12] text-jade ring-1 ring-inset ring-jade/25"
                                                        : "text-flash/30 ring-1 ring-inset ring-transparent hover:text-flash/60 hover:ring-jade/10"), children: slotLabels[slotIdx] ?? `${slotIdx + 1}th` }, slotIdx))) }))] }), _jsx("div", { className: "flex gap-2 overflow-x-auto pb-1 scrollbar-hide", children: displayItems.slice(0, 10).map((item) => (_jsxs("div", { className: "flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-flash/[0.02] ring-1 ring-inset ring-jade/10 hover:ring-jade/25 min-w-[75px] shrink-0 transition-all", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/item/${item.item_id}.png`, alt: "", className: "w-9 h-9 rounded-md ring-1 ring-inset ring-jade/15", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), _jsxs("span", { className: cn("text-[13px] font-chakrapetch font-bold tabular-nums", wrClass(item.winrate)), children: [item.winrate.toFixed(1), "%"] }), _jsx("span", { className: "text-[8px] font-jetbrains text-flash/30 tabular-nums", children: Number(item.games).toLocaleString() })] }, item.item_id))) })] }));
                        })() }), runes.length > 0 && (_jsx("div", { className: "stat-section", style: { animationDelay: "0.15s" }, children: _jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Runes", subtitle: "Keystone + secondary tree winrates" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: runes.slice(0, 8).map((r, idx) => {
                                        const keystoneIcon = getKeystoneIcon(r.perk_keystone);
                                        const keystoneName = getKeystoneName(r.perk_keystone) ?? `Keystone ${r.perk_keystone}`;
                                        const subStyleName = getStyleName(r.perk_sub_style) ?? "";
                                        const subStyleIcon = getStyleIcon(r.perk_sub_style);
                                        const isTop = idx === 0;
                                        return (_jsxs("div", { className: cn("flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 ring-inset transition-all", isTop ? "bg-jade/[0.05] ring-jade/20" : "bg-flash/[0.02] ring-jade/10 hover:ring-jade/25"), children: [_jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [keystoneIcon && _jsx("img", { src: keystoneIcon, alt: "", className: cn("rounded-full", isTop ? "w-8 h-8" : "w-6 h-6"), onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), subStyleIcon && _jsx("img", { src: subStyleIcon, alt: "", className: "w-4 h-4 rounded-full opacity-40", onError: (e) => { e.currentTarget.style.opacity = "0.2"; } })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: cn("font-chakrapetch tracking-wide truncate", isTop ? "text-[12px] text-flash/70" : "text-[10px] text-flash/45"), children: keystoneName }), _jsxs("div", { className: "text-[9px] font-jetbrains text-flash/30 tabular-nums", children: [subStyleName, " \u00B7 ", r.pick_rate.toFixed(1), "% pick \u00B7 ", Number(r.games).toLocaleString(), " games"] })] }), _jsx("div", { className: "text-right shrink-0", children: _jsxs("span", { className: cn("font-chakrapetch font-bold tabular-nums", wrClass(r.winrate), isTop ? "text-[15px]" : "text-[13px]"), children: [r.winrate.toFixed(1), "%"] }) })] }, idx));
                                    }) })] }) })), _jsxs("div", { className: "stat-section grid grid-cols-2 gap-3", style: { animationDelay: "0.22s" }, children: [_jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Best Matchups", subtitle: "Highest WR against" }), _jsx("div", { className: "space-y-1", children: bestMatchups.map((m) => (_jsx(MatchupRow, { ...m, variant: "default" }, m.champion))) })] }), _jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Worst Matchups", subtitle: "Lowest WR against" }), _jsx("div", { className: "space-y-1", children: worstMatchups.map((m) => (_jsx(MatchupRow, { ...m, variant: "low" }, m.champion))) })] })] }), (bestSynergies.length > 0 || worstCounters.length > 0) && (_jsxs("div", { className: "stat-section grid grid-cols-2 gap-3", style: { animationDelay: "0.28s" }, children: [bestSynergies.length > 0 && (_jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Best Synergies", subtitle: "Optimal duo partners" }), _jsx("div", { className: "space-y-1", children: bestSynergies.map((m) => (_jsx(MatchupRow, { ...m }, m.champion))) })] })), worstCounters.length > 0 && (_jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Worst Counters", subtitle: "Highest threat enemies" }), _jsx("div", { className: "space-y-1", children: worstCounters.map((m) => (_jsx(MatchupRow, { ...m }, m.champion))) })] }))] })), Array.isArray(stats.dragonSoulWinrates) && stats.dragonSoulWinrates.length > 0 && (_jsx("div", { className: "stat-section", style: { animationDelay: "0.34s" }, children: _jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Dragon Soul Analysis", subtitle: "Winrate when securing each soul type" }), _jsx("div", { className: "grid grid-cols-6 gap-2", children: dragonWinrates.map((d) => (_jsxs("div", { className: "text-center p-3 rounded-xl bg-flash/[0.02] ring-1 ring-inset ring-jade/10", children: [_jsx("div", { className: "text-flash/40 text-[8px] font-jetbrains uppercase tracking-[0.15em] mb-2", children: d.name }), _jsx("div", { className: cn("text-lg font-chakrapetch font-bold tabular-nums", wrClass(d.winrate)), children: pct(d.winrate, 0) })] }, d.name))) })] }) })), hasObjectiveData && (_jsx("div", { className: "stat-section grid grid-cols-5 gap-3", style: { animationDelay: "0.40s" }, children: [
                            { label: "First Dragon", value: objectiveWinrates.firstDragon },
                            { label: "Rift Herald", value: objectiveWinrates.riftHerald },
                            { label: "Voidgrubs", value: objectiveWinrates.voidgrubs },
                            { label: "Baron Nashor", value: objectiveWinrates.baron },
                            { label: "Elder Dragon", value: objectiveWinrates.elderDragon },
                        ].map((obj) => (_jsxs(TechCard, { className: "p-4 text-center", children: [_jsx("div", { className: "text-flash/40 text-[8px] font-jetbrains uppercase tracking-[0.15em]", children: obj.label }), _jsx("div", { className: cn("text-xl font-chakrapetch font-bold mt-1 tabular-nums", wrClass(obj.value)), children: pct(obj.value, 0) }), _jsx("div", { className: "text-flash/30 text-[8px] font-jetbrains uppercase tracking-[0.15em] mt-0.5", children: "WR on secure" })] }, obj.label))) })), gamePhaseWinrates.length > 0 && (_jsx("div", { className: "stat-section", style: { animationDelay: "0.46s" }, children: _jsxs(TechCard, { className: "p-5", children: [_jsx(SectionHeader, { title: "Phase Analysis", subtitle: "Performance by game length" }), _jsx("div", { className: "h-[120px]", children: _jsx(ResponsiveContainer, { width: "100%", height: "100%", children: _jsxs(BarChart, { data: gamePhaseWinrates, layout: "vertical", children: [_jsx(XAxis, { type: "number", domain: [40, 70], hide: true }), _jsx(YAxis, { type: "category", dataKey: "phase", tick: { fill: "#d7d8d9", fontSize: 9, fontFamily: "monospace" }, tickLine: false, axisLine: false, width: 60 }), _jsx(Bar, { dataKey: "winrate", radius: [0, 4, 4, 0], fill: "#00d992" })] }) }) }), _jsx("div", { className: "flex justify-between mt-2 px-1", children: gamePhaseWinrates.map((p) => (_jsxs("div", { className: "text-center", children: [_jsx("div", { className: cn("text-xs font-chakrapetch font-bold tabular-nums", wrClass(p.winrate)), children: pct(p.winrate, 0) }), _jsx("div", { className: "text-flash/30 text-[8px] font-jetbrains", children: p.time })] }, p.phase))) })] }) }))] })] }));
}
