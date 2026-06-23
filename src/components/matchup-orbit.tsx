"use client";

// MatchupOrbit — a 3D constellation of a champion's real lane matchups.
// The subject champion sits at the centre; every opponent it has laned against
// orbits it as a billboarded portrait, tinted + sized by the REAL win rate
// (jade = favourable, red = hard) and tethered to the core by a faint line.
// Drag to spin, scroll to zoom, click a portrait to pick that matchup.
//
// Texture loading is fault-tolerant: portraits load with crossOrigin so they
// can be GPU textures (the CDN sends ACAO:*), and a failed/blocked load just
// drops to the coloured halo instead of throwing — a thrown texture error in
// R3F would otherwise take down the whole <Canvas>. The parent ALSO wraps this
// in an error boundary + renders a flat grid when WebGL is unavailable.

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Billboard, Line, OrbitControls } from "@react-three/drei";
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

// Fault-tolerant champion portrait: loads the icon as a CORS texture and renders
// a plane; on ANY load error it renders nothing (the node's coloured halo stays).
// Never suspends, never throws → never crashes the Canvas.
function ChampPortrait({ url, size }: { url: string; size: number }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (t) => {
        if (cancelled) { t.dispose(); return; }
        (t as any).colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      },
      undefined,
      () => { /* swallow — keep the halo only */ }
    );
    return () => { cancelled = true; };
  }, [url]);
  if (!tex) return null;
  return (
    <mesh scale={[size, size, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
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
  const base = 0.4 + Math.min(0.26, (node.games / 5000) * 0.26);
  const s = selected ? base * 1.55 : hover ? base * 1.22 : base;

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
        opacity={selected ? 0.6 : hover ? 0.4 : 0.18}
      />
      <Billboard>
        {/* halo = the always-present click/hover target (survives a failed portrait) */}
        <mesh
          position={[0, 0, -0.03]}
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
          <circleGeometry args={[s * 0.66, 44]} />
          <meshBasicMaterial color={color} transparent opacity={selected ? 0.6 : hover ? 0.42 : 0.26} />
        </mesh>
        <ChampPortrait url={node.iconUrl} size={s} />
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
      <ChampPortrait url={iconUrl} size={1.05} />
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
          autoRotateSpeed={0.55}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}
