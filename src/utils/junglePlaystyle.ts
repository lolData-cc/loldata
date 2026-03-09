import type { JunglePlaystyleTag, JungleStartingCamp } from "@/assets/types/riot";

export function getReadableJunglePlaystyleTag(tag: JunglePlaystyleTag) {
  switch (tag) {
    case "played_for_topside":
      return "PLAYED TOP";
    case "played_for_botside":
      return "PLAYED BOT";
    case "played_for_both":
      return "EVERYWHERE";
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

export function getReadableStartingCamp(camp: JungleStartingCamp) {
  switch (camp) {
    case "blue":
      return "START BLUE";
    case "red":
      return "START RED";
    case "gromp":
      return "START GROMP";
    case "wolves":
      return "START WOLVES";
    case "raptors":
      return "START RAPTORS";
    case "krugs":
      return "START KRUGS";
    default:
      return null;
  }
}

export function getStartingCampClasses(camp: JungleStartingCamp) {
  switch (camp) {
    case "blue":
      return "text-blue-300/90 border-blue-400/60";
    case "red":
      return "text-red-300/90 border-red-400/60";
    case "gromp":
      return "text-teal-300/90 border-teal-400/60";
    case "wolves":
      return "text-slate-300/90 border-slate-400/60";
    case "raptors":
      return "text-amber-300/90 border-amber-400/60";
    case "krugs":
      return "text-stone-300/90 border-stone-400/60";
    default:
      return "";
  }
}