import { useEnableColoredMatchBg } from "@/hooks/useEnableColoredMatchBg";
import { useBlueWinTint } from "@/hooks/useBlueWinTint";
import { CyberToggle } from "@/components/cybertoggle";
import { SettingsCard } from "@/components/ui/settings-card";

export function ColoredMatchBgPreference() {
  const { enabled, setEnabled } = useEnableColoredMatchBg();
  const { enabled: blueWins, setEnabled: setBlueWins } = useBlueWinTint();

  return (
    <SettingsCard title="Colored Match Background">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-flash/80 text-sm">
              Tint match cards for wins and losses.
            </span>
          </div>

          <CyberToggle
            checked={enabled}
            onChange={(v) => setEnabled(v)}
          />
        </div>

        {/* Win color toggle */}
        {enabled && (
          <>
            <div className="mt-3 h-[1px] bg-gradient-to-r from-jade/10 via-flash/5 to-transparent" />
            <div className="mt-2.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-flash/40">Win color</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-[2px] transition-all ${!blueWins ? "ring-1 ring-jade/50 bg-jade/40" : "bg-jade/15"}`} />
                  <span className={`text-[9px] font-mono tracking-wide ${!blueWins ? "text-jade/70" : "text-flash/25"}`}>GREEN</span>
                </div>
                <span className="text-flash/15 text-[8px]">/</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-[2px] transition-all ${blueWins ? "ring-1 ring-[#5BA8E6]/50 bg-[#5BA8E6]/40" : "bg-[#5BA8E6]/15"}`} />
                  <span className={`text-[9px] font-mono tracking-wide ${blueWins ? "text-[#5BA8E6]/70" : "text-flash/25"}`}>BLUE</span>
                </div>
              </div>
              <CyberToggle
                checked={blueWins}
                onChange={(v) => setBlueWins(v)}
              />
            </div>
          </>
        )}
      </div>
    </SettingsCard>
  );
}
