import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@/components/ui/tooltip";
export function LikeOverlay({ matchId, social, }) {
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
    const toggle = async (e) => {
        e.stopPropagation();
        if (busy)
            return;
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
            const { data: { session }, } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setILiked(prev.iLiked);
                setCount(prev.count);
                showCyberToast({ title: "Sign in to like", variant: "error" });
                return;
            }
            const res = await fetch(`${API_BASE_URL}/api/scout/lobby/${social.lobbySlug}/match/${matchId}/like`, {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) {
                setILiked(prev.iLiked);
                setCount(prev.count);
                return;
            }
            const data = await res.json();
            if (typeof data.iLiked === "boolean")
                setILiked(data.iLiked);
            if (typeof data.likes === "number")
                setCount(data.likes);
            social.onLikeChanged?.({
                iLiked: data.iLiked ?? nextLiked,
                likeCount: data.likes ?? nextCount,
            });
        }
        catch {
            setILiked(prev.iLiked);
            setCount(prev.count);
        }
        finally {
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
    return (_jsx(TooltipProvider, { delayDuration: 150, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: toggle, disabled: busy, 
                        // Visibility: collapsed by default (max-w-0, opacity 0)
                        // and expanded when the parent .group/match is hovered.
                        // The card wrapper sets `group/match` so this whole
                        // section reacts on card hover.
                        className: cn("shrink-0 overflow-hidden transition-all duration-200 ease-out cursor-clicker", alwaysVisible
                            ? // Permanent state: pinned expanded regardless of hover.
                                "max-w-[80px] opacity-100 translate-x-0"
                            : // No likes yet: collapsed until the card is hovered.
                                "max-w-0 opacity-0 -translate-x-1 group-hover/match:max-w-[80px] group-hover/match:opacity-100 group-hover/match:translate-x-0"), "aria-label": iLiked ? "Unlike" : "Like this match", children: _jsxs("span", { className: cn("inline-flex items-center gap-1.5 px-2.5 h-[26px] rounded-full border transition-colors", iLiked
                                ? "bg-[#ff3e6c]/[0.18] border-[#ff3e6c]/60 shadow-[0_0_10px_rgba(255,62,108,0.3)]"
                                : "bg-black/55 border-flash/30 hover:border-flash/50 hover:bg-black/70"), children: [_jsx(Heart, { className: cn("w-[15px] h-[15px] transition-colors", iLiked ? "text-[#ff3e6c] fill-[#ff3e6c]" : "text-flash/85") }), count > 0 && (_jsx("span", { className: cn("text-[12px] font-chakrapetch font-bold tabular-nums leading-none", iLiked ? "text-[#ff3e6c]" : "text-flash/90"), children: count }))] }) }) }), likers.length > 0 && (_jsx(TooltipContent, { side: "top", className: "text-xs", children: _jsx("div", { className: "flex flex-col gap-0.5", children: likers.map((l, i) => (_jsx("span", { className: "font-chakrapetch font-bold leading-tight", style: { color: l.color || undefined }, children: l.displayName }, l.profileId + ":" + i))) }) }))] }) }));
}
