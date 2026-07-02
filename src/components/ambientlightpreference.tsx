import { useAmbientLight } from "@/hooks/useAmbientLight";
import { cn } from "@/lib/utils";
import { SettingsCard } from "@/components/ui/settings-card";

export function AmbientLightPreference() {
  const { intensity, setIntensity } = useAmbientLight();

  return (
    <SettingsCard title="Ambient Light">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
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
    </SettingsCard>
  );
}
