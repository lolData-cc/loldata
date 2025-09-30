// src/pages/leaderboardpage.tsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

type Entry = {
  rank: number;
  summonerId: string | null;
  summonerName: string | null;
  nametag: string | null;
  profileIconId: number | null;
  puuid: string | null;
  leaguePoints: number;
  wins: number;
  losses: number;
  winrate: number;
  tier: "CHALLENGER" | "GRANDMASTER" | "MASTER";
};

const REGIONS = ["EUW", "NA", "KR"] as const;
const QUEUES = [
  { key: "RANKED_SOLO_5x5", label: "Ranked Solo/Duo" },
  { key: "RANKED_FLEX_SR", label: "Ranked Flex" },
] as const;

const QUEUE_LABEL: Record<string, string> = {
  RANKED_SOLO_5x5: "Ranked Solo/Duo",
  RANKED_FLEX_SR: "Ranked Flex",
};

const PAGE_SIZE = 10;

export default function LeaderboardPage() {
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("EUW");
  const [queue, setQueue] = useState<(typeof QUEUES)[number]["key"]>("RANKED_SOLO_5x5");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function load(p = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          queue,
          page: p,
          pageSize: PAGE_SIZE,
          enrich: true, // arricchisci solo la pagina corrente
        }),
      });
      if (res.status === 429) {
        setError("Rate limit Riot (riprova fra poco)");
        setRows([]);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError("Errore nel caricamento leaderboard");
        setRows([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setRows(data.entries || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || p);
    } catch {
      setError("Errore di rete");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, [region, queue]);

  // Titolo dinamico
  useEffect(() => {
    const defaultTitle = "lolData";
    document.title = `${region} Leaderboard - lolData`;
    return () => { document.title = defaultTitle; };
  }, [region]);

  return (
    <div className="min-h-[70vh]">
      {/* HERO */}
      <div className="relative h-[250px] w-full overflow-hidden rounded-xl -mt-6 mb-4">
        <img
          src="/img/Leaderboards.jpg"
          alt="Leaderboards"
          className="h-full w-full object-cover filter grayscale brightness-110 contrast-105 select-none"
          loading="eager"
          decoding="async"
          draggable={false}
          style={{ objectPosition: "center 5%" }} // alza/abbassa la porzione visibile
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-5">
          <h1 className="text-3xl md:text-4xl text-jade tracking-wide select-none">
            LEADERBOARDS
          </h1>

          {/* Queue • Region con dropdown */}
          <div className="mt-1 flex items-center gap-2 text-white/85 select-none">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-sm bg-white/10 px-2 py-0.5 text-sm hover:bg-white/15 transition">
                {QUEUE_LABEL[queue]}
                <ChevronDown className="h-4 w-4 opacity-80" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 text-sm">
                {QUEUES.map(q => (
                  <DropdownMenuItem
                    key={q.key}
                    onClick={() => setQueue(q.key as typeof queue)}
                    className={cn(
                      "cursor-clicker",
                      queue === q.key ? "text-jade font-medium" : "text-flash/80"
                    )}
                  >
                    {q.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="opacity-60">•</span>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-sm bg-white/10 px-2 py-0.5 text-sm hover:bg-white/15 transition">
                {region}
                <ChevronDown className="h-4 w-4 opacity-80" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-28 text-sm">
                {REGIONS.map(r => (
                  <DropdownMenuItem
                    key={r}
                    onClick={() => setRegion(r)}
                    className={cn(
                      "cursor-clicker",
                      region === r ? "text-jade font-medium" : "text-flash/80"
                    )}
                  >
                    {r}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* LISTA CARDS */}
      <div className="mt-3 space-y-2">
        {error && (
          <div className="bg-cement border border-[#2B2A2B] rounded-md p-3 text-[#ff6b6b] text-sm">
            {error}
          </div>
        )}

        {loading ? (
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="bg-cement border border-[#2B2A2B] rounded-md p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#0f0f0f] border border-[#2B2A2B]" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
                <Skeleton className="w-12 h-4" />
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-10 h-4" />
                <Skeleton className="w-20 h-6" />
              </div>
            </div>
          ))
        ) : (
          rows.map((r) => (
            <PlayerCard key={`${r.puuid ?? r.summonerId ?? "rank"}-${r.rank}`} entry={r} />
          ))
        )}
      </div>

      {/* PAGINATION */}
      <div className="mt-4 flex justify-center">
        <nav className="flex items-center gap-1">
          <button
            className="px-2 py-1 text-xs rounded border border-[#2B2A2B] bg-cement hover:bg-flash/5 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }).slice(
            Math.max(0, page - 4),
            Math.min(totalPages, page + 3)
          ).map((_, idx) => {
            const p = Math.max(1, page - 3) + idx;
            return (
              <button
                key={p}
                className={cn(
                  "w-8 h-8 text-xs rounded border border-[#2B2A2B]",
                  p === page ? "bg-jade/20 text-jade border-jade/30" : "bg-cement hover:bg-flash/5"
                )}
                onClick={() => load(p)}
              >
                {p}
              </button>
            );
          })}

          <button
            className="px-2 py-1 text-xs rounded border border-[#2B2A2B] bg-cement hover:bg-flash/5 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  );
}

/* -------- Player Card component -------- */

function PlayerCard({ entry: r }: { entry: Entry }) {
  const tierColor =
    r.tier === "CHALLENGER"
      ? "bg-gradient-to-r from-yellow-300/20 to-orange-400/20 border-yellow-300/30 text-yellow-200"
      : r.tier === "GRANDMASTER"
      ? "bg-gradient-to-r from-rose-400/20 to-red-500/20 border-rose-400/30 text-rose-200"
      : "bg-gradient-to-r from-indigo-400/20 to-blue-500/20 border-indigo-400/30 text-indigo-200";

  return (
    <div className="relative bg-cement border border-[#2B2A2B] rounded-md p-3 hover:bg-flash/5 transition">
      {/* rank badge */}
      <div className="absolute -top-2 -left-2 px-2 py-0.5 rounded-sm bg-black/60 border border-flash/10 text-xs text-flash/80">
        #{r.rank}
      </div>

      <div className="flex items-center gap-3">
        {/* icon */}
        <div className="w-10 h-10 rounded-md overflow-hidden bg-[#0f0f0f] border border-[#2B2A2B] shrink-0">
          {typeof r.profileIconId === "number" && (
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/15.13.1/img/profileicon/${r.profileIconId}.png`}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              draggable={false}
            />
          )}
        </div>

        {/* name */}
        <div className="flex-1 min-w-0">
          <div className="truncate text-[15px] text-white">
            {r.nametag ?? r.summonerName ?? "Unknown"}
          </div>
          <div className="text-[11px] text-flash/60">
            {r.puuid ? "PUUID linked" : "PUUID unknown"}
          </div>
        </div>

        {/* stats (desktop) */}
        <div className="hidden sm:flex items-center gap-6 mr-2">
          <div className="text-right">
            <div className="text-xs text-flash/60">LP</div>
            <div className="text-sm">{r.leaguePoints}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-flash/60">W-L</div>
            <div className="text-sm">
              <span className="text-jade">{r.wins}</span>
              <span className="text-flash/40">-</span>
              <span className="text-[#b11315]">{r.losses}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-flash/60">WR</div>
            <div
              className={cn(
                "text-sm",
                r.winrate >= 55
                  ? "text-jade"
                  : r.winrate <= 45
                  ? "text-[#b11315]"
                  : "text-flash/80"
              )}
            >
              {r.winrate}%
            </div>
          </div>
        </div>

        {/* tier pill */}
        <div
          className={cn("px-2 py-1 rounded-sm text-[12px] border", tierColor)}
          title={r.tier}
        >
          {r.tier}
        </div>
      </div>

      {/* stats (mobile) */}
      <div className="sm:hidden mt-3 flex items-center justify-between text-xs">
        <div>
          LP: <span className="text-flash">{r.leaguePoints}</span>
        </div>
        <div>
          W-L:{" "}
          <span className="text-jade">{r.wins}</span>
          <span className="text-flash/40">-</span>
          <span className="text-[#b11315]">{r.losses}</span>
        </div>
        <div>
          WR:{" "}
          <span
            className={cn(
              r.winrate >= 55
                ? "text-jade"
                : r.winrate <= 45
                ? "text-[#b11315]"
                : "text-flash/80"
            )}
          >
            {r.winrate}%
          </span>
        </div>
      </div>
    </div>
  );
}
