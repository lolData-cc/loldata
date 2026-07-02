import { useDisableMatchTransition } from "@/hooks/useDisableMatchTransition";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function MatchTransitionPreference() {
  const { disabled, setDisabled } = useDisableMatchTransition();

  return (
    <SettingsCard title="Match Transition">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Cyber animation when entering a match detail view.
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
