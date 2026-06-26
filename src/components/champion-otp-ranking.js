import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useChampionOtpRanking } from "@/hooks/useChampionOtpRanking";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { getRankImage } from "@/utils/rankIcons";
import { cdnBaseUrl, PERK_CDN } from "@/config";
const REGIONS = ["ALL", "EUW", "NA", "KR"];
const TIER_COLORS = {
    CHALLENGER: "text-amber-300",
    GRANDMASTER: "text-red-400",
    MASTER: "text-purple-400",
    DIAMOND: "text-cyan-300",
    EMERALD: "text-emerald-400",
    PLATINUM: "text-teal-300",
    GOLD: "text-yellow-400",
    SILVER: "text-gray-300",
    BRONZE: "text-orange-400",
    IRON: "text-stone-400",
};
const KEYSTONE_NAMES = {
    8005: "Press the Attack", 8008: "Lethal Tempo", 8021: "Fleet Footwork", 8010: "Conqueror",
    8112: "Electrocute", 8124: "Predator", 8128: "Dark Harvest", 9923: "Hail of Blades",
    8214: "Summon Aery", 8229: "Arcane Comet", 8230: "Phase Rush",
    8351: "Glacial Augment", 8360: "Unsealed Spellbook", 8369: "First Strike",
    8437: "Grasp of the Undying", 8439: "Aftershock", 8465: "Guardian",
};
const STYLE_NAMES = {
    8000: "Precision", 8100: "Domination", 8200: "Sorcery", 8300: "Inspiration", 8400: "Resolve",
};
const STYLE_COLORS = {
    8000: "text-yellow-400", 8100: "text-red-400", 8200: "text-blue-400", 8300: "text-cyan-300", 8400: "text-green-400",
};
// Keystone perk ID → actual keystone icon path on ddragon
const KEYSTONE_ICON_PATHS = {
    // Precision
    8005: "Precision/PressTheAttack/PressTheAttack.png",
    8008: "Precision/LethalTempo/LethalTempoTemp.png",
    8010: "Precision/Conqueror/Conqueror.png",
    8021: "Precision/FleetFootwork/FleetFootwork.png",
    // Domination
    8112: "Domination/Electrocute/Electrocute.png",
    8124: "Domination/Predator/Predator.png",
    8128: "Domination/DarkHarvest/DarkHarvest.png",
    9923: "Domination/HailOfBlades/HailOfBlades.png",
    // Sorcery
    8214: "Sorcery/SummonAery/SummonAery.png",
    8229: "Sorcery/ArcaneComet/ArcaneComet.png",
    8230: "Sorcery/PhaseRush/PhaseRush.png",
    // Resolve
    8437: "Resolve/GraspOfTheUndying/GraspOfTheUndying.png",
    8439: "Resolve/VeteranAftershock/VeteranAftershock.png",
    8465: "Resolve/Guardian/Guardian.png",
    // Inspiration
    8351: "Inspiration/GlacialAugment/GlacialAugment.png",
    8360: "Inspiration/UnsealedSpellbook/UnsealedSpellbook.png",
    8369: "Inspiration/FirstStrike/FirstStrike.png",
};
function getKeystoneIconUrl(keystoneId) {
    const path = KEYSTONE_ICON_PATHS[keystoneId];
    if (path)
        return `${PERK_CDN}/Styles/${path}`;
    return `${PERK_CDN}/Styles/7201_Precision.png`;
}
// Secondary tree style ID → tree icon
const STYLE_ICON_PATHS = {
    8000: "7201_Precision.png",
    8100: "7200_Domination.png",
    8200: "7202_Sorcery.png",
    8300: "7203_Whimsy.png",
    8400: "7204_Resolve.png",
};
function getStyleIconUrl(styleId) {
    const path = STYLE_ICON_PATHS[styleId] ?? "7201_Precision.png";
    return `${PERK_CDN}/Styles/${path}`;
}
export function ChampionOtpRanking({ championName, latestPatch }) {
    const [region, setRegion] = useState("ALL");
    const { data, loading, error } = useChampionOtpRanking(championName, region);
    const navigate = useNavigate();
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "mr-2 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.2em] text-flash/40 cursor-custom", children: "Region" }), REGIONS.map((r) => (_jsx("button", { onClick: () => setRegion(r), className: cn("rounded-md px-3 py-1.5 font-chakrapetch text-[11px] font-bold uppercase tracking-[0.2em] transition-colors cursor-clicker", region === r
                            ? "bg-jade/10 text-jade ring-1 ring-jade/30"
                            : "text-flash/40 hover:text-flash/70 ring-1 ring-inset ring-flash/[0.06]"), children: r }, r))), data && (_jsxs("span", { className: "ml-auto font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/30 tabular-nums", children: [data.totalOtps, " OTPs found"] }))] }), _jsxs("div", { className: "rounded-2xl border border-jade/15 bg-[rgba(6,12,14,0.72)] p-3 backdrop-blur-md sm:p-4", style: { boxShadow: "0 40px 90px -50px rgba(0,217,146,0.30)" }, children: [loading && (_jsx("div", { className: "space-y-1.5", children: Array.from({ length: 10 }).map((_, i) => (_jsxs("div", { className: "flex items-center gap-3 rounded-lg bg-flash/[0.02] p-3 ring-1 ring-inset ring-flash/[0.04]", children: [_jsx(Skeleton, { className: "h-6 w-6 bg-flash/[0.05]" }), _jsx(Skeleton, { className: "h-8 w-8 rounded-full bg-flash/[0.05]" }), _jsx(Skeleton, { className: "h-4 w-24 bg-flash/[0.05]" }), _jsx(Skeleton, { className: "ml-auto h-4 w-16 bg-flash/[0.05]" })] }, i))) })), error && (_jsx("div", { className: "py-8 text-center font-jetbrains text-sm text-[#ff6286]", children: "Failed to load OTP ranking" })), !loading && !error && data?.players.length === 0 && (_jsxs("div", { className: "py-12 text-center", children: [_jsx("p", { className: "font-jetbrains text-sm uppercase tracking-[0.18em] text-flash/40", children: "No OTPs found for this champion" }), _jsx("p", { className: "mt-2 font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/25", children: "Minimum 10 games with 40% playrate required" })] })), !loading && data && data.players.length > 0 && (_jsxs("div", { className: "space-y-1", children: [_jsxs("div", { className: "flex items-center gap-3 px-3 py-2 font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/30", children: [_jsx("span", { className: "w-8 text-center", children: "#" }), _jsx("span", { className: "w-8" }), _jsx("span", { className: "min-w-0 flex-1", children: "Player" }), _jsx("span", { className: "w-20 text-center", children: "Rank" }), _jsx("span", { className: "w-14 text-center", children: "WR%" }), _jsx("span", { className: "w-16 text-center", children: "KDA" }), _jsx("span", { className: "w-14 text-center", children: "Games" }), _jsx("span", { className: "w-16 text-center", children: "Playrate" }), _jsx("span", { className: "w-10 text-center", children: "Item" }), _jsx("span", { className: "w-20 text-center", children: "Runes" })] }), data.players.map((p) => (_jsxs("div", { onClick: () => navigate(`/summoners/${(p.region ?? "euw").toLowerCase()}/${encodeURIComponent(p.name)}-${encodeURIComponent(p.tag)}`), className: cn("flex items-center gap-3 rounded-lg bg-flash/[0.02] px-3 py-2.5 ring-1 ring-inset ring-flash/[0.04] transition-colors cursor-clicker", "hover:bg-jade/[0.04] hover:ring-jade/20", p.rank <= 3 && "bg-jade/[0.03] ring-jade/[0.12]"), children: [_jsx("span", { className: cn("w-8 text-center font-orbitron text-[13px] font-bold tabular-nums", p.rank <= 3 ? "text-jade" : "text-flash/30"), children: p.rank }), _jsx("img", { src: `${cdnBaseUrl()}/img/profileicon/${p.profileIconId ?? 29}.png`, alt: "", className: "h-8 w-8 rounded-full object-cover ring-1 ring-flash/10" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("span", { className: "block truncate font-jetbrains text-[13px] text-flash/80", children: [p.name, _jsxs("span", { className: "text-flash/40", children: ["#", p.tag] })] }), _jsxs("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.16em] text-flash/40 tabular-nums", children: [p.champPlayrate, "% playrate"] })] }), _jsxs("div", { className: "flex w-20 items-center justify-center gap-1.5", children: [_jsx("img", { src: getRankImage(p.tier), alt: p.tier, className: "h-6 w-6 object-contain", onError: (e) => { e.target.style.display = "none"; } }), _jsx("span", { className: cn("font-jetbrains text-[11px] font-semibold tabular-nums", TIER_COLORS[p.tier] ?? "text-flash/55"), children: p.lp })] }), _jsxs("span", { className: cn("w-14 text-center font-jetbrains text-[12px] font-semibold tabular-nums", p.champWinrate >= 60 ? "text-jade" : p.champWinrate >= 52 ? "text-flash/70" : "text-[#ff6286]"), children: [p.champWinrate, "%"] }), _jsx("div", { className: "w-16 text-center", children: _jsx("span", { className: cn("font-jetbrains text-[12px] font-semibold tabular-nums", p.kda >= 4 ? "text-jade" : p.kda >= 3 ? "text-[#FFB615]" : p.kda >= 2 ? "text-flash/70" : "text-[#ff6286]"), children: p.kda >= 99 ? "Perfect" : p.kda.toFixed(1) }) }), _jsx("span", { className: "w-14 text-center font-jetbrains text-[11px] text-flash/55 tabular-nums", children: p.champGames }), _jsxs("span", { className: "w-16 text-center font-jetbrains text-[11px] text-flash/55 tabular-nums", children: [p.champPlayrate, "%"] }), _jsx("div", { className: "flex w-10 items-center justify-center", children: p.firstItem ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${p.firstItem}.png`, alt: "", className: "h-6 w-6 rounded-sm ring-1 ring-flash/10", onError: (e) => { e.target.style.display = "none"; } })) : (_jsx("span", { className: "font-jetbrains text-[10px] text-flash/25", children: "--" })) }), _jsx("div", { className: "flex w-20 items-center justify-center gap-1.5", children: p.keystone ? (_jsxs(_Fragment, { children: [_jsx("img", { src: getKeystoneIconUrl(p.keystone), alt: KEYSTONE_NAMES[p.keystone] ?? "", title: KEYSTONE_NAMES[p.keystone] ?? "", className: "h-6 w-6 rounded-full", onError: (e) => { e.target.style.display = "none"; } }), p.secondaryStyle && (_jsx("img", { src: getStyleIconUrl(p.secondaryStyle), alt: STYLE_NAMES[p.secondaryStyle] ?? "", title: STYLE_NAMES[p.secondaryStyle] ?? "", className: "h-4 w-4 rounded-full opacity-60", onError: (e) => { e.target.style.display = "none"; } }))] })) : (_jsx("span", { className: "font-jetbrains text-[10px] text-flash/25", children: "--" })) })] }, p.puuid)))] }))] })] }));
}
