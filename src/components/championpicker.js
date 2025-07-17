import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
export function ChampionPicker({ champions, onSelect, }) {
    const [search, setSearch] = useState("");
    const filtered = champions.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    return (_jsxs(Dialog, { children: [_jsx(DialogTrigger, { className: "flex items-center space-x-2 hover:text-gray-300 transition-colors text-sm font-medium tracking-wide", children: _jsx("span", { children: "CHAMPION" }) }), _jsxs(DialogContent, { className: "bg-[#1f1f1f] max-w-[600px] rounded-xl p-6 border-none", children: [_jsx("span", { children: "CHAMPIONS" }), _jsx("input", { type: "text", placeholder: "Search champions...", className: "w-full p-2 rounded-md bg-[#2B2A2B] text-white text-sm mb-4 outline-none", value: search, onChange: (e) => setSearch(e.target.value) }), _jsx("div", { className: "grid grid-cols-8 gap-3 max-h-[300px] overflow-y-scroll scrollbar-hide pr-0", children: filtered.map((champ) => (_jsx("img", { src: `http://cdn.loldata.cc/15.13.1/img/champion/${champ.id}.png`, alt: champ.name, title: champ.name, className: "w-10 h-10 rounded-md cursor-pointer hover:scale-110 transition", onClick: () => onSelect(champ.id || null) }, champ.id))) }), _jsx("button", { onClick: () => onSelect(null), className: "text-xs text-gray-400 hover:text-white mt-4", children: "Clear filter" })] })] }));
}
