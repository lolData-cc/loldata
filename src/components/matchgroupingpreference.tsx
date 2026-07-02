import { useDisableMatchGrouping } from "@/hooks/useDisableMatchGrouping";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function MatchGroupingPreference() {
  const { disabled, setDisabled } = useDisableMatchGrouping();

  return (
    <SettingsCard title="Group Matches by Day">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Group match history by date with day headers and stats.
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
