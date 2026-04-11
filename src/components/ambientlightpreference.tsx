import { useAmbientLight } from "@/hooks/useAmbientLight";
import { cn } from "@/lib/utils";

export function AmbientLightPreference() {
  const { intensity, setIntensity } = useAmbientLight();

  return (
    <div className="relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
      <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />

      <div className="relative z-[2] px-4 py-3 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">
              Ambient Light
            </h4>
            <span className="text-flash/80 text-sm">
              Add a subtle background glow to improve readability.
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-mono text-flash/30 tabular-nums w-8 text-right">{intensity}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className={cn(
                "w-24 h-1 appearance-none rounded-full cursor-pointer",
                "bg-flash/10",
                "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-jade [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(0,217,146,0.4)] [&::-webkit-slider-thumb]:cursor-pointer",
                "[&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-jade [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              )}
            />
          </div>
        </div>

        <div className="mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />
        <div className="pt-2 text-[10px] font-mono text-flash/30 tracking-[0.08em]">
          {"\u25C8"} SETTING CACHED ON DEVICE
        </div>
      </div>
    </div>
  );
}
