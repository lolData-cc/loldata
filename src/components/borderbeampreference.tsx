import { useDisableBorderBeams } from "@/hooks/useDisableBorderBeams";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function BorderBeamPreference() {
  const { disabled, setDisabled } = useDisableBorderBeams();

  return (
    <SettingsCard title="Border Beam">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Animated border effect (disable to improve performance).
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
