export interface RiotAccount {
  puuid: string
  gameName: string
  tagLine: string
}

export interface RiotSummoner {
  id: string
  accountId: string
  puuid: string
  name: string
  profileIconId: number
  summonerLevel: number
}

export interface RiotRankedEntry {
  leagueId: string
  queueType: "RANKED_SOLO_5x5" | "RANKED_FLEX_SR"
  tier: string
  rank: string
  leaguePoints: number
  wins: number
  losses: number
}

export type JunglePlaystyleTag =
  | "played_for_topside"
  | "played_for_botside"
  | "played_for_both"
  | null;

export type JungleTeamPlaystyleResult = {
  participantId: number;
  teamId: number;
  tag: JunglePlaystyleTag;
  topsideCount: number;
  botsideCount: number;
};

export type MatchJunglePlaystyleResult = {
  blue: JungleTeamPlaystyleResult | null;
  red: JungleTeamPlaystyleResult | null;
};