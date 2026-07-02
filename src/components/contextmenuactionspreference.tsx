import { useContextMenuActions } from "@/hooks/useContextMenuActions";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function ContextMenuActionsPreference() {
  const { enabled, setEnabled } = useContextMenuActions();

  return (
    <SettingsCard title="Right-Click Match Actions">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-flash/80 text-sm">
            Replace hover buttons with a right-click context menu on matches.
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
