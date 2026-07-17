import { useQuickSlots } from "@/hooks/useQuickSlots";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function QuickSlotsPreference() {
  const { enabled, setEnabled } = useQuickSlots();

  return (
    <SettingsCard title="Quick Slots">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Floating 3-slot shortcut rail, anchored to the right edge on every page.
          </span>
          <p className="text-flash/35 text-xs mt-1">
            Pin champions, summoners, scout lobbies and more for one-click access.
          </p>
        </div>

        <CyberToggle
          checked={enabled}
          onChange={(v) => setEnabled(v)}
        />
      </div>
    </SettingsCard>
  );
}
