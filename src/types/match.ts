export interface Participant {
  puuid: string
  summonerName: string
  championName: string
  kills: number
  deaths: number
  assists: number
  win: boolean
  totalMinionsKilled: number
  neutralMinionsKilled: number
  goldEarned: number

  challenges?: {
    killParticipation?: number;
    teamDamagePercentage?: number;
    turretTakedowns?: number;
    dragonTakedowns?: number;
    baronTakedowns?: number;
    damageTakenOnTeamPercentage?: number;
    visionScorePerMinute?: number;
  };
}

export interface MatchInfo {
  gameDuration: number
  participants: Participant[]
}

export interface MatchDetail {
  metadata: { matchId: string }
  info: MatchInfo
}

export interface ChampionAggregatedStats {
  champion: string
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
  winrate: number
  avgGold: number
  avgKda: string | number
  csPerMin: string
}
