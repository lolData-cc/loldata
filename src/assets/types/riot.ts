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

  perks?: {
    styles: {
      description: string
      selections: { perk: number }[]
      style: number
    }[]
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
  | "enemy_blue"
  | "enemy_red"
  | "enemy_gromp"
  | "enemy_wolves"
  | "enemy_raptors"
  | "enemy_krugs"
  | null;

export type JungleInvade = "invade" | "no_invade" | null;

export type JungleTeamPlaystyleResult = {
  participantId: number;
  teamId: number;
  tag: JunglePlaystyleTag;
  topsideCount: number;
  botsideCount: number;
  startingCamp: JungleStartingCamp;
  invade: JungleInvade;
};

export type MatchJunglePlaystyleResult = {
  blue: JungleTeamPlaystyleResult | null;
  red: JungleTeamPlaystyleResult | null;
};

// ── Player Analysis (deep scan) ──────────────────────────────────

export type PlayerAnalysisResult = {
  meta: {
    puuid: string;
    region: string;
    matchesAnalyzed: number;
  };

  roleDistribution: { role: string; games: number; pct: number }[];
  primaryRole: string;
  isJungler: boolean;

  championPool: {
    championName: string;
    games: number;
    wins: number;
    winrate: number;
    avgKills: number;
    avgDeaths: number;
    avgAssists: number;
    avgKda: number;
    avgCsPerMin: number;
  }[];

  overallStats: {
    games: number;
    wins: number;
    winrate: number;
    avgKills: number;
    avgDeaths: number;
    avgAssists: number;
    avgKda: number;
    avgCsPerMin: number;
    avgGoldPerMin: number;
    avgKillParticipation: number;
    avgDamageShare: number;
    avgVisionPerMin: number;
    avgSoloKills: number;
  };

  winLossComparison: {
    metric: string;
    onWin: number;
    onLoss: number;
    delta: number;
  }[];

  jungleAnalysis?: {
    gamesAsJungler: number;
    startingCamps: { camp: string; count: number; pct: number }[];
    preferredStart: string;
    preferredStartPct: number;
    playstyleTags: { tag: string; count: number; pct: number }[];
    invadeRate: number;
    avgTopsideCount: number;
    avgBotsideCount: number;
  };

  wardDistribution: {
    topside: number;
    botside: number;
    neutral: number;
    totalWards: number;
    topsidePct: number;
    botsidePct: number;
  };

  bootsDistribution: {
    boots: string;
    count: number;
    pct: number;
  }[];

  earlyGameAnalysis: {
    gamesWithTimeline: number;
    aheadAtTen: { games: number; wins: number; winrate: number };
    behindAtTen: { games: number; wins: number; winrate: number };
    evenAtTen: { games: number; wins: number; winrate: number };
    avgKillDiffAtTen: number;
    avgGoldDiffAtTen: number;
    avgCsDiffAtTen: number;
    firstBloodRate: number;
    firstBloodWinrate: number;
  };

  weaknesses: {
    id: string;
    severity: "critical" | "major" | "minor";
    title: string;
    description: string;
  }[];

  counterTips: {
    category: string;
    tip: string;
    reasoning: string;
  }[];
};