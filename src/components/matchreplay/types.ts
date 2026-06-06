// src/components/matchreplay/types.ts
//
// Match-V5 Timeline DTOs — narrow but practical. We type only the
// fields we actually read in the UI. Anything obscure / situational
// stays loose so the parser doesn't ossify around Riot's quirks.
//
// Reference layout:
//   MatchTimelineDto
//     ├── metadata
//     │     ├── matchId
//     │     └── participants: string[]   // puuid[], indexed 0..9 → participantId 1..10
//     └── info
//           ├── frameInterval: number    // ms (usually 60_000)
//           ├── frames: FrameDto[]
//           └── participants: { participantId, puuid }[]

export type Position = { x: number; y: number };
export type TeamId = 100 | 200;

export interface ChampionStats {
  abilityHaste?: number;
  abilityPower?: number;
  armor?: number;
  armorPen?: number;
  armorPenPercent?: number;
  attackDamage?: number;
  attackSpeed?: number;
  bonusArmorPenPercent?: number;
  bonusMagicPenetrationPercent?: number;
  ccReduction?: number;
  cooldownReduction?: number;
  currentHealth?: number;
  healthMax?: number;
  healthRegen?: number;
  lifesteal?: number;
  magicPen?: number;
  magicPenPercent?: number;
  magicResist?: number;
  movementSpeed?: number;
  omnivamp?: number;
  physicalVamp?: number;
  power?: number;
  powerMax?: number;
  powerRegen?: number;
  spellVamp?: number;
}

export interface DamageStats {
  magicDamageDone?: number;
  magicDamageDoneToChampions?: number;
  magicDamageTaken?: number;
  physicalDamageDone?: number;
  physicalDamageDoneToChampions?: number;
  physicalDamageTaken?: number;
  trueDamageDone?: number;
  trueDamageDoneToChampions?: number;
  trueDamageTaken?: number;
  totalDamageDone?: number;
  totalDamageDoneToChampions?: number;
  totalDamageTaken?: number;
}

export interface ParticipantFrame {
  participantId: number;
  position: Position;
  level: number;
  xp: number;
  currentGold: number;
  totalGold: number;
  goldPerSecond?: number;
  minionsKilled: number;
  jungleMinionsKilled: number;
  timeEnemySpentControlled?: number;
  championStats: ChampionStats;
  damageStats: DamageStats;
}

export type EventType =
  | "PAUSE_END"
  | "PAUSE_START"
  | "GAME_END"
  | "SKILL_LEVEL_UP"
  | "LEVEL_UP"
  | "CHAMPION_KILL"
  | "CHAMPION_SPECIAL_KILL"
  | "CHAMPION_TRANSFORM"
  | "ITEM_PURCHASED"
  | "ITEM_DESTROYED"
  | "ITEM_UNDO"
  | "ITEM_SOLD"
  | "WARD_PLACED"
  | "WARD_KILL"
  | "ELITE_MONSTER_KILL"
  | "BUILDING_KILL"
  | "TURRET_PLATE_DESTROYED"
  | "DRAGON_SOUL_GIVEN"
  | "OBJECTIVE_BOUNTY_START"
  | "OBJECTIVE_BOUNTY_END"
  | "OBJECTIVE_BOUNTY_FINISH";

export interface VictimDamage {
  basic: boolean;
  magicDamage: number;
  physicalDamage: number;
  trueDamage: number;
  name: string;
  participantId: number;
  spellName: string;
  spellSlot: number;
  type: string;
}

export interface TimelineEvent {
  type: EventType | string;
  timestamp: number;       // ms from game start
  realTimestamp?: number;  // unix ms, only on PAUSE_END & GAME_END
  participantId?: number;
  killerId?: number;
  victimId?: number;
  creatorId?: number;
  assistingParticipantIds?: number[];
  position?: Position;
  bounty?: number;
  shutdownBounty?: number;
  killStreakLength?: number;
  victimDamageDealt?: VictimDamage[];
  victimDamageReceived?: VictimDamage[];

  // CHAMPION_SPECIAL_KILL
  killType?: "KILL_FIRST_BLOOD" | "KILL_ACE" | "KILL_MULTI";
  multiKillLength?: number;

  // ITEM_*
  itemId?: number;
  beforeId?: number;
  afterId?: number;
  goldGain?: number;

  // WARD_*
  wardType?:
    | "YELLOW_TRINKET"
    | "SIGHT_WARD"
    | "CONTROL_WARD"
    | "BLUE_TRINKET"
    | "TEEMO_MUSHROOM"
    | "UNDEFINED";

  // BUILDING_KILL / TURRET_PLATE_DESTROYED
  buildingType?: "TOWER_BUILDING" | "INHIBITOR_BUILDING";
  towerType?: "OUTER_TURRET" | "INNER_TURRET" | "BASE_TURRET" | "NEXUS_TURRET";
  laneType?: "TOP_LANE" | "MID_LANE" | "BOT_LANE";
  teamId?: TeamId | 0;

  // ELITE_MONSTER_KILL
  monsterType?: "DRAGON" | "RIFTHERALD" | "BARON_NASHOR" | "HORDE" | "ATAKHAN";
  monsterSubType?:
    | "AIR_DRAGON"
    | "FIRE_DRAGON"
    | "EARTH_DRAGON"
    | "WATER_DRAGON"
    | "HEXTECH_DRAGON"
    | "CHEMTECH_DRAGON"
    | "ELDER_DRAGON";
  killerTeamId?: TeamId | 0;

  // DRAGON_SOUL_GIVEN
  name?: string;

  // SKILL_LEVEL_UP / LEVEL_UP
  skillSlot?: 1 | 2 | 3 | 4;
  levelUpType?: "NORMAL" | "EVOLVE";
  level?: number;

  // CHAMPION_TRANSFORM
  transformType?: "ASSASSIN" | "SLAYER";

  // GAME_END
  gameId?: number;
  winningTeam?: TeamId;

  // OBJECTIVE_BOUNTY_END
  actualStartTime?: number;
}

export interface TimelineFrame {
  timestamp: number;
  events: TimelineEvent[];
  participantFrames: Record<string, ParticipantFrame>;
}

export interface TimelineParticipantRef {
  participantId: number;
  puuid: string;
}

export interface MatchTimeline {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];   // puuids in participantId order (1..10)
  };
  info: {
    frameInterval: number;    // ms
    endOfGameResult?: string;
    gameId?: number;
    participants: TimelineParticipantRef[];
    frames: TimelineFrame[];
  };
}

// ───── Static match-v5 (the non-timeline blob) — minimal projection ─────
// We don't actually fetch it inside MatchReplayDialog; the surrounding
// summoner page already has `match.info.participants` etc. So we just
// type the subset we use when reading from the parent.

export interface StaticParticipant {
  puuid: string;
  participantId?: number;
  teamId: TeamId;
  championId: number;
  championName: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  summoner1Id: number;
  summoner2Id: number;
  perks?: {
    styles?: Array<{
      style?: number;
      selections?: Array<{ perk?: number }>;
    }>;
  };
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  visionScore?: number;
  win: boolean;
  individualPosition?: string;
  teamPosition?: string;
}

export interface StaticTeam {
  teamId: TeamId;
  win: boolean;
  bans: Array<{ championId: number; pickTurn: number }>;
  objectives?: Record<string, { kills: number; first: boolean }>;
}

export interface StaticMatchInfo {
  gameDuration: number;
  gameStartTimestamp?: number;
  gameEndTimestamp?: number;
  queueId: number;
  participants: StaticParticipant[];
  teams: StaticTeam[];
}

export interface StaticMatch {
  metadata: { matchId: string };
  info: StaticMatchInfo;
}
