import type { JunglePlaystyleTag, JungleStartingCamp } from "@/assets/types/riot";
import { cn } from "@/lib/utils";
import {
  getReadableJunglePlaystyleTag,
  getJunglePlaystyleTagClasses,
  getReadableStartingCamp,
  getStartingCampClasses,
} from "@/utils/junglePlaystyle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

type Props = {
  tag: JunglePlaystyleTag;
  topsideCount?: number;
  botsideCount?: number;
};

export function JunglePlaystyleBadge({ tag, topsideCount, botsideCount }: Props) {
  const label = getReadableJunglePlaystyleTag(tag);
  if (!label) return null;

  const badge = (
    <div
      className={cn(
        "h-5 flex items-center gap-1.5 pl-2 pr-2.5",
        "font-mono text-[9px] uppercase tracking-[0.1em]",
        "border-l-2 bg-black/30",
        getJunglePlaystyleTagClasses(tag)
      )}
    >
      <span className="opacity-40 text-[8px] leading-none">◈</span>
      <span>{label}</span>
    </div>
  );

  if (tag === "played_for_both" && topsideCount != null && botsideCount != null) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {badge}
          </TooltipTrigger>
          <TooltipContent side="top" className="font-mono text-[10px] tracking-wide">
            <span>Ganked top {topsideCount === 2 ? "twice" : `${topsideCount} times`}, bot {botsideCount === 2 ? "twice" : `${botsideCount} times`}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badge;
}

type StartingCampProps = {
  camp: JungleStartingCamp;
};

export function JungleStartingCampBadge({ camp }: StartingCampProps) {
  const label = getReadableStartingCamp(camp);
  if (!label) return null;

  return (
    <div
      className={cn(
        "h-5 flex items-center gap-1.5 pl-2 pr-2.5",
        "font-mono text-[9px] uppercase tracking-[0.1em]",
        "border-l-2 bg-black/30",
        getStartingCampClasses(camp)
      )}
    >
      <span className="opacity-40 text-[8px] leading-none">◈</span>
      <span>{label}</span>
    </div>
  );
}
