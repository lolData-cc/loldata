// Guide section types
/** Normalize a BuildPage: convert legacy flat items to steps */
export function normalizeBuildPage(page) {
    if (page.steps?.length)
        return page;
    // Legacy: flat items array → one step per item
    return { ...page, steps: (page.items ?? []).map(id => ({ items: [id] })) };
}
// Camp positions on minimap (percentage-based x,y)
// Positions calibrated to ddragon map11.png (0,0 = top-left, 100,100 = bottom-right)
export const CAMP_POSITIONS = {
    gromp: { blue: { x: 15, y: 43 }, red: { x: 85, y: 57 }, label: "Gromp" },
    blue: { blue: { x: 25, y: 47 }, red: { x: 75, y: 53 }, label: "Blue" },
    wolves: { blue: { x: 26, y: 56 }, red: { x: 74, y: 44 }, label: "Wolves" },
    raptors: { blue: { x: 48, y: 65 }, red: { x: 53, y: 36 }, label: "Raptors" },
    red: { blue: { x: 53, y: 74 }, red: { x: 48, y: 27 }, label: "Red" },
    krugs: { blue: { x: 56, y: 83 }, red: { x: 45, y: 16 }, label: "Krugs" },
    scuttle_top: { blue: { x: 29, y: 36 }, red: { x: 29, y: 36 }, label: "Scuttle" },
    scuttle_bot: { blue: { x: 70, y: 65 }, red: { x: 70, y: 65 }, label: "Scuttle" },
};
export const THREAT_LEVELS = [
    { key: "impossible", label: "Impossible", color: "bg-red-600 text-white" },
    { key: "hard", label: "Hard", color: "bg-red-500/80 text-white" },
    { key: "skill", label: "Skill", color: "bg-amber-500/80 text-black" },
    { key: "easy", label: "Easy", color: "bg-emerald-500/60 text-white" },
];
export const SYNERGY_LEVELS = [
    { key: "perfect", label: "Perfect", color: "bg-jade text-black" },
    { key: "ideal", label: "Ideal", color: "bg-jade/70 text-black" },
    { key: "good", label: "Good", color: "bg-jade/40 text-white" },
    { key: "bad", label: "Bad", color: "bg-flash/20 text-flash/60" },
];
export const SECTION_TEMPLATES = {
    introduction: () => ({ type: "introduction", title: "Introduction", visible: true, content: "" }),
    matchups: () => ({ type: "matchups", title: "Threats & Synergies", visible: true, threats: [], synergies: [] }),
    build: () => ({ type: "build", title: "Core Build", visible: true, pages: [{ name: "Default Build", steps: [] }] }),
    runes: () => ({ type: "runes", title: "Runes", visible: true, pages: [{ name: "Default Runes", primary: { tree: 8000, keystone: 8010, runes: [] }, secondary: { tree: 8400, runes: [] }, shards: [] }] }),
    recommended_items: () => ({ type: "recommended_items", title: "Recommended Items", visible: true, items: [] }),
    back_timings: () => ({ type: "back_timings", title: "Buy When You Back", visible: true, timings: [] }),
    jungle_pathing: () => ({ type: "jungle_pathing", title: "Jungle Path", visible: true, paths: [{ name: "Standard Clear", side: "blue", camps: [], description: "" }] }),
};
