// Admin dashboard — the SCRAPED pros directory (box `pros` table, lolpros
// import). Read-only: these rows are refreshed by the box scraper, not managed
// here — each row links to its public /players/<slug> page. The hand-curated
// Cloud pro_players keep their own (editable) table above this one.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BOX_API_BASE_URL } from "@/config";
import { LoadingDots } from "@/components/ui/loading-dots";
import { TeamLogo } from "@/components/teamlogo";

type BoxPro = {
  slug: string;
  name: string;
  country: string | null;
  position: string | null;
  team_name: string | null;
  team_tag: string | null;
  team_logo: string | null;
  twitter: string | null;
  twitch: string | null;
  lolpros_score: number | null;
  accounts: number;
};

type DirectoryPayload = {
  total: number;
  page: number;
  limit: number;
  pros: BoxPro[];
};

const PAGE_SIZE = 50;

// mirror the panel's table styling consts (kept local: this file is standalone)
const thCls = "px-3 py-2 text-[10px] font-mono tracking-[0.15em] uppercase text-flash/50";
const tdCls = "px-3 py-2 text-[11px] font-mono text-flash/70";
const btnFlash = "px-2 py-1 rounded-sm cursor-clicker border border-flash/20 text-flash/70 hover:bg-flash/10 text-[11px] tracking-[0.1em] uppercase disabled:opacity-50 disabled:pointer-events-none";
const inputCls = "w-full rounded-sm border border-flash/15 bg-filmdark/40 px-3 py-1.5 text-[11px] text-flash font-mono outline-none focus:border-jade/30 transition-colors";

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-md bg-filmlight/[0.04] backdrop-blur-lg saturate-150 shadow-[0_10px_30px_rgba(var(--c-shadow),0.45),inset_0_0_0_1px_rgba(255,255,255,0.14),inset_0_1px_0_rgba(255,255,255,0.10)]">
      <div className="relative z-[1] px-4 py-4">{children}</div>
    </div>
  );
}

export function BoxProsDirectory() {
  const [data, setData] = useState<DirectoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounced server-side search — resets to page 1 on new query
  const onQueryChange = (v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPage(1), 300);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (query.trim()) params.set("query", query.trim());
        const res = await fetch(`${BOX_API_BASE_URL}/api/pros?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as DirectoryPayload;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // debounce the query-triggered reload (page changes fire immediately)
    const t = setTimeout(load, query ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <>
      <p className="text-[11px] font-mono tracking-[0.25em] uppercase text-jade/50 mt-8">
        :: LOLPROS DIRECTORY <span className="text-flash/30">· BOX · READ-ONLY</span> ::
      </p>
      <GlassCard>
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-xs font-mono text-flash/60">
            Total: <span className="text-jade">{data?.total ?? "…"}</span>
            <span className="ml-2 inline-flex items-center px-1.5 py-[1px] rounded-sm border border-jade/25 bg-jade/5 text-[9px] font-bold tracking-[0.2em] text-jade/80 uppercase">
              lolpros
            </span>
          </p>
          <input
            type="text"
            placeholder="Search name, slug, or team..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className={`${inputCls} max-w-[260px]`}
          />
        </div>
        <div className="h-[1px] bg-gradient-to-r from-jade/15 via-flash/8 to-transparent mb-3" />

        {error ? (
          <p className="text-[11px] font-mono text-red-300/80">{error}</p>
        ) : loading && !data ? (
          <div className="text-xs text-flash/60 inline-flex items-center gap-2"><LoadingDots /> Loading...</div>
        ) : !data || data.pros.length === 0 ? (
          <p className="text-[11px] font-mono text-flash/40">
            {query ? "No results match your search." : "No scraped pros yet — the box import is still running."}
          </p>
        ) : (
          <>
            <div className="w-full overflow-auto rounded-sm border border-flash/10 bg-neutral-950/40 max-h-[400px]">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-neutral-950/70 backdrop-blur border-b border-flash/10">
                  <tr>
                    <th className={thCls}>Player</th>
                    <th className={thCls}>Role</th>
                    <th className={thCls}>Team</th>
                    <th className={thCls}>Country</th>
                    <th className={`${thCls} text-right`}>Accounts</th>
                    <th className={`${thCls} text-right`}>Score</th>
                    <th className={`${thCls} text-right`}>Links</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pros.map((p) => (
                    <tr key={p.slug} className="border-b border-flash/5 hover:bg-filmlight/[0.03] transition-colors">
                      <td className={`${tdCls} text-flash`}>
                        <Link to={`/players/${p.slug}`} className="text-jade/90 hover:text-jade hover:underline underline-offset-2 cursor-clicker">
                          {p.name}
                        </Link>
                      </td>
                      <td className={`${tdCls} uppercase`}>{p.position ?? "—"}</td>
                      <td className={tdCls}>
                        {p.team_name ? (
                          <div className="flex items-center gap-1.5">
                            {p.team_logo && <TeamLogo src={p.team_logo} className="w-4 h-4 rounded-sm object-contain" />}
                            <span>{p.team_tag ?? p.team_name}</span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className={tdCls}>{p.country ?? "—"}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{p.accounts}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{p.lolpros_score ?? "—"}</td>
                      <td className={tdCls}>
                        <div className="flex justify-end gap-2">
                          {p.twitter && <a href={p.twitter} target="_blank" rel="noreferrer" className="text-flash/40 hover:text-jade cursor-clicker">TW</a>}
                          {p.twitch && <a href={p.twitch} target="_blank" rel="noreferrer" className="text-flash/40 hover:text-jade cursor-clicker">TTV</a>}
                          <Link to={`/players/${p.slug}`} className="text-jade/70 hover:text-jade cursor-clicker">VIEW →</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* pagination */}
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className={btnFlash}>
                ‹ Prev
              </button>
              <span className="text-[10px] font-mono text-flash/40 tabular-nums">
                page {data.page} / {totalPages}
                {loading && <span className="ml-2 text-jade/60">updating…</span>}
              </span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} className={btnFlash}>
                Next ›
              </button>
            </div>
          </>
        )}
      </GlassCard>
    </>
  );
}
