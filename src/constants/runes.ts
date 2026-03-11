const PERK_BASE = "https://ddragon.leagueoflegends.com/cdn/img/perk-images";

// ── Style (tree) icons ──────────────────────────────────────────────

const STYLE_ICON_MAP: Record<number, string> = {
  8000: "Styles/7201_Precision.png",
  8100: "Styles/7200_Domination.png",
  8200: "Styles/7202_Sorcery.png",
  8300: "Styles/7203_Whimsy.png",
  8400: "Styles/7204_Resolve.png",
};

// ── Keystone icons ──────────────────────────────────────────────────

const KEYSTONE_ICON_MAP: Record<number, string> = {
  // Precision
  8005: "Styles/Precision/PressTheAttack/PressTheAttack.png",
  8008: "Styles/Precision/LethalTempo/LethalTempoTemp.png",
  8021: "Styles/Precision/FleetFootwork/FleetFootwork.png",
  8010: "Styles/Precision/Conqueror/Conqueror.png",
  // Domination
  8112: "Styles/Domination/Electrocute/Electrocute.png",
  8128: "Styles/Domination/DarkHarvest/DarkHarvest.png",
  9923: "Styles/Domination/HailOfBlades/HailOfBlades.png",
  // Sorcery
  8214: "Styles/Sorcery/SummonAery/SummonAery.png",
  8229: "Styles/Sorcery/ArcaneComet/ArcaneComet.png",
  8230: "Styles/Sorcery/PhaseRush/PhaseRush.png",
  // Resolve
  8437: "Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png",
  8439: "Styles/Resolve/VeteranAftershock/VeteranAftershock.png",
  8465: "Styles/Resolve/Guardian/Guardian.png",
  // Inspiration
  8351: "Styles/Inspiration/GlacialAugment/GlacialAugment.png",
  8360: "Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png",
  8369: "Styles/Inspiration/FirstStrike/FirstStrike.png",
};

// ── Name maps ───────────────────────────────────────────────────────

const KEYSTONE_NAME_MAP: Record<number, string> = {
  // Precision
  8005: "Press the Attack",
  8008: "Lethal Tempo",
  8021: "Fleet Footwork",
  8010: "Conqueror",
  // Domination
  8112: "Electrocute",
  8128: "Dark Harvest",
  9923: "Hail of Blades",
  // Sorcery
  8214: "Summon Aery",
  8229: "Arcane Comet",
  8230: "Phase Rush",
  // Resolve
  8437: "Grasp of the Undying",
  8439: "Aftershock",
  8465: "Guardian",
  // Inspiration
  8351: "Glacial Augment",
  8360: "Unsealed Spellbook",
  8369: "First Strike",
};

const STYLE_NAME_MAP: Record<number, string> = {
  8000: "Precision",
  8100: "Domination",
  8200: "Sorcery",
  8300: "Inspiration",
  8400: "Resolve",
};

// ── Helpers ─────────────────────────────────────────────────────────

export function getKeystoneIcon(perkId: number): string | null {
  const path = KEYSTONE_ICON_MAP[perkId];
  return path ? `${PERK_BASE}/${path}` : null;
}

export function getStyleIcon(styleId: number): string | null {
  const path = STYLE_ICON_MAP[styleId];
  return path ? `${PERK_BASE}/${path}` : null;
}

export function getKeystoneName(perkId: number): string | null {
  return KEYSTONE_NAME_MAP[perkId] ?? null;
}

export function getStyleName(styleId: number): string | null {
  return STYLE_NAME_MAP[styleId] ?? null;
}
