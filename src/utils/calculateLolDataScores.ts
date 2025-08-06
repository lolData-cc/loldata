import type { Participant } from "@/assets/types/riot";

export interface LolDataResult {
  scores: Record<string, number>;
  mvpWin: string;   // puuid
  mvpLose: string;  // puuid
}

export function calculateLolDataScores(participants: Participant[]): LolDataResult {
  const normalize = (values: number[]) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return values.map(v => (max - min === 0 ? 1 : (v - min) / (max - min)));
  };

  const deathsSafe = (d: number) => (d === 0 ? 1 : d);

  const kdaArr = participants.map(p => (p.kills + p.assists) / deathsSafe(p.deaths));
  const killPartArr = participants.map(p => p.challenges?.killParticipation ?? 0);
  const dmgPctArr = participants.map(p => p.challenges?.teamDamagePercentage ?? 0);
  const objArr = participants.map(p =>
    (p.challenges?.turretTakedowns ?? 0) +
    (p.challenges?.dragonTakedowns ?? 0) +
    (p.challenges?.baronTakedowns ?? 0)
  );
  const tankArr = participants.map(p => p.challenges?.damageTakenOnTeamPercentage ?? 0);
  const visionArr = participants.map(p => p.challenges?.visionScorePerMinute ?? 0);

  // Normalize
  const kda_n = normalize(kdaArr);
  const killPart_n = killPartArr; // già in 0-1
  const dmg_n = normalize(dmgPctArr);
  const obj_n = normalize(objArr);
  const tank_n = normalize(tankArr);
  const vision_n = normalize(visionArr);

  // Pesi ottimizzati (più peso a KDA e kill participation)
  const w = {
    killPart: 0.25,
    kda: 0.30,
    dmg: 0.18,
    obj: 0.12,
    vision: 0.08,
    tank: 0.07,
  };

  // Calcolo punteggio grezzo
  const rawScores = participants.map((_, i) =>
    killPart_n[i] * w.killPart +
    kda_n[i] * w.kda +
    dmg_n[i] * w.dmg +
    obj_n[i] * w.obj +
    vision_n[i] * w.vision +
    tank_n[i] * w.tank
  );

  // Scala tra 4 e 10
  const minScore = Math.min(...rawScores);
  const maxScore = Math.max(...rawScores);
  const scoresScaled = rawScores.map(s => 4 + ((s - minScore) / (maxScore - minScore)) * (10 - 4));

  // Assegna per puuid
  const scores: Record<string, number> = {};
  participants.forEach((p, i) => {
    scores[p.puuid] = parseFloat(scoresScaled[i].toFixed(2));
  });

  // Trova MVP vincente e perdente
  const teamWin = participants.find(p => p.win)?.teamId;
  const teamLose = teamWin === 100 ? 200 : 100;

  const mvpWin = participants
    .filter(p => p.teamId === teamWin)
    .reduce((best, p) => scores[p.puuid] > (scores[best] ?? -1) ? p.puuid : best, "");

  const mvpLose = participants
    .filter(p => p.teamId === teamLose)
    .reduce((best, p) => scores[p.puuid] > (scores[best] ?? -1) ? p.puuid : best, "");

  return { scores, mvpWin, mvpLose };
}
