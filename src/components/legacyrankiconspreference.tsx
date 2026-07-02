import { useLegacyRankIcons } from "@/hooks/useLegacyRankIcons";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function LegacyRankIconsPreference() {
  const { enabled, setEnabled } = useLegacyRankIcons();

  return (
    <SettingsCard title="Legacy Rank Icons">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Use the classic 2019 helmet-style ranked emblems.
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
