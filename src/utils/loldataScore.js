const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const safeDeaths = (d) => (d <= 0 ? 1 : d);
const perMin = (v, secs) => v / Math.max(1, (secs || 1) / 60);
function posOf(p) {
    return (p.teamPosition || p.individualPosition || "").toUpperCase();
}
// Per-game, per-metric position in [0,1] where 0.5 = neutral.
// Lane-duel metrics compare you to your same-role opponent (the truest same-MMR
// yardstick); team-contribution metrics use your rank within the 10-player lobby.
function gameMetrics(me, all) {
    const enemies = all.filter((p) => p.teamId !== me.teamId);
    const myPos = posOf(me);
    const opp = myPos ? enemies.find((p) => posOf(p) === myPos) ?? null : null;
    const lobbyPct = (val) => {
        const v = val(me);
        const others = all.filter((p) => p !== me);
        let below = 0, eq = 0;
        for (const p of others) {
            const pv = val(p);
            if (pv < v)
                below++;
            else if (pv === v)
                eq++;
        }
        return (below + eq * 0.5) / (others.length || 1);
    };
    // me / (me + opp) → 0.5 when tied; falls back to lobby percentile with no opponent
    const duel = (val) => {
        if (!opp)
            return lobbyPct(val);
        const a = Math.max(0, val(me));
        const b = Math.max(0, val(opp));
        if (a + b <= 0)
            return 0.5;
        return clamp(a / (a + b), 0, 1);
    };
    const cs = (p) => (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0);
    const kdaRobust = (p) => (p.kills + 0.7 * p.assists) / Math.pow(safeDeaths(p.deaths), 1.15);
    const dmg = (p) => p.totalDamageDealtToChampions ?? 0;
    const kp = (p) => p.challenges?.killParticipation ?? 0;
    const visM = (p) => p.challenges?.visionScorePerMinute ?? perMin(p.visionScore ?? 0, p.timePlayed);
    const obj = (p) => (p.challenges?.turretTakedowns ?? 0) +
        (p.challenges?.dragonTakedowns ?? 0) +
        (p.challenges?.baronTakedowns ?? 0) +
        (p.challenges?.riftHeraldTakedowns ?? 0);
    return {
        kda: duel(kdaRobust),
        kp: lobbyPct(kp),
        damage: duel(dmg),
        cs: duel((p) => perMin(cs(p), p.timePlayed)),
        gold: duel((p) => perMin(p.goldEarned ?? 0, p.timePlayed)),
        vision: lobbyPct(visM),
        objectives: lobbyPct(obj),
    };
}
// How much each dimension counts toward the final score, per role (sums to 1).
// Vision is intentionally light — it's the least skill-indicative metric for most
// roles, so it never drags a dominant carry (it stays a small factor even for
// supports, where playmaking/KP matter more than raw ward score).
const ROLE_W = {
    TOP: { combat: 0.32, damage: 0.26, economy: 0.22, vision: 0.04, objectives: 0.16 },
    MIDDLE: { combat: 0.32, damage: 0.28, economy: 0.22, vision: 0.04, objectives: 0.14 },
    BOTTOM: { combat: 0.30, damage: 0.32, economy: 0.24, vision: 0.04, objectives: 0.10 },
    JUNGLE: { combat: 0.30, damage: 0.18, economy: 0.14, vision: 0.06, objectives: 0.32 },
    UTILITY: { combat: 0.30, damage: 0.12, economy: 0.08, vision: 0.22, objectives: 0.28 },
    DEFAULT: { combat: 0.30, damage: 0.24, economy: 0.18, vision: 0.08, objectives: 0.20 },
};
function verdictFor(score) {
    if (score >= 78)
        return "Hard-carrying your elo";
    if (score >= 66)
        return "Outperforming your rank";
    if (score >= 57)
        return "Above your bracket";
    if (score >= 44)
        return "At your rank level";
    if (score >= 33)
        return "Below your bracket";
    return "Underperforming your rank";
}
const EMPTY = {
    score: 50, delta: 0, verdict: "Not enough games", games: 0, confidence: 0,
    winrate: 0, lobbyPercentile: 0.5,
    dimensions: { combat: 50, damage: 50, economy: 50, vision: 50, objectives: 50 },
};
export function calculateLoldataScore(matches, puuid, maxGames = 20) {
    if (!puuid || !matches.length)
        return EMPTY;
    const recent = matches.slice(0, maxGames);
    const dimAcc = { combat: 0, damage: 0, economy: 0, vision: 0, objectives: 0 };
    const posTally = {};
    const perfGame = [];
    let games = 0, wins = 0;
    for (const m of recent) {
        const all = m.match.info.participants;
        const me = all.find((p) => p.puuid === puuid);
        if (!me || all.length < 6)
            continue; // need a real lobby to compare against
        games++;
        if (m.win)
            wins++;
        posTally[posOf(me) || "DEFAULT"] = (posTally[posOf(me) || "DEFAULT"] ?? 0) + 1;
        const g = gameMetrics(me, all);
        const dim = {
            combat: (g.kda + g.kp) / 2,
            damage: g.damage,
            economy: (g.cs + g.gold) / 2,
            vision: g.vision,
            objectives: g.objectives,
        };
        dimAcc.combat += dim.combat;
        dimAcc.damage += dim.damage;
        dimAcc.economy += dim.economy;
        dimAcc.vision += dim.vision;
        dimAcc.objectives += dim.objectives;
        // per-game overall performance uses THIS game's role weighting
        const w = ROLE_W[posOf(me)] ?? ROLE_W.DEFAULT;
        perfGame.push(dim.combat * w.combat + dim.damage * w.damage + dim.economy * w.economy +
            dim.vision * w.vision + dim.objectives * w.objectives);
    }
    if (games === 0)
        return EMPTY;
    const meanDim = (v) => v / games;
    const dimensions = {
        combat: Math.round(meanDim(dimAcc.combat) * 100),
        damage: Math.round(meanDim(dimAcc.damage) * 100),
        economy: Math.round(meanDim(dimAcc.economy) * 100),
        vision: Math.round(meanDim(dimAcc.vision) * 100),
        objectives: Math.round(meanDim(dimAcc.objectives) * 100),
    };
    const winrate = wins / games;
    const pBar = perfGame.reduce((a, b) => a + b, 0) / games; // mean lobby performance, 0.5 = average
    // consistency: reward players who are reliably above the lobby, not coin-flips
    const variance = perfGame.reduce((a, b) => a + (b - pBar) ** 2, 0) / games;
    const std = Math.sqrt(variance);
    const consistency = 1 - clamp(std / 0.30, 0, 1) * 0.15; // ∈ [0.85, 1]
    // "are you above your rank": individual performance leads, but winrate is a
    // strong confirmer — dominating (winning ~everything) is definitive proof you
    // out-rank your bracket, so it must be able to push the score high on its own.
    let above = 0.6 * (pBar - 0.5) + 0.4 * (winrate - 0.5);
    if (above > 0)
        above *= consistency;
    // sample shrinkage → few games can't earn a big score (but not too harsh)
    const confidence = games / (games + 4);
    const aboveShrunk = above * confidence;
    const score = clamp(Math.round(50 + aboveShrunk * 140), 2, 98);
    return {
        score,
        delta: score - 50,
        verdict: verdictFor(score),
        games,
        confidence,
        winrate,
        lobbyPercentile: pBar,
        dimensions,
    };
}
