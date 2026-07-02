import { useHideRemakeMatches } from "@/hooks/useHideRemakeMatches";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function HideRemakesPreference() {
  const { enabled, setEnabled } = useHideRemakeMatches();

  return (
    <SettingsCard title="Hide Remake Matches">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Completely hide remade games from the match list.
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
