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
  // ... altri se ti servono
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
