// Scaled-down atom orbit animation from the 404 page — used as empty state
const RINGS = [
  {
    size: 280, speed: 8, anim: "learn-orbit-1", borderStyle: "dashed" as const,
    borderColor: "rgba(0,217,146,0.25)",
    borderWidth: 2,
    items: [
      { angle: 0, char: "\u25C8", size: 16, color: "rgba(0,217,146,0.85)", glow: true },
      { angle: 180, char: "\u25C6", size: 12, color: "rgba(0,217,146,0.45)", glow: false },
    ],
  },
  {
    size: 350, speed: 11, anim: "learn-orbit-2", borderStyle: "dashed" as const,
    borderColor: "rgba(0,217,146,0.15)",
    borderWidth: 1.5,
    items: [
      { angle: 0, char: "\u25C8", size: 13, color: "rgba(0,217,146,0.65)", glow: true },
      { angle: 120, char: "\u25C6", size: 10, color: "rgba(0,217,146,0.35)", glow: false },
      { angle: 240, char: "\u25C6", size: 9, color: "rgba(0,217,146,0.25)", glow: false },
    ],
  },
  {
    size: 420, speed: 15, anim: "learn-orbit-3", borderStyle: "dotted" as const,
    borderColor: "rgba(215,216,217,0.10)",
    borderWidth: 1.5,
    items: [
      { angle: 0, char: "\u25C6", size: 10, color: "rgba(215,216,217,0.4)", glow: false },
      { angle: 90, char: "\u25C8", size: 8, color: "rgba(0,217,146,0.3)", glow: false },
      { angle: 180, char: "\u25C6", size: 8, color: "rgba(0,217,146,0.25)", glow: false },
      { angle: 270, char: "\u25C8", size: 7, color: "rgba(0,217,146,0.2)", glow: false },
    ],
  },
]

export function OrbitEmpty({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div
        className="relative w-[340px] h-[340px] flex items-center justify-center"
        style={{ perspective: "800px" }}
      >
        {RINGS.map((ring, ri) => (
          <div
            key={ri}
            className="absolute"
            style={{
              width: ring.size,
              height: ring.size,
              animation: `${ring.anim} ${ring.speed}s linear infinite`,
            }}
          >
            <div
              className="absolute inset-0 rounded-full"
              style={{ borderWidth: `${ring.borderWidth}px`, borderStyle: ring.borderStyle, borderColor: ring.borderColor }}
            />
            {ring.items.map((item, ii) => {
              const rad = (item.angle * Math.PI) / 180
              const x = 50 + 50 * Math.cos(rad)
              const y = 50 + 50 * Math.sin(rad)
              return (
                <span
                  key={ii}
                  className="absolute select-none"
                  style={{
                    left: `${x}%`, top: `${y}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: `${item.size}px`,
                    color: item.color,
                    filter: item.glow ? "drop-shadow(0 0 4px rgba(0,217,146,0.4))" : undefined,
                  }}
                >
                  {item.char}
                </span>
              )
            })}
          </div>
        ))}

        {/* Center sphere */}
        <div className="relative z-10 w-8 h-8 rounded-full shadow-[0_0_30px_rgba(0,217,146,0.4),0_0_60px_rgba(0,217,146,0.15)]"
          style={{
            background: "radial-gradient(circle at 35% 35%, rgba(0,217,146,0.6), rgba(0,217,146,0.25) 50%, rgba(0,217,146,0.08) 100%)",
            border: "1.5px solid rgba(0,217,146,0.5)",
          }}
        />
      </div>

      {label && (
        <span className="text-flash/40 font-mechano text-[15px] tracking-[0.2em] uppercase mt-4 text-center">{label}</span>
      )}

      <style>{`
        @keyframes learn-orbit-1 {
          from { transform: rotateX(70deg) rotateZ(0deg); }
          to   { transform: rotateX(70deg) rotateZ(360deg); }
        }
        @keyframes learn-orbit-2 {
          from { transform: rotateZ(30deg) rotateX(70deg) rotateZ(0deg); }
          to   { transform: rotateZ(30deg) rotateX(70deg) rotateZ(-360deg); }
        }
        @keyframes learn-orbit-3 {
          from { transform: rotateZ(-30deg) rotateX(70deg) rotateZ(0deg); }
          to   { transform: rotateZ(-30deg) rotateX(70deg) rotateZ(360deg); }
        }
      `}</style>
    </div>
  )
}
