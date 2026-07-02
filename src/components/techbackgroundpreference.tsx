import { useDisableTechBackground } from "@/hooks/useDisableTechBackground";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function TechBackgroundPreference() {
  const { disabled, setDisabled } = useDisableTechBackground();

  return (
    <SettingsCard title="Tech Background">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Animated tech background on the summoner page.
          </span>
        </div>

        <CyberToggle
          checked={!disabled}
          onChange={(v) => setDisabled(!v)}
        />
      </div>
    </SettingsCard>
  );
}
