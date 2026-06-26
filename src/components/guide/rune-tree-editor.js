"use client";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { PERK_CDN, cdnBaseUrl } from "@/config";
import { useRuneTrees } from "@/constants/runeData";
import { getKeystoneIcon, getKeystoneName } from "@/constants/runes";
import { KeystoneDialog } from "@/components/keystone-dialog";
import { Search, X } from "lucide-react";
function RuneIcon({ rune, selected, onClick, size = "md" }) {
    const sizeClass = size === "lg" ? "w-14 h-14" : size === "md" ? "w-10 h-10" : "w-8 h-8";
    return (_jsxs("button", { type: "button", onClick: onClick, className: cn("relative rounded-full transition-all duration-300 cursor-pointer", selected
            ? "scale-110"
            : "opacity-30 hover:opacity-65 hover:scale-105"), title: rune.name, children: [_jsx("img", { src: `${PERK_CDN}/${rune.icon}`, alt: rune.name, className: cn(sizeClass, "rounded-full"), onError: (e) => { e.currentTarget.style.opacity = "0.2"; } }), selected && (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute -inset-[3px] rounded-full border-2 border-jade/50" }), _jsx("div", { className: "absolute -inset-[3px] rounded-full shadow-[0_0_14px_rgba(0,217,146,0.35)]" })] }))] }));
}
function TreeSelector({ trees, selectedId, onSelect, disabled }) {
    return (_jsx("div", { className: "flex gap-3 justify-center mb-5", children: trees.map(tree => (_jsxs("button", { type: "button", onClick: () => tree.id !== disabled && onSelect(tree.id), className: cn("relative w-9 h-9 rounded-full transition-all duration-300", tree.id === selectedId
                ? "scale-115 shadow-[0_0_12px_rgba(0,217,146,0.25)]"
                : tree.id === disabled
                    ? "opacity-10 cursor-not-allowed"
                    : "opacity-30 hover:opacity-60 hover:scale-110 cursor-pointer"), disabled: tree.id === disabled, children: [_jsx("img", { src: `${PERK_CDN}/${tree.icon}`, alt: tree.name, className: "w-full h-full rounded-full" }), tree.id === selectedId && _jsx("div", { className: "absolute -inset-[2px] rounded-full border border-jade/40" })] }, tree.id))) }));
}
function PrimaryTreePanel({ tree, selection, onPickKeystone, onChange }) {
    const selectMinorRune = (rowIdx, runeId) => {
        const newRunes = [...selection.runes];
        // Ensure we have 3 slots
        while (newRunes.length < 3)
            newRunes.push(0);
        newRunes[rowIdx] = runeId;
        onChange({ ...selection, runes: newRunes });
    };
    return (_jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: `${PERK_CDN}/${tree.icon}`, alt: "", className: "w-7 h-7 rounded-full" }), _jsx("span", { className: "text-[12px] font-mono text-flash/50 uppercase tracking-[0.15em]", children: tree.name })] }), _jsx(KeystoneDialog, { selectedKeystone: selection.keystone, onSelect: onPickKeystone, trigger: _jsxs("button", { type: "button", title: "Change keystone", className: "group relative grid place-items-center w-16 h-16 rounded-full cursor-pointer transition-transform duration-200 hover:scale-105", children: [_jsx("span", { className: "absolute inset-0 rounded-full border border-jade/45 group-hover:border-jade/80 transition-colors", style: { boxShadow: "inset 0 0 10px rgba(0,0,0,0.5), 0 0 12px rgba(0,217,146,0.12)" } }), getKeystoneIcon(selection.keystone) ? (_jsx("img", { src: getKeystoneIcon(selection.keystone), alt: "", draggable: false, className: "w-[52px] h-[52px] rounded-full object-cover" })) : (_jsx("span", { className: "text-[8px] font-mono text-flash/40 uppercase tracking-widest", children: "Pick" }))] }) }), _jsx("div", { className: "w-8 h-[1px] bg-gradient-to-r from-transparent via-jade/15 to-transparent" }), tree.rows.map((row, rowIdx) => (_jsx("div", { className: "flex gap-3 justify-center", children: row.map(rune => (_jsx(RuneIcon, { rune: rune, selected: selection.runes[rowIdx] === rune.id, onClick: () => selectMinorRune(rowIdx, rune.id), size: "md" }, rune.id))) }, rowIdx)))] }));
}
function SecondaryTreePanel({ tree, selection, onChange }) {
    // Secondary allows 2 runes from any of the 3 rows (but max 1 per row)
    const allMinorIds = tree.rows.flat().map(r => r.id);
    const selectedRunes = selection.runes.filter(id => allMinorIds.includes(id));
    const toggleRune = (runeId, rowIdx) => {
        const isSelected = selectedRunes.includes(runeId);
        if (isSelected) {
            onChange({ runes: selectedRunes.filter(id => id !== runeId) });
        }
        else {
            // Max 2 runes, max 1 per row
            const rowRunes = tree.rows[rowIdx].map(r => r.id);
            let newRunes = selectedRunes.filter(id => !rowRunes.includes(id));
            newRunes.push(runeId);
            if (newRunes.length > 2)
                newRunes = newRunes.slice(-2);
            onChange({ runes: newRunes });
        }
    };
    return (_jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: `${PERK_CDN}/${tree.icon}`, alt: "", className: "w-6 h-6 rounded-full opacity-50" }), _jsx("span", { className: "text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em]", children: tree.name })] }), tree.rows.map((row, rowIdx) => (_jsx("div", { className: "flex gap-3 justify-center", children: row.map(rune => (_jsx(RuneIcon, { rune: rune, selected: selectedRunes.includes(rune.id), onClick: () => toggleRune(rune.id, rowIdx), size: "sm" }, rune.id))) }, rowIdx)))] }));
}
export function RuneTreeEditor({ value, onChange, title, onTitleChange, description, onDescriptionChange, againstChampions, onAgainstChange, againstClasses, onAgainstClassesChange }) {
    const CLASSES = [
        { key: "Fighter", label: "Fighter" },
        { key: "Tank", label: "Tank" },
        { key: "Mage", label: "Mage" },
        { key: "Assassin", label: "Assassin" },
        { key: "Marksman", label: "Marksman" },
        { key: "Support", label: "Support" },
    ];
    const toggleClass = (cls) => {
        const current = againstClasses ?? [];
        if (current.includes(cls)) {
            onAgainstClassesChange?.(current.filter(c => c !== cls));
        }
        else {
            onAgainstClassesChange?.([...current, cls]);
        }
    };
    const [showChampPicker, setShowChampPicker] = useState(false);
    const [champList, setChampList] = useState([]);
    const [champSearch, setChampSearch] = useState("");
    const RUNE_TREES = useRuneTrees(); // live roster (runesReforged.json), static fallback until loaded
    const loadChamps = () => {
        if (champList.length > 0) {
            setShowChampPicker(true);
            return;
        }
        fetch(`${cdnBaseUrl()}/data/en_US/champion.json`)
            .then(r => r.json())
            .then(data => {
            setChampList(Object.values(data?.data ?? {}).map(c => ({ id: String(c.id), name: String(c.name), tags: c.tags ?? [] })).sort((a, b) => a.name.localeCompare(b.name)));
            setShowChampPicker(true);
        })
            .catch(() => { });
    };
    const primaryTree = RUNE_TREES.find(t => t.id === value.primary.tree) ?? RUNE_TREES[0];
    const secondaryTree = RUNE_TREES.find(t => t.id === value.secondary.tree) ?? RUNE_TREES[4];
    const setPrimaryTree = (treeId) => {
        const tree = RUNE_TREES.find(t => t.id === treeId);
        onChange({
            ...value,
            primary: { tree: treeId, keystone: tree.keystones[0].id, runes: [] },
            // If secondary was same tree, switch it
            secondary: value.secondary.tree === treeId
                ? { tree: RUNE_TREES.find(t => t.id !== treeId).id, runes: [] }
                : value.secondary,
        });
    };
    const setSecondaryTree = (treeId) => {
        onChange({
            ...value,
            secondary: { tree: treeId, runes: [] },
        });
    };
    return (_jsxs("div", { className: "relative overflow-hidden rounded-md", style: { background: "linear-gradient(180deg, rgba(4,10,12,0.8) 0%, rgba(8,14,16,0.9) 100%)" }, children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-15", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.008) 3px, rgba(0,217,146,0.008) 5px)" } }), _jsx("div", { className: "absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,217,146,0.03)_0%,transparent_70%)]" }), _jsxs("div", { className: "relative z-10 px-6 py-5", children: [onDescriptionChange && (_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: "text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em] mb-1.5", children: "Description" }), _jsx("textarea", { value: description ?? "", onChange: e => onDescriptionChange(e.target.value), placeholder: "When to use this rune page...", className: "w-full h-16 bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-flash/40 placeholder:text-flash/15 resize-y focus:outline-none focus:border-jade/15 transition-colors" })] })), _jsxs("div", { className: "flex gap-6", children: [_jsxs("div", { className: "flex gap-8 w-[580px] shrink-0", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "text-[9px] font-orbitron text-jade/40 uppercase tracking-[0.3em] mb-3", children: "Primary" }), _jsx(TreeSelector, { trees: RUNE_TREES, selectedId: value.primary.tree, onSelect: setPrimaryTree, disabled: value.secondary.tree }), _jsx(PrimaryTreePanel, { tree: primaryTree, selection: value.primary, onPickKeystone: (treeId, keystoneId) => onChange({
                                                    ...value,
                                                    primary: { tree: treeId, keystone: keystoneId, runes: treeId === value.primary.tree ? value.primary.runes : [] },
                                                    secondary: value.secondary.tree === treeId
                                                        ? { tree: RUNE_TREES.find(t => t.id !== treeId).id, runes: [] }
                                                        : value.secondary,
                                                }), onChange: (s) => onChange({ ...value, primary: { ...value.primary, ...s } }) })] }), _jsx("div", { className: "w-[1px] bg-gradient-to-b from-transparent via-jade/10 to-transparent my-6" }), _jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "text-[9px] font-orbitron text-flash/25 uppercase tracking-[0.3em] mb-3", children: "Secondary" }), _jsx(TreeSelector, { trees: RUNE_TREES, selectedId: value.secondary.tree, onSelect: setSecondaryTree, disabled: value.primary.tree }), _jsx(SecondaryTreePanel, { tree: secondaryTree, selection: value.secondary, onChange: (s) => onChange({ ...value, secondary: { ...value.secondary, ...s } }) })] })] }), _jsx("div", { className: "w-[1px] bg-gradient-to-b from-transparent via-flash/[0.06] to-transparent" }), _jsxs("div", { className: "w-[260px] shrink-0 flex flex-col gap-4 py-2", children: [onTitleChange && (_jsxs("div", { children: [_jsx("div", { className: "text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em] mb-1.5", children: "Rune Page Title" }), _jsx("input", { value: title ?? "", onChange: e => onTitleChange(e.target.value), placeholder: "e.g. Runes vs Tanks", className: "w-full bg-flash/[0.02] border border-flash/[0.06] rounded-sm px-2.5 py-1.5 text-[13px] font-orbitron text-flash/60 placeholder:text-flash/15 focus:outline-none focus:border-jade/15 transition-colors" })] })), _jsx("div", { className: "w-full h-[1px] bg-flash/[0.04]" }), (onAgainstChange || onAgainstClassesChange) && (_jsxs("div", { children: [_jsx("div", { className: "text-[11px] font-mono text-flash/35 uppercase tracking-[0.15em] mb-2", children: "Use Against" }), _jsxs("div", { className: "flex flex-wrap gap-2 mb-2", children: [(againstClasses ?? []).map(cls => (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.toLowerCase()}.png`, alt: cls, className: "w-10 h-10 object-contain rounded-[3px] p-0.5", style: { filter: "brightness(1.3) drop-shadow(0 0 4px rgba(0,217,146,0.3))" } }), _jsx("button", { type: "button", onClick: () => onAgainstClassesChange?.((againstClasses ?? []).filter(x => x !== cls)), className: "absolute -top-1.5 -right-1.5 w-5 h-5 rotate-45 bg-[#0a1214] border border-red-400/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.2)] hover:border-red-400/70", children: _jsx(X, { className: "w-2.5 h-2.5 -rotate-45 text-red-400/70" }) })] }, cls))), (againstChampions ?? []).map(c => (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c}.png`, alt: c, className: "w-10 h-10 rounded-[3px] border border-flash/[0.08] group-hover:border-jade/20 transition-colors" }), _jsx("button", { type: "button", onClick: () => onAgainstChange?.((againstChampions ?? []).filter(x => x !== c)), className: "absolute -top-1.5 -right-1.5 w-5 h-5 rotate-45 bg-[#0a1214] border border-red-400/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-[0_0_8px_rgba(239,68,68,0.2)] hover:border-red-400/70 hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]", children: _jsx(X, { className: "w-2.5 h-2.5 -rotate-45 text-red-400/70" }) })] }, c))), _jsxs("button", { type: "button", onClick: loadChamps, className: "group relative overflow-hidden h-7 px-3 rounded-[2px] cursor-pointer transition-all duration-300 border border-jade/20 hover:border-jade/50 hover:shadow-[0_0_12px_rgba(0,217,146,0.15)] flex items-center justify-center", children: [_jsx("div", { className: "absolute inset-0 bg-jade/[0.04] group-hover:bg-jade/[0.08] transition-colors" }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-30", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,217,146,0.03) 2px, rgba(0,217,146,0.03) 3px)" } }), _jsx("span", { className: "relative z-10 text-[8px] font-orbitron text-jade/60 group-hover:text-jade/90 uppercase tracking-[0.12em] transition-colors", children: "+ Add" })] })] })] })), _jsx("div", { className: "w-full h-[1px] bg-flash/[0.04]" }), _jsxs("div", { className: "flex items-center gap-2", children: [getKeystoneIcon(value.primary.keystone) && (_jsx("img", { src: getKeystoneIcon(value.primary.keystone), alt: "", className: "w-7 h-7 rounded-full" })), _jsxs("div", { children: [_jsx("div", { className: "text-[14px] font-mono text-flash/60", children: getKeystoneName(value.primary.keystone) ?? "None" }), _jsxs("div", { className: "text-[11px] font-mono text-flash/30", children: [primaryTree.name, " / ", secondaryTree.name] })] })] }), _jsxs("div", { className: "text-[12px] font-mono text-flash/30", children: [value.primary.runes.filter(r => r > 0).length + value.secondary.runes.length, " / 5 runes selected"] })] }), showChampPicker && createPortal(_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center", onClick: () => setShowChampPicker(false), children: [_jsx("div", { className: "absolute inset-0 bg-black/70 backdrop-blur-sm" }), _jsxs("div", { className: "relative z-10 w-[480px] max-h-[520px] rounded-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]", style: { background: "linear-gradient(180deg, #0c1517 0%, #080e10 100%)" }, onClick: e => e.stopPropagation(), children: [_jsx("div", { className: "absolute inset-0 pointer-events-none opacity-15", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.01) 3px, rgba(0,217,146,0.01) 4px)" } }), _jsx("div", { className: "relative z-10 flex justify-center gap-4 px-4 py-4 border-b border-flash/[0.04]", children: CLASSES.map(cls => {
                                                    const active = (againstClasses ?? []).includes(cls.key);
                                                    return (_jsxs("button", { type: "button", onClick: () => {
                                                            toggleClass(cls.key);
                                                        }, className: cn("flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer", active ? "scale-110" : "opacity-35 hover:opacity-65 hover:scale-105"), children: [_jsx("img", { src: `https://cdn2.loldata.cc/img/class/${cls.key.toLowerCase()}.png`, alt: cls.label, className: "w-9 h-9 object-contain", style: active ? { filter: "brightness(1.4) drop-shadow(0 0 8px rgba(0,217,146,0.5))" } : { filter: "brightness(0.7)" } }), _jsx("span", { className: cn("text-[7px] font-orbitron uppercase tracking-wider transition-colors", active ? "text-jade/80" : "text-flash/20"), children: cls.label })] }, cls.key));
                                                }) }), _jsx("div", { className: "relative z-10 px-4 py-2.5 border-b border-jade/10", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-4 h-4 text-jade/30" }), _jsx("input", { value: champSearch, onChange: e => setChampSearch(e.target.value), placeholder: "Or search a specific champion...", className: "flex-1 bg-transparent text-[12px] font-mono text-flash/60 placeholder:text-flash/20 focus:outline-none caret-jade", autoFocus: true }), _jsx("button", { type: "button", onClick: () => setShowChampPicker(false), className: "text-flash/30 hover:text-flash/60 cursor-pointer", children: _jsx(X, { className: "w-4 h-4" }) })] }) }), _jsx("div", { className: "relative z-10 max-h-[340px] overflow-y-auto p-3 scrollbar-hide", children: _jsx("div", { className: "grid grid-cols-8 gap-1.5", children: champList.filter(c => !champSearch || c.name.toLowerCase().includes(champSearch.toLowerCase())).slice(0, 80).map(c => (_jsxs("button", { type: "button", onClick: () => {
                                                            onAgainstChange?.([...(againstChampions ?? []).filter(x => x !== c.id), c.id]);
                                                            setShowChampPicker(false);
                                                            setChampSearch("");
                                                        }, className: "flex flex-col items-center gap-1 p-1 rounded-sm hover:bg-jade/[0.08] hover:shadow-[0_0_8px_rgba(0,217,146,0.1)] transition-all cursor-pointer group", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${c.id}.png`, alt: c.name, className: "w-9 h-9 rounded-[3px] border border-flash/[0.06] group-hover:border-jade/20 transition-colors" }), _jsx("span", { className: "text-[6px] font-mono text-flash/20 group-hover:text-jade/40 truncate w-full text-center transition-colors", children: c.name })] }, c.id))) }) })] })] }), document.body)] })] })] }));
}
