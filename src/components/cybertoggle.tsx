import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
};

export function CyberToggle({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-clicker select-none shrink-0"
    >
      <span
        className={cn(
          "text-[10px] font-mono tracking-[0.15em] transition-colors duration-200 w-6 text-right",
          checked ? "text-jade" : "text-flash/30"
        )}
      >
        {checked ? "ON" : "OFF"}
      </span>

      {/* Track */}
      <div
        className={cn(
          "relative w-11 h-[22px] rounded-[3px] border transition-all duration-300",
          checked
            ? "bg-jade/10 border-jade/40 shadow-[0_0_8px_rgba(0,217,146,0.18)]"
            : "bg-black/40 border-flash/15"
        )}
      >
        {/* Scanlines overlay when active */}
        <div
          className={cn(
            "absolute inset-0 rounded-[3px] pointer-events-none transition-opacity duration-300",
            checked ? "opacity-25" : "opacity-0"
          )}
          style={{
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,217,146,0.5) 3px, rgba(0,217,146,0.5) 4px)",
          }}
        />

        {/* Thumb */}
        <div
          className={cn(
            "absolute top-[2px] w-[17px] h-[17px] rounded-[2px] flex items-center justify-center transition-all duration-300",
            checked
              ? "left-[calc(100%-19px)] bg-jade shadow-[0_0_10px_rgba(0,217,146,0.9),0_0_4px_rgba(0,217,146,0.5)]"
              : "left-[2px] bg-flash/20"
          )}
        >
          <span
            className={cn(
              "text-[8px] font-bold leading-none pointer-events-none transition-opacity duration-150",
              checked ? "text-black opacity-80" : "opacity-0"
            )}
          >
            ◈
          </span>
        </div>
      </div>
    </button>
  );
}
