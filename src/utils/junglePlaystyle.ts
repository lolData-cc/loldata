import type { JunglePlaystyleTag } from "@/assets/types/riot";

export function getReadableJunglePlaystyleTag(tag: JunglePlaystyleTag) {
  switch (tag) {
    case "played_for_topside":
      return "PLAYED FOR TOPSIDE";
    case "played_for_botside":
      return "PLAYED FOR BOTSIDE";
    case "played_for_both":
      return "PLAYED FOR BOTH";
    default:
      return null;
  }
}

export function getJunglePlaystyleTagClasses(tag: JunglePlaystyleTag) {
  switch (tag) {
    case "played_for_topside":
      return "text-cyan-300 bg-cyan-400/10 border-cyan-400/20";
    case "played_for_botside":
      return "text-orange-300 bg-orange-400/10 border-orange-400/20";
    case "played_for_both":
      return "text-violet-300 bg-violet-400/10 border-violet-400/20";
    default:
      return "";
  }
}