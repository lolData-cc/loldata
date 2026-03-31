import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config";

export type OtpPlayer = {
  rank: number;
  puuid: string;
  name: string;
  tag: string;
  tier: string;
  lp: number;
  profileIconId: number;
  champGames: number;
  champWins: number;
  champWinrate: number;
  totalGames: number;
  champPlayrate: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
  avgCsPerMin: number;
  keystone: number | null;
  secondaryStyle: number | null;
  firstItem: number | null;
  region: string;
};

export type OtpRankingData = {
  champion: string;
  region: string;
  players: OtpPlayer[];
  totalOtps: number;
};

const cache = new Map<string, { data: OtpRankingData; ts: number }>();
const CACHE_TTL = 60_000; // 60s

export function useChampionOtpRanking(championName: string, region: string) {
  const [data, setData] = useState<OtpRankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!championName) return;

    const key = `${championName}:${region}`;
    const cached = cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/champion/otp-ranking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ championName, region }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        cache.set(key, { data: json, ts: Date.now() });
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [championName, region]);

  return { data, loading, error };
}
