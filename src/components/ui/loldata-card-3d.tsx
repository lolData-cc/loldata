// src/components/ui/loldata-card-3d.tsx
//
// Real-time 3D render of the loldata membership card (`loldata-card.glb`).
// Used by the billing success page as the hero focal element. The card
// floats, rotates slowly on its Y axis and bobs subtly on Y position —
// Apple-ad style.
//
// Layout strategy
//   • drei's <Center> auto-centres the model around its bounding-box
//     mid-point. Meshy exports often have the model origin at a
//     corner; without Center the mesh draws far from (0,0,0) and gets
//     clipped by the camera frustum.
//   • drei's <Bounds fit clip margin> then auto-fits the camera so
//     the model exactly fills the canvas regardless of the unit
//     scale that came out of Meshy. `observe={false}` means it fits
//     once at mount and stays put while the card spins.
//   • A pivot group inside Center handles the per-frame Y rotation +
//     floating bob without disturbing the Bounds-fit math.

import * as React from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import {
  useGLTF,
  Environment,
  ContactShadows,
  Bounds,
} from "@react-three/drei"
import * as THREE from "three"

const MODEL_PATH = "/img/loldata-card.glb"

useGLTF.preload(MODEL_PATH)

/** Card scene — the model is pre-translated so its bounding-box
 *  centre lands exactly at the origin of its parent group BEFORE
 *  we attach it to the spin pivot. That way the per-frame Y rotation
 *  on the spin pivot spins the model around its own midpoint instead
 *  of around the GLB's (possibly off-corner) export origin, which
 *  was what made the card orbit out of frame in the previous build.
 */
function CardScene({
  spinSpeed,
  bobAmplitude,
  bobSpeed,
  baseTiltX,
  baseTiltZ,
}: {
  spinSpeed: number
  bobAmplitude: number
  bobSpeed: number
  baseTiltX: number
  baseTiltZ: number
}) {
  const spinRef = React.useRef<THREE.Group>(null)
  const { scene } = useGLTF(MODEL_PATH)

  // Clone the scene (so subsequent navigations don't mutate the
  // cached useGLTF result) and translate it so its world-space
  // bounding-box centre sits at (0,0,0) of its own object space.
  // After this, attaching it inside any parent group means its
  // visual centre coincides with that group's pivot.
  const cloned = React.useMemo(() => {
    const c = scene.clone(true)
    const box = new THREE.Box3().setFromObject(c)
    const centre = box.getCenter(new THREE.Vector3())
    c.position.sub(centre)

    // Crisp the metal — Meshy ships a sensible PBR baseline but the
    // metallic factor can be a touch low for a hero render. Bump it
    // and lower roughness slightly so the brushed surface catches
    // the environment reflections properly.
    c.traverse((obj) => {
      const m = (obj as THREE.Mesh).material as
        | THREE.MeshStandardMaterial
        | undefined
      if (m && "metalness" in m) {
        m.metalness = Math.max(m.metalness ?? 0.6, 0.9)
        m.roughness = Math.min(m.roughness ?? 0.5, 0.4)
        m.envMapIntensity = 1.4
        m.needsUpdate = true
      }
    })
    return c
  }, [scene])

  useFrame((state, delta) => {
    if (!spinRef.current) return
    spinRef.current.rotation.y += delta * spinSpeed
    const t = state.clock.getElapsedTime()
    spinRef.current.position.y = Math.sin(t * bobSpeed) * bobAmplitude
  })

  return (
    // Outer wrapper applies the static "Apple-ad" tilt; the inner
    // spinRef rotates in place around the now-centred model.
    <group rotation={[baseTiltX, 0, baseTiltZ]}>
      <group ref={spinRef}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}

export interface LoldataCard3DProps {
  className?: string
  /** Height of the canvas in px (or any CSS length). Default 380px. */
  height?: number | string
  /** Rotation speed in rad/s. Default 0.38 (~16s per full turn). */
  spinSpeed?: number
  /** Vertical bob amplitude in scene units. Default 0.06. */
  bobAmplitude?: number
  /** Vertical bob frequency. Default 0.85 Hz. */
  bobSpeed?: number
  /** Static tilt on X (forward/back). Default -0.2 rad ≈ -11°. */
  baseTiltX?: number
  /** Static tilt on Z (roll). Default -0.05 rad ≈ -3°. */
  baseTiltZ?: number
  /** Bounds margin — bigger = more padding around the card. */
  margin?: number
}

export function LoldataCard3D({
  className,
  height = 380,
  spinSpeed = 0.38,
  bobAmplitude = 0.06,
  bobSpeed = 0.85,
  baseTiltX = -0.2,
  baseTiltZ = -0.05,
  margin = 1.25,
}: LoldataCard3DProps) {
  return (
    <div
      className={className}
      style={{ width: "100%", height, position: "relative" }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 32 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        {/* Base ambient — low so PBR reflections dominate. */}
        <ambientLight intensity={0.3} />

        {/* Key light — upper-right, neutral, anisotropic highlight. */}
        <directionalLight
          position={[4, 5, 4]}
          intensity={1.2}
          color="#ffffff"
        />

        {/* Fill — lower-left, jade-tinted, brand colour bleed. */}
        <directionalLight
          position={[-4, -2, 2]}
          intensity={0.45}
          color="#00d992"
        />

        {/* Rim — back-right, citrine, warm edge against dark bg. */}
        <directionalLight
          position={[3, 2, -3]}
          intensity={0.3}
          color="#ffb615"
        />

        <React.Suspense fallback={null}>
          {/* Bounds auto-fits the camera once at mount; observe is
              off by default so the camera stays still while the card
              spins inside. */}
          <Bounds fit clip margin={margin}>
            <CardScene
              spinSpeed={spinSpeed}
              bobAmplitude={bobAmplitude}
              bobSpeed={bobSpeed}
              baseTiltX={baseTiltX}
              baseTiltZ={baseTiltZ}
            />
          </Bounds>
          <Environment preset="city" />
        </React.Suspense>

        {/* Soft jade-tinted contact shadow — gives the floating
            illusion a ground without rendering an actual surface. */}
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.55}
          scale={6}
          blur={2.6}
          far={3}
          color="#00d992"
        />
      </Canvas>
    </div>
  )
}
