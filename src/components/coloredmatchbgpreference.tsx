import { useEnableColoredMatchBg } from "@/hooks/useEnableColoredMatchBg";
import { CyberToggle } from "@/components/cybertoggle";

export function ColoredMatchBgPreference() {
  const { enabled, setEnabled } = useEnableColoredMatchBg();

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
              Colored Match Background
            </h4>
            <span className="text-flash/80 text-sm">
              Tint match cards green for wins and red for losses.
            </span>
          </div>

          <CyberToggle
            checked={enabled}
            onChange={(v) => setEnabled(v)}
          />
        </div>

        <div className="mt-3 h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent" />
        <div className="pt-2 text-[10px] font-mono text-flash/30 tracking-[0.08em]">
          ◈ SETTING CACHED ON DEVICE
        </div>
      </div>
    </div>
  );
}
