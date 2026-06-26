import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function Svg({ size = 16, className, style, children }) {
    return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", className: className, style: style, children: children }));
}
// Subject — the focal champion: a hex lock with a solid core
const SubjectGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("polygon", { points: "12,2.6 20.3,7.3 20.3,16.7 12,21.4 3.7,16.7 3.7,7.3" }), _jsx("circle", { cx: "12", cy: "12", r: "2.4", fill: "currentColor", stroke: "none" })] }));
// Ally — two linked nodes (alongside)
const AllyGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("circle", { cx: "8", cy: "12", r: "3.1" }), _jsx("circle", { cx: "16", cy: "12", r: "3.1" }), _jsx("line", { x1: "11.1", y1: "12", x2: "12.9", y2: "12" })] }));
// Enemy — two opposing brackets (clash / vs)
const EnemyGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("polyline", { points: "6,5 11,12 6,19" }), _jsx("polyline", { points: "18,5 13,12 18,19" })] }));
// Item — a faceted gem
const ItemGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("polygon", { points: "12,2.6 20,9 12,21.4 4,9" }), _jsx("line", { x1: "4", y1: "9", x2: "20", y2: "9" }), _jsx("line", { x1: "12", y1: "2.6", x2: "9", y2: "9" }), _jsx("line", { x1: "12", y1: "2.6", x2: "15", y2: "9" })] }));
// Rune — a keystone: hexagon within a hexagon
const RuneGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("polygon", { points: "12,2.6 20.3,7.3 20.3,16.7 12,21.4 3.7,16.7 3.7,7.3" }), _jsx("polygon", { points: "12,7.6 16.1,9.9 16.1,14.1 12,16.4 7.9,14.1 7.9,9.9" })] }));
// Filter — narrowing rails
const FilterGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("line", { x1: "3.5", y1: "7", x2: "20.5", y2: "7" }), _jsx("line", { x1: "6.5", y1: "12", x2: "17.5", y2: "12" }), _jsx("line", { x1: "9.5", y1: "17", x2: "14.5", y2: "17" })] }));
// Output — ascending result bars
const OutputGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("line", { x1: "6", y1: "20", x2: "6", y2: "13.5", strokeWidth: 2.2 }), _jsx("line", { x1: "12", y1: "20", x2: "12", y2: "7.5", strokeWidth: 2.2 }), _jsx("line", { x1: "18", y1: "20", x2: "18", y2: "11", strokeWidth: 2.2 })] }));
// Exclude — a hex "no entry": the module motif struck through
const ExcludeGlyph = (p) => (_jsxs(Svg, { ...p, children: [_jsx("polygon", { points: "12,2.6 20.3,7.3 20.3,16.7 12,21.4 3.7,16.7 3.7,7.3" }), _jsx("line", { x1: "6.9", y1: "6.9", x2: "17.1", y2: "17.1" })] }));
export const MODULE_GLYPH = {
    subject: SubjectGlyph,
    ally: AllyGlyph,
    enemy: EnemyGlyph,
    item: ItemGlyph,
    rune: RuneGlyph,
    filter: FilterGlyph,
    output: OutputGlyph,
    exclude: ExcludeGlyph,
};
