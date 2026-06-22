"use client";

// PointCloudStatue — a real 3D champion model (.glb) re-materialised as a glowing
// point cloud "statue" that slowly turns, as if the page were orbiting an enormous
// monument. We sample the actual mesh SURFACE in 3D (no flat-image tell) — and,
// crucially, we POSE it first: the .glb ships in the rig's bind pose, so we apply
// an animation clip (skinning is baked per-vertex) so the statue stands in its
// combat stance, not a T-pose. Pure GPU; degrades to a flat splash without WebGL
// or under prefers-reduced-motion.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
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

// Bake a SkinnedMesh's CURRENT pose (after the mixer has posed the skeleton) into
// a static geometry so the surface sampler hits the posed surface, not bind pose.
function bakeSkinnedGeometry(skinned: THREE.SkinnedMesh): THREE.BufferGeometry {
  skinned.skeleton.update();
  const src = skinned.geometry;
  const srcPos = src.attributes.position;
  const arr = new Float32Array(srcPos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < srcPos.count; i++) {
    v.fromBufferAttribute(srcPos, i);
    skinned.applyBoneTransform(i, v);
    arr[i * 3] = v.x;
    arr[i * 3 + 1] = v.y;
    arr[i * 3 + 2] = v.z;
  }
  const baked = new THREE.BufferGeometry();
  baked.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  if (src.index) baked.setIndex(src.index.clone());
  return baked;
}

// total triangle-surface area of a geometry — used to spread sample points by
// AREA (uniform density), so small dense meshes (daggers) don't over-saturate.
function surfaceArea(geo: THREE.BufferGeometry): number {
  const pos = geo.attributes.position;
  const idx = geo.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let area = 0;
  const tri = (i0: number, i1: number, i2: number) => {
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    area += ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
  };
  if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
  else for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
  return area;
}

function buildCloud(
  scene: THREE.Object3D,
  animations: THREE.AnimationClip[],
  opts: { total: number; clipName?: string; clipTime: number }
): Built {
  // clone (skeleton-aware) so we never mutate the cached gltf, then pose it
  const root = cloneSkinned(scene);
  if (animations?.length) {
    const clip =
      (opts.clipName && animations.find((a) => a.name === opts.clipName)) || animations[0];
    if (clip) {
      const mixer = new THREE.AnimationMixer(root);
      mixer.clipAction(clip).play();
      mixer.setTime(THREE.MathUtils.clamp(opts.clipTime, 0, 1) * clip.duration);
    }
  }
  root.updateMatrixWorld(true);

  // each entry = the geometry we'll sample (baked to the posed surface if skinned),
  // its world matrix, and its surface area (for area-proportional budgeting)
  type Entry = { geo: THREE.BufferGeometry; matrix: THREE.Matrix4; area: number };
  const entries: Entry[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !(m.geometry as THREE.BufferGeometry)?.attributes?.position) return;
    const geo = (m as THREE.SkinnedMesh).isSkinnedMesh
      ? bakeSkinnedGeometry(m as THREE.SkinnedMesh)
      : (m.geometry as THREE.BufferGeometry);
    entries.push({ geo, matrix: m.matrixWorld.clone(), area: Math.max(surfaceArea(geo), 1e-6) });
  });
  if (!entries.length) return { positions: new Float32Array(), colors: new Float32Array() };

  const areaSum = entries.reduce((s, e) => s + e.area, 0) || 1;

  const pos: number[] = [];
  const tmp = new THREE.Vector3();
  for (const e of entries) {
    const budget = Math.max(1, Math.round((e.area / areaSum) * opts.total));
    let sampler: MeshSurfaceSampler;
    try {
      sampler = new MeshSurfaceSampler(new THREE.Mesh(e.geo)).build();
    } catch {
      continue;
    }
    for (let i = 0; i < budget; i++) {
      sampler.sample(tmp);
      tmp.applyMatrix4(e.matrix);
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
  const scale = 7 / Math.max(size.y, 0.0001);
  const minY = box.min.y;

  const positions = new Float32Array(pos.length);
  const colors = new Float32Array(pos.length);
  for (let i = 0; i < n; i++) {
    positions[i * 3] = (pos[i * 3] - center.x) * scale;
    positions[i * 3 + 1] = (pos[i * 3 + 1] - center.y) * scale;
    positions[i * 3 + 2] = (pos[i * 3 + 2] - center.z) * scale;
    const h = (pos[i * 3 + 1] - minY) / Math.max(size.y, 0.0001);
    const t = Math.min(1, h * 0.7 + Math.random() * 0.12);
    const c = JADE.clone().lerp(HOT, t * t * 0.4);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  return { positions, colors };
}

function StatueCloud({
  src,
  density,
  clipName,
  clipTime,
}: {
  src: string;
  density: number;
  clipName?: string;
  clipTime: number;
}) {
  const { scene, animations } = useGLTF(src);
  const built = useMemo(
    () => buildCloud(scene, animations, { total: density, clipName, clipTime }),
    [scene, animations, density, clipName, clipTime]
  );
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
    p.rotation.y += Math.min(dt, 0.05) * 0.22;
    p.rotation.y += mouse.current * 0.0008;
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
        opacity={0.85}
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
  clipName,
  clipTime = 0.35,
  className,
}: {
  src: string;
  fallbackImg?: string;
  density?: number;
  clipName?: string; // animation clip to pose; defaults to the first clip
  clipTime?: number; // 0..1 fraction along the clip to freeze the pose at
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
          <StatueCloud src={src} density={density} clipName={clipName} clipTime={clipTime} />
        </Suspense>
      </Canvas>
    </div>
  );
}
