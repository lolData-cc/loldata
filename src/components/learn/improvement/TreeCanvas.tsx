import { useMemo, useRef, useState } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Canvas, useFrame } from "@react-three/fiber"
import { Line, Html, Billboard, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import { RoleTopIcon, RoleJungleIcon, RoleMidIcon, RoleAdcIcon, RoleSupportIcon } from "@/components/ui/roleicons"
import type { TreeData, TreeNode } from "@/hooks/useImprovementTree"

// role → the glowing emblem shown inside the root node
const ROLE_ICON: Record<string, any> = {
  TOP: RoleTopIcon, JUNGLE: RoleJungleIcon, MID: RoleMidIcon, ADC: RoleAdcIcon, SUPPORT: RoleSupportIcon,
}

const COLOR = { complete: "#00d992", progress: "#FFB615", locked: "#39544d" } as const
const c3 = (hex: string) => new THREE.Color(hex)

type Kind = "root" | "category" | "leaf"
type RNode = {
  id: string; kind: Kind; pos: [number, number, number]; color: string; fill: number
  state: "locked" | "progress" | "complete"; title: string; short: string; progress: number; seed: number
}
type REdge = { from: [number, number, number]; to: [number, number, number]; color: string; lit: boolean }

const fillOf = (n: TreeNode) => (n.threshold > 0 ? Math.min(1, n.progress / n.threshold) : n.progress)

// ── layout: root at origin → category hubs on a ring → leaves fanned beyond ──
export function layoutTree(data: TreeData): { nodes: RNode[]; edges: REdge[] } {
  const R1 = 3.5, R2 = 6.6 // more breathing room between hubs and their leaves
  const rootPos: [number, number, number] = [0, 0, 0]
  const nodes: RNode[] = []
  const edges: REdge[] = []

  const overallFill = data.nodes.length ? data.nodes.reduce((s, n) => s + fillOf(n), 0) / data.nodes.length : 0
  nodes.push({ id: "root", kind: "root", pos: rootPos, color: COLOR.complete, fill: overallFill, state: "complete", title: data.title, short: data.tagline, progress: overallFill, seed: 0 })

  data.categories.forEach((cat, i) => {
    const ang = (i / data.categories.length) * Math.PI * 2 + Math.PI / 4
    const z = (i % 2 ? 1 : -1) * 1.7 // real depth so rotation reads as 3D
    const cpos: [number, number, number] = [Math.cos(ang) * R1, Math.sin(ang) * R1, z]
    const kids = data.nodes.filter((n) => n.category === cat.id)
    const done = kids.filter((k) => k.state === "complete").length
    const anyProg = kids.some((k) => k.state !== "locked")
    const cstate = kids.length && done === kids.length ? "complete" : anyProg ? "progress" : "locked"
    const cfill = kids.length ? kids.reduce((s, k) => s + fillOf(k), 0) / kids.length : 0
    nodes.push({ id: `cat:${cat.id}`, kind: "category", pos: cpos, color: COLOR[cstate], fill: cfill, state: cstate as any, title: cat.title, short: cat.blurb, progress: done / Math.max(1, kids.length), seed: i * 1.7 })
    edges.push({ from: rootPos, to: cpos, color: COLOR[cstate], lit: anyProg })

    kids.forEach((n, j) => {
      const a = ang + (j - (kids.length - 1) / 2) * 0.52
      const lz = z + (j % 2 ? 1.5 : -1.5)
      const lpos: [number, number, number] = [Math.cos(a) * R2, Math.sin(a) * R2, lz]
      nodes.push({ id: n.id, kind: "leaf", pos: lpos, color: COLOR[n.state], fill: fillOf(n), state: n.state, title: n.title, short: n.short, progress: n.progress, seed: i * 3 + j })
      edges.push({ from: cpos, to: lpos, color: COLOR[n.state], lit: n.state !== "locked" })
    })
  })
  return { nodes, edges }
}

// radial-gradient sprite texture → fake bloom halo behind each node
function useHalo() {
  return useMemo(() => {
    const s = 128
    const cv = document.createElement("canvas"); cv.width = cv.height = s
    const ctx = cv.getContext("2d")!
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s)
    const tex = new THREE.CanvasTexture(cv); tex.needsUpdate = true
    return tex
  }, [])
}

// rasterize a role SVG component → a crisp, colored texture (memoized per icon)
function useIconTexture(Icon: any, colorHex: string, px = 192) {
  return useMemo(() => {
    if (!Icon) return null
    const svg = renderToStaticMarkup(<Icon width={px} height={px} style={{ color: colorHex }} />)
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)
    const tex = new THREE.TextureLoader().load(url)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [Icon, colorHex, px])
}

// the root's role emblem: a billboarded textured plane (a real 3D object, so it
// scales EXACTLY with the cube on zoom) + a soft additive bloom copy behind it
function RootEmblem({ Icon, size }: { Icon: any; size: number }) {
  const tex = useIconTexture(Icon, "#0c6e4a")
  if (!tex) return null
  return (
    <Billboard>
      <mesh raycast={() => null} renderOrder={11} scale={size * 1.18}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent opacity={0.28} depthWrite={false} depthTest={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh raycast={() => null} renderOrder={12} scale={size}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={tex} transparent depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
    </Billboard>
  )
}

function NodeMesh({ n, hovered, selected, halo, rootIcon, onOver, onOut, onClick }: {
  n: RNode; hovered: boolean; selected: boolean; halo: THREE.Texture; rootIcon?: any
  onOver: () => void; onOut: () => void; onClick: () => void
}) {
  const RootIcon = rootIcon
  const mesh = useRef<THREE.Mesh>(null!)
  const shell = useRef<THREE.Mesh>(null!)
  const sprite = useRef<THREE.Sprite>(null!)
  const base = n.kind === "root" ? 0.7 : n.kind === "category" ? 0.5 : 0.36
  const hit = base * 2.0 // fixed hitbox radius — never scales
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const hoverK = hovered ? 1.22 : selected ? 1.12 : 1
    const pulse = n.state === "complete" ? 1 + Math.sin(t * 2 + n.seed) * 0.05 : 1
    const sc = base * hoverK * pulse
    if (mesh.current) {
      mesh.current.scale.setScalar(sc)
      mesh.current.rotation.y += 0.005; mesh.current.rotation.x += 0.002
      ;(mesh.current.material as THREE.MeshStandardMaterial).emissiveIntensity = (n.state === "locked" ? 0.14 : 0.5 + n.fill * 0.9) * (hovered ? 1.5 : 1)
    }
    if (shell.current) {
      shell.current.scale.setScalar(sc * 1.5)
      shell.current.rotation.y -= 0.007; shell.current.rotation.z += 0.003
      ;(shell.current.material as THREE.MeshBasicMaterial).opacity = (n.state === "locked" ? 0.1 : 0.2 + n.fill * 0.14) * (hovered ? 1.6 : 1)
    }
    if (sprite.current) {
      sprite.current.scale.setScalar(base * 4.8 * (hovered ? 1.3 : 1) * pulse)
      ;(sprite.current.material as THREE.SpriteMaterial).opacity = (n.state === "locked" ? 0.05 : 0.12 + n.fill * 0.24) * (hovered ? 1.6 : 1)
    }
  })
  const labelTone = n.state === "complete" ? "text-jade/85" : n.state === "progress" ? "text-[#FFB615]/85" : "text-flash/50"
  const hair = n.state === "complete" ? "rgba(0,217,146,0.42)" : n.state === "progress" ? "rgba(255,182,21,0.42)" : "rgba(215,216,217,0.18)"
  const labelText = n.kind === "leaf"
    ? "font-mono text-[10px] tracking-[0.04em] text-flash/85"
    : cn("font-chakrapetch font-bold text-[11px] uppercase tracking-[0.09em]", hovered ? "text-flash/95" : labelTone)
  return (
    <group position={n.pos}>
      <sprite ref={sprite} raycast={() => null}>
        <spriteMaterial map={halo} color={c3(n.color)} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* wireframe shell — a techy outer lattice, counter-rotating */}
      <mesh ref={shell} raycast={() => null}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={c3(n.color)} wireframe transparent depthWrite={false} />
      </mesh>
      {/* solid emissive core */}
      <mesh ref={mesh} raycast={() => null}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={c3(n.color)} emissive={c3(n.color)} emissiveIntensity={0.5} metalness={0.45} roughness={0.28} flatShading />
      </mesh>
      {/* root — the role's emblem glowing INSIDE the cube, always screen-facing.
          a real 3D plane (not an Html overlay) so it holds scale on zoom */}
      {n.kind === "root" && RootIcon && <RootEmblem Icon={RootIcon} size={base * 1.25} />}
      {/* the ONLY raycastable: a fixed invisible hitbox → visible parts scale/rotate without hover flicker */}
      <mesh onPointerOver={(e) => { e.stopPropagation(); onOver() }} onPointerOut={onOut} onClick={(e) => { e.stopPropagation(); onClick() }}>
        <sphereGeometry args={[hit, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* framed cyber label chip (category + root always; leaves on hover) */}
      {(n.kind !== "leaf" || hovered) && (
        <Html center distanceFactor={n.kind === "leaf" ? 12 : 14} position={[0, -(hit + 0.42), 0]} pointerEvents="none" zIndexRange={[6, 0]}>
          <div className="flex items-center gap-1.5 whitespace-nowrap select-none rounded-[3px] px-2 py-[3px] backdrop-blur-[2px]"
            style={{ background: "rgba(4,10,12,0.7)", boxShadow: `inset 0 0 0 1px ${hair}, 0 3px 12px -4px rgba(0,0,0,0.7), 0 0 18px -8px ${n.color}` }}>
            <span className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: n.color, boxShadow: `0 0 6px ${n.color}` }} />
            <span className={labelText}>{n.title}</span>
          </div>
        </Html>
      )}
    </group>
  )
}

// hover HUD — a FIXED DOM card outside the canvas (never an Html-at-cursor, which
// would steal the pointer on mount/unmount and cause the hover flicker).
function HudCard({ n }: { n: RNode }) {
  return (
    <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[264px] rounded-md px-3.5 py-2.5 bg-[rgba(4,10,12,0.92)] backdrop-blur-md shadow-[0_0_0_1px_rgba(0,217,146,0.28),0_0_24px_-6px_rgba(0,217,146,0.42)]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-chakrapetch font-bold text-[13px] text-flash/95 leading-tight truncate">{n.title}</span>
        <span className="font-chakrapetch font-bold text-[14px] tabular-nums shrink-0" style={{ color: n.color }}>{Math.round(n.progress * 100)}%</span>
      </div>
      <p className="font-jetbrains text-[10.5px] leading-snug text-flash/55">{n.short}</p>
      <div className="mt-2 h-1 rounded-full bg-black/50 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${n.fill * 100}%`, background: n.color, boxShadow: `0 0 8px ${n.color}` }} />
      </div>
      {n.kind === "leaf" && <p className="font-mono text-[8.5px] tracking-[0.12em] uppercase text-flash/25 mt-1.5">click the node for the full breakdown</p>}
    </div>
  )
}

// a lit connection — a soft neon tube (wide faint glow + thin bright core that
// breathes gently). No dashes, no travelling ball — just a clean glowing link.
function GlowLine({ from, to, color, seed }: { from: number[]; to: number[]; color: string; seed: number }) {
  const core = useRef<any>(null)
  useFrame((s) => {
    const m = core.current?.material
    if (m) m.opacity = 0.5 + 0.22 * Math.sin(s.clock.elapsedTime * 1.2 + seed)
  })
  const pts: [[number, number, number], [number, number, number]] = [from as [number, number, number], to as [number, number, number]]
  return (
    <>
      <Line points={pts} color={c3(color)} lineWidth={4} transparent opacity={0.1} />
      <Line ref={core} points={pts} color={c3(color)} lineWidth={1.5} transparent opacity={0.55} />
    </>
  )
}

function Scene({ nodes, edges, selectedId, onSelect, hovered, setHovered, rootIcon }: {
  nodes: RNode[]; edges: REdge[]
  selectedId: string | null; onSelect: (id: string | null) => void
  hovered: string | null; setHovered: (v: string | null | ((h: string | null) => string | null)) => void
  rootIcon?: any
}) {
  const halo = useHalo()
  return (
    <>
      <ambientLight intensity={0.65} />
      <pointLight position={[0, 2, 7]} intensity={22} color="#00d992" distance={30} />
      <pointLight position={[-6, -4, 4]} intensity={8} color="#FFB615" distance={24} />
      {edges.map((e, i) => e.lit
        ? <GlowLine key={i} from={e.from} to={e.to} color={e.color} seed={i} />
        : <Line key={i} points={[e.from, e.to]} color={c3(e.color)} lineWidth={0.8} transparent opacity={0.09} />
      )}
      {nodes.map((n) => (
        <NodeMesh key={n.id} n={n} halo={halo} rootIcon={rootIcon} hovered={hovered === n.id} selected={selectedId === n.id}
          onOver={() => setHovered(n.id)} onOut={() => setHovered((h) => (h === n.id ? null : h))}
          onClick={() => onSelect(n.id)} />
      ))}
      <OrbitControls enablePan={false} enableZoom autoRotate autoRotateSpeed={0.55} rotateSpeed={0.6} minDistance={15} maxDistance={34} maxPolarAngle={Math.PI * 0.82} minPolarAngle={Math.PI * 0.18} />
    </>
  )
}

export function TreeCanvas({ data, selectedId, onSelect }: { data: TreeData; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const { nodes, edges } = useMemo(() => layoutTree(data), [data])
  const [hovered, setHovered] = useState<string | null>(null)
  const hoveredNode = nodes.find((n) => n.id === hovered) ?? null
  const rootIcon = ROLE_ICON[data.role]
  return (
    <div className={cn("relative w-full h-full", hovered && "cursor-clicker")}>
      <Canvas camera={{ position: [0, 2.4, 22], fov: 44 }} dpr={[1, 1.8]} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ background: "transparent" }}>
        <fog attach="fog" args={["#040A0C", 24, 52]} />
        <Scene nodes={nodes} edges={edges} selectedId={selectedId} onSelect={onSelect} hovered={hovered} setHovered={setHovered} rootIcon={rootIcon} />
      </Canvas>
      {hoveredNode && <HudCard n={hoveredNode} />}
    </div>
  )
}
