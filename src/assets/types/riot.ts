// Partecipante dentro un match
export type Participant = {
  puuid: string
  summonerName: string
  riotIdGameName?: string
  riotIdTagline?: string
  championName: string
  kills: number
  deaths: number
  assists: number
  win: boolean
  totalMinionsKilled: number
  neutralMinionsKilled: number
  goldEarned: number
  teamId: number
}


export type MatchDetail = {
  metadata: {
    matchId: string
    participants: string[]
  }
  info: {
    gameDuration: number
    participants: Participant[]
    queueId: number
    gameMode: string
    gameType: string
    gameStartTimestamp: number
  }
}



export type MatchWithWin = {
  match: {
    metadata: { matchId: string },
    info: {
      queueId: number,
      gameDuration: number
      participants: Participant[]
      gameMode: string
      gameType: string
      gameStartTimestamp: number
      [key: string]: any
    }
  },
  win: boolean,
  championName: string
}


export type SummonerInfo = {
  name: string
  puuid: string
  tag: string
  rank: string
  lp: number
  wins: number
  losses: number
  profileIconId: number
  level: number
  live: boolean
  peakRank?: string
  peakLp?: number
}

export type ChampionStats = {
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