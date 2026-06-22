"use client";

// PointCloudStatue — a real 3D model (.glb) re-materialised as a glowing point
// cloud "statue" that slowly turns, as if the page were orbiting an enormous
// monument. Unlike the 2D-image sampler, this samples the actual mesh SURFACE in
// 3D, so there's no flat-image tell — every angle is real geometry. Pure GPU;
// degrades to a flat splash without WebGL or under prefers-reduced-motion.
//
// The .glb is provided by the host app (champion models convert from League's
// proprietary format via modelviewer.lol / lol2gltf and live in /public/models).

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import * as THREE from "three";
import { cn } from "@/lib/utils";

const JADE = new THREE.Color("#00d992");
const HOT = new THREE.Color("#e8fff7");

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

type Built = { positions: Float32Array; colors: Float32Array };

// Sample the whole scene's mesh surfaces into one centred, unit-scaled cloud.
function buildCloud(scene: THREE.Object3D, total: number): Built {
  scene.updateWorldMatrix(true, true);
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.geometry && (m.geometry as THREE.BufferGeometry).attributes?.position) meshes.push(m);
  });
  if (!meshes.length) return { positions: new Float32Array(), colors: new Float32Array() };

  // budget per mesh ∝ vertex count (a cheap proxy for size/detail)
  const weights = meshes.map((m) => (m.geometry as THREE.BufferGeometry).attributes.position.count);
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;

  const pos: number[] = [];
  const tmp = new THREE.Vector3();
  for (let mi = 0; mi < meshes.length; mi++) {
    const mesh = meshes[mi];
    const budget = Math.max(1, Math.round((weights[mi] / wsum) * total));
    let sampler: MeshSurfaceSampler;
    try {
      sampler = new MeshSurfaceSampler(mesh).build();
    } catch {
      continue;
    }
    for (let i = 0; i < budget; i++) {
      sampler.sample(tmp);
      tmp.applyMatrix4(mesh.matrixWorld);
      pos.push(tmp.x, tmp.y, tmp.z);
    }
  }

  // centre + normalise to a consistent height regardless of the model's units
  const n = pos.length / 3;
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) box.expandByPoint(v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = 7 / Math.max(size.y, 0.0001); // ~7 world units tall
  const minY = box.min.y;

  const positions = new Float32Array(pos.length);
  const colors = new Float32Array(pos.length);
  for (let i = 0; i < n; i++) {
    const x = (pos[i * 3] - center.x) * scale;
    const y = (pos[i * 3 + 1] - center.y) * scale;
    const z = (pos[i * 3 + 2] - center.z) * scale;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    // jade base; brighter toward the top + a little noise → reads as form
    const h = (pos[i * 3 + 1] - minY) / Math.max(size.y, 0.0001);
    const t = Math.min(1, h * 0.6 + Math.random() * 0.25);
    const c = JADE.clone().lerp(HOT, t * t * 0.7);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  return { positions, colors };
}

function StatueCloud({ src, density }: { src: string; density: number }) {
  const { scene } = useGLTF(src);
  const built = useMemo(() => buildCloud(scene, density), [scene, density]);
  const ref = useRef<THREE.Points>(null);
  const mouse = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => (mouse.current = (e.clientX / window.innerWidth) * 2 - 1);
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, dt) => {
    const p = ref.current;
    if (!p) return;
    p.rotation.y += Math.min(dt, 0.05) * 0.22; // the statue turns
    p.rotation.y += (mouse.current * 0.0008); // a touch of mouse drift
    p.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.12;
  });

  if (!built.positions.length) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[built.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[built.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function PointCloudStatue({
  src,
  fallbackImg = "/img/Yasuo.png",
  density = 85000,
  className,
}: {
  src: string;
  fallbackImg?: string;
  density?: number;
  className?: string;
}) {
  const [mode, setMode] = useState<"loading" | "gl" | "flat">("loading");
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(supportsWebGL() && !reduce ? "gl" : "flat");
  }, []);

  if (mode === "flat") {
    return (
      <img
        src={fallbackImg}
        alt=""
        aria-hidden
        draggable={false}
        className={cn("h-full w-full object-cover object-top opacity-45", className)}
      />
    );
  }
  if (mode === "loading") return <div className={className} />;

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0.4, 9.4], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <StatueCloud src={src} density={density} />
        </Suspense>
      </Canvas>
    </div>
  );
}
