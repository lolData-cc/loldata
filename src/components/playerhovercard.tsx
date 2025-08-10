import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
} from "@/components/ui/hover-card";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/config";

type Props = {
    riotId: string;
    championId: number;
    spell1Id?: number;
    spell2Id?: number;
    isCurrentUser?: boolean;
    region: string;
    profileIconId?: number;
    patch?: string;
    championMap: Record<number, string>;
    children: React.ReactNode;
};

type HoverData = {
    rank: string;
    wins: number;
    losses: number;
    lp: number;
    profileIconId: number;
};

export function PlayerHoverCard({
    riotId,
    region,
    profileIconId,
    patch = "15.13.1",
    isCurrentUser = false,
    children,
}: Props) {
    const navigate = useNavigate();

    const [hoverOpen, setHoverOpen] = useState(false);
    const [hoverAnimateIn, setHoverAnimateIn] = useState(false);
    const [hoverData, setHoverData] = useState<HoverData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch automatico quando si apre
    useEffect(() => {
        if (hoverOpen && !hoverData && riotId) {
            const [name, tag] = riotId.split("#");
            setIsLoading(true);

            fetch(`${API_BASE_URL}/api/summoner`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, tag, region }),
            })
                .then((res) => res.json())
                .then((data) => {
                    // Assumiamo che il tuo backend risponda con:
                    // { summoner: { rank, wins, losses, lp } }
                    const summoner = data.summoner;

                    if (summoner) {
                        setHoverData({
                            rank: summoner.rank,
                            wins: summoner.wins,
                            losses: summoner.losses,
                            lp: summoner.lp,
                            profileIconId: summoner.profileIconId,
                        });
                    } else {
                        console.warn("Summoner data not found in response:", data);
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch summoner info", err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [hoverOpen, riotId, region, hoverData]);

    // Animazione iniziale
    useEffect(() => {
        if (hoverOpen && hoverAnimateIn) {
            let id1 = 0;
            let id2 = 0;
            id1 = requestAnimationFrame(() => {
                id2 = requestAnimationFrame(() => setHoverAnimateIn(false));
            });
            return () => {
                cancelAnimationFrame(id1);
                cancelAnimationFrame(id2);
            };
        }
    }, [hoverOpen, hoverAnimateIn]);

    const handleClick = () => {
        if (riotId) {
            const [name, tag] = riotId.split("#");
            navigate(`/summoners/${region}/${name}-${tag}`);
        }
    };

    return (
        <HoverCard
            open={hoverOpen}
            onOpenChange={(v) => {
                if (v) setHoverAnimateIn(true);
                setHoverOpen(v);
            }}
        >
            <HoverCardTrigger asChild>
                <span
                    onClick={handleClick}
                    className={cn(
                        "truncate hover:underline text-flash/50 cursor-clicker",
                        isCurrentUser && "text-jade"
       
                    )}
                >
                    {children}
                </span>
            </HoverCardTrigger>

            <HoverCardContent
                align="center"
                side="top"
                className="relative p-0 bg-transparent border-0 shadow-none w-64"
            >
                <div
                    data-state={hoverOpen ? "open" : "closed"}
                    className={cn(
                        "relative mx-auto origin-center will-change-transform transition-transform duration-300 ease-in-out",
                        hoverAnimateIn
                            ? "scale-y-[0.03]"
                            : hoverOpen
                                ? "scale-y-100"
                                : "scale-y-[0.03]"
                    )}
                    style={{ transformOrigin: "50% 50%" }}
                >
                    <div className="flex items-start gap-3 bg-cement/90 p-3 border border-[#2B2A2B] shadow-md rounded-[5px]">
                        {isLoading ? (
                            <div className="w-10 h-10 rounded bg-flash/20 animate-pulse" />
                        ) : hoverData?.profileIconId ? (
                            <img
                                src={`https://ddragon.leagueoflegends.com/cdn/${patch}/img/profileicon/${hoverData.profileIconId}.png`}
                                alt="Summoner Icon"
                                className="w-10 h-10 border border-flash/10"
                            />
                        ) : null}

                        <div className="flex flex-col text-sm">
                            <div className="text-white">{riotId}</div>

                            {isLoading ? (
                                <div className="flex flex-col gap-1">
                                    <div className="h-4 w-24 bg-flash/20 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-flash/10 rounded animate-pulse" />
                                </div>
                            ) : hoverData ? (
                                <>
                                    <div className="text-flash/50 text-xs">{hoverData.rank} – {hoverData.lp} LP</div>
                                    <div className="text-xs text-flash/50">
                                        <span className="text-jade">{hoverData.wins}</span>W / <span className="text-[#b11315]">{hoverData.losses}</span>L
                                        {" "}({Math.round((hoverData.wins / (hoverData.wins + hoverData.losses)) * 100)}%)
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-flash/50">No data</div>
                            )}
                        </div>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
