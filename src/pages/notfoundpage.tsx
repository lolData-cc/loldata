import { useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { Navbar } from "@/components/navbar"
import { cn } from "@/lib/utils"

// ── Floating particles ──────────────────────────────────────────────
const PARTICLE_COUNT = 14

type Particle = {
  id: number
  x: number
  startY: number
  size: number
  duration: number
  delay: number
  opacity: number
  char: string
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    startY: Math.random() * 30,
    size: 6 + Math.random() * 10,
    duration: 6 + Math.random() * 8,
    delay: Math.random() * 6,
    opacity: 0.03 + Math.random() * 0.08,
    char: Math.random() > 0.5 ? "◈" : "◆",
  }))
}

// ── Orbit ring config ───────────────────────────────────────────────
// Atom-orbit style: 3 rings at different angles, each with tilt baked
// into its own @keyframes so no preserve-3d is needed.
//
// How it works:
//   transform: rotateZ(tiltAngle) rotateX(70deg) rotateZ(spin)
//   CSS applies RIGHT-TO-LEFT:
//     1. rotateZ(spin)      → spin the flat circle
//     2. rotateX(70deg)     → tilt it back into an ellipse
//     3. rotateZ(tiltAngle) → rotate the ellipse to its unique angle
//
//   Ring 1: tiltAngle =   0° → horizontal ellipse
//   Ring 2: tiltAngle =  60° → ellipse tilted 60° clockwise
//   Ring 3: tiltAngle = -55° → ellipse tilted 55° counter-clockwise

const ORBIT_RINGS = [
  {
    size: 400,
    speed: 8,
    anim: "orbit-1",
    borderStyle: "dashed" as const,
    borderColor: "rgba(0,217,146,0.22)",
    items: [
      { angle: 0,   char: "◈", size: 14, color: "rgba(0,217,146,0.8)",  glow: true },
      { angle: 180, char: "◆", size: 10, color: "rgba(0,217,146,0.4)", glow: false },
    ],
  },
  {
    size: 460,
    speed: 11,
    anim: "orbit-2",
    borderStyle: "dashed" as const,
    borderColor: "rgba(0,217,146,0.14)",
    items: [
      { angle: 0,   char: "◈", size: 12, color: "rgba(0,217,146,0.6)",  glow: true },
      { angle: 120, char: "◈", size: 9,  color: "rgba(255,98,134,0.4)", glow: false },
      { angle: 240, char: "◆", size: 9,  color: "rgba(0,217,146,0.3)", glow: false },
    ],
  },
  {
    size: 520,
    speed: 15,
    anim: "orbit-3",
    borderStyle: "dotted" as const,
    borderColor: "rgba(215,216,217,0.10)",
    items: [
      { angle: 0,   char: "◆", size: 9, color: "rgba(215,216,217,0.4)", glow: false },
      { angle: 90,  char: "◈", size: 8, color: "rgba(0,217,146,0.3)",   glow: false },
      { angle: 180, char: "◆", size: 8, color: "rgba(255,182,21,0.3)",  glow: false },
      { angle: 270, char: "◈", size: 7, color: "rgba(0,217,146,0.2)",  glow: false },
    ],
  },
]

// ── Component ───────────────────────────────────────────────────────
export default function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const message =
    (location.state as any)?.message ||
    searchParams.get("message") ||
    "Page not found"

  const subtitle =
    (location.state as any)?.subtitle ||
    searchParams.get("subtitle") ||
    "The requested resource does not exist in this dimension"

  const particles = useMemo(() => generateParticles(), [])

  return (
    <div className="relative min-h-screen bg-liquirice text-flash overflow-hidden">

      {/* ── Layer 1: Floating ◈ particles ── */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute text-jade animate-[heroFloat_linear_infinite]"
            style={{
              left: `${p.x}%`,
              bottom: `-${p.startY}px`,
              fontSize: `${p.size}px`,
              opacity: p.opacity,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          >
            {p.char}
          </span>
        ))}
      </div>

      {/* ── Layer 2: Scanlines ── */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.15) 2px, rgba(255,255,255,0.15) 4px)",
        }}
      />

      {/* ── Layer 3: Radial vignette ── */}
      <div className="absolute inset-0 z-[3] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(4,10,12,0.85)_70%,rgba(4,10,12,1)_100%)]" />

      {/* ── Layer 4: Subtle jade radial glow ── */}
      <div className="absolute inset-0 z-[4] pointer-events-none bg-[radial-gradient(circle_600px_at_50%_40%,rgba(0,217,146,0.04)_0%,transparent_70%)]" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center min-h-screen">

        {/* Navbar */}
        <div className="w-full">
          <div className="w-[65%] mx-auto">
            <Navbar />
          </div>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 -mt-10 px-4">

          {/* Status line */}
          <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-error/50 select-none">
            :: SYSTEM_ERR :: STATUS_404 ::
          </div>

          {/* ════════════════════════════════════════════════════════
              ORBITAL ANIMATION + 404 TEXT
              ════════════════════════════════════════════════════ */}
          <div
            className="relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] flex items-center justify-center"
            style={{ perspective: "800px" }}
          >

            {/* Atom orbit rings — each is a direct child of the perspective container */}
            {ORBIT_RINGS.map((ring, ri) => {
              const s = `calc(${ring.size}px * var(--orbit-scale, 1))`

              return (
                <div
                  key={ri}
                  className="absolute"
                  style={{
                    width: s,
                    height: s,
                    animation: `${ring.anim} ${ring.speed}s linear infinite`,
                  }}
                >
                  {/* Ring border */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      borderWidth: "1px",
                      borderStyle: ring.borderStyle,
                      borderColor: ring.borderColor,
                    }}
                  />

                  {/* Orbiting ◈ markers */}
                  {ring.items.map((item, ii) => {
                    const rad = (item.angle * Math.PI) / 180
                    const x = 50 + 50 * Math.cos(rad)
                    const y = 50 + 50 * Math.sin(rad)

                    return (
                      <span
                        key={ii}
                        className="absolute select-none"
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          transform: "translate(-50%, -50%)",
                          fontSize: `${item.size}px`,
                          color: item.color,
                          filter: item.glow
                            ? "drop-shadow(0 0 6px rgba(0,217,146,0.5))"
                            : undefined,
                        }}
                      >
                        {item.char}
                      </span>
                    )
                  })}
                </div>
              )
            })}

            {/* ── 404 text (center, on top) ── */}
            <div className="relative z-10 flex items-center justify-center select-none">
              {/* Main text */}
              <span
                className="text-[80px] md:text-[120px] lg:text-[160px] font-mechano text-flash/90 leading-none animate-[notfound-glow_4s_ease-in-out_infinite]"
              >
                404
              </span>

              {/* Glitch layer 1 — jade shift */}
              <span
                className="absolute inset-0 flex items-center justify-center text-[80px] md:text-[120px] lg:text-[160px] font-mechano text-jade/20 leading-none animate-[glitch404-1_4s_infinite]"
                style={{ clipPath: "inset(20% 0 60% 0)" }}
                aria-hidden="true"
              >
                404
              </span>

              {/* Glitch layer 2 — error shift */}
              <span
                className="absolute inset-0 flex items-center justify-center text-[80px] md:text-[120px] lg:text-[160px] font-mechano text-error/15 leading-none animate-[glitch404-2_4s_infinite]"
                style={{ clipPath: "inset(60% 0 10% 0)" }}
                aria-hidden="true"
              >
                404
              </span>
            </div>
          </div>

          {/* Message */}
          <h1 className="font-mechano text-xl md:text-2xl text-flash/80 text-center uppercase tracking-wide">
            {message}
          </h1>

          {/* Subtitle */}
          <p className="font-mono text-xs text-flash/30 text-center tracking-[0.15em] max-w-md">
            {subtitle}
          </p>

          {/* Jade gradient separator */}
          <div
            className="w-48 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0,217,146,0.4), transparent)",
            }}
          />

          {/* Go Home — rhomboid button */}
          <button
            onClick={() => navigate("/")}
            className="group relative mt-4 cursor-clicker"
          >
            <span
              className={cn(
                "block w-11 h-11 rotate-45 rounded-[3px] border transition-all duration-300",
                "bg-black/40 border-jade/30",
                "group-hover:border-jade/70 group-hover:bg-jade/10",
                "group-hover:shadow-[0_0_20px_rgba(0,217,146,0.3)]",
                "shadow-[0_0_8px_rgba(0,217,146,0.1)]"
              )}
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <svg
                viewBox="0 0 10 10"
                className="w-4 h-4 text-jade transition-transform duration-300 group-hover:-translate-y-[2px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="1,7 5,3 9,7" />
              </svg>
            </span>
            <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-mono text-[8px] tracking-[0.3em] text-jade/30 uppercase whitespace-nowrap group-hover:text-jade/60 transition-colors">
              Go Home
            </span>
          </button>

        </div>
      </div>

      {/* ── Inline keyframes ── */}
      <style>{`
        :root {
          --orbit-scale: 0.7;
        }
        @media (min-width: 768px) {
          :root { --orbit-scale: 1; }
        }

        @keyframes heroFloat {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-93vh) rotate(180deg); opacity: 0; }
        }

        /* ── Atom orbit keyframes ──
           Each ring bakes its own tilt INTO the animation.
           Formula: rotateZ(tiltAngle) rotateX(70deg) rotateZ(spin)
           CSS applies right-to-left:
             1. rotateZ(spin)      → spin flat circle
             2. rotateX(70deg)     → tilt into ellipse
             3. rotateZ(tiltAngle) → orient ellipse at unique angle
        */

        /* Ring 1: horizontal ellipse (tilt = 0°), spins clockwise */
        @keyframes orbit-1 {
          from { transform: rotateX(70deg) rotateZ(0deg); }
          to   { transform: rotateX(70deg) rotateZ(360deg); }
        }

        /* Ring 2: tilted 30° clockwise — chronosphere style, spins counter-clockwise */
        @keyframes orbit-2 {
          from { transform: rotateZ(30deg) rotateX(70deg) rotateZ(0deg); }
          to   { transform: rotateZ(30deg) rotateX(70deg) rotateZ(-360deg); }
        }

        /* Ring 3: tilted 30° counter-clockwise — chronosphere style, spins clockwise */
        @keyframes orbit-3 {
          from { transform: rotateZ(-30deg) rotateX(70deg) rotateZ(0deg); }
          to   { transform: rotateZ(-30deg) rotateX(70deg) rotateZ(360deg); }
        }

        @keyframes glitch404-1 {
          0%, 100%  { transform: translate(0); opacity: 0; }
          10%       { transform: translate(-3px, -1px); opacity: 1; }
          12%       { transform: translate(2px, 1px); opacity: 1; }
          14%       { transform: translate(0); opacity: 0; }
          50%       { transform: translate(0); opacity: 0; }
          52%       { transform: translate(4px, -2px); opacity: 0.8; }
          54%       { transform: translate(-1px, 3px); opacity: 0.6; }
          56%       { transform: translate(0); opacity: 0; }
        }

        @keyframes glitch404-2 {
          0%, 100%  { transform: translate(0); opacity: 0; }
          30%       { transform: translate(0); opacity: 0; }
          32%       { transform: translate(3px, 2px); opacity: 0.7; }
          34%       { transform: translate(-4px, -1px); opacity: 0.5; }
          36%       { transform: translate(0); opacity: 0; }
          70%       { transform: translate(0); opacity: 0; }
          72%       { transform: translate(-2px, 3px); opacity: 0.6; }
          74%       { transform: translate(5px, -2px); opacity: 0.4; }
          76%       { transform: translate(0); opacity: 0; }
        }

        @keyframes notfound-glow {
          0%, 100% { text-shadow: 0 0 60px rgba(0,217,146,0.15), 0 0 120px rgba(0,217,146,0.05); }
          50%      { text-shadow: 0 0 80px rgba(0,217,146,0.35), 0 0 160px rgba(0,217,146,0.12); }
        }
      `}</style>
    </div>
  )
}
