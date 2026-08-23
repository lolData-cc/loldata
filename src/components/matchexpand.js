import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// matchexpand.tsx — inline expanded scoreboard for a match card.
//
// Clicking a match card on the summoner page slides this panel out from under
// the card (height-collapse drawer). Views: BUILD (default) / STATS as 5v5
// rows, and DETAILS — a per-player deep dive with the item purchase timeline,
// skill order and the full rune trees, driven by a lobby champion selector.
// The match tools (VIEW / SCAN / ASK AI / REPLAY) are pinned to the footer.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName, summonerSpellUrl, PERK_CDN } from "@/config";
import { getKeystoneIcon, getStyleIcon } from "@/constants/runes";
import { getRuneName, useRuneTrees } from "@/constants/runeData";
import { useMatchTimeline } from "@/components/matchreplay/timelineApi";
import { computeImpact, impactTone } from "@/utils/impact";
import { badgeKey } from "@/lib/proBadges";
const QUEUE_LABEL = {
    420: "Ranked Solo/Duo",
    440: "Ranked Flex",
    480: "Swiftplay",
    400: "Normal Draft",
    430: "Normal Blind",
    450: "ARAM",
    490: "Quickplay",
    700: "Clash",
    1700: "Arena",
};
// current stat-shard rows (offense / flex / defense) + icon/name meta
const SHARD_ROWS = [
    [5008, 5005, 5007],
    [5008, 5010, 5001],
    [5011, 5013, 5001],
];
const SHARD_META = {
    5001: { icon: "StatModsHealthPlusIcon.png", name: "Health" },
    5005: { icon: "StatModsAttackSpeedIcon.png", name: "Attack Speed" },
    5007: { icon: "StatModsCDRScalingIcon.png", name: "Ability Haste" },
    5008: { icon: "StatModsAdaptiveForceIcon.png", name: "Adaptive Force" },
    5010: { icon: "StatModsMovementSpeedIcon.png", name: "Move Speed" },
    5011: { icon: "StatModsHealthScalingIcon.png", name: "Health Scaling" },
    5013: { icon: "StatModsTenacityIcon.png", name: "Tenacity" },
};
// skill slots — single jade accent (R slightly deeper so the ult reads apart)
const SKILL_META = {
    1: { label: "Q", text: "text-liquirice", bg: "bg-jade" },
    2: { label: "W", text: "text-liquirice", bg: "bg-jade" },
    3: { label: "E", text: "text-liquirice", bg: "bg-jade" },
    4: { label: "R", text: "text-liquirice", bg: "bg-jade/60" },
};
const ord = (n) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);
const kFmt = (v) => (v >= 10_000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString());
function toneClasses(tone) {
    if (tone === "jade")
        return "bg-jade/15 text-jade shadow-[inset_0_0_0_1px_rgb(var(--c-jade)/0.3)]";
    if (tone === "citrine")
        return "bg-citrine/15 text-citrine shadow-[inset_0_0_0_1px_rgba(255,182,21,0.3)]";
    return "bg-[#e0503f]/15 text-[#ff7a6b] shadow-[inset_0_0_0_1px_rgba(224,80,63,0.3)]";
}
// grid templates — identity + impact are shared, the rest swaps per view
const GRID = {
    build: "minmax(215px,1.4fr) 54px 86px 112px 58px 208px",
    stats: "minmax(215px,1.4fr) 54px 52px 112px 64px 64px 44px 58px",
};
export default function MatchExpand({ match, mePuuid, region, actions, closing, proUsernames, streamerUsernames, proNames, streamerNames, }) {
    const [view, setView] = useState("build");
    // Height-collapse choreography: mount at 0fr, expand to 1fr on the next frame;
    // `closing` flips back to 0fr so the panel physically retracts under the card.
    const [entered, setEntered] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(raf);
    }, []);
    const show = entered && !closing;
    const info = match.info;
    const parts = info.participants ?? [];
    const durMin = Math.max(1, (info.gameDuration ?? 0) / 60);
    const [selPuuid, setSelPuuid] = useState(() => (parts.some((p) => p.puuid === mePuuid) ? mePuuid : parts[0]?.puuid ?? ""));
    const { impacts, placements, maxDmg } = useMemo(() => {
        const impacts = new Map();
        for (const p of parts)
            impacts.set(p.puuid, computeImpact(p, info));
        const sorted = [...parts].sort((a, b) => (impacts.get(b.puuid) ?? 0) - (impacts.get(a.puuid) ?? 0));
        const placements = new Map();
        sorted.forEach((p, i) => placements.set(p.puuid, i + 1));
        const maxDmg = Math.max(1, ...parts.map((p) => p.totalDamageDealtToChampions ?? 0));
        return { impacts, placements, maxDmg };
    }, [match.metadata.matchId]);
    const teams = [100, 200].map((teamId) => {
        const members = parts.filter((p) => p.teamId === teamId);
        return {
            teamId,
            members,
            win: members[0]?.win ?? false,
            kills: members.reduce((s, p) => s + (p.kills ?? 0), 0),
        };
    });
    const queueLabel = QUEUE_LABEL[info.queueId] ?? info.gameMode ?? "";
    const durLabel = `${Math.floor((info.gameDuration ?? 0) / 60)}:${String((info.gameDuration ?? 0) % 60).padStart(2, "0")}`;
    const renderCells = (p, teamKills, v) => {
        const isMe = p.puuid === mePuuid;
        const dmg = p.totalDamageDealtToChampions ?? 0;
        const cs = (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
        if (v === "build") {
            const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5];
            return (_jsxs(_Fragment, { children: [_jsx(KdaCell, { p: p }), _jsx(DmgCell, { dmg: dmg, maxDmg: maxDmg, isMe: isMe }), _jsxs("div", { className: "flex flex-col items-end justify-center leading-none", children: [_jsx("span", { className: "text-[12px] font-chakrapetch font-semibold text-flash/90 tabular-nums", children: cs }), _jsxs("span", { className: "text-[9px] font-jetbrains text-flash/40 mt-[3px]", children: [(cs / durMin).toFixed(1), "/m"] })] }), _jsxs("div", { className: "flex items-center gap-[3px]", children: [items.map((id, i) => id ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: "", className: "w-[23px] h-[23px] rounded-[3px] ring-1 ring-white/[0.09]", loading: "lazy", onError: (e) => { e.currentTarget.style.opacity = "0.15"; } }, i)) : (_jsx("span", { className: "w-[23px] h-[23px] rounded-[3px] bg-filmdark/50 ring-1 ring-white/[0.06]" }, i))), _jsx("span", { className: "w-[3px]" }), p.item6 ? (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${p.item6}.png`, alt: "", className: "w-[23px] h-[23px] rounded-[3px] ring-1 ring-white/[0.09]", loading: "lazy", onError: (e) => { e.currentTarget.style.opacity = "0.15"; } })) : (_jsx("span", { className: "w-[23px] h-[23px] rounded-[3px] bg-filmdark/50 ring-1 ring-white/[0.06]" }))] })] }));
        }
        // stats
        const kp = teamKills > 0 ? Math.round((((p.kills ?? 0) + (p.assists ?? 0)) / teamKills) * 100) : 0;
        return (_jsxs(_Fragment, { children: [_jsxs("span", { className: cn("text-[12px] font-chakrapetch font-semibold tabular-nums text-right", kp >= 60 ? "text-jade" : "text-flash/85"), children: [kp, "%"] }), _jsx(DmgCell, { dmg: dmg, maxDmg: maxDmg, isMe: isMe }), _jsx("span", { className: "text-[12px] font-chakrapetch text-flash/75 tabular-nums text-right", children: kFmt(p.totalDamageTaken ?? 0) }), _jsx("span", { className: "text-[12px] font-chakrapetch text-citrine/85 tabular-nums text-right", children: kFmt(p.goldEarned ?? 0) }), _jsx("span", { className: "text-[12px] font-chakrapetch text-flash/75 tabular-nums text-right", children: p.visionScore ?? 0 }), _jsxs("div", { className: "flex flex-col items-end justify-center leading-none", children: [_jsx("span", { className: "text-[12px] font-chakrapetch font-semibold text-flash/90 tabular-nums", children: cs }), _jsxs("span", { className: "text-[9px] font-jetbrains text-flash/40 mt-[3px]", children: [(cs / durMin).toFixed(1), "/m"] })] })] }));
    };
    const selected = parts.find((p) => p.puuid === selPuuid) ?? parts[0];
    const champSelector = (_jsx("div", { className: "flex items-center justify-center gap-1.5 flex-wrap rounded-[4px] bg-filmlight/[0.05] ring-1 ring-white/[0.08] px-3 py-2", children: teams.map((team, ti) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [team.members.map((p) => {
                    const active = p.puuid === selPuuid;
                    return (_jsx("button", { type: "button", onClick: () => setSelPuuid(p.puuid), title: p.riotIdGameName ?? p.championName, className: cn("relative rounded-[3px] transition-opacity duration-200 cursor-clicker", active ? "" : "opacity-45 hover:opacity-90"), children: _jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(p.championName)}.png`, alt: p.championName, className: cn("w-[30px] h-[30px] rounded-[3px]", active &&
                                (team.teamId === 100
                                    ? "ring-2 ring-[#5BA8E6] shadow-[0_0_10px_rgba(91,168,230,0.4)]"
                                    : "ring-2 ring-[#e0503f] shadow-[0_0_10px_rgba(224,80,63,0.4)]")), loading: "lazy" }) }, p.puuid));
                }), ti === 0 && (_jsx("span", { className: "mx-2 text-[9px] font-jetbrains tracking-[0.2em] text-flash/30 uppercase", children: "vs" }))] }, team.teamId))) }));
    return (_jsx("div", { className: "relative z-[1] -mt-2 mb-2.5 grid", style: {
            gridTemplateRows: show ? "1fr" : "0fr",
            transition: "grid-template-rows 300ms cubic-bezier(0.22,1,0.36,1)",
        }, children: _jsx("div", { className: "min-h-0 overflow-hidden", children: _jsxs("div", { className: "rounded-md bg-gradient-to-b from-filmlight/[0.04] to-filmlight/[0.015] backdrop-blur-lg saturate-150 glass-panel shadow-[0_14px_36px_rgba(var(--c-shadow),0.5),inset_0_0_0_0.5px_rgba(255,255,255,0.09)]", onClick: (e) => e.stopPropagation(), style: {
                    // "none" (not translateY(0)) once open: a persisted transform keeps a
                    // composited layer alive and rasterizes the small rune/item icons on
                    // fractional pixels → blurry images.
                    transform: show ? "none" : "translateY(-18px)",
                    transition: "transform 300ms cubic-bezier(0.22,1,0.36,1)",
                }, children: [_jsxs("div", { className: "relative z-10 flex items-center gap-1.5 px-3 pt-4 pb-2", children: [["build", "stats", "details"].map((v) => {
                                const active = view === v;
                                return (_jsxs("button", { type: "button", onClick: () => setView(v), className: cn("group relative h-[24px] px-3 flex items-center gap-1.5 font-jetbrains text-[9.5px] tracking-[0.2em] uppercase transition-all duration-200 cursor-clicker", active
                                        ? "bg-jade/[0.12] text-jade"
                                        : "bg-filmlight/[0.03] text-flash/45 hover:text-flash/85 hover:bg-filmlight/[0.06]"), style: {
                                        // cyber notch: clipped top-left + bottom-right corners
                                        clipPath: "polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)",
                                    }, children: [_jsx("span", { className: cn("w-[5px] h-[5px] rotate-45 shrink-0 transition-all duration-200", active
                                                ? "bg-jade shadow-[0_0_6px_rgba(0,217,146,0.9)]"
                                                : "bg-flash/20 group-hover:bg-flash/45") }), v, _jsx("span", { className: cn("pointer-events-none absolute bottom-0 left-[7px] right-0 h-[1.5px] transition-all duration-200", active ? "bg-gradient-to-r from-jade/80 via-jade/35 to-transparent" : "bg-transparent") }), _jsx("span", { className: cn("pointer-events-none absolute top-0 left-0 right-[7px] h-px", active ? "bg-jade/40" : "bg-white/[0.06]") })] }, v));
                            }), _jsxs("div", { className: "ml-auto flex items-center gap-2 text-[9px] font-jetbrains tracking-[0.14em] uppercase text-flash/40", children: [_jsx("span", { children: queueLabel }), _jsx("span", { className: "text-flash/20", children: "\u00B7" }), _jsx("span", { className: "tabular-nums", children: durLabel })] })] }), view === "details" ? (_jsxs("div", { className: "relative z-10 px-3 pb-2.5 flex flex-col gap-2", children: [champSelector, selected && (_jsx(DetailsView, { matchId: match.metadata.matchId, region: region, p: selected, parts: parts, mePuuid: mePuuid }, selected.puuid))] })) : (_jsx("div", { className: "relative z-10 overflow-x-auto", children: _jsx("div", { className: "min-w-[680px] px-2.5 pb-2 flex flex-col gap-1.5", children: teams.map((team) => {
                                return (_jsx("div", { 
                                    // The side colour drives the chamfer outline, the hover sheen
                                    // and every row tick inside — one variable instead of a
                                    // blue/red branch in each rule.
                                    style: {
                                        ["--mx-accent"]: team.teamId === 100 ? "91,168,230" : "224,80,63",
                                    }, className: cn("mx-team rounded-md overflow-hidden", team.teamId === 100 ? "bg-[#5BA8E6]/[0.07]" : "bg-[#e0503f]/[0.06]"), children: _jsx("ul", { className: "p-1 flex flex-col gap-[2px]", children: team.members.map((p) => {
                                            const isMe = p.puuid === mePuuid;
                                            const imp = impacts.get(p.puuid) ?? 0;
                                            const place = placements.get(p.puuid) ?? 10;
                                            const riotName = p.riotIdGameName;
                                            const tag = p.riotIdTagline;
                                            const nameKey = badgeKey(riotName, tag);
                                            const isProPlayer = !!nameKey && !!proUsernames?.has(nameKey);
                                            const isStreamerPlayer = !!nameKey && !isProPlayer && !!streamerUsernames?.has(nameKey);
                                            // Who the badge belongs to — the badge alone says "someone
                                            // notable", the handle says WHO.
                                            const identity = isProPlayer
                                                ? proNames?.get(nameKey)
                                                : isStreamerPlayer
                                                    ? streamerNames?.get(nameKey)
                                                    : undefined;
                                            const keystoneId = p.perks?.styles?.[0]?.selections?.[0]?.perk;
                                            const subStyleId = p.perks?.styles?.[1]?.style;
                                            return (_jsxs("li", { className: cn("mx-row grid items-center gap-x-3 pl-3 pr-2 py-[3px] rounded-[2px]", isMe
                                                    ? "mx-row-me bg-jade/[0.08]"
                                                    : "bg-filmlight/[0.028] hover:bg-filmlight/[0.06]"), 
                                                // Your own row overrides the side colour with jade so
                                                // you find yourself without reading a single name.
                                                style: {
                                                    gridTemplateColumns: GRID[view],
                                                    ...(isMe ? { ["--mx-accent"]: "0,217,146" } : null),
                                                }, children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsxs("div", { className: "relative shrink-0", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(p.championName)}.png`, alt: p.championName, className: "w-[28px] h-[28px] rounded-[3px]", loading: "lazy" }), _jsx("span", { className: "absolute -bottom-1 -right-1 min-w-[14px] text-center text-[8px] font-chakrapetch font-bold bg-liquirice/95 text-flash/85 rounded-[2px] px-[2px] leading-[12px] ring-1 ring-white/15", children: p.champLevel })] }), _jsxs("div", { className: "flex flex-col gap-[2px] shrink-0", children: [_jsx("img", { src: summonerSpellUrl(p.summoner1Id), alt: "", className: "w-[14px] h-[14px] rounded-[2px]", loading: "lazy" }), _jsx("img", { src: summonerSpellUrl(p.summoner2Id), alt: "", className: "w-[14px] h-[14px] rounded-[2px]", loading: "lazy" })] }), _jsxs("div", { className: "flex flex-col gap-[2px] shrink-0", children: [keystoneId ? (_jsx("img", { src: getKeystoneIcon(keystoneId) ?? undefined, alt: "", className: "w-[14px] h-[14px]", loading: "lazy" })) : (_jsx("span", { className: "w-[14px] h-[14px] rounded-full bg-filmlight/[0.06]" })), subStyleId ? (_jsx("img", { src: getStyleIcon(subStyleId) ?? undefined, alt: "", className: "w-[14px] h-[14px] p-[1.5px]", loading: "lazy" })) : (_jsx("span", { className: "w-[14px] h-[14px] rounded-full bg-filmlight/[0.06]" }))] }), (isProPlayer || isStreamerPlayer) && (_jsx("span", { className: "shrink-0 text-[8px] font-black leading-none px-[3px] py-[1px] rounded-[3px] tracking-wide", style: {
                                                                    background: isProPlayer
                                                                        ? "linear-gradient(135deg, #00d992, #00b8ff)"
                                                                        : "linear-gradient(135deg, #7b42a1, #a855c7)",
                                                                    color: isProPlayer ? "#040A0C" : "#e0d0f0",
                                                                    boxShadow: isProPlayer
                                                                        ? "0 0 6px rgba(0,217,146,0.5), 0 0 12px rgba(0,184,255,0.25)"
                                                                        : "0 0 6px rgba(123,66,161,0.4), 0 0 10px rgba(168,85,199,0.2)",
                                                                }, children: isProPlayer ? "PRO" : "STR" })), riotName && tag ? (_jsx(Link, { to: `/summoners/${region}/${String(riotName).replace(/\s+/g, "+")}-${tag}`, className: cn("min-w-0 truncate text-[12px] font-chakrapetch transition-colors cursor-clicker", isMe ? "text-jade font-semibold" : "text-flash/85 hover:text-jade"), children: riotName })) : (_jsx("span", { className: "min-w-0 truncate text-[12px] font-chakrapetch text-flash/55", children: p.championName })), identity && (_jsx(Link, { to: `/players/${identity.slug}`, title: `${identity.name} — profile`, className: cn("shrink-0 max-w-[72px] truncate text-[10px] font-chakrapetch font-semibold leading-none transition-colors cursor-clicker", isProPlayer
                                                                    ? "text-jade/75 hover:text-jade"
                                                                    : "text-[#c9a3e0]/75 hover:text-[#c9a3e0]"), children: identity.name }))] }), _jsxs("div", { className: "flex flex-col items-center gap-[2px]", children: [_jsx("span", { className: cn("min-w-[30px] text-center text-[12px] font-chakrapetch font-bold px-1 py-[1px] rounded-[2px] leading-none tabular-nums", toneClasses(impactTone(imp))), children: imp }), _jsx("span", { className: "text-[8px] font-jetbrains text-flash/35 leading-none", children: ord(place) })] }), renderCells(p, team.kills, view)] }, p.puuid));
                                        }) }) }, team.teamId));
                            }) }) })), _jsxs("div", { className: "relative z-10 flex items-center justify-between gap-2 px-3 py-1.5 border-t border-white/[0.05]", children: [_jsx("span", { className: "text-[8.5px] font-jetbrains tracking-[0.22em] uppercase text-flash/30", children: "Match tools" }), _jsx("div", { className: "flex gap-2", children: actions })] })] }) }) }));
}
/* ── section shell for the details boxes ────────────────────────────── */
function Section({ title, children }) {
    return (_jsxs("div", { className: "rounded-[4px] bg-filmlight/[0.05] ring-1 ring-white/[0.08] px-3.5 py-2.5", children: [_jsx("div", { className: "text-[9px] font-jetbrains tracking-[0.22em] uppercase text-flash/55 pb-2 mb-2.5 border-b border-white/[0.08]", children: title }), children] }));
}
/* ── DETAILS — item timeline + skill order + full rune trees ────────── */
function DetailsView({ matchId, region, p, parts, mePuuid, }) {
    const { data: timeline, loading } = useMatchTimeline(matchId, region);
    const trees = useRuneTrees();
    const pid = p.participantId ?? parts.indexOf(p) + 1;
    // ── timeline extraction: item purchases (undo-aware) + skill order ──
    const { itemGroups, skillSeq } = useMemo(() => {
        const purchases = [];
        const skillSeq = [];
        for (const frame of timeline?.info?.frames ?? []) {
            for (const ev of frame.events ?? []) {
                if (ev.participantId !== pid)
                    continue;
                if (ev.type === "ITEM_PURCHASED") {
                    purchases.push({ itemId: ev.itemId, minute: Math.floor((ev.timestamp ?? 0) / 60000) });
                }
                else if (ev.type === "ITEM_UNDO") {
                    // undo removes the most recent purchase of the un-bought item
                    if (ev.beforeId) {
                        for (let i = purchases.length - 1; i >= 0; i--) {
                            if (purchases[i].itemId === ev.beforeId) {
                                purchases.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
                else if (ev.type === "SKILL_LEVEL_UP" && ev.levelUpType === "NORMAL") {
                    skillSeq.push(ev.skillSlot);
                }
            }
        }
        // group consecutive purchases by minute
        const itemGroups = [];
        for (const buy of purchases) {
            const last = itemGroups[itemGroups.length - 1];
            if (last && last.minute === buy.minute)
                last.items.push(buy.itemId);
            else
                itemGroups.push({ minute: buy.minute, items: [buy.itemId] });
        }
        return { itemGroups, skillSeq };
    }, [timeline, pid]);
    // skill priority: Q/W/E ordered by points then first-max
    const priority = useMemo(() => {
        const counts = new Map([[1, 0], [2, 0], [3, 0]]);
        const firstAt5 = new Map();
        skillSeq.forEach((slot, i) => {
            if (slot === 4)
                return;
            const c = (counts.get(slot) ?? 0) + 1;
            counts.set(slot, c);
            if (c === 5 && !firstAt5.has(slot))
                firstAt5.set(slot, i);
        });
        return [1, 2, 3].sort((a, b) => {
            const d = (counts.get(b) ?? 0) - (counts.get(a) ?? 0);
            if (d !== 0)
                return d;
            return (firstAt5.get(a) ?? 99) - (firstAt5.get(b) ?? 99);
        });
    }, [skillSeq]);
    // ── runes ──
    const styles = p.perks?.styles ?? [];
    const primary = styles.find((s) => s.description === "primaryStyle") ?? styles[0];
    const sub = styles.find((s) => s.description === "subStyle") ?? styles[1];
    const primaryTree = trees.find((t) => t.id === primary?.style);
    const subTree = trees.find((t) => t.id === sub?.style);
    const primaryPicks = new Set((primary?.selections ?? []).map((s) => s.perk));
    const subPicks = new Set((sub?.selections ?? []).map((s) => s.perk));
    const shardPicks = [p.perks?.statPerks?.offense, p.perks?.statPerks?.flex, p.perks?.statPerks?.defense];
    const isMe = p.puuid === mePuuid;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex items-center gap-2 px-0.5", children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(p.championName)}.png`, alt: p.championName, className: "w-[22px] h-[22px] rounded-[3px]", loading: "lazy" }), _jsx("span", { className: cn("text-[12.5px] font-chakrapetch font-semibold", isMe ? "text-jade" : "text-flash/90"), children: p.riotIdGameName ?? p.championName }), _jsx("span", { className: "text-[10px] font-jetbrains text-flash/35", children: p.championName })] }), _jsx(Section, { title: "Items", children: loading ? (_jsx("div", { className: "h-10 flex items-center text-[10px] font-jetbrains text-flash/35 animate-pulse", children: "loading timeline\u2026" })) : itemGroups.length === 0 ? (_jsx("div", { className: "h-10 flex items-center text-[10px] font-jetbrains text-flash/30", children: "timeline unavailable" })) : (_jsx("div", { className: "flex items-start flex-wrap gap-y-2.5", children: itemGroups.map((g, gi) => (_jsxs("div", { className: "flex items-start", children: [_jsxs("div", { className: "flex flex-col items-center gap-1", children: [_jsx("div", { className: "flex items-center gap-[2px] rounded-[3px] bg-filmlight/[0.07] p-[3px] ring-1 ring-white/[0.09]", children: g.items.map((id, i) => (_jsx("img", { src: `${cdnBaseUrl()}/img/item/${id}.png`, alt: "", className: "w-[22px] h-[22px] rounded-[2px] ring-1 ring-white/[0.08]", loading: "lazy", onError: (e) => { e.currentTarget.style.opacity = "0.15"; } }, i))) }), _jsxs("span", { className: "text-[9px] font-jetbrains text-flash/55 leading-none tabular-nums", children: [g.minute, "m"] })] }), gi < itemGroups.length - 1 && (_jsx("span", { className: "mx-1.5 mt-[9px] text-flash/20 text-[9px]", children: "\u25B8" }))] }, gi))) })) }), _jsx(Section, { title: "Skill Order", children: loading ? (_jsx("div", { className: "h-10 flex items-center text-[10px] font-jetbrains text-flash/35 animate-pulse", children: "loading timeline\u2026" })) : skillSeq.length === 0 ? (_jsx("div", { className: "h-10 flex items-center text-[10px] font-jetbrains text-flash/30", children: "timeline unavailable" })) : (_jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center gap-4", children: [_jsx("div", { className: "flex items-center gap-1.5 shrink-0", children: priority.map((slot, i) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: cn("w-7 h-7 rounded-[3px] flex items-center justify-center text-[13px] font-chakrapetch font-bold", SKILL_META[slot].bg, SKILL_META[slot].text), children: SKILL_META[slot].label }), i < 2 && _jsx("span", { className: "text-flash/25 text-[10px]", children: "\u25B8" })] }, slot))) }), _jsx("div", { className: "overflow-x-auto", children: _jsx("div", { className: "flex flex-col gap-[2px] w-max", children: [1, 2, 3, 4].map((slot) => (_jsxs("div", { className: "flex items-center gap-[2px]", children: [_jsx("span", { className: cn("w-[16px] h-[16px] rounded-[2px] flex items-center justify-center text-[9px] font-chakrapetch font-bold shrink-0", "bg-filmlight/[0.1] text-flash/80"), children: SKILL_META[slot].label }), skillSeq.map((s, i) => (_jsx("span", { className: cn("w-[16px] h-[16px] rounded-[2px] flex items-center justify-center text-[8.5px] font-chakrapetch font-bold tabular-nums shrink-0", s === slot
                                                ? cn(SKILL_META[slot].bg, SKILL_META[slot].text)
                                                : "bg-filmlight/[0.07]"), children: s === slot ? i + 1 : "" }, i)))] }, slot))) }) })] })) }), _jsx(Section, { title: "Runes", children: _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-[auto_auto_auto] gap-x-10 gap-y-4 justify-center", children: [_jsxs("div", { children: [_jsx(TreeHeader, { icon: primaryTree ? `${PERK_CDN}/${primaryTree.icon}` : null, name: primaryTree?.name ?? "" }), _jsxs("div", { className: "flex flex-col gap-2.5", children: [_jsx(RuneRowIcons, { runes: primaryTree?.keystones ?? [], picks: primaryPicks, size: 30 }), (primaryTree?.rows ?? []).map((row, i) => (_jsx(RuneRowIcons, { runes: row, picks: primaryPicks, size: 22 }, i)))] })] }), _jsxs("div", { children: [_jsx(TreeHeader, { icon: subTree ? `${PERK_CDN}/${subTree.icon}` : null, name: subTree?.name ?? "" }), _jsx("div", { className: "flex flex-col gap-2.5", children: (subTree?.rows ?? []).map((row, i) => (_jsx(RuneRowIcons, { runes: row, picks: subPicks, size: 22 }, i))) })] }), _jsxs("div", { children: [_jsx(TreeHeader, { icon: null, name: "Rune Shards" }), _jsx("div", { className: "flex flex-col gap-2.5", children: SHARD_ROWS.map((row, ri) => (_jsx("div", { className: "flex items-center gap-2.5", children: row.map((id, ci) => {
                                            const active = shardPicks[ri] === id;
                                            const meta = SHARD_META[id];
                                            return (_jsx("span", { title: meta?.name, className: cn("w-[22px] h-[22px] rounded-full flex items-center justify-center bg-filmlight/[0.06] ring-1", active ? "ring-jade shadow-[0_0_8px_rgba(0,217,146,0.4)]" : "ring-white/[0.06]"), children: meta ? (_jsx("img", { src: `${PERK_CDN}/StatMods/${meta.icon}`, alt: "", className: cn("w-[14px] h-[14px]", !active && "opacity-45 grayscale"), loading: "lazy" })) : null }, `${ri}-${ci}`));
                                        }) }, ri))) })] })] }) })] }));
}
function TreeHeader({ icon, name }) {
    return (_jsxs("div", { className: "flex items-center gap-2 pb-2 mb-2.5 border-b border-white/[0.08]", children: [icon ? _jsx("img", { src: icon, alt: "", className: "w-[15px] h-[15px]", loading: "lazy" }) : null, _jsx("span", { className: "text-[9px] font-jetbrains tracking-[0.2em] uppercase text-flash/55", children: name })] }));
}
function RuneRowIcons({ runes, picks, size, }) {
    return (_jsx("div", { className: "flex items-center gap-2.5", children: runes.map((r) => {
            const active = picks.has(r.id);
            return (_jsx("span", { title: r.name ?? getRuneName(r.id) ?? undefined, className: cn("rounded-full flex items-center justify-center", active && "ring-2 ring-jade/70 shadow-[0_0_10px_rgba(0,217,146,0.35)]"), style: { width: size, height: size }, children: _jsx("img", { src: `${PERK_CDN}/${r.icon}`, alt: "", style: { width: size, height: size }, className: cn(!active && "opacity-45 grayscale"), loading: "lazy" }) }, r.id));
        }) }));
}
function KdaCell({ p }) {
    const kda = p.deaths > 0 ? ((p.kills + p.assists) / p.deaths).toFixed(2) : "Perfect";
    return (_jsxs("div", { className: "flex flex-col items-end justify-center leading-none", children: [_jsxs("span", { className: "text-[13px] font-chakrapetch font-bold tracking-wide tabular-nums text-flash/90", children: [p.kills, " ", _jsx("span", { className: "text-flash/25 font-normal", children: "/" }), " ", _jsx("span", { className: "text-red-400/80", children: p.deaths }), " ", _jsx("span", { className: "text-flash/25 font-normal", children: "/" }), " ", p.assists] }), _jsx("span", { className: cn("text-[9px] font-jetbrains mt-[3px]", kda === "Perfect" ? "text-citrine" : "text-flash/45"), children: kda === "Perfect" ? "Perfect" : `${kda} KDA` })] }));
}
function DmgCell({ dmg, maxDmg, isMe }) {
    return (_jsxs("div", { className: "flex flex-col items-end justify-center gap-[3px]", children: [_jsx("span", { className: "text-[12px] font-chakrapetch text-flash/90 tabular-nums leading-none", children: dmg.toLocaleString() }), _jsx("div", { className: "w-[84px] h-[3px] rounded-full bg-filmlight/15 overflow-hidden", children: _jsx("div", { className: cn("h-full rounded-full", isMe ? "bg-jade" : "bg-flash/45"), style: { width: `${Math.max(3, (dmg / maxDmg) * 100)}%` } }) })] }));
}
