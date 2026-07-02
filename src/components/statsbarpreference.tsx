import { useStatsBarPrefs } from "@/hooks/useStatsBarPrefs";
import { CyberToggle } from "@/components/cybertoggle";
import { STATS_BAR_STAT_KEYS, type StatsBarStatKey } from "@/lib/uiPrefs";
import { cn } from "@/lib/utils";
import { SettingsCard } from "@/components/ui/settings-card";

const STAT_LABELS: Record<StatsBarStatKey, string> = {
  kda: "KDA",
  kp: "KP",
  csm: "CS/M",
  dmg: "DMG",
  vis: "VIS",
};

export function StatsBarPreference() {
  const { hidden, setHidden, visibleStats, toggleStat } = useStatsBarPrefs();

  return (
    <SettingsCard title="Stats Summary Bar">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-flash/80 text-sm">
              Show the stats bar with win rate and averages below the filter bar.
            </span>
          </div>

          <CyberToggle
            checked={!hidden}
            onChange={(v) => setHidden(!v)}
          />
        </div>

        {/* Per-stat toggles — only shown when bar is enabled */}
        {!hidden && (
          <>
            <div className="mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />
            <div className="pt-3 pb-1">
              <p className="text-[9px] font-mono tracking-[0.15em] uppercase text-flash/25 mb-2">
                Visible stats
              </p>
              <div className="flex flex-wrap gap-2">
                {STATS_BAR_STAT_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleStat(key)}
                    className={cn(
                      "px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-[0.1em] uppercase cursor-clicker",
                      "border transition-all duration-200",
                      visibleStats[key]
                        ? "border-jade/30 bg-jade/10 text-jade shadow-[0_0_6px_rgba(0,217,146,0.15)]"
                        : "border-flash/10 bg-flash/[0.02] text-flash/25 hover:text-flash/40"
                    )}
                  >
                    {STAT_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </SettingsCard>
  );
}
