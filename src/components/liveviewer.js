import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Dialog, DialogContent, DialogTrigger, } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { getRankImage } from "@/utils/rankIcons";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import queueMap from "@/converters/queueMap";
const ROLES = ["top", "jungle", "mid", "bot", "support"];
const ROLE_ICON = {
    top: RoleTopIcon,
    jungle: RoleJungleIcon,
    mid: RoleMidIcon,
    bot: RoleAdcIcon,
    support: RoleSupportIcon,
};
// pointy-top hexagon — Valorant HP-hex silhouette
const HEX = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";
// ── HUD choreography: helmet sway + visor depth ─────────────────────
// The 3D is SELF-CONTAINED per element (transform: perspective(...) rotateY)
// — a `perspective` property on an ancestor only reaches direct children, and
// the flex wrapper in between was silently flattening the whole HUD. Columns
// curve toward the centre, and every plate leans a little further on its own,
// like cards resting on a helmet visor. Type ≥10px (rank 15px bold) keeps the
// composited tilt readable.
const HUD_CSS = `
.lvh-sway { animation: lvhSway 7s ease-in-out infinite; }
@keyframes lvhSway { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.lvh-col-l { transform: perspective(1100px) rotateY(11deg); transform-origin: 100% 50%; }
.lvh-col-r { transform: perspective(1100px) rotateY(-11deg); transform-origin: 0% 50%; }
.lvh-in { animation: lvhIn 480ms cubic-bezier(0.22,1,0.36,1) both; }
@keyframes lvhIn { from { opacity: 0; transform: translateX(var(--lvh-from, -18px)); } to { opacity: 1; transform: translateX(0); } }
.lvh-head { animation: lvhHead 500ms cubic-bezier(0.22,1,0.36,1) both; }
@keyframes lvhHead { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
@media (max-width: 1023px) {
  .lvh-col-l, .lvh-col-r, .lvh-tilt { transform: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  .lvh-sway, .lvh-in, .lvh-head { animation: none !important; }
}
`;
// Self-contained 1s clock — isolated so the tick never re-renders the HUD.
function ElapsedClock({ startTime }) {
    const [elapsed, setElapsed] = useState("");
    useEffect(() => {
        if (!startTime) {
            setElapsed("");
            return;
        }
        const tick = () => {
            const secs = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            setElapsed(`${m}:${s.toString().padStart(2, "0")}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTime]);
    if (!elapsed)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-red-400/20 text-[10px]", children: "\u25C8" }), _jsx("span", { className: "font-orbitron text-[16px] tracking-wider text-flash/85 tabular-nums", style: { textShadow: "0 0 14px rgba(215,216,217,0.15)" }, children: elapsed })] }));
}
// ── Hex portrait: layered clip-path (glow ring → dark rim → art) ────
function HexPortrait({ champ, side, focused, role, otp, filled }) {
    const ring = focused
        ? "rgba(0,217,146,0.95)"
        : side === "blue" ? "rgba(91,168,230,0.8)" : "rgba(224,80,63,0.8)";
    const glow = focused
        ? "drop-shadow(0 0 14px rgba(0,217,146,0.6))"
        : side === "blue" ? "drop-shadow(0 0 10px rgba(91,168,230,0.35))" : "drop-shadow(0 0 10px rgba(224,80,63,0.35))";
    const RoleIcon = role ? ROLE_ICON[role] : null;
    return (_jsxs("div", { className: "relative h-[74px] w-[74px] shrink-0", children: [_jsxs("span", { "aria-hidden": true, className: "absolute inset-0 block", style: { filter: glow }, children: [_jsx("span", { "aria-hidden": true, className: "absolute inset-0", style: { clipPath: HEX, background: ring } }), _jsx("span", { "aria-hidden": true, className: "absolute inset-[2px]", style: { clipPath: HEX, background: "#050C0E" } }), _jsx("span", { "aria-hidden": true, className: "absolute inset-[4px] overflow-hidden", style: { clipPath: HEX }, children: champ ? (_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${champ}.png`, alt: "", className: "h-full w-full scale-[1.12] object-cover", draggable: false })) : (_jsx("span", { className: "block h-full w-full bg-filmdark" })) })] }), RoleIcon && (_jsx("span", { className: "absolute -bottom-1 left-1/2 z-10 grid h-[18px] w-[18px] -translate-x-1/2 place-items-center rounded-full bg-liquirice/95 shadow-[0_0_0_1px_rgba(215,216,217,0.18)]", children: _jsx(RoleIcon, { className: "h-[11px] w-[11px]" }) })), (otp || filled) && (_jsxs("span", { className: "absolute top-[1px] left-1/2 z-10 flex -translate-x-1/2 gap-1", children: [otp && (_jsx("span", { className: "font-jetbrains font-semibold text-[9px] tracking-[0.1em] px-1.5 py-[2px] rounded-[2px] leading-none whitespace-nowrap bg-liquirice text-jade shadow-[0_0_0_1px_rgba(0,217,146,0.6),0_0_10px_rgba(0,217,146,0.35)]", children: "OTP" })), filled && (_jsx("span", { className: "font-jetbrains font-semibold text-[9px] tracking-[0.1em] px-1.5 py-[2px] rounded-[2px] leading-none whitespace-nowrap bg-liquirice text-citrine shadow-[0_0_0_1px_rgba(255,182,21,0.55)]", children: "FILLED" }))] }))] }));
}
// ── PHONE row: dead-simple — champ, name, rank, two numbers ─────────
function MobileRow({ p, side, role, focusedRiotId, rank, pStats, championMap, onGoToPlayer }) {
    const isFocused = p.riotId === focusedRiotId;
    const isStreamerMode = !rank?.rank || rank.rank.toLowerCase() === "error";
    const raw = (p.riotId || p.summonerName || "").trim();
    const displayName = raw.split("#")[0]?.trim();
    const hidden = !displayName || raw.toLowerCase().includes("error");
    const champWr = pStats?.championWinrate ?? null;
    const hasChampData = champWr != null && (pStats?.championGames ?? 0) > 0;
    const totalGames = (rank?.wins ?? 0) + (rank?.losses ?? 0);
    const totalWr = !isStreamerMode && totalGames > 0 ? Math.round(((rank?.wins ?? 0) / totalGames) * 100) : null;
    const wrCol = (v) => (v >= 60 ? "#00d992" : v < 45 ? "#fb7185" : "rgba(215,216,217,0.85)");
    const RoleIcon = role ? ROLE_ICON[role] : null;
    return (_jsxs("div", { className: cn("flex items-center gap-2.5 rounded-[4px] px-2 py-[5px]", isFocused ? "bg-jade/[0.08] ring-1 ring-jade/25" : "bg-flash/[0.03]"), children: [_jsxs("div", { className: "relative shrink-0", children: [_jsx("img", { src: championMap[p.championId] ? `${cdnBaseUrl()}/img/champion/${championMap[p.championId]}.png` : undefined, alt: "", className: cn("h-9 w-9 rounded-[4px] ring-1", isFocused ? "ring-jade/70" : side === "blue" ? "ring-[#5BA8E6]/40" : "ring-[#e0503f]/40"), draggable: false }), RoleIcon && (_jsx("span", { className: "absolute -bottom-1 -right-1 grid h-[14px] w-[14px] place-items-center rounded-full bg-liquirice/95 shadow-[0_0_0_1px_rgba(215,216,217,0.18)]", children: _jsx(RoleIcon, { className: "h-[8px] w-[8px]" }) }))] }), _jsx("div", { className: "min-w-0 flex-1 leading-none", children: hidden || isStreamerMode ? (_jsx("span", { className: "inline-block font-orbitron text-[7.5px] font-bold uppercase tracking-[0.16em] px-1.5 py-[2px] rounded-[2px] border border-flash/15 whitespace-nowrap", style: { background: "linear-gradient(135deg, rgba(155,89,182,0.15), rgba(168,85,199,0.08))", color: "rgba(168,85,199,0.8)" }, children: "Streamer mode" })) : (_jsxs(_Fragment, { children: [_jsx("span", { onClick: () => p.riotId && onGoToPlayer(p.riotId), className: cn("block truncate font-chakrapetch text-[12.5px] font-semibold tracking-wide cursor-clicker", isFocused ? "text-jade" : "text-flash/90"), children: displayName }), _jsxs("span", { className: "mt-[4px] block truncate font-jetbrains text-[9px] tabular-nums text-flash/45", children: [totalWr != null && _jsxs(_Fragment, { children: ["WR ", _jsxs("span", { style: { color: wrCol(totalWr) }, className: "font-semibold", children: [totalWr, "%"] })] }), hasChampData && _jsxs(_Fragment, { children: ["  ", "CH ", _jsxs("span", { style: { color: wrCol(champWr) }, className: "font-semibold", children: [champWr, "%"] })] }), pStats?.championKda != null && _jsxs(_Fragment, { children: ["  ", "KDA ", _jsx("span", { className: "text-flash/70 font-semibold", children: pStats.championKda.toFixed(1) })] })] })] })) }), !isStreamerMode && rank?.rank && (_jsxs("div", { className: "flex shrink-0 items-center gap-1.5", children: [_jsx("img", { src: getRankImage(rank.rank), alt: "", className: "h-[20px] w-[20px] object-contain", draggable: false }), _jsxs("div", { className: "flex flex-col items-end leading-none", children: [_jsx("span", { className: "whitespace-nowrap font-chakrapetch text-[10px] font-bold uppercase text-flash/85", children: rank.rank }), rank.lp != null && (_jsxs("span", { className: "mt-[3px] whitespace-nowrap font-chakrapetch text-[11px] font-bold tabular-nums text-jade", children: [rank.lp, " LP"] }))] })] }))] }));
}
// ── One floating player plate — hex + game-ui info wing ─────────────
function PlayerPlate({ p, side, idx, focusedRiotId, rank, pStats, championMap, onGoToPlayer }) {
    const isFocused = p.riotId === focusedRiotId;
    const isStreamerMode = !rank?.rank || rank.rank.toLowerCase() === "error";
    const mirror = side === "red";
    const raw = (p.riotId || p.summonerName || "").trim();
    const displayName = raw.split("#")[0]?.trim();
    const hidden = !displayName || raw.toLowerCase().includes("error");
    const champGames = pStats?.championGames ?? 0;
    const champWr = pStats?.championWinrate ?? null;
    const hasChampData = champWr != null && champGames > 0;
    const champKda = pStats?.championKda ?? null;
    const isFilled = (pStats?.isFilled ?? false) && !isStreamerMode;
    const wrColor = !hasChampData ? "rgba(215,216,217,0.25)"
        : (champWr >= 60 ? "#00d992" : champWr < 45 ? "#fb7185" : "rgba(215,216,217,0.75)");
    // OTP read: ≥70% of their season games are on THIS champion (min sample so
    // a 2-games account doesn't read as one-trick)
    const seasonG = pStats?.seasonGames ?? 0;
    const isOtp = !isStreamerMode && seasonG >= 10 && champGames / seasonG >= 0.7;
    // total ranked winrate — the focus of the stat line
    const totalGames = (rank?.wins ?? 0) + (rank?.losses ?? 0);
    const totalWr = !isStreamerMode && totalGames > 0 ? Math.round(((rank?.wins ?? 0) / totalGames) * 100) : null;
    const totalWrColor = totalWr == null ? "rgba(215,216,217,0.4)"
        : totalWr >= 60 ? "#00d992" : totalWr < 45 ? "#fb7185" : "rgba(215,216,217,0.92)";
    const rankStr = rank?.rank ?? "";
    return (
    // outer keeps the STATIC arc offset + per-plate lean, with its own
    // perspective() so the tilt is guaranteed to render in real 3D; the
    // entrance animation lives on the inner .lvh-in wrapper so its
    // fill-mode never clobbers this transform.
    _jsx("div", { className: "lvh-tilt", style: { transform: `translateX(${(mirror ? -1 : 1) * [0, 8, 13, 8, 0][idx]}px) perspective(750px) rotateY(${mirror ? -8 : 8}deg)` }, children: _jsxs("div", { className: cn("lvh-in flex items-center", mirror && "flex-row-reverse"), style: {
                ["--lvh-from"]: mirror ? "18px" : "-18px",
                animationDelay: `${120 + idx * 70}ms`,
            }, children: [_jsx(HexPortrait, { champ: championMap[p.championId], side: side, focused: isFocused, role: ROLES[idx], otp: isOtp, filled: isFilled }), _jsxs("div", { className: cn("flex min-w-0 flex-col gap-[3px]", mirror ? "mr-3.5 items-end text-right" : "ml-3.5"), children: [_jsx("div", { className: cn("flex items-center gap-2", mirror && "flex-row-reverse"), children: hidden || isStreamerMode ? (_jsx("span", { className: "font-orbitron text-[8px] font-bold uppercase tracking-[0.18em] px-1.5 py-[2px] rounded-[2px] border border-flash/15 whitespace-nowrap", style: {
                                    background: "linear-gradient(135deg, rgba(155,89,182,0.15), rgba(168,85,199,0.08))",
                                    color: "rgba(168,85,199,0.8)",
                                }, children: "Streamer mode" })) : (_jsx("span", { onClick: () => p.riotId && onGoToPlayer(p.riotId), className: cn("cursor-clicker truncate font-chakrapetch text-[13px] font-semibold tracking-wide transition-colors hover:underline max-w-[190px]", isFocused ? "text-jade" : "text-flash/80 hover:text-flash/100"), style: { textShadow: "0 1px 8px rgba(0,0,0,0.8)" }, children: hidden ? "hidden" : displayName })) }), !isStreamerMode ? (_jsxs("div", { className: cn("flex items-center gap-2", mirror && "flex-row-reverse"), children: [_jsx("img", { src: getRankImage(rankStr), alt: "", className: "h-[24px] w-[24px] object-contain", draggable: false }), _jsx("span", { className: "whitespace-nowrap font-chakrapetch text-[15px] font-bold uppercase tracking-wide text-flash/95", style: { textShadow: "0 1px 10px rgba(0,0,0,0.85)" }, children: rankStr }), rank?.lp != null && (_jsxs("span", { className: "whitespace-nowrap font-chakrapetch text-[13px] font-bold tabular-nums text-jade", style: { textShadow: "0 0 12px rgba(0,217,146,0.45)" }, children: [rank.lp, " LP"] }))] })) : (_jsx("div", { className: "flex h-[24px] items-center", children: _jsx("span", { className: "font-chakrapetch text-[12px] font-bold tracking-wide text-flash/25", children: "\u2014 DATA HIDDEN \u2014" }) })), !isStreamerMode && (_jsxs("div", { className: cn("flex items-baseline gap-3.5", mirror && "flex-row-reverse"), children: [totalWr != null && (_jsxs("span", { className: "flex items-baseline gap-1.5 whitespace-nowrap", children: [_jsx("span", { className: "font-jetbrains text-[8px] uppercase tracking-[0.18em] text-flash/40", children: "WR" }), _jsxs("span", { className: "font-chakrapetch text-[14px] font-bold tabular-nums", style: { color: totalWrColor, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }, children: [totalWr, "%"] })] })), hasChampData && (_jsxs("span", { className: "flex items-baseline gap-1.5 whitespace-nowrap", children: [_jsx("span", { className: "font-jetbrains text-[8px] uppercase tracking-[0.18em] text-flash/40", children: "Champ" }), _jsxs("span", { className: "font-chakrapetch text-[11.5px] font-semibold tabular-nums", style: { color: wrColor }, children: [champWr, "%"] })] })), champKda != null && (_jsxs("span", { className: "flex items-baseline gap-1.5 whitespace-nowrap", children: [_jsx("span", { className: "font-jetbrains text-[8px] uppercase tracking-[0.18em] text-flash/40", children: "KDA" }), _jsx("span", { className: "font-chakrapetch text-[11.5px] font-semibold tabular-nums text-flash/75", children: champKda.toFixed(1) })] }))] }))] })] }) }));
}
export function LiveViewer({ puuid, riotId, region, controlledOpen, onControlledOpenChange }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = typeof controlledOpen === "boolean";
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onControlledOpenChange : setInternalOpen;
    const [championMap, setChampionMap] = useState({});
    const [game, setGame] = useState(null);
    const [ranks, setRanks] = useState({});
    const navigate = useNavigate();
    const [orderedTeams, setOrderedTeams] = useState({ 100: {}, 200: {} });
    const [liveStats, setLiveStats] = useState({});
    useEffect(() => {
        if (!open)
            return;
        const fetchGameAndChamps = async () => {
            try {
                const gameRes = await fetch(`${API_BASE_URL}/api/livegame`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ puuid, region }),
                });
                const gameData = await (gameRes.status === 204 ? null : gameRes.json());
                // Assigned role per riotId — needed by the stats endpoint for a correct
                // FILL detection (an empty role used to make everyone look autofilled).
                const roleByRiotId = {};
                if (gameData?.game) {
                    setGame(gameData.game);
                    const riotIds = gameData.game.participants.map((p) => p.riotId);
                    const rankRes = await fetch(`${API_BASE_URL}/api/multirank`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ riotIds, region }),
                    });
                    const rankData = await rankRes.json();
                    const rankMap = {};
                    rankData.ranks.forEach((r) => {
                        rankMap[r.riotId] = { rank: r.rank, wins: r.wins, losses: r.losses, lp: r.lp };
                    });
                    setRanks(rankMap);
                    const rolesRes = await fetch(`${API_BASE_URL}/api/assignroles`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ participants: gameData.game.participants }),
                    });
                    const rolesData = await rolesRes.json();
                    setOrderedTeams({ 100: rolesData.roles[100], 200: rolesData.roles[200] });
                    for (const teamId of [100, 200]) {
                        for (const [role, pl] of Object.entries(rolesData.roles[teamId] ?? {})) {
                            const rid = pl?.riotId;
                            if (rid)
                                roleByRiotId[rid] = role;
                        }
                    }
                }
                const champRes = await fetch(`${cdnBaseUrl()}/data/en_US/champion.json`);
                const champData = await champRes.json();
                // Store champ.id (the DDragon id) rather than champ.name. The id IS the
                // asset filename and it is also what the box stores in
                // participants.champion_name, so the icon URL and the stats lookup both
                // stop depending on guessing a filename from a display name.
                //
                // formatChampName() did that guessing and got six champions wrong:
                // K'Sante -> Ksante (file is KSante), Kog'Maw -> Kogmaw (KogMaw),
                // Rek'Sai -> Reksai (RekSai), Wukong -> Wukong (MonkeyKing),
                // Renata Glasc -> RenataGlasc (Renata), Nunu & Willump -> Nunu&Willump.
                const idToName = {};
                Object.values(champData.data).forEach((champ) => {
                    idToName[parseInt(champ.key)] = champ.id;
                });
                setChampionMap(idToName);
                // Champion winrate/KDA + filled detection from our DB
                if (gameData?.game) {
                    try {
                        const statsParticipants = [];
                        for (const p of gameData.game.participants) {
                            if (p.riotId) {
                                statsParticipants.push({
                                    riotId: p.riotId,
                                    championName: idToName[p.championId] ?? "",
                                    role: roleByRiotId[p.riotId] ?? "",
                                });
                            }
                        }
                        if (statsParticipants.length > 0) {
                            const statsRes = await fetch(`${API_BASE_URL}/api/livegame/stats`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ participants: statsParticipants, region }),
                            });
                            if (statsRes.ok) {
                                const statsData = await statsRes.json();
                                if (statsData?.stats)
                                    setLiveStats(statsData.stats);
                            }
                        }
                    }
                    catch (e) {
                        console.error("Failed to fetch livegame stats:", e);
                    }
                }
            }
            catch (err) {
                console.error(err);
            }
        };
        fetchGameAndChamps();
    }, [open, puuid]);
    const goToPlayer = (rid) => {
        setOpen(false);
        const [riotName, riotTag] = rid.split("#");
        navigate(`/summoners/${region}/${riotName.replace(/\s+/g, "+")}-${riotTag}`);
    };
    const teamPlayers = (teamId) => ROLES.map(role => orderedTeams[teamId][role]).filter(Boolean);
    const queueName = game?.gameQueueConfigId ? (queueMap[game.gameQueueConfigId] || game.gameType) : game?.gameType;
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [!isControlled && (_jsx(DialogTrigger, { className: "absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 cursor-clicker group", children: _jsxs("div", { className: "flex items-center gap-1.5 px-3 py-1 rounded-sm font-mono text-[10px] font-bold tracking-[0.2em] uppercase transition-all group-hover:brightness-125 bg-red-500 text-white shadow-[0_0_16px_rgba(239,68,68,0.6),0_0_4px_rgba(239,68,68,0.8)]", children: [_jsx("span", { className: "w-[6px] h-[6px] rounded-full bg-white animate-pulse" }), "Live"] }) })), _jsxs(DialogContent, { overlayClassName: "bg-[#020608]/85 backdrop-blur-md", className: "flex flex-col w-full max-w-full h-[100dvh] max-h-[100dvh] overflow-hidden left-0 translate-x-0 top-0 translate-y-0 px-3 pt-3 pb-4 lg:block lg:w-auto lg:max-w-[1380px] lg:h-auto lg:max-h-none lg:overflow-visible lg:left-[50%] lg:translate-x-[-50%] lg:top-[10%] lg:px-0 lg:pt-0 lg:pb-0 bg-transparent border-none text-flash [&>button:last-child]:hidden shadow-none", children: [_jsx("style", { children: HUD_CSS }), _jsx("button", { type: "button", onClick: () => setOpen(false), "aria-label": "Close live game", className: "lg:hidden absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-[4px] bg-flash/[0.08] text-flash/80 active:bg-flash/[0.15] cursor-clicker", children: _jsx("span", { className: "text-[15px] leading-none", children: "\u2715" }) }), _jsxs("div", { className: "lg:hidden flex min-h-0 flex-1 flex-col", children: [_jsxs("div", { className: "flex items-center justify-center gap-3 pb-2 pt-1", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]" }), _jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.2em] text-red-400/80", children: "Live" })] }), _jsx(ElapsedClock, { startTime: game?.gameStartTime }), queueName && _jsx("span", { className: "font-jetbrains text-[9px] uppercase tracking-[0.14em] text-flash/35 truncate max-w-[120px]", children: queueName })] }), _jsx("div", { className: "flex min-h-0 flex-1 flex-col justify-center gap-3", children: ([
                                    { id: 100, side: "blue", label: "Blue side", color: "text-[#5BA8E6]/75" },
                                    { id: 200, side: "red", label: "Red side", color: "text-[#e0503f]/80" },
                                ]).map((t) => (_jsxs("div", { children: [_jsxs("div", { className: cn("mb-1 font-jetbrains text-[8.5px] uppercase tracking-[0.24em]", t.color), children: ["\u25C8 ", t.label] }), _jsx("div", { className: "flex flex-col gap-[5px]", children: teamPlayers(t.id).map((p, idx) => (_jsx(MobileRow, { p: p, side: t.side, role: ROLES[idx], focusedRiotId: riotId, rank: ranks[p.riotId], pStats: liveStats[p.riotId], championMap: championMap, onGoToPlayer: goToPlayer }, p.summonerName || p.riotId || idx))) })] }, t.id))) })] }), _jsxs("div", { className: "lvh-sway hidden lg:block", style: { perspective: "1000px" }, children: [_jsxs("div", { className: "lvh-head mb-9 flex items-center justify-center gap-4", style: { transform: "rotateX(9deg)" }, children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" }), _jsx("span", { className: "font-jetbrains text-[10px] uppercase tracking-[0.24em] text-red-400/80", children: "Live Game" })] }), _jsx(ElapsedClock, { startTime: game?.gameStartTime }), queueName && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-red-400/20 text-[10px]", children: "\u25C8" }), _jsx("span", { className: "font-jetbrains text-[10px] uppercase tracking-[0.18em] text-flash/35", children: queueName })] }))] }), _jsxs("div", { className: "flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-center lg:gap-32", children: [_jsxs("div", { className: "lvh-col-l flex flex-col gap-4", children: [_jsx("span", { className: "lvh-in font-jetbrains text-[9px] uppercase tracking-[0.26em] text-[#5BA8E6]/70", style: { ["--lvh-from"]: "-18px" }, children: "\u25C8 Blue side" }), teamPlayers(100).map((p, idx) => (_jsx(PlayerPlate, { p: p, side: "blue", idx: idx, focusedRiotId: riotId, rank: ranks[p.riotId], pStats: liveStats[p.riotId], championMap: championMap, onGoToPlayer: goToPlayer }, p.summonerName || p.riotId || idx)))] }), _jsxs("div", { className: "lvh-col-r flex flex-col items-end gap-4", children: [_jsx("span", { className: "lvh-in font-jetbrains text-[9px] uppercase tracking-[0.26em] text-[#e0503f]/75", style: { ["--lvh-from"]: "18px" }, children: "Red side \u25C8" }), teamPlayers(200).map((p, idx) => (_jsx(PlayerPlate, { p: p, side: "red", idx: idx, focusedRiotId: riotId, rank: ranks[p.riotId], pStats: liveStats[p.riotId], championMap: championMap, onGoToPlayer: goToPlayer }, p.summonerName || p.riotId || idx)))] })] })] })] })] }));
}
