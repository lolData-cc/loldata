// Partecipante dentro un match
export type Participant = {
  puuid: string
  summonerName: string
  riotIdGameName?: string
  riotIdTagline?: string
  summoner1Id?: number
  summoner2Id?: number
  championName: string
  profileIconId: number
  kills: number
  deaths: number
  assists: number
  win: boolean
  champLevel: number
  totalMinionsKilled: number
  neutralMinionsKilled: number
  goldEarned: number
  teamId: number
  timePlayed: number
  soloKills: number
  teamPosition?: "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "";
  individualPosition?: "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "";

  // Items
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
  [key: `item${number}`]: number

  //for loldata scores
  challenges?: {
    killParticipation?: number
    teamDamagePercentage?: number
    turretTakedowns?: number
    dragonTakedowns?: number
    baronTakedowns?: number
    damageTakenOnTeamPercentage?: number
    visionScorePerMinute?: number
  }
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
    gameEndTimestamp: number
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
      gameEndTimestamp: number
      [key: string]: any
    }
  },
  win: boolean,
  championName: string
  junglePlaystyle?: MatchJunglePlaystyleResult | null;
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

export type JunglePlaystyleTag =
  | "played_for_topside"
  | "played_for_botside"
  | "played_for_both"
  | null;

export type JungleStartingCamp =
  | "blue"
  | "red"
  | "gromp"
  | "wolves"
  | "raptors"
  | "krugs"
  | null;

export type JungleTeamPlaystyleResult = {
  participantId: number;
  teamId: number;
  tag: JunglePlaystyleTag;
  topsideCount: number;
  botsideCount: number;
  startingCamp: JungleStartingCamp;
};

export type MatchJunglePlaystyleResult = {
  blue: JungleTeamPlaystyleResult | null;
  red: JungleTeamPlaystyleResult | null;
};