import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE_URL, CDN_BASE_URL } from "@/config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type ItemStats = {
    games: number;
    wins: number;
    winrate_pct: number;
    total_games: number;
    build_rate_pct: number;
} | null;

type BestUtilizer = {
    champion_id: number;
    games: number;
    wins: number;
    winrate_pct: number;
};

async function fetchJsonWithRetry(
    url: string,
    options: RequestInit & { timeoutMs?: number } = {},
    retryCfg = { retries: 2, backoffMs: 600 }
) {
    const { timeoutMs = 8000, ...rest } = options;
    let attempt = 0;
    // backoff esponenziale: 0.6s, 1.2s, 2.4s...
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (true) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(url, { ...rest, signal: controller.signal });
            if (!res.ok) {
                // 502/503/504 li consideriamo retryable
                if ([502, 503, 504].includes(res.status) && attempt < retryCfg.retries) {
                    attempt++;
                    await sleep(retryCfg.backoffMs * Math.pow(2, attempt - 1));
                    continue;
                }
                // altri status -> errore "definitivo"
                const text = await res.text().catch(() => "");
                throw new Error(`HTTP ${res.status} ${text}`.trim());
            }
            return await res.json();
        } catch (err: any) {
            // timeout/abort o network error: ritenta se possibile
            const isAbort = err?.name === "AbortError";
            if ((isAbort || err?.message?.includes("NetworkError")) && attempt < retryCfg.retries) {
                attempt++;
                await sleep(retryCfg.backoffMs * Math.pow(2, attempt - 1));
                continue;
            }
            throw err;
        } finally {
            clearTimeout(id);
        }
    }
}

export default function ItemPage() {
    const { itemId } = useParams<{ itemId: string }>();

    // === Item data (CDN)
    const [itemData, setItemData] = useState<any>(null);

    // === Filtri
    const [rank, setRank] = useState<string>("");
    const [role, setRole] = useState<string>("");
    const [championIds, setChampionIds] = useState<number[]>([]);
    const [championCsv, setChampionCsv] = useState<string>("");

    // === Stats
    const [stats, setStats] = useState<ItemStats>(null);
    const [loadingStats, setLoadingStats] = useState<boolean>(false);
    const [statsError, setStatsError] = useState<string | null>(null);

    // === Best Utilizers
    const [bestRows, setBestRows] = useState<BestUtilizer[]>([]);
    const [loadingBest, setLoadingBest] = useState(false);

    // === Champion mapping (id -> DDragon championName)
    const [idToName, setIdToName] = useState<Record<number, string>>({});
    const champPath = `${CDN_BASE_URL}/img/champion`;

    // animations
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (!loadingStats && stats) {
            // priming: parte come “linea verticale”
            setAnimateIn(true);
        }
    }, [loadingStats, stats]);

    // Double RAF: dal frame di “linea” al frame di piena larghezza
    useEffect(() => {
        if (animateIn) {
            let id1 = 0;
            let id2 = 0;
            id1 = requestAnimationFrame(() => {
                id2 = requestAnimationFrame(() => setAnimateIn(false));
            });
            return () => {
                cancelAnimationFrame(id1);
                cancelAnimationFrame(id2);
            };
        }
    }, [animateIn]);

    // Reset “linea” quando rilanciamo una fetch (es. cambio filtri)
    useEffect(() => {
        if (loadingStats) {
            setAnimateIn(true);
        }
    }, [loadingStats]);

    // Parse CSV -> number[]
    useEffect(() => {
        const parsed = championCsv
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map(Number)
            .filter((n) => Number.isFinite(n));
        setChampionIds(parsed);
    }, [championCsv]);

    // Fetch item JSON dal CDN
    useEffect(() => {
        if (!itemId) return;
        fetch(`${CDN_BASE_URL}/data/en_US/item.json`)
            .then((res) => res.json())
            .then((data) => setItemData(data.data[itemId || ""]))
            .catch(() => setItemData(null));
    }, [itemId, CDN_BASE_URL]);

    // Fetch champion mapping (una volta)
    useEffect(() => {
        fetch(`${CDN_BASE_URL}/data/en_US/champion.json`)
            .then((r) => r.json())
            .then((json) => {
                const map: Record<number, string> = {};
                // json.data = { Aatrox: { key: "266", ... }, Ahri: { key: "103" }, ... }
                Object.entries<any>(json.data).forEach(([name, champ]) => {
                    const keyNum = Number(champ.key);
                    if (Number.isFinite(keyNum)) map[keyNum] = name;
                });
                setIdToName(map);
            })
            .catch(() => setIdToName({}));
    }, [CDN_BASE_URL]);

    // Fetch stats dall’API Bun
    // === Stats ===
    useEffect(() => {
        if (!itemId) return;
        let active = true;
        setLoadingStats(true);
        setStatsError(null);

        fetchJsonWithRetry(`${API_BASE_URL}/api/itemstats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemId: Number(itemId),
                tier: rank || null,
                role: role || null,
                championIds: championIds.length ? championIds : null,
                queues: [420, 440],
            }),
            timeoutMs: 12000, // ⬅️ allarga la finestra (12s)
        }, { retries: 2, backoffMs: 700 })     // ⬅️ 2 retry con backoff
            .then((json) => {
                if (!active) return;
                setStats(json?.stats ?? null);
            })
            .catch((e) => {
                if (!active) return;
                setStats(null);
                // messaggio più utile in debug, ma sobrio in prod
                setStatsError("Impossibile caricare le statistiche. Riprova tra poco.");
                // opzionale: console.warn(e);
            })
            .finally(() => {
                if (!active) return;
                setLoadingStats(false);
            });

        return () => { active = false; };
    }, [itemId, rank, role, championIds, API_BASE_URL]);

    // === Best Utilizers ===
    useEffect(() => {
        if (!itemId) return;
        let active = true;
        setLoadingBest(true);

        fetchJsonWithRetry(`${API_BASE_URL}/api/itembestutilizers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                itemId: Number(itemId),
                tier: rank || null,
                role: role || null,
                queues: [420, 440],
                minGames: 5,
            }),
            timeoutMs: 12000,
        }, { retries: 2, backoffMs: 700 })
            .then((json) => {
                if (!active) return;
                setBestRows(Array.isArray(json?.rows) ? json.rows : []);
            })
            .catch(() => {
                if (!active) return;
                setBestRows([]);
                // qui non mostro errore visivo: la sezione già mostra "Nessun dato"
            })
            .finally(() => {
                if (!active) return;
                setLoadingBest(false);
            });

        return () => { active = false; };
    }, [itemId, rank, role, API_BASE_URL]);


    // Helper formattazione numeri
    const formatNum = (n: number | undefined) =>
        typeof n === "number" ? n.toLocaleString() : "-";

    if (!itemData) return <div>Loading...</div>;

    // 📌 Variabili estratte
    const name = itemData.name;
    const description = itemData.description; // HTML
    const lore = itemData.plaintext; // breve testo
    const costTotal = itemData.gold.total;
    const costBase = itemData.gold.base;
    const costSell = itemData.gold.sell;
    const buildFrom = itemData.from || [];
    const buildInto = itemData.into || [];

    // Progress bar width
    const buildRateWidth = `${Math.min(
        Math.max(stats?.build_rate_pct ?? 0, 0),
        100
    )}%`;

    return (
        <Tabs defaultValue="description">
            <div className="flex gap-2">
                {/* SIDEBAR */}
                <div className="w-[22%] h-[500px] bg-cement rounded-sm border border-flash/20">
                    <div className="flex flex-col justify-start p-3">
                        <div className="flex p-1 gap-2">
                            <img
                                src={`${CDN_BASE_URL}/img/item/${itemId}.png`}
                                alt={name}
                                className="w-20 h-20 rounded-sm border border-flash/20"
                            />
                            <div className="flex flex-col">
                                <span className="uppercase pt-2 text-flash/70">{name}</span>
                                <span className="text-xs text-flash/50">
                                    Cost: {formatNum(costTotal)} (Base {formatNum(costBase)}) • Sell: {formatNum(costSell)}
                                </span>
                            </div>
                        </div>

                        {(buildFrom.length > 0 || buildInto.length > 0) && (
                            <div className="mt-4 text-xs text-flash/60">
                                {buildFrom.length > 0 && (
                                    <div className="mb-2">
                                        <div className="uppercase text-flash/40 mb-1">Builds From</div>
                                        <div className="flex flex-wrap gap-2">
                                            {buildFrom.map((id: string) => (
                                                <img
                                                    key={id}
                                                    src={`${CDN_BASE_URL}/img/item/${id}.png`}
                                                    alt={`from ${id}`}
                                                    className="w-8 h-8 rounded-sm border border-flash/20"
                                                    title={id}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {buildInto.length > 0 && (
                                    <div>
                                        <div className="uppercase text-flash/40 mb-1">Builds Into</div>
                                        <div className="flex flex-wrap gap-2">
                                            {buildInto.map((id: string) => (
                                                <img
                                                    key={id}
                                                    src={`${CDN_BASE_URL}/img/item/${id}.png`}
                                                    alt={`into ${id}`}
                                                    className="w-8 h-8 rounded-sm border border-flash/20"
                                                    title={id}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <TabsList className="flex flex-col mt-6 gap-3">
                            <TabsTrigger value="description">GENERAL</TabsTrigger>
                            <TabsTrigger value="statistics">STATISTICS</TabsTrigger>
                        </TabsList>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="w-[75%]">
                    {/* DESCRIPTION */}
                    <TabsContent value="description">
                        <div className="flex flex-col gap-12 p-4">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-xl font-bold font-jetbrains uppercase text-flash/40">
                                    DESCRIPTION
                                </h1>
                                <div className="font-geist" dangerouslySetInnerHTML={{ __html: description }} />
                            </div>
                            {lore && (<div className="flex flex-col gap-2">
                                <h1 className="text-xl font-bold font-jetbrains uppercase text-flash/40 ">
                                    USE
                                </h1>
                                <span className="font-geist">{lore}</span>
                            </div>)}

                        </div>
                    </TabsContent>

                    {/* STATISTICS */}
                    <TabsContent value="statistics">
                        <div className="flex flex-col gap-4 p-4">
                            {/* FILTRI */}
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-flash/70">Rank</label>
                                    <select
                                        value={rank}
                                        onChange={(e) => setRank(e.target.value)}
                                        className="bg-cement border border-flash/20 rounded-sm px-2 py-1"
                                    >
                                        <option value="">All</option>
                                        <option value="CHALLENGER">Challenger</option>
                                        <option value="GRANDMASTER">Grandmaster</option>
                                        <option value="MASTER">Master</option>
                                        <option value="DIAMOND">Diamond</option>
                                        <option value="EMERALD">Emerald</option>
                                        <option value="PLATINUM">Platinum</option>
                                        <option value="GOLD">Gold</option>
                                        <option value="SILVER">Silver</option>
                                        <option value="BRONZE">Bronze</option>
                                        <option value="IRON">Iron</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-flash/70">Role</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="bg-cement border border-flash/20 rounded-sm px-2 py-1"
                                    >
                                        <option value="">All</option>
                                        <option value="TOP">Top</option>
                                        <option value="JUNGLE">Jungle</option>
                                        <option value="MIDDLE">Mid</option>
                                        <option value="BOTTOM">ADC</option>
                                        <option value="SUPPORT">Support</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs text-flash/70">Champion IDs (CSV)</label>
                                    <input
                                        value={championCsv}
                                        onChange={(e) => setChampionCsv(e.target.value)}
                                        placeholder="es. 64, 76"
                                        className="bg-cement border border-flash/20 rounded-sm px-2 py-1 w-[220px]"
                                    />
                                </div>
                            </div>

                            {/* STATS */}
                            {loadingStats ? (
                                <div className="text-flash/60">Loading stats…</div>
                            ) : statsError ? (
                                <div className="text-red-400">{statsError}</div>
                            ) : !stats ? (
                                <div className="text-flash/60">Nessun dato disponibile.</div>
                            ) : (
                                /* === WRAPPER ANIMATO: apertura orizzontale === */
                                <div className="relative">
                                    {/* linea centrale che svanisce durante l’apertura */}
                                    <div
                                        aria-hidden="true"
                                        className={cn(
                                            "pointer-events-none absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] opacity-0 transition-opacity duration-400",
                                            animateIn && "opacity-100"
                                        )}
                                        style={{
                                            background:
                                                "linear-gradient(180deg, transparent 0%, rgba(0,255,234,0.9) 35%, rgba(255,0,230,0.9) 65%, transparent 100%)",
                                            boxShadow:
                                                "0 0 8px rgba(0,255,234,0.7), 0 0 12px rgba(255,0,230,0.6), inset 0 0 4px rgba(0,255,234,0.5)",
                                        }}
                                    />

                                    {/* contenitore che apre in X */}
                                    <div
                                        className={cn(
                                            "relative origin-center will-change-transform transition-transform duration-400 ease-out",
                                            animateIn ? "scale-x-[0.03]" : "scale-x-100"
                                        )}
                                        style={{ transformOrigin: "50% 50%" }}
                                    >

                                        {/* --- il TUO contenuto stats rimane identico da qui in giù --- */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Games */}
                                            <div className="bg-cement rounded-sm border border-flash/20 p-3">
                                                <div className="text-xs text-flash/60 uppercase">Games (con item)</div>
                                                <div className="text-2xl font-bold">{formatNum(stats.games)}</div>
                                            </div>

                                            {/* Wins */}
                                            <div className="bg-cement rounded-sm border border-flash/20 p-3">
                                                <div className="text-xs text-flash/60 uppercase">Wins</div>
                                                <div className="text-2xl font-bold">{formatNum(stats.wins)}</div>
                                            </div>

                                            {/* Winrate + Build rate */}
                                            <div className="bg-cement rounded-sm border border-flash/20 p-3">
                                                <div className="flex items-baseline justify-between">
                                                    <div>
                                                        <div className="text-xs text-flash/60 uppercase">Winrate</div>
                                                        <div className="text-2xl font-bold">{stats.winrate_pct ?? 0}%</div>
                                                    </div>
                                                    <div className="text-xs text-flash/60">
                                                        Su {formatNum(stats.total_games)} partite totali (filtro attuale)
                                                    </div>
                                                </div>

                                                <div className="mt-3">
                                                    <div className="text-xs text-flash/60 uppercase">Build rate</div>
                                                    <div className="h-2 bg-black/20 rounded">
                                                        <div
                                                            className="h-2 bg-flash/70 rounded"
                                                            style={{ width: buildRateWidth }}
                                                            title={`${stats.build_rate_pct ?? 0}%`}
                                                        />
                                                    </div>
                                                    <div className="text-sm mt-1">
                                                        {stats.build_rate_pct ?? 0}% hanno buildato l’oggetto
                                                    </div>
                                                </div>
                                            </div>

                                            {/* BEST UTILIZERS */}
                                            <div className="bg-cement rounded-sm border border-flash/20 p-3">
                                                <div className="text-xs text-flash/60 uppercase mb-2">Best Utilizers</div>
                                                {loadingBest ? (
                                                    <div className="text-flash/60">Loading…</div>
                                                ) : bestRows.length === 0 ? (
                                                    <div className="text-flash/60">Nessun dato</div>
                                                ) : (
                                                    <ul className="flex flex-col gap-2">
                                                        {bestRows.map((r) => {
                                                            const championName = idToName[r.champion_id] || String(r.champion_id);
                                                            return (
                                                                <li key={r.champion_id} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <img
                                                                            src={`${champPath}/${championName}.png`}
                                                                            alt={championName}
                                                                            className="w-12 h-12 rounded-md border border-flash/20"
                                                                        />
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium">{championName}</span>
                                                                            <span className="text-xs text-flash/60">
                                                                                {formatNum(r.games)} games
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="text-sm font-bold">{r.winrate_pct}%</div>
                                                                        <div className="text-xs text-flash/60">{formatNum(r.wins)} wins</div>
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                        {/* --- fine del tuo contenuto --- */}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                </div>
            </div>
        </Tabs>
    );
}
