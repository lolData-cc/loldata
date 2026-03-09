import { useDisableTechBackground } from "@/hooks/useDisableTechBackground";
import { CyberToggle } from "@/components/cybertoggle";

export function TechBackgroundPreference() {
  const { disabled, setDisabled } = useDisableTechBackground();

  return (
    <div className="border border-flash/10 rounded-md p-4 bg-cement">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-flash/40 font-mono text-xs tracking-[0.12em] uppercase">
            Tech Background
          </h4>
          <span className="text-flash/80 text-sm">
            Animated tech background on the summoner page.
          </span>
        </div>

        <CyberToggle
          checked={!disabled}
          onChange={(v) => setDisabled(!v)}
        />
      </div>

      <div className="mt-3 border-t border-flash/10 pt-2 text-[10px] font-mono text-flash/30 tracking-[0.08em]">
        ◈ SETTING CACHED ON DEVICE
      </div>
    </div>
  );
}
