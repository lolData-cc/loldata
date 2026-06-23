"use client";

// MatchupOrbit — a 3D constellation of a champion's real lane matchups.
// The subject champion sits at the centre; every opponent it has laned against
// orbits it as a billboarded portrait, tinted + sized by the REAL win rate
// (jade = favourable, red = hard) and tethered to the core by a faint line.
// Drag to spin, scroll to zoom, click a portrait to pick that matchup.
// Pure GPU/WebGL — the parent renders a flat grid when WebGL is unavailable.

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, Image as DreiImage, Line, OrbitControls } from "@react-three/drei";
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

// 44% → red, 50% → muted, 56%+ → jade (the win rate read, as a colour)
function wrColor(wr: number): THREE.Color {
  const t = Math.max(0, Math.min(1, (wr - 44) / 12));
  return t < 0.5 ? MID.clone().lerp(RED, (0.5 - t) * 2) : MID.clone().lerp(JADE, (t - 0.5) * 2);
}

// even spread on a sphere (fibonacci) so the constellation always reads "full"
function fibPos(i: number, n: number, radius: number): [number, number, number] {
  const y = n <= 1 ? 0 : 1 - (i / (n - 1)) * 2; // 1 → -1
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const phi = i * Math.PI * (3 - Math.sqrt(5)); // golden angle
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
  const base = 0.4 + Math.min(0.26, (node.games / 5000) * 0.26); // popularity → size
  const s = selected ? base * 1.55 : hover ? base * 1.22 : base;

  return (
    <group position={position}>
      {/* tether back to the core champion at world-origin */}
      <Line
        points={[
          [0, 0, 0],
          [-position[0], -position[1], -position[2]],
        ]}
        color={color}
        lineWidth={selected ? 1.8 : 0.8}
        transparent
        opacity={selected ? 0.6 : hover ? 0.4 : 0.18}
      />
      <Billboard>
        {/* win-rate halo behind the portrait */}
        <mesh position={[0, 0, -0.03]}>
          <circleGeometry args={[s * 0.64, 44]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.6 : hover ? 0.42 : 0.26} />
        </mesh>
        <Suspense fallback={null}>
          <DreiImage
            url={node.iconUrl}
            scale={[s, s] as unknown as number}
            transparent
            radius={0.12}
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
          />
        </Suspense>
      </Billboard>
    </group>
  );
}

function CenterChampion({ iconUrl }: { iconUrl: string }) {
  return (
    <Billboard>
      <mesh position={[0, 0, -0.04]}>
        <ringGeometry args={[0.62, 0.72, 56]} />
        <meshBasicMaterial color={JADE} transparent opacity={0.65} />
      </mesh>
      <mesh position={[0, 0, -0.05]}>
        <circleGeometry args={[0.66, 48]} />
        <meshBasicMaterial color={"#040A0C"} />
      </mesh>
      <Suspense fallback={null}>
        <DreiImage url={iconUrl} scale={[1.05, 1.05] as unknown as number} transparent radius={0.18} />
      </Suspense>
    </Billboard>
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
        <Suspense fallback={null}>
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
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={5}
          maxDistance={12}
          autoRotate
          autoRotateSpeed={0.55}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
