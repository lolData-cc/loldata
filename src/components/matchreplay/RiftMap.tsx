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
import { useCallback, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cdnBaseUrl, normalizeChampName } from "@/config";
import {
  positionsAt,
  toMapNorm,
  eventsUpTo,
  activeWardsAt,
  teamOf,
  staticParticipantByPid,
  metricsAt,
  fmtShortNum,
} from "./derive";
import type { MatchTimeline, StaticMatch } from "./types";
import {
  eliteMonsterIcon,
  wardIcon,
  TowerIcon,
  InhibitorIcon,
  SkullIcon,
  CoinIcon,
  SwordIcon,
  dragonColor,
} from "./eventIcons";
import { DebugMapOverlay, type MapCalibration, type LandmarkOverrides } from "./DebugMapOverlay";

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
const MAP_URL_PRIMARY  = "https://wiki.leagueoflegends.com/en-us/images/Summoner%27s_Rift_map_s14.png";
const MAP_URL_FALLBACK = "https://wiki.leagueoflegends.com/en-us/images/Summoner%27s_Rift_Update_Map.png";
const MAP_URL_FALLBACK_2 = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img/map/map11.png";

const KILL_FLASH_MS = 3500;
const GOLD_FLASH_MS = 2800;
const OBJ_FLASH_MS = 4500;
const TOWER_FLASH_MS = 3500;
const DEATH_TIMER_MS = 9000; // very rough; real timer is level-based

export interface RiftMapProps {
  timeline: MatchTimeline;
  staticMatch: StaticMatch | null;
  timeMs: number;
  focusedPid: number | null;
  hiddenPids: Set<number>;
  onFocusPid?: (pid: number | null) => void;
  calibration?: MapCalibration;
  debug?: boolean;
  debugOverrides?: LandmarkOverrides;
  setDebugOverrides?: React.Dispatch<React.SetStateAction<LandmarkOverrides>>;
}

interface DeathInfo {
  victimId: number;
  killerId: number;
  position: { x: number; y: number };
  timestamp: number;
}

// Zoom configuration — discrete levels for + / − buttons, hard min/max
// for wheel/pinch so the user never zooms past usable.
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;
const ZOOM_WHEEL_FACTOR_IN = 1.18;
const ZOOM_WHEEL_FACTOR_OUT = 1 / 1.18;
const PAN_CLICK_THRESHOLD_PX = 5;

export function RiftMap({ timeline, staticMatch, timeMs, focusedPid, hiddenPids, onFocusPid, calibration, debug, debugOverrides, setDebugOverrides }: RiftMapProps) {
  const cal: MapCalibration = calibration ?? { scaleX: 1.0, scaleY: 1.0, offsetXPct: 0, offsetYPct: 0 };
  // Position lookup function — used by activeWardsAt to back-trace
  // ward positions from the creator's position at place time.
  const posOf = React.useCallback(
    (pid: number, ts: number) => positionsAt(timeline, ts).get(pid) ?? null,
    [timeline]
  );

  // ── Zoom + pan ───────────────────────────────────────────────────
  // Zoom is the multiplier applied uniformly to BOTH layers (bg image
  // + coord/sprite layer) so their calibration alignment is preserved.
  // Pan is in screen pixels relative to the visible viewport center,
  // applied AFTER scale (`translate(panPx) scale(zoom)`). Clicking the
  // zoom controls or pressing the buttons resets pan when going back
  // to 1× so the map snaps back to the canonical view.
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Clamp the pan to whatever the current zoom allows. At 1× the map
  // exactly fills the viewport, so pan must be 0; at N× the user can
  // shift by up to half the overhang on each axis.
  const clampPan = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      const el = containerRef.current;
      if (!el || atZoom <= 1) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const maxX = ((atZoom - 1) * rect.width) / 2;
      const maxY = ((atZoom - 1) * rect.height) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, next.x)),
        y: Math.max(-maxY, Math.min(maxY, next.y)),
      };
    },
    []
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => {
      const next = Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2));
      // Re-clamp pan to the tighter/looser bound (zoom in keeps it,
      // zoom out usually shrinks the window).
      setPan((p) => clampPan(p, next));
      return next;
    });
  }, [clampPan]);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2));
      setPan((p) => clampPan(p, next));
      return next;
    });
  }, [clampPan]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Wheel zoom toward cursor — keeps the point under the cursor
  // visually anchored as the scale changes. Standard pan-zoom math:
  // map-space coord at cursor = (cursor − pan) / zoom. Solving for
  // newPan to preserve it gives newPan = cursor − mapCoord × newZoom.
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el) return;
      // We use preventDefault to keep the page from scrolling while
      // zooming inside the dialog — passive: false is the default for
      // onWheel in React, so this works.
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;

      const factor = e.deltaY > 0 ? ZOOM_WHEEL_FACTOR_OUT : ZOOM_WHEEL_FACTOR_IN;
      const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * factor));
      if (nextZoom === zoom) return;

      // Map-space coord under cursor BEFORE the zoom change.
      const mapX = (px - pan.x) / zoom;
      const mapY = (py - pan.y) / zoom;
      const nextPanX = px - mapX * nextZoom;
      const nextPanY = py - mapY * nextZoom;

      setZoom(nextZoom);
      setPan(
        nextZoom <= 1
          ? { x: 0, y: 0 }
          : clampPan({ x: nextPanX, y: nextPanY }, nextZoom)
      );
    },
    [zoom, pan, clampPan]
  );

  // Drag-to-pan when zoomed in. We DON'T grab pointer capture
  // immediately — we wait until the user moves past a small threshold
  // so quick clicks on sprites still fire their onClick handlers.
  const panStateRef = useRef<{
    pointerId: number;
    startClient: { x: number; y: number };
    startPan: { x: number; y: number };
    captured: boolean;
  } | null>(null);

  const onMapPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1) return;
      // Ignore drags that started on the zoom controls cluster — the
      // data attribute is the cheapest opt-out signal.
      if ((e.target as HTMLElement).closest("[data-rift-zoom-control]")) return;
      panStateRef.current = {
        pointerId: e.pointerId,
        startClient: { x: e.clientX, y: e.clientY },
        startPan: { ...pan },
        captured: false,
      };
    },
    [zoom, pan]
  );

  const onMapPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = panStateRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      const dx = e.clientX - s.startClient.x;
      const dy = e.clientY - s.startClient.y;
      if (!s.captured) {
        if (Math.hypot(dx, dy) <= PAN_CLICK_THRESHOLD_PX) return;
        s.captured = true;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(s.pointerId);
        } catch {
          /* some browsers reject capture if the pointer already left */
        }
      }
      setPan(clampPan({ x: s.startPan.x + dx, y: s.startPan.y + dy }, zoom));
      e.preventDefault();
    },
    [zoom, clampPan]
  );

  const onMapPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = panStateRef.current;
      if (!s || s.pointerId !== e.pointerId) return;
      if (s.captured) {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(s.pointerId);
        } catch {
          /* ignore */
        }
      }
      panStateRef.current = null;
    },
    []
  );

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
    const map = new Map<number, DeathInfo>();
    for (const e of eventsUpTo(timeline, timeMs)) {
      if (e.type !== "CHAMPION_KILL") continue;
      const victim = e.victimId;
      if (!victim || victim < 1 || victim > 10) continue;
      if (!e.position) continue;
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

  // --- Build flash layers ---
  type KillFlash = { id: string; x: number; y: number; killerTeam: 100 | 200; age: number };
  type GoldFlash = { id: string; x: number; y: number; amount: number; team: 100 | 200; age: number };
  type ObjFlash = { id: string; x: number; y: number; kind: string; subType?: string; team: 100 | 200; age: number };
  type BuildingFlash = { id: string; x: number; y: number; isInhib: boolean; loserTeam: 100 | 200; age: number };

  const killFlashes: KillFlash[] = [];
  const goldFlashes: GoldFlash[] = [];
  const objFlashes: ObjFlash[] = [];
  const buildingFlashes: BuildingFlash[] = [];

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
    } else if (e.type === "ELITE_MONSTER_KILL" && e.position && e.killerTeamId) {
      if (age <= OBJ_FLASH_MS) {
        const t = e.killerTeamId === 100 || e.killerTeamId === 200 ? e.killerTeamId : null;
        if (t) objFlashes.push({
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
    } else if (e.type === "BUILDING_KILL" && e.position) {
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
  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[3/2] w-full select-none overflow-hidden rounded-lg",
        // Cursor flips to "move" while panning is possible; otherwise
        // it's the regular hover cursor so sprite clicks still feel
        // clickable.
        zoom > 1 && (panStateRef.current?.captured ? "cursor-grabbing" : "cursor-grab")
      )}
      style={{
        filter: "drop-shadow(0 16px 26px rgba(0,0,0,0.55)) drop-shadow(0 4px 10px rgba(0,217,146,0.10))",
      }}
      onPointerDown={onMapPointerDown}
      onPointerMove={onMapPointerMove}
      onPointerUp={onMapPointerUp}
      onPointerCancel={onMapPointerUp}
      onWheel={handleWheel}
    >
      {/* Zoom + pan wrapper — wraps BOTH layers so their calibration
          alignment is preserved. The transform applies uniformly to
          the bg image and the coord/sprite layer, so the user can pan
          + zoom without the sprites drifting away from the map.
          Frame, vignette and zoom controls live OUTSIDE this wrapper
          and stay anchored to the visible viewport. */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center",
          willChange: zoom > 1 ? "transform" : undefined,
        }}
      >
      {/* Layer 1: BG IMAGE — never stretched, only base zoom. */}
      <div
        className="absolute inset-0"
        style={{ transform: imgTransform, transformOrigin: "center" }}
      >
        <img
          src={MAP_URL_PRIMARY}
          onError={(ev) => {
            const img = ev.currentTarget;
            if (img.src.indexOf(MAP_URL_PRIMARY) >= 0) {
              img.src = MAP_URL_FALLBACK;
            } else if (img.src.indexOf(MAP_URL_FALLBACK) >= 0) {
              img.src = MAP_URL_FALLBACK_2;
            }
          }}
          alt="Summoner's Rift"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: "saturate(1.10) contrast(1.05) brightness(1.02)",
            imageRendering: "auto",
          }}
          draggable={false}
        />
      </div>

      {/* Layer 2: COORDINATE SPACE — sprites, debug landmarks, lane
          schema. This is the layer the user calibrates by dragging
          landmarks; it stretches independently of the bg image.
          We expose the inverse scale via CSS vars (--inv-sx, --inv-sy)
          so child sprites can counter-scale themselves and stay round
          instead of getting squished by the non-uniform coord scale. */}
      <div
        className="absolute inset-0"
        style={{
          transform: coordTransform,
          transformOrigin: "center",
          // @ts-ignore — custom CSS properties for sprite counter-scale.
          // The inverse now also folds in the user-zoom factor: when
          // the outer wrapper magnifies the map by N×, sprites compute
          // their counter-scale as 1/(cal.scale × N) so they keep a
          // CONSTANT viewport size. Effect on the eye: the rift looks
          // bigger but champion / ward icons don't bloat with it.
          // Without this, a 3× zoom turned each champion sprite into a
          // ~110px blob that ate the lanes.
          "--inv-sx": 1 / (BASE_ZOOM * cal.scaleX * zoom),
          "--inv-sy": 1 / (BASE_ZOOM * cal.scaleY * zoom),
        } as React.CSSProperties}
      >

      {/* Wards */}
      {wards.map((w) => {
        const { nx, ny } = toMapNorm(w.position);
        const Icon = wardIcon(w.wardType);
        const team = teamOf(w.creatorId);
        const tint = team === 100 ? "#5BA8E6" : "#d63336";
        return (
          <div
            key={w.id}
            className="absolute z-[20] pointer-events-none"
            style={{
              left: `${nx * 100}%`, top: `${ny * 100}%`,
              transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
              color: tint,
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-[6px] opacity-50" style={{ background: tint }} />
              <Icon className="relative w-3 h-3 drop-shadow-[0_0_3px_rgba(0,0,0,0.8)]" />
            </div>
          </div>
        );
      })}

      {/* Building destroyed flashes */}
      {buildingFlashes.map((b) => {
        const { nx, ny } = toMapNorm({ x: b.x, y: b.y });
        const winner = b.loserTeam === 100 ? "#d63336" : "#5BA8E6";
        const fade = 1 - b.age / TOWER_FLASH_MS;
        return (
          <div
            key={b.id}
            className="absolute z-[40] pointer-events-none"
            style={{
              left: `${nx * 100}%`, top: `${ny * 100}%`,
              transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
              opacity: Math.max(0, fade),
              color: winner,
            }}
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-[10px]" style={{ background: winner, opacity: fade * 0.6 }} />
              {b.isInhib ? (
                <InhibitorIcon className="relative w-6 h-6" />
              ) : (
                <TowerIcon className="relative w-6 h-6" />
              )}
            </div>
          </div>
        );
      })}

      {/* Kill flash markers */}
      {killFlashes.map((k) => {
        const { nx, ny } = toMapNorm({ x: k.x, y: k.y });
        const tint = k.killerTeam === 100 ? "#5BA8E6" : "#d63336";
        const fade = 1 - k.age / KILL_FLASH_MS;
        const scale = 1 + (k.age / KILL_FLASH_MS) * 0.6;
        return (
          <React.Fragment key={k.id}>
            {/* Outer expanding ring */}
            <div
              className="absolute z-[35] pointer-events-none rounded-full border-2"
              style={{
                left: `${nx * 100}%`, top: `${ny * 100}%`,
                width: 28, height: 28,
                transform: `translate(-50%, -50%) scale(${scale}) scale(var(--inv-sx, 1), var(--inv-sy, 1))`,
                borderColor: tint,
                opacity: fade * 0.6,
              }}
            />
            {/* Center skull */}
            <div
              className="absolute z-[36] pointer-events-none"
              style={{
                left: `${nx * 100}%`, top: `${ny * 100}%`,
                transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
                color: tint,
                opacity: fade,
              }}
            >
              <SkullIcon className="w-4 h-4 drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]" />
            </div>
          </React.Fragment>
        );
      })}

      {/* Objective flash markers (drake / baron / etc.) */}
      {objFlashes.map((o) => {
        const { nx, ny } = toMapNorm({ x: o.x, y: o.y });
        const fade = 1 - o.age / OBJ_FLASH_MS;
        const tint =
          o.kind === "DRAGON" ? dragonColor(o.subType) :
          o.team === 100 ? "#5BA8E6" : "#d63336";
        const Icon = eliteMonsterIcon(o.kind);
        const scale = 1 + (o.age / OBJ_FLASH_MS) * 0.5;
        return (
          <React.Fragment key={o.id}>
            <div
              className="absolute z-[37] pointer-events-none rounded-full"
              style={{
                left: `${nx * 100}%`, top: `${ny * 100}%`,
                width: 36, height: 36,
                transform: `translate(-50%, -50%) scale(${scale}) scale(var(--inv-sx, 1), var(--inv-sy, 1))`,
                background: `radial-gradient(circle, ${tint}88 0%, transparent 70%)`,
                opacity: fade,
              }}
            />
            <div
              className="absolute z-[38] pointer-events-none"
              style={{
                left: `${nx * 100}%`, top: `${ny * 100}%`,
                transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
                color: tint,
                opacity: fade,
              }}
            >
              <Icon className="w-5 h-5 drop-shadow-[0_0_6px_rgba(0,0,0,0.9)]" />
            </div>
          </React.Fragment>
        );
      })}

      {/* Gold popups */}
      {goldFlashes.map((g) => {
        const { nx, ny } = toMapNorm({ x: g.x, y: g.y });
        const fade = 1 - g.age / GOLD_FLASH_MS;
        const yOffset = -((g.age / GOLD_FLASH_MS) * 28); // float upward
        const color = g.team === 100 ? "#9fffc3" : "#ffb38a";
        return (
          <div
            key={g.id}
            className="absolute z-[45] pointer-events-none flex items-center gap-1 font-chakrapetch font-bold tabular-nums text-xs"
            style={{
              left: `${nx * 100}%`, top: `${ny * 100}%`,
              transform: `translate(-50%, calc(-50% + ${yOffset}px)) scale(var(--inv-sx, 1), var(--inv-sy, 1))`,
              color,
              opacity: fade,
              textShadow: "0 0 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.95)",
            }}
          >
            <CoinIcon className="w-3 h-3" />
            <span>+{fmtShortNum(g.amount)}</span>
          </div>
        );
      })}

      {/* Champion sprites */}
      {Array.from({ length: 10 }, (_, i) => i + 1).map((pid) => {
        if (hiddenPids.has(pid)) return null;
        const pos = positions.get(pid);
        if (!pos) return null;
        const sp = staticParticipantByPid(staticMatch, pid);
        if (!sp) return null;
        const { nx, ny } = toMapNorm(pos);
        const teamTint = sp.teamId === 100 ? "#5BA8E6" : "#d63336";
        const m = metricsAt(timeline, pid, timeMs);
        const dead = deathsByVictim.has(pid);
        const isFocused = focusedPid === pid;
        return (
          <button
            key={pid}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFocusPid?.(focusedPid === pid ? null : pid);
            }}
            className="absolute z-[50] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-jade rounded-full"
            style={{
              left: `${nx * 100}%`, top: `${ny * 100}%`,
              transform: "translate(-50%, -50%) scale(var(--inv-sx, 1), var(--inv-sy, 1))",
              // Promote each sprite to its OWN GPU compositing layer
              // ONLY when the user has zoomed in. Without this, the
              // sprite is rasterized inside the coord-layer texture at
              // container resolution — so at 4× zoom the browser just
              // upscales those few raster pixels and the champion icon
              // turns into a mosaic. `will-change: transform` (or a
              // translateZ hint) forces an independent layer the
              // compositor can sample directly at the final on-screen
              // resolution. We gate it on zoom>1 so idle viewing of
              // the map doesn't pay the GPU-memory cost for 10 sprites.
              willChange: zoom > 1 ? "transform" : undefined,
              backfaceVisibility: zoom > 1 ? "hidden" : undefined,
            }}
            title={`${sp.championName} — Lv ${m?.level ?? "?"}`}
          >
            <div className="relative">
              {/* Focus glow */}
              {isFocused && (
                <div
                  className="absolute inset-0 rounded-full -m-2 animate-pulse"
                  style={{ boxShadow: `0 0 0 2px ${teamTint}, 0 0 14px ${teamTint}` }}
                />
              )}
              {/* Outer team ring */}
              <div
                className={cn(
                  "relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center",
                  dead && "grayscale brightness-50"
                )}
                style={{
                  boxShadow: `0 0 0 2px ${teamTint}, 0 0 8px rgba(0,0,0,0.7)`,
                  background: "#040A0C",
                }}
              >
                <img
                  src={`${cdnBaseUrl()}/img/champion/${normalizeChampName(sp.championName)}.png`}
                  alt={sp.championName}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {dead && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <SkullIcon className="w-5 h-5 text-flash/90" />
                  </div>
                )}
              </div>
              {/* Level chip */}
              {m && !dead && (
                <div
                  className="absolute -bottom-1 -right-1 px-1 rounded-sm text-[9px] font-mono font-bold tabular-nums"
                  style={{ background: "#040A0C", color: teamTint, boxShadow: `0 0 0 1px ${teamTint}80` }}
                >
                  {m.level}
                </div>
              )}
            </div>
          </button>
        );
      })}
      {/* Debug calibration overlay — only renders when debug=true.
          Lives in the COORD layer so its markers carry calibration
          along with the player sprites. */}
      <DebugMapOverlay
        enabled={!!debug}
        overrides={debugOverrides ?? {}}
        setOverrides={setDebugOverrides ?? (() => {})}
      />
      </div>{/* /coord layer */}
      </div>{/* /zoom+pan wrapper */}

      {/* Overlays that hug the OUTER (unscaled) square — they should
          frame the visible viewport, not move with the zoomed content. */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(0,217,146,0.18), inset 0 0 28px rgba(0,0,0,0.35)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.30) 100%)",
        }}
      />

      {/* ── Zoom controls — bottom-right floating cluster ─────────
          Magnifying-glass + / − buttons with the current zoom level
          in the middle (click to reset). Glass styling matches the
          dialog's other floating overlays; data-rift-zoom-control
          lets the pan handler ignore drags that start here. */}
      <div
        data-rift-zoom-control
        className="absolute bottom-3 right-3 z-50 flex flex-col gap-1"
      >
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= ZOOM_MAX}
          title="Zoom in"
          className={cn(
            "w-7 h-7 rounded-sm flex items-center justify-center cursor-clicker",
            "bg-black/65 backdrop-blur-sm border border-flash/15",
            "hover:border-jade/45 hover:bg-jade/15 hover:text-jade",
            "text-flash/75 transition-colors",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleZoomReset}
          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          title="Reset zoom (100%)"
          className={cn(
            "w-7 h-7 rounded-sm flex items-center justify-center cursor-clicker",
            "bg-black/65 backdrop-blur-sm border border-flash/15",
            "hover:border-jade/45 hover:bg-jade/15 hover:text-jade",
            "transition-colors",
            zoom > 1
              ? "text-jade font-mono text-[9px] tabular-nums tracking-tight"
              : "text-flash/55",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          {zoom > 1 ? `${Math.round(zoom * 100)}` : <Maximize2 className="w-3 h-3" />}
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_MIN}
          title="Zoom out"
          className={cn(
            "w-7 h-7 rounded-sm flex items-center justify-center cursor-clicker",
            "bg-black/65 backdrop-blur-sm border border-flash/15",
            "hover:border-jade/45 hover:bg-jade/15 hover:text-jade",
            "text-flash/75 transition-colors",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
