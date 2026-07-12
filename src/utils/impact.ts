// Per-game IMPACT score (0–100) — a client-side mirror of the Learn overview's
// computeImpact (loldata-backend .../learn/overview.ts) so the summoner match
// cards read the same "vote" the Learn page shows. Weights an individual game by
// KDA, kill participation, damage / gold / vision share vs. teammates, death
// discipline, plus small solo-kill / first-blood / multikill bonuses.
export function computeImpact(me: any, info: { participants: any[] }): number {
  if (!me || !info?.participants?.length) return 0;
  const myTeamId = me.teamId;
  const teammates = info.participants.filter((p: any) => p.teamId === myTeamId);

  const k = me.kills ?? 0, d = me.deaths ?? 0, a = me.assists ?? 0;
  const myKDA = d === 0 ? (k + a) * 1.5 : (k + a) / d;

  const teamKills = teammates.reduce((s: number, p: any) => s + (p.kills ?? 0), 0);
  const teamDeaths = teammates.reduce((s: number, p: any) => s + (p.deaths ?? 0), 0);
  const teamDmg = teammates.reduce((s: number, p: any) => s + (p.totalDamageDealtToChampions ?? 0), 0);
  const teamGold = teammates.reduce((s: number, p: any) => s + (p.goldEarned ?? 0), 0);
  const teamVision = teammates.reduce((s: number, p: any) => s + (p.visionScore ?? 0), 0);

  const myDmg = me.totalDamageDealtToChampions ?? 0;
  const myGold = me.goldEarned ?? 0;
  const myVision = me.visionScore ?? 0;

  const kp = teamKills > 0 ? (k + a) / teamKills : 0;
  const kpScore = Math.min(20, kp * 25);            // 80% KP = 20

  const dmgShare = teamDmg > 0 ? myDmg / teamDmg : 0.2;
  const dmgScore = Math.min(20, dmgShare * 80);     // 25% share = 20

  const kdaScore = Math.min(25, myKDA * 5);         // 5.0 KDA = 25

  const deathShare = teamDeaths > 0 ? d / teamDeaths : 0.2;
  const deathScore = Math.max(0, 15 - deathShare * 50);

  const visionShare = teamVision > 0 ? myVision / teamVision : 0.2;
  const visionScore = Math.min(10, visionShare * 40);

  const goldShare = teamGold > 0 ? myGold / teamGold : 0.2;
  const goldScore = Math.min(10, goldShare * 40);

  const soloBonus = Math.min(5, ((me.soloKills ?? me.challenges?.soloKills) ?? 0) * 2);
  const fbBonus = me.firstBloodKill ? 2 : 0;
  const multiBonus = Math.min(3, (me.doubleKills ?? 0) + (me.tripleKills ?? 0) * 2);

  const raw = kpScore + dmgScore + kdaScore + deathScore + visionScore + goldScore + soloBonus + fbBonus + multiBonus;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

// jade (strong) / citrine (ok) / red (weak) tier for an impact value
export function impactTone(v: number): "jade" | "citrine" | "red" {
  return v >= 70 ? "jade" : v >= 50 ? "citrine" : "red";
}
