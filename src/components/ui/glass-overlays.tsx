export function GlassOverlays() {
  return (
    <>
      {/* TOP highlight */}
      <div
        className="pointer-events-none absolute -top-28 left-0 w-full h-[360px] z-[1]"
        style={{
          background:
            "radial-gradient(120% 80% at 18% 18%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 32%, rgba(255,255,255,0.03) 52%, rgba(255,255,255,0.0) 72%)",
        }}
      />

      {/* Vignette laterale */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(140% 120% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Shading verticale */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.40) 100%)",
        }}
      />

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute -bottom-10 left-0 right-0 h-36 z-[2]"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
    </>
  );
}
