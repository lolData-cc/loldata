import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Side-profile dragon — head/neck with a horn + back fin + tail tip.
// Reads as a dragon at 12-20px sizes. The old icon was a four-lobed
// blob that looked like a butterfly.
export const DragonIcon = (p) => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: [_jsx("path", { d: "M16 4 L18 2 L17 6 Z" }), _jsx("path", { d: "M14 5 C17 5 19 7 20 9 L22 10 L19 11 C19 13 17 14 15 14 L13 15 L14 17 L12 16 L10 18 L9 16 C7 16 5 15 4 13 L2 14 L3 11 C4 9 6 8 9 8 L11 7 L13 8 Z" }), _jsx("path", { d: "M11 6 L10 3 L13 5 Z" }), _jsx("circle", { cx: "17", cy: "9", r: "0.8", fill: "rgba(0,0,0,0.85)" })] }));
export const BaronIcon = (p) => (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: _jsx("path", { d: "M12 2l3 5 5 2-4 4 1 6-5-3-5 3 1-6-4-4 5-2z" }) }));
export const HeraldIcon = (p) => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: [_jsx("circle", { cx: "12", cy: "12", r: "9", fill: "none", stroke: "currentColor", strokeWidth: "1.5" }), _jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("path", { d: "M12 3v3M12 18v3M3 12h3M18 12h3", stroke: "currentColor", strokeWidth: "1.5" })] }));
export const VoidgrubIcon = (p) => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: [_jsx("path", { d: "M6 16c0-4 3-7 6-7s6 3 6 7H6z" }), _jsx("circle", { cx: "9", cy: "13", r: "1", fill: "#040A0C" }), _jsx("circle", { cx: "15", cy: "13", r: "1", fill: "#040A0C" })] }));
export const AtakhanIcon = (p) => (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: _jsx("path", { d: "M12 2l2 4 4-1-2 4 4 2-4 2 2 4-4-1-2 4-2-4-4 1 2-4-4-2 4-2-2-4 4 1z" }) }));
export const TowerIcon = (p) => (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: _jsx("path", { d: "M9 3h6l-1 3h1l-1 3v8l-2 4h-2l-2-4V9h1L9 6h1z" }) }));
export const InhibitorIcon = (p) => (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: _jsx("rect", { x: "6", y: "6", width: "12", height: "12", transform: "rotate(45 12 12)" }) }));
export const SkullIcon = (p) => (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: _jsx("path", { d: "M12 2C7 2 4 5 4 10c0 3 1 5 3 6v3h3v-2h4v2h3v-3c2-1 3-3 3-6 0-5-3-8-8-8zM8 11a2 2 0 110-4 2 2 0 010 4zm8 0a2 2 0 110-4 2 2 0 010 4z" }) }));
export const WardYellowIcon = (p) => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: [_jsx("path", { d: "M12 3l3 5h-2v6h-2V8H9z" }), _jsx("ellipse", { cx: "12", cy: "18", rx: "6", ry: "2", fillOpacity: "0.5" })] }));
export const WardControlIcon = (p) => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: [_jsx("circle", { cx: "12", cy: "10", r: "5" }), _jsx("ellipse", { cx: "12", cy: "18", rx: "6", ry: "2", fillOpacity: "0.5" })] }));
export const PingIcon = (p) => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: [_jsx("circle", { cx: "12", cy: "12", r: "3" }), _jsx("circle", { cx: "12", cy: "12", r: "7", fill: "none", stroke: "currentColor", strokeWidth: "1.5", opacity: "0.6" })] }));
export const SwordIcon = (p) => (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: _jsx("path", { d: "M19 3l-9 9 2 2 9-9V3h-2zM3 17l4-4 4 4-4 4H3v-4z" }) }));
export const CoinIcon = (p) => (_jsxs("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: [_jsx("circle", { cx: "12", cy: "12", r: "9" }), _jsx("text", { x: "12", y: "16", textAnchor: "middle", fontSize: "11", fontWeight: "bold", fill: "#040A0C", children: "G" })] }));
export const SoulIcon = (p) => (_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", ...p, children: _jsx("path", { d: "M12 2c-2 0-3 2-3 4s1 4 3 4 3-2 3-4-1-4-3-4zm-5 9c-3 2-3 8 0 11h10c3-3 3-9 0-11H7z" }) }));
/**
 * Picks the right elite-monster icon by Riot's monsterType string.
 */
export function eliteMonsterIcon(monsterType) {
    switch (monsterType) {
        case "DRAGON": return DragonIcon;
        case "BARON_NASHOR": return BaronIcon;
        case "RIFTHERALD": return HeraldIcon;
        case "HORDE": return VoidgrubIcon;
        case "ATAKHAN": return AtakhanIcon;
        default: return DragonIcon;
    }
}
/**
 * Picks the right ward icon by Riot's wardType string.
 */
export function wardIcon(wardType) {
    switch (wardType) {
        case "CONTROL_WARD": return WardControlIcon;
        case "BLUE_TRINKET": return WardControlIcon;
        case "YELLOW_TRINKET": return WardYellowIcon;
        case "SIGHT_WARD": return WardYellowIcon;
        case "TEEMO_MUSHROOM": return VoidgrubIcon; // close-enough placeholder
        default: return WardYellowIcon;
    }
}
/**
 * Color for the dragon by subtype.
 */
export function dragonColor(subType) {
    switch (subType) {
        case "FIRE_DRAGON": return "#e74c3c";
        case "WATER_DRAGON": return "#3498db";
        case "EARTH_DRAGON": return "#a07242";
        case "AIR_DRAGON": return "#bdc3c7";
        case "HEXTECH_DRAGON": return "#1abc9c";
        case "CHEMTECH_DRAGON": return "#7f8c8d";
        case "ELDER_DRAGON": return "#9b59b6";
        default: return "#e67e22";
    }
}
