// src/lib/proBadges.ts
//
// Shared shapes for GET /api/pros/badge-map, the one call every page makes to
// decide which scoreboard nameplates get a PRO / STR badge.
//
// The endpoint returns two flat arrays (fast Set.has() checks) PLUS two
// nametag → identity maps, so a nameplate can also say WHO the player is
// ("Faker") and link to their profile without a request per player.

export type BadgeIdentity = {
  /** The handle everyone knows them by — "Faker", "Caps". */
  name: string;
  /** Their /players/<slug> page. */
  slug: string;
};

export type BadgeNameMap = Map<string, BadgeIdentity>;

export type BadgeMapResponse = {
  pros?: string[];
  streamers?: string[];
  proNames?: Record<string, BadgeIdentity>;
  streamerNames?: Record<string, BadgeIdentity>;
};

/** "Name#TAG" → the lowercased key the badge maps are indexed by. */
export function badgeKey(riotName?: string | null, tag?: string | null): string {
  return riotName && tag ? `${riotName}#${tag}`.toLowerCase() : "";
}
