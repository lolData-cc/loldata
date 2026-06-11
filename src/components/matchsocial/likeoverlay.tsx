// src/components/matchsocial/likeoverlay.tsx
//
// Inline "like" button rendered NEXT TO the timeAgo label inside the
// match card. Default state: collapsed (width 0, opacity 0). On card
// hover: slides in from the right while the timeAgo label shifts left
// to make room.
//
// Hovering the heart itself opens a tooltip listing everyone who
// liked the match (display name + colour per liker). Tooltip style
// matches the rune tooltips elsewhere in MatchCard.

import * as React from "react";
import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config";
import { supabase } from "@/lib/supabaseClient";
import { showCyberToast } from "@/lib/toast-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatchSocialProps } from "@/components/matchcard";

export function LikeOverlay({
  matchId,
  social,
}: {
  matchId: string;
  social: MatchSocialProps;
}) {
  // Mirror parent state locally so optimistic toggles read smooth.
  // We re-sync from props on every render so when the parent re-fetches
  // the batch the count stays consistent.
  const [iLiked, setILiked] = useState(social.iLiked);
  const [count, setCount] = useState(social.likeCount);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    setILiked(social.iLiked);
    setCount(social.likeCount);
  }, [social.iLiked, social.likeCount]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    if (!social.canLike) {
      showCyberToast({ title: "Sign in to like", variant: "error" });
      return;
    }
    const prev = { iLiked, count };
    const nextLiked = !iLiked;
    const nextCount = count + (nextLiked ? 1 : -1);
    setILiked(nextLiked);
    setCount(Math.max(0, nextCount));
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setILiked(prev.iLiked);
        setCount(prev.count);
        showCyberToast({ title: "Sign in to like", variant: "error" });
        return;
      }
      const res = await fetch(
        `${API_BASE_URL}/api/scout/lobby/${social.lobbySlug}/match/${matchId}/like`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      if (!res.ok) {
        setILiked(prev.iLiked);
        setCount(prev.count);
        return;
      }
      const data = await res.json();
      if (typeof data.iLiked === "boolean") setILiked(data.iLiked);
      if (typeof data.likes === "number") setCount(data.likes);
      social.onLikeChanged?.({
        iLiked: data.iLiked ?? nextLiked,
        likeCount: data.likes ?? nextCount,
      });
    } catch {
      setILiked(prev.iLiked);
      setCount(prev.count);
    } finally {
      setBusy(false);
    }
  };

  // Likers list for the tooltip.
  const likers = social.likers ?? [];

  // When ANYONE has liked this match (count > 0) OR the current user
  // has liked it, the chip stays permanently visible — it shouldn't
  // disappear just because the cursor left the card. Only when the
  // match has zero likes is it collapsed by default and revealed on
  // hover.
  const alwaysVisible = count > 0 || iLiked;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            // Visibility: collapsed by default (max-w-0, opacity 0)
            // and expanded when the parent .group/match is hovered.
            // The card wrapper sets `group/match` so this whole
            // section reacts on card hover.
            className={cn(
              "shrink-0 overflow-hidden transition-all duration-200 ease-out cursor-clicker",
              alwaysVisible
                ? // Permanent state: pinned expanded regardless of hover.
                  "max-w-[60px] opacity-100 translate-x-0"
                : // No likes yet: collapsed until the card is hovered.
                  "max-w-0 opacity-0 -translate-x-1 group-hover/match:max-w-[60px] group-hover/match:opacity-100 group-hover/match:translate-x-0"
            )}
            aria-label={iLiked ? "Unlike" : "Like this match"}
          >
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 h-[18px] rounded-full border transition-colors",
                iLiked
                  ? "bg-[#ff3e6c]/[0.18] border-[#ff3e6c]/55"
                  : "bg-black/40 border-flash/20 hover:border-flash/40 hover:bg-black/60"
              )}
            >
              <Heart
                className={cn(
                  "w-3 h-3 transition-colors",
                  iLiked ? "text-[#ff3e6c] fill-[#ff3e6c]" : "text-flash/75"
                )}
              />
              {count > 0 && (
                <span
                  className={cn(
                    // Use chakrapetch (tabular nums + heavier metrics
                    // sit lower in the line box than jetbrains-mono,
                    // which was floating high next to the heart).
                    // translate-y nudges to optical centre with the
                    // heart icon — flexbox's items-center alone wasn't
                    // enough because the digit's visual centre is a
                    // bit above its line-box centre.
                    "text-[10px] font-chakrapetch font-bold tabular-nums leading-none translate-y-[0.5px]",
                    iLiked ? "text-[#ff3e6c]" : "text-flash/85"
                  )}
                >
                  {count}
                </span>
              )}
            </span>
          </button>
        </TooltipTrigger>
        {/* Tooltip content — same shadcn TooltipContent the rune
            tooltips use. Lists every liker on its own line, coloured
            by their player accent. */}
        {likers.length > 0 && (
          <TooltipContent side="top" className="text-xs">
            <div className="flex flex-col gap-0.5">
              {likers.map((l, i) => (
                <span
                  key={l.profileId + ":" + i}
                  className="font-chakrapetch font-bold leading-tight"
                  style={{ color: l.color || undefined }}
                >
                  {l.displayName}
                </span>
              ))}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
