import type { JunglePlaystyleTag } from "@/assets/types/riot";

export function getReadableJunglePlaystyleTag(tag: JunglePlaystyleTag) {
  switch (tag) {
    case "played_for_topside":
      return "TOPSIDE";
    case "played_for_botside":
      return "BOTSIDE";
    case "played_for_both":
      return "BOTH SIDES";
    default:
      return null;
  }
}

export function getJunglePlaystyleTagClasses(tag: JunglePlaystyleTag) {
  switch (tag) {
    case "played_for_topside":
      return "text-cyan-300/90 border-cyan-400/60";
    case "played_for_botside":
      return "text-orange-300/90 border-orange-400/60";
    case "played_for_both":
      return "text-violet-300/90 border-violet-400/60";
    default:
      return "";
  }
}