import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { HoverCard, HoverCardTrigger, HoverCardContent, } from "@/components/ui/hover-card";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
export function PlayerHoverCard({ riotId, region, patch = "15.13.1", isCurrentUser = false, children, }) {
    const navigate = useNavigate();
    const [hoverOpen, setHoverOpen] = useState(false);
    const [hoverAnimateIn, setHoverAnimateIn] = useState(false);
    const [hoverData, setHoverData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // Fetch quando la card si apre
    useEffect(() => {
        if (hoverOpen && !hoverData && riotId) {
            const [name, tag] = riotId.split("#");
            if (!name || !tag)
                return;
            setIsLoading(true);
            fetch(`${API_BASE_URL}/api/summoner`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, tag, region }),
            })
                .then((res) => res.json())
                .then((data) => {
                const summoner = data.summoner;
                if (summoner) {
                    setHoverData({
                        rank: summoner.rank,
                        wins: summoner.wins,
                        losses: summoner.losses,
                        lp: summoner.lp,
                        profileIconId: summoner.profileIconId,
                    });
                }
            })
                .catch((err) => {
                console.error("Failed to fetch summoner info", err);
            })
                .finally(() => setIsLoading(false));
        }
    }, [hoverOpen, hoverData, riotId, region]);
    // piccola animazione scale-y all’apertura
    useEffect(() => {
        if (hoverOpen) {
            setHoverAnimateIn(true);
            const id = requestAnimationFrame(() => {
                const id2 = requestAnimationFrame(() => setHoverAnimateIn(false));
                return () => cancelAnimationFrame(id2);
            });
            return () => cancelAnimationFrame(id);
        }
    }, [hoverOpen]);
    const handleClick = () => {
        if (!riotId)
            return;
        const [name, tag] = riotId.split("#");
        if (!name || !tag)
            return;
        navigate(`/summoners/${region}/${name.replace(/\s+/g, "+")}-${tag}`);
    };
    const totalGames = hoverData?.wins != null && hoverData?.losses != null
        ? hoverData.wins + hoverData.losses
        : 0;
    const wr = totalGames > 0 ? Math.round((hoverData.wins / totalGames) * 100) : 0;
    return (_jsxs(HoverCard, { open: hoverOpen, onOpenChange: (v) => {
            if (v)
                setHoverAnimateIn(true);
            setHoverOpen(v);
        }, children: [_jsx(HoverCardTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: handleClick, className: cn("truncate hover:underline text-flash/50 cursor-clicker text-left", isCurrentUser && "text-jade"), children: children }) }), _jsx(HoverCardContent, { align: "start", side: "top", sideOffset: 8, className: "relative p-0 bg-transparent border-0 shadow-none w-64", children: _jsx("div", { "data-state": hoverOpen ? "open" : "closed", className: cn("relative mx-auto origin-center will-change-transform transition-transform duration-300 ease-in-out", hoverAnimateIn
                        ? "scale-y-[0.03]"
                        : hoverOpen
                            ? "scale-y-100"
                            : "scale-y-[0.03]"), style: { transformOrigin: "50% 50%" }, children: _jsxs("div", { className: "flex items-start gap-3 bg-cement/90 p-3 border border-[#2B2A2B] shadow-md rounded-[5px]", children: [isLoading ? (_jsx("div", { className: "w-10 h-10 rounded bg-flash/20 animate-pulse" })) : hoverData?.profileIconId ? (_jsx("img", { src: `${cdnBaseUrl()}/img/profileicon/${hoverData.profileIconId}.png`, alt: "Summoner Icon", className: "w-10 h-10 border border-flash/10" })) : null, _jsxs("div", { className: "flex flex-col text-sm", children: [_jsx("div", { className: "text-white truncate", children: riotId }), isLoading ? (_jsxs("div", { className: "flex flex-col gap-1 mt-1", children: [_jsx("div", { className: "h-4 w-24 bg-flash/20 rounded animate-pulse" }), _jsx("div", { className: "h-3 w-20 bg-flash/10 rounded animate-pulse" })] })) : hoverData ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "text-flash/50 text-xs mt-0.5", children: [hoverData.rank, " \u2013 ", hoverData.lp, " LP"] }), _jsxs("div", { className: "text-xs text-flash/50 mt-0.5", children: [_jsx("span", { className: "text-jade", children: hoverData.wins }), "W /", " ", _jsx("span", { className: "text-[#b11315]", children: hoverData.losses }), "L", " ", totalGames > 0 && (_jsxs("span", { className: "text-flash/60", children: ["(", wr, "%)"] }))] })] })) : (_jsx("div", { className: "text-xs text-flash/50 mt-1", children: "No data" }))] })] }) }) })] }));
}
