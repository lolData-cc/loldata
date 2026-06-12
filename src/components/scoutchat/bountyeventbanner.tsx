// src/components/scoutchat/bountyeventbanner.tsx
//
// Animated "event" banner shown inline in the lobby chat when someone
// claims — or surpasses — the daily bounty. Pure cyber: an animated
// gradient border, a shimmer sweep, a glowing icon badge and a spring
// pop-in. The data arrives live over the chat WebSocket (ephemeral).

import * as React from "react";
import { motion } from "framer-motion";
import {
  Swords,
  Flame,
  Crown,
  Eye,
  Coins,
  Shield,
  Sparkles,
  Users,
  Zap,
  Wheat,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BountyEventData } from "@/components/scoutchat/usescoutchat";

const ICONS: Record<string, LucideIcon> = {
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

export function BountyEventBanner({ data }: { data: BountyEventData }) {
  const Icon = ICONS[data.icon] ?? Target;
  const overtake = data.overtake;

  // Surpassing is the hotter, more aggressive event → red/gold flow.
  // A fresh claim is the calmer gold→jade treasure flow.
  const accent = overtake ? "#ff5d3c" : "#FFB615";
  const borderGradient = overtake
    ? "linear-gradient(110deg,#ff5d3c,#ffb615,#ff5d3c)"
    : "linear-gradient(110deg,#FFB615,#00d992,#FFB615)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="my-1"
    >
      {/* Animated gradient border (a 1.5px frame that flows). */}
      <div
        className="relative rounded-[9px] p-[1.5px] bg-[length:200%_auto] animate-[bountyBorderFlow_3s_linear_infinite]"
        style={{
          backgroundImage: borderGradient,
          boxShadow: `0 0 20px ${accent}33, 0 0 4px ${accent}55`,
        }}
      >
        {/* Inner glass panel. */}
        <div className="relative overflow-hidden rounded-[8px] bg-[#070d10]/95 px-3.5 py-3">
          {/* Shimmer sweep. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.10] to-transparent animate-[bountyShine_2.8s_ease-in-out_infinite]" />
          </div>

          {/* Corner ticks for a HUD feel. */}
          <span
            className="pointer-events-none absolute top-1 left-1 w-2 h-2 border-l border-t"
            style={{ borderColor: `${accent}99` }}
          />
          <span
            className="pointer-events-none absolute bottom-1 right-1 w-2 h-2 border-r border-b"
            style={{ borderColor: `${accent}99` }}
          />

          <div className="relative flex items-center gap-3">
            {/* Glowing icon badge. */}
            <div
              className="shrink-0 grid place-items-center w-9 h-9 rounded-md ring-1"
              style={{
                background: `${accent}1f`,
                boxShadow: `0 0 12px ${accent}55, inset 0 0 8px ${accent}22`,
                borderColor: `${accent}66`,
                ['--tw-ring-color' as any]: `${accent}55`,
              }}
            >
              <Icon
                className="w-[18px] h-[18px]"
                style={{
                  color: accent,
                  filter: `drop-shadow(0 0 6px ${accent}aa)`,
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              {/* Event label + hairline. */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[8.5px] font-jetbrains font-bold tracking-[0.28em] uppercase whitespace-nowrap"
                  style={{ color: accent }}
                >
                  {overtake ? "Bounty Surpassed" : "Bounty Claimed"}
                </span>
                <span
                  className="h-px flex-1"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${accent}66, transparent)`,
                  }}
                />
              </div>

              {/* Who + what. */}
              <div className="mt-1 font-chakrapetch text-[13.5px] leading-tight">
                <span
                  className="font-bold"
                  style={{ color: data.color || accent }}
                >
                  {data.playerName}
                </span>
                <span className="font-light text-flash/45">
                  {overtake ? " surpassed " : " completed "}
                </span>
                <span className="font-bold text-flash/85">{data.title}</span>
              </div>

              {/* Achieved value. */}
              <div
                className={cn(
                  "mt-0.5 font-jetbrains text-[10px] tracking-[0.12em] tabular-nums"
                )}
                style={{ color: `${accent}cc` }}
              >
                {data.valueLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
