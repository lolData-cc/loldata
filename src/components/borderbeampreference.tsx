import { useDisableBorderBeams } from "@/hooks/useDisableBorderBeams";

export function BorderBeamPreference() {
  const { disabled, setDisabled } = useDisableBorderBeams();

  return (
    <div className="border border-flash/10 rounded-md p-4 bg-cement">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-flash/40">Border Beam</h4>
          <span className="text-flash/80 text-sm">
            Disabilita l’effetto animato (migliora performance e riduce distrazioni).
          </span>
        </div>

        {/* Toggle */}
        <label className="flex items-center gap-2 cursor-clicker select-none">
          <span className="text-xs text-flash/50">
            {disabled ? "OFF" : "ON"}
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={!disabled}
            onClick={() => setDisabled(!disabled)}
            className={[
              "relative inline-flex h-6 w-11 items-center rounded-full border transition",
              disabled
                ? "bg-black/30 border-flash/20"
                : "bg-jade/30 border-jade/40",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block h-5 w-5 transform rounded-full bg-white/80 transition",
                disabled ? "translate-x-1" : "translate-x-5",
              ].join(" ")}
            />
          </button>
        </label>
      </div>

      <div className="mt-3 border-t border-flash/20 pt-2 text-xs text-flash/50">
        Impostazione salvata sul dispositivo (local cache).
      </div>
    </div>
  );
}
