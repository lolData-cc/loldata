import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/matchreplay/RiftMap.tsx
//
// The interactive minimap. Renders the SR background, then layers:
//   1. Static map landmarks (subtle pit indicators for Drake/Baron)
//   2. Active wards
//   3. Recent kill flash markers (3s window)
//   4. Recent gold popups (kills + objectives, fade out)
//   5. 10 champion sprites (positions interpolated)
//   6. Recent objective-kill markers (drake / baron / herald)
//
// All layers use absolute positioning with percent coordinates derived
// from Riot's 0..15000 space via `toMapNorm`. The container is a square
// (aspect-square) so percentages map cleanly.
//
// Champion sprite design (matches the mockup):
//   - 36×36 hexagonal frame, team-colored border
//   - champion icon clipped to a circle inside
//   - small level chip bottom-right
//   - subtle glow ring for the focused/highlighted player
//   - dead state: grayscale + skull overlay (~9s death timer hint)
import * as React from "react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import { positionsAt, toMapNorm, eventsUpTo, activeWardsAt, teamOf, staticParticipantByPid, metricsAt, fmtShortNum, } from "./derive";
import { eliteMonsterIcon, wardIcon, TowerIcon, InhibitorIcon, SkullIcon, CoinIcon, dragonColor, } from "./eventIcons";
import { DebugMapOverlay } from "./DebugMapOverlay";
// Map asset selection:
//   Primary  — Riot Wiki's S14 detailed top-down render (1990×1323, ~5.5MB).
//              CORS-open ("access-control-allow-origin: *"), CDN-cached 24h.
//              This is the render that matches Mobalytics/U.GG style: 3D-ish
//              towers, visible vegetation, water-effect river, jungle texture.
//   Fallback1 — Riot Wiki's prior "Update_Map" version (2400×1708, ~6.5MB),
//              same style, used if the S14 asset URL ever rotates.
//   Fallback2 — Data Dragon map11.png — schematic 600×600, ugly but
//              always-on safety net.
//
// In production we should mirror to cdn.loldata.cc to avoid relying on
// Riot's wiki CDN, but for now we hotlink — Riot's "Legal Jibber Jabber"
// allows non-commercial derivative use of game assets.
const MAP_URL_PRIMARY = "https://wiki.leagueoflegends.com/en-us/images/Summoner%27s_Rift_map_s14.png";
const MAP_URL_FALLBACK = "https://wiki.leagueoflegends.com/en-us/images/Summoner%27s_Rift_Update_Map.png";
const MAP_URL_FALLBACK_2 = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img/map/map11.png";
const KILL_FLASH_MS = 3500;
const GOLD_FLASH_MS = 2800;
const OBJ_FLASH_MS = 4500;
const TOWER_FLASH_MS = 3500;
const DEATH_TIMER_MS = 9000; // very rough; real timer is level-based
export function RiftMap({ timeline, staticMatch, timeMs, focusedPid, hiddenPids, onFocusPid, calibration, debug, debugOverrides, setDebugOverrides }) {
    const cal = calibration ?? { scaleX: 1.0, scaleY: 1.0, offsetXPct: 0, offsetYPct: 0 };
    // Position lookup function — used by activeWardsAt to back-trace
    // ward positions from the creator's position at place time.
    const posOf = React.useCallback((pid, ts) => positionsAt(timeline, ts).get(pid) ?? null, [timeline]);
    const positions = useMemo(() => positionsAt(timeline, timeMs), [timeline, timeMs]);
    // Get recent events for flashes.
    const recentEvents = useMemo(() => {
        const all = eventsUpTo(timeline, timeMs);
        // Last ~6s of activity is enough; we'll filter per category below.
        const cutoff = timeMs - 7000;
        const idx = all.findIndex((e) => e.timestamp >= cutoff);
        return idx < 0 ? [] : all.slice(idx);
    }, [timeline, timeMs]);
    const wards = useMemo(() => activeWardsAt(timeline, timeMs, posOf), [timeline, timeMs, posOf]);
    // Latest death per victim — used to grey out & mark sprite as dead.
    const deathsByVictim = useMemo(() => {
        const map = new Map();
        for (const e of eventsUpTo(timeline, timeMs)) {
            if (e.type !== "CHAMPION_KILL")
                continue;
            const victim = e.victimId;
            if (!victim || victim < 1 || victim > 10)
                continue;
            if (!e.position)
                continue;
            map.set(victim, {
                victimId: victim,
                killerId: e.killerId ?? 0,
                position: e.position,
                timestamp: e.timestamp,
            });
        }
        // A "death" is only "active" if within DEATH_TIMER_MS and not
        // followed by a movement frame (we approximate by checking the
        // position movement after death timestamp).
        for (const [vid, d] of Array.from(map)) {
            if (timeMs - d.timestamp >= DEATH_TIMER_MS) {
                // Likely respawned; clear.
                map.delete(vid);
            }
        }
        return map;
    }, [timeline, timeMs]);
    const killFlashes = [];
    const goldFlashes = [];
    const objFlashes = [];
    const buildingFlashes = [];
    for (const e of recentEvents) {
        const age = timeMs - e.timestamp;
        if (e.type === "CHAMPION_KILL" && e.position) {
            if (age <= KILL_FLASH_MS && e.killerId && e.killerId > 0) {
                const team = teamOf(e.killerId);
                killFlashes.push({ id: `k-${e.timestamp}-${e.victimId}`, x: e.position.x, y: e.position.y, killerTeam: team, age });
            }
            if (age <= GOLD_FLASH_MS && (e.bounty ?? 0) > 0 && e.killerId && e.killerId > 0) {
                const team = teamOf(e.killerId);
                goldFlashes.push({
                    id: `g-${e.timestamp}-${e.victimId}`,
                    x: e.position.x, y: e.position.y,
                    amount: (e.bounty ?? 0) + (e.shutdownBounty ?? 0),
                    team, age,
                });
            }
        }
        else if (e.type === "ELITE_MONSTER_KILL" && e.position && e.killerTeamId) {
            if (age <= OBJ_FLASH_MS) {
                const t = e.killerTeamId === 100 || e.killerTeamId === 200 ? e.killerTeamId : null;
                if (t)
                    objFlashes.push({
                        id: `o-${e.timestamp}-${e.monsterType}`,
                        x: e.position.x, y: e.position.y,
                        kind: String(e.monsterType ?? "OBJ"),
                        subType: e.monsterSubType,
                        team: t, age,
                    });
                if (age <= GOLD_FLASH_MS && (e.bounty ?? 0) > 0 && t) {
                    goldFlashes.push({
                        id: `og-${e.timestamp}-${e.monsterType}`,
                        x: e.position.x, y: e.position.y,
                        amount: e.bounty ?? 0, team: t, age,
                    });
                }
            }
        }
        else if (e.type === "BUILDING_KILL" && e.position) {
            if (age <= TOWER_FLASH_MS && (e.teamId === 100 || e.teamId === 200)) {
                const loser = e.teamId;
                buildingFlashes.push({
                    id: `b-${e.timestamp}-${e.buildingType}-${e.laneType}`,
                    x: e.position.x, y: e.position.y,
                    isInhib: e.buildingType === "INHIBITOR_BUILDING",
                    loserTeam: loser, age,
                });
            }
        }
    }
    // --- Render ---
    //
    // We have TWO independent layers:
    //   1. BG IMAGE — gets only the fixed BASE_ZOOM. The Wiki SR asset
    //      is 3:2 with the playfield centered, so the container is set
    //      to aspect-[3/2] and object-cover fits without cropping.
    //   2. COORDINATE-SPACE layer — sprites, debug landmarks, lane
    //      schema, ward icons, kill markers. Carries the calibration
    //      (scaleX, scaleY, off X/Y) so Riot's 0..15000 space maps
    //      to the playfield sub-rect of the asset (~16%..84% in both
    //      axes). DEFAULT_CALIBRATION encodes that mapping.
    //
    // User can still drag landmarks + Apply to fine-tune.
    const BASE_ZOOM = 1.0;
    const imgTransform = `scale(${BASE_ZOOM})`;
    const coordTransform = `translate(${cal.offsetXPct}%, ${cal.offsetYPct}%) scale(${BASE_ZOOM * cal.scaleX}, ${BASE_ZOOM * cal.scaleY})`;
    return (_jsxs("div", { className: "relative aspect-[3/2] w-full select-none overflow-hidden rounded-lg", style: {
            filter: "drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 4px 10px rgba(0,217,146,0.10))",
        }, children: [_jsx("div", { className: "absolute inset-0", style: { transform: imgTransform, transformOrigin: "center" }, children: _jsx("img", { src: MAP_URL_PRIMARY, onError: (ev) => {
                        const img = ev.currentTarget;
                        if (img.src.indexOf(MAP_URL_PRIMARY) >= 0) {
                            img.src = MAP_URL_FALLBACK;
                        }
                        else if (img.src.indexOf(MAP_URL_FALLBACK) >= 0) {
                            img.src = MAP_URL_FALLBACK_2;
                        }
                    }, alt: "Summoner's Rift", className: "absolute inset-0 w-full h-full object-cover", style: {
                        filter: "saturate(1.10) contrast(1.05) brightness(1.02)",
                        imageRendering: "auto",
                    }, draggable: false }) }), _jsxs("div", { className: "absolute inset-0", style: {
                    transform: coordTransform,
                    transformOrigin: "center",
                    // @ts-ignore — custom CSS properties for sprite counter-scale
                    "--inv-sx": 1 / (BASE_ZOOM * cal.scaleX),
                    "--inv-sy": 1 / (BASE_ZOOM * cal.scaleY),
                }, children: [wards.map((w) => {
                        const { nx, ny } = toMapNorm(w.position);
                        const Icon = wardIcon(w.wardType);
                        const team = teamOf(w.creatorId);
                        const tint = team === 100 ? "#5BA8E6" : "#d63336";
                        return (_jsx("div", { className: "absolute z-[20] pointer-events-none", style: {
                                left: `${nx * 100}%`, top: `${ny * 100}%`,
                                transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
                                color: tint,
                            }, children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 rounded-full blur-[6px] opacity-50", style: { background: tint } }), _jsx(Icon, { className: "relative w-3 h-3 drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]" })] }) }, w.id));
                    }), buildingFlashes.map((b) => {
                        const { nx, ny } = toMapNorm({ x: b.x, y: b.y });
                        const winner = b.loserTeam === 100 ? "#d63336" : "#5BA8E6";
                        const fade = 1 - b.age / TOWER_FLASH_MS;
                        return (_jsx("div", { className: "absolute z-[40] pointer-events-none", style: {
                                left: `${nx * 100}%`, top: `${ny * 100}%`,
                                transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
                                opacity: Math.max(0, fade),
                                color: winner,
                            }, children: _jsxs("div", { className: "relative", children: [_jsx("div", { className: "absolute inset-0 rounded-full blur-[10px]", style: { background: winner, opacity: fade * 0.6 } }), b.isInhib ? (_jsx(InhibitorIcon, { className: "relative w-6 h-6" })) : (_jsx(TowerIcon, { className: "relative w-6 h-6" }))] }) }, b.id));
                    }), killFlashes.map((k) => {
                        const { nx, ny } = toMapNorm({ x: k.x, y: k.y });
                        const tint = k.killerTeam === 100 ? "#5BA8E6" : "#d63336";
                        const fade = 1 - k.age / KILL_FLASH_MS;
                        const scale = 1 + (k.age / KILL_FLASH_MS) * 0.6;
                        return (_jsxs(React.Fragment, { children: [_jsx("div", { className: "absolute z-[35] pointer-events-none rounded-full border-2", style: {
                                        left: `${nx * 100}%`, top: `${ny * 100}%`,
                                        width: 28, height: 28,
                                        transform: `translate(-50%, -50%) scale(${scale}) scale(var(--inv-sx, 1), var(--inv-sy, 1))`,
                                        borderColor: tint,
                                        opacity: fade * 0.6,
                                    } }), _jsx("div", { className: "absolute z-[36] pointer-events-none", style: {
                                        left: `${nx * 100}%`, top: `${ny * 100}%`,
                                        transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
                                        color: tint,
                                        opacity: fade,
                                    }, children: _jsx(SkullIcon, { className: "w-4 h-4 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]" }) })] }, k.id));
                    }), objFlashes.map((o) => {
                        const { nx, ny } = toMapNorm({ x: o.x, y: o.y });
                        const fade = 1 - o.age / OBJ_FLASH_MS;
                        const tint = o.kind === "DRAGON" ? dragonColor(o.subType) :
                            o.team === 100 ? "#5BA8E6" : "#d63336";
                        const Icon = eliteMonsterIcon(o.kind);
                        const scale = 1 + (o.age / OBJ_FLASH_MS) * 0.5;
                        return (_jsxs(React.Fragment, { children: [_jsx("div", { className: "absolute z-[37] pointer-events-none rounded-full", style: {
                                        left: `${nx * 100}%`, top: `${ny * 100}%`,
                                        width: 36, height: 36,
                                        transform: `translate(-50%, -50%) scale(${scale}) scale(var(--inv-sx, 1), var(--inv-sy, 1))`,
                                        background: `radial-gradient(circle, ${tint}88 0%, transparent 70%)`,
                                        opacity: fade,
                                    } }), _jsx("div", { className: "absolute z-[38] pointer-events-none", style: {
                                        left: `${nx * 100}%`, top: `${ny * 100}%`,
                                        transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
                                        color: tint,
                                        opacity: fade,
                                    }, children: _jsx(Icon, { className: "w-5 h-5 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]" }) })] }, o.id));
                    }), goldFlashes.map((g) => {
                        const { nx, ny } = toMapNorm({ x: g.x, y: g.y });
                        const fade = 1 - g.age / GOLD_FLASH_MS;
                        const yOffset = -((g.age / GOLD_FLASH_MS) * 28); // float upward
                        const color = g.team === 100 ? "#9fffc3" : "#ffb38a";
                        return (_jsxs("div", { className: "absolute z-[45] pointer-events-none flex items-center gap-1 font-chakrapetch font-bold tabular-nums text-xs", style: {
                                left: `${nx * 100}%`, top: `${ny * 100}%`,
                                transform: `translate(-50%, calc(-50% + ${yOffset}px)) scale(var(--inv-sx, 1), var(--inv-sy, 1))`,
                                color,
                                opacity: fade,
                                textShadow: "0 0 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95)",
                            }, children: [_jsx(CoinIcon, { className: "w-3 h-3" }), _jsxs("span", { children: ["+", fmtShortNum(g.amount)] })] }, g.id));
                    }), Array.from({ length: 10 }, (_, i) => i + 1).map((pid) => {
                        if (hiddenPids.has(pid))
                            return null;
                        const pos = positions.get(pid);
                        if (!pos)
                            return null;
                        const sp = staticParticipantByPid(staticMatch, pid);
                        if (!sp)
                            return null;
                        const { nx, ny } = toMapNorm(pos);
                        const teamTint = sp.teamId === 100 ? "#5BA8E6" : "#d63336";
                        const m = metricsAt(timeline, pid, timeMs);
                        const dead = deathsByVictim.has(pid);
                        const isFocused = focusedPid === pid;
                        return (_jsx("button", { type: "button", onClick: (e) => {
                                e.stopPropagation();
                                onFocusPid?.(focusedPid === pid ? null : pid);
                            }, className: "absolute z-[50] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-jade rounded-full", style: {
                                left: `${nx * 100}%`, top: `${ny * 100}%`,
                                transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
                            }, title: `${sp.championName} — Lv ${m?.level ?? "?"}`, children: _jsxs("div", { className: "relative", children: [isFocused && (_jsx("div", { className: "absolute inset-0 rounded-full -m-2 animate-pulse", style: { boxShadow: `0 0 0 2px ${teamTint}, 0 0 14px ${teamTint}` } })), _jsxs("div", { className: cn("relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center", dead && "grayscale brightness-50"), style: {
                                            boxShadow: `0 0 0 2px ${teamTint}, 0 0 8px rgba(0,0,0,0.7)`,
                                            background: "#040A0C",
                                        }, children: [_jsx("img", { src: `${cdnBaseUrl()}/img/champion/${normalizeChampName(sp.championName)}.png`, alt: sp.championName, className: "w-full h-full object-cover", draggable: false }), dead && (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-black/60", children: _jsx(SkullIcon, { className: "w-5 h-5 text-flash/90" }) }))] }), m && !dead && (_jsx("div", { className: "absolute -bottom-1 -right-1 px-1 rounded-sm text-[9px] font-mono font-bold tabular-nums", style: { background: "#040A0C", color: teamTint, boxShadow: `0 0 0 1px ${teamTint}80` }, children: m.level }))] }) }, pid));
                    }), _jsx(DebugMapOverlay, { enabled: !!debug, overrides: debugOverrides ?? {}, setOverrides: setDebugOverrides ?? (() => { }) })] }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                    boxShadow: "inset 0 0 0 1px rgba(0,217,146,0.18), inset 0 0 28px rgba(0,0,0,0.35)",
                } }), _jsx("div", { className: "absolute inset-0 pointer-events-none", style: {
                    background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.30) 100%)",
                } })] }));
}
