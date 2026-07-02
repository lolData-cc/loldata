import { useEnableMatchCentering } from "@/hooks/useEnableMatchCentering";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function MatchCenteringPreference() {
  const { enabled, setEnabled } = useEnableMatchCentering();

  return (
    <SettingsCard title="Center Matches on Scroll">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Shift match list to the center after scrolling past the sidebar.
          </span>
        </div>

        <CyberToggle
          checked={enabled}
          onChange={(v) => setEnabled(v)}
        />
      </div>
    </SettingsCard>
  );
}
