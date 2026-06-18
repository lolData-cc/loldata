// ChampionPicker — thin backward-compatible adapter over the universal
// <ChampionDialog>. Keeps the original props (slug-string onSelect, a built-in
// icon+label trigger, Clear support) so existing call sites (the summoner-page
// champion filter) keep working unchanged while getting the new unified dialog.

import { ChampionDialog } from "@/components/champion-dialog";
import { cn } from "@/lib/utils";
import { cdnBaseUrl } from "@/config";

type Champion = { id: string; name: string };

export function ChampionPicker({
  champions: _champions, // unused — ChampionDialog self-sources the roster via useChampions
  onSelect,
  selectedChampion = null,
  triggerLabel = "CHAMPION",
  triggerClassName,
}: {
  champions?: Champion[];
  onSelect: (championId: string | null) => void;
  selectedChampion?: string | null;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  return (
    <ChampionDialog
      value={selectedChampion}
      onSelect={(c) => onSelect(c.slug)}
      onClear={() => onSelect(null)}
      title="Champion filter"
      trigger={
        <button
          type="button"
          className={cn(
            "flex items-center space-x-2 hover:text-gray-300 transition-colors text-sm font-thin tracking-wide cursor-clicker h-full",
            triggerClassName
          )}
        >
          {selectedChampion ? (
            <>
              <img
                src={`${cdnBaseUrl()}/img/champion/${selectedChampion}.png`}
                alt={selectedChampion}
                className="w-4 h-4 rounded-sm"
                draggable={false}
              />
              <span className="text-jade/80">{selectedChampion.toUpperCase()}</span>
            </>
          ) : (
            <span>{triggerLabel}</span>
          )}
        </button>
      }
    />
  );
}
