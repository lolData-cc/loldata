// TreeLoader — a calm, on-brand loading state for the Improvement Tree.
// Just the root's motif: concentric diamond rings turning slowly in opposite
// directions around a softly breathing jade core, with one quiet label.
// Pure CSS transforms → buttery smooth, no WebGL, no clutter.

const CSS = `
.itl-wrap{animation:itl-in .6s cubic-bezier(.22,1,.36,1) both}
.itl-spin{transform-origin:center;animation:itl-spin 7s linear infinite}
.itl-spin-r{transform-origin:center;animation:itl-spin 11s linear infinite reverse}
.itl-core{transform-origin:center;animation:itl-breathe 2.6s ease-in-out infinite}
.itl-glow{animation:itl-breathe 2.6s ease-in-out infinite}
.itl-dot{animation:itl-orbit 7s linear infinite}
.itl-label{animation:itl-dim 2.6s ease-in-out infinite}
@keyframes itl-in{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
@keyframes itl-spin{to{transform:rotate(360deg)}}
@keyframes itl-breathe{0%,100%{opacity:.9;transform:scale(1)}50%{opacity:.5;transform:scale(.9)}}
@keyframes itl-dim{0%,100%{opacity:.55}50%{opacity:.3}}
@keyframes itl-orbit{to{transform:rotate(-360deg)}}
@media (prefers-reduced-motion:reduce){.itl-wrap *{animation:none!important}}
`

export function TreeLoader() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 select-none">
      <style>{CSS}</style>
      <div className="itl-wrap relative w-28 h-28">
        {/* soft glow */}
        <div className="itl-glow absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,217,146,0.22), transparent 62%)" }} />
        <svg viewBox="-50 -50 100 100" className="absolute inset-0 w-full h-full overflow-visible">
          {/* outer diamond */}
          <rect className="itl-spin" x="-34" y="-34" width="68" height="68" rx="4" fill="none" stroke="#00d992" strokeOpacity="0.5" strokeWidth="1.4" />
          {/* inner diamond, counter-rotating */}
          <rect className="itl-spin-r" x="-22" y="-22" width="44" height="44" rx="3" fill="none" stroke="#00d992" strokeOpacity="0.28" strokeWidth="1.2" />
          {/* one tracer dot riding the outer ring */}
          <g className="itl-dot">
            <circle cx="0" cy="-34" r="2.4" fill="#00d992" />
          </g>
          {/* breathing core */}
          <circle className="itl-core" cx="0" cy="0" r="7" fill="#00d992" style={{ filter: "drop-shadow(0 0 6px rgba(0,217,146,0.8))" }} />
        </svg>
      </div>
      <span className="itl-label font-mono text-[10px] tracking-[0.32em] uppercase text-flash">Reading your timelines</span>
    </div>
  )
}
