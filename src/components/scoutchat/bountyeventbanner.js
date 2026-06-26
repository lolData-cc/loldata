import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { Swords, Flame, Crown, Eye, Coins, Shield, Sparkles, Users, Zap, Wheat, Target, } from "lucide-react";
import { cn } from "@/lib/utils";
const ICONS = {
    swords: Swords,
    flame: Flame,
    crown: Crown,
    eye: Eye,
    coins: Coins,
    shield: Shield,
    sparkles: Sparkles,
    users: Users,
    zap: Zap,
    wheat: Wheat,
};
export function BountyEventBanner({ data }) {
    const Icon = ICONS[data.icon] ?? Target;
    const overtake = data.overtake;
    // Surpassing is the hotter, more aggressive event → red/gold flow.
    // A fresh claim is the calmer gold→jade treasure flow.
    const accent = overtake ? "#ff5d3c" : "#FFB615";
    const borderGradient = overtake
        ? "linear-gradient(110deg,#ff5d3c,#ffb615,#ff5d3c)"
        : "linear-gradient(110deg,#FFB615,#00d992,#FFB615)";
    return (_jsx(motion.div, { initial: { opacity: 0, scale: 0.9, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, transition: { type: "spring", stiffness: 300, damping: 20 }, className: "my-1", children: _jsx("div", { className: "relative rounded-[9px] p-[1.5px] bg-[length:200%_auto] animate-[bountyBorderFlow_3s_linear_infinite]", style: {
                backgroundImage: borderGradient,
                boxShadow: `0 0 20px ${accent}33, 0 0 4px ${accent}55`,
            }, children: _jsxs("div", { className: "relative overflow-hidden rounded-[8px] bg-[#070d10]/95 px-3.5 py-3", children: [_jsx("div", { className: "pointer-events-none absolute inset-0", children: _jsx("div", { className: "absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.10] to-transparent animate-[bountyShine_2.8s_ease-in-out_infinite]" }) }), _jsx("span", { className: "pointer-events-none absolute top-1 left-1 w-2 h-2 border-l border-t", style: { borderColor: `${accent}99` } }), _jsx("span", { className: "pointer-events-none absolute bottom-1 right-1 w-2 h-2 border-r border-b", style: { borderColor: `${accent}99` } }), _jsxs("div", { className: "relative flex items-center gap-3", children: [_jsx("div", { className: "shrink-0 grid place-items-center w-9 h-9 rounded-md ring-1", style: {
                                    background: `${accent}1f`,
                                    boxShadow: `0 0 12px ${accent}55, inset 0 0 8px ${accent}22`,
                                    borderColor: `${accent}66`,
                                    ['--tw-ring-color']: `${accent}55`,
                                }, children: _jsx(Icon, { className: "w-[18px] h-[18px]", style: {
                                        color: accent,
                                        filter: `drop-shadow(0 0 6px ${accent}aa)`,
                                    } }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-[8.5px] font-jetbrains font-bold tracking-[0.28em] uppercase whitespace-nowrap", style: { color: accent }, children: overtake ? "Bounty Surpassed" : "Bounty Claimed" }), _jsx("span", { className: "h-px flex-1", style: {
                                                    backgroundImage: `linear-gradient(to right, ${accent}66, transparent)`,
                                                } })] }), _jsxs("div", { className: "mt-1 font-chakrapetch text-[13.5px] leading-tight", children: [_jsx("span", { className: "font-bold", style: { color: data.color || accent }, children: data.playerName }), _jsx("span", { className: "font-light text-flash/45", children: overtake ? " surpassed " : " completed " }), _jsx("span", { className: "font-bold text-flash/85", children: data.title })] }), _jsx("div", { className: cn("mt-0.5 font-jetbrains text-[10px] tracking-[0.12em] tabular-nums"), style: { color: `${accent}cc` }, children: data.valueLabel })] })] })] }) }) }));
}
