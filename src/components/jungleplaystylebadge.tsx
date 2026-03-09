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
    <span
      className={cn(
        "px-1.5 py-[1px] rounded-sm text-[10px] uppercase border font-medium tracking-wide",
        getJunglePlaystyleTagClasses(tag)
      )}
    >
      {label}
    </span>
  );
}