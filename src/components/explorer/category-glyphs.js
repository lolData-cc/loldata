import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// category-glyphs.tsx — leading glyphs for the Explorer team-comp category picker.
//
// The 6 roster classes use Riot's gold class crests (CDN images). The 4 derived
// categories (AD/AP/Melee/Ranged) have no crest, so they're drawn here as FILLED
// glyphs in the SAME crest gold — a sword, a sparkle, crossed swords and a bow —
// so the picker reads as one coherent gold icon family instead of clashing the
// ornate crests with flat line icons.
import { useId } from "react";
import { categoryIcon, categoryHasIcon } from "./catalog";
// Riot class-crest gold (light top → dark bottom), so the glyphs sit as peers of
// the crests. Unique gradient id per instance (useId) so multiple glyphs coexist.
function GoldSvg({ size = 18, children }) {
    const id = useId();
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: id, x1: "12", y1: "1", x2: "12", y2: "23", gradientUnits: "userSpaceOnUse", children: [_jsx("stop", { stopColor: "#F4E9CD" }), _jsx("stop", { offset: "0.5", stopColor: "#C8AA6E" }), _jsx("stop", { offset: "1", stopColor: "#7A5C2E" })] }) }), children(`url(#${id})`)] }));
}
const SwordGlyph = () => (_jsx(GoldSvg, { children: (f) => _jsx("path", { fill: f, d: "M12 1.5 L14 6.2 L14 13.4 L10 13.4 L10 6.2 Z M7.5 13.2 H16.5 V15.6 H7.5 Z M10.8 15.6 H13.2 V19.8 H10.8 Z M10 19.5 H14 V21.4 H10 Z" }) }));
const SparkleGlyph = () => (_jsx(GoldSvg, { children: (f) => _jsx("path", { fill: f, d: "M12 1 C12.7 7.8 16.2 11.3 23 12 C16.2 12.7 12.7 16.2 12 23 C11.3 16.2 7.8 12.7 1 12 C7.8 11.3 11.3 7.8 12 1 Z" }) }));
const SWORD_BLADE = "M10.9 2.5 H13.1 V12.5 H10.9 Z M9.2 11.8 H14.8 V13.6 H9.2 Z M10.9 13.6 H13.1 V17 H10.9 Z";
const CrossedSwordsGlyph = () => (_jsx(GoldSvg, { children: (f) => (_jsxs("g", { fill: f, children: [_jsx("g", { transform: "rotate(40 12 12)", children: _jsx("path", { d: SWORD_BLADE }) }), _jsx("g", { transform: "rotate(-40 12 12)", children: _jsx("path", { d: SWORD_BLADE }) })] })) }));
const BowGlyph = () => (_jsx(GoldSvg, { children: (f) => (_jsxs("g", { fill: f, children: [_jsx("path", { d: "M6.5 2 C 13 7, 13 17, 6.5 22 C 9.8 16, 9.8 8, 6.5 2 Z" }), _jsx("path", { d: "M4.5 11.1 H17 V12.9 H4.5 Z" }), _jsx("path", { d: "M15.2 8.5 L20.7 12 L15.2 15.5 Z" })] })) }));
// class crest (CDN image) for the 6 classes; gold glyph for the 4 derived ones.
export function categoryGlyph(value) {
    if (!value)
        return null;
    if (categoryHasIcon(value))
        return (_jsx("img", { src: categoryIcon(value), className: "w-[18px] h-[18px] object-contain", alt: "", draggable: false, onError: (e) => (e.target.style.display = "none") }));
    switch (value) {
        case "AD":
            return _jsx(SwordGlyph, {});
        case "AP":
            return _jsx(SparkleGlyph, {});
        case "Melee":
            return _jsx(CrossedSwordsGlyph, {});
        case "Ranged":
            return _jsx(BowGlyph, {});
        default:
            return null;
    }
}
