import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL, cdnBaseUrl } from "@/config";
import { getRankImage } from "@/utils/rankIcons";
const POLL_INTERVAL = 60_000;
const ROTATE_INTERVAL = 6_500;
export default function OverlayPage() {
    const { region, slug } = useParams();
    const [summonerInfo, setSummonerInfo] = useState(null);
    const [recentMatches, setRecentMatches] = useState([]);
    const [activePanel, setActivePanel] = useState(0);
    const [glitching, setGlitching] = useState(false);
    const sessionStartRef = useRef(Date.now());
    const initialLpRef = useRef(null);
    const initialMatchCountRef = useRef(null);
    const parsed = slug?.includes("-")
        ? { name: slug.split("-").slice(0, -1).join("-").replace(/\+/g, " "), tag: slug.split("-").pop() }
        : { name: slug ?? "", tag: region?.toUpperCase() ?? "" };
    const fetchData = useCallback(async () => {
        try {
            const sumRes = await fetch(`${API_BASE_URL}/api/summoner`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: parsed.name, tag: parsed.tag, region: region?.toUpperCase() }),
            });
            if (sumRes.ok) {
                const data = await sumRes.json();
                setSummonerInfo(data.summoner);
                // Track initial LP on first load
                if (initialLpRef.current === null && data.summoner?.lp != null) {
                    initialLpRef.current = data.summoner.lp;
                }
            }
            const matchRes = await fetch(`${API_BASE_URL}/api/matches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: parsed.name, tag: parsed.tag, region: region?.toUpperCase(), offset: 0, limit: 10 }),
            });
            if (matchRes.ok) {
                const mData = await matchRes.json();
                const matches = (mData.matches ?? []).map((m) => {
                    const me = m.match?.info?.participants?.find((p) => p.puuid === summonerInfo?.puuid);
                    const ts = m.match?.info?.gameEndTimestamp ?? m.match?.info?.gameStartTimestamp ?? m.match?.info?.gameCreation ?? 0;
                    return {
                        championName: me?.championName ?? m.championName ?? "Unknown",
                        win: !!m.win,
                        ts,
                    };
                });
                setRecentMatches(matches);
                // Track initial match count on first load
                if (initialMatchCountRef.current === null) {
                    initialMatchCountRef.current = matches.length;
                }
            }
        }
        catch (err) {
            console.error("Overlay fetch error:", err);
        }
    }, [region, slug, summonerInfo?.puuid]);
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [region, slug]);
    // Panel rotation with glitch effect
    const PANEL_COUNT = 3;
    useEffect(() => {
        const interval = setInterval(() => {
            setGlitching(true);
            setTimeout(() => {
                setActivePanel(prev => (prev + 1) % PANEL_COUNT);
                setTimeout(() => setGlitching(false), 150);
            }, 200);
        }, ROTATE_INTERVAL);
        return () => clearInterval(interval);
    }, []);
    const rank = summonerInfo?.rank ?? "Unranked";
    const lp = summonerInfo?.lp ?? 0;
    const totalWins = summonerInfo?.wins ?? 0;
    const totalLosses = summonerInfo?.losses ?? 0;
    const totalGames = totalWins + totalLosses;
    const wr = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const regionLabel = (region ?? "").toUpperCase();
    // Session stats: games played since overlay started
    const sessionMatches = recentMatches.filter(m => m.ts >= sessionStartRef.current);
    const sessionWins = sessionMatches.filter(m => m.win).length;
    const sessionLosses = sessionMatches.filter(m => !m.win).length;
    const sessionTotal = sessionWins + sessionLosses;
    const sessionWr = sessionTotal > 0 ? Math.round((sessionWins / sessionTotal) * 100) : 0;
    const lpDelta = initialLpRef.current !== null ? lp - initialLpRef.current : 0;
    if (!summonerInfo) {
        return (_jsx("div", { className: "w-[460px] h-[130px] flex items-center justify-center", style: { background: "transparent" }, children: _jsx("div", { className: "w-5 h-5 border-2 border-[#00d992]/30 border-t-[#00d992] rounded-full animate-spin" }) }));
    }
    return (_jsxs("div", { className: "w-[460px] relative select-none", style: { background: "transparent", fontFamily: "'JetBrains Mono', monospace" }, children: [_jsx("style", { children: `
        html, body, #root { background: transparent !important; }
      ` }), _jsx("style", { children: `
        @keyframes overlayGlitch {
          0% { transform: translate(0); filter: none; }
          10% { transform: translate(-2px, 1px) skewX(-2deg); filter: hue-rotate(40deg) saturate(2); }
          20% { transform: translate(3px, -1px); clip-path: inset(20% 0 30% 0); }
          30% { transform: translate(-1px, 2px) skewX(1deg); filter: hue-rotate(-20deg); }
          40% { transform: translate(2px, -2px); clip-path: inset(50% 0 10% 0); }
          50% { transform: translate(0); filter: none; clip-path: none; }
          100% { transform: translate(0); filter: none; }
        }
        .overlay-glitch {
          animation: overlayGlitch 0.35s ease-out;
        }
        @keyframes scanDown {
          from { top: -2px; }
          to { top: 100%; }
        }
      ` }), _jsxs("div", { className: "relative overflow-hidden", style: { background: "rgba(4,10,14,0.85)" }, children: [_jsx("svg", { className: "absolute top-0 left-0 w-full", height: "3", viewBox: "0 0 460 3", preserveAspectRatio: "none", children: _jsx("path", { d: "M0,3 L0,1 L15,1 L20,0 L440,0 L445,1 L460,1 L460,3", fill: "none", stroke: "rgba(0,217,146,0.45)", strokeWidth: "1" }) }), _jsx("svg", { className: "absolute bottom-0 left-0 w-full", height: "3", viewBox: "0 0 460 3", preserveAspectRatio: "none", children: _jsx("path", { d: "M0,0 L0,2 L10,2 L15,3 L340,3 L345,2 L460,2 L460,0", fill: "none", stroke: "rgba(0,217,146,0.25)", strokeWidth: "1" }) }), _jsx("div", { className: "absolute inset-0 pointer-events-none opacity-[0.02]", style: { background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,217,146,0.5) 2px, rgba(0,217,146,0.5) 3px)" } }), glitching && (_jsx("div", { className: "absolute left-0 right-0 h-[2px] z-50 pointer-events-none", style: { background: "linear-gradient(90deg, transparent, rgba(0,217,146,0.6), transparent)", animation: "scanDown 0.3s linear" } })), _jsxs("div", { className: "relative z-10 flex items-center px-4 py-3 gap-1.5", children: [_jsxs("div", { className: "shrink-0 flex flex-col items-center gap-1 overflow-visible", children: [_jsx("img", { src: rank !== "Unranked" ? getRankImage(rank) : "/img/unranked.png", alt: "", className: "w-32 h-32 object-contain drop-shadow-[0_0_12px_rgba(0,217,146,0.15)] -my-5" }), rank !== "Unranked" && (() => {
                                        const parts = rank.split(" ");
                                        const tier = parts[0];
                                        const division = parts[1] ?? "";
                                        const isApex = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(tier.toUpperCase());
                                        return (_jsxs("div", { className: "flex flex-col items-center", children: [!isApex && division && (_jsxs("span", { className: "text-[10px] text-[#E8EEF2]/50 tracking-[0.15em] uppercase", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 600 }, children: [tier, " ", division] })), _jsxs("span", { className: "text-[11px] text-[#00d992]/60 tracking-[0.1em] tabular-nums", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }, children: [lp, " LP"] })] }));
                                    })()] }), _jsxs("div", { className: `flex-1 min-w-0 min-h-[90px] flex flex-col justify-center ${glitching ? "overlay-glitch" : ""}`, children: [activePanel === 0 && (
                                    /* Panel 1: Summoner info */
                                    _jsxs("div", { children: [_jsx("span", { className: "text-[16px] text-[#E8EEF2]/90 tracking-wide leading-none block", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 600 }, children: summonerInfo.name }), _jsxs("span", { className: "text-[11px] text-[#E8EEF2]/25 tracking-[0.1em] leading-none mt-1 block", children: ["#", summonerInfo.tag] }), _jsx("div", { className: "h-px mt-2.5 mb-2", style: { background: "linear-gradient(90deg, rgba(0,217,146,0.2), rgba(232,238,242,0.04) 60%, transparent)" } }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[9px] text-[#E8EEF2]/20 tracking-[0.15em] uppercase", children: "Games" }), _jsx("span", { className: "text-[13px] text-[#E8EEF2]/60 tabular-nums", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }, children: totalGames })] }), _jsx("span", { className: "text-[#00d992]/20 text-[6px]", children: "\u25C8" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[9px] text-[#E8EEF2]/20 tracking-[0.15em] uppercase", children: "WR" }), _jsxs("span", { className: `text-[13px] tabular-nums ${wr >= 55 ? "text-[#00d992]" : wr < 45 ? "text-[#f87171]/70" : "text-[#E8EEF2]/50"}`, style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }, children: [wr, "%"] })] }), _jsx("span", { className: "text-[#00d992]/20 text-[6px]", children: "\u25C8" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[9px] text-[#E8EEF2]/20 tracking-[0.15em] uppercase", children: "Region" }), _jsx("span", { className: "text-[12px] text-[#00d992]/50 tracking-[0.1em]", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 600 }, children: regionLabel })] })] })] })), activePanel === 1 && (
                                    /* Panel 2: Last 10 matches */
                                    _jsxs("div", { children: [_jsx("span", { className: "text-[16px] text-[#E8EEF2]/90 tracking-wide leading-none block mb-3", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 600 }, children: "LAST 10 GAMES" }), _jsx("div", { className: "flex", style: { gap: "1.5px" }, children: recentMatches.length === 0 ? (_jsx("span", { className: "text-[10px] text-[#E8EEF2]/20", children: "No recent matches" })) : (recentMatches.map((m, i) => (_jsxs("div", { className: "relative w-[34px] h-[38px] overflow-hidden", style: {
                                                        clipPath: "polygon(20% 0, 100% 0, 80% 100%, 0 100%)",
                                                    }, children: [_jsx("div", { className: "absolute top-0 left-0 right-0 h-[2px] z-10", style: { background: m.win ? "rgba(0,217,146,0.8)" : "rgba(248,113,113,0.7)" } }), _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${m.championName}.png`, alt: "", className: "absolute inset-0 w-full h-full object-cover", style: { transform: "scale(1.3)" }, onError: (e) => { e.target.src = `${cdnBaseUrl()}/img/profileicon/29.png`; } }), _jsx("div", { className: "absolute inset-0 z-10", style: { background: m.win ? "rgba(0,217,146,0.08)" : "rgba(248,113,113,0.1)" } }), _jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[2px] z-10", style: { background: m.win ? "rgba(0,217,146,0.8)" : "rgba(248,113,113,0.7)" } })] }, i)))) })] })), activePanel === 2 && (
                                    /* Panel 3: Session stats */
                                    _jsxs("div", { children: [_jsx("span", { className: "text-[16px] text-[#E8EEF2]/90 tracking-wide leading-none block", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 600 }, children: "THIS SESSION" }), _jsx("div", { className: "h-px mt-2.5 mb-2.5", style: { background: "linear-gradient(90deg, rgba(0,217,146,0.2), rgba(232,238,242,0.04) 60%, transparent)" } }), sessionTotal === 0 ? (_jsx("span", { className: "text-[10px] text-[#E8EEF2]/20 tracking-[0.2em] uppercase", children: "No games this session" })) : (_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-baseline gap-1.5", children: [_jsx("span", { className: "text-[20px] text-[#00d992] tabular-nums", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }, children: sessionWins }), _jsx("span", { className: "text-[10px] text-[#E8EEF2]/20 uppercase", children: "W" }), _jsx("span", { className: "text-[20px] text-[#f87171]/70 tabular-nums", style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }, children: sessionLosses }), _jsx("span", { className: "text-[10px] text-[#E8EEF2]/20 uppercase", children: "L" })] }), _jsx("span", { className: "text-[#00d992]/15 text-[6px]", children: "\u25C8" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[9px] text-[#E8EEF2]/20 tracking-[0.15em] uppercase", children: "WR" }), _jsxs("span", { className: `text-[14px] tabular-nums ${sessionWr >= 55 ? "text-[#00d992]" : sessionWr < 45 ? "text-[#f87171]/70" : "text-[#E8EEF2]/50"}`, style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }, children: [sessionWr, "%"] })] }), _jsx("span", { className: "text-[#00d992]/15 text-[6px]", children: "\u25C8" }), _jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "text-[9px] text-[#E8EEF2]/20 tracking-[0.15em] uppercase", children: "LP" }), _jsxs("span", { className: `text-[14px] tabular-nums ${lpDelta > 0 ? "text-[#00d992]" : lpDelta < 0 ? "text-[#f87171]/70" : "text-[#E8EEF2]/40"}`, style: { fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }, children: [lpDelta > 0 ? "+" : "", lpDelta] })] })] }))] }))] }), _jsx("div", { className: "absolute top-2.5 right-4 opacity-25", children: _jsx("span", { className: "text-[7px] text-[#00d992] tracking-[0.2em] uppercase", style: { fontFamily: "'JetBrains Mono', monospace" }, children: "LOLDATA.CC" }) })] })] })] }));
}
