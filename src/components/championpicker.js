import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// ChampionPicker — thin backward-compatible adapter over the universal
// <ChampionDialog>. Keeps the original props (slug-string onSelect, a built-in
// icon+label trigger, Clear support) so existing call sites (the summoner-page
// champion filter) keep working unchanged while getting the new unified dialog.
import { ChampionDialog } from "@/components/champion-dialog";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";
export function ChampionPicker({ champions: _champions, // unused — ChampionDialog self-sources the roster via useChampions
onSelect, selectedChampion = null, triggerLabel = "CHAMPION", triggerClassName, }) {
    return (_jsx(ChampionDialog, { value: selectedChampion, onSelect: (c) => onSelect(c.slug), onClear: () => onSelect(null), title: "Champion filter", trigger: _jsx("button", { type: "button", className: cn("flex items-center space-x-2 hover:text-gray-300 transition-colors text-sm font-thin tracking-wide cursor-clicker h-full", triggerClassName), children: selectedChampion ? (_jsxs(_Fragment, { children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${selectedChampion}.png`, alt: selectedChampion, className: "w-4 h-4 rounded-sm", draggable: false }), _jsx("span", { className: "text-jade/80", children: selectedChampion.toUpperCase() })] })) : (_jsx("span", { children: triggerLabel })) }) }));
}
