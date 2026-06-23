"use client";

// MatchupOrbit — a 3D constellation of a champion's real lane matchups, floating
// in the void. The subject sits at the centre; every opponent orbits it, tethered
// by a faint win-rate-coloured line. Drag to spin, scroll to zoom, click a face.
//
// The WebGL Canvas draws only the structure (tether lines + the centre ring) and
// owns the camera/rotation. Champion faces are plain DOM <img> in an overlay that
// I project onto the 3D node positions myself each frame (useFrame): cdn2 icons
// can't be reliable WebGL textures (Cloudflare serves a cached copy without the
// CORS header), and a DOM <img> can't throw inside the render loop. The overlay
// container is pointer-events:none so dragging passes through to the canvas; each
// face is pointer-events:auto so it stays clickable.

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export type MatchupNode = {
  key: string;
  id: string;
  name: string;
  winrate: number;
  games: number;
  iconUrl: string;
};

export function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

const JADE = new THREE.Color("#00d992");
const RED = new THREE.Color("#ff6286");
const MID = new THREE.Color("#7c8b92");

function wrColor(wr: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (wr - 44) / 12));
  return t < 0.5 ? MID.clone().lerp(RED, (0.5 - t) * 2) : MID.clone().lerp(JADE, (t - 0.5) * 2);
}
const hexFor = (wr: number) => "#" + wrColor(wr).getHexString();

function fibPos(i: number, n: number, radius: number): [number, number, number] {
  const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = i * Math.PI * (3 - Math.sqrt(5));
  return [radius * Math.cos(phi) * r, radius * y, radius * Math.sin(phi) * r];
}

function Tethers({ nodes, radius }: { nodes: MatchupNode[]; radius: number }) {
  return (
    <>
      {nodes.map((n, i) => {
        const p = fibPos(i, nodes.length, radius);
        return (
          <Line key={n.key} points={[[0, 0, 0], p]} color={hexFor(n.winrate)} lineWidth={0.8} transparent opacity={0.16} />
        );
      })}
    </>
  );
}

// Projects the centre + every node's 3D position to screen pixels each frame and
// writes them straight onto the overlay DOM nodes (no per-frame React state).
function Projector({
  nodes,
  radius,
  facesRef,
  centerRef,
  selectedKey,
  hoverKey,
}: {
  nodes: MatchupNode[];
  radius: number;
  facesRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
  centerRef: React.MutableRefObject<HTMLDivElement | null>;
  selectedKey: string | null;
  hoverKey: string | null;
}) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    if (centerRef.current) {
      v.set(0, 0, 0).project(camera);
      centerRef.current.style.transform = `translate(-50%,-50%) translate(${(v.x * 0.5 + 0.5) * size.width}px, ${(-v.y * 0.5 + 0.5) * size.height}px)`;
    }
    for (let i = 0; i < nodes.length; i++) {
      const el = facesRef.current.get(nodes[i].key);
      if (!el) continue;
      const p = fibPos(i, nodes.length, radius);
      v.set(p[0], p[1], p[2]).project(camera);
      const depth = (v.z + 1) / 2; // 0 near → 1 far
      let scale = THREE.MathUtils.clamp(1.32 - depth, 0.55, 1.25);
      if (nodes[i].key === selectedKey) scale *= 1.4;
      else if (nodes[i].key === hoverKey) scale *= 1.18;
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(-50%,-50%) translate(${x}px, ${y}px) scale(${scale})`;
      el.style.opacity = String(THREE.MathUtils.clamp(1.55 - depth * 1.25, 0.4, 1));
      el.style.zIndex = String((nodes[i].key === selectedKey ? 5000 : 0) + 2000 - Math.round(depth * 1000));
    }
  });
  return null;
}

export function MatchupOrbit({
  subjectIconUrl,
  nodes,
  selectedKey,
  onSelect,
  className,
}: {
  subjectIconUrl: string;
  nodes: MatchupNode[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  className?: string;
}) {
  const radius = nodes.length > 22 ? 3.2 : nodes.length > 12 ? 2.8 : 2.3;
  const facesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const centerRef = useRef<HTMLDivElement | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  return (
    <div className={cn("relative", className)}>
      <Canvas
        camera={{ position: [0, 0.2, 7.8], fov: 42 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1} />
        <Tethers nodes={nodes} radius={radius} />
        <Projector
          nodes={nodes}
          radius={radius}
          facesRef={facesRef}
          centerRef={centerRef}
          selectedKey={selectedKey}
          hoverKey={hoverKey}
        />
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={5}
          maxDistance={13}
          autoRotate
          autoRotateSpeed={0.5}
          rotateSpeed={0.6}
        />
      </Canvas>

      {/* DOM face overlay — container ignores pointer events so drags reach the
          canvas; each face re-enables them so it stays clickable. */}
      <div className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
        {/* centre champion */}
        <div ref={centerRef} className="absolute left-0 top-0" style={{ willChange: "transform" }}>
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 74, height: 74, boxShadow: "0 0 0 2px rgba(0,217,146,0.75), 0 0 32px rgba(0,217,146,0.45)" }}
          />
          <img
            src={subjectIconUrl}
            alt=""
            draggable={false}
            className="relative rounded-full object-cover"
            style={{ width: 60, height: 60 }}
          />
        </div>

        {/* opponent faces */}
        {nodes.map((n) => {
          const c = hexFor(n.winrate);
          const sz = 38 + Math.min(20, (n.games / 5000) * 20);
          return (
            <div
              key={n.key}
              ref={(el) => {
                if (el) facesRef.current.set(n.key, el);
                else facesRef.current.delete(n.key);
              }}
              className="absolute left-0 top-0 pointer-events-auto cursor-pointer"
              style={{ willChange: "transform" }}
              title={`${n.name} · ${n.winrate.toFixed(1)}%`}
              onMouseEnter={() => setHoverKey(n.key)}
              onMouseLeave={() => setHoverKey((k) => (k === n.key ? null : k))}
              onClick={() => onSelect(n.key)}
            >
              <img
                src={n.iconUrl}
                alt={n.name}
                draggable={false}
                className="block rounded-lg object-cover"
                style={{ width: sz, height: sz, boxShadow: `0 0 0 2px ${c}, 0 0 12px ${c}66` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
