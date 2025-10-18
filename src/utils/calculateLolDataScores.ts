import type { Participant } from "@/assets/types/riot";

export interface LolDataResult {
  scores: Record<string, number>;
  mvpWin: string;   // puuid
  mvpLose: string;  // puuid
}

export function calculateLolDataScores(participants: Participant[]): LolDataResult {
  // --- Helpers ---
  const byTeam = (teamId: number) => participants.filter(p => p.teamId === teamId);
  const teams = {
    winId: participants.find(p => p.win)?.teamId ?? 100,
    loseId: (participants.find(p => p.win)?.teamId ?? 100) === 100 ? 200 : 100,
  };

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const deathsSafe = (d: number) => (d <= 0 ? 1 : d);

  // Percentile-like winsorize on [0..1] arrays to kill outliers without destroying ranking
  const winsorize01 = (arr: number[], low = 0.05, high = 0.95) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const loV = sorted[Math.floor((sorted.length - 1) * low)];
    const hiV = sorted[Math.floor((sorted.length - 1) * high)];
    return arr.map(v => clamp((v - loV) / (hiV - loV || 1), 0, 1));
  };

  // team-wise minmax normalize (stable when all same values)
  const normalizeTeam = (vals: number[], idxs: number[]) => {
    const teamVals = idxs.map(i => vals[i]);
    const min = Math.min(...teamVals);
    const max = Math.max(...teamVals);
    const denom = max - min || 1;
    const out = Array(vals.length).fill(0);
    idxs.forEach(i => { out[i] = (vals[i] - min) / denom; });
    return out;
  };

  // Build per-index team membership
  const idxTeam100 = participants.map((p, i) => p.teamId === 100 ? i : -1).filter(i => i >= 0);
  const idxTeam200 = participants.map((p, i) => p.teamId === 200 ? i : -1).filter(i => i >= 0);

  // --- Raw features ---
  const kills = participants.map(p => p.kills ?? 0);
  const assists = participants.map(p => p.assists ?? 0);
  const deaths = participants.map(p => p.deaths ?? 0);

  // KDA “robusto”: pesiamo un po’ meno gli assist e penalizziamo le morti con esponente >1
  const kdaRobust = participants.map((p) => {
    const num = p.kills + 0.7 * p.assists;
    return num / Math.pow(deathsSafe(p.deaths), 1.15);
  });

  // Kill participation già 0..1 a livello di team (se non presente mettiamo 0)
  const killPart = participants.map(p => p.challenges?.killParticipation ?? 0);

  // Team damage% e damageTaken% sono già “quota di team” (0..1)
  const dmgPct = participants.map(p => p.challenges?.teamDamagePercentage ?? 0);
  const tankPct = participants.map(p => p.challenges?.damageTakenOnTeamPercentage ?? 0);

  // Vision score per minuto (normalizziamo per team)
  const visionSpm = participants.map(p => p.challenges?.visionScorePerMinute ?? 0);

  // Semplice score “obiettivi” (normalizziamo per team)
  const objRaw = participants.map(p =>
    (p.challenges?.turretTakedowns ?? 0) +
    (p.challenges?.dragonTakedowns ?? 0) +
    (p.challenges?.baronTakedowns ?? 0)
  );

  // --- Team-wise normalization ---
  const kda_n      = normalizeTeam(kdaRobust, idxTeam100).map((_, i) =>
                      i in kdaRobust ? normalizeTeam(kdaRobust, idxTeam200)[i] ?? _ : _);
  const vision_n   = normalizeTeam(visionSpm, idxTeam100).map((_, i) =>
                      i in visionSpm ? normalizeTeam(visionSpm, idxTeam200)[i] ?? _ : _);
  const obj_n      = normalizeTeam(objRaw, idxTeam100).map((_, i) =>
                      i in objRaw ? normalizeTeam(objRaw, idxTeam200)[i] ?? _ : _);

  // Per questi già [0..1] “per team”, ma winsorizziamo per tagliare outlier
  const killPart_n = winsorize01(killPart);
  const dmg_n      = winsorize01(dmgPct);
  const tank_n     = winsorize01(tankPct);

  // --- Profili dinamici (carry / frontline / support) ---
  // Indizi semplici: frontline se top-2 tank% nel team; support se visione top-2 e dmg% basso
  const isTopNInTeam = (metric: number[], idxs: number[], n = 2) => {
    const ordered = [...idxs].sort((a, b) => metric[b] - metric[a]);
    const set = new Set(ordered.slice(0, Math.min(n, ordered.length)));
    return participants.map((_, i) => set.has(i));
  };
  const frontlineFlag = (() => {
    const f100 = isTopNInTeam(tankPct, idxTeam100, 2);
    const f200 = isTopNInTeam(tankPct, idxTeam200, 2);
    return participants.map((_, i) => (f100[i] || f200[i]));
  })();

  const supportFlag = (() => {
    const v100 = isTopNInTeam(visionSpm, idxTeam100, 2);
    const v200 = isTopNInTeam(visionSpm, idxTeam200, 2);
    return participants.map((_, i) => (v100[i] || v200[i]) && dmgPct[i] <= 0.18);
  })();

  // Pesi per profilo (somma ~1)
  const W_CARRY     = { killPart: 0.24, kda: 0.26, dmg: 0.22, obj: 0.12, vision: 0.08, tank: 0.08 };
  const W_FRONTLINE = { killPart: 0.18, kda: 0.18, dmg: 0.12, obj: 0.16, vision: 0.12, tank: 0.24 };
  const W_SUPPORT   = { killPart: 0.22, kda: 0.20, dmg: 0.10, obj: 0.12, vision: 0.24, tank: 0.12 };

  const pickWeights = (i: number) => (supportFlag[i] ? W_SUPPORT : (frontlineFlag[i] ? W_FRONTLINE : W_CARRY));

  // --- Penalità morti e guard-rail anti-int ---
  // Penalità morbida: se muori molto più della media del tuo team, il punteggio viene diviso.
  const deathPenalty = participants.map((p, i) => {
    const team = p.teamId;
    const teamDeaths = byTeam(team).map(x => x.deaths);
    const avg = teamDeaths.reduce((a, b) => a + b, 0) / (teamDeaths.length || 1);
    const ratio = deaths[i] / (avg || 1);
    // exponent >1 punisce outlier; clamp per non distruggere totalmente
    return clamp(Math.pow(ratio || 1, 1.10), 0.85, 1.5);
  });

  // “No-int gate”: se KDA è <0.6 e deaths >= 12, applichiamo una botta secca (evita il caso 1/14 MVP)
  const hardIntPenalty = participants.map((p, i) => {
    const kdaBasic = (p.kills + p.assists) / deathsSafe(p.deaths);
    if (kdaBasic < 0.6 && p.deaths >= 12) return 0.6; // -40%
    return 1.0;
  });

  // --- Score grezzo con pesi dinamici ---
  const rawScores = participants.map((_, i) => {
    const w = pickWeights(i);
    let s =
      killPart_n[i] * w.killPart +
      kda_n[i]      * w.kda +
      dmg_n[i]      * w.dmg +
      obj_n[i]      * w.obj +
      vision_n[i]   * w.vision +
      tank_n[i]     * w.tank;

    // applica penalità
    s = s / deathPenalty[i];
    s = s * hardIntPenalty[i];
    return s;
  });

  // --- Scaling a [4..10] (stabile se tutti uguali) ---
  const minScore = Math.min(...rawScores);
  const maxScore = Math.max(...rawScores);
  const denom = (maxScore - minScore) || 1;
  const scoresScaled = rawScores.map(s => 4 + ((s - minScore) / denom) * 6);

  // --- Output per puuid ---
  const scores: Record<string, number> = {};
  participants.forEach((p, i) => { scores[p.puuid] = parseFloat(scoresScaled[i].toFixed(2)); });

  // --- MVP per team con una soglia minima di KDA per eleggibilità ---
  const eligible = (p: Participant) => {
    const kdaBasic = (p.kills + p.assists) / deathsSafe(p.deaths);
    // soglia soft: almeno 0.75 di KDA (evita premi a chi ha griefato duro)
    return kdaBasic >= 0.75;
  };

  const mvpForTeam = (teamId: number) => {
    const teamPlayers = participants.filter(p => p.teamId === teamId);
    // tra gli idonei; se nessuno idoneo, prendi comunque il best score
    const pool = teamPlayers.filter(eligible);
    const base = (pool.length ? pool : teamPlayers)[0]?.puuid ?? "";
    return (pool.length ? pool : teamPlayers).reduce(
      (best, p) => (scores[p.puuid] > (scores[best] ?? -1) ? p.puuid : best),
      base
    );
  };

  const mvpWin  = mvpForTeam(teams.winId);
  const mvpLose = mvpForTeam(teams.loseId);

  return { scores, mvpWin, mvpLose };
}
