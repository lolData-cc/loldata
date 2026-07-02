import { useClickToExpandMatch } from "@/hooks/useClickToExpandMatch";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function ClickToExpandPreference() {
  const { enabled, setEnabled } = useClickToExpandMatch();

  return (
    <SettingsCard title="Click to Expand Match">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Expand match actions on click instead of hover.
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
