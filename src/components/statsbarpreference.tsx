import { useStatsBarPrefs } from "@/hooks/useStatsBarPrefs";
import { CyberToggle } from "@/components/cybertoggle";
import { STATS_BAR_STAT_KEYS, type StatsBarStatKey } from "@/lib/uiPrefs";
import { cn } from "@/lib/utils";

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
    <div className="relative rounded-[2px] border border-jade/10 bg-cement overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-jade/40" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)" }} />
      <div className="absolute top-0 left-0 w-3 h-3 z-[3]"><div className="absolute top-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute top-0 right-0 w-3 h-3 z-[3]"><div className="absolute top-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute top-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 left-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 left-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 z-[3]"><div className="absolute bottom-0 right-0 w-full h-[1px] bg-jade/25" /><div className="absolute bottom-0 right-0 w-[1px] h-full bg-jade/25" /></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-jade/30 via-jade/10 to-transparent z-[3]" />

      <div className="relative z-[2] px-4 py-3 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50">
              Stats Summary Bar
            </h4>
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

        <div className="mt-2 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />
        <div className="pt-2 text-[10px] font-mono text-flash/30 tracking-[0.08em]">
          {"\u25C8"} SETTING CACHED ON DEVICE
        </div>
      </div>
    </div>
  );
}
