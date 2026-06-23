"use client";

// MatchupOrbit — a 3D constellation of a champion's real lane matchups.
// The subject champion sits at the centre; every opponent it has laned against
// orbits it, tinted + sized by the REAL win rate (jade = favourable, red = hard)
// and tethered to the core by a faint line. Drag to spin, scroll to zoom, click
// a node to pick that matchup.
//
// Champion faces are rendered as DOM <img> via drei <Html> (auto-projected onto
// the 3D node positions) rather than WebGL textures: the CDN's champion icons
// can't be uploaded as cross-origin GPU textures reliably (Cloudflare serves a
// cached copy without the CORS header), so a plain DOM <img> is the robust path
// — and it can't throw inside the render loop. The coloured halo behind each
// face (a WebGL mesh) is the click/hover target. The parent wraps this in an
// error boundary + renders a flat grid when WebGL is unavailable.

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type MatchupNode = {
  key: string; // opponent champion key (numeric, as string)
  id: string; // opponent champion id (for the icon)
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

function fibPos(i: number, n: number, radius: number): [number, number, number] {
  const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = i * Math.PI * (3 - Math.sqrt(5));
  return [radius * Math.cos(phi) * r, radius * y, radius * Math.sin(phi) * r];
}

function Node({
  node,
  position,
  selected,
  onSelect,
}: {
  node: MatchupNode;
  position: [number, number, number];
  selected: boolean;
  onSelect: (key: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const color = useMemo(() => wrColor(node.winrate), [node.winrate]);
  const hex = useMemo(() => "#" + color.getHexString(), [color]);
  const base = 0.42 + Math.min(0.26, (node.games / 5000) * 0.26);
  const s = selected ? base * 1.5 : hover ? base * 1.2 : base;
  const px = 40 + Math.min(22, (node.games / 5000) * 22); // face px, by popularity

  return (
    <group position={position}>
      <Line
        points={[
          [0, 0, 0],
          [-position[0], -position[1], -position[2]],
        ]}
        color={color}
        lineWidth={selected ? 1.8 : 0.8}
        transparent
        opacity={selected ? 0.6 : hover ? 0.4 : 0.16}
      />
      {/* coloured halo + click/hover target (WebGL) */}
      <Billboard>
        <mesh
          onPointerOver={(e: any) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = "auto";
          }}
          onClick={(e: any) => {
            e.stopPropagation();
            onSelect(node.key);
          }}
        >
          <circleGeometry args={[s * 0.82, 44]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.5 : hover ? 0.4 : 0.24} />
        </mesh>
      </Billboard>
      {/* champion face (DOM, no CORS) — pointer-events off so the halo handles clicks */}
      <Html center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <img
          src={node.iconUrl}
          alt={node.name}
          draggable={false}
          style={{
            width: `${px}px`,
            height: `${px}px`,
            borderRadius: "10px",
            objectFit: "cover",
            boxShadow: `0 0 0 2px ${hex}, 0 0 14px ${hex}77`,
            transform: selected ? "scale(1.18)" : hover ? "scale(1.08)" : "scale(1)",
            transition: "transform .15s ease",
            opacity: 0.97,
          }}
        />
      </Html>
    </group>
  );
}

function CenterChampion({ iconUrl }: { iconUrl: string }) {
  return (
    <group>
      <Billboard>
        <mesh position={[0, 0, -0.05]}>
          <ringGeometry args={[0.66, 0.78, 56]} />
          <meshBasicMaterial color={JADE} transparent opacity={0.7} />
        </mesh>
      </Billboard>
      <Html center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <img
          src={iconUrl}
          alt=""
          draggable={false}
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "13px",
            objectFit: "cover",
            boxShadow: "0 0 0 2px #00d992, 0 0 26px #00d99299",
          }}
        />
      </Html>
    </group>
  );
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
  const radius = nodes.length > 22 ? 3.1 : nodes.length > 12 ? 2.7 : 2.3;
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0.3, 7.4], fov: 42 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={1} />
        <CenterChampion iconUrl={subjectIconUrl} />
        {nodes.map((n, i) => (
          <Node
            key={n.key}
            node={n}
            position={fibPos(i, nodes.length, radius)}
            selected={n.key === selectedKey}
            onSelect={onSelect}
          />
        ))}
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={5}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.5}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
