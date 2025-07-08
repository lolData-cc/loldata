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
