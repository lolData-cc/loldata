import type { JunglePlaystyleTag } from "@/assets/types/riot";
import { cn } from "@/lib/utils";
import {
  getReadableJunglePlaystyleTag,
  getJunglePlaystyleTagClasses,
} from "@/utils/junglePlaystyle";

type Props = {
  tag: JunglePlaystyleTag;
};

export function JunglePlaystyleBadge({ tag }: Props) {
  const label = getReadableJunglePlaystyleTag(tag);
  if (!label) return null;

  return (
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
}
