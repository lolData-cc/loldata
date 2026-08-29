import { useShowRanked5 } from "@/hooks/useShowRanked5";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function Ranked5Preference() {
  const { enabled, setEnabled } = useShowRanked5();

  return (
    <SettingsCard title="Show Ranked 5s">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Add the Ranked 5s rank beside Solo/Duo and Flex on profiles. It is a
            weekend-only queue on its own ladder, so it reads Unranked for most
            players — off unless you play it.
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
