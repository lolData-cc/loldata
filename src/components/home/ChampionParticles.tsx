"use client";

// ChampionParticles — a champion splash re-materialised as ~25k glowing points
// in 3D, slowly rotating. The source splash is a near-monochrome figure on a
// black field, so we threshold by luminance (the dark background drops out) and
// use that luminance as the Z depth — the lit edges sit forward, giving real
// relief as the cloud turns. Pure GPU (WebGL); if hardware accel / WebGL isn't
// available, or the user prefers reduced motion, it degrades to the flat splash.

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";

const JADE = new THREE.Color("#00d992");
const HOT = new THREE.Color("#e6fff6");

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch {
    return false;
  }
}

type Sampled = { positions: Float32Array; colors: Float32Array };

async function sampleImage(
  src: string,
  opts: { width: number; threshold: number; scale: number; depth: number }
): Promise<Sampled> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const W = opts.width;
  const H = Math.max(1, Math.round((img.height / img.width) * W));
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  const pos: number[] = [];
  const col: number[] = [];
  const aspect = W / H;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const a = data[idx + 3] / 255;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (a < 0.5 || lum < opts.threshold) continue;
      const wx = (x / W - 0.5) * opts.scale * aspect;
      const wy = (0.5 - y / H) * opts.scale;
      const wz = (lum - 0.4) * opts.depth + (Math.random() - 0.5) * 0.18;
      pos.push(wx, wy, wz);
      const t = Math.min(1, (lum - opts.threshold) / (1 - opts.threshold));
      const c = JADE.clone().lerp(HOT, t * t * 0.85);
      col.push(c.r, c.g, c.b);
    }
  }
  return { positions: new Float32Array(pos), colors: new Float32Array(col) };
}

function Cloud({ src }: { src: string }) {
  const ref = useRef<THREE.Points>(null);
  const [geo, setGeo] = useState<Sampled | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let alive = true;
    sampleImage(src, { width: 320, threshold: 0.15, scale: 9, depth: 2.4 })
      .then((d) => alive && setGeo(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [src]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, dt) => {
    const p = ref.current;
    if (!p) return;
    p.rotation.y += Math.min(dt, 0.05) * 0.16; // slow spin, frame-rate independent
    // ease toward a small mouse-driven tilt so it feels reactive, not on rails
    const targetX = mouse.current.y * 0.16;
    const targetYoff = mouse.current.x * 0.12;
    p.rotation.x += (targetX - p.rotation.x) * 0.04;
    p.position.x += (targetYoff - p.position.x) * 0.04;
    p.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.12; // gentle float
  });

  if (!geo) return null;
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[geo.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
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

export function ChampionParticles({ src = "/img/Yasuo.png", className }: { src?: string; className?: string }) {
  const [mode, setMode] = useState<"loading" | "gl" | "flat">("loading");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(supportsWebGL() && !reduce ? "gl" : "flat");
  }, []);

  // light fallback (no GPU / reduced motion): the flat splash, dimmed
  if (mode === "flat") {
    return (
      <img
        src={src}
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
        camera={{ position: [0, 0, 12], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Cloud src={src} />
      </Canvas>
    </div>
  );
}
