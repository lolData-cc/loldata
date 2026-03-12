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
    wins: number;
    winRate: number;
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