// src/components/matchreplay/derive.ts
//
// Pure-function layer on top of MatchTimeline. Nothing here touches React.
// Each helper takes the timeline (and optionally a time-in-ms cursor)
// and returns a derived view: positions, inventories, gold totals,
// damage running, events visible, etc.
//
// Design notes:
//   • Frames live at fixed intervals (`frameInterval`, usually 60_000 ms).
//     Events have precise sub-frame timestamps. To render a continuous
//     playhead we LINEARLY INTERPOLATE between consecutive frames for
//     positions/gold/xp/level/cs, but for events we cut sharply at the
//     event timestamp.
//   • Damage/gold/xp/cs are CUMULATIVE in the raw payload. Per-minute
//     deltas are derived by subtracting consecutive frames.
//   • Team mapping: participantId 1..5 = team 100 (blue),
//                   participantId 6..10 = team 200 (red).
//   • SR map bounds — Riot's coordinate space goes 0..15000 on x and y.
//     y=0 is the bottom of the map (blue base). When rendering, flip Y.
export const MAP_SIZE_RIOT = 15000;
export const BLUE_IDS = [1, 2, 3, 4, 5];
export const RED_IDS = [6, 7, 8, 9, 10];
export function teamOf(pid) {
    return pid <= 5 ? 100 : 200;
}
/**
 * Build a Map from puuid → participantId. Cheap and idempotent.
 */
export function puuidToPid(tl) {
    const m = new Map();
    tl.metadata.participants.forEach((p, i) => m.set(p, i + 1));
    return m;
}
/**
 * Frame index that ENCLOSES the given time. Returns:
 *   { lo, hi, t } where lo and hi are frame indices and t is the
 *   normalized [0..1] offset between them.
 *
 * If timeMs ≤ first frame: lo = hi = 0, t = 0.
 * If timeMs ≥ last frame: lo = hi = last, t = 0.
 */
export function frameAt(tl, timeMs) {
    const frames = tl.info.frames;
    if (!frames.length)
        return { lo: 0, hi: 0, t: 0 };
    if (timeMs <= frames[0].timestamp)
        return { lo: 0, hi: 0, t: 0 };
    const last = frames.length - 1;
    if (timeMs >= frames[last].timestamp)
        return { lo: last, hi: last, t: 0 };
    // Binary search.
    let lo = 0, hi = last;
    while (lo + 1 < hi) {
        const mid = (lo + hi) >>> 1;
        if (frames[mid].timestamp <= timeMs)
            lo = mid;
        else
            hi = mid;
    }
    const span = frames[hi].timestamp - frames[lo].timestamp || 1;
    const t = (timeMs - frames[lo].timestamp) / span;
    return { lo, hi, t: Math.max(0, Math.min(1, t)) };
}
/**
 * Interpolated position for every participant at timeMs. Returns a
 * Map: participantId → {x, y}. Uses linear interpolation between the
 * surrounding frames. Players that haven't moved (or spectators on
 * respawn) just stay put.
 */
export function positionsAt(tl, timeMs) {
    const { lo, hi, t } = frameAt(tl, timeMs);
    const out = new Map();
    const fLo = tl.info.frames[lo];
    const fHi = tl.info.frames[hi];
    for (let pid = 1; pid <= 10; pid++) {
        const k = String(pid);
        const a = fLo?.participantFrames[k];
        const b = fHi?.participantFrames[k];
        const pa = a?.position;
        const pb = b?.position;
        if (!pa && !pb)
            continue;
        if (!pa) {
            out.set(pid, pb);
            continue;
        }
        if (!pb) {
            out.set(pid, pa);
            continue;
        }
        out.set(pid, {
            x: pa.x + (pb.x - pa.x) * t,
            y: pa.y + (pb.y - pa.y) * t,
        });
    }
    return out;
}
/**
 * Linearly interpolated participant frame metrics at timeMs.
 *
 * Why every numeric field gets lerped — and not just gold/cs:
 *   damageStats and championStats are also cumulative-ish numbers
 *   that grow monotonically over the minute. If we just took the
 *   "next" frame's value (which is what we used to do), the chart
 *   shows the END-of-minute damage at e.g. 0:33 — Pantheon appears
 *   to have done 400 dmg when in reality he hasn't even reached lane.
 *   By interpolating from "lo" toward "hi" with t = (now - lo)/(hi - lo),
 *   we instead show a smooth growing curve that won't lie about the
 *   present. It's a rough estimate (the damage could have all landed
 *   in the last 10s of the minute), but it's never wrong by an order
 *   of magnitude.
 *
 * Position is NOT lerped here — RiftMap already does that via
 * positionsAt(), which handles dead-state, etc.
 */
export function metricsAt(tl, pid, timeMs) {
    const { lo, hi, t } = frameAt(tl, timeMs);
    const a = tl.info.frames[lo]?.participantFrames[String(pid)];
    const b = tl.info.frames[hi]?.participantFrames[String(pid)];
    if (!a && !b)
        return null;
    const A = a ?? b;
    const B = b ?? a;
    const lerpNum = (x, y) => {
        const xv = x ?? 0;
        const yv = y ?? 0;
        return xv + (yv - xv) * t;
    };
    // Lerp every numeric key on the dictionary between A and B. The
    // generic is intentionally loose — DamageStats/ChampionStats have
    // strict shapes (no string index signature) and we don't want to
    // pollute their types with one.
    const lerpDict = (aDict, bDict) => {
        const av = aDict ?? {};
        const bv = bDict ?? {};
        const out = {};
        const keys = new Set([...Object.keys(av), ...Object.keys(bv)]);
        for (const k of keys) {
            out[k] = lerpNum(av[k], bv[k]);
        }
        return out;
    };
    return {
        level: Math.round(lerpNum(A.level, B.level)),
        xp: lerpNum(A.xp, B.xp),
        currentGold: lerpNum(A.currentGold, B.currentGold),
        totalGold: lerpNum(A.totalGold, B.totalGold),
        cs: lerpNum(A.minionsKilled, B.minionsKilled),
        jungleCs: lerpNum(A.jungleMinionsKilled, B.jungleMinionsKilled),
        damageStats: lerpDict(A.damageStats, B.damageStats),
        championStats: lerpDict(A.championStats, B.championStats),
        position: B.position ?? A.position ?? null,
    };
}
/**
 * All events up to and including timeMs, sorted by timestamp. Each
 * event is annotated with its source frame index for back-reference.
 */
export function eventsUpTo(tl, timeMs) {
    const out = [];
    for (let i = 0; i < tl.info.frames.length; i++) {
        const f = tl.info.frames[i];
        for (const e of f.events) {
            if (e.timestamp > timeMs)
                return out;
            out.push({ ...e, _frame: i });
        }
    }
    return out;
}
/**
 * All events the full match. Flattened with frame index, sorted by ts.
 */
export function allEvents(tl) {
    const out = [];
    for (let i = 0; i < tl.info.frames.length; i++) {
        for (const e of tl.info.frames[i].events)
            out.push({ ...e, _frame: i });
    }
    return out;
}
/**
 * Total game duration in ms based on the last frame timestamp.
 * GAME_END's realTimestamp is more precise but the last frame is
 * what the scrubber needs to bound against.
 */
export function durationMs(tl) {
    const f = tl.info.frames;
    return f.length ? f[f.length - 1].timestamp : 0;
}
/**
 * Reconstruct inventory at time T for a single participant. Walks
 * ITEM_PURCHASED / ITEM_DESTROYED / ITEM_SOLD / ITEM_UNDO events in
 * order. Returns { items: itemId[], trinketId? }.
 *
 * The "trinket" slot detection is heuristic: items 3340/3363/3364
 * are the trinket family. Anything else goes in the main 6-slot bag.
 *
 * Edge case: ITEM_UNDO with beforeId/afterId pair represents
 * "user clicked undo on a purchase" → strip beforeId, restore afterId.
 * If the user undoes a sell, it comes the opposite way around.
 */
const TRINKET_IDS = new Set([3340, 3363, 3364]);
export function inventoryAt(tl, pid, timeMs) {
    const counts = new Map();
    const bump = (id, d) => {
        if (!id)
            return;
        const c = (counts.get(id) ?? 0) + d;
        if (c <= 0)
            counts.delete(id);
        else
            counts.set(id, c);
    };
    for (const f of tl.info.frames) {
        for (const e of f.events) {
            if (e.timestamp > timeMs) {
                return finalize();
            }
            if (e.participantId !== pid)
                continue;
            if (e.type === "ITEM_PURCHASED")
                bump(e.itemId, +1);
            else if (e.type === "ITEM_DESTROYED" || e.type === "ITEM_SOLD")
                bump(e.itemId, -1);
            else if (e.type === "ITEM_UNDO") {
                if (e.beforeId)
                    bump(e.beforeId, -1);
                if (e.afterId)
                    bump(e.afterId, +1);
            }
        }
    }
    return finalize();
    function finalize() {
        const items = [];
        let trinketId = null;
        for (const [id, n] of counts) {
            for (let k = 0; k < n; k++) {
                if (TRINKET_IDS.has(id))
                    trinketId = id;
                else
                    items.push(id);
            }
        }
        return { items, trinketId };
    }
}
/**
 * Running K/D/A at time T for each participant.
 */
export function kdaAt(tl, timeMs) {
    const out = new Map();
    for (let i = 1; i <= 10; i++)
        out.set(i, { k: 0, d: 0, a: 0 });
    for (const f of tl.info.frames) {
        for (const e of f.events) {
            if (e.timestamp > timeMs)
                return out;
            if (e.type !== "CHAMPION_KILL")
                continue;
            const killer = e.killerId;
            const victim = e.victimId;
            if (killer && killer > 0)
                out.get(killer).k += 1;
            if (victim && victim > 0)
                out.get(victim).d += 1;
            for (const aid of e.assistingParticipantIds ?? []) {
                if (aid > 0)
                    out.get(aid).a += 1;
            }
        }
    }
    return out;
}
/**
 * Team gold totals at time T (totalGold = earned, not cash on hand).
 */
export function teamGoldAt(tl, timeMs) {
    let blue = 0, red = 0;
    for (let pid = 1; pid <= 10; pid++) {
        const m = metricsAt(tl, pid, timeMs);
        if (!m)
            continue;
        if (teamOf(pid) === 100)
            blue += m.totalGold;
        else
            red += m.totalGold;
    }
    return { blue, red, diff: blue - red };
}
/**
 * Precomputed gold-diff series over the entire match — one point per
 * frame, NOT interpolated. Used to feed the area chart under the
 * scrubber. (blue - red), positive = blue ahead.
 */
export function goldDiffSeries(tl) {
    const out = [];
    for (const f of tl.info.frames) {
        let blue = 0, red = 0;
        for (let pid = 1; pid <= 10; pid++) {
            const pf = f.participantFrames[String(pid)];
            if (!pf)
                continue;
            if (teamOf(pid) === 100)
                blue += pf.totalGold ?? 0;
            else
                red += pf.totalGold ?? 0;
        }
        out.push({ t: f.timestamp, blue, red, diff: blue - red });
    }
    return out;
}
/**
 * Total damage to champions per participant at time T, cumulative.
 * Driven by participantFrames.damageStats (already cumulative).
 */
export function damageRankedAt(tl, timeMs) {
    const out = [];
    for (let pid = 1; pid <= 10; pid++) {
        const m = metricsAt(tl, pid, timeMs);
        if (!m)
            continue;
        out.push({ pid, dmg: m.damageStats.totalDamageDoneToChampions ?? 0 });
    }
    return out.sort((a, b) => b.dmg - a.dmg);
}
/**
 * Active wards at time T. Tracks placed/killed/expired:
 *   - YELLOW_TRINKET / BLUE_TRINKET / SIGHT_WARD: 90s lifespan typically
 *   - CONTROL_WARD: indefinite until killed
 *   - TEEMO_MUSHROOM: indefinite until tripped/killed
 * Riot doesn't emit expiration events, so we approximate by 90_000 ms
 * lifespan for non-control / non-mushroom.
 */
const WARD_LIFESPAN_MS = {
    YELLOW_TRINKET: 90_000,
    BLUE_TRINKET: 120_000,
    SIGHT_WARD: 150_000,
    CONTROL_WARD: 0, // 0 = no expiration
    TEEMO_MUSHROOM: 0,
    UNDEFINED: 90_000,
};
export function activeWardsAt(tl, timeMs, positionAtPlacement) {
    const placed = new Map();
    let serial = 0;
    for (const f of tl.info.frames) {
        for (const e of f.events) {
            if (e.timestamp > timeMs)
                return Array.from(placed.values());
            if (e.type === "WARD_PLACED" && e.creatorId) {
                const pos = positionAtPlacement(e.creatorId, e.timestamp);
                if (!pos)
                    continue;
                const id = `${e.creatorId}::${e.wardType}::${++serial}`;
                placed.set(id, {
                    id,
                    creatorId: e.creatorId,
                    wardType: String(e.wardType ?? "UNDEFINED"),
                    placedAt: e.timestamp,
                    position: pos,
                });
            }
            else if (e.type === "WARD_KILL") {
                // Best-effort: kill the most-recent matching wardType
                for (const [k, w] of Array.from(placed).reverse()) {
                    if (w.wardType === e.wardType) {
                        placed.delete(k);
                        break;
                    }
                }
            }
        }
    }
    // Expire on lifespan
    for (const [k, w] of placed) {
        const ttl = WARD_LIFESPAN_MS[w.wardType] ?? 90_000;
        if (ttl > 0 && timeMs - w.placedAt > ttl)
            placed.delete(k);
    }
    return Array.from(placed.values());
}
export function objectivesAt(tl, timeMs) {
    const blank = () => ({ dragons: [], barons: 0, heralds: 0, voidgrubs: 0, atakhans: 0, towers: 0, inhibitors: 0 });
    const blue = blank(), red = blank();
    for (const f of tl.info.frames) {
        for (const e of f.events) {
            if (e.timestamp > timeMs)
                return { blue, red };
            if (e.type === "ELITE_MONSTER_KILL") {
                const t = e.killerTeamId === 100 ? blue : e.killerTeamId === 200 ? red : null;
                if (!t)
                    continue;
                if (e.monsterType === "DRAGON")
                    t.dragons.push(String(e.monsterSubType ?? "DRAGON"));
                else if (e.monsterType === "BARON_NASHOR")
                    t.barons++;
                else if (e.monsterType === "RIFTHERALD")
                    t.heralds++;
                else if (e.monsterType === "HORDE")
                    t.voidgrubs++;
                else if (e.monsterType === "ATAKHAN")
                    t.atakhans++;
            }
            else if (e.type === "BUILDING_KILL") {
                // teamId on BUILDING_KILL is the team that LOST. The other team scores.
                const t = e.teamId === 100 ? red : e.teamId === 200 ? blue : null;
                if (!t)
                    continue;
                if (e.buildingType === "TOWER_BUILDING")
                    t.towers++;
                else if (e.buildingType === "INHIBITOR_BUILDING")
                    t.inhibitors++;
            }
        }
    }
    return { blue, red };
}
/**
 * Helper to look up the participantId for a puuid (or null).
 */
export function pidForPuuid(tl, puuid) {
    const idx = tl.metadata.participants.indexOf(puuid);
    return idx >= 0 ? idx + 1 : null;
}
/**
 * Riot map coordinates → SVG/CSS-friendly (0..1) coordinates.
 * Y is flipped because Riot has y=0 at the bottom.
 */
export function toMapNorm(p) {
    const nx = Math.max(0, Math.min(1, p.x / MAP_SIZE_RIOT));
    const ny = Math.max(0, Math.min(1, 1 - p.y / MAP_SIZE_RIOT));
    return { nx, ny };
}
/**
 * Resolve a participantId → StaticParticipant from a match-v5 blob.
 * The static blob lists participants 0..9 but each row has its own
 * participantId field (1..10). Fall back to index+1 if missing.
 */
export function staticParticipantByPid(m, pid) {
    if (!m)
        return null;
    for (let i = 0; i < m.info.participants.length; i++) {
        const sp = m.info.participants[i];
        const rowPid = sp.participantId ?? (i + 1);
        if (rowPid === pid)
            return sp;
    }
    return null;
}
/**
 * Format ms → "mm:ss" or "h:mm:ss" if > 60 min.
 */
export function fmtClock(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = (n) => n.toString().padStart(2, "0");
    if (h > 0)
        return `${h}:${pad(m)}:${pad(ss)}`;
    return `${pad(m)}:${pad(ss)}`;
}
/**
 * Big-number formatter — 12345 → "12.3k".
 */
export function fmtShortNum(n) {
    const abs = Math.abs(n);
    if (abs >= 1_000_000)
        return (n / 1_000_000).toFixed(1) + "M";
    if (abs >= 1_000)
        return (n / 1_000).toFixed(1) + "k";
    return Math.round(n).toString();
}
